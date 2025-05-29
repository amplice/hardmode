export class GameInstance {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.state = {
            players: new Map()
        };
        this.updateRate = 20;
        this.lastUpdate = Date.now();
    }

    addPlayer(player) {
        player.position = { x: 0, y: 0 };
        player.pendingInput = null;
        this.players.set(player.id, player);
        this.state.players.set(player.id, player);
        this.broadcast('player_joined', { playerId: player.id });
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.state.players.delete(playerId);
        this.broadcast('player_left', { playerId });
    }

    handlePlayerInput(playerId, input) {
        const player = this.players.get(playerId);
        if (player) {
            player.pendingInput = input;
        }
    }

    update(deltaTime) {
        const speed = 4;
        for (const player of this.players.values()) {
            const input = player.pendingInput || {};
            if (input.up) player.position.y -= speed;
            if (input.down) player.position.y += speed;
            if (input.left) player.position.x -= speed;
            if (input.right) player.position.x += speed;
            player.pendingInput = null;
        }

        const state = {
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                position: { x: p.position.x, y: p.position.y },
                className: p.class
            })),
            timestamp: Date.now()
        };

        this.broadcast('game_state', state);
        this.lastUpdate = Date.now();
    }

    broadcast(event, data, excludeId = null) {
        for (const p of this.players.values()) {
            if (p.id === excludeId) continue;
            p.socket.emit(event, data);
        }
    }
}
