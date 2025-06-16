/**
 * LLM_NOTE: Player-specific type definitions.
 * These types extend the base entity types with player-specific functionality.
 *
 * EXACT_BEHAVIOR: All player mechanics match the original single-player game.
 */
import { CharacterClass, AttackType } from '../constants/GameConfig.js';
import { Direction } from '../constants/PhysicsConfig.js';
import { IEntity } from './Entity.js';
export interface IPlayer extends IEntity {
    username: string;
    characterClass: CharacterClass;
    connectionId: string;
    level: number;
    experience: number;
    rollUnlocked: boolean;
    kills: number;
    deaths: number;
    assists: number;
    isStunned: boolean;
    stunEndTime: number;
    isInvulnerable: boolean;
    invulnerabilityEndTime: number;
}
export interface IPlayerMovement {
    position: {
        x: number;
        y: number;
    };
    velocity: {
        x: number;
        y: number;
    };
    facing: Direction;
    isMoving: boolean;
    moveSpeed: number;
    baseSpeed: number;
}
export interface IPlayerCombat {
    health: number;
    maxHealth: number;
    isDead: boolean;
    isAttacking: boolean;
    currentAttack: AttackType | null;
    attackCooldowns: Map<AttackType, number>;
    lastDamageSource?: string;
    lastDamageTime: number;
}
export interface IPlayerProgression {
    level: number;
    experience: number;
    experienceToNext: number;
    totalExperience: number;
    bonuses: {
        moveSpeedBonus: number;
        attackRecoveryBonus: number;
        cooldownBonus: number;
        healthBonus: number;
    };
}
export interface IPlayerInput {
    sequence: number;
    timestamp: number;
    movement: {
        up: boolean;
        down: boolean;
        left: boolean;
        right: boolean;
    };
    mouse: {
        worldX: number;
        worldY: number;
        angle: number;
    };
    actions: {
        primaryAttack: boolean;
        secondaryAttack: boolean;
        roll: boolean;
    };
}
export interface IPlayerClassConfig {
    characterClass: CharacterClass;
    displayName: string;
    description: string;
    baseHealth: number;
    baseMoveSpeed: number;
    baseColor: number;
    spritePrefix: string;
    animations: Record<string, {
        speed: number;
        hitFrame?: number;
    }>;
    attacks: {
        primary: IAttackConfig;
        secondary: IAttackConfig;
    };
}
export interface IAttackConfig {
    name: string;
    damage: number;
    windupTime: number;
    recoveryTime: number;
    cooldown: number;
    hitboxType: 'rectangle' | 'cone' | 'circle' | 'projectile';
    hitboxParams: any;
    invulnerable?: boolean;
    dashDistance?: number;
    projectileSpeed?: number;
    projectileRange?: number;
    effectSequence: Array<{
        type: string;
        timing: number;
        distance?: number;
        useStartPosition?: boolean;
    }>;
}
export interface IPlayerSession {
    playerId: string;
    connectionId: string;
    joinTime: number;
    lastActivityTime: number;
    totalPlayTime: number;
    averageLatency: number;
    packetLoss: number;
    suspiciousActions: number;
    validationFailures: number;
}
export interface IPlayerPreferences {
    particleEffects: boolean;
    screenShake: boolean;
    damageNumbers: boolean;
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    showFPS: boolean;
    showPing: boolean;
    minimapSize: 'small' | 'medium' | 'large';
}
export interface ILeaderboardEntry {
    rank: number;
    playerId: string;
    username: string;
    characterClass: CharacterClass;
    score: number;
    timestamp: number;
}
export interface IAchievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedAt?: number;
    progress?: number;
    maxProgress?: number;
}
export declare function isPlayerEntity(entity: IEntity): boolean;
export declare function getPlayerLevel(experience: number): number;
export declare function getExperienceForLevel(level: number): number;
export declare function getExperienceToNextLevel(currentLevel: number): number;
//# sourceMappingURL=Player.d.ts.map