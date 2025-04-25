import * as PIXI from 'pixi.js';

export class Player {
    constructor(options) {
        this.position = { x: options.x, y: options.y };
        this.velocity = { x: 0, y: 0 };
        this.facing = 'down'; // down, up, left, right, down-left, down-right, up-left, up-right
        this.characterClass = options.class || 'bladedancer';
        this.hitPoints = this.getClassHitPoints();
        this.moveSpeed = this.getClassMoveSpeed();
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.currentAttackType = null;
        this.attackHitFrameReached = false;
        this.combatSystem = options.combatSystem;
        this.spriteManager = options.spriteManager;
        this.isMoving = false;
        this.movementDirection = null;
        this.lastFacing = this.facing;
        this.isDying = false;
        this.isDead = false;
        this.isTakingDamage = false;
    this.damageStunDuration = 0.25; // Configurable stun duration in seconds (default: 0.15s)
    this.damageStunTimer = 0;
        
        // Create animated sprite container
        this.sprite = new PIXI.Container();
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Initialize with a placeholder while we prepare the real sprites
        this.placeholder = new PIXI.Graphics();
        this.drawPlaceholder();
        this.sprite.addChild(this.placeholder);
        
        // Create animated sprite if spriteManager is available
        if (this.spriteManager && this.spriteManager.loaded) {
            this.setupAnimations();
        }
    }
    
    setupAnimations() {
        // Remove placeholder if it exists
        if (this.placeholder && this.placeholder.parent) {
            this.sprite.removeChild(this.placeholder);
            this.placeholder = null;
        }
        
        // Create idle animation for current facing direction
        const animationName = this.spriteManager.getAnimationForMovement(this.facing, null);
        this.currentAnimation = animationName;
        
        this.animatedSprite = this.spriteManager.createAnimatedSprite(animationName);
        if (this.animatedSprite) {
            this.animatedSprite.play();
            this.animatedSprite.anchor.set(0.5, 0.5); // Make sure this line exists
            this.sprite.addChild(this.animatedSprite);
            
            // Set up animation complete callback
            this.animatedSprite.onComplete = () => this.onAnimationComplete();
            
            // Set up frame change callback for attack hit detection
            this.animatedSprite.onFrameChange = this.onFrameChange.bind(this);
        }
    }
    
    onAnimationComplete() {
        // If we just finished an attack animation, return to idle
        if (this.isAttacking) {
            console.log("Attack animation completed");
            this.isAttacking = false;
            this.attackHitFrameReached = false; // Ensure this is reset
            this.currentAttackType = null;
            
            // Return to idle or movement animation
            this.updateAnimation();
        }
    }
    
    onFrameChange(currentFrame) {
        // Disable the frame-based hit detection entirely
        // We're using the setTimeout approach instead
    }
    
    executeAttackHit() {
        console.log(`Player attack hit on frame: ${this.currentAttackType}`);
        
        // Check for hits against monsters
        if (this.combatSystem) {
            this.combatSystem.checkAttackHits(
                this, 
                this.position, 
                this.currentAttackType, 
                window.game.systems.monsters.monsters
            );
        }
    }
    
    drawPlaceholder() {
        this.placeholder.clear();
        
        // Different colors for different classes
        let color;
        switch(this.characterClass) {
            case 'bladedancer': color = 0x3498db; break; // Blue
            case 'guardian': color = 0xe74c3c; break; // Red
            case 'hunter': color = 0x2ecc71; break; // Green
            case 'rogue': color = 0x9b59b6; break; // Purple
            default: color = 0xffffff;
        }
        
        // Draw character body
        this.placeholder.beginFill(color);
        this.placeholder.drawCircle(0, 0, 20);
        this.placeholder.endFill();
        
        // Draw facing direction indicator
        this.placeholder.beginFill(0xffffff);
        
        // Draw direction indicator based on facing
        switch(this.facing) {
            case 'down':
                this.placeholder.drawCircle(0, 15, 5);
                break;
            case 'up':
                this.placeholder.drawCircle(0, -15, 5);
                break;
            case 'left':
                this.placeholder.drawCircle(-15, 0, 5);
                break;
            case 'right':
                this.placeholder.drawCircle(15, 0, 5);
                break;
            case 'down-left':
                this.placeholder.drawCircle(-10, 10, 5);
                break;
            case 'down-right':
                this.placeholder.drawCircle(10, 10, 5);
                break;
            case 'up-left':
                this.placeholder.drawCircle(-10, -10, 5);
                break;
            case 'up-right':
                this.placeholder.drawCircle(10, -10, 5);
                break;
        }
        
        this.placeholder.endFill();
    }
    
