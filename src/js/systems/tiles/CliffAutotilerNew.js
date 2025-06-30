// Complete rewrite of cliff autotiling system
// Based on comprehensive understanding of MainLev2.0 tileset

import { GAME_CONSTANTS } from '../../../../shared/constants/GameConstants.js';

export class CliffAutotiler {
  constructor(tilesets) {
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
  
  createTileMapping() {
    // Instead of mapping every possible bitmask combination,
    // we'll use a priority-based approach in getTileTexture()
    return new Map();
  }
  
  /**
   * Determine tile type based on bitmask using priority logic
   * @param {number} bitmask - 8-bit neighbor bitmask
   * @param {boolean} isDarkGrass - Whether to use dark grass tileset
   */
  determineTileType(bitmask, isDarkGrass = false) {
    // Base column offset for biome (dark grass is +11 columns, same rows)
    const colOffset = isDarkGrass ? 11 : 0;
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
    
    // Priority 4: Edge variations (cardinal + diagonal)
    if (hasNorth && hasNortheast && !hasEast && !hasWest) return { row: 0, col: 2 + colOffset, type: "top edge with NE" };
    if (hasNorth && hasNorthwest && !hasEast && !hasWest) return { row: 0, col: 3 + colOffset, type: "top edge with NW" };
    if (hasSouth && hasSoutheast && !hasEast && !hasWest) return { row: 5, col: 2 + colOffset, type: "bottom edge with SE" };
    if (hasSouth && hasSouthwest && !hasEast && !hasWest) return { row: 5, col: 3 + colOffset, type: "bottom edge with SW" };
    if (hasWest && hasNorthwest && !hasNorth && !hasSouth) return { row: 2, col: 0 + colOffset, type: "left edge with NW" };
    if (hasWest && hasSouthwest && !hasNorth && !hasSouth) return { row: 3, col: 0 + colOffset, type: "left edge with SW" };
    if (hasEast && hasNortheast && !hasNorth && !hasSouth) return { row: 2, col: 6 + colOffset, type: "right edge with NE" };
    if (hasEast && hasSoutheast && !hasNorth && !hasSouth) return { row: 3, col: 6 + colOffset, type: "right edge with SE" };
    
    // Priority 5: Fallback edges (any cardinal direction)
    if (hasNorth) return { row: 0, col: 1 + colOffset, type: "top edge fallback" };
    if (hasEast) return { row: 1, col: 6 + colOffset, type: "right edge fallback" };
    if (hasSouth) return { row: 5, col: 1 + colOffset, type: "bottom edge fallback" };
    if (hasWest) return { row: 1, col: 0 + colOffset, type: "left edge fallback" };
    
    // Priority 6: Pure grass (no neighbors lower) - use varied grass for plateau interiors
    return { row: 1, col: 1 + colOffset, type: "grass", useVariations: true, isDarkGrass };
  }
  
  /**
   * Calculate bitmask for a tile including diagonals
   */
  calculateBitmask(x, y, elevationData) {
    const width = elevationData[0].length;
    const height = elevationData.length;
    const currentElevation = elevationData[y][x];
    
    let bitmask = 0;
    
    // Helper function to check neighbor elevation
    const isLowerOrEdge = (nx, ny) => {
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
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {Array} elevationData - 2D elevation map
   * @param {Array} processedTiles - Processed tile types
   * @param {Array} biomeData - 2D biome map (0=green, 1=dark)
   */
  getTileTexture(x, y, elevationData, processedTiles, biomeData = null) {
    const currentElevation = elevationData[y][x];
    
    // Determine biome type (0=green grass, 1=dark grass)
    const isDarkGrass = biomeData && biomeData[y] && biomeData[y][x] === 1;
    
    // Debug logging for biome selection (only log occasionally to avoid spam)
    if (Math.random() < 0.001) {
      console.log(`[CliffAutotiler] Tile (${x},${y}): biome=${isDarkGrass ? 'dark' : 'green'}, elevation=${currentElevation}`);
    }
    
    // Ground level tiles - check for biome transitions first
    if (currentElevation === 0) {
      // Check if this tile is at a biome boundary and needs transition tiles
      const transitionTile = this.getBiomeTransitionTile(x, y, biomeData);
      if (transitionTile) {
        return transitionTile;
      }
      
      // No transition needed - use pure biome tiles
      return { 
        texture: isDarkGrass ? this.tilesets.getRandomPureDarkGrass() : this.tilesets.getRandomPureGrass(),
        type: 'grass'
      };
    }
    
    // Elevated tiles - use priority-based bitmask logic with biome support
    const bitmask = this.calculateBitmask(x, y, elevationData);
    let tileCoords = this.determineTileType(bitmask, isDarkGrass);
    
    // Randomize bottom edge tiles (columns 1-5 for horizontal edges)
    if (tileCoords.type.includes("bottom edge") && tileCoords.row === 5 && tileCoords.col === 1) {
      tileCoords = { ...tileCoords }; // Copy to avoid modifying original
      tileCoords.col = 1 + Math.floor(Math.random() * 5); // Columns 1-5 only
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
    let texture;
    if (tileCoords.useVariations && tileCoords.type === "grass") {
      // Use grass variations for plateau interiors based on biome
      texture = tileCoords.isDarkGrass ? 
        this.tilesets.getRandomPlateauDarkGrass() : 
        this.tilesets.getRandomPlateauGrass();
    } else {
      // Use exact tile for cliff edges, corners, etc.
      texture = this.tilesets.textures.terrain[tileCoords.row][tileCoords.col];
    }
    
    return {
      texture: texture,
      type: `${tileCoords.row},${tileCoords.col}`
    };
  }
  
  /**
   * Get cliff extension texture for 2-tile height effect
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {Array} elevationData - 2D elevation map
   * @param {Array} processedTiles - Processed tile types
   * @param {Array} biomeData - 2D biome map (0=green, 1=dark)
   */
  getCliffExtensionTexture(x, y, elevationData, processedTiles, biomeData = null) {
    const width = elevationData[0].length;
    const height = elevationData.length;
    const currentElevation = elevationData[y][x];
    
    // Only add extensions below cliff edges
    if (y + 1 >= height) return null;
    
    const belowElevation = elevationData[y + 1][x];
    if (belowElevation >= currentElevation) return null; // No cliff below
    
    // Determine biome type for extension
    const isDarkGrass = biomeData && biomeData[y] && biomeData[y][x] === 1;
    
    // Get the current tile type to determine extension
    const currentTile = processedTiles && processedTiles[y] ? processedTiles[y][x] : null;
    
    if (currentTile) {
      const [row, col] = currentTile.split(',').map(Number);
      
      // Add extensions for row 5 tiles (both green and dark grass use same row)
      if (row === 5) {
        const extensionTexture = this.tilesets.textures.terrain[6][col];
        if (extensionTexture) {
          if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
            console.log(`[CliffAutotiler] Extension at (${x}, ${y + 1}) using (6, ${col}) below (${row}, ${col})`);
          }
          return extensionTexture;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get biome transition tile if this position is at a biome boundary
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {Array} biomeData - 2D biome map (0=green, 1=dark)
   * @returns {Object|null} Transition tile or null if no transition needed
   */
  getBiomeTransitionTile(x, y, biomeData) {
    if (!biomeData || !biomeData[y]) return null;
    
    const width = biomeData[0].length;
    const height = biomeData.length;
    const currentBiome = biomeData[y][x];
    
    // Calculate biome bitmask (similar to elevation bitmask but for biomes)
    let biomeBitmask = 0;
    
    // Helper function to check neighbor biome
    const isOtherBiome = (nx, ny) => {
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
    const texture = this.tilesets.textures.terrain[transitionCoords.row][transitionCoords.col];
    if (!texture) return null;
    
    return {
      texture: texture,
      type: `transition_${transitionCoords.row},${transitionCoords.col}`
    };
  }
  
  /**
   * Determine the appropriate transition tile based on biome bitmask
   * @param {number} bitmask - 8-bit neighbor bitmask for biome differences
   * @param {number} currentBiome - Current tile's biome (0=green, 1=dark)
   * @returns {Object|null} Transition tile coordinates or null
   */
  determineBiomeTransitionType(bitmask, currentBiome) {
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
    
    // Determine which transition set to use based on current biome
    // Green grass (0) uses columns 0-4 (green outside, dark inside)
    // Dark grass (1) uses columns 5-9 (dark outside, green inside)
    const baseCol = currentBiome === 0 ? 0 : 5;
    const baseRow = 30; // Transition tiles start at row 30
    
    // Priority 1: Outer corners (two adjacent cardinals)
    if (hasNorth && hasWest) return { row: baseRow + 0, col: baseCol + 0, type: "NW outer corner" };
    if (hasNorth && hasEast) return { row: baseRow + 0, col: baseCol + 4, type: "NE outer corner" };
    if (hasSouth && hasWest) return { row: baseRow + 4, col: baseCol + 0, type: "SW outer corner" };
    if (hasSouth && hasEast) return { row: baseRow + 4, col: baseCol + 4, type: "SE outer corner" };
    
    // Priority 2: Inner corners (diagonal but NO adjacent cardinals)
    // Note: Inner corners might be at rows 35-36 if they exist
    if (hasNorthwest && !hasNorth && !hasWest) return { row: 35, col: baseCol + 0, type: "NW inner corner" };
    if (hasNortheast && !hasNorth && !hasEast) return { row: 35, col: baseCol + 1, type: "NE inner corner" };
    if (hasSouthwest && !hasSouth && !hasWest) return { row: 36, col: baseCol + 0, type: "SW inner corner" };
    if (hasSoutheast && !hasSouth && !hasEast) return { row: 36, col: baseCol + 1, type: "SE inner corner" };
    
    // Priority 3: Single cardinal edges
    if (hasNorth && !hasEast && !hasSouth && !hasWest) return { row: baseRow + 0, col: baseCol + 2, type: "N edge" };
    if (hasEast && !hasNorth && !hasSouth && !hasWest) return { row: baseRow + 1, col: baseCol + 4, type: "E edge" };
    if (hasSouth && !hasNorth && !hasEast && !hasWest) return { row: baseRow + 4, col: baseCol + 2, type: "S edge" };
    if (hasWest && !hasNorth && !hasEast && !hasSouth) return { row: baseRow + 1, col: baseCol + 0, type: "W edge" };
    
    // Priority 4: Edge variations (cardinal + diagonal)
    if (hasNorth && hasNortheast && !hasEast && !hasWest) return { row: baseRow + 0, col: baseCol + 3, type: "N edge with NE" };
    if (hasNorth && hasNorthwest && !hasEast && !hasWest) return { row: baseRow + 0, col: baseCol + 1, type: "N edge with NW" };
    if (hasSouth && hasSoutheast && !hasEast && !hasWest) return { row: baseRow + 4, col: baseCol + 3, type: "S edge with SE" };
    if (hasSouth && hasSouthwest && !hasEast && !hasWest) return { row: baseRow + 4, col: baseCol + 1, type: "S edge with SW" };
    if (hasWest && hasNorthwest && !hasNorth && !hasSouth) return { row: baseRow + 2, col: baseCol + 0, type: "W edge with NW" };
    if (hasWest && hasSouthwest && !hasNorth && !hasSouth) return { row: baseRow + 3, col: baseCol + 0, type: "W edge with SW" };
    if (hasEast && hasNortheast && !hasNorth && !hasSouth) return { row: baseRow + 2, col: baseCol + 4, type: "E edge with NE" };
    if (hasEast && hasSoutheast && !hasNorth && !hasSouth) return { row: baseRow + 3, col: baseCol + 4, type: "E edge with SE" };
    
    // Priority 5: Fallback edges (any cardinal direction)
    if (hasNorth) return { row: baseRow + 0, col: baseCol + 2, type: "N edge fallback" };
    if (hasEast) return { row: baseRow + 1, col: baseCol + 4, type: "E edge fallback" };
    if (hasSouth) return { row: baseRow + 4, col: baseCol + 2, type: "S edge fallback" };
    if (hasWest) return { row: baseRow + 1, col: baseCol + 0, type: "W edge fallback" };
    
    // Priority 6: Center fill tiles for complex transitions
    return { row: baseRow + 2, col: baseCol + 2, type: "center fill" };
  }
}