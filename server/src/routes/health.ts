import { Router } from 'express';
import os from 'os';
import { config } from '../config/index';

export const healthRouter = Router();

// Basic health check
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// Detailed health check
healthRouter.get('/detailed', (_req, res) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      environment: config.env,
      nodeVersion: process.version,
      pid: process.pid,
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
    },
    process: {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    },
    config: {
      maxPlayers: config.game.maxPlayers,
      tickRate: config.game.tickRate,
      updateRate: config.game.updateRate,
    },
  });
});

// Liveness probe (for k8s)
healthRouter.get('/live', (_req, res) => {
  res.status(200).send('OK');
});

// Readiness probe (for k8s)
healthRouter.get('/ready', (_req, res) => {
  // TODO: Add checks for database connection, etc.
  const isReady = true;
  
  if (isReady) {
    res.status(200).send('OK');
  } else {
    res.status(503).send('Not Ready');
  }
});