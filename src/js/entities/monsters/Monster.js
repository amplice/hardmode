/**
 * @fileoverview Monster - Client-side monster entity for server-driven AI
 * 
 * ARCHITECTURE ROLE:
 * - Client-side representation of server-authoritative monsters
 * - Handles visual updates, animation, and smooth movement interpolation
 * - Receives state updates via delta compression from server MonsterManager
 * - Provides visual feedback for combat interactions and state changes
 * 
 * SERVER-CLIENT PATTERN:
 * Monsters are fully server-authoritative for anti-cheat and consistency:
 * - Server MonsterManager runs all AI logic (pathfinding, targeting, attacks)
 * - Client Monster entities only handle visual representation
 * - Position updates smoothly interpolated for visual smoothness
 * - State changes (idle→chasing→attacking) drive animation transitions
 * 
 * DELTA COMPRESSION INTEGRATION:
 * updateFromServer() receives optimized state updates:
 * - NetworkOptimizer sends only changed fields (position, hp, state)
 * - Critical fields (id, state, hp, facing, type) always included
 * - StateCache merges deltas with cached state before processing
 * - Smooth interpolation maintains visual quality despite compressed updates
 * 
 * MONSTER AI STATES (Server-Driven):
 * - 'dormant': Far from players, AI sleeping for performance
 * - 'idle': Near players, wandering randomly
 * - 'chasing': Player in aggro range, pathfinding toward target
 * - 'attacking': In attack range, executing attack sequence
 * - 'stunned': Hit by player attack, temporary movement disable
 * - 'dying': Death animation playing, soon to be removed
 * 
 * VISUAL SMOOTHING:
 * Server sends discrete position updates at 30 FPS
 * Client interpolates between positions for 60 FPS visual smoothness
 * Prevents jittery movement while maintaining server authority
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - LOD system: Distant monsters update less frequently
 * - Animation pooling: Reuse sprite objects when possible
 * - State-based updates: Only process relevant state changes
 */

// src/js/entities/monsters/Monster.js
import * as PIXI from 'pixi.js';
import { MONSTER_CONFIG } from '../../config/GameConfig.js';
import { MONSTER_STATS } from '../../../../shared/constants/GameConstants.js';
import {
    velocityToDirectionString,
    directionStringToAngleRadians
} from '../../utils/DirectionUtils.js';
import { bfsPath, hasLineOfSight } from '../../utils/Pathfinding.js';

export class Monster {
    constructor(options) {
        // Basic properties
        this.id = options.id;
        this.position = { x: options.x, y: options.y };
        this.type = options.type || 'skeleton';
        this.facing = options.facing || 'down';
        this.state = options.state || 'idle';
        this.alive = true;
        
        // Network sync properties
        this.targetPosition = { x: options.x, y: options.y };
        this.interpolationSpeed = 0.2;
        
        // Get stats from config
        const stats = MONSTER_CONFIG.stats[this.type];
        this.hitPoints = options.hp || stats.hitPoints;
        this.maxHitPoints = options.maxHp || stats.hitPoints;
        this.moveSpeed = stats.moveSpeed;
        this.attackRange = stats.attackRange;
        this.collisionRadius = stats.collisionRadius;
        this.aggroRange = stats.aggroRange;
        
        // Animation state
        this.currentAnimation = null;
        
        // Create sprite container
        this.sprite = new PIXI.Container();
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Get sprite manager
        this.spriteManager = window.game.systems.sprites;
        
        // Initialize animation
        this.setupAnimation();
    }
    
    setupAnimation() {
        if (!this.spriteManager || !this.spriteManager.loaded) return;
        
        // Get initial animation based on state
        const animName = this.getAnimationName();
        this.currentAnimation = animName;
        
        // Create animated sprite
        this.animatedSprite = this.spriteManager.createAnimatedSprite(animName);
        
        if (this.animatedSprite) {
            this.animatedSprite.play();
            this.animatedSprite.anchor.set(0.5, 0.5);
            this.sprite.addChild(this.animatedSprite);
            
            // Set up animation complete callback
            this.animatedSprite.onComplete = () => this.onAnimationComplete();
        }
    }
    
    getAnimationName() {
        // Convert state to animation name
        let animState;
        
        switch (this.state) {
            case 'walking':
            case 'chasing':
                animState = 'walk';
                break;
            case 'attacking':
                animState = 'attack1';
                break;
            case 'stunned':
                animState = 'hit';
                break;
            case 'dying':
                animState = 'die';
                break;
            case 'idle':
            default:
                animState = 'idle';
                break;
        }
        
        return this.spriteManager.getMonsterAnimationForDirection(this.type, this.facing, animState);
    }
    
