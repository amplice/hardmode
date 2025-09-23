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
    needsGrassBase?: boolean;
    needsSandBase?: boolean;  // For grass-to-desert transition tiles
    overlay?: {
        texture: Texture;
        type: string;
    };
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
     * @param snowVariant - Snow variant (0=white, 1=blue, 2=grey) - only used when biomeId is snow
     */
    private determineTileType(bitmask: number, isDarkVariant: boolean = false, biomeId: number = 0, snowVariant: number = 0): TileCoordinates {
        // Determine if this is desert biome
        const isDesert = biomeId === BIOME_TYPES.LIGHT_SAND || biomeId === BIOME_TYPES.DARK_SAND;
        
        // Base column offset for biome
        let colOffset = 0;
        if (biomeId === BIOME_TYPES.SNOW) {
            // Snow uses different tileset with variant-based offsets
            // White = 0, Blue = +12, Grey = +24
            colOffset = snowVariant * 12;
        } else if (isDesert) {
            // Desert: light sand = 0, dark sand = +10
            colOffset = isDarkVariant ? 10 : 0;
        } else if (isDarkVariant) {
            // Grass: green = 0, dark = +11
            colOffset = 11;
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
        // Desert uses column 5 for NE/SE corners, grass uses column 6
        const neCornerCol = isDesert ? 5 : 6;
        if (hasNorth && hasWest) return { row: 0, col: 0 + colOffset, type: "NW corner" };
        if (hasNorth && hasEast) return { row: 0, col: neCornerCol + colOffset, type: "NE corner" };
        if (hasSouth && hasWest) return { row: 5, col: 0 + colOffset, type: "SW corner" };
        if (hasSouth && hasEast) return { row: 5, col: neCornerCol + colOffset, type: "SE corner" };
        
        // Priority 2: Pure diagonal inner corners (diagonal but NO adjacent cardinals)
        // Desert inner corners are offset by -1 column compared to grass
        if (isDesert) {
            if (hasNorthwest && !hasNorth && !hasWest) return { row: 2, col: 6 + colOffset, type: "NW inner corner" };
            if (hasNortheast && !hasNorth && !hasEast) return { row: 2, col: 9 + colOffset, type: "NE inner corner" };
            if (hasSouthwest && !hasSouth && !hasWest) return { row: 4, col: 7 + colOffset, type: "SW inner corner" };
            if (hasSoutheast && !hasSouth && !hasEast) return { row: 4, col: 8 + colOffset, type: "SE inner corner" };
        } else {
            if (hasNorthwest && !hasNorth && !hasWest) return { row: 2, col: 7 + colOffset, type: "NW inner corner" };
            if (hasNortheast && !hasNorth && !hasEast) return { row: 2, col: 10 + colOffset, type: "NE inner corner" };
            if (hasSouthwest && !hasSouth && !hasWest) return { row: 4, col: 8 + colOffset, type: "SW inner corner" };
            if (hasSoutheast && !hasSouth && !hasEast) return { row: 4, col: 9 + colOffset, type: "SE inner corner" };
        }
        
        // Priority 3: Single cardinal edges
        if (hasNorth && !hasEast && !hasSouth && !hasWest) return { row: 0, col: 1 + colOffset, type: "top edge" };
        if (hasEast && !hasNorth && !hasSouth && !hasWest) return { row: 1, col: neCornerCol + colOffset, type: "right edge" };
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
            if (hasNorth || hasSouth) return { row: 2, col: neCornerCol + colOffset, type: "right edge variant" };
            return { row: 3, col: neCornerCol + colOffset, type: "right edge variant 2" };
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
            isDarkGrass: isDarkVariant && !isDesert
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
     * @param snowVariantData - 2D snow variant map (0=white, 1=blue, 2=grey)
     */
    getTileTexture(x: number, y: number, elevationData: number[][], processedTiles: any[][] | null, biomeData?: number[][], snowVariantData?: number[][]): TileResult {
        // Debug: Log function call occasionally
        if (Math.random() < 0.0001) {
            console.log(`[getTileTexture] Called for (${x},${y}), biomeData exists: ${!!biomeData}, elevationData exists: ${!!elevationData}`);
            if (biomeData && biomeData[y]) {
                console.log(`[getTileTexture] Biome at (${x},${y}): ${biomeData[y][x]}`);
            }
        }
        
        // STEP 1: BIOME DETERMINATION FIRST
        // Determine biome type - this drives everything else
        const biomeId = biomeData && biomeData[y] ? biomeData[y][x] : 0;
        const isDarkGrass = biomeId === BIOME_TYPES.DARK_GRASS;
        const isSnow = biomeId === BIOME_TYPES.SNOW;
        const isLightSand = biomeId === BIOME_TYPES.LIGHT_SAND;
        const isDarkSand = biomeId === BIOME_TYPES.DARK_SAND;
        const isDesert = isLightSand || isDarkSand;
        const currentElevation = elevationData[y] && elevationData[y][x] !== undefined ? elevationData[y][x] : 0;
        
        // Debug logging for biome selection (only log occasionally to avoid spam)
        if (Math.random() < 0.001) {
            console.log(`[CliffAutotiler] Tile (${x},${y}): biome=${isDarkGrass ? 'dark' : 'green'}, elevation=${currentElevation}`);
        }
        
        // STEP 2: CLIFF/TERRAIN GENERATION BASED ON BIOME
        // Ground level tiles - biome-specific handling
        if (currentElevation === 0) {
            // Snow biomes - handle snow tiles and snow variant transitions
            if (isSnow) {
                const snowVariant = snowVariantData && snowVariantData[y] ? snowVariantData[y][x] : 0;
                
                // Check for snow variant transitions (only white snow gets transitions)
                if (snowVariant === 0 && snowVariantData) { // White snow
                    const snowTransitionTile = this.getSnowVariantTransitionTile(x, y, snowVariantData);
                    if (snowTransitionTile) {
                        return snowTransitionTile;
                    }
                }
                
                // No transition needed - return pure snow tile
                return {
                    texture: this.tilesets.getRandomSnowTile(snowVariant),
                    type: 'snow'
                };
            }
            
            // UNIDIRECTIONAL TRANSITIONS: Only green tiles get transitions when next to dark
            // This prevents both boundary tiles from becoming transitions
            if (biomeId === BIOME_TYPES.GRASS) {  // Only apply transitions to GREEN tiles (biomeId 0)
                
                // Check for different neighbor types
                let hasSnowNeighbor = false;
                let hasDesertNeighbor = false;
                
                if (biomeData) {
                    const width = biomeData[0].length;
                    const height = biomeData.length;
                    
                    // Quick check for any snow or desert neighbors
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const neighborBiome = biomeData[ny][nx];
                                if (neighborBiome === BIOME_TYPES.SNOW) {
                                    hasSnowNeighbor = true;
                                } else if (neighborBiome === BIOME_TYPES.LIGHT_SAND || neighborBiome === BIOME_TYPES.DARK_SAND) {
                                    hasDesertNeighbor = true;
                                }
                            }
                        }
                    }
                }
                
                // Check for transitions in priority order
                if (hasSnowNeighbor) {
                    // Apply grass-to-snow transitions
                    const snowTransitionTile = this.getGrassToSnowTransitionTile(x, y, biomeData);
                    if (snowTransitionTile) {
                        return snowTransitionTile;
                    }
                } else if (hasDesertNeighbor) {
                    // Apply grass-to-desert transitions
                    const desertTransitionTile = this.getGrassToDesertTransition(x, y, biomeData);
                    if (desertTransitionTile) {
                        return desertTransitionTile;
                    }
                } else {
                    // Apply grass-to-dark-grass transitions  
                    const transitionTile = this.getBiomeTransitionTile(x, y, biomeData);
                    if (transitionTile) {
                        return transitionTile;
                    }
                }
            }
            
            // Desert biomes - handle desert tiles and transitions
            if (isDesert) {
                // For desert, DARK sand gets transitions when adjacent to light sand (opposite of grass)
                if (isDarkSand) {
                    const desertTransitionTile = this.getDesertSandTransition(x, y, biomeData);
                    if (desertTransitionTile) {
                        return desertTransitionTile;
                    }
                }
                
                // Return pure desert tile
                return {
                    texture: isLightSand ? this.tilesets.getRandomLightSand() : this.tilesets.getRandomDarkSand(),
                    type: 'desert'
                };
            }
            
            // No transition needed - use biome-appropriate pure grass tiles
            return { 
                texture: isDarkGrass ? this.tilesets.getRandomPureDarkGrass() : this.tilesets.getRandomPureGrass(),
                type: 'grass'
            };
        }
        
        // Elevated tiles - cliff generation using biome-appropriate tileset
        const bitmask = this.calculateBitmask(x, y, elevationData);
        const snowVariant = (isSnow && snowVariantData && snowVariantData[y]) ? snowVariantData[y][x] : 0;
        let tileCoords = this.determineTileType(bitmask, isDarkGrass || isDarkSand, biomeId, snowVariant);
        
        // Randomize bottom edge tiles (desert uses columns 1-4, grass uses 1-5)
        if (tileCoords.type.includes("bottom edge") && tileCoords.row === 5) {
            // Only randomize if it's using the basic bottom edge tile (col 1)
            // Other variants (cols 2-4) are already properly assigned by determineTileType
            if (tileCoords.col === 1) {
                tileCoords = { ...tileCoords }; // Copy to avoid modifying original
                const maxCols = isDesert ? 4 : 5; // Desert has 4 variations, grass has 5
                tileCoords.col = 1 + Math.floor(Math.random() * maxCols);
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
            // Use biome-appropriate variations for plateau interiors
            if (isSnow) {
                const snowVariant = snowVariantData && snowVariantData[y] ? snowVariantData[y][x] : 0;
                texture = this.tilesets.getRandomSnowTile(snowVariant);
            } else if (isDesert) {
                texture = isLightSand ? 
                    this.tilesets.getRandomLightSand() : 
                    this.tilesets.getRandomDarkSand();
            } else {
                texture = tileCoords.isDarkGrass ? 
                    this.tilesets.getRandomPlateauDarkGrass() : 
                    this.tilesets.getRandomPlateauGrass();
            }
        } else {
            // Use exact tile for cliff edges, corners, etc.
            const tileset = isSnow ? this.tilesets.textures.snow : 
                          isDesert ? this.tilesets.textures.desert :
                          this.tilesets.textures.terrain;
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
     * @param snowVariantData - 2D snow variant map (0=white, 1=blue, 2=grey)
     */
    getCliffExtensionTexture(x: number, y: number, elevationData: number[][], processedTiles: any[][] | null, biomeData?: number[][], snowVariantData?: number[][]): Texture | null {
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
                
                // For snow, we need to use the correct variant column
                let extensionCol = col;
                if (isSnow && snowVariantData && snowVariantData[y]) {
                    const snowVariant = snowVariantData[y][x];
                    // The processed tile col might have variant offset already, but we need to ensure
                    // we're using the right extension column for this variant
                    const baseCol = col % 12; // Get base column without variant offset
                    extensionCol = baseCol + (snowVariant * 12); // Apply correct variant offset
                }
                
                if (extensionRow && extensionRow[extensionCol]) {
                    const extensionTexture = extensionRow[extensionCol];
                    if (extensionTexture) {
                        if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                            console.log(`[CliffAutotiler] Extension at (${x}, ${y + 1}) using (6, ${extensionCol}) below (${row}, ${col})`);
                        }
                        return extensionTexture;
                    } else {
                        if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                            console.log(`[CliffAutotiler] ❌ No extension texture found at (6, ${extensionCol}) for bottom cliff at (${x}, ${y})`);
                        }
                    }
                } else {
                    if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
                        console.log(`[CliffAutotiler] ❌ Extension row missing or no texture at column ${extensionCol} for bottom cliff at (${x}, ${y})`);
                    }
                }
            }
        } else {
            // Fallback: if no processed tiles, calculate the tile type directly
            // This ensures extensions are created even if processed tile data is missing
            const bitmask = this.calculateBitmask(x, y, elevationData);
            const snowVariant = (isSnow && snowVariantData && snowVariantData[y]) ? snowVariantData[y][x] : 0;
            const tileCoords = this.determineTileType(bitmask, isDarkGrass, biomeId, snowVariant);
            
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
    
    /**
     * Get grass-to-snow transition tile using transparency overlays
     * Uses exact same logic as getBiomeTransitionTile but with transparency tiles (rows 37-43)
     * @param x - Tile X coordinate
     * @param y - Tile Y coordinate
     * @param biomeData - 2D biome map
     * @returns Tile result with overlay
     */
    private getGrassToSnowTransitionTile(x: number, y: number, biomeData?: number[][]): TileResult | null {
        if (!biomeData || !biomeData[y]) return null;
        
        const width = biomeData[0].length;
        const height = biomeData.length;
        
        // Calculate bitmask for snow neighbors
        let snowBitmask = 0;
        
        // Helper function to check if neighbor is snow
        const isSnow = (nx: number, ny: number): boolean => {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                return false; // World edge - treat as not snow
            }
            return biomeData[ny][nx] === BIOME_TYPES.SNOW;
        };
        
        
        // Check all 8 directions for snow
        if (isSnow(x, y - 1)) snowBitmask |= this.BITS.NORTH;
        if (isSnow(x + 1, y - 1)) snowBitmask |= this.BITS.NORTHEAST;
        if (isSnow(x + 1, y)) snowBitmask |= this.BITS.EAST;
        if (isSnow(x + 1, y + 1)) snowBitmask |= this.BITS.SOUTHEAST;
        if (isSnow(x, y + 1)) snowBitmask |= this.BITS.SOUTH;
        if (isSnow(x - 1, y + 1)) snowBitmask |= this.BITS.SOUTHWEST;
        if (isSnow(x - 1, y)) snowBitmask |= this.BITS.WEST;
        if (isSnow(x - 1, y - 1)) snowBitmask |= this.BITS.NORTHWEST;
        
        // If no snow neighbors, no transition needed
        if (snowBitmask === 0) return null;
        
        // Determine transition tile using EXACT same logic as determineBiomeTransitionType
        const transitionCoords = this.determineGrassToSnowTransitionType(snowBitmask);
        if (!transitionCoords) return null;
        
        // Get the transparency transition texture (rows 37-43 instead of 30-36)
        const row = this.tilesets.textures.terrain[transitionCoords.row];
        if (!row || !row[transitionCoords.col]) return null;
        
        const overlayTexture = row[transitionCoords.col];
        if (!overlayTexture) return null;
        
        // For grass-to-snow, we need:
        // 1. Snow tile as the base (what shows through the transparent parts)
        // 2. Green grass transparency tile as overlay
        const snowTexture = this.tilesets.getRandomSnowTile(0); // White snow
        if (!snowTexture) return null;
        
        // Return snow base with grass transparency overlay
        return {
            texture: snowTexture,
            type: 'snow_with_grass_overlay',
            overlay: {
                texture: overlayTexture,
                type: `grass_to_snow_transition_${transitionCoords.row},${transitionCoords.col}`
            }
        };
    }
    
    /**
     * Get snow variant transition tile (white-to-blue or white-to-grey)
     * Uses transparency overlay approach like grass-to-snow transitions
     * @param x - Tile X coordinate  
     * @param y - Tile Y coordinate
     * @param snowVariantData - 2D snow variant map
     * @returns Tile result or null
     */
    private getSnowVariantTransitionTile(x: number, y: number, snowVariantData: number[][]): TileResult | null {
        if (!snowVariantData || !snowVariantData[y]) return null;
        
        const width = snowVariantData[0].length;
        const height = snowVariantData.length;
        const currentVariant = snowVariantData[y][x];
        
        // Only white snow (variant 0) gets transitions
        if (currentVariant !== 0) return null;
        
        // Calculate bitmask for non-white snow neighbors (blue or grey)
        let variantBitmask = 0;
        let neighborVariant = 0; // Track which variant we're transitioning to
        
        // Helper function to check if neighbor is not white snow
        const isOtherVariant = (nx: number, ny: number): boolean => {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                return false;
            }
            const variant = snowVariantData[ny][nx];
            if (variant !== 0 && neighborVariant === 0) {
                neighborVariant = variant; // Set the first non-white variant we find
            }
            return variant !== 0 && variant === neighborVariant;
        };
        
        // Check all 8 directions for non-white snow
        if (isOtherVariant(x, y - 1)) variantBitmask |= this.BITS.NORTH;
        if (isOtherVariant(x + 1, y - 1)) variantBitmask |= this.BITS.NORTHEAST;
        if (isOtherVariant(x + 1, y)) variantBitmask |= this.BITS.EAST;
        if (isOtherVariant(x + 1, y + 1)) variantBitmask |= this.BITS.SOUTHEAST;
        if (isOtherVariant(x, y + 1)) variantBitmask |= this.BITS.SOUTH;
        if (isOtherVariant(x - 1, y + 1)) variantBitmask |= this.BITS.SOUTHWEST;
        if (isOtherVariant(x - 1, y)) variantBitmask |= this.BITS.WEST;
        if (isOtherVariant(x - 1, y - 1)) variantBitmask |= this.BITS.NORTHWEST;
        
        // If no variant neighbors or no consistent variant, no transition needed
        if (variantBitmask === 0 || neighborVariant === 0) return null;
        
        // Use the same transition determination logic as grass-to-snow
        const transitionCoords = this.determineWhiteSnowTransparencyType(variantBitmask);
        if (!transitionCoords) return null;
        
        // Get the white snow transparency texture (rows 36-42)
        const row = this.tilesets.textures.snow[transitionCoords.row];
        if (!row || !row[transitionCoords.col]) return null;
        
        const overlayTexture = row[transitionCoords.col];
        if (!overlayTexture) return null;
        
        // For white-to-variant transitions:
        // 1. Blue/grey snow tile as the base (what shows through the transparent parts)
        // 2. White snow transparency tile as overlay
        const variantSnowTexture = this.tilesets.getRandomSnowTile(neighborVariant);
        if (!variantSnowTexture) return null;
        
        // Return variant snow base with white snow transparency overlay
        return {
            texture: variantSnowTexture,
            type: `variant_snow_with_white_overlay`,
            overlay: {
                texture: overlayTexture,
                type: `white_to_variant_transition_${transitionCoords.row},${transitionCoords.col}`
            }
        };
    }
    
    /**
     * Determine white snow transparency transition tile coordinates
     * Uses EXACT same logic as grass-to-snow transitions but with snow transparency tiles
     * @param bitmask - Neighbor bitmask  
     * @returns Tile coordinates or null
     */
    private determineWhiteSnowTransparencyType(bitmask: number): TransitionCoordinates | null {
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
        
        // Always use columns 0-4 for white snow to transparency
        const baseCol = 0;
        
        // EXACT SAME LOGIC as grass-to-snow but with different row mappings
        // The logic uses reversed directions - when blue/grey snow is to the south of white snow, 
        // it uses the north edge of the transition area
        
        // Priority 1: Inner corners (two adjacent cardinals)
        if (hasSouth && hasEast) return { row: 36, col: baseCol + 2, type: "NW inner corner (variant SE)" };
        if (hasSouth && hasWest) return { row: 36, col: baseCol + 3, type: "NE inner corner (variant SW)" };
        if (hasNorth && hasEast) return { row: 37, col: baseCol + 2, type: "SW inner corner (variant NE)" };
        if (hasNorth && hasWest) return { row: 37, col: baseCol + 3, type: "SE inner corner (variant NW)" };
        
        // Priority 2: Outer diagonal edges (diagonal only, no adjacent cardinals)
        if (hasSoutheast && !hasSouth && !hasEast) return { row: 38, col: baseCol + 0, type: "NW outer diagonal" };
        if (hasSouthwest && !hasSouth && !hasWest) return { row: 38, col: baseCol + 4, type: "NE outer diagonal" };
        if (hasNortheast && !hasNorth && !hasEast) return { row: 42, col: baseCol + 0, type: "SW outer diagonal" };
        if (hasNorthwest && !hasNorth && !hasWest) return { row: 42, col: baseCol + 4, type: "SE outer diagonal" };
        
        // Priority 3: Single cardinal edges
        if (hasSouth && !hasEast && !hasNorth && !hasWest) return { row: 38, col: baseCol + 1, type: "N edge" };
        if (hasEast && !hasNorth && !hasSouth && !hasWest) return { row: 39, col: baseCol + 0, type: "W edge" };
        if (hasWest && !hasNorth && !hasSouth && !hasEast) return { row: 39, col: baseCol + 4, type: "E edge" };
        if (hasNorth && !hasEast && !hasSouth && !hasWest) return { row: 42, col: baseCol + 1, type: "S edge" };
        
        // Priority 4: Edge variants and combinations
        if (hasWest && !hasEast) {
            if (hasNorth || hasSouth) return { row: 40, col: baseCol + 4, type: "E edge variant" };
            return { row: 41, col: baseCol + 4, type: "E edge variant 2" };
        }
        
        if (hasEast && !hasWest) {
            if (hasNorth || hasSouth) return { row: 40, col: baseCol + 0, type: "W edge variant" };
            return { row: 41, col: baseCol + 0, type: "W edge variant 2" };
        }
        
        if (hasSouth && !hasNorth) {
            if (hasWest || hasEast) return { row: 38, col: baseCol + 2, type: "N edge variant" };
            return { row: 38, col: baseCol + 3, type: "N edge variant 2" };
        }
        
        if (hasNorth && !hasSouth) {
            if (hasWest || hasEast) return { row: 42, col: baseCol + 2, type: "S edge variant" };
            return { row: 42, col: baseCol + 3, type: "S edge variant 2" };
        }
        
        // Priority 5: Fallback for any cardinal direction
        if (hasSouth) return { row: 38, col: baseCol + 1, type: "N edge fallback" };
        if (hasEast) return { row: 39, col: baseCol + 0, type: "W edge fallback" };
        if (hasWest) return { row: 39, col: baseCol + 4, type: "E edge fallback" };
        if (hasNorth) return { row: 42, col: baseCol + 1, type: "S edge fallback" };
        
        // No transition needed
        return null;
    }
    
    /**
     * Determine snow variant transition tile coordinates (OLD - NO LONGER USED)
     * @param bitmask - Neighbor bitmask
     * @param transitionType - 'white_to_blue' or 'white_to_grey'
     * @returns Tile coordinates or null
     */
    private determineSnowTransitionType(bitmask: number, transitionType: 'white_to_blue' | 'white_to_grey'): TransitionCoordinates | null {
        // Use same logic as grass transitions but different row offsets
        // White to blue: rows 22-28
        // White to grey: rows 29-35
        const baseRow = transitionType === 'white_to_blue' ? 22 : 29;
        
        // Check cardinal directions
        const hasNorth = (bitmask & this.BITS.NORTH) !== 0;
        const hasEast = (bitmask & this.BITS.EAST) !== 0;
        const hasSouth = (bitmask & this.BITS.SOUTH) !== 0;
        const hasWest = (bitmask & this.BITS.WEST) !== 0;
        
        // Check diagonals
        const hasNE = (bitmask & this.BITS.NORTHEAST) !== 0;
        const hasSE = (bitmask & this.BITS.SOUTHEAST) !== 0;
        const hasSW = (bitmask & this.BITS.SOUTHWEST) !== 0;
        const hasNW = (bitmask & this.BITS.NORTHWEST) !== 0;
        
        // Priority 1: All sides covered
        if (hasNorth && hasEast && hasSouth && hasWest) {
            return { row: baseRow + 4, col: 5, type: "full coverage" };
        }
        
        // Priority 2: Three-way intersections
        if (hasNorth && hasEast && hasSouth) return { row: baseRow + 3, col: 8, type: "NES intersection" };
        if (hasEast && hasSouth && hasWest) return { row: baseRow + 4, col: 9, type: "ESW intersection" };
        if (hasSouth && hasWest && hasNorth) return { row: baseRow + 5, col: 8, type: "SWN intersection" };
        if (hasWest && hasNorth && hasEast) return { row: baseRow + 5, col: 9, type: "WNE intersection" };
        
        // Priority 3: Corners (two adjacent cardinals)
        if (hasNorth && hasEast) return { row: baseRow + 0, col: 6, type: "NE corner" };
        if (hasEast && hasSouth) return { row: baseRow + 0, col: 9, type: "SE corner" };
        if (hasSouth && hasWest) return { row: baseRow + 3, col: 9, type: "SW corner" };
        if (hasWest && hasNorth) return { row: baseRow + 3, col: 6, type: "NW corner" };
        
        // Priority 4: Two opposite cardinals (corridors)
        if (hasNorth && hasSouth) {
            if (hasWest || hasEast) return { row: baseRow + 2, col: 2, type: "N-S corridor variant" };
            return { row: baseRow + 2, col: 3, type: "N-S corridor variant 2" };
        }
        if (hasEast && hasWest) {
            return { row: baseRow + 2, col: 4, type: "E-W corridor" };
        }
        
        // Priority 5: Single cardinal edges with diagonal variations
        if (hasSouth) {
            if (hasWest || hasEast) return { row: baseRow + 0, col: 2, type: "N edge variant" };
            return { row: baseRow + 0, col: 3, type: "N edge variant 2" };
        }
        if (hasNorth) {
            if (hasWest || hasEast) return { row: baseRow + 6, col: 2, type: "S edge variant" };
            return { row: baseRow + 6, col: 3, type: "S edge variant 2" };
        }
        
        // Priority 6: Fallback for any cardinal direction
        if (hasSouth) return { row: baseRow + 0, col: 1, type: "N edge fallback" };
        if (hasEast) return { row: baseRow + 1, col: 0, type: "W edge fallback" };
        if (hasWest) return { row: baseRow + 2, col: 4, type: "E edge fallback" };
        if (hasNorth) return { row: baseRow + 6, col: 1, type: "S edge fallback" };
        
        // No transition needed
        return null;
    }
    
    /**
     * Determine grass-to-snow transition type using EXACT same logic as grass-to-dark-grass
     * But uses transparency tiles (rows 37-43) instead of transition tiles (rows 30-36)
     */
    private determineGrassToSnowTransitionType(bitmask: number): TransitionCoordinates | null {
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
        
        // Always use columns 0-4 for green grass to transparency
        const baseCol = 0;
        
        // EXACT SAME LOGIC as determineBiomeTransitionType but with rows 37-43 instead of 30-36
        // The row offset is +7 from the transition tiles
        
        // Priority 1: Inner corners (two adjacent cardinals)
        if (hasSouth && hasEast) return { row: 37, col: baseCol + 2, type: "NW inner corner (snow SE)" };
        if (hasSouth && hasWest) return { row: 37, col: baseCol + 3, type: "NE inner corner (snow SW)" };
        if (hasNorth && hasEast) return { row: 38, col: baseCol + 2, type: "SW inner corner (snow NE)" };
        if (hasNorth && hasWest) return { row: 38, col: baseCol + 3, type: "SE inner corner (snow NW)" };
        
        // Priority 2: Outer diagonal edges (diagonal only, no adjacent cardinals)
        if (hasSoutheast && !hasSouth && !hasEast) return { row: 39, col: baseCol + 0, type: "NW outer diagonal" };
        if (hasSouthwest && !hasSouth && !hasWest) return { row: 39, col: baseCol + 4, type: "NE outer diagonal" };
        if (hasNortheast && !hasNorth && !hasEast) return { row: 43, col: baseCol + 0, type: "SW outer diagonal" };
        if (hasNorthwest && !hasNorth && !hasWest) return { row: 43, col: baseCol + 4, type: "SE outer diagonal" };
        
        // Priority 3: Single cardinal edges
        if (hasSouth && !hasEast && !hasNorth && !hasWest) return { row: 39, col: baseCol + 1, type: "N edge" };
        if (hasEast && !hasNorth && !hasSouth && !hasWest) return { row: 40, col: baseCol + 0, type: "W edge" };
        if (hasWest && !hasNorth && !hasSouth && !hasEast) return { row: 41, col: baseCol + 4, type: "E edge" };
        if (hasNorth && !hasEast && !hasSouth && !hasWest) return { row: 43, col: baseCol + 1, type: "S edge" };
        
        // Priority 4: Edge variants and combinations
        if (hasWest && !hasEast) {
            if (hasNorth || hasSouth) return { row: 41, col: baseCol + 4, type: "E edge variant" };
            return { row: 42, col: baseCol + 4, type: "E edge variant 2" };
        }
        
        if (hasEast && !hasWest) {
            if (hasNorth || hasSouth) return { row: 41, col: baseCol + 0, type: "W edge variant" };
            return { row: 42, col: baseCol + 0, type: "W edge variant 2" };
        }
        
        if (hasSouth && !hasNorth) {
            if (hasWest || hasEast) return { row: 39, col: baseCol + 2, type: "N edge variant" };
            return { row: 39, col: baseCol + 3, type: "N edge variant 2" };
        }
        
        if (hasNorth && !hasSouth) {
            if (hasWest || hasEast) return { row: 43, col: baseCol + 2, type: "S edge variant" };
            return { row: 43, col: baseCol + 3, type: "S edge variant 2" };
        }
        
        // Priority 5: Fallback for any cardinal direction
        if (hasSouth) return { row: 39, col: baseCol + 1, type: "N edge fallback" };
        if (hasEast) return { row: 40, col: baseCol + 0, type: "W edge fallback" };
        if (hasWest) return { row: 41, col: baseCol + 4, type: "E edge fallback" };
        if (hasNorth) return { row: 43, col: baseCol + 1, type: "S edge fallback" };
        
        // No transition needed
        return null;
    }
    
    /**
     * Get snow-to-grass transition tile
     * Snow tiles with transparency need green grass underneath
     */
    private getSnowToGrassTransition(x: number, y: number, biomeData?: number[][]): TileResult | null {
        if (!biomeData) return null;
        
        const width = biomeData[0].length;
        const height = biomeData.length;
        
        // Calculate bitmask for grass neighbors (only green grass, not dark grass)
        let grassBitmask = 0;
        
        // Check all 8 directions for green grass
        const directions = [
            { dx: 0, dy: -1, bit: this.BITS.NORTH },
            { dx: 1, dy: -1, bit: this.BITS.NORTHEAST },
            { dx: 1, dy: 0, bit: this.BITS.EAST },
            { dx: 1, dy: 1, bit: this.BITS.SOUTHEAST },
            { dx: 0, dy: 1, bit: this.BITS.SOUTH },
            { dx: -1, dy: 1, bit: this.BITS.SOUTHWEST },
            { dx: -1, dy: 0, bit: this.BITS.WEST },
            { dx: -1, dy: -1, bit: this.BITS.NORTHWEST }
        ];
        
        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                // Only green grass (0), not dark grass (1) or snow (2)
                if (biomeData[ny][nx] === BIOME_TYPES.GRASS) {
                    grassBitmask |= dir.bit;
                }
            }
        }
        
        // No grass neighbors = no transition
        if (grassBitmask === 0) return null;
        
        // Determine transition tile based on bitmask
        const transitionCoords = this.determineSnowToGrassTransitionType(grassBitmask);
        if (!transitionCoords) return null;
        
        // Get texture from snow tileset
        const texture = this.tilesets.getSnowTileAt(transitionCoords.row, transitionCoords.col);
        if (!texture) return null;
        
        // Snow transition tiles have transparency, so they need green grass underneath
        return {
            texture: texture,
            type: `snow_grass_transition_${transitionCoords.row},${transitionCoords.col}`,
            needsGrassBase: true
        };
    }
    
    /**
     * Determine snow-to-grass transition tile based on grass neighbor bitmask
     * Uses same logic as grass transitions but with different tile coordinates
     */
    private determineSnowToGrassTransitionType(bitmask: number): TransitionCoordinates | null {
        // Extract direction bits
        const hasNorth = (bitmask & this.BITS.NORTH) !== 0;
        const hasEast = (bitmask & this.BITS.EAST) !== 0;
        const hasSouth = (bitmask & this.BITS.SOUTH) !== 0;
        const hasWest = (bitmask & this.BITS.WEST) !== 0;
        const hasNortheast = (bitmask & this.BITS.NORTHEAST) !== 0;
        const hasNorthwest = (bitmask & this.BITS.NORTHWEST) !== 0;
        const hasSoutheast = (bitmask & this.BITS.SOUTHEAST) !== 0;
        const hasSouthwest = (bitmask & this.BITS.SOUTHWEST) !== 0;
        
        // Snow tileset mapping:
        // (30,0) to (31,5) in grass → (36,0) to (37,5) in snow
        // (32,0) to (36,4) in grass → (38,0) to (42,4) in snow
        
        // Priority 1: Inner corners (same as grass but offset by 6 rows)
        // These were rows 30-31 in grass, now 36-37 in snow
        // Col 2-5 are the corner tiles we need
        if (hasNorth && hasEast && !hasNortheast) return { row: 36, col: 2, type: "inner NE corner" };
        if (hasSouth && hasEast && !hasSoutheast) return { row: 36, col: 3, type: "inner SE corner" };
        if (hasSouth && hasWest && !hasSouthwest) return { row: 37, col: 4, type: "inner SW corner" };
        if (hasNorth && hasWest && !hasNorthwest) return { row: 37, col: 5, type: "inner NW corner" };
        
        // Priority 2: Additional corner combinations (rows 36-37)
        // The smaller corner pieces in columns 0-1
        if (hasNortheast && (!hasNorth || !hasEast)) return { row: 36, col: 0, type: "small NE corner" };
        if (hasSoutheast && (!hasSouth || !hasEast)) return { row: 36, col: 1, type: "small SE corner" };
        if (hasSouthwest && (!hasSouth || !hasWest)) return { row: 37, col: 0, type: "small SW corner" };
        if (hasNorthwest && (!hasNorth || !hasWest)) return { row: 37, col: 1, type: "small NW corner" };
        
        // Priority 3: Outer diagonal edges (rows 32→38 in mapping)
        if (hasSoutheast && !hasSouth && !hasEast) return { row: 38, col: 0, type: "NW outer diagonal" };
        if (hasSouthwest && !hasSouth && !hasWest) return { row: 38, col: 4, type: "NE outer diagonal" };
        if (hasNortheast && !hasNorth && !hasEast) return { row: 42, col: 0, type: "SW outer diagonal" };
        if (hasNorthwest && !hasNorth && !hasWest) return { row: 42, col: 4, type: "SE outer diagonal" };
        
        // Priority 4: Single cardinal edges (using reversed logic)
        // Grass to the south = north edge of grass area
        if (hasSouth && !hasEast && !hasNorth && !hasWest) return { row: 38, col: 1, type: "N edge" };
        if (hasEast && !hasNorth && !hasSouth && !hasWest) return { row: 39, col: 0, type: "W edge" };
        if (hasWest && !hasNorth && !hasSouth && !hasEast) return { row: 40, col: 4, type: "E edge" };
        if (hasNorth && !hasEast && !hasSouth && !hasWest) return { row: 42, col: 1, type: "S edge" };
        
        // Priority 5: Edge variants
        if (hasSouth && !hasNorth) {
            if (hasWest || hasEast) return { row: 38, col: 2, type: "N edge variant" };
            return { row: 38, col: 3, type: "N edge variant 2" };
        }
        
        if (hasNorth && !hasSouth) {
            if (hasWest || hasEast) return { row: 42, col: 2, type: "S edge variant" };
            return { row: 42, col: 3, type: "S edge variant 2" };
        }
        
        if (hasWest && !hasEast) {
            if (hasNorth || hasSouth) return { row: 40, col: 4, type: "E edge variant" };
            return { row: 41, col: 4, type: "E edge variant 2" };
        }
        
        if (hasEast && !hasWest) {
            if (hasNorth || hasSouth) return { row: 40, col: 0, type: "W edge variant" };
            return { row: 41, col: 0, type: "W edge variant 2" };
        }
        
        // Priority 6: Fallback
        if (hasSouth) return { row: 38, col: 1, type: "N edge fallback" };
        if (hasEast) return { row: 39, col: 0, type: "W edge fallback" };
        if (hasWest) return { row: 40, col: 4, type: "E edge fallback" };
        if (hasNorth) return { row: 42, col: 1, type: "S edge fallback" };
        
        return null;
    }
    
    /**
     * Get grass-to-desert transition tile
     * Green grass gets transition tiles when adjacent to sand
     */
    private getGrassToDesertTransition(x: number, y: number, biomeData?: number[][]): TileResult | null {
        if (!biomeData) return null;
        
        const width = biomeData[0].length;
        const height = biomeData.length;
        
        // Calculate bitmask for desert neighbors (both light and dark sand)
        let desertBitmask = 0;
        
        // Check all 8 directions for desert
        const directions = [
            { dx: 0, dy: -1, bit: this.BITS.NORTH },
            { dx: 1, dy: -1, bit: this.BITS.NORTHEAST },
            { dx: 1, dy: 0, bit: this.BITS.EAST },
            { dx: 1, dy: 1, bit: this.BITS.SOUTHEAST },
            { dx: 0, dy: 1, bit: this.BITS.SOUTH },
            { dx: -1, dy: 1, bit: this.BITS.SOUTHWEST },
            { dx: -1, dy: 0, bit: this.BITS.WEST },
            { dx: -1, dy: -1, bit: this.BITS.NORTHWEST }
        ];
        
        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const neighborBiome = biomeData[ny][nx];
                // Check for both light sand and dark sand
                if (neighborBiome === BIOME_TYPES.LIGHT_SAND || neighborBiome === BIOME_TYPES.DARK_SAND) {
                    desertBitmask |= dir.bit;
                }
            }
        }
        
        // No desert neighbors = no transition
        if (desertBitmask === 0) return null;
        
        // Determine transition tile based on bitmask
        // Using same logic as grass-to-snow transitions (transparency tiles)
        const transitionCoords = this.determineGrassToDesertTransitionType(desertBitmask);
        if (!transitionCoords) return null;
        
        // Get texture from grass tileset (rows 37-43 for transparency)
        const texture = this.tilesets.textures.terrain[transitionCoords.row]?.[transitionCoords.col] || null;
        if (!texture) return null;
        
        return {
            texture: texture,
            type: `grass_desert_transition_${transitionCoords.row},${transitionCoords.col}`,
            needsSandBase: true // Indicates sand should be drawn underneath
        };
    }
    
    /**
     * Determine grass-to-desert transition type using transparency tiles
     * Uses same logic as grass-to-snow but for desert
     */
    private determineGrassToDesertTransitionType(bitmask: number): TransitionCoordinates | null {
        // Use the same transparency tiles as grass-to-snow (rows 37-43, cols 0-4)
        // This provides consistent transition behavior
        return this.determineGrassToSnowTransitionType(bitmask);
    }
    
    /**
     * Get desert sand transition tile (dark sand to light sand)
     * Dark sand gets transition tiles when adjacent to light sand
     * Uses desert tileset rows 26-30, columns 30-34
     */
    private getDesertSandTransition(x: number, y: number, biomeData?: number[][]): TileResult | null {
        if (!biomeData) return null;
        
        const width = biomeData[0].length;
        const height = biomeData.length;
        const currentBiome = biomeData[y][x];
        
        // Only dark sand gets transitions to light sand
        if (currentBiome !== BIOME_TYPES.DARK_SAND) return null;
        
        // Calculate bitmask for light sand neighbors
        let lightSandBitmask = 0;
        
        // Check all 8 directions for light sand
        const directions = [
            { dx: 0, dy: -1, bit: this.BITS.NORTH },
            { dx: 1, dy: -1, bit: this.BITS.NORTHEAST },
            { dx: 1, dy: 0, bit: this.BITS.EAST },
            { dx: 1, dy: 1, bit: this.BITS.SOUTHEAST },
            { dx: 0, dy: 1, bit: this.BITS.SOUTH },
            { dx: -1, dy: 1, bit: this.BITS.SOUTHWEST },
            { dx: -1, dy: 0, bit: this.BITS.WEST },
            { dx: -1, dy: -1, bit: this.BITS.NORTHWEST }
        ];
        
        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (biomeData[ny][nx] === BIOME_TYPES.LIGHT_SAND) {
                    lightSandBitmask |= dir.bit;
                }
            }
        }
        
        // No light sand neighbors = no transition
        if (lightSandBitmask === 0) return null;
        
        // Determine transition tile based on bitmask
        const transitionCoords = this.determineDesertTransitionType(lightSandBitmask);
        if (!transitionCoords) return null;
        
        // Get texture from desert tileset
        const texture = this.tilesets.getDesertTileAt(transitionCoords.row, transitionCoords.col);
        if (!texture) return null;
        
        return {
            texture: texture,
            type: `desert_sand_transition_${transitionCoords.row},${transitionCoords.col}`
        };
    }
    
    /**
     * Determine desert sand transition type (dark sand to light sand)
     * Desert tileset has transition tiles at rows 26-30, columns 30-34
     * These tiles show dark sand on outside, light sand on inside (reversed from grass)
     */
    private determineDesertTransitionType(bitmask: number): TransitionCoordinates | null {
        // Extract direction bits
        const hasNorth = (bitmask & this.BITS.NORTH) !== 0;
        const hasEast = (bitmask & this.BITS.EAST) !== 0;
        const hasSouth = (bitmask & this.BITS.SOUTH) !== 0;
        const hasWest = (bitmask & this.BITS.WEST) !== 0;
        const hasNortheast = (bitmask & this.BITS.NORTHEAST) !== 0;
        const hasNorthwest = (bitmask & this.BITS.NORTHWEST) !== 0;
        const hasSoutheast = (bitmask & this.BITS.SOUTHEAST) !== 0;
        const hasSouthwest = (bitmask & this.BITS.SOUTHWEST) !== 0;
        
        // Desert transition tiles are at rows 26-30, columns 30-34
        // Row 24, cols 30-31: inner corner pieces (NW, NE)
        // Row 25, cols 30-31: inner corner pieces (SW, SE)
        // Rows 26-30: main transition tiles
        
        // Priority 1: Inner corners (when two adjacent cardinals have light sand)
        // These create the inner corner effect where dark sand wraps around light sand
        if (hasNorth && hasWest && !hasNorthwest) return { row: 24, col: 30, type: "inner NW corner" };
        if (hasNorth && hasEast && !hasNortheast) return { row: 24, col: 31, type: "inner NE corner" };
        if (hasSouth && hasWest && !hasSouthwest) return { row: 25, col: 30, type: "inner SW corner" };
        if (hasSouth && hasEast && !hasSoutheast) return { row: 25, col: 31, type: "inner SE corner" };
        
        // Priority 2: Outer diagonal edges (diagonal only, no adjacent cardinals)
        // Light sand to the southeast only = northwest outer corner of light sand area
        if (hasSoutheast && !hasSouth && !hasEast) return { row: 26, col: 30, type: "NW outer diagonal" };
        if (hasSouthwest && !hasSouth && !hasWest) return { row: 26, col: 34, type: "NE outer diagonal" };
        if (hasNortheast && !hasNorth && !hasEast) return { row: 30, col: 30, type: "SW outer diagonal" };
        if (hasNorthwest && !hasNorth && !hasWest) return { row: 30, col: 34, type: "SE outer diagonal" };
        
        // Priority 3: Single cardinal edges
        // Light sand to the south = north edge of light sand area
        if (hasSouth && !hasEast && !hasNorth && !hasWest) return { row: 26, col: 31, type: "N edge" };
        if (hasEast && !hasNorth && !hasSouth && !hasWest) return { row: 27, col: 30, type: "W edge" };
        if (hasWest && !hasNorth && !hasSouth && !hasEast) return { row: 28, col: 34, type: "E edge" };
        if (hasNorth && !hasEast && !hasSouth && !hasWest) return { row: 30, col: 31, type: "S edge" };
        
        // Priority 4: Edge variants and combinations
        if (hasSouth && !hasNorth) {
            if (hasWest || hasEast) return { row: 26, col: 32, type: "N edge variant" };
            return { row: 26, col: 33, type: "N edge variant 2" };
        }
        
        if (hasNorth && !hasSouth) {
            if (hasWest || hasEast) return { row: 30, col: 32, type: "S edge variant" };
            return { row: 30, col: 33, type: "S edge variant 2" };
        }
        
        if (hasWest && !hasEast) {
            if (hasNorth || hasSouth) return { row: 28, col: 34, type: "E edge variant" };
            return { row: 29, col: 34, type: "E edge variant 2" };
        }
        
        if (hasEast && !hasWest) {
            if (hasNorth || hasSouth) return { row: 28, col: 30, type: "W edge variant" };
            return { row: 29, col: 30, type: "W edge variant 2" };
        }
        
        // Priority 5: Fallback for any cardinal direction
        if (hasSouth) return { row: 26, col: 31, type: "N edge fallback" };
        if (hasEast) return { row: 27, col: 30, type: "W edge fallback" };
        if (hasWest) return { row: 28, col: 34, type: "E edge fallback" };
        if (hasNorth) return { row: 30, col: 31, type: "S edge fallback" };
        
        return null;
    }
}