// src/js/config/GameConfig.js

export const MONSTER_CONFIG = {
  // Base stats for each monster type
  stats: {
    ogre: {
      hitPoints: 4,
      moveSpeed: 2,
      attackRange: 90,
      collisionRadius: 35,
      aggroRange: 250
    },
    skeleton: {
      hitPoints: 2,
      moveSpeed: 2.5,
      attackRange: 70,
      collisionRadius: 15,
      aggroRange: 250
    },
    elemental: {
      hitPoints: 3,
      moveSpeed: 2,
      attackRange: 100,
      collisionRadius: 15,
      aggroRange: 250
    },
    ghoul: {
      hitPoints: 2,
      moveSpeed: 3.5,
      attackRange: 70,
      collisionRadius: 10,
      aggroRange: 1000
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
    timer: 5, // New monster every 5 seconds
    maxMonsters: 10,
    minDistanceFromPlayer: 400,
    maxDistanceFromPlayer: 800,
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
    { type: 'ogre', count: 2, offsetX: -200, offsetY: 200 },
    { type: 'ghoul', count: 0, offsetX: 200, offsetY: 200 }
  ]
};

export const PLAYER_CONFIG = {
  // Character class stats
  classes: {
    bladedancer: {
      hitPoints: 10,
      moveSpeed: 5,
      baseColor: 0x3498db, // Blue
      placeholderColor: 0x3498db
    },
    guardian: {
      hitPoints: 3,
      moveSpeed: 3,
      baseColor: 0xe74c3c, // Red
      placeholderColor: 0xe74c3c
    },
    hunter: {
      hitPoints: 1,
      moveSpeed: 4,
      baseColor: 0x2ecc71, // Green
      placeholderColor: 0x2ecc71
    },
    rogue: {
      hitPoints: 1,
      moveSpeed: 6,
      baseColor: 0x9b59b6, // Purple
      placeholderColor: 0x9b59b6
    }
  },
  
  // Damage settings
  damage: {
    stunDuration: 0.25, // Stun duration in seconds when taking damage
    flashDuration: 0.1  // Duration of red tint flash when damaged
  },
  
  // Attack configurations
  attacks: {
    primary: {
      name: "Slash Attack",
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
    }
  },
  
  // Effect configurations
  effects: {
    slash_effect: {
      scale: 1.5,
      offsetDistance: 60,
      rotationOffset: 2 * Math.PI,
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
      rotationOffset: Math.PI / 2,
      animationSpeed: 0.4,
      followDuration: 0,
      flipX: false,
      flipY: false 
    }
  }
};