/**
 * @fileoverview CliffAutotiler - Advanced tile autotiling for seamless terrain
 * 
 * MIGRATION NOTES:
 * - Converted from CliffAutotilerNew.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for tile structures
 * - Preserved all autotiling logic and biome transition handling
 * 
 * ARCHITECTURE ROLE:
 * - Converts elevation data to visually seamless cliff/transition tiles
 * - Implements 8-directional neighbor analysis with diagonal support
 * - Manages biome-aware tile selection (green vs dark grass variants)
 * - Provides smooth visual transitions across chunk boundaries
 * 
 * AUTOTILING ALGORITHM:
 * 8-bit neighbor bitmask system:
 * - Each of 8 directions (4 cardinal + 4 diagonal) = 1 bit
 * - 256 possible combinations mapped to appropriate tile variants
 * - Priority-based selection: corners → inner corners → edges → fallbacks
 * 
 * BIOME INTEGRATION:
 * Tileset structure: Green tiles columns 0-10, Dark grass columns 11-21
 * Same autotiling logic applies to both biomes with column offset
 * Biome transitions handled by checking neighbor biome data
 * 
 * CHUNK COMPATIBILITY:
 * Autotiler works across chunk boundaries seamlessly
 * Each tile considers neighbors in all 8 directions regardless of chunk
 * ChunkedWorldRenderer calls autotiler per tile with world-wide neighbor data
 * 
 * PERFORMANCE CONSIDERATIONS:
 * Priority-based evaluation stops at first match (faster than lookup tables)
 * Bitmask calculation optimized for common cases (corners, edges)
 * Compatible with both full rendering and chunked rendering modes
 */

import { GAME_CONSTANTS, BIOME_TYPES } from '../../../../shared/constants/GameConstants.js';
import type { TilesetManager } from './TilesetManager.js';
import type { Texture } from 'pixi.js';

// Type definitions
interface BitMasks {
    NORTH: number;
    NORTHEAST: number;
    EAST: number;
    SOUTHEAST: number;
    SOUTH: number;
    SOUTHWEST: number;
    WEST: number;
    NORTHWEST: number;
}

interface TileCoordinates {
    row: number;
    col: number;
    type: string;
    useVariations?: boolean;
    isDarkGrass?: boolean;
}

interface TileResult {
    texture: Texture | null;
    type: string;
}

interface TransitionCoordinates {
    row: number;
    col: number;
    type: string;
}

export class CliffAutotiler {
    private tilesets: TilesetManager;
    private BITS: BitMasks;
    private tileMap: Map<number, TileCoordinates>;

    constructor(tilesets: TilesetManager) {
        this.tilesets = tilesets;
        
        // 8-bit system including diagonals
        this.BITS = {
            NORTH:     1,   // bit 0
            NORTHEAST: 2,   // bit 1
            EAST:      4,   // bit 2
            SOUTHEAST: 8,   // bit 3
            SOUTH:     16,  // bit 4
            SOUTHWEST: 32,  // bit 5
            WEST:      64,  // bit 6
            NORTHWEST: 128  // bit 7
        };
        
        // Clear tile mapping based on our understanding
        this.tileMap = this.createTileMapping();
    }
    
    private createTileMapping(): Map<number, TileCoordinates> {
        // Instead of mapping every possible bitmask combination,
        // we'll use a priority-based approach in getTileTexture()
        return new Map();
    }
    
