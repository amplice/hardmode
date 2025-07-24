/**
 * @fileoverview ChunkedWorldRenderer - Large world performance optimization
 * 
 * MIGRATION NOTES:
 * - Converted from ChunkedWorldRenderer.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for chunk management structures
 * - Preserved all chunking and optimization logic
 * 
 * ARCHITECTURE ROLE:
 * - Memory optimization for worlds >20,000 tiles (200x200+)
 * - Reduces PIXI.js sprite count by 77% (40,000+ → ~9,000 active sprites)
 * - Implements spatial partitioning with dynamic loading/unloading
 * - Seamless integration with existing tile systems (biomes, cliffs, decorations)
 * 
 * PERFORMANCE IMPACT:
 * Small worlds (100x100): No benefit, adds complexity
 * Large worlds (200x200+): 77% memory reduction, 60% render performance gain
 * Critical threshold: 20,000 tiles where chunking becomes beneficial
 * 
 * CHUNKING ALGORITHM:
 * - 32x32 tile chunks = 1,024 sprites per chunk
 * - 3x3 chunk loading pattern = 9 active chunks maximum
 * - Player-centered viewport automatically loads/unloads chunks
 * - Chunks created on-demand, destroyed when outside view radius
 * 
 * MEMORY OPTIMIZATION PATTERN:
 * Instead of 200x200=40k sprites always in memory:
 * Only 3x3 chunks * 32x32 tiles = ~9k sprites maximum loaded
 * Chunk boundaries handled by autotiling system for seamless appearance
 * 
 * CRITICAL DESIGN:
 * Compatible with existing world generation - no data format changes
 * Chunks reference same biome/elevation data as full rendering
 * Preserves visual fidelity while dramatically reducing memory usage
 */

import * as PIXI from 'pixi.js';
import type { ClientWorldRenderer } from './ClientWorldRenderer.js';

// Interface for stored chunk data
interface ChunkData {
    container: PIXI.Container;
    chunkX: number;
    chunkY: number;
    tileCount: number;
    processedTiles: boolean[][];
}

// Interface for stair info
interface StairInfo {
    tileX: number;
    tileY: number;
    biome?: number;
}

export class ChunkedWorldRenderer {
    private worldRenderer: ClientWorldRenderer;
    private chunkSize: number;
    private loadRadius: number;
    private chunkGridWidth: number;
    private chunkGridHeight: number;
    private loadedChunks: Map<string, ChunkData>;
    private playerChunkX: number;
    private playerChunkY: number;
    public container: PIXI.Container;

    constructor(worldRenderer: ClientWorldRenderer) {
        this.worldRenderer = worldRenderer;
        this.chunkSize = 32; // 32x32 tiles per chunk
        this.loadRadius = 1; // Load 3x3 chunks (1 chunk radius around player)
        
        // Calculate chunk grid dimensions
        this.chunkGridWidth = Math.ceil(worldRenderer.width / this.chunkSize);
        this.chunkGridHeight = Math.ceil(worldRenderer.height / this.chunkSize);
        
        // Chunk management
        this.loadedChunks = new Map(); // chunkKey -> chunkData
        this.playerChunkX = -1; // Track player's current chunk
        this.playerChunkY = -1;
        
        // Container for all chunk containers
        this.container = new PIXI.Container();
        
        console.log(`[ChunkedWorldRenderer] Initialized for ${worldRenderer.width}x${worldRenderer.height} world`);
        console.log(`[ChunkedWorldRenderer] Chunk grid: ${this.chunkGridWidth}x${this.chunkGridHeight} chunks`);
        console.log(`[ChunkedWorldRenderer] Load pattern: ${(this.loadRadius * 2 + 1)}x${(this.loadRadius * 2 + 1)} chunks around player`);
    }
    
    /**
     * Update chunk loading based on player position
     */
    updatePlayerPosition(playerX: number, playerY: number): void {
        // Convert player position to chunk coordinates
        const chunkX = Math.floor(playerX / (this.chunkSize * this.worldRenderer.tileSize));
        const chunkY = Math.floor(playerY / (this.chunkSize * this.worldRenderer.tileSize));
        
        // Only update if player moved to a different chunk
        if (chunkX !== this.playerChunkX || chunkY !== this.playerChunkY) {
            this.playerChunkX = chunkX;
            this.playerChunkY = chunkY;
            this.updateChunks();
        }
    }
    
    /**
     * Update which chunks should be loaded
     */
    private updateChunks(): void {
        // Determine which chunks should be loaded
        const requiredChunks = new Set<string>();
        
        for (let dy = -this.loadRadius; dy <= this.loadRadius; dy++) {
            for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
                const chunkX = this.playerChunkX + dx;
                const chunkY = this.playerChunkY + dy;
                
                // Check bounds
                if (chunkX >= 0 && chunkX < this.chunkGridWidth && 
                    chunkY >= 0 && chunkY < this.chunkGridHeight) {
                    requiredChunks.add(`${chunkX},${chunkY}`);
                }
            }
        }
        
