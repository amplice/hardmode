// src/js/config/GameConfig.ts

/**
 * Game configuration constants for monsters and players
 * CRITICAL: This file has 7 dependents - changes here affect many systems
 */

// Type definitions for configuration structures
interface AnimationConfig {
  speed: number;
}

interface MonsterAnimations {
  walk: AnimationConfig;
  idle: AnimationConfig;
  attack1: AnimationConfig;
  take_damage: AnimationConfig;
  die: AnimationConfig;
}

interface MonsterStats {
  hitPoints: number;
  moveSpeed: number;
  attackRange: number;
  collisionRadius: number;
  aggroRange: number;
  xp: number;
  animations: MonsterAnimations;
}

interface MonsterAttackConfig {
  name: string;
  damage: number;
  windupTime: number;
  recoveryTime: number;
  cooldown: number;
  range: number;
  hitbox?: {
    width: number;
    height: number;
    offsetX?: number;
    offsetY?: number;
  };
  projectile?: {
    speed: number;
    size: number;
    pierce: boolean;
    maxDistance: number;
    color: number;
  };
}

interface PlayerAnimations {
  idle: AnimationConfig;
  run: AnimationConfig;
  run_backward: AnimationConfig;
  strafe_left: AnimationConfig;
  strafe_right: AnimationConfig;
  attack1: AnimationConfig;
  attack2: AnimationConfig;
  roll: AnimationConfig;
  die: AnimationConfig;
  take_damage: AnimationConfig;
}

interface PlayerClassConfig {
  hitPoints: number;
  moveSpeed: number;
  baseColor: number;
  placeholderColor: number;
  spritePrefix: string;
  animations: PlayerAnimations;
}

interface PlayerAttackConfig {
  name: string;
  archetype: string;
  damage: number;
  windupTime: number;
  recoveryTime: number;
  cooldown: number;
  dashDuration?: number;
  dashDistance?: number;
  jumpDuration?: number;
  jumpHeight?: number;
  backwardJump?: boolean;
  attackFromStartPosition?: boolean;
  invulnerable?: boolean;
  hitboxType?: string | null;
  hitboxParams?: any;
  hitboxVisual?: {
    color: number;
    fillAlpha: number;
    lineAlpha: number;
    lineWidth: number;
    duration: number;
  };
  effectSequence?: Array<{
    type: string;
    timing: number;
    useStartPosition?: boolean;
  }>;
  actionPointDelay?: number;
  projectile?: {
    speed: number;
    size: number;
    pierce: boolean;
    maxDistance: number;
  };
}

interface EffectConfig {
  scale: number;
  offsetDistance: number;
  rotationOffset: number;
  animationSpeed: number;
  followDuration: number;
  flipX: boolean;
  flipY: boolean;
}

