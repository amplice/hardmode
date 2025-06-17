/**
 * LLM_NOTE: Main export file for shared code between client and server.
 * This file re-exports all shared types, constants, and utilities.
 * 
 * ARCHITECTURE_DECISION: Using barrel exports for clean imports in client/server.
 * This allows `import { EntityType, GameConfig } from '@hardmode/shared'`
 */

// Constants
export * from './constants/GameConfig.js';
export * from './constants/NetworkConfig.js';
export * from './constants/PhysicsConfig.js';

// Types
export * from './types/Entity.js';
export * from './types/Network.js';
export * from './types/Game.js';
export * from './types/Player.js';

// ECS Core
export * from './ecs/Component.js';
export * from './ecs/Entity.js';
export * from './ecs/System.js';

// Note: Utils will be added as needed

// Version for compatibility checking
export const SHARED_VERSION = '0.1.0';

// Protocol version for network compatibility
export const PROTOCOL_VERSION = 1;