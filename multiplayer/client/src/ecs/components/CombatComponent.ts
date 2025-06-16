/**
 * LLM_NOTE: Client-side combat component.
 * Tracks combat state for animation and effects.
 */

import { Component, ComponentType } from '@hardmode/shared';

export class CombatComponent extends Component {
  readonly type = ComponentType.COMBAT;
  
  isAttacking: boolean = false;
  currentAttack: string | null = null;
  attackStartTime: number = 0;
  stunEndTime: number = 0;
  invulnerableEndTime: number = 0;
  lastAttackTime: number = 0;
  comboCount: number = 0;
  
  serialize(): any {
    return {
      isAttacking: this.isAttacking,
      currentAttack: this.currentAttack,
      attackStartTime: this.attackStartTime,
      stunEndTime: this.stunEndTime,
      invulnerableEndTime: this.invulnerableEndTime,
      lastAttackTime: this.lastAttackTime,
      comboCount: this.comboCount,
    };
  }
  
  deserialize(data: any): void {
    this.isAttacking = data.isAttacking || false;
    this.currentAttack = data.currentAttack || null;
    this.attackStartTime = data.attackStartTime || 0;
    this.stunEndTime = data.stunEndTime || 0;
    this.invulnerableEndTime = data.invulnerableEndTime || 0;
    this.lastAttackTime = data.lastAttackTime || 0;
    this.comboCount = data.comboCount || 0;
  }
  
  clone(): Component {
    const clone = new CombatComponent();
    clone.isAttacking = this.isAttacking;
    clone.currentAttack = this.currentAttack;
    clone.attackStartTime = this.attackStartTime;
    clone.stunEndTime = this.stunEndTime;
    clone.invulnerableEndTime = this.invulnerableEndTime;
    clone.lastAttackTime = this.lastAttackTime;
    clone.comboCount = this.comboCount;
    return clone;
  }
}