# Code Quality Analysis

This document identifies the worst implemented systems in the codebase that should be prioritized for refactoring.

## 1. **StatsComponent in Player.js** (Most problematic)
- **Duplicated level-up logic** that we just had to disable to fix the movement bug
- **Client-side XP calculations** that should be server-only
- **Mixed responsibilities** - handles both display and game logic
- **Inconsistent with server authority** principle

**Impact**: High - Caused movement prediction desync bug at level 6+
**Effort**: Medium - Needs careful refactoring to maintain server authority

## 2. **Attack/Combat Configuration** (Most complex/fragmented)
- **Scattered across multiple files** - GameConfig.js, CombatSystem.js, Player.js
- **Class-specific attack overrides** make it hard to balance
- **Complex timing calculations** spread throughout the code
- **Hunter mouse targeting vs facing direction** is inconsistent with other classes

**Impact**: High - Makes combat balancing and new class addition difficult
**Effort**: High - Would require significant architectural changes

## 3. **Monster AI State Management**
- **MonsterManager.js is 709 lines** - doing too much
- **State transitions** could be cleaner (idle/chasing/attacking/stunned)
- **Pathfinding integration** feels bolted-on rather than integrated
- **Damage/stun timing** is hardcoded rather than configurable

**Impact**: Medium - Affects monster behavior consistency
**Effort**: Medium - Could be split into smaller, focused classes

## 4. **Effect System** (Least flexible)
- **Hardcoded effect types** in CombatSystem.js
- **No reusable effect framework** - each effect is custom code
- **Positioning logic** is complex and error-prone
- **Limited visual customization** options

**Impact**: Low - Functional but hard to extend
**Effort**: Medium - Would benefit from a proper effect framework

## 5. **Collision System Integration**
- **Three different collision implementations** (server, client, predictor)
- **CollisionMask.js sharing** works but is fragile
- **Edge case handling** varies between implementations

**Impact**: Medium - Potential source of desync bugs
**Effort**: High - Touching collision is always risky

## Priority Recommendations

1. **StatsComponent refactor** - Remove client-side level logic, make display-only
2. **Combat system consolidation** - Centralize attack configuration and timing
3. **MonsterManager decomposition** - Split into focused classes
4. **Effect system framework** - Create reusable effect system
5. **Collision unification** - Standardize collision handling (if needed)

---
*Generated: January 2025*
*Last movement bug fix: Level bonuses now server-authoritative via NetworkOptimizer critical fields*