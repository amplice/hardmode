/**
 * LLM_NOTE: Server-side health component implementation.
 * Manages entity health, damage, and death state.
 * 
 * EXACT_BEHAVIOR: Health values must match character classes exactly.
 */

import { Component } from '@hardmode/shared';
import { ComponentType, IHealthComponent, CharacterClass, CHARACTER_CLASSES } from '@hardmode/shared';

export class HealthComponent extends Component implements IHealthComponent {
  readonly type = ComponentType.HEALTH;
  
  current: number;
  maximum: number;
  isDead: boolean;
  lastDamageTime: number;
  
  constructor(characterClassOrMax: CharacterClass | number) {
    super();
    
    if (typeof characterClassOrMax === 'string') {
      // Initialize from character class
      const classConfig = CHARACTER_CLASSES[characterClassOrMax];
      this.maximum = classConfig.hitPoints;
      this.current = this.maximum;
    } else {
      // Initialize with specific max health
      this.maximum = characterClassOrMax;
      this.current = this.maximum;
    }
    
    this.isDead = false;
    this.lastDamageTime = 0;
  }
  
  serialize(): any {
    return {
      current: this.current,
      maximum: this.maximum,
      isDead: this.isDead,
    };
  }
  
  deserialize(data: any): void {
    this.current = data.current || this.maximum;
    this.maximum = data.maximum || 1;
    this.isDead = data.isDead || false;
    this.markDirty();
  }
  
  clone(): HealthComponent {
    const clone = new HealthComponent(this.maximum);
    clone.current = this.current;
    clone.isDead = this.isDead;
    clone.lastDamageTime = this.lastDamageTime;
    return clone;
  }
  
  /**
   * Apply damage to this entity.
   * Returns true if entity died.
   */
  takeDamage(amount: number): boolean {
    if (this.isDead || amount <= 0) {
      return false;
    }
    
    this.current = Math.max(0, this.current - amount);
    this.lastDamageTime = Date.now();
    
    if (this.current <= 0) {
      this.current = 0;
      this.isDead = true;
    }
    
    this.markDirty();
    return this.isDead;
  }
  
  /**
   * Heal this entity.
   */
  heal(amount: number): void {
    if (this.isDead || amount <= 0) {
      return;
    }
    
    const oldHealth = this.current;
    this.current = Math.min(this.maximum, this.current + amount);
    
    if (this.current !== oldHealth) {
      this.markDirty();
    }
  }
  
  /**
   * Revive this entity with full health.
   */
  revive(): void {
    this.current = this.maximum;
    this.isDead = false;
    this.markDirty();
  }
  
  /**
   * Set maximum health (for level up bonuses).
   */
  setMaximum(max: number): void {
    if (this.maximum !== max) {
      this.maximum = max;
      // Don't exceed new maximum
      if (this.current > this.maximum) {
        this.current = this.maximum;
      }
      this.markDirty();
    }
  }
  
  /**
   * Get health percentage (0-1).
   */
  getHealthPercent(): number {
    return this.maximum > 0 ? this.current / this.maximum : 0;
  }
}