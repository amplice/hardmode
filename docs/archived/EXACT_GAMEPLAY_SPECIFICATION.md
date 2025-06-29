# HARDMODE - EXACT GAMEPLAY SPECIFICATION

**NOTE**: This document contains the precise values used in GameConfig.js. These values are implemented in the current game and should be preserved.

## CHARACTER CLASSES - EXACT SPECIFICATIONS

### Bladedancer
```javascript
{
  hitPoints: 3,
  moveSpeed: 5,
  spritePrefix: 'knight',
  baseColor: 0x3498db,
  
  attacks: {
    primary: {
      name: "Slash Attack",
      damage: 1,
      windupTime: 133,
      recoveryTime: 200,
      cooldown: 100,
      hitboxType: 'rectangle',
      hitboxParams: { width: 45, length: 85 }
    },
    secondary: {
      name: "Smash Attack", 
      damage: 2,
      windupTime: 500,
      recoveryTime: 300,
      cooldown: 800,
      hitboxType: 'rectangle',
      hitboxParams: { width: 70, length: 110 }
    },
    roll: {
      name: "Roll",
      damage: 0,
      windupTime: 50,
      dashDuration: 300,
      recoveryTime: 150,
      cooldown: 1000,
      dashDistance: 150,
      invulnerable: true,
      requiresLevel: 5
    }
  }
}
```

### Guardian
```javascript
{
  hitPoints: 4,
  moveSpeed: 3.5,
  spritePrefix: 'barbarian',
  baseColor: 0xe74c3c,
  
  attacks: {
    primary: {
      name: "Sweep Attack",
      damage: 1,
      windupTime: 200,
      recoveryTime: 300,
      cooldown: 200,
      hitboxType: 'cone',
      hitboxParams: { range: 110, angle: 110 }
    },
    secondary: {
      name: "Jump Attack",
      damage: 2,
      windupTime: 400,
      recoveryTime: 300,
      cooldown: 1200,
      hitboxType: 'circle',
      hitboxParams: { radius: 75 },
      movement: { jumpHeight: 20, jumpDuration: 400 }
    },
    roll: {
      name: "Charge",
      damage: 0,
      windupTime: 100,
      dashDuration: 350,
      recoveryTime: 200,
      cooldown: 1500,
      dashDistance: 150,
      invulnerable: false,
      requiresLevel: 5
    }
  }
}
```

### Hunter
```javascript
{
  hitPoints: 1,
  moveSpeed: 5,
  spritePrefix: 'ranger',
  baseColor: 0x27ae60,
  
  attacks: {
    primary: {
      name: "Aimed Shot",
      damage: 1,
      windupTime: 300,
      recoveryTime: 200,
      cooldown: 100,
      hitboxType: 'projectile',
      projectileParams: {
        speed: 700,
        size: 8,
        range: 600,
        behavior: 'targetMouse',
        color: 0xffeb3b
      }
    },
    secondary: {
      name: "Retreat Shot",
      damage: 1,
      windupTime: 100,
      recoveryTime: 300,
      cooldown: 800,
      hitboxType: 'cone',
      hitboxParams: { range: 200, angle: 45 },
      movement: { type: 'backflip', distance: 200, duration: 300 }
    },
    roll: {
      name: "Combat Roll",
      damage: 0,
      windupTime: 0,
      dashDuration: 250,
      recoveryTime: 100,
      cooldown: 800,
      dashDistance: 150,
      invulnerable: true,
      requiresLevel: 5
    }
  }
}
```

