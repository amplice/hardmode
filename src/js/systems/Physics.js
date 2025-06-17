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
                
                // New AABB-based tile collision logic
                this.handleTileCollisionsAABB(entity, world);
                
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

    getCollisionBox(entity) {
        // If entity already has a collisionBox defined (e.g., from config in the future)
        if (entity.collisionBox) {
            return entity.collisionBox;
        }
        // Derive from collisionRadius if available (typically for monsters)
        if (entity.collisionRadius) {
            const size = entity.collisionRadius * 1.8; // Factor to approximate AABB from radius
            return { width: size, height: size };
        }
        // Default for player or other entities if no specific box/radius
        const defaultRadius = 20; // Based on old characterRadius
        const defaultSize = defaultRadius * 1.8;
        return { width: defaultSize, height: defaultSize };
    }

    handleTileCollisionsAABB(entity, world) {
        const tileSize = world.tileSize;
        const entityCollisionBox = this.getCollisionBox(entity);

        // Entity's AABB (center-based position)
        const entityAABB = {
            minX: entity.position.x - entityCollisionBox.width / 2,
            maxX: entity.position.x + entityCollisionBox.width / 2,
            minY: entity.position.y - entityCollisionBox.height / 2,
            maxY: entity.position.y + entityCollisionBox.height / 2,
        };

        // Get the range of tiles to check around the entity
        const startTileX = Math.floor(entityAABB.minX / tileSize);
        const endTileX = Math.floor(entityAABB.maxX / tileSize);
        const startTileY = Math.floor(entityAABB.minY / tileSize);
        const endTileY = Math.floor(entityAABB.maxY / tileSize);

        for (let tileY = startTileY; tileY <= endTileY; tileY++) {
            for (let tileX = startTileX; tileX <= endTileX; tileX++) {
                if (tileX >= 0 && tileX < world.width && tileY >= 0 && tileY < world.height) {
                    // Get the tile object from the world
                    const tile = world.tiles[tileY][tileX];

                    // If the tile doesn't exist or is walkable, skip collision processing
                    if (!tile || tile.isWalkable()) {
                        continue; // Skip if no tile or if tile is walkable
                    }

                    // If we reach here, the tile is solid, so proceed with collision check
                    const tileAABB = {
                        minX: tileX * tileSize,
                        maxX: (tileX + 1) * tileSize,
                        minY: tileY * tileSize,
                        maxY: (tileY + 1) * tileSize,
                    };

                    // Check for intersection
                    if (this.intersectsAABB(entityAABB, tileAABB)) {
                        // Collision detected, calculate penetration depth
                        const overlapX = Math.min(entityAABB.maxX, tileAABB.maxX) - Math.max(entityAABB.minX, tileAABB.minX);
                        const overlapY = Math.min(entityAABB.maxY, tileAABB.maxY) - Math.max(entityAABB.minY, tileAABB.minY);

                        // Resolve collision by pushing entity along the axis of minimum penetration
                        if (overlapX < overlapY) {
                            // Push in X direction
                            if (entity.position.x < tileAABB.minX + tileSize / 2) { // Entity is to the left of tile center
                                entity.position.x -= overlapX;
                            } else { // Entity is to the right of tile center
                                entity.position.x += overlapX;
                            }
                        } else {
                            // Push in Y direction
                            if (entity.position.y < tileAABB.minY + tileSize / 2) { // Entity is above tile center
                                entity.position.y -= overlapY;
                            } else { // Entity is below tile center
                                entity.position.y += overlapY;
                            }
                        }
                        // Re-calculate entityAABB after position adjustment before checking next tile (important for multiple collisions)
                        entityAABB.minX = entity.position.x - entityCollisionBox.width / 2;
                        entityAABB.maxX = entity.position.x + entityCollisionBox.width / 2;
                        entityAABB.minY = entity.position.y - entityCollisionBox.height / 2;
                        entityAABB.maxY = entity.position.y + entityCollisionBox.height / 2;
                    }
                }
            }
        }
    }

    intersectsAABB(aabb1, aabb2) {
        return (
            aabb1.minX < aabb2.maxX &&
            aabb1.maxX > aabb2.minX &&
            aabb1.minY < aabb2.maxY &&
            aabb1.maxY > aabb2.minY
        );
    }
}