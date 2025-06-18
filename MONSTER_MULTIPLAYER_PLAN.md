# Multiplayer Monster Implementation Plan

## Current State
- Monsters only exist in single-player mode (`MonsterSystem.js`)
- Server has basic monster spawning but it's incomplete
- Remote monsters are partially rendered but not integrated
- No server-side AI or combat validation

## Goal
Server-authoritative monsters that:
- Spawn and move on server
- Sync to all clients
- Can be damaged/killed by any player
- Provide XP to the player who kills them

## Implementation Steps

### 1. Server-Side Monster System (server.js)

#### 1.1 Monster Spawning
```javascript
// Current: Basic spawn logic exists
// Need: Proper spawn distribution and positioning
function spawnMonster() {
  const types = ['ogre', 'skeleton', 'elemental', 'ghoul', 'wildarcher'];
  const weights = [0.2, 0.2, 0.2, 0.2, 0.2]; // From GameConfig
  
  // Find valid spawn position
  const pos = findValidSpawnPosition();
  
  const monster = {
    id: nextMonsterId++,
    type: selectWeightedRandom(types, weights),
    x: pos.x,
    y: pos.y,
    hp: MONSTER_STATS[type].hp,
    maxHp: MONSTER_STATS[type].hp,
    target: null,
    state: 'idle',
    lastAttack: 0
  };
  
  monsters.set(monster.id, monster);
}
```

#### 1.2 Monster AI States
```javascript
// States: idle, chasing, attacking, dead
function updateMonsterAI(monster, deltaTime) {
  switch(monster.state) {
    case 'idle':
      // Look for nearby players
      const nearestPlayer = findNearestPlayer(monster);
      if (nearestPlayer && distance(monster, nearestPlayer) < AGGRO_RANGE) {
        monster.state = 'chasing';
        monster.target = nearestPlayer.id;
      }
      break;
      
    case 'chasing':
      // Move toward target
      const target = players.get(monster.target);
      if (!target || distance(monster, target) > AGGRO_RANGE * 1.5) {
        monster.state = 'idle';
        monster.target = null;
      } else if (distance(monster, target) < ATTACK_RANGE) {
        monster.state = 'attacking';
      } else {
        moveToward(monster, target, MOVE_SPEED * deltaTime);
      }
      break;
      
    case 'attacking':
      // Attack if in range and cooldown ready
      if (Date.now() - monster.lastAttack > ATTACK_COOLDOWN) {
        attackPlayer(monster, monster.target);
        monster.lastAttack = Date.now();
      }
      break;
  }
}
```

### 2. Network Protocol

#### 2.1 Server → Client Messages
```javascript
// Full state update (existing)
{
  type: 'state',
  players: [...],
  monsters: [
    {
      id: 1,
      type: 'ogre',
      x: 1000,
      y: 1000,
      hp: 3,
      maxHp: 4,
      state: 'chasing',
      facing: 'right' // For animation
    }
  ]
}

// Monster death event (new)
{
  type: 'monsterKilled',
  monsterId: 1,
  killedBy: 'player123',
  xpReward: 20
}
```

#### 2.2 Client → Server Messages
```javascript
// Player attacks monster (new)
{
  type: 'attackMonster',
  monsterId: 1,
  damage: 1,
  attackType: 'primary'
}
```

### 3. Client-Side Changes

#### 3.1 Remove MonsterSystem from Game.js
```javascript
// Before:
if (!this.network) {
  this.systems.monsters = new MonsterSystem(this.systems.world);
}

// After:
// Monsters always come from server
```

#### 3.2 Update Monster Rendering
```javascript
// In Game.js
updateMonsters(monsterData) {
  // Update existing monsters
  for (const data of monsterData) {
    let monster = this.remoteMonsters.get(data.id);
    if (!monster) {
      // Create new monster
      monster = new Monster({
        x: data.x,
        y: data.y,
        type: data.type
      });
      this.entityContainer.addChild(monster.sprite);
      this.remoteMonsters.set(data.id, monster);
    }
    
    // Update position and state
    monster.position.x = data.x;
    monster.position.y = data.y;
    monster.hitPoints = data.hp;
    monster.state = data.state;
    monster.facing = data.facing;
    
    // Update animation based on state
    monster.updateAnimation();
  }
  
  // Remove dead monsters
  for (const [id, monster] of this.remoteMonsters) {
    if (!monsterData.find(m => m.id === id)) {
      monster.sprite.parent.removeChild(monster.sprite);
      this.remoteMonsters.delete(id);
    }
  }
}
```

