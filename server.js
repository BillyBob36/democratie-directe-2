const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Stockage des votes en mémoire
const rooms = {};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/create-room', (req, res) => {
  const roomId = generateRoomId();
  rooms[roomId] = {
    votes: [],
    participants: []
  };
  res.json({ roomId });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté');

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    if (rooms[roomId]) {
      if (!rooms[roomId].participants.includes(userId)) {
        rooms[roomId].participants.push(userId);
      }
      // Envoyer les votes existants au nouvel utilisateur
      socket.emit('current-votes', rooms[roomId].votes);
      // Informer les autres participants
      socket.to(roomId).emit('user-joined', userId);
    }
  });

  socket.on('create-vote', (roomId, voteData) => {
    if (rooms[roomId]) {
      const voteId = Date.now().toString();
      const newVote = {
        id: voteId,
        question: voteData.question,
        options: voteData.options,
        createdBy: voteData.userId,
        votes: {},
        active: true
      };
      rooms[roomId].votes.push(newVote);
      io.to(roomId).emit('vote-created', newVote);
    }
  });

  socket.on('submit-vote', (roomId, voteId, userId, optionIndex) => {
    if (rooms[roomId]) {
      const vote = rooms[roomId].votes.find(v => v.id === voteId);
      if (vote && vote.active) {
        vote.votes[userId] = optionIndex;
        io.to(roomId).emit('vote-updated', vote);
      }
    }
  });

  socket.on('end-vote', (roomId, voteId) => {
    if (rooms[roomId]) {
      const vote = rooms[roomId].votes.find(v => v.id === voteId);
      if (vote) {
        vote.active = false;
        io.to(roomId).emit('vote-ended', vote);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté');
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Fonction pour générer un ID de salle aléatoire
function generateRoomId() {
  return Math.random().toString(36).substring(2, 10);
}
