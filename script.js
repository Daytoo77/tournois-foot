document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addTeamBtn = document.getElementById('add-team-btn');
    const teamNameInput = document.getElementById('team-name-input');
    const teamColorInput = document.getElementById('team-color-input');
    const teamsList = document.getElementById('teams-list');
    const setupForm = document.getElementById('setup-form');
    const setupSection = document.getElementById('setup-section');
    const tournamentDashboard = document.getElementById('tournament-dashboard');
    const tournamentFormatSelect = document.getElementById('tournament-format');
    const groupOptions = document.getElementById('group-options');
    const backToSetupBtn = document.getElementById('back-to-setup-btn');

    // State
    let teams = [];
    let tournament = null;

    // Event Listeners
    addTeamBtn.addEventListener('click', addTeamHandler);
    
    teamNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTeamHandler();
        }
    });

    tournamentFormatSelect.addEventListener('change', (e) => {
        const format = e.target.value;
        if (format === 'group' || format === 'group-only') {
            groupOptions.classList.remove('hidden');
        } else {
            groupOptions.classList.add('hidden');
        }
    });

    setupForm.addEventListener('submit', handleGenerateTournament);
    backToSetupBtn.addEventListener('click', backToSetup);

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.tab;
            switchTab(targetTab);
        });
    });

    // Team Management
    function addTeamHandler() {
        const teamName = teamNameInput.value.trim();
        const teamColor = teamColorInput.value;
        
        if (teamName) {
            addTeam(teamName, teamColor);
            teamNameInput.value = '';
            teamNameInput.focus();
        }
    }

    function addTeam(name, color) {
        if (teams.some(team => team.name.toLowerCase() === name.toLowerCase())) {
            alert('This team has already been added.');
            return;
        }
        teams.push({ name, color });
        renderTeams();
    }

    function removeTeam(name) {
        teams = teams.filter(team => team.name !== name);
        renderTeams();
    }

    function renderTeams() {
        teamsList.innerHTML = '';
        teams.forEach(team => {
            const teamElement = document.createElement('div');
            teamElement.classList.add('team-item');
            teamElement.innerHTML = `
                <div class="team-info">
                    <div class="team-color-badge" style="background-color: ${team.color}"></div>
                    <span class="team-name">${team.name}</span>
                </div>
                <button type="button" class="remove-team-btn" data-team-name="${team.name}">Remove</button>
            `;
            teamsList.appendChild(teamElement);
        });
        
        document.querySelectorAll('.remove-team-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const teamNameToRemove = e.target.getAttribute('data-team-name');
                removeTeam(teamNameToRemove);
            });
        });
    }

    // Tournament Generation
    function handleGenerateTournament(e) {
        e.preventDefault();
        
        const tournamentName = document.getElementById('tournament-name').value;
        const format = document.getElementById('tournament-format').value;
        const includeThirdPlace = document.getElementById('third-place-match').checked;
        const pointsWin = parseInt(document.getElementById('points-win').value);
        const pointsDraw = parseInt(document.getElementById('points-draw').value);
        const pointsLoss = parseInt(document.getElementById('points-loss').value);
        
        if (!tournamentName || teams.length < 2) {
            alert('Please enter a tournament name and add at least 2 teams.');
            return;
        }

        const config = {
            name: tournamentName,
            format,
            includeThirdPlace,
            pointSystem: { win: pointsWin, draw: pointsDraw, loss: pointsLoss },
            numGroups: format.includes('group') ? parseInt(document.getElementById('num-groups').value) : 0,
            teamsPerGroup: format.includes('group') ? parseInt(document.getElementById('teams-per-group').value) : 0
        };

        tournament = generateTournament(teams, config);
        
        setupSection.classList.add('hidden');
        tournamentDashboard.classList.remove('hidden');
        
        document.getElementById('tournament-title').textContent = tournamentName;
        
        renderTournament();
    }

    function generateTournament(teams, config) {
        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
        
        const tournament = {
            config,
            teams: shuffledTeams,
            groups: [],
            knockoutMatches: [],
            standings: []
        };

        if (config.format === 'group' || config.format === 'group-only') {
            tournament.groups = generateGroups(shuffledTeams, config.numGroups);
            tournament.standings = initializeStandings(tournament.groups);
        }

        if (config.format === 'knockout') {
            tournament.knockoutMatches = generateKnockoutBracket(shuffledTeams, config.includeThirdPlace);
        } else if (config.format === 'group') {
            // Generate knockout after groups
            tournament.knockoutMatches = [];
        }

        return tournament;
    }

    function generateGroups(teams, numGroups) {
        const groups = Array.from({ length: numGroups }, (_, i) => ({
            name: String.fromCharCode(65 + i), // A, B, C, etc.
            teams: [],
            matches: []
        }));

        teams.forEach((team, index) => {
            groups[index % numGroups].teams.push(team);
        });

        groups.forEach(group => {
            group.matches = generateGroupMatches(group.teams);
        });

        return groups;
    }

    function generateGroupMatches(teams) {
        const matches = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                matches.push({
                    id: `group-${Date.now()}-${i}-${j}`,
                    home: teams[i],
                    away: teams[j],
                    homeScore: null,
                    awayScore: null,
                    status: 'pending'
                });
            }
        }
        return matches;
    }

    function initializeStandings(groups) {
        const standings = {};
        groups.forEach(group => {
            standings[group.name] = group.teams.map(team => ({
                team,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0,
                points: 0
            }));
        });
        return standings;
    }

    function generateKnockoutBracket(teams, includeThirdPlace) {
        const rounds = [];
        let currentRound = [];
        let numTeams = teams.length;
        
        // Find next power of 2
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(numTeams)));
        const byes = bracketSize - numTeams;
        
        // First round
        let teamIndex = 0;
        for (let i = 0; i < bracketSize / 2; i++) {
            const home = teamIndex < teams.length ? teams[teamIndex++] : null;
            const away = teamIndex < teams.length ? teams[teamIndex++] : null;
            
            if (home && away) {
                currentRound.push({
                    id: `knockout-r1-${i}`,
                    round: 'Round 1',
                    home,
                    away,
                    homeScore: null,
                    awayScore: null,
                    status: 'pending',
                    winner: null
                });
            } else if (home) {
                currentRound.push({
                    id: `knockout-r1-${i}`,
                    round: 'Round 1',
                    home,
                    away: null,
                    homeScore: null,
                    awayScore: null,
                    status: 'bye',
                    winner: home
                });
            }
        }
        
        rounds.push(currentRound);
        
        // Generate subsequent rounds
        let roundNum = 2;
        while (currentRound.length > 1) {
            const nextRound = [];
            const roundName = currentRound.length === 2 ? 'Final' : 
                             currentRound.length === 4 ? 'Semi-Finals' :
                             currentRound.length === 8 ? 'Quarter-Finals' :
                             `Round ${roundNum}`;
            
            for (let i = 0; i < currentRound.length / 2; i++) {
                const match1 = currentRound[i * 2];
                const match2 = currentRound[i * 2 + 1];
                if (match1 && match2) {
                    nextRound.push({
                        id: `knockout-r${roundNum}-${i}`,
                        round: roundName,
                        home: null,
                        away: null,
                        homeScore: null,
                        awayScore: null,
                        status: 'pending',
                        winner: null,
                        sourceMatches: [match1.id, match2.id]
                    });
                }
            }
            
            rounds.push(nextRound);
            currentRound = nextRound;
            roundNum++;
        }
        
        // Add third place match if enabled
        if (includeThirdPlace && rounds.length > 1) {
            const semiFinals = rounds[rounds.length - 2];
            if (semiFinals.length === 2) {
                rounds.push([{
                    id: 'third-place',
                    round: '3rd Place Match',
                    home: null,
                    away: null,
                    homeScore: null,
                    awayScore: null,
                    status: 'pending',
                    winner: null,
                    isThirdPlace: true
                }]);
            }
        }
        
        return rounds.flat();
    }

    // Rendering
    function renderTournament() {
        switchTab('fixtures');
        renderFixtures();
        renderStandings();
        renderBracket();
    }

    function renderFixtures() {
        const groupStageContainer = document.getElementById('group-stage-container');
        const knockoutContainer = document.getElementById('knockout-container');

        if (tournament.groups.length > 0) {
            groupStageContainer.classList.remove('hidden');
            renderGroupStage();
        } else {
            groupStageContainer.classList.add('hidden');
        }

        if (tournament.knockoutMatches.length > 0) {
            knockoutContainer.classList.remove('hidden');
            renderKnockoutStage();
        } else {
            knockoutContainer.classList.add('hidden');
        }
    }

    function renderGroupStage() {
        const groupsDisplay = document.getElementById('groups-display');
        groupsDisplay.innerHTML = '';

        const groupsGrid = document.createElement('div');
        groupsGrid.className = 'groups-grid';

        tournament.groups.forEach(group => {
            const groupCard = document.createElement('div');
            groupCard.className = 'group-card';
            
            let matchesHtml = '';
            group.matches.forEach(match => {
                matchesHtml += renderMatchCard(match, group.name);
            });

            groupCard.innerHTML = `
                <h4>Group ${group.name}</h4>
                <div class="matches-list">
                    ${matchesHtml}
                </div>
            `;

            groupsGrid.appendChild(groupCard);
        });

        groupsDisplay.appendChild(groupsGrid);
        attachMatchEventListeners();
    }

    function renderKnockoutStage() {
        const knockoutFixtures = document.getElementById('knockout-fixtures');
        knockoutFixtures.innerHTML = '';

        const rounds = {};
        tournament.knockoutMatches.forEach(match => {
            if (!rounds[match.round]) {
                rounds[match.round] = [];
            }
            rounds[match.round].push(match);
        });

        Object.entries(rounds).forEach(([roundName, matches]) => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'bracket-round';
            roundDiv.innerHTML = `<h4>${roundName}</h4>`;
            
            const matchesList = document.createElement('div');
            matchesList.className = 'matches-list';
            
            matches.forEach(match => {
                matchesList.innerHTML += renderMatchCard(match);
            });
            
            roundDiv.appendChild(matchesList);
            knockoutFixtures.appendChild(roundDiv);
        });

        attachMatchEventListeners();
    }

    function renderMatchCard(match, groupName = null) {
        const homeTeam = match.home ? match.home.name : 'TBD';
        const awayTeam = match.away ? match.away.name : 'TBD';
        const homeColor = match.home ? match.home.color : '#ccc';
        const awayColor = match.away ? match.away.color : '#ccc';
        
        const isCompleted = match.status === 'completed';
        const isBye = match.status === 'bye';
        const isPending = match.status === 'pending' && match.home && match.away;
        
        let statusBadge = '';
        if (isBye) {
            statusBadge = '<span class="match-status completed">Bye</span>';
        } else if (isCompleted) {
            statusBadge = '<span class="match-status completed">Completed</span>';
        } else if (isPending) {
            statusBadge = '<span class="match-status pending">Pending</span>';
        }

        return `
            <div class="match-card" data-match-id="${match.id}">
                <div class="match-header">
                    ${groupName ? `Group ${groupName} - ` : ''}Match #${match.id.split('-').pop()}
                    ${statusBadge}
                </div>
                <div class="match-teams">
                    <div class="match-team home">
                        <div class="team-badge-small" style="background-color: ${homeColor}"></div>
                        <span>${homeTeam}</span>
                        ${isPending || isCompleted ? `<input type="number" class="score-input" data-team="home" 
                            value="${match.homeScore !== null ? match.homeScore : ''}" 
                            placeholder="0" min="0" ${isCompleted ? 'disabled' : ''}>` : ''}
                    </div>
                    <div class="match-vs">VS</div>
                    <div class="match-team away">
                        <span>${awayTeam}</span>
                        <div class="team-badge-small" style="background-color: ${awayColor}"></div>
                        ${isPending || isCompleted ? `<input type="number" class="score-input" data-team="away" 
                            value="${match.awayScore !== null ? match.awayScore : ''}" 
                            placeholder="0" min="0" ${isCompleted ? 'disabled' : ''}>` : ''}
                    </div>
                </div>
                ${isPending ? `
                    <div class="match-actions">
                        <button class="save-score-btn" data-match-id="${match.id}">💾 Save Score</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function attachMatchEventListeners() {
        document.querySelectorAll('.save-score-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const matchId = e.target.dataset.matchId;
                saveMatchScore(matchId);
            });
        });
    }

    function saveMatchScore(matchId) {
        const matchCard = document.querySelector(`[data-match-id="${matchId}"]`);
        const homeScoreInput = matchCard.querySelector('[data-team="home"]');
        const awayScoreInput = matchCard.querySelector('[data-team="away"]');
        
        const homeScore = parseInt(homeScoreInput.value);
        const awayScore = parseInt(awayScoreInput.value);
        
        if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
            alert('Please enter valid scores for both teams.');
            return;
        }

        // Find and update the match
        let match = null;
        let groupName = null;

        // Check in groups
        tournament.groups.forEach(group => {
            const found = group.matches.find(m => m.id === matchId);
            if (found) {
                match = found;
                groupName = group.name;
            }
        });

        // Check in knockout
        if (!match) {
            match = tournament.knockoutMatches.find(m => m.id === matchId);
        }

        if (match) {
            match.homeScore = homeScore;
            match.awayScore = awayScore;
            match.status = 'completed';
            
            if (homeScore > awayScore) {
                match.winner = match.home;
            } else if (awayScore > homeScore) {
                match.winner = match.away;
            } else {
                match.winner = null; // Draw
            }

            // Update standings if group match
            if (groupName) {
                updateStandings(groupName, match);
            }

            // Update knockout progression
            if (match.round && match.round !== '3rd Place Match') {
                updateKnockoutProgression(match);
            }

            renderTournament();
            alert('Score saved successfully!');
        }
    }

    function updateStandings(groupName, match) {
        const groupStandings = tournament.standings[groupName];
        const homeTeamStats = groupStandings.find(s => s.team.name === match.home.name);
        const awayTeamStats = groupStandings.find(s => s.team.name === match.away.name);

        if (!homeTeamStats || !awayTeamStats) return;

        homeTeamStats.played++;
        awayTeamStats.played++;
        
        homeTeamStats.goalsFor += match.homeScore;
        homeTeamStats.goalsAgainst += match.awayScore;
        awayTeamStats.goalsFor += match.awayScore;
        awayTeamStats.goalsAgainst += match.homeScore;

        if (match.homeScore > match.awayScore) {
            homeTeamStats.won++;
            homeTeamStats.points += tournament.config.pointSystem.win;
            awayTeamStats.lost++;
            awayTeamStats.points += tournament.config.pointSystem.loss;
        } else if (match.awayScore > match.homeScore) {
            awayTeamStats.won++;
            awayTeamStats.points += tournament.config.pointSystem.win;
            homeTeamStats.lost++;
            homeTeamStats.points += tournament.config.pointSystem.loss;
        } else {
            homeTeamStats.drawn++;
            awayTeamStats.drawn++;
            homeTeamStats.points += tournament.config.pointSystem.draw;
            awayTeamStats.points += tournament.config.pointSystem.draw;
        }

        homeTeamStats.goalDifference = homeTeamStats.goalsFor - homeTeamStats.goalsAgainst;
        awayTeamStats.goalDifference = awayTeamStats.goalsFor - awayTeamStats.goalsAgainst;

        // Sort standings
        groupStandings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
    }

    function updateKnockoutProgression(match) {
        if (!match.winner) return;

        // Find next round matches
        tournament.knockoutMatches.forEach(nextMatch => {
            if (nextMatch.sourceMatches && nextMatch.sourceMatches.includes(match.id)) {
                const matchIndex = nextMatch.sourceMatches.indexOf(match.id);
                if (matchIndex === 0) {
                    nextMatch.home = match.winner;
                } else {
                    nextMatch.away = match.winner;
                }
            }
        });
    }

    function renderStandings() {
        const standingsDisplay = document.getElementById('standings-display');
        standingsDisplay.innerHTML = '';

        if (Object.keys(tournament.standings).length === 0) {
            standingsDisplay.innerHTML = '<p>No standings available for this tournament format.</p>';
            return;
        }

        Object.entries(tournament.standings).forEach(([groupName, standings]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'standings-container';
            
            const table = document.createElement('table');
            table.className = 'standings-table';
            
            const teamsAdvancing = tournament.config.teamsPerGroup || 2;
            
            table.innerHTML = `
                <thead>
                    <tr>
                        <th colspan="11">Group ${groupName}</th>
                    </tr>
                    <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th>P</th>
                        <th>W</th>
                        <th>D</th>
                        <th>L</th>
                        <th>GF</th>
                        <th>GA</th>
                        <th>GD</th>
                        <th>Pts</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map((stat, index) => `
                        <tr class="${index < teamsAdvancing ? 'qualified' : ''}">
                            <td class="position">${index + 1}</td>
                            <td>
                                <div class="team-name-cell">
                                    <div class="team-badge-small" style="background-color: ${stat.team.color}"></div>
                                    ${stat.team.name}
                                </div>
                            </td>
                            <td>${stat.played}</td>
                            <td>${stat.won}</td>
                            <td>${stat.drawn}</td>
                            <td>${stat.lost}</td>
                            <td>${stat.goalsFor}</td>
                            <td>${stat.goalsAgainst}</td>
                            <td>${stat.goalDifference > 0 ? '+' : ''}${stat.goalDifference}</td>
                            <td><strong>${stat.points}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            
            groupDiv.appendChild(table);
            standingsDisplay.appendChild(groupDiv);
        });
    }

    function renderBracket() {
        const bracketDisplay = document.getElementById('bracket-display');
        bracketDisplay.innerHTML = '';

        if (tournament.knockoutMatches.length === 0) {
            bracketDisplay.innerHTML = '<p>No bracket available for this tournament format.</p>';
            return;
        }

        const rounds = {};
        tournament.knockoutMatches.forEach(match => {
            if (!rounds[match.round]) {
                rounds[match.round] = [];
            }
            rounds[match.round].push(match);
        });

        const bracketContainer = document.createElement('div');
        bracketContainer.className = 'bracket-container';

        Object.entries(rounds).forEach(([roundName, matches]) => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'bracket-round';
            roundDiv.innerHTML = `<h4>${roundName}</h4>`;
            
            const matchesDiv = document.createElement('div');
            matchesDiv.className = 'bracket-matches';
            
            matches.forEach(match => {
                const matchDiv = document.createElement('div');
                matchDiv.className = 'match-card';
                
                const homeTeam = match.home ? match.home.name : 'TBD';
                const awayTeam = match.away ? match.away.name : 'TBD';
                const homeColor = match.home ? match.home.color : '#ccc';
                const awayColor = match.away ? match.away.color : '#ccc';
                
                let scoreDisplay = '';
                if (match.homeScore !== null && match.awayScore !== null) {
                    scoreDisplay = `${match.homeScore} - ${match.awayScore}`;
                }
                
                matchDiv.innerHTML = `
                    <div class="match-teams">
                        <div class="match-team">
                            <div class="team-badge-small" style="background-color: ${homeColor}"></div>
                            <span>${homeTeam}</span>
                        </div>
                        ${scoreDisplay ? `<div class="match-vs">${scoreDisplay}</div>` : '<div class="match-vs">VS</div>'}
                        <div class="match-team">
                            <div class="team-badge-small" style="background-color: ${awayColor}"></div>
                            <span>${awayTeam}</span>
                        </div>
                    </div>
                    ${match.winner ? `<div style="text-align: center; margin-top: 0.5rem; font-weight: bold; color: var(--success-color);">
                        Winner: ${match.winner.name}
                    </div>` : ''}
                `;
                
                matchesDiv.appendChild(matchDiv);
            });
            
            roundDiv.appendChild(matchesDiv);
            bracketContainer.appendChild(roundDiv);
        });

        bracketDisplay.appendChild(bracketContainer);
    }

    function switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    function backToSetup() {
        if (confirm('Are you sure? All tournament progress will be lost.')) {
            setupSection.classList.remove('hidden');
            tournamentDashboard.classList.add('hidden');
            tournament = null;
        }
    }
});
