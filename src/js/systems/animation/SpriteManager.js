// src/js/systems/animation/SpriteManager.js
import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG, MONSTER_CONFIG } from '../../config/GameConfig.js'; // Import configs
import { directionStringToAnimationSuffix } from '../../utils/DirectionUtils.js';

const SPRITE_SHEET_CONFIG = [
    // Characters
    {
        keyPrefix: 'knight', type: 'character',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Knight/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Knight/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Knight/RunBackwards.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Knight/StrafeLeft.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Knight/StrafeRight.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Knight/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Knight/Attack2.png', columns: 15, rows: 8 },
            { keySuffix: 'roll', path: 'assets/sprites/characters/Knight/Rolling.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Knight/Die.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Knight/TakeDamage.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'guardian', type: 'character',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Guardian/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Guardian/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Guardian/RunBackwards.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Guardian/StrafeLeft.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Guardian/StrafeRight.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Guardian/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Guardian/AttackRun.png', columns: 15, rows: 8 },
            { keySuffix: 'roll', path: 'assets/sprites/characters/Guardian/FrontFlip.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Guardian/Die.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Guardian/TakeDamage.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'rogue', type: 'character',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Rogue/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Rogue/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Rogue/RunBackwards.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Rogue/StrafeLeft.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Rogue/StrafeRight.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Rogue/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Rogue/Special2.png', columns: 15, rows: 8 },
            { keySuffix: 'roll', path: 'assets/sprites/characters/Rogue/QuickSlide.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Rogue/Die.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Rogue/TakeDamage.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'hunter', type: 'character',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Hunter/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Hunter/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Hunter/RunBackwards.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Hunter/StrafeLeft.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Hunter/StrafeRight.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Hunter/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Hunter/BackRoll.png', columns: 15, rows: 8 },
            { keySuffix: 'roll', path: 'assets/sprites/characters/Hunter/CrouchRun.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Hunter/Die.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Hunter/TakeDamage.png', columns: 15, rows: 8 },
        ]
    },
    // Monsters
    {
        keyPrefix: 'skeleton', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Skeleton/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Skeleton/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Skeleton/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Skeleton/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Skeleton/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'elemental', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Elemental/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Elemental/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Elemental/Attack4.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Elemental/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Elemental/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'ogre', type: 'monster',
        defaultFrameSize: { width: 192, height: 192 },
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Ogre/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Ogre/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Ogre/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Ogre/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Ogre/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'ghoul', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Ghoul/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Ghoul/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Ghoul/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Ghoul/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Ghoul/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'wildarcher', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/WildArcher/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/WildArcher/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/WildArcher/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/WildArcher/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/WildArcher/Die.png', columns: 15, rows: 8 },
        ]
    },
    // Effects
    {
        keyPrefix: 'slash_effect', type: 'effect', path: 'assets/sprites/effects/Slash.png',
        columns: 8, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'strike_windup', type: 'effect', path: 'assets/sprites/effects/KnightStrikeWindup.png',
        columns: 6, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'strike_cast', type: 'effect', path: 'assets/sprites/effects/KnightStrikeCast.png',
        columns: 7, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'guardian_slash_effect', type: 'effect', path: 'assets/sprites/effects/GuardianAttack1.png',
        columns: 9, rows: 9, rowIndex: 0, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'guardian_jump_effect', type: 'effect', path: 'assets/sprites/effects/GuardianAttack2.png',
        columns: 12, rows: 9, rowIndex: 0, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'rogue_thrust_effect', type: 'effect', path: 'assets/sprites/effects/RogueAttack1.png',
        columns: 5, rows: 9, rowIndex: 3, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'rogue_dash_effect', type: 'effect', path: 'assets/sprites/effects/RogueAttack2.png',
        columns: 14, rows: 9, rowIndex: 3, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'bow_shot_effect', type: 'effect', path: 'assets/sprites/effects/579.png',
        columns: 9, rows: 9, rowIndex: 1, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'wildarcher_shot_effect', type: 'effect', path: 'assets/sprites/effects/579.png',
        columns: 9, rows: 9, rowIndex: 5, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'hunter_cone_effect', type: 'effect', path: 'assets/sprites/effects/448.png',
        columns: 9, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }
    },
    {
    keyPrefix: 'level_up_effect', type: 'effect', path: 'assets/sprites/effects/LevelUp.png',
    columns: 23, rows: 9, rowIndex: 0, frameSize: { width: 64, height: 64 }
}
];

