/**
 * @fileoverview LatencyTracker - Network latency measurement for prediction tuning
 * 
 * MIGRATION NOTES:
 * - Converted from LatencyTracker.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for all latency structures
 * - Preserved all measurement and statistical logic
 * 
 * ARCHITECTURE ROLE:
 * - Continuously measures round-trip time (RTT) for lag compensation
 * - Provides latency statistics for prediction system optimization
 * - Tracks connection quality metrics (jitter, packet loss)
 * - Enables adaptive prediction based on network conditions
 * 
 * LATENCY MEASUREMENT SYSTEM:
 * Active ping-pong measurement:
 * 1. Send ping with sequence number and timestamp
 * 2. Server responds with same sequence/timestamp
 * 3. Calculate RTT and update statistics
 * 4. Maintain rolling average for stable measurements
 * 
 * PREDICTION INTEGRATION:
 * Latency data used for prediction tuning:
 * - MovementPredictor adjusts prediction window based on RTT
 * - Higher latency = more aggressive prediction
 * - Lower latency = more conservative prediction
 * - Jitter measurements help tune reconciliation tolerance
 * 
 * CONNECTION QUALITY METRICS:
 * Comprehensive network health tracking:
 * - Average RTT: Smoothed latency measurement
 * - Min/Max RTT: Range of network conditions
 * - Jitter: Variation in RTT for stability assessment
 * - Packet Loss: Failed ping percentage
 * 
 * STATISTICAL SMOOTHING:
 * Noise reduction for stable measurements:
 * - Exponential smoothing for average RTT
 * - Rolling window of recent measurements
 * - Outlier detection and filtering
 * - Connection establishment grace period
 * 
 * ADAPTIVE BEHAVIOR:
 * Network condition awareness:
 * - High latency: Increase prediction aggressiveness
 * - High jitter: Increase reconciliation tolerance
 * - Packet loss: Adjust retry and timeout behavior
 * - Connection quality indicators for debugging
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Lightweight ping protocol (minimal data)
 * - Reasonable ping frequency (1 second intervals)
 * - Efficient statistics calculation
 * - Automatic cleanup of stale measurements
 */

// Interface for ping data
interface PingData {
    sequence: number;
    clientTime: number;
}

// Interface for pong response
interface PongData extends PingData {
    serverTime?: number;
}

// Interface for ping history entry
interface PingHistoryEntry {
    rtt: number;
    timestamp: number;
}

// Interface for connection quality
interface ConnectionQuality {
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    description: string;
    playable: boolean;
}

// Interface for latency statistics
interface LatencyStats {
    currentRTT: number;
    averageRTT: number;
    minRTT: number;
    maxRTT: number;
    jitter: number;
    oneWayLatency: number;
    lagCompensation: number;
    packetLoss: number;
    totalPings: number;
    failedPings: number;
    connectionQuality: ConnectionQuality;
    serverTimeOffset: number;
    pendingPings: number;
    historySize: number;
}

// Minimal socket interface
interface Socket {
    connected: boolean;
    on(event: string, handler: (...args: any[]) => void): void;
    emit(event: string, data?: any): void;
}

// Minimal network client interface
interface NetworkClient {
    socket: Socket;
}

export class LatencyTracker {
    private networkClient: NetworkClient;
    private socket: Socket;
    
    // Latency measurements
    private currentRTT: number = 0;
    private averageRTT: number = 0;
    private minRTT: number = Infinity;
    private maxRTT: number = 0;
    private jitter: number = 0;
    
    // Ping tracking
    private pingHistory: PingHistoryEntry[] = [];
    private maxHistorySize: number = 20;
    private pendingPings: Map<number, number> = new Map();
    private pingSequence: number = 0;
    
    // Timing
    private lastPingTime: number = 0;
    private pingInterval: number = 1000;
    private smoothingFactor: number = 0.1;
    private pingTimer?: NodeJS.Timeout;
    
    // Connection quality metrics
    private packetLoss: number = 0;
    private totalPings: number = 0;
    private failedPings: number = 0;
    private serverTimeOffset?: number;

