# HARDMODE MULTIPLAYER - TECHNICAL ARCHITECTURE
## Comprehensive Technical Design for Multiplayer-First Implementation

### ARCHITECTURE OVERVIEW

Hardmode multiplayer uses a **server-authoritative architecture** with client-side prediction and server reconciliation to provide smooth, responsive gameplay while maintaining security and consistency across all players.

### TECHNOLOGY STACK

#### Frontend (Client)
```
PIXI.js 7.x           - 2D rendering engine with WebGL support
TypeScript 5.x        - Type-safe JavaScript with shared definitions
Socket.io Client      - Real-time WebSocket communication
Vite 5.x             - Fast build tool and development server
ESLint + Prettier    - Code quality and formatting
```

#### Backend (Server)
```
Node.js 20.x LTS      - JavaScript runtime environment
TypeScript 5.x        - Shared type definitions with client
Express 4.x          - HTTP server framework
Socket.io Server     - WebSocket server for real-time communication
UUID v4              - Unique entity and player identification
```

#### Shared (Client + Server)
```
TypeScript Interfaces - Entity definitions, network protocol
Game Constants       - Attack timing, movement speed, hitbox data
ECS Components       - Position, Velocity, Health, Combat state
Utility Functions    - Direction conversion, collision detection
```

#### Development Tools
```
Concurrently         - Run client and server simultaneously
Nodemon             - Auto-restart server on changes
tsx                 - TypeScript execution for Node.js
Docker              - Containerization for deployment
```

### PROJECT STRUCTURE

```
hardmode-multiplayer/
├── shared/                    # Code shared between client and server
│   ├── types/
│   │   ├── Entity.ts         # Entity and component interfaces
│   │   ├── Network.ts        # Network message definitions
│   │   ├── Game.ts          # Game state and configuration types
│   │   └── Player.ts        # Player-specific types
│   ├── constants/
│   │   ├── GameConfig.ts    # Exact values from current game
│   │   ├── NetworkConfig.ts # Network timing and limits
│   │   └── PhysicsConfig.ts # Movement and collision values
│   ├── ecs/
│   │   ├── Component.ts     # Base component interface
│   │   ├── Entity.ts        # Entity class with serialization
│   │   └── System.ts        # Base system interface
│   └── utils/
│       ├── DirectionUtils.ts # 8-direction conversion functions
│       ├── MathUtils.ts     # Vector math and interpolation
│       └── Validation.ts    # Input and state validation
│
├── server/                   # Game server
│   ├── src/
│   │   ├── core/
│   │   │   ├── GameServer.ts      # Main server class
│   │   │   ├── GameWorld.ts       # World state management
│   │   │   └── GameLoop.ts        # 60Hz tick loop
│   │   ├── ecs/
│   │   │   ├── systems/
│   │   │   │   ├── MovementSystem.ts    # Player movement validation
│   │   │   │   ├── CombatSystem.ts      # Attack processing
│   │   │   │   ├── AISystem.ts          # Monster AI
│   │   │   │   ├── PhysicsSystem.ts     # Collision detection
│   │   │   │   └── NetworkSystem.ts     # State broadcasting
│   │   │   └── components/
│   │   │       ├── PositionComponent.ts
│   │   │       ├── VelocityComponent.ts
│   │   │       ├── HealthComponent.ts
│   │   │       ├── PlayerComponent.ts
│   │   │       └── AIComponent.ts
│   │   ├── network/
│   │   │   ├── Connection.ts        # Individual player connection
│   │   │   ├── MessageHandler.ts    # Process incoming messages
│   │   │   └── StateManager.ts      # Track and broadcast state
│   │   ├── world/
│   │   │   ├── WorldGenerator.ts    # Deterministic world generation
│   │   │   ├── ChunkManager.ts      # Spatial world organization
│   │   │   └── CollisionMap.ts      # Tile-based collision
│   │   ├── validation/
│   │   │   ├── InputValidator.ts    # Validate player inputs
│   │   │   ├── MovementValidator.ts # Check movement legality
│   │   │   └── AttackValidator.ts   # Verify attack timing
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
│
├── client/                   # Browser game client
│   ├── src/
│   │   ├── core/
│   │   │   ├── Game.ts              # Main game class
│   │   │   ├── GameState.ts         # Client game state
│   │   │   └── UpdateLoop.ts        # 60 FPS render loop
│   │   ├── network/
│   │   │   ├── NetworkManager.ts    # Server communication
│   │   │   ├── ClientPrediction.ts  # Local prediction system
│   │   │   └── StateReconciliation.ts # Server state sync
│   │   ├── rendering/
│   │   │   ├── Renderer.ts          # PIXI.js rendering
│   │   │   ├── Camera.ts            # Camera management
│   │   │   ├── SpriteManager.ts     # Sprite loading and animation
│   │   │   └── EffectManager.ts     # Particle effects
│   │   ├── input/
│   │   │   ├── InputManager.ts      # Keyboard and mouse input
│   │   │   └── InputBuffer.ts       # Store inputs for prediction
│   │   ├── ui/
│   │   │   ├── ClassSelection.ts    # Character class selection
│   │   │   ├── HUD.ts              # Health and stats display
│   │   │   └── UIManager.ts        # UI state management
│   │   ├── world/
│   │   │   ├── WorldRenderer.ts     # Render world tiles
│   │   │   └── TileManager.ts       # Tile sprite management
│   │   └── main.ts
│   ├── public/
│   │   ├── assets/                  # Existing game assets
│   │   └── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── package.json             # Root package with scripts
├── docker-compose.yml      # Development environment
└── README.md              # Setup and development guide
```

