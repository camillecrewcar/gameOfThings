// Game state and logic

// Game state object
export const gameState = {
    playerId: null,
    playerName: '',
    players: {},
    scores: {},
    gameStarted: false,
    currentWord: '',
    currentPhase: 'waiting', // waiting, describing, voting, results
    playerDescription: '',
    hasVoted: false,
    myVote: null,
    impostors: [], // IDs of impostor players
    timerInterval: null,
    
    // Initialize the game state
    init() {
        // Reset all game state variables to their default values
        this.playerId = null;
        this.playerName = '';
        this.players = {};
        this.scores = {};
        this.gameStarted = false;
        this.currentWord = '';
        this.currentPhase = 'waiting';
        this.playerDescription = '';
        this.hasVoted = false;
        this.myVote = null;
        this.impostors = [];
        this.clearTimer();
    },
    
    // Set the current game phase
    setPhase(phase) {
        this.currentPhase = phase;
        return this.currentPhase;
    },
    
    // Clear the active timer
    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },
    
    // Update players data
    updatePlayers(playerData) {
        this.players = playerData;
    },
    
    // Update scores data
    updateScores(scoreData) {
        this.scores = scoreData;
    },
    
    // Set the current word
    setWord(word) {
        this.currentWord = word;
    },
    
    // Reset for new round
    prepareForNewRound() {
        this.playerDescription = '';
        this.hasVoted = false;
        this.myVote = null;
    }
};

// Fallback data for testing
export const fallbackData = {
    word: "cat",
    timeLimit: 60,
    playerRole: "regular", // or "impostor"
    mockDescriptions: {
        'player1': 'It is a small four-legged animal',
        'player2': 'It makes a meow sound',
        'player3': 'It hunts mice'
    }
};
