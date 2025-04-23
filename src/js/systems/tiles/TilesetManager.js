// src/systems/tiles/TilesetManager.js
import { Assets, Texture, Rectangle } from 'pixi.js';

export class TilesetManager {
  constructor() {
    this.grassTextures = [];
    this.sandTextures = [];
    
    Assets.addBundle('tilesets', {
      grass: 'assets/sprites/tiles/Grass.png',
      sand: 'assets/sprites/tiles/Sand.png'
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
      'top-left-match': 9,     // Row 0, Col 3
      'top-right-match': 8,    // Row 0, Col 4
      'bottom-left-match': 4,  // Row 1, Col 3
      'bottom-right-match': 3  // Row 1, Col 4
    };
    
    const index = matchMap[matchType];
    return index !== undefined ? this.grassTextures[index] : null;
  }
}