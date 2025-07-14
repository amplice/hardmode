/**
 * A* Tile-Based Pathfinding System
 * 
 * Solves the monster pathfinding issues by implementing proper tile-based navigation
 * that understands stair geometry and walkable tile sequences.
 */

import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';
import type { CollisionMask } from '../../shared/systems/CollisionMask.js';
import type { SharedWorldGenerator } from '../../shared/systems/WorldGenerator.js';

// Tile coordinate (different from world coordinates)
interface TileCoord {
    x: number;
    y: number;
}

// World coordinate 
interface WorldCoord {
    x: number;
    y: number;
}

// A* pathfinding node
interface AStarNode {
    tile: TileCoord;
    gCost: number;      // Distance from start
    hCost: number;      // Heuristic distance to goal  
    fCost: number;      // gCost + hCost
    parent: AStarNode | null;
    elevation: number;  // Elevation at this tile
}

// Pathfinding result
interface PathfindingResult {
    success: boolean;
    path: TileCoord[];
    worldPath: WorldCoord[];
}

export class AStarPathfinding {
    private collisionMask: CollisionMask;
    private worldGenerator: SharedWorldGenerator;
    private walkabilityGrid: boolean[][] = [];
    private elevationGrid: number[][] = [];
    private pathCache: Map<string, PathfindingResult>;
    private readonly TILE_SIZE: number;
    private readonly MAX_SEARCH_NODES = 1000; // Performance limit
    
    constructor(collisionMask: CollisionMask, worldGenerator: SharedWorldGenerator) {
        this.collisionMask = collisionMask;
        this.worldGenerator = worldGenerator;
        this.TILE_SIZE = GAME_CONSTANTS.WORLD.TILE_SIZE;
        this.pathCache = new Map();
        
        this.buildWalkabilityGrid();
        this.buildElevationGrid();
    }
    
    /**
     * Phase 1: Build walkability grid from collision mask
     */
    private buildWalkabilityGrid(): void {
        console.log('[AStarPathfinding] Building walkability grid...');
        
        const worldWidth = GAME_CONSTANTS.WORLD.WIDTH;
        const worldHeight = GAME_CONSTANTS.WORLD.HEIGHT;
        const tilesX = Math.ceil(worldWidth / this.TILE_SIZE);
        const tilesY = Math.ceil(worldHeight / this.TILE_SIZE);
        
        this.walkabilityGrid = [];
        
        for (let tileY = 0; tileY < tilesY; tileY++) {
            this.walkabilityGrid[tileY] = [];
            for (let tileX = 0; tileX < tilesX; tileX++) {
                // Convert tile coord to world coord (center of tile)
                const worldX = tileX * this.TILE_SIZE + this.TILE_SIZE / 2;
                const worldY = tileY * this.TILE_SIZE + this.TILE_SIZE / 2;
                
                // Check if this tile center is walkable
                const isWalkable = this.collisionMask.isWalkable(worldX, worldY);
                this.walkabilityGrid[tileY][tileX] = isWalkable;
            }
        }
        
        console.log(`[AStarPathfinding] Built ${tilesX}x${tilesY} walkability grid`);
    }
    
    /**
     * Phase 1: Build elevation grid for stair detection
     */
    private buildElevationGrid(): void {
        console.log('[AStarPathfinding] Building elevation grid...');
        
        const worldData = this.worldGenerator.generateWorld();
        const elevationData = worldData.elevationData;
        
        const tilesX = Math.ceil(GAME_CONSTANTS.WORLD.WIDTH / this.TILE_SIZE);
        const tilesY = Math.ceil(GAME_CONSTANTS.WORLD.HEIGHT / this.TILE_SIZE);
        
        this.elevationGrid = [];
        
        for (let tileY = 0; tileY < tilesY; tileY++) {
            this.elevationGrid[tileY] = [];
            for (let tileX = 0; tileX < tilesX; tileX++) {
                // Sample elevation at tile center
                const worldX = tileX * this.TILE_SIZE + this.TILE_SIZE / 2;
                const worldY = tileY * this.TILE_SIZE + this.TILE_SIZE / 2;
                
                // Convert world coords to elevation data indices
                const elevX = Math.floor(worldX / this.TILE_SIZE);
                const elevY = Math.floor(worldY / this.TILE_SIZE);
                
                if (elevY >= 0 && elevY < elevationData.length && 
                    elevX >= 0 && elevX < elevationData[0].length) {
                    this.elevationGrid[tileY][tileX] = elevationData[elevY][elevX];
                } else {
                    this.elevationGrid[tileY][tileX] = 0; // Default to ground level
                }
            }
        }
        
        console.log('[AStarPathfinding] Built elevation grid');
    }
    
