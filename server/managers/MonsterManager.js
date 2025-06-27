import { GAME_CONSTANTS, MONSTER_STATS, MONSTER_SPAWN_WEIGHTS } from '../../shared/constants/GameConstants.js';
import { getDistance, selectWeightedRandom } from '../../shared/utils/MathUtils.js';
import { CollisionMask } from '../../shared/systems/CollisionMask.js';

export class MonsterManager {
    constructor(io) {
        this.io = io;
        this.monsters = new Map();
        this.nextMonsterId = 1;
        this.spawnTimer = 0;
        
        // Initialize collision mask with same logic as InputProcessor
        this.collisionMask = new CollisionMask(100, 100, 64);
        this.initializeCollisionMask();
    }

    /**
     * Initialize collision mask using same generation logic as InputProcessor
     * This ensures monsters use the same collision data as players
     */
    initializeCollisionMask() {
        // Generate elevation data using same algorithm as InputProcessor
        const width = 100;
        const height = 100;
        const elevationData = [];
        
        // Create elevation data - must match InputProcessor logic exactly
        for (let y = 0; y < height; y++) {
            elevationData[y] = [];
            for (let x = 0; x < width; x++) {
                const centerX = width / 2;
                const centerY = height / 2;
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                
                // Create some elevated plateaus for collision testing
                const isElevated = (
                    (distance > 15 && distance < 25) || // Ring around center
                    (x < 10 || x > width - 10 || y < 10 || y > height - 10) // Borders
                );
                
                elevationData[y][x] = isElevated ? 1 : 0;
            }
        }
        
        // Generate collision mask from elevation data
        this.collisionMask.generateFromElevationData(elevationData);
        
        console.log("[MonsterManager] Collision mask initialized");
    }
    
    /**
     * Update collision mask with data from client
     * This ensures monsters use the same collision data as the client's generated world
     */
    updateCollisionMask(collisionMaskData) {
        if (this.collisionMask && collisionMaskData) {
            this.collisionMask.deserialize(collisionMaskData);
            console.log("[MonsterManager] Collision mask updated from client");
            console.log("[MonsterManager] New collision stats:", this.collisionMask.getStats());
        }
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
            attackAnimationStarted: 0,
            isAttackAnimating: false,
            velocity: { x: 0, y: 0 },
            facing: 'down',
            spawnTime: Date.now(),
            lastUpdate: Date.now(),
            collisionRadius: stats.collisionRadius || 20,  // Add collision radius
            stunTimer: 0,  // Track stun duration
            isStunned: false
        };

