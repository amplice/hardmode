/**
 * @fileoverview ProjectileRenderer - Client-side projectile visualization system
 * 
 * MIGRATION NOTES:
 * - Converted from ProjectileRenderer.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for projectile structures
 * - Preserved all rendering and animation logic
 * 
 * ARCHITECTURE ROLE:
 * - Renders projectile entities received from server
 * - Manages projectile sprite creation and destruction
 * - Handles smooth interpolation for network updates
 * - Integrates with sprite system for visual effects
 * 
 * RENDERING APPROACH:
 * - Creates visual representation for each projectile
 * - Uses sprite effects when available (loaded from spritesheets)
 * - Falls back to basic graphics if sprites not loaded
 * - Supports late-loading of sprite effects
 * 
 * NETWORK INTEGRATION:
 * - Receives projectile data from NetworkClient
 * - Updates positions with interpolation for smoothness
 * - Handles creation/destruction based on server events
 * - Synchronized with server projectile lifecycle
 */

import * as PIXI from 'pixi.js';

// Interface for projectile creation data
interface ProjectileData {
    id: string;
    x: number;
    y: number;
    angle: number;
    speed: number;
    effectType?: string;
}

// Interface for stored projectile
interface RenderedProjectile {
    id: string;
    sprite: PIXI.Container;
    x: number;
    y: number;
    angle: number;
    speed: number;
    velocity: {
        x: number;
        y: number;
    };
    effectType?: string;
    graphics?: PIXI.Graphics;
    effect?: PIXI.AnimatedSprite;
}

// Minimal game interface
interface GameInterface {
    entityContainer: PIXI.Container;
    systems: {
        sprites?: {
            loaded: boolean;
            createAnimatedSprite(name: string): PIXI.AnimatedSprite | null;
        };
    };
}

export class ProjectileRenderer {
    private game: GameInterface;
    private projectiles: Map<string, RenderedProjectile>;
    private container: PIXI.Container;

    constructor(game: GameInterface) {
        this.game = game;
        this.projectiles = new Map();
        this.container = new PIXI.Container();
        this.container.zIndex = 100; // Above entities
        game.entityContainer.addChild(this.container);
    }

    createProjectile(data: ProjectileData): void {
        // Don't recreate if already exists
        if (this.projectiles.has(data.id)) return;
        
        const projectile: RenderedProjectile = {
            id: data.id,
            sprite: new PIXI.Container(),
            x: data.x,
            y: data.y,
            angle: data.angle,
            speed: data.speed,
            velocity: {
                x: Math.cos(data.angle) * data.speed,
                y: Math.sin(data.angle) * data.speed
            },
            effectType: data.effectType // Store for later use
        };
        
        // Create visual representation
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFFFFF, 0.8);
        graphics.drawRect(-5, -15, 10, 30);
        graphics.endFill();
        projectile.sprite.addChild(graphics);
        projectile.graphics = graphics; // Store reference
        
        // Try to add sprite effect if available
        // Creating projectile visual
        if (data.effectType && this.game.systems.sprites?.loaded) {
            const effect = this.createEffectSprite(data.effectType);
            if (effect) {
                // Successfully created sprite effect
                projectile.sprite.addChild(effect);
                projectile.effect = effect;
                // Hide the basic graphics if we have a sprite
                graphics.visible = false;
            } else {
                // Failed to create sprite effect
            }
        } else if (data.effectType && !this.game.systems.sprites?.loaded) {
            // Store projectile to update later when sprites are loaded
            // Sprites not loaded yet, will retry
        }
        
        // Set initial position and rotation
        projectile.sprite.position.set(data.x, data.y);
        // The sprite is oriented pointing right (0 degrees), so just use the angle directly
        projectile.sprite.rotation = data.angle;
        
        this.container.addChild(projectile.sprite);
        this.projectiles.set(data.id, projectile);
    }

    private createEffectSprite(effectType: string): PIXI.AnimatedSprite | null {
        const spriteManager = this.game.systems.sprites;
        if (!spriteManager || !spriteManager.loaded) return null;
        
        // The effect types should match the sprite names directly
        const effect = spriteManager.createAnimatedSprite(effectType);
        if (effect) {
            effect.play();
            effect.anchor.set(0.5, 0.5);
            effect.scale.set(1.5); // Make projectiles more visible
            effect.animationSpeed = 0.5;
            effect.loop = true; // Keep looping for projectile lifetime
        }
        
        return effect;
    }

    updateProjectile(id: string, x: number, y: number): void {
        const projectile = this.projectiles.get(id);
        if (!projectile) return;
        
        // Update position with interpolation
        const lerpFactor = 0.3;
        projectile.x = projectile.x + (x - projectile.x) * lerpFactor;
        projectile.y = projectile.y + (y - projectile.y) * lerpFactor;
        
        projectile.sprite.position.set(projectile.x, projectile.y);
    }

    destroyProjectile(id: string, reason: string): void {
        const projectile = this.projectiles.get(id);
        if (!projectile) return;
        
        // Could add impact effects based on reason
        if (reason === 'hit') {
            // TODO: Add hit effect
        }
        
        if (projectile.sprite.parent) {
            projectile.sprite.parent.removeChild(projectile.sprite);
        }
        
        this.projectiles.delete(id);
    }

    update(deltaTime: number): void {
        // Update any local animations or effects
        for (const projectile of this.projectiles.values()) {
            if (projectile.effect && projectile.effect.playing) {
                // Effect is auto-playing
            }
            
            // Check if we need to add sprite effects that weren't loaded earlier
            if (!projectile.effect && projectile.effectType && this.game.systems.sprites?.loaded) {
                const effect = this.createEffectSprite(projectile.effectType);
                if (effect) {
                    // Late-loading sprite effect
                    projectile.sprite.addChild(effect);
                    projectile.effect = effect;
                    // Hide the basic graphics
                    if (projectile.graphics) {
                        projectile.graphics.visible = false;
                    }
                }
            }
        }
    }

    clear(): void {
        for (const [id, projectile] of this.projectiles) {
            if (projectile.sprite.parent) {
                projectile.sprite.parent.removeChild(projectile.sprite);
            }
        }
        this.projectiles.clear();
    }
}