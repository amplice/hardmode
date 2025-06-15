import { Socket } from 'socket.io';
import { ConnectionManager } from './ConnectionManager';
import { GameInstance } from '../game/GameInstance';
import { logger } from '../utils/logger';
import { InputState } from '../../../shared/types';

export function setupMessageHandlers(
  socket: Socket, 
  connectionManager: ConnectionManager,
  gameInstance: GameInstance
): void {
  const playerId = socket.data.playerId as string;

  // Ping/pong for latency measurement
  socket.on('ping', (timestamp: number) => {
    socket.emit('pong', timestamp);
  });

  // Player input handling
  socket.on('input', (input: InputState) => {
    connectionManager.updateActivity(playerId);
    
    // Validate input
    if (!validateInput(input)) {
      logger.warn(`Invalid input from ${playerId}`);
      return;
    }
    
    // Handle the input in the game instance
    gameInstance.handlePlayerInput(playerId, input);
  });
  
  // Player class selection
  socket.on('selectClass', (className: string) => {
    logger.info(`Player ${playerId} selecting class: ${className}`);
    if (!['bladedancer', 'guardian', 'hunter', 'rogue'].includes(className)) {
      logger.warn(`Invalid class selection from ${playerId}: ${className}`);
      return;
    }
    
    const player = gameInstance.getPlayer(playerId);
    logger.info(`Player ${playerId} before class selection - status: ${player?.status}`);
    
    gameInstance.setPlayerClass(playerId, className);
    socket.emit('classSelected', { class: className });
    logger.info(`Player ${playerId} class selection complete`);
    
    // Log player status after setting class
    const playerAfter = gameInstance.getPlayer(playerId);
    logger.info(`Player ${playerId} after class selection - status: ${playerAfter?.status}`);
    
    // Send current game state to the player who just selected their class
    const gameState = gameInstance.getGameState();
    logger.info(`Game state has ${gameState.players.length} active players out of ${gameState.playerCount} total`);
    logger.info(`Active players: ${gameState.players.map(p => `${p.username}(${p.id})`).join(', ')}`);
    
    socket.emit('gameState', {
      players: gameState.players,
      timestamp: Date.now(),
    });
    logger.info(`Emitted gameState event to ${playerId}`);
  });

  // Chat message (basic implementation)
  socket.on('chat', (message: string) => {
    if (typeof message !== 'string' || message.trim().length === 0) {
      return;
    }

    const trimmedMessage = message.trim().substring(0, 200); // Limit message length
    const connection = connectionManager.getConnection(playerId);
    
    if (connection) {
      const chatData = {
        playerId,
        username: connection.username,
        message: trimmedMessage,
        timestamp: Date.now(),
      };

      // Send to all players including sender
      connectionManager.broadcast('chat', chatData);
      
      logger.info(`Chat from ${connection.username}: ${trimmedMessage}`);
    }
  });

  // Request player list
  socket.on('requestPlayerList', () => {
    const players = connectionManager.getPlayerList();
    socket.emit('playerList', players);
  });
  
  // Request current game state
  socket.on('requestGameState', () => {
    logger.info(`Player ${playerId} requested game state`);
    const gameState = gameInstance.getGameState();
    socket.emit('gameState', {
      players: gameState.players,
      timestamp: Date.now(),
    });
    logger.info(`Sent game state to ${playerId} with ${gameState.players.length} active players`);
  });

  // Error handling for socket
  socket.on('error', (error) => {
    logger.error(`Socket error for player ${playerId}:`, error);
  });
}

// Input validation
function validateInput(input: InputState): boolean {
  if (!input || typeof input !== 'object') return false;
  
  // Validate movement
  if (!input.movement || typeof input.movement.x !== 'number' || typeof input.movement.y !== 'number') {
    return false;
  }
  
  // Clamp movement values
  const moveLength = Math.sqrt(input.movement.x * input.movement.x + input.movement.y * input.movement.y);
  if (moveLength > 1.1) { // Allow small floating point errors
    return false;
  }
  
  // Validate mouse position
  if (!input.mousePosition || typeof input.mousePosition.x !== 'number' || typeof input.mousePosition.y !== 'number') {
    return false;
  }
  
  // Validate attacking flag
  if (typeof input.attacking !== 'boolean') {
    return false;
  }
  
  return true;
}