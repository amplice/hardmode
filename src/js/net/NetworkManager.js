import { io } from 'socket.io-client';
import { ClientMessages } from './MessageTypes.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
    }

    connect(serverUrl) {
        this.socket = io(serverUrl);
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('game_state', (state) => {
            this.game.onServerMessage({ type: 'GAME_STATE', data: state });
        });
    }

    isConnected() {
        return this.socket && this.socket.connected;
    }

    sendInput(input) {
        if (this.isConnected()) {
            this.socket.emit('input', { type: ClientMessages.INPUT, data: input });
        }
    }
}
