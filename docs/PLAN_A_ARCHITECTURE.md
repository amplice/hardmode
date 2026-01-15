# Plan A: Architecture for Scale

*Last updated: January 2026*

## Scale Goals

- **Substantially larger world** - Expand from 750x750 to 2000x2000+ tiles
- **World wrapping** - Toroidal topology so players never hit edges
- **Substantially more monsters** - Dense population for constant danger
- **100 concurrent players** - Target remains ~100 max

---

## Phase 1: World Expansion Foundation

### 1. World Wrapping (Toroidal Topology)
- Implement seamless world wrap - walking off east edge appears on west
- Modify collision detection to handle wrap boundaries
- Update pathfinding to find shortest path across wrap
- Update view distance culling to work across boundaries
- **Why:** Eliminates dead ends, world feels infinite, no "edge of map" awkwardness

### 2. Larger World Generation
- Scale world from 750x750 to 2000x2000+ tiles
- Lazy chunk generation - only generate chunks when first needed
- Optimize WorldGenerator for larger noise maps
- **Why:** More space for 100 players + many monsters without crowding

### 3. Collision Mask Optimization
- Current: Full 2D boolean array (~750KB for 750x750)
- At 2000x2000: ~4MB, at 3000x3000: ~9MB
- Consider chunk-based collision masks loaded on demand
- **Why:** Memory scales quadratically with world size

---

## Phase 2: Monster Density Support

### 4. Spatial Partitioning
- Implement grid-based spatial hash for monsters
- O(1) "get monsters near position" instead of iterating all
- Critical for collision detection, combat, and network culling
- **Why:** With 1000+ monsters, iterating all is too slow

### 5. Monster LOD System Enhancement
- Current: 4 tiers (near/medium/far/dormant)
- Add "hibernating" tier for very distant monsters (no updates at all)
- Chunk-based monster activation/deactivation
- **Why:** More monsters means more aggressive culling needed

### 6. Monster Spawn System Overhaul
- Chunk-based spawn management
- Maintain target density per chunk rather than global count
- Respawn monsters in chunks players leave, despawn in empty areas
- **Why:** Current global spawn system won't scale to huge worlds

---

## Phase 3: Network Optimization for Density

### 7. Area of Interest (AOI) Optimization
- Reduce network updates sent per client
- Only send monsters within view distance (already exists, but verify efficiency)
- Batch monster updates more aggressively
- **Why:** 100 players x 100 nearby monsters = 10,000 updates/tick without optimization

### 8. Delta Compression Hardening
- Add unit tests for delta compression
- Profile bandwidth usage with high monster counts
- Optimize critical fields list based on actual data
- **Why:** Need reliable delta compression before scaling up

---

## Phase 4: Server Performance

### 9. Server Tick Profiling
- Add timing metrics for each system (monsters, combat, network)
- Alert/log when tick exceeds 33ms (30fps target)
- Identify bottlenecks before scaling
- **Why:** Can't optimize what you can't measure

### 10. Pathfinding Optimization
- Current A* may struggle with 2000+ tile paths
- Add path caching for common routes
- Consider hierarchical pathfinding for long distances
- Limit pathfinding per tick (spread across frames)
- **Why:** More monsters = more pathfinding = potential bottleneck

---

## Phase 5: Client Performance

### 11. Chunked Rendering Expansion
- Verify chunk system works at larger world sizes
- May need larger chunk size or more aggressive unloading
- Monitor GPU memory with more visible monsters
- **Why:** Client needs to render smoothly regardless of world size

### 12. View Distance Smoothing
- Fade-in/fade-out for entities at boundaries
- **Why:** More monsters means more pop-in without this

---

## Priority Order

### Do First (enables everything else)
1. **Spatial Partitioning (#4)** - unlocks monster density
2. **Server Tick Profiling (#9)** - understand current limits
3. **World Wrapping (#1)** - changes many systems, do early

### Do Second (scale the world)
4. Larger World Generation (#2)
5. Collision Mask Optimization (#3)
6. Monster Spawn System Overhaul (#6)

### Do Third (handle the load)
7. Monster LOD Enhancement (#5)
8. AOI Optimization (#7)
9. Pathfinding Optimization (#10)

### Polish
10. Delta Compression Hardening (#8)
11. Chunked Rendering Expansion (#11)
12. View Distance Smoothing (#12)

---

## Current System Reference

### Existing Optimizations (already implemented)
- **Chunked Rendering**: 32x32 chunk system with 3x3 loading pattern
- **Monster LOD**: 4 tiers (near/medium/far/dormant) based on distance
- **Delta Compression**: 70-80% bandwidth reduction via NetworkOptimizer
- **View Distance Culling**: Only process/send nearby entities

### Key Files
- `server/managers/MonsterManager.ts` - Monster spawning and LOD
- `server/network/NetworkOptimizer.ts` - Delta compression
- `server/systems/AStarPathfinding.ts` - Monster pathfinding
- `shared/systems/WorldGenerator.ts` - World generation
- `shared/systems/CollisionMask.ts` - Collision detection
- `src/js/systems/tiles/ChunkedWorldRenderer.ts` - Client chunk rendering

### Current Limits
- World: 750x750 tiles (48,000 x 48,000 pixels)
- Monsters: Not formally limited, but performance degrades at high counts
- Players: Tested with 30+, target 100
