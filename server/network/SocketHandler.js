import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';
import { SERVER_CONFIG } from '../config/ServerConfig.js';
import { getDistance } from '../../shared/utils/MathUtils.js';
import { SimpleValidator } from '../../shared/validation/SimpleValidator.js';

export class SocketHandler {
    constructor(io, gameState, monsterManager, projectileManager, abilityManager, inputProcessor, lagCompensation, sessionAntiCheat, worldSeed, networkOptimizer) {
        this.io = io;
        this.gameState = gameState;
        this.monsterManager = monsterManager;
        this.projectileManager = projectileManager;
        this.abilityManager = abilityManager;
        this.inputProcessor = inputProcessor;
        this.lagCompensation = lagCompensation;
        this.sessionAntiCheat = sessionAntiCheat;
        this.worldSeed = worldSeed;
        this.networkOptimizer = networkOptimizer;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.io.on('connection', socket => this.handleConnection(socket));
    }

    handleConnection(socket) {
        // Player connected
        
        // Create new player
        const player = this.gameState.createPlayer(socket.id);
        
        // Send initialization data
        socket.emit('init', {
            id: socket.id,
            world: {
                width: GAME_CONSTANTS.WORLD.WIDTH,
                height: GAME_CONSTANTS.WORLD.HEIGHT,
                tileSize: GAME_CONSTANTS.WORLD.TILE_SIZE,
                seed: this.worldSeed
            },
            players: this.gameState.getSerializedPlayers(this.inputProcessor),
            monsters: this.monsterManager.getSerializedMonsters(this.monsterManager.monsters),
            config: {
                debug: SERVER_CONFIG.DEBUG,
                features: SERVER_CONFIG.FEATURES
            }
        });
        
        // Notify others
        socket.broadcast.emit('playerJoined', player);
        
        // Set up player-specific handlers
        this.setupPlayerHandlers(socket);
    }

