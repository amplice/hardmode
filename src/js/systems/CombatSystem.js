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
        const characterClass = attacker.characterClass;
        const position = { x: attacker.position.x, y: attacker.position.y };
        const facing = attacker.facing;
        
        let attackAnimation;
        
        if (characterClass === 'bladedancer') {
            if (attackType === 'primary') {
                // Horizontal Slash - 120° arc, medium range (150px)
                attackAnimation = this.createSlashAnimation(position, facing, 120, 150, 0.3, 0xFF5555);
            } else if (attackType === 'secondary') {
                // Thrust - 30° narrow attack, long range (250px)
                attackAnimation = this.createSlashAnimation(position, facing, 30, 250, 0.2, 0x00FFFF);
            }
        }
        
        if (attackAnimation) {
            this.activeAttacks.push(attackAnimation);
            window.game.entityContainer.addChild(attackAnimation.graphics);
        }
    }
    
    createSlashAnimation(position, facing, arcAngle, range, duration, color) {
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
        
        // Draw the attack arc
        graphics.lineStyle(10, color, 0.7);
        graphics.arc(0, 0, range, startAngle, endAngle);
        
        return {
            graphics,
            lifetime: duration,
            position: { ...position },
            range,
            arcAngle
        };
    }
}