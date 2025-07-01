/**
 * @fileoverview GameConstants - Shared configuration for client-server consistency
 * 
 * ARCHITECTURE ROLE:
 * - Central configuration shared between client and server
 * - Ensures identical game behavior across all instances
 * - Provides tunable parameters for balance and performance
 * - Maintains deterministic gameplay constants
 * 
 * CONFIGURATION CATEGORIES:
 * - World: Map size, tile dimensions, generation seeds
 * - Network: Tick rates, view distances, optimization settings
 * - Gameplay: Spawn rates, level progression, combat timing
 * - Debug: Development flags and logging controls
 * 
 * CLIENT-SERVER SYNCHRONIZATION:
 * Critical for multiplayer consistency:
 * - Identical constants ensure matching game logic
 * - World generation uses same parameters
 * - Timing constants prevent desynchronization
 * - Balance values consistent across all players
 * 
 * PERFORMANCE TUNING:
 * Constants enable performance optimization:
 * - World size affects chunked rendering decisions
 * - Network settings optimize bandwidth usage
 * - Spawn limits prevent server overload
 * - Debug flags control logging overhead
 * 
 * DEVELOPMENT SUPPORT:
 * Configuration for testing and debugging:
 * - Debug tileset for visual development
 * - Playtest mode for rapid progression testing
 * - Logging controls for specific system debugging
 * - Performance monitoring flags
 * 
 * BALANCE CONFIGURATION:
 * Game balance through data-driven design:
 * - Monster stats centralized for easy tuning
 * - Level progression formulas configurable
 * - Combat timing and damage values adjustable
 * - Spawn rates and distributions modifiable
 */

// Shared game constants used by both client and server
export const GAME_CONSTANTS = {
    // World settings - increased for testing chunked rendering performance
    WORLD: {
        WIDTH: 500,  // Increased from 200 to test large world scaling
        HEIGHT: 500, // Increased from 200 to test large world scaling
        TILE_SIZE: 64,
        SEED: 42 // Default seed, server will override with generated seed
    },
    
    // Server tick rate
    TICK_RATE: 30,
    
    // Spawn system - EXTREME STRESS TEST
    SPAWN: {
        MAX_MONSTERS: 500, // EXTREME: Testing performance limits!
        INITIAL_MONSTERS: 50, // Start with more monsters for immediate stress test
        INTERVAL: 0.05, // LIGHTNING FAST: New monster every 50ms for stress testing
        MIN_DISTANCE_FROM_PLAYER: 700,
        MAX_DISTANCE_FROM_PLAYER: 8000, // Sufficient for larger world
        WORLD_EDGE_MARGIN: 2000 // Increased proportionally for 500x500 world
    },
    
    // Network settings
    NETWORK: {
        VIEW_DISTANCE: 1500, // Area of Interest radius
        STATE_SYNC_RATE: 30 // Hz
    },
    
    // Player settings
    PLAYER: {
        SPAWN_PROTECTION_DURATION: 3.0, // seconds
        RESPAWN_TIME: 3.0, // seconds
        DAMAGE_STUN_DURATION: 0.25 // seconds
    },
    
    // Monster settings
    MONSTER: {
        DAMAGE_STUN_DURATION: 0.36 // seconds - matches hit animation duration (15 frames at 0.7 speed)
    },
    
    // Level progression settings
    LEVELS: {
        MAX_LEVEL: 10,
        XP_GROWTH: 20, // Used in triangular progression formula
        PLAYTEST_MODE: true, // Toggle this for easy leveling (20 XP per level)
        PLAYTEST_XP_PER_LEVEL: 20 // XP needed per level in playtest mode
    },
    
    // Debug settings
    DEBUG: {
        LOG_LIMIT: 10 * 1024 * 1024, // 10MB
        USE_DEBUG_TILESET: false, // Toggle to use annotated tileset for debugging
        ENABLE_TILE_LOGGING: false, // Toggle for tile debug logs
        ENABLE_MONSTER_LOGGING: false, // Toggle for monster debug logs
        ENABLE_COMBAT_LOGGING: false // Toggle for combat debug logs
    }
};

// Monster type weights for spawning
export const MONSTER_SPAWN_WEIGHTS = {
    skeleton: 0.2,
    elemental: 0.2,
    ghoul: 0.2,
    ogre: 0.2,
    wildarcher: 0.2
};

// Centralized monster statistics
export const MONSTER_STATS = {
    ogre: {
        hp: 4,
        moveSpeed: 2,
        damage: 1,
        attackRange: 90,
        aggroRange: 800,
        xp: 20,
        attackCooldown: 2500,
        collisionRadius: 35,
        attackDelay: 750, // ms delay before damage (75% of 1000ms animation)
        attackDuration: 1000 // Total animation duration (15 frames at 0.25 speed)
    },
    skeleton: {
        hp: 2,
        moveSpeed: 2.5,
        damage: 1,
        attackRange: 70,
        aggroRange: 1200,
        xp: 5,
        attackCooldown: 1800,
        collisionRadius: 15,
        attackDelay: 625, // ms delay before damage (75% of 833ms animation)
        attackDuration: 833 // Total animation duration (15 frames at 0.3 speed)
    },
    elemental: {
        hp: 3,
        moveSpeed: 2,
        damage: 2,
        attackRange: 100,
        aggroRange: 800,
        xp: 10,
        attackCooldown: 3000,
        collisionRadius: 15,
        attackDelay: 625, // ms delay before damage (75% of 833ms animation)
        attackDuration: 833 // Total animation duration (15 frames at 0.3 speed)
    },
    ghoul: {
        hp: 2,
        moveSpeed: 3.5,
        damage: 1,
        attackRange: 70,
        aggroRange: 3000,
        xp: 15,
        attackCooldown: 1200,
        collisionRadius: 10,
        attackDelay: 469, // ms delay before damage (75% of 625ms animation)
        attackDuration: 625 // Total animation duration (15 frames at 0.4 speed)
    },
    wildarcher: {
        hp: 1,
        moveSpeed: 3,
        damage: 1,
        attackRange: 500,
        aggroRange: 1500,
        xp: 10,
        attackCooldown: 3000,
        collisionRadius: 15,
        attackDelay: 536, // ms delay before damage (75% of 714ms animation)
        attackDuration: 714 // Total animation duration (15 frames at 0.35 speed)
    }
};

// Player class statistics
export const PLAYER_STATS = {
    bladedancer: {
        hp: 3,
        moveSpeed: 5,
        baseColor: 0x3498db
    },
    guardian: {
        hp: 4,
        moveSpeed: 3.5,
        baseColor: 0xe74c3c
    },
    hunter: {
        hp: 1,
        moveSpeed: 5,
        baseColor: 0x2ecc71
    },
    rogue: {
        hp: 2,
        moveSpeed: 6,
        baseColor: 0x9b59b6
    }
};