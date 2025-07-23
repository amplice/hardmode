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
import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';
import { HitboxType } from '../../shared/types/GameTypes.js';

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
    username?: string;
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
                case 'standard_melee':
                    this.executeStandardMeleeAbility(player, attackConfig, abilityType);
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
            const startFacing = player.facing;
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
                facing: startFacing
            });

            // Schedule damage event (dash damage happens immediately at start)
            const windupTime = config.windupTime || 0;
            const damageTimeout = setTimeout(() => {
                try {
                    const damageData = {
                        playerId: player.id,
                        abilityType: abilityType,
                        x: startX,
                        y: startY,
                        facing: startFacing,
                        config: {
                            damage: config.damage + ((player as any).damageBonus || 0),
                            hitboxType: config.hitboxType,
                            hitboxParams: config.hitboxParams
                        }
                    };
                    this.io.emit('playerAbilityDamage', damageData);
                    
                    // Check for PvP hits
                    this.checkPvPHits(player, damageData);
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
                    const damageData = {
                        playerId: player.id,
                        abilityType: abilityType,
                        x: attackPosition.x,
                        y: attackPosition.y,
                        facing: player.facing,
                        config: {
                            damage: config.damage + ((player as any).damageBonus || 0),
                            hitboxType: config.hitboxType,
                            hitboxParams: config.hitboxParams
                        }
                    };
                    this.io.emit('playerAbilityDamage', damageData);
                    
                    // Check for PvP hits
                    this.checkPvPHits(player, damageData);
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

    private executeStandardMeleeAbility(player: Player, config: AttackConfig, abilityType: string): void {
        try {
            // Capture position and facing at ability start
            const startX = player.x;
            const startY = player.y;
            const startFacing = player.facing;
            
            // Schedule damage event after windup
            const windupTime = config.windupTime || 0;
            const damageTimeout = setTimeout(() => {
                try {
                    const damageData = {
                        playerId: player.id,
                        abilityType: abilityType,
                        x: startX,  // Use position at ability start
                        y: startY,  // Use position at ability start
                        facing: startFacing,  // Use facing at ability start
                        config: {
                            damage: config.damage + ((player as any).damageBonus || 0),
                            hitboxType: config.hitboxType,
                            hitboxParams: config.hitboxParams
                        }
                    };
                    this.io.emit('playerAbilityDamage', damageData);
                    
                    // Check for PvP hits
                    this.checkPvPHits(player, damageData);
                } catch (error) {
                    console.error('[AbilityManager] Error in standard melee damage timeout:', error);
                }
            }, windupTime);
            
            // Store timeout for cleanup
            this.activeTimeouts.set(`${player.id}_damage`, damageTimeout);
            
            // Set cooldown
            const cooldownKey = `${player.id}_${abilityType}`;
            this.cooldowns.set(cooldownKey, Date.now() + config.cooldown);
            
        } catch (error) {
            console.error('[AbilityManager] Error in executeStandardMeleeAbility:', error);
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
                        damage: (config.damage || 1) + ((player as any).damageBonus || 0),
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

    // Check for PvP hits when an ability damages
    private checkPvPHits(attacker: Player, damageData: any): void {
        // Check if PvP is enabled
        if (!GAME_CONSTANTS.PVP.ENABLED) {
            return;
        }
        
        // Get all players to check for hits
        const players = (this.gameState as any).players as Map<string, any>;
        if (!players || players.size === 0) {
            return;
        }
        
        let hitCount = 0;
        const maxTargets = GAME_CONSTANTS.PVP.MAX_TARGETS_PER_ABILITY;
        
        // Check each player for hits
        for (const [targetId, targetPlayer] of players) {
            // Skip self
            if (targetId === attacker.id) {
                continue;
            }
            
            // Skip dead players
            if (targetPlayer.hp <= 0) {
                continue;
            }
            
            // Skip invulnerable players
            if (targetPlayer.invulnerable) {
                continue;
            }
            
            // Check if target is in hitbox
            if (this.isPlayerInHitbox(targetPlayer, damageData)) {
                // Apply PvP damage
                this.applyPvPDamage(attacker, targetPlayer, damageData.config.damage);
                
                hitCount++;
                if (hitCount >= maxTargets) {
                    break;
                }
            }
        }
    }
    
    // Check if a player is within an ability's hitbox
    private isPlayerInHitbox(player: any, damageData: any): boolean {
        const hitboxType = damageData.config.hitboxType as HitboxType;
        const params = damageData.config.hitboxParams;
        const playerRadius = GAME_CONSTANTS.PLAYER.COLLISION_RADIUS;
        
        switch (hitboxType) {
            case 'rectangle':
                // Rectangle hitbox check with facing direction
                return this.checkRectangleHit(
                    damageData.x, damageData.y, 
                    damageData.facing,
                    params.width, params.length,
                    player.x, player.y, playerRadius
                );
                
            case 'circle':
                // Circle hitbox check
                const dx = player.x - damageData.x;
                const dy = player.y - damageData.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance <= params.radius + playerRadius;
                
            case 'cone':
                // Cone hitbox check
                return this.checkConeHit(
                    damageData.x, damageData.y,
                    damageData.facing,
                    params.range, params.angle,
                    player.x, player.y, playerRadius
                );
                
            default:
                return false;
        }
    }
    
    // Rectangle hitbox collision check
    private checkRectangleHit(
        x: number, y: number, facing: string,
        width: number, length: number,
        targetX: number, targetY: number, targetRadius: number
    ): boolean {
        // Convert facing to angle (add PI/2 to match client-side rotation)
        const angle = directionStringToAngleRadians(facing) + Math.PI / 2;
        
        // Translate target position to local coordinates
        const dx = targetX - x;
        const dy = targetY - y;
        
        // Rotate to align with rectangle
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        // Check bounds with radius (rectangle extends from -length to 0 in local Y)
        return localX >= -width/2 - targetRadius &&
               localX <= width/2 + targetRadius &&
               localY >= -length - targetRadius &&
               localY <= 0 + targetRadius;
    }
    
    // Cone hitbox collision check
    private checkConeHit(
        x: number, y: number, facing: string,
        range: number, angleDegrees: number,
        targetX: number, targetY: number, targetRadius: number
    ): boolean {
        // Distance check
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > range + targetRadius) {
            return false;
        }
        
        // Angle check
        const facingAngle = directionStringToAngleRadians(facing);
        const angleToTarget = Math.atan2(dy, dx);
        
        // Normalize angle difference
        let angleDiff = angleToTarget - facingAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        const halfAngle = (angleDegrees / 2) * (Math.PI / 180);
        return Math.abs(angleDiff) <= halfAngle;
    }
    
    // Apply damage from one player to another
    private applyPvPDamage(attacker: Player, target: any, damage: number): void {
        // Apply PvP damage multiplier
        const finalDamage = Math.floor(damage * GAME_CONSTANTS.PVP.DAMAGE_MULTIPLIER);
        
        // Apply damage to target
        target.hp = Math.max(0, target.hp - finalDamage);
        
        // Emit damage event
        this.io.emit('playerDamaged', {
            playerId: target.id,
            damage: finalDamage,
            hp: target.hp,
            source: {
                type: 'player',
                id: attacker.id,
                class: attacker.class,
                username: attacker.username
            }
        });
        
        // Handle death
        if (target.hp <= 0) {
            this.io.emit('playerKilled', {
                victimId: target.id,
                victimClass: target.class || target.characterClass,
                victimUsername: target.username || `Player ${target.id}`,
                killerId: attacker.id,
                killerClass: attacker.class,
                killerUsername: attacker.username || `Player ${attacker.id}`
            });
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