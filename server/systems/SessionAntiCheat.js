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
        
        // Configuration - VERY LENIENT
        this.maxStrikes = 30; // Increased from 20 - more strikes before kick
        this.maxInputsPerSecond = 100; // Allow bursts up to 100 inputs/second
        this.inputGracePeriod = 3000; // Increased grace period at start (ms)
        this.maxTeleportDistance = 400; // More generous teleport distance
        this.minInputInterval = 8; // Minimum 8ms between inputs (125 inputs/sec theoretical max)
        
        // Class-based speed limits with generous buffers
        this.maxSpeedsPerFrame = {
            'bladedancer': 10,  // 5 * 2x buffer
            'guardian': 8,      // 3.5 * 2.3x buffer  
            'hunter': 10,       // 5 * 2x buffer
            'rogue': 12        // 6 * 2x buffer
        };
        
        // Movement ability distances (pixels) - very generous to avoid false positives
        this.abilityDistances = {
            'dash': 300,    // Increased from 200 - covers all dash abilities with buffer
            'jump': 250     // Increased from 150 - covers all jump abilities with buffer
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
     * Validate player movement for speed hacking and teleportation
     * @param {string} playerId - Player ID
     * @param {Object} oldPos - Previous position {x, y}
     * @param {Object} newPos - New position {x, y}
     * @param {string} playerClass - Player class
     * @param {number} deltaTime - Time since last update
     * @returns {boolean} True if movement is valid
     */
    validateMovement(playerId, oldPos, newPos, playerClass, deltaTime) {
        let playerData = this.getPlayerData(playerId);
        
        // Skip validation for first movement
        if (!playerData.lastPosition) {
            playerData.lastPosition = { x: newPos.x, y: newPos.y };
            return true;
        }
        
        // Calculate movement distance
        const dx = newPos.x - oldPos.x;
        const dy = newPos.y - oldPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if player is currently in a movement ability
        const isInAbility = this.abilityManager && this.abilityManager.activeAbilities.has(playerId);
        const abilityType = isInAbility ? this.getPlayerAbilityType(playerId) : null;
        
        // Determine max allowed distance
        let maxDistance;
        if (isInAbility && this.abilityDistances[abilityType]) {
            // Player is using movement ability - allow larger distance
            maxDistance = this.abilityDistances[abilityType];
        } else {
            // Normal movement - use class speed limits
            const maxSpeed = this.maxSpeedsPerFrame[playerClass] || 10;
            // Be very generous with deltaTime calculations to account for lag spikes
            const frames = Math.max(deltaTime * 30, 1);
            // Add minimum frame count to handle very small deltas
            const adjustedFrames = Math.max(frames, 0.5); // At least half a frame
            maxDistance = maxSpeed * adjustedFrames * 1.5; // 50% extra buffer
        }
        
        // Only flag very egregious violations - 2x over limit
        if (distance > maxDistance * 2.0) { // 100% over limit
            const violationType = isInAbility ? 'ability_teleport' : 'speed_hack';
            const context = isInAbility ? `during ${abilityType} ability` : 'normal movement';
            
            this.addViolation(playerId, violationType, 
                `Moved ${distance.toFixed(1)}px in ${deltaTime.toFixed(3)}s (max: ${maxDistance.toFixed(1)}px) ${context}`);
            
            return false;
        }
        
        // Update tracking
        playerData.lastPosition = { x: newPos.x, y: newPos.y };
        
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