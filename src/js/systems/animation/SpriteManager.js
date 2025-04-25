// src/js/systems/animation/SpriteManager.js
import * as PIXI from 'pixi.js';

export class SpriteManager {
    constructor() {
        this.textures = {};
        this.spritesheets = {};
        this.animations = {};
        this.loaded = false;
        this.spriteScale = 1; // Set scale to 1x for HD sprites
        this.frameWidth = 128; // Update frame dimensions for 128x128 sprites
        this.frameHeight = 128;
    }

    async loadSprites() {
        // Load knight spritesheets
        await Promise.all([
            this.loadSpritesheet('knight_idle', 'assets/sprites/characters/Knight/Idle.png', 15, 8),
            this.loadSpritesheet('knight_run', 'assets/sprites/characters/Knight/Run.png', 15, 8),
            this.loadSpritesheet('knight_run_backward', 'assets/sprites/characters/Knight/RunBackward.png', 15, 8),
            this.loadSpritesheet('knight_strafe_left', 'assets/sprites/characters/Knight/StrafeLeft.png', 15, 8),
            this.loadSpritesheet('knight_strafe_right', 'assets/sprites/characters/Knight/StrafeRight.png', 15, 8),
            this.loadSpritesheet('knight_attack1', 'assets/sprites/characters/Knight/Attack1.png', 15, 8),
            this.loadSpritesheet('knight_attack2', 'assets/sprites/characters/Knight/Attack2.png', 15, 8),
            this.loadSpritesheet('knight_die', 'assets/sprites/characters/Knight/Die.png', 15, 8), // Add death animation
            this.loadSpritesheet('knight_take_damage', 'assets/sprites/characters/Knight/TakeDamage.png', 15, 8), // Add take damage animation
            // Monster sprites
            this.loadSpritesheet('skeleton_walk', 'assets/sprites/monsters/Skeleton/Walk.png', 15, 8),
            this.loadSpritesheet('skeleton_idle', 'assets/sprites/monsters/Skeleton/Idle.png', 15, 8),
            this.loadSpritesheet('skeleton_attack1', 'assets/sprites/monsters/Skeleton/Attack1.png', 15, 8),
            this.loadSpritesheet('skeleton_take_damage', 'assets/sprites/monsters/Skeleton/TakeDamage.png', 15, 8) // Add skeleton take damage
        ]);
    
        this.createAnimations();
        this.loaded = true;
        console.log("Sprites loaded successfully");
    }

