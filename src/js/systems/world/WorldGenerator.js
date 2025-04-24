// src/systems/world/WorldGenerator.js
import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';
import { DecorationManager } from '../tiles/DecorationManager.js';

export class WorldGenerator {
  constructor(options = {}) {
    this.width = options.width || 100;
    this.height = options.height || 100;
    this.tileSize = options.tileSize || 32;
    this.tilesets = options.tilesets;
    this.noise2D = createNoise2D();
    this.waterNoise2D = createNoise2D(Math.random); // ADDED: Separate noise for water
    this.decorations = null;
    this.container = new PIXI.Container();
    this.tiles = [];
  }

  generate() {
    // --- Parameters ---
    const terrainNoiseScale = 0.05;
    const waterNoiseScale = 0.08;
    const waterThreshold = -0.3;
    const sandDistanceThreshold = 3;
    const cardinalCleanupThreshold = 3; // <-- Convert sand if >= 3 (out of 4) CARDINAL neighbors are grass
    const waterDistanceThreshold = 3; // Keep this if you want space between lakes
    const sandCleanupThreshold = 5; // <-- NEW: Convert sand if >= 5 (of 8) neighbors are grass. Adjust if needed (3, 4, 5, 6...).
    this.createWorldBoundary();

    // --- Step 1: Create base terrain (Grass/Sand) ---
    console.log("Generating base terrain...");
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        const noiseValue = this.noise2D(x * terrainNoiseScale, y * terrainNoiseScale);
        const terrainType = noiseValue < 0 ? 'sand' : 'grass';
        const tile = new Tile(x, y, terrainType, this.tilesets, this.tileSize);
        this.tiles[y][x] = tile;
        this.container.addChild(tile.container);
      }
    }
    console.log("Base terrain generated.");
// --- Step 1.5: Cleanup Isolated/Protruding Sand --- MODIFIED LOGIC
console.log("Cleaning up isolated sand tiles (using cardinal neighbors)...");
let sandCleanupCount = 0;
const sandTilesToConvert = [];

for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
         const tile = this.tiles[y][x];

         // Only consider SAND tiles
         if (tile.type === 'sand') {
             let cardinalGrassNeighborCount = 0;
             // Define cardinal neighbors relative offsets
             const cardinalNeighbors = [
                 { dx: 0, dy: -1 }, // North
                 { dx: 1, dy: 0 },  // East
                 { dx: 0, dy: 1 },  // South
                 { dx: -1, dy: 0 }  // West
             ];

             // Check only the 4 cardinal neighbors
             for (const n of cardinalNeighbors) {
                 const nx = x + n.dx;
                 const ny = y + n.dy;

                 // Check bounds and neighbor type
                 if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                     if (this.tiles[ny][nx].type === 'grass') {
                         cardinalGrassNeighborCount++;
                     }
                 }
                 // Optional: else if out of bounds, count as grass? Usually no.
             }

             // If surrounded by enough grass cardinally, mark for conversion
             if (cardinalGrassNeighborCount >= cardinalCleanupThreshold) {
                 sandTilesToConvert.push({x, y});
             }
         }
    }
}

// Convert the marked sand tiles to grass
sandTilesToConvert.forEach(pos => {
    const tile = this.tiles[pos.y][pos.x];
     if (tile && tile.type === 'sand') { // Double check
        tile.setBaseType('grass', this.tilesets); // Convert to Grass
        sandCleanupCount++;
     }
});

