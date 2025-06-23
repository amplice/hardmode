/**
 * LatencyTracker - Measures and tracks network round-trip time (RTT) for lag compensation
 * 
 * This system continuously measures latency by sending ping requests to the server
 * and maintains a rolling average for smooth lag compensation calculations.
 */
export class LatencyTracker {
    constructor(networkClient) {
        this.networkClient = networkClient;
        this.socket = networkClient.socket;
        
        // Latency measurements
        this.currentRTT = 0;
        this.averageRTT = 0;
        this.minRTT = Infinity;
        this.maxRTT = 0;
        this.jitter = 0;
        
        // Ping tracking
        this.pingHistory = [];
        this.maxHistorySize = 20; // Keep last 20 pings for averaging
        this.pendingPings = new Map(); // sequence -> timestamp
        this.pingSequence = 0;
        
        // Timing
        this.lastPingTime = 0;
        this.pingInterval = 1000; // Ping every 1 second
        this.smoothingFactor = 0.1; // For exponential smoothing
        
        // Connection quality metrics
        this.packetLoss = 0;
        this.totalPings = 0;
        this.failedPings = 0;
        
        // Setup ping system
        this.setupPingHandlers();
        this.startPinging();
        
        console.log('[LatencyTracker] Initialized - starting RTT measurement');
    }
    
    /**
     * Setup socket handlers for ping/pong system
     */
    setupPingHandlers() {
        // Handle pong responses from server
        this.socket.on('pong', (data) => {
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
    startPinging() {
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
    stopPinging() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }
    
    /**
     * Send a ping request to the server
     */
    sendPing() {
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
     * @param {Object} data - Pong data {sequence, clientTime, serverTime}
     */
    handlePongResponse(data) {
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
     * @param {number} rtt - New RTT measurement in milliseconds
     */
    updateLatencyMeasurements(rtt) {
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
     * @param {number} clientSendTime - When client sent the ping
     * @param {number} serverTime - Server timestamp when it processed ping
     * @param {number} rtt - Round trip time
     */
    updateServerTimeOffset(clientSendTime, serverTime, rtt) {
        // Estimate when server processed our ping (halfway through RTT)
        const estimatedServerProcessTime = clientSendTime + (rtt / 2);
        const timeOffset = serverTime - estimatedServerProcessTime;
        
        // Store time offset for timestamp compensation
        this.serverTimeOffset = timeOffset;
    }
    
    /**
     * Get the current half-RTT (one-way latency estimate)
     * @returns {number} Half RTT in milliseconds
     */
    getOneWayLatency() {
        return this.averageRTT / 2;
    }
    
    /**
     * Get lag compensation time (how far back to look for hit detection)
     * @returns {number} Compensation time in milliseconds
     */
    getLagCompensationTime() {
        // Use average RTT plus some jitter buffer
        return this.averageRTT + (this.jitter * 2);
    }
    
    /**
     * Check if connection quality is good enough for smooth gameplay
     * @returns {Object} Connection quality assessment
     */
    getConnectionQuality() {
        let quality = 'excellent';
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
     * @param {number} clientTime - Client timestamp
     * @returns {number} Estimated server time
     */
    estimateServerTime(clientTime = performance.now()) {
        if (this.serverTimeOffset !== undefined) {
            return clientTime + this.serverTimeOffset;
        }
        return clientTime; // Fallback if no offset measured
    }
    
    /**
     * Compensate timestamp for network latency
     * @param {number} timestamp - Original timestamp
     * @returns {number} Lag-compensated timestamp
     */
    compensateTimestamp(timestamp) {
        return timestamp - this.getOneWayLatency();
    }
    
    /**
     * Get comprehensive latency statistics
     * @returns {Object} Complete latency stats
     */
    getStats() {
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
    reset() {
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
    destroy() {
        this.stopPinging();
        this.reset();
        console.log('[LatencyTracker] Destroyed');
    }
}