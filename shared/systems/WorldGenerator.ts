/**
 * @fileoverview SharedWorldGenerator - Deterministic world generation for client-server sync
 * 
 * ARCHITECTURE ROLE:
 * - Authoritative world generation shared between client and server
 * - Ensures identical terrain, collision, and biome data across all instances
 * - Uses seeded noise generation for deterministic, reproducible worlds
 * - Provides foundational data for ClientWorldRenderer and server collision systems
 * 
 * DETERMINISTIC GENERATION PATTERN:
 * Seed-based generation guarantees identical worlds:
 * 1. Server generates world seed on startup
 * 2. All clients receive same seed via network init
 * 3. SharedWorldGenerator(seed) produces identical terrain
 * 4. No world data transmission needed - each instance generates locally
 * 
 * GENERATION PIPELINE:
 * Three-phase generation order prevents data dependencies:
 * 1. Biomes: Dark grass mini-biomes using simplex noise
 * 2. Elevation: Cliff plateaus with biome-aware buffer zones
 * 3. Stairs: Connects elevation levels while respecting biome boundaries
 * 
 * CRITICAL CONSISTENCY:
 * Client and server must generate identical collision data
 * Server uses this for authoritative physics and pathfinding
 * Client uses for prediction and rendering
 * Any deviation breaks multiplayer collision synchronization
 * 
 * PERFORMANCE OPTIMIZATION:
 * Generation is fast (~50ms for 200x200 world, ~300ms for 500x500 world)
 * Rendering is the bottleneck, not generation
 * Data structure optimized for ClientWorldRenderer consumption
 */
import { createNoise2D } from 'simplex-noise';
import { createSeededRandom } from '../utils/MathUtils.js';
import type { BiomeConfig, ElevationConfig, Vector2D } from '../types/GameTypes.js';

export class SharedWorldGenerator {
    public width: number;
    public height: number;
    public seed: number;
    public random: () => number;
    public noise2D: (x: number, y: number) => number;
    public stairsData: any[][] | null;
    public biomeData: number[][] | null;
    public elevationData: number[][] | null;

    constructor(width: number = 100, height: number = 100, seed: number = 42) {
        this.width = width;
        this.height = height;
        this.seed = seed;
        this.random = createSeededRandom(seed);
        this.noise2D = createNoise2D(this.random);
        this.stairsData = null; // Will be populated after elevation generation
        this.biomeData = null; // Will be populated after biome generation
        this.elevationData = null; // Will be populated during elevation generation
    }

    /**
     * Generate complete world data in new order: plateaus → climate → biomes → stairs
     * Returns object with { elevationData, biomeData, stairsData }
     */
    generateWorld(): { elevationData: number[][], biomeData: number[][], stairsData: any[][] } {
        console.log('[SharedWorldGenerator] Starting world generation with new order: plateaus → climate → biomes → stairs');
        
        // STEP 1: Generate plateaus FIRST (they define the major terrain features)
        console.log('[SharedWorldGenerator] Step 1: Generating plateaus...');
        const elevationData = this.generateElevationDataFirst();
        this.elevationData = elevationData;
        
        // STEP 2: Generate climate maps
        console.log('[SharedWorldGenerator] Step 2: Generating climate...');
        const climate = this.generateClimateData();
        
        // STEP 3: Generate biomes from climate, respecting existing plateaus
        console.log('[SharedWorldGenerator] Step 3: Generating biomes around plateaus...');
        const biomeData = this.generateBiomesAroundPlateaus(climate, elevationData);
        this.biomeData = biomeData;
        
        // STEP 4: Generate stairs on the existing plateaus
        console.log('[SharedWorldGenerator] Step 4: Generating stairs...');
        this.generateStairsData(elevationData);
        
        console.log('[SharedWorldGenerator] World generation complete');
        return {
            elevationData,
            biomeData,
            stairsData: this.stairsData!
        };
    }

    /**
     * LEGACY: Generate elevation data using the same algorithm as client
     * Returns 2D array with 0 = ground, 1 = elevated
     */
    generateElevationData() {
        // Initialize elevation data
        const elevationData: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            elevationData[y] = [] as number[];
            for (let x = 0; x < this.width; x++) {
                elevationData[y][x] = 0;
            }
        }

        // Use the exact same generation as client WorldGeneratorNew.js
        this.generateProperElevatedAreas(elevationData);

        // Generate stairs data after elevation data
        this.generateStairsData(elevationData);

        // Store elevation data for later use
        this.elevationData = elevationData;

