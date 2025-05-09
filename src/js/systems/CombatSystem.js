import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG } from '../config/GameConfig.js';
import { Projectile } from '../entities/Projectile.js';

// Base Hitbox class - handles both visualization and hit detection
class Hitbox {
  constructor(position, facing, params, visualConfig) {
    this.position = position;
    this.facing = facing;
    this.params = params;
    this.visualConfig = visualConfig;
    this.graphics = null;
  }
  
  // To be implemented by subclasses
  draw() { throw new Error("Method 'draw' must be implemented"); }
  testHit(target, targetRadius = 0) { throw new Error("Method 'testHit' must be implemented"); }
  
  // Convert facing direction to angle in radians
  getFacingRadians() {
    switch(this.facing) {
      case 'right': return 0;
      case 'down-right': return Math.PI / 4;
      case 'down': return Math.PI / 2;
      case 'down-left': return 3 * Math.PI / 4;
      case 'left': return Math.PI;
      case 'up-left': return 5 * Math.PI / 4;
      case 'up': return 3 * Math.PI / 2;
      case 'up-right': return 7 * Math.PI / 4;
      default: return 0;
    }
  }
  
  // Convert facing direction to angle in degrees
  getFacingDegrees() {
    switch(this.facing) {
      case 'right': return 0;
      case 'down-right': return 45;
      case 'down': return 90;
      case 'down-left': return 135;
      case 'left': return 180;
      case 'up-left': return 225;
      case 'up': return 270;
      case 'up-right': return 315;
      default: return 0;
    }
  }
}

// Rectangle hitbox implementation
class RectangleHitbox extends Hitbox {
  draw() {
    const graphics = new PIXI.Graphics();
    graphics.position.set(this.position.x, this.position.y);
    
    graphics.beginFill(this.visualConfig.color, this.visualConfig.fillAlpha);
    graphics.lineStyle(this.visualConfig.lineWidth, this.visualConfig.color, this.visualConfig.lineAlpha);
    
    // Draw rectangle pointing upward first
    graphics.drawRect(-this.params.width / 2, -this.params.length, this.params.width, this.params.length);
    
    // Rotate to match facing direction
    graphics.rotation = this.getFacingRadians() + Math.PI / 2;
    
    graphics.endFill();
    this.graphics = graphics;
    return graphics;
  }
  
  testHit(target, targetRadius = 0) {
    // Get relative position
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    
    // Get facing angle with the same rotation as the visual
    const facingRadians = this.getFacingRadians() + Math.PI / 2;
    
    // Rotate point to align with rectangle
    const rotX = dx * Math.cos(-facingRadians) - dy * Math.sin(-facingRadians);
    const rotY = dx * Math.sin(-facingRadians) + dy * Math.cos(-facingRadians);
    
    // Check if point is inside rectangle with radius adjustment
    return (
      rotX >= -this.params.width / 2 - targetRadius && 
      rotX <= this.params.width / 2 + targetRadius && 
      rotY >= -this.params.length - targetRadius && 
      rotY <= 0 + targetRadius
    );
  }
}

// Cone hitbox implementation
class ConeHitbox extends Hitbox {
  draw() {
    const graphics = new PIXI.Graphics();
    graphics.position.set(this.position.x, this.position.y);
    
    // Calculate angles for the arc
    const facingAngle = this.getFacingRadians();
    const halfArcAngle = (this.params.angle / 2) * (Math.PI / 180);
    const startAngle = facingAngle - halfArcAngle;
    const endAngle = facingAngle + halfArcAngle;
    
    // Draw the attack arc
    graphics.beginFill(this.visualConfig.color, this.visualConfig.fillAlpha);
    graphics.moveTo(0, 0);
    graphics.arc(0, 0, this.params.range, startAngle, endAngle);
    graphics.lineTo(0, 0);
    graphics.endFill();
    
    // Draw outline if needed
    graphics.lineStyle(this.visualConfig.lineWidth, this.visualConfig.color, this.visualConfig.lineAlpha);
    graphics.arc(0, 0, this.params.range, startAngle, endAngle);
    graphics.moveTo(0, 0);
    graphics.lineTo(Math.cos(startAngle) * this.params.range, Math.sin(startAngle) * this.params.range);
    graphics.moveTo(0, 0);
    graphics.lineTo(Math.cos(endAngle) * this.params.range, Math.sin(endAngle) * this.params.range);
    
    this.graphics = graphics;
    return graphics;
  }
  
