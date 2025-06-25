// src/systems/world/WorldGenerator.js
import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';
import { DecorationManager } from '../tiles/DecorationManager.js';
import { createSeededRandom } from '../../utils/Random.js';

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
    
    // Create a few elevated plateaus
    const plateauCount = 2 + Math.floor(this.random() * 3);
    
    for (let i = 0; i < plateauCount; i++) {
      const width = 5 + Math.floor(this.random() * 8);
      const height = 5 + Math.floor(this.random() * 8);
      const x = Math.floor(this.random() * (this.width - width - 10)) + 5;
      const y = Math.floor(this.random() * (this.height - height - 10)) + 5;
      
      // Mark the elevated area
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          if (x + dx < this.width && y + dy < this.height) {
            this.elevationData[y + dy][x + dx] = 1; // Elevated
          }
        }
      }
    }
  }
  
  createTileSprites() {
    console.log("Creating tile sprites...");
    
    // First pass: Create base terrain sprites
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        const elevation = this.elevationData[y][x];
        
        if (elevation === 0) {
          // Flat terrain - use random pure grass
          const sprite = new PIXI.Sprite(this.tilesets.getRandomPureGrass());
          sprite.x = x * this.tileSize;
          sprite.y = y * this.tileSize;
          sprite.scale.set(this.tileSize / 32); // Scale from 32x32 to display size
          tile.sprite = sprite;
          tile.container.addChild(sprite);
        } else {
          // Elevated terrain - determine cliff edges
          const tileTexture = this.getElevatedTileTexture(x, y);
          const sprite = new PIXI.Sprite(tileTexture);
          sprite.x = x * this.tileSize;
          sprite.y = y * this.tileSize;
          sprite.scale.set(this.tileSize / 32);
          tile.sprite = sprite;
          tile.container.addChild(sprite);
        }
        
        this.container.addChild(tile.container);
      }
    }
    
    // Second pass: Add cliff extensions for height
    this.addCliffExtensions();
  }
  
  getElevatedTileTexture(x, y) {
    const width = this.width;
    const height = this.height;
    
    // Check neighboring elevations
    const n = y > 0 ? this.elevationData[y-1][x] : 0;
    const s = y < height-1 ? this.elevationData[y+1][x] : 0;
    const e = x < width-1 ? this.elevationData[y][x+1] : 0;
    const w = x > 0 ? this.elevationData[y][x-1] : 0;
    
    const elevation = this.elevationData[y][x];
    
    // Determine which cliff tile to use
    const isTopEdge = n < elevation;
    const isBottomEdge = s < elevation;
    const isLeftEdge = w < elevation;
    const isRightEdge = e < elevation;
    
    if (!isTopEdge && !isBottomEdge && !isLeftEdge && !isRightEdge) {
      // Pure elevated grass
      return this.tilesets.getRandomPureGrass();
    } else if (isTopEdge && isLeftEdge) {
      return this.tilesets.getCliffTile('nw-corner');
    } else if (isTopEdge && isRightEdge) {
      return this.tilesets.getCliffTile('ne-corner');
    } else if (isBottomEdge && isLeftEdge) {
      return this.tilesets.getCliffTile('sw-corner');
    } else if (isBottomEdge && isRightEdge) {
      return this.tilesets.getCliffTile('se-corner');
    } else if (isTopEdge) {
      // Use varied top edge tiles
      const variations = ['n-edge'];
      return this.tilesets.getCliffTile(variations[0]);
    } else if (isBottomEdge) {
      return this.tilesets.getCliffTile('s-edge');
    } else if (isLeftEdge) {
      return this.tilesets.getCliffTile('w-edge');
    } else if (isRightEdge) {
      return this.tilesets.getCliffTile('e-edge');
    }
    
    // Fallback
    return this.tilesets.getRandomPureGrass();
  }
  
  addCliffExtensions() {
    // Add the second layer tiles for cliff height
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const elevation = this.elevationData[y][x];
        if (elevation === 0) continue;
        
        // Check if this is a bottom edge that needs extension
        const s = y < this.height-1 ? this.elevationData[y+1][x] : 0;
        if (s < elevation) {
          // This is a cliff edge that drops down
          const w = x > 0 ? this.elevationData[y][x-1] : 0;
          const e = x < this.width-1 ? this.elevationData[y][x+1] : 0;
          
          let extensionTexture;
          if (w < elevation && e >= elevation) {
            extensionTexture = this.tilesets.getCliffTile('sw-corner-ext');
          } else if (e < elevation && w >= elevation) {
            extensionTexture = this.tilesets.getCliffTile('se-corner-ext');
          } else {
            extensionTexture = this.tilesets.getCliffTile('s-edge-ext');
          }
          
          if (extensionTexture && y + 1 < this.height) {
            const extensionSprite = new PIXI.Sprite(extensionTexture);
            extensionSprite.x = x * this.tileSize;
            extensionSprite.y = (y + 1) * this.tileSize;
            extensionSprite.scale.set(this.tileSize / 32);
            // Add to container at lower layer so entities appear on top
            this.container.addChildAt(extensionSprite, 0);
          }
        }
      }
    }
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