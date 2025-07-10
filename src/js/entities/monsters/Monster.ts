/**
 * @fileoverview Monster - Client-side monster entity for server-driven AI
 * 
 * MIGRATION NOTES:
 * - Converted from Monster.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for monster structures
 * - Preserved all server-driven state management and interpolation logic
 * 
 * ARCHITECTURE ROLE:
 * - Client-side representation of server-authoritative monsters
 * - Handles visual updates, animation, and smooth movement interpolation
 * - Receives state updates via delta compression from server MonsterManager
 * - Provides visual feedback for combat interactions and state changes
 * 
 * SERVER-CLIENT PATTERN:
 * Monsters are fully server-authoritative for anti-cheat and consistency:
 * - Server MonsterManager runs all AI logic (pathfinding, targeting, attacks)
 * - Client Monster entities only handle visual representation
 * - Position updates smoothly interpolated for visual smoothness
 * - State changes (idle→chasing→attacking) drive animation transitions
 * 
 * DELTA COMPRESSION INTEGRATION:
 * updateFromServer() receives optimized state updates:
 * - NetworkOptimizer sends only changed fields (position, hp, state)
 * - Critical fields (id, state, hp, facing, type) always included
 * - StateCache merges deltas with cached state before processing
 * - Smooth interpolation maintains visual quality despite compressed updates
 * 
 * MONSTER AI STATES (Server-Driven):
 * - 'dormant': Far from players, AI sleeping for performance
 * - 'idle': Near players, wandering randomly
 * - 'chasing': Player in aggro range, pathfinding toward target
 * - 'attacking': In attack range, executing attack sequence
 * - 'stunned': Hit by player attack, temporary movement disable
 * - 'dying': Death animation playing, soon to be removed
 * 
 * VISUAL SMOOTHING:
 * Server sends discrete position updates at 30 FPS
 * Client interpolates between positions for 60 FPS visual smoothness
 * Prevents jittery movement while maintaining server authority
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - LOD system: Distant monsters update less frequently
 * - Animation pooling: Reuse sprite objects when possible
 * - State-based updates: Only process relevant state changes
 */

import * as PIXI from 'pixi.js';
import { MONSTER_CONFIG } from '../../config/GameConfig.js';
import { MONSTER_STATS } from '../../../../shared/constants/GameConstants.js';
import {
    velocityToDirectionString,
    directionStringToAngleRadians
} from '../../utils/DirectionUtils.js';
import { bfsPath, hasLineOfSight } from '../../utils/Pathfinding.js';
import { 
    MonsterStateMachine, 
    type MonsterStateData,
    createStateMachineFromLegacy 
} from '../../../../shared/systems/MonsterStateMachine.js';

// Type definitions
type MonsterType = 'skeleton' | 'ogre' | 'ghoul' | 'elemental' | 'wildarcher';
type MonsterState = 'dormant' | 'idle' | 'chasing' | 'attacking' | 'stunned' | 'dying' | 'walking';
type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

interface Position {
    x: number;
    y: number;
}

interface Velocity {
    x: number;
    y: number;
}

interface MonsterOptions {
    id: string;
    x: number;
    y: number;
    type?: MonsterType;
    facing?: Direction;
    state?: MonsterState;
    hp?: number;
    maxHp?: number;
}

interface MonsterServerUpdate {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    state: MonsterState;
    facing: Direction;
}

interface SpriteManagerInterface {
    loaded: boolean;
    createAnimatedSprite(animationName: string): PIXI.AnimatedSprite | null;
    getMonsterAnimationForDirection(type: MonsterType, facing: Direction, state: string): string;
}

interface PlayerInterface {
    position: Position;
    stats?: {
        recordKill?: (monsterType: MonsterType) => void;
    };
}

// Use existing global declaration from other files

export class Monster {
    // Basic properties
    public id: string;
    public position: Position;
    public type: MonsterType;
    public facing: Direction;
    public state: MonsterState;
    public alive: boolean;
    
    // Phase 5.1: State machine for type-safe state management
    private stateMachine: MonsterStateMachine;
    
    // Network sync properties
    private targetPosition: Position;
    private interpolationSpeed: number;
    
    // Stats
    public hitPoints: number;
    public maxHitPoints: number;
    public moveSpeed: number;
    public attackRange: number;
    public collisionRadius: number;
    public aggroRange: number;
    
    // Animation state
    private currentAnimation: string | null;
    private previousState?: MonsterState;
    
    // Sprites
    public sprite: PIXI.Container;
    private animatedSprite?: PIXI.AnimatedSprite;
    private spriteManager: SpriteManagerInterface;
    
    // Movement (for legacy compatibility)
    public velocity?: Velocity;
    public target?: PlayerInterface;

