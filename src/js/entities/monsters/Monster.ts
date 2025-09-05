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
import { soundManager } from '../../systems/SoundManager.js';
import { getMonsterSound } from '../../config/SoundConfig.js';
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
type MonsterType = 'skeleton' | 'ogre' | 'ghoul' | 'elemental' | 'wildarcher' | 'darkmage' | 'wolf' | 'wingeddemon';
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
    currentAttackType?: 'primary' | 'special1' | 'special2';
    attackPhase?: 'windup' | 'active' | 'recovery';
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
    private originalTextures?: PIXI.Texture[];
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
                // Use currentAttackType to determine which attack animation to play
                const attackType = (this as any).currentAttackType;
                const attackPhase = (this as any).attackPhase;
                
                // Show idle during recovery phase
                if (attackPhase === 'recovery') {
                    animState = 'idle';
                    break;
                }
                
                if (attackType === 'special1') {
                    // Map special attacks to their animations
                    switch (this.type) {
                        case 'ogre':
                            // Use windup animation during windup phase
                            animState = attackPhase === 'windup' ? 'attack3_windup' : 'attack3';
                            break;
                        case 'elemental':
                            animState = 'attack2'; // Spell cast
                            break;
                        case 'ghoul':
                            animState = 'attack3'; // Frenzy
                            break;
                        case 'skeleton':
                            animState = 'special1'; // Bone throw
                            break;
                        case 'wildarcher':
                            animState = 'attack2'; // Multi-shot
                            break;
                        case 'darkmage':
                            // Handle teleport attack phases
                            const teleportPhase = (this as any).teleportPhase;
                            if (teleportPhase === 'attack') {
                                animState = 'pummel';
                            } else if (attackPhase === 'windup' || teleportPhase === 'dash') {
                                // Use same special1 animation for both windup and dash
                                animState = 'special1';
                            } else {
                                animState = 'special1';
                            }
                            break;
                        case 'wolf':
                            animState = 'attack2'; // Pounce attack
                            break;
                        case 'wingeddemon':
                            animState = 'attack5'; // Infernal Strike
                            break;
                        default:
                            animState = 'attack1';
                    }
                } else if (attackType === 'special2') {
                    // Map special2 attacks
                    switch (this.type) {
                        case 'ogre':
                            animState = 'special1'; // Slam
                            break;
                        default:
                            animState = 'attack1';
                    }
                } else {
                    // Default primary attack
                    animState = 'attack1';
                }
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
    
    private playAttackSound(): void {
        // Play attack sound when starting an attack animation
        const attackType = (this as any).currentAttackType;
        
        // Special handling for Dark Mage teleport attack  
        // Only play sound once at the beginning of teleport sequence
        if (this.type === 'darkmage' && attackType === 'special1') {
            const teleportPhase = (this as any).teleportPhase;
            // Only play sound during windup phase, not during dash or attack phases
            if (teleportPhase !== 'windup' && teleportPhase !== undefined) {
                console.log(`Skipping Dark Mage sound - already in teleport phase: ${teleportPhase}`);
                return;
            }
        }
        
        // Debug logging to understand what's happening
        console.log(`Playing attack sound for ${this.type}: attackType=${attackType}, animation=${this.currentAnimation}`);
        
        // Determine sound based on actual attack type
        let soundName: string | null = null;
        
        if (attackType === 'special1' || attackType === 'special2') {
            // For special attacks, use the special sound
            soundName = getMonsterSound(this.type, 'special');
        } else {
            // For primary attacks or undefined, use the regular attack sound
            soundName = getMonsterSound(this.type, 'attack');
        }
        
        if (soundName) {
            console.log(`Playing sound: ${soundName} for ${this.type} ${attackType}`);
            // Play spatially for all monsters
            soundManager.playSpatial(soundName, {
                x: this.position.x,
                y: this.position.y
            });
        }
    }
    
    private updateAnimation(): void {
        if (!this.spriteManager || !this.spriteManager.loaded) return;
        
        // Store previous state and attack type for comparison
        const previousState = (this as any).previousState;
        const previousAttackType = (this as any).previousAttackType;
        const currentAttackType = (this as any).currentAttackType;
        
        // Get animation name based on current state
        const animName = this.getAnimationName();
        
        // Only update if animation changed
        if (this.currentAnimation !== animName) {
            console.log(`Monster ${this.type} animation change: ${this.currentAnimation} -> ${animName} (state: ${this.state}, attackType: ${currentAttackType})`);
            
            // Check if we just transitioned into attacking state
            const justStartedAttacking = this.state === 'attacking' && previousState !== 'attacking';
            
            // Check if attack type changed while already attacking
            const attackTypeChanged = this.state === 'attacking' && 
                                     previousState === 'attacking' && 
                                     previousAttackType !== currentAttackType;
            
            // Play sound when:
            // 1. Just transitioned into attacking state
            // 2. Attack type changed while attacking (for monsters with multiple attacks)
            if (justStartedAttacking || attackTypeChanged) {
                this.playAttackSound();
            }
            
            // Store current state and attack type for next comparison
            (this as any).previousState = this.state;
            (this as any).previousAttackType = currentAttackType;
            
            this.currentAnimation = animName;
            
            // Remove old sprite
            if (this.animatedSprite && this.animatedSprite.parent) {
                this.sprite.removeChild(this.animatedSprite);
            }
            
            // Create new sprite with current animation
            this.animatedSprite = this.spriteManager.createAnimatedSprite(animName) || undefined;
            
            if (this.animatedSprite) {
                if (animName.includes('pummel')) {
                    console.log('[DarkMage] Successfully created pummel animated sprite');
                }
                // Configure loop based on animation type
                const nonLoopingStates: MonsterState[] = ['attacking', 'stunned', 'dying'];
                let shouldLoop = !nonLoopingStates.includes(this.state);
                
                // Special case: Ogre spin attack (special1) should loop
                if (this.state === 'attacking' && this.type === 'ogre' && 
                    (this as any).currentAttackType === 'special1' && 
                    (this as any).attackPhase === 'active') {
                    shouldLoop = true;
                }
                
                this.animatedSprite.loop = shouldLoop;
                
                // Handle custom frame ranges for Dark Mage teleport
                if (this.type === 'darkmage' && animName === 'special1') {
                    const attackPhase = (this as any).attackPhase;
                    const teleportPhase = (this as any).teleportPhase;
                    
                    // Store original textures if not already stored
                    if (!this.originalTextures) {
                        this.originalTextures = [...this.animatedSprite.textures] as PIXI.Texture[];
                    }
                    
                    if (attackPhase === 'windup') {
                        // Only play first 5 frames for windup
                        if (this.originalTextures && this.originalTextures.length >= 5) {
                            this.animatedSprite.textures = this.originalTextures.slice(0, 5);
                            this.animatedSprite.loop = false; // Don't loop during windup
                        }
                    } else if (teleportPhase === 'dash') {
                        // Play frames 6-15 during dash
                        if (this.originalTextures && this.originalTextures.length >= 15) {
                            this.animatedSprite.textures = this.originalTextures.slice(5, 15);
                            this.animatedSprite.loop = false; // Don't loop during dash
                        }
                    } else if (this.originalTextures) {
                        // Reset to full animation
                        this.animatedSprite.textures = this.originalTextures;
                    }
                }
                
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
                // For looping attacks (like Ogre spin), let it continue
                if (this.type === 'ogre' && 
                    (this as any).currentAttackType === 'special1' && 
                    (this as any).attackPhase === 'active') {
                    // Let the spin attack continue looping
                    return;
                }
                // For Dark Mage pummel animation, ensure sprite stays visible
                if (this.type === 'darkmage' && (this as any).teleportPhase === 'attack') {
                    // Let pummel animation play normally, just ensure visibility
                    if (this.animatedSprite) {
                        this.animatedSprite.visible = true;
                        this.sprite.visible = true;
                        this.sprite.alpha = 1;
                    }
                    // Don't stop on last frame - let it play
                    return;
                }
                // For Dark Mage dash phase, hold on last frame
                if (this.type === 'darkmage' && (this as any).teleportPhase === 'dash') {
                    if (this.animatedSprite) {
                        this.animatedSprite.gotoAndStop(this.animatedSprite.totalFrames - 1);
                        this.animatedSprite.visible = true;
                        this.sprite.visible = true;
                        this.sprite.alpha = 1;
                    }
                    return;
                }
                // For non-looping attacks, stop on the last frame
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
        
        // Handle darkmage dash interpolation
        if ((this as any).isDashing && (this as any).dashStartTime) {
            const now = Date.now();
            const elapsed = now - (this as any).dashStartTime;
            const duration = (this as any).dashDuration || 250;
            
            if (elapsed < duration) {
                // Calculate progress (0 to 1)
                const progress = elapsed / duration;
                // Use easing for smooth acceleration/deceleration
                const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
                
                // Interpolate position
                const startX = (this as any).dashStartX;
                const startY = (this as any).dashStartY;
                const endX = (this as any).dashEndX;
                const endY = (this as any).dashEndY;
                
                this.position.x = startX + (endX - startX) * easedProgress;
                this.position.y = startY + (endY - startY) * easedProgress;
                this.targetPosition.x = this.position.x;
                this.targetPosition.y = this.position.y;
            } else {
                // Dash complete
                this.position.x = (this as any).dashEndX;
                this.position.y = (this as any).dashEndY;
                this.targetPosition.x = this.position.x;
                this.targetPosition.y = this.position.y;
                (this as any).isDashing = false;
            }
        } else {
            // Normal smooth interpolation to target position (for network sync)
            this.position.x += (this.targetPosition.x - this.position.x) * this.interpolationSpeed;
            this.position.y += (this.targetPosition.y - this.position.y) * this.interpolationSpeed;
        }
        
        // Update sprite position
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Visibility safeguard - ensure monster is visible unless dying
        if (this.state !== 'dying' && this.sprite.alpha > 0) {
            this.sprite.visible = true;
            if (this.animatedSprite) {
                this.animatedSprite.visible = true;
            }
        }
        
        // Update animation based on current state if needed
        this.updateAnimation();
        
        // Handle WingedDemon attack5 frame freeze
        if (this.type === 'wingeddemon' && 
            this.state === 'attacking' && 
            (this as any).currentAttackType === 'special1' && 
            (this as any).attackPhase === 'active' &&
            this.animatedSprite) {
            // Freeze on frame 11 (0-indexed, so frame 10)
            const freezeFrame = 10;
            if (this.animatedSprite.currentFrame >= freezeFrame && !this.animatedSprite.loop) {
                this.animatedSprite.gotoAndStop(freezeFrame);
            }
        }
    }
    
    updateFromServer(data: MonsterServerUpdate): void {
        // Update dash state for Dark Mage
        if ((data as any).isDashing !== undefined) {
            (this as any).isDashing = (data as any).isDashing;
            
            // If starting a new dash, set up interpolation data
            if ((data as any).isDashing && (data as any).dashStartTime) {
                (this as any).dashStartX = (data as any).dashStartX;
                (this as any).dashStartY = (data as any).dashStartY;
                (this as any).dashEndX = (data as any).dashEndX;
                (this as any).dashEndY = (data as any).dashEndY;
                (this as any).dashStartTime = (data as any).dashStartTime;
                (this as any).dashDuration = (data as any).dashDuration;
                
                // Start position should match server's start position
                this.position.x = (data as any).dashStartX;
                this.position.y = (data as any).dashStartY;
                this.sprite.x = this.position.x;
                this.sprite.y = this.position.y;
            }
        }
        
        // Don't update position normally if dashing (handled in update())
        if (!(this as any).isDashing) {
            // Update target position for smooth interpolation
            this.targetPosition.x = data.x;
            this.targetPosition.y = data.y;
        }
        
        // Update teleport phase for Dark Mage animations
        if ((data as any).teleportPhase !== undefined) {
            (this as any).teleportPhase = (data as any).teleportPhase;
        }
        
        // Clear teleport phase when attack ends
        if (this.type === 'darkmage' && !(data as any).teleportPhase && (this as any).teleportPhase) {
            (this as any).teleportPhase = undefined;
        }
        
        // Ensure sprite is visible
        this.sprite.visible = true;
        this.sprite.alpha = 1;
        if (this.animatedSprite) {
            this.animatedSprite.visible = true;
        }
        
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
        
        // Update current attack type for animation
        const oldAttackType = (this as any).currentAttackType;
        if (data.currentAttackType !== undefined) {
            (this as any).currentAttackType = data.currentAttackType;
        }
        
        // Update attack phase for windup animations
        if (data.attackPhase !== undefined) {
            (this as any).attackPhase = data.attackPhase;
        }
        
        // Prevent facing changes from restarting attack animations
        const wasAttacking = this.state === 'attacking';
        const isNowAttacking = data.state === 'attacking';
        
        // Update state and facing
        const oldState = this.state;
        const oldFacing = this.facing;
        this.state = data.state;
        this.facing = data.facing;
        
        // Update animation if state changed, attack type changed, or facing changed (but not during attack)
        const attackTypeChanged = wasAttacking && isNowAttacking && oldAttackType !== data.currentAttackType;
        if (oldState !== this.state || attackTypeChanged || (!wasAttacking && !isNowAttacking && oldFacing !== this.facing)) {
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