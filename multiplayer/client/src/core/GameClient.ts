/**
 * LLM_NOTE: Main client game class that coordinates all client-side systems.
 * Handles rendering, input, and state synchronization with server.
 */

import { Application } from 'pixi.js';
import { NetworkManager } from '../network/NetworkManager';
import { EntityManager } from '../ecs/EntityManager';
import { RenderingSystem } from '../rendering/RenderingSystem';
import { WorldRenderer } from '../rendering/WorldRenderer';
import { InputSystem } from '../input/InputSystem';
import { PredictionSystem } from '../systems/PredictionSystem';
import { 
  Entity,
  MessageType,
  ConnectionAcceptedMessage,
  GameStateMessage,
  EntitySpawnMessage,
  EntityDespawnMessage,
  EntityUpdateMessage,
  PlayerJoinMessage,
  debugLog,
  ComponentType
} from '@hardmode/shared';
import { PositionComponent } from '@hardmode/shared/components/PositionComponent';
import { VelocityComponent } from '@hardmode/shared/components/VelocityComponent';
import { PlayerComponent } from '@hardmode/shared/components/PlayerComponent';

export class GameClient {
  private app: Application;
  private networkManager: NetworkManager;
  private entityManager: EntityManager;
  private isRunning: boolean = false;
  
  // Systems
  private renderingSystem: RenderingSystem;
  private worldRenderer: WorldRenderer;
  private inputSystem: InputSystem;
  private predictionSystem: PredictionSystem;
  
  // Game state
  private localPlayerId: string | null = null;
  private lastProcessedInput: number = 0;
  
  constructor(app: Application, networkManager: NetworkManager) {
    this.app = app;
    this.networkManager = networkManager;
    this.entityManager = new EntityManager();
    
    // Initialize systems
    this.worldRenderer = new WorldRenderer(this.app);
    this.renderingSystem = new RenderingSystem(this.entityManager, this.app);
    this.inputSystem = new InputSystem(this.networkManager, this.app.canvas);
    this.predictionSystem = new PredictionSystem(this.entityManager, this.inputSystem.getInputManager());
    
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
          this.handleConnectionAccepted(message as ConnectionAcceptedMessage);
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
    const joinMessage: PlayerJoinMessage = {
      type: MessageType.PLAYER_JOIN,
      timestamp: Date.now(),
      username: 'TestPlayer',
      characterClass: 'guardian'
    };
    this.networkManager.sendMessage(joinMessage);
    
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
    
    // Get camera position for input system
    const camera = this.renderingSystem.getCamera();
    
    // Update input (processes and sends input to server)
    this.inputSystem.update(camera.x, camera.y, 1);
    
    // DISABLED: Client prediction - just render server state
    // this.predictionSystem.update(deltaTime);
    
    // Update world rendering
    this.worldRenderer.updateVisibleChunks(
      camera.x, 
      camera.y, 
      this.app.screen.width, 
      this.app.screen.height
    );
    
    // Update entity rendering
    this.renderingSystem.update(deltaTime);
  }
  
  /**
   * Handle connection accepted message.
   */
  private handleConnectionAccepted(message: ConnectionAcceptedMessage): void {
    console.log('Connection accepted:', message);
    debugLog.info('Connection accepted', { playerId: message.playerId });
    this.localPlayerId = message.playerId;
    this.entityManager.setLocalPlayerId(message.playerId);
    
    // If we already have entities, update the local player reference
    const existingPlayer = this.entityManager.getEntity(message.playerId);
    if (existingPlayer) {
      console.log('Found existing player entity after connection accepted');
      debugLog.info('Found existing player entity', { entityId: existingPlayer.id });
    }
  }
  
  /**
   * Handle game state message.
   */
  private handleGameState(message: GameStateMessage): void {
    console.log(`Received game state with ${message.entities.length} entities`);
    debugLog.info('Received game state', { 
      entityCount: message.entities.length,
      tick: message.tick,
      entities: message.entities.map(e => ({ id: e.id, type: e.type }))
    });
    
    // Track existing entities
    const existingEntities = new Map<string, Entity>();
    for (const entity of this.entityManager.getAllEntities()) {
      existingEntities.set(entity.id, entity);
    }
    
    // Track which entities are in the new state
    const newEntityIds = new Set<string>();
    
    // Update or create entities
    for (const entityData of message.entities) {
      newEntityIds.add(entityData.id);
      const existingEntity = existingEntities.get(entityData.id);
      
      if (existingEntity) {
        // Update existing entity
        existingEntity.deserialize(entityData);
      } else {
        // Create new entity
        this.entityManager.createEntity(entityData);
        console.log(`Created new entity ${entityData.id} of type ${entityData.type}`);
      }
    }
    
    // Remove entities that are no longer in the state
    for (const [entityId, entity] of existingEntities) {
      if (!newEntityIds.has(entityId)) {
        this.entityManager.removeEntity(entityId);
      }
    }
    
    // Restore local player ID
    if (this.localPlayerId) {
      this.entityManager.setLocalPlayerId(this.localPlayerId);
    }
    
    // Update last processed input for reconciliation
    if (message.lastProcessedInput !== undefined) {
      this.lastProcessedInput = message.lastProcessedInput;
      this.inputSystem.acknowledgeInput(this.lastProcessedInput);
    }
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
    console.log(`Received ${message.updates.length} entity updates`);
    
    for (const update of message.updates) {
      // Just update all entities directly from server state
      this.entityManager.updateEntity(update);
    }
  }
}