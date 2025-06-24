/**
 * SessionAntiCheat - Simple session-based anti-cheat system
 * 
 * Focuses on catching obvious cheaters without false positives.
 * Uses warnings before kicks to be more forgiving.
 */
export class SessionAntiCheat {
    constructor(abilityManager) {
        this.abilityManager = abilityManager;
        
        // Player violation tracking (session-based)
        this.playerViolations = new Map(); // playerId -> { strikes, violations, lastInputTime, lastPosition }
        
        // Player movement tracking over time
        this.playerMovementHistory = new Map(); // playerId -> { positions: [{x, y, timestamp}], lastCheck }
        
        // Configuration - Simple and effective
        this.maxStrikes = 10; // Strikes before kick
        this.minInputInterval = 8; // Minimum 8ms between inputs (125 inputs/sec max)
        this.inputGracePeriod = 2000; // Grace period at start (ms)
        
        // Movement validation over time windows
        this.movementCheckInterval = 1000; // Check movement every 1 second
        this.maxDistancePerSecond = {
            'bladedancer': 300,  // 5 pixels/frame * 60fps
            'guardian': 210,     // 3.5 pixels/frame * 60fps
            'hunter': 300,       // 5 pixels/frame * 60fps
            'rogue': 360        // 6 pixels/frame * 60fps
        };
        
        console.log('[SessionAntiCheat] Initialized lenient anti-cheat system');
    }
    
    /**
     * Validate player input for timing and frequency
     * @param {string} playerId - Player ID
     * @param {Object} input - Input command
     * @returns {boolean} True if input is valid
     */
    validateInput(playerId, input) {
        const now = Date.now();
        let playerData = this.getPlayerData(playerId);
        
        // Grace period for new connections
        if (!playerData.firstInputTime) {
            playerData.firstInputTime = now;
        }
        
        const timeSinceFirstInput = now - playerData.firstInputTime;
        if (timeSinceFirstInput < this.inputGracePeriod) {
            // Skip validation during grace period
            playerData.lastInputTime = now;
            return true;
        }
        
        // Check input frequency - only catch extreme spam
        if (playerData.lastInputTime) {
            const timeDiff = now - playerData.lastInputTime;
            
            // Only flag if less than 10ms between inputs (>100 inputs/sec)
            if (timeDiff < this.minInputInterval) {
                // Extreme input spam detected
                this.addViolation(playerId, 'input_spam', 
                    `Extreme input frequency: ${timeDiff.toFixed(1)}ms between inputs`);
                return false;
            }
        }
        
        // Check timestamp validity (inputs can't be from future)
        if (input.timestamp && input.timestamp > now + 5000) { // 5 second tolerance
            this.addViolation(playerId, 'invalid_timestamp', 
                `Input timestamp too far in future: ${input.timestamp} vs ${now}`);
            return false;
        }
        
        // Update tracking
        playerData.lastInputTime = now;
        
        return true;
    }
    
