// Main application file - initializes the game

// Connect to Socket.IO server
const socket = io();

// DOM Elements
const lobbyElement = document.getElementById('lobby');
const gameElement = document.getElementById('game');
const playerNameInput = document.getElementById('playerName');
const playerListElement = document.getElementById('playerList');
const startButton = document.getElementById('startBtn');
const initialOptions = document.getElementById('initialOptions');
const joinRoomSection = document.getElementById('joinRoomSection');
const roomDetails = document.getElementById('roomDetails');
const roomCodeElement = document.getElementById('roomCode');
const roomCodeInput = document.getElementById('roomCodeInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomOption = document.getElementById('joinRoomOption');
const backToOptionsBtn = document.getElementById('backToOptionsBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const shareLink = document.getElementById('shareLink');

// Game state
let currentRoomCode = null;
let playerName = '';
let isRoomHost = false;

// UI Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Word Impostor Game');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize on page load
    initialize();
});

function setupEventListeners() {
    console.log("Setting up event listeners");
    
    // Make sure the elements exist before adding event listeners
    if (createRoomBtn) {
        console.log("Create Room button found");
        createRoomBtn.addEventListener('click', createRoom);
    } else {
        console.error("Create Room button not found");
    }
    
    if (joinRoomOption) joinRoomOption.addEventListener('click', showJoinRoomSection);
    if (backToOptionsBtn) backToOptionsBtn.addEventListener('click', showInitialOptions);
    if (joinRoomBtn) joinRoomBtn.addEventListener('click', joinRoom);
    if (copyCodeBtn) copyCodeBtn.addEventListener('click', copyRoomCode);
    if (shareLink) shareLink.addEventListener('click', shareRoomLink);
    if (startButton) startButton.addEventListener('click', startGame);
}

// Initialize: Check URL for room code parameter
function initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCodeFromUrl = urlParams.get('room');
    
    if (roomCodeFromUrl) {
        roomCodeInput.value = roomCodeFromUrl;
        // Don't automatically join; just pre-fill the code and show join section
        showJoinRoomSection();
    }
}

// Show/Hide UI sections
function showInitialOptions() {
    initialOptions.classList.remove('hidden');
    joinRoomSection.classList.add('hidden');
    roomDetails.classList.add('hidden');
}

function showJoinRoomSection() {
    initialOptions.classList.add('hidden');
    joinRoomSection.classList.remove('hidden');
    roomDetails.classList.add('hidden');
}

function showRoomDetails() {
    initialOptions.classList.add('hidden');
    joinRoomSection.classList.add('hidden');
    roomDetails.classList.remove('hidden');
}

// Room Functions
function createRoom() {
    console.log("Create Room clicked");
    playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        alert("Please enter your name first!");
        return;
    }
    
    // For local testing without server:
    // Comment this section out when connecting to a real server
    const roomCode = generateRandomCode(6);
    currentRoomCode = roomCode;
    isRoomHost = true;
    roomCodeElement.textContent = roomCode;
    
    // Update URL with room code
    updateUrlWithRoomCode(roomCode);
    
    // Show room details section
    showRoomDetails();
    
    // Add the current player to the players list
    playerListElement.innerHTML = '';
    const playerItem = document.createElement('li');
    playerItem.textContent = `${playerName} (You, Host)`;
    playerItem.classList.add('font-bold');
    playerListElement.appendChild(playerItem);
    
    // Show start button (for host)
    startButton.classList.remove('hidden');
    
    console.log(`Room ${roomCode} created by ${playerName}`);
    
    /* 
    // Uncomment this section when using a real server:
    socket.emit('create_room', { playerName }, (response) => {
        if (response.success) {
            currentRoomCode = response.roomCode;
            isRoomHost = true;
            roomCodeElement.textContent = currentRoomCode;
            
            // Update URL with room code
            updateUrlWithRoomCode(currentRoomCode);
            
            showRoomDetails();
        } else {
            alert('Failed to create room: ' + response.message);
        }
    });
    */
}

