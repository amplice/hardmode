/**
 * LLM_NOTE: Physics and collision configuration for the game world.
 * These values define movement mechanics, collision boundaries, and spatial calculations.
 *
 * EXACT_BEHAVIOR: All values are extracted from the original single-player game
 * to ensure identical physics behavior in multiplayer.
 */
export declare const MOVEMENT_PHYSICS: {
    readonly FRAME_RATE: 60;
    readonly PIXELS_PER_FRAME: 1;
    readonly MAX_SPEED_TOLERANCE: 1.1;
    readonly POSITION_SYNC_THRESHOLD: 5;
    readonly WALL_SLIDE_ENABLED: true;
    readonly ENTITY_COLLISION_ENABLED: false;
    readonly FIXED_TIMESTEP: number;
    readonly MAX_DELTA_TIME: 0.1;
};
export declare const WORLD_BOUNDS: {
    readonly MIN_X: 0;
    readonly MIN_Y: 0;
    readonly MAX_X: number;
    readonly MAX_Y: number;
    readonly SPAWN_X: number;
    readonly SPAWN_Y: number;
};
export declare const COLLISION_CONFIG: {
    readonly TILE_SIZE: 64;
    readonly WALKABLE_TILES: readonly ["grass", "sand"];
    readonly BLOCKING_TILES: readonly ["water"];
    readonly PLAYER_COLLISION_RADIUS: 16;
    readonly MONSTER_COLLISION_RADIUS: {
        readonly ogre: 35;
        readonly skeleton: 15;
        readonly elemental: 15;
        readonly ghoul: 10;
        readonly wildarcher: 15;
    };
    readonly PROJECTILE_COLLISION_WIDTH: 10;
    readonly PROJECTILE_COLLISION_LENGTH: 30;
};
export declare const SPATIAL_CONFIG: {
    readonly GRID_CELL_SIZE: 200;
    readonly CHUNK_SIZE: 16;
    readonly CHUNK_LOAD_RADIUS: 3;
    readonly MAX_QUERY_RADIUS: 2000;
    readonly ENTITY_ACTIVATION_DISTANCE: 1500;
};
export declare const HITBOX_CONFIG: {
    readonly DEBUG_HITBOXES: false;
    readonly DEBUG_HITBOX_COLOR: 16711680;
    readonly DEBUG_HITBOX_ALPHA: 0.3;
    readonly MIN_HITBOX_SIZE: 10;
    readonly MAX_HITBOX_SIZE: 500;
    readonly HITBOX_BUFFER_TIME: 250;
    readonly HITBOX_INTERPOLATION: true;
};
export declare const DIRECTION_CONFIG: {
    readonly DIRECTIONS: readonly ["up", "up-right", "right", "down-right", "down", "down-left", "left", "up-left"];
    readonly DIRECTION_ANGLES: {
        readonly right: {
            readonly min: 337.5;
            readonly max: 22.5;
        };
        readonly 'down-right': {
            readonly min: 22.5;
            readonly max: 67.5;
        };
        readonly down: {
            readonly min: 67.5;
            readonly max: 112.5;
        };
        readonly 'down-left': {
            readonly min: 112.5;
            readonly max: 157.5;
        };
        readonly left: {
            readonly min: 157.5;
            readonly max: 202.5;
        };
        readonly 'up-left': {
            readonly min: 202.5;
            readonly max: 247.5;
        };
        readonly up: {
            readonly min: 247.5;
            readonly max: 292.5;
        };
        readonly 'up-right': {
            readonly min: 292.5;
            readonly max: 337.5;
        };
    };
    readonly FORWARD_ANGLE_THRESHOLD: number;
    readonly BACKWARD_ANGLE_THRESHOLD: number;
};
export declare const PROJECTILE_CONFIG: {
    readonly MAX_PROJECTILES: 1000;
    readonly PROJECTILE_CLEANUP_INTERVAL: 100;
    readonly HUNTER_ARROW: {
        readonly speed: 700;
        readonly range: 600;
        readonly piercing: false;
    };
    readonly WILDARCHER_ARROW: {
        readonly speed: 600;
        readonly range: 500;
        readonly piercing: false;
    };
};
export type Direction = typeof DIRECTION_CONFIG.DIRECTIONS[number];
export type WalkableTile = typeof COLLISION_CONFIG.WALKABLE_TILES[number];
export type BlockingTile = typeof COLLISION_CONFIG.BLOCKING_TILES[number];
//# sourceMappingURL=PhysicsConfig.d.ts.map