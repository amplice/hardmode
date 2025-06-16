/**
 * LLM_NOTE: Main export file for shared code between client and server.
 * This file re-exports all shared types, constants, and utilities.
 *
 * ARCHITECTURE_DECISION: Using barrel exports for clean imports in client/server.
 * This allows `import { EntityType, GameConfig } from '@hardmode/shared'`
 */
export * from './constants/GameConfig.js';
export * from './constants/NetworkConfig.js';
export * from './constants/PhysicsConfig.js';
export * from './types/Entity.js';
export * from './types/Network.js';
export * from './types/Game.js';
export * from './types/Player.js';
export * from './ecs/Component.js';
export * from './ecs/Entity.js';
export * from './ecs/System.js';
export declare const SHARED_VERSION = "0.1.0";
export declare const PROTOCOL_VERSION = 1;
//# sourceMappingURL=index.d.ts.map