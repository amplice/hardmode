// Complete rewrite of world generation with proper 3x3 minimum enforcement
// Focus on generating correct terrain from the start rather than fixing it later

import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';
import { DecorationManager } from '../tiles/DecorationManager.js';
import { createSeededRandom } from '../../utils/Random.js';
import { CliffAutotiler } from '../tiles/CliffAutotilerNew.js';

export class WorldGenerator {
  constructor(options = {}) {
    this.width = options.width || 100;
    this.height = options.height || 100;
    this.tileSize = options.tileSize || 64;
    this.tilesets = options.tilesets;
    this.seed = options.seed || 1;
    this.random = createSeededRandom(this.seed);
    this.noise2D = createNoise2D(this.random);
    this.container = new PIXI.Container();
    this.tiles = [];
    this.elevationData = [];
    this.cliffAutotiler = new CliffAutotiler(this.tilesets);
  }

  generate() {
    console.log("Generating world with new simplified approach...");
    
    // Create world boundary
    this.createWorldBoundary();
    
    // Generate base terrain (all grass initially)
    this.generateBaseTerrain();
    
    // Generate elevated areas with proper constraints
    this.generateProperElevatedAreas();
    
    // Create visual tiles using new autotiler
    this.createTileSprites();
    
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
  
  generateBaseTerrain() {
    console.log("Generating base terrain...");
    
    // Initialize arrays
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      this.elevationData[y] = [];
      for (let x = 0; x < this.width; x++) {
        const tile = new Tile(x, y, 'grass', this.tilesets, this.tileSize);
        this.tiles[y][x] = tile;
        this.elevationData[y][x] = 0; // All flat initially
      }
    }
  }
  
