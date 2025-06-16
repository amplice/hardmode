/**
 * LLM_NOTE: Client-side network component.
 * Tracks network state for prediction and interpolation.
 */

import { Component, ComponentType } from '@hardmode/shared';

export class NetworkComponent extends Component {
  readonly type = ComponentType.NETWORK;
  
  connectionId: string = '';
  lastUpdateTime: number = 0;
  interpolationBuffer: any[] = [];
  
  serialize(): any {
    return {
      connectionId: this.connectionId,
      lastUpdateTime: this.lastUpdateTime,
    };
  }
  
  deserialize(data: any): void {
    this.connectionId = data.connectionId || '';
    this.lastUpdateTime = data.lastUpdateTime || 0;
  }
  
  clone(): Component {
    const clone = new NetworkComponent();
    clone.connectionId = this.connectionId;
    clone.lastUpdateTime = this.lastUpdateTime;
    clone.interpolationBuffer = [...this.interpolationBuffer];
    return clone;
  }
}