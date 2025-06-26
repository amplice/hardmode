// src/systems/tiles/TilesetManager.js
import { Assets, Texture, Rectangle } from 'pixi.js';

export class TilesetManager {
  constructor() {
    this.textures = {
      terrain: [],      // All terrain tiles from MainLev2.0
      plants: []        // Keep plants for decorations
    };
    
    this.tileSize = 32; // New tileset uses 32x32 tiles
    
    Assets.addBundle('tilesets', {
      terrain: 'assets/sprites/tiles/grass/MainLev2.0.png',
      plants: 'assets/sprites/tiles/Plants.png'
    });
  }

  async load() {
    await Assets.loadBundle('tilesets');
    
    // Load the new terrain tileset
    const terrainTexture = Assets.get('terrain');
    if (!terrainTexture) {
      throw new Error("Failed to load terrain texture");
    }
    this.sliceTerrainTileset(terrainTexture.baseTexture);
    
    // Keep plants for decorations
    this.textures.plants = this.slicePlantsTileset(Assets.get('plants').baseTexture);
    
    console.log("Tilesets loaded successfully");
    console.log(`[DEBUG] Loaded terrain texture rows: ${this.textures.terrain.length}`);
  }
  
  sliceTerrainTileset(baseTexture) {
    const tileSize = this.tileSize;
    
    // MainLev2.0 is 64x44 tiles (2048x1408 pixels)
    // Store as 2D array for easier access
    this.textures.terrain = [];
    
    // Load rows 0-7 for basic terrain including cliff extensions and inner corners
    for (let row = 0; row < 8; row++) {
      this.textures.terrain[row] = [];
      for (let col = 0; col < 11; col++) { // Only green grass zone (first 11 columns)
        this.textures.terrain[row][col] = new Texture(
          baseTexture,
          new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
        );
      }
    }
    
    // Store easy references to pure grass tiles
    this.pureGrassTiles = [
      this.textures.terrain[1][1],
      this.textures.terrain[1][2],
      this.textures.terrain[1][3],
      this.textures.terrain[1][4],
      this.textures.terrain[1][5],
      this.textures.terrain[2][1],
      this.textures.terrain[2][2],
      this.textures.terrain[2][3],
      this.textures.terrain[2][4],
      this.textures.terrain[2][5],
      this.textures.terrain[3][1],
      this.textures.terrain[3][2],
      this.textures.terrain[3][3],
      this.textures.terrain[3][4],
      this.textures.terrain[3][5]
    ];
  }
  
  slicePlantsTileset(baseTexture) {
    const tileSize = 16;
    const textures = [];
    
    // Create a 6x3 array of textures
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 3; col++) {
        textures.push(
          new Texture(
            baseTexture,
            new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
          )
        );
      }
    }
    
    return textures;
  }
  
  getPlantTexture(type) {
    const textureMap = {
      'plant': 9,
      'branches': 10,
      'twigs': 11,
      'flower1': 12,
      'flower2': 13,
      'flower3': 15,
      'flower4': 16
    };
    
    return this.textures.plants[textureMap[type]];
  }
  
  // Full tile getters - updated for new tileset
  getFullGrassTile() {
    // Return a random pure grass tile for variety
    return this.pureGrassTiles[Math.floor(Math.random() * this.pureGrassTiles.length)];
  }
  
  getFullSandTile() {
    // For now, return grass (we'll add other zones later)
    return this.getFullGrassTile();
  }
  
  getFullWaterTile() {
    // For now, return grass (we'll add water later)
    return this.getFullGrassTile();
  }
  
  // Get cliff edge tiles from the new tileset
  getCliffTile(type) {
    const tileMap = {
      // Square corners
      'nw-corner': [0, 0],      // Northwest corner
      'ne-corner': [0, 6],      // Northeast corner  
      'sw-corner': [5, 0],      // Southwest corner
      'se-corner': [5, 6],      // Southeast corner
      
      // Edges
      'n-edge': [0, 1],         // North edge (can use 0,1 through 0,5)
      's-edge': [5, 1],         // South edge (can use 5,1 through 5,5)
      'w-edge': [1, 0],         // West edge
      'e-edge': [1, 6],         // East edge
      
      // Height extensions (second layer)
      'sw-corner-ext': [6, 0],  // Goes below sw-corner
      'se-corner-ext': [6, 6],  // Goes below se-corner
      's-edge-ext': [6, 1],     // Goes below s-edge
      'w-edge-ext': [2, 0],     // Alternative west edge
      'e-edge-ext': [2, 6],     // Alternative east edge
      
      // Diagonal corners
      'nw-diagonal': [0, 8],    // Northwest diagonal
      'ne-diagonal': [0, 9],    // Northeast diagonal
      'sw-diagonal': [5, 8],    // Southwest diagonal  
      'se-diagonal': [5, 9]     // Southeast diagonal
    };
    
    const coords = tileMap[type];
    if (coords) {
      return this.textures.terrain[coords[0]][coords[1]];
    }
    return null;
  }
  
  // Get a random pure grass tile
  getRandomPureGrass() {
    return this.pureGrassTiles[Math.floor(Math.random() * this.pureGrassTiles.length)];
  }
}