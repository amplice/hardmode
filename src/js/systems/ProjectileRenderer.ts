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
import { PLAYER_CONFIG } from '../config/GameConfig.js';

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
    targetX: number;
    targetY: number;
    lastServerUpdate: number;
    smoothingSpeed: number;
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
            effectType: data.effectType,
            targetX: data.x,
            targetY: data.y,
            lastServerUpdate: performance.now(),
            smoothingSpeed: 18
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
            
            // Get effect configuration if available
            const effectConfig = (PLAYER_CONFIG.effects as any)[effectType];
            if (effectConfig) {
                // Apply scale with flip support
                let scaleX = effectConfig.scale || 1.5;
                let scaleY = effectConfig.scale || 1.5;
                if (effectConfig.flipX) scaleX = -scaleX;
                if (effectConfig.flipY) scaleY = -scaleY;
                effect.scale.set(scaleX, scaleY);
                
                // Apply rotation offset if specified
                if (effectConfig.rotationOffset) {
                    effect.rotation = effectConfig.rotationOffset;
                }
                
                // Apply animation speed
                effect.animationSpeed = effectConfig.animationSpeed || 0.5;
            } else {
                // Fallback to defaults if no config found
                effect.scale.set(1.5, 1.5);
                effect.animationSpeed = 0.5;
            }
            
            effect.loop = true; // Keep looping for projectile lifetime
        }
        
        return effect;
    }

    updateProjectile(id: string, x: number, y: number): void {
        const projectile = this.projectiles.get(id);
        if (!projectile) return;
        
        const now = performance.now();
        const deltaSinceLast = (now - projectile.lastServerUpdate) / 1000;
        if (deltaSinceLast > 0) {
            projectile.velocity.x = (x - projectile.targetX) / deltaSinceLast;
            projectile.velocity.y = (y - projectile.targetY) / deltaSinceLast;
        }

        projectile.targetX = x;
        projectile.targetY = y;
        projectile.lastServerUpdate = now;
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

            // Smoothly interpolate towards the latest server position
            const targetX = projectile.targetX;
            const targetY = projectile.targetY;
            const diffX = targetX - projectile.x;
            const diffY = targetY - projectile.y;
            const distanceSq = diffX * diffX + diffY * diffY;

            const smoothing = projectile.smoothingSpeed;
            const lerpFactor = deltaTime > 0 ? Math.min(1, smoothing * deltaTime) : smoothing;

            if (distanceSq > 160000) { // 400px squared, snap to avoid trailing far behind
                projectile.x = targetX;
                projectile.y = targetY;
            } else {
                projectile.x += diffX * lerpFactor;
                projectile.y += diffY * lerpFactor;
            }

            // Apply a tiny extrapolation using last known velocity to keep motion fluid
            if (deltaTime > 0 && distanceSq < 100) {
                projectile.x += projectile.velocity.x * deltaTime * 0.25;
                projectile.y += projectile.velocity.y * deltaTime * 0.25;
            }

            projectile.sprite.position.set(projectile.x, projectile.y);
            if (projectile.velocity.x !== 0 || projectile.velocity.y !== 0) {
                projectile.sprite.rotation = Math.atan2(projectile.velocity.y, projectile.velocity.x);
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
