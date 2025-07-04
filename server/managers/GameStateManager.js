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

export class GameStateManager {
    constructor(io) {
        this.io = io;
        this.players = new Map();
    }

    createPlayer(id, options = {}) {
        const playerClass = options.class || 'bladedancer';
        const stats = PLAYER_STATS[playerClass] || PLAYER_STATS.bladedancer;
        
        const player = {
            id,
            x: GAME_CONSTANTS.WORLD.WIDTH * GAME_CONSTANTS.WORLD.TILE_SIZE / 2,
            y: GAME_CONSTANTS.WORLD.HEIGHT * GAME_CONSTANTS.WORLD.TILE_SIZE / 2,
            facing: 'down',
            class: playerClass,
            hp: CalculationEngine.calculateMaxHP(playerClass, 1),
            maxHp: CalculationEngine.calculateMaxHP(playerClass, 1),
            xp: 0,
            level: 1,
            kills: 0,
            respawnTimer: 0,
            spawnProtectionTimer: GAME_CONSTANTS.PLAYER.SPAWN_PROTECTION_DURATION,
            invulnerable: true,
            // Level progression bonuses
            moveSpeedBonus: 0,
            attackRecoveryBonus: 0,
            attackCooldownBonus: 0,
            rollUnlocked: false
        };
        
        this.players.set(id, player);
        console.log(`[GameStateManager] Created player ${id}, players map now has ${this.players.size} players`);
        return player;
    }

    removePlayer(id) {
        this.players.delete(id);
    }

    getPlayer(id) {
        return this.players.get(id);
    }

    getPlayerBySocket(socketId) {
        // Player ID is the same as socket ID in this implementation
        return this.players.get(socketId);
    }

    setPlayerClass(id, className) {
        const player = this.players.get(id);
        if (!player) return;
        
        player.class = className;
        // Phase 3.1: Use CalculationEngine for HP calculation
        player.maxHp = CalculationEngine.calculateMaxHP(className, player.level);
        player.hp = player.maxHp;
    }

    update(deltaTime) {
        // Update spawn protection timers
        for (const player of this.players.values()) {
            if (player.spawnProtectionTimer > 0) {
                player.spawnProtectionTimer -= deltaTime;
                if (player.spawnProtectionTimer <= 0) {
                    console.log(`[GameStateManager] Spawn protection expired for player ${player.id}`);
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

    respawnPlayer(player) {
        // Reset to level 1 and 0 XP (permadeath mechanics)
        player.level = 1;
        player.xp = 0;
        
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
        player.respawnTimer = 0;
        player.spawnProtectionTimer = GAME_CONSTANTS.PLAYER.SPAWN_PROTECTION_DURATION;
        player.invulnerable = true;
        
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

    getSerializedPlayers(inputProcessor = null) {
        return Array.from(this.players.values()).map(p => {
            const serialized = {
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