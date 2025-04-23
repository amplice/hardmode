// src/systems/world/WorldGenerator.js
import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';

export class WorldGenerator {
  constructor(options = {}) {
    this.width = options.width || 100;
    this.height = options.height || 100;
    this.tileSize = options.tileSize || 32;
    this.tilesets = options.tilesets;
    this.noise2D = createNoise2D();

    this.container = new PIXI.Container();
    this.tiles = [];
  }

  generate() {
    const noiseScale = 0.05;
    
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
    
    // Add a 9x9 sand area in the center for debugging
    this.createDebugSandArea();
    
    // Process all transitions
    this.processTransitions();
    
    return this.container;
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
      tile.addInnerCornerMatch('top-right-match', tilesets);
    }
    else if (!p[2] && p[3] && !p[4]) { // Only SE is grass
      tile.addInnerCornerMatch('bottom-right-match', tilesets);
    }
    else if (!p[4] && p[5] && !p[6]) { // Only SW is grass
      tile.addInnerCornerMatch('bottom-left-match', tilesets);
    }
    else if (!p[6] && p[7] && !p[0]) { // Only NW is grass
      tile.addInnerCornerMatch('top-left-match', tilesets);
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