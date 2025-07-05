// server/systems/DamageProcessor.ts
import { GAME_CONSTANTS, PLAYER_STATS } from '../../shared/constants/GameConstants.js';
import { CalculationEngine } from './CalculationEngine.js';
import type { 
    PlayerState, 
    MonsterState, 
    ProjectileState, 
    CharacterClass, 
    MonsterType 
} from '../../shared/types/GameTypes.js';

// Type definitions for dependencies
interface GameState {
    players: Map<string, PlayerState>;
    [key: string]: any;
}

interface MonsterManager {
    monsters: Map<string, MonsterState>;
    [key: string]: any;
}

interface SocketHandler {
    [key: string]: any;
}

interface SocketIO {
    emit(event: string, data: any): void;
}

type DamageType = 'melee' | 'projectile' | 'environmental';
type EntityType = 'player' | 'monster' | 'projectile' | 'unknown';

interface DamageResult {
    success: boolean;
    error?: string;
    actualDamage?: number;
    killed?: boolean;
    targetHp?: number;
}

interface DamageMetadata {
    [key: string]: any;
}

export class DamageProcessor {
    private gameState: GameState;
    private monsterManager: MonsterManager;
    private socketHandler: SocketHandler;
    private io: SocketIO;

    constructor(gameState: GameState, monsterManager: MonsterManager, socketHandler: SocketHandler, io: SocketIO) {
        this.gameState = gameState;
        this.monsterManager = monsterManager;
        this.socketHandler = socketHandler;
        this.io = io;
    }

    /**
     * Apply damage from any source to any target
     * @param source - The entity dealing damage
     * @param target - The entity receiving damage
     * @param damage - Amount of damage to apply
     * @param damageType - Type of damage
     * @param metadata - Additional damage information
     * @returns Result of damage application
     */
    applyDamage(
        source: PlayerState | MonsterState | ProjectileState, 
        target: PlayerState | MonsterState, 
        damage: number, 
        damageType: DamageType, 
        metadata: DamageMetadata = {}
    ): DamageResult {
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
            return this._applyDamageToPlayer(source, target as PlayerState, damage, damageType, metadata);
        } else if (targetType === 'monster') {
            return this._applyDamageToMonster(source, target as MonsterState, damage, damageType, metadata);
        }

