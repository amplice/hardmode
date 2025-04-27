import * as PIXI from 'pixi.js';

export class CombatSystem {
    constructor(app) {
        this.app = app;
        this.activeAttacks = [];
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
    
    createAttackAnimation(attacker, attackType) {
        const position = { x: attacker.position.x, y: attacker.position.y };
        const facing = attacker.facing;
        
        // Get sprite manager to determine hit area
        const spriteManager = window.game.systems.sprites;
        const hitArea = spriteManager.getAttackHitArea(facing, attackType);
        
        // Create visual indicator based on attack type
        let attackAnimation;
        
        if (attackType === 'primary') {
            // Create slash effect animation
            this.createSlashEffect(position, facing);
            
            // Also create the cone attack visualization for hit detection
            attackAnimation = this.createConeAttackAnimation(position, facing, hitArea.angle, hitArea.range, 0.3, 0xFF5555);
        } else {
            // For attack2 (secondary)
            // Create windup effect first
            this.createStrikeWindupEffect(position);
            
            // Create the rectangle attack visualization for hit detection
            attackAnimation = this.createRectangleAttackAnimation(position, facing, hitArea.width, hitArea.length, 0.3, 0x00FFFF);
            
            // Calculate where the cast effect should appear
            const aoeCenter = this.calculateAoECenter(position, facing, hitArea.length * 0.5);
            
            // Schedule the cast effect to play after a delay
            setTimeout(() => {
                this.createStrikeCastEffect(aoeCenter, facing);
            }, 200); // Adjust timing as needed
        }
        
        if (attackAnimation) {
            this.activeAttacks.push(attackAnimation);
            window.game.entityContainer.addChild(attackAnimation.graphics);
        }
    }
    
    createConeAttackAnimation(position, facing, arcAngle, range, duration, color) {
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
        graphics.beginFill(color, 0.01);
        graphics.moveTo(0, 0);
        graphics.arc(0, 0, range, startAngle, endAngle);
        graphics.lineTo(0, 0);
        graphics.endFill();
        
        // Draw outline
        graphics.lineStyle(3, color, 0.0);
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
    
    createRectangleAttackAnimation(position, facing, width, length, duration, color) {
        const graphics = new PIXI.Graphics();
        
        graphics.position.set(position.x, position.y);
        
        // Draw a rectangle in front of the player
        graphics.beginFill(color, 0.05);
        graphics.lineStyle(3, color, 0.0);
        
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

    // Add this new method
    createSlashEffect(position, facing) {
        const spriteManager = window.game.systems.sprites;
        
        // Create the animated sprite for the effect
        const sprite = spriteManager.createAnimatedSprite('slash_effect');
        
        if (!sprite) {
            console.error('Failed to create slash effect');
            return null;
        }
        
        // Position the effect in front of the player based on facing direction
        const offsetDistance = 65; // Distance from player center
        let offsetX = 0;
        let offsetY = 0;
        
        // Calculate offset based on facing direction
        switch(facing) {
            case 'right': offsetX = offsetDistance; break;
            case 'down-right': offsetX = offsetDistance * 0.7; offsetY = offsetDistance * 0.7; break;
            case 'down': offsetY = offsetDistance; break;
            case 'down-left': offsetX = -offsetDistance * 0.7; offsetY = offsetDistance * 0.7; break;
            case 'left': offsetX = -offsetDistance; break;
            case 'up-left': offsetX = -offsetDistance * 0.7; offsetY = -offsetDistance * 0.7; break;
            case 'up': offsetY = -offsetDistance; break;
            case 'up-right': offsetX = offsetDistance * 0.7; offsetY = -offsetDistance * 0.7; break;
        }
        
        // Set sprite properties
        sprite.position.set(position.x + offsetX, position.y + offsetY);
        sprite.loop = false;
        sprite.animationSpeed = 0.5;
        
        // Set the scale of the effect (adjust these values to change the size)
        const effectScale = 1.5; // Increase this value to make the effect larger
        sprite.scale.set(effectScale, effectScale);
        
        // Set rotation based on facing direction (with 90 degree offset)
        let rotation = -Math.PI / 4;
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
        sprite.rotation = rotation;
        
        sprite.play();
        
        // Add to entity container
        window.game.entityContainer.addChild(sprite);
        
        // Remove sprite when animation completes
        sprite.onComplete = () => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
        };
        
        // We won't track this in activeAttacks since it handles its own cleanup
        return null;
    }

    createStrikeWindupEffect(position) {
        const spriteManager = window.game.systems.sprites;
        
        // Create the animated sprite for the windup effect
        const sprite = spriteManager.createAnimatedSprite('strike_windup');
        
        if (!sprite) {
            console.error('Failed to create strike windup effect');
            return null;
        }
        
        // Center on the player
        sprite.position.set(position.x, position.y);
        sprite.loop = false;
        sprite.animationSpeed = 0.8;
        
        // Scale as needed
        const effectScale = 1; // Adjust as needed
        sprite.scale.set(effectScale, effectScale);
        
        sprite.play();
        
        // Add to entity container
        window.game.entityContainer.addChild(sprite);
        
        // Remove sprite when animation completes
        sprite.onComplete = () => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
        };
    }
    
    createStrikeCastEffect(position, facing) {
        const spriteManager = window.game.systems.sprites;
        
        // Create the animated sprite for the cast effect
        const sprite = spriteManager.createAnimatedSprite('strike_cast');
        
        if (!sprite) {
            console.error('Failed to create strike cast effect');
            return null;
        }
        
        // Position at the center of the AoE
        sprite.position.set(position.x, position.y);
        sprite.loop = false;
        sprite.animationSpeed = 0.4;
        
        // Scale as needed
        const effectScale = 1; // Adjust as needed
        sprite.scale.set(effectScale, effectScale);
        
        // Set rotation based on facing direction
        let rotation =  Math.PI / 2;
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
        sprite.rotation = rotation;
        
        sprite.play();
        
        // Add to entity container
        window.game.entityContainer.addChild(sprite);
        
        // Remove sprite when animation completes
        sprite.onComplete = () => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
        };
    }
    