    getClassHitPoints() {
        // According to class specifications
        switch(this.characterClass) {
            case 'bladedancer': return 10;
            case 'guardian': return 3;
            case 'hunter': return 1;
            case 'rogue': return 1;
            default: return 2;
        }
    }
    
    getClassMoveSpeed() {
        // According to class specifications
        switch(this.characterClass) {
            case 'bladedancer': return 5; // Fast
            case 'guardian': return 3; // Slow
            case 'hunter': return 4; // Medium
            case 'rogue': return 6; // Very Fast
            default: return 4;
        }
    }
    
    update(deltaTime, inputState) {
            // Process damage stun timer if active
    if (this.isTakingDamage) {
        this.damageStunTimer -= deltaTime;
        if (this.damageStunTimer <= 0) {
            this.isTakingDamage = false;
            this.damageStunTimer = 0;
            // Force animation update to return to normal animations
            this.currentAnimation = null;
            this.updateAnimation();
        }
        
        // Only update sprite position during stun
        this.sprite.position.set(this.position.x, this.position.y);
        return;
    }
        if (this.isDying || this.isDead) {
            // Only update sprite position
            this.sprite.position.set(this.position.x, this.position.y);
            return;
        }
        // Don't move if attacking
        if (!this.isAttacking) {
            // Process movement input
            this.velocity.x = 0;
            this.velocity.y = 0;
            
            // Track which directions are being pressed
            const up = inputState.up;
            const down = inputState.down;
            const left = inputState.left;
            const right = inputState.right;
            
            // Calculate base velocity components
            let vx = 0;
            let vy = 0;
            
            if (up) vy = -1;
            if (down) vy = 1;
            if (left) vx = -1;
            if (right) vx = 1;
            
            // Only normalize diagonal movement slightly (0.85 instead of 0.7071)
            // This makes diagonal movement closer to full speed
            if (vx !== 0 && vy !== 0) {
                const diagonalFactor = 0.85;
                vx *= diagonalFactor;
                vy *= diagonalFactor;
            }
            
            // Get angle between facing direction and movement direction
            const facingAngle = this.getFacingAngle();
            const movementAngle = vx !== 0 || vy !== 0 ? Math.atan2(vy, vx) : facingAngle;
            
            // Calculate angle difference (in radians)
            let angleDiff = Math.abs(facingAngle - movementAngle);
            // Normalize to be between 0 and π
            if (angleDiff > Math.PI) {
                angleDiff = 2 * Math.PI - angleDiff;
            }
            
            // Apply direction-based speed modifiers based on the angle difference
            let speedModifier = 1.0;
            
            if (angleDiff < Math.PI / 4) {
                // Moving forward (within 45 degrees of facing)
                speedModifier = 1.0;
            } else if (angleDiff > 3 * Math.PI / 4) {
                // Moving backward (more than 135 degrees from facing)
                speedModifier = 0.5;
            } else {
                // Strafing (between 45 and 135 degrees from facing)
                speedModifier = 0.7;
            }
            
            // Apply final velocity with modifier
            this.velocity.x = vx * this.moveSpeed * speedModifier;
            this.velocity.y = vy * this.moveSpeed * speedModifier;
            
            // Update isMoving flag and movement direction
            this.isMoving = (this.velocity.x !== 0 || this.velocity.y !== 0);
            
            if (this.isMoving) {
                this.updateMovementDirection();
            } else {
                this.movementDirection = null;
            }
            
            // Update position
            this.position.x = Math.round(this.position.x + this.velocity.x);
            this.position.y = Math.round(this.position.y + this.velocity.y);
            this.sprite.position.set(this.position.x, this.position.y);
        } else {
            // While attacking, still update sprite position
            this.sprite.position.set(this.position.x, this.position.y);
        }
        
        // Update facing direction based on mouse position if available
        if (inputState.mousePosition) {
            this.updateFacingFromMouse(inputState.mousePosition);
        }
        
        // Update animation if we're using sprites
        this.updateAnimation();
        
        // Handle attack input (only if not already attacking and cooldown is ready)
        if (!this.isAttacking && this.attackCooldown <= 0) {
            if (inputState.primaryAttack) {
                this.performPrimaryAttack();
            } else if (inputState.secondaryAttack) {
                this.performSecondaryAttack();
            }
        }
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
    }
    
