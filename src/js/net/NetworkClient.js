/**
 * @fileoverview NetworkClient - Main client-side network orchestrator
 * 
 * ARCHITECTURE ROLE:
 * - Primary interface between client game logic and server communication
 * - Manages Socket.IO connection and all real-time data exchange
 * - Implements client-side delta compression for bandwidth optimization
 * - Handles entity state synchronization and caching
 * 
 * CRITICAL RELATIONSHIPS:
 * - Game.js creates and owns this instance (this.network)
 * - StateCache instances manage client-side entity state caching
 * - Server NetworkOptimizer sends delta/full updates marked with _updateType
 * - processPlayerUpdate() integrates with client prediction (Reconciler)
 * 
 * PERFORMANCE PATTERN:
 * Delta compression reduces bandwidth by 70-80%:
 * 1. Server sends full updates on first contact per entity
 * 2. Subsequent updates are deltas (only changed fields)
 * 3. Client merges deltas with cached state before processing
 * 4. Critical fields (id, state, hp, facing) always included for stability
 * 
 * STATE FLOW:
 * Socket 'state' event → delta/full detection → cache merge → game entity update
 */

import { StateCache } from './StateCache.js';

export class NetworkClient {
    /**
     * Creates NetworkClient - the main client-server communication hub
     * 
     * ARCHITECTURE: Central network coordinator that:
     * - Establishes Socket.IO connection to server
     * - Manages two-tier caching system (players/monsters)
     * - Processes incoming state updates with delta compression
     * - Handles all multiplayer events (attacks, damage, deaths, etc.)
     * 
     * @param {Game} game - Main game instance for entity/system access
     */
    constructor(game) {
        this.game = game;
        this.socket = io();
        
        // Legacy collections - TODO: Consider removing if unused
        this.players = new Map();
        this.monsters = new Map();
        this.connected = false;

        // DELTA COMPRESSION SYSTEM: Two-tier caching for bandwidth optimization
        // Each StateCache tracks full state and applies delta merges
        this.playerStateCache = new StateCache();  // Caches player entities
        this.monsterStateCache = new StateCache(); // Caches monster entities
        
        // Feature flag: Delta compression active (99%+ compression achieved)
        this.ENABLE_DELTA_COMPRESSION = true;

        this.setupHandlers();
    }

    setClass(cls) {
        this.socket.emit('setClass', cls);
    }
    
    /**
     * Get cache statistics for debugging
     * @returns {Object} Cache performance stats
     */
    getCacheStats() {
        return {
            playerCache: this.playerStateCache.getStats(),
            monsterCache: this.monsterStateCache.getStats(),
            deltaCompressionEnabled: this.ENABLE_DELTA_COMPRESSION
        };
    }
    
    /**
     * Enable or disable delta compression for testing
     * @param {boolean} enabled 
     * @returns {Object} Current delta compression status
     */
    setDeltaCompression(enabled) {
        this.ENABLE_DELTA_COMPRESSION = enabled;
        console.log(`Delta compression ${enabled ? 'enabled' : 'disabled'} on client`);
        // Reset cache stats when toggling
        this.playerStateCache.resetStats();
        this.monsterStateCache.resetStats();
        
        return {
            deltaCompressionEnabled: this.ENABLE_DELTA_COMPRESSION,
            message: `Delta compression ${enabled ? 'enabled' : 'disabled'}`
        };
    }
    
    /**
     * Request full updates from server (recovery from desync)
     */
    requestFullUpdates() {
        console.log('[NetworkClient] Requesting full updates from server...');
        this.playerStateCache.clear();
        this.monsterStateCache.clear();
        // The next updates from server will be full updates since we cleared cache
        
        return {
            message: 'Requested full updates - caches cleared',
            playerCacheSize: this.playerStateCache.size(),
            monsterCacheSize: this.monsterStateCache.size()
        };
    }
    
    sendCollisionMask(collisionMask) {
        if (this.connected && collisionMask) {
            // Sending collision mask to server
            this.socket.emit('collisionMask', collisionMask.serialize());
        }
    }

    sendAttack(player, type) {
        this.socket.emit('attack', {
            type,
            x: player.position.x,
            y: player.position.y,
            facing: player.facing
        });
    }