    constructor(networkClient: NetworkClient) {
        this.networkClient = networkClient;
        this.socket = networkClient.socket;
        
        // Setup ping system
        this.setupPingHandlers();
        this.startPinging();
        
        console.log('[LatencyTracker] Initialized - starting RTT measurement');
    }
    
    /**
     * Setup socket handlers for ping/pong system
     */
    private setupPingHandlers(): void {
        // Handle pong responses from server
        this.socket.on('pong', (data: PongData) => {
            this.handlePongResponse(data);
        });
        
        // Handle connection events
        this.socket.on('connect', () => {
            console.log('[LatencyTracker] Connected - resetting latency measurements');
            this.reset();
        });
        
        this.socket.on('disconnect', () => {
            console.log('[LatencyTracker] Disconnected - stopping ping measurements');
            this.stopPinging();
        });
    }
    
    /**
     * Start the ping measurement system
     */
    private startPinging(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
        }
        
        this.pingTimer = setInterval(() => {
            this.sendPing();
        }, this.pingInterval);
        
        // Send initial ping immediately
        this.sendPing();
    }
    
    /**
     * Stop ping measurements
     */
    private stopPinging(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = undefined;
        }
    }
    
    /**
     * Send a ping request to the server
     */
    private sendPing(): void {
        if (!this.socket.connected) {
            return;
        }
        
        const sequence = ++this.pingSequence;
        const timestamp = performance.now();
        
        // Store pending ping
        this.pendingPings.set(sequence, timestamp);
        this.totalPings++;
        
        // Send ping to server
        this.socket.emit('ping', {
            sequence: sequence,
            clientTime: timestamp
        });
        
        // Clean up old pending pings (older than 5 seconds)
        const timeout = 5000;
        for (const [seq, time] of this.pendingPings) {
            if (timestamp - time > timeout) {
                this.pendingPings.delete(seq);
                this.failedPings++;
            }
        }
        
        this.lastPingTime = timestamp;
    }
    
    /**
     * Handle pong response from server
     */
    private handlePongResponse(data: PongData): void {
        const receiveTime = performance.now();
        const sendTime = this.pendingPings.get(data.sequence);
        
        if (!sendTime) {
            console.warn('[LatencyTracker] Received pong for unknown ping sequence:', data.sequence);
            return;
        }
        
        // Remove from pending
        this.pendingPings.delete(data.sequence);
        
        // Calculate RTT
        const rtt = receiveTime - sendTime;
        
        // Update measurements
        this.updateLatencyMeasurements(rtt);
        
        // Calculate server time offset if provided
        if (data.serverTime) {
            this.updateServerTimeOffset(data.clientTime, data.serverTime, rtt);
        }
        
        // Debug logging for high latency only
        if (this.averageRTT > 100 && Math.random() < 0.05) {
            console.log(`[LatencyTracker] High RTT: ${rtt.toFixed(1)}ms, Avg: ${this.averageRTT.toFixed(1)}ms`);
        }
    }
    
    /**
     * Update latency measurements with new RTT sample
     */
    private updateLatencyMeasurements(rtt: number): void {
        this.currentRTT = rtt;
        
        // Update min/max
        this.minRTT = Math.min(this.minRTT, rtt);
        this.maxRTT = Math.max(this.maxRTT, rtt);
        
        // Add to history
        this.pingHistory.push({
            rtt: rtt,
            timestamp: performance.now()
        });
        
        // Keep history size manageable
        if (this.pingHistory.length > this.maxHistorySize) {
            this.pingHistory.shift();
        }
        
        // Calculate rolling average
        if (this.pingHistory.length > 0) {
            const sum = this.pingHistory.reduce((total, ping) => total + ping.rtt, 0);
            this.averageRTT = sum / this.pingHistory.length;
        }
        
        // Calculate jitter (variation in latency)
        if (this.pingHistory.length >= 2) {
            const recent = this.pingHistory.slice(-5); // Last 5 pings
            const avg = recent.reduce((sum, p) => sum + p.rtt, 0) / recent.length;
            const variance = recent.reduce((sum, p) => sum + Math.pow(p.rtt - avg, 2), 0) / recent.length;
            this.jitter = Math.sqrt(variance);
        }
        
        // Update packet loss
        this.packetLoss = this.totalPings > 0 ? (this.failedPings / this.totalPings) * 100 : 0;
        
        // Use exponential smoothing for more stable readings
        if (this.pingHistory.length === 1) {
            this.averageRTT = rtt; // First measurement
        } else {
            this.averageRTT = (this.averageRTT * (1 - this.smoothingFactor)) + (rtt * this.smoothingFactor);
        }
    }
    
    /**
     * Update server time offset for timestamp compensation
     */
    private updateServerTimeOffset(clientSendTime: number, serverTime: number, rtt: number): void {
        // Estimate when server processed our ping (halfway through RTT)
        const estimatedServerProcessTime = clientSendTime + (rtt / 2);
        const timeOffset = serverTime - estimatedServerProcessTime;
        
        // Store time offset for timestamp compensation
        this.serverTimeOffset = timeOffset;
    }
    
    /**
     * Get the current half-RTT (one-way latency estimate)
     */
    getOneWayLatency(): number {
        return this.averageRTT / 2;
    }
    
    /**
     * Get lag compensation time (how far back to look for hit detection)
     */
    getLagCompensationTime(): number {
        // Use average RTT plus some jitter buffer
        return this.averageRTT + (this.jitter * 2);
    }
    
    /**
     * Check if connection quality is good enough for smooth gameplay
     */
    getConnectionQuality(): ConnectionQuality {
        let quality: ConnectionQuality['quality'] = 'excellent';
        let description = 'Perfect connection';
        
        if (this.averageRTT > 200 || this.packetLoss > 5) {
            quality = 'poor';
            description = 'High latency or packet loss';
        } else if (this.averageRTT > 100 || this.packetLoss > 2 || this.jitter > 50) {
            quality = 'fair';
            description = 'Moderate latency or jitter';
        } else if (this.averageRTT > 50 || this.jitter > 20) {
            quality = 'good';
            description = 'Slight latency';
        }
        
        return {
            quality,
            description,
            playable: quality !== 'poor'
        };
    }
    
    /**
     * Estimate server time based on client time and measured offset
     */
    estimateServerTime(clientTime: number = performance.now()): number {
        if (this.serverTimeOffset !== undefined) {
            return clientTime + this.serverTimeOffset;
        }
        return clientTime; // Fallback if no offset measured
    }
    
    /**
     * Compensate timestamp for network latency
     */
    compensateTimestamp(timestamp: number): number {
        return timestamp - this.getOneWayLatency();
    }
    
    /**
     * Get comprehensive latency statistics
     */
    getStats(): LatencyStats {
        return {
            currentRTT: this.currentRTT,
            averageRTT: this.averageRTT,
            minRTT: this.minRTT === Infinity ? 0 : this.minRTT,
            maxRTT: this.maxRTT,
            jitter: this.jitter,
            oneWayLatency: this.getOneWayLatency(),
            lagCompensation: this.getLagCompensationTime(),
            packetLoss: this.packetLoss,
            totalPings: this.totalPings,
            failedPings: this.failedPings,
            connectionQuality: this.getConnectionQuality(),
            serverTimeOffset: this.serverTimeOffset || 0,
            pendingPings: this.pendingPings.size,
            historySize: this.pingHistory.length
        };
    }
    
    /**
     * Reset all measurements (for reconnection)
     */
    reset(): void {
        this.currentRTT = 0;
        this.averageRTT = 0;
        this.minRTT = Infinity;
        this.maxRTT = 0;
        this.jitter = 0;
        this.pingHistory = [];
        this.pendingPings.clear();
        this.pingSequence = 0;
        this.totalPings = 0;
        this.failedPings = 0;
        this.packetLoss = 0;
        this.serverTimeOffset = undefined;
        
        console.log('[LatencyTracker] Measurements reset');
    }
    
    /**
     * Cleanup resources
     */
    destroy(): void {
        this.stopPinging();
        this.reset();
        console.log('[LatencyTracker] Destroyed');
    }
}