    /**
     * Determine tile type based on bitmask using priority logic
     * @param bitmask - 8-bit neighbor bitmask
     * @param isDarkGrass - Whether to use dark grass tileset
     * @param biomeId - The biome type (0=grass, 1=dark grass, 2=snow)
     */
    private determineTileType(bitmask: number, isDarkGrass: boolean = false, biomeId: number = 0): TileCoordinates {
        // Base column offset for biome
        let colOffset = 0;
        if (biomeId === BIOME_TYPES.SNOW) {
            // Snow uses different tileset, but we'll use variant 0 (white) for now
            colOffset = 0; // White snow
        } else if (isDarkGrass) {
            colOffset = 11; // Dark grass
        }
        // Check cardinal directions
        const hasNorth = (bitmask & this.BITS.NORTH) !== 0;
        const hasEast = (bitmask & this.BITS.EAST) !== 0;
        const hasSouth = (bitmask & this.BITS.SOUTH) !== 0;
        const hasWest = (bitmask & this.BITS.WEST) !== 0;
        
        // Check diagonals
        const hasNortheast = (bitmask & this.BITS.NORTHEAST) !== 0;
        const hasNorthwest = (bitmask & this.BITS.NORTHWEST) !== 0;
        const hasSoutheast = (bitmask & this.BITS.SOUTHEAST) !== 0;
        const hasSouthwest = (bitmask & this.BITS.SOUTHWEST) !== 0;
        
        // Priority 1: Corners (two adjacent cardinals)
        if (hasNorth && hasWest) return { row: 0, col: 0 + colOffset, type: "NW corner" };
        if (hasNorth && hasEast) return { row: 0, col: 6 + colOffset, type: "NE corner" };
        if (hasSouth && hasWest) return { row: 5, col: 0 + colOffset, type: "SW corner" };
        if (hasSouth && hasEast) return { row: 5, col: 6 + colOffset, type: "SE corner" };
        
        // Priority 2: Pure diagonal inner corners (diagonal but NO adjacent cardinals)
        if (hasNorthwest && !hasNorth && !hasWest) return { row: 2, col: 7 + colOffset, type: "NW inner corner" };
        if (hasNortheast && !hasNorth && !hasEast) return { row: 2, col: 10 + colOffset, type: "NE inner corner" };
        if (hasSouthwest && !hasSouth && !hasWest) return { row: 4, col: 8 + colOffset, type: "SW inner corner" };
        if (hasSoutheast && !hasSouth && !hasEast) return { row: 4, col: 9 + colOffset, type: "SE inner corner" };
        
        // Priority 3: Single cardinal edges
        if (hasNorth && !hasEast && !hasSouth && !hasWest) return { row: 0, col: 1 + colOffset, type: "top edge" };
        if (hasEast && !hasNorth && !hasSouth && !hasWest) return { row: 1, col: 6 + colOffset, type: "right edge" };
        if (hasSouth && !hasNorth && !hasEast && !hasWest) return { row: 5, col: 1 + colOffset, type: "bottom edge" };
        if (hasWest && !hasNorth && !hasEast && !hasSouth) return { row: 1, col: 0 + colOffset, type: "left edge" };
        
        // Priority 4: Edge variants
        // West edge variants (when not alone)
        if (hasWest && !hasEast) {
            if (hasNorth || hasSouth) return { row: 2, col: 0 + colOffset, type: "left edge variant" };
            return { row: 3, col: 0 + colOffset, type: "left edge variant 2" };
        }
        
        // East edge variants
        if (hasEast && !hasWest) {
            if (hasNorth || hasSouth) return { row: 2, col: 6 + colOffset, type: "right edge variant" };
            return { row: 3, col: 6 + colOffset, type: "right edge variant 2" };
        }
        
        // North edge variants
        if (hasNorth && !hasSouth) {
            if (hasWest || hasEast) return { row: 0, col: 2 + colOffset, type: "top edge variant" };
            return { row: 0, col: 3 + colOffset, type: "top edge variant 2" };
        }
        
        // South edge variants
        if (hasSouth && !hasNorth) {
            if (hasWest || hasEast) return { row: 5, col: 2 + colOffset, type: "bottom edge variant" };
            return { row: 5, col: 3 + colOffset, type: "bottom edge variant 2" };
        }
        
        // Priority 5: Fallback for any cardinal direction
        if (hasNorth) return { row: 0, col: 4 + colOffset, type: "top edge fallback" };
        if (hasEast) return { row: 1, col: 6 + colOffset, type: "right edge fallback" };
        if (hasSouth) return { row: 5, col: 4 + colOffset, type: "bottom edge fallback" };
        if (hasWest) return { row: 1, col: 0 + colOffset, type: "left edge fallback" };
        
        // Priority 6: Plateau interior tiles (no neighbors) - use variations
        return { 
            row: 1, 
            col: 1 + colOffset, 
            type: "grass", 
            useVariations: true,
            isDarkGrass: isDarkGrass
        };
    }
    
