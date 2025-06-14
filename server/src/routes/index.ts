import { Application } from 'express';
import { healthRouter } from './health';
import { apiRouter } from './api/index';

export function setupRoutes(app: Application): void {
  // Health check routes
  app.use('/health', healthRouter);
  
  // API routes
  app.use('/api', apiRouter);
  
  // Root route
  app.get('/', (_req, res) => {
    res.json({
      name: 'Hardmode Game Server',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    });
  });
}