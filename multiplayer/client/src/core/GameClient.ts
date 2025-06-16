/**
 * LLM_NOTE: Main client game class that coordinates all client-side systems.
 * Handles rendering, input, and state synchronization with server.
 */

import { Application } from 'pixi.js';
import { NetworkManager } from '../network/NetworkManager';
import { EntityManager } from '../ecs/EntityManager';
import { 
  MessageType,
  CharacterClass,
  Entity,
  CHARACTER_CLASSES,
  ConnectionAcceptedMessage,
  GameStateMessage,
  EntitySpawnMessage,
  EntityDespawnMessage,
  EntityUpdateMessage
} from '@hardmode/shared';

export class GameClient {
  private app: Application;
  private networkManager: NetworkManager;
  private entityManager: EntityManager;
  private isRunning: boolean = false;
  
  // Game state
  private localPlayerId: string | null = null;
  private currentTick: number = 0;
  
  constructor(app: Application, networkManager: NetworkManager) {
    this.app = app;
    this.networkManager = networkManager;
    this.entityManager = new EntityManager();
    
    // Setup network event handlers
    this.setupNetworkHandlers();
  }
  
  /**
   * Setup network event handlers.
   */
  private setupNetworkHandlers(): void {
    this.networkManager.setOnServerMessage((message) => {
      switch (message.type) {
        case MessageType.CONNECTION_ACCEPTED:
          this.handleConnectionAccepted(message.data as ConnectionAcceptedMessage['data']);
          break;
          
        case MessageType.GAME_STATE:
          this.handleGameState(message as GameStateMessage);
          break;
          
        case MessageType.ENTITY_SPAWN:
          this.handleEntitySpawn(message as EntitySpawnMessage);
          break;
          
        case MessageType.ENTITY_DESPAWN:
          this.handleEntityDespawn(message as EntityDespawnMessage);
          break;
          
        case MessageType.ENTITY_UPDATE:
          this.handleEntityUpdate(message as EntityUpdateMessage);
          break;
          
        case MessageType.ERROR:
          console.error('Server error:', message);
          break;
      }
    });
  }
  
  /**
   * Start the game client.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    console.log('Starting game client...');
    this.isRunning = true;
    
    // Send join request (for testing)
    this.networkManager.sendMessage({
      type: MessageType.JOIN_GAME,
      timestamp: Date.now(),
      data: {
        username: 'TestPlayer',
        characterClass: 'bladedancer',
      }
    });
    
    // Start game loop
    this.app.ticker.add(this.update, this);
  }
  
  /**
   * Stop the game client.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    this.app.ticker.remove(this.update, this);
  }
  
  /**
   * Main update loop.
   */
  private update(time: any): void {
    const deltaTime = time.deltaTime;
    
    // Update game state
    // (Implementation will be added)
    
    // Render
    // (Implementation will be added)
  }
  
  /**
   * Handle connection accepted message.
   */
  private handleConnectionAccepted(data: ConnectionAcceptedMessage['data']): void {
    console.log('Connection accepted:', data);
    this.localPlayerId = data.playerId;
    this.entityManager.setLocalPlayerId(data.playerId);
  }
  
  /**
   * Handle game state message.
   */
  private handleGameState(message: GameStateMessage): void {
    console.log(`Received game state with ${message.entities.length} entities`);
    
    // Clear existing entities
    this.entityManager.clear();
    
    // Restore local player ID
    if (this.localPlayerId) {
      this.entityManager.setLocalPlayerId(this.localPlayerId);
    }
    
    // Create all entities
    for (const entityData of message.entities) {
      this.entityManager.createEntity(entityData);
    }
    
    // Update tick
    this.currentTick = message.tick;
  }
  
  /**
   * Handle entity spawn message.
   */
  private handleEntitySpawn(message: EntitySpawnMessage): void {
    console.log('Entity spawned:', message.entity.id);
    this.entityManager.createEntity(message.entity);
  }
  
  /**
   * Handle entity despawn message.
   */
  private handleEntityDespawn(message: EntityDespawnMessage): void {
    console.log('Entity despawned:', message.entityId, 'reason:', message.reason);
    this.entityManager.removeEntity(message.entityId);
  }
  
  /**
   * Handle entity update message.
   */
  private handleEntityUpdate(message: EntityUpdateMessage): void {
    for (const update of message.updates) {
      this.entityManager.updateEntity(update);
    }
  }
}