/**
 * @fileoverview AtlasManager - Manages texture atlases for optimized sprite rendering
 * 
 * This system reduces draw calls by grouping related sprites into texture atlases.
 * Instead of loading 50+ individual PNG files, we load just a few atlas textures.
 */

import * as PIXI from 'pixi.js';

// Atlas configuration
interface AtlasConfig {
    name: string;
    path: string;
    jsonPath: string;
}

// Atlas data structure
interface AtlasData {
    frames: Record<string, {
        frame: { x: number, y: number, w: number, h: number };
        sourceSize: { w: number, h: number };
        spriteSourceSize: { x: number, y: number, w: number, h: number };
    }>;
    meta: {
        image: string;
        size: { w: number, h: number };
        scale: string;
    };
}

export class AtlasManager {
    private atlases: Map<string, PIXI.Texture[]>;
    private textures: Map<string, PIXI.Texture>;
    private loaded: boolean;

    // Define which sprites go into which atlases
    // Note: Currently using sprite index files that map to individual sprite sheets
    // rather than packed texture atlases. This provides fast lookups without repacking.
    private static readonly ATLAS_CONFIGS: AtlasConfig[] = [
        // Characters atlas (all player classes)
        { 
            name: 'characters', 
            path: 'assets/atlases/characters.png', // Placeholder for future packed atlas
            jsonPath: 'assets/atlases/characters.json'
        },
        // Monsters atlas 
        {
            name: 'monsters',
            path: 'assets/atlases/monsters.png', // Placeholder for future packed atlas
            jsonPath: 'assets/atlases/monsters.json'
        },
        // Effects atlas
        {
            name: 'effects',
            path: 'assets/atlases/effects.png', // Placeholder for future packed atlas
            jsonPath: 'assets/atlases/effects.json'
        },
        // UI/Powerups atlas
        {
            name: 'ui',
            path: 'assets/atlases/ui.png', // Placeholder for future packed atlas
            jsonPath: 'assets/atlases/ui.json'
        }
    ];

    constructor() {
        this.atlases = new Map();
        this.textures = new Map();
        this.loaded = false;
    }

    /**
     * Load all texture atlases
     */
    async loadAtlases(): Promise<void> {
        const loadPromises = AtlasManager.ATLAS_CONFIGS.map(config => 
            this.loadAtlas(config)
        );

        await Promise.all(loadPromises);
        this.loaded = true;
        console.log('[AtlasManager] All atlases loaded successfully');
    }

    /**
     * Load a single texture atlas
     */
    private async loadAtlas(config: AtlasConfig): Promise<void> {
        try {
            // Load the atlas metadata JSON
            const response = await fetch(config.jsonPath);
            const atlasData = await response.json();
            
            // For sprite index type, we don't load a packed texture
            // Instead, we store the sprite mappings for fast lookups
            if (atlasData.meta?.type === 'sprite-index') {
                // Store sprite path mappings
                for (const [key, spriteInfo] of Object.entries(atlasData.sprites)) {
                    // Store the path mapping for later loading
                    this.textures.set(key, spriteInfo as any);
                }
                console.log(`[AtlasManager] Loaded sprite index: ${config.name} with ${Object.keys(atlasData.sprites).length} sprites`);
            } else {
                // Traditional atlas with packed texture (future implementation)
                const baseTexture = await PIXI.Assets.load(config.path);
                baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

                // Create textures from atlas data
                for (const [frameName, frameData] of Object.entries(atlasData.frames || {})) {
                    const frame = frameData as any;
                    const texture = new PIXI.Texture(
                        baseTexture,
                        new PIXI.Rectangle(
                            frame.frame.x,
                            frame.frame.y,
                            frame.frame.w,
                            frame.frame.h
                        )
                    );
                    
                    this.textures.set(frameName, texture);
                }
                console.log(`[AtlasManager] Loaded atlas: ${config.name}`);
            }
        } catch (error) {
            console.error(`[AtlasManager] Failed to load atlas ${config.name}:`, error);
            // Fall back to loading sprites individually if atlas fails
            throw error;
        }
    }


    /**
     * Get a texture from the atlases
     */
    getTexture(name: string): PIXI.Texture | undefined {
        return this.textures.get(name);
    }

    /**
     * Get multiple textures (for animations)
     */
    getTextures(names: string[]): PIXI.Texture[] {
        const textures: PIXI.Texture[] = [];
        for (const name of names) {
            const texture = this.textures.get(name);
            if (texture) {
                textures.push(texture);
            }
        }
        return textures;
    }

    /**
     * Check if atlases are loaded
     */
    isLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Create a mapping from individual sprite paths to atlas frame names
     * This allows SpriteManager to work with minimal changes
     */
    createSpriteToAtlasMapping(): Map<string, string> {
        const mapping = new Map<string, string>();
        
        // Build mapping from loaded sprite indices
        for (const [key, value] of this.textures.entries()) {
            if (typeof value === 'object' && 'path' in value) {
                // This is a sprite info object from our index
                const spriteInfo = value as any;
                mapping.set(spriteInfo.path, key);
            }
        }
        
        return mapping;
    }
}