    constructor(options: MonsterOptions) {
        // Basic properties
        this.id = options.id;
        this.position = { x: options.x, y: options.y };
        this.type = options.type || 'skeleton';
        this.facing = options.facing || 'down';
        this.state = options.state || 'idle';
        this.alive = true;
        
        // Network sync properties
        this.targetPosition = { x: options.x, y: options.y };
        this.interpolationSpeed = 0.2;
        
        // Get stats from config
        const stats = MONSTER_CONFIG.stats[this.type];
        this.hitPoints = options.hp || stats.hitPoints;
        this.maxHitPoints = options.maxHp || stats.hitPoints;
        this.moveSpeed = stats.moveSpeed;
        this.attackRange = stats.attackRange;
        this.collisionRadius = stats.collisionRadius;
        this.aggroRange = stats.aggroRange;
        
        // Animation state
        this.currentAnimation = null;
        
        // Create sprite container
        this.sprite = new PIXI.Container();
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Get sprite manager
        this.spriteManager = (window as any).game.systems.sprites;
        
        // Phase 5.1: Initialize state machine with current monster data
        const monsterData: MonsterStateData = {
            id: this.id,
            type: this.type as any,
            x: this.position.x,
            y: this.position.y,
            facing: this.facing,
            hp: this.hitPoints,
            maxHp: this.maxHitPoints,
            velocity: { x: 0, y: 0 }
        };
        this.stateMachine = createStateMachineFromLegacy(monsterData, this.state);
        
        // Initialize animation
        this.setupAnimation();
    }
    
    /**
     * Phase 5.1: Get valid state transitions from current state
     * @returns Array of valid state names
     */
    public getValidTransitions(): string[] {
        return this.stateMachine.getValidTransitions();
    }
    
    /**
     * Phase 5.1: Check if transition to target state is valid
     * @param targetState - Target state name
     * @returns true if transition is allowed
     */
    public canTransitionTo(targetState: string): boolean {
        return this.stateMachine.canTransitionTo(targetState);
    }
    
    /**
     * Phase 5.1: Get current state from state machine
     * @returns Current state name
     */
    public getCurrentStateName(): string {
        return this.stateMachine.getCurrentState();
    }
    
    private setupAnimation(): void {
        if (!this.spriteManager || !this.spriteManager.loaded) return;
        
        // Get initial animation based on state
        const animName = this.getAnimationName();
        this.currentAnimation = animName;
        
        // Create animated sprite
        this.animatedSprite = this.spriteManager.createAnimatedSprite(animName) || undefined;
        
        if (this.animatedSprite) {
            this.animatedSprite.play();
            this.animatedSprite.anchor.set(0.5, 0.5);
            this.sprite.addChild(this.animatedSprite);
            
            // Set up animation complete callback
            this.animatedSprite.onComplete = () => this.onAnimationComplete();
        }
    }
    
    private getAnimationName(): string {
        // Convert state to animation name
        let animState: string;
        
        switch (this.state) {
            case 'walking':
            case 'chasing':
                animState = 'walk';
                break;
            case 'attacking':
                animState = 'attack1';
                break;
            case 'stunned':
                animState = 'hit';
                break;
            case 'dying':
                animState = 'die';
                break;
            case 'idle':
            default:
                animState = 'idle';
                break;
        }
        
        return this.spriteManager.getMonsterAnimationForDirection(this.type, this.facing, animState);
    }
    
    private updateAnimation(): void {
        if (!this.spriteManager || !this.spriteManager.loaded) return;
        
        // Get animation name based on current state
        const animName = this.getAnimationName();
        
        // Only update if animation changed
        if (this.currentAnimation !== animName) {
            console.log(`Monster ${this.type} animation change: ${this.currentAnimation} -> ${animName} (state: ${this.state})`);
            this.currentAnimation = animName;
            
            // Remove old sprite
            if (this.animatedSprite && this.animatedSprite.parent) {
                this.sprite.removeChild(this.animatedSprite);
            }
            
            // Create new sprite with current animation
            this.animatedSprite = this.spriteManager.createAnimatedSprite(animName) || undefined;
            
            if (this.animatedSprite) {
                // Configure loop based on animation type
                const nonLoopingStates: MonsterState[] = ['attacking', 'stunned', 'dying'];
                this.animatedSprite.loop = !nonLoopingStates.includes(this.state);
                
                this.animatedSprite.play();
                this.animatedSprite.anchor.set(0.5, 0.5);
                this.sprite.addChild(this.animatedSprite);
                
                // Apply red tint for damage
                if (this.state === 'stunned') {
                    this.animatedSprite.tint = 0xFF0000;
                } else {
                    this.animatedSprite.tint = 0xFFFFFF;
                }
                
                // Set animation complete callback
                this.animatedSprite.onComplete = () => this.onAnimationComplete();
            }
        }
    }
    
    private onAnimationComplete(): void {
        // Handle animation completion based on state
        switch (this.state) {
            case 'stunned':
                // DON'T change state locally - server is authoritative for monster states
                // Hold on last frame until server updates state
                if (this.animatedSprite) {
                    this.animatedSprite.gotoAndStop(this.animatedSprite.totalFrames - 1);
                }
                break;
                
            case 'attacking':
                // Don't change state locally - let server control it
                // Just stop the animation on the last frame
                if (this.animatedSprite) {
                    this.animatedSprite.gotoAndStop(this.animatedSprite.totalFrames - 1);
                }
                break;
                
            case 'dying':
                // Start fade out after death animation
                this.startFadeOut();
                break;
        }
    }
    
