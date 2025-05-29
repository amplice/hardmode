Multiplayer Architecture Plan for Isometric Action RPG
======================================================

Overview
--------

This document outlines a comprehensive plan to transform the single-player isometric action RPG into a multiplayer game. The approach emphasizes maintaining a playable game at each stage while progressively adding multiplayer capabilities.

Architecture Goals
------------------

1.  **Authoritative Server**: Server owns all game state to prevent cheating
2.  **Client Prediction**: Smooth gameplay despite network latency
3.  **Scalability**: Support 2-8 players per game instance
4.  **Backwards Compatibility**: Maintain single-player mode throughout development

Technical Stack
---------------

-   **Frontend**: Existing PIXI.js client
-   **Backend**: Node.js game server
-   **Networking**: WebSockets (Socket.io recommended for reliability)
-   **Protocol**: JSON messages with binary fallback for performance-critical data

* * * * *

Stage 1: Local Client-Server Split
----------------------------------

**Goal**: Refactor architecture without breaking gameplay

### 1.1 Create Message Protocol

Define all message types for client-server communication:

javascript

```
// Client -> Server Messages
{
  LOGIN: { username: string },
  INPUT: {
    keys: { w: bool, a: bool, s: bool, d: bool, space: bool, shift: bool },
    mouse: { x: number, y: number, leftButton: bool },
    timestamp: number,
    sequenceNumber: number
  },
  ATTACK: { type: 'primary' | 'secondary' | 'roll', sequenceNumber: number },
  CLASS_SELECT: { class: string }
}

// Server -> Client Messages
{
  GAME_STATE: {
    players: [],
    monsters: [],
    projectiles: [],
    timestamp: number
  },
  PLAYER_JOINED: { playerId: string, playerData: {} },
  PLAYER_LEFT: { playerId: string },
  ENTITY_SPAWN: { type: string, id: string, data: {} },
  ENTITY_DESPAWN: { id: string },
  DAMAGE_EVENT: { targetId: string, damage: number, attackerId: string },
  EFFECT_SPAWN: { type: string, position: {}, facing: string }
}
```

### 1.2 Create LocalServer Class

javascript

```
class LocalServer {
  constructor() {
    this.gameState = {
      players: new Map(),
      monsters: new Map(),
      projectiles: new Map(),
      nextEntityId: 1
    };
    this.messageHandlers = new Map();
    this.clients = new Map();
  }

  connectClient(clientId, client) { /* ... */ }
  handleMessage(clientId, message) { /* ... */ }
  broadcast(message, excludeClient) { /* ... */ }
  update(deltaTime) { /* ... */ }
}
```

### 1.3 Refactor Game Class as Client

-   Move authoritative state to LocalServer
-   Game class becomes view/input layer only
-   Replace direct entity updates with server messages

### 1.4 Entity ID System

Add unique network IDs to all entities:

javascript

```
// Before: entity.position = {x, y}
// After: entity = { id: 'player_1', position: {x, y}, ... }
```

* * * * *

Stage 2: Network Communication Layer
------------------------------------

**Goal**: Replace local message passing with WebSocket communication

### 2.1 Create Node.js Game Server

javascript

```
// server/GameServer.js
class GameServer {
  constructor() {
    this.games = new Map(); // gameId -> GameInstance
    this.players = new Map(); // socketId -> playerData
  }

  handleConnection(socket) { /* ... */ }
  createGame(hostPlayer) { /* ... */ }
  joinGame(gameId, player) { /* ... */ }
}

// server/GameInstance.js
class GameInstance {
  constructor(gameId) {
    this.id = gameId;
    this.players = new Map();
    this.state = { /* ... */ };
    this.updateRate = 20; // 20Hz server tick
  }

  update(deltaTime) { /* ... */ }
  handlePlayerInput(playerId, input) { /* ... */ }
}
```

### 2.2 Client Network Manager

javascript

