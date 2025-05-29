import express from 'express';
import http from 'http';
import { GameServer } from './GameServer.mjs';

const app = express();
const server = http.createServer(app);
const gameServer = new GameServer(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Game server listening on port ${PORT}`);
});

setInterval(() => {
    gameServer.update(1 / 20);
}, 50);
