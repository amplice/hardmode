import { GAME_CONSTANTS, MONSTER_STATS, MONSTER_SPAWN_WEIGHTS } from '../../shared/constants/GameConstants.js';
import { getDistance, selectWeightedRandom } from '../../shared/utils/MathUtils.js';

export class MonsterManager {
    constructor(io) {
        this.io = io;
        this.monsters = new Map();
        this.nextMonsterId = 1;
        this.spawnTimer = 0;
    }

    update(deltaTime, players) {
        // Update spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= GAME_CONSTANTS.SPAWN.INTERVAL && 
            this.monsters.size < GAME_CONSTANTS.SPAWN.MAX_MONSTERS) {
            this.spawnMonster(players);
            this.spawnTimer = 0;
        }

        // Update all monsters
        for (const monster of this.monsters.values()) {
            if (monster.state === 'dead') {
                this.monsters.delete(monster.id);
                continue;
            }
            this.updateMonster(monster, deltaTime, players);
        }
    }

    createMonster(type = null, position = null, players = null) {
        if (!type) {
            const types = Object.keys(MONSTER_SPAWN_WEIGHTS);
            const weights = Object.values(MONSTER_SPAWN_WEIGHTS);
            type = selectWeightedRandom(types, weights);
        }
        
        let stats = MONSTER_STATS[type];
        if (!stats) {
            console.warn(`Unknown monster type: ${type}, defaulting to skeleton`);
            type = 'skeleton';
            stats = MONSTER_STATS.skeleton;
        }
        
        const pos = position || this.findValidSpawnPosition(players ? Array.from(players.values()) : []);
        const id = this.nextMonsterId++;
        
        const monster = {
            id,
            type,
            x: pos.x,
            y: pos.y,
            hp: stats.hp,
            maxHp: stats.hp,
            state: 'idle',
            target: null,
            lastAttack: 0,
            velocity: { x: 0, y: 0 },
            facing: 'down',
            spawnTime: Date.now(),
            lastUpdate: Date.now()
        };

        this.monsters.set(id, monster);
        return monster;
    }

    spawnMonster(players) {
        const monster = this.createMonster(null, null, players);
        console.log(`Spawned ${monster.type} at (${Math.round(monster.x)}, ${Math.round(monster.y)})`);
        return monster;
    }

    findValidSpawnPosition(players) {
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
                const dist = Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2));
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

    updateMonster(monster, deltaTime, players) {
        const stats = MONSTER_STATS[monster.type];
        
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
            case 'dying':
                // Animation state - no logic needed
                break;
        }
        
        monster.lastUpdate = Date.now();
    }

    handleIdleState(monster, stats, players) {
        // Look for players in aggro range
        let nearestPlayer = null;
        let nearestDistance = stats.aggroRange;
        
        for (const [id, player] of players) {
            if (player.hp <= 0) continue;
            
            const dist = getDistance(monster, player);
            if (dist < nearestDistance) {
                nearestDistance = dist;
                nearestPlayer = id;
            }
        }
        
        if (nearestPlayer) {
            monster.state = 'chasing';
            monster.target = nearestPlayer;
        }
    }

    handleChasingState(monster, stats, deltaTime, players) {
        const target = players.get(monster.target);
        
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
        
        // Chase player
        this.moveToward(monster, target, stats.moveSpeed);
    }

    handleAttackingState(monster, stats, players) {
        const target = players.get(monster.target);
        
        if (!target || target.hp <= 0) {
            monster.state = 'idle';
            monster.target = null;
            return;
        }
        
        const distance = getDistance(monster, target);
        
        // Target moved out of range
        if (distance > stats.attackRange * 1.2) {
            monster.state = 'chasing';
            return;
        }
        
        // Attack if cooldown ready
        const now = Date.now();
        if (now - monster.lastAttack >= stats.attackCooldown) {
            monster.lastAttack = now;
            
            // Schedule damage application
            setTimeout(() => {
                this.applyMonsterDamage(monster, stats, players);
            }, stats.attackDelay);
            
            // Transition back after animation
            setTimeout(() => {
                if (monster.state === 'attacking') {
                    const currentTarget = players.get(monster.target);
                    if (currentTarget && currentTarget.hp > 0) {
                        const currentDistance = getDistance(monster, currentTarget);
                        monster.state = currentDistance <= stats.attackRange ? 'idle' : 'chasing';
                    } else {
                        monster.state = 'idle';
                        monster.target = null;
                    }
                }
            }, stats.attackDuration);
        }
    }

    applyMonsterDamage(monster, stats, players) {
        const target = players.get(monster.target);
        if (!target || target.hp <= 0) return;
        
        const distance = getDistance(monster, target);
        if (distance > stats.attackRange * 1.2) return;
        
        // Check invulnerability
        if (!target.invulnerable) {
            target.hp = Math.max(0, target.hp - stats.damage);
            
            console.log(`${monster.type} attacks ${target.id} for ${stats.damage} damage (${target.hp}/${target.maxHp} HP)`);
            
            // Notify clients
            this.io.emit('playerDamaged', {
                playerId: monster.target,
                damage: stats.damage,
                hp: target.hp,
                source: `${monster.type}_${monster.id}`
            });
            
            if (target.hp <= 0) {
                console.log(`Player ${target.id} killed by ${monster.type}`);
                this.io.emit('playerKilled', {
                    playerId: monster.target,
                    killedBy: monster.type
                });
            }
        }
    }

    moveToward(monster, target, speed) {
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            monster.velocity.x = (dx / distance) * speed;
            monster.velocity.y = (dy / distance) * speed;
            monster.x += monster.velocity.x;
            monster.y += monster.velocity.y;
            monster.facing = this.getFacingDirection(dx, dy);
        }
    }

    getFacingDirection(dx, dy) {
        const angle = Math.atan2(dy, dx);
        const octant = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
        const directions = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
        return directions[octant];
    }

    handleMonsterDamage(monsterId, damage, attacker) {
        const monster = this.monsters.get(monsterId);
        if (!monster || monster.hp <= 0) return false;
        
        monster.hp = Math.max(0, monster.hp - damage);
        
        console.log(`Monster ${monster.type} takes ${damage} damage (${monster.hp}/${monster.maxHp} HP)`);
        
        // Broadcast damage
        this.io.emit('monsterDamaged', {
            monsterId: monster.id,
            damage: damage,
            hp: monster.hp,
            attacker: attacker.id
        });
        
        // Handle death
        if (monster.hp <= 0) {
            this.handleMonsterDeath(monster, attacker);
        }
        
        return true;
    }

    handleMonsterDeath(monster, killer) {
        const stats = MONSTER_STATS[monster.type];
        
        // Award XP
        killer.xp = (killer.xp || 0) + stats.xp;
        killer.kills = (killer.kills || 0) + 1;
        
        console.log(`${monster.type} killed by ${killer.id}! +${stats.xp} XP (Total: ${killer.xp})`);
        
        // Check level up
        this.checkLevelUp(killer);
        
        // Notify clients
        this.io.emit('monsterKilled', {
            monsterId: monster.id,
            killedBy: killer.id,
            xpReward: stats.xp,
            killerXp: killer.xp,
            killerLevel: killer.level || 1
        });
        
        // Mark as dying
        monster.state = 'dying';
        setTimeout(() => {
            this.monsters.delete(monster.id);
        }, 1000);
    }

    checkLevelUp(player) {
        const newLevel = Math.floor(player.xp / 100) + 1;
        const maxLevel = 10;
        
        if (newLevel > player.level && newLevel <= maxLevel) {
            player.level = newLevel;
            player.hp = player.maxHp;
            
            console.log(`Player ${player.id} leveled up to ${player.level}!`);
            
            this.io.emit('playerLevelUp', {
                playerId: player.id,
                level: player.level,
                hp: player.hp
            });
        }
    }

    getVisibleMonsters(players, viewDistance = GAME_CONSTANTS.NETWORK.VIEW_DISTANCE) {
        const visibleMonsters = new Map();
        
        for (const [playerId, player] of players) {
            for (const [monsterId, monster] of this.monsters) {
                const dist = getDistance(player, monster);
                if (dist < viewDistance) {
                    visibleMonsters.set(monsterId, monster);
                }
            }
        }
        
        return visibleMonsters;
    }

    getSerializedMonsters(visibleMonsters) {
        return Array.from(visibleMonsters.values()).map(monster => ({
            id: monster.id,
            type: monster.type,
            x: Math.round(monster.x),
            y: Math.round(monster.y),
            hp: monster.hp,
            maxHp: monster.maxHp,
            state: monster.state,
            facing: monster.facing,
            target: monster.target
        }));
    }

    // Spawn initial monsters
    spawnInitialMonsters(count = 5) {
        for (let i = 0; i < count; i++) {
            this.createMonster();
        }
    }
}