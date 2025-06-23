/**
 * LagCompensation - Server-side lag compensation for fair gameplay
 * 
 * This system handles timestamp compensation for client inputs based on
 * measured network latency, ensuring fair hit detection and responsive
 * gameplay regardless of ping differences.
 */
export class LagCompensation {
    constructor() {
        // Player latency tracking
        this.playerLatencies = new Map(); // playerId -> latency data
        this.playerInputHistory = new Map(); // playerId -> input history
        this.worldStateHistory = []; // Historical world states for rollback
        
        // Configuration
        this.maxHistoryTime = 1000; // Keep 1 second of history
        this.maxCompensationTime = 200; // Don't compensate more than 200ms
        this.latencySmoothing = 0.1; // Exponential smoothing factor
        
        console.log('[LagCompensation] Initialized lag compensation system');
    }
    
    /**
     * Update player latency measurements
     * @param {string} playerId - Player ID
     * @param {number} rtt - Round trip time in milliseconds
     */
    updatePlayerLatency(playerId, rtt) {
        if (!this.playerLatencies.has(playerId)) {
            this.playerLatencies.set(playerId, {
                averageRTT: rtt,
                oneWayLatency: rtt / 2,
                lastUpdate: Date.now(),
                samples: 1
            });
        } else {
            const latencyData = this.playerLatencies.get(playerId);
            
            // Apply exponential smoothing
            latencyData.averageRTT = (latencyData.averageRTT * (1 - this.latencySmoothing)) + (rtt * this.latencySmoothing);
            latencyData.oneWayLatency = latencyData.averageRTT / 2;
            latencyData.lastUpdate = Date.now();
            latencyData.samples++;
        }
        
        console.log(`[LagCompensation] Updated latency for ${playerId}: ${this.getPlayerLatency(playerId).toFixed(1)}ms`);
    }
    
    /**
     * Get player's current one-way latency
     * @param {string} playerId - Player ID
     * @returns {number} One-way latency in milliseconds
     */
    getPlayerLatency(playerId) {
        const latencyData = this.playerLatencies.get(playerId);
        return latencyData ? latencyData.oneWayLatency : 0;
    }
    
    /**
     * Compensate input timestamp for network latency
     * @param {string} playerId - Player ID
     * @param {number} clientTimestamp - Original client timestamp
     * @param {number} serverReceiveTime - When server received the input
     * @returns {number} Lag-compensated timestamp
     */
    compensateInputTimestamp(playerId, clientTimestamp, serverReceiveTime) {
        const latency = this.getPlayerLatency(playerId);
        
        // Estimate when the input actually happened on the client
        // by subtracting the one-way latency from when we received it
        const compensatedTime = serverReceiveTime - latency;
        
        // Clamp compensation to reasonable limits
        const maxCompensation = Math.min(latency, this.maxCompensationTime);
        const actualCompensation = Math.max(0, Math.min(maxCompensation, serverReceiveTime - compensatedTime));
        
        return serverReceiveTime - actualCompensation;
    }
    
    /**
     * Store a snapshot of the world state for rollback
     * @param {Object} worldState - Current world state
     * @param {number} timestamp - Timestamp of the state
     */
    storeWorldState(worldState, timestamp = Date.now()) {
        this.worldStateHistory.push({
            timestamp: timestamp,
            state: JSON.parse(JSON.stringify(worldState)) // Deep copy
        });
        
        // Clean up old history
        const cutoffTime = timestamp - this.maxHistoryTime;
        this.worldStateHistory = this.worldStateHistory.filter(
            entry => entry.timestamp > cutoffTime
        );
    }
    
    /**
     * Get world state at a specific timestamp (for rollback)
     * @param {number} timestamp - Target timestamp
     * @returns {Object|null} World state at that time or null if not available
     */
    getWorldStateAt(timestamp) {
        // Find the closest state before or at the target timestamp
        let bestState = null;
        let smallestDiff = Infinity;
        
        for (const entry of this.worldStateHistory) {
            const diff = timestamp - entry.timestamp;
            if (diff >= 0 && diff < smallestDiff) {
                smallestDiff = diff;
                bestState = entry.state;
            }
        }
        
        return bestState;
    }
    
