/**
 * @fileoverview MessageBatcher - Batches multiple server messages per tick
 * 
 * This system reduces network packets by batching multiple messages sent
 * during the same server tick into a single network transmission.
 * 
 * OPTIMIZATION BENEFITS:
 * - Reduces TCP/UDP packet overhead
 * - Improves network efficiency for high-frequency updates
 * - Reduces socket.io protocol overhead
 * - Better utilization of network bandwidth
 * 
 * BATCHING STRATEGY:
 * - Queue messages during tick processing
 * - Flush all messages at end of tick
 * - Combine related messages when possible
 * - Maintain message ordering for consistency
 */

import type { Socket } from 'socket.io';

interface BatchedMessage {
    type: string;
    data: any;
}

interface SocketBatch {
    socket: Socket;
    messages: BatchedMessage[];
}

export class MessageBatcher {
    private batches: Map<string, SocketBatch>;
    private enabled: boolean;
    private flushCallback: (() => void) | null;
    
    constructor(enabled: boolean = true) {
        this.batches = new Map();
        this.enabled = enabled;
        this.flushCallback = null;
    }
    
    /**
     * Queue a message for batching
     */
    queueMessage(socket: Socket, type: string, data: any): void {
        if (!this.enabled) {
            // Direct send if batching disabled
            socket.emit(type, data);
            return;
        }
        
        const socketId = socket.id;
        
        if (!this.batches.has(socketId)) {
            this.batches.set(socketId, {
                socket,
                messages: []
            });
        }
        
        const batch = this.batches.get(socketId)!;
        
        // Special handling for state messages - merge them
        if (type === 'state') {
            const existingStateIndex = batch.messages.findIndex(m => m.type === 'state');
            if (existingStateIndex >= 0) {
                // Merge state updates (last one wins for conflicting fields)
                batch.messages[existingStateIndex].data = {
                    ...batch.messages[existingStateIndex].data,
                    ...data
                };
                return;
            }
        }
        
        batch.messages.push({ type, data });
    }
    
    /**
     * Send all batched messages
     */
    flush(): void {
        if (!this.enabled || this.batches.size === 0) {
            return;
        }
        
        for (const [socketId, batch] of this.batches) {
            if (batch.messages.length === 0) {
                continue;
            }
            
            // If only one message, send it directly
            if (batch.messages.length === 1) {
                const message = batch.messages[0];
                batch.socket.emit(message.type, message.data);
            } else {
                // Send as batched message
                batch.socket.emit('batch', {
                    messages: batch.messages,
                    timestamp: Date.now()
                });
            }
        }
        
        // Clear batches for next tick
        this.batches.clear();
        
        // Call flush callback if registered
        if (this.flushCallback) {
            this.flushCallback();
        }
    }
    
    /**
     * Register callback for flush events (for monitoring)
     */
    onFlush(callback: () => void): void {
        this.flushCallback = callback;
    }
    
    /**
     * Enable or disable batching
     */
    setEnabled(enabled: boolean): void {
        if (!enabled && this.batches.size > 0) {
            this.flush(); // Flush pending messages before disabling
        }
        this.enabled = enabled;
    }
    
    /**
     * Get statistics for monitoring
     */
    getStats(): { batchCount: number; messageCount: number; enabled: boolean } {
        let messageCount = 0;
        for (const batch of this.batches.values()) {
            messageCount += batch.messages.length;
        }
        
        return {
            batchCount: this.batches.size,
            messageCount,
            enabled: this.enabled
        };
    }
    
    /**
     * Clear all pending messages without sending
     */
    clear(): void {
        this.batches.clear();
    }
}