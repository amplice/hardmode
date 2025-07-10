/**
 * @fileoverview Projectile - Server-side projectile entity class
 * 
 * REARCHITECTURE PHASE 6.1:
 * Convert projectile system to class-based architecture for:
 * - Better lifecycle management and encapsulation
 * - Type-safe projectile state and behavior
 * - Consistent entity pattern with Player and Monster classes
 * - Improved collision detection and damage application
 * 
 * CLASS BENEFITS:
 * - Encapsulated movement and collision logic
 * - Self-contained lifecycle (creation, update, destruction)
 * - Type-safe state management with clear interfaces
 * - Easier testing and debugging of projectile behavior
 * - Extensible for different projectile types
 * 
 * PROJECTILE TYPES:
 * - Standard: Linear movement projectiles (arrows, shots)
 * - Future: Homing, piercing, area-effect projectiles
 */

import { getDistance } from '../../shared/utils/MathUtils.js';
import type { Position } from '../../shared/types/GameTypes.js';

// Projectile configuration interface
export interface ProjectileConfig {
    id: string;
    ownerId: string;
    ownerType: string; // Player class or monster type
    startPosition: Position;
    angle: number;
    speed?: number;
    damage?: number;
    range?: number;
    effectType?: string;
}

// Target interface for collision detection
export interface ProjectileTarget {
    id: string;
    position: Position;
    hp: number;
    collisionRadius?: number;
}

// Hit result for damage processing
export interface ProjectileHitResult {
    hit: boolean;
    targetId?: string;
    targetType?: 'player' | 'monster';
    damage?: number;
}

/**
 * Server-side Projectile class
 * Handles authoritative projectile physics and collision detection
 */
export class Projectile {
    // Identity
    public readonly id: string;
    public readonly ownerId: string;
    public readonly ownerType: string;
    
    // Position and movement
    private position: Position;
    private readonly startPosition: Position;
    private readonly velocity: Position;
    private readonly angle: number;
    private readonly speed: number;
    
    // Combat properties
    private readonly damage: number;
    private readonly maxRange: number;
    private distanceTraveled: number;
    
    // Visual properties
    public readonly effectType: string;
    
    // State
    private active: boolean;
    private readonly createdAt: number;
    
    constructor(config: ProjectileConfig) {
        // Identity
        this.id = config.id;
        this.ownerId = config.ownerId;
        this.ownerType = config.ownerType;
        
        // Position and movement
        this.position = { ...config.startPosition };
        this.startPosition = { ...config.startPosition };
        this.angle = config.angle;
        this.speed = config.speed || 700;
        
        // Calculate velocity from angle and speed
        this.velocity = {
            x: Math.cos(config.angle) * this.speed,
            y: Math.sin(config.angle) * this.speed
        };
        
        // Combat properties
        this.damage = config.damage || 1;
        this.maxRange = config.range || 600;
        this.distanceTraveled = 0;
        
        // Visual properties
        this.effectType = config.effectType || 'bow_shot_effect';
        
        // State
        this.active = true;
        this.createdAt = Date.now();
    }
    
    /**
     * Update projectile position and check range
     * @param deltaTime - Time since last update in seconds
     * @returns true if projectile is still active
     */
    public update(deltaTime: number): boolean {
        if (!this.active) return false;
        
        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Calculate distance traveled
        this.distanceTraveled = getDistance(this.startPosition, this.position);
        
        // Check if exceeded max range
        if (this.distanceTraveled >= this.maxRange) {
            this.deactivate();
            return false;
        }
        
        return true;
    }
    
    /**
     * Check collision with a target
     * @param target - Entity to check collision against
     * @returns Hit result if collision detected
     */
    public checkCollision(target: ProjectileTarget): ProjectileHitResult {
        if (!this.active || target.hp <= 0) {
            return { hit: false };
        }
        
        // Don't hit the owner
        if (target.id === this.ownerId) {
            return { hit: false };
        }
        
        // Calculate distance to target
        const distance = getDistance(this.position, target.position);
        const hitRadius = target.collisionRadius || 20;
        
        if (distance <= hitRadius) {
            // Hit detected
            this.deactivate();
            return {
                hit: true,
                targetId: target.id,
                damage: this.damage
            };
        }
        
        return { hit: false };
    }
    
    /**
     * Check if this projectile should hit monsters (player projectile)
     * @returns true if this is a player projectile
     */
    public shouldHitMonsters(): boolean {
        // Monster types that create projectiles
        const monsterTypes = ['skeleton', 'elemental', 'ghoul', 'ogre', 'wildarcher'];
        return !monsterTypes.includes(this.ownerType);
    }
    
    /**
     * Deactivate the projectile
     */
    public deactivate(): void {
        this.active = false;
    }
    
    /**
     * Check if projectile is still active
     */
    public isActive(): boolean {
        return this.active;
    }
    
    /**
     * Get current position
     */
    public getPosition(): Position {
        return { ...this.position };
    }
    
    /**
     * Get projectile data for network sync
     */
    public serialize() {
        return {
            id: this.id,
            ownerId: this.ownerId,
            ownerType: this.ownerType,
            x: this.position.x,
            y: this.position.y,
            angle: this.angle,
            speed: this.speed,
            damage: this.damage,
            effectType: this.effectType,
            active: this.active
        };
    }
    
    /**
     * Get creation data for client notification
     */
    public getCreationData() {
        return {
            id: this.id,
            ownerId: this.ownerId,
            ownerType: this.ownerType,
            x: this.startPosition.x,
            y: this.startPosition.y,
            angle: this.angle,
            speed: this.speed,
            effectType: this.effectType
        };
    }
}