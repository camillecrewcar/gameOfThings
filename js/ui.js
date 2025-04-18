// UI handling and DOM manipulation
import { gameState, fallbackData } from './game.js';
import { sendJoin, sendStartGame, sendDescription, sendVote, sendReadyForNextRound } from './network.js';

// DOM Elements cache
let elements = {};

// Initialize UI elements references
export function initializeUI() {
    elements = {
        lobby: document.getElementById('lobby'),
        gameDiv: document.getElementById('game'),
        playerNameInput: document.getElementById('playerName'),
        joinBtn: document.getElementById('joinBtn'),
        startBtn: document.getElementById('startBtn'),
        playerList: document.getElementById('playerList'),
        playerWord: document.getElementById('playerWord'),
        descriptionInput: document.getElementById('descriptionInput'),
        submitDescriptionBtn: document.getElementById('submitDescriptionBtn'),
        playersSection: document.getElementById('playersSection'),
        votingSection: document.getElementById('votingSection'),
        votingOptions: document.getElementById('votingOptions'),
        submitVoteBtn: document.getElementById('submitVoteBtn'),
        resultsSection: document.getElementById('resultsSection'),
        roundResults: document.getElementById('roundResults'),
        wordReveal: document.getElementById('wordReveal'),
        nextRoundBtn: document.getElementById('nextRoundBtn'),
        scoreBoard: document.getElementById('scoreBoard'),
        phaseIndicator: document.getElementById('phaseIndicator'),
        currentPhaseTitle: document.getElementById('currentPhaseTitle'),
        phaseDescription: document.getElementById('phaseDescription'),
        timeLeft: document.getElementById('timeLeft')
    };
}

// Set up event listeners
export function setupEventListeners() {
    // Join lobby
    elements.joinBtn.addEventListener('click', () => {
        gameState.playerName = elements.playerNameInput.value.trim();
        if (gameState.playerName) {
            sendJoin(gameState.playerName);
            elements.playerNameInput.disabled = true;
            elements.joinBtn.disabled = true;
        }
    });

    // Start game
    elements.startBtn.addEventListener('click', () => {
        console.log("Start game button clicked");
        elements.startBtn.disabled = true;
        elements.startBtn.textContent = 'Starting game...';
        elements.startBtn.classList.add('btn-disabled');
        
        // Emit the startGame event
        sendStartGame();
        
        // Fallback in case server doesn't respond
        setTimeout(() => {
            if (elements.lobby.classList.contains('hidden') === false) {
                console.log("Server didn't respond to game start, using local fallback");
                startGameUI();
                handleFallbackRound();
            }
        }, 5000);
    });

    // Submit description
    elements.submitDescriptionBtn.addEventListener('click', () => {
        gameState.playerDescription = elements.descriptionInput.value.trim();
        if (gameState.playerDescription) {
            sendDescription(gameState.playerDescription);
            elements.descriptionInput.disabled = true;
            elements.submitDescriptionBtn.disabled = true;
            elements.submitDescriptionBtn.textContent = 'Description Submitted';
            elements.submitDescriptionBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
            elements.submitDescriptionBtn.classList.add('bg-gray-400');
        }
    });

    // Submit vote
    elements.submitVoteBtn.addEventListener('click', () => {
        if (gameState.myVote) {
            sendVote(gameState.myVote);
            elements.submitVoteBtn.disabled = true;
            elements.submitVoteBtn.textContent = 'Vote Submitted';
            elements.submitVoteBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
            elements.submitVoteBtn.classList.add('bg-gray-400');
            gameState.hasVoted = true;
        }
    });

    // Next round
    elements.nextRoundBtn.addEventListener('click', () => {
        sendReadyForNextRound();
        elements.nextRoundBtn.disabled = true;
        elements.nextRoundBtn.textContent = 'Waiting for others...';
    });
}

// UI update for player list
export function updatePlayerListUI(players) {
    elements.playerList.innerHTML = '';
    let isHost = false;
    
    for (let id in players) {
        const li = document.createElement('li');
        li.textContent = players[id].name;
        elements.playerList.appendChild(li);
        if (id === gameState.socket?.id && Object.keys(players).indexOf(id) === 0) {
            isHost = true;
        }
    }
    
    elements.startBtn.classList.toggle('hidden', !isHost || Object.keys(players).length < 3);
}

// Switch from lobby to game
export function startGameUI() {
    elements.lobby.classList.add('hidden');
    elements.gameDiv.classList.remove('hidden');
    gameState.gameStarted = true;
    
    // Reset start button state (in case it's needed later)
    elements.startBtn.disabled = false;
    elements.startBtn.textContent = 'Start Game';
    elements.startBtn.classList.remove('btn-disabled');
}