#### 3.3 Handle Monster Combat
```javascript
// In CombatSystem.js applyHitEffects()
// Check remote monsters instead of local monsters
if (window.game.remoteMonsters) {
  for (const [id, monster] of window.game.remoteMonsters) {
    if (monster.alive && hitbox.testHit(monster, monster.collisionRadius)) {
      // Send damage to server
      window.game.network.sendMonsterDamage(id, damage, attackType);
      
      // Show immediate visual feedback
      monster.showDamageEffect();
    }
  }
}
```

### 4. Server Combat Validation

```javascript
// Handle player attacking monster
socket.on('attackMonster', (data) => {
  const player = players.get(socket.id);
  const monster = monsters.get(data.monsterId);
  
  if (!player || !monster || monster.hp <= 0) return;
  
  // Validate attack is possible
  const distance = Math.sqrt(
    Math.pow(player.x - monster.x, 2) + 
    Math.pow(player.y - monster.y, 2)
  );
  
  // Simple range check (improve later with proper hitbox)
  if (distance > 200) return; // Too far
  
  // Apply damage
  monster.hp -= data.damage;
  
  if (monster.hp <= 0) {
    // Monster died
    const xp = MONSTER_STATS[monster.type].xp;
    player.xp = (player.xp || 0) + xp;
    
    // Notify all clients
    io.emit('monsterKilled', {
      monsterId: monster.id,
      killedBy: socket.id,
      xpReward: xp
    });
    
    // Remove monster
    monsters.delete(monster.id);
  }
});
```

### 5. Implementation Order

1. **Basic Server AI** (Day 1)
   - [ ] Port monster stats from GameConfig to server
   - [ ] Implement idle/chase states
   - [ ] Basic pathfinding (straight line)
   - [ ] Send monster updates in state broadcast

2. **Client Rendering** (Day 1-2)
   - [ ] Update Game.js to handle monster data
   - [ ] Create/update/remove monsters based on server state
   - [ ] Proper animation based on state
   - [ ] Remove local MonsterSystem

3. **Combat Integration** (Day 2)
   - [ ] Client sends attack events to server
   - [ ] Server validates and applies damage
   - [ ] Death handling and XP rewards
   - [ ] Visual feedback on client

4. **Polish** (Day 3)
   - [ ] Smooth interpolation for monster movement
   - [ ] Better spawn distribution
   - [ ] Attack animations and effects
   - [ ] Optimize network updates

### 6. Testing Plan

1. **Single Player Experience**
   - Monsters spawn and behave normally
   - Combat feels responsive
   - XP and progression work

2. **Multiplayer Coordination**
   - Multiple players see same monsters
   - Any player can damage any monster
   - Kills credited to correct player
   - No desync issues

3. **Performance**
   - 20-30 monsters active
   - Smooth with 5+ players
   - Reasonable bandwidth usage

### 7. Future Improvements (Post-MVP)

- Predictive monster movement on client
- More complex AI behaviors
- Special attacks for different monster types
- Loot drops
- Elite/boss monsters
- Monster respawn waves

## Success Criteria

- [ ] Monsters exist only on server
- [ ] All players see synchronized monsters
- [ ] Combat feels responsive (<100ms feedback)
- [ ] XP/progression system works
- [ ] No client can cheat monster kills

## Detailed Implementation Guide

### Phase 1: Server Monster Foundation

#### 1.1 Monster Data Structure
```javascript
// server.js - Add at top with other game state
const MONSTER_STATS = {
  ogre: { hp: 4, moveSpeed: 2, damage: 1, attackRange: 90, aggroRange: 800, xp: 20, attackCooldown: 2000 },
  skeleton: { hp: 2, moveSpeed: 2.5, damage: 1, attackRange: 70, aggroRange: 1200, xp: 5, attackCooldown: 1500 },
  elemental: { hp: 3, moveSpeed: 2, damage: 2, attackRange: 100, aggroRange: 800, xp: 10, attackCooldown: 2000 },
  ghoul: { hp: 2, moveSpeed: 3.5, damage: 1, attackRange: 70, aggroRange: 3000, xp: 15, attackCooldown: 1000 },
  wildarcher: { hp: 1, moveSpeed: 3, damage: 1, attackRange: 500, aggroRange: 1500, xp: 10, attackCooldown: 2500 }
};

// Enhanced monster state
const monsters = new Map(); // id -> monster
let nextMonsterId = 1;

// Monster object structure
{
  id: 1,
  type: 'ogre',
  x: 1000,
  y: 1000,
  hp: 4,
  maxHp: 4,
  state: 'idle', // idle, chasing, attacking, dying, dead
  target: null, // player socket id
  lastAttack: 0,
  velocity: { x: 0, y: 0 },
  facing: 'down',
  spawnTime: Date.now(),
  lastUpdate: Date.now()
}
```

