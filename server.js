const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

// Word association database - each word has associated words
const wordAssociations = {
    "happy": ["joyful", "sad", "excited", "content"],
    "big": ["large", "small", "huge", "tiny"],
    "hot": ["warm", "cold", "burning", "chilly"],
    "fast": ["quick", "slow", "rapid", "sluggish"],
    "good": ["excellent", "bad", "wonderful", "terrible"],
    "dark": ["gloomy", "bright", "shadowy", "light"],
    "loud": ["noisy", "quiet", "deafening", "silent"],
    "soft": ["gentle", "hard", "fluffy", "rigid"],
    "strong": ["powerful", "weak", "mighty", "feeble"],
    "sweet": ["sugary", "sour", "saccharine", "bitter"]
};

let players = {};
let scores = {};
let gameStarted = false;
let currentWord = null;
let currentOptions = [];
let correctAnswer = null;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (name) => {
        players[socket.id] = { name };
        scores[socket.id] = 0;
        io.emit('updatePlayers', players);
    });

    socket.on('startGame', () => {
        if (Object.keys(players).length >= 2 && !gameStarted) {
            gameStarted = true;
            nextRound();
            io.emit('gameStarted');
        }
    });

    socket.on('wordSelected', (data) => {
        if (gameStarted && data.word === correctAnswer) {
            scores[data.playerId] = (scores[data.playerId] || 0) + 1;
            io.emit('updateScores', scores);
            nextRound();
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        delete scores[socket.id];
        io.emit('playerDisconnected', socket.id);
        io.emit('updatePlayers', players);
        if (Object.keys(players).length < 2) {
            gameStarted = false;
        }
    });

    // Function to set up the next round
    function nextRound() {
        // Select a random word as the current word
        const words = Object.keys(wordAssociations);
        currentWord = words[Math.floor(Math.random() * words.length)];
        
        // Get its associations
        const associations = wordAssociations[currentWord];
        
        // The first associated word is always the correct answer in our data structure
        correctAnswer = associations[0];
        
        // Shuffle the associations to display as options
        currentOptions = shuffle([...associations]);
        
        // Position options on the canvas
        const optionPositions = [];
        const canvasWidth = 800;
        const canvasHeight = 600;
        const radius = 70;
        
        // Generate non-overlapping positions for each option
        for (let i = 0; i < currentOptions.length; i++) {
            let validPosition = false;
            let newPos;
            
            while (!validPosition) {
                newPos = {
                    x: Math.random() * (canvasWidth - 2 * radius) + radius,
                    y: Math.random() * (canvasHeight - 2 * radius) + radius,
                    radius: radius
                };
                
                validPosition = true;
                
                // Check overlap with existing positions
                for (let j = 0; j < optionPositions.length; j++) {
                    const pos = optionPositions[j];
                    const distance = Math.sqrt(
                        Math.pow(newPos.x - pos.x, 2) + 
                        Math.pow(newPos.y - pos.y, 2)
                    );
                    
                    if (distance < 2.5 * radius) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            optionPositions.push(newPos);
        }
        
        // Send the new round data to all clients
        io.emit('newRound', {
            word: currentWord,
            options: currentOptions,
            positions: optionPositions
        });
    }
});

// Fisher-Yates shuffle algorithm
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

http.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});