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
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    handlePlayerInput(playerId, input) {
        const player = this.players.get(playerId);
        if (player) {
            player.pendingInput = input;
        }
    }

    update(deltaTime) {
        // Placeholder for future server-side game loop
        this.lastUpdate = Date.now();
    }
}
