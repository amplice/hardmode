/**
 * ServerWorldManager - Centralized world data generation and management
 * 
 * Generates world data once on server startup and provides it to all systems
 * that need it (InputProcessor, MonsterManager, etc.)
 * 
 * Eliminates duplicate world generation while ensuring consistent data.
 */
import { SharedWorldGenerator } from '../../shared/systems/WorldGenerator.js';
import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';

export class ServerWorldManager {
    constructor(worldSeed) {
        this.worldSeed = worldSeed;
        this.worldGen = null;
        this.worldData = null;
        this.initialized = false;
        
        console.log(`[ServerWorldManager] Initializing with seed: ${worldSeed}`);
    }
    
    /**
     * Initialize world generation - called once on server startup
     */
    initialize() {
        if (this.initialized) {
            console.warn('[ServerWorldManager] Already initialized, skipping...');
            return;
        }
        
        console.log('[ServerWorldManager] Generating world data...');
        
        // Create the shared world generator
        this.worldGen = new SharedWorldGenerator(
            GAME_CONSTANTS.WORLD.WIDTH,
            GAME_CONSTANTS.WORLD.HEIGHT,
            this.worldSeed
        );
        
        // Generate world data once
        this.worldData = this.worldGen.generateWorld();
        
        this.initialized = true;
        
        console.log('[ServerWorldManager] World generation complete:');
        console.log(`  - Seed: ${this.worldSeed}`);
        console.log(`  - Size: ${GAME_CONSTANTS.WORLD.WIDTH}x${GAME_CONSTANTS.WORLD.HEIGHT}`);
        console.log(`  - Biomes: ${this.worldData.biomeData.length} rows`);
        console.log(`  - Elevated tiles: ${this.countElevatedTiles()}`);
        console.log(`  - Stairs placed: ${this.countStairs()}`);
    }
    
    /**
     * Get the world generator instance (for collision mask generation)
     */
    getWorldGenerator() {
        if (!this.initialized) {
            throw new Error('[ServerWorldManager] Not initialized - call initialize() first');
        }
        return this.worldGen;
    }
    
    /**
     * Get the generated world data
     */
    getWorldData() {
        if (!this.initialized) {
            throw new Error('[ServerWorldManager] Not initialized - call initialize() first');
        }
        return this.worldData;
    }
    
    /**
     * Get world seed for client transmission
     */
    getWorldSeed() {
        return this.worldSeed;
    }
    
    /**
     * Count elevated tiles for statistics
     */
    countElevatedTiles() {
        if (!this.worldData) return 0;
        
        let count = 0;
        for (let y = 0; y < GAME_CONSTANTS.WORLD.HEIGHT; y++) {
            for (let x = 0; x < GAME_CONSTANTS.WORLD.WIDTH; x++) {
                if (this.worldData.elevationData[y][x] > 0) {
                    count++;
                }
            }
        }
        return count;
    }
    
    /**
     * Count stairs for statistics
     */
    countStairs() {
        if (!this.worldData) return 0;
        
        let count = 0;
        for (let y = 0; y < GAME_CONSTANTS.WORLD.HEIGHT; y++) {
            for (let x = 0; x < GAME_CONSTANTS.WORLD.WIDTH; x++) {
                if (this.worldData.stairsData[y][x]) {
                    count++;
                }
            }
        }
        return count;
    }
    
    /**
     * Get world statistics for debugging
     */
    getWorldStats() {
        if (!this.initialized) {
            return { error: 'Not initialized' };
        }
        
        return {
            seed: this.worldSeed,
            dimensions: {
                width: GAME_CONSTANTS.WORLD.WIDTH,
                height: GAME_CONSTANTS.WORLD.HEIGHT
            },
            elevatedTiles: this.countElevatedTiles(),
            stairs: this.countStairs(),
            initialized: this.initialized
        };
    }
}