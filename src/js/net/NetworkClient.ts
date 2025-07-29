/**
 * @fileoverview NetworkClient - Main client-side network orchestrator
 * 
 * MIGRATION NOTES:
 * - Converted from NetworkClient.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 5
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for all socket events and data structures
 * - Preserved delta compression and state reconciliation logic
 * 
 * ARCHITECTURE ROLE:
 * - Primary interface between client game logic and server communication
 * - Manages Socket.IO connection and all real-time data exchange
 * - Implements client-side delta compression for bandwidth optimization
 * - Handles entity state synchronization and caching
 * 
 * CRITICAL RELATIONSHIPS:
 * - Game.js creates and owns this instance (this.network)
 * - StateCache instances manage client-side entity state caching
 * - Server NetworkOptimizer sends delta/full updates marked with _updateType
 * - processPlayerUpdate() integrates with client prediction (Reconciler)
 * 
 * PERFORMANCE PATTERN:
 * Delta compression reduces bandwidth by 70-80%:
 * 1. Server sends full updates on first contact per entity
 * 2. Subsequent updates are deltas (only changed fields)
 * 3. Client merges deltas with cached state before processing
 * 4. Critical fields (id, state, hp, facing) always included for stability
 * 
 * STATE FLOW:
 * Socket 'state' event → delta/full detection → cache merge → game entity update
 */

import { StateCache } from './StateCache.js';
import * as PIXI from 'pixi.js';
import { AttackTelegraphRenderer } from '../systems/AttackTelegraphRenderer.js';
import type { 
    PlayerState,
    MonsterState,
    ProjectileState,
    CharacterClass,
    AttackType,
    Position
} from '../../../shared/types/GameTypes.js';

// Socket.IO client types (maintained locally for compatibility)
interface SocketIOClient {
    id?: string;
    connected: boolean;
    emit(event: string, ...args: any[]): void;
    on(event: string, handler: (...args: any[]) => void): void;
    disconnect(): void;
}

// External global socket.io factory
declare const io: () => SocketIOClient;

// Game interface - minimal type to avoid circular dependencies
interface GameInterface {
    entities: {
        player?: any; // Player instance
    };
    systems?: {
        reconciler?: any; // Reconciler instance
        combat?: any; // CombatSystem instance
    };
    remotePlayers?: Map<string, any>; // Remote Player instances
    remoteMonsters?: Map<string, any>; // Remote Monster instances
    projectileRenderer?: any; // ProjectileRenderer instance
    telegraphRenderer?: any; // AttackTelegraphRenderer instance
    powerupRenderer?: any; // PowerupRenderer instance
    healthUI?: any; // HealthUI instance
    statsUI?: any; // StatsUI instance
    actionBoxUI?: any; // ActionBoxUI instance
    selectedClass?: string; // Selected character class
    entityContainer?: any; // PIXI container for entities
    
    // Methods called by NetworkClient
    initializeGameWorld(world: WorldInitData): void;
    addRemotePlayer(playerData: any): void;
    removeRemotePlayer(id: string): void;
    updateRemotePlayer(playerState: any): void;
    addOrUpdateMonster(monsterData: any): void;
    remotePlayerAttack(id: string, type: string, facing?: string): void;
    showDamageNumber?(position: Position, damage: number): void;
    showXpGain?(position: Position, xp: number): void;
    applyServerConfig(config: any): void;
}

// Network event data structures
interface InitData {
    id: string;
    world: WorldInitData;
    config?: any;
    players: any[];
    monsters: any[];
}

interface WorldInitData {
    seed: number;
    width: number;
    height: number;
}

interface StateUpdate {
    players: PlayerStateUpdate[];
    monsters: MonsterStateUpdate[];
    projectiles?: ProjectileStateUpdate[];
}

interface PlayerStateUpdate {
    id: string;
    x: number;
    y: number;
    facing: number;
    hp: number;
    level?: number;
    xp?: number;
    maxHp?: number;
    moveSpeedBonus?: number;
    attackRecoveryBonus?: number;
    attackCooldownBonus?: number;
    rollUnlocked?: boolean;
    lastProcessedSeq?: number;
    _updateType?: 'full' | 'delta';
}

interface MonsterStateUpdate {
    id: string;
    type?: string;
    x?: number;
    y?: number;
    hp?: number;
    state?: string;
    facing?: number;
    _updateType?: 'full' | 'delta';
}

interface ProjectileStateUpdate {
    id: string;
    x: number;
    y: number;
}

interface AttackData {
    type: AttackType;
    x: number;
    y: number;
    facing: number;
}

interface DamageEventData {
    playerId?: string;
    monsterId?: string;
    attacker?: string;
    hp: number;
    damage: number;
    armorHP?: number;
    source?: {
        type: string;
        id: string;
        class?: string;
        username?: string;
        monsterType?: string;
    };
}

