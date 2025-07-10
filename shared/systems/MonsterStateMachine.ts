/**
 * @fileoverview MonsterStateMachine - Type-safe monster state management
 * 
 * REARCHITECTURE PHASE 5.1:
 * Replace string-based states with explicit state classes for:
 * - Type safety and compile-time validation
 * - Clear state transition rules and validation
 * - Improved debugging and predictable AI behavior
 * - Centralized state logic shared between client and server
 * 
 * STATE MACHINE DESIGN:
 * - Abstract BaseState class with common interface
 * - Concrete state classes for each monster behavior
 * - Transition validation prevents invalid state changes
 * - State-specific behavior encapsulation
 * 
 * SUPPORTED STATES:
 * - DormantState: Far from players, AI sleeping for performance
 * - IdleState: Near players, wandering randomly
 * - ChasingState: Player in aggro range, pathfinding toward target
 * - AttackingState: In attack range, executing attack sequence
 * - StunnedState: Hit by player attack, temporary movement disable
 * - DyingState: Death animation playing, soon to be removed
 * 
 * USAGE PATTERN:
 * ```typescript
 * const stateMachine = new MonsterStateMachine(monster);
 * stateMachine.transition('chasing', { target: player });
 * stateMachine.update(deltaTime);
 * ```
 */

import type { MonsterType } from '../types/GameTypes.js';

// Enhanced state context with metadata
export interface StateContext {
    monster: MonsterStateData;
    target?: any; // Player or position target
    damage?: number;
    stunDuration?: number;
    [key: string]: any; // Additional context data
}

// Monster data interface for state machine
export interface MonsterStateData {
    id: string;
    type: MonsterType;
    x: number;
    y: number;
    facing: string;
    hp: number;
    maxHp: number;
    velocity: { x: number; y: number };
    lastAttack?: number;
    target?: any;
    [key: string]: any;
}

// State transition result
export interface StateTransitionResult {
    success: boolean;
    error?: string;
    previousState?: string;
    newState?: string;
}

/**
 * Abstract base class for all monster states
 * Defines common interface and transition validation
 */
export abstract class BaseMonsterState {
    abstract readonly name: string;
    abstract readonly validTransitions: string[];
    
    /**
     * Called when entering this state
     * @param context - State context with monster data and metadata
     */
    abstract onEnter(context: StateContext): void;
    
    /**
     * Called during state update loop
     * @param context - State context
     * @param deltaTime - Time since last update
     * @returns Suggested next state or null to stay in current state
     */
    abstract onUpdate(context: StateContext, deltaTime: number): string | null;
    
    /**
     * Called when leaving this state
     * @param context - State context
     */
    abstract onExit(context: StateContext): void;
    
    /**
     * Validate if transition to target state is allowed
     * @param targetState - Target state name
     * @returns true if transition is valid
     */
    canTransitionTo(targetState: string): boolean {
        return this.validTransitions.includes(targetState);
    }
}

/**
 * DORMANT STATE: Monster far from players, AI disabled for performance
 */
export class DormantState extends BaseMonsterState {
    readonly name = 'dormant';
    readonly validTransitions = ['idle', 'dying'];
    
    onEnter(context: StateContext): void {
        // Clear movement and target when going dormant
        context.monster.velocity = { x: 0, y: 0 };
        context.monster.target = null;
    }
    
    onUpdate(context: StateContext, deltaTime: number): string | null {
        // Dormant monsters don't update - they're awakened externally
        // when players come within range
        return null;
    }
    
    onExit(context: StateContext): void {
        // Monster waking up from dormancy
    }
}

/**
 * IDLE STATE: Monster near players, random wandering behavior
 */
export class IdleState extends BaseMonsterState {
    readonly name = 'idle';
    readonly validTransitions = ['chasing', 'dormant', 'stunned', 'dying'];
    
    onEnter(context: StateContext): void {
        // Clear any previous target
        context.monster.target = null;
        context.monster.velocity = { x: 0, y: 0 };
    }
    
    onUpdate(context: StateContext, deltaTime: number): string | null {
        // Server handles aggro detection and transitions to chasing
        // Client-side idle state just maintains visual state
        return null;
    }
    
    onExit(context: StateContext): void {
        // Leaving idle state
    }
}

/**
 * CHASING STATE: Monster pursuing target player
 */
export class ChasingState extends BaseMonsterState {
    readonly name = 'chasing';
    readonly validTransitions = ['attacking', 'idle', 'dormant', 'stunned', 'dying'];
    
    onEnter(context: StateContext): void {
        // Set target from context if provided
        if (context.target) {
            context.monster.target = context.target;
        }
    }
    
    onUpdate(context: StateContext, deltaTime: number): string | null {
        // Server handles pathfinding and attack range detection
        // Client-side chasing just maintains visual movement
        return null;
    }
    
    onExit(context: StateContext): void {
        // Leaving chase state
    }
}

/**
 * ATTACKING STATE: Monster executing attack sequence
 */
export class AttackingState extends BaseMonsterState {
    readonly name = 'attacking';
    readonly validTransitions = ['idle', 'chasing', 'stunned', 'dying'];
    
    onEnter(context: StateContext): void {
        // Stop movement during attack
        context.monster.velocity = { x: 0, y: 0 };
        // Server sets attack timing
        if (context.monster.lastAttack === undefined) {
            context.monster.lastAttack = Date.now();
        }
    }
    
