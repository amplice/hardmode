/**
 * @fileoverview StateReconciler - Client-side state reconciliation for smooth multiplayer
 * 
 * MIGRATION NOTES:
 * - Converted from StateReconciler.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for state management
 * - Preserved all reconciliation and interpolation logic
 * 
 * ARCHITECTURE ROLE:
 * - Alternative reconciliation system to Reconciler.ts
 * - Manages server state updates and client predictions
 * - Provides interpolated positions for smooth rendering
 * - Tracks pending inputs for prediction replay
 */

// Interface for player input
interface PlayerInput {
    type: string;
    dx?: number;
    dy?: number;
    sequence?: number;
    timestamp?: number;
}

// Interface for position
interface Position {
    x: number;
    y: number;
}

// Interface for server state
interface ServerState extends Position {
    hp: number;
    sequence: number;
}

// Interface for server update
interface ServerUpdate extends Position {
    hp: number;
    lastProcessedInput?: number;
}

export class StateReconciler {
    private serverState: Map<string, ServerState>;
    private predictedState: Map<string, Position>;
    private inputSequence: number;
    private pendingInputs: PlayerInput[];
    private lastServerUpdate: number;

    constructor() {
        this.serverState = new Map();
        this.predictedState = new Map();
        this.inputSequence = 0;
        this.pendingInputs = [];
        this.lastServerUpdate = 0;
    }

    // Record player input for prediction
    recordInput(input: PlayerInput): PlayerInput {
        input.sequence = ++this.inputSequence;
        input.timestamp = Date.now();
        this.pendingInputs.push(input);
        return input;
    }

    // Apply server state update and reconcile with predictions
    reconcileState(playerId: string, serverUpdate: ServerUpdate): Position {
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
                input => input.sequence! > serverUpdate.lastProcessedInput!
            );
        }

        // Re-apply unacknowledged inputs for prediction
        let predictedPos: Position = { x: serverUpdate.x, y: serverUpdate.y };
        for (const input of this.pendingInputs) {
            predictedPos = this.applyInput(predictedPos, input);
        }

        this.predictedState.set(playerId, predictedPos);
        return predictedPos;
    }

    // Apply input to position for prediction
    private applyInput(position: Position, input: PlayerInput): Position {
        const newPos = { ...position };
        
        if (input.type === 'move') {
            newPos.x += input.dx || 0;
            newPos.y += input.dy || 0;
        }
        
        return newPos;
    }

    // Get interpolated position for smooth rendering
    getInterpolatedPosition(playerId: string, currentPosition: Position, interpolationFactor: number = 0.1): Position {
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
    needsFullSync(): boolean {
        return Date.now() - this.lastServerUpdate > 5000; // 5 seconds without update
    }

    // Clear all state (e.g., on disconnect)
    reset(): void {
        this.serverState.clear();
        this.predictedState.clear();
        this.pendingInputs = [];
        this.inputSequence = 0;
        this.lastServerUpdate = 0;
    }
}