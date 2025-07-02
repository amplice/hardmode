/**
 * @fileoverview Player - Core player entity with component-based architecture
 * 
 * ARCHITECTURE ROLE:
 * - Primary player character managing movement, combat, health, and progression
 * - Component-based design for modular gameplay systems (movement, combat, health, stats)
 * - Integrates with client prediction, server reconciliation, and multiplayer synchronization
 * - Handles both local player (with prediction) and remote players (server-authoritative)
 * 
 * COMPONENT PATTERN:
 * Modular design with specialized components:
 * - MovementComponent: Input processing, velocity calculation, facing direction
 * - CombatComponent: Attack execution, ability management, damage dealing
 * - HealthComponent: HP management, damage taking, death/respawn cycle
 * - StatsComponent: Level progression, experience, stat bonuses
 * - AnimationComponent: Sprite animation coordination
 * 
 * CLIENT PREDICTION INTEGRATION:
 * Local player uses optimistic updates:
 * 1. Input processed immediately for responsive feel
 * 2. MovementPredictor calculates predicted position
 * 3. Server validates and sends authoritative state
 * 4. Reconciler corrects prediction if server disagrees
 * 
 * MULTIPLAYER COORDINATION:
 * - Local player: Full component systems + prediction
 * - Remote players: Visual updates only, server drives state
 * - Attack synchronization via network events
 * - Health/damage coordination through server authority
 * 
 * SKILL-BASED COMBAT DESIGN:
 * - Level differences provide advantages but skill can overcome
 * - Movement speed bonuses, attack recovery improvements
 * - Roll ability unlocked at level 5 for advanced tactics
 * - Permadeath mechanics with full stat reset on death
 */

import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG, MONSTER_CONFIG } from '../config/GameConfig.js';
import { 
    angleToDirectionString, 
    directionStringToAngleRadians,
    velocityToDirectionString,
    directionStringToAnimationSuffix
} from '../utils/DirectionUtils.js';
import { createPlayerState, validatePlayerState } from '../../../shared/factories/EntityFactories.js';

// Base Component class
class Component {
    constructor(owner) {
        this.owner = owner;
    }
    
    init() {}
    update(deltaTime, inputState) {}
}

// Controls player movement and facing direction
class MovementComponent extends Component {
    init() {
        // Initialize properties on owner
        this.owner.velocity = { x: 0, y: 0 };
        this.owner.isMoving = false;
        this.owner.movementDirection = null;
        this.owner.lastFacing = this.owner.facing;
    }
    
    update(deltaTime, inputState) {
        if (this.owner.isAttacking || this.owner.isTakingDamage || 
            this.owner.isDying || this.owner.isDead) {
            return;
        }
        
        this.processMovementInput(inputState);
        this.updatePosition();
        
        // Update facing direction based on mouse position if available
        if (inputState.mousePosition) {
            this.updateFacingFromMouse(inputState.mousePosition);
        }
        
        // Remember current facing for next frame
        this.owner.lastFacing = this.owner.facing;
    }
    
    processMovementInput(inputState) {
        // Reset velocity
        this.owner.velocity.x = 0;
        this.owner.velocity.y = 0;
        
        // Get input directions
        const up = inputState.up;
        const down = inputState.down;
        const left = inputState.left;
        const right = inputState.right;
        
        // Calculate base velocity
        let vx = 0;
        let vy = 0;
        
        if (up) vy = -1;
        if (down) vy = 1;
        if (left) vx = -1;
        if (right) vx = 1;
        
        // Normalize diagonal movement slightly (0.85 instead of 0.7071)
        if (vx !== 0 && vy !== 0) {
            const diagonalFactor = 0.85;
            vx *= diagonalFactor;
            vy *= diagonalFactor;
        }
        
        // Apply speed modifiers based on facing vs movement direction
        const facingAngle = this.getFacingAngle();
        const movementAngle = vx !== 0 || vy !== 0 ? Math.atan2(vy, vx) : facingAngle;
        
        // Calculate angle difference (in radians)
        let angleDiff = Math.abs(facingAngle - movementAngle);
        // Normalize to be between 0 and π
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }
        
        // Apply direction-based speed modifiers
        let speedModifier = 1.0;
        
        if (angleDiff < Math.PI / 4) {
            // Moving forward (within 45 degrees of facing)
            speedModifier = 1.0;
        } else if (angleDiff > 3 * Math.PI / 4) {
            // Moving backward (more than 135 degrees from facing)
            speedModifier = 0.5;
        } else {
            // Strafing (between 45 and 135 degrees from facing)
            speedModifier = 0.7;
        }
        
