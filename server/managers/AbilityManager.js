/**
 * @fileoverview AbilityManager - Server-side ability execution with defensive programming
 * 
 * SAFETY MEASURES:
 * - Extensive parameter validation to prevent undefined/null crashes
 * - Runtime type checking for all inputs
 * - Graceful error handling with logging
 * - Safe Map operations with existence checks
 * - Timeout cleanup to prevent memory leaks
 * - Config validation before execution
 * 
 * ARCHITECTURE ROLE:
 * - Manages ability execution with movement (dash, jump, projectile)
 * - Tracks active abilities and cooldowns per player
 * - Handles server-authoritative movement during abilities
 * - Coordinates with ProjectileManager for projectile abilities
 * 
 * MIGRATION SAFETY:
 * - This TypeScript version implements identical behavior to the JavaScript version
 * - All method signatures match exactly
 * - Added defensive checks for undefined/null parameters
 * - Extensive logging for debugging potential issues
 * - Safe timeout management to prevent memory leaks
 */

import { PLAYER_CONFIG } from '../../src/js/config/GameConfig.js';
import { directionStringToAngleRadians } from '../../src/js/utils/DirectionUtils.js';

// Socket.IO server interface
interface SocketIOServer {
    emit(event: string, data: any): void;
}

// Player interface (minimal for ability manager)
interface Player {
    id: string;
    x: number;
    y: number;
    hp: number;
    class: string;
    facing: string;
}

// Game state manager interface
interface GameStateManager {
    getPlayer(playerId: string): Player | null;
}

// Projectile manager interface
interface ProjectileManager {
    createProjectile(player: Player, config: ProjectileConfig): void;
}

// Attack configuration from PLAYER_CONFIG
interface AttackConfig {
    archetype: string;
    cooldown: number;
    damage: number;
    hitboxType: string;
    hitboxParams: any;
    dashDistance?: number;
    dashDuration?: number;
    jumpDuration?: number;
    windupTime: number;
    recoveryTime: number;
    backwardJump?: boolean;
    attackFromStartPosition?: boolean;
    actionPointDelay?: number;
    projectileSpeed?: number;
    projectileRange?: number;
    projectileVisualEffectType?: string;
}

// Active ability data
interface ActiveAbility {
    type: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    startTime: number;
    duration: number;
    config: AttackConfig;
    abilityType: string;
    backwardJump?: boolean;
}

// Projectile configuration
interface ProjectileConfig {
    x: number;
    y: number;
    angle: number;
    speed: number;
    damage: number;
    range: number;
    effectType: string;
}

// Ability execution data
interface AbilityData {
    angle?: number;
    [key: string]: any;
}

export class AbilityManager {
    private io: SocketIOServer;
    private gameState: GameStateManager;
    private projectileManager: ProjectileManager;
    private activeAbilities: Map<string, ActiveAbility>;
    private cooldowns: Map<string, number>;
    private activeTimeouts: Map<string, NodeJS.Timeout>;

    constructor(io: SocketIOServer, gameState: GameStateManager, projectileManager: ProjectileManager) {
        // Defensive parameter validation
        if (!io || typeof io.emit !== 'function') {
            throw new Error('[AbilityManager] Invalid io parameter - must have emit method');
        }
        if (!gameState || typeof gameState.getPlayer !== 'function') {
            throw new Error('[AbilityManager] Invalid gameState parameter - must have getPlayer method');
        }
        if (!projectileManager || typeof projectileManager.createProjectile !== 'function') {
            throw new Error('[AbilityManager] Invalid projectileManager parameter - must have createProjectile method');
        }

        this.io = io;
        this.gameState = gameState;
        this.projectileManager = projectileManager;
        this.activeAbilities = new Map();
        this.cooldowns = new Map();
        this.activeTimeouts = new Map();
        
        console.log('[AbilityManager] Initialized with defensive programming');
        console.log('[AbilityManager] TypeScript version loaded with timeout management');
    }

