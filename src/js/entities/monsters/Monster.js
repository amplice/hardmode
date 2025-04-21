import * as PIXI from 'pixi.js';

export class Monster {
    constructor(options) {
        this.position = { x: options.x, y: options.y };
        this.velocity = { x: 0, y: 0 };
        this.facing = 'down';
        this.type = options.type || 'slime';
        this.hitPoints = this.getMonsterHitPoints();
        this.moveSpeed = this.getMonsterMoveSpeed();
        this.attackRange = this.getMonsterAttackRange();
        this.attackDamage = 1;
        this.attackCooldown = 0;
        this.aggroRange = 250;
        this.target = null;
        this.alive = true;
        
        // Attack state
        this.isAttacking = false;
        this.attackWindup = 0;
        this.attackDuration = 0;
        this.attackRecovery = 0;
        
        // Create monster sprite
        this.sprite = new PIXI.Container();
        this.baseSprite = new PIXI.Graphics();
        this.attackIndicator = new PIXI.Graphics();
        
        this.drawMonster();
        this.sprite.addChild(this.baseSprite);
        this.sprite.addChild(this.attackIndicator);
        
        this.sprite.position.set(this.position.x, this.position.y);
    }
    
    getMonsterHitPoints() {
        switch(this.type) {
            case 'slime': return 1;
            case 'goblin': return 1;
            case 'skeleton': return 2;
            default: return 1;
        }
    }
    
    getMonsterMoveSpeed() {
        switch(this.type) {
            case 'slime': return 1.5;
            case 'goblin': return 3;
            case 'skeleton': return 2;
            default: return 2;
        }
    }
    
    getMonsterAttackRange() {
        switch(this.type) {
            case 'slime': return 80;
            case 'goblin': return 100;
            case 'skeleton': return 150;
            default: return 100;
        }
    }
    
    getAttackDetails() {
        switch(this.type) {
            case 'slime':
                return {
                    windup: 0.8, // Seconds
                    duration: 0.3,
                    recovery: 0.5,
                    cooldown: 2.0,
                    pattern: 'circle',
                    color: 0x00FF00,
                    range: this.attackRange
                };
            case 'goblin':
                return {
                    windup: 0.6,
                    duration: 0.3,
                    recovery: 0.4,
                    cooldown: 1.5,
                    pattern: 'cone',
                    color: 0x8B4513,
                    range: this.attackRange
                };
            case 'skeleton':
                return {
                    windup: 1.0,
                    duration: 0.4,
                    recovery: 0.6,
                    cooldown: 2.5,
                    pattern: 'line',
                    color: 0xEEEEEE,
                    range: this.attackRange
                };
            default:
                return {
                    windup: 0.5,
                    duration: 0.3,
                    recovery: 0.5,
                    cooldown: 2.0,
                    pattern: 'circle',
                    color: 0xFF00FF,
                    range: this.attackRange
                };
        }
    }
    
    drawMonster() {
        this.baseSprite.clear();
        
        // Different colors for monster types
        let color;
        switch(this.type) {
            case 'slime': color = 0x00FF00; break; // Green
            case 'goblin': color = 0x8B4513; break; // Brown
            case 'skeleton': color = 0xEEEEEE; break; // White
            default: color = 0xFF00FF; // Magenta for unknown types
        }
        
        // Draw monster body
        this.baseSprite.beginFill(color);
        
        if (this.type === 'slime') {
            // Slime shape (rounded rectangle)
            this.baseSprite.drawRoundedRect(-15, -10, 30, 25, 10);
        } else if (this.type === 'goblin') {
            // Goblin shape (triangle)
            this.baseSprite.drawPolygon([
                -15, 15,
                15, 15,
                0, -15
            ]);
        } else if (this.type === 'skeleton') {
            // Skeleton shape (diamond)
            this.baseSprite.drawPolygon([
                0, -15,
                15, 0,
                0, 15,
                -15, 0
            ]);
        } else {
            // Default shape (circle)
            this.baseSprite.drawCircle(0, 0, 15);
        }
        
        this.baseSprite.endFill();
        
        // Draw facing indicator (eyes)
        this.baseSprite.beginFill(0x000000);
        
        switch(this.type) {
            case 'slime':
                // Two small eyes
                this.baseSprite.drawCircle(-7, -5, 3);
                this.baseSprite.drawCircle(7, -5, 3);
                break;
            case 'goblin':
                // Single eye
                this.baseSprite.drawCircle(0, 0, 5);
                break;
            case 'skeleton':
                // Two eye sockets
                this.baseSprite.drawCircle(-5, -5, 3);
                this.baseSprite.drawCircle(5, -5, 3);
                break;
            default:
                // Default eyes
                this.baseSprite.drawCircle(0, 0, 5);
        }
        
        this.baseSprite.endFill();
        
        // Clear attack indicator initially
        this.attackIndicator.clear();
    }
    
