import { Server } from 'socket.io';
import { GameInstance } from './GameInstance.mjs';

export class GameServer {
    constructor(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: '*'
            }
        });
        this.games = new Map();
        this.players = new Map();
        this.registerHandlers();
    }

    registerHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    handleConnection(socket) {
        console.log('Client connected:', socket.id);
        this.players.set(socket.id, { id: socket.id, socket, game: null, ready: false, class: null });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            const player = this.players.get(socket.id);
            if (player && player.game) {
                const game = player.game;
                game.removePlayer(player.id);
                if (game.players.size === 0) {
                    console.log(`GameInstance ${game.id} is empty, stopping and deleting.`);
                    game.stop(); // Call stop before deleting
                    this.games.delete(game.id);
                }
            }
            this.players.delete(socket.id);
        });

        socket.on('input', (data) => {
            const player = this.players.get(socket.id);
            if (player && player.game) {
                player.game.handlePlayerInput(player.id, data);
            }
        });

        socket.on('create_game', () => {
            const player = this.players.get(socket.id);
            const gameId = this.createGame(player);
            socket.emit('game_created', { gameId });
        });

        socket.on('join_game', ({ gameId }) => {
            const player = this.players.get(socket.id);
            const success = this.joinGame(gameId, player);
            socket.emit('join_result', { success, gameId });
        });

        socket.on('class_select', ({ className }) => {
            const player = this.players.get(socket.id);
            if (player && player.game) {
                player.class = className;
                const updatedPlayerState = player.game.getPlayerState(player.id);
                if (updatedPlayerState) {
                    player.game.broadcast('player_updated', updatedPlayerState);
                }
            }
        });

        socket.on('player_ready', () => {
            const player = this.players.get(socket.id);
            if (player && player.game) {
                player.ready = true; // As per plan, set to true. Could be player.ready = !player.ready for toggle
                const updatedPlayerState = player.game.getPlayerState(player.id);
                if (updatedPlayerState) {
                    player.game.broadcast('player_updated', updatedPlayerState);
                }
            }
        });
    }

    createGame(hostPlayer) {
        const gameId = `game_${Date.now()}`;
        const game = new GameInstance(gameId);
        this.games.set(gameId, game);
        hostPlayer.game = game;
        game.addPlayer(hostPlayer);
        game.start();
        return gameId;
    }

    joinGame(gameId, player) {
        const game = this.games.get(gameId);
        if (!game) return false;
        player.game = game;
        game.addPlayer(player);
        // Send the full lobby state to the player who just joined.
        const lobbyState = game.getLobbyState();
        player.socket.emit('LOBBY_STATE_UPDATE', lobbyState);
        return true;
    }

    update(deltaTime) {
        for (const game of this.games.values()) {
            game.update(deltaTime);
        }
    }
}
