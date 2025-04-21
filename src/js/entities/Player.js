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
            this.isAttacking = false;
            this.attackHitFrameReached = false;
            this.currentAttackType = null;
            
            // Return to idle or movement animation
            this.updateAnimation();
        }
    }
    
    onFrameChange(currentFrame) {
        // Check if this is the hit frame for an attack animation
        if (this.isAttacking && !this.attackHitFrameReached) {
            const attackAnim = this.spriteManager.getAttackAnimation(this.facing, this.currentAttackType);
            const hitFrame = this.spriteManager.getAttackHitFrame(attackAnim);
            
            if (currentFrame === hitFrame) {
                console.log(`Hit frame reached: ${currentFrame}`);
                this.attackHitFrameReached = true;
                
                // Create attack visualization at the hit frame
                if (this.combatSystem) {
                    this.combatSystem.createAttackAnimation(this, this.currentAttackType);
                }
                
                // Execute the attack hit
                this.executeAttackHit();
            }
        }
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
            case 'bladedancer': return 2;
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
        // Don't move if attacking
        if (!this.isAttacking) {
            // Process movement input
            this.velocity.x = 0;
            this.velocity.y = 0;
            
            if (inputState.up) this.velocity.y = -this.moveSpeed;
            if (inputState.down) this.velocity.y = this.moveSpeed;
            if (inputState.left) this.velocity.x = -this.moveSpeed;
            if (inputState.right) this.velocity.x = this.moveSpeed;
            
            // Update isMoving flag and movement direction
            this.isMoving = (this.velocity.x !== 0 || this.velocity.y !== 0);
            
            if (this.isMoving) {
                this.updateMovementDirection();
            } else {
                this.movementDirection = null;
            }
            
            // Update position
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
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
            
            // Set up callbacks
            this.animatedSprite.onComplete = () => this.onAnimationComplete();
            this.animatedSprite.onFrameChange = this.onFrameChange.bind(this);
        }
        
        // Don't create visual effect yet - it will be created at the hit frame
        
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
            
            // Set up callbacks
            this.animatedSprite.onComplete = () => this.onAnimationComplete();
            this.animatedSprite.onFrameChange = this.onFrameChange.bind(this);
        }
        
        // Don't create visual effect yet - it will be created at the hit frame
        
        // Set cooldown (will be applied after animation completes)
        this.attackCooldown = 0.8; // 800ms cooldown (longer for the heavier attack)
    }
    
    takeDamage(amount) {
        console.log(`Player took ${amount} damage!`);
        this.hitPoints -= amount;
        
        // Make player flash red
        if (this.animatedSprite) {
            this.animatedSprite.tint = 0xFF0000;
            setTimeout(() => {
                this.animatedSprite.tint = 0xFFFFFF;
            }, 200);
        }
        
        if (this.hitPoints <= 0) {
            this.die();
        }
    }
    
    die() {
        console.log("Player died!");
        // In a real game, we would handle game over here
        // For now, just respawn the player
        this.hitPoints = this.getClassHitPoints();
        this.position.x = window.game.systems.world.width / 2 * window.game.systems.world.tileSize;
        this.position.y = window.game.systems.world.height / 2 * window.game.systems.world.tileSize;
    }
}