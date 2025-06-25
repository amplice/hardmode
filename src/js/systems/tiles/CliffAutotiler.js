// Cliff autotiling using bitmasking for MainLev2.0 tileset
// Based on elevation differences between neighboring tiles

export class CliffAutotiler {
  constructor(tilesets) {
    this.tilesets = tilesets;
    
    // Bitmasking constants for 8-directional neighbors
    this.NEIGHBORS = {
      NORTH:     1,    // 0001
      NORTHEAST: 2,    // 0010  
      EAST:      4,    // 0100
      SOUTHEAST: 8,    // 1000
      SOUTH:     16,   // 0001 0000
      SOUTHWEST: 32,   // 0010 0000
      WEST:      64,   // 0100 0000
      NORTHWEST: 128   // 1000 0000
    };
    
    // Coordinate offsets for each neighbor direction
    this.NEIGHBOR_OFFSETS = [
      { dx: 0, dy: -1, bit: this.NEIGHBORS.NORTH },     // North
      { dx: 1, dy: -1, bit: this.NEIGHBORS.NORTHEAST }, // Northeast
      { dx: 1, dy: 0,  bit: this.NEIGHBORS.EAST },      // East
      { dx: 1, dy: 1,  bit: this.NEIGHBORS.SOUTHEAST }, // Southeast
      { dx: 0, dy: 1,  bit: this.NEIGHBORS.SOUTH },     // South
      { dx: -1, dy: 1, bit: this.NEIGHBORS.SOUTHWEST }, // Southwest
      { dx: -1, dy: 0, bit: this.NEIGHBORS.WEST },      // West
      { dx: -1, dy: -1, bit: this.NEIGHBORS.NORTHWEST } // Northwest
    ];
    
    // Bitmask to tile mapping for cliff edges
    // Each entry maps a bitmask pattern to [row, col] in the tileset
    this.bitmaskToTile = this.createBitmaskMapping();
  }
  
