import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';
import { getDistance } from '../../shared/utils/MathUtils.js';

export class SocketHandler {
    constructor(io, gameState, monsterManager, projectileManager, abilityManager, inputProcessor) {
        this.io = io;
        this.gameState = gameState;
        this.monsterManager = monsterManager;
        this.projectileManager = projectileManager;
        this.abilityManager = abilityManager;
        this.inputProcessor = inputProcessor;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.io.on('connection', socket => this.handleConnection(socket));
    }

    handleConnection(socket) {
        console.log(`Player ${socket.id} connected`);
        
        // Create new player
        const player = this.gameState.createPlayer(socket.id);
        
        // Send initialization data
        socket.emit('init', {
            id: socket.id,
            world: {
                width: GAME_CONSTANTS.WORLD.WIDTH,
                height: GAME_CONSTANTS.WORLD.HEIGHT,
                tileSize: GAME_CONSTANTS.WORLD.TILE_SIZE,
                seed: GAME_CONSTANTS.WORLD.SEED
            },
            players: this.gameState.getSerializedPlayers(),
            monsters: this.monsterManager.getSerializedMonsters(this.monsterManager.monsters)
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
        
        console.log(`Player ${player.id} performs ${data.type} attack`);
        
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
        // Queue input command for processing
        this.inputProcessor.queueInput(socket.id, data);
    }

    handleExecuteAbility(socket, data) {
        // Use the AbilityManager to execute abilities server-side
        this.abilityManager.executeAbility(socket.id, data.abilityType, data);
    }

    handleAttackMonster(socket, data) {
        const player = this.gameState.getPlayer(socket.id);
        if (!player || player.hp <= 0) return;
        
        const monster = this.monsterManager.monsters.get(data.monsterId);
        if (!monster || monster.hp <= 0) return;
        
        // Validate attack range
        const distance = getDistance(player, monster);
        const attackRange = data.attackType === 'primary' ? 150 : 200;
        
        if (distance > attackRange) {
            console.log(`Attack out of range: ${distance} > ${attackRange}`);
            return;
        }
        
        // Apply damage
        const damage = data.damage || 1;
        this.monsterManager.handleMonsterDamage(data.monsterId, damage, player);
    }

    handleCreateProjectile(socket, data) {
        console.log(`Received createProjectile request from ${socket.id}:`, data);
        const player = this.gameState.getPlayer(socket.id);
        if (!player || player.hp <= 0) {
            console.log(`Rejected projectile: player ${socket.id} not found or dead`);
            return;
        }
        
        // DEBUG: Log player details
        console.log(`[DEBUG] Player creating projectile:`, {
            id: player.id,
            class: player.class,
            position: { x: Math.round(player.x), y: Math.round(player.y) },
            hp: `${player.hp}/${player.maxHp}`
        });
        
        // Validate the request
        if (data.x === undefined || data.y === undefined || data.angle === undefined) {
            console.log(`Rejected projectile: invalid data - x:${data.x}, y:${data.y}, angle:${data.angle}`);
            return;
        }
        
        // Create projectile on server
        this.projectileManager.createProjectile(player, {
            x: data.x,
            y: data.y,
            angle: data.angle,
            speed: data.speed || 700,
            damage: data.damage || 1,
            range: data.range || 600,
            effectType: data.effectType || 'bow_shot_effect'
        });
    }

    handleSetClass(socket, className) {
        const player = this.gameState.getPlayer(socket.id);
        if (player) {
            this.gameState.setPlayerClass(socket.id, className);
        }
    }

    handleDisconnect(socket) {
        console.log(`Player ${socket.id} disconnected`);
        this.abilityManager.removePlayer(socket.id);
        this.inputProcessor.removePlayer(socket.id);
        this.gameState.removePlayer(socket.id);
        socket.broadcast.emit('playerLeft', socket.id);
    }
}