import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';

export class WorldGenerator {
    constructor(options = {}) {
        this.width = options.width || 50;
        this.height = options.height || 50;
        this.tileSize = options.tileSize || 64;
        this.seed = options.seed || Math.random().toString();
        
        this.tiles = [];
        this.container = new PIXI.Container();
        
        // Create noise generator
        this.noise2D = createNoise2D();
    }
    
    generate() {
        const scale = 0.1; // Adjust this to change terrain features size
        
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            
            for (let x = 0; x < this.width; x++) {
                // Generate heightmap using simplex noise
                const heightValue = this.noise2D(x * scale, y * scale);
                // Generate moisture map using different octave
                const moistureValue = this.noise2D(x * scale + 1000, y * scale + 1000);                
                
                // Determine tile type based on height and moisture
                let tileType;
                
                if (heightValue < -0.3) {
                    tileType = 'water';
                } else if (heightValue < -0.1) {
                    tileType = 'sand';
                } else if (heightValue > 0.5 && moistureValue < 0) {
                    tileType = 'rock';
                } else if (heightValue > 0.2 && moistureValue > 0.2) {
                    // Random chance for trees
                    tileType = Math.random() < 0.4 ? 'tree' : 'grass';
                } else {
                    tileType = 'grass';
                }
                
                const tile = new Tile(x, y, tileType);
                this.tiles[y][x] = tile;
                this.container.addChild(tile.sprite);
            }
        }
        
        return this.container;
    }
    
    getTileAt(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        
        if (tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height) {
            return this.tiles[tileY][tileX];
        }
        
        return null;
    }
    
    isTileWalkable(worldX, worldY) {
        const tile = this.getTileAt(worldX, worldY);
        return tile ? tile.isWalkable() : false;
    }
    
}