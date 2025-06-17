# HARDMODE MULTIPLAYER - LLM DEVELOPER GUIDE

## CRITICAL CONTEXT FOR FUTURE LLM DEVELOPERS

**IMPORTANT**: The human user is **NOT a developer**. All code in this project will be written by LLMs (Claude, GPT, etc.). Therefore:

1. **Write code for LLM comprehension**, not human developers
2. **Be extremely explicit** in comments and documentation
3. **Use clear, descriptive variable/function names** that explain intent
4. **Include comprehensive type definitions** for better understanding
5. **Document architectural decisions** in code comments
6. **Create self-documenting code structures**

## PROJECT OVERVIEW

This is a complete rebuild of the single-player Hardmode game as a multiplayer-first implementation. The original single-player code exists in `/src/` and should be preserved as reference material.

### Key Requirements
- **Exact gameplay preservation**: Every mechanic must match the original precisely
- **Multiplayer-first architecture**: Built for 100+ concurrent players
- **Server-authoritative**: All game logic runs on server to prevent cheating
- **Real-time combat**: 60Hz server tick with lag compensation

## DIRECTORY STRUCTURE

```
hardmode/
├── src/                          # ORIGINAL SINGLE-PLAYER CODE (PRESERVE)
│   └── js/                       # Reference implementation
├── assets/                       # SHARED GAME ASSETS
│   ├── sprites/                  # Character and monster sprites
│   ├── sounds/                   # Audio files
│   └── textures/                 # World and effect textures
├── multiplayer/                  # NEW MULTIPLAYER IMPLEMENTATION
│   ├── client/                   # Browser-based game client
│   │   ├── src/
│   │   │   ├── core/             # Main game loop and state management
│   │   │   │   ├── Game.ts       # Entry point, initialize everything
│   │   │   │   ├── GameState.ts  # Client-side game state
│   │   │   │   └── UpdateLoop.ts # 60 FPS render loop
│   │   │   ├── network/          # Server communication
│   │   │   │   ├── NetworkManager.ts    # Socket.io connection
│   │   │   │   ├── ClientPrediction.ts  # Local input prediction
│   │   │   │   └── StateReconciliation.ts # Sync with server
│   │   │   ├── rendering/        # PIXI.js graphics
│   │   │   │   ├── Renderer.ts         # Main rendering system
│   │   │   │   ├── Camera.ts           # Follow player camera
│   │   │   │   ├── SpriteManager.ts    # Sprite loading/animation
│   │   │   │   └── EffectManager.ts    # Particle effects
│   │   │   ├── input/            # User input handling
│   │   │   │   ├── InputManager.ts     # WASD + mouse capture
│   │   │   │   └── InputBuffer.ts      # Store for prediction
│   │   │   ├── ui/               # User interface
│   │   │   │   ├── ClassSelection.ts   # Character class picker
│   │   │   │   ├── HUD.ts             # Health/stats display
│   │   │   │   └── UIManager.ts       # UI state coordination
│   │   │   ├── world/            # World rendering
│   │   │   │   ├── WorldRenderer.ts    # Tile rendering
│   │   │   │   └── TileManager.ts      # Tile sprite management
│   │   │   └── ecs/              # Entity Component System (client)
│   │   │       ├── components/   # Client-specific components
│   │   │       └── systems/      # Client-specific systems
│   │   ├── public/               # Static web assets
│   │   │   ├── index.html        # Main HTML file
│   │   │   └── assets/           # Symlink to ../../assets/
│   │   ├── package.json          # Client dependencies
│   │   └── vite.config.ts        # Build configuration
│   │
│   ├── server/                   # Node.js game server
│   │   ├── src/
│   │   │   ├── core/             # Main server systems
│   │   │   │   ├── GameServer.ts     # Main server class
│   │   │   │   ├── GameWorld.ts      # World state management
│   │   │   │   └── GameLoop.ts       # 60Hz authoritative tick
│   │   │   ├── network/          # Client connections
│   │   │   │   ├── Connection.ts     # Individual player socket
│   │   │   │   ├── MessageHandler.ts # Process client messages
│   │   │   │   └── StateManager.ts   # Broadcast state updates
│   │   │   ├── world/            # World generation and physics
│   │   │   │   ├── WorldGenerator.ts # Deterministic world creation
│   │   │   │   ├── ChunkManager.ts   # Spatial optimization
│   │   │   │   └── CollisionMap.ts   # Tile collision system
│   │   │   ├── ecs/              # Entity Component System (server)
│   │   │   │   ├── components/   # Shared component definitions
│   │   │   │   └── systems/      # Server game logic systems
│   │   │   │       ├── MovementSystem.ts  # Player movement validation
│   │   │   │       ├── CombatSystem.ts    # Attack processing
│   │   │   │       ├── AISystem.ts        # Monster behavior
│   │   │   │       ├── PhysicsSystem.ts   # Collision detection
│   │   │   │       └── NetworkSystem.ts   # State broadcasting
│   │   │   ├── validation/       # Input validation and anti-cheat
│   │   │   │   ├── InputValidator.ts    # Check client inputs
│   │   │   │   ├── MovementValidator.ts # Prevent speed hacking
│   │   │   │   └── AttackValidator.ts   # Verify attack timing
│   │   │   └── monitoring/       # Performance and error tracking
│   │   │       ├── ServerMetrics.ts     # Performance monitoring
│   │   │       └── ErrorHandler.ts      # Error logging
│   │   ├── package.json          # Server dependencies
│   │   └── tsconfig.json         # TypeScript configuration
│   │
│   ├── shared/                   # Code shared between client and server
│   │   ├── types/                # TypeScript interfaces
│   │   │   ├── Entity.ts         # Entity and component definitions
│   │   │   ├── Network.ts        # Message protocol definitions
│   │   │   ├── Game.ts          # Game state interfaces
│   │   │   └── Player.ts        # Player-specific types
│   │   ├── constants/            # Game configuration values
│   │   │   ├── GameConfig.ts    # Exact values from original game
│   │   │   ├── NetworkConfig.ts # Network timing settings
│   │   │   └── PhysicsConfig.ts # Movement and collision values
│   │   ├── ecs/                  # Core ECS implementation
│   │   │   ├── Component.ts     # Base component interface
│   │   │   ├── Entity.ts        # Entity class with serialization
│   │   │   └── System.ts        # Base system interface
│   │   └── utils/                # Utility functions
│   │       ├── DirectionUtils.ts # 8-direction conversion
│   │       ├── MathUtils.ts     # Vector math and interpolation
│   │       └── Validation.ts    # Input validation helpers
│   │
│   ├── docs/                     # Implementation documentation
│   │   ├── ARCHITECTURE.md      # Technical decisions
│   │   ├── NETWORKING.md        # Protocol documentation
│   │   └── DEPLOYMENT.md        # Server setup guide
│   │
│   ├── scripts/                  # Development and deployment scripts
│   │   ├── dev.js               # Start development environment
│   │   ├── build.js             # Production build
│   │   └── deploy.js            # Deployment automation
│   │
│   ├── tests/                    # Automated testing
│   │   ├── unit/                # Unit tests
│   │   ├── integration/         # Integration tests
│   │   └── load/                # Load testing
│   │
│   ├── package.json              # Root package with scripts
│   ├── docker-compose.yml        # Development environment
│   └── README.md                 # Setup instructions
│
├── MULTIPLAYER_GAME_DESIGN_DOC.md      # Game design specification
├── MULTIPLAYER_TECHNICAL_ARCHITECTURE.md # Technical implementation
├── MULTIPLAYER_DEVELOPMENT_ROADMAP.md   # Development timeline
├── EXACT_GAMEPLAY_SPECIFICATION.md      # Precise gameplay values
└── README_FOR_LLM_DEVELOPERS.md         # This file
```

