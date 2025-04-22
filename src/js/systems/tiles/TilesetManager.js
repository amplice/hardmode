// src/systems/tiles/TilesetManager.js

import { Assets, Texture, Rectangle } from 'pixi.js';

export class TilesetManager {
  constructor() {
    this.textures = [];
    // register a single bundle with your 128×128 sheet
    Assets.addBundle('tiles', {
      all: 'assets/sprites/tiles/alltiles.png'
    });
  }

  /** loads & slices the 8×8 grid into this.textures[] */
  async load() {
    // 1) load the sheet
    await Assets.loadBundle('tiles');

    // 2) grab the base texture
    const sheetTex = Assets.get('all');    
    const base     = sheetTex.baseTexture;
    const size     = 16;      // each tile is 16×16
    const cols     = 8;       // 8 across
    const rows     = 8;       // 8 down

    // 3) slice into an array of 64 Textures
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.textures.push(
          new Texture(
            base,
            new Rectangle(x * size, y * size, size, size)
          )
        );
      }
    }
  }

  /**
   * Returns the exact 16×16 tile for each type:
   *  - Grass = row 1, col 5  → index =(0*8)+(5−1)=4  
   *  - Sand  = row 3, col 7  → index =(2*8)+(7−1)=22  
   *  - Trees = row 6, col 2  → index =(5*8)+(2−1)=41  
   *  - Rocks = row 5, col 1  → index =(4*8)+(1−1)=32  
   */
  getTexture(type) {
    const map = {
      grass:  3,
      sand:  21,
      tree:  41,
      rock:  32,
      water: 33
    };
    const idx = map[type] ?? map.grass;
    return this.textures[idx];
  }
}
