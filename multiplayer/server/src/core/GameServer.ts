/**
 * LLM_NOTE: Main game server class that manages the game world, players, and network communication.
 * This is the central coordinator for all server-side game logic.
 * 
 * ARCHITECTURE_DECISION: The GameServer owns the authoritative game state and
 * coordinates between different systems (world, network, ECS, etc.).
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { 
  Entity, 
  EntityType,
  MessageType,
  PlayerJoinMessage,
  ConnectionAcceptedMessage,
  ErrorCode,
  createErrorMessage,
  NETWORK_SETTINGS,
  SERVER_CONFIG,
} from '@hardmode/shared';
import { GameWorld } from './GameWorld';
import { GameLoop } from './GameLoop';
import { Connection } from '../network/Connection';
import { MessageHandler } from '../network/MessageHandler';
import { StateManager } from '../network/StateManager';

export interface GameServerOptions {
  io: SocketIOServer;
  maxPlayers: number;
  worldSeed: number;
  tickRate: number;
}

export class GameServer {
  // Core components
  private io: SocketIOServer;
  private world: GameWorld;
  private gameLoop: GameLoop;
  private messageHandler: MessageHandler;
  private stateManager: StateManager;
  
  // Player management
  private connections: Map<string, Connection> = new Map();
  private playerEntities: Map<string, Entity> = new Map(); // playerId -> Entity
  private connectionToPlayer: Map<string, string> = new Map(); // connectionId -> playerId
  
  // Server configuration
  private readonly maxPlayers: number;
  private readonly worldSeed: number;
  private readonly tickRate: number;
  
  // Server state
  private isRunning: boolean = false;
  private currentTick: number = 0;
  
  constructor(options: GameServerOptions) {
    this.io = options.io;
    this.maxPlayers = options.maxPlayers;
    this.worldSeed = options.worldSeed;
    this.tickRate = options.tickRate;
    
    // Initialize core components
    this.world = new GameWorld(this.worldSeed);
    this.gameLoop = new GameLoop(this.tickRate);
    this.messageHandler = new MessageHandler(this);
    this.stateManager = new StateManager(this);
    
    // Set up Socket.IO event handlers
    this.setupSocketHandlers();
    
    // Set up game loop callback
    this.gameLoop.onTick = (deltaTime) => this.tick(deltaTime);
  }
  
  /**
   * Initialize the game server.
   * Generates world, sets up systems, etc.
   */
  async initialize(): Promise<void> {
    console.log('🌍 Initializing game world...');
    
    // Initialize world
    await this.world.initialize();
    
    // Initialize systems
    this.messageHandler.initialize();
    this.stateManager.initialize();
    
    console.log('✅ Game server initialized');
  }
  
  /**
   * Start the game server.
   * Begins accepting connections and starts the game loop.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Game server is already running');
      return;
    }
    
    // Initialize first
    await this.initialize();
    
    this.isRunning = true;
    this.gameLoop.start();
    
    console.log('🎮 Game server started');
  }
  
  /**
   * Stop the game server.
   * Disconnects all players and stops the game loop.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    this.gameLoop.stop();
    
    // Disconnect all players
    for (const connection of this.connections.values()) {
      connection.disconnect('Server shutting down');
    }
    
    this.connections.clear();
    this.playerEntities.clear();
    this.connectionToPlayer.clear();
    
    console.log('🛑 Game server stopped');
  }
  
  /**
   * Main game tick.
   * Called by GameLoop at the configured tick rate.
   */
  private tick(deltaTime: number): void {
    this.currentTick++;
    
    // Update game world
    this.world.update(deltaTime);
    
    // Process player inputs
    this.processPlayerInputs();
    
    // Send state updates to clients
    this.stateManager.sendUpdates();
    
    // Clean up disconnected players
    this.cleanupDisconnectedPlayers();
  }
  
  /**
   * Set up Socket.IO connection handlers.
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }
  
  /**
   * Handle new socket connection.
   */
  private handleConnection(socket: Socket): void {
    console.log(`🔌 New connection: ${socket.id}`);
    
    // Check if server is full
    if (this.connections.size >= this.maxPlayers) {
      socket.emit(MessageType.ERROR, createErrorMessage(
        ErrorCode.SERVER_FULL,
        'Server is full',
        true
      ));
      socket.disconnect();
      return;
    }
    
    // Create connection wrapper
    const connection = new Connection(socket);
    this.connections.set(socket.id, connection);
    
    // Set up connection event handlers
    connection.on(MessageType.PLAYER_JOIN, (data) => {
      this.handlePlayerJoin(connection, data as PlayerJoinMessage);
    });
    
    connection.on('disconnect', () => {
      this.handleDisconnect(connection);
    });
    
    // Set up message forwarding to handler
    this.messageHandler.setupConnection(connection);
  }
  
  /**
   * Handle player join request.
   */
  private handlePlayerJoin(connection: Connection, message: PlayerJoinMessage): void {
    console.log(`👤 Player joining: ${message.username} as ${message.characterClass}`);
    
    // Validate username
    if (!message.username || message.username.length < 3 || message.username.length > 20) {
      connection.sendError(
        ErrorCode.INVALID_INPUT,
        'Username must be between 3 and 20 characters'
      );
      return;
    }
    
    // Create player entity
    const playerEntity = this.world.createPlayer(
      message.username,
      message.characterClass,
      connection.id
    );
    
    if (!playerEntity) {
      connection.sendError(
        ErrorCode.UNKNOWN,
        'Failed to create player entity'
      );
      return;
    }
    
    // Store player associations
    this.playerEntities.set(playerEntity.id, playerEntity);
    this.connectionToPlayer.set(connection.id, playerEntity.id);
    connection.playerId = playerEntity.id;
    
    // Send connection accepted message
    const acceptMessage: ConnectionAcceptedMessage = {
      type: MessageType.CONNECTION_ACCEPTED,
      timestamp: Date.now(),
      playerId: playerEntity.id,
      worldSeed: this.worldSeed,
      serverTime: Date.now(),
      tickRate: this.tickRate,
    };
    
    connection.send(MessageType.CONNECTION_ACCEPTED, acceptMessage);
    
    // Add player to state manager
    this.stateManager.addPlayer(connection, playerEntity);
    
    console.log(`✅ Player ${message.username} joined successfully`);
  }
  
  /**
   * Handle player disconnect.
   */
  private handleDisconnect(connection: Connection): void {
    console.log(`🔌 Connection lost: ${connection.id}`);
    
    const playerId = this.connectionToPlayer.get(connection.id);
    if (playerId) {
      // Remove player entity
      const playerEntity = this.playerEntities.get(playerId);
      if (playerEntity) {
        this.world.removeEntity(playerEntity.id);
        this.playerEntities.delete(playerId);
      }
      
      // Clean up associations
      this.connectionToPlayer.delete(connection.id);
      
      // Remove from state manager
      this.stateManager.removePlayer(connection);
    }
    
    // Remove connection
    this.connections.delete(connection.id);
  }
  
  /**
   * Process queued player inputs.
   */
  private processPlayerInputs(): void {
    for (const connection of this.connections.values()) {
      if (!connection.playerId) continue;
      
      const playerEntity = this.playerEntities.get(connection.playerId);
      if (!playerEntity) continue;
      
      // Process all pending inputs for this player
      const inputs = connection.getQueuedInputs();
      for (const input of inputs) {
        this.messageHandler.processPlayerInput(playerEntity, input);
      }
    }
  }
  
  /**
   * Clean up players who have been disconnected for too long.
   */
  private cleanupDisconnectedPlayers(): void {
    const now = Date.now();
    const timeout = NETWORK_SETTINGS.STATE_RESTORE_WINDOW;
    
    for (const [connectionId, connection] of this.connections) {
      if (!connection.isConnected() && 
          now - connection.getDisconnectTime() > timeout) {
        this.handleDisconnect(connection);
      }
    }
  }
  
  // Getters for other systems to access server state
  
  getWorld(): GameWorld {
    return this.world;
  }
  
  getCurrentTick(): number {
    return this.currentTick;
  }
  
  getConnections(): Map<string, Connection> {
    return this.connections;
  }
  
  getPlayerEntity(playerId: string): Entity | undefined {
    return this.playerEntities.get(playerId);
  }
  
  getPlayerCount(): number {
    return this.playerEntities.size;
  }
  
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }
  
  /**
   * Create a new player entity.
   */
  createPlayer(username: string, characterClass: string, connectionId: string): Entity | null {
    return this.world.createPlayer(username, characterClass, connectionId);
  }
  
  /**
   * Add player connection mapping.
   */
  addPlayerConnection(playerId: string, connection: Connection): void {
    const entity = this.world.getEntity(playerId);
    if (!entity) {
      console.error(`Failed to find player entity ${playerId}`);
      return;
    }
    
    this.playerEntities.set(playerId, entity);
    this.connectionToPlayer.set(connection.id, playerId);
    
    // Add to state manager for network updates
    this.stateManager.addPlayer(connection, entity);
  }
  
  /**
   * Get player entity by ID.
   */
  getPlayerEntity(playerId: string): Entity | undefined {
    return this.playerEntities.get(playerId);
  }
  
  /**
   * Get server tick rate.
   */
  getTickRate(): number {
    return this.tickRate;
  }
}