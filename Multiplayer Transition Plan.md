# Multiplayer-First Architecture Guide for Hardmode

## Executive Summary

This document outlines how to rebuild Hardmode from scratch with multiplayer as the core architecture, avoiding the fundamental issues encountered when retrofitting multiplayer onto a single-player game.

## Key Architectural Principles

### 1. Server-Authoritative Design
- **All game logic runs on the server**
- Clients are "dumb terminals" that only handle:
  - Rendering
  - Input collection
  - Audio playback
  - UI display
- **Never trust the client** - validate everything server-side

### 2. Shared Data Models
- Create a `shared/` directory for code used by both client and server
- Define all game constants, entity interfaces, and network protocols here
- Use TypeScript for type safety across the stack

### 3. Entity Component System (ECS)
- Build a proper ECS from the start that works identically on client/server
- Components should be serializable for network transmission
- Systems should be able to run in "simulation" mode (server) or "presentation" mode (client)

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Project Setup
```typescript
// Directory structure
hardmode-multiplayer/
├── shared/           # Shared code between client and server
│   ├── types/       # TypeScript interfaces
│   ├── constants/   # Game constants
│   ├── ecs/         # ECS definitions
│   └── network/     # Network protocol definitions
├── server/          # Node.js game server
│   ├── src/
│   │   ├── ecs/     # Server ECS systems
│   │   ├── network/ # Socket handling
│   │   └── game/    # Game loop and logic
│   └── package.json
├── client/          # Browser game client  
│   ├── src/
│   │   ├── ecs/     # Client ECS systems
│   │   ├── network/ # Server communication
│   │   └── rendering/ # PIXI.js rendering
│   └── package.json
└── package.json     # Root package with scripts
```

#### 1.2 Network Protocol
```typescript
// shared/network/protocol.ts
export enum MessageType {
  // Client -> Server
  CONNECT = 'connect',
  INPUT = 'input',
  ATTACK = 'attack',
  
  // Server -> Client
  GAME_STATE = 'gameState',
  ENTITY_SPAWN = 'entitySpawn',
  ENTITY_DESPAWN = 'entityDespawn',
  ENTITY_UPDATE = 'entityUpdate',
}

export interface InputMessage {
  timestamp: number;
  sequenceNumber: number;
  keys: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  mousePosition: { x: number; y: number };
}
```

#### 1.3 ECS Foundation
```typescript
// shared/ecs/components.ts
export interface Component {
  type: string;
}

export interface PositionComponent extends Component {
  type: 'position';
  x: number;
  y: number;
}

export interface VelocityComponent extends Component {
  type: 'velocity';
  x: number;
  y: number;
}

// shared/ecs/entity.ts
export class Entity {
  id: string;
  components: Map<string, Component>;
  
  serialize(): any {
    return {
      id: this.id,
      components: Array.from(this.components.entries())
    };
  }
}
```

### Phase 2: Core Game Loop (Week 2)

#### 2.1 Server Game Loop
```typescript
// server/src/game/GameLoop.ts
export class GameLoop {
  private tickRate = 60; // 60Hz
  private tickInterval = 1000 / this.tickRate;
  private lastTick = Date.now();
  
  start() {
    setInterval(() => this.tick(), this.tickInterval);
  }
  
  private tick() {
    const now = Date.now();
    const deltaTime = (now - this.lastTick) / 1000;
    this.lastTick = now;
    
    // Update all systems
    this.systems.forEach(system => system.update(deltaTime));
    
    // Send updates to clients
    this.networkSystem.broadcastUpdates();
  }
}
```

#### 2.2 Client Prediction
```typescript
// client/src/network/Prediction.ts
export class ClientPrediction {
  private inputBuffer: InputMessage[] = [];
  private stateBuffer: GameState[] = [];
  private lastAcknowledgedInput = -1;
  
  processServerUpdate(serverState: GameState) {
    // Reconcile with server state
    this.reconcile(serverState);
    
    // Re-apply unacknowledged inputs
    this.reapplyInputs();
  }
}
```

### Phase 3: World Generation (Week 3)

#### 3.1 Deterministic Generation
```typescript
// server/src/world/WorldGenerator.ts
export class WorldGenerator {
  constructor(private seed: number) {}
  
  generateChunk(chunkX: number, chunkY: number): Chunk {
    // Use seeded random for deterministic generation
    const random = new SeededRandom(this.seed + chunkX * 1000 + chunkY);
    
    // Generate terrain
    return this.generateTerrain(chunkX, chunkY, random);
  }
}
```

#### 3.2 Chunk Streaming
```typescript
// server/src/world/ChunkManager.ts
export class ChunkManager {
  private loadedChunks = new Map<string, Chunk>();
  
  getChunksForPlayer(player: Entity): Chunk[] {
    const position = player.getComponent<PositionComponent>('position');
    const viewDistance = 3; // chunks
    
    // Load chunks around player
    const chunks: Chunk[] = [];
    for (let dx = -viewDistance; dx <= viewDistance; dx++) {
      for (let dy = -viewDistance; dy <= viewDistance; dy++) {
        chunks.push(this.getOrLoadChunk(chunkX + dx, chunkY + dy));
      }
    }
    return chunks;
  }
}
```

### Phase 4: Combat System (Week 4)

