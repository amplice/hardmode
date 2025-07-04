# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision

**End Goal**: Small-scale permadeath MMORPG (max ~100 concurrent players) with highly skill-based combat. Key principles:
- **Permadeath/roguelike** mechanics (like Realm of the Mad God)
- **ARPG combat feel** (like Diablo 2) but only 2 attacks per class
- **Pure skill focus**: No items/crafting/inventory - just combat
- **Level 1 can beat Level 10** through superior positioning and timing
- See PROJECT_VISION.md for detailed vision

## Repository Overview

This is a 2D pixel-art MMORPG called "Hardmode" built with PIXI.js. The game features real-time multiplayer gameplay with a simple but functional client-server architecture.

## Current Implementation

### Architecture
- **Client**: JavaScript ES6 modules using PIXI.js for rendering
- **Server**: Node.js with Express and Socket.io for real-time communication
- **Network Protocol**: Simple event-based messages (not the complex ECS described in docs)

### Key Files
- `server.js` - Multiplayer server running at 30Hz with authoritative game state
- `src/js/core/Game.js` - Main game class that orchestrates everything
- `src/js/net/NetworkClient.js` - Handles Socket.io communication
- `src/js/config/GameConfig.js` - Central configuration for all game mechanics
- `src/js/entities/Player.js` - Player entity with component-based architecture

## Development Commands

```bash
npm install         # Install dependencies
npm run dev         # Start the multiplayer server on port 3000
```

Then open `http://localhost:3000` in your browser to play.

## How Multiplayer Works

### Server Side (`server.js`)
1. Maintains authoritative state for all players and monsters
2. Runs game loop at 30Hz
3. Handles:
   - Player connections/disconnections
   - Player position updates
   - Attack processing (damages monsters and other players)
   - Monster AI (simple chase behavior)
   - Automatic respawning (3 seconds after death)
   - Monster spawning (every 5 seconds, max 20)

### Client Side
1. Connects via Socket.io
2. Sends player updates on every frame
3. Receives and applies state updates from server
4. Handles local input and rendering
5. Shows class selection UI on startup

### Network Messages
- `init` - Server sends world data and current state
- `playerUpdate` - Client sends position/facing
- `attack` - Client requests attack
- `state` - Server broadcasts all entity states (30Hz)
- `playerAttack` - Server notifies clients of attacks

## Game Features
- **4 Character Classes**: Bladedancer, Guardian, Hunter, Rogue
- **5 Monster Types**: Ogre, Skeleton, Elemental, Ghoul, Wild Archer
- **Real-time Combat**: Various attack types with precise timing
- **100x100 Tile World**: Procedurally generated with deterministic seed
- **PvP Support**: Players can damage each other

## Important Notes
1. The actual implementation is much simpler than the extensive documentation suggests
2. Player movement syncs well in the current implementation
3. The server is authoritative but trusts client position updates
4. No TypeScript, no complex ECS, no client prediction - just working multiplayer

## Common Tasks

### Add New Monster Type
1. Add config to `GameConfig.js` under `MONSTERS`
2. Server will automatically spawn them

### Modify Combat
1. Adjust damage/range in `server.js` `handlePlayerAttack()`
2. Update attack configs in `GameConfig.js`

### Change World Size
1. Modify `WORLD` constant in `server.js`
2. World uses deterministic seed (42) for consistency

## Key Architecture Insights

### Network Protocol (Simple but Effective)
- **Event-based messages** via Socket.io (NOT complex ECS as docs might suggest)
- **30Hz server tick rate** with authoritative state
- **Trust-client model**: Server validates critical actions but trusts movement
- Key events: `init`, `playerUpdate`, `attack`, `state`, `monsterDamaged`, `playerLevelUp`

### Combat System Architecture
- **Client-side execution**: Attacks processed immediately on client
- **Server validation**: Server confirms hits and applies damage
- **Hitbox types**: Rectangle, cone, circle for different attack patterns
- **Visual effects**: Immediate feedback via CombatSystem.js

### Critical Files for Understanding
- `src/js/entities/Player.js` - Component-based player architecture
- `server/managers/MonsterManager.js` - AI state machine and combat
- `shared/constants/GameConstants.js` - Central configuration
- `src/js/systems/CombatSystem.js` - Attack execution and hitboxes
- `src/js/net/NetworkClient.js` - All network event handling

### Current Limitations to Remember
1. **No proper ECS**: Uses component pattern but not full ECS
2. **No client prediction**: Attacks trust client timing
3. **Simple AI**: Monsters use basic state machine (idle→chase→attack)
4. **No persistence**: All progress lost on server restart
5. **Limited validation**: Server trusts most client actions

### Performance Considerations
- **Excessive logging causes jerky movement** - be careful with debug spam
- **Monster updates at 30Hz** - don't add heavy computations in update loops
- **Projectile cleanup needed** - memory leaks possible without periodic cleanup

## Development Best Practices
- Always commit changes so I can easily revert to past versions without losing too much work when its neccesary
- When committing changes you don't need to ask, since I can always revert.
- Avoid excessive debug logging in production code (causes performance issues)
- Test multiplayer changes with multiple browser windows

## Secrets and Tokens
- **Railway Token**: `2100e401-081d-404b-8731-10544307a4da`