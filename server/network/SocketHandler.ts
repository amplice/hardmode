import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';
import { SERVER_CONFIG } from '../config/ServerConfig.js';
import { getDistance } from '../../shared/utils/MathUtils.js';
import { SimpleValidator } from '../../shared/validation/SimpleValidator.js';
import { CalculationEngine } from '../systems/CalculationEngine.js';
import type { 
    PlayerState,
    AttackType,
    CharacterClass,
    Position
} from '../../shared/types/GameTypes.js';

// Socket.IO types
interface Socket {
    id: string;
    emit(event: string, data?: any): void;
    broadcast: {
        emit(event: string, data?: any): void;
    };
    on(event: string, handler: (...args: any[]) => void): void;
    disconnect(close?: boolean): void;
}

interface SocketIO {
    on(event: 'connection', handler: (socket: Socket) => void): void;
    emit(event: string, data?: any): void;
}

// Manager interfaces
interface GameStateManager {
    createPlayer(socketId: string): PlayerState;
    getPlayer(socketId: string): PlayerState | undefined;
    removePlayer(socketId: string): void;
    setPlayerClass(socketId: string, className: CharacterClass): void;
    getSerializedPlayers(inputProcessor?: InputProcessor): any[];
}

interface MonsterManager {
    monsters: Map<string, any>;
    getSerializedMonsters(monsters: Map<string, any>): any[];
    handleMonsterDamage(monsterId: string, damage: number, attacker: PlayerState): void;
    updateCollisionMask?(collisionMaskData: any): void;
}

interface ProjectileManager {
    createProjectile(owner: any, data: ProjectileData): any;
}

interface AbilityManager {
    activeAbilities: Map<string, any>;
    executeAbility(playerId: string, abilityType: string, data: any): void;
    removePlayer(playerId: string): void;
}

interface InputProcessor {
    queueInput(playerId: string, inputData: any): boolean;
    removePlayer(playerId: string): void;
    updateCollisionMask?(collisionMaskData: any): void;
}

interface LagCompensation {
    updatePlayerLatency(playerId: string, rtt: number): void;
    removePlayer(playerId: string): void;
}

interface SessionAntiCheat {
    shouldKickPlayer(playerId: string): boolean;
}

interface NetworkOptimizer {
    resetClient(clientId: string): void;
}

// Message data types
interface PlayerUpdateData {
    x: number;
    y: number;
    facing: number;
}

interface PlayerAttackData {
    type: AttackType;
}

interface PlayerInputData {
    sequence: number;
    input: any;
    timestamp: number;
}

interface ExecuteAbilityData {
    abilityType: string;
    [key: string]: any;
}

interface AttackMonsterData {
    monsterId: string;
    attackType: AttackType;
    damage: number;
}

interface ProjectileData {
    x: number;
    y: number;
    angle: number;
    speed?: number;
    damage?: number;
    range?: number;
    effectType?: string;
}

interface PingData {
    sequence: number;
    clientTime: number;
}

export class SocketHandler {
    private io: SocketIO;
    private gameState: GameStateManager;
    private monsterManager: MonsterManager;
    private projectileManager: ProjectileManager;
    private abilityManager: AbilityManager;
    private inputProcessor: InputProcessor;
    private lagCompensation: LagCompensation;
    private sessionAntiCheat: SessionAntiCheat;
    private worldSeed: number;
    private networkOptimizer: NetworkOptimizer;

