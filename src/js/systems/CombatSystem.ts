/**
 * @fileoverview CombatSystem - Skill-based hitbox combat with visual feedback
 * 
 * MIGRATION NOTES:
 * - Converted from CombatSystem.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 4
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for hitbox system and attack configuration
 * - Preserved all combat mechanics and visual feedback systems
 * 
 * ARCHITECTURE ROLE:
 * - Provides hitbox-based combat for player attacks and abilities
 * - Manages attack execution, hit detection, and damage application
 * - Supports multiple hitbox types (rectangle, cone, circle) for varied abilities
 * - Integrates with multiplayer through server-authoritative damage validation
 * 
 * SKILL-BASED DESIGN PHILOSOPHY:
 * Combat emphasizes positioning, timing, and spacing over stats:
 * - Precise hitbox collision detection for skill-based combat
 * - Movement abilities (dash, jump) for tactical positioning
 * - Visual hitbox feedback for learning and mastery
 * - Level advantages exist but skill can overcome them
 * 
 * HITBOX SYSTEM:
 * Geometric hit detection with rotation and facing support:
 * - RectangleHitbox: Melee attacks (sword swings, thrusts)
 * - ConeHitbox: Area attacks (sweeping abilities)
 * - CircleHitbox: Point abilities (projectile impacts)
 * - All hitboxes respect facing direction and collision physics
 * 
 * MULTIPLAYER INTEGRATION:
 * Client-side visual feedback with server authority:
 * 1. Client creates hitbox and shows visual effect immediately
 * 2. Client sends attack data to server for validation
 * 3. Server performs authoritative hit detection and damage
 * 4. Server broadcasts damage results to all clients
 * 5. Prevents cheating while maintaining responsive feel
 * 
 * ATTACK EXECUTION FLOW:
 * 1. executeAttack() creates hitbox based on ability configuration
 * 2. applyHitEffects() handles collision detection and damage
 * 3. Visual effects (graphics, screen shake) provide immediate feedback
 * 4. Network synchronization ensures multiplayer consistency
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Hitboxes are temporary objects with short lifetime
 * - Graphics disposal prevents memory leaks
 * - Hit detection optimized for common combat scenarios
 */

// src/js/systems/CombatSystem.ts
import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG } from '../config/GameConfig.js';
import { GAME_CONSTANTS } from '../../../shared/constants/GameConstants.js';
import { 
    directionStringToAngleRadians, 
    directionStringToAngleDegrees 
} from '../utils/DirectionUtils.js';
import { PIXIPoolFactory } from '../utils/ObjectPool.js';
import type {
    Position,
    Hitbox as IHitbox,
    HitboxParams,
    HitboxVisualConfig,
    AttackConfig,
    EffectConfig,
    EffectSequenceItem,
    ActiveAttack,
    PIXIGraphics,
    PIXIAnimatedSprite,
    PIXIApplication
} from '../types/index.js';

// Base Hitbox class
abstract class Hitbox implements IHitbox {
  position: Position;
  facing: string;
  params: HitboxParams;
  visualConfig: HitboxVisualConfig;
  graphics: PIXIGraphics | null;
  
  constructor(position: Position, facing: string, params: HitboxParams, visualConfig: HitboxVisualConfig) {
    this.position = position;
    this.facing = facing;
    this.params = params;
    this.visualConfig = visualConfig;
    this.graphics = null;
  }
  
  abstract draw(graphics?: PIXIGraphics): PIXIGraphics;
  abstract testHit(target: any, targetRadius?: number): boolean;
  
  getFacingRadians(): number { return directionStringToAngleRadians(this.facing); }
  getFacingDegrees(): number { return directionStringToAngleDegrees(this.facing); }
}

