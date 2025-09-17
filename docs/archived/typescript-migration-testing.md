# TypeScript Migration Testing Strategy

## Overview

This document outlines the testing strategy for safely migrating JavaScript modules to TypeScript in the Hardmode codebase. The strategy ensures that TypeScript versions are functionally identical to their JavaScript counterparts before switching over.

## Testing Approach

### 1. Side-by-Side Comparison Testing

Before replacing any JavaScript module with its TypeScript version, we run comprehensive tests that:
- Import both the original .js and compiled .ts versions
- Run identical operations through both implementations
- Compare outputs to ensure they match exactly

### 2. Test Structure

```
server/
├── systems/
│   ├── CalculationEngine.js     (original)
│   └── CalculationEngine.ts     (TypeScript version)
└── test/
    └── test-calculation-engine.mjs  (comparison test)
```

### 3. Running Tests

#### Quick Test for Any Module
```bash
node server/test-ts-migration.mjs <ModuleName>
```

#### Specific Module Test
```bash
node server/test/test-calculation-engine.mjs
```

## Test Implementation Example

```javascript
// 1. Compile TypeScript to ES modules
execSync('npx tsc server/systems/CalculationEngine.ts --outDir dist-test --module ES2020 --target ES2020 --esModuleInterop --skipLibCheck --strict');

// 2. Import both versions
import { CalculationEngine as JS } from '../systems/CalculationEngine.js';
const { CalculationEngine: TS } = await import('../../dist-test/server/systems/CalculationEngine.js');

// 3. Compare outputs
const jsResult = JS.calculateDamage(...params);
const tsResult = TS.calculateDamage(...params);
assert(jsResult === tsResult);
```

## Key Testing Areas

### 1. Method Availability
- Verify all methods from JS exist in TS
- Check for any additional methods in TS

### 2. Return Values
- Test with various input combinations
- Include edge cases (null, undefined, invalid inputs)
- Verify identical outputs for all scenarios

### 3. Side Effects
- Ensure state modifications are identical
- Check console warnings/errors match

### 4. Type Safety Benefits
- Document where TypeScript catches potential bugs
- Note any behavioral differences (should be none)

## Common Issues and Solutions

### Issue 1: Module Loading Differences
**Problem**: ES modules vs CommonJS incompatibilities  
**Solution**: Compile TypeScript to matching module format

### Issue 2: Property Name Mismatches
**Example**: `player.class` vs `player.characterClass`  
**Solution**: Match existing codebase conventions, update types later

### Issue 3: Import/Export Differences
**Problem**: Named vs default exports  
**Solution**: Handle both patterns in test code

## Migration Checklist

- [ ] Create TypeScript version with proper types
- [ ] Compile without errors in strict mode
- [ ] Write comparison tests covering all methods
- [ ] Run tests to verify identical behavior
- [ ] Update imports only after tests pass
- [ ] Remove old .js file only after production verification

## Current Status

### ✅ Completed Migrations
- **CalculationEngine**: All 12 methods tested and verified identical

### 🚧 In Progress
- InputProcessor
- LagCompensation
- SessionAntiCheat

### 📋 Planned
- All remaining server systems
- Shared modules
- Client systems (requires different testing approach)