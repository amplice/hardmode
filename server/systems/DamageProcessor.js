// server/systems/DamageProcessor.js
import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';

export class DamageProcessor {
    constructor(gameState, monsterManager, socketHandler, io) {
        this.gameState = gameState;
        this.monsterManager = monsterManager;
        this.socketHandler = socketHandler;
        this.io = io;
    }

    /**
     * Apply damage from any source to any target
     * @param {Object} source - The entity dealing damage
     * @param {Object} target - The entity receiving damage
     * @param {number} damage - Amount of damage to apply
     * @param {'melee'|'projectile'|'environmental'} damageType - Type of damage
     * @param {Object} metadata - Additional damage information
     * @returns {Object} Result of damage application
     */
    applyDamage(source, target, damage, damageType, metadata = {}) {
        // Validate inputs
        if (!source || !target) {
            console.error('DamageProcessor: Invalid source or target', { source, target });
            return { success: false, error: 'Invalid source or target' };
        }

        if (typeof damage !== 'number' || damage < 0) {
            console.error('DamageProcessor: Invalid damage value', damage);
            return { success: false, error: 'Invalid damage value' };
        }

        // Check if target is alive
        if (target.hp <= 0) {
            return { success: false, error: 'Target already dead' };
        }

        // Determine target type
        const targetType = this._getEntityType(target);
        const sourceType = this._getEntityType(source);

        // Apply damage based on target type
        if (targetType === 'player') {
            return this._applyDamageToPlayer(source, target, damage, damageType, metadata);
        } else if (targetType === 'monster') {
            return this._applyDamageToMonster(source, target, damage, damageType, metadata);
        }

        return { success: false, error: 'Unknown target type' };
    }

    _getEntityType(entity) {
        // Players have socketId, monsters have id and type
        if (entity.socketId !== undefined) return 'player';
        if (entity.id !== undefined && entity.type && entity.hp !== undefined && !entity.socketId) return 'monster';
        if (entity.type === 'projectile') return 'projectile';
        return 'unknown';
    }

    _applyDamageToPlayer(source, player, damage, damageType, metadata) {
        // Check spawn protection
        const currentTime = Date.now();
        if (player.spawnProtectionUntil && currentTime < player.spawnProtectionUntil) {
            return { success: false, error: 'Player has spawn protection' };
        }

        // Check invulnerability
        if (player.invulnerable) {
            return { success: false, error: 'Player is invulnerable' };
        }

        // Apply damage
        const previousHp = player.hp;
        player.hp = Math.max(0, player.hp - damage);
        const actualDamage = previousHp - player.hp;

        // Emit damage event with proper source format
        let sourceString;
        const sourceType = this._getEntityType(source);
        if (sourceType === 'monster') {
            sourceString = `${source.type}_${source.id}`;
        } else if (sourceType === 'projectile') {
            sourceString = `${source.ownerType || source.id}_projectile`;
        } else {
            sourceString = source.id || 'unknown';
        }
        
        this.io.emit('playerDamaged', {
            playerId: player.id,
            damage: actualDamage,
            hp: player.hp,
            source: sourceString
        });

        // Check for death
        if (player.hp <= 0) {
            this._handlePlayerDeath(player, source);
        }

        return {
            success: true,
            actualDamage,
            killed: player.hp <= 0,
            targetHp: player.hp
        };
    }

    _applyDamageToMonster(source, monster, damage, damageType, metadata) {
        // Apply damage
        const previousHp = monster.hp;
        monster.hp = Math.max(0, monster.hp - damage);
        const actualDamage = previousHp - monster.hp;

        // Apply stun effect (0.36 seconds as per existing behavior)
        const stunDuration = GAME_CONSTANTS.MONSTER?.DAMAGE_STUN_DURATION || 0.5;
        if (stunDuration > 0) {
            monster.stunTimer = stunDuration;
            monster.isStunned = true;
            monster.state = 'stunned';
            
            // Interrupt any ongoing attack
            if (monster.isAttackAnimating) {
                monster.isAttackAnimating = false;
            }
        }
        
        // Emit damage event
        this.io.emit('monsterDamaged', {
            monsterId: monster.id,
            damage: actualDamage,
            hp: monster.hp,
            attacker: source.id,
            stunned: true
        });

        // Check for death
        if (monster.hp <= 0) {
            this._handleMonsterDeath(monster, source);
        }

        return {
            success: true,
            actualDamage,
            killed: monster.hp <= 0,
            targetHp: monster.hp
        };
    }

    _handlePlayerDeath(player, source) {
        player.isAlive = false;
        player.deathTime = Date.now();

        // Set respawn timer (3 seconds)
        player.respawnTime = Date.now() + (GAME_CONSTANTS.PLAYER.RESPAWN_TIME || 3000);

        // Emit death event
        this.io.emit('playerKilled', {
            playerId: player.id,
            killerId: source.id || source.monsterId,
            killerType: this._getEntityType(source) === 'monster' ? source.type : this._getEntityType(source)
        });

        console.log(`Player ${player.id} killed by ${this._getEntityType(source)} ${source.id || source.monsterId}`);
    }

    _handleMonsterDeath(monster, source) {
        // Award XP if killed by player
        if (source.socketId !== undefined) { // It's a player
            const xpReward = this._getMonsterXpReward(monster.type);
            source.xp = (source.xp || 0) + xpReward;

            // Check for level up
            this._checkPlayerLevelUp(source);

            // Emit monster killed event
            this.io.emit('monsterKilled', {
                monsterId: monster.monsterId,
                killerId: source.id,
                xpReward: xpReward
            });
        }

        // Mark monster as dying and schedule removal
        monster.state = 'dying';
        setTimeout(() => {
            this.monsterManager.monsters.delete(monster.id);
        }, 1000);
    }

    _getMonsterXpReward(monsterType) {
        // XP rewards from existing code
        const xpRewards = {
            'ogre': 10,
            'skeleton': 15,
            'elemental': 25,
            'ghoul': 20,
            'wildArcher': 30
        };
        return xpRewards[monsterType] || 10;
    }

    _checkPlayerLevelUp(player) {
        const previousLevel = player.level || 1;
        const xpForNextLevel = this._getXpForLevel(previousLevel + 1);

        if (player.xp >= xpForNextLevel && previousLevel < GAME_CONSTANTS.PLAYER.MAX_LEVEL) {
            player.level = previousLevel + 1;
            
            // Update max HP based on level
            player.maxHp = this._getMaxHpForLevel(player.level);
            
            // Full heal on level up
            player.hp = player.maxHp;

            // Emit level up event
            this.io.emit('playerLevelUp', {
                playerId: player.id,
                newLevel: player.level,
                maxHp: player.maxHp
            });

            console.log(`Player ${player.id} leveled up to ${player.level}`);
        }
    }

    _getXpForLevel(level) {
        // XP requirements from existing code
        const xpTable = {
            1: 0,
            2: 100,
            3: 250,
            4: 500,
            5: 1000,
            6: 1750,
            7: 2750,
            8: 4000,
            9: 5500,
            10: 7500
        };
        return xpTable[level] || 0;
    }

    _getMaxHpForLevel(level) {
        // HP progression from existing code
        if (level === 10) return 35; // Special case for level 10
        return 18 + level; // Base HP + level
    }
}