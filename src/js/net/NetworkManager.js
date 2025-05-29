import { io } from 'socket.io-client';
import { ClientMessages } from './MessageTypes.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.gameId = null;
    }

    connect(serverUrl) {
        this.socket = io(serverUrl);
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.game.clientId = this.socket.id;
        });

        this.socket.on('game_state', (state) => {
            this.game.onServerMessage({ type: 'GAME_STATE', data: state });
        });

        this.socket.on('game_created', ({ gameId }) => {
            this.gameId = gameId;
            console.log('Game created', gameId);
        });

        this.socket.on('join_result', ({ success, gameId }) => {
            if (success) {
                this.gameId = gameId;
                console.log('Joined game', gameId);
            } else {
                console.warn('Failed to join game', gameId);
            }
        });

        this.socket.on('player_joined', ({ playerId }) => {
            console.log('Player joined', playerId);
        });

        this.socket.on('player_left', ({ playerId }) => {
            console.log('Player left', playerId);
        });

        this.socket.on('player_class_selected', ({ playerId, className }) => {
            console.log('Player', playerId, 'selected class', className);
        });

        this.socket.on('player_ready', ({ playerId }) => {
            console.log('Player ready', playerId);
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

    createGame() {
        if (this.isConnected()) {
            this.socket.emit('create_game');
        }
    }

    joinGame(gameId) {
        if (this.isConnected()) {
            this.socket.emit('join_game', { gameId });
        }
    }

    selectClass(className) {
        if (this.isConnected()) {
            this.socket.emit('class_select', { className });
        }
    }

    setReady() {
        if (this.isConnected()) {
            this.socket.emit('player_ready');
        }
    }
}
