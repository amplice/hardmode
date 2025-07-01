// Complete rewrite of world generation with proper 3x3 minimum enforcement
// Focus on generating correct terrain from the start rather than fixing it later

import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';
import { DecorationManager } from '../tiles/DecorationManager.js';
import { createSeededRandom } from '../../utils/Random.js';
import { CliffAutotiler } from '../tiles/CliffAutotilerNew.js';
import { CollisionMask } from '../../../shared/systems/CollisionMask.js';
import { SharedWorldGenerator } from '../../../shared/systems/WorldGenerator.js';
import { ChunkedWorldRenderer } from './ChunkedWorldRenderer.js';

export class ClientWorldRenderer {
  constructor(options = {}) {
    this.width = options.width || 100;
    this.height = options.height || 100;
    this.tileSize = options.tileSize || 64;
    this.tilesets = options.tilesets;
    this.seed = options.seed || 1;
    this.container = new PIXI.Container();
    this.tiles = [];
    this.cliffAutotiler = new CliffAutotiler(this.tilesets);
    
    // World data (will be set by render method)
    this.elevationData = null;
    this.biomeData = null;  
    this.stairsData = null;
    this.sharedWorldGen = null;
    
    // Initialize collision mask for debug visualization
    this.collisionMask = new CollisionMask(this.width, this.height, this.tileSize);
    console.log('[ClientWorldRenderer] Initialized for rendering only');
  }

  /**
   * Render world visuals from provided world data
   * @param {Object} worldData - Pre-generated world data {elevationData, biomeData, stairsData}
   * @param {SharedWorldGenerator} sharedWorldGen - World generator instance for collision/utility
   * @param {Object} options - Rendering options {useChunkedRendering: boolean}
   */
  render(worldData, sharedWorldGen, options = {}) {
    console.log('[ClientWorldRenderer] Rendering world visuals from provided data');
    
    // Store world data for rendering
    this.elevationData = worldData.elevationData;
    this.biomeData = worldData.biomeData;
    this.stairsData = worldData.stairsData;
    this.sharedWorldGen = sharedWorldGen;
    
    console.log('[ClientWorldRenderer] World data received - biomes:', this.biomeData.length, 'rows');
    
    // Generate collision mask from provided elevation data and stairs
    this.collisionMask.generateFromElevationData(this.elevationData, this.sharedWorldGen);
    console.log('[ClientWorldRenderer] Client collision mask generated from shared data');
    
    // Choose rendering method based on world size and options
    if (options.useChunkedRendering || this.shouldUseChunkedRendering()) {
      console.log('[ClientWorldRenderer] Using chunked rendering for large world optimization');
      this.setupChunkedRendering();
    } else {
      console.log('[ClientWorldRenderer] Using full world rendering');
      // Create world boundary
      this.createWorldBoundary();
      // Generate base terrain (all grass initially)
      this.generateBaseTerrain();
      // Create visual tiles using autotiler
      this.createTileSprites();
    }
    
    // Create debug overlay for collision boundaries
    this.createCollisionDebugOverlay();
    
    console.log('[ClientWorldRenderer] World rendering complete');
    return this.container;
  }
  
  /**
   * Determine if chunked rendering should be used based on world size
   */
  shouldUseChunkedRendering() {
    const totalTiles = this.width * this.height;
    const CHUNKED_THRESHOLD = 20000; // Use chunked rendering for worlds larger than 20k tiles
    return totalTiles > CHUNKED_THRESHOLD;
  }
  
  /**
   * Setup chunked rendering system
   */
  setupChunkedRendering() {
    this.isChunkedMode = true;
    
    // Create world boundary for large worlds
    this.createWorldBoundary();
    
    // Initialize chunked renderer
    this.chunkedRenderer = new ChunkedWorldRenderer(this);
    this.container.addChild(this.chunkedRenderer.container);
    
    console.log(`[ClientWorldRenderer] Chunked rendering enabled for ${this.width}x${this.height} world`);
    
    // Start with chunks around world center (will be updated when player position is set)
    const centerX = (this.width / 2) * this.tileSize;
    const centerY = (this.height / 2) * this.tileSize;
    this.chunkedRenderer.updatePlayerPosition(centerX, centerY);
  }
  
