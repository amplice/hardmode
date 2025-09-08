/**
 * Type declarations for client-side TypeScript migration
 * 
 * CRITICAL: These types are based on verified runtime behavior from Phase 1 analysis
 * They MUST match the actual implementation to prevent migration failures
 */

// Import PIXI types
import type { PIXIContainer, PIXIAnimatedSprite, PIXIGraphics, PIXIApplication } from './pixi-extensions.js';
export type { PIXIContainer, PIXIAnimatedSprite, PIXIGraphics, PIXIApplication } from './pixi-extensions.js';

// InputSystem return type - VERIFIED in Phase 1.2
export interface InputState {
    up: boolean;
    left: boolean; 
    down: boolean;
    right: boolean;
    primaryAttack: boolean;
    secondaryAttack: boolean;
    roll: boolean;
    mousePosition: { x: number; y: number }; // CRITICAL: NOT mouseX/mouseY
}

// Player constructor options - VERIFIED in Phase 1.2
export interface PlayerOptions {
    id?: string;
    username?: string;
    class?: string; // Character class name
    x?: number;
    y?: number;
    level?: number;
    experience?: number;
    hp?: number;
    maxHp?: number;
    moveSpeed?: number;
    moveSpeedBonus?: number;
    attackRecoveryBonus?: number;
    attackCooldownBonus?: number;
    rollUnlocked?: boolean;
    facing?: string;
    combatSystem?: any; // Will be typed later
    spriteManager?: any; // Will be typed later
}

// Animation naming pattern - CRITICAL from Phase 1.3
export type AnimationType = 'idle' | 'run' | 'run_backward' | 'strafe_left' | 'strafe_right' | 
                           'attack1' | 'attack2' | 'roll' | 'take_damage' | 'die';
export type DirectionSuffix = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

// Character classes and directions
export type CharacterClass = 'bladedancer' | 'guardian' | 'hunter' | 'rogue';
export type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

// Player Config structure from GameConfig.js
export interface PlayerClassConfig {
    hitPoints: number;
    moveSpeed: number;
    baseColor: number;
    placeholderColor: number;
    spritePrefix: string; // CRITICAL: 'knight' for bladedancer, not 'bladedancer'!
    animations: {
        [key: string]: {
            speed: number;
        };
    };
}

export interface PlayerConfig {
    pvpEnabled: boolean;
    classes: {
        bladedancer: PlayerClassConfig;
        guardian: PlayerClassConfig;
        hunter: PlayerClassConfig;
        rogue: PlayerClassConfig;
    };
    attacks: {
        [key: string]: any; // Will be typed in detail later
    };
}

// Monster Config structure from GameConfig.js
export interface MonsterStats {
    hitPoints: number;
    moveSpeed: number;
    attackRange: number;
    collisionRadius: number;
    aggroRange: number;
    xp: number;
    animations: {
        [key: string]: {
            speed: number;
        };
    };
}

export interface MonsterConfig {
    stats: {
        ogre: MonsterStats;
        skeleton: MonsterStats;
        elemental: MonsterStats;
        ghoul: MonsterStats;
        wildarcher: MonsterStats;
    };
    attacks: {
        [key: string]: any; // Will be typed in detail later
    };
}

// Network interfaces
export interface AttackData {
    type: string;
    x: number;
    y: number;
    facing: number; // radians
}

// Entity position
export interface Position {
    x: number;
    y: number;
}

// Velocity vector
export interface Velocity {
    x: number;
    y: number;
}

// Component interfaces
export interface Component {
    owner: any; // Will be Player or Monster
    update(deltaTime: number): void;
}

export interface MovementComponent extends Component {
    velocity: Velocity;
    position: Position;
    moveSpeed: number;
}

export interface AnimationComponent extends Component {
    currentAnimation: string | null;
    playAnimation(animationName: string): void;
    setAnimation(animationType: AnimationType, direction: string): void;
}

export interface CombatComponent extends Component {
    isAttacking: boolean;
    attackCooldown: number;
    canAttack(): boolean;
    startAttack(attackType: string): void;
}

export interface HealthComponent extends Component {
    hitPoints: number;
    maxHitPoints: number;
    takeDamage(amount: number): void;
    heal(amount: number): void;
    isDead(): boolean;
    die(): void;
    respawn(): void;
}

export interface StatsComponent extends Component {
    level: number;
    experience: number;
    moveSpeedBonus: number;
    attackRecoveryBonus: number;
    attackCooldownBonus: number;
    addExperience(amount: number): void;
}

// Player entity interfaces - for TypeScript migration
export interface PlayerComponents {
    movement: MovementComponent;
    animation: AnimationComponent;
    combat: CombatComponent;
    health: HealthComponent;
    stats: StatsComponent;
}

export interface PlayerState {
    // Identity
    id: string;
    characterClass: CharacterClass | string;
    
    // Position & Movement
    position: Position;
    velocity: Velocity;
    facing: Direction | string;
    lastFacing: Direction | string;
    isMoving: boolean;
    movementDirection: Direction | string | null;
    moveSpeed: number;
    
