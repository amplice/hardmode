/**
 * LLM_NOTE: Client-side velocity component.
 * Tracks entity movement speed for interpolation.
 */

import { Component, ComponentType } from '@hardmode/shared';

export class VelocityComponent extends Component {
  readonly type = ComponentType.VELOCITY;
  
  x: number = 0;
  y: number = 0;
  
  serialize(): any {
    return {
      x: this.x,
      y: this.y,
    };
  }
  
  deserialize(data: any): void {
    this.x = data.x || 0;
    this.y = data.y || 0;
  }
  
  clone(): Component {
    const clone = new VelocityComponent();
    clone.x = this.x;
    clone.y = this.y;
    return clone;
  }
}