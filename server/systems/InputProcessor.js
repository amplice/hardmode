/**
 * InputProcessor - Processes client input commands on the server
 * 
 * This handles Phase 1 of client prediction: receiving input commands
 * from clients and applying them server-side to maintain authority
 * while preparing for client-side prediction in later phases.
 */
export class InputProcessor {
    constructor(gameState, abilityManager = null) {
        this.gameState = gameState;
        this.abilityManager = abilityManager;
        this.inputQueues = new Map(); // playerId -> array of input commands
        this.lastProcessedSequence = new Map(); // playerId -> last sequence processed
        this.playerPhysics = new Map(); // playerId -> physics state
    }

    /**
     * Queue an input command from a client
     * @param {string} playerId - The player ID
     * @param {Object} inputCommand - The input command
     */
    queueInput(playerId, inputCommand) {
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

        console.log(`[InputProcessor] Queued input for player ${playerId}, sequence ${inputCommand.sequence}, keys: ${inputCommand.data.keys.join(',')}`);
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
     * Process a single input command
     * @param {Object} player - The player object
     * @param {Object} input - The input command
     * @param {number} deltaTime - Frame delta time
     */
    processInput(player, input, deltaTime) {
        const inputData = input.data;
        
        // Extract movement from keys
        const movement = this.extractMovement(inputData.keys);
        
        // Update player facing
        if (inputData.facing) {
            player.facing = inputData.facing;
        }

        // Apply movement if player isn't restricted
        if (!player.damageStunned && player.hp > 0) {
            this.applyMovement(player, movement, inputData.deltaTime || deltaTime);
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

        // Update position
        player.x = Math.round(player.x + velocity.x);
        player.y = Math.round(player.y + velocity.y);

        // Apply world boundaries (basic collision)
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
        // Basic world bounds - should match server constants
        const worldWidth = 100 * 64; // 100 tiles * 64 pixels
        const worldHeight = 100 * 64;
        
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
        return this.lastProcessedSequence.get(playerId) || 0;
    }

    /**
     * Clean up data for disconnected player
     * @param {string} playerId - The player ID
     */
    removePlayer(playerId) {
        this.inputQueues.delete(playerId);
        this.lastProcessedSequence.delete(playerId);
        this.playerPhysics.delete(playerId);
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