## DEVELOPMENT PRINCIPLES FOR LLMs

### 1. Code Organization
- **One concern per file**: Each file should have a single, clear responsibility
- **Hierarchical imports**: Lower-level modules should not import higher-level ones
- **Explicit dependencies**: Always import exactly what you need
- **Self-contained modules**: Each module should be understandable in isolation

### 2. TypeScript Usage
- **Strict mode enabled**: Use strictest TypeScript settings
- **Interface everything**: Define interfaces for all data structures
- **No `any` types**: Always specify exact types
- **Comprehensive generics**: Use generics for reusable components

### 3. Documentation Standards
```typescript
/**
 * LLM_NOTE: This class handles player movement validation on the server.
 * 
 * ARCHITECTURE_DECISION: We validate movement server-side to prevent speed hacking.
 * The client sends input, server calculates movement, then broadcasts position.
 * 
 * EXACT_BEHAVIOR: Movement speed modifiers from original game:
 * - Forward: 100% of base speed
 * - Strafe: 70% of base speed  
 * - Backward: 50% of base speed
 * - Diagonal: 85% of calculated speed (NOT 0.7071)
 */
export class MovementValidator {
    // Implementation...
}
```

### 4. Error Handling
- **Explicit error types**: Define custom error classes
- **Graceful degradation**: System should continue working if non-critical parts fail
- **Comprehensive logging**: Log all errors with context for debugging

