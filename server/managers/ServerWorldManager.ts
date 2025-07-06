/**
 * @fileoverview ServerWorldManager - Centralized world data generation with defensive programming
 * 
 * SAFETY MEASURES:
 * - Extensive parameter validation to prevent undefined/null crashes
 * - Runtime type checking for all inputs
 * - Graceful error handling with logging
 * - Default values for all operations
 * - Initialization state tracking to prevent double-initialization
 * 
 * ARCHITECTURE ROLE:
 * - Generates world data once on server startup and provides it to all systems
 * - Eliminates duplicate world generation while ensuring consistent data
 * - Provides world generator instance for collision mask generation
 * - Centralized world statistics and debugging information
 * 
 * MIGRATION SAFETY:
 * - This TypeScript version implements identical behavior to the JavaScript version
 * - All method signatures match exactly
 * - Added defensive checks for undefined/null parameters
 * - Extensive logging for debugging potential issues
 */

import { SharedWorldGenerator } from '../../shared/systems/WorldGenerator.js';
import { GAME_CONSTANTS } from '../../shared/constants/GameConstants.js';

// World data structure from SharedWorldGenerator
interface WorldData {
    biomeData: number[][];
    elevationData: number[][];
    stairsData: boolean[][];
    [key: string]: any;
}

// World statistics interface
interface WorldStats {
    seed: number;
    dimensions: {
        width: number;
        height: number;
    };
    elevatedTiles: number;
    stairs: number;
    initialized: boolean;
}

// Error state for world statistics
interface WorldStatsError {
    error: string;
}

export class ServerWorldManager {
    private worldSeed: number;
    private worldGen: SharedWorldGenerator | null;
    private worldData: WorldData | null;
    private initialized: boolean;

    constructor(worldSeed: number) {
        // Defensive parameter validation
        if (typeof worldSeed !== 'number' || isNaN(worldSeed)) {
            console.error('[ServerWorldManager] Invalid worldSeed provided, using default:', worldSeed);
            this.worldSeed = Math.floor(Math.random() * 1000000);
        } else {
            this.worldSeed = worldSeed;
        }
        
        this.worldGen = null;
        this.worldData = null;
        this.initialized = false;
        
        console.log(`[ServerWorldManager] Initializing with seed: ${this.worldSeed}`);
        console.log('[ServerWorldManager] TypeScript version loaded with defensive programming');
    }
    
    /**
     * Initialize world generation - called once on server startup with defensive programming
     */
    initialize(): void {
        if (this.initialized) {
            console.warn('[ServerWorldManager] Already initialized, skipping...');
            return;
        }
        
        try {
            console.log('[ServerWorldManager] Generating world data...');
            
            // Validate game constants before using them
            const worldWidth = GAME_CONSTANTS?.WORLD?.WIDTH;
            const worldHeight = GAME_CONSTANTS?.WORLD?.HEIGHT;
            
            if (typeof worldWidth !== 'number' || typeof worldHeight !== 'number' || worldWidth <= 0 || worldHeight <= 0) {
                console.error('[ServerWorldManager] Invalid world dimensions in GAME_CONSTANTS:', { worldWidth, worldHeight });
                throw new Error('Invalid world dimensions in GAME_CONSTANTS');
            }
            
            // Create the shared world generator with validation
            this.worldGen = new SharedWorldGenerator(
                worldWidth,
                worldHeight,
                this.worldSeed
            );
            
            if (!this.worldGen) {
                throw new Error('Failed to create SharedWorldGenerator');
            }
            
            // Generate world data once
            this.worldData = this.worldGen.generateWorld();
            
            if (!this.worldData) {
                throw new Error('Failed to generate world data');
            }
            
            // Validate world data structure
            if (!this.worldData.biomeData || !this.worldData.elevationData || !this.worldData.stairsData) {
                throw new Error('Invalid world data structure - missing required properties');
            }
            
            this.initialized = true;
            
            console.log('[ServerWorldManager] World generation complete:');
            console.log(`  - Seed: ${this.worldSeed}`);
            console.log(`  - Size: ${worldWidth}x${worldHeight}`);
            console.log(`  - Biomes: ${this.worldData.biomeData.length} rows`);
            console.log(`  - Elevated tiles: ${this.countElevatedTiles()}`);
            console.log(`  - Stairs placed: ${this.countStairs()}`);
        } catch (error) {
            console.error('[ServerWorldManager] Error during initialization:', error);
            // Reset state on error
            this.worldGen = null;
            this.worldData = null;
            this.initialized = false;
            throw error; // Re-throw to let caller handle
        }
    }
    
