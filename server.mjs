import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Minecraft-themed Game State Logic stored on Server
const words = [
    "SWORD", "PICKAXE", "DIRT", "WOOD", "DIAMOND", "APPLE", "IRON", "GOLD", 
    "STONE", "CRAFT", "FURNACE", "CHEST", "POTION", "BLOCK", "MINING",
    "CAVE", "TORCH", "LAVA", "WATER", "OBSIDIAN", "PORTAL", "ARMOR"
];

const levels = [
    { name: "Slime", emoji: "🟩", maxHp: 100, attack: 5, speed: 4000, reward: { gold: 10, xp: 15 } },
    { name: "Spider", emoji: "🕷️", maxHp: 150, attack: 8, speed: 3500, reward: { gold: 15, xp: 25 } },
    { name: "Skeleton", emoji: "💀", maxHp: 200, attack: 12, speed: 3000, reward: { gold: 20, xp: 40 } },
    { name: "Zombie", emoji: "🧟", maxHp: 300, attack: 15, speed: 2500, reward: { gold: 30, xp: 60 } },
    { name: "Creeper", emoji: "💣", maxHp: 200, attack: 40, speed: 2000, reward: { gold: 50, xp: 100 } },
    { name: "Ender Dragon", emoji: "🐉", maxHp: 1500, attack: 25, speed: 1500, reward: { gold: 500, xp: 1000 }, isBoss: true }
];

const lobbies = {}; // lobbyId -> { status, levelId, monster, currentWord, players, attackTimer }

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server);

  function pickNewWord(lobbyId) {
      const lobby = lobbies[lobbyId];
      if (!lobby) return;
      lobby.currentWord = words[Math.floor(Math.random() * words.length)];
      io.to(lobbyId).emit('new_word', lobby.currentWord);
  }

  function spawnMonster(lobbyId) {
      const lobby = lobbies[lobbyId];
      if (!lobby) return;

      if (lobby.levelId >= levels.length) {
          lobby.status = 'win';
          io.to(lobbyId).emit('game_win');
          return;
      }
      
      const template = levels[lobby.levelId];
      lobby.monster = { ...template, hp: template.maxHp };
      
      io.to(lobbyId).emit('spawn_monster', lobby.monster);
      pickNewWord(lobbyId);
      
      startAttackTimer(lobbyId);
  }

  function startAttackTimer(lobbyId) {
      const lobby = lobbies[lobbyId];
      if (!lobby || !lobby.monster || lobby.status !== 'playing') return;
      if (lobby.attackTimer) clearTimeout(lobby.attackTimer);
      
      lobby.attackTimer = setTimeout(() => {
          io.to(lobbyId).emit('monster_attack', lobby.monster.attack);
          startAttackTimer(lobbyId);
      }, lobby.monster.speed);
  }

  async function defeatMonster(lobbyId) {
      const lobby = lobbies[lobbyId];
      if (!lobby) return;
      if (lobby.attackTimer) clearTimeout(lobby.attackTimer);
      
      const reward = lobby.monster.reward;
      
      // Update Prisma users
      for (const p of Object.values(lobby.players)) {
          if (p.isAlive && p.dbId) {
              try {
                  const dbUser = await prisma.user.findUnique({ where: { id: p.dbId } });
                  if (dbUser) {
                      const newXp = dbUser.xp + reward.xp;
                      const nextLevelXp = Math.floor(100 * Math.pow(1.5, dbUser.level - 1));
                      let newLevel = dbUser.level;
                      if (newXp >= nextLevelXp) {
                          newLevel++;
                      }
                      
                      await prisma.user.update({
                          where: { id: p.dbId },
                          data: { 
                              xp: newXp, 
                              level: newLevel 
                          }
                      });
                      
                      p.level = newLevel;
                      p.xp = newXp;
                  }
              } catch (e) { console.error("Prisma Error:", e); }
          }
      }

      io.to(lobbyId).emit('monster_defeated', { name: lobby.monster.name, reward, players: lobby.players });
      lobby.monster = null;
      lobby.levelId++;
      
      setTimeout(() => {
          if (lobby.status === 'playing') {
              spawnMonster(lobbyId);
          }
      }, 2000);
  }

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let socketLobby = null;

    // Lobby System
    socket.on('join_lobby', async ({ lobbyId, username }) => {
        socketLobby = lobbyId;
        socket.join(lobbyId);
        
        if (!lobbies[lobbyId]) {
            lobbies[lobbyId] = { status: 'waiting', levelId: 0, monster: null, currentWord: "", players: {}, attackTimer: null };
        }
        const lobby = lobbies[lobbyId];
        
        // Fetch DB data
        let userData = { level: 1, xp: 0, dbId: null };
        if (username) {
            try {
                const dbUser = await prisma.user.findUnique({ where: { username } });
                if (dbUser) {
                    userData = { level: dbUser.level, xp: dbUser.xp, dbId: dbUser.id };
                }
            } catch(e) {}
        }

        lobby.players[socket.id] = { id: socket.id, name: username || 'Player', isAlive: true, ...userData };
        
        console.log(`Socket ${socket.id} joined lobby ${lobbyId}`);
        io.to(lobbyId).emit('update_players', Object.values(lobby.players));
        
        socket.emit('game_sync', {
            status: lobby.status,
            monster: lobby.monster,
            currentWord: lobby.currentWord,
            levelId: lobby.levelId,
            playerData: lobby.players[socket.id]
        });
    });

    socket.on('start_game', (lobbyId) => {
        const lobby = lobbies[lobbyId];
        if (lobby && lobby.status !== 'playing') {
            lobby.status = 'playing';
            lobby.levelId = 0;
            io.to(lobbyId).emit('game_started');
            spawnMonster(lobbyId);
        }
    });

    socket.on('player_attack', ({ lobbyId, word, damage, attacker }) => {
        const lobby = lobbies[lobbyId];
        if (lobby && lobby.status === 'playing' && lobby.monster && word === lobby.currentWord) {
            lobby.monster.hp -= damage;
            io.to(lobbyId).emit('monster_damaged', { 
                hp: lobby.monster.hp, maxHp: lobby.monster.maxHp, attacker, damage 
            });
            if (lobby.monster.hp <= 0) {
                defeatMonster(lobbyId);
            } else {
                pickNewWord(lobbyId);
            }
        }
    });

    socket.on('lobby_chat', (data) => {
        io.to(data.lobbyId).emit('lobby_chat', data);
    });

    // WebRTC VC
    socket.on('webrtc_offer', (data) => socket.to(data.target).emit('webrtc_offer', { sdp: data.sdp, sender: socket.id }));
    socket.on('webrtc_answer', (data) => socket.to(data.target).emit('webrtc_answer', { sdp: data.sdp, sender: socket.id }));
    socket.on('webrtc_ice_candidate', (data) => socket.to(data.target).emit('webrtc_ice_candidate', { candidate: data.candidate, sender: socket.id }));

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        io.emit('peer_disconnected', socket.id);
        if (socketLobby && lobbies[socketLobby]) {
            delete lobbies[socketLobby].players[socket.id];
            io.to(socketLobby).emit('update_players', Object.values(lobbies[socketLobby].players));
        }
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
