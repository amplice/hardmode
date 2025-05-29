export class LocalClient {
    constructor(server, clientId) {
        this.server = server;
        this.clientId = clientId;
        this.messageHandler = null;
    }

    connect() {
        this.server.connectClient(this.clientId, this);
    }

    onMessage(handler) {
        this.messageHandler = handler;
    }

    send(message) {
        this.server.handleMessage(this.clientId, message);
    }

    onServerMessage(message) {
        if (this.messageHandler) {
            this.messageHandler(message);
        }
    }
}
