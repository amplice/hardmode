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

import type { 
    AttackDefinition, 
    CharacterClass, 
    MonsterType, 
    AttackType, 
    HitboxType,
    PowerupType,
    BiomeConfig,
    ElevationConfig
} from '../types/GameTypes.js';

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
    
    // Spawn system
    SPAWN: {
        MAX_MONSTERS: 150, // Increased monster count
        INITIAL_MONSTERS: 40, // Start with more monsters
        INTERVAL: 1.5, // Spawn new monster every 1.5 seconds
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
        DAMAGE_STUN_DURATION: 0.25, // seconds
        COLLISION_RADIUS: 20 // pixels - used for hit detection
    },
    
    // PvP settings
    PVP: {
        ENABLED: true, // Global PvP toggle
        DAMAGE_MULTIPLIER: 1.0, // Damage scaling for PvP
        MAX_TARGETS_PER_ABILITY: 10 // Performance limit
    },
    
    // Monster settings
    MONSTER: {
        DAMAGE_STUN_DURATION: 0.36 // seconds - matches hit animation duration (15 frames at 0.7 speed)
    },
    
    // Level progression settings
    LEVELS: {
        MAX_LEVEL: 10,
        XP_GROWTH: 20, // Used in triangular progression formula
        PLAYTEST_MODE: false, // Toggle this for easy leveling (20 XP per level)
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

// Powerup system configuration
export const POWERUP_CONFIG = {
    DROP_RATE: 0.15, // 15% chance on monster death
    DESPAWN_TIME: 30000, // 30 seconds before powerup disappears
    PICKUP_RADIUS: 32, // Collision radius in pixels for pickup
    
    EFFECTS: {
        health: { 
            duration: 0, // Instant effect
            instant: true,
            healAmount: 1
        },
        armor: { 
            duration: 0, // Instant effect
            instant: true,
            armorAmount: 1
        },
        speed: { 
            duration: 12000, // 12 seconds
            multiplier: 1.5 // +50% speed
        },
        damage: { 
            duration: 7000, // 7 seconds
            bonus: 1 // +1 damage
        },
        invulnerability: { 
            duration: 3000 // 3 seconds
        }
    },
    
    SPRITES: {
        health: '/src/assets/sprites/powerups/health_powerup.png',
        armor: '/src/assets/sprites/powerups/armor_powerup.png',
        speed: '/src/assets/sprites/powerups/speed_powerup.png',
        damage: '/src/assets/sprites/powerups/attack_powerup.png',
        invulnerability: '/src/assets/sprites/powerups/invulnerability_powerup.png'
    }
} as const;

// Monster type weights for spawning
export const MONSTER_SPAWN_WEIGHTS = {
    skeleton: 0.125,
    elemental: 0.125,
    ghoul: 0.125,
    ogre: 0.125,
    wildarcher: 0.125,
    darkmage: 0.125,
    wolf: 0.125,
    wingeddemon: 0.125
};

// Centralized monster statistics
export const MONSTER_STATS = {
    ogre: {
        hp: 4,
        moveSpeed: 2,
        damage: 1,
        attackRange: 90,
        aggroRange: 1000,
        xp: 20,
        attackCooldown: 2500,
        collisionRadius: 35,
        attackDelay: 750, // ms delay before damage (75% of 1000ms animation)
        attackDuration: 1000, // Total animation duration (15 frames at 0.25 speed)
        attacks: {
            primary: 'monster_ogre_primary',
            special1: 'monster_ogre_spin'
        }
    },
    skeleton: {
        hp: 2,
        moveSpeed: 2.5,  // Updated speed
        damage: 1,
        attackRange: 70,
        aggroRange: 1200,
        xp: 5,
        attackCooldown: 1800,
        collisionRadius: 20,
        attackDelay: 625, // ms delay before damage (75% of 833ms animation)
        attackDuration: 833, // Total animation duration (15 frames at 0.3 speed)
        attacks: {
            primary: 'monster_skeleton_primary'
        }
    },
    elemental: {
        hp: 3,
        moveSpeed: 2.5,
        damage: 2,
        attackRange: 100,
        aggroRange: 800,
        xp: 10,
        attackCooldown: 3000,
        collisionRadius: 20,
        attackDelay: 625, // ms delay before damage (75% of 833ms animation)
        attackDuration: 833, // Total animation duration (15 frames at 0.3 speed)
        attacks: {
            primary: 'monster_elemental_primary'
        }
    },
    ghoul: {
        hp: 2,
        moveSpeed: 4,  // Updated speed
        damage: 1,
        attackRange: 84,  // Increased for 1.2x size
        aggroRange: 3000,
        xp: 15,
        attackCooldown: 1200,
        collisionRadius: 18,  // 1.2x of original 15
        attackDelay: 469, // ms delay before damage (75% of 625ms animation)
        attackDuration: 625, // Total animation duration (15 frames at 0.4 speed)
        attacks: {
            primary: 'monster_ghoul_primary'
        }
    },
    wildarcher: {
        hp: 1,
        moveSpeed: 3,
        damage: 1,
        attackRange: 500,
        aggroRange: 1500,
        xp: 10,
        attackCooldown: 3000,
        collisionRadius: 20,
        attackDelay: 536, // ms delay before damage (75% of 714ms animation)
        attackDuration: 714, // Total animation duration (15 frames at 0.35 speed)
        attacks: {
            primary: 'monster_wildarcher_primary'
        }
    },
    darkmage: {
        hp: 2,
        moveSpeed: 3.5,  // Updated speed
        damage: 2,
        attackRange: 500,
        aggroRange: 1000,
        xp: 30,
        attackCooldown: 2000,
        collisionRadius: 20,
        attackDelay: 600, // ms delay before damage for projectile
        attackDuration: 833, // Total animation duration
        attacks: {
            primary: 'monster_darkmage_shadowbolt',
            special1: 'monster_darkmage_teleport'
        }
    },
    wolf: {
        hp: 1,
        moveSpeed: 5.5,  // Fast predator
        damage: 1,
        attackRange: 85,  // Increased for 1.5x size
        aggroRange: 3000,
        xp: 15,
        attackCooldown: 1200,
        collisionRadius: 22,  // ~1.5x of original 15
        attackDelay: 469, // ms delay before damage (75% of 625ms animation)
        attackDuration: 625, // Total animation duration (15 frames at 0.4 speed)
        attacks: {
            primary: 'monster_wolf_primary',
            special1: 'monster_wolf_special'
        }
    },
    wingeddemon: {
        hp: 2,
        moveSpeed: 2.5,
        damage: 1,
        attackRange: 105,  // 1.5x of 70
        aggroRange: 1200,
        xp: 5,
        attackCooldown: 1800,
        collisionRadius: 30,  // 1.5x of 20
        attackDelay: 625, // ms delay before damage (75% of 833ms animation)
        attackDuration: 833, // Total animation duration (15 frames at 0.3 speed)
        attacks: {
            primary: 'monster_wingeddemon_primary',
            special1: 'monster_wingeddemon_special'
        }
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
export const ATTACK_DEFINITIONS = {
    // Default attacks (used by Bladedancer)
    primary: {
        archetype: 'standard_melee',
        damage: 1,
        windupTime: 133,
        recoveryTime: 200,
        cooldown: 100,
        hitboxType: 'rectangle',
        hitboxParams: {
            width: 45,
            length: 85
        }
    },
    secondary: {
        archetype: 'standard_melee',
        damage: 2,
        windupTime: 500,
        recoveryTime: 300,
        cooldown: 800,
        hitboxType: 'rectangle',
        hitboxParams: {
            width: 70,
            length: 110
        }
    },
    
    // Bladedancer attacks (same as defaults)
    bladedancer_primary: {
        archetype: 'standard_melee',
        damage: 1,
        windupTime: 133,
        recoveryTime: 200,
        cooldown: 100,
        hitboxType: 'rectangle',
        hitboxParams: {
            width: 45,
            length: 85
        }
    },
    bladedancer_secondary: {
        archetype: 'standard_melee',
        damage: 2,
        windupTime: 500,
        recoveryTime: 300,
        cooldown: 800,
        hitboxType: 'rectangle',
        hitboxParams: {
            width: 70,
            length: 110
        }
    },
    
    // Guardian attacks
    guardian_primary: {
        archetype: 'standard_melee',
        damage: 1,
        windupTime: 250,
        recoveryTime: 300,
        cooldown: 200,
        hitboxType: 'cone',
        hitboxParams: {
            range: 110,
            angle: 110
        }
    },
    guardian_secondary: {
        archetype: 'jump_attack',
        damage: 2,
        windupTime: 150,
        jumpDuration: 325,
        recoveryTime: 200,
        cooldown: 1250,
        dashDistance: 200,
        invulnerable: true,
        hitboxType: 'circle',
        hitboxParams: {
            radius: 75
        }
    },
    
    // Hunter attacks
    hunter_primary: {
        archetype: 'projectile',
        damage: 1,
        windupTime: 83,
        recoveryTime: 250,
        cooldown: 0,
        projectileSpeed: 800,
        projectileRange: 1000
    },
    hunter_secondary: {
        archetype: 'jump_attack',
        damage: 2,
        windupTime: 150,
        jumpDuration: 400,
        recoveryTime: 200,
        cooldown: 1600,
        dashDistance: 300,
        backwardJump: true,
        attackFromStart: true,
        hitboxType: 'rectangle',
        hitboxParams: {
            width: 60,
            length: 100
        }
    },
    
    // Rogue attacks
    rogue_primary: {
        archetype: 'standard_melee',
        damage: 1,
        windupTime: 83,
        recoveryTime: 150,
        cooldown: 50,
        hitboxType: 'rectangle',
        hitboxParams: {
            width: 40,
            length: 70
        }
    },
    rogue_secondary: {
        archetype: 'dash_attack',
        damage: 1, // Unique: only secondary that deals 1 damage
        windupTime: 100,
        dashDuration: 250,
        recoveryTime: 150,
        cooldown: 1000,
        dashDistance: 250,
        invulnerable: true,
        hitboxType: 'rectangle',
        hitboxParams: {
            width: 50,
            length: 80
        }
    },
    
    // Phase 4.1: Monster attack definitions - centralized for consistency
    monster_ogre_primary: {
        archetype: 'standard_melee',
        damage: 2,
        windupTime: 750, // attackDelay from MONSTER_STATS
        recoveryTime: 250, // Remaining animation time
        cooldown: 2500,
        range: 90,
        hitboxType: 'cone',
        hitboxParams: {
            range: 120,
            angle: 90  // Wide cone for heavy swing
        }
    },
    monster_skeleton_primary: {
        archetype: 'standard_melee',
        damage: 1,
        windupTime: 625,
        recoveryTime: 208, // Remaining animation time
        cooldown: 1800,
        range: 70,
        hitboxType: 'cone',
        hitboxParams: {
            range: 80,
            angle: 70  // Medium cone for sword swing
        }
    },
    monster_elemental_primary: {
        archetype: 'standard_melee',
        damage: 2,
        windupTime: 625,
        recoveryTime: 208,
        cooldown: 3000,
        range: 100,
        hitboxType: 'circle',
        hitboxParams: {
            radius: 100  // Burst radius around the elemental
        }
    },
    monster_ghoul_primary: {
        archetype: 'standard_melee',
        damage: 1,
        windupTime: 469,
        recoveryTime: 156,
        cooldown: 1200,
        range: 84,  // Matches updated attack range
        hitboxType: 'cone',
        hitboxParams: {
            range: 96,
            angle: 60  // Narrower cone for claw swipe
        }
    },
    monster_wildarcher_primary: {
        archetype: 'projectile',
        damage: 1,
        windupTime: 536,
        recoveryTime: 178,
        cooldown: 3000,
        range: 500,
        projectileSpeed: 400,
        projectileRange: 500,
        hitboxType: 'projectile',
        hitboxParams: {
            width: 8,
            length: 20
        }
    },
    
    // Special attacks for monsters
    monster_ogre_spin: {
        archetype: 'multi_hit_melee',
        name: 'Spin Attack',
        damage: 1,
        windupTime: 500,
        recoveryTime: 500,
        cooldown: 5000,
        range: 200,
        hitboxType: 'circle',
        hitboxParams: {
            radius: 120
        },
        multiHit: {
            hits: 3,
            interval: 500,
            duration: 1500
        },
        animation: 'attack3', // Uses Attack3.png animation
        windupAnimation: 'attack3_windup', // Uses BlockStart.png for windup
        moveSpeedMultiplier: 3.0 // 300% movement speed during spin
    },
    
    // Dark Mage attacks
    monster_darkmage_shadowbolt: {
        archetype: 'projectile',
        name: 'Shadow Bolt',
        damage: 1,
        windupTime: 300,
        recoveryTime: 300,
        cooldown: 750,
        range: 400,
        projectileSpeed: 450,
        projectileRange: 450,
        hitboxType: 'projectile',
        hitboxParams: {
            width: 15,
            length: 30
        },
        animation: 'attack1'
    },
    
    monster_darkmage_teleport: {
        archetype: 'teleport_melee',
        name: 'Teleport Strike',
        damage: 2,
        windupTime: 333,  // 5 frames at 0.25 speed = 5/(60*0.25) = 333ms
        recoveryTime: 400,  // Quick recovery after attack
        cooldown: 4000,
        range: 400,  // Max teleport distance
        teleportBehindDistance: 60,  // How far behind player
        hitboxType: 'cone',  // Changed from rectangle to cone
        hitboxParams: {
            range: 90,
            angle: 80  // 80 degree cone
        },
        animation: 'special1',
        windupAnimation: 'special1_windup',  // First 5 frames
        attackAnimation: 'pummel',  // Pummel animation for actual attack
        attackDelay: 400  // 200ms for animation + 200ms extra delay for player reaction time
    },
    
    // Wolf attacks
    monster_wolf_primary: {
        archetype: 'standard_melee',
        damage: 1,
        windupTime: 469,
        recoveryTime: 156,
        cooldown: 1200,
        range: 85,  // Increased for 1.5x size
        hitboxType: 'rectangle',
        hitboxParams: {
            width: 70,   // Narrower bite/lunge
            length: 105  // ~1.5x of 70
        },
        animation: 'attack1'
    },
    
    monster_wolf_special: {
        archetype: 'jump_attack',
        name: 'Pounce',
        damage: 1,
        windupTime: 200,
        jumpDuration: 500,  // Extended jump time
        recoveryTime: 10000,  // 10 seconds for testing
        cooldown: 3000,
        range: 250,  // Increased from 180
        dashDistance: 250,  // Increased from 180
        hitboxType: 'circle',
        hitboxParams: {
            radius: 60  // Smaller than Guardian's 75
        },
        animation: 'attack2'  // Uses Attack2.png
    },
    
    // WingedDemon attacks (1.5x size)
    monster_wingeddemon_primary: {
        archetype: 'standard_melee',
        damage: 1,
        windupTime: 625,
        recoveryTime: 208, // Remaining animation time
        cooldown: 1800,
        range: 105,  // 1.5x of 70
        hitboxType: 'cone',
        hitboxParams: {
            range: 120,
            angle: 85  // Wide cone for demon claw sweep
        }
    },
    
    monster_wingeddemon_special: {
        archetype: 'ranged_aoe',
        name: 'Infernal Strike',
        damage: 2,
        windupTime: 800,  // Warning duration
        recoveryTime: 200,
        cooldown: 8000,
        range: 400,
        minRange: 100,
        hitboxType: 'circle',
        hitboxParams: {
            radius: 50
        },
        animation: 'attack5',
        freezeFrame: 11,  // Freeze on frame 11
        warningEffect: 'wingeddemon_warning_effect',
        damageEffect: 'wingeddemon_damage_effect'
    }
};

// Biome type constants
export const BIOME_TYPES = {
    GRASS: 0,
    DARK_GRASS: 1,
    SNOW: 2
};