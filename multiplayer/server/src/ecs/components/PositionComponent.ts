/**
 * LLM_NOTE: Server-side position component implementation.
 * Tracks entity position and facing direction in the game world.
 */

import { Component } from '@hardmode/shared';
import { ComponentType, IPositionComponent, Direction } from '@hardmode/shared';

export class PositionComponent extends Component implements IPositionComponent {
  readonly type = ComponentType.POSITION;
  
  x: number;
  y: number;
  facing: Direction;
  
  constructor(x: number = 0, y: number = 0, facing: Direction = 'down') {
    super();
    this.x = x;
    this.y = y;
    this.facing = facing;
  }
  
  serialize(): any {
    return {
      x: Math.round(this.x * 100) / 100, // Round to 2 decimal places
      y: Math.round(this.y * 100) / 100,
      facing: this.facing,
    };
  }
  
  deserialize(data: any): void {
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.facing = data.facing || 'down';
    this.markDirty();
  }
  
  clone(): PositionComponent {
    return new PositionComponent(this.x, this.y, this.facing);
  }
  
  /**
   * Set position and mark as dirty.
   */
  setPosition(x: number, y: number): void {
    if (this.x !== x || this.y !== y) {
      this.x = x;
      this.y = y;
      this.markDirty();
    }
  }
  
  /**
   * Set facing and mark as dirty.
   */
  setFacing(facing: Direction): void {
    if (this.facing !== facing) {
      this.facing = facing;
      this.markDirty();
    }
  }
  
  /**
   * Calculate distance to another position.
   */
  distanceTo(other: PositionComponent): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Calculate angle to another position.
   */
  angleTo(other: PositionComponent): number {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }
}