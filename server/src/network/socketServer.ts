import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { config } from '../config/index';
import { ConnectionManager } from './ConnectionManager';
import { setupMessageHandlers } from './messageHandlers';
import { GameInstance } from '../game/GameInstance';

export function setupSocketServer(io: SocketIOServer): void {
  const connectionManager = new ConnectionManager();
  const gameInstance = new GameInstance(connectionManager);
  
  // Start the game instance
  gameInstance.start();

  // Middleware for authentication (basic for now)
  io.use((socket, next) => {
    const username = socket.handshake.auth.username as string;
    
    if (!username || username.trim().length === 0) {
      return next(new Error('Username required'));
    }

    // Check if username is already taken
    if (connectionManager.isUsernameTaken(username)) {
      return next(new Error('Username already taken'));
    }

    // Attach username to socket
    socket.data.username = username.trim();
    next();
  });

  // Handle new connections
  io.on('connection', (socket: Socket) => {
    const username = socket.data.username as string;
    const playerId = connectionManager.addConnection(socket, username);
    
    logger.info(`Player connected: ${username} (${playerId})`);
    
    // Add player to game instance
    const player = gameInstance.addPlayer(playerId, username, socket.id);

    // Send connection success with player info and world data
    socket.emit('connected', {
      playerId,
      username,
      position: player.position,
      serverConfig: {
        tickRate: config.game.tickRate,
        updateRate: config.game.updateRate,
      },
      worldConfig: {
        seed: config.game.worldSeed,
        width: config.game.worldSize.width,
        height: config.game.worldSize.height,
        tileSize: config.game.worldSize.tileSize,
      },
    });

    // Notify other players of new connection
    socket.broadcast.emit('playerJoined', {
      playerId,
      username,
    });

    // Send current player list to new player
    const players = connectionManager.getPlayerList();
    socket.emit('playerList', players);
    
    // Also send current game state so new player sees existing players
    const gameState = gameInstance.getGameState();
    if (gameState.players.length > 0) {
      socket.emit('gameState', {
        players: gameState.players,
        timestamp: Date.now(),
      });
    }

    // Store playerId in socket data for use in handlers
    socket.data.playerId = playerId;
    
    // Setup message handlers for this socket
    setupMessageHandlers(socket, connectionManager, gameInstance);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Player disconnected: ${username} (${playerId}) - ${reason}`);
      
      connectionManager.removeConnection(playerId);
      gameInstance.removePlayer(playerId);

      // Notify other players
      socket.broadcast.emit('playerLeft', {
        playerId,
        username,
      });
    });
  });

  // Server statistics logging
  setInterval(() => {
    const stats = connectionManager.getStats();
    logger.debug('Server stats:', stats);
  }, 30000); // Every 30 seconds
}