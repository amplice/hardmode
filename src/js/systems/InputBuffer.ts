/**
 * @fileoverview InputBuffer - Input sequencing and replay for client prediction
 * 
 * MIGRATION NOTES:
 * - Converted from InputBuffer.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 5
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for all input structures
 * - Preserved all sequencing and replay logic
 * 
 * ARCHITECTURE ROLE:
 * - Foundation of client-side prediction system
 * - Sequences all player inputs with timestamps for deterministic replay
 * - Stores input history for reconciliation rollback-and-replay
 * - Manages confirmed vs unconfirmed input tracking
 * 
 * SEQUENCE NUMBERING:
 * Each input gets monotonically increasing sequence number:
 * - Ensures deterministic order for replay operations
 * - Server acknowledges processing up to specific sequence
 * - Client can replay all unconfirmed inputs during reconciliation
 * - Prevents input loss during network corrections
 * 
 * PREDICTION INTEGRATION:
 * Core component of responsive movement system:
 * 1. Input captured with sequence number and timestamp
 * 2. MovementPredictor processes input for immediate visual feedback
 * 3. Input sent to server with sequence for validation
 * 4. If server disagrees, Reconciler replays unconfirmed inputs
 * 
 * INPUT CONFIRMATION SYSTEM:
 * Tracks which inputs server has processed:
 * - confirmProcessed() updates lastProcessedSequence
 * - Inputs before this sequence can be safely discarded
 * - Unconfirmed inputs kept for potential replay
 * - Memory management prevents unlimited growth
 * 
 * REPLAY FUNCTIONALITY:
 * getInputsAfter() enables rollback-and-replay:
 * - Returns all inputs after a specific sequence
 * - Sorted by sequence for deterministic replay order
 * - Used when server corrects client prediction
 * - Maintains input responsiveness during corrections
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Map operations for O(1) sequence lookup
 * - Periodic cleanup prevents memory bloat
 * - Conservative history size (1000 inputs ≈ 16 seconds)
 * - High-precision timestamps for accurate replay timing
 */

// Interface for raw input data
interface InputData {
    keys?: string[];
    facing?: string;
    deltaTime?: number;
}

// Interface for buffered input with sequence and timing
interface BufferedInput {
    sequence: number;
    timestamp: number;
    clientTime: number;
    data: {
        keys: string[];
        facing?: string;
        deltaTime: number;
    };
}

// Interface for network-ready input command
interface NetworkInput {
    type: 'playerInput';
    sequence: number;
    timestamp: number;
    data: {
        keys: string[];
        facing?: string;
        deltaTime: number;
    };
}

// Interface for buffer statistics
interface BufferStats {
    totalInputs: number;
    currentSequence: number;
    lastProcessed: number;
    unprocessedCount: number;
    memoryUsage: number;
}

export class InputBuffer {
    private maxHistorySize: number;
    private inputs: Map<number, BufferedInput>;
    private sequenceNumber: number;
    private lastProcessedSequence: number;

    constructor(maxHistorySize: number = 1000) {
        this.maxHistorySize = maxHistorySize;
        this.inputs = new Map(); // sequence -> input data
        this.sequenceNumber = 0;
        this.lastProcessedSequence = 0; // Last sequence confirmed by server
    }

    /**
     * Add a new input to the buffer
     * @returns The buffered input with sequence number
     */
    addInput(inputData: InputData, timestamp: number = Date.now()): BufferedInput {
        this.sequenceNumber++;

        const bufferedInput: BufferedInput = {
            sequence: this.sequenceNumber,
            timestamp: timestamp,
            clientTime: performance.now(), // High precision client time
            data: {
                keys: inputData.keys || [],
                facing: inputData.facing,
                deltaTime: inputData.deltaTime || 0.016
            }
        };

        this.inputs.set(this.sequenceNumber, bufferedInput);

        // Clean up old inputs to prevent memory leaks
        this.cleanup();

        return bufferedInput;
    }

    /**
     * Get all inputs after a specific sequence number
     * Used for replaying inputs during reconciliation
     */
    getInputsAfter(afterSequence: number): BufferedInput[] {
        const inputs: BufferedInput[] = [];
        for (const [sequence, input] of this.inputs) {
            if (sequence > afterSequence) {
                inputs.push(input);
            }
        }
        return inputs.sort((a, b) => a.sequence - b.sequence);
    }

    /**
     * Get a specific input by sequence number
     */
    getInput(sequence: number): BufferedInput | null {
        return this.inputs.get(sequence) || null;
    }

    /**
     * Mark a sequence as processed by the server
     * This allows us to clean up old inputs safely
     */
    confirmProcessed(sequence: number): void {
        this.lastProcessedSequence = Math.max(this.lastProcessedSequence, sequence);
    }

    /**
     * Get the current sequence number (for the next input)
     */
    getNextSequence(): number {
        return this.sequenceNumber + 1;
    }

    /**
     * Get the last processed sequence number
     */
    getLastProcessed(): number {
        return this.lastProcessedSequence;
    }

    /**
     * Clean up old inputs to prevent memory leaks
     * Only removes inputs that have been confirmed processed by server
     */
    private cleanup(): void {
        // Keep inputs for reconciliation, but don't let buffer grow infinitely
        const keepCount = Math.min(this.maxHistorySize, this.inputs.size);
        
        if (this.inputs.size > keepCount) {
            // Sort by sequence and remove oldest processed inputs
            const sequences = Array.from(this.inputs.keys()).sort((a, b) => a - b);
            const toRemove = sequences.slice(0, sequences.length - keepCount);
            
            for (const sequence of toRemove) {
                // Only remove if it's been processed by server or is very old
                if (sequence <= this.lastProcessedSequence) {
                    this.inputs.delete(sequence);
                }
            }
        }
    }

    /**
     * Clear all inputs (used when resetting or reconnecting)
     */
    clear(): void {
        this.inputs.clear();
        this.sequenceNumber = 0;
        this.lastProcessedSequence = 0;
    }

    /**
     * Get buffer statistics for debugging
     */
    getStats(): BufferStats {
        return {
            totalInputs: this.inputs.size,
            currentSequence: this.sequenceNumber,
            lastProcessed: this.lastProcessedSequence,
            unprocessedCount: this.sequenceNumber - this.lastProcessedSequence,
            memoryUsage: this.inputs.size * 64 // Rough estimate in bytes
        };
    }

    /**
     * Create a serializable input command for network transmission
     */
    createNetworkInput(inputData: InputData, timestamp: number = Date.now()): NetworkInput {
        const bufferedInput = this.addInput(inputData, timestamp);
        
        return {
            type: 'playerInput',
            sequence: bufferedInput.sequence,
            timestamp: bufferedInput.timestamp,
            data: {
                keys: inputData.keys || [],
                facing: inputData.facing,
                deltaTime: inputData.deltaTime || 0.016 // Default to ~60fps
            }
        };
    }
}