if (sandCleanupCount > 0) {
    console.log(`Cleaned up ${sandCleanupCount} sand tiles (cardinal check >= ${cardinalCleanupThreshold}) by converting to grass.`);
}
// --- End of Sand Cleanup ---
    // --- Step 2: Generate Initial Water Placement ---
    console.log("Generating initial water tiles...");
    const confirmedWaterTiles = [];
    for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
            const tile = this.tiles[y][x];
            if (tile.type === 'grass') {
                const waterNoiseValue = this.waterNoise2D(x * waterNoiseScale, y * waterNoiseScale);
                if (waterNoiseValue < waterThreshold) {
                    if (this.isFarEnoughFromSand(x, y, sandDistanceThreshold)) {
                         // Check distance from other water *if* you keep that rule
                         // if (this.isFarEnoughFromOtherWater(x, y, waterDistanceThreshold, confirmedWaterTiles)) {
                              confirmedWaterTiles.push({x, y});
                         // }
                    }
                }
            }
        }
    }
    // Convert the initially selected water tiles
    confirmedWaterTiles.forEach(pos => {
        const tile = this.tiles[pos.y][pos.x];
        if (tile && tile.type === 'grass') {
             tile.setBaseType('water', this.tilesets);
        }
    });
    console.log(`Generated ${confirmedWaterTiles.length} initial water tiles.`);


    // --- Step 2.5: NEW - Cleanup Single Grass Peninsulas ---
    console.log("Cleaning up single grass peninsulas...");
    let cleanupCount = 0;
    for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
            const tile = this.tiles[y][x];

            // Look for GRASS tiles to potentially convert
            if (tile.type === 'grass') {
                const neighbors = {
                    n: this.getTileType(x, y - 1) === 'water',
                    e: this.getTileType(x + 1, y) === 'water',
                    s: this.getTileType(x, y + 1) === 'water',
                    w: this.getTileType(x - 1, y) === 'water'
                };

                // Check for the U-shape water patterns around this grass tile
                const waterNeighborCount = (neighbors.n ? 1:0) + (neighbors.e ? 1:0) + (neighbors.s ? 1:0) + (neighbors.w ? 1:0);

                // If exactly 3 cardinal neighbors are water, convert this grass tile to water
                if (waterNeighborCount === 3) {
                    tile.setBaseType('water', this.tilesets);
                    cleanupCount++;
                }
            }
        }
    }
    if (cleanupCount > 0) {
        console.log(`Cleaned up ${cleanupCount} grass peninsula tiles by converting to water.`);
    }


    // --- Step 3: Process Grass/Sand transitions ---
    // (Keep existing code - this runs *after* cleanup)
    console.log("Processing sand/grass transitions...");
    this.processTransitions();
    console.log("Sand/grass transitions processed.");


    // --- Step 4: Process Water transitions ---
    // (Keep existing code - this runs *after* cleanup)
    console.log("Processing water transitions...");
    this.processWaterTransitions(); // This will now only process edges/corners around the cleaned-up water shape
    console.log("Water transitions processed.");


    // --- Step 5: Generate decorations ---
    // (Keep existing code)
    console.log("Generating decorations...");