  testHit(target, targetRadius = 0) {
    // Get relative position
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Adjust distance by target radius
    const adjustedDistance = distance - targetRadius;
    
    // Check range first
    if (adjustedDistance > this.params.range) {
      return false;
    }
    
    // Calculate angle to target in degrees
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360; // Convert to 0-360 range
    
    // Get facing angle in degrees
    const facingAngle = this.getFacingDegrees();
    
    // Calculate angle difference
    let angleDiff = Math.abs(angle - facingAngle);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    
    // Check if target is within cone angle
    return angleDiff <= this.params.angle / 2;
  }
}

class CircleHitbox extends Hitbox {
  draw() {
    const graphics = new PIXI.Graphics();
    graphics.position.set(this.position.x, this.position.y);
    
    graphics.beginFill(this.visualConfig.color, this.visualConfig.fillAlpha);
    graphics.lineStyle(this.visualConfig.lineWidth, this.visualConfig.color, this.visualConfig.lineAlpha);
    
    // Draw circle
    graphics.drawCircle(0, 0, this.params.radius);
    
    graphics.endFill();
    this.graphics = graphics;
    return graphics;
  }
  
  testHit(target, targetRadius = 0) {
    // Get distance between circle center and target
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Hit if target is within circle (accounting for target size)
    return distance <= this.params.radius + targetRadius;
  }
}

// The refactored CombatSystem
export class CombatSystem {
  constructor(app) {
    this.app = app;
    this.activeAttacks = [];
    this.projectiles = []; // Array to store active projectiles
    this.effectConfigs = PLAYER_CONFIG.effects;
    this.attackConfigs = PLAYER_CONFIG.attacks;
  }
  
  update(deltaTime) {
    // Update and remove finished attack visuals
    for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
      const attack = this.activeAttacks[i];
      attack.lifetime -= deltaTime;
      
      if (attack.lifetime <= 0) {
        if (attack.hitbox && attack.hitbox.graphics) {
          window.game.entityContainer.removeChild(attack.hitbox.graphics);
        }
        this.activeAttacks.splice(i, 1);
      }
    }

        // Update projectiles
        this.updateProjectiles(deltaTime);
  }
  
  updateProjectiles(deltaTime) {
    // Update and check collisions for all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const projectile = this.projectiles[i];
        
        // Skip inactive projectiles
        if (!projectile.active) {
            this.projectiles.splice(i, 1);
            continue;
        }
        
        // Update projectile position
        projectile.update(deltaTime);
        
        // Check for collisions with monsters
        const monsters = window.game.systems.monsters.monsters;
        for (const monster of monsters) {
            if (!monster.alive) continue;
            
            if (projectile.checkCollision(monster)) {
                // Apply damage to monster
                monster.takeDamage(projectile.damage);
                
                // Deactivate projectile after hit
                projectile.deactivate();
                break;
            }
        }
    }
}
// Add a method to create projectiles
createProjectile(x, y, angle, owner, options = {}) {
  console.log(`Creating projectile at (${x}, ${y}) with angle ${angle}`);
  
  // Calculate velocity components
  const velocityX = Math.cos(angle);
  const velocityY = Math.sin(angle);
  
  // Create projectile
  const projectile = new Projectile({
    x: x,
    y: y,
    velocityX: velocityX,
    velocityY: velocityY,
    speed: options.speed || 600,
    damage: options.damage || 1,
    range: options.range || 400,
    owner: owner
  });
  
  // Add projectile to game
  window.game.entityContainer.addChild(projectile.sprite);
  
  // Create visual effect for the arrow
  const effectType = options.effectType || 'bow_shot_effect'; // Default to rogue thrust effect
  const effectSprite = this.createProjectileVisualEffect(projectile, effectType, angle);
  if (effectSprite) {
    projectile.attachVisualEffect(effectSprite);
  }
  
  // Add to active projectiles list
  this.projectiles.push(projectile);
  
  return projectile;
}

createProjectileVisualEffect(projectile, effectType, angle) {
  const spriteManager = window.game.systems.sprites;
  const sprite = spriteManager.createAnimatedSprite(effectType);
  
  if (!sprite) {
      console.error(`Failed to create effect ${effectType}`);
      return null;
  }
  
  // Get config if available
  const config = this.effectConfigs[effectType];
  
  // Set scale
  const scale = config && config.scale ? config.scale : 1.5;
  sprite.scale.set(scale, scale);
  
  // Set animation speed
  sprite.animationSpeed = config && config.animationSpeed ? config.animationSpeed : 0.5;
  sprite.loop = true;
  
  // Start the animation
  sprite.play();
  
  return sprite;
}

