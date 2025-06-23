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
        if (rollbackTime > 100) {\n            console.log(`[HitDetectionRollback] Large rollback: ${rollbackTime}ms for ${attackerId} -> ${targetId}`);\n        }\n        \n        return {\n            valid: hitResult.valid,\n            reason: hitResult.reason,\n            rollbackTime: rollbackTime,\n            historicalAttacker: attacker,\n            historicalTarget: target,\n            compensatedTime: compensatedTime\n        };\n    }\n    \n    /**\n     * Find target in historical state (player or monster)\n     * @param {Object} historicalState - Historical world state\n     * @param {string} targetId - Target ID to find\n     * @returns {Object|null} Target entity or null\n     */\n    findTarget(historicalState, targetId) {\n        // Check players first\n        let target = historicalState.players.find(p => p.id === targetId);\n        if (target) {\n            return { ...target, type: 'player' };\n        }\n        \n        // Check monsters\n        target = historicalState.monsters.find(m => m.id === targetId);\n        if (target) {\n            return { ...target, type: 'monster' };\n        }\n        \n        return null;\n    }\n    \n    /**\n     * Validate if attack hit target at specific positions\n     * @param {Object} attacker - Attacker position and data\n     * @param {Object} target - Target position and data\n     * @param {Object} attackData - Attack configuration\n     * @returns {Object} Validation result\n     */\n    validateHitAtPositions(attacker, target, attackData) {\n        // Calculate distance between attacker and target\n        const dx = target.x - attacker.x;\n        const dy = target.y - attacker.y;\n        const distance = Math.sqrt(dx * dx + dy * dy);\n        \n        // Get attack range based on attack type\n        const range = this.getAttackRange(attackData.type, attacker.class);\n        const effectiveRange = range + target.radius;\n        \n        // Basic range check\n        if (distance > effectiveRange) {\n            return {\n                valid: false,\n                reason: 'out_of_range',\n                distance: distance,\n                maxRange: effectiveRange\n            };\n        }\n        \n        // For directional attacks, check facing\n        if (this.isDirectionalAttack(attackData.type)) {\n            const attackAngle = Math.atan2(dy, dx);\n            const facingAngle = this.facingToRadians(attacker.facing);\n            const angleDiff = Math.abs(attackAngle - facingAngle);\n            const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);\n            \n            const maxAngle = this.getAttackAngle(attackData.type) / 2;\n            \n            if (normalizedDiff > maxAngle) {\n                return {\n                    valid: false,\n                    reason: 'wrong_direction',\n                    angleDiff: normalizedDiff,\n                    maxAngle: maxAngle\n                };\n            }\n        }\n        \n        return {\n            valid: true,\n            distance: distance,\n            maxRange: effectiveRange\n        };\n    }\n    \n    /**\n     * Get world state at specific timestamp\n     * @param {number} timestamp - Target timestamp\n     * @returns {Object|null} Historical world state or null\n     */\n    getWorldStateAt(timestamp) {\n        // Find the closest state before or at the target timestamp\n        let bestState = null;\n        let smallestDiff = Infinity;\n        \n        for (const state of this.worldHistory) {\n            const diff = timestamp - state.timestamp;\n            if (diff >= 0 && diff < smallestDiff) {\n                smallestDiff = diff;\n                bestState = state;\n            }\n        }\n        \n        return bestState;\n    }\n    \n    /**\n     * Get attack range for specific attack type and class\n     * @param {string} attackType - Type of attack\n     * @param {string} playerClass - Player class\n     * @returns {number} Attack range in pixels\n     */\n    getAttackRange(attackType, playerClass) {\n        // Base ranges by attack type\n        const baseRanges = {\n            'primary': 120,\n            'secondary': 150,\n            'melee': 100,\n            'ranged': 400\n        };\n        \n        // Class modifiers\n        const classModifiers = {\n            'hunter': 1.2, // Longer range\n            'guardian': 0.9, // Shorter range\n            'rogue': 1.0,\n            'bladedancer': 1.1\n        };\n        \n        const baseRange = baseRanges[attackType] || 120;\n        const modifier = classModifiers[playerClass] || 1.0;\n        \n        return baseRange * modifier;\n    }\n    \n    /**\n     * Get collision radius for player class\n     * @param {string} playerClass - Player class\n     * @returns {number} Collision radius in pixels\n     */\n    getPlayerCollisionRadius(playerClass) {\n        return 20; // Standard player collision radius\n    }\n    \n    /**\n     * Check if attack is directional (requires facing validation)\n     * @param {string} attackType - Attack type\n     * @returns {boolean} True if directional\n     */\n    isDirectionalAttack(attackType) {\n        const directionalAttacks = ['primary', 'secondary', 'melee'];\n        return directionalAttacks.includes(attackType);\n    }\n    \n    /**\n     * Get attack angle for directional attacks\n     * @param {string} attackType - Attack type\n     * @returns {number} Attack angle in radians\n     */\n    getAttackAngle(attackType) {\n        const angles = {\n            'primary': Math.PI / 3, // 60 degrees\n            'secondary': Math.PI / 2, // 90 degrees\n            'melee': Math.PI / 4 // 45 degrees\n        };\n        \n        return angles[attackType] || Math.PI / 3;\n    }\n    \n    /**\n     * Convert facing string to radians\n     * @param {string} facing - Facing direction\n     * @returns {number} Angle in radians\n     */\n    facingToRadians(facing) {\n        const directions = {\n            'e': 0,\n            'ne': Math.PI / 4,\n            'n': Math.PI / 2,\n            'nw': 3 * Math.PI / 4,\n            'w': Math.PI,\n            'sw': 5 * Math.PI / 4,\n            's': 3 * Math.PI / 2,\n            'se': 7 * Math.PI / 4\n        };\n        \n        return directions[facing] || 0;\n    }\n    \n    /**\n     * Get rollback statistics\n     * @returns {Object} Rollback statistics\n     */\n    getStats() {\n        return {\n            ...this.rollbackStats,\n            worldHistorySize: this.worldHistory.length,\n            maxHistoryTime: this.maxHistoryTime,\n            historyInterval: this.historyInterval,\n            hitValidationRate: this.rollbackStats.hitValidations > 0 ? \n                ((this.rollbackStats.hitValidations - this.rollbackStats.invalidHits) / this.rollbackStats.hitValidations * 100).toFixed(1) + '%' : '0%'\n        };\n    }\n    \n    /**\n     * Reset all rollback statistics\n     */\n    resetStats() {\n        this.rollbackStats = {\n            totalRollbacks: 0,\n            averageRollbackTime: 0,\n            maxRollbackTime: 0,\n            hitValidations: 0,\n            invalidHits: 0\n        };\n    }\n    \n    /**\n     * Clear world history (for reset/cleanup)\n     */\n    clearHistory() {\n        this.worldHistory = [];\n        this.lastHistoryStore = 0;\n        console.log('[HitDetectionRollback] Cleared world history');\n    }\n}"