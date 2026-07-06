const express = require('express');
const path = require('path');
const { charPool } = require('./db');
const { BRACKETS, raceListFor, factionOf, RACE_NAMES, CLASS_NAMES, namePoolFor } = require('./wow-data');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const LOGIN_DB_NAME = process.env.LOGIN_DB_NAME || 'acore_auth';
const BOT_ACCOUNT_PREFIX = process.env.BOT_ACCOUNT_PREFIX || 'rndbot';

async function getEligible(conn, faction, bracketType, botsOnly) {
  const races = raceListFor(faction);
  const placeholders = races.map(() => '?').join(',');
  const params = [...races, bracketType];

  let botJoin = '';
  let botFilter = '';
  if (botsOnly) {
    botJoin = `INNER JOIN ${LOGIN_DB_NAME}.account a ON a.id = c.account`;
    botFilter = `AND UPPER(a.username) LIKE UPPER(?)`;
    params.push(`${BOT_ACCOUNT_PREFIX}%`);
  }

  const [rows] = await conn.query(
    `SELECT c.guid, c.name, c.race, c.class, c.level
     FROM characters c
     ${botJoin}
     WHERE c.level = 80
       AND c.race IN (${placeholders})
       ${botFilter}
       AND c.guid NOT IN (
         SELECT atm.guid FROM arena_team_member atm
         INNER JOIN arena_team \`at\` ON \`at\`.arenaTeamId = atm.arenaTeamId
         WHERE \`at\`.type = ?
       )
     ORDER BY c.guid`,
    params
  );
  return rows;
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i + size <= array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

async function nextArenaTeamId(conn) {
  const [rows] = await conn.query(
    `SELECT COALESCE(MAX(arenaTeamId), 0) + 1 AS nextId FROM arena_team`
  );
  return rows[0].nextId;
}

async function existingTeamNames(conn) {
  const [rows] = await conn.query(`SELECT name FROM arena_team`);
  return new Set(rows.map((r) => r.name));
}

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildNameQueue(faction) {
  const { prefixes, suffixes } = namePoolFor(faction);
  const combos = [];
  for (const p of prefixes) {
    for (const s of suffixes) {
      combos.push(`${p} ${s}`);
    }
  }
  return shuffled(combos);
}

function nextName(nameQueue, usedNames, faction, fallbackCounterRef) {
  while (nameQueue.length > 0) {
    const candidate = nameQueue.pop();
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
  }
  let name;
  do {
    name = `${faction} Team ${String(fallbackCounterRef.n).padStart(3, '0')}`;
    fallbackCounterRef.n += 1;
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

app.get('/api/eligible-summary', async (req, res) => {
  const botsOnly = req.query.botsOnly !== 'false';
  const conn = await charPool.getConnection();
  try {
    const summary = [];
    for (const bracket of BRACKETS) {
      for (const faction of ['Alliance', 'Horde']) {
        const rows = await getEligible(conn, faction, bracket.type, botsOnly);
        summary.push({
          bracket: bracket.label,
          faction,
          eligibleCount: rows.length,
          teamsPossible: Math.floor(rows.length / bracket.size),
        });
      }
    }
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.post('/api/generate', async (req, res) => {
  const botsOnly = req.body.botsOnly !== false;
  const spreadRatings = Boolean(req.body.spreadRatings);
  const conn = await charPool.getConnection();
  try {
    let teamIdCounter = await nextArenaTeamId(conn);
    const usedNames = await existingTeamNames(conn);
    const nameQueues = { Alliance: buildNameQueue('Alliance'), Horde: buildNameQueue('Horde') };
    const fallbackCounter = { n: 1 };

    const specs = [];
    for (const bracket of BRACKETS) {
      for (const faction of ['Alliance', 'Horde']) {
        const eligible = await getEligible(conn, faction, bracket.type, botsOnly);
        const groups = chunk(eligible, bracket.size);
        for (const group of groups) {
          specs.push({ bracket, faction, group });
        }
      }
    }

    let order = specs.map((_, i) => i);
    if (spreadRatings) {
      order = shuffled(order);
    }
    const ratingForSpecIndex = new Map();
    order.forEach((specIndex, position) => {
      const rating = spreadRatings
        ? Math.round((position / Math.max(order.length - 1, 1)) * 2000)
        : 0;
      ratingForSpecIndex.set(specIndex, rating);
    });

    const created = [];
    for (let i = 0; i < specs.length; i += 1) {
      const { bracket, faction, group } = specs[i];
      const rating = ratingForSpecIndex.get(i);
      const arenaTeamId = teamIdCounter;
      const captain = group[0];
      const name = nextName(nameQueues[faction], usedNames, faction, fallbackCounter);

      await conn.beginTransaction();
      try {
        await conn.query(
          `INSERT INTO arena_team
            (arenaTeamId, name, captainGuid, type, backgroundColor, emblemStyle,
             emblemColor, borderStyle, borderColor, rating, seasonGames, seasonWins,
             weekGames, weekWins, \`rank\`)
           VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, ?, 0, 0, 0, 0, 0)`,
          [arenaTeamId, name, captain.guid, bracket.type, rating]
        );

        for (const member of group) {
          await conn.query(
            `INSERT INTO arena_team_member
              (arenaTeamId, guid, weekGames, weekWins, seasonGames, seasonWins, personalRating)
             VALUES (?, ?, 0, 0, 0, 0, ?)`,
            [arenaTeamId, member.guid, rating]
          );
        }

        await conn.commit();
        created.push({
          arenaTeamId,
          name,
          faction,
          bracket: bracket.label,
          rating,
          captain: captain.name,
          members: group.map((m) => m.name),
        });
        teamIdCounter += 1;
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    }

    res.json({ createdCount: created.length, created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.get('/api/teams', async (req, res) => {
  try {
    const [rows] = await charPool.query(
      `SELECT at.arenaTeamId, at.name, at.type, at.rating, at.captainGuid,
              at.seasonGames, at.seasonWins,
              c.guid AS memberGuid, c.name AS memberName, c.race, c.class,
              atm.personalRating
       FROM arena_team at
       JOIN arena_team_member atm ON atm.arenaTeamId = at.arenaTeamId
       JOIN characters c ON c.guid = atm.guid
       ORDER BY at.type, at.arenaTeamId, atm.personalRating DESC`
    );

    const bracketLabel = { 2: '2v2', 3: '3v3', 5: '5v5' };
    const teams = new Map();
    for (const row of rows) {
      if (!teams.has(row.arenaTeamId)) {
        teams.set(row.arenaTeamId, {
          arenaTeamId: row.arenaTeamId,
          name: row.name,
          bracket: bracketLabel[row.type] || row.type,
          rating: row.rating,
          seasonGames: row.seasonGames,
          seasonWins: row.seasonWins,
          captainGuid: row.captainGuid,
          faction: factionOf(row.race),
          members: [],
        });
      }
      teams.get(row.arenaTeamId).members.push({
        guid: row.memberGuid,
        name: row.memberName,
        race: RACE_NAMES[row.race] || row.race,
        class: CLASS_NAMES[row.class] || row.class,
        personalRating: row.personalRating,
        isCaptain: row.memberGuid === row.captainGuid,
      });
    }

    res.json({ teams: Array.from(teams.values()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const bracketLabel = { 2: '2v2', 3: '3v3', 5: '5v5' };

    const [topPlayers] = await charPool.query(
      `SELECT c.name AS playerName, c.race, c.class, atm.personalRating,
              \`at\`.name AS teamName, \`at\`.type
       FROM arena_team_member atm
       JOIN characters c ON c.guid = atm.guid
       JOIN arena_team \`at\` ON \`at\`.arenaTeamId = atm.arenaTeamId
       ORDER BY atm.personalRating DESC
       LIMIT 5`
    );

    const [topTeams] = await charPool.query(
      `SELECT at.arenaTeamId, at.name, at.type, at.rating, at.seasonGames, at.seasonWins,
              c.race AS captainRace
       FROM arena_team at
       JOIN characters c ON c.guid = at.captainGuid
       ORDER BY at.rating DESC
       LIMIT 5`
    );

    res.json({
      topPlayers: topPlayers.map((r) => ({
        name: r.playerName,
        race: RACE_NAMES[r.race] || r.race,
        class: CLASS_NAMES[r.class] || r.class,
        faction: factionOf(r.race),
        personalRating: r.personalRating,
        teamName: r.teamName,
        bracket: bracketLabel[r.type] || r.type,
      })),
      topTeams: topTeams.map((t) => ({
        arenaTeamId: t.arenaTeamId,
        name: t.name,
        bracket: bracketLabel[t.type] || t.type,
        rating: t.rating,
        seasonGames: t.seasonGames,
        seasonWins: t.seasonWins,
        faction: factionOf(t.captainRace),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`AzerothCore Arena Populator running at http://localhost:${port}`);
});
