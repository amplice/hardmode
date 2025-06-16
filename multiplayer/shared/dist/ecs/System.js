/**
 * LLM_NOTE: Base System class for the Entity Component System.
 * Systems contain all game logic and operate on entities with specific components.
 *
 * ARCHITECTURE_DECISION: Systems are stateless and operate on entities.
 * Each system has a specific purpose and required component types.
 */
export class System {
    // Optional components that enhance functionality
    optionalComponents = [];
    // System priority (higher = runs first)
    priority = 0;
    // Whether system is enabled
    _enabled = true;
    // Performance tracking
    lastExecutionTime = 0;
    executionCount = 0;
    /**
     * Check if an entity matches this system's requirements.
     */
    matches(entity) {
        return this._enabled && entity.hasComponents(...this.requiredComponents);
    }
    /**
     * Optional initialization method.
     * Called when system is added to the world.
     */
    initialize() {
        // Override in subclasses if needed
    }
    /**
     * Optional cleanup method.
     * Called when system is removed from the world.
     */
    cleanup() {
        // Override in subclasses if needed
    }
    /**
     * Enable or disable this system.
     */
    setEnabled(enabled) {
        this._enabled = enabled;
    }
    isEnabled() {
        return this._enabled;
    }
    /**
     * Execute system update with performance tracking.
     * Called by the ECS world manager.
     */
    execute(entities, deltaTime) {
        if (!this._enabled)
            return;
        const startTime = performance.now();
        // Filter entities that match our requirements
        const matchingEntities = entities.filter(entity => this.matches(entity));
        if (matchingEntities.length > 0) {
            this.update(matchingEntities, deltaTime);
        }
        // Track performance
        this.lastExecutionTime = performance.now() - startTime;
        this.executionCount++;
    }
    /**
     * Get performance statistics for this system.
     */
    getPerformanceStats() {
        return {
            lastExecutionTime: this.lastExecutionTime,
            executionCount: this.executionCount,
            averageExecutionTime: this.executionCount > 0
                ? this.lastExecutionTime / this.executionCount
                : 0,
        };
    }
    /**
     * Reset performance statistics.
     */
    resetStats() {
        this.lastExecutionTime = 0;
        this.executionCount = 0;
    }
}
/**
 * System group for organizing related systems.
 * Useful for enabling/disabling groups of systems together.
 */
export class SystemGroup {
    name;
    systems = [];
    _enabled = true;
    constructor(name) {
        this.name = name;
    }
    /**
     * Add a system to this group.
     */
    addSystem(system) {
        if (!this.systems.includes(system)) {
            this.systems.push(system);
            // Sort by priority (descending)
            this.systems.sort((a, b) => b.priority - a.priority);
        }
    }
    /**
     * Remove a system from this group.
     */
    removeSystem(system) {
        const index = this.systems.indexOf(system);
        if (index !== -1) {
            this.systems.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Get all systems in this group.
     */
    getSystems() {
        return [...this.systems];
    }
    /**
     * Enable or disable all systems in this group.
     */
    setEnabled(enabled) {
        this._enabled = enabled;
        this.systems.forEach(system => system.setEnabled(enabled));
    }
    isEnabled() {
        return this._enabled;
    }
    /**
     * Execute all systems in this group.
     */
    execute(entities, deltaTime) {
        if (!this._enabled)
            return;
        for (const system of this.systems) {
            system.execute(entities, deltaTime);
        }
    }
}
/**
 * Common system priorities.
 * Higher priority systems run first.
 */
export const SystemPriority = {
    INPUT: 1000, // Process input first
    PHYSICS: 900, // Physics before movement
    MOVEMENT: 800, // Movement validation
    COMBAT: 700, // Combat resolution
    AI: 600, // AI decisions
    ANIMATION: 500, // Animation updates
    EFFECTS: 400, // Visual effects
    NETWORK: 300, // Network synchronization
    CLEANUP: 100, // Entity cleanup
    RENDER: 0, // Rendering last
};
//# sourceMappingURL=System.js.map