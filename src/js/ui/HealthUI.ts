/**
 * @fileoverview HealthUI - Client-side health display component
 * 
 * MIGRATION NOTES:
 * - Converted from HealthUI.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for UI components
 * - Preserved all health display and update logic
 * 
 * ARCHITECTURE ROLE:
 * - Displays player health using visual heart indicators
 * - Updates dynamically based on player state changes
 * - Fixed screen position (UI layer, not affected by camera)
 * - Provides visual feedback for damage and healing
 * 
 * VISUAL DESIGN:
 * - Red filled circles for current health
 * - Gray empty circles for lost health
 * - Positioned in top-left corner of screen
 * - Number of hearts based on character class max HP
 */

import * as PIXI from 'pixi.js';

// Type definitions
interface PlayerInterface {
    hitPoints: number;
    armorHP?: number; // Green HP from armor powerups
    getClassHitPoints(): number;
}

export class HealthUI {
    private player: PlayerInterface;
    public container: PIXI.Container;
    private hearts: PIXI.Container;
    private heartSprites: PIXI.Graphics[];

    constructor(player: PlayerInterface) {
        this.player = player;
        this.container = new PIXI.Container();
        this.container.position.set(20, 20); // Position in the top-left corner
        
        // Fixed position on screen (not affected by camera)
        this.container.zIndex = 100;
        
        this.hearts = new PIXI.Container();
        this.heartSprites = [];
        
        this.createHealthDisplay();
    }
    
    private createHealthDisplay(): void {
        // Add hearts container to main container
        this.container.addChild(this.hearts);
        
        // Initial update
        this.update();
    }
    
    update(): void {
        const maxHealth = this.player.getClassHitPoints();
        const currentHealth = this.player.hitPoints;
        
        // Update hearts
        this.updateHearts(currentHealth, maxHealth);
    }
    
    private updateHearts(current: number, max: number): void {
        // Clear previous hearts
        this.hearts.removeChildren();
        this.heartSprites = [];
        
        const armorHP = this.player.armorHP || 0;
        
        // Debug logging - disabled
        // console.log('[HealthUI] Player object:', this.player);
        // console.log('[HealthUI] ArmorHP value:', armorHP, 'Type:', typeof armorHP);
        // if (armorHP > 0) {
        //     console.log('[HealthUI] Displaying', armorHP, 'green armor hearts');
        // }
        
        let heartIndex = 0;
        
        // First row: Regular HP hearts (red/gray)
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
            heartIndex++;
        }
        
        // Armor HP hearts (green) - to the right of regular hearts
        if (armorHP > 0) {
            const startX = 10 + max * 25 + 10; // Start after regular hearts with 10px gap
            for (let i = 0; i < armorHP; i++) {
                const armorHeart = new PIXI.Graphics();
                
                // Green armor hearts
                armorHeart.beginFill(0x2ECC71); // Green for armor HP
                
                // Draw heart circle (same size as regular hearts)
                armorHeart.drawCircle(0, 0, 8);
                armorHeart.endFill();
                
                // Add white border for visibility
                armorHeart.lineStyle(1, 0xFFFFFF);
                armorHeart.drawCircle(0, 0, 8);
                
                // Position to the right of regular hearts
                armorHeart.position.set(startX + i * 25, 10);
                
                this.hearts.addChild(armorHeart);
                this.heartSprites.push(armorHeart);
            }
        }
    }
}