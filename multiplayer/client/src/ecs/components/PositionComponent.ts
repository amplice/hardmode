/**
 * LLM_NOTE: Client-side position component.
 * Tracks entity position and facing direction.
 */

import { Component, ComponentType } from '@hardmode/shared';

export class PositionComponent extends Component {
  readonly type = ComponentType.POSITION;
  
  x: number = 0;
  y: number = 0;
  facing: string = 'down';
  
  serialize(): any {
    return {
      x: this.x,
      y: this.y,
      facing: this.facing,
    };
  }
  
  deserialize(data: any): void {
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.facing = data.facing || 'down';
  }
  
  clone(): Component {
    const clone = new PositionComponent();
    clone.x = this.x;
    clone.y = this.y;
    clone.facing = this.facing;
    return clone;
  }
}