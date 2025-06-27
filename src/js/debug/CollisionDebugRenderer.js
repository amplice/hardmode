/**
 * Collision Debug Renderer - Visualizes collision masks for debugging
 */
import * as PIXI from 'pixi.js';

export class CollisionDebugRenderer {
    constructor(world, game) {
        this.world = world;
        this.game = game;
        this.debugContainer = new PIXI.Container();
        this.isEnabled = false;
        this.debugSprites = [];
        
        // Add debug container to world but make it invisible by default
        this.debugContainer.visible = false;
        game.worldContainer.addChild(this.debugContainer);
        
        // Add global toggle function
        window.toggleCollisionDebug = () => this.toggle();
        
        console.log("[CollisionDebugRenderer] Initialized. Use toggleCollisionDebug() to toggle visualization.");
    }
    
    /**
     * Toggle collision debug visualization
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        this.debugContainer.visible = this.isEnabled;
        
        if (this.isEnabled) {
            this.generateDebugVisualization();
            console.log("[CollisionDebug] Collision visualization enabled");
        } else {
            console.log("[CollisionDebug] Collision visualization disabled");
        }
    }
    
    /**
     * Generate visual representation of collision mask
     */
    generateDebugVisualization() {
        // Clear existing debug sprites
        this.clearDebugSprites();
        
        if (!this.world.collisionMask) {
            console.warn("[CollisionDebug] No collision mask available");
            return;
        }
        
        const collisionMask = this.world.collisionMask;
        const tileSize = this.world.tileSize;
        
        // Create debug sprites for solid tiles
        for (let y = 0; y < collisionMask.height; y++) {
            for (let x = 0; x < collisionMask.width; x++) {
                if (!collisionMask.isTileWalkable(x, y)) {
                    const debugSprite = this.createDebugTile(x, y, tileSize);
                    this.debugContainer.addChild(debugSprite);
                    this.debugSprites.push(debugSprite);
                }
            }
        }
        
        console.log(`[CollisionDebug] Generated ${this.debugSprites.length} debug tiles`);
    }
    
    /**
     * Create a debug tile sprite
     */
    createDebugTile(tileX, tileY, tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Semi-transparent red overlay
        graphics.beginFill(0xFF0000, 0.3);
        graphics.drawRect(0, 0, tileSize, tileSize);
        graphics.endFill();
        
        // Red border
        graphics.lineStyle(1, 0xFF0000, 0.8);
        graphics.drawRect(0, 0, tileSize, tileSize);
        
        // Position the sprite
        graphics.x = tileX * tileSize;
        graphics.y = tileY * tileSize;
        
        return graphics;
    }
    
    /**
     * Clear all debug sprites
     */
    clearDebugSprites() {
        for (const sprite of this.debugSprites) {
            this.debugContainer.removeChild(sprite);
            sprite.destroy();
        }
        this.debugSprites = [];
    }
    
    /**
     * Update debug visualization (call when collision mask changes)
     */
    refresh() {
        if (this.isEnabled) {
            this.generateDebugVisualization();
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.clearDebugSprites();
        if (this.debugContainer.parent) {
            this.debugContainer.parent.removeChild(this.debugContainer);
        }
        this.debugContainer.destroy();
        
        // Remove global function
        if (window.toggleCollisionDebug) {
            delete window.toggleCollisionDebug;
        }
    }
}