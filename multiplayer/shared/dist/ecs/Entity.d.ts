/**
 * LLM_NOTE: Core Entity class for the Entity Component System.
 * Entities are containers for components and have unique IDs.
 *
 * ARCHITECTURE_DECISION: Entities use a Map for component storage for O(1) access.
 * The entity itself has minimal logic - all behavior is in Systems.
 */
import { IEntity, EntityType, ComponentType, SerializedEntity } from '../types/Entity.js';
import { Component } from './Component.js';
export declare class Entity implements IEntity {
    readonly id: string;
    readonly type: EntityType;
    components: Map<ComponentType, Component>;
    lastUpdated: number;
    private tags;
    constructor(type: EntityType, id?: string);
    /**
     * Add a component to this entity.
     * Replaces existing component of the same type.
     */
    addComponent(component: Component): this;
    /**
     * Remove a component from this entity.
     */
    removeComponent(type: ComponentType): boolean;
    /**
     * Get a component by type.
     * Returns undefined if component doesn't exist.
     */
    getComponent<T extends Component>(type: ComponentType): T | undefined;
    /**
     * Check if entity has a component.
     */
    hasComponent(type: ComponentType): boolean;
    /**
     * Check if entity has all specified components.
     * Used by Systems to filter entities.
     */
    hasComponents(...types: ComponentType[]): boolean;
    /**
     * Add a tag to this entity for fast filtering.
     * Tags are not serialized - they're runtime only.
     */
    addTag(tag: string): void;
    /**
     * Remove a tag from this entity.
     */
    removeTag(tag: string): boolean;
    /**
     * Check if entity has a tag.
     */
    hasTag(tag: string): boolean;
    /**
     * Get all tags on this entity.
     */
    getTags(): string[];
    /**
     * Serialize entity for network transmission.
     * Only includes dirty components when partial is true.
     */
    serialize(partial?: boolean): SerializedEntity;
    /**
     * Deserialize entity from network data.
     * Can handle partial updates (only some components).
     */
    deserialize(data: SerializedEntity, partial?: boolean): void;
    /**
     * Clone this entity to create a deep copy.
     * Used for state snapshots and prediction.
     */
    clone(): Entity;
    /**
     * Mark all components as clean (for network sync).
     */
    markClean(): void;
    /**
     * Get list of dirty component types.
     */
    getDirtyComponents(): ComponentType[];
    /**
     * Calculate a simple hash of entity state.
     * Used for debugging desync issues.
     */
    getStateHash(): number;
    private hashCode;
}
/**
 * Entity builder for convenient entity creation.
 * Uses fluent interface pattern.
 */
export declare class EntityBuilder {
    private entity;
    constructor(type: EntityType, id?: string);
    withComponent(component: Component): this;
    withTag(tag: string): this;
    build(): Entity;
}
export declare const EntityTags: {
    readonly PLAYER_CONTROLLED: "player_controlled";
    readonly AI_CONTROLLED: "ai_controlled";
    readonly SOLID: "solid";
    readonly TRIGGER: "trigger";
    readonly INVISIBLE: "invisible";
    readonly INVULNERABLE: "invulnerable";
    readonly DEAD: "dead";
    readonly SPAWNING: "spawning";
};
//# sourceMappingURL=Entity.d.ts.map