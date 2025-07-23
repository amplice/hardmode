TypeScript Migration Implementation Prompt

       Objective

       Convert the entire Hardmode JavaScript codebase to TypeScript while maintaining 100% functionality and ensuring smooth development workflow.

       Pre-Migration Analysis Required

       1. Dependency Audit: Examine package.json and identify which dependencies have TypeScript types available (@types packages)
       2. Build Pipeline Assessment: Understand current build process (npm run dev, npm test) and how to integrate TypeScript compilation
       3. Import/Export Mapping: Catalog all import/export relationships to ensure they remain intact post-migration
       4. Critical Path Identification: Identify the most important files that other files depend on (Game.js, Player.js, etc.)

       Migration Strategy: Bottom-Up Approach

       Phase 1: Infrastructure Setup

       1. TypeScript Configuration
         - Configure tsconfig.json for strict type checking
         - Set up compilation to preserve existing directory structure
         - Enable source maps for debugging
         - Configure module resolution for shared/ imports
       2. Build Pipeline Integration
         - Modify npm scripts to compile TypeScript first
         - Set up watch mode for development
         - Ensure hot reload still works for client-side development
         - Update test runner to handle TypeScript files
       3. Type Definitions Foundation
         - Expand existing GameTypes.ts with comprehensive type definitions
         - Create interface definitions for all entities (Player, Monster, Projectile)
         - Define network message types for all client-server communication
         - Create utility types for common patterns (Vector2D, Rectangle, etc.)

       Phase 2: Shared Code Migration (Foundation)

       1. Convert shared/constants/ - Start with GameConstants.js since everything imports it
       2. Convert shared/systems/ - CollisionMask.js, WorldGenerator.js, etc.
       3. Convert shared/utils/ - MathUtils.js and other utilities
       4. Convert shared/factories/ - EntityFactories.js with proper return types
       5. Convert shared/validation/ - SimpleValidator.js with type-safe validation

       Phase 3: Server-Side Migration (Core Logic)

       1. Convert server/systems/ - CalculationEngine.js, DamageProcessor.js first (most critical)
       2. Convert server/managers/ - GameStateManager.js, MonsterManager.js, ProjectileManager.js
       3. Convert server/network/ - SocketHandler.js, NetworkOptimizer.js
       4. Convert server/index.js - Main server file last

       Phase 4: Client-Side Migration (UI Layer)

       1. Convert src/js/core/ - Game.js, Player.js (most critical client files)
       2. Convert src/js/systems/ - CombatSystem.js, MovementPredictor.js, etc.
       3. Convert src/js/rendering/ - All renderer classes
       4. Convert src/js/network/ - NetworkClient.js, StateReconciler.js
       5. Convert src/js/entities/ - Monster.js, Projectile.js

       Critical Migration Requirements

       Type Safety Priorities

       1. Strict null checking - Eliminate undefined field access
       2. Proper function signatures - Type all parameters and return values
       3. Interface compliance - Ensure all entities match their type definitions
       4. Generic type usage - Use generics for collections and state management

       Import/Export Integrity

       1. Preserve all existing imports - Don't break any module dependencies
       2. Update file extensions - Change .js imports to .ts where needed
       3. Maintain barrel exports - Keep existing export patterns intact
       4. Path consistency - Ensure relative imports still work

       Development Workflow Preservation

       1. Hot reload functionality - Ensure client-side development experience remains smooth
       2. Fast compilation - Optimize TypeScript compilation for development speed
       3. Error reporting - Provide clear error messages during development
       4. Debugging support - Maintain ability to debug both client and server code

       Validation Strategy

       1. Compilation verification - Ensure all files compile without errors
       2. Runtime testing - Run full test suite after migration
       3. Multiplayer testing - Verify client-server communication still works
       4. Performance benchmarking - Ensure no significant performance regression

       Success Criteria

       - All 70+ JavaScript files successfully converted to TypeScript
       - Zero compilation errors
       - All existing tests pass
       - Multiplayer functionality works identically
       - Development workflow remains smooth (npm run dev, hot reload)
       - Build time remains reasonable (<30 seconds for full compilation)

       Risk Mitigation

       - Branch protection - Perform migration on separate branch
       - Incremental commits - Small, focused commits for each file/module
       - Rollback plan - Ability to revert if critical issues arise
       - Testing checkpoints - Verify functionality at each phase completion