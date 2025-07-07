// src/js/utils/Pathfinding.ts

/**
 * Pathfinding utilities for monster AI
 */

export interface Position {
    x: number;
    y: number;
}

export interface PathNode extends Position {
    path: Position[];
}

interface Tile {
    isWalkable(): boolean;
}

interface World {
    tileSize: number;
    width: number;
    height: number;
    tiles: Tile[][];
    isTileWalkable(x: number, y: number): boolean;
}

/**
 * Breadth-first search pathfinding algorithm
 * @param world - The world object containing tile information
 * @param start - Starting position in world coordinates
 * @param goal - Goal position in world coordinates
 * @param maxSteps - Maximum steps to search before giving up
 * @returns Array of positions forming the path, or null if no path found
 */
export function bfsPath(world: World, start: Position, goal: Position, maxSteps: number = 500): Position[] | null {
    const startTile = {
        x: Math.floor(start.x / world.tileSize),
        y: Math.floor(start.y / world.tileSize)
    };
    const goalTile = {
        x: Math.floor(goal.x / world.tileSize),
        y: Math.floor(goal.y / world.tileSize)
    };
    
    const queue: Array<{x: number; y: number; path: Position[]}> = [];
    const visited = new Set<string>();
    const key = (x: number, y: number): string => `${x},${y}`;
    
    queue.push({x: startTile.x, y: startTile.y, path: []});
    visited.add(key(startTile.x, startTile.y));
    
    const dirs = [
        {dx: 1, dy: 0}, {dx: -1, dy: 0}, {dx: 0, dy: 1}, {dx: 0, dy: -1}
    ];
    
    while (queue.length > 0) {
        const node = queue.shift()!;
        if (node.x === goalTile.x && node.y === goalTile.y) {
            return node.path;
        }
        
        for (const dir of dirs) {
            const nx = node.x + dir.dx;
            const ny = node.y + dir.dy;
            
            if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
            if (!world.tiles[ny][nx].isWalkable()) continue;
            
            const k = key(nx, ny);
            if (visited.has(k)) continue;
            
            visited.add(k);
            const newPath = node.path.concat({
                x: nx * world.tileSize + world.tileSize / 2,
                y: ny * world.tileSize + world.tileSize / 2
            });
            
            queue.push({x: nx, y: ny, path: newPath});
            
            if (visited.size > maxSteps) return null;
        }
    }
    
    return null;
}

/**
 * Check if there's a clear line of sight between two positions
 * @param world - The world object containing tile information
 * @param start - Starting position in world coordinates
 * @param goal - Goal position in world coordinates
 * @returns True if there's a clear line of sight, false otherwise
 */
export function hasLineOfSight(world: World, start: Position, goal: Position): boolean {
    const dx = goal.x - start.x;
    const dy = goal.y - start.y;
    const maxDist = Math.max(Math.abs(dx), Math.abs(dy));
    const step = world.tileSize / 2;
    const steps = Math.ceil(maxDist / step);
    
    for (let i = 1; i <= steps; i++) {
        const x = start.x + (dx * i) / steps;
        const y = start.y + (dy * i) / steps;
        if (!world.isTileWalkable(x, y)) {
            return false;
        }
    }
    
    return true;
}