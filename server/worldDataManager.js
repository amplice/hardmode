import { createNoise2D } from 'simplex-noise';

// This module is responsible for generating the core world tile data on the server.
// It mirrors the essential data generation logic from the client's WorldGenerator,
// but without any PixiJS rendering dependencies.

class WorldDataManager {
    constructor(options = {}) {
        this.width = options.width || 100;
        this.height = options.height || 100;
        this.tileSize = options.tileSize || 64; // Store tileSize for client reference
        this.noise2D = createNoise2D(); // Main terrain noise
        this.waterNoise2D = createNoise2D(Math.random); // Separate noise for water
        this.tiles = []; // 2D array for tile types ['grass', 'sand', 'water']
    }

    generateWorldData() {
        // Configuration parameters (mirrored from client's WorldGenerator for consistency)
        const params = {
            noise: {
                terrain: 0.05,
                water: 0.08
            },
            thresholds: {
                sand: -0.3,
                water: -0.5,
                sandDistance: 3, // Used in isFarEnoughFromSand
                cardinalCleanup: 3, // For cleanupIsolatedSand
                waterCleanup: 2 // For cleanupThinWaterConnections
            }
        };

        console.log("Server: Generating base world data...");
        this._generateBaseTerrain(params);
        this._cleanupIsolatedSand(params.thresholds.cardinalCleanup);
        this._generateWater(params);
        this._cleanupGrassPeninsulas();
        this._cleanupThinWaterConnections(params.thresholds.waterCleanup);

        console.log("Server: World data generation complete!");
        return {
            width: this.width,
            height: this.height,
            tileSize: this.tileSize,
            tiles: this.tiles // The 2D array of tile types
        };
    }

    _getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null; // Out of bounds
        }
        return this.tiles[y][x];
    }

    _setTile(x, y, type) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.tiles[y][x] = type;
        }
    }

    _generateBaseTerrain(params) {
        console.log("Server: Generating base terrain...");
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                const noiseValue = this.noise2D(x * params.noise.terrain, y * params.noise.terrain);
                const terrainType = noiseValue < params.thresholds.sand ? 'sand' : 'grass';
                this.tiles[y][x] = terrainType;
            }
        }
    }

    _cleanupIsolatedSand(threshold) {
        console.log("Server: Cleaning up isolated sand tiles...");
        const tilesToConvert = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this._getTile(x,y) === 'sand') {
                    const cardinalNeighbors = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
                    let grassCount = 0;
                    for (const dir of cardinalNeighbors) {
                        if (this._getTile(x + dir.dx, y + dir.dy) === 'grass') {
                            grassCount++;
                        }
                    }
                    if (grassCount >= threshold) {
                        tilesToConvert.push({ x, y });
                    }
                }
            }
        }
        for (const pos of tilesToConvert) {
            this._setTile(pos.x, pos.y, 'grass');
        }
        console.log(`Server: Converted ${tilesToConvert.length} isolated sand tiles to grass.`);
    }

    _isFarEnoughFromSand(x, y, distance) {
        for (let dy = -distance; dy <= distance; dy++) {
            for (let dx = -distance; dx <= distance; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                const tileType = this._getTile(nx, ny);
                if (tileType === 'sand' && (Math.abs(dx) + Math.abs(dy) <= distance)) {
                    return false;
                }
            }
        }
        return true;
    }

    _generateWater(params) {
        console.log("Server: Generating water tiles...");
        const waterTilesPositions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this._getTile(x,y) === 'grass') {
                    const waterNoise = this.waterNoise2D(x * params.noise.water, y * params.noise.water);
                    if (waterNoise < params.thresholds.water && this._isFarEnoughFromSand(x, y, params.thresholds.sandDistance)) {
                        waterTilesPositions.push({ x, y });
                    }
                }
            }
        }
        for (const pos of waterTilesPositions) {
            this._setTile(pos.x, pos.y, 'water');
        }
        console.log(`Server: Created ${waterTilesPositions.length} water tiles.`);
    }

    _cleanupGrassPeninsulas() {
        console.log("Server: Cleaning up grass peninsulas...");
        let count = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this._getTile(x,y) === 'grass') {
                    const neighbors = {
                        n: this._getTile(x, y - 1) === 'water',
                        e: this._getTile(x + 1, y) === 'water',
                        s: this._getTile(x, y + 1) === 'water',
                        w: this._getTile(x - 1, y) === 'water'
                    };
                    const waterCount = Object.values(neighbors).filter(v => v).length;
                    if (waterCount >= 3) { // Changed to >=3 to match common peninsula definitions
                        this._setTile(x,y,'water');
                        count++;
                    }
                }
            }
        }
        console.log(`Server: Converted ${count} grass peninsula tiles to water.`);
    }

    _cleanupThinWaterConnections(threshold) {
        console.log("Server: Cleaning up thin water connections...");
        const tilesToConvert = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this._getTile(x,y) === 'water') {
                    let waterNeighborCount = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            if (this._getTile(x + dx, y + dy) === 'water') {
                                waterNeighborCount++;
                            }
                        }
                    }
                    if (waterNeighborCount <= threshold) {
                        tilesToConvert.push({ x, y });
                    }
                }
            }
        }
        for (const pos of tilesToConvert) {
            this._setTile(pos.x, pos.y, 'grass');
        }
        console.log(`Server: Converted ${tilesToConvert.length} thin water tiles to grass.`);
    }
}

// Export a function to be called by server.js
export function generateWorld(config) {
    const manager = new WorldDataManager(config);
    return manager.generateWorldData();
}
