const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve client files
app.use(express.static(path.join(__dirname, 'src')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(express.json({ limit: '10mb' })); // Allow larger debug dumps

// Debug logging endpoint
app.post('/debug-log', (req, res) => {
    const { filename, content } = req.body;
    if (!filename || !content) {
        return res.status(400).json({ error: 'Missing filename or content' });
    }
    
    // Sanitize filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9\-_.]/g, '');
    const filepath = path.join(__dirname, 'debug-logs', safeFilename);
    
    fs.writeFile(filepath, content, (err) => {
        if (err) {
            console.error('Error saving debug log:', err);
            return res.status(500).json({ error: 'Failed to save debug log' });
        }
        console.log(`Debug log saved: ${safeFilename}`);
        res.json({ success: true, filename: safeFilename });
    });
});

const TICK_RATE = 30; // updates per second
const players = new Map(); // id -> player state
const monsters = new Map(); // id -> monster state
let nextMonsterId = 1;
let spawnTimer = 0;
const MAX_MONSTERS = 20;
const MONSTER_SPAWN_INTERVAL = 5; // seconds

// Simple world data (100x100 tiles, 64 size) with deterministic seed
const WORLD = {
    width: 100,
    height: 100,
    tileSize: 64,
    seed: 42
};

// Monster stats matching GameConfig.js
const MONSTER_STATS = {
    ogre: { 
        hp: 4, moveSpeed: 2, damage: 1, attackRange: 90, 
        aggroRange: 800, xp: 20, attackCooldown: 2000, collisionRadius: 35 
    },
    skeleton: { 
        hp: 2, moveSpeed: 2.5, damage: 1, attackRange: 70, 
        aggroRange: 1200, xp: 5, attackCooldown: 1500, collisionRadius: 15 
    },
    elemental: { 
        hp: 3, moveSpeed: 2, damage: 2, attackRange: 100, 
        aggroRange: 800, xp: 10, attackCooldown: 2000, collisionRadius: 15 
    },
    ghoul: { 
        hp: 2, moveSpeed: 3.5, damage: 1, attackRange: 70, 
        aggroRange: 3000, xp: 15, attackCooldown: 1000, collisionRadius: 10 
    },
    wildarcher: { 
        hp: 1, moveSpeed: 3, damage: 1, attackRange: 500, 
        aggroRange: 1500, xp: 10, attackCooldown: 2500, collisionRadius: 15 
    }
};

// Monster spawn weights (matching GameConfig.js distribution)
const MONSTER_TYPES = ['skeleton', 'elemental', 'ghoul', 'ogre', 'wildarcher'];
const MONSTER_WEIGHTS = [0.25, 0.25, 0.25, 0.25, 0];

// Helper functions
function getDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function getFacingDirection(dx, dy) {
    const angle = Math.atan2(dy, dx);
    const octant = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
    const directions = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
    return directions[octant];
}

function selectWeightedRandom(types, weights) {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < types.length; i++) {
        random -= weights[i];
        if (random <= 0) return types[i];
    }
    return types[types.length - 1];
}

function createPlayer(id, options = {}) {
    const classHp = {
        bladedancer: 3,
        guardian: 4,
        hunter: 1,
        rogue: 2
    };
    const playerClass = options.class || 'bladedancer';
    const maxHp = classHp[playerClass] || 3;
    
    return {
        id,
        x: WORLD.width * WORLD.tileSize / 2,
        y: WORLD.height * WORLD.tileSize / 2,
        facing: 'down',
        class: playerClass,
        hp: maxHp,
        maxHp: maxHp,
        xp: 0,
        level: 1,
        kills: 0,
        respawnTimer: 0
    };
}

function findValidSpawnPosition() {
    const margin = 500; // Keep away from world edges
    let attempts = 0;
    
    while (attempts < 50) {
        const x = margin + Math.random() * (WORLD.width * WORLD.tileSize - margin * 2);
        const y = margin + Math.random() * (WORLD.height * WORLD.tileSize - margin * 2);
        
        // Check distance from all players
        let tooClose = false;
        for (const player of players.values()) {
            const dist = Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2));
            if (dist < 700) { // Min spawn distance
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
        x: WORLD.width * WORLD.tileSize * (Math.random() > 0.5 ? 0.1 : 0.9),
        y: WORLD.height * WORLD.tileSize * (Math.random() > 0.5 ? 0.1 : 0.9)
    };
}

function createMonster(type = null) {
    if (!type) {
        type = selectWeightedRandom(MONSTER_TYPES, MONSTER_WEIGHTS);
    }
    
    const stats = MONSTER_STATS[type];
    if (!stats) {
        console.warn(`Unknown monster type: ${type}, defaulting to skeleton`);
        type = 'skeleton';
    }
    
    const pos = findValidSpawnPosition();
    const id = nextMonsterId++;
    
    return {
        id,
        type,
        x: pos.x,
        y: pos.y,
        hp: stats.hp,
        maxHp: stats.hp,
        state: 'idle', // idle, chasing, attacking, dying, dead
        target: null, // player socket id
        lastAttack: 0,
        velocity: { x: 0, y: 0 },
        facing: 'down',
        spawnTime: Date.now(),
        lastUpdate: Date.now()
    };
}

function moveToward(monster, target, speed) {
    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        // Normalize and apply speed
        monster.velocity.x = (dx / distance) * speed;
        monster.velocity.y = (dy / distance) * speed;
        
        // Update position
        monster.x += monster.velocity.x;
        monster.y += monster.velocity.y;
        
        // Update facing direction
        monster.facing = getFacingDirection(dx, dy);
    }
}

