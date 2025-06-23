/**
 * Reconciler - Handles server reconciliation for client-side prediction
 * 
 * This is the most complex part of client prediction. It compares server
 * authoritative state with client predictions and corrects any discrepancies
 * by rolling back and replaying inputs.
 */
export class Reconciler {
    constructor(inputBuffer, movementPredictor) {
        this.inputBuffer = inputBuffer;
        this.predictor = movementPredictor;
        
        // Configuration
        this.positionTolerance = 5; // pixels - small differences are ignored
        this.smoothingEnabled = true;
        this.smoothingRate = 0.15; // How quickly to smooth corrections
        
        // State tracking
        this.lastReconciliationTime = 0;
        this.reconciliationCount = 0;
        this.correctionsMade = 0;
        
        // Smoothing state
        this.smoothingActive = false;
        this.smoothingOffset = { x: 0, y: 0 };
        this.targetPosition = null;
    }

    /**
     * Main reconciliation method - called when server state is received
     * @param {Object} serverState - Authoritative state from server
     * @param {Object} localPlayer - Local player entity
     * @returns {boolean} True if reconciliation was needed
     */
    reconcile(serverState, localPlayer) {
        if (!serverState.lastProcessedSeq) {
            return false; // No sequence info, can't reconcile
        }

        // Mark this sequence as confirmed by server
        this.inputBuffer.confirmProcessed(serverState.lastProcessedSeq);
        this.predictor.confirmStatesUpTo(serverState.lastProcessedSeq);

        // Get our predicted state at the server's last processed sequence
        const predictedState = this.predictor.getPredictedState(serverState.lastProcessedSeq);
        
        if (!predictedState) {
            // We don't have this prediction anymore, just accept server state
            this.applyServerState(serverState, localPlayer);
            return false;
        }

        // Compare positions
        const dx = Math.abs(serverState.x - predictedState.x);
        const dy = Math.abs(serverState.y - predictedState.y);
        const totalDiff = Math.sqrt(dx * dx + dy * dy);

        // Check if we need to reconcile
        if (totalDiff <= this.positionTolerance) {
            // Close enough, no reconciliation needed
            return false;
        }

        console.log(`[Reconciler] Mismatch detected! Diff: ${totalDiff.toFixed(1)}px at seq ${serverState.lastProcessedSeq}`);
        this.correctionsMade++;

        // Perform reconciliation
        this.performReconciliation(serverState, localPlayer);
        
        return true;
    }

    /**
     * Perform the actual reconciliation - rollback and replay
     * @param {Object} serverState - Server authoritative state
     * @param {Object} localPlayer - Local player entity
     */
    performReconciliation(serverState, localPlayer) {
        const startTime = performance.now();

        // Step 1: Rollback to server state
        const rollbackState = {
            x: serverState.x,
            y: serverState.y,
            facing: serverState.facing || localPlayer.facing,
            class: localPlayer.characterClass
        };

        // Step 2: Get all inputs after the server's last processed sequence
        const inputsToReplay = this.inputBuffer.getInputsAfter(serverState.lastProcessedSeq);
        
        console.log(`[Reconciler] Replaying ${inputsToReplay.length} inputs from seq ${serverState.lastProcessedSeq}`);

        // Step 3: Replay all inputs from the rollback state
        let currentState = rollbackState;
        for (const input of inputsToReplay) {
            currentState = this.predictor.predictMovement(currentState, input);
        }

        // Step 4: Apply the reconciled position
        if (this.smoothingEnabled && inputsToReplay.length > 0) {
            // Calculate offset for smooth correction
            const offsetX = localPlayer.position.x - currentState.x;
            const offsetY = localPlayer.position.y - currentState.y;
            
            // Only smooth if the correction isn't too large
            if (Math.abs(offsetX) < 100 && Math.abs(offsetY) < 100) {
                this.startSmoothing(offsetX, offsetY, currentState);
            } else {
                // Too large, snap immediately
                this.applyPosition(currentState, localPlayer);
            }
        } else {
            // No smoothing, apply immediately
            this.applyPosition(currentState, localPlayer);
        }

        const reconcileTime = performance.now() - startTime;
        this.reconciliationCount++;
        
        if (reconcileTime > 5) {
            console.warn(`[Reconciler] Slow reconciliation: ${reconcileTime.toFixed(1)}ms`);
        }
    }

