// src/js/config/GameConfig.js

export const MONSTER_CONFIG = {
  // Base stats for each monster type
  stats: {
    ogre: {
      hitPoints: 4, moveSpeed: 2, attackRange: 90, collisionRadius: 35, aggroRange: 250,
      animations: { // Animation properties
        walk: { speed: 0.3 }, idle: { speed: 0.2 }, attack1: { speed: 0.25, hitFrame: 9 },
        take_damage: { speed: 0.7 }, die: { speed: 0.2 }
      }
    },
    skeleton: {
      hitPoints: 2, moveSpeed: 2.5, attackRange: 70, collisionRadius: 15, aggroRange: 250,
      animations: { // Animation properties
        walk: { speed: 0.4 }, idle: { speed: 0.2 }, attack1: { speed: 0.3, hitFrame: 8 },
        take_damage: { speed: 0.7 }, die: { speed: 0.5 }
      }
    },
    elemental: {
      hitPoints: 3, moveSpeed: 2, attackRange: 100, collisionRadius: 15, aggroRange: 250,
      animations: { // Animation properties
        walk: { speed: 0.4 }, idle: { speed: 0.2 }, attack1: { speed: 0.3, hitFrame: 8 },
        take_damage: { speed: 0.7 }, die: { speed: 0.2 }
      }
    },
    ghoul: {
      hitPoints: 2, moveSpeed: 3.5, attackRange: 70, collisionRadius: 10, aggroRange: 1000,
      animations: { // Animation properties
        walk: { speed: 0.45 }, idle: { speed: 0.25 }, attack1: { speed: 0.4, hitFrame: 7 },
        take_damage: { speed: 0.7 }, die: { speed: 0.25 }
      }
    }
  },

  // Attack patterns for each monster type
  attacks: {
    ogre: {
      windup: 0.5,
      duration: 0.2,
      recovery: 0.8,
      cooldown: 1.5,
      pattern: 'cone',
      color: 0x885500,
      damage: 1
    },
    skeleton: {
      windup: 0.3,
      duration: 0.2,
      recovery: 0.6,
      cooldown: .7,
      pattern: 'cone',
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
    }
  },

  // Spawn system configuration
  spawn: {
    timer: 2, // New monster every 5 seconds
    maxMonsters: 150,
    minDistanceFromPlayer: 400,
    maxDistanceFromPlayer: 10000,
    distribution: {
      skeleton: 0.25,
      elemental: 0.25,
      ghoul: 0.25,
      ogre: 0.25
    }
  },

  // Test spawn configuration
  testSpawns: [
    { type: 'skeleton', count: 0, offsetX: -200, offsetY: -200 },
    { type: 'elemental', count: 0, offsetX: 200, offsetY: -200 },
    { type: 'ogre', count: 1, offsetX: -200, offsetY: 200 },
    { type: 'ghoul', count: 0, offsetX: 200, offsetY: 200 }
  ]
};

