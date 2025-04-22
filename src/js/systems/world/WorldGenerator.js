// src/systems/world/WorldGenerator.js

import * as PIXI from 'pixi.js';
import { Tile }           from './Tile.js';
import { TilesetManager } from '../tiles/TilesetManager.js';
import { createNoise2D }  from 'simplex-noise';

export class WorldGenerator {
  constructor(options = {}) {
    this.width    = options.width    || 200;
    this.height   = options.height   || 200;
    this.tileSize = options.tileSize || 32;
    this.tilesets = options.tilesets || new TilesetManager();
    this.noise2D  = createNoise2D();

    this.container = new PIXI.Container();
    this.tiles     = [];
  }

  generate() {
    const scale = 0.1;

    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        // 1) pick terrain type
        const h = this.noise2D(x * scale, y * scale);
        const m = this.noise2D(x * scale + 1000, y * scale + 1000);
        let type;
             if (h < -0.3)               type = 'water';
        else if (h < -0.1)               type = 'sand';
        else if (h >  0.5 && m <  0)     type = 'rock';
        else if (h >  0.2 && m >  0.2)   type = 'tree';
        else                             type = 'grass';

        // 2) always make a Tile (so physics/pathfinding sees it)
        const tile = new Tile(x, y, type, this.tilesets, this.tileSize);

        // 3) draw tile; override water to solid blue
        if (type === 'water') {
          tile.sprite.texture = PIXI.Texture.WHITE;
          tile.sprite.tint    = 0x03A9F4;
        } else {
          // for sand/grass/rock/tree, Tile constructor already
          // picked the correct sheet texture; but we want grass
          // underneath trees & rocks, so:
          if (type === 'tree' || type === 'rock') {
            // replace base sprite with grass
            tile.sprite.texture = this.tilesets.getTexture('grass');
          }
        }
        tile.sprite.scale.set(this.tileSize/16, this.tileSize/16);

        this.container.addChild(tile.sprite);

        // 4) if it’s a tree or rock, overlay the decoration
        if (type === 'tree' || type === 'rock') {
          const decoTex = this.tilesets.getTexture(type);
          const deco    = new PIXI.Sprite(decoTex);
          deco.scale.set(this.tileSize/16, this.tileSize/16);
          deco.position.set(x*this.tileSize, y*this.tileSize);
          this.container.addChild(deco);
        }

        // 5) store for physics/pathfinding
        this.tiles[y][x] = tile;
      }
    }

    return this.container;
  }

  getTileAt(worldX, worldY) {
    const tx = Math.floor(worldX / this.tileSize);
    const ty = Math.floor(worldY / this.tileSize);
    if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
      return this.tiles[ty][tx];
    }
    return null;
  }

  isTileWalkable(worldX, worldY) {
    const tile = this.getTileAt(worldX, worldY);
    return tile ? tile.isWalkable() : false;
  }
}
