import { GAME_CONSTANTS, MONSTER_STATS, MONSTER_SPAWN_WEIGHTS, ATTACK_DEFINITIONS } from '../../shared/constants/GameConstants.js';
import { getDistance, selectWeightedRandom } from '../../shared/utils/MathUtils.js';
import { CollisionMask } from '../../shared/systems/CollisionMask.js';
import { SharedWorldGenerator } from '../../shared/systems/WorldGenerator.js';
import { createMonsterState, validateMonsterState } from '../../shared/factories/EntityFactories.js';
import { CalculationEngine } from '../systems/CalculationEngine.js';
import { AStarPathfinding } from '../systems/AStarPathfinding.js';
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
    // Stuck detection
    positionHistory?: Position[];
    stuckCounter?: number;
    lastStuckCheck?: number;
    // Debug logging
    lastDebugLog?: number;
    // Wall following state
    wallFollowState?: {
        direction: { x: number, y: number };
        lastStairCheck: number;
        followingSince: number;
    };
    // A* pathfinding state
    currentPath?: WorldCoord[];
    pathIndex?: number;
    pathTarget?: WorldCoord;
    wanderDirection?: { x: number, y: number };
    // Special attack system
    currentAttackType?: 'primary' | 'special1' | 'special2';
    attackCooldowns?: {
        primary: number;
        special1?: number;
        special2?: number;
    };
    multiHitData?: {
        hitsRemaining: number;
        hitInterval: number;
        lastHitTime: number;
        originalTarget?: Position;
        hitEntities?: Set<string>; // Track who has been hit by this attack
        fixedDirection?: { x: number; y: number }; // Fixed direction for committed movement
    };
    teleportData?: {
        originalPosition: Position;
        targetPosition: Position;
        teleportAngle: number;
        teleportDistance: number;
    };
    // Track last damage source to prevent duplicate hits
    lastHitBy?: {
        attackId: string;
        timestamp: number;
    };
}

// World coordinate type for A* pathfinding
interface WorldCoord {
    x: number;
    y: number;
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
    private astarPathfinding?: AStarPathfinding;
    private teleportTimeouts: Map<string, NodeJS.Timeout>;

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
        this.teleportTimeouts = new Map();
        
        // Initialize collision mask using shared world data (NO duplicate generation)
        this.collisionMask = new CollisionMask(
            GAME_CONSTANTS.WORLD.WIDTH,
            GAME_CONSTANTS.WORLD.HEIGHT,
            GAME_CONSTANTS.WORLD.TILE_SIZE
        );
        this.initializeCollisionMask();
        
        // Initialize A* pathfinding system after collision mask is ready
        this.initializeAStarPathfinding();
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
     * Initialize A* pathfinding system
     */
    private initializeAStarPathfinding(): void {
        try {
            const worldGen = this.serverWorldManager.getWorldGenerator();
            const worldData = this.serverWorldManager.getWorldData();
            if (worldGen && this.collisionMask && worldData) {
                this.astarPathfinding = new AStarPathfinding(this.collisionMask, worldGen, worldData);
                console.log('[MonsterManager] A* pathfinding system initialized');
            } else {
                console.warn('[MonsterManager] Could not initialize A* pathfinding - missing dependencies');
            }
        } catch (error) {
            console.error('[MonsterManager] Failed to initialize A* pathfinding:', error);
        }
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
                this.cleanupMonsterTimeouts(monster.id);
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
            // Force full updates for monsters in multi-hit attacks to ensure smooth movement
            if (closestDistance < nearDistance || (monster.multiHitData && monster.state === 'attacking')) {
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
        // Skip transition if already in target state
        if (monster.state === newState) {
            return true;
        }
        
        // Debug logging for state transitions
        console.log(`[Monster ${monster.id}] State transition: ${monster.state} -> ${newState}, target: ${monster.target?.id || 'none'}, isAttacking: ${monster.isAttackAnimating}`);
        
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
            
            // Check if position is walkable
            if (!tooClose && this.collisionMask && this.collisionMask.isWalkable(x, y)) {
                return { x, y };
            }
            attempts++;
        }
        
        // Fallback - find nearest walkable position to a random edge location
        const fallbackX = worldWidth * (Math.random() > 0.5 ? 0.1 : 0.9);
        const fallbackY = worldHeight * (Math.random() > 0.5 ? 0.1 : 0.9);
        
        // If fallback position isn't walkable, find nearest walkable tile
        if (this.collisionMask && !this.collisionMask.isWalkable(fallbackX, fallbackY)) {
            const nearestWalkable = this.collisionMask.findNearestWalkable(fallbackX, fallbackY);
            if (nearestWalkable) {
                return nearestWalkable;
            }
        }
        
        return { x: fallbackX, y: fallbackY };
    }

