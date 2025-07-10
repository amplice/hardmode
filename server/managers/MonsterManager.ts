import { GAME_CONSTANTS, MONSTER_STATS, MONSTER_SPAWN_WEIGHTS } from '../../shared/constants/GameConstants.js';
import { getDistance, selectWeightedRandom } from '../../shared/utils/MathUtils.js';
import { CollisionMask } from '../../shared/systems/CollisionMask.js';
import { SharedWorldGenerator } from '../../shared/systems/WorldGenerator.js';
import { createMonsterState, validateMonsterState } from '../../shared/factories/EntityFactories.js';
import { CalculationEngine } from '../systems/CalculationEngine.js';
import { 
    MonsterStateMachine, 
    type MonsterStateData, 
    createStateMachineFromLegacy 
} from '../../shared/systems/MonsterStateMachine.js';
import { 
    MonsterFactory, 
    type FactoryMonsterData,
    createRandomMonster 
} from '../../shared/factories/MonsterFactory.js';
import type { 
    MonsterState, 
    PlayerState, 
    MonsterType, 
    MonsterStateType,
    CharacterClass,
    Position, 
    Direction 
} from '../../shared/types/GameTypes.js';

// Extended player state that includes legacy x, y fields for compatibility
interface ServerPlayerState extends PlayerState {
    x: number;
    y: number;
    class?: CharacterClass; // Legacy field name for backward compatibility
    xp?: number;
    kills?: number;
}

// Extended monster state with server-specific fields
interface ServerMonsterState extends MonsterState {
    target: ServerPlayerState | null;
    lastAttack: number;
    attackAnimationStarted: number;
    isAttackAnimating: boolean;
    // Phase 5.1: State machine for type-safe state management
    stateMachine?: MonsterStateMachine;
    velocity: Position;
    spawnTime: number;
    lastUpdate: number;
    collisionRadius: number;
    stunTimer: number;
    isStunned: boolean;
    lodSkipCounter?: number;
    // Attack interruption system
    pendingAttackTimeout?: NodeJS.Timeout | null;
    // Stun recovery system
    preStunState?: MonsterStateType;
    preStunTarget?: ServerPlayerState | null;
}

interface ServerWorldManager {
    getWorldData(): any;
    getWorldGenerator(): any;
}

interface SocketIO {
    emit(event: string, data: any): void;
    projectileManager?: any;
    gameState?: any;
}

interface DamageProcessor {
    applyDamage(source: any, target: any, damage: number, damageType: string, metadata?: any): any;
}

export class MonsterManager {
    private io: SocketIO;
    public monsters: Map<string, ServerMonsterState>;
    private nextMonsterId: number;
    private spawnTimer: number;
    private serverWorldManager: ServerWorldManager;
    private collisionMask: CollisionMask;
    public damageProcessor?: DamageProcessor;

    // Helper function to convert PlayerState to coordinate format for getDistance
    private playerToCoords(player: PlayerState): { x: number, y: number } {
        // Check if player already has x, y (legacy format)
        if ('x' in player && 'y' in player) {
            return { x: (player as any).x, y: (player as any).y };
        }
        // Use position.x, position.y (TypeScript format)
        return { x: player.position.x, y: player.position.y };
    }

    // Helper to convert PlayerState to legacy format with x, y for compatibility
    private playerToLegacy(player: PlayerState): ServerPlayerState {
        const legacy = player as any;
        // Ensure x, y properties exist for legacy code compatibility
        if (!('x' in legacy)) {
            legacy.x = player.position.x;
        }
        if (!('y' in legacy)) {
            legacy.y = player.position.y;
        }
        return legacy as ServerPlayerState;
    }

    constructor(io: SocketIO, serverWorldManager: ServerWorldManager) {
        this.io = io;
        this.monsters = new Map();
        this.nextMonsterId = 1;
        this.spawnTimer = 0;
        this.serverWorldManager = serverWorldManager;
        
        // Initialize collision mask using shared world data (NO duplicate generation)
        this.collisionMask = new CollisionMask(
            GAME_CONSTANTS.WORLD.WIDTH,
            GAME_CONSTANTS.WORLD.HEIGHT,
            GAME_CONSTANTS.WORLD.TILE_SIZE
        );
        this.initializeCollisionMask();
    }

