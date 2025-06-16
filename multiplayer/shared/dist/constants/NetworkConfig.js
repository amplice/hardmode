/**
 * LLM_NOTE: Network configuration constants for client-server communication.
 * These values control timing, performance, and reliability of the multiplayer experience.
 *
 * ARCHITECTURE_DECISION: These values are tuned for supporting 100+ concurrent players
 * with smooth gameplay at up to 100ms latency.
 */
// Server tick rate and timing
export const SERVER_CONFIG = {
    TICK_RATE: 60, // 60Hz server tick (16.67ms per tick)
    TICK_INTERVAL: 1000 / 60, // ~16.67ms
    NETWORK_UPDATE_RATE: 20, // Send updates to clients 20 times per second
    NETWORK_UPDATE_INTERVAL: 1000 / 20, // 50ms between network updates
};
// Client configuration
export const CLIENT_CONFIG = {
    RENDER_RATE: 60, // 60 FPS client rendering
    INPUT_BUFFER_SIZE: 60, // Store 1 second of inputs for reconciliation
    STATE_BUFFER_SIZE: 20, // Store 1 second of states at 20Hz
    INTERPOLATION_DELAY: 100, // 100ms interpolation buffer for smooth remote entities
    EXTRAPOLATION_LIMIT: 250, // Maximum extrapolation time in ms
};
// Network message types
export var MessageType;
(function (MessageType) {
    // Client -> Server messages
    MessageType["PLAYER_JOIN"] = "player:join";
    MessageType["PLAYER_LEAVE"] = "player:leave";
    MessageType["PLAYER_INPUT"] = "player:input";
    MessageType["PLAYER_ATTACK"] = "player:attack";
    MessageType["PLAYER_RESPAWN"] = "player:respawn";
    // Server -> Client messages
    MessageType["CONNECTION_ACCEPTED"] = "connection:accepted";
    MessageType["GAME_STATE"] = "game:state";
    MessageType["ENTITY_SPAWN"] = "entity:spawn";
    MessageType["ENTITY_DESPAWN"] = "entity:despawn";
    MessageType["ENTITY_UPDATE"] = "entity:update";
    MessageType["ATTACK_EVENT"] = "attack:event";
    MessageType["DAMAGE_EVENT"] = "damage:event";
    MessageType["DEATH_EVENT"] = "death:event";
    MessageType["LEVEL_UP_EVENT"] = "levelup:event";
    // Error messages
    MessageType["ERROR"] = "error";
    MessageType["DISCONNECT"] = "disconnect";
    MessageType["CONNECTION_REJECTED"] = "connection:rejected";
    MessageType["JOIN_GAME"] = "join:game";
})(MessageType || (MessageType = {}));
// Connection states
export var ConnectionState;
(function (ConnectionState) {
    ConnectionState["DISCONNECTED"] = "disconnected";
    ConnectionState["CONNECTING"] = "connecting";
    ConnectionState["CONNECTED"] = "connected";
    ConnectionState["RECONNECTING"] = "reconnecting";
    ConnectionState["ERROR"] = "error";
})(ConnectionState || (ConnectionState = {}));
// Connection and validation settings
export const NETWORK_SETTINGS = {
    MAX_PLAYERS_PER_SERVER: 100, // Maximum concurrent players
    CONNECTION_TIMEOUT: 30000, // 30 seconds to establish connection
    HEARTBEAT_INTERVAL: 5000, // 5 seconds between heartbeats
    HEARTBEAT_TIMEOUT: 15000, // 15 seconds before considering connection dead
    // Input validation
    MAX_INPUT_RATE: 120, // Maximum inputs per second (2x tick rate for safety)
    INPUT_SEQUENCE_WINDOW: 300, // Accept inputs up to 300 sequence numbers old
    MAX_POSITION_ERROR: 10, // Maximum allowed position prediction error (pixels)
    // Lag compensation
    MAX_REWIND_TIME: 250, // Maximum lag compensation rewind (250ms)
    MIN_REWIND_TIME: 0, // Minimum rewind time
    // Rate limiting
    MAX_ATTACKS_PER_SECOND: 10, // Maximum attack messages per second
    MAX_MESSAGES_PER_SECOND: 200, // Maximum total messages per second
};
// Binary protocol settings for optimization
export const BINARY_PROTOCOL = {
    POSITION_UPDATE_SIZE: 12, // bytes: [entityId(4), x(4), y(4)]
    INPUT_MESSAGE_SIZE: 16, // bytes: [sequence(4), timestamp(4), keys(1), mouseX(4), mouseY(4)]
    USE_COMPRESSION: true, // Enable message compression
    COMPRESSION_THRESHOLD: 100, // Compress messages larger than 100 bytes
};
// Priority levels for different update types
export const UPDATE_PRIORITY = {
    PLAYER_POSITION: 10, // Highest priority
    PLAYER_COMBAT: 9,
    MONSTER_POSITION: 5,
    MONSTER_COMBAT: 7,
    PROJECTILE: 8,
    EFFECT: 3,
    WORLD_STATE: 1, // Lowest priority
};
// Area of Interest (AOI) settings for optimization
export const AOI_CONFIG = {
    PLAYER_VIEW_DISTANCE: 800, // Players see entities within 800 pixels
    MONSTER_SYNC_DISTANCE: 1000, // Sync monsters within 1000 pixels
    EFFECT_SYNC_DISTANCE: 600, // Sync effects within 600 pixels
    EXTENDED_VIEW_DISTANCE: 1200, // Maximum view distance for important events
};
// Reconnection settings
export const RECONNECT_CONFIG = {
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY_BASE: 1000, // 1 second base delay
    RECONNECT_DELAY_MAX: 10000, // 10 seconds max delay
    RECONNECT_DELAY_MULTIPLIER: 2, // Exponential backoff multiplier
    STATE_RESTORE_WINDOW: 30000, // 30 seconds to restore disconnected player state
};
// Debug and monitoring
export const DEBUG_CONFIG = {
    SHOW_NETWORK_STATS: false, // Show network statistics overlay
    LOG_NETWORK_MESSAGES: false, // Log all network messages
    SIMULATE_LAG: false, // Enable lag simulation
    SIMULATED_LAG_MS: 100, // Simulated lag amount
    SIMULATE_PACKET_LOSS: false, // Enable packet loss simulation
    PACKET_LOSS_RATE: 0.01, // 1% packet loss when enabled
};
//# sourceMappingURL=NetworkConfig.js.map