    async loadSpritesheet(name, path, columns, rows) {
        return new Promise((resolve, reject) => {
            // Load the spritesheet image
            PIXI.Assets.load(path).then(texture => {
                // Using the fixed frame dimensions for 128x128 sprites
                const frameWidth = this.frameWidth;
                const frameHeight = this.frameHeight;
                
                // Extract frames for each row
                const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
                
                for (let row = 0; row < rows; row++) {
                    const direction = directions[row];
                    const frames = [];
                    
                    for (let col = 0; col < columns; col++) {
                        // Create a texture for this frame
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
                    
                    // Store frames for this direction
                    this.textures[`${name}_${direction}`] = frames;
                }
                
                resolve();
            }).catch(error => {
                console.error(`Failed to load spritesheet ${path}:`, error);
                reject(error);
            });
        });
    }

    createAnimations() {
        // Define animations based on the loaded textures
        this.createKnightAnimations();
        this.createSkeletonAnimations();
    }

    createKnightAnimations() {
        const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
        
        // Create animations for each direction
        for (const direction of directions) {
            // Idle animation
            this.animations[`knight_idle_${direction}`] = {
                textures: this.textures[`knight_idle_${direction}`],
                speed: 0.2
            };

            // Standard run animation
            this.animations[`knight_run_${direction}`] = {
                textures: this.textures[`knight_run_${direction}`],
                speed: 0.5
            };
            
            // Run backward animation
            this.animations[`knight_run_backward_${direction}`] = {
                textures: this.textures[`knight_run_backward_${direction}`],
                speed: 0.5
            };
            
            // Strafe left animation
            this.animations[`knight_strafe_left_${direction}`] = {
                textures: this.textures[`knight_strafe_left_${direction}`],
                speed: 0.5
            };
            
            // Strafe right animation
            this.animations[`knight_strafe_right_${direction}`] = {
                textures: this.textures[`knight_strafe_right_${direction}`],
                speed: 0.5
            };
            
            // Attack 1 (forehand slash) animation
            this.animations[`knight_attack1_${direction}`] = {
                textures: this.textures[`knight_attack1_${direction}`],
                speed: 0.3,
                hitFrame: 8
            };
            
            // Attack 2 (overhead smash) animation
            this.animations[`knight_attack2_${direction}`] = {
                textures: this.textures[`knight_attack2_${direction}`],
                speed: 0.3,
                hitFrame: 12
            };
                    // Take damage animation
        this.animations[`knight_take_damage_${direction}`] = {
            textures: this.textures[`knight_take_damage_${direction}`],
            speed: 0.5 // Slightly faster than normal animations
        };
             // Death animation
        this.animations[`knight_die_${direction}`] = {
            textures: this.textures[`knight_die_${direction}`],
            speed: 0.2
        };
        }
    }
    
    createSkeletonAnimations() {
        const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
        
        // Create animations for each direction
        for (const direction of directions) {
            // Walk animation
            this.animations[`skeleton_walk_${direction}`] = {
                textures: this.textures[`skeleton_walk_${direction}`],
                speed: 0.4
            };
            
            // Idle animation
            this.animations[`skeleton_idle_${direction}`] = {
                textures: this.textures[`skeleton_idle_${direction}`],
                speed: 0.2
            };
            
            // Attack animation
            this.animations[`skeleton_attack1_${direction}`] = {
                textures: this.textures[`skeleton_attack1_${direction}`],
                speed: 0.3,
                hitFrame: 8  // Assuming hit happens around frame 8, adjust as needed
            };
            // Take damage animation
        this.animations[`skeleton_take_damage_${direction}`] = {
            textures: this.textures[`skeleton_take_damage_${direction}`],
            speed: 0.3
        };
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
        
        // Apply scale (now 1x for HD sprites)
        sprite.scale.set(this.spriteScale, this.spriteScale);
        
        return sprite;
    }

    getAnimationForMovement(facingDirection, movementDirection) {
        // Convert 8-way direction to the format used in our animations (e, se, s, etc.)
        const directionMap = {
            'right': 'e',
            'down-right': 'se',
            'down': 's',
            'down-left': 'sw',
            'left': 'w',
            'up-left': 'nw',
            'up': 'n',
            'up-right': 'ne'
        };
        
        const facing = directionMap[facingDirection];
        
        // If not moving, return idle animation
        if (!movementDirection) {
            return `knight_idle_${facing}`;
        }
        
        const movement = directionMap[movementDirection];
        
        if (!facing || !movement) {
            return `knight_idle_${facing || 's'}`; // Default to south-facing idle
        }
        
        // Determine which animation to use based on the relationship between facing and movement directions
        if (facing === movement) {
            // Running forward
            return `knight_run_${facing}`;
        } else {
            // Check if running backward (opposite direction)
            const opposites = {
                'e': 'w', 'w': 'e', 'n': 's', 's': 'n',
                'ne': 'sw', 'sw': 'ne', 'nw': 'se', 'se': 'nw'
            };
            
            if (movement === opposites[facing]) {
                return `knight_run_backward_${facing}`;
            }
            
            // Check if strafing left or right relative to facing direction
            const clockwise = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
            const facingIndex = clockwise.indexOf(facing);
            const movementIndex = clockwise.indexOf(movement);
            
            // Determine if movement is to the left or right of facing
            if (facingIndex !== -1 && movementIndex !== -1) {
                // Calculate the shortest path around the circle
                let diff = movementIndex - facingIndex;
                if (diff < -4) diff += 8;
                if (diff > 4) diff -= 8;
                
                if (diff > 0 && diff < 4) {
                    // Movement is to the right of facing
                    return `knight_strafe_right_${facing}`;
                } else if (diff < 0 && diff > -4) {
                    // Movement is to the left of facing
                    return `knight_strafe_left_${facing}`;
                }
            }
            
            // Default to run forward if we can't determine
            return `knight_run_${facing}`;
        }
    }
    
    getAttackAnimation(facingDirection, attackType) {
        // Convert 8-way direction to the format used in our animations
        const directionMap = {
            'right': 'e',
            'down-right': 'se',
            'down': 's',
            'down-left': 'sw',
            'left': 'w',
            'up-left': 'nw',
            'up': 'n',
            'up-right': 'ne'
        };
        
        const facing = directionMap[facingDirection];
        
        if (!facing) {
            return attackType === 'primary' ? 'knight_attack1_s' : 'knight_attack2_s';
        }
        
        return attackType === 'primary' ? `knight_attack1_${facing}` : `knight_attack2_${facing}`;
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
    
    getMonsterAnimationForDirection(monsterType, direction, state = 'walk') {
        // Convert 8-way direction to the format used in animations
        const directionMap = {
            'right': 'e',
            'down-right': 'se',
            'down': 's',
            'down-left': 'sw',
            'left': 'w',
            'up-left': 'nw',
            'up': 'n',
            'up-right': 'ne'
        };
        
        const facing = directionMap[direction] || 's'; // Default to south
        
        if (monsterType === 'skeleton') {
            // Map 'hit' state to take_damage
            if (state === 'hit') {
                return `skeleton_take_damage_${facing}`;
            }
            
            return `skeleton_${state}_${facing}`;
        }
        
        // Default fallback
        return `skeleton_walk_s`;
    }
}