/**
 * HitDetectionRollback - Server-side rollback system for fair hit detection
 * 
 * This system rewinds the world state to when the attacker fired on their
 * screen, ensuring fair hit detection regardless of network latency.
 * Essential for competitive gameplay and preventing "lag advantage".
 */
export class HitDetectionRollback {
    constructor(lagCompensation) {
        this.lagCompensation = lagCompensation;
        
        // World state history for rollback
        this.worldHistory = []; // Array of timestamped world states
        this.maxHistoryTime = 1000; // Keep 1 second of history
        this.historyInterval = 50; // Store state every 50ms
        
        // Rollback tracking
        this.rollbackStats = {
            totalRollbacks: 0,
            averageRollbackTime: 0,
            maxRollbackTime: 0,
            hitValidations: 0,
            invalidHits: 0
        };
        
        this.lastHistoryStore = 0;
        
        console.log('[HitDetectionRollback] Initialized rollback system for hit detection');
    }
    
    /**
     * Store current world state for potential rollback
     * @param {Object} gameState - Current game state
     * @param {Object} players - Current player states
     * @param {Object} monsters - Current monster states
     */
    storeWorldState(gameState, players, monsters) {
        const now = Date.now();
        
        // Only store at intervals to manage memory
        if (now - this.lastHistoryStore < this.historyInterval) {
            return;
        }
        
        this.lastHistoryStore = now;
        
        // Create deep copy of relevant state
        const worldState = {
            timestamp: now,
            players: this.serializePlayersForRollback(players),
            monsters: this.serializeMonstersForRollback(monsters)
        };
        
        this.worldHistory.push(worldState);
        
        // Clean up old history
        const cutoffTime = now - this.maxHistoryTime;
        this.worldHistory = this.worldHistory.filter(
            state => state.timestamp > cutoffTime
        );
    }
    
    /**
     * Serialize player states for rollback storage
     * @param {Map} players - Map of player objects
     * @returns {Array} Serialized player states
     */
    serializePlayersForRollback(players) {
        const serialized = [];
        
        for (const [id, player] of players) {
            if (player && player.hp > 0) {
                serialized.push({
                    id: id,
                    x: player.x,
                    y: player.y,
                    facing: player.facing,
                    hp: player.hp,
                    class: player.class,
                    radius: this.getPlayerCollisionRadius(player.class)
                });
            }
        }
        
        return serialized;
    }
    
    /**
     * Serialize monster states for rollback storage
     * @param {Map} monsters - Map of monster objects
     * @returns {Array} Serialized monster states
     */
    serializeMonstersForRollback(monsters) {
        const serialized = [];
        
        for (const [id, monster] of monsters) {
            if (monster && monster.hp > 0) {
                serialized.push({
                    id: id,
                    x: monster.x,
                    y: monster.y,
                    hp: monster.hp,
                    type: monster.type,
                    radius: monster.collisionRadius || 20
                });
            }
        }
        
        return serialized;
    }
    
    /**
     * Validate a hit using rollback to the attacker's timeline
     * @param {string} attackerId - Player who attacked
     * @param {string} targetId - Target being hit (player or monster)
     * @param {Object} attackData - Attack information
     * @param {number} clientTimestamp - When attack happened on client
     * @returns {Object} Validation result
     */
    validateHit(attackerId, targetId, attackData, clientTimestamp) {
        this.rollbackStats.hitValidations++;
        
        const attackerLatency = this.lagCompensation.getPlayerLatency(attackerId);
        
        // Calculate when the attack actually happened on the attacker's screen
        const compensatedTime = clientTimestamp - attackerLatency;
        
        // Find the world state at that time
        const historicalState = this.getWorldStateAt(compensatedTime);
        
        if (!historicalState) {
            console.warn(`[HitDetectionRollback] No historical state for time ${compensatedTime}`);
            this.rollbackStats.invalidHits++;
            return { valid: false, reason: 'no_historical_state' };
        }
        
        // Get attacker and target positions at that time
        const attacker = historicalState.players.find(p => p.id === attackerId);
        const target = this.findTarget(historicalState, targetId);
        
        if (!attacker || !target) {
            this.rollbackStats.invalidHits++;
            return { valid: false, reason: 'entities_not_found' };
        }
        
        // Validate the hit at the historical positions
        const hitResult = this.validateHitAtPositions(attacker, target, attackData);
        
        // Update stats
        this.rollbackStats.totalRollbacks++;
        const rollbackTime = Date.now() - compensatedTime;
        this.rollbackStats.averageRollbackTime = 
            (this.rollbackStats.averageRollbackTime * 0.9) + (rollbackTime * 0.1);
        this.rollbackStats.maxRollbackTime = Math.max(this.rollbackStats.maxRollbackTime, rollbackTime);
        
        // Log significant rollbacks
        if (rollbackTime > 100) {
            console.log(`[HitDetectionRollback] Large rollback: ${rollbackTime}ms for ${attackerId} -> ${targetId}`);
        }
        
        return {
            valid: hitResult.valid,
            reason: hitResult.reason,
            rollbackTime: rollbackTime,
            historicalAttacker: attacker,
            historicalTarget: target,
            compensatedTime: compensatedTime
        };
    }
    
    /**
     * Find target in historical state (player or monster)
     * @param {Object} historicalState - Historical world state
     * @param {string} targetId - Target ID to find
     * @returns {Object|null} Target entity or null
     */
    findTarget(historicalState, targetId) {
        // Check players first
        let target = historicalState.players.find(p => p.id === targetId);
        if (target) {
            return { ...target, type: 'player' };
        }
        
        // Check monsters
        target = historicalState.monsters.find(m => m.id === targetId);
        if (target) {
            return { ...target, type: 'monster' };
        }
        
        return null;
    }
    