    setupPlayerHandlers(socket) {
        socket.on('playerUpdate', data => this.handlePlayerUpdate(socket, data));
        socket.on('playerInput', data => this.handlePlayerInput(socket, data)); // New input handler
        socket.on('attack', data => this.handlePlayerAttack(socket, data));
        socket.on('executeAbility', data => this.handleExecuteAbility(socket, data));
        socket.on('attackMonster', data => this.handleAttackMonster(socket, data));
        socket.on('createProjectile', data => this.handleCreateProjectile(socket, data));
        socket.on('setClass', cls => this.handleSetClass(socket, cls));
        socket.on('collisionMask', data => this.handleCollisionMask(socket, data));
        socket.on('ping', data => this.handlePing(socket, data)); // Latency measurement
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    handlePlayerUpdate(socket, data) {
        const player = this.gameState.getPlayer(socket.id);
        if (!player) return;
        
        // Ignore position updates if player is in a server-controlled ability
        if (this.abilityManager.activeAbilities.has(player.id)) {
            return; // Server controls position during abilities
        }
        
        // Update player position and facing
        player.x = data.x;
        player.y = data.y;
        player.facing = data.facing;
    }

    handlePlayerAttack(socket, data) {
        const player = this.gameState.getPlayer(socket.id);
        if (!player || player.hp <= 0) return;
        
        // Player attack
        
        // Broadcast attack to all clients
        this.io.emit('playerAttack', {
            id: socket.id,
            type: data.type,
            x: player.x,
            y: player.y,
            facing: player.facing
        });
    }

    handlePlayerInput(socket, data) {
        // Phase 2.1: Validate critical fields only
        const validatedData = SimpleValidator.validateMessage('playerInput', data, socket.id);
        if (!validatedData) return; // Reject dangerous messages
        
        // Queue input command for processing (with anti-cheat validation)
        const accepted = this.inputProcessor.queueInput(socket.id, validatedData);
        
        // Check if player should be kicked for violations
        if (this.sessionAntiCheat && this.sessionAntiCheat.shouldKickPlayer(socket.id)) {
            console.error(`[SocketHandler] Kicking player ${socket.id} for anti-cheat violations`);
            socket.emit('kicked', { reason: 'Anti-cheat violation detected' });
            socket.disconnect(true);
        }
    }

    handleExecuteAbility(socket, data) {
        // Phase 2.1: Validate critical fields only
        const validatedData = SimpleValidator.validateMessage('executeAbility', data, socket.id);
        if (!validatedData) return; // Reject dangerous messages
        
        // Use the AbilityManager to execute abilities server-side
        this.abilityManager.executeAbility(socket.id, validatedData.abilityType, validatedData);
    }

    handleAttackMonster(socket, data) {
        // Phase 2.1: Validate critical fields only (damage bounds, monster ID)
        const validatedData = SimpleValidator.validateMessage('attackMonster', data, socket.id);
        if (!validatedData) return; // Reject dangerous messages
        
        const player = this.gameState.getPlayer(socket.id);
        if (!player || player.hp <= 0) return;
        
        const monster = this.monsterManager.monsters.get(validatedData.monsterId);
        if (!monster || monster.hp <= 0) return;
        
        // Validate attack range
        const distance = getDistance(player, monster);
        const attackRange = validatedData.attackType === 'primary' ? 150 : 200;
        
        if (distance > attackRange) {
            // Attack out of range
            return;
        }
        
        // Apply damage (already validated to be reasonable bounds)
        this.monsterManager.handleMonsterDamage(validatedData.monsterId, validatedData.damage, player);
    }

    handleCreateProjectile(socket, data) {
        // Phase 2.1: Validate critical fields only (position, angle, speed bounds)
        const validatedData = SimpleValidator.validateMessage('createProjectile', data, socket.id);
        if (!validatedData) return; // Reject dangerous messages
        
        // Received createProjectile request
        const player = this.gameState.getPlayer(socket.id);
        if (!player || player.hp <= 0) {
            // Rejected projectile: player not found or dead
            return;
        }
        
        // Create projectile on server using validated data
        this.projectileManager.createProjectile(player, {
            x: validatedData.x,
            y: validatedData.y,
            angle: validatedData.angle,
            speed: validatedData.speed || 700,
            damage: validatedData.damage || 1,
            range: validatedData.range || 600,
            effectType: validatedData.effectType || 'bow_shot_effect'
        });
    }

    handleSetClass(socket, className) {
        const player = this.gameState.getPlayer(socket.id);
        if (player) {
            this.gameState.setPlayerClass(socket.id, className);
        }
    }
    
    handleCollisionMask(socket, collisionMaskData) {
        // Received collision mask from client
        
        // Update InputProcessor with client's collision mask
        if (this.inputProcessor && this.inputProcessor.updateCollisionMask) {
            this.inputProcessor.updateCollisionMask(collisionMaskData);
        }
        
        // Update MonsterManager with client's collision mask
        if (this.monsterManager && this.monsterManager.updateCollisionMask) {
            this.monsterManager.updateCollisionMask(collisionMaskData);
        }
        
        // Server collision systems synchronized with client world
    }

    /**
     * Handle ping request for latency measurement
     * @param {Object} socket - Socket connection
     * @param {Object} data - Ping data {sequence, clientTime}
     */
    handlePing(socket, data) {
        // Phase 2.1: Validate critical fields only (prevent ping flood)
        const validatedData = SimpleValidator.validateMessage('ping', data, socket.id);
        if (!validatedData) return; // Reject dangerous messages
        
        const serverTime = Date.now();
        
        // Calculate RTT if we have client time
        if (validatedData.clientTime) {
            const rtt = serverTime - validatedData.clientTime;
            
            // Update lag compensation with this latency measurement
            if (this.lagCompensation && rtt > 0 && rtt < 2000) { // Sanity check
                this.lagCompensation.updatePlayerLatency(socket.id, rtt);
            }
        }
        
        // Respond immediately with pong containing server time
        socket.emit('pong', {
            sequence: validatedData.sequence,
            clientTime: validatedData.clientTime,
            serverTime: serverTime
        });
    }

    handleDisconnect(socket) {
        // Player disconnected
        this.abilityManager.removePlayer(socket.id);
        this.inputProcessor.removePlayer(socket.id); // This also cleans up anti-cheat data
        this.lagCompensation.removePlayer(socket.id);
        this.gameState.removePlayer(socket.id);
        if (this.networkOptimizer) {
            this.networkOptimizer.resetClient(socket.id); // Clean up delta compression state
        }
        socket.broadcast.emit('playerLeft', socket.id);
    }
}