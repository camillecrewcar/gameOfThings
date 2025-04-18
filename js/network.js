// Network communication and socket handling
import { gameState } from './game.js';
import { 
    updatePlayerListUI, 
    startGameUI, 
    handleNewRoundUI, 
    updateDescriptionsUI, 
    startVotingUI, 
    showResultsUI, 
    updateScoreBoardUI, 
    handleFallbackRound 
} from './ui.js';

// Socket instance
export const socket = io();

// Set socket reference in gameState
gameState.socket = socket;

// Socket event setup
export function setupSocketListeners() {
    // Update player list
    socket.on('updatePlayers', (playerData) => {
        gameState.updatePlayers(playerData);
        updatePlayerListUI(playerData);
    });

    // Game started
    socket.on('gameStarted', () => {
        console.log("Game started event received from server");
        startGameUI();
        updateScoreBoardUI();
        
        // If no round data is received within 3 seconds, use fallback
        setTimeout(() => {
            if (!gameState.currentWord) {
                console.log("No word received from server, using fallback");
                handleFallbackRound();
            }
        }, 3000);
    });

    // New round
    socket.on('newRound', (data) => {
        handleNewRoundUI(data);
    });

    // Update descriptions
    socket.on('updateDescriptions', (descriptions) => {
        updateDescriptionsUI(descriptions);
    });

    // Start voting phase
    socket.on('startVoting', (playerData) => {
        startVotingUI(playerData);
    });

    // Results phase
    socket.on('roundResults', (data) => {
        showResultsUI(data);
    });

    // Update scores
    socket.on('updateScores', (newScores) => {
        gameState.updateScores(newScores);
        updateScoreBoardUI();
    });

    // Handle disconnection
    socket.on('playerDisconnected', (id) => {
        delete gameState.players[id];
        delete gameState.scores[id];
        updateScoreBoardUI();
    });

    // Connection error handling
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });
}

// Emitters - Send events to server
export function sendJoin(playerName) {
    socket.emit('join', playerName);
}

export function sendStartGame() {
    socket.emit('startGame');
}

export function sendDescription(description) {
    socket.emit('submitDescription', {
        playerId: socket.id,
        description: description
    });
}

export function sendVote(votedForId) {
    socket.emit('submitVote', {
        voter: socket.id,
        votedFor: votedForId
    });
}

export function sendReadyForNextRound() {
    socket.emit('readyForNextRound');
}
