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
        
        // DEBUG: Log owner information
        console.log(`[DEBUG] Creating projectile - Owner info:`, {
            id: owner.id,
            class: owner.class,
            type: owner.type,
            hasClass: !!owner.class,
            hasType: !!owner.type
        });
        
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
        
        // DEBUG: Log projectile details
        console.log(`[DEBUG] Projectile ${id} created:`, {
            ownerId: projectile.ownerId,
            ownerType: projectile.ownerType,
            position: { x: Math.round(projectile.x), y: Math.round(projectile.y) },
            angle: projectile.angle.toFixed(2),
            damage: projectile.damage,
            speed: projectile.speed,
            maxRange: projectile.maxRange
        });
        
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
        
        console.log(`Projectile ${id} created by ${owner.id} at (${Math.round(data.x)}, ${Math.round(data.y)})`);
        return projectile;
    }

    update(deltaTime, players, monsters) {
        const projectilesToRemove = [];
        
        // DEBUG: Log update cycle info
        if (this.projectiles.size > 0) {
            console.log(`[DEBUG] ProjectileManager update - Active projectiles: ${this.projectiles.size}, Monsters: ${monsters.size}`);
        }
        
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
            
            // DEBUG: Log projectile type determination
            console.log(`[DEBUG] Projectile ${id}:`, {
                ownerType: projectile.ownerType,
                isPlayerProjectile: isPlayerProjectile,
                position: { x: Math.round(projectile.x), y: Math.round(projectile.y) }
            });
            
            if (isPlayerProjectile) {
                // Player projectiles hit monsters
                console.log(`[DEBUG] Checking collision for player projectile ${id} against ${monsters.size} monsters`);
                
                for (const [monsterId, monster] of monsters) {
                    if (monster.hp <= 0) continue;
                    
                    const distance = getDistance(projectile, monster);
                    const hitRadius = monster.collisionRadius || 20;
                    
                    // DEBUG: Log each collision check
                    if (distance < hitRadius * 2) { // Log only when relatively close
                        console.log(`[DEBUG] Projectile ${id} -> Monster ${monsterId}:`, {
                            distance: distance.toFixed(2),
                            hitRadius: hitRadius,
                            willHit: distance <= hitRadius,
                            projectilePos: { x: Math.round(projectile.x), y: Math.round(projectile.y) },
                            monsterPos: { x: Math.round(monster.x), y: Math.round(monster.y) }
                        });
                    }
                    
                    if (distance <= hitRadius) {
                        // Hit detected
                        console.log(`[DEBUG] HIT DETECTED! Projectile ${id} hit monster ${monsterId}`);
                        this.handleProjectileHit(projectile, monster, 'monster', players, monsters);
                        projectilesToRemove.push(id);
                        break;
                    }
                }
            } else {
                // Monster projectiles hit players
                console.log(`[DEBUG] Checking collision for monster projectile ${id} (${projectile.ownerType}) against ${players.size} players`);
                
                for (const [playerId, player] of players) {
                    if (player.hp <= 0 || playerId === projectile.ownerId) continue;
                    
                    const distance = getDistance(projectile, player);
                    const hitRadius = 20; // Player collision radius
                    
                    if (distance <= hitRadius) {
                        // Hit detected
                        console.log(`[DEBUG] Monster projectile ${id} hit player ${playerId}`);
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
        console.log(`Projectile ${projectile.id} hit ${targetType} ${target.id || target.type}`);
        
        if (targetType === 'monster') {
            // Apply damage to monster
            const monsterManager = this.io.monsterManager; // Assume this is passed in
            console.log(`MonsterManager available: ${!!monsterManager}`);
            if (monsterManager) {
                const owner = players.get(projectile.ownerId);
                console.log(`Owner found: ${!!owner}, ownerId: ${projectile.ownerId}`);
                if (owner) {
                    console.log(`Applying damage to monster ${target.id}`);
                    monsterManager.handleMonsterDamage(target.id, projectile.damage, owner);
                }
            } else {
                console.error('MonsterManager not available in ProjectileManager!');
            }
        } else if (targetType === 'player') {
            // Apply damage to player
            if (!target.invulnerable) {
                target.hp = Math.max(0, target.hp - projectile.damage);
                
                // Get monster type for kill message
                const monsterType = projectile.ownerType;
                
                console.log(`${monsterType} projectile hits ${target.id} for ${projectile.damage} damage (${target.hp}/${target.maxHp} HP)`);
                
                // Notify clients
                this.io.emit('playerDamaged', {
                    playerId: target.id,
                    damage: projectile.damage,
                    hp: target.hp,
                    source: `${monsterType}_projectile`
                });
                
                if (target.hp <= 0) {
                    console.log(`Player ${target.id} killed by ${monsterType} projectile`);
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