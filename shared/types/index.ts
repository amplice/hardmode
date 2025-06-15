// Shared types between client and server

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  username: string;
  position: Vector2;
  velocity: Vector2;
  health: number;
  maxHealth: number;
  class: string;
  isInvulnerable?: boolean;
  isDead?: boolean;
}

export interface InputState {
  movement: Vector2; // normalized direction
  mousePosition: Vector2; // world position
  attacking: boolean;
}

export interface GameConfig {
  tickRate: number;
  updateRate: number;
  maxPlayers: number;
}