    setupHandlers() {
        this.socket.on('init', data => {
            this.id = data.id;
            this.connected = true; // Mark as connected
            // Connected to server
            
            // Store server's world seed for world generation
            if (data.world && data.world.seed) {
                this.serverWorldSeed = data.world.seed;
                // Received world seed from server
            }
            
            // Apply server configuration to client
            if (data.config) {
                this.game.applyServerConfig(data.config);
            }
            
            this.game.initializeGameWorld(data.world);
            data.players.forEach(p => {
                if (p.id !== this.id) this.game.addRemotePlayer(p);
            });
            data.monsters.forEach(m => this.game.addOrUpdateMonster(m));
        });

        this.socket.on('playerJoined', p => {
            if (p.id !== this.id) this.game.addRemotePlayer(p);
        });

        this.socket.on('playerLeft', id => {
            this.game.removeRemotePlayer(id);
            // Clean up cached state
            this.playerStateCache.remove(id);
        });

        /**
         * CORE STATE PROCESSING: Main data pipeline for entity updates
         * 
         * DELTA COMPRESSION FLOW:
         * 1. Server sends updates marked with _updateType: 'full' | 'delta'
         * 2. Full updates = complete entity state (first contact, new entity)
         * 3. Delta updates = only changed fields (position, hp, state, etc.)
         * 4. Client merges deltas with cached state before game processing
         * 
         * PERFORMANCE CRITICAL: This runs at 30 FPS with 99%+ deltas
         * - StateCache.applyDelta() merges partial updates efficiently
         * - processPlayerUpdate() handles client prediction reconciliation
         * - addOrUpdateMonster() updates game entity from merged state
         * 
         * BACKWARDS COMPATIBILITY: Handles both compressed and legacy updates
         */
        this.socket.on('state', state => {
            // PLAYER PROCESSING: Handle both delta and full updates
            state.players.forEach(p => {
                if (this.ENABLE_DELTA_COMPRESSION && p._updateType) {
                    // DELTA COMPRESSION PATH: High-frequency, bandwidth-optimized
                    if (p._updateType === 'full') {
                        // Full update: Store complete state, process directly
                        this.playerStateCache.setFull(p.id, p);
                        this.processPlayerUpdate(p);
                    } else if (p._updateType === 'delta') {
                        // Delta update: Merge with cached state, then process
                        const mergedState = this.playerStateCache.applyDelta(p.id, p);
                        this.processPlayerUpdate(mergedState);
                    }
                } else {
                    // LEGACY PATH: Full updates only (backwards compatibility)
                    this.playerStateCache.setFull(p.id, p);
                    this.processPlayerUpdate(p);
                }
            });
            
            // MONSTER PROCESSING: Same pattern as players
            state.monsters.forEach(m => {
                if (this.ENABLE_DELTA_COMPRESSION && m._updateType) {
                    if (m._updateType === 'full') {
                        this.monsterStateCache.setFull(m.id, m);
                        this.game.addOrUpdateMonster(m);
                    } else if (m._updateType === 'delta') {
                        // CRITICAL: Merged state must include 'state' field for monster AI
                        const mergedState = this.monsterStateCache.applyDelta(m.id, m);
                        this.game.addOrUpdateMonster(mergedState);
                    }
                } else {
                    this.monsterStateCache.setFull(m.id, m);
                    this.game.addOrUpdateMonster(m);
                }
            });
            
            // Update projectiles
            if (state.projectiles && this.game.projectileRenderer) {
                state.projectiles.forEach(p => {
                    this.game.projectileRenderer.updateProjectile(p.id, p.x, p.y);
                });
            }
        });

        this.socket.on('playerAttack', data => {
            if (data.id !== this.id) {
                this.game.remotePlayerAttack(data.id, data.type, data.facing);
            }
        });

        // Monster events
        this.socket.on('monsterDamaged', (data) => {
            const monster = this.game.remoteMonsters?.get(data.monsterId);
            if (monster) {
                // Update HP but don't modify other state - server is authoritative
                monster.hitPoints = data.hp;
                monster.showDamageEffect?.();
                
                // Show damage number if we attacked it
                if (data.attacker === this.socket.id) {
                    this.game.showDamageNumber?.(monster.position, data.damage);
                }
                
                // Don't change state client-side - the server will send the state update
                // The stunned state will come through the normal state update pipeline
                // This prevents client-server state desync
            }
        });

        this.socket.on('monsterKilled', (data) => {
            const monster = this.game.remoteMonsters?.get(data.monsterId);
            if (monster) {
                monster.playDeathAnimation?.();
                // Clean up cached state after death animation
                setTimeout(() => {
                    this.monsterStateCache.remove(data.monsterId);
                }, 1000);
                
                // Show XP gain if we killed it
                if (data.killedBy === this.socket.id) {
                    this.game.showXpGain?.(monster.position, data.xpReward);
                    // Update local player XP and level through the stats component
                    if (this.game.entities.player && this.game.entities.player.stats) {
                        this.game.entities.player.experience = data.killerXp;
                        this.game.entities.player.level = data.killerLevel;
                        // Force the stats component to update by calling addExperience with 0
                        this.game.entities.player.stats.owner.experience = data.killerXp;
                        this.game.entities.player.stats.owner.level = data.killerLevel;
                    }
                }
            }
        });

        this.socket.on('playerDamaged', (data) => {
            if (data.playerId === this.socket.id) {
                // We took damage - sync HP and show damage effects
                if (this.game.entities.player) {
                    this.game.entities.player.hitPoints = data.hp;
                    // Show damage effects without applying damage again
                    this.game.entities.player.isTakingDamage = true;
                    this.game.entities.player.damageStunTimer = this.game.entities.player.damageStunDuration;
                    this.game.entities.player.animation.playDamageAnimation();
                }
            } else {
                // Another player took damage
                const remotePlayer = this.game.remotePlayers?.get(data.playerId);
                if (remotePlayer) {
                    remotePlayer.hitPoints = data.hp;
                    remotePlayer.showDamageEffect?.();
                }
            }
        });

        this.socket.on('playerKilled', (data) => {
            if (data.playerId === this.socket.id) {
                // We died
                // Player killed
                if (this.game.entities.player) {
                    this.game.entities.player.health.die();
                }
            } else {
                // Another player died
                const remotePlayer = this.game.remotePlayers?.get(data.playerId);
                if (remotePlayer) {
                    remotePlayer.health?.die();
                }
            }
        });

        this.socket.on('playerLevelUp', (data) => {
            if (data.playerId === this.socket.id) {
                // We leveled up
                // Level up!
                if (this.game.entities.player) {
                    const player = this.game.entities.player;
                    player.level = data.level;
                    player.hitPoints = data.hp;
                    
                    // Apply level bonuses from server
                    player.moveSpeedBonus = data.moveSpeedBonus || 0;
                    player.attackRecoveryBonus = data.attackRecoveryBonus || 0;
                    player.attackCooldownBonus = data.attackCooldownBonus || 0;
                    player.rollUnlocked = data.rollUnlocked || false;
                    
                    
                    // Update actual move speed
                    const baseSpeed = player.getClassMoveSpeed();
                    player.moveSpeed = baseSpeed + player.moveSpeedBonus;
                    
                    // Update stats component
                    if (player.stats) {
                        player.stats.owner.level = data.level;
                    }
                    
                    // Update max HP from server (important for level 10 bonus)
                    if (data.maxHp !== undefined) {
                        player.maxHitPoints = data.maxHp;
                        player.hitPoints = data.hp; // Server sends full HP on level up
                        // Force health UI update
                        if (this.game.healthUI) {
                            this.game.healthUI.update();
                        }
                    }
                    
                    // Update StatsUI to reflect new bonuses
                    if (this.game.statsUI) {
                        this.game.statsUI.update();
                    }
                    
                    // Play level up effect
                    player.playLevelUpEffect?.();
                }
            }
        });

        this.socket.on('playerRespawned', (data) => {
            if (data.playerId === this.socket.id) {
                // We respawned - reset our XP and level
                // Player respawned
                if (this.game.entities.player) {
                    const player = this.game.entities.player;
                    player.level = data.level;
                    player.experience = data.xp;
                    player.hitPoints = data.hp;
                    
                    // Reset bonuses
                    player.moveSpeedBonus = data.moveSpeedBonus || 0;
                    player.attackRecoveryBonus = data.attackRecoveryBonus || 0;
                    player.attackCooldownBonus = data.attackCooldownBonus || 0;
                    player.rollUnlocked = data.rollUnlocked || false;
                    
                    // Reset max HP to base class HP (no level 10 bonus after respawn)
                    if (data.maxHp !== undefined) {
                        player.maxHitPoints = data.maxHp;
                    }
                    
                    // Reset move speed to base
                    const baseSpeed = player.getClassMoveSpeed();
                    player.moveSpeed = baseSpeed + player.moveSpeedBonus;
                    
                    // Update stats component
                    if (player.stats) {
                        player.stats.owner.level = data.level;
                        player.stats.owner.experience = data.xp;
                    }
                    
                    // Trigger respawn in the player component
                    player.health.respawn();
                    // Force health UI update after respawn
                    if (this.game.healthUI) {
                        this.game.healthUI.update();
                    }
                }
            }
        });
        
        // Handle disconnection
        this.socket.on('disconnect', () => {
            this.connected = false;
            // Clear caches on disconnect
            this.playerStateCache.clear();
            this.monsterStateCache.clear();
            // Disconnected from server
        });
        
        // Handle connection errors
        this.socket.on('connect_error', (error) => {
            // Connection error
        });
        
        // Handle projectile events
        this.socket.on('projectileCreated', (data) => {
            if (this.game.projectileRenderer) {
                this.game.projectileRenderer.createProjectile(data);
            }
        });
        
        this.socket.on('projectileDestroyed', (data) => {
            if (this.game.projectileRenderer) {
                this.game.projectileRenderer.destroyProjectile(data.id, data.reason);
            }
        });
        
        // Handle ability events from server
        this.socket.on('playerAbilityStart', (data) => {
            // Handle movement abilities that need visual updates
            if (data.type === 'dash' || data.type === 'jump') {
                const isLocalPlayer = data.playerId === this.socket.id;
                const player = isLocalPlayer ? 
                    this.game.entities.player : 
                    this.game.remotePlayers?.get(data.playerId);
                    
                if (player) {
                    // The server controls the movement, we just need to handle visual effects
                    // and animation state
                    player.isAttacking = true;
                    player.currentAttackType = data.abilityKey;
                    
                    // Store the start position for effects
                    player.startPositionForAttack = { x: data.startX, y: data.startY };
                    
                    // For jump attacks, we don't need visual height changes in a 2D game
                    // The server handles all movement, we just need to track the ability state
                    if (data.type === 'jump' && player.sprite) {
                        // Store the jump data for ability tracking only
                        player.jumpData = {
                            startX: data.startX,
                            startY: data.startY,
                            endX: data.endX,
                            endY: data.endY,
                            startTime: Date.now(),
                            duration: data.duration,
                            backwardJump: data.backwardJump
                        };
                        
                        // No visual height animation - this is a 2D game
                        // The sprite position will be updated by normal position syncing
                    }
                }
            }
        });
        
        this.socket.on('playerAbilityComplete', (data) => {
            const isLocalPlayer = data.playerId === this.socket.id;
            const player = isLocalPlayer ? 
                this.game.entities.player : 
                this.game.remotePlayers?.get(data.playerId);
                
            if (player) {
                // Clear ability state
                if (player.jumpData) {
                    delete player.jumpData;
                }
                
                // End the attack state if needed
                if (player.combat && player.isAttacking) {
                    player.combat.endAttack();
                }
            }
        });
        
        // Handle ability damage events from server
        this.socket.on('playerAbilityDamage', (data) => {
            const isLocalPlayer = data.playerId === this.socket.id;
            const player = isLocalPlayer ? 
                this.game.entities.player : 
                this.game.remotePlayers?.get(data.playerId);
                
            if (player && this.game.systems?.combat) {
                // Create hitbox and apply damage
                const hitbox = this.game.systems.combat.createHitbox(
                    { x: data.x, y: data.y },
                    data.facing,
                    data.config.hitboxType,
                    data.config.hitboxParams,
                    { 
                        color: 0xFF0000, 
                        fillAlpha: 0.0, 
                        lineAlpha: 0.0, 
                        lineWidth: 3, 
                        duration: 0.2 
                    }
                );
                
                if (hitbox) {
                    // Only the attacking player applies damage
                    if (isLocalPlayer) {
                        this.game.systems.combat.applyHitEffects(player, hitbox, data.config.damage);
                    }
                }
            }
        });
    }