#### 1.2 Spawn System Improvements
```javascript
// Better spawn distribution
function findValidSpawnPosition() {
  const margin = 500; // Keep away from world edges
  let attempts = 0;
  
  while (attempts < 50) {
    const x = margin + Math.random() * (WORLD.width * WORLD.tileSize - margin * 2);
    const y = margin + Math.random() * (WORLD.height * WORLD.tileSize - margin * 2);
    
    // Check distance from all players
    let tooClose = false;
    for (const player of players.values()) {
      const dist = Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2));
      if (dist < 700) { // Min spawn distance
        tooClose = true;
        break;
      }
    }
    
    if (!tooClose) {
      return { x, y };
    }
    attempts++;
  }
  
  // Fallback - spawn far from center
  return {
    x: WORLD.width * WORLD.tileSize * (Math.random() > 0.5 ? 0.1 : 0.9),
    y: WORLD.height * WORLD.tileSize * (Math.random() > 0.5 ? 0.1 : 0.9)
  };
}

// Weighted random selection
function selectWeightedRandom(types, weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * total;
  
  for (let i = 0; i < types.length; i++) {
    random -= weights[i];
    if (random <= 0) return types[i];
  }
  return types[types.length - 1];
}
```

### Phase 2: Monster AI Implementation

#### 2.1 Movement and Pathfinding
```javascript
// Simple but effective movement
function moveToward(monster, target, speed) {
  const dx = target.x - monster.x;
  const dy = target.y - monster.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > 0) {
    // Normalize and apply speed
    monster.velocity.x = (dx / distance) * speed;
    monster.velocity.y = (dy / distance) * speed;
    
    // Update position
    monster.x += monster.velocity.x;
    monster.y += monster.velocity.y;
    
    // Update facing direction
    monster.facing = getFacingDirection(dx, dy);
  }
}

function getFacingDirection(dx, dy) {
  const angle = Math.atan2(dy, dx);
  const octant = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
  const directions = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
  return directions[octant];
}
```

#### 2.2 State Machine
```javascript
function updateMonster(monster, deltaTime) {
  const stats = MONSTER_STATS[monster.type];
  
  switch (monster.state) {
    case 'idle':
      handleIdleState(monster, stats);
      break;
      
    case 'chasing':
      handleChasingState(monster, stats, deltaTime);
      break;
      
    case 'attacking':
      handleAttackingState(monster, stats);
      break;
      
    case 'dying':
      // Animation state - no logic needed
      break;
  }
  
  monster.lastUpdate = Date.now();
}

function handleIdleState(monster, stats) {
  // Look for players in aggro range
  let nearestPlayer = null;
  let nearestDistance = stats.aggroRange;
  
  for (const [id, player] of players) {
    if (player.hp <= 0) continue; // Don't target dead players
    
    const dist = getDistance(monster, player);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestPlayer = id;
    }
  }
  
  if (nearestPlayer) {
    monster.state = 'chasing';
    monster.target = nearestPlayer;
  }
}

function handleChasingState(monster, stats, deltaTime) {
  const target = players.get(monster.target);
  
  if (!target || target.hp <= 0) {
    monster.state = 'idle';
    monster.target = null;
    monster.velocity = { x: 0, y: 0 };
    return;
  }
  
  const distance = getDistance(monster, target);
  
  // Lost aggro - too far
  if (distance > stats.aggroRange * 1.5) {
    monster.state = 'idle';
    monster.target = null;
    monster.velocity = { x: 0, y: 0 };
    return;
  }
  
  // In attack range
  if (distance <= stats.attackRange) {
    monster.state = 'attacking';
    monster.velocity = { x: 0, y: 0 };
    return;
  }
  
  // Chase player
  moveToward(monster, target, stats.moveSpeed);
}

function handleAttackingState(monster, stats) {
  const target = players.get(monster.target);
  
  if (!target || target.hp <= 0) {
    monster.state = 'idle';
    monster.target = null;
    return;
  }
  
  const distance = getDistance(monster, target);
  
  // Target moved out of range
  if (distance > stats.attackRange * 1.2) {
    monster.state = 'chasing';
    return;
  }
  
  // Attack if cooldown ready
  const now = Date.now();
  if (now - monster.lastAttack >= stats.attackCooldown) {
    // Apply damage to player
    if (!target.invulnerable) {
      target.hp = Math.max(0, (target.hp || 3) - stats.damage);
      monster.lastAttack = now;
      
      // Notify clients of damage
      io.emit('playerDamaged', {
        playerId: monster.target,
        damage: stats.damage,
        hp: target.hp,
        source: `${monster.type}_${monster.id}`
      });
      
      if (target.hp <= 0) {
        io.emit('playerKilled', {
          playerId: monster.target,
          killedBy: monster.type
        });
      }
    }
  }
}
```