    executeAbility(playerId: string, abilityType: string, data: AbilityData = {}): void {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[AbilityManager] Invalid playerId provided to executeAbility:', playerId);
            return;
        }
        if (typeof abilityType !== 'string' || abilityType.length === 0) {
            console.warn('[AbilityManager] Invalid abilityType provided to executeAbility:', abilityType);
            return;
        }
        if (!data || typeof data !== 'object') {
            console.warn('[AbilityManager] Invalid data provided to executeAbility, using empty object');
            data = {};
        }

        try {
            const player = this.gameState.getPlayer(playerId);
            if (!player || typeof player.hp !== 'number' || player.hp <= 0) {
                console.log(`[AbilityManager] Player ${playerId} not found or dead, ignoring ability`);
                return;
            }

            // Check if player is already in an ability
            if (this.activeAbilities.has(playerId)) {
                console.log(`[AbilityManager] Player ${playerId} already executing ability`);
                return;
            }

            // Get attack config with validation
            const classSpecificKey = `${player.class}_${abilityType}`;
            const attackConfig = (PLAYER_CONFIG as any)?.attacks?.[classSpecificKey] || (PLAYER_CONFIG as any)?.attacks?.[abilityType];
            
            if (!attackConfig || typeof attackConfig !== 'object') {
                console.error(`[AbilityManager] Unknown ability type: ${abilityType} for class ${player.class}`);
                return;
            }

            // Validate critical config properties
            if (typeof attackConfig.cooldown !== 'number' || attackConfig.cooldown < 0) {
                console.error(`[AbilityManager] Invalid cooldown in config for ${abilityType}:`, attackConfig.cooldown);
                return;
            }

            // Check cooldown
            const cooldownKey = `${playerId}_${abilityType}`;
            const lastUsed = this.cooldowns.get(cooldownKey) || 0;
            const now = Date.now();
            
            if (now - lastUsed < attackConfig.cooldown) {
                console.log(`[AbilityManager] Ability ${abilityType} on cooldown for player ${playerId}`);
                return;
            }

            // Update cooldown
            this.cooldowns.set(cooldownKey, now);

            // Handle different ability archetypes
            switch (attackConfig.archetype) {
                case 'dash_attack':
                    this.executeDashAbility(player, attackConfig, abilityType);
                    break;
                case 'jump_attack':
                    this.executeJumpAbility(player, attackConfig, abilityType);
                    break;
                case 'projectile':
                    this.executeProjectileAbility(player, attackConfig, abilityType, data);
                    break;
                default:
                    console.log(`[AbilityManager] Non-movement ability ${abilityType} - client handles locally`);
            }
        } catch (error) {
            console.error('[AbilityManager] Error in executeAbility:', error);
        }
    }

    private executeDashAbility(player: Player, config: AttackConfig, abilityType: string): void {
        try {
            // Validate config for dash
            if (typeof config.dashDistance !== 'number' || config.dashDistance <= 0) {
                console.error('[AbilityManager] Invalid dashDistance in config:', config.dashDistance);
                return;
            }
            if (typeof config.dashDuration !== 'number' || config.dashDuration <= 0) {
                console.error('[AbilityManager] Invalid dashDuration in config:', config.dashDuration);
                return;
            }

            // Calculate dash destination with validation
            const angle = directionStringToAngleRadians(player.facing);
            if (typeof angle !== 'number' || isNaN(angle)) {
                console.error('[AbilityManager] Invalid angle calculated from facing:', player.facing);
                return;
            }

            const startX = player.x;
            const startY = player.y;
            const endX = startX + Math.cos(angle) * config.dashDistance;
            const endY = startY + Math.sin(angle) * config.dashDistance;

            // Store active ability
            this.activeAbilities.set(player.id, {
                type: 'dash',
                startX,
                startY,
                endX,
                endY,
                startTime: Date.now(),
                duration: config.dashDuration,
                config,
                abilityType
            });

            // Notify all clients of dash start
            this.io.emit('playerAbilityStart', {
                playerId: player.id,
                type: 'dash',
                abilityKey: abilityType,
                startX,
                startY,
                endX,
                endY,
                duration: config.dashDuration,
                facing: player.facing
            });

            // Schedule damage event (dash damage happens immediately at start)
            const windupTime = config.windupTime || 0;
            const damageTimeout = setTimeout(() => {
                try {
                    this.io.emit('playerAbilityDamage', {
                        playerId: player.id,
                        abilityType: abilityType,
                        x: startX,
                        y: startY,
                        facing: player.facing,
                        config: {
                            damage: config.damage,
                            hitboxType: config.hitboxType,
                            hitboxParams: config.hitboxParams
                        }
                    });
                } catch (error) {
                    console.error('[AbilityManager] Error in dash damage timeout:', error);
                }
            }, windupTime);

            // Store timeout for cleanup
            this.activeTimeouts.set(`${player.id}_damage`, damageTimeout);

            // Handle dash movement over time
            this.updateDashMovement(player.id);
        } catch (error) {
            console.error('[AbilityManager] Error in executeDashAbility:', error);
        }
    }

    private executeJumpAbility(player: Player, config: AttackConfig, abilityType: string): void {
        try {
            // Validate config for jump
            if (typeof config.dashDistance !== 'number' || config.dashDistance <= 0) {
                console.error('[AbilityManager] Invalid dashDistance in jump config:', config.dashDistance);
                return;
            }
            if (typeof config.jumpDuration !== 'number' || config.jumpDuration <= 0) {
                console.error('[AbilityManager] Invalid jumpDuration in config:', config.jumpDuration);
                return;
            }

            // Calculate jump destination with validation
            const angle = directionStringToAngleRadians(player.facing);
            if (typeof angle !== 'number' || isNaN(angle)) {
                console.error('[AbilityManager] Invalid angle calculated from facing:', player.facing);
                return;
            }

            let endX: number, endY: number;

            if (config.backwardJump) {
                // Jump backward
                const backAngle = angle + Math.PI;
                endX = player.x + Math.cos(backAngle) * config.dashDistance;
                endY = player.y + Math.sin(backAngle) * config.dashDistance;
            } else {
                // Jump forward
                endX = player.x + Math.cos(angle) * config.dashDistance;
                endY = player.y + Math.sin(angle) * config.dashDistance;
            }

            const startX = player.x;
            const startY = player.y;

            // Store active ability
            this.activeAbilities.set(player.id, {
                type: 'jump',
                startX,
                startY,
                endX,
                endY,
                startTime: Date.now(),
                duration: config.jumpDuration,
                config,
                backwardJump: config.backwardJump,
                abilityType
            });

            // Notify all clients of jump start
            this.io.emit('playerAbilityStart', {
                playerId: player.id,
                type: 'jump',
                abilityKey: abilityType,
                startX,
                startY,
                endX,
                endY,
                duration: config.jumpDuration,
                backwardJump: config.backwardJump,
                facing: player.facing
            });

            // Schedule damage event
            let damageDelay: number, attackPosition: { x: number, y: number };
            
            if (config.attackFromStartPosition) {
                // For attacks like Hunter's Retreat Shot - damage at start position right after windup
                damageDelay = config.windupTime || 0;
                attackPosition = { x: startX, y: startY };
            } else {
                // For normal jump attacks - damage at landing position
                damageDelay = (config.windupTime || 0) + (config.actionPointDelay || config.jumpDuration);
                attackPosition = { x: endX, y: endY };
            }
            
            const damageTimeout = setTimeout(() => {
                try {
                    this.io.emit('playerAbilityDamage', {
                        playerId: player.id,
                        abilityType: abilityType,
                        x: attackPosition.x,
                        y: attackPosition.y,
                        facing: player.facing,
                        config: {
                            damage: config.damage,
                            hitboxType: config.hitboxType,
                            hitboxParams: config.hitboxParams
                        }
                    });
                } catch (error) {
                    console.error('[AbilityManager] Error in jump damage timeout:', error);
                }
            }, damageDelay);

            // Store timeout for cleanup
            this.activeTimeouts.set(`${player.id}_damage`, damageTimeout);

            // Handle jump movement over time
            this.updateJumpMovement(player.id);
        } catch (error) {
            console.error('[AbilityManager] Error in executeJumpAbility:', error);
        }
    }

    private executeProjectileAbility(player: Player, config: AttackConfig, abilityType: string, data: AbilityData): void {
        try {
            // Validate windupTime
            const windupTime = config.windupTime || 0;
            if (typeof windupTime !== 'number' || windupTime < 0) {
                console.warn('[AbilityManager] Invalid windupTime in projectile config, using 0:', windupTime);
            }

            // Create projectile after windup
            const projectileTimeout = setTimeout(() => {
                try {
                    // Use player's current facing or provided angle
                    let angle: number;
                    if (typeof data.angle === 'number' && !isNaN(data.angle)) {
                        angle = data.angle;
                    } else {
                        angle = directionStringToAngleRadians(player.facing);
                        if (typeof angle !== 'number' || isNaN(angle)) {
                            console.error('[AbilityManager] Failed to calculate angle for projectile');
                            return;
                        }
                    }
                    
                    this.projectileManager.createProjectile(player, {
                        x: player.x,
                        y: player.y,
                        angle: angle,
                        speed: config.projectileSpeed || 700,
                        damage: config.damage || 1,
                        range: config.projectileRange || 600,
                        effectType: config.projectileVisualEffectType || 'bow_shot_effect'
                    });
                } catch (error) {
                    console.error('[AbilityManager] Error in projectile creation timeout:', error);
                }
            }, Math.max(windupTime, 0));

            // Store timeout for cleanup
            this.activeTimeouts.set(`${player.id}_projectile`, projectileTimeout);
        } catch (error) {
            console.error('[AbilityManager] Error in executeProjectileAbility:', error);
        }
    }

    private updateDashMovement(playerId: string): void {
        try {
            const ability = this.activeAbilities.get(playerId);
            if (!ability || ability.type !== 'dash') return;

            const player = this.gameState.getPlayer(playerId);
            if (!player) {
                this.activeAbilities.delete(playerId);
                this.cleanupPlayerTimeouts(playerId);
                return;
            }

            const now = Date.now();
            const elapsed = now - ability.startTime;
            const progress = Math.min(elapsed / ability.duration, 1);

            // Update player position with validation
            if (typeof ability.startX === 'number' && typeof ability.endX === 'number') {
                player.x = ability.startX + (ability.endX - ability.startX) * progress;
            }
            if (typeof ability.startY === 'number' && typeof ability.endY === 'number') {
                player.y = ability.startY + (ability.endY - ability.startY) * progress;
            }

            if (progress >= 1) {
                // Movement complete, but keep ability active during recovery
                const recoveryTime = ability.config.recoveryTime || 0;
                const windupTime = ability.config.windupTime || 0;
                const totalDuration = windupTime + ability.duration + recoveryTime;
                const totalElapsed = now - (ability.startTime - windupTime);
                
                if (totalElapsed >= totalDuration) {
                    // Full ability complete including recovery
                    this.activeAbilities.delete(playerId);
                    this.cleanupPlayerTimeouts(playerId);
                    this.io.emit('playerAbilityComplete', {
                        playerId: playerId,
                        type: 'dash'
                    });
                } else {
                    // Wait for recovery to finish
                    const nextUpdateTimeout = setTimeout(() => this.updateDashMovement(playerId), 16);
                    this.activeTimeouts.set(`${playerId}_dash_update`, nextUpdateTimeout);
                }
            } else {
                // Continue updating movement
                const nextUpdateTimeout = setTimeout(() => this.updateDashMovement(playerId), 16);
                this.activeTimeouts.set(`${playerId}_dash_update`, nextUpdateTimeout);
            }
        } catch (error) {
            console.error('[AbilityManager] Error in updateDashMovement:', error);
        }
    }

    private updateJumpMovement(playerId: string): void {
        try {
            const ability = this.activeAbilities.get(playerId);
            if (!ability || ability.type !== 'jump') return;

            const player = this.gameState.getPlayer(playerId);
            if (!player) {
                this.activeAbilities.delete(playerId);
                this.cleanupPlayerTimeouts(playerId);
                return;
            }

            const now = Date.now();
            const elapsed = now - ability.startTime;
            const progress = Math.min(elapsed / ability.duration, 1);

            // Update player position with validation
            if (typeof ability.startX === 'number' && typeof ability.endX === 'number') {
                player.x = ability.startX + (ability.endX - ability.startX) * progress;
            }
            if (typeof ability.startY === 'number' && typeof ability.endY === 'number') {
                player.y = ability.startY + (ability.endY - ability.startY) * progress;
            }

            if (progress >= 1) {
                // Movement complete, but keep ability active during recovery
                const recoveryTime = ability.config.recoveryTime || 0;
                const windupTime = ability.config.windupTime || 0;
                const totalDuration = windupTime + ability.duration + recoveryTime;
                const totalElapsed = now - (ability.startTime - windupTime);
                
                if (totalElapsed >= totalDuration) {
                    // Full ability complete including recovery
                    this.activeAbilities.delete(playerId);
                    this.cleanupPlayerTimeouts(playerId);
                    this.io.emit('playerAbilityComplete', {
                        playerId: playerId,
                        type: 'jump'
                    });
                } else {
                    // Wait for recovery to finish
                    const nextUpdateTimeout = setTimeout(() => this.updateJumpMovement(playerId), 16);
                    this.activeTimeouts.set(`${playerId}_jump_update`, nextUpdateTimeout);
                }
            } else {
                // Continue updating movement
                const nextUpdateTimeout = setTimeout(() => this.updateJumpMovement(playerId), 16);
                this.activeTimeouts.set(`${playerId}_jump_update`, nextUpdateTimeout);
            }
        } catch (error) {
            console.error('[AbilityManager] Error in updateJumpMovement:', error);
        }
    }

    private cleanupPlayerTimeouts(playerId: string): void {
        try {
            // Clean up all timeouts related to this player
            const timeoutKeysToDelete: string[] = [];
            this.activeTimeouts.forEach((timeout, key) => {
                if (key.startsWith(playerId + '_')) {
                    clearTimeout(timeout);
                    timeoutKeysToDelete.push(key);
                }
            });
            
            timeoutKeysToDelete.forEach(key => {
                this.activeTimeouts.delete(key);
            });
        } catch (error) {
            console.error('[AbilityManager] Error in cleanupPlayerTimeouts:', error);
        }
    }

    // Clean up disconnected players
    removePlayer(playerId: string): void {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[AbilityManager] Invalid playerId provided to removePlayer:', playerId);
            return;
        }

        try {
            this.activeAbilities.delete(playerId);
            this.cleanupPlayerTimeouts(playerId);
            
            // Clean up cooldowns for this player
            const cooldownKeys = Array.from(this.cooldowns.keys());
            cooldownKeys.forEach(key => {
                if (key.startsWith(playerId + '_')) {
                    this.cooldowns.delete(key);
                }
            });
            
            console.log(`[AbilityManager] Cleaned up player ${playerId} - abilities, timeouts, and cooldowns removed`);
        } catch (error) {
            console.error('[AbilityManager] Error in removePlayer:', error);
        }
    }
}