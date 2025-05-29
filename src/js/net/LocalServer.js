import { ClientMessages, ServerMessages } from './MessageTypes.js';

export class LocalServer {
    constructor() {
        this.gameState = {
            players: new Map(),
            monsters: new Map(),
            projectiles: new Map(),
            nextEntityId: 1,
            timestamp: Date.now()
        };
        this.messageHandlers = new Map();
        this.clients = new Map();
    }

    connectClient(clientId, client) {
        this.clients.set(clientId, client);
    }

    handleMessage(clientId, message) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(clientId, message);
        }
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