export class SpriteManager {
    constructor() {
        this.textures = {};
        this.animations = {}; // Removed spritesheets, not used
        this.loaded = false;
        this.spriteScale = 1;
        this.frameWidth = 128;
        this.frameHeight = 128;
    }

    async loadSprites() {
        const promises = [];

        for (const config of SPRITE_SHEET_CONFIG) {
            if (config.type === 'character' || config.type === 'monster') {
                for (const animConfig of config.animations) {
                    const key = `${config.keyPrefix}_${animConfig.keySuffix}`;
                    promises.push(this.loadSpritesheet(
                        key,
                        animConfig.path,
                        animConfig.columns,
                        animConfig.rows,
                        config.defaultFrameSize || null // Pass entity-specific frame size or null
                    ));
                }
            } else if (config.type === 'effect') {
                promises.push(this.loadEffectSpritesheet(
                    config.keyPrefix, // For effects, keyPrefix is the full key
                    config.path,
                    config.columns,
                    config.rows, // Total rows in the sheet
                    config.rowIndex, // Specific row to extract
                    config.frameSize // Effects must have explicit frameSize
                ));
            }
        }

        await Promise.all(promises);
            
        this.createAnimations(); // This will be refactored next
        this.loaded = true;
        console.log("Sprites loaded successfully");
    }

    async loadSpritesheet(name, path, columns, rows, customFrameSize = null) {
        return new Promise((resolve, reject) => {
            PIXI.Assets.load(path).then(texture => {
                const frameWidth = customFrameSize ? customFrameSize.width : this.frameWidth;
                const frameHeight = customFrameSize ? customFrameSize.height : this.frameHeight;
                
                const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
                
                for (let row = 0; row < rows; row++) {
                    if (row >= directions.length) break; // Ensure we don't exceed directions array
                    const direction = directions[row];
                    const frames = [];
                    
                    for (let col = 0; col < columns; col++) {
                        const frameTexture = new PIXI.Texture(
                            texture.baseTexture,
                            new PIXI.Rectangle(
                                col * frameWidth,
                                row * frameHeight,
                                frameWidth,
                                frameHeight
                            )
                        );
                        frameTexture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                        frames.push(frameTexture);
                    }
                    this.textures[`${name}_${direction}`] = frames;
                }
                resolve();
            }).catch(error => {
                console.error(`Failed to load spritesheet ${path} for key ${name}:`, error);
                reject(error);
            });
        });
    }

    async loadEffectSpritesheet(name, path, columns, totalRows, rowIndex, frameSize) { // totalRows added for clarity
        return new Promise((resolve, reject) => {
            PIXI.Assets.load(path).then(texture => {
                const { width: frameWidth, height: frameHeight } = frameSize; // Destructure for clarity
                const frames = [];
                
                // rowIndex is the specific row to load frames from
                for (let col = 0; col < columns; col++) {
                    const frameTexture = new PIXI.Texture(
                        texture.baseTexture,
                        new PIXI.Rectangle(
                            col * frameWidth,
                            rowIndex * frameHeight, // Use rowIndex here
                            frameWidth,
                            frameHeight
                        )
                    );
                    frameTexture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                    frames.push(frameTexture);
                }
                this.textures[name] = frames; // Store directly by name
                resolve();
            }).catch(error => {
                console.error(`Failed to load effect spritesheet ${path} for key ${name}:`, error);
                reject(error);
            });
        });
    }

    // Helper function to create directional animations
    _createDirectionalAnimations(entityType, actionName, properties, directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne']) {
        for (const direction of directions) {
            const textureKey = `${entityType}_${actionName}_${direction}`;
            if (!this.textures[textureKey]) {
                console.warn(`Textures not found for ${textureKey}`);
                continue;
            }
            this.animations[textureKey] = {
                textures: this.textures[textureKey],
                speed: properties.speed || 0.2, // Default speed if not specified
                hitFrame: properties.hitFrame // Will be undefined if not applicable
            };
        }
    }

