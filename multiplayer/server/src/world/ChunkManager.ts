/**
 * LLM_NOTE: Manages world chunks for efficient memory usage and streaming.
 * Only loads chunks that are near players.
 * 
 * ARCHITECTURE_DECISION: Using chunk-based loading to support large worlds
 * without loading everything into memory at once.
 */

import { IChunk, SPATIAL_CONFIG, WORLD_CONFIG } from '@hardmode/shared';
import { WorldGenerator } from './WorldGenerator';

export class ChunkManager {
  private chunks: Map<string, IChunk> = new Map();
  private worldGenerator: WorldGenerator;
  private chunkSize: number;
  
  constructor(worldGenerator: WorldGenerator) {
    this.worldGenerator = worldGenerator;
    this.chunkSize = SPATIAL_CONFIG.CHUNK_SIZE;
  }
  
  /**
   * Load a chunk at the specified chunk coordinates.
   */
  loadChunk(chunkX: number, chunkY: number): IChunk {
    const key = this.getChunkKey(chunkX, chunkY);
    
    // Check if already loaded
    let chunk = this.chunks.get(key);
    if (chunk) {
      chunk.lastUpdate = Date.now();
      return chunk;
    }
    
    // Create new chunk
    chunk = this.createChunk(chunkX, chunkY);
    this.chunks.set(key, chunk);
    
    return chunk;
  }
  
  /**
   * Unload a chunk.
   */
  unloadChunk(chunkX: number, chunkY: number): void {
    const key = this.getChunkKey(chunkX, chunkY);
    this.chunks.delete(key);
  }
  
  /**
   * Get a loaded chunk.
   */
  getChunk(chunkX: number, chunkY: number): IChunk | undefined {
    const key = this.getChunkKey(chunkX, chunkY);
    return this.chunks.get(key);
  }
  
  /**
   * Create a new chunk.
   */
  private createChunk(chunkX: number, chunkY: number): IChunk {
    const tiles = [];
    
    // Calculate world tile coordinates for this chunk
    const startX = chunkX * this.chunkSize;
    const startY = chunkY * this.chunkSize;
    
    // Get tiles from world generator
    for (let y = 0; y < this.chunkSize; y++) {
      tiles[y] = [];
      for (let x = 0; x < this.chunkSize; x++) {
        const worldX = startX + x;
        const worldY = startY + y;
        const tile = this.worldGenerator.getTile(worldX, worldY);
        
        if (tile) {
          tiles[y][x] = tile;
        }
      }
    }
    
    return {
      x: chunkX,
      y: chunkY,
      tiles,
      entities: new Set(),
      lastUpdate: Date.now(),
    };
  }
  
  /**
   * Get chunk key from chunk coordinates.
   */
  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }
  
  /**
   * Get chunk coordinates from world coordinates.
   */
  getChunkCoords(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / WORLD_CONFIG.tileSize / this.chunkSize),
      y: Math.floor(worldY / WORLD_CONFIG.tileSize / this.chunkSize),
    };
  }
  
  /**
   * Load chunks around a position.
   */
  loadChunksAroundPosition(worldX: number, worldY: number, radius: number = SPATIAL_CONFIG.CHUNK_LOAD_RADIUS): void {
    const centerChunk = this.getChunkCoords(worldX, worldY);
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        this.loadChunk(centerChunk.x + dx, centerChunk.y + dy);
      }
    }
  }
  
  /**
   * Unload chunks that haven't been updated recently.
   */
  unloadStaleChunks(maxAge: number = 60000): void { // 1 minute default
    const now = Date.now();
    const toUnload: string[] = [];
    
    for (const [key, chunk] of this.chunks) {
      if (now - chunk.lastUpdate > maxAge && chunk.entities.size === 0) {
        toUnload.push(key);
      }
    }
    
    for (const key of toUnload) {
      this.chunks.delete(key);
    }
  }
  
  /**
   * Get statistics about loaded chunks.
   */
  getStats(): {
    loadedChunks: number;
    totalTiles: number;
    totalEntities: number;
  } {
    let totalEntities = 0;
    
    for (const chunk of this.chunks.values()) {
      totalEntities += chunk.entities.size;
    }
    
    return {
      loadedChunks: this.chunks.size,
      totalTiles: this.chunks.size * this.chunkSize * this.chunkSize,
      totalEntities,
    };
  }
}