    /**
     * Initialize collision mask using shared world data from ServerWorldManager
     * This ensures monsters use identical collision data as players WITHOUT duplicate generation
     */
    initializeCollisionMask(): void {
        // Use shared world data (already generated once by ServerWorldManager)
        const worldData = this.serverWorldManager.getWorldData();
        const worldGen = this.serverWorldManager.getWorldGenerator();
        
        // Generate collision mask from shared elevation data
        this.collisionMask.generateFromElevationData(worldData.elevationData, worldGen);
        
        console.log('[MonsterManager] Collision mask initialized using shared world data');
    }
    
    /**
     * Update collision mask with data from client (legacy method - no longer needed)
     * Server now generates same world as client using shared seed
     */
    updateCollisionMask(collisionMaskData: any): void {
        // Collision mask sync not needed - using shared world seed
    }

    update(deltaTime: number, players: Map<string, PlayerState>): void {
        // Update spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= GAME_CONSTANTS.SPAWN.INTERVAL && 
            this.monsters.size < GAME_CONSTANTS.SPAWN.MAX_MONSTERS) {
            
            this.spawnMonster(players);
            this.spawnTimer = 0;
            
            // Log progress during rapid spawning stress test
            if (this.monsters.size % 50 === 0 || this.monsters.size === GAME_CONSTANTS.SPAWN.MAX_MONSTERS) {
                console.log(`[MonsterManager] 🎯 Stress test progress: ${this.monsters.size}/${GAME_CONSTANTS.SPAWN.MAX_MONSTERS} monsters spawned`);
                if (this.monsters.size === GAME_CONSTANTS.SPAWN.MAX_MONSTERS) {
                    console.log(`[MonsterManager] 🏁 STRESS TEST COMPLETE! All ${GAME_CONSTANTS.SPAWN.MAX_MONSTERS} monsters spawned. Monitor performance now.`);
                }
            }
        }

        // Monster AI LOD System: Conservative distances to ensure monsters near players always update
        const nearDistance = GAME_CONSTANTS.NETWORK.VIEW_DISTANCE * 1.2; // 1800px (very generous near range)
        const mediumDistance = GAME_CONSTANTS.NETWORK.VIEW_DISTANCE * 2.0; // 3000px (generous medium range)
        const farDistance = GAME_CONSTANTS.NETWORK.VIEW_DISTANCE * 3.0; // 4500px (only very distant monsters affected)
        
        let nearCount = 0;
        let mediumCount = 0;
        let farCount = 0;
        let dormantCount = 0;
        
        for (const monster of Array.from(this.monsters.values())) {
            if (monster.state === 'dying') {
                this.monsters.delete(monster.id);
                continue;
            }
            
            // Find closest player distance
            let closestDistance = Infinity;
            for (const player of Array.from(players.values())) {
                const playerCoords = this.playerToCoords(player);
                const dist = getDistance(monster, playerCoords);
                closestDistance = Math.min(closestDistance, dist);
            }
            
            // Determine LOD level and update frequency
            if (closestDistance < nearDistance) {
                // NEAR: Full update every frame (highest priority)
                // Phase 5.1: Wake up dormant monsters using state machine
                if ((monster as any).state === 'dormant') {
                    this.transitionMonsterState(monster, 'idle');
                }
                this.updateMonster(monster, deltaTime, players);
                nearCount++;
            } else if (closestDistance < mediumDistance) {
                // MEDIUM: Update every 2 frames (skip 50% of updates)
                // Phase 5.1: Wake up dormant monsters using state machine
                if ((monster as any).state === 'dormant') {
                    this.transitionMonsterState(monster, 'idle');
                }
                if (!monster.lodSkipCounter) monster.lodSkipCounter = 0;
                monster.lodSkipCounter++;
                if (monster.lodSkipCounter % 2 === 0) {
                    this.updateMonster(monster, deltaTime * 2, players); // Compensate for skipped frame
                }
                mediumCount++;
            } else if (closestDistance < farDistance) {
                // FAR: Update every 4 frames (skip 75% of updates) 
                // Phase 5.1: Wake up dormant monsters using state machine
                if ((monster as any).state === 'dormant') {
                    this.transitionMonsterState(monster, 'idle');
                }
                if (!monster.lodSkipCounter) monster.lodSkipCounter = 0;
                monster.lodSkipCounter++;
                if (monster.lodSkipCounter % 4 === 0) {
                    this.updateMonster(monster, deltaTime * 4, players); // Compensate for skipped frames
                }
                farCount++;
            } else {
                // DORMANT: No updates, minimal state
                if ((monster as any).state !== 'dormant') {
                    // Newly becoming dormant
                    (monster as any).state = 'dormant';
                    monster.velocity = { x: 0, y: 0 };
                    monster.target = null;
                }
                dormantCount++;
            }
        }
        
