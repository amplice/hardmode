// src/js/core/Game.js
import * as PIXI from 'pixi.js';
import { Player }         from '../entities/Player.js';
import { InputSystem }    from '../systems/Input.js';
import { InputBuffer }    from '../systems/InputBuffer.js';
import { MovementPredictor } from '../systems/MovementPredictor.js';
import { Reconciler } from '../systems/Reconciler.js';
import { PhysicsSystem }  from '../systems/Physics.js';
import { WorldGenerator } from '../systems/world/WorldGeneratorNew.js';
import { CombatSystem }   from '../systems/CombatSystem.js';
import { MonsterSystem }  from '../systems/MonsterSystem.js';
import { Monster } from '../entities/monsters/Monster.js';
import { SpriteManager }  from '../systems/animation/SpriteManager.js';
import { TilesetManager } from '../systems/tiles/TilesetManager.js';
import { HealthUI } from '../ui/HealthUI.js';
import { StatsUI } from '../ui/StatsUI.js';
import { ClassSelectUI } from '../ui/ClassSelectUI.js'; // Import the new UI
import { NetworkClient } from '../net/NetworkClient.js';
import { LatencyTracker } from '../systems/LatencyTracker.js';
import { ProjectileRenderer } from '../systems/ProjectileRenderer.js';
import { GAME_CONSTANTS } from '../../../shared/constants/GameConstants.js';
import { velocityToDirectionString } from '../utils/DirectionUtils.js';
import { DebugLogger } from '../debug/DebugLogger.js';

// Toggle display of extra stat information in the Stats UI
const SHOW_DEBUG_STATS = true;

// 1) turn off antialias & force pixel‐perfect
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

