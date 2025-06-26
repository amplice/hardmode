// Simple terrain generation test without complex imports

console.log("🔍 Testing New Terrain Generation Logic...\n");

// Simulate the 8-bit bitmask system
const BITS = {
    NORTH:     1,   // bit 0
    NORTHEAST: 2,   // bit 1
    EAST:      4,   // bit 2
    SOUTHEAST: 8,   // bit 3
    SOUTH:     16,  // bit 4
    SOUTHWEST: 32,  // bit 5
    WEST:      64,  // bit 6
    NORTHWEST: 128  // bit 7
};

function calculateBitmask(x, y, elevationData) {
    const width = elevationData[0].length;
    const height = elevationData.length;
    const currentElevation = elevationData[y][x];
    
    let bitmask = 0;
    
    // Helper function to check neighbor elevation
    const isLowerOrEdge = (nx, ny) => {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            return true; // World edge counts as cliff
        }
        return elevationData[ny][nx] < currentElevation;
    };
    
    // Check all 8 directions
    if (isLowerOrEdge(x, y - 1)) bitmask |= BITS.NORTH;       // North
    if (isLowerOrEdge(x + 1, y - 1)) bitmask |= BITS.NORTHEAST; // Northeast
    if (isLowerOrEdge(x + 1, y)) bitmask |= BITS.EAST;        // East
    if (isLowerOrEdge(x + 1, y + 1)) bitmask |= BITS.SOUTHEAST; // Southeast
    if (isLowerOrEdge(x, y + 1)) bitmask |= BITS.SOUTH;       // South
    if (isLowerOrEdge(x - 1, y + 1)) bitmask |= BITS.SOUTHWEST; // Southwest
    if (isLowerOrEdge(x - 1, y)) bitmask |= BITS.WEST;        // West
    if (isLowerOrEdge(x - 1, y - 1)) bitmask |= BITS.NORTHWEST; // Northwest
    
    return bitmask;
}

function getTileForBitmask(bitmask) {
    // Check cardinal directions
    const hasNorth = (bitmask & BITS.NORTH) !== 0;
    const hasEast = (bitmask & BITS.EAST) !== 0;
    const hasSouth = (bitmask & BITS.SOUTH) !== 0;
    const hasWest = (bitmask & BITS.WEST) !== 0;
    
    // Check diagonals
    const hasNortheast = (bitmask & BITS.NORTHEAST) !== 0;
    const hasNorthwest = (bitmask & BITS.NORTHWEST) !== 0;
    const hasSoutheast = (bitmask & BITS.SOUTHEAST) !== 0;
    const hasSouthwest = (bitmask & BITS.SOUTHWEST) !== 0;
    
    // Priority 1: Corners (two adjacent cardinals)
    if (hasNorth && hasWest) return { tile: "(0,0)", type: "NW corner" };
    if (hasNorth && hasEast) return { tile: "(0,6)", type: "NE corner" };
    if (hasSouth && hasWest) return { tile: "(5,0)", type: "SW corner" };
    if (hasSouth && hasEast) return { tile: "(5,6)", type: "SE corner" };
    
    // Priority 2: Pure diagonal inner corners (diagonal but NO adjacent cardinals)
    if (hasNorthwest && !hasNorth && !hasWest) return { tile: "(2,7)", type: "NW inner corner" };
    if (hasNortheast && !hasNorth && !hasEast) return { tile: "(2,10)", type: "NE inner corner" };
    if (hasSouthwest && !hasSouth && !hasWest) return { tile: "(4,8)", type: "SW inner corner" };
    if (hasSoutheast && !hasSouth && !hasEast) return { tile: "(4,9)", type: "SE inner corner" };
    
    // Priority 3: Single cardinal edges
    if (hasNorth && !hasEast && !hasSouth && !hasWest) return { tile: "(0,1)", type: "top edge" };
    if (hasEast && !hasNorth && !hasSouth && !hasWest) return { tile: "(1,6)", type: "right edge" };
    if (hasSouth && !hasNorth && !hasEast && !hasWest) return { tile: "(5,1-5,5)", type: "bottom edge" };
    if (hasWest && !hasNorth && !hasEast && !hasSouth) return { tile: "(1,0)", type: "left edge" };
    
    // Priority 4: Fallback edges (any cardinal direction)
    if (hasNorth) return { tile: "(0,1)", type: "top edge fallback" };
    if (hasEast) return { tile: "(1,6)", type: "right edge fallback" };
    if (hasSouth) return { tile: "(5,1-5,5)", type: "bottom edge fallback" };
    if (hasWest) return { tile: "(1,0)", type: "left edge fallback" };
    
    // Priority 5: Pure grass (no neighbors lower)
    if (bitmask === 0) return { tile: "(1,1-1,5)", type: "grass" };
    
    return { tile: "unknown", type: `bitmask ${bitmask}` };
}

