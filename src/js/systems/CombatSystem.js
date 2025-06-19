// src/js/systems/CombatSystem.js
import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG } from '../config/GameConfig.js';
import { 
    directionStringToAngleRadians, 
    directionStringToAngleDegrees 
} from '../utils/DirectionUtils.js';

// Base Hitbox class
class Hitbox {
  constructor(position, facing, params, visualConfig) {
    this.position = position;
    this.facing = facing;
    this.params = params;
    this.visualConfig = visualConfig;
    this.graphics = null;
  }
  draw() { throw new Error("Method 'draw' must be implemented"); }
  testHit(target, targetRadius = 0) { throw new Error("Method 'testHit' must be implemented"); }
  getFacingRadians() { return directionStringToAngleRadians(this.facing); }
  getFacingDegrees() { return directionStringToAngleDegrees(this.facing); }
}

// Rectangle hitbox implementation
class RectangleHitbox extends Hitbox {
  draw() {
    const graphics = new PIXI.Graphics();
    graphics.position.set(this.position.x, this.position.y);
    graphics.beginFill(this.visualConfig.color, this.visualConfig.fillAlpha);
    graphics.lineStyle(this.visualConfig.lineWidth, this.visualConfig.color, this.visualConfig.lineAlpha);
    graphics.drawRect(-this.params.width / 2, -this.params.length, this.params.width, this.params.length);
    graphics.rotation = this.getFacingRadians() + Math.PI / 2;
    graphics.endFill();
    this.graphics = graphics;
    return graphics;
  }
  testHit(target, targetRadius = 0) {
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const facingRadians = this.getFacingRadians() + Math.PI / 2;
    const rotX = dx * Math.cos(-facingRadians) - dy * Math.sin(-facingRadians);
    const rotY = dx * Math.sin(-facingRadians) + dy * Math.cos(-facingRadians);
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
    const facingAngle = this.getFacingRadians();
    const halfArcAngle = (this.params.angle / 2) * (Math.PI / 180);
    const startAngle = facingAngle - halfArcAngle;
    const endAngle = facingAngle + halfArcAngle;
    graphics.beginFill(this.visualConfig.color, this.visualConfig.fillAlpha);
    graphics.moveTo(0, 0);
    graphics.arc(0, 0, this.params.range, startAngle, endAngle);
    graphics.lineTo(0, 0);
    graphics.endFill();
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
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const adjustedDistance = distance - targetRadius;
    if (adjustedDistance > this.params.range) return false;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    const facingAngle = this.getFacingDegrees();
    let angleDiff = Math.abs(angle - facingAngle);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    return angleDiff <= this.params.angle / 2;
  }
}

// Circle hitbox implementation
class CircleHitbox extends Hitbox {
  draw() {
    const graphics = new PIXI.Graphics();
    graphics.position.set(this.position.x, this.position.y);
    graphics.beginFill(this.visualConfig.color, this.visualConfig.fillAlpha);
    graphics.lineStyle(this.visualConfig.lineWidth, this.visualConfig.color, this.visualConfig.lineAlpha);
    graphics.drawCircle(0, 0, this.params.radius);
    graphics.endFill();
    this.graphics = graphics;
    return graphics;
  }
  testHit(target, targetRadius = 0) {
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.params.radius + targetRadius;
  }
}

export class CombatSystem {
  constructor(app) {
    this.app = app;
    this.activeAttacks = [];
    // Projectiles now handled server-side
    this.effectConfigs = PLAYER_CONFIG.effects;
    // this.attackConfigs = PLAYER_CONFIG.attacks; // No longer needed if passed directly
  }
  
