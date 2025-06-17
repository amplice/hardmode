/**
 * LLM_NOTE: Handles processing of all client messages and game logic.
 * This class validates inputs and updates the game world accordingly.
 * 
 * ARCHITECTURE_DECISION: MessageHandler is stateless and delegates to
 * appropriate systems for processing. It acts as a bridge between
 * network layer and game logic.
 */

import { 
  Entity,
  PlayerInputMessage,
  PlayerAttackMessage,
  PlayerRespawnMessage,
  PlayerJoinMessage,
  MessageType,
  ErrorCode,
  ComponentType,
  CHARACTER_CLASSES,
} from '@hardmode/shared';
import { Direction } from '@hardmode/shared/constants/PhysicsConfig';
import { GameServer } from '../core/GameServer';
import { Connection } from './Connection';
import { InputValidator } from '../validation/InputValidator';
import { MovementValidator } from '../validation/MovementValidator';
import { AttackValidator } from '../validation/AttackValidator';

// Import server-side components
import { PositionComponent } from '../ecs/components/PositionComponent';
import { VelocityComponent } from '../ecs/components/VelocityComponent';
import { PlayerComponent } from '../ecs/components/PlayerComponent';
import { CombatComponent } from '../ecs/components/CombatComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';

export class MessageHandler {
  private gameServer: GameServer;
  private inputValidator: InputValidator;
  private movementValidator: MovementValidator;
  private attackValidator: AttackValidator;
  
  constructor(gameServer: GameServer) {
    this.gameServer = gameServer;
    this.inputValidator = new InputValidator();
    this.movementValidator = new MovementValidator();
    this.attackValidator = new AttackValidator();
  }
  
  /**
   * Initialize the message handler.
   */
  initialize(): void {
    console.log('Message handler initialized');
  }
  
  /**
   * Set up message handlers for a connection.
   */
  setupConnection(connection: Connection): void {
    // Handle all messages through a single channel
    connection.on('message', (message: any) => {
      if (!message || !message.type) {
        connection.sendError(ErrorCode.INVALID_INPUT, 'Invalid message format');
        return;
      }
      
      switch (message.type) {
        case MessageType.PLAYER_JOIN:
          this.processPlayerJoin(connection, message);
          break;
          
        case MessageType.PLAYER_INPUT:
          this.processPlayerInput(connection, message);
          break;
          
        case MessageType.PLAYER_ATTACK:
          this.processPlayerAttack(connection, message);
          break;
          
        case MessageType.PLAYER_RESPAWN:
          this.processPlayerRespawn(connection, message);
          break;
          
        default:
          connection.sendError(ErrorCode.INVALID_INPUT, `Unknown message type: ${message.type}`);
      }
    });
  }
  
  /**
   * Process player input from connection.
   */
  processPlayerInput(connection: Connection, data: PlayerInputMessage): void {
    console.log('Processing player input:', JSON.stringify(data));
    
    // Basic validation
    if (!this.inputValidator.validateInput(data)) {
      connection.sendError(ErrorCode.INVALID_INPUT, 'Invalid input format');
      return;
    }
    
    // Queue input for processing in game tick
    connection.queueInput(data);
  }
  
  /**
   * Process player attack from connection.
   */
  private processPlayerAttack(connection: Connection, data: PlayerAttackMessage): void {
    if (!connection.playerId) {
      connection.sendError(ErrorCode.INVALID_INPUT, 'Not in game');
      return;
    }
    
    const player = this.gameServer.getPlayerEntity(connection.playerId);
    if (!player) {
      return;
    }
    
    this.processPlayerAttackEntity(player, data);
  }
  
  /**
   * Process player respawn from connection.
   */
  private processPlayerRespawn(connection: Connection, _data: PlayerRespawnMessage): void {
    if (!connection.playerId) {
      connection.sendError(ErrorCode.INVALID_INPUT, 'Not in game');
      return;
    }
    
    const player = this.gameServer.getPlayerEntity(connection.playerId);
    if (!player) {
      return;
    }
    
    this.processPlayerRespawnEntity(player);
  }
  
