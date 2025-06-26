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
    
    // Add cliff border around the entire world for testing
    console.log("[DEBUG] Adding world border cliffs for testing");
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        // Create a border that's 5 tiles wide around the edges
        // Move bottom edge up by 1 to leave room for cliff extensions
        if (x < 5 || x >= this.width - 5 || y < 5 || y >= this.height - 6) {
          this.elevationData[y][x] = 1; // Elevated border
        }
      }
    }
    
    // Create a few elevated plateaus in the center
    const plateauCount = 2 + Math.floor(this.random() * 3);
    console.log(`[DEBUG] Creating ${plateauCount} elevated plateaus`);
    
    for (let i = 0; i < plateauCount; i++) {
      const plateauType = Math.floor(this.random() * 3); // 0: rectangular, 1: diamond, 2: octagonal
      
      if (plateauType === 0) {
        // Rectangular plateau
        const width = 5 + Math.floor(this.random() * 8);
        const height = 5 + Math.floor(this.random() * 8);
        const x = Math.floor(this.random() * (this.width - width - 20)) + 10;
        const y = Math.floor(this.random() * (this.height - height - 20)) + 10;
        
        console.log(`[DEBUG] Rectangular plateau ${i}: ${width}x${height} at (${x}, ${y})`);
        
        for (let dy = 0; dy < height; dy++) {
          for (let dx = 0; dx < width; dx++) {
            if (x + dx < this.width && y + dy < this.height) {
              this.elevationData[y + dy][x + dx] = 1;
            }
          }
        }
      } else if (plateauType === 1) {
        // Diamond-shaped plateau
        const size = 4 + Math.floor(this.random() * 6);
        const cx = Math.floor(this.random() * (this.width - size * 2 - 20)) + size + 10;
        const cy = Math.floor(this.random() * (this.height - size * 2 - 20)) + size + 10;
        
        console.log(`[DEBUG] Diamond plateau ${i}: size=${size} at center (${cx}, ${cy})`);
        
        for (let dy = -size; dy <= size; dy++) {
          for (let dx = -size; dx <= size; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= size) {
              const px = cx + dx;
              const py = cy + dy;
              if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
                this.elevationData[py][px] = 1;
              }
            }
          }
        }
      } else {
        // Octagonal plateau (cut corners from rectangle)
        const width = 6 + Math.floor(this.random() * 8);
        const height = 6 + Math.floor(this.random() * 8);
        const x = Math.floor(this.random() * (this.width - width - 20)) + 10;
        const y = Math.floor(this.random() * (this.height - height - 20)) + 10;
        const cornerCut = 2;
        
        console.log(`[DEBUG] Octagonal plateau ${i}: ${width}x${height} at (${x}, ${y})`);
        
        for (let dy = 0; dy < height; dy++) {
          for (let dx = 0; dx < width; dx++) {
            // Cut corners to make octagon
            const fromTop = dy;
            const fromBottom = height - 1 - dy;
            const fromLeft = dx;
            const fromRight = width - 1 - dx;
            
            if ((fromTop >= cornerCut || fromLeft >= cornerCut) &&
                (fromTop >= cornerCut || fromRight >= cornerCut) &&
                (fromBottom >= cornerCut || fromLeft >= cornerCut) &&
                (fromBottom >= cornerCut || fromRight >= cornerCut)) {
              if (x + dx < this.width && y + dy < this.height) {
                this.elevationData[y + dy][x + dx] = 1;
              }
            }
          }
        }
      }
    }
    
    // Count elevated tiles for debugging
    let elevatedCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] > 0) elevatedCount++;
      }
    }
    console.log(`[DEBUG] Total elevated tiles: ${elevatedCount}`)
  }
  
  createTileSprites() {
    console.log("Creating tile sprites with bitmasking...");
    
    // First pass: Create base terrain sprites using bitmasking
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        // Use CliffAutotiler to determine the correct texture
        const tileTexture = this.cliffAutotiler.getTileTexture(x, y, this.elevationData);
        
        const sprite = new PIXI.Sprite(tileTexture);
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