# HARDMODE MULTIPLAYER - MANUAL TESTING CHECKPOINTS

## Overview

This document outlines specific checkpoints where manual testing makes sense during development. Each checkpoint represents a stable, testable state where specific features can be verified.

**IMPORTANT**: Don't attempt to test before reaching a checkpoint - the game won't be in a runnable state and you'll just encounter errors.

## Testing Prerequisites

Before any manual testing, ensure you have:
- Node.js 20+ installed
- npm 10+ installed
- A modern web browser (Chrome, Firefox, Edge)
- Two browser windows/tabs for multiplayer testing

## Checkpoint 1: Server Infrastructure ✅ READY NOW

**What's Ready**: Basic server starts and accepts connections

**When**: After server foundation is complete (GameServer, GameLoop, basic networking)

**How to Test**:
```bash
cd multiplayer
npm install # If not done yet
cd server
npm install
npm run dev
```

**What to Verify**:
- [ ] Server starts without errors
- [ ] Shows "Server running at http://0.0.0.0:3000"
- [ ] Health check works: Visit http://localhost:3000/health
- [ ] Server logs show 60Hz game loop running
- [ ] Ctrl+C gracefully shuts down server

**Expected Output**:
```
🎮 Starting Hardmode Multiplayer Server...
📊 Configuration:
   - Port: 3000
   - Host: 0.0.0.0
   - Max Players: 100
   - World Seed: [timestamp]
   - Tick Rate: 60Hz
⏰ Game loop started at 60Hz (16.67ms per tick)
✅ Server running at http://0.0.0.0:3000
🎮 Game server initialized and running!
```

## Checkpoint 2: Basic Client-Server Connection 🚧 NOT READY

**What's Ready**: Client can connect to server via WebSocket

**When**: After basic client setup with Socket.io connection

**How to Test**:
```bash
# Terminal 1 - Start server
cd multiplayer/server
npm run dev

# Terminal 2 - Start client
cd multiplayer/client
npm run dev
# Visit http://localhost:5173
```

**What to Verify**:
- [ ] Client loads without errors
- [ ] Browser console shows "Connected to server"
- [ ] Server console shows "New connection: [socket-id]"
- [ ] No WebSocket errors in browser console

## Checkpoint 3: Player Join & Spawn 🚧 NOT READY

**What's Ready**: Players can join with a username and character class

**When**: After player join flow and basic entity creation

**How to Test**:
1. Start server and client
2. Enter username (3-20 characters)
3. Select character class
4. Click "Join Game"

**What to Verify**:
- [ ] Character selection screen appears
- [ ] All 4 classes are selectable
- [ ] Join button works
- [ ] Player spawns at world center (3200, 3200)
- [ ] Server shows "Player [username] joined successfully"
- [ ] Client receives player ID

## Checkpoint 4: Basic Movement 🚧 NOT READY

**What's Ready**: WASD movement with mouse facing

**When**: After movement system and client prediction

**How to Test**:
- Use WASD keys to move
- Move mouse to change facing direction

**What to Verify**:
- [ ] Character moves in 8 directions
- [ ] Movement is smooth (no stuttering)
- [ ] Character faces mouse cursor
- [ ] Movement speed feels right for each class
- [ ] No rubber-banding or teleporting

**Class Speeds to Verify**:
- Bladedancer: Medium speed
- Guardian: Noticeably slower
- Hunter: Same as Bladedancer
- Rogue: Noticeably faster

## Checkpoint 5: Multiplayer Sync 🚧 NOT READY

**What's Ready**: Multiple players see each other

**When**: After state synchronization and network updates

**How to Test**:
1. Open 2 browser windows
2. Join with different usernames
3. Move both players around

**What to Verify**:
- [ ] Both players see each other
- [ ] Movement appears smooth for remote players
- [ ] No position jumping or teleporting
- [ ] Facing direction syncs correctly
- [ ] Player names display above characters

## Checkpoint 6: World Rendering 🚧 NOT READY

**What's Ready**: Tiled world with grass, sand, water

**When**: After world generation and tile rendering

**What to Verify**:
- [ ] World tiles render correctly
- [ ] Water blocks movement
- [ ] Grass and sand are walkable
- [ ] World looks consistent between clients
- [ ] No missing or flickering tiles

## Checkpoint 7: Basic Combat 🚧 NOT READY

**What's Ready**: Primary attacks with hit detection

**When**: After combat system implementation

**How to Test**:
- Left click for primary attack
- Try hitting another player

**What to Verify**:
- [ ] Attack animation plays
- [ ] Hitbox appears briefly (if debug enabled)
- [ ] Damage numbers appear
- [ ] Health decreases when hit
- [ ] 0.25 second stun on hit
- [ ] Attack cooldowns work

