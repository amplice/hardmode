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

// Setup debug endpoint
setupDebugEndpoint(app);

// Initialize game systems
const gameState = new GameStateManager(io);
const monsterManager = new MonsterManager(io);
const projectileManager = new ProjectileManager(io);
const abilityManager = new AbilityManager(io, gameState, projectileManager);
const lagCompensation = new LagCompensation();
const sessionAntiCheat = new SessionAntiCheat(abilityManager);
const inputProcessor = new InputProcessor(gameState, abilityManager, lagCompensation, sessionAntiCheat);
const socketHandler = new SocketHandler(io, gameState, monsterManager, projectileManager, abilityManager, inputProcessor, lagCompensation, sessionAntiCheat);
const networkOptimizer = new NetworkOptimizer();

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
    
    // Get visible monsters for all players
    const visibleMonsters = monsterManager.getVisibleMonsters(gameState.players);
    
    // Prepare and send optimized state updates
    const state = {
        players: gameState.getSerializedPlayers(inputProcessor),
        monsters: monsterManager.getSerializedMonsters(visibleMonsters),
        projectiles: projectileManager.getSerializedProjectiles()
    };
    
    // TODO: Implement per-client optimization
    io.emit('state', state);
    
}, 1000 / GAME_CONSTANTS.TICK_RATE);

// Spawn initial monsters
monsterManager.spawnInitialMonsters(5);

// Start server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Game running at ${GAME_CONSTANTS.TICK_RATE} ticks per second`);
});