/**
 * LLM_NOTE: Server-side combat system that handles attacks and damage.
 */

import { System, SystemPriority, ComponentType, Entity } from '@hardmode/shared';
import { GameWorld } from '../../core/GameWorld';

export class CombatSystem extends System {
  readonly requiredComponents = [ComponentType.COMBAT];
  readonly priority = SystemPriority.COMBAT;
  
  constructor(private world: GameWorld) {
    super();
  }
  
  update(entities: Entity[], deltaTime: number): void {
    // Combat logic will be implemented
  }
}