### 5. Performance Considerations
- **Spatial partitioning**: Use for entity queries (200px cells recommended)
- **Object pooling**: For frequently created/destroyed objects
- **Binary encoding**: For high-frequency network messages
- **Update prioritization**: Send most important updates first

## CRITICAL IMPLEMENTATION NOTES

### 1. Exact Gameplay Preservation
Every mechanic must match the original game precisely. Reference files:
- `/src/js/config/GameConfig.js` - All timing and damage values
- `/src/js/entities/Player.js` - Movement calculation
- `/src/js/systems/CombatSystem.js` - Attack mechanics
- `EXACT_GAMEPLAY_SPECIFICATION.md` - Precise value documentation

### 2. Network Architecture
- **60Hz server tick**: Game logic updates 60 times per second
- **20Hz network updates**: State broadcast 20 times per second
- **Client prediction**: Apply inputs immediately on client
- **Server reconciliation**: Correct client state when prediction is wrong

### 3. Security Considerations
- **Server-authoritative**: All game logic runs on server
- **Input validation**: Validate all client inputs for legitimacy
- **Rate limiting**: Prevent spam attacks on network endpoints
- **State verification**: Regularly verify client state matches server

### 4. Technology Stack
- **Frontend**: TypeScript + PIXI.js + Vite
- **Backend**: Node.js + TypeScript + Socket.io
- **Shared**: TypeScript interfaces for type safety
- **Development**: Concurrently for running client/server together

## GETTING STARTED (FOR LLMs)

When continuing this project:

1. **Read the design documents first** to understand the complete vision
2. **Study the original single-player code** to understand exact mechanics
3. **Start with shared types and constants** to establish foundation
4. **Build ECS system next** as everything depends on it
5. **Implement networking layer** for client-server communication
6. **Create basic game loop** on both client and server
7. **Add movement system** with prediction and validation
8. **Implement combat system** with lag compensation
9. **Add monster AI** and world generation
10. **Polish and optimize** for 100+ player capacity

## REFERENCE MATERIALS

- **Original Code**: `/src/js/` - Study this for exact gameplay mechanics
- **Game Design**: `MULTIPLAYER_GAME_DESIGN_DOC.md` - Complete game specification
- **Architecture**: `MULTIPLAYER_TECHNICAL_ARCHITECTURE.md` - Technical implementation
- **Roadmap**: `MULTIPLAYER_DEVELOPMENT_ROADMAP.md` - Development timeline
- **Values**: `EXACT_GAMEPLAY_SPECIFICATION.md` - Precise gameplay values

Remember: The goal is to recreate the exact gameplay experience of the single-player version in a multiplayer environment. Every number, timing, and mechanic must match precisely.