function joinRoom() {
    playerName = playerNameInput.value.trim();
    const roomCode = roomCodeInput.value.trim();
    
    if (!playerName) {
        alert("Please enter your name first!");
        return;
    }
    
    if (!roomCode) {
        alert("Please enter a room code!");
        return;
    }
    
    // For local testing without server:
    alert(`Joining room ${roomCode} as ${playerName} - Feature not fully implemented yet`);
    
    /* 
    // Uncomment this section when using a real server:
    socket.emit('join_room', { playerName, roomCode }, (response) => {
        if (response.success) {
            currentRoomCode = roomCode;
            isRoomHost = false;
            roomCodeElement.textContent = currentRoomCode;
            
            // Update URL with room code
            updateUrlWithRoomCode(currentRoomCode);
            
            showRoomDetails();
        } else {
            alert('Failed to join room: ' + response.message);
        }
    });
    */
}

function updateUrlWithRoomCode(roomCode) {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    window.history.pushState({}, '', url);
}

function copyRoomCode() {
    const roomCode = roomCodeElement.textContent;
    navigator.clipboard.writeText(roomCode)
        .then(() => {
            const originalText = copyCodeBtn.textContent;
            copyCodeBtn.textContent = "Copied!";
            setTimeout(() => {
                copyCodeBtn.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
}

function shareRoomLink() {
    const roomUrl = window.location.href;
    
    // Use Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: 'Join my Word Impostor game',
            text: 'Join my room in Word Impostor!',
            url: roomUrl
        }).catch((error) => {
            console.error('Error sharing:', error);
            fallbackShare(roomUrl);
        });
    } else {
        fallbackShare(roomUrl);
    }
}

function fallbackShare(url) {
    // Fallback to copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
        alert('Game link copied to clipboard! Share it with your friends.');
    }).catch(() => {
        // Manual copy if clipboard API fails
        prompt('Copy this link to share with friends:', url);
    });
}

function startGame() {
    if (!isRoomHost) {
        alert('Only the host can start the game');
        return;
    }
    
    /* 
    // Uncomment this section when using a real server:
    socket.emit('start_game', { roomCode: currentRoomCode }, (response) => {
        if (!response.success) {
            alert('Failed to start game: ' + response.message);
        }
    });
    */
    
    // For local testing without server:
    alert('Starting the game... (Server functionality not implemented yet)');
}

// Socket.IO event listeners - Uncomment when using a real server
/*
socket.on('player_joined', (data) => {
    updatePlayerList(data.players);
    
    // Show start button for host if enough players
    if (isRoomHost && data.players.length >= 3) {
        startButton.classList.remove('hidden');
    }
});

socket.on('player_left', (data) => {
    updatePlayerList(data.players);
    
    // Hide start button if not enough players
    if (isRoomHost && data.players.length < 3) {
        startButton.classList.add('hidden');
    }
});

socket.on('game_started', (data) => {
    // Hide lobby and show game UI
    lobbyElement.classList.add('hidden');
    gameElement.classList.remove('hidden');
    
    // Initialize game with data
    initializeGame(data);
});
*/

// Update player list in lobby
function updatePlayerList(players) {
    playerListElement.innerHTML = '';
    players.forEach(player => {
        const listItem = document.createElement('li');
        listItem.textContent = player.name;
        if (player.isHost) {
            listItem.textContent += ' (Host)';
            listItem.classList.add('font-bold');
        }
        playerListElement.appendChild(listItem);
    });
}

// Game initialization (will be expanded later)
function initializeGame(gameData) {
    // Display the player's word
    document.getElementById('playerWord').textContent = gameData.word;
    document.getElementById('phaseIndicator').textContent = 'Description Phase';
    
    // More game initialization code will go here
    // ...
}

// Generate random alphanumeric code
function generateRandomCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Debug info
console.log("app.js loaded");