// Rectangle hitbox implementation
class RectangleHitbox extends Hitbox {
  draw(graphics?: PIXIGraphics): PIXIGraphics {
    const target = graphics ?? this.graphics ?? new PIXI.Graphics();
    target.clear();
    target.position.set(this.position.x, this.position.y);
    target.beginFill(this.visualConfig.color, this.visualConfig.fillAlpha);
    target.lineStyle(this.visualConfig.lineWidth, this.visualConfig.color, this.visualConfig.lineAlpha);
    target.drawRect(-this.params.width! / 2, -this.params.length!, this.params.width!, this.params.length!);
    target.rotation = this.getFacingRadians() + Math.PI / 2;
    target.endFill();
    this.graphics = target;
    return target;
  }
  testHit(target: any, targetRadius: number = 0): boolean {
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const facingRadians = this.getFacingRadians() + Math.PI / 2;
    const rotX = dx * Math.cos(-facingRadians) - dy * Math.sin(-facingRadians);
    const rotY = dx * Math.sin(-facingRadians) + dy * Math.cos(-facingRadians);
    return (
      rotX >= -this.params.width! / 2 - targetRadius && 
      rotX <= this.params.width! / 2 + targetRadius && 
      rotY >= -this.params.length! - targetRadius && 
      rotY <= 0 + targetRadius
    );
  }
}

// Cone hitbox implementation
class ConeHitbox extends Hitbox {
  draw(graphics?: PIXIGraphics): PIXIGraphics {
    const target = graphics ?? this.graphics ?? new PIXI.Graphics();
    target.clear();
    target.position.set(this.position.x, this.position.y);
    const facingAngle = this.getFacingRadians();
    const halfArcAngle = (this.params.angle! / 2) * (Math.PI / 180);
    const startAngle = facingAngle - halfArcAngle;
    const endAngle = facingAngle + halfArcAngle;
    target.beginFill(this.visualConfig.color, this.visualConfig.fillAlpha);
    target.moveTo(0, 0);
    target.arc(0, 0, (this.params as any).range, startAngle, endAngle);
    target.lineTo(0, 0);
    target.endFill();
    target.lineStyle(this.visualConfig.lineWidth, this.visualConfig.color, this.visualConfig.lineAlpha);
    target.arc(0, 0, (this.params as any).range, startAngle, endAngle);
    target.moveTo(0, 0);
    target.lineTo(Math.cos(startAngle) * (this.params as any).range, Math.sin(startAngle) * (this.params as any).range);
    target.moveTo(0, 0);
    target.lineTo(Math.cos(endAngle) * (this.params as any).range, Math.sin(endAngle) * (this.params as any).range);
    this.graphics = target;
    return target;
  }
  testHit(target: any, targetRadius: number = 0): boolean {
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const adjustedDistance = distance - targetRadius;
    if (adjustedDistance > (this.params as any).range) return false;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    const facingAngle = this.getFacingDegrees();
    let angleDiff = Math.abs(angle - facingAngle);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    return angleDiff <= this.params.angle! / 2;
  }
}

// Circle hitbox implementation
class CircleHitbox extends Hitbox {
  draw(graphics?: PIXIGraphics): PIXIGraphics {
    const target = graphics ?? this.graphics ?? new PIXI.Graphics();
    target.clear();
    target.position.set(this.position.x, this.position.y);
    target.beginFill(this.visualConfig.color, this.visualConfig.fillAlpha);
    target.lineStyle(this.visualConfig.lineWidth, this.visualConfig.color, this.visualConfig.lineAlpha);
    target.drawCircle(0, 0, this.params.radius!);
    target.endFill();
    this.graphics = target;
    return target;
  }
  testHit(target: any, targetRadius: number = 0): boolean {
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.params.radius! + targetRadius;
  }
}

export class CombatSystem {
  app: PIXIApplication;
  activeAttacks: ActiveAttack[];
  effectConfigs: Record<string, EffectConfig>;
  private hitboxGraphicsPool = PIXIPoolFactory.createGraphicsPool(
    GAME_CONSTANTS.POOLS.HITBOX_GRAPHICS.MAX_SIZE,
    GAME_CONSTANTS.POOLS.HITBOX_GRAPHICS.PRE_ALLOCATE
  );

  constructor(app: PIXIApplication) {
    this.app = app;
    this.activeAttacks = [];
    // Projectiles now handled server-side
    this.effectConfigs = (PLAYER_CONFIG as any).effects;
    // this.attackConfigs = PLAYER_CONFIG.attacks; // No longer needed if passed directly
  }

