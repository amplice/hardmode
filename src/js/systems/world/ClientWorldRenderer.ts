/**
 * @fileoverview ClientWorldRenderer - High-performance world rendering system
 * 
 * MIGRATION NOTES:
 * - Converted from ClientWorldRenderer.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for world rendering structures
 * - Preserved all rendering logic including chunked and full rendering modes
 * 
 * ARCHITECTURE ROLE:
 * - Separates visual rendering from world generation logic (performance pattern)
 * - Accepts pre-generated world data from SharedWorldGenerator for rendering
 * - Implements two rendering strategies: full (small worlds) vs chunked (large worlds)
 * - Manages PIXI.js sprite creation, collision mask integration, and visual optimization
 * 
 * PERFORMANCE PATTERN:
 * Rendering is the bottleneck for large worlds (>20,000 tiles), not generation
 * Chunked rendering loads only visible 3x3 chunk grid, reducing memory by 90%+
 * Full rendering for small worlds (<20k tiles) provides simpler, faster code path
 * 
 * CHUNKED RENDERING ALGORITHM:
 * - World divided into 32x32 tile chunks for efficient loading/unloading
 * - Player viewport tracks 3x3 chunk grid around current position
 * - Chunks loaded on-demand, unloaded when outside view distance
 * - Cliff autotiling works seamlessly across chunk boundaries
 * 
 * CRITICAL SEPARATION:
 * This class ONLY handles visual rendering - no game logic
 * SharedWorldGenerator provides authoritative world data (elevation, biomes, stairs)
 * CollisionMask generated from same data ensures client-server consistency
 */

import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';
import { DecorationManager } from '../tiles/DecorationManager.js';
import { createSeededRandom } from '../../utils/Random.js';
import { CliffAutotiler } from '../tiles/CliffAutotilerNew.js';
import { CollisionMask } from '../../../../shared/systems/CollisionMask.js';
import { SharedWorldGenerator } from '../../../../shared/systems/WorldGenerator.js';
import { ChunkedWorldRenderer } from './ChunkedWorldRenderer.js';

// Type definitions
interface WorldRendererOptions {
    width?: number;
    height?: number;
    tileSize?: number;
    tilesets?: any; // TilesetManager type
    seed?: number;
}

interface WorldData {
    elevationData: number[][];
    biomeData: number[][];
    stairsData: (any | null)[][];
}

interface RenderOptions {
    useChunkedRendering?: boolean;
}

interface PlateauPoint {
    x: number;
    y: number;
}

declare global {
    interface Window {
        toggleCollisionDebug?: () => string;
    }
}

export class ClientWorldRenderer {
    width: number;
    height: number;
    tileSize: number;
    tilesets: any; // TilesetManager
    seed: number;
    container: PIXI.Container;
    tiles: Tile[][];
    cliffAutotiler: CliffAutotiler;
    
    // World data (will be set by render method)
    elevationData: number[][] | null;
    biomeData: number[][] | null;
    stairsData: (any | null)[][] | null;
    sharedWorldGen: SharedWorldGenerator | null;
    
    // Collision and rendering
    collisionMask: CollisionMask;
    isChunkedMode?: boolean;
    chunkedRenderer?: ChunkedWorldRenderer;
    debugContainer?: PIXI.Container;
    
    // Noise generation
    private random: () => number;
    private noise2D: ReturnType<typeof createNoise2D>;

    constructor(options: WorldRendererOptions = {}) {
        this.width = options.width || 100;
        this.height = options.height || 100;
        this.tileSize = options.tileSize || 64;
        this.tilesets = options.tilesets;
        this.seed = options.seed || 1;
        this.container = new PIXI.Container();
        this.tiles = [];
        this.cliffAutotiler = new CliffAutotiler(this.tilesets);
        
        // World data (will be set by render method)
        this.elevationData = null;
        this.biomeData = null;
        this.stairsData = null;
        this.sharedWorldGen = null;
        
        // Initialize collision mask for debug visualization
        this.collisionMask = new CollisionMask(this.width, this.height, this.tileSize);
        
        // Initialize noise functions
        this.random = createSeededRandom(this.seed);
        this.noise2D = createNoise2D(this.random);
        
        console.log('[ClientWorldRenderer] Initialized for rendering only');
    }

