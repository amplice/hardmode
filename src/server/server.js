import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import seedrandom from 'seedrandom';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

// Use a deterministic seed for the world so all clients share the same layout
const worldSeed = Math.floor(seedrandom()() * 1e8).toString();

const players = {};

io.on('connection', socket => {
    console.log('Client connected', socket.id);

    // Send world seed and existing players to the newly connected client
    socket.emit('worldInit', { seed: worldSeed, players });

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

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

setInterval(() => {
    io.emit('worldState', players);
}, 100);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