    /**
     * Validate if attack hit target at specific positions
     * @param {Object} attacker - Attacker position and data
     * @param {Object} target - Target position and data
     * @param {Object} attackData - Attack configuration
     * @returns {Object} Validation result
     */
    validateHitAtPositions(attacker, target, attackData) {
        // Calculate distance between attacker and target
        const dx = target.x - attacker.x;
        const dy = target.y - attacker.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Get attack range based on attack type
        const range = this.getAttackRange(attackData.type, attacker.class);
        const effectiveRange = range + target.radius;
        
        // Basic range check
        if (distance > effectiveRange) {
            return {
                valid: false,
                reason: 'out_of_range',
                distance: distance,
                maxRange: effectiveRange
            };
        }
        
        // For directional attacks, check facing
        if (this.isDirectionalAttack(attackData.type)) {
            const attackAngle = Math.atan2(dy, dx);
            const facingAngle = this.facingToRadians(attacker.facing);
            const angleDiff = Math.abs(attackAngle - facingAngle);
            const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
            
            const maxAngle = this.getAttackAngle(attackData.type) / 2;
            
            if (normalizedDiff > maxAngle) {
                return {
                    valid: false,
                    reason: 'wrong_direction',
                    angleDiff: normalizedDiff,
                    maxAngle: maxAngle
                };
            }
        }
        
        return {
            valid: true,
            distance: distance,
            maxRange: effectiveRange
        };
    }
    
    /**
     * Get world state at specific timestamp
     * @param {number} timestamp - Target timestamp
     * @returns {Object|null} Historical world state or null
     */
    getWorldStateAt(timestamp) {
        // Find the closest state before or at the target timestamp
        let bestState = null;
        let smallestDiff = Infinity;
        
        for (const state of this.worldHistory) {
            const diff = timestamp - state.timestamp;
            if (diff >= 0 && diff < smallestDiff) {
                smallestDiff = diff;
                bestState = state;
            }
        }
        
        return bestState;
    }
    
    /**
     * Get attack range for specific attack type and class
     * @param {string} attackType - Type of attack
     * @param {string} playerClass - Player class
     * @returns {number} Attack range in pixels
     */
    getAttackRange(attackType, playerClass) {
        // Base ranges by attack type
        const baseRanges = {
            'primary': 120,
            'secondary': 150,
            'melee': 100,
            'ranged': 400
        };
        
        // Class modifiers
        const classModifiers = {
            'hunter': 1.2, // Longer range
            'guardian': 0.9, // Shorter range
            'rogue': 1.0,
            'bladedancer': 1.1
        };
        
        const baseRange = baseRanges[attackType] || 120;
        const modifier = classModifiers[playerClass] || 1.0;
        
        return baseRange * modifier;
    }
    
    /**
     * Get collision radius for player class
     * @param {string} playerClass - Player class
     * @returns {number} Collision radius in pixels
     */
    getPlayerCollisionRadius(playerClass) {
        return 20; // Standard player collision radius
    }
    
    /**
     * Check if attack is directional (requires facing validation)
     * @param {string} attackType - Attack type
     * @returns {boolean} True if directional
     */
    isDirectionalAttack(attackType) {
        const directionalAttacks = ['primary', 'secondary', 'melee'];
        return directionalAttacks.includes(attackType);
    }
    
    /**
     * Get attack angle for directional attacks
     * @param {string} attackType - Attack type
     * @returns {number} Attack angle in radians
     */
    getAttackAngle(attackType) {
        const angles = {
            'primary': Math.PI / 3, // 60 degrees
            'secondary': Math.PI / 2, // 90 degrees
            'melee': Math.PI / 4 // 45 degrees
        };
        
        return angles[attackType] || Math.PI / 3;
    }
    
    /**
     * Convert facing string to radians
     * @param {string} facing - Facing direction
     * @returns {number} Angle in radians
     */
    facingToRadians(facing) {
        const directions = {
            'e': 0,
            'ne': Math.PI / 4,
            'n': Math.PI / 2,
            'nw': 3 * Math.PI / 4,
            'w': Math.PI,
            'sw': 5 * Math.PI / 4,
            's': 3 * Math.PI / 2,
            'se': 7 * Math.PI / 4
        };
        
        return directions[facing] || 0;
    }
    
    /**
     * Get rollback statistics
     * @returns {Object} Rollback statistics
     */
    getStats() {
        return {
            ...this.rollbackStats,
            worldHistorySize: this.worldHistory.length,
            maxHistoryTime: this.maxHistoryTime,
            historyInterval: this.historyInterval,
            hitValidationRate: this.rollbackStats.hitValidations > 0 ? 
                ((this.rollbackStats.hitValidations - this.rollbackStats.invalidHits) / this.rollbackStats.hitValidations * 100).toFixed(1) + '%' : '0%'
        };
    }
    
    /**
     * Reset all rollback statistics
     */
    resetStats() {
        this.rollbackStats = {
            totalRollbacks: 0,
            averageRollbackTime: 0,
            maxRollbackTime: 0,
            hitValidations: 0,
            invalidHits: 0
        };
    }
    
    /**
     * Clear world history (for reset/cleanup)
     */
    clearHistory() {
        this.worldHistory = [];
        this.lastHistoryStore = 0;
        console.log('[HitDetectionRollback] Cleared world history');
    }
}