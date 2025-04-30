import * as PIXI from 'pixi.js';

export class CombatSystem {
    constructor(app) {
        this.app = app;
        this.activeAttacks = [];
        
        // Effect configuration data
        this.effectConfigs = {
            // Slash effect configuration
            slash_effect: {
                scale: 1.5,
                offsetDistance: 65,
                rotationOffset: -Math.PI / 4, // -45 degrees base rotation
                animationSpeed: 0.6,
                followDuration: 0 // 0 means the effect doesn't follow the player
            },
            // Strike windup effect configuration
            strike_windup: {
                scale: 1.5,
                offsetDistance: 35, // Centered on player
                rotationOffset: 0,
                animationSpeed: 0.8,
                followDuration: 0
            },
            // Strike cast effect configuration
            strike_cast: {
                scale: 1,
                offsetDistance: 70, // Further out from player
                rotationOffset: Math.PI / 2,
                animationSpeed: 0.4,
                followDuration: 0
            }
        };
        
        // Attack configuration data
// Attack configuration data
this.attackConfigs = {
    primary: {
        name: "Slash Attack",
        damage: 1,
        windupTime: 0,       // No windup for primary
        hitTime: 133,        // ~8 frames at 60fps (in ms)
        recoveryTime: 200,   // Recovery time after hit (in ms)
        cooldown: 500,       // Total cooldown before next attack (in ms)
        hitboxType: 'cone',
        hitboxParams: {
            range: 70,
            angle: 75        // 75 degree cone
        },
        hitboxVisual: {
            color: 0xFF5555,
            fillAlpha: 0.01, // Fill transparency
            lineAlpha: 0.0,  // Outline transparency
            lineWidth: 3,    // Outline width
            duration: 0.3    // How long the visualization lasts (seconds)
        },
        effectSequence: [
            { type: 'slash_effect', timing: 0 }  // Play immediately
        ]
    },
    secondary: {
        name: "Smash Attack",
        damage: 2,
        windupTime: 250,     // ~15 frames
        hitTime: 500,        // ~30 frames
        recoveryTime: 300,
        cooldown: 800,
        hitboxType: 'rectangle',
        hitboxParams: {
            width: 80,
            length: 110
        },
        hitboxVisual: {
            color: 0x00FFFF,
            fillAlpha: 0.0, // More visible fill for rectangle
            lineAlpha: 0.0,
            lineWidth: 3,
            duration: 0.3
        },
        effectSequence: [
            { type: 'strike_windup', timing: 0 },      // Play immediately
            { type: 'strike_cast', timing: 500 }       // Play after windupTime
        ]
    }
};
    }
    
