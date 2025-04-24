// src/systems/tiles/TilesetManager.js
import { Assets, Texture, Rectangle } from 'pixi.js';

export class TilesetManager {
  constructor() {
    this.textures = {
      grass: [],
      sand: [],
      water: [],
      plants: []
    };
    
    Assets.addBundle('tilesets', {
      grass: 'assets/sprites/tiles/Grass.png',
      sand: 'assets/sprites/tiles/Sand.png',
      plants: 'assets/sprites/tiles/Plants.png',
      water: 'assets/sprites/tiles/Water.png',
    });
  }

  async load() {
    await Assets.loadBundle('tilesets');
    
    // Load tile textures
    this.textures.grass = this.sliceTileset(Assets.get('grass').baseTexture);
    this.textures.sand = this.sliceTileset(Assets.get('sand').baseTexture);
    this.textures.water = this.sliceTileset(Assets.get('water').baseTexture);
    this.textures.plants = this.slicePlantsTileset(Assets.get('plants').baseTexture);
    
    console.log("Tilesets loaded successfully");
  }
  
  sliceTileset(baseTexture) {
    const tileSize = 16;
    const textures = [];
    
    // Create a 3x5 array of textures
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
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
  
  // Full tile getters
  getFullGrassTile() {
    return this.textures.grass[14]; // Row 2, Col 4
  }
  
  getFullSandTile() {
    return this.textures.sand[14]; // Row 2, Col 4
  }
  
  getFullWaterTile() {
    // Choose from one of the full water tiles
    const options = [6, 13, 14]; // Indices in the 5x3 grid
    const index = options[Math.floor(Math.random() * options.length)];
    return this.textures.water[index];
  }
  
  // Transition tile getters
  getGrassTransition(position) {
    const positionMap = {
      'top-left': 0,     // Row 0, Col 0
      'top': 1,          // Row 0, Col 1
      'top-right': 2,    // Row 0, Col 2
      'left': 5,         // Row 1, Col 0
      'right': 7,        // Row 1, Col 2
      'bottom-left': 10, // Row 2, Col 0
      'bottom': 11,      // Row 2, Col 1
      'bottom-right': 12 // Row 2, Col 2
    };
    
    const index = positionMap[position];
    return index !== undefined ? this.textures.grass[index] : null;
  }
  
  getInnerCornerMatch(matchType) {
    const matchMap = {
      'top-left-match': 3,     // Row 0, Col 3
      'top-right-match': 4,    // Row 0, Col 4
      'bottom-left-match': 8,  // Row 1, Col 3
      'bottom-right-match': 9  // Row 1, Col 4
    };
    
    const index = matchMap[matchType];
    return index !== undefined ? this.textures.grass[index] : null;
  }
  
  // Water edge and corner tiles
  getWaterEdgeTile(position) {
    const positionMap = {
      'inner-top-left': 0,     // (0, 0)
      'inner-top': 1,          // (1, 0)
      'inner-top-right': 2,    // (2, 0)
      'inner-left': 5,         // (0, 1)
      'inner-right': 7,        // (2, 1)
      'inner-bottom-left': 10, // (0, 2)
      'inner-bottom': 11,      // (1, 2)
      'inner-bottom-right': 12 // (2, 2)
    };
    
    const index = positionMap[position];
    if (index !== undefined && index < this.textures.water.length) {
      return this.textures.water[index];
    }
    return null;
  }
  
  getWaterInnerCornerMatch(matchType) {
    const matchMap = {
      'inner-NE-match': 3, // (3, 0)
      'inner-NW-match': 4, // (4, 0)
      'inner-SE-match': 8, // (3, 1)
      'inner-SW-match': 9  // (4, 1)
    };
    
    const index = matchMap[matchType];
    if (index !== undefined && index < this.textures.water.length) {
      return this.textures.water[index];
    }
    return null;
  }
}