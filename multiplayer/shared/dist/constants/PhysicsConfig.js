/**
 * LLM_NOTE: Physics and collision configuration for the game world.
 * These values define movement mechanics, collision boundaries, and spatial calculations.
 *
 * EXACT_BEHAVIOR: All values are extracted from the original single-player game
 * to ensure identical physics behavior in multiplayer.
 */
import { WORLD_CONFIG } from './GameConfig.js';
// Movement physics
export const MOVEMENT_PHYSICS = {
    // Base movement (before any modifiers)
    FRAME_RATE: 60, // Game runs at 60 FPS
    PIXELS_PER_FRAME: 1, // Movement is calculated per frame
    // Movement validation tolerances
    MAX_SPEED_TOLERANCE: 1.1, // Allow 10% over max speed for network lag
    POSITION_SYNC_THRESHOLD: 5, // Resync if position differs by more than 5 pixels
    // Collision
    WALL_SLIDE_ENABLED: true, // Players slide along walls rather than stopping
    ENTITY_COLLISION_ENABLED: false, // Players don't collide with each other
    // Physics step
    FIXED_TIMESTEP: 1 / 60, // 60Hz physics updates
    MAX_DELTA_TIME: 0.1, // Maximum 100ms frame time to prevent spiral of death
};
// World boundaries
export const WORLD_BOUNDS = {
    MIN_X: 0,
    MIN_Y: 0,
    MAX_X: WORLD_CONFIG.width * WORLD_CONFIG.tileSize, // 100 * 64 = 6400
    MAX_Y: WORLD_CONFIG.height * WORLD_CONFIG.tileSize, // 100 * 64 = 6400
    // Spawn location (world center)
    SPAWN_X: (WORLD_CONFIG.width / 2) * WORLD_CONFIG.tileSize, // 50 * 64 = 3200
    SPAWN_Y: (WORLD_CONFIG.height / 2) * WORLD_CONFIG.tileSize, // 50 * 64 = 3200
};
// Collision detection
export const COLLISION_CONFIG = {
    // Tile-based collision
    TILE_SIZE: WORLD_CONFIG.tileSize, // 64 pixels
    WALKABLE_TILES: ['grass', 'sand'],
    BLOCKING_TILES: ['water'],
    // Entity collision radii (for entity-to-entity, if enabled)
    PLAYER_COLLISION_RADIUS: 16,
    MONSTER_COLLISION_RADIUS: {
        ogre: 35,
        skeleton: 15,
        elemental: 15,
        ghoul: 10,
        wildarcher: 15,
    },
    // Projectile collision
    PROJECTILE_COLLISION_WIDTH: 10,
    PROJECTILE_COLLISION_LENGTH: 30,
};
// Spatial optimization
export const SPATIAL_CONFIG = {
    // Spatial hash grid for efficient queries
    GRID_CELL_SIZE: 200, // 200x200 pixel cells
    // Chunk system for world streaming
    CHUNK_SIZE: 16, // 16x16 tiles per chunk
    CHUNK_LOAD_RADIUS: 3, // Load 3 chunks in each direction from player
    // Query optimization
    MAX_QUERY_RADIUS: 2000, // Maximum radius for spatial queries
    ENTITY_ACTIVATION_DISTANCE: 1500, // Distance at which entities become active
};
// Attack hitbox configurations
export const HITBOX_CONFIG = {
    // Debug visualization
    DEBUG_HITBOXES: false, // Show hitbox outlines
    DEBUG_HITBOX_COLOR: 0xFF0000, // Red color for debug hitboxes
    DEBUG_HITBOX_ALPHA: 0.3, // 30% opacity
    // Hitbox validation
    MIN_HITBOX_SIZE: 10, // Minimum hitbox dimension
    MAX_HITBOX_SIZE: 500, // Maximum hitbox dimension
    // Lag compensation
    HITBOX_BUFFER_TIME: 250, // Store hitbox positions for 250ms
    HITBOX_INTERPOLATION: true, // Interpolate hitbox positions between updates
};
// Direction and angle calculations
export const DIRECTION_CONFIG = {
    // 8-directional movement
    DIRECTIONS: ['up', 'up-right', 'right', 'down-right', 'down', 'down-left', 'left', 'up-left'],
    // Angle ranges for each direction (in degrees)
    DIRECTION_ANGLES: {
        'right': { min: 337.5, max: 22.5 },
        'down-right': { min: 22.5, max: 67.5 },
        'down': { min: 67.5, max: 112.5 },
        'down-left': { min: 112.5, max: 157.5 },
        'left': { min: 157.5, max: 202.5 },
        'up-left': { min: 202.5, max: 247.5 },
        'up': { min: 247.5, max: 292.5 },
        'up-right': { min: 292.5, max: 337.5 },
    },
    // Movement angle thresholds (in radians)
    FORWARD_ANGLE_THRESHOLD: Math.PI / 4, // 45 degrees
    BACKWARD_ANGLE_THRESHOLD: 3 * Math.PI / 4, // 135 degrees
};
// Projectile physics
export const PROJECTILE_CONFIG = {
    // General projectile settings
    MAX_PROJECTILES: 1000, // Maximum projectiles in world
    PROJECTILE_CLEANUP_INTERVAL: 100, // Check for expired projectiles every 100ms
    // Projectile specific speeds and ranges (from GameConfig)
    HUNTER_ARROW: {
        speed: 700, // pixels per second
        range: 600, // maximum distance
        piercing: false, // doesn't go through enemies
    },
    WILDARCHER_ARROW: {
        speed: 600, // pixels per second
        range: 500, // maximum distance
        piercing: false,
    },
};
//# sourceMappingURL=PhysicsConfig.js.map