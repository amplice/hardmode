# Hardmode Re-Architecture Plan: Phases 1-4

## Phase 1: TypeScript Foundation & Entity Integrity

### Phase 1.1: TypeScript Migration ✅ COMPLETED
- Set up TypeScript configuration and core type definitions
- Establish type safety foundation for the codebase

### Phase 1.2: Entity Factories with Required Fields ✅ COMPLETED
- Create centralized entity creation factories
- Ensure all entities have required fields to prevent undefined errors
- Validate entity state consistency at creation time

## Phase 2: Network Message Validation & Optimization

### Phase 2.1: Schema-Based Network Messages ✅ COMPLETED
- Implement comprehensive network message validation
- Add schema validation for all client-server communication
- Prevent malformed messages from breaking game state

### Phase 2.2: Auto-Generated Critical Fields ✅ COMPLETED
- Automatically include critical fields (id, state, hp, facing) in all network updates
- Reduce undefined field errors in multiplayer synchronization
- Ensure consistent state representation across client-server boundary

## Phase 3: Server Authority & Calculation Engine

### Phase 3.1: Centralized Calculation Engine ✅ COMPLETED
- Move all combat calculations to server-side 
- Create unified damage/healing/stat calculation system
- Ensure consistent math across all game systems

### Phase 3.2: Server-Only Stat Updates ✅ COMPLETED
- Make server the single source of truth for all player stats
- Remove client-side stat modifications
- Prevent stat manipulation exploits

## Phase 4: Combat System Unification

### Phase 4.1: Attack Definition System ✅ COMPLETED
- Centralize all attack configurations in shared constants
- Standardize attack archetypes (melee, projectile, movement)
- Ensure consistent attack behavior across client-server

### Phase 4.2: Unified Damage System ✅ COMPLETED
- Consolidate all damage sources into single system
- Handle player damage, monster damage, environmental damage uniformly
- Simplify damage application and resistance calculations

## Phase 5: Advanced Entity Management

### Phase 5.1: Explicit State Classes for Monsters ✅ COMPLETED
- Create formal monster state machines
- Replace string-based states with type-safe state classes
- Improve monster AI predictability and debugging

### Phase 5.2: Monster Factory ✅ COMPLETED
- Centralize monster creation with validation
- Ensure consistent monster initialization
- Prevent missing properties in monster entities

## Phase 6: Projectile System Enhancement

### Phase 6.1: Projectile Class ⏳ PENDING
- Convert projectile system to class-based architecture
- Improve projectile lifecycle management
- Add better collision detection and visual effects