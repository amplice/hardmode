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
    const map = new Map();
    
    // No elevation difference - pure grass
    map.set(0, { row: 1, col: 1 }); // Pure grass
    
    // Single edges (only one cardinal direction has drop)
    map.set(this.BITS.NORTH, { row: 0, col: 1 }); // Top edge
    map.set(this.BITS.EAST, { row: 1, col: 6 });  // Right edge
    map.set(this.BITS.SOUTH, { row: 5, col: 1 }); // Bottom edge - will randomize col 1-5
    map.set(this.BITS.WEST, { row: 1, col: 0 });  // Left edge
    
    // Corners (two adjacent cardinal directions have drops)
    map.set(this.BITS.NORTH | this.BITS.WEST, { row: 0, col: 0 }); // NW corner
    map.set(this.BITS.NORTH | this.BITS.EAST, { row: 0, col: 6 }); // NE corner
    map.set(this.BITS.SOUTH | this.BITS.WEST, { row: 5, col: 0 }); // SW corner
    map.set(this.BITS.SOUTH | this.BITS.EAST, { row: 5, col: 6 }); // SE corner
    
    // Inner corners (diagonal neighbors lower but cardinals same) - use diagonal connectors
    map.set(this.BITS.NORTHWEST, { row: 2, col: 7 });   // NW inner corner → (2,7)
    map.set(this.BITS.NORTHEAST, { row: 2, col: 10 });  // NE inner corner → (2,10)
    map.set(this.BITS.SOUTHWEST, { row: 4, col: 8 });   // SW inner corner → (4,8)
    map.set(this.BITS.SOUTHEAST, { row: 4, col: 9 });   // SE inner corner → (4,9)
    
    // Edge variations with adjacent diagonals
    map.set(this.BITS.NORTH | this.BITS.NORTHEAST, { row: 0, col: 2 }); // Top edge with NE
    map.set(this.BITS.NORTH | this.BITS.NORTHWEST, { row: 0, col: 3 }); // Top edge with NW
    map.set(this.BITS.SOUTH | this.BITS.SOUTHEAST, { row: 5, col: 2 }); // Bottom edge with SE
    map.set(this.BITS.SOUTH | this.BITS.SOUTHWEST, { row: 5, col: 3 }); // Bottom edge with SW
    map.set(this.BITS.WEST | this.BITS.NORTHWEST, { row: 2, col: 0 });  // Left edge with NW
    map.set(this.BITS.WEST | this.BITS.SOUTHWEST, { row: 3, col: 0 });  // Left edge with SW
    map.set(this.BITS.EAST | this.BITS.NORTHEAST, { row: 2, col: 6 });  // Right edge with NE
    map.set(this.BITS.EAST | this.BITS.SOUTHEAST, { row: 3, col: 6 });  // Right edge with SE
    
    // Complex corners (corner + adjacent diagonal)
    map.set(this.BITS.NORTH | this.BITS.WEST | this.BITS.NORTHWEST, { row: 0, col: 0 }); // NW complex
    map.set(this.BITS.NORTH | this.BITS.EAST | this.BITS.NORTHEAST, { row: 0, col: 6 }); // NE complex
    map.set(this.BITS.SOUTH | this.BITS.WEST | this.BITS.SOUTHWEST, { row: 5, col: 0 }); // SW complex
    map.set(this.BITS.SOUTH | this.BITS.EAST | this.BITS.SOUTHEAST, { row: 5, col: 6 }); // SE complex
    
    return map;
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
    
    // Elevated tiles - use bitmask
    const bitmask = this.calculateBitmask(x, y, elevationData);
    let tileCoords = this.tileMap.get(bitmask);
    
    if (!tileCoords) {
      // Fallback to grass if no mapping found
      console.warn(`[CliffAutotiler] No mapping for bitmask ${bitmask} at (${x}, ${y})`);
      return {
        texture: this.tilesets.getRandomPureGrass(),
        type: 'grass'
      };
    }
    
    // Randomize bottom edge tiles (only for pure south edges, avoid corner pieces)
    if (bitmask === this.BITS.SOUTH && tileCoords.row === 5 && tileCoords.col === 1) {
      tileCoords = { ...tileCoords }; // Copy to avoid modifying original
      tileCoords.col = 1 + Math.floor(Math.random() * 5); // Columns 1-5 only
    }
    
    // Debug logging
    if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
      console.log(`[CliffAutotiler] Tile at (${x}, ${y}): elevation=${currentElevation}, bitmask=${bitmask}, tile=[${tileCoords.row}, ${tileCoords.col}]`);
      
      // Special logging for bottom edges
      if (bitmask === this.BITS.SOUTH) {
        console.log(`[CliffAutotiler] Bottom edge at (${x}, ${y}) using tile (${tileCoords.row}, ${tileCoords.col}) - should be 5,1-5,5 NOT 5,6`);
      }
      if (bitmask === (this.BITS.SOUTH | this.BITS.EAST)) {
        console.log(`[CliffAutotiler] SE corner at (${x}, ${y}) using tile (${tileCoords.row}, ${tileCoords.col}) - should be 5,6`);
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