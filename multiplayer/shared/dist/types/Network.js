/**
 * LLM_NOTE: Network message type definitions for client-server communication.
 * These interfaces define the exact structure of all network messages.
 *
 * ARCHITECTURE_DECISION: All messages are strongly typed to prevent errors
 * and make the protocol self-documenting. Use discriminated unions for type safety.
 */
import { MessageType } from '../constants/NetworkConfig.js';
// Enums and supporting types
export var DespawnReason;
(function (DespawnReason) {
    DespawnReason["DEATH"] = "death";
    DespawnReason["DISCONNECT"] = "disconnect";
    DespawnReason["OUT_OF_RANGE"] = "out_of_range";
    DespawnReason["EXPIRED"] = "expired";
    DespawnReason["CONSUMED"] = "consumed";
})(DespawnReason || (DespawnReason = {}));
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["RATE_LIMIT"] = "RATE_LIMIT";
    ErrorCode["INVALID_ATTACK"] = "INVALID_ATTACK";
    ErrorCode["DESYNC"] = "DESYNC";
    ErrorCode["SERVER_FULL"] = "SERVER_FULL";
    ErrorCode["VERSION_MISMATCH"] = "VERSION_MISMATCH";
    ErrorCode["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
    ErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
    ErrorCode["UNKNOWN"] = "UNKNOWN";
})(ErrorCode || (ErrorCode = {}));
// Helper functions for message creation
export function createPlayerJoinMessage(username, characterClass) {
    return {
        type: MessageType.PLAYER_JOIN,
        timestamp: Date.now(),
        username,
        characterClass,
    };
}
export function createPlayerInputMessage(sequence, keys, mousePosition, deltaTime) {
    return {
        type: MessageType.PLAYER_INPUT,
        timestamp: Date.now(),
        sequence,
        keys,
        mousePosition,
        deltaTime,
    };
}
export function createErrorMessage(code, message, fatal = false) {
    return {
        type: MessageType.ERROR,
        timestamp: Date.now(),
        code,
        message,
        fatal,
    };
}
//# sourceMappingURL=Network.js.map