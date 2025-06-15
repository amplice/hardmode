import { Vector2, PlayerState, InputState } from '../../../shared/types';
import { logger } from '../utils/logger';

export enum PlayerStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  PLAYING = 'playing',
  DEAD = 'dead',
  DISCONNECTED = 'disconnected',
}

export class Player {
  public id: string;
  public username: string;
  public status: PlayerStatus;
  public position: Vector2;
  public velocity: Vector2;
  public health: number;
  public maxHealth: number;
  public class: string;
  public lastInputTime: number;
  public lastUpdateTime: number;
  public lastAttackTime: number;
  public connectionId: string;
  public invulnerableUntil: number;
  public facing: string;
  public currentAttackType: string | null;
  
  // Movement constants
  private readonly FRICTION = 0.85;
  
  constructor(id: string, username: string, connectionId: string) {
    this.id = id;
    this.username = username;
    this.connectionId = connectionId;
    this.status = PlayerStatus.CONNECTING;
    
    // Initialize at spawn point (will be set properly later)
    this.position = { x: 400, y: 300 };
    this.velocity = { x: 0, y: 0 };
    
    // Default stats
    this.health = 100;
    this.maxHealth = 100;
    this.class = 'warrior'; // Default class
    
    this.lastInputTime = Date.now();
    this.lastUpdateTime = Date.now();
    this.lastAttackTime = 0;
    this.invulnerableUntil = 0;
    this.facing = 'south'; // Default facing direction
    this.currentAttackType = null;
  }
  
  setClass(className: string): void {
    this.class = className;
    // TODO: Set class-specific stats
    switch (className) {
      case 'warrior':
        this.maxHealth = 120;
        break;
      case 'archer':
        this.maxHealth = 80;
        break;
      case 'mage':
        this.maxHealth = 60;
        break;
      default:
        this.maxHealth = 100;
    }
    this.health = this.maxHealth;
  }
  
  setSpawnPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.velocity.x = 0;
    this.velocity.y = 0;
  }
  
  processInput(input: InputState, deltaTime: number): void {
    if (this.status !== PlayerStatus.PLAYING) return;
    
    this.lastInputTime = Date.now();
    
    // Update facing direction if provided
    if (input.facing) {
      this.facing = input.facing;
    }
    
    // Apply movement input
    const moveX = input.movement.x;
    const moveY = input.movement.y;
    
    // Normalize diagonal movement
    const length = Math.sqrt(moveX * moveX + moveY * moveY);
    if (length > 0) {
      // Get class-specific movement speed and match client calculation
      const moveSpeed = this.getMoveSpeed();
      this.velocity.x = (moveX / length) * moveSpeed;
      this.velocity.y = (moveY / length) * moveSpeed;
    }
    
    // Update attack type if provided
    if (input.attacking && input.attackType) {
      this.currentAttackType = input.attackType;
    } else {
      this.currentAttackType = null;
    }
  }
  
  update(deltaTime: number): void {
    if (this.status !== PlayerStatus.PLAYING) return;
    
    // Apply velocity to position (velocity is already in units per frame)
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    
    // Apply friction
    this.velocity.x *= this.FRICTION;
    this.velocity.y *= this.FRICTION;
    
    // Stop if velocity is very small
    if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;
    
    this.lastUpdateTime = Date.now();
  }
  
  takeDamage(amount: number): void {
    if (this.status !== PlayerStatus.PLAYING) return;
    
    // Check invulnerability
    if (this.invulnerableUntil > Date.now()) {
      return; // No damage during invulnerability
    }
    
    this.health = Math.max(0, this.health - amount);
    
    if (this.health === 0) {
      this.status = PlayerStatus.DEAD;
      logger.info(`Player ${this.username} died`);
    }
  }
  
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
  
  respawn(): void {
    this.status = PlayerStatus.PLAYING;
    this.health = this.maxHealth;
    this.velocity = { x: 0, y: 0 };
    this.lastAttackTime = 0;
    // Position will be set by the game instance
  }
  
  getState(): PlayerState {
    return {
      id: this.id,
      username: this.username,
      position: { ...this.position },
      velocity: { ...this.velocity },
      health: this.health,
      maxHealth: this.maxHealth,
      class: this.class,
      facing: this.facing,
      isInvulnerable: this.isInvulnerable(),
      isDead: this.status === PlayerStatus.DEAD,
    };
  }
  
  isTimedOut(timeoutMs: number = 30000): boolean {
    return Date.now() - this.lastInputTime > timeoutMs;
  }
  
  isInvulnerable(): boolean {
    return this.invulnerableUntil > Date.now();
  }
  
  setInvulnerable(durationMs: number): void {
    this.invulnerableUntil = Date.now() + durationMs;
  }
  
  canAttack(): boolean {
    const attackCooldown = this.getAttackCooldown();
    return Date.now() - this.lastAttackTime >= attackCooldown;
  }
  
  setLastAttackTime(time: number): void {
    this.lastAttackTime = time;
  }
  
  private getAttackCooldown(): number {
    // Attack cooldowns by class and type
    const cooldowns: { [key: string]: number } = {
      'hunter': 600,      // Bow attacks
      'bladedancer': 400, // Fast sword attacks
      'guardian': 600,    // Slower axe attacks
      'rogue': 300,       // Very fast dagger attacks
    };
    
    return cooldowns[this.class] || 500;
  }
  
  private getMoveSpeed(): number {
    // Class-specific movement speeds matching client
    const speeds: { [key: string]: number } = {
      'bladedancer': 5,
      'guardian': 3.5,
      'hunter': 5,
      'rogue': 6,
    };
    
    return speeds[this.class] || 5;
  }
}