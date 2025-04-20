import * as PIXI from 'pixi.js';

export class CombatSystem {
    constructor(app) {
        this.app = app;
        this.activeAttacks = [];
        this.container = new PIXI.Container();
        this.app.stage.addChild(this.container);
    }
    
    update(deltaTime) {
        // Update and remove finished attack animations
        for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
            const attack = this.activeAttacks[i];
            attack.lifetime -= deltaTime;
            
            if (attack.lifetime <= 0) {
                this.container.removeChild(attack.graphics);
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
            this.container.addChild(attackAnimation.graphics);
        }
    }
    
    createSlashAnimation(position, facing, arcAngle, range, duration, color) {
        const graphics = new PIXI.Graphics();
        
        // Calculate the arc direction based on facing
        let startAngle = 0;
        switch(facing) {
            case 'right': startAngle = -arcAngle / 2 * (Math.PI / 180); break;
            case 'down': startAngle = 90 - arcAngle / 2 * (Math.PI / 180); break;
            case 'left': startAngle = 180 - arcAngle / 2 * (Math.PI / 180); break;
            case 'up': startAngle = 270 - arcAngle / 2 * (Math.PI / 180); break;
            case 'down-right': startAngle = 45 - arcAngle / 2 * (Math.PI / 180); break;
            case 'down-left': startAngle = 135 - arcAngle / 2 * (Math.PI / 180); break;
            case 'up-left': startAngle = 225 - arcAngle / 2 * (Math.PI / 180); break;
            case 'up-right': startAngle = 315 - arcAngle / 2 * (Math.PI / 180); break;
        }
        
        const endAngle = startAngle + arcAngle * (Math.PI / 180);
        
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