    // Add this helper method to the Player class
    getFacingAngle() {
        switch (this.facing) {
            case 'right': return 0;
            case 'down-right': return Math.PI / 4;
            case 'down': return Math.PI / 2;
            case 'down-left': return 3 * Math.PI / 4;
            case 'left': return Math.PI;
            case 'up-left': return 5 * Math.PI / 4;
            case 'up': return 3 * Math.PI / 2;
            case 'up-right': return 7 * Math.PI / 4;
            default: return 0;
        }
    }
    
    updateMovementDirection() {
        // Calculate movement direction based on velocity
        if (this.velocity.y < 0 && this.velocity.x === 0) this.movementDirection = 'up';
        else if (this.velocity.y > 0 && this.velocity.x === 0) this.movementDirection = 'down';
        else if (this.velocity.x < 0 && this.velocity.y === 0) this.movementDirection = 'left';
        else if (this.velocity.x > 0 && this.velocity.y === 0) this.movementDirection = 'right';
        else if (this.velocity.x < 0 && this.velocity.y < 0) this.movementDirection = 'up-left';
        else if (this.velocity.x > 0 && this.velocity.y < 0) this.movementDirection = 'up-right';
        else if (this.velocity.x < 0 && this.velocity.y > 0) this.movementDirection = 'down-left';
        else if (this.velocity.x > 0 && this.velocity.y > 0) this.movementDirection = 'down-right';
    }
    
    updateAnimation() {
        if (this.spriteManager && this.spriteManager.loaded) {
            if (!this.animatedSprite) {
                this.setupAnimations();
                return;
            }
                    // If dying, don't change animation
        if (this.isDying) {
            return;
        }
                // If taking damage or dying, don't change animation
                if (this.isTakingDamage || this.isDying) {
                    return;
                }
            
            // If attacking, don't change animation
            if (this.isAttacking) {
                return;
            }
            
            // Determine if we need to change animation (either from movement or facing change)
            const facingChanged = this.facing !== this.lastFacing;
            
            // Get appropriate animation based on state
            const animationName = this.spriteManager.getAnimationForMovement(this.facing, this.movementDirection);
            
            if (animationName && (facingChanged || this.currentAnimation !== animationName)) {
                this.currentAnimation = animationName;
                
                // Remove old sprite and create new one
                if (this.animatedSprite && this.animatedSprite.parent) {
                    this.sprite.removeChild(this.animatedSprite);
                }
                
                this.animatedSprite = this.spriteManager.createAnimatedSprite(animationName);
                if (this.animatedSprite) {
                    this.animatedSprite.play();
                    this.sprite.addChild(this.animatedSprite);
                    
                    // Set up animation complete callback
                    this.animatedSprite.onComplete = () => this.onAnimationComplete();
                    
                    // Set up frame change callback for attack hit detection
                    this.animatedSprite.onFrameChange = this.onFrameChange.bind(this);
                }
            }
            
            // Remember the current facing direction for next frame
            this.lastFacing = this.facing;
        } else if (this.placeholder) {
            // Update placeholder if we don't have sprites yet
            this.drawPlaceholder();
        }
    }
    
