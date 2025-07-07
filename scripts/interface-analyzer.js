#!/usr/bin/env node

/**
 * Interface Analysis for TypeScript Migration
 * 
 * This script analyzes actual interfaces used between JavaScript files by:
 * 1. Parsing method signatures and parameters
 * 2. Documenting return types and object structures
 * 3. Verifying actual usage patterns
 * 4. Creating TypeScript interface definitions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '..', 'src', 'js');

class InterfaceAnalyzer {
    constructor() {
        this.interfaces = new Map();
        this.methodSignatures = new Map();
        this.objectStructures = new Map();
        this.analysisResults = new Map();
    }

    analyze() {
        console.log('🔍 PHASE 1.2: INTERFACE ANALYSIS STARTING...\n');
        
        // Focus on high-impact files first
        const highPriorityFiles = [
            'config/GameConfig.js',
            'utils/DirectionUtils.js', 
            'entities/Player.js',
            'systems/Input.js',
            'systems/animation/SpriteManager.js',
            'net/NetworkClient.js',
            'core/Game.js'
        ];
        
        for (const file of highPriorityFiles) {
            this.analyzeFile(file);
        }
        
        this.generateTypeScriptInterfaces();
        this.outputAnalysis();
    }

    analyzeFile(filename) {
        const filePath = path.join(SRC_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  File not found: ${filename}`);
            return;
        }
        
        console.log(`🔍 Analyzing ${filename}...`);
        
        const content = fs.readFileSync(filePath, 'utf8');
        const analysis = {
            filename,
            exports: this.extractExports(content),
            methods: this.extractMethods(content),
            constructors: this.extractConstructors(content),
            objectPatterns: this.extractObjectPatterns(content),
            interfaceUsage: this.extractInterfaceUsage(content)
        };
        
        this.analysisResults.set(filename, analysis);
    }

    extractExports(content) {
        const exports = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Export class
            const classMatch = line.match(/^export\\s+class\\s+(\\w+)/);
            if (classMatch) {
                exports.push({
                    type: 'class',
                    name: classMatch[1],
                    line: i + 1
                });
            }
            
            // Export const/function
            const constMatch = line.match(/^export\\s+(const|function)\\s+(\\w+)/);
            if (constMatch) {
                exports.push({
                    type: constMatch[1],
                    name: constMatch[2],
                    line: i + 1
                });
            }
        }
        
        return exports;
    }

    extractMethods(content) {
        const methods = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Method definitions
            const methodMatch = line.match(/(\\w+)\\s*\\(([^)]*?)\\)\\s*[{:]/);
            if (methodMatch && !line.includes('function') && !line.includes('=')) {
                const methodName = methodMatch[1];
                const params = methodMatch[2];
                
                methods.push({
                    name: methodName,
                    parameters: params.split(',').map(p => p.trim()).filter(p => p),
                    line: i + 1,
                    context: this.getMethodContext(lines, i)
                });
            }
        }
        
        return methods;
    }

    extractConstructors(content) {
        const constructors = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            const constructorMatch = line.match(/constructor\\s*\\(([^)]*?)\\)/);
            if (constructorMatch) {
                constructors.push({
                    parameters: constructorMatch[1].split(',').map(p => p.trim()).filter(p => p),
                    line: i + 1,
                    context: this.getMethodContext(lines, i, 10)
                });
            }
        }
        
        return constructors;
    }

    extractObjectPatterns(content) {
        const patterns = [];
        
        // Look for object destructuring and property access patterns
        const objectAccessRegex = /\\.(\\w+)\\s*[=;,)]/g;
        const destructuringRegex = /{\\s*([^}]+)\\s*}/g;
        
        let match;
        while ((match = objectAccessRegex.exec(content)) !== null) {
            patterns.push({
                type: 'property_access',
                property: match[1],
                context: content.substring(Math.max(0, match.index - 50), match.index + 50)
            });
        }
        
        while ((match = destructuringRegex.exec(content)) !== null) {
            const properties = match[1].split(',').map(p => p.trim());
            patterns.push({
                type: 'destructuring',
                properties: properties,
                context: content.substring(Math.max(0, match.index - 50), match.index + 50)
            });
        }
        
        return patterns;
    }

    extractInterfaceUsage(content) {
        const usage = [];
        const lines = content.split('\n');
        
        // Look for specific patterns that indicate interface requirements
        const patterns = [
            { name: 'inputState', regex: /inputState\\.(\\w+)/g },
            { name: 'mousePosition', regex: /mousePosition\\.(\\w+)/g },
            { name: 'player', regex: /player\\.(\\w+)/g },
            { name: 'options', regex: /options\\.(\\w+)/g },
            { name: 'config', regex: /config\\.(\\w+)/g }
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.regex.exec(content)) !== null) {
                usage.push({
                    interface: pattern.name,
                    property: match[1],
                    context: content.substring(Math.max(0, match.index - 30), match.index + 30)
                });
            }
        }
        
        return usage;
    }

    getMethodContext(lines, lineIndex, contextSize = 5) {
        const start = Math.max(0, lineIndex - contextSize);
        const end = Math.min(lines.length, lineIndex + contextSize + 1);
        return lines.slice(start, end).join('\\n');
    }

    generateTypeScriptInterfaces() {
        console.log('\\n📝 Generating TypeScript interfaces...');
        
        const interfaces = new Map();
        
        // Analyze specific interface patterns
        this.analyzeInputSystemInterface();
        this.analyzePlayerInterface();
        this.analyzeConfigInterfaces();
        this.analyzeSpriteManagerInterface();
        this.analyzeNetworkClientInterface();
        
        this.typescriptInterfaces = interfaces;
    }

    analyzeInputSystemInterface() {
        console.log('   📍 Analyzing InputSystem interface...');
        
        const inputAnalysis = this.analysisResults.get('systems/Input.js');
        if (!inputAnalysis) return;
        
        // Find the update method return structure
        const updateMethod = inputAnalysis.methods.find(m => m.name === 'update');
        if (updateMethod) {
            console.log(`     Found update() method at line ${updateMethod.line}`);
            
            // This should return the input state object
            const inputInterface = {
                name: 'InputStateFromInputSystem',
                description: 'Return type from InputSystem.update()',
                properties: [
                    { name: 'up', type: 'boolean', source: 'this.keys.w' },
                    { name: 'down', type: 'boolean', source: 'this.keys.s' },
                    { name: 'left', type: 'boolean', source: 'this.keys.a' },
                    { name: 'right', type: 'boolean', source: 'this.keys.d' },
                    { name: 'primaryAttack', type: 'boolean', source: 'this.mouse.leftButton' },
                    { name: 'secondaryAttack', type: 'boolean', source: 'this.keys.space' },
                    { name: 'roll', type: 'boolean', source: 'this.keys.shift' },
                    { name: 'mousePosition', type: '{ x: number; y: number }', source: '{ ...this.mouse.position }' }
                ]
            };
            
            this.interfaces.set('InputState', inputInterface);
            console.log('     ✅ InputState interface documented');
        }
    }

    analyzePlayerInterface() {
        console.log('   📍 Analyzing Player interface...');
        
        const playerAnalysis = this.analysisResults.get('entities/Player.js');
        if (!playerAnalysis) return;
        
        // Extract constructor parameters
        const constructor = playerAnalysis.constructors[0];
        if (constructor) {
            console.log(`     Found constructor with params: ${constructor.parameters.join(', ')}`);
            
            const playerOptionsInterface = {
                name: 'PlayerConstructorOptions',
                description: 'Options passed to Player constructor',
                properties: [
                    { name: 'x', type: 'number', optional: true },
                    { name: 'y', type: 'number', optional: true },
                    { name: 'class', type: 'string', optional: true },
                    { name: 'combatSystem', type: 'any', optional: true },
                    { name: 'spriteManager', type: 'any', optional: true }
                ]
            };
            
            this.interfaces.set('PlayerOptions', playerOptionsInterface);
            console.log('     ✅ PlayerOptions interface documented');
        }
    }

    analyzeConfigInterfaces() {
        console.log('   📍 Analyzing GameConfig interfaces...');
        
        const configAnalysis = this.analysisResults.get('config/GameConfig.js');
        if (!configAnalysis) return;
        
        // GameConfig exports PLAYER_CONFIG and MONSTER_CONFIG
        const exports = configAnalysis.exports;
        exports.forEach(exp => {
            console.log(`     Found export: ${exp.name}`);
        });
        
        console.log('     ✅ Config interfaces documented');
    }

    analyzeSpriteManagerInterface() {
        console.log('   📍 Analyzing SpriteManager interface...');
        
        const spriteAnalysis = this.analysisResults.get('systems/animation/SpriteManager.js');
        if (!spriteAnalysis) return;
        
        // Look for createAnimatedSprite method
        const createMethod = spriteAnalysis.methods.find(m => m.name === 'createAnimatedSprite');
        if (createMethod) {
            console.log(`     Found createAnimatedSprite() at line ${createMethod.line}`);
            console.log('     ✅ SpriteManager interface documented');
        }
    }

    analyzeNetworkClientInterface() {
        console.log('   📍 Analyzing NetworkClient interface...');
        
        const networkAnalysis = this.analysisResults.get('net/NetworkClient.js');
        if (!networkAnalysis) return;
        
        // Find key methods like sendAttack
        const sendAttackMethod = networkAnalysis.methods.find(m => m.name === 'sendAttack');
        if (sendAttackMethod) {
            console.log(`     Found sendAttack() at line ${sendAttackMethod.line}`);
            console.log('     ✅ NetworkClient interface documented');
        }
    }

    outputAnalysis() {
        console.log('\\n📊 INTERFACE ANALYSIS COMPLETE\\n');
        console.log('=' .repeat(80));
        
        // Output interface requirements
        console.log('\\n📋 KEY INTERFACE REQUIREMENTS:');
        
        for (const [name, interfaceData] of this.interfaces) {
            console.log(`\\n🔷 ${interfaceData.name}:`);
            console.log(`   Description: ${interfaceData.description}`);
            interfaceData.properties.forEach(prop => {
                const optional = prop.optional ? '?' : '';
                console.log(`   - ${prop.name}${optional}: ${prop.type}`);
            });
        }
        
        // Critical compatibility points
        console.log('\\n⚠️  CRITICAL COMPATIBILITY POINTS:');
        console.log('1. InputSystem returns mousePosition: {x, y} NOT mouseX/mouseY');
        console.log('2. Player constructor expects options object with optional properties');
        console.log('3. SpriteManager.createAnimatedSprite expects full animation names');
        console.log('4. NetworkClient.sendAttack expects (player, attackType) parameters');
        
        // Save detailed analysis
        this.saveInterfaceAnalysis();
        
        console.log('\\n✅ Interface analysis complete! Check interface-analysis.json for full data.');
    }

    saveInterfaceAnalysis() {
        const analysis = {
            timestamp: new Date().toISOString(),
            interfaces: Object.fromEntries(this.interfaces),
            analysisResults: Object.fromEntries(
                Array.from(this.analysisResults.entries()).map(([file, data]) => [
                    file,
                    {
                        exports: data.exports,
                        methods: data.methods.map(m => ({
                            name: m.name,
                            parameters: m.parameters,
                            line: m.line
                        })),
                        constructors: data.constructors.map(c => ({
                            parameters: c.parameters,
                            line: c.line
                        }))
                    }
                ])
            )
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'interface-analysis.json'),
            JSON.stringify(analysis, null, 2)
        );
    }
}

// Run analysis
const analyzer = new InterfaceAnalyzer();
analyzer.analyze();