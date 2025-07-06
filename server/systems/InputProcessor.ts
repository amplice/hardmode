/**
 * @fileoverview InputProcessor - Server-side input processing with defensive programming
 * 
 * SAFETY MEASURES:
 * - Extensive parameter validation to prevent undefined/null crashes
 * - Runtime type checking for all inputs
 * - Graceful error handling with logging
 * - Safe property access with null checks
 * - Default values for all calculations
 * - Input data structure validation
 * 
 * ARCHITECTURE ROLE:
 * - Processes client input commands on the server
 * - Maintains server authority while preparing for client-side prediction
 * - Integrates with anti-cheat and lag compensation systems
 * - Handles collision detection and movement validation
 * 
 * MIGRATION SAFETY:
 * - This TypeScript version implements identical behavior to the JavaScript version
 * - All method signatures match exactly
 * - Added defensive checks for undefined/null parameters
 * - Extensive logging for debugging potential issues
 * - Safe input data structure validation to prevent crashes
 */

import { CollisionMask } from '../../shared/systems/CollisionMask.js';
import { SharedWorldGenerator } from '../../shared/systems/WorldGenerator.js';
import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';
import { directionStringToAngleRadians } from '../../src/js/utils/DirectionUtils.js';

// Game state manager interface
interface GameStateManager {
    getPlayer(playerId: string): Player | null;
}

// Player interface with all required properties
interface Player {
    id: string;
    x: number;
    y: number;
    hp: number;
    class: string;
    facing: string;
    damageStunned?: boolean;
    moveSpeedBonus?: number;
}

// Ability manager interface
interface AbilityManager {
    activeAbilities?: Map<string, any>;
}

// Lag compensation interface
interface LagCompensation {
    compensateMovementInput(player: Player, input: InputCommand, deltaTime: number): {
        compensatedDelta: number;
        compensation: number;
    };
}

// Session anti-cheat interface
interface SessionAntiCheat {
    validateInput(playerId: string, input: InputCommand): boolean;
    validateMovement(playerId: string, oldPos: Position, newPos: Position, playerClass: string, deltaTime: number): boolean;
    removePlayer(playerId: string): void;
}

// Server world manager interface
interface ServerWorldManager {
    getWorldData(): {
        elevationData: number[][];
        [key: string]: any;
    };
    getWorldGenerator(): SharedWorldGenerator;
}

// Position interface
interface Position {
    x: number;
    y: number;
}

// Movement vector interface
interface Movement {
    x: number;
    y: number;
}

// Input command interfaces
interface InputData {
    keys?: string[];
    facing?: string;
    deltaTime?: number;
    [key: string]: any;
}

interface InputCommand {
    data?: InputData;
    sequence?: number;
    timestamp?: number;
    serverTimestamp?: number;
    [key: string]: any;
}

// Statistics interface
interface ProcessorStats {
    activeQueues: number;
    queueSizes: Record<string, number>;
    totalQueuedInputs: number;
}

export class InputProcessor {
    private gameState: GameStateManager;
    private abilityManager: AbilityManager | null;
    private lagCompensation: LagCompensation | null;
    private sessionAntiCheat: SessionAntiCheat | null;
    private serverWorldManager: ServerWorldManager;
    private inputQueues: Map<string, InputCommand[]>;
    private lastProcessedSequence: Map<string, number>;
    private playerPhysics: Map<string, any>;
    private collisionMask: CollisionMask;

    constructor(
        gameState: GameStateManager,
        abilityManager: AbilityManager | null = null,
        lagCompensation: LagCompensation | null = null,
        sessionAntiCheat: SessionAntiCheat | null = null,
        serverWorldManager: ServerWorldManager
    ) {
        // Defensive parameter validation
        if (!gameState || typeof gameState.getPlayer !== 'function') {
            throw new Error('[InputProcessor] Invalid gameState parameter - must have getPlayer method');
        }
        if (!serverWorldManager || typeof serverWorldManager.getWorldData !== 'function') {
            throw new Error('[InputProcessor] Invalid serverWorldManager parameter - must have getWorldData method');
        }

        this.gameState = gameState;
        this.abilityManager = abilityManager;
        this.lagCompensation = lagCompensation;
        this.sessionAntiCheat = sessionAntiCheat;
        this.serverWorldManager = serverWorldManager;
        this.inputQueues = new Map();
        this.lastProcessedSequence = new Map();
        this.playerPhysics = new Map();
        
        // Initialize collision mask using shared world data
        this.collisionMask = new CollisionMask(
            GAME_CONSTANTS?.WORLD?.WIDTH || 100,
            GAME_CONSTANTS?.WORLD?.HEIGHT || 100,
            GAME_CONSTANTS?.WORLD?.TILE_SIZE || 32
        );
        
        try {
            this.initializeCollisionMask();
        } catch (error) {
            console.error('[InputProcessor] Failed to initialize collision mask:', error);
            throw error;
        }
        
        console.log('[InputProcessor] Initialized with defensive programming');
        console.log('[InputProcessor] TypeScript version loaded with extensive input validation');
    }

