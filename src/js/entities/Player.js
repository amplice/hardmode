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
        this.combatSystem = options.combatSystem;
        
        // Create a temporary sprite (would be replaced with actual character sprites)
        this.sprite = new PIXI.Graphics();
        this.drawCharacter();
        this.sprite.position.set(this.position.x, this.position.y);
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
    
    drawCharacter() {
        this.sprite.clear();
        
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
        this.sprite.beginFill(color);
        this.sprite.drawCircle(0, 0, 20);
        this.sprite.endFill();
        
        // Draw facing direction indicator
        this.sprite.beginFill(0xffffff);
        
        // Draw direction indicator based on facing
        switch(this.facing) {
            case 'down':
                this.sprite.drawCircle(0, 15, 5);
                break;
            case 'up':
                this.sprite.drawCircle(0, -15, 5);
                break;
            case 'left':
                this.sprite.drawCircle(-15, 0, 5);
                break;
            case 'right':
                this.sprite.drawCircle(15, 0, 5);
                break;
            case 'down-left':
                this.sprite.drawCircle(-10, 10, 5);
                break;
            case 'down-right':
                this.sprite.drawCircle(10, 10, 5);
                break;
            case 'up-left':
                this.sprite.drawCircle(-10, -10, 5);
                break;
            case 'up-right':
                this.sprite.drawCircle(10, -10, 5);
                break;
        }
        
        this.sprite.endFill();
    }
    
    update(deltaTime, inputState) {
        // Process movement input
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        if (inputState.up) this.velocity.y = -this.moveSpeed;
        if (inputState.down) this.velocity.y = this.moveSpeed;
        if (inputState.left) this.velocity.x = -this.moveSpeed;
        if (inputState.right) this.velocity.x = this.moveSpeed;
        
        // Update position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Update facing direction based on mouse position if available
        if (inputState.mousePosition) {
            this.updateFacingFromMouse(inputState.mousePosition);
        } else {
            this.updateFacingDirection();
        }
        
        // Handle attack input
        if (inputState.primaryAttack && !this.isAttacking && this.attackCooldown <= 0) {
            this.performPrimaryAttack();
        }
        
        if (inputState.secondaryAttack && !this.isAttacking && this.attackCooldown <= 0) {
            this.performSecondaryAttack();
        }
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
    }
    
    updateFacingDirection() {
        if (this.velocity.x === 0 && this.velocity.y === 0) return;
        
        // 8-directional movement
        if (this.velocity.y < 0 && this.velocity.x === 0) this.facing = 'up';
        else if (this.velocity.y > 0 && this.velocity.x === 0) this.facing = 'down';
        else if (this.velocity.x < 0 && this.velocity.y === 0) this.facing = 'left';
        else if (this.velocity.x > 0 && this.velocity.y === 0) this.facing = 'right';
        else if (this.velocity.x < 0 && this.velocity.y < 0) this.facing = 'up-left';
        else if (this.velocity.x > 0 && this.velocity.y < 0) this.facing = 'up-right';
        else if (this.velocity.x < 0 && this.velocity.y > 0) this.facing = 'down-left';
        else if (this.velocity.x > 0 && this.velocity.y > 0) this.facing = 'down-right';
        
        this.drawCharacter();
    }
    
    updateFacingFromMouse(mousePosition) {
        // Calculate angle to mouse cursor
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
        
        this.drawCharacter();
    }
    
    performPrimaryAttack() {
        console.log("Primary attack performed");
        this.isAttacking = true;
        
        // Trigger combat system to create attack animation
        if (this.combatSystem) {
            this.combatSystem.createAttackAnimation(this, 'primary');
        }
        
        // For Bladedancer: Horizontal Slash (120° arc, medium range, 300ms)
        setTimeout(() => {
            this.isAttacking = false;
            this.attackCooldown = 0.5; // 500ms cooldown
        }, 300);
    }
    
    performSecondaryAttack() {
        console.log("Secondary attack performed");
        this.isAttacking = true;
        
        // Trigger combat system to create attack animation
        if (this.combatSystem) {
            this.combatSystem.createAttackAnimation(this, 'secondary');
        }
        
        // For Bladedancer: Thrust (30° arc, long range, 200ms)
        setTimeout(() => {
            this.isAttacking = false;
            this.attackCooldown = 0.4; // 400ms cooldown
        }, 200);
    }
}