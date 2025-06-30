// Terrain analysis script to test the new generation system
import { ClientWorldRenderer } from './src/js/systems/world/ClientWorldRenderer.js';
import { TilesetManager } from './src/js/systems/tiles/TilesetManager.js';

// Mock PIXI for testing
const mockPIXI = {
    Container: class { 
        constructor() { this.children = []; }
        addChild() {}
        addChildAt() {}
    },
    Graphics: class {
        beginFill() { return this; }
        drawRect() { return this; }
        endFill() { return this; }
    },
    Sprite: class {
        constructor() { 
            this.position = { set: () => {} };
            this.scale = { set: () => {} };
        }
    }
};

// Mock tilesets
const mockTilesets = {
    getRandomPureGrass: () => ({ valid: true }),
    textures: {
        terrain: Array(50).fill(null).map(() => 
            Array(11).fill(null).map(() => ({ valid: true }))
        )
    }
};

async function analyzeTerrain() {
    console.log("🔍 Analyzing new terrain generation system...\n");
    
    // Create world generator
    const generator = new WorldGenerator({
        width: 50,
        height: 50,
        tileSize: 64,
        tilesets: mockTilesets,
        seed: 42
    });
    
    // Override PIXI for testing
    global.PIXI = mockPIXI;
    
    // Generate terrain
    console.log("Generating terrain...");
    generator.generateBaseTerrain();
    generator.generateProperElevatedAreas();
    
    console.log("✅ Terrain generation completed!\n");
    
    // Analyze the elevation data
    analyzeElevationData(generator.elevationData);
    
    // Test bitmask calculations
    testBitmaskCalculations(generator);
}

function analyzeElevationData(elevationData) {
    const height = elevationData.length;
    const width = elevationData[0].length;
    
    console.log("📊 Elevation Data Analysis:");
    console.log(`World size: ${width}x${height}`);
    
    // Count elevated tiles
    let elevatedCount = 0;
    const plateaus = [];
    const visited = Array(height).fill(null).map(() => Array(width).fill(false));
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (elevationData[y][x] > 0) {
                elevatedCount++;
                
                // Find connected plateau
                if (!visited[y][x]) {
                    const plateau = floodFillPlateau(x, y, elevationData, visited);
                    if (plateau.length > 0) {
                        plateaus.push(plateau);
                    }
                }
            }
        }
    }
    
    console.log(`Total elevated tiles: ${elevatedCount}`);
    console.log(`Number of plateaus: ${plateaus.length}\n`);
    
    // Analyze each plateau
    console.log("🏔️  Plateau Analysis:");
    plateaus.forEach((plateau, index) => {
        const analysis = analyzePlateau(plateau);
        console.log(`Plateau ${index + 1}: ${plateau.length} tiles, ${analysis.width}x${analysis.height} (${analysis.minX},${analysis.minY} to ${analysis.maxX},${analysis.maxY})`);
        
        // Check for violations
        if (analysis.width < 3 || analysis.height < 3) {
            console.log(`  ❌ VIOLATION: Plateau smaller than 3x3!`);
        }
        if (plateau.length < 9) {
            console.log(`  ❌ VIOLATION: Plateau has fewer than 9 tiles!`);
        }
    });
    
    // Check for single jutting tiles
    console.log("\n🔍 Single Tile Analysis:");
    let singleTileCount = 0;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (elevationData[y][x] > 0) {
                const neighbors = [
                    elevationData[y-1][x], elevationData[y+1][x],
                    elevationData[y][x-1], elevationData[y][x+1]
                ];
                const elevatedNeighbors = neighbors.filter(n => n > 0).length;
                
                if (elevatedNeighbors <= 1) {
                    console.log(`  ❌ VIOLATION: Single jutting tile at (${x}, ${y})`);
                    singleTileCount++;
                }
            }
        }
    }
    
    if (singleTileCount === 0) {
        console.log("  ✅ No single jutting tiles found!");
    }
    
    console.log("");
}

function floodFillPlateau(startX, startY, elevationData, visited) {
    const plateau = [];
    const queue = [{x: startX, y: startY}];
    const height = elevationData.length;
    const width = elevationData[0].length;
    
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
            if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                !visited[ny][nx] && elevationData[ny][nx] > 0) {
                visited[ny][nx] = true;
                queue.push({x: nx, y: ny});
            }
        }
    }
    
    return plateau;
}

function analyzePlateau(plateau) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const {x, y} of plateau) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    
    return {
        minX, maxX, minY, maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}

function testBitmaskCalculations(generator) {
    console.log("🧮 Bitmask Calculation Test:");
    
    // Test cases for bitmask calculation
    const testCases = [
        {
            name: "Isolated elevated tile",
            pattern: [
                [0, 0, 0],
                [0, 1, 0],
                [0, 0, 0]
            ],
            expected: "All 8 bits set (255 - surrounded by lower)"
        },
        {
            name: "Top edge",
            pattern: [
                [0, 0, 0],
                [1, 1, 1],
                [1, 1, 1]
            ],
            expected: "North bit only (1)"
        },
        {
            name: "Bottom edge", 
            pattern: [
                [1, 1, 1],
                [1, 1, 1],
                [0, 0, 0]
            ],
            expected: "South bit only (16)"
        },
        {
            name: "NW corner",
            pattern: [
                [0, 0, 1],
                [0, 1, 1],
                [1, 1, 1]
            ],
            expected: "North + West bits (65)"
        }
    ];
    
    testCases.forEach(testCase => {
        console.log(`\nTest: ${testCase.name}`);
        console.log(`Expected: ${testCase.expected}`);
        
        // Create small test elevation data
        const testElevation = testCase.pattern;
        const bitmask = generator.cliffAutotiler.calculateBitmask(1, 1, testElevation);
        console.log(`Actual bitmask: ${bitmask}`);
        
        // Decode bitmask
        const bits = [];
        if (bitmask & 1) bits.push("NORTH");
        if (bitmask & 2) bits.push("NORTHEAST");
        if (bitmask & 4) bits.push("EAST");
        if (bitmask & 8) bits.push("SOUTHEAST");
        if (bitmask & 16) bits.push("SOUTH");
        if (bitmask & 32) bits.push("SOUTHWEST");
        if (bitmask & 64) bits.push("WEST");
        if (bitmask & 128) bits.push("NORTHWEST");
        
        console.log(`Decoded: ${bits.join(", ") || "None"}`);
    });
    
    console.log("\n✅ Bitmask testing completed!");
}

// Run the analysis
analyzeTerrain().catch(console.error);