    /**
     * Get the world generator instance (for collision mask generation) with defensive programming
     */
    getWorldGenerator(): SharedWorldGenerator {
        if (!this.initialized) {
            const error = '[ServerWorldManager] Not initialized - call initialize() first';
            console.error(error);
            throw new Error(error);
        }
        
        if (!this.worldGen) {
            const error = '[ServerWorldManager] World generator is null despite being initialized';
            console.error(error);
            throw new Error(error);
        }
        
        return this.worldGen;
    }
    
    /**
     * Get the generated world data with defensive programming
     */
    getWorldData(): WorldData {
        if (!this.initialized) {
            const error = '[ServerWorldManager] Not initialized - call initialize() first';
            console.error(error);
            throw new Error(error);
        }
        
        if (!this.worldData) {
            const error = '[ServerWorldManager] World data is null despite being initialized';
            console.error(error);
            throw new Error(error);
        }
        
        return this.worldData;
    }
    
    /**
     * Get world seed for client transmission with defensive programming
     */
    getWorldSeed(): number {
        return this.worldSeed;
    }
    
    /**
     * Count elevated tiles for statistics with defensive programming
     */
    countElevatedTiles(): number {
        if (!this.worldData) {
            console.warn('[ServerWorldManager] No world data available for elevated tile count');
            return 0;
        }
        
        try {
            const worldWidth = GAME_CONSTANTS?.WORLD?.WIDTH || 0;
            const worldHeight = GAME_CONSTANTS?.WORLD?.HEIGHT || 0;
            
            if (worldWidth <= 0 || worldHeight <= 0) {
                console.warn('[ServerWorldManager] Invalid world dimensions for counting');
                return 0;
            }
            
            let count = 0;
            for (let y = 0; y < worldHeight; y++) {
                if (!this.worldData.elevationData[y]) {
                    console.warn(`[ServerWorldManager] Missing elevation data for row ${y}`);
                    continue;
                }
                
                for (let x = 0; x < worldWidth; x++) {
                    const elevation = this.worldData.elevationData[y][x];
                    if (typeof elevation === 'number' && elevation > 0) {
                        count++;
                    }
                }
            }
            return count;
        } catch (error) {
            console.error('[ServerWorldManager] Error counting elevated tiles:', error);
            return 0;
        }
    }
    
    /**
     * Count stairs for statistics with defensive programming
     */
    countStairs(): number {
        if (!this.worldData) {
            console.warn('[ServerWorldManager] No world data available for stairs count');
            return 0;
        }
        
        try {
            const worldWidth = GAME_CONSTANTS?.WORLD?.WIDTH || 0;
            const worldHeight = GAME_CONSTANTS?.WORLD?.HEIGHT || 0;
            
            if (worldWidth <= 0 || worldHeight <= 0) {
                console.warn('[ServerWorldManager] Invalid world dimensions for counting');
                return 0;
            }
            
            let count = 0;
            for (let y = 0; y < worldHeight; y++) {
                if (!this.worldData.stairsData[y]) {
                    console.warn(`[ServerWorldManager] Missing stairs data for row ${y}`);
                    continue;
                }
                
                for (let x = 0; x < worldWidth; x++) {
                    if (this.worldData.stairsData[y][x] === true) {
                        count++;
                    }
                }
            }
            return count;
        } catch (error) {
            console.error('[ServerWorldManager] Error counting stairs:', error);
            return 0;
        }
    }
    
    /**
     * Get world statistics for debugging with defensive programming
     */
    getWorldStats(): WorldStats | WorldStatsError {
        if (!this.initialized) {
            return { error: 'Not initialized' };
        }
        
        try {
            const worldWidth = GAME_CONSTANTS?.WORLD?.WIDTH || 0;
            const worldHeight = GAME_CONSTANTS?.WORLD?.HEIGHT || 0;
            
            return {
                seed: this.worldSeed,
                dimensions: {
                    width: worldWidth,
                    height: worldHeight
                },
                elevatedTiles: this.countElevatedTiles(),
                stairs: this.countStairs(),
                initialized: this.initialized
            };
        } catch (error) {
            console.error('[ServerWorldManager] Error getting world stats:', error);
            return { error: 'Error generating statistics' };
        }
    }
}