  /**
   * Process a player join request.
   */
  private processPlayerJoin(connection: Connection, data: PlayerJoinMessage): void {
    // Validate username
    if (!data.username || data.username.length < 3 || data.username.length > 20) {
      connection.sendError(ErrorCode.INVALID_INPUT, 'Invalid username');
      return;
    }
    
    // Validate character class
    if (!CHARACTER_CLASSES[data.characterClass]) {
      connection.sendError(ErrorCode.INVALID_INPUT, 'Invalid character class');
      return;
    }
    
    // Check if player is already in game
    if (connection.playerId) {
      connection.sendError(ErrorCode.INVALID_INPUT, 'Already in game');
      return;
    }
    
    // Create player entity
    const player = this.gameServer.createPlayer(
      data.username,
      data.characterClass,
      connection.id
    );
    
    if (!player) {
      connection.sendError(ErrorCode.SERVER_ERROR, 'Failed to create player');
      return;
    }
    
    // Associate player with connection
    connection.playerId = player.id;
    this.gameServer.addPlayerConnection(player.id, connection);
    
    // Send connection accepted message
    connection.sendMessage({
      type: MessageType.CONNECTION_ACCEPTED,
      timestamp: Date.now(),
      playerId: player.id,
      worldSeed: 12345, // TODO: Get from world generator
      serverTime: Date.now(),
      tickRate: this.gameServer.getTickRate(),
    });
    
    console.log(`Player ${data.username} joined as ${data.characterClass}`);
  }
  
  /**
   * Process a player input (called from game tick with validated entity).
   */
  processPlayerInputEntity(player: Entity, input: PlayerInputMessage): void {
    // Get components
    const position = player.getComponent<PositionComponent>(ComponentType.POSITION);
    const velocity = player.getComponent<VelocityComponent>(ComponentType.VELOCITY);
    const playerComp = player.getComponent<PlayerComponent>(ComponentType.PLAYER);
    const combat = player.getComponent<CombatComponent>(ComponentType.COMBAT);
    const health = player.getComponent<HealthComponent>(ComponentType.HEALTH);
    
    if (!position || !velocity || !playerComp || !combat || !health) {
      return;
    }
    
    // Check if player can move (not stunned, not dead)
    if (health.isDead || combat.stunEndTime > Date.now()) {
      velocity.x = 0;
      velocity.y = 0;
      return;
    }
    
    // Calculate movement vector
    let moveX = 0;
    let moveY = 0;
    
    if (input.keys.left) moveX -= 1;
    if (input.keys.right) moveX += 1;
    if (input.keys.up) moveY -= 1;
    if (input.keys.down) moveY += 1;
    
    // Apply diagonal movement factor
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707; // diagonal modifier (1/sqrt(2))
      moveY *= 0.707;
    }
    
    // Calculate facing direction from mouse position
    const dx = input.mousePosition.x - position.x;
    const dy = input.mousePosition.y - position.y;
    const angle = Math.atan2(dy, dx);
    position.facing = this.angleToDirection(angle);
    
    // Calculate angle between movement and facing for speed modifiers
    if (moveX !== 0 || moveY !== 0) {
      const moveAngle = Math.atan2(moveY, moveX);
      let angleDiff = Math.abs(angle - moveAngle);
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
      
      // Apply directional speed modifiers
      let speedModifier = 1.0; // forward
      if (angleDiff > 3 * Math.PI / 4) {
        speedModifier = 0.5; // backward
      } else if (angleDiff > Math.PI / 4) {
        speedModifier = 0.7; // strafe
      }
      
      moveX *= speedModifier;
      moveY *= speedModifier;
    }
    
    // Apply class base speed
    const baseSpeed = playerComp.getMoveSpeed();
    velocity.x = moveX * baseSpeed;
    velocity.y = moveY * baseSpeed;
    
