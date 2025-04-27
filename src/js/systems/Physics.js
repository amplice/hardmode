export class PhysicsSystem {
    constructor() {
        this.worldBounds = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
    }
    
    update(deltaTime, entities, world) {
        if (world) {
            // Update world bounds based on generated world
            this.worldBounds.width = world.width * world.tileSize;
            this.worldBounds.height = world.height * world.tileSize;
            
            entities.forEach(entity => {
                // Keep player within world bounds
                if (entity.position.x < this.worldBounds.x + 20) {
                    entity.position.x = this.worldBounds.x + 20;
                }
                if (entity.position.x > this.worldBounds.width - 20) {
                    entity.position.x = this.worldBounds.width - 20;
                }
                if (entity.position.y < this.worldBounds.y + 20) {
                    entity.position.y = this.worldBounds.y + 20;
                }
                if (entity.position.y > this.worldBounds.height - 20) {
                    entity.position.y = this.worldBounds.height - 20;
                }
                
// Check collision with non-walkable tiles
const tileSize = world.tileSize;
const characterRadius = 20; // Character collision radius

// Check if the player's position is inside a non-walkable tile
const centerTileX = Math.floor(entity.position.x / tileSize);
const centerTileY = Math.floor(entity.position.y / tileSize);

// Check surrounding tiles for collision
const checkRadius = 1; // Check 1 tile in each direction

for (let y = centerTileY - checkRadius; y <= centerTileY + checkRadius; y++) {
    for (let x = centerTileX - checkRadius; x <= centerTileX + checkRadius; x++) {
        if (y >= 0 && y < world.height && x >= 0 && x < world.width) {
            const tile = world.tiles[y][x];
            
            if (!tile.isWalkable()) {
                // Calculate distance to tile center
                const tileCenter = {
                    x: x * tileSize + tileSize / 2,
                    y: y * tileSize + tileSize / 2
                };
                
                const dx = entity.position.x - tileCenter.x;
                const dy = entity.position.y - tileCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Determine which direction the player is approaching from
                // Calculate buffer multiplier based on direction
                let bufferMultiplier = 0.85; // Default buffer
                
                // If approaching from north (player is above the tile)
                if (dy < 0 && Math.abs(dy) > Math.abs(dx)) {
                    bufferMultiplier = 1.1; // Larger buffer for northern approach
                }
                // If approaching from south (player is below the tile)
                else if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
                    bufferMultiplier = 0.5; // Smaller buffer for southern approach
                }
                
                // Simple collision: push player away if too close
                const minDistance = characterRadius + tileSize * bufferMultiplier;
                
                if (distance < minDistance) {
                    // Push player away along the collision normal
                    const pushFactor = (minDistance - distance) / minDistance;
                    
                    // Normalize direction vector
                    const length = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
                    const nx = dx / length;
                    const ny = dy / length;
                    
                    entity.position.x += nx * pushFactor * 50;
                    entity.position.y += ny * pushFactor * 50;
                }
            }
        }
    }
}
                
                // Update sprite position to match entity position
                if (entity.sprite) {
                    entity.sprite.position.set(entity.position.x, entity.position.y);
                }
            });
        } else {
            // Just basic screen boundary collision if no world is provided
            this.worldBounds.width = window.innerWidth;
            this.worldBounds.height = window.innerHeight;
            
            entities.forEach(entity => {
                // Keep player within screen bounds
                if (entity.position.x < this.worldBounds.x + 20) {
                    entity.position.x = this.worldBounds.x + 20;
                }
                if (entity.position.x > this.worldBounds.width - 20) {
                    entity.position.x = this.worldBounds.width - 20;
                }
                if (entity.position.y < this.worldBounds.y + 20) {
                    entity.position.y = this.worldBounds.y + 20;
                }
                if (entity.position.y > this.worldBounds.height - 20) {
                    entity.position.y = this.worldBounds.height - 20;
                }
                
                // Update sprite position to match entity position
                if (entity.sprite) {
                    entity.sprite.position.set(entity.position.x, entity.position.y);
                }
            });
        }
    }
}