    onUpdate(context: StateContext, deltaTime: number): string | null {
        // Server handles attack execution and cooldowns
        // Client-side attacking maintains visual state
        return null;
    }
    
    onExit(context: StateContext): void {
        // Attack sequence completed
    }
}

/**
 * STUNNED STATE: Monster temporarily disabled from damage
 */
export class StunnedState extends BaseMonsterState {
    readonly name = 'stunned';
    readonly validTransitions = ['idle', 'chasing', 'dying'];
    
    private stunEndTime: number = 0;
    
    onEnter(context: StateContext): void {
        // Stop all movement
        context.monster.velocity = { x: 0, y: 0 };
        
        // Set stun duration (default 360ms from combat system)
        const stunDuration = context.stunDuration || 360;
        this.stunEndTime = Date.now() + stunDuration;
        
        // Clear any ongoing attack
        context.monster.target = null;
    }
    
    onUpdate(context: StateContext, deltaTime: number): string | null {
        // Check if stun has expired
        if (Date.now() >= this.stunEndTime) {
            return 'idle'; // Return to idle when stun ends
        }
        return null; // Stay stunned
    }
    
    onExit(context: StateContext): void {
        // Stun effect ended
        this.stunEndTime = 0;
    }
}

/**
 * DYING STATE: Monster death animation and cleanup
 */
export class DyingState extends BaseMonsterState {
    readonly name = 'dying';
    readonly validTransitions = []; // Terminal state - no transitions allowed
    
    onEnter(context: StateContext): void {
        // Stop all movement and clear target
        context.monster.velocity = { x: 0, y: 0 };
        context.monster.target = null;
        context.monster.hp = 0;
    }
    
    onUpdate(context: StateContext, deltaTime: number): string | null {
        // Dying is terminal state - monster will be removed by manager
        return null;
    }
    
    onExit(context: StateContext): void {
        // Monster being removed from game
    }
    
    canTransitionTo(targetState: string): boolean {
        // Terminal state - no transitions allowed
        return false;
    }
}

/**
 * Monster State Machine - Manages state transitions and behavior
 */
export class MonsterStateMachine {
    private states: Map<string, BaseMonsterState>;
    private currentState: BaseMonsterState;
    private context: StateContext;
    
    constructor(monster: MonsterStateData) {
        this.context = { monster };
        
        // Initialize all available states
        this.states = new Map([
            ['dormant', new DormantState()],
            ['idle', new IdleState()],
            ['chasing', new ChasingState()],
            ['attacking', new AttackingState()],
            ['stunned', new StunnedState()],
            ['dying', new DyingState()]
        ]);
        
        // Start in idle state by default
        this.currentState = this.states.get('idle')!;
        this.currentState.onEnter(this.context);
    }
    
    /**
     * Get current state name
     */
    getCurrentState(): string {
        return this.currentState.name;
    }
    
    /**
     * Attempt to transition to a new state
     * @param targetStateName - Name of target state
     * @param contextData - Additional context for the transition
     * @returns Transition result with success/error information
     */
    transition(targetStateName: string, contextData: any = {}): StateTransitionResult {
        const targetState = this.states.get(targetStateName);
        
        if (!targetState) {
            return {
                success: false,
                error: `Unknown state: ${targetStateName}`
            };
        }
        
        if (!this.currentState.canTransitionTo(targetStateName)) {
            return {
                success: false,
                error: `Invalid transition from ${this.currentState.name} to ${targetStateName}`,
                previousState: this.currentState.name
            };
        }
        
        // Successful transition
        const previousStateName = this.currentState.name;
        
        // Exit current state
        this.currentState.onExit(this.context);
        
        // Update context with transition data
        Object.assign(this.context, contextData);
        
        // Enter new state
        this.currentState = targetState;
        this.currentState.onEnter(this.context);
        
        return {
            success: true,
            previousState: previousStateName,
            newState: targetStateName
        };
    }
    
    /**
     * Update current state
     * @param deltaTime - Time since last update
     * @returns True if state changed during update
     */
    update(deltaTime: number): boolean {
        const suggestedState = this.currentState.onUpdate(this.context, deltaTime);
        
        if (suggestedState && suggestedState !== this.currentState.name) {
            const result = this.transition(suggestedState);
            return result.success;
        }
        
        return false;
    }
    
    /**
     * Update monster data in context
     * @param newData - Updated monster data
     */
    updateContext(newData: Partial<MonsterStateData>): void {
        Object.assign(this.context.monster, newData);
    }
    
    /**
     * Get list of valid transitions from current state
     */
    getValidTransitions(): string[] {
        return [...this.currentState.validTransitions];
    }
    
    /**
     * Check if a specific transition is valid from current state
     * @param targetState - Target state name
     */
    canTransitionTo(targetState: string): boolean {
        return this.currentState.canTransitionTo(targetState);
    }
}

// Utility function to create state machine from legacy string state
export function createStateMachineFromLegacy(monster: MonsterStateData, legacyState: string): MonsterStateMachine {
    const stateMachine = new MonsterStateMachine(monster);
    
    // Transition to the legacy state if it's valid
    if (stateMachine.canTransitionTo(legacyState)) {
        stateMachine.transition(legacyState);
    } else {
        console.warn(`[MonsterStateMachine] Invalid legacy state: ${legacyState}, staying in idle`);
    }
    
    return stateMachine;
}