// Simple server configuration
const env = process.env;

export const config = {
  env: env.NODE_ENV || 'development',
  
  server: {
    port: parseInt(env.PORT || '3000', 10),
    host: env.HOST || '0.0.0.0',
  },
  
  websocket: {
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
  },
  
  game: {
    tickRate: 60,        // Server tick rate (Hz)
    updateRate: 20,      // Network update rate (Hz)
    maxPlayers: 100,     // Maximum concurrent players
    playerTimeout: 30000, // Player timeout in milliseconds
    worldSeed: env.WORLD_SEED || 'hardmode-mmo-seed-12345', // World generation seed
    worldSize: {
      width: 100,
      height: 100,
      tileSize: 64,
    },
  },
  
  logging: {
    level: env.LOG_LEVEL || 'info',
  },
} as const;

export const isDevelopment = () => config.env === 'development';
export const isProduction = () => config.env === 'production';