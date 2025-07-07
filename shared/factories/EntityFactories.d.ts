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
import type { PlayerState, MonsterState, ProjectileState, CharacterClass, MonsterType, MonsterStateType, AttackType, Direction, Position, NetworkPlayerUpdate } from '../types/GameTypes.js';
interface CreatePlayerOptions {
    id: string;
    x: number;
    y: number;
    characterClass: CharacterClass;
    facing?: Direction;
    level?: number;
    experience?: number;
    hp?: number;
    maxHp?: number;
    moveSpeed?: number;
    moveSpeedBonus?: number;
    attackRecoveryBonus?: number;
    attackCooldownBonus?: number;
    rollUnlocked?: boolean;
    isAttacking?: boolean;
    currentAttackType?: AttackType;
    isDead?: boolean;
    lastProcessedSeq?: number;
}
/**
 * Creates a complete PlayerState object with all required fields
 * Prevents the undefined moveSpeed/level bugs we experienced
 */
export declare function createPlayerState(options: CreatePlayerOptions): PlayerState;
/**
 * Creates a complete MonsterState object with all required fields
 */
interface CreateMonsterOptions {
    id: string;
    type: MonsterType;
    x: number;
    y: number;
    facing?: Direction;
    hp?: number;
    maxHp?: number;
    state?: MonsterStateType;
    targetPlayerId?: string;
    lastAttackTime?: number;
    damage?: number;
    attackRange?: number;
    aggroRange?: number;
    moveSpeed?: number;
}
export declare function createMonsterState(options: CreateMonsterOptions): MonsterState;
/**
 * Creates a complete ProjectileState object with all required fields
 */
interface CreateProjectileOptions {
    id: string;
    ownerId: string;
    position: Position;
    target: Position;
    damage: number;
    speed?: number;
    type?: string;
    createdAt?: number;
}
export declare function createProjectileState(options: CreateProjectileOptions): ProjectileState;
/**
 * Creates a complete NetworkPlayerUpdate with all required fields
 * This ensures network messages always have the critical fields
 */
export declare function createNetworkPlayerUpdate(playerState: PlayerState): NetworkPlayerUpdate;
/**
 * Creates a complete InputCommand with all required fields
 */
export declare function createInputCommand(options: any): any;
/**
 * Validation helpers for existing objects
 */
export declare function validatePlayerState(playerState: any): boolean;
export declare function validateMonsterState(monsterState: any): boolean;
export {};
//# sourceMappingURL=EntityFactories.d.ts.map