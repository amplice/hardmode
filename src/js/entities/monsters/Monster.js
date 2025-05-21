// src/js/entities/monsters/Monster.js
import * as PIXI from 'pixi.js';
import { MONSTER_CONFIG } from '../../config/GameConfig.js';
import { 
    velocityToDirectionString, 
    directionStringToAngleRadians 
} from '../../utils/DirectionUtils.js';

export class Monster {
    constructor(options) {
        // Basic properties
        this.position = { x: options.x, y: options.y };
        this.velocity = { x: 0, y: 0 };
        this.type = options.type || 'skeleton';
        this.facing = 'down';
        this.alive = true;
        
        // Get stats from config
        const stats = MONSTER_CONFIG.stats[this.type];
        this.hitPoints = stats.hitPoints;
        this.moveSpeed = stats.moveSpeed;
        this.attackRange = stats.attackRange;
        this.collisionRadius = stats.collisionRadius;
        this.aggroRange = stats.aggroRange;
        
        // State management
        this.state = 'idle'; // idle, walking, attacking, stunned, dying
        this.previousState = 'idle'; // Used for state transitions
        this.target = null;
        this.attackCooldown = 0;
        
        // Animation state
        this.currentAnimation = null;
        
        // Create sprite container
        this.sprite = new PIXI.Container();
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Get sprite manager
        this.spriteManager = window.game.systems.sprites;
        
        // Create attack indicator
        this.attackIndicator = new PIXI.Graphics();
        this.sprite.addChild(this.attackIndicator);
        
        // Initialize animation
        this.setupAnimation();
    }
    
    setupAnimation() {
        if (!this.spriteManager || !this.spriteManager.loaded) return;
        
        // Get initial animation based on state
        const animName = this.getAnimationName();
        this.currentAnimation = animName;
        
        // Create animated sprite
        this.animatedSprite = this.spriteManager.createAnimatedSprite(animName);
        
        if (this.animatedSprite) {
            this.animatedSprite.play();
            this.animatedSprite.anchor.set(0.5, 0.5);
            this.sprite.addChild(this.animatedSprite);
            
            // Set up animation complete callback
            this.animatedSprite.onComplete = () => this.onAnimationComplete();
        }
    }
    
    getAnimationName() {
        // Convert state to animation name
        let animState;
        
        switch (this.state) {
            case 'walking':
                animState = 'walk';
                break;
            case 'attacking':
                animState = 'attack1';
                break;
            case 'stunned':
                animState = 'hit';
                break;
            case 'dying':
                animState = 'die';
                break;
            case 'idle':
            default:
                animState = 'idle';
                break;
        }
        
        return this.spriteManager.getMonsterAnimationForDirection(this.type, this.facing, animState);
    }
    
    updateAnimation() {
        if (!this.spriteManager || !this.spriteManager.loaded) return;
        
        // Get animation name based on current state
        const animName = this.getAnimationName();
        
        // Only update if animation changed
        if (this.currentAnimation !== animName) {
            this.currentAnimation = animName;
            
            // Remove old sprite
            if (this.animatedSprite && this.animatedSprite.parent) {
                this.sprite.removeChild(this.animatedSprite);
            }
            
            // Create new sprite with current animation
            this.animatedSprite = this.spriteManager.createAnimatedSprite(animName);
            
            if (this.animatedSprite) {
                // Configure loop based on animation type
                const nonLoopingStates = ['attacking', 'stunned', 'dying'];
                this.animatedSprite.loop = !nonLoopingStates.includes(this.state);
                
                this.animatedSprite.play();
                this.animatedSprite.anchor.set(0.5, 0.5);
                this.sprite.addChild(this.animatedSprite);
                
                // Apply red tint for damage
                if (this.state === 'stunned') {
                    this.animatedSprite.tint = 0xFF0000;
                } else {
                    this.animatedSprite.tint = 0xFFFFFF;
                }
                
                // Set animation complete callback
                this.animatedSprite.onComplete = () => this.onAnimationComplete();
            }
        }
    }
    