```
class NetworkManager {
  constructor(gameClient) {
    this.socket = null;
    this.gameClient = gameClient;
    this.serverTimeOffset = 0;
    this.latency = 0;
  }

  connect(serverUrl) { /* ... */ }
  sendInput(input) { /* ... */ }
  handleServerMessage(message) { /* ... */ }
}
```

### 2.3 Lobby System

-   Game creation/joining
-   Player ready states
-   Character selection synchronization

* * * * *

Stage 3: State Synchronization
------------------------------

**Goal**: Efficiently sync game state between server and clients

### 3.1 State Compression

javascript

```
// Full state (sent on join or reconnect)
{
  fullState: true,
  entities: [
    { id: 'player_1', type: 'player', x: 100, y: 200, hp: 3, class: 'bladedancer' },
    { id: 'monster_5', type: 'skeleton', x: 300, y: 400, hp: 2, state: 'idle' }
  ]
}

// Delta state (sent each tick)
{
  tick: 1234,
  updates: [
    { id: 'player_1', x: 105, y: 200 }, // Only changed fields
    { id: 'monster_5', state: 'attacking' }
  ],
  spawns: [...],
  despawns: [...]
}
```

### 3.2 Interest Management

Only send updates for entities near the player:

javascript

```
function getRelevantEntities(player, allEntities, viewDistance) {
  return allEntities.filter(entity => {
    const distance = calculateDistance(player.position, entity.position);
    return distance <= viewDistance;
  });
}
```

### 3.3 Reliable vs Unreliable Messages

-   **Reliable** (TCP/WebSocket): Damage, spawns, despawns, chat
-   **Unreliable** (if using WebRTC DataChannels): Position updates, animations

* * * * *

Stage 4: Client Prediction & Lag Compensation
---------------------------------------------

**Goal**: Smooth gameplay despite network latency

### 4.1 Client-Side Prediction

javascript

```
class ClientPrediction {
  constructor() {
    this.pendingInputs = [];
    this.lastAcknowledgedInput = -1;
  }

  applyInput(input) {
    // Apply input locally immediately
    this.localPlayer.applyInput(input);

    // Store for later reconciliation
    this.pendingInputs.push({
      input: input,
      sequenceNumber: this.nextSequenceNumber++,
      resultPosition: { ...this.localPlayer.position }
    });

    // Send to server
    this.network.sendInput(input);
  }

  reconcile(serverState, lastProcessedInput) {
    // Remove acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(
      pending => pending.sequenceNumber > lastProcessedInput
    );

    // Re-apply unacknowledged inputs
    this.localPlayer.position = serverState.position;
    for (const pending of this.pendingInputs) {
      this.localPlayer.applyInput(pending.input);
    }
  }
}
```

### 4.2 Entity Interpolation

javascript

```
class EntityInterpolation {
  constructor() {
    this.stateBuffer = []; // Ring buffer of past states
    this.interpolationDelay = 100; // ms
  }

  addState(state, timestamp) {
    this.stateBuffer.push({ state, timestamp });
    // Keep only last 1 second
    const cutoff = timestamp - 1000;
    this.stateBuffer = this.stateBuffer.filter(s => s.timestamp > cutoff);
  }

  getInterpolatedState(renderTime) {
    const targetTime = renderTime - this.interpolationDelay;

    // Find states to interpolate between
    let before = null, after = null;
    for (let i = 0; i < this.stateBuffer.length - 1; i++) {
      if (this.stateBuffer[i].timestamp <= targetTime &&
          this.stateBuffer[i + 1].timestamp >= targetTime) {
        before = this.stateBuffer[i];
        after = this.stateBuffer[i + 1];
        break;
      }
    }

    if (before && after) {
      const t = (targetTime - before.timestamp) /
                (after.timestamp - before.timestamp);
      return this.lerp(before.state, after.state, t);
    }

    return this.stateBuffer[this.stateBuffer.length - 1]?.state;
  }
}
```

### 4.3 Lag Compensation for Combat

javascript

