/**
 * @fileoverview TilesetManager - Asset loading and texture management for world rendering
 * 
 * MIGRATION NOTES:
 * - Converted from TilesetManager.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for texture structures
 * - Preserved all tileset loading and slicing logic
 * 
 * ARCHITECTURE ROLE:
 * - Loads and slices sprite sheets into individual tile textures
 * - Provides structured access to terrain and decoration textures
 * - Manages biome variants (green vs dark grass) within same tileset
 * - Integrates with PIXI.js asset loading pipeline and texture caching
 * 
 * TILESET STRUCTURE:
 * MainLev2.0.png (2048x1408 pixels, 64x44 tiles):
 * - Rows 0-10: Cliff/transition tiles (green: cols 0-10, dark: cols 11-21)
 * - Rows 13-17: Stair tiles (green: cols 0-10, dark: cols 11-21)
 * - Rows 27-28: Decorative grass variations
 * 
 * BIOME TEXTURE ORGANIZATION:
 * Biome variants stored as column offsets in same tileset:
 * - Green grass: columns 0-10 (base biome)
 * - Dark grass: columns 11-21 (+11 column offset)
 * This pattern enables efficient biome switching in autotiler
 * 
 * PERFORMANCE OPTIMIZATION:
 * Texture slicing done once at startup, not per-tile
 * PIXI.js Rectangle creates texture views without memory duplication
 * 2D array structure provides O(1) access by [row][col] coordinates
 * Asset bundles enable preloading and efficient memory management
 * 
 * DEBUG SUPPORT:
 * Separate debug tileset with visual markers for tile boundaries
 * Controlled by GAME_CONSTANTS.DEBUG.USE_DEBUG_TILESET flag
 */

import { Assets, Texture, Rectangle, BaseTexture } from 'pixi.js';
import { GAME_CONSTANTS, BIOME_TYPES } from '../../../../shared/constants/GameConstants.js';

// Type definitions
interface TextureArrays {
    terrain: (Texture | null)[][];
    snow: (Texture | null)[][];
    plants: Texture[];
}

type PlantType = 'plant' | 'branches' | 'twigs' | 'flower1' | 'flower2' | 'flower3' | 'flower4';

type CliffTileType = 
    | 'nw-corner' | 'ne-corner' | 'sw-corner' | 'se-corner'
    | 'n-edge' | 's-edge' | 'w-edge' | 'e-edge'
    | 'sw-corner-ext' | 'se-corner-ext' | 's-edge-ext' | 'w-edge-ext' | 'e-edge-ext'
    | 'nw-diagonal' | 'ne-diagonal' | 'sw-diagonal' | 'se-diagonal';

export class TilesetManager {
    public textures: TextureArrays;
    public tileSize: number;
    
    // Grass tile references
    public basicGrassTile: Texture | null;
    public basicDarkGrassTile: Texture | null;
    private commonGrassVariations: Texture[];
    private commonDarkGrassVariations: Texture[];
    private decorativeGrassVariations: Texture[];
    private decorativeDarkGrassVariations: Texture[];
    
    // Legacy compatibility
    private pureGrassTiles: Texture[];
    private pureDarkGrassTiles: Texture[];

    constructor() {
        this.textures = {
            terrain: [],      // All terrain tiles from MainLev2.0
            snow: [],         // Snow tiles from snow/MainLev2.0.png
            plants: []        // Empty array - decorations now come from biome-specific tilesets
        };
        
        this.tileSize = 32; // New tileset uses 32x32 tiles
        
        // Initialize tile references
        this.basicGrassTile = null;
        this.basicDarkGrassTile = null;
        this.commonGrassVariations = [];
        this.commonDarkGrassVariations = [];
        this.decorativeGrassVariations = [];
        this.decorativeDarkGrassVariations = [];
        this.pureGrassTiles = [];
        this.pureDarkGrassTiles = [];
        
        const terrainTileset = GAME_CONSTANTS.DEBUG.USE_DEBUG_TILESET 
            ? 'assets/sprites/tiles/grass/MainLev2.0_debug.png'
            : 'assets/sprites/tiles/grass/MainLev2.0.png';
        
        Assets.addBundle('tilesets', {
            terrain: terrainTileset,
            snow: 'assets/sprites/tiles/snow/MainLev2.0.png'
        });
    }

