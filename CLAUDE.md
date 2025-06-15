# Hardmode MMO - Development Guide for Claude

## Project Overview
This is a browser-based MMO game similar to Realm of the Mad God, being converted from a single-player game to multiplayer. The game features:
- Top-down 2D gameplay with PIXI.js rendering
- Real-time multiplayer using Socket.io
- Server-authoritative architecture with client-side prediction
- Multiple character classes (Warrior, Archer, Mage, Bladedancer)
- Procedurally generated world using simplex noise

## Current Architecture

### Client (Browser)
- **Core**: `/src/js/core/Game.js` - Main game loop and initialization
- **Entities**: Player and RemotePlayer classes for local and networked players
- **Systems**: Input, Physics, Combat, Monster, World generation
- **Networking**: TypeScript NetworkManager using Socket.io client
- **UI**: Connection, Class Selection, Health/Stats, Multiplayer HUD

### Server (Node.js)
- **Framework**: Express + Socket.io
- **Game Loop**: 60Hz tick rate, 20Hz network update rate
- **Entities**: Server-side Player class with validation
- **Game Instance**: Manages all players and game state
- **World**: Uses same seed for consistent terrain across clients

## Key Files to Know

### Configuration
- `/server/src/config.ts` - Server configuration including world seed
- `/shared/types.ts` - Shared TypeScript types between client/server

### Networking
- `/src/network/NetworkManager.ts` - Client network handler
- `/server/src/network/socketServer.ts` - Server socket setup
- `/server/src/network/messageHandlers.ts` - Server message processing

### Game Logic
- `/src/js/core/Game.js` - Client game initialization and loop
- `/server/src/game/GameInstance.ts` - Server game state management
- `/src/js/systems/world/WorldGenerator.js` - Terrain generation (now seeded)

## Current Implementation Status

### ✅ Completed (Phases 0-1 +部分 Phase 2)
- Project structure and build setup
- Basic Socket.io connection
- Player authentication (username)
- Player spawn and basic movement
- Input handling (client → server)
- Game state broadcasting
- Remote player rendering
- World seed synchronization
- Class selection system
- Multiplayer HUD showing connected players

### 🚧 In Progress (Phase 2)
- Player state synchronization improvements
- Lag compensation
- Client-side prediction

### 📋 Next Steps (Phase 2-3)
1. **Combat System**
   - Server-side projectile spawning
   - Hit detection on server
   - Damage calculation
   - Death/respawn logic

2. **Monster Synchronization**
   - Move monsters to server
   - Sync monster positions to all clients
   - Server-side AI

3. **Performance Optimization**
   - Implement spatial partitioning
   - Interest management (only send nearby entities)
   - Delta compression for position updates

## Known Issues & Solutions

### Fixed Issues
1. **Different terrain between clients** → Added world seed from server
2. **Players not visible to each other** → Fixed player status and spawn sync
3. **UI overlap** → Moved multiplayer HUD to top-right

### Current Issues
1. **No combat synchronization** - Projectiles/damage are client-only
2. **No monster synchronization** - Each client has different monsters
3. **No persistence** - Game state resets on server restart

## Testing Instructions
```bash
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Start client
npm run dev

# Open multiple browser windows to http://localhost:5173
# Each player should:
1. Enter username
2. Select a class
3. See the same terrain
4. See other players moving
```

## Development Commands
```bash
# Run linting
npm run lint

# Run type checking  
npm run typecheck

# Watch for TypeScript errors
cd server && npm run build:watch
```

## Important Implementation Notes

### World Synchronization
- Server sends world seed "hardmode-mmo-seed-12345" to all clients
- WorldGenerator uses string-to-seed conversion for consistent noise
- All clients must use server-provided world dimensions

### Player State Flow
1. CONNECTING → Player connects with username
2. CONNECTED → Player authenticated, awaiting class selection  
3. PLAYING → Player selected class, included in game state broadcasts
4. DEAD → Player died, still visible but inactive
5. DISCONNECTED → Player left game

### Network Update Flow
1. Client sends input at 60Hz to server
2. Server validates and applies input at 60Hz tick rate
3. Server broadcasts game state at 20Hz to all clients
4. Clients interpolate remote player positions

## Phase Checklist Progress
Currently working through **Phase 2: Core Multiplayer** of the MMO Implementation Checklist. Key remaining tasks:
- Combat synchronization (2.3)
- Death and respawn (2.4)
- Lag compensation (2.5)
- Basic anti-cheat (2.6)

See `MMO_Implementation_Checklist.md` for full 400+ task breakdown across 14 phases.