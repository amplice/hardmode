/**
 * LLM_NOTE: Validates player attack requests to prevent attack spam and cheating.
 * Ensures attacks respect cooldowns and timing constraints.
 * 
 * EXACT_BEHAVIOR: Attack timings and cooldowns must match the original game
 * exactly to preserve gameplay balance.
 */

import { 
  Entity,
  ComponentType,
  PlayerAttackMessage,
  CHARACTER_ATTACKS,
  AttackType,
} from '@hardmode/shared';
import { PlayerComponent } from '../ecs/components/PlayerComponent';
import { CombatComponent } from '../ecs/components/CombatComponent';
import { LevelComponent } from '../ecs/components/LevelComponent';

export class AttackValidator {
  /**
   * Validate a player attack request.
   */
  validateAttack(player: Entity, attack: PlayerAttackMessage): boolean {
    // Validate attack message format
    if (!this.validateAttackMessage(attack)) {
      return false;
    }
    
    const playerComp = player.getComponent<PlayerComponent>(ComponentType.PLAYER);
    const combat = player.getComponent<CombatComponent>(ComponentType.COMBAT);
    const level = player.getComponent<LevelComponent>(ComponentType.LEVEL);
    
    if (!playerComp || !combat) {
      return false;
    }
    
    // Check if attack type is valid
    const validAttacks: AttackType[] = ['primary', 'secondary'];
    if (level && level.level >= 5) {
      validAttacks.push('roll');
    }
    
    if (!validAttacks.includes(attack.attackType)) {
      console.warn(`Invalid attack type: ${attack.attackType}`);
      return false;
    }
    
    // Get attack configuration
    const attackKey = attack.attackType === 'roll' 
      ? 'roll' 
      : `${playerComp.characterClass}_${attack.attackType}`;
    const attackConfig = CHARACTER_ATTACKS[attackKey as keyof typeof CHARACTER_ATTACKS];
    
    if (!attackConfig) {
      console.error(`No attack config for: ${attackKey}`);
      return false;
    }
    
    // Check cooldown
    const lastAttackTime = combat.lastAttackTime[attack.attackType] || 0;
    const timeSinceLastAttack = Date.now() - lastAttackTime;
    
    // Apply cooldown reduction from levels
    let cooldown = attackConfig.cooldown;
    if (level) {
      if (level.level >= 4) cooldown -= 100; // -100ms at level 4
      if (level.level >= 8) cooldown -= 100; // -100ms at level 8
    }
    cooldown = Math.max(100, cooldown); // Minimum 100ms cooldown
    
    if (timeSinceLastAttack < cooldown) {
      console.warn(`Attack on cooldown: ${timeSinceLastAttack} < ${cooldown}`);
      return false;
    }
    
    // Validate mouse position
    if (!this.validateMousePosition(attack.mousePosition)) {
      return false;
    }
    
    // Validate timestamp
    const now = Date.now();
    if (attack.timestamp > now + 1000 || attack.timestamp < now - 5000) {
      console.warn(`Invalid attack timestamp: ${attack.timestamp}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate attack message format.
   */
  private validateAttackMessage(attack: any): attack is PlayerAttackMessage {
    if (!attack || typeof attack !== 'object') {
      return false;
    }
    
    if (typeof attack.timestamp !== 'number') {
      return false;
    }
    
    if (!['primary', 'secondary', 'roll'].includes(attack.attackType)) {
      return false;
    }
    
    if (!attack.mousePosition || 
        typeof attack.mousePosition.x !== 'number' ||
        typeof attack.mousePosition.y !== 'number') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate mouse position is reasonable.
   */
  private validateMousePosition(pos: { x: number; y: number }): boolean {
    // Check bounds (world coordinates)
    if (pos.x < -1000 || pos.x > 10000 ||
        pos.y < -1000 || pos.y > 10000) {
      return false;
    }
    
    return true;
  }
}