    createAnimations() {
        // Player Animations
        for (const className in PLAYER_CONFIG.classes) {
            const classConfig = PLAYER_CONFIG.classes[className];
            const entityType = classConfig.spritePrefix; // e.g., 'knight', 'guardian'
            if (classConfig.animations) {
                for (const animName in classConfig.animations) { // e.g., 'idle', 'run', 'attack1'
                    this._createDirectionalAnimations(entityType, animName, classConfig.animations[animName]);
                }
            }
        }

        // Monster Animations
        for (const monsterType in MONSTER_CONFIG.stats) {
            const monsterStats = MONSTER_CONFIG.stats[monsterType];
            // Monster sprite prefixes are the monsterType itself (e.g. 'skeleton', 'ogre')
            if (monsterStats.animations) {
                for (const animName in monsterStats.animations) { // e.g., 'walk', 'idle', 'attack1'
                    this._createDirectionalAnimations(monsterType, animName, monsterStats.animations[animName]);
                }
            }
        }

        // Effect Animations (non-directional) - Ensure textures are linked
        for (const effectName in PLAYER_CONFIG.effects) {
            // Check if it's an actual effect config
            if (typeof PLAYER_CONFIG.effects[effectName] === 'object' && 
                PLAYER_CONFIG.effects[effectName] !== null && 
                this.textures[effectName] &&
                effectName !== 'effectAnimations') { // Ensure we skip the old key if it somehow existed
                 this.animations[effectName] = {
                     textures: this.textures[effectName],
                     // Speed can be a default, it will be primarily set by CombatSystem
                     speed: PLAYER_CONFIG.effects[effectName].animationSpeed || 0.2 
                 };
            }
        }
    }

    // Removed individual create...Animations methods (createKnightAnimations, createGuardianAnimations, etc.)
    // Removed create...EffectAnimations methods (createSlashEffectAnimation, etc.) as they are now data-driven

    createAnimatedSprite(animationName) {
    if (!this.animations[animationName]) {
        console.error(`Animation ${animationName} not found`);
        return null;
    }
    
    const sprite = new PIXI.AnimatedSprite(this.animations[animationName].textures);
    sprite.animationSpeed = this.animations[animationName].speed;
    sprite.anchor.set(0.5, 0.5);
    
    // Apply scale (default 1x for HD sprites)
    let scale = this.spriteScale;
    
    // If this is an ogre sprite, adjust the scale to compensate for the larger frames
    if (animationName.startsWith('ogre_')) {
        // Ogre sprites are 192x192 but we want them to appear about 1.5x larger than regular sprites
        scale = (this.frameWidth / 192) * 1.5;
    }
    
    sprite.scale.set(scale, scale);
    
    return sprite;
}

// Update getAnimationForMovement to handle different character classes
getAnimationForMovement(facingDirection, movementDirection) {
    // Get current character class from the entity this animation is for
    const playerEntity = window.game?.entities?.player;
    const characterClass = playerEntity?.characterClass || 'bladedancer'; // Default to bladedancer if no player
    
    // Fetch spritePrefix from PLAYER_CONFIG
    const classConfig = PLAYER_CONFIG.classes[characterClass];
    const classPrefix = classConfig?.spritePrefix || 'knight'; // Default to 'knight' if not found

    // Convert 8-way direction to the animation suffix (e, se, s, etc.)
    const facingSuffix = directionStringToAnimationSuffix(facingDirection);
    
    // If not moving, return idle animation
    if (!movementDirection) {
        return `${classPrefix}_idle_${facingSuffix}`;
    }
    
    const movementSuffix = directionStringToAnimationSuffix(movementDirection);
    
    if (!facingSuffix || !movementSuffix) {
        // Default to south-facing idle if direction string is invalid
        return `${classPrefix}_idle_${facingSuffix || 's'}`; 
    }
    
    // Determine which animation to use based on the relationship between facing and movement directions
    if (facingSuffix === movementSuffix) {
        // Running forward
        return `${classPrefix}_run_${facingSuffix}`;
    } else {
        // Check if running backward (opposite direction)
        // For this, we might need a utility to get opposite suffix or compare angles
        // For now, this logic relies on the suffixes directly:
        const opposites = {
            'e': 'w', 'w': 'e', 'n': 's', 's': 'n',
            'ne': 'sw', 'sw': 'ne', 'nw': 'se', 'se': 'nw'
        };
        
        if (movementSuffix === opposites[facingSuffix]) {
            return `${classPrefix}_run_backward_${facingSuffix}`;
        }
        
        // Check if strafing left or right relative to facing direction
        // This logic is complex and relies on the order of suffixes.
        // It's generally better to work with angles for such comparisons.
        // However, to minimize changes for now, we keep the existing clockwise logic.
        const clockwise = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']; // Suffixes
        const facingIndex = clockwise.indexOf(facingSuffix);
        const movementIndex = clockwise.indexOf(movementSuffix);
        
        // Determine if movement is to the left or right of facing
        if (facingIndex !== -1 && movementIndex !== -1) {
            // Calculate the shortest path around the circle
            let diff = movementIndex - facingIndex;
            if (diff < -4) diff += 8; // e.g. n (0) to sw (5) = 5, but should be -3
            if (diff > 4) diff -= 8; // e.g. w (6) to ne (1) = -5, but should be 3
            
            if (diff > 0 && diff <= 4) { // Adjusted to include 4 for strafe right
                // Movement is to the right of facing
                return `${classPrefix}_strafe_right_${facingSuffix}`;
            } else if (diff < 0 && diff >= -4) { // Adjusted to include -4 for strafe left
                // Movement is to the left of facing
                return `${classPrefix}_strafe_left_${facingSuffix}`;
            }
        }
        
        // Default to run forward if we can't determine (e.g. if suffixes were invalid)
        return `${classPrefix}_run_${facingSuffix}`;
    }
}
    
getAttackAnimation(facingDirection, attackType) {
    // Get current character class
    const playerEntity = window.game?.entities?.player;
    const characterClass = playerEntity?.characterClass || 'bladedancer'; // Default to bladedancer
    
    // Fetch spritePrefix from PLAYER_CONFIG
    const classConfig = PLAYER_CONFIG.classes[characterClass];
    const classPrefix = classConfig?.spritePrefix || 'knight'; // Default to 'knight'

    // Convert 8-way direction string to animation suffix
    const facingSuffix = directionStringToAnimationSuffix(facingDirection);
    
    if (!facingSuffix) {
        return attackType === 'roll'
            ? `${classPrefix}_roll_s`
            : (attackType === 'primary'
                ? `${classPrefix}_attack1_s`
                : `${classPrefix}_attack2_s`);
    }

    if (attackType === 'roll') {
        return `${classPrefix}_roll_${facingSuffix}`;
    }

    return attackType === 'primary'
        ? `${classPrefix}_attack1_${facingSuffix}`
        : `${classPrefix}_attack2_${facingSuffix}`;
}
    
