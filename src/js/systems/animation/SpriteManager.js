// src/js/systems/animation/SpriteManager.js
import * as PIXI from 'pixi.js';
// PLAYER_CONFIG and MONSTER_CONFIG are no longer directly used in this file after refactoring.
import { directionStringToAnimationSuffix } from '../../utils/DirectionUtils.js';

const SPRITE_SHEET_CONFIG = [
    // Actors (Characters)
    {
        keyPrefix: 'knight', category: 'actor',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Knight/Idle.png', columns: 15, rows: 8, speed: 0.2 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Knight/Run.png', columns: 15, rows: 8, speed: 0.5 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Knight/RunBackwards.png', columns: 15, rows: 8, speed: 0.5 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Knight/StrafeLeft.png', columns: 15, rows: 8, speed: 0.5 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Knight/StrafeRight.png', columns: 15, rows: 8, speed: 0.5 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Knight/Attack1.png', columns: 15, rows: 8, speed: 0.4, hitFrame: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Knight/Attack2.png', columns: 15, rows: 8, speed: 0.3, hitFrame: 12 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Knight/Die.png', columns: 15, rows: 8, speed: 0.2 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Knight/TakeDamage.png', columns: 15, rows: 8, speed: 0.5 },
        ]
    },
    {
        keyPrefix: 'guardian', category: 'actor',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Guardian/Idle.png', columns: 15, rows: 8, speed: 0.15 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Guardian/Run.png', columns: 15, rows: 8, speed: 0.4 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Guardian/RunBackwards.png', columns: 15, rows: 8, speed: 0.4 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Guardian/StrafeLeft.png', columns: 15, rows: 8, speed: 0.4 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Guardian/StrafeRight.png', columns: 15, rows: 8, speed: 0.4 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Guardian/Attack1.png', columns: 15, rows: 8, speed: 0.35, hitFrame: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Guardian/AttackRun.png', columns: 15, rows: 8, speed: 0.35, hitFrame: 12 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Guardian/Die.png', columns: 15, rows: 8, speed: 0.2 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Guardian/TakeDamage.png', columns: 15, rows: 8, speed: 0.5 },
        ]
    },
    {
        keyPrefix: 'rogue', category: 'actor',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Rogue/Idle.png', columns: 15, rows: 8, speed: 0.25 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Rogue/Run.png', columns: 15, rows: 8, speed: 0.6 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Rogue/RunBackwards.png', columns: 15, rows: 8, speed: 0.6 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Rogue/StrafeLeft.png', columns: 15, rows: 8, speed: 0.6 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Rogue/StrafeRight.png', columns: 15, rows: 8, speed: 0.6 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Rogue/Attack1.png', columns: 15, rows: 8, speed: 0.5, hitFrame: 7 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Rogue/Special2.png', columns: 15, rows: 8, speed: 0.4, hitFrame: 10 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Rogue/Die.png', columns: 15, rows: 8, speed: 0.25 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Rogue/TakeDamage.png', columns: 15, rows: 8, speed: 0.6 },
        ]
    },
    {
        keyPrefix: 'hunter', category: 'actor',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Hunter/Idle.png', columns: 15, rows: 8, speed: 0.2 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Hunter/Run.png', columns: 15, rows: 8, speed: 0.5 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Hunter/RunBackwards.png', columns: 15, rows: 8, speed: 0.5 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Hunter/StrafeLeft.png', columns: 15, rows: 8, speed: 0.5 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Hunter/StrafeRight.png', columns: 15, rows: 8, speed: 0.5 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Hunter/Attack1.png', columns: 15, rows: 8, speed: 0.5, hitFrame: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Hunter/BackRoll.png', columns: 15, rows: 8, speed: 0.5, hitFrame: 12 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Hunter/Die.png', columns: 15, rows: 8, speed: 0.2 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Hunter/TakeDamage.png', columns: 15, rows: 8, speed: 0.5 },
        ]
    },
    // Actors (Monsters)
    {
        keyPrefix: 'skeleton', category: 'actor',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Skeleton/Walk.png', columns: 15, rows: 8, speed: 0.4 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Skeleton/Idle.png', columns: 15, rows: 8, speed: 0.2 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Skeleton/Attack1.png', columns: 15, rows: 8, speed: 0.3, hitFrame: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Skeleton/TakeDamage.png', columns: 15, rows: 8, speed: 0.7 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Skeleton/Die.png', columns: 15, rows: 8, speed: 0.5 },
        ]
    },
    {
        keyPrefix: 'elemental', category: 'actor',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Elemental/Walk.png', columns: 15, rows: 8, speed: 0.4 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Elemental/Idle.png', columns: 15, rows: 8, speed: 0.2 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Elemental/Attack4.png', columns: 15, rows: 8, speed: 0.3, hitFrame: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Elemental/TakeDamage.png', columns: 15, rows: 8, speed: 0.7 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Elemental/Die.png', columns: 15, rows: 8, speed: 0.2 },
        ]
    },
    {
        keyPrefix: 'ogre', category: 'actor',
        defaultFrameSize: { width: 192, height: 192 },
        scaleModifier: 1.5, // Make Ogre appear 1.5x larger than its normalized 128px representation
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Ogre/Walk.png', columns: 15, rows: 8, speed: 0.3 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Ogre/Idle.png', columns: 15, rows: 8, speed: 0.2 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Ogre/Attack1.png', columns: 15, rows: 8, speed: 0.25, hitFrame: 9 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Ogre/TakeDamage.png', columns: 15, rows: 8, speed: 0.7 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Ogre/Die.png', columns: 15, rows: 8, speed: 0.2 },
        ]
    },
    {
        keyPrefix: 'ghoul', category: 'actor',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Ghoul/Walk.png', columns: 15, rows: 8, speed: 0.45 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Ghoul/Idle.png', columns: 15, rows: 8, speed: 0.25 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Ghoul/Attack1.png', columns: 15, rows: 8, speed: 0.4, hitFrame: 7 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Ghoul/TakeDamage.png', columns: 15, rows: 8, speed: 0.7 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Ghoul/Die.png', columns: 15, rows: 8, speed: 0.25 },
        ]
    },
    // Effects
    {
        keyPrefix: 'slash_effect', category: 'effect', path: 'assets/sprites/effects/Slash.png',
        columns: 8, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }, speed: 0.5
    },
    {
        keyPrefix: 'strike_windup', category: 'effect', path: 'assets/sprites/effects/KnightStrikeWindup.png',
        columns: 6, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }, speed: 0.8
    },
    {
        keyPrefix: 'strike_cast', category: 'effect', path: 'assets/sprites/effects/KnightStrikeCast.png',
        columns: 7, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }, speed: 0.2
    },
    {
        keyPrefix: 'guardian_slash_effect', category: 'effect', path: 'assets/sprites/effects/GuardianAttack1.png',
        columns: 9, rows: 9, rowIndex: 0, frameSize: { width: 64, height: 64 }, speed: 0.6
    },
    {
        keyPrefix: 'guardian_jump_effect', category: 'effect', path: 'assets/sprites/effects/GuardianAttack2.png',
        columns: 12, rows: 9, rowIndex: 0, frameSize: { width: 64, height: 64 }, speed: 0.5
    },
    {
        keyPrefix: 'rogue_thrust_effect', category: 'effect', path: 'assets/sprites/effects/RogueAttack1.png',
        columns: 5, rows: 9, rowIndex: 3, frameSize: { width: 64, height: 64 }, speed: 0.7
    },
    {
        keyPrefix: 'rogue_dash_effect', category: 'effect', path: 'assets/sprites/effects/RogueAttack2.png',
        columns: 14, rows: 9, rowIndex: 3, frameSize: { width: 64, height: 64 }, speed: 0.5
    },
    {
        keyPrefix: 'bow_shot_effect', category: 'effect', path: 'assets/sprites/effects/579.png',
        columns: 9, rows: 9, rowIndex: 1, frameSize: { width: 64, height: 64 }, speed: 0.2
    },
    {
        keyPrefix: 'hunter_cone_effect', category: 'effect', path: 'assets/sprites/effects/448.png',
        columns: 9, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }, speed: 0.5
    },
    {
        keyPrefix: 'level_up_effect', category: 'effect', path: 'assets/sprites/effects/LevelUp.png',
        columns: 23, rows: 9, rowIndex: 0, frameSize: { width: 64, height: 64 }, speed: 0.4
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

    /**
     * Loads textures from a spritesheet for a given configuration entry.
     * Handles both directional (multi-row, e.g., actor animations) and 
     * non-directional (single-row, e.g., effects) spritesheets.
     * @param {string} textureKeyName - The base name for the texture(s) (e.g., 'knight_idle' or 'slash_effect').
     * @param {string} path - The path to the spritesheet image.
     * @param {number} columns - The number of columns in the spritesheet.
     * @param {number} rowsOrRowIndex - For directional sheets, the total number of rows (directions). 
     *                                  For non-directional, the specific row index to load frames from.
     * @param {number} frameWidth - The width of a single frame.
     * @param {number} frameHeight - The height of a single frame.
     * @param {boolean} isDirectionalSheet - True if the sheet contains multiple rows for different directions.
     */
    async _loadTexturesForConfigEntry(textureKeyName, path, columns, rowsOrRowIndex, frameWidth, frameHeight, isDirectionalSheet) {
        return new Promise((resolve, reject) => {
            PIXI.Assets.load(path).then(texture => {
                if (isDirectionalSheet) { // For actor sprites with multiple directions
                    const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
                    // rowsOrRowIndex here is the total number of rows (directions)
                    for (let row = 0; row < rowsOrRowIndex; row++) {
                        if (row >= directions.length) break; 
                        const direction = directions[row];
                        const frames = [];
                        for (let col = 0; col < columns; col++) {
                            const frameTexture = new PIXI.Texture(
                                texture.baseTexture,
                                new PIXI.Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight)
                            );
                            frameTexture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                            frames.push(frameTexture);
                        }
                        this.textures[`${textureKeyName}_${direction}`] = frames;
                    }
                } else {
                    // rowsOrRowIndex here is the specific rowIndex
                    const rowIndex = rowsOrRowIndex;
                    const frames = [];
                    for (let col = 0; col < columns; col++) {
                        const frameTexture = new PIXI.Texture(
                            texture.baseTexture,
                            new PIXI.Rectangle(col * frameWidth, rowIndex * frameHeight, frameWidth, frameHeight)
                        );
                        frameTexture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                        frames.push(frameTexture);
                    }
                    this.textures[textureKeyName] = frames; // Store directly by textureKeyName for single-row effects
                }
                resolve();
            }).catch(error => {
                console.error(`Failed to load spritesheet ${path} for key ${textureKeyName}:`, error);
                reject(error);
            });
        });
    }

    async loadSprites() {
        const promises = [];
        for (const config of SPRITE_SHEET_CONFIG) {
            if (config.category === 'actor') {
                for (const animConfig of config.animations) {
                    const textureKeyName = `${config.keyPrefix}_${animConfig.keySuffix}`;
                    const frameSize = config.defaultFrameSize || { width: this.frameWidth, height: this.frameHeight };
                    promises.push(this._loadTexturesForConfigEntry(
                        textureKeyName,
                        animConfig.path,
                        animConfig.columns,
                        animConfig.rows, // These are directional rows
                        frameSize.width,
                        frameSize.height,
                        true // isDirectionalSheet
                    ));
                }
            } else if (config.category === 'effect') {
                const frameSize = config.frameSize; // Effects must have explicit frameSize
                promises.push(this._loadTexturesForConfigEntry(
                    config.keyPrefix, // Effects use keyPrefix as the textureKeyName
                    config.path,
                    config.columns,
                    config.rowIndex, // This is the specific row
                    frameSize.width,
                    frameSize.height,
                    false // isDirectionalSheet
                ));
            }
        }
        await Promise.all(promises);
        this.createAnimations(); // createAnimations() is called after this in the original flow
        this.loaded = true;
        console.log("Sprite textures loaded successfully via unified loader.");
    }

    /**
     * Helper function to create directional animations for an actor.
     * It assumes textures have already been loaded and stored in this.textures.
     * @param {object} actorConfig - The configuration object for the actor from SPRITE_SHEET_CONFIG.
     * @param {object} animConfig - The specific animation configuration (e.g., for 'idle', 'run').
     * @param {string[]} [directions=['e', ..., 'ne']] - Array of direction suffixes.
     */
    _createDirectionalAnimationsFromConfig(actorConfig, animConfig, directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne']) {
        for (const direction of directions) {
            const textureKey = `${actorConfig.keyPrefix}_${animConfig.keySuffix}_${direction}`;
            if (!this.textures[textureKey]) {
                console.warn(`Textures not found for ${textureKey}`);
                continue;
            }
            this.animations[textureKey] = {
                textures: this.textures[textureKey],
                speed: animConfig.speed || 0.2, // Default speed if not specified
                hitFrame: animConfig.hitFrame // Will be undefined if not applicable
            };
        }
    }

    /**
     * Creates all animations based on the SPRITE_SHEET_CONFIG.
     * This method is data-driven and iterates through the config to build animation objects.
     * It populates this.animations with PIXI.AnimatedSprite compatible data.
     */
    createAnimations() {
        for (const config of SPRITE_SHEET_CONFIG) {
            if (config.category === 'actor') {
                for (const animConfig of config.animations) {
                    this._createDirectionalAnimationsFromConfig(config, animConfig);
                }
            } else if (config.category === 'effect') {
                if (this.textures[config.keyPrefix]) {
                    this.animations[config.keyPrefix] = {
                        textures: this.textures[config.keyPrefix],
                        speed: config.speed || 0.2 // Default speed if not specified
                    };
                } else {
                    console.warn(`Textures not found for effect: ${config.keyPrefix}`);
                }
            }
        }
    }

    createAnimatedSprite(animationName) {
    if (!this.animations[animationName]) {
        console.error(`Animation ${animationName} not found`);
        return null;
    }
    
    const sprite = new PIXI.AnimatedSprite(this.animations[animationName].textures);
    sprite.animationSpeed = this.animations[animationName].speed;
    sprite.anchor.set(0.5, 0.5);

    // Apply scaling: Start with global spriteScale, then adjust based on the sprite's
    // native frame size (if different from default) and any specific scaleModifier.
    let scale = this.spriteScale;
    const keyPrefix = animationName.split('_')[0];
    const configEntry = SPRITE_SHEET_CONFIG.find(entry => entry.keyPrefix === keyPrefix);

    if (configEntry) {
        if (configEntry.defaultFrameSize) { // Adjust for native size relative to base frame size
            scale *= (this.frameWidth / configEntry.defaultFrameSize.width);
        }
        if (configEntry.scaleModifier) { // Apply additional custom scaling
            scale *= configEntry.scaleModifier;
        }
    }
    
    sprite.scale.set(scale); // Assuming scale is uniform for X and Y.
    
    return sprite;
}

