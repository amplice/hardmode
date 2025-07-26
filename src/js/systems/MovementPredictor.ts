/**
 * @fileoverview MovementPredictor - Client-side prediction for responsive movement
 * 
 * MIGRATION NOTES:
 * - Converted from MovementPredictor.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 5
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for all state and input structures
 * - Preserved all prediction logic and latency compensation
 * 
 * ARCHITECTURE ROLE:
 * - Eliminates input lag by predicting player movement client-side
 * - Maintains server authority while providing responsive feel
 * - Stores prediction history for server reconciliation
 * - Mirrors server movement logic exactly for accurate predictions
 * 
 * CLIENT PREDICTION PATTERN:
 * Optimistic movement updates with server validation:
 * 1. Player input processed immediately on client
 * 2. MovementPredictor calculates predicted position
 * 3. Visual update applied instantly (responsive feel)
 * 4. Input sent to server with sequence number
 * 5. Server validates and returns authoritative state
 * 6. Reconciler corrects if prediction was wrong
 * 
 * PREDICTION ACCURACY:
 * Mirrors server logic exactly to minimize mispredictions:
 * - Identical movement speed calculations per class
 * - Same collision detection and world bounds
 * - Matching diagonal movement normalization
 * - Latency compensation for high-ping scenarios
 * 
 * SEQUENCE TRACKING:
 * Each prediction stored with sequence number for reconciliation:
 * - Map<sequence, predictedState> maintains prediction history
 * - Reconciler uses this history to replay mispredicted inputs
 * - Cleanup prevents memory growth from old predictions
 * 
 * ANTI-CHEAT INTEGRATION:
 * Client prediction never overrides server authority:
 * - Predictions are optimistic, not authoritative
 * - Server validates all movement and corrects violations
 * - Speed hacking and teleportation impossible
 * - Visual responsiveness without security compromise
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Conservative prediction window (10ms max adjustment)
 * - Efficient Map operations for sequence lookup
 * - Periodic cleanup prevents memory bloat
 * - Minimal prediction logic matching server exactly
 */

import { directionStringToAngleRadians } from '../utils/DirectionUtils.js';
import type { CharacterClass } from '../../../shared/types/GameTypes.js';

// Interface for player state used in predictions
interface PlayerState {
    x: number;
    y: number;
    facing: string;
    class: CharacterClass;
    level: number;
    moveSpeed?: number;
    sequence?: number;
    timestamp?: number;
}

// Interface for predicted state stored in history
interface PredictedState extends PlayerState {
    sequence: number;
    timestamp: number;
    clientTimestamp: number;
}

// Interface for input command
interface InputCommand {
    sequence: number;
    timestamp: number;
    data: {
        keys?: string[];
        facing?: string;
        deltaTime?: number;
    };
}

// Interface for movement vector
interface MovementVector {
    x: number;
    y: number;
}

// Interface for latency tracker (minimal interface to avoid circular dependencies)
interface LatencyTracker {
    getOneWayLatency(): number;
}

// Interface for collision mask (minimal interface)
interface CollisionMask {
    isWalkable(x: number, y: number): boolean;
    canMove(fromX: number, fromY: number, toX: number, toY: number): boolean;
}

// Class speeds mapped by character class
type ClassSpeedMap = Record<CharacterClass, number>;

export class MovementPredictor {
    private predictedStates: Map<number, PredictedState>;
    private maxHistorySize: number;
    private latencyTracker: LatencyTracker | null;
    private collisionMask: CollisionMask | null;
    private classSpeeds: ClassSpeedMap;
    private worldBounds: { width: number; height: number };
    private maxPredictionAdjustment: number;

    constructor(latencyTracker: LatencyTracker | null = null, collisionMask: CollisionMask | null = null) {
        this.predictedStates = new Map(); // sequence -> predicted state
        this.maxHistorySize = 1000;
        this.latencyTracker = latencyTracker;
        this.collisionMask = collisionMask;
        
        // Movement constants that must match server exactly
        this.classSpeeds = {
            bladedancer: 5,
            guardian: 3.5,
            hunter: 5,
            rogue: 6
        };
        
        this.worldBounds = {
            width: 500 * 64,  // Updated to 500x500 world (32000x32000 pixels)
            height: 500 * 64
        };
        
        // Minimal prediction adjustment for high latency
        this.maxPredictionAdjustment = 10; // Conservative max 10ms adjustment
    }
    
    /**
     * Calculate movement speed bonus based on level (matches server logic)
     */
    calculateMoveSpeedBonus(level: number): number {
        let bonus = 0;
        if (level >= 2) bonus += 0.25; // Level 2 bonus
        if (level >= 6) bonus += 0.25; // Level 6 bonus (total 0.5)
        return bonus;
    }