        // Apply final velocity with modifier
        this.owner.velocity.x = vx * this.owner.moveSpeed * speedModifier;
        this.owner.velocity.y = vy * this.owner.moveSpeed * speedModifier;
        
        // Update movement flags
        this.owner.isMoving = (vx !== 0 || vy !== 0);
        
        if (this.owner.isMoving) {
            this.updateMovementDirection();
        } else {
            this.owner.movementDirection = null;
        }
    }
    
    updatePosition() {
        // Update position
        this.owner.position.x = Math.round(this.owner.position.x + this.owner.velocity.x);
        this.owner.position.y = Math.round(this.owner.position.y + this.owner.velocity.y);
        this.owner.sprite.position.set(this.owner.position.x, this.owner.position.y);
    }
    
    getFacingAngle() {
        // Use the utility function to convert facing string to radians
        return directionStringToAngleRadians(this.owner.facing);
    }
    
    updateMovementDirection() {
        const vx = this.owner.velocity.x;
        const vy = this.owner.velocity.y;
        
        // Use the utility function to convert velocity to direction string
        this.owner.movementDirection = velocityToDirectionString(vx, vy);
    }
    
    updateFacingFromMouse(mousePosition) {
        // Calculate angle to mouse cursor relative to camera
        const dx = mousePosition.x - window.innerWidth / 2;
        const dy = mousePosition.y - window.innerHeight / 2;
        const angleInDegrees = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Convert angle to 8-direction facing using the utility function
        this.owner.facing = angleToDirectionString(angleInDegrees);
    }
}

// Handles player animations
class AnimationComponent extends Component {
    init() {
        this.owner.currentAnimation = null;
        
        // Initialize with a placeholder while we prepare the real sprites
        this.owner.placeholder = new PIXI.Graphics();
        this.drawPlaceholder();
        this.owner.sprite.addChild(this.owner.placeholder);
        
        // Set up animations if sprites are available
        if (this.owner.spriteManager && this.owner.spriteManager.loaded) {
            this.setupAnimations();
        }
    }
    
    update() {
        if (this.owner.spriteManager && this.owner.spriteManager.loaded) {
            if (!this.owner.animatedSprite) {
                this.setupAnimations();
                return;
            }
            
            // Don't change animation if special state
            if (this.owner.isDying || this.owner.isTakingDamage || this.owner.isAttacking) {
                return;
            }
            
            // Check if animation needs to be updated
            const facingChanged = this.owner.facing !== this.owner.lastFacing;
            
            // Get appropriate animation based on state
            const animationName = this.owner.spriteManager.getAnimationForMovement(
                this.owner.facing,
                this.owner.movementDirection,
                this.owner.characterClass
            );
            
            if (animationName && (facingChanged || this.owner.currentAnimation !== animationName)) {
                this.owner.currentAnimation = animationName;
                this.changeAnimation(animationName);
            }
        } else if (this.owner.placeholder) {
            // Update placeholder if we don't have sprites yet
            this.drawPlaceholder();
        }
    }
    
    setupAnimations() {
        // Remove placeholder if it exists
        if (this.owner.placeholder && this.owner.placeholder.parent) {
            this.owner.sprite.removeChild(this.owner.placeholder);
            this.owner.placeholder = null;
        }
        
        // Create idle animation for current facing direction
        const animationName = this.owner.spriteManager.getAnimationForMovement(
            this.owner.facing,
            null,
            this.owner.characterClass
        );
        this.owner.currentAnimation = animationName;
        
        this.owner.animatedSprite = this.owner.spriteManager.createAnimatedSprite(animationName);
        if (this.owner.animatedSprite) {
            this.owner.animatedSprite.play();
            this.owner.animatedSprite.anchor.set(0.5, 0.5);
            this.owner.sprite.addChild(this.owner.animatedSprite);
            
            // Set up animation complete callback
            this.owner.animatedSprite.onComplete = () => this.onAnimationComplete();
            
            // Set up frame change callback
            this.owner.animatedSprite.onFrameChange = () => {};
        }
    }
    
    changeAnimation(animationName) {
        // Remove old sprite and create new one
        if (this.owner.animatedSprite && this.owner.animatedSprite.parent) {
            this.owner.sprite.removeChild(this.owner.animatedSprite);
        }
        
        this.owner.animatedSprite = this.owner.spriteManager.createAnimatedSprite(animationName);
        if (this.owner.animatedSprite) {
            this.owner.animatedSprite.play();
            this.owner.sprite.addChild(this.owner.animatedSprite);
            
            // Set up animation complete callback
            this.owner.animatedSprite.onComplete = () => this.onAnimationComplete();
            
            // Set up frame change callback
            this.owner.animatedSprite.onFrameChange = () => {};
            
            // Reapply current tints
            this.applyCurrentTints();
        }
    }
    
