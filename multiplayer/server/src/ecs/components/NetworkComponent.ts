/**
 * LLM_NOTE: Server-side network component implementation.
 * Tracks network-related metadata for entities.
 */

import { Component } from '@hardmode/shared';
import { ComponentType, INetworkComponent, UPDATE_PRIORITY } from '@hardmode/shared';

export class NetworkComponent extends Component implements INetworkComponent {
  readonly type = ComponentType.NETWORK;
  
  ownerId: string;
  priority: number;
  lastSyncTime: number;
  syncRate: number;
  
  constructor(ownerId: string, priority: number = UPDATE_PRIORITY.PLAYER_POSITION) {
    super();
    this.ownerId = ownerId;
    this.priority = priority;
    this.lastSyncTime = 0;
    this.syncRate = 50; // Default 50ms (20Hz)
  }
  
  serialize(): any {
    // Network component data is not sent to clients
    return {};
  }
  
  deserialize(data: any): void {
    // Network component is server-only
  }
  
  clone(): NetworkComponent {
    const clone = new NetworkComponent(this.ownerId, this.priority);
    clone.lastSyncTime = this.lastSyncTime;
    clone.syncRate = this.syncRate;
    return clone;
  }
  
  /**
   * Check if entity needs sync based on sync rate.
   */
  needsSync(): boolean {
    return Date.now() - this.lastSyncTime >= this.syncRate;
  }
  
  /**
   * Mark entity as synced.
   */
  markSynced(): void {
    this.lastSyncTime = Date.now();
  }
  
  /**
   * Set custom sync rate for this entity.
   */
  setSyncRate(rate: number): void {
    this.syncRate = Math.max(16, rate); // Minimum 16ms (60Hz)
  }
}