/**
 * Determines the correct animation name for an entity's movement.
 * @param {string} entityType - The prefix for the entity (e.g., 'knight', 'skeleton').
 * @param {string} facingDirection - The direction the entity is facing (e.g., 'n', 'se').
 * @param {string|null} movementDirection - The direction the entity is moving, or null if not moving.
 * @returns {string} The animation name string.
 */
getAnimationForMovement(entityType, facingDirection, movementDirection) {
    const classPrefix = entityType || 'knight'; // Fallback to 'knight' if entityType is not provided.

    // Convert 8-way direction to the animation suffix (e.g., 'e', 'se', 's')
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
    
/**
 * Determines the correct attack animation name for an entity.
 * @param {string} entityType - The prefix for the entity (e.g., 'knight', 'skeleton').
 * @param {string} facingDirection - The direction the entity is facing.
 * @param {string} attackType - The type of attack (e.g., 'primary', 'secondary').
 * @returns {string} The animation name string.
 */
getAttackAnimation(entityType, facingDirection, attackType) {
    const classPrefix = entityType || 'knight'; // Fallback to 'knight' if entityType is not provided.

    // Convert 8-way direction string to animation suffix
    const facingSuffix = directionStringToAnimationSuffix(facingDirection);
    
    if (!facingSuffix) { // Should technically not happen due to default in util
        return attackType === 'primary' ? `${classPrefix}_attack1_s` : `${classPrefix}_attack2_s`;
    }
    
    return attackType === 'primary' ? `${classPrefix}_attack1_${facingSuffix}` : `${classPrefix}_attack2_${facingSuffix}`;
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
    
/**
 * Retrieves a generic animation name for an entity based on its type, direction, and state.
 * Handles common states like 'walk', 'idle', 'attack1', 'take_damage', 'die'.
 * Includes fallback logic if a specific animation is not found.
 * @param {string} entityType - The prefix for the entity (e.g., 'knight', 'skeleton').
 * @param {string} directionString - The direction the entity is facing.
 * @param {string} [state='walk'] - The current state of the entity.
 * @returns {string} The animation name string.
 */
getGenericEntityAnimation(entityType, directionString, state = 'walk') {
    const facingSuffix = directionStringToAnimationSuffix(directionString);
    const baseEntityType = entityType || 'skeleton'; // Fallback entity type if none provided.

    // Standard animation states that most entities might have.
    const standardStates = ['walk', 'idle', 'attack1', 'take_damage', 'die', 'run', 'run_backward', 'strafe_left', 'strafe_right', 'attack2'];

    if (standardStates.includes(state)) {
        // Check if a specific animation exists (e.g., skeleton_attack1_s)
        const animationKey = `${baseEntityType}_${state}_${facingSuffix}`;
        if (this.animations[animationKey]) {
            return animationKey;
        }
    }
    
    // Fallback for specific states if direct key doesn't exist or state is generic like 'hit'
    if (state === 'hit') { // Map 'hit' to 'take_damage'
        const takeDamageKey = `${baseEntityType}_take_damage_${facingSuffix}`;
        if (this.animations[takeDamageKey]) return takeDamageKey;
    } else if (state === 'die') {
        const dieKey = `${baseEntityType}_die_${facingSuffix}`;
        if (this.animations[dieKey]) return dieKey;
    }

    // Default fallback: try entityType_state_suffix, then entityType_walk_s, then skeleton_walk_s
    const defaultAnimation = `${baseEntityType}_${state}_${facingSuffix}`;
    if (this.animations[defaultAnimation]) {
        return defaultAnimation;
    }
    
    const fallbackWalk = `${baseEntityType}_walk_s`; // Fallback to entity's south walk
    if (this.animations[fallbackWalk]) {
        console.warn(`Animation not found for ${baseEntityType}_${state}_${facingSuffix}. Defaulting to ${fallbackWalk}.`);
        return fallbackWalk;
    }

    console.warn(`Animation not found for ${baseEntityType}_${state}_${facingSuffix}. Defaulting to skeleton_walk_s.`);
    return `skeleton_walk_s`; // Absolute fallback if no other animation is found.
}
// Note: Methods like createSlashEffectAnimation, createStrikeEffectAnimations were removed
// as effects are now data-driven from SPRITE_SHEET_CONFIG by the main createAnimations method.
}