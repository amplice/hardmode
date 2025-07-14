/**
 * @fileoverview PowerupRenderer - Client-side powerup visualization system
 * 
 * ARCHITECTURE ROLE:
 * - Renders powerup entities received from server
 * - Manages powerup sprite creation and destruction
 * - Handles floating animation for visual appeal
 * - Integrates with sprite system for powerup visuals
 * 
 * RENDERING APPROACH:
 * - Creates visual representation for each powerup type
 * - Uses powerup sprites (health_powerup.png, armor_powerup.png, etc.)
 * - Implements floating up/down animation for visual appeal
 * - Falls back to basic graphics if sprites not loaded
 * 
 * NETWORK INTEGRATION:
 * - Receives powerup data from NetworkClient
 * - Handles creation/destruction based on server events
 * - Synchronized with server powerup lifecycle
 * - Supports powerupSpawned, powerupPickedUp, powerupRemoved events
 */

import * as PIXI from 'pixi.js';

// Interface for powerup creation data
interface PowerupData {
    id: string;
    type: string; // 'health', 'armor', 'speed', 'damage', 'invulnerability'
    x: number;
    y: number;
    spawnTime: number;
    expiresAt: number;
}

// Interface for stored powerup
interface RenderedPowerup {
    id: string;
    type: string;
    sprite: PIXI.Container;
    x: number;
    y: number;
    spawnTime: number;
    expiresAt: number;
    graphics?: PIXI.Graphics;
    texture?: PIXI.Sprite;
    animationTime: number; // For floating animation
}

// Minimal game interface
interface GameInterface {
    entityContainer: PIXI.Container;
    systems: {
        sprites?: {
            loaded: boolean;
            createAnimatedSprite(name: string): PIXI.AnimatedSprite | null;
            getPowerupTexture(powerupType: string): PIXI.Texture | null;
        };
    };
}

export class PowerupRenderer {
    private game: GameInterface;
    private powerups: Map<string, RenderedPowerup>;
    private container: PIXI.Container;
    
    // Powerup sprite mappings
    private spriteMap = {
        'health': 'assets/sprites/powerups/health_powerup.png',
        'armor': 'assets/sprites/powerups/armor_powerup.png',
        'speed': 'assets/sprites/powerups/speed_powerup.png',
        'damage': 'assets/sprites/powerups/attack_powerup.png',
        'invulnerability': 'assets/sprites/powerups/invulnerability_powerup.png'
    };

    constructor(game: GameInterface) {
        this.game = game;
        this.powerups = new Map();
        this.container = new PIXI.Container();
        this.container.zIndex = 50; // Above ground, below entities
        game.entityContainer.addChild(this.container);
        
        console.log('[PowerupRenderer] Initialized powerup rendering system');
    }

    createPowerup(data: PowerupData): void {
        // Don't recreate if already exists
        if (this.powerups.has(data.id)) return;
        
        const powerup: RenderedPowerup = {
            id: data.id,
            type: data.type,
            sprite: new PIXI.Container(),
            x: data.x,
            y: data.y,
            spawnTime: data.spawnTime,
            expiresAt: data.expiresAt,
            animationTime: 0 // Start floating animation at 0
        };
        
        // Try to load sprite texture
        this.createPowerupSprite(powerup);
        
        // Position the sprite
        powerup.sprite.x = powerup.x;
        powerup.sprite.y = powerup.y;
        
        // Add to container and map
        this.container.addChild(powerup.sprite);
        this.powerups.set(data.id, powerup);
        
        console.log(`[PowerupRenderer] Created ${data.type} powerup at (${data.x}, ${data.y})`);
    }

