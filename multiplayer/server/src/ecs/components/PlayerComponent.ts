/**
 * LLM_NOTE: Server-side player component implementation.
 * Stores player-specific data like username, class, and stats.
 */

import { Component } from '@hardmode/shared';
import { ComponentType, IPlayerComponent, CharacterClass, CHARACTER_CLASSES } from '@hardmode/shared';

export class PlayerComponent extends Component implements IPlayerComponent {
  readonly type = ComponentType.PLAYER;
  
  username: string;
  characterClass: CharacterClass;
  connectionId: string;
  lastInputSequence: number;
  kills: number;
  deaths: number;
  level: number;
  
  constructor(username: string, characterClass: CharacterClass, connectionId: string) {
    super();
    this.username = username;
    this.characterClass = characterClass;
    this.connectionId = connectionId;
    this.lastInputSequence = -1;
    this.kills = 0;
    this.deaths = 0;
    this.level = 1;
  }
  
  serialize(): any {
    return {
      username: this.username,
      characterClass: this.characterClass,
      level: this.level,
      kills: this.kills,
      deaths: this.deaths,
    };
  }
  
  deserialize(data: any): void {
    this.username = data.username || 'Unknown';
    this.characterClass = data.characterClass || 'bladedancer';
    this.level = data.level || 1;
    this.kills = data.kills || 0;
    this.deaths = data.deaths || 0;
    this.markDirty();
  }
  
  clone(): PlayerComponent {
    const clone = new PlayerComponent(this.username, this.characterClass, this.connectionId);
    clone.lastInputSequence = this.lastInputSequence;
    clone.kills = this.kills;
    clone.deaths = this.deaths;
    clone.level = this.level;
    return clone;
  }
  
  /**
   * Get base movement speed for this player's class.
   */
  getMoveSpeed(): number {
    const classConfig = CHARACTER_CLASSES[this.characterClass];
    return classConfig.moveSpeed;
  }
  
  /**
   * Get base health for this player's class.
   */
  getBaseHealth(): number {
    const classConfig = CHARACTER_CLASSES[this.characterClass];
    return classConfig.hitPoints;
  }
  
  /**
   * Increment kill count.
   */
  addKill(): void {
    this.kills++;
    this.markDirty();
  }
  
  /**
   * Increment death count.
   */
  addDeath(): void {
    this.deaths++;
    this.markDirty();
  }
  
  /**
   * Update level (handled by progression system).
   */
  setLevel(level: number): void {
    if (this.level !== level) {
      this.level = level;
      this.markDirty();
    }
  }
}