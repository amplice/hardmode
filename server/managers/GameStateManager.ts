/**
 * @fileoverview GameStateManager - Server-side authoritative player state management
 * 
 * ARCHITECTURE ROLE:
 * - Authoritative source of truth for all player state (position, HP, level, etc.)
 * - Handles player lifecycle: creation, respawn, stat progression, death
 * - Integrates with client prediction through lastProcessedSeq tracking
 * - Provides serialized state for network transmission with delta compression
 * 
 * CRITICAL RELATIONSHIPS:
 * - InputProcessor validates and applies client inputs to player state
 * - NetworkOptimizer uses getSerializedPlayers() output for delta compression
 * - Client Reconciler uses lastProcessedSeq for prediction correction
 * - MonsterManager reads player positions for AI targeting and spawning
 * 
 * STATE AUTHORITY PATTERN:
 * Server maintains canonical player state, clients predict locally:
 * 1. Client sends input with sequence number
 * 2. Server validates and applies to authoritative state
 * 3. Server sends state with lastProcessedSeq for reconciliation
 * 4. Client corrects prediction if server state differs
 * 
 * DELTA COMPRESSION INTEGRATION:
 * getSerializedPlayers() produces the baseline state for NetworkOptimizer
 * Includes essential reconciliation data (lastProcessedSeq) for client prediction
 */

import { GAME_CONSTANTS, PLAYER_STATS } from '../../shared/constants/GameConstants.js';
import { CalculationEngine } from '../systems/CalculationEngine.js';
import type { PlayerState, CharacterClass, Direction, Position } from '../../shared/types/GameTypes.js';

// Extended player state with server-specific fields
interface ServerPlayerState extends PlayerState {
    x: number;
    y: number;
    class: CharacterClass; // Legacy field name for backward compatibility
    xp: number;
    kills: number;
    respawnTimer: number;
    spawnProtectionTimer: number;
    invulnerable: boolean;
    lastProcessedSeq?: number;
}

interface CreatePlayerOptions {
    class?: CharacterClass;
    x?: number;
    y?: number;
}

interface SerializedPlayer {
    id: string;
    x: number;
    y: number;
    facing: Direction;
    class: CharacterClass;
    hp: number;
    maxHp: number;
    level: number;
    spawnProtectionTimer: number;
    moveSpeedBonus: number;
    attackRecoveryBonus: number;
    attackCooldownBonus: number;
    rollUnlocked: boolean;
    lastProcessedSeq?: number;
}

interface InputProcessor {
    getLastProcessedSequence(playerId: string): number;
}

interface SocketIO {
    emit(event: string, data: any): void;
}

export class GameStateManager {
    private io: SocketIO;
    public players: Map<string, ServerPlayerState>;

    constructor(io: SocketIO) {
        this.io = io;
        this.players = new Map();
    }

    createPlayer(id: string, options: CreatePlayerOptions = {}): ServerPlayerState {
        const playerClass = options.class || 'bladedancer';
        const stats = PLAYER_STATS[playerClass] || PLAYER_STATS.bladedancer;
        
        const player: ServerPlayerState = {
            id,
            x: options.x || GAME_CONSTANTS.WORLD.WIDTH * GAME_CONSTANTS.WORLD.TILE_SIZE / 2,
            y: options.y || GAME_CONSTANTS.WORLD.HEIGHT * GAME_CONSTANTS.WORLD.TILE_SIZE / 2,
            position: { 
                x: options.x || GAME_CONSTANTS.WORLD.WIDTH * GAME_CONSTANTS.WORLD.TILE_SIZE / 2,
                y: options.y || GAME_CONSTANTS.WORLD.HEIGHT * GAME_CONSTANTS.WORLD.TILE_SIZE / 2
            },
            facing: 'down',
            characterClass: playerClass,
            class: playerClass, // Legacy field for backward compatibility
            hp: CalculationEngine.calculateMaxHP(playerClass, 1),
            maxHp: CalculationEngine.calculateMaxHP(playerClass, 1),
            xp: 0,
            level: 1,
            experience: 0, // TypeScript interface field
            kills: 0,
            respawnTimer: 0,
            spawnProtectionTimer: GAME_CONSTANTS.PLAYER.SPAWN_PROTECTION_DURATION,
            invulnerable: true,
            // Level progression bonuses
            moveSpeedBonus: 0,
            attackRecoveryBonus: 0,
            attackCooldownBonus: 0,
            rollUnlocked: false,
            // State
            isAttacking: false,
            isDead: false,
            moveSpeed: stats.moveSpeed
        };
        
        // Sync position fields
        player.position.x = player.x;
        player.position.y = player.y;
        
        this.players.set(id, player);
        return player;
    }