  update(deltaTime) {
    for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
      const attack = this.activeAttacks[i];
      attack.lifetime -= deltaTime;
      if (attack.lifetime <= 0) {
        if (attack.hitbox && attack.hitbox.graphics && attack.hitbox.graphics.parent) {
          attack.hitbox.graphics.parent.removeChild(attack.hitbox.graphics);
        }
        this.activeAttacks.splice(i, 1);
      }
    }
    this.updateProjectiles(deltaTime);
  }
  
  updateProjectiles(deltaTime) {
    // Projectiles are now handled server-side
    // Client just renders them via ProjectileRenderer
  }

  createProjectile(x, y, angle, owner, options = {}) {
    console.log(`[DEBUG] Creating projectile:`, {
      position: { x: Math.round(x), y: Math.round(y) },
      angle: angle.toFixed(2) + ' rad',
      owner: {
        class: owner.characterClass,
        id: owner.id || 'local'
      },
      options: options
    });
    
    // Now we just request the server to create the projectile
    if (window.game?.network) {
      window.game.network.createProjectile({
        x,
        y,
        angle,
        speed: options.speed || 600,
        damage: options.damage || 1,
        range: options.range || 400,
        effectType: options.effectType || 'bow_shot_effect'
      });
    } else {
      console.error('No network connection to create projectile');
    }
    // No local projectile creation anymore
  }

  createProjectileVisualEffect(projectile, effectType, angle) {
    const spriteManager = window.game.systems.sprites; // Consider alternative to window.game
    const sprite = spriteManager.createAnimatedSprite(effectType);
    if (!sprite) {
        console.error(`CombatSystem: Failed to create effect ${effectType}`);
        return null;
    }
    const config = this.effectConfigs[effectType];
    sprite.scale.set(config?.scale || 1.5, config?.scale || 1.5);
    sprite.animationSpeed = config?.animationSpeed || 0.5;
    sprite.loop = true;
    sprite.play();
    return sprite;
  }

  scheduleAllAttackEffects(entity, attackConfig, attackType) {
    if (!attackConfig.effectSequence || !Array.isArray(attackConfig.effectSequence)) {
        return;
    }

    attackConfig.effectSequence.forEach(effectParams => {
        const delay = effectParams.timing; // Absolute timing from attack start

        if (typeof delay !== 'number' || delay < 0) {
            console.warn(`CombatSystem: Invalid timing for effect ${effectParams.type} in attack ${attackConfig.name}: ${delay}`);
            return;
        }

        setTimeout(() => {
            if (entity.isAttacking && entity.currentAttackType === attackType) {
                const baseEffectConfig = this.effectConfigs[effectParams.type];
                if (!baseEffectConfig) {
                    console.warn(`CombatSystem: Base config for effect type ${effectParams.type} not found.`);
                    return;
                }

                const shouldUseStartPos = effectParams.useStartPosition === true;
                const basePosition = shouldUseStartPos ? 
                                     (entity.startPositionForAttack || entity.position)
                                     : entity.position;

                const effectDistance = effectParams.hasOwnProperty('distance')
                                   ? effectParams.distance
                                   : (baseEffectConfig.offsetDistance || 0);

                const finalEffectPosition = this.calculateEffectPosition(
                    basePosition,
                    entity.facing,
                    effectDistance
                );

                this.createEffect(
                    effectParams.type,
                    finalEffectPosition,
                    entity.facing,
                    entity,
                    true // useRawPosition = true
                );
            }
        }, delay);
    });
  }

  executeAttack(entity, attackType) {
    let attackConfig;
    const classSpecificAttackKey = `${entity.characterClass}_${attackType}`;
  
    if (PLAYER_CONFIG.attacks[classSpecificAttackKey]) {
      attackConfig = PLAYER_CONFIG.attacks[classSpecificAttackKey];
    } else if (PLAYER_CONFIG.attacks[attackType]) { // Fallback to default attack type if class-specific doesn't exist
      attackConfig = PLAYER_CONFIG.attacks[attackType];
    } else {
      console.error(`CombatSystem: Attack type ${attackType} (or ${classSpecificAttackKey}) not configured for ${entity.characterClass}`);
      return 0; // No cooldown if attack not found
    }
        
    console.log(`CombatSystem: ${entity.characterClass || 'Entity'} executing ${attackConfig.name}`);
    entity.startPositionForAttack = { x: entity.position.x, y: entity.position.y };
    this.scheduleAllAttackEffects(entity, attackConfig, attackType);

    switch (attackConfig.archetype) {
      case 'standard_melee':
        return this._executeStandardMeleeAttack(entity, attackConfig, attackType);
      case 'projectile':
        return this._executeProjectileAttack(entity, attackConfig, attackType);
      case 'jump_attack':
        return this._executeJumpAttack(entity, attackConfig, attackType);
      case 'dash_attack':
        return this._executeDashAttack(entity, attackConfig, attackType);
      default:
        console.error(`CombatSystem: Unknown attack archetype: ${attackConfig.archetype} for ${attackConfig.name}`);
        return this._executeStandardMeleeAttack(entity, attackConfig, attackType); 
    }
    // Cooldown is returned by individual _execute methods
  }

  _executeStandardMeleeAttack(entity, attackConfig, attackType) {
    setTimeout(() => {
      if (entity.isAttacking && entity.currentAttackType === attackType) {
        const hitbox = this.createHitbox(
          entity.position, entity.facing,
          attackConfig.hitboxType, attackConfig.hitboxParams, attackConfig.hitboxVisual
        );
        if (hitbox) {
          const graphics = hitbox.draw();
          window.game.entityContainer.addChild(graphics); // Consider alternative to window.game
          this.activeAttacks.push({
            hitbox, lifetime: attackConfig.hitboxVisual.duration,
            attackType, entity, damage: attackConfig.damage
          });
          this.applyHitEffects(entity, hitbox, attackConfig.damage);
        }
      }
    }, attackConfig.windupTime);
    return attackConfig.cooldown;
  }