    updateMonster(monster: ServerMonsterState, deltaTime: number, players: Map<string, PlayerState>): void {
        const stats = MONSTER_STATS[monster.type];
        const oldState = monster.state;
        
        // Don't update stun or AI for dying monsters
        if (monster.state === 'dying') {
            monster.lastUpdate = Date.now();
            return; // Exit early, no updates for dying monsters
        }
        
        // Skip most updates during multi-hit attacks to prevent state/facing changes
        if (monster.multiHitData && monster.state === 'attacking') {
            // Handle fixed direction movement ONLY during active attack phase
            if (monster.attackPhase === 'active' && monster.multiHitData.fixedDirection) {
                const attackConfig = this.getAttackConfig(monster);
                if (attackConfig && (attackConfig as any).moveSpeedMultiplier) {
                    const moveSpeed = stats.moveSpeed * (attackConfig as any).moveSpeedMultiplier;
                    
                    // Move in the fixed direction
                    monster.velocity.x = monster.multiHitData.fixedDirection.x * moveSpeed;
                    monster.velocity.y = monster.multiHitData.fixedDirection.y * moveSpeed;
                    
                    // Calculate new position (velocity is already per-frame, don't multiply by deltaTime)
                    const newX = monster.x + monster.velocity.x;
                    const newY = monster.y + monster.velocity.y;
                    
                    // Check collision
                    if (this.collisionMask && this.collisionMask.canMove(monster.x, monster.y, newX, newY)) {
                        monster.x = newX;
                        monster.y = newY;
                    } else {
                        // Stop movement if we hit a wall
                        monster.velocity.x = 0;
                        monster.velocity.y = 0;
                    }
                }
            } else {
                // Not in active phase - ensure velocity is zero
                monster.velocity.x = 0;
                monster.velocity.y = 0;
            }
            
            monster.lastUpdate = Date.now();
            return; // Multi-hit attack is handling its own movement and state
        }
        
        // Safety check: If monster is stuck in unwalkable tile, teleport to nearest walkable
        if (this.collisionMask && !this.collisionMask.isWalkable(monster.x, monster.y)) {
            console.warn(`[MonsterManager] Monster ${monster.id} stuck in unwalkable tile at (${Math.round(monster.x)}, ${Math.round(monster.y)})`);
            const nearestWalkable = this.collisionMask.findNearestWalkable(monster.x, monster.y, 256);
            if (nearestWalkable) {
                console.log(`[MonsterManager] Teleporting monster ${monster.id} to nearest walkable tile at (${Math.round(nearestWalkable.x)}, ${Math.round(nearestWalkable.y)})`);
                monster.x = nearestWalkable.x;
                monster.y = nearestWalkable.y;
                // Clear any stuck movement state
                monster.velocity = { x: 0, y: 0 };
                monster.currentPath = undefined;
                monster.pathIndex = undefined;
            }
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
            // Find target by ID - handle both direct lookup and searching
            let target: PlayerState | undefined;
            
            // Try direct lookup first
            if (typeof monster.target.id === 'string') {
                target = players.get(monster.target.id);
            }
            
            // If direct lookup failed, search all players
            if (!target) {
                for (const [id, player] of players) {
                    if (id === monster.target.id || player.id === monster.target.id) {
                        target = player;
                        break;
                    }
                }
            }
            
            if (target && target.hp > 0) {
                const targetCoords = this.playerToCoords(target);
                const distance = getDistance(monster, targetCoords);
                
                // Check if any attack is in range
                let maxAttackRange = stats.attackRange;
                
                // Check all available attacks for their ranges
                if (stats.attacks) {
                    for (const attackType in stats.attacks) {
                        const attackKey = stats.attacks[attackType as keyof typeof stats.attacks];
                        const attackConfig = ATTACK_DEFINITIONS[attackKey as keyof typeof ATTACK_DEFINITIONS];
                        if (attackConfig && (attackConfig as any).range) {
                            maxAttackRange = Math.max(maxAttackRange, (attackConfig as any).range);
                        }
                    }
                }
                
                // Still in attack range - check if ANY attack is ready
                if (distance <= maxAttackRange) {
                    const now = Date.now();
                    let anyAttackReady = false;
                    
                    // Initialize cooldowns if not present
                    if (!monster.attackCooldowns) {
                        // Initialize to a time that makes attacks immediately available
                        const initialTime = now - 10000; // 10 seconds ago
                        monster.attackCooldowns = {
                            primary: initialTime,
                            special1: initialTime,
                            special2: initialTime
                        };
                    }
                    
                    // Check all available attacks
                    const attacks = stats.attacks || { primary: `monster_${monster.type}_primary` };
                    for (const [attackType, attackName] of Object.entries(attacks)) {
                        if (!attackName) continue;
                        
                        const attackConfig = ATTACK_DEFINITIONS[attackName as keyof typeof ATTACK_DEFINITIONS];
                        if (!attackConfig) continue;
                        
                        const cooldownKey = attackType as 'primary' | 'special1' | 'special2';
                        const lastUsed = monster.attackCooldowns[cooldownKey] || 0;
                        const cooldownReady = now - lastUsed >= attackConfig.cooldown;
                        const attackRange = (attackConfig as any).range || stats.attackRange;
                        
                        // Check if this specific attack is in range and ready
                        if (distance <= attackRange && cooldownReady) {
                            anyAttackReady = true;
                            break;
                        }
                    }
                    
                    if (anyAttackReady) {
                        console.log(`[Monster ${monster.id}] In idle, found ready attack, transitioning to attacking`);
                        this.transitionMonsterState(monster, 'attacking');
                        return;
                    }
                    
                    // All attacks on cooldown - check if we should chase to get in range for shorter attacks
                    let shortestAttackRange = Infinity;
                    
                    // Find the shortest attack range
                    for (const [attackType, attackName] of Object.entries(attacks)) {
                        if (!attackName) continue;
                        const attackConfig = ATTACK_DEFINITIONS[attackName as keyof typeof ATTACK_DEFINITIONS];
                        if (!attackConfig) continue;
                        const attackRange = (attackConfig as any).range || stats.attackRange;
                        shortestAttackRange = Math.min(shortestAttackRange, attackRange);
                    }
                    
                    // If we're not in range of the shortest attack, chase
                    if (distance > shortestAttackRange) {
                        console.log(`[Monster ${monster.id}] In idle, attacks on cooldown, but out of melee range (${distance} > ${shortestAttackRange}), chasing`);
                        this.transitionMonsterState(monster, 'chasing');
                        return;
                    }
                    
                    // We're in range of all attacks, but they're all on cooldown
                    console.log(`[Monster ${monster.id}] In idle, no attacks ready, in melee range, cooldowns:`, monster.attackCooldowns);
                    monster.velocity = { x: 0, y: 0 };
                    return;
                } else if (distance <= stats.aggroRange) {
                    // Out of attack range but still in aggro range
                    this.transitionMonsterState(monster, 'chasing');
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
            console.log(`[MonsterManager] Monster ${monster.id} found player at distance ${Math.round(nearestDistance)}, transitioning to chasing`);
            this.transitionMonsterState(monster, 'chasing');
            monster.target = this.playerToLegacy(nearestPlayer);
        }
    }

    handleChasingState(monster: ServerMonsterState, stats: any, deltaTime: number, players: Map<string, PlayerState>): void {
        const target = monster.target;
        
        if (!target || target.hp <= 0) {
            this.transitionMonsterState(monster, 'idle');
            monster.target = null;
            monster.velocity = { x: 0, y: 0 };
            return;
        }
        
        const distance = getDistance(monster, target);
        
        // Lost aggro - too far
        if (distance > stats.aggroRange * 1.5) {
            this.transitionMonsterState(monster, 'idle');
            monster.target = null;
            monster.velocity = { x: 0, y: 0 };
            return;
        }
        
        // Check if any attack is in range
        let maxAttackRange = stats.attackRange;
        
        // Check all available attacks for their ranges
        if (stats.attacks) {
            for (const attackType in stats.attacks) {
                const attackKey = stats.attacks[attackType as keyof typeof stats.attacks];
                const attackConfig = ATTACK_DEFINITIONS[attackKey as keyof typeof ATTACK_DEFINITIONS];
                if (attackConfig && (attackConfig as any).range) {
                    maxAttackRange = Math.max(maxAttackRange, (attackConfig as any).range);
                }
            }
        }
        
        // In range of any attack
        if (distance <= maxAttackRange) {
            // Check if ANY attack is off cooldown before transitioning
            const now = Date.now();
            let anyAttackReady = false;
            
            // Initialize cooldowns if not present
            if (!monster.attackCooldowns) {
                monster.attackCooldowns = {
                    primary: 0,
                    special1: 0,
                    special2: 0
                };
            }
            
            // Check all available attacks
            const attacks = stats.attacks || { primary: `monster_${monster.type}_primary` };
            for (const [attackType, attackName] of Object.entries(attacks)) {
                if (!attackName) continue;
                
                const attackConfig = ATTACK_DEFINITIONS[attackName as keyof typeof ATTACK_DEFINITIONS];
                if (!attackConfig) continue;
                
                const cooldownKey = attackType as 'primary' | 'special1' | 'special2';
                const lastUsed = monster.attackCooldowns[cooldownKey] || 0;
                const cooldownReady = now - lastUsed >= attackConfig.cooldown;
                const attackRange = (attackConfig as any).range || stats.attackRange;
                
                // Check if this specific attack is in range and ready
                if (distance <= attackRange && cooldownReady) {
                    anyAttackReady = true;
                    break;
                }
            }
            
            if (anyAttackReady) {
                this.transitionMonsterState(monster, 'attacking');
                monster.velocity = { x: 0, y: 0 };
                return;
            } else {
                // All attacks on cooldown - check if we should continue chasing
                // to get in range for shorter-range attacks
                let shortestAttackRange = Infinity;
                
                // Find the shortest attack range
                for (const [attackType, attackName] of Object.entries(attacks)) {
                    if (!attackName) continue;
                    const attackConfig = ATTACK_DEFINITIONS[attackName as keyof typeof ATTACK_DEFINITIONS];
                    if (!attackConfig) continue;
                    const attackRange = (attackConfig as any).range || stats.attackRange;
                    shortestAttackRange = Math.min(shortestAttackRange, attackRange);
                }
                
                // If we're not in range of the shortest attack, keep chasing
                if (distance > shortestAttackRange) {
                    // Continue chasing to get in range for melee attacks
                    this.moveToward(monster, target, stats.moveSpeed);
                } else {
                    // We're in range of all attacks, but they're all on cooldown
                    this.transitionMonsterState(monster, 'idle');
                    monster.velocity = { x: 0, y: 0 };
                }
                return;
            }
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
            this.transitionMonsterState(monster, 'idle');
            monster.target = null;
            monster.isAttackAnimating = false;
            monster.currentAttackType = undefined;
            return;
        }
        
        const targetCoords = this.playerToCoords(target);
        const { attackType, attackConfig } = this.selectMonsterAttack(monster, stats, targetCoords);
        console.log(`[Monster ${monster.id}] Selected attack: ${attackType}`);
        
        const distance = getDistance(monster, target);
        const attackRange = (attackConfig as any).range || stats.attackRange;
        
        // Target moved out of range while we're not animating
        if (distance > attackRange * 1.2 && !monster.isAttackAnimating) {
            this.transitionMonsterState(monster, 'chasing');
            monster.currentAttackType = undefined;
            return;
        }
        
        const now = Date.now();
        
        // If we're currently animating, don't start a new attack
        if (monster.isAttackAnimating) {
            // Check if animation should be finished based on attack config
            let animDuration = attackConfig.windupTime + attackConfig.recoveryTime;
            
            // For multi-hit attacks, include the multi-hit duration
            if (attackConfig.archetype === 'multi_hit_melee' && (attackConfig as any).multiHit) {
                animDuration = attackConfig.windupTime + (attackConfig as any).multiHit.duration + attackConfig.recoveryTime;
            }
            
            if (now - monster.attackAnimationStarted >= animDuration) {
                // For multi-hit attacks, let the multi-hit logic handle cleanup
                if (attackConfig.archetype === 'multi_hit_melee' && monster.multiHitData) {
                    // Multi-hit attack is still in progress, don't interfere
                    return;
                }
                
                monster.isAttackAnimating = false;
                monster.attackPhase = undefined;
                // Set cooldown when animation ends for proper cooldown timing
                const currentAttackType = monster.currentAttackType || 'primary';
                if (!monster.attackCooldowns) {
                    monster.attackCooldowns = { primary: 0, special1: 0, special2: 0 };
                }
                monster.attackCooldowns[currentAttackType as 'primary' | 'special1' | 'special2'] = Date.now();
                monster.lastAttack = Date.now();
                console.log(`[Monster ${monster.id}] Attack ${currentAttackType} animation completed, cooldown set to: ${Date.now()}`);
                
                // After animation completes, check if we should continue attacking or change state
                const currentDistance = getDistance(monster, target);
                if (currentDistance > attackRange) {
                    this.transitionMonsterState(monster, 'chasing');
                } else {
                    this.transitionMonsterState(monster, 'idle'); // Go to idle between attacks
                }
                monster.currentAttackType = undefined;
            }
            return;
        }
        
        // Check if the selected attack is ready (cooldown)
        const lastUsed = monster.attackCooldowns?.[attackType] || 0;
        const cooldownReady = now - lastUsed >= attackConfig.cooldown;
        
        // Start a new attack if cooldown is ready and monster is alive
        if (cooldownReady && monster.hp > 0 && monster.state !== 'dying') {
            console.log(`[Monster ${monster.id}] Starting attack ${attackType}, cooldown was ready (last used: ${lastUsed}, now: ${now}, diff: ${now - lastUsed}ms)`);
            
            // Update cooldowns
            if (!monster.attackCooldowns) {
                monster.attackCooldowns = { primary: 0 };
            }
            // Don't set cooldown here - set it when animation ends for proper cooldown timing
            // monster.attackCooldowns[attackType] = now;
            monster.attackAnimationStarted = now;
            monster.isAttackAnimating = true;
            monster.currentAttackType = attackType;
            monster.attackPhase = 'windup';
            
            // Handle different attack archetypes
            if (attackConfig.archetype === 'projectile') {
                // Schedule projectile creation
                monster.pendingAttackTimeout = setTimeout(() => {
                    monster.pendingAttackTimeout = null;
                    monster.attackPhase = 'active';
                    this.executeProjectileAttack(monster, target, attackConfig);
                }, attackConfig.windupTime);
            } else if (attackConfig.archetype === 'multi_hit_melee') {
                // Initialize multi-hit data
                const multiHitConfig = (attackConfig as any).multiHit;
                
                // Calculate initial direction vector for committed movement
                const dx = targetCoords.x - monster.x;
                const dy = targetCoords.y - monster.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const directionX = distance > 0 ? dx / distance : 0;
                const directionY = distance > 0 ? dy / distance : 0;
                
                monster.multiHitData = {
                    hitsRemaining: multiHitConfig.hits,
                    hitInterval: multiHitConfig.interval,
                    lastHitTime: now + attackConfig.windupTime,
                    originalTarget: targetCoords,
                    hitEntities: new Set<string>(),
                    // Store fixed direction for committed movement
                    fixedDirection: { x: directionX, y: directionY }
                };
                // Schedule first hit
                monster.pendingAttackTimeout = setTimeout(() => {
                    monster.pendingAttackTimeout = null;
                    monster.attackPhase = 'active';
                    this.executeMultiHitAttack(monster, stats, attackConfig, players);
                }, attackConfig.windupTime);
            } else if (attackConfig.archetype === 'multi_projectile') {
                // Schedule multi-projectile attack
                monster.pendingAttackTimeout = setTimeout(() => {
                    monster.pendingAttackTimeout = null;
                    monster.attackPhase = 'active';
                    this.executeMultiProjectileAttack(monster, target, attackConfig);
                }, attackConfig.windupTime);
            } else if (attackConfig.archetype === 'teleport_melee') {
                // Initialize teleport data
                const teleportConfig = attackConfig as any;
                
                // Calculate target position for teleport (behind player)
                const dx = targetCoords.x - monster.x;
                const dy = targetCoords.y - monster.y;
                const playerFacing = Math.atan2(dy, dx);
                const behindAngle = playerFacing + Math.PI; // Opposite direction
                
                monster.teleportData = {
                    originalPosition: { x: monster.x, y: monster.y },
                    targetPosition: targetCoords,
                    teleportAngle: behindAngle,
                    teleportDistance: teleportConfig.teleportBehindDistance || 50
                };
                
                console.log(`[MonsterManager] Dark Mage ${monster.id} initiating teleport attack`, {
                    from: { x: Math.round(monster.x), y: Math.round(monster.y) },
                    targetPlayer: { x: Math.round(targetCoords.x), y: Math.round(targetCoords.y) },
                    behindDistance: teleportConfig.teleportBehindDistance
                });
                
                // Schedule teleport execution
                monster.pendingAttackTimeout = setTimeout(() => {
                    monster.pendingAttackTimeout = null;
                    monster.attackPhase = 'active';
                    this.executeTeleportMeleeAttack(monster, stats, attackConfig, players);
                }, attackConfig.windupTime);
            } else {
                // Standard melee attack
                monster.pendingAttackTimeout = setTimeout(() => {
                    monster.pendingAttackTimeout = null;
                    monster.attackPhase = 'active';
                    // Re-fetch current players from gameState to ensure we have latest data
                    if (this.io && (this.io as any).gameState && (this.io as any).gameState.players) {
                        this.executeMeleeAttack(monster, attackConfig, (this.io as any).gameState.players);
                    } else {
                        this.executeMeleeAttack(monster, attackConfig, players);
                    }
                }, attackConfig.windupTime);
            }
        } else {
            // Cooldown not ready, go back to idle
            console.log(`[Monster ${monster.id}] Attack ${attackType} NOT ready (last used: ${lastUsed}, now: ${now}, diff: ${now - lastUsed}ms, needed: ${attackConfig.cooldown}ms)`);
            this.transitionMonsterState(monster, 'idle');
            monster.currentAttackType = undefined;
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

    /**
     * Select which attack the monster should use based on conditions
     */
    selectMonsterAttack(monster: ServerMonsterState, stats: any, target: { x: number, y: number }): { attackType: 'primary' | 'special1' | 'special2', attackConfig: any } {
        const now = Date.now();
        const distance = Math.sqrt(Math.pow(target.x - monster.x, 2) + Math.pow(target.y - monster.y, 2));
        
        // Initialize cooldowns if not present
        if (!monster.attackCooldowns) {
            // Initialize to a time that makes attacks immediately available
            const initialTime = now - 10000; // 10 seconds ago
            monster.attackCooldowns = {
                primary: initialTime,
                special1: initialTime,
                special2: initialTime
            };
        }
        
        // Get attack configurations
        const attacks = stats.attacks || { primary: `monster_${monster.type}_primary` };
        const availableAttacks: Array<{ type: 'primary' | 'special1' | 'special2', configName: string }> = [];
        
        // Check which attacks are available (off cooldown and in range)
        for (const [attackType, attackName] of Object.entries(attacks)) {
            if (!attackName) continue;
            
            const attackConfig = ATTACK_DEFINITIONS[attackName as keyof typeof ATTACK_DEFINITIONS];
            if (!attackConfig) continue;
            
            const cooldownKey = attackType as 'primary' | 'special1' | 'special2';
            const lastUsed = monster.attackCooldowns[cooldownKey] || 0;
            const cooldownReady = now - lastUsed >= attackConfig.cooldown;
            const attackRange = (attackConfig as any).range || stats.attackRange;
            const inRange = distance <= attackRange;
            
            if (cooldownReady && inRange) {
                availableAttacks.push({ type: cooldownKey, configName: attackName as string });
            }
        }
        
        // If no attacks available, return null to indicate no attack should be performed
        if (availableAttacks.length === 0) {
            // Return primary attack config but with a flag indicating it's not ready
            const primaryConfig = ATTACK_DEFINITIONS[attacks.primary as keyof typeof ATTACK_DEFINITIONS] || ATTACK_DEFINITIONS.monster_ogre_primary;
            return {
                attackType: 'primary',
                attackConfig: primaryConfig
            };
        }
        
        // Select attack based on monster type and conditions
        let selectedAttack = availableAttacks[0]; // Default to first available
        
        switch (monster.type) {
            case 'ogre':
                // For playtesting: Always prioritize spin attack when available
                const spinAttack = availableAttacks.find(a => a.configName === 'monster_ogre_spin');
                if (spinAttack) {
                    selectedAttack = spinAttack;
                }
                break;
                
            case 'elemental':
                // Elemental uses spell at medium range, melee up close
                if (distance > 150 && distance < 300 && availableAttacks.find(a => a.configName === 'monster_elemental_spell')) {
                    selectedAttack = availableAttacks.find(a => a.configName === 'monster_elemental_spell')!;
                }
                break;
                
            case 'ghoul':
                // Ghoul uses frenzy when player is low health or randomly
                if ((target as any).hp <= 2 && availableAttacks.find(a => a.configName === 'monster_ghoul_frenzy')) {
                    selectedAttack = availableAttacks.find(a => a.configName === 'monster_ghoul_frenzy')!;
                } else if (Math.random() < 0.25 && availableAttacks.find(a => a.configName === 'monster_ghoul_frenzy')) {
                    selectedAttack = availableAttacks.find(a => a.configName === 'monster_ghoul_frenzy')!;
                }
                break;
                
            case 'skeleton':
                // Skeleton throws bones at range, melee up close
                if (distance > 200 && availableAttacks.find(a => a.configName === 'monster_skeleton_bonethrow')) {
                    selectedAttack = availableAttacks.find(a => a.configName === 'monster_skeleton_bonethrow')!;
                }
                break;
                
            case 'wildarcher':
                // Wild archer uses multishot when multiple targets in range
                const targetsInRange = this.countNearbyPlayers(monster, 400);
                if (targetsInRange >= 2 && availableAttacks.find(a => a.configName === 'monster_wildarcher_multishot')) {
                    selectedAttack = availableAttacks.find(a => a.configName === 'monster_wildarcher_multishot')!;
                }
                break;
                
            case 'darkmage':
                // Dark mage prefers teleport when player is at medium range
                const teleportAttack = availableAttacks.find(a => a.configName === 'monster_darkmage_teleport');
                if (teleportAttack && distance > 100 && distance < 250) {
                    // Check if player is moving away (dot product of velocities)
                    const playerVelocity = (target as any).velocity;
                    if (playerVelocity) {
                        const dx = target.x - monster.x;
                        const dy = target.y - monster.y;
                        const dot = (dx * playerVelocity.x + dy * playerVelocity.y) / Math.sqrt(dx * dx + dy * dy);
                        if (dot > 0 || Math.random() < 0.4) {
                            selectedAttack = teleportAttack;
                        }
                    } else if (Math.random() < 0.4) {
                        selectedAttack = teleportAttack;
                    }
                }
                break;
        }
        
        const attackConfig = ATTACK_DEFINITIONS[selectedAttack.configName as keyof typeof ATTACK_DEFINITIONS];
        return {
            attackType: selectedAttack.type,
            attackConfig: attackConfig
        };
    }

    /**
     * Count nearby players within radius
     */
    countNearbyPlayers(monster: ServerMonsterState, radius: number): number {
        if (!this.io || !(this.io as any).gameState) return 0;
        
        const players = (this.io as any).gameState.players as Map<string, PlayerState>;
        let count = 0;
        
        for (const [_, player] of players) {
            if (player.hp <= 0) continue;
            
            const playerCoords = this.playerToCoords(player);
            const distance = Math.sqrt(
                Math.pow(playerCoords.x - monster.x, 2) + 
                Math.pow(playerCoords.y - monster.y, 2)
            );
            
            if (distance <= radius) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * Execute a standard melee attack
     */
    executeMeleeAttack(monster: ServerMonsterState, attackConfig: any, players: Map<string, PlayerState>): void {
        if (!monster || monster.hp <= 0 || monster.state === 'dying') {
            return;
        }
        
        const target = monster.target;
        if (!target || target.hp <= 0) return;
        
        const distance = getDistance(monster, target);
        const attackRange = (attackConfig as any).range || 100;
        if (distance > attackRange * 1.2) return;
        
        // Handle different attack types
        if (attackConfig.hitboxType === 'circle') {
            this.executeAOEAttack(monster, attackConfig, players);
        } else if (attackConfig.hitboxType === 'cone') {
            // Cone attacks hit multiple targets in an arc
            this.executeConeAttack(monster, attackConfig, players);
        } else {
            // Single target melee (rectangle or default)
            if (this.damageProcessor) {
                this.damageProcessor.applyDamage(
                    monster,
                    target,
                    attackConfig.damage,
                    'melee',
                    { attackType: `monster_${(attackConfig as any).name || 'melee'}` }
                );
            }
        }
    }

    /**
     * Execute a cone attack hitting multiple targets in an arc
     */
    executeConeAttack(monster: ServerMonsterState, attackConfig: any, players: Map<string, PlayerState>): void {
        if (!monster || monster.hp <= 0 || monster.state === 'dying') {
            return;
        }
        
        const range = attackConfig.hitboxParams?.range || 100;
        const angle = attackConfig.hitboxParams?.angle || 90; // degrees
        const halfAngle = (angle / 2) * (Math.PI / 180); // Convert to radians
        const attackId = `${monster.id}_${Date.now()}`;
        
        // Find all players in cone
        for (const [_, player] of players) {
            if (player.hp <= 0) continue;
            
            const playerCoords = this.playerToCoords(player);
            const dx = playerCoords.x - monster.x;
            const dy = playerCoords.y - monster.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= range) {
                // Check if player is within the cone angle
                const angleToPlayer = Math.atan2(dy, dx);
                // Convert facing direction to angle if it's a string
                let monsterFacingAngle: number;
                if (typeof monster.facing === 'number') {
                    monsterFacingAngle = monster.facing;
                } else {
                    // Convert direction string to angle
                    const facingAngles: Record<string, number> = {
                        'right': 0,
                        'down-right': Math.PI / 4,
                        'down': Math.PI / 2,
                        'down-left': 3 * Math.PI / 4,
                        'left': Math.PI,
                        'up-left': -3 * Math.PI / 4,
                        'up': -Math.PI / 2,
                        'up-right': -Math.PI / 4
                    };
                    monsterFacingAngle = facingAngles[monster.facing] || 0;
                }
                const angleDiff = Math.abs(this.normalizeAngle(angleToPlayer - monsterFacingAngle));
                
                if (angleDiff <= halfAngle) {
                    // Check if already hit by this attack (for multi-hit prevention)
                    const playerState = player as any;
                    if (playerState.lastHitBy?.attackId === attackId) {
                        continue;
                    }
                    
                    // Apply damage
                    if (this.damageProcessor) {
                        this.damageProcessor.applyDamage(
                            monster,
                            player,
                            attackConfig.damage,
                            'melee',
                            { attackType: `monster_${(attackConfig as any).name || 'cone'}`, attackId }
                        );
                        
                        // Mark as hit by this attack
                        playerState.lastHitBy = { attackId, timestamp: Date.now() };
                    }
                }
            }
        }
    }
    
    /**
     * Normalize angle to [-PI, PI] range
     */
    normalizeAngle(angle: number): number {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    /**
     * Execute an AOE attack hitting multiple targets
     */
    executeAOEAttack(monster: ServerMonsterState, attackConfig: any, players: Map<string, PlayerState>): void {
        if (!monster || monster.hp <= 0 || monster.state === 'dying') {
            return;
        }
        
        const radius = attackConfig.hitboxParams?.radius || 100;
        const attackId = `${monster.id}_${Date.now()}`;
        
        // Find all players in range
        for (const [_, player] of players) {
            if (player.hp <= 0) continue;
            
            const playerCoords = this.playerToCoords(player);
            const distance = Math.sqrt(
                Math.pow(playerCoords.x - monster.x, 2) + 
                Math.pow(playerCoords.y - monster.y, 2)
            );
            
            if (distance <= radius) {
                // Check if already hit by this attack (for multi-hit prevention)
                const playerState = player as any;
                if (playerState.lastHitBy?.attackId === attackId) {
                    continue;
                }
                
                // Apply damage
                if (this.damageProcessor) {
                    this.damageProcessor.applyDamage(
                        monster,
                        player,
                        attackConfig.damage,
                        'melee',
                        { attackType: `monster_${(attackConfig as any).name || 'aoe'}`, attackId }
                    );
                    
                    // Mark as hit by this attack
                    playerState.lastHitBy = { attackId, timestamp: Date.now() };
                }
            }
        }
    }

    /**
     * Execute a projectile attack
     */
    executeProjectileAttack(monster: ServerMonsterState, target: PlayerState, attackConfig: any): void {
        if (!monster || monster.hp <= 0 || monster.state === 'dying') {
            return;
        }
        
        if (!target || target.hp <= 0) return;
        
        const targetCoords = this.playerToCoords(target);
        const dx = targetCoords.x - monster.x;
        const dy = targetCoords.y - monster.y;
        const angle = Math.atan2(dy, dx);
        
        // Determine projectile type based on monster
        let effectType = 'wildarcher_shot_effect';
        if (monster.type === 'elemental') {
            effectType = 'elemental_spell_effect';
        } else if (monster.type === 'skeleton') {
            effectType = 'skeleton_bone_effect';
        } else if (monster.type === 'darkmage') {
            effectType = 'darkmage_shadowbolt_effect';
        }
        
        // Create projectile
        if ((this.io as any).projectileManager) {
            const projectileOwner = {
                id: monster.id,
                type: monster.type
            };
            (this.io as any).projectileManager.createProjectile(projectileOwner, {
                x: monster.x,
                y: monster.y,
                angle: angle,
                speed: (attackConfig as any).projectileSpeed || 600,
                damage: attackConfig.damage,
                range: (attackConfig as any).projectileRange || (attackConfig as any).range,
                effectType: effectType
            });
        }
    }

    /**
     * Execute a multi-projectile attack
     */
    /**
     * Execute a teleport melee attack
     */
    executeTeleportMeleeAttack(monster: ServerMonsterState, stats: any, attackConfig: any, players: Map<string, PlayerState>): void {
        try {
            if (!monster || monster.hp <= 0 || monster.state === 'dying' || !monster.teleportData) {
                console.warn(`[MonsterManager] Teleport attack cancelled - invalid monster state`);
                return;
            }
            
            const teleportConfig = attackConfig as any;
            const teleportData = monster.teleportData;
            
            // Validate teleport data
            if (!teleportData.targetPosition || teleportData.targetPosition.x === undefined || teleportData.targetPosition.y === undefined) {
                console.error(`[MonsterManager] Invalid teleport data for ${monster.id}`);
                monster.teleportData = undefined;
                (monster as any).teleported = false;
                (monster as any).teleportPhase = undefined;
                monster.attackPhase = undefined;
                monster.isAttackAnimating = false;
                return;
            }
            
            // Calculate actual teleport position (behind the target)
            const teleportX = teleportData.targetPosition.x + Math.cos(teleportData.teleportAngle) * teleportData.teleportDistance;
            const teleportY = teleportData.targetPosition.y + Math.sin(teleportData.teleportAngle) * teleportData.teleportDistance;
            
            // Validate teleport destination
            let canTeleport = false;
            try {
                canTeleport = this.collisionMask.canMove(
                    monster.x, monster.y,
                    teleportX, teleportY
                );
            } catch (error) {
                console.error(`[MonsterManager] Error checking teleport collision:`, error);
                canTeleport = false;
            }
            
            if (canTeleport) {
                // Store original position for dash
                const startX = monster.x;
                const startY = monster.y;
                
                // Update facing to look at target
                const dx = teleportData.targetPosition.x - teleportX;
                const dy = teleportData.targetPosition.y - teleportY;
                monster.facing = this.getFacingDirection(dx, dy);
                
                // Mark as dashing for client animation
                (monster as any).dashStartX = startX;
                (monster as any).dashStartY = startY;
                (monster as any).dashEndX = teleportX;
                (monster as any).dashEndY = teleportY;
                (monster as any).dashStartTime = Date.now();
                (monster as any).dashDuration = 250; // 250ms ultra-fast dash
                (monster as any).isDashing = true;
                
                // Change animation to dash
                monster.currentAttackType = 'special1';
                (monster as any).teleportPhase = 'dash';
                
                console.log(`[MonsterManager] Dark Mage ${monster.id} dashing to target`, {
                    from: { x: Math.round(startX), y: Math.round(startY) },
                    to: { x: Math.round(teleportX), y: Math.round(teleportY) },
                    dashDuration: 250
                });
                
                // Schedule position update after dash
                setTimeout(() => {
                    if (!monster || monster.hp <= 0 || monster.state === 'dying') {
                        return;
                    }
                    
                    // Update position after dash
                    monster.x = teleportX;
                    monster.y = teleportY;
                    monster.velocity = { x: 0, y: 0 };
                    (monster as any).isDashing = false;
                    
                    // Immediately transition to attack
                    if (!monster || monster.hp <= 0) {
                        return;
                    }
                
                // Change to attack animation
                (monster as any).teleportPhase = 'attack';
                
                // Schedule damage at frame 6 of pummel animation
                const attackDelay = (attackConfig as any).attackDelay || 200; // 200ms for frame 6
                setTimeout(() => {
                    if (!monster || monster.hp <= 0) {
                        return;
                    }
                    
                    // Execute cone melee damage
                    try {
                        // Since teleport attack is configured as cone, use executeConeAttack
                        if (attackConfig.hitboxType === 'cone') {
                            this.executeConeAttack(monster, attackConfig, players);
                        } else {
                            this.executeMeleeAttack(monster, attackConfig, players);
                        }
                    } catch (error) {
                        console.error(`[MonsterManager] Error executing teleport attack:`, error);
                    }
                }, attackDelay);
                
                // Schedule recovery
                setTimeout(() => {
                    if (monster) {
                        monster.attackPhase = 'recovery';
                        monster.teleportData = undefined;
                        (monster as any).isDashing = false;
                        (monster as any).dashStartX = undefined;
                        (monster as any).dashStartY = undefined;
                        (monster as any).dashEndX = undefined;
                        (monster as any).dashEndY = undefined;
                        (monster as any).dashStartTime = undefined;
                        (monster as any).dashDuration = undefined;
                        (monster as any).teleportPhase = undefined;
                        
                        // Schedule cleanup
                        setTimeout(() => {
                            if (monster && monster.attackPhase === 'recovery') {
                                monster.attackPhase = undefined;
                                monster.isAttackAnimating = false;
                                // Set cooldown when animation ends for proper cooldown timing
                                const completedAttackType = monster.currentAttackType || 'primary';
                                if (!monster.attackCooldowns) {
                                    monster.attackCooldowns = { primary: 0 };
                                }
                                monster.attackCooldowns[completedAttackType as 'primary' | 'special1' | 'special2'] = Date.now();
                                monster.lastAttack = Date.now();
                                monster.currentAttackType = undefined;
                                
                                // Transition to appropriate state
                                if (monster.target) {
                                    const targetCoords = this.playerToCoords(monster.target);
                                    const distance = getDistance(monster, targetCoords);
                                    
                                    // Check max attack range
                                    let maxAttackRange = stats.attackRange;
                                    if (stats.attacks) {
                                        for (const attackType in stats.attacks) {
                                            const attackKey = stats.attacks[attackType as keyof typeof stats.attacks];
                                            const attackCfg = ATTACK_DEFINITIONS[attackKey as keyof typeof ATTACK_DEFINITIONS];
                                            if (attackCfg && (attackCfg as any).range) {
                                                maxAttackRange = Math.max(maxAttackRange, (attackCfg as any).range);
                                            }
                                        }
                                    }
                                    
                                    if (distance > maxAttackRange) {
                                        this.transitionMonsterState(monster, 'chasing');
                                    } else {
                                        this.transitionMonsterState(monster, 'idle');
                                    }
                                } else {
                                    this.transitionMonsterState(monster, 'idle');
                                }
                            }
                        }, attackConfig.recoveryTime);
                    }
                }, 500); // Allow full Pummel animation (15 frames at 0.5 speed = 500ms)
                }, 250); // Dash duration
            } else {
                // Can't teleport, fall back to regular attack
                console.log(`[MonsterManager] Teleport failed for ${monster.id}, executing normal attack`);
                monster.teleportData = undefined;
                (monster as any).isDashing = false;
                (monster as any).teleportPhase = undefined;
                
                try {
                    this.executeMeleeAttack(monster, attackConfig, players);
                } catch (error) {
                    console.error(`[MonsterManager] Error executing fallback attack:`, error);
                }
                
                // Still need to handle recovery
                setTimeout(() => {
                    if (monster) {
                        monster.attackPhase = 'recovery';
                        setTimeout(() => {
                            if (monster && monster.attackPhase === 'recovery') {
                                monster.attackPhase = undefined;
                                monster.isAttackAnimating = false;
                                // Set cooldown when animation ends for proper cooldown timing
                                const completedAttackType = monster.currentAttackType || 'primary';
                                if (!monster.attackCooldowns) {
                                    monster.attackCooldowns = { primary: 0 };
                                }
                                monster.attackCooldowns[completedAttackType as 'primary' | 'special1' | 'special2'] = Date.now();
                                monster.lastAttack = Date.now();
                                monster.currentAttackType = undefined;
                                this.transitionMonsterState(monster, 'idle');
                            }
                        }, attackConfig.recoveryTime);
                    }
                }, 300);
            }
        } catch (error) {
            console.error(`[MonsterManager] Critical error in executeTeleportMeleeAttack:`, error);
            // Clean up monster state to prevent stuck monsters
            if (monster) {
                monster.attackPhase = undefined;
                monster.isAttackAnimating = false;
                monster.teleportData = undefined;
                (monster as any).isDashing = false;
                (monster as any).dashStartX = undefined;
                (monster as any).dashStartY = undefined;
                (monster as any).dashEndX = undefined;
                (monster as any).dashEndY = undefined;
                (monster as any).dashStartTime = undefined;
                (monster as any).dashDuration = undefined;
                (monster as any).teleportPhase = undefined;
                monster.currentAttackType = undefined;
                monster.attackAnimationStarted = 0;
            }
        }
    }

    executeMultiProjectileAttack(monster: ServerMonsterState, target: PlayerState, attackConfig: any): void {
        if (!monster || monster.hp <= 0 || monster.state === 'dying') {
            return;
        }
        
        if (!target || target.hp <= 0) return;
        
        const targetCoords = this.playerToCoords(target);
        const dx = targetCoords.x - monster.x;
        const dy = targetCoords.y - monster.y;
        const baseAngle = Math.atan2(dy, dx);
        
        const projectileCount = (attackConfig as any).projectileCount || 3;
        const spreadAngle = ((attackConfig as any).spreadAngle || 30) * Math.PI / 180;
        const angleStep = spreadAngle / (projectileCount - 1);
        const startAngle = baseAngle - spreadAngle / 2;
        
        // Create multiple projectiles
        for (let i = 0; i < projectileCount; i++) {
            const angle = startAngle + angleStep * i;
            
            if ((this.io as any).projectileManager) {
                const projectileOwner = {
                    id: monster.id,
                    type: monster.type
                };
                (this.io as any).projectileManager.createProjectile(projectileOwner, {
                    x: monster.x,
                    y: monster.y,
                    angle: angle,
                    speed: (attackConfig as any).projectileSpeed || 450,
                    damage: attackConfig.damage,
                    range: (attackConfig as any).projectileRange || (attackConfig as any).range,
                    effectType: 'wildarcher_shot_effect'
                });
            }
        }
    }

    /**
     * Execute a multi-hit melee attack
     */
    executeMultiHitAttack(monster: ServerMonsterState, stats: any, attackConfig: any, players: Map<string, PlayerState>): void {
        if (!monster || monster.hp <= 0 || monster.state === 'dying' || !monster.multiHitData) {
            return;
        }
        
        const multiHit = monster.multiHitData;
        
        // Apply current hit
        if (multiHit.hitsRemaining > 0) {
            // AOE damage for multi-hit
            this.executeAOEAttack(monster, attackConfig, players);
            multiHit.hitsRemaining--;
            
            // Movement is now handled continuously in updateMonster
            
            // Schedule next hit if more remaining
            if (multiHit.hitsRemaining > 0) {
                setTimeout(() => {
                    this.executeMultiHitAttack(monster, stats, attackConfig, players);
                }, multiHit.hitInterval);
            } else {
                // Multi-hit complete, enter recovery phase
                // Keep multiHitData for movement during recovery
                monster.attackPhase = 'recovery';
                
                // Schedule recovery complete and cleanup
                setTimeout(() => {
                    if (monster && monster.attackPhase === 'recovery') {
                        // Clean up all attack state
                        monster.attackPhase = undefined;
                        monster.isAttackAnimating = false;
                        // Set cooldown when animation ends for proper cooldown timing
                        const completedAttackType = monster.currentAttackType || 'primary';
                        if (!monster.attackCooldowns) {
                            monster.attackCooldowns = { primary: 0 };
                        }
                        monster.attackCooldowns[completedAttackType as 'primary' | 'special1' | 'special2'] = Date.now();
                        monster.lastAttack = Date.now();
                        monster.currentAttackType = undefined;
                        monster.multiHitData = undefined; // Clear multiHitData after recovery
                        
                        // Now transition to appropriate state
                        if (monster.target) {
                            const targetCoords = this.playerToCoords(monster.target);
                            const distance = getDistance(monster, targetCoords);
                            const monsterStats = MONSTER_STATS[monster.type as keyof typeof MONSTER_STATS];
                            
                            // Check if any attack is in range (use max range)
                            let maxAttackRange = monsterStats.attackRange;
                            if (monsterStats.attacks) {
                                for (const attackType in monsterStats.attacks) {
                                    const attackKey = monsterStats.attacks[attackType as keyof typeof monsterStats.attacks];
                                    const attackConfig = ATTACK_DEFINITIONS[attackKey as keyof typeof ATTACK_DEFINITIONS];
                                    if (attackConfig && (attackConfig as any).range) {
                                        maxAttackRange = Math.max(maxAttackRange, (attackConfig as any).range);
                                    }
                                }
                            }
                            
                            if (distance > maxAttackRange) {
                                this.transitionMonsterState(monster, 'chasing');
                            } else {
                                this.transitionMonsterState(monster, 'idle');
                            }
                        } else {
                            this.transitionMonsterState(monster, 'idle');
                        }
                    }
                }, attackConfig.recoveryTime);
            }
        }
    }

    moveToward(monster: ServerMonsterState, target: PlayerState, speed: number): void {
        const targetCoords = this.playerToCoords(target);
        
        // Use smart pathfinding that understands elevation and stairs
        const movement = this.calculateSmartMovement(monster, targetCoords);
        
        if (movement.x !== 0 || movement.y !== 0) {
            const distance = Math.sqrt(movement.x * movement.x + movement.y * movement.y);
            monster.velocity.x = (movement.x / distance) * speed;
            monster.velocity.y = (movement.y / distance) * speed;
            
            // Calculate intended new position
            const newX = monster.x + monster.velocity.x;
            const newY = monster.y + monster.velocity.y;
            
            // Movement validation - check the path, not just destination
            const canMoveToPosition = this.collisionMask && this.collisionMask.canMove(monster.x, monster.y, newX, newY);
            
            if (canMoveToPosition) {
                // Movement is valid, update position
                const oldX = monster.x;
                const oldY = monster.y;
                monster.x = newX;
                monster.y = newY;
                
                // Debug: Check if monster crossed elevation boundary
                const oldElevation = this.getElevationAt(oldX, oldY);
                const newElevation = this.getElevationAt(newX, newY);
                if (oldElevation !== newElevation && !this.isOnStairs(newX, newY)) {
                    console.warn(`[MonsterManager] Monster ${monster.id} walked through cliff! From elev ${oldElevation} to ${newElevation} at (${Math.round(newX)}, ${Math.round(newY)})`);
                }
            } else {
                // Movement blocked, try partial movement (sliding along walls)
                const canMoveX = this.collisionMask?.canMove(monster.x, monster.y, newX, monster.y);
                const canMoveY = this.collisionMask?.canMove(monster.x, monster.y, monster.x, newY);
                
                if (canMoveX) {
                    monster.x = newX;
                } else if (canMoveY) {
                    monster.y = newY;
                } else {
                    // Completely blocked, try wandering to find better position
                    this.attemptWandering(monster, speed);
                }
            }
            
            // Don't update facing during multi-hit attacks (committed movement)
            if (!monster.multiHitData) {
                monster.facing = this.getFacingDirection(movement.x, movement.y);
            }
        }
    }

    /**
     * Simple pathfinding: Use A* to find walkable path, wander if none exists
     */
    calculateSmartMovement(monster: ServerMonsterState, target: { x: number, y: number }): { x: number, y: number } {
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Debug: Log pathfinding attempts occasionally
        if (!monster.lastDebugLog || Date.now() - monster.lastDebugLog > 5000) {
            monster.lastDebugLog = Date.now();
            console.log(`[MonsterManager] Monster ${monster.id} at (${Math.round(monster.x)}, ${Math.round(monster.y)}) trying to reach player at (${Math.round(target.x)}, ${Math.round(target.y)}), distance: ${Math.round(distance)}`);
        }
        
        // Simple: Just use A* pathfinding
        if (this.astarPathfinding) {
            // Check if we have a valid cached path
            if (monster.currentPath && monster.pathTarget && 
                monster.pathIndex !== undefined && monster.pathIndex < monster.currentPath.length) {
                
                // Check if target has moved significantly
                const targetMoved = Math.abs(target.x - monster.pathTarget.x) > 64 || 
                                  Math.abs(target.y - monster.pathTarget.y) > 64;
                
                if (!targetMoved) {
                    // Use cached path - find next waypoint
                    let nextWaypoint = monster.currentPath[monster.pathIndex];
                    
                    // Skip waypoints we're close to
                    while (monster.pathIndex < monster.currentPath.length - 1) {
                        const distToWaypoint = Math.sqrt(
                            Math.pow(nextWaypoint.x - monster.x, 2) + 
                            Math.pow(nextWaypoint.y - monster.y, 2)
                        );
                        
                        if (distToWaypoint < 32) {
                            // Close to waypoint, advance to next
                            monster.pathIndex++;
                            nextWaypoint = monster.currentPath[monster.pathIndex];
                        } else {
                            break;
                        }
                    }
                    
                    const moveDirection = {
                        x: nextWaypoint.x - monster.x,
                        y: nextWaypoint.y - monster.y
                    };
                    
                    return moveDirection;
                } else {
                    // Target moved, recalculate
                    monster.currentPath = undefined;
                    monster.pathIndex = undefined;
                    monster.pathTarget = undefined;
                }
            }
            
            // Try to find a path
            const pathResult = this.astarPathfinding.findPath(
                { x: monster.x, y: monster.y },
                { x: target.x, y: target.y }
            );
            
            if (pathResult.success && pathResult.worldPath.length > 1) {
                // Found a path! Cache it and follow it
                monster.currentPath = pathResult.worldPath;
                monster.pathIndex = 1; // Skip current position
                monster.pathTarget = { x: target.x, y: target.y };
                
                // Get next step in path
                const nextStep = pathResult.worldPath[1];
                const moveDirection = {
                    x: nextStep.x - monster.x,
                    y: nextStep.y - monster.y
                };
                
                return moveDirection;
            } else {
                // No path found - check if we can move directly (same elevation, close range)
                if (distance < 300) {
                    // Close range - try direct movement
                    console.log(`[MonsterManager] Monster ${monster.id} close to player (${Math.round(distance)}) - trying direct movement`);
                    return { x: dx, y: dy };
                } else {
                    // Far away - wander randomly to explore
                    if (!monster.wanderDirection || Math.random() < 0.1) {
                        // Change wander direction occasionally
                        monster.wanderDirection = this.getWanderDirection(monster);
                    }
                    return monster.wanderDirection;
                }
            }
        }
        
        // Fallback if no A* system (shouldn't happen)
        return { x: dx, y: dy };
    }

    /**
     * Check if there's clear line of sight between monster and target
     * Enhanced to check elevation differences - no LOS through cliff walls
     */
    hasLineOfSight(monster: ServerMonsterState, target: { x: number, y: number }): boolean {
        if (!this.collisionMask) return false;
        
        // First check basic collision
        if (!this.collisionMask.isPathClear(monster.x, monster.y, target.x, target.y)) {
            return false;
        }
        
        // Check elevation differences along the path - no LOS through cliff walls
        const monsterElevation = this.getElevationAt(monster.x, monster.y);
        const targetElevation = this.getElevationAt(target.x, target.y);
        
        // If same elevation, and collision check passed, we have LOS
        if (monsterElevation === targetElevation) {
            return true;
        }
        
        // Different elevations - check if path crosses cliff edges
        // Sample points along the line to check for elevation changes
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / 32); // Check every half-tile
        
        for (let i = 1; i < steps; i++) {
            const progress = i / steps;
            const checkX = monster.x + dx * progress;
            const checkY = monster.y + dy * progress;
            const checkElevation = this.getElevationAt(checkX, checkY);
            
            // If we hit a different elevation than start/end, and it's not stairs, no LOS
            if (checkElevation !== monsterElevation && checkElevation !== targetElevation) {
                if (!this.isOnStairs(checkX, checkY)) {
                    return false; // Line crosses through cliff - no LOS
                }
            }
        }
        
        return true; // Path is clear and doesn't cross cliffs
    }

    /**
     * Get elevation level at world coordinates
     */
    getElevationAt(worldX: number, worldY: number): number {
        try {
            const worldData = this.serverWorldManager.getWorldData();
            if (!worldData?.elevationData) return 0;
            
            const tileX = Math.floor(worldX / GAME_CONSTANTS.WORLD.TILE_SIZE);
            const tileY = Math.floor(worldY / GAME_CONSTANTS.WORLD.TILE_SIZE);
            
            if (tileX < 0 || tileY < 0 || tileY >= worldData.elevationData.length || tileX >= worldData.elevationData[0].length) {
                return 0;
            }
            
            return worldData.elevationData[tileY][tileX];
        } catch (error) {
            return 0;
        }
    }

    /**
     * Check if monster is currently on stairs
     */
    isOnStairs(worldX: number, worldY: number): boolean {
        try {
            const worldGen = this.serverWorldManager.getWorldGenerator();
            const stairsData = worldGen?.getStairsData();
            if (!stairsData) return false;
            
            const tileX = Math.floor(worldX / GAME_CONSTANTS.WORLD.TILE_SIZE);
            const tileY = Math.floor(worldY / GAME_CONSTANTS.WORLD.TILE_SIZE);
            
            if (tileX < 0 || tileY < 0 || tileY >= stairsData.length || tileX >= stairsData[0].length) {
                return false;
            }
            
            const stairInfo = stairsData[tileY][tileX];
            return stairInfo && worldGen.isStairTileWalkable(stairInfo.tileY, stairInfo.tileX);
        } catch (error) {
            return false;
        }
    }

    /**
     * Find direction toward nearest stairs that connect to target elevation
     */
    findNearestStairs(monster: ServerMonsterState, targetElevation: number): { x: number, y: number } {
        try {
            const worldGen = this.serverWorldManager.getWorldGenerator();
            const stairsData = worldGen?.getStairsData();
            if (!stairsData) return { x: 0, y: 0 };
            
            const monsterTileX = Math.floor(monster.x / GAME_CONSTANTS.WORLD.TILE_SIZE);
            const monsterTileY = Math.floor(monster.y / GAME_CONSTANTS.WORLD.TILE_SIZE);
            const searchRadius = 25; // Increased search radius to 25 tiles
            
            let nearestStair = null;
            let nearestDistance = Infinity;
            
            // Search for walkable stairs in nearby area
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                    const checkY = monsterTileY + dy;
                    const checkX = monsterTileX + dx;
                    
                    if (checkY < 0 || checkX < 0 || checkY >= stairsData.length || checkX >= stairsData[0].length) {
                        continue;
                    }
                    
                    const stairInfo = stairsData[checkY][checkX];
                    if (stairInfo && worldGen.isStairTileWalkable(stairInfo.tileY, stairInfo.tileX)) {
                        const stairWorldX = checkX * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
                        const stairWorldY = checkY * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
                        
                        // Check if we can actually reach this stair (rough line-of-sight)
                        if (this.hasLineOfSight(monster, { x: stairWorldX, y: stairWorldY })) {
                            const distanceToStair = Math.sqrt(
                                Math.pow(stairWorldX - monster.x, 2) + 
                                Math.pow(stairWorldY - monster.y, 2)
                            );
                            
                            if (distanceToStair < nearestDistance) {
                                nearestDistance = distanceToStair;
                                nearestStair = { x: stairWorldX, y: stairWorldY };
                            }
                        }
                    }
                }
            }
            
            if (nearestStair) {
                return {
                    x: nearestStair.x - monster.x,
                    y: nearestStair.y - monster.y
                };
            }
        } catch (error) {
            console.warn('[MonsterManager] Error finding stairs:', error);
        }
        
        return { x: 0, y: 0 };
    }

    /**
     * Find stairs within a small radius (for immediate stair detection)
     */
    findNearbyStairs(monster: ServerMonsterState, searchRadius: number): { x: number, y: number } {
        try {
            const worldGen = this.serverWorldManager.getWorldGenerator();
            const stairsData = worldGen?.getStairsData();
            if (!stairsData) return { x: 0, y: 0 };
            
            const monsterTileX = Math.floor(monster.x / GAME_CONSTANTS.WORLD.TILE_SIZE);
            const monsterTileY = Math.floor(monster.y / GAME_CONSTANTS.WORLD.TILE_SIZE);
            
            let nearestStair = null;
            let nearestDistance = Infinity;
            
            // Search for walkable stairs in nearby area
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                    const checkY = monsterTileY + dy;
                    const checkX = monsterTileX + dx;
                    
                    if (checkY < 0 || checkX < 0 || checkY >= stairsData.length || checkX >= stairsData[0].length) {
                        continue;
                    }
                    
                    const stairInfo = stairsData[checkY][checkX];
                    if (stairInfo && worldGen.isStairTileWalkable(stairInfo.tileY, stairInfo.tileX)) {
                        const stairWorldX = checkX * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
                        const stairWorldY = checkY * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
                        
                        const distanceToStair = Math.sqrt(
                            Math.pow(stairWorldX - monster.x, 2) + 
                            Math.pow(stairWorldY - monster.y, 2)
                        );
                        
                        if (distanceToStair < nearestDistance) {
                            nearestDistance = distanceToStair;
                            nearestStair = { x: stairWorldX, y: stairWorldY };
                        }
                    }
                }
            }
            
            if (nearestStair) {
                return {
                    x: nearestStair.x - monster.x,
                    y: nearestStair.y - monster.y
                };
            }
        } catch (error) {
            console.warn('[MonsterManager] Error finding nearby stairs:', error);
        }
        
        return { x: 0, y: 0 };
    }

    /**
     * Follow walls to eventually find stairs or a way around
     */
    followWallTowardTarget(monster: ServerMonsterState, target: { x: number, y: number }): { x: number, y: number } {
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        
        // Determine which direction we want to go
        const preferredX = Math.sign(dx);
        const preferredY = Math.sign(dy);
        
        // Try moving along walls in the preferred direction
        const stepSize = 32;
        const directions = [
            // Prefer movement toward target
            { x: preferredX, y: 0 },
            { x: 0, y: preferredY },
            { x: preferredX, y: preferredY },
            // Then try perpendicular directions (wall-following)
            { x: -preferredY, y: preferredX }, // Rotate 90 degrees
            { x: preferredY, y: -preferredX }, // Rotate -90 degrees
            // Finally try any direction
            { x: -preferredX, y: 0 },
            { x: 0, y: -preferredY }
        ];
        
        for (const dir of directions) {
            const testX = monster.x + dir.x * stepSize;
            const testY = monster.y + dir.y * stepSize;
            
            if (this.collisionMask?.isWalkable(testX, testY)) {
                return { x: dir.x, y: dir.y };
            }
        }
        
        return { x: 0, y: 0 };
    }

    /**
     * Wall following behavior specifically designed to find stairs
     */
    followWallToFindStairs(monster: ServerMonsterState, target: { x: number, y: number }): { x: number, y: number } {
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        const stepSize = 32;
        
        // Get current elevation
        const monsterElevation = this.getElevationAt(monster.x, monster.y);
        
        // Initialize or use existing wall following state
        if (!monster.wallFollowState) {
            monster.wallFollowState = {
                direction: { x: Math.sign(dx), y: Math.sign(dy) },
                lastStairCheck: 0,
                followingSince: Date.now()
            };
        }
        
        // Check for stairs every 500ms while wall following
        const now = Date.now();
        if (now - monster.wallFollowState.lastStairCheck > 500) {
            monster.wallFollowState.lastStairCheck = now;
            
            // Look for stairs in expanded radius while wall following
            const nearStairs = this.findNearbyStairs(monster, 8);
            if (nearStairs.x !== 0 || nearStairs.y !== 0) {
                console.log(`[Monster ${monster.id}] Found stairs during wall following!`);
                delete monster.wallFollowState; // Reset state
                return nearStairs;
            }
        }
        
        // Wall following directions - try to move along cliff edges
        const directions = [
            // Continue in current wall-following direction
            monster.wallFollowState.direction,
            // Try perpendicular directions (follow wall edge)
            { x: -monster.wallFollowState.direction.y, y: monster.wallFollowState.direction.x },
            { x: monster.wallFollowState.direction.y, y: -monster.wallFollowState.direction.x },
            // Try toward target
            { x: Math.sign(dx), y: 0 },
            { x: 0, y: Math.sign(dy) },
            // Try diagonal toward target
            { x: Math.sign(dx), y: Math.sign(dy) },
            // Try any walkable direction
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
        ];
        
        for (const dir of directions) {
            const testX = monster.x + dir.x * stepSize;
            const testY = monster.y + dir.y * stepSize;
            
            // Check if position is walkable
            if (this.collisionMask?.isWalkable(testX, testY)) {
                // Check if this position might help us find stairs (different elevation nearby)
                const testElevation = this.getElevationAt(testX, testY);
                
                // If we find a position with different elevation nearby, it might lead to stairs
                const surroundingPositions = [
                    { x: testX + stepSize, y: testY },
                    { x: testX - stepSize, y: testY },
                    { x: testX, y: testY + stepSize },
                    { x: testX, y: testY - stepSize }
                ];
                
                for (const pos of surroundingPositions) {
                    const surroundingElevation = this.getElevationAt(pos.x, pos.y);
                    if (surroundingElevation !== monsterElevation && this.collisionMask?.isWalkable(pos.x, pos.y)) {
                        // Found elevation difference - might be near stairs
                        console.log(`[Monster ${monster.id}] Wall following found elevation change, investigating`);
                        monster.wallFollowState.direction = dir;
                        return dir;
                    }
                }
                
                // Otherwise, use this direction for wall following
                monster.wallFollowState.direction = dir;
                return dir;
            }
        }
        
        // If wall following fails after too long, reset and try random direction
        if (now - monster.wallFollowState.followingSince > 10000) {
            console.log(`[Monster ${monster.id}] Wall following timeout, trying random movement`);
            delete monster.wallFollowState;
            // Try random wandering
            const wanderX = (Math.random() - 0.5) * 2;
            const wanderY = (Math.random() - 0.5) * 2;
            return { x: wanderX, y: wanderY };
        }
        
        return { x: 0, y: 0 };
    }

    /**
     * Find path around simple obstacles
     */
    findPathAroundObstacle(monster: ServerMonsterState, target: { x: number, y: number }): { x: number, y: number } {
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        
        // Try moving primarily in the direction with larger difference
        if (Math.abs(dx) > Math.abs(dy)) {
            // Try horizontal movement first
            if (this.collisionMask?.isWalkable(monster.x + Math.sign(dx) * 32, monster.y)) {
                return { x: Math.sign(dx), y: 0 };
            }
            // Then try vertical movement
            if (this.collisionMask?.isWalkable(monster.x, monster.y + Math.sign(dy) * 32)) {
                return { x: 0, y: Math.sign(dy) };
            }
        } else {
            // Try vertical movement first
            if (this.collisionMask?.isWalkable(monster.x, monster.y + Math.sign(dy) * 32)) {
                return { x: 0, y: Math.sign(dy) };
            }
            // Then try horizontal movement
            if (this.collisionMask?.isWalkable(monster.x + Math.sign(dx) * 32, monster.y)) {
                return { x: Math.sign(dx), y: 0 };
            }
        }
        
        return { x: 0, y: 0 };
    }

    /**
     * Wander in a random direction to find better position
     */
    getWanderDirection(monster: ServerMonsterState): { x: number, y: number } {
        // Simple random wander direction
        const angle = Math.random() * Math.PI * 2;
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }
    
    attemptWandering(monster: ServerMonsterState, speed: number): void {
        const wanderDistance = 64; // Try to move 1 tile in random direction
        const angle = Math.random() * Math.PI * 2;
        const dx = Math.cos(angle) * wanderDistance;
        const dy = Math.sin(angle) * wanderDistance;
        
        const newX = monster.x + dx;
        const newY = monster.y + dy;
        
        if (this.collisionMask?.canMove(monster.x, monster.y, newX, newY)) {
            monster.velocity.x = (dx / wanderDistance) * speed;
            monster.velocity.y = (dy / wanderDistance) * speed;
            monster.x = newX;
            monster.y = newY;
            // Don't update facing during multi-hit attacks
            if (!monster.multiHitData) {
                monster.facing = this.getFacingDirection(dx, dy);
            }
        }
    }

    /**
     * Get the current attack configuration for a monster
     */
    getAttackConfig(monster: ServerMonsterState): any {
        if (!monster.currentAttackType) return null;
        
        const stats = MONSTER_STATS[monster.type as keyof typeof MONSTER_STATS];
        const attacks = stats.attacks;
        if (!attacks) return null;
        
        const attackKey = attacks[monster.currentAttackType as keyof typeof attacks];
        if (!attackKey) return null;
        
        return ATTACK_DEFINITIONS[attackKey as keyof typeof ATTACK_DEFINITIONS];
    }
    
    /**
     * Check if monster is stuck (hasn't moved much in recent time)
     */
    isMonsterStuck(monster: ServerMonsterState): boolean {
        const now = Date.now();
        const checkInterval = 1000; // Check every 1 second
        
        // Initialize tracking if needed
        if (!monster.positionHistory) {
            monster.positionHistory = [];
            monster.stuckCounter = 0;
            monster.lastStuckCheck = now;
        }
        
        // Only check periodically
        if (now - (monster.lastStuckCheck || 0) < checkInterval) {
            return (monster.stuckCounter || 0) > 2; // Stuck if counter > 2
        }
        
        monster.lastStuckCheck = now;
        
        // Add current position to history
        monster.positionHistory.push({ x: monster.x, y: monster.y });
        
        // Keep only last 5 positions
        if (monster.positionHistory.length > 5) {
            monster.positionHistory.shift();
        }
        
        // Need at least 3 positions to check
        if (monster.positionHistory.length < 3) {
            return false;
        }
        
        // Check if all positions are within a small radius (stuck)
        const stuckRadius = 32; // Half a tile
        const firstPos = monster.positionHistory[0];
        const allNearby = monster.positionHistory.every(pos => {
            const dist = Math.sqrt(Math.pow(pos.x - firstPos.x, 2) + Math.pow(pos.y - firstPos.y, 2));
            return dist < stuckRadius;
        });
        
        if (allNearby) {
            monster.stuckCounter = (monster.stuckCounter || 0) + 1;
        } else {
            monster.stuckCounter = 0;
        }
        
        return monster.stuckCounter > 2; // Stuck if hasn't moved much in 3 checks
    }

    /**
     * Get escape movement when monster is stuck
     */
    getEscapeMovement(monster: ServerMonsterState, target: { x: number, y: number }): { x: number, y: number } {
        const stuckLevel = monster.stuckCounter || 0;
        
        // Level 1-2: Try diagonal movements
        if (stuckLevel <= 2) {
            const diagonals = [
                { x: 1, y: 1 }, { x: 1, y: -1 },
                { x: -1, y: 1 }, { x: -1, y: -1 }
            ];
            
            // Sort by distance to target
            diagonals.sort((a, b) => {
                const distA = Math.sqrt(Math.pow(target.x - (monster.x + a.x * 32), 2) + 
                                      Math.pow(target.y - (monster.y + a.y * 32), 2));
                const distB = Math.sqrt(Math.pow(target.x - (monster.x + b.x * 32), 2) + 
                                      Math.pow(target.y - (monster.y + b.y * 32), 2));
                return distA - distB;
            });
            
            for (const dir of diagonals) {
                const testX = monster.x + dir.x * 32;
                const testY = monster.y + dir.y * 32;
                if (this.collisionMask?.isWalkable(testX, testY)) {
                    return dir;
                }
            }
        }
        
        // Level 3+: Random strong push
        if (stuckLevel >= 3) {
            const angle = Math.random() * Math.PI * 2;
            const pushDistance = 64 + (stuckLevel - 3) * 32; // Stronger push with higher stuck level
            
            for (let i = 0; i < 8; i++) {
                const testAngle = angle + (i * Math.PI / 4);
                const dx = Math.cos(testAngle) * pushDistance;
                const dy = Math.sin(testAngle) * pushDistance;
                const testX = monster.x + dx;
                const testY = monster.y + dy;
                
                if (this.collisionMask?.canMove(monster.x, monster.y, testX, testY)) {
                    // Reset stuck counter after successful escape
                    monster.stuckCounter = 0;
                    monster.positionHistory = [];
                    return { x: dx / pushDistance, y: dy / pushDistance };
                }
            }
        }
        
        return { x: 0, y: 0 };
    }

    /**
     * BFS pathfinding that understands elevation and stairs
     */
    findPathToTarget(monster: ServerMonsterState, target: { x: number, y: number }): { x: number, y: number } {
        try {
            const startTile = {
                x: Math.floor(monster.x / GAME_CONSTANTS.WORLD.TILE_SIZE),
                y: Math.floor(monster.y / GAME_CONSTANTS.WORLD.TILE_SIZE)
            };
            const targetTile = {
                x: Math.floor(target.x / GAME_CONSTANTS.WORLD.TILE_SIZE),
                y: Math.floor(target.y / GAME_CONSTANTS.WORLD.TILE_SIZE)
            };
            
            // BFS with elevation awareness
            const queue: Array<{x: number; y: number; path: {x: number, y: number}[]}> = [];
            const visited = new Set<string>();
            const maxSteps = 300; // Limit search to prevent lag
            
            queue.push({x: startTile.x, y: startTile.y, path: []});
            visited.add(`${startTile.x},${startTile.y}`);
            
            const directions = [
                {dx: 1, dy: 0}, {dx: -1, dy: 0}, {dx: 0, dy: 1}, {dx: 0, dy: -1},
                // Include diagonals for better pathfinding
                {dx: 1, dy: 1}, {dx: 1, dy: -1}, {dx: -1, dy: 1}, {dx: -1, dy: -1}
            ];
            
            while (queue.length > 0 && visited.size < maxSteps) {
                const current = queue.shift()!;
                
                // Found target
                if (current.x === targetTile.x && current.y === targetTile.y) {
                    if (current.path.length > 0) {
                        const nextStep = current.path[0];
                        return {
                            x: nextStep.x - monster.x,
                            y: nextStep.y - monster.y
                        };
                    }
                }
                
                // Explore neighbors
                for (const dir of directions) {
                    const nextX = current.x + dir.dx;
                    const nextY = current.y + dir.dy;
                    const key = `${nextX},${nextY}`;
                    
                    if (visited.has(key)) continue;
                    
                    // Check bounds
                    if (nextX < 0 || nextY < 0 || 
                        nextX >= GAME_CONSTANTS.WORLD.WIDTH || 
                        nextY >= GAME_CONSTANTS.WORLD.HEIGHT) {
                        continue;
                    }
                    
                    // Check if this tile is reachable
                    if (this.isTileReachable(current.x, current.y, nextX, nextY)) {
                        visited.add(key);
                        
                        const worldX = nextX * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
                        const worldY = nextY * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
                        
                        const newPath = current.path.length === 0 ? 
                            [{x: worldX, y: worldY}] : 
                            [...current.path];
                        
                        queue.push({x: nextX, y: nextY, path: newPath});
                    }
                }
            }
        } catch (error) {
            console.warn('[MonsterManager] Pathfinding error:', error);
        }
        
        return { x: 0, y: 0 };
    }

    /**
     * Check if monster can move from one tile to another (considering elevation and stairs)
     */
    isTileReachable(fromX: number, fromY: number, toX: number, toY: number): boolean {
        // Convert to world coordinates for collision checking
        const fromWorldX = fromX * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
        const fromWorldY = fromY * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
        const toWorldX = toX * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
        const toWorldY = toY * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
        
        // Basic collision check
        if (!this.collisionMask?.isWalkable(toWorldX, toWorldY)) {
            return false;
        }
        
        // Get elevations
        const fromElevation = this.getElevationAt(fromWorldX, fromWorldY);
        const toElevation = this.getElevationAt(toWorldX, toWorldY);
        
        // Same elevation - just check walkability
        if (fromElevation === toElevation) {
            return true;
        }
        
        // Different elevations - need stairs or to be on stairs
        const isFromStairs = this.isOnStairs(fromWorldX, fromWorldY);
        const isToStairs = this.isOnStairs(toWorldX, toWorldY);
        
        // Can move between elevations if either position has stairs
        if (isFromStairs || isToStairs) {
            return true;
        }
        
        // Check if there are stairs connecting these elevations nearby
        const stairDistance = 1; // Check immediately adjacent tiles for stairs
        for (let dy = -stairDistance; dy <= stairDistance; dy++) {
            for (let dx = -stairDistance; dx <= stairDistance; dx++) {
                const checkX = fromX + dx;
                const checkY = fromY + dy;
                
                if (checkX >= 0 && checkY >= 0 && 
                    checkX < GAME_CONSTANTS.WORLD.WIDTH && 
                    checkY < GAME_CONSTANTS.WORLD.HEIGHT) {
                    
                    const checkWorldX = checkX * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
                    const checkWorldY = checkY * GAME_CONSTANTS.WORLD.TILE_SIZE + GAME_CONSTANTS.WORLD.TILE_SIZE / 2;
                    
                    if (this.isOnStairs(checkWorldX, checkWorldY)) {
                        return true; // Found stairs nearby
                    }
                }
            }
        }
        
        return false; // Can't reach different elevation without stairs
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
            monster.attackPhase = undefined;
            monster.currentAttackType = undefined;
            
            // Clear multi-hit data if present
            if (monster.multiHitData) {
                monster.multiHitData = undefined;
            }
            
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
            this.cleanupMonsterTimeouts(monster.id);
            this.monsters.delete(monster.id);
        }, 1000);
    }
    
    private cleanupMonsterTimeouts(monsterId: string): void {
        // Clean up any pending teleport timeouts for this monster
        const timeoutKeys = [
            `${monsterId}_attack`,
            `${monsterId}_recovery`,
            `${monsterId}_cleanup`,
            `${monsterId}_recovery_fallback`,
            `${monsterId}_cleanup_fallback`
        ];
        
        for (const key of timeoutKeys) {
            const timeout = this.teleportTimeouts.get(key);
            if (timeout) {
                clearTimeout(timeout);
                this.teleportTimeouts.delete(key);
            }
        }
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
                isStunned: monster.isStunned,
                currentAttackType: monster.currentAttackType, // Include attack type for animations
                attackPhase: monster.attackPhase, // Include attack phase for windup animations
                teleportPhase: (monster as any).teleportPhase, // For Dark Mage animation phases
                isDashing: (monster as any).isDashing, // Dark Mage dash state
                dashStartX: (monster as any).dashStartX, // Dash interpolation
                dashStartY: (monster as any).dashStartY,
                dashEndX: (monster as any).dashEndX,
                dashEndY: (monster as any).dashEndY,
                dashStartTime: (monster as any).dashStartTime,
                dashDuration: (monster as any).dashDuration
            }));
    }

    spawnInitialMonsters(count: number = 5): void {
        const players = new Map<string, PlayerState>();
        for (let i = 0; i < count; i++) {
            this.createMonster(null, null, players);
        }
    }
}