# MULTIPLAYER DIRECTORY STRUCTURE

## Overview
This directory contains the complete multiplayer implementation of Hardmode, built from scratch with multiplayer-first architecture while preserving the exact gameplay of the original single-player version.

## Top-Level Structure

```
multiplayer/
├── client/          # Browser-based game client (PIXI.js + TypeScript)
├── server/          # Node.js game server (authoritative)
├── shared/          # Code shared between client and server
├── docs/            # Implementation documentation
├── scripts/         # Development and deployment automation
├── tests/           # Automated testing suites
├── package.json     # Root package with shared scripts
├── docker-compose.yml # Development environment
└── README.md        # Setup and development guide
```

## Client Structure (`/client/`)
Browser-based game client built with PIXI.js for rendering and TypeScript for type safety.

```
client/
├── src/
│   ├── core/           # Game initialization and main loops
│   ├── network/        # Server communication and prediction
│   ├── rendering/      # PIXI.js graphics and animations
│   ├── input/          # Keyboard and mouse input handling
│   ├── ui/             # User interface components
│   ├── world/          # World rendering and tile management
│   └── ecs/            # Client-side ECS components and systems
├── public/
│   ├── index.html      # Main HTML entry point
│   └── assets/         # Symlink to shared game assets
├── package.json        # Client-specific dependencies
└── vite.config.ts      # Build tool configuration
```

## Server Structure (`/server/`)
Node.js game server with authoritative game logic and anti-cheat validation.

```
server/
├── src/
│   ├── core/           # Main server systems and game loop
│   ├── network/        # Client connection management
│   ├── world/          # World generation and physics
│   ├── ecs/            # Server-side ECS systems
│   ├── validation/     # Input validation and anti-cheat
│   └── monitoring/     # Performance metrics and error tracking
├── package.json        # Server dependencies
└── tsconfig.json       # TypeScript configuration
```

## Shared Structure (`/shared/`)
Code and types shared between client and server for consistency and type safety.

```
shared/
├── types/              # TypeScript interfaces and type definitions
├── constants/          # Game configuration values from original
├── ecs/                # Core Entity Component System implementation
└── utils/              # Utility functions for math, validation, etc.
```

## Key Files and Their Purpose

### Client Core Files
- `client/src/core/Game.ts` - Main game initialization and coordination
- `client/src/network/NetworkManager.ts` - Socket.io connection to server
- `client/src/network/ClientPrediction.ts` - Local input prediction system
- `client/src/rendering/Renderer.ts` - PIXI.js rendering system
- `client/src/input/InputManager.ts` - WASD + mouse input capture

### Server Core Files
- `server/src/core/GameServer.ts` - Main server class and initialization
- `server/src/core/GameLoop.ts` - 60Hz authoritative game tick
- `server/src/ecs/systems/MovementSystem.ts` - Player movement validation
- `server/src/ecs/systems/CombatSystem.ts` - Attack processing and hit detection
- `server/src/network/StateManager.ts` - Broadcast game state to clients

### Shared Core Files
- `shared/types/Entity.ts` - Entity and component interfaces
- `shared/types/Network.ts` - Network message protocol definitions
- `shared/constants/GameConfig.ts` - Exact values from original game
- `shared/ecs/Entity.ts` - Core entity class with serialization

## Development Workflow

1. **Start Development Environment**:
   ```bash
   cd multiplayer
   npm run dev  # Runs both client and server with hot reload
   ```

2. **Build for Production**:
   ```bash
   npm run build  # Builds both client and server
   ```

3. **Run Tests**:
   ```bash
   npm run test   # Runs all test suites
   ```

## Asset Management
- Original game assets are in `/assets/` (parent directory)
- Client references assets via symlink: `client/public/assets/`
- Server may reference assets for validation (sprite dimensions, etc.)

## Documentation Location
- Game design: `../MULTIPLAYER_GAME_DESIGN_DOC.md`
- Technical architecture: `../MULTIPLAYER_TECHNICAL_ARCHITECTURE.md`
- Development roadmap: `../MULTIPLAYER_DEVELOPMENT_ROADMAP.md`
- Exact gameplay values: `../EXACT_GAMEPLAY_SPECIFICATION.md`
- LLM developer guide: `README_FOR_LLM_DEVELOPERS.md`

## Important Notes
- All code will be written by LLMs, not human developers
- Original single-player code in `/src/` is preserved for reference
- Every gameplay mechanic must match the original exactly
- Architecture is designed for 100+ concurrent players
- Server is authoritative to prevent cheating