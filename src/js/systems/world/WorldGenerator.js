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
    
    // Use seed if provided, otherwise use random
    const seed = options.seed || Math.random();
    const seedFunction = typeof seed === 'string' ? this.stringToSeed(seed) : () => seed;
    
    this.noise2D = createNoise2D(seedFunction);
    this.waterNoise2D = createNoise2D(seedFunction);
    this.decorations = null;
    this.container = new PIXI.Container();
    this.tiles = [];
  }
  
  stringToSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return () => Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  generate() {
    // Configuration parameters
    const params = {
      noise: {
        terrain: 0.05,
        water: 0.08
      },
      thresholds: {
        sand: -0.3,
        water: -0.5,
        sandDistance: 3,
        cardinalCleanup: 3,
        waterCleanup: 2,
        sandCleanup: 5
      }
    };
    
    console.log("Generating world...");
    
    // Create world boundary
    this.createWorldBoundary();
    
    // Generate base terrain (grass and sand)
    this.generateBaseTerrain(params);
    
    // Clean up isolated sand tiles
    this.cleanupIsolatedSand(params.thresholds.cardinalCleanup);
    
    // Generate water
    this.generateWater(params);
    
    // Clean up water formations
    this.cleanupGrassPeninsulas();
    this.cleanupThinWaterConnections(params.thresholds.waterCleanup);
    
    // Process terrain transitions
    console.log("Processing terrain transitions...");
    this.processTransitions();
    
    // Process water transitions
    console.log("Processing water transitions...");
    this.processWaterTransitions();
    
    // Generate decorations
    this.decorations = new DecorationManager(this, this.tilesets);
    const decorationsContainer = this.decorations.generateDecorations();
    this.container.addChild(decorationsContainer);
    
    console.log("World generation complete!");
    return this.container;
  }
  
  createWorldBoundary() {
    const worldBackground = new PIXI.Graphics();
    worldBackground.beginFill(0x6ea260);
    worldBackground.drawRect(0, 0, this.width * this.tileSize, this.height * this.tileSize);
    worldBackground.endFill();
    this.container.addChildAt(worldBackground, 0);
  }
  
  generateBaseTerrain(params) {
    console.log("Generating base terrain...");
    
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        const noiseValue = this.noise2D(x * params.noise.terrain, y * params.noise.terrain);
        const terrainType = noiseValue < params.thresholds.sand ? 'sand' : 'grass';
        const tile = new Tile(x, y, terrainType, this.tilesets, this.tileSize);
        this.tiles[y][x] = tile;
        this.container.addChild(tile.container);
      }
    }
  }
  
  cleanupIsolatedSand(threshold) {
    console.log("Cleaning up isolated sand tiles...");
    
    const tilesToConvert = [];
    
    // Check each sand tile
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        if (tile.type === 'sand') {
          // Count grass neighbors in cardinal directions
          const cardinalNeighbors = [
            { dx: 0, dy: -1 }, // North
            { dx: 1, dy: 0 },  // East
            { dx: 0, dy: 1 },  // South
            { dx: -1, dy: 0 }  // West
          ];
          
          let grassCount = 0;
          for (const dir of cardinalNeighbors) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
              if (this.tiles[ny][nx].type === 'grass') {
                grassCount++;
              }
            }
          }
          
          // If enough grass neighbors, convert to grass
          if (grassCount >= threshold) {
            tilesToConvert.push({ x, y });
          }
        }
      }
    }
    
    // Convert tiles
    for (const pos of tilesToConvert) {
      this.tiles[pos.y][pos.x].setType('grass', this.tilesets);
    }
    
    console.log(`Converted ${tilesToConvert.length} isolated sand tiles to grass.`);
  }
  
  generateWater(params) {
    console.log("Generating water tiles...");
    
    const waterTiles = [];
    
    // Find potential water tiles
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        if (tile.type === 'grass') {
          const waterNoise = this.waterNoise2D(x * params.noise.water, y * params.noise.water);
          
          if (waterNoise < params.thresholds.water && 
              this.isFarEnoughFromSand(x, y, params.thresholds.sandDistance)) {
            waterTiles.push({ x, y });
          }
        }
      }
    }
    
    // Convert to water
    for (const pos of waterTiles) {
      this.tiles[pos.y][pos.x].setType('water', this.tilesets);
    }
    
    console.log(`Created ${waterTiles.length} water tiles.`);
  }
  
  cleanupGrassPeninsulas() {
    console.log("Cleaning up grass peninsulas...");
    
    let count = 0;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        if (tile.type === 'grass') {
          // Check if this grass tile is surrounded by water on 3 sides
          const neighbors = {
            n: this.getTileType(x, y - 1) === 'water',
            e: this.getTileType(x + 1, y) === 'water',
            s: this.getTileType(x, y + 1) === 'water',
            w: this.getTileType(x - 1, y) === 'water'
          };
          
          const waterCount = Object.values(neighbors).filter(v => v).length;
          
          if (waterCount === 3) {
            tile.setType('water', this.tilesets);
            count++;
          }
        }
      }
    }
    
    console.log(`Converted ${count} grass peninsula tiles to water.`);
  }
  
  cleanupThinWaterConnections(threshold) {
    console.log("Cleaning up thin water connections...");
    
    const tilesToConvert = [];
    
    // Find water tiles with few water neighbors
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        if (tile.type === 'water') {
          let waterNeighborCount = 0;
          
          // Check all 8 surrounding tiles
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                if (this.tiles[ny][nx].type === 'water') {
                  waterNeighborCount++;
                }
              }
            }
          }
          
          // If too few water neighbors, convert back to grass
          if (waterNeighborCount <= threshold) {
            tilesToConvert.push({ x, y });
          }
        }
      }
    }
    
    // Convert tiles
    for (const pos of tilesToConvert) {
      this.tiles[pos.y][pos.x].setType('grass', this.tilesets);
    }
    
    console.log(`Converted ${tilesToConvert.length} thin water tiles to grass.`);
  }
  
  processTransitions() {
    // Process grass-sand transitions
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        if (tile.type !== 'sand') continue;
        
        // Get neighboring tile types
        const neighbors = {
          n:  this.getTileType(x, y - 1),
          ne: this.getTileType(x + 1, y - 1),
          e:  this.getTileType(x + 1, y),
          se: this.getTileType(x + 1, y + 1),
          s:  this.getTileType(x, y + 1),
          sw: this.getTileType(x - 1, y + 1),
          w:  this.getTileType(x - 1, y),
          nw: this.getTileType(x - 1, y - 1)
        };
        
        // Create a pattern string
        let pattern = '';
        for (const dir of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
          pattern += neighbors[dir] === 'grass' ? '1' : '0';
        }
        
        this.applyTransitionForPattern(tile, pattern);
      }
    }
  }
  
  applyTransitionForPattern(tile, pattern) {
    // Convert pattern to array of booleans
    const p = pattern.split('').map(bit => bit === '1');
    
    // Check for specific transition cases
    
    // Cardinal directions
    if (p[0] && !p[2] && !p[4] && !p[6]) { // Only North is grass
      tile.convertToTransition('top', this.tilesets);
    }
    else if (!p[0] && p[2] && !p[4] && !p[6]) { // Only East is grass
      tile.convertToTransition('right', this.tilesets);
    }
    else if (!p[0] && !p[2] && p[4] && !p[6]) { // Only South is grass
      tile.convertToTransition('bottom', this.tilesets);
    }
    else if (!p[0] && !p[2] && !p[4] && p[6]) { // Only West is grass
      tile.convertToTransition('left', this.tilesets);
    }
    
    // Corner transitions
    else if (p[0] && !p[2] && !p[4] && p[6]) { // North and West are grass
      tile.convertToTransition('top-left', this.tilesets);
    }
    else if (p[0] && p[2] && !p[4] && !p[6]) { // North and East are grass
      tile.convertToTransition('top-right', this.tilesets);
    }
    else if (!p[0] && !p[2] && p[4] && p[6]) { // South and West are grass
      tile.convertToTransition('bottom-left', this.tilesets);
    }
    else if (!p[0] && p[2] && p[4] && !p[6]) { // South and East are grass
      tile.convertToTransition('bottom-right', this.tilesets);
    }
    
    // Inner corner matches
    else if (!p[0] && p[1] && !p[2]) { // Only NE is grass
      tile.addInnerCornerMatch('bottom-left-match', this.tilesets);
    }
    else if (!p[2] && p[3] && !p[4]) { // Only SE is grass
      tile.addInnerCornerMatch('top-left-match', this.tilesets);
    }
    else if (!p[4] && p[5] && !p[6]) { // Only SW is grass
      tile.addInnerCornerMatch('top-right-match', this.tilesets);
    }
    else if (!p[6] && p[7] && !p[0]) { // Only NW is grass
      tile.addInnerCornerMatch('bottom-right-match', this.tilesets);
    }
  }
  
  processWaterTransitions() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        if (tile.type === 'grass') {
          // Check if this grass tile needs a water overlay
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
          
          const edgeType = this.determineWaterEdgeType(neighbors);
          
          if (edgeType) {
            tile.addWaterOverlay(edgeType, this.tilesets);
          } else {
            tile.removeWaterOverlay();
          }
        } else {
          // Non-grass tiles should not have water overlays
          if (tile.waterOverlaySprite) {
            tile.removeWaterOverlay();
          }
        }
      }
    }
  }
  
  determineWaterEdgeType(neighbors) {
    // Skip U-shaped water patterns
    if (neighbors.n && neighbors.e && neighbors.w && !neighbors.s) return null;
    if (neighbors.s && neighbors.e && neighbors.w && !neighbors.n) return null;
    if (neighbors.n && neighbors.s && neighbors.w && !neighbors.e) return null;
    if (neighbors.n && neighbors.s && neighbors.e && !neighbors.w) return null;
    
    // 3-Neighbor inner corner match cases
    if (neighbors.n && neighbors.w && !neighbors.e && !neighbors.s) {
      return 'inner-NE-match';
    }
    else if (neighbors.n && neighbors.e && !neighbors.w && !neighbors.s) {
      return 'inner-NW-match';
    }
    else if (neighbors.s && neighbors.w && !neighbors.e && !neighbors.n) {
      return 'inner-SE-match';
    }
    else if (neighbors.s && neighbors.e && !neighbors.w && !neighbors.n) {
      return 'inner-SW-match';
    }
    
    // Diagonal-only outer corners
    else if (neighbors.nw && !neighbors.n && !neighbors.w) return 'inner-bottom-right';
    else if (neighbors.ne && !neighbors.n && !neighbors.e) return 'inner-bottom-left';
    else if (neighbors.sw && !neighbors.s && !neighbors.w) return 'inner-top-right';
    else if (neighbors.se && !neighbors.s && !neighbors.e) return 'inner-top-left';
    
    // Simple edge cases
    else if (neighbors.n && !neighbors.e && !neighbors.w && !neighbors.s) return 'inner-bottom';
    else if (neighbors.s && !neighbors.n && !neighbors.e && !neighbors.w) return 'inner-top';
    else if (neighbors.w && !neighbors.n && !neighbors.s && !neighbors.e) return 'inner-right';
    else if (neighbors.e && !neighbors.n && !neighbors.s && !neighbors.w) return 'inner-left';
    
    return null;
  }
  
  // Helper methods
  isFarEnoughFromSand(x, y, distance) {
    for (let dy = -distance; dy <= distance; dy++) {
      for (let dx = -distance; dx <= distance; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          const tileType = this.getTileType(nx, ny);
          
          if ((tileType === 'sand' || tileType === 'transition') && 
              Math.abs(dx) + Math.abs(dy) <= distance) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
  
  getTileType(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.tiles[y][x].type;
  }
  
  getTileAt(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.tiles[y][x];
  }
  
  isTileWalkable(worldX, worldY) {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);
    const tile = this.getTileAt(tileX, tileY);
    return tile ? tile.isWalkable() : false;
  }
}