// Handle a new round starting
export function handleNewRoundUI(data) {
    // Reset UI
    elements.descriptionInput.value = '';
    elements.descriptionInput.disabled = false;
    elements.submitDescriptionBtn.disabled = false;
    elements.submitDescriptionBtn.textContent = 'Submit Description';
    elements.submitDescriptionBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
    elements.submitDescriptionBtn.classList.remove('bg-gray-400');
    
    elements.playersSection.innerHTML = '';
    elements.votingSection.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');
    
    // Set player's word with visual indication
    gameState.setWord(data.word);
    elements.playerWord.textContent = data.word;
    elements.playerWord.classList.add('word-highlight');
    
    // Log to console for debugging
    console.log("Player's word set to:", data.word);
    
    // Remove highlight animation after it plays
    setTimeout(() => {
        elements.playerWord.classList.remove('word-highlight');
    }, 1000);
    
    // Reset round-specific state
    gameState.prepareForNewRound();
    
    // Update phase
    updatePhaseUI(gameState.setPhase('describing'));
    
    // Start timer if provided
    if (data.timeLimit) {
        startTimer(data.timeLimit);
    }
}

// Update descriptions in the UI
export function updateDescriptionsUI(descriptions) {
    elements.playersSection.innerHTML = '';
    
    for (let id in descriptions) {
        const player = gameState.players[id];
        if (!player) continue;
        
        const description = descriptions[id];
        const card = document.createElement('div');
        card.className = 'player-card bg-white p-4 rounded-lg shadow border-2 border-transparent';
        
        card.innerHTML = `
            <h3 class="font-bold text-lg">${player.name}</h3>
            <p class="text-gray-600 italic">"${description}"</p>
        `;
        
        elements.playersSection.appendChild(card);
    }
}

// Update voting options UI
export function startVotingUI(playerData) {
    updatePhaseUI(gameState.setPhase('voting'));
    
    elements.votingOptions.innerHTML = '';
    
    // Create voting options for each player except self
    for (let id in playerData) {
        if (id === gameState.socket?.id) continue;
        
        const player = playerData[id];
        const option = document.createElement('div');
        option.className = 'player-card p-3 bg-white rounded-lg shadow border-2 border-transparent cursor-pointer';
        option.innerHTML = `<p class="font-bold">${player.name}</p>`;
        option.dataset.playerId = id;
        
        option.addEventListener('click', () => {
            // Clear previous selection
            document.querySelectorAll('.player-card').forEach(card => {
                card.classList.remove('border-blue-500');
            });
            
            // Mark this option as selected
            option.classList.add('border-blue-500');
            gameState.myVote = id;
        });
        
        elements.votingOptions.appendChild(option);
    }
}

// Display results UI
export function showResultsUI(data) {
    updatePhaseUI(gameState.setPhase('results'));
    
    // Display voting results
    let resultsHTML = '<h3 class="font-bold mb-2">Voting Results:</h3>';
    
    for (let id in data.votes) {
        const votedPlayer = gameState.players[data.votes[id]];
        resultsHTML += `<p>${gameState.players[id].name} voted for ${votedPlayer ? votedPlayer.name : 'no one'}</p>`;
    }
    
    elements.roundResults.innerHTML = resultsHTML;
    
    // Display word reveal
    let revealHTML = '<h3 class="font-bold mb-2">Word Reveal:</h3>';
    
    // Show the two different words
    revealHTML += `<p>Majority word: <span class="font-bold">${data.majorityWord}</span></p>`;
    revealHTML += `<p>Impostor word: <span class="font-bold">${data.impostorWord}</span></p>`;
    
    // Show who had which word
    revealHTML += '<p class="mt-2 mb-1 font-bold">Players with majority word:</p><ul class="list-disc pl-5">';
    data.majorityPlayers.forEach(id => {
        revealHTML += `<li>${gameState.players[id].name}</li>`;
    });
    revealHTML += '</ul>';
    
    revealHTML += '<p class="mt-2 mb-1 font-bold">Impostors:</p><ul class="list-disc pl-5">';
    data.impostors.forEach(id => {
        revealHTML += `<li>${gameState.players[id].name}</li>`;
    });
    revealHTML += '</ul>';
    
    elements.wordReveal.innerHTML = revealHTML;
    
    // Store impostor IDs for reference
    gameState.impostors = data.impostors;
    
    // Reset next round button
    elements.nextRoundBtn.disabled = false;
    elements.nextRoundBtn.textContent = 'Next Round';
}

