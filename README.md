# AzerothCore Arena Fixer

A small Node.js/Express tool for [AzerothCore](https://www.azerothcore.org/)
servers running [mod-playerbots](https://github.com/mod-playerbots/mod-playerbots).

After starting the azerothcore server and letting the server populate the pvp
teams I noticed that no matter how long it takes, bots will not join rated
arenas, they will however join skirmishes, as such obviously arenas work, but 
for some reason they wont join the ranked ones.

After some testing back and forth I realize that the problem is that azerothcore
creates teams for you that just don't seem to work the way that it should and I constantly
see "Not enough teammembers" when they are trying to join the arena.

So I decided that what needs to happen is to populate all the teams manually, but that is
frankly quite tedious so I had this tool made to fix it.

## Here is What it does

- Scans `characters` for level 80 characters not already on a team **for a
  given bracket** (a character can hold one 2v2, one 3v3, and one 5v5 team
  at once).
- Groups them by faction (Alliance/Horde).
- Creates full teams (2/3/5 members), assigns a captain, and gives the team
  a name pulled from a pool of 300+ faction-themed combos (e.g. "Silver
  Vanguard", "Bloodfang Reavers") instead of something generic.
- Optionally restricts this to playerbot accounts only (`rndbot%` by
  default), so it doesn't sweep up real players' characters.
- Optionally spreads starting ratings evenly across 0–2000 instead of
  everyone starting at 0, so the ladder isn't completely flat right after a
  fill, HOWEVER if you are playing solo I recommend leaving it at 0 and let the bots
  rank up naturally, this way you always have a team to fight through a season.
- Shows every team and its members/ratings, plus a ladder page with the
  top 5 players and top 5 teams.

## Preparation:

In preparation of using this tool I had the server start with 
```
AiPlayerbot.DeleteRandomBotArenaTeams = 1
```
in playerbots.conf, then I went inside the database and cleaned up any remaining teams
that were left behind by that process by deleting the rows.

then after setting the setting back to 0 I start and shut the server down once.

In my playerbots.conf I have set my bots to 
```
AiPlayerbot.MinRandomBots = 2000
AiPlayerbot.MaxRandomBots = 2000
```
and 

```
AiPlayerbot.RandomBotAutoJoinArenaBracket = 14

AiPlayerbot.RandomBotAutoJoinBGRatedArena2v2Count = 40
AiPlayerbot.RandomBotAutoJoinBGRatedArena3v3Count = 30
AiPlayerbot.RandomBotAutoJoinBGRatedArena5v5Count = 20

AiPlayerbot.RandomBotArenaTeam2v2Count = 40
AiPlayerbot.RandomBotArenaTeam3v3Count = 30
AiPlayerbot.RandomBotArenaTeam5v5Count = 20
```
You should adjust these to what you want, but the more bots
you have the more success you are going to have I believe.
(Just don't overdo it, find a good balance :) )

## Setup

1. Clone this repo and install dependencies:
   ```
   npm install
   ```
2. Copy the env template:
   ```
   cp .env.example .env
   ```
   The defaults match a standard AzerothCore install (`127.0.0.1`, user
   `acore`, password `acore`). Only change these if your `worldserver.conf`
   uses something different.
3. **Stop your worldserver before running a fill.** 
   Fill, then start the worldserver afterward.
4. Start the tool:
   ```
   npm start
   ```
5. Open `http://localhost:3000`. It doesn't need to run on the same
   machine as the database — it just needs network access to your MySQL
   server on port 3306.

## Bots vs. real players

The "only include playerbots" checkbox (on by default) joins against
`acore_auth.account` and matches `username LIKE 'rndbot%'` — case-
insensitively, so `RNDBOT33`, `rndbot1`, etc. all match. If your bot
accounts use a different prefix, change `BOT_ACCOUNT_PREFIX` in `.env`.
Uncheck the box to include everyone.

(I have not 100% tested this option yet as no players were in an arena team
at the time as I had just wiped the teams clean)

## Notes

- This only touches `arena_team` and `arena_team_member` (and reads from
  `characters`/`account`). It doesn't touch guilds, mail, or anything
  else.
- Safe to run repeatedly — it only picks up characters still unassigned
  for a given bracket, so you can re-run it as more bots hit 80.
- Team cosmetics (banner colors/emblem) are all left at default — easy to
  randomize later in `server.js` if you want more visual variety.
- Built and tested against the standard AzerothCore 3.3.5 `arena_team` /
  `arena_team_member` schema. If your fork has customized columns, the
  first fill attempt will throw a clear SQL error rather than silently
  doing the wrong thing — open an issue with the error if you hit one.

## License

MIT — see [LICENSE](LICENSE).