    sendMonsterDamage(monsterId, damage, attackType) {
        if (this.socket && this.socket.connected) {
            // Phase 3.1: Damage removed - server calculates damage based on attack type
            const message = {
                monsterId,
                attackType,
                timestamp: Date.now(),
                position: {
                    x: Math.round(this.game.entities.player.position.x),
                    y: Math.round(this.game.entities.player.position.y)
                }
            };
            this.socket.emit('attackMonster', message);
        }
    }

    sendPlayerUpdate(player) {
        this.socket.emit('playerUpdate', {
            x: player.position.x,
            y: player.position.y,
            facing: player.facing
        });
    }
    
    /**
     * Send input command to server for client-side prediction
     * @param {Object} inputCommand - Network input command from InputBuffer
     */
    sendPlayerInput(inputCommand) {
        if (!this.connected) {
            // Cannot send input - not connected
            return;
        }
        
        this.socket.emit('playerInput', inputCommand);
    }
    
    createProjectile(data) {
        if (!this.connected) {
            // Cannot create projectile - not connected
            return;
        }
        
        // Phase 3.1: Damage removed - server calculates projectile damage
        this.socket.emit('createProjectile', {
            x: data.x,
            y: data.y,
            angle: data.angle,
            speed: data.speed,
            range: data.range,
            effectType: data.effectType
        });
    }
    
