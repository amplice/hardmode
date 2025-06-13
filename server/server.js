const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
import { generateWorld } from './worldDataManager.js';
import { PLAYER_CONFIG, MONSTER_CONFIG } from './GameConfig.js'; // Import game config

import { generateWorld } from './worldDataManager.js';
import { PLAYER_CONFIG, MONSTER_CONFIG } from './GameConfig.js';

const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Server-side world data
const worldConfig = { width: 100, height: 100, tileSize: 64 }; // Same as client for now
const worldData = generateWorld(worldConfig);
console.log(`Server: World generated with ${worldData.width}x${worldData.height} tiles.`);

const players = {}; // Data structure to store player states
const monsters = {}; // Data structure to store monster states
let nextMonsterId = 0;

const MONSTER_MOVE_SPEED = 2; // Example speed for monsters
const MONSTER_SPAWN_COUNT = 3;
const MONSTER_UPDATE_INTERVAL = 1000; // ms, how often monsters update and broadcast
const MONSTER_TYPES = ['goblin', 'skeleton', 'orc']; // Example types

// Simple Monster Spawning
function spawnMonster() {
  const id = `monster_${nextMonsterId++}`;
  const type = MONSTER_TYPES[Math.floor(Math.random() * MONSTER_TYPES.length)];
  // Spawn monsters in a central area for now
  const monster = {
    id: id,
    type: type,
    x: 300 + Math.floor(Math.random() * 200) - 100, // Example starting position
    y: 300 + Math.floor(Math.random() * 200) - 100,
    health: 100, // Default health
    maxHealth: 100,
    isMoving: false, // For client animation hint
    facing: 'down' // Default facing
  };
  monsters[id] = monster;
  console.log(`Spawned monster: ${id} (${type}) at ${monster.x},${monster.y}`);
}

// Spawn initial monsters
for (let i = 0; i < MONSTER_SPAWN_COUNT; i++) {
  spawnMonster();
}

// Server-side game loop for monsters
setInterval(() => {
  let updated = false;
  for (const id in monsters) {
    const monster = monsters[id];
    // Simple random movement for now
    const direction = Math.floor(Math.random() * 5); // 0: no move, 1: up, 2: down, 3: left, 4: right
    let moved = false;
    switch (direction) {
      case 1: monster.y -= MONSTER_MOVE_SPEED; monster.facing = 'up'; moved = true; break;
      case 2: monster.y += MONSTER_MOVE_SPEED; monster.facing = 'down'; moved = true; break;
      case 3: monster.x -= MONSTER_MOVE_SPEED; monster.facing = 'left'; moved = true; break;
      case 4: monster.x += MONSTER_MOVE_SPEED; monster.facing = 'right'; moved = true; break;
    }
    monster.isMoving = moved;
    // TODO: Add boundary checks for monster positions

    updated = true; // Assume at least one monster might have moved or state changed
  }

  if (updated || Object.keys(monsters).length > 0) { // Send update if monsters exist or moved
    io.emit('monsterUpdate', monsters);
  }
}, MONSTER_UPDATE_INTERVAL);


