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
    private worldData: any;
    private walkabilityGrid: boolean[][] = [];
    private elevationGrid: number[][] = [];
    private stairGrid: boolean[][] = [];
    private pathCache: Map<string, PathfindingResult>;
    private readonly TILE_SIZE: number;
    private readonly MAX_SEARCH_NODES = 1000; // Performance limit
    
    constructor(collisionMask: CollisionMask, worldGenerator: SharedWorldGenerator, worldData: any) {
        this.collisionMask = collisionMask;
        this.worldGenerator = worldGenerator;
        this.worldData = worldData;
        this.TILE_SIZE = GAME_CONSTANTS.WORLD.TILE_SIZE;
        this.pathCache = new Map();
        
        this.buildWalkabilityGrid();
        this.buildElevationGrid();
        this.buildStairGrid();
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
        
        let walkableCount = 0;
        let totalCount = 0;
        
        for (let tileY = 0; tileY < tilesY; tileY++) {
            this.walkabilityGrid[tileY] = [];
            for (let tileX = 0; tileX < tilesX; tileX++) {
                // Convert tile coord to world coord (center of tile)
                const worldX = tileX * this.TILE_SIZE + this.TILE_SIZE / 2;
                const worldY = tileY * this.TILE_SIZE + this.TILE_SIZE / 2;
                
                // Check if this tile center is walkable
                const isWalkable = this.collisionMask.isWalkable(worldX, worldY);
                this.walkabilityGrid[tileY][tileX] = isWalkable;
                
                if (isWalkable) walkableCount++;
                totalCount++;
                
                // Debug first few tiles
                if (tileY === 0 && tileX < 5) {
                    console.log(`[AStarPathfinding] Tile (${tileX}, ${tileY}) at world (${worldX}, ${worldY}) is ${isWalkable ? 'walkable' : 'NOT walkable'}`);
                }
            }
        }
        
        console.log(`[AStarPathfinding] Built ${tilesX}x${tilesY} walkability grid - ${walkableCount}/${totalCount} tiles walkable (${Math.round(walkableCount/totalCount*100)}%)`);
        
        // CRITICAL CHECK: If nothing is walkable, something is wrong!
        if (walkableCount === 0) {
            console.error('[AStarPathfinding] CRITICAL ERROR: No tiles are walkable! This will break all pathfinding.');
            console.error('[AStarPathfinding] Collision mask might not be initialized properly.');
        }
        
        // Debug: Print a small sample of the grid
        if (tilesX > 0 && tilesY > 0) {
            console.log('[AStarPathfinding] Sample grid (top-left 10x10):');
            for (let y = 0; y < Math.min(10, tilesY); y++) {
                let row = '';
                for (let x = 0; x < Math.min(10, tilesX); x++) {
                    row += this.walkabilityGrid[y][x] ? '.' : '#';
                }
                console.log(`  ${row}`);
            }
        }
    }
    
    /**
     * Phase 1: Build elevation grid for stair detection
     */
    private buildElevationGrid(): void {
        console.log('[AStarPathfinding] Building elevation grid...');
        
        // Use the pre-generated world data passed in constructor
        const elevationData = this.worldData.elevationData;
        
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
     * Build stair grid for enhanced stair navigation
     */
    private buildStairGrid(): void {
        console.log('[AStarPathfinding] Building stair grid...');
        
        const stairsData = this.worldGenerator.getStairsData();
        if (!stairsData) {
            console.warn('[AStarPathfinding] No stairs data available');
            return;
        }
        
        const tilesX = Math.ceil(GAME_CONSTANTS.WORLD.WIDTH / this.TILE_SIZE);
        const tilesY = Math.ceil(GAME_CONSTANTS.WORLD.HEIGHT / this.TILE_SIZE);
        
        this.stairGrid = [];
        let stairCount = 0;
        
        for (let tileY = 0; tileY < tilesY; tileY++) {
            this.stairGrid[tileY] = [];
            for (let tileX = 0; tileX < tilesX; tileX++) {
                // Check if this tile has stair data
                const hasStairs = tileY < stairsData.length && 
                                tileX < stairsData[0].length && 
                                stairsData[tileY][tileX] !== null &&
                                stairsData[tileY][tileX] !== undefined;
                
                this.stairGrid[tileY][tileX] = hasStairs;
                if (hasStairs) stairCount++;
            }
        }
        
        console.log(`[AStarPathfinding] Built stair grid with ${stairCount} stair tiles`);
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
            console.warn(`[AStarPathfinding] Tile (${tileX}, ${tileY}) out of bounds. Grid size: ${this.walkabilityGrid[0]?.length || 0}x${this.walkabilityGrid.length}`);
            return false;
        }
        const walkable = this.walkabilityGrid[tileY][tileX];
        if (!walkable && tileX % 10 === 0 && tileY % 10 === 0) { // Log every 10th tile to avoid spam
            console.log(`[AStarPathfinding] Tile (${tileX}, ${tileY}) is not walkable`);
        }
        return walkable;
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
     * Check if movement between two tiles is valid
     * SIMPLIFIED: Just check if both tiles are walkable
     */
    canMoveBetweenTiles(fromTile: TileCoord, toTile: TileCoord): boolean {
        // Both tiles must be walkable - that's it!
        return this.isTileWalkable(fromTile.x, fromTile.y) && 
               this.isTileWalkable(toTile.x, toTile.y);
    }
    
    /**
     * Check if a tile is a stair tile
     */
    private isStairTile(tileX: number, tileY: number): boolean {
        // Use cached stair grid for performance
        if (tileY >= 0 && tileY < this.stairGrid.length &&
            tileX >= 0 && tileX < this.stairGrid[0].length) {
            return this.stairGrid[tileY][tileX];
        }
        return false;
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
     * Main A* pathfinding method - Full implementation
     */
    findPath(startWorld: WorldCoord, goalWorld: WorldCoord): PathfindingResult {
        const startTile = this.worldToTile(startWorld.x, startWorld.y);
        const goalTile = this.worldToTile(goalWorld.x, goalWorld.y);
        
        // Check cache first
        const cacheKey = `${startTile.x},${startTile.y}->${goalTile.x},${goalTile.y}`;
        if (this.pathCache.has(cacheKey)) {
            const cached = this.pathCache.get(cacheKey)!;
            console.log(`[AStarPathfinding] Using cached path: ${cached.success ? 'SUCCESS' : 'FAILED'}`);
            return cached;
        }
        
        const startElevation = this.getTileElevation(startTile.x, startTile.y);
        const goalElevation = this.getTileElevation(goalTile.x, goalTile.y);
        
        console.log(`[AStarPathfinding] A* pathfinding from tile (${startTile.x}, ${startTile.y}) elev=${startElevation} to (${goalTile.x}, ${goalTile.y}) elev=${goalElevation}`);
        
        // Validate start and goal tiles
        if (!this.isTileWalkable(startTile.x, startTile.y)) {
            console.warn(`[AStarPathfinding] Start tile (${startTile.x}, ${startTile.y}) is not walkable`);
            const debugInfo = this.debugWalkabilityAt(startWorld.x, startWorld.y);
            console.warn(`[AStarPathfinding] Start debug: walkable=${debugInfo.walkable}, elevation=${debugInfo.elevation}, tile=(${debugInfo.tile.x},${debugInfo.tile.y})`);
            return { success: false, path: [], worldPath: [] };
        }
        
        if (!this.isTileWalkable(goalTile.x, goalTile.y)) {
            console.warn(`[AStarPathfinding] Goal tile (${goalTile.x}, ${goalTile.y}) is not walkable`);
            const debugInfo = this.debugWalkabilityAt(goalWorld.x, goalWorld.y);
            console.warn(`[AStarPathfinding] Goal debug: walkable=${debugInfo.walkable}, elevation=${debugInfo.elevation}, tile=(${debugInfo.tile.x},${debugInfo.tile.y})`);
            return { success: false, path: [], worldPath: [] };
        }
        
        // If start equals goal, return immediate success
        if (startTile.x === goalTile.x && startTile.y === goalTile.y) {
            const result = { success: true, path: [startTile], worldPath: [startWorld] };
            this.pathCache.set(cacheKey, result);
            return result;
        }
        
        // A* algorithm implementation
        const openList: AStarNode[] = [];
        const closedList: Set<string> = new Set();
        
        // Create start node
        const startNode: AStarNode = {
            tile: startTile,
            gCost: 0,
            hCost: this.calculateHeuristic(startTile, goalTile),
            fCost: 0,
            parent: null,
            elevation: this.getTileElevation(startTile.x, startTile.y)
        };
        startNode.fCost = startNode.gCost + startNode.hCost;
        
        openList.push(startNode);
        let nodesSearched = 0;
        
        while (openList.length > 0 && nodesSearched < this.MAX_SEARCH_NODES) {
            nodesSearched++;
            
            // Find node with lowest F cost
            let currentNode = openList[0];
            let currentIndex = 0;
            
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].fCost < currentNode.fCost || 
                    (openList[i].fCost === currentNode.fCost && openList[i].hCost < currentNode.hCost)) {
                    currentNode = openList[i];
                    currentIndex = i;
                }
            }
            
            // Remove current node from open list and add to closed list
            openList.splice(currentIndex, 1);
            const nodeKey = `${currentNode.tile.x},${currentNode.tile.y}`;
            closedList.add(nodeKey);
            
            // Check if we've reached the goal
            if (currentNode.tile.x === goalTile.x && currentNode.tile.y === goalTile.y) {
                // Reconstruct path
                const tilePath: TileCoord[] = [];
                let pathNode: AStarNode | null = currentNode;
                
                while (pathNode !== null) {
                    tilePath.unshift(pathNode.tile);
                    pathNode = pathNode.parent;
                }
                
                const worldPath = tilePath.map(tile => this.tileToWorld(tile.x, tile.y));
                
                console.log(`[AStarPathfinding] Path found! Length: ${tilePath.length} tiles, searched: ${nodesSearched} nodes`);
                
                const result = { success: true, path: tilePath, worldPath: worldPath };
                this.pathCache.set(cacheKey, result);
                return result;
            }
            
            // Explore neighbors
            const neighbors = this.getNeighbors(currentNode.tile);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                // Skip if already in closed list
                if (closedList.has(neighborKey)) {
                    continue;
                }
                
                // Calculate movement cost (diagonal movement costs more)
                const isDiagonal = Math.abs(neighbor.x - currentNode.tile.x) === 1 && 
                                 Math.abs(neighbor.y - currentNode.tile.y) === 1;
                const movementCost = isDiagonal ? 1.4 : 1.0; // Diagonal costs √2 ≈ 1.4
                
                const tentativeGCost = currentNode.gCost + movementCost;
                
                // Check if this path to neighbor is better
                let neighborNode = openList.find(node => 
                    node.tile.x === neighbor.x && node.tile.y === neighbor.y
                );
                
                if (!neighborNode) {
                    // Create new neighbor node
                    neighborNode = {
                        tile: neighbor,
                        gCost: tentativeGCost,
                        hCost: this.calculateHeuristic(neighbor, goalTile),
                        fCost: 0,
                        parent: currentNode,
                        elevation: this.getTileElevation(neighbor.x, neighbor.y)
                    };
                    neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
                    openList.push(neighborNode);
                } else if (tentativeGCost < neighborNode.gCost) {
                    // Update existing neighbor with better path
                    neighborNode.gCost = tentativeGCost;
                    neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
                    neighborNode.parent = currentNode;
                }
            }
        }
        
        // No path found
        console.warn(`[AStarPathfinding] No path found after searching ${nodesSearched} nodes`);
        const result = { success: false, path: [], worldPath: [] };
        this.pathCache.set(cacheKey, result);
        return result;
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