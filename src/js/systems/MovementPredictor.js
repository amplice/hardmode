/**
 * @fileoverview MovementPredictor - Client-side prediction for responsive movement
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

export class MovementPredictor {
    constructor(latencyTracker = null, collisionMask = null) {
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
     * Predict movement from an input command
     * @param {Object} currentState - Current player state {x, y, facing, class}
     * @param {Object} input - Input command {keys, facing, deltaTime, sequence}
     * @returns {Object} Predicted new state
     */
    predictMovement(currentState, input) {
        // Safety check for input data
        if (!input || !input.data) {
            console.warn('[MovementPredictor] Invalid input data:', input);
            return currentState;
        }
        
        // Create new predicted state
        const newState = {
            x: currentState.x,
            y: currentState.y,
            facing: input.data.facing || currentState.facing,
            sequence: input.sequence,
            timestamp: input.timestamp,
            class: currentState.class
        };

        // Extract movement from keys (match server logic exactly)
        const movement = this.extractMovement(input.data.keys || []);
        
        // Apply movement if we have any
        if (movement.x !== 0 || movement.y !== 0) {
            this.applyMovement(newState, movement, input.data.deltaTime || (1/60));
        }

        // ALWAYS store predicted state for reconciliation (even when not moving)
        this.predictedStates.set(input.sequence, {
            ...newState,
            clientTimestamp: performance.now()
        });
        
        // Debug: Log sequence gaps
        if (Math.random() < 0.01) {
            console.log(`[MovementPredictor] Storing prediction for sequence ${input.sequence}`);
        }

        // Clean up old states less aggressively
        if (this.predictedStates.size > this.maxHistorySize * 2) {
            this.cleanup();
        }

        return newState;
    }

    /**
     * Extract movement direction from pressed keys
     * Must match server logic exactly
     * @param {Array} keys - Array of pressed key names
     * @returns {Object} Movement vector {x, y}
     */
    extractMovement(keys) {
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
     * @param {Object} state - State to modify
     * @param {Object} movement - Movement vector {x, y}
     * @param {number} deltaTime - Frame delta time
     */
    applyMovement(state, movement, deltaTime) {
        // Use actual player moveSpeed (includes level bonuses) instead of base speed
        const totalSpeed = state.moveSpeed || this.classSpeeds[state.class] || 5;
        
        // DEBUG: Log speed calculations when player is level 6+
        if (state.level >= 2 && Math.random() < 0.1) {
            console.log(`[MovementPredictor] Level ${state.level}: moveSpeed=${state.moveSpeed}, classSpeeds=${this.classSpeeds[state.class]}, totalSpeed=${totalSpeed}`);
        }

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
        
        // TEMPORARILY DISABLE CLIENT COLLISION CHECKING
        // Let server be authoritative for collision detection to fix teleporting issue
        state.x = newX;
        state.y = newY;

        // Apply world boundaries (match server)
        this.applyWorldBounds(state);
    }
    
    /**
     * Minimal latency adjustment for prediction (simplified)
     * @param {number} deltaTime - Original delta time
     * @returns {number} Adjusted delta time
     */
    getLatencyAdjustedDeltaTime(deltaTime) {
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
     * @param {Object} state - Player state
     * @param {Object} movement - Movement vector
     * @returns {number} Speed modifier
     */
    calculateSpeedModifier(state, movement) {
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
     * @param {Object} state - State to constrain
     */
    applyWorldBounds(state) {
        state.x = Math.max(0, Math.min(this.worldBounds.width, state.x));
        state.y = Math.max(0, Math.min(this.worldBounds.height, state.y));
    }

    /**
     * Get a predicted state by sequence number
     * @param {number} sequence - Sequence number to find
     * @returns {Object|null} Predicted state or null
     */
    getPredictedState(sequence) {
        return this.predictedStates.get(sequence) || null;
    }

    /**
     * Get all predicted states after a sequence number
     * Used for replaying inputs during reconciliation
     * @param {number} afterSequence - Get states after this sequence
     * @returns {Array} Array of predicted states
     */
    getPredictedStatesAfter(afterSequence) {
        const states = [];
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
     * @param {number} confirmedSequence - Last confirmed sequence
     */
    confirmStatesUpTo(confirmedSequence) {
        console.log(`[MovementPredictor] Confirming states up to sequence ${confirmedSequence}`);
        let deletedCount = 0;
        for (const [sequence, state] of this.predictedStates) {
            // Keep the confirmed sequence for reconciliation, only delete older ones
            if (sequence < confirmedSequence) {
                this.predictedStates.delete(sequence);
                deletedCount++;
            }
        }
        console.log(`[MovementPredictor] Deleted ${deletedCount} confirmed predictions, ${this.predictedStates.size} remaining`);
    }

    /**
     * Check if we have any unconfirmed predictions
     * @returns {boolean} True if we have unconfirmed states
     */
    hasUnconfirmedPredictions() {
        return this.predictedStates.size > 0;
    }

    /**
     * Get the latest predicted state
     * @returns {Object|null} Latest predicted state or null
     */
    getLatestPrediction() {
        if (this.predictedStates.size === 0) return null;
        
        let latest = null;
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
    cleanup() {
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
    clear() {
        this.predictedStates.clear();
    }

    /**
     * Get statistics for debugging
     * @returns {Object} Debug statistics
     */
    getStats() {
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
     * @param {Object} serverState - Authoritative state from server
     * @param {Object} predictedState - Our predicted state
     * @returns {boolean} True if states match within tolerance
     */
    validatePrediction(serverState, predictedState) {
        const tolerance = 2; // pixels
        const dx = Math.abs(serverState.x - predictedState.x);
        const dy = Math.abs(serverState.y - predictedState.y);
        
        return dx <= tolerance && dy <= tolerance;
    }
}