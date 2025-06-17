/**
 * SIMPLIFIED StateManager - Just broadcast all entity positions to all players
 */

import { 
  Entity,
  MessageType,
  EntityUpdateMessage,
  ComponentType,
} from '@hardmode/shared';
import { GameServer } from '../core/GameServer';
import { Connection } from './Connection';

export class StateManager {
  private gameServer: GameServer;
  private updateTimer: number = 0;
  private updateInterval: number = 50; // Send updates every 50ms (20Hz)
  
  constructor(gameServer: GameServer) {
    this.gameServer = gameServer;
  }
  
  initialize(): void {
    console.log('State manager initialized');
  }
  
  addPlayer(connection: Connection, entity: Entity): void {
    console.log(`Added player ${entity.id} to state management`);
  }
  
  removePlayer(connection: Connection): void {
    console.log(`Removed player from state management`);
  }
  
  /**
   * Send position updates for all entities to all players
   */
  sendUpdates(deltaTime: number): void {
    this.updateTimer += deltaTime;
    
    // Only send updates at 20Hz
    if (this.updateTimer < this.updateInterval) {
      return;
    }
    
    this.updateTimer = 0;
    
    // Get all entities
    const allEntities = this.gameServer.getWorld().getAllEntities();
    const updates: any[] = [];
    
    // Collect position data for all entities
    for (const entity of allEntities) {
      const position = entity.getComponent(ComponentType.POSITION);
      const velocity = entity.getComponent(ComponentType.VELOCITY);
      const player = entity.getComponent(ComponentType.PLAYER);
      
      if (position) {
        const update: any = {
          id: entity.id,
          components: {
            [ComponentType.POSITION]: position.serialize()
          },
          timestamp: Date.now()
        };
        
        if (velocity) {
          update.components[ComponentType.VELOCITY] = velocity.serialize();
        }
        
        if (player) {
          update.components[ComponentType.PLAYER] = player.serialize();
        }
        
        updates.push(update);
      }
    }
    
    // Send to all connected players
    if (updates.length > 0) {
      const updateMessage: EntityUpdateMessage = {
        type: MessageType.ENTITY_UPDATE,
        timestamp: Date.now(),
        updates: updates
      };
      
      for (const connection of this.gameServer.getConnections().values()) {
        if (connection.isConnected()) {
          connection.sendMessage(updateMessage);
        }
      }
      
      // Log player positions for debugging
      const playerUpdates = updates.filter(u => {
        const entity = this.gameServer.getWorld().getEntity(u.id);
        return entity && entity.hasComponent(ComponentType.PLAYER);
      });
      
      if (playerUpdates.length > 0) {
        console.log(`Broadcasting ${playerUpdates.length} player positions:`);
        for (const update of playerUpdates) {
          const pos = update.components[ComponentType.POSITION];
          if (pos) {
            console.log(`  - Player ${update.id}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
          }
        }
      }
    }
  }
}