    // Helper function to apply tints to the current sprite
    applyCurrentTints() {
        if (!this.owner.animatedSprite) return;
        
        // Apply spawn protection tint
        if (this.owner.spawnProtectionTimer > 0) {
            this.owner.animatedSprite.tint = 0xFFFF00; // Yellow
            // Debug logging
            if (!this.tintDebugLogged) {
                // Applying yellow tint for spawn protection
                this.tintDebugLogged = true;
                setTimeout(() => { this.tintDebugLogged = false; }, 1000);
            }
        } else {
            this.owner.animatedSprite.tint = 0xFFFFFF; // Normal
        }
    }
    
    onAnimationComplete() {
        // If we just finished an attack animation, return to idle
        if (this.owner.isAttacking) {
            // Attack animation completed
            
            // For projectile attacks, let the combat system manage the attack state
            // since projectiles have a windup time that may exceed animation duration
            const isHunterProjectile = this.owner.characterClass === 'hunter' && 
                                      this.owner.currentAttackType === 'primary';
            const isProjectileAttack = isHunterProjectile;
            
            if (!isProjectileAttack) {
                this.owner.isAttacking = false;
                this.owner.attackHitFrameReached = false;
                this.owner.currentAttackType = null;
            } else {
                // Projectile attack - keeping isAttacking true for windup
            }
            
            // Return to idle or movement animation
            this.update();
        }
    }
    
    drawPlaceholder() {
        this.owner.placeholder.clear();
        
        // Get color from config
        const classConfig = PLAYER_CONFIG.classes[this.owner.characterClass];
        const color = classConfig.placeholderColor;
        
        // Draw character body
        this.owner.placeholder.beginFill(color);
        this.owner.placeholder.drawCircle(0, 0, 20);
        this.owner.placeholder.endFill();
        
        // Draw facing direction indicator
        this.owner.placeholder.beginFill(0xffffff);
        
        // Draw direction indicator based on facing
        switch(this.owner.facing) {
            case 'down':
                this.owner.placeholder.drawCircle(0, 15, 5); break;
            case 'up':
                this.owner.placeholder.drawCircle(0, -15, 5); break;
            case 'left':
                this.owner.placeholder.drawCircle(-15, 0, 5); break;
            case 'right':
                this.owner.placeholder.drawCircle(15, 0, 5); break;
            case 'down-left':
                this.owner.placeholder.drawCircle(-10, 10, 5); break;
            case 'down-right':
                this.owner.placeholder.drawCircle(10, 10, 5); break;
            case 'up-left':
                this.owner.placeholder.drawCircle(-10, -10, 5); break;
            case 'up-right':
                this.owner.placeholder.drawCircle(10, -10, 5); break;
        }
        
        this.owner.placeholder.endFill();
    }
    
    playAttackAnimation(attackType) {
        // Get the character class prefix from PLAYER_CONFIG
        const classConfig = PLAYER_CONFIG.classes[this.owner.characterClass];
        const classPrefix = classConfig?.spritePrefix || 'knight'; // Default to 'knight'
        
        if (attackType === 'roll') {
          const rollAnimName = `${classPrefix}_roll_${this.getFacingAnimationKey()}`;
          this.owner.currentAnimation = rollAnimName;

          if (this.owner.animatedSprite && this.owner.animatedSprite.parent) {
            this.owner.sprite.removeChild(this.owner.animatedSprite);
          }

          this.owner.animatedSprite = this.owner.spriteManager.createAnimatedSprite(rollAnimName);
          if (this.owner.animatedSprite) {
            this.owner.animatedSprite.loop = false;
            this.owner.animatedSprite.play();
            this.owner.sprite.addChild(this.owner.animatedSprite);

            this.owner.animatedSprite.onComplete = () => this.onAnimationComplete();
            this.applyCurrentTints();
          }
          return;
        }

        // Handle special case for guardian jump attack
        if (this.owner.characterClass === 'guardian' && attackType === 'secondary') {
          // Use attack2 animation for jump attack
          const attackAnimName = `${classPrefix}_attack2_${this.getFacingAnimationKey()}`;
          this.owner.currentAnimation = attackAnimName;
          
          // Remove old sprite and create new attack animation
          if (this.owner.animatedSprite && this.owner.animatedSprite.parent) {
            this.owner.sprite.removeChild(this.owner.animatedSprite);
          }
          
          this.owner.animatedSprite = this.owner.spriteManager.createAnimatedSprite(attackAnimName);
          if (this.owner.animatedSprite) {
            // Don't loop the jump attack animation
            this.owner.animatedSprite.loop = false;
            this.owner.animatedSprite.play();
            this.owner.sprite.addChild(this.owner.animatedSprite);
            
            // Set up animation complete callback
            this.owner.animatedSprite.onComplete = () => this.onAnimationComplete();
            this.applyCurrentTints();
          }
          return;
        }
        
        // Regular attack animation handling
        const attackAnimName = this.owner.spriteManager.getAttackAnimation(
            this.owner.facing,
            attackType,
            this.owner.characterClass
        );
        this.owner.currentAnimation = attackAnimName;
        
        // Remove old sprite and create new attack animation
        if (this.owner.animatedSprite && this.owner.animatedSprite.parent) {
            this.owner.sprite.removeChild(this.owner.animatedSprite);
        }
        
        this.owner.animatedSprite = this.owner.spriteManager.createAnimatedSprite(attackAnimName);
        if (this.owner.animatedSprite) {
            // Don't loop the attack animation
            this.owner.animatedSprite.loop = false;
            this.owner.animatedSprite.play();
            this.owner.sprite.addChild(this.owner.animatedSprite);
            
            // Set up animation complete callback
            this.owner.animatedSprite.onComplete = () => this.onAnimationComplete();
            this.applyCurrentTints();
        }
    }
    