interface KillEventData {
    playerId?: string;
    monsterId?: string;
    killedBy?: string;
    xpReward?: number;
    killerXp?: number;
    killerLevel?: number;
    victimId?: string;
    victimClass?: string;
    victimUsername?: string;
    killerId?: string;
    killerClass?: string;
    killerUsername?: string;
    killerType?: string; // For monster kills
}

interface LevelUpData {
    playerId: string;
    username?: string;
    level: number;
    hp: number;
    maxHp?: number;
    moveSpeedBonus?: number;
    attackRecoveryBonus?: number;
    attackCooldownBonus?: number;
    rollUnlocked?: boolean;
}

interface RespawnData {
    playerId: string;
    level: number;
    xp: number;
    hp: number;
    maxHp?: number;
    moveSpeedBonus?: number;
    attackRecoveryBonus?: number;
    attackCooldownBonus?: number;
    rollUnlocked?: boolean;
}

interface ProjectileData {
    x: number;
    y: number;
    angle: number;
    speed: number;
    range: number;
    effectType: string;
}

interface InputCommand {
    keys: string[];
    facing: number;
    deltaTime: number;
    sequence: number;
    timestamp: number;
}

interface AbilityEventData {
    playerId: string;
    type: string;
    abilityKey?: string;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    duration?: number;
    backwardJump?: boolean;
}

interface AbilityDamageData {
    playerId: string;
    x: number;
    y: number;
    facing: number;
    config: {
        hitboxType: string;
        hitboxParams: any;
        damage: number;
        archetype?: string;
    };
    abilityKey?: string;
    attackerId?: string; // ID of the player who initiated the attack
}

interface CacheStats {
    playerCache: any;
    monsterCache: any;
    deltaCompressionEnabled: boolean;
}

export class NetworkClient {
    private game: GameInterface;
    public socket: SocketIOClient;
    private connected: boolean = false;
    
    // Legacy collections - TODO: Consider removing if unused
    private players: Map<string, any> = new Map();
    private monsters: Map<string, any> = new Map();
    
    // DELTA COMPRESSION SYSTEM: Two-tier caching for bandwidth optimization
    private playerStateCache: StateCache;
    private monsterStateCache: StateCache;
    
    // Feature flag: Delta compression active (99%+ compression achieved)
    private ENABLE_DELTA_COMPRESSION: boolean = true;
    
    // Server world seed storage
    public serverWorldSeed?: number;
    
    // Store init data for delayed initialization
    private initData?: InitData;

    /**
     * Creates NetworkClient - the main client-server communication hub
     * 
     * ARCHITECTURE: Central network coordinator that:
     * - Establishes Socket.IO connection to server
     * - Manages two-tier caching system (players/monsters)
     * - Processes incoming state updates with delta compression
     * - Handles all multiplayer events (attacks, damage, deaths, etc.)
     * 
     * @param game - Main game instance for entity/system access
     */
    constructor(game: GameInterface) {
        this.game = game;
        this.socket = io();
        
        // Each StateCache tracks full state and applies delta merges
        this.playerStateCache = new StateCache();
        this.monsterStateCache = new StateCache();
        
        this.setupHandlers();
    }
    

    setClass(cls: CharacterClass): void {
        this.socket.emit('setClass', cls);
    }
    
    /**
     * Process stored init data after class selection
     */
    processStoredInitData(): void {
        if (this.initData && this.game.selectedClass) {
            this.game.initializeGameWorld(this.initData.world);
            this.initData.players.forEach(p => {
                if (p.id !== this.socket.id) this.game.addRemotePlayer(p);
            });
            this.initData.monsters.forEach(m => this.game.addOrUpdateMonster(m));
            
            // Clear stored data
            this.initData = undefined;
        }
    }
    
    /**
     * Get cache statistics for debugging
     */
    getCacheStats(): CacheStats {
        return {
            playerCache: this.playerStateCache.getStats(),
            monsterCache: this.monsterStateCache.getStats(),
            deltaCompressionEnabled: this.ENABLE_DELTA_COMPRESSION
        };
    }
    
    /**
     * Enable or disable delta compression for testing
     */
    setDeltaCompression(enabled: boolean): { deltaCompressionEnabled: boolean; message: string } {
        this.ENABLE_DELTA_COMPRESSION = enabled;
        console.log(`Delta compression ${enabled ? 'enabled' : 'disabled'} on client`);
        // Reset cache stats when toggling
        this.playerStateCache.resetStats();
        this.monsterStateCache.resetStats();
        
        return {
            deltaCompressionEnabled: this.ENABLE_DELTA_COMPRESSION,
            message: `Delta compression ${enabled ? 'enabled' : 'disabled'}`
        };
    }
    
