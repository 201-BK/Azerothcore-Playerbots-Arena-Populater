async function loadLeaderboard() {
  const res = await fetch('/api/leaderboard');
  const data = await res.json();

  const playersEl = document.getElementById('top-players');
  if (data.topPlayers.length === 0) {
    playersEl.innerHTML = '<p class="empty-note">No rated players yet.</p>';
  } else {
    playersEl.innerHTML = data.topPlayers
      .map(
        (p, i) => `
        <div class="ladder-row ${p.faction.toLowerCase()}">
          <span class="rank">#${i + 1}</span>
          <span class="who">
            <strong>${p.name}</strong>
            <small>${p.race} ${p.class} &middot; ${p.teamName} (${p.bracket})</small>
          </span>
          <span class="rating">${p.personalRating}</span>
        </div>`
      )
      .join('');
  }

  const teamsEl = document.getElementById('top-teams');
  if (data.topTeams.length === 0) {
    teamsEl.innerHTML = '<p class="empty-note">No teams yet.</p>';
  } else {
    teamsEl.innerHTML = data.topTeams
      .map(
        (t, i) => `
        <div class="ladder-row ${t.faction.toLowerCase()}">
          <span class="rank">#${i + 1}</span>
          <span class="who">
            <strong>${t.name}</strong>
            <small>${t.bracket} &middot; ${t.seasonWins}-${t.seasonGames - t.seasonWins}</small>
          </span>
          <span class="rating">${t.rating}</span>
        </div>`
      )
      .join('');
  }
}

loadLeaderboard();