        // Log LOD stats occasionally for monitoring
        if (Math.random() < 0.01) { // 1% chance per update (roughly every 3 seconds at 30 FPS)
            console.log(`[MonsterManager] AI LOD: ${nearCount} near (100%), ${mediumCount} medium (50%), ${farCount} far (25%), ${dormantCount} dormant (0%)`);
        }
    }

    createMonster(type: MonsterType | null = null, position: Position | null = null, players: Map<string, PlayerState> | null = null): ServerMonsterState {
        // Phase 5.2: Use MonsterFactory for centralized, validated monster creation
        if (!type) {
            const types = Object.keys(MONSTER_SPAWN_WEIGHTS) as MonsterType[];
            const weights = Object.values(MONSTER_SPAWN_WEIGHTS);
            type = selectWeightedRandom(types, weights);
        }
        
        const pos = position || this.findValidSpawnPosition(players ? Array.from(players.values()) : []);
        const id = String(this.nextMonsterId++);
        
        try {
            // Create monster using factory for complete initialization and validation
            const factoryMonster = MonsterFactory.create({
                type: type,
                position: pos,
                id: id,
                facing: 'down',
                isServerSide: true,
                spawnTime: Date.now()
            });
            
            // Convert to ServerMonsterState (factory already includes all necessary fields)
            const monster = factoryMonster as unknown as ServerMonsterState;
            
            this.monsters.set(id, monster);
            console.log(`[MonsterManager] Created ${monster.type} ${monster.id} with factory validation`);
            return monster;
            
        } catch (error) {
            console.error(`[MonsterManager] Factory creation failed for ${type}:`, error);
            
            // Fallback to legacy creation
            console.warn(`[MonsterManager] Falling back to legacy creation for ${type}`);
            return this.createMonsterLegacy(type, pos, id);
        }
    }
    
    /**
     * Phase 5.2: Legacy monster creation method (fallback only)
     */
    private createMonsterLegacy(type: MonsterType, pos: Position, id: string): ServerMonsterState {
        const stats = MONSTER_STATS[type];
        
        const monster = createMonsterState({
            id,
            type,
            x: pos.x,
            y: pos.y,
            facing: 'down' as Direction
        }) as ServerMonsterState;
        
        validateMonsterState(monster);
        
        // Add server-specific properties
        monster.target = null;
        monster.lastAttack = 0;
        monster.attackAnimationStarted = 0;
        monster.isAttackAnimating = false;
        monster.velocity = { x: 0, y: 0 };
        monster.spawnTime = Date.now();
        monster.lastUpdate = Date.now();
        monster.collisionRadius = stats.collisionRadius || 20;
        monster.stunTimer = 0;
        monster.isStunned = false;
        monster.pendingAttackTimeout = null; // Initialize attack interruption system
        monster.preStunState = undefined; // Initialize stun recovery system
        monster.preStunTarget = null;
        
        // Initialize state machine
        const monsterData: MonsterStateData = {
            id: monster.id,
            type: monster.type,
            x: monster.x,
            y: monster.y,
            facing: monster.facing,
            hp: monster.hp,
            maxHp: monster.maxHp,
            velocity: monster.velocity
        };
        monster.stateMachine = createStateMachineFromLegacy(monsterData, monster.state);

        this.monsters.set(id, monster);
        return monster;
    }
    
    /**
     * Phase 5.1: Safe state transition using state machine
     * @param monster - Monster to transition
     * @param newState - Target state name
     * @param contextData - Additional context for transition
     * @returns true if transition was successful
     */
    private transitionMonsterState(monster: ServerMonsterState, newState: string, contextData: any = {}): boolean {
        if (!monster.stateMachine) {
            // Fallback for monsters without state machines (legacy)
            monster.state = newState as any;
            return true;
        }
        
        const result = monster.stateMachine.transition(newState, contextData);
        if (result.success) {
            // Update legacy state property for network compatibility
            monster.state = newState as any;
            // Update state machine context with current monster data
            monster.stateMachine.updateContext({
                x: monster.x,
                y: monster.y,
                facing: monster.facing,
                hp: monster.hp,
                velocity: monster.velocity,
                target: monster.target
            });
            return true;
        } else {
            console.warn(`[MonsterManager] Monster ${monster.id}: ${result.error}`);
            return false;
        }
    }

    spawnMonster(players: Map<string, PlayerState>): void {
        const monster = this.createMonster(null, null, players);
        console.log(`[MonsterManager] Spawned ${monster.type} at (${monster.x}, ${monster.y})`);
    }

    findValidSpawnPosition(players: PlayerState[]): Position {
        const worldWidth = GAME_CONSTANTS.WORLD.WIDTH * GAME_CONSTANTS.WORLD.TILE_SIZE;
        const worldHeight = GAME_CONSTANTS.WORLD.HEIGHT * GAME_CONSTANTS.WORLD.TILE_SIZE;
        const margin = GAME_CONSTANTS.SPAWN.WORLD_EDGE_MARGIN;
        
        let attempts = 0;
        while (attempts < 50) {
            const x = margin + Math.random() * (worldWidth - margin * 2);
            const y = margin + Math.random() * (worldHeight - margin * 2);
            
            // Check distance from all players
            let tooClose = false;
            for (const player of players) {
                const playerCoords = this.playerToCoords(player);
                const dist = Math.sqrt(Math.pow(x - playerCoords.x, 2) + Math.pow(y - playerCoords.y, 2));
                if (dist < GAME_CONSTANTS.SPAWN.MIN_DISTANCE_FROM_PLAYER) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                return { x, y };
            }
            attempts++;
        }
        
        // Fallback - spawn far from center
        return {
            x: worldWidth * (Math.random() > 0.5 ? 0.1 : 0.9),
            y: worldHeight * (Math.random() > 0.5 ? 0.1 : 0.9)
        };
    }

    updateMonster(monster: ServerMonsterState, deltaTime: number, players: Map<string, PlayerState>): void {
        const stats = MONSTER_STATS[monster.type];
        const oldState = monster.state;
        
        // Don't update stun or AI for dying monsters
        if (monster.state === 'dying') {
            monster.lastUpdate = Date.now();
            return; // Exit early, no updates for dying monsters
        }
        
        // Update stun timer
        if (monster.stunTimer > 0) {
            monster.stunTimer -= deltaTime;
            if (monster.stunTimer <= 0) {
                // Stun has ended
                monster.isStunned = false;
                monster.stunTimer = 0;
                
                console.log(`[MonsterManager] Monster ${monster.id} stun ended, attempting recovery. State: ${monster.state}, PreStunState: ${monster.preStunState}`);
                
                // Smart stun recovery: resume previous behavior if target is still valid
                this.recoverFromStun(monster, stats, players);
                
                // Clear any attack animation state
                if (monster.isAttackAnimating) {
                    monster.isAttackAnimating = false;
                }
                
                console.log(`[MonsterManager] Monster ${monster.id} recovery complete. New state: ${monster.state}, HasTarget: ${!!monster.target}`);
            } else {
                // Still stunned
                monster.isStunned = true;
                // Clear any velocity to stop movement
                monster.velocity = { x: 0, y: 0 };
                // Skip AI updates while stunned
                monster.lastUpdate = Date.now();
                return; // Exit early, no AI processing
            }
        }
        
        switch (monster.state) {
            case 'idle':
                this.handleIdleState(monster, stats, players);
                break;
            case 'chasing':
                this.handleChasingState(monster, stats, deltaTime, players);
                break;
            case 'attacking':
                this.handleAttackingState(monster, stats, players);
                break;
            case 'stunned':
                // Stunned monsters don't process AI logic - stun timer handles state transition
                // Safety check: if stunTimer is 0 but we're still in stunned state, force recovery
                if (monster.stunTimer <= 0 && !monster.isStunned) {
                    console.log(`[MonsterManager] SAFETY: Monster ${monster.id} stuck in stunned state with no timer, forcing recovery`);
                    this.recoverFromStun(monster, stats, players);
                }
                break;
            default:
                // Handle 'dormant' and other states
                if ((monster as any).state === 'dormant') {
                    // Dormant monsters wake up when players get close (handled in main update loop)
                    this.handleIdleState(monster, stats, players);
                }
                break;
        }
        
        monster.lastUpdate = Date.now();
    }

    handleIdleState(monster: ServerMonsterState, stats: any, players: Map<string, PlayerState>): void {
        // If we already have a target, check if we should attack again
        if (monster.target) {
            const target = players.get(monster.target.id);
            if (target && target.hp > 0) {
                const targetCoords = this.playerToCoords(target);
                const distance = getDistance(monster, targetCoords);
                
                // Still in attack range and cooldown is ready
                if (distance <= stats.attackRange) {
                    const now = Date.now();
                    if (now - monster.lastAttack >= stats.attackCooldown) {
                        monster.state = 'attacking';
                        return;
                    }
                    // Still on cooldown, stay idle
                    return;
                } else if (distance <= stats.aggroRange) {
                    // Out of attack range but still in aggro range
                    monster.state = 'chasing';
                    return;
                }
            }
            // Target is invalid, clear it
            monster.target = null;
        }
        
        // Look for new players in aggro range
        let nearestPlayer: PlayerState | null = null;
        let nearestDistance = stats.aggroRange;
        
        for (const [id, player] of Array.from(players.entries())) {
            if (player.hp <= 0) continue;
            
            const playerCoords = this.playerToCoords(player);
            const dist = getDistance(monster, playerCoords);
            if (dist < nearestDistance) {
                nearestDistance = dist;
                nearestPlayer = player;
            }
        }
        
        if (nearestPlayer) {
            monster.state = 'chasing';
            monster.target = this.playerToLegacy(nearestPlayer);
        }
    }

    handleChasingState(monster: ServerMonsterState, stats: any, deltaTime: number, players: Map<string, PlayerState>): void {
        const target = monster.target;
        
        if (!target || target.hp <= 0) {
            monster.state = 'idle';
            monster.target = null;
            monster.velocity = { x: 0, y: 0 };
            return;
        }
        
        const distance = getDistance(monster, target);
        
        // Lost aggro - too far
        if (distance > stats.aggroRange * 1.5) {
            monster.state = 'idle';
            monster.target = null;
            monster.velocity = { x: 0, y: 0 };
            return;
        }
        
        // In attack range
        if (distance <= stats.attackRange) {
            monster.state = 'attacking';
            monster.velocity = { x: 0, y: 0 };
            return;
        }
        
        // Chase player (but not if stunned)
        if (!monster.isStunned) {
            this.moveToward(monster, target, stats.moveSpeed);
        } else {
            // Stop moving while stunned
            monster.velocity = { x: 0, y: 0 };
        }
    }

    handleAttackingState(monster: ServerMonsterState, stats: any, players: Map<string, PlayerState>): void {
        const target = monster.target;
        
        if (!target || target.hp <= 0) {
            monster.state = 'idle';
            monster.target = null;
            monster.isAttackAnimating = false;
            return;
        }
        
        const distance = getDistance(monster, target);
        
        // Target moved out of range while we're not animating
        if (distance > stats.attackRange * 1.2 && !monster.isAttackAnimating) {
            monster.state = 'chasing';
            return;
        }
        
        const now = Date.now();
        
        // If we're currently animating, don't start a new attack
        if (monster.isAttackAnimating) {
            // Check if animation should be finished
            if (now - monster.attackAnimationStarted >= stats.attackDuration) {
                monster.isAttackAnimating = false;
                // After animation completes, check if we should continue attacking or change state
                const currentDistance = getDistance(monster, target);
                if (currentDistance > stats.attackRange) {
                    monster.state = 'chasing';
                } else {
                    monster.state = 'idle'; // Go to idle between attacks
                }
            }
            return;
        }
        
        // Start a new attack if cooldown is ready and monster is alive
        if (now - monster.lastAttack >= stats.attackCooldown && monster.hp > 0 && monster.state !== 'dying') {
            monster.lastAttack = now;
            monster.attackAnimationStarted = now;
            monster.isAttackAnimating = true;
            
            // Handle projectile attacks differently
            if (monster.type === 'wildarcher') {
                // Schedule projectile creation and track timeout for interruption
                monster.pendingAttackTimeout = setTimeout(() => {
                    monster.pendingAttackTimeout = null; // Clear reference when executing
                    this.createMonsterProjectile(monster, target, stats);
                }, stats.attackDelay);
            } else {
                // Schedule melee damage application and track timeout for interruption
                monster.pendingAttackTimeout = setTimeout(() => {
                    monster.pendingAttackTimeout = null; // Clear reference when executing
                    // Re-fetch current players from gameState to ensure we have latest data
                    if (this.io && (this.io as any).gameState && (this.io as any).gameState.players) {
                        this.applyMonsterDamage(monster, stats, (this.io as any).gameState.players);
                    } else {
                        this.applyMonsterDamage(monster, stats, players);
                    }
                }, stats.attackDelay);
            }
        } else {
            // Cooldown not ready, go back to idle
            monster.state = 'idle';
        }
    }

    applyMonsterDamage(monster: ServerMonsterState, stats: any, players: Map<string, PlayerState>): void {
        // CRITICAL: Validate monster is alive and not dying before applying damage
        // Prevents dead monsters from dealing damage due to setTimeout race conditions
        if (!monster || monster.hp <= 0 || monster.state === 'dying') {
            return;
        }
        
        // Note: Stun validation removed - attacks are now interrupted at source via clearTimeout
        
        const target = monster.target;
        if (!target || target.hp <= 0) return;
        
        const distance = getDistance(monster, target);
        if (distance > stats.attackRange * 1.2) return;
        
        // Use DamageProcessor for all damage application
        if (this.damageProcessor) {
            this.damageProcessor.applyDamage(
                monster,
                target,
                stats.damage,
                'melee',
                { attackType: 'monster_melee' }
            );
        }
    }

    createMonsterProjectile(monster: ServerMonsterState, target: PlayerState, stats: any): void {
        // CRITICAL: Validate monster is alive before creating projectiles
        // Prevents dead monsters from shooting projectiles due to setTimeout race conditions
        if (!monster || monster.hp <= 0 || monster.state === 'dying') {
            return;
        }
        
        // Note: Stun validation removed - attacks are now interrupted at source via clearTimeout
        
        if (!target || target.hp <= 0) return;
        
        // Calculate angle to target
        const targetCoords = this.playerToCoords(target);
        const dx = targetCoords.x - monster.x;
        const dy = targetCoords.y - monster.y;
        const angle = Math.atan2(dy, dx);
        
        // Only wildarcher has projectiles currently
        let effectType = 'wildarcher_shot_effect';
        let projectileSpeed = 600;
        
        // Create projectile through the ProjectileManager
        if ((this.io as any).projectileManager) {
            // Pass monster with type property
            const projectileOwner = {
                id: monster.id,
                type: monster.type
            };
            (this.io as any).projectileManager.createProjectile(projectileOwner, {
                x: monster.x,
                y: monster.y,
                angle: angle,
                speed: projectileSpeed,
                damage: stats.damage,
                range: stats.attackRange,
                effectType: effectType
            });
        }
    }

    moveToward(monster: ServerMonsterState, target: PlayerState, speed: number): void {
        const targetCoords = this.playerToCoords(target);
        const dx = targetCoords.x - monster.x;
        const dy = targetCoords.y - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            monster.velocity.x = (dx / distance) * speed;
            monster.velocity.y = (dy / distance) * speed;
            
            // Calculate intended new position
            const newX = monster.x + monster.velocity.x;
            const newY = monster.y + monster.velocity.y;
            
            // Validate movement using collision mask
            if (this.collisionMask && this.collisionMask.canMove(monster.x, monster.y, newX, newY)) {
                // Movement is valid, update position
                monster.x = newX;
                monster.y = newY;
            } else {
                // Movement blocked, try partial movement (sliding along walls)
                if (this.collisionMask && this.collisionMask.canMove(monster.x, monster.y, newX, monster.y)) {
                    // Can move in X direction only
                    monster.x = newX;
                } else if (this.collisionMask && this.collisionMask.canMove(monster.x, monster.y, monster.x, newY)) {
                    // Can move in Y direction only
                    monster.y = newY;
                }
                // If both directions blocked, don't move (prevents getting stuck)
            }
            
            monster.facing = this.getFacingDirection(dx, dy);
        }
    }

    getFacingDirection(dx: number, dy: number): Direction {
        const angle = Math.atan2(dy, dx);
        const octant = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
        const directions: Direction[] = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
        return directions[octant];
    }

    handleMonsterDamage(monsterId: string, damage: number, attacker: PlayerState): boolean {
        const monster = this.monsters.get(monsterId);
        if (!monster || monster.hp <= 0) return false;
        
        // Use DamageProcessor for all damage application
        if (this.damageProcessor) {
            const result = this.damageProcessor.applyDamage(
                attacker,
                monster,
                damage,
                'melee',
                { attackType: 'player_attack' }
            );
            return result.success;
        }
        
        return false;
    }

    /**
     * Smart recovery from stun - attempts to resume previous behavior
     */
    recoverFromStun(monster: ServerMonsterState, stats: any, players: Map<string, PlayerState>): void {
        console.log(`[MonsterManager] Monster ${monster.id} recovering from stun. PreStunState: ${monster.preStunState}, HasTarget: ${!!monster.preStunTarget}, CurrentState: ${monster.state}`);
        
        // CRITICAL: Clear stun state first
        monster.isStunned = false;
        monster.stunTimer = 0;
        
        // Check if we can resume previous state with previous target
        if (monster.preStunState && monster.preStunTarget) {
            const target = players.get(monster.preStunTarget.id);
            if (target && target.hp > 0) {
                const targetCoords = this.playerToCoords(target);
                const distance = getDistance(monster, targetCoords);
                
                console.log(`[MonsterManager] Monster ${monster.id} target distance: ${distance.toFixed(1)}, aggroRange: ${stats.aggroRange}, attackRange: ${stats.attackRange}`);
                
                // If target is still in aggro range, resume chasing or attacking
                if (distance <= stats.aggroRange) {
                    monster.target = this.playerToLegacy(target); // Restore target
                    
                    if (distance <= stats.attackRange && monster.preStunState === 'attacking') {
                        // Resume attacking if still in range
                        console.log(`[MonsterManager] Monster ${monster.id} resuming attack`);
                        this.transitionMonsterState(monster, 'attacking');
                    } else {
                        // Resume chasing if target moved out of attack range or was previously chasing
                        console.log(`[MonsterManager] Monster ${monster.id} resuming chase`);
                        this.transitionMonsterState(monster, 'chasing');
                    }
                    
                    // Clear pre-stun data
                    monster.preStunState = undefined;
                    monster.preStunTarget = null;
                    return;
                }
            }
        }
        
        // Fallback: target lost or invalid, go to idle and look for new targets
        console.log(`[MonsterManager] Monster ${monster.id} falling back to idle - will search for new targets`);
        
        // Ensure clean state for fallback
        monster.target = null;
        monster.preStunState = undefined;
        monster.preStunTarget = null;
        monster.velocity = { x: 0, y: 0 }; // Clear any residual movement
        monster.isStunned = false; // Ensure not stunned
        monster.stunTimer = 0; // Ensure timer is cleared
        
        // Force state transition to idle
        this.transitionMonsterState(monster, 'idle');
        
        // IMMEDIATE trigger idle state logic (no timeout needed)
        // This ensures monsters start looking for targets right away
        console.log(`[MonsterManager] Monster ${monster.id} immediately searching for new targets`);
        this.handleIdleState(monster, stats, players);
    }

    /**
     * Interrupt any pending attack when monster takes damage
     * This prevents stunned/dead monsters from dealing damage via setTimeout
     */
    interruptMonsterAttack(monster: ServerMonsterState): void {
        if (monster.pendingAttackTimeout) {
            clearTimeout(monster.pendingAttackTimeout);
            monster.pendingAttackTimeout = null;
            
            // Reset attack animation state since attack was interrupted
            monster.isAttackAnimating = false;
            
            console.log(`[MonsterManager] Interrupted pending attack for monster ${monster.id}`);
        }
    }

    handleMonsterDeath(monster: ServerMonsterState, killer: PlayerState): void {
        const stats = MONSTER_STATS[monster.type];
        const killerWithXp = killer as any; // Allow access to xp and kills fields
        
        // Award XP
        killerWithXp.xp = (killerWithXp.xp || 0) + stats.xp;
        killerWithXp.kills = (killerWithXp.kills || 0) + 1;
        
        // Check level up
        this.checkLevelUp(killer);
        
        // Notify clients
        this.io.emit('monsterKilled', {
            monsterId: monster.id,
            killedBy: killer.id,
            xpReward: stats.xp,
            killerXp: killerWithXp.xp,
            killerLevel: killer.level || 1
        });
        
        // Phase 5.1: Set monster state to dying using state machine
        this.transitionMonsterState(monster, 'dying');
        
        // Remove from monsters map after a delay
        setTimeout(() => {
            this.monsters.delete(monster.id);
        }, 1000);
    }

    checkLevelUp(player: PlayerState): void {
        const playerWithXp = player as any; // Allow access to xp field
        let level = 1;
        let totalXpNeeded = 0;
        const xpPerLevel = 20; // From existing code
        
        // Calculate level from XP using triangular progression
        for (let i = 1; i <= 10; i++) {
            if (playerWithXp.xp >= totalXpNeeded) {
                level = i;
            } else {
                break;
            }
            totalXpNeeded += i * xpPerLevel;
        }
        
        const newLevel = Math.min(10, level);
        if (newLevel > player.level) {
            const oldLevel = player.level;
            player.level = newLevel;
            
            // Apply level bonuses using CalculationEngine
            CalculationEngine.applyLevelBonuses(player, oldLevel, newLevel);
            
            // Update max HP
            const newMaxHp = CalculationEngine.calculateMaxHP(player.characterClass, newLevel);
            if (newMaxHp > player.maxHp) {
                player.maxHp = newMaxHp;
            }
            
            // Full heal on level up
            player.hp = player.maxHp;
            
            // Emit level up event
            this.io.emit('playerLevelUp', {
                playerId: player.id,
                level: player.level,
                hp: player.hp,
                maxHp: player.maxHp,
                moveSpeedBonus: player.moveSpeedBonus,
                attackRecoveryBonus: player.attackRecoveryBonus,
                attackCooldownBonus: player.attackCooldownBonus,
                rollUnlocked: player.rollUnlocked
            });
        }
    }

    getVisibleMonsters(players: Map<string, PlayerState>, viewDistance: number = GAME_CONSTANTS.NETWORK.VIEW_DISTANCE): Set<string> {
        const visibleMonsters = new Set<string>();
        
        for (const [playerId, player] of Array.from(players.entries())) {
            for (const [monsterId, monster] of Array.from(this.monsters.entries())) {
                const playerCoords = this.playerToCoords(player);
                const dist = getDistance(playerCoords, monster);
                if (dist < viewDistance) {
                    visibleMonsters.add(monsterId);
                }
            }
        }
        
        return visibleMonsters;
    }

    getSerializedMonsters(visibleMonsters: Set<string>): any[] {
        return Array.from(this.monsters.entries())
            .filter(([id]) => visibleMonsters.has(id))
            .map(([id, monster]) => ({
                id: monster.id,
                type: monster.type,
                x: monster.x,
                y: monster.y,
                facing: monster.facing,
                hp: monster.hp,
                maxHp: monster.maxHp,
                state: monster.state,
                isAttackAnimating: monster.isAttackAnimating,
                attackAnimationStarted: monster.attackAnimationStarted,
                isStunned: monster.isStunned
            }));
    }

    spawnInitialMonsters(count: number = 5): void {
        const players = new Map<string, PlayerState>();
        for (let i = 0; i < count; i++) {
            this.createMonster(null, null, players);
        }
    }
}