function decodeBitmask(bitmask) {
    const bits = [];
    if (bitmask & BITS.NORTH) bits.push("NORTH");
    if (bitmask & BITS.NORTHEAST) bits.push("NORTHEAST");
    if (bitmask & BITS.EAST) bits.push("EAST");
    if (bitmask & BITS.SOUTHEAST) bits.push("SOUTHEAST");
    if (bitmask & BITS.SOUTH) bits.push("SOUTH");
    if (bitmask & BITS.SOUTHWEST) bits.push("SOUTHWEST");
    if (bitmask & BITS.WEST) bits.push("WEST");
    if (bitmask & BITS.NORTHWEST) bits.push("NORTHWEST");
    return bits.join(", ") || "None";
}

// Test cases focusing on the previous bug patterns
console.log("🧮 Testing Bitmask Calculations:\n");

const testCases = [
    {
        name: "Bottom edge (should use 5,1-5,5 NOT 5,6)",
        pattern: [
            [1, 1, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        x: 1, y: 1
    },
    {
        name: "SE corner (should use 5,6)",
        pattern: [
            [1, 1, 0],
            [1, 1, 0],
            [1, 0, 0]
        ],
        x: 1, y: 1
    },
    {
        name: "SW corner (should use 5,0)", 
        pattern: [
            [0, 1, 1],
            [0, 1, 1],
            [0, 0, 1]
        ],
        x: 1, y: 1
    },
    {
        name: "NW inner corner (should use 2,7)",
        pattern: [
            [0, 1, 1],
            [1, 1, 1],
            [1, 1, 1]
        ],
        x: 1, y: 1
    },
    {
        name: "3x3 plateau center (should be grass)",
        pattern: [
            [1, 1, 1],
            [1, 1, 1],
            [1, 1, 1]
        ],
        x: 1, y: 1
    }
];

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    
    const bitmask = calculateBitmask(testCase.x, testCase.y, testCase.pattern);
    const tileInfo = getTileForBitmask(bitmask);
    
    console.log(`  Pattern:`);
    testCase.pattern.forEach(row => {
        console.log(`    [${row.join(', ')}]`);
    });
    console.log(`  Bitmask: ${bitmask} (${decodeBitmask(bitmask)})`);
    console.log(`  Tile: ${tileInfo.tile} (${tileInfo.type})`);
    
    // Check for specific bug patterns
    if (testCase.name.includes("Bottom edge") && tileInfo.tile.includes("5,6")) {
        console.log(`  ❌ BUG: Using corner tile (5,6) for bottom edge!`);
    } else if (testCase.name.includes("Bottom edge") && tileInfo.tile.includes("5,1-5,5")) {
        console.log(`  ✅ CORRECT: Using proper bottom edge tiles`);
    }
    
    if (testCase.name.includes("SE corner") && tileInfo.tile === "(5,6)") {
        console.log(`  ✅ CORRECT: Using SE corner tile for true corner`);
    }
    
    console.log("");
});

console.log("🏔️  Testing 3x3 Minimum Generation:\n");

// Simulate simple plateau generation
function generateTestPlateau() {
    const size = 20;
    const elevationData = Array(size).fill(null).map(() => Array(size).fill(0));
    
    // Create a 3x3 plateau
    for (let y = 8; y <= 10; y++) {
        for (let x = 8; x <= 10; x++) {
            elevationData[y][x] = 1;
        }
    }
    
    // Create a 4x4 plateau
    for (let y = 15; y <= 18; y++) {
        for (let x = 15; x <= 18; x++) {
            elevationData[y][x] = 1;
        }
    }
    
    return elevationData;
}

const testTerrain = generateTestPlateau();
console.log("Generated test terrain with 3x3 and 4x4 plateaus");

// Analyze the test terrain
console.log("\nAnalyzing plateau edges:");
const size = testTerrain.length;
for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
        if (testTerrain[y][x] === 1) {
            const bitmask = calculateBitmask(x, y, testTerrain);
            const tileInfo = getTileForBitmask(bitmask);
            
            // Only log edge/corner tiles
            if (bitmask !== 0) {
                console.log(`  (${x},${y}): ${tileInfo.tile} (${tileInfo.type})`);
                
                // Check for bug patterns
                if (tileInfo.type === "bottom edge" && tileInfo.tile.includes("5,6")) {
                    console.log(`    ❌ BUG: Bottom edge using corner tile!`);
                }
            }
        }
    }
}

console.log("\n✅ Terrain generation test completed!");
console.log("\nKey improvements to verify in actual game:");
console.log("1. Bottom edges should use (5,1) to (5,5) tiles randomly");
console.log("2. SE corners should only use (5,6) when both SOUTH and EAST bits are set");
console.log("3. All plateaus should be minimum 3x3 tiles");
console.log("4. No isolated single tiles should exist");
console.log("5. Inner corners should use diagonal connectors (2,7), (2,10), (4,8), (4,9)");