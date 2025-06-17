/**
 * LLM_NOTE: Client-side entity manager that maintains the game state.
 * Handles entity creation, updates, and destruction based on server messages.
 */

import { 
  Entity,
  SerializedEntity,
  EntityUpdate,
  ComponentType,
  EntityType
} from '@hardmode/shared';

export class EntityManager {
  private entities: Map<string, Entity> = new Map();
  private localPlayerId: string | null = null;
  
  /**
   * Set the local player ID.
   */
  setLocalPlayerId(playerId: string): void {
    this.localPlayerId = playerId;
  }
  
  /**
   * Get the local player entity.
   */
  getLocalPlayer(): Entity | null {
    if (!this.localPlayerId) {
      return null;
    }
    return this.entities.get(this.localPlayerId) || null;
  }
  
  /**
   * Create an entity from serialized data.
   */
  createEntity(data: SerializedEntity): Entity {
    const entity = new Entity(data.type);
    entity.deserialize(data);
    this.entities.set(entity.id, entity);
    
    console.log(`Created entity ${entity.id} of type ${entity.type}`);
    return entity;
  }
  
  /**
   * Update an entity with partial data.
   */
  updateEntity(update: EntityUpdate): void {
    const entity = this.entities.get(update.id);
    if (!entity) {
      console.warn(`Trying to update non-existent entity ${update.id}`);
      return;
    }
    
    // Update components
    for (const [componentType, componentData] of Object.entries(update.components)) {
      const component = entity.getComponent(componentType as ComponentType);
      if (component) {
        component.deserialize(componentData);
      } else {
        // Component doesn't exist, need to create it
        // This shouldn't happen in normal operation
        console.warn(`Entity ${update.id} missing component ${componentType}`);
      }
    }
    
    entity.lastUpdated = update.timestamp;
  }
  
  /**
   * Remove an entity.
   */
  removeEntity(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      this.entities.delete(entityId);
      console.log(`Removed entity ${entityId}`);
    }
  }
  
  /**
   * Get an entity by ID.
   */
  getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }
  
  /**
   * Get all entities.
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }
  
  /**
   * Get entities by type.
   */
  getEntitiesByType(type: EntityType): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.type === type) {
        result.push(entity);
      }
    }
    return result;
  }
  
  /**
   * Get entities with specific components.
   */
  getEntitiesWithComponents(...componentTypes: ComponentType[]): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.hasComponents(...componentTypes)) {
        result.push(entity);
      }
    }
    return result;
  }
  
  /**
   * Clear all entities.
   */
  clear(): void {
    this.entities.clear();
    // Don't clear localPlayerId - it should persist
  }
  
  /**
   * Get entity count.
   */
  getEntityCount(): number {
    return this.entities.size;
  }
}