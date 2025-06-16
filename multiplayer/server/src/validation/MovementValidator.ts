/**
 * LLM_NOTE: Validates player movement to prevent speed hacking and illegal positions.
 * This ensures players can't move faster than their character allows.
 * 
 * EXACT_BEHAVIOR: Movement speeds must match the original game exactly.
 * Each class has specific speeds that must be enforced.
 */

import { 
  Entity,
  ComponentType,
  CHARACTER_CLASSES,
  MOVEMENT_PHYSICS,
  WORLD_BOUNDS,
} from '@hardmode/shared';
import { VelocityComponent } from '../ecs/components/VelocityComponent';
import { PlayerComponent } from '../ecs/components/PlayerComponent';
import { PositionComponent } from '../ecs/components/PositionComponent';
import { LevelComponent } from '../ecs/components/LevelComponent';

export class MovementValidator {
  /**
   * Validate player movement velocity.
   */
  validateMovement(player: Entity, velocity: VelocityComponent): boolean {
    const playerComp = player.getComponent<PlayerComponent>(ComponentType.PLAYER);
    const position = player.getComponent<PositionComponent>(ComponentType.POSITION);
    
    if (!playerComp || !position) {
      return false;
    }
    
    // Get maximum allowed speed for this player
    const maxSpeed = this.getMaxSpeed(player);
    
    // Calculate actual speed
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    // Allow small tolerance for network lag and floating point
    const tolerance = maxSpeed * MOVEMENT_PHYSICS.MAX_SPEED_TOLERANCE;
    
    if (speed > tolerance) {
      console.warn(`Player ${playerComp.username} moving too fast: ${speed} > ${tolerance}`);
      return false;
    }
    
    // Validate position is within world bounds
    const futureX = position.x + velocity.x / 60; // 1 frame at 60fps
    const futureY = position.y + velocity.y / 60;
    
    if (futureX < WORLD_BOUNDS.MIN_X || futureX > WORLD_BOUNDS.MAX_X ||
        futureY < WORLD_BOUNDS.MIN_Y || futureY > WORLD_BOUNDS.MAX_Y) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get maximum speed for a player including bonuses.
   */
  private getMaxSpeed(player: Entity): number {
    const playerComp = player.getComponent<PlayerComponent>(ComponentType.PLAYER);
    const levelComp = player.getComponent<LevelComponent>(ComponentType.LEVEL);
    
    if (!playerComp) {
      return 0;
    }
    
    // Get base speed for class
    const classConfig = CHARACTER_CLASSES[playerComp.characterClass];
    let speed = classConfig.moveSpeed;
    
    // Apply level bonuses (levels 2 and 6 give +0.25 speed)
    if (levelComp) {
      if (levelComp.level >= 2) speed += 0.25;
      if (levelComp.level >= 6) speed += 0.25;
    }
    
    return speed;
  }
  
  /**
   * Validate a position is valid (not in walls, etc).
   */
  validatePosition(x: number, y: number): boolean {
    // Check world bounds
    if (x < WORLD_BOUNDS.MIN_X || x > WORLD_BOUNDS.MAX_X ||
        y < WORLD_BOUNDS.MIN_Y || y > WORLD_BOUNDS.MAX_Y) {
      return false;
    }
    
    // Additional collision checks would go here
    // For now, just bounds check
    
    return true;
  }
}