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
     * Generate complete world data in proper order: biomes → elevation → stairs
     * Returns object with { elevationData, biomeData, stairsData }
     */
    generateWorld(): { elevationData: number[][], biomeData: number[][], stairsData: any[][] } {
        console.log('[SharedWorldGenerator] Starting world generation with new order: biomes → elevation → stairs');
        
        // STEP 1: Generate biomes FIRST
        console.log('[SharedWorldGenerator] Step 1: Generating biomes...');
        const biomeData = this.generateBiomeDataOnly();
        this.biomeData = biomeData;
        
        // STEP 2: Generate elevation with biome buffer constraints
        console.log('[SharedWorldGenerator] Step 2: Generating elevation with biome buffers...');
        const elevationData = this.generateElevationDataWithBiomeBuffers(biomeData);
        this.elevationData = elevationData;
        
        // STEP 3: Generate stairs with both biome and elevation data available
        console.log('[SharedWorldGenerator] Step 3: Generating biome-aware stairs...');
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
    generateBiomeDataOnly(): number[][] {
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

        return biomeData;
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
        // Create many more plateaus with much larger sizes for big worlds
        const largePlateauCount = 6 + Math.floor(this.random() * 6); // 6-11 large plateaus (was 4-7)
        const mediumPlateauCount = 8 + Math.floor(this.random() * 8); // 8-15 medium plateaus (was 3-5)
        
        // Generate large plateaus
        for (let i = 0; i < largePlateauCount; i++) {
            // Choose center point with larger buffer for big plateaus
            const cx = 20 + Math.floor(this.random() * (this.width - 40));
            const cy = 20 + Math.floor(this.random() * (this.height - 40));
            const baseRadius = 25 + Math.floor(this.random() * 20); // Large: 25-44 radius (much bigger)
            
            // Use noise to create organic shape with larger plateaus
            this.createNoisyPlateau(elevationData, cx, cy, baseRadius);
        }
        
        // Generate medium plateaus for more variety
        for (let i = 0; i < mediumPlateauCount; i++) {
            const cx = 15 + Math.floor(this.random() * (this.width - 30));
            const cy = 15 + Math.floor(this.random() * (this.height - 30));
            const baseRadius = 15 + Math.floor(this.random() * 15); // Medium: 15-29 radius (much bigger)
            
            this.createNoisyPlateau(elevationData, cx, cy, baseRadius);
        }
    }

    createNoisyPlateau(elevationData: number[][], centerX: number, centerY: number, radius: number): void {
        const noiseScale = 0.1;
        const threshold = 0.15; // Lowered from 0.2 to make plateaus more dense
        
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
        const largePlateauCount = 6 + Math.floor(this.random() * 6); // 6-11 large plateaus (was 4-7)
        const mediumPlateauCount = 8 + Math.floor(this.random() * 8); // 8-15 medium plateaus (was 3-5)
        
        // Generate large plateaus
        for (let i = 0; i < largePlateauCount; i++) {
            // Choose center point with larger buffer for big plateaus
            const cx = 20 + Math.floor(this.random() * (this.width - 40));
            const cy = 20 + Math.floor(this.random() * (this.height - 40));
            
            // Generate large plateaus (ignoring biome constraints initially)
            const size = 25 + Math.floor(this.random() * 20); // 25-44 tile radius (much bigger)
            this.generateUnconstrainedPlateau(elevationData, cx, cy, size);
        }
        
        // Generate medium plateaus for more variety
        for (let i = 0; i < mediumPlateauCount; i++) {
            const cx = 15 + Math.floor(this.random() * (this.width - 30));
            const cy = 15 + Math.floor(this.random() * (this.height - 30));
            
            const size = 15 + Math.floor(this.random() * 15); // 15-29 tile radius (much bigger)
            this.generateUnconstrainedPlateau(elevationData, cx, cy, size);
        }
    }


    /**
     * Generate an unconstrained plateau (normal generation, no biome checking)
     */
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
}