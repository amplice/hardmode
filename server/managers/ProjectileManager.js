import { getDistance } from '../../shared/utils/MathUtils.js';
import { MONSTER_STATS } from '../../shared/constants/GameConstants.js';

export class ProjectileManager {
    constructor(io) {
        this.io = io;
        this.projectiles = new Map();
        this.nextProjectileId = 1;
    }

    createProjectile(owner, data) {
        const id = this.nextProjectileId++;
        
        // Creating projectile from owner
        
        const projectile = {
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
            createdAt: Date.now()
        };
        
        // Projectile created
        
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
        
        // Projectile created
        return projectile;
    }

    update(deltaTime, players, monsters) {
        const projectilesToRemove = [];
        
        // Update projectiles
        
        for (const [id, projectile] of this.projectiles) {
            if (!projectile.active) {
                projectilesToRemove.push(id);
                continue;
            }
            
            // Update position
            projectile.x += projectile.velocity.x * deltaTime;
            projectile.y += projectile.velocity.y * deltaTime;
            
            // Check distance traveled
            const distanceTraveled = getDistance(
                { x: projectile.startX, y: projectile.startY },
                { x: projectile.x, y: projectile.y }
            );
            
            if (distanceTraveled >= projectile.maxRange) {
                this.destroyProjectile(id, 'maxRange');
                continue;
            }
            
            // Check collisions based on owner type
            // Player classes (hunter, guardian, etc.) should hit monsters
            const isPlayerProjectile = projectile.ownerType !== 'skeleton' && 
                                     projectile.ownerType !== 'elemental' && 
                                     projectile.ownerType !== 'ghoul' && 
                                     projectile.ownerType !== 'ogre' && 
                                     projectile.ownerType !== 'wildarcher';
            
            // Check projectile type
            
            if (isPlayerProjectile) {
                // Player projectiles hit monsters
                // Check collision with monsters
                
                for (const [monsterId, monster] of monsters) {
                    if (monster.hp <= 0) continue;
                    
                    const distance = getDistance(projectile, monster);
                    const hitRadius = monster.collisionRadius || 20;
                    
                    // Check distance to monster
                    
                    if (distance <= hitRadius) {
                        // Hit detected
                        // Hit detected
                        this.handleProjectileHit(projectile, monster, 'monster', players, monsters);
                        projectilesToRemove.push(id);
                        break;
                    }
                }
            } else {
                // Monster projectiles hit players
                // Check collision with players
                
                for (const [playerId, player] of players) {
                    if (player.hp <= 0 || playerId === projectile.ownerId) continue;
                    
                    const distance = getDistance(projectile, player);
                    const hitRadius = 20; // Player collision radius
                    
                    if (distance <= hitRadius) {
                        // Hit detected
                        // Hit detected
                        this.handleProjectileHit(projectile, player, 'player', players, monsters);
                        projectilesToRemove.push(id);
                        break;
                    }
                }
            }
        }
        
        // Remove inactive projectiles
        for (const id of projectilesToRemove) {
            this.projectiles.delete(id);
        }
    }

    handleProjectileHit(projectile, target, targetType, players, monsters) {
        // Projectile hit target
        
        if (targetType === 'monster') {
            // Apply damage to monster
            const monsterManager = this.io.monsterManager; // Assume this is passed in
            // Apply damage to monster
            if (monsterManager) {
                const owner = players.get(projectile.ownerId);
                if (owner) {
                    monsterManager.handleMonsterDamage(target.id, projectile.damage, owner);
                }
            }
        } else if (targetType === 'player') {
            // Apply damage to player
            if (!target.invulnerable) {
                target.hp = Math.max(0, target.hp - projectile.damage);
                
                // Get monster type for kill message
                const monsterType = projectile.ownerType;
                
                // Player hit by projectile
                
                // Notify clients
                this.io.emit('playerDamaged', {
                    playerId: target.id,
                    damage: projectile.damage,
                    hp: target.hp,
                    source: `${monsterType}_projectile`
                });
                
                if (target.hp <= 0) {
                    // Player killed by projectile
                    this.io.emit('playerKilled', {
                        playerId: target.id,
                        killedBy: monsterType
                    });
                }
            }
        }
        
        this.destroyProjectile(projectile.id, 'hit');
    }

    destroyProjectile(id, reason) {
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

    getSerializedProjectiles() {
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
    cleanup() {
        const now = Date.now();
        const maxAge = 10000; // 10 seconds max lifetime
        
        for (const [id, projectile] of this.projectiles) {
            if (now - projectile.createdAt > maxAge) {
                this.destroyProjectile(id, 'timeout');
            }
        }
    }
}