    /**
     * Predict movement from an input command
     */
    predictMovement(currentState: PlayerState, input: InputCommand): PlayerState {
        // Safety check for input data
        if (!input || !input.data) {
            console.warn('[MovementPredictor] Invalid input data:', input);
            return currentState;
        }
        
        // Create new predicted state (copy ALL relevant fields)
        const newState: PredictedState = {
            x: currentState.x,
            y: currentState.y,
            facing: input.data.facing || currentState.facing,
            sequence: input.sequence,
            timestamp: input.timestamp,
            class: currentState.class,
            level: currentState.level,           // CRITICAL: Include level for bonus calculation
            moveSpeed: currentState.moveSpeed,   // CRITICAL: Include moveSpeed to avoid fallback
            clientTimestamp: performance.now()
        };

        // Extract movement from keys (match server logic exactly)
        const movement = this.extractMovement(input.data.keys || []);
        
        // Apply movement if we have any
        if (movement.x !== 0 || movement.y !== 0) {
            this.applyMovement(newState, movement, input.data.deltaTime || (1/60));
        }

        // ALWAYS store predicted state for reconciliation (even when not moving)
        this.predictedStates.set(input.sequence, newState);
        
        // Debug: Log sequence gaps - disabled
        // if (Math.random() < 0.01) {
        //     console.log(`[MovementPredictor] Storing prediction for sequence ${input.sequence}`);
        // }

        // Clean up old states less aggressively
        if (this.predictedStates.size > this.maxHistorySize * 2) {
            this.cleanup();
        }

        return newState;
    }

    /**
     * Extract movement direction from pressed keys
     * Must match server logic exactly
     */
    extractMovement(keys: string[]): MovementVector {
        let x = 0;
        let y = 0;

        if (keys.includes('w')) y = -1;
        if (keys.includes('s')) y = 1;
        if (keys.includes('a')) x = -1;
        if (keys.includes('d')) x = 1;

        // Normalize diagonal movement (must match server)
        if (x !== 0 && y !== 0) {
            const diagonalFactor = 0.85;
            x *= diagonalFactor;
            y *= diagonalFactor;
        }

        return { x, y };
    }

    /**
     * Apply movement to state with latency-adjusted timing
     * Must match server movement logic exactly
     */
    applyMovement(state: PlayerState, movement: MovementVector, deltaTime: number): void {
        // Calculate speed the same way the server does for consistency
        const baseSpeed = this.classSpeeds[state.class] || 5;
        const moveSpeedBonus = this.calculateMoveSpeedBonus(state.level || 1);
        const calculatedSpeed = baseSpeed + moveSpeedBonus;
        
        // Use calculated speed, but prefer state.moveSpeed if available and reasonable
        const totalSpeed = (state.moveSpeed && state.moveSpeed > 0) ? state.moveSpeed : calculatedSpeed;

        // Apply speed modifiers based on facing vs movement direction
        const speedModifier = this.calculateSpeedModifier(state, movement);
        const finalSpeed = totalSpeed * speedModifier;

        // Adjust delta time based on latency for more accurate prediction
        const adjustedDeltaTime = this.getLatencyAdjustedDeltaTime(deltaTime);

        // Calculate new position (match server formula exactly)
        const velocity = {
            x: movement.x * finalSpeed * adjustedDeltaTime * 60, // Convert to pixels per frame
            y: movement.y * finalSpeed * adjustedDeltaTime * 60
        };

        // Calculate intended new position
        const newX = Math.round(state.x + velocity.x);
        const newY = Math.round(state.y + velocity.y);
        
        // CLIENT COLLISION CHECKING - matches server logic exactly
        // Server remains authoritative through reconciliation if any discrepancy
        if (this.collisionMask && this.collisionMask.canMove(state.x, state.y, newX, newY)) {
            // Movement is valid, update position
            state.x = newX;
            state.y = newY;
        } else {
            // Movement completely blocked - attempt sliding (same as server)
            const canMoveX = this.collisionMask ? this.collisionMask.canMove(state.x, state.y, newX, state.y) : false;
            const canMoveY = this.collisionMask ? this.collisionMask.canMove(state.x, state.y, state.x, newY) : false;
            
            // Only allow sliding if moving diagonally and one direction is clear
            if (Math.abs(velocity.x) > 0 && Math.abs(velocity.y) > 0) {
                if (canMoveX && !canMoveY) {
                    state.x = newX; // Slide along horizontal wall
                } else if (canMoveY && !canMoveX) {
                    state.y = newY; // Slide along vertical wall
                }
            }
            // If not diagonal or both directions blocked, position stays the same
        }

        // Apply world boundaries (match server)
        this.applyWorldBounds(state);
    }
    
    /**
     * Minimal latency adjustment for prediction (simplified)
     */
    getLatencyAdjustedDeltaTime(deltaTime: number): number {
        if (!this.latencyTracker) {
            return deltaTime;
        }
        
        const latency = this.latencyTracker.getOneWayLatency();
        
        // Only adjust for very high latency (>100ms) and very conservatively
        if (latency > 100) {
            const adjustment = Math.min((latency - 100) * 0.0005, 0.01); // Max 10ms adjustment
            return deltaTime + adjustment;
        }
        
        return deltaTime;
    }

