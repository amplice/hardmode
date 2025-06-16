/**
 * LLM_NOTE: Network configuration constants for client-server communication.
 * These values control timing, performance, and reliability of the multiplayer experience.
 *
 * ARCHITECTURE_DECISION: These values are tuned for supporting 100+ concurrent players
 * with smooth gameplay at up to 100ms latency.
 */
export declare const SERVER_CONFIG: {
    readonly TICK_RATE: 60;
    readonly TICK_INTERVAL: number;
    readonly NETWORK_UPDATE_RATE: 20;
    readonly NETWORK_UPDATE_INTERVAL: number;
};
export declare const CLIENT_CONFIG: {
    readonly RENDER_RATE: 60;
    readonly INPUT_BUFFER_SIZE: 60;
    readonly STATE_BUFFER_SIZE: 20;
    readonly INTERPOLATION_DELAY: 100;
    readonly EXTRAPOLATION_LIMIT: 250;
};
export declare enum MessageType {
    PLAYER_JOIN = "player:join",
    PLAYER_LEAVE = "player:leave",
    PLAYER_INPUT = "player:input",
    PLAYER_ATTACK = "player:attack",
    PLAYER_RESPAWN = "player:respawn",
    CONNECTION_ACCEPTED = "connection:accepted",
    GAME_STATE = "game:state",
    ENTITY_SPAWN = "entity:spawn",
    ENTITY_DESPAWN = "entity:despawn",
    ENTITY_UPDATE = "entity:update",
    ATTACK_EVENT = "attack:event",
    DAMAGE_EVENT = "damage:event",
    DEATH_EVENT = "death:event",
    LEVEL_UP_EVENT = "levelup:event",
    ERROR = "error",
    DISCONNECT = "disconnect",
    CONNECTION_REJECTED = "connection:rejected",
    JOIN_GAME = "join:game"
}
export declare enum ConnectionState {
    DISCONNECTED = "disconnected",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    RECONNECTING = "reconnecting",
    ERROR = "error"
}
export declare const NETWORK_SETTINGS: {
    readonly MAX_PLAYERS_PER_SERVER: 100;
    readonly CONNECTION_TIMEOUT: 30000;
    readonly HEARTBEAT_INTERVAL: 5000;
    readonly HEARTBEAT_TIMEOUT: 15000;
    readonly MAX_INPUT_RATE: 120;
    readonly INPUT_SEQUENCE_WINDOW: 300;
    readonly MAX_POSITION_ERROR: 10;
    readonly MAX_REWIND_TIME: 250;
    readonly MIN_REWIND_TIME: 0;
    readonly MAX_ATTACKS_PER_SECOND: 10;
    readonly MAX_MESSAGES_PER_SECOND: 200;
};
export declare const BINARY_PROTOCOL: {
    readonly POSITION_UPDATE_SIZE: 12;
    readonly INPUT_MESSAGE_SIZE: 16;
    readonly USE_COMPRESSION: true;
    readonly COMPRESSION_THRESHOLD: 100;
};
export declare const UPDATE_PRIORITY: {
    readonly PLAYER_POSITION: 10;
    readonly PLAYER_COMBAT: 9;
    readonly MONSTER_POSITION: 5;
    readonly MONSTER_COMBAT: 7;
    readonly PROJECTILE: 8;
    readonly EFFECT: 3;
    readonly WORLD_STATE: 1;
};
export declare const AOI_CONFIG: {
    readonly PLAYER_VIEW_DISTANCE: 800;
    readonly MONSTER_SYNC_DISTANCE: 1000;
    readonly EFFECT_SYNC_DISTANCE: 600;
    readonly EXTENDED_VIEW_DISTANCE: 1200;
};
export declare const RECONNECT_CONFIG: {
    readonly MAX_RECONNECT_ATTEMPTS: 5;
    readonly RECONNECT_DELAY_BASE: 1000;
    readonly RECONNECT_DELAY_MAX: 10000;
    readonly RECONNECT_DELAY_MULTIPLIER: 2;
    readonly STATE_RESTORE_WINDOW: 30000;
};
export declare const DEBUG_CONFIG: {
    readonly SHOW_NETWORK_STATS: false;
    readonly LOG_NETWORK_MESSAGES: false;
    readonly SIMULATE_LAG: false;
    readonly SIMULATED_LAG_MS: 100;
    readonly SIMULATE_PACKET_LOSS: false;
    readonly PACKET_LOSS_RATE: 0.01;
};
//# sourceMappingURL=NetworkConfig.d.ts.map