    onAnimationComplete() {
        // Handle animation completion based on state
        switch (this.state) {
            case 'stunned':
                // Always transition to idle first after being stunned
                this.changeState('idle');
                break;
                
            case 'attacking':
                // Return to idle after attack
                this.changeState('idle');
                // Clear attack indicator
                this.attackIndicator.clear();
                // Set cooldown
                const attackDetails = MONSTER_CONFIG.attacks[this.type];
                this.attackCooldown = attackDetails.cooldown;
                break;
                
            case 'dying':
                // Start fade out after death animation
                this.startFadeOut();
                break;
        }
    }
    
    changeState(newState) {
        // Store previous state
        this.previousState = this.state;
        // Set new state
        this.state = newState;
        // Force animation update
        this.updateAnimation();
    }
    
    startFadeOut() {
        // Fade out the sprite gradually
        const fadeStep = () => {
            this.sprite.alpha -= 0.05;
            if (this.sprite.alpha > 0) {
                requestAnimationFrame(fadeStep);
            } else if (this.sprite.parent) {
                this.sprite.parent.removeChild(this.sprite);
            }
        };
        
        fadeStep();
    }
    
    updateFacing() {
        // If moving, update facing based on velocity
        const newFacing = velocityToDirectionString(this.velocity.x, this.velocity.y);
        if (newFacing) {
            this.facing = newFacing;
        }
    }
    
    // Updates facing direction to point toward target
    updateFacingToTarget() {
        if (!this.target) return;
        
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        
        const newFacing = velocityToDirectionString(dx, dy);
        if (newFacing) {
            this.facing = newFacing;
        }
    }
    
    takeDamage(amount) {
        // Don't process damage if already dead
        if (!this.alive) return;
        
        this.hitPoints -= amount;
        
        // Check for death
        if (this.hitPoints <= 0) {
            this.die();
            return;
        }
        
        // Cancel any attack in progress
        if (this.attackIndicator) {
            this.attackIndicator.clear();
        }
        
        // Apply stun - always changes to stunned state regardless of current state
        this.changeState('stunned');
        this.velocity = { x: 0, y: 0 }; // Stop movement
    }
    
    die() {
        if (!this.alive) return;
        
        console.log(`Monster ${this.type} has been defeated!`);
        this.alive = false;
        this.changeState('dying');
        this.velocity = { x: 0, y: 0 };
        
        // Clear attack indicator
        if (this.attackIndicator) {
            this.attackIndicator.clear();
        }
    }
    
    update(deltaTime, player, world) {
        // Don't do any updates if dead
        if (!this.alive) return;
        
        // Only update sprite position during stun
        if (this.state === 'stunned') {
            this.sprite.position.set(this.position.x, this.position.y);
            return;
        }
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Don't move while attacking
        if (this.state === 'attacking') {
            // Update sprite position
            this.sprite.position.set(this.position.x, this.position.y);
            return;
        }
        
        // AI state machine
        this.updateAI(deltaTime, player);
        
        // Apply movement
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Update sprite position
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Update animation based on current state if needed
        this.updateAnimation();
    }
    
