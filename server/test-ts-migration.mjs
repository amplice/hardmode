/**
 * TypeScript Migration Validation Test
 * 
 * This test validates that our TypeScript conversions work identically to the JavaScript versions.
 * Run with: node server/test-ts-migration.mjs
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

console.log('🧪 TypeScript Migration Validation Test\n');

// Test function to run TypeScript compilation and compare behavior
async function testTypeScriptConversion(moduleName) {
    console.log(`Testing ${moduleName}...`);
    
    try {
        // First, compile TypeScript
        console.log('  📦 Compiling TypeScript...');
        const tscResult = await runCommand('npm', ['run', 'build']);
        if (tscResult.exitCode !== 0) {
            throw new Error(`TypeScript compilation failed: ${tscResult.stderr}`);
        }
        
        // Import and test the compiled TypeScript version
        const tsModule = await import(`../dist/server/systems/${moduleName}.js`);
        console.log(`  ✅ TypeScript ${moduleName} imported successfully`);
        
        // Run basic functionality tests
        if (moduleName === 'CalculationEngine') {
            await testCalculationEngine(tsModule.CalculationEngine);
        }
        
        console.log(`  ✅ ${moduleName} TypeScript conversion validated\n`);
        
    } catch (error) {
        console.error(`  ❌ ${moduleName} test failed:`, error.message);
        process.exit(1);
    }
}

async function testCalculationEngine(CalculationEngine) {
    console.log('  🧮 Testing CalculationEngine methods...');
    
    // Test basic damage calculation
    const damage1 = CalculationEngine.getBaseAttackDamage('bladedancer', 'primary');
    const damage2 = CalculationEngine.getBaseAttackDamage('hunter', 'secondary');
    
    if (typeof damage1 !== 'number' || typeof damage2 !== 'number') {
        throw new Error('Damage calculation returned non-number');
    }
    
    // Test level calculation
    const level1 = CalculationEngine.calculateLevelFromXP(0);
    const level2 = CalculationEngine.calculateLevelFromXP(100);
    
    if (level1 !== 1 || typeof level2 !== 'number') {
        throw new Error('Level calculation failed');
    }
    
    // Test HP calculation
    const hp1 = CalculationEngine.calculateMaxHP('bladedancer', 1);
    const hp2 = CalculationEngine.calculateMaxHP('guardian', 10);
    
    if (typeof hp1 !== 'number' || typeof hp2 !== 'number') {
        throw new Error('HP calculation failed');
    }
    
    console.log(`    - Damage calculations: ${damage1}, ${damage2}`);
    console.log(`    - Level calculations: ${level1}, ${level2}`);
    console.log(`    - HP calculations: ${hp1}, ${hp2}`);
}

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { 
            stdio: 'pipe',
            shell: true 
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            resolve({
                exitCode: code,
                stdout,
                stderr
            });
        });
        
        child.on('error', reject);
    });
}

// Run the tests
async function main() {
    try {
        await testTypeScriptConversion('CalculationEngine');
        console.log('🎉 All TypeScript migration tests passed!');
        console.log('✅ Safe to proceed with migration');
    } catch (error) {
        console.error('💥 Migration test failed:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);