## Checkpoint 8: All Character Abilities 🚧 NOT READY

**What's Ready**: All primary, secondary, and roll abilities

**When**: After all character abilities implemented

**How to Test**:
- Primary: Left click
- Secondary: Spacebar
- Roll: Shift (after level 5)

**What to Verify by Class**:

### Bladedancer
- [ ] Primary: Forward slash
- [ ] Secondary: Overhead smash (2 damage)
- [ ] Roll: 150 unit dash

### Guardian
- [ ] Primary: Wide axe sweep
- [ ] Secondary: Jump attack with invulnerability
- [ ] Roll: Standard dash

### Hunter
- [ ] Primary: Bow shot (projectile)
- [ ] Secondary: Backward jump + cone attack
- [ ] Roll: Standard dash

### Rogue
- [ ] Primary: Quick thrust
- [ ] Secondary: Dash attack (200 units)
- [ ] Roll: Standard dash

## Checkpoint 9: Monster AI 🚧 NOT READY

**What's Ready**: Monsters spawn and attack players

**When**: After AI system and monster spawning

**What to Verify**:
- [ ] 5 monster types spawn
- [ ] Monsters chase players
- [ ] Monster attacks work
- [ ] Monsters give XP when killed
- [ ] Max 300 monsters in world
- [ ] Monsters spawn 700+ pixels from players

## Checkpoint 10: Progression System 🚧 NOT READY

**What's Ready**: Leveling up with bonuses

**When**: After progression system implementation

**What to Verify**:
- [ ] XP bar fills when killing monsters
- [ ] Level up at correct XP amounts
- [ ] Level 2 & 6: Movement speed increase
- [ ] Level 3 & 7: Faster attack recovery
- [ ] Level 4 & 8: Reduced cooldowns
- [ ] Level 5: Roll ability unlocked
- [ ] Level 10: +1 HP
- [ ] Max level is 10

## Checkpoint 11: Full PvP Combat 🚧 NOT READY

**What's Ready**: Complete player vs player combat

**When**: After damage system and death/respawn

**What to Verify**:
- [ ] All attacks damage other players
- [ ] Death and respawn at center work
- [ ] Kill feed shows deaths
- [ ] Stats track kills/deaths
- [ ] Combat feels fair and responsive

## Checkpoint 12: Performance & Polish 🚧 NOT READY

**What's Ready**: Optimized for 100+ players

**When**: After optimization pass

**How to Test**:
- Use multiple devices/browsers
- Have friends join remotely

**What to Verify**:
- [ ] 60 FPS with 10+ players on screen
- [ ] <100ms latency feels smooth
- [ ] No memory leaks after 30 minutes
- [ ] Server handles 50+ concurrent players
- [ ] Particle effects don't cause lag

## Checkpoint 13: Production Ready 🚧 NOT READY

**What's Ready**: Complete game ready for deployment

**Final Checklist**:
- [ ] All classes balanced
- [ ] No major bugs
- [ ] Performance targets met
- [ ] Error handling works
- [ ] Reconnection works
- [ ] Mobile controls (if implemented)
- [ ] Audio (if implemented)

## Quick Test Commands

Add these to your terminal for quick testing:

```bash
# Start everything
alias hardmode-dev="cd /path/to/hardmode/multiplayer && npm run dev"

# Just server
alias hardmode-server="cd /path/to/hardmode/multiplayer/server && npm run dev"

# Just client  
alias hardmode-client="cd /path/to/hardmode/multiplayer/client && npm run dev"

# Kill all Node processes (emergency)
alias hardmode-kill="killall node"
```

## Common Issues & Solutions

### Server Won't Start
- Check if port 3000 is already in use
- Make sure you ran `npm install` in both `/multiplayer` and `/multiplayer/server`
- Check Node.js version is 20+

### Client Won't Connect
- Make sure server is running first
- Check browser console for errors
- Disable ad blockers (they can block WebSocket)
- Try a different browser

### Performance Issues
- Close other applications
- Use Chrome/Edge for best performance
- Check if CPU is thermal throttling
- Reduce number of test players

## Debug Commands

When testing, you can use browser console commands:

```javascript
// Show FPS counter
Game.showStats = true;

// Show hitboxes
Game.debugHitboxes = true;

// Show network stats
Game.showNetworkStats = true;

// Teleport player (testing only)
Game.player.teleport(x, y);
```

## Testing Philosophy

1. **Test One System at a Time**: Don't try to test combat before movement works
2. **Test Locally First**: Get single-player working before multiplayer
3. **Test Edge Cases**: Max players, high latency, packet loss
4. **Test Different Browsers**: Chrome, Firefox, Safari, Edge
5. **Test Different Machines**: Not all computers are gaming PCs

Remember: Each checkpoint builds on the previous ones. Don't skip ahead!