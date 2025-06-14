// Environment variables are loaded by nodemon in development
// and should be loaded before this module in production

// Validate required environment variables
const requiredEnvVars = ['PORT', 'NODE_ENV'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Configuration interface
export interface Config {
  env: 'development' | 'production' | 'test';
  server: {
    port: number;
    host: string;
  };
  websocket: {
    port: number;
    corsOrigin: string | string[];
  };
  game: {
    maxPlayers: number;
    tickRate: number;
    updateRate: number;
  };
  database: {
    url: string;
    poolMin: number;
    poolMax: number;
  };
  security: {
    jwtSecret: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
  logging: {
    level: string;
    enableMetrics: boolean;
  };
  admin: {
    password: string;
  };
}

// Development configuration
const developmentConfig: Config = {
  env: 'development',
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: 'localhost',
  },
  websocket: {
    port: parseInt(process.env.WS_PORT || '3001', 10),
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173',
  },
  game: {
    maxPlayers: parseInt(process.env.MAX_PLAYERS || '100', 10),
    tickRate: parseInt(process.env.TICK_RATE || '60', 10),
    updateRate: parseInt(process.env.UPDATE_RATE || '20', 10),
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/hardmode',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
  },
  admin: {
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
};

// Production configuration
const productionConfig: Config = {
  ...developmentConfig,
  env: 'production',
  server: {
    port: parseInt(process.env.PORT || '80', 10),
    host: '0.0.0.0',
  },
  websocket: {
    port: parseInt(process.env.WS_PORT || '443', 10),
    corsOrigin: process.env.WS_CORS_ORIGIN?.split(',') || '*',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
  },
};

// Test configuration
const testConfig: Config = {
  ...developmentConfig,
  env: 'test',
  server: {
    port: 0, // Random port for testing
    host: 'localhost',
  },
  database: {
    ...developmentConfig.database,
    url: 'postgresql://localhost:5432/hardmode_test',
  },
  logging: {
    level: 'error',
    enableMetrics: false,
  },
};

// Configuration map
const configs = {
  development: developmentConfig,
  production: productionConfig,
  test: testConfig,
};

// Get current environment
const currentEnv = (process.env.NODE_ENV || 'development') as keyof typeof configs;

// Export configuration
export const config: Config = configs[currentEnv];

// Helper functions
export const isDevelopment = () => config.env === 'development';
export const isProduction = () => config.env === 'production';
export const isTest = () => config.env === 'test';

// Log configuration on startup (excluding sensitive data)
if (!isTest()) {
  console.log('Server configuration loaded:', {
    env: config.env,
    serverPort: config.server.port,
    wsPort: config.websocket.port,
    maxPlayers: config.game.maxPlayers,
    tickRate: config.game.tickRate,
  });
}