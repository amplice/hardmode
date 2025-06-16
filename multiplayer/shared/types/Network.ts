/**
 * LLM_NOTE: Network message type definitions for client-server communication.
 * These interfaces define the exact structure of all network messages.
 * 
 * ARCHITECTURE_DECISION: All messages are strongly typed to prevent errors
 * and make the protocol self-documenting. Use discriminated unions for type safety.
 */

import { CharacterClass, AttackType } from '../constants/GameConfig.js';
import { SerializedEntity, EntityUpdate } from './Entity.js';
import { MessageType } from '../constants/NetworkConfig.js';

// Base message interface
export interface BaseMessage {
  type: MessageType;
  timestamp: number;                // When message was created
  sequence?: number;               // Optional sequence number for ordering
}

// Client -> Server Messages

export interface PlayerJoinMessage extends BaseMessage {
  type: MessageType.PLAYER_JOIN;
  username: string;                // Player's display name
  characterClass: CharacterClass;  // Selected character class
}

export interface PlayerInputMessage extends BaseMessage {
  type: MessageType.PLAYER_INPUT;
  sequence: number;                // Input sequence number for reconciliation
  keys: {
    up: boolean;                   // W key
    down: boolean;                 // S key
    left: boolean;                 // A key
    right: boolean;                // D key
  };
  mousePosition: {
    x: number;                     // Mouse X in world coordinates
    y: number;                     // Mouse Y in world coordinates
  };
  deltaTime: number;              // Time since last input (for validation)
}

export interface PlayerAttackMessage extends BaseMessage {
  type: MessageType.PLAYER_ATTACK;
  attackType: AttackType;         // primary, secondary, or roll
  mousePosition: {
    x: number;                    // Attack direction
    y: number;
  };
}

export interface PlayerRespawnMessage extends BaseMessage {
  type: MessageType.PLAYER_RESPAWN;
  // No additional data needed, server handles respawn location
}

// Server -> Client Messages

export interface ConnectionAcceptedMessage extends BaseMessage {
  type: MessageType.CONNECTION_ACCEPTED;
  playerId: string;               // Assigned player entity ID
  worldSeed: number;             // Seed for deterministic world generation
  serverTime: number;            // Server timestamp for synchronization
  tickRate: number;              // Server tick rate
}

export interface GameStateMessage extends BaseMessage {
  type: MessageType.GAME_STATE;
  tick: number;                  // Server tick number
  lastProcessedInput: number;    // Last input sequence processed for this player
  entities: SerializedEntity[];  // Full entity state
  events: GameEvent[];          // Recent game events
}

export interface EntitySpawnMessage extends BaseMessage {
  type: MessageType.ENTITY_SPAWN;
  entity: SerializedEntity;      // New entity data
}

export interface EntityDespawnMessage extends BaseMessage {
  type: MessageType.ENTITY_DESPAWN;
  entityId: string;              // Entity to remove
  reason: DespawnReason;         // Why entity was removed
}

export interface EntityUpdateMessage extends BaseMessage {
  type: MessageType.ENTITY_UPDATE;
  updates: EntityUpdate[];       // Batched entity updates
}

export interface AttackEventMessage extends BaseMessage {
  type: MessageType.ATTACK_EVENT;
  attackerId: string;            // Entity performing attack
  attackType: AttackType;        // Type of attack
  position: { x: number; y: number }; // Where attack occurred
  direction: number;             // Attack direction in radians
  hitEntityIds: string[];        // Entities hit by attack
}

export interface DamageEventMessage extends BaseMessage {
  type: MessageType.DAMAGE_EVENT;
  targetId: string;              // Entity taking damage
  damage: number;                // Amount of damage
  attackerId: string;            // Entity dealing damage
  knockback?: {                  // Optional knockback
    x: number;
    y: number;
  };
}

export interface DeathEventMessage extends BaseMessage {
  type: MessageType.DEATH_EVENT;
  entityId: string;              // Entity that died
  killerId?: string;             // Entity that killed (if applicable)
  position: { x: number; y: number }; // Death location
}

export interface LevelUpEventMessage extends BaseMessage {
  type: MessageType.LEVEL_UP_EVENT;
  playerId: string;              // Player who leveled up
  newLevel: number;              // New level reached
  bonuses: LevelBonus[];         // Bonuses gained
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  code: ErrorCode;               // Error type
  message: string;               // Human-readable error
  fatal: boolean;                // Should disconnect
}

// Enums and supporting types

export enum DespawnReason {
  DEATH = 'death',
  DISCONNECT = 'disconnect',
  OUT_OF_RANGE = 'out_of_range',
  EXPIRED = 'expired',           // For temporary effects
  CONSUMED = 'consumed',         // For items
}

export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_ATTACK = 'INVALID_ATTACK',
  DESYNC = 'DESYNC',
  SERVER_FULL = 'SERVER_FULL',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface LevelBonus {
  type: 'moveSpeed' | 'attackRecovery' | 'abilityCooldown' | 'rollUnlock' | 'maxHitPoints';
  value?: number;                // Amount of bonus (if applicable)
}

export interface GameEvent {
  type: 'kill' | 'death' | 'levelup' | 'spawn' | 'chat';
  data: any;                     // Event-specific data
  timestamp: number;
}

// Type discriminated union for all messages
export type ClientMessage = 
  | PlayerJoinMessage
  | PlayerInputMessage
  | PlayerAttackMessage
  | PlayerRespawnMessage;

export type ServerMessage =
  | ConnectionAcceptedMessage
  | GameStateMessage
  | EntitySpawnMessage
  | EntityDespawnMessage
  | EntityUpdateMessage
  | AttackEventMessage
  | DamageEventMessage
  | DeathEventMessage
  | LevelUpEventMessage
  | ErrorMessage;

export type NetworkMessage = ClientMessage | ServerMessage;

// Binary protocol types for optimization

export interface BinaryPositionUpdate {
  entityId: number;              // 4 bytes (hashed ID)
  x: number;                     // 4 bytes (float32)
  y: number;                     // 4 bytes (float32)
}

export interface BinaryInputMessage {
  sequence: number;              // 4 bytes
  timestamp: number;             // 4 bytes
  keys: number;                  // 1 byte (bit flags)
  mouseX: number;                // 4 bytes
  mouseY: number;                // 4 bytes
}

// Helper functions for message creation

export function createPlayerJoinMessage(
  username: string,
  characterClass: CharacterClass
): PlayerJoinMessage {
  return {
    type: MessageType.PLAYER_JOIN,
    timestamp: Date.now(),
    username,
    characterClass,
  };
}

export function createPlayerInputMessage(
  sequence: number,
  keys: PlayerInputMessage['keys'],
  mousePosition: { x: number; y: number },
  deltaTime: number
): PlayerInputMessage {
  return {
    type: MessageType.PLAYER_INPUT,
    timestamp: Date.now(),
    sequence,
    keys,
    mousePosition,
    deltaTime,
  };
}

export function createErrorMessage(
  code: ErrorCode,
  message: string,
  fatal = false
): ErrorMessage {
  return {
    type: MessageType.ERROR,
    timestamp: Date.now(),
    code,
    message,
    fatal,
  };
}