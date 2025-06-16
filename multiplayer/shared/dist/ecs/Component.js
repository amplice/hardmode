/**
 * LLM_NOTE: Base Component class for the Entity Component System.
 * All components must extend this class and implement serialization.
 *
 * ARCHITECTURE_DECISION: Components are pure data containers with serialization.
 * No game logic should be in components - that belongs in Systems.
 */
export class Component {
    /**
     * Check if this component has changed since last sync.
     * Used for delta compression in networking.
     */
    _isDirty = true;
    get isDirty() {
        return this._isDirty;
    }
    markClean() {
        this._isDirty = false;
    }
    markDirty() {
        this._isDirty = true;
    }
}
// Component factory for deserialization
export class ComponentFactory {
    static componentTypes = new Map();
    /**
     * Register a component type for automatic deserialization.
     * Called during initialization for all component types.
     */
    static register(type, constructor) {
        this.componentTypes.set(type, constructor);
    }
    /**
     * Create a component instance from serialized data.
     * Returns null if component type is not registered.
     */
    static create(type, data) {
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
    static hasType(type) {
        return this.componentTypes.has(type);
    }
}
//# sourceMappingURL=Component.js.map