  generateProperElevatedAreas() {
    console.log("Generating elevated areas with proper 3x3 minimum enforcement...");
    
    // Generate plateau candidates using noise
    this.generatePlateauCandidates();
    
    // Expand candidates to ensure 3x3 minimum
    this.enforceMinimumPlateauSizes();
    
    // Remove any remaining problematic formations
    this.finalCleanup();
    
    // Count elevated tiles
    let elevatedCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] > 0) elevatedCount++;
      }
    }
    console.log(`[DEBUG] Final elevated tiles: ${elevatedCount}`);
  }
  
  generatePlateauCandidates() {
    console.log("Generating plateau candidates with noise...");
    
    // Create several noise-based plateau seeds
    const plateauCount = 4 + Math.floor(this.random() * 3);
    
    for (let i = 0; i < plateauCount; i++) {
      // Choose center point with buffer for 3x3 minimum
      const cx = 10 + Math.floor(this.random() * (this.width - 20));
      const cy = 10 + Math.floor(this.random() * (this.height - 20));
      const baseRadius = 6 + Math.floor(this.random() * 8); // Larger to ensure 3x3
      
      console.log(`[DEBUG] Plateau ${i}: center (${cx}, ${cy}), radius ${baseRadius}`);
      
      // Use noise to create organic shape, but with minimum size guarantee
      this.createNoisyPlateau(cx, cy, baseRadius);
    }
  }
  
  createNoisyPlateau(centerX, centerY, radius) {
    const noiseScale = 0.1;
    const threshold = 0.2;
    
    // Create the core 3x3 area first (guaranteed)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          this.elevationData[y][x] = 1;
        }
      }
    }
    
    // Then expand outward with noise
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          // Skip if already set by core 3x3
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
          
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const distanceFactor = 1 - (distance / radius);
            const noiseValue = this.noise2D(x * noiseScale, y * noiseScale);
            const combined = distanceFactor + noiseValue * 0.3;
            
            if (combined > threshold) {
              this.elevationData[y][x] = 1;
            }
          }
        }
      }
    }
  }
  
  enforceMinimumPlateauSizes() {
    console.log("Enforcing 3x3 minimum plateau sizes...");
    
    const visited = [];
    for (let y = 0; y < this.height; y++) {
      visited[y] = new Array(this.width).fill(false);
    }
    
    // Find all connected plateau regions
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] > 0 && !visited[y][x]) {
          const plateau = this.floodFillPlateau(x, y, visited);
          this.ensurePlateauMeetsMinimum(plateau);
        }
      }
    }
  }
  
  floodFillPlateau(startX, startY, visited) {
    const plateau = [];
    const queue = [{x: startX, y: startY}];
    visited[startY][startX] = true;
    
    while (queue.length > 0) {
      const {x, y} = queue.shift();
      plateau.push({x, y});
      
      // Check 4-connected neighbors
      const neighbors = [
        {x: x + 1, y: y},
        {x: x - 1, y: y},
        {x: x, y: y + 1},
        {x: x, y: y - 1}
      ];
      
      for (const {x: nx, y: ny} of neighbors) {
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
            !visited[ny][nx] && this.elevationData[ny][nx] > 0) {
          visited[ny][nx] = true;
          queue.push({x: nx, y: ny});
        }
      }
    }
    
    return plateau;
  }
  
  ensurePlateauMeetsMinimum(plateau) {
    if (plateau.length === 0) return;
    
    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const {x, y} of plateau) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    
    // If plateau doesn't meet 3x3 minimum, either expand or remove
    if (width < 3 || height < 3 || plateau.length < 9) {
      if (this.canExpandPlateau(plateau, minX, minY, maxX, maxY)) {
        this.expandPlateauTo3x3(plateau, minX, minY, maxX, maxY);
      } else {
        this.removePlateau(plateau);
      }
    }
  }
  
  canExpandPlateau(plateau, minX, minY, maxX, maxY) {
    // Check if we can expand to 3x3 without going out of bounds
    const targetMinX = Math.max(0, minX - 1);
    const targetMaxX = Math.min(this.width - 1, maxX + 1);
    const targetMinY = Math.max(0, minY - 1);
    const targetMaxY = Math.min(this.height - 1, maxY + 1);
    
    const targetWidth = targetMaxX - targetMinX + 1;
    const targetHeight = targetMaxY - targetMinY + 1;
    
    return targetWidth >= 3 && targetHeight >= 3;
  }
  
  expandPlateauTo3x3(plateau, minX, minY, maxX, maxY) {
    // Expand to ensure at least 3x3
    const targetMinX = Math.max(0, minX - 1);
    const targetMaxX = Math.min(this.width - 1, Math.max(maxX + 1, minX + 2));
    const targetMinY = Math.max(0, minY - 1);
    const targetMaxY = Math.min(this.height - 1, Math.max(maxY + 1, minY + 2));
    
    // Fill the expanded area
    for (let y = targetMinY; y <= targetMaxY; y++) {
      for (let x = targetMinX; x <= targetMaxX; x++) {
        this.elevationData[y][x] = 1;
      }
    }
    
    console.log(`[DEBUG] Expanded plateau from ${maxX-minX+1}x${maxY-minY+1} to ${targetMaxX-targetMinX+1}x${targetMaxY-targetMinY+1}`);
  }
  
  removePlateau(plateau) {
    for (const {x, y} of plateau) {
      this.elevationData[y][x] = 0;
    }
    console.log(`[DEBUG] Removed plateau of ${plateau.length} tiles`);
  }
  
  finalCleanup() {
    console.log("Running final cleanup...");
    
    // One more pass to remove any remaining problematic tiles
    let cleanedCount = 0;
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.elevationData[y][x] === 1) {
          // Check if this tile has sufficient neighbors for a proper formation
          const neighbors = [
            this.elevationData[y-1][x], this.elevationData[y+1][x],
            this.elevationData[y][x-1], this.elevationData[y][x+1]
          ];
          
          const elevatedNeighbors = neighbors.filter(n => n > 0).length;
          
          // Remove isolated tiles
          if (elevatedNeighbors < 2) {
            this.elevationData[y][x] = 0;
            cleanedCount++;
          }
        }
      }
    }
    
    console.log(`[DEBUG] Final cleanup removed ${cleanedCount} isolated tiles`);
  }
  
  createTileSprites() {
    console.log("Creating tile sprites with new autotiler...");
    
    const processedTiles = [];
    for (let y = 0; y < this.height; y++) {
      processedTiles[y] = [];
    }
    
    // First pass: Create base terrain sprites
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        const tileResult = this.cliffAutotiler.getTileTexture(x, y, this.elevationData, processedTiles);
        processedTiles[y][x] = tileResult.type;
        
        // Mark cliff edges as unwalkable
        const isCliffEdge = this.isCliffEdgeTile(tileResult.type);
        tile.isCliffEdge = isCliffEdge;
        
        const sprite = new PIXI.Sprite(tileResult.texture);
        sprite.position.set(0, 0);
        sprite.scale.set(this.tileSize / 32);
        tile.sprite = sprite;
        tile.container.addChild(sprite);
        
        this.container.addChild(tile.container);
      }
    }
    
    // Second pass: Add cliff extensions
    this.addCliffExtensions(processedTiles);
  }
  
  addCliffExtensions(processedTiles) {
    console.log("Adding cliff extensions...");
    
    let extensionCount = 0;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] === 0) continue;
        
        const extensionTexture = this.cliffAutotiler.getCliffExtensionTexture(x, y, this.elevationData, processedTiles);
        
        if (extensionTexture && y + 1 < this.height) {
          const extensionSprite = new PIXI.Sprite(extensionTexture);
          extensionSprite.x = x * this.tileSize;
          extensionSprite.y = (y + 1) * this.tileSize;
          extensionSprite.scale.set(this.tileSize / 32);
          
          this.container.addChild(extensionSprite);
          extensionCount++;
        }
      }
    }
    
    console.log(`[DEBUG] Added ${extensionCount} cliff extensions`);
  }
  
  // Helper method to determine if a tile type is a cliff edge
  isCliffEdgeTile(tileType) {
    // Parse tile coordinates from type string like "0,0" or "5,6"
    if (typeof tileType !== 'string' || !tileType.includes(',')) {
      return false; // Not a cliff tile (probably grass)
    }
    
    const [row, col] = tileType.split(',').map(Number);
    
    // Check if it's any type of cliff edge or corner tile
    // Row 0: Top edges and corners
    if (row === 0 && (col === 0 || col === 6 || (col >= 1 && col <= 5))) return true;
    
    // Row 1: Side edges  
    if (row === 1 && (col === 0 || col === 6)) return true;
    
    // Row 2: Edge variations
    if (row === 2 && (col === 0 || col === 6)) return true;
    
    // Row 3: More edge variations
    if (row === 3 && (col === 0 || col === 6)) return true;
    
    // Row 5: Bottom edges and corners
    if (row === 5 && (col >= 0 && col <= 6)) return true;
    
    // Diagonal connectors are not walkable edges
    if ((row === 2 && (col === 7 || col === 10)) || 
        (row === 4 && (col === 8 || col === 9))) return true;
    
    return false; // Interior grass tiles are walkable
  }

  // Helper methods for compatibility
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