    /**
     * Request full updates from server (recovery from desync)
     */
    requestFullUpdates(): { message: string; playerCacheSize: number; monsterCacheSize: number } {
        console.log('[NetworkClient] Requesting full updates from server...');
        this.playerStateCache.clear();
        this.monsterStateCache.clear();
        // The next updates from server will be full updates since we cleared cache
        
        return {
            message: 'Requested full updates - caches cleared',
            playerCacheSize: this.playerStateCache.size(),
            monsterCacheSize: this.monsterStateCache.size()
        };
    }
    
    sendCollisionMask(collisionMask: any): void {
        if (this.connected && collisionMask) {
            // Sending collision mask to server
            this.socket.emit('collisionMask', collisionMask.serialize());
        }
    }

    sendAttack(player: { position: Position; facing: number }, type: AttackType): void {
        const attackData: AttackData = {
            type,
            x: player.position.x,
            y: player.position.y,
            facing: player.facing
        };
        this.socket.emit('attack', attackData);
    }

    private setupHandlers(): void {
        this.socket.on('init', (data: InitData) => {
            this.socket.id = data.id;
            this.connected = true; // Mark as connected
            // Connected to server
            
            // Store server's world seed for world generation
            if (data.world && data.world.seed) {
                this.serverWorldSeed = data.world.seed;
                // Received world seed from server
            }
            
            // Apply server configuration to client
            if (data.config) {
                this.game.applyServerConfig(data.config);
            }
            
            // Store init data for later use
            this.initData = data;
            
            // Only initialize game world if we're past class selection
            if (this.game.selectedClass) {
                this.game.initializeGameWorld(data.world);
                data.players.forEach(p => {
                    if (p.id !== this.socket.id) this.game.addRemotePlayer(p);
                });
                data.monsters.forEach(m => this.game.addOrUpdateMonster(m));
            }
        });

        this.socket.on('playerJoined', (p: any) => {
            if (p.id !== this.socket.id) this.game.addRemotePlayer(p);
        });

        this.socket.on('playerLeft', (id: string) => {
            this.game.removeRemotePlayer(id);
            // Clean up cached state
            this.playerStateCache.remove(id);
        });

        /**
         * CORE STATE PROCESSING: Main data pipeline for entity updates
         * 
         * DELTA COMPRESSION FLOW:
         * 1. Server sends updates marked with _updateType: 'full' | 'delta'
         * 2. Full updates = complete entity state (first contact, new entity)
         * 3. Delta updates = only changed fields (position, hp, state, etc.)
         * 4. Client merges deltas with cached state before game processing
         * 
         * PERFORMANCE CRITICAL: This runs at 30 FPS with 99%+ deltas
         * - StateCache.applyDelta() merges partial updates efficiently
         * - processPlayerUpdate() handles client prediction reconciliation
         * - addOrUpdateMonster() updates game entity from merged state
         * 
         * BACKWARDS COMPATIBILITY: Handles both compressed and legacy updates
         */
        this.socket.on('state', (state: StateUpdate) => {
            // PLAYER PROCESSING: Handle both delta and full updates
            state.players.forEach(p => {
                if (this.ENABLE_DELTA_COMPRESSION && p._updateType) {
                    // DELTA COMPRESSION PATH: High-frequency, bandwidth-optimized
                    if (p._updateType === 'full') {
                        // Full update: Store complete state, process directly
                        this.playerStateCache.setFull(p.id, p);
                        this.processPlayerUpdate(p);
                    } else if (p._updateType === 'delta') {
                        // Delta update: Merge with cached state, then process
                        const mergedState = this.playerStateCache.applyDelta(p.id, p);
                        this.processPlayerUpdate(mergedState as PlayerStateUpdate);
                    }
                } else {
                    // LEGACY PATH: Full updates only (backwards compatibility)
                    this.playerStateCache.setFull(p.id, p);
                    this.processPlayerUpdate(p);
                }
            });
            
            // MONSTER PROCESSING: Same pattern as players
            state.monsters.forEach(m => {
                if (this.ENABLE_DELTA_COMPRESSION && m._updateType) {
                    if (m._updateType === 'full') {
                        this.monsterStateCache.setFull(m.id, m);
                        this.game.addOrUpdateMonster(m);
                    } else if (m._updateType === 'delta') {
                        // CRITICAL: Merged state must include 'state' field for monster AI
                        const mergedState = this.monsterStateCache.applyDelta(m.id, m);
                        this.game.addOrUpdateMonster(mergedState as MonsterStateUpdate);
                    }
                } else {
                    this.monsterStateCache.setFull(m.id, m);
                    this.game.addOrUpdateMonster(m);
                }
            });
            
            // Update projectiles
            if (state.projectiles && this.game.projectileRenderer) {
                state.projectiles.forEach(p => {
                    this.game.projectileRenderer.updateProjectile(p.id, p.x, p.y);
                });
            }
        });

        this.socket.on('playerAttack', (data: { id: string; type: AttackType; facing: number }) => {
            if (data.id !== this.socket.id) {
                // Convert facing number to string if needed
                this.game.remotePlayerAttack(data.id, data.type as string, data.facing.toString());
            }
        });

        // Monster events
        this.socket.on('monsterDamaged', (data: DamageEventData) => {
            const monster = this.game.remoteMonsters?.get(data.monsterId!);
            if (monster) {
                // Update HP but don't modify other state - server is authoritative
                monster.hitPoints = data.hp;
                monster.showDamageEffect?.();
                
                // Show damage number and action box message if we attacked it
                if (data.attacker === this.socket.id) {
                    this.game.showDamageNumber?.(monster.position, data.damage);
                    
                    // Add damage message to action box
                    if (this.game.actionBoxUI && data.damage > 0) {
                        const monsterName = monster.type || 'monster';
                        this.game.actionBoxUI.addDamageDealt(monsterName, data.damage);
                    }
                }
                
                // Don't change state client-side - the server will send the state update
                // The stunned state will come through the normal state update pipeline
                // This prevents client-server state desync
            }
        });

        this.socket.on('monsterKilled', (data: KillEventData) => {
            const monster = this.game.remoteMonsters?.get(data.monsterId!);
            if (monster) {
                monster.playDeathAnimation?.();
                // Clean up cached state after death animation
                setTimeout(() => {
                    this.monsterStateCache.remove(data.monsterId!);
                }, 1000);
                
                // Show XP gain if we killed it
                if (data.killedBy === this.socket.id) {
                    this.game.showXpGain?.(monster.position, data.xpReward!);
                    // Phase 3.2: Update local player XP and level from server authority
                    if (this.game.entities.player) {
                        this.game.entities.player.experience = data.killerXp!;
                        this.game.entities.player.level = data.killerLevel!;
                        // Stats component references player object - no separate update needed
                    }
                }
            }
        });

        this.socket.on('playerDamaged', (data: DamageEventData) => {
            if (data.playerId === this.socket.id) {
                // We took damage - sync HP and show damage effects
                if (this.game.entities.player) {
                    this.game.entities.player.hitPoints = data.hp;
                    (this.game.entities.player as any).armorHP = data.armorHP || 0;
                    
                    // Add damage taken message to action box
                    if (this.game.actionBoxUI && data.damage > 0 && data.source) {
                        let attackerName = 'Unknown';
                        if (data.source.type === 'player') {
                            attackerName = data.source.username || `Player ${data.source.id}`;
                        } else if (data.source.type === 'monster') {
                            attackerName = data.source.monsterType || 'a monster';
                        }
                        this.game.actionBoxUI.addDamageTaken(attackerName, data.damage);
                    }
                    
                    // Check if we died (same as monster damage)
                    if (data.hp <= 0 && !this.game.entities.player.isDying && !this.game.entities.player.isDead) {
                        this.game.entities.player.health.die();
                    } else if (data.hp > 0 && !this.game.entities.player.isDying && !this.game.entities.player.isDead) {
                        // Show damage effects without applying damage again
                        this.game.entities.player.isTakingDamage = true;
                        this.game.entities.player.damageStunTimer = this.game.entities.player.damageStunDuration;
                        this.game.entities.player.animation.playDamageAnimation();
                    }
                }
            } else {
                // Another player took damage
                const remotePlayer = this.game.remotePlayers?.get(data.playerId!);
                if (remotePlayer) {
                    remotePlayer.hitPoints = data.hp;
                    (remotePlayer as any).armorHP = data.armorHP || 0;
                    
                    // If we dealt the damage, add message
                    if (this.game.actionBoxUI && data.damage > 0 && data.source?.id === this.socket.id) {
                        const victimName = remotePlayer.username || `Player ${data.playerId}`;
                        this.game.actionBoxUI.addDamageDealt(victimName, data.damage);
                    }
                    
                    // Check if they died (same as monster damage)
                    if (data.hp <= 0 && !remotePlayer.isDying && !remotePlayer.isDead) {
                        remotePlayer.health?.die();
                    } else if (data.hp > 0) {
                        remotePlayer.showDamageEffect?.();
                    }
                }
            }
        });

        this.socket.on('playerKilled', (data: KillEventData) => {
            // Handle kill feed with usernames
            if (this.game.actionBoxUI) {
                if (data.killerId && data.victimId) {
                    // PvP kill - we'll receive usernames from server
                    const killerName = data.killerUsername || data.killerClass || 'Unknown';
                    const victimName = data.victimUsername || data.victimClass || 'Unknown';
                    const isLocalPlayerVictim = data.victimId === this.socket.id;
                    
                    if (isLocalPlayerVictim) {
                        // Local player was killed
                        this.game.actionBoxUI.addDeath(killerName);
                    } else {
                        // Another player was killed
                        this.game.actionBoxUI.addKill(killerName, victimName, true);
                    }
                } else if (data.playerId && data.killerType) {
                    // PvE death - monster killed player
                    const monsterName = data.killerType || 'a monster';
                    if (data.playerId === this.socket.id) {
                        this.game.actionBoxUI.addDeath(monsterName);
                    }
                }
            }
            
            // Death is now handled in playerDamaged when HP reaches 0
            // This matches how monster kills work
        });

        this.socket.on('playerLevelUp', (data: LevelUpData) => {
            // Add level up to action box only for local player
            if (this.game.actionBoxUI && data.playerId === this.socket.id) {
                this.game.actionBoxUI.addLevelUp('You', data.level);
            }
            
            if (data.playerId === this.socket.id) {
                // We leveled up
                // Level up!
                if (this.game.entities.player) {
                    const player = this.game.entities.player;
                    player.level = data.level;
                    player.hitPoints = data.hp;
                    
                    // Apply level bonuses from server
                    player.moveSpeedBonus = data.moveSpeedBonus || 0;
                    player.attackRecoveryBonus = data.attackRecoveryBonus || 0;
                    player.attackCooldownBonus = data.attackCooldownBonus || 0;
                    player.rollUnlocked = data.rollUnlocked || false;
                    
                    
                    // Update actual move speed
                    const baseSpeed = player.getClassMoveSpeed();
                    player.moveSpeed = baseSpeed + player.moveSpeedBonus;
                    
                    // Phase 3.2: Stats component references player object - no separate update needed
                    
                    // Update max HP from server (important for level 10 bonus)
                    if (data.maxHp !== undefined) {
                        player.maxHitPoints = data.maxHp;
                        player.hitPoints = data.hp; // Server sends full HP on level up
                        // Force health UI update
                        if (this.game.healthUI) {
                            this.game.healthUI.update();
                        }
                    }
                    
                    // Update StatsUI to reflect new bonuses
                    if (this.game.statsUI) {
                        this.game.statsUI.update();
                    }
                    
                    // Play level up effect
                    player.playLevelUpEffect?.();
                }
            }
        });

        this.socket.on('playerRespawned', (data: RespawnData) => {
            if (data.playerId === this.socket.id) {
                // We respawned - reset our XP and level
                // Player respawned
                if (this.game.entities.player) {
                    const player = this.game.entities.player;
                    player.level = data.level;
                    player.experience = data.xp;
                    player.hitPoints = data.hp;
                    
                    // Reset bonuses
                    player.moveSpeedBonus = data.moveSpeedBonus || 0;
                    player.attackRecoveryBonus = data.attackRecoveryBonus || 0;
                    player.attackCooldownBonus = data.attackCooldownBonus || 0;
                    player.rollUnlocked = data.rollUnlocked || false;
                    
                    // Reset max HP to base class HP (no level 10 bonus after respawn)
                    if (data.maxHp !== undefined) {
                        player.maxHitPoints = data.maxHp;
                    }
                    
                    // Reset move speed to base
                    const baseSpeed = player.getClassMoveSpeed();
                    player.moveSpeed = baseSpeed + player.moveSpeedBonus;
                    
                    // Phase 3.2: Stats component references player object - no separate update needed
                    
                    // Trigger respawn in the player component
                    player.health.respawn();
                    // Force health UI update after respawn
                    if (this.game.healthUI) {
                        this.game.healthUI.update();
                    }
                }
            }
        });
        
        // Handle disconnection
        this.socket.on('disconnect', () => {
            this.connected = false;
            
            // Show disconnect message
            if (this.game.actionBoxUI) {
                this.game.actionBoxUI.addDisconnect();
            }
            
            // Clear caches on disconnect
            this.playerStateCache.clear();
            this.monsterStateCache.clear();
            // Disconnected from server
        });
        
        // Handle connection errors
        this.socket.on('connect_error', (error: any) => {
            // Connection error
        });
        
        // Handle projectile events
        this.socket.on('projectileCreated', (data: any) => {
            if (this.game.projectileRenderer) {
                this.game.projectileRenderer.createProjectile(data);
            }
        });
        
        this.socket.on('projectileDestroyed', (data: { id: string; reason: string }) => {
            if (this.game.projectileRenderer) {
                this.game.projectileRenderer.destroyProjectile(data.id, data.reason);
            }
        });
        
        // Handle powerup events from server
        this.socket.on('powerupSpawned', (data: any) => {
            if (this.game.powerupRenderer) {
                this.game.powerupRenderer.onPowerupSpawned(data);
            }
        });
        
        this.socket.on('powerupPickedUp', (data: { powerupId: string; playerId: string; type: string }) => {
            if (this.game.powerupRenderer) {
                this.game.powerupRenderer.onPowerupPickedUp(data);
            }
        });
        
        this.socket.on('powerupRemoved', (data: { powerupId: string }) => {
            if (this.game.powerupRenderer) {
                this.game.powerupRenderer.onPowerupRemoved(data);
            }
        });
        
        // Handle powerup effect events
        this.socket.on('playerArmorGained', (data: { playerId: string; armorAmount: number; totalArmor: number }) => {
            if (data.playerId === this.socket.id && this.game.entities.player) {
                (this.game.entities.player as any).armorHP = data.totalArmor;
                console.log('[NetworkClient] Player gained armor HP:', data.armorAmount, 'Total:', data.totalArmor);
            }
        });
        
        // Handle monster attack telegraphs
        this.socket.on('monsterTelegraph', (data: {
            monsterId: string;
            monsterType: string;
            attackType: string;
            telegraphType: string;
            x: number;
            y: number;
            facing: number;
            config: any;
            duration: number;
        }) => {
            console.log('[NetworkClient] Received monster telegraph:', data);
            
            if (this.game.telegraphRenderer && data.telegraphType) {
                // Get the shape info from attack config
                let shape: any;
                
                if (data.config.hitboxType === 'rectangle') {
                    shape = {
                        shape: 'rectangle',
                        width: data.config.hitboxParams.width,
                        length: data.config.hitboxParams.length
                    };
                } else if (data.config.hitboxType === 'cone') {
                    shape = {
                        shape: 'cone',
                        range: data.config.hitboxParams.range,
                        angle: data.config.hitboxParams.angle
                    };
                } else if (data.config.hitboxType === 'circle') {
                    shape = {
                        shape: 'circle',
                        radius: data.config.hitboxParams.radius
                    };
                }
                
                if (shape) {
                    // Get default config for the telegraph type
                    const telegraphConfig = (AttackTelegraphRenderer as any).getDefaultConfig(data.telegraphType);
                    telegraphConfig.duration = data.duration;
                    
                    // Create the telegraph
                    this.game.telegraphRenderer.createTelegraph(
                        data.monsterId,
                        data.x,
                        data.y,
                        data.facing,
                        shape,
                        telegraphConfig
                    );
                }
            }
        });
        
        // Handle telegraph position updates (for moving attacks)
        this.socket.on('updateTelegraph', (data: { monsterId: string; x: number; y: number }) => {
            if (this.game.telegraphRenderer) {
                this.game.telegraphRenderer.updateTelegraphPosition(data.monsterId, data.x, data.y);
            }
        });
        
        // Handle server-triggered effects (like WingedDemon warning/damage)
        this.socket.on('effect', (data: { type: string; x: number; y: number; duration: number }) => {
            console.log('[NetworkClient] Received effect event:', data);
            if (this.game.systems?.combat) {
                // Create effect at specified position
                const effect = this.game.systems.combat.createEffect(
                    data.type,
                    { x: data.x, y: data.y },
                    'down', // default facing for ground effects
                    null,
                    true // useRawPosition
                );
                
                // TEMPORARY: Add debug circles for WingedDemon AOE visualization
                if (data.type === 'wingeddemon_warning_effect' || data.type === 'wingeddemon_damage_effect') {
                    console.log('[NetworkClient] Creating debug circle for:', data.type, 'at', data.x, data.y);
                    const graphics = new PIXI.Graphics();
                    const radius = 50; // AOE radius from attack config
                    
                    if (data.type === 'wingeddemon_warning_effect') {
                        // White circle for warning
                        graphics.lineStyle(4, 0xFFFFFF, 1.0); // Thicker line, full opacity
                        graphics.beginFill(0xFFFFFF, 0.1); // Add slight fill
                        graphics.drawCircle(0, 0, radius);
                        graphics.endFill();
                    } else {
                        // Red circle for damage
                        graphics.lineStyle(4, 0xFF0000, 1.0); // Thicker line, full opacity
                        graphics.beginFill(0xFF0000, 0.2); // Add slight fill
                        graphics.drawCircle(0, 0, radius);
                        graphics.endFill();
                    }
                    
                    // Set position
                    graphics.position.set(data.x, data.y);
                    
                    // Add to entity container (should be visible on top of world)
                    this.game.entityContainer.addChild(graphics);
                    console.log('[NetworkClient] Debug circle added to entityContainer at z-index:', this.game.entityContainer.children.length);
                    
                    // Remove debug circle when effect expires
                    setTimeout(() => {
                        if (graphics.parent) {
                            graphics.parent.removeChild(graphics);
                            console.log('[NetworkClient] Debug circle removed');
                        }
                    }, data.duration || 1000);
                }
                
                // If duration is specified, remove effect after duration
                if (effect && data.duration) {
                    setTimeout(() => {
                        if (effect.parent) {
                            effect.parent.removeChild(effect);
                        }
                    }, data.duration);
                }
            }
        });
        
        this.socket.on('playerHealed', (data: { playerId: string; healAmount: number; newHP: number; maxHP: number }) => {
            if (data.playerId === this.socket.id && this.game.entities.player) {
                this.game.entities.player.hitPoints = data.newHP;
                console.log('[NetworkClient] Player healed:', data.healAmount, 'New HP:', data.newHP);
            }
        });
        
        this.socket.on('playerSpeedGained', (data: { playerId: string; speedBonus: number; duration: number; totalSpeedBonus: number }) => {
            if (data.playerId === this.socket.id && this.game.entities.player) {
                (this.game.entities.player as any).moveSpeedBonus = data.totalSpeedBonus;
                (this.game.entities.player as any).speedBoostActive = true;
                console.log('[NetworkClient] Player gained speed boost:', data.speedBonus, 'Duration:', data.duration, 'Total bonus:', data.totalSpeedBonus);
            }
        });
        
        this.socket.on('playerSpeedLost', (data: { playerId: string; speedBonus: number; totalSpeedBonus: number }) => {
            if (data.playerId === this.socket.id && this.game.entities.player) {
                (this.game.entities.player as any).moveSpeedBonus = data.totalSpeedBonus;
                (this.game.entities.player as any).speedBoostActive = false;
                console.log('[NetworkClient] Player lost speed boost:', data.speedBonus, 'Remaining bonus:', data.totalSpeedBonus);
            }
        });
        
        this.socket.on('playerDamageGained', (data: { playerId: string; damageBonus: number; duration: number; totalDamageBonus: number }) => {
            if (data.playerId === this.socket.id && this.game.entities.player) {
                (this.game.entities.player as any).damageBonus = data.totalDamageBonus;
                (this.game.entities.player as any).damageBoostActive = true;
                console.log('[NetworkClient] Player gained damage boost:', data.damageBonus, 'Duration:', data.duration, 'Total bonus:', data.totalDamageBonus);
            }
        });
        
        this.socket.on('playerDamageLost', (data: { playerId: string; damageBonus: number; totalDamageBonus: number }) => {
            if (data.playerId === this.socket.id && this.game.entities.player) {
                (this.game.entities.player as any).damageBonus = data.totalDamageBonus;
                (this.game.entities.player as any).damageBoostActive = false;
                console.log('[NetworkClient] Player lost damage boost:', data.damageBonus, 'Remaining bonus:', data.totalDamageBonus);
            }
        });
        
        this.socket.on('playerInvulnerabilityGained', (data: { playerId: string; duration: number }) => {
            if (data.playerId === this.socket.id && this.game.entities.player) {
                (this.game.entities.player as any).invulnerable = true;
                (this.game.entities.player as any).invulnerabilityActive = true;
                console.log('[NetworkClient] Player gained invulnerability for:', data.duration, 'ms');
            }
        });
        
        this.socket.on('playerInvulnerabilityLost', (data: { playerId: string }) => {
            if (data.playerId === this.socket.id && this.game.entities.player) {
                (this.game.entities.player as any).invulnerable = false;
                (this.game.entities.player as any).invulnerabilityActive = false;
                console.log('[NetworkClient] Player lost invulnerability');
            }
        });
        
        // Handle ability events from server
        this.socket.on('playerAbilityStart', (data: AbilityEventData) => {
            // Handle movement abilities that need visual updates
            if (data.type === 'dash' || data.type === 'jump') {
                const isLocalPlayer = data.playerId === this.socket.id;
                const player = isLocalPlayer ? 
                    this.game.entities.player : 
                    this.game.remotePlayers?.get(data.playerId);
                    
                if (player) {
                    // The server controls the movement, we just need to handle visual effects
                    // and animation state
                    player.isAttacking = true;
                    player.currentAttackType = data.abilityKey;
                    
                    // Store the start position for effects
                    player.startPositionForAttack = { x: data.startX!, y: data.startY! };
                    
                    // For jump attacks, we don't need visual height changes in a 2D game
                    // The server handles all movement, we just need to track the ability state
                    if (data.type === 'jump' && player.sprite) {
                        // Store the jump data for ability tracking only
                        player.jumpData = {
                            startX: data.startX!,
                            startY: data.startY!,
                            endX: data.endX!,
                            endY: data.endY!,
                            startTime: Date.now(),
                            duration: data.duration!,
                            backwardJump: data.backwardJump!
                        };
                        
                        // No visual height animation - this is a 2D game
                        // The sprite position will be updated by normal position syncing
                    }
                }
            }
        });
        
        this.socket.on('playerAbilityComplete', (data: { playerId: string }) => {
            const isLocalPlayer = data.playerId === this.socket.id;
            const player = isLocalPlayer ? 
                this.game.entities.player : 
                this.game.remotePlayers?.get(data.playerId);
                
            if (player) {
                // Clear ability state
                if (player.jumpData) {
                    delete player.jumpData;
                }
                
                // End the attack state if needed
                if (player.combat && player.isAttacking) {
                    player.combat.endAttack();
                }
            }
        });
        
        // Handle ability damage events from server
        this.socket.on('playerAbilityDamage', (data: AbilityDamageData) => {
            const isLocalPlayer = data.playerId === this.socket.id;
            const player = isLocalPlayer ? 
                this.game.entities.player : 
                this.game.remotePlayers?.get(data.playerId);
                
            if (player && this.game.systems?.combat) {
                // Create hitbox and apply damage
                const hitbox = this.game.systems.combat.createHitbox(
                    { x: data.x, y: data.y },
                    data.facing,
                    data.config.hitboxType,
                    data.config.hitboxParams,
                    { 
                        color: 0xFF0000, 
                        fillAlpha: 0.0, 
                        lineAlpha: 0.0, 
                        lineWidth: 3, 
                        duration: 0.2 
                    }
                );
                
                if (hitbox) {
                    // Server is authoritative for ALL damage calculations
                    // Apply damage for all attacks from all players
                    this.game.systems.combat.applyHitEffects(player, hitbox, data.config.damage || 0);
                    
                    // Draw the hitbox for visual feedback
                    const graphics = hitbox.draw();
                    this.game.entityContainer.addChild(graphics);
                }
            }
        });
    }

