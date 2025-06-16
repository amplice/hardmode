/**
 * LLM_NOTE: Server-side combat component implementation.
 * Manages attack state, cooldowns, and combat-related status effects.
 */

import { Component } from '@hardmode/shared';
import { ComponentType, ICombatComponent, AttackType } from '@hardmode/shared';

export class CombatComponent extends Component implements ICombatComponent {
  readonly type = ComponentType.COMBAT;
  
  isAttacking: boolean;
  currentAttack: AttackType | null;
  attackStartTime: number;
  lastAttackTime: Record<AttackType, number>;
  canAttack: boolean;
  invulnerable: boolean;
  
  // Additional server-side properties
  stunEndTime: number;
  invulnerableEndTime: number;
  
  constructor() {
    super();
    this.isAttacking = false;
    this.currentAttack = null;
    this.attackStartTime = 0;
    this.lastAttackTime = {
      primary: 0,
      secondary: 0,
      roll: 0,
    };
    this.canAttack = true;
    this.invulnerable = false;
    this.stunEndTime = 0;
    this.invulnerableEndTime = 0;
  }
  
  serialize(): any {
    return {
      isAttacking: this.isAttacking,
      currentAttack: this.currentAttack,
      canAttack: this.canAttack,
      invulnerable: this.invulnerable,
    };
  }
  
  deserialize(data: any): void {
    this.isAttacking = data.isAttacking || false;
    this.currentAttack = data.currentAttack || null;
    this.canAttack = data.canAttack !== false;
    this.invulnerable = data.invulnerable || false;
    this.markDirty();
  }
  
  clone(): CombatComponent {
    const clone = new CombatComponent();
    clone.isAttacking = this.isAttacking;
    clone.currentAttack = this.currentAttack;
    clone.attackStartTime = this.attackStartTime;
    clone.lastAttackTime = { ...this.lastAttackTime };
    clone.canAttack = this.canAttack;
    clone.invulnerable = this.invulnerable;
    clone.stunEndTime = this.stunEndTime;
    clone.invulnerableEndTime = this.invulnerableEndTime;
    return clone;
  }
  
  /**
   * Start an attack.
   */
  startAttack(attackType: AttackType): void {
    this.isAttacking = true;
    this.currentAttack = attackType;
    this.attackStartTime = Date.now();
    this.lastAttackTime[attackType] = Date.now();
    this.markDirty();
  }
  
  /**
   * End the current attack.
   */
  endAttack(): void {
    this.isAttacking = false;
    this.currentAttack = null;
    this.markDirty();
  }
  
  /**
   * Apply stun effect.
   */
  applyStun(duration: number): void {
    const endTime = Date.now() + duration;
    if (endTime > this.stunEndTime) {
      this.stunEndTime = endTime;
      this.canAttack = false;
      this.markDirty();
    }
  }
  
  /**
   * Apply invulnerability.
   */
  applyInvulnerability(duration: number): void {
    const endTime = Date.now() + duration;
    if (endTime > this.invulnerableEndTime) {
      this.invulnerableEndTime = endTime;
      this.invulnerable = true;
      this.markDirty();
    }
  }
  
  /**
   * Update combat state (called each tick).
   */
  update(): void {
    const now = Date.now();
    let changed = false;
    
    // Check if stun expired
    if (this.stunEndTime > 0 && now >= this.stunEndTime) {
      this.stunEndTime = 0;
      this.canAttack = true;
      changed = true;
    }
    
    // Check if invulnerability expired
    if (this.invulnerableEndTime > 0 && now >= this.invulnerableEndTime) {
      this.invulnerableEndTime = 0;
      this.invulnerable = false;
      changed = true;
    }
    
    if (changed) {
      this.markDirty();
    }
  }
  
  /**
   * Check if an attack type is on cooldown.
   */
  isOnCooldown(attackType: AttackType, cooldownMs: number): boolean {
    const lastTime = this.lastAttackTime[attackType] || 0;
    return Date.now() - lastTime < cooldownMs;
  }
}