getFacingAngle(facing) {
  switch(facing) {
      case 'right': return 0;
      case 'down-right': return Math.PI / 4;
      case 'down': return Math.PI / 2;
      case 'down-left': return 3 * Math.PI / 4;
      case 'left': return Math.PI;
      case 'up-left': return 5 * Math.PI / 4;
      case 'up': return 3 * Math.PI / 2;
      case 'up-right': return 7 * Math.PI / 4;
      default: return 0;
  }
}

executeAttack(entity, attackType) {
  // Get attack config based on character class
  let attackConfig;
  
  // Check for class-specific attacks
  if (entity.characterClass === 'guardian') {
    if (attackType === 'primary') {
      attackConfig = PLAYER_CONFIG.attacks.guardian_primary;
    } else if (attackType === 'secondary') {
      attackConfig = PLAYER_CONFIG.attacks.guardian_secondary;
    }
  } else if (entity.characterClass === 'rogue') {
    if (attackType === 'primary') {
      attackConfig = PLAYER_CONFIG.attacks.rogue_primary;
    } else if (attackType === 'secondary') {
      attackConfig = PLAYER_CONFIG.attacks.rogue_secondary;
    }
  } else if (entity.characterClass === 'hunter') {
    if (attackType === 'primary') {
      attackConfig = PLAYER_CONFIG.attacks.hunter_primary;
    } else {
      // Default to standard attacks for now
      attackConfig = PLAYER_CONFIG.attacks[attackType];
    }
  } else {
    // Default to standard attacks for other classes
    attackConfig = PLAYER_CONFIG.attacks[attackType];
  }
  
  if (!attackConfig) {
    console.error(`Attack type ${attackType} not configured`);
    return 0;
  }
  
  // Start attack sequence
  console.log(`${entity.constructor.name} executing ${attackConfig.name}`);
  
  // Play immediate effects (timing = 0)
  this.playEffectsForTiming(entity, attackConfig, 0);
  
  // Special handling for Guardian's jump attack
  if (entity.characterClass === 'guardian' && attackType === 'secondary') {
    // Calculate the jump destination based on facing direction
    const jumpDestination = this.calculateJumpDestination(
      entity.position, 
      entity.facing, 
      attackConfig.dashDistance
    );
    
    // Execute jump sequence
    return this.executeJumpAttack(entity, jumpDestination, attackConfig);
  }

  // Special handling for Rogue's dash attack
  if (entity.characterClass === 'rogue' && attackType === 'secondary') {
    // Calculate the dash destination based on facing direction
    const dashDestination = this.calculateJumpDestination(
      entity.position, 
      entity.facing, 
      attackConfig.dashDistance
    );
    
    // Execute dash sequence
    return this.executeDashAttack(entity, dashDestination, attackConfig);
  }
  
  // Special handling for hunter's bow attack
  if (entity.characterClass === 'hunter' && attackType === 'primary') {
    // Schedule arrow creation after windup
    setTimeout(() => {
      if (entity.isAttacking && entity.currentAttackType === attackType) {
        // Calculate arrow position 
        const facingAngle = this.getFacingAngle(entity.facing);
        const arrowStart = this.calculateEffectPosition(
          entity.position, entity.facing, 30 // Offset from player
        );
        
        // Create arrow projectile with visual effect
        this.createProjectile(
          arrowStart.x, 
          arrowStart.y, 
          facingAngle, 
          entity, 
          {
            damage: attackConfig.damage,
            speed: attackConfig.projectileSpeed,
            range: attackConfig.projectileRange,
            effectType: 'bow_shot_effect'
          }
        );
        
        // Play arrow launch effect
        this.playEffectsForTiming(entity, attackConfig, attackConfig.windupTime);
      }
    }, attackConfig.windupTime);
    
    return attackConfig.cooldown;
  }
  
  // Standard attack execution for other attacks
  // Create the appropriate hitbox
  const hitbox = this.createHitbox(
    entity.position,
    entity.facing,
    attackConfig.hitboxType,
    attackConfig.hitboxParams,
    attackConfig.hitboxVisual
  );
  
  if (hitbox) {
    // Draw the hitbox and add to the game
    const graphics = hitbox.draw();
    window.game.entityContainer.addChild(graphics);
    
    // Add to active attacks
    this.activeAttacks.push({
      hitbox,
      lifetime: attackConfig.hitboxVisual.duration,
      attackType,
      entity,
      damage: attackConfig.damage
    });
  }
  
  // Schedule hit detection and effects for windup time
  setTimeout(() => {
    if (entity.isAttacking && entity.currentAttackType === attackType) {
      // Apply hit effect and play scheduled effects
      this.applyHitEffects(entity, hitbox, attackConfig.damage);
      this.playEffectsForTiming(entity, attackConfig, attackConfig.windupTime);
    }
  }, attackConfig.windupTime);
  
  // Schedule any effects that happen after windup
  attackConfig.effectSequence.forEach(effect => {
    if (effect.timing > attackConfig.windupTime) {
      setTimeout(() => {
        if (entity.isAttacking && entity.currentAttackType === attackType) {
          this.createEffect(effect.type, entity.position, entity.facing, entity);
        }
      }, effect.timing);
    }
  });
  
  return attackConfig.cooldown;
}