    /**
     * Initialize collision mask using shared world data with defensive programming
     */
    private initializeCollisionMask(): void {
        try {
            // Use shared world data (already generated once by ServerWorldManager)
            const worldData = this.serverWorldManager.getWorldData();
            if (!worldData || !worldData.elevationData) {
                throw new Error('Invalid world data - missing elevationData');
            }

            const worldGen = this.serverWorldManager.getWorldGenerator();
            if (!worldGen) {
                throw new Error('Invalid world generator');
            }
            
            // Generate collision mask from shared elevation data
            this.collisionMask.generateFromElevationData(worldData.elevationData, worldGen);
            
            console.log('[InputProcessor] Collision mask initialized using shared world data');
        } catch (error) {
            console.error('[InputProcessor] Error in initializeCollisionMask:', error);
            throw error;
        }
    }
    
    /**
     * Update collision mask with data from client (legacy method - no longer needed)
     */
    updateCollisionMask(collisionMaskData: any): void {
        // Collision mask sync not needed - using shared world seed
        // This method is kept for compatibility but does nothing
    }

    /**
     * Queue an input command from a client with defensive programming
     */
    queueInput(playerId: string, inputCommand: InputCommand): boolean {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[InputProcessor] Invalid playerId provided to queueInput:', playerId);
            return false;
        }
        if (!inputCommand || typeof inputCommand !== 'object') {
            console.warn('[InputProcessor] Invalid inputCommand provided to queueInput:', inputCommand);
            return false;
        }

