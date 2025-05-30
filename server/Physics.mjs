export class PhysicsSystem {
    constructor(world) {
        this.world = world;
        this.worldBounds = {
            x: 0,
            y: 0,
            width: world.width * world.tileSize,
            height: world.height * world.tileSize
        };
    }

    update(deltaTime, entities) {
        this.worldBounds.width = this.world.width * this.world.tileSize;
        this.worldBounds.height = this.world.height * this.world.tileSize;
        for (const entity of entities) {
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
            this.handleTileCollisionsAABB(entity);
        }
    }

    getCollisionBox(entity) {
        if (entity.collisionBox) return entity.collisionBox;
        if (entity.collisionRadius) {
            const size = entity.collisionRadius * 1.8;
            return { width: size, height: size };
        }
        const defaultRadius = 20;
        const defaultSize = defaultRadius * 1.8;
        return { width: defaultSize, height: defaultSize };
    }

    handleTileCollisionsAABB(entity) {
        const tileSize = this.world.tileSize;
        const box = this.getCollisionBox(entity);
        const aabb = {
            minX: entity.position.x - box.width / 2,
            maxX: entity.position.x + box.width / 2,
            minY: entity.position.y - box.height / 2,
            maxY: entity.position.y + box.height / 2
        };
        const startX = Math.floor(aabb.minX / tileSize);
        const endX = Math.floor(aabb.maxX / tileSize);
        const startY = Math.floor(aabb.minY / tileSize);
        const endY = Math.floor(aabb.maxY / tileSize);
        for (let ty = startY; ty <= endY; ty++) {
            for (let tx = startX; tx <= endX; tx++) {
                if (tx < 0 || tx >= this.world.width || ty < 0 || ty >= this.world.height) {
                    continue;
                }
                if (this.world.isTileWalkable(tx * tileSize, ty * tileSize)) {
                    continue;
                }
                const tileAABB = {
                    minX: tx * tileSize,
                    maxX: (tx + 1) * tileSize,
                    minY: ty * tileSize,
                    maxY: (ty + 1) * tileSize
                };
                if (this.intersectsAABB(aabb, tileAABB)) {
                    const overlapX = Math.min(aabb.maxX, tileAABB.maxX) - Math.max(aabb.minX, tileAABB.minX);
                    const overlapY = Math.min(aabb.maxY, tileAABB.maxY) - Math.max(aabb.minY, tileAABB.minY);
                    if (overlapX < overlapY) {
                        if (entity.position.x < tileAABB.minX + tileSize / 2) {
                            entity.position.x -= overlapX;
                        } else {
                            entity.position.x += overlapX;
                        }
                    } else {
                        if (entity.position.y < tileAABB.minY + tileSize / 2) {
                            entity.position.y -= overlapY;
                        } else {
                            entity.position.y += overlapY;
                        }
                    }
                    aabb.minX = entity.position.x - box.width / 2;
                    aabb.maxX = entity.position.x + box.width / 2;
                    aabb.minY = entity.position.y - box.height / 2;
                    aabb.maxY = entity.position.y + box.height / 2;
                }
            }
        }
    }

    intersectsAABB(a, b) {
        return (
            a.minX < b.maxX &&
            a.maxX > b.minX &&
            a.minY < b.maxY &&
            a.maxY > b.minY
        );
    }
}
