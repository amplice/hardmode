/**
 * StateCache - Manages entity state caching for delta compression
 * 
 * Provides efficient state storage and merging for network updates.
 * Handles both full and delta updates with automatic cleanup.
 */
export class StateCache {
    constructor() {
        this.cache = new Map();
        this.lastFullUpdate = new Map(); // Track when each entity got full update
        this.updateStats = {
            fullUpdates: 0,
            deltaUpdates: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }

    /**
     * Get cached state for an entity
     * @param {string} entityId 
     * @returns {Object|null} Cached state or null if not found
     */
    get(entityId) {
        const state = this.cache.get(entityId);
        if (state) {
            this.updateStats.cacheHits++;
        } else {
            this.updateStats.cacheMisses++;
        }
        return state;
    }

    /**
     * Store full state for an entity
     * @param {string} entityId 
     * @param {Object} state - Complete entity state
     */
    setFull(entityId, state) {
        this.cache.set(entityId, { ...state });
        this.lastFullUpdate.set(entityId, Date.now());
        this.updateStats.fullUpdates++;
    }

    /**
     * Apply delta update to cached state
     * @param {string} entityId 
     * @param {Object} delta - Partial state update
     * @returns {Object} Merged state
     */
    applyDelta(entityId, delta) {
        const cached = this.cache.get(entityId);
        if (!cached) {
            // No cached state - this shouldn't happen but handle gracefully
            console.warn(`No cached state for entity ${entityId}, treating delta as full update`);
            this.setFull(entityId, delta);
            return delta;
        }

        // Merge delta with cached state, ensuring critical fields are preserved
        const merged = { ...cached, ...delta };
        
        // Validate merged state has essential fields
        if (!merged.id) merged.id = entityId.split('_').slice(1).join('_'); // Extract ID from entityId
        
        this.cache.set(entityId, merged);
        this.updateStats.deltaUpdates++;
        return merged;
    }

    /**
     * Remove entity from cache
     * @param {string} entityId 
     */
    remove(entityId) {
        this.cache.delete(entityId);
        this.lastFullUpdate.delete(entityId);
    }

    /**
     * Clear all cached state
     */
    clear() {
        this.cache.clear();
        this.lastFullUpdate.clear();
    }

    /**
     * Get number of cached entities
     */
    size() {
        return this.cache.size;
    }

    /**
     * Check if entity needs full update (e.g., been too long)
     * @param {string} entityId 
     * @param {number} maxAge - Maximum age in ms before requiring full update
     */
    needsFullUpdate(entityId, maxAge = 60000) {
        const lastUpdate = this.lastFullUpdate.get(entityId);
        if (!lastUpdate) return true;
        return Date.now() - lastUpdate > maxAge;
    }

    /**
     * Get compression statistics
     */
    getStats() {
        const total = this.updateStats.fullUpdates + this.updateStats.deltaUpdates;
        const compressionRatio = total > 0 ? 
            (this.updateStats.deltaUpdates / total * 100).toFixed(1) : 0;
        
        return {
            ...this.updateStats,
            compressionRatio: `${compressionRatio}%`,
            cacheSize: this.cache.size
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.updateStats = {
            fullUpdates: 0,
            deltaUpdates: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }
}