// New method for projectile attacks
executeProjectileAttack(entity, attackConfig, attackType) {
  // Schedule arrow creation after windup
  setTimeout(() => {
    if (entity.isAttacking && entity.currentAttackType === attackType) {
      // Calculate arrow position 
      const facingAngle = this.getFacingAngle(entity.facing);
      const arrowStart = this.calculateEffectPosition(
        entity.position, entity.facing, 30 // Offset from player
      );
      
      // Create arrow projectile with visual effect
      this.createProjectile(
        arrowStart.x, 
        arrowStart.y, 
        facingAngle, 
        entity, 
        {
          damage: attackConfig.damage,
          speed: attackConfig.projectileSpeed,
          range: attackConfig.projectileRange,
          effectType: 'bow_shot_effect'
        }
      );
      
      // Play arrow launch effect
      this.playEffectsForTiming(entity, attackConfig, attackConfig.windupTime);
    }
  }, attackConfig.windupTime);
  
  return attackConfig.cooldown;
}

// New method for standard melee attacks
executeStandardAttack(entity, attackConfig, attackType) {
  // Create the appropriate hitbox
  const hitbox = this.createHitbox(
    entity.position,
    entity.facing,
    attackConfig.hitboxType,
    attackConfig.hitboxParams,
    attackConfig.hitboxVisual
  );
  
  if (hitbox) {
    // Draw the hitbox and add to the game
    const graphics = hitbox.draw();
    window.game.entityContainer.addChild(graphics);
    
    // Add to active attacks
    this.activeAttacks.push({
      hitbox,
      lifetime: attackConfig.hitboxVisual.duration,
      attackType,
      entity,
      damage: attackConfig.damage
    });
  }
  
  // Schedule hit detection and effects for windup time
  setTimeout(() => {
    if (entity.isAttacking && entity.currentAttackType === attackType) {
      // Apply hit effect and play scheduled effects
      this.applyHitEffects(entity, hitbox, attackConfig.damage);
      this.playEffectsForTiming(entity, attackConfig, attackConfig.windupTime);
    }
  }, attackConfig.windupTime);
  
  // Schedule any effects that happen after windup
  attackConfig.effectSequence.forEach(effect => {
    if (effect.timing > attackConfig.windupTime) {
      setTimeout(() => {
        if (entity.isAttacking && entity.currentAttackType === attackType) {
          this.createEffect(effect.type, entity.position, entity.facing, entity);
        }
      }, effect.timing);
    }
  });
  
  return attackConfig.cooldown;
}

