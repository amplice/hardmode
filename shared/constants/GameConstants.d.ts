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
export declare const GAME_CONSTANTS: {
    WORLD: {
        WIDTH: number;
        HEIGHT: number;
        TILE_SIZE: number;
        SEED: number;
    };
    TICK_RATE: number;
    SPAWN: {
        MAX_MONSTERS: number;
        INITIAL_MONSTERS: number;
        INTERVAL: number;
        MIN_DISTANCE_FROM_PLAYER: number;
        MAX_DISTANCE_FROM_PLAYER: number;
        WORLD_EDGE_MARGIN: number;
    };
    NETWORK: {
        VIEW_DISTANCE: number;
        STATE_SYNC_RATE: number;
    };
    PLAYER: {
        SPAWN_PROTECTION_DURATION: number;
        RESPAWN_TIME: number;
        DAMAGE_STUN_DURATION: number;
    };
    MONSTER: {
        DAMAGE_STUN_DURATION: number;
    };
    LEVELS: {
        MAX_LEVEL: number;
        XP_GROWTH: number;
        PLAYTEST_MODE: boolean;
        PLAYTEST_XP_PER_LEVEL: number;
    };
    DEBUG: {
        LOG_LIMIT: number;
        USE_DEBUG_TILESET: boolean;
        ENABLE_TILE_LOGGING: boolean;
        ENABLE_MONSTER_LOGGING: boolean;
        ENABLE_COMBAT_LOGGING: boolean;
    };
};
export declare const MONSTER_SPAWN_WEIGHTS: {
    skeleton: number;
    elemental: number;
    ghoul: number;
    ogre: number;
    wildarcher: number;
};
export declare const MONSTER_STATS: {
    ogre: {
        hp: number;
        moveSpeed: number;
        damage: number;
        attackRange: number;
        aggroRange: number;
        xp: number;
        attackCooldown: number;
        collisionRadius: number;
        attackDelay: number;
        attackDuration: number;
    };
    skeleton: {
        hp: number;
        moveSpeed: number;
        damage: number;
        attackRange: number;
        aggroRange: number;
        xp: number;
        attackCooldown: number;
        collisionRadius: number;
        attackDelay: number;
        attackDuration: number;
    };
    elemental: {
        hp: number;
        moveSpeed: number;
        damage: number;
        attackRange: number;
        aggroRange: number;
        xp: number;
        attackCooldown: number;
        collisionRadius: number;
        attackDelay: number;
        attackDuration: number;
    };
    ghoul: {
        hp: number;
        moveSpeed: number;
        damage: number;
        attackRange: number;
        aggroRange: number;
        xp: number;
        attackCooldown: number;
        collisionRadius: number;
        attackDelay: number;
        attackDuration: number;
    };
    wildarcher: {
        hp: number;
        moveSpeed: number;
        damage: number;
        attackRange: number;
        aggroRange: number;
        xp: number;
        attackCooldown: number;
        collisionRadius: number;
        attackDelay: number;
        attackDuration: number;
    };
};
export declare const PLAYER_STATS: {
    bladedancer: {
        hp: number;
        moveSpeed: number;
        baseColor: number;
    };
    guardian: {
        hp: number;
        moveSpeed: number;
        baseColor: number;
    };
    hunter: {
        hp: number;
        moveSpeed: number;
        baseColor: number;
    };
    rogue: {
        hp: number;
        moveSpeed: number;
        baseColor: number;
    };
};
/**
 * Phase 4.1: Centralized attack definitions for server-client consistency
 *
 * ARCHITECTURE ROLE:
 * - Single source of truth for all attack gameplay data
 * - Server references these for damage calculations
 * - Client references these for timing and hitbox validation
 * - Visual effects remain client-side in GameConfig.js
 *
 * ATTACK ARCHETYPES:
 * - standard_melee: Basic melee attacks with hitbox
 * - projectile: Ranged attacks that create projectiles
 * - jump_attack: Movement ability with damage on landing
 * - dash_attack: Movement ability with damage during dash
 *
 * CRITICAL FIELDS:
 * - damage: Base damage dealt by the attack
 * - cooldown: Time before attack can be used again (ms)
 * - windupTime: Delay before damage is dealt (ms)
 * - recoveryTime: Time after attack before control returns (ms)
 * - hitboxType: Shape of damage area (rectangle/cone/circle)
 * - hitboxParams: Size parameters for the hitbox
 */
export declare const ATTACK_DEFINITIONS: {
    primary: {
        archetype: string;
        damage: number;
        windupTime: number;
        recoveryTime: number;
        cooldown: number;
        hitboxType: string;
        hitboxParams: {
            width: number;
            length: number;
        };
    };
    secondary: {
        archetype: string;
        damage: number;
        windupTime: number;
        recoveryTime: number;
        cooldown: number;
        hitboxType: string;
        hitboxParams: {
            width: number;
            length: number;
        };
    };
    bladedancer_primary: {
        archetype: string;
        damage: number;
        windupTime: number;
        recoveryTime: number;
        cooldown: number;
        hitboxType: string;
        hitboxParams: {
            width: number;
            length: number;
        };
    };
    bladedancer_secondary: {
        archetype: string;
        damage: number;
        windupTime: number;
        recoveryTime: number;
        cooldown: number;
        hitboxType: string;
        hitboxParams: {
            width: number;
            length: number;
        };
    };
    guardian_primary: {
        archetype: string;
        damage: number;
        windupTime: number;
        recoveryTime: number;
        cooldown: number;
        hitboxType: string;
        hitboxParams: {
            range: number;
            angle: number;
        };
    };
    guardian_secondary: {
        archetype: string;
        damage: number;
        windupTime: number;
        jumpDuration: number;
        recoveryTime: number;
        cooldown: number;
        dashDistance: number;
        invulnerable: boolean;
        hitboxType: string;
        hitboxParams: {
            radius: number;
        };
    };
    hunter_primary: {
        archetype: string;
        damage: number;
        windupTime: number;
        recoveryTime: number;
        cooldown: number;
        projectileSpeed: number;
        projectileRange: number;
    };
    hunter_secondary: {
        archetype: string;
        damage: number;
        windupTime: number;
        jumpDuration: number;
        recoveryTime: number;
        cooldown: number;
        dashDistance: number;
        backwardJump: boolean;
        attackFromStart: boolean;
        hitboxType: string;
        hitboxParams: {
            width: number;
            length: number;
        };
    };
    rogue_primary: {
        archetype: string;
        damage: number;
        windupTime: number;
        recoveryTime: number;
        cooldown: number;
        hitboxType: string;
        hitboxParams: {
            width: number;
            length: number;
        };
    };
    rogue_secondary: {
        archetype: string;
        damage: number;
        windupTime: number;
        dashDuration: number;
        recoveryTime: number;
        cooldown: number;
        dashDistance: number;
        invulnerable: boolean;
        hitboxType: string;
        hitboxParams: {
            width: number;
            length: number;
        };
    };
};
//# sourceMappingURL=GameConstants.d.ts.map