// Complete rewrite of world generation with proper 3x3 minimum enforcement
// Focus on generating correct terrain from the start rather than fixing it later

import * as PIXI from 'pixi.js';
import { Tile } from './Tile.js';
import { createNoise2D } from 'simplex-noise';
import { DecorationManager } from '../tiles/DecorationManager.js';
import { createSeededRandom } from '../../utils/Random.js';
import { CliffAutotiler } from '../tiles/CliffAutotilerNew.js';
import { CollisionMask } from '../../../shared/systems/CollisionMask.js';
import { SharedWorldGenerator } from '../../../shared/systems/WorldGenerator.js';

export class WorldGenerator {
  constructor(options = {}) {
    this.width = options.width || 100;
    this.height = options.height || 100;
    this.tileSize = options.tileSize || 64;
    this.tilesets = options.tilesets;
    this.seed = options.seed || 1;
    this.random = createSeededRandom(this.seed);
    this.noise2D = createNoise2D(this.random);
    this.container = new PIXI.Container();
    this.tiles = [];
    this.elevationData = [];
    this.cliffAutotiler = new CliffAutotiler(this.tilesets);
    
    // Initialize collision mask for debug visualization
    this.collisionMask = new CollisionMask(this.width, this.height, this.tileSize);
    console.log("[WorldGenerator] Client collision mask initialized");
  }

  generate() {
    console.log("Generating world with new simplified approach...");
    
    // Create world boundary
    this.createWorldBoundary();
    
    // Generate base terrain (all grass initially)
    this.generateBaseTerrain();
    
    // Generate elevation data using SharedWorldGenerator (same as server)
    const sharedWorldGen = new SharedWorldGenerator(this.width, this.height, this.seed);
    this.elevationData = sharedWorldGen.generateElevationData();
    
    // Generate collision mask from the same elevation data
    this.collisionMask.generateFromElevationData(this.elevationData);
    
    console.log("[WorldGenerator] Client collision mask generated");
    console.log("[WorldGenerator] Client collision stats:", this.collisionMask.getStats());
    
    // Place stairs on plateau edges before creating visual tiles
    this.placeStairsOnPlateaus();
    
    // Create visual tiles using new autotiler
    this.createTileSprites();
    
    // Create debug overlay for collision boundaries
    this.createCollisionDebugOverlay();
    
    console.log("World generation complete!");
    return this.container;
  }
  
  createWorldBoundary() {
    const worldBackground = new PIXI.Graphics();
    worldBackground.beginFill(0x6ea260);
    worldBackground.drawRect(0, 0, this.width * this.tileSize, this.height * this.tileSize);
    worldBackground.endFill();
    this.container.addChildAt(worldBackground, 0);
  }
  
