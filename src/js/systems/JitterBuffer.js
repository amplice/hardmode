/**
 * JitterBuffer - Smooths out network jitter for unstable connections
 * 
 * This system buffers incoming network updates and releases them at a
 * steady rate to compensate for variable network latency and packet
 * arrival times. Essential for smooth gameplay on unstable connections.
 */
export class JitterBuffer {
    constructor(latencyTracker) {
        this.latencyTracker = latencyTracker;
        
        // Buffer configuration
        this.targetBufferSize = 3; // Number of updates to buffer
        this.maxBufferSize = 10; // Maximum buffer size before dropping
        this.minBufferSize = 1; // Minimum before releasing updates
        
        // Update buffers
        this.playerUpdates = new Map(); // playerId -> buffer of updates
        this.monsterUpdates = []; // Array of monster updates
        this.projectileUpdates = []; // Array of projectile updates
        
        // Timing
        this.lastReleaseTime = performance.now();
        this.releaseInterval = 33; // ~30Hz release rate (matches server)
        this.adaptiveBuffer = true; // Adjust buffer size based on jitter
        
        // Jitter measurement
        this.arrivalTimes = [];
        this.maxArrivalHistory = 20;
        this.measuredJitter = 0;
        
        console.log('[JitterBuffer] Initialized jitter buffer for network smoothing');
    }
    
    /**
     * Buffer a player state update
     * @param {Object} playerState - Player state from server
     */
    bufferPlayerUpdate(playerState) {
        const playerId = playerState.id || playerState.playerId;
        
        if (!this.playerUpdates.has(playerId)) {
            this.playerUpdates.set(playerId, []);
        }
        
        const buffer = this.playerUpdates.get(playerId);
        const timestamp = performance.now();
        
        // Add timestamp and buffer the update
        buffer.push({
            ...playerState,
            bufferTimestamp: timestamp
        });
        
        // Measure jitter
        this.measureJitter(timestamp);
        
        // Manage buffer size
        this.manageBufferSize(buffer);
        
        // Adaptive buffer sizing
        if (this.adaptiveBuffer) {
            this.adjustBufferSize();
        }
    }
    
    /**
     * Buffer monster state updates
     * @param {Array} monsterStates - Array of monster states
     */
    bufferMonsterUpdates(monsterStates) {
        const timestamp = performance.now();
        
        this.monsterUpdates.push({
            monsters: monsterStates,
            bufferTimestamp: timestamp
        });
        
        // Keep monster buffer manageable
        if (this.monsterUpdates.length > this.maxBufferSize) {
            this.monsterUpdates.shift(); // Remove oldest
        }
    }
    
    /**
     * Buffer projectile state updates
     * @param {Array} projectileStates - Array of projectile states
     */
    bufferProjectileUpdates(projectileStates) {
        const timestamp = performance.now();
        
        this.projectileUpdates.push({
            projectiles: projectileStates,
            bufferTimestamp: timestamp
        });
        
        // Keep projectile buffer manageable
        if (this.projectileUpdates.length > this.maxBufferSize) {
            this.projectileUpdates.shift(); // Remove oldest
        }
    }
    
    /**
     * Release buffered updates at steady intervals
     * @returns {Object} Updates to apply {players, monsters, projectiles}
     */
    releaseUpdates() {
        const now = performance.now();
        const timeSinceLastRelease = now - this.lastReleaseTime;
        
        // Only release updates at target interval
        if (timeSinceLastRelease < this.releaseInterval) {
            return null;
        }
        
        this.lastReleaseTime = now;
        
        const updates = {
            players: this.releasePlayerUpdates(),
            monsters: this.releaseMonsterUpdates(),
            projectiles: this.releaseProjectileUpdates()
        };
        
        // Only return if we have updates
        if (updates.players.length > 0 || updates.monsters || updates.projectiles) {
            return updates;
        }
        
        return null;
    }
    
    /**
     * Release player updates from buffer
     * @returns {Array} Array of player updates to apply
     */
    releasePlayerUpdates() {
        const updates = [];
        
        for (const [playerId, buffer] of this.playerUpdates) {
            if (buffer.length >= this.minBufferSize) {
                // Release the oldest update
                const update = buffer.shift();
                updates.push(update);
            }
        }
        
        return updates;
    }
    
    /**
     * Release monster updates from buffer
     * @returns {Array|null} Monster updates to apply or null
     */
    releaseMonsterUpdates() {
        if (this.monsterUpdates.length >= this.minBufferSize) {
            const update = this.monsterUpdates.shift();
            return update.monsters;
        }
        return null;
    }
    
    /**
     * Release projectile updates from buffer
     * @returns {Array|null} Projectile updates to apply or null
     */
    releaseProjectileUpdates() {
        if (this.projectileUpdates.length >= this.minBufferSize) {
            const update = this.projectileUpdates.shift();
            return update.projectiles;
        }
        return null;
    }
    
