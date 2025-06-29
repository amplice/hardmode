/**
 * InputProcessor - Processes client input commands on the server
 * 
 * This handles Phase 1 of client prediction: receiving input commands
 * from clients and applying them server-side to maintain authority
 * while preparing for client-side prediction in later phases.
 */
import { CollisionMask } from '../../shared/systems/CollisionMask.js';
import { SharedWorldGenerator } from '../../shared/systems/WorldGenerator.js';
import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';

export class InputProcessor {
    constructor(gameState, abilityManager = null, lagCompensation = null, sessionAntiCheat = null, worldSeed = 42) {
        this.gameState = gameState;
        this.abilityManager = abilityManager;
        this.lagCompensation = lagCompensation;
        this.sessionAntiCheat = sessionAntiCheat;
        this.inputQueues = new Map(); // playerId -> array of input commands
        this.lastProcessedSequence = new Map(); // playerId -> last sequence processed
        this.playerPhysics = new Map(); // playerId -> physics state
        this.worldSeed = worldSeed;
        
        // Initialize collision mask with server's world seed
        // Use shared world constants for dynamic world size
        this.collisionMask = new CollisionMask(
            GAME_CONSTANTS.WORLD.WIDTH, 
            GAME_CONSTANTS.WORLD.HEIGHT, 
            GAME_CONSTANTS.WORLD.TILE_SIZE
        );
        this.initializeCollisionMask();
    }

    /**
     * Initialize collision mask using exact same generation logic as client
     * This ensures server and client have identical collision data
     */
    initializeCollisionMask() {
        // Use shared world generator with server's seed and dynamic world size
        const worldGen = new SharedWorldGenerator(
            GAME_CONSTANTS.WORLD.WIDTH, 
            GAME_CONSTANTS.WORLD.HEIGHT, 
            this.worldSeed
        );
        const elevationData = worldGen.generateElevationData();
        
        // Generate collision mask from elevation data, passing worldGen for stairs support
        this.collisionMask.generateFromElevationData(elevationData, worldGen);
        
        // Server collision mask initialized
    }
    
    /**
     * Update collision mask with data from client (legacy method - no longer needed)
     * Server now generates same world as client using shared seed
     */
    updateCollisionMask(collisionMaskData) {
        // Collision mask sync not needed - using shared world seed
    }

    /**
     * Queue an input command from a client (with anti-cheat validation)
     * @param {string} playerId - The player ID
     * @param {Object} inputCommand - The input command
     * @returns {boolean} True if input was accepted, false if rejected
     */
    queueInput(playerId, inputCommand) {
        // Validate input with anti-cheat system
        if (this.sessionAntiCheat && !this.sessionAntiCheat.validateInput(playerId, inputCommand)) {
            console.warn(`[InputProcessor] Rejected invalid input from player ${playerId}`);
            return false;
        }

        if (!this.inputQueues.has(playerId)) {
            this.inputQueues.set(playerId, []);
        }

        const queue = this.inputQueues.get(playerId);
        queue.push({
            ...inputCommand,
            serverTimestamp: Date.now() // When server received it
        });

        // Keep queue size manageable
        if (queue.length > 100) {
            queue.shift(); // Remove oldest
        }

        if (Math.random() < 0.001) { // Very reduced logging (0.1% chance)
            // Queued input for player
        }
        
        return true;
    }

    /**
     * Process all queued inputs for all players
     * @param {number} deltaTime - Server frame delta time
     */
    processAllInputs(deltaTime) {
        for (const [playerId, queue] of this.inputQueues) {
            this.processPlayerInputs(playerId, queue, deltaTime);
        }
    }