    updateAnimation() {
        if (!this.spriteManager || !this.spriteManager.loaded) return;
        
        // Get animation name based on current state
        const animName = this.getAnimationName();
        
        // Only update if animation changed
        if (this.currentAnimation !== animName) {
            console.log(`Monster ${this.type} animation change: ${this.currentAnimation} -> ${animName} (state: ${this.state})`);
            this.currentAnimation = animName;
            
            // Remove old sprite
            if (this.animatedSprite && this.animatedSprite.parent) {
                this.sprite.removeChild(this.animatedSprite);
            }
            
            // Create new sprite with current animation
            this.animatedSprite = this.spriteManager.createAnimatedSprite(animName);
            
            if (this.animatedSprite) {
                // Configure loop based on animation type
                const nonLoopingStates = ['attacking', 'stunned', 'dying'];
                this.animatedSprite.loop = !nonLoopingStates.includes(this.state);
                
                this.animatedSprite.play();
                this.animatedSprite.anchor.set(0.5, 0.5);
                this.sprite.addChild(this.animatedSprite);
                
                // Apply red tint for damage
                if (this.state === 'stunned') {
                    this.animatedSprite.tint = 0xFF0000;
                } else {
                    this.animatedSprite.tint = 0xFFFFFF;
                }
                
                // Set animation complete callback
                this.animatedSprite.onComplete = () => this.onAnimationComplete();
            }
        }
    }
    
    onAnimationComplete() {
        // Handle animation completion based on state
        switch (this.state) {
            case 'stunned':
                // DON'T change state locally - server is authoritative for monster states
                // Hold on last frame until server updates state
                if (this.animatedSprite) {
                    this.animatedSprite.gotoAndStop(this.animatedSprite.totalFrames - 1);
                }
                break;
                
            case 'attacking':
                // Don't change state locally - let server control it
                // Just stop the animation on the last frame
                if (this.animatedSprite) {
                    this.animatedSprite.gotoAndStop(this.animatedSprite.totalFrames - 1);
                }
                break;
                
            case 'dying':
                // Start fade out after death animation
                this.startFadeOut();
                break;
        }
    }
    
    changeState(newState) {
        // Store previous state
        this.previousState = this.state;
        // Set new state
        this.state = newState;
        // Force animation update
        this.updateAnimation();
    }
    
    startFadeOut() {
        // Fade out the sprite gradually
        const fadeStep = () => {
            this.sprite.alpha -= 0.05;
            if (this.sprite.alpha > 0) {
                requestAnimationFrame(fadeStep);
            } else if (this.sprite.parent) {
                this.sprite.parent.removeChild(this.sprite);
            }
        };
        
        fadeStep();
    }
    
    updateFacing() {
        // If moving, update facing based on velocity
        const newFacing = velocityToDirectionString(this.velocity.x, this.velocity.y);
        if (newFacing) {
            this.facing = newFacing;
        }
    }
    
    // Updates facing direction to point toward target
    updateFacingToTarget() {
        if (!this.target) return;
        
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        
        const newFacing = velocityToDirectionString(dx, dy);
        if (newFacing) {
            this.facing = newFacing;
        }
    }
    
    takeDamage(amount, attacker = null) {
        // Don't process damage if already dead
        if (!this.alive) return;
        
        this.hitPoints -= amount;
        
        // Check for death
        if (this.hitPoints <= 0) {
            this.die(attacker);
            return;
        }
        
        // Cancel any attack in progress (removed attack indicator - server controlled)
        
        // Apply stun - always changes to stunned state regardless of current state
        this.changeState('stunned');
        this.velocity = { x: 0, y: 0 }; // Stop movement
    }
    
    die(attacker = null) {
        if (!this.alive) return;
        
        console.log(`Monster ${this.type} has been defeated!`);
        this.alive = false;
        if (attacker && attacker.stats && attacker.stats.recordKill) {
            attacker.stats.recordKill(this.type);
        }
        this.changeState('dying');
        this.velocity = { x: 0, y: 0 };
        
        // Clear attack indicator (removed - server controlled)
    }
    
    update(deltaTime = 0) {
        // In multiplayer, always trust server state - don't skip updates based on client-side alive flag
        // The server is authoritative about whether the monster is alive or dead
        
        // Smooth interpolation to target position (for network sync)
        this.position.x += (this.targetPosition.x - this.position.x) * this.interpolationSpeed;
        this.position.y += (this.targetPosition.y - this.position.y) * this.interpolationSpeed;
        
        // Update sprite position
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Update animation based on current state if needed
        this.updateAnimation();
    }
    
