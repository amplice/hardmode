/**
 * LLM_NOTE: This file contains the EXACT game configuration values from the original single-player game.
 * These values MUST be preserved precisely to maintain identical gameplay experience.
 *
 * ARCHITECTURE_DECISION: All gameplay constants are centralized here and shared between
 * client and server to ensure consistency. Never hardcode these values elsewhere.
 *
 * SOURCE: Extracted from /src/js/config/GameConfig.js
 */
export declare const CHARACTER_CLASSES: {
    readonly bladedancer: {
        readonly hitPoints: 3;
        readonly moveSpeed: 5;
        readonly baseColor: 3447003;
        readonly spritePrefix: "knight";
        readonly animations: {
            readonly idle: {
                readonly speed: 0.2;
            };
            readonly run: {
                readonly speed: 0.5;
            };
            readonly run_backward: {
                readonly speed: 0.5;
            };
            readonly strafe_left: {
                readonly speed: 0.5;
            };
            readonly strafe_right: {
                readonly speed: 0.5;
            };
            readonly attack1: {
                readonly speed: 0.4;
                readonly hitFrame: 8;
            };
            readonly attack2: {
                readonly speed: 0.3;
                readonly hitFrame: 12;
            };
            readonly roll: {
                readonly speed: 0.5;
            };
            readonly die: {
                readonly speed: 0.2;
            };
            readonly take_damage: {
                readonly speed: 0.5;
            };
        };
    };
    readonly guardian: {
        readonly hitPoints: 4;
        readonly moveSpeed: 3.5;
        readonly baseColor: 15158332;
        readonly spritePrefix: "guardian";
        readonly animations: {
            readonly idle: {
                readonly speed: 0.15;
            };
            readonly run: {
                readonly speed: 0.4;
            };
            readonly run_backward: {
                readonly speed: 0.4;
            };
            readonly strafe_left: {
                readonly speed: 0.4;
            };
            readonly strafe_right: {
                readonly speed: 0.4;
            };
            readonly attack1: {
                readonly speed: 0.35;
                readonly hitFrame: 8;
            };
            readonly attack2: {
                readonly speed: 0.35;
                readonly hitFrame: 12;
            };
            readonly roll: {
                readonly speed: 0.5;
            };
            readonly die: {
                readonly speed: 0.2;
            };
            readonly take_damage: {
                readonly speed: 0.5;
            };
        };
    };
    readonly hunter: {
        readonly hitPoints: 1;
        readonly moveSpeed: 5;
        readonly baseColor: 3066993;
        readonly spritePrefix: "hunter";
        readonly animations: {
            readonly idle: {
                readonly speed: 0.2;
            };
            readonly run: {
                readonly speed: 0.5;
            };
            readonly run_backward: {
                readonly speed: 0.5;
            };
            readonly strafe_left: {
                readonly speed: 0.5;
            };
            readonly strafe_right: {
                readonly speed: 0.5;
            };
            readonly attack1: {
                readonly speed: 0.5;
                readonly hitFrame: 8;
            };
            readonly attack2: {
                readonly speed: 0.5;
                readonly hitFrame: 12;
            };
            readonly roll: {
                readonly speed: 0.5;
            };
            readonly die: {
                readonly speed: 0.2;
            };
            readonly take_damage: {
                readonly speed: 0.5;
            };
        };
    };
    readonly rogue: {
        readonly hitPoints: 2;
        readonly moveSpeed: 6;
        readonly baseColor: 10181046;
        readonly spritePrefix: "rogue";
        readonly animations: {
            readonly idle: {
                readonly speed: 0.25;
            };
            readonly run: {
                readonly speed: 0.6;
            };
            readonly run_backward: {
                readonly speed: 0.6;
            };
            readonly strafe_left: {
                readonly speed: 0.6;
            };
            readonly strafe_right: {
                readonly speed: 0.6;
            };
            readonly attack1: {
                readonly speed: 0.5;
                readonly hitFrame: 7;
            };
            readonly attack2: {
                readonly speed: 0.4;
                readonly hitFrame: 10;
            };
            readonly roll: {
                readonly speed: 0.5;
            };
            readonly die: {
                readonly speed: 0.25;
            };
            readonly take_damage: {
                readonly speed: 0.6;
            };
        };
    };
};
export declare const CHARACTER_ATTACKS: {
    readonly bladedancer_primary: {
        readonly name: "Slash Attack";
        readonly damage: 1;
        readonly windupTime: 133;
        readonly recoveryTime: 200;
        readonly cooldown: 100;
        readonly hitboxType: "rectangle";
        readonly hitboxParams: {
            readonly width: 45;
            readonly length: 85;
        };
        readonly effectSequence: readonly [{
            readonly type: "slash_effect";
            readonly timing: 250;
        }];
    };
    readonly bladedancer_secondary: {
        readonly name: "Smash Attack";
        readonly damage: 2;
        readonly windupTime: 500;
        readonly recoveryTime: 300;
        readonly cooldown: 800;
        readonly hitboxType: "rectangle";
        readonly hitboxParams: {
            readonly width: 70;
            readonly length: 110;
        };
        readonly effectSequence: readonly [{
            readonly type: "strike_windup";
            readonly timing: 100;
        }, {
            readonly type: "strike_cast";
            readonly timing: 500;
        }];
    };
    readonly guardian_primary: {
        readonly name: "Sweeping Axe";
        readonly damage: 1;
        readonly windupTime: 250;
        readonly recoveryTime: 300;
        readonly cooldown: 200;
        readonly hitboxType: "cone";
        readonly hitboxParams: {
            readonly range: 110;
            readonly angle: 110;
        };
        readonly effectSequence: readonly [{
            readonly type: "guardian_slash_effect";
            readonly timing: 250;
        }];
    };
    readonly guardian_secondary: {
        readonly name: "Jump Attack";
        readonly damage: 2;
        readonly windupTime: 150;
        readonly jumpDuration: 325;
        readonly recoveryTime: 200;
        readonly cooldown: 1250;
        readonly dashDistance: 200;
        readonly invulnerable: true;
        readonly hitboxType: "circle";
        readonly hitboxParams: {
            readonly radius: 75;
        };
        readonly effectSequence: readonly [{
            readonly type: "guardian_jump_effect";
            readonly timing: 475;
            readonly useStartPosition: false;
        }];
        readonly actionPointDelay: 325;
    };
    readonly hunter_primary: {
        readonly name: "Bow Shot";
        readonly damage: 1;
        readonly windupTime: 100;
        readonly recoveryTime: 100;
        readonly cooldown: 100;
        readonly projectileSpeed: 700;
        readonly projectileRange: 600;
        readonly projectileOffset: 30;
        readonly projectileVisualEffectType: "bow_shot_effect";
        readonly hitboxType: "projectile";
        readonly hitboxParams: {
            readonly width: 10;
            readonly length: 30;
        };
        readonly effectSequence: readonly [];
    };
    readonly hunter_secondary: {
        readonly name: "Retreat Shot";
        readonly damage: 2;
        readonly windupTime: 150;
        readonly jumpDuration: 300;
        readonly recoveryTime: 200;
        readonly cooldown: 800;
        readonly dashDistance: 200;
        readonly jumpHeight: 50;
        readonly backwardJump: true;
        readonly attackFromStartPosition: true;
        readonly hitboxType: "cone";
        readonly hitboxParams: {
            readonly range: 80;
            readonly angle: 70;
        };
        readonly effectSequence: readonly [{
            readonly type: "hunter_cone_effect";
            readonly timing: 250;
            readonly distance: 50;
            readonly useStartPosition: true;
        }];
        readonly actionPointDelay: 50;
    };
    readonly rogue_primary: {
        readonly name: "Thrust Attack";
        readonly damage: 1;
        readonly windupTime: 133;
        readonly recoveryTime: 200;
        readonly cooldown: 100;
        readonly hitboxType: "rectangle";
        readonly hitboxParams: {
            readonly width: 30;
            readonly length: 95;
        };
        readonly effectSequence: readonly [{
            readonly type: "rogue_thrust_effect";
            readonly timing: 133;
        }];
    };
    readonly rogue_secondary: {
        readonly name: "Dash Attack";
        readonly damage: 1;
        readonly windupTime: 50;
        readonly dashDuration: 200;
        readonly recoveryTime: 150;
        readonly cooldown: 2000;
        readonly dashDistance: 200;
        readonly invulnerable: false;
        readonly hitboxType: "rectangle";
        readonly hitboxParams: {
            readonly width: 50;
            readonly length: 200;
        };
        readonly effectSequence: readonly [{
            readonly type: "rogue_dash_effect";
            readonly timing: 50;
        }];
    };
    readonly roll: {
        readonly name: "Roll";
        readonly damage: 0;
        readonly windupTime: 50;
        readonly dashDuration: 300;
        readonly recoveryTime: 150;
        readonly cooldown: 1000;
        readonly dashDistance: 150;
        readonly invulnerable: false;
        readonly hitboxType: null;
        readonly hitboxParams: null;
        readonly effectSequence: readonly [];
    };
};
export declare const MONSTER_STATS: {
    readonly ogre: {
        readonly hitPoints: 4;
        readonly moveSpeed: 2;
        readonly attackRange: 90;
        readonly collisionRadius: 35;
        readonly aggroRange: 800;
        readonly xp: 20;
        readonly animations: {
            readonly walk: {
                readonly speed: 0.3;
            };
            readonly idle: {
                readonly speed: 0.2;
            };
            readonly attack1: {
                readonly speed: 0.25;
                readonly hitFrame: 9;
            };
            readonly take_damage: {
                readonly speed: 0.7;
            };
            readonly die: {
                readonly speed: 0.2;
            };
        };
    };
    readonly skeleton: {
        readonly hitPoints: 2;
        readonly moveSpeed: 2.5;
        readonly attackRange: 70;
        readonly collisionRadius: 15;
        readonly aggroRange: 1200;
        readonly xp: 5;
        readonly animations: {
            readonly walk: {
                readonly speed: 0.4;
            };
            readonly idle: {
                readonly speed: 0.2;
            };
            readonly attack1: {
                readonly speed: 0.3;
                readonly hitFrame: 8;
            };
            readonly take_damage: {
                readonly speed: 0.7;
            };
            readonly die: {
                readonly speed: 0.5;
            };
        };
    };
    readonly elemental: {
        readonly hitPoints: 3;
        readonly moveSpeed: 2;
        readonly attackRange: 100;
        readonly collisionRadius: 15;
        readonly aggroRange: 800;
        readonly xp: 10;
        readonly animations: {
            readonly walk: {
                readonly speed: 0.4;
            };
            readonly idle: {
                readonly speed: 0.2;
            };
            readonly attack1: {
                readonly speed: 0.3;
                readonly hitFrame: 8;
            };
            readonly take_damage: {
                readonly speed: 0.7;
            };
            readonly die: {
                readonly speed: 0.2;
            };
        };
    };
    readonly ghoul: {
        readonly hitPoints: 2;
        readonly moveSpeed: 3.5;
        readonly attackRange: 70;
        readonly collisionRadius: 10;
        readonly aggroRange: 3000;
        readonly xp: 15;
        readonly animations: {
            readonly walk: {
                readonly speed: 0.45;
            };
            readonly idle: {
                readonly speed: 0.25;
            };
            readonly attack1: {
                readonly speed: 0.4;
                readonly hitFrame: 7;
            };
            readonly take_damage: {
                readonly speed: 0.7;
            };
            readonly die: {
                readonly speed: 0.25;
            };
        };
    };
    readonly wildarcher: {
        readonly hitPoints: 1;
        readonly moveSpeed: 3;
        readonly attackRange: 500;
        readonly collisionRadius: 15;
        readonly aggroRange: 1500;
        readonly xp: 10;
        readonly animations: {
            readonly walk: {
                readonly speed: 0.4;
            };
            readonly idle: {
                readonly speed: 0.2;
            };
            readonly attack1: {
                readonly speed: 0.35;
                readonly hitFrame: 8;
            };
            readonly take_damage: {
                readonly speed: 0.7;
            };
            readonly die: {
                readonly speed: 0.3;
            };
        };
    };
};
export declare const MONSTER_ATTACKS: {
    readonly ogre: {
        readonly windup: 0.5;
        readonly duration: 0.2;
        readonly recovery: 0.8;
        readonly cooldown: 1.5;
        readonly pattern: "cone";
        readonly coneAngleDegrees: 110;
        readonly color: 8934656;
        readonly damage: 1;
    };
    readonly skeleton: {
        readonly windup: 0.3;
        readonly duration: 0.2;
        readonly recovery: 0.6;
        readonly cooldown: 0.7;
        readonly pattern: "cone";
        readonly coneAngleDegrees: 70;
        readonly color: 15658734;
        readonly damage: 1;
    };
    readonly elemental: {
        readonly windup: 0.4;
        readonly duration: 0.3;
        readonly recovery: 0.5;
        readonly cooldown: 2.5;
        readonly pattern: "circle";
        readonly color: 4374779;
        readonly damage: 1;
    };
    readonly ghoul: {
        readonly windup: 0.2;
        readonly duration: 0.2;
        readonly recovery: 0.3;
        readonly cooldown: 0.4;
        readonly pattern: "cone";
        readonly color: 8190976;
        readonly damage: 1;
    };
    readonly wildarcher: {
        readonly windup: 0.4;
        readonly duration: 0.2;
        readonly recovery: 0.4;
        readonly cooldown: 1.5;
        readonly pattern: "projectile";
        readonly projectileSpeed: 600;
        readonly projectileRange: 500;
        readonly color: 11206570;
        readonly damage: 1;
        readonly projectileEffect: "wildarcher_shot_effect";
    };
};
export declare const MOVEMENT_MODIFIERS: {
    readonly forward: 1;
    readonly strafe: 0.7;
    readonly backward: 0.5;
    readonly diagonal: 0.85;
};
export declare const DAMAGE_CONFIG: {
    readonly stunDuration: 0.25;
    readonly flashDuration: 0.1;
};
export declare const PROGRESSION_CONFIG: {
    readonly maxLevel: 10;
    readonly xpGrowth: 20;
    readonly levelBonuses: {
        readonly 2: {
            readonly moveSpeed: 0.25;
        };
        readonly 3: {
            readonly attackRecovery: -25;
        };
        readonly 4: {
            readonly abilityCooldown: -100;
        };
        readonly 5: {
            readonly unlockRoll: true;
        };
        readonly 6: {
            readonly moveSpeed: 0.25;
        };
        readonly 7: {
            readonly attackRecovery: -25;
        };
        readonly 8: {
            readonly abilityCooldown: -100;
        };
        readonly 9: {};
        readonly 10: {
            readonly maxHitPoints: 1;
        };
    };
};
export declare const WORLD_CONFIG: {
    readonly width: 100;
    readonly height: 100;
    readonly tileSize: 64;
    readonly noise: {
        readonly terrain: 0.05;
        readonly water: 0.08;
    };
    readonly thresholds: {
        readonly sand: -0.3;
        readonly water: -0.5;
        readonly sandDistance: 3;
        readonly cardinalCleanup: 3;
        readonly waterCleanup: 2;
    };
};
export declare const SPAWN_CONFIG: {
    readonly timer: 1;
    readonly maxMonsters: 300;
    readonly minDistanceFromPlayer: 700;
    readonly maxDistanceFromPlayer: 10000;
    readonly distribution: {
        readonly skeleton: 0.2;
        readonly elemental: 0.2;
        readonly ghoul: 0.2;
        readonly ogre: 0.2;
        readonly wildarcher: 0.2;
    };
};
export declare const EFFECT_CONFIGS: {
    readonly slash_effect: {
        readonly scale: 1.5;
        readonly offsetDistance: 60;
        readonly rotationOffset: 0;
        readonly animationSpeed: 0.5;
        readonly followDuration: 0;
        readonly flipX: false;
        readonly flipY: true;
    };
    readonly guardian_slash_effect: {
        readonly scale: 2;
        readonly offsetDistance: 70;
        readonly rotationOffset: number;
        readonly animationSpeed: 0.6;
        readonly followDuration: 0;
        readonly flipX: true;
        readonly flipY: true;
    };
    readonly guardian_jump_effect: {
        readonly scale: 3.5;
        readonly offsetDistance: 0;
        readonly rotationOffset: 0;
        readonly animationSpeed: 0.5;
        readonly followDuration: 0;
        readonly flipX: false;
        readonly flipY: false;
    };
    readonly rogue_thrust_effect: {
        readonly scale: 1.8;
        readonly offsetDistance: 50;
        readonly rotationOffset: number;
        readonly animationSpeed: 0.4;
        readonly followDuration: 0;
        readonly flipX: false;
        readonly flipY: false;
    };
    readonly rogue_dash_effect: {
        readonly scale: 1;
        readonly offsetDistance: 0;
        readonly rotationOffset: number;
        readonly animationSpeed: 0.8;
        readonly followDuration: 0;
        readonly flipX: false;
        readonly flipY: false;
    };
    readonly bow_shot_effect: {
        readonly scale: 1;
        readonly offsetDistance: 30;
        readonly rotationOffset: 0;
        readonly animationSpeed: 0.3;
        readonly followDuration: 0;
        readonly flipX: false;
        readonly flipY: false;
    };
    readonly wildarcher_shot_effect: {
        readonly scale: 1;
        readonly offsetDistance: 30;
        readonly rotationOffset: 0;
        readonly animationSpeed: 0.3;
        readonly followDuration: 0;
        readonly flipX: false;
        readonly flipY: false;
    };
    readonly hunter_cone_effect: {
        readonly scale: 1.5;
        readonly offsetDistance: 0;
        readonly rotationOffset: number;
        readonly animationSpeed: 0.4;
        readonly followDuration: 0;
        readonly flipX: false;
        readonly flipY: false;
    };
    readonly level_up_effect: {
        readonly scale: 1.5;
        readonly offsetDistance: 0;
        readonly rotationOffset: 0;
        readonly animationSpeed: 0.2;
        readonly followDuration: 1000;
        readonly flipX: false;
        readonly flipY: false;
    };
    readonly strike_windup: {
        readonly scale: 1.5;
        readonly offsetDistance: 10;
        readonly rotationOffset: 0;
        readonly animationSpeed: 0.4;
        readonly followDuration: 0;
        readonly flipX: false;
        readonly flipY: false;
    };
    readonly strike_cast: {
        readonly scale: 1.3;
        readonly offsetDistance: 70;
        readonly rotationOffset: number;
        readonly animationSpeed: 0.4;
        readonly followDuration: 0;
        readonly flipX: false;
        readonly flipY: false;
    };
};
export type CharacterClass = keyof typeof CHARACTER_CLASSES;
export type MonsterType = keyof typeof MONSTER_STATS;
export type AttackType = 'primary' | 'secondary' | 'roll';
export type HitboxType = 'rectangle' | 'cone' | 'circle' | 'projectile';
export declare const CharacterClass: {
    readonly BLADEDANCER: "bladedancer";
    readonly GUARDIAN: "guardian";
    readonly HUNTER: "hunter";
    readonly ROGUE: "rogue";
};
export declare const MonsterType: {
    readonly OGRE: "ogre";
    readonly SKELETON: "skeleton";
    readonly ELEMENTAL: "elemental";
    readonly GHOUL: "ghoul";
    readonly WILDARCHER: "wildarcher";
};
export declare const AttackType: {
    readonly PRIMARY: "primary";
    readonly SECONDARY: "secondary";
    readonly ROLL: "roll";
};
export declare const HitboxType: {
    readonly RECTANGLE: "rectangle";
    readonly CONE: "cone";
    readonly CIRCLE: "circle";
    readonly PROJECTILE: "projectile";
};
//# sourceMappingURL=GameConfig.d.ts.map