### Phase 3: Network Synchronization

#### 3.1 Optimized State Updates
```javascript
// Only send monster data that changed
function getMonsterStateForClient(monster) {
  return {
    id: monster.id,
    type: monster.type,
    x: Math.round(monster.x),
    y: Math.round(monster.y),
    hp: monster.hp,
    maxHp: monster.maxHp,
    state: monster.state,
    facing: monster.facing,
    target: monster.target // For attack animations
  };
}

// In main game loop
setInterval(() => {
  updateMonsters(1 / TICK_RATE);
  
  // Only include monsters near players (basic Area of Interest)
  const visibleMonsters = new Map();
  const viewDistance = 1500; // Pixels
  
  for (const [playerId, player] of players) {
    for (const [monsterId, monster] of monsters) {
      const dist = getDistance(player, monster);
      if (dist < viewDistance) {
        visibleMonsters.set(monsterId, monster);
      }
    }
  }
  
  const state = {
    players: Array.from(players.values()),
    monsters: Array.from(visibleMonsters.values()).map(getMonsterStateForClient)
  };
  
  io.emit('state', state);
}, 1000 / TICK_RATE);
```

#### 3.2 Client-Server Combat Messages
```javascript
// server.js - Handle player attacking monster
socket.on('attackMonster', (data) => {
  const player = players.get(socket.id);
  if (!player || player.hp <= 0) return;
  
  const monster = monsters.get(data.monsterId);
  if (!monster || monster.hp <= 0) return;
  
  // Validate attack
  const distance = getDistance(player, monster);
  const attackRange = data.attackType === 'primary' ? 150 : 200; // Rough validation
  
  if (distance > attackRange) {
    console.log(`Attack out of range: ${distance} > ${attackRange}`);
    return;
  }
  
  // Check cooldowns (todo: implement server-side cooldowns)
  
  // Apply damage
  const damage = data.damage || 1;
  monster.hp = Math.max(0, monster.hp - damage);
  
  // Broadcast damage effect
  io.emit('monsterDamaged', {
    monsterId: monster.id,
    damage: damage,
    hp: monster.hp,
    attacker: socket.id
  });
  
  // Handle death
  if (monster.hp <= 0) {
    handleMonsterDeath(monster, player);
  }
});

function handleMonsterDeath(monster, killer) {
  const stats = MONSTER_STATS[monster.type];
  
  // Award XP
  killer.xp = (killer.xp || 0) + stats.xp;
  killer.kills = (killer.kills || 0) + 1;
  
  // Check level up
  checkLevelUp(killer);
  
  // Notify all clients
  io.emit('monsterKilled', {
    monsterId: monster.id,
    killedBy: killer.id,
    xpReward: stats.xp,
    killerXp: killer.xp,
    killerLevel: killer.level || 1
  });
  
  // Remove monster after death animation
  monster.state = 'dying';
  setTimeout(() => {
    monsters.delete(monster.id);
  }, 1000); // 1 second death animation
}
```

### Phase 4: Client-Side Integration

#### 4.1 NetworkClient.js Updates
```javascript
// Add to NetworkClient class
sendMonsterDamage(monsterId, damage, attackType) {
  if (this.socket && this.socket.connected) {
    this.socket.emit('attackMonster', {
      monsterId,
      damage,
      attackType,
      timestamp: Date.now()
    });
  }
}

// Add event handlers in constructor
this.socket.on('monsterDamaged', (data) => {
  const monster = this.game.remoteMonsters.get(data.monsterId);
  if (monster) {
    monster.hp = data.hp;
    monster.showDamageEffect();
    
    // Show damage number
    if (data.attacker === this.socket.id) {
      this.game.showDamageNumber(monster.position, data.damage);
    }
  }
});

this.socket.on('monsterKilled', (data) => {
  const monster = this.game.remoteMonsters.get(data.monsterId);
  if (monster) {
    monster.playDeathAnimation();
    
    // Show XP gain if we killed it
    if (data.killedBy === this.socket.id) {
      this.game.showXpGain(monster.position, data.xpReward);
      // Update local player XP display
      this.game.entities.player.experience = data.killerXp;
      this.game.entities.player.level = data.killerLevel;
    }
  }
});

this.socket.on('playerDamaged', (data) => {
  if (data.playerId === this.socket.id) {
    this.game.entities.player.takeDamage(data.damage);
  } else {
    const remotePlayer = this.game.remotePlayers.get(data.playerId);
    if (remotePlayer) {
      remotePlayer.showDamageEffect();
    }
  }
});
```

