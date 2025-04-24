// src/systems/tiles/TilesetManager.js
import { Assets, Texture, Rectangle } from 'pixi.js';

export class TilesetManager {
  constructor() {
    this.grassTextures = [];
    this.sandTextures = [];
    this.waterTextures = []; // <-- ADDED
    this.plantTextures = [];
    
    Assets.addBundle('tilesets', {
      grass: 'assets/sprites/tiles/Grass.png',
      sand: 'assets/sprites/tiles/Sand.png',
      plants: 'assets/sprites/tiles/Plants.png',  // Add this line
      water: 'assets/sprites/tiles/Water.png', // <-- ADDED Water.png asset
    });
  }

  async load() {
    await Assets.loadBundle('tilesets');
    
    // Load grass tiles
    const grassTex = Assets.get('grass');
    this.grassTextures = this.sliceTileset(grassTex.baseTexture);
    
    // Load sand tiles
    const sandTex = Assets.get('sand');
    this.sandTextures = this.sliceTileset(sandTex.baseTexture);

     // vvv ADDED vvv
    // Load water tiles
    const waterTex = Assets.get('water');
    if (waterTex) this.waterTextures = this.sliceTileset(waterTex.baseTexture, 5, 3); // Slice water tileset (5x3)
    // ^^^ ADDED ^^^
    
    const plantsTex = Assets.get('plants');
this.plantTextures = this.slicePlantsTileset(plantsTex.baseTexture);

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
    
    // Create a 6x3 array of textures (for the entire sheet)
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
    // Map type names to texture indices
    const textureMap = {
      'plant': 9,      // row 3, col 0
      'branches': 10,  // row 3, col 1
      'twigs': 11,     // row 3, col 2
      'flower1': 12,   // row 4, col 0
      'flower2': 13,   // row 4, col 1
      'flower3': 15,   // row 5, col 0
      'flower4': 16    // row 5, col 1
    };
    
    return this.plantTextures[textureMap[type]];
  }
  
  // Get full grass tile (row 2, col 4)
  getFullGrassTile() {
    return this.grassTextures[14];
  }
  
  // Get full sand tile (row 2, col 4)
  getFullSandTile() {
    return this.sandTextures[14];
  }
  
  // Get transition piece from Grass.png
  getGrassTransition(position) {
    // Map position to index in the grass tileset
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
    return this.grassTextures[index];
  }
  
  // Get inner corner match piece from Grass.png
  getInnerCornerMatch(matchType) {
    // Map match type to index in the grass tileset
    const matchMap = {
      'top-left-match': 3,     // Row 0, Col 3
      'top-right-match': 4,    // Row 0, Col 4
      'bottom-left-match': 8,  // Row 1, Col 3
      'bottom-right-match': 9  // Row 1, Col 4
    };
    
    const index = matchMap[matchType];
    return index !== undefined ? this.grassTextures[index] : null;
  }
  // vvv ADDED vvv
  // Add methods for getting water tiles
  getFullWaterTile() {
    // Use one of the full water tiles, e.g., (1, 1), (3, 2), or (4, 2)
    // Indices based on 5x3 grid: (1,1)=6, (3,2)=13, (4,2)=14
    const options = [6, 13, 14];
    const validOptions = options.filter(index => index < this.waterTextures.length);
    if (validOptions.length === 0) {
        console.error("No valid full water tiles available!");
        return Texture.WHITE; // Fallback
    }
    const randomIndex = validOptions[Math.floor(Math.random() * validOptions.length)];
    return this.waterTextures[randomIndex];
  }

  getWaterEdgeTile(position) {
    // Map position to index in the water tileset (Left Section)
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
    if (index !== undefined && index < this.waterTextures.length) {
       return this.waterTextures[index];
    }
    console.warn(`Water edge tile for position "${position}" not found or index out of bounds.`);
    return null; // Indicate texture not found
  }
  // ^^^ ADDED ^^^
}