    /**
     * Apply server state directly (no prediction data available)
     * @param {Object} serverState - Server state
     * @param {Object} localPlayer - Local player
     */
    applyServerState(serverState, localPlayer) {
        // Update server position tracking
        if (!localPlayer.serverPosition) {
            localPlayer.serverPosition = { x: serverState.x, y: serverState.y };
        } else {
            localPlayer.serverPosition.x = serverState.x;
            localPlayer.serverPosition.y = serverState.y;
        }

        // For now, don't modify visual position
        // This prevents snapping when we don't have prediction data
    }

    /**
     * Apply position to player entity
     * @param {Object} position - Position to apply
     * @param {Object} localPlayer - Local player entity
     */
    applyPosition(position, localPlayer) {
        localPlayer.position.x = position.x;
        localPlayer.position.y = position.y;
        localPlayer.facing = position.facing || localPlayer.facing;
        
        // Update sprite position
        if (localPlayer.sprite) {
            localPlayer.sprite.position.set(position.x, position.y);
        }
    }

    /**
     * Start smoothing correction over time
     * @param {number} offsetX - X offset to smooth
     * @param {number} offsetY - Y offset to smooth
     * @param {Object} targetPos - Target position
     */
    startSmoothing(offsetX, offsetY, targetPos) {
        this.smoothingActive = true;
        this.smoothingOffset = { x: offsetX, y: offsetY };
        this.targetPosition = { ...targetPos };
    }

    /**
     * Update smoothing each frame
     * @param {Object} localPlayer - Local player entity
     * @param {number} deltaTime - Frame delta time
     */
    updateSmoothing(localPlayer, deltaTime) {
        if (!this.smoothingActive || !this.targetPosition) {
            return;
        }

        // Reduce offset over time
        this.smoothingOffset.x *= (1 - this.smoothingRate);
        this.smoothingOffset.y *= (1 - this.smoothingRate);

        // Apply smoothed position
        const smoothedX = this.targetPosition.x + this.smoothingOffset.x;
        const smoothedY = this.targetPosition.y + this.smoothingOffset.y;

        localPlayer.position.x = smoothedX;
        localPlayer.position.y = smoothedY;
        
        if (localPlayer.sprite) {
            localPlayer.sprite.position.set(smoothedX, smoothedY);
        }

        // Stop smoothing when offset is small enough
        if (Math.abs(this.smoothingOffset.x) < 0.5 && Math.abs(this.smoothingOffset.y) < 0.5) {
            this.smoothingActive = false;
            this.applyPosition(this.targetPosition, localPlayer);
        }
    }

    /**
     * Check if we should reconcile (throttling)
     * @returns {boolean} True if reconciliation should proceed
     */
    shouldReconcile() {
        const now = performance.now();
        const timeSinceLastReconcile = now - this.lastReconciliationTime;
        
        // Don't reconcile more than 60 times per second
        if (timeSinceLastReconcile < 16) {
            return false;
        }

        this.lastReconciliationTime = now;
        return true;
    }

    /**
     * Get reconciliation statistics for debugging
     * @returns {Object} Stats object
     */
    getStats() {
        return {
            reconciliationCount: this.reconciliationCount,
            correctionsMade: this.correctionsMade,
            correctionRate: this.reconciliationCount > 0 ? 
                (this.correctionsMade / this.reconciliationCount * 100).toFixed(1) + '%' : '0%',
            smoothingActive: this.smoothingActive,
            smoothingOffset: this.smoothingActive ? 
                Math.sqrt(this.smoothingOffset.x ** 2 + this.smoothingOffset.y ** 2).toFixed(1) : 0
        };
    }

    /**
     * Reset reconciler state
     */
    reset() {
        this.reconciliationCount = 0;
        this.correctionsMade = 0;
        this.smoothingActive = false;
        this.smoothingOffset = { x: 0, y: 0 };
        this.targetPosition = null;
    }
}