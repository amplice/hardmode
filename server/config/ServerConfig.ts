/**
 * @fileoverview Server-side configuration with environment variable support
 * 
 * ARCHITECTURE ROLE:
 * - Centralizes server configuration with environment variable overrides
 * - Provides type-safe configuration access across server components
 * - Supports debug flags and feature toggles for development/production
 * - Integrates with deployment environment configuration systems
 * 
 * ENVIRONMENT INTEGRATION:
 * - All settings can be overridden via environment variables
 * - Debug flags default to false for production safety
 * - Feature toggles enable/disable functionality per deployment
 * - Environment-specific configuration without code changes
 * 
 * USAGE PATTERN:
 * ```typescript
 * import { SERVER_CONFIG } from '../config/ServerConfig.js';
 * 
 * if (SERVER_CONFIG.DEBUG.ENABLE_COMBAT_LOGGING) {
 *   console.log('Combat event:', eventData);
 * }
 * ```
 * 
 * DEPLOYMENT CONSIDERATIONS:
 * - Production should set environment variables explicitly
 * - Debug flags should remain false in production
 * - Feature toggles allow gradual rollout of new functionality
 * - Configuration changes don't require code deployment
 */

// Debug configuration structure
interface DebugConfig {
    USE_DEBUG_TILESET: boolean;
    ENABLE_TILE_LOGGING: boolean;
    ENABLE_MONSTER_LOGGING: boolean;
    ENABLE_COMBAT_LOGGING: boolean;
}

// Feature toggle configuration
interface FeatureConfig {
    PLAYTEST_MODE: boolean;
    ENABLE_PVP: boolean;
}

// Complete server configuration structure
interface ServerConfigType {
    DEBUG: DebugConfig;
    FEATURES: FeatureConfig;
}

// Server-side configuration with environment variable support
export const SERVER_CONFIG: ServerConfigType = {
    // Debug settings (controlled by environment variables)
    DEBUG: {
        USE_DEBUG_TILESET: process.env.DEBUG_TILESET === 'true' || false,
        ENABLE_TILE_LOGGING: process.env.DEBUG_TILE_LOGGING === 'true' || false,
        ENABLE_MONSTER_LOGGING: process.env.DEBUG_MONSTER_LOGGING === 'true' || false,
        ENABLE_COMBAT_LOGGING: process.env.DEBUG_COMBAT_LOGGING === 'true' || false
    },
    
    // Game feature toggles
    FEATURES: {
        PLAYTEST_MODE: process.env.PLAYTEST_MODE === 'true' || false,
        ENABLE_PVP: process.env.ENABLE_PVP === 'true' || false
    }
};