executeJumpAttack(entity, destination, attackConfig) {
  const startPosition = { ...entity.position };
  
  console.log("Attack Config:", attackConfig);

  // Set invulnerability immediately if configured
  if (attackConfig.invulnerable) {
    entity.isInvulnerable = true;
  }
  
  // 1. Wind-up phase
  setTimeout(() => {
    if (!entity.isAttacking) return; // Cancel if player stopped attacking
    
    // 2. Jump phase - animate movement to destination
    // Set up the animation parameters
    const jumpStartTime = performance.now();
    const jumpDuration = attackConfig.jumpDuration;
    const peakHeight = 80; // Maximum height of the jump arc in pixels
    
    // Animation function
    const animateJumpFrame = (timestamp) => {
      // Calculate how far through the animation we are (0 to 1)
      const elapsed = timestamp - jumpStartTime;
      const progress = Math.min(elapsed / jumpDuration, 1);
      
      // If player stopped attacking or animation is complete, exit
      if (!entity.isAttacking || progress >= 1) {
        entity.position.x = destination.x;
        entity.position.y = destination.y;
        entity.sprite.position.set(destination.x, destination.y);
        return;
      }
      
      // Linear interpolation for horizontal movement
      entity.position.x = startPosition.x + (destination.x - startPosition.x) * progress;
      entity.position.y = startPosition.y + (destination.y - startPosition.y) * progress;
      
      // Parabolic arc for vertical jump height
      // sin(π * progress) creates a nice arc that starts and ends at 0
      const jumpHeight = Math.sin(Math.PI * progress) * peakHeight;
      
      // Apply position with jump height
      entity.sprite.position.set(entity.position.x, entity.position.y - jumpHeight);
      
      // Continue animation
      requestAnimationFrame(animateJumpFrame);
    };
    
    // Start the animation
    requestAnimationFrame(animateJumpFrame);
    
    // Schedule landing effects and damage
    setTimeout(() => {
      if (!entity.isAttacking) return; // Cancel if player stopped attacking
      
      // 3. Landing phase
      console.log("Guardian landed from jump attack!");
      
      // Create circular hitbox at landing position
      const hitbox = this.createHitbox(
        entity.position,
        entity.facing,
        attackConfig.hitboxType,
        attackConfig.hitboxParams,
        attackConfig.hitboxVisual
      );
      
      if (hitbox) {
        // Draw the hitbox and add to the game
        const graphics = hitbox.draw();
        window.game.entityContainer.addChild(graphics);
        
        // Add to active attacks
        this.activeAttacks.push({
          hitbox,
          lifetime: attackConfig.hitboxVisual.duration,
          attackType: 'secondary',
          entity,
          damage: attackConfig.damage
        });
        
        // Apply AOE damage on landing
        this.applyHitEffects(entity, hitbox, attackConfig.damage);
      }
      
      // Create the effect at the landing position
      this.createEffect('guardian_jump_effect', entity.position, entity.facing, null, true);
      
      // End invulnerability
      entity.isInvulnerable = false;
      
      // Schedule recovery end
      setTimeout(() => {
        if (entity.isAttacking) {
          // End attack state
          entity.combat.endAttack();
        }
      }, attackConfig.recoveryTime);
      
    }, attackConfig.jumpDuration);
    
  }, attackConfig.windupTime);
  
  return attackConfig.cooldown;
}

