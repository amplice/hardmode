// src/js/config/GameConfig.js

export const MONSTER_CONFIG = {
  // Base stats for each monster type
  stats: {
    ogre: {
      hitPoints: 4, moveSpeed: 2, attackRange: 90, collisionRadius: 35, aggroRange: 800,
      xp: 20,
      animations: { // Animation properties
        walk: { speed: 0.3 }, idle: { speed: 0.2 }, attack1: { speed: 0.25 },
        take_damage: { speed: 0.7 }, die: { speed: 0.2 }
      }
    },
    skeleton: {
      hitPoints: 2, moveSpeed: 2.5, attackRange: 70, collisionRadius: 15, aggroRange: 1200,
      xp: 5,
      animations: { // Animation properties
        walk: { speed: 0.4 }, idle: { speed: 0.2 }, attack1: { speed: 0.3 },
        take_damage: { speed: 0.7 }, die: { speed: 0.5 }
      }
    },
    elemental: {
      hitPoints: 3, moveSpeed: 2, attackRange: 100, collisionRadius: 15, aggroRange: 800,
      xp: 10,
      animations: { // Animation properties
        walk: { speed: 0.4 }, idle: { speed: 0.2 }, attack1: { speed: 0.3 },
        take_damage: { speed: 0.7 }, die: { speed: 0.2 }
      }
    },
    ghoul: {
      hitPoints: 2, moveSpeed: 3.5, attackRange: 70, collisionRadius: 10, aggroRange: 3000,
      xp: 15,
      animations: { // Animation properties
        walk: { speed: 0.45 }, idle: { speed: 0.25 }, attack1: { speed: 0.4 },
        take_damage: { speed: 0.7 }, die: { speed: 0.25 }
      }
    },
    wildarcher: {
      hitPoints: 1, moveSpeed: 3, attackRange: 500, collisionRadius: 15, aggroRange: 1500,
      xp: 10,
      animations: {
        walk: { speed: 0.4 }, idle: { speed: 0.2 }, attack1: { speed: 0.35 },
        take_damage: { speed: 0.7 }, die: { speed: 0.3 }
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
      coneAngleDegrees: 110, // <<< ADD THIS (e.g., Ogre has a wide 110-degree cone)
      color: 0x885500,
      damage: 1
    },
    skeleton: {
      windup: 0.3,
      duration: 0.2,
      recovery: 0.6,
      cooldown: .7,
      pattern: 'cone',
      coneAngleDegrees: 70, // <<< ADD THIS (e.g., Skeleton has a narrower 70-degree cone)
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
  },

  // Spawn system configuration - now handled server-side
  spawn: {
    timer: 1,
    maxMonsters: 300,
    minDistanceFromPlayer: 700,
    maxDistanceFromPlayer: 10000,
    distribution: {
      skeleton: 0.25,
      elemental: 0.25,
      ghoul: 0.25,
      ogre: 0.25,
      wildarcher: 0
    }
  },

  // Test spawn configuration
  testSpawns: [
    { type: 'skeleton', count: 0, offsetX: -200, offsetY: -200 },
    { type: 'elemental', count: 0, offsetX: 200, offsetY: -200 },
    { type: 'ogre', count: 1, offsetX: -200, offsetY: 200 },
    { type: 'ghoul', count: 0, offsetX: 200, offsetY: 200 },
    { type: 'wildarcher', count: 1, offsetX: 0, offsetY: -200 }
  ]
};

export const PLAYER_CONFIG = {
  // PvP Settings
  pvpEnabled: false,  // Global PvP toggle - disabled for now while we work on PvE
  
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
        attack1: { speed: 0.4 }, attack2: { speed: 0.3 },
        roll: { speed: 0.5 },
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
        attack1: { speed: 0.35 }, attack2: { speed: 0.35 },
        roll: { speed: 0.5 },
        die: { speed: 0.2 }, take_damage: { speed: 0.5 }
      }
    },
    hunter: {
      hitPoints: 1,
      moveSpeed: 5,
      baseColor: 0x2ecc71, // Green
      placeholderColor: 0x2ecc71,
      spritePrefix: 'hunter',
      animations: { // Animation properties
        idle: { speed: 0.2 }, run: { speed: 0.5 }, run_backward: { speed: 0.5 },
        strafe_left: { speed: 0.5 }, strafe_right: { speed: 0.5 },
        attack1: { speed: 0.5 }, attack2: { speed: 0.5 }, // attack2 is BackRoll
        roll: { speed: 0.5 },
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
        attack1: { speed: 0.5 }, attack2: { speed: 0.4 }, // attack2 is Special2
        roll: { speed: 0.5 },
        die: { speed: 0.25 }, take_damage: { speed: 0.6 }
      }
    }
  },
  
  damage: {
    stunDuration: 0.25, // Stun duration in seconds when taking damage
    flashDuration: 0.1  // Duration of red tint flash when damaged
  },

  // Leveling configuration
  levels: {
    maxLevel: 10,
    xpGrowth: 20 // XP required to level up = current level * xpGrowth
  },
  
  attacks: {
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
        duration: 1 // Duration for the visual hitbox, not the effect itself
      },
      effectSequence: [
        { type: 'slash_effect', timing: 250 } // Absolute time from attack start
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
        { type: 'strike_windup', timing: 100 }, // Absolute time
        { type: 'strike_cast', timing: 500 }    // Absolute time
      ]
    },
    
    guardian_primary: {
      name: "Sweeping Axe",
      archetype: 'standard_melee',
      damage: 1,
      windupTime: 250,
      recoveryTime: 300,
      cooldown: 200,
      hitboxType: 'cone',
      hitboxParams: {
        range: 110,
        angle: 110
      },
      hitboxVisual: {
        color: 0xFF0000,
        fillAlpha: 0.00,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.3
      },
      effectSequence: [
        { type: 'guardian_slash_effect', timing: 250 } // Absolute time
      ]
    },
    guardian_secondary: {
      name: "Jump Attack",
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
      },
      hitboxVisual: {
        color: 0xFFD700,
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.2
      },
      effectSequence: [
        { 
          type: 'guardian_jump_effect', 
          timing: 475,      // Absolute time from attack start
          distance: 20,      // Use effect's default offsetDistance (which is 0 for guardian_jump_effect)
          useStartPosition: false // Effect appears at player's current position during jump
        }
      ],
      actionPointDelay: 325 // Delay *after windup* for hitbox/damage application
    },
    rogue_primary: {
      name: "Thrust Attack",
      archetype: 'standard_melee',
      damage: 1,
      windupTime: 133,
      recoveryTime: 200,
      cooldown: 100,
      hitboxType: 'rectangle',
      hitboxParams: {
        width: 30,
        length: 95
      },
      hitboxVisual: {
        color: 0x00ff00,
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.3
      },
      effectSequence: [
        { type: 'rogue_thrust_effect', timing: 133 } // Absolute time
      ]
    },
    rogue_secondary: {
      name: "Dash Attack",
      archetype: 'dash_attack',
      damage: 1,
      windupTime: 50,
      dashDuration: 200,
      recoveryTime: 150,
      cooldown: 2000,
      dashDistance: 200,
      invulnerable: false,
      hitboxType: 'rectangle',
      hitboxParams: {
        width: 50,
        length: 200
      },
      hitboxVisual: {
        color: 0x00ff00,
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.2
      },
      effectSequence: [ // This effect is immediate at the start of the dash movement (after windup)
        { type: 'rogue_dash_effect', timing: 50 } // Absolute time (at end of windup / start of dash)
        // Trail effects are handled programmatically in _executeDashAttack
      ]
    },
    hunter_primary: {
      name: "Bow Shot",
      archetype: 'projectile',
      damage: 1,
      windupTime: 100,
      recoveryTime: 100,
      cooldown: 600,  // Increased from 100ms to 600ms for testing
      isProjectile: true,
      projectileSpeed: 700,
      projectileRange: 600,
      projectileOffset: 30,
      projectileVisualEffectType: 'bow_shot_effect', // Used by Projectile class
      hitboxType: 'projectile',
      hitboxParams: { // For projectile itself, used by Projectile class
        width: 10,
        length: 30
      },
      hitboxVisual: { // Not directly used by projectile, but can be for debug
        color: 0xFFFFFF,
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.3
      },
      effectSequence: []
    },
    hunter_secondary: {
      name: "Retreat Shot",
      archetype: 'jump_attack',
      damage: 2,
      windupTime: 150,
      jumpDuration: 300,
      recoveryTime: 200,
      cooldown: 800,
      dashDistance: 200,
      jumpHeight: 50,
      backwardJump: true,
      attackFromStartPosition: true, // For hitbox placement
      hitboxType: 'cone',
      hitboxParams: {
        range: 90,
        angle: 70
      },
      hitboxVisual: {
        color: 0x2ECC71,
        fillAlpha: 0.5,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.25
      },
      effectSequence: [
        { 
          type: 'hunter_cone_effect', 
          timing: 250, // Absolute: 150ms windupTime + 50ms (old effectTiming)
          distance: 50,   // From old effectDistance
          useStartPosition: true // Effect should originate from where the jump started
        }
      ],
      actionPointDelay: 50 // Delay *after windup* for hitbox/damage application
    },
    roll: {
      name: "Roll",
      archetype: 'dash_attack',
      damage: 0,
      windupTime: 50,
      dashDuration: 300,
      recoveryTime: 150,
      cooldown: 1000,
      dashDistance: 150,
      invulnerable: false,
      hitboxType: null,
      hitboxParams: null,
      hitboxVisual: { color: 0xffffff, fillAlpha: 0.0, lineAlpha: 0.0, lineWidth: 0, duration: 0.1 },
      effectSequence: []
    }
  },
  
  effects: {
    slash_effect: {
      scale: 1.5,
      offsetDistance: 60, // Default offset if not overridden in effectSequence
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
    strike_cast: { // This effect appears at an offset
      scale: 1.3,
      offsetDistance: 70,
      rotationOffset: 2 * Math.PI / 4,
      animationSpeed: 0.4,
      followDuration: 0,
      flipX: false,
      flipY: false 
    },
    guardian_slash_effect: {
      scale: 2,
      offsetDistance: 70,
      rotationOffset: 2 * Math.PI /4 ,
      animationSpeed: 0.6,
      followDuration: 0,
      flipX: true,
      flipY: true
    },
    guardian_jump_effect: { // Appears at player's current position during jump
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
      offsetDistance: 50,
      rotationOffset: -1 * Math.PI / 4,
      animationSpeed: 0.4,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    rogue_dash_effect: { // Appears at player's current position during dash
      scale: 1.0,
      offsetDistance: 0,
      rotationOffset: 1 * Math.PI / 4,
      animationSpeed: 0.8,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    bow_shot_effect: { // Projectile visual / launch effect
      scale: 1.0,
      offsetDistance: 30, // Offset from player at launch
      rotationOffset: 0 * Math.PI / 4, // Adjust as needed for sprite orientation
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
    hunter_cone_effect: { // For Retreat Shot
      scale: 1.5,
      offsetDistance: 0, // To be used with useStartPosition:true and distance:0 in sequence
      rotationOffset: 1 * Math.PI / 4,
      animationSpeed: 0.4,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    level_up_effect: {
    scale: 1.5,
    offsetDistance: 0, // Center on player
    rotationOffset: 0,
    animationSpeed: 0.2,
    followDuration: 1000,
    flipX: false,
    flipY: false
}
  }
};