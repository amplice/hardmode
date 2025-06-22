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
    
    // Apply level bonuses to attack config
    const modifiedConfig = { ...attackConfig };
    if (entity.attackRecoveryBonus) {
      modifiedConfig.recoveryTime = Math.max(0, attackConfig.recoveryTime - entity.attackRecoveryBonus);
    }
    if (entity.attackCooldownBonus) {
      modifiedConfig.cooldown = Math.max(100, attackConfig.cooldown - entity.attackCooldownBonus);
    }
        
    console.log(`CombatSystem: ${entity.characterClass || 'Entity'} executing ${modifiedConfig.name}`);
    entity.startPositionForAttack = { x: entity.position.x, y: entity.position.y };
    this.scheduleAllAttackEffects(entity, modifiedConfig, attackType);

    switch (modifiedConfig.archetype) {
      case 'standard_melee':
        return this._executeStandardMeleeAttack(entity, modifiedConfig, attackType);
      case 'projectile':
        return this._executeProjectileAttack(entity, modifiedConfig, attackType);
      case 'jump_attack':
        return this._executeJumpAttack(entity, modifiedConfig, attackType);
      case 'dash_attack':
        return this._executeDashAttack(entity, modifiedConfig, attackType);
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
    // For local player, send ability request to server
    if (entity === window.game.entities.player) {
        // For Hunter, include mouse angle for precise aiming
        if (entity.characterClass === 'hunter' && attackType === 'primary') {
            const inputSystem = window.game?.systems?.input;
            if (inputSystem) {
                const mousePosition = inputSystem.mouse.position;
                const playerScreenX = window.innerWidth / 2;
                const playerScreenY = window.innerHeight / 2;
                const dx = mousePosition.x - playerScreenX;
                const dy = mousePosition.y - playerScreenY;
                const angle = Math.atan2(dy, dx);
                
                // Send ability request with precise angle
                window.game.network.sendAbilityRequest(attackType, { angle });
            } else {
                // Fallback to regular ability request
                window.game.network.sendAbilityRequest(attackType);
            }
        } else {
            window.game.network.sendAbilityRequest(attackType);
        }
        
        // Clear attack state immediately for projectile attacks
        // Since they're instant and server-controlled
        setTimeout(() => {
            if (entity.combat && entity.combat.endAttack) {
                entity.combat.endAttack();
            }
        }, attackConfig.windupTime);
        
        return attackConfig.cooldown;
    }
    
    // For remote players, projectiles will be created via server events
    return attackConfig.cooldown;
  }

  _executeJumpAttack(entity, attackConfig, attackType) {
    // For local player, send ability request to server
    if (entity === window.game.entities.player) {
        window.game.network.sendAbilityRequest(attackType);
        // Don't execute locally - wait for server response
        return attackConfig.cooldown;
    }
    
    // For remote players, movement will be handled via server events
    // This method should only be called for the local player
    return attackConfig.cooldown;
  }

  _executeDashAttack(entity, attackConfig, attackType) {
    // For local player, send ability request to server
    if (entity === window.game.entities.player) {
        window.game.network.sendAbilityRequest(attackType);
        // Don't execute locally - wait for server response
        return attackConfig.cooldown;
    }
    
    // For remote players, movement will be handled via server events
    // This method should only be called for the local player
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