executeDashAttack(entity, destination, attackConfig) {
  const startPosition = { ...entity.position };

  // 1. Wind-up phase
  setTimeout(() => {
    if (!entity.isAttacking) return; // Cancel if player stopped attacking
    
    // 2. Dash phase - animate movement to destination
    const dashStartTime = performance.now();
    const dashDuration = attackConfig.dashDuration;
    
    // Create rectangular hitbox along the dash path immediately
    const hitbox = this.createHitbox(
      startPosition,
      entity.facing,
      attackConfig.hitboxType,
      attackConfig.hitboxParams,
      attackConfig.hitboxVisual
    );
    
    if (hitbox) {
      // Draw the hitbox and add to the game
      const graphics = hitbox.draw();
      window.game.entityContainer.addChild(graphics);
      
      // Add to active attacks
      this.activeAttacks.push({
        hitbox,
        lifetime: attackConfig.hitboxVisual.duration,
        attackType: 'secondary',
        entity,
        damage: attackConfig.damage
      });
      
      // Apply immediate damage to anything in the path
      this.applyHitEffects(entity, hitbox, attackConfig.damage);
    }
    
    // Set up a variable to track the last effect position
    let lastEffectTime = 0;
    const effectInterval = 50; // Spawn an effect every 50ms
    
    // Animation function with effect trail
    const animateDashFrame = (timestamp) => {
      // Calculate how far through the animation we are (0 to 1)
      const elapsed = timestamp - dashStartTime;
      const progress = Math.min(elapsed / dashDuration, 1);
      
      // If player stopped attacking or animation is complete, exit
      if (!entity.isAttacking || progress >= 1) {
        entity.position.x = destination.x;
        entity.position.y = destination.y;
        entity.sprite.position.set(destination.x, destination.y);
        
        // Final effect at destination
        this.createEffect('rogue_dash_effect', entity.position, entity.facing, null, true);
        return;
      }
      
      // Linear interpolation for movement
      entity.position.x = startPosition.x + (destination.x - startPosition.x) * progress;
      entity.position.y = startPosition.y + (destination.y - startPosition.y) * progress;
      
      // Apply position
      entity.sprite.position.set(entity.position.x, entity.position.y);
      
      // Add effects along the path at regular intervals
      if (timestamp - lastEffectTime > effectInterval) {
        lastEffectTime = timestamp;
        this.createEffect('rogue_dash_effect', { ...entity.position }, entity.facing, null, true);
      }
      
      // Continue animation
      requestAnimationFrame(animateDashFrame);
    };
    
    // Start the animation
    requestAnimationFrame(animateDashFrame);
    
    // Create initial effect at start position
    this.createEffect('rogue_dash_effect', startPosition, entity.facing, null, true);
    
    // End attack state after full sequence
    setTimeout(() => {
      if (entity.isAttacking) {
        entity.combat.endAttack();
      }
    }, attackConfig.dashDuration + attackConfig.recoveryTime);
    
  }, attackConfig.windupTime);
  
  return attackConfig.cooldown;
}
  
  // Create a hitbox based on attack type
  createHitbox(position, facing, type, params, visualConfig) {
    switch (type) {
      case 'rectangle':
        return new RectangleHitbox(position, facing, params, visualConfig);
      case 'cone':
        return new ConeHitbox(position, facing, params, visualConfig);
      case 'circle':
        return new CircleHitbox(position, facing, params, visualConfig);
      default:
        console.error(`Unknown hitbox type: ${type}`);
        return null;
    }
  }
  
  // Apply damage to entities in hitbox
  applyHitEffects(entity, hitbox, damage) {
    if (!hitbox) return;
    
    const monsters = window.game.systems.monsters.monsters;
    
    for (const monster of monsters) {
      if (!monster.alive) continue;
      
      if (hitbox.testHit(monster, monster.collisionRadius || 0)) {
        monster.takeDamage(damage);
      }
    }
  }
  
  // Play effects for specific timing
  playEffectsForTiming(entity, attackConfig, timing) {
    attackConfig.effectSequence.forEach(effect => {
      if (effect.timing === timing) {
        this.createEffect(effect.type, entity.position, entity.facing, entity);
      } else if (effect.timing > 0 && effect.timing <= timing && effect.type === 'strike_cast') {
        // Special case for strike_cast effect
        const effectConfig = this.effectConfigs[effect.type];
        const aoePosition = this.calculateEffectPosition(
          entity.position, entity.facing, effectConfig.offsetDistance
        );
        this.createEffect(effect.type, aoePosition, entity.facing, null, true);
      }
    });
  }
  
  // Create a visual effect sprite 
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
    
    // Calculate position
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
    
    // Set scale with flipping if needed
    let scaleX = config.scale;
    let scaleY = config.scale;
    
    if (config.flipX) scaleX = -scaleX;
    if (config.flipY) scaleY = -scaleY;
    
    sprite.scale.set(scaleX, scaleY);
    
    // Set rotation based on facing direction
    sprite.rotation = this.calculateEffectRotation(facing, config.rotationOffset);
    
    sprite.play();
    
    // Add to entity container
    window.game.entityContainer.addChild(sprite);
    
    // Set up follow behavior if needed
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
  
  calculateEffectPosition(basePosition, facing, distance) {
    if (distance === 0) return { ...basePosition };
    
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

  calculateJumpDestination(position, facing, distance) {
    let dx = 0;
    let dy = 0;
    
    // Calculate offset based on facing direction
    switch(facing) {
      case 'right':      dx = distance; break;
      case 'down-right': dx = distance * 0.7; dy = distance * 0.7; break;
      case 'down':       dy = distance; break;
      case 'down-left':  dx = -distance * 0.7; dy = distance * 0.7; break;
      case 'left':       dx = -distance; break;
      case 'up-left':    dx = -distance * 0.7; dy = -distance * 0.7; break;
      case 'up':         dy = -distance; break;
      case 'up-right':   dx = distance * 0.7; dy = -distance * 0.7; break;
    }
    
    // Return destination coordinates
    return {
      x: position.x + dx,
      y: position.y + dy
    };
  }

  
  calculateEffectRotation(facing, baseRotation) {
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
  
  setupEffectFollowBehavior(sprite, target, duration) {
    let elapsedTime = 0;
    const initialOffset = {
      x: sprite.position.x - target.position.x,
      y: sprite.position.y - target.position.y
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
}