      playDamageAnimation() {
        if (this.owner.spriteManager && this.owner.spriteManager.loaded) {
            // Get the character class prefix from PLAYER_CONFIG
            const classConfig = PLAYER_CONFIG.classes[this.owner.characterClass];
            const classPrefix = classConfig?.spritePrefix || 'knight'; // Default to 'knight'
            
            // Get take damage animation for current facing direction
            const damageAnimName = `${classPrefix}_take_damage_${this.getFacingAnimationKey()}`;
            this.owner.currentAnimation = damageAnimName;
            
            // Remove old sprite and create new take damage animation
            if (this.owner.animatedSprite && this.owner.animatedSprite.parent) {
                this.owner.sprite.removeChild(this.owner.animatedSprite);
            }
            
            this.owner.animatedSprite = this.owner.spriteManager.createAnimatedSprite(damageAnimName);
            if (this.owner.animatedSprite) {
                // Don't loop the take damage animation
                this.owner.animatedSprite.loop = false;
                this.owner.animatedSprite.play();
                this.owner.sprite.addChild(this.owner.animatedSprite);
                
                // Also apply the red tint for visual clarity
                this.owner.animatedSprite.tint = 0xFF0000;
                
                // Set up animation complete callback
                this.owner.animatedSprite.onComplete = () => {
                    // Reapply appropriate tints after damage animation
                    this.applyCurrentTints();
                    
                    // If the stun duration is longer than the animation,
                    // let the stun timer handle the state reset
                    if (this.owner.damageStunTimer <= 0) {
                        this.owner.isTakingDamage = false;
                        // Force animation update
                        this.owner.currentAnimation = null;
                        this.update();
                    }
                };
            }
        } else {
            // Fallback to just the flash effect if no sprite manager
            if (this.owner.animatedSprite) {
                this.owner.animatedSprite.tint = 0xFF0000;
                setTimeout(() => {
                    if (this.owner.animatedSprite) {
                        this.owner.animatedSprite.tint = 0xFFFFFF;
                    }
                }, 200);
            }
        }
    }
    
    playDeathAnimation() {
        // Don't restart death animation if already playing
        if (this.owner.currentAnimation && this.owner.currentAnimation.includes('_die_')) {
            return;
        }
        
        if (this.owner.spriteManager && this.owner.spriteManager.loaded) {
            // Get the character class prefix from PLAYER_CONFIG
            const classConfig = PLAYER_CONFIG.classes[this.owner.characterClass];
            const classPrefix = classConfig?.spritePrefix || 'knight'; // Default to 'knight'
            
            // Get death animation for current facing direction
            const deathAnimName = `${classPrefix}_die_${this.getFacingAnimationKey()}`;
            this.owner.currentAnimation = deathAnimName;
            
            // Remove old sprite and create new death animation
            if (this.owner.animatedSprite && this.owner.animatedSprite.parent) {
                this.owner.sprite.removeChild(this.owner.animatedSprite);
            }
            
            this.owner.animatedSprite = this.owner.spriteManager.createAnimatedSprite(deathAnimName);
            if (this.owner.animatedSprite) {
                // Don't loop the death animation
                this.owner.animatedSprite.loop = false;
                this.owner.animatedSprite.play();
                this.owner.sprite.addChild(this.owner.animatedSprite);
                
                // Set up animation complete callback - just stop on last frame
                this.owner.animatedSprite.onComplete = () => {
                    // Stay on last frame until server respawns player
                    if (this.owner.animatedSprite) {
                        this.owner.animatedSprite.gotoAndStop(this.owner.animatedSprite.totalFrames - 1);
                    }
                };
                this.applyCurrentTints();
            }
        } else {
            // If no sprite manager, wait for server respawn (don't trigger client respawn)
            // No sprite manager - waiting for server respawn
        }
    }
    