    private createPowerupSprite(powerup: RenderedPowerup): void {
        // Try to get preloaded texture from SpriteManager first
        if (this.game.systems.sprites && this.game.systems.sprites.loaded) {
            const texture = this.game.systems.sprites.getPowerupTexture(powerup.type);
            if (texture) {
                const sprite = new PIXI.Sprite(texture);
                sprite.anchor.set(0.5, 0.5); // Center the sprite
                sprite.scale.set(0.6, 0.6); // Scale to 60% size
                powerup.sprite.addChild(sprite);
                powerup.texture = sprite;
                console.log(`[PowerupRenderer] Using preloaded sprite for ${powerup.type}`);
                return;
            }
        }
        
        // Fallback: Try to load sprite directly (should rarely happen now)
        const spriteName = this.spriteMap[powerup.type as keyof typeof this.spriteMap];
        if (spriteName) {
            try {
                const texture = PIXI.Texture.from(spriteName);
                if (texture && texture.valid) {
                    const sprite = new PIXI.Sprite(texture);
                    sprite.anchor.set(0.5, 0.5); // Center the sprite
                    sprite.scale.set(0.6, 0.6); // Scale to 60% size
                    powerup.sprite.addChild(sprite);
                    powerup.texture = sprite;
                    console.log(`[PowerupRenderer] Loaded sprite on-demand for ${powerup.type}: ${spriteName}`);
                    return;
                }
            } catch (error) {
                console.warn(`[PowerupRenderer] Failed to load sprite ${spriteName}:`, error);
            }
        }
        
        // Final fallback to colored circle graphics
        const graphics = new PIXI.Graphics();
        const color = this.getPowerupColor(powerup.type);
        graphics.beginFill(color);
        graphics.drawCircle(0, 0, 16); // 16px radius circle
        graphics.endFill();
        
        // Add white border for visibility
        graphics.lineStyle(2, 0xFFFFFF);
        graphics.drawCircle(0, 0, 16);
        
        powerup.sprite.addChild(graphics);
        powerup.graphics = graphics;
        console.log(`[PowerupRenderer] Created fallback graphics for ${powerup.type} powerup`);
    }

    private getPowerupColor(type: string): number {
        const colors = {
            'health': 0xFF4444,       // Red
            'armor': 0x44FF44,        // Green
            'speed': 0xFF8844,        // Orange (matching sprite)
            'damage': 0x44DDFF,       // Light blue (matching sprite)
            'invulnerability': 0xFFFF44 // Yellow
        };
        return colors[type as keyof typeof colors] || 0xFFFFFF;
    }

    removePowerup(id: string): void {
        const powerup = this.powerups.get(id);
        if (!powerup) return;
        
        // Remove from container
        this.container.removeChild(powerup.sprite);
        
        // Clean up sprites
        if (powerup.graphics) {
            powerup.graphics.destroy();
        }
        if (powerup.texture) {
            powerup.texture.destroy();
        }
        powerup.sprite.destroy();
        
        // Remove from map
        this.powerups.delete(id);
        
        console.log(`[PowerupRenderer] Removed ${powerup.type} powerup ${id}`);
    }

    update(deltaTime: number): void {
        // Update floating animation for all powerups
        this.powerups.forEach((powerup) => {
            // Update animation time
            powerup.animationTime += deltaTime;
            
            // Calculate floating offset (sine wave for smooth up/down motion)
            const floatSpeed = 2.0; // Speed of floating animation
            const floatHeight = 8; // How many pixels to float up/down
            const floatOffset = Math.sin(powerup.animationTime * floatSpeed) * floatHeight;
            
            // Apply floating animation
            powerup.sprite.y = powerup.y + floatOffset;
            
            // Optional: Add subtle rotation for extra visual appeal
            const rotationSpeed = 0.5;
            powerup.sprite.rotation = Math.sin(powerup.animationTime * rotationSpeed) * 0.1; // Small rotation
            
            // Check for expiration (visual feedback)
            const timeUntilExpiration = powerup.expiresAt - Date.now();
            if (timeUntilExpiration < 5000) { // Last 5 seconds
                // Make it blink to indicate expiration
                const blinkSpeed = 5.0;
                powerup.sprite.alpha = 0.3 + 0.7 * Math.abs(Math.sin(powerup.animationTime * blinkSpeed));
            } else {
                powerup.sprite.alpha = 1.0; // Normal visibility
            }
        });
    }

    // Handle network events
    onPowerupSpawned(data: PowerupData): void {
        this.createPowerup(data);
    }

    onPowerupPickedUp(data: { powerupId: string, playerId: string, type: string }): void {
        // Add pickup effect here if desired (particles, sound, etc.)
        this.removePowerup(data.powerupId);
        console.log(`[PowerupRenderer] Player ${data.playerId} picked up ${data.type} powerup`);
    }

    onPowerupRemoved(data: { powerupId: string }): void {
        this.removePowerup(data.powerupId);
    }

    // Debug/admin functions
    getPowerupCount(): number {
        return this.powerups.size;
    }

    getPowerupTypes(): string[] {
        return Array.from(this.powerups.values()).map(p => p.type);
    }

    cleanup(): void {
        // Clean up all powerups
        this.powerups.forEach((powerup) => {
            if (powerup.graphics) {
                powerup.graphics.destroy();
            }
            if (powerup.texture) {
                powerup.texture.destroy();
            }
            powerup.sprite.destroy();
        });
        
        this.powerups.clear();
        this.container.destroy();
        console.log('[PowerupRenderer] Cleaned up all powerup resources');
    }
}