#### 4.1 Server-Side Hit Detection
```typescript
// server/src/combat/HitDetection.ts
export class HitDetection {
  checkMeleeHit(attacker: Entity, attack: Attack): Entity[] {
    const hitEntities: Entity[] = [];
    const attackerPos = attacker.getComponent<PositionComponent>('position');
    
    // Check all entities in range
    for (const target of this.world.getEntitiesInRange(attackerPos, attack.range)) {
      if (this.isInHitbox(attackerPos, target, attack.hitbox)) {
        hitEntities.push(target);
      }
    }
    
    return hitEntities;
  }
}
```

#### 4.2 Lag Compensation
```typescript
// server/src/combat/LagCompensation.ts  
export class LagCompensation {
  performRollback(timestamp: number, callback: () => void) {
    // Save current state
    const currentState = this.world.serialize();
    
    // Rollback to past state
    this.world.deserialize(this.getStateAt(timestamp));
    
    // Perform hit detection in past
    callback();
    
    // Restore current state
    this.world.deserialize(currentState);
  }
}
```

### Phase 5: Monster AI (Week 5)

#### 5.1 Server-Controlled AI
```typescript
// server/src/ai/MonsterAI.ts
export class MonsterAI {
  update(monster: Entity, players: Entity[]) {
    const state = monster.getComponent<AIStateComponent>('aiState');
    
    switch (state.current) {
      case 'idle':
        this.updateIdle(monster, players);
        break;
      case 'chasing':
        this.updateChasing(monster);
        break;
      case 'attacking':
        this.updateAttacking(monster);
        break;
    }
  }
}
```

### Phase 6: Performance Optimization (Week 6)

#### 6.1 Spatial Partitioning
```typescript
// server/src/world/SpatialHash.ts
export class SpatialHash {
  private cellSize = 100;
  private cells = new Map<string, Set<Entity>>();
  
  getEntitiesNear(position: Position, radius: number): Entity[] {
    const entities: Entity[] = [];
    
    // Check all cells that could contain entities within radius
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    // ... check cells and filter by actual distance
    
    return entities;
  }
}
```

#### 6.2 Update Prioritization
```typescript
// server/src/network/UpdatePrioritizer.ts
export class UpdatePrioritizer {
  getUpdatesForPlayer(player: Entity, allUpdates: Update[]): Update[] {
    return allUpdates
      .map(update => ({
        ...update,
        priority: this.calculatePriority(player, update)
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.maxUpdatesPerTick);
  }
}
```

## Critical Implementation Details

### Network Architecture

1. **Connection Management**
   - Use Socket.io with WebSocket transport
   - Implement reconnection logic with state restoration
   - Handle connection quality degradation gracefully

2. **State Synchronization**
   - Delta compression: only send changed properties
   - Prioritize updates based on player proximity
   - Use reliable ordered messages for critical events

3. **Input Handling**
   - Buffer inputs client-side with timestamps
   - Process inputs server-side with lag compensation
   - Send input acknowledgments to enable reconciliation

### Performance Considerations

1. **Server Performance**
   - Use worker threads for CPU-intensive operations
   - Implement object pooling to reduce GC pressure
   - Profile and optimize hot paths in game loop

2. **Network Optimization**
   - Implement view distance culling
   - Use binary protocol (MessagePack) instead of JSON
   - Compress updates using delta encoding

3. **Client Performance**
   - Separate render loop from network update processing
   - Use object pooling for PIXI display objects
   - Implement level-of-detail (LOD) for distant entities

### Security Considerations

1. **Input Validation**
   - Validate all inputs server-side
   - Implement rate limiting for actions
   - Check for impossible state transitions

2. **Anti-Cheat Measures**
   - Server-side movement validation
   - Sanity checks for player actions
   - Log suspicious behavior for review

3. **Data Protection**
   - Never send full game state to clients
   - Implement fog of war server-side
   - Validate all client requests

## Testing Strategy

### Unit Testing
- Test ECS components and systems in isolation
- Mock network layer for deterministic tests
- Test game logic without rendering

### Integration Testing  
- Test client-server communication
- Simulate network conditions (latency, packet loss)
- Test with multiple connected clients

### Load Testing
- Simulate 100+ concurrent players
- Monitor server performance metrics
- Test auto-scaling capabilities

## Migration Path from Single-Player

### What to Keep
- Art assets and animations
- Sound effects and music
- General game design concepts
- UI layouts (adapted for multiplayer)

### What to Rebuild
- Entire codebase (no retrofitting)
- Entity system (must be network-aware)
- Input handling (client prediction)
- World generation (deterministic)
- Combat system (server authoritative)
- AI system (server-side only)

### Development Best Practices

1. **Start Multiplayer from Day One**
   - Even with one player, run client-server architecture
   - Test with simulated latency from the beginning
   - Design all systems to be network-aware

2. **Maintain Shared Code**
   - Keep client and server in sync
   - Use TypeScript for type safety
   - Share constants and interfaces

3. **Design for Scale**
   - Plan for multiple server instances
   - Design stateless where possible  
   - Use horizontal scaling patterns

4. **Monitor Everything**
   - Track server performance metrics
   - Log player actions for debugging
   - Implement proper error reporting

## Conclusion

Building multiplayer-first requires fundamental architectural changes that cannot be effectively retrofitted. By following this guide and building with networking as the core concern from the start, you'll avoid the synchronization issues, performance problems, and gameplay inconsistencies that plague retrofitted multiplayer games.

The key is to embrace the client-server model fully, with the server as the single source of truth and clients as presentation layers. This approach, while requiring more initial setup, results in a more stable, scalable, and cheat-resistant game.