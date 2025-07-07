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
  invulnerable?: boolean;
  hitboxType?: string;
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

// Monster configuration with proper typing
export const MONSTER_CONFIG = {
  // Base stats for each monster type
  stats: {
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
        attack1: { speed: 0.25 },
        take_damage: { speed: 0.7 },
        die: { speed: 0.2 }
      }
    } as MonsterStats,
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
        attack1: { speed: 0.3 },
        take_damage: { speed: 0.7 },
        die: { speed: 0.5 }
      }
    } as MonsterStats,
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
        attack1: { speed: 0.3 },
        take_damage: { speed: 0.7 },
        die: { speed: 0.2 }
      }
    } as MonsterStats,
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
      dashDuration: 325, // jumpDuration
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
      dashDuration: 300, // jumpDuration
      recoveryTime: 200,
      cooldown: 800,
      dashDistance: 200,
      invulnerable: true,
      hitboxType: 'circle',
      hitboxParams: {
        radius: 50
      },
      hitboxVisual: {
        color: 0x00FF00,
        fillAlpha: 0.0,
        lineAlpha: 0.0,
        lineWidth: 3,
        duration: 0.2
      },
      effectSequence: [
        { 
          type: 'hunter_backroll_effect', 
          timing: 450,
          useStartPosition: false
        }
      ],
      actionPointDelay: 300
    } as PlayerAttackConfig
  }
} as const;

// Type exports for use in other files
export type MonsterType = keyof typeof MONSTER_CONFIG.stats;
export type PlayerClass = keyof typeof PLAYER_CONFIG.classes;
export type AttackType = keyof typeof PLAYER_CONFIG.attacks;