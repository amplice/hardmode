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
        this.players.set(socket.id, { id: socket.id, socket, game: null });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            const player = this.players.get(socket.id);
            if (player && player.game) {
                player.game.removePlayer(player.id);
            }
            this.players.delete(socket.id);
        });

        socket.on('input', (data) => {
            const player = this.players.get(socket.id);
            if (player && player.game) {
                player.game.handlePlayerInput(player.id, data);
            }
        });
    }

    createGame(hostPlayer) {
        const gameId = `game_${Date.now()}`;
        const game = new GameInstance(gameId);
        this.games.set(gameId, game);
        hostPlayer.game = game;
        game.addPlayer(hostPlayer);
        return gameId;
    }

    joinGame(gameId, player) {
        const game = this.games.get(gameId);
        if (!game) return false;
        player.game = game;
        game.addPlayer(player);
        return true;
    }

    update(deltaTime) {
        for (const game of this.games.values()) {
            game.update(deltaTime);
        }
    }
}
