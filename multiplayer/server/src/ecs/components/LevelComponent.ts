/**
 * LLM_NOTE: Server-side level/experience component implementation.
 * Tracks player progression and level-based bonuses.
 * 
 * EXACT_BEHAVIOR: XP requirements and level bonuses must match original game.
 */

import { Component } from '@hardmode/shared';
import { ComponentType, ILevelComponent, PROGRESSION_CONFIG } from '@hardmode/shared';

export class LevelComponent extends Component implements ILevelComponent {
  readonly type = ComponentType.LEVEL;
  
  level: number;
  experience: number;
  experienceToNext: number;
  rollUnlocked: boolean;
  
  constructor() {
    super();
    this.level = 1;
    this.experience = 0;
    this.experienceToNext = this.calculateXpToNext();
    this.rollUnlocked = false;
  }
  
  serialize(): any {
    return {
      level: this.level,
      experience: this.experience,
      experienceToNext: this.experienceToNext,
      rollUnlocked: this.rollUnlocked,
    };
  }
  
  deserialize(data: any): void {
    this.level = data.level || 1;
    this.experience = data.experience || 0;
    this.experienceToNext = data.experienceToNext || this.calculateXpToNext();
    this.rollUnlocked = data.rollUnlocked || false;
    this.markDirty();
  }
  
  clone(): LevelComponent {
    const clone = new LevelComponent();
    clone.level = this.level;
    clone.experience = this.experience;
    clone.experienceToNext = this.experienceToNext;
    clone.rollUnlocked = this.rollUnlocked;
    return clone;
  }
  
  /**
   * Add experience and check for level up.
   * Returns true if leveled up.
   */
  addExperience(amount: number): boolean {
    if (this.level >= PROGRESSION_CONFIG.maxLevel) {
      return false;
    }
    
    this.experience += amount;
    let leveledUp = false;
    
    // Check for level up(s)
    while (this.experience >= this.experienceToNext && this.level < PROGRESSION_CONFIG.maxLevel) {
      this.experience -= this.experienceToNext;
      this.level++;
      leveledUp = true;
      
      // Check for roll unlock at level 5
      if (this.level === 5) {
        this.rollUnlocked = true;
      }
      
      this.experienceToNext = this.calculateXpToNext();
    }
    
    // Cap experience at max level
    if (this.level >= PROGRESSION_CONFIG.maxLevel) {
      this.experience = 0;
      this.experienceToNext = 0;
    }
    
    this.markDirty();
    return leveledUp;
  }
  
  /**
   * Calculate XP needed for next level.
   * Formula: current level * 20
   */
  private calculateXpToNext(): number {
    if (this.level >= PROGRESSION_CONFIG.maxLevel) {
      return 0;
    }
    return this.level * PROGRESSION_CONFIG.xpGrowth;
  }
  
  /**
   * Get total XP earned (for statistics).
   */
  getTotalExperience(): number {
    // Sum of XP for all previous levels plus current
    let total = this.experience;
    for (let i = 1; i < this.level; i++) {
      total += i * PROGRESSION_CONFIG.xpGrowth;
    }
    return total;
  }
  
  /**
   * Get level progress as percentage (0-1).
   */
  getProgressPercent(): number {
    if (this.experienceToNext === 0) {
      return 1; // Max level
    }
    return this.experience / this.experienceToNext;
  }
}