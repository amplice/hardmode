/**
 * LLM_NOTE: Core entity type definitions shared between client and server.
 * These interfaces define the structure of all game entities and their components.
 *
 * ARCHITECTURE_DECISION: Using an Entity Component System (ECS) architecture
 * for flexibility and network efficiency. Components can be serialized individually.
 */
import { CharacterClass, MonsterType, AttackType } from '../constants/GameConfig';
import { Direction } from '../constants/PhysicsConfig';
export interface IEntity {
    id: string;
    type: EntityType;
    components: Map<ComponentType, IComponent>;
    lastUpdated: number;
}
export declare enum EntityType {
    PLAYER = "player",
    MONSTER = "monster",
    PROJECTILE = "projectile",
    EFFECT = "effect",
    ITEM = "item"
}
export declare enum ComponentType {
    POSITION = "position",
    VELOCITY = "velocity",
    HEALTH = "health",
    COMBAT = "combat",
    PLAYER = "player",
    MONSTER = "monster",
    AI = "ai",
    SPRITE = "sprite",
    ANIMATION = "animation",
    COLLISION = "collision",
    NETWORK = "network",
    PROJECTILE = "projectile",
    EFFECT = "effect",
    LEVEL = "level"
}
export interface IComponent {
    type: ComponentType;
    serialize(): any;
    deserialize(data: any): void;
}
export interface IPositionComponent extends IComponent {
    type: ComponentType.POSITION;
    x: number;
    y: number;
    facing: Direction;
}
export interface IVelocityComponent extends IComponent {
    type: ComponentType.VELOCITY;
    x: number;
    y: number;
}
export interface IHealthComponent extends IComponent {
    type: ComponentType.HEALTH;
    current: number;
    maximum: number;
    isDead: boolean;
    lastDamageTime: number;
}
export interface ICombatComponent extends IComponent {
    type: ComponentType.COMBAT;
    isAttacking: boolean;
    currentAttack: AttackType | null;
    attackStartTime: number;
    lastAttackTime: Record<AttackType, number>;
    canAttack: boolean;
    invulnerable: boolean;
}
export interface IPlayerComponent extends IComponent {
    type: ComponentType.PLAYER;
    username: string;
    characterClass: CharacterClass;
    connectionId: string;
    lastInputSequence: number;
    kills: number;
    deaths: number;
}
export interface IMonsterComponent extends IComponent {
    type: ComponentType.MONSTER;
    monsterType: MonsterType;
    spawnTime: number;
    lastAttackTime: number;
}
export interface IAIComponent extends IComponent {
    type: ComponentType.AI;
    state: AIState;
    targetId: string | null;
    lastStateChange: number;
    homePosition: {
        x: number;
        y: number;
    };
}
export declare enum AIState {
    IDLE = "idle",// Wandering randomly
    PURSUING = "pursuing",// Chasing target
    ATTACKING = "attacking",// Executing attack
    STUNNED = "stunned",// Stunned from damage
    DYING = "dying",// Death animation
    RETURNING = "returning"
}
export interface ISpriteComponent extends IComponent {
    type: ComponentType.SPRITE;
    spritesheet: string;
    currentAnimation: string;
    frameIndex: number;
    tint: number;
}
export interface IAnimationComponent extends IComponent {
    type: ComponentType.ANIMATION;
    animations: Map<string, AnimationData>;
    currentAnimation: string;
    frameTime: number;
    loop: boolean;
    onComplete?: () => void;
}
export interface AnimationData {
    frames: number[];
    speed: number;
    hitFrame?: number;
}
export interface ICollisionComponent extends IComponent {
    type: ComponentType.COLLISION;
    radius: number;
    width?: number;
    height?: number;
    solid: boolean;
    layer: CollisionLayer;
}
export declare enum CollisionLayer {
    PLAYER = 1,
    MONSTER = 2,
    PROJECTILE = 4,
    WALL = 8,
    TRIGGER = 16
}
export interface INetworkComponent extends IComponent {
    type: ComponentType.NETWORK;
    ownerId: string;
    priority: number;
    lastSyncTime: number;
    syncRate: number;
}
export interface IProjectileComponent extends IComponent {
    type: ComponentType.PROJECTILE;
    damage: number;
    ownerId: string;
    speed: number;
    range: number;
    distanceTraveled: number;
    piercing: boolean;
    hitEntities: Set<string>;
}
export interface IEffectComponent extends IComponent {
    type: ComponentType.EFFECT;
    effectType: string;
    duration: number;
    elapsedTime: number;
    followEntityId?: string;
    offset?: {
        x: number;
        y: number;
    };
}
export interface ILevelComponent extends IComponent {
    type: ComponentType.LEVEL;
    level: number;
    experience: number;
    experienceToNext: number;
    rollUnlocked: boolean;
}
export interface SerializedEntity {
    id: string;
    type: EntityType;
    components: Record<string, any>;
    lastUpdated: number;
}
export interface EntityUpdate {
    id: string;
    components: Partial<Record<ComponentType, any>>;
    timestamp: number;
}
export declare function isPlayer(entity: IEntity): boolean;
export declare function isMonster(entity: IEntity): boolean;
export declare function isProjectile(entity: IEntity): boolean;
export declare function hasComponent<T extends IComponent>(entity: IEntity, componentType: ComponentType): entity is IEntity & {
    components: Map<ComponentType, T>;
};
//# sourceMappingURL=Entity.d.ts.map