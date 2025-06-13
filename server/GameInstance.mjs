import { MONSTER_CONFIG, PLAYER_CONFIG } from '../src/js/config/GameConfig.js';
import { createNoise2D } from 'simplex-noise';

export class GameInstance {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.monsters = new Map();
        this.projectiles = new Map();
        this.state = {
            worldSeed: Math.random(),
            worldGenerated: false
        };
        this.updateRate = 20; // 20Hz server tick
        this.lastUpdate = Date.now();
        this.nextEntityId = 1;
        
        // Monster spawning
        this.monsterSpawnTimer = 0;
        this.maxMonsters = 50; // Reduced for initial testing
        
        // Store player inputs
        this.playerInputs = new Map();
    }

    generateId(prefix = 'entity') {
        return `${prefix}_${this.id}_${this.nextEntityId++}`;
    }

    addPlayer(player) {
        // Initialize player state
        const playerState = {
            id: player.id,
            socket: player.socket,
            position: { x: 3200, y: 3200 }, // Center of 100x100 world with 64 tile size
            velocity: { x: 0, y: 0 },
            facing: 'down',
            hitPoints: PLAYER_CONFIG.classes[player.class]?.hitPoints || 2,
            maxHitPoints: PLAYER_CONFIG.classes[player.class]?.hitPoints || 2,
            moveSpeed: PLAYER_CONFIG.classes[player.class]?.moveSpeed || 4,
            characterClass: player.class || 'bladedancer',
            isAttacking: false,
            isDead: false,
            killCount: 0,
            experience: 0,
            level: 1
        };
        
        this.players.set(player.id, playerState);
        this.playerInputs.set(player.id, {});
        
        // Send initial game state to new player
        player.socket.emit('game_state', this.getFullGameState());
        
        // Notify other players
        this.broadcast('player_joined', {
            playerId: player.id,
            playerState: this.getPlayerData(playerState)
        }, player.id);
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.playerInputs.delete(playerId);
        this.broadcast('player_left', { playerId });
    }

    handlePlayerInput(playerId, input) {
        this.playerInputs.set(playerId, {
            ...input,
            timestamp: Date.now(),
            sequenceNumber: input.sequenceNumber
        });
    }

    update(deltaTime) {
        // Process player inputs and update positions
        for (const [playerId, player] of this.players) {
            const input = this.playerInputs.get(playerId) || {};
            
            if (!player.isDead && !player.isAttacking) {
                // Update velocity based on input
                let vx = 0, vy = 0;
                if (input.up) vy = -1;
                if (input.down) vy = 1;
                if (input.left) vx = -1;
                if (input.right) vx = 1;
                
                // Normalize diagonal movement
                if (vx !== 0 && vy !== 0) {
                    vx *= 0.7071;
                    vy *= 0.7071;
                }
                
                // Apply movement
                player.velocity.x = vx * player.moveSpeed;
                player.velocity.y = vy * player.moveSpeed;
                player.position.x += player.velocity.x;
                player.position.y += player.velocity.y;
                
                // Update facing based on mouse position
                if (input.mousePosition) {
                    // This is a simplified facing calculation
                    // In a real implementation, you'd need to account for camera position
                    player.facing = this.calculateFacing(input.mousePosition);
                }
                
                // Handle attacks
                if (input.primaryAttack && !player.attackCooldown) {
                    player.isAttacking = true;
                    player.attackType = 'primary';
                    player.attackCooldown = 500; // milliseconds
                    
                    // Check for hit monsters
                    this.processPlayerAttack(player);
                }
            }
            
            // Update cooldowns
            if (player.attackCooldown > 0) {
                player.attackCooldown -= deltaTime * 1000;
                if (player.attackCooldown <= 0) {
                    player.isAttacking = false;
                    player.attackCooldown = 0;
                }
            }
        }
        
        // Update monsters
        this.updateMonsters(deltaTime);
        
        // Spawn new monsters
        this.monsterSpawnTimer += deltaTime;
        if (this.monsterSpawnTimer >= 2 && this.monsters.size < this.maxMonsters) {
            this.spawnMonster();
            this.monsterSpawnTimer = 0;
        }
        
        // Send state updates to all players
        this.broadcastGameState();
        
        this.lastUpdate = Date.now();
    }

    updateMonsters(deltaTime) {
        const playersList = Array.from(this.players.values()).filter(p => !p.isDead);
        
        for (const [monsterId, monster] of this.monsters) {
            if (!monster.alive) continue;
            
            // Simple AI - find nearest player
            let nearestPlayer = null;
            let nearestDistance = Infinity;
            
            for (const player of playersList) {
                const dx = player.position.x - monster.position.x;
                const dy = player.position.y - monster.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < nearestDistance && distance < monster.aggroRange) {
                    nearestDistance = distance;
                    nearestPlayer = player;
                }
            }
            
            // Move towards nearest player
            if (nearestPlayer && nearestDistance > monster.attackRange) {
                const dx = nearestPlayer.position.x - monster.position.x;
                const dy = nearestPlayer.position.y - monster.position.y;
                const moveSpeed = monster.moveSpeed / nearestDistance;
                
                monster.velocity.x = dx * moveSpeed;
                monster.velocity.y = dy * moveSpeed;
                monster.position.x += monster.velocity.x;
                monster.position.y += monster.velocity.y;
                
                // Update facing
                monster.facing = this.calculateFacingFromVelocity(monster.velocity);
            } else {
                monster.velocity.x = 0;
                monster.velocity.y = 0;
                
                // Attack if in range
                if (nearestPlayer && nearestDistance <= monster.attackRange && !monster.attackCooldown) {
                    monster.attackCooldown = 2000; // 2 second cooldown
                    this.processMonsterAttack(monster, nearestPlayer);
                }
            }
            
            // Update cooldowns
            if (monster.attackCooldown > 0) {
                monster.attackCooldown -= deltaTime * 1000;
            }
        }
    }

    spawnMonster() {
        const types = Object.keys(MONSTER_CONFIG.stats);
        const type = types[Math.floor(Math.random() * types.length)];
        const stats = MONSTER_CONFIG.stats[type];
        
        // Random position (avoid spawning too close to players)
        let x, y, validSpawn = false;
        let attempts = 0;
        
        while (!validSpawn && attempts < 20) {
            x = Math.random() * 6000 + 200;
            y = Math.random() * 6000 + 200;
            
            validSpawn = true;
            for (const player of this.players.values()) {
                const dx = x - player.position.x;
                const dy = y - player.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 500) {
                    validSpawn = false;
                    break;
                }
            }
            attempts++;
        }
        
        if (validSpawn) {
            const monster = {
                id: this.generateId('monster'),
                type: type,
                position: { x, y },
                velocity: { x: 0, y: 0 },
                facing: 'down',
                hitPoints: stats.hitPoints,
                maxHitPoints: stats.hitPoints,
                moveSpeed: stats.moveSpeed,
                attackRange: stats.attackRange,
                aggroRange: stats.aggroRange,
                alive: true,
                attackCooldown: 0
            };
            
            this.monsters.set(monster.id, monster);
            
            this.broadcast('entity_spawn', {
                type: 'monster',
                entity: monster
            });
        }
    }

    processPlayerAttack(player) {
        // Simple attack logic - damage monsters in front of player
        for (const [monsterId, monster] of this.monsters) {
            if (!monster.alive) continue;
            
            const dx = monster.position.x - player.position.x;
            const dy = monster.position.y - player.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Simple range check (this should be more sophisticated based on attack type)
            if (distance < 100) {
                monster.hitPoints -= 1;
                
                if (monster.hitPoints <= 0) {
                    monster.alive = false;
                    player.killCount++;
                    player.experience += MONSTER_CONFIG.stats[monster.type]?.xp || 5;
                    
                    // Check for level up
                    const xpForNext = player.level * (PLAYER_CONFIG.levels?.xpGrowth || 20);
                    if (player.experience >= xpForNext) {
                        player.level++;
                        player.maxHitPoints = PLAYER_CONFIG.classes[player.characterClass]?.hitPoints || 2;
                        if (player.level >= 3) player.maxHitPoints++;
                        if (player.level >= 6) player.maxHitPoints++;
                        if (player.level >= 9) player.maxHitPoints++;
                        player.hitPoints = player.maxHitPoints;
                    }
                    
                    this.broadcast('entity_despawn', { id: monsterId });
                    
                    // Remove monster after a delay
                    setTimeout(() => {
                        this.monsters.delete(monsterId);
                    }, 1000);
                } else {
                    this.broadcast('damage_event', {
                        targetId: monsterId,
                        damage: 1,
                        attackerId: player.id
                    });
                }
            }
        }
    }

    processMonsterAttack(monster, player) {
        // Simple damage dealing
        player.hitPoints -= 1;
        
        if (player.hitPoints <= 0) {
            player.isDead = true;
            this.broadcast('player_died', { playerId: player.id });
            
            // Respawn after delay
            setTimeout(() => {
                if (this.players.has(player.id)) {
                    player.hitPoints = player.maxHitPoints;
                    player.isDead = false;
                    player.position = { x: 3200, y: 3200 };
                    this.broadcast('player_respawned', { 
                        playerId: player.id,
                        position: player.position,
                        hitPoints: player.hitPoints
                    });
                }
            }, 3000);
        } else {
            this.broadcast('damage_event', {
                targetId: player.id,
                damage: 1,
                attackerId: monster.id
            });
        }
    }

    calculateFacing(mousePosition) {
        // Simplified - in reality you'd need to know the camera position
        // For now, just return a cardinal direction based on mouse quadrant
        const centerX = 960; // Assuming 1920 width / 2
        const centerY = 540; // Assuming 1080 height / 2
        
        const dx = mousePosition.x - centerX;
        const dy = mousePosition.y - centerY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }

    calculateFacingFromVelocity(velocity) {
        if (velocity.x === 0 && velocity.y === 0) return 'down';
        
        if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
            return velocity.x > 0 ? 'right' : 'left';
        } else {
            return velocity.y > 0 ? 'down' : 'up';
        }
    }

    getPlayerData(player) {
        return {
            id: player.id,
            position: player.position,
            velocity: player.velocity,
            facing: player.facing,
            hitPoints: player.hitPoints,
            maxHitPoints: player.maxHitPoints,
            characterClass: player.characterClass,
            isAttacking: player.isAttacking,
            isDead: player.isDead,
            level: player.level,
            experience: player.experience,
            killCount: player.killCount
        };
    }

    getFullGameState() {
        return {
            worldSeed: this.state.worldSeed,
            players: Array.from(this.players.values()).map(p => this.getPlayerData(p)),
            monsters: Array.from(this.monsters.values()),
            timestamp: Date.now()
        };
    }

    broadcastGameState() {
        const state = {
            players: Array.from(this.players.values()).map(p => this.getPlayerData(p)),
            monsters: Array.from(this.monsters.values()).map(m => ({
                id: m.id,
                type: m.type,
                position: m.position,
                velocity: m.velocity,
                facing: m.facing,
                alive: m.alive,
                hitPoints: m.hitPoints
            })),
            timestamp: Date.now()
        };
        
        this.broadcast('game_state', state);
    }

    broadcast(event, data, excludeId = null) {
        for (const player of this.players.values()) {
            if (player.id === excludeId) continue;
            player.socket.emit(event, data);
        }
        
        // Also send to the excluded player for most events
        if (excludeId && this.players.has(excludeId) && event !== 'player_joined') {
            this.players.get(excludeId).socket.emit(event, data);
        }
    }
}