_executeProjectileAttack(entity, attackConfig, attackType) {
    const isLocalPlayer = entity === window.game?.entities?.player;
    console.log(`Executing projectile attack for ${entity.characterClass} ${attackType}, windup: ${attackConfig.windupTime}ms, isLocal: ${isLocalPlayer}`);
    setTimeout(() => {
      console.log(`Projectile windup complete. isAttacking: ${entity.isAttacking}, currentAttackType: ${entity.currentAttackType}`);
      if (entity.isAttacking && entity.currentAttackType === attackType) {
        let facingAngleRadians; // This will be the angle for the projectile's velocity vector
        let projectileStartX = entity.position.x;
        let projectileStartY = entity.position.y;
        const offset = attackConfig.projectileOffset || 0;

        // Access input system, assuming it's available via window.game.systems.input
        // This is a common pattern seen in other parts of the provided code.
        const inputSystem = window.game?.systems?.input;

        // Check if this is the LOCAL player (not a remote player)
        const isLocalPlayer = entity === window.game?.entities?.player;
        
        if (entity.characterClass === 'hunter' && attackType === 'primary' && inputSystem && isLocalPlayer) {
            // Hunter's primary attack: Use precise mouse aiming ONLY for local player
            const mousePosition = inputSystem.mouse.position; // Screen coordinates from InputSystem

            // Assuming player is at the center of the screen for aiming purposes.
            // This aligns with how player facing is determined in MovementComponent.
            const playerScreenX = window.innerWidth / 2;
            const playerScreenY = window.innerHeight / 2;

            const dx = mousePosition.x - playerScreenX;
            const dy = mousePosition.y - playerScreenY;
            facingAngleRadians = Math.atan2(dy, dx); // Precise angle in radians

            // Calculate projectile start position offset along this precise angle
            projectileStartX = entity.position.x + Math.cos(facingAngleRadians) * offset;
            projectileStartY = entity.position.y + Math.sin(facingAngleRadians) * offset;

        } else {
            // Fallback for other classes, attack types, or if input system is unavailable:
            // Use entity's 8-directional facing for both offset and projectile angle.
            facingAngleRadians = directionStringToAngleRadians(entity.facing); // Angle from 8 directions

            // Calculate start position using the 8-directional facing for the offset.
            // We can use the calculateEffectPosition method or calculate manually:
            // const tempStartPos = this.calculateEffectPosition(entity.position, entity.facing, offset);
            // projectileStartX = tempStartPos.x;
            // projectileStartY = tempStartPos.y;
            // Or, for consistency with the 'if' block:
            projectileStartX = entity.position.x + Math.cos(facingAngleRadians) * offset;
            projectileStartY = entity.position.y + Math.sin(facingAngleRadians) * offset;
        }

        this.createProjectile(
          projectileStartX,
          projectileStartY,
          facingAngleRadians, // This angle dictates the projectile's flight direction
          entity,
          {
            damage: attackConfig.damage,
            speed: attackConfig.projectileSpeed,
            range: attackConfig.projectileRange,
            effectType: attackConfig.projectileVisualEffectType || 'bow_shot_effect'
          }
        );
        
        // Clear attack state for projectile attacks after firing
        entity.isAttacking = false;
        entity.attackHitFrameReached = false;
        entity.currentAttackType = null;
      } else {
        console.log("Attack was cancelled before projectile could fire");
      }
    }, attackConfig.windupTime);
    return attackConfig.cooldown;
  }

  _executeJumpAttack(entity, attackConfig, attackType) {
    let destination;
    const startPosition = entity.startPositionForAttack; // Use stored start position

    if (attackConfig.backwardJump) {
        const facingAngle = directionStringToAngleRadians(entity.facing);
        const backwardAngle = facingAngle + Math.PI;
        destination = {
            x: startPosition.x + Math.cos(backwardAngle) * attackConfig.dashDistance,
            y: startPosition.y + Math.sin(backwardAngle) * attackConfig.dashDistance
        };
    } else {
        destination = this.calculateJumpDestination(startPosition, entity.facing, attackConfig.dashDistance);
    }

    const isInvulnerableDuringJump = attackConfig.invulnerable || false;
    if (isInvulnerableDuringJump) {
        entity.isInvulnerable = true;
    }

    setTimeout(() => { // After windupTime
        if (!entity.isAttacking || entity.currentAttackType !== attackType) {
            if (isInvulnerableDuringJump) entity.isInvulnerable = false;
            return;
        }

        const jumpStartTime = performance.now();
        const jumpDuration = attackConfig.jumpDuration;
        const peakHeight = attackConfig.jumpHeight || 80;
        const animateJumpFrame = (timestamp) => {
            const elapsed = timestamp - jumpStartTime;
            const progress = Math.min(elapsed / jumpDuration, 1);
            if (progress >= 1) {
                entity.position.x = destination.x;
                entity.position.y = destination.y;
                entity.sprite.position.set(destination.x, destination.y);
                return;
            }
            entity.position.x = startPosition.x + (destination.x - startPosition.x) * progress;
            entity.position.y = startPosition.y + (destination.y - startPosition.y) * progress;
            const jumpHeight = Math.sin(Math.PI * progress) * peakHeight;
            entity.sprite.position.set(entity.position.x, entity.position.y - jumpHeight);
            requestAnimationFrame(animateJumpFrame);
        };
        requestAnimationFrame(animateJumpFrame);

        const actionDelay = attackConfig.actionPointDelay !== undefined ? attackConfig.actionPointDelay : attackConfig.jumpDuration;
        setTimeout(() => {
            if (!entity.isAttacking || entity.currentAttackType !== attackType) {
                if (isInvulnerableDuringJump) entity.isInvulnerable = false;
                return;
            }
            const hitboxAttackPosition = attackConfig.attackFromStartPosition ? startPosition : entity.position;
            const hitbox = this.createHitbox(
                hitboxAttackPosition, entity.facing, attackConfig.hitboxType,
                attackConfig.hitboxParams, attackConfig.hitboxVisual
            );
            if (hitbox) {
                const graphics = hitbox.draw();
                window.game.entityContainer.addChild(graphics); // Consider alternative
                this.activeAttacks.push({
                    hitbox, lifetime: attackConfig.hitboxVisual.duration,
                    attackType, entity, damage: attackConfig.damage
                });
                this.applyHitEffects(entity, hitbox, attackConfig.damage);
            }
            if (isInvulnerableDuringJump) {
                entity.isInvulnerable = false;
            }
            setTimeout(() => {
                if (entity.isAttacking && entity.currentAttackType === attackType) {
                    entity.combat.endAttack();
                }
            }, attackConfig.recoveryTime);
        }, actionDelay);
    }, attackConfig.windupTime);
    return attackConfig.cooldown;
  }

  _executeDashAttack(entity, attackConfig, attackType) {
    const startPosition = entity.startPositionForAttack; // Use stored start position
    const destination = this.calculateJumpDestination(startPosition, entity.facing, attackConfig.dashDistance);

    const invul = attackConfig.invulnerable || false;
    if (invul) {
      entity.isInvulnerable = true;
    }

    setTimeout(() => { // After windupTime
      if (!entity.isAttacking || entity.currentAttackType !== attackType) return;

      const dashStartTime = performance.now();
      const dashDuration = attackConfig.dashDuration;
      const hitbox = this.createHitbox(
        startPosition, entity.facing, attackConfig.hitboxType,
        attackConfig.hitboxParams, attackConfig.hitboxVisual
      );
      if (hitbox) {
        const graphics = hitbox.draw();
        window.game.entityContainer.addChild(graphics); // Consider alternative
        this.activeAttacks.push({
          hitbox, lifetime: attackConfig.hitboxVisual.duration,
          attackType, entity, damage: attackConfig.damage
        });
        this.applyHitEffects(entity, hitbox, attackConfig.damage);
      }
      
      // Programmatic trail effects specific to dash
      let lastEffectTime = 0;
      const effectInterval = 50; // ms
      const animateDashFrame = (timestamp) => {
        const elapsed = timestamp - dashStartTime;
        const progress = Math.min(elapsed / dashDuration, 1);
        if (progress >= 1) {
          entity.position.x = destination.x;
          entity.position.y = destination.y;
          entity.sprite.position.set(destination.x, destination.y);
          if (invul) entity.isInvulnerable = false;
          return;
        }
        entity.position.x = startPosition.x + (destination.x - startPosition.x) * progress;
        entity.position.y = startPosition.y + (destination.y - startPosition.y) * progress;
        entity.sprite.position.set(entity.position.x, entity.position.y);
        
        // Rogue dash trail is often continuous rather than from sequence item; this specific logic can stay if preferred.
        // Or, this can be replaced by configuring many effects in effectSequence for the dash trail.
        // For simplicity, keeping this programmatic trail for now unless specified otherwise.
        // If 'rogue_dash_effect' is in sequence with timing: windupTime, it will play once.
        // If more are needed, they'd be in the sequence.
        if (attackConfig.effectType === 'rogue_dash_effect' && timestamp - lastEffectTime > effectInterval) { // Example: if a specific effect type is for trail
            lastEffectTime = timestamp;
            this.createEffect('rogue_dash_effect', { ...entity.position }, entity.facing, entity, true);
        }
        requestAnimationFrame(animateDashFrame);
      };
      requestAnimationFrame(animateDashFrame);
      
      setTimeout(() => {
        if (entity.isAttacking && entity.currentAttackType === attackType) {
          entity.combat.endAttack();
        }
        if (invul) entity.isInvulnerable = false;
      }, attackConfig.dashDuration + attackConfig.recoveryTime);
    }, attackConfig.windupTime);
    return attackConfig.cooldown;
  }
  
  createHitbox(position, facing, type, params, visualConfig) {
    switch (type) {
      case 'rectangle': return new RectangleHitbox(position, facing, params, visualConfig);
      case 'cone': return new ConeHitbox(position, facing, params, visualConfig);
      case 'circle': return new CircleHitbox(position, facing, params, visualConfig);
      default: console.error(`CombatSystem: Unknown hitbox type: ${type}`); return null;
    }
  }
  
  applyHitEffects(entity, hitbox, damage) {
    if (!hitbox) return;
    
    // Check PvP damage against other players
    if (PLAYER_CONFIG.pvpEnabled) {
      // Check local player
      if (window.game.entities.player && window.game.entities.player !== entity) {
        const player = window.game.entities.player;
        if (hitbox.testHit(player, 20)) { // Player collision radius
          player.takeDamage(damage);
        }
      }
      
      // Check remote players
      if (window.game.remotePlayers) {
        for (const remotePlayer of window.game.remotePlayers.values()) {
          if (remotePlayer !== entity && hitbox.testHit(remotePlayer, 20)) {
            // For now, just log it - actual damage will be handled server-side later
            console.log(`Would damage remote player ${remotePlayer.id} for ${damage} (PvP disabled)`);
          }
        }
      }
    }
    
    // Check monster collisions (PvE always enabled)
    // Now using server-controlled monsters
    if (window.game.remoteMonsters) {
      for (const [id, monster] of window.game.remoteMonsters) {
        if (!monster.alive) continue;
        if (hitbox.testHit(monster, monster.collisionRadius || 20)) {
          // Send damage to server instead of applying directly
          if (window.game.network) {
            window.game.network.sendMonsterDamage(id, damage, entity.currentAttackType || 'primary');
          }
          
          // Show immediate visual feedback
          monster.showDamageEffect();
        }
      }
    }
  }
  
  createEffect(effectType, position, facing, attacker = null, useRawPosition = false) {
    const spriteManager = window.game.systems.sprites; // Consider alternative
    const config = this.effectConfigs[effectType];
    if (!config) {
      console.error(`CombatSystem: Effect configuration not found for ${effectType}`);
      return null;
    }
    const sprite = spriteManager.createAnimatedSprite(effectType);
    if (!sprite) {
      console.error(`CombatSystem: Failed to create sprite for effect ${effectType}`);
      return null;
    }
    
    let finalPosition = useRawPosition ? { ...position } : this.calculateEffectPosition(position, facing, config.offsetDistance);
    sprite.position.set(finalPosition.x, finalPosition.y);
    sprite.loop = false; // Most effects play once
    sprite.animationSpeed = config.animationSpeed || 0.2;
    
    let scaleX = config.scale || 1.0;
    let scaleY = config.scale || 1.0;
    if (config.flipX) scaleX = -scaleX;
    if (config.flipY) scaleY = -scaleY;
    sprite.scale.set(scaleX, scaleY);
    
    sprite.rotation = this.calculateEffectRotation(facing, config.rotationOffset || 0);
    sprite.play();
    
    window.game.entityContainer.addChild(sprite); // Consider alternative
    
    if (config.followDuration > 0 && attacker) {
      this.setupEffectFollowBehavior(sprite, attacker, config.followDuration);
    }
    
    sprite.onComplete = () => {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
    };
    return sprite;
  }

  // Method to create effects with custom angles (if still needed, or integrate into main createEffect/sequence)
  createEffectWithAngle(effectType, position, facing, attacker = null, useRawPosition = false, offsetAngleDegrees = 0) {
    const spriteManager = window.game.systems.sprites;
    const config = this.effectConfigs[effectType];
    if (!config) { /* ... error ... */ return null; }
    const sprite = spriteManager.createAnimatedSprite(effectType);
    if (!sprite) { /* ... error ... */ return null; }

    let finalPosition = useRawPosition ? { ...position } : this.calculateEffectPosition(position, facing, config.offsetDistance);
    sprite.position.set(finalPosition.x, finalPosition.y);
    sprite.loop = false;
    sprite.animationSpeed = config.animationSpeed || 0.2;

    let scaleX = config.scale; let scaleY = config.scale;
    if (config.flipX) scaleX = -scaleX; if (config.flipY) scaleY = -scaleY;
    sprite.scale.set(scaleX, scaleY);

    const baseRotation = this.calculateEffectRotation(facing, config.rotationOffset);
    sprite.rotation = baseRotation + (offsetAngleDegrees * (Math.PI / 180)); // Add custom angle

    sprite.play();
    window.game.entityContainer.addChild(sprite);
    sprite.onComplete = () => { if (sprite.parent) sprite.parent.removeChild(sprite); };
    return sprite;
  }
  
  calculateEffectPosition(basePosition, facing, distance) {
    if (distance === 0) return { ...basePosition };
    const angle = directionStringToAngleRadians(facing);
    return {
      x: basePosition.x + Math.cos(angle) * distance,
      y: basePosition.y + Math.sin(angle) * distance
    };
  }

  calculateJumpDestination(position, facing, distance) {
    const angle = directionStringToAngleRadians(facing);
    return {
      x: position.x + Math.cos(angle) * distance,
      y: position.y + Math.sin(angle) * distance
    };
  }
  
  calculateEffectRotation(facing, baseRotationOffsetRadians) {
    const facingAngleRadians = directionStringToAngleRadians(facing);
    return facingAngleRadians + baseRotationOffsetRadians;
  }
  
  setupEffectFollowBehavior(sprite, target, duration) {
    // This implementation might need PIXI.Ticker for smoother follow if deltaTime is erratic
    let elapsedTime = 0;
    const initialOffset = {
      x: sprite.position.x - target.position.x,
      y: sprite.position.y - target.position.y
    };
    const ticker = PIXI.Ticker.shared; // Or app.ticker
    
    function followUpdate(deltaTime) {
        elapsedTime += ticker.deltaMS / 1000; // Convert ms to seconds
        if (elapsedTime < duration && sprite.parent && target.alive) { // Check sprite.parent and target.alive
            sprite.position.set(
                target.position.x + initialOffset.x,
                target.position.y + initialOffset.y
            );
        } else {
            ticker.remove(followUpdate);
        }
    }
    ticker.add(followUpdate);
  }
}