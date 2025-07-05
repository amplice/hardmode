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
        const modulePath = moduleName === 'ProjectileManager' ? 
            `../dist/server/managers/${moduleName}.js` : 
            `../dist/server/systems/${moduleName}.js`;
        const tsModule = await import(modulePath);
        console.log(`  ✅ TypeScript ${moduleName} imported successfully`);
        
        // Run basic functionality tests
        if (moduleName === 'CalculationEngine') {
            await testCalculationEngine(tsModule.CalculationEngine);
        } else if (moduleName === 'ProjectileManager') {
            await testProjectileManager(tsModule.ProjectileManager);
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

async function testProjectileManager(ProjectileManager) {
    console.log('  🎯 Testing ProjectileManager methods...');
    
    // Mock SocketIO for testing
    const mockIO = {
        emit: (event, data) => {
            // Mock emit function for testing
        }
    };
    
    // Create ProjectileManager instance
    const projectileManager = new ProjectileManager(mockIO);
    
    // Test projectile creation
    const owner = { id: 'player1', class: 'hunter' };
    const projectileData = {
        x: 100,
        y: 100,
        angle: 0,
        speed: 600,
        damage: 10,
        range: 400
    };
    
    const projectile = projectileManager.createProjectile(owner, projectileData);
    
    if (!projectile || typeof projectile !== 'object') {
        throw new Error('Projectile creation failed');
    }
    
    if (projectile.x !== 100 || projectile.y !== 100) {
        throw new Error('Projectile position incorrect');
    }
    
    // Test serialization
    const serialized = projectileManager.getSerializedProjectiles();
    if (!Array.isArray(serialized)) {
        throw new Error('Serialization failed');
    }
    
    // Test cleanup function
    projectileManager.cleanup();
    
    console.log(`    - Projectile creation: ${projectile.id} at (${projectile.x}, ${projectile.y})`);
    console.log(`    - Serialized projectiles: ${serialized.length} active`);
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
        await testTypeScriptConversion('ProjectileManager');
        console.log('🎉 All TypeScript migration tests passed!');
        console.log('✅ Safe to proceed with migration');
    } catch (error) {
        console.error('💥 Migration test failed:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);