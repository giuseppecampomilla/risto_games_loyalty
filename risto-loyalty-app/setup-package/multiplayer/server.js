const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');

// Configurazioni per integrazione WordPress
const WP_API_URL = process.env.WP_API_URL || 'https://soundframes.netsons.org/wp-json/risto-loyalty/v1';
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6';

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-API-Secret");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Variabile globale per il tipo di gioco multiplayer (in futuro dinamica da backend)
let GAME_TYPE = 'TOTEM';

// Cache impostazioni WP
let wpSettings = {
  multiplayerWinBonus: 500,
  multiplayerClickMultiplier: 10,
  multiplayerTargetClicks: 60,
  multiplayerGameType: 'TOTEM'
};

async function fetchWPSettings() {
  try {
    const response = await axios.get(`${WP_API_URL}/config/`, {
      headers: { 'X-API-Secret': API_SECRET_KEY }
    });
    if (response.data) {
      // Cast obbligatorio a Number per evitare concatenazioni (es. "0" + "10")
      wpSettings.multiplayerWinBonus = Number(response.data.multiplayer_win_bonus || 500);
      wpSettings.multiplayerClickMultiplier = Number(response.data.multiplayer_click_multiplier || 10);
      wpSettings.multiplayerTargetClicks = Number(response.data.multiplayer_target_clicks || 60);
      
      // Predisposizione per la lettura del tipo di gioco multiplayer da WordPress
      wpSettings.multiplayerGameType = response.data.multiplayer_game_type || 'TOTEM';
      GAME_TYPE = wpSettings.multiplayerGameType;
      
      console.log(`✅ Parametri ricevuti da WP: Bonus ${wpSettings.multiplayerWinBonus}, Moltiplicatore ${wpSettings.multiplayerClickMultiplier}, Target Clicks ${wpSettings.multiplayerTargetClicks}, Tipo Gioco ${GAME_TYPE}`);
    }
  } catch (error) {
    console.warn('⚠️ Impossibile recuperare impostazioni da WP, uso i default:', error.message);
  }
}

// Carica impostazioni all'avvio
fetchWPSettings();
// Rinfresca ogni 5 minuti
setInterval(fetchWPSettings, 5 * 60 * 1000);

// DB Connection
const MONGO_URI = 'mongodb://127.0.0.1:27017/multiplayerDB';
let dbStatus = 'Connessione in corso...';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connesso');
    dbStatus = 'OK';
  })
  .catch(err => {
    console.error('Errore MongoDB:', err);
    dbStatus = 'Errore';
  });

const challengeSchema = new mongoose.Schema({
  player1_email: String,
  player2_email: String,
  score1: Number,
  score2: Number,
  participants: [{ email: String, score: Number }],
  status: String,
  winner_email: String,
  date: { type: Date, default: Date.now }
});

const Challenge = mongoose.model('Challenge', challengeSchema);

async function updateWordPressPoints(email, points) {
  if (!points || points <= 0 || !email) return 0;
  
  try {
    // 1. Invia i nuovi punti
    await axios.post(`${WP_API_URL}/update-points/`, {
      email: email,
      points: points
    }, {
      headers: { 'X-API-Secret': API_SECRET_KEY }
    });

    // 2. Recupera il saldo aggiornato
    const response = await axios.get(`${WP_API_URL}/user-data`, {
        params: { email },
        headers: { 'X-API-Secret': API_SECRET_KEY }
    });

    if (response.data && response.data.user) {
        // Il nuovo endpoint restituisce user.punti_totali
        return response.data.user.punti_totali || response.data.user.punti || 0;
    }
    return 0;
  } catch (error) {
    console.error(`Errore chiamata WP (punti) per ${email}:`, error.message);
    if (error.response) {
        console.error('Dettagli errore WP (punti):', JSON.stringify(error.response.data));
    }
    return 0;
  }
}

