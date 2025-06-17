# Hardmode Multiplayer - Code Examples

## Core Server Architecture

### Game Server Main Loop
```typescript
// server/src/GameServer.ts
import { Server } from 'socket.io';
import { GameWorld } from './game/GameWorld';
import { NetworkManager } from './network/NetworkManager';
import { InputValidator } from './validation/InputValidator';

export class GameServer {
  private io: Server;
  private world: GameWorld;
  private networkManager: NetworkManager;
  private tickRate = 60;
  private networkRate = 20;
  private lastNetworkUpdate = 0;
  
  constructor(port: number) {
    this.io = new Server(port, {
      cors: { origin: '*' },
      transports: ['websocket']
    });
    
    this.world = new GameWorld();
    this.networkManager = new NetworkManager(this.io, this.world);
    
    this.setupSocketHandlers();
    this.startGameLoop();
  }
  
  private startGameLoop() {
    const tickInterval = 1000 / this.tickRate;
    let lastTick = Date.now();
    
    setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastTick) / 1000;
      lastTick = now;
      
      // Update game world
      this.world.update(deltaTime);
      
      // Send network updates at lower frequency
      if (now - this.lastNetworkUpdate >= 1000 / this.networkRate) {
        this.networkManager.broadcastWorldState();
        this.lastNetworkUpdate = now;
      }
    }, tickInterval);
  }
  
  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Player connected: ${socket.id}`);
      
      socket.on('join', (data) => {
        this.handlePlayerJoin(socket, data);
      });
      
      socket.on('input', (data) => {
        this.handlePlayerInput(socket.id, data);
      });
      
      socket.on('disconnect', () => {
        this.handlePlayerDisconnect(socket.id);
      });
    });
  }
}
```

### Entity Component System
```typescript
// shared/ecs/Entity.ts
export class Entity {
  public readonly id: string;
  private components: Map<string, Component> = new Map();
  private componentBits: number = 0;
  
  constructor(id: string) {
    this.id = id;
  }
  
  addComponent<T extends Component>(component: T): this {
    this.components.set(component.type, component);
    this.componentBits |= ComponentType[component.type];
    return this;
  }
  
  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T;
  }
  
  hasComponents(...types: string[]): boolean {
    const requiredBits = types.reduce((bits, type) => {
      return bits | ComponentType[type];
    }, 0);
    return (this.componentBits & requiredBits) === requiredBits;
  }
  
  serialize(): SerializedEntity {
    const components: Record<string, any> = {};
    this.components.forEach((comp, type) => {
      components[type] = comp.serialize();
    });
    
    return {
      id: this.id,
      components,
      componentBits: this.componentBits
    };
  }
}

// shared/ecs/components/PositionComponent.ts
export class PositionComponent implements Component {
  type = 'position';
  
  constructor(
    public x: number,
    public y: number
  ) {}
  
  serialize() {
    return { x: this.x, y: this.y };
  }
  
  deserialize(data: any) {
    this.x = data.x;
    this.y = data.y;
  }
  
  interpolate(other: PositionComponent, alpha: number) {
    this.x = this.x + (other.x - this.x) * alpha;
    this.y = this.y + (other.y - this.y) * alpha;
  }
}
```

### Movement System with Validation
```typescript
// server/src/systems/MovementSystem.ts
export class MovementSystem implements System {
  private readonly MAX_SPEED = 10;
  private readonly POSITION_EPSILON = 0.01;
  
  update(world: World, deltaTime: number) {
    // Query entities with position and velocity
    const entities = world.query(['position', 'velocity', 'player']);
    
    for (const entity of entities) {
      const position = entity.getComponent<PositionComponent>('position');
      const velocity = entity.getComponent<VelocityComponent>('velocity');
      const player = entity.getComponent<PlayerComponent>('player');
      
      // Validate movement
      if (!this.validateMovement(velocity, player)) {
        velocity.x = 0;
        velocity.y = 0;
        continue;
      }
      
      // Apply movement with collision detection
      const newX = position.x + velocity.x * deltaTime;
      const newY = position.y + velocity.y * deltaTime;
      
      if (world.isValidPosition(newX, newY, entity)) {
        position.x = newX;
        position.y = newY;
      } else {
        // Slide along walls
        if (world.isValidPosition(newX, position.y, entity)) {
          position.x = newX;
        }
        if (world.isValidPosition(position.x, newY, entity)) {
          position.y = newY;
        }
      }
    }
  }
  
