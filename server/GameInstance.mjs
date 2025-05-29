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
        this.broadcast('player_joined', { playerId: player.id });
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
        // Placeholder for future server-side game loop
        this.lastUpdate = Date.now();
    }

    broadcast(event, data, excludeId = null) {
        for (const p of this.players.values()) {
            if (p.id === excludeId) continue;
            p.socket.emit(event, data);
        }
    }
}
