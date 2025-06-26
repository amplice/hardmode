// Cliff autotiling using bitmasking for MainLev2.0 tileset
// Based on elevation differences between neighboring tiles

import { GAME_CONSTANTS } from '../../../../shared/constants/GameConstants.js';

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
    
    // Replace inner corners with diagonal connectors
    map.set(this.NEIGHBORS.NORTHWEST, { row: 2, col: 7 });    // Use (2,7) instead of (7,0)
    map.set(this.NEIGHBORS.NORTHEAST, { row: 2, col: 10 });   // Use (2,10) instead of (7,6)
    map.set(this.NEIGHBORS.SOUTHWEST, { row: 4, col: 8 });    // Use (4,8) instead of (7,8)
    map.set(this.NEIGHBORS.SOUTHEAST, { row: 4, col: 9 });    // Use (4,9) instead of (7,7)
    
    // Diagonal tiles - using string keys for specific tile coordinates
    map.set('0,8', { row: 0, col: 8 });    // NW diagonal corner
    map.set('0,9', { row: 0, col: 9 });    // NE diagonal corner  
    map.set('1,7', { row: 1, col: 7 });    // SW diagonal edge
    map.set('1,8', { row: 1, col: 8 });    // E of (1,7) when connecting to corner
    map.set('1,9', { row: 1, col: 9 });    // W of (1,10) when connecting to corner
    map.set('1,10', { row: 1, col: 10 });  // SE diagonal edge
    map.set('2,7', { row: 2, col: 7 });    // West-side diagonal connector
    map.set('2,10', { row: 2, col: 10 });  // East-side diagonal connector
    
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
   * Get diagonal type based on position - follows specific tile placement rules
   */
  getDiagonalType(x, y, elevationData, processedTiles) {
    const width = elevationData[0].length;
    const height = elevationData.length;
    const current = elevationData[y][x];
    
    if (current === 0) return null; // Not elevated
    
    // Helper to safely get elevation
    const getElev = (dx, dy) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return -1;
      return elevationData[ny][nx];
    };
    
    // Helper to get previously processed tile type
    const getProcessedType = (dx, dy) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return null;
      if (!processedTiles || !processedTiles[ny]) return null;
      return processedTiles[ny][nx] || null;
    };
    
    // Get neighbors
    const n = getElev(0, -1);
    const ne = getElev(1, -1);
    const e = getElev(1, 0);
    const se = getElev(1, 1);
    const s = getElev(0, 1);
    const sw = getElev(-1, 1);
    const w = getElev(-1, 0);
    const nw = getElev(-1, -1);
    
    // Get already processed tile types
    const nType = getProcessedType(0, -1);
    const neType = getProcessedType(1, -1);
    const eType = getProcessedType(1, 0);
    const wType = getProcessedType(-1, 0);
    const nwType = getProcessedType(-1, -1);
    const seType = getProcessedType(1, 1);
    const swType = getProcessedType(-1, 1);
    
    // First check for connector tiles (2,7) and (2,10)
    
    // Debug logging for connector tile detection
    if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING && (nType === '0,9' || nType === '1,10' || nType === '0,8' || nType === '1,7')) {
      console.log(`[DEBUG] Potential connector at (${x}, ${y}): nType=${nType}, eType=${eType}, wType=${wType}`);
    }
    
    // No need for special checks anymore - the bitmask mapping handles it directly
    // The NORTHWEST and NORTHEAST bitmasks now map directly to (2,7) and (2,10)
    
    // Check for diagonal corner starts (0,8) and (0,9)
    
    // Check for (0,8) - NW diagonal corner (start of SW diagonal)
    if (n < current && w < current && nw < current && 
        s >= current && e >= current && ne < current) {
      // This is the start of a diagonal edge going southeast
      return '0,8';
    }
    
    // Check for (0,9) - NE diagonal corner (start of SE diagonal)
    if (n < current && e < current && ne < current &&
        s >= current && w >= current && nw < current) {
      // This is the start of a diagonal edge going southwest
      return '0,9';
    }
    
    // Check for diagonal edge continuations (1,7) and (1,10)
    
    // Check for (1,10) - SE diagonal edge continuation
    // This continues from (0,9) in the diagonal going southwest
    if (nwType === '0,9' && n < current && e < current && 
        s >= current && w >= current) {
      return '1,10';
    }
    
    // Check for (1,7) - SW diagonal edge continuation
    // This continues from (0,8) in the diagonal going southeast  
    if (neType === '0,8' && n < current && w < current &&
        s >= current && e >= current) {
      return '1,7';
    }
    
    // Additional checks for (1,8) and (1,9) bridge tiles
    
    // Check for (1,8) - E of (1,7) when connecting to corner
    if (wType === '1,7' && (nwType === '0,0' || nwType === '0,8')) {
      return '1,8';
    }
    
    // Check for (1,9) - W of (1,10) when connecting to corner
    if (eType === '1,10' && (neType === '0,6' || neType === '0,9')) {
      return '1,9';
    }
    
    return null; // No diagonal pattern
  }
  
  /**
   * Get the appropriate tile texture for a position based on elevation data
   */
  getTileTexture(x, y, elevationData, processedTiles) {
    const currentElevation = elevationData[y][x];
    
    // For ground level tiles, check for inner corners first
    if (currentElevation === 0) {
      const innerCorner = this.hasInnerCorner(x, y, elevationData);
      if (innerCorner) {
        const tileCoords = this.bitmaskToTile.get(innerCorner);
        if (tileCoords) {
          // console.log(`[DEBUG] Inner corner at (${x}, ${y}): bit=${innerCorner}, tile=[${tileCoords.row}, ${tileCoords.col}]`);
          return { 
            texture: this.tilesets.textures.terrain[tileCoords.row][tileCoords.col],
            type: `${tileCoords.row},${tileCoords.col}`
          };
        }
      }
      return { 
        texture: this.tilesets.getRandomPureGrass(),
        type: 'grass'
      };
    }
    
    // For elevated tiles, first check for diagonal patterns
    const diagonalType = this.getDiagonalType(x, y, elevationData, processedTiles);
    if (diagonalType) {
      const tileCoords = this.bitmaskToTile.get(diagonalType);
      if (tileCoords) {
        if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
          console.log(`[DEBUG] Diagonal cliff at (${x}, ${y}): type=${diagonalType}, tile=[${tileCoords.row}, ${tileCoords.col}]`);
        }
        return {
          texture: this.tilesets.textures.terrain[tileCoords.row][tileCoords.col],
          type: diagonalType
        };
      }
    }
    
    // If no diagonal pattern, use regular bitmask
    const bitmask = this.calculateBitmask(x, y, elevationData);
    const tileCoords = this.bitmaskToTile.get(bitmask);
    
    if (tileCoords) {
      // Log when we're placing diagonal connectors via the bitmask
      if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
        if (bitmask === this.NEIGHBORS.NORTHWEST && tileCoords.row === 2 && tileCoords.col === 7) {
          console.log(`[DEBUG] Placing (2,7) at (${x}, ${y}) via NORTHWEST bitmask`);
        } else if (bitmask === this.NEIGHBORS.NORTHEAST && tileCoords.row === 2 && tileCoords.col === 10) {
          console.log(`[DEBUG] Placing (2,10) at (${x}, ${y}) via NORTHEAST bitmask`);
        } else if (bitmask === this.NEIGHBORS.SOUTHWEST && tileCoords.row === 4 && tileCoords.col === 8) {
          console.log(`[DEBUG] Placing (4,8) at (${x}, ${y}) via SOUTHWEST bitmask`);
        } else if (bitmask === this.NEIGHBORS.SOUTHEAST && tileCoords.row === 4 && tileCoords.col === 9) {
          console.log(`[DEBUG] Placing (4,9) at (${x}, ${y}) via SOUTHEAST bitmask`);
        }
        
        console.log(`[DEBUG] Cliff tile at (${x}, ${y}): elevation=${currentElevation}, bitmask=${bitmask}, tile=[${tileCoords.row}, ${tileCoords.col}]`);
      }
      return {
        texture: this.tilesets.textures.terrain[tileCoords.row][tileCoords.col],
        type: `${tileCoords.row},${tileCoords.col}`
      };
    }
    
    // Fallback: try to find a close match or use pure grass
    const fallback = this.findClosestMatch(bitmask);
    if (fallback) {
      // console.log(`[DEBUG] Fallback cliff tile at (${x}, ${y}): elevation=${currentElevation}, bitmask=${bitmask}`);
      return { texture: fallback, type: 'fallback' };
    }
    
    return { 
      texture: this.tilesets.getRandomPureGrass(),
      type: 'grass'
    };
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
  getCliffExtensionTexture(x, y, elevationData, processedTiles) {
    const width = elevationData[0].length;
    const height = elevationData.length;
    const currentElevation = elevationData[y][x];
    
    // Get the tile type of the current position
    const currentType = processedTiles && processedTiles[y] ? processedTiles[y][x] : null;
    
    // Diagonal tiles should NOT have extensions - they are complete tiles
    if (currentType && (
        currentType === '0,8' || currentType === '0,9' ||    // Diagonal corners
        currentType === '1,7' || currentType === '1,8' ||    // SW diagonal tiles  
        currentType === '1,9' || currentType === '1,10' ||   // SE diagonal tiles
        currentType === '2,7' || currentType === '2,10'      // Diagonal connectors
    )) {
      return null; // No extension for diagonal tiles
    }
    
    // Check if tile below has lower elevation (cliff drop)
    if (y + 1 < height) {
      const belowElevation = elevationData[y + 1][x];
      const belowType = processedTiles && processedTiles[y + 1] ? processedTiles[y + 1][x] : null;
      
      // Don't place extension if the tile below is a cliff edge or diagonal
      if (belowType && belowType !== 'grass' && belowType !== 'fallback') {
        return null; // Tile below is already a cliff/diagonal tile
      }
      
      if (belowElevation < currentElevation) {
        // This needs a cliff extension
        if (GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING) {
          console.log(`[DEBUG] Cliff extension needed at (${x}, ${y}): current=${currentElevation}, below=${belowElevation}, currentType=${currentType}, belowType=${belowType}`);
        }
        
        // Check neighboring elevations for corner extensions
        const w = x > 0 ? elevationData[y][x - 1] : 0;
        const e = x < width - 1 ? elevationData[y][x + 1] : 0;
        
        if (w < currentElevation && e >= currentElevation) {
          // console.log(`[DEBUG] SW corner extension at (${x}, ${y})`);
          return this.tilesets.textures.terrain[6][0]; // SW extension
        } else if (e < currentElevation && w >= currentElevation) {
          // console.log(`[DEBUG] SE corner extension at (${x}, ${y})`);
          return this.tilesets.textures.terrain[6][6]; // SE extension
        } else {
          // Regular bottom extension
          const col = 1 + Math.floor(Math.random() * 5);
          const texture = this.tilesets.textures.terrain[6][col];
          // console.log(`[DEBUG] Regular bottom extension at (${x}, ${y}), col=${col}, texture exists: ${!!texture}`);
          return texture;
        }
      }
    }
    
    return null; // No extension needed
  }
}