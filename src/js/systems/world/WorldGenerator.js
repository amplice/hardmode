// src/systems/world/WorldGenerator.js
import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';
import { DecorationManager } from '../tiles/DecorationManager.js';
import { createSeededRandom } from '../../utils/Random.js';
import { CliffAutotiler } from '../tiles/CliffAutotiler.js';

export class WorldGenerator {
  constructor(options = {}) {
    this.width = options.width || 100;
    this.height = options.height || 100;
    this.tileSize = options.tileSize || 64; // Display size (scaled from 32x32)
    this.tilesets = options.tilesets;
    this.seed = options.seed || 1;
    this.random = createSeededRandom(this.seed);
    this.noise2D = createNoise2D(this.random);
    this.container = new PIXI.Container();
    this.tiles = [];
    this.elevationData = []; // Track elevated areas
    this.cliffAutotiler = new CliffAutotiler(this.tilesets);
  }

  generate() {
    console.log("Generating world with new MainLev2.0 tileset...");
    
    // Create world boundary
    this.createWorldBoundary();
    
    // Generate base terrain
    this.generateBaseTerrain();
    
    // Generate some elevated areas
    this.generateElevatedAreas();
    
    // Create visual tiles
    this.createTileSprites();
    
    // Skip decorations for now - will update later for new tileset
    // TODO: Update decorations for 32x32 tileset
    // this.decorations = new DecorationManager(this, this.tilesets, { random: this.random });
    // const decorationsContainer = this.decorations.generateDecorations();
    // this.container.addChild(decorationsContainer);
    
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
        // For now, just create grass tiles
        const tile = new Tile(x, y, 'grass', this.tilesets, this.tileSize);
        this.tiles[y][x] = tile;
        this.elevationData[y][x] = 0; // Flat terrain by default
      }
    }
  }
  
  generateElevatedAreas() {
    console.log("Generating elevated areas...");
    
    // Skip world border to better showcase organic plateau shapes
    // console.log("[DEBUG] Adding world border cliffs for testing");
    
    // Create organic elevated areas using noise
    this.generateOrganicPlateaus();
    
    // Count elevated tiles for debugging
    let elevatedCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] > 0) elevatedCount++;
      }
    }
    console.log(`[DEBUG] Total elevated tiles: ${elevatedCount}`);
  }
  
  generateOrganicPlateaus() {
    console.log("Generating organic plateaus using noise...");
    
    // Create several blob-like elevated areas
    const plateauCount = 3 + Math.floor(this.random() * 4);
    
    for (let i = 0; i < plateauCount; i++) {
      // Random center and size for each plateau
      const cx = 15 + Math.floor(this.random() * (this.width - 30));
      const cy = 15 + Math.floor(this.random() * (this.height - 30));
      const baseRadius = 5 + Math.floor(this.random() * 10);
      const noiseScale = 0.1 + this.random() * 0.2;
      const threshold = 0.3 + this.random() * 0.3;
      
      console.log(`[DEBUG] Organic plateau ${i}: center (${cx}, ${cy}), radius ${baseRadius}`);
      
      // Use noise to create organic shapes
      for (let y = cy - baseRadius * 2; y <= cy + baseRadius * 2; y++) {
        for (let x = cx - baseRadius * 2; x <= cx + baseRadius * 2; x++) {
          if (x >= 5 && x < this.width - 5 && y >= 5 && y < this.height - 6) {
            const dx = x - cx;
            const dy = y - cy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Combine distance falloff with noise for organic edges
            const distanceFactor = 1 - (distance / (baseRadius * 1.5));
            const noiseValue = this.noise2D(x * noiseScale, y * noiseScale);
            const combined = distanceFactor + noiseValue * 0.5;
            
            if (combined > threshold) {
              this.elevationData[y][x] = 1;
            }
          }
        }
      }
    }
    
    // Add some smaller elevated features
    const featureCount = 5 + Math.floor(this.random() * 10);
    for (let i = 0; i < featureCount; i++) {
      const x = 10 + Math.floor(this.random() * (this.width - 20));
      const y = 10 + Math.floor(this.random() * (this.height - 20));
      const size = 2 + Math.floor(this.random() * 4);
      
      // Small noise-based features
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 5 && px < this.width - 5 && py >= 5 && py < this.height - 6) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= size) {
              const noise = this.noise2D(px * 0.3, py * 0.3);
              if (noise > 0.1 - (dist / size) * 0.3) {
                this.elevationData[py][px] = 1;
              }
            }
          }
        }
      }
    }
    
    // Smooth the elevation data to create more natural transitions
    this.smoothElevation();
  }
  
  smoothElevation() {
    // Apply a smoothing pass to create more natural cliff lines
    const newElevation = [];
    for (let y = 0; y < this.height; y++) {
      newElevation[y] = [...this.elevationData[y]];
    }
    
    for (let y = 6; y < this.height - 6; y++) {
      for (let x = 6; x < this.width - 6; x++) {
        let elevatedNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (this.elevationData[y + dy][x + dx] === 1) {
              elevatedNeighbors++;
            }
          }
        }
        
        // Smooth based on neighbor count
        if (elevatedNeighbors >= 6) {
          newElevation[y][x] = 1;
        } else if (elevatedNeighbors <= 3) {
          newElevation[y][x] = 0;
        }
      }
    }
    
    this.elevationData = newElevation;
  }
  
  createTileSprites() {
    console.log("Creating tile sprites with bitmasking...");
    
    // Track processed tiles for diagonal pattern detection
    const processedTiles = [];
    for (let y = 0; y < this.height; y++) {
      processedTiles[y] = [];
    }
    
    // First pass: Create base terrain sprites using bitmasking
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        // Use CliffAutotiler to determine the correct texture
        const tileResult = this.cliffAutotiler.getTileTexture(x, y, this.elevationData, processedTiles);
        processedTiles[y][x] = tileResult.type;
        
        const sprite = new PIXI.Sprite(tileResult.texture);
        sprite.position.set(0, 0); // Position at (0,0) within the tile container
        sprite.scale.set(this.tileSize / 32); // Scale from 32x32 to display size
        tile.sprite = sprite;
        tile.container.addChild(sprite);
        
        this.container.addChild(tile.container);
      }
    }
    
    // Second pass: Add cliff extensions for 2-tile height effect
    this.addCliffExtensions();
  }
  
  
  addCliffExtensions() {
    console.log("Adding cliff extensions using bitmasking...");
    
    let extensionCount = 0;
    
    // Add the second layer tiles for cliff height using CliffAutotiler
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const elevation = this.elevationData[y][x];
        if (elevation === 0) continue;
        
        // Use CliffAutotiler to determine if we need an extension
        const extensionTexture = this.cliffAutotiler.getCliffExtensionTexture(x, y, this.elevationData);
        
        if (extensionTexture && y + 1 < this.height) {
          const extensionSprite = new PIXI.Sprite(extensionTexture);
          extensionSprite.x = x * this.tileSize;
          extensionSprite.y = (y + 1) * this.tileSize;
          extensionSprite.scale.set(this.tileSize / 32);
          
          // Remove debug tint now that extensions are working
          // extensionSprite.tint = 0xffcccc;
          
          // Add to the world container, not at index 0
          this.container.addChild(extensionSprite);
          extensionCount++;
          
          // Check if the texture is valid
          if (!extensionTexture.valid) {
            console.error(`[ERROR] Invalid texture for extension at (${x}, ${y+1})`);
          }
        }
      }
    }
    
    console.log(`[DEBUG] Total cliff extensions added: ${extensionCount}`);
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