/**
 * Entity Factory Functions
 * 
 * These factory functions ensure all game entities have required fields,
 * preventing the undefined field bugs that caused movement speed desync.
 * 
 * All factories follow these principles:
 * 1. Every field in the corresponding TypeScript interface must be provided
 * 2. Required parameters are explicitly validated
 * 3. Default values are provided for optional fields
 * 4. Factory functions return complete, valid objects
 */

import { MONSTER_STATS } from '../constants/GameConstants.js';

// Shared player class configuration for factories
// Note: This duplicates some data from GameConfig.js but ensures shared access
const PLAYER_CLASS_STATS = {
    bladedancer: { hitPoints: 3, moveSpeed: 5 },
    guardian: { hitPoints: 4, moveSpeed: 3.5 },
    hunter: { hitPoints: 1, moveSpeed: 5 },
    rogue: { hitPoints: 2, moveSpeed: 6 }
};

/**
 * Creates a complete PlayerState object with all required fields
 * Prevents the undefined moveSpeed/level bugs we experienced
 */
export function createPlayerState(options) {
    // Validate required parameters
    if (!options.id) throw new Error('Player ID is required');
    if (!options.characterClass) throw new Error('Character class is required');
    if (typeof options.x !== 'number') throw new Error('Player x position is required');
    if (typeof options.y !== 'number') throw new Error('Player y position is required');
    
    // Get class configuration
    const classConfig = PLAYER_CLASS_STATS[options.characterClass];
    if (!classConfig) {
        throw new Error(`Unknown character class: ${options.characterClass}`);
    }
    
    // Create complete state with all required fields
    return {
        // Core identity
        id: options.id,
        position: { 
            x: options.x, 
            y: options.y 
        },
        facing: options.facing || 'down',
        characterClass: options.characterClass,
        
        // Progression
        level: options.level || 1,
        experience: options.experience || 0,
        
        // Health - these fields must always be present
        hp: options.hp !== undefined ? options.hp : classConfig.hitPoints,
        maxHp: options.maxHp !== undefined ? options.maxHp : classConfig.hitPoints,
        
        // Movement - these caused our previous bugs when undefined
        moveSpeed: options.moveSpeed !== undefined ? options.moveSpeed : classConfig.moveSpeed,
        moveSpeedBonus: options.moveSpeedBonus || 0,
        
        // Combat bonuses
        attackRecoveryBonus: options.attackRecoveryBonus || 0,
        attackCooldownBonus: options.attackCooldownBonus || 0,
        rollUnlocked: options.rollUnlocked || false,
        
        // State flags
        isAttacking: options.isAttacking || false,
        currentAttackType: options.currentAttackType || undefined,
        isDead: options.isDead || false,
        
        // Network reconciliation
        lastProcessedSeq: options.lastProcessedSeq || undefined
    };
}

/**
 * Creates a complete MonsterState object with all required fields
 */
export function createMonsterState(options) {
    // Validate required parameters
    if (!options.id) throw new Error('Monster ID is required');
    if (!options.type) throw new Error('Monster type is required');
    if (typeof options.x !== 'number') throw new Error('Monster x position is required');
    if (typeof options.y !== 'number') throw new Error('Monster y position is required');
    
    // Get monster configuration
    const monsterConfig = MONSTER_STATS[options.type];
    if (!monsterConfig) {
        throw new Error(`Unknown monster type: ${options.type}`);
    }
    
    // Create complete state with all required fields
    return {
        // Core identity
        id: options.id,
        type: options.type,
        x: options.x,
        y: options.y,
        facing: options.facing || 'down',
        
        // Health
        hp: options.hp !== undefined ? options.hp : monsterConfig.hp,
        maxHp: options.maxHp !== undefined ? options.maxHp : monsterConfig.hp,
        
        // AI State
        state: options.state || 'idle',
        targetPlayerId: options.targetPlayerId || undefined,
        lastAttackTime: options.lastAttackTime || 0,
        
        // Combat stats
        damage: options.damage !== undefined ? options.damage : monsterConfig.damage,
        attackRange: options.attackRange !== undefined ? options.attackRange : monsterConfig.attackRange,
        aggroRange: options.aggroRange !== undefined ? options.aggroRange : monsterConfig.aggroRange,
        moveSpeed: options.moveSpeed !== undefined ? options.moveSpeed : monsterConfig.moveSpeed
    };
}