io.on('connection', (socket) => {
  console.log('A user connected:', socket.id, "- waiting for playerJoinDetails.");

  const joinTimeout = setTimeout(() => {
    if (!players[socket.id]) {
      console.log(`Socket ${socket.id} did not send playerJoinDetails in time. Disconnecting.`);
      socket.disconnect(true);
    }
  }, 5000); // 5 seconds to send details

  socket.on('playerJoinDetails', (details) => {
    clearTimeout(joinTimeout);

    // Basic Name Sanitization/Validation
    let playerName = (details.name || `Player_${socket.id.substring(0,5)}`).trim();
    playerName = playerName.substring(0, 15); // Max length
    // Basic character filter (allow letters, numbers, spaces, underscores, hyphens)
    playerName = playerName.replace(/[^a-zA-Z0-9 _-]/g, '') || `Player_${socket.id.substring(0,5)}`;


    const playerClass = details.class || 'bladedancer'; // Default class

    players[socket.id] = {
      id: socket.id,
      name: playerName,
      x: worldData.width / 2 * worldData.tileSize, // Start in middle of map
      y: worldData.height / 2 * worldData.tileSize,
      class: playerClass,
      lastPrimaryAttackTime: 0,
      lastSecondaryAttackTime: 0
    };
    console.log(`Player ${players[socket.id].name} (${socket.id}) joined with class ${playerClass}.`);

    // Send the current players object to the newly connected player
    socket.emit('currentPlayers', players);
    // Send current monsters to the newly connected player
    socket.emit('currentMonsters', monsters);
    // Send world data to the newly connected player
    socket.emit('worldData', worldData);

    // Broadcast the new player to all other connected players
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

  socket.on('disconnect', () => {
    const player = players[socket.id];
    if (player) {
        console.log(`Player ${player.name} (${socket.id}) disconnected.`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    } else {
        console.log(`Socket ${socket.id} (unidentified) disconnected.`);
    }
  });

  // Listen for playerInput event
  socket.on('playerInput', (inputPayload) => {
    const player = players[socket.id];
    if (!player) return;

    // TODO: Validate inputPayload and sequence number for anti-cheat / ordering

    const PLAYER_MOVE_SPEED = 5; // Define player movement speed on server
    let targetX = player.x;
    let targetY = player.y;

    if (inputPayload.keys.up) {
      targetY -= PLAYER_MOVE_SPEED;
    }
    if (inputPayload.keys.down) {
      targetY += PLAYER_MOVE_SPEED;
    }
    if (inputPayload.keys.left) {
      targetX -= PLAYER_MOVE_SPEED;
    }
    if (inputPayload.keys.right) {
      targetX += PLAYER_MOVE_SPEED;
    }

    // Server-side collision detection / position validation
    const targetTileX = Math.floor(targetX / worldData.tileSize);
    const targetTileY = Math.floor(targetY / worldData.tileSize);

    if (isWalkable(targetTileX, targetTileY, worldData)) {
      player.x = targetX;
      player.y = targetY;
    } else {
      // Optional: If movement was attempted but invalid, you might still update facing
      // or send a "movement_rejected" event if client needs to react specifically.
      // For now, player position simply doesn't change.
    }

    // Update facing direction
    if (inputPayload.facing) {
      player.facing = inputPayload.facing;
    }

    // Basic Attack Logic (Primary Attack)
    if (inputPayload.keys.primaryAttack) {
      const playerClass = player.class || 'bladedancer'; // Default if not set
      const attackName = playerClass + '_primary';
      const baseAttackName = 'primary';

      const baseAttackName = 'primary';

      let attackConfig = PLAYER_CONFIG.attacks[attackName];
      if (!attackConfig) {
        console.warn(`No specific primary attack for ${playerClass}, using default ${baseAttackName}`);
        attackConfig = PLAYER_CONFIG.attacks[baseAttackName];
      }

      if (attackConfig) {
        const cooldown = attackConfig.cooldown || 500; // Default cooldown if not specified in ms
        const now = Date.now();

        if (now - player.lastPrimaryAttackTime >= cooldown) {
          player.lastPrimaryAttackTime = now; // Update last attack time

          console.log(`Player ${socket.id} (${playerClass}) used ${attackConfig.name || 'primary attack'}.`);
          io.emit('playerAttackUsed', { playerId: socket.id, attackType: 'primary', class: playerClass });

          // Use attackConfig properties for range, damage etc.
          const attackRange = attackConfig.hitboxParams?.range || attackConfig.hitboxParams?.length || 50;
          const attackDamage = attackConfig.damage || 1;

          for (const monsterId in monsters) {
            const monster = monsters[monsterId];
            const dx = monster.x - player.x;
            const dy = monster.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= attackRange) {
              console.log(`Player ${socket.id} hit monster ${monsterId} with ${attackConfig.name}`);
              monster.health -= attackDamage;

              if (monster.health <= 0) {
                console.log(`Monster ${monsterId} defeated by ${socket.id}`);
                delete monsters[monsterId];
                io.emit('monsterDied', { monsterId: monsterId, killerId: socket.id });
              } else {
                console.log(`Monster ${monsterId} health: ${monster.health}`);
                io.emit('monsterDamaged', { monsterId: monsterId, newHealth: monster.health, attackerId: socket.id });
              }
            }
          }
        } else {
          // console.log(`Player ${socket.id} primary attack on cooldown.`);
        }
      } else {
        console.error(`Server: Attack configuration not found for ${playerClass} primary or default ${baseAttackName}.`);
      }
    }
    // TODO: Handle secondaryAttack similarly using player.lastSecondaryAttackTime

    // TODO: Add boundary checks for player position (e.g., map limits)

    // Broadcast the updated player state to all clients
    io.emit('playerMoved', {
      id: socket.id,
      x: player.x,
      y: player.y,
      facing: player.facing, // Include facing direction
      // isMoving: (inputPayload.keys.up || inputPayload.keys.down || inputPayload.keys.left || inputPayload.keys.right)
    });
  });

  // Listen for chat messages
  socket.on('chatMessageSent', (data) => {
    const sender = players[socket.id];
    if (sender && data.message) {
      let messageContent = data.message.trim(); // Trim whitespace
      messageContent = messageContent.substring(0, 200); // Limit message length

      // Basic profanity filter (example - can be expanded or made more sophisticated)
      // const badWords = ['examplebadword', 'anotherone'];
      // badWords.forEach(word => {
      //   const regex = new RegExp(word, 'gi');
      //   messageContent = messageContent.replace(regex, '*'.repeat(word.length));
      // });

      console.log(`[CHAT] ${sender.name}: ${messageContent}`);
      io.emit('chatMessageReceived', {
        senderName: sender.name,
        message: messageContent
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
