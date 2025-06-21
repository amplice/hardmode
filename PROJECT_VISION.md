# Project Vision: Hardmode MMORPG

## Core Concept
A small-scale MMORPG (max ~100 concurrent players) combining:
- **Permadeath/roguelike mechanics** (inspired by Realm of the Mad God)
- **Top-down ARPG combat** (mechanically similar to Diablo 2/Grim Dawn)
- **Extreme simplicity**: Only 2 attacks per class, no items/crafting/inventory
- **Pure skill-based PvP**: Level 1 can defeat Level 10 through superior play

## Key Design Principles

### 1. Combat System
- Real-time action combat with precise hitboxes
- Each class has exactly 2 abilities (primary/secondary)
- No gear progression - only level-based stat increases
- Attack patterns must be readable and dodgeable
- Positioning and timing > stats

### 2. Progression Philosophy
- Levels provide minor advantages (HP, slight damage/speed boosts)
- Skill ceiling must remain high at all levels
- Death is meaningful - full character reset
- Fast respawn and re-entry to action

### 3. Technical Targets
- Support 50-100 concurrent players per server
- Smooth combat with <100ms latency tolerance
- Simple authoritative server (trust client, validate critical actions)
- Browser-based for accessibility

## Current Implementation Status

### ✅ Fully Implemented
- **4 Playable Classes** with unique primary/secondary attacks:
  - Bladedancer: Melee slash + overhead smash
  - Guardian: Sweeping axe + jump attack
  - Hunter: Bow shot + retreat shot
  - Rogue: Thrust + dash attack
- **5 Monster Types** with AI: Ogre, Skeleton, Elemental, Ghoul, Wild Archer
- **Real-time Multiplayer** (30Hz authoritative server)
- **Combat System** with hitboxes, projectiles, and visual effects
- **Level Progression** (1-10 with XP from kills)
- **PvP Combat** (players can damage each other)
- **Death/Respawn** (3 second timer with spawn protection)

### ⚠️ Partially Implemented
- **Permadeath**: Has respawn system instead of full character reset
- **Level Benefits**: Only HP increases, no other progression bonuses
- **Combat Balance**: Not tuned for "skill > level" principle yet

### ❌ Not Implemented
- **Roll/Dodge Mechanics** (core defensive ability missing)
- **Server-side Combat Validation** (trusts client attacks)
- **Advanced Monster Behaviors** (bosses, complex patterns)
- **Persistent Stats/Leaderboards**
- **World Obstacles/Terrain**

## Design Comparisons
- **Like Realm of the Mad God**: Permadeath, bullet-hell elements, quick sessions
- **Like Diablo 2**: Satisfying combat feel, class identity, PvE progression
- **Unlike both**: No loot, minimal systems, pure skill focus

## Success Metrics
1. A level 1 player can kill a level 10 through skill
2. Combat feels responsive and fair
3. Death feels consequential but not frustrating
4. Players can jump in and have fun within 30 seconds