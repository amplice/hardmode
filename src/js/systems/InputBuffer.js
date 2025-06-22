/**
 * InputBuffer - Stores and manages input commands with sequence numbers and timestamps
 * 
 * This is the foundation of client-side prediction. It buffers all player inputs
 * so they can be replayed during reconciliation if the server state differs
 * from the client's prediction.
 */
export class InputBuffer {
    constructor(maxHistorySize = 1000) {
        this.maxHistorySize = maxHistorySize;
        this.inputs = new Map(); // sequence -> input data
        this.sequenceNumber = 0;
        this.lastProcessedSequence = 0; // Last sequence confirmed by server
    }

    /**
     * Add a new input to the buffer
     * @param {Object} inputData - The input data (keys, facing, etc.)
     * @param {number} timestamp - Client timestamp when input was generated
     * @returns {Object} The buffered input with sequence number
     */
    addInput(inputData, timestamp = Date.now()) {
        this.sequenceNumber++;

        const bufferedInput = {
            sequence: this.sequenceNumber,
            timestamp: timestamp,
            clientTime: performance.now(), // High precision client time
            ...inputData
        };

        this.inputs.set(this.sequenceNumber, bufferedInput);

        // Clean up old inputs to prevent memory leaks
        this.cleanup();

        return bufferedInput;
    }

    /**
     * Get all inputs after a specific sequence number
     * Used for replaying inputs during reconciliation
     * @param {number} afterSequence - Get inputs after this sequence
     * @returns {Array} Array of input objects
     */
    getInputsAfter(afterSequence) {
        const inputs = [];
        for (const [sequence, input] of this.inputs) {
            if (sequence > afterSequence) {
                inputs.push(input);
            }
        }
        return inputs.sort((a, b) => a.sequence - b.sequence);
    }

    /**
     * Get a specific input by sequence number
     * @param {number} sequence - The sequence number to find
     * @returns {Object|null} The input object or null if not found
     */
    getInput(sequence) {
        return this.inputs.get(sequence) || null;
    }

    /**
     * Mark a sequence as processed by the server
     * This allows us to clean up old inputs safely
     * @param {number} sequence - Last sequence processed by server
     */
    confirmProcessed(sequence) {
        this.lastProcessedSequence = Math.max(this.lastProcessedSequence, sequence);
    }

    /**
     * Get the current sequence number (for the next input)
     * @returns {number} The next sequence number
     */
    getNextSequence() {
        return this.sequenceNumber + 1;
    }

    /**
     * Get the last processed sequence number
     * @returns {number} Last sequence confirmed by server
     */
    getLastProcessed() {
        return this.lastProcessedSequence;
    }

    /**
     * Clean up old inputs to prevent memory leaks
     * Only removes inputs that have been confirmed processed by server
     */
    cleanup() {
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
    clear() {
        this.inputs.clear();
        this.sequenceNumber = 0;
        this.lastProcessedSequence = 0;
    }

    /**
     * Get buffer statistics for debugging
     * @returns {Object} Statistics about the buffer
     */
    getStats() {
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
     * @param {Object} inputData - Raw input data
     * @param {number} timestamp - When input was generated
     * @returns {Object} Network-ready input command
     */
    createNetworkInput(inputData, timestamp = Date.now()) {
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