    constructor(
        io: SocketIO,
        gameState: GameStateManager,
        monsterManager: MonsterManager,
        projectileManager: ProjectileManager,
        abilityManager: AbilityManager,
        inputProcessor: InputProcessor,
        lagCompensation: LagCompensation,
        sessionAntiCheat: SessionAntiCheat,
        worldSeed: number,
        networkOptimizer: NetworkOptimizer
    ) {
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

    private setupEventHandlers(): void {
        this.io.on('connection', socket => this.handleConnection(socket));
    }

    private handleConnection(socket: Socket): void {
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

    private setupPlayerHandlers(socket: Socket): void {
        socket.on('playerUpdate', (data: PlayerUpdateData) => this.handlePlayerUpdate(socket, data));
        socket.on('playerInput', (data: PlayerInputData) => this.handlePlayerInput(socket, data));
        socket.on('attack', (data: PlayerAttackData) => this.handlePlayerAttack(socket, data));
        socket.on('executeAbility', (data: ExecuteAbilityData) => this.handleExecuteAbility(socket, data));
        socket.on('attackMonster', (data: AttackMonsterData) => this.handleAttackMonster(socket, data));
        socket.on('createProjectile', (data: ProjectileData) => this.handleCreateProjectile(socket, data));
        socket.on('setClass', (cls: CharacterClass) => this.handleSetClass(socket, cls));
        socket.on('collisionMask', (data: any) => this.handleCollisionMask(socket, data));
        socket.on('ping', (data: PingData) => this.handlePing(socket, data));
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    private handlePlayerUpdate(socket: Socket, data: PlayerUpdateData): void {
        const player = this.gameState.getPlayer(socket.id);
        if (!player) return;
        
        // Ignore position updates if player is in a server-controlled ability
        if (this.abilityManager.activeAbilities.has(player.id)) {
            return; // Server controls position during abilities
        }
        
        // Update player position and facing - handle both legacy and TypeScript formats
        if ('x' in player && 'y' in player) {
            // Legacy format with direct x, y properties
            (player as any).x = data.x;
            (player as any).y = data.y;
        } else {
            // TypeScript format with position object
            player.position.x = data.x;
            player.position.y = data.y;
        }
        player.facing = data.facing as any; // facing is actually a number (angle) despite Direction type
    }

    private handlePlayerAttack(socket: Socket, data: PlayerAttackData): void {
        const player = this.gameState.getPlayer(socket.id);
        if (!player || player.hp <= 0) return;
        
        // Get player coordinates for broadcast
        const playerX = 'x' in player ? (player as any).x : player.position.x;
        const playerY = 'y' in player ? (player as any).y : player.position.y;
        
        // Broadcast attack to all clients
        this.io.emit('playerAttack', {
            id: socket.id,
            type: data.type,
            x: playerX,
            y: playerY,
            facing: player.facing
        });
    }

    private handlePlayerInput(socket: Socket, data: PlayerInputData): void {
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

    private handleExecuteAbility(socket: Socket, data: ExecuteAbilityData): void {
        // Phase 2.1: Validate critical fields only
        const validatedData = SimpleValidator.validateMessage('executeAbility', data, socket.id);
        if (!validatedData) return; // Reject dangerous messages
        
        // Use the AbilityManager to execute abilities server-side
        this.abilityManager.executeAbility(socket.id, validatedData.abilityType, validatedData);
    }

    private handleAttackMonster(socket: Socket, data: AttackMonsterData): void {
        // Phase 2.1: Validate critical fields only (damage bounds, monster ID)
        const validatedData = SimpleValidator.validateMessage('attackMonster', data, socket.id);
        if (!validatedData) {
            return; // Reject dangerous messages
        }
        
        const player = this.gameState.getPlayer(socket.id);
        if (!player || player.hp <= 0) {
            return;
        }
        
        const monster = this.monsterManager.monsters.get(validatedData.monsterId);
        if (!monster || monster.hp <= 0) {
            return;
        }
        
        // Validate attack range - handle coordinate compatibility
        const playerCoords = 'x' in player ? 
            { x: (player as any).x, y: (player as any).y } : 
            { x: player.position.x, y: player.position.y };
        
        const distance = getDistance(playerCoords, monster);
        const attackRange = validatedData.attackType === 'primary' ? 150 : 200;
        
        if (distance > attackRange) {
            return;
        }
        
        // Phase 3.1: Calculate damage server-side instead of trusting client
        const calculatedDamage = CalculationEngine.calculateAttackDamage(
            player,
            validatedData.attackType,
            monster,
            player.characterClass
        );
        
        // Apply calculated damage (server-authoritative)
        this.monsterManager.handleMonsterDamage(validatedData.monsterId, calculatedDamage, player);
    }

    private handleCreateProjectile(socket: Socket, data: ProjectileData): void {
        // Phase 2.1: Validate critical fields only (position, angle, speed bounds)
        const validatedData = SimpleValidator.validateMessage('createProjectile', data, socket.id);
        if (!validatedData) return; // Reject dangerous messages
        
        const player = this.gameState.getPlayer(socket.id);
        if (!player || player.hp <= 0) {
            return;
        }
        
        // Phase 3.1: Calculate projectile damage server-side
        const calculatedDamage = CalculationEngine.calculateProjectileDamage(player, 'player_projectile');
        
        // Create projectile on server with calculated damage
        this.projectileManager.createProjectile(player, {
            x: validatedData.x,
            y: validatedData.y,
            angle: validatedData.angle,
            speed: validatedData.speed || 700,
            damage: calculatedDamage,  // Server-calculated damage
            range: validatedData.range || 600,
            effectType: validatedData.effectType || 'bow_shot_effect'
        });
    }

    private handleSetClass(socket: Socket, className: CharacterClass): void {
        const player = this.gameState.getPlayer(socket.id);
        if (player) {
            this.gameState.setPlayerClass(socket.id, className);
        }
    }
    
    private handleCollisionMask(socket: Socket, collisionMaskData: any): void {
        // Update InputProcessor with client's collision mask
        if (this.inputProcessor && this.inputProcessor.updateCollisionMask) {
            this.inputProcessor.updateCollisionMask(collisionMaskData);
        }
        
        // Update MonsterManager with client's collision mask
        if (this.monsterManager && this.monsterManager.updateCollisionMask) {
            this.monsterManager.updateCollisionMask(collisionMaskData);
        }
    }

    /**
     * Handle ping request for latency measurement
     */
    private handlePing(socket: Socket, data: PingData): void {
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

    private handleDisconnect(socket: Socket): void {
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