    /**
     * Validate that an input timestamp is reasonable
     * @param {string} playerId - Player ID
     * @param {number} clientTimestamp - Client timestamp
     * @param {number} serverReceiveTime - Server receive time
     * @returns {boolean} True if timestamp seems valid
     */
    validateInputTimestamp(playerId, clientTimestamp, serverReceiveTime) {
        const latency = this.getPlayerLatency(playerId);
        const timeDiff = Math.abs(serverReceiveTime - clientTimestamp);
        
        // Allow some leeway for clock differences and network jitter
        const maxAllowedDiff = (latency * 2) + 100; // RTT + 100ms buffer
        
        if (timeDiff > maxAllowedDiff) {
            console.warn(`[LagCompensation] Suspicious timestamp from ${playerId}: diff=${timeDiff}ms, expected<${maxAllowedDiff}ms`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Calculate lag compensation for hit detection
     * @param {string} shooterPlayerId - Player who fired
     * @param {string} targetPlayerId - Player being shot at
     * @param {number} actionTimestamp - When the action occurred
     * @returns {Object} Compensation data
     */
    calculateHitCompensation(shooterPlayerId, targetPlayerId, actionTimestamp) {
        const shooterLatency = this.getPlayerLatency(shooterPlayerId);
        const targetLatency = this.getPlayerLatency(targetPlayerId);
        
        // For hit detection, we need to rollback to when the shooter
        // actually performed the action according to their client
        const rollbackTime = shooterLatency;
        
        // The target should be at the position they were at when
        // the shooter fired on their screen
        const compensatedTimestamp = actionTimestamp - rollbackTime;
        
        return {
            rollbackTime: rollbackTime,
            compensatedTimestamp: compensatedTimestamp,
            shooterLatency: shooterLatency,
            targetLatency: targetLatency
        };
    }
    
    /**
     * Apply minimal lag compensation to movement input (simplified)
     * @param {Object} player - Player object
     * @param {Object} input - Input command
     * @param {number} deltaTime - Frame delta time
     * @returns {Object} Compensated movement data
     */
    compensateMovementInput(player, input, deltaTime) {
        const playerId = player.id;
        const latency = this.getPlayerLatency(playerId);
        
        // Only apply compensation for very high latency (>150ms)
        if (latency < 150) {
            return {
                compensatedDelta: deltaTime,
                compensation: 0
            };
        }
        
        // Very conservative compensation - max 50ms
        const compensation = Math.min(latency - 150, 50);
        const compensatedDelta = deltaTime + (compensation / 1000);
        
        return {
            compensatedDelta: compensatedDelta,
            compensation: compensation
        };
    }
    
    /**
     * Get comprehensive lag compensation statistics
     * @returns {Object} Statistics about lag compensation
     */
    getStats() {
        const stats = {
            trackedPlayers: this.playerLatencies.size,
            worldStateHistory: this.worldStateHistory.length,
            maxHistoryTime: this.maxHistoryTime,
            maxCompensationTime: this.maxCompensationTime,
            players: {}
        };
        
        for (const [playerId, latencyData] of this.playerLatencies) {
            stats.players[playerId] = {
                averageRTT: latencyData.averageRTT,
                oneWayLatency: latencyData.oneWayLatency,
                samples: latencyData.samples,
                lastUpdate: latencyData.lastUpdate
            };
        }
        
        return stats;
    }
    
    /**
     * Remove player from lag compensation tracking
     * @param {string} playerId - Player ID to remove
     */
    removePlayer(playerId) {
        this.playerLatencies.delete(playerId);
        this.playerInputHistory.delete(playerId);
        console.log(`[LagCompensation] Removed player ${playerId} from lag compensation`);
    }
    
    /**
     * Reset all lag compensation data
     */
    reset() {
        this.playerLatencies.clear();
        this.playerInputHistory.clear();
        this.worldStateHistory = [];
        console.log('[LagCompensation] Reset all lag compensation data');
    }
}