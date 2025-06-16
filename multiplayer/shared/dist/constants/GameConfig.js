/**
 * LLM_NOTE: This file contains the EXACT game configuration values from the original single-player game.
 * These values MUST be preserved precisely to maintain identical gameplay experience.
 *
 * ARCHITECTURE_DECISION: All gameplay constants are centralized here and shared between
 * client and server to ensure consistency. Never hardcode these values elsewhere.
 *
 * SOURCE: Extracted from /src/js/config/GameConfig.js
 */
// Character class configurations - EXACT values from original game
export const CHARACTER_CLASSES = {
    bladedancer: {
        hitPoints: 3,
        moveSpeed: 5,
        baseColor: 0x3498db, // Blue
        spritePrefix: 'knight',
        animations: {
            idle: { speed: 0.2 },
            run: { speed: 0.5 },
            run_backward: { speed: 0.5 },
            strafe_left: { speed: 0.5 },
            strafe_right: { speed: 0.5 },
            attack1: { speed: 0.4, hitFrame: 8 },
            attack2: { speed: 0.3, hitFrame: 12 },
            roll: { speed: 0.5 },
            die: { speed: 0.2 },
            take_damage: { speed: 0.5 }
        }
    },
    guardian: {
        hitPoints: 4,
        moveSpeed: 3.5,
        baseColor: 0xe74c3c, // Red
        spritePrefix: 'guardian',
        animations: {
            idle: { speed: 0.15 },
            run: { speed: 0.4 },
            run_backward: { speed: 0.4 },
            strafe_left: { speed: 0.4 },
            strafe_right: { speed: 0.4 },
            attack1: { speed: 0.35, hitFrame: 8 },
            attack2: { speed: 0.35, hitFrame: 12 },
            roll: { speed: 0.5 },
            die: { speed: 0.2 },
            take_damage: { speed: 0.5 }
        }
    },
    hunter: {
        hitPoints: 1,
        moveSpeed: 5,
        baseColor: 0x2ecc71, // Green
        spritePrefix: 'hunter',
        animations: {
            idle: { speed: 0.2 },
            run: { speed: 0.5 },
            run_backward: { speed: 0.5 },
            strafe_left: { speed: 0.5 },
            strafe_right: { speed: 0.5 },
            attack1: { speed: 0.5, hitFrame: 8 },
            attack2: { speed: 0.5, hitFrame: 12 },
            roll: { speed: 0.5 },
            die: { speed: 0.2 },
            take_damage: { speed: 0.5 }
        }
    },
    rogue: {
        hitPoints: 2,
        moveSpeed: 6,
        baseColor: 0x9b59b6, // Purple
        spritePrefix: 'rogue',
        animations: {
            idle: { speed: 0.25 },
            run: { speed: 0.6 },
            run_backward: { speed: 0.6 },
            strafe_left: { speed: 0.6 },
            strafe_right: { speed: 0.6 },
            attack1: { speed: 0.5, hitFrame: 7 },
            attack2: { speed: 0.4, hitFrame: 10 },
            roll: { speed: 0.5 },
            die: { speed: 0.25 },
            take_damage: { speed: 0.6 }
        }
    }
};
// Character attack configurations - EXACT values from original game
export const CHARACTER_ATTACKS = {
    // Bladedancer attacks
    bladedancer_primary: {
        name: "Slash Attack",
        damage: 1,
        windupTime: 133,
        recoveryTime: 200,
        cooldown: 100,
        hitboxType: 'rectangle',
        hitboxParams: { width: 45, length: 85 },
        effectSequence: [
            { type: 'slash_effect', timing: 250 }
        ]
    },
    bladedancer_secondary: {
        name: "Smash Attack",
        damage: 2,
        windupTime: 500,
        recoveryTime: 300,
        cooldown: 800,
        hitboxType: 'rectangle',
        hitboxParams: { width: 70, length: 110 },
        effectSequence: [
            { type: 'strike_windup', timing: 100 },
            { type: 'strike_cast', timing: 500 }
        ]
    },
    // Guardian attacks
    guardian_primary: {
        name: "Sweeping Axe",
        damage: 1,
        windupTime: 250,
        recoveryTime: 300,
        cooldown: 200,
        hitboxType: 'cone',
        hitboxParams: { range: 110, angle: 110 },
        effectSequence: [
            { type: 'guardian_slash_effect', timing: 250 }
        ]
    },
    guardian_secondary: {
        name: "Jump Attack",
        damage: 2,
        windupTime: 150,
        jumpDuration: 325,
        recoveryTime: 200,
        cooldown: 1250,
        dashDistance: 200,
        invulnerable: true,
        hitboxType: 'circle',
        hitboxParams: { radius: 75 },
        effectSequence: [
            { type: 'guardian_jump_effect', timing: 475, useStartPosition: false }
        ],
        actionPointDelay: 325
    },
    // Hunter attacks
    hunter_primary: {
        name: "Bow Shot",
        damage: 1,
        windupTime: 100,
        recoveryTime: 100,
        cooldown: 100,
        projectileSpeed: 700,
        projectileRange: 600,
        projectileOffset: 30,
        projectileVisualEffectType: 'bow_shot_effect',
        hitboxType: 'projectile',
        hitboxParams: { width: 10, length: 30 },
        effectSequence: []
    },
    hunter_secondary: {
        name: "Retreat Shot",
        damage: 2,
        windupTime: 150,
        jumpDuration: 300,
        recoveryTime: 200,
        cooldown: 800,
        dashDistance: 200,
        jumpHeight: 50,
        backwardJump: true,
        attackFromStartPosition: true,
        hitboxType: 'cone',
        hitboxParams: { range: 80, angle: 70 },
        effectSequence: [
            { type: 'hunter_cone_effect', timing: 250, distance: 50, useStartPosition: true }
        ],
        actionPointDelay: 50
    },
    // Rogue attacks
    rogue_primary: {
        name: "Thrust Attack",
        damage: 1,
        windupTime: 133,
        recoveryTime: 200,
        cooldown: 100,
        hitboxType: 'rectangle',
        hitboxParams: { width: 30, length: 95 },
        effectSequence: [
            { type: 'rogue_thrust_effect', timing: 133 }
        ]
    },
    rogue_secondary: {
        name: "Dash Attack",
        damage: 1,
        windupTime: 50,
        dashDuration: 200,
        recoveryTime: 150,
        cooldown: 2000,
        dashDistance: 200,
        invulnerable: false,
        hitboxType: 'rectangle',
        hitboxParams: { width: 50, length: 200 },
        effectSequence: [
            { type: 'rogue_dash_effect', timing: 50 }
        ]
    },
    // Roll ability (unlocked at level 5)
    roll: {
        name: "Roll",
        damage: 0,
        windupTime: 50,
        dashDuration: 300,
        recoveryTime: 150,
        cooldown: 1000,
        dashDistance: 150,
        invulnerable: false,
        hitboxType: null,
        hitboxParams: null,
        effectSequence: []
    }
};
// Monster configurations - EXACT values from original game
export const MONSTER_STATS = {
    ogre: {
        hitPoints: 4,
        moveSpeed: 2,
        attackRange: 90,
        collisionRadius: 35,
        aggroRange: 800,
        xp: 20,
        animations: {
            walk: { speed: 0.3 },
            idle: { speed: 0.2 },
            attack1: { speed: 0.25, hitFrame: 9 },
            take_damage: { speed: 0.7 },
            die: { speed: 0.2 }
        }
    },
    skeleton: {
        hitPoints: 2,
        moveSpeed: 2.5,
        attackRange: 70,
        collisionRadius: 15,
        aggroRange: 1200,
        xp: 5,
        animations: {
            walk: { speed: 0.4 },
            idle: { speed: 0.2 },
            attack1: { speed: 0.3, hitFrame: 8 },
            take_damage: { speed: 0.7 },
            die: { speed: 0.5 }
        }
    },
    elemental: {
        hitPoints: 3,
        moveSpeed: 2,
        attackRange: 100,
        collisionRadius: 15,
        aggroRange: 800,
        xp: 10,
        animations: {
            walk: { speed: 0.4 },
            idle: { speed: 0.2 },
            attack1: { speed: 0.3, hitFrame: 8 },
            take_damage: { speed: 0.7 },
            die: { speed: 0.2 }
        }
    },
    ghoul: {
        hitPoints: 2,
        moveSpeed: 3.5,
        attackRange: 70,
        collisionRadius: 10,
        aggroRange: 3000,
        xp: 15,
        animations: {
            walk: { speed: 0.45 },
            idle: { speed: 0.25 },
            attack1: { speed: 0.4, hitFrame: 7 },
            take_damage: { speed: 0.7 },
            die: { speed: 0.25 }
        }
    },
    wildarcher: {
        hitPoints: 1,
        moveSpeed: 3,
        attackRange: 500,
        collisionRadius: 15,
        aggroRange: 1500,
        xp: 10,
        animations: {
            walk: { speed: 0.4 },
            idle: { speed: 0.2 },
            attack1: { speed: 0.35, hitFrame: 8 },
            take_damage: { speed: 0.7 },
            die: { speed: 0.3 }
        }
    }
};
// Monster attack patterns - EXACT values from original game
export const MONSTER_ATTACKS = {
    ogre: {
        windup: 0.5,
        duration: 0.2,
        recovery: 0.8,
        cooldown: 1.5,
        pattern: 'cone',
        coneAngleDegrees: 110,
        color: 0x885500,
        damage: 1
    },
    skeleton: {
        windup: 0.3,
        duration: 0.2,
        recovery: 0.6,
        cooldown: 0.7,
        pattern: 'cone',
        coneAngleDegrees: 70,
        color: 0xEEEEEE,
        damage: 1
    },
    elemental: {
        windup: 0.4,
        duration: 0.3,
        recovery: 0.5,
        cooldown: 2.5,
        pattern: 'circle',
        color: 0x42C0FB,
        damage: 1
    },
    ghoul: {
        windup: 0.2,
        duration: 0.2,
        recovery: 0.3,
        cooldown: 0.4,
        pattern: 'cone',
        color: 0x7CFC00,
        damage: 1
    },
    wildarcher: {
        windup: 0.4,
        duration: 0.2,
        recovery: 0.4,
        cooldown: 1.5,
        pattern: 'projectile',
        projectileSpeed: 600,
        projectileRange: 500,
        color: 0xAAFFAA,
        damage: 1,
        projectileEffect: 'wildarcher_shot_effect'
    }
};
// Movement modifiers - EXACT values from original game
export const MOVEMENT_MODIFIERS = {
    forward: 1.0, // 100% speed when moving forward
    strafe: 0.7, // 70% speed when strafing
    backward: 0.5, // 50% speed when moving backward
    diagonal: 0.85 // 85% speed when moving diagonally (NOT 0.7071)
};
// Damage system - EXACT values from original game
export const DAMAGE_CONFIG = {
    stunDuration: 0.25, // 0.25 second stun when taking damage
    flashDuration: 0.1 // 0.1 second red tint flash
};
// Progression system - EXACT values from original game
export const PROGRESSION_CONFIG = {
    maxLevel: 10,
    xpGrowth: 20, // XP required = current level * xpGrowth
    levelBonuses: {
        2: { moveSpeed: 0.25 },
        3: { attackRecovery: -25 }, // -25ms
        4: { abilityCooldown: -100 }, // -100ms
        5: { unlockRoll: true },
        6: { moveSpeed: 0.25 },
        7: { attackRecovery: -25 }, // -25ms
        8: { abilityCooldown: -100 }, // -100ms
        9: { /* Future ability */},
        10: { maxHitPoints: 1 }
    }
};
// World generation - EXACT values from original game
export const WORLD_CONFIG = {
    width: 100, // tiles
    height: 100, // tiles
    tileSize: 64, // pixels per tile
    noise: {
        terrain: 0.05, // Terrain noise frequency
        water: 0.08 // Water noise frequency
    },
    thresholds: {
        sand: -0.3, // Noise value below which terrain becomes sand
        water: -0.5, // Noise value below which water generates
        sandDistance: 3, // Minimum distance from sand for water
        cardinalCleanup: 3, // Cardinal neighbors needed to convert sand to grass
        waterCleanup: 2, // Water neighbors needed to keep water tile
    }
};
// Monster spawn system - EXACT values from original game
export const SPAWN_CONFIG = {
    timer: 1, // 1 second between spawn attempts
    maxMonsters: 300, // Maximum concurrent monsters
    minDistanceFromPlayer: 700, // Minimum spawn distance from any player
    maxDistanceFromPlayer: 10000, // Maximum spawn distance
    distribution: {
        skeleton: 0.2, // 20% chance
        elemental: 0.2, // 20% chance
        ghoul: 0.2, // 20% chance
        ogre: 0.2, // 20% chance
        wildarcher: 0.2 // 20% chance
    }
};
// Effect configurations - EXACT values from original game
export const EFFECT_CONFIGS = {
    slash_effect: {
        scale: 1.5,
        offsetDistance: 60,
        rotationOffset: 0,
        animationSpeed: 0.5,
        followDuration: 0,
        flipX: false,
        flipY: true
    },
    guardian_slash_effect: {
        scale: 2,
        offsetDistance: 70,
        rotationOffset: Math.PI / 2,
        animationSpeed: 0.6,
        followDuration: 0,
        flipX: true,
        flipY: true
    },
    guardian_jump_effect: {
        scale: 3.5,
        offsetDistance: 0,
        rotationOffset: 0,
        animationSpeed: 0.5,
        followDuration: 0,
        flipX: false,
        flipY: false
    },
    rogue_thrust_effect: {
        scale: 1.8,
        offsetDistance: 50,
        rotationOffset: -Math.PI / 4,
        animationSpeed: 0.4,
        followDuration: 0,
        flipX: false,
        flipY: false
    },
    rogue_dash_effect: {
        scale: 1.0,
        offsetDistance: 0,
        rotationOffset: Math.PI / 4,
        animationSpeed: 0.8,
        followDuration: 0,
        flipX: false,
        flipY: false
    },
    bow_shot_effect: {
        scale: 1.0,
        offsetDistance: 30,
        rotationOffset: 0,
        animationSpeed: 0.3,
        followDuration: 0,
        flipX: false,
        flipY: false
    },
    wildarcher_shot_effect: {
        scale: 1.0,
        offsetDistance: 30,
        rotationOffset: 0,
        animationSpeed: 0.3,
        followDuration: 0,
        flipX: false,
        flipY: false
    },
    hunter_cone_effect: {
        scale: 1.5,
        offsetDistance: 0,
        rotationOffset: Math.PI / 4,
        animationSpeed: 0.4,
        followDuration: 0,
        flipX: false,
        flipY: false
    },
    level_up_effect: {
        scale: 1.5,
        offsetDistance: 0,
        rotationOffset: 0,
        animationSpeed: 0.2,
        followDuration: 1000,
        flipX: false,
        flipY: false
    },
    strike_windup: {
        scale: 1.5,
        offsetDistance: 10,
        rotationOffset: 0,
        animationSpeed: 0.4,
        followDuration: 0,
        flipX: false,
        flipY: false
    },
    strike_cast: {
        scale: 1.3,
        offsetDistance: 70,
        rotationOffset: Math.PI / 2,
        animationSpeed: 0.4,
        followDuration: 0,
        flipX: false,
        flipY: false
    }
};
// Runtime exports for character classes (needed for client imports)
export const CharacterClass = {
    BLADEDANCER: 'bladedancer',
    GUARDIAN: 'guardian',
    HUNTER: 'hunter',
    ROGUE: 'rogue'
};
// Runtime exports for monster types
export const MonsterType = {
    OGRE: 'ogre',
    SKELETON: 'skeleton',
    ELEMENTAL: 'elemental',
    GHOUL: 'ghoul',
    WILDARCHER: 'wildarcher'
};
// Runtime exports for attack types
export const AttackType = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    ROLL: 'roll'
};
// Runtime exports for hitbox types
export const HitboxType = {
    RECTANGLE: 'rectangle',
    CONE: 'cone',
    CIRCLE: 'circle',
    PROJECTILE: 'projectile'
};
//# sourceMappingURL=GameConfig.js.map