    /**
     * Validate player movement over time windows
     * 
     * Instead of checking per-input, we track movement over 1-second windows.
     * This avoids false positives from batch processing while catching speed hacks.
     * 
     * @param {string} playerId - Player ID
     * @param {Object} oldPos - Previous position {x, y}
     * @param {Object} newPos - New position {x, y}
     * @param {string} playerClass - Player class
     * @param {number} deltaTime - Time since last update (unused in new approach)
     * @returns {boolean} True if movement is valid
     */
    validateMovement(playerId, oldPos, newPos, playerClass, deltaTime) {
        const now = Date.now();
        
        // Get or create movement history
        if (!this.playerMovementHistory.has(playerId)) {
            this.playerMovementHistory.set(playerId, {
                positions: [],
                lastCheck: now
            });
        }
        
        const history = this.playerMovementHistory.get(playerId);
        
        // Add current position to history
        history.positions.push({
            x: newPos.x,
            y: newPos.y,
            timestamp: now
        });
        
        // Clean up old positions (keep last 2 seconds)
        history.positions = history.positions.filter(pos => now - pos.timestamp < 2000);
        
        // Only check if enough time has passed
        if (now - history.lastCheck < this.movementCheckInterval) {
            return true; // Not time to check yet
        }
        
        // Perform time-based movement check
        history.lastCheck = now;
        
        // Find positions from ~1 second ago
        const oneSecondAgo = now - 1000;
        const oldPositions = history.positions.filter(pos => 
            pos.timestamp >= oneSecondAgo - 100 && pos.timestamp <= oneSecondAgo + 100
        );
        
        if (oldPositions.length === 0) {
            return true; // Not enough history yet
        }
        
        // Calculate distance traveled in the last second
        const oldPosition = oldPositions[0];
        const dx = newPos.x - oldPosition.x;
        const dy = newPos.y - oldPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Get max allowed distance per second for this class
        const maxDistance = this.maxDistancePerSecond[playerClass] || 300;
        
        // Add buffer for abilities and network latency
        const bufferMultiplier = 1.5;
        const allowedDistance = maxDistance * bufferMultiplier;
        
        // Check if player is in an ability (gets extra allowance)
        const isInAbility = this.abilityManager && this.abilityManager.activeAbilities.has(playerId);
        const finalAllowedDistance = isInAbility ? allowedDistance * 2 : allowedDistance;
        
        // Only flag if significantly over the limit
        if (distance > finalAllowedDistance) {
            this.addViolation(playerId, 'speed_hack', 
                `Moved ${distance.toFixed(1)}px in 1 second (max: ${finalAllowedDistance.toFixed(1)}px for ${playerClass})`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Get player ability type from ability manager
     * @param {string} playerId - Player ID
     * @returns {string|null} Ability type or null
     */
    getPlayerAbilityType(playerId) {
        if (!this.abilityManager || !this.abilityManager.activeAbilities.has(playerId)) {
            return null;
        }
        
        const ability = this.abilityManager.activeAbilities.get(playerId);
        
        // Log ability details for debugging
        console.log(`[SessionAntiCheat] Checking ability for ${playerId}:`, {
            type: ability.type,
            abilityKey: ability.abilityKey,
            abilityType: ability.abilityType
        });
        
        // Check multiple possible fields for ability type
        if (ability.type === 'dash' || ability.abilityType === 'dash' || 
            (ability.config && ability.config.archetype === 'dash_attack')) {
            return 'dash';
        }
        if (ability.type === 'jump' || ability.abilityType === 'jump' || 
            ability.abilityKey === 'secondary' || 
            (ability.config && ability.config.archetype === 'jump_attack')) {
            return 'jump';
        }
        
        // Default to 'dash' for any movement ability to be safe
        if (ability.config && (ability.config.dashDistance || ability.config.jumpDistance)) {
            return 'dash';
        }
        
        return ability.type || ability.abilityType || null;
    }
    
    /**
     * Add a violation for a player
     * @param {string} playerId - Player ID
     * @param {string} violationType - Type of violation
     * @param {string} details - Detailed violation information
     */
    addViolation(playerId, violationType, details) {
        let playerData = this.getPlayerData(playerId);
        
        playerData.strikes++;
        playerData.violations.push({
            type: violationType,
            details: details,
            timestamp: Date.now()
        });
        
        // Only log warnings for first few strikes
        if (playerData.strikes <= 3) {
            console.log(`[SessionAntiCheat] WARNING: Player ${playerId} - ${violationType}: ${details} (Strike ${playerData.strikes}/${this.maxStrikes})`);
        } else {
            console.warn(`[SessionAntiCheat] VIOLATION: Player ${playerId} - ${violationType}: ${details} (Strike ${playerData.strikes}/${this.maxStrikes})`);
        }
        
        // Check if player should be kicked
        if (playerData.strikes >= this.maxStrikes) {
            console.error(`[SessionAntiCheat] KICKING: Player ${playerId} exceeded max strikes (${this.maxStrikes})`);
            return 'kick';
        }
        
        return 'warning';
    }
    
    /**
     * Get or create player data
     * @param {string} playerId - Player ID
     * @returns {Object} Player violation data
     */
    getPlayerData(playerId) {
        if (!this.playerViolations.has(playerId)) {
            this.playerViolations.set(playerId, {
                strikes: 0,
                violations: [],
                lastInputTime: null,
                lastPosition: null,
                firstInputTime: null
            });
        }
        return this.playerViolations.get(playerId);
    }
    
    /**
     * Check if player should be kicked
     * @param {string} playerId - Player ID
     * @returns {boolean} True if player should be kicked
     */
    shouldKickPlayer(playerId) {
        const playerData = this.playerViolations.get(playerId);
        return playerData && playerData.strikes >= this.maxStrikes;
    }
    
    /**
     * Remove player from tracking (on disconnect)
     * @param {string} playerId - Player ID
     */
    removePlayer(playerId) {
        this.playerViolations.delete(playerId);
        this.playerMovementHistory.delete(playerId);
        console.log(`[SessionAntiCheat] Removed player ${playerId} from anti-cheat tracking`);
    }
    
    /**
     * Get anti-cheat statistics
     * @returns {Object} Statistics about violations and players
     */
    getStats() {
        const stats = {
            trackedPlayers: this.playerViolations.size,
            totalViolations: 0,
            playersByStrikes: {},
            violationTypes: {}
        };
        
        for (const [playerId, data] of this.playerViolations) {
            stats.totalViolations += data.violations.length;
            const strikes = data.strikes;
            stats.playersByStrikes[strikes] = (stats.playersByStrikes[strikes] || 0) + 1;
            
            for (const violation of data.violations) {
                stats.violationTypes[violation.type] = (stats.violationTypes[violation.type] || 0) + 1;
            }
        }
        
        return stats;
    }
}