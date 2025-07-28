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

import { Assets, Texture, Rectangle, BaseTexture, RenderTexture } from 'pixi.js';
import * as PIXI from 'pixi.js';
import { GAME_CONSTANTS, BIOME_TYPES } from '../../../../shared/constants/GameConstants.js';

// Type definitions
interface TextureArrays {
    terrain: (Texture | null)[][];
    snow: (Texture | null)[][];
    plants: Texture[];
    decorative?: (Texture | null)[][];
    snowDecorative?: (Texture | null)[][];
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
    
    // Snow tile references
    private snowAltTiles: Texture[][] = []; // Alt tiles for each variant [variant][tiles]
    private snowRockTiles: Texture[][] = [[], [], []];  // Rock decorative tiles [variant][tiles]
    private snowVegetationTiles: Texture[][] = [[], [], []]; // Vegetation decorative tiles [variant][tiles]
    
    // Grass decorative element mapping
    private decorativeElementMap: Map<string, { row: number, col: number, width: number, height: number }> = new Map();
    
    // Snow decorative element mapping
    private snowDecorativeElementMap: Map<string, { row: number, col: number, width: number, height: number }> = new Map();
    
    // Tree animation textures
    private treeAnimations: Map<string, Texture[]> = new Map();
    
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
            snow: 'assets/sprites/tiles/snow/MainLev2.0.png',
            decorative: 'assets/sprites/tiles/grass/decorative.png',
            snowDecorative: 'assets/sprites/tiles/snow/decorations.png',
            // Tree animations
            tree1A: 'assets/sprites/tiles/grass/anim/tree1A_ss.png',
            tree1B: 'assets/sprites/tiles/grass/anim/tree1B_ss.png',
            tree1C: 'assets/sprites/tiles/grass/anim/tree1C_ss.png',
            tree1D: 'assets/sprites/tiles/grass/anim/tree1D_ss.png',
            tree2A: 'assets/sprites/tiles/grass/anim/tree2A_ss.png',
            tree2B: 'assets/sprites/tiles/grass/anim/tree2B_ss.png',
            tree2C: 'assets/sprites/tiles/grass/anim/tree2C_ss.png',
            tree2D: 'assets/sprites/tiles/grass/anim/tree2D_ss.png',
            tree3A: 'assets/sprites/tiles/grass/anim/tree3A_ss.png',
            tree3B: 'assets/sprites/tiles/grass/anim/tree3B_ss.png',
            tree3C: 'assets/sprites/tiles/grass/anim/tree3C_ss.png',
            tree3D: 'assets/sprites/tiles/grass/anim/tree3D_ss.png'
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
        
        // Load decorative tileset
        const decorativeTexture = Assets.get('decorative');
        if (decorativeTexture) {
            this.sliceDecorativeTileset(decorativeTexture.baseTexture);
            this.setupDecorativeElementMap();
        }
        
        // Load snow decorative tileset
        const snowDecorativeTexture = Assets.get('snowDecorative');
        if (snowDecorativeTexture) {
            this.sliceSnowDecorativeTileset(snowDecorativeTexture.baseTexture);
            this.setupSnowDecorativeElementMap();
        }
        
        // Load tree animations
        await this.loadTreeAnimations();
        
