import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';

export class NetworkOptimizer {
    constructor() {
        this.lastSentState = new Map(); // Track last sent state per client per entity
        this.updatePriorities = new Map(); // Track update priorities
    }

    // Create delta updates by comparing current state with last sent state for specific client
    createDeltaUpdate(clientId, entityId, currentState, forceFullUpdate = false) {
        const stateKey = `${clientId}_${entityId}`;
        
        if (forceFullUpdate || !this.lastSentState.has(stateKey)) {
            this.lastSentState.set(stateKey, JSON.parse(JSON.stringify(currentState)));
            return { id: entityId, full: true, ...currentState };
        }

        const lastState = this.lastSentState.get(stateKey);
        const delta = { id: entityId };
        let hasChanges = false;

        // Check each property for changes
        for (const key in currentState) {
            if (this.hasPropertyChanged(lastState[key], currentState[key])) {
                delta[key] = currentState[key];
                lastState[key] = JSON.parse(JSON.stringify(currentState[key]));
                hasChanges = true;
            }
        }

        return hasChanges ? delta : null;
    }

    hasPropertyChanged(oldValue, newValue) {
        // Handle position changes with threshold
        if (typeof oldValue === 'number' && typeof newValue === 'number') {
            return Math.abs(oldValue - newValue) > 0.5;
        }
        
        // Handle object properties
        if (typeof oldValue === 'object' && typeof newValue === 'object') {
            return JSON.stringify(oldValue) !== JSON.stringify(newValue);
        }
        
        // Simple equality for other types
        return oldValue !== newValue;
    }

    // Optimize state updates by batching and prioritizing for specific client
    optimizeStateUpdate(clientId, players, monsters, viewerPosition) {
        const optimizedState = {
            players: [],
            monsters: [],
            timestamp: Date.now()
        };

        // Process player updates with delta compression
        for (const [id, player] of players) {
            const delta = this.createDeltaUpdate(clientId, `player_${id}`, player);
            if (delta) {
                optimizedState.players.push(delta);
            }
        }

        // Process monster updates with distance-based priority and delta compression
        const monsterUpdates = [];
        for (const [id, monster] of monsters) {
            const distance = this.getDistance(viewerPosition, monster);
            
            // Skip very distant monsters
            if (distance > GAME_CONSTANTS.NETWORK.VIEW_DISTANCE) continue;
            
            const delta = this.createDeltaUpdate(clientId, `monster_${id}`, monster);
            if (delta) {
                monsterUpdates.push({ delta, distance });
            }
        }

        // Sort by distance and include closest monsters first
        monsterUpdates.sort((a, b) => a.distance - b.distance);
        optimizedState.monsters = monsterUpdates.slice(0, 50).map(m => m.delta);

        return optimizedState;
    }

    getDistance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Reset tracking for disconnected entities across all clients
    clearEntity(entityId) {
        // Clear this entity for all clients
        for (const key of this.lastSentState.keys()) {
            if (key.includes(`_${entityId}`)) {
                this.lastSentState.delete(key);
            }
        }
        this.updatePriorities.delete(entityId);
    }

    // Force full update for new connections or clear all data for disconnected client
    resetClient(clientId) {
        // Clear all tracked states for this client
        for (const key of this.lastSentState.keys()) {
            if (key.startsWith(`${clientId}_`)) {
                this.lastSentState.delete(key);
            }
        }
    }

    // Get network statistics
    getNetworkStats() {
        return {
            trackedEntities: this.lastSentState.size,
            avgDeltaSize: this.calculateAverageDeltaSize()
        };
    }

    calculateAverageDeltaSize() {
        // This would track actual delta sizes in production
        return 0;
    }
}