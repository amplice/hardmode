/**
 * LLM_NOTE: Server-side AI system that controls monster behaviors.
 * Handles pathfinding, target acquisition, and attack patterns.
 */

import { System, SystemPriority, ComponentType, Entity } from '@hardmode/shared';
import { GameWorld } from '../../core/GameWorld';

export class AISystem extends System {
  readonly requiredComponents = [ComponentType.AI];
  readonly priority = SystemPriority.AI;
  
  constructor(private world: GameWorld) {
    super();
  }
  
  update(entities: Entity[], deltaTime: number): void {
    // AI logic will be implemented
    // - Target acquisition
    // - Pathfinding
    // - Attack decisions
  }
}