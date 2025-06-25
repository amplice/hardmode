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
    map.set(this.NEIGHBORS.SOUTH, { row: 5, col: 1 });     // Bottom edge  
    map.set(this.NEIGHBORS.WEST, { row: 1, col: 0 });      // Left edge
    map.set(this.NEIGHBORS.EAST, { row: 1, col: 6 });      // Right edge
    
    // Corner edges (two adjacent directions have elevation drops)
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.WEST, { row: 0, col: 0 });  // NW corner
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.EAST, { row: 0, col: 6 });  // NE corner
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.WEST, { row: 5, col: 0 });  // SW corner
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.EAST, { row: 5, col: 6 });  // SE corner
    
    // Inner corners (diagonal neighbors have higher elevation)
    map.set(this.NEIGHBORS.NORTHWEST, { row: 1, col: 7 });    // NW inner corner
    map.set(this.NEIGHBORS.NORTHEAST, { row: 1, col: 10 });   // NE inner corner  
    map.set(this.NEIGHBORS.SOUTHWEST, { row: 3, col: 7 });    // SW inner corner
    map.set(this.NEIGHBORS.SOUTHEAST, { row: 3, col: 10 });   // SE inner corner
    
    // Edge variations for more complex patterns
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.NORTHEAST, { row: 0, col: 2 }); // Top edge with NE
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.NORTHWEST, { row: 0, col: 3 }); // Top edge with NW
    
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.SOUTHEAST, { row: 5, col: 2 }); // Bottom edge with SE
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.SOUTHWEST, { row: 5, col: 3 }); // Bottom edge with SW
    
    map.set(this.NEIGHBORS.WEST | this.NEIGHBORS.NORTHWEST, { row: 2, col: 0 });  // Left edge with NW
    map.set(this.NEIGHBORS.WEST | this.NEIGHBORS.SOUTHWEST, { row: 3, col: 0 });  // Left edge with SW
    
    map.set(this.NEIGHBORS.EAST | this.NEIGHBORS.NORTHEAST, { row: 2, col: 6 });  // Right edge with NE
    map.set(this.NEIGHBORS.EAST | this.NEIGHBORS.SOUTHEAST, { row: 3, col: 6 });  // Right edge with SE
    
    // Complex corners with multiple edges
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.WEST | this.NEIGHBORS.NORTHWEST, { row: 0, col: 0 }); // NW complex
    map.set(this.NEIGHBORS.NORTH | this.NEIGHBORS.EAST | this.NEIGHBORS.NORTHEAST, { row: 0, col: 6 }); // NE complex
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.WEST | this.NEIGHBORS.SOUTHWEST, { row: 5, col: 0 }); // SW complex
    map.set(this.NEIGHBORS.SOUTH | this.NEIGHBORS.EAST | this.NEIGHBORS.SOUTHEAST, { row: 5, col: 6 }); // SE complex
    
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
   * Check for inner corners (when diagonal neighbor is lower but cardinals are same)
   */
  hasInnerCorner(x, y, elevationData) {
    const width = elevationData[0].length;
    const height = elevationData.length;
    const currentElevation = elevationData[y][x];
    
    // Check each diagonal for inner corners
    const corners = [
      { dx: -1, dy: -1, bit: this.NEIGHBORS.NORTHWEST, name: 'NW' },  // NW
      { dx: 1, dy: -1, bit: this.NEIGHBORS.NORTHEAST, name: 'NE' },   // NE  
      { dx: -1, dy: 1, bit: this.NEIGHBORS.SOUTHWEST, name: 'SW' },   // SW
      { dx: 1, dy: 1, bit: this.NEIGHBORS.SOUTHEAST, name: 'SE' }     // SE
    ];
    
    for (const corner of corners) {
      const dx = corner.dx;
      const dy = corner.dy;
      const nx = x + dx;
      const ny = y + dy;
      
      // Check if diagonal neighbor exists and is lower
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const diagonalElevation = elevationData[ny][nx];
        
        if (diagonalElevation < currentElevation) {
          // Check if the two adjacent cardinal neighbors are same elevation
          const cardX = x + dx;
          const cardY = y;
          const cardX2 = x;
          const cardY2 = y + dy;
          
          let card1Same = false;
          let card2Same = false;
          
          if (cardX >= 0 && cardX < width) {
            card1Same = elevationData[cardY][cardX] === currentElevation;
          }
          if (cardY2 >= 0 && cardY2 < height) {
            card2Same = elevationData[cardY2][cardX2] === currentElevation;
          }
          
          // If both cardinals are same elevation, this is an inner corner
          if (card1Same && card2Same) {
            return corner.bit;
          }
        }
      }
    }
    
    return 0; // No inner corner
  }
  
  /**
   * Get the appropriate tile texture for a position based on elevation data
   */
  getTileTexture(x, y, elevationData) {
    const currentElevation = elevationData[y][x];
    
    // For ground level tiles, check for inner corners first
    if (currentElevation === 0) {
      const innerCorner = this.hasInnerCorner(x, y, elevationData);
      if (innerCorner) {
        const tileCoords = this.bitmaskToTile.get(innerCorner);
        if (tileCoords) {
          console.log(`[DEBUG] Inner corner at (${x}, ${y}): bit=${innerCorner}, tile=[${tileCoords.row}, ${tileCoords.col}]`);
          return this.tilesets.textures.terrain[tileCoords.row][tileCoords.col];
        }
      }
      return this.tilesets.getRandomPureGrass();
    }
    
    // For elevated tiles, calculate bitmask and get cliff tile
    const bitmask = this.calculateBitmask(x, y, elevationData);
    const tileCoords = this.bitmaskToTile.get(bitmask);
    
    if (tileCoords) {
      // console.log(`[DEBUG] Cliff tile at (${x}, ${y}): elevation=${currentElevation}, bitmask=${bitmask}, tile=[${tileCoords.row}, ${tileCoords.col}]`);
      return this.tilesets.textures.terrain[tileCoords.row][tileCoords.col];
    }
    
    // Fallback: try to find a close match or use pure grass
    const fallback = this.findClosestMatch(bitmask);
    if (fallback) {
      // console.log(`[DEBUG] Fallback cliff tile at (${x}, ${y}): elevation=${currentElevation}, bitmask=${bitmask}`);
      return fallback;
    }
    
    return this.tilesets.getRandomPureGrass();
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
      return this.tilesets.textures.terrain[5][0]; // SW corner
    } else if (hasSouth && hasEast) {
      return this.tilesets.textures.terrain[5][6]; // SE corner
    } else if (hasNorth) {
      return this.tilesets.textures.terrain[0][1]; // Top edge
    } else if (hasSouth) {
      return this.tilesets.textures.terrain[5][1]; // Bottom edge
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
        console.log(`[DEBUG] Cliff extension needed at (${x}, ${y}): current=${currentElevation}, below=${belowElevation}`);
        
        // Check neighboring elevations for corner extensions
        const w = x > 0 ? elevationData[y][x - 1] : 0;
        const e = x < width - 1 ? elevationData[y][x + 1] : 0;
        
        if (w < currentElevation && e >= currentElevation) {
          console.log(`[DEBUG] SW corner extension at (${x}, ${y})`);
          return this.tilesets.textures.terrain[6][0]; // SW extension
        } else if (e < currentElevation && w >= currentElevation) {
          console.log(`[DEBUG] SE corner extension at (${x}, ${y})`);
          return this.tilesets.textures.terrain[6][6]; // SE extension
        } else {
          // Regular bottom extension
          const col = 1 + Math.floor(Math.random() * 5);
          console.log(`[DEBUG] Regular bottom extension at (${x}, ${y}), col=${col}`);
          return this.tilesets.textures.terrain[6][col];
        }
      }
    }
    
    return null; // No extension needed
  }
}