/**
 * Creates a complete ProjectileState object with all required fields
 */
export function createProjectileState(options) {
    // Validate required parameters
    if (!options.id) throw new Error('Projectile ID is required');
    if (!options.ownerId) throw new Error('Projectile owner ID is required');
    if (!options.position) throw new Error('Projectile position is required');
    if (!options.target) throw new Error('Projectile target is required');
    if (typeof options.damage !== 'number') throw new Error('Projectile damage is required');
    
    return {
        id: options.id,
        ownerId: options.ownerId,
        position: {
            x: options.position.x,
            y: options.position.y
        },
        target: {
            x: options.target.x,
            y: options.target.y
        },
        damage: options.damage,
        speed: options.speed || 300, // Default projectile speed
        createdAt: options.createdAt || Date.now(),
        type: options.type || 'arrow'
    };
}

/**
 * Creates a complete NetworkPlayerUpdate with all required fields
 * This ensures network messages always have the critical fields
 */
export function createNetworkPlayerUpdate(playerState) {
    // Validate the player state has required fields
    if (!playerState.id) throw new Error('Player state missing ID');
    if (!playerState.position) throw new Error('Player state missing position');
    
    return {
        id: playerState.id,
        x: playerState.position.x,
        y: playerState.position.y,
        facing: playerState.facing,
        hp: playerState.hp,
        maxHp: playerState.maxHp,
        level: playerState.level,
        moveSpeed: playerState.moveSpeed,
        moveSpeedBonus: playerState.moveSpeedBonus,
        attackRecoveryBonus: playerState.attackRecoveryBonus,
        attackCooldownBonus: playerState.attackCooldownBonus,
        rollUnlocked: playerState.rollUnlocked,
        isAttacking: playerState.isAttacking,
        currentAttackType: playerState.currentAttackType,
        lastProcessedSeq: playerState.lastProcessedSeq
    };
}

/**
 * Creates a complete InputCommand with all required fields
 */
export function createInputCommand(options) {
    if (!Array.isArray(options.keys)) throw new Error('Input keys array is required');
    if (!options.facing) throw new Error('Input facing direction is required');
    if (typeof options.deltaTime !== 'number') throw new Error('Input deltaTime is required');
    if (typeof options.sequence !== 'number') throw new Error('Input sequence is required');
    
    return {
        keys: options.keys,
        facing: options.facing,
        deltaTime: options.deltaTime,
        sequence: options.sequence,
        timestamp: options.timestamp || Date.now()
    };
}

/**
 * Validation helpers for existing objects
 */
export function validatePlayerState(playerState) {
    const required = ['id', 'position', 'facing', 'characterClass', 'level', 'experience', 
                     'hp', 'maxHp', 'moveSpeed', 'moveSpeedBonus', 'attackRecoveryBonus', 
                     'attackCooldownBonus', 'rollUnlocked', 'isAttacking', 'isDead'];
    
    for (const field of required) {
        if (playerState[field] === undefined) {
            throw new Error(`PlayerState missing required field: ${field}`);
        }
    }
    
    return true;
}

export function validateMonsterState(monsterState) {
    const required = ['id', 'type', 'x', 'y', 'facing', 'hp', 'maxHp', 'state', 
                     'lastAttackTime', 'damage', 'attackRange', 'aggroRange', 'moveSpeed'];
    
    for (const field of required) {
        if (monsterState[field] === undefined) {
            throw new Error(`MonsterState missing required field: ${field}`);
        }
    }
    
    return true;
}