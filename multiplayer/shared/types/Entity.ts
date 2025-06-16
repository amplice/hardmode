/**
 * LLM_NOTE: Core entity type definitions shared between client and server.
 * These interfaces define the structure of all game entities and their components.
 * 
 * ARCHITECTURE_DECISION: Using an Entity Component System (ECS) architecture
 * for flexibility and network efficiency. Components can be serialized individually.
 */

import { CharacterClass, MonsterType, AttackType } from '../constants/GameConfig';
import { Direction } from '../constants/PhysicsConfig';

// Base entity interface
export interface IEntity {
  id: string;                       // Unique identifier (UUID v4)
  type: EntityType;                 // Entity type for quick filtering
  components: Map<ComponentType, IComponent>; // Component storage
  lastUpdated: number;              // Timestamp of last update
}

// Entity types in the game
export enum EntityType {
  PLAYER = 'player',
  MONSTER = 'monster',
  PROJECTILE = 'projectile',
  EFFECT = 'effect',
  ITEM = 'item',                    // For future expansion
}

// Component types for the ECS
export enum ComponentType {
  POSITION = 'position',
  VELOCITY = 'velocity',
  HEALTH = 'health',
  COMBAT = 'combat',
  PLAYER = 'player',
  MONSTER = 'monster',
  AI = 'ai',
  SPRITE = 'sprite',
  ANIMATION = 'animation',
  COLLISION = 'collision',
  NETWORK = 'network',
  PROJECTILE = 'projectile',
  EFFECT = 'effect',
  LEVEL = 'level',
}

// Base component interface
export interface IComponent {
  type: ComponentType;
  serialize(): any;                 // Convert to network-safe format
  deserialize(data: any): void;     // Restore from network data
}

// Position component - EXACT: Stores entity position in world
export interface IPositionComponent extends IComponent {
  type: ComponentType.POSITION;
  x: number;                        // X position in pixels
  y: number;                        // Y position in pixels
  facing: Direction;                // 8-directional facing
}

// Velocity component - EXACT: Stores movement velocity
export interface IVelocityComponent extends IComponent {
  type: ComponentType.VELOCITY;
  x: number;                        // X velocity in pixels/frame
  y: number;                        // Y velocity in pixels/frame
}

// Health component - EXACT: Manages entity health
export interface IHealthComponent extends IComponent {
  type: ComponentType.HEALTH;
  current: number;                  // Current hit points
  maximum: number;                  // Maximum hit points
  isDead: boolean;                  // Death state
  lastDamageTime: number;          // Timestamp of last damage (for stun)
}

// Combat component - EXACT: Handles attack state and cooldowns
export interface ICombatComponent extends IComponent {
  type: ComponentType.COMBAT;
  isAttacking: boolean;             // Currently in attack animation
  currentAttack: AttackType | null; // Current attack being performed
  attackStartTime: number;          // When current attack started
  lastAttackTime: Record<AttackType, number>; // Cooldown tracking per attack type
  canAttack: boolean;               // Can perform attacks (not stunned)
  invulnerable: boolean;            // Temporary invulnerability (some abilities)
}

// Player component - EXACT: Player-specific data
export interface IPlayerComponent extends IComponent {
  type: ComponentType.PLAYER;
  username: string;                 // Player display name
  characterClass: CharacterClass;   // Selected class
  connectionId: string;             // Socket connection ID
  lastInputSequence: number;        // For input reconciliation
  kills: number;                    // Kill counter
  deaths: number;                   // Death counter
}

// Monster component - EXACT: Monster-specific data
export interface IMonsterComponent extends IComponent {
  type: ComponentType.MONSTER;
  monsterType: MonsterType;         // Type of monster
  spawnTime: number;                // When monster was spawned
  lastAttackTime: number;           // For attack cooldowns
}

// AI component - EXACT: AI state for monsters
export interface IAIComponent extends IComponent {
  type: ComponentType.AI;
  state: AIState;                   // Current AI state
  targetId: string | null;          // Current target entity ID
  lastStateChange: number;          // Timestamp of last state change
  homePosition: { x: number; y: number }; // Spawn position to return to
}

