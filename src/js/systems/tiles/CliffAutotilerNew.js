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
   */
  determineTileType(bitmask) {
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
    if (hasNorth && hasWest) return { row: 0, col: 0, type: "NW corner" };
    if (hasNorth && hasEast) return { row: 0, col: 6, type: "NE corner" };
    if (hasSouth && hasWest) return { row: 5, col: 0, type: "SW corner" };
    if (hasSouth && hasEast) return { row: 5, col: 6, type: "SE corner" };
    
    // Priority 2: Pure diagonal inner corners (diagonal but NO adjacent cardinals)
    if (hasNorthwest && !hasNorth && !hasWest) return { row: 2, col: 7, type: "NW inner corner" };
    if (hasNortheast && !hasNorth && !hasEast) return { row: 2, col: 10, type: "NE inner corner" };
    if (hasSouthwest && !hasSouth && !hasWest) return { row: 4, col: 8, type: "SW inner corner" };
    if (hasSoutheast && !hasSouth && !hasEast) return { row: 4, col: 9, type: "SE inner corner" };
    
    // Priority 3: Single cardinal edges
    if (hasNorth && !hasEast && !hasSouth && !hasWest) return { row: 0, col: 1, type: "top edge" };
    if (hasEast && !hasNorth && !hasSouth && !hasWest) return { row: 1, col: 6, type: "right edge" };
    if (hasSouth && !hasNorth && !hasEast && !hasWest) return { row: 5, col: 1, type: "bottom edge" };
    if (hasWest && !hasNorth && !hasEast && !hasSouth) return { row: 1, col: 0, type: "left edge" };
    
    // Priority 4: Edge variations (cardinal + diagonal)
    if (hasNorth && hasNortheast && !hasEast && !hasWest) return { row: 0, col: 2, type: "top edge with NE" };
    if (hasNorth && hasNorthwest && !hasEast && !hasWest) return { row: 0, col: 3, type: "top edge with NW" };
    if (hasSouth && hasSoutheast && !hasEast && !hasWest) return { row: 5, col: 2, type: "bottom edge with SE" };
    if (hasSouth && hasSouthwest && !hasEast && !hasWest) return { row: 5, col: 3, type: "bottom edge with SW" };
    if (hasWest && hasNorthwest && !hasNorth && !hasSouth) return { row: 2, col: 0, type: "left edge with NW" };
    if (hasWest && hasSouthwest && !hasNorth && !hasSouth) return { row: 3, col: 0, type: "left edge with SW" };
    if (hasEast && hasNortheast && !hasNorth && !hasSouth) return { row: 2, col: 6, type: "right edge with NE" };
    if (hasEast && hasSoutheast && !hasNorth && !hasSouth) return { row: 3, col: 6, type: "right edge with SE" };
    
    // Priority 5: Fallback edges (any cardinal direction)
    if (hasNorth) return { row: 0, col: 1, type: "top edge fallback" };
    if (hasEast) return { row: 1, col: 6, type: "right edge fallback" };
    if (hasSouth) return { row: 5, col: 1, type: "bottom edge fallback" };
    if (hasWest) return { row: 1, col: 0, type: "left edge fallback" };
    
    // Priority 6: Pure grass (no neighbors lower)
    return { row: 1, col: 1, type: "grass" };
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
   */
  getTileTexture(x, y, elevationData, processedTiles) {
    const currentElevation = elevationData[y][x];
    
    // Ground level tiles - just use grass for now
    if (currentElevation === 0) {
      return { 
        texture: this.tilesets.getRandomPureGrass(),
        type: 'grass'
      };
    }
    
    // Elevated tiles - use priority-based bitmask logic
    const bitmask = this.calculateBitmask(x, y, elevationData);
    let tileCoords = this.determineTileType(bitmask);
    
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
    
    return {
      texture: this.tilesets.textures.terrain[tileCoords.row][tileCoords.col],
      type: `${tileCoords.row},${tileCoords.col}`
    };
  }
  
  /**
   * Get cliff extension texture for 2-tile height effect
   */
  getCliffExtensionTexture(x, y, elevationData, processedTiles) {
    const width = elevationData[0].length;
    const height = elevationData.length;
    const currentElevation = elevationData[y][x];
    
    // Only add extensions below cliff edges
    if (y + 1 >= height) return null;
    
    const belowElevation = elevationData[y + 1][x];
    if (belowElevation >= currentElevation) return null; // No cliff below
    
    // Get the current tile type to determine extension
    const currentTile = processedTiles && processedTiles[y] ? processedTiles[y][x] : null;
    
    if (currentTile) {
      const [row, col] = currentTile.split(',').map(Number);
      
      // Add extensions for row 5 tiles
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
}