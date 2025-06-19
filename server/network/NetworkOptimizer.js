import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';

export class NetworkOptimizer {
    constructor() {
        this.lastSentState = new Map(); // Track last sent state per entity
        this.updatePriorities = new Map(); // Track update priorities
    }

    // Create delta updates by comparing current state with last sent state
    createDeltaUpdate(entityId, currentState, forceFullUpdate = false) {
        if (forceFullUpdate || !this.lastSentState.has(entityId)) {
            this.lastSentState.set(entityId, JSON.parse(JSON.stringify(currentState)));
            return { id: entityId, full: true, ...currentState };
        }

        const lastState = this.lastSentState.get(entityId);
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

    // Optimize state updates by batching and prioritizing
    optimizeStateUpdate(players, monsters, viewerPosition) {
        const optimizedState = {
            players: [],
            monsters: [],
            timestamp: Date.now()
        };

        // Process player updates
        for (const [id, player] of players) {
            const delta = this.createDeltaUpdate(`player_${id}`, player);
            if (delta) {
                optimizedState.players.push(delta);
            }
        }

        // Process monster updates with distance-based priority
        const monsterUpdates = [];
        for (const [id, monster] of monsters) {
            const distance = this.getDistance(viewerPosition, monster);
            
            // Skip very distant monsters
            if (distance > GAME_CONSTANTS.NETWORK.VIEW_DISTANCE) continue;
            
            const delta = this.createDeltaUpdate(`monster_${id}`, monster);
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

    // Reset tracking for disconnected entities
    clearEntity(entityId) {
        this.lastSentState.delete(entityId);
        this.updatePriorities.delete(entityId);
    }

    // Force full update for new connections
    resetClient(clientId) {
        // Clear all tracked states for this client
        for (const key of this.lastSentState.keys()) {
            if (key.startsWith(clientId)) {
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