    sendAbilityRequest(abilityType, extraData = {}) {
        if (!this.connected) {
            // Cannot send ability request - not connected
            return;
        }
        
        // Sending ability request to server
        this.socket.emit('executeAbility', {
            abilityType: abilityType,
            ...extraData
        });
    }
    
    // Jitter buffer methods removed - feature disabled for better performance
    
    /**
     * Process a single player state update (extracted from original state handler)
     * @param {Object} playerState - Player state from server
     */
    processPlayerUpdate(playerState) {
        if (playerState.id === this.id) {
            // PHASE 3: Use reconciler for server state updates
            if (this.game.entities.player && this.game.systems.reconciler) {
                const player = this.game.entities.player;
                
                // Perform reconciliation if we have sequence number
                if (playerState.lastProcessedSeq !== undefined) {
                    const reconciled = this.game.systems.reconciler.reconcile(playerState, player);
                    // Position reconciled by server
                } else {
                    // Server state missing lastProcessedSeq - using fallback
                    // Fallback to direct position update if no sequence
                    player.position.x = playerState.x;
                    player.position.y = playerState.y;
                    player.sprite.position.set(playerState.x, playerState.y);
                }
                
                // Update server position tracking
                if (!player.serverPosition) {
                    player.serverPosition = { x: playerState.x, y: playerState.y };
                } else {
                    player.serverPosition.x = playerState.x;
                    player.serverPosition.y = playerState.y;
                }
                
                // Sync non-position data from server
                player.facing = playerState.facing || player.facing;
                player.hitPoints = playerState.hp;
                player.level = playerState.level || player.level;
                player.experience = playerState.xp || player.experience;
                
                // Sync bonuses from server if they're included
                if (playerState.moveSpeedBonus !== undefined) {
                    player.moveSpeedBonus = playerState.moveSpeedBonus;
                    player.attackRecoveryBonus = playerState.attackRecoveryBonus;
                    player.attackCooldownBonus = playerState.attackCooldownBonus;
                    player.rollUnlocked = playerState.rollUnlocked;
                    // Update move speed if it changed
                    const baseSpeed = player.getClassMoveSpeed();
                    player.moveSpeed = baseSpeed + player.moveSpeedBonus;
                }
                
                // Also sync max HP if it changed
                if (playerState.maxHp !== undefined && player.maxHitPoints !== playerState.maxHp) {
                    player.maxHitPoints = playerState.maxHp;
                    if (this.game.healthUI) {
                        this.game.healthUI.update();
                    }
                }
            }
        } else {
            this.game.updateRemotePlayer(playerState);
        }
    }
    
    // processStateUpdate method removed - now handled directly in state handler
}
