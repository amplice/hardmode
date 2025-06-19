// Client-side state reconciliation for smooth multiplayer
export class StateReconciler {
    constructor() {
        this.serverState = new Map();
        this.predictedState = new Map();
        this.inputSequence = 0;
        this.pendingInputs = [];
        this.lastServerUpdate = 0;
    }

    // Record player input for prediction
    recordInput(input) {
        input.sequence = ++this.inputSequence;
        input.timestamp = Date.now();
        this.pendingInputs.push(input);
        return input;
    }

    // Apply server state update and reconcile with predictions
    reconcileState(playerId, serverUpdate) {
        this.lastServerUpdate = Date.now();
        
        // Update server authoritative state
        this.serverState.set(playerId, {
            x: serverUpdate.x,
            y: serverUpdate.y,
            hp: serverUpdate.hp,
            sequence: serverUpdate.lastProcessedInput || 0
        });

        // Remove acknowledged inputs
        if (serverUpdate.lastProcessedInput) {
            this.pendingInputs = this.pendingInputs.filter(
                input => input.sequence > serverUpdate.lastProcessedInput
            );
        }

        // Re-apply unacknowledged inputs for prediction
        let predictedPos = { x: serverUpdate.x, y: serverUpdate.y };
        for (const input of this.pendingInputs) {
            predictedPos = this.applyInput(predictedPos, input);
        }

        this.predictedState.set(playerId, predictedPos);
        return predictedPos;
    }

    // Apply input to position for prediction
    applyInput(position, input) {
        const newPos = { ...position };
        
        if (input.type === 'move') {
            newPos.x += input.dx || 0;
            newPos.y += input.dy || 0;
        }
        
        return newPos;
    }

    // Get interpolated position for smooth rendering
    getInterpolatedPosition(playerId, currentPosition, interpolationFactor = 0.1) {
        const serverPos = this.serverState.get(playerId);
        const predictedPos = this.predictedState.get(playerId);
        
        if (!serverPos) return currentPosition;
        
        const targetPos = predictedPos || serverPos;
        
        return {
            x: currentPosition.x + (targetPos.x - currentPosition.x) * interpolationFactor,
            y: currentPosition.y + (targetPos.y - currentPosition.y) * interpolationFactor
        };
    }

    // Check if we need to request full state sync
    needsFullSync() {
        return Date.now() - this.lastServerUpdate > 5000; // 5 seconds without update
    }

    // Clear all state (e.g., on disconnect)
    reset() {
        this.serverState.clear();
        this.predictedState.clear();
        this.pendingInputs = [];
        this.inputSequence = 0;
        this.lastServerUpdate = 0;
    }
}