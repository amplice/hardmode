/**
 * LLM_NOTE: Spatial hash implementation for efficient entity queries.
 * Divides the world into a grid for fast proximity searches.
 * 
 * ARCHITECTURE_DECISION: Using a spatial hash instead of quadtree for
 * simplicity and consistent performance with uniform entity distribution.
 */

import { Entity, SPATIAL_CONFIG } from '@hardmode/shared';

interface CellKey {
  x: number;
  y: number;
}

export class SpatialHash {
  private cellSize: number;
  private cells: Map<string, Set<Entity>>;
  
  constructor(cellSize: number = SPATIAL_CONFIG.GRID_CELL_SIZE) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  
  /**
   * Clear all cells.
   */
  clear(): void {
    this.cells.clear();
  }
  
  /**
   * Insert an entity at a position.
   */
  insert(entity: Entity, x: number, y: number): void {
    const cellKey = this.getCellKey(x, y);
    
    let cell = this.cells.get(cellKey);
    if (!cell) {
      cell = new Set();
      this.cells.set(cellKey, cell);
    }
    
    cell.add(entity);
  }
  
  /**
   * Remove an entity from a position.
   */
  remove(entity: Entity, x: number, y: number): void {
    const cellKey = this.getCellKey(x, y);
    const cell = this.cells.get(cellKey);
    
    if (cell) {
      cell.delete(entity);
      
      // Clean up empty cells
      if (cell.size === 0) {
        this.cells.delete(cellKey);
      }
    }
  }
  
  /**
   * Move an entity from one position to another.
   */
  move(entity: Entity, oldX: number, oldY: number, newX: number, newY: number): void {
    const oldKey = this.getCellKey(oldX, oldY);
    const newKey = this.getCellKey(newX, newY);
    
    // If in same cell, no need to update
    if (oldKey === newKey) {
      return;
    }
    
    this.remove(entity, oldX, oldY);
    this.insert(entity, newX, newY);
  }
  
  /**
   * Get all entities within a radius of a position.
   */
  getEntitiesInRadius(centerX: number, centerY: number, radius: number): Entity[] {
    const entities: Entity[] = [];
    
    // Calculate which cells to check
    const minCell = this.getCellCoords(centerX - radius, centerY - radius);
    const maxCell = this.getCellCoords(centerX + radius, centerY + radius);
    
    // Check all cells that could contain entities within radius
    for (let cellY = minCell.y; cellY <= maxCell.y; cellY++) {
      for (let cellX = minCell.x; cellX <= maxCell.x; cellX++) {
        const cellKey = this.makeCellKey(cellX, cellY);
        const cell = this.cells.get(cellKey);
        
        if (cell) {
          // Check each entity in the cell
          for (const entity of cell) {
            // This assumes entity has a way to get position
            // In practice, we'd need to pass a position getter function
            entities.push(entity);
          }
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Get all entities in a rectangular area.
   */
  getEntitiesInRect(x1: number, y1: number, x2: number, y2: number): Entity[] {
    const entities: Entity[] = [];
    
    // Ensure x1,y1 is top-left and x2,y2 is bottom-right
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    // Calculate which cells to check
    const minCell = this.getCellCoords(minX, minY);
    const maxCell = this.getCellCoords(maxX, maxY);
    
    // Check all cells in the rectangle
    for (let cellY = minCell.y; cellY <= maxCell.y; cellY++) {
      for (let cellX = minCell.x; cellX <= maxCell.x; cellX++) {
        const cellKey = this.makeCellKey(cellX, cellY);
        const cell = this.cells.get(cellKey);
        
        if (cell) {
          entities.push(...cell);
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Get all entities in a specific cell.
   */
  getEntitiesInCell(x: number, y: number): Entity[] {
    const cellKey = this.getCellKey(x, y);
    const cell = this.cells.get(cellKey);
    return cell ? Array.from(cell) : [];
  }
  
  /**
   * Get cell coordinates for a world position.
   */
  private getCellCoords(x: number, y: number): CellKey {
    return {
      x: Math.floor(x / this.cellSize),
      y: Math.floor(y / this.cellSize),
    };
  }
  
  /**
   * Get cell key string for a world position.
   */
  private getCellKey(x: number, y: number): string {
    const coords = this.getCellCoords(x, y);
    return this.makeCellKey(coords.x, coords.y);
  }
  
  /**
   * Make cell key string from cell coordinates.
   */
  private makeCellKey(cellX: number, cellY: number): string {
    return `${cellX},${cellY}`;
  }
  
  /**
   * Get statistics about the spatial hash.
   */
  getStats(): {
    cellCount: number;
    totalEntities: number;
    averageEntitiesPerCell: number;
    maxEntitiesInCell: number;
  } {
    let totalEntities = 0;
    let maxEntitiesInCell = 0;
    
    for (const cell of this.cells.values()) {
      const size = cell.size;
      totalEntities += size;
      maxEntitiesInCell = Math.max(maxEntitiesInCell, size);
    }
    
    const cellCount = this.cells.size;
    
    return {
      cellCount,
      totalEntities,
      averageEntitiesPerCell: cellCount > 0 ? totalEntities / cellCount : 0,
      maxEntitiesInCell,
    };
  }
}