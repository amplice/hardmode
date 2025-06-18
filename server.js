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

function createPlayer(id, options = {}) {
    return {
        id,
        x: WORLD.width * WORLD.tileSize / 2,
        y: WORLD.height * WORLD.tileSize / 2,
        facing: 'down',
        class: options.class || 'bladedancer',
        hp: 100,
        respawnTimer: 0
    };
}

function createMonster(type = 'skeleton') {
    const id = nextMonsterId++;
    return {
        id,
        x: Math.random() * WORLD.width * WORLD.tileSize,
        y: Math.random() * WORLD.height * WORLD.tileSize,
        type,
        hp: 30,
        target: null
    };
}

function updateMonsters(dt) {
    for (const monster of monsters.values()) {
        if (monster.hp <= 0) {
            monsters.delete(monster.id);
            continue;
        }

        // Acquire nearest player
        let nearest = null;
        let distSq = Infinity;
        for (const p of players.values()) {
            const dx = p.x - monster.x;
            const dy = p.y - monster.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < distSq) {
                nearest = p;
                distSq = d2;
            }
        }
        if (nearest && distSq < 300 * 300) {
            // Move toward player
            const dx = nearest.x - monster.x;
            const dy = nearest.y - monster.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            monster.x += (dx / len) * 50 * dt;
            monster.y += (dy / len) * 50 * dt;

            // Attack if close
            if (len < 40) {
                nearest.hp -= 5;
            }
        } else {
            // Wander randomly
            monster.x += (Math.random() - 0.5) * 20 * dt;
            monster.y += (Math.random() - 0.5) * 20 * dt;
        }
    }
}

function handlePlayerAttack(player, type) {
    const damage = 20;
    const range = 60;
    for (const monster of monsters.values()) {
        if (monster.hp <= 0) continue;
        const dx = monster.x - player.x;
        const dy = monster.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < range) {
            monster.hp -= damage;
        }
    }

    // Optional PvP damage
    for (const other of players.values()) {
        if (other.id === player.id || other.hp <= 0) continue;
        const dx = other.x - player.x;
        const dy = other.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < range) {
            other.hp -= damage;
        }
    }
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
                p.hp = 100;
                p.x = WORLD.width * WORLD.tileSize / 2;
                p.y = WORLD.height * WORLD.tileSize / 2;
                p.respawnTimer = 0;
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
    const state = {
        players: Array.from(players.values()),
        monsters: Array.from(monsters.values())
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
