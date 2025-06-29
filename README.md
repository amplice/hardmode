# Hardmode MMORPG

A 2D pixel-art multiplayer MMORPG focused on skill-based combat. Built with PIXI.js and Node.js.

## 🎮 **What This Is**

A **working multiplayer game** where:
- **Level 1 can beat Level 10** through superior positioning and timing
- **4 distinct character classes** with unique abilities
- **Real-time combat** with meaningful progression (roll unlocks at level 5!)
- **No items/inventory** - pure skill-based gameplay
- **Small-scale multiplayer** (10-20 players) with smooth netcode

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

## 🎯 **Current Status: Functional Multiplayer MMORPG**

**✅ What Works:**
- Real-time multiplayer with smooth synchronization
- 4 character classes with distinct combat styles
- XP progression with meaningful stat bonuses
- Roll mechanics unlocked at level 5 (Shift key)
- Monster AI with 5 different types
- Deterministic world generation
- Professional anti-cheat and network optimization

**🔄 In Progress:**
- Combat balance refinement
- True permadeath implementation (currently 3-second respawn)
- Database persistence (currently session-based)

**🎮 Philosophy:** Simple architecture that works > Complex architecture that doesn't

## 🏗️ **Architecture**

- **Frontend:** PIXI.js with JavaScript ES6 modules
- **Backend:** Node.js with Socket.io (30Hz tick rate)
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