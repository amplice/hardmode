/**
 * @fileoverview LagCompensation - Server-side lag compensation with defensive programming
 * 
 * SAFETY MEASURES:
 * - Extensive parameter validation to prevent undefined/null crashes
 * - Runtime type checking for all inputs
 * - Graceful error handling with logging
 * - Default values for all operations
 * - No external dependencies to minimize risk
 * 
 * ARCHITECTURE ROLE:
 * - Tracks player latency and provides minimal compensation for high latency connections
 * - Simplified version - removed complex rollback features that were causing issues
 * - Focuses on movement compensation for very high latency players (>150ms)
 * - Provides telemetry and statistics for network monitoring
 * 
 * MIGRATION SAFETY:
 * - This TypeScript version implements identical behavior to the JavaScript version
 * - All method signatures match exactly
 * - Added defensive checks for undefined/null parameters
 * - Extensive logging for debugging potential issues
 */

// Latency tracking data for individual players
interface LatencyData {
    averageRTT: number;
    oneWayLatency: number;
    lastUpdate: number;
    samples: number;
}

// Movement compensation result
interface CompensationResult {
    compensatedDelta: number;
    compensation: number;
}

// Lag compensation statistics
interface LagCompensationStats {
    trackedPlayers: number;
    players: Record<string, LatencyData>;
}

// Player object interface (minimal for lag compensation)
interface Player {
    id: string;
}

// Input command interface (minimal for lag compensation)
interface InputCommand {
    timestamp?: number;
    sequence?: number;
}

export class LagCompensation {
    private playerLatencies: Map<string, LatencyData>;
    private latencySmoothing: number;

    constructor() {
        // Player latency tracking
        this.playerLatencies = new Map();
        
        // Configuration
        this.latencySmoothing = 0.1; // Exponential smoothing factor
        
        console.log('[LagCompensation] Initialized simplified lag compensation system');
        console.log('[LagCompensation] TypeScript version loaded with defensive programming');
    }
    
    /**
     * Update player latency measurements with defensive programming
     */
    updatePlayerLatency(playerId: string, rtt: number): void {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[LagCompensation] Invalid playerId provided to updatePlayerLatency:', playerId);
            return;
        }
        
        if (typeof rtt !== 'number' || isNaN(rtt) || rtt < 0) {
            console.warn('[LagCompensation] Invalid RTT provided to updatePlayerLatency:', rtt);
            return;
        }
        
        // Cap RTT at reasonable maximum to prevent abuse
        const cappedRTT = Math.min(rtt, 5000); // Max 5 seconds
        
        try {
            if (!this.playerLatencies.has(playerId)) {
                this.playerLatencies.set(playerId, {
                    averageRTT: cappedRTT,
                    oneWayLatency: cappedRTT / 2,
                    lastUpdate: Date.now(),
                    samples: 1
                });
            } else {
                const latencyData = this.playerLatencies.get(playerId);
                
                // Extra safety check - this should never be undefined but defend anyway
                if (!latencyData) {
                    console.warn('[LagCompensation] Latency data unexpectedly undefined for player:', playerId);
                    return;
                }
                
                // Apply exponential smoothing
                latencyData.averageRTT = (latencyData.averageRTT * (1 - this.latencySmoothing)) + (cappedRTT * this.latencySmoothing);
                latencyData.oneWayLatency = latencyData.averageRTT / 2;
                latencyData.lastUpdate = Date.now();
                latencyData.samples++;
            }
            
            // Only log high latency connections
            const latency = this.getPlayerLatency(playerId);
            if (latency > 100) {
                console.log(`[LagCompensation] High latency detected for ${playerId}: ${latency.toFixed(1)}ms`);
            }
        } catch (error) {
            console.error('[LagCompensation] Error in updatePlayerLatency:', error);
        }
    }
    
    /**
     * Get player's current one-way latency with defensive programming
     */
    getPlayerLatency(playerId: string): number {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[LagCompensation] Invalid playerId provided to getPlayerLatency:', playerId);
            return 0;
        }
        
        try {
            const latencyData = this.playerLatencies.get(playerId);
            return latencyData?.oneWayLatency ?? 0;
        } catch (error) {
            console.error('[LagCompensation] Error in getPlayerLatency:', error);
            return 0;
        }
    }
    
    /**
     * Apply minimal lag compensation to movement input with defensive programming
     */
    compensateMovementInput(player: Player, input: InputCommand, deltaTime: number): CompensationResult {
        // Defensive parameter validation
        if (!player || typeof player.id !== 'string') {
            console.warn('[LagCompensation] Invalid player provided to compensateMovementInput:', player);
            return { compensatedDelta: deltaTime || 0, compensation: 0 };
        }
        
        if (typeof deltaTime !== 'number' || isNaN(deltaTime) || deltaTime < 0) {
            console.warn('[LagCompensation] Invalid deltaTime provided to compensateMovementInput:', deltaTime);
            return { compensatedDelta: 0, compensation: 0 };
        }
        
        try {
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
        } catch (error) {
            console.error('[LagCompensation] Error in compensateMovementInput:', error);
            return { compensatedDelta: deltaTime, compensation: 0 };
        }
    }
    
    /**
     * Get basic lag compensation statistics with defensive programming
     */
    getStats(): LagCompensationStats {
        try {
            const stats: LagCompensationStats = {
                trackedPlayers: this.playerLatencies.size,
                players: {}
            };
            
            this.playerLatencies.forEach((latencyData, playerId) => {
                // Extra safety check
                if (latencyData && typeof playerId === 'string') {
                    stats.players[playerId] = {
                        averageRTT: latencyData.averageRTT || 0,
                        oneWayLatency: latencyData.oneWayLatency || 0,
                        samples: latencyData.samples || 0,
                        lastUpdate: latencyData.lastUpdate || 0
                    };
                }
            });
            
            return stats;
        } catch (error) {
            console.error('[LagCompensation] Error in getStats:', error);
            return { trackedPlayers: 0, players: {} };
        }
    }
    
    /**
     * Remove player from lag compensation tracking with defensive programming
     */
    removePlayer(playerId: string): void {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[LagCompensation] Invalid playerId provided to removePlayer:', playerId);
            return;
        }
        
        try {
            const hadPlayer = this.playerLatencies.has(playerId);
            this.playerLatencies.delete(playerId);
            
            if (hadPlayer) {
                console.log(`[LagCompensation] Removed player ${playerId} from lag compensation`);
            }
        } catch (error) {
            console.error('[LagCompensation] Error in removePlayer:', error);
        }
    }
    
    /**
     * Reset all lag compensation data with defensive programming
     */
    reset(): void {
        try {
            this.playerLatencies.clear();
            console.log('[LagCompensation] Reset all lag compensation data');
        } catch (error) {
            console.error('[LagCompensation] Error in reset:', error);
        }
    }
}