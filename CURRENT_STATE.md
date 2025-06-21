# Current Game State Documentation

*Last updated: After revert to commit 36cf02d*

## What's Actually Working Right Now

### ✅ Core Multiplayer
- **Socket.io networking** at 30Hz tick rate
- **Real-time player synchronization** (position, facing, attacks)
- **Multiple players** can join and see each other
- **Server authoritative** game state with client trust model

### ✅ Player System
- **4 playable classes** with distinct sprites and abilities:
  - **Bladedancer**: Slash attack + overhead smash
  - **Guardian**: Sweeping axe (cone hitbox) + jump attack
  - **Hunter**: Bow projectiles + retreat shot
  - **Rogue**: Thrust attack + dash attack
- **8-directional movement** with smooth animations
- **Class selection UI** on game start
- **Health system** with visual hearts
- **Death and respawn** (3 second timer + 3 second spawn protection)

### ✅ Combat System
- **Immediate attack feedback** on client
- **Server validation** of hits and damage
- **Multiple hitbox types**: Rectangle, cone, circle
- **Visual attack effects** and damage numbers
- **Projectile system** for ranged attacks (Hunter, Wild Archer)
- **PvP combat** - players can damage each other

### ✅ Monster System
- **5 monster types** with unique behaviors:
  - **Ogre**: High HP tank with melee attacks
  - **Skeleton**: Fast melee with moderate HP
  - **Elemental**: High damage magical attacker
  - **Ghoul**: Fast, low HP chaser
  - **Wild Archer**: Ranged attacker with projectiles
- **AI state machine**: idle → chase → attack → dying
- **Automatic spawning** (every 5 seconds, max 20 monsters)
- **Monster-player collision** and damage

### ✅ Progression System
- **XP system** - gain XP from killing monsters
- **Level progression** 1-10
- **Level up effects** (currently just HP restoration)
- **XP display** in GUI
- **Kill counting**

### ✅ World System
- **100x100 tile procedural world** with deterministic seed
- **Collision detection** between all entities
- **View distance culling** for network optimization

## What's Missing/Broken

### ❌ Level Progression Bonuses
- Level ups only restore HP, no stat bonuses
- No move speed, attack, or cooldown improvements
- No roll ability unlock at level 5
- Level 10 max HP bonus not implemented

### ❌ Advanced Combat Features
- No monster stun when hit (they continue attacking)
- Monster attack timing too fast (needs more telegraph)
- No client-side attack prediction
- No roll/dodge mechanics

### ❌ Polish Features
- No visual level-up feedback (green tint)
- No proper permadeath (resets to level 1 on death)
- No sound effects
- Limited visual feedback systems

### ❌ World Features
- No obstacles or terrain
- No boss monsters
- No special areas or zones

## Known Issues
- **Jerky movement** can occur with excessive server logging
- **Monster AI** sometimes gets stuck in attack loops
- **Projectile cleanup** may cause memory leaks over time
- **Network lag** affects combat timing

## Architecture Notes
- Uses **component pattern** (not full ECS) for player entities
- **Trust-client model** for most actions (validates critical hits)
- **Event-driven networking** with simple message passing
- **No persistence** - all progress lost on server restart

## Priority Fixes for Next Session
1. **Monster hit stun** - 0.5s freeze when damaged
2. **Level progression bonuses** - meaningful leveling rewards
3. **Attack timing improvements** - better monster telegraphs
4. **Roll/dodge implementation** - core defensive mechanic