    removePlayer(id: string): void {
        this.players.delete(id);
    }

    getPlayer(id: string): ServerPlayerState | undefined {
        return this.players.get(id);
    }

    getPlayerBySocket(socketId: string): ServerPlayerState | undefined {
        // Player ID is the same as socket ID in this implementation
        return this.players.get(socketId);
    }

    setPlayerClass(id: string, className: CharacterClass): void {
        const player = this.players.get(id);
        if (!player) return;
        
        player.class = className;
        player.characterClass = className; // Update both legacy and TypeScript fields
        // Phase 3.1: Use CalculationEngine for HP calculation
        player.maxHp = CalculationEngine.calculateMaxHP(className, player.level);
        player.hp = player.maxHp;
    }

    update(deltaTime: number): void {
        // Update spawn protection timers
        for (const player of this.players.values()) {
            if (player.spawnProtectionTimer > 0) {
                player.spawnProtectionTimer -= deltaTime;
                if (player.spawnProtectionTimer <= 0) {
                    player.invulnerable = false;
                    player.spawnProtectionTimer = 0;
                }
            }
        }
        
        // Handle respawning
        for (const player of this.players.values()) {
            if (player.hp <= 0) {
                player.respawnTimer += deltaTime;
                if (player.respawnTimer >= GAME_CONSTANTS.PLAYER.RESPAWN_TIME) {
                    this.respawnPlayer(player);
                }
            }
        }
    }

    respawnPlayer(player: ServerPlayerState): void {
        // Reset to level 1 and 0 XP (permadeath mechanics)
        player.level = 1;
        player.xp = 0;
        player.experience = 0; // TypeScript interface field
        
        // Phase 3.1: Use CalculationEngine for respawn HP (level 1, no bonuses)
        player.maxHp = CalculationEngine.calculateMaxHP(player.class, 1);
        player.hp = player.maxHp;
        
        // Reset all level bonuses
        player.moveSpeedBonus = 0;
        player.attackRecoveryBonus = 0;
        player.attackCooldownBonus = 0;
        player.rollUnlocked = false;
        
        player.x = GAME_CONSTANTS.WORLD.WIDTH * GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
        player.y = GAME_CONSTANTS.WORLD.HEIGHT * GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
        player.position.x = player.x;
        player.position.y = player.y;
        player.respawnTimer = 0;
        player.spawnProtectionTimer = GAME_CONSTANTS.PLAYER.SPAWN_PROTECTION_DURATION;
        player.invulnerable = true;
        player.isDead = false;
        
        console.log(`Player ${player.id} respawned at level ${player.level} with ${player.xp} XP and ${player.hp}/${player.maxHp} HP`);
        
        // Notify clients
        this.io.emit('playerRespawned', {
            playerId: player.id,
            position: { x: player.x, y: player.y },
            level: player.level,
            xp: player.xp,
            hp: player.hp,
            maxHp: player.maxHp,
            moveSpeedBonus: player.moveSpeedBonus,
            attackRecoveryBonus: player.attackRecoveryBonus,
            attackCooldownBonus: player.attackCooldownBonus,
            rollUnlocked: player.rollUnlocked,
            spawnProtectionTimer: player.spawnProtectionTimer
        });
    }

    getSerializedPlayers(inputProcessor?: InputProcessor): SerializedPlayer[] {
        return Array.from(this.players.values()).map(p => {
            const serialized: SerializedPlayer = {
                id: p.id,
                x: p.x,
                y: p.y,
                facing: p.facing,
                class: p.class,
                hp: p.hp,
                maxHp: p.maxHp,
                level: p.level,
                spawnProtectionTimer: p.spawnProtectionTimer,
                moveSpeedBonus: p.moveSpeedBonus,
                attackRecoveryBonus: p.attackRecoveryBonus,
                attackCooldownBonus: p.attackCooldownBonus,
                rollUnlocked: p.rollUnlocked
            };
            
            // Add last processed sequence for client prediction reconciliation
            if (inputProcessor) {
                const lastSeq = inputProcessor.getLastProcessedSequence(p.id);
                serialized.lastProcessedSeq = lastSeq;
                
                // Debug log
                if (Math.random() < 0.02) {
                    console.log(`[GameState] Player ${p.id} state: lastProcessedSeq=${lastSeq}`);
                }
            } else {
                console.warn(`[GameState] No inputProcessor provided for player ${p.id}`);
            }
            
            return serialized;
        });
    }

    getGameState() {
        return {
            players: this.getSerializedPlayers()
        };
    }
}