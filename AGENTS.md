# AGENTS Guide

This repository contains a small 2D MMORPG built with **PixiJS** on a Node.js backend. Almost all code was produced with large language models, and the maintainer is a hobbyist learning through experimentation.

These notes are intended for any AI agent or contributor working on the project.

## Quick Start
1. Run `npm install` once to fetch dependencies (Node 18+ recommended).
2. Launch the dev server with `npm run dev`.
3. There are no automated tests; `npm test` only prints an error.

## Coding Conventions
- JavaScript lives in `src/js`.
- Use ES module syntax.
- Indent with **4 spaces** and terminate statements with semicolons.
- Prefer single quotes for strings.
- Add comments whenever logic is not obvious.

## Development Principles
- Functionality matters more than perfect architecture.
- Extend the existing systems instead of rewriting them.
- Maintain the component-based entity pattern and configuration-driven approach.
- Keep commits small and clearly explain the reasoning so future agents can follow along.

## Project Overview
The game features a procedurally generated world, four player classes and fast-paced combat. Important files include:
- `Game.js` – main game loop and initialization
- `Player.js` – component-based player entity
- `CombatSystem.js` and `MonsterSystem.js` – handle attacks and monster AI
- `GameConfig.js` – central configuration for player classes, monsters and attacks

The design documents in the repository provide additional details about mechanics and future plans.

## Terminology
The "local player" refers to the player character controlled on the current
game screen. Any other connected players are considered "remote players". When
making multiplayer changes, keep this distinction in mind so that updates are
applied to the correct entity.

## Adding New Content
1. Add new stats or behaviors to `GameConfig.js`.
2. Reuse existing systems and components where possible.
3. Follow the 8-directional naming convention for sprite sheets when introducing new animations.

## Commit Guidelines
Write concise commit messages summarizing the change. Example:

```
Add flaming sword attack to Bladedancer

- Updated GameConfig.js with attack values
- Added animation reference in Player.js
```

## Useful References
- `Game Design Document.txt`
- `Development Roadmap.txt`
- `Technical Architecture Document.txt`

Keep this guide updated whenever conventions evolve. If a workaround or quirk is discovered, document it here for future agents.
