/**
 * @fileoverview SessionAntiCheat - Server-side cheat detection with defensive programming
 * 
 * SAFETY MEASURES:
 * - Extensive parameter validation to prevent undefined/null crashes
 * - Runtime type checking for all inputs
 * - Graceful error handling with logging
 * - Safe Map operations with existence checks
 * - Time calculation validation to prevent NaN/Infinity
 * - Safe access to external dependencies
 * 
 * ARCHITECTURE ROLE:
 * - Validates player inputs for speed/timing violations
 * - Tracks movement patterns to detect teleportation/speed hacks
 * - Monitors ability usage for cooldown violations
 * - Implements progressive punishment system (warnings → kicks)
 * 
 * ANTI-CHEAT STRATEGY:
 * Focus on obvious violations to avoid false positives:
 * - Input frequency limits prevent automation/scripting
 * - Movement speed validation per character class
 * - Ability cooldown enforcement server-side
 * - Grace periods and burst tolerance for network variations
 * 
 * MIGRATION SAFETY:
 * - This TypeScript version implements identical behavior to the JavaScript version
 * - All method signatures match exactly
 * - Added defensive checks for undefined/null parameters
 * - Extensive logging for debugging potential issues
 * - Safe time calculations to prevent crashes
 */

// Ability manager interface (minimal for anti-cheat)
interface AbilityManager {
    activeAbilities?: Map<string, ActiveAbility>;
}

// Active ability interface
interface ActiveAbility {
    type?: string;
    abilityType?: string;
    abilityKey?: string;
    config?: {
        archetype?: string;
        dashDistance?: number;
        jumpDistance?: number;
    };
}

// Position interface
interface Position {
    x: number;
    y: number;
}

// Position with timestamp
interface TimestampedPosition extends Position {
    timestamp: number;
}

// Input command interface
interface InputCommand {
    timestamp?: number;
    [key: string]: any;
}

// Violation record
interface ViolationRecord {
    type: string;
    details: string;
    timestamp: number;
}

// Player violation data
interface PlayerViolationData {
    strikes: number;
    violations: ViolationRecord[];
    lastInputTime: number | null;
    lastPosition: Position | null;
    firstInputTime: number | null;
    fastInputCount?: number;
}

// Movement history data
interface MovementHistory {
    positions: TimestampedPosition[];
    lastCheck: number;
}

// Anti-cheat statistics
interface AntiCheatStats {
    trackedPlayers: number;
    totalViolations: number;
    playersByStrikes: Record<number, number>;
    violationTypes: Record<string, number>;
}

// Movement speed limits per class
interface MovementSpeedLimits {
    bladedancer: number;
    guardian: number;
    hunter: number;
    rogue: number;
    [key: string]: number;
}

export class SessionAntiCheat {
    private abilityManager: AbilityManager | null;
    private playerViolations: Map<string, PlayerViolationData>;
    private playerMovementHistory: Map<string, MovementHistory>;
    
    // Configuration
    private maxStrikes: number;
    private minInputInterval: number;
    private inputGracePeriod: number;
    private inputBurstTolerance: number;
    private movementCheckInterval: number;
    private maxDistancePerSecond: MovementSpeedLimits;

    constructor(abilityManager: AbilityManager | null) {
        // Defensive parameter validation
        if (abilityManager && typeof abilityManager !== 'object') {
            console.warn('[SessionAntiCheat] Invalid abilityManager provided, using null');
            this.abilityManager = null;
        } else {
            this.abilityManager = abilityManager;
        }
        
        // Player violation tracking (session-based)
        this.playerViolations = new Map();
        
        // Player movement tracking over time
        this.playerMovementHistory = new Map();
        
        // Configuration - Simple and effective
        this.maxStrikes = 10;
        this.minInputInterval = 8;
        this.inputGracePeriod = 3000;
        this.inputBurstTolerance = 6;
        
        // Movement validation over time windows
        this.movementCheckInterval = 1000;
        this.maxDistancePerSecond = {
            'bladedancer': 300,
            'guardian': 210,
            'hunter': 300,
            'rogue': 360
        };
        
        console.log('[SessionAntiCheat] Initialized lenient anti-cheat system');
        console.log('[SessionAntiCheat] TypeScript version loaded with defensive programming');
    }
    
