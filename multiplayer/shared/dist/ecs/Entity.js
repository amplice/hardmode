/**
 * LLM_NOTE: Core Entity class for the Entity Component System.
 * Entities are containers for components and have unique IDs.
 *
 * ARCHITECTURE_DECISION: Entities use a Map for component storage for O(1) access.
 * The entity itself has minimal logic - all behavior is in Systems.
 */
import { v4 as uuidv4 } from 'uuid';
import { ComponentFactory } from './Component.js';
export class Entity {
    id;
    type;
    components;
    lastUpdated;
    // Optional tags for fast filtering
    tags = new Set();
    constructor(type, id) {
        this.id = id || uuidv4();
        this.type = type;
        this.components = new Map();
        this.lastUpdated = Date.now();
    }
    /**
     * Add a component to this entity.
     * Replaces existing component of the same type.
     */
    addComponent(component) {
        this.components.set(component.type, component);
        this.lastUpdated = Date.now();
        return this;
    }
    /**
     * Remove a component from this entity.
     */
    removeComponent(type) {
        const removed = this.components.delete(type);
        if (removed) {
            this.lastUpdated = Date.now();
        }
        return removed;
    }
    /**
     * Get a component by type.
     * Returns undefined if component doesn't exist.
     */
    getComponent(type) {
        return this.components.get(type);
    }
    /**
     * Check if entity has a component.
     */
    hasComponent(type) {
        return this.components.has(type);
    }
    /**
     * Check if entity has all specified components.
     * Used by Systems to filter entities.
     */
    hasComponents(...types) {
        return types.every(type => this.hasComponent(type));
    }
    /**
     * Add a tag to this entity for fast filtering.
     * Tags are not serialized - they're runtime only.
     */
    addTag(tag) {
        this.tags.add(tag);
    }
    /**
     * Remove a tag from this entity.
     */
    removeTag(tag) {
        return this.tags.delete(tag);
    }
    /**
     * Check if entity has a tag.
     */
    hasTag(tag) {
        return this.tags.has(tag);
    }
    /**
     * Get all tags on this entity.
     */
    getTags() {
        return Array.from(this.tags);
    }
    /**
     * Serialize entity for network transmission.
     * Only includes dirty components when partial is true.
     */
    serialize(partial = false) {
        const components = {};
        for (const [type, component] of this.components) {
            if (!partial || component.isDirty) {
                components[type] = component.serialize();
            }
        }
        return {
            id: this.id,
            type: this.type,
            components,
            lastUpdated: this.lastUpdated,
        };
    }
    /**
     * Deserialize entity from network data.
     * Can handle partial updates (only some components).
     */
    deserialize(data, partial = false) {
        if (!partial) {
            // Full update - replace all components
            this.components.clear();
        }
        // Update or add components from data
        for (const [type, componentData] of Object.entries(data.components)) {
            const componentType = type;
            let component = this.components.get(componentType);
            if (component) {
                // Update existing component
                component.deserialize(componentData);
            }
            else {
                // Create new component
                const newComponent = ComponentFactory.create(componentType, componentData);
                if (newComponent !== null) {
                    this.components.set(componentType, newComponent);
                }
            }
        }
        this.lastUpdated = data.lastUpdated;
    }
    /**
     * Clone this entity to create a deep copy.
     * Used for state snapshots and prediction.
     */
    clone() {
        const clone = new Entity(this.type, this.id);
        // Clone all components
        for (const [type, component] of this.components) {
            clone.components.set(type, component.clone());
        }
        // Copy tags
        for (const tag of this.tags) {
            clone.tags.add(tag);
        }
        clone.lastUpdated = this.lastUpdated;
        return clone;
    }
    /**
     * Mark all components as clean (for network sync).
     */
    markClean() {
        for (const component of this.components.values()) {
            component.markClean();
        }
    }
    /**
     * Get list of dirty component types.
     */
    getDirtyComponents() {
        const dirty = [];
        for (const [type, component] of this.components) {
            if (component.isDirty) {
                dirty.push(type);
            }
        }
        return dirty;
    }
    /**
     * Calculate a simple hash of entity state.
     * Used for debugging desync issues.
     */
    getStateHash() {
        let hash = 0;
        // Include entity type and component types
        hash = this.hashCode(this.type, hash);
        // Include component count and types
        const componentTypes = Array.from(this.components.keys()).sort();
        for (const type of componentTypes) {
            hash = this.hashCode(type, hash);
        }
        return hash;
    }
    hashCode(str, seed = 0) {
        let h1 = 0xdeadbeef ^ seed;
        let h2 = 0x41c6ce57 ^ seed;
        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    }
}
/**
 * Entity builder for convenient entity creation.
 * Uses fluent interface pattern.
 */
export class EntityBuilder {
    entity;
    constructor(type, id) {
        this.entity = new Entity(type, id);
    }
    withComponent(component) {
        this.entity.addComponent(component);
        return this;
    }
    withTag(tag) {
        this.entity.addTag(tag);
        return this;
    }
    build() {
        return this.entity;
    }
}
// Common entity tags
export const EntityTags = {
    PLAYER_CONTROLLED: 'player_controlled',
    AI_CONTROLLED: 'ai_controlled',
    SOLID: 'solid',
    TRIGGER: 'trigger',
    INVISIBLE: 'invisible',
    INVULNERABLE: 'invulnerable',
    DEAD: 'dead',
    SPAWNING: 'spawning',
};
//# sourceMappingURL=Entity.js.map