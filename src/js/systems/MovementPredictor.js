/**
 * MovementPredictor - Client-side movement prediction
 * 
 * This mirrors the server's movement logic exactly to predict where the player
 * will be when the server processes their inputs. This eliminates input lag
 * while maintaining server authority for anti-cheat.
 */
export class MovementPredictor {
    constructor() {
        this.predictedStates = new Map(); // sequence -> predicted state
        this.maxHistorySize = 1000;
        
        // Movement constants that must match server exactly
        this.classSpeeds = {
            bladedancer: 5,
            guardian: 3.5,
            hunter: 5,
            rogue: 6
        };
        
        this.worldBounds = {
            width: 100 * 64,  // 100 tiles * 64 pixels
            height: 100 * 64
        };
    }

    /**
     * Predict movement from an input command
     * @param {Object} currentState - Current player state {x, y, facing, class}
     * @param {Object} input - Input command {keys, facing, deltaTime, sequence}
     * @returns {Object} Predicted new state
     */
    predictMovement(currentState, input) {
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
        const movement = this.extractMovement(input.data.keys);
        
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
     * Apply movement to state
     * Must match server movement logic exactly
     * @param {Object} state - State to modify
     * @param {Object} movement - Movement vector {x, y}
     * @param {number} deltaTime - Frame delta time
     */
    applyMovement(state, movement, deltaTime) {
        // Get player stats for movement speed
        const baseSpeed = this.classSpeeds[state.class] || 5;
        const totalSpeed = baseSpeed; // TODO: Add bonuses when server supports them

        // Apply speed modifiers based on facing vs movement direction
        const speedModifier = this.calculateSpeedModifier(state, movement);
        const finalSpeed = totalSpeed * speedModifier;

        // Calculate new position (match server formula exactly)
        const velocity = {
            x: movement.x * finalSpeed * deltaTime * 60, // Convert to pixels per frame
            y: movement.y * finalSpeed * deltaTime * 60
        };

        // Update position
        state.x = Math.round(state.x + velocity.x);
        state.y = Math.round(state.y + velocity.y);

        // Apply world boundaries (match server)
        this.applyWorldBounds(state);
    }

    /**
     * Calculate speed modifier based on movement direction vs facing
     * Must match server logic
     * @param {Object} state - Player state
     * @param {Object} movement - Movement vector
     * @returns {number} Speed modifier
     */
    calculateSpeedModifier(state, movement) {
        // For now, use simple logic matching server
        // TODO: Implement facing-based speed modifiers when server does
        return 1.0;
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
            if (sequence <= confirmedSequence) {
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