export class Game {
  constructor() {
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x000000,
      resizeTo: window,
      antialias: false,      // no smoothing
      autoDensity: true,
      resolution: window.devicePixelRatio
    });
    // ensure HTML canvas uses pixelated rendering
    this.app.renderer.plugins.interaction.enableCursor = false; // Disable cursor interpolation

    this.app.renderer.roundPixels = true; 
    this.app.view.style.imageRendering = 'pixelated';

    document.body.appendChild(this.app.view);

    this.worldContainer  = new PIXI.Container();
    this.worldContainer.sortableChildren = true; // Enable zIndex sorting for debug overlay
    this.entityContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.uiContainer.sortableChildren = true;
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.entityContainer);
    this.app.stage.addChild(this.uiContainer);

    this.camera = { 
      x: 0, 
      y: 0, 
      targetX: 0, 
      targetY: 0, 
      zoom: 1,
      smoothing: 0.25 // Increased for better responsiveness on slower hardware
    };

    this.systems = {
      input:   new InputSystem(),
      inputBuffer: new InputBuffer(),
      predictor: null, // will init after latency tracker
      reconciler: null, // will init after predictor
      physics: new PhysicsSystem(),
      world:   null,               // will init after tilesets
      combat:  new CombatSystem(this.app),
      sprites: new SpriteManager()
    };

    this.entities = { player: null };
    window.game = this;
    
    // Add camera smoothing controls for testing
    window.setCameraSmoothing = (value) => {
      this.camera.smoothing = Math.max(0.01, Math.min(1.0, value));
      // Camera smoothing updated
    };
    
    // Add latency debugging commands (will be available after game starts)
    window.getLatencyStats = () => {
      if (this.latencyTracker) {
        const stats = this.latencyTracker.getStats();
        // Connection quality stats retrieved
        return stats;
      } else {
        // Latency tracker not initialized - start game first
        return null;
      }
    };
    
    // Add anti-cheat debugging command
    window.getAntiCheatStats = async () => {
      try {
        const response = await fetch('/anticheat-stats');
        const stats = await response.json();
        // Anti-cheat stats retrieved
        return stats;
      } catch (error) {
        console.error('Failed to get anti-cheat stats:', error);
        return null;
      }
    };

    this.tilesets = new TilesetManager();
    this.network = null;
    this.loadAndInit();
    
    // Flag to track game state
    this.gameStarted = false;
    
    // Initialize debug logger
    this.debugLogger = new DebugLogger();
    this.debugLogger.setupConsoleCommands();
    
    
    // Will be initialized when game starts
    this.projectileRenderer = null;
    
    // Input throttling disabled - causes jerkiness
    // Anti-cheat is lenient enough to handle 60fps inputs
  }

  // Apply server configuration to override client defaults
  applyServerConfig(config) {
    if (config.debug) {
      // Update debug settings from server
      GAME_CONSTANTS.DEBUG.USE_DEBUG_TILESET = config.debug.USE_DEBUG_TILESET;
      GAME_CONSTANTS.DEBUG.ENABLE_TILE_LOGGING = config.debug.ENABLE_TILE_LOGGING;
      GAME_CONSTANTS.DEBUG.ENABLE_MONSTER_LOGGING = config.debug.ENABLE_MONSTER_LOGGING;
      GAME_CONSTANTS.DEBUG.ENABLE_COMBAT_LOGGING = config.debug.ENABLE_COMBAT_LOGGING;
    }
    
    if (config.features) {
      // Update feature settings from server
      GAME_CONSTANTS.LEVELS.PLAYTEST_MODE = config.features.PLAYTEST_MODE;
      // Note: PVP would be handled server-side, no need to update client
    }
    
    // Applied server configuration
  }

  async loadAndInit() {
    try {
      await this.tilesets.load();               // load & slice all sheets
      await this.systems.sprites.loadSprites(); // then other art
      
      // Show class selection UI instead of immediately starting the game
      this.showClassSelection();
    } catch (err) {
      console.error('Failed to load game assets:', err);
    }
  }
  
  // Add new method to show class selection
  showClassSelection() {
    this.classSelectUI = new ClassSelectUI(this.startGame.bind(this));
    this.uiContainer.addChild(this.classSelectUI.container);
  }
  
  // Modified to accept selectedClass parameter
  startGame(selectedClass) {
    if (!this.network) {
      this.network = new NetworkClient(this);
      // Initialize latency tracker after network client
      this.latencyTracker = new LatencyTracker(this.network);
      
      // Jitter buffer disabled - caused laggy behavior
      
      // Note: predictor and reconciler will be initialized after world generation
    }
    // Remove class selection UI
    if (this.classSelectUI) {
      this.uiContainer.removeChild(this.classSelectUI.container);
      this.classSelectUI = null;
    }
    
    // Initialize the game world using server's seed if available
    const worldSeed = this.network ? this.network.serverWorldSeed || GAME_CONSTANTS.WORLD.SEED : GAME_CONSTANTS.WORLD.SEED;
    // Using world seed
    
    this.systems.world = new WorldGenerator({
      width:    GAME_CONSTANTS.WORLD.WIDTH,
      height:   GAME_CONSTANTS.WORLD.HEIGHT,
      tileSize: GAME_CONSTANTS.WORLD.TILE_SIZE,
      seed:     worldSeed,
      tilesets: this.tilesets
    });

    const worldView = this.systems.world.generate();
    this.worldContainer.addChild(worldView);
    
    // Now initialize predictor and reconciler with collision mask from generated world
    if (this.network) {
      this.systems.predictor = new MovementPredictor(this.latencyTracker, this.systems.world.collisionMask);
      this.systems.reconciler = new Reconciler(this.systems.inputBuffer, this.systems.predictor);
    }
    

    // Create player with selected class
    this.entities.player = new Player({
      x: (this.systems.world.width  / 2) * this.systems.world.tileSize,
      y: (this.systems.world.height / 2) * this.systems.world.tileSize,
      class:         selectedClass || 'bladedancer', // Use selected or default
      combatSystem:  this.systems.combat,
      spriteManager: this.systems.sprites
    });
    this.entityContainer.addChild(this.entities.player.sprite);

    if (this.network) {
      this.network.setClass(this.entities.player.characterClass);
      // No need to send collision mask - server generates same world with same seed
    }

    // Add health and stats UI
    this.healthUI = new HealthUI(this.entities.player);
    this.statsUI = new StatsUI(this.entities.player, { showDebug: SHOW_DEBUG_STATS });
    this.uiContainer.addChild(this.healthUI.container);
    this.uiContainer.addChild(this.statsUI.container);
    
    // Initialize projectile renderer
    this.projectileRenderer = new ProjectileRenderer(this);

    // Monsters are now always handled by server
    // if (!this.network) {
    //   this.systems.monsters = new MonsterSystem(this.systems.world);
    // }

    // Initialize camera position to player position (prevents initial camera jump)
    this.camera.x = this.entities.player.position.x;
    this.camera.y = this.entities.player.position.y;
    this.camera.targetX = this.entities.player.position.x;
    this.camera.targetY = this.entities.player.position.y;
    
    this.updateCamera();
    this.app.ticker.add(this.update.bind(this));
    this.gameStarted = true;
    // Game initialized with player class
  }

  update(delta) {
    // Only update game if it has started
    if (!this.gameStarted) return;
    
    const deltaTimeSeconds = delta / 60;

    // 1. Capture and process input
    const inputState = this.systems.input.update();
    const prevPlayerState = this.entities.player.isAttacking ? 'attacking' : 'idle';
    const prevPlayerHP = this.entities.player.hitPoints;

    // Phase 2: Client-side prediction + input sending
    if (this.network && this.network.connected) {
      // Filter movement keys during attacks
      const isAttacking = this.entities.player.isAttacking;
      const allKeys = this.getActiveKeys(inputState);
      const keys = isAttacking ? 
        allKeys.filter(key => !['w', 's', 'a', 'd'].includes(key)) : // Remove movement keys during attack
        allKeys; // Keep all keys when not attacking
      
      // Create input command for network
      const inputData = {
        keys: keys,
        facing: this.entities.player.facing,
        deltaTime: deltaTimeSeconds
      };
      
      // Add to buffer and send to server
      const networkInput = this.systems.inputBuffer.createNetworkInput(inputData);
      this.network.sendPlayerInput(networkInput);

      // PHASE 2: Predict movement immediately for responsive feel
      // Skip prediction during any attack (attacks should lock movement)
      const isServerControlled = isAttacking && 
                                  this.entities.player.currentAttackType &&
                                  ['secondary'].includes(this.entities.player.currentAttackType);
                                  
      if (!isAttacking) {
        
        const currentState = {
          x: this.entities.player.position.x,
          y: this.entities.player.position.y,
          facing: this.entities.player.facing,
          class: this.entities.player.characterClass
        };

        const predictedState = this.systems.predictor.predictMovement(currentState, networkInput);
        
        // Update visual position immediately (client prediction)
        this.entities.player.position.x = predictedState.x;
        this.entities.player.position.y = predictedState.y;
        this.entities.player.facing = predictedState.facing;
        this.entities.player.sprite.position.set(predictedState.x, predictedState.y);
      }

      // Store server position separately for reconciliation
      if (!this.entities.player.serverPosition) {
        this.entities.player.serverPosition = { 
          x: this.entities.player.position.x, 
          y: this.entities.player.position.y 
        };
      }

      // Still need to handle non-movement updates (attacks, animations, etc.)
      // But skip the movement component
      this.entities.player.handleNonMovementUpdate(deltaTimeSeconds, inputState);
      
    } else {
      // Fallback to local-only movement when not connected
      this.entities.player.update(deltaTimeSeconds, inputState);
    }
    
    // Log player state changes
    if (prevPlayerState !== (this.entities.player.isAttacking ? 'attacking' : 'idle')) {
      this.debugLogger.logEvent('playerStateChange', { 
        from: prevPlayerState, 
        to: this.entities.player.isAttacking ? 'attacking' : 'idle',
        attackType: this.entities.player.currentAttackType
      });
    }
    if (prevPlayerHP !== this.entities.player.hitPoints) {
      this.debugLogger.logEvent('playerDamage', { 
        from: prevPlayerHP, 
        to: this.entities.player.hitPoints,
        damage: prevPlayerHP - this.entities.player.hitPoints
      });
      if (this.entities.player.hitPoints <= 0) {
        this.debugLogger.logEvent('playerDeath', { 
          class: this.entities.player.characterClass,
          position: this.entities.player.position
        });
      }
    }
    
    // 2. Monsters are now handled by server
    
    // 3. Only physics for player now (monsters handled server-side)
    const allEntitiesForPhysics = [this.entities.player];
    
    // 4. Apply physics (world boundaries and tile collisions) to all collected entities
    this.systems.physics.update(deltaTimeSeconds, allEntitiesForPhysics, this.systems.world);
    
    // 5. Jitter buffer disabled for better responsiveness
    
    // 6. Update combat, camera, and UI
    this.systems.combat.update(deltaTimeSeconds);
    if (this.projectileRenderer) {
      this.projectileRenderer.update(deltaTimeSeconds);
    }
    this.updateCamera(); // Depends on player's final position after physics
    this.healthUI.update();
    if (this.statsUI) this.statsUI.update();

    // Remove old position sending - now using input commands
    // if (this.network) {
    //   this.network.sendPlayerUpdate(this.entities.player);
    // }

    // Update remote player animations
    this.updateRemotePlayers(deltaTimeSeconds);
    
    // Update remote monsters
    this.updateRemoteMonsters(deltaTimeSeconds);
    
    // Capture debug state every frame
    this.debugLogger.captureGameState(this);
  }

  /**
   * Extract active keys from input state for network transmission
   */
  getActiveKeys(inputState) {
    const keys = [];
    if (inputState.up) keys.push('w');
    if (inputState.down) keys.push('s');
    if (inputState.left) keys.push('a');
    if (inputState.right) keys.push('d');
    if (inputState.primaryAttack) keys.push('mouse1');
    if (inputState.secondaryAttack) keys.push('space');
    if (inputState.roll) keys.push('shift');
    return keys;
  }

  updateCamera() {
    if (!this.gameStarted) return;
    
    // Set target position to current player position
    this.camera.targetX = this.entities.player.position.x;
    this.camera.targetY = this.entities.player.position.y;
    
    // Smoothly interpolate camera towards target
    this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
    this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
    
    // Apply camera position to containers
    const camX = Math.floor(this.app.screen.width / 2 - this.camera.x);
    const camY = Math.floor(this.app.screen.height / 2 - this.camera.y);
    
    this.worldContainer.position.set(camX, camY);
    this.entityContainer.position.set(camX, camY);
  }

  // Multiplayer helpers
  initMultiplayerWorld(data) {
    // Replace local world with server-defined world using deterministic seed
    if (this.systems.world) {
      this.worldContainer.removeChildren();
    }
    this.systems.world = new WorldGenerator({
      width: data.width,
      height: data.height,
      tileSize: data.tileSize,
      tilesets: this.tilesets,
      seed: data.seed
    });
    const worldView = this.systems.world.generate();
    this.worldContainer.addChild(worldView);
    // Connected to multiplayer server
  }

  addRemotePlayer(info) {
    const p = new Player({
      x: info.x,
      y: info.y,
      class: info.class,
      combatSystem: this.systems.combat,
      spriteManager: this.systems.sprites
    });
    p.id = info.id;
    p.hitPoints = info.hp;
    this.entityContainer.addChild(p.sprite);
    if (!this.remotePlayers) this.remotePlayers = new Map();
    this.remotePlayers.set(info.id, p);
  }

  updateRemotePlayer(info) {
    if (!this.remotePlayers || !this.remotePlayers.has(info.id)) return;
    const p = this.remotePlayers.get(info.id);
    if (info.class && info.class !== p.characterClass) {
      p.characterClass = info.class;
      p.currentAnimation = null;
      if (p.animatedSprite && p.animatedSprite.parent) {
        p.sprite.removeChild(p.animatedSprite);
        p.animatedSprite = null;
      }
      p.animation.setupAnimations();
    }

    const prevX = p.position.x;
    const prevY = p.position.y;

    p.lastFacing = p.facing;
    p.position.x = info.x;
    p.position.y = info.y;
    p.facing = info.facing;
    p.sprite.position.set(p.position.x, p.position.y);

    const dx = info.x - prevX;
    const dy = info.y - prevY;
    p.isMoving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
    if (p.isMoving) {
      p.movementDirection = velocityToDirectionString(dx, dy);
    } else {
      p.movementDirection = null;
    }

    p.animation.update();
    if (typeof info.hp === 'number') {
      p.hitPoints = info.hp;
      if (info.hp <= 0 && !p.isDead) {
        p.health.die();
      } else if (info.hp > 0 && p.isDead) {
        p.health.respawn();
      }
    }
    
    // Update spawn protection status for remote players
    if (info.spawnProtectionTimer !== undefined) {
      p.spawnProtectionTimer = info.spawnProtectionTimer;
      if (p.spawnProtectionTimer > 0 && p.animatedSprite) {
        p.animatedSprite.tint = 0xFFFF00; // Yellow tint
      } else if (p.animatedSprite) {
        p.animatedSprite.tint = 0xFFFFFF; // Normal tint
      }
    }
  }

  updateRemotePlayers(delta) {
    if (!this.remotePlayers) return;
    for (const p of this.remotePlayers.values()) {
      p.animation.update();
    }
  }

  updateRemoteMonsters(delta) {
    if (!this.remoteMonsters) return;
    for (const monster of this.remoteMonsters.values()) {
      monster.update(delta);
    }
  }

  updateLocalPlayerState(info) {
    if (!this.entities.player) return;
    this.entities.player.position.x = info.x;
    this.entities.player.position.y = info.y;
    this.entities.player.facing = info.facing;
    if (typeof info.hp === 'number') {
      this.entities.player.hitPoints = info.hp;
      if (info.hp <= 0 && !this.entities.player.isDead) {
        this.entities.player.health.die();
      } else if (info.hp > 0 && this.entities.player.isDead) {
        this.entities.player.health.respawn();
      }
    }
    this.entities.player.sprite.position.set(info.x, info.y);
  }

  removeRemotePlayer(id) {
    if (!this.remotePlayers || !this.remotePlayers.has(id)) return;
    const p = this.remotePlayers.get(id);
    if (p.sprite.parent) p.sprite.parent.removeChild(p.sprite);
    this.remotePlayers.delete(id);
  }

  addOrUpdateMonster(info) {
    if (!this.remoteMonsters) this.remoteMonsters = new Map();
    let monster = this.remoteMonsters.get(info.id);
    
    if (!monster) {
      // Create new monster
      monster = new Monster({
        id: info.id,
        x: info.x,
        y: info.y,
        type: info.type,
        hp: info.hp,
        maxHp: info.maxHp
      });
      this.entityContainer.addChild(monster.sprite);
      this.remoteMonsters.set(info.id, monster);
      // Created new monster
    }
    
    // Update monster state from server
    monster.updateFromServer(info);
    
    // Remove dead/dying monsters after animation
    if (info.state === 'dying' || info.hp <= 0) {
      setTimeout(() => {
        if (monster.sprite.parent) {
          monster.sprite.parent.removeChild(monster.sprite);
        }
        this.remoteMonsters.delete(info.id);
        // Removed monster
      }, 1000); // Wait for death animation
    }
  }

  remotePlayerAttack(id, type, facing) {
    if (!this.remotePlayers || !this.remotePlayers.has(id)) return;
    const p = this.remotePlayers.get(id);
    p.facing = facing || p.facing;
    p.isAttacking = true;
    p.attackHitFrameReached = false;
    p.currentAttackType = type;
    
    // Store current position for effect positioning (fixes effects appearing at wrong location)
    p.startPositionForAttack = { x: p.position.x, y: p.position.y };
    
    if (p.animation) {
      p.animation.playAttackAnimation(type);
    }
    
    // Also trigger combat system effects for remote player attacks
    if (this.systems.combat) {
      this.systems.combat.executeAttack(p, type);
    }
  }
}
