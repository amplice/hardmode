// Server-side configuration with environment variable support
export const SERVER_CONFIG = {
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