    getFacingAnimationKey() {
        // Use the utility function to convert facing string to animation suffix
        return directionStringToAnimationSuffix(this.owner.facing);
    }
}

// Handles player combat abilities
class CombatComponent extends Component {
    init() {
        this.owner.isAttacking = false;
        this.owner.primaryAttackCooldown = 0;
        this.owner.secondaryAttackCooldown = 0;
        this.owner.rollCooldown = 0;
        this.owner.currentAttackType = null;
        this.owner.attackHitFrameReached = false;
        this.owner.isInvulnerable = false;
      }
    
      update(deltaTime, inputState) {
        // Decrease attack cooldowns
        if (this.owner.primaryAttackCooldown > 0) {
          this.owner.primaryAttackCooldown -= deltaTime;
        }
        if (this.owner.secondaryAttackCooldown > 0) {
          this.owner.secondaryAttackCooldown -= deltaTime;
        }
        if (this.owner.rollCooldown > 0) {
          this.owner.rollCooldown -= deltaTime;
        }
        
        // Don't process attacks if player can't act
        if (this.owner.isAttacking || this.owner.isTakingDamage || 
            this.owner.isDying || this.owner.isDead) {
          return;
        }
        
        // Handle attack inputs separately
        if (this.owner.primaryAttackCooldown <= 0 && inputState.primaryAttack) {
          this.performPrimaryAttack();
        }
        if (this.owner.secondaryAttackCooldown <= 0 && inputState.secondaryAttack) {
          this.performSecondaryAttack();
        }
        if (this.owner.rollUnlocked && this.owner.rollCooldown <= 0 && inputState.roll) {
          this.performRoll();
        }
      }
    
    performPrimaryAttack() {
      let attackName = 'primary attack';
      switch(this.owner.characterClass) {
        case 'guardian': attackName = 'sweeping axe'; break;
        case 'hunter': attackName = 'bow shot'; break;
        case 'rogue': attackName = 'thrust attack'; break;
        default: attackName = 'forehand slash'; break;
      }
      // Primary attack started
      this.owner.isAttacking = true;
      this.owner.attackHitFrameReached = false;
      this.owner.currentAttackType = 'primary';
      
      // Log attack event
      if (window.game?.debugLogger) {
        window.game.debugLogger.logEvent('playerAttack', {
          type: 'primary',
          class: this.owner.characterClass,
          position: this.owner.position,
          facing: this.owner.facing
        });
      }
      
      // Play attack animation
      this.owner.animation.playAttackAnimation('primary');
      
      // Execute attack using combat system
      if (this.owner.combatSystem) {
        const cooldown = this.owner.combatSystem.executeAttack(this.owner, 'primary');
        this.owner.primaryAttackCooldown = cooldown / 1000; // Store in the correct variable
        // Primary attack cooldown set
      }
      if (window.game?.network) {
        window.game.network.sendAttack(this.owner, 'primary');
      }
    }
    
    performSecondaryAttack() {
      // Secondary attack started
      this.owner.isAttacking = true;
      this.owner.attackHitFrameReached = false;
      this.owner.currentAttackType = 'secondary';
      
      // Log attack event
      if (window.game?.debugLogger) {
        window.game.debugLogger.logEvent('playerAttack', {
          type: 'secondary',
          class: this.owner.characterClass,
          position: this.owner.position,
          facing: this.owner.facing
        });
      }
      
      // Play attack animation
      this.owner.animation.playAttackAnimation('secondary');
      
      // Execute attack using combat system
      if (this.owner.combatSystem) {
        const cooldown = this.owner.combatSystem.executeAttack(this.owner, 'secondary');
        this.owner.secondaryAttackCooldown = cooldown / 1000; // Store in the correct variable
      }
      if (window.game?.network) {
        window.game.network.sendAttack(this.owner, 'secondary');
      }
    }