### Rogue
```javascript
{
  hitPoints: 2,
  moveSpeed: 6,
  spritePrefix: 'rogue',
  baseColor: 0x9b59b6,
  
  attacks: {
    primary: {
      name: "Backstab",
      damage: 1,
      windupTime: 80,
      recoveryTime: 150,
      cooldown: 50,
      hitboxType: 'rectangle',
      hitboxParams: { width: 40, length: 70 }
    },
    secondary: {
      name: "Shadow Strike",
      damage: 2,
      windupTime: 300,
      recoveryTime: 200,
      cooldown: 600,
      hitboxType: 'circle',
      hitboxParams: { radius: 90 },
      movement: { type: 'vanish', reappearDistance: 100 }
    },
    roll: {
      name: "Shadow Dash",
      damage: 0,
      windupTime: 0,
      dashDuration: 200,
      recoveryTime: 100,
      cooldown: 600,
      dashDistance: 180,
      invulnerable: true,
      trailEffect: true,
      requiresLevel: 5
    }
  }
}
```

## MONSTER SPECIFICATIONS

### Ogre
```javascript
{
  hp: 3,
  moveSpeed: 1.5,
  damage: 1,
  attackRange: 60,
  aggroRange: 300,
  xpReward: 30,
  sprite: 'ogre'
}
```

### Skeleton
```javascript
{
  hp: 1,
  moveSpeed: 3,
  damage: 1,
  attackRange: 40,
  aggroRange: 250,
  xpReward: 10,
  sprite: 'skeleton'
}
```

### Elemental
```javascript
{
  hp: 2,
  moveSpeed: 2,
  damage: 2,
  attackRange: 80,
  aggroRange: 350,
  xpReward: 50,
  sprite: 'elemental'
}
```

### Ghoul
```javascript
{
  hp: 2,
  moveSpeed: 4,
  damage: 1,
  attackRange: 35,
  aggroRange: 400,
  xpReward: 25,
  sprite: 'ghoul'
}
```

### Wild Archer
```javascript
{
  hp: 1,
  moveSpeed: 2.5,
  damage: 1,
  attackRange: 200,
  aggroRange: 350,
  xpReward: 40,
  sprite: 'wild_archer',
  projectileSpeed: 300
}
```

## COMBAT MECHANICS

### Damage System
- All damage values are in whole numbers
- Players take damage and turn red briefly (100ms)
- 500ms invulnerability after taking damage
- Death occurs at 0 HP

### Attack Timing
1. **Windup Phase**: Player presses attack, animation starts
2. **Hit Frame**: Damage is dealt at specific animation frame
3. **Recovery Phase**: Player movement is slowed
4. **Cooldown**: Time before next attack can start

### Movement During Combat
- Primary attacks: 70% movement speed
- Secondary attacks: 30% movement speed
- Roll abilities: 200% movement speed

## PROGRESSION SYSTEM

### Experience Requirements
- Level 1→2: 100 XP
- Level 2→3: 200 XP
- Level 3→4: 400 XP
- Level 4→5: 600 XP
- Level 5→6: 1000 XP
- Level 6→7: 1500 XP
- Level 7→8: 2000 XP
- Level 8→9: 3000 XP
- Level 9→10: 5000 XP

### Level Bonuses
- Level 5: Unlock roll/dash ability
- Every level: +10% attack recovery speed (multiplicative)

## WORLD SPECIFICATIONS

### Tile System
- Tile size: 64x64 pixels
- World size: 100x100 tiles (6400x6400 pixels)
- Tile types:
  - Grass (walkable)
  - Sand (walkable) 
  - Water (blocking)

### Spawn Rules
- Players spawn at world center (3200, 3200)
- Monsters spawn randomly on walkable tiles
- Minimum spawn distance from players: 500 pixels

## PHYSICS

### Movement
- 8-directional movement (WASD)
- Diagonal movement normalized (0.707x speed)
- Collision detection with world boundaries
- Collision detection with water tiles

### Hitboxes
- Rectangle: Centered on attack direction
- Cone: Arc from player position
- Circle: Centered on player or target position
- Projectile: Travels from player to target/direction

## NETWORKING SPECIFICATIONS

### Update Rates
- Server tick: 30Hz (current simple implementation)
- Client sends: Every frame (60Hz typical)
- State broadcast: 30Hz to all players

### Data Sent
- Player position (x, y)
- Player facing direction
- Player HP
- Attack events
- Monster positions and HP