    /**
     * Validate player input for timing and frequency with defensive programming
     */
    validateInput(playerId: string, input: InputCommand): boolean {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[SessionAntiCheat] Invalid playerId provided to validateInput:', playerId);
            return false;
        }
        if (!input || typeof input !== 'object') {
            console.warn('[SessionAntiCheat] Invalid input provided to validateInput:', input);
            return false;
        }

        try {
            const now = Date.now();
            if (typeof now !== 'number' || isNaN(now)) {
                console.error('[SessionAntiCheat] Invalid timestamp from Date.now()');
                return false;
            }

            let playerData = this.getPlayerData(playerId);
            if (!playerData) {
                console.error('[SessionAntiCheat] Failed to get player data for:', playerId);
                return false;
            }
            
            // Use client timestamp if available and reasonable, otherwise use server time
            let inputTime = now;
            if (typeof input.timestamp === 'number' && !isNaN(input.timestamp)) {
                // Validate client timestamp is reasonable (not too far in past/future)
                const timeDiff = Math.abs(input.timestamp - now);
                if (timeDiff < 30000) { // Allow 30 second clock skew
                    inputTime = input.timestamp;
                }
            }
            
            // Grace period for new connections
            if (!playerData.firstInputTime) {
                playerData.firstInputTime = inputTime;
                playerData.fastInputCount = 0;
            }
            
            const timeSinceFirstInput = inputTime - (playerData.firstInputTime || inputTime);
            if (timeSinceFirstInput < this.inputGracePeriod) {
                // Skip validation during grace period
                playerData.lastInputTime = inputTime;
                return true;
            }
            
            // Check input frequency with burst tolerance
            if (typeof playerData.lastInputTime === 'number') {
                const timeDiff = inputTime - playerData.lastInputTime;
                if (typeof timeDiff !== 'number' || isNaN(timeDiff)) {
                    console.warn('[SessionAntiCheat] Invalid time difference calculation');
                    playerData.lastInputTime = inputTime;
                    return true;
                }
                
                // Track fast inputs
                if (timeDiff < this.minInputInterval) {
                    playerData.fastInputCount = (playerData.fastInputCount || 0) + 1;
                    
                    // Only flag if we've seen multiple fast inputs in a row
                    if (playerData.fastInputCount > this.inputBurstTolerance) {
                        this.addViolation(playerId, 'input_spam', 
                            `Sustained input spam: ${timeDiff.toFixed(1)}ms between inputs (${playerData.fastInputCount} fast inputs)`);
                        playerData.fastInputCount = 0; // Reset after violation
                        return false;
                    }
                } else {
                    // Reset fast input counter if this input came at normal speed
                    playerData.fastInputCount = 0;
                }
            }
            
            // Check timestamp validity (inputs can't be from future)
            if (typeof input.timestamp === 'number' && input.timestamp > now + 5000) {
                this.addViolation(playerId, 'invalid_timestamp', 
                    `Input timestamp too far in future: ${input.timestamp} vs ${now}`);
                return false;
            }
            
            // Update tracking with the input time we used for validation
            playerData.lastInputTime = inputTime;
            
            return true;
        } catch (error) {
            console.error('[SessionAntiCheat] Error in validateInput:', error);
            return false; // Fail safe - reject input on error
        }
    }
    
    /**
     * Validate player movement over time windows with defensive programming
     */
    validateMovement(playerId: string, oldPos: Position, newPos: Position, playerClass: string, deltaTime: number): boolean {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[SessionAntiCheat] Invalid playerId provided to validateMovement:', playerId);
            return false;
        }
        if (!oldPos || typeof oldPos.x !== 'number' || typeof oldPos.y !== 'number') {
            console.warn('[SessionAntiCheat] Invalid oldPos provided to validateMovement:', oldPos);
            return false;
        }
        if (!newPos || typeof newPos.x !== 'number' || typeof newPos.y !== 'number') {
            console.warn('[SessionAntiCheat] Invalid newPos provided to validateMovement:', newPos);
            return false;
        }
        if (typeof playerClass !== 'string') {
            console.warn('[SessionAntiCheat] Invalid playerClass provided to validateMovement:', playerClass);
            return false;
        }
        if (typeof deltaTime !== 'number' || isNaN(deltaTime)) {
            console.warn('[SessionAntiCheat] Invalid deltaTime provided to validateMovement:', deltaTime);
            return false;
        }

        try {
            const now = Date.now();
            if (typeof now !== 'number' || isNaN(now)) {
                console.error('[SessionAntiCheat] Invalid timestamp from Date.now()');
                return false;
            }
            
            // Get or create movement history
            if (!this.playerMovementHistory.has(playerId)) {
                this.playerMovementHistory.set(playerId, {
                    positions: [],
                    lastCheck: now
                });
            }
            
            const history = this.playerMovementHistory.get(playerId);
            if (!history) {
                console.error('[SessionAntiCheat] Failed to get movement history for player:', playerId);
                return false;
            }
            
            // Add current position to history with validation
            if (isNaN(newPos.x) || isNaN(newPos.y)) {
                console.warn('[SessionAntiCheat] Invalid position coordinates:', newPos);
                return false;
            }
            
            history.positions.push({
                x: newPos.x,
                y: newPos.y,
                timestamp: now
            });
            
            // Clean up old positions (keep last 2 seconds)
            const cutoffTime = now - 2000;
            history.positions = history.positions.filter(pos => pos.timestamp > cutoffTime);
            
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
            
            if (typeof distance !== 'number' || isNaN(distance)) {
                console.warn('[SessionAntiCheat] Invalid distance calculation');
                return true; // Allow movement if calculation fails
            }
            
            // Get max allowed distance per second for this class
            const maxDistance = this.maxDistancePerSecond[playerClass] || 300;
            
            // Add buffer for abilities and network latency
            const bufferMultiplier = 2.0;
            const allowedDistance = maxDistance * bufferMultiplier;
            
            // Check if player is in an ability (gets extra allowance)
            const isInAbility = this.safeCheckPlayerInAbility(playerId);
            const finalAllowedDistance = isInAbility ? allowedDistance * 3 : allowedDistance;
            
            // Only flag if significantly over the limit
            if (distance > finalAllowedDistance) {
                this.addViolation(playerId, 'speed_hack', 
                    `Moved ${distance.toFixed(1)}px in 1 second (max: ${finalAllowedDistance.toFixed(1)}px for ${playerClass})`);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('[SessionAntiCheat] Error in validateMovement:', error);
            return true; // Allow movement if validation fails to prevent false positives
        }
    }
    
    /**
     * Safely check if player is in an ability with defensive programming
     */
    private safeCheckPlayerInAbility(playerId: string): boolean {
        try {
            if (!this.abilityManager || !this.abilityManager.activeAbilities) {
                return false;
            }
            
            return this.abilityManager.activeAbilities.has(playerId);
        } catch (error) {
            console.error('[SessionAntiCheat] Error checking ability status:', error);
            return false;
        }
    }
    
    /**
     * Get player ability type from ability manager with defensive programming
     */
    getPlayerAbilityType(playerId: string): string | null {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[SessionAntiCheat] Invalid playerId provided to getPlayerAbilityType:', playerId);
            return null;
        }

        try {
            if (!this.abilityManager || !this.abilityManager.activeAbilities) {
                return null;
            }
            
            if (!this.abilityManager.activeAbilities.has(playerId)) {
                return null;
            }
            
            const ability = this.abilityManager.activeAbilities.get(playerId);
            if (!ability) {
                return null;
            }
            
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
        } catch (error) {
            console.error('[SessionAntiCheat] Error in getPlayerAbilityType:', error);
            return null;
        }
    }
    
    /**
     * Add a violation for a player with defensive programming
     */
    addViolation(playerId: string, violationType: string, details: string): string {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[SessionAntiCheat] Invalid playerId provided to addViolation:', playerId);
            return 'warning';
        }
        if (typeof violationType !== 'string' || violationType.length === 0) {
            console.warn('[SessionAntiCheat] Invalid violationType provided to addViolation:', violationType);
            return 'warning';
        }
        if (typeof details !== 'string') {
            console.warn('[SessionAntiCheat] Invalid details provided to addViolation, using default');
            details = 'Unknown violation details';
        }

        try {
            let playerData = this.getPlayerData(playerId);
            if (!playerData) {
                console.error('[SessionAntiCheat] Failed to get player data for violation');
                return 'warning';
            }
            
            playerData.strikes++;
            playerData.violations.push({
                type: violationType,
                details: details,
                timestamp: Date.now()
            });
            
            // Always log violations for debugging
            console.warn(`[SessionAntiCheat] VIOLATION: Player ${playerId} - ${violationType}: ${details} (Strike ${playerData.strikes}/${this.maxStrikes})`);
            
            // Log input frequency stats if it's an input spam violation
            if (violationType === 'input_spam' && playerData.lastInputTime) {
                console.log(`[SessionAntiCheat] Input stats for ${playerId}: fastInputCount=${playerData.fastInputCount}, minInterval=${this.minInputInterval}ms`);
            }
            
            // Check if player should be kicked
            if (playerData.strikes >= this.maxStrikes) {
                console.error(`[SessionAntiCheat] KICKING: Player ${playerId} exceeded max strikes (${this.maxStrikes})`);
                return 'kick';
            }
            
            return 'warning';
        } catch (error) {
            console.error('[SessionAntiCheat] Error in addViolation:', error);
            return 'warning';
        }
    }
    
    /**
     * Get or create player data with defensive programming
     */
    getPlayerData(playerId: string): PlayerViolationData | null {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[SessionAntiCheat] Invalid playerId provided to getPlayerData:', playerId);
            return null;
        }

        try {
            if (!this.playerViolations.has(playerId)) {
                this.playerViolations.set(playerId, {
                    strikes: 0,
                    violations: [],
                    lastInputTime: null,
                    lastPosition: null,
                    firstInputTime: null
                });
            }
            return this.playerViolations.get(playerId) || null;
        } catch (error) {
            console.error('[SessionAntiCheat] Error in getPlayerData:', error);
            return null;
        }
    }
    
    /**
     * Check if player should be kicked with defensive programming
     */
    shouldKickPlayer(playerId: string): boolean {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[SessionAntiCheat] Invalid playerId provided to shouldKickPlayer:', playerId);
            return false;
        }

        try {
            const playerData = this.playerViolations.get(playerId);
            return playerData ? playerData.strikes >= this.maxStrikes : false;
        } catch (error) {
            console.error('[SessionAntiCheat] Error in shouldKickPlayer:', error);
            return false;
        }
    }
    
    /**
     * Remove player from tracking (on disconnect) with defensive programming
     */
    removePlayer(playerId: string): void {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[SessionAntiCheat] Invalid playerId provided to removePlayer:', playerId);
            return;
        }

        try {
            this.playerViolations.delete(playerId);
            this.playerMovementHistory.delete(playerId);
            console.log(`[SessionAntiCheat] Removed player ${playerId} from anti-cheat tracking`);
        } catch (error) {
            console.error('[SessionAntiCheat] Error in removePlayer:', error);
        }
    }
    
    /**
     * Get anti-cheat statistics with defensive programming
     */
    getStats(): AntiCheatStats {
        try {
            const stats: AntiCheatStats = {
                trackedPlayers: this.playerViolations.size,
                totalViolations: 0,
                playersByStrikes: {},
                violationTypes: {}
            };
            
            this.playerViolations.forEach((data, playerId) => {
                if (data && typeof data.violations === 'object' && Array.isArray(data.violations)) {
                    stats.totalViolations += data.violations.length;
                    const strikes = data.strikes || 0;
                    stats.playersByStrikes[strikes] = (stats.playersByStrikes[strikes] || 0) + 1;
                    
                    data.violations.forEach(violation => {
                        if (violation && typeof violation.type === 'string') {
                            stats.violationTypes[violation.type] = (stats.violationTypes[violation.type] || 0) + 1;
                        }
                    });
                }
            });
            
            return stats;
        } catch (error) {
            console.error('[SessionAntiCheat] Error in getStats:', error);
            return {
                trackedPlayers: 0,
                totalViolations: 0,
                playersByStrikes: {},
                violationTypes: {}
            };
        }
    }
}