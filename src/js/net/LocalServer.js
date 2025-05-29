import { ClientMessages, ServerMessages } from './MessageTypes.js';
import { generateId } from '../utils/IdGenerator.js';

export class LocalServer {
    constructor() {
        this.gameState = {
            players: new Map(),
            monsters: new Map(),
            projectiles: new Map(),
            timestamp: Date.now()
        };
        this.clients = new Map();
        this.messageHandlers = {
            [ClientMessages.CLASS_SELECT]: this.handleClassSelect.bind(this),
            [ClientMessages.INPUT]: this.handleInput.bind(this)
        };
    }

    connectClient(clientId, client) {
        this.clients.set(clientId, client);
    }

    handleMessage(clientId, message) {
        const handler = this.messageHandlers[message.type];
        if (handler) {
            handler(clientId, message);
        }
    }

    handleClassSelect(clientId, message) {
        const playerId = generateId('player');
        const playerData = {
            id: playerId,
            class: message.class,
            position: { x: message.x || 0, y: message.y || 0 }
        };
        this.gameState.players.set(playerId, playerData);

        const client = this.clients.get(clientId);
        if (client && client.onServerMessage) {
            client.onServerMessage({
                type: ServerMessages.PLAYER_JOINED,
                playerId,
                playerData
            });
            client.onServerMessage({
                type: ServerMessages.GAME_STATE,
                players: Array.from(this.gameState.players.values()),
                monsters: [],
                projectiles: [],
                timestamp: this.gameState.timestamp
            });
        }
    }

    handleInput(clientId, message) {
        const player = this.gameState.players.get(message.playerId);
        if (!player) return;
        // Input processing will be implemented later
        this.gameState.timestamp = Date.now();
    }

    broadcast(message, excludeClient) {
        for (const [id, client] of this.clients) {
            if (id === excludeClient) continue;
            if (client.onServerMessage) {
                client.onServerMessage(message);
            }
        }
    }

    update(deltaTime) {
        // Placeholder update loop. Will manage entities later.
        this.gameState.timestamp = Date.now();
    }
}
