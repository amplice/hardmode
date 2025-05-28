import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import seedrandom from 'seedrandom';
import { MonsterSystem } from './game/MonsterSystem.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

// Use a deterministic seed for the world so all clients share the same layout
const worldSeed = Math.floor(seedrandom()() * 1e8).toString();

const players = {};
const monsterSystem = new MonsterSystem(worldSeed);

io.on('connection', socket => {
    console.log('Client connected', socket.id);

    // Send world seed and existing players to the newly connected client
    socket.emit('worldInit', { seed: worldSeed, players, monsters: monsterSystem.getState() });

    socket.on('join', data => {
        players[socket.id] = {
            id: socket.id,
            x: 0,
            y: 0,
            facing: 'down',
            class: data?.class || 'bladedancer'
        };
        io.emit('playerJoined', players[socket.id]);
    });

    socket.on('state', state => {
        if (players[socket.id]) {
            players[socket.id].x = state.x;
            players[socket.id].y = state.y;
            players[socket.id].facing = state.facing;
        }
    });

    socket.on('playerAction', action => {
        action.id = socket.id;
        socket.broadcast.emit('playerAction', action);
    });


    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

setInterval(() => {
    monsterSystem.update(0.1, players);
    io.emit('worldState', { players, monsters: monsterSystem.getState() });
}, 100);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