    performRoll() {
      // Roll started
      this.owner.isAttacking = true;
      this.owner.attackHitFrameReached = false;
      this.owner.currentAttackType = 'roll';

      this.owner.animation.playAttackAnimation('roll');

      if (this.owner.combatSystem) {
        const cooldown = this.owner.combatSystem.executeAttack(this.owner, 'roll');
        this.owner.rollCooldown = cooldown / 1000;
      }
      if (window.game?.network) {
        window.game.network.sendAttack(this.owner, 'roll');
      }
    }
    
    // Add method to manually end attack state
    endAttack() {
      this.owner.isAttacking = false;
      this.owner.attackHitFrameReached = false;
      this.owner.currentAttackType = null;
      this.owner.isInvulnerable = false;
      
      // Force animation update to return to idle
      this.owner.currentAnimation = null;
      this.owner.animation.update();
    }
  }

// Handles player health, damage, and death
class HealthComponent extends Component {
    init() {
        // Get class stats from config
        const classConfig = PLAYER_CONFIG.classes[this.owner.characterClass];
        this.owner.maxHitPoints = classConfig.hitPoints;
        this.owner.hitPoints = this.owner.maxHitPoints;
        
        this.owner.isDying = false;
        this.owner.isDead = false;
        this.owner.isTakingDamage = false;
        this.owner.damageStunDuration = PLAYER_CONFIG.damage.stunDuration;
        this.owner.damageStunTimer = 0;
        
        // Initial spawn protection
        this.owner.isInvulnerable = true;
        this.owner.spawnProtectionTimer = 3.0;
        // Player spawned with initial protection
    }
    
    update(deltaTime) {
        // Process spawn protection timer
        if (this.owner.spawnProtectionTimer > 0) {
            this.owner.spawnProtectionTimer -= deltaTime;
            if (this.owner.spawnProtectionTimer <= 0) {
                this.owner.isInvulnerable = false;
                this.owner.spawnProtectionTimer = 0;
            }
        }
        
        // Process damage stun timer if active
        if (this.owner.isTakingDamage) {
            this.owner.damageStunTimer -= deltaTime;
            if (this.owner.damageStunTimer <= 0) {
                this.owner.isTakingDamage = false;
                this.owner.damageStunTimer = 0;
                // Force animation update to return to normal animations
                this.owner.currentAnimation = null;
                this.owner.animation.update();
            }
        }
    }
    
    takeDamage(amount) {
        // Check for invulnerability
        if (this.owner.isInvulnerable) {
          // Attack blocked by invulnerability
          return;
        }
        
        // Player took damage
        this.owner.hitPoints -= amount;
        
        // Don't play take damage animation if already dead or dying
        if (this.owner.hitPoints <= 0 || this.owner.isDying || this.owner.isDead) {
          if (this.owner.hitPoints <= 0 && !this.owner.isDying && !this.owner.isDead) {
            this.die();
          }
          return;
        }
        
        // Start take damage stun and animation
        this.owner.isTakingDamage = true;
        this.owner.damageStunTimer = this.owner.damageStunDuration;
        
        // Play take damage animation
        this.owner.animation.playDamageAnimation();
      }
    
    die() {
        // Prevent multiple death triggers
        if (this.owner.isDying || this.owner.isDead) {
            return;
        }
        
        // Player died
        this.owner.isDying = true;
        this.owner.isDead = true;
        
        // Play death animation
        this.owner.animation.playDeathAnimation();
    }
    
    respawn() {
        // Prevent multiple respawn calls
        if (!this.owner.isDead) {
            return;
        }
        
        // Player respawning
        
        // Reset health to correct values
        this.owner.maxHitPoints = this.getClassHitPoints();
        this.owner.hitPoints = this.owner.maxHitPoints;
        
        // Reset position to center of map
        this.owner.position.x = window.game.systems.world.width / 2 * window.game.systems.world.tileSize;
        this.owner.position.y = window.game.systems.world.height / 2 * window.game.systems.world.tileSize;
        
        // Reset state
        this.owner.isDying = false;
        this.owner.isDead = false;
        this.owner.isAttacking = false;
        this.owner.attackCooldown = 0;
        this.owner.currentAttackType = null;
        this.owner.attackHitFrameReached = false;
        
        // Add spawn protection
        this.owner.isInvulnerable = true;
        this.owner.spawnProtectionTimer = 3.0; // 3 seconds of protection
        // Player respawned with spawn protection
        
        // Reset animation to idle and clear any death animation
        this.owner.currentAnimation = null;
        if (this.owner.animatedSprite && this.owner.animatedSprite.parent) {
            this.owner.sprite.removeChild(this.owner.animatedSprite);
            this.owner.animatedSprite = null;
        }
        this.owner.animation.update();
    }
    
