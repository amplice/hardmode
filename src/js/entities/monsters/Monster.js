// src/js/entities/monsters/Monster.js
import * as PIXI from 'pixi.js';
import { MONSTER_CONFIG } from '../../config/GameConfig.js';

export class Monster {
    constructor(options) {
        this.position = { x: options.x, y: options.y };
        this.velocity = { x: 0, y: 0 };
        this.facing = 'down';
        this.type = options.type || 'skeleton';
        
        // Get stats from config
        const stats = MONSTER_CONFIG.stats[this.type];
        this.hitPoints = stats.hitPoints;
        this.moveSpeed = stats.moveSpeed;
        this.attackRange = stats.attackRange;
        this.attackDamage = 1;
        this.attackCooldown = 0;
        this.aggroRange = stats.aggroRange;
        this.target = null;
        this.alive = true;
        this.collisionRadius = stats.collisionRadius;
        
        // Attack state
        this.isAttacking = false;
        
        // Stun state
        this.isStunned = false;
        this.stunDuration = 0.2;
        this.stunTimer = 0;
        this.isTakingDamage = false;
        
        // Create sprite container
        this.sprite = new PIXI.Container();
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Get the sprite manager
        this.spriteManager = window.game.systems.sprites;
        
        // Create attack indicator
        this.attackIndicator = new PIXI.Graphics();
        this.sprite.addChild(this.attackIndicator);
        
        // Set up animations immediately
        if (this.spriteManager && this.spriteManager.loaded) {
            this.setupAnimations();
        }
    }
    
    setupAnimations() {
        // Initially use idle animation if not moving
        const animationState = this.isAttacking ? 'attack1' : (this.isMoving ? 'walk' : 'idle');
        const animationName = this.spriteManager.getMonsterAnimationForDirection(this.type, this.facing, animationState);
        this.currentAnimation = animationName;
        
        this.animatedSprite = this.spriteManager.createAnimatedSprite(animationName);
        
        if (this.animatedSprite) {
            this.animatedSprite.play();
            this.animatedSprite.anchor.set(0.5, 0.5);
            this.sprite.addChild(this.animatedSprite);
            
            // Set up animation complete callback
            this.animatedSprite.onComplete = () => this.onAnimationComplete();
        }
    }
    
    onAnimationComplete() {
        if (this.isPlayingAttackAnimation && this.animatedSprite) {
            console.log("Attack animation completed");
            this.isPlayingAttackAnimation = false;
            
            // Don't immediately update animation - let attack state finish first
        }
    }
    
