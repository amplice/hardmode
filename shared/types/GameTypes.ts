/**
 * Core game type definitions
 * These types ensure all game entities have required fields and prevent
 * the kinds of missing field bugs that caused movement speed desync
 */

export interface Position {
    x: number;
    y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

export type CharacterClass = 'bladedancer' | 'guardian' | 'hunter' | 'rogue';

export type MonsterType = 'ogre' | 'skeleton' | 'elemental' | 'ghoul' | 'wildarcher';

export type MonsterStateType = 'idle' | 'chasing' | 'attacking' | 'dying';

export type AttackType = 'primary' | 'secondary';

export type HitboxType = 'rectangle' | 'cone' | 'circle';

/**
 * Complete player state - all fields required
 * This prevents the undefined field bugs we had with movement prediction
 */
export interface PlayerState {
    id: string;
    position: Position;
    facing: Direction;
    characterClass: CharacterClass;
    level: number;
    experience: number;
    
    // Health
    hp: number;
    maxHp: number;
    
    // Movement - these fields caused our previous bugs when undefined
    moveSpeed: number;
    moveSpeedBonus: number;
    
    // Combat
    attackRecoveryBonus: number;
    attackCooldownBonus: number;
    rollUnlocked: boolean;
    
    // State
    isAttacking: boolean;
    currentAttackType?: AttackType;
    isDead: boolean;
    
    // Network
    lastProcessedSeq?: number;
}

/**
 * Monster state - all fields required to prevent creation bugs
 */
export interface MonsterState {
    id: string;
    type: MonsterType;
    position: Position;
    facing: Direction;
    
    // Health
    hp: number;
    maxHp: number;
    
    // AI State
    state: MonsterStateType;
    targetPlayerId?: string;
    lastAttackTime: number;
    
    // Combat
    damage: number;
    attackRange: number;
    aggroRange: number;
    moveSpeed: number;
}

/**
 * Projectile state - all fields required
 */
export interface ProjectileState {
    id: string;
    ownerId: string;
    position: Position;
    target: Position;
    damage: number;
    speed: number;
    createdAt: number;
    type: string;
}

/**
 * Network message types for type-safe communication
 */
export interface NetworkPlayerUpdate {
    id: string;
    x: number;
    y: number;
    facing: Direction;
    hp: number;
    maxHp: number;
    level: number;
    moveSpeed: number;
    moveSpeedBonus: number;
    attackRecoveryBonus: number;
    attackCooldownBonus: number;
    rollUnlocked: boolean;
    isAttacking: boolean;
    currentAttackType?: AttackType;
    lastProcessedSeq?: number;
}

/**
 * Input command structure
 */
export interface InputCommand {
    keys: string[];
    facing: Direction;
    deltaTime: number;
    sequence: number;
    timestamp: number;
}

/**
 * Attack definition structure
 */
export interface AttackDefinition {
    name: string;
    damage: number;
    windupTime: number;
    recoveryTime: number;
    cooldown: number;
    hitboxType: HitboxType;
    hitboxParams: HitboxParams;
    effectSequence?: EffectDefinition[];
}

export interface HitboxParams {
    width?: number;
    length?: number;
    radius?: number;
    range?: number;
    angle?: number;
}

export interface EffectDefinition {
    type: string;
    timing: number;
    distance?: number;
}