  private acquireHitboxGraphics(): PIXI.Graphics {
    const graphics = this.hitboxGraphicsPool.acquire();
    graphics.visible = true;
    graphics.alpha = 1;
    graphics.rotation = 0;
    graphics.scale.set(1, 1);
    graphics.position.set(0, 0);
    return graphics;
  }

  private releaseHitboxGraphics(graphics: PIXI.Graphics): void {
    if (graphics.parent) {
      graphics.parent.removeChild(graphics);
    }
    graphics.clear();
    this.hitboxGraphicsPool.release(graphics);
  }

  update(deltaTime: number): void {
    for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
      const attack = this.activeAttacks[i];
      attack.lifetime -= deltaTime;
      if (attack.lifetime <= 0) {
        if (attack.hitbox && attack.hitbox.graphics) {
          this.releaseHitboxGraphics(attack.hitbox.graphics);
          attack.hitbox.graphics = null;
        }
        this.activeAttacks.splice(i, 1);
      }
    }
    this.updateProjectiles(deltaTime);
  }
  
  updateProjectiles(deltaTime: number): void {
    // Projectiles are now handled server-side
    // Client just renders them via ProjectileRenderer
  }

  createProjectile(x: number, y: number, angle: number, owner: any, options: any = {}): void {
    // Creating projectile
    
    // Now we just request the server to create the projectile
    if ((window as any).game?.network) {
      // Phase 3.1: Damage removed - server calculates projectile damage
      (window as any).game.network.createProjectile({
        x,
        y,
        angle,
        speed: options.speed || 600,
        range: options.range || 400,
        effectType: options.effectType || 'bow_shot_effect'
      });
    } else {
      console.error('No network connection to create projectile');
    }
    // No local projectile creation anymore
  }

  createProjectileVisualEffect(projectile: any, effectType: string, angle: number): PIXIAnimatedSprite | null {
    const spriteManager = (window as any).game.systems.sprites; // Consider alternative to (window as any).game
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

  scheduleAllAttackEffects(entity: any, attackConfig: AttackConfig, attackType: string): void {
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

                // Debug: Warn about large position discrepancies that could cause misplaced effects
                if (shouldUseStartPos && entity.startPositionForAttack && entity.position) {
                    const dx = Math.abs(entity.startPositionForAttack.x - entity.position.x);
                    const dy = Math.abs(entity.startPositionForAttack.y - entity.position.y);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 200) {
                        console.warn(`[CombatSystem] Large position delta (${distance.toFixed(1)}px) for effect ${effectParams.type}. Start: (${entity.startPositionForAttack.x}, ${entity.startPositionForAttack.y}), Current: (${entity.position.x}, ${entity.position.y})`);
                    }
                }

                const effectDistance = effectParams.hasOwnProperty('distance')
                                   ? effectParams.distance!
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

  executeAttack(entity: any, attackType: string): number {
    let attackConfig;
    const classSpecificAttackKey = `${entity.characterClass}_${attackType}`;
  
    if ((PLAYER_CONFIG as any).attacks[classSpecificAttackKey]) {
      attackConfig = (PLAYER_CONFIG as any).attacks[classSpecificAttackKey];
    } else if ((PLAYER_CONFIG as any).attacks[attackType]) { // Fallback to default attack type if class-specific doesn't exist
      attackConfig = (PLAYER_CONFIG as any).attacks[attackType];
    } else {
      console.error(`CombatSystem: Attack type ${attackType} (or ${classSpecificAttackKey}) not configured for ${entity.characterClass}`);
      return 0; // No cooldown if attack not found
    }
    
    // Apply level bonuses to attack config
    const modifiedConfig = { ...attackConfig };
    if (entity.attackRecoveryBonus) {
      modifiedConfig.recoveryTime = Math.max(50, attackConfig.recoveryTime + entity.attackRecoveryBonus);
    }
    if (entity.attackCooldownBonus) {
      modifiedConfig.cooldown = Math.max(100, attackConfig.cooldown + entity.attackCooldownBonus);
    }
        
    // Executing attack
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

  _executeStandardMeleeAttack(entity: any, attackConfig: AttackConfig, attackType: string): number {
    // For local player, send ability request to server for PvP damage
    if (entity === (window as any).game.entities.player) {
        (window as any).game.network.sendAbilityRequest(attackType);
    }
    
    // Still create visual hitbox locally for immediate feedback
    setTimeout(() => {
      if (entity.isAttacking && entity.currentAttackType === attackType) {
        const hitbox = this.createHitbox(
          entity.position, entity.facing,
          attackConfig.hitboxType, attackConfig.hitboxParams, attackConfig.hitboxVisual
        );
        if (hitbox) {
          const graphics = this.acquireHitboxGraphics();
          hitbox.draw(graphics);
          (window as any).game.entityContainer.addChild(graphics); // Consider alternative to (window as any).game
          this.activeAttacks.push({
            attacker: entity,
            hitbox,
            config: attackConfig,
            lifetime: attackConfig.hitboxVisual.duration,
            hasHitFrameOccurred: false,
            attackType,
            entity,
            damage: attackConfig.damage
          });
          // Don't apply damage locally - let server handle it
          // this.applyHitEffects(entity, hitbox, attackConfig.damage);
        }
      }
    }, attackConfig.windupTime);
    return attackConfig.cooldown;
  }

_executeProjectileAttack(entity: any, attackConfig: AttackConfig, attackType: string): number {
    // For local player, send ability request to server
    if (entity === (window as any).game.entities.player) {
        // For Hunter, include mouse angle for precise aiming
        if (entity.characterClass === 'hunter' && attackType === 'primary') {
            const inputSystem = (window as any).game?.systems?.input;
            if (inputSystem) {
                const mousePosition = inputSystem.mouse.position;
                const playerScreenX = window.innerWidth / 2;
                const playerScreenY = window.innerHeight / 2;
                const dx = mousePosition.x - playerScreenX;
                const dy = mousePosition.y - playerScreenY;
                const angle = Math.atan2(dy, dx);
                
                // Send ability request with precise angle
                (window as any).game.network.sendAbilityRequest(attackType, { angle });
            } else {
                // Fallback to regular ability request
                (window as any).game.network.sendAbilityRequest(attackType);
            }
        } else {
            (window as any).game.network.sendAbilityRequest(attackType);
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

  _executeJumpAttack(entity: any, attackConfig: AttackConfig, attackType: string): number {
    // For local player, send ability request to server
    if (entity === (window as any).game.entities.player) {
        (window as any).game.network.sendAbilityRequest(attackType);
        // Don't execute locally - wait for server response
        return attackConfig.cooldown;
    }
    
    // For remote players, movement will be handled via server events
    // This method should only be called for the local player
    return attackConfig.cooldown;
  }

  _executeDashAttack(entity: any, attackConfig: AttackConfig, attackType: string): number {
    // For local player, send ability request to server
    if (entity === (window as any).game.entities.player) {
        (window as any).game.network.sendAbilityRequest(attackType);
        // Don't execute locally - wait for server response
        return attackConfig.cooldown;
    }
    
    // For remote players, movement will be handled via server events
    // This method should only be called for the local player
    return attackConfig.cooldown;
  }
  
  createHitbox(position: Position, facing: string, type: string | null, params: HitboxParams | null, visualConfig: HitboxVisualConfig): Hitbox | null {
    // Handle null hitbox type (for movement abilities like roll that don't deal damage)
    if (type === null || type === undefined) {
      return null;
    }
    
    switch (type) {
      case 'rectangle': return new RectangleHitbox(position, facing, params!, visualConfig);
      case 'cone': return new ConeHitbox(position, facing, params!, visualConfig);
      case 'circle': return new CircleHitbox(position, facing, params!, visualConfig);
      default: console.error(`CombatSystem: Unknown hitbox type: ${type}`); return null;
    }
  }
  
  applyHitEffects(entity: any, hitbox: Hitbox | null, damage: number): void {
    if (!hitbox) return;
    
    // Ensure damage is a valid number (safety check for Phase 2.1 validation)
    if (typeof damage !== 'number' || isNaN(damage)) {
      console.warn(`CombatSystem: Invalid damage value ${damage}, defaulting to 1`);
      damage = 1;
    }
    
    // PvP damage is now handled server-side via ability events
    // The server will check for player hits when processing ability damage
    
    // Check monster collisions (PvE always enabled)
    // Now using server-controlled monsters
    if ((window as any).game.remoteMonsters) {
      for (const [id, monster] of (window as any).game.remoteMonsters) {
        if (!monster.alive) continue;
        if (hitbox.testHit(monster, monster.collisionRadius || 20)) {
          // Send damage to server instead of applying directly
          if ((window as any).game.network) {
            (window as any).game.network.sendMonsterDamage(id, damage, entity.currentAttackType || 'primary');
          }
          
          // Show immediate visual feedback
          monster.showDamageEffect();
        }
      }
    }
  }
  
  createEffect(effectType: string, position: Position, facing: string, attacker: any = null, useRawPosition: boolean = false): PIXIAnimatedSprite | null {
    const spriteManager = (window as any).game.systems.sprites; // Consider alternative
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
    
    let finalPosition = useRawPosition ? { ...position } : this.calculateEffectPosition(position, facing, config.offsetDistance || 0);
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
    
    (window as any).game.entityContainer.addChild(sprite); // Consider alternative
    
    if (config.followDuration && config.followDuration > 0 && attacker) {
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
  createEffectWithAngle(effectType: string, position: Position, facing: string, attacker: any = null, useRawPosition: boolean = false, offsetAngleDegrees: number = 0): PIXIAnimatedSprite | null {
    const spriteManager = (window as any).game.systems.sprites;
    const config = this.effectConfigs[effectType];
    if (!config) { /* ... error ... */ return null; }
    const sprite = spriteManager.createAnimatedSprite(effectType);
    if (!sprite) { /* ... error ... */ return null; }

    let finalPosition = useRawPosition ? { ...position } : this.calculateEffectPosition(position, facing, config.offsetDistance || 0);
    sprite.position.set(finalPosition.x, finalPosition.y);
    sprite.loop = false;
    sprite.animationSpeed = config.animationSpeed || 0.2;

    let scaleX = config.scale || 1.0; let scaleY = config.scale || 1.0;
    if (config.flipX) scaleX = -scaleX; if (config.flipY) scaleY = -scaleY;
    sprite.scale.set(scaleX, scaleY);

    const baseRotation = this.calculateEffectRotation(facing, config.rotationOffset || 0);
    sprite.rotation = baseRotation + (offsetAngleDegrees * (Math.PI / 180)); // Add custom angle

    sprite.play();
    (window as any).game.entityContainer.addChild(sprite);
    sprite.onComplete = () => { if (sprite.parent) sprite.parent.removeChild(sprite); };
    return sprite;
  }
  
  calculateEffectPosition(basePosition: Position, facing: string, distance: number): Position {
    if (distance === 0) return { ...basePosition };
    const angle = directionStringToAngleRadians(facing);
    return {
      x: basePosition.x + Math.cos(angle) * distance,
      y: basePosition.y + Math.sin(angle) * distance
    };
  }

  calculateJumpDestination(position: Position, facing: string, distance: number): Position {
    const angle = directionStringToAngleRadians(facing);
    return {
      x: position.x + Math.cos(angle) * distance,
      y: position.y + Math.sin(angle) * distance
    };
  }
  
  calculateEffectRotation(facing: string, baseRotationOffsetRadians: number): number {
    const facingAngleRadians = directionStringToAngleRadians(facing);
    return facingAngleRadians + baseRotationOffsetRadians;
  }
  
  setupEffectFollowBehavior(sprite: PIXIAnimatedSprite, target: any, duration: number): void {
    // This implementation might need PIXI.Ticker for smoother follow if deltaTime is erratic
    let elapsedTime = 0;
    const initialOffset = {
      x: sprite.position.x - target.position.x,
      y: sprite.position.y - target.position.y
    };
    const ticker = PIXI.Ticker.shared; // Or app.ticker
    
    function followUpdate(deltaTime: number): void {
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