    update(deltaTime) {
        // Update and remove finished attack animations
        for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
            const attack = this.activeAttacks[i];
            attack.lifetime -= deltaTime;
            
            if (attack.lifetime <= 0) {
                window.game.entityContainer.removeChild(attack.graphics);
                this.activeAttacks.splice(i, 1);
            }
        }
    }
    
    executeAttack(entity, attackType) {
        // Get attack config
        const attackConfig = this.attackConfigs[attackType];
        if (!attackConfig) {
            console.error(`Attack type ${attackType} not configured`);
            return false;
        }
        
        // Start attack sequence
        console.log(`${entity.constructor.name} executing ${attackConfig.name}`);
        
        // Store original position and facing for timing functions
        const position = { x: entity.position.x, y: entity.position.y };
        const facing = entity.facing;
        
        // Play first effects immediately
        this.playEffectSequence(entity, attackConfig, 0);
        
// Create hitbox visualization based on attack type
const hitboxAnimation = this.createHitboxVisualization(
    position, 
    facing, 
    attackConfig.hitboxType, 
    attackConfig.hitboxParams,
    attackConfig.hitboxVisual
);
        
        if (hitboxAnimation) {
            this.activeAttacks.push(hitboxAnimation);
            window.game.entityContainer.addChild(hitboxAnimation.graphics);
        }
        
        // Play effects at their specified timing
        attackConfig.effectSequence.forEach(effect => {
            if (effect.timing > 0) {
                setTimeout(() => {
                    // Check if entity is still in attack state
                    if (entity.isAttacking && entity.currentAttackType === attackType) {
                        // For strike_cast, we need to calculate a new position in front of entity
                        if (effect.type === 'strike_cast') {
                            const effectConfig = this.effectConfigs[effect.type];
                            const aoePosition = this.calculateEffectPosition(
                                entity.position, 
                                entity.facing, 
                                effectConfig.offsetDistance
                            );
                            this.createEffect(effect.type, aoePosition, entity.facing, null, true);
                        } else {
                            this.createEffect(effect.type, entity.position, entity.facing, entity);
                        }
                    }
                }, effect.timing);
            }
        });
        
        // Schedule hit detection
        setTimeout(() => {
            if (entity.isAttacking && entity.currentAttackType === attackType) {
                console.log(`${attackConfig.name} hit effect triggered`);
                
                // Apply hit effect
                this.applyHitEffect(entity, attackType, attackConfig.damage);
            }
        }, attackConfig.hitTime);
        
        // Return attack cooldown time to entity
        return attackConfig.cooldown;
    }
    
    playEffectSequence(entity, attackConfig, startTime) {
        // Play any effects scheduled at the given time
        attackConfig.effectSequence.forEach(effect => {
            if (effect.timing === startTime) {
                this.createEffect(effect.type, entity.position, entity.facing, entity);
            }
        });
    }
    
    applyHitEffect(attacker, attackType, damage) {
        const monsters = window.game.systems.monsters.monsters;
        this.checkAttackHits(attacker, attacker.position, attackType, monsters, damage);
    }
    
    createHitboxVisualization(position, facing, hitboxType, params, visualConfig) {
        if (hitboxType === 'cone') {
            return this.createConeAttackAnimation(
                position, 
                facing, 
                params.angle, 
                params.range, 
                visualConfig.duration,
                visualConfig.color,
                visualConfig.fillAlpha,
                visualConfig.lineAlpha,
                visualConfig.lineWidth
            );
        } else if (hitboxType === 'rectangle') {
            return this.createRectangleAttackAnimation(
                position, 
                facing, 
                params.width, 
                params.length, 
                visualConfig.duration,
                visualConfig.color,
                visualConfig.fillAlpha,
                visualConfig.lineAlpha,
                visualConfig.lineWidth
            );
        }
        return null;
    }
    
    createEffect(effectType, position, facing, attacker = null, useRawPosition = false) {
        const spriteManager = window.game.systems.sprites;
        const config = this.effectConfigs[effectType];
        
        if (!config) {
            console.error(`Effect configuration not found for ${effectType}`);
            return null;
        }
        
        // Create the animated sprite for the effect
        const sprite = spriteManager.createAnimatedSprite(effectType);
        
        if (!sprite) {
            console.error(`Failed to create effect ${effectType}`);
            return null;
        }
        
        // Calculate position based on facing direction (unless we're using raw position)
        let finalPosition;
        if (useRawPosition) {
            finalPosition = { ...position };
        } else {
            finalPosition = this.calculateEffectPosition(position, facing, config.offsetDistance);
        }
        
        // Set sprite properties
        sprite.position.set(finalPosition.x, finalPosition.y);
        sprite.loop = false;
        sprite.animationSpeed = config.animationSpeed;
        
        // Set the scale of the effect
        sprite.scale.set(config.scale, config.scale);
        
        // Set rotation based on facing direction and config rotation offset
        sprite.rotation = this.calculateEffectRotation(facing, config.rotationOffset);
        
        sprite.play();
        
        // Add to entity container
        window.game.entityContainer.addChild(sprite);
        
        // Set up the follow behavior if needed
        if (config.followDuration > 0 && attacker) {
            this.setupEffectFollowBehavior(sprite, attacker, config.followDuration);
        }
        
        // Remove sprite when animation completes
        sprite.onComplete = () => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
        };
        
        return sprite;
    }
    
    setupEffectFollowBehavior(sprite, target, duration) {
        let elapsedTime = 0;
        const initialPosition = { x: sprite.position.x, y: sprite.position.y };
        const initialOffset = {
            x: initialPosition.x - target.position.x,
            y: initialPosition.y - target.position.y
        };
        
        const updatePosition = (delta) => {
            elapsedTime += delta;
            
            if (elapsedTime < duration) {
                sprite.position.set(
                    target.position.x + initialOffset.x,
                    target.position.y + initialOffset.y
                );
                requestAnimationFrame(() => updatePosition(1/60));
            }
        };
        
        requestAnimationFrame(() => updatePosition(1/60));
    }
    
    calculateEffectPosition(basePosition, facing, distance) {
        if (distance === 0) {
            return { ...basePosition };
        }
        
        let offsetX = 0;
        let offsetY = 0;
        
        // Calculate offset based on facing direction
        switch(facing) {
            case 'right': offsetX = distance; break;
            case 'down-right': offsetX = distance * 0.7; offsetY = distance * 0.7; break;
            case 'down': offsetY = distance; break;
            case 'down-left': offsetX = -distance * 0.7; offsetY = distance * 0.7; break;
            case 'left': offsetX = -distance; break;
            case 'up-left': offsetX = -distance * 0.7; offsetY = -distance * 0.7; break;
            case 'up': offsetY = -distance; break;
            case 'up-right': offsetX = distance * 0.7; offsetY = -distance * 0.7; break;
        }
        
        return {
            x: basePosition.x + offsetX,
            y: basePosition.y + offsetY
        };
    }
    
    calculateEffectRotation(facing, baseRotation) {
        // Convert facing direction to radians
        let rotation = baseRotation;
        
        switch(facing) {
            case 'right': rotation += 0; break;
            case 'down-right': rotation += Math.PI / 4; break;
            case 'down': rotation += Math.PI / 2; break;
            case 'down-left': rotation += 3 * Math.PI / 4; break;
            case 'left': rotation += Math.PI; break;
            case 'up-left': rotation += 5 * Math.PI / 4; break;
            case 'up': rotation += 3 * Math.PI / 2; break;
            case 'up-right': rotation += 7 * Math.PI / 4; break;
        }
        
        return rotation;
    }
    
    createConeAttackAnimation(position, facing, arcAngle, range, duration, color, fillAlpha = 0.01, lineAlpha = 0.0, lineWidth = 3) {
        const graphics = new PIXI.Graphics();
        
        // Convert direction to radians - use the center of the arc as the facing direction
        let facingAngle = 0;
        switch(facing) {
            case 'right': facingAngle = 0; break;
            case 'down-right': facingAngle = Math.PI / 4; break; // 45 degrees
            case 'down': facingAngle = Math.PI / 2; break; // 90 degrees
            case 'down-left': facingAngle = 3 * Math.PI / 4; break; // 135 degrees
            case 'left': facingAngle = Math.PI; break; // 180 degrees
            case 'up-left': facingAngle = 5 * Math.PI / 4; break; // 225 degrees
            case 'up': facingAngle = 3 * Math.PI / 2; break; // 270 degrees
            case 'up-right': facingAngle = 7 * Math.PI / 4; break; // 315 degrees
        }
        
        // Calculate start and end angles for the arc
        const halfArcAngle = (arcAngle / 2) * (Math.PI / 180);
        const startAngle = facingAngle - halfArcAngle;
        const endAngle = facingAngle + halfArcAngle;
        
        graphics.position.set(position.x, position.y);
        
        // Draw the attack arc - semi-transparent fill
        graphics.beginFill(color, fillAlpha);
        graphics.moveTo(0, 0);
        graphics.arc(0, 0, range, startAngle, endAngle);
        graphics.lineTo(0, 0);
        graphics.endFill();
        
        // Draw outline
        graphics.lineStyle(lineWidth, color, lineAlpha);
        graphics.arc(0, 0, range, startAngle, endAngle);
        graphics.moveTo(0, 0);
        graphics.lineTo(Math.cos(startAngle) * range, Math.sin(startAngle) * range);
        graphics.moveTo(0, 0);
        graphics.lineTo(Math.cos(endAngle) * range, Math.sin(endAngle) * range);
        
        return {
            graphics,
            lifetime: duration,
            position: { ...position },
            range,
            arcAngle,
            type: 'cone'
        };
    }
    
    createRectangleAttackAnimation(position, facing, width, length, duration, color, fillAlpha = 0.05, lineAlpha = 0.0, lineWidth = 3) {
        const graphics = new PIXI.Graphics();
        
        graphics.position.set(position.x, position.y);
        
        // Draw a rectangle in front of the player
        graphics.beginFill(color, fillAlpha);
        graphics.lineStyle(lineWidth, color, lineAlpha);
        
        // Always draw the rectangle pointing upward first (along negative Y axis)
        // We'll rotate it to match the facing direction
        graphics.drawRect(-width / 2, -length, width, length);
        
        // Apply rotation based on facing direction
        switch(facing) {
            case 'right':
                graphics.rotation = Math.PI / 2; // 90 degrees clockwise
                break;
            case 'down-right':
                graphics.rotation = Math.PI / 4 + Math.PI / 2; // 135 degrees
                break;
            case 'down':
                graphics.rotation = Math.PI; // 180 degrees
                break;
            case 'down-left':
                graphics.rotation = 3 * Math.PI / 4 + Math.PI / 2; // 225 degrees
                break;
            case 'left':
                graphics.rotation = Math.PI + Math.PI / 2; // 270 degrees
                break;
            case 'up-left':
                graphics.rotation = 5 * Math.PI / 4 + Math.PI / 2; // 315 degrees
                break;
            case 'up':
                graphics.rotation = 0; // 0 degrees
                break;
            case 'up-right':
                graphics.rotation = 7 * Math.PI / 4 + Math.PI / 2; // 45 degrees
                break;
        }
        
        graphics.endFill();
        
        return {
            graphics,
            lifetime: duration,
            position: { ...position },
            width,
            length,
            facing,
            type: 'rectangle'
        };
    }
    
    checkAttackHits(attacker, attackPosition, attackType, monsters, damage = 1) {
        const attackConfig = this.attackConfigs[attackType];
        if (!attackConfig) return;
        
        const hitParams = attackConfig.hitboxParams;
        const facing = attacker.facing;
        
        if (attackConfig.hitboxType === 'cone') {
            // Cone attack (primary attack)
            for (const monster of monsters) {
                if (!monster.alive) continue;
                
                const dx = monster.position.x - attackPosition.x;
                const dy = monster.position.y - attackPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Adjust check by subtracting monster collision radius
                // This makes attacks hit when they reach the edge of the monster
                const adjustedDistance = distance - (monster.collisionRadius || 0);
                
                // Check if monster is within range
                if (adjustedDistance <= hitParams.range) {
                    // Calculate angle to monster
                    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    if (angle < 0) angle += 360; // Convert to 0-360 range
                    
                    // Convert facing direction to angle
                    let facingAngle = 0;
                    switch(facing) {
                        case 'right': facingAngle = 0; break;
                        case 'down-right': facingAngle = 45; break;
                        case 'down': facingAngle = 90; break;
                        case 'down-left': facingAngle = 135; break;
                        case 'left': facingAngle = 180; break;
                        case 'up-left': facingAngle = 225; break;
                        case 'up': facingAngle = 270; break;
                        case 'up-right': facingAngle = 315; break;
                    }
                    
                    // Calculate angle difference
                    let angleDiff = Math.abs(angle - facingAngle);
                    if (angleDiff > 180) angleDiff = 360 - angleDiff;
                    
                    // Check if monster is within attack cone
                    if (angleDiff <= hitParams.angle / 2) {
                        // Hit!
                        monster.takeDamage(damage);
                    }
                }
            }
        } else if (attackConfig.hitboxType === 'rectangle') {
            // Rectangle attack (secondary attack)
            for (const monster of monsters) {
                if (!monster.alive) continue;
                
                // Convert monster position to relative coordinates
                const dx = monster.position.x - attackPosition.x;
                const dy = monster.position.y - attackPosition.y;
                
                // Define rotation based on facing direction - must match visual representation
                let facingRadians = 0;
                switch(facing) {
                    case 'right': facingRadians = Math.PI / 2; break; // 90 degrees
                    case 'down-right': facingRadians = Math.PI / 4 + Math.PI / 2; break; // 135 degrees
                    case 'down': facingRadians = Math.PI; break; // 180 degrees
                    case 'down-left': facingRadians = 3 * Math.PI / 4 + Math.PI / 2; break; // 225 degrees
                    case 'left': facingRadians = Math.PI + Math.PI / 2; break; // 270 degrees
                    case 'up-left': facingRadians = 5 * Math.PI / 4 + Math.PI / 2; break; // 315 degrees
                    case 'up': facingRadians = 0; break; // 0 degrees
                    case 'up-right': facingRadians = 7 * Math.PI / 4 + Math.PI / 2; break; // 45 degrees
                }
                
                // Rotate point to align with rectangle
                const rotX = dx * Math.cos(-facingRadians) - dy * Math.sin(-facingRadians);
                const rotY = dx * Math.sin(-facingRadians) + dy * Math.cos(-facingRadians);
                
                // Get the monster's collision radius (or 0 if not defined)
                const monsterRadius = monster.collisionRadius || 0;
                
                // Check if point is inside rectangle (adjusted to match our visualization)
                // Add collision radius to the rectangle size check
                if (rotX >= -hitParams.width / 2 - monsterRadius && 
                    rotX <= hitParams.width / 2 + monsterRadius && 
                    rotY >= -hitParams.length - monsterRadius && 
                    rotY <= 0 + monsterRadius) {
                    // Hit!
                    monster.takeDamage(damage);
                }
            }
        }
    }
}