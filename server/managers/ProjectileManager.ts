import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';
import { Projectile, type ProjectileConfig, type ProjectileTarget } from '../entities/Projectile.js';
import type { PlayerState, Position } from '../../shared/types/GameTypes.js';
import type { MonsterManager, ServerMonsterState } from './MonsterManager.js';

// Extended player state that includes legacy x, y fields for compatibility
interface ServerPlayerState extends PlayerState {
    x: number;
    y: number;
    class?: string; // Legacy field name for backward compatibility
    xp?: number;
    kills?: number;
}

interface SocketIO {
    emit(event: string, data: any): void;
    projectileManager?: any;
    gameState?: any;
}

interface DamageProcessor {
    applyDamage(source: any, target: any, damage: number, damageType: string, metadata?: any): any;
}

interface ProjectileOwner {
    id: string;
    class?: string;  // For players
    type?: string;   // For monsters
}

interface ProjectileData {
    x: number;
    y: number;
    angle: number;
    speed?: number;
    damage?: number;
    range?: number;
    effectType?: string;
}

export class ProjectileManager {
    private io: SocketIO;
    public projectiles: Map<string, Projectile>;
    private nextProjectileId: number;
    public damageProcessor?: DamageProcessor;
    private removalBuffer: string[];
    private readonly monsterCollisionQueryRadius: number;
    private nearbyMonstersScratch: ServerMonsterState[];

    // Helper function to convert PlayerState to coordinate format
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

    constructor(io: SocketIO) {
        this.io = io;
        this.projectiles = new Map();
        this.nextProjectileId = 1;
        this.removalBuffer = [];
        this.monsterCollisionQueryRadius = 160; // Pixels; comfortably covers largest monster + tick travel distance
        this.nearbyMonstersScratch = [];
    }

    createProjectile(owner: ProjectileOwner, data: ProjectileData): Projectile {
        const id = String(this.nextProjectileId++);
        
        // Phase 6.1: Create projectile using class-based approach
        const config: ProjectileConfig = {
            id,
            ownerId: owner.id,
            ownerType: owner.class || owner.type || 'player',
            startPosition: { x: data.x, y: data.y },
            angle: data.angle,
            speed: data.speed,
            damage: data.damage,
            range: data.range,
            effectType: data.effectType
        };
        
        const projectile = new Projectile(config);
        this.projectiles.set(id, projectile);
        
        // Notify all clients about new projectile
        this.io.emit('projectileCreated', projectile.getCreationData());
        
        return projectile;
    }

    update(deltaTime: number, players: Map<string, PlayerState>, monsterManager: MonsterManager): void {
        const projectilesToRemove = this.removalBuffer;
        projectilesToRemove.length = 0;

        const monsters = monsterManager.monsters;
        const nearbyScratch = this.nearbyMonstersScratch;
        const queryRadius = this.monsterCollisionQueryRadius;

        // Phase 6.1: Use class-based update and collision detection
        this.projectiles.forEach((projectile, id) => {
            // Update projectile position and check range
            const stillActive = projectile.update(deltaTime);

            if (!stillActive) {
                projectilesToRemove.push(id);
                this.destroyProjectile(id, 'maxRange');
                return;
            }

            let projectileRemoved = false;

            if (projectile.shouldHitMonsters()) {
                const projectilePosition = projectile.getPosition();
                const nearbyMonsters = monsterManager.collectMonstersWithinRadius(
                    projectilePosition.x,
                    projectilePosition.y,
                    queryRadius,
                    nearbyScratch
                );

                for (const monster of nearbyMonsters) {
                    const target: ProjectileTarget = {
                        id: monster.id,
                        position: { x: monster.x, y: monster.y },
                        hp: monster.hp,
                        collisionRadius: monster.collisionRadius
                    };

                    if (projectile.checkCollision(target).hit) {
                        this.handleProjectileHit(projectile, monster, 'monster', players, monsters);
                        projectilesToRemove.push(id);
                        projectileRemoved = true;
                        break; // Stop checking after first hit
                    }
                }

                if (!projectileRemoved && GAME_CONSTANTS.PVP.ENABLED) {
                    for (const [playerId, player] of players) {
                        if (playerId === projectile.ownerId) {
                            continue;
                        }

                        const playerCoords = this.playerToCoords(player);
                        const target: ProjectileTarget = {
                            id: playerId,
                            position: playerCoords,
                            hp: player.hp,
                            collisionRadius: GAME_CONSTANTS.PLAYER.COLLISION_RADIUS
                        };

                        if (projectile.checkCollision(target).hit) {
                            this.handleProjectileHit(projectile, player, 'player', players, monsters);
                            projectilesToRemove.push(id);
                            projectileRemoved = true;
                            break; // Stop checking after first hit
                        }
                    }
                }
            } else {
                // Monster projectiles hit players
                for (const [playerId, player] of players) {
                    const playerCoords = this.playerToCoords(player);
                    const target: ProjectileTarget = {
                        id: playerId,
                        position: playerCoords,
                        hp: player.hp,
                        collisionRadius: GAME_CONSTANTS.PLAYER.COLLISION_RADIUS
                    };

                    if (projectile.checkCollision(target).hit) {
                        this.handleProjectileHit(projectile, player, 'player', players, monsters);
                        projectilesToRemove.push(id);
                        projectileRemoved = true;
                        break; // Stop checking after first hit
                    }
                }
            }

            if (projectileRemoved) {
                return;
            }
        });

        // Remove inactive projectiles
        for (const id of projectilesToRemove) {
            this.projectiles.delete(id);
        }
        projectilesToRemove.length = 0;
    }