    /**
     * Render world visuals from provided world data
     */
    render(worldData: WorldData, sharedWorldGen: SharedWorldGenerator, options: RenderOptions = {}): PIXI.Container {
        console.log('[ClientWorldRenderer] Rendering world visuals from provided data');
        
        // Store world data for rendering
        this.elevationData = worldData.elevationData;
        this.biomeData = worldData.biomeData;
        this.stairsData = worldData.stairsData;
        this.sharedWorldGen = sharedWorldGen;
        
        console.log('[ClientWorldRenderer] World data received - biomes:', this.biomeData.length, 'rows');
        
        // Generate collision mask from provided elevation data and stairs
        this.collisionMask.generateFromElevationData(this.elevationData, this.sharedWorldGen);
        console.log('[ClientWorldRenderer] Client collision mask generated from shared data');
        
        // Choose rendering method based on world size and options
        if (options.useChunkedRendering || this.shouldUseChunkedRendering()) {
            console.log('[ClientWorldRenderer] Using chunked rendering for large world optimization');
            this.setupChunkedRendering();
        } else {
            console.log('[ClientWorldRenderer] Using full world rendering');
            // Create world boundary
            this.createWorldBoundary();
            // Generate base terrain (all grass initially)
            this.generateBaseTerrain();
            // Create visual tiles using autotiler
            this.createTileSprites();
        }
        
        // Create debug overlay for collision boundaries
        this.createCollisionDebugOverlay();
        
        console.log('[ClientWorldRenderer] World rendering complete');
        return this.container;
    }
    
    /**
     * Determine if chunked rendering should be used based on world size
     */
    private shouldUseChunkedRendering(): boolean {
        const totalTiles = this.width * this.height;
        const CHUNKED_THRESHOLD = 20000; // Use chunked rendering for worlds larger than 20k tiles
        return totalTiles > CHUNKED_THRESHOLD;
    }
    
    /**
     * Setup chunked rendering system
     */
    private setupChunkedRendering(): void {
        this.isChunkedMode = true;
        
        // Create world boundary for large worlds
        this.createWorldBoundary();
        
        // Initialize chunked renderer
        this.chunkedRenderer = new ChunkedWorldRenderer(this);
        this.container.addChild(this.chunkedRenderer.container);
        
        console.log(`[ClientWorldRenderer] Chunked rendering enabled for ${this.width}x${this.height} world`);
        
        // Don't load chunks yet - wait for player position to be set
        // This avoids trying to render before everything is initialized
        console.log(`[ClientWorldRenderer] Chunked renderer ready - waiting for player position`);
    }
    
    /**
     * Update chunked rendering based on player position
     */
    updatePlayerPosition(playerX: number, playerY: number): void {
        if (this.chunkedRenderer) {
            this.chunkedRenderer.updatePlayerPosition(playerX, playerY);
        }
    }
    
    /**
     * Get the appropriate texture for a tile at given coordinates
     * Used by ChunkedWorldRenderer for efficient rendering
     */
    getTileTexture(x: number, y: number): PIXI.Texture | null {
        // Safety check bounds
        if (!this.tilesets || x < 0 || y < 0 || x >= this.width || y >= this.height) {
            console.warn(`[ClientWorldRenderer] getTileTexture called with invalid params: x=${x}, y=${y}`);
            return null;
        }
        
        // Check if this position has stairs first
        if (this.stairsData && this.stairsData[y] && this.stairsData[y][x]) {
            const stairInfo = this.stairsData[y][x];
            // Use snow tileset for snow stairs, terrain tileset for grass stairs
            const tileset = stairInfo.isSnow ? this.tilesets.textures.snow : this.tilesets.textures.terrain;
            const stairTexture = tileset[stairInfo.tileY] && tileset[stairInfo.tileY][stairInfo.tileX];
            if (stairTexture) {
                return stairTexture;
            }
            console.warn(`[ClientWorldRenderer] Missing stair texture at (${stairInfo.tileY},${stairInfo.tileX}) in ${stairInfo.isSnow ? 'snow' : 'terrain'} tileset`);
        }
        
        // For all non-stair tiles, use the autotiler (it handles both cliff and biome transitions)
        const tileResult = (this.cliffAutotiler as any).getTileTexture(x, y, this.elevationData || [], null, this.biomeData || undefined);
        if (tileResult && tileResult.texture) {
            return tileResult.texture;
        }
        
        // Fallback to basic grass if something goes wrong
        return this.tilesets.basicGrassTile || PIXI.Texture.WHITE;
    }
    
    /**
     * Legacy generate method for compatibility - generates world data then renders
     * @deprecated Use render() method with pre-generated world data instead
     */
    generate(): PIXI.Container {
        console.warn('[ClientWorldRenderer] Using deprecated generate() method - consider using render() with shared data');
        
        // Generate world data (for compatibility)
        this.sharedWorldGen = new SharedWorldGenerator(this.width, this.height, this.seed);
        const worldData = this.sharedWorldGen.generateWorld();
        
        // Render using generated data
        return this.render(worldData, this.sharedWorldGen);
    }
    
