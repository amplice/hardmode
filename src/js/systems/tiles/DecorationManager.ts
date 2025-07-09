/**
 * @fileoverview DecorationManager - Environmental decoration system for world tiles
 * 
 * MIGRATION NOTES:
 * - Converted from DecorationManager.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for decoration structures
 * - Preserved all decoration placement logic
 * 
 * ARCHITECTURE ROLE:
 * - Adds visual variety through environmental decorations (plants, flowers, branches)
 * - Uses density-based random placement for natural distribution
 * - Respects tile types (grass-only decorations don't appear on sand/water)
 * - Integrates with TilesetManager for decoration textures
 * 
 * DECORATION SYSTEM:
 * - Each decoration type has configurable density per tile type
 * - Random offset within tile for natural appearance
 * - One decoration maximum per tile to avoid visual clutter
 * - Scales decorations to match world tile size
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - All decorations rendered as single container for batching
 * - Sprite reuse not implemented (decorations are static)
 * - Suitable for medium-density decoration (0.5-3% of tiles)
 */

import * as PIXI from 'pixi.js';
import type { TilesetManager } from './TilesetManager.js';

// Type definitions
interface DecorationManagerOptions {
    random?: () => number;
}

interface DecorationType {
    type: string;
    densityOnGrass: number;
    densityOnSand: number;
    grassOnly: boolean;
}

interface DecorationInfo {
    x: number;
    y: number;
    type: string;
    sprite: PIXI.Sprite;
}

interface WorldInterface {
    width: number;
    height: number;
    tileSize: number;
    tiles: {
        type: string;
    }[][];
}

export class DecorationManager {
    private world: WorldInterface;
    private tilesets: TilesetManager;
    private random: () => number;
    public container: PIXI.Container;
    private decorations: DecorationInfo[];

    constructor(world: WorldInterface, tilesets: TilesetManager, options: DecorationManagerOptions = {}) {
        this.world = world;
        this.tilesets = tilesets;
        this.random = options.random || Math.random;
        this.container = new PIXI.Container();
        this.decorations = [];
    }
    
    generateDecorations(): PIXI.Container {
        // Clear existing decorations
        this.container.removeChildren();
        this.decorations = [];
        
        // Define decoration types and their properties
        const decorationTypes: DecorationType[] = [
            { type: 'plant', densityOnGrass: 0.005, densityOnSand: 0, grassOnly: true },
            { type: 'branches', densityOnGrass: 0.005, densityOnSand: 0, grassOnly: true },
            { type: 'twigs', densityOnGrass: 0.005, densityOnSand: 0.005, grassOnly: false },
            { type: 'flower1', densityOnGrass: 0.005, densityOnSand: 0, grassOnly: true },
            { type: 'flower2', densityOnGrass: 0.005, densityOnSand: 0, grassOnly: true },
            { type: 'flower3', densityOnGrass: 0.005, densityOnSand: 0, grassOnly: true },
            { type: 'flower4', densityOnGrass: 0.005, densityOnSand: 0, grassOnly: true }
        ];
        
        // For each tile in the world
        for (let y = 0; y < this.world.height; y++) {
            for (let x = 0; x < this.world.width; x++) {
                const tile = this.world.tiles[y][x];
                const tileType = tile.type;

                // Skip water tiles entirely
                if (tileType === 'water') {
                    continue;
                }
                
                // Try to place each decoration type
                for (const decType of decorationTypes) {
                    // Skip if this is grass-only decoration and we're on sand
                    if (decType.grassOnly && tileType !== 'grass') {
                        continue;
                    }
                    
                    // Determine density based on tile type
                    const density = tileType === 'grass' ? decType.densityOnGrass : decType.densityOnSand;
                    
                    // Random check based on density
                    if (this.random() < density) {
                        this.placeDecoration(x, y, decType.type);
                        break; // Only place one decoration per tile
                    }
                }
            }
        }
        
        return this.container;
    }
    
    private placeDecoration(x: number, y: number, type: string): PIXI.Sprite | undefined {
        // Get the decoration texture
        const texture = this.tilesets.getPlantTexture(type as any);
        if (!texture) return;
        
        // Create a sprite for the decoration
        const sprite = new PIXI.Sprite(texture);
        
        // Scale to match tile size
        sprite.scale.set(this.world.tileSize / 16, this.world.tileSize / 16);
        
        // Calculate position (center of the tile)
        const posX = x * this.world.tileSize;
        const posY = y * this.world.tileSize;
        sprite.position.set(posX, posY);
        
        // Add small random offset for natural look
        sprite.position.x += (this.random() - 0.5) * (this.world.tileSize * 0.5);
        sprite.position.y += (this.random() - 0.5) * (this.world.tileSize * 0.5);
        
        // Add to container
        this.container.addChild(sprite);
        
        // Store decoration info
        this.decorations.push({
            x, y, type, sprite
        });
        
        return sprite;
    }
}