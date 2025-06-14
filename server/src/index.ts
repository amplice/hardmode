import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config, isDevelopment } from './config/index';
import { setupMiddleware } from './middleware/index';
import { setupRoutes } from './routes/index';
import { logger } from './utils/logger';
import { setupSocketServer } from './network/socketServer';

// Create Express app
const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.websocket.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 30000,
  transports: ['websocket', 'polling'],
});

// Setup Socket.IO server
setupSocketServer(io);

// Setup middleware
setupMiddleware(app);

// Setup routes
setupRoutes(app);

// Error handling middleware (must be last)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment() ? err.message : undefined,
  });
});

// Handle 404
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start server
httpServer.listen(config.server.port, config.server.host, () => {
  logger.info(`🚀 Server running at http://${config.server.host}:${config.server.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Max players: ${config.game.maxPlayers}`);
  logger.info(`Tick rate: ${config.game.tickRate} Hz`);
});

export { httpServer, app };