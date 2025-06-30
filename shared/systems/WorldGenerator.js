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
        this.stairsData = null; // Will be populated after elevation generation
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

        // Generate stairs data after elevation data
        this.generateStairsData(elevationData);

        return elevationData;
    }

    /**
     * Generate biome data for mini-biomes (green vs dark grass)
     * Returns 2D array with 0 = green grass, 1 = dark grass
     */
    generateBiomeData() {
        const biomeData = [];
        for (let y = 0; y < this.height; y++) {
            biomeData[y] = [];
            for (let x = 0; x < this.width; x++) {
                biomeData[y][x] = 0; // Default to green grass
            }
        }

        // Generate 2-4 large dark grass zones (zone-based approach)
        const zoneCount = 2 + Math.floor(this.random() * 3);
        console.log(`[SharedWorldGenerator] Generating ${zoneCount} dark grass zones`);

        this.generateLargeBiomeZones(biomeData, zoneCount);

        return biomeData;
    }

    generateLargeBiomeZones(biomeData, zoneCount) {
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
                
                // Apply dark grass if this zone should be dark and has enough influence
                if (closestZone >= 0 && closestZone % 2 === 1 && influence > boundary) {
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
    generateStairsData(elevationData) {
        // Initialize stairs data
        this.stairsData = [];
        for (let y = 0; y < this.height; y++) {
            this.stairsData[y] = [];
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

    findAllPlateaus(elevationData) {
        const visited = [];
        const plateaus = [];
        
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

    floodFillPlateau(elevationData, startX, startY, visited) {
        const plateau = [];
        const queue = [{x: startX, y: startY}];
        visited[startY][startX] = true;
        
        while (queue.length > 0) {
            const {x, y} = queue.shift();
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

    placeStairsOnPlateau(elevationData, plateau, plateauIndex) {
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

    findPlateauEdges(elevationData, plateau) {
        const edges = {
            north: [],
            south: [],
            east: [],
            west: []
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

    findValidStairPositions(edgeTiles, direction, minLength) {
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

    selectBestEdgePosition(validRuns) {
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

    placeStairs(startPos, direction) {
        const {x, y} = startPos;
        
        // Check biome at stair location to determine which stair tileset to use
        const stairBiome = this.biomeData && this.biomeData[y] && this.biomeData[y][x] ? this.biomeData[y][x] : 0;
        const isDarkGrassStairs = stairBiome === 1;
        
        // Column offset for dark grass stairs (+11 columns, same rows)
        const colOffset = isDarkGrassStairs ? 11 : 0;
        
        switch (direction) {
            case 'west':
                // Place west stairs: rows 13-16, columns 2-3 (green) or 13-14 (dark)
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        if (x + dx >= 0 && y + dy < this.height) {
                            this.stairsData[y + dy][x + dx] = {
                                type: 'west',
                                tileX: 2 + dx + colOffset,
                                tileY: 13 + dy,
                                biome: stairBiome
                            };
                        }
                    }
                }
                break;
                
            case 'east':
                // Place east stairs: rows 13-16, columns 7-8 (green) or 18-19 (dark)
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        if (x + dx < this.width && y + dy < this.height) {
                            this.stairsData[y + dy][x + dx] = {
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
                // Place north stairs: rows 13-14, columns 4-6 (green) or 15-17 (dark)
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 3; dx++) {
                        if (x + dx < this.width && y + dy >= 0) {
                            this.stairsData[y + dy][x + dx] = {
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
                // Place south stairs: rows 15-17, columns 4-6 (green) or 15-17 (dark)
                for (let dy = 0; dy < 3; dy++) {
                    for (let dx = 0; dx < 3; dx++) {
                        if (x + dx < this.width && y + dy < this.height) {
                            this.stairsData[y + dy][x + dx] = {
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
    isStairTileWalkable(tileY, tileX) {
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
     * Get stairs data for use by collision system
     */
    getStairsData() {
        return this.stairsData;
    }
}