    getClassHitPoints() {
        return this.owner.maxHitPoints ||
               PLAYER_CONFIG.classes[this.owner.characterClass]?.hitPoints || 2;
    }
}

// Tracks player statistics like kills, experience and level
class StatsComponent extends Component {
    init() {
        this.owner.killCount = 0;
        this.owner.experience = 0; // total accumulated XP
        this.owner.level = 1;
        this.owner.rollUnlocked = false;
        // Level progression bonuses
        this.owner.moveSpeedBonus = 0;
        this.owner.attackRecoveryBonus = 0;
        this.owner.attackCooldownBonus = 0;
    }

    // XP needed to go from (level-1) to level
    getXpForNextLevel() {
        const growth = PLAYER_CONFIG.levels?.xpGrowth || 20;
        const isPlaytestMode = true; // Match server setting
        const xpPerLevel = 20;
        
        if (isPlaytestMode) {
            return xpPerLevel;
        } else {
            return this.owner.level * growth;
        }
    }

    // Total XP required to reach a specific level
    getTotalXpForLevel(level) {
        const growth = PLAYER_CONFIG.levels?.xpGrowth || 20;
        const isPlaytestMode = true; // Match server setting
        const xpPerLevel = 20;
        
        if (isPlaytestMode) {
            return (level - 1) * xpPerLevel;
        } else {
            return (level - 1) * level / 2 * growth;
        }
    }

    getXpUntilNextLevel() {
        const maxLevel = PLAYER_CONFIG.levels?.maxLevel || 10;
        if (this.owner.level >= maxLevel) return 0;
        const nextLevelXp = this.getTotalXpForLevel(this.owner.level + 1);
        return Math.max(0, nextLevelXp - this.owner.experience);
    }

    addExperience(amount) {
        this.owner.experience += amount;
        this.checkLevelUp();
    }

    recordKill(monsterType) {
        this.owner.killCount++;
        const xpGain = MONSTER_CONFIG.stats[monsterType]?.xp || 0;
        this.addExperience(xpGain);
    }

    checkLevelUp() {
        const maxLevel = PLAYER_CONFIG.levels?.maxLevel || 10;
        let leveledUp = false;
        while (this.owner.level < maxLevel && this.owner.experience >= this.getTotalXpForLevel(this.owner.level + 1)) {
            this.owner.level++;
            leveledUp = true;
            this.applyLevelBonus(this.owner.level);
            // Restore health to full on level up
            this.owner.hitPoints = this.owner.health.getClassHitPoints();
        }

        if (leveledUp && this.owner.playLevelUpEffect) {
            this.owner.playLevelUpEffect();
        }
    }

    applyLevelBonus(level) {
        // CLIENT-SIDE LEVEL BONUSES DISABLED
        // Let server handle all level bonuses to prevent desync with movement prediction
        // Server will send playerLevelUp event with correct bonuses
        
        // Only apply visual/local effects that don't affect server authority
        switch (level) {
            case 2:
            case 6:
                // moveSpeed bonus applied by server
                break;
            case 3:
            case 7:
                // attack recovery bonus applied by server
                break;
            case 4:
            case 8:
                // attack cooldown bonus applied by server
                break;
            case 5:
                // roll unlock applied by server
                break;
            case 9:
                // Future move unlock placeholder
                break;
            case 10:
                // maxHP bonus applied by server
                break;
        }
    }

    modifyAttackRecovery(amount) {
        const key = PLAYER_CONFIG.attacks[`${this.owner.characterClass}_primary`] ?
                    `${this.owner.characterClass}_primary` : 'primary';
        const attack = PLAYER_CONFIG.attacks[key];
        attack.recoveryTime = Math.max(0, (attack.recoveryTime || 0) + amount);
    }

    modifyAttackCooldown(amount) {
        const key = PLAYER_CONFIG.attacks[`${this.owner.characterClass}_secondary`] ?
                    `${this.owner.characterClass}_secondary` : 'secondary';
        const attack = PLAYER_CONFIG.attacks[key];
        attack.cooldown = Math.max(0, (attack.cooldown || 0) + amount);
    }
}