    updateFacingFromMouse(mousePosition) {
        // Calculate angle to mouse cursor relative to camera
        const dx = mousePosition.x - window.innerWidth / 2;
        const dy = mousePosition.y - window.innerHeight / 2;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Convert angle to 8-direction facing
        if (angle >= -22.5 && angle < 22.5) this.facing = 'right';
        else if (angle >= 22.5 && angle < 67.5) this.facing = 'down-right';
        else if (angle >= 67.5 && angle < 112.5) this.facing = 'down';
        else if (angle >= 112.5 && angle < 157.5) this.facing = 'down-left';
        else if (angle >= 157.5 || angle < -157.5) this.facing = 'left';
        else if (angle >= -157.5 && angle < -112.5) this.facing = 'up-left';
        else if (angle >= -112.5 && angle < -67.5) this.facing = 'up';
        else if (angle >= -67.5 && angle < -22.5) this.facing = 'up-right';
    }
    
    performPrimaryAttack() {
        console.log("Primary attack (forehand slash) started");
        this.isAttacking = true;
        this.attackHitFrameReached = false;
        this.currentAttackType = 'primary';
        
        // Get the attack animation name based on facing direction
        const attackAnimName = this.spriteManager.getAttackAnimation(this.facing, 'primary');
        this.currentAnimation = attackAnimName;
        
        // Remove old sprite and create new attack animation
        if (this.animatedSprite && this.animatedSprite.parent) {
            this.sprite.removeChild(this.animatedSprite);
        }
        
        this.animatedSprite = this.spriteManager.createAnimatedSprite(attackAnimName);
        if (this.animatedSprite) {
            // Don't loop the attack animation
            this.animatedSprite.loop = false;
            this.animatedSprite.play();
            this.sprite.addChild(this.animatedSprite);
            
            // Set up animation complete callback
            this.animatedSprite.onComplete = () => this.onAnimationComplete();
        }
        
        // Calculate delay for attack hit effect (approximately 8 frames at 60fps)
        const hitDelay = 20 * (1000 / 60); // ~133ms for primary attack
        
        // Schedule the hit effect and damage after the delay
        setTimeout(() => {
            if (this.isAttacking && this.currentAttackType === 'primary') {
                console.log("Primary attack hit effect triggered");
                
                // Create attack visualization
                if (this.combatSystem) {
                    this.combatSystem.createAttackAnimation(this, 'primary');
                }
                
                // Execute the attack hit
                this.executeAttackHit();
            }
        }, hitDelay);
        
        // Set cooldown (will be applied after animation completes)
        this.attackCooldown = 0.5; // 500ms cooldown
    }
    
    performSecondaryAttack() {
        console.log("Secondary attack (overhead smash) started");
        this.isAttacking = true;
        this.attackHitFrameReached = false;
        this.currentAttackType = 'secondary';
        
        // Get the attack animation name based on facing direction
        const attackAnimName = this.spriteManager.getAttackAnimation(this.facing, 'secondary');
        this.currentAnimation = attackAnimName;
        
        // Remove old sprite and create new attack animation
        if (this.animatedSprite && this.animatedSprite.parent) {
            this.sprite.removeChild(this.animatedSprite);
        }
        
        this.animatedSprite = this.spriteManager.createAnimatedSprite(attackAnimName);
        if (this.animatedSprite) {
            // Don't loop the attack animation
            this.animatedSprite.loop = false;
            this.animatedSprite.play();
            this.sprite.addChild(this.animatedSprite);
            
            // Set up animation complete callback
            this.animatedSprite.onComplete = () => this.onAnimationComplete();
        }
        
        // Calculate delay for attack hit effect (approximately 12 frames at 60fps)
        const hitDelay = 30 * (1000 / 60); // ~200ms for secondary attack
        
        // Schedule the hit effect and damage after the delay
        setTimeout(() => {
            if (this.isAttacking && this.currentAttackType === 'secondary') {
                console.log("Secondary attack hit effect triggered");
                
                // Create attack visualization
                if (this.combatSystem) {
                    this.combatSystem.createAttackAnimation(this, 'secondary');
                }
                
                // Execute the attack hit
                this.executeAttackHit();
            }
        }, hitDelay);
        
        // Set cooldown (will be applied after animation completes)
        this.attackCooldown = 0.8; // 800ms cooldown (longer for the heavier attack)
    }
    
