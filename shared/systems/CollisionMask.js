/**
 * CollisionMask - Simple, robust collision detection system
 * 
 * Uses a 2D boolean array for fast collision checks.
 * Shared between client and server to ensure consistent physics.
 */
export class CollisionMask {
    constructor(width, height, tileSize = 64) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.mask = [];
        
        // Initialize mask as all walkable
        this.initializeMask();
    }
    
    initializeMask() {
        this.mask = [];
        for (let y = 0; y < this.height; y++) {
            this.mask[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.mask[y][x] = true; // true = walkable, false = solid
            }
        }
    }
    
    /**
     * Generate collision mask from elevation data
     * Simple rule: elevated areas and their edges are unwalkable
     */
    generateFromElevationData(elevationData) {
        console.log("[CollisionMask] Generating collision mask from elevation data...");
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Mark elevated tiles as unwalkable
                if (elevationData[y] && elevationData[y][x] > 0) {
                    this.mask[y][x] = false;
                    
                    // Mark tiles below elevated areas as unwalkable (bottom cliff edges are 2 tiles tall)
                    if (y + 1 < this.height) {
                        this.mask[y + 1][x] = false;
                        
                        // Check if this is a bottom edge (no elevated tile below the current one)
                        const hasElevatedBelow = (y + 1 < this.height) && elevationData[y + 1] && elevationData[y + 1][x] > 0;
                        if (!hasElevatedBelow && y + 2 < this.height) {
                            // Bottom cliff edges extend 2 tiles down, mark the second extension tile
                            this.mask[y + 2][x] = false;
                        }
                    }
                } else {
                    // All other tiles are walkable
                    this.mask[y][x] = true;
                }
            }
        }
        
        // Set world boundaries as unwalkable
        this.setWorldBoundaries();
        
        console.log("[CollisionMask] Collision mask generated successfully");
    }
    
    
    /**
     * Mark world boundaries as unwalkable
     */
    setWorldBoundaries() {
        // Top and bottom rows
        for (let x = 0; x < this.width; x++) {
            this.mask[0][x] = false;
            this.mask[this.height - 1][x] = false;
        }
        
        // Left and right columns  
        for (let y = 0; y < this.height; y++) {
            this.mask[y][0] = false;
            this.mask[y][this.width - 1] = false;
        }
    }
    
    /**
     * Check if a world position is walkable
     */
    isWalkable(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        return this.isTileWalkable(tileX, tileY);
    }
    
    /**
     * Check if a tile coordinate is walkable
     */
    isTileWalkable(tileX, tileY) {
        // Out of bounds is not walkable
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }
        
        return this.mask[tileY][tileX];
    }
    
    /**
     * Validate movement from one position to another
     * Checks entire path to prevent teleporting through walls
     * Enhanced to provide more solid collision detection
     */
    canMove(fromX, fromY, toX, toY) {
        // Add small buffer around player position for solid collision
        const buffer = 8; // Small buffer to prevent edge clipping
        
        // Check destination and area around destination
        if (!this.isWalkable(toX, toY) || 
            !this.isWalkable(toX + buffer, toY) ||
            !this.isWalkable(toX - buffer, toY) ||
            !this.isWalkable(toX, toY + buffer) ||
            !this.isWalkable(toX, toY - buffer)) {
            return false;
        }
        
        // For short movements, the above check is sufficient
        const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
        if (distance <= this.tileSize * 0.3) {
            return true;
        }
        
        // For longer movements, check path
        return this.isPathClear(fromX, fromY, toX, toY);
    }
    
    /**
     * Check if path between two points is clear
     * Uses simple line traversal to prevent teleporting
     */
    isPathClear(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check points along the path
        const steps = Math.ceil(distance / (this.tileSize * 0.25)); // Check every quarter tile
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const checkX = fromX + dx * t;
            const checkY = fromY + dy * t;
            
            if (!this.isWalkable(checkX, checkY)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Find nearest walkable position to a given point
     * Used for fallback when movement is blocked
     */
    findNearestWalkable(worldX, worldY, maxRadius = 128) {
        // Start with the exact position
        if (this.isWalkable(worldX, worldY)) {
            return { x: worldX, y: worldY };
        }
        
        // Search in expanding circles
        for (let radius = this.tileSize; radius <= maxRadius; radius += this.tileSize) {
            // Check 8 directions at this radius
            const directions = [
                { x: 0, y: -1 },   // North
                { x: 1, y: -1 },   // Northeast  
                { x: 1, y: 0 },    // East
                { x: 1, y: 1 },    // Southeast
                { x: 0, y: 1 },    // South
                { x: -1, y: 1 },   // Southwest
                { x: -1, y: 0 },   // West
                { x: -1, y: -1 }   // Northwest
            ];
            
            for (const dir of directions) {
                const testX = worldX + dir.x * radius;
                const testY = worldY + dir.y * radius;
                
                if (this.isWalkable(testX, testY)) {
                    return { x: testX, y: testY };
                }
            }
        }
        
        // Fallback: return center of world
        return { 
            x: (this.width * this.tileSize) / 2, 
            y: (this.height * this.tileSize) / 2 
        };
    }
    
    /**
     * Get collision mask data for serialization/network transfer
     */
    serialize() {
        return {
            width: this.width,
            height: this.height,
            tileSize: this.tileSize,
            mask: this.mask
        };
    }
    
    /**
     * Load collision mask from serialized data
     */
    deserialize(data) {
        this.width = data.width;
        this.height = data.height;
        this.tileSize = data.tileSize;
        this.mask = data.mask;
    }
    
    /**
     * Debug: Get walkability statistics
     */
    getStats() {
        let walkableCount = 0;
        let totalCount = this.width * this.height;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.mask[y][x]) {
                    walkableCount++;
                }
            }
        }
        
        return {
            totalTiles: totalCount,
            walkableTiles: walkableCount,
            solidTiles: totalCount - walkableCount,
            walkablePercent: (walkableCount / totalCount * 100).toFixed(1)
        };
    }
}