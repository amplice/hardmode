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
            // Forehand slash - cone attack
            attackAnimation = this.createConeAttackAnimation(position, facing, hitArea.angle, hitArea.range, 0.3, 0xFF5555);
        } else {
            // Overhead smash - rectangle attack
            attackAnimation = this.createRectangleAttackAnimation(position, facing, hitArea.width, hitArea.length, 0.3, 0x00FFFF);
        }
        
        if (attackAnimation) {
            this.activeAttacks.push(attackAnimation);
            window.game.entityContainer.addChild(attackAnimation.graphics);
            
            // We'll check for hits in the Player class when the appropriate animation frame is reached
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
        graphics.beginFill(color, 0.3);
        graphics.moveTo(0, 0);
        graphics.arc(0, 0, range, startAngle, endAngle);
        graphics.lineTo(0, 0);
        graphics.endFill();
        
        // Draw outline
        graphics.lineStyle(3, color, 0.7);
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
        graphics.beginFill(color, 0.3);
        graphics.lineStyle(3, color, 0.7);
        
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
                
                // Check if monster is within range
                if (distance <= hitArea.range) {
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
                
                // Check if point is inside rectangle (adjusted to match our visualization)
                if (rotX >= -hitArea.width / 2 && rotX <= hitArea.width / 2 && 
                    rotY >= -hitArea.length && rotY <= 0) {
                    // Hit!
                    monster.takeDamage(2); // Smash attack does more damage
                }
            }
        }
    }
}