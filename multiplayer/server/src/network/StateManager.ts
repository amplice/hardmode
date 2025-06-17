/**
 * LLM_NOTE: Manages game state synchronization and broadcasting to clients.
 * Handles update prioritization, delta compression, and area of interest.
 * 
 * ARCHITECTURE_DECISION: StateManager optimizes network traffic by only
 * sending relevant updates to each player based on their view distance
 * and update priority.
 */

import { 
  Entity,
  MessageType,
  GameStateMessage,
  EntitySpawnMessage,
  EntityDespawnMessage,
  EntityUpdateMessage,
  SerializedEntity,
  EntityUpdate,
  ComponentType,
  AOI_CONFIG,
  UPDATE_PRIORITY,
  SERVER_CONFIG,
  DespawnReason,
} from '@hardmode/shared';
import { GameServer } from '../core/GameServer';
import { Connection } from './Connection';
import { PositionComponent } from '../ecs/components/PositionComponent';

interface PlayerView {
  connection: Connection;
  entity: Entity;
  knownEntities: Set<string>;
  lastUpdateTime: number;
  updateAccumulator: number;
}

export class StateManager {
  private gameServer: GameServer;
  private playerViews: Map<string, PlayerView> = new Map();
  private updateInterval: number;
  private lastFullSync: number = 0;
  private fullSyncInterval: number = 5000; // Full sync every 5 seconds
  
  constructor(gameServer: GameServer) {
    this.gameServer = gameServer;
    this.updateInterval = SERVER_CONFIG.NETWORK_UPDATE_INTERVAL;
  }
  
  /**
   * Initialize the state manager.
   */
  initialize(): void {
    console.log('State manager initialized');
  }
  
  /**
   * Add a player to state management.
   */
  addPlayer(connection: Connection, entity: Entity): void {
    const view: PlayerView = {
      connection,
      entity,
      knownEntities: new Set(),
      lastUpdateTime: Date.now(),
      updateAccumulator: 0,
    };
    
    this.playerViews.set(connection.id, view);
    
    // Send initial game state to new player
    this.sendInitialState(view);
  }
  
  /**
   * Remove a player from state management.
   */
  removePlayer(connection: Connection): void {
    this.playerViews.delete(connection.id);
  }
  
  /**
   * Send updates to all connected players.
   * Called from game loop at network update rate.
   */
  sendUpdates(): void {
    const now = Date.now();
    const deltaTime = this.updateInterval;
    
    // Check if we need a full sync
    const needsFullSync = now - this.lastFullSync > this.fullSyncInterval;
    if (needsFullSync) {
      this.lastFullSync = now;
    }
    
    // Update each player's view
    for (const [, view] of this.playerViews) {
      // Skip disconnected players
      if (!view.connection.isConnected()) {
        continue;
      }
      
      // Accumulate time
      view.updateAccumulator += deltaTime;
      
      // Check if this player needs an update
      if (view.updateAccumulator >= this.updateInterval) {
        view.updateAccumulator = 0;
        
        if (needsFullSync) {
          this.sendFullState(view);
        } else {
          this.sendIncrementalUpdate(view);
        }
        
        view.lastUpdateTime = now;
      }
    }
  }
  
  /**
   * Send initial state to a new player.
   */
  private sendInitialState(view: PlayerView): void {
    const world = this.gameServer.getWorld();
    const allEntities = world.getAllEntities();
    
    // Get entities in player's view
    const visibleEntities = this.getVisibleEntities(view, allEntities);
    
    // Serialize entities
    const serializedEntities: SerializedEntity[] = [];
    for (const entity of visibleEntities) {
      serializedEntities.push(entity.serialize());
      view.knownEntities.add(entity.id);
    }
    
    // Create game state message
    const stateMessage: GameStateMessage = {
      type: MessageType.GAME_STATE,
      timestamp: Date.now(),
      tick: this.gameServer.getCurrentTick(),
      lastProcessedInput: view.connection.getLastInputSequence(),
      entities: serializedEntities,
      events: [], // No events for initial state
    };
    
    view.connection.sendMessage(stateMessage);
  }
  
  /**
   * Send full state sync to a player.
   */
  private sendFullState(view: PlayerView): void {
    // Similar to initial state but may include events
    this.sendInitialState(view);
  }
  