    update(deltaTime, player, world) {
        if (!this.alive) return;
        
        // Update attack state if attacking
        if (this.isAttacking) {
            if (this.attackWindup > 0) {
                // In windup phase
                this.attackWindup -= deltaTime;
                this.updateAttackIndicator(true); // Show warning indicator
                
                if (this.attackWindup <= 0) {
                    // Transition to attack phase
                    const attackDetails = this.getAttackDetails();
                    this.attackDuration = attackDetails.duration;
                    this.updateAttackIndicator(false, true); // Show active attack
                    this.executeAttack(); // Check if the player is hit
                }
            } else if (this.attackDuration > 0) {
                // In attack phase
                this.attackDuration -= deltaTime;
                
                if (this.attackDuration <= 0) {
                    // Transition to recovery phase
                    const attackDetails = this.getAttackDetails();
                    this.attackRecovery = attackDetails.recovery;
                    this.updateAttackIndicator(); // Clear attack indicator
                }
            } else if (this.attackRecovery > 0) {
                // In recovery phase
                this.attackRecovery -= deltaTime;
                
                if (this.attackRecovery <= 0) {
                    // Attack sequence complete
                    this.isAttacking = false;
                    const attackDetails = this.getAttackDetails();
                    this.attackCooldown = attackDetails.cooldown;
                }
            }
            
            return; // Don't move while attacking
        }
        
        // Basic AI behavior when not attacking
        if (!this.target) {
            // Check if player is in aggro range
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            if (distToPlayer < this.aggroRange) {
                this.target = player;
            } else {
                // Wander randomly
                if (Math.random() < 0.02) {
                    this.velocity.x = (Math.random() * 2 - 1) * this.moveSpeed;
                    this.velocity.y = (Math.random() * 2 - 1) * this.moveSpeed;
                }
            }
        }
        
        if (this.target) {
            // Move towards player
            const dx = this.target.position.x - this.position.x;
            const dy = this.target.position.y - this.position.y;
            const distToTarget = Math.sqrt(dx * dx + dy * dy);
            
            // Update facing direction based on movement
            if (Math.abs(dx) > Math.abs(dy)) {
                this.facing = dx > 0 ? 'right' : 'left';
            } else {
                this.facing = dy > 0 ? 'down' : 'up';
            }
            
            if (distToTarget > this.attackRange) {
                // Move towards player
                const speed = this.moveSpeed / distToTarget;
                this.velocity.x = dx * speed;
                this.velocity.y = dy * speed;
            } else {
                // In attack range, stop moving and attack
                this.velocity.x = 0;
                this.velocity.y = 0;
                
                // Attack if cooldown is ready
                if (this.attackCooldown <= 0 && !this.isAttacking) {
                    this.startAttack();
                }
            }
            
            // Lose target if player gets too far away
            if (distToTarget > this.aggroRange * 1.5) {
                this.target = null;
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        }
        
        // Update position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Keep monster within world bounds and handle collision
        if (world) {
            const tileSize = world.tileSize;
            const monsterRadius = 15;
            
            // World bounds
            if (this.position.x < monsterRadius) this.position.x = monsterRadius;
            if (this.position.x > world.width * tileSize - monsterRadius) this.position.x = world.width * tileSize - monsterRadius;
            if (this.position.y < monsterRadius) this.position.y = monsterRadius;
            if (this.position.y > world.height * tileSize - monsterRadius) this.position.y = world.height * tileSize - monsterRadius;
            
            // Simple tile collision
            const tileX = Math.floor(this.position.x / tileSize);
            const tileY = Math.floor(this.position.y / tileSize);
            
            if (tileX >= 0 && tileX < world.width && tileY >= 0 && tileY < world.height) {
                if (!world.isTileWalkable(this.position.x, this.position.y)) {
                    // Push back from obstacles
                    const tileCenterX = (tileX + 0.5) * tileSize;
                    const tileCenterY = (tileY + 0.5) * tileSize;
                    const pushDirX = this.position.x - tileCenterX;
                    const pushDirY = this.position.y - tileCenterY;
                    const pushDist = Math.sqrt(pushDirX * pushDirX + pushDirY * pushDirY);
                    
                    if (pushDist > 0) {
                        this.position.x += pushDirX / pushDist * 5;
                        this.position.y += pushDirY / pushDist * 5;
                    }
                }
            }
        }
        
        // Update sprite position
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
    }
    
    startAttack() {
        this.isAttacking = true;
        console.log(`Monster ${this.type} preparing to attack!`);
        
        // Set up windup phase
        const attackDetails = this.getAttackDetails();
        this.attackWindup = attackDetails.windup;
        
        // Show attack windup indicator
        this.updateAttackIndicator(true);
    }
    
    updateAttackIndicator(isWindup = false, isActive = false) {
        this.attackIndicator.clear();
        
        if (!isWindup && !isActive) return;
        
        const attackDetails = this.getAttackDetails();
        const range = attackDetails.range;
        
        // Different visual for windup vs active attack
        const alpha = isWindup ? 0.3 : 0.7;
        const color = isActive ? 0xFF0000 : attackDetails.color;
        
        // Draw based on attack pattern
        switch (attackDetails.pattern) {
            case 'circle':
                // Circle attack (omnidirectional)
                this.attackIndicator.beginFill(color, alpha);
                this.attackIndicator.drawCircle(0, 0, range);
                this.attackIndicator.endFill();
                break;
                
            case 'cone':
                // Cone attack (in facing direction)
                this.attackIndicator.beginFill(color, alpha);
                
                // Calculate cone direction based on facing
                let startAngle = 0;
                let endAngle = 0;
                
                switch(this.facing) {
                    case 'right': 
                        startAngle = -Math.PI / 4; 
                        endAngle = Math.PI / 4; 
                        break;
                    case 'down': 
                        startAngle = Math.PI / 4; 
                        endAngle = 3 * Math.PI / 4; 
                        break;
                    case 'left': 
                        startAngle = 3 * Math.PI / 4; 
                        endAngle = 5 * Math.PI / 4; 
                        break;
                    case 'up': 
                        startAngle = 5 * Math.PI / 4; 
                        endAngle = 7 * Math.PI / 4; 
                        break;
                }
                
                // Draw the cone
                this.attackIndicator.moveTo(0, 0);
                this.attackIndicator.arc(0, 0, range, startAngle, endAngle);
                this.attackIndicator.lineTo(0, 0);
                
                this.attackIndicator.endFill();
                break;
                
            case 'line':
                // Line attack (in facing direction)
                this.attackIndicator.beginFill(color, alpha);
                
                let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
                const width = 30; // Width of the line attack
                
                // Calculate line endpoints based on facing
                switch(this.facing) {
                    case 'right':
                        x2 = range;
                        y1 = -width / 2;
                        y2 = width / 2;
                        break;
                    case 'down':
                        y2 = range;
                        x1 = -width / 2;
                        x2 = width / 2;
                        break;
                    case 'left':
                        x2 = -range;
                        y1 = -width / 2;
                        y2 = width / 2;
                        break;
                    case 'up':
                        y2 = -range;
                        x1 = -width / 2;
                        x2 = width / 2;
                        break;
                }
                
                // Rotate for facing direction
                this.attackIndicator.drawRect(0, -width / 2, range, width);
                
                switch(this.facing) {
                    case 'right':
                        // Default orientation
                        break;
                    case 'down':
                        this.attackIndicator.rotation = Math.PI / 2;
                        break;
                    case 'left':
                        this.attackIndicator.rotation = Math.PI;
                        break;
                    case 'up':
                        this.attackIndicator.rotation = 3 * Math.PI / 2;
                        break;
                }
                
                this.attackIndicator.endFill();
                break;
        }
    }
    
    executeAttack() {
        console.log(`Monster ${this.type} attacks!`);
        
        if (!this.target) return;
        
        const attackDetails = this.getAttackDetails();
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        
        let hit = false;
        
        // Check if player is in range
        if (distToTarget <= attackDetails.range) {
            switch (attackDetails.pattern) {
                case 'circle':
                    // Circle hits in all directions within range
                    hit = true;
                    break;
                    
                case 'cone':
                    // Check if player is in the attack cone
                    let angle = Math.atan2(dy, dx);
                    if (angle < 0) angle += 2 * Math.PI; // Convert to 0-2π range
                    
                    let facingAngle = 0;
                    let coneWidth = Math.PI / 2; // 90 degree cone
                    
                    switch(this.facing) {
                        case 'right': facingAngle = 0; break;
                        case 'down': facingAngle = Math.PI / 2; break;
                        case 'left': facingAngle = Math.PI; break;
                        case 'up': facingAngle = 3 * Math.PI / 2; break;
                    }
                    
                    // Check if angle is within cone
                    let angleDiff = Math.abs(angle - facingAngle);
                    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                    
                    hit = (angleDiff <= coneWidth / 2);
                    break;
                    
                case 'line':
                    // Check if player is in line with the attack
                    let inLine = false;
                    
                    switch(this.facing) {
                        case 'right':
                            inLine = (Math.abs(dy) < 15 && dx > 0 && dx <= attackDetails.range);
                            break;
                        case 'down':
                            inLine = (Math.abs(dx) < 15 && dy > 0 && dy <= attackDetails.range);
                            break;
                        case 'left':
                            inLine = (Math.abs(dy) < 15 && dx < 0 && -dx <= attackDetails.range);
                            break;
                        case 'up':
                            inLine = (Math.abs(dx) < 15 && dy < 0 && -dy <= attackDetails.range);
                            break;
                    }
                    
                    hit = inLine;
                    break;
            }
        }
        
        if (hit && this.target.takeDamage) {
            this.target.takeDamage(this.attackDamage);
        }
    }
    
    takeDamage(amount) {
        this.hitPoints -= amount;
        
        // Visual feedback
        this.baseSprite.tint = 0xFF0000;
        setTimeout(() => {
            if (this.alive) {
                this.baseSprite.tint = 0xFFFFFF;
            }
        }, 200);
        
        if (this.hitPoints <= 0 && this.alive) {
            this.die();
        }
    }
    
    die() {
        console.log(`Monster ${this.type} has been defeated!`);
        this.alive = false;
        
        // Cancel any attack in progress
        this.isAttacking = false;
        this.attackIndicator.clear();
        
        // Death animation - fade out
        const fadeOut = () => {
            this.sprite.alpha -= 0.1;
            if (this.sprite.alpha > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                // Remove from game
                if (this.sprite.parent) {
                    this.sprite.parent.removeChild(this.sprite);
                }
            }
        };
        
        fadeOut();
    }
}