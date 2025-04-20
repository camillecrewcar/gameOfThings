const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

const lobbies = {};
const wordPairs = [
    { common: 'Apple', impostor: 'Pear' },
    { common: 'Car', impostor: 'Truck' },
    { common: 'Dog', impostor: 'Cat' },
    { common: 'House', impostor: 'Apartment' },
    { common: 'Book', impostor: 'Magazine' }
];

function generateLobbyCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('createLobby', (name) => {
        const code = generateLobbyCode();
        lobbies[code] = {
            players: { [socket.id]: { name, word: null } },
            gameStarted: false,
            descriptions: [],
            votes: {},
            round: 0
        };
        socket.join(code);
        socket.emit('lobbyCreated', { code, players: lobbies[code].players });
    });

    socket.on('joinLobby', ({ name, code }) => {
        if (!lobbies[code]) {
            socket.emit('error', 'Invalid lobby code');
            return;
        }
        if (lobbies[code].gameStarted) {
            socket.emit('error', 'Game already started');
            return;
        }
        lobbies[code].players[socket.id] = { name, word: null };
        socket.join(code);
        socket.emit('lobbyJoined', { code, players: lobbies[code].players });
        io.to(code).emit('updatePlayers', { players: lobbies[code].players });
    });

    socket.on('startGame', (code) => {
        if (!lobbies[code] || lobbies[code].gameStarted) return;
        const playerCount = Object.keys(lobbies[code].players).length;
        if (playerCount < 4) {
            socket.emit('error', 'Need at least 4 players to start');
            return;
        }
        lobbies[code].gameStarted = true;
        assignWords(code);
        io.to(code).emit('gameStarted', { word: null, round: lobbies[code].round });
        Object.keys(lobbies[code].players).forEach((id) => {
            io.to(id).emit('gameStarted', { 
                word: lobbies[code].players[id].word,
                round: lobbies[code].round 
            });
        });
    });

    socket.on('submitDescription', ({ lobbyCode, description }) => {
        if (!lobbies[lobbyCode] || !lobbies[lobbyCode].gameStarted) return;
        
        // Check if player is kicked
        if (lobbies[lobbyCode].players[socket.id]?.kicked) {
            socket.emit('error', 'You have been kicked and cannot submit descriptions');
            return;
        }
        
        lobbies[lobbyCode].descriptions.push({
            playerId: socket.id,
            name: lobbies[lobbyCode].players[socket.id].name,
            description
        });
        
        // Only count active (non-kicked) players for description submissions
        const activePlayerCount = Object.keys(lobbies[lobbyCode].players).filter(
            id => !lobbies[lobbyCode].players[id].kicked
        ).length;
        
        if (lobbies[lobbyCode].descriptions.length === activePlayerCount) {
            io.to(lobbyCode).emit('descriptionsSubmitted', { descriptions: lobbies[lobbyCode].descriptions });
        }
    });

    socket.on('submitVote', ({ lobbyCode, votedId }) => {
        if (!lobbies[lobbyCode] || !lobbies[lobbyCode].gameStarted) return;
        lobbies[lobbyCode].votes[socket.id] = votedId;
        if (Object.keys(lobbies[lobbyCode].votes).length === Object.keys(lobbies[lobbyCode].players).length) {
            const voteCounts = {};
            for (let voter in lobbies[lobbyCode].votes) {
                const votedId = lobbies[lobbyCode].votes[voter];
                voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
            }
            let maxVotes = 0;
            let kickedId = null;
            for (let id in voteCounts) {
                if (voteCounts[id] > maxVotes) {
                    maxVotes = voteCounts[id];
                    kickedId = id;
                }
            }
            const kickedName = lobbies[lobbyCode].players[kickedId].name;
            
            // Mark the player as kicked instead of removing them
            lobbies[lobbyCode].players[kickedId].kicked = true;
            
            io.to(kickedId).emit('gameOver', { message: 'You were kicked!' });
            io.to(lobbyCode).emit('playerKicked', { 
                name: kickedName, 
                kickedId: kickedId 
            });
            checkGameOver(lobbyCode);
        }
    });

    socket.on('nextRound', (code) => {
        if (!lobbies[code] || !lobbies[code].gameStarted) return;
        lobbies[code].descriptions = [];
        lobbies[code].votes = {};
        lobbies[code].round++;
        io.to(code).emit('gameStarted', { word: null, round: lobbies[code].round });
        Object.keys(lobbies[code].players).forEach((id) => {
            io.to(id).emit('gameStarted', { 
                word: lobbies[code].players[id].word,
                round: lobbies[code].round 
            });
        });
    });

    socket.on('returnToLobby', (code) => {
        if (!lobbies[code]) return;
        lobbies[code].gameStarted = false;
        lobbies[code].descriptions = [];
        lobbies[code].votes = {};
        lobbies[code].round = 0;
        for (let id in lobbies[code].players) {
            lobbies[code].players[id].word = null;
            lobbies[code].players[id].kicked = false; // Reset kicked status
        }
        io.to(code).emit('updatePlayers', { players: lobbies[code].players });
    });

    socket.on('disconnect', () => {
        for (let code in lobbies) {
            if (lobbies[code].players[socket.id]) {
                delete lobbies[code].players[socket.id];
                io.to(code).emit('updatePlayers', { players: lobbies[code].players });
                if (lobbies[code].gameStarted) {
                    checkGameOver(code);
                }
                if (Object.keys(lobbies[code].players).length === 0) {
                    delete lobbies[code];
                }
            }
        }
    });

    function assignWords(code) {
        const players = Object.keys(lobbies[code].players);
        const impostorCount = Math.floor(players.length * 0.25) || 1;
        const impostors = players.sort(() => Math.random() - 0.5).slice(0, impostorCount);
        const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
        for (let id of players) {
            lobbies[code].players[id].word = impostors.includes(id) ? wordPair.impostor : wordPair.common;
        }
    }

    function checkGameOver(code) {
        // Only count active (non-kicked) players
        const activePlayers = Object.keys(lobbies[code].players).filter(
            id => !lobbies[code].players[id].kicked
        );
        
        if (activePlayers.length <= 2) {
            io.to(code).emit('gameOver', { message: 'Game over! Too few players remain.' });
            lobbies[code].gameStarted = false;
            return;
        }
        
        let impostorCount = 0;
        let commonWord = null;
        
        // Find the common word among active players
        for (let id of activePlayers) {
            if (!commonWord) {
                commonWord = lobbies[code].players[id].word;
                continue;
            }
            
            if (lobbies[code].players[id].word !== commonWord) {
                // If we find a different word, it's an impostor word
                impostorCount++;
            }
        }
        
        if (impostorCount === 0) {
            io.to(code).emit('gameOver', { message: 'Regular players win! All impostors eliminated.' });
            lobbies[code].gameStarted = false;
        } else if (impostorCount >= activePlayers.length - impostorCount) {
            io.to(code).emit('gameOver', { message: 'Impostors win!' });
            lobbies[code].gameStarted = false;
        }
    }
});

http.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});