export class Player {
    constructor(options) {
        // Use factory to create complete state with all required fields
        // This prevents the undefined moveSpeed/level bugs we experienced
        const playerState = createPlayerState({
            id: options.id || 'local-player',
            characterClass: options.class || 'bladedancer',
            x: options.x,
            y: options.y,
            level: options.level || 1,
            experience: options.experience || 0,
            hp: options.hp,
            maxHp: options.maxHp,
            moveSpeed: options.moveSpeed,
            moveSpeedBonus: options.moveSpeedBonus || 0,
            attackRecoveryBonus: options.attackRecoveryBonus || 0,
            attackCooldownBonus: options.attackCooldownBonus || 0,
            rollUnlocked: options.rollUnlocked || false,
            facing: options.facing || 'down'
        });
        
        // Validate the created state has all required fields
        validatePlayerState(playerState);
        
        // Apply the complete state to this instance
        Object.assign(this, playerState);
        
        // Non-state properties for rendering and systems
        this.combatSystem = options.combatSystem;
        this.spriteManager = options.spriteManager;
        
        // Create sprite container
        this.sprite = new PIXI.Container();
        this.sprite.position.set(this.position.x, this.position.y);
        
        // Initialize components
        this.components = {};
        
        // Add components and provide direct access
        this.addComponent('movement', new MovementComponent(this));
        this.addComponent('animation', new AnimationComponent(this));
        this.addComponent('combat', new CombatComponent(this));
        this.addComponent('health', new HealthComponent(this));
        this.addComponent('stats', new StatsComponent(this));
        
        // Initialize all components
        Object.values(this.components).forEach(component => component.init());
    }
    
    addComponent(name, component) {
        this.components[name] = component;
        this[name] = component; // Provide direct access, e.g., player.animation
    }
    
    update(deltaTime, inputState) {
        // Update health component first
        this.health.update(deltaTime);
        
        // If taking damage or dying, don't process other components except animation
        if (this.isTakingDamage || this.isDying || this.isDead) {
            // Only update animation and sprite position
            this.sprite.position.set(this.position.x, this.position.y);
            this.animation.update();
            return;
        }
        
        // Update combat before movement (priority for attack inputs)
        this.combat.update(deltaTime, inputState);
        
        // Don't process movement if attacking
        if (!this.isAttacking) {
            this.movement.update(deltaTime, inputState);
        } else {
            // Just update sprite position
            this.sprite.position.set(this.position.x, this.position.y);
        }
        
        // Always update animation last
        this.animation.update();
        
        // Apply tints after all updates
        this.animation.applyCurrentTints();
    }

    /**
     * Handle non-movement updates during client prediction
     * Used when client prediction handles movement but other systems still need updates
     */
    handleNonMovementUpdate(deltaTime, inputState) {
        // Update health component first
        this.health.update(deltaTime);
        
        // If taking damage or dying, don't process other components except animation
        if (this.isTakingDamage || this.isDying || this.isDead) {
            // Only update animation - position is handled by prediction
            this.animation.update();
            return;
        }
        
        // Update facing from mouse (prediction doesn't handle this)
        if (inputState.mousePosition) {
            this.movement.updateFacingFromMouse(inputState.mousePosition);
        }
        
        // Update movement state for animations (but not position)
        this.updateMovementStateForAnimation(inputState);
        
        // Update combat (for attacks, but not movement)
        this.combat.update(deltaTime, inputState);
        
        // Always update animation last
        this.animation.update();
        
        // Apply tints after all updates
        this.animation.applyCurrentTints();
    }
    
    /**
     * Update movement state for animation without changing position
     */
    updateMovementStateForAnimation(inputState) {
        // Check if we're moving based on input
        const isMoving = inputState.up || inputState.down || inputState.left || inputState.right;
        this.isMoving = isMoving;
        
        // Update movement direction for animation
        if (isMoving && !this.isAttacking) {
            let vx = 0, vy = 0;
            if (inputState.up) vy = -1;
            if (inputState.down) vy = 1;
            if (inputState.left) vx = -1;
            if (inputState.right) vx = 1;
            
            // Use the same logic as MovementComponent
            this.movementDirection = velocityToDirectionString(vx, vy);
        } else {
            this.movementDirection = null;
        }
        
        // Update lastFacing for animation system
        this.lastFacing = this.facing;
    }
    
    // Public API methods (accessible to other systems)
    takeDamage(amount) {
        this.health.takeDamage(amount);
    }
    
    getClassHitPoints() {
        return this.health.getClassHitPoints();
    }
    
    getClassMoveSpeed() {
        return PLAYER_CONFIG.classes[this.characterClass]?.moveSpeed || 4;
    }

playLevelUpEffect() {
    // Use the combat system to create the level-up effect
    if (this.combatSystem) {
        this.combatSystem.createEffect(
            'level_up_effect',
            this.position,
            this.facing,
            this,
            true // useRawPosition = true to center on player
        );
    }
    
    // Level up effect played
}
}