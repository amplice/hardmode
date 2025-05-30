import { io } from 'socket.io-client';
import { ClientMessages } from './MessageTypes.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.gameId = null;
        this.sequenceNumber = 0;
        this.serverTimeOffset = 0;
        this.latency = 0;
        this.lobbyState = { players: new Map() }; // playerId -> {id, ready, class}
        this.onLobbyUpdate = null; // Callback to be set by the Game/UI manager
    }

    getLobbyState() {
        return { players: Array.from(this.lobbyState.players.values()) };
    }

    setLobbyUpdateCallback(callback) {
        this.onLobbyUpdate = callback;
    }

    _notifyLobbyUpdate() {
        if (this.onLobbyUpdate) {
            this.onLobbyUpdate(this.getLobbyState());
        }
    }

    connect(serverUrl) {
        this.socket = io(serverUrl);
        this.socket.on('connect', () => {
            console.log('Connected to server');
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

        // New handlers for lobby state
        this.socket.on('LOBBY_STATE_UPDATE', (fullLobbyState) => {
            this.lobbyState.players.clear();
            for (const player of fullLobbyState) {
                this.lobbyState.players.set(player.id, player);
            }
            console.log('LOBBY_STATE_UPDATE received:', this.getLobbyState());
            this._notifyLobbyUpdate();
        });

        this.socket.on('player_joined', (playerData) => {
            this.lobbyState.players.set(playerData.id, playerData);
            console.log('player_joined:', playerData, 'New lobby state:', this.getLobbyState());
            this._notifyLobbyUpdate();
        });

        this.socket.on('player_left', ({ playerId }) => {
            this.lobbyState.players.delete(playerId);
            console.log('player_left:', playerId, 'New lobby state:', this.getLobbyState());
            this._notifyLobbyUpdate();
        });

        this.socket.on('player_updated', (playerData) => {
            if (this.lobbyState.players.has(playerData.id)) {
                this.lobbyState.players.set(playerData.id, playerData);
            } else { // Should ideally not happen if player_joined was processed
                this.lobbyState.players.set(playerData.id, playerData);
            }
            console.log('player_updated:', playerData, 'New lobby state:', this.getLobbyState());
            this._notifyLobbyUpdate();
        });

        // Old handlers commented out or removed:
        // this.socket.on('player_joined', ({ playerId }) => {
        //     console.log('Player joined', playerId);
        // });
        // this.socket.on('player_left', ({ playerId }) => {
        //     console.log('Player left', playerId);
        // });
        // this.socket.on('player_class_selected', ({ playerId, className }) => {
        //     console.log('Player', playerId, 'selected class', className);
        // });
        // this.socket.on('player_ready', ({ playerId }) => {
        //     console.log('Player ready', playerId);
        // });
    }

    isConnected() {
        return this.socket && this.socket.connected;
    }

    sendInput(inputData) {
        if (this.isConnected()) {
            const payload = {
                ...inputData, // Contains keys, mouse, timestamp
                sequenceNumber: this.sequenceNumber++
            };
            this.socket.emit('input', payload); // Send the raw payload, server will know it's input
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