    async load(): Promise<void> {
        await Assets.loadBundle('tilesets');
        
        // Load the new terrain tileset
        const terrainTexture = Assets.get('terrain');
        if (!terrainTexture) {
            throw new Error("Failed to load terrain texture");
        }
        this.sliceTerrainTileset(terrainTexture.baseTexture);
        
        // Load snow tileset
        const snowTexture = Assets.get('snow');
        if (!snowTexture) {
            throw new Error("Failed to load snow texture");
        }
        this.sliceSnowTileset(snowTexture.baseTexture);
        
        console.log("Tilesets loaded successfully");
        console.log(`[DEBUG] Using ${GAME_CONSTANTS.DEBUG.USE_DEBUG_TILESET ? 'DEBUG' : 'regular'} tileset`);
        console.log(`[DEBUG] Loaded terrain texture rows: ${this.textures.terrain.length}`);
        console.log(`[DEBUG] Loaded snow texture rows: ${this.textures.snow.length}`);
    }
    
    private sliceTerrainTileset(baseTexture: BaseTexture): void {
        const tileSize = this.tileSize;
        
        // MainLev2.0 is 64x44 tiles (2048x1408 pixels)
        // Store as 2D array for easier access
        this.textures.terrain = [];
        
        // Load rows 0-10 with green grass (cols 0-10) and dark grass (cols 11-21)
        for (let row = 0; row < 11; row++) {
            this.textures.terrain[row] = [];
            // Load green grass columns (0-10) and dark grass columns (11-21)
            for (let col = 0; col < 22; col++) {
                this.textures.terrain[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Load rows 13-17 to include stairs (both green and dark grass stairs)
        for (let row = 13; row <= 17; row++) {
            this.textures.terrain[row] = [];
            // Load green grass stairs (cols 0-10) and dark grass stairs (cols 11-21)
            for (let col = 0; col < 22; col++) {
                this.textures.terrain[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Load decorative grass variation rows (27-28) with full column range for dark grass
        for (let row = 27; row <= 28; row++) {
            this.textures.terrain[row] = [];
            // Load green grass common variations (cols 0-10) and dark grass common variations (cols 16-20)
            for (let col = 0; col < 21; col++) {
                this.textures.terrain[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Load transition tiles (rows 30-36, columns 0-9)
        for (let row = 30; row <= 36; row++) {
            this.textures.terrain[row] = [];
            for (let col = 0; col <= 9; col++) {
                this.textures.terrain[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Load the rare grass variations: green (22,54) to (31,63) and dark (22,44) to (31,53)
        for (let row = 22; row <= 31; row++) {
            if (!this.textures.terrain[row]) {
                this.textures.terrain[row] = [];
            }
            // Load dark grass rare variations (22,44) to (31,53)
            for (let col = 44; col <= 53; col++) {
                this.textures.terrain[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
            // Load green grass rare variations (22,54) to (31,63)
            for (let col = 54; col <= 63; col++) {
                this.textures.terrain[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Store green grass tiles with different frequency weights
        this.basicGrassTile = this.textures.terrain[1][1];
        
        // Store dark grass tiles (column 12 = column 1 + 11 offset, same row)
        this.basicDarkGrassTile = this.textures.terrain[1][12];
        
        // Common green grass variations (rows 27-28) - used moderately
        this.commonGrassVariations = [
            this.textures.terrain[27][5],  // Grass with small flowers
            this.textures.terrain[27][6],  // Grass with dirt patches
            this.textures.terrain[27][7],  // Grass with subtle wear
            this.textures.terrain[27][8],  // Grass with small stones
            this.textures.terrain[27][9],  // Grass with leaf litter
            this.textures.terrain[28][5],  // More decorative variations
            this.textures.terrain[28][6],
            this.textures.terrain[28][7], 
            this.textures.terrain[28][8],
            this.textures.terrain[28][9]
        ].filter(t => t !== null) as Texture[];
        
        // Dark grass common variations (rows 27-28, columns 16-20)
        this.commonDarkGrassVariations = [
            this.textures.terrain[27][16],  // Dark grass with small flowers
            this.textures.terrain[27][17],  // Dark grass with dirt patches
            this.textures.terrain[27][18],  // Dark grass with subtle wear
            this.textures.terrain[27][19],  // Dark grass with small stones
            this.textures.terrain[27][20],  // Dark grass with leaf litter
            this.textures.terrain[28][16],  // More decorative dark variations
            this.textures.terrain[28][17],
            this.textures.terrain[28][18], 
            this.textures.terrain[28][19],
            this.textures.terrain[28][20]
        ].filter(t => t !== null) as Texture[];
        
        // Rare green grass variations (22,54) to (31,63) - used sparingly
        this.decorativeGrassVariations = [];
        for (let row = 22; row <= 31; row++) {
            for (let col = 54; col <= 63; col++) {
                if (this.textures.terrain[row] && this.textures.terrain[row][col]) {
                    this.decorativeGrassVariations.push(this.textures.terrain[row][col]!);
                }
            }
        }
        
        // Rare dark grass variations (22,44) to (31,53) - used sparingly  
        this.decorativeDarkGrassVariations = [];
        for (let row = 22; row <= 31; row++) {
            for (let col = 44; col <= 53; col++) {
                if (this.textures.terrain[row] && this.textures.terrain[row][col]) {
                    this.decorativeDarkGrassVariations.push(this.textures.terrain[row][col]!);
                }
            }
        }
        
        // Legacy arrays for compatibility - not used directly anymore
        this.pureGrassTiles = this.basicGrassTile ? [this.basicGrassTile] : [];
        this.pureDarkGrassTiles = this.basicDarkGrassTile ? [this.basicDarkGrassTile] : [];
    }
    
    private sliceSnowTileset(baseTexture: BaseTexture): void {
        const tileSize = this.tileSize;
        
        // Snow tileset structure (3 variants with gaps)
        // Variant 1 (white): cols 0-10
        // Gap: col 11
        // Variant 2 (blue): cols 12-22
        // Gap: col 23
        // Variant 3 (grey): cols 24-34
        
        this.textures.snow = [];
        
        // Load cliff/ground tiles (rows 0-6) for all 3 variants
        for (let row = 0; row <= 6; row++) {
            this.textures.snow[row] = [];
            // Load all columns including gaps
            for (let col = 0; col <= 34; col++) {
                this.textures.snow[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Load snow stairs (rows 17-20) for all 3 variants
        for (let row = 17; row <= 20; row++) {
            this.textures.snow[row] = [];
            // White snow stairs: cols 2-8
            // Blue snow stairs: cols 14-20
            // Grey snow stairs: cols 26-32
            for (let col = 0; col <= 32; col++) {
                this.textures.snow[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Load transition tiles
        // White to blue transitions (rows 22-28)
        for (let row = 22; row <= 28; row++) {
            this.textures.snow[row] = [];
            for (let col = 0; col <= 9; col++) {
                this.textures.snow[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // White to grey transitions (rows 29-35)
        for (let row = 29; row <= 35; row++) {
            this.textures.snow[row] = [];
            for (let col = 0; col <= 9; col++) {
                this.textures.snow[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Transparency transitions
        // White snow to transparency (rows 36-42, cols 0-9)
        for (let row = 36; row <= 42; row++) {
            this.textures.snow[row] = [];
            for (let col = 0; col <= 9; col++) {
                this.textures.snow[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Blue snow to transparency (rows 36-42, cols 10-19)
        for (let row = 36; row <= 42; row++) {
            if (!this.textures.snow[row]) {
                this.textures.snow[row] = [];
            }
            for (let col = 10; col <= 19; col++) {
                this.textures.snow[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        // Grey snow to transparency (rows 43-49, cols 0-9)
        for (let row = 43; row <= 49; row++) {
            this.textures.snow[row] = [];
            for (let col = 0; col <= 9; col++) {
                this.textures.snow[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
    }
    
    private slicePlantsTileset(baseTexture: BaseTexture): Texture[] {
        const tileSize = 16;
        const textures: Texture[] = [];
        
        // Create a 6x3 array of textures
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 3; col++) {
                textures.push(
                    new Texture(
                        baseTexture,
                        new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                    )
                );
            }
        }
        
        return textures;
    }
    
    getPlantTexture(type: PlantType): Texture | undefined {
        // Plants are no longer loaded from a separate file
        // Decorations should come from biome-specific tilesets
        return undefined;
        
        // Legacy code kept for reference:
        /*
        const textureMap: Record<PlantType, number> = {
            'plant': 9,
            'branches': 10,
            'twigs': 11,
            'flower1': 12,
            'flower2': 13,
            'flower3': 15,
            'flower4': 16
        };
        
        return this.textures.plants[textureMap[type]];
        */
    }
    
    // Full tile getters - updated for new tileset
    getFullGrassTile(): Texture | null {
        // Return a random pure grass tile for variety
        return this.pureGrassTiles[Math.floor(Math.random() * this.pureGrassTiles.length)] || null;
    }
    
    getFullSandTile(): Texture | null {
        // For now, return grass (we'll add other zones later)
        return this.getFullGrassTile();
    }
    
    getFullWaterTile(): Texture | null {
        // For now, return grass (we'll add water later)
        return this.getFullGrassTile();
    }
    
    // Get cliff edge tiles from the new tileset
    getCliffTile(type: CliffTileType): Texture | null {
        const tileMap: Record<CliffTileType, [number, number]> = {
            // Square corners
            'nw-corner': [0, 0],      // Northwest corner
            'ne-corner': [0, 6],      // Northeast corner  
            'sw-corner': [5, 0],      // Southwest corner
            'se-corner': [5, 6],      // Southeast corner
            
            // Edges
            'n-edge': [0, 1],         // North edge (can use 0,1 through 0,5)
            's-edge': [5, 1],         // South edge (can use 5,1 through 5,5)
            'w-edge': [1, 0],         // West edge
            'e-edge': [1, 6],         // East edge
            
            // Height extensions (second layer)
            'sw-corner-ext': [6, 0],  // Goes below sw-corner
            'se-corner-ext': [6, 6],  // Goes below se-corner
            's-edge-ext': [6, 1],     // Goes below s-edge
            'w-edge-ext': [2, 0],     // Alternative west edge
            'e-edge-ext': [2, 6],     // Alternative east edge
            
            // Diagonal corners
            'nw-diagonal': [0, 8],    // Northwest diagonal
            'ne-diagonal': [0, 9],    // Northeast diagonal
            'sw-diagonal': [5, 8],    // Southwest diagonal  
            'se-diagonal': [5, 9]     // Southeast diagonal
        };
        
        const coords = tileMap[type];
        if (coords && this.textures.terrain[coords[0]] && this.textures.terrain[coords[0]][coords[1]]) {
            return this.textures.terrain[coords[0]][coords[1]];
        }
        return null;
    }
    
    // Get a random pure grass tile with weighted selection
    getRandomPureGrass(): Texture | null {
        const rand = Math.random();
        
        // 87% chance for basic grass (1,1)
        if (rand < 0.87) {
            return this.basicGrassTile;
        }
        // 10% chance for common variations (rows 27-28)
        else if (rand < 0.97) {
            const index = Math.floor(Math.random() * this.commonGrassVariations.length);
            return this.commonGrassVariations[index] || this.basicGrassTile;
        }
        // 3% chance for decorative variations (22,54) to (31,63)
        else {
            const index = Math.floor(Math.random() * this.decorativeGrassVariations.length);
            return this.decorativeGrassVariations[index] || this.basicGrassTile;
        }
    }
    
    // Get a random grass tile for plateau interiors (not cliff edges)
    getRandomPlateauGrass(): Texture | null {
        // Use same percentages as regular ground
        return this.getRandomPureGrass();
    }
    
    // Get a random pure dark grass tile with weighted selection
    getRandomPureDarkGrass(): Texture | null {
        const rand = Math.random();
        
        // 87% chance for basic dark grass (1,12)
        if (rand < 0.87) {
            return this.basicDarkGrassTile;
        }
        // 10% chance for common dark grass variations (rows 27-28, cols 16-20)
        else if (rand < 0.97) {
            const index = Math.floor(Math.random() * this.commonDarkGrassVariations.length);
            return this.commonDarkGrassVariations[index] || this.basicDarkGrassTile;
        }
        // 3% chance for rare dark grass variations (22,44) to (31,53)
        else {
            const index = Math.floor(Math.random() * this.decorativeDarkGrassVariations.length);
            return this.decorativeDarkGrassVariations[index] || this.basicDarkGrassTile;
        }
    }
    
    // Get a random dark grass tile for plateau interiors (not cliff edges)
    getRandomPlateauDarkGrass(): Texture | null {
        // Use same logic as regular dark grass
        return this.getRandomPureDarkGrass();
    }
    
    // Get basic snow tile for a specific variant (0=white, 1=blue, 2=grey)
    getBasicSnowTile(variant: number = 0): Texture | null {
        const colOffsets = [0, 12, 24]; // Column offsets for each variant
        const col = 1 + colOffsets[variant];
        return this.textures.snow[1] && this.textures.snow[1][col] ? this.textures.snow[1][col] : null;
    }
    
    // Get random snow tile (for now just returns basic tile, can add variations later)
    getRandomSnowTile(variant: number = 0): Texture | null {
        return this.getBasicSnowTile(variant);
    }
    
    // Get snow tile for specific coordinates (handles cliff tiles, etc.)
    getSnowTileAt(row: number, col: number): Texture | null {
        if (this.textures.snow[row] && this.textures.snow[row][col]) {
            return this.textures.snow[row][col];
        }
        return null;
    }
}