#### 4.2 Monster Entity Updates
```javascript
// Update Monster.js to handle network state
class Monster {
  constructor(options) {
    this.id = options.id;
    this.type = options.type;
    this.position = { x: options.x, y: options.y };
    this.hp = options.hp;
    this.maxHp = options.maxHp;
    this.state = options.state || 'idle';
    this.facing = options.facing || 'down';
    
    // For interpolation
    this.targetPosition = { x: options.x, y: options.y };
    this.interpolationSpeed = 0.2;
    
    // Create sprite...
  }
  
  updateFromServer(data) {
    this.targetPosition.x = data.x;
    this.targetPosition.y = data.y;
    this.hp = data.hp;
    this.state = data.state;
    this.facing = data.facing;
    
    // Update animation based on state
    this.updateAnimation();
  }
  
  update(deltaTime) {
    // Smooth interpolation
    this.position.x += (this.targetPosition.x - this.position.x) * this.interpolationSpeed;
    this.position.y += (this.targetPosition.y - this.position.y) * this.interpolationSpeed;
    
    this.sprite.position.set(this.position.x, this.position.y);
  }
  
  updateAnimation() {
    let animName;
    switch (this.state) {
      case 'idle':
        animName = `${this.type}_idle_${this.facing}`;
        break;
      case 'chasing':
        animName = `${this.type}_walk_${this.facing}`;
        break;
      case 'attacking':
        animName = `${this.type}_attack1_${this.facing}`;
        break;
      case 'dying':
        animName = `${this.type}_die_${this.facing}`;
        break;
    }
    
    if (animName && this.currentAnimation !== animName) {
      this.changeAnimation(animName);
    }
  }
}
```

### Phase 5: Testing & Debugging

#### 5.1 Debug Commands
```javascript
// Add to server.js for testing
const debugCommands = {
  spawnMonster: (type, x, y) => {
    const monster = createMonster(type, x, y);
    monsters.set(monster.id, monster);
    console.log(`Spawned ${type} at ${x}, ${y}`);
  },
  
  killAllMonsters: () => {
    for (const monster of monsters.values()) {
      monster.hp = 0;
    }
    console.log(`Killed ${monsters.size} monsters`);
  },
  
  setMonsterTarget: (monsterId, playerId) => {
    const monster = monsters.get(monsterId);
    if (monster) {
      monster.target = playerId;
      monster.state = 'chasing';
    }
  }
};

// Expose to console in development
if (process.env.NODE_ENV !== 'production') {
  global.debug = debugCommands;
}
```

#### 5.2 Performance Monitoring
```javascript
// Track performance metrics
const metrics = {
  monsterUpdates: 0,
  monsterUpdateTime: 0,
  networkBandwidth: 0
};

function updateMonsters(deltaTime) {
  const startTime = Date.now();
  
  for (const monster of monsters.values()) {
    updateMonster(monster, deltaTime);
    metrics.monsterUpdates++;
  }
  
  metrics.monsterUpdateTime += Date.now() - startTime;
  
  // Log every 5 seconds
  if (metrics.monsterUpdates % (TICK_RATE * 5) === 0) {
    console.log(`Monster performance: ${metrics.monsterUpdateTime / metrics.monsterUpdates}ms avg`);
  }
}
```

## Common Issues & Solutions

### Issue 1: Monster position desync
**Solution**: Use interpolation on client, authoritative position on server

### Issue 2: Attack spam
**Solution**: Server-side cooldown tracking per player/attack type

### Issue 3: Monsters attacking dead players
**Solution**: Clear target when player dies, check hp > 0

### Issue 4: Too many monsters cause lag
**Solution**: Area of Interest system, cap total monsters

### Issue 5: Monsters stuck on walls
**Solution**: Simple collision detection (future improvement)

## Rollback Plan

If server-side monsters cause issues:
1. Keep client-side monsters as fallback
2. Add feature flag to toggle implementation
3. Can run hybrid mode during testing