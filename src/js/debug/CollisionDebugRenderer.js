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
        
        // Add debug info function
        window.checkCollisionMask = function() {
            console.log("[CollisionDebug] World:", self.world);
            console.log("[CollisionDebug] Collision mask:", self.world ? self.world.collisionMask : "No world");
            if (self.world && self.world.collisionMask) {
                console.log("[CollisionDebug] Collision mask stats:", self.world.collisionMask.getStats());
            }
            return self.world && self.world.collisionMask ? "Collision mask exists" : "No collision mask found";
        };
        
        // Add force test function to verify rendering works
        window.forceTestDebug = function() {
            console.log("[CollisionDebug] Forcing test debug visualization...");
            self.clearDebugSprites();
            
            // Create highly visible test tiles at fixed positions
            const positions = [
                {x: 10, y: 10}, {x: 20, y: 20}, {x: 30, y: 30},
                {x: 50, y: 50}, {x: 60, y: 60}, {x: 70, y: 70}
            ];
            
            for (const pos of positions) {
                const testSprite = self.createDebugTile(pos.x, pos.y, self.world ? self.world.tileSize : 64);
                self.debugContainer.addChild(testSprite);
                self.debugSprites.push(testSprite);
            }
            
            self.debugContainer.visible = true;
            self.isEnabled = true;
            
            console.log(`[CollisionDebug] Created ${self.debugSprites.length} forced test tiles`);
            console.log(`[CollisionDebug] Debug container visible: ${self.debugContainer.visible}`);
            console.log(`[CollisionDebug] Debug container parent:`, self.debugContainer.parent);
            
            return `Created ${self.debugSprites.length} test debug tiles`;
        };
        
        console.log("[CollisionDebugRenderer] Initialized. Use toggleCollisionDebug() to toggle visualization.");
        console.log("[CollisionDebugRenderer] Use checkCollisionMask() to verify mask exists.");
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
        
        // If no collision tiles found, create test tiles to verify rendering works
        if (solidTileCount === 0) {
            console.warn("[CollisionDebug] No solid tiles found! Creating test tiles for visibility verification");
            
            // Create a 3x3 grid of test tiles in center of screen
            const centerX = Math.floor(this.world.width / 2);
            const centerY = Math.floor(this.world.height / 2);
            
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const testX = centerX + dx;
                    const testY = centerY + dy;
                    const testSprite = this.createDebugTile(testX, testY, tileSize);
                    this.debugContainer.addChild(testSprite);
                    this.debugSprites.push(testSprite);
                }
            }
            console.log("[CollisionDebug] Created 9 test tiles for visibility verification");
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
        
        // Very bright, opaque red overlay - maximum visibility
        graphics.beginFill(0xFF0000, 1.0); // Full opacity
        graphics.drawRect(0, 0, tileSize, tileSize);
        graphics.endFill();
        
        // Thick bright yellow border for contrast
        graphics.lineStyle(4, 0xFFFF00, 1.0);
        graphics.drawRect(0, 0, tileSize, tileSize);
        
        // Position the sprite
        graphics.x = tileX * tileSize;
        graphics.y = tileY * tileSize;
        
        // Force visible properties
        graphics.visible = true;
        graphics.alpha = 1.0;
        graphics.renderable = true;
        
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