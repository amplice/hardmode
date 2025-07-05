/**
 * Comprehensive test for CalculationEngine TypeScript migration
 * Run with: node server/test/test-calculation-engine.mjs
 */

import { execSync } from 'child_process';
import { CalculationEngine as CalculationEngineJS } from '../systems/CalculationEngine.js';

console.log('🧪 CalculationEngine TypeScript Migration Test\n');

// Compile TypeScript
console.log('📦 Compiling TypeScript...');
execSync('npx tsc server/systems/CalculationEngine.ts --outDir dist-test --module ES2020 --target ES2020 --esModuleInterop --skipLibCheck --strict', {
    stdio: 'pipe'
});

// Import compiled TypeScript
const { CalculationEngine: CalculationEngineTS } = await import('../../dist-test/server/systems/CalculationEngine.js');

let passed = 0;
let failed = 0;

function test(name, jsResult, tsResult) {
    const success = JSON.stringify(jsResult) === JSON.stringify(tsResult);
    if (success) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        console.log(`   JS: ${JSON.stringify(jsResult)}`);
        console.log(`   TS: ${JSON.stringify(tsResult)}`);
        failed++;
    }
}

// Test all methods
console.log('\n📊 Testing methods:');

// Test calculateAttackDamage
test('calculateAttackDamage - bladedancer primary',
    CalculationEngineJS.calculateAttackDamage({ level: 5 }, 'primary', { level: 5 }, 'bladedancer'),
    CalculationEngineTS.calculateAttackDamage({ level: 5 }, 'primary', { level: 5 }, 'bladedancer')
);

// Test getBaseAttackDamage
test('getBaseAttackDamage - hunter primary',
    CalculationEngineJS.getBaseAttackDamage('hunter', 'primary'),
    CalculationEngineTS.getBaseAttackDamage('hunter', 'primary')
);

// Test getAttackDefinition
test('getAttackDefinition - rogue secondary',
    CalculationEngineJS.getAttackDefinition('rogue', 'secondary'),
    CalculationEngineTS.getAttackDefinition('rogue', 'secondary')
);

// Test calculateProjectileDamage
test('calculateProjectileDamage - hunter',
    CalculationEngineJS.calculateProjectileDamage({ class: 'hunter' }, 'arrow'),
    CalculationEngineTS.calculateProjectileDamage({ class: 'hunter' }, 'arrow')
);

// Test calculateMaxHP
test('calculateMaxHP - guardian level 10',
    CalculationEngineJS.calculateMaxHP('guardian', 10),
    CalculationEngineTS.calculateMaxHP('guardian', 10)
);

// Test calculateLevelFromXP
test('calculateLevelFromXP - 300 XP normal mode',
    CalculationEngineJS.calculateLevelFromXP(300, false),
    CalculationEngineTS.calculateLevelFromXP(300, false)
);

// Test applyLevelBonuses
const jsPlayer = { class: 'bladedancer', moveSpeedBonus: 0, attackRecoveryBonus: 0, attackCooldownBonus: 0, rollUnlocked: false };
const tsPlayer = { class: 'bladedancer', moveSpeedBonus: 0, attackRecoveryBonus: 0, attackCooldownBonus: 0, rollUnlocked: false };
CalculationEngineJS.applyLevelBonuses(jsPlayer, 1, 5);
CalculationEngineTS.applyLevelBonuses(tsPlayer, 1, 5);
test('applyLevelBonuses - level 1 to 5', jsPlayer, tsPlayer);

// Cleanup
execSync('rm -rf dist-test');

// Summary
console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);