import { Vector2 } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export interface ProjectileState {
  id: string;
  ownerId: string;
  type: string;
  position: Vector2;
  velocity: Vector2;
  damage: number;
  createdAt: number;
  maxLifetime: number;
}

export class Projectile {
  public id: string;
  public ownerId: string;
  public type: string;
  public position: Vector2;
  public velocity: Vector2;
  public damage: number;
  public createdAt: number;
  public maxLifetime: number;
  public radius: number;
  public isAlive: boolean;
  
  constructor(ownerId: string, type: string, position: Vector2, direction: Vector2, config: {
    speed: number;
    damage: number;
    maxLifetime?: number;
    radius?: number;
  }) {
    this.id = uuidv4();
    this.ownerId = ownerId;
    this.type = type;
    this.position = { ...position };
    
    // Calculate velocity from direction and speed
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (length > 0) {
      this.velocity = {
        x: (direction.x / length) * config.speed,
        y: (direction.y / length) * config.speed,
      };
    } else {
      this.velocity = { x: 0, y: 0 };
    }
    
    this.damage = config.damage;
    this.createdAt = Date.now();
    this.maxLifetime = config.maxLifetime || 2000; // 2 seconds default
    this.radius = config.radius || 5; // 5 pixel radius default
    this.isAlive = true;
  }
  
  update(deltaTime: number): void {
    if (!this.isAlive) return;
    
    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    // Check lifetime
    if (Date.now() - this.createdAt > this.maxLifetime) {
      this.isAlive = false;
    }
  }
  
  getState(): ProjectileState {
    return {
      id: this.id,
      ownerId: this.ownerId,
      type: this.type,
      position: { ...this.position },
      velocity: { ...this.velocity },
      damage: this.damage,
      createdAt: this.createdAt,
      maxLifetime: this.maxLifetime,
    };
  }
  
  // Check collision with a point and radius (for entities)
  checkCollision(targetPos: Vector2, targetRadius: number): boolean {
    const dx = this.position.x - targetPos.x;
    const dy = this.position.y - targetPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < (this.radius + targetRadius);
  }
}