    // Combat State
    isAttacking: boolean;
    primaryAttackCooldown: number;
    secondaryAttackCooldown: number;
    rollCooldown: number;
    currentAttackType: string | null;
    attackHitFrameReached: boolean;
    isInvulnerable: boolean;
    rollUnlocked: boolean;
    
    // Health & Status
    hitPoints: number;
    maxHitPoints: number;
    isDying: boolean;
    isDead: boolean;
    isTakingDamage: boolean;
    damageStunDuration: number;
    damageStunTimer: number;
    spawnProtectionTimer: number;
    
    // Stats & Progression
    level: number;
    experience: number;
    killCount: number;
    moveSpeedBonus: number;
    attackRecoveryBonus: number;
    attackCooldownBonus: number;
    
    // Animation
    currentAnimation: string | null;
}

export interface Player extends PlayerState {
    // Systems
    combatSystem: any; // Will be typed in CombatSystem migration
    spriteManager: any; // Will be typed in SpriteManager migration
    
    // PIXI Elements
    sprite: PIXIContainer;
    animatedSprite?: PIXIAnimatedSprite;
    placeholder?: PIXIGraphics;
    
    // Components
    components: PlayerComponents;
    movement: MovementComponent;
    animation: AnimationComponent;
    combat: CombatComponent;
    health: HealthComponent;
    stats: StatsComponent;
    
    // Additional runtime properties
    serverPosition?: { x: number; y: number };
    isLocalPlayer?: boolean;
    
    // Methods
    addComponent(name: string, component: Component): void;
    update(deltaTime: number, inputState: InputState): void;
    handleNonMovementUpdate(deltaTime: number, inputState: InputState, currentBiome?: number): void;
    updateMovementStateForAnimation(inputState: InputState): void;
    takeDamage(amount: number): void;
    getClassHitPoints(): number;
    getClassMoveSpeed(): number;
    playLevelUpEffect(): void;
}

// Game class interfaces
export interface GameSystems {
    input: any; // InputSystem
    inputBuffer: any; // InputBuffer
    predictor: any; // MovementPredictor
    reconciler: any; // Reconciler
    physics: any; // PhysicsSystem
    world: any; // ClientWorldRenderer
    sprites: any; // SpriteManager
    tilesets?: any; // TilesetManager
    combat: any; // CombatSystem
    monsters?: any; // MonsterSystem
}

export interface GameEntities {
    player: Player;
}

export interface Camera {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    zoom: number;
    smoothing: number;
}

export interface NetworkInput {
    seq: number;
    keys: string[];
    facing: string;
    deltaTime: number;
}

export interface MonsterInfo {
    id: string;
    x: number;
    y: number;
    type: string;
    hp: number;
    maxHp: number;
    state?: string;
    facing?: string;
}

export interface PlayerInfo {
    id: string;
    username?: string;
    x: number;
    y: number;
    class: string;
    hp: number;
    armorHP?: number; // Green HP from armor powerups
    facing?: string;
}

export interface WorldData {
    width: number;
    height: number;
    tileSize: number;
    seed: number;
}

// Combat System interfaces
export interface HitboxParams {
    width?: number;
    length?: number;
    radius?: number;
    angle?: number;
}

export interface HitboxVisualConfig {
    color: number;
    fillAlpha: number;
    lineAlpha: number;
    lineWidth: number;
    duration: number;
}

export interface AttackConfig {
    name: string;
    archetype: string;
    damage: number;
    windupTime: number;
    dashDuration?: number;
    jumpDuration?: number;
    recoveryTime: number;
    cooldown: number;
    dashDistance?: number;
    jumpDistance?: number;
    invulnerable?: boolean;
    hitboxType: string | null;
    hitboxParams: HitboxParams | null;
    hitboxVisual: HitboxVisualConfig;
    effectSequence: EffectSequenceItem[];
    projectileSpeed?: number;
    projectileRange?: number;
}

export interface EffectSequenceItem {
    type: string;
    timing: number;
    distance?: number;
    useStartPosition?: boolean;
}

export interface EffectConfig {
    scale?: number;
    animationSpeed?: number;
    offsetDistance?: number;
    rotationOffset?: number;
    flipX?: boolean;
    flipY?: boolean;
    followDuration?: number;
}

export interface ActiveAttack {
    attacker: any; // Entity
    hitbox: Hitbox | null;
    config: AttackConfig;
    lifetime: number;
    hasHitFrameOccurred: boolean;
    attackType?: string;
    entity?: any;
    damage?: number;
}

export interface Hitbox {
    position: Position;
    facing: string;
    params: HitboxParams;
    visualConfig: HitboxVisualConfig;
    graphics: PIXIGraphics | null;
    draw(): PIXIGraphics;
    testHit(target: any, targetRadius?: number): boolean;
    getFacingRadians(): number;
    getFacingDegrees(): number;
}