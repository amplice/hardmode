/**
 * LLM_NOTE: Client-side component exports and registration.
 * All components must be registered with ComponentFactory for deserialization.
 */

import { ComponentFactory, ComponentType } from '@hardmode/shared';
import { PositionComponent } from './PositionComponent';
import { VelocityComponent } from './VelocityComponent';
import { HealthComponent } from './HealthComponent';
import { PlayerComponent } from './PlayerComponent';
import { CombatComponent } from './CombatComponent';
import { LevelComponent } from './LevelComponent';
import { NetworkComponent } from './NetworkComponent';

// Export all components
export {
  PositionComponent,
  VelocityComponent,
  HealthComponent,
  PlayerComponent,
  CombatComponent,
  LevelComponent,
  NetworkComponent,
};

// Register all components with the factory
export function registerComponents(): void {
  ComponentFactory.register(ComponentType.POSITION, PositionComponent);
  ComponentFactory.register(ComponentType.VELOCITY, VelocityComponent);
  ComponentFactory.register(ComponentType.HEALTH, HealthComponent);
  ComponentFactory.register(ComponentType.PLAYER, PlayerComponent);
  ComponentFactory.register(ComponentType.COMBAT, CombatComponent);
  ComponentFactory.register(ComponentType.LEVEL, LevelComponent);
  ComponentFactory.register(ComponentType.NETWORK, NetworkComponent);
  
  console.log('Client components registered');
}