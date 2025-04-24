import * as PIXI from 'pixi.js';

export class DecorationManager {
  constructor(world, tilesets) {
    this.world = world;
    this.tilesets = tilesets;
    this.container = new PIXI.Container();
    this.decorations = [];
  }
  
  generateDecorations() {
    // Clear existing decorations
    this.container.removeChildren();
    this.decorations = [];
    
    // Define decoration types and their properties
    const decorationTypes = [
      { type: 'plant', densityOnGrass: 0.02, densityOnSand: 0, grassOnly: true },
      { type: 'branches', densityOnGrass: 0.02, densityOnSand: 0, grassOnly: true },
      { type: 'twigs', densityOnGrass: 0.005, densityOnSand: 0.005, grassOnly: false },
      { type: 'flower1', densityOnGrass: 0.02, densityOnSand: 0, grassOnly: true },
      { type: 'flower2', densityOnGrass: 0.02, densityOnSand: 0, grassOnly: true },
      { type: 'flower3', densityOnGrass: 0.02, densityOnSand: 0, grassOnly: true },
      { type: 'flower4', densityOnGrass: 0.02, densityOnSand: 0, grassOnly: true }
    ];
    
    // For each tile in the world
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        const tile = this.world.tiles[y][x];
        const tileType = tile.type;

         // vvv ADDED vvv - Skip water tiles entirely
         if (tileType === 'water') {
          continue;
      }
      // ^^^ ADDED ^^^
        
        // Try to place each decoration type
        for (const decType of decorationTypes) {
          // Skip if this is grass-only decoration and we're on sand
          if (decType.grassOnly && tileType !== 'grass') {
            continue;
          }
          
          // Determine density based on tile type
          const density = tileType === 'grass' ? decType.densityOnGrass : decType.densityOnSand;
          
          // Random check based on density
          if (Math.random() < density) {
            this.placeDecoration(x, y, decType.type);
            break; // Only place one decoration per tile
          }
        }
      }
    }
    
    return this.container;
  }
  
  placeDecoration(x, y, type) {
    // Get the decoration texture
    const texture = this.tilesets.getPlantTexture(type);
    if (!texture) return;
    
    // Create a sprite for the decoration
    const sprite = new PIXI.Sprite(texture);
    
    // Scale to match tile size
    sprite.scale.set(this.world.tileSize / 16, this.world.tileSize / 16);
    
    // Calculate position (center of the tile)
    const posX = x * this.world.tileSize;
    const posY = y * this.world.tileSize;
    sprite.position.set(posX, posY);
    
    // Add small random offset for natural look
    sprite.position.x += (Math.random() - 0.5) * (this.world.tileSize * 0.5);
    sprite.position.y += (Math.random() - 0.5) * (this.world.tileSize * 0.5);
    
    // Add to container
    this.container.addChild(sprite);
    
    // Store decoration info
    this.decorations.push({
      x, y, type, sprite
    });
    
    return sprite;
  }
}