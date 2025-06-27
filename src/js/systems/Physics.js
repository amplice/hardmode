export class PhysicsSystem {
    constructor() {
        this.worldBounds = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        this.collisionMask = null;
    }
    
    update(deltaTime, entities, world) {
        if (world) {
            // Get collision mask from world
            this.collisionMask = world.collisionMask;
            this.worldBounds.width = world.width * world.tileSize;
            this.worldBounds.height = world.height * world.tileSize;
            
            entities.forEach(entity => {
                // Handle collision-aware movement
                this.handleEntityMovement(entity);
                
                // Update sprite position to match entity position
                if (entity.sprite) {
                    entity.sprite.position.set(entity.position.x, entity.position.y);
                }
            });
        } else {
            // Fallback to basic screen boundary collision if no world is provided
            this.worldBounds.width = window.innerWidth;
            this.worldBounds.height = window.innerHeight;
            
            entities.forEach(entity => {
                // Basic boundary constraints
                entity.position.x = Math.max(20, Math.min(this.worldBounds.width - 20, entity.position.x));
                entity.position.y = Math.max(20, Math.min(this.worldBounds.height - 20, entity.position.y));
                
                // Update sprite position to match entity position
                if (entity.sprite) {
                    entity.sprite.position.set(entity.position.x, entity.position.y);
                }
            });
        }
    }

    /**
     * Handle entity movement with collision detection
     * Pre-validates movement to prevent entering solid areas
     */
    handleEntityMovement(entity) {
        if (!this.collisionMask || !entity.velocity) {
            return;
        }
        
        // Calculate intended new position
        const newX = entity.position.x + entity.velocity.x;
        const newY = entity.position.y + entity.velocity.y;
        
        // Check if movement is valid
        if (this.collisionMask.canMove(entity.position.x, entity.position.y, newX, newY)) {
            // Movement is valid, update position
            entity.position.x = newX;
            entity.position.y = newY;
        } else {
            // Movement blocked, try partial movement
            this.handleBlockedMovement(entity, newX, newY);
        }
        
        // Apply world boundaries as final constraint
        entity.position.x = Math.max(20, Math.min(this.worldBounds.width - 20, entity.position.x));
        entity.position.y = Math.max(20, Math.min(this.worldBounds.height - 20, entity.position.y));
    }
    
    /**
     * Handle movement when blocked by collision
     * Try sliding along walls or finding nearby walkable position
     */
    handleBlockedMovement(entity, targetX, targetY) {
        // Try moving in X direction only
        if (this.collisionMask.canMove(entity.position.x, entity.position.y, targetX, entity.position.y)) {
            entity.position.x = targetX;
            return;
        }
        
        // Try moving in Y direction only  
        if (this.collisionMask.canMove(entity.position.x, entity.position.y, entity.position.x, targetY)) {
            entity.position.y = targetY;
            return;
        }
        
        // If all movement is blocked, find nearest walkable position as fallback
        const fallbackPos = this.collisionMask.findNearestWalkable(entity.position.x, entity.position.y, 64);
        if (fallbackPos) {
            // Only use fallback if entity is actually stuck in solid area
            if (!this.collisionMask.isWalkable(entity.position.x, entity.position.y)) {
                entity.position.x = fallbackPos.x;
                entity.position.y = fallbackPos.y;
            }
        }
    }
}