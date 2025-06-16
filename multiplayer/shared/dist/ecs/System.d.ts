/**
 * LLM_NOTE: Base System class for the Entity Component System.
 * Systems contain all game logic and operate on entities with specific components.
 *
 * ARCHITECTURE_DECISION: Systems are stateless and operate on entities.
 * Each system has a specific purpose and required component types.
 */
import { Entity } from './Entity.js';
import { ComponentType } from '../types/Entity.js';
export declare abstract class System {
    abstract readonly requiredComponents: ComponentType[];
    readonly optionalComponents: ComponentType[];
    readonly priority: number;
    private _enabled;
    private lastExecutionTime;
    private executionCount;
    /**
     * Check if an entity matches this system's requirements.
     */
    matches(entity: Entity): boolean;
    /**
     * Main update method - must be implemented by subclasses.
     * Called once per frame/tick with matching entities.
     */
    abstract update(entities: Entity[], deltaTime: number): void;
    /**
     * Optional initialization method.
     * Called when system is added to the world.
     */
    initialize(): void;
    /**
     * Optional cleanup method.
     * Called when system is removed from the world.
     */
    cleanup(): void;
    /**
     * Enable or disable this system.
     */
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
    /**
     * Execute system update with performance tracking.
     * Called by the ECS world manager.
     */
    execute(entities: Entity[], deltaTime: number): void;
    /**
     * Get performance statistics for this system.
     */
    getPerformanceStats(): {
        lastExecutionTime: number;
        executionCount: number;
        averageExecutionTime: number;
    };
    /**
     * Reset performance statistics.
     */
    resetStats(): void;
}
/**
 * System group for organizing related systems.
 * Useful for enabling/disabling groups of systems together.
 */
export declare class SystemGroup {
    readonly name: string;
    private systems;
    private _enabled;
    constructor(name: string);
    /**
     * Add a system to this group.
     */
    addSystem(system: System): void;
    /**
     * Remove a system from this group.
     */
    removeSystem(system: System): boolean;
    /**
     * Get all systems in this group.
     */
    getSystems(): System[];
    /**
     * Enable or disable all systems in this group.
     */
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
    /**
     * Execute all systems in this group.
     */
    execute(entities: Entity[], deltaTime: number): void;
}
/**
 * Common system priorities.
 * Higher priority systems run first.
 */
export declare const SystemPriority: {
    readonly INPUT: 1000;
    readonly PHYSICS: 900;
    readonly MOVEMENT: 800;
    readonly COMBAT: 700;
    readonly AI: 600;
    readonly ANIMATION: 500;
    readonly EFFECTS: 400;
    readonly NETWORK: 300;
    readonly CLEANUP: 100;
    readonly RENDER: 0;
};
//# sourceMappingURL=System.d.ts.map