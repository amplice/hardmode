/**
 * LLM_NOTE: Server-side physics system that handles collisions and movement constraints.
 * Ensures entities don't move through walls or other solid objects.
 */

import { System, SystemPriority, ComponentType, Entity } from '@hardmode/shared';
import { GameWorld } from '../../core/GameWorld';
import { PositionComponent } from '../components/PositionComponent';
import { VelocityComponent } from '../components/VelocityComponent';
import { HealthComponent } from '../components/HealthComponent';

export class PhysicsSystem extends System {
  readonly requiredComponents = [ComponentType.POSITION, ComponentType.VELOCITY];
  readonly priority = SystemPriority.PHYSICS;
  
  constructor(private world: GameWorld) {
    super();
  }
  
  update(entities: Entity[], deltaTime: number): void {
    const dt = deltaTime / 1000; // Convert to seconds
    
    for (const entity of entities) {
      const position = entity.getComponent<PositionComponent>(ComponentType.POSITION)!;
      const velocity = entity.getComponent<VelocityComponent>(ComponentType.VELOCITY)!;
      
      // Skip dead entities
      const health = entity.getComponent<HealthComponent>(ComponentType.HEALTH);
      if (health && health.isDead) {
        velocity.x = 0;
        velocity.y = 0;
        continue;
      }
      
      // Skip if no velocity
      if (velocity.x === 0 && velocity.y === 0) {
        continue;
      }
      
      // Calculate desired new position
      const desiredX = position.x + velocity.x * dt * 60; // 60 for 60fps base
      const desiredY = position.y + velocity.y * dt * 60;
      
      // Check collision with world bounds
      const tileSize = 64;
      const collisionRadius = 16; // Player collision radius
      
      // Check tile collision at new position
      const canMoveX = this.canMoveTo(desiredX, position.y, collisionRadius);
      const canMoveY = this.canMoveTo(position.x, desiredY, collisionRadius);
      
      // Apply movement based on collision results
      if (canMoveX) {
        position.x = desiredX;
      } else {
        velocity.x = 0; // Stop horizontal movement
      }
      
      if (canMoveY) {
        position.y = desiredY;
      } else {
        velocity.y = 0; // Stop vertical movement
      }
      
      // If diagonal movement was blocked, try sliding along walls
      if (!canMoveX && canMoveY) {
        // Can still move vertically
        position.y = desiredY;
      } else if (canMoveX && !canMoveY) {
        // Can still move horizontally
        position.x = desiredX;
      }
      
      // Clamp to world bounds (0-6400)
      position.x = Math.max(collisionRadius, Math.min(6400 - collisionRadius, position.x));
      position.y = Math.max(collisionRadius, Math.min(6400 - collisionRadius, position.y));
    }
  }
  
  /**
   * Check if position is walkable (not in water tile)
   */
  private canMoveTo(x: number, y: number, radius: number): boolean {
    // Check corners of collision box
    const points = [
      { x: x - radius, y: y - radius }, // Top-left
      { x: x + radius, y: y - radius }, // Top-right
      { x: x - radius, y: y + radius }, // Bottom-left
      { x: x + radius, y: y + radius }, // Bottom-right
      { x: x, y: y }                     // Center
    ];
    
    for (const point of points) {
      const tile = this.world.getTileAt(point.x, point.y);
      if (tile && tile.type === 'water') {
        return false; // Can't walk on water
      }
    }
    
    return true;
  }
}