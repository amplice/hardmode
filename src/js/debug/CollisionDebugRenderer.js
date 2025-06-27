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
        
        // Add to world container AFTER the world tiles are added
        // This ensures debug layer is on top of tiles
        // The container will be properly added when world is generated
        this.pendingAddToWorld = true;
        
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
        
        // Add diagnostic function to check render tree
        window.debugCollisionRenderTree = function() {
            console.log("[CollisionDebug] === Render Tree Diagnostic ===");
            console.log("App stage children:", self.game.app.stage.children.length);
            console.log("World container children:", self.game.worldContainer.children.length);
            console.log("Debug container parent:", self.debugContainer.parent);
            console.log("Debug container visible:", self.debugContainer.visible);
            console.log("Debug container children:", self.debugContainer.children.length);
            console.log("World container position:", self.game.worldContainer.position);
            console.log("Debug container position:", self.debugContainer.position);
            
            if (self.debugSprites.length > 0) {
                const firstSprite = self.debugSprites[0];
                console.log("First debug sprite position:", firstSprite.position);
                console.log("First debug sprite visible:", firstSprite.visible);
                console.log("First debug sprite alpha:", firstSprite.alpha);
                console.log("First debug sprite parent:", firstSprite.parent);
            }
            
            return "Check console for render tree details";
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
        
        // Ensure debug container is properly added to world
        if (this.pendingAddToWorld && this.game.worldContainer) {
            this.game.worldContainer.addChild(this.debugContainer);
            this.pendingAddToWorld = false;
            console.log("[CollisionDebug] Debug container added to world container");
        }
        
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
        
        // Create debug sprites for ALL solid tiles - this is what we want to see
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
        
        console.log(`[CollisionDebug] Generated ${this.debugSprites.length} debug tiles for ${solidTileCount} solid tiles`);
        console.log(`[CollisionDebug] Debug container children count: ${this.debugContainer.children.length}`);
        console.log(`[CollisionDebug] Debug container visible: ${this.debugContainer.visible}`);
        console.log(`[CollisionDebug] Debug container parent:`, this.debugContainer.parent);
    }
    
    /**
     * Create a debug tile sprite
     */
    createDebugTile(tileX, tileY, tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Semi-transparent red overlay so you can see terrain underneath
        graphics.beginFill(0xFF0000, 0.4); // 40% opacity
        graphics.drawRect(0, 0, tileSize, tileSize);
        graphics.endFill();
        
        // Bright red border for clear boundary definition
        graphics.lineStyle(2, 0xFF0000, 1.0);
        graphics.drawRect(0, 0, tileSize, tileSize);
        
        // Position the sprite
        graphics.x = tileX * tileSize;
        graphics.y = tileY * tileSize;
        
        // Force visible properties
        graphics.visible = true;
        graphics.alpha = 1.0;
        graphics.renderable = true;
        
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