        this.monsters.set(id, monster);
        console.log(`[DEBUG] Monster created and added to map:`, {
            id: monster.id,
            type: monster.type,
            position: { x: Math.round(monster.x), y: Math.round(monster.y) },
            collisionRadius: stats.collisionRadius || 20
        });
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
                monster.isStunned = false;
                monster.stunTimer = 0;
                // Return to idle state when stun ends
                monster.state = 'idle';
                // Clear any attack animation state
                if (monster.isAttackAnimating) {
                    monster.isAttackAnimating = false;
                }
            } else {
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
            case 'dying':
                // Animation state - no logic needed
                break;
        }
        
        // Log state transitions for debugging
        if (oldState !== monster.state) {
            console.log(`Monster ${monster.type}[${monster.id}] state: ${oldState} -> ${monster.state}` + 
                       (monster.isAttackAnimating ? ' (animating)' : ''));
        }
        
        monster.lastUpdate = Date.now();
    }

    handleIdleState(monster, stats, players) {
        // If we already have a target, check if we should attack again
        if (monster.target) {
            const target = players.get(monster.target);
            if (target && target.hp > 0) {
                const distance = getDistance(monster, target);
                
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
        
        // Chase player (but not if stunned)
        if (!monster.isStunned) {
            this.moveToward(monster, target, stats.moveSpeed);
        } else {
            // Stop moving while stunned
            monster.velocity = { x: 0, y: 0 };
        }
    }

    handleAttackingState(monster, stats, players) {
        const target = players.get(monster.target);
        
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
        
        // Start a new attack if cooldown is ready
        if (now - monster.lastAttack >= stats.attackCooldown) {
            monster.lastAttack = now;
            monster.attackAnimationStarted = now;
            monster.isAttackAnimating = true;
            
            // Handle projectile attacks differently
            if (monster.type === 'wildarcher') {
                // Schedule projectile creation
                setTimeout(() => {
                    this.createMonsterProjectile(monster, target, stats);
                }, stats.attackDelay);
            } else {
                // Schedule melee damage application
                setTimeout(() => {
                    this.applyMonsterDamage(monster, stats, players);
                }, stats.attackDelay);
            }
        } else {
            // Cooldown not ready, go back to idle
            monster.state = 'idle';
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

    createMonsterProjectile(monster, target, stats) {
        if (!target || target.hp <= 0) return;
        
        // Calculate angle to target
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
        const angle = Math.atan2(dy, dx);
        
        // Only wildarcher has projectiles currently
        let effectType = 'wildarcher_shot_effect';
        let projectileSpeed = 600;
        
        // Create projectile through the ProjectileManager
        if (this.io.projectileManager) {
            // Pass monster with type property
            const projectileOwner = {
                id: monster.id,
                type: monster.type
            };
            this.io.projectileManager.createProjectile(projectileOwner, {
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

    moveToward(monster, target, speed) {
        const dx = target.x - monster.x;
        const dy = target.y - monster.y;
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
        
        // Apply stun when taking damage (interrupt attacks)
        const stunDuration = GAME_CONSTANTS.MONSTER?.DAMAGE_STUN_DURATION || 0.5;
        if (stunDuration > 0) {
            monster.stunTimer = stunDuration;
            monster.isStunned = true;
            
            // Set state to stunned for visual feedback
            monster.state = 'stunned';
            
            // Interrupt any ongoing attack
            if (monster.isAttackAnimating) {
                monster.isAttackAnimating = false;
            }
        }
        
        console.log(`Monster ${monster.type} takes ${damage} damage (${monster.hp}/${monster.maxHp} HP) - stunned for ${stunDuration}s`);
        
        // Broadcast damage
        this.io.emit('monsterDamaged', {
            monsterId: monster.id,
            damage: damage,
            hp: monster.hp,
            attacker: attacker.id,
            stunned: true
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
        const maxLevel = GAME_CONSTANTS.LEVELS.MAX_LEVEL;
        const xpGrowth = GAME_CONSTANTS.LEVELS.XP_GROWTH;
        const isPlaytestMode = GAME_CONSTANTS.LEVELS.PLAYTEST_MODE;
        const playtestXpPerLevel = GAME_CONSTANTS.LEVELS.PLAYTEST_XP_PER_LEVEL;
        
        // Calculate what level the player should be based on current XP
        let newLevel = player.level;
        
        if (isPlaytestMode) {
            // Playtest mode: simple linear progression (20 XP per level)
            newLevel = Math.min(maxLevel, Math.floor(player.xp / playtestXpPerLevel) + 1);
        } else {
            // Normal mode: triangular progression
            // Using formula: getTotalXpForLevel(level) = (level - 1) * level / 2 * growth
            for (let level = player.level + 1; level <= maxLevel; level++) {
                const requiredXp = (level - 1) * level / 2 * xpGrowth;
                if (player.xp >= requiredXp) {
                    newLevel = level;
                } else {
                    break;
                }
            }
        }
        
        if (newLevel > player.level) {
            const oldLevel = player.level;
            player.level = newLevel;
            player.hp = player.maxHp;
            
            // Apply level bonuses for each level gained
            for (let level = oldLevel + 1; level <= newLevel; level++) {
                this.applyLevelBonus(player, level);
            }
            
            console.log(`Player ${player.id} leveled up to ${player.level}! (${player.xp} XP)`);
            
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

    applyLevelBonus(player, level) {
        console.log(`Applying level ${level} bonus for player ${player.id}`);
        
        switch (level) {
            case 2:
            case 6:
                // Move speed bonus
                player.moveSpeedBonus += 0.25;
                console.log(`  +0.25 move speed bonus (total: +${player.moveSpeedBonus})`);
                break;
            case 3:
            case 7:
                // Attack recovery reduction
                player.attackRecoveryBonus += 25; // 25ms reduction
                console.log(`  -25ms attack recovery bonus (total: -${player.attackRecoveryBonus}ms)`);
                break;
            case 4:
            case 8:
                // Attack cooldown reduction
                player.attackCooldownBonus += 100; // 100ms reduction
                console.log(`  -100ms attack cooldown bonus (total: -${player.attackCooldownBonus}ms)`);
                break;
            case 5:
                // Roll unlock
                player.rollUnlocked = true;
                console.log(`  Roll ability unlocked`);
                break;
            case 9:
                // Future move unlock placeholder
                console.log(`  Future ability unlock`);
                break;
            case 10:
                // Max HP increase
                player.maxHp += 1;
                player.hp = player.maxHp; // Heal to full with new max HP
                console.log(`  +1 max HP bonus (now ${player.maxHp})`);
                break;
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
            target: monster.target,
            isStunned: monster.isStunned || false,
            stunTimer: monster.stunTimer || 0
        }));
    }

    // Spawn initial monsters
    spawnInitialMonsters(count = 5) {
        console.log(`[DEBUG] Spawning ${count} initial monsters`);
        for (let i = 0; i < count; i++) {
            const monster = this.createMonster();
            console.log(`[DEBUG] Spawned ${monster.type} at (${Math.round(monster.x)}, ${Math.round(monster.y)})`);
        }
        console.log(`[DEBUG] Total monsters after initial spawn: ${this.monsters.size}`);
    }
}