    /**
     * Convert world coordinates to tile coordinates
     */
    worldToTile(worldX: number, worldY: number): TileCoord {
        return {
            x: Math.floor(worldX / this.TILE_SIZE),
            y: Math.floor(worldY / this.TILE_SIZE)
        };
    }
    
    /**
     * Convert tile coordinates to world coordinates (tile center)
     */
    tileToWorld(tileX: number, tileY: number): WorldCoord {
        return {
            x: tileX * this.TILE_SIZE + this.TILE_SIZE / 2,
            y: tileY * this.TILE_SIZE + this.TILE_SIZE / 2
        };
    }
    
    /**
     * Check if a tile is walkable
     */
    isTileWalkable(tileX: number, tileY: number): boolean {
        if (tileY < 0 || tileY >= this.walkabilityGrid.length ||
            tileX < 0 || tileX >= this.walkabilityGrid[0].length) {
            return false;
        }
        return this.walkabilityGrid[tileY][tileX];
    }
    
    /**
     * Get elevation at tile
     */
    getTileElevation(tileX: number, tileY: number): number {
        if (tileY < 0 || tileY >= this.elevationGrid.length ||
            tileX < 0 || tileX >= this.elevationGrid[0].length) {
            return 0;
        }
        return this.elevationGrid[tileY][tileX];
    }
    
    /**
     * Check if movement between two tiles is valid (including elevation rules)
     */
    canMoveBetweenTiles(fromTile: TileCoord, toTile: TileCoord): boolean {
        // Both tiles must be walkable
        if (!this.isTileWalkable(fromTile.x, fromTile.y) || 
            !this.isTileWalkable(toTile.x, toTile.y)) {
            return false;
        }
        
        const fromElevation = this.getTileElevation(fromTile.x, fromTile.y);
        const toElevation = this.getTileElevation(toTile.x, toTile.y);
        
        // Same elevation - always allowed
        if (fromElevation === toElevation) {
            return true;
        }
        
        // Different elevations - only allowed if there are stairs
        // For now, we'll be permissive and allow adjacent elevation changes
        // TODO: Add proper stair detection in Phase 3
        const elevationDiff = Math.abs(fromElevation - toElevation);
        return elevationDiff <= 1; // Only allow 1 level elevation changes for now
    }
    
    /**
     * Calculate heuristic distance (Manhattan distance)
     */
    private calculateHeuristic(from: TileCoord, to: TileCoord): number {
        return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
    }
    
    /**
     * Get neighboring tiles (8-directional movement)
     */
    private getNeighbors(tile: TileCoord): TileCoord[] {
        const neighbors: TileCoord[] = [];
        
        // 8 directions: N, NE, E, SE, S, SW, W, NW
        const directions = [
            { x: 0, y: -1 },  // North
            { x: 1, y: -1 },  // Northeast  
            { x: 1, y: 0 },   // East
            { x: 1, y: 1 },   // Southeast
            { x: 0, y: 1 },   // South
            { x: -1, y: 1 },  // Southwest
            { x: -1, y: 0 },  // West
            { x: -1, y: -1 }  // Northwest
        ];
        
        for (const dir of directions) {
            const neighbor = {
                x: tile.x + dir.x,
                y: tile.y + dir.y
            };
            
            if (this.canMoveBetweenTiles(tile, neighbor)) {
                neighbors.push(neighbor);
            }
        }
        
        return neighbors;
    }
    
    /**
     * Main A* pathfinding method - Phase 2 will implement this
     */
    findPath(startWorld: WorldCoord, goalWorld: WorldCoord): PathfindingResult {
        // TODO: Implement full A* algorithm in Phase 2
        // For now, return a simple direct path for testing
        
        const startTile = this.worldToTile(startWorld.x, startWorld.y);
        const goalTile = this.worldToTile(goalWorld.x, goalWorld.y);
        
        console.log(`[AStarPathfinding] Pathfinding from tile (${startTile.x}, ${startTile.y}) to (${goalTile.x}, ${goalTile.y})`);
        
        // Simple direct path for Phase 1 testing
        const tilePath = [startTile, goalTile];
        const worldPath = tilePath.map(tile => this.tileToWorld(tile.x, tile.y));
        
        return {
            success: true,
            path: tilePath,
            worldPath: worldPath
        };
    }
    
    /**
     * Clear path cache (call when world changes)
     */
    clearCache(): void {
        this.pathCache.clear();
    }
    
    /**
     * Debug: Get walkability info for a world position
     */
    debugWalkabilityAt(worldX: number, worldY: number): { walkable: boolean, elevation: number, tile: TileCoord } {
        const tile = this.worldToTile(worldX, worldY);
        return {
            walkable: this.isTileWalkable(tile.x, tile.y),
            elevation: this.getTileElevation(tile.x, tile.y),
            tile: tile
        };
    }
}