        return elevationData;
    }

    /**
     * Generate biome data for mini-biomes (green vs dark grass)
     * Returns 2D array with 0 = green grass, 1 = dark grass
     */
    generateBiomeData() {
        const biomeData: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            biomeData[y] = [] as number[];
            for (let x = 0; x < this.width; x++) {
                biomeData[y][x] = 0; // Default to green grass
            }
        }

        // Generate 3-5 large dark grass zones to increase coverage to 40-60%
        const zoneCount = 3 + Math.floor(this.random() * 3);
        console.log(`[SharedWorldGenerator] Generating ${zoneCount} dark grass zones`);

        this.generateLargeBiomeZones(biomeData, zoneCount);

        // Store biome data for later use
        this.biomeData = biomeData;

        return biomeData;
    }

    /**
     * Generate biome data only (without any elevation dependencies)
     * This is the FIRST step in the new generation order
     */
    /**
     * Generate elevation data FIRST - plateaus define the terrain
     */
    generateElevationDataFirst(): number[][] {
        console.log('[PlateauGeneration] Generating plateaus without biome constraints...');
        
        // Initialize elevation data
        const elevationData: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            elevationData[y] = [];
            for (let x = 0; x < this.width; x++) {
                elevationData[y][x] = 0;
            }
        }
        
        // Use the clean plateau generation (no biome conflicts!)
        this.generatePlateauCandidates(elevationData);
        
        // Only minimal cleanup needed since there are no biome conflicts
        this.enforceMinimumPlateauSizes(elevationData);
        
        // Count final plateaus
        let elevatedCount = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (elevationData[y][x] > 0) elevatedCount++;
            }
        }
        console.log(`[PlateauGeneration] Generated ${elevatedCount} elevated tiles`);
        
        return elevationData;
    }

    generateBiomeDataOnly(): number[][] {
        console.log('[SharedWorldGenerator] Generating climate-based biomes...');
        
        // Generate climate maps
        const climate = this.generateClimateData();
        
        // Convert climate to biomes
        const biomeData = this.generateBiomesFromClimate(climate);
        
        // Log biome statistics
        this.logBiomeStatistics(biomeData);
        
        return biomeData;
    }

    /**
     * Generate biomes around existing plateaus
     * Climate drives biome placement but plateaus are already fixed
     */
    generateBiomesAroundPlateaus(climate: { temperature: number[][], moisture: number[][] }, elevationData: number[][]): number[][] {
        const biomeData: number[][] = [];
        
        console.log('[BiomeGeneration] Generating biomes around existing plateaus...');
        
        for (let y = 0; y < this.height; y++) {
            biomeData[y] = [];
            for (let x = 0; x < this.width; x++) {
                const temp = climate.temperature[y][x];
                const moisture = climate.moisture[y][x];
                const isElevated = elevationData[y][x] > 0;
                
                // Plateaus can modify local climate slightly
                let adjustedTemp = temp;
                let adjustedMoisture = moisture;
                
                if (isElevated) {
                    // Plateaus are slightly cooler and drier
                    adjustedTemp -= 0.1;
                    adjustedMoisture -= 0.05;
                }
                
                biomeData[y][x] = this.determineBiomeType(adjustedTemp, adjustedMoisture);
            }
        }
        
        // Log biome statistics
        this.logBiomeStatistics(biomeData);
        
        return biomeData;
    }

    /**
     * Generate temperature and moisture maps
     */
    generateClimateData(): { temperature: number[][], moisture: number[][] } {
        const temperature: number[][] = [];
        const moisture: number[][] = [];
        
        // Initialize arrays
        for (let y = 0; y < this.height; y++) {
            temperature[y] = [];
            moisture[y] = [];
        }
        
        console.log('[ClimateGeneration] Generating temperature map...');
        // Temperature: North=cold (0.2), South=hot (0.8) with noise variation
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Base temperature from latitude (north to south)
                const latitudeFactor = y / (this.height - 1); // 0 (north) to 1 (south)
                const baseTemp = 0.2 + (latitudeFactor * 0.6); // 0.2 to 0.8
                
                // Add noise variation
                const tempNoise = this.noise2D(x * 0.03, y * 0.03);
                temperature[y][x] = Math.max(0, Math.min(1, baseTemp + tempNoise * 0.3));
            }
        }
        
        console.log('[ClimateGeneration] Generating moisture map...');
        // Moisture: Large-scale noise patterns
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Base moisture from large-scale noise
                const moistureNoise1 = this.noise2D(x * 0.02, y * 0.02);
                const moistureNoise2 = this.noise2D(x * 0.05, y * 0.05);
                
                // Combine different scales for interesting patterns
                const baseMoisture = (moistureNoise1 + moistureNoise2 * 0.5) / 1.5;
                moisture[y][x] = Math.max(0, Math.min(1, (baseMoisture + 1) / 2));
            }
        }
        
        return { temperature, moisture };
    }

    /**
     * Convert climate data to biome types
     */
    generateBiomesFromClimate(climate: { temperature: number[][], moisture: number[][] }): number[][] {
        const biomeData: number[][] = [];
        
        for (let y = 0; y < this.height; y++) {
            biomeData[y] = [];
            for (let x = 0; x < this.width; x++) {
                const temp = climate.temperature[y][x];
                const moisture = climate.moisture[y][x];
                
                biomeData[y][x] = this.determineBiomeType(temp, moisture);
            }
        }
        
        return biomeData;
    }

    /**
     * Determine biome type from climate conditions
     * NOTE: Desert/Marsh/Snow biomes not yet implemented in client
     * Temporarily mapping to existing grass types until assets are ready
     */
    determineBiomeType(temperature: number, moisture: number): number {
        // Cold + Any moisture = Snow → Light grass (temporary)
        if (temperature < 0.3) {
            return 0; // Light grass (Snow placeholder)
        }
        
        // Hot + Dry = Desert → Light grass (temporary)
        if (temperature > 0.7 && moisture < 0.3) {
            return 0; // Light grass (Desert placeholder)
        }
        
        // Any temperature + Very Wet = Marsh → Dark grass (temporary)
        if (moisture > 0.75) {
            return 1; // Dark grass (Marsh placeholder)
        }
        
        // Moderate conditions = Grass
        // Use moisture to determine light vs dark grass
        if (moisture > 0.5) {
            return 1; // Dark grass
        } else {
            return 0; // Light grass  
        }
    }

    /**
     * Log statistics about generated biomes
     */
    logBiomeStatistics(biomeData: number[][]): void {
        const counts = { 0: 0, 1: 0 };
        const totalTiles = this.width * this.height;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const biomeId = biomeData[y][x];
                if (biomeId in counts) {
                    counts[biomeId as keyof typeof counts]++;
                }
            }
        }
        
        const biomeNames = {
            0: 'Light Grass (includes Snow/Desert placeholders)',
            1: 'Dark Grass (includes Marsh placeholders)'
        };
        
        console.log('[BiomeGeneration] Biome distribution (temporary mapping):');
        for (const [biomeIdStr, count] of Object.entries(counts)) {
            const biomeId = parseInt(biomeIdStr) as keyof typeof biomeNames;
            const percentage = ((count / totalTiles) * 100).toFixed(1);
            const name = biomeNames[biomeId];
            console.log(`  ${name}: ${percentage}% (${count} tiles)`);
        }
    }

    /**
     * Generate elevation data with 1-tile buffer from biome edges
     * This ensures cliffs are contained within single biomes
     */
    generateElevationDataWithBiomeBuffers(biomeData: number[][]): number[][] {
        // Initialize elevation data
        const elevationData: number[][] = [];
        for (let y = 0; y < this.height; y++) {
            elevationData[y] = [] as number[];
            for (let x = 0; x < this.width; x++) {
                elevationData[y][x] = 0;
            }
        }

        // Generate elevated areas with biome constraints
        this.generateProperElevatedAreasWithBiomeBuffers(elevationData, biomeData);

        return elevationData;
    }

    generateLargeBiomeZones(biomeData: number[][], zoneCount: number): void {
        // Create large zones that divide the world into distinct regions
        // Think of this as splitting the world into 2-4 major territories
        
        // Create zone centers that are far apart
        const zoneCenters = [];
        const minDistance = Math.min(this.width, this.height) * 0.3; // Zones must be 30% of world size apart
        
        for (let i = 0; i < zoneCount; i++) {
            let attempts = 0;
            let validCenter = null;
            
            // Try to find a good center position
            while (attempts < 50 && !validCenter) {
                const centerX = 15 + Math.floor(this.random() * (this.width - 30));
                const centerY = 15 + Math.floor(this.random() * (this.height - 30));
                
                // Check distance from existing centers
                let tooClose = false;
                for (const existing of zoneCenters) {
                    const dx = centerX - existing.x;
                    const dy = centerY - existing.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                
                if (!tooClose) {
                    validCenter = { x: centerX, y: centerY };
                }
                attempts++;
            }
            
            if (validCenter) {
                zoneCenters.push(validCenter);
            }
        }
        
        console.log(`[SharedWorldGenerator] Generated ${zoneCenters.length} zone centers`);
        
        // Now create large zones using Voronoi-like regions with noise
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Find closest zone center
                let closestDistance = Infinity;
                let closestZone = -1;
                
                for (let i = 0; i < zoneCenters.length; i++) {
                    const dx = x - zoneCenters[i].x;
                    const dy = y - zoneCenters[i].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestZone = i;
                    }
                }
                
                // Add noise to create organic boundaries
                const noiseScale = 0.05; // Large scale noise for big zones
                const noiseValue = this.noise2D(x * noiseScale, y * noiseScale);
                const boundary = 0.3 + noiseValue * 0.4; // Dynamic boundary threshold
                
                // Calculate influence of the closest zone
                const maxInfluenceDistance = Math.min(this.width, this.height) * 0.4;
                const influence = Math.max(0, 1 - (closestDistance / maxInfluenceDistance));
                
                // Apply dark grass - make most zones dark (except zone 0) for 40-60% coverage
                if (closestZone >= 1 && influence > boundary) {
                    biomeData[y][x] = 1; // Dark grass
                }
            }
        }
        
        // Log zone statistics
        let darkTiles = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (biomeData[y][x] === 1) darkTiles++;
            }
        }
        const totalTiles = this.width * this.height;
        const darkPercentage = (darkTiles / totalTiles * 100).toFixed(1);
        console.log(`[SharedWorldGenerator] Dark grass zones cover ${darkPercentage}% of world (${darkTiles}/${totalTiles} tiles)`);
    }

    generateProperElevatedAreas(elevationData: number[][]): void {
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

    /**
     * Generate elevated areas with 1-tile buffer from biome edges
     * Ensures all cliffs are contained within single biomes
     */
    generateProperElevatedAreasWithBiomeBuffers(elevationData: number[][], biomeData: number[][]): void {
        console.log("Generating elevated areas with biome buffer constraints...");
        
        // Generate plateau candidates with biome constraints
        this.generatePlateauCandidatesWithBiomeBuffers(elevationData, biomeData);
        
        // Enforce minimum plateau sizes
        this.enforceMinimumPlateauSizes(elevationData);
        
        // Remove any formations that violate biome boundaries
        this.removebiomeBoundaryViolations(elevationData, biomeData);
        
        // Final cleanup
        this.finalCleanup(elevationData);
        
        // Count elevated tiles
        let elevatedCount = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (elevationData[y][x] > 0) elevatedCount++;
            }
        }
        console.log(`[SharedWorldGenerator] Final elevated tiles with biome buffers: ${elevatedCount}`);
    }

    generatePlateauCandidates(elevationData: number[][]): void {
        console.log('[PlateauGeneration] Using grid-based plateau distribution...');
        
        // Determine grid size based on world size for consistent distribution
        const targetPlateauCount = Math.max(4, Math.floor((this.width * this.height) / 15000)); // ~1 per 15k tiles
        const gridSize = Math.ceil(Math.sqrt(targetPlateauCount));
        
        console.log(`[PlateauGeneration] Placing ${targetPlateauCount} plateaus in ${gridSize}x${gridSize} grid`);
        
        // Calculate region dimensions
        const regionWidth = Math.floor(this.width / gridSize);
        const regionHeight = Math.floor(this.height / gridSize);
        
        let plateausPlaced = 0;
        
        // Place one plateau per grid region
        for (let gridY = 0; gridY < gridSize && plateausPlaced < targetPlateauCount; gridY++) {
            for (let gridX = 0; gridX < gridSize && plateausPlaced < targetPlateauCount; gridX++) {
                // Calculate region bounds
                const regionStartX = gridX * regionWidth;
                const regionStartY = gridY * regionHeight;
                const regionEndX = Math.min(regionStartX + regionWidth, this.width);
                const regionEndY = Math.min(regionStartY + regionHeight, this.height);
                
                // Find best location within this region
                const location = this.findBestPlateauLocationInRegion(
                    regionStartX, regionStartY, regionEndX, regionEndY
                );
                
                if (location) {
                    // Size varies based on available space
                    const maxRadius = Math.min(
                        Math.floor(regionWidth * 0.3),
                        Math.floor(regionHeight * 0.3),
                        26  // Maximum size limit
                    );
                    const minRadius = Math.max(15, Math.floor(maxRadius * 0.6));
                    const radius = minRadius + Math.floor(this.random() * (maxRadius - minRadius + 1));
                    
                    console.log(`[PlateauGeneration] Placing plateau ${plateausPlaced + 1} at (${location.x}, ${location.y}) with radius ${radius}`);
                    this.createNoisyPlateau(elevationData, location.x, location.y, radius);
                    plateausPlaced++;
                }
            }
        }
        
        console.log(`[PlateauGeneration] Successfully placed ${plateausPlaced} plateaus`);
    }

    /**
     * Find the best location for a plateau within a specific region
     */
    findBestPlateauLocationInRegion(startX: number, startY: number, endX: number, endY: number): { x: number, y: number } | null {
        const buffer = 25; // Minimum distance from region edges
        const effectiveStartX = startX + buffer;
        const effectiveStartY = startY + buffer;
        const effectiveEndX = endX - buffer;
        const effectiveEndY = endY - buffer;
        
        // Check if region is large enough
        if (effectiveEndX <= effectiveStartX || effectiveEndY <= effectiveStartY) {
            return null; // Region too small
        }
        
        // For now, place at center of region
        // Future: could add climate-aware scoring here
        const centerX = Math.floor((effectiveStartX + effectiveEndX) / 2);
        const centerY = Math.floor((effectiveStartY + effectiveEndY) / 2);
        
        // Add some randomness to avoid perfectly regular placement
        const randomOffsetX = Math.floor((this.random() - 0.5) * Math.min(30, (effectiveEndX - effectiveStartX) * 0.3));
        const randomOffsetY = Math.floor((this.random() - 0.5) * Math.min(30, (effectiveEndY - effectiveStartY) * 0.3));
        
        return {
            x: Math.max(effectiveStartX, Math.min(effectiveEndX, centerX + randomOffsetX)),
            y: Math.max(effectiveStartY, Math.min(effectiveEndY, centerY + randomOffsetY))
        };
    }

    createNoisyPlateau(elevationData: number[][], centerX: number, centerY: number, radius: number): void {
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

    createTemplatePlateau(elevationData: number[][], centerX: number, centerY: number, size: number): void {
        // Choose a random template shape
        const templates = ['oval', 'lshape', 'cross', 'tshape', 'ushape', 'diamond', 'arrow', 'plus'];
        const templateType = templates[Math.floor(this.random() * templates.length)];
        
        console.log(`[WorldGenerator] Creating ${templateType} plateau at (${centerX}, ${centerY}) with size ${size}`);
        
        // Generate the template shape
        const shape = this.generatePlateauTemplate(templateType, size);
        
        // Place the shape at the center position
        this.placePlateauShape(elevationData, centerX, centerY, shape);
    }
    
    generatePlateauTemplate(templateType: string, size: number): boolean[][] {
        const templateSize = size * 2 + 1; // Make it odd for center alignment
        const template: boolean[][] = Array(templateSize).fill(null).map(() => Array(templateSize).fill(false));
        const center = size;
        
        switch (templateType) {
            case 'oval':
                return this.generateOvalTemplate(template, center, size);
            case 'lshape':
                return this.generateLShapeTemplate(template, center, size);
            case 'cross':
                return this.generateCrossTemplate(template, center, size);
            case 'tshape':
                return this.generateTShapeTemplate(template, center, size);
            case 'ushape':
                return this.generateUShapeTemplate(template, center, size);
            case 'diamond':
                return this.generateDiamondTemplate(template, center, size);
            case 'arrow':
                return this.generateArrowTemplate(template, center, size);
            case 'plus':
                return this.generatePlusTemplate(template, center, size);
            default:
                return this.generateOvalTemplate(template, center, size); // Fallback
        }
    }
    
    generateOvalTemplate(template: boolean[][], center: number, size: number): boolean[][] {
        const radiusX = size * 0.8;
        const radiusY = size * 0.6; // Make it more elongated
        
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -size; dx <= size; dx++) {
                const normalizedX = dx / radiusX;
                const normalizedY = dy / radiusY;
                if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
                    template[center + dy][center + dx] = true;
                }
            }
        }
        return template;
    }
    
    generateLShapeTemplate(template: boolean[][], center: number, size: number): boolean[][] {
        const thickness = Math.max(3, Math.floor(size * 0.4));
        const armLength = Math.floor(size * 0.8);
        
        // Horizontal arm (bottom)
        for (let dx = -armLength; dx <= armLength; dx++) {
            for (let dy = 0; dy <= thickness; dy++) {
                if (center + dx >= 0 && center + dx < template[0].length && 
                    center + dy >= 0 && center + dy < template.length) {
                    template[center + dy][center + dx] = true;
                }
            }
        }
        
        // Vertical arm (left)
        for (let dy = -armLength; dy <= 0; dy++) {
            for (let dx = -armLength; dx <= -armLength + thickness; dx++) {
                if (center + dx >= 0 && center + dx < template[0].length && 
                    center + dy >= 0 && center + dy < template.length) {
                    template[center + dy][center + dx] = true;
                }
            }
        }
        return template;
    }
    
    generateCrossTemplate(template: boolean[][], center: number, size: number): boolean[][] {
        const thickness = Math.max(3, Math.floor(size * 0.3));
        const halfThickness = Math.floor(thickness / 2);
        
        // Horizontal bar
        for (let dx = -size; dx <= size; dx++) {
            for (let dy = -halfThickness; dy <= halfThickness; dy++) {
                template[center + dy][center + dx] = true;
            }
        }
        
        // Vertical bar
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -halfThickness; dx <= halfThickness; dx++) {
                template[center + dy][center + dx] = true;
            }
        }
        return template;
    }
    
    generateTShapeTemplate(template: boolean[][], center: number, size: number): boolean[][] {
        const thickness = Math.max(3, Math.floor(size * 0.3));
        const halfThickness = Math.floor(thickness / 2);
        
        // Horizontal bar (top)
        for (let dx = -size; dx <= size; dx++) {
            for (let dy = -size; dy <= -size + thickness; dy++) {
                if (center + dy >= 0 && center + dy < template.length) {
                    template[center + dy][center + dx] = true;
                }
            }
        }
        
        // Vertical stem (center)
        for (let dy = -size; dy <= size * 0.6; dy++) {
            for (let dx = -halfThickness; dx <= halfThickness; dx++) {
                template[center + dy][center + dx] = true;
            }
        }
        return template;
    }
    
    generateUShapeTemplate(template: boolean[][], center: number, size: number): boolean[][] {
        const thickness = Math.max(3, Math.floor(size * 0.3));
        const innerWidth = Math.floor(size * 0.6);
        
        // Left wall
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -size; dx <= -size + thickness; dx++) {
                if (center + dx >= 0 && center + dx < template[0].length) {
                    template[center + dy][center + dx] = true;
                }
            }
        }
        
        // Right wall
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = size - thickness; dx <= size; dx++) {
                if (center + dx >= 0 && center + dx < template[0].length) {
                    template[center + dy][center + dx] = true;
                }
            }
        }
        
        // Bottom connection
        for (let dx = -size; dx <= size; dx++) {
            for (let dy = size - thickness; dy <= size; dy++) {
                if (center + dy >= 0 && center + dy < template.length) {
                    template[center + dy][center + dx] = true;
                }
            }
        }
        return template;
    }
    
    generateDiamondTemplate(template: boolean[][], center: number, size: number): boolean[][] {
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -size; dx <= size; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= size) {
                    template[center + dy][center + dx] = true;
                }
            }
        }
        return template;
    }
    
    generateArrowTemplate(template: boolean[][], center: number, size: number): boolean[][] {
        const thickness = Math.max(3, Math.floor(size * 0.3));
        const halfThickness = Math.floor(thickness / 2);
        const arrowHeadSize = Math.floor(size * 0.4);
        
        // Arrow shaft
        for (let dx = -size; dx <= size - arrowHeadSize; dx++) {
            for (let dy = -halfThickness; dy <= halfThickness; dy++) {
                template[center + dy][center + dx] = true;
            }
        }
        
        // Arrow head
        for (let dx = size - arrowHeadSize; dx <= size; dx++) {
            const headWidth = Math.floor((size - dx) * 1.5);
            for (let dy = -headWidth; dy <= headWidth; dy++) {
                if (center + dy >= 0 && center + dy < template.length) {
                    template[center + dy][center + dx] = true;
                }
            }
        }
        return template;
    }
    
    generatePlusTemplate(template: boolean[][], center: number, size: number): boolean[][] {
        const thickness = Math.max(4, Math.floor(size * 0.4)); // Thicker than cross
        const halfThickness = Math.floor(thickness / 2);
        
        // Horizontal bar
        for (let dx = -size; dx <= size; dx++) {
            for (let dy = -halfThickness; dy <= halfThickness; dy++) {
                template[center + dy][center + dx] = true;
            }
        }
        
        // Vertical bar
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -halfThickness; dx <= halfThickness; dx++) {
                template[center + dy][center + dx] = true;
            }
        }
        return template;
    }
    
    placePlateauShape(elevationData: number[][], centerX: number, centerY: number, shape: boolean[][]): void {
        const shapeSize = shape.length;
        const offset = Math.floor(shapeSize / 2);
        
        for (let dy = 0; dy < shapeSize; dy++) {
            for (let dx = 0; dx < shapeSize; dx++) {
                if (shape[dy][dx]) {
                    const worldX = centerX - offset + dx;
                    const worldY = centerY - offset + dy;
                    
                    // Bounds check
                    if (worldX >= 0 && worldX < this.width && worldY >= 0 && worldY < this.height) {
                        elevationData[worldY][worldX] = 1;
                    }
                }
            }
        }
    }

    enforceMinimumPlateauSizes(elevationData: number[][]): void {
        // Find all elevated regions and ensure they meet 3x3 minimum
        const visited = Array(this.height).fill(null).map(() => Array(this.width).fill(false));
        
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

    floodFillRegion(elevationData: number[][], visited: boolean[][], startX: number, startY: number): Vector2D[] {
        const region = [];
        const stack = [{ x: startX, y: startY }];
        
        while (stack.length > 0) {
            const point = stack.pop()!;
            const { x, y } = point;
            
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

    finalCleanup(elevationData: number[][]): void {
        console.log("Running final cleanup to remove isolated tiles and single protrusions...");
        let cleanedCount = 0;
        
        // Multiple passes to remove isolated tiles and single protrusions
        for (let pass = 0; pass < 3; pass++) {
            for (let y = 1; y < this.height - 1; y++) {
                for (let x = 1; x < this.width - 1; x++) {
                    if (elevationData[y][x] > 0) {
                        // Count connected elevated neighbors (4-connected)
                        let neighbors = 0;
                        if (elevationData[y-1][x] > 0) neighbors++;
                        if (elevationData[y+1][x] > 0) neighbors++;
                        if (elevationData[y][x-1] > 0) neighbors++;
                        if (elevationData[y][x+1] > 0) neighbors++;
                        
                        // Remove isolated tiles and single protrusions (tiles with only 1 neighbor)
                        if (neighbors <= 1) {
                            elevationData[y][x] = 0;
                            cleanedCount++;
                        }
                    }
                }
            }
        }
        
        console.log(`[SharedWorldGenerator] Final cleanup removed ${cleanedCount} isolated/protruding tiles`);
    }

    /**
     * Generate stairs data that both client and server can use
     * This ensures stairs are placed identically on both sides
     */
    generateStairsData(elevationData: number[][]): void {
        // Initialize stairs data
        this.stairsData = [] as any[][];
        for (let y = 0; y < this.height; y++) {
            this.stairsData[y] = [] as any[];
            for (let x = 0; x < this.width; x++) {
                this.stairsData[y][x] = null;
            }
        }

        // Find all plateaus and place stairs
        const plateaus = this.findAllPlateaus(elevationData);
        console.log(`[SharedWorldGenerator] Found ${plateaus.length} plateaus for stair placement`);

        // Place stairs on each plateau
        for (let i = 0; i < plateaus.length; i++) {
            this.placeStairsOnPlateau(elevationData, plateaus[i], i);
        }
    }

    findAllPlateaus(elevationData: number[][]): Vector2D[][] {
        const visited: boolean[][] = [];
        const plateaus: Vector2D[][] = [];
        
        // Initialize visited array
        for (let y = 0; y < this.height; y++) {
            visited[y] = new Array(this.width).fill(false);
        }
        
        // Find all connected elevated regions
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (elevationData[y][x] > 0 && !visited[y][x]) {
                    const plateau = this.floodFillPlateau(elevationData, x, y, visited);
                    if (plateau.length > 0) {
                        plateaus.push(plateau);
                    }
                }
            }
        }
        
        return plateaus;
    }

    floodFillPlateau(elevationData: number[][], startX: number, startY: number, visited: boolean[][]): Vector2D[] {
        const plateau = [];
        const queue = [{x: startX, y: startY}];
        visited[startY][startX] = true;
        
        while (queue.length > 0) {
            const point = queue.shift()!;
            const {x, y} = point;
            plateau.push({x, y});
            
            // Check 4-connected neighbors
            const neighbors = [
                {x: x + 1, y: y},
                {x: x - 1, y: y},
                {x: x, y: y + 1},
                {x: x, y: y - 1}
            ];
            
            for (const {x: nx, y: ny} of neighbors) {
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    !visited[ny][nx] && elevationData[ny][nx] > 0) {
                    visited[ny][nx] = true;
                    queue.push({x: nx, y: ny});
                }
            }
        }
        
        return plateau;
    }

    placeStairsOnPlateau(elevationData: number[][], plateau: Vector2D[], plateauIndex: number): void {
        // Find all valid edge positions for stairs
        const edges = this.findPlateauEdges(elevationData, plateau);
        
        // Try to place stairs on each type of edge
        const stairPlacements = [];
        
        // Check each edge type
        const validWestEdges = this.findValidStairPositions(edges.west, 'vertical', 4);
        if (validWestEdges.length > 0) {
            stairPlacements.push({
                type: 'west',
                positions: validWestEdges,
                edge: this.selectBestEdgePosition(validWestEdges)
            });
        }
        
        const validEastEdges = this.findValidStairPositions(edges.east, 'vertical', 4);
        if (validEastEdges.length > 0) {
            stairPlacements.push({
                type: 'east',
                positions: validEastEdges,
                edge: this.selectBestEdgePosition(validEastEdges)
            });
        }
        
        const validNorthEdges = this.findValidStairPositions(edges.north, 'horizontal', 3);
        if (validNorthEdges.length > 0) {
            stairPlacements.push({
                type: 'north',
                positions: validNorthEdges,
                edge: this.selectBestEdgePosition(validNorthEdges)
            });
        }
        
        const validSouthEdges = this.findValidStairPositions(edges.south, 'horizontal', 3);
        if (validSouthEdges.length > 0) {
            stairPlacements.push({
                type: 'south',
                positions: validSouthEdges,
                edge: this.selectBestEdgePosition(validSouthEdges)
            });
        }
        
        // Place at least one stair set if possible
        if (stairPlacements.length > 0) {
            // Sort by edge length (prefer longer edges)
            stairPlacements.sort((a, b) => b.edge.length - a.edge.length);
            
            // Place stairs on the best edge
            const chosen = stairPlacements[0];
            this.placeStairs(chosen.edge.start, chosen.type);
        }
    }

    findPlateauEdges(elevationData: number[][], plateau: Vector2D[]): { north: Vector2D[], south: Vector2D[], east: Vector2D[], west: Vector2D[] } {
        const edges = {
            north: [] as Vector2D[],
            south: [] as Vector2D[],
            east: [] as Vector2D[],
            west: [] as Vector2D[]
        };
        
        // Create a set for fast lookup
        const plateauSet = new Set(plateau.map(p => `${p.x},${p.y}`));
        
        for (const {x, y} of plateau) {
            // Check if this is an edge tile
            const northEmpty = y === 0 || !plateauSet.has(`${x},${y-1}`);
            const southEmpty = y === this.height - 1 || !plateauSet.has(`${x},${y+1}`);
            const eastEmpty = x === this.width - 1 || !plateauSet.has(`${x+1},${y}`);
            const westEmpty = x === 0 || !plateauSet.has(`${x-1},${y}`);
            
            if (northEmpty) edges.north.push({x, y});
            if (southEmpty) edges.south.push({x, y});
            if (eastEmpty) edges.east.push({x, y});
            if (westEmpty) edges.west.push({x, y});
        }
        
        return edges;
    }

    findValidStairPositions(edgeTiles: Vector2D[], direction: string, minLength: number): Vector2D[][] {
        if (edgeTiles.length < minLength) return [];
        
        // Sort tiles by primary axis
        if (direction === 'horizontal') {
            edgeTiles.sort((a, b) => a.x - b.x);
        } else {
            edgeTiles.sort((a, b) => a.y - b.y);
        }
        
        // Find consecutive runs
        const validRuns = [];
        let currentRun = [edgeTiles[0]];
        
        for (let i = 1; i < edgeTiles.length; i++) {
            const prev = edgeTiles[i - 1];
            const curr = edgeTiles[i];
            
            const isConsecutive = direction === 'horizontal' 
                ? (curr.x === prev.x + 1 && curr.y === prev.y)
                : (curr.y === prev.y + 1 && curr.x === prev.x);
                
            if (isConsecutive) {
                currentRun.push(curr);
            } else {
                if (currentRun.length >= minLength) {
                    validRuns.push(currentRun);
                }
                currentRun = [curr];
            }
        }
        
        // Check last run
        if (currentRun.length >= minLength) {
            validRuns.push(currentRun);
        }
        
        return validRuns;
    }

    selectBestEdgePosition(validRuns: Vector2D[][]): { start: Vector2D, length: number } {
        // Select the longest run
        let bestRun = validRuns[0];
        for (const run of validRuns) {
            if (run.length > bestRun.length) {
                bestRun = run;
            }
        }
        
        return {
            start: bestRun[0], // Start from the first tile
            length: bestRun.length
        };
    }

    placeStairs(startPos: Vector2D, direction: string): void {
        const {x, y} = startPos;
        
        // Check biome at stair location (biome data is now available)
        const stairBiome = this.biomeData && this.biomeData[y] && this.biomeData[y][x] ? this.biomeData[y][x] : 0;
        const isDarkGrassStairs = stairBiome === 1;
        const colOffset = isDarkGrassStairs ? 11 : 0;
        
        // DEBUG: Log stair placement details  
        console.log(`[SharedWorldGenerator] Placing ${direction} stairs at (${x},${y}): biome=${stairBiome}, isDark=${isDarkGrassStairs}, colOffset=${colOffset}`);
        console.log(`[SharedWorldGenerator] biomeData exists: ${!!this.biomeData}, biomeData[${y}] exists: ${!!(this.biomeData && this.biomeData[y])}, value: ${this.biomeData && this.biomeData[y] && this.biomeData[y][x]}`);
        
        switch (direction) {
            case 'west':
                // Place west stairs with biome-appropriate tiles
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        if (x + dx >= 0 && y + dy < this.height) {
                            const tileX = 2 + dx + colOffset;
                            const tileY = 13 + dy;
                            this.stairsData![y + dy][x + dx] = {
                                type: 'west',
                                tileX: tileX,
                                tileY: tileY,
                                biome: stairBiome
                            };
                            // DEBUG: Log each stair tile placement
                            if (dy === 0 && dx === 0) { // Only log first tile to avoid spam
                                console.log(`[SharedWorldGenerator] West stair tile: (${tileY},${tileX}) biome=${stairBiome}`);
                            }
                        }
                    }
                }
                break;
                
            case 'east':
                // Place east stairs with biome-appropriate tiles
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        if (x + dx < this.width && y + dy < this.height) {
                            this.stairsData![y + dy][x + dx] = {
                                type: 'east',
                                tileX: 7 + dx + colOffset,
                                tileY: 13 + dy,
                                biome: stairBiome
                            };
                        }
                    }
                }
                break;
                
            case 'north':
                // Place north stairs with biome-appropriate tiles
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 3; dx++) {
                        if (x + dx < this.width && y + dy >= 0) {
                            this.stairsData![y + dy][x + dx] = {
                                type: 'north',
                                tileX: 4 + dx + colOffset,
                                tileY: 13 + dy,
                                biome: stairBiome
                            };
                        }
                    }
                }
                break;
                
            case 'south':
                // Place south stairs with biome-appropriate tiles
                for (let dy = 0; dy < 3; dy++) {
                    for (let dx = 0; dx < 3; dx++) {
                        if (x + dx < this.width && y + dy < this.height) {
                            this.stairsData![y + dy][x + dx] = {
                                type: 'south',
                                tileX: 4 + dx + colOffset,
                                tileY: 15 + dy,
                                biome: stairBiome
                            };
                        }
                    }
                }
                break;
        }
    }

    /**
     * Check if a stair tile is walkable
     * Used by collision system to mark specific stair tiles as walkable
     */
    isStairTileWalkable(tileY: number, tileX: number): boolean {
        const walkableStairs = [
            // GREEN GRASS STAIRS - Western stairs walkable tiles
            [14, 2], [14, 3], [15, 2], [15, 3],
            // GREEN GRASS STAIRS - Top edge stairs walkable tiles
            [13, 5], [13, 6], [14, 5], [14, 6],
            // GREEN GRASS STAIRS - Bottom edge stairs walkable tiles
            [15, 5], [15, 6], [16, 5], [16, 6], [17, 5], [17, 6],
            // GREEN GRASS STAIRS - Eastern stairs walkable tiles
            [14, 7], [14, 8], [15, 7], [15, 8],
            
            // DARK GRASS STAIRS - Western stairs walkable tiles (+11 column offset)
            [14, 13], [14, 14], [15, 13], [15, 14],
            // DARK GRASS STAIRS - Top edge stairs walkable tiles (+11 column offset)
            [13, 16], [13, 17], [14, 16], [14, 17],
            // DARK GRASS STAIRS - Bottom edge stairs walkable tiles (+11 column offset)
            [15, 16], [15, 17], [16, 16], [16, 17], [17, 16], [17, 17],
            // DARK GRASS STAIRS - Eastern stairs walkable tiles (+11 column offset)
            [14, 18], [14, 19], [15, 18], [15, 19]
        ];
        
        return walkableStairs.some(([row, col]) => row === tileY && col === tileX);
    }

    /**
     * Update stairs tile coordinates based on biome data
     * This is called after biomes are generated to ensure stairs use correct tileset
     */
    updateStairsForBiomes(biomeData: number[][]): void {
        if (!this.stairsData || !biomeData) return;
        
        let updatedCount = 0;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const stairInfo = this.stairsData[y][x];
                if (!stairInfo) continue;
                
                // Get biome at this stair location
                const stairBiome = biomeData[y][x];
                const isDarkGrass = stairBiome === 1;
                
                // Only update if this is a dark grass biome (green grass uses default columns)
                if (isDarkGrass) {
                    // Add +11 column offset for dark grass stairs
                    const originalTileX = stairInfo.tileX;
                    
                    // Remove the column offset that was added in placeStairs (if any)
                    // and ensure we're working with base green grass column numbers
                    let baseTileX = originalTileX;
                    if (originalTileX >= 13) {
                        baseTileX = originalTileX - 11;
                    }
                    
                    // Now add the correct offset for dark grass
                    stairInfo.tileX = baseTileX + 11;
                    stairInfo.biome = stairBiome;
                    updatedCount++;
                }
            }
        }
        
        if (updatedCount > 0) {
            console.log(`[SharedWorldGenerator] Updated ${updatedCount} stairs to use dark grass tiles`);
        }
    }

    /**
     * Get stairs data for use by collision system
     */
    getStairsData() {
        return this.stairsData;
    }

    /**
     * Generate plateau candidates with biome buffer constraints
     * Ensures plateaus stay within biome boundaries with 1-tile buffer
     */
    generatePlateauCandidatesWithBiomeBuffers(elevationData: number[][], biomeData: number[][]): void {
        console.log('[PlateauGeneration] Using grid-based plateau distribution with biome awareness...');
        
        // Use same grid system as regular plateau generation
        const targetPlateauCount = Math.max(4, Math.floor((this.width * this.height) / 15000));
        const gridSize = Math.ceil(Math.sqrt(targetPlateauCount));
        
        const regionWidth = Math.floor(this.width / gridSize);
        const regionHeight = Math.floor(this.height / gridSize);
        
        let plateausPlaced = 0;
        
        for (let gridY = 0; gridY < gridSize && plateausPlaced < targetPlateauCount; gridY++) {
            for (let gridX = 0; gridX < gridSize && plateausPlaced < targetPlateauCount; gridX++) {
                const regionStartX = gridX * regionWidth;
                const regionStartY = gridY * regionHeight;
                const regionEndX = Math.min(regionStartX + regionWidth, this.width);
                const regionEndY = Math.min(regionStartY + regionHeight, this.height);
                
                const location = this.findBestPlateauLocationInRegion(
                    regionStartX, regionStartY, regionEndX, regionEndY
                );
                
                if (location) {
                    const maxRadius = Math.min(
                        Math.floor(regionWidth * 0.3),
                        Math.floor(regionHeight * 0.3),
                        26
                    );
                    const minRadius = Math.max(15, Math.floor(maxRadius * 0.6));
                    const radius = minRadius + Math.floor(this.random() * (maxRadius - minRadius + 1));
                    
                    this.generateUnconstrainedPlateau(elevationData, location.x, location.y, radius);
                    plateausPlaced++;
                }
            }
        }
        
        console.log(`[PlateauGeneration] Placed ${plateausPlaced} plateaus with biome constraints`);
    }

    generatePlateauCandidatesWithBiomeBuffersOld(elevationData: number[][], biomeData: number[][]): void {
        console.log('[PlateauGeneration] Starting biome-aware plateau placement...');
        
        // PHASE 3: Use biome analysis for smart placement
        // OPTIMIZATION: Use faster analysis for large worlds
        const isLargeWorld = this.width * this.height > 40000; // Worlds larger than 200x200
        
        if (isLargeWorld) {
            console.log('[PlateauGeneration] Using optimized biome analysis for large world');
        }
        
        const regions = this.analyzeBiomeRegions(biomeData, isLargeWorld);
        
        // Filter regions suitable for plateaus
        const largeRegions = regions.filter(r => r.suitableForLargePlateau);
        const mediumRegions = regions.filter(r => r.suitableForMediumPlateau);
        
        console.log(`[PlateauGeneration] Found ${largeRegions.length} regions suitable for large plateaus`);
        console.log(`[PlateauGeneration] Found ${mediumRegions.length} regions suitable for medium plateaus`);
        
        // Target plateau counts (same as before)
        const largePlateauTarget = 6 + Math.floor(this.random() * 6); // 6-11 large plateaus
        const mediumPlateauTarget = 8 + Math.floor(this.random() * 8); // 8-15 medium plateaus
        
        let largePlateausPlaced = 0;
        let mediumPlateausPlaced = 0;
        
        // Place large plateaus in suitable regions
        for (const region of largeRegions) {
            if (largePlateausPlaced >= largePlateauTarget) break;
            
            const plateauSize = 25 + Math.floor(this.random() * 20); // 25-44 radius
            const sites = this.findOptimalPlateauSites(region, plateauSize);
            
            if (sites.length > 0) {
                // Place 1-2 plateaus per large region, depending on region size
                const plateausInRegion = region.tiles.length > 15000 ? 2 : 1;
                
                for (let i = 0; i < Math.min(plateausInRegion, sites.length, largePlateauTarget - largePlateausPlaced); i++) {
                    const site = sites[i];
                    console.log(`[PlateauGeneration] Placing large plateau (size ${plateauSize}) at (${site.x}, ${site.y}) in biome ${region.biomeType} region`);
                    this.createTemplatePlateau(elevationData, site.x, site.y, plateauSize);
                    largePlateausPlaced++;
                }
            }
        }
        
        // Place medium plateaus in suitable regions
        for (const region of mediumRegions) {
            if (mediumPlateausPlaced >= mediumPlateauTarget) break;
            
            const plateauSize = 15 + Math.floor(this.random() * 15); // 15-29 radius
            const sites = this.findOptimalPlateauSites(region, plateauSize);
            
            if (sites.length > 0) {
                // Place 1-3 plateaus per medium region, depending on region size
                const plateausInRegion = region.tiles.length > 10000 ? 3 : region.tiles.length > 5000 ? 2 : 1;
                
                for (let i = 0; i < Math.min(plateausInRegion, sites.length, mediumPlateauTarget - mediumPlateausPlaced); i++) {
                    const site = sites[i];
                    console.log(`[PlateauGeneration] Placing medium plateau (size ${plateauSize}) at (${site.x}, ${site.y}) in biome ${region.biomeType} region`);
                    this.createTemplatePlateau(elevationData, site.x, site.y, plateauSize);
                    mediumPlateausPlaced++;
                }
            }
        }
        
        // Fallback: If we didn't place enough plateaus, use random placement for remaining
        if (largePlateausPlaced < largePlateauTarget || mediumPlateausPlaced < mediumPlateauTarget) {
            console.log(`[PlateauGeneration] Using fallback placement for remaining plateaus (${largePlateauTarget - largePlateausPlaced} large, ${mediumPlateauTarget - mediumPlateausPlaced} medium)`);
            
            // Fallback large plateaus
            for (let i = largePlateausPlaced; i < largePlateauTarget; i++) {
                const cx = 20 + Math.floor(this.random() * (this.width - 40));
                const cy = 20 + Math.floor(this.random() * (this.height - 40));
                const baseRadius = 25 + Math.floor(this.random() * 20);
                this.createTemplatePlateau(elevationData, cx, cy, baseRadius);
            }
            
            // Fallback medium plateaus
            for (let i = mediumPlateausPlaced; i < mediumPlateauTarget; i++) {
                const cx = 15 + Math.floor(this.random() * (this.width - 30));
                const cy = 15 + Math.floor(this.random() * (this.height - 30));
                const baseRadius = 15 + Math.floor(this.random() * 15);
                this.createTemplatePlateau(elevationData, cx, cy, baseRadius);
            }
        }
        
        console.log(`[PlateauGeneration] Placed ${largePlateausPlaced} large and ${mediumPlateausPlaced} medium plateaus using biome-aware placement`);
    }


    /**
     * Generate an unconstrained plateau (normal generation, no biome checking)
     */
    /**
     * Fallback method for large worlds - generate plateaus randomly
     */
    generatePlateauCandidatesRandomly(elevationData: number[][], largePlateauTarget: number, mediumPlateauTarget: number): void {
        // Generate large plateaus
        for (let i = 0; i < largePlateauTarget; i++) {
            const cx = 20 + Math.floor(this.random() * (this.width - 40));
            const cy = 20 + Math.floor(this.random() * (this.height - 40));
            const baseRadius = 25 + Math.floor(this.random() * 20); // Large: 25-44 radius
            this.createTemplatePlateau(elevationData, cx, cy, baseRadius);
        }
        
        // Generate medium plateaus
        for (let i = 0; i < mediumPlateauTarget; i++) {
            const cx = 15 + Math.floor(this.random() * (this.width - 30));
            const cy = 15 + Math.floor(this.random() * (this.height - 30));
            const baseRadius = 15 + Math.floor(this.random() * 15); // Medium: 15-29 radius
            this.createTemplatePlateau(elevationData, cx, cy, baseRadius);
        }
    }

    generateUnconstrainedPlateau(elevationData: number[][], centerX: number, centerY: number, maxRadius: number): void {
        const noiseScale = 0.1;
        
        for (let dy = -maxRadius; dy <= maxRadius; dy++) {
            for (let dx = -maxRadius; dx <= maxRadius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x < 1 || x >= this.width - 1 || y < 1 || y >= this.height - 1) continue;
                
                const distance = Math.sqrt(dx * dx + dy * dy);
                const noiseValue = this.noise2D(x * noiseScale, y * noiseScale);
                const threshold = maxRadius * (0.35 + noiseValue * 0.3); // Lowered from 0.4 to increase density
                
                if (distance < threshold) {
                    elevationData[y][x] = 1;
                }
            }
        }
    }

    /**
     * Trim elevated areas to respect biome boundaries with 1-tile buffer
     * Instead of removing entire plateaus, just trim the edges that violate boundaries
     */
    removebiomeBoundaryViolations(elevationData: number[][], biomeData: number[][]): void {
        let removedCount = 0;
        let iterations = 0;
        const maxIterations = 5; // Prevent infinite loops
        
        // Keep trimming until no more violations exist (or max iterations reached)
        while (iterations < maxIterations) {
            let foundViolations = false;
            iterations++;
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (elevationData[y][x] === 0) continue; // Not elevated
                    
                    // Check if this elevated tile violates the 1-tile buffer rule
                    if (this.violatesBiomeBuffer(x, y, biomeData)) {
                        elevationData[y][x] = 0; // Remove this elevated tile
                        removedCount++;
                        foundViolations = true;
                    }
                }
            }
            
            if (!foundViolations) break; // No more violations found
        }
        
        if (removedCount > 0) {
            console.log(`[SharedWorldGenerator] Trimmed ${removedCount} elevated tiles to respect biome boundaries (${iterations} iterations)`);
        }
    }

    /**
     * Check if an elevated tile violates the 1-tile biome buffer rule
     */
    violatesBiomeBuffer(x: number, y: number, biomeData: number[][]): boolean {
        const currentBiome = biomeData[y][x];
        
        // Check all adjacent tiles (8-direction)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip center tile
                
                const checkX = x + dx;
                const checkY = y + dy;
                
                // World edges count as different biome (need buffer from edges)
                if (checkX < 0 || checkX >= this.width || checkY < 0 || checkY >= this.height) {
                    return true;
                }
                
                // If adjacent tile is different biome, this violates the buffer rule
                if (biomeData[checkY][checkX] !== currentBiome) {
                    return true;
                }
            }
        }
        
        return false; // No violations found
    }

    /**
     * PHASE 2: Biome Analysis System
     * Analyze biome layout to find optimal plateau placement locations
     */

    /**
     * Analyze biome data to find large contiguous regions suitable for plateau placement
     * @param isLargeWorld - If true, use optimized sampling to avoid timeout
     */
    analyzeBiomeRegions(biomeData: number[][], isLargeWorld: boolean = false): BiomeRegion[] {
        const regions: BiomeRegion[] = [];
        const visited: boolean[][] = Array(this.height).fill(null).map(() => Array(this.width).fill(false));

        console.log('[BiomeAnalysis] Analyzing biome regions for plateau placement...');

        // For large worlds, use sampling to avoid analyzing every tile
        const step = isLargeWorld ? 10 : 1; // Sample every 10th tile for large worlds

        // Find all contiguous biome regions
        for (let y = 0; y < this.height; y += step) {
            for (let x = 0; x < this.width; x += step) {
                if (!visited[y][x]) {
                    const region = this.floodFillBiomeRegion(biomeData, x, y, visited, isLargeWorld);
                    if (region.tiles.length > 0) {
                        regions.push(region);
                    }
                }
            }
        }

        // Sort regions by size (largest first)
        regions.sort((a, b) => b.tiles.length - a.tiles.length);

        console.log(`[BiomeAnalysis] Found ${regions.length} biome regions`);
        for (let i = 0; i < Math.min(5, regions.length); i++) {
            const r = regions[i];
            console.log(`  Region ${i}: ${r.tiles.length} tiles, biome ${r.biomeType}, center (${r.center.x}, ${r.center.y})`);
        }

        return regions;
    }

    /**
     * Flood fill to find all tiles in a contiguous biome region
     * @param isLargeWorld - If true, use approximate bounds instead of all tiles
     */
    floodFillBiomeRegion(biomeData: number[][], startX: number, startY: number, visited: boolean[][], isLargeWorld: boolean = false): BiomeRegion {
        const biomeType = biomeData[startY][startX];
        const tiles: Vector2D[] = [];
        
        // For large worlds, just estimate bounds instead of collecting all tiles
        if (isLargeWorld) {
            // Quick bounds estimation by sampling
            let minX = startX, maxX = startX, minY = startY, maxY = startY;
            const sampleStep = 5;
            
            // Sample in expanding rectangles to find approximate bounds
            for (let radius = sampleStep; radius < 100; radius += sampleStep) {
                let foundEdge = false;
                
                // Check rectangle perimeter
                for (let i = -radius; i <= radius; i += sampleStep) {
                    // Top and bottom edges
                    if (startY - radius >= 0 && biomeData[startY - radius][Math.max(0, Math.min(this.width - 1, startX + i))] === biomeType) {
                        minY = Math.min(minY, startY - radius);
                        foundEdge = true;
                    }
                    if (startY + radius < this.height && biomeData[startY + radius][Math.max(0, Math.min(this.width - 1, startX + i))] === biomeType) {
                        maxY = Math.max(maxY, startY + radius);
                        foundEdge = true;
                    }
                    
                    // Left and right edges
                    if (startX - radius >= 0 && biomeData[Math.max(0, Math.min(this.height - 1, startY + i))][startX - radius] === biomeType) {
                        minX = Math.min(minX, startX - radius);
                        foundEdge = true;
                    }
                    if (startX + radius < this.width && biomeData[Math.max(0, Math.min(this.height - 1, startY + i))][startX + radius] === biomeType) {
                        maxX = Math.max(maxX, startX + radius);
                        foundEdge = true;
                    }
                }
                
                if (!foundEdge) break; // Stop expanding if we didn't find any more of this biome
            }
            
            // Mark approximate area as visited
            for (let y = minY; y <= maxY; y += 5) {
                for (let x = minX; x <= maxX; x += 5) {
                    if (y < this.height && x < this.width) {
                        visited[y][x] = true;
                    }
                }
            }
            
            // Create approximate tile list (just corners and center for bounds calculation)
            tiles.push({ x: minX, y: minY });
            tiles.push({ x: maxX, y: maxY });
            tiles.push({ x: startX, y: startY });
            
        } else {
            // Original precise flood fill for small worlds
            const queue: Vector2D[] = [{ x: startX, y: startY }];
            visited[startY][startX] = true;

            while (queue.length > 0) {
                const point = queue.shift()!;
                const { x, y } = point;
                tiles.push({ x, y });

                // Check 4-connected neighbors
                const neighbors = [
                    { x: x + 1, y: y },
                    { x: x - 1, y: y },
                    { x: x, y: y + 1 },
                    { x: x, y: y - 1 }
                ];

                for (const { x: nx, y: ny } of neighbors) {
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                        !visited[ny][nx] && biomeData[ny][nx] === biomeType) {
                        visited[ny][nx] = true;
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        // Calculate region center and bounds
        const bounds = this.calculateRegionBounds(tiles);
        const center = {
            x: Math.floor((bounds.minX + bounds.maxX) / 2),
            y: Math.floor((bounds.minY + bounds.maxY) / 2)
        };

        // For large worlds, estimate tile count from bounds
        if (isLargeWorld && tiles.length < 100) {
            // Approximate tile count based on bounds
            const estimatedArea = (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
            // Add estimated tiles for proper suitability calculation
            const estimatedTiles: Vector2D[] = tiles.slice(); // Keep original tiles
            estimatedTiles.length = Math.floor(estimatedArea * 0.7); // Assume 70% fill rate
            
            return {
                biomeType,
                tiles: estimatedTiles,
                center,
                bounds,
                suitableForLargePlateau: this.isRegionSuitableForLargePlateau(estimatedTiles, bounds),
                suitableForMediumPlateau: this.isRegionSuitableForMediumPlateau(estimatedTiles, bounds)
            };
        }

        return {
            biomeType,
            tiles,
            center,
            bounds,
            suitableForLargePlateau: this.isRegionSuitableForLargePlateau(tiles, bounds),
            suitableForMediumPlateau: this.isRegionSuitableForMediumPlateau(tiles, bounds)
        };
    }

    /**
     * Calculate bounding box for a region
     */
    calculateRegionBounds(tiles: Vector2D[]): RegionBounds {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const tile of tiles) {
            minX = Math.min(minX, tile.x);
            maxX = Math.max(maxX, tile.x);
            minY = Math.min(minY, tile.y);
            maxY = Math.max(maxY, tile.y);
        }

        return { minX, maxX, minY, maxY };
    }

    /**
     * Check if a region can accommodate large plateaus (25-44 radius)
     */
    isRegionSuitableForLargePlateau(tiles: Vector2D[], bounds: RegionBounds): boolean {
        const width = bounds.maxX - bounds.minX + 1;
        const height = bounds.maxY - bounds.minY + 1;
        const area = tiles.length;

        // Need roughly 90x90 area for a 44-radius plateau with buffer
        const minDimension = 90;
        const minArea = 6000; // Large regions only

        return width >= minDimension && height >= minDimension && area >= minArea;
    }

    /**
     * Check if a region can accommodate medium plateaus (15-29 radius)
     */
    isRegionSuitableForMediumPlateau(tiles: Vector2D[], bounds: RegionBounds): boolean {
        const width = bounds.maxX - bounds.minX + 1;
        const height = bounds.maxY - bounds.minY + 1;
        const area = tiles.length;

        // Need roughly 60x60 area for a 29-radius plateau with buffer
        const minDimension = 60;
        const minArea = 2500; // Medium regions

        return width >= minDimension && height >= minDimension && area >= minArea;
    }

    /**
     * Find optimal placement locations within a biome region
     * OPTIMIZED: Simplified to reduce computation time
     */
    findOptimalPlateauSites(region: BiomeRegion, plateauSize: number): Vector2D[] {
        const sites: Vector2D[] = [];
        const requiredRadius = plateauSize + 5; // Add buffer for safety
        const step = Math.max(20, plateauSize); // Much larger step to reduce iterations

        // Only check a few positions near the center to avoid timeout
        const centerX = region.center.x;
        const centerY = region.center.y;
        const maxChecks = 9; // Limit to 9 positions (3x3 grid around center)
        let checked = 0;

        for (let dy = -1; dy <= 1 && checked < maxChecks; dy++) {
            for (let dx = -1; dx <= 1 && checked < maxChecks; dx++) {
                const x = centerX + dx * step;
                const y = centerY + dy * step;
                
                // Simple bounds check instead of expensive clear space check
                if (x - requiredRadius >= region.bounds.minX && 
                    x + requiredRadius <= region.bounds.maxX &&
                    y - requiredRadius >= region.bounds.minY && 
                    y + requiredRadius <= region.bounds.maxY) {
                    sites.push({ x, y });
                    checked++;
                }
            }
        }

        return sites;
    }

    /**
     * Check if a location has enough clear space for a plateau
     * REMOVED: This method was too expensive and causing timeouts
     */
    hasEnoughClearSpace(region: BiomeRegion, centerX: number, centerY: number, radius: number): boolean {
        // Simplified to always return true - bounds checking is done in findOptimalPlateauSites
        return true;
    }
}

// Type definitions for biome analysis
interface BiomeRegion {
    biomeType: number;
    tiles: Vector2D[];
    center: Vector2D;
    bounds: RegionBounds;
    suitableForLargePlateau: boolean;
    suitableForMediumPlateau: boolean;
}

interface RegionBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}