this.decorations = new DecorationManager(this, this.tilesets);
    const decorationsContainer = this.decorations.generateDecorations();
    this.container.addChild(decorationsContainer);

    return this.container;
  }
  createWorldBoundary() {
    // Create a green background just for the world area
    const worldBackground = new PIXI.Graphics();
    worldBackground.beginFill(0x6ea260); // Green color matching your grass
    worldBackground.drawRect(0, 0, this.width * this.tileSize, this.height * this.tileSize);
    worldBackground.endFill();
    
    // Add it to the container but underneath everything else
    this.container.addChildAt(worldBackground, 0);
  }
  
  // REPLACE YOUR EXISTING processTransitions() WITH THIS NEW ONE
  processTransitions() {
    // Create a map to store transition information
    const transitions = {};
    
    // First pass: analyze every sand tile
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        // Skip non-sand tiles
        if (tile.type !== 'sand') continue;
        
        // Get all 8 neighbors (N, NE, E, SE, S, SW, W, NW)
        const neighbors = {
          n:  this.getTileType(x, y-1),
          ne: this.getTileType(x+1, y-1),
          e:  this.getTileType(x+1, y),
          se: this.getTileType(x+1, y+1),
          s:  this.getTileType(x, y+1),
          sw: this.getTileType(x-1, y+1),
          w:  this.getTileType(x-1, y),
          nw: this.getTileType(x-1, y-1)
        };
        
        // Create a binary pattern based on which neighbors are grass
        let pattern = '';
        for (const dir of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
          pattern += neighbors[dir] === 'grass' ? '1' : '0';
        }
        
        // Store this pattern for later processing
        transitions[`${x},${y}`] = pattern;
      }
    }
    
    // Second pass: apply transitions based on patterns
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const key = `${x},${y}`;
        if (!transitions[key]) continue;
        
        const pattern = transitions[key];
        const tile = this.tiles[y][x];
        
        // Apply specific transitions based on the pattern
        this.applyTransitionForPattern(tile, pattern, this.tilesets);
      }
    }
  }
  
  // ADD THIS NEW METHOD
  applyTransitionForPattern(tile, pattern, tilesets) {
    // Convert pattern to array for easier access
    const p = pattern.split('').map(bit => bit === '1');
    
    // Check for specific transition cases (simplifying to the most common cases)
    
    // Basic cardinal direction transitions
    if (p[0] && !p[2] && !p[4] && !p[6]) { // Only North is grass
      tile.convertToTransition('top', tilesets);
    }
    else if (!p[0] && p[2] && !p[4] && !p[6]) { // Only East is grass
      tile.convertToTransition('right', tilesets);
    }
    else if (!p[0] && !p[2] && p[4] && !p[6]) { // Only South is grass
      tile.convertToTransition('bottom', tilesets);
    }
    else if (!p[0] && !p[2] && !p[4] && p[6]) { // Only West is grass
      tile.convertToTransition('left', tilesets);
    }
    
    // Corner transitions
    else if (p[0] && !p[2] && !p[4] && p[6]) { // North and West are grass
      tile.convertToTransition('top-left', tilesets);
    }
    else if (p[0] && p[2] && !p[4] && !p[6]) { // North and East are grass
      tile.convertToTransition('top-right', tilesets);
    }
    else if (!p[0] && !p[2] && p[4] && p[6]) { // South and West are grass
      tile.convertToTransition('bottom-left', tilesets);
    }
    else if (!p[0] && p[2] && p[4] && !p[6]) { // South and East are grass
      tile.convertToTransition('bottom-right', tilesets);
    }
    
    // Inner corner matches
    else if (!p[0] && p[1] && !p[2]) { // Only NE is grass
      tile.addInnerCornerMatch('bottom-left-match', tilesets);
    }
    else if (!p[2] && p[3] && !p[4]) { // Only SE is grass
      tile.addInnerCornerMatch('top-left-match', tilesets);
    }
    else if (!p[4] && p[5] && !p[6]) { // Only SW is grass
      tile.addInnerCornerMatch('top-right-match', tilesets);
    }
    else if (!p[6] && p[7] && !p[0]) { // Only NW is grass
      tile.addInnerCornerMatch('bottom-right-match', tilesets);
    }
  }
  // --- ADDED New Methods ---
  isFarEnoughFromSand(x, y, distance) {
    for (let dy = -distance; dy <= distance; dy++) {
        for (let dx = -distance; dx <= distance; dx++) {
            if (dx === 0 && dy === 0) continue;

            const checkX = x + dx;
            const checkY = y + dy;

            // Check bounds first
            if (checkX >= 0 && checkX < this.width && checkY >= 0 && checkY < this.height) {
                const neighborTileType = this.getTileType(checkX, checkY); // Use the getter that returns actual type
                // Consider both 'sand' and 'transition' (which has a sand base) as sand proximity triggers
                if (neighborTileType === 'sand' || neighborTileType === 'transition') {
                     // Using Manhattan distance check for simplicity
                     if (Math.abs(dx) + Math.abs(dy) <= distance) {
                         return false; // Found sand or sand-based transition too close
                     }
                }
            }
        }
    }
    return true; // No sand found within the threshold
}

