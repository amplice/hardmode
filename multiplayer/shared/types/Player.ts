/**
 * LLM_NOTE: Player-specific type definitions.
 * These types extend the base entity types with player-specific functionality.
 * 
 * EXACT_BEHAVIOR: All player mechanics match the original single-player game.
 */

import { CharacterClass, AttackType } from '../constants/GameConfig.js';
import { Direction } from '../constants/PhysicsConfig.js';
import { IEntity, EntityType, ComponentType } from './Entity.js';

// Extended player entity interface
export interface IPlayer extends IEntity {
  // Required components for a player
  username: string;
  characterClass: CharacterClass;
  connectionId: string;
  
  // Gameplay state
  level: number;                   // 1-10
  experience: number;              // Current XP
  rollUnlocked: boolean;           // Unlocked at level 5
  
  // Stats tracking
  kills: number;
  deaths: number;
  assists: number;
  
  // Status effects
  isStunned: boolean;              // Cannot move or attack
  stunEndTime: number;             // When stun ends
  isInvulnerable: boolean;         // Cannot take damage
  invulnerabilityEndTime: number;  // When invulnerability ends
}

// Player movement state
export interface IPlayerMovement {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: Direction;
  isMoving: boolean;
  moveSpeed: number;               // Current move speed with bonuses
  baseSpeed: number;               // Base speed for character class
}

// Player combat state
export interface IPlayerCombat {
  health: number;
  maxHealth: number;
  isDead: boolean;
  isAttacking: boolean;
  currentAttack: AttackType | null;
  attackCooldowns: Map<AttackType, number>; // Remaining cooldown per attack
  lastDamageSource?: string;       // Entity ID that last damaged this player
  lastDamageTime: number;          // For damage flash effect
}

// Player progression data
export interface IPlayerProgression {
  level: number;                   // Current level (1-10)
  experience: number;              // Current XP
  experienceToNext: number;        // XP needed for next level
  totalExperience: number;         // Lifetime XP earned
  
  // Level bonuses applied
  bonuses: {
    moveSpeedBonus: number;        // Levels 2, 6
    attackRecoveryBonus: number;   // Levels 3, 7 (in ms)
    cooldownBonus: number;         // Levels 4, 8 (in ms)
    healthBonus: number;           // Level 10
  };
}

// Player input state
export interface IPlayerInput {
  sequence: number;                // For reconciliation
  timestamp: number;
  
  // Movement keys (WASD)
  movement: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  
  // Mouse state
  mouse: {
    worldX: number;                // Mouse position in world space
    worldY: number;
    angle: number;                 // Angle from player to mouse
  };
  
  // Action buttons
  actions: {
    primaryAttack: boolean;        // Left mouse
    secondaryAttack: boolean;      // Space
    roll: boolean;                 // Shift
  };
}

// Player class configuration
export interface IPlayerClassConfig {
  characterClass: CharacterClass;
  displayName: string;
  description: string;
  
  // Base stats
  baseHealth: number;
  baseMoveSpeed: number;
  baseColor: number;               // Tint color
  
  // Sprite configuration
  spritePrefix: string;            // For loading sprites
  animations: Record<string, {
    speed: number;
    hitFrame?: number;
  }>;
  
  // Attack configurations
  attacks: {
    primary: IAttackConfig;
    secondary: IAttackConfig;
  };
}

// Attack configuration
export interface IAttackConfig {
  name: string;
  damage: number;
  windupTime: number;              // ms before attack hits
  recoveryTime: number;            // ms after attack before can act
  cooldown: number;                // ms before can use again
  
  // Hitbox configuration
  hitboxType: 'rectangle' | 'cone' | 'circle' | 'projectile';
  hitboxParams: any;               // Type-specific parameters
  
  // Special properties
  invulnerable?: boolean;          // Invulnerable during attack
  dashDistance?: number;           // Movement during attack
  projectileSpeed?: number;        // For projectile attacks
  projectileRange?: number;
  
  // Visual effects
  effectSequence: Array<{
    type: string;
    timing: number;
    distance?: number;
    useStartPosition?: boolean;
  }>;
}

// Player session data
export interface IPlayerSession {
  playerId: string;
  connectionId: string;
  joinTime: number;
  lastActivityTime: number;
  totalPlayTime: number;
  
  // Network stats
  averageLatency: number;
  packetLoss: number;
  
  // Anti-cheat flags
  suspiciousActions: number;
  validationFailures: number;
}

// Player preferences (for future features)
export interface IPlayerPreferences {
  // Graphics
  particleEffects: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
  
  // Audio
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  
  // UI
  showFPS: boolean;
  showPing: boolean;
  minimapSize: 'small' | 'medium' | 'large';
}

// Leaderboard entry
export interface ILeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  characterClass: CharacterClass;
  score: number;                   // Could be kills, level, etc.
  timestamp: number;
}

// Achievement data (for future features)
export interface IAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;               // For progressive achievements
  maxProgress?: number;
}

// Type guards and helpers

export function isPlayerEntity(entity: IEntity): boolean {
  return entity.type === EntityType.PLAYER && 
    entity.components.has(ComponentType.PLAYER) &&
    entity.components.has(ComponentType.POSITION) &&
    entity.components.has(ComponentType.HEALTH);
}

export function getPlayerLevel(experience: number): number {
  // Calculate level from experience using the game formula
  let level = 1;
  let totalXpNeeded = 0;
  
  while (level < 10) {
    const xpForNextLevel = level * 20;
    if (experience < totalXpNeeded + xpForNextLevel) {
      break;
    }
    totalXpNeeded += xpForNextLevel;
    level++;
  }
  
  return level;
}

export function getExperienceForLevel(level: number): number {
  // Total XP needed to reach a level
  return (level - 1) * level / 2 * 20;
}

export function getExperienceToNextLevel(currentLevel: number): number {
  // XP needed for next level specifically
  return currentLevel * 20;
}