# Hardmode - Multiplayer Action RPG

A real-time multiplayer action RPG with pixel art graphics, featuring skill-based combat and character progression.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser to play. Open multiple browser windows to test multiplayer.

## How to Play

### Controls
- **WASD** - Move in 8 directions
- **Mouse** - Aim (character always faces cursor)
- **Left Click** - Primary attack
- **Spacebar** - Secondary attack  
- **Shift** - Roll/dash (unlocked at level 5)

### Character Classes
1. **Bladedancer** - Balanced melee fighter (3 HP)
2. **Guardian** - Heavy tank with area attacks (4 HP)
3. **Hunter** - Fragile ranged archer (1 HP)
4. **Rogue** - Fast assassin with critical strikes (2 HP)

### Gameplay
- Choose your class at the start
- Fight monsters to gain XP and level up (max level 10)
- Engage in PvP combat with other players
- Respawn instantly at world center when you die
- Unlock roll ability at level 5

## Technical Overview

### Architecture
- **Client**: JavaScript ES6 modules with PIXI.js for rendering
- **Server**: Node.js with Express and Socket.io (simple authoritative server)
- **Networking**: Basic position sync at 30Hz - no prediction or interpolation

### Key Files
- `server.js` - Multiplayer server (200 lines)
- `src/js/core/Game.js` - Main game orchestration
- `src/js/net/NetworkClient.js` - Socket.io client
- `src/js/config/GameConfig.js` - All game constants

### Development
- Uses ES6 modules
- 4-space indentation
- Simple Socket.io events for networking
- No build process - just run the server

## Documentation

- **CLAUDE.md** - Guide for AI assistants working on this code
- **GAME_OVERVIEW.md** - Detailed game mechanics and features
- **EXACT_GAMEPLAY_SPECIFICATION.md** - Precise values for all game mechanics
- **AGENTS.md** - Guidelines for AI agents and contributors

## Current Status

The game is fully playable with working multiplayer. Player movement syncs properly between clients using a simple but effective Socket.io implementation. The architecture is straightforward - the server broadcasts all game state 30 times per second and clients render what they receive.

## Contributing

This project was created with AI assistance as a learning experiment. The focus is on functional gameplay over perfect architecture. When contributing:
- Extend existing systems rather than rewriting
- Keep the simple networking approach
- Test with multiple browser windows
- Make small, clear commits

## License

This is a hobbyist learning project.