    // Helper method to calculate AoE center point
    calculateAoECenter(playerPosition, facing, distance) {
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
            x: playerPosition.x + offsetX,
            y: playerPosition.y + offsetY
        };
    }
    
    checkAttackHits(attacker, attackPosition, attackType, monsters) {
        // Get sprite manager to determine hit area
        const spriteManager = window.game.systems.sprites;
        const hitArea = spriteManager.getAttackHitArea(attacker.facing, attackType);
        const facing = attacker.facing;
        
        // Different hit detection based on attack type
        if (attackType === 'primary') {
            // Cone attack (Attack 1)
            for (const monster of monsters) {
                if (!monster.alive) continue;
                
                const dx = monster.position.x - attackPosition.x;
                const dy = monster.position.y - attackPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Adjust check by subtracting monster collision radius
                // This makes attacks hit when they reach the edge of the monster
                const adjustedDistance = distance - (monster.collisionRadius || 0);
                
                // Check if monster is within range
                if (adjustedDistance <= hitArea.range) {
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
                    if (angleDiff <= hitArea.angle / 2) {
                        // Hit!
                        monster.takeDamage(1);
                    }
                }
            }
        } else if (attackType === 'secondary') {
            // Rectangle attack (Attack 2)
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
                if (rotX >= -hitArea.width / 2 - monsterRadius && 
                    rotX <= hitArea.width / 2 + monsterRadius && 
                    rotY >= -hitArea.length - monsterRadius && 
                    rotY <= 0 + monsterRadius) {
                    // Hit!
                    monster.takeDamage(2); // Smash attack does more damage
                }
            }
        }
    }
}