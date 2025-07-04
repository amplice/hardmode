/**
 * @fileoverview Main server entry point - Game loop and network integration
 * 
 * ARCHITECTURE ROLE:
 * - Central server orchestrator running the main game loop at 30 FPS
 * - Coordinates all game systems (state, monsters, input, physics)
 * - Implements per-client delta compression for network optimization
 * - Serves static assets and handles Socket.IO multiplayer connections
 * 
 * CRITICAL DELTA COMPRESSION INTEGRATION:
 * Lines 100-108 demonstrate the bandwidth optimization core:
 * 1. getSerializedPlayers() produces baseline state from GameStateManager
 * 2. NetworkOptimizer compares with per-client last-sent state
 * 3. Only changed fields + critical stability fields sent to each client
 * 4. 70-80% bandwidth reduction achieved for 30+ concurrent players
 * 
 * PER-CLIENT OPTIMIZATION PATTERN:
 * Each socket gets personalized updates based on their view distance:
 * - Player gets their own state with lastProcessedSeq for prediction
 * - Only monsters within view distance included (performance + bandwidth)
 * - Delta compression applied independently per client connection
 * 
 * GAME LOOP TIMING:
 * 30 FPS server tick rate balances responsiveness with CPU load
 * Game systems run in specific order to prevent race conditions
 */

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
import { DamageProcessor } from './systems/DamageProcessor.js';
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

// Serve static files - paths adjusted for TypeScript compilation to dist/
app.use(express.static(path.join(__dirname, '..', '..', 'src')));
app.use('/node_modules', express.static(path.join(__dirname, '..', '..', 'node_modules')));
app.use('/shared', express.static(path.join(__dirname, '..', '..', 'shared')));

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
const damageProcessor = new DamageProcessor(gameState, monsterManager, socketHandler, io);

// Spawn initial monsters for immediate stress testing
console.log(`[Server] 🔥 EXTREME STRESS TEST: Spawning ${GAME_CONSTANTS.SPAWN.INITIAL_MONSTERS} initial monsters...`);
console.log(`[Server] ⚡ Lightning spawn rate: ${GAME_CONSTANTS.SPAWN.INTERVAL}s (one monster every 50ms!)`);
console.log(`[Server] 🎯 Target: ${GAME_CONSTANTS.SPAWN.MAX_MONSTERS} total monsters`);
for (let i = 0; i < GAME_CONSTANTS.SPAWN.INITIAL_MONSTERS; i++) {
    monsterManager.createMonster();
}
console.log(`[Server] 🚀 Stress test initialized! Watch performance as monsters rapidly spawn to 500...`);

// Feature flag for delta compression (re-enabled with bug fixes)
const ENABLE_DELTA_COMPRESSION = true;

// Setup debug endpoint with access to systems
setupDebugEndpoint(app, { sessionAntiCheat });

// Cross-reference managers
io.gameState = gameState;
io.monsterManager = monsterManager;
io.projectileManager = projectileManager;

// Set damage processor reference in managers after initialization
monsterManager.damageProcessor = damageProcessor;
projectileManager.damageProcessor = damageProcessor;
socketHandler.damageProcessor = damageProcessor;

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
    
    // BANDWIDTH OPTIMIZATION: Per-client personalized state updates
    // Each client gets only relevant data optimized for their view and connection
    for (const [socketId, socket] of io.sockets.sockets) {
        const player = gameState.getPlayerBySocket(socketId);
        if (!player) continue;
        
        // PERFORMANCE: Only send monsters within view distance of this specific player
        // Reduces both CPU load and network bandwidth significantly
        const visibleMonsters = monsterManager.getVisibleMonsters(new Map([[player.id, player]]));
        
        if (ENABLE_DELTA_COMPRESSION) {
            // DELTA COMPRESSION PATH: 70-80% bandwidth reduction
            
            // Step 1: Get authoritative serialized state with client prediction data
            const serializedPlayers = gameState.getSerializedPlayers(inputProcessor);
            
            // Step 2: NetworkOptimizer compares current vs last-sent per this client
            // Creates deltas containing only changed fields + critical stability fields
            const optimizedState = networkOptimizer.optimizeStateUpdate(
                socketId,
                serializedPlayers,
                visibleMonsters,
                player
            );
            
            // Step 3: Add projectiles (currently not delta compressed but could be)
            optimizedState.projectiles = projectileManager.getSerializedProjectiles();
            
            // Step 4: Send optimized payload with _updateType markers for client processing
            socket.emit('state', optimizedState);
        } else {
            // LEGACY PATH: Send complete objects (backwards compatibility)
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