/**
 * LLM_NOTE: Client-side health component.
 * Tracks entity health for UI display.
 */

import { Component, ComponentType } from '@hardmode/shared';

export class HealthComponent extends Component {
  readonly type = ComponentType.HEALTH;
  
  current: number = 3;
  maximum: number = 3;
  isDead: boolean = false;
  lastDamageTime: number = 0;
  
  serialize(): any {
    return {
      current: this.current,
      maximum: this.maximum,
      isDead: this.isDead,
      lastDamageTime: this.lastDamageTime,
    };
  }
  
  deserialize(data: any): void {
    this.current = data.current || 3;
    this.maximum = data.maximum || 3;
    this.isDead = data.isDead || false;
    this.lastDamageTime = data.lastDamageTime || 0;
  }
  
  clone(): Component {
    const clone = new HealthComponent();
    clone.current = this.current;
    clone.maximum = this.maximum;
    clone.isDead = this.isDead;
    clone.lastDamageTime = this.lastDamageTime;
    return clone;
  }
}