export const PLAYER_CONFIG = {
  // Character class stats
  classes: {
    bladedancer: {
      hitPoints: 3,
      moveSpeed: 5,
      baseColor: 0x3498db, // Blue
      placeholderColor: 0x3498db,
      spritePrefix: 'knight',
      animations: { // Animation properties
        idle: { speed: 0.2 }, run: { speed: 0.5 }, run_backward: { speed: 0.5 },
        strafe_left: { speed: 0.5 }, strafe_right: { speed: 0.5 },
        attack1: { speed: 0.4, hitFrame: 8 }, attack2: { speed: 0.3, hitFrame: 12 },
        die: { speed: 0.2 }, take_damage: { speed: 0.5 }
      }
    },
    guardian: {
      hitPoints: 4,
      moveSpeed: 3.5,
      baseColor: 0xe74c3c, // Red
      placeholderColor: 0xe74c3c,
      spritePrefix: 'guardian',
      animations: { // Animation properties
        idle: { speed: 0.15 }, run: { speed: 0.4 }, run_backward: { speed: 0.4 },
        strafe_left: { speed: 0.4 }, strafe_right: { speed: 0.4 },
        attack1: { speed: 0.35, hitFrame: 8 }, attack2: { speed: 0.35, hitFrame: 12 },
        die: { speed: 0.2 }, take_damage: { speed: 0.5 }
      }
    },
    hunter: {
      hitPoints: 1,
      moveSpeed: 4,
      baseColor: 0x2ecc71, // Green
      placeholderColor: 0x2ecc71,
      spritePrefix: 'hunter',
      animations: { // Animation properties
        idle: { speed: 0.2 }, run: { speed: 0.5 }, run_backward: { speed: 0.5 },
        strafe_left: { speed: 0.5 }, strafe_right: { speed: 0.5 },
        attack1: { speed: 0.4, hitFrame: 8 }, attack2: { speed: 0.5, hitFrame: 12 }, // attack2 is BackRoll
        die: { speed: 0.2 }, take_damage: { speed: 0.5 }
      }
    },
    rogue: {
      hitPoints: 2,
      moveSpeed: 6,
      baseColor: 0x9b59b6, // Purple
      placeholderColor: 0x9b59b6,
      spritePrefix: 'rogue',
      animations: { // Animation properties
        idle: { speed: 0.25 }, run: { speed: 0.6 }, run_backward: { speed: 0.6 },
        strafe_left: { speed: 0.6 }, strafe_right: { speed: 0.6 },
        attack1: { speed: 0.5, hitFrame: 7 }, attack2: { speed: 0.4, hitFrame: 10 }, // attack2 is Special2
        die: { speed: 0.25 }, take_damage: { speed: 0.6 }
      }
    }
  },
  
  // Damage settings
  damage: {
    stunDuration: 0.25, // Stun duration in seconds when taking damage
    flashDuration: 0.1  // Duration of red tint flash when damaged
  },
  
  // Attack configurations
  attacks: {
    // Default attacks used by Bladedancer
    primary: {
      name: "Slash Attack",
      archetype: 'standard_melee',
      damage: 1,
      windupTime: 133,
      recoveryTime: 200,
      cooldown: 100,
      hitboxType: 'rectangle',
      hitboxParams: {
        width: 45,
        length: 85
      },
      hitboxVisual: {
        color: 0xFF5555,
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 1
      },
      effectSequence: [
        { type: 'slash_effect', timing: 250 }
      ]
    },
    secondary: {
      name: "Smash Attack",
      archetype: 'standard_melee',
      damage: 2,
      windupTime: 500,
      recoveryTime: 300,
      cooldown: 800,
      hitboxType: 'rectangle',
      hitboxParams: {
        width: 70,
        length: 110
      },
      hitboxVisual: {
        color: 0x00FFFF,
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.3
      },
      effectSequence: [
        { type: 'strike_windup', timing: 100 },
        { type: 'strike_cast', timing: 500 }
      ]
    },
    
    // Guardian-specific attacks
    guardian_primary: {
      name: "Sweeping Axe",
      archetype: 'standard_melee',
      damage: 1,
      windupTime: 250, // Slower animation
      recoveryTime: 300,
      cooldown: 200,
      hitboxType: 'cone', // Wide arc hitbox
      hitboxParams: {
        range: 110,
        angle: 110 // 180° arc as specified
      },
      hitboxVisual: {
        color: 0xFF0000,
        fillAlpha: 0.00,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.3
      },
      effectSequence: [
        { type: 'guardian_slash_effect', timing: 250 } // Use the Guardian-specific effect
    ]
    },
    guardian_secondary: {
      name: "Jump Attack",
      archetype: 'jump_attack',
      damage: 2,
      windupTime: 150,      // Wind-up before jump
      jumpDuration: 325,    // Duration of the jump
      recoveryTime: 200,    // Recovery after landing
      cooldown: 1250,       // Longer cooldown for this powerful move
      dashDistance: 200,    // Distance to jump forward
      invulnerable: true,   // Player is invulnerable during jump
      hitboxType: 'circle', // AOE circle damage on landing
      hitboxParams: {
        radius: 75         // Circle radius for the AOE
      },
      hitboxVisual: {
        color: 0xFFD700,    // Gold color for area effect
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.2
      },
      effectSequence: [
        { type: 'guardian_jump_effect', timing: 400 }
      ]
    },
    rogue_primary: {
      name: "Thrust Attack",
      archetype: 'standard_melee',
      damage: 1,
      windupTime: 133, // Very fast
      recoveryTime: 200,
      cooldown: 100,
      hitboxType: 'rectangle',
      hitboxParams: {
        width: 30,    // Narrow
        length: 95   // Long range
      },
      hitboxVisual: {
        color: 0x00ff00,
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.3
      },
      effectSequence: [
        { type: 'rogue_thrust_effect', timing: 133 }
      ]
    },
    rogue_secondary: {
      name: "Dash Attack",
      archetype: 'dash_attack',
      damage: 1,
      windupTime: 50,       // Quick windup
      dashDuration: 200,    // Speed of dash
      recoveryTime: 150,    // Quick recovery
      cooldown: 2000,        // Moderate cooldown
      dashDistance: 200,    // Distance dashed
      invulnerable: false,  // Not invulnerable during dash
      hitboxType: 'rectangle',
      hitboxParams: {
        width: 50,         // Width of dash hitbox
        length: 200        // Distance of dash
      },
      hitboxVisual: {
        color: 0x00ff00,   // Bright purple for dash path
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.2
      },
      effectSequence: [
        { type: 'rogue_dash_effect', timing: 0 }
      ]
    },
    hunter_primary: {
      name: "Bow Shot",
      archetype: 'projectile',
      damage: 1,
      windupTime: 200,
      recoveryTime: 100,
      cooldown: 300,
      isProjectile: true, // Retain for clarity or specific projectile logic checks
      projectileSpeed: 700,
      projectileRange: 400,
      projectileOffset: 30, // Added projectile offset
      projectileVisualEffectType: 'bow_shot_effect', // Added for visual effect
      hitboxType: 'projectile', // May not be strictly needed if archetype handles it
      hitboxParams: {
        width: 10,
        length: 30
      },
      hitboxVisual: {
        color: 0xFFFFFF,
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.3
      },
      effectSequence: [
        { type: 'bow_shot_effect', timing: 200 }
      ]
    },
// Updated Hunter's secondary attack configuration
hunter_secondary: {
  name: "Retreat Shot",
  archetype: 'jump_attack',
  damage: 2,
  windupTime: 150,
  jumpDuration: 300,
  recoveryTime: 200,
  cooldown: 800,
  dashDistance: 150,
  jumpHeight: 50,
  backwardJump: true,
  attackFromStartPosition: true,
  hitboxType: 'cone',
  hitboxParams: {
    range: 150,
    angle: 90  // Standard cone angle
  },
  hitboxVisual: {
    color: 0x2ECC71,
    fillAlpha: 0.1,
    lineAlpha: 0.0,
    lineWidth: 3,
    duration: 0.25
  },
  effectType: 'hunter_cone_effect',  // Single effect type
  effectDistance: 0,               // How far to place the effect
  effectTiming: 50,                 // When to show effect during jump
  effectSequence: []                 // Empty array to avoid errors
}
  },


  
  // Effect configurations
  effects: {
    slash_effect: {
      scale: 1.5,
      offsetDistance: 60,
      rotationOffset: 0 * Math.PI / 4,
      animationSpeed: 0.5,
      followDuration: 0,
      flipX: false,
      flipY: true 
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
      rotationOffset: 2 * Math.PI / 4,
      animationSpeed: 0.4,
      followDuration: 0,
      flipX: false,
      flipY: false 
    },
    // Add Guardian-specific effects properly inside the effects object
    guardian_slash_effect: {
      scale: 2,
      offsetDistance: 70,
      rotationOffset: 2 * Math.PI /4 ,
      animationSpeed: 0.6,
      followDuration: 0,
      flipX: true,
      flipY: true
    },
    guardian_jump_effect: {
      scale: 3.5,
      offsetDistance: 0,
      rotationOffset: 0 * Math.PI / 4,
      animationSpeed: 0.5,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    rogue_thrust_effect: {
      scale: 1.8,
      offsetDistance: 50,  // Distance along the thrust line
      rotationOffset: -1 * Math.PI / 4,
      animationSpeed: 0.4,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    rogue_dash_effect: {
      scale: 1.0,
      offsetDistance: 0,   // Appears at starting position
      rotationOffset: 1 * Math.PI / 4, //THIS IS 45 DEGREES, 2PI IS 360
      animationSpeed: 0.8,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    bow_shot_effect: {
      scale: 1.0,
      offsetDistance: 30,
      rotationOffset: 4 * Math.PI / 4,
      animationSpeed: 0.3,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    hunter_cone_effect: {
      scale: 2,
      offsetDistance: 0,  // Distance in front
      rotationOffset: 1 * Math.PI / 4, //THIS IS 45 DEGREES, 2PI IS 360
      animationSpeed: 0.5, // This is a behavioral property
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    // Centralized animation speeds for sprites of effects
    // These keys should match the 'keyPrefix' in SPRITE_SHEET_CONFIG for effects.
    effectAnimations: {
        slash_effect: { speed: 0.5 },
        strike_windup: { speed: 0.8 },
        strike_cast: { speed: 0.2 },
        guardian_slash_effect: { speed: 0.6 },
        guardian_jump_effect: { speed: 0.5 },
        rogue_thrust_effect: { speed: 0.7 },
        rogue_dash_effect: { speed: 0.5 },
        bow_shot_effect: { speed: 0.2 },
        hunter_cone_effect: { speed: 0.5 }
    }
  }
};