  private validateMovement(velocity: VelocityComponent, player: PlayerComponent): boolean {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const maxSpeed = this.getMaxSpeed(player.class);
    
    if (speed > maxSpeed * 1.1) { // 10% tolerance for network latency
      console.warn(`Player ${player.id} exceeding max speed: ${speed} > ${maxSpeed}`);
      return false;
    }
    
    return true;
  }
  
  private getMaxSpeed(playerClass: string): number {
    const speeds: Record<string, number> = {
      'bladedancer': 5,
      'guardian': 3.5,
      'hunter': 5,
      'rogue': 6
    };
    return speeds[playerClass] || 5;
  }
}
```

### Client-Side Prediction
```typescript
// client/src/network/ClientPrediction.ts
export class ClientPrediction {
  private inputSequence = 0;
  private pendingInputs: Input[] = [];
  private lastServerState?: ServerState;
  
  constructor(
    private localPlayer: Entity,
    private connection: Connection
  ) {}
  
  processInput(keys: KeyState, mousePos: Vector2) {
    const input: Input = {
      sequence: this.inputSequence++,
      timestamp: Date.now(),
      keys,
      mousePosition: mousePos
    };
    
    // Send to server
    this.connection.send('input', input);
    
    // Apply locally for immediate feedback
    this.applyInput(this.localPlayer, input);
    
    // Save for reconciliation
    this.pendingInputs.push(input);
  }
  
  receiveServerUpdate(state: ServerState) {
    // Find our player in server state
    const serverPlayer = state.entities.find(e => e.id === this.localPlayer.id);
    if (!serverPlayer) return;
    
    // Update to authoritative position
    const position = this.localPlayer.getComponent<PositionComponent>('position');
    const serverPos = serverPlayer.components.position;
    
    position.x = serverPos.x;
    position.y = serverPos.y;
    
    // Remove acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(
      input => input.sequence > state.lastProcessedInput
    );
    
    // Replay unacknowledged inputs
    for (const input of this.pendingInputs) {
      this.applyInput(this.localPlayer, input);
    }
    
    this.lastServerState = state;
  }
  
  private applyInput(player: Entity, input: Input) {
    const velocity = player.getComponent<VelocityComponent>('velocity');
    const moveSpeed = this.getMoveSpeed(player);
    
    // Reset velocity
    velocity.x = 0;
    velocity.y = 0;
    
    // Apply input
    if (input.keys.up) velocity.y -= moveSpeed;
    if (input.keys.down) velocity.y += moveSpeed;
    if (input.keys.left) velocity.x -= moveSpeed;
    if (input.keys.right) velocity.x += moveSpeed;
    
    // Normalize diagonal movement
    if (velocity.x !== 0 && velocity.y !== 0) {
      const factor = 0.707; // 1/sqrt(2)
      velocity.x *= factor;
      velocity.y *= factor;
    }
  }
}
```

### Combat System with Lag Compensation
```typescript
// server/src/combat/CombatSystem.ts
export class CombatSystem {
  private hitHistory: HitHistory;
  
  constructor(private world: World) {
    this.hitHistory = new HitHistory();
  }
  
  processAttack(attackerId: string, attackData: AttackData) {
    const attacker = this.world.getEntity(attackerId);
    if (!attacker) return;
    
    // Get attacker's latency
    const connection = this.world.getPlayerConnection(attackerId);
    const latency = connection.getLatency();
    
    // Perform lag compensation
    const compensatedTime = Date.now() - latency;
    
    // Get historical positions
    const historicalPositions = this.world.getHistoricalState(compensatedTime);
    
    // Check hits with historical data
    const hits = this.checkHits(attacker, attackData, historicalPositions);
    
    // Apply damage
    for (const hit of hits) {
      this.applyDamage(hit.target, attackData.damage);
      
      // Notify clients
      this.world.broadcast('hit', {
        attacker: attackerId,
        target: hit.target.id,
        damage: attackData.damage,
        position: hit.position
      });
    }
  }
  
