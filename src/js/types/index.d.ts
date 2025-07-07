/**
 * Type declarations for client-side TypeScript migration
 * 
 * CRITICAL: These types are based on verified runtime behavior from Phase 1 analysis
 * They MUST match the actual implementation to prevent migration failures
 */

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
    currentAnimation: string;
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
}

export interface StatsComponent extends Component {
    level: number;
    experience: number;
    moveSpeedBonus: number;
    attackRecoveryBonus: number;
    attackCooldownBonus: number;
    addExperience(amount: number): void;
}