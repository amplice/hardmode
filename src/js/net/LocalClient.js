import { ClientMessages } from './MessageTypes.js';

export class LocalClient {
    constructor(server, clientId) {
        this.server = server;
        this.id = clientId;
        this.messageHandlers = new Map();
        this.server.connectClient(clientId, this);
    }

    send(message) {
        this.server.handleMessage(this.id, message);
    }

    sendInput(input) {
        this.send({ type: ClientMessages.INPUT, data: input });
    }

    onServerMessage(message) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message);
        }
    }

    registerHandler(type, handler) {
        this.messageHandlers.set(type, handler);
    }
}
