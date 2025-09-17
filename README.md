# Hardmode MMORPG

A 2D pixel-art multiplayer MMORPG focused on skill-based combat. Built with PIXI.js and Node.js.

## 🎮 **What This Is**

A **working multiplayer game** where:
- **Level 1 can beat Level 10** through superior positioning and timing
- **4 distinct character classes** with unique abilities (Bladedancer, Guardian, Hunter, Rogue)
- **8 monster types** with special attacks and intelligent AI
- **Real-time combat** with meaningful progression (roll unlocks at level 5!)
- **Powerup system** with speed boosts, damage buffs, and invincibility
- **No items/inventory** - pure skill-based gameplay
- **Small-scale multiplayer** (30+ concurrent players) with smooth netcode

## 🚀 **Quick Start**

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to play. Open multiple browser windows for local multiplayer testing.

## 📖 **Documentation**

**📋 [CLAUDE.md](CLAUDE.md) - Complete Game Guide**  
*This is the master documentation that accurately describes what's implemented, how it works, and current limitations.*

## 🧪 **Testing**

```bash
npm test              # Run all tests (unit + browser automation)
npm test:watch        # Watch mode for development
```

Includes comprehensive test suite:
- Unit tests for combat balance and world generation
- **Puppeteer browser automation** that actually plays the game
- **Socket.io automated playtesting** with real server connections
- Performance monitoring and screenshot capture

## 🎯 **Current Status: Production-Ready Multiplayer MMORPG**

**✅ What Works:**
- Real-time multiplayer with smooth synchronization (30+ concurrent players)
- 4 character classes with distinct combat styles and unique abilities
- 8 monster types with special attacks (spin attacks, teleports, projectiles)
- XP progression system with meaningful stat bonuses per level
- Roll mechanics unlocked at level 5 (Shift key) for advanced movement
- Monster AI with intelligent A* pathfinding across elevation changes
- Powerup drops from monsters (speed, damage, invincibility, health)
- Advanced sound system with spatial audio and per-biome footsteps
- Deterministic world generation with 500x500 tile worlds
- Professional anti-cheat and network optimization (70-80% bandwidth reduction)
- Full TypeScript implementation with type safety

**🔄 Future Enhancements:**
- Additional monster abilities and attack patterns
- More powerup types and effects
- Database persistence for long-term progression
- Expanded world with more biomes and areas

**🎮 Philosophy:** Simple architecture that works > Complex architecture that doesn't

## 🏗️ **Architecture**

- **Frontend:** PIXI.js 7.4.3 with TypeScript ES6 modules
- **Backend:** Node.js with Socket.io (30Hz tick rate) in TypeScript
- **Networking:** Event-based messaging with area-of-interest optimization
- **Testing:** Jest + Puppeteer for comprehensive coverage

Built for **small-scale skill-based PvP**, not massive server populations.

## 🤝 **Contributing**

See [CLAUDE.md](CLAUDE.md) for comprehensive development guidance, including:
- How features actually work (not aspirational docs)
- Common development tasks
- Testing infrastructure
- Performance debugging tools
- Honest assessment of current limitations

## 📜 **License**

ISC