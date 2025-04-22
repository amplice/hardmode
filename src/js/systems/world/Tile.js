// src/systems/world/Tile.js

import * as PIXI from 'pixi.js';

export class Tile {
  /**
   * @param {number} x         Grid X
   * @param {number} y         Grid Y
   * @param {string} type      Semantic tile type
   * @param {TilesetManager} tilesets
   * @param {number} tileSize  World cell size in pixels
   */
  constructor(x, y, type, tilesets, tileSize) {
    this.x        = x;
    this.y        = y;
    this.type     = type;
    this.tileSize = tileSize;

    // look up the 16×16 texture
    const tex = tilesets.getTexture(type);
    this.sprite = new PIXI.Sprite(tex);

    // scale up from 16px → tileSize
    const scale = tileSize / 16;
    this.sprite.scale.set(scale, scale);

    // position on the grid
    this.sprite.position.set(
      x * tileSize,
      y * tileSize
    );
  }

  isWalkable() {
    return this.type !== 'water'
        && this.type !== 'tree'
        && this.type !== 'rock';
  }
}
