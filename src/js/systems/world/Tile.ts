/**
 * @fileoverview Tile - Individual tile rendering and state management
 * 
 * MIGRATION NOTES:
 * - Converted from Tile.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Final Round
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for tile rendering
 * - Preserved all tile type transitions and overlay logic
 * 
 * ARCHITECTURE ROLE:
 * - Represents individual tiles in the game world
 * - Manages base texture, transition overlays, and water effects
 * - Handles tile type changes and walkability
 * - Provides PIXI container for efficient rendering
 * 
 * TILE SYSTEM:
 * - Base tiles: grass, sand, water
 * - Transition tiles: smooth biome boundaries
 * - Corner matching: inner corner transitions
 * - Water overlays: water edges on grass tiles
 * - Cliff edges: marked as unwalkable
 * 
 * TEXTURE SCALING:
 * - Source textures are 32x32 or 16x16 pixels
 * - Scales to match world tileSize setting
 * - Maintains pixel-perfect rendering
 */

import * as PIXI from 'pixi.js';

// Type definitions
type TileType = 'grass' | 'sand' | 'water' | 'transition';

interface TilesetInterface {
    getFullGrassTile(): PIXI.Texture;
    getFullSandTile(): PIXI.Texture;
    getFullWaterTile(): PIXI.Texture;
    getGrassTransition?(position: string): PIXI.Texture | null;
    getInnerCornerMatch?(matchType: string): PIXI.Texture | null;
    getWaterInnerCornerMatch?(overlayType: string): PIXI.Texture | null;
    getWaterEdgeTile?(overlayType: string): PIXI.Texture | null;
    [key: string]: any;
}

export class Tile {
    // Position and basic properties
    x: number;
    y: number;
    type: TileType;
    tileSize: number;
    
    // Transition and overlay state
    isTransition: boolean;
    transitionType: string | null;
    waterOverlayType: string | null;
    isCliffEdge: boolean;
    
    // PIXI rendering elements
    container: PIXI.Container;
    baseSprite: PIXI.Sprite;
    sprite: PIXI.Sprite; // Alias for compatibility
    transitionSprite: PIXI.Sprite | null;
    cornerMatchSprite: PIXI.Sprite | null;
    waterOverlaySprite: PIXI.Sprite | null;

    constructor(x: number, y: number, type: TileType, tilesets: TilesetInterface, tileSize: number) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.tileSize = tileSize;
        this.isTransition = false;
        this.transitionType = null;
        this.waterOverlayType = null;
        this.isCliffEdge = false; // Track if this tile is a cliff edge (unwalkable)
        
        // Container for sprites
        this.container = new PIXI.Container();
        this.container.position.set(x * tileSize, y * tileSize);
        
        // Base sprite
        this.baseSprite = new PIXI.Sprite();
        this.sprite = this.baseSprite; // Alias for compatibility
        this.transitionSprite = null;
        this.cornerMatchSprite = null;
        this.waterOverlaySprite = null;
        
        // Set initial texture
        if (type === 'grass') {
            this.baseSprite.texture = tilesets.getFullGrassTile();
        } else if (type === 'sand') {
            this.baseSprite.texture = tilesets.getFullSandTile();
        } else if (type === 'water') {
            this.baseSprite.texture = tilesets.getFullWaterTile();
        } else {
            console.warn(`Unknown tile type "${type}" at (${x}, ${y})`);
            this.baseSprite.texture = PIXI.Texture.WHITE;
        }
        
