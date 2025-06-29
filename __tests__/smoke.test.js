// Basic smoke tests to verify the game doesn't crash on startup
import { SharedWorldGenerator } from '../shared/systems/WorldGenerator.js';
import { GAME_CONSTANTS } from '../shared/constants/GameConstants.js';

describe('Smoke Tests', () => {
  test('SharedWorldGenerator can create instance without crashing', () => {
    expect(() => {
      new SharedWorldGenerator(10, 10, 42);
    }).not.toThrow();
  });

  test('SharedWorldGenerator can generate small world', () => {
    const generator = new SharedWorldGenerator(10, 10, 42);
    
    let elevationData;
    expect(() => {
      elevationData = generator.generateElevationData();
    }).not.toThrow();
    
    // Verify world has correct dimensions
    expect(elevationData).toBeDefined();
    expect(elevationData.length).toBe(10); // 10 rows
    expect(elevationData[0].length).toBe(10); // 10 columns
    
    // Verify data contains only valid values (0 or 1)
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        expect([0, 1]).toContain(elevationData[y][x]);
      }
    }
  });

  test('Game constants are properly defined', () => {
    expect(GAME_CONSTANTS).toBeDefined();
    expect(GAME_CONSTANTS.WORLD.WIDTH).toBe(100);
    expect(GAME_CONSTANTS.WORLD.HEIGHT).toBe(100);
    expect(GAME_CONSTANTS.TICK_RATE).toBe(30);
  });
});