// World generation tests - verify deterministic generation and valid terrain
import { SharedWorldGenerator } from '../shared/systems/WorldGenerator.js';

describe('World Generation Tests', () => {
  test('World generation is deterministic with same seed', () => {
    const generator1 = new SharedWorldGenerator(20, 20, 123);
    const generator2 = new SharedWorldGenerator(20, 20, 123);
    
    const world1 = generator1.generateElevationData();
    const world2 = generator2.generateElevationData();
    
    // Same seed should produce identical worlds
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        expect(world1[y][x]).toBe(world2[y][x]);
      }
    }
  });

  test('Different seeds produce different worlds', () => {
    const generator1 = new SharedWorldGenerator(20, 20, 123);
    const generator2 = new SharedWorldGenerator(20, 20, 456);
    
    const world1 = generator1.generateElevationData();
    const world2 = generator2.generateElevationData();
    
    // Different seeds should produce different worlds
    let differences = 0;
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        if (world1[y][x] !== world2[y][x]) {
          differences++;
        }
      }
    }
    
    // Should have significant differences (at least 10% different)
    expect(differences).toBeGreaterThan(40); // 10% of 400 tiles
  });

  test('Generated world has reasonable elevation distribution', () => {
    const generator = new SharedWorldGenerator(50, 50, 42);
    const elevationData = generator.generateElevationData();
    
    let elevatedTiles = 0;
    const totalTiles = 50 * 50;
    
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        if (elevationData[y][x] === 1) {
          elevatedTiles++;
        }
      }
    }
    
    const elevatedPercentage = (elevatedTiles / totalTiles) * 100;
    
    // Should have reasonable amount of elevated terrain (between 5% and 50%)
    expect(elevatedPercentage).toBeGreaterThan(5);
    expect(elevatedPercentage).toBeLessThan(50);
  });

  test('World generation creates valid terrain', () => {
    const generator = new SharedWorldGenerator(30, 30, 42);
    const elevationData = generator.generateElevationData();
    
    // Test with larger world to see plateau placement behavior
    let totalElevatedTiles = 0;
    let cornerElevatedTiles = 0;
    
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++) {
        if (elevationData[y][x] === 1) {
          totalElevatedTiles++;
          
          // Check corners (first/last 3 tiles in each direction)
          if ((x < 3 || x >= 27) && (y < 3 || y >= 27)) {
            cornerElevatedTiles++;
          }
        }
      }
    }
    
    // Should have some elevated terrain
    expect(totalElevatedTiles).toBeGreaterThan(0);
    
    // Corners should have less elevated terrain than center due to buffer
    const cornerPercentage = (cornerElevatedTiles / totalElevatedTiles) * 100;
    expect(cornerPercentage).toBeLessThan(30); // Less than 30% in corners
  });
});