    sendMonsterDamage(monsterId: string, damage: number, attackType: AttackType): void {
        if (this.socket && this.socket.connected) {
            // Phase 3.1: Damage removed - server calculates damage based on attack type
            const message = {
                monsterId,
                attackType,
                timestamp: Date.now(),
                position: {
                    x: Math.round(this.game.entities.player.position.x),
                    y: Math.round(this.game.entities.player.position.y)
                }
            };
            this.socket.emit('attackMonster', message);
        }
    }

    sendPlayerUpdate(player: { position: Position; facing: number }): void {
        this.socket.emit('playerUpdate', {
            x: player.position.x,
            y: player.position.y,
            facing: player.facing
        });
    }
    
    /**
     * Send input command to server for client-side prediction
     */
    sendPlayerInput(inputCommand: InputCommand): void {
        if (!this.connected) {
            // Cannot send input - not connected
            return;
        }
        
        this.socket.emit('playerInput', inputCommand);
    }
    
    createProjectile(data: ProjectileData): void {
        if (!this.connected) {
            // Cannot create projectile - not connected
            return;
        }
        
        // Phase 3.1: Damage removed - server calculates projectile damage
        this.socket.emit('createProjectile', {
            x: data.x,
            y: data.y,
            angle: data.angle,
            speed: data.speed,
            range: data.range,
            effectType: data.effectType
        });
    }
    