  generateBaseTerrain() {
    console.log("Generating base terrain...");
    
    // Initialize tiles array only (elevationData will be set by SharedWorldGenerator)
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        const tile = new Tile(x, y, 'grass', this.tilesets, this.tileSize);
        this.tiles[y][x] = tile;
      }
    }
  }
  
  generateProperElevatedAreas() {
    console.log("Generating elevated areas with proper 3x3 minimum enforcement...");
    
    // Generate plateau candidates using noise
    this.generatePlateauCandidates();
    
    // Expand candidates to ensure 3x3 minimum
    this.enforceMinimumPlateauSizes();
    
    // Remove any remaining problematic formations
    this.finalCleanup();
    
    // Count elevated tiles
    let elevatedCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] > 0) elevatedCount++;
      }
    }
    console.log(`[DEBUG] Final elevated tiles: ${elevatedCount}`);
  }
  
  generatePlateauCandidates() {
    console.log("Generating plateau candidates with noise...");
    
    // Create several noise-based plateau seeds
    const plateauCount = 4 + Math.floor(this.random() * 3);
    
    for (let i = 0; i < plateauCount; i++) {
      // Choose center point with buffer for 3x3 minimum
      const cx = 10 + Math.floor(this.random() * (this.width - 20));
      const cy = 10 + Math.floor(this.random() * (this.height - 20));
      const baseRadius = 6 + Math.floor(this.random() * 8); // Larger to ensure 3x3
      
      console.log(`[DEBUG] Plateau ${i}: center (${cx}, ${cy}), radius ${baseRadius}`);
      
      // Use noise to create organic shape, but with minimum size guarantee
      this.createNoisyPlateau(cx, cy, baseRadius);
    }
  }
  
  createNoisyPlateau(centerX, centerY, radius) {
    const noiseScale = 0.1;
    const threshold = 0.2;
    
    // Create the core 3x3 area first (guaranteed)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          this.elevationData[y][x] = 1;
        }
      }
    }
    
    // Then expand outward with noise
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          // Skip if already set by core 3x3
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
          
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const distanceFactor = 1 - (distance / radius);
            const noiseValue = this.noise2D(x * noiseScale, y * noiseScale);
            const combined = distanceFactor + noiseValue * 0.3;
            
            if (combined > threshold) {
              this.elevationData[y][x] = 1;
            }
          }
        }
      }
    }
  }
  
  enforceMinimumPlateauSizes() {
    console.log("Enforcing 3x3 minimum plateau sizes...");
    
    const visited = [];
    for (let y = 0; y < this.height; y++) {
      visited[y] = new Array(this.width).fill(false);
    }
    
    // Find all connected plateau regions
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] > 0 && !visited[y][x]) {
          const plateau = this.floodFillPlateau(x, y, visited);
          this.ensurePlateauMeetsMinimum(plateau);
        }
      }
    }
  }
  
  floodFillPlateau(startX, startY, visited) {
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
            !visited[ny][nx] && this.elevationData[ny][nx] > 0) {
          visited[ny][nx] = true;
          queue.push({x: nx, y: ny});
        }
      }
    }
    
    return plateau;
  }
  
  ensurePlateauMeetsMinimum(plateau) {
    if (plateau.length === 0) return;
    
    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const {x, y} of plateau) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    
    // If plateau doesn't meet 3x3 minimum, either expand or remove
    if (width < 3 || height < 3 || plateau.length < 9) {
      if (this.canExpandPlateau(plateau, minX, minY, maxX, maxY)) {
        this.expandPlateauTo3x3(plateau, minX, minY, maxX, maxY);
      } else {
        this.removePlateau(plateau);
      }
    }
  }
  
  canExpandPlateau(plateau, minX, minY, maxX, maxY) {
    // Check if we can expand to 3x3 without going out of bounds
    const targetMinX = Math.max(0, minX - 1);
    const targetMaxX = Math.min(this.width - 1, maxX + 1);
    const targetMinY = Math.max(0, minY - 1);
    const targetMaxY = Math.min(this.height - 1, maxY + 1);
    
    const targetWidth = targetMaxX - targetMinX + 1;
    const targetHeight = targetMaxY - targetMinY + 1;
    
    return targetWidth >= 3 && targetHeight >= 3;
  }
  
  expandPlateauTo3x3(plateau, minX, minY, maxX, maxY) {
    // Expand to ensure at least 3x3
    const targetMinX = Math.max(0, minX - 1);
    const targetMaxX = Math.min(this.width - 1, Math.max(maxX + 1, minX + 2));
    const targetMinY = Math.max(0, minY - 1);
    const targetMaxY = Math.min(this.height - 1, Math.max(maxY + 1, minY + 2));
    
    // Fill the expanded area
    for (let y = targetMinY; y <= targetMaxY; y++) {
      for (let x = targetMinX; x <= targetMaxX; x++) {
        this.elevationData[y][x] = 1;
      }
    }
    
    console.log(`[DEBUG] Expanded plateau from ${maxX-minX+1}x${maxY-minY+1} to ${targetMaxX-targetMinX+1}x${targetMaxY-targetMinY+1}`);
  }
  
  removePlateau(plateau) {
    for (const {x, y} of plateau) {
      this.elevationData[y][x] = 0;
    }
    console.log(`[DEBUG] Removed plateau of ${plateau.length} tiles`);
  }
  
  finalCleanup() {
    console.log("Running final cleanup...");
    
    // One more pass to remove any remaining problematic tiles
    let cleanedCount = 0;
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.elevationData[y][x] === 1) {
          // Check if this tile has sufficient neighbors for a proper formation
          const neighbors = [
            this.elevationData[y-1][x], this.elevationData[y+1][x],
            this.elevationData[y][x-1], this.elevationData[y][x+1]
          ];
          
          const elevatedNeighbors = neighbors.filter(n => n > 0).length;
          
          // Remove isolated tiles
          if (elevatedNeighbors < 2) {
            this.elevationData[y][x] = 0;
            cleanedCount++;
          }
        }
      }
    }
    
    console.log(`[DEBUG] Final cleanup removed ${cleanedCount} isolated tiles`);
  }
  
  createTileSprites() {
    console.log("Creating tile sprites with new autotiler...");
    
    const processedTiles = [];
    for (let y = 0; y < this.height; y++) {
      processedTiles[y] = [];
    }
    
    // First pass: Create base terrain sprites
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        // Check if this position has stairs
        if (this.stairsData[y][x]) {
          // Place stair tile
          const stairInfo = this.stairsData[y][x];
          const stairTexture = this.tilesets.getTileTexture(stairInfo.tileX, stairInfo.tileY);
          
          const sprite = new PIXI.Sprite(stairTexture);
          sprite.position.set(0, 0);
          sprite.scale.set(this.tileSize / 32);
          tile.sprite = sprite;
          tile.container.addChild(sprite);
          
          // Mark stairs as walkable for now
          tile.isCliffEdge = false;
          processedTiles[y][x] = 'stairs';
        } else {
          // Normal tile processing
          const tileResult = this.cliffAutotiler.getTileTexture(x, y, this.elevationData, processedTiles);
          processedTiles[y][x] = tileResult.type;
          
          // Mark tile walkability based on collision mask
          tile.isCliffEdge = !this.collisionMask.isTileWalkable(x, y);
          
          const sprite = new PIXI.Sprite(tileResult.texture);
          sprite.position.set(0, 0);
          sprite.scale.set(this.tileSize / 32);
          tile.sprite = sprite;
          tile.container.addChild(sprite);
        }
        
        this.container.addChild(tile.container);
      }
    }
    
    // Second pass: Add cliff extensions
    this.addCliffExtensions(processedTiles);
  }
  
  addCliffExtensions(processedTiles) {
    console.log("Adding cliff extensions...");
    
    let extensionCount = 0;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] === 0) continue;
        
        const extensionTexture = this.cliffAutotiler.getCliffExtensionTexture(x, y, this.elevationData, processedTiles);
        
        if (extensionTexture && y + 1 < this.height) {
          const extensionSprite = new PIXI.Sprite(extensionTexture);
          extensionSprite.x = x * this.tileSize;
          extensionSprite.y = (y + 1) * this.tileSize;
          extensionSprite.scale.set(this.tileSize / 32);
          
          this.container.addChild(extensionSprite);
          extensionCount++;
        }
      }
    }
    
    console.log(`[DEBUG] Added ${extensionCount} cliff extensions`);
  }
  
  // Helper method to determine if a tile type is a cliff edge
  isCliffEdgeTile(tileType) {
    // Parse tile coordinates from type string like "0,0" or "5,6"
    if (typeof tileType !== 'string' || !tileType.includes(',')) {
      return false; // Not a cliff tile (probably grass)
    }
    
    const [row, col] = tileType.split(',').map(Number);
    
    // Check if it's any type of cliff edge or corner tile
    // Row 0: Top edges and corners
    if (row === 0 && (col === 0 || col === 6 || (col >= 1 && col <= 5))) return true;
    
    // Row 1: Side edges  
    if (row === 1 && (col === 0 || col === 6)) return true;
    
    // Row 2: Edge variations
    if (row === 2 && (col === 0 || col === 6)) return true;
    
    // Row 3: More edge variations
    if (row === 3 && (col === 0 || col === 6)) return true;
    
    // Row 5: Bottom edges and corners
    if (row === 5 && (col >= 0 && col <= 6)) return true;
    
    // Diagonal connectors are not walkable edges
    if ((row === 2 && (col === 7 || col === 10)) || 
        (row === 4 && (col === 8 || col === 9))) return true;
    
    return false; // Interior grass tiles are walkable
  }

  // Helper methods for compatibility
  getTileType(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.tiles[y][x].type;
  }
  
  getTileAt(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.tiles[y][x];
  }
  
  isTileWalkable(worldX, worldY) {
    return this.collisionMask.isWalkable(worldX, worldY);
  }
  
  createCollisionDebugOverlay() {
    console.log("Creating collision debug overlay...");
    
    // Create debug container
    this.debugContainer = new PIXI.Container();
    this.debugContainer.visible = false; // Hidden by default
    this.debugContainer.zIndex = 1000; // On top of everything
    
    // Create red overlay for each unwalkable tile
    let debugTileCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.collisionMask.isTileWalkable(x, y)) {
          const debugTile = this.createDebugTile(x, y);
          this.debugContainer.addChild(debugTile);
          debugTileCount++;
        }
      }
    }
    
    // Add debug container to world (so it moves with camera)
    this.container.addChild(this.debugContainer);
    
    console.log(`[Debug] Created ${debugTileCount} debug overlay tiles`);
    
    // Expose global toggle function
    window.toggleCollisionDebug = () => {
      this.debugContainer.visible = !this.debugContainer.visible;
      console.log(`Collision debug: ${this.debugContainer.visible ? 'ON' : 'OFF'}`);
      return this.debugContainer.visible ? 'Debug overlay enabled' : 'Debug overlay disabled';
    };
    
    console.log("Use toggleCollisionDebug() to show/hide collision boundaries");
  }
  
  createDebugTile(tileX, tileY) {
    const graphics = new PIXI.Graphics();
    
    // Semi-transparent red overlay
    graphics.beginFill(0xFF0000, 0.4);
    graphics.drawRect(0, 0, this.tileSize, this.tileSize);
    graphics.endFill();
    
    // Red border for clear definition
    graphics.lineStyle(2, 0xFF0000, 1.0);
    graphics.drawRect(0, 0, this.tileSize, this.tileSize);
    
    // Position at tile coordinates
    graphics.x = tileX * this.tileSize;
    graphics.y = tileY * this.tileSize;
    
    return graphics;
  }
  
  placeStairsOnPlateaus() {
    console.log("[WorldGenerator] Placing stairs on plateau edges...");
    
    // Initialize stairs data (stores what type of stairs at each position)
    this.stairsData = [];
    for (let y = 0; y < this.height; y++) {
      this.stairsData[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.stairsData[y][x] = null;
      }
    }
    
    // Find all plateaus
    const plateaus = this.findAllPlateaus();
    console.log(`[WorldGenerator] Found ${plateaus.length} plateaus`);
    
    // Place stairs on each plateau
    for (let i = 0; i < plateaus.length; i++) {
      this.placeStairsOnPlateau(plateaus[i], i);
    }
  }
  
  findAllPlateaus() {
    const visited = [];
    const plateaus = [];
    
    // Initialize visited array
    for (let y = 0; y < this.height; y++) {
      visited[y] = new Array(this.width).fill(false);
    }
    
    // Find all connected elevated regions
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.elevationData[y][x] > 0 && !visited[y][x]) {
          const plateau = this.floodFillPlateau(x, y, visited);
          if (plateau.length > 0) {
            plateaus.push(plateau);
          }
        }
      }
    }
    
    return plateaus;
  }
  
  floodFillPlateau(startX, startY, visited) {
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
            !visited[ny][nx] && this.elevationData[ny][nx] > 0) {
          visited[ny][nx] = true;
          queue.push({x: nx, y: ny});
        }
      }
    }
    
    return plateau;
  }
  
  placeStairsOnPlateau(plateau, plateauIndex) {
    // Find all valid edge positions for stairs
    const edges = this.findPlateauEdges(plateau);
    
    // Try to place stairs on each type of edge, preferring longer edges
    const stairPlacements = [];
    
    // Check west edges (need 2 consecutive vertical tiles)
    const validWestEdges = this.findValidStairPositions(edges.west, 'vertical', 2);
    if (validWestEdges.length > 0) {
      stairPlacements.push({
        type: 'west',
        positions: validWestEdges,
        edge: this.selectBestEdgePosition(validWestEdges)
      });
    }
    
    // Check east edges (need 2 consecutive vertical tiles)
    const validEastEdges = this.findValidStairPositions(edges.east, 'vertical', 2);
    if (validEastEdges.length > 0) {
      stairPlacements.push({
        type: 'east',
        positions: validEastEdges,
        edge: this.selectBestEdgePosition(validEastEdges)
      });
    }
    
    // Check north edges (need 3 consecutive horizontal tiles)
    const validNorthEdges = this.findValidStairPositions(edges.north, 'horizontal', 3);
    if (validNorthEdges.length > 0) {
      stairPlacements.push({
        type: 'north',
        positions: validNorthEdges,
        edge: this.selectBestEdgePosition(validNorthEdges)
      });
    }
    
    // Check south edges (need 3 consecutive horizontal tiles)
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
      
      console.log(`[WorldGenerator] Placed ${chosen.type} stairs on plateau ${plateauIndex} at (${chosen.edge.start.x}, ${chosen.edge.start.y})`);
    } else {
      console.log(`[WorldGenerator] Plateau ${plateauIndex} too small for stairs`);
    }
  }
  
  findPlateauEdges(plateau) {
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
    // Select the longest run, or the middle one if tied
    let bestRun = validRuns[0];
    for (const run of validRuns) {
      if (run.length > bestRun.length) {
        bestRun = run;
      }
    }
    
    // Return start position and length
    return {
      start: bestRun[0],
      length: bestRun.length
    };
  }
  
  placeStairs(startPos, direction) {
    const {x, y} = startPos;
    
    switch (direction) {
      case 'west':
        // Place 4x2 west stairs
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 4; dx++) {
            if (x - dx - 1 >= 0 && y + dy < this.height) {
              this.stairsData[y + dy][x - dx - 1] = {
                type: 'west',
                tileX: 13 + (3 - dx), // Reverse x for west stairs
                tileY: 2 + dy
              };
            }
          }
        }
        break;
        
      case 'east':
        // Place 4x2 east stairs
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 4; dx++) {
            if (x + dx + 1 < this.width && y + dy < this.height) {
              this.stairsData[y + dy][x + dx + 1] = {
                type: 'east',
                tileX: 13 + dx,
                tileY: 7 + dy
              };
            }
          }
        }
        break;
        
      case 'north':
        // Place 2x3 north stairs
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            if (x + dx < this.width && y - dy - 1 >= 0) {
              this.stairsData[y - dy - 1][x + dx] = {
                type: 'north',
                tileX: 13 + dx,
                tileY: 4 + (2 - dy) // Reverse y for north stairs
              };
            }
          }
        }
        break;
        
      case 'south':
        // Place 3x3 south stairs
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            if (x + dx < this.width && y + dy + 1 < this.height) {
              this.stairsData[y + dy + 1][x + dx] = {
                type: 'south',
                tileX: 15 + dx,
                tileY: 4 + dy
              };
            }
          }
        }
        break;
    }
  }
}