  private checkHits(
    attacker: Entity,
    attack: AttackData,
    positions: Map<string, Position>
  ): Hit[] {
    const hits: Hit[] = [];
    const attackerPos = positions.get(attacker.id)!;
    
    // Create hitbox based on attack type
    const hitbox = this.createHitbox(attackerPos, attack);
    
    // Check all potential targets
    for (const [targetId, targetPos] of positions) {
      if (targetId === attacker.id) continue;
      
      const target = this.world.getEntity(targetId);
      if (!target || !target.hasComponent('health')) continue;
      
      if (hitbox.contains(targetPos)) {
        hits.push({
          target,
          position: targetPos,
          distance: this.distance(attackerPos, targetPos)
        });
      }
    }
    
    // Sort by distance (closest first)
    return hits.sort((a, b) => a.distance - b.distance);
  }
}
```

### Network Optimization
```typescript
// server/src/network/NetworkOptimizer.ts
export class NetworkOptimizer {
  private lastUpdate: Map<string, any> = new Map();
  private updateFrequency: Map<string, number> = new Map();
  
  constructor() {
    // Configure update frequencies (ms)
    this.updateFrequency.set('position', 50);      // 20 Hz
    this.updateFrequency.set('health', 0);         // On change only
    this.updateFrequency.set('animation', 0);      // On change only
    this.updateFrequency.set('stats', 1000);       // 1 Hz
  }
  
  prepareUpdate(entity: Entity, forceFull = false): Update | null {
    const update: Update = {
      id: entity.id,
      components: {}
    };
    
    let hasChanges = false;
    
    for (const [type, component] of entity.components) {
      const frequency = this.updateFrequency.get(type) || 100;
      const lastSent = this.lastUpdate.get(`${entity.id}.${type}`);
      const current = component.serialize();
      
      // Check if update needed
      if (forceFull || 
          !lastSent ||
          (frequency === 0 && !this.deepEqual(lastSent, current)) ||
          (frequency > 0 && Date.now() - lastSent.time > frequency)) {
        
        // Delta compression for position
        if (type === 'position' && lastSent) {
          const delta: any = {};
          if (Math.abs(current.x - lastSent.x) > 0.01) delta.x = current.x;
          if (Math.abs(current.y - lastSent.y) > 0.01) delta.y = current.y;
          
          if (Object.keys(delta).length > 0) {
            update.components[type] = delta;
            hasChanges = true;
          }
        } else {
          update.components[type] = current;
          hasChanges = true;
        }
        
        this.lastUpdate.set(`${entity.id}.${type}`, {
          ...current,
          time: Date.now()
        });
      }
    }
    
    return hasChanges ? update : null;
  }
}
```

### World Generation (Deterministic)
```typescript
// server/src/world/WorldGenerator.ts
export class WorldGenerator {
  private noise: SimplexNoise;
  
  constructor(private seed: number) {
    this.noise = new SimplexNoise(seed);
  }
  