    private createWorldBoundary(): void {
        const worldBackground = new PIXI.Graphics();
        worldBackground.beginFill(0x6ea260);
        worldBackground.drawRect(0, 0, this.width * this.tileSize, this.height * this.tileSize);
        worldBackground.endFill();
        this.container.addChildAt(worldBackground, 0);
    }
    
    private generateBaseTerrain(): void {
        // Initialize tiles array only (elevationData will be set by SharedWorldGenerator)
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                const tile = new Tile(x, y, 'grass', this.tilesets, this.tileSize);
                this.tiles[y][x] = tile;
            }
        }
    }
    
    private generateProperElevatedAreas(): void {
        if (!this.elevationData) return;
        
        // Generate plateau candidates using noise
        this.generatePlateauCandidates();
        
        // Expand candidates to ensure 3x3 minimum
        this.enforceMinimumPlateauSizes();
        
        // Remove any remaining problematic formations
        this.finalCleanup();
        
        // Count elevated tiles
        let elevatedCount = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.elevationData[y][x] > 0) elevatedCount++;
            }
        }
    }
    
    private generatePlateauCandidates(): void {
        if (!this.elevationData) return;
        
        // Create several noise-based plateau seeds
        const plateauCount = 4 + Math.floor(this.random() * 3);
        
        for (let i = 0; i < plateauCount; i++) {
            // Choose center point with buffer for 3x3 minimum
            const cx = 10 + Math.floor(this.random() * (this.width - 20));
            const cy = 10 + Math.floor(this.random() * (this.height - 20));
            const baseRadius = 6 + Math.floor(this.random() * 8); // Larger to ensure 3x3
            
            // Use noise to create organic shape, but with minimum size guarantee
            this.createNoisyPlateau(cx, cy, baseRadius);
        }
    }
    
    private createNoisyPlateau(centerX: number, centerY: number, radius: number): void {
        if (!this.elevationData) return;
        
        const noiseScale = 0.1;
        const threshold = 0.2;
        
        // Create the core 3x3 area first (guaranteed)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    this.elevationData[y][x] = 1;
                }
            }
        }
        
        // Then expand outward with noise
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    // Skip if already set by core 3x3
                    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
                    
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= radius) {
                        const distanceFactor = 1 - (distance / radius);
                        const noiseValue = this.noise2D(x * noiseScale, y * noiseScale);
                        const combined = distanceFactor + noiseValue * 0.3;
                        
                        if (combined > threshold) {
                            this.elevationData[y][x] = 1;
                        }
                    }
                }
            }
        }
    }
    
    private enforceMinimumPlateauSizes(): void {
        if (!this.elevationData) return;
        
        const visited: boolean[][] = [];
        for (let y = 0; y < this.height; y++) {
            visited[y] = new Array(this.width).fill(false);
        }
        
        // Find all connected plateau regions
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.elevationData[y][x] > 0 && !visited[y][x]) {
                    const plateau = this.floodFillPlateau(x, y, visited);
                    this.ensurePlateauMeetsMinimum(plateau);
                }
            }
        }
    }
    
    private floodFillPlateau(startX: number, startY: number, visited: boolean[][]): PlateauPoint[] {
        if (!this.elevationData) return [];
        
        const plateau: PlateauPoint[] = [];
        const queue: PlateauPoint[] = [{x: startX, y: startY}];
        visited[startY][startX] = true;
        
        while (queue.length > 0) {
            const {x, y} = queue.shift()!;
            plateau.push({x, y});
            
            // Check 4-connected neighbors
            const neighbors = [
                {x: x + 1, y: y},
                {x: x - 1, y: y},
                {x: x, y: y + 1},
                {x: x, y: y - 1}
            ];
            
            for (const {x: nx, y: ny} of neighbors) {
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    !visited[ny][nx] && this.elevationData[ny][nx] > 0) {
                    visited[ny][nx] = true;
                    queue.push({x: nx, y: ny});
                }
            }
        }
        
        return plateau;
    }
    
    private ensurePlateauMeetsMinimum(plateau: PlateauPoint[]): void {
        if (!this.elevationData || plateau.length === 0) return;
        
        // If plateau is already 9+ tiles, it's good
        if (plateau.length >= 9) return;
        
        // If too small, remove it
        if (plateau.length < 5) {
            for (const {x, y} of plateau) {
                this.elevationData[y][x] = 0;
            }
            return;
        }
        
        // Try to expand small plateaus to meet minimum
        this.expandSmallPlateau(plateau);
    }
    
    private expandSmallPlateau(plateau: PlateauPoint[]): void {
        if (!this.elevationData) return;
        
        // Calculate center of mass
        let centerX = 0, centerY = 0;
        for (const {x, y} of plateau) {
            centerX += x;
            centerY += y;
        }
        centerX = Math.round(centerX / plateau.length);
        centerY = Math.round(centerY / plateau.length);
        
        // Create 3x3 around center
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    this.elevationData[y][x] = 1;
                }
            }
        }
    }
    
    private finalCleanup(): void {
        if (!this.elevationData) return;
        
        // Remove single elevated tiles and thin connections
        let changed: boolean;
        do {
            changed = false;
            for (let y = 1; y < this.height - 1; y++) {
                for (let x = 1; x < this.width - 1; x++) {
                    if (this.elevationData[y][x] > 0) {
                        const neighbors = this.countElevatedNeighbors(x, y);
                        if (neighbors < 3) {
                            this.elevationData[y][x] = 0;
                            changed = true;
                        }
                    }
                }
            }
        } while (changed);
    }
    
    private countElevatedNeighbors(x: number, y: number): number {
        if (!this.elevationData) return 0;
        
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    this.elevationData[ny][nx] > 0) {
                    count++;
                }
            }
        }
        return count;
    }
    
    private createTileSprites(): void {
        if (!this.elevationData || !this.biomeData) return;
        
        const processedTiles: any[][] = [];
        for (let y = 0; y < this.height; y++) {
            processedTiles[y] = [];
        }
        
        // Process all tiles to apply cliff edges and grass variations
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                
                // Check if this position has stairs
                if (this.stairsData && this.stairsData[y] && this.stairsData[y][x]) {
                    const stairInfo = this.stairsData[y][x];
                    // Use snow tileset for snow stairs, terrain tileset for grass stairs
                    const tileset = stairInfo.isSnow ? this.tilesets.textures.snow : this.tilesets.textures.terrain;
                    const stairTexture = tileset[stairInfo.tileY] && tileset[stairInfo.tileY][stairInfo.tileX];
                    if (stairTexture) {
                        tile.baseSprite.texture = stairTexture;
                        processedTiles[y][x] = 'stairs';
                        continue;
                    }
                }
                
                // Normal tile processing - pass biome data to autotiler
                const tileResult = (this.cliffAutotiler as any).getTileTexture(x, y, this.elevationData || [], processedTiles, this.biomeData || undefined) as any;
                processedTiles[y][x] = tileResult.type;
                
                // Mark tile walkability based on collision mask
                tile.isCliffEdge = !this.collisionMask.isTileWalkable(x, y);
                
                // FOR ELEVATED TILES: Create base color fill first, then cliff tile on top
                if (this.elevationData[y][x] > 0) {
                    // Get the biome for this elevated tile
                    const cliffBiome = this.biomeData && this.biomeData[y] ? this.biomeData[y][x] : 0;
                    const isDarkGrassCliff = cliffBiome === 1;
                    const isSnowCliff = cliffBiome === 2;
                    
                    // Create base color fill (what shows through transparent areas)
                    let baseColor = 0x3e5b24; // Default green grass
                    if (isDarkGrassCliff) {
                        baseColor = 0x2a3a1c; // Dark grass
                    } else if (isSnowCliff) {
                        baseColor = 0xE0E8F0; // Light blue-white for snow
                    }
                    const colorFill = new PIXI.Graphics();
                    colorFill.beginFill(baseColor);
                    colorFill.drawRect(0, 0, this.tileSize, this.tileSize);
                    colorFill.endFill();
                    tile.container.addChild(colorFill);
                    
                    // Create cliff tile sprite on top
                    const cliffSprite = new PIXI.Sprite(tileResult.texture);
                    cliffSprite.position.set(0, 0);
                    cliffSprite.scale.set(this.tileSize / 32, this.tileSize / 32);
                    tile.sprite = cliffSprite; // Keep reference to main sprite
                    tile.container.addChild(cliffSprite);
                } else {
                    // Ground level tiles - single sprite as before
                    const sprite = new PIXI.Sprite(tileResult.texture);
                    sprite.position.set(0, 0);
                    sprite.scale.set(this.tileSize / 32, this.tileSize / 32);
                    tile.sprite = sprite;
                    tile.container.addChild(sprite);
                }
            }
        }
        
        // Add all tiles to container (in chunked mode, this is skipped)
        if (!this.isChunkedMode) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    this.container.addChild(this.tiles[y][x].container);
                }
            }
        }
        
        // Second pass: Add cliff extensions
        this.addCliffExtensions(processedTiles);
    }
    
    private isCliffTileWalkable(row: number, col: number): boolean {
        // Top edges and corners
        if (row === 0 && (col === 0 || col === 6 || (col >= 1 && col <= 5))) return true;
        
        // Side edges
        if ((row >= 1 && row <= 3) && (col === 0 || col === 6)) return true;
        
        // Bottom edges and corners
        if (row === 5 && (col >= 0 && col <= 6)) return true;
        
        // Diagonal connectors are not walkable edges
        if ((row === 2 && (col === 7 || col === 10)) || 
            (row === 4 && (col === 8 || col === 9))) return true;
        
        return false; // Interior grass tiles are walkable
    }

    // Helper methods for compatibility
    getTileType(x: number, y: number): string | null {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height || !this.tiles[y]) {
            return null;
        }
        return this.tiles[y][x]?.type || null;
    }
    
    getTileAt(x: number, y: number): Tile | null {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height || !this.tiles[y]) {
            return null;
        }
        return this.tiles[y][x] || null;
    }
    
    isTileWalkable(worldX: number, worldY: number): boolean {
        return this.collisionMask.isWalkable(worldX, worldY);
    }
    
    private addCliffExtensions(processedTiles: any[][]): void {
        if (!this.elevationData || !this.biomeData) return;
        
        let extensionCount = 0;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.elevationData[y][x] === 0) continue;
                
                const extensionTexture = (this.cliffAutotiler as any).getCliffExtensionTexture(x, y, this.elevationData, processedTiles, this.biomeData);
                
                if (extensionTexture && y + 1 < this.height) {
                    // Update the ground tile underneath to match the cliff's biome
                    const cliffBiome = this.biomeData && this.biomeData[y] ? this.biomeData[y][x] : 0;
                    const groundTile = this.tiles[y + 1][x];
                    
                    // Replace the ground tile sprite with the appropriate biome grass
                    if (groundTile && groundTile.sprite) {
                        const newGroundTexture = cliffBiome === 1 ? 
                            this.tilesets.getRandomPureDarkGrass() : 
                            this.tilesets.getRandomPureGrass();
                        
                        groundTile.sprite.texture = newGroundTexture;
                    }
                    
                    const extensionSprite = new PIXI.Sprite(extensionTexture);
                    extensionSprite.x = x * this.tileSize;
                    extensionSprite.y = (y + 1) * this.tileSize;
                    extensionSprite.scale.set(this.tileSize / 32, this.tileSize / 32);
                    
                    this.container.addChild(extensionSprite);
                    extensionCount++;
                }
            }
        }
    }
    
    private createCollisionDebugOverlay(): void {
        // Create debug container
        this.debugContainer = new PIXI.Container();
        this.debugContainer.visible = false; // Hidden by default
        this.debugContainer.zIndex = 1000; // On top of everything
        
        // Create red overlay for each unwalkable tile
        let debugTileCount = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.collisionMask.isTileWalkable(x, y)) {
                    const debugTile = this.createDebugTile(x, y);
                    this.debugContainer.addChild(debugTile);
                    debugTileCount++;
                }
            }
        }
        
        // Add debug container to world (so it moves with camera)
        this.container.addChild(this.debugContainer);
        
        // Expose global toggle function
        window.toggleCollisionDebug = () => {
            if (!this.debugContainer) return 'Debug container not initialized';
            this.debugContainer.visible = !this.debugContainer.visible;
            console.log(`Collision debug: ${this.debugContainer.visible ? 'ON' : 'OFF'}`);
            return this.debugContainer.visible ? 'Debug overlay enabled' : 'Debug overlay disabled';
        };
        
        console.log("Use toggleCollisionDebug() to show/hide collision boundaries");
    }
    
    private createDebugTile(tileX: number, tileY: number): PIXI.Graphics {
        const graphics = new PIXI.Graphics();
        
        // Semi-transparent red overlay
        graphics.beginFill(0xFF0000, 0.4);
        graphics.drawRect(0, 0, this.tileSize, this.tileSize);
        graphics.endFill();
        
        // Red border for clear definition
        graphics.lineStyle(2, 0xFF0000, 1.0);
        graphics.drawRect(0, 0, this.tileSize, this.tileSize);
        
        // Position at tile coordinates
        graphics.x = tileX * this.tileSize;
        graphics.y = tileY * this.tileSize;
        
        return graphics;
    }
}