        try {
            // Validate input with anti-cheat system
            if (this.sessionAntiCheat && !this.sessionAntiCheat.validateInput(playerId, inputCommand)) {
                console.warn(`[InputProcessor] Rejected invalid input from player ${playerId}`);
                return false;
            }

            if (!this.inputQueues.has(playerId)) {
                this.inputQueues.set(playerId, []);
            }

            const queue = this.inputQueues.get(playerId);
            if (!queue) {
                console.error('[InputProcessor] Failed to get input queue for player:', playerId);
                return false;
            }

            queue.push({
                ...inputCommand,
                serverTimestamp: Date.now() // When server received it
            });

            // Keep queue size manageable
            if (queue.length > 100) {
                queue.shift(); // Remove oldest
            }

            return true;
        } catch (error) {
            console.error('[InputProcessor] Error in queueInput:', error);
            return false;
        }
    }

    /**
     * Process all queued inputs for all players with defensive programming
     */
    processAllInputs(deltaTime: number): void {
        // Defensive parameter validation
        if (typeof deltaTime !== 'number' || isNaN(deltaTime) || deltaTime < 0) {
            console.warn('[InputProcessor] Invalid deltaTime provided to processAllInputs:', deltaTime);
            return;
        }

        try {
            this.inputQueues.forEach((queue, playerId) => {
                if (typeof playerId === 'string' && Array.isArray(queue)) {
                    this.processPlayerInputs(playerId, queue, deltaTime);
                }
            });
        } catch (error) {
            console.error('[InputProcessor] Error in processAllInputs:', error);
        }
    }

    /**
     * Process inputs for a specific player with defensive programming
     */
    private processPlayerInputs(playerId: string, inputQueue: InputCommand[], deltaTime: number): void {
        try {
            const player = this.gameState.getPlayer(playerId);
            if (!player) {
                console.warn(`[InputProcessor] Player ${playerId} not found`);
                return;
            }

            // Validate player object has required properties
            if (typeof player.x !== 'number' || typeof player.y !== 'number') {
                console.warn(`[InputProcessor] Player ${playerId} has invalid position:`, { x: player.x, y: player.y });
                return;
            }

            // Skip if player is in a server-controlled ability
            if (this.abilityManager && this.abilityManager.activeAbilities && this.abilityManager.activeAbilities.has(playerId)) {
                // Clear inputs during server-controlled movement
                inputQueue.length = 0;
                return;
            }

            // Process inputs in sequence order
            inputQueue.sort((a, b) => {
                const seqA = typeof a.sequence === 'number' ? a.sequence : 0;
                const seqB = typeof b.sequence === 'number' ? b.sequence : 0;
                return seqA - seqB;
            });
            
            let processedCount = 0;
            while (inputQueue.length > 0 && processedCount < 5) { // Limit processing per frame
                const input = inputQueue.shift();
                if (input) {
                    this.processInput(player, input, deltaTime);
                    const sequence = typeof input.sequence === 'number' ? input.sequence : 0;
                    this.lastProcessedSequence.set(playerId, sequence);
                    processedCount++;
                }
            }
        } catch (error) {
            console.error('[InputProcessor] Error in processPlayerInputs:', error);
        }
    }

    /**
     * Process a single input command with defensive programming
     */
    private processInput(player: Player, input: InputCommand, deltaTime: number): void {
        try {
            // Defensive validation of input structure
            if (!input || typeof input !== 'object') {
                console.warn('[InputProcessor] Invalid input object provided to processInput');
                return;
            }

            const inputData = input.data;
            if (!inputData || typeof inputData !== 'object') {
                console.warn('[InputProcessor] Invalid input.data provided to processInput:', inputData);
                return;
            }
            
            // Apply lag compensation if available
            let compensatedDelta = deltaTime;
            if (this.lagCompensation) {
                try {
                    const compensation = this.lagCompensation.compensateMovementInput(player, input, deltaTime);
                    if (compensation && typeof compensation.compensatedDelta === 'number') {
                        compensatedDelta = compensation.compensatedDelta;
                    }
                } catch (error) {
                    console.error('[InputProcessor] Error in lag compensation:', error);
                }
            }
            
            // Extract movement from keys with safe access
            const movement = this.extractMovement(inputData.keys);
            
            // Update player facing with validation
            if (typeof inputData.facing === 'string' && inputData.facing.length > 0) {
                player.facing = inputData.facing;
            }

            // Apply movement if player isn't restricted
            const isDamageStunned = typeof player.damageStunned === 'boolean' ? player.damageStunned : false;
            const hp = typeof player.hp === 'number' ? player.hp : 0;
            
            if (!isDamageStunned && hp > 0) {
                // Store old position for anti-cheat validation
                const oldPos: Position = { x: player.x, y: player.y };
                
                // Apply movement using client's deltaTime for consistency
                const movementDelta = typeof inputData.deltaTime === 'number' ? inputData.deltaTime : compensatedDelta;
                this.applyMovement(player, movement, movementDelta);
                
                // Validate movement with time-based anti-cheat
                if (this.sessionAntiCheat) {
                    try {
                        const newPos: Position = { x: player.x, y: player.y };
                        const isValid = this.sessionAntiCheat.validateMovement(
                            player.id, oldPos, newPos, player.class, movementDelta
                        );
                        
                        if (!isValid) {
                            // Movement failed validation - revert to old position
                            player.x = oldPos.x;
                            player.y = oldPos.y;
                            console.warn(`[InputProcessor] Reverted invalid movement for player ${player.id}`);
                        }
                    } catch (error) {
                        console.error('[InputProcessor] Error in movement validation:', error);
                    }
                }
            }

            // Handle attacks with safe key access
            this.handleAttacks(player, inputData.keys);
        } catch (error) {
            console.error('[InputProcessor] Error in processInput:', error);
        }
    }

    /**
     * Extract movement direction from pressed keys with defensive programming
     */
    private extractMovement(keys: string[] | undefined): Movement {
        try {
            let x = 0;
            let y = 0;

            // Defensive validation of keys array
            if (!Array.isArray(keys)) {
                console.warn('[InputProcessor] Invalid keys array provided to extractMovement:', keys);
                return { x: 0, y: 0 };
            }

            // Safe key checking with includes
            if (keys.includes('w')) y = -1;
            if (keys.includes('s')) y = 1;
            if (keys.includes('a')) x = -1;
            if (keys.includes('d')) x = 1;

            // Normalize diagonal movement
            if (x !== 0 && y !== 0) {
                const diagonalFactor = 0.85; // Match client logic
                x *= diagonalFactor;
                y *= diagonalFactor;
            }

            return { x, y };
        } catch (error) {
            console.error('[InputProcessor] Error in extractMovement:', error);
            return { x: 0, y: 0 };
        }
    }

    /**
     * Apply movement to player position with defensive programming
     */
    private applyMovement(player: Player, movement: Movement, deltaTime: number): void {
        try {
            // Validate inputs
            if (!movement || typeof movement.x !== 'number' || typeof movement.y !== 'number') {
                console.warn('[InputProcessor] Invalid movement provided to applyMovement:', movement);
                return;
            }
            if (typeof deltaTime !== 'number' || isNaN(deltaTime) || deltaTime <= 0) {
                console.warn('[InputProcessor] Invalid deltaTime provided to applyMovement:', deltaTime);
                return;
            }

            if (movement.x === 0 && movement.y === 0) {
                return;
            }

            // Get player stats for movement speed
            const baseSpeed = this.getPlayerMoveSpeed(player);
            const moveSpeedBonus = typeof player.moveSpeedBonus === 'number' ? player.moveSpeedBonus : 0;
            const totalSpeed = baseSpeed + moveSpeedBonus;

            // Apply speed modifiers based on facing vs movement direction
            const speedModifier = this.calculateSpeedModifier(player, movement);
            const finalSpeed = totalSpeed * speedModifier;

            // Calculate new position
            const velocity = {
                x: movement.x * finalSpeed * deltaTime * 60, // Convert to pixels per frame
                y: movement.y * finalSpeed * deltaTime * 60
            };

            // Validate velocity calculations
            if (isNaN(velocity.x) || isNaN(velocity.y)) {
                console.warn('[InputProcessor] Invalid velocity calculation:', velocity);
                return;
            }

            // Calculate new position
            const newX = Math.round(player.x + velocity.x);
            const newY = Math.round(player.y + velocity.y);
            
            // Validate new position
            if (isNaN(newX) || isNaN(newY)) {
                console.warn('[InputProcessor] Invalid new position calculation:', { newX, newY });
                return;
            }
            
            // Validate movement using collision mask with solid collision behavior
            if (this.collisionMask && this.collisionMask.canMove(player.x, player.y, newX, newY)) {
                // Movement is valid, update position
                player.x = newX;
                player.y = newY;
            } else {
                // Movement completely blocked - attempt sliding
                const canMoveX = this.collisionMask ? this.collisionMask.canMove(player.x, player.y, newX, player.y) : false;
                const canMoveY = this.collisionMask ? this.collisionMask.canMove(player.x, player.y, player.x, newY) : false;
                
                // Only allow sliding if moving diagonally and one direction is clear
                if (Math.abs(velocity.x) > 0 && Math.abs(velocity.y) > 0) {
                    if (canMoveX && !canMoveY) {
                        player.x = newX; // Slide along horizontal wall
                    } else if (canMoveY && !canMoveX) {
                        player.y = newY; // Slide along vertical wall
                    }
                }
            }

            // Apply world boundaries as final constraint
            this.applyWorldBounds(player);
        } catch (error) {
            console.error('[InputProcessor] Error in applyMovement:', error);
        }
    }

    /**
     * Calculate speed modifier based on movement direction vs facing with defensive programming
     */
    private calculateSpeedModifier(player: Player, movement: Movement): number {
        try {
            // Validate inputs
            if (!player || typeof player.facing !== 'string') {
                console.warn('[InputProcessor] Invalid player facing in calculateSpeedModifier:', player?.facing);
                return 1.0;
            }
            if (!movement || typeof movement.x !== 'number' || typeof movement.y !== 'number') {
                console.warn('[InputProcessor] Invalid movement in calculateSpeedModifier:', movement);
                return 1.0;
            }

            // Get facing angle from player's facing direction string
            const facingAngle = directionStringToAngleRadians(player.facing);
            if (typeof facingAngle !== 'number' || isNaN(facingAngle)) {
                console.warn('[InputProcessor] Invalid facing angle calculated:', facingAngle);
                return 1.0;
            }
            
            // Get movement angle from movement vector
            const movementAngle = (movement.x !== 0 || movement.y !== 0) ? 
                Math.atan2(movement.y, movement.x) : facingAngle;
            
            if (typeof movementAngle !== 'number' || isNaN(movementAngle)) {
                console.warn('[InputProcessor] Invalid movement angle calculated:', movementAngle);
                return 1.0;
            }
            
            // Calculate angle difference (in radians)
            let angleDiff = Math.abs(facingAngle - movementAngle);
            // Normalize to be between 0 and π
            if (angleDiff > Math.PI) {
                angleDiff = 2 * Math.PI - angleDiff;
            }
            
            // Apply direction-based speed modifiers
            let speedModifier = 1.0;
            
            if (angleDiff < Math.PI / 4) {
                // Moving forward (within 45 degrees of facing)
                speedModifier = 1.0;
            } else if (angleDiff > 3 * Math.PI / 4) {
                // Moving backward (more than 135 degrees from facing)
                speedModifier = 0.5;
            } else {
                // Strafing (between 45 and 135 degrees from facing)
                speedModifier = 0.7;
            }
            
            return speedModifier;
        } catch (error) {
            console.error('[InputProcessor] Error in calculateSpeedModifier:', error);
            return 1.0; // Default to full speed on error
        }
    }

    /**
     * Get base movement speed for player class with defensive programming
     */
    private getPlayerMoveSpeed(player: Player): number {
        try {
            if (!player || typeof player.class !== 'string') {
                console.warn('[InputProcessor] Invalid player class in getPlayerMoveSpeed:', player?.class);
                return 5; // Default speed
            }

            const classSpeeds: Record<string, number> = {
                bladedancer: 5,
                guardian: 3.5,
                hunter: 5,
                rogue: 6
            };
            
            return classSpeeds[player.class] || 5;
        } catch (error) {
            console.error('[InputProcessor] Error in getPlayerMoveSpeed:', error);
            return 5; // Default speed on error
        }
    }

    /**
     * Apply world boundary constraints with defensive programming
     */
    private applyWorldBounds(player: Player): void {
        try {
            if (!player || typeof player.x !== 'number' || typeof player.y !== 'number') {
                console.warn('[InputProcessor] Invalid player position in applyWorldBounds:', { x: player?.x, y: player?.y });
                return;
            }

            // Use dynamic world bounds from collision mask
            const worldWidth = this.collisionMask ? this.collisionMask.width * this.collisionMask.tileSize : 3200;
            const worldHeight = this.collisionMask ? this.collisionMask.height * this.collisionMask.tileSize : 3200;
            
            player.x = Math.max(0, Math.min(worldWidth, player.x));
            player.y = Math.max(0, Math.min(worldHeight, player.y));
        } catch (error) {
            console.error('[InputProcessor] Error in applyWorldBounds:', error);
        }
    }

    /**
     * Handle attack inputs with defensive programming
     */
    private handleAttacks(player: Player, keys: string[] | undefined): void {
        try {
            // Defensive validation of keys array
            if (!Array.isArray(keys)) {
                return; // Silently ignore invalid keys for attacks
            }

            // For now, defer to existing attack system
            if (keys.includes('mouse1')) {
                // Primary attack - defer to existing system
            }
            if (keys.includes('space')) {
                // Secondary attack - defer to existing system
            }
        } catch (error) {
            console.error('[InputProcessor] Error in handleAttacks:', error);
        }
    }

    /**
     * Get last processed sequence for a player with defensive programming
     */
    getLastProcessedSequence(playerId: string): number {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[InputProcessor] Invalid playerId provided to getLastProcessedSequence:', playerId);
            return 0;
        }

        try {
            const seq = this.lastProcessedSequence.get(playerId) || 0;
            return typeof seq === 'number' ? seq : 0;
        } catch (error) {
            console.error('[InputProcessor] Error in getLastProcessedSequence:', error);
            return 0;
        }
    }

    /**
     * Clean up data for disconnected player with defensive programming
     */
    removePlayer(playerId: string): void {
        // Defensive parameter validation
        if (typeof playerId !== 'string' || playerId.length === 0) {
            console.warn('[InputProcessor] Invalid playerId provided to removePlayer:', playerId);
            return;
        }

        try {
            this.inputQueues.delete(playerId);
            this.lastProcessedSequence.delete(playerId);
            this.playerPhysics.delete(playerId);
            
            // Clean up anti-cheat data
            if (this.sessionAntiCheat) {
                this.sessionAntiCheat.removePlayer(playerId);
            }
            
            console.log(`[InputProcessor] Removed player ${playerId} from input processing`);
        } catch (error) {
            console.error('[InputProcessor] Error in removePlayer:', error);
        }
    }

    /**
     * Get statistics for debugging with defensive programming
     */
    getStats(): ProcessorStats {
        try {
            const queueSizes: Record<string, number> = {};
            this.inputQueues.forEach((queue, playerId) => {
                if (typeof playerId === 'string' && Array.isArray(queue)) {
                    queueSizes[playerId] = queue.length;
                }
            });

            const totalQueuedInputs = Array.from(this.inputQueues.values())
                .reduce((sum, queue) => sum + (Array.isArray(queue) ? queue.length : 0), 0);

            return {
                activeQueues: this.inputQueues.size,
                queueSizes,
                totalQueuedInputs
            };
        } catch (error) {
            console.error('[InputProcessor] Error in getStats:', error);
            return {
                activeQueues: 0,
                queueSizes: {},
                totalQueuedInputs: 0
            };
        }
    }
}