    updateFromServer(data) {
        // Update target position for smooth interpolation
        this.targetPosition.x = data.x;
        this.targetPosition.y = data.y;
        
        // Update health
        this.hitPoints = data.hp;
        this.maxHitPoints = data.maxHp;
        
        // Server is authoritative - update alive status based on HP
        // This ensures client-side alive flag stays in sync with server
        if (this.hitPoints > 0 && !this.alive) {
            // Monster was revived or client was out of sync
            this.alive = true;
        } else if (this.hitPoints <= 0 && this.alive) {
            // Monster died but client didn't know
            this.alive = false;
        }
        
        // Prevent facing changes from restarting attack animations
        const wasAttacking = this.state === 'attacking';
        const isNowAttacking = data.state === 'attacking';
        
        // Update state and facing
        const oldState = this.state;
        const oldFacing = this.facing;
        this.state = data.state;
        this.facing = data.facing;
        
        // Only update animation if state changed, or if facing changed but not during an attack
        if (oldState !== this.state || (!wasAttacking && !isNowAttacking && oldFacing !== this.facing)) {
            this.updateAnimation();
        }
    }
    
    showDamageEffect() {
        // Flash red to indicate damage
        if (this.animatedSprite) {
            this.animatedSprite.tint = 0xFF0000;
            setTimeout(() => {
                if (this.animatedSprite) {
                    this.animatedSprite.tint = 0xFFFFFF;
                }
            }, 200);
        }
    }
    
    playDeathAnimation() {
        // Switch to death animation
        this.state = 'dying';
        this.updateAnimation();
    }
    
    // Legacy update method for local AI (no longer used in multiplayer)
    updateLocal(deltaTime, player, world) {
        // Don't do any updates if dead
        if (!this.alive) return;
        
        // Only update sprite position during stun
        if (this.state === 'stunned') {
            this.sprite.position.set(this.position.x, this.position.y);
            return;
        }
        
        // Decrease attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }
        
        // Don't move while attacking
        if (this.state === 'attacking') {
            // Update sprite position
            this.sprite.position.set(this.position.x, this.position.y);
            return;
        }
        
        // AI state machine
        this.updateAI(deltaTime, player, world);
        
        // Apply movement
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Update sprite position
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Update animation based on current state if needed
        this.updateAnimation();
    }
    
    updateAI(deltaTime, player, world) {
        // Check if we need to acquire a target
        if (!this.target) {
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            if (distToPlayer < this.aggroRange) {
                this.target = player;
                this.changeState('walking');
            } else {
                // Random wandering behavior
                if (Math.random() < 0.02) {
                    this.velocity.x = (Math.random() * 2 - 1) * this.moveSpeed * 0.5;
                    this.velocity.y = (Math.random() * 2 - 1) * this.moveSpeed * 0.5;
                    this.updateFacing();
                    this.changeState('walking');
                } else if (this.state === 'walking' && Math.random() < 0.05) {
                    // Sometimes stop wandering
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                    this.changeState('idle');
                }
            }
        }
        
        // Target handling logic
        if (this.target) {
            const dx = this.target.position.x - this.position.x;
            const dy = this.target.position.y - this.position.y;
            const distToTarget = Math.sqrt(dx * dx + dy * dy);

            // Update facing toward target
            this.updateFacingToTarget();

            let moved = false;

            if (distToTarget > this.attackRange) {
                // Check if we have direct line of sight to target
                if (hasLineOfSight(world, this.position, this.target.position)) {
                    const moveSpeed = this.moveSpeed / distToTarget;
                    this.velocity.x = dx * moveSpeed;
                    this.velocity.y = dy * moveSpeed;
                    moved = true;
                } else {
                    // Recalculate path if needed
                    if (this.pathCooldown > 0) {
                        this.pathCooldown -= deltaTime;
                    }
                    if (this.path.length === 0 || this.pathCooldown <= 0) {
                        const newPath = bfsPath(world, this.position, this.target.position);
                        this.path = newPath || [];
                        this.pathCooldown = 1;
                    }
                    if (this.path.length > 0) {
                        const next = this.path[0];
                        const pdx = next.x - this.position.x;
                        const pdy = next.y - this.position.y;
                        const dist = Math.sqrt(pdx * pdx + pdy * pdy);
                        if (dist < this.moveSpeed) {
                            this.path.shift();
                        }
                        if (dist > 0) {
                            const moveSpeed = this.moveSpeed / dist;
                            this.velocity.x = pdx * moveSpeed;
                            this.velocity.y = pdy * moveSpeed;
                            moved = true;
                        }
                    }
                }

                if (moved) {
                    if (this.state !== 'walking') this.changeState('walking');
                } else {
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                }
            } else {
                this.velocity.x = 0;
                this.velocity.y = 0;

                if (this.attackCooldown <= 0 && this.state !== 'attacking') {
                    this.startAttack();
                }
            }

            if (distToTarget > this.aggroRange * 1.5) {
                this.target = null;
                this.path = [];
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.changeState('idle');
            }
        }

        if (this.state === 'idle' && (this.velocity.x !== 0 || this.velocity.y !== 0)) {
            this.changeState('walking');
        }
    }
    
