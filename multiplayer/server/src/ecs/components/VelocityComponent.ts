/**
 * LLM_NOTE: Server-side velocity component implementation.
 * Tracks entity movement velocity for physics calculations.
 */

import { Component } from '@hardmode/shared';
import { ComponentType, IVelocityComponent } from '@hardmode/shared';

export class VelocityComponent extends Component implements IVelocityComponent {
  readonly type = ComponentType.VELOCITY;
  
  x: number;
  y: number;
  
  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }
  
  serialize(): any {
    return {
      x: Math.round(this.x * 100) / 100, // Round to 2 decimal places
      y: Math.round(this.y * 100) / 100,
    };
  }
  
  deserialize(data: any): void {
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.markDirty();
  }
  
  clone(): VelocityComponent {
    return new VelocityComponent(this.x, this.y);
  }
  
  /**
   * Set velocity and mark as dirty.
   */
  setVelocity(x: number, y: number): void {
    if (this.x !== x || this.y !== y) {
      this.x = x;
      this.y = y;
      this.markDirty();
    }
  }
  
  /**
   * Calculate magnitude (speed) of velocity.
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  
  /**
   * Normalize velocity to unit vector.
   */
  normalize(): this {
    const mag = this.magnitude();
    if (mag > 0) {
      this.x /= mag;
      this.y /= mag;
      this.markDirty();
    }
    return this;
  }
  
  /**
   * Scale velocity by a factor.
   */
  scale(factor: number): this {
    this.x *= factor;
    this.y *= factor;
    this.markDirty();
    return this;
  }
  
  /**
   * Set velocity to zero.
   */
  zero(): void {
    if (this.x !== 0 || this.y !== 0) {
      this.x = 0;
      this.y = 0;
      this.markDirty();
    }
  }
}