### NETWORK PROTOCOL

#### Message Types
```typescript
// shared/types/Network.ts
export enum MessageType {
  // Client -> Server
  PLAYER_JOIN = 'player:join',
  PLAYER_INPUT = 'player:input',
  PLAYER_ATTACK = 'player:attack',
  
  // Server -> Client
  GAME_STATE = 'game:state',
  ENTITY_UPDATE = 'entity:update',
  ENTITY_SPAWN = 'entity:spawn',
  ENTITY_DESPAWN = 'entity:despawn',
  ATTACK_EVENT = 'attack:event',
  DAMAGE_EVENT = 'damage:event',
}

export interface PlayerJoinMessage {
  username: string;
  characterClass: 'bladedancer' | 'guardian' | 'hunter' | 'rogue';
}

export interface PlayerInputMessage {
  sequenceNumber: number;
  timestamp: number;
  keys: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  mousePosition: { x: number; y: number };
}

export interface AttackMessage {
  attackType: 'primary' | 'secondary' | 'roll';
  timestamp: number;
  mousePosition: { x: number; y: number };
}\n\nexport interface GameStateMessage {\n  tick: number;\n  timestamp: number;\n  lastProcessedInput: number;\n  entities: SerializedEntity[];\n}\n\nexport interface EntityUpdate {\n  id: string;\n  components: { [key: string]: any };\n  timestamp: number;\n}\n```\n\n#### Binary Protocol Optimization\n\n```typescript\n// For high-frequency updates, use binary encoding\nexport class BinaryMessageEncoder {\n  static encodePosition(entityId: string, x: number, y: number): ArrayBuffer {\n    const buffer = new ArrayBuffer(12);\n    const view = new DataView(buffer);\n    \n    // 4 bytes for entity ID hash\n    view.setUint32(0, this.hashString(entityId));\n    // 4 bytes for X position (float32)\n    view.setFloat32(4, x);\n    // 4 bytes for Y position (float32)\n    view.setFloat32(8, y);\n    \n    return buffer;\n  }\n\n  static decodePosition(buffer: ArrayBuffer): PositionUpdate {\n    const view = new DataView(buffer);\n    return {\n      entityId: view.getUint32(0).toString(),\n      x: view.getFloat32(4),\n      y: view.getFloat32(8)\n    };\n  }\n}\n```\n\n### ENTITY COMPONENT SYSTEM (ECS)\n\n#### Core ECS Architecture\n\n```typescript\n// shared/ecs/Entity.ts\nexport class Entity {\n  public readonly id: string;\n  private components: Map<string, Component> = new Map();\n  private componentMask: number = 0;\n\n  constructor(id: string) {\n    this.id = id;\n  }\n\n  addComponent<T extends Component>(component: T): this {\n    this.components.set(component.type, component);\n    this.componentMask |= ComponentType[component.type];\n    return this;\n  }\n\n  getComponent<T extends Component>(type: string): T | undefined {\n    return this.components.get(type) as T;\n  }\n\n  hasComponent(type: string): boolean {\n    return this.components.has(type);\n  }\n\n  hasComponents(...types: string[]): boolean {\n    return types.every(type => this.hasComponent(type));\n  }\n\n  serialize(): SerializedEntity {\n    const serialized: { [key: string]: any } = {};\n    \n    for (const [type, component] of this.components) {\n      serialized[type] = component.serialize();\n    }\n    \n    return {\n      id: this.id,\n      components: serialized,\n      mask: this.componentMask\n    };\n  }\n\n  deserialize(data: SerializedEntity): void {\n    this.components.clear();\n    this.componentMask = data.mask;\n    \n    for (const [type, componentData] of Object.entries(data.components)) {\n      const component = ComponentFactory.create(type, componentData);\n      if (component) {\n        this.components.set(type, component);\n      }\n    }\n  }\n}\n```\n\n#### Component Definitions\n\n```typescript\n// shared/ecs/components/PositionComponent.ts\nexport class PositionComponent implements Component {\n  type = 'position';\n  \n  constructor(\n    public x: number = 0,\n    public y: number = 0\n  ) {}\n  \n  serialize() {\n    return { x: this.x, y: this.y };\n  }\n  \n  deserialize(data: any) {\n    this.x = data.x;\n    this.y = data.y;\n  }\n  \n  // Client-side interpolation\n  interpolate(other: PositionComponent, alpha: number) {\n    this.x = this.x + (other.x - this.x) * alpha;\n    this.y = this.y + (other.y - this.y) * alpha;\n  }\n  \n  distanceTo(other: PositionComponent): number {\n    const dx = this.x - other.x;\n    const dy = this.y - other.y;\n    return Math.sqrt(dx * dx + dy * dy);\n  }\n}\n\n// shared/ecs/components/VelocityComponent.ts\nexport class VelocityComponent implements Component {\n  type = 'velocity';\n  \n  constructor(\n    public x: number = 0,\n    public y: number = 0\n  ) {}\n  \n  serialize() {\n    return { x: this.x, y: this.y };\n  }\n  \n  deserialize(data: any) {\n    this.x = data.x;\n    this.y = data.y;\n  }\n  \n  magnitude(): number {\n    return Math.sqrt(this.x * this.x + this.y * this.y);\n  }\n  \n  normalize(): this {\n    const mag = this.magnitude();\n    if (mag > 0) {\n      this.x /= mag;\n      this.y /= mag;\n    }\n    return this;\n  }\n}\n\n// shared/ecs/components/PlayerComponent.ts\nexport class PlayerComponent implements Component {\n  type = 'player';\n  \n  constructor(\n    public username: string,\n    public characterClass: string,\n    public level: number = 1,\n    public experience: number = 0,\n    public facing: string = 'down',\n    public isAttacking: boolean = false,\n    public currentAttackType: string | null = null\n  ) {}\n  \n  serialize() {\n    return {\n      username: this.username,\n      characterClass: this.characterClass,\n      level: this.level,\n      experience: this.experience,\n      facing: this.facing,\n      isAttacking: this.isAttacking,\n      currentAttackType: this.currentAttackType\n    };\n  }\n  \n  deserialize(data: any) {\n    Object.assign(this, data);\n  }\n}\n\n// shared/ecs/components/HealthComponent.ts\nexport class HealthComponent implements Component {\n  type = 'health';\n  \n  constructor(\n    public current: number,\n    public maximum: number,\n    public isDead: boolean = false\n  ) {}\n  \n  serialize() {\n    return {\n      current: this.current,\n      maximum: this.maximum,\n      isDead: this.isDead\n    };\n  }\n  \n  deserialize(data: any) {\n    Object.assign(this, data);\n  }\n  \n  takeDamage(amount: number): boolean {\n    this.current = Math.max(0, this.current - amount);\n    this.isDead = this.current <= 0;\n    return this.isDead;\n  }\n  \n  heal(amount: number): void {\n    this.current = Math.min(this.maximum, this.current + amount);\n    if (this.current > 0) {\n      this.isDead = false;\n    }\n  }\n}\n```\n\n### GAME SYSTEMS\n\n#### Server-Side Movement System\n\n```typescript\n// server/src/ecs/systems/MovementSystem.ts\nexport class MovementSystem implements System {\n  private readonly MAX_SPEED_TOLERANCE = 1.1; // 10% tolerance for network lag\n  \n  update(world: World, deltaTime: number): void {\n    // Get all entities with position, velocity, and player components\n    const entities = world.query(['position', 'velocity', 'player']);\n    \n    for (const entity of entities) {\n      const position = entity.getComponent<PositionComponent>('position')!;\n      const velocity = entity.getComponent<VelocityComponent>('velocity')!;\n      const player = entity.getComponent<PlayerComponent>('player')!;\n      \n      // Validate movement speed\n      if (!this.validateMovement(velocity, player)) {\n        console.warn(`Invalid movement from player ${player.username}`);\n        velocity.x = 0;\n        velocity.y = 0;\n        continue;\n      }\n      \n      // Calculate new position\n      const newPosition = {\n        x: position.x + velocity.x * deltaTime,\n        y: position.y + velocity.y * deltaTime\n      };\n      \n      // Check collision\n      if (world.isValidPosition(newPosition.x, newPosition.y)) {\n        position.x = newPosition.x;\n        position.y = newPosition.y;\n      } else {\n        // Handle wall sliding\n        this.handleWallSliding(position, velocity, newPosition, world, deltaTime);\n      }\n    }\n  }\n  \n  private validateMovement(velocity: VelocityComponent, player: PlayerComponent): boolean {\n    const speed = velocity.magnitude();\n    const maxSpeed = this.getMaxSpeed(player.characterClass) * this.MAX_SPEED_TOLERANCE;\n    \n    return speed <= maxSpeed;\n  }\n  \n  private getMaxSpeed(characterClass: string): number {\n    const speeds: { [key: string]: number } = {\n      'bladedancer': 5,\n      'guardian': 3.5,\n      'hunter': 5,\n      'rogue': 6\n    };\n    return speeds[characterClass] || 5;\n  }\n  \n  private handleWallSliding(\n    position: PositionComponent,\n    velocity: VelocityComponent,\n    newPosition: { x: number; y: number },\n    world: World,\n    deltaTime: number\n  ): void {\n    // Try X movement only\n    if (world.isValidPosition(newPosition.x, position.y)) {\n      position.x = newPosition.x;\n    }\n    \n    // Try Y movement only\n    if (world.isValidPosition(position.x, newPosition.y)) {\n      position.y = newPosition.y;\n    }\n  }\n}\n```\n\n#### Client-Side Prediction System\n\n```typescript\n// client/src/network/ClientPrediction.ts\nexport class ClientPrediction {\n  private inputSequence = 0;\n  private pendingInputs: InputMessage[] = [];\n  private reconciliationBuffer: StateSnapshot[] = [];\n  private localPlayer: Entity;\n  \n  constructor(private networkManager: NetworkManager) {}\n  \n  processInput(inputState: InputState): void {\n    const input: InputMessage = {\n      sequenceNumber: this.inputSequence++,\n      timestamp: Date.now(),\n      keys: inputState.keys,\n      mousePosition: inputState.mousePosition\n    };\n    \n    // Send to server\n    this.networkManager.sendInput(input);\n    \n    // Apply immediately for responsive feel\n    this.applyInputLocally(input);\n    \n    // Store for potential rollback\n    this.pendingInputs.push(input);\n    \n    // Limit buffer size\n    if (this.pendingInputs.length > 60) { // 1 second at 60 FPS\n      this.pendingInputs.shift();\n    }\n  }\n  \n  receiveServerState(serverState: GameStateMessage): void {\n    // Find our player in server state\n    const serverPlayer = serverState.entities.find(\n      entity => entity.id === this.localPlayer.id\n    );\n    \n    if (!serverPlayer) return;\n    \n    // Remove acknowledged inputs\n    this.pendingInputs = this.pendingInputs.filter(\n      input => input.sequenceNumber > serverState.lastProcessedInput\n    );\n    \n    // Check if prediction was correct\n    const localPos = this.localPlayer.getComponent<PositionComponent>('position')!;\n    const serverPos = serverPlayer.components.position;\n    \n    const positionError = Math.sqrt(\n      Math.pow(localPos.x - serverPos.x, 2) + \n      Math.pow(localPos.y - serverPos.y, 2)\n    );\n    \n    // If error is significant, reconcile\n    if (positionError > 5) { // 5 pixel tolerance\n      this.reconcilePosition(serverPos);\n    }\n  }\n  \n  private applyInputLocally(input: InputMessage): void {\n    const velocity = this.localPlayer.getComponent<VelocityComponent>('velocity')!;\n    const player = this.localPlayer.getComponent<PlayerComponent>('player')!;\n    \n    // Calculate movement based on input\n    const movement = this.calculateMovement(input, player);\n    velocity.x = movement.x;\n    velocity.y = movement.y;\n    \n    // Apply movement immediately\n    const position = this.localPlayer.getComponent<PositionComponent>('position')!;\n    position.x += velocity.x * (1/60); // Assume 60 FPS\n    position.y += velocity.y * (1/60);\n  }\n  \n  private reconcilePosition(serverPosition: any): void {\n    // Snap to server position\n    const position = this.localPlayer.getComponent<PositionComponent>('position')!;\n    position.x = serverPosition.x;\n    position.y = serverPosition.y;\n    \n    // Re-apply unacknowledged inputs\n    for (const input of this.pendingInputs) {\n      this.applyInputLocally(input);\n    }\n  }\n}\n```\n\n### COMBAT SYSTEM\n\n#### Server-Side Combat Processing\n\n```typescript\n// server/src/ecs/systems/CombatSystem.ts\nexport class CombatSystem implements System {\n  private activeAttacks: Map<string, Attack> = new Map();\n  private hitHistory: HitHistory;\n  \n  constructor() {\n    this.hitHistory = new HitHistory();\n  }\n  \n  processAttack(attacker: Entity, attackType: string, timestamp: number): void {\n    const player = attacker.getComponent<PlayerComponent>('player')!;\n    const position = attacker.getComponent<PositionComponent>('position')!;\n    \n    // Get attack configuration\n    const attackConfig = this.getAttackConfig(player.characterClass, attackType);\n    if (!attackConfig) return;\n    \n    // Validate attack timing\n    if (!this.validateAttackTiming(attacker, attackType)) {\n      return;\n    }\n    \n    // Apply lag compensation\n    const compensatedTime = timestamp - this.getPlayerLatency(player.username);\n    const historicalPositions = this.hitHistory.getPositionsAt(compensatedTime);\n    \n    // Create attack\n    const attack: Attack = {\n      id: UUID.v4(),\n      attacker: attacker.id,\n      type: attackType,\n      config: attackConfig,\n      timestamp: Date.now(),\n      windupComplete: Date.now() + attackConfig.windupTime\n    };\n    \n    this.activeAttacks.set(attack.id, attack);\n    \n    // Schedule attack execution\n    setTimeout(() => {\n      this.executeAttack(attack, historicalPositions);\n    }, attackConfig.windupTime);\n  }\n  \n  private executeAttack(attack: Attack, historicalPositions: Map<string, Position>): void {\n    const attacker = this.world.getEntity(attack.attacker);\n    if (!attacker) return;\n    \n    const attackerPos = historicalPositions.get(attack.attacker) || \n                       attacker.getComponent<PositionComponent>('position');\n    \n    // Create hitbox\n    const hitbox = this.createHitbox(attackerPos, attack);\n    \n    // Check for hits\n    const hits = this.checkHits(hitbox, historicalPositions, attack.attacker);\n    \n    // Apply damage\n    for (const hit of hits) {\n      this.applyDamage(hit.target, attack.config.damage, attacker);\n    }\n    \n    // Broadcast attack event\n    this.world.broadcast('attack:executed', {\n      attackId: attack.id,\n      hits: hits.map(h => ({ target: h.target.id, damage: attack.config.damage }))\n    });\n    \n    this.activeAttacks.delete(attack.id);\n  }\n  \n  private createHitbox(position: any, attack: Attack): Hitbox {\n    const config = attack.config;\n    \n    switch (config.hitboxType) {\n      case 'rectangle':\n        return new RectangleHitbox(\n          position.x, position.y,\n          config.hitboxParams.width,\n          config.hitboxParams.length,\n          0 // rotation based on facing\n        );\n        \n      case 'cone':\n        return new ConeHitbox(\n          position.x, position.y,\n          config.hitboxParams.range,\n          config.hitboxParams.angle\n        );\n        \n      case 'circle':\n        return new CircleHitbox(\n          position.x, position.y,\n          config.hitboxParams.radius\n        );\n        \n      default:\n        throw new Error(`Unknown hitbox type: ${config.hitboxType}`);\n    }\n  }\n}\n```\n\n### WORLD GENERATION\n\n#### Deterministic World Generation\n\n```typescript\n// server/src/world/WorldGenerator.ts\nexport class WorldGenerator {\n  private seed: number;\n  private noise: SimplexNoise;\n  private width: number;\n  private height: number;\n  private tileSize: number;\n  \n  constructor(seed: number, width = 100, height = 100, tileSize = 64) {\n    this.seed = seed;\n    this.noise = new SimplexNoise(seed);\n    this.width = width;\n    this.height = height;\n    this.tileSize = tileSize;\n  }\n  \n  generateWorld(): WorldData {\n    const tiles: TileType[][] = [];\n    \n    // Generate base terrain\n    for (let y = 0; y < this.height; y++) {\n      tiles[y] = [];\n      for (let x = 0; x < this.width; x++) {\n        tiles[y][x] = this.generateTile(x, y);\n      }\n    }\n    \n    // Post-processing\n    this.cleanupIsolatedTiles(tiles);\n    this.generateWater(tiles);\n    this.processTransitions(tiles);\n    \n    return {\n      width: this.width,\n      height: this.height,\n      tileSize: this.tileSize,\n      tiles,\n      seed: this.seed\n    };\n  }\n  \n  private generateTile(x: number, y: number): TileType {\n    const noiseValue = this.noise.noise2D(x * 0.05, y * 0.05);\n    \n    if (noiseValue < -0.3) {\n      return TileType.SAND;\n    } else {\n      return TileType.GRASS;\n    }\n  }\n  \n  // Collision checking for multiplayer\n  isValidPosition(x: number, y: number, entityRadius = 0): boolean {\n    const tileX = Math.floor(x / this.tileSize);\n    const tileY = Math.floor(y / this.tileSize);\n    \n    // Check bounds\n    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {\n      return false;\n    }\n    \n    // Check if tile is walkable\n    const tile = this.tiles[tileY][tileX];\n    return tile !== TileType.WATER;\n  }\n}\n```\n\n### PERFORMANCE OPTIMIZATION\n\n#### Spatial Partitioning\n\n```typescript\n// server/src/world/SpatialHash.ts\nexport class SpatialHash {\n  private cellSize: number;\n  private cells: Map<string, Set<Entity>>;\n  \n  constructor(cellSize = 200) {\n    this.cellSize = cellSize;\n    this.cells = new Map();\n  }\n  \n  insert(entity: Entity): void {\n    const position = entity.getComponent<PositionComponent>('position');\n    if (!position) return;\n    \n    const cellKey = this.getCellKey(position.x, position.y);\n    \n    if (!this.cells.has(cellKey)) {\n      this.cells.set(cellKey, new Set());\n    }\n    \n    this.cells.get(cellKey)!.add(entity);\n  }\n  \n  getEntitiesInRadius(x: number, y: number, radius: number): Entity[] {\n    const entities: Entity[] = [];\n    const cellRadius = Math.ceil(radius / this.cellSize);\n    \n    const centerCellX = Math.floor(x / this.cellSize);\n    const centerCellY = Math.floor(y / this.cellSize);\n    \n    for (let dx = -cellRadius; dx <= cellRadius; dx++) {\n      for (let dy = -cellRadius; dy <= cellRadius; dy++) {\n        const cellKey = this.getCellKey(\n          (centerCellX + dx) * this.cellSize,\n          (centerCellY + dy) * this.cellSize\n        );\n        \n        const cell = this.cells.get(cellKey);\n        if (cell) {\n          for (const entity of cell) {\n            const pos = entity.getComponent<PositionComponent>('position');\n            if (pos && this.distance(x, y, pos.x, pos.y) <= radius) {\n              entities.push(entity);\n            }\n          }\n        }\n      }\n    }\n    \n    return entities;\n  }\n  \n  private getCellKey(x: number, y: number): string {\n    const cellX = Math.floor(x / this.cellSize);\n    const cellY = Math.floor(y / this.cellSize);\n    return `${cellX},${cellY}`;\n  }\n  \n  private distance(x1: number, y1: number, x2: number, y2: number): number {\n    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);\n  }\n}\n```\n\n#### Update Prioritization\n\n```typescript\n// server/src/network/StateManager.ts\nexport class StateManager {\n  private readonly MAX_UPDATES_PER_TICK = 50;\n  \n  getUpdatesForPlayer(player: Entity, allUpdates: EntityUpdate[]): EntityUpdate[] {\n    const playerPos = player.getComponent<PositionComponent>('position')!;\n    \n    // Calculate priority for each update\n    const prioritizedUpdates = allUpdates.map(update => {\n      const priority = this.calculatePriority(playerPos, update);\n      return { update, priority };\n    });\n    \n    // Sort by priority and take top N\n    return prioritizedUpdates\n      .sort((a, b) => b.priority - a.priority)\n      .slice(0, this.MAX_UPDATES_PER_TICK)\n      .map(item => item.update);\n  }\n  \n  private calculatePriority(playerPos: PositionComponent, update: EntityUpdate): number {\n    // Factors affecting priority:\n    // 1. Distance from player\n    // 2. Type of update (attacks > movement > stats)\n    // 3. Frequency of updates for this entity\n    \n    let priority = 100; // Base priority\n    \n    // Distance factor (closer = higher priority)\n    if (update.components.position) {\n      const distance = playerPos.distanceTo(update.components.position);\n      priority += Math.max(0, 1000 - distance); // Inverse distance\n    }\n    \n    // Update type factor\n    if (update.components.combat) {\n      priority += 500; // Combat updates are high priority\n    }\n    \n    return priority;\n  }\n}\n```\n\n### DEPLOYMENT ARCHITECTURE\n\n#### Docker Configuration\n\n```yaml\n# docker-compose.yml\nversion: '3.8'\n\nservices:\n  game-server:\n    build:\n      context: ./server\n      dockerfile: Dockerfile\n    ports:\n      - \"3000:3000\"\n    environment:\n      - NODE_ENV=production\n      - WORLD_SEED=${WORLD_SEED:-12345}\n      - MAX_PLAYERS=${MAX_PLAYERS:-100}\n      - TICK_RATE=60\n      - NETWORK_RATE=20\n    volumes:\n      - ./logs:/app/logs\n    restart: unless-stopped\n    \n  web-client:\n    build:\n      context: ./client\n      dockerfile: Dockerfile\n    ports:\n      - \"80:80\"\n    environment:\n      - VITE_SERVER_URL=ws://localhost:3000\n    depends_on:\n      - game-server\n    restart: unless-stopped\n    \n  nginx:\n    image: nginx:alpine\n    ports:\n      - \"443:443\"\n    volumes:\n      - ./nginx.conf:/etc/nginx/nginx.conf\n      - ./ssl:/etc/nginx/ssl\n    depends_on:\n      - web-client\n      - game-server\n    restart: unless-stopped\n```\n\n#### Scaling Configuration\n\n```typescript\n// server/src/core/GameServer.ts\nexport class GameServer {\n  private maxPlayers: number;\n  private currentPlayers: number = 0;\n  \n  constructor(options: ServerOptions) {\n    this.maxPlayers = options.maxPlayers || 100;\n    \n    // Setup clustering for multiple cores\n    if (cluster.isMaster && process.env.NODE_ENV === 'production') {\n      const numCPUs = os.cpus().length;\n      \n      for (let i = 0; i < numCPUs; i++) {\n        cluster.fork();\n      }\n      \n      cluster.on('exit', (worker) => {\n        console.log(`Worker ${worker.process.pid} died`);\n        cluster.fork();\n      });\n    } else {\n      this.start();\n    }\n  }\n  \n  private handleConnection(socket: Socket): void {\n    if (this.currentPlayers >= this.maxPlayers) {\n      socket.emit('server:full');\n      socket.disconnect();\n      return;\n    }\n    \n    this.currentPlayers++;\n    // ... rest of connection handling\n  }\n}\n```\n\n### MONITORING & OBSERVABILITY\n\n```typescript\n// server/src/monitoring/ServerMetrics.ts\nexport class ServerMetrics {\n  private metrics = {\n    tickDuration: new Histogram('game_tick_duration_ms'),\n    activePlayers: new Gauge('active_players'),\n    networkBandwidth: new Counter('network_bytes_total'),\n    attacksPerSecond: new Counter('attacks_total'),\n    errorsPerSecond: new Counter('errors_total')\n  };\n  \n  recordTick(duration: number): void {\n    this.metrics.tickDuration.observe(duration);\n    \n    if (duration > 16.67) { // Slower than 60 FPS\n      console.warn(`Slow tick: ${duration}ms`);\n    }\n  }\n  \n  recordPlayerCount(count: number): void {\n    this.metrics.activePlayers.set(count);\n  }\n  \n  recordNetworkTraffic(bytes: number): void {\n    this.metrics.networkBandwidth.inc(bytes);\n  }\n}\n```\n\nThis technical architecture provides a comprehensive foundation for building Hardmode as a multiplayer-first game, ensuring scalability, performance, and maintainability while preserving the exact gameplay mechanics of the original single-player version.