    handleProjectileHit(
        projectile: Projectile, 
        target: PlayerState | ServerMonsterState, 
        targetType: 'player' | 'monster', 
        players: Map<string, PlayerState>, 
        monsters: Map<string, ServerMonsterState>
    ): void {
        if (targetType === 'monster') {
            // Apply damage to monster using DamageProcessor
            if (this.damageProcessor) {
                const owner = players.get(projectile.ownerId);
                if (owner) {
                    const projectileData = projectile.serialize();
                    this.damageProcessor.applyDamage(
                        owner,
                        target,
                        projectileData.damage,
                        'projectile',
                        { 
                            attackType: 'player_projectile',
                            projectileId: projectile.id 
                        }
                    );
                }
            }
        } else if (targetType === 'player') {
            // Apply damage to player using DamageProcessor
            if (this.damageProcessor) {
                const projectileData = projectile.serialize();
                
                // Check if this is a player projectile (PvP) or monster projectile
                if (projectile.shouldHitMonsters()) {
                    // Player projectile hitting another player (PvP)
                    const owner = players.get(projectile.ownerId);
                    if (owner && GAME_CONSTANTS.PVP.ENABLED) {
                        this.damageProcessor.applyDamage(
                            owner,
                            target,
                            projectileData.damage,
                            'projectile',
                            { 
                                attackType: 'player_projectile_pvp',
                                projectileId: projectile.id 
                            }
                        );
                    }
                } else {
                    // Monster projectile hitting a player
                    // Try to find the monster owner
                    const monsterOwner = monsters.get(projectile.ownerId);
                    if (monsterOwner) {
                        // Pass the monster as the source
                        this.damageProcessor.applyDamage(
                            monsterOwner,
                            target,
                            projectileData.damage,
                            'projectile',
                            { 
                                attackType: 'monster_projectile',
                                projectileId: projectile.id 
                            }
                        );
                    } else {
                        // Fallback if monster not found - pass projectile data
                        const projectileSource = {
                            ...projectileData,
                            type: 'projectile',
                            id: projectileData.id
                        };
                        
                        this.damageProcessor.applyDamage(
                            projectileSource,
                            target,
                            projectileData.damage,
                            'projectile',
                            { 
                                attackType: 'monster_projectile',
                                projectileId: projectile.id 
                            }
                        );
                    }
                }
            }
        }
        
        this.destroyProjectile(projectile.id, 'hit');
    }

    destroyProjectile(id: string, reason: string): void {
        const projectile = this.projectiles.get(id);
        if (!projectile) return;
        
        projectile.deactivate();
        
        // Notify all clients
        const position = projectile.getPosition();
        this.io.emit('projectileDestroyed', {
            id,
            reason,
            x: position.x,
            y: position.y
        });
    }

    getSerializedProjectiles(): any[] {
        return Array.from(this.projectiles.values())
            .filter(p => p.isActive())
            .map(p => {
                const data = p.serialize();
                return {
                    id: data.id,
                    ownerId: data.ownerId,
                    x: Math.round(data.x),
                    y: Math.round(data.y),
                    angle: data.angle
                };
            });
    }

    // Clean up old projectiles
    cleanup(): void {
        const now = Date.now();
        const maxAge = 10000; // 10 seconds max lifetime
        
        this.projectiles.forEach((projectile, id) => {
            // Clean up inactive projectiles
            if (!projectile.isActive()) {
                this.projectiles.delete(id);
            }
        });
    }
}
