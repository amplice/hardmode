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
    
    const noiseScale = 0.05;
    const waterNoiseScale = 0.08;   // ADDED: Tune for lake size
    const waterThreshold = -0.3;    // ADDED: Tune for water amount
    const sandDistanceThreshold = 3;// ADDED: Min distance from sand
    this.createWorldBoundary();
    // Create base terrain using noise
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        const noiseValue = this.noise2D(x * noiseScale, y * noiseScale);
        const terrainType = noiseValue < 0 ? 'sand' : 'grass';
        
        const tile = new Tile(x, y, terrainType, this.tilesets, this.tileSize);
        this.tiles[y][x] = tile;
        this.container.addChild(tile.container);
      }
    }
    // --- Step 2: ADDED - Generate Water ---
    console.log("Generating water...");
    const potentialWaterTiles = [];
    for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
            // Condition 1: Must be on a grass tile
            if (this.tiles[y][x].type === 'grass') {
                const waterNoiseValue = this.waterNoise2D(x * waterNoiseScale, y * waterNoiseScale);
                // Condition 2: Noise value must be below threshold
                if (waterNoiseValue < waterThreshold) {
                    // Condition 3: Must be far enough from sand
                    if (this.isFarEnoughFromSand(x, y, sandDistanceThreshold)) {
                         potentialWaterTiles.push({x, y});
                    }
                }
            }
        }
    }

    // Convert potential water tiles to actual water tiles
    potentialWaterTiles.forEach(pos => {
        const tile = this.tiles[pos.y][pos.x];
        if (tile && tile.type === 'grass') { // Double-check it's still grass before changing
             // Use the new helper method to change type and base sprite
             tile.setBaseType('water', this.tilesets);
        }
    });
    console.log(`Generated ${potentialWaterTiles.length} water tiles.`);
    
    // Add a 9x9 sand area in the center for debugging
    // this.createDebugSandArea();
    
    // Process all transitions
    this.processTransitions();
    this.processWaterTransitions();
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
  // Create a 9x9 sand area in the center
  createDebugSandArea() {
    // Calculate center of the world
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    
    // Create a 9x9 sand area centered at the world center
    const size = 4; // This will create a 9x9 area (center + 4 tiles in each direction)
    
    for (let y = centerY - size; y <= centerY + size; y++) {
      for (let x = centerX - size; x <= centerX + size; x++) {
        // Make sure coordinates are within world bounds
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          // Remove existing tile
          this.container.removeChild(this.tiles[y][x].container);
          
          // Create a new sand tile
          const tile = new Tile(x, y, 'sand', this.tilesets, this.tileSize);
          this.tiles[y][x] = tile;
          this.container.addChild(tile.container);
        }
      }
    }
    
    // Ensure there's grass around the sand area
    const borderSize = size + 1;
    for (let y = centerY - borderSize; y <= centerY + borderSize; y++) {
      for (let x = centerX - borderSize; x <= centerX + borderSize; x++) {
        // Skip the inner sand area
        if (x >= centerX - size && x <= centerX + size && 
            y >= centerY - size && y <= centerY + size) {
          continue;
        }
        
        // Make sure coordinates are within world bounds
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          // Remove existing tile
          this.container.removeChild(this.tiles[y][x].container);
          
          // Create a new grass tile
          const tile = new Tile(x, y, 'grass', this.tilesets, this.tileSize);
          this.tiles[y][x] = tile;
          this.container.addChild(tile.container);
        }
      }
    }
    
    console.log(`Created 9x9 sand area at center (${centerX}, ${centerY}), surrounded by grass`);
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

// Replace the existing processWaterTransitions method in js/systems/world/WorldGenerator.js
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

              // --- Priority 1: 3-Neighbor Inner Corner Match Cases ---
              // Check ONLY the 3 required neighbors for these specific patterns.
              if (neighbors.n && neighbors.w) { // Water N, W, NW
                   edgeType = 'inner-NE-match'; // Grass forms SE point -> Tile Index 3
              }
              else if (neighbors.n && neighbors.e) { // Water N, E, NE
                   edgeType = 'inner-NW-match'; // Grass forms SW point -> Tile Index 4
              }
              else if (neighbors.s && neighbors.w) { // Water S, W, SW
                   edgeType = 'inner-SE-match'; // Grass forms NE point -> Tile Index 8
              }
              else if (neighbors.s && neighbors.e) { // Water S, E, SE
                   edgeType = 'inner-SW-match'; // Grass forms NW point -> Tile Index 9
              }

              // --- Priority 2: Diagonal-Only Outer Corners ---
              // Check diagonal is water AND adjacent cardinals are NOT water.
              else if (neighbors.nw && !neighbors.n && !neighbors.w) {
                  edgeType = 'inner-bottom-right'; // Tile Index 12
              }
              else if (neighbors.ne && !neighbors.n && !neighbors.e) {
                  edgeType = 'inner-bottom-left';  // Tile Index 10
              }
              else if (neighbors.sw && !neighbors.s && !neighbors.w) {
                  edgeType = 'inner-top-right';   // Tile Index 2
              }
              else if (neighbors.se && !neighbors.s && !neighbors.e) {
                  edgeType = 'inner-top-left';    // Tile Index 0
              }

              // --- Priority 3: Simple Edge Cases ---
              // Check ONLY the single relevant cardinal direction.
              else if (neighbors.n) { // Water N is present (and no corner matched)
                  edgeType = 'inner-bottom'; // Tile Index 11
              }
              else if (neighbors.s) { // Water S is present (and no corner matched)
                  edgeType = 'inner-top'; // Tile Index 1
              }
              else if (neighbors.w) { // Water W is present (and no corner matched)
                  edgeType = 'inner-right'; // Tile Index 7
              }
              else if (neighbors.e) { // Water E is present (and no corner matched)
                  edgeType = 'inner-left'; // Tile Index 5
              }

              // --- Apply or Remove Overlay ---
              if (edgeType) {
                  // Add/update overlay only if it's different from current or doesn't exist
                  if (!tile.waterOverlaySprite || tile.waterOverlayType !== edgeType) {
                      tile.addWaterOverlay(edgeType, this.tilesets);
                  }
              } else {
                  // If no condition met, ensure no overlay exists
                  if (tile.waterOverlaySprite) {
                      tile.removeWaterOverlay(); // Ensure removeWaterOverlay exists in Tile.js
                  }
              }
          } else {
               // If tile is NOT grass, ensure it doesn't have a water overlay
               if (tile.waterOverlaySprite) {
                   tile.removeWaterOverlay(); // Ensure removeWaterOverlay exists in Tile.js
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