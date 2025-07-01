import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { GAME_CONSTANTS } from '../shared/constants/GameConstants.js';
import { GameStateManager } from './managers/GameStateManager.js';
import { MonsterManager } from './managers/MonsterManager.js';
import { ProjectileManager } from './managers/ProjectileManager.js';
import { AbilityManager } from './managers/AbilityManager.js';
import { ServerWorldManager } from './managers/ServerWorldManager.js';
import { InputProcessor } from './systems/InputProcessor.js';
import { LagCompensation } from './systems/LagCompensation.js';
import { SessionAntiCheat } from './systems/SessionAntiCheat.js';
// Hit detection rollback removed - caused visual issues
import { SocketHandler } from './network/SocketHandler.js';
import { NetworkOptimizer } from './network/NetworkOptimizer.js';
import { setupDebugEndpoint } from './middleware/debugEndpoint.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'src')));
app.use('/node_modules', express.static(path.join(__dirname, '..', 'node_modules')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// Generate server-authoritative world seed
const SERVER_WORLD_SEED = Math.floor(Math.random() * 1000000);
console.log(`[Server] Generated world seed: ${SERVER_WORLD_SEED}`);

// Override the constant with server's seed
GAME_CONSTANTS.WORLD.SEED = SERVER_WORLD_SEED;

// Initialize centralized world generation (SINGLE world generation for entire server)
const serverWorldManager = new ServerWorldManager(SERVER_WORLD_SEED);
serverWorldManager.initialize();

// Initialize game systems with shared world data
const gameState = new GameStateManager(io);
const monsterManager = new MonsterManager(io, serverWorldManager);
const projectileManager = new ProjectileManager(io);
const abilityManager = new AbilityManager(io, gameState, projectileManager);
const lagCompensation = new LagCompensation();
const sessionAntiCheat = new SessionAntiCheat(abilityManager);
const inputProcessor = new InputProcessor(gameState, abilityManager, lagCompensation, sessionAntiCheat, serverWorldManager);
const networkOptimizer = new NetworkOptimizer();
const socketHandler = new SocketHandler(io, gameState, monsterManager, projectileManager, abilityManager, inputProcessor, lagCompensation, sessionAntiCheat, SERVER_WORLD_SEED, networkOptimizer);

// Feature flag for delta compression (re-enabled with bug fixes)
const ENABLE_DELTA_COMPRESSION = true;

// Setup debug endpoint with access to systems
setupDebugEndpoint(app, { sessionAntiCheat });

// Cross-reference managers
io.monsterManager = monsterManager;
io.projectileManager = projectileManager;

// Main game loop
let lastUpdateTime = Date.now();

setInterval(() => {
    const now = Date.now();
    const deltaTime = (now - lastUpdateTime) / 1000;
    lastUpdateTime = now;
    
    // Update game systems
    gameState.update(deltaTime);
    inputProcessor.processAllInputs(deltaTime); // Process client inputs
    monsterManager.update(deltaTime, gameState.players);
    projectileManager.update(deltaTime, gameState.players, monsterManager.monsters);
    
    // Hit detection rollback removed for simpler, more responsive gameplay
    
    // Clean up old projectiles periodically
    if (Math.random() < 0.01) { // ~1% chance per tick
        projectileManager.cleanup();
    }
    
    // Send per-client optimized state
    for (const [socketId, socket] of io.sockets.sockets) {
        const player = gameState.getPlayerBySocket(socketId);
        if (!player) continue;
        
        // Get monsters visible to this specific player (performance optimization)
        const visibleMonsters = monsterManager.getVisibleMonsters(new Map([[player.id, player]]));
        
        if (ENABLE_DELTA_COMPRESSION) {
            // Use NetworkOptimizer for delta compression
            const serializedPlayers = gameState.getSerializedPlayers(inputProcessor);
            const optimizedState = networkOptimizer.optimizeStateUpdate(
                socketId,
                serializedPlayers,
                visibleMonsters,
                player
            );
            optimizedState.projectiles = projectileManager.getSerializedProjectiles();
            socket.emit('state', optimizedState);
        } else {
            // Send full objects (current behavior)
            const state = {
                players: gameState.getSerializedPlayers(inputProcessor),
                monsters: monsterManager.getSerializedMonsters(visibleMonsters),
                projectiles: projectileManager.getSerializedProjectiles()
            };
            socket.emit('state', state);
        }
    }
    
}, 1000 / GAME_CONSTANTS.TICK_RATE);

// Spawn initial monsters
monsterManager.spawnInitialMonsters(5);

// Start server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Game running at ${GAME_CONSTANTS.TICK_RATE} ticks per second`);
});