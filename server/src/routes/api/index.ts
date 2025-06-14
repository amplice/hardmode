import { Router } from 'express';
import { config } from '../../config/index';

export const apiRouter = Router();

// API version and info
apiRouter.get('/', (_req, res) => {
  res.json({
    version: 'v1',
    endpoints: {
      health: '/health',
      websocket: `ws://localhost:${config.websocket.port}`,
    },
  });
});

// Placeholder for future API endpoints
apiRouter.get('/stats', (_req, res) => {
  res.json({
    players: {
      online: 0,
      max: config.game.maxPlayers,
    },
    server: {
      tickRate: config.game.tickRate,
      updateRate: config.game.updateRate,
    },
  });
});