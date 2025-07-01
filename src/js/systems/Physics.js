/**
 * @fileoverview PhysicsSystem - Client-side collision detection and movement validation
 * 
 * ARCHITECTURE ROLE:
 * - Provides client-side collision detection for smooth movement
 * - Integrates with shared CollisionMask for consistent physics
 * - Handles wall sliding and partial movement for better feel
 * - Maintains world boundaries and prevents out-of-bounds movement
 * 
 * CLIENT-SERVER COORDINATION:
 * Physics runs on both client and server with identical logic:
 * - Client PhysicsSystem provides immediate collision feedback
 * - Server InputProcessor validates movement with same CollisionMask
 * - Identical collision logic prevents prediction mismatches
 * - Client-side smoothness with server-side authority
 * 
 * COLLISION DETECTION:
 * Uses CollisionMask for efficient tile-based collision:
 * - O(1) collision lookup per movement attempt
 * - Supports partial movement when direct path blocked
 * - Wall sliding for smooth navigation around obstacles
 * - World boundary enforcement as final constraint
 * 
 * MOVEMENT VALIDATION:
 * Pre-validates movement before position updates:
 * 1. Calculate intended new position from velocity
 * 2. Check CollisionMask.canMove() for path validity
 * 3. Apply movement if valid, otherwise try alternatives
 * 4. Handle blocked movement with sliding or partial steps
 * 5. Enforce world boundaries as final safety check
 * 
 * PERFORMANCE OPTIMIZATION:
 * - Efficient collision mask integration
 * - Minimal coordinate transformations
 * - Direct sprite position synchronization
 * - Fallback boundary collision for edge cases
 * 
 * WALL SLIDING ALGORITHM:
 * When direct movement blocked, try alternative paths:
 * - X-only movement: slide along vertical walls
 * - Y-only movement: slide along horizontal walls
 * - Prevents getting stuck on geometry corners
 * - Maintains movement fluidity around obstacles
 */

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
        
        // Don't use fallback position - just stay in place if blocked
        // This prevents teleporting to spawn point when hitting walls
    }
}