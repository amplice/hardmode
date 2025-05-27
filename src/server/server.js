import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

const players = {};

io.on('connection', socket => {
    console.log('Client connected', socket.id);

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