// AI states for monsters
export enum AIState {
  IDLE = 'idle',                    // Wandering randomly
  PURSUING = 'pursuing',            // Chasing target
  ATTACKING = 'attacking',          // Executing attack
  STUNNED = 'stunned',             // Stunned from damage
  DYING = 'dying',                 // Death animation
  RETURNING = 'returning',         // Returning to home position
}

// Sprite component - For client-side rendering
export interface ISpriteComponent extends IComponent {
  type: ComponentType.SPRITE;
  spritesheet: string;              // Sprite sheet identifier
  currentAnimation: string;         // Current animation name
  frameIndex: number;               // Current frame in animation
  tint: number;                     // Color tint (for damage flash, etc.)
}

// Animation component - Animation state
export interface IAnimationComponent extends IComponent {
  type: ComponentType.ANIMATION;
  animations: Map<string, AnimationData>; // Available animations
  currentAnimation: string;         // Active animation
  frameTime: number;                // Time on current frame
  loop: boolean;                    // Should animation loop
  onComplete?: () => void;          // Callback when animation completes
}

// Animation data structure
export interface AnimationData {
  frames: number[];                 // Frame indices
  speed: number;                    // Animation speed multiplier
  hitFrame?: number;                // Frame where damage is dealt
}

// Collision component - EXACT: Collision detection data
export interface ICollisionComponent extends IComponent {
  type: ComponentType.COLLISION;
  radius: number;                   // Collision radius for circular collision
  width?: number;                   // For rectangular collision
  height?: number;                  // For rectangular collision
  solid: boolean;                   // Blocks movement
  layer: CollisionLayer;            // Collision layer for filtering
}

// Collision layers for different entity types
export enum CollisionLayer {
  PLAYER = 1,
  MONSTER = 2,
  PROJECTILE = 4,
  WALL = 8,
  TRIGGER = 16,
}

// Network component - Network synchronization data
export interface INetworkComponent extends IComponent {
  type: ComponentType.NETWORK;
  ownerId: string;                  // Player ID who owns this entity
  priority: number;                 // Update priority (higher = more important)
  lastSyncTime: number;            // Last time this entity was synced
  syncRate: number;                // How often to sync (ms)
}

// Projectile component - EXACT: Projectile-specific data
export interface IProjectileComponent extends IComponent {
  type: ComponentType.PROJECTILE;
  damage: number;                   // Damage on hit
  ownerId: string;                  // Entity that fired this projectile
  speed: number;                    // Movement speed (pixels/second)
  range: number;                    // Maximum travel distance
  distanceTraveled: number;        // Current distance traveled
  piercing: boolean;               // Goes through enemies
  hitEntities: Set<string>;        // Entities already hit (for piercing)
}

// Effect component - Visual effects
export interface IEffectComponent extends IComponent {
  type: ComponentType.EFFECT;
  effectType: string;              // Effect identifier
  duration: number;                // Total duration in ms
  elapsedTime: number;            // Time since effect started
  followEntityId?: string;        // Entity to follow (optional)
  offset?: { x: number; y: number }; // Offset from follow target
}

// Level component - EXACT: Experience and progression
export interface ILevelComponent extends IComponent {
  type: ComponentType.LEVEL;
  level: number;                   // Current level (1-10)
  experience: number;              // Current XP
  experienceToNext: number;        // XP needed for next level
  rollUnlocked: boolean;          // Roll ability unlocked at level 5
}

// Serialized entity format for network transmission
export interface SerializedEntity {
  id: string;
  type: EntityType;
  components: Record<string, any>; // Serialized component data
  lastUpdated: number;
}

// Entity update message format
export interface EntityUpdate {
  id: string;
  components: Partial<Record<ComponentType, any>>; // Only changed components
  timestamp: number;
}

// Type guard functions for runtime type checking
export function isPlayer(entity: IEntity): boolean {
  return entity.type === EntityType.PLAYER;
}

export function isMonster(entity: IEntity): boolean {
  return entity.type === EntityType.MONSTER;
}

export function isProjectile(entity: IEntity): boolean {
  return entity.type === EntityType.PROJECTILE;
}

export function hasComponent<T extends IComponent>(
  entity: IEntity,
  componentType: ComponentType
): entity is IEntity & { components: Map<ComponentType, T> } {
  return entity.components.has(componentType);
}