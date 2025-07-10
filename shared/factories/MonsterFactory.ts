/**
 * @fileoverview MonsterFactory - Centralized monster creation with validation
 * 
 * REARCHITECTURE PHASE 5.2:
 * Centralize monster creation to:
 * - Ensure consistent monster initialization across client and server
 * - Prevent missing properties that cause AI or combat issues
 * - Validate monster state completeness at creation time
 * - Standardize stat calculation and default value application
 * 
 * FACTORY PATTERN BENEFITS:
 * - Single source of truth for monster creation logic
 * - Type safety with comprehensive validation
 * - Consistent stat calculations from base configs
 * - Easy testing and debugging of monster initialization
 * - Extensible for future monster types and variants
 * 
 * USAGE:
 * ```typescript
 * const monster = MonsterFactory.create({
 *   type: 'ogre',
 *   position: { x: 100, y: 200 },
 *   level: 1
 * });
 * ```
 */

import { MONSTER_STATS } from '../constants/GameConstants.js';
import { MonsterStateMachine, type MonsterStateData, createStateMachineFromLegacy } from '../systems/MonsterStateMachine.js';
import type { MonsterType, Direction, Position } from '../types/GameTypes.js';

// Factory configuration interface
export interface MonsterFactoryConfig {
    type: MonsterType;
    position: Position;
    id?: string;
    facing?: Direction;
    level?: number;
    hp?: number;
    state?: string;
    // Server-specific options
    isServerSide?: boolean;
    spawnTime?: number;
}

// Complete monster data interface
export interface FactoryMonsterData extends MonsterStateData {
    // Core identity
    id: string;
    type: MonsterType;
    x: number;
    y: number;
    facing: Direction;
    
    // Stats
    hp: number;
    maxHp: number;
    level: number;
    damage: number;
    moveSpeed: number;
    attackRange: number;
    aggroRange: number;
    collisionRadius: number;
    
    // State management
    state: string;
    velocity: Position;
    
    // Combat properties
    lastAttack: number;
    attackCooldown: number;
    attackDelay: number;
    attackDuration: number;
    
    // Server-specific properties (optional)
    target?: any;
    isAttackAnimating?: boolean;
    attackAnimationStarted?: number;
    spawnTime?: number;
    lastUpdate?: number;
    stunTimer?: number;
    isStunned?: boolean;
    
    // State machine
    stateMachine?: MonsterStateMachine;
}

// Validation result interface
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Monster Factory - Centralized monster creation and validation
 */
export class MonsterFactory {
    private static nextId = 1;
    