        return { success: false, error: 'Unknown target type' };
    }

    private _getEntityType(entity: PlayerState | MonsterState | ProjectileState | any): EntityType {
        // Players have characterClass field, monsters have type field
        if ('characterClass' in entity) return 'player';
        if ('type' in entity && entity.type === 'projectile') return 'projectile';
        if ('type' in entity && 'hp' in entity) return 'monster';
        // Legacy: support old 'class' field for backwards compatibility
        if ('class' in entity) return 'player';
        return 'unknown';
    }

    private _applyDamageToPlayer(
        source: PlayerState | MonsterState | ProjectileState, 
        player: PlayerState, 
        damage: number, 
        damageType: DamageType, 
        metadata: DamageMetadata
    ): DamageResult {
        // Check spawn protection (using timer and invulnerable flag)
        const playerWithProtection = player as any; // Allow access to legacy fields
        if (playerWithProtection.spawnProtectionTimer > 0 || playerWithProtection.invulnerable) {
            return { success: false, error: 'Player has spawn protection' };
        }

        // Apply damage
        const previousHp = player.hp;
        player.hp = Math.max(0, player.hp - damage);
        const actualDamage = previousHp - player.hp;

        // Emit damage event with proper source format
        let sourceString: string;
        const sourceType = this._getEntityType(source);
        if (sourceType === 'monster') {
            const monsterSource = source as MonsterState;
            sourceString = `${monsterSource.type}_${monsterSource.id}`;
        } else if (sourceType === 'projectile') {
            const projectileSource = source as any; // ProjectileState might have legacy fields
            sourceString = `${projectileSource.ownerType || projectileSource.id}_projectile`;
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

    private _applyDamageToMonster(
        source: PlayerState | MonsterState | ProjectileState, 
        monster: MonsterState, 
        damage: number, 
        damageType: DamageType, 
        metadata: DamageMetadata
    ): DamageResult {
        // Apply damage
        const previousHp = monster.hp;
        monster.hp = Math.max(0, monster.hp - damage);
        const actualDamage = previousHp - monster.hp;

        // Apply stun effect (0.36 seconds as per existing behavior)
        const stunDuration = GAME_CONSTANTS.MONSTER?.DAMAGE_STUN_DURATION || 0.5;
        if (stunDuration > 0) {
            const monsterWithStun = monster as any; // Allow access to stun fields
            monsterWithStun.stunTimer = stunDuration;
            monsterWithStun.isStunned = true;
            monster.state = 'idle'; // Reset to idle instead of 'stunned' which isn't in the type
            
            // Interrupt any ongoing attack
            if (monsterWithStun.isAttackAnimating) {
                monsterWithStun.isAttackAnimating = false;
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

    private _handlePlayerDeath(player: PlayerState, source: PlayerState | MonsterState | ProjectileState): void {
        const playerWithDeathFields = player as any; // Allow access to legacy death fields
        playerWithDeathFields.isAlive = false;
        playerWithDeathFields.deathTime = Date.now();

        // Set respawn timer (3 seconds)
        playerWithDeathFields.respawnTime = Date.now() + (GAME_CONSTANTS.PLAYER.RESPAWN_TIME || 3000);

        // Emit death event
        this.io.emit('playerKilled', {
            playerId: player.id,
            killerId: source.id || (source as any).monsterId,
            killerType: this._getEntityType(source) === 'monster' ? (source as MonsterState).type : this._getEntityType(source)
        });

        console.log(`Player ${player.id} killed by ${this._getEntityType(source)} ${source.id || (source as any).monsterId}`);
    }

    private _handleMonsterDeath(monster: MonsterState, source: PlayerState | MonsterState | ProjectileState): void {
        // Award XP if killed by player
        if ('characterClass' in source || 'class' in source) { // It's a player
            const player = source as PlayerState;
            const xpReward = this._getMonsterXpReward(monster.type);
            const playerWithXp = player as any; // Allow access to xp field
            playerWithXp.xp = (playerWithXp.xp || 0) + xpReward;

            // Check for level up
            this._checkPlayerLevelUp(player);

            // Emit monster killed event with all expected fields
            this.io.emit('monsterKilled', {
                monsterId: monster.id,  // Use monster.id not monster.monsterId
                killedBy: player.id,    // Client expects 'killedBy' not 'killerId'
                xpReward: xpReward,
                killerXp: playerWithXp.xp,    // Client needs current XP
                killerLevel: player.level // Client needs current level
            });
        }

        // Mark monster as dying and schedule removal
        monster.state = 'dying';
        setTimeout(() => {
            this.monsterManager.monsters.delete(monster.id);
        }, 1000);
    }

    private _getMonsterXpReward(monsterType: MonsterType): number {
        // XP rewards from existing code
        const xpRewards: Record<MonsterType, number> = {
            'ogre': 10,
            'skeleton': 15,
            'elemental': 25,
            'ghoul': 20,
            'wildarcher': 30
        };
        return xpRewards[monsterType] || 10;
    }

    private _checkPlayerLevelUp(player: PlayerState): void {
        const previousLevel = player.level || 1;
        const xpForNextLevel = this._getXpForLevel(previousLevel + 1);
        const playerWithXp = player as any; // Allow access to xp field

        if (playerWithXp.xp >= xpForNextLevel && previousLevel < GAME_CONSTANTS.LEVELS.MAX_LEVEL) {
            player.level = previousLevel + 1;
            

            // Apply level bonuses using CalculationEngine (the correct way)
            const oldLevel = previousLevel;
            const newLevel = player.level;
            
            // Use the proper CalculationEngine method for level bonuses
            CalculationEngine.applyLevelBonuses(player, oldLevel, newLevel);
            
            // Update max HP using CalculationEngine (only +1 at level 10)
            const newMaxHp = CalculationEngine.calculateMaxHP(player.characterClass, newLevel);
            if (newMaxHp > player.maxHp) {
                player.maxHp = newMaxHp;
            }
            
            // Full heal on level up
            player.hp = player.maxHp;
            
            
            // Emit level up event with all expected fields
            this.io.emit('playerLevelUp', {
                playerId: player.id,
                level: player.level,        // Client expects 'level' not 'newLevel'
                hp: player.hp,              // Current HP (full heal)
                maxHp: player.maxHp,
                moveSpeedBonus: player.moveSpeedBonus,
                attackRecoveryBonus: player.attackRecoveryBonus,
                attackCooldownBonus: player.attackCooldownBonus,
                rollUnlocked: player.rollUnlocked
            });
        }
    }

    private _getXpForLevel(level: number): number {
        // Use CalculationEngine to calculate XP requirements properly
        if (level <= 1) return 0;
        
        const usePlaytestMode = GAME_CONSTANTS.LEVELS.PLAYTEST_MODE;
        const maxLevel = GAME_CONSTANTS.LEVELS.MAX_LEVEL;
        const xpGrowth = GAME_CONSTANTS.LEVELS.XP_GROWTH;
        const playtestXpPerLevel = GAME_CONSTANTS.LEVELS.PLAYTEST_XP_PER_LEVEL;
        
        if (usePlaytestMode) {
            // Playtest mode: (level - 1) * 20 XP
            return (level - 1) * playtestXpPerLevel;
        }
        
        // Normal mode: Triangular progression (same as CalculationEngine)
        let totalXPRequired = 0;
        for (let i = 1; i < level; i++) {
            totalXPRequired += i * xpGrowth;
        }
        return totalXPRequired;
    }
}