/**
 * LLM_NOTE: Server-side progression system that handles player leveling and rewards.
 * Manages experience gain, level ups, and ability unlocks.
 */

import { System, SystemPriority, ComponentType, Entity } from '@hardmode/shared';
import { GameWorld } from '../../core/GameWorld';

export class ProgressionSystem extends System {
  readonly requiredComponents = [ComponentType.LEVEL];
  readonly priority = SystemPriority.PROGRESSION;
  
  constructor(private world: GameWorld) {
    super();
  }
  
  update(entities: Entity[], deltaTime: number): void {
    // Progression logic will be implemented
    // - Track experience gains
    // - Handle level ups
    // - Unlock abilities
    // - Update player stats
  }
}