    /**
     * Process inputs for a specific player
     * @param {string} playerId - The player ID
     * @param {Array} inputQueue - Queue of input commands
     * @param {number} deltaTime - Server frame delta time
     */
    processPlayerInputs(playerId, inputQueue, deltaTime) {
        const player = this.gameState.getPlayer(playerId);
        if (!player) {
            console.warn(`[InputProcessor] Player ${playerId} not found`);
            return;
        }

        // Skip if player is in a server-controlled ability
        if (this.abilityManager && this.abilityManager.activeAbilities.has(playerId)) {
            // Clear inputs during server-controlled movement
            inputQueue.length = 0;
            return;
        }

        // Process inputs in sequence order
        inputQueue.sort((a, b) => a.sequence - b.sequence);
        
        let processedCount = 0;
        while (inputQueue.length > 0 && processedCount < 5) { // Limit processing per frame
            const input = inputQueue.shift();
            this.processInput(player, input, deltaTime);
            this.lastProcessedSequence.set(playerId, input.sequence);
            processedCount++;
        }
    }

    /**
     * Process a single input command with lag compensation
     * @param {Object} player - The player object
     * @param {Object} input - The input command
     * @param {number} deltaTime - Frame delta time
     */
    processInput(player, input, deltaTime) {
        const inputData = input.data;
        
        // Apply lag compensation if available
        let compensatedDelta = deltaTime;
        if (this.lagCompensation) {
            const compensation = this.lagCompensation.compensateMovementInput(player, input, deltaTime);
            compensatedDelta = compensation.compensatedDelta;
            
            // Log compensation only for significant adjustments
            if (compensation.compensation > 25 && Math.random() < 0.01) {
                // High latency compensation applied
            }
        }
        
        // Extract movement from keys
        const movement = this.extractMovement(inputData.keys);
        
        // Update player facing
        if (inputData.facing) {
            player.facing = inputData.facing;
        }

        // Apply movement if player isn't restricted
        if (!player.damageStunned && player.hp > 0) {
            // Store old position for anti-cheat validation
            const oldPos = { x: player.x, y: player.y };
            
            // Apply movement using client's deltaTime for consistency
            const movementDelta = inputData.deltaTime || compensatedDelta;
            this.applyMovement(player, movement, movementDelta);
            
            // Validate movement with time-based anti-cheat
            if (this.sessionAntiCheat) {
                const newPos = { x: player.x, y: player.y };
                const isValid = this.sessionAntiCheat.validateMovement(
                    player.id, oldPos, newPos, player.class, movementDelta
                );
                
                if (!isValid) {
                    // Movement failed validation - revert to old position
                    player.x = oldPos.x;
                    player.y = oldPos.y;
                    console.warn(`[InputProcessor] Reverted invalid movement for player ${player.id}`);
                }
            }
        }

        // Handle attacks
        this.handleAttacks(player, inputData.keys);
    }

    /**
     * Extract movement direction from pressed keys
     * @param {Array} keys - Array of pressed key names
     * @returns {Object} Movement vector {x, y}
     */
    extractMovement(keys) {
        let x = 0;
        let y = 0;

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
    }

    /**
     * Apply movement to player position
     * @param {Object} player - The player object
     * @param {Object} movement - Movement vector {x, y}
     * @param {number} deltaTime - Frame delta time
     */
    applyMovement(player, movement, deltaTime) {
        if (movement.x === 0 && movement.y === 0) {
            return;
        }

        // Get player stats for movement speed
        const baseSpeed = this.getPlayerMoveSpeed(player);
        const totalSpeed = baseSpeed + (player.moveSpeedBonus || 0);

        // Apply speed modifiers based on facing vs movement direction
        const speedModifier = this.calculateSpeedModifier(player, movement);
        const finalSpeed = totalSpeed * speedModifier;

        // Calculate new position
        const velocity = {
            x: movement.x * finalSpeed * deltaTime * 60, // Convert to pixels per frame
            y: movement.y * finalSpeed * deltaTime * 60
        };

        // Calculate new position
        const newX = Math.round(player.x + velocity.x);
        const newY = Math.round(player.y + velocity.y);
        
        // Validate movement using collision mask with solid collision behavior
        if (this.collisionMask.canMove(player.x, player.y, newX, newY)) {
            // Movement is valid, update position
            player.x = newX;
            player.y = newY;
        } else {
            // Movement completely blocked - no partial movement to avoid bouncing
            // Player stops dead at the boundary for solid feel
            
            // Optional: still allow sliding along walls for diagonal movement
            const canMoveX = this.collisionMask.canMove(player.x, player.y, newX, player.y);
            const canMoveY = this.collisionMask.canMove(player.x, player.y, player.x, newY);
            
            // Only allow sliding if moving diagonally and one direction is clear
            if (Math.abs(velocity.x) > 0 && Math.abs(velocity.y) > 0) {
                if (canMoveX && !canMoveY) {
                    player.x = newX; // Slide along horizontal wall
                } else if (canMoveY && !canMoveX) {
                    player.y = newY; // Slide along vertical wall
                }
            }
            // For straight movement into walls, just stop completely
        }

        // Apply world boundaries as final constraint
        this.applyWorldBounds(player);
    }

