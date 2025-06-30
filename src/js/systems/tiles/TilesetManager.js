// src/systems/tiles/TilesetManager.js
import { Assets, Texture, Rectangle } from 'pixi.js';
import { GAME_CONSTANTS } from '../../../shared/constants/GameConstants.js';

export class TilesetManager {
  constructor() {
    this.textures = {
      terrain: [],      // All terrain tiles from MainLev2.0
      plants: []        // Keep plants for decorations
    };
    
    this.tileSize = 32; // New tileset uses 32x32 tiles
    
    const terrainTileset = GAME_CONSTANTS.DEBUG.USE_DEBUG_TILESET 
      ? 'assets/sprites/tiles/grass/MainLev2.0_debug.png'
      : 'assets/sprites/tiles/grass/MainLev2.0.png';
    
    Assets.addBundle('tilesets', {
      terrain: terrainTileset,
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
    console.log(`[DEBUG] Using ${GAME_CONSTANTS.DEBUG.USE_DEBUG_TILESET ? 'DEBUG' : 'regular'} tileset`);
    console.log(`[DEBUG] Loaded terrain texture rows: ${this.textures.terrain.length}`);
  }
  
  sliceTerrainTileset(baseTexture) {
    const tileSize = this.tileSize;
    
    // MainLev2.0 is 64x44 tiles (2048x1408 pixels)
    // Store as 2D array for easier access
    this.textures.terrain = [];
    
    // Load rows 0-10 with green grass (cols 0-10) and dark grass (cols 11-21)
    for (let row = 0; row < 11; row++) {
      this.textures.terrain[row] = [];
      // Load green grass columns (0-10) and dark grass columns (11-21)
      for (let col = 0; col < 22; col++) {
        this.textures.terrain[row][col] = new Texture(
          baseTexture,
          new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
        );
      }
    }
    
    // Load rows 13-17 to include stairs
    for (let row = 13; row <= 17; row++) {
      this.textures.terrain[row] = [];
      for (let col = 0; col < 11; col++) {
        this.textures.terrain[row][col] = new Texture(
          baseTexture,
          new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
        );
      }
    }
    
    // Load decorative grass variation rows (27-28)
    for (let row = 27; row <= 28; row++) {
      this.textures.terrain[row] = [];
      for (let col = 0; col < 11; col++) {
        this.textures.terrain[row][col] = new Texture(
          baseTexture,
          new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
        );
      }
    }
    
    // Load transition tiles (rows 30-36, columns 0-9)
    for (let row = 30; row <= 36; row++) {
      this.textures.terrain[row] = [];
      for (let col = 0; col <= 9; col++) {
        this.textures.terrain[row][col] = new Texture(
          baseTexture,
          new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
        );
      }
    }
    
    // Load the large grass variation square (22,54) to (31,63)
    for (let row = 22; row <= 31; row++) {
      if (!this.textures.terrain[row]) {
        this.textures.terrain[row] = [];
      }
      for (let col = 54; col <= 63; col++) {
        this.textures.terrain[row][col] = new Texture(
          baseTexture,
          new Rectangle(col * tileSize, row * tileSize, tileSize, tileSize)
        );
      }
    }
    
    // Store green grass tiles with different frequency weights
    this.basicGrassTile = this.textures.terrain[1][1];
    
    // Store dark grass tiles (column 12 = column 1 + 11 offset, same row)
    this.basicDarkGrassTile = this.textures.terrain[1][12];
    
    // Common green grass variations (rows 27-28) - used moderately
    this.commonGrassVariations = [
      this.textures.terrain[27][5],  // Grass with small flowers
      this.textures.terrain[27][6],  // Grass with dirt patches
      this.textures.terrain[27][7],  // Grass with subtle wear
      this.textures.terrain[27][8],  // Grass with small stones
      this.textures.terrain[27][9],  // Grass with leaf litter
      this.textures.terrain[28][5],  // More decorative variations
      this.textures.terrain[28][6],
      this.textures.terrain[28][7], 
      this.textures.terrain[28][8],
      this.textures.terrain[28][9]
    ];
    
    // Dark grass variations (using the same row pattern but with +11 column offset)
    this.commonDarkGrassVariations = [
      this.textures.terrain[1][12],  // Basic dark grass (1,12)
      this.textures.terrain[1][13],  // Dark grass variation 2 (1,13)
      this.textures.terrain[1][14],  // Dark grass variation 3 (1,14)
      this.textures.terrain[1][15],  // Dark grass variation 4 (1,15)
      this.textures.terrain[1][16]   // Dark grass variation 5 (1,16)
    ];
    
    // Decorative grass variations (22,54) to (31,63) - used sparingly
    this.decorativeGrassVariations = [];
    for (let row = 22; row <= 31; row++) {
      for (let col = 54; col <= 63; col++) {
        this.decorativeGrassVariations.push(this.textures.terrain[row][col]);
      }
    }
    
    // Legacy arrays for compatibility - not used directly anymore
    this.pureGrassTiles = [this.basicGrassTile];
    this.pureDarkGrassTiles = [this.basicDarkGrassTile];
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
  
  // Get a random pure grass tile with weighted selection
  getRandomPureGrass() {
    const rand = Math.random();
    
    // 87% chance for basic grass (1,1)
    if (rand < 0.87) {
      return this.basicGrassTile;
    }
    // 10% chance for common variations (rows 27-28)
    else if (rand < 0.97) {
      const index = Math.floor(Math.random() * this.commonGrassVariations.length);
      return this.commonGrassVariations[index];
    }
    // 3% chance for decorative variations (22,54) to (31,63)
    else {
      const index = Math.floor(Math.random() * this.decorativeGrassVariations.length);
      return this.decorativeGrassVariations[index];
    }
  }
  
  // Get a random grass tile for plateau interiors (not cliff edges)
  getRandomPlateauGrass() {
    // Use same percentages as regular ground
    return this.getRandomPureGrass();
  }
  
  // Get a random pure dark grass tile with weighted selection
  getRandomPureDarkGrass() {
    const rand = Math.random();
    
    // 87% chance for basic dark grass (12,1)
    if (rand < 0.87) {
      return this.basicDarkGrassTile;
    }
    // 13% chance for dark grass variations (12,2-5)
    else {
      const index = Math.floor(Math.random() * this.commonDarkGrassVariations.length);
      return this.commonDarkGrassVariations[index];
    }
  }
  
  // Get a random dark grass tile for plateau interiors (not cliff edges)
  getRandomPlateauDarkGrass() {
    // Use same logic as regular dark grass
    return this.getRandomPureDarkGrass();
  }
}