    startAttack() {
        // Set attack state
        this.changeState('attacking');
        this.velocity = { x: 0, y: 0 };
        
        // Get attack details
        const attackDetails = MONSTER_CONFIG.attacks[this.type];
        
        // Show attack windup indicator for melee attacks only
        if (attackDetails.pattern !== 'projectile') {
            this.showAttackIndicator(true);
        }
        
        // Schedule actual attack after windup
        setTimeout(() => {
            if (this.state !== 'attacking' || !this.alive) return;
            
            // Show active indicator for melee attacks
            if (attackDetails.pattern !== 'projectile') {
                this.showAttackIndicator(false, true);
            }
            
            // Execute the attack
            this.executeAttack();
            
            // Attack animation and cooldown will be handled in onAnimationComplete
        }, attackDetails.windup * 1000);
    }
    
    showAttackIndicator(isWindup = false, isActive = false) {
        this.attackIndicator.clear();
        
        if (!isWindup && !isActive) return;
        
        const attackDetails = MONSTER_CONFIG.attacks[this.type];
        const range = this.attackRange;
        
        // Different visual for windup vs active attack
        const alpha = isWindup ? 0.3 : 0.7;
        const color = isActive ? 0xFF0000 : attackDetails.color;
        
        // Draw based on attack pattern
        this.attackIndicator.rotation = 0;
        this.attackIndicator.beginFill(color, alpha);
        
        switch (attackDetails.pattern) {
            case 'circle':
                this.attackIndicator.drawCircle(0, 0, range);
                break;

            case 'cone':
                // Draw cone with 90 degree angle
                const coneAngle = Math.PI / 2;
                const startAngle = -coneAngle / 2;
                const endAngle = coneAngle / 2;
                
                this.attackIndicator.moveTo(0, 0);
                this.attackIndicator.arc(0, 0, range, startAngle, endAngle);
                this.attackIndicator.lineTo(0, 0);
                
                // Rotate to match facing direction
                let rotation = 0;
                switch(this.facing) {
                    case 'right': rotation = 0; break;
                    case 'down-right': rotation = Math.PI / 4; break;
                    case 'down': rotation = Math.PI / 2; break;
                    case 'down-left': rotation = 3 * Math.PI / 4; break;
                    case 'left': rotation = Math.PI; break;
                    case 'up-left': rotation = 5 * Math.PI / 4; break;
                    case 'up': rotation = 3 * Math.PI / 2; break;
                    case 'up-right': rotation = 7 * Math.PI / 4; break;
                }
                
                this.attackIndicator.rotation = directionStringToAngleRadians(this.facing);
                break;

            case 'projectile':
                // Simple line indicator for ranged attacks
                this.attackIndicator.drawRect(-2, -range, 4, range);
                this.attackIndicator.rotation = directionStringToAngleRadians(this.facing) + Math.PI / 2;
                break;
        }
        
        this.attackIndicator.endFill();
    }
    
    executeAttack() {
        if (!this.target || !this.alive) return;
        
        const attackDetails = MONSTER_CONFIG.attacks[this.type];
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        
        let hit = false;

        // Check if player is in range
        if (distToTarget <= this.attackRange) {
            switch (attackDetails.pattern) {
                case 'circle':
                    // Circle hits in all directions within range
                    hit = true;
                    break;

                case 'cone':
                    // Get angle to target
                    let angle = Math.atan2(dy, dx); // This is radians
                    
                    // Get facing angle in radians using the utility function
                    let facingAngle = directionStringToAngleRadians(this.facing);
                    
                    // Calculate angle difference (normalized to smallest angle)
                    let angleDiff = Math.abs(angle - facingAngle);
                    while (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                    
                    // Check if target is within cone (45 degrees on each side)
                    const coneHalfAngle = Math.PI / 4;
                    hit = (angleDiff <= coneHalfAngle);
                    break;

                case 'projectile':
                    const angleToTarget = Math.atan2(dy, dx);
                    window.game.systems.combat.createProjectile(
                        this.position.x,
                        this.position.y,
                        angleToTarget,
                        this,
                        {
                            damage: attackDetails.damage,
                            speed: attackDetails.projectileSpeed,
                            range: attackDetails.projectileRange,
                            effectType: attackDetails.projectileEffect || 'bow_shot_effect'
                        }
                    );
                    hit = true; // Projectile fired
                    break;
            }
        }
        
        // Apply damage immediately only for melee-based attacks
        if (hit && attackDetails.pattern !== 'projectile' && this.target.takeDamage) {
            this.target.takeDamage(attackDetails.damage);
        }
    }
}