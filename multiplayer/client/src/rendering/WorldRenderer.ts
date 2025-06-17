/**
 * LLM_NOTE: Renders the game world tilemap on the client.
 * Uses PIXI.js to display grass, sand, and water tiles.
 */

import * as PIXI from 'pixi.js';
import { TileType, WORLD_CONFIG, ITile } from '@hardmode/shared';

export class WorldRenderer {
  private app: PIXI.Application;
  private worldContainer: PIXI.Container;
  private tileSprites: Map<string, PIXI.Graphics> = new Map();
  private visibleChunks: Set<string> = new Set();
  
  // Tile colors (placeholder graphics)
  private readonly TILE_COLORS: Record<TileType, number> = {
    [TileType.GRASS]: 0x228B22,
    [TileType.SAND]: 0xF4A460,
    [TileType.WATER]: 0x4682B4,
    [TileType.STONE]: 0x808080,
    [TileType.DIRT]: 0x8B4513,
  };
  
  constructor(app: PIXI.Application) {
    this.app = app;
    this.worldContainer = new PIXI.Container();
    this.worldContainer.sortableChildren = true;
    this.worldContainer.zIndex = 0; // World renders behind entities
    this.app.stage.addChild(this.worldContainer);
  }
  
  /**
   * Update which chunks are visible based on camera position.
   */
  updateVisibleChunks(cameraX: number, cameraY: number, viewWidth: number, viewHeight: number): void {
    // Update world container position to follow camera
    this.worldContainer.x = -cameraX;
    this.worldContainer.y = -cameraY;
    
    const tileSize = WORLD_CONFIG.tileSize;
    const chunkSize = 16; // tiles per chunk
    const chunkPixelSize = chunkSize * tileSize;
    
    // Calculate which chunks should be visible
    const startChunkX = Math.floor((cameraX - viewWidth / 2) / chunkPixelSize) - 1;
    const endChunkX = Math.floor((cameraX + viewWidth / 2) / chunkPixelSize) + 1;
    const startChunkY = Math.floor((cameraY - viewHeight / 2) / chunkPixelSize) - 1;
    const endChunkY = Math.floor((cameraY + viewHeight / 2) / chunkPixelSize) + 1;
    
    const newVisibleChunks = new Set<string>();
    
    // Add chunks that should be visible
    for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
      for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
        const chunkKey = `${chunkX},${chunkY}`;
        newVisibleChunks.add(chunkKey);
        
        // Create chunk if not already rendered
        if (!this.visibleChunks.has(chunkKey)) {
          this.renderChunk(chunkX, chunkY);
        }
      }
    }
    
    // Remove chunks that are no longer visible
    for (const chunkKey of this.visibleChunks) {
      if (!newVisibleChunks.has(chunkKey)) {
        this.removeChunk(chunkKey);
      }
    }
    
    this.visibleChunks = newVisibleChunks;
  }
  
  /**
   * Render a chunk of tiles.
   */
  private renderChunk(chunkX: number, chunkY: number): void {
    const chunkKey = `${chunkX},${chunkY}`;
    const tileSize = WORLD_CONFIG.tileSize;
    const chunkSize = 16;
    
    // Create a graphics object for this chunk
    const chunkGraphics = new PIXI.Graphics();
    
    // Draw all tiles in the chunk
    for (let tileY = 0; tileY < chunkSize; tileY++) {
      for (let tileX = 0; tileX < chunkSize; tileX++) {
        const worldTileX = chunkX * chunkSize + tileX;
        const worldTileY = chunkY * chunkSize + tileY;
        
        // Get tile from world data (for now, use procedural generation)
        const tile = this.generateTile(worldTileX, worldTileY);
        
        if (tile) {
          const color = this.TILE_COLORS[tile.type];
          const x = worldTileX * tileSize;
          const y = worldTileY * tileSize;
          
          chunkGraphics.beginFill(color);
          chunkGraphics.drawRect(x, y, tileSize, tileSize);
          chunkGraphics.endFill();
          
          // Add subtle grid lines
          chunkGraphics.setStrokeStyle({ width: 1, color: 0x000000, alpha: 0.1 });
          chunkGraphics.drawRect(x, y, tileSize, tileSize);
        }
      }
    }
    
    this.tileSprites.set(chunkKey, chunkGraphics);
    this.worldContainer.addChild(chunkGraphics);
  }
  
  /**
   * Remove a chunk from rendering.
   */
  private removeChunk(chunkKey: string): void {
    const graphics = this.tileSprites.get(chunkKey);
    if (graphics) {
      this.worldContainer.removeChild(graphics);
      graphics.destroy();
      this.tileSprites.delete(chunkKey);
    }
  }
  
  /**
   * Generate a tile (temporary - will be replaced with server data).
   */
  private generateTile(x: number, y: number): ITile {
    // Simple pattern for testing
    const pattern = (x + y) % 10;
    
    let type: TileType;
    if (pattern < 2) {
      type = TileType.WATER;
    } else if (pattern < 4) {
      type = TileType.SAND;
    } else {
      type = TileType.GRASS;
    }
    
    return {
      x,
      y,
      type,
      variant: 0,
      walkable: type !== TileType.WATER,
    };
  }
  
  /**
   * Update world data from server.
   */
  updateWorldData(_tiles: ITile[]): void {
    // This will be implemented when we receive world data from server
    // For now, we're using procedural generation
  }
  
  /**
   * Clean up resources.
   */
  destroy(): void {
    for (const [, graphics] of this.tileSprites) {
      graphics.destroy();
    }
    this.tileSprites.clear();
    this.visibleChunks.clear();
    this.worldContainer.destroy();
  }
}