    /**
     * Create a complete monster with all required properties
     * @param config - Monster configuration
     * @returns Fully initialized monster data
     */
    static create(config: MonsterFactoryConfig): FactoryMonsterData {
        // Generate ID if not provided
        const id = config.id || `monster_${this.nextId++}`;
        
        // Get base stats from configuration
        const baseStats = MONSTER_STATS[config.type];
        if (!baseStats) {
            throw new Error(`Unknown monster type: ${config.type}`);
        }
        
        // Create complete monster data using base stats (no level scaling - monsters don't have levels)
        const monster: FactoryMonsterData = {
            // Core identity
            id,
            type: config.type,
            x: config.position.x,
            y: config.position.y,
            facing: config.facing || 'down',
            
            // Stats directly from base configuration (no scaling)
            hp: config.hp !== undefined ? config.hp : baseStats.hp,
            maxHp: baseStats.hp,
            level: 1, // Monsters are always level 1 (only players have progression)
            damage: baseStats.damage,
            moveSpeed: baseStats.moveSpeed,
            attackRange: baseStats.attackRange,
            aggroRange: baseStats.aggroRange,
            collisionRadius: baseStats.collisionRadius,
            
            // State management
            state: config.state || 'idle',
            velocity: { x: 0, y: 0 },
            
            // Combat properties
            lastAttack: 0,
            attackCooldown: baseStats.attackCooldown,
            attackDelay: baseStats.attackDelay,
            attackDuration: baseStats.attackDuration,
            
            // Server-specific properties
            target: null,
            isAttackAnimating: false,
            attackAnimationStarted: 0,
            spawnTime: config.spawnTime || Date.now(),
            lastUpdate: Date.now(),
            stunTimer: 0,
            isStunned: false
        };
        
        // Initialize state machine
        const stateMachineData: MonsterStateData = {
            id: monster.id,
            type: monster.type,
            x: monster.x,
            y: monster.y,
            facing: monster.facing,
            hp: monster.hp,
            maxHp: monster.maxHp,
            velocity: monster.velocity
        };
        monster.stateMachine = createStateMachineFromLegacy(stateMachineData, monster.state);
        
        // Validate the created monster
        const validation = this.validate(monster);
        if (!validation.isValid) {
            throw new Error(`Monster validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Log warnings if any
        if (validation.warnings.length > 0) {
            console.warn(`[MonsterFactory] Warnings for ${monster.type} ${monster.id}:`, validation.warnings);
        }
        
        return monster;
    }
    
    /**
     * Create multiple monsters of the same type
     * @param config - Base configuration
     * @param count - Number of monsters to create
     * @param positionGenerator - Function to generate positions
     * @returns Array of created monsters
     */
    static createMultiple(
        config: Omit<MonsterFactoryConfig, 'position'>, 
        count: number, 
        positionGenerator: () => Position
    ): FactoryMonsterData[] {
        const monsters: FactoryMonsterData[] = [];
        
        for (let i = 0; i < count; i++) {
            const monsterConfig: MonsterFactoryConfig = {
                ...config,
                position: positionGenerator(),
                id: config.id ? `${config.id}_${i}` : undefined
            };
            monsters.push(this.create(monsterConfig));
        }
        
        return monsters;
    }
    
    /**
     * Create a monster from legacy data (for migration)
     * @param legacyData - Existing monster data
     * @returns Factory-created monster with all properties
     */
    static fromLegacy(legacyData: any): FactoryMonsterData {
        const config: MonsterFactoryConfig = {
            type: legacyData.type || 'skeleton',
            position: { x: legacyData.x || 0, y: legacyData.y || 0 },
            id: legacyData.id,
            facing: legacyData.facing,
            level: legacyData.level || 1,
            hp: legacyData.hp,
            state: legacyData.state,
            isServerSide: true,
            spawnTime: legacyData.spawnTime
        };
        
        const monster = this.create(config);
        
        // Copy over any additional legacy properties
        Object.assign(monster, {
            target: legacyData.target,
            lastAttack: legacyData.lastAttack || 0,
            isAttackAnimating: legacyData.isAttackAnimating || false,
            attackAnimationStarted: legacyData.attackAnimationStarted || 0,
            lastUpdate: legacyData.lastUpdate || Date.now(),
            stunTimer: legacyData.stunTimer || 0,
            isStunned: legacyData.isStunned || false
        });
        
        return monster;
    }
    
    /**
     * Note: Monsters don't have level progression in this game
     * Only players have levels and stat scaling
     */
    
    /**
     * Validate monster data completeness and consistency
     * @param monster - Monster to validate
     * @returns Validation result with errors and warnings
     */
    static validate(monster: FactoryMonsterData): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Required field validation
        if (!monster.id) errors.push('Missing id');
        if (!monster.type) errors.push('Missing type');
        if (typeof monster.x !== 'number') errors.push('Invalid x position');
        if (typeof monster.y !== 'number') errors.push('Invalid y position');
        if (!monster.facing) errors.push('Missing facing direction');
        
        // Stat validation
        if (monster.hp <= 0) errors.push('HP must be positive');
        if (monster.maxHp <= 0) errors.push('Max HP must be positive');
        if (monster.hp > monster.maxHp) warnings.push('HP exceeds max HP');
        // Note: Monsters are always level 1 (no progression system)
        if (monster.damage < 0) errors.push('Damage cannot be negative');
        if (monster.moveSpeed <= 0) errors.push('Move speed must be positive');
        if (monster.attackRange < 0) errors.push('Attack range cannot be negative');
        if (monster.aggroRange < 0) errors.push('Aggro range cannot be negative');
        if (monster.collisionRadius <= 0) errors.push('Collision radius must be positive');
        
        // State validation
        if (!monster.state) errors.push('Missing state');
        if (!monster.velocity) errors.push('Missing velocity');
        
        // Combat validation
        if (monster.attackCooldown < 0) errors.push('Attack cooldown cannot be negative');
        if (monster.attackDelay < 0) errors.push('Attack delay cannot be negative');
        if (monster.attackDuration < 0) errors.push('Attack duration cannot be negative');
        
        // Logical validation
        if (monster.attackRange > monster.aggroRange) {
            warnings.push('Attack range exceeds aggro range');
        }
        
        // State machine validation
        if (!monster.stateMachine) {
            warnings.push('Missing state machine');
        } else if (monster.stateMachine.getCurrentState() !== monster.state) {
            warnings.push('State machine state does not match legacy state');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Get default configuration for a monster type
     * @param type - Monster type
     * @returns Default configuration object
     */
    static getDefaultConfig(type: MonsterType): Partial<MonsterFactoryConfig> {
        const stats = MONSTER_STATS[type];
        if (!stats) {
            throw new Error(`Unknown monster type: ${type}`);
        }
        
        return {
            type,
            facing: 'down',
            state: 'idle',
            isServerSide: false
        };
    }
    
    /**
     * List all available monster types
     * @returns Array of monster type names
     */
    static getAvailableTypes(): MonsterType[] {
        return Object.keys(MONSTER_STATS) as MonsterType[];
    }
    
    /**
     * Get base stats for a monster type
     * @param type - Monster type
     * @returns Base stat object
     */
    static getBaseStats(type: MonsterType) {
        const stats = MONSTER_STATS[type];
        if (!stats) {
            throw new Error(`Unknown monster type: ${type}`);
        }
        return { ...stats }; // Return copy to prevent modification
    }
    
    /**
     * Create a copy of an existing monster with optional overrides
     * @param original - Original monster
     * @param overrides - Properties to override
     * @returns New monster instance
     */
    static clone(original: FactoryMonsterData, overrides: Partial<MonsterFactoryConfig> = {}): FactoryMonsterData {
        const config: MonsterFactoryConfig = {
            type: original.type,
            position: { x: original.x, y: original.y },
            id: overrides.id, // Will generate new ID if not provided
            facing: original.facing,
            hp: original.hp,
            state: original.state,
            isServerSide: overrides.isServerSide,
            spawnTime: original.spawnTime,
            ...overrides
        };
        
        return this.create(config);
    }
}

// Utility functions for common monster creation patterns

/**
 * Create a random monster at a specific position
 * @param position - Spawn position
 * @param availableTypes - Types to choose from (defaults to all)
 * @returns Random monster
 */
export function createRandomMonster(position: Position, availableTypes?: MonsterType[]): FactoryMonsterData {
    const types = availableTypes || MonsterFactory.getAvailableTypes();
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    return MonsterFactory.create({
        type: randomType,
        position
    });
}

/**
 * Create a monster pack (multiple monsters near each other)
 * @param config - Base configuration
 * @param count - Number of monsters in pack
 * @param spread - Maximum distance from center position
 * @returns Array of monsters in pack formation
 */
export function createMonsterPack(
    config: Omit<MonsterFactoryConfig, 'position'>, 
    count: number, 
    centerPosition: Position, 
    spread: number = 100
): FactoryMonsterData[] {
    return MonsterFactory.createMultiple(
        config,
        count,
        () => ({
            x: centerPosition.x + (Math.random() - 0.5) * spread * 2,
            y: centerPosition.y + (Math.random() - 0.5) * spread * 2
        })
    );
}