    updateAI(deltaTime, player) {
        // Check if we need to acquire a target
        if (!this.target) {
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            if (distToPlayer < this.aggroRange) {
                this.target = player;
                this.changeState('walking');
            } else {
                // Random wandering behavior
                if (Math.random() < 0.02) {
                    this.velocity.x = (Math.random() * 2 - 1) * this.moveSpeed * 0.5;
                    this.velocity.y = (Math.random() * 2 - 1) * this.moveSpeed * 0.5;
                    this.updateFacing();
                    this.changeState('walking');
                } else if (this.state === 'walking' && Math.random() < 0.05) {
                    // Sometimes stop wandering
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                    this.changeState('idle');
                }
            }
        }
        
        // Target handling logic
        if (this.target) {
            const dx = this.target.position.x - this.position.x;
            const dy = this.target.position.y - this.position.y;
            const distToTarget = Math.sqrt(dx * dx + dy * dy);
            
            // Update facing toward target
            this.updateFacingToTarget();
            
            if (distToTarget > this.attackRange) {
                // Move towards target
                const moveSpeed = this.moveSpeed / distToTarget;
                this.velocity.x = dx * moveSpeed;
                this.velocity.y = dy * moveSpeed;
                
                // Only change to walking if we're currently idle
                if (this.state === 'idle') {
                    this.changeState('walking');
                }
            } else {
                // In attack range, stop and attack
                this.velocity.x = 0;
                this.velocity.y = 0;
                
                // Attack if cooldown is ready and not already attacking
                if (this.attackCooldown <= 0 && this.state !== 'attacking') {
                    this.startAttack();
                }
            }
            
            // Lose target if they get too far away
            if (distToTarget > this.aggroRange * 1.5) {
                this.target = null;
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.changeState('idle');
            }
        }
    }
    
    startAttack() {
        // Set attack state
        this.changeState('attacking');
        this.velocity = { x: 0, y: 0 };
        
        // Get attack details
        const attackDetails = MONSTER_CONFIG.attacks[this.type];
        
        // Show attack windup indicator
        this.showAttackIndicator(true);
        
        // Schedule actual attack after windup
        setTimeout(() => {
            if (this.state !== 'attacking' || !this.alive) return;
            
            // Show active attack indicator
            this.showAttackIndicator(false, true);
            
            // Execute the attack
            this.executeAttack();
            
            // Attack animation and cooldown will be handled in onAnimationComplete
        }, attackDetails.windup * 1000);
    }
    
    showAttackIndicator(isWindup = false, isActive = false) {
        this.attackIndicator.clear();
        
        if (!isWindup && !isActive) return;
        
        const attackDetails = MONSTER_CONFIG.attacks[this.type];
        const range = this.attackRange;
        
        // Different visual for windup vs active attack
        const alpha = isWindup ? 0.3 : 0.7;
        const color = isActive ? 0xFF0000 : attackDetails.color;
        
        // Draw based on attack pattern
        this.attackIndicator.rotation = 0;
        this.attackIndicator.beginFill(color, alpha);
        
        switch (attackDetails.pattern) {
            case 'circle':
                this.attackIndicator.drawCircle(0, 0, range);
                break;
                
            case 'cone':
                // Draw cone with 90 degree angle
                const coneAngle = Math.PI / 2;
                const startAngle = -coneAngle / 2;
                const endAngle = coneAngle / 2;
                
                this.attackIndicator.moveTo(0, 0);
                this.attackIndicator.arc(0, 0, range, startAngle, endAngle);
                this.attackIndicator.lineTo(0, 0);
                
                // Rotate to match facing direction
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
                
                this.attackIndicator.rotation = directionStringToAngleRadians(this.facing);
                break;
        }
        
        this.attackIndicator.endFill();
    }
    
    executeAttack() {
        if (!this.target || !this.alive) return;
        
        const attackDetails = MONSTER_CONFIG.attacks[this.type];
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
                    // Get angle to target
                    let angle = Math.atan2(dy, dx); // This is radians
                    
                    // Get facing angle in radians using the utility function
                    let facingAngle = directionStringToAngleRadians(this.facing);
                    
                    // Calculate angle difference (normalized to smallest angle)
                    let angleDiff = Math.abs(angle - facingAngle);
                    while (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                    
                    // Check if target is within cone (45 degrees on each side)
                    const coneHalfAngle = Math.PI / 4;
                    hit = (angleDiff <= coneHalfAngle);
                    break;
            }
        }
        
        // Apply damage if hit
        if (hit && this.target.takeDamage) {
            this.target.takeDamage(attackDetails.damage);
        }
    }
}