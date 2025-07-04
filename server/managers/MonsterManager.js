import { GAME_CONSTANTS, MONSTER_STATS, MONSTER_SPAWN_WEIGHTS } from '../../shared/constants/GameConstants.js';
import { getDistance, selectWeightedRandom } from '../../shared/utils/MathUtils.js';
import { CollisionMask } from '../../shared/systems/CollisionMask.js';
import { SharedWorldGenerator } from '../../shared/systems/WorldGenerator.js';
import { createMonsterState, validateMonsterState } from '../../shared/factories/EntityFactories.js';
import { CalculationEngine } from '../systems/CalculationEngine.js';

export class MonsterManager {
    constructor(io, serverWorldManager) {
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
    initializeCollisionMask() {
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
    updateCollisionMask(collisionMaskData) {
        // Collision mask sync not needed - using shared world seed
    }

    update(deltaTime, players) {
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
        
        for (const monster of this.monsters.values()) {
            if (monster.state === 'dead') {
                this.monsters.delete(monster.id);
                continue;
            }
            
            // Find closest player distance
            let closestDistance = Infinity;
            for (const player of players.values()) {
                const dist = getDistance(monster, player);
                closestDistance = Math.min(closestDistance, dist);
            }
            
            // Determine LOD level and update frequency
            if (closestDistance < nearDistance) {
                // NEAR: Full update every frame (highest priority)
                // Wake up dormant monsters
                if (monster.state === 'dormant') {
                    monster.state = 'idle';
                }
                this.updateMonster(monster, deltaTime, players);
                nearCount++;
            } else if (closestDistance < mediumDistance) {
                // MEDIUM: Update every 2 frames (skip 50% of updates)
                // Wake up dormant monsters
                if (monster.state === 'dormant') {
                    monster.state = 'idle';
                }
                if (!monster.lodSkipCounter) monster.lodSkipCounter = 0;
                monster.lodSkipCounter++;
                if (monster.lodSkipCounter % 2 === 0) {
                    this.updateMonster(monster, deltaTime * 2, players); // Compensate for skipped frame
                }
                mediumCount++;
            } else if (closestDistance < farDistance) {
                // FAR: Update every 4 frames (skip 75% of updates) 
                // Wake up dormant monsters
                if (monster.state === 'dormant') {
                    monster.state = 'idle';
                }
                if (!monster.lodSkipCounter) monster.lodSkipCounter = 0;
                monster.lodSkipCounter++;
                if (monster.lodSkipCounter % 4 === 0) {
                    this.updateMonster(monster, deltaTime * 4, players); // Compensate for skipped frames
                }
                farCount++;
            } else {
                // DORMANT: No updates, minimal state
                if (monster.state !== 'dormant') {
                    // Newly becoming dormant
                    monster.state = 'dormant';
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
        
        // Use factory to create complete monster state with all required fields
        // This prevents missing field bugs that could cause AI or combat issues
        const monster = createMonsterState({
            id,
            type,
            x: pos.x,
            y: pos.y,
            facing: 'down'
            // hp, maxHp, damage, attackRange, aggroRange, moveSpeed come from factory defaults
        });
        
        // Validate the created state has all required fields
        validateMonsterState(monster);
        
        // Add server-specific properties not in the core state
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

        this.monsters.set(id, monster);
        // Monster created and added to map
        return monster;
    }

    spawnMonster(players) {
        const monster = this.createMonster(null, null, players);
        // Spawned monster
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
            case 'dormant':
                // Dormant monsters wake up when players get close (handled in main update loop)
                this.handleIdleState(monster, stats, players);
                break;
            case 'dying':
                // Animation state - no logic needed
                break;
        }
        
        // State transition handled
        
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
                    // Re-fetch current players from gameState to ensure we have latest data
                    const currentPlayers = this.io.gameState ? this.io.gameState.players : players;
                    this.applyMonsterDamage(monster, stats, currentPlayers);
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
        
        // Use DamageProcessor for all damage application
        if (this.damageProcessor) {
            console.log(`[MonsterManager] Applying damage: ${monster.type} -> ${target.id}, damage=${stats.damage}`);
            const result = this.damageProcessor.applyDamage(
                monster,
                target,
                stats.damage,
                'melee',
                { attackType: 'monster_melee' }
            );
            console.log(`[MonsterManager] Damage result:`, result);
        } else {
            console.log(`[MonsterManager] WARNING: No damageProcessor available!`);
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

    handleMonsterDeath(monster, killer) {
        const stats = MONSTER_STATS[monster.type];
        
        // Award XP
        killer.xp = (killer.xp || 0) + stats.xp;
        killer.kills = (killer.kills || 0) + 1;
        
        // Monster killed, XP awarded
        
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
        
        // Phase 3.1: Use CalculationEngine for level calculation
        const newLevel = CalculationEngine.calculateLevelFromXP(player.xp, isPlaytestMode);
        
        if (newLevel > player.level) {
            const oldLevel = player.level;
            player.level = newLevel;
            player.hp = player.maxHp;
            
            // Phase 3.1: Use CalculationEngine to apply level bonuses
            CalculationEngine.applyLevelBonuses(player, oldLevel, newLevel);
            
            // Update max HP if it changed (level 10 bonus)
            const newMaxHp = CalculationEngine.calculateMaxHP(player.class, newLevel);
            if (newMaxHp > player.maxHp) {
                player.maxHp = newMaxHp;
                player.hp = player.maxHp; // Full heal when max HP increases
            }
            
            // Player leveled up
            
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

    // Phase 3.1: applyLevelBonus method removed - replaced by CalculationEngine.applyLevelBonuses

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
            state: monster.state === 'dormant' ? 'idle' : monster.state, // Send dormant as idle to clients
            facing: monster.facing,
            target: monster.target,
            isStunned: monster.isStunned || false,
            stunTimer: monster.stunTimer || 0
        }));
    }

    // Spawn initial monsters
    spawnInitialMonsters(count = 5) {
        // Spawning initial monsters
        for (let i = 0; i < count; i++) {
            const monster = this.createMonster();
        }
        // Initial spawn complete
    }
}