processWaterTransitions() {
  for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
          const tile = this.tiles[y][x];

          if (tile.type === 'grass') {
              const neighbors = {
                  n:  this.getTileType(x, y - 1) === 'water',
                  ne: this.getTileType(x + 1, y - 1) === 'water',
                  e:  this.getTileType(x + 1, y) === 'water',
                  se: this.getTileType(x + 1, y + 1) === 'water',
                  s:  this.getTileType(x, y + 1) === 'water',
                  sw: this.getTileType(x - 1, y + 1) === 'water',
                  w:  this.getTileType(x - 1, y) === 'water',
                  nw: this.getTileType(x - 1, y - 1) === 'water'
              };

              let edgeType = null;

              // --- Priority 1: U-Shapes (Water on 3 cardinal sides) ---
              // *** MODIFICATION START ***
              // For debugging: Explicitly do NOT assign an edgeType for these cases
              if (neighbors.n && neighbors.e && neighbors.w && !neighbors.s) { // Water N, E, W (Grass points South)
                  edgeType = null; // Intentionally skip overlay
              }
              else if (neighbors.s && neighbors.e && neighbors.w && !neighbors.n) { // Water S, E, W (Grass points North)
                  edgeType = null; // Intentionally skip overlay
              }
               else if (neighbors.n && neighbors.s && neighbors.w && !neighbors.e) { // Water N, S, W (Grass points East)
                  edgeType = null; // Intentionally skip overlay
              }
               else if (neighbors.n && neighbors.s && neighbors.e && !neighbors.w) { // Water N, S, E (Grass points West)
                  edgeType = null; // Intentionally skip overlay
              }
              // *** MODIFICATION END ***

              // --- Priority 2: 3-Neighbor Inner Corner Match Cases ---
              // (Keep existing logic)
              else if (neighbors.n && neighbors.w&& !neighbors.e && !neighbors.s) {
                   edgeType = 'inner-NE-match';
              }
              else if (neighbors.n && neighbors.e && !neighbors.w && !neighbors.s) {
                   edgeType = 'inner-NW-match';
              }
              else if (neighbors.s && neighbors.w && !neighbors.e && !neighbors.n) {
                   edgeType = 'inner-SE-match';
              }
              else if (neighbors.s && neighbors.e && !neighbors.w && !neighbors.n) {
                   edgeType = 'inner-SW-match';
              }

              // --- Priority 3: Diagonal-Only Outer Corners ---
              // (Keep existing logic)
              else if (neighbors.nw && !neighbors.n && !neighbors.w) { edgeType = 'inner-bottom-right'; }
              else if (neighbors.ne && !neighbors.n && !neighbors.e) { edgeType = 'inner-bottom-left';  }
              else if (neighbors.sw && !neighbors.s && !neighbors.w) { edgeType = 'inner-top-right';   }
              else if (neighbors.se && !neighbors.s && !neighbors.e) { edgeType = 'inner-top-left';    }

              // --- Priority 4: Simple Edge Cases ---
              // (Keep existing logic)
              else if (neighbors.n && !neighbors.e && !neighbors.w && !neighbors.s) { edgeType = 'inner-bottom'; }
              else if (neighbors.s && !neighbors.n && !neighbors.e && !neighbors.w) { edgeType = 'inner-top';    }
              else if (neighbors.w && !neighbors.n && !neighbors.s && !neighbors.e) { edgeType = 'inner-right';  }
              else if (neighbors.e && !neighbors.n && !neighbors.s && !neighbors.w) { edgeType = 'inner-left';   }


              // --- Apply or Remove Overlay ---
              // This logic remains the same. If edgeType is null, it removes any existing overlay.
              if (edgeType) {
                  if (!tile.waterOverlaySprite || tile.waterOverlayType !== edgeType) {
                      tile.addWaterOverlay(edgeType, this.tilesets);
                  }
              } else {
                  if (tile.waterOverlaySprite) {
                      tile.removeWaterOverlay();
                  }
              }
          } else {
               if (tile.waterOverlaySprite) {
                   tile.removeWaterOverlay();
               }
          }
      }
  }
}

  
  // ADD THIS HELPER METHOD IF YOU DON'T ALREADY HAVE IT
  getTileType(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.tiles[y][x].type;
  }

  // Your existing getTileAt method
  getTileAt(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.tiles[y][x];
  }

  // Your existing isTileWalkable method
  isTileWalkable(worldX, worldY) {
    const tile = this.getTileAt(Math.floor(worldX / this.tileSize), Math.floor(worldY / this.tileSize));
    return tile ? tile.isWalkable() : false;
  }
}