    /**
     * Measure network jitter from packet arrival times
     * @param {number} arrivalTime - When packet arrived
     */
    measureJitter(arrivalTime) {
        this.arrivalTimes.push(arrivalTime);
        
        // Keep history manageable
        if (this.arrivalTimes.length > this.maxArrivalHistory) {
            this.arrivalTimes.shift();
        }
        
        // Calculate jitter (variation in arrival times)
        if (this.arrivalTimes.length >= 3) {
            const intervals = [];
            for (let i = 1; i < this.arrivalTimes.length; i++) {
                intervals.push(this.arrivalTimes[i] - this.arrivalTimes[i-1]);
            }
            
            // Calculate standard deviation of intervals
            const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
            this.measuredJitter = Math.sqrt(variance);
        }
    }
    
    /**
     * Adjust buffer size based on measured jitter and latency
     */
    adjustBufferSize() {
        if (!this.latencyTracker) return;
        
        const connectionQuality = this.latencyTracker.getConnectionQuality();
        const jitter = this.latencyTracker.jitter || 0;
        
        // Adjust target buffer size based on connection quality
        if (connectionQuality.quality === 'poor' || jitter > 100) {
            this.targetBufferSize = Math.min(6, this.targetBufferSize + 1);
        } else if (connectionQuality.quality === 'excellent' && jitter < 20) {
            this.targetBufferSize = Math.max(2, this.targetBufferSize - 1);
        }
        
        // Log buffer adjustments occasionally
        if (Math.random() < 0.01) {
            console.log(`[JitterBuffer] Buffer size adjusted to ${this.targetBufferSize} (jitter: ${jitter.toFixed(1)}ms, quality: ${connectionQuality.quality})`);
        }
    }
    
    /**
     * Manage buffer size to prevent overflow
     * @param {Array} buffer - Buffer array to manage
     */
    manageBufferSize(buffer) {
        // Drop oldest updates if buffer is too large
        while (buffer.length > this.maxBufferSize) {
            const dropped = buffer.shift();
            console.warn(`[JitterBuffer] Dropped old update (buffer overflow)`);
        }
        
        // Skip buffering if we're too far ahead
        if (buffer.length > this.targetBufferSize * 2) {
            // Clear some buffer to catch up
            const toDrop = Math.floor(buffer.length * 0.3);
            for (let i = 0; i < toDrop; i++) {
                buffer.shift();
            }
            console.log(`[JitterBuffer] Dropped ${toDrop} updates to catch up`);
        }
    }
    
    /**
     * Check if we have enough buffered data for smooth playback
     * @returns {boolean} True if buffer is adequate
     */
    hasAdequateBuffer() {
        let totalBufferedUpdates = 0;
        
        for (const buffer of this.playerUpdates.values()) {
            totalBufferedUpdates += buffer.length;
        }
        
        totalBufferedUpdates += this.monsterUpdates.length;
        totalBufferedUpdates += this.projectileUpdates.length;
        
        return totalBufferedUpdates >= this.targetBufferSize;
    }
    
    /**
     * Get buffer statistics for debugging
     * @returns {Object} Buffer statistics
     */
    getStats() {
        const playerBufferSizes = {};
        let totalPlayerUpdates = 0;
        
        for (const [playerId, buffer] of this.playerUpdates) {
            playerBufferSizes[playerId] = buffer.length;
            totalPlayerUpdates += buffer.length;
        }
        
        return {
            targetBufferSize: this.targetBufferSize,
            maxBufferSize: this.maxBufferSize,
            minBufferSize: this.minBufferSize,
            releaseInterval: this.releaseInterval,
            measuredJitter: this.measuredJitter,
            adequateBuffer: this.hasAdequateBuffer(),
            buffers: {
                players: {
                    total: totalPlayerUpdates,
                    perPlayer: playerBufferSizes
                },
                monsters: this.monsterUpdates.length,
                projectiles: this.projectileUpdates.length
            }
        };
    }
    
    /**
     * Clear all buffers (for disconnection/reset)
     */
    clear() {
        this.playerUpdates.clear();
        this.monsterUpdates = [];
        this.projectileUpdates = [];
        this.arrivalTimes = [];
        this.measuredJitter = 0;
        this.lastReleaseTime = performance.now();
        
        console.log('[JitterBuffer] Cleared all buffers');
    }
    
    /**
     * Remove player from jitter buffer
     * @param {string} playerId - Player ID to remove
     */
    removePlayer(playerId) {
        this.playerUpdates.delete(playerId);
    }
    
    /**
     * Set target buffer size manually
     * @param {number} size - New target buffer size
     */
    setTargetBufferSize(size) {
        this.targetBufferSize = Math.max(1, Math.min(10, size));
        console.log(`[JitterBuffer] Target buffer size set to ${this.targetBufferSize}`);
    }
    
    /**
     * Enable or disable adaptive buffer sizing
     * @param {boolean} enabled - Whether to enable adaptive sizing
     */
    setAdaptiveBuffer(enabled) {
        this.adaptiveBuffer = enabled;
        console.log(`[JitterBuffer] Adaptive buffer sizing ${enabled ? 'enabled' : 'disabled'}`);
    }
}