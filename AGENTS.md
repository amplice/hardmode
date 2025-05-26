# AGENTS Guide

This repository is an experiment in building a lightweight 2D MMORPG using **PixiJS** and a Node.js back end. Almost all of the code was generated with the help of large language models. The project owner is not a professional developer and tends to experiment through trial and error.

AI agents working on this codebase should keep the following in mind:

## Running the project

1. Install dependencies once with `npm install` (Node 18+ recommended).
2. Launch the development server with `npm run dev`. This uses Vite to serve the `src` directory.
3. There are currently **no automated tests**. The `npm test` script only prints an error.

## Code style

- JavaScript source lives in `src/js`.
- Use ES module syntax for imports/exports.
- Indent with **4 spaces** and end statements with semicolons.
- Prefer single quotes for strings.
- Keep code readable and add comments where logic is unclear.

## Developer Context
**IMPORTANT**: The primary developer is not a professional programmer. This codebase is:
- Almost entirely AI-generated
- Built through "vibe-coding" and trial-and-error
- Focused on getting things working rather than perfect architecture
- May contain unconventional patterns that work but aren't textbook-perfect

## Project Overview
This is a skill-based, permadeath 2D MMORPG built with PixiJS. The game features:
- Fast-paced combat with 1-3 hit kills
- 4 character classes (Bladedancer, Guardian, Hunter, Rogue)
- Procedurally generated world with multiple biomes
- Monster AI and player vs environment combat
- Component-based entity system

### Configuration-Driven Design

Most game mechanics are defined in `src/js/config/GameConfig.js`:

-   Player class stats and abilities
-   Monster configurations
-   Attack patterns and effects
-   Animation timings

When adding new features, extend the config objects rather than hardcoding values.

Project Architecture
--------------------

### Core Systems

-   **Game.js**: Main game loop and initialization
-   **Player.js**: Component-based player entity with Movement, Animation, Combat, Health, and Stats components
-   **CombatSystem.js**: Handles all attack logic, hitboxes, and effects
-   **MonsterSystem.js**: AI and spawning for monsters
-   **SpriteManager.js**: Animation and sprite handling
-   **WorldGenerator.js**: Procedural world generation with biomes and transitions

### Key Design Patterns

1.  **Component-Based Entities**: Player uses components for different behaviors
2.  **Config-Driven**: Game mechanics defined in GameConfig.js
3.  **System Architecture**: Separate systems handle different aspects (combat, physics, etc.)
4.  **Event-Based**: Uses PIXI.js event system for interactions

### File Structure

```
src/
├── js/
│   ├── config/GameConfig.js          # All game configuration
│   ├── core/Game.js                  # Main game class
│   ├── entities/
│   │   ├── Player.js                 # Player with components
│   │   ├── Projectile.js            # Arrows and projectiles
│   │   └── monsters/Monster.js       # Monster AI and behavior
│   ├── systems/                     # Game systems
│   ├── ui/                          # User interface elements
│   └── utils/                       # Utility functions
└── assets/sprites/                  # Game art assets
```

Current Features
----------------

### Combat System

-   **Attack Archetypes**: standard_melee, projectile, jump_attack, dash_attack
-   **Hitbox Types**: rectangle, cone, circle
-   **Effect System**: Visual effects with timing and positioning
-   **Class-Specific Attacks**: Each class has unique primary/secondary attacks

### Character Classes

-   **Bladedancer**: Medium HP, fast movement, slashing attacks
-   **Guardian**: High HP, slow movement, sweeping attacks and jump slam
-   **Hunter**: Low HP, ranged bow attacks and retreat shot
-   **Rogue**: Very low HP, very fast, dash attacks

### World Generation

-   **Biomes**: Grass, sand, water with smooth transitions
-   **Decorations**: Plants, flowers, branches scattered naturally
-   **Monster Spawning**: Configurable spawn rates and distributions

Common Tasks and Patterns
-------------------------

### Adding New Features

1.  Update `GameConfig.js` with new configuration
2.  Extend existing systems rather than creating new ones
3.  Test with existing classes before adding complexity
4.  Use the existing component pattern for entities

### Animation System

-   Sprites are organized in 8-directional sheets (N, NE, E, SE, S, SW, W, NW)
-   Animation names follow pattern: `{prefix}_{action}_{direction}`
-   Effects are single-row sprite sheets with specified frame counts

### Monster AI

-   State machine: idle, walking, attacking, stunned, dying
-   Pathfinding with BFS for obstacle avoidance
-   Line-of-sight checks for direct movement
-   Configurable aggro ranges and attack patterns

Testing and Development
-----------------------

-   Use browser dev tools for debugging
-   Modify `MONSTER_CONFIG.testSpawns` for testing monster interactions
-   Toggle `SHOW_DEBUG_STATS` in Game.js for additional UI info
-   The game includes a class selection screen on startup

Known Quirks and Workarounds
----------------------------

-   Global `window.game` reference used for cross-system communication
-   Monsters use both collision radius and AABB collision boxes
-   Physics system handles both world boundaries and tile collisions
-   Attack effects use absolute timing from attack start

When Adding New Content
-----------------------

1.  **New Character Class**: Add to PLAYER_CONFIG.classes with sprites, stats, and animations
2.  **New Monster**: Add to MONSTER_CONFIG.stats with AI behavior and attack patterns
3.  **New Attack**: Define in PLAYER_CONFIG.attacks with archetype, hitbox, and effects
4.  **New Animation**: Add sprite sheets following the 8-directional naming convention

Important Notes
---------------

-   The codebase prioritizes functionality over perfect architecture
-   If something works, don't over-engineer it unless there's a specific problem
-   The developer learns by seeing complete, working examples
-   Maintain the existing patterns and conventions even if they're not textbook-perfect
-   Focus on extending existing systems rather than rewriting them
- Because the project evolved organically, naming and organization may be inconsistent. Feel free to refactor, but keep commits small and well explained.
- When adding features, check the design documents for guidance, but don’t worry about perfect adherence—they are aspirational.
- Provide helpful commit messages so future AI (and the owner) can follow the changes.

Remember: This is a working game built by someone learning through AI assistance. Keep solutions practical and maintain the existing style and patterns.