    /**
     * Calculate speed modifier based on movement direction vs facing
     * Must match server logic
     */
    calculateSpeedModifier(state: PlayerState, movement: MovementVector): number {
        // Match server and client Player.js logic exactly for consistent prediction
        
        // Get facing angle from player's facing direction string
        const facingAngle = directionStringToAngleRadians(state.facing);
        
        // Get movement angle from movement vector (same as client's atan2(vy, vx))
        const movementAngle = (movement.x !== 0 || movement.y !== 0) ? 
            Math.atan2(movement.y, movement.x) : facingAngle;
        
        // Calculate angle difference (in radians) - exact same logic as client and server
        let angleDiff = Math.abs(facingAngle - movementAngle);
        // Normalize to be between 0 and π
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }
        
        // Apply direction-based speed modifiers - exact same thresholds
        let speedModifier = 1.0;
        
        if (angleDiff < Math.PI / 4) {
            // Moving forward (within 45 degrees of facing)
            speedModifier = 1.0;
        } else if (angleDiff > 3 * Math.PI / 4) {
            // Moving backward (more than 135 degrees from facing)
            speedModifier = 0.5;
        } else {
            // Strafing (between 45 and 135 degrees from facing)
            speedModifier = 0.7;
        }
        
        return speedModifier;
    }

    /**
     * Apply world boundary constraints
     * Must match server logic exactly
     */
    applyWorldBounds(state: PlayerState): void {
        state.x = Math.max(0, Math.min(this.worldBounds.width, state.x));
        state.y = Math.max(0, Math.min(this.worldBounds.height, state.y));
    }

    /**
     * Get a predicted state by sequence number
     */
    getPredictedState(sequence: number): PredictedState | null {
        return this.predictedStates.get(sequence) || null;
    }

    /**
     * Get all predicted states after a sequence number
     * Used for replaying inputs during reconciliation
     */
    getPredictedStatesAfter(afterSequence: number): PredictedState[] {
        const states: PredictedState[] = [];
        for (const [sequence, state] of this.predictedStates) {
            if (sequence > afterSequence) {
                states.push(state);
            }
        }
        return states.sort((a, b) => a.sequence - b.sequence);
    }

    /**
     * Remove predicted states up to a sequence number
     * Called when server confirms states
     */
    confirmStatesUpTo(confirmedSequence: number): void {
        let deletedCount = 0;
        for (const [sequence, state] of this.predictedStates) {
            // Keep the confirmed sequence for reconciliation, only delete older ones
            if (sequence < confirmedSequence) {
                this.predictedStates.delete(sequence);
                deletedCount++;
            }
        }
    }

    /**
     * Check if we have any unconfirmed predictions
     */
    hasUnconfirmedPredictions(): boolean {
        return this.predictedStates.size > 0;
    }

    /**
     * Get the latest predicted state
     */
    getLatestPrediction(): PredictedState | null {
        if (this.predictedStates.size === 0) return null;
        
        let latest: PredictedState | null = null;
        let latestSequence = -1;
        
        for (const [sequence, state] of this.predictedStates) {
            if (sequence > latestSequence) {
                latestSequence = sequence;
                latest = state;
            }
        }
        
        return latest;
    }

    /**
     * Clean up old predicted states to prevent memory leaks
     */
    cleanup(): void {
        if (this.predictedStates.size > this.maxHistorySize) {
            // Sort and remove oldest states
            const sequences = Array.from(this.predictedStates.keys()).sort((a, b) => a - b);
            const toRemove = sequences.slice(0, sequences.length - this.maxHistorySize);
            
            for (const sequence of toRemove) {
                this.predictedStates.delete(sequence);
            }
        }
    }

    /**
     * Clear all predicted states (for disconnection/reset)
     */
    clear(): void {
        this.predictedStates.clear();
    }

    /**
     * Get statistics for debugging
     */
    getStats(): {
        predictedStates: number;
        oldestSequence: number | null;
        newestSequence: number | null;
        memoryUsage: number;
    } {
        const sequences = Array.from(this.predictedStates.keys());
        return {
            predictedStates: this.predictedStates.size,
            oldestSequence: sequences.length > 0 ? Math.min(...sequences) : null,
            newestSequence: sequences.length > 0 ? Math.max(...sequences) : null,
            memoryUsage: this.predictedStates.size * 128 // Rough estimate
        };
    }

    /**
     * Validate that our physics match server expectations
     */
    validatePrediction(serverState: { x: number; y: number }, predictedState: { x: number; y: number }): boolean {
        const tolerance = 2; // pixels
        const dx = Math.abs(serverState.x - predictedState.x);
        const dy = Math.abs(serverState.y - predictedState.y);
        
        return dx <= tolerance && dy <= tolerance;
    }
}