    getAttackHitFrame(animationName) {
        if (!this.animations[animationName]) {
            return 0;
        }
        
        return this.animations[animationName].hitFrame || 0;
    }
    
    getAttackHitArea(facingDirection, attackType) {
        // Define the hit areas for each attack type
        if (attackType === 'primary') {
            // Attack 1: Cone directly in front, medium range
            return {
                type: 'cone',
                range: 70,
                angle: 75 // 75 degree cone
            };
        } else {
            // Attack 2: Rectangle in front, shorter range but wider
            return {
                type: 'rectangle',
                width: 80,
                length: 110
            };
        }
    }
    
    getMonsterAnimationForDirection(monsterType, directionString, state = 'walk') {
        // Convert 8-way direction string to animation suffix
        const facingSuffix = directionStringToAnimationSuffix(directionString);
        
        if (monsterType === 'skeleton' || monsterType === 'elemental' ||
            monsterType === 'ogre' || monsterType === 'ghoul' || monsterType === 'wildarcher') {
            // Handle special animation states
            if (state === 'hit') {
                return `${monsterType}_take_damage_${facingSuffix}`;
            } else if (state === 'die') {
                return `${monsterType}_die_${facingSuffix}`;
            }
            
            return `${monsterType}_${state}_${facingSuffix}`;
        }
        
        // Default fallback (should ideally not be reached if monsterType is always valid)
        console.warn(`Unknown monster type or invalid state for animation: ${monsterType}, ${state}`);
        return `skeleton_walk_s`; // Fallback to a known animation
    }
    createSlashEffectAnimation() {
        // Just use a single animation for the slash effect
        this.animations['slash_effect'] = {
            textures: this.textures['slash_effect'],
            speed: 0.5
        };
    }

    // Add this new method to SpriteManager.js
createStrikeEffectAnimations() {
    // Create animations for the strike effects
    this.animations['strike_windup'] = {
        textures: this.textures['strike_windup'],
        speed: 0.8
    };
    
    this.animations['strike_cast'] = {
        textures: this.textures['strike_cast'],
        speed: 0.2
    };
}
}