    /**
     * Calculate bitmask for a tile including diagonals
     */
    private calculateBitmask(x: number, y: number, elevationData: number[][]): number {
        const width = elevationData[0].length;
        const height = elevationData.length;
        const currentElevation = elevationData[y][x];
        
        let bitmask = 0;
        
        // Helper function to check neighbor elevation
        const isLowerOrEdge = (nx: number, ny: number): boolean => {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                return true; // World edge counts as cliff
            }
            return elevationData[ny][nx] < currentElevation;
        };
        
        // Check all 8 directions
        if (isLowerOrEdge(x, y - 1)) bitmask |= this.BITS.NORTH;       // North
        if (isLowerOrEdge(x + 1, y - 1)) bitmask |= this.BITS.NORTHEAST; // Northeast
        if (isLowerOrEdge(x + 1, y)) bitmask |= this.BITS.EAST;        // East
        if (isLowerOrEdge(x + 1, y + 1)) bitmask |= this.BITS.SOUTHEAST; // Southeast
        if (isLowerOrEdge(x, y + 1)) bitmask |= this.BITS.SOUTH;       // South
        if (isLowerOrEdge(x - 1, y + 1)) bitmask |= this.BITS.SOUTHWEST; // Southwest
        if (isLowerOrEdge(x - 1, y)) bitmask |= this.BITS.WEST;        // West
        if (isLowerOrEdge(x - 1, y - 1)) bitmask |= this.BITS.NORTHWEST; // Northwest
        