        // The new tileset is 32x32, so scale appropriately
        this.baseSprite.scale.set(tileSize / 32, tileSize / 32);
        this.container.addChild(this.baseSprite);
    }
    
    setType(newType: TileType, tilesets: TilesetInterface): void {
        if (this.type === newType) return;
        
        // Clear all overlays
        this.clearAllOverlays();
        
        // Update type
        this.type = newType;
        this.isTransition = false;
        
        // Set new base texture
        if (newType === 'grass') {
            this.baseSprite.texture = tilesets.getFullGrassTile();
        } else if (newType === 'sand') {
            this.baseSprite.texture = tilesets.getFullSandTile();
        } else if (newType === 'water') {
            this.baseSprite.texture = tilesets.getFullWaterTile();
        } else {
            console.warn(`Unknown tile type "${newType}" at (${this.x}, ${this.y})`);
            this.baseSprite.texture = PIXI.Texture.WHITE;
        }
    }
    
    clearAllOverlays(): void {
        // Remove transition sprite
        if (this.transitionSprite && this.transitionSprite.parent) {
            this.container.removeChild(this.transitionSprite);
        }
        this.transitionSprite = null;
        this.transitionType = null;
        
        // Remove corner match sprite
        if (this.cornerMatchSprite && this.cornerMatchSprite.parent) {
            this.container.removeChild(this.cornerMatchSprite);
        }
        this.cornerMatchSprite = null;
        
        // Remove water overlay sprite
        if (this.waterOverlaySprite && this.waterOverlaySprite.parent) {
            this.container.removeChild(this.waterOverlaySprite);
        }
        this.waterOverlaySprite = null;
        this.waterOverlayType = null;
    }
    
    convertToTransition(position: string, tilesets: TilesetInterface): void {
        // Change base to sand
        this.baseSprite.texture = tilesets.getFullSandTile();
        
        // Add grass transition overlay
        const transitionTexture = tilesets.getGrassTransition?.(position);
        
        if (transitionTexture) {
            // Remove existing transition if any
            if (this.transitionSprite && this.transitionSprite.parent) {
                this.container.removeChild(this.transitionSprite);
            }
            
            this.transitionSprite = new PIXI.Sprite(transitionTexture);
            this.transitionSprite.scale.set(this.tileSize / 16, this.tileSize / 16);
            this.container.addChild(this.transitionSprite);
        }
        
        // Store transition info
        this.transitionType = position;
        this.isTransition = true;
        this.type = 'transition';
    }
    
    addInnerCornerMatch(matchType: string, tilesets: TilesetInterface): void {
        const matchTexture = tilesets.getInnerCornerMatch?.(matchType);
        
        if (matchTexture) {
            // Remove existing corner match if any
            if (this.cornerMatchSprite && this.cornerMatchSprite.parent) {
                this.container.removeChild(this.cornerMatchSprite);
            }
            
            this.cornerMatchSprite = new PIXI.Sprite(matchTexture);
            this.cornerMatchSprite.scale.set(this.tileSize / 16, this.tileSize / 16);
            this.container.addChild(this.cornerMatchSprite);
        }
    }
    
    addWaterOverlay(overlayType: string, tilesets: TilesetInterface): void {
        // Only add water overlays to grass tiles
        if (this.type !== 'grass') return;
        
        let overlayTexture: PIXI.Texture | null;
        
        // Determine which texture to use based on overlay type
        if (overlayType.includes('match')) {
            overlayTexture = tilesets.getWaterInnerCornerMatch?.(overlayType) ?? null;
        } else {
            overlayTexture = tilesets.getWaterEdgeTile?.(overlayType) ?? null;
        }
        
        if (!overlayTexture) {
            this.removeWaterOverlay();
            return;
        }
        
        // Only create a new sprite if needed
        if (!this.waterOverlaySprite || this.waterOverlayType !== overlayType) {
            // Remove existing water overlay
            if (this.waterOverlaySprite && this.waterOverlaySprite.parent) {
                this.container.removeChild(this.waterOverlaySprite);
            }
            
            this.waterOverlaySprite = new PIXI.Sprite(overlayTexture);
            this.waterOverlaySprite.scale.set(this.tileSize / 16, this.tileSize / 16);
            this.container.addChild(this.waterOverlaySprite);
            this.waterOverlayType = overlayType;
        }
    }
    
    removeWaterOverlay(): void {
        if (this.waterOverlaySprite && this.waterOverlaySprite.parent) {
            this.container.removeChild(this.waterOverlaySprite);
        }
        this.waterOverlaySprite = null;
        this.waterOverlayType = null;
    }
    
    isWalkable(): boolean {
        return this.type !== 'water' && !this.isCliffEdge;
    }
}