#!/usr/bin/env node

/**
 * Generate texture atlas metadata for sprite sheets
 * Since our sprites are already in sprite sheet format (animation strips),
 * we'll create an atlas index that maps sprite names for faster lookups
 * without actually repacking the images.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Atlas configurations
const atlasConfigs = {
    characters: {
        sourceDirs: [
            'src/assets/sprites/characters/Knight',
            'src/assets/sprites/characters/Guardian', 
            'src/assets/sprites/characters/Hunter',
            'src/assets/sprites/characters/Rogue'
        ],
        outputPath: 'src/assets/atlases/characters.json'
    },
    monsters: {
        sourceDirs: [
            'src/assets/sprites/monsters/Ogre',
            'src/assets/sprites/monsters/Skeleton',
            'src/assets/sprites/monsters/Elemental',
            'src/assets/sprites/monsters/Ghoul',
            'src/assets/sprites/monsters/WildArcher',
            'src/assets/sprites/monsters/DarkMage',
            'src/assets/sprites/monsters/Wolf',
            'src/assets/sprites/monsters/WingedDemon'
        ],
        outputPath: 'src/assets/atlases/monsters.json'
    },
    effects: {
        sourceDirs: [
            'src/assets/sprites/effects'
        ],
        outputPath: 'src/assets/atlases/effects.json'
    },
    ui: {
        sourceDirs: [
            'src/assets/sprites/powerups'
        ],
        outputPath: 'src/assets/atlases/ui.json'
    }
};

/**
 * Generate atlas metadata for a configuration
 */
function generateAtlasMetadata(config, atlasName) {
    const atlas = {
        meta: {
            version: "1.0",
            type: "sprite-index",
            description: `Sprite sheet index for ${atlasName}`,
            generated: new Date().toISOString()
        },
        sprites: {}
    };

    for (const dir of config.sourceDirs) {
        if (!fs.existsSync(dir)) {
            console.warn(`Directory not found: ${dir}`);
            continue;
        }

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
        const category = path.basename(dir);
        
        for (const file of files) {
            const spriteName = path.basename(file, '.png');
            const key = `${category}_${spriteName}`.toLowerCase();
            
            // Store the relative path from the project root
            atlas.sprites[key] = {
                path: path.join(dir, file).replace(/\\/g, '/'),
                category: category,
                animation: spriteName,
                // We'll add frame dimensions when we implement actual texture packing
                frames: null 
            };
        }
    }

    return atlas;
}

/**
 * Create atlas directory if it doesn't exist
 */
function ensureAtlasDirectory() {
    const atlasDir = 'src/assets/atlases';
    if (!fs.existsSync(atlasDir)) {
        fs.mkdirSync(atlasDir, { recursive: true });
        console.log(`Created atlas directory: ${atlasDir}`);
    }
}

/**
 * Main function
 */
function main() {
    console.log('Generating texture atlas metadata...\n');
    
    ensureAtlasDirectory();
    
    let totalSprites = 0;
    
    for (const [atlasName, config] of Object.entries(atlasConfigs)) {
        console.log(`Processing ${atlasName} atlas...`);
        
        const metadata = generateAtlasMetadata(config, atlasName);
        const spriteCount = Object.keys(metadata.sprites).length;
        totalSprites += spriteCount;
        
        // Write the atlas metadata
        fs.writeFileSync(
            config.outputPath,
            JSON.stringify(metadata, null, 2)
        );
        
        console.log(`  ✓ Generated ${config.outputPath} with ${spriteCount} sprite references\n`);
    }
    
    console.log(`\n✅ Successfully generated atlas metadata for ${totalSprites} sprites total`);
    console.log('\nNote: This is a sprite index for optimization. Actual texture packing');
    console.log('would require combining sprite sheets into single textures, which');
    console.log('would need frame extraction from the animation strips.');
}

// Run the script
main();