  /**
   * Update chunked rendering based on player position
   */
  updatePlayerPosition(playerX, playerY) {
    if (this.chunkedRenderer) {
      this.chunkedRenderer.updatePlayerPosition(playerX, playerY);
    }
  }
  
  /**
   * Get the appropriate texture for a tile at given coordinates
   * Used by ChunkedWorldRenderer for efficient rendering
   */
  getTileTexture(x, y) {
    // Check if this position has stairs first
    if (this.stairsData && this.stairsData[y] && this.stairsData[y][x]) {
      const stairInfo = this.stairsData[y][x];
      return this.tilesets.textures.terrain[stairInfo.tileY][stairInfo.tileX];
    }
    
    // Check if this is an elevated tile (cliff)
    if (this.elevationData && this.elevationData[y] && this.elevationData[y][x] > 0) {
      return this.cliffAutotiler.getTileTexture(x, y, this.elevationData, null, this.biomeData);
    }
    
    // Regular ground tile based on biome
    const biome = (this.biomeData && this.biomeData[y] && this.biomeData[y][x]) || 0;
    if (biome === 1) {
      return this.tilesets.getRandomPureDarkGrass();
    } else {
      return this.tilesets.getRandomPureGrass();
    }
  }
  
  /**
   * Legacy generate method for compatibility - generates world data then renders
   * @deprecated Use render() method with pre-generated world data instead
   */
  generate() {
    console.warn('[ClientWorldRenderer] Using deprecated generate() method - consider using render() with shared data');
    
    // Generate world data (for compatibility)
    this.sharedWorldGen = new SharedWorldGenerator(this.width, this.height, this.seed);
    const worldData = this.sharedWorldGen.generateWorld();
    
    // Render using generated data
    return this.render(worldData, this.sharedWorldGen);
  }
  
  createWorldBoundary() {
    const worldBackground = new PIXI.Graphics();
    worldBackground.beginFill(0x6ea260);
    worldBackground.drawRect(0, 0, this.width * this.tileSize, this.height * this.tileSize);
    worldBackground.endFill();
    this.container.addChildAt(worldBackground, 0);
  }
  