        return bitmask;
    }
    
    /**
     * Get the appropriate tile texture for a position
     * @param x - Tile X coordinate
     * @param y - Tile Y coordinate
     * @param elevationData - 2D elevation map
     * @param processedTiles - Processed tile types
     * @param biomeData - 2D biome map (0=green, 1=dark)
     */
    getTileTexture(x: number, y: number, elevationData: number[][], processedTiles: any[][] | null, biomeData?: number[][]): TileResult {
        // STEP 1: BIOME DETERMINATION FIRST
        // Determine biome type (0=green grass, 1=dark grass, 2=snow) - this drives everything else
        const biomeId = biomeData && biomeData[y] ? biomeData[y][x] : 0;
        const isDarkGrass = biomeId === BIOME_TYPES.DARK_GRASS;
        const isSnow = biomeId === BIOME_TYPES.SNOW;
        const currentElevation = elevationData[y][x];
        
        // Debug logging for biome selection (only log occasionally to avoid spam)
        if (Math.random() < 0.001) {
            console.log(`[CliffAutotiler] Tile (${x},${y}): biome=${isDarkGrass ? 'dark' : 'green'}, elevation=${currentElevation}`);
        }
        
        // STEP 2: CLIFF/TERRAIN GENERATION BASED ON BIOME
        // Ground level tiles - biome-specific handling
        if (currentElevation === 0) {
            // Snow biomes get white snow (variant 0) for now
            if (isSnow) {
                return {
                    texture: this.tilesets.getRandomSnowTile(0), // White snow
                    type: 'snow'
                };
            }
            
            // UNIDIRECTIONAL TRANSITIONS: Only green tiles get transitions when next to dark
            // This prevents both boundary tiles from becoming transitions
            if (!isDarkGrass) {  // Only apply transitions to GREEN tiles
                const transitionTile = this.getBiomeTransitionTile(x, y, biomeData);
                if (transitionTile) {
                    return transitionTile;
                }
            }
            
            // No transition needed - use biome-appropriate pure tiles
            return { 
                texture: isDarkGrass ? this.tilesets.getRandomPureDarkGrass() : this.tilesets.getRandomPureGrass(),
                type: 'grass'
            };
        }
        
        // Elevated tiles - cliff generation using biome-appropriate tileset
        const bitmask = this.calculateBitmask(x, y, elevationData);
        let tileCoords = this.determineTileType(bitmask, isDarkGrass, biomeId);
        
        // Randomize bottom edge tiles (columns 1-5 for horizontal edges)
        if (tileCoords.type.includes("bottom edge") && tileCoords.row === 5) {
            // Only randomize if it's using the basic bottom edge tile (col 1)
            // Other variants (cols 2-4) are already properly assigned by determineTileType
            if (tileCoords.col === 1) {
                tileCoords = { ...tileCoords }; // Copy to avoid modifying original
                tileCoords.col = 1 + Math.floor(Math.random() * 5); // Columns 1-5 only
            }
        }
        
        // Debug logging
        if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
            console.log(`[CliffAutotiler] Tile at (${x}, ${y}): elevation=${currentElevation}, bitmask=${bitmask}, tile=[${tileCoords.row}, ${tileCoords.col}], type=${tileCoords.type}`);
            
            // Special logging for bottom edges
            if (tileCoords.type.includes("bottom edge")) {
                if (tileCoords.col === 6) {
                    console.log(`[CliffAutotiler] ❌ BUG: Bottom edge using corner tile (5,6)!`);
                } else {
                    console.log(`[CliffAutotiler] ✅ CORRECT: Bottom edge using tile (5,${tileCoords.col})`);
                }
            }
            if (tileCoords.type.includes("SE corner")) {
                console.log(`[CliffAutotiler] ✅ CORRECT: SE corner using tile (5,6)`);
            }
        }
        
        // Use appropriate texture based on tile type and biome
        let texture: Texture | null = null;
        if (tileCoords.useVariations && tileCoords.type === "grass") {
            // Use grass/snow variations for plateau interiors based on biome
            if (isSnow) {
                texture = this.tilesets.getRandomSnowTile(0); // White snow for now
            } else {
                texture = tileCoords.isDarkGrass ? 
                    this.tilesets.getRandomPlateauDarkGrass() : 
                    this.tilesets.getRandomPlateauGrass();
            }
        } else {
            // Use exact tile for cliff edges, corners, etc.
            const tileset = isSnow ? this.tilesets.textures.snow : this.tilesets.textures.terrain;
            const row = tileset[tileCoords.row];
            if (row && row[tileCoords.col]) {
                texture = row[tileCoords.col];
            } else {
                // Better error handling for missing textures
                if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                    console.log(`[CliffAutotiler] ❌ MISSING TEXTURE: No texture at (${tileCoords.row}, ${tileCoords.col}) for tile (${x}, ${y}), type: ${tileCoords.type}`);
                    if (isDarkGrass) {
                        console.log(`[CliffAutotiler] Dark grass biome - trying fallback to green grass texture`);
                        // Try fallback to green grass equivalent
                        const fallbackCol = tileCoords.col - 11;
                        if (row && row[fallbackCol]) {
                            texture = row[fallbackCol];
                            console.log(`[CliffAutotiler] ✅ Using fallback texture (${tileCoords.row}, ${fallbackCol})`);
                        }
                    }
                }
                
                // If still no texture, this will remain null and might cause rendering issues
                if (!texture && GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                    console.log(`[CliffAutotiler] ❌ CRITICAL: No texture available for cliff tile at (${x}, ${y})`);
                }
            }
        }
        
        return {
            texture: texture,
            type: `${tileCoords.row},${tileCoords.col}`
        };
    }
    
    /**
     * Get cliff extension texture for 2-tile height effect
     * @param x - Tile X coordinate
     * @param y - Tile Y coordinate
     * @param elevationData - 2D elevation map
     * @param processedTiles - Processed tile types
     * @param biomeData - 2D biome map (0=green, 1=dark)
     */
    getCliffExtensionTexture(x: number, y: number, elevationData: number[][], processedTiles: any[][] | null, biomeData?: number[][]): Texture | null {
        // STEP 1: BIOME DETERMINATION FIRST
        // Determine biome type for extension - this drives which tileset to use
        const biomeId = biomeData && biomeData[y] ? biomeData[y][x] : 0;
        const isDarkGrass = biomeId === BIOME_TYPES.DARK_GRASS;
        const isSnow = biomeId === BIOME_TYPES.SNOW;
        
        const width = elevationData[0].length;
        const height = elevationData.length;
        const currentElevation = elevationData[y][x];
        
        // Only add extensions below cliff edges
        if (y + 1 >= height) return null;
        
        const belowElevation = elevationData[y + 1][x];
        if (belowElevation >= currentElevation) return null; // No cliff below
        
        // Get the current tile type to determine extension
        const currentTile = processedTiles && processedTiles[y] ? processedTiles[y][x] : null;
        
        // If we have processed tile data, use it
        if (currentTile) {
            const [row, col] = currentTile.split(',').map(Number);
            
            // Add extensions for row 5 tiles (both green and dark grass use same row)
            if (row === 5) {
                // For extension tiles, we need to handle biome offset correctly
                // The extension row (6) has the same structure as main tileset
                const tileset = isSnow ? this.tilesets.textures.snow : this.tilesets.textures.terrain;
                const extensionRow = tileset[6];
                if (extensionRow && extensionRow[col]) {
                    const extensionTexture = extensionRow[col];
                    if (extensionTexture) {
                        if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                            console.log(`[CliffAutotiler] Extension at (${x}, ${y + 1}) using (6, ${col}) below (${row}, ${col})`);
                        }
                        return extensionTexture;
                    } else {
                        if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                            console.log(`[CliffAutotiler] ❌ No extension texture found at (6, ${col}) for bottom cliff at (${x}, ${y})`);
                        }
                    }
                } else {
                    if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                        console.log(`[CliffAutotiler] ❌ Extension row missing or no texture at column ${col} for bottom cliff at (${x}, ${y})`);
                    }
                }
            }
        } else {
            // Fallback: if no processed tiles, calculate the tile type directly
            // This ensures extensions are created even if processed tile data is missing
            const bitmask = this.calculateBitmask(x, y, elevationData);
            const tileCoords = this.determineTileType(bitmask, isDarkGrass, biomeId);
            
            if (tileCoords.row === 5) {
                // This is a bottom edge tile that needs an extension
                const tileset = isSnow ? this.tilesets.textures.snow : this.tilesets.textures.terrain;
                const extensionRow = tileset[6];
                if (extensionRow && extensionRow[tileCoords.col]) {
                    const extensionTexture = extensionRow[tileCoords.col];
                    if (extensionTexture) {
                        if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                            console.log(`[CliffAutotiler] Fallback extension at (${x}, ${y + 1}) using (6, ${tileCoords.col}) below (${tileCoords.row}, ${tileCoords.col})`);
                        }
                        return extensionTexture;
                    } else if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                        console.log(`[CliffAutotiler] ❌ Fallback failed: No extension texture at (6, ${tileCoords.col})`);
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Get biome transition tile if this position is at a biome boundary
     * @param x - Tile X coordinate
     * @param y - Tile Y coordinate
     * @param biomeData - 2D biome map (0=green, 1=dark)
     * @returns Transition tile or null if no transition needed
     */
    getBiomeTransitionTile(x: number, y: number, biomeData?: number[][]): TileResult | null {
        if (!biomeData || !biomeData[y]) return null;
        
        const width = biomeData[0].length;
        const height = biomeData.length;
        const currentBiome = biomeData[y][x];
        
        // Calculate biome bitmask (similar to elevation bitmask but for biomes)
        let biomeBitmask = 0;
        
        // Helper function to check neighbor biome
        const isOtherBiome = (nx: number, ny: number): boolean => {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                return false; // World edge - treat as same biome
            }
            return biomeData[ny][nx] !== currentBiome;
        };
        
        // Check all 8 directions for biome differences
        if (isOtherBiome(x, y - 1)) biomeBitmask |= this.BITS.NORTH;       // North
        if (isOtherBiome(x + 1, y - 1)) biomeBitmask |= this.BITS.NORTHEAST; // Northeast
        if (isOtherBiome(x + 1, y)) biomeBitmask |= this.BITS.EAST;        // East
        if (isOtherBiome(x + 1, y + 1)) biomeBitmask |= this.BITS.SOUTHEAST; // Southeast
        if (isOtherBiome(x, y + 1)) biomeBitmask |= this.BITS.SOUTH;       // South
        if (isOtherBiome(x - 1, y + 1)) biomeBitmask |= this.BITS.SOUTHWEST; // Southwest
        if (isOtherBiome(x - 1, y)) biomeBitmask |= this.BITS.WEST;        // West
        if (isOtherBiome(x - 1, y - 1)) biomeBitmask |= this.BITS.NORTHWEST; // Northwest
        
        // If no neighbors are different biomes, no transition needed
        if (biomeBitmask === 0) return null;
        
        // Determine transition tile based on bitmask
        const transitionCoords = this.determineBiomeTransitionType(biomeBitmask, currentBiome);
        if (!transitionCoords) return null;
        
        // Get the transition texture
        const row = this.tilesets.textures.terrain[transitionCoords.row];
        if (!row || !row[transitionCoords.col]) return null;
        
        const texture = row[transitionCoords.col];
        if (!texture) return null;
        
        return {
            texture: texture,
            type: `transition_${transitionCoords.row},${transitionCoords.col}`
        };
    }
    
    /**
     * Determine the appropriate transition tile based on biome bitmask
     * @param bitmask - 8-bit neighbor bitmask for biome differences
     * @param currentBiome - Current tile's biome (0=green, 1=dark)
     * @returns Transition tile coordinates or null
     */
    private determineBiomeTransitionType(bitmask: number, currentBiome: number): TransitionCoordinates | null {
        // Check cardinal directions
        const hasNorth = (bitmask & this.BITS.NORTH) !== 0;
        const hasEast = (bitmask & this.BITS.EAST) !== 0;
        const hasSouth = (bitmask & this.BITS.SOUTH) !== 0;
        const hasWest = (bitmask & this.BITS.WEST) !== 0;
        
        // Check diagonals
        const hasNortheast = (bitmask & this.BITS.NORTHEAST) !== 0;
        const hasNorthwest = (bitmask & this.BITS.NORTHWEST) !== 0;
        const hasSoutheast = (bitmask & this.BITS.SOUTHEAST) !== 0;
        const hasSouthwest = (bitmask & this.BITS.SOUTHWEST) !== 0;
        
        // Since we only apply transitions to green tiles, always use green-to-dark transitions
        // Green grass uses columns 0-4 (green to dark transitions)
        const baseCol = 0;
        
        // REVERSED LOGIC: Transition tiles represent the dark area's edges, not neighbor directions
        // Dark SOUTH of green = TOP of dark area = use NORTH edge (row 32)
        // Dark NORTH of green = BOTTOM of dark area = use SOUTH edge (row 36)
        
        // Priority 1: Inner corners (two adjacent cardinals = outer corner of dark area)
        if (hasSouth && hasEast) return { row: 30, col: baseCol + 2, type: "NW inner corner (dark SE corner)" };
        if (hasSouth && hasWest) return { row: 30, col: baseCol + 3, type: "NE inner corner (dark SW corner)" };
        if (hasNorth && hasEast) return { row: 31, col: baseCol + 2, type: "SW inner corner (dark NE corner)" };
        if (hasNorth && hasWest) return { row: 31, col: baseCol + 3, type: "SE inner corner (dark NW corner)" };
        
        // Priority 2: Outer diagonal edges (diagonal only, no adjacent cardinals = inner corner of dark area)
        if (hasSoutheast && !hasSouth && !hasEast) return { row: 32, col: baseCol + 0, type: "NW outer diagonal edge" };
        if (hasSouthwest && !hasSouth && !hasWest) return { row: 32, col: baseCol + 4, type: "NE outer diagonal edge" };
        if (hasNortheast && !hasNorth && !hasEast) return { row: 36, col: baseCol + 0, type: "SW outer diagonal edge" };
        if (hasNorthwest && !hasNorth && !hasWest) return { row: 36, col: baseCol + 4, type: "SE outer diagonal edge" };
        
        // Priority 3: Single cardinal edges (REVERSED)
        if (hasSouth && !hasEast && !hasNorth && !hasWest) return { row: 32, col: baseCol + 1, type: "N edge (dark south)" };
        if (hasEast && !hasNorth && !hasSouth && !hasWest) return { row: 33, col: baseCol + 0, type: "W edge (dark east)" };
        if (hasWest && !hasNorth && !hasSouth && !hasEast) return { row: 34, col: baseCol + 4, type: "E edge (dark west)" };
        if (hasNorth && !hasEast && !hasSouth && !hasWest) return { row: 36, col: baseCol + 1, type: "S edge (dark north)" };
        
        // Priority 4: Edge variants and combinations (REVERSED)
        // Dark west (east edge of dark area) - use east edge variants
        if (hasWest && !hasEast) {
            // Use east edge tiles for dark areas to our west
            if (hasNorth || hasSouth) return { row: 34, col: baseCol + 4, type: "E edge variant (dark west)" };
            return { row: 35, col: baseCol + 4, type: "E edge variant 2 (dark west)" };
        }
        
        // Dark east (west edge of dark area) - use west edge variants  
        if (hasEast && !hasWest) {
            if (hasNorth || hasSouth) return { row: 34, col: baseCol + 0, type: "W edge variant (dark east)" };
            return { row: 35, col: baseCol + 0, type: "W edge variant 2 (dark east)" };
        }
        
        // Dark south (north edge of dark area) - use north edge variants
        if (hasSouth && !hasNorth) {
            if (hasWest || hasEast) return { row: 32, col: baseCol + 2, type: "N edge variant (dark south)" };
            return { row: 32, col: baseCol + 3, type: "N edge variant 2 (dark south)" };
        }
        
        // Dark north (south edge of dark area) - use south edge variants
        if (hasNorth && !hasSouth) {
            if (hasWest || hasEast) return { row: 36, col: baseCol + 2, type: "S edge variant (dark north)" };
            return { row: 36, col: baseCol + 3, type: "S edge variant 2 (dark north)" };
        }
        
        // Priority 5: Fallback for any cardinal direction (REVERSED)
        if (hasSouth) return { row: 32, col: baseCol + 1, type: "N edge fallback (dark south)" };
        if (hasEast) return { row: 33, col: baseCol + 0, type: "W edge fallback (dark east)" };
        if (hasWest) return { row: 34, col: baseCol + 4, type: "E edge fallback (dark west)" };
        if (hasNorth) return { row: 36, col: baseCol + 1, type: "S edge fallback (dark north)" };
        
        // Priority 6: No transition needed - this shouldn't happen if bitmask > 0
        return null;
    }
}