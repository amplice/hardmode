// Shared game constants used by both client and server
export const GAME_CONSTANTS = {
    // World settings
    WORLD: {
        WIDTH: 100,
        HEIGHT: 100,
        TILE_SIZE: 64,
        SEED: 42
    },
    
    // Server tick rate
    TICK_RATE: 30,
    
    // Spawn system
    SPAWN: {
        MAX_MONSTERS: 20,
        INTERVAL: 5, // seconds
        MIN_DISTANCE_FROM_PLAYER: 700,
        MAX_DISTANCE_FROM_PLAYER: 10000,
        WORLD_EDGE_MARGIN: 500
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
    
    // Level progression settings
    LEVELS: {
        MAX_LEVEL: 10,
        XP_GROWTH: 20, // Used in triangular progression formula
        PLAYTEST_MODE: true, // Toggle this for easy leveling (20 XP per level)
        PLAYTEST_XP_PER_LEVEL: 20 // XP needed per level in playtest mode
    },
    
    // Debug settings
    DEBUG: {
        LOG_LIMIT: 10 * 1024 * 1024 // 10MB
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
        attackDelay: 300, // ms delay before damage
        attackDuration: 1500 // Total animation duration
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
        attackDelay: 250,
        attackDuration: 1100
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
        attackDelay: 400,
        attackDuration: 1200
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
        attackDelay: 200,
        attackDuration: 700
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
        attackDelay: 350,
        attackDuration: 1000
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