    sendAbilityRequest(abilityType: string, extraData: Record<string, any> = {}): void {
        if (!this.connected) {
            // Cannot send ability request - not connected
            return;
        }
        
        // Sending ability request to server
        this.socket.emit('executeAbility', {
            abilityType: abilityType,
            ...extraData
        });
    }
    
    // Jitter buffer methods removed - feature disabled for better performance
    
    /**
     * Process a single player state update (extracted from original state handler)
     */
    processPlayerUpdate(playerState: PlayerStateUpdate): void {
        if (playerState.id === this.socket.id) {
            // PHASE 3: Use reconciler for server state updates
            if (this.game.entities.player && this.game.systems?.reconciler) {
                const player = this.game.entities.player;
                
                // Perform reconciliation if we have sequence number
                if (playerState.lastProcessedSeq !== undefined) {
                    const reconciled = this.game.systems!.reconciler.reconcile(playerState, player);
                    // Position reconciled by server
                } else {
                    // Server state missing lastProcessedSeq - using fallback
                    // Fallback to direct position update if no sequence
                    player.position.x = playerState.x;
                    player.position.y = playerState.y;
                    player.sprite.position.set(playerState.x, playerState.y);
                }
                
                // Update server position tracking
                if (!player.serverPosition) {
                    player.serverPosition = { x: playerState.x, y: playerState.y };
                } else {
                    player.serverPosition.x = playerState.x;
                    player.serverPosition.y = playerState.y;
                }
                
                // Sync non-position data from server
                player.facing = playerState.facing || player.facing;
                player.hitPoints = playerState.hp;
                player.level = playerState.level || player.level;
                player.experience = playerState.xp || player.experience;
                
                // Sync bonuses from server if they're included
                if (playerState.moveSpeedBonus !== undefined) {
                    player.moveSpeedBonus = playerState.moveSpeedBonus;
                    player.attackRecoveryBonus = playerState.attackRecoveryBonus || 0;
                    player.attackCooldownBonus = playerState.attackCooldownBonus || 0;
                    player.rollUnlocked = playerState.rollUnlocked || false;
                    // Update move speed if it changed
                    const baseSpeed = player.getClassMoveSpeed();
                    player.moveSpeed = baseSpeed + player.moveSpeedBonus;
                }
                
                // Also sync max HP if it changed
                if (playerState.maxHp !== undefined && player.maxHitPoints !== playerState.maxHp) {
                    player.maxHitPoints = playerState.maxHp;
                    if (this.game.healthUI) {
                        this.game.healthUI.update();
                    }
                }
            }
        } else {
            this.game.updateRemotePlayer(playerState);
        }
    }
    
    // processStateUpdate method removed - now handled directly in state handler
}