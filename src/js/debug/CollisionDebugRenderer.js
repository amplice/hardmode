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
        
        // Add debug container to world container but ensure it's above tiles
        this.debugContainer.visible = false;
        this.debugContainer.zIndex = 1000; // Ensure it's on top of tiles
        
        // Add to world container so it moves with camera
        game.worldContainer.addChild(this.debugContainer);
        
        console.log("[CollisionDebugRenderer] Debug container added to world container");
        
        // Add global toggle function with proper binding
        const self = this;
        window.toggleCollisionDebug = function() {
            return self.toggle();
        };
        
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
            return "Collision debug enabled";
        } else {
            console.log("[CollisionDebug] Collision visualization disabled");
            return "Collision debug disabled";
        }
    }
    
    /**
     * Generate visual representation of collision mask
     */
    generateDebugVisualization() {
        console.log("[CollisionDebug] Starting debug visualization generation...");
        
        // Clear existing debug sprites
        this.clearDebugSprites();
        
        if (!this.world) {
            console.error("[CollisionDebug] No world available");
            return;
        }
        
        if (!this.world.collisionMask) {
            console.error("[CollisionDebug] No collision mask available on world");
            console.log("[CollisionDebug] World object:", this.world);
            return;
        }
        
        const collisionMask = this.world.collisionMask;
        const tileSize = this.world.tileSize;
        
        console.log(`[CollisionDebug] Collision mask dimensions: ${collisionMask.width}x${collisionMask.height}, tileSize: ${tileSize}`);
        
        // Create debug sprites for solid tiles
        let solidTileCount = 0;
        for (let y = 0; y < collisionMask.height; y++) {
            for (let x = 0; x < collisionMask.width; x++) {
                if (!collisionMask.isTileWalkable(x, y)) {
                    const debugSprite = this.createDebugTile(x, y, tileSize);
                    this.debugContainer.addChild(debugSprite);
                    this.debugSprites.push(debugSprite);
                    solidTileCount++;
                }
            }
        }
        
        // If no collision tiles found, create a test tile to verify rendering works
        if (solidTileCount === 0) {
            console.warn("[CollisionDebug] No solid tiles found! Creating test tile at (10, 10)");
            const testSprite = this.createDebugTile(10, 10, tileSize);
            this.debugContainer.addChild(testSprite);
            this.debugSprites.push(testSprite);
        }
        
        console.log(`[CollisionDebug] Generated ${this.debugSprites.length} debug tiles for ${solidTileCount} solid tiles`);
        console.log(`[CollisionDebug] Debug container children count: ${this.debugContainer.children.length}`);
        console.log(`[CollisionDebug] Debug container visible: ${this.debugContainer.visible}`);
    }
    
    /**
     * Create a debug tile sprite
     */
    createDebugTile(tileX, tileY, tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Bright red overlay - more visible
        graphics.beginFill(0xFF0000, 0.6);
        graphics.drawRect(0, 0, tileSize, tileSize);
        graphics.endFill();
        
        // Bright red border
        graphics.lineStyle(2, 0xFF0000, 1.0);
        graphics.drawRect(0, 0, tileSize, tileSize);
        
        // Position the sprite (accounting for world offset since we're on stage)
        graphics.x = tileX * tileSize;
        graphics.y = tileY * tileSize;
        
        console.log(`[CollisionDebug] Created debug tile at (${tileX}, ${tileY}) -> screen pos (${graphics.x}, ${graphics.y})`);
        
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