    updateAnimation() {
        // Don't update animation if monster is dead
        if (!this.alive) return;
        
        if (this.spriteManager && this.spriteManager.loaded) {
            // Determine a single animation state
            let animationState;
            
            if (this.isStunned && this.isTakingDamage) {
                animationState = 'hit';
            } else if (this.isAttacking) {
                animationState = 'attack1';
            } else if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1) {
                animationState = 'walk';
            } else {
                animationState = 'idle';
            }
            
            // Get the animation name based on state and direction
            const animationName = this.spriteManager.getMonsterAnimationForDirection(
                this.type, this.facing, animationState
            );
            
            // Only update if animation changed
            if (this.currentAnimation !== animationName) {
                this.currentAnimation = animationName;
                
                // Remove old sprite
                if (this.animatedSprite && this.animatedSprite.parent) {
                    this.sprite.removeChild(this.animatedSprite);
                }
                
                // Create new sprite with current animation
                this.animatedSprite = this.spriteManager.createAnimatedSprite(animationName);
                
                if (this.animatedSprite) {
                    // Don't loop attack or hit animations
                    if (animationState === 'attack1' || animationState === 'hit') {
                        this.animatedSprite.loop = false;
                    } else {
                        this.animatedSprite.loop = true;
                    }
                    
                    this.animatedSprite.play();
                    this.animatedSprite.anchor.set(0.5, 0.5);
                    this.sprite.addChild(this.animatedSprite);
                    
                    // Maintain red tint if taking damage
                    if (this.isTakingDamage) {
                        this.animatedSprite.tint = 0xFF0000;
                    }
                    
                    // Set animation complete callback for non-looping animations
                    if (!this.animatedSprite.loop) {
                        this.animatedSprite.onComplete = () => {
                            if (animationState === 'hit') {
                                this.isTakingDamage = false;
                                this.currentAnimation = null;
                                this.updateAnimation();
                            }
                        };
                    }
                }
            }
        }
    }
    
    getAttackDetails() {
        return MONSTER_CONFIG.attacks[this.type];
    }
    
    updateFacingFromVelocity() {
        // Update facing direction based on velocity
        const vx = this.velocity.x;
        const vy = this.velocity.y;
        
        if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
            return; // Not moving enough to change direction
        }
        
        // Calculate absolute values for comparison
        const absX = Math.abs(vx);
        const absY = Math.abs(vy);
        
        // Use thresholds to determine if movement is diagonal or cardinal
        const diagonalThreshold = 0.5;
        
        // Check if movement is strongly in one direction or diagonal
        if (absX > absY * 1.5) {
            // Primarily horizontal movement
            this.facing = vx > 0 ? 'right' : 'left';
        } else if (absY > absX * 1.5) {
            // Primarily vertical movement
            this.facing = vy > 0 ? 'down' : 'up';
        } else {
            // Diagonal movement
            if (vx > 0 && vy > 0) this.facing = 'down-right';
            else if (vx < 0 && vy > 0) this.facing = 'down-left';
            else if (vx > 0 && vy < 0) this.facing = 'up-right';
            else if (vx < 0 && vy < 0) this.facing = 'up-left';
        }
    }
    
    startAttack() {
        if (this.isAttacking) return; // Already attacking
        
        this.isAttacking = true;
        console.log(`Monster ${this.type} preparing to attack!`);
        
        // Set up attack details
        const attackDetails = this.getAttackDetails();
        
        // Force animation update to attack animation immediately
        this.shouldPlayAttackAnimation = true;
        this.currentAnimation = null;
        this.updateAnimation();
        
        // Show attack windup indicator
        this.updateAttackIndicator(true);
        
        // Schedule the attack to happen right after windup
        setTimeout(() => {
            if (!this.isAttacking) return; // Check if attack was interrupted
            
            // Show active attack indicator and execute attack immediately
            this.updateAttackIndicator(false, true);
            this.executeAttack();
            
            // Schedule end of attack sequence after duration
            setTimeout(() => {
                if (!this.alive || !this.isAttacking) return;
                
                if (this.attackIndicator) {
                    this.attackIndicator.clear();
                }
                
                // End attack state and start cooldown
                this.isAttacking = false;
                this.shouldPlayAttackAnimation = false;
                this.attackCooldown = attackDetails.cooldown;
                
                // Return to idle/walk animation
                this.currentAnimation = null;
                this.updateAnimation();
                
            }, attackDetails.duration * 1000);
        }, attackDetails.windup * 1000);
    }
    
    updateAttackIndicator(isWindup = false, isActive = false) {
        this.attackIndicator.clear();
        
        if (!isWindup && !isActive) return;
        
        const attackDetails = this.getAttackDetails();
        const range = attackDetails.range || this.attackRange;
        
        // Different visual for windup vs active attack
        const alpha = isWindup ? 0.3 : 0.7;
        const color = isActive ? 0xFF0000 : attackDetails.color;
        
        // Clear any previous rotation
        this.attackIndicator.rotation = 0;
        
        // Draw based on attack pattern
        switch (attackDetails.pattern) {
            case 'circle':
                // Circle attack (omnidirectional)
                this.attackIndicator.beginFill(color, alpha);
                this.attackIndicator.drawCircle(0, 0, range);
                this.attackIndicator.endFill();
                break;
                
            case 'cone':
                // Cone attack (in facing direction)
                this.attackIndicator.beginFill(color, alpha);
                
                // Use a consistent approach for all directions
                // Start with the cone pointing right (0 radians)
                const coneAngle = Math.PI / 2; // 90 degree cone
                const startAngle = -coneAngle / 2;
                const endAngle = coneAngle / 2;
                
                // Draw the basic cone shape pointing right
                this.attackIndicator.moveTo(0, 0);
                this.attackIndicator.arc(0, 0, range, startAngle, endAngle);
                this.attackIndicator.lineTo(0, 0);
                this.attackIndicator.endFill();
                
                // Then rotate the entire cone based on facing direction
                let rotation = 0;
                switch(this.facing) {
                    case 'right': rotation = 0; break;
                    case 'down-right': rotation = Math.PI / 4; break;
                    case 'down': rotation = Math.PI / 2; break;
                    case 'down-left': rotation = 3 * Math.PI / 4; break;
                    case 'left': rotation = Math.PI; break;
                    case 'up-left': rotation = 5 * Math.PI / 4; break;
                    case 'up': rotation = 3 * Math.PI / 2; break;
                    case 'up-right': rotation = 7 * Math.PI / 4; break;
                }
                
                this.attackIndicator.rotation = rotation;
                break;
                
            case 'line':
                // Line attack (in facing direction)
                this.attackIndicator.beginFill(color, alpha);
                
                // Create a rectangle pointing right (0 radians)
                const width = 30; // Width of the line attack
                this.attackIndicator.drawRect(0, -width / 2, range, width);
                this.attackIndicator.endFill();
                
                // Rotate based on facing direction
                let lineRotation = 0;
                switch(this.facing) {
                    case 'right': lineRotation = 0; break;
                    case 'down-right': lineRotation = Math.PI / 4; break;
                    case 'down': lineRotation = Math.PI / 2; break;
                    case 'down-left': lineRotation = 3 * Math.PI / 4; break;
                    case 'left': lineRotation = Math.PI; break;
                    case 'up-left': lineRotation = 5 * Math.PI / 4; break;
                    case 'up': lineRotation = 3 * Math.PI / 2; break;
                    case 'up-right': lineRotation = 7 * Math.PI / 4; break;
                }
                
                this.attackIndicator.rotation = lineRotation;
                break;
        }
    }
    
    executeAttack() {
        console.log(`Monster ${this.type} attacks!`);
        
        if (!this.target) return;
        
        const attackDetails = this.getAttackDetails();
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        
        let hit = false;
        
        // Check if player is in range
        if (distToTarget <= this.attackRange) {
            switch (attackDetails.pattern) {
                case 'circle':
                    // Circle hits in all directions within range
                    hit = true;
                    break;
                    
                case 'cone':
                    // Get angle to target (in standard form, 0 = right, increases counterclockwise)
                    let angle = Math.atan2(dy, dx);
                    
                    // Get facing angle in the same format
                    let facingAngle = 0;
                    switch(this.facing) {
                        case 'right': facingAngle = 0; break;
                        case 'down-right': facingAngle = Math.PI / 4; break;
                        case 'down': facingAngle = Math.PI / 2; break;
                        case 'down-left': facingAngle = 3 * Math.PI / 4; break;
                        case 'left': facingAngle = Math.PI; break;
                        case 'up-left': facingAngle = 5 * Math.PI / 4; break;
                        case 'up': facingAngle = 3 * Math.PI / 2; break;
                        case 'up-right': facingAngle = 7 * Math.PI / 4; break;
                    }
                    
                    // Calculate the angle difference
                    let angleDiff = Math.abs(angle - facingAngle);
                    // Normalize to [0, 2π)
                    while (angleDiff < 0) angleDiff += 2 * Math.PI;
                    while (angleDiff >= 2 * Math.PI) angleDiff -= 2 * Math.PI;
                    // Convert to smallest angle difference
                    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                    
                    // Check if target is within the cone angle (90 degrees = π/2 radians)
                    const coneHalfAngle = Math.PI / 4; // 45 degrees on each side
                    hit = (angleDiff <= coneHalfAngle);
                    
                    break;
                    
                case 'line':
                    // Calculate the angle to the player from the monster's position
                    let targetAngle = Math.atan2(dy, dx);
                    
                    // Get monster's facing angle in the same radians format
                    let monsterFacingAngle = 0;
                    switch(this.facing) {
                        case 'right': monsterFacingAngle = 0; break;
                        case 'down-right': monsterFacingAngle = Math.PI / 4; break;
                        case 'down': monsterFacingAngle = Math.PI / 2; break;
                        case 'down-left': monsterFacingAngle = 3 * Math.PI / 4; break;
                        case 'left': monsterFacingAngle = Math.PI; break;
                        case 'up-left': monsterFacingAngle = 5 * Math.PI / 4; break;
                        case 'up': monsterFacingAngle = 3 * Math.PI / 2; break;
                        case 'up-right': monsterFacingAngle = 7 * Math.PI / 4; break;
                    }
                    
                    // Calculate angle difference
                    let lineAngleDiff = Math.abs(targetAngle - monsterFacingAngle);
                    // Normalize to smallest angle difference
                    while (lineAngleDiff < 0) lineAngleDiff += 2 * Math.PI;
                    while (lineAngleDiff >= 2 * Math.PI) lineAngleDiff -= 2 * Math.PI;
                    if (lineAngleDiff > Math.PI) lineAngleDiff = 2 * Math.PI - lineAngleDiff;
                    
                    // Line attack has narrow angle tolerance and checks distance
                    const angleThreshold = Math.PI / 12; // 15 degrees tolerance
                    const lineWidth = 30;
                    
                    // Calculate lateral distance from the line
                    const perpendicularDist = Math.abs(distToTarget * Math.sin(lineAngleDiff));
                    
                    // Hit if the angle is small enough and perpendicular distance is within line width
                    hit = (lineAngleDiff <= angleThreshold && perpendicularDist <= lineWidth / 2);
                    
                    break;
            }
        }
        
        if (hit && this.target.takeDamage) {
            this.target.takeDamage(this.attackDamage);
        }
    }
    
    takeDamage(amount) {
        // Don't process damage if already dead
        if (!this.alive) return;
        
        this.hitPoints -= amount;
        
        // Check for death first
        if (this.hitPoints <= 0) {
            this.die();
            return;
        }
        
        // Apply stun
        this.isStunned = true;
        this.stunTimer = this.stunDuration;
        this.isTakingDamage = true;
        
        // Cancel any attack in progress
        if (this.isAttacking) {
            this.isAttacking = false;
            if (this.attackIndicator) {
                this.attackIndicator.clear();
            }
        }
        
        // Update animation to hit animation
        this.currentAnimation = null; // Force animation change
        this.updateAnimation();
        
        // Apply red tint
        if (this.animatedSprite) {
            this.animatedSprite.tint = 0xFF0000;
        } else if (this.baseSprite) {
            this.baseSprite.tint = 0xFF0000;
        }
        
        // Reset tint after a delay
        setTimeout(() => {
            if (this.alive) {
                if (this.animatedSprite) {
                    this.animatedSprite.tint = 0xFFFFFF;
                } else if (this.baseSprite) {
                    this.baseSprite.tint = 0xFFFFFF;
                }
            }
        }, 150);
    }
    
    update(deltaTime, player, world) {
        // Don't do any updates if dead
        if (!this.alive) return;
        
        // Process stun timer if active
        if (this.isStunned) {
            this.stunTimer -= deltaTime;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
                this.stunTimer = 0;
                
                // If attack was interrupted by damage, cancel it
                if (this.isAttacking) {
                    this.isAttacking = false;
                    if (this.attackIndicator) {
                        this.attackIndicator.clear();
                    }
                }
            }
            
            // Only update sprite position during stun
            this.sprite.position.set(this.position.x, this.position.y);
            return;
        }
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Don't move while attacking
        if (this.isAttacking) {
            // Update sprite position
            this.sprite.position.set(this.position.x, this.position.y);
            
            // Still allow animation updates even when attacking
            this.updateAnimation();
            return;
        }
        
        // Reset movement flag
        this.isMoving = false;
        
        // Basic AI behavior when not attacking
        if (!this.target) {
            // Check if player is in aggro range
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            if (distToPlayer < this.aggroRange) {
                this.target = player;
            } else {
                // Wander randomly
                if (Math.random() < 0.02) {
                    this.velocity.x = (Math.random() * 2 - 1) * this.moveSpeed;
                    this.velocity.y = (Math.random() * 2 - 1) * this.moveSpeed;
                    this.updateFacingFromVelocity();
                    this.isMoving = true;
                } else if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1) {
                    this.isMoving = true;
                }
            }
        }
        
        if (this.target) {
            // Move towards player
            const dx = this.target.position.x - this.position.x;
            const dy = this.target.position.y - this.position.y;
            const distToTarget = Math.sqrt(dx * dx + dy * dy);
            
            // Update facing direction based on direction to target
            // Calculate absolute values for comparison
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            
            // Update facing direction based on direction to target
            // Use thresholds to determine if angle is diagonal or cardinal
            if (absX > absY * 1.5) {
                // Primarily horizontal direction
                this.facing = dx > 0 ? 'right' : 'left';
            } else if (absY > absX * 1.5) {
                // Primarily vertical direction
                this.facing = dy > 0 ? 'down' : 'up';
            } else {
                // Diagonal direction
                if (dx > 0 && dy > 0) this.facing = 'down-right';
                else if (dx < 0 && dy > 0) this.facing = 'down-left';
                else if (dx > 0 && dy < 0) this.facing = 'up-right';
                else if (dx < 0 && dy < 0) this.facing = 'up-left';
            }
            
            if (distToTarget > this.attackRange) {
                // Move towards player
                const speed = this.moveSpeed / distToTarget;
                this.velocity.x = dx * speed;
                this.velocity.y = dy * speed;
                this.isMoving = true;
            } else {
                // In attack range, stop moving and attack
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.isMoving = false;
                
                // Attack if cooldown is ready
                if (this.attackCooldown <= 0 && !this.isAttacking) {
                    this.startAttack();
                }
            }
            
            // Lose target if player gets too far away
            if (distToTarget > this.aggroRange * 1.5) {
                this.target = null;
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.isMoving = false;
            }
        }
        
        // Update position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Update sprite position
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Update animation based on current state and facing direction
        this.updateAnimation();
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
    }
    
    die() {
        if (!this.alive) return;
        
        console.log(`Monster ${this.type} has been defeated!`);
        this.alive = false;
        
        // Cancel attack and clear indicators
        this.isAttacking = false;
        if (this.attackIndicator) {
            this.attackIndicator.clear();
        }
        
        if (this.spriteManager && this.spriteManager.loaded) {
            const deathAnimName = this.spriteManager.getMonsterAnimationForDirection(
                this.type, this.facing, 'die'
            );
            
            // Remove old sprite
            if (this.animatedSprite && this.animatedSprite.parent) {
                this.sprite.removeChild(this.animatedSprite);
            }
            
            // Create death animation sprite
            this.animatedSprite = this.spriteManager.createAnimatedSprite(deathAnimName);
            if (this.animatedSprite) {
                this.animatedSprite.loop = false;
                this.animatedSprite.play();
                
                // Apply red tint for death animation
                this.animatedSprite.tint = 0xff0000;
                
                // Clear tint after specified duration
                setTimeout(() => {
                    if (this.animatedSprite) {
                        this.animatedSprite.tint = 0xFFFFFF;
                    }
                }, 150);
                
                this.sprite.addChild(this.animatedSprite);
                
                // When animation completes, fade out
                this.animatedSprite.onComplete = () => {
                    const fadeOut = () => {
                        this.sprite.alpha -= 0.1;
                        if (this.sprite.alpha > 0) {
                            requestAnimationFrame(fadeOut);
                        } else if (this.sprite.parent) {
                            this.sprite.parent.removeChild(this.sprite);
                        }
                    };
                    fadeOut();
                };
                return;
            }
        }
        
        // Fallback: fade out with temporary red tint
        if (this.sprite) {
            this.sprite.tint = 0xff0000;
            setTimeout(() => {
                if (this.sprite) {
                    this.sprite.tint = 0xFFFFFF;
                }
            }, 150);
        }
        
        const fadeOut = () => {
            this.sprite.alpha -= 0.1;
            if (this.sprite.alpha > 0) {
                requestAnimationFrame(fadeOut);
            } else if (this.sprite.parent) {
                this.sprite.parent.removeChild(this.sprite);
            }
        };
        fadeOut();
    }
}