  generateChunk(chunkX: number, chunkY: number): Chunk {
    const chunk = new Chunk(chunkX, chunkY);
    const tileSize = 32;
    const chunkSize = 16;
    
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const worldX = chunkX * chunkSize + x;
        const worldY = chunkY * chunkSize + y;
        
        // Generate height value
        const height = this.getHeight(worldX, worldY);
        
        // Determine tile type
        let tileType: TileType;
        if (height < -0.3) {
          tileType = TileType.WATER;
        } else if (height < 0.2) {
          tileType = TileType.GRASS;
        } else if (height < 0.6) {
          tileType = TileType.SAND;
        } else {
          tileType = TileType.STONE;
        }
        
        chunk.setTile(x, y, new Tile(tileType));
      }
    }
    
    return chunk;
  }
  
  private getHeight(x: number, y: number): number {
    // Multi-octave noise for interesting terrain
    let height = 0;
    let amplitude = 1;
    let frequency = 0.01;
    
    for (let i = 0; i < 4; i++) {
      height += this.noise.noise2D(x * frequency, y * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return height;
  }
}
```

### Monster AI System
```typescript
// server/src/ai/MonsterAI.ts
export class MonsterAI {
  update(monster: Entity, world: World, deltaTime: number) {
    const ai = monster.getComponent<AIComponent>('ai');
    const position = monster.getComponent<PositionComponent>('position');
    
    switch (ai.state) {
      case AIState.IDLE:
        this.updateIdle(monster, world);
        break;
        
      case AIState.PURSUING:
        this.updatePursuing(monster, world, deltaTime);
        break;
        
      case AIState.ATTACKING:
        this.updateAttacking(monster, world, deltaTime);
        break;
        
      case AIState.FLEEING:
        this.updateFleeing(monster, world, deltaTime);
        break;
    }
  }
  
  private updateIdle(monster: Entity, world: World) {
    const ai = monster.getComponent<AIComponent>('ai');
    const position = monster.getComponent<PositionComponent>('position');
    const stats = monster.getComponent<StatsComponent>('stats');
    
    // Look for nearby players
    const nearbyPlayers = world.getEntitiesInRadius(
      position,
      stats.aggroRange,
      entity => entity.hasComponent('player')
    );
    
    if (nearbyPlayers.length > 0) {
      // Choose closest player
      const target = this.getClosestEntity(position, nearbyPlayers);
      ai.target = target.id;
      ai.state = AIState.PURSUING;
    } else {
      // Random wandering
      if (Math.random() < 0.01) { // 1% chance per frame
        const velocity = monster.getComponent<VelocityComponent>('velocity');
        velocity.x = (Math.random() - 0.5) * stats.moveSpeed;
        velocity.y = (Math.random() - 0.5) * stats.moveSpeed;
      }
    }
  }
  
  private updatePursuing(monster: Entity, world: World, deltaTime: number) {
    const ai = monster.getComponent<AIComponent>('ai');
    const position = monster.getComponent<PositionComponent>('position');
    const velocity = monster.getComponent<VelocityComponent>('velocity');
    const stats = monster.getComponent<StatsComponent>('stats');
    
    const target = world.getEntity(ai.target!);
    if (!target) {
      ai.state = AIState.IDLE;
      return;
    }
    
    const targetPos = target.getComponent<PositionComponent>('position');
    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > stats.aggroRange * 1.5) {
      // Lost target
      ai.state = AIState.IDLE;
      ai.target = null;
    } else if (distance <= stats.attackRange) {
      // In attack range
      velocity.x = 0;
      velocity.y = 0;
      ai.state = AIState.ATTACKING;
      ai.attackCooldown = stats.attackSpeed;
    } else {
      // Move toward target
      const speed = stats.moveSpeed / distance;
      velocity.x = dx * speed;
      velocity.y = dy * speed;
      
      // Simple obstacle avoidance
      if (!world.isValidPosition(position.x + velocity.x * deltaTime, position.y + velocity.y * deltaTime, monster)) {
        // Try to move around obstacle
        const perpX = -dy * speed * 0.5;
        const perpY = dx * speed * 0.5;
        
        if (world.isValidPosition(position.x + perpX * deltaTime, position.y + perpY * deltaTime, monster)) {
          velocity.x = perpX;
          velocity.y = perpY;
        } else if (world.isValidPosition(position.x - perpX * deltaTime, position.y - perpY * deltaTime, monster)) {
          velocity.x = -perpX;
          velocity.y = -perpY;
        }
      }
    }
  }
}
```

## Client-Side Rendering

### Interpolation System
```typescript
// client/src/rendering/InterpolationSystem.ts
export class InterpolationSystem {
  private entityStates: Map<string, EntityStateBuffer> = new Map();
  private renderTime: number = 0;
  private targetDelay: number = 100; // 100ms behind server
  
  addState(entityId: string, state: EntityState, timestamp: number) {
    if (!this.entityStates.has(entityId)) {
      this.entityStates.set(entityId, new EntityStateBuffer());
    }
    
    const buffer = this.entityStates.get(entityId)!;
    buffer.add(state, timestamp);
  }
  
  update(currentTime: number) {
    // Render time is in the past
    this.renderTime = currentTime - this.targetDelay;
  }
  
  getInterpolatedPosition(entityId: string): Position | null {
    const buffer = this.entityStates.get(entityId);
    if (!buffer) return null;
    
    const states = buffer.getStatesAround(this.renderTime);
    if (!states) return null;
    
    const { before, after } = states;
    
    // Calculate interpolation factor
    const timeDiff = after.timestamp - before.timestamp;
    const alpha = (this.renderTime - before.timestamp) / timeDiff;
    
    // Interpolate position
    return {
      x: before.position.x + (after.position.x - before.position.x) * alpha,
      y: before.position.y + (after.position.y - before.position.y) * alpha
    };
  }
}