  generateBaseTerrain() {
    // Generating base terrain
    
    // Initialize tiles array only (elevationData will be set by SharedWorldGenerator)
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        const tile = new Tile(x, y, 'grass', this.tilesets, this.tileSize);
        this.tiles[y][x] = tile;
      }
    }
  }
  
  generateProperElevatedAreas() {
    // Generating elevated areas with proper 3x3 minimum enforcement
    
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
    // Final elevated tiles generated
  }
  
  generatePlateauCandidates() {
    // Generating plateau candidates with noise
    
    // Create several noise-based plateau seeds
    const plateauCount = 4 + Math.floor(this.random() * 3);
    
    for (let i = 0; i < plateauCount; i++) {
      // Choose center point with buffer for 3x3 minimum
      const cx = 10 + Math.floor(this.random() * (this.width - 20));
      const cy = 10 + Math.floor(this.random() * (this.height - 20));
      const baseRadius = 6 + Math.floor(this.random() * 8); // Larger to ensure 3x3
      
      // Plateau generated
      
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
    // Enforcing 3x3 minimum plateau sizes
    
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
    
    // Expanded plateau
  }
  
  removePlateau(plateau) {
    for (const {x, y} of plateau) {
      this.elevationData[y][x] = 0;
    }
    // Removed small plateau
  }
  
  finalCleanup() {
    // Running final cleanup
    
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
    
    // Final cleanup complete
  }
  
  createTileSprites() {
    // Creating tile sprites with new autotiler
    
    const processedTiles = [];
    for (let y = 0; y < this.height; y++) {
      processedTiles[y] = [];
    }
    
    // First pass: Create base terrain sprites
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        // Check if this position has stairs
        if (this.stairsData[y][x]) {
          // Place stair tile
          const stairInfo = this.stairsData[y][x];
          const stairTexture = this.tilesets.textures.terrain[stairInfo.tileY][stairInfo.tileX];
          
          // DEBUG: Enhanced debugging for stair texture issues
          if (!stairTexture || stairInfo.biome === 1) { // Always log dark grass stairs or missing textures
            console.log(`[WorldGenerator] STAIR TEXTURE DEBUG at (${x},${y}):`);
            console.log(`  - stairInfo:`, stairInfo);
            console.log(`  - Accessing: terrain[${stairInfo.tileY}][${stairInfo.tileX}]`);
            console.log(`  - terrain[${stairInfo.tileY}] exists:`, !!this.tilesets.textures.terrain[stairInfo.tileY]);
            console.log(`  - stairTexture exists:`, !!stairTexture);
            console.log(`  - Expected dark grass:`, (stairInfo.biome === 1));
            
            if (this.tilesets.textures.terrain[stairInfo.tileY]) {
              console.log(`  - Available columns in row ${stairInfo.tileY}:`, Object.keys(this.tilesets.textures.terrain[stairInfo.tileY]));
            }
          }
          
          // Handle missing textures gracefully
          if (!stairTexture) {
            console.error(`[WorldGenerator] Missing stair texture at (${stairInfo.tileY},${stairInfo.tileX}) for stair at (${x},${y})`);
            // Fallback to basic grass texture
            const fallbackTexture = this.tilesets.getRandomPureGrass();
            const sprite = new PIXI.Sprite(fallbackTexture);
            sprite.position.set(0, 0);
            sprite.scale.set(this.tileSize / 32);
            tile.sprite = sprite;
            tile.container.addChild(sprite);
          } else {
            // Create base color fill matching the stair's biome (what shows through transparent areas)
            const stairBiome = stairInfo.biome || 0;
            const isDarkGrassStair = stairBiome === 1;
            const baseColor = isDarkGrassStair ? 0x2a3a1c : 0x3e5b24; // dark grass : green grass
            
            const colorFill = new PIXI.Graphics();
            colorFill.beginFill(baseColor);
            colorFill.drawRect(0, 0, this.tileSize, this.tileSize);
            colorFill.endFill();
            tile.container.addChild(colorFill);
            
            // Create stair sprite on top of base color
            const sprite = new PIXI.Sprite(stairTexture);
            sprite.position.set(0, 0);
            sprite.scale.set(this.tileSize / 32);
            tile.sprite = sprite; // Keep reference to main sprite
            tile.container.addChild(sprite);
          }
          
          // Check if this stair tile is walkable
          tile.isCliffEdge = !this.sharedWorldGen.isStairTileWalkable(stairInfo.tileY, stairInfo.tileX);
          processedTiles[y][x] = 'stairs';
        } else {
          // Normal tile processing - pass biome data to autotiler
          const tileResult = this.cliffAutotiler.getTileTexture(x, y, this.elevationData, processedTiles, this.biomeData);
          processedTiles[y][x] = tileResult.type;
          
          // Mark tile walkability based on collision mask
          tile.isCliffEdge = !this.collisionMask.isTileWalkable(x, y);
          
          // FOR ELEVATED TILES: Create base color fill first, then cliff tile on top
          if (this.elevationData[y][x] > 0) {
            // Get the biome for this elevated tile
            const cliffBiome = this.biomeData && this.biomeData[y] ? this.biomeData[y][x] : 0;
            const isDarkGrassCliff = cliffBiome === 1;
            
            // Create base color fill (what shows through transparent areas)
            const baseColor = isDarkGrassCliff ? 0x2a3a1c : 0x3e5b24; // dark grass : green grass
            const colorFill = new PIXI.Graphics();
            colorFill.beginFill(baseColor);
            colorFill.drawRect(0, 0, this.tileSize, this.tileSize);
            colorFill.endFill();
            tile.container.addChild(colorFill);
            
            // Create cliff tile sprite on top
            const cliffSprite = new PIXI.Sprite(tileResult.texture);
            cliffSprite.position.set(0, 0);
            cliffSprite.scale.set(this.tileSize / 32);
            tile.sprite = cliffSprite; // Keep reference to main sprite
            tile.container.addChild(cliffSprite);
          } else {
            // Ground level tiles - single sprite as before
            const sprite = new PIXI.Sprite(tileResult.texture);
            sprite.position.set(0, 0);
            sprite.scale.set(this.tileSize / 32);
            tile.sprite = sprite;
            tile.container.addChild(sprite);
          }
        }
        
        this.container.addChild(tile.container);
      }
    }
    
    // Second pass: Add cliff extensions
    this.addCliffExtensions(processedTiles);
  }
  
  addCliffExtensions(processedTiles) {
    // Adding cliff extensions
    
    let extensionCount = 0;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] === 0) continue;
        
        const extensionTexture = this.cliffAutotiler.getCliffExtensionTexture(x, y, this.elevationData, processedTiles, this.biomeData);
        
        if (extensionTexture && y + 1 < this.height) {
          // FIX: Update the ground tile underneath to match the cliff's biome
          const cliffBiome = this.biomeData && this.biomeData[y] ? this.biomeData[y][x] : 0;
          const groundTile = this.tiles[y + 1][x];
          
          // Replace the ground tile sprite with the appropriate biome grass
          if (groundTile && groundTile.sprite) {
            const newGroundTexture = cliffBiome === 1 ? 
              this.tilesets.getRandomPureDarkGrass() : 
              this.tilesets.getRandomPureGrass();
            
            groundTile.sprite.texture = newGroundTexture;
          }
          
          const extensionSprite = new PIXI.Sprite(extensionTexture);
          extensionSprite.x = x * this.tileSize;
          extensionSprite.y = (y + 1) * this.tileSize;
          extensionSprite.scale.set(this.tileSize / 32);
          
          this.container.addChild(extensionSprite);
          extensionCount++;
        }
      }
    }
    
    // Cliff extensions added
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
    return this.collisionMask.isWalkable(worldX, worldY);
  }
  
  createCollisionDebugOverlay() {
    // Creating collision debug overlay
    
    // Create debug container
    this.debugContainer = new PIXI.Container();
    this.debugContainer.visible = false; // Hidden by default
    this.debugContainer.zIndex = 1000; // On top of everything
    
    // Create red overlay for each unwalkable tile
    let debugTileCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.collisionMask.isTileWalkable(x, y)) {
          const debugTile = this.createDebugTile(x, y);
          this.debugContainer.addChild(debugTile);
          debugTileCount++;
        }
      }
    }
    
    // Add debug container to world (so it moves with camera)
    this.container.addChild(this.debugContainer);
    
    // Created debug overlay tiles
    
    // Expose global toggle function
    window.toggleCollisionDebug = () => {
      this.debugContainer.visible = !this.debugContainer.visible;
      console.log(`Collision debug: ${this.debugContainer.visible ? 'ON' : 'OFF'}`);
      return this.debugContainer.visible ? 'Debug overlay enabled' : 'Debug overlay disabled';
    };
    
    console.log("Use toggleCollisionDebug() to show/hide collision boundaries");
  }
  
  createDebugTile(tileX, tileY) {
    const graphics = new PIXI.Graphics();
    
    // Semi-transparent red overlay
    graphics.beginFill(0xFF0000, 0.4);
    graphics.drawRect(0, 0, this.tileSize, this.tileSize);
    graphics.endFill();
    
    // Red border for clear definition
    graphics.lineStyle(2, 0xFF0000, 1.0);
    graphics.drawRect(0, 0, this.tileSize, this.tileSize);
    
    // Position at tile coordinates
    graphics.x = tileX * this.tileSize;
    graphics.y = tileY * this.tileSize;
    
    return graphics;
  }
}