function updateMonster(monster, deltaTime) {
    const stats = MONSTER_STATS[monster.type];
    
    switch (monster.state) {
        case 'idle':
            handleIdleState(monster, stats);
            break;
            
        case 'chasing':
            handleChasingState(monster, stats, deltaTime);
            break;
            
        case 'attacking':
            handleAttackingState(monster, stats);
            break;
            
        case 'dying':
            // Animation state - no logic needed
            break;
    }
    
    monster.lastUpdate = Date.now();
}

function handleIdleState(monster, stats) {
    // Look for players in aggro range
    let nearestPlayer = null;
    let nearestDistance = stats.aggroRange;
    
    for (const [id, player] of players) {
        if (player.hp <= 0) continue; // Don't target dead players
        
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

function handleChasingState(monster, stats, deltaTime) {
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
    moveToward(monster, target, stats.moveSpeed);
}

function handleAttackingState(monster, stats) {
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
        // Apply damage to player
        if (!target.invulnerable) {
            target.hp = Math.max(0, target.hp - stats.damage);
            monster.lastAttack = now;
            
            console.log(`${monster.type} attacks ${target.id} for ${stats.damage} damage (${target.hp}/${target.maxHp} HP)`);
            
            // Notify clients of damage
            io.emit('playerDamaged', {
                playerId: monster.target,
                damage: stats.damage,
                hp: target.hp,
                source: `${monster.type}_${monster.id}`
            });
            
            if (target.hp <= 0) {
                console.log(`Player ${target.id} killed by ${monster.type}`);
                io.emit('playerKilled', {
                    playerId: monster.target,
                    killedBy: monster.type
                });
            }
        }
    }
}

function updateMonsters(deltaTime) {
    for (const monster of monsters.values()) {
        if (monster.state === 'dead') {
            monsters.delete(monster.id);
            continue;
        }
        
        updateMonster(monster, deltaTime);
    }
}

function handlePlayerAttack(player, type) {
    // This function now only handles attack broadcasting
    // Actual damage is handled by individual 'attackMonster' events from client
    console.log(`Player ${player.id} performs ${type} attack`);
}

function checkLevelUp(player) {
    // Simple level up system - every 100 XP = 1 level
    const newLevel = Math.floor(player.xp / 100) + 1;
    const maxLevel = 10;
    
    if (newLevel > player.level && newLevel <= maxLevel) {
        player.level = newLevel;
        
        // Restore HP on level up
        player.hp = player.maxHp;
        
        console.log(`Player ${player.id} leveled up to ${player.level}!`);
        
        // Notify all clients
        io.emit('playerLevelUp', {
            playerId: player.id,
            level: player.level,
            hp: player.hp
        });
    }
}

function handleMonsterDeath(monster, killer) {
    const stats = MONSTER_STATS[monster.type];
    
    // Award XP
    killer.xp = (killer.xp || 0) + stats.xp;
    killer.kills = (killer.kills || 0) + 1;
    
    console.log(`${monster.type} killed by ${killer.id}! +${stats.xp} XP (Total: ${killer.xp})`);
    
    // Check level up
    checkLevelUp(killer);
    
    // Notify all clients
    io.emit('monsterKilled', {
        monsterId: monster.id,
        killedBy: killer.id,
        xpReward: stats.xp,
        killerXp: killer.xp,
        killerLevel: killer.level || 1
    });
    
    // Remove monster after death animation
    monster.state = 'dying';
    setTimeout(() => {
        monsters.delete(monster.id);
    }, 1000); // 1 second death animation
}

io.on('connection', socket => {
    const player = createPlayer(socket.id);
    players.set(socket.id, player);

    socket.emit('init', { id: socket.id, world: WORLD, players: Array.from(players.values()), monsters: Array.from(monsters.values()) });
    socket.broadcast.emit('playerJoined', player);

    socket.on('playerUpdate', data => {
        const p = players.get(socket.id);
        if (!p) return;
        p.x = data.x;
        p.y = data.y;
        p.facing = data.facing;
    });

    socket.on('attack', data => {
        const p = players.get(socket.id);
        if (!p) return;
        handlePlayerAttack(p, data.type);
        io.emit('playerAttack', {
            id: socket.id,
            type: data.type,
            x: p.x,
            y: p.y,
            facing: p.facing
        });
    });

    socket.on('attackMonster', (data) => {
        const player = players.get(socket.id);
        if (!player || player.hp <= 0) return;
        
        const monster = monsters.get(data.monsterId);
        if (!monster || monster.hp <= 0) return;
        
        // Validate attack range
        const distance = getDistance(player, monster);
        const attackRange = data.attackType === 'primary' ? 150 : 200; // Rough validation
        
        if (distance > attackRange) {
            console.log(`Attack out of range: ${distance} > ${attackRange}`);
            return;
        }
        
        // Apply damage
        const damage = data.damage || 1;
        monster.hp = Math.max(0, monster.hp - damage);
        
        console.log(`Player ${player.id} attacks ${monster.type} for ${damage} damage (${monster.hp}/${monster.maxHp} HP)`);
        
        // Broadcast damage effect
        io.emit('monsterDamaged', {
            monsterId: monster.id,
            damage: damage,
            hp: monster.hp,
            attacker: socket.id
        });
        
        // Handle death
        if (monster.hp <= 0) {
            handleMonsterDeath(monster, player);
        }
    });

    socket.on('setClass', cls => {
        const p = players.get(socket.id);
        if (p) p.class = cls;
    });

    socket.on('disconnect', () => {
        players.delete(socket.id);
        socket.broadcast.emit('playerLeft', socket.id);
    });
});

setInterval(() => {
    updateMonsters(1 / TICK_RATE);

    // Respawn dead players
    for (const p of players.values()) {
        if (p.hp <= 0) {
            p.respawnTimer += 1 / TICK_RATE;
            if (p.respawnTimer >= 3) {
                p.hp = p.maxHp; // Respawn with correct max HP
                p.x = WORLD.width * WORLD.tileSize / 2;
                p.y = WORLD.height * WORLD.tileSize / 2;
                p.respawnTimer = 0;
                console.log(`Player ${p.id} respawned with ${p.hp}/${p.maxHp} HP`);
            }
        }
    }

    // Spawn new monsters over time
    spawnTimer += 1 / TICK_RATE;
    if (spawnTimer >= MONSTER_SPAWN_INTERVAL && monsters.size < MAX_MONSTERS) {
        const m = createMonster();
        monsters.set(m.id, m);
        spawnTimer = 0;
    }
    // Only include monsters near players (basic Area of Interest)
    const visibleMonsters = new Map();
    const viewDistance = 1500; // Pixels
    
    for (const [playerId, player] of players) {
        for (const [monsterId, monster] of monsters) {
            const dist = getDistance(player, monster);
            if (dist < viewDistance) {
                visibleMonsters.set(monsterId, monster);
            }
        }
    }
    
    // Format monster data for client
    const monsterData = Array.from(visibleMonsters.values()).map(monster => ({
        id: monster.id,
        type: monster.type,
        x: Math.round(monster.x),
        y: Math.round(monster.y),
        hp: monster.hp,
        maxHp: monster.maxHp,
        state: monster.state,
        facing: monster.facing,
        target: monster.target // For attack animations
    }));
    
    const state = {
        players: Array.from(players.values()),
        monsters: monsterData
    };
    io.emit('state', state);
}, 1000 / TICK_RATE);

// Spawn a few monsters
for (let i = 0; i < 5; i++) {
    const m = createMonster();
    monsters.set(m.id, m);
}

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