    private changeState(newState: MonsterState, contextData: any = {}): void {
        // Phase 5.1: Use state machine for type-safe state transitions
        const result = this.stateMachine.transition(newState, contextData);
        
        if (result.success) {
            // Store previous state for legacy compatibility
            this.previousState = this.state;
            // Update legacy state property
            this.state = newState;
            // Update state machine context with current monster data
            this.stateMachine.updateContext({
                x: this.position.x,
                y: this.position.y,
                facing: this.facing,
                hp: this.hitPoints,
                velocity: this.velocity || { x: 0, y: 0 }
            });
            // Force animation update
            this.updateAnimation();
        } else {
            console.warn(`[Monster ${this.id}] Invalid state transition: ${result.error}`);
        }
    }
    
    private startFadeOut(): void {
        // Fade out the sprite gradually
        const fadeStep = () => {
            this.sprite.alpha -= 0.05;
            if (this.sprite.alpha > 0) {
                requestAnimationFrame(fadeStep);
            } else if (this.sprite.parent) {
                this.sprite.parent.removeChild(this.sprite);
            }
        };
        
        fadeStep();
    }
    
    updateFacing(): void {
        // If moving, update facing based on velocity
        if (!this.velocity) return;
        const newFacing = velocityToDirectionString(this.velocity.x, this.velocity.y);
        if (newFacing) {
            this.facing = newFacing as Direction;
        }
    }
    
    // Updates facing direction to point toward target
    updateFacingToTarget(): void {
        if (!this.target) return;
        
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        
        const newFacing = velocityToDirectionString(dx, dy);
        if (newFacing) {
            this.facing = newFacing as Direction;
        }
    }
    
    takeDamage(amount: number, attacker: PlayerInterface | null = null): void {
        // Don't process damage if already dead
        if (!this.alive) return;
        
        this.hitPoints -= amount;
        
        // Check for death
        if (this.hitPoints <= 0) {
            this.die(attacker);
            return;
        }
        
        // Cancel any attack in progress (removed attack indicator - server controlled)
        
        // Phase 5.1: Apply stun with fixed duration (matches original behavior)
        this.changeState('stunned', { stunDuration: 360 }); // Fixed 360ms stun duration
        this.velocity = { x: 0, y: 0 }; // Stop movement
    }
    
    die(attacker: PlayerInterface | null = null): void {
        if (!this.alive) return;
        
        console.log(`Monster ${this.type} has been defeated!`);
        this.alive = false;
        // Phase 3.2: Server handles all kill tracking and stat updates
        // Client no longer updates stats directly - server sends updates via events
        this.changeState('dying');
        this.velocity = { x: 0, y: 0 };
        
        // Clear attack indicator (removed - server controlled)
    }
    
    update(deltaTime: number = 0): void {
        // Don't do any updates if dead
        if (!this.alive) return;
        
        // Smooth interpolation to target position (for network sync)
        this.position.x += (this.targetPosition.x - this.position.x) * this.interpolationSpeed;
        this.position.y += (this.targetPosition.y - this.position.y) * this.interpolationSpeed;
        
        // Update sprite position
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Update animation based on current state if needed
        this.updateAnimation();
    }
    
    updateFromServer(data: MonsterServerUpdate): void {
        // Update target position for smooth interpolation
        this.targetPosition.x = data.x;
        this.targetPosition.y = data.y;
        
        // Update health
        this.hitPoints = data.hp;
        this.maxHitPoints = data.maxHp;
        
        // Server is authoritative - update alive status based on HP
        // This ensures client-side alive flag stays in sync with server
        if (this.hitPoints > 0 && !this.alive) {
            // Monster was revived or client was out of sync
            this.alive = true;
        } else if (this.hitPoints <= 0 && this.alive) {
            // Monster died but client didn't know
            this.alive = false;
        }
        
        // Prevent facing changes from restarting attack animations
        const wasAttacking = this.state === 'attacking';
        const isNowAttacking = data.state === 'attacking';
        
        // Update state and facing
        const oldState = this.state;
        const oldFacing = this.facing;
        this.state = data.state;
        this.facing = data.facing;
        
        // Only update animation if state changed, or if facing changed but not during an attack
        if (oldState !== this.state || (!wasAttacking && !isNowAttacking && oldFacing !== this.facing)) {
            this.updateAnimation();
        }
    }
    
    showDamageEffect(): void {
        // Flash red to indicate damage
        if (this.animatedSprite) {
            this.animatedSprite.tint = 0xFF0000;
            setTimeout(() => {
                if (this.animatedSprite) {
                    this.animatedSprite.tint = 0xFFFFFF;
                }
            }, 200);
        }
    }
    
    playDeathAnimation(): void {
        // Switch to death animation
        this.state = 'dying';
        this.updateAnimation();
    }
    
    // Legacy update method for local AI (no longer used in multiplayer)
}