class EntityStateBuffer {
  private states: Array<{ state: EntityState; timestamp: number }> = [];
  private maxSize = 10;
  
  add(state: EntityState, timestamp: number) {
    this.states.push({ state, timestamp });
    
    // Keep sorted by timestamp
    this.states.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove old states
    if (this.states.length > this.maxSize) {
      this.states.shift();
    }
  }
  
  getStatesAround(timestamp: number): { before: any; after: any } | null {
    for (let i = 0; i < this.states.length - 1; i++) {
      if (this.states[i].timestamp <= timestamp && 
          this.states[i + 1].timestamp >= timestamp) {
        return {
          before: this.states[i].state,
          after: this.states[i + 1].state
        };
      }
    }
    return null;
  }
}
```

## Testing Framework

### Network Testing
```typescript
// test/network/NetworkTest.ts
describe('Client Prediction', () => {
  let server: GameServer;
  let client1: GameClient;
  let client2: GameClient;
  
  beforeEach(async () => {
    server = new GameServer(3000);
    client1 = new GameClient('ws://localhost:3000');
    client2 = new GameClient('ws://localhost:3000');
    
    await client1.connect();
    await client2.connect();
  });
  
  test('movement reconciliation', async () => {
    // Client 1 moves right
    client1.sendInput({ keys: { right: true } });
    
    // Wait for server update
    await wait(100);
    
    // Both clients should see same position
    const pos1 = client1.getPlayerPosition(client1.playerId);
    const pos2 = client2.getPlayerPosition(client1.playerId);
    
    expect(pos1.x).toBeCloseTo(pos2.x, 1);
    expect(pos1.y).toBeCloseTo(pos2.y, 1);
  });
  
  test('lag compensation', async () => {
    // Simulate 100ms latency
    client1.simulateLatency(100);
    
    // Client 2 at position (100, 100)
    const targetPos = { x: 100, y: 100 };
    server.teleportPlayer(client2.playerId, targetPos);
    
    // Client 1 attacks where client 2 appears to be
    client1.attack({
      type: 'melee',
      direction: { x: 1, y: 0 },
      timestamp: Date.now()
    });
    
    // Wait for server processing
    await wait(150);
    
    // Client 2 should have taken damage despite latency
    const health = client2.getPlayerHealth(client2.playerId);
    expect(health).toBeLessThan(100);
  });
});
```

## Performance Monitoring

### Server Metrics
```typescript
// server/src/monitoring/Metrics.ts
export class ServerMetrics {
  private tickDurations: number[] = [];
  private networkBytes: number = 0;
  private activeConnections: number = 0;
  
  recordTick(duration: number) {
    this.tickDurations.push(duration);
    if (this.tickDurations.length > 60) {
      this.tickDurations.shift();
    }
  }
  
  recordNetworkTraffic(bytes: number) {
    this.networkBytes += bytes;
  }
  
  getMetrics() {
    const avgTick = this.tickDurations.reduce((a, b) => a + b, 0) / this.tickDurations.length;
    const maxTick = Math.max(...this.tickDurations);
    
    return {
      avgTickTime: avgTick,
      maxTickTime: maxTick,
      ticksPerSecond: 1000 / avgTick,
      networkBytesPerSecond: this.networkBytes,
      activeConnections: this.activeConnections,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
  
  logMetrics() {
    const metrics = this.getMetrics();
    console.log(`
=== Server Metrics ===`);
    console.log(`Tick: ${metrics.avgTickTime.toFixed(2)}ms avg, ${metrics.maxTickTime.toFixed(2)}ms max`);
    console.log(`TPS: ${metrics.ticksPerSecond.toFixed(1)}`);
    console.log(`Network: ${(metrics.networkBytesPerSecond / 1024).toFixed(2)} KB/s`);
    console.log(`Connections: ${metrics.activeConnections}`);
    console.log(`Memory: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  }
}
```

These code examples demonstrate the key architectural patterns and implementation details for building Hardmode as a multiplayer-first game. Each system is designed with networking as the primary constraint, ensuring smooth, scalable multiplayer gameplay from the ground up.