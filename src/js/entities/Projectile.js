import * as PIXI from 'pixi.js';
import { generateId } from '../utils/IdGenerator.js';

export class Projectile {
    constructor(options) {
        this.id = options.id || generateId('projectile');
        this.position = { x: options.x, y: options.y };
        this.velocity = { x: options.velocityX, y: options.velocityY };
        this.speed = options.speed || 600;
        this.owner = options.owner;
        this.damage = options.damage || 1;
        this.range = options.range || 400;
        this.distanceTraveled = 0;
        this.active = true;
        
        // Create sprite container
        this.sprite = new PIXI.Container();
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Create visual representation (simple arrow for now)
        this.visual = new PIXI.Graphics();
        this.visual.beginFill(0xFFFFFF,0.05);
        this.visual.drawRect(-5, -15, 10, 30); // 10x30 hitbox
        this.visual.endFill();
        this.sprite.addChild(this.visual);
        
        // Visual effect sprite
        this.effectSprite = null;
        
        // Set rotation based on velocity
        this.updateRotation();
    }
    
    // Add method to attach visual effect
    attachVisualEffect(effectSprite) {
        this.effectSprite = effectSprite;
        this.sprite.addChild(this.effectSprite);
        
        // Center the effect on the projectile
        this.effectSprite.position.set(0, 0);
            // Reset the effect's rotation (important!)
    // This prevents it from inheriting the container's rotation
    this.effectSprite.rotation = Math.PI; // Face sprite in the direction of travel
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // Move projectile
        const moveDistance = this.speed * deltaTime;
        this.position.x += this.velocity.x * moveDistance;
        this.position.y += this.velocity.y * moveDistance;
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Update the effect animation if it exists
        if (this.effectSprite) {
            // Make sure the animation continues to play
            if (!this.effectSprite.playing) {
                this.effectSprite.play();
            }
        }
        
        // Track distance traveled
        this.distanceTraveled += moveDistance;
        
        // Check if projectile has traveled its maximum range
        if (this.distanceTraveled >= this.range) {
            this.deactivate();
        }
    }
    
    updateRotation() {
        // Calculate angle from velocity
        const angle = Math.atan2(this.velocity.y, this.velocity.x);
        
        // Set container rotation (for the arrow hitbox)
        this.sprite.rotation = angle;
        
        // If we have an effect sprite, keep it oriented correctly as we move
        if (this.effectSprite) {
            // Since sprite naturally faces left, we need to fix its rotation
            // to face in the direction of travel regardless of container rotation
            this.effectSprite.rotation = Math.PI; // This orients the sprite in the direction of travel
        }
    }
    
    deactivate() {
        this.active = false;
        // Remove from stage if it has a parent
        if (this.sprite.parent) {
            this.sprite.parent.removeChild(this.sprite);
        }
    }
    
    checkCollision(entity) {
        if (!this.active || !entity.alive || entity === this.owner) return false;
        
        // Simple circular collision
        const dx = entity.position.x - this.position.x;
        const dy = entity.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Use the monster's collision radius if available
        const targetRadius = entity.collisionRadius || 20;
        
        return distance < targetRadius;
    }
}