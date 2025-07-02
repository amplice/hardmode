# Future Improvements

This document tracks potential improvements that require live testing to ensure they don't break gameplay.

## **Performance Optimizations**

### Background Texture Optimization
**Concept**: Replace individual grass sprites with large procedurally-generated background textures
- **Current**: 250,000 individual 64x64 grass sprites (500x500 world)
- **Proposed**: ~60 large 2048x2048 textures with 99%+ draw call reduction
- **Implementation**: Runtime texture generation per chunk with caching
- **Risk**: Could affect visual alignment, sprite positioning, or introduce rendering bugs
- **Testing needed**: Verify collision alignment, sprite positioning, performance impact

### Extended LOD System
**Concept**: Implement near/medium/far detail levels for visual effects and decorations
- **Current**: Monster LOD system only
- **Proposed**: LOD for effects, decorations, animations based on distance
- **Risk**: Could affect visual feedback important for gameplay
- **Testing needed**: Ensure attack effects remain visible at appropriate ranges

## **Code Quality Refactoring**

### StatsComponent Overhaul
**Concept**: Make StatsComponent display-only, remove client-side level logic
- **Current**: Duplicated level-up logic that caused movement desync bug
- **Proposed**: Pure display component, server-authoritative progression
- **Risk**: Could break level progression, XP display, or UI updates
- **Testing needed**: Verify all leveling mechanics work correctly

### Combat System Consolidation
**Concept**: Centralize attack configuration and timing calculations
- **Current**: Scattered across GameConfig.js, CombatSystem.js, Player.js
- **Proposed**: Unified combat configuration system
- **Risk**: Could break attack timing, damage calculations, or class balance
- **Testing needed**: Verify all classes and attacks work identically

### Monster AI Decomposition
**Concept**: Split MonsterManager.js (709 lines) into focused classes
- **Current**: Monolithic monster management
- **Proposed**: Separate AI, spawning, and state management classes
- **Risk**: Could introduce monster behavior bugs or state desync
- **Testing needed**: Verify monster AI, pathfinding, and spawning work correctly

## **Visual Enhancements**

### Enhanced UI Systems
**Concept**: Improved class selection, level-up feedback, death/respawn screens
- **Risk**: Low - mostly visual improvements
- **Testing needed**: Verify UI interactions don't interfere with gameplay

### Effect System Framework
**Concept**: Create reusable effect system to replace hardcoded effects
- **Current**: Each effect is custom code in CombatSystem.js
- **Proposed**: Data-driven effect configuration
- **Risk**: Could break attack visual feedback or effect positioning
- **Testing needed**: Verify all combat effects appear correctly

---
*Note: All items in this document require live testing before implementation*
*Last updated: January 2025*