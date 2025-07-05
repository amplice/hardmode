import { getDistance } from '../../shared/utils/MathUtils.js';
import { MONSTER_STATS } from '../../shared/constants/GameConstants.js';
import type { 
    PlayerState, 
    MonsterState,
    Position,
    ProjectileState
} from '../../shared/types/GameTypes.js';

// Extended player state that includes legacy x, y fields for compatibility
interface ServerPlayerState extends PlayerState {
    x: number;
    y: number;
    class?: string; // Legacy field name for backward compatibility
    xp?: number;
    kills?: number;
}

// Extended monster state with server-specific fields
interface ServerMonsterState extends MonsterState {
    target: ServerPlayerState | null;
    lastAttack: number;
    attackAnimationStarted: number;
    isAttackAnimating: boolean;
    velocity: Position;
    spawnTime: number;
    lastUpdate: number;
    collisionRadius: number;
    stunTimer: number;
    isStunned: boolean;
    lodSkipCounter?: number;
}

// Extended projectile state with server-specific fields
interface ServerProjectileState extends ProjectileState {
    ownerId: string;
    ownerType: string; // Player class or monster type
    x: number;
    y: number;
    startX: number;
    startY: number;
    angle: number;
    velocity: Position;
    maxRange: number;
    effectType: string;
    active: boolean;
    createdAt: number;
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
    public projectiles: Map<string, ServerProjectileState>;
    private nextProjectileId: number;
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

    constructor(io: SocketIO) {
        this.io = io;
        this.projectiles = new Map();
        this.nextProjectileId = 1;
    }

    createProjectile(owner: ProjectileOwner, data: ProjectileData): ServerProjectileState {
        const id = String(this.nextProjectileId++);
        
        const projectile: ServerProjectileState = {
            id,
            ownerId: owner.id,
            ownerType: owner.class || owner.type || 'player', // Player class or monster type
            x: data.x,
            y: data.y,
            startX: data.x,
            startY: data.y,
            angle: data.angle,
            speed: data.speed || 700,
            damage: data.damage || 1,
            maxRange: data.range || 600,
            effectType: data.effectType || 'bow_shot_effect',
            velocity: {
                x: Math.cos(data.angle) * (data.speed || 700),
                y: Math.sin(data.angle) * (data.speed || 700)
            },
            active: true,
            createdAt: Date.now(),
            // ProjectileState interface compatibility
            position: { x: data.x, y: data.y },
            target: { x: data.x + Math.cos(data.angle) * (data.range || 600), y: data.y + Math.sin(data.angle) * (data.range || 600) },
            type: data.effectType || 'bow_shot_effect'
        };
        
        this.projectiles.set(id, projectile);
        
        // Notify all clients about new projectile
        this.io.emit('projectileCreated', {
            id: projectile.id,
            ownerId: projectile.ownerId,
            ownerType: projectile.ownerType,
            x: projectile.x,
            y: projectile.y,
            angle: projectile.angle,
            speed: projectile.speed,
            effectType: projectile.effectType
        });
        
        return projectile;
    }

    update(deltaTime: number, players: Map<string, PlayerState>, monsters: Map<string, ServerMonsterState>): void {
        const projectilesToRemove: string[] = [];
        
        this.projectiles.forEach((projectile, id) => {
            if (!projectile.active) {
                projectilesToRemove.push(id);
                return;
            }
            
            // Update position
            projectile.x += projectile.velocity.x * deltaTime;
            projectile.y += projectile.velocity.y * deltaTime;
            
            // Update position interface for compatibility
            projectile.position.x = projectile.x;
            projectile.position.y = projectile.y;
            
            // Check distance traveled
            const distanceTraveled = getDistance(
                { x: projectile.startX, y: projectile.startY },
                { x: projectile.x, y: projectile.y }
            );
            
            if (distanceTraveled >= projectile.maxRange) {
                this.destroyProjectile(id, 'maxRange');
                return;
            }
            
            // Check collisions based on owner type
            // Player classes (hunter, guardian, etc.) should hit monsters
            const isPlayerProjectile = projectile.ownerType !== 'skeleton' && 
                                     projectile.ownerType !== 'elemental' && 
                                     projectile.ownerType !== 'ghoul' && 
                                     projectile.ownerType !== 'ogre' && 
                                     projectile.ownerType !== 'wildarcher';
            
            if (isPlayerProjectile) {
                // Player projectiles hit monsters
                let hitDetected = false;
                monsters.forEach((monster, monsterId) => {
                    if (hitDetected || monster.hp <= 0) return;
                    
                    const distance = getDistance(projectile, monster);
                    const hitRadius = monster.collisionRadius || 20;
                    
                    if (distance <= hitRadius) {
                        this.handleProjectileHit(projectile, monster, 'monster', players, monsters);
                        projectilesToRemove.push(id);
                        hitDetected = true;
                    }
                });
            } else {
                // Monster projectiles hit players
                let hitDetected = false;
                players.forEach((player, playerId) => {
                    if (hitDetected || player.hp <= 0 || playerId === projectile.ownerId) return;
                    
                    const playerCoords = this.playerToCoords(player);
                    const distance = getDistance(projectile, playerCoords);
                    const hitRadius = 20; // Player collision radius
                    
                    if (distance <= hitRadius) {
                        this.handleProjectileHit(projectile, player, 'player', players, monsters);
                        projectilesToRemove.push(id);
                        hitDetected = true;
                    }
                });
            }
        });
        
        // Remove inactive projectiles
        for (const id of projectilesToRemove) {
            this.projectiles.delete(id);
        }
    }

    handleProjectileHit(
        projectile: ServerProjectileState, 
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
                    this.damageProcessor.applyDamage(
                        owner,
                        target,
                        projectile.damage,
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
                // For monster projectiles, the source is the projectile itself
                // We'll pass the projectile with ownerType info
                const projectileSource = {
                    ...projectile,
                    type: 'projectile',
                    id: projectile.ownerType // For proper source identification
                };
                
                this.damageProcessor.applyDamage(
                    projectileSource,
                    target,
                    projectile.damage,
                    'projectile',
                    { 
                        attackType: 'monster_projectile',
                        projectileId: projectile.id 
                    }
                );
            }
        }
        
        this.destroyProjectile(projectile.id, 'hit');
    }

    destroyProjectile(id: string, reason: string): void {
        const projectile = this.projectiles.get(id);
        if (!projectile) return;
        
        projectile.active = false;
        
        // Notify all clients
        this.io.emit('projectileDestroyed', {
            id,
            reason,
            x: projectile.x,
            y: projectile.y
        });
    }

    getSerializedProjectiles(): any[] {
        return Array.from(this.projectiles.values())
            .filter(p => p.active)
            .map(p => ({
                id: p.id,
                ownerId: p.ownerId,
                x: Math.round(p.x),
                y: Math.round(p.y),
                angle: p.angle
            }));
    }

    // Clean up old projectiles
    cleanup(): void {
        const now = Date.now();
        const maxAge = 10000; // 10 seconds max lifetime
        
        this.projectiles.forEach((projectile, id) => {
            if (now - projectile.createdAt > maxAge) {
                this.destroyProjectile(id, 'timeout');
            }
        });
    }
}