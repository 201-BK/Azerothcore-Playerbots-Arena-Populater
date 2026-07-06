const summaryGrid = document.getElementById('summary-grid');
const teamsGrid = document.getElementById('teams-grid');
const fillBtn = document.getElementById('fill-btn');
const fillStatus = document.getElementById('fill-status');
const filterBtns = document.querySelectorAll('.filter-btn');
const botsOnlyCheckbox = document.getElementById('bots-only');
const spreadRatingsCheckbox = document.getElementById('spread-ratings');

let currentFilter = 'all';

async function loadSummary() {
  const res = await fetch(`/api/eligible-summary?botsOnly=${botsOnlyCheckbox.checked}`);
  const data = await res.json();
  summaryGrid.innerHTML = data.summary
    .map(
      (s) => `
      <div class="summary-card ${s.faction.toLowerCase()}">
        <div class="label">${s.faction} · ${s.bracket}</div>
        <p class="count">${s.eligibleCount}</p>
        <div class="teams">unassigned &rarr; ${s.teamsPossible} team${s.teamsPossible === 1 ? '' : 's'} possible</div>
      </div>`
    )
    .join('');
}

async function loadTeams() {
  const res = await fetch('/api/teams');
  const data = await res.json();
  const teams = currentFilter === 'all'
    ? data.teams
    : data.teams.filter((t) => t.bracket === currentFilter);

  if (teams.length === 0) {
    teamsGrid.innerHTML = '<p class="empty-note">No teams yet. Muster some above.</p>';
    return;
  }

  teamsGrid.innerHTML = teams
    .map(
      (t) => `
      <div class="team-card ${t.faction.toLowerCase()}">
        <p class="team-name">${t.name}</p>
        <div class="team-meta">${t.bracket} &middot; Rating <span class="rating">${t.rating}</span> &middot; ${t.seasonWins}-${t.seasonGames - t.seasonWins}</div>
        ${t.members
          .map(
            (m) => `
          <div class="member-row">
            <span>${m.isCaptain ? '<span class="captain-mark">&#9733;</span>' : ''}${m.name} <small>(${m.class})</small></span>
            <span>${m.personalRating}</span>
          </div>`
          )
          .join('')}
      </div>`
    )
    .join('');
}

fillBtn.addEventListener('click', async () => {
  fillBtn.disabled = true;
  fillStatus.textContent = 'Mustering troops...';
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botsOnly: botsOnlyCheckbox.checked,
        spreadRatings: spreadRatingsCheckbox.checked,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unknown error');
    fillStatus.textContent = `Created ${data.createdCount} new team${data.createdCount === 1 ? '' : 's'}.`;
    await loadSummary();
    await loadTeams();
  } catch (err) {
    fillStatus.textContent = `Error: ${err.message}`;
  } finally {
    fillBtn.disabled = false;
  }
});

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.bracket;
    loadTeams();
  });
});

loadSummary();
loadTeams();

botsOnlyCheckbox.addEventListener('change', loadSummary);
