/**
 * Shared world generation logic used by both client and server
 * Ensures identical world generation for collision consistency
 */
import { createNoise2D } from 'simplex-noise';
import { createSeededRandom } from '../utils/MathUtils.js';

export class SharedWorldGenerator {
    constructor(width = 100, height = 100, seed = 42) {
        this.width = width;
        this.height = height;
        this.seed = seed;
        this.random = createSeededRandom(seed);
        this.noise2D = createNoise2D(this.random);
    }

    /**
     * Generate elevation data using the same algorithm as client
     * Returns 2D array with 0 = ground, 1 = elevated
     */
    generateElevationData() {
        // Initialize elevation data
        const elevationData = [];
        for (let y = 0; y < this.height; y++) {
            elevationData[y] = [];
            for (let x = 0; x < this.width; x++) {
                elevationData[y][x] = 0;
            }
        }

        // Use the exact same generation as client WorldGeneratorNew.js
        this.generateProperElevatedAreas(elevationData);

        return elevationData;
    }

    generateProperElevatedAreas(elevationData) {
        console.log("Generating proper elevated areas with noise constraints...");
        
        // Generate plateau candidates
        this.generatePlateauCandidates(elevationData);
        
        // Enforce minimum plateau sizes
        this.enforceMinimumPlateauSizes(elevationData);
        
        // Remove any remaining problematic formations
        this.finalCleanup(elevationData);
        
        // Count elevated tiles
        let elevatedCount = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (elevationData[y][x] > 0) elevatedCount++;
            }
        }
        console.log(`[SharedWorldGenerator] Final elevated tiles: ${elevatedCount}`);
    }

    generatePlateauCandidates(elevationData) {
        // Create several noise-based plateau seeds
        const plateauCount = 4 + Math.floor(this.random() * 3);
        
        for (let i = 0; i < plateauCount; i++) {
            // Choose center point with buffer for 3x3 minimum
            const cx = 10 + Math.floor(this.random() * (this.width - 20));
            const cy = 10 + Math.floor(this.random() * (this.height - 20));
            const baseRadius = 6 + Math.floor(this.random() * 8); // Larger to ensure 3x3
            
            // Use noise to create organic shape
            this.createNoisyPlateau(elevationData, cx, cy, baseRadius);
        }
    }

    createNoisyPlateau(elevationData, centerX, centerY, radius) {
        const noiseScale = 0.1;
        const threshold = 0.2;
        
        // Create the core 3x3 area first (guaranteed)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    elevationData[y][x] = 1;
                }
            }
        }
        
        // Then expand outward with noise
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue; // Skip core area
                
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= radius) {
                        const noise = this.noise2D(x * noiseScale, y * noiseScale);
                        const falloff = 1 - (distance / radius);
                        const value = (noise + 1) / 2 * falloff;
                        
                        if (value > threshold) {
                            elevationData[y][x] = 1;
                        }
                    }
                }
            }
        }
    }

    enforceMinimumPlateauSizes(elevationData) {
        // Find all elevated regions and ensure they meet 3x3 minimum
        const visited = Array(this.height).fill().map(() => Array(this.width).fill(false));
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (elevationData[y][x] > 0 && !visited[y][x]) {
                    const region = this.floodFillRegion(elevationData, visited, x, y);
                    
                    if (region.length < 9) { // Less than 3x3
                        // Remove small region
                        for (const pos of region) {
                            elevationData[pos.y][pos.x] = 0;
                        }
                    }
                }
            }
        }
    }

    floodFillRegion(elevationData, visited, startX, startY) {
        const region = [];
        const stack = [{ x: startX, y: startY }];
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
            if (visited[y][x] || elevationData[y][x] === 0) continue;
            
            visited[y][x] = true;
            region.push({ x, y });
            
            // Add 4-connected neighbors
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }
        
        return region;
    }

    finalCleanup(elevationData) {
        // Remove any isolated elevated tiles
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (elevationData[y][x] > 0) {
                    // Count connected elevated neighbors (4-connected)
                    let neighbors = 0;
                    if (elevationData[y-1][x] > 0) neighbors++;
                    if (elevationData[y+1][x] > 0) neighbors++;
                    if (elevationData[y][x-1] > 0) neighbors++;
                    if (elevationData[y][x+1] > 0) neighbors++;
                    
                    // Remove completely isolated tiles
                    if (neighbors === 0) {
                        elevationData[y][x] = 0;
                    }
                }
            }
        }
    }
}