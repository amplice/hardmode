/**
 * @fileoverview WorldGenerator - Client-side world generation and terrain rendering
 * 
 * MIGRATION NOTES:
 * - Converted from WorldGenerator.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Final Round
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for world generation
 * - Updated imports to use TypeScript versions (CliffAutotilerNew instead of CliffAutotiler)
 * - Preserved all terrain generation algorithms and cliff autotiling logic
 * 
 * ARCHITECTURE ROLE:
 * - Generates 2D tile-based world with elevation data
 * - Creates organic plateau formations using noise generation
 * - Applies sophisticated cliff autotiling for seamless terrain
 * - Manages tile sprites and cliff extensions for visual depth
 * 
 * GENERATION PIPELINE:
 * 1. Generate base terrain (grass tiles)
 * 2. Create elevated areas using simplex noise
 * 3. Apply terrain cleanup (hole filling, minimum formations)
 * 4. Generate tile sprites with bitmasking
 * 5. Add cliff extensions for 2-tile height effect
 * 
 * TERRAIN RULES:
 * - Minimum 3x3 plateau formations
 * - No single jutting tiles
 * - Organic shapes using noise-based generation
 * - Smooth cliff transitions with autotiling
 */

import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';
import { DecorationManager } from '../tiles/DecorationManager.js';
import { createSeededRandom } from '../../utils/Random.js';
import { CliffAutotiler } from '../tiles/CliffAutotilerNew.js';

// Type definitions
interface WorldGeneratorOptions {
    width?: number;
    height?: number;
    tileSize?: number;
    tilesets?: TilesetInterface;
    seed?: number;
}

interface TilesetInterface {
    getFullGrassTile(): PIXI.Texture;
    getFullSandTile(): PIXI.Texture;
    getFullWaterTile(): PIXI.Texture;
    getGrassTransition?(position: string): PIXI.Texture | null;
    getInnerCornerMatch?(matchType: string): PIXI.Texture | null;
    getWaterInnerCornerMatch?(overlayType: string): PIXI.Texture | null;
    getWaterEdgeTile?(overlayType: string): PIXI.Texture | null;
    [key: string]: any;
}

interface PlateauTile {
    x: number;
    y: number;
}

interface TileResult {
    texture: PIXI.Texture | null;
    type: string;
}

export class WorldGenerator {
    // World dimensions and settings
    width: number;
    height: number;
    tileSize: number;
    tilesets: TilesetInterface;
    seed: number;
    
    // Generation utilities
    random: () => number;
    noise2D: (x: number, y: number) => number;
    
    // World data
    container: PIXI.Container;
    tiles: Tile[][];
    elevationData: number[][];
    cliffAutotiler: CliffAutotiler;

    constructor(options: WorldGeneratorOptions = {}) {
        this.width = options.width || 100;
        this.height = options.height || 100;
        this.tileSize = options.tileSize || 64; // Display size (scaled from 32x32)
        this.tilesets = options.tilesets!;
        this.seed = options.seed || 1;
        this.random = createSeededRandom(this.seed);
        this.noise2D = createNoise2D(this.random);
        this.container = new PIXI.Container();
        this.tiles = [];
        this.elevationData = []; // Track elevated areas
        this.cliffAutotiler = new CliffAutotiler(this.tilesets as any);
    }

    generate(): PIXI.Container {
        console.log("Generating world with new MainLev2.0 tileset...");
        
        // Create world boundary
        this.createWorldBoundary();
        
        // Generate base terrain
        this.generateBaseTerrain();
        
        // Generate some elevated areas
        this.generateElevatedAreas();
        
        // Create visual tiles
        this.createTileSprites();
        
        // Note: This file is not used - decorations are implemented in ClientWorldRenderer.ts
        // The SharedWorldGenerator handles decoration generation and ClientWorldRenderer renders them
        
        console.log("World generation complete!");
        return this.container;
    }
    
    private createWorldBoundary(): void {
        const worldBackground = new PIXI.Graphics();
        worldBackground.beginFill(0x6ea260);
        worldBackground.drawRect(0, 0, this.width * this.tileSize, this.height * this.tileSize);
        worldBackground.endFill();
        this.container.addChildAt(worldBackground, 0);
    }
    
