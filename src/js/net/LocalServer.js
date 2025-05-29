import { ClientMessages, ServerMessages } from './MessageTypes.js';

// Simple local server used in Stage 1 of the multiplayer transition. It keeps
// authoritative game state and processes input from connected clients.

export class LocalServer {
    constructor(game) {
        // Reference to the running Game instance so the server can access
        // systems and entities that already exist.
        this.game = game;

        this.gameState = {
            players: new Map(),
            monsters: new Map(),
            projectiles: new Map(),
            nextEntityId: 1,
            timestamp: Date.now()
        };

        this.messageHandlers = new Map();
        this.clients = new Map();
        this.pendingInputs = new Map();

        this.registerHandlers();
    }

    registerHandlers() {
        this.messageHandlers.set(
            ClientMessages.INPUT,
            this.handleInput.bind(this)
        );
    }

    connectClient(clientId, client) {
        this.clients.set(clientId, client);
        this.pendingInputs.set(clientId, null);
    }

    addPlayer(clientId, player) {
        this.gameState.players.set(clientId, player);
    }

    handleInput(clientId, message) {
        this.pendingInputs.set(clientId, message.data);
    }

    handleMessage(clientId, message) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(clientId, message);
        }
    }

    broadcast(message, excludeClient) {
        for (const [id, client] of this.clients) {
            if (id === excludeClient) {
                continue;
            }
            if (client.onServerMessage) {
                client.onServerMessage(message);
            }
        }
    }

    update(deltaTime) {
        const players = Array.from(this.gameState.players.values());

        for (const [clientId, player] of this.gameState.players) {
            const inputState = this.pendingInputs.get(clientId) || {};
            player.update(deltaTime, inputState);
        }

        const mainPlayer = players[0];
        if (mainPlayer) {
            this.game.systems.monsters.update(deltaTime, mainPlayer);
        }

        const allEntities = [
            ...players,
            ...this.game.systems.monsters.monsters
        ];
        this.game.systems.physics.update(
            deltaTime,
            allEntities,
            this.game.systems.world
        );

        this.game.systems.combat.update(deltaTime);

        this.gameState.timestamp = Date.now();

        const state = {
            players: players.map((p) => ({
                id: p.id,
                position: { x: p.position.x, y: p.position.y },
                facing: p.facing,
                hitPoints: p.health ? p.health.hitPoints : 0
            })),
            monsters: this.game.systems.monsters.monsters.map((m) => ({
                id: m.id,
                position: { x: m.position.x, y: m.position.y },
                facing: m.facing,
                alive: m.alive
            })),
            projectiles: this.game.systems.combat.projectiles.map((proj) => ({
                id: proj.id,
                position: { x: proj.position.x, y: proj.position.y }
            })),
            timestamp: this.gameState.timestamp
        };

        this.broadcast({ type: ServerMessages.GAME_STATE, data: state });
    }
}
