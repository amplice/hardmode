# HARDMODE - MULTIPLAYER ACTION RPG
## Game Design Document (Multiplayer-First)

### EXECUTIVE SUMMARY

Hardmode is a real-time multiplayer action RPG inspired by Realm of the Mad God, featuring skill-based combat, character progression, and a procedurally generated world. Players control one of four distinct character classes, each with unique abilities and playstyles, in a shared persistent world where PvP and PvE combine seamlessly.

### CORE GAMEPLAY LOOP

1. **Character Creation**: Select from 4 unique classes
2. **Spawn in World**: Enter the shared game world with other players
3. **Fight Monsters**: Gain experience and level up (max level 10)
4. **PvP Combat**: Engage other players in skill-based combat
5. **Death & Respawn**: Instant respawn at world center, keep progression
6. **Repeat**: Continuous progression and combat cycle

### CONTROL SCHEME

- **Movement**: WASD keys (8-directional)
- **Facing**: Mouse cursor position (character always faces cursor)
- **Primary Attack**: Left mouse button
- **Secondary Attack**: Spacebar
- **Roll/Dash**: Shift key (unlocked at level 5)
- **Camera**: Automatically follows player

### CHARACTER CLASSES

#### Bladedancer
- **Health**: 3 HP
- **Movement Speed**: 5 units/frame
- **Theme**: Balanced melee fighter
- **Primary Attack**: Forehand slash (rectangular hitbox, 85 length × 45 width)
- **Secondary Attack**: Overhead smash (rectangular hitbox, 110 length × 70 width, 2 damage)
- **Roll**: 150 unit dash with invulnerability frames

#### Guardian
- **Health**: 4 HP
- **Movement Speed**: 3.5 units/frame
- **Theme**: Heavy tank with area attacks
- **Primary Attack**: Sweeping axe (cone hitbox, 110 range, 110° angle)
- **Secondary Attack**: Jump attack (circular hitbox, 75 radius, 2 damage, invulnerable during jump)
- **Roll**: Standard 150 unit dash

#### Hunter
- **Health**: 1 HP
- **Movement Speed**: 5 units/frame
- **Theme**: Ranged archer
- **Primary Attack**: Aimed bow shot (projectile, 700 speed, 600 range, precise mouse targeting)
- **Secondary Attack**: Retreat shot (backward jump + cone attack, 200 jump distance)
- **Roll**: Standard 150 unit dash

#### Rogue
- **Health**: 2 HP
- **Movement Speed**: 6 units/frame
- **Theme**: Fast assassin
- **Primary Attack**: Thrust attack (rectangular hitbox, 95 length × 30 width)
- **Secondary Attack**: Dash attack (200 unit dash with damage hitbox)
- **Roll**: Standard 150 unit dash

### MOVEMENT MECHANICS

#### Speed Modifiers
- **Forward Movement**: 100% speed (within 45° of facing direction)
- **Strafing**: 70% speed (45°-135° from facing direction)
- **Backward Movement**: 50% speed (more than 135° from facing direction)
- **Diagonal Movement**: 85% of calculated speed (not 70.7%)

#### Facing System
- Character always faces mouse cursor position
- 8-directional facing: up, up-right, right, down-right, down, down-left, left, up-left
- Facing affects movement speed multipliers
- Facing determines attack direction

### COMBAT SYSTEM

#### Core Mechanics
- **Real-time Combat**: No turn-based elements
- **Hitbox-based**: All attacks use geometric hitboxes
- **No Auto-targeting**: All attacks are skillshots
- **Directional Attacks**: Attacks always go in facing direction
- **Friendly Fire**: Disabled between players
- **Damage Stun**: 0.25 second stun when taking damage

#### Attack Types
1. **Rectangle Hitboxes**: Blade attacks, thrust attacks
2. **Cone Hitboxes**: Sweeping attacks, area effects
3. **Circle Hitboxes**: Area-of-effect attacks
4. **Projectiles**: Arrows and thrown weapons

#### Timing Values
- **Attack Windup**: 50-500ms depending on attack
- **Attack Recovery**: 100-300ms after attack
- **Attack Cooldowns**: 100ms-2000ms between same attack types
- **Invulnerability Frames**: During specific abilities only

### PROGRESSION SYSTEM

#### Experience & Levels
- **Maximum Level**: 10
- **XP Formula**: Level × 20 XP needed per level
- **XP Sources**: Monster kills only (no PvP XP)
- **Full Health**: Restored on level up

#### Level Rewards
- **Level 2 & 6**: +0.25 movement speed
- **Level 3 & 7**: -25ms attack recovery time
- **Level 4 & 8**: -100ms ability cooldown
- **Level 5**: Unlock roll ability
- **Level 9**: Reserved for future ability
- **Level 10**: +1 maximum hit points