```
class LagCompensation {
  constructor() {
    this.positionHistory = new Map(); // entityId -> timestamp -> position
    this.historyDuration = 1000; // Keep 1 second
  }

  // Server-side: Rewind to when client fired
  processAttack(attackerId, targetId, clientTimestamp) {
    const serverTime = Date.now();
    const latency = this.players.get(attackerId).latency;
    const attackTime = clientTimestamp + latency;

    // Get target position at attack time
    const targetHistory = this.positionHistory.get(targetId);
    const targetPosition = this.getPositionAtTime(targetHistory, attackTime);

    // Validate hit with rewound position
    return this.validateHit(attackerId, targetPosition);
  }
}
```

* * * * *

Stage 5: Multiplayer-Specific Features
--------------------------------------

**Goal**: Add features that enhance multiplayer experience

### 5.1 Player Identification

-   Floating nameplates above characters
-   Different visual indicators for local vs remote players
-   Team colors if implementing teams

### 5.2 Chat System

javascript

```
{
  CHAT_MESSAGE: {
    type: 'global' | 'team' | 'whisper',
    message: string,
    to?: playerId
  }
}
```

### 5.3 Spectator Mode

-   Allow dead players to spectate
-   Free camera for spectators
-   Ability to follow specific players

### 5.4 Network Statistics Display

-   Ping/latency indicator
-   Packet loss warning
-   Server tick rate display

* * * * *

Stage 6: Performance Optimization
---------------------------------

**Goal**: Ensure smooth gameplay with multiple players

### 6.1 Spatial Partitioning

javascript

```
class SpatialGrid {
  constructor(worldWidth, worldHeight, cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  insert(entity) { /* ... */ }
  remove(entity) { /* ... */ }
  getNearby(position, radius) { /* ... */ }
}
```

### 6.2 Update Prioritization

-   Send more frequent updates for entities close to players
-   Reduce update rate for distant/occluded entities
-   Batch similar updates together

### 6.3 Client-Side Optimizations

-   Object pooling for network messages
-   Throttle non-critical updates
-   Level-of-detail for distant players

* * * * *

Implementation Timeline
-----------------------

### Phase 1: Foundation (2-3 weeks)

-   Stage 1: Local client-server split
-   Basic message protocol
-   Entity ID system

### Phase 2: Networking (2-3 weeks)

-   Stage 2: WebSocket integration
-   Basic lobby system
-   Initial multiplayer testing with 2 players

### Phase 3: Core Multiplayer (3-4 weeks)

-   Stage 3: State synchronization
-   Stage 4: Client prediction
-   Combat synchronization

### Phase 4: Polish (2-3 weeks)

-   Stage 5: Multiplayer features
-   Stage 6: Performance optimization
-   Extensive testing with 4-8 players

* * * * *

Testing Strategy
----------------

### Unit Tests

-   Message serialization/deserialization
-   State compression algorithms
-   Prediction/reconciliation logic

### Integration Tests

-   Client-server communication
-   State synchronization accuracy
-   Lag compensation correctness

### Load Tests

-   Maximum players per server
-   Bandwidth usage per player
-   CPU usage scaling

### Gameplay Tests

-   Combat feels responsive at various latencies
-   Movement prediction accuracy
-   No desync issues

* * * * *

Common Pitfalls to Avoid
------------------------

1.  **Trusting the Client**: Never trust client-submitted positions or damage calculations
2.  **Flooding the Network**: Batch updates and use delta compression
3.  **Ignoring Time Sync**: Implement proper clock synchronization early
4.  **Poor Entity Lifecycle**: Clear protocols for spawn/despawn to avoid ghost entities
5.  **Blocking Operations**: Keep server update loop fast and non-blocking

* * * * *

Success Metrics
---------------

1.  **Latency Tolerance**: Playable up to 150ms latency
2.  **Bandwidth Usage**: <10KB/s per player during combat
3.  **Server Performance**: 60+ ticks per second with 8 players
4.  **Client Performance**: Maintain 60 FPS with 8 players on screen
5.  **Desync Rate**: <0.1% of actions cause noticeable desync

* * * * *

This plan provides a roadmap for incrementally adding multiplayer while maintaining a working game throughout development. Each stage builds upon the previous one, allowing for testing and validation at every step.