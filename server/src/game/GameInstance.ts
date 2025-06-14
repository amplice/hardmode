import { Player, PlayerStatus } from '../entities/Player';
import { ConnectionManager } from '../network/ConnectionManager';
import { logger } from '../utils/logger';
import { config } from '../config';
import { InputState, PlayerState } from '../../../shared/types';

export class GameInstance {
  private players: Map<string, Player> = new Map();
  private connectionManager: ConnectionManager;
  private tickRate: number;
  private updateRate: number;
  private tickInterval: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastTickTime: number = Date.now();
  private worldBounds: { width: number; height: number };
  
  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.tickRate = config.game.tickRate;
    this.updateRate = config.game.updateRate;
    
    // TODO: Get actual world size from world generator
    this.worldBounds = { width: 6400, height: 6400 }; // 100 tiles * 64 pixels
  }
  
  start(): void {
    logger.info('Starting game instance');
    
    // Start game tick loop (physics, AI, etc.)
    const tickInterval = 1000 / this.tickRate;
    this.tickInterval = setInterval(() => this.tick(), tickInterval);
    
    // Start update loop (network updates)
    const updateInterval = 1000 / this.updateRate;
    this.updateInterval = setInterval(() => this.sendUpdates(), updateInterval);
  }
  
  stop(): void {
    logger.info('Stopping game instance');
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  addPlayer(playerId: string, username: string, connectionId: string): Player {
    const player = new Player(playerId, username, connectionId);
    
    // Set spawn position (center of world for now)
    const spawnX = this.worldBounds.width / 2;
    const spawnY = this.worldBounds.height / 2;
    player.setSpawnPosition(spawnX, spawnY);
    player.status = PlayerStatus.CONNECTED;
    
    this.players.set(playerId, player);
    logger.info(`Added player ${username} to game instance`);
    
    return player;
  }
  
  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.status = PlayerStatus.DISCONNECTED;
      this.players.delete(playerId);
      logger.info(`Removed player ${player.username} from game instance`);
    }
  }
  
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }
  
  setPlayerClass(playerId: string, className: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.setClass(className);
      player.status = PlayerStatus.PLAYING;
      logger.info(`Player ${player.username} selected class: ${className}`);
    }
  }
  
  handlePlayerInput(playerId: string, input: InputState): void {
    const player = this.players.get(playerId);
    if (!player || player.status !== PlayerStatus.PLAYING) return;
    
    // Calculate delta time since last update
    const now = Date.now();
    const deltaTime = (now - player.lastUpdateTime) / 1000;
    
    // Process input
    player.processInput(input, deltaTime);
  }
  
  private tick(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;
    
    // Update all players
    this.players.forEach(player => {
      if (player.status === PlayerStatus.PLAYING) {
        player.update(deltaTime);
        
        // Enforce world boundaries
        this.enforceWorldBounds(player);
        
        // Check for timeouts
        if (player.isTimedOut()) {
          logger.warn(`Player ${player.username} timed out`);
          this.removePlayer(player.id);
        }
      }
    });
    
    // TODO: Update monsters, projectiles, etc.
  }
  
  private enforceWorldBounds(player: Player): void {
    // Keep player within world bounds
    player.position.x = Math.max(0, Math.min(this.worldBounds.width, player.position.x));
    player.position.y = Math.max(0, Math.min(this.worldBounds.height, player.position.y));
  }
  
  private sendUpdates(): void {
    const playerStates: PlayerState[] = [];
    
    // Collect all player states
    this.players.forEach(player => {
      if (player.status === PlayerStatus.PLAYING || player.status === PlayerStatus.DEAD) {
        playerStates.push(player.getState());
      }
    });
    
    // Send updates to all connected players
    this.connectionManager.broadcast('gameState', {
      players: playerStates,
      timestamp: Date.now(),
    });
  }
  
  getGameState() {
    return {
      playerCount: this.players.size,
      players: Array.from(this.players.values()).map(p => p.getState()),
      worldBounds: this.worldBounds,
    };
  }
}