#!/usr/bin/env node

/**
 * Comprehensive Dependency Analysis for TypeScript Migration
 * 
 * This script analyzes all JavaScript files in src/js/ to create:
 * 1. Complete dependency graph
 * 2. Safe conversion order
 * 3. Interface requirements
 * 4. Circular dependency detection
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '..', 'src', 'js');

class DependencyAnalyzer {
    constructor() {
        this.files = new Map(); // filename -> file info
        this.dependencies = new Map(); // filename -> [dependencies]
        this.dependents = new Map(); // filename -> [dependents]
        this.exports = new Map(); // filename -> [exports]
        this.imports = new Map(); // filename -> [imports]
    }

    analyze() {
        console.log('🔍 PHASE 1.1: DEPENDENCY ANALYSIS STARTING...\n');
        
        // Step 1: Scan all files
        this.scanFiles();
        
        // Step 2: Parse imports/exports
        this.parseImportsExports();
        
        // Step 3: Build dependency graph
        this.buildDependencyGraph();
        
        // Step 4: Detect circular dependencies
        this.detectCircularDependencies();
        
        // Step 5: Generate conversion order
        this.generateConversionOrder();
        
        // Step 6: Output analysis
        this.outputAnalysis();
    }

    scanFiles() {
        console.log('📁 Scanning JavaScript files...');
        
        const scanDir = (dir, relativePath = '') => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativeFile = path.join(relativePath, item);
                
                if (fs.statSync(fullPath).isDirectory()) {
                    scanDir(fullPath, relativeFile);
                } else if (item.endsWith('.js')) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    this.files.set(relativeFile, {
                        path: fullPath,
                        relativePath: relativeFile,
                        content: content,
                        lines: content.split('\n').length
                    });
                }
            }
        };
        
        scanDir(SRC_DIR);
        console.log(`   Found ${this.files.size} JavaScript files\n`);
    }

    parseImportsExports() {
        console.log('🔍 Parsing imports and exports...');
        
        for (const [filename, fileInfo] of this.files) {
            const imports = [];
            const exports = [];
            
            const lines = fileInfo.content.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Parse imports
                const importMatch = trimmed.match(/^import\s+.*?\s+from\s+['"]([^'"]+)['"]/);
                if (importMatch) {
                    let importPath = importMatch[1];
                    
                    // Resolve relative imports
                    if (importPath.startsWith('.')) {
                        const dir = path.dirname(filename);
                        importPath = path.normalize(path.join(dir, importPath)).replace(/\\/g, '/');
                        
                        // Add .js extension if missing
                        if (!importPath.endsWith('.js')) {
                            importPath += '.js';
                        }
                    }
                    
                    imports.push({
                        original: importMatch[0],
                        path: importPath,
                        isRelative: importMatch[1].startsWith('.'),
                        isExternal: !importMatch[1].startsWith('.')
                    });
                }
                
                // Parse exports
                const exportMatch = trimmed.match(/^export\s+(class|const|function|default)\s+(\w+)/);
                if (exportMatch) {
                    exports.push({
                        type: exportMatch[1],
                        name: exportMatch[2],
                        line: trimmed
                    });
                }
            }
            
            this.imports.set(filename, imports);
            this.exports.set(filename, exports);
        }
        
        console.log(`   Parsed imports from ${this.imports.size} files\n`);
    }

    buildDependencyGraph() {
        console.log('🔗 Building dependency graph...');
        
        for (const [filename, imports] of this.imports) {
            const dependencies = [];
            
            for (const imp of imports) {
                if (imp.isRelative) {
                    // Find the actual file this imports
                    let targetFile = imp.path;
                    
                    // Check if the file exists in our scanned files
                    if (this.files.has(targetFile)) {
                        dependencies.push(targetFile);
                        
                        // Add to dependents map
                        if (!this.dependents.has(targetFile)) {
                            this.dependents.set(targetFile, []);
                        }
                        this.dependents.get(targetFile).push(filename);
                    }
                }
            }
            
            this.dependencies.set(filename, dependencies);
        }
        
        console.log(`   Built dependency relationships for ${this.dependencies.size} files\n`);
    }

    detectCircularDependencies() {
        console.log('🔄 Detecting circular dependencies...');
        
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];
        
        const dfs = (file, path = []) => {
            if (recursionStack.has(file)) {
                // Found a cycle
                const cycleStart = path.indexOf(file);
                const cycle = path.slice(cycleStart);
                cycle.push(file);
                cycles.push(cycle);
                return;
            }
            
            if (visited.has(file)) {
                return;
            }
            
            visited.add(file);
            recursionStack.add(file);
            path.push(file);
            
            const deps = this.dependencies.get(file) || [];
            for (const dep of deps) {
                dfs(dep, [...path]);
            }
            
            recursionStack.delete(file);
        };
        
        for (const file of this.files.keys()) {
            if (!visited.has(file)) {
                dfs(file);
            }
        }
        
        if (cycles.length > 0) {
            console.log(`   ⚠️  Found ${cycles.length} circular dependencies:`);
            cycles.forEach((cycle, i) => {
                console.log(`     ${i + 1}. ${cycle.join(' → ')}`);
            });
        } else {
            console.log(`   ✅ No circular dependencies found`);
        }
        
        console.log('');
        this.circularDependencies = cycles;
    }

    generateConversionOrder() {
        console.log('📋 Generating safe conversion order...');
        
        // Topological sort to determine conversion order
        const inDegree = new Map();
        const queue = [];
        const order = [];
        
        // Initialize in-degrees
        for (const file of this.files.keys()) {
            const deps = this.dependencies.get(file) || [];
            inDegree.set(file, deps.length);
            
            if (deps.length === 0) {
                queue.push(file);
            }
        }
        
        // Process queue
        while (queue.length > 0) {
            const file = queue.shift();
            order.push(file);
            
            const dependents = this.dependents.get(file) || [];
            for (const dependent of dependents) {
                const currentDegree = inDegree.get(dependent);
                inDegree.set(dependent, currentDegree - 1);
                
                if (inDegree.get(dependent) === 0) {
                    queue.push(dependent);
                }
            }
        }
        
        this.conversionOrder = order;
        console.log(`   Generated conversion order for ${order.length} files\n`);
    }

    outputAnalysis() {
        console.log('📊 DEPENDENCY ANALYSIS COMPLETE\n');
        console.log('=' .repeat(80));
        
        // Summary statistics
        console.log('\n📈 SUMMARY STATISTICS:');
        console.log(`Total files: ${this.files.size}`);
        console.log(`Total dependencies: ${Array.from(this.dependencies.values()).flat().length}`);
        console.log(`Files with no dependencies: ${Array.from(this.dependencies.values()).filter(deps => deps.length === 0).length}`);
        console.log(`Circular dependencies: ${this.circularDependencies.length}`);
        
        // Files by dependency count
        console.log('\n📊 FILES BY DEPENDENCY COUNT:');
        const depCounts = Array.from(this.dependencies.entries())
            .map(([file, deps]) => ({ file, count: deps.length }))
            .sort((a, b) => a.count - b.count);
            
        depCounts.forEach(({ file, count }) => {
            console.log(`  ${count.toString().padStart(2)} deps: ${file}`);
        });
        
        // Conversion order
        console.log('\n🔄 SAFE CONVERSION ORDER:');
        console.log('(Convert in this order to minimize dependencies)');
        this.conversionOrder.forEach((file, index) => {
            const deps = this.dependencies.get(file) || [];
            console.log(`  ${(index + 1).toString().padStart(2)}. ${file} (${deps.length} deps)`);
        });
        
        // High-priority files
        console.log('\n⚠️  HIGH-IMPACT FILES (most dependents):');
        const dependentCounts = Array.from(this.dependents.entries())
            .map(([file, deps]) => ({ file, count: deps.length }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
            
        dependentCounts.forEach(({ file, count }) => {
            console.log(`  ${file}: ${count} files depend on this`);
        });
        
        // Save detailed analysis to file
        this.saveDetailedAnalysis();
        
        console.log('\n✅ Analysis complete! Check dependency-analysis-detailed.json for full data.');
    }

    saveDetailedAnalysis() {
        const analysis = {
            summary: {
                totalFiles: this.files.size,
                totalDependencies: Array.from(this.dependencies.values()).flat().length,
                circularDependencies: this.circularDependencies.length,
                timestamp: new Date().toISOString()
            },
            files: Object.fromEntries(
                Array.from(this.files.entries()).map(([filename, info]) => [
                    filename,
                    {
                        lines: info.lines,
                        imports: this.imports.get(filename) || [],
                        exports: this.exports.get(filename) || [],
                        dependencies: this.dependencies.get(filename) || [],
                        dependents: this.dependents.get(filename) || []
                    }
                ])
            ),
            conversionOrder: this.conversionOrder,
            circularDependencies: this.circularDependencies
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'dependency-analysis-detailed.json'),
            JSON.stringify(analysis, null, 2)
        );
    }
}

// Run analysis
const analyzer = new DependencyAnalyzer();
analyzer.analyze();