// Update score display
export function updateScoreBoardUI() {
    let scoreText = '';
    
    // Sort players by score in descending order
    const sortedPlayers = Object.keys(gameState.scores).sort((a, b) => gameState.scores[b] - gameState.scores[a]);
    
    for (const id of sortedPlayers) {
        const playerName = gameState.players[id]?.name || 'Unknown';
        const score = gameState.scores[id] || 0;
        const isCurrentPlayer = id === gameState.socket?.id;
        
        scoreText += `<div class="flex justify-between py-1 ${isCurrentPlayer ? 'font-bold' : ''}">
            <span>${playerName}</span>
            <span>${score}</span>
        </div>`;
    }
    
    elements.scoreBoard.innerHTML = scoreText || '<div>No scores yet</div>';
}

// Update phase UI
export function updatePhaseUI(phase) {
    // Update phase indicator color
    switch (phase) {
        case 'describing':
            elements.phaseIndicator.className = 'phase-indicator bg-blue-500 text-white';
            elements.phaseIndicator.textContent = 'Describing';
            elements.currentPhaseTitle.textContent = 'Describing Phase';
            elements.phaseDescription.textContent = 'Each player will describe their word without saying it directly.';
            elements.votingSection.classList.add('hidden');
            elements.resultsSection.classList.add('hidden');
            break;
        case 'voting':
            elements.phaseIndicator.className = 'phase-indicator bg-red-500 text-white';
            elements.phaseIndicator.textContent = 'Voting';
            elements.currentPhaseTitle.textContent = 'Voting Phase';
            elements.phaseDescription.textContent = 'Vote for who you think has the different word.';
            elements.votingSection.classList.remove('hidden');
            elements.resultsSection.classList.add('hidden');
            break;
        case 'results':
            elements.phaseIndicator.className = 'phase-indicator bg-green-500 text-white';
            elements.phaseIndicator.textContent = 'Results';
            elements.currentPhaseTitle.textContent = 'Results Phase';
            elements.phaseDescription.textContent = 'See the results and prepare for the next round.';
            elements.votingSection.classList.add('hidden');
            elements.resultsSection.classList.remove('hidden');
            break;
        default:
            elements.phaseIndicator.className = 'phase-indicator bg-gray-500 text-white';
            elements.phaseIndicator.textContent = 'Waiting';
            break;
    }
}

// Start countdown timer
export function startTimer(seconds) {
    gameState.clearTimer();
    elements.timeLeft.textContent = seconds;
    
    gameState.timerInterval = setInterval(() => {
        seconds--;
        elements.timeLeft.textContent = seconds;
        
        if (seconds <= 0) {
            gameState.clearTimer();
        }
    }, 1000);
}

// Fallback function for testing without server
export function handleFallbackRound() {
    console.log("Running fallback round handler");
    
    // Ensure UI is properly set up
    elements.descriptionInput.value = '';
    elements.descriptionInput.disabled = false;
    elements.submitDescriptionBtn.disabled = false;
    elements.submitDescriptionBtn.textContent = 'Submit Description';
    elements.submitDescriptionBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
    elements.submitDescriptionBtn.classList.remove('bg-gray-400');
    
    elements.playersSection.innerHTML = '';
    elements.votingSection.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');
    
    // Manually trigger the new round handler
    gameState.setWord(fallbackData.word);
    elements.playerWord.textContent = fallbackData.word;
    elements.playerWord.classList.add('word-highlight');
    console.log("Fallback word set:", fallbackData.word);
    
    // Remove highlight animation after it plays
    setTimeout(() => {
        elements.playerWord.classList.remove('word-highlight');
    }, 1000);
    
    // Update phase
    updatePhaseUI(gameState.setPhase('describing'));
    
    // Start a fallback timer
    startTimer(fallbackData.timeLimit);
    
    // Create fallback player descriptions for testing
    setTimeout(() => {
        elements.playersSection.innerHTML = '';
        
        for (let id in fallbackData.mockDescriptions) {
            const card = document.createElement('div');
            card.className = 'player-card bg-white p-4 rounded-lg shadow border-2 border-transparent';
            
            card.innerHTML = `
                <h3 class="font-bold text-lg">Player ${id.slice(-1)}</h3>
                <p class="text-gray-600 italic">"${fallbackData.mockDescriptions[id]}"</p>
            `;
            
            elements.playersSection.appendChild(card);
        }
    }, 10000); // After 10 seconds show mock descriptions
}
