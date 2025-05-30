export class GameInstance {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.state = {};
        this.updateRate = 20;
        this.lastUpdate = Date.now();
    }

    addPlayer(player) {
        this.players.set(player.id, player);
        // When a player is added to GameInstance, broadcast their details to OTHERS.
        // The new player themselves will receive the full lobby state separately.
        const newPlayerState = { id: player.id, ready: player.ready, class: player.class };
        this.broadcast('player_joined', newPlayerState, player.id); // Exclude the new player from this message
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.broadcast('player_left', { playerId });
    }

    handlePlayerInput(playerId, input) {
        const player = this.players.get(playerId);
        if (player) {
            player.pendingInput = input;
        }
    }

    update(deltaTime) {
        // Process inputs for all players
        for (const [playerId, player] of this.players) {
            if (player.pendingInput) {
                console.log(`GameInstance ${this.id} processing input for player ${playerId}:`, player.pendingInput);
                // Here, you would normally apply the input to the player's state.
                // For this step, we just log it.

                // Clear the input after processing
                player.pendingInput = null;
            }
        }
        // Other game logic would go here in the future
    }

    getPlayerState(playerId) {
        const player = this.players.get(playerId);
        if (!player) return null;
        // Ensure we are accessing properties that exist on the player object stored in GameInstance's map
        // This player object comes from GameServer's player map
        return {
            id: player.id,
            ready: player.ready, // 'ready' property from GameServer's player object
            class: player.class  // 'class' property from GameServer's player object
        };
    }

    getLobbyState() {
        const lobbyPlayers = [];
        for (const playerId of this.players.keys()) {
            lobbyPlayers.push(this.getPlayerState(playerId));
        }
        return lobbyPlayers;
    }

    start() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        // Store the interval ID so it can be cleared if needed (e.g., if stopping the game instance)
        this.updateInterval = setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - this.lastUpdate) / 1000; // deltaTime in seconds
            this.update(deltaTime);
            this.lastUpdate = now;
        }, 1000 / this.updateRate); // e.g., 1000 / 20 = 50ms
        console.log(`GameInstance ${this.id} started update loop.`);
    }

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log(`GameInstance ${this.id} stopped update loop.`);
        }
    }

    broadcast(event, data, excludeId = null) {
        for (const p of this.players.values()) {
            if (p.id === excludeId) continue;
            p.socket.emit(event, data);
        }
    }
}