// Rotta per Storico Partite (Dashboard WordPress)
app.get('/api/user-history/:email', async (req, res) => {
  const secret = req.headers['x-api-secret'];
  if (secret !== API_SECRET_KEY) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  const { email } = req.params;

  try {
    const challenges = await Challenge.find({
      $or: [
        { player1_email: email }, 
        { player2_email: email },
        { 'participants.email': email }
      ],
      status: 'finished'
    }).sort({ date: -1 });

    const history = challenges.map(c => {
      let opponent = 'Multigiocatore';
      let userScore = 0;
      let opponentScore = 0;
      let result;

      if (c.participants && c.participants.length > 0) {
        // Nuova logica N giocatori
        const me = c.participants.find(p => p.email === email);
        userScore = me ? me.score : 0;
        opponentScore = c.participants.filter(p => p.email !== email).map(p => p.score).join('-');
        opponent = `Stanza (${c.participants.length} Giocatori)`;
      } else {
        // Vecchia logica 2 giocatori
        if (c.player1_email === email) {
          opponent = c.player2_email;
          userScore = c.score1;
          opponentScore = c.score2;
        } else {
          opponent = c.player1_email;
          userScore = c.score2;
          opponentScore = c.score1;
        }
      }

      if (c.winner_email === email) {
        result = 'vittoria';
      } else if (c.winner_email === 'pareggio') {
        result = 'pareggio';
      } else {
        result = 'sconfitta';
      }

      return {
        date: c.date,
        opponent,
        score: c.participants && c.participants.length > 0 ? `${userScore} pt` : `${userScore}-${opponentScore}`,
        result
      };
    });

    res.json(history);
  } catch (error) {
    console.error('Errore recupero storico:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

let lobbyQueue = [];
let lobbyTimer = null;
const rooms = {};

io.on('connection', (socket) => {
  console.log('Giocatore Connesso:', socket.id);
  
  socket.emit('sys-status', { db: dbStatus, wp: 'In attesa' });

  socket.on('register', async (data) => {
    let email = typeof data === 'string' ? data : data?.email;
    let avatar = typeof data === 'object' ? data?.avatar : '👤';

    if (!email) {
        socket.emit('auth-error', 'Email mancante o nulla.');
        return;
    }

    try {
        socket.emit('sys-status', { wp: 'Verifica in corso...' });
        
        // Auth Check su WordPress
        const verifyUrl = `${WP_API_URL}/verify-user/?email=${encodeURIComponent(email)}&api_secret=${API_SECRET_KEY}`;
        console.log('🔍 Chiamata a:', verifyUrl);
        await axios.get(verifyUrl, {
            headers: {
                'X-API-Secret': API_SECRET_KEY,
                'User-Agent':   'Mozilla/5.0 (RistoMultiplayer/1.0)'
            }
        });
        
        socket.emit('sys-status', { wp: 'Utente Verificato' });

        socket.email = email;
        socket.avatar = avatar || '👤';
        
        // Aggiungi alla lobby se non è già presente
        if (!lobbyQueue.find(s => s.id === socket.id)) {
          lobbyQueue.push(socket);
        }

        if (lobbyQueue.length >= 2) {
          if (!lobbyTimer) {
            let countdown = 10;
            lobbyQueue.forEach(s => s.emit('lobby-countdown', countdown));
            
            lobbyTimer = setInterval(() => {
              countdown--;
              lobbyQueue.forEach(s => s.emit('lobby-countdown', countdown));

              if (countdown <= 0) {
                clearInterval(lobbyTimer);
                lobbyTimer = null;
                
                const roomId = `room_${Date.now()}`;
                rooms[roomId] = {
                  players: {},
                  status: 'countdown'
                };

                lobbyQueue.forEach(s => {
                  s.join(roomId);
                  s.roomId = roomId;
                  rooms[roomId].players[s.id] = { score: 0, email: s.email, avatar: s.avatar };
                });

                const playersList = Object.keys(rooms[roomId].players);
                
                io.to(roomId).emit('match-found', { 
                  roomId, 
                  players: playersList,
                  settings: wpSettings 
                });

                // Reset lobby per i prossimi
                lobbyQueue = [];

                // Countdown finale prima del via (3 secondi)
                let startCountdown = 3;
                const countInterval = setInterval(() => {
                  io.to(roomId).emit('countdown', startCountdown);
                  if (startCountdown === 0) {
                    clearInterval(countInterval);
                    startGame(roomId);
                  }
                  startCountdown--;
                }, 1000);
              }
            }, 1000);
          } else {
            // Unisciti a un timer in corso, non far nulla di speciale se non mandargli l'evento dal prossimo tick
          }
        } else {
          socket.emit('waiting', 'In attesa di altri giocatori... (1 collegato)');
        }
        
    } catch (error) {
        console.error('Errore Auth Check WP:', error.message);
        if (error.response) {
            console.error('Dettagli errore Auth WP:', JSON.stringify(error.response.data));
        }
        socket.emit('auth-error', 'Utente non trovato su WordPress o errore di rete.');
        socket.emit('sys-status', { wp: 'Errore Verifica' });
    }
  });

  socket.on('totem-click', (clickedColor) => {
    const roomId = socket.roomId;
    const room = rooms[roomId];
    if (roomId && room && room.status === 'playing' && room.gameType === 'TOTEM') {
      const currentBlockIndex = room.currentBlockIndex;
      const expectedColor = room.totemSequence[currentBlockIndex];
      
      // Verifica stretta per evitare race conditions multi-client
      if (clickedColor === expectedColor) {
         // Aggiorna il colore così altri click concorrenti verranno ignorati
         room.currentBlockIndex++;
         
         // Punto per il giocatore che ha cliccato bene
         const player = room.players[socket.id];
         player.score += Number(wpSettings.multiplayerClickMultiplier || 10);
         
         // Aggiorna lo stato della stanza e manda il nuovo punteggio a tutti
         io.to(roomId).emit('score-update', room.players);
         
         if (room.currentBlockIndex >= (wpSettings.multiplayerTargetClicks || 60)) {
            // Totem abbattuto, fine partita
            endGame(roomId);
         } else {
            // Prossimo blocco
            setTimeout(() => {
               if (rooms[roomId] && rooms[roomId].status === 'playing') {
                  io.to(roomId).emit('next-block', room.totemSequence[room.currentBlockIndex]);
               }
            }, 300); // Piccola pausa prima del prossimo blocco
         }
      } else {
         // Penalità? Per ora nessuna, solo feedback locale gestito dal frontend
      }
    }
  });

  socket.on('squirrel-click', (color) => {
    const roomId = socket.roomId;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing' || room.gameType !== 'SQUIRREL') return;
    
    // Se ha cliccato il colore giusto in quel momento
    if (room.currentSquirrelColor && color === room.currentSquirrelColor) {
       clearTimeout(room.squirrelTimeout);
       room.currentSquirrelColor = null; // Evita doppi click
       
       if (room.currentTargetType === 'bomb') {
          // Penalità: Bomba!
          socket.emit('squirrel-penalty', { duration: 3000, reason: 'bomb' });
          io.to(roomId).emit('hide-squirrel');
          room.squirrelTimeout = setTimeout(() => emitSquirrel(roomId), Math.random() * 1000 + 500);
       } else {
          // Punto per il giocatore
          const player = room.players[socket.id];
          player.score += Number(wpSettings.multiplayerClickMultiplier || 10);
          room.squirrelHits = (room.squirrelHits || 0) + 1;
          
          io.to(roomId).emit('score-update', room.players);
          io.to(roomId).emit('hide-squirrel');
          
          if (room.squirrelHits >= (wpSettings.multiplayerTargetClicks || 60)) {
             endGame(roomId);
          } else {
             room.squirrelTimeout = setTimeout(() => emitSquirrel(roomId), Math.random() * 1000 + 500);
          }
       }
    } else {
       // Wrong color
       socket.emit('squirrel-penalty', { duration: 1000, reason: 'wrong_color' });
    }
  });
  socket.on('disconnect', () => {
    console.log('Giocatore Disconnesso:', socket.id);
    
    const lobbyIndex = lobbyQueue.findIndex(s => s.id === socket.id);
    if (lobbyIndex !== -1) {
      lobbyQueue.splice(lobbyIndex, 1);
      // Se scendiamo sotto i 2 giocatori e c'è il timer, lo annulliamo
      if (lobbyQueue.length < 2 && lobbyTimer) {
        clearInterval(lobbyTimer);
        lobbyTimer = null;
        lobbyQueue.forEach(s => s.emit('waiting', 'Avversario disconnesso. In attesa... (1 collegato)'));
      }
    }
    
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      io.to(roomId).emit('opponent-disconnected');
      delete rooms[roomId];
    }
  });
});

function startGame(roomId) {
  if(!rooms[roomId]) return;
  
  const room = rooms[roomId];
  room.status = 'playing';
  
  // Scelta casuale del gioco se non forzata
  room.gameType = Math.random() > 0.5 ? 'TOTEM' : 'SQUIRREL';

  io.to(roomId).emit('game-start', { gameType: room.gameType });

  if (room.gameType === 'TOTEM') {
      const COLORS = ['green', 'blue', 'yellow', 'red'];
      const targetLen = Number(wpSettings.multiplayerTargetClicks || 60);
      room.totemSequence = Array.from({length: targetLen}, () => COLORS[Math.floor(Math.random() * COLORS.length)]);
      room.currentBlockIndex = 0;

      setTimeout(() => {
          if(rooms[roomId] && rooms[roomId].status === 'playing') {
              io.to(roomId).emit('next-block', room.totemSequence[0]);
          }
      }, 1000);
  } else if (room.gameType === 'SQUIRREL') {
      room.squirrelHits = 0;
      setTimeout(() => emitSquirrel(roomId), 1000);
  }
}

function emitSquirrel(roomId) {
  const room = rooms[roomId];
  if (!room || room.status !== 'playing' || room.gameType !== 'SQUIRREL') return;

  const COLORS = ['green', 'blue', 'yellow', 'red'];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const isBomb = Math.random() < 0.1; // 10% chance di bomba
  const type = isBomb ? 'bomb' : 'squirrel';
  
  room.currentSquirrelColor = color;
  room.currentTargetType = type;
  
  io.to(roomId).emit('next-squirrel', { color, type });

  // Auto-hide dopo 2 secondi se nessuno lo prende
  if (room.squirrelTimeout) clearTimeout(room.squirrelTimeout);
  room.squirrelTimeout = setTimeout(() => {
     if (rooms[roomId] && rooms[roomId].status === 'playing') {
        io.to(roomId).emit('hide-squirrel');
        room.currentSquirrelColor = null;
        // Spawna il prossimo dopo pausa random
        room.squirrelTimeout = setTimeout(() => emitSquirrel(roomId), Math.random() * 1000 + 500);
     }
  }, 2000);
}

async function endGame(roomId) {
    const room = rooms[roomId];
    if(!room || room.status !== 'playing') return;
    
    room.status = 'finished';
    if (room.squirrelTimeout) clearTimeout(room.squirrelTimeout);
    const players = Object.keys(room.players);
    
    let maxScore = -1;
    let winnerId = null;
    let isDraw = false;

    // Trova il punteggio massimo
    for (let id of players) {
        const pScore = room.players[id].score;
        if (pScore > maxScore) {
            maxScore = pScore;
            winnerId = id;
            isDraw = false;
        } else if (pScore === maxScore) {
            isDraw = true;
        }
    }

    if (isDraw) {
        winnerId = null;
    }

    const winnerEmail = winnerId ? room.players[winnerId].email : 'pareggio';

    // Calcolo punti fedeltà finali
    const loyaltyPoints = {};
    const participantsData = [];
    
    for (let id of players) {
        let pts = room.players[id].score;
        if (id === winnerId) {
            pts += Number(wpSettings.multiplayerWinBonus || 0);
        }
        loyaltyPoints[id] = pts;
        participantsData.push({
            email: room.players[id].email,
            score: pts // Registriamo nello storico i punti base
        });
    }

    const totalBalances = {};

    // Salvataggio su MongoDB e WP
    try {
        const nuovaSfida = new Challenge({
            participants: participantsData,
            status: 'finished',
            winner_email: winnerEmail
        });
        await nuovaSfida.save();
        
        // Invia Punti a WP per tutti i partecipanti contemporaneamente
        const wpPromises = players.map(id => updateWordPressPoints(room.players[id].email, loyaltyPoints[id]));
        const results = await Promise.all(wpPromises);
        
        players.forEach((id, index) => {
            totalBalances[id] = results[index];
        });

        io.to(roomId).emit('sys-status', { wp: 'Sincronizzato' });
        console.log(`Sfida Multipla salvata su Mongo (${players.length} giocatori) e inviata a WordPress!`);
    } catch (err) {
        console.error('Errore salvataggio DB:', err);
        io.to(roomId).emit('sys-status', { wp: 'Errore' });
    }

    io.to(roomId).emit('game-over', {
      winner: winnerId,
      scores: room.players,
      loyaltyPoints: loyaltyPoints,
      totalBalances: totalBalances
    });
    
    delete rooms[roomId];
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