    takeDamage(amount) {
        console.log(`Player took ${amount} damage!`);
        this.hitPoints -= amount;
        
        // Don't play take damage animation if already dead or dying
        if (this.hitPoints <= 0 || this.isDying || this.isDead) {
            if (this.hitPoints <= 0) {
                this.die();
            }
            return;
        }
        
        // Start take damage stun and animation
        this.isTakingDamage = true;
        this.damageStunTimer = this.damageStunDuration;
        
        // Play take damage animation
        if (this.spriteManager && this.spriteManager.loaded) {
            // Get take damage animation for current facing direction
            const damageAnimName = `knight_take_damage_${this.getFacingAnimationKey()}`;
            this.currentAnimation = damageAnimName;
            
            // Remove old sprite and create new take damage animation
            if (this.animatedSprite && this.animatedSprite.parent) {
                this.sprite.removeChild(this.animatedSprite);
            }
            
            this.animatedSprite = this.spriteManager.createAnimatedSprite(damageAnimName);
            if (this.animatedSprite) {
                // Don't loop the take damage animation
                this.animatedSprite.loop = false;
                this.animatedSprite.play();
                this.sprite.addChild(this.animatedSprite);
                
                // Also apply the red tint for visual clarity
                this.animatedSprite.tint = 0xFF0000;
                
                // Set up animation complete callback
                this.animatedSprite.onComplete = () => {
                    // Reset tint after animation completes
                    if (this.animatedSprite) {
                        this.animatedSprite.tint = 0xFFFFFF;
                    }
                    
                    // If the stun duration is longer than the animation,
                    // let the stun timer handle the state reset
                    if (this.damageStunTimer <= 0) {
                        this.isTakingDamage = false;
                        // Force animation update
                        this.currentAnimation = null;
                        this.updateAnimation();
                    }
                };
            }
        } else {
            // Fallback to just the flash effect if no sprite manager
            if (this.animatedSprite) {
                this.animatedSprite.tint = 0xFF0000;
                setTimeout(() => {
                    if (this.animatedSprite) {
                        this.animatedSprite.tint = 0xFFFFFF;
                    }
                }, 200);
            }
        }
    }
    die() {
        console.log("Player died!");
        this.isDying = true;
        this.isDead = true;
        
        // Play death animation
        if (this.spriteManager && this.spriteManager.loaded) {
            // Get death animation for current facing direction
            const deathAnimName = `knight_die_${this.getFacingAnimationKey()}`;
            this.currentAnimation = deathAnimName;
            
            // Remove old sprite and create new death animation
            if (this.animatedSprite && this.animatedSprite.parent) {
                this.sprite.removeChild(this.animatedSprite);
            }
            
            this.animatedSprite = this.spriteManager.createAnimatedSprite(deathAnimName);
            if (this.animatedSprite) {
                // Don't loop the death animation
                this.animatedSprite.loop = false;
                this.animatedSprite.play();
                this.sprite.addChild(this.animatedSprite);
                
                // Set up animation complete callback for respawn
                this.animatedSprite.onComplete = () => this.respawn();
            }
        } else {
            // If no sprite manager, just respawn immediately
            this.respawn();
        }
    }
    respawn() {
        console.log("Player respawning!");
        
        // Reset health
        this.hitPoints = this.getClassHitPoints();
        
        // Reset position to center of map
        this.position.x = window.game.systems.world.width / 2 * window.game.systems.world.tileSize;
        this.position.y = window.game.systems.world.height / 2 * window.game.systems.world.tileSize;
        
        // Reset state
        this.isDying = false;
        this.isDead = false;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.currentAttackType = null;
        this.attackHitFrameReached = false;
        
        // Reset animation to idle
        this.currentAnimation = null; // Force animation change
        this.updateAnimation();
    }
    // Helper to convert facing direction to animation key
getFacingAnimationKey() {
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
    
    return directionMap[this.facing] || 's'; // Default to south
}
}