// Collision system tests - verify collision detection works correctly
import { CollisionMask } from '../shared/systems/CollisionMask.js';

describe('Collision System Tests', () => {
  test('CollisionMask can be created from elevation data', () => {
    // Create simple 5x5 test world
    const elevationData = [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]
    ];
    
    expect(() => {
      const collisionMask = new CollisionMask(5, 5, 64);
      collisionMask.generateFromElevationData(elevationData);
    }).not.toThrow();
  });

  test('Walkable areas are correctly identified', () => {
    const elevationData = [
      [0, 0, 0],
      [0, 1, 0], // Center elevated
      [0, 0, 0]
    ];
    
    const collisionMask = new CollisionMask(3, 3, 64);
    collisionMask.generateFromElevationData(elevationData);
    
    // Test using tile coordinates (0-2 for 3x3 world)
    // All boundary tiles should be unwalkable due to setWorldBoundaries()
    expect(collisionMask.isTileWalkable(0, 0)).toBe(false); // Top-left boundary
    expect(collisionMask.isTileWalkable(2, 2)).toBe(false); // Bottom-right boundary
    
    // Center tile should be unwalkable (elevated with cliff edges)
    expect(collisionMask.isTileWalkable(1, 1)).toBe(false); // Cliff edge
  });

  test('Collision detection handles world boundaries', () => {
    const elevationData = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    
    const collisionMask = new CollisionMask(elevationData, null);
    
    // Out of bounds should not be walkable
    expect(collisionMask.isWalkable(-1, 0)).toBe(false);
    expect(collisionMask.isWalkable(0, -1)).toBe(false);
    expect(collisionMask.isWalkable(3, 0)).toBe(false);
    expect(collisionMask.isWalkable(0, 3)).toBe(false);
  });

  test('Collision mask produces consistent results', () => {
    const elevationData = [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ];
    
    const mask1 = new CollisionMask(elevationData, null);
    const mask2 = new CollisionMask(elevationData, null);
    
    // Same input should produce same collision results
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(mask1.isWalkable(x, y)).toBe(mask2.isWalkable(x, y));
      }
    }
  });
});