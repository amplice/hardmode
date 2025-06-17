/**
 * LLM_NOTE: Client-side player component.
 * Tracks player-specific data like username and class.
 */

import { Component, ComponentType } from '@hardmode/shared';

export class PlayerComponent extends Component {
  readonly type = ComponentType.PLAYER;
  
  username: string = '';
  characterClass: string = 'bladedancer';
  connectionId: string = '';
  lastInputSequence: number = 0;
  level: number = 1;
  experience: number = 0;
  
  serialize(): any {
    return {
      username: this.username,
      characterClass: this.characterClass,
      connectionId: this.connectionId,
      lastInputSequence: this.lastInputSequence,
      level: this.level,
      experience: this.experience,
    };
  }
  
  deserialize(data: any): void {
    this.username = data.username || '';
    this.characterClass = data.characterClass || 'bladedancer';
    this.connectionId = data.connectionId || '';
    this.lastInputSequence = data.lastInputSequence || 0;
    this.level = data.level || 1;
    this.experience = data.experience || 0;
  }
  
  clone(): Component {
    const clone = new PlayerComponent();
    clone.username = this.username;
    clone.characterClass = this.characterClass;
    clone.connectionId = this.connectionId;
    clone.lastInputSequence = this.lastInputSequence;
    clone.level = this.level;
    clone.experience = this.experience;
    return clone;
  }
}