    /**
     * Calculate speed modifier based on movement direction vs facing
     * @param {Object} player - The player object
     * @param {Object} movement - Movement vector
     * @returns {number} Speed modifier (0.5 to 1.0)
     */
    calculateSpeedModifier(player, movement) {
        // For now, use simple logic. Can be enhanced later.
        // This should match the client-side calculation for consistency
        return 1.0; // TODO: Implement facing-based speed modifiers
    }

    /**
     * Get base movement speed for player class
     * @param {Object} player - The player object
     * @returns {number} Base movement speed
     */
    getPlayerMoveSpeed(player) {
        // Import player stats or hardcode for now
        const classSpeeds = {
            bladedancer: 5,
            guardian: 3.5,
            hunter: 5,
            rogue: 6
        };
        return classSpeeds[player.class] || 5;
    }

    /**
     * Apply world boundary constraints
     * @param {Object} player - The player object
     */
    applyWorldBounds(player) {
        // Use dynamic world bounds from shared constants
        const worldWidth = this.collisionMask.width * this.collisionMask.tileSize;
        const worldHeight = this.collisionMask.height * this.collisionMask.tileSize;
        
        player.x = Math.max(0, Math.min(worldWidth, player.x));
        player.y = Math.max(0, Math.min(worldHeight, player.y));
    }

    /**
     * Handle attack inputs
     * @param {Object} player - The player object
     * @param {Array} keys - Array of pressed keys
     */
    handleAttacks(player, keys) {
        // For now, defer to existing attack system
        // TODO: Integrate with ability system for server-side attacks
        if (keys.includes('mouse1')) {
            // Primary attack - defer to existing system
        }
        if (keys.includes('space')) {
            // Secondary attack - defer to existing system
        }
    }

    /**
     * Get last processed sequence for a player
     * @param {string} playerId - The player ID
     * @returns {number} Last processed sequence number
     */
    getLastProcessedSequence(playerId) {
        const seq = this.lastProcessedSequence.get(playerId) || 0;
        // Debug: Log sequence requests
        if (Math.random() < 0.05) {
            // Getting sequence for player
        }
        return seq;
    }

    /**
     * Clean up data for disconnected player
     * @param {string} playerId - The player ID
     */
    removePlayer(playerId) {
        this.inputQueues.delete(playerId);
        this.lastProcessedSequence.delete(playerId);
        this.playerPhysics.delete(playerId);
        
        // Clean up anti-cheat data
        if (this.sessionAntiCheat) {
            this.sessionAntiCheat.removePlayer(playerId);
        }
        
        // Removed player from input processing
    }

    /**
     * Get statistics for debugging
     * @returns {Object} Debug statistics
     */
    getStats() {
        const queueSizes = {};
        for (const [playerId, queue] of this.inputQueues) {
            queueSizes[playerId] = queue.length;
        }

        return {
            activeQueues: this.inputQueues.size,
            queueSizes,
            totalQueuedInputs: Array.from(this.inputQueues.values())
                .reduce((sum, queue) => sum + queue.length, 0)
        };
    }
}