        // Unload chunks that are no longer needed
        for (const [chunkKey, chunk] of this.loadedChunks) {
            if (!requiredChunks.has(chunkKey)) {
                this.unloadChunk(chunkKey);
            }
        }
        
        // Load new chunks
        for (const chunkKey of requiredChunks) {
            if (!this.loadedChunks.has(chunkKey)) {
                this.loadChunk(chunkKey);
            }
        }
        
        console.log(`[ChunkedWorldRenderer] Player chunk: (${this.playerChunkX},${this.playerChunkY})`);
        console.log(`[ChunkedWorldRenderer] Loaded chunks: ${this.loadedChunks.size}/${this.chunkGridWidth * this.chunkGridHeight}`);
    }
    
    /**
     * Load a chunk and render its tiles
     */
    private loadChunk(chunkKey: string): void {
        const [chunkX, chunkY] = chunkKey.split(',').map(Number);
        
        // Create container for this chunk
        const chunkContainer = new PIXI.Container();
        
        // Calculate tile bounds for this chunk
        const startX = chunkX * this.chunkSize;
        const startY = chunkY * this.chunkSize;
        const endX = Math.min(startX + this.chunkSize, this.worldRenderer.width);
        const endY = Math.min(startY + this.chunkSize, this.worldRenderer.height);
        
        // Track processed tiles for this chunk (for autotiling)
        const processedTiles: boolean[][] = [];
        for (let y = 0; y < this.worldRenderer.height; y++) {
            processedTiles[y] = [];
        }
        
        // First pass: Render tiles in this chunk
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                this.renderTile(x, y, chunkContainer, processedTiles);
            }
        }
        
        // Second pass: Add cliff extensions for this chunk
        this.addChunkCliffExtensions(chunkContainer, startX, startY, endX, endY, processedTiles);
        
        // Position the chunk container
        chunkContainer.x = startX * this.worldRenderer.tileSize;
        chunkContainer.y = startY * this.worldRenderer.tileSize;
        
        // Store and add to scene
        const chunkData: ChunkData = {
            container: chunkContainer,
            chunkX,
            chunkY,
            tileCount: (endX - startX) * (endY - startY),
            processedTiles: processedTiles
        };
        
        this.loadedChunks.set(chunkKey, chunkData);
        this.container.addChild(chunkContainer);
        
        console.log(`[ChunkedWorldRenderer] Loaded chunk (${chunkX},${chunkY}): ${chunkData.tileCount} tiles`);
    }
    
    /**
     * Unload a chunk and free its memory
     */
    private unloadChunk(chunkKey: string): void {
        const chunk = this.loadedChunks.get(chunkKey);
        if (chunk) {
            // Remove from scene
            this.container.removeChild(chunk.container);
            
            // Destroy all sprites in the chunk to free memory
            chunk.container.destroy({ children: true });
            
            this.loadedChunks.delete(chunkKey);
            
            console.log(`[ChunkedWorldRenderer] Unloaded chunk (${chunk.chunkX},${chunk.chunkY})`);
        }
    }
    
    /**
     * Render a single tile using the full world renderer logic
     */
    private renderTile(x: number, y: number, container: PIXI.Container, processedTiles: boolean[][]): void {
        // Create a tile container for layering
        const tileContainer = new PIXI.Container();
        const localX = (x % this.chunkSize) * this.worldRenderer.tileSize;
        const localY = (y % this.chunkSize) * this.worldRenderer.tileSize;
        tileContainer.position.set(localX, localY);
        
        // Check if this position has stairs
        if (this.worldRenderer.stairsData && this.worldRenderer.stairsData[y] && this.worldRenderer.stairsData[y][x]) {
            const stairInfo = this.worldRenderer.stairsData[y][x] as StairInfo;
            // Use snow tileset for snow stairs, terrain tileset for grass stairs
            const tileset = (stairInfo as any).isSnow ? this.worldRenderer.tilesets.textures.snow : this.worldRenderer.tilesets.textures.terrain;
            const stairTexture = tileset[stairInfo.tileY] && tileset[stairInfo.tileY][stairInfo.tileX];
            
            if (stairTexture) {
                // Create base layer for stairs
                const stairBiome = stairInfo.biome || 0;
                const isDarkGrassStair = stairBiome === 1;
                const isSnowStair = stairBiome === 2;
                
                if (isSnowStair) {
                    // For snow stairs, place a full snow ground tile as base
                    const snowGroundTexture = this.worldRenderer.tilesets.getRandomSnowTile(0); // White snow variant
                    if (snowGroundTexture) {
                        const baseSprite = new PIXI.Sprite(snowGroundTexture);
                        baseSprite.scale.set(this.worldRenderer.tileSize / 32, this.worldRenderer.tileSize / 32);
                        tileContainer.addChild(baseSprite);
                    }
                } else {
                    // For grass stairs, use solid color fill as before
                    const baseColor = isDarkGrassStair ? 0x2a3a1c : 0x3e5b24;
                    const colorFill = new PIXI.Graphics();
                    colorFill.beginFill(baseColor, 1.0);
                    colorFill.drawRect(0, 0, this.worldRenderer.tileSize, this.worldRenderer.tileSize);
                    colorFill.endFill();
                    tileContainer.addChild(colorFill);
                }
                
                // Add stair sprite
                const stairSprite = new PIXI.Sprite(stairTexture);
                stairSprite.scale.set(this.worldRenderer.tileSize / 32, this.worldRenderer.tileSize / 32);
                tileContainer.addChild(stairSprite);
                
                container.addChild(tileContainer);
                processedTiles[y][x] = true;
                return;
            }
        }
        
        // Normal tile processing with autotiler
        const tileResult = (this.worldRenderer.cliffAutotiler as any).getTileTexture(
            x, y, 
            this.worldRenderer.elevationData || [], 
            processedTiles, 
            this.worldRenderer.biomeData || undefined
        ) as any;
        
        processedTiles[y][x] = tileResult.type;
        
        // FOR ELEVATED TILES: Create base layer first
        if (this.worldRenderer.elevationData && this.worldRenderer.elevationData[y][x] > 0) {
            const cliffBiome = this.worldRenderer.biomeData && this.worldRenderer.biomeData[y] ? 
                this.worldRenderer.biomeData[y][x] : 0;
            const isDarkGrassCliff = cliffBiome === 1;
            const isSnowCliff = cliffBiome === 2;
            
            if (isSnowCliff) {
                // For snow cliffs, place a full snow ground tile as base
                const snowGroundTexture = this.worldRenderer.tilesets.getRandomSnowTile(0); // White snow variant
                if (snowGroundTexture) {
                    const baseSprite = new PIXI.Sprite(snowGroundTexture);
                    baseSprite.scale.set(this.worldRenderer.tileSize / 32, this.worldRenderer.tileSize / 32);
                    tileContainer.addChild(baseSprite);
                }
            } else {
                // For grass cliffs, use solid color fill as before
                let baseColor = isDarkGrassCliff ? 0x2a3a1c : 0x3e5b24;
                const colorFill = new PIXI.Graphics();
                colorFill.beginFill(baseColor, 1.0);
                colorFill.drawRect(0, 0, this.worldRenderer.tileSize, this.worldRenderer.tileSize);
                colorFill.endFill();
                tileContainer.addChild(colorFill);
            }
        }
        
        // Add the tile sprite
        const sprite = new PIXI.Sprite(tileResult.texture);
        sprite.scale.set(this.worldRenderer.tileSize / 32, this.worldRenderer.tileSize / 32);
        tileContainer.addChild(sprite);
        
        container.addChild(tileContainer);
    }
    
    /**
     * Add cliff top extensions for proper visual overlap
     */
    private addChunkCliffExtensions(container: PIXI.Container, startX: number, startY: number, endX: number, endY: number, processedTiles: boolean[][]): void {
        // Process cliff extensions for tiles in this chunk
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (!this.worldRenderer.elevationData || 
                    !this.worldRenderer.elevationData[y] || 
                    this.worldRenderer.elevationData[y][x] <= 0) {
                    continue;
                }
                
                // Skip if this is a stair position (stairs don't get extensions)
                if (this.worldRenderer.stairsData && 
                    this.worldRenderer.stairsData[y] && 
                    this.worldRenderer.stairsData[y][x]) {
                    continue;
                }
                
                // Get cliff extension texture from autotiler
                const extensionTexture = (this.worldRenderer.cliffAutotiler as any).getCliffExtensionTexture(
                    x, y, this.worldRenderer.elevationData, processedTiles, this.worldRenderer.biomeData
                );
                
                if (extensionTexture && y + 1 < this.worldRenderer.height) {
                    // Calculate position for extension (it goes on the tile below)
                    const extensionX = x % this.chunkSize;
                    const extensionY = (y + 1) % this.chunkSize;
                    
                    // Only add if the extension is within this chunk
                    if (y + 1 < endY) {
                        const localX = extensionX * this.worldRenderer.tileSize;
                        const localY = extensionY * this.worldRenderer.tileSize;
                        
                        const extensionSprite = new PIXI.Sprite(extensionTexture);
                        extensionSprite.scale.set(this.worldRenderer.tileSize / 32, this.worldRenderer.tileSize / 32);
                        extensionSprite.position.set(localX, localY);
                        container.addChild(extensionSprite);
                    }
                }
            }
        }
    }
    
    /**
     * Clear all loaded chunks
     */
    clear(): void {
        for (const [chunkKey] of this.loadedChunks) {
            this.unloadChunk(chunkKey);
        }
        this.playerChunkX = -1;
        this.playerChunkY = -1;
    }
}