  /**
   * Send incremental updates to a player.
   */
  private sendIncrementalUpdate(view: PlayerView): void {
    const world = this.gameServer.getWorld();
    const allEntities = world.getAllEntities();
    
    // Get entities that should be visible
    const visibleEntities = this.getVisibleEntities(view, allEntities);
    const visibleIds = new Set(visibleEntities.map(e => e.id));
    
    // Find entities to spawn (newly visible)
    const toSpawn: Entity[] = [];
    for (const entity of visibleEntities) {
      if (!view.knownEntities.has(entity.id)) {
        toSpawn.push(entity);
        view.knownEntities.add(entity.id);
      }
    }
    
    // Find entities to despawn (no longer visible)
    const toDespawn: string[] = [];
    for (const knownId of view.knownEntities) {
      if (!visibleIds.has(knownId)) {
        toDespawn.push(knownId);
        view.knownEntities.delete(knownId);
      }
    }
    
    // Collect updates for visible entities
    const updates: EntityUpdate[] = [];
    for (const entity of visibleEntities) {
      if (view.knownEntities.has(entity.id) && !toSpawn.includes(entity)) {
        // Check if entity has dirty components
        const dirtyComponents = entity.getDirtyComponents();
        if (dirtyComponents.length > 0) {
          const update: EntityUpdate = {
            id: entity.id,
            components: {},
            timestamp: Date.now(),
          };
          
          // Only send dirty components
          for (const componentType of dirtyComponents) {
            const component = entity.getComponent(componentType);
            if (component) {
              update.components[componentType] = component.serialize();
            }
          }
          
          updates.push(update);
        }
      }
    }
    
    // Send spawn messages
    for (const entity of toSpawn) {
      const spawnMessage: EntitySpawnMessage = {
        type: MessageType.ENTITY_SPAWN,
        timestamp: Date.now(),
        entity: entity.serialize(),
      };
      view.connection.sendMessage(spawnMessage);
    }
    
    // Send despawn messages
    for (const entityId of toDespawn) {
      const despawnMessage: EntityDespawnMessage = {
        type: MessageType.ENTITY_DESPAWN,
        timestamp: Date.now(),
        entityId,
        reason: DespawnReason.OUT_OF_RANGE,
      };
      view.connection.sendMessage(despawnMessage);
    }
    
    // Send batched updates if any
    if (updates.length > 0) {
      // Prioritize and limit updates
      const prioritizedUpdates = this.prioritizeUpdates(view, updates);
      
      const updateMessage: EntityUpdateMessage = {
        type: MessageType.ENTITY_UPDATE,
        timestamp: Date.now(),
        updates: prioritizedUpdates,
      };
      view.connection.sendMessage(updateMessage);
    }
    
    // Mark entities as clean after sending
    for (const entity of visibleEntities) {
      entity.markClean();
    }
  }
  
  /**
   * Get entities visible to a player based on area of interest.
   */
  private getVisibleEntities(view: PlayerView, allEntities: Entity[]): Entity[] {
    const playerPos = view.entity.getComponent<PositionComponent>(ComponentType.POSITION);
    if (!playerPos) {
      return [];
    }
    
    const visible: Entity[] = [];
    
    for (const entity of allEntities) {
      // Always include self
      if (entity.id === view.entity.id) {
        visible.push(entity);
        continue;
      }
      
      const entityPos = entity.getComponent<PositionComponent>(ComponentType.POSITION);
      if (!entityPos) {
        continue;
      }
      
      // Calculate distance
      const dx = entityPos.x - playerPos.x;
      const dy = entityPos.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check view distance based on entity type
      let viewDistance: number = AOI_CONFIG.PLAYER_VIEW_DISTANCE;
      
      if (entity.hasComponent(ComponentType.MONSTER)) {
        viewDistance = 1000; // MONSTER_SYNC_DISTANCE
      } else if (entity.hasComponent(ComponentType.EFFECT)) {
        viewDistance = 600; // EFFECT_SYNC_DISTANCE
      }
      
      // Important events can be seen from further away
      const combat = entity.getComponent(ComponentType.COMBAT);
      if (combat && (combat as any).isAttacking) {
        viewDistance = 1200; // EXTENDED_VIEW_DISTANCE
      }
      
      if (distance <= viewDistance) {
        visible.push(entity);
      }
    }
    
    return visible;
  }
  
  /**
   * Prioritize updates based on importance and proximity.
   */
  private prioritizeUpdates(view: PlayerView, updates: EntityUpdate[]): EntityUpdate[] {
    const playerPos = view.entity.getComponent<PositionComponent>(ComponentType.POSITION);
    if (!playerPos) {
      return updates;
    }
    
    // Calculate priority for each update
    const prioritized = updates.map(update => {
      let priority = 0;
      
      // Get entity to check its properties
      const entity = this.gameServer.getWorld().getEntity(update.id);
      if (!entity) {
        return { update, priority };
      }
      
      // Distance priority
      const entityPos = entity.getComponent<PositionComponent>(ComponentType.POSITION);
      if (entityPos) {
        const dx = entityPos.x - playerPos.x;
        const dy = entityPos.y - playerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        priority += Math.max(0, 1000 - distance); // Closer = higher priority
      }
      
      // Type priority
      if (entity.hasComponent(ComponentType.PLAYER)) {
        priority += UPDATE_PRIORITY.PLAYER_POSITION * 10;
      } else if (entity.hasComponent(ComponentType.MONSTER)) {
        priority += UPDATE_PRIORITY.MONSTER_POSITION * 10;
      } else if (entity.hasComponent(ComponentType.PROJECTILE)) {
        priority += UPDATE_PRIORITY.PROJECTILE * 10;
      }
      
      // Combat priority
      const combat = entity.getComponent(ComponentType.COMBAT);
      if (combat && (combat as any).isAttacking) {
        priority += UPDATE_PRIORITY.PLAYER_COMBAT * 10;
      }
      
      return { update, priority };
    });
    
    // Sort by priority (highest first)
    prioritized.sort((a, b) => b.priority - a.priority);
    
    // Take top updates (limit to prevent network overload)
    const maxUpdates = 50;
    return prioritized.slice(0, maxUpdates).map(p => p.update);
  }
  
  /**
   * Broadcast an event to all players who can see it.
   */
  broadcastEvent(_event: any, _position?: { x: number; y: number }): void {
    for (const view of this.playerViews.values()) {
      if (!view.connection.isConnected()) {
        continue;
      }
      
      // If position is provided, check if player can see it
      if (_position) {
        const playerPos = view.entity.getComponent<PositionComponent>(ComponentType.POSITION);
        if (playerPos) {
          const dx = _position.x - playerPos.x;
          const dy = _position.y - playerPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > AOI_CONFIG.EXTENDED_VIEW_DISTANCE) {
            continue; // Too far away
          }
        }
      }
      
      // Send event
      // (Implementation depends on event type)
    }
  }
}