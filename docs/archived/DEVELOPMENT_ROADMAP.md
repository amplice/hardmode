# Hardmode MMORPG Development Roadmap

## Overview
This roadmap outlines the path from our current basic multiplayer game to a small-scale MMORPG supporting ~100 concurrent players with skill-based permadeath combat.

## Current State ✅
- Basic multiplayer with position sync (30Hz)
- 4 classes with 2 attacks each
- Client-side hit detection
- Level 1-10 progression
- Trust-based networking
- ~10 concurrent players stable

## Target Vision 🎯
- 100 concurrent players per server
- Skill-based combat (level 1 can beat level 10)
- Meaningful permadeath with persistence
- Multiple server instances
- Leaderboards and statistics

---

## Phase 1: Combat Authority (Weeks 1-2) 🛡️
**Critical for preventing cheating**

### Goals
- Move hit detection to server
- Maintain responsive feel
- Validate all combat actions

### Tasks
1. **Server-side hit detection**
   - Calculate hitboxes on server
   - Apply damage server-side
   - Client shows predictions

2. **Projectile authority**
   - Server spawns all projectiles
   - Server handles collisions
   - Client renders immediately

3. **Cooldown validation**
   - Track ability cooldowns server-side
   - Reject invalid attacks
   - Sync cooldown state

### Implementation
```javascript
// Server validates attacks
function validateAttack(player, attackType) {
  if (player.cooldowns[attackType] > Date.now()) return false;
  const hitbox = calculateHitbox(player, attackType);
  applyDamage(getHitsInArea(hitbox));
  player.cooldowns[attackType] = Date.now() + getCooldown(attackType);
}
```

---

## Phase 2: Network Optimization (Weeks 3-4) 🚀
**Required for 50+ players**

### Goals
- Reduce bandwidth 70-80%
- Support 50+ concurrent players
- Maintain smooth gameplay

### Tasks
1. **Area of Interest (AoI)**
   - Only send nearby entities
   - Dynamic view distance
   - Efficient spatial queries

2. **Delta compression**
   - Send only changed fields
   - Use binary formats
   - Batch updates

3. **Client interpolation**
   - Smooth remote player movement
   - Hide network jitter
   - Predictive animations

### Implementation
```javascript
// Simple AoI
function getEntitiesNearPlayer(player, range = 1000) {
  return {
    players: players.filter(p => distance(p, player) < range),
    monsters: monsters.filter(m => distance(m, player) < range)
  };
}
```

---

## Phase 3: Permadeath & Persistence (Weeks 5-6) 💀
**Core roguelike features**

### Goals
- Track all player statistics
- Persistent leaderboards
- Meaningful death consequences

### Tasks
1. **Death tracking**
   - Record kills, deaths, survival time
   - Death recap screen
   - Statistics API

2. **Leaderboards**
   - Daily/Weekly/All-time
   - Multiple categories (kills, XP, survival)
   - Real-time updates

3. **Character graves**
   - Show where players died
   - Display death stats
   - Memorial system

### Data Structure
```javascript
{
  player: "PlayerName",
  class: "guardian",
  level: 7,
  kills: 23,
  survived: 1847, // seconds
  killedBy: "ogre",
  timestamp: Date.now()
}
```

---

## Phase 4: Multi-Server Architecture (Weeks 7-8) 🌐
**Scale beyond single instance**

### Goals
- Support 100+ total players
- Automatic load balancing
- Cross-server features

### Tasks
1. **Server browser**
   - List available servers
   - Show player counts
   - Region selection

2. **Instance management**
   - Auto-spawn new servers
   - Load balancing
   - Health monitoring

3. **Shared systems**
   - Global leaderboards
   - Cross-server chat
   - Death announcements

### Architecture
```
Client → Load Balancer → Game Servers → Redis → Database
                                     ↓
                               Leaderboard Service
```

---

## Phase 5: Combat Polish (Weeks 9-10) ✨
**Make combat exceptional**

### Goals
- Incredibly responsive feel
- Clear visual feedback
- Advanced skill mechanics

### Tasks
1. **Feedback systems**
   - Damage numbers
   - Screen shake
   - Hit particles
   - Better sounds

2. **Combat telegraphs**
   - Attack indicators
   - Danger zones
   - Timing windows

3. **Advanced mechanics**
   - Combo system
   - Perfect dodges
   - Counter-attacks

---

## MVP Definition (4 weeks)

### Must Have
✅ Server-side combat validation
✅ Area of Interest system
✅ Basic leaderboards
✅ 50 concurrent players stable
✅ Death tracking

### Nice to Have
- Multiple servers
- Advanced combat mechanics
- Detailed statistics
- Social features

---

## Technical Decisions

### Keep Simple
- Movement (trust with validation)
- State broadcast (no prediction)
- Storage (JSON files initially)
- Architecture (single process until needed)

### Make Robust
- Combat validation (prevent cheating)
- Death tracking (data integrity)
- Server stability (auto-restart)
- Leaderboards (accurate records)

---

## Risk Management

### Performance
**Risk**: Can't handle 100 players
**Mitigation**: AoI reduces load 80%
**Fallback**: 50 player cap

### Gameplay
**Risk**: Permadeath too harsh
**Mitigation**: Quick respawn, show progress
**Fallback**: Optional hardcore mode

### Network
**Risk**: Combat lag unfair
**Mitigation**: Client prediction
**Fallback**: Regional servers

---

## Milestones

### Week 4: Core Combat
- Server authority working
- 50 players concurrent
- <100ms combat response

### Week 8: Full System
- Multiple servers
- Persistent data
- Cross-server features

### Week 10: Polish
- Exceptional combat feel
- Proven skill-based gameplay
- Ready for players

---

## Implementation Notes

1. **Incremental changes** - Don't break working systems
2. **Test with scale** - Use bots for load testing
3. **Measure everything** - Performance metrics
4. **Player feedback** - Test with real users

This roadmap balances ambition with pragmatism, focusing on essential MMORPG features while maintaining the simple architecture that makes the project maintainable.