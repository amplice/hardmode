import { Player, PlayerStatus } from '../entities/Player';
import { Projectile, ProjectileState } from '../entities/Projectile';
import { ConnectionManager } from '../network/ConnectionManager';
import { logger } from '../utils/logger';
import { config } from '../config';
import { InputState, PlayerState, Vector2 } from '../../../shared/types';

export class GameInstance {
  private players: Map<string, Player> = new Map();
  private projectiles: Map<string, Projectile> = new Map();
  private deadPlayers: Map<string, { player: Player; deathTime: number }> = new Map();
  private connectionManager: ConnectionManager;
  private tickRate: number;
  private updateRate: number;
  private tickInterval: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastTickTime: number = Date.now();
  private worldBounds: { width: number; height: number };
  private readonly RESPAWN_TIME = 5000; // 5 seconds
  private readonly INVULNERABILITY_TIME = 3000; // 3 seconds
  
  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.tickRate = config.game.tickRate;
    this.updateRate = config.game.updateRate;
    
    // Get world size from config
    this.worldBounds = { 
      width: config.game.worldSize.width * config.game.worldSize.tileSize, 
      height: config.game.worldSize.height * config.game.worldSize.tileSize 
    };
  }
  
  start(): void {
    logger.info('Starting game instance');
    
    // Start game tick loop (physics, AI, etc.)
    const tickInterval = 1000 / this.tickRate;
    this.tickInterval = setInterval(() => this.tick(), tickInterval);
    
    // Start update loop (network updates)
    const updateInterval = 1000 / this.updateRate;
    this.updateInterval = setInterval(() => this.sendUpdates(), updateInterval);
  }
  
  stop(): void {
    logger.info('Stopping game instance');
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  addPlayer(playerId: string, username: string, connectionId: string): Player {
    const player = new Player(playerId, username, connectionId);
    
    // Set spawn position (center of world for now)
    const spawnX = this.worldBounds.width / 2;
    const spawnY = this.worldBounds.height / 2;
    player.setSpawnPosition(spawnX, spawnY);
    player.status = PlayerStatus.CONNECTED;
    
    this.players.set(playerId, player);
    logger.info(`Added player ${username} to game instance`);
    
    return player;
  }
  
  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.status = PlayerStatus.DISCONNECTED;
      this.players.delete(playerId);
      logger.info(`Removed player ${player.username} from game instance`);
    }
  }
  
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }
  
  setPlayerClass(playerId: string, className: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.setClass(className);
      player.status = PlayerStatus.PLAYING;
      logger.info(`Player ${player.username} selected class: ${className} - Status: ${player.status}`);
      logger.info(`Active players: ${Array.from(this.players.values()).filter(p => p.status === PlayerStatus.PLAYING).length}`);
      
      // Send immediate update to ensure new player appears to others
      this.sendUpdates();
    } else {
      logger.error(`Player ${playerId} not found when setting class`);
    }
  }
  
  handlePlayerInput(playerId: string, input: InputState): void {
    const player = this.players.get(playerId);
    if (!player || player.status !== PlayerStatus.PLAYING) return;
    
    // Calculate delta time since last update
    const now = Date.now();
    const deltaTime = (now - player.lastUpdateTime) / 1000;
    
    // Process input
    player.processInput(input, deltaTime);
    
    // Handle attacking
    if (input.attacking && input.attackType && player.canAttack()) {
      this.handlePlayerAttack(player, input);
    }
  }
  
  private handlePlayerAttack(player: Player, input: InputState): void {
    const attackType = input.attackType;
    
    // Hunter projectile attacks
    if (player.class === 'hunter' && (attackType === 'primary' || attackType === 'secondary')) {
      this.handleHunterProjectileAttack(player, input.mousePosition);
      return;
    }
    
    // Melee attacks for other classes
    if (attackType === 'primary' || attackType === 'secondary') {
      this.handleMeleeAttack(player, attackType);
    } else if (attackType === 'roll') {
      this.handleRollAbility(player);
    }
    
    player.setLastAttackTime(Date.now());
  }
  
  private handleHunterProjectileAttack(player: Player, mousePosition: Vector2): void {
    // Calculate direction from player to mouse
    const direction = {
      x: mousePosition.x - player.position.x,
      y: mousePosition.y - player.position.y,
    };
    
    // Hunter projectile config (keeping original game values)
    const projectileConfig = {
      speed: 800,
      damage: 15,
      maxLifetime: 2000,
      radius: 6,
    };
    
    const projectile = new Projectile(
      player.id,
      'arrow',
      player.position,
      direction,
      projectileConfig
    );
    
    this.projectiles.set(projectile.id, projectile);
    
    // Broadcast projectile creation to all players
    this.connectionManager.broadcast('projectileSpawned', {
      projectile: projectile.getState(),
      timestamp: Date.now(),
    });
    
    logger.debug(`Hunter ${player.username} fired arrow ${projectile.id}`);
  }
  
  private handleMeleeAttack(player: Player, attackType: string): void {
    // Get attack configuration based on class and attack type
    const attackConfig = this.getMeleeAttackConfig(player.class, attackType);
    if (!attackConfig) {
      logger.warn(`No attack config found for ${player.class} ${attackType}`);
      return;
    }
    
    // Broadcast attack event for client animation
    this.connectionManager.broadcast('playerAttack', {
      playerId: player.id,
      attackType: attackType,
      position: player.position,
      facing: player.facing,
      timestamp: Date.now(),
    });
    
    // Schedule hit detection after windup time
    setTimeout(() => {
      this.performMeleeHitDetection(player, attackConfig);
    }, attackConfig.windupTime);
  }
  
  private handleRollAbility(player: Player): void {
    // Roll provides temporary invulnerability and movement
    const rollDuration = 500; // 0.5 seconds
    const rollDistance = 150;
    
    // Calculate roll destination based on facing
    const angle = this.facingToAngle(player.facing);
    const rollDestination = {
      x: player.position.x + Math.cos(angle) * rollDistance,
      y: player.position.y + Math.sin(angle) * rollDistance,
    };
    
    // Set invulnerability
    player.setInvulnerable(rollDuration);
    
    // Broadcast roll event
    this.connectionManager.broadcast('playerRoll', {
      playerId: player.id,
      startPosition: player.position,
      endPosition: rollDestination,
      duration: rollDuration,
      timestamp: Date.now(),
    });
    
    // Update player position after roll (simplified - should animate)
    setTimeout(() => {
      player.position = rollDestination;
      this.enforceWorldBounds(player);
    }, rollDuration);
  }
  
  private getMeleeAttackConfig(playerClass: string, attackType: string): any {
    // Attack configurations based on class
    const configs: any = {
      bladedancer: {
        primary: {
          windupTime: 200,
          range: 80,
          angle: 90,
          damage: 20,
        },
        secondary: {
          windupTime: 300,
          range: 100,
          angle: 180,
          damage: 30,
        },
      },
      guardian: {
        primary: {
          windupTime: 300,
          range: 100,
          angle: 180,
          damage: 25,
        },
        secondary: {
          windupTime: 400,
          range: 120,
          angle: 360,
          damage: 35,
        },
      },
      rogue: {
        primary: {
          windupTime: 150,
          range: 60,
          angle: 60,
          damage: 15,
        },
        secondary: {
          windupTime: 200,
          range: 80,
          angle: 90,
          damage: 25,
        },
      },
    };
    
    return configs[playerClass]?.[attackType];
  }
  
  private performMeleeHitDetection(attacker: Player, attackConfig: any): void {
    const hitPlayers: string[] = [];
    
    // Check all other players
    this.players.forEach(target => {
      // Skip self and dead/invulnerable players
      if (target.id === attacker.id || 
          target.status !== PlayerStatus.PLAYING || 
          target.isInvulnerable()) {
        return;
      }
      
      // Check if target is in range and angle
      if (this.isInMeleeRange(attacker, target, attackConfig)) {
        // Apply damage
        target.takeDamage(attackConfig.damage);
        hitPlayers.push(target.id);
        
        logger.info(`${attacker.username} hit ${target.username} for ${attackConfig.damage} damage`);
      }
    });
    
    // Broadcast hit results
    if (hitPlayers.length > 0) {
      this.connectionManager.broadcast('meleeHit', {
        attackerId: attacker.id,
        hitPlayerIds: hitPlayers,
        damage: attackConfig.damage,
        timestamp: Date.now(),
      });
    }
  }
  
  private isInMeleeRange(attacker: Player, target: Player, config: any): boolean {
    // Calculate distance
    const dx = target.position.x - attacker.position.x;
    const dy = target.position.y - attacker.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > config.range) {
      return false;
    }
    
    // Check angle if not a 360 degree attack
    if (config.angle < 360) {
      const targetAngle = Math.atan2(dy, dx);
      const attackerFacingAngle = this.facingToAngle(attacker.facing);
      
      // Calculate angle difference
      let angleDiff = Math.abs(targetAngle - attackerFacingAngle);
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
      
      // Convert to degrees and check
      const angleDiffDegrees = angleDiff * (180 / Math.PI);
      if (angleDiffDegrees > config.angle / 2) {
        return false;
      }
    }
    
    return true;
  }
  
  private facingToAngle(facing: string): number {
    const angles: { [key: string]: number } = {
      'east': 0,
      'southeast': Math.PI / 4,
      'south': Math.PI / 2,
      'southwest': 3 * Math.PI / 4,
      'west': Math.PI,
      'northwest': 5 * Math.PI / 4,
      'north': 3 * Math.PI / 2,
      'northeast': 7 * Math.PI / 4,
    };
    return angles[facing] || 0;
  }
  
  private tick(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;
    
    // Update all players
    this.players.forEach(player => {
      if (player.status === PlayerStatus.PLAYING) {
        player.update(deltaTime);
        
        // Enforce world boundaries
        this.enforceWorldBounds(player);
        
        // Check for timeouts
        if (player.isTimedOut()) {
          logger.warn(`Player ${player.username} timed out`);
          this.removePlayer(player.id);
        }
      } else if (player.status === PlayerStatus.DEAD) {
        // Move dead player to respawn queue
        this.handlePlayerDeath(player);
      }
    });
    
    // Check for players ready to respawn
    this.checkRespawns();
    
    // Update projectiles and check collisions
    this.updateProjectiles(deltaTime);
    
    // TODO: Update monsters, etc.
  }
  
  private enforceWorldBounds(player: Player): void {
    // Keep player within world bounds
    player.position.x = Math.max(0, Math.min(this.worldBounds.width, player.position.x));
    player.position.y = Math.max(0, Math.min(this.worldBounds.height, player.position.y));
  }
  
  private updateProjectiles(deltaTime: number): void {
    const projectilesToRemove: string[] = [];
    
    this.projectiles.forEach((projectile, projectileId) => {
      // Update projectile position
      projectile.update(deltaTime);
      
      // Check if projectile is out of bounds or expired
      if (!projectile.isAlive || 
          projectile.position.x < 0 || projectile.position.x > this.worldBounds.width ||
          projectile.position.y < 0 || projectile.position.y > this.worldBounds.height) {
        projectilesToRemove.push(projectileId);
        return;
      }
      
      // Check collision with players
      this.players.forEach(player => {
        // Don't hit the owner or dead players
        if (player.id === projectile.ownerId || player.status !== PlayerStatus.PLAYING) return;
        
        // Check collision (assuming player has 16 pixel radius)
        if (projectile.checkCollision(player.position, 16)) {
          // Apply damage
          player.takeDamage(projectile.damage);
          
          // Broadcast hit event
          this.connectionManager.broadcast('projectileHit', {
            projectileId: projectile.id,
            targetId: player.id,
            damage: projectile.damage,
            targetHealth: player.health,
            timestamp: Date.now(),
          });
          
          // Mark projectile for removal
          projectilesToRemove.push(projectileId);
          
          logger.info(`Projectile ${projectileId} hit player ${player.username} for ${projectile.damage} damage`);
        }
      });
    });
    
    // Remove dead projectiles
    projectilesToRemove.forEach(id => {
      this.projectiles.delete(id);
      
      // Broadcast projectile removal
      this.connectionManager.broadcast('projectileRemoved', {
        projectileId: id,
        timestamp: Date.now(),
      });
    });
  }
  
  private sendUpdates(): void {
    const playerStates: PlayerState[] = [];
    const projectileStates: ProjectileState[] = [];
    
    // Collect all player states
    this.players.forEach(player => {
      if (player.status === PlayerStatus.PLAYING || player.status === PlayerStatus.DEAD) {
        playerStates.push(player.getState());
      }
    });
    
    // Collect all projectile states
    this.projectiles.forEach(projectile => {
      if (projectile.isAlive) {
        projectileStates.push(projectile.getState());
      }
    });
    
    if (playerStates.length > 0 || projectileStates.length > 0) {
      logger.debug(`Sending game state with ${playerStates.length} players and ${projectileStates.length} projectiles`);
    }
    
    // Send updates to all connected players
    this.connectionManager.broadcast('gameState', {
      players: playerStates,
      projectiles: projectileStates,
      timestamp: Date.now(),
    });
  }
  
  private handlePlayerDeath(player: Player): void {
    // Only process death once
    if (this.deadPlayers.has(player.id)) return;
    
    // Move to dead players map
    this.deadPlayers.set(player.id, {
      player: player,
      deathTime: Date.now()
    });
    
    // Broadcast death event
    this.connectionManager.broadcast('playerDied', {
      playerId: player.id,
      username: player.username,
      position: player.position,
      respawnTime: this.RESPAWN_TIME,
      timestamp: Date.now(),
    });
    
    logger.info(`Player ${player.username} died at position ${player.position.x}, ${player.position.y}`);
  }
  
  private checkRespawns(): void {
    const now = Date.now();
    const toRespawn: string[] = [];
    
    this.deadPlayers.forEach((deadPlayer, playerId) => {
      if (now - deadPlayer.deathTime >= this.RESPAWN_TIME) {
        toRespawn.push(playerId);
      }
    });
    
    toRespawn.forEach(playerId => {
      const deadPlayer = this.deadPlayers.get(playerId);
      if (deadPlayer) {
        this.respawnPlayer(deadPlayer.player);
        this.deadPlayers.delete(playerId);
      }
    });
  }
  
  private respawnPlayer(player: Player): void {
    // Select spawn point (for now, use center of world)
    const spawnX = this.worldBounds.width / 2;
    const spawnY = this.worldBounds.height / 2;
    
    // TODO: Implement better spawn point selection
    // - Away from enemies
    // - Near team members (future feature)
    // - Designated spawn areas
    
    player.setSpawnPosition(spawnX, spawnY);
    player.respawn();
    player.setInvulnerable(this.INVULNERABILITY_TIME);
    
    // Broadcast respawn event
    this.connectionManager.broadcast('playerRespawned', {
      playerId: player.id,
      username: player.username,
      position: player.position,
      invulnerabilityDuration: this.INVULNERABILITY_TIME,
      timestamp: Date.now(),
    });
    
    logger.info(`Player ${player.username} respawned at ${spawnX}, ${spawnY} with ${this.INVULNERABILITY_TIME}ms invulnerability`);
  }
  
  getGameState() {
    return {
      playerCount: this.players.size,
      players: Array.from(this.players.values())
        .filter(p => p.status === PlayerStatus.PLAYING || p.status === PlayerStatus.DEAD)
        .map(p => p.getState()),
      worldBounds: this.worldBounds,
    };
  }
}