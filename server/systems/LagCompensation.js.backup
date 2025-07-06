/**
 * LagCompensation - Simplified server-side lag compensation
 * 
 * Tracks player latency and provides minimal compensation for very high latency connections.
 * Simplified version - removed complex rollback features that were causing issues.
 */
export class LagCompensation {
    constructor() {
        // Player latency tracking
        this.playerLatencies = new Map(); // playerId -> latency data
        
        // Configuration
        this.latencySmoothing = 0.1; // Exponential smoothing factor
        
        console.log('[LagCompensation] Initialized simplified lag compensation system');
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
        
        // Only log high latency connections
        const latency = this.getPlayerLatency(playerId);
        if (latency > 100) {
            console.log(`[LagCompensation] High latency detected for ${playerId}: ${latency.toFixed(1)}ms`);
        }
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
     * Get basic lag compensation statistics
     * @returns {Object} Statistics about lag compensation
     */
    getStats() {
        const stats = {
            trackedPlayers: this.playerLatencies.size,
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
        console.log(`[LagCompensation] Removed player ${playerId} from lag compensation`);
    }
    
    /**
     * Reset all lag compensation data
     */
    reset() {
        this.playerLatencies.clear();
        console.log('[LagCompensation] Reset all lag compensation data');
    }
}