    // Validate movement
    if (!this.movementValidator.validateMovement(player, velocity)) {
      // Invalid movement, reset velocity
      velocity.x = 0;
      velocity.y = 0;
      console.warn(`Invalid movement from player ${playerComp.username}`);
    }
    
    // Update last input sequence
    playerComp.lastInputSequence = input.sequence;
  }
  
  /**
   * Process a player attack request on entity.
   */
  private processPlayerAttackEntity(player: Entity, attack: PlayerAttackMessage): void {
    const combat = player.getComponent<CombatComponent>(ComponentType.COMBAT);
    const health = player.getComponent<HealthComponent>(ComponentType.HEALTH);
    const playerComp = player.getComponent<PlayerComponent>(ComponentType.PLAYER);
    
    if (!combat || !health || !playerComp) {
      return;
    }
    
    // Check if player can attack
    if (health.isDead || combat.stunEndTime > Date.now() || combat.isAttacking) {
      return;
    }
    
    // Check if roll is unlocked for roll ability
    if (attack.attackType === 'roll' && playerComp.level < 5) {
      return;
    }
    
    // Validate attack timing
    if (!this.attackValidator.validateAttack(player, attack)) {
      return;
    }
    
    // Update facing based on mouse position
    const position = player.getComponent<PositionComponent>(ComponentType.POSITION);
    if (position) {
      const dx = attack.mousePosition.x - position.x;
      const dy = attack.mousePosition.y - position.y;
      position.facing = this.angleToDirection(Math.atan2(dy, dx));
    }
    
    // Mark as attacking
    combat.isAttacking = true;
    combat.currentAttack = attack.attackType;
    combat.attackStartTime = Date.now();
    
    // The actual attack execution will be handled by the CombatSystem
    // based on the attack timing configuration
  }
  
  /**
   * Process a player respawn request on entity.
   */
  private processPlayerRespawnEntity(player: Entity): void {
    const health = player.getComponent<HealthComponent>(ComponentType.HEALTH);
    const position = player.getComponent<PositionComponent>(ComponentType.POSITION);
    
    if (!health || !position) {
      return;
    }
    
    // Check if player is actually dead
    if (!health.isDead) {
      return;
    }
    
    // Respawn at world center
    position.x = 3200; // WORLD_BOUNDS.SPAWN_X (center of 6400 world)
    position.y = 3200; // WORLD_BOUNDS.SPAWN_Y
    
    // Reset health
    health.current = health.maximum;
    health.isDead = false;
    
    // Clear any status effects
    const combat = player.getComponent<CombatComponent>(ComponentType.COMBAT);
    if (combat) {
      combat.stunEndTime = 0;
      combat.isAttacking = false;
      combat.currentAttack = null;
      combat.invulnerableEndTime = 0;
    }
    
    // Reset velocity
    const velocity = player.getComponent<VelocityComponent>(ComponentType.VELOCITY);
    if (velocity) {
      velocity.x = 0;
      velocity.y = 0;
    }
    
    console.log(`Player respawned at world center`);
  }
  
  /**
   * Convert angle to 8-directional facing.
   */
  private angleToDirection(angle: number): Direction {
    // Convert to degrees and normalize
    let degrees = angle * 180 / Math.PI;
    while (degrees < 0) degrees += 360;
    while (degrees >= 360) degrees -= 360;
    
    // Map to 8 directions
    if (degrees >= 337.5 || degrees < 22.5) return 'right';
    if (degrees >= 22.5 && degrees < 67.5) return 'down-right';
    if (degrees >= 67.5 && degrees < 112.5) return 'down';
    if (degrees >= 112.5 && degrees < 157.5) return 'down-left';
    if (degrees >= 157.5 && degrees < 202.5) return 'left';
    if (degrees >= 202.5 && degrees < 247.5) return 'up-left';
    if (degrees >= 247.5 && degrees < 292.5) return 'up';
    if (degrees >= 292.5 && degrees < 337.5) return 'up-right';
    
    return 'down'; // Default
  }
}