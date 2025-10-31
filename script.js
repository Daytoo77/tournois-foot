document.addEventListener('DOMContentLoaded', () => {
    const addTeamBtn = document.getElementById('add-team-btn');
    const teamNameInput = document.getElementById('team-name-input');
    const teamsList = document.getElementById('teams-list');
    const setupForm = document.getElementById('setup-form');
    const setupSection = document.getElementById('setup-section');
    const tournamentDashboard = document.getElementById('tournament-dashboard');

    let teams = [];

    addTeamBtn.addEventListener('click', () => {
        const teamName = teamNameInput.value.trim();
        if (teamName) {
            addTeam(teamName);
            teamNameInput.value = '';
            teamNameInput.focus();
        }
    });

    function addTeam(name) {
        if (teams.includes(name)) {
            alert('This team has already been added.');
            return;
        }
        teams.push(name);
        renderTeams();
    }

    function removeTeam(name) {
        teams = teams.filter(team => team !== name);
        renderTeams();
    }

    function renderTeams() {
        teamsList.innerHTML = '';
        teams.forEach(team => {
            const teamElement = document.createElement('div');
            teamElement.classList.add('team-item');
            teamElement.innerHTML = `
                <span>${team}</span>
                <button type="button" class="remove-team-btn" data-team-name="${team}">&times;</button>
            `;
            teamsList.appendChild(teamElement);
        });
        
        // Add event listeners to new remove buttons
        document.querySelectorAll('.remove-team-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const teamNameToRemove = e.target.getAttribute('data-team-name');
                removeTeam(teamNameToRemove);
            });
        });
    }

    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const tournamentName = document.getElementById('tournament-name').value;
        if (!tournamentName || teams.length < 2) {
            alert('Please enter a tournament name and add at least 2 teams.');
            return;
        }

        // Hide setup and show dashboard
        setupSection.classList.add('hidden');
        tournamentDashboard.classList.remove('hidden');
        
        // Next step: Generate and display the tournament fixtures
        generateTournament();
    });

    function generateTournament() {
        // Placeholder for tournament generation logic
        const bracketsContainer = document.getElementById('brackets-container');
        bracketsContainer.innerHTML = '<h3>Tournament generation is in progress...</h3>';
        console.log('Generating tournament with teams:', teams);
        console.log('Format:', document.getElementById('tournament-format').value);
    }
});