/**
 * LLM_NOTE: Client-side level component.
 * Tracks progression data.
 */

import { Component, ComponentType } from '@hardmode/shared';

export class LevelComponent extends Component {
  readonly type = ComponentType.LEVEL;
  
  level: number = 1;
  experience: number = 0;
  experienceToNext: number = 10;
  
  serialize(): any {
    return {
      level: this.level,
      experience: this.experience,
      experienceToNext: this.experienceToNext,
    };
  }
  
  deserialize(data: any): void {
    this.level = data.level || 1;
    this.experience = data.experience || 0;
    this.experienceToNext = data.experienceToNext || 10;
  }
  
  clone(): Component {
    const clone = new LevelComponent();
    clone.level = this.level;
    clone.experience = this.experience;
    clone.experienceToNext = this.experienceToNext;
    return clone;
  }
}