    private generateBaseTerrain(): void {
        console.log("Generating base terrain...");
        
        // Initialize arrays
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            this.elevationData[y] = [];
            for (let x = 0; x < this.width; x++) {
                // For now, just create grass tiles
                const tile = new Tile(x, y, 'grass', this.tilesets, this.tileSize);
                this.tiles[y][x] = tile;
                this.elevationData[y][x] = 0; // Flat terrain by default
            }
        }
    }
    
    private generateElevatedAreas(): void {
        console.log("Generating elevated areas...");
        
        // Create organic elevated areas using noise
        this.generateOrganicPlateaus();
        
        // Apply multiple passes of terrain cleanup
        this.fillPlateauHoles();
        this.removeSmallPlateaus();
        this.enforceMinimumFormations();
        this.smoothElevation();
        
        // Final pass to ensure no issues remain
        this.finalCleanupPass();
        
        // Count elevated tiles for debugging
        let elevatedCount = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.elevationData[y][x] > 0) elevatedCount++;
            }
        }
        console.log(`[DEBUG] Total elevated tiles: ${elevatedCount}`);
    }
    
    private generateOrganicPlateaus(): void {
        console.log("Generating organic plateaus using noise...");
        
        // Create several blob-like elevated areas
        const plateauCount = 3 + Math.floor(this.random() * 4);
        
        for (let i = 0; i < plateauCount; i++) {
            // Random center and size for each plateau
            const cx = 15 + Math.floor(this.random() * (this.width - 30));
            const cy = 15 + Math.floor(this.random() * (this.height - 30));
            const baseRadius = 5 + Math.floor(this.random() * 10);
            const noiseScale = 0.1 + this.random() * 0.2;
            const threshold = 0.3 + this.random() * 0.3;
            
            console.log(`[DEBUG] Organic plateau ${i}: center (${cx}, ${cy}), radius ${baseRadius}`);
            
            // Use noise to create organic shapes
            for (let y = cy - baseRadius * 2; y <= cy + baseRadius * 2; y++) {
                for (let x = cx - baseRadius * 2; x <= cx + baseRadius * 2; x++) {
                    if (x >= 5 && x < this.width - 5 && y >= 5 && y < this.height - 6) {
                        const dx = x - cx;
                        const dy = y - cy;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Combine distance falloff with noise for organic edges
                        const distanceFactor = 1 - (distance / (baseRadius * 1.5));
                        const noiseValue = this.noise2D(x * noiseScale, y * noiseScale);
                        const combined = distanceFactor + noiseValue * 0.5;
                        
                        if (combined > threshold) {
                            this.elevationData[y][x] = 1;
                        }
                    }
                }
            }
        }
        
        // Add some smaller elevated features
        const featureCount = 5 + Math.floor(this.random() * 10);
        for (let i = 0; i < featureCount; i++) {
            const x = 10 + Math.floor(this.random() * (this.width - 20));
            const y = 10 + Math.floor(this.random() * (this.height - 20));
            const size = 2 + Math.floor(this.random() * 4);
            
            // Small noise-based features
            for (let dy = -size; dy <= size; dy++) {
                for (let dx = -size; dx <= size; dx++) {
                    const px = x + dx;
                    const py = y + dy;
                    if (px >= 5 && px < this.width - 5 && py >= 5 && py < this.height - 6) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= size) {
                            const noise = this.noise2D(px * 0.3, py * 0.3);
                            if (noise > 0.1 - (dist / size) * 0.3) {
                                this.elevationData[py][px] = 1;
                            }
                        }
                    }
                }
            }
        }
        
        // Smooth the elevation data to create more natural transitions
        this.smoothElevation();
    }
    
    private smoothElevation(): void {
        // Apply a smoothing pass to create more natural cliff lines
        const newElevation: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            newElevation[y] = [...this.elevationData[y]];
        }
        
        for (let y = 6; y < this.height - 6; y++) {
            for (let x = 6; x < this.width - 6; x++) {
                let elevatedNeighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (this.elevationData[y + dy][x + dx] === 1) {
                            elevatedNeighbors++;
                        }
                    }
                }
                
                // Smooth based on neighbor count
                if (elevatedNeighbors >= 6) {
                    newElevation[y][x] = 1;
                } else if (elevatedNeighbors <= 3) {
                    newElevation[y][x] = 0;
                }
            }
        }
        
        this.elevationData = newElevation;
    }
    
    private enforceMinimumFormations(): void {
        console.log("Enforcing 3-tile minimum cliff formation rules...");
        
        let removedCount = 0;
        let expandedCount = 0;
        
        // Create a copy to modify
        const newElevation: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            newElevation[y] = [...this.elevationData[y]];
        }
        
        // Multiple passes to remove problematic formations
        for (let pass = 0; pass < 3; pass++) {
            for (let y = 2; y < this.height - 2; y++) {
                for (let x = 2; x < this.width - 2; x++) {
                    if (newElevation[y][x] === 1) {
                        // Check if this tile is part of a formation that's too narrow
                        if (this.isPartOfNarrowFormation(x, y, newElevation)) {
                            // Try to expand to meet 3-tile minimum
                            if (this.canExpandToThreeTiles(x, y, newElevation)) {
                                this.expandToThreeTiles(x, y, newElevation);
                                expandedCount++;
                            } else {
                                // Remove if can't expand
                                newElevation[y][x] = 0;
                                removedCount++;
                            }
                        }
                    }
                }
            }
        }
        
        this.elevationData = newElevation;
        console.log(`[DEBUG] 3-tile formation enforcement: removed ${removedCount}, expanded ${expandedCount} tiles`);
    }
    
    private isSingleJuttingTile(x: number, y: number): boolean {
        // Check if this tile is jutting out alone from a formation
        const current = this.elevationData[y][x];
        if (current === 0) return false;
        
        // Get neighbors
        const n = this.getElevationSafe(x, y - 1);
        const s = this.getElevationSafe(x, y + 1);
        const e = this.getElevationSafe(x + 1, y);
        const w = this.getElevationSafe(x - 1, y);
        const ne = this.getElevationSafe(x + 1, y - 1);
        const nw = this.getElevationSafe(x - 1, y - 1);
        const se = this.getElevationSafe(x + 1, y + 1);
        const sw = this.getElevationSafe(x - 1, y + 1);
        
        // Count elevated neighbors in different directions
        const northConnections = (n > 0 ? 1 : 0) + (ne > 0 ? 1 : 0) + (nw > 0 ? 1 : 0);
        const southConnections = (s > 0 ? 1 : 0) + (se > 0 ? 1 : 0) + (sw > 0 ? 1 : 0);
        const eastConnections = (e > 0 ? 1 : 0) + (ne > 0 ? 1 : 0) + (se > 0 ? 1 : 0);
        const westConnections = (w > 0 ? 1 : 0) + (nw > 0 ? 1 : 0) + (sw > 0 ? 1 : 0);
        
        // Check for single jutting patterns
        // Single tile jutting north
        if (northConnections === 0 && (southConnections > 0 || eastConnections > 0 || westConnections > 0)) {
            return true;
        }
        // Single tile jutting south  
        if (southConnections === 0 && (northConnections > 0 || eastConnections > 0 || westConnections > 0)) {
            return true;
        }
        // Single tile jutting east
        if (eastConnections === 0 && (northConnections > 0 || southConnections > 0 || westConnections > 0)) {
            return true;
        }
        // Single tile jutting west
        if (westConnections === 0 && (northConnections > 0 || southConnections > 0 || eastConnections > 0)) {
            return true;
        }
        
        // Check for tiles that are part of formations that are too small
        // If only connected in one cardinal direction and it's a single connection
        const cardinalConnections = (n > 0 ? 1 : 0) + (s > 0 ? 1 : 0) + (e > 0 ? 1 : 0) + (w > 0 ? 1 : 0);
        if (cardinalConnections === 1) {
            // This is likely a single jutting tile
            return true;
        }
        
        return false;
    }
    
    private canExpandFormation(x: number, y: number, elevationData: number[][]): boolean {
        // Check if we can expand this formation to meet minimum requirements
        // For now, be conservative and only expand if there's clear space
        
        // Get neighbors to see which direction to expand
        const n = this.getElevationSafe(x, y - 1);
        const s = this.getElevationSafe(x, y + 1);
        const e = this.getElevationSafe(x + 1, y);
        const w = this.getElevationSafe(x - 1, y);
        
        // If jutting north, try to expand it horizontally
        if (n === 0 && (s > 0 || e > 0 || w > 0)) {
            if (x > 1 && x < this.width - 2) {
                const leftClear = this.getElevationSafe(x - 1, y) === 0;
                const rightClear = this.getElevationSafe(x + 1, y) === 0;
                if (leftClear || rightClear) return true;
            }
        }
        
        // If jutting south, try to expand it horizontally
        if (s === 0 && (n > 0 || e > 0 || w > 0)) {
            if (x > 1 && x < this.width - 2) {
                const leftClear = this.getElevationSafe(x - 1, y) === 0;
                const rightClear = this.getElevationSafe(x + 1, y) === 0;
                if (leftClear || rightClear) return true;
            }
        }
        
        // If jutting east or west, try to expand vertically
        if ((e === 0 || w === 0) && (n > 0 || s > 0)) {
            if (y > 1 && y < this.height - 2) {
                const upClear = this.getElevationSafe(x, y - 1) === 0;
                const downClear = this.getElevationSafe(x, y + 1) === 0;
                if (upClear || downClear) return true;
            }
        }
        
        return false;
    }
    
    private expandFormation(x: number, y: number, elevationData: number[][]): void {
        // Expand the formation to meet minimum requirements
        // Get neighbors to determine expansion direction
        const n = this.getElevationSafe(x, y - 1);
        const s = this.getElevationSafe(x, y + 1);
        const e = this.getElevationSafe(x + 1, y);
        const w = this.getElevationSafe(x - 1, y);
        
        // If jutting north or south, expand horizontally
        if ((n === 0 || s === 0) && x > 1 && x < this.width - 2) {
            if (this.getElevationSafe(x + 1, y) === 0) {
                elevationData[y][x + 1] = 1;
            } else if (this.getElevationSafe(x - 1, y) === 0) {
                elevationData[y][x - 1] = 1;
            }
        }
        
        // If jutting east or west, expand vertically
        if ((e === 0 || w === 0) && y > 1 && y < this.height - 2) {
            if (this.getElevationSafe(x, y + 1) === 0) {
                elevationData[y + 1][x] = 1;
            } else if (this.getElevationSafe(x, y - 1) === 0) {
                elevationData[y - 1][x] = 1;
            }
        }
    }
    
    private getElevationSafe(x: number, y: number): number {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0; // Out of bounds is considered ground level
        }
        return this.elevationData[y][x];
    }
    
    private fillPlateauHoles(): void {
        console.log("Filling holes in plateaus...");
        
        let filledCount = 0;
        const newElevation: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            newElevation[y] = [...this.elevationData[y]];
        }
        
        // Look for holes (ground level tiles surrounded by elevated tiles)
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.elevationData[y][x] === 0) {
                    // Count elevated neighbors
                    let elevatedNeighbors = 0;
                    let totalNeighbors = 0;
                    
                    // Check 3x3 area around this tile
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            totalNeighbors++;
                            if (this.getElevationSafe(x + dx, y + dy) > 0) {
                                elevatedNeighbors++;
                            }
                        }
                    }
                    
                    // If surrounded by elevated tiles, fill the hole
                    if (elevatedNeighbors >= 6) {
                        newElevation[y][x] = 1;
                        filledCount++;
                    }
                }
            }
        }
        
        this.elevationData = newElevation;
        console.log(`[DEBUG] Filled ${filledCount} plateau holes`);
    }
    
    private removeSmallPlateaus(): void {
        console.log("Removing small plateaus...");
        
        let removedCount = 0;
        const visited: boolean[][] = [];
        const newElevation: number[][] = [];
        
        // Initialize arrays
        for (let y = 0; y < this.height; y++) {
            visited[y] = new Array(this.width).fill(false);
            newElevation[y] = [...this.elevationData[y]];
        }
        
        // Find all connected plateau regions
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.elevationData[y][x] > 0 && !visited[y][x]) {
                    // Found an unvisited elevated tile, flood fill to find the plateau
                    const plateau: PlateauTile[] = [];
                    const queue: PlateauTile[] = [{x, y}];
                    visited[y][x] = true;
                    
                    while (queue.length > 0) {
                        const {x: cx, y: cy} = queue.shift()!;
                        plateau.push({x: cx, y: cy});
                        
                        // Check 4-connected neighbors
                        const neighbors = [
                            {x: cx + 1, y: cy},
                            {x: cx - 1, y: cy},
                            {x: cx, y: cy + 1},
                            {x: cx, y: cy - 1}
                        ];
                        
                        for (const {x: nx, y: ny} of neighbors) {
                            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                                !visited[ny][nx] && this.elevationData[ny][nx] > 0) {
                                visited[ny][nx] = true;
                                queue.push({x: nx, y: ny});
                            }
                        }
                    }
                    
                    // Check if plateau meets minimum size and dimension requirements
                    const shouldRemove = this.shouldRemovePlateau(plateau);
                    
                    if (shouldRemove) {
                        for (const {x: px, y: py} of plateau) {
                            newElevation[py][px] = 0;
                            removedCount++;
                        }
                    }
                }
            }
        }
        
        this.elevationData = newElevation;
        console.log(`[DEBUG] Removed ${removedCount} tiles from small plateaus`);
    }
    
    private shouldRemovePlateau(plateau: PlateauTile[]): boolean {
        // Remove plateaus smaller than 9 tiles (3x3 minimum)
        if (plateau.length < 9) {
            return true;
        }
        
        // Check if plateau has minimum width and height of 3 tiles
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const {x, y} of plateau) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        
        // Remove if either dimension is less than 3
        if (width < 3 || height < 3) {
            return true;
        }
        
        return false;
    }
    
    private isPartOfNarrowFormation(x: number, y: number, elevationData: number[][]): boolean {
        // Check if this tile is part of a formation that's too narrow (less than 3 tiles in any direction)
        
        // Check horizontal runs
        let leftRun = 0, rightRun = 0;
        for (let dx = -1; dx >= -2 && this.getElevationSafeFromArray(x + dx, y, elevationData) > 0; dx--) leftRun++;
        for (let dx = 1; dx <= 2 && this.getElevationSafeFromArray(x + dx, y, elevationData) > 0; dx++) rightRun++;
        const horizontalRun = leftRun + 1 + rightRun;
        
        // Check vertical runs
        let upRun = 0, downRun = 0;
        for (let dy = -1; dy >= -2 && this.getElevationSafeFromArray(x, y + dy, elevationData) > 0; dy--) upRun++;
        for (let dy = 1; dy <= 2 && this.getElevationSafeFromArray(x, y + dy, elevationData) > 0; dy++) downRun++;
        const verticalRun = upRun + 1 + downRun;
        
        // If both horizontal and vertical runs are less than 3, this is problematic
        return horizontalRun < 3 && verticalRun < 3;
    }
    
    private canExpandToThreeTiles(x: number, y: number, elevationData: number[][]): boolean {
        // Check if we can expand this formation to meet 3-tile minimum
        const spaces = [
            {x: x - 1, y}, {x: x + 1, y},  // Horizontal
            {x, y: y - 1}, {x, y: y + 1}   // Vertical
        ];
        
        // Count available spaces for expansion
        let availableSpaces = 0;
        for (const space of spaces) {
            if (this.getElevationSafeFromArray(space.x, space.y, elevationData) === 0) {
                availableSpaces++;
            }
        }
        
        return availableSpaces >= 2; // Need at least 2 spaces to make a 3-tile formation
    }
    
    private expandToThreeTiles(x: number, y: number, elevationData: number[][]): void {
        // Expand the formation to meet 3-tile minimum
        const expansions = [
            {x: x - 1, y}, {x: x + 1, y},  // Horizontal
            {x, y: y - 1}, {x, y: y + 1}   // Vertical
        ];
        
        let expanded = 0;
        for (const expansion of expansions) {
            if (expanded < 2 && this.getElevationSafeFromArray(expansion.x, expansion.y, elevationData) === 0) {
                if (expansion.x >= 0 && expansion.x < this.width && 
                    expansion.y >= 0 && expansion.y < this.height) {
                    elevationData[expansion.y][expansion.x] = 1;
                    expanded++;
                }
            }
        }
    }
    
    private getElevationSafeFromArray(x: number, y: number, elevationArray: number[][]): number {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0;
        }
        return elevationArray[y][x];
    }
    
    private finalCleanupPass(): void {
        console.log("Running final cleanup pass...");
        
        let cleanedCount = 0;
        const newElevation: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            newElevation[y] = [...this.elevationData[y]];
        }
        
        // Remove any remaining formations that don't meet 3-tile minimum
        for (let y = 2; y < this.height - 2; y++) {
            for (let x = 2; x < this.width - 2; x++) {
                if (this.elevationData[y][x] === 1) {
                    // Check if this tile is part of a formation smaller than 3x3
                    if (this.isPartOfNarrowFormation(x, y, this.elevationData)) {
                        newElevation[y][x] = 0;
                        cleanedCount++;
                    }
                }
            }
        }
        
        this.elevationData = newElevation;
        console.log(`[DEBUG] Final cleanup removed ${cleanedCount} narrow formation tiles`);
    }
    
    private createTileSprites(): void {
        console.log("Creating tile sprites with bitmasking...");
        
        // Track processed tiles for diagonal pattern detection
        const processedTiles: string[][] = [];
        for (let y = 0; y < this.height; y++) {
            processedTiles[y] = [];
        }
        
        // First pass: Create base terrain sprites using bitmasking
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                
                // Use CliffAutotiler to determine the correct texture
                const tileResult = this.cliffAutotiler.getTileTexture(x, y, this.elevationData, processedTiles);
                processedTiles[y][x] = tileResult.type;
                
                const sprite = new PIXI.Sprite(tileResult.texture || PIXI.Texture.WHITE);
                sprite.position.set(0, 0); // Position at (0,0) within the tile container
                sprite.scale.set(this.tileSize / 32, this.tileSize / 32); // Scale from 32x32 to display size
                tile.sprite = sprite;
                tile.container.addChild(sprite);
                
                this.container.addChild(tile.container);
            }
        }
        
        // Second pass: Add cliff extensions for 2-tile height effect
        this.addCliffExtensions(processedTiles);
    }
    
    private addCliffExtensions(processedTiles: string[][]): void {
        console.log("Adding cliff extensions using bitmasking...");
        
        let extensionCount = 0;
        
        // Add the second layer tiles for cliff height using CliffAutotiler
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const elevation = this.elevationData[y][x];
                if (elevation === 0) continue;
                
                // Use CliffAutotiler to determine if we need an extension
                const extensionTexture = this.cliffAutotiler.getCliffExtensionTexture(x, y, this.elevationData, processedTiles) || null;
                
                if (extensionTexture && y + 1 < this.height) {
                    const extensionSprite = new PIXI.Sprite(extensionTexture);
                    extensionSprite.x = x * this.tileSize;
                    extensionSprite.y = (y + 1) * this.tileSize;
                    extensionSprite.scale.set(this.tileSize / 32, this.tileSize / 32);
                    
                    // Remove debug tint now that extensions are working
                    // extensionSprite.tint = 0xffcccc;
                    
                    // Add to the world container, not at index 0
                    this.container.addChild(extensionSprite);
                    extensionCount++;
                    
                    // Check if the texture is valid
                    if (!extensionTexture.valid) {
                        console.error(`[ERROR] Invalid texture for extension at (${x}, ${y+1})`);
                    }
                }
            }
        }
        
        console.log(`[DEBUG] Total cliff extensions added: ${extensionCount}`);
    }
    
    // Helper methods
    private isFarEnoughFromSand(x: number, y: number, distance: number): boolean {
        for (let dy = -distance; dy <= distance; dy++) {
            for (let dx = -distance; dx <= distance; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    const tileType = this.getTileType(nx, ny);
                    
                    if ((tileType === 'sand' || tileType === 'transition') && 
                        Math.abs(dx) + Math.abs(dy) <= distance) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    getTileType(x: number, y: number): string | null {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.tiles[y][x].type;
    }
    
    getTileAt(x: number, y: number): Tile | null {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.tiles[y][x];
    }
    
    isTileWalkable(worldX: number, worldY: number): boolean {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        const tile = this.getTileAt(tileX, tileY);
        return tile ? tile.isWalkable() : false;
    }
}