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
export interface BaseMessage {
    type: MessageType;
    timestamp: number;
    sequence?: number;
}
export interface PlayerJoinMessage extends BaseMessage {
    type: MessageType.PLAYER_JOIN;
    username: string;
    characterClass: CharacterClass;
}
export interface PlayerInputMessage extends BaseMessage {
    type: MessageType.PLAYER_INPUT;
    sequence: number;
    keys: {
        up: boolean;
        down: boolean;
        left: boolean;
        right: boolean;
    };
    mousePosition: {
        x: number;
        y: number;
    };
    deltaTime: number;
}
export interface PlayerAttackMessage extends BaseMessage {
    type: MessageType.PLAYER_ATTACK;
    attackType: AttackType;
    mousePosition: {
        x: number;
        y: number;
    };
}
export interface PlayerRespawnMessage extends BaseMessage {
    type: MessageType.PLAYER_RESPAWN;
}
export interface ConnectionAcceptedMessage extends BaseMessage {
    type: MessageType.CONNECTION_ACCEPTED;
    playerId: string;
    worldSeed: number;
    serverTime: number;
    tickRate: number;
}
export interface GameStateMessage extends BaseMessage {
    type: MessageType.GAME_STATE;
    tick: number;
    lastProcessedInput: number;
    entities: SerializedEntity[];
    events: GameEvent[];
}
export interface EntitySpawnMessage extends BaseMessage {
    type: MessageType.ENTITY_SPAWN;
    entity: SerializedEntity;
}
export interface EntityDespawnMessage extends BaseMessage {
    type: MessageType.ENTITY_DESPAWN;
    entityId: string;
    reason: DespawnReason;
}
export interface EntityUpdateMessage extends BaseMessage {
    type: MessageType.ENTITY_UPDATE;
    updates: EntityUpdate[];
}
export interface AttackEventMessage extends BaseMessage {
    type: MessageType.ATTACK_EVENT;
    attackerId: string;
    attackType: AttackType;
    position: {
        x: number;
        y: number;
    };
    direction: number;
    hitEntityIds: string[];
}
export interface DamageEventMessage extends BaseMessage {
    type: MessageType.DAMAGE_EVENT;
    targetId: string;
    damage: number;
    attackerId: string;
    knockback?: {
        x: number;
        y: number;
    };
}
export interface DeathEventMessage extends BaseMessage {
    type: MessageType.DEATH_EVENT;
    entityId: string;
    killerId?: string;
    position: {
        x: number;
        y: number;
    };
}
export interface LevelUpEventMessage extends BaseMessage {
    type: MessageType.LEVEL_UP_EVENT;
    playerId: string;
    newLevel: number;
    bonuses: LevelBonus[];
}
export interface ErrorMessage extends BaseMessage {
    type: MessageType.ERROR;
    code: ErrorCode;
    message: string;
    fatal: boolean;
}
export declare enum DespawnReason {
    DEATH = "death",
    DISCONNECT = "disconnect",
    OUT_OF_RANGE = "out_of_range",
    EXPIRED = "expired",// For temporary effects
    CONSUMED = "consumed"
}
export declare enum ErrorCode {
    INVALID_INPUT = "INVALID_INPUT",
    RATE_LIMIT = "RATE_LIMIT",
    INVALID_ATTACK = "INVALID_ATTACK",
    DESYNC = "DESYNC",
    SERVER_FULL = "SERVER_FULL",
    VERSION_MISMATCH = "VERSION_MISMATCH",
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    SERVER_ERROR = "SERVER_ERROR",
    UNKNOWN = "UNKNOWN"
}
export interface LevelBonus {
    type: 'moveSpeed' | 'attackRecovery' | 'abilityCooldown' | 'rollUnlock' | 'maxHitPoints';
    value?: number;
}
export interface GameEvent {
    type: 'kill' | 'death' | 'levelup' | 'spawn' | 'chat';
    data: any;
    timestamp: number;
}
export type ClientMessage = PlayerJoinMessage | PlayerInputMessage | PlayerAttackMessage | PlayerRespawnMessage;
export type ServerMessage = ConnectionAcceptedMessage | GameStateMessage | EntitySpawnMessage | EntityDespawnMessage | EntityUpdateMessage | AttackEventMessage | DamageEventMessage | DeathEventMessage | LevelUpEventMessage | ErrorMessage;
export type NetworkMessage = ClientMessage | ServerMessage;
export interface BinaryPositionUpdate {
    entityId: number;
    x: number;
    y: number;
}
export interface BinaryInputMessage {
    sequence: number;
    timestamp: number;
    keys: number;
    mouseX: number;
    mouseY: number;
}
export declare function createPlayerJoinMessage(username: string, characterClass: CharacterClass): PlayerJoinMessage;
export declare function createPlayerInputMessage(sequence: number, keys: PlayerInputMessage['keys'], mousePosition: {
    x: number;
    y: number;
}, deltaTime: number): PlayerInputMessage;
export declare function createErrorMessage(code: ErrorCode, message: string, fatal?: boolean): ErrorMessage;
//# sourceMappingURL=Network.d.ts.map