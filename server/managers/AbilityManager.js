import { PLAYER_CONFIG } from '../../src/js/config/GameConfig.js';
import { directionStringToAngleRadians } from '../../src/js/utils/DirectionUtils.js';

export class AbilityManager {
    constructor(io, gameState, projectileManager) {
        this.io = io;
        this.gameState = gameState;
        this.projectileManager = projectileManager;
        this.activeAbilities = new Map(); // Track active movement abilities
        this.cooldowns = new Map(); // Track ability cooldowns per player
    }

    executeAbility(playerId, abilityType, data = {}) {
        const player = this.gameState.getPlayer(playerId);
        if (!player || player.hp <= 0) return;

        // Check if player is already in an ability
        if (this.activeAbilities.has(playerId)) {
            console.log(`Player ${playerId} already executing ability`);
            return;
        }

        // Get attack config
        const classSpecificKey = `${player.class}_${abilityType}`;
        const attackConfig = PLAYER_CONFIG.attacks[classSpecificKey] || PLAYER_CONFIG.attacks[abilityType];
        
        if (!attackConfig) {
            console.error(`Unknown ability type: ${abilityType} for class ${player.class}`);
            return;
        }

        // Check cooldown
        const cooldownKey = `${playerId}_${abilityType}`;
        const lastUsed = this.cooldowns.get(cooldownKey) || 0;
        const now = Date.now();
        
        if (now - lastUsed < attackConfig.cooldown) {
            console.log(`Ability ${abilityType} on cooldown for player ${playerId}`);
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
                console.log(`Non-movement ability ${abilityType} - client handles locally`);
        }
    }

    executeDashAbility(player, config, abilityType) {
        // Calculate dash destination
        const angle = directionStringToAngleRadians(player.facing);
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
            config
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
            duration: config.dashDuration
        });

        // Handle dash movement over time
        this.updateDashMovement(player.id);
    }

    executeJumpAbility(player, config, abilityType) {
        // Calculate jump destination
        const angle = directionStringToAngleRadians(player.facing);
        let endX, endY;

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
            backwardJump: config.backwardJump
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
            backwardJump: config.backwardJump
        });

        // Handle jump movement over time
        this.updateJumpMovement(player.id);
    }

    executeProjectileAbility(player, config, abilityType, data) {
        // Create projectile after windup
        setTimeout(() => {
            // Use player's current facing or provided angle
            const angle = data.angle !== undefined ? data.angle : directionStringToAngleRadians(player.facing);
            
            this.projectileManager.createProjectile(player, {
                x: player.x,
                y: player.y,
                angle: angle,
                speed: config.projectileSpeed || 700,
                damage: config.damage || 1,
                range: config.projectileRange || 600,
                effectType: config.projectileVisualEffectType || 'bow_shot_effect'
            });
        }, config.windupTime);
    }

    updateDashMovement(playerId) {
        const ability = this.activeAbilities.get(playerId);
        if (!ability || ability.type !== 'dash') return;

        const player = this.gameState.getPlayer(playerId);
        if (!player) {
            this.activeAbilities.delete(playerId);
            return;
        }

        const now = Date.now();
        const elapsed = now - ability.startTime;
        const progress = Math.min(elapsed / ability.duration, 1);

        // Update player position
        player.x = ability.startX + (ability.endX - ability.startX) * progress;
        player.y = ability.startY + (ability.endY - ability.startY) * progress;

        if (progress >= 1) {
            // Dash complete
            this.activeAbilities.delete(playerId);
            this.io.emit('playerAbilityComplete', {
                playerId: playerId,
                type: 'dash'
            });
        } else {
            // Continue updating
            setTimeout(() => this.updateDashMovement(playerId), 16); // ~60fps updates
        }
    }

    updateJumpMovement(playerId) {
        const ability = this.activeAbilities.get(playerId);
        if (!ability || ability.type !== 'jump') return;

        const player = this.gameState.getPlayer(playerId);
        if (!player) {
            this.activeAbilities.delete(playerId);
            return;
        }

        const now = Date.now();
        const elapsed = now - ability.startTime;
        const progress = Math.min(elapsed / ability.duration, 1);

        // Update player position (no height on server, just X/Y)
        player.x = ability.startX + (ability.endX - ability.startX) * progress;
        player.y = ability.startY + (ability.endY - ability.startY) * progress;

        if (progress >= 1) {
            // Jump complete
            this.activeAbilities.delete(playerId);
            this.io.emit('playerAbilityComplete', {
                playerId: playerId,
                type: 'jump'
            });
        } else {
            // Continue updating
            setTimeout(() => this.updateJumpMovement(playerId), 16); // ~60fps updates
        }
    }

    // Clean up disconnected players
    removePlayer(playerId) {
        this.activeAbilities.delete(playerId);
        
        // Clean up cooldowns for this player
        const cooldownKeys = Array.from(this.cooldowns.keys());
        cooldownKeys.forEach(key => {
            if (key.startsWith(playerId + '_')) {
                this.cooldowns.delete(key);
            }
        });
    }
}