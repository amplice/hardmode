/**
 * ChunkedWorldRenderer - High-performance rendering for large worlds
 * 
 * Divides the world into chunks and only renders chunks near the player.
 * Reduces sprite count from 40,000+ to ~9,000 for large worlds (77% reduction).
 * 
 * Features:
 * - 32x32 tile chunks (1024 sprites per chunk)
 * - 3x3 chunk loading pattern (9 chunks around player)
 * - Dynamic chunk loading/unloading as player moves
 * - Maintains same visual quality as full rendering
 * - Compatible with existing biome and cliff systems
 */
import * as PIXI from 'pixi.js';

export class ChunkedWorldRenderer {
    constructor(worldRenderer) {
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
    updatePlayerPosition(playerX, playerY) {
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
    updateChunks() {
        // Determine which chunks should be loaded
        const requiredChunks = new Set();
        
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
    loadChunk(chunkKey) {
        const [chunkX, chunkY] = chunkKey.split(',').map(Number);
        
        // Create container for this chunk
        const chunkContainer = new PIXI.Container();
        
        // Calculate tile bounds for this chunk
        const startX = chunkX * this.chunkSize;
        const startY = chunkY * this.chunkSize;
        const endX = Math.min(startX + this.chunkSize, this.worldRenderer.width);
        const endY = Math.min(startY + this.chunkSize, this.worldRenderer.height);
        
        // Track processed tiles for this chunk (for autotiling)
        const processedTiles = [];
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
        const chunkData = {
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
    unloadChunk(chunkKey) {
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
    renderTile(x, y, container, processedTiles) {
        // Create a tile container for layering
        const tileContainer = new PIXI.Container();
        const localX = (x % this.chunkSize) * this.worldRenderer.tileSize;
        const localY = (y % this.chunkSize) * this.worldRenderer.tileSize;
        tileContainer.position.set(localX, localY);
        
        // Check if this position has stairs
        if (this.worldRenderer.stairsData && this.worldRenderer.stairsData[y] && this.worldRenderer.stairsData[y][x]) {
            const stairInfo = this.worldRenderer.stairsData[y][x];
            const stairTexture = this.worldRenderer.tilesets.textures.terrain[stairInfo.tileY] && 
                               this.worldRenderer.tilesets.textures.terrain[stairInfo.tileY][stairInfo.tileX];
            
            if (stairTexture) {
                // Create base color fill for stairs
                const stairBiome = stairInfo.biome || 0;
                const isDarkGrassStair = stairBiome === 1;
                const baseColor = isDarkGrassStair ? 0x2a3a1c : 0x3e5b24;
                
                const colorFill = new PIXI.Graphics();
                colorFill.beginFill(baseColor);
                colorFill.drawRect(0, 0, this.worldRenderer.tileSize, this.worldRenderer.tileSize);
                colorFill.endFill();
                tileContainer.addChild(colorFill);
                
                // Create stair sprite on top
                const sprite = new PIXI.Sprite(stairTexture);
                sprite.scale.set(this.worldRenderer.tileSize / 32);
                tileContainer.addChild(sprite);
            }
            
            processedTiles[y][x] = 'stairs';
        } else {
            // Normal tile processing with autotiler
            const tileResult = this.worldRenderer.cliffAutotiler.getTileTexture(
                x, y, 
                this.worldRenderer.elevationData, 
                processedTiles, 
                this.worldRenderer.biomeData
            );
            
            processedTiles[y][x] = tileResult.type;
            
            // For elevated tiles, add base color first
            if (this.worldRenderer.elevationData[y][x] > 0) {
                const cliffBiome = (this.worldRenderer.biomeData && this.worldRenderer.biomeData[y]) ? 
                                   this.worldRenderer.biomeData[y][x] : 0;
                const isDarkGrassCliff = cliffBiome === 1;
                const baseColor = isDarkGrassCliff ? 0x2a3a1c : 0x3e5b24;
                
                const colorFill = new PIXI.Graphics();
                colorFill.beginFill(baseColor);
                colorFill.drawRect(0, 0, this.worldRenderer.tileSize, this.worldRenderer.tileSize);
                colorFill.endFill();
                tileContainer.addChild(colorFill);
            }
            
            // Add the main tile sprite
            const sprite = new PIXI.Sprite(tileResult.texture);
            sprite.scale.set(this.worldRenderer.tileSize / 32);
            tileContainer.addChild(sprite);
        }
        
        container.addChild(tileContainer);
    }
    
    /**
     * Add cliff extensions for a chunk
     */
    addChunkCliffExtensions(container, startX, startY, endX, endY, processedTiles) {
        // Check each elevated tile in the chunk for extensions
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (this.worldRenderer.elevationData[y][x] === 0) continue;
                
                const extensionTexture = this.worldRenderer.cliffAutotiler.getCliffExtensionTexture(
                    x, y, 
                    this.worldRenderer.elevationData, 
                    processedTiles,
                    this.worldRenderer.biomeData
                );
                
                if (extensionTexture && y + 1 < this.worldRenderer.height) {
                    // Create extension sprite positioned below the cliff
                    const extensionSprite = new PIXI.Sprite(extensionTexture);
                    const localX = (x % this.chunkSize) * this.worldRenderer.tileSize;
                    const localY = ((y + 1) % this.chunkSize) * this.worldRenderer.tileSize;
                    
                    // Only add if the extension is within this chunk
                    if (y + 1 >= startY && y + 1 < endY) {
                        extensionSprite.position.set(localX, localY);
                        extensionSprite.scale.set(this.worldRenderer.tileSize / 32);
                        container.addChild(extensionSprite);
                    }
                }
            }
        }
    }
    
    /**
     * Force reload all currently loaded chunks
     */
    reloadAllChunks() {
        const currentChunks = Array.from(this.loadedChunks.keys());
        
        // Unload all chunks
        for (const chunkKey of currentChunks) {
            this.unloadChunk(chunkKey);
        }
        
        // Reload chunks around current player position
        this.updateChunks();
    }
    
    /**
     * Get statistics about the chunked rendering system
     */
    getStats() {
        const totalChunks = this.chunkGridWidth * this.chunkGridHeight;
        const loadedChunks = this.loadedChunks.size;
        const estimatedSprites = loadedChunks * (this.chunkSize * this.chunkSize);
        const reductionPercent = ((totalChunks - loadedChunks) / totalChunks * 100).toFixed(1);
        
        return {
            totalChunks,
            loadedChunks,
            chunkGridSize: `${this.chunkGridWidth}x${this.chunkGridHeight}`,
            chunkSize: this.chunkSize,
            loadRadius: this.loadRadius,
            estimatedSprites,
            reductionPercent: `${reductionPercent}%`,
            playerChunk: `(${this.playerChunkX},${this.playerChunkY})`
        };
    }
}