        console.log("Tilesets loaded successfully");
        console.log(`[DEBUG] Using ${GAME_CONSTANTS.DEBUG.USE_DEBUG_TILESET ? 'DEBUG' : 'regular'} tileset`);
        console.log(`[DEBUG] Loaded terrain texture rows: ${this.textures.terrain.length}`);
        console.log(`[DEBUG] Loaded snow texture rows: ${this.textures.snow.length}`);
        console.log(`[DEBUG] Loaded decorative elements: ${this.decorativeElementMap.size}`);
    }
    
    private sliceTerrainTileset(baseTexture: BaseTexture): void {
        const tileSize = this.tileSize;
        
        // Load the ENTIRE grass tileset to avoid missing tiles
        const tilesWide = Math.floor(baseTexture.width / tileSize);
        const tilesHigh = Math.floor(baseTexture.height / tileSize);
        
        this.textures.terrain = [];
        
        // Load every single tile in the entire tileset
        for (let row = 0; row < tilesHigh; row++) {
            this.textures.terrain[row] = [];
            for (let col = 0; col < tilesWide; col++) {
                this.textures.terrain[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        console.log(`[TilesetManager] Loaded entire grass tileset: ${tilesWide}x${tilesHigh} tiles`);
        
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
        
        // Load the ENTIRE snow tileset to avoid missing tiles
        const tilesWide = Math.floor(baseTexture.width / tileSize);
        const tilesHigh = Math.floor(baseTexture.height / tileSize);
        
        this.textures.snow = [];
        
        // Load every single tile in the entire tileset
        for (let row = 0; row < tilesHigh; row++) {
            this.textures.snow[row] = [];
            for (let col = 0; col < tilesWide; col++) {
                this.textures.snow[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
        
        console.log(`[TilesetManager] Loaded entire snow tileset: ${tilesWide}x${tilesHigh} tiles`);
        
        // Store snow variant tiles for easy access
        this.setupSnowVariantTiles();
    }
    
    private setupSnowVariantTiles(): void {
        // Initialize arrays for each variant
        this.snowAltTiles = [[], [], []]; // white, blue, grey
        
        // White snow alt tiles (1,1) to (4,5) - total 20 tiles
        for (let row = 1; row <= 4; row++) {
            for (let col = 1; col <= 5; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowAltTiles[0].push(this.textures.snow[row][col]!);
                }
            }
        }
        
        // Blue snow alt tiles - same pattern but with +12 column offset
        for (let row = 1; row <= 4; row++) {
            for (let col = 13; col <= 17; col++) { // 1+12 to 5+12
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowAltTiles[1].push(this.textures.snow[row][col]!);
                }
            }
        }
        
        // Grey snow alt tiles - same pattern but with +24 column offset
        for (let row = 1; row <= 4; row++) {
            for (let col = 25; col <= 29; col++) { // 1+24 to 5+24
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowAltTiles[2].push(this.textures.snow[row][col]!);
                }
            }
        }
        
        // Additional grey snow alt tiles: rows 30-35, columns 31-36
        for (let row = 30; row <= 35; row++) {
            for (let col = 31; col <= 36; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowAltTiles[2].push(this.textures.snow[row][col]!);
                }
            }
        }
        
        // Initialize rock and vegetation arrays
        this.snowRockTiles = [[], [], []];
        this.snowVegetationTiles = [[], [], []];
        
        // WHITE SNOW decorative tiles
        // Rock tiles: rows 26-29, columns 31-32 and rows 27-29, columns 33-34
        for (let row = 26; row <= 29; row++) {
            for (let col = 31; col <= 32; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowRockTiles[0].push(this.textures.snow[row][col]!);
                }
            }
        }
        for (let row = 27; row <= 29; row++) {
            for (let col = 33; col <= 34; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowRockTiles[0].push(this.textures.snow[row][col]!);
                }
            }
        }
        
        // White vegetation tiles: rows 24-28, column 35
        for (let row = 24; row <= 28; row++) {
            if (this.textures.snow[row] && this.textures.snow[row][35]) {
                this.snowVegetationTiles[0].push(this.textures.snow[row][35]!);
            }
        }
        
        // BLUE SNOW decorative tiles
        // Rock tiles: rows 26-29, columns 39-41 and rows 26-29, columns 41-42
        for (let row = 26; row <= 29; row++) {
            for (let col = 39; col <= 41; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowRockTiles[1].push(this.textures.snow[row][col]!);
                }
            }
        }
        for (let row = 26; row <= 29; row++) {
            for (let col = 41; col <= 42; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowRockTiles[1].push(this.textures.snow[row][col]!);
                }
            }
        }
        
        // Blue vegetation tiles: rows 24-28, columns 43-46
        for (let row = 24; row <= 28; row++) {
            for (let col = 43; col <= 46; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowVegetationTiles[1].push(this.textures.snow[row][col]!);
                }
            }
        }
        
        // GREY SNOW decorative tiles
        // Rock tiles: rows 38-39, columns 31-32 + row 39, columns 33-34 + rows 36-39, columns 35-36
        for (let row = 38; row <= 39; row++) {
            for (let col = 31; col <= 32; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowRockTiles[2].push(this.textures.snow[row][col]!);
                }
            }
        }
        // row 39, columns 33-34
        if (this.textures.snow[39] && this.textures.snow[39][33]) {
            this.snowRockTiles[2].push(this.textures.snow[39][33]!);
        }
        if (this.textures.snow[39] && this.textures.snow[39][34]) {
            this.snowRockTiles[2].push(this.textures.snow[39][34]!);
        }
        // rows 36-39, columns 35-36
        for (let row = 36; row <= 39; row++) {
            for (let col = 35; col <= 36; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowRockTiles[2].push(this.textures.snow[row][col]!);
                }
            }
        }
        
        // Grey vegetation tiles: rows 29-34, columns 43-46
        for (let row = 29; row <= 34; row++) {
            for (let col = 43; col <= 46; col++) {
                if (this.textures.snow[row] && this.textures.snow[row][col]) {
                    this.snowVegetationTiles[2].push(this.textures.snow[row][col]!);
                }
            }
        }
        
        console.log(`[TilesetManager] Snow tiles loaded:`);
        console.log(`  White: ${this.snowAltTiles[0].length} alt, ${this.snowRockTiles[0].length} rock, ${this.snowVegetationTiles[0].length} vegetation`);
        console.log(`  Blue: ${this.snowAltTiles[1].length} alt, ${this.snowRockTiles[1].length} rock, ${this.snowVegetationTiles[1].length} vegetation`);
        console.log(`  Grey: ${this.snowAltTiles[2].length} alt, ${this.snowRockTiles[2].length} rock, ${this.snowVegetationTiles[2].length} vegetation`);
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
    
    // Get random snow tile with weighted distribution
    getRandomSnowTile(variant: number = 0): Texture | null {
        // Ensure variant is valid (0=white, 1=blue, 2=grey)
        if (variant < 0 || variant > 2) {
            variant = 0;
        }
        
        const rand = Math.random();
        
        // 80% chance for alt tiles (plain snow variations)
        if (rand < 0.80) {
            const altTiles = this.snowAltTiles[variant];
            if (altTiles && altTiles.length > 0) {
                return altTiles[Math.floor(Math.random() * altTiles.length)];
            }
            // Fallback to basic tile if no alt tiles
            return this.getBasicSnowTile(variant);
        }
        // 16% chance for vegetation decorative tiles
        else if (rand < 0.96) {
            const vegetationTiles = this.snowVegetationTiles[variant];
            if (vegetationTiles && vegetationTiles.length > 0) {
                return vegetationTiles[Math.floor(Math.random() * vegetationTiles.length)];
            }
            // Fallback to alt tiles
            const altTiles = this.snowAltTiles[variant];
            if (altTiles && altTiles.length > 0) {
                return altTiles[Math.floor(Math.random() * altTiles.length)];
            }
        }
        // 4% chance for rock decorative tiles
        else {
            const rockTiles = this.snowRockTiles[variant];
            if (rockTiles && rockTiles.length > 0) {
                return rockTiles[Math.floor(Math.random() * rockTiles.length)];
            }
            // Fallback to alt tiles
            const altTiles = this.snowAltTiles[variant];
            if (altTiles && altTiles.length > 0) {
                return altTiles[Math.floor(Math.random() * altTiles.length)];
            }
        }
        
        // Final fallback to basic tile
        return this.getBasicSnowTile(variant);
    }
    
    // Get snow tile for specific coordinates (handles cliff tiles, etc.)
    getSnowTileAt(row: number, col: number): Texture | null {
        if (this.textures.snow[row] && this.textures.snow[row][col]) {
            return this.textures.snow[row][col];
        }
        return null;
    }
    
    /**
     * Slice decorative tileset into individual textures
     */
    private sliceDecorativeTileset(baseTexture: BaseTexture): void {
        const tileSize = this.tileSize;
        
        // Initialize decorative texture array
        this.textures.decorative = [];
        
        // Load entire decorative tileset
        const tilesWide = Math.floor(baseTexture.width / tileSize);
        const tilesHigh = Math.floor(baseTexture.height / tileSize);
        
        console.log(`[TilesetManager] Slicing decorative tileset: ${tilesWide}x${tilesHigh} tiles`);
        
        for (let row = 0; row < tilesHigh; row++) {
            this.textures.decorative[row] = [];
            for (let col = 0; col < tilesWide; col++) {
                this.textures.decorative[row][col] = new Texture(
                    baseTexture,
                    new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
                );
            }
        }
    }
    
    /**
     * Setup mapping of decorative element types to their texture coordinates
     */
    private setupDecorativeElementMap(): void {
        // Trees
        this.decorativeElementMap.set('tree_red_large', { row: 20, col: 0, width: 5, height: 5 });
        this.decorativeElementMap.set('tree_red_medium1', { row: 20, col: 5, width: 4, height: 5 });
        this.decorativeElementMap.set('tree_red_medium2', { row: 20, col: 9, width: 4, height: 5 });
        
        this.decorativeElementMap.set('tree_green_large', { row: 20, col: 13, width: 5, height: 5 });
        this.decorativeElementMap.set('tree_green_medium1', { row: 20, col: 18, width: 4, height: 5 });
        this.decorativeElementMap.set('tree_green_medium2', { row: 20, col: 22, width: 4, height: 5 });
        
        this.decorativeElementMap.set('tree_pink_large', { row: 26, col: 0, width: 5, height: 5 });
        this.decorativeElementMap.set('tree_pink_medium1', { row: 26, col: 5, width: 4, height: 5 });
        this.decorativeElementMap.set('tree_pink_medium2', { row: 26, col: 9, width: 4, height: 5 });
        
        this.decorativeElementMap.set('tree_blue_large', { row: 26, col: 13, width: 5, height: 5 });
        this.decorativeElementMap.set('tree_blue_medium1', { row: 26, col: 18, width: 4, height: 5 });
        this.decorativeElementMap.set('tree_blue_medium2', { row: 26, col: 22, width: 4, height: 5 });
        
        // Bushes (1 row tall)
        this.decorativeElementMap.set('bush_red_2x1', { row: 25, col: 4, width: 2, height: 1 });
        this.decorativeElementMap.set('bush_red_1x1', { row: 25, col: 6, width: 1, height: 1 });
        this.decorativeElementMap.set('bush_green_2x1', { row: 25, col: 17, width: 2, height: 1 });
        this.decorativeElementMap.set('bush_green_1x1', { row: 25, col: 19, width: 1, height: 1 });
        
        // Pink bushes (offset by 6 rows from red)
        this.decorativeElementMap.set('bush_pink_2x1', { row: 31, col: 4, width: 2, height: 1 });
        this.decorativeElementMap.set('bush_pink_1x1', { row: 31, col: 6, width: 1, height: 1 });
        
        // Blue bushes (offset by 6 rows AND 13 columns from red)
        this.decorativeElementMap.set('bush_blue_2x1', { row: 31, col: 17, width: 2, height: 1 });
        this.decorativeElementMap.set('bush_blue_1x1', { row: 31, col: 19, width: 1, height: 1 });
        
        // Decorative cliffs - Light
        this.decorativeElementMap.set('cliff_light_big1', { row: 0, col: 0, width: 4, height: 5 });
        this.decorativeElementMap.set('cliff_light_big2', { row: 1, col: 4, width: 4, height: 4 });
        
        // Decorative cliffs - Dark
        this.decorativeElementMap.set('cliff_dark_big1', { row: 5, col: 0, width: 4, height: 5 });
    }
    
    /**
     * Slice snow decorative tileset into individual textures
     */
    private sliceSnowDecorativeTileset(baseTexture: BaseTexture): void {
        const tileSize = this.tileSize;
        
        // Initialize snow decorative texture array
        this.textures.snowDecorative = [];
        
        // Load entire snow decorative tileset
        const tilesWide = Math.floor(baseTexture.width / tileSize);
        const tilesHigh = Math.floor(baseTexture.height / tileSize);
        
        console.log(`[TilesetManager] Slicing snow decorative tileset: ${tilesWide}x${tilesHigh} tiles`);
        
        for (let row = 0; row < tilesHigh; row++) {
            this.textures.snowDecorative[row] = [];
            for (let col = 0; col < tilesWide; col++) {
                const rect = new Rectangle(
                    col * tileSize,
                    row * tileSize,
                    tileSize,
                    tileSize
                );
                
                this.textures.snowDecorative[row][col] = new Texture(baseTexture, rect);
            }
        }
    }
    
    /**
     * Setup mapping for snow decorative elements
     */
    private setupSnowDecorativeElementMap(): void {
        // Fallen logs
        this.snowDecorativeElementMap.set('log_fallen1', { row: 11, col: 0, width: 3, height: 2 });
        this.snowDecorativeElementMap.set('log_fallen2', { row: 11, col: 9, width: 3, height: 2 });
        this.snowDecorativeElementMap.set('log_fallen3', { row: 11, col: 14, width: 2, height: 2 });
        this.snowDecorativeElementMap.set('log_fallen4', { row: 12, col: 16, width: 2, height: 2 });
        this.snowDecorativeElementMap.set('log_fallen5', { row: 11, col: 23, width: 3, height: 2 });
        this.snowDecorativeElementMap.set('log_fallen6', { row: 14, col: 0, width: 3, height: 2 });
        this.snowDecorativeElementMap.set('log_fallen7', { row: 13, col: 20, width: 2, height: 2 });
        this.snowDecorativeElementMap.set('log_fallen8', { row: 13, col: 23, width: 2, height: 2 });
        
        // Snowy bushes
        this.snowDecorativeElementMap.set('bush_snow1', { row: 17, col: 8, width: 2, height: 2 });
        this.snowDecorativeElementMap.set('bush_snow2', { row: 17, col: 10, width: 1, height: 2 });
        this.snowDecorativeElementMap.set('bush_snow3', { row: 17, col: 11, width: 2, height: 2 });
        this.snowDecorativeElementMap.set('bush_snow4', { row: 17, col: 15, width: 2, height: 2 });
        this.snowDecorativeElementMap.set('bush_snow5', { row: 17, col: 17, width: 3, height: 2 });
        
        // Winter trees
        this.snowDecorativeElementMap.set('tree_winter1', { row: 20, col: 0, width: 3, height: 4 });
        this.snowDecorativeElementMap.set('tree_winter2', { row: 20, col: 6, width: 2, height: 3 });
        this.snowDecorativeElementMap.set('tree_winter3', { row: 21, col: 10, width: 2, height: 3 });
        this.snowDecorativeElementMap.set('tree_winter4', { row: 20, col: 28, width: 2, height: 2 });
        this.snowDecorativeElementMap.set('tree_winter5', { row: 22, col: 28, width: 2, height: 2 });
    }
    
    /**
     * Load tree animation sprite sheets
     */
    private async loadTreeAnimations(): Promise<void> {
        const treeColors = ['A', 'B', 'C', 'D']; // Red, Green, Pink, Blue
        const colorNames = ['red', 'green', 'pink', 'blue'];
        
        // Configuration for each tree type
        const treeConfigs = [
            { prefix: 'tree1', suffix: 'large', frameWidth: 160, frameHeight: 160, cols: 5, rows: 2 },
            { prefix: 'tree2', suffix: 'medium1', frameWidth: 128, frameHeight: 160, cols: 4, rows: 3 },
            { prefix: 'tree3', suffix: 'medium2', frameWidth: 128, frameHeight: 160, cols: 4, rows: 3 }
        ];
        
        for (const config of treeConfigs) {
            for (let i = 0; i < treeColors.length; i++) {
                const color = treeColors[i];
                const treeType = `tree_${colorNames[i]}_${config.suffix}`;
                
                try {
                    // Get the pre-loaded texture from the bundle
                    const texture = Assets.get(`${config.prefix}${color}`);
                    
                    if (texture && texture.baseTexture) {
                        // Slice the sprite sheet based on configuration
                        const frames: Texture[] = [];
                        const { frameWidth, frameHeight, cols, rows } = config;
                        
                        for (let row = 0; row < rows; row++) {
                            for (let col = 0; col < cols; col++) {
                                // Skip the last row for medium trees (it's empty padding)
                                if (config.suffix.includes('medium') && row === rows - 1) {
                                    continue;
                                }
                                
                                const frame = new Texture(
                                    texture.baseTexture,
                                    new Rectangle(
                                        col * frameWidth,
                                        row * frameHeight,
                                        frameWidth,
                                        frameHeight
                                    )
                                );
                                frames.push(frame);
                            }
                        }
                        
                        // Medium trees should have 8 frames (2 rows x 4 cols)
                        // Large trees should have 10 frames (2 rows x 5 cols)
                        this.treeAnimations.set(treeType, frames);
                        console.log(`[TilesetManager] Loaded ${frames.length} animation frames for ${treeType}`);
                    }
                } catch (error) {
                    console.warn(`[TilesetManager] Failed to load tree animation for ${treeType}:`, error);
                }
            }
        }
    }
    
    /**
     * Get animation frames for a tree type
     */
    public getTreeAnimationFrames(treeType: string): Texture[] | null {
        return this.treeAnimations.get(treeType) || null;
    }
    
    /**
     * Get texture for a decorative element type
     */
    public getDecorativeTexture(type: string): Texture | null {
        const elementInfo = this.decorativeElementMap.get(type);
        if (!elementInfo || !this.textures.decorative) {
            return null;
        }
        
        const { row, col, width, height } = elementInfo;
        
        // For multi-tile elements, create a composite texture
        if (width > 1 || height > 1) {
            // For now, just return the top-left tile of multi-tile elements
            // TODO: Implement proper composite texture creation
            return this.textures.decorative[row]?.[col] || null;
        } else {
            // Single tile element
            return this.textures.decorative[row]?.[col] || null;
        }
    }
    
    /**
     * Get texture for a specific tile within a decorative element
     */
    public getDecorativeTileTexture(type: string, offsetX: number, offsetY: number): Texture | null {
        const elementInfo = this.decorativeElementMap.get(type);
        if (!elementInfo || !this.textures.decorative) {
            console.warn(`[TilesetManager] No element info for ${type} or no decorative textures loaded`);
            return null;
        }
        
        const { row, col } = elementInfo;
        const tileRow = row + offsetY;
        const tileCol = col + offsetX;
        
        if (!this.textures.decorative[tileRow]) {
            console.warn(`[TilesetManager] No row ${tileRow} in decorative textures (${type} at offset ${offsetX},${offsetY})`);
            return null;
        }
        
        if (!this.textures.decorative[tileRow][tileCol]) {
            console.warn(`[TilesetManager] No texture at [${tileRow}][${tileCol}] (${type} at offset ${offsetX},${offsetY})`);
            return null;
        }
        
        return this.textures.decorative[tileRow][tileCol];
    }
    
    /**
     * Get texture for a snow decorative element tile
     */
    public getSnowDecorativeTileTexture(type: string, offsetX: number, offsetY: number): Texture | null {
        const elementInfo = this.snowDecorativeElementMap.get(type);
        if (!elementInfo || !this.textures.snowDecorative) {
            console.warn(`[TilesetManager] No element info for ${type} or no snow decorative textures loaded`);
            return null;
        }
        
        const { row, col } = elementInfo;
        const tileRow = row + offsetY;
        const tileCol = col + offsetX;
        
        if (!this.textures.snowDecorative[tileRow]) {
            console.warn(`[TilesetManager] No row ${tileRow} in snow decorative textures (${type} at offset ${offsetX},${offsetY})`);
            return null;
        }
        
        if (!this.textures.snowDecorative[tileRow][tileCol]) {
            console.warn(`[TilesetManager] No texture at [${tileRow}][${tileCol}] (${type} at offset ${offsetX},${offsetY})`);
            return null;
        }
        
        return this.textures.snowDecorative[tileRow][tileCol];
    }
}