// Monster configuration with proper typing
export const MONSTER_CONFIG = {
  // Base stats for each monster type
  stats: {
    ogre: {
      hitPoints: 4,
      moveSpeed: 2,
      attackRange: 90,
      collisionRadius: 35,
      aggroRange: 1000,
      xp: 20,
      animations: {
        walk: { speed: 0.3 },
        idle: { speed: 0.2 },
        attack1: { speed: 0.25 },
        attack3: { speed: 0.333 },
        attack3_windup: { speed: 0.3 },
        take_damage: { speed: 0.7 },
        die: { speed: 0.2 }
      }
    } as MonsterStats,
    skeleton: {
      hitPoints: 2,
      moveSpeed: 2.5,  // Updated speed
      attackRange: 70,
      collisionRadius: 15,
      aggroRange: 1200,
      xp: 5,
      animations: {
        walk: { speed: 0.4 },
        idle: { speed: 0.2 },
        attack1: { speed: 0.3 },
        take_damage: { speed: 0.7 },
        die: { speed: 0.5 }
      }
    } as MonsterStats,
    elemental: {
      hitPoints: 3,
      moveSpeed: 2.5,
      attackRange: 100,
      collisionRadius: 15,
      aggroRange: 800,
      xp: 10,
      animations: {
        walk: { speed: 0.4 },
        idle: { speed: 0.2 },
        attack1: { speed: 0.3 },
        take_damage: { speed: 0.7 },
        die: { speed: 0.2 }
      }
    } as MonsterStats,
    ghoul: {
      hitPoints: 2,
      moveSpeed: 4,  // Updated speed
      attackRange: 84,  // Increased for 1.2x size
      collisionRadius: 18,  // 1.2x of original 15
      aggroRange: 3000,
      xp: 15,
      animations: {
        walk: { speed: 0.45 },
        idle: { speed: 0.25 },
        attack1: { speed: 0.4 },
        take_damage: { speed: 0.7 },
        die: { speed: 0.25 }
      }
    } as MonsterStats,
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
        attack1: { speed: 0.35 },
        take_damage: { speed: 0.7 },
        die: { speed: 0.3 }
      }
    } as MonsterStats,
    darkmage: {
      hitPoints: 3,
      moveSpeed: 3.5,  // Updated speed
      attackRange: 400,
      collisionRadius: 20,
      aggroRange: 1000,
      xp: 30,
      animations: {
        walk: { speed: 0.3 },
        idle: { speed: 0.2 },
        attack1: { speed: 0.3 },
        special1: { speed: 0.4 },  // 10 frames in 250ms = 10/(60*x) = 250ms, x = 0.4
        special1_windup: { speed: 0.25 },  // First 5 frames for 333ms windup
        special1_post: { speed: 0.6 },  // Last 5 frames of Special1
        quickshot: { speed: 0.5 },  // 14 frames at 0.5 = 467ms total
        pummel: { speed: 0.5 },  // 15 frames at 0.5 = 500ms total
        take_damage: { speed: 0.7 },
        die: { speed: 0.3 }
      }
    } as MonsterStats,
    wolf: {
      hitPoints: 1,
      moveSpeed: 5.5,  // Fast predator
      attackRange: 70,
      collisionRadius: 15,
      aggroRange: 3000,
      xp: 15,
      animations: {
        walk: { speed: 0.35 },  // Faster animation for running
        idle: { speed: 0.25 },
        attack1: { speed: 0.4 },
        attack2: { speed: 0.3 },  // Jump attack animation - matches 500ms jump duration
        take_damage: { speed: 0.7 },
        die: { speed: 0.25 }
      }
    } as MonsterStats
  },

  // Attack patterns for each monster type
  attacks: {
    ogre: {
      primary: {
        name: "Slam",
        damage: 2,
        windupTime: 300,
        recoveryTime: 500,
        cooldown: 1000,
        range: 90,
        hitbox: { width: 120, height: 120 }
      } as MonsterAttackConfig
    },
    skeleton: {
      primary: {
        name: "Slash",
        damage: 1,
        windupTime: 200,
        recoveryTime: 300,
        cooldown: 800,
        range: 70,
        hitbox: { width: 80, height: 80 }
      } as MonsterAttackConfig
    },
    elemental: {
      primary: {
        name: "Magical Burst",
        damage: 1,
        windupTime: 400,
        recoveryTime: 400,
        cooldown: 1200,
        range: 100,
        hitbox: { width: 140, height: 140 }
      } as MonsterAttackConfig
    },
    ghoul: {
      primary: {
        name: "Bite",
        damage: 1,
        windupTime: 150,
        recoveryTime: 200,
        cooldown: 600,
        range: 70,
        hitbox: { width: 60, height: 60 }
      } as MonsterAttackConfig
    },
    wildarcher: {
      primary: {
        name: "Arrow Shot",
        damage: 1,
        windupTime: 300,
        recoveryTime: 400,
        cooldown: 1500,
        range: 500,
        projectile: {
          speed: 10,
          size: 10,
          pierce: false,
          maxDistance: 600,
          color: 0x8B4513
        }
      } as MonsterAttackConfig
    },
    darkmage: {
      primary: {
        name: "Shadow Bolt",
        damage: 2,
        windupTime: 600,
        recoveryTime: 400,
        cooldown: 3000,
        range: 400,
        projectile: {
          speed: 12,
          size: 15,
          pierce: false,
          maxDistance: 450,
          color: 0x8B00FF  // Purple shadow bolt
        }
      } as MonsterAttackConfig,
      special: {
        name: "Teleport Strike",
        damage: 3,
        windupTime: 800,
        recoveryTime: 600,
        cooldown: 8000,
        range: 300
      } as MonsterAttackConfig
    },
    wolf: {
      primary: {
        name: "Bite",
        damage: 1,
        windupTime: 200,
        recoveryTime: 300,
        cooldown: 800,
        range: 70,
        hitbox: { width: 80, height: 80 }
      } as MonsterAttackConfig
    }
  }
} as const;

// Player configuration
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
      spritePrefix: 'knight', // CRITICAL: Must be 'knight', not 'bladedancer'!
      animations: {
        idle: { speed: 0.2 },
        run: { speed: 0.5 },
        run_backward: { speed: 0.5 },
        strafe_left: { speed: 0.5 },
        strafe_right: { speed: 0.5 },
        attack1: { speed: 0.4 },
        attack2: { speed: 0.3 },
        roll: { speed: 0.5 },
        die: { speed: 0.2 },
        take_damage: { speed: 0.5 }
      }
    } as PlayerClassConfig,
    guardian: {
      hitPoints: 4,
      moveSpeed: 3.5,
      baseColor: 0xe74c3c, // Red
      placeholderColor: 0xe74c3c,
      spritePrefix: 'guardian',
      animations: {
        idle: { speed: 0.15 },
        run: { speed: 0.4 },
        run_backward: { speed: 0.4 },
        strafe_left: { speed: 0.4 },
        strafe_right: { speed: 0.4 },
        attack1: { speed: 0.35 },
        attack2: { speed: 0.35 },
        roll: { speed: 0.5 },
        die: { speed: 0.2 },
        take_damage: { speed: 0.5 }
      }
    } as PlayerClassConfig,
    hunter: {
      hitPoints: 1,
      moveSpeed: 5,
      baseColor: 0x2ecc71, // Green
      placeholderColor: 0x2ecc71,
      spritePrefix: 'hunter',
      animations: {
        idle: { speed: 0.2 },
        run: { speed: 0.5 },
        run_backward: { speed: 0.5 },
        strafe_left: { speed: 0.5 },
        strafe_right: { speed: 0.5 },
        attack1: { speed: 0.5 },
        attack2: { speed: 0.5 }, // attack2 is BackRoll
        roll: { speed: 0.5 },
        die: { speed: 0.2 },
        take_damage: { speed: 0.5 }
      }
    } as PlayerClassConfig,
    rogue: {
      hitPoints: 2,
      moveSpeed: 6,
      baseColor: 0x9b59b6, // Purple
      placeholderColor: 0x9b59b6,
      spritePrefix: 'rogue',
      animations: {
        idle: { speed: 0.25 },
        run: { speed: 0.55 },
        run_backward: { speed: 0.55 },
        strafe_left: { speed: 0.55 },
        strafe_right: { speed: 0.55 },
        attack1: { speed: 0.45 },
        attack2: { speed: 0.4 },
        roll: { speed: 0.6 },
        die: { speed: 0.2 },
        take_damage: { speed: 0.5 }
      }
    } as PlayerClassConfig
  },

  // Damage configuration
  damage: {
    stunDuration: 0.25, // Stun duration in seconds when taking damage
    flashDuration: 0.1  // Duration of red tint flash when damaged
  },

  // Leveling configuration
  levels: {
    maxLevel: 10,
    xpGrowth: 20 // XP required to level up = current level * xpGrowth
  },
  
  // Attack configurations for each class
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
        duration: 1
      },
      effectSequence: [
        { type: 'slash_effect', timing: 250 }
      ]
    } as PlayerAttackConfig,
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
    } as PlayerAttackConfig,
    
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
        { type: 'guardian_slash_effect', timing: 250 }
      ]
    } as PlayerAttackConfig,
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
          timing: 475,
          useStartPosition: false
        }
      ],
      actionPointDelay: 325
    } as PlayerAttackConfig,
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
        { type: 'rogue_thrust_effect', timing: 133 }
      ]
    } as PlayerAttackConfig,
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
      effectSequence: [
        { type: 'rogue_dash_effect', timing: 50 }
      ]
    } as PlayerAttackConfig,
    hunter_primary: {
      name: "Bow Shot",
      archetype: 'projectile',
      damage: 1,
      windupTime: 100,
      recoveryTime: 100,
      cooldown: 600,
      projectile: {
        speed: 700,
        size: 10,
        pierce: false,
        maxDistance: 600
      },
      hitboxType: 'projectile',
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
      effectSequence: []
    } as PlayerAttackConfig,
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
      attackFromStartPosition: true,
      invulnerable: true,
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
          timing: 250,
          useStartPosition: true
        }
      ],
      actionPointDelay: 50
    } as PlayerAttackConfig,
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
    } as PlayerAttackConfig
  },

  // Effects configuration for combat visual effects
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
      scale: 1.3,
      offsetDistance: 30, // Offset from player at launch
      rotationOffset: 0 * Math.PI / 4, // Adjust as needed for sprite orientation
      animationSpeed: 0.3,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    wildarcher_shot_effect: {
      scale: 1.3,
      offsetDistance: 30,
      rotationOffset: 0,
      animationSpeed: 0.3,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    darkmage_shadowbolt_effect: {
      scale: 1.2,
      offsetDistance: 35,
      rotationOffset: 0,
      animationSpeed: 0.4,
      followDuration: 0,
      flipX: true,
      flipY: false
    },
    elemental_spell_effect: {
      scale: 1.2,
      offsetDistance: 40,
      rotationOffset: 0,
      animationSpeed: 0.4,
      followDuration: 0,
      flipX: false,
      flipY: false
    },
    skeleton_bone_effect: {
      scale: 0.8,
      offsetDistance: 25,
      rotationOffset: 0,
      animationSpeed: 0.5,
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
} as const;

// Type exports for use in other files
export type MonsterType = keyof typeof MONSTER_CONFIG.stats;
export type PlayerClass = keyof typeof PLAYER_CONFIG.classes;
export type AttackType = keyof typeof PLAYER_CONFIG.attacks;