#### Monster XP Values
- **Skeleton**: 5 XP (2 HP, fast, 70 attack range)
- **Elemental**: 10 XP (3 HP, medium, 100 range, circle attack)
- **Ogre**: 20 XP (4 HP, slow, 90 range, wide cone)
- **Ghoul**: 15 XP (2 HP, very fast, 70 range)
- **Wild Archer**: 10 XP (1 HP, medium, 500 range, projectile)

### WORLD DESIGN

#### World Generation
- **Size**: 100×100 tiles (6400×6400 pixels)
- **Tile Size**: 64×64 pixels
- **Generation**: Procedural using simplex noise
- **Seed**: Fixed per server instance for consistency

#### Terrain Types
- **Grass**: Default walkable terrain
- **Sand**: Walkable, appears near transitions
- **Water**: Non-walkable obstacle
- **Decorations**: Visual elements (trees, rocks, etc.)

#### Collision System
- **Tile-based**: 64×64 pixel tiles
- **Water Blocking**: Players cannot walk on water
- **World Boundaries**: Solid walls at map edges
- **Entity Collision**: Players and monsters have collision radius

### MONSTER AI

#### AI States
- **Idle**: Random wandering behavior
- **Pursuing**: Moving toward player target
- **Attacking**: Executing attack sequence
- **Stunned**: Temporary disable after taking damage
- **Dying**: Death animation and fade out

#### AI Behaviors
- **Aggro Range**: Monster-specific detection distance
- **Attack Range**: Distance at which monster stops and attacks
- **Pathfinding**: A* algorithm for obstacle avoidance
- **Line of Sight**: Direct movement when possible
- **Target Loss**: Return to idle if player moves too far

#### Spawn System
- **Spawn Rate**: 1 second between spawn attempts
- **Maximum Monsters**: 300 active monsters
- **Spawn Distance**: 700-10000 pixels from any player
- **Distribution**: Equal probability for all monster types

### MULTIPLAYER FEATURES

#### Player Interactions
- **PvP Combat**: Always enabled
- **Shared World**: All players in same persistent world
- **No Teams**: Every player for themselves
- **No Trading**: No item exchange mechanics
- **Shared Monster Kills**: Only damage dealer gets XP

#### Server Architecture
- **Server-Authoritative**: All game logic on server
- **Client Prediction**: Smooth local movement
- **60Hz Server Tick**: Game logic updates
- **20Hz Network Updates**: State synchronization
- **Lag Compensation**: For fair combat

### USER INTERFACE

#### HUD Elements
- **Health Display**: Current/max hit points (top-left)
- **Stats Panel**: Level, XP, kill count (top-right)
- **No Minimap**: Exploration-based navigation
- **Minimal UI**: Focus on gameplay

#### Class Selection
- **Pre-game Screen**: Choose class before spawning
- **Class Information**: HP, speed, and ability descriptions
- **Visual Preview**: Color-coded class indicators

### TECHNICAL SPECIFICATIONS

#### Performance Targets
- **60 FPS**: Client rendering
- **100+ Players**: Per server instance
- **<100ms Latency**: Acceptable for smooth gameplay
- **60Hz Server Tick**: Consistent game logic

#### Visual Style
- **Pixel Perfect**: No anti-aliasing
- **Sprite-based**: All characters and monsters
- **8-directional Sprites**: For each character state
- **Particle Effects**: Visual combat feedback

### BALANCING PHILOSOPHY

#### Core Principles
1. **Skill Over Stats**: Player skill determines outcome
2. **Rock-Paper-Scissors**: Each class has strengths/weaknesses
3. **Risk vs Reward**: Low HP classes hit harder/move faster
4. **Positioning Matters**: Movement and spacing are crucial
5. **No Grinding**: Quick progression to max level

#### Class Balance
- **Guardian**: Tanky but slow, vulnerable to kiting
- **Hunter**: High damage but fragile, vulnerable to rushdown
- **Rogue**: Very fast but low HP, vulnerable to area attacks
- **Bladedancer**: Balanced, no major weaknesses or strengths

### FUTURE FEATURES (Post-MVP)

#### Content Expansion
- **Equipment System**: Weapons and armor with different stats
- **Additional Classes**: More character options
- **Boss Monsters**: Large challenging encounters
- **Guild System**: Team-based gameplay

#### Gameplay Features
- **Tournaments**: Structured PvP events
- **Seasonal Progression**: Time-limited rewards
- **Custom Matches**: Private server instances
- **Spectator Mode**: Watch other players fight

### SUCCESS METRICS

#### Technical
- Stable gameplay with 100+ concurrent players
- <100ms average latency
- 60 FPS on target hardware
- <1% packet loss tolerance

#### Gameplay
- Average session time >15 minutes
- Player retention >50% after 1 week
- Balanced class distribution (20-30% each)
- Active PvP engagement

This multiplayer-first design maintains the exact gameplay feel of the single-player version while building in proper multiplayer architecture from the ground up.