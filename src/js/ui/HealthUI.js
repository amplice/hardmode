// src/js/ui/HealthUI.js

import * as PIXI from 'pixi.js';

export class HealthUI {
    constructor(player) {
        this.player = player;
        this.container = new PIXI.Container();
        this.container.position.set(20, 20); // Position in the top-left corner
        
        // Fixed position on screen (not affected by camera)
        this.container.zIndex = 100;
        
        this.createHealthDisplay();
    }
    
    createHealthDisplay() {
        // Container for heart indicators
        this.hearts = new PIXI.Container();
        this.heartSprites = [];
        
        // Add hearts container to main container
        this.container.addChild(this.hearts);
        
        // Initial update
        this.update();
    }
    
    update() {
        const maxHealth = this.player.getClassHitPoints();
        const currentHealth = this.player.hitPoints;
        
        // Update hearts
        this.updateHearts(currentHealth, maxHealth);
    }
    
    updateHearts(current, max) {
        // Clear previous hearts
        this.hearts.removeChildren();
        this.heartSprites = [];
        
        // Create heart circles
        for (let i = 0; i < max; i++) {
            const heart = new PIXI.Graphics();
            
            // Full heart or empty heart
            if (i < current) {
                heart.beginFill(0xE73C3C); // Red for full heart
            } else {
                heart.beginFill(0x666666); // Gray for empty heart
            }
            
            // Draw heart circle
            heart.drawCircle(0, 0, 8);
            heart.endFill();
            
            // Position heart
            heart.position.set(10 + i * 25, 10);
            
            this.hearts.addChild(heart);
            this.heartSprites.push(heart);
        }
    }
}