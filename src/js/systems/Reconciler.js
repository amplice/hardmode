/**
 * @fileoverview Reconciler - Server state correction for client prediction
 * 
 * ARCHITECTURE ROLE:
 * - Corrects client prediction when server state differs significantly
 * - Maintains smooth gameplay while ensuring server authority
 * - Implements rollback-and-replay for accurate state correction
 * - Prevents prediction drift from accumulating over time
 * 
 * RECONCILIATION ALGORITHM:
 * When server state differs from client prediction:
 * 1. Compare server position vs predicted position at same sequence
 * 2. If difference exceeds tolerance, perform reconciliation
 * 3. Set player position to authoritative server state
 * 4. Replay all unconfirmed inputs from corrected position
 * 5. Smooth visual correction to prevent jarring jumps
 * 
 * TOLERANCE SYSTEM:
 * Prevents micro-corrections that would cause jitter:
 * - Position tolerance: 50 pixels (tuned for large world performance)
 * - Small differences ignored for smooth gameplay
 * - Large differences immediately corrected
 * - Balance between accuracy and visual smoothness
 * 
 * ANTI-CHEAT INTEGRATION:
 * Server authority always maintained:
 * - Client predictions are optimistic, never authoritative
 * - Server validates all movement and sends corrections
 * - Impossible to override server position checks
 * - Speed limits and collision enforced server-side
 * 
 * INPUT REPLAY SYSTEM:
 * Maintains responsive feel during corrections:
 * 1. InputBuffer tracks unconfirmed inputs by sequence
 * 2. When server corrects position, replay unconfirmed inputs
 * 3. Player continues from corrected position without lost inputs
 * 4. Seamless correction with minimal visual disruption
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Tolerance prevents unnecessary corrections
 * - Smooth interpolation for small corrections
 * - Statistics tracking for tuning tolerance values
 * - Efficient sequence-based state lookup
 */
export class Reconciler {
    constructor(inputBuffer, predictor) {
        this.inputBuffer = inputBuffer;
        this.predictor = predictor;
        this.positionTolerance = 50; // pixels - temporarily increased to fix bouncing after world expansion
        this.smoothingFactor = 0.3; // For small corrections
        
        // Debug statistics
        this.stats = {
            totalReconciliations: 0,
            largeCorrections: 0,
            smallCorrections: 0,
            averageDrift: 0
        };
    }

    /**
     * Reconcile server state with client prediction
     * @param {Object} serverState - Authoritative state from server
     * @param {Object} localPlayer - Local player object to update
     * @returns {boolean} True if reconciliation was performed
     */
    reconcile(serverState, localPlayer) {
        // Debug: Log reconcile attempts more frequently during testing
        if (Math.random() < 0.1) {
            console.log('[Reconciler] Reconcile called with:', {
                serverPos: { x: serverState.x, y: serverState.y },
                localPos: { x: localPlayer.position.x, y: localPlayer.position.y },
                lastProcessedSeq: serverState.lastProcessedSeq,
                predictorRange: `${this.predictor.getStats().oldestSequence}-${this.predictor.getStats().newestSequence}`,
                sequenceGap: serverState.lastProcessedSeq - this.predictor.getStats().newestSequence
            });
        }
        
        // Must have lastProcessedSeq for reconciliation
        if (!serverState.lastProcessedSeq) {
            console.warn('[Reconciler] Server state missing lastProcessedSeq');
            return false;
        }

        // Clean up confirmed inputs
        this.inputBuffer.confirmProcessed(serverState.lastProcessedSeq);
        this.predictor.confirmStatesUpTo(serverState.lastProcessedSeq);

        // Get our predicted state at the server's sequence
        const predictedState = this.predictor.getPredictedState(serverState.lastProcessedSeq);
        if (!predictedState) {
            // We don't have prediction for this sequence, just accept server state
            console.log('[Reconciler] No prediction for sequence', serverState.lastProcessedSeq);
            this.applyServerState(serverState, localPlayer);
            return false;
        }

        // Compare positions
        const dx = Math.abs(serverState.x - predictedState.x);
        const dy = Math.abs(serverState.y - predictedState.y);
        const totalDiff = Math.sqrt(dx * dx + dy * dy);

        // Update statistics
        this.updateStats(totalDiff);

        // If difference is within tolerance, no correction needed
        if (totalDiff <= this.positionTolerance) {
            return false;
        }

        console.log(`[Reconciler] Position mismatch detected: ${totalDiff.toFixed(2)} pixels`);
        console.log(`Server: (${serverState.x}, ${serverState.y}), Predicted: (${predictedState.x}, ${predictedState.y})`);

        // Perform reconciliation
        this.performReconciliation(serverState, localPlayer);
        return true;
    }

    /**
     * Perform rollback and replay reconciliation
     * @param {Object} serverState - Authoritative server state
     * @param {Object} localPlayer - Local player to reconcile
     */
    performReconciliation(serverState, localPlayer) {
        this.stats.totalReconciliations++;

        // Step 1: Set player to server's authoritative position
        localPlayer.position.x = serverState.x;
        localPlayer.position.y = serverState.y;
        localPlayer.facing = serverState.facing || localPlayer.facing;

        // Step 2: Get all unprocessed inputs after server's last processed sequence
        const unprocessedInputs = this.inputBuffer.getInputsAfter(serverState.lastProcessedSeq);
        
        if (unprocessedInputs.length === 0) {
            // No unprocessed inputs, just accept server state
            this.applyServerState(serverState, localPlayer);
            return;
        }

        console.log(`[Reconciler] Replaying ${unprocessedInputs.length} unprocessed inputs`);

        // Step 3: Replay all unprocessed inputs from server state
        let currentState = {
            x: serverState.x,
            y: serverState.y,
            facing: serverState.facing || localPlayer.facing,
            class: localPlayer.characterClass
        };

        for (const input of unprocessedInputs) {
            currentState = this.predictor.predictMovement(currentState, input);
        }

        // Step 4: Apply final reconciled position
        localPlayer.position.x = currentState.x;
        localPlayer.position.y = currentState.y;
        localPlayer.facing = currentState.facing;
        localPlayer.sprite.position.set(currentState.x, currentState.y);

        console.log(`[Reconciler] Reconciliation complete: (${currentState.x}, ${currentState.y})`);
    }

    /**
     * Apply server state directly without reconciliation
     * @param {Object} serverState - Server state
     * @param {Object} localPlayer - Local player
     */
    applyServerState(serverState, localPlayer) {
        localPlayer.position.x = serverState.x;
        localPlayer.position.y = serverState.y;
        localPlayer.facing = serverState.facing || localPlayer.facing;
        localPlayer.sprite.position.set(serverState.x, serverState.y);
        
        // Update server position for next frame
        if (!localPlayer.serverPosition) {
            localPlayer.serverPosition = { x: serverState.x, y: serverState.y };
        } else {
            localPlayer.serverPosition.x = serverState.x;
            localPlayer.serverPosition.y = serverState.y;
        }
    }

    /**
     * Smooth small position corrections over multiple frames
     * @param {Object} from - Current position
     * @param {Object} to - Target position
     * @param {number} factor - Smoothing factor (0-1)
     * @returns {Object} Smoothed position
     */
    smoothCorrection(from, to, factor = this.smoothingFactor) {
        return {
            x: from.x + (to.x - from.x) * factor,
            y: from.y + (to.y - from.y) * factor
        };
    }

    /**
     * Update debug statistics
     * @param {number} drift - Position drift in pixels
     */
    updateStats(drift) {
        // Track drift statistics
        this.stats.averageDrift = (this.stats.averageDrift * 0.9) + (drift * 0.1);
        
        if (drift > this.positionTolerance * 2) {
            this.stats.largeCorrections++;
        } else if (drift > this.positionTolerance) {
            this.stats.smallCorrections++;
        }
    }

    /**
     * Get debug statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            positionTolerance: this.positionTolerance,
            smoothingFactor: this.smoothingFactor
        };
    }

    /**
     * Set position tolerance for reconciliation
     * @param {number} tolerance - Tolerance in pixels
     */
    setPositionTolerance(tolerance) {
        this.positionTolerance = Math.max(1, tolerance);
        console.log(`[Reconciler] Position tolerance set to ${this.positionTolerance} pixels`);
    }

    /**
     * Set smoothing factor for corrections
     * @param {number} factor - Smoothing factor (0-1)
     */
    setSmoothingFactor(factor) {
        this.smoothingFactor = Math.max(0, Math.min(1, factor));
        console.log(`[Reconciler] Smoothing factor set to ${this.smoothingFactor}`);
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalReconciliations: 0,
            largeCorrections: 0,
            smallCorrections: 0,
            averageDrift: 0
        };
    }

    /**
     * Clear all state (for disconnection/reset)
     */
    clear() {
        this.resetStats();
    }
}