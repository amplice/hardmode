/**
 * LLM_NOTE: Base Component class for the Entity Component System.
 * All components must extend this class and implement serialization.
 * 
 * ARCHITECTURE_DECISION: Components are pure data containers with serialization.
 * No game logic should be in components - that belongs in Systems.
 */

import { ComponentType, IComponent } from '../types/Entity.js';

export abstract class Component implements IComponent {
  abstract readonly type: ComponentType;
  
  /**
   * Serialize component to a plain object for network transmission.
   * Must return a JSON-serializable object.
   */
  abstract serialize(): any;
  
  /**
   * Deserialize component from network data.
   * Must handle any version differences gracefully.
   */
  abstract deserialize(data: any): void;
  
  /**
   * Clone this component to create a deep copy.
   * Used for state snapshots and rollback.
   */
  abstract clone(): Component;
  
  /**
   * Check if this component has changed since last sync.
   * Used for delta compression in networking.
   */
  protected _isDirty: boolean = true;
  
  get isDirty(): boolean {
    return this._isDirty;
  }
  
  markClean(): void {
    this._isDirty = false;
  }
  
  markDirty(): void {
    this._isDirty = true;
  }
}

// Component factory for deserialization
export class ComponentFactory {
  private static componentTypes = new Map<ComponentType, new() => Component>();
  
  /**
   * Register a component type for automatic deserialization.
   * Called during initialization for all component types.
   */
  static register(type: ComponentType, constructor: new() => Component): void {
    this.componentTypes.set(type, constructor);
  }
  
  /**
   * Create a component instance from serialized data.
   * Returns null if component type is not registered.
   */
  static create(type: ComponentType, data: any): Component | null {
    const Constructor = this.componentTypes.get(type);
    if (!Constructor) {
      console.error(`Unknown component type: ${type}`);
      return null;
    }
    
    const component = new Constructor();
    component.deserialize(data);
    return component;
  }
  
  /**
   * Check if a component type is registered.
   */
  static hasType(type: ComponentType): boolean {
    return this.componentTypes.has(type);
  }
}