/**
 * @fileoverview PhysicsSystem - Client-side collision detection and movement validation
 * 
 * MIGRATION NOTES:
 * - Converted from Physics.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for all physics structures
 * - Preserved all collision detection and movement validation logic
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

import { GAME_CONSTANTS } from '../../../shared/constants/GameConstants.js';

// Interface for world bounds
interface WorldBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Interface for position
interface Position {
    x: number;
    y: number;
}

// Interface for velocity
interface Velocity {
    x: number;
    y: number;
}

// Interface for entity (minimal to avoid circular dependencies)
interface PhysicsEntity {
    position: Position;
    velocity?: Velocity;
    sprite?: {
        position: {
            set(x: number, y: number): void;
        };
    };
}

// Interface for collision mask (minimal)
interface CollisionMask {
    canMove(fromX: number, fromY: number, toX: number, toY: number): boolean;
}

// Interface for world (minimal)
interface GameWorld {
    collisionMask?: CollisionMask;
    width: number;
    height: number;
    tileSize: number;
}

export class PhysicsSystem {
    private worldBounds: WorldBounds;
    private collisionMask: CollisionMask | null;
    private loggedWorldInfo: boolean;

    constructor() {
        this.worldBounds = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        this.collisionMask = null;
        this.loggedWorldInfo = false;
    }
    
    update(deltaTime: number, entities: PhysicsEntity[], world?: GameWorld): void {
        if (world) {
            // Get collision mask from world
            this.collisionMask = world.collisionMask || null;
            const expectedWidth = (GAME_CONSTANTS?.WORLD?.WIDTH || world.width) * world.tileSize;
            const expectedHeight = (GAME_CONSTANTS?.WORLD?.HEIGHT || world.height) * world.tileSize;

            this.worldBounds.width = Math.max(world.width * world.tileSize, expectedWidth);
            this.worldBounds.height = Math.max(world.height * world.tileSize, expectedHeight);

            if (!this.loggedWorldInfo) {
                console.log('[PhysicsSystem] world bounds set to', {
                    widthTiles: world.width,
                    heightTiles: world.height,
                    tileSize: world.tileSize,
                    widthPixels: this.worldBounds.width,
                    heightPixels: this.worldBounds.height
                });
                this.loggedWorldInfo = true;
            }
            
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
    private handleEntityMovement(entity: PhysicsEntity): void {
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
    private handleBlockedMovement(entity: PhysicsEntity, targetX: number, targetY: number): void {
        if (!this.collisionMask) return;
        
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
