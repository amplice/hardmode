/**
 * LLM_NOTE: Server-side movement system that validates and applies player movement.
 * This system ensures movement is legal and updates entity positions.
 */

import { 
  System, 
  SystemPriority, 
  ComponentType, 
  Entity,
  CHARACTER_CLASSES,
  DAMAGE_CONFIG
} from '@hardmode/shared';
import { Direction } from '@hardmode/shared/constants/PhysicsConfig';
import { GameWorld } from '../../core/GameWorld';
import { PositionComponent } from '../components/PositionComponent';
import { VelocityComponent } from '../components/VelocityComponent';
import { PlayerComponent } from '../components/PlayerComponent';
import { HealthComponent } from '../components/HealthComponent';
import { CombatComponent } from '../components/CombatComponent';

export class MovementSystem extends System {
  readonly requiredComponents = [ComponentType.POSITION, ComponentType.VELOCITY];
  readonly priority = SystemPriority.MOVEMENT;
  
  constructor(world: GameWorld) {
    super();
  }
  
  update(entities: Entity[], deltaTime: number): void {
    const dt = deltaTime / 1000; // Convert to seconds
    
    for (const entity of entities) {
      const position = entity.getComponent<PositionComponent>(ComponentType.POSITION)!;
      const velocity = entity.getComponent<VelocityComponent>(ComponentType.VELOCITY)!;
      
      // Skip if no velocity
      if (velocity.x === 0 && velocity.y === 0) {
        continue;
      }
      
      console.log(`MovementSystem: Entity ${entity.id} has velocity (${velocity.x}, ${velocity.y})`);
      
      // Calculate movement speed modifier
      let speedModifier = 1.0;
      
      // Check if entity is a player
      const playerComp = entity.getComponent<PlayerComponent>(ComponentType.PLAYER);
      if (playerComp) {
        // Get base move speed from character class
        const charClass = CHARACTER_CLASSES[playerComp.characterClass];
        const baseMoveSpeed = charClass ? charClass.moveSpeed : 5;
        
        // Apply modifiers
        const healthComp = entity.getComponent<HealthComponent>(ComponentType.HEALTH);
        const combatComp = entity.getComponent<CombatComponent>(ComponentType.COMBAT);
        
        // Stun check (after taking damage)
        if (healthComp && Date.now() - healthComp.lastDamageTime < DAMAGE_CONFIG.stunDuration * 1000) {
          speedModifier = 0; // Can't move while stunned
        }
        // Attack recovery check
        else if (combatComp && combatComp.isAttacking) {
          speedModifier *= 0.3; // Reduced movement during attacks
        }
        // Roll check - faster movement during roll
        else if (combatComp && combatComp.currentAttack === 'roll') {
          speedModifier *= 2.0; // Double speed during roll
        }
        
        // Apply base speed
        speedModifier *= baseMoveSpeed;
      }
      
      // Apply movement
      const oldX = position.x;
      const oldY = position.y;
      const newX = position.x + velocity.x * speedModifier * dt * 60; // 60 for 60fps base
      const newY = position.y + velocity.y * speedModifier * dt * 60;
      
      // Clamp to world bounds (100x100 tiles * 64 pixels/tile = 6400x6400)
      position.x = Math.max(0, Math.min(6400, newX));
      position.y = Math.max(0, Math.min(6400, newY));
      
      console.log(`MovementSystem: Updated position from (${oldX}, ${oldY}) to (${position.x}, ${position.y})`);
      
      // Update facing direction based on velocity
      if (velocity.x !== 0 || velocity.y !== 0) {
        position.facing = this.calculateDirection(velocity.x, velocity.y);
      }
      
      // Mark position as dirty for network sync
      position.markDirty();
    }
  }
  
  private calculateDirection(dx: number, dy: number): Direction {
    // Calculate angle in radians
    const angle = Math.atan2(dy, dx);
    
    // Convert to degrees and normalize to 0-360
    let degrees = (angle * 180 / Math.PI + 360) % 360;
    
    // Map to 8 directions
    if (degrees < 22.5 || degrees >= 337.5) return 'right';
    if (degrees < 67.5) return 'down-right';
    if (degrees < 112.5) return 'down';
    if (degrees < 157.5) return 'down-left';
    if (degrees < 202.5) return 'left';
    if (degrees < 247.5) return 'up-left';
    if (degrees < 292.5) return 'up';
    return 'up-right';
  }
}