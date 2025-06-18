# Hardmode - Game Overview

## What is Hardmode?

A real-time multiplayer action RPG with pixel art graphics, inspired by games like Realm of the Mad God. Players battle monsters and each other in a shared world using skill-based combat.

## Core Features

### Combat System
- **Real-time action combat** with precise hitboxes
- **4 unique character classes** each with distinct playstyles
- **PvP and PvE** combat in the same world
- **No cooldowns** - limited only by animation timing

### Character Classes

1. **Bladedancer** - Balanced melee fighter (3 HP, fast)
2. **Guardian** - Heavy tank with area attacks (4 HP, slow)
3. **Hunter** - Fragile ranged archer (1 HP, fast)
4. **Rogue** - Assassin with critical strikes (2 HP, fastest)

### Progression
- Level 1-10 progression system
- Unlock roll/dash ability at level 5
- Keep progression on death (instant respawn)

### World
- 100x100 tile procedurally generated world
- Mix of grass, sand, and water tiles
- Shared persistent world for all players
- Deterministic generation (same seed = same world)

## How to Play

### Controls
- **WASD** - Move in 8 directions
- **Mouse** - Aim (character faces cursor)
- **Left Click** - Primary attack
- **Spacebar** - Secondary attack
- **Shift** - Roll/dash (unlocked at level 5)

### Getting Started
1. Choose your class
2. Spawn at world center
3. Fight monsters to level up
4. Engage in PvP combat
5. Respawn instantly on death

## Technical Details
- Built with PIXI.js for rendering
- Node.js + Socket.io for multiplayer
- 30Hz server tick rate
- Simple authoritative server model

## Current Status
The game is fully playable with working multiplayer. Players can see each other move, fight monsters, and engage in PvP combat. The implementation is simple but effective.