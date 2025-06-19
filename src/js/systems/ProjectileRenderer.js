import * as PIXI from 'pixi.js';

export class ProjectileRenderer {
    constructor(game) {
        this.game = game;
        this.projectiles = new Map();
        this.container = new PIXI.Container();
        this.container.zIndex = 100; // Above entities
        game.entityContainer.addChild(this.container);
    }

    createProjectile(data) {
        // Don't recreate if already exists
        if (this.projectiles.has(data.id)) return;
        
        const projectile = {
            id: data.id,
            sprite: new PIXI.Container(),
            x: data.x,
            y: data.y,
            angle: data.angle,
            speed: data.speed,
            velocity: {
                x: Math.cos(data.angle) * data.speed,
                y: Math.sin(data.angle) * data.speed
            }
        };
        
        // Create visual representation
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFFFFF, 0.8);
        graphics.drawRect(-5, -15, 10, 30);
        graphics.endFill();
        projectile.sprite.addChild(graphics);
        
        // Try to add sprite effect if available
        if (data.effectType && this.game.systems.sprites?.loaded) {
            const effect = this.createEffectSprite(data.effectType);
            if (effect) {
                projectile.sprite.addChild(effect);
                projectile.effect = effect;
                // Hide the basic graphics if we have a sprite
                graphics.visible = false;
            }
        }
        
        // Set initial position and rotation
        projectile.sprite.position.set(data.x, data.y);
        projectile.sprite.rotation = data.angle + Math.PI / 2;
        
        this.container.addChild(projectile.sprite);
        this.projectiles.set(data.id, projectile);
    }

    createEffectSprite(effectType) {
        const spriteManager = this.game.systems.sprites;
        if (!spriteManager || !spriteManager.loaded) return null;
        
        // Map effect types to sprite names
        const effectMap = {
            'bow_shot_effect': '579',
            'wildarcher_shot_effect': '579' // Use same sprite for now
        };
        
        const spriteName = effectMap[effectType];
        if (!spriteName) return null;
        
        const effect = spriteManager.createAnimatedSprite(spriteName);
        if (effect) {
            effect.play();
            effect.anchor.set(0.5, 0.5);
            effect.scale.set(1.0);
        }
        
        return effect;
    }

    updateProjectile(id, x, y) {
        const projectile = this.projectiles.get(id);
        if (!projectile) return;
        
        // Update position with interpolation
        const lerpFactor = 0.3;
        projectile.x = projectile.x + (x - projectile.x) * lerpFactor;
        projectile.y = projectile.y + (y - projectile.y) * lerpFactor;
        
        projectile.sprite.position.set(projectile.x, projectile.y);
    }

    destroyProjectile(id, reason) {
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

    update(deltaTime) {
        // Update any local animations or effects
        for (const projectile of this.projectiles.values()) {
            if (projectile.effect && projectile.effect.playing) {
                // Effect is auto-playing
            }
        }
    }

    clear() {
        for (const [id, projectile] of this.projectiles) {
            if (projectile.sprite.parent) {
                projectile.sprite.parent.removeChild(projectile.sprite);
            }
        }
        this.projectiles.clear();
    }
}