  createBitmaskMapping() {
    const map = new Map();
    
    // No edges (all neighbors are same elevation) - use pure grass
    map.set(0, { row: 1, col: 1 }); // Pure grass tile
    
    // Single edges (one direction has elevation drop)
    map.set(this.NEIGHBORS.NORTH, { row: 0, col: 1 });     // Top edge
    map.set(this.NEIGHBORS.SOUTH, { row: 4, col: 1 });     // Bottom edge  
    map.set(this.NEIGHBORS.WEST, { row: 1, col: 0 });      // Left edge
    map.set(this.NEIGHBORS.EAST, { row: 1, col: 6 });      // Right edge
    
    // Corner edges (two adjacent directions have elevation drops)
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.WEST, { row: 0, col: 0 });  // NW corner
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.EAST, { row: 0, col: 6 });  // NE corner
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.WEST, { row: 4, col: 0 });  // SW corner
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.EAST, { row: 4, col: 6 });  // SE corner
    
    // Edge variations for more complex patterns
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.NORTHEAST, { row: 0, col: 2 }); // Top edge with NE
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.NORTHWEST, { row: 0, col: 3 }); // Top edge with NW
    
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.SOUTHEAST, { row: 4, col: 2 }); // Bottom edge with SE
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.SOUTHWEST, { row: 4, col: 3 }); // Bottom edge with SW
    
    map.set(this.NEIGHBORS.WEST | this.NEIGHBORS.NORTHWEST, { row: 2, col: 0 });  // Left edge with NW
    map.set(this.NEIGHBORS.WEST | this.NEIGHBORS.SOUTHWEST, { row: 3, col: 0 });  // Left edge with SW
    
    map.set(this.NEIGHBORS.EAST | this.NEIGHBORS.NORTHEAST, { row: 2, col: 6 });  // Right edge with NE
    map.set(this.NEIGHBORS.EAST | this.NEIGHBORS.SOUTHEAST, { row: 3, col: 6 });  // Right edge with SE
    
    // Complex corners with multiple edges
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.WEST | this.NEIGHBORS.NORTHWEST, { row: 0, col: 0 }); // NW complex
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.EAST | this.NEIGHBORS.NORTHEAST, { row: 0, col: 6 }); // NE complex
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.WEST | this.NEIGHBORS.SOUTHWEST, { row: 4, col: 0 }); // SW complex
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.EAST | this.NEIGHBORS.SOUTHEAST, { row: 4, col: 6 }); // SE complex
    
    return map;
  }
  
  /**
   * Calculate bitmask for a tile based on elevation differences with neighbors
   */
  calculateBitmask(x, y, elevationData) {
    const width = elevationData[0].length;
    const height = elevationData.length;
    const currentElevation = elevationData[y][x];
    
    let bitmask = 0;
    
    // Check each neighbor
    for (const neighbor of this.NEIGHBOR_OFFSETS) {
      const nx = x + neighbor.dx;
      const ny = y + neighbor.dy;
      
      // If neighbor is outside bounds or at lower elevation, set the bit
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        bitmask |= neighbor.bit; // World edge counts as elevation drop
      } else {
        const neighborElevation = elevationData[ny][nx];
        if (neighborElevation < currentElevation) {
          bitmask |= neighbor.bit; // Lower neighbor = cliff edge
        }
      }
    }
    
    return bitmask;
  }
  
  /**
   * Get the appropriate tile texture for a position based on elevation data
   */
  getTileTexture(x, y, elevationData) {
    const currentElevation = elevationData[y][x];
    
    // For ground level tiles, just use pure grass
    if (currentElevation === 0) {
      return this.tilesets.getRandomPureGrass();
    }
    
    // For elevated tiles, calculate bitmask and get cliff tile
    const bitmask = this.calculateBitmask(x, y, elevationData);
    const tileCoords = this.bitmaskToTile.get(bitmask);
    
    if (tileCoords) {
      return this.tilesets.textures.terrain[tileCoords.row][tileCoords.col];
    }
    
    // Fallback: try to find a close match or use pure grass
    return this.findClosestMatch(bitmask) || this.tilesets.getRandomPureGrass();
  }
  
  /**
   * Find closest matching tile for complex bitmask patterns
   */
  findClosestMatch(bitmask) {
    // For unmapped bitmasks, try to find the best approximate match
    
    // Check for dominant edge directions
    const hasNorth = (bitmask & this.NEIGHBORS.NORTH) !== 0;
    const hasSouth = (bitmask & this.NEIGHBORS.SOUTH) !== 0;
    const hasWest = (bitmask & this.NEIGHBORS.WEST) !== 0;
    const hasEast = (bitmask & this.NEIGHBORS.EAST) !== 0;
    
    // Prioritize main cardinal directions
    if (hasNorth && hasWest) {
      return this.tilesets.textures.terrain[0][0]; // NW corner
    } else if (hasNorth && hasEast) {
      return this.tilesets.textures.terrain[0][6]; // NE corner
    } else if (hasSouth && hasWest) {
      return this.tilesets.textures.terrain[4][0]; // SW corner
    } else if (hasSouth && hasEast) {
      return this.tilesets.textures.terrain[4][6]; // SE corner
    } else if (hasNorth) {
      return this.tilesets.textures.terrain[0][1]; // Top edge
    } else if (hasSouth) {
      return this.tilesets.textures.terrain[4][1]; // Bottom edge
    } else if (hasWest) {
      return this.tilesets.textures.terrain[1][0]; // Left edge
    } else if (hasEast) {
      return this.tilesets.textures.terrain[1][6]; // Right edge
    }
    
    return null; // No match found
  }
  
  /**
   * Get cliff extension texture for 2-tile height effect
   */
  getCliffExtensionTexture(x, y, elevationData) {
    const width = elevationData[0].length;
    const height = elevationData.length;
    const currentElevation = elevationData[y][x];
    
    // Check if tile below has lower elevation (cliff drop)
    if (y + 1 < height) {
      const belowElevation = elevationData[y + 1][x];
      if (belowElevation < currentElevation) {
        // This needs a cliff extension
        
        // Check neighboring elevations for corner extensions
        const w = x > 0 ? elevationData[y][x - 1] : 0;
        const e = x < width - 1 ? elevationData[y][x + 1] : 0;
        
        if (w < currentElevation && e >= currentElevation) {
          return this.tilesets.textures.terrain[5][0]; // SW extension
        } else if (e < currentElevation && w >= currentElevation) {
          return this.tilesets.textures.terrain[5][6]; // SE extension
        } else {
          // Regular bottom extension
          const col = 1 + Math.floor(Math.random() * 5);
          return this.tilesets.textures.terrain[5][col];
        }
      }
    }
    
    return null; // No extension needed
  }
}