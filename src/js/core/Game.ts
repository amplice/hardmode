/**
 * @fileoverview Game - Main client-side game orchestrator and network integration
 * 
 * MIGRATION NOTES:
 * - Converted from Game.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 4
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for all game systems and entities
 * - Preserved all network integration and client prediction logic
 * 
 * ARCHITECTURE ROLE:
 * - Central client coordinator managing all game systems and entities
 * - Creates and owns NetworkClient instance for multiplayer communication
 * - Implements main game loop with client-side prediction and reconciliation
 * - Handles PIXI.js rendering pipeline and world/entity management
 * 
 * NETWORK INTEGRATION PATTERN:
 * - this.network = new NetworkClient(this) creates bidirectional relationship
 * - processPlayerUpdate() integrates with client prediction (Reconciler)
 * - addOrUpdateMonster() processes delta-merged monster states
 * - Game loop runs client prediction while network syncs authoritative state
 * 
 * CLIENT PREDICTION FLOW:
 * 1. User input → InputBuffer → MovementPredictor (optimistic updates)
 * 2. Network sends input to server for validation
 * 3. Server sends authoritative state with lastProcessedSeq
 * 4. Reconciler corrects client prediction if server disagrees
 * 5. Visual smoothness maintained while ensuring server authority
 * 
 * MULTIPLAYER ENTITY MANAGEMENT:
 * - Local player: Full prediction + reconciliation system
 * - Remote players: Direct position updates from server state
 * - Monsters: Server-authoritative with delta compression optimization
 */

// src/js/core/Game.ts
import * as PIXI from 'pixi.js';
import { Player }         from '../entities/Player.js';
import { InputSystem }    from '../systems/Input.js';
import { InputBuffer }    from '../systems/InputBuffer.js';
import { MovementPredictor } from '../systems/MovementPredictor.js';
import { Reconciler } from '../systems/Reconciler.js';
import { PhysicsSystem }  from '../systems/Physics.js';
import { ClientWorldRenderer } from '../systems/world/ClientWorldRenderer.js';
import { SharedWorldGenerator } from '../../../shared/systems/WorldGenerator.js';
import { CombatSystem }   from '../systems/CombatSystem.js';
import { MonsterSystem }  from '../systems/MonsterSystem.js';
import { Monster } from '../entities/monsters/Monster.js';
import { SpriteManager }  from '../systems/animation/SpriteManager.js';
import { TilesetManager } from '../systems/tiles/TilesetManager.js';
import { HealthUI } from '../ui/HealthUI.js';
import { StatsUI } from '../ui/StatsUI.js';
import { ActionBoxUI } from '../ui/ActionBoxUI.js';
import { UsernameUI } from '../ui/UsernameUI.js';
import { ClassSelectUI } from '../ui/ClassSelectUI.js'; // Import the new UI
import { MusicUI } from '../ui/MusicUI.js';
import { NetworkClient } from '../net/NetworkClient.js';
import { LatencyTracker } from '../systems/LatencyTracker.js';
import { ProjectileRenderer } from '../systems/ProjectileRenderer.js';
import { PowerupRenderer } from '../systems/PowerupRenderer.js';
import { AttackTelegraphRenderer } from '../systems/AttackTelegraphRenderer.js';
import { GAME_CONSTANTS } from '../../../shared/constants/GameConstants.js';
import { velocityToDirectionString } from '../utils/DirectionUtils.js';
import { DebugLogger } from '../debug/DebugLogger.js';
import { PerformanceOverlay } from '../ui/PerformanceOverlay.js';
import { soundManager } from '../systems/SoundManager.js';
import { SOUND_CONFIG, MUSIC_TRACKS } from '../config/SoundConfig.js';
import type {
    GameSystems,
    GameEntities,
    Camera,
    NetworkInput,
    MonsterInfo,
    PlayerInfo,
    WorldData,
    InputState,
    PIXIContainer
} from '../types/index.js';

// Toggle display of extra stat information in the Stats UI
const SHOW_DEBUG_STATS = true;

// 1) turn off antialias & force pixel‐perfect
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

export class Game {
  app: PIXI.Application;
  worldContainer: PIXIContainer;
  entityContainer: PIXIContainer;
  uiContainer: PIXIContainer;
  camera: Camera;
  systems: GameSystems;
  entities: GameEntities;
  remotePlayers?: Map<string, Player>;
  remoteMonsters?: Map<string, any>; // Monster type
  network?: any; // NetworkClient
  latencyTracker?: any; // LatencyTracker
  tilesets?: any; // TilesetManager.TilesetData
  spriteManager?: any; // SpriteManager
  gameStarted: boolean = false;
  debugMonsterSpawningEnabled: boolean = false;
  selectedClass?: string;
  username?: string;
  usernameUI?: any; // UsernameUI
  classSelectUI?: any; // ClassSelectUI
  connectingMessage?: PIXI.Text;
  healthUI?: any; // HealthUI
  statsUI?: any; // StatsUI
  actionBoxUI?: any; // ActionBoxUI
  musicUI?: MusicUI;
  projectileRenderer?: any; // ProjectileRenderer
  powerupRenderer?: any; // PowerupRenderer
  telegraphRenderer?: AttackTelegraphRenderer;
  debugLogger: DebugLogger;
  performanceOverlay?: any; // PerformanceOverlay
  
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
    (this.app.renderer as any).events.cursorStyles.default = 'inherit'; // Use CSS cursor instead of PIXI's

    (this.app.renderer as any).roundPixels = true; 
    (this.app.view as any).style.imageRendering = 'pixelated';

    document.body.appendChild(this.app.view as any);

    this.worldContainer  = new PIXI.Container();
    this.worldContainer.sortableChildren = true; // Enable zIndex sorting for debug overlay
    this.entityContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.uiContainer.sortableChildren = true;
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.entityContainer);
    this.app.stage.addChild(this.uiContainer);

    // Handle window resize for UI scaling
    window.addEventListener('resize', () => {
      if (this.classSelectUI) {
        this.classSelectUI.resize();
      }
      // Update sound manager with new screen dimensions
      soundManager.updateScreenDimensions(window.innerWidth, window.innerHeight);
    });

    this.camera = { 
      x: 0, 
      y: 0, 
      targetX: 0, 
      targetY: 0, 
      zoom: 0.85, // Decreased to show more FOV (0.85 = 15% more visible area)
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

    this.entities = { player: null } as any;
    (window as any).game = this;
    
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
  applyServerConfig(config: any): void {
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

  async loadAndInit(): Promise<void> {
    try {
      await this.tilesets.load();               // load & slice all sheets
      await this.systems.sprites.loadSprites(); // then other art
      
      // Show username UI first
      this.showUsernamePrompt();
    } catch (err) {
      console.error('Failed to load game assets:', err);
    }
  }
  
  // Show username prompt
  showUsernamePrompt(): void {
    // Initialize network connection early for username validation
    if (!this.network) {
      this.network = new NetworkClient(this);
      this.latencyTracker = new LatencyTracker(this.network);
      
      // Set up username validation handler
      this.network.socket.on('usernameResult', (data: { success: boolean; message?: string }) => {
        if (data.success) {
          this.handleUsernameAccepted();
        } else {
          if (this.usernameUI) {
            this.usernameUI.showError(data.message || 'Username validation failed');
          }
        }
      });
    }
    
    this.usernameUI = new UsernameUI(this.handleUsernameSubmit.bind(this));
    this.uiContainer.addChild(this.usernameUI.container);
    this.usernameUI.show();
  }
  
  // Handle username submission
  handleUsernameSubmit(username: string): void {
    // Validate with server
    this.username = username;
    this.network.socket.emit('validateUsername', { username });
  }
  
  // Handle successful username validation
  handleUsernameAccepted(): void {
    // Remove username UI
    if (this.usernameUI) {
      this.usernameUI.hide();
      this.uiContainer.removeChild(this.usernameUI.container);
      this.usernameUI.destroy();
      this.usernameUI = null;
    }
    
    // Show class selection
    this.showClassSelection();
  }
  
  // Add new method to show class selection
  showClassSelection(): void {
    this.classSelectUI = new ClassSelectUI(this.startGame.bind(this));
    this.uiContainer.addChild(this.classSelectUI.container);
  }
  
  // Modified to accept selectedClass parameter
  startGame(selectedClass: string): void {
    console.log('[Game] Starting game with selected class:', selectedClass);
    
    // Remove class selection UI
    if (this.classSelectUI) {
      this.uiContainer.removeChild(this.classSelectUI.container);
      this.classSelectUI = null;
    }
    
    // Store selected class for when we get server world data
    this.selectedClass = selectedClass;
    
    // Network should already be initialized from username phase
    if (this.network) {
      // Send class selection to server
      this.network.setClass(selectedClass);
      
      // Process any stored init data from earlier connection
      this.network.processStoredInitData();
    } else {
      console.error('[Game] Network not initialized - this should not happen');
    }
  }
  
  showConnectingMessage(): void {
    // Create simple connecting text
    const connectingText = new PIXI.Text('Connecting to server...', {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xffffff,
      align: 'center'
    });
    connectingText.anchor.set(0.5);
    connectingText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    connectingText.zIndex = 1000; // Ensure it's on top
    
    this.connectingMessage = connectingText;
    this.uiContainer.addChild(connectingText);
  }
  
  hideConnectingMessage(): void {
    if (this.connectingMessage && this.connectingMessage.parent) {
      this.uiContainer.removeChild(this.connectingMessage);
      this.connectingMessage = undefined;
    }
  }

  update(delta: number): void {
    // Only update game if it has started
    if (!this.gameStarted) return;
    
    // Track performance
    if (this.performanceOverlay) {
      this.performanceOverlay.startUpdateTimer();
      this.performanceOverlay.updateFPS();
    }
    
    const deltaTimeSeconds = delta / 60;

    // 1. Capture and process input
    const inputState = this.systems.input.update() as InputState;
    const prevPlayerState = this.entities.player.isAttacking ? 'attacking' : 'idle';
    const prevPlayerHP = this.entities.player.hitPoints;

    // Phase 2: Client-side prediction + input sending
    if (this.network && this.network.connected) {
      // Don't send any movement inputs if dead or dying
      const isDead = this.entities.player.isDying || this.entities.player.isDead;
      
      // Filter movement keys during attacks or death
      const isAttacking = this.entities.player.isAttacking;
      const allKeys = this.getActiveKeys(inputState);
      const keys = isDead ?
        [] : // No inputs when dead
        isAttacking ? 
        allKeys.filter(key => !['w', 's', 'a', 'd'].includes(key)) : // Remove movement keys during attack
        allKeys; // Keep all keys when not attacking
      
      // Create input command for network
      const inputData: Omit<NetworkInput, 'seq'> = {
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
                                  
      if (!isAttacking && !isDead) {
        
        const currentState = {
          x: this.entities.player.position.x,
          y: this.entities.player.position.y,
          facing: this.entities.player.facing,
          class: this.entities.player.characterClass,
          level: this.entities.player.level,
          moveSpeed: this.entities.player.moveSpeed
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
      // But skip the movement component unless dead
      if (!isDead) {
        // Get current biome for footstep sounds
        const tileX = Math.floor(this.entities.player.position.x / 64);
        const tileY = Math.floor(this.entities.player.position.y / 64);
        const currentBiome = this.worldData?.biomeData?.[tileY]?.[tileX] ?? 0;
        
        this.entities.player.handleNonMovementUpdate(deltaTimeSeconds, inputState, currentBiome);
      } else {
        // When dead, only update health (for respawn) and animations
        this.entities.player.health.update(deltaTimeSeconds);
        (this.entities.player.animation as any).update();
      }
      
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
    if (this.powerupRenderer) {
      this.powerupRenderer.update(deltaTimeSeconds);
    }
    if (this.telegraphRenderer) {
      this.telegraphRenderer.update(deltaTimeSeconds);
    }
    this.updateCamera(); // Depends on player's final position after physics
    this.healthUI.update();
    if (this.statsUI) this.statsUI.update();
    if (this.actionBoxUI) this.actionBoxUI.update();
    if (this.musicUI) this.musicUI.update();

    // Remove old position sending - now using input commands
    // if (this.network) {
    //   this.network.sendPlayerUpdate(this.entities.player);
    // }

    // Update remote player animations
    this.updateRemotePlayers(deltaTimeSeconds);
    
    // Update remote monsters
    this.updateRemoteMonsters(deltaTimeSeconds);
    
    // Update tree animations
    if (this.systems.world) {
      this.systems.world.updateAnimations(deltaTimeSeconds);
    }
    
    // Capture debug state every frame
    this.debugLogger.captureGameState(this);
    
    // Update performance metrics
    if (this.performanceOverlay) {
      this.performanceOverlay.endUpdateTimer();
      
      // Count monsters
      const activeMonsters = this.remoteMonsters ? this.remoteMonsters.size : 0;
      const totalMonsters = activeMonsters; // Same for now since all monsters are active
      this.performanceOverlay.updateMonsterCount(activeMonsters, totalMonsters);
      
      // Update latency if available
      if (this.latencyTracker) {
        const stats = this.latencyTracker.getStats();
        this.performanceOverlay.updateLatency(stats.averageRTT);
      }
    }
  }

  /**
   * Extract active keys from input state for network transmission
   */
  getActiveKeys(inputState: InputState): string[] {
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

  /**
   * CAMERA SYSTEM: Smooth player-following camera with chunked rendering integration
   * 
   * PERFORMANCE INTEGRATION:
   * Camera position drives chunked rendering optimization:
   * 1. updatePlayerPosition() notifies ChunkedWorldRenderer of movement
   * 2. ChunkedWorldRenderer calculates player's current chunk
   * 3. Loads/unloads 3x3 chunk grid around camera position
   * 4. Massive memory savings for large worlds (77% sprite reduction)
   * 
   * SMOOTHING ALGORITHM:
   * Linear interpolation provides smooth camera follow without jitter:
   * - camera.smoothing = 0.25 balances responsiveness vs smoothness
   * - Higher values = more responsive, lower = smoother but laggy
   * - Math.floor prevents sub-pixel positioning artifacts
   * 
   * CONTAINER COORDINATION:
   * worldContainer: Static world tiles (terrain, cliffs, decorations)
   * entityContainer: Dynamic entities (players, monsters, projectiles)
   * Both containers move together maintaining perfect visual alignment
   */
  updateCamera(): void {
    if (!this.gameStarted) return;
    
    // Set target position to current player position
    this.camera.targetX = this.entities.player.position.x;
    this.camera.targetY = this.entities.player.position.y;
    
    // Smoothly interpolate camera towards target
    this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
    this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
    
    // Apply camera position to containers with zoom
    const camX = Math.floor(this.app.screen.width / 2 - this.camera.x * this.camera.zoom);
    const camY = Math.floor(this.app.screen.height / 2 - this.camera.y * this.camera.zoom);
    
    this.worldContainer.position.set(camX, camY);
    this.entityContainer.position.set(camX, camY);
    
    // Apply zoom scale to world
    this.worldContainer.scale.set(this.camera.zoom, this.camera.zoom);
    this.entityContainer.scale.set(this.camera.zoom, this.camera.zoom);
    
    // CHUNKED RENDERING INTEGRATION: Notify chunked renderer of camera movement
    // This triggers chunk loading/unloading based on player's current position
    if (this.systems.world && this.systems.world.isChunkedMode) {
      this.systems.world.updatePlayerPosition(this.entities.player.position.x, this.entities.player.position.y);
    }
    
    // Update spatial audio listener position
    this.updateSpatialAudio();
  }

  // Multiplayer helpers
  initializeGameWorld(data: WorldData): void {
    console.log('[Game] Initializing game world with server seed:', data.seed);
    
    // Hide connecting message if it exists
    this.hideConnectingMessage();
    
    // Initialize sound system (fire and forget - don't block game start)
    this.initializeSounds().catch(err => {
      console.warn('[Game] Failed to load some sounds:', err);
      // Continue anyway - game works without sounds
    });
    
    // Generate world data once using SharedWorldGenerator with server's seed
    const worldGenerator = new SharedWorldGenerator(
      data.width,
      data.height,
      data.seed
    );
    const worldData = worldGenerator.generateWorld();
    
    // Create renderer and render the world data  
    this.systems.world = new ClientWorldRenderer({
      width: data.width,
      height: data.height,
      tileSize: data.tileSize,
      tilesets: this.tilesets,
      seed: data.seed
    });
    
    // Determine if we should use chunked rendering for performance
    const totalTiles = data.width * data.height;
    const useChunkedRendering = totalTiles > 20000; // Use chunked rendering for worlds larger than 20k tiles
    
    console.log(`[Game] World size: ${data.width}x${data.height} (${totalTiles} tiles)`);
    console.log(`[Game] Using ${useChunkedRendering ? 'chunked' : 'full'} rendering`);
    
    const worldView = this.systems.world.render(worldData, worldGenerator, { useChunkedRendering });
    this.worldContainer.addChild(worldView);
    
    // Now initialize prediction systems with collision mask
    this.systems.predictor = new MovementPredictor(this.latencyTracker, this.systems.world.collisionMask);
    this.systems.reconciler = new Reconciler(this.systems.inputBuffer, this.systems.predictor);
    
    // Create player with selected class
    this.entities.player = new Player({
      x: (data.width / 2) * data.tileSize,
      y: (data.height / 2) * data.tileSize,
      class: this.selectedClass || 'bladedancer',
      username: this.username,
      combatSystem: this.systems.combat,
      spriteManager: this.systems.sprites
    });
    
    // Mark as local player for sound and other systems
    this.entities.player.isLocalPlayer = true;
    
    this.entityContainer.addChild(this.entities.player.sprite);

    // Don't need to set class again - already sent during startGame
    console.log('[Game] Created player with class:', this.entities.player.characterClass);

    // Add health and stats UI
    this.healthUI = new HealthUI(this.entities.player);
    this.statsUI = new StatsUI(this.entities.player, { showDebug: SHOW_DEBUG_STATS });
    this.actionBoxUI = new ActionBoxUI();
    this.musicUI = new MusicUI();
    this.musicUI.setPosition(10, window.innerHeight - 40); // Bottom left corner
    this.uiContainer.addChild(this.healthUI.container);
    this.uiContainer.addChild(this.statsUI.container);
    this.uiContainer.addChild(this.actionBoxUI.container);
    this.uiContainer.addChild(this.musicUI.getContainer());
    
    // Initialize projectile renderer
    this.projectileRenderer = new ProjectileRenderer(this);
    
    // Initialize powerup renderer
    this.powerupRenderer = new PowerupRenderer(this);
    
    // Initialize telegraph renderer
    this.telegraphRenderer = new AttackTelegraphRenderer();
    this.entityContainer.addChild(this.telegraphRenderer.getContainer());
    
    // Initialize performance overlay
    this.performanceOverlay = new PerformanceOverlay();
    this.uiContainer.addChild(this.performanceOverlay.getContainer());
    
    // Toggle performance overlay with F3 key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        this.performanceOverlay.toggle();
      }
    });
    
    // Debug monster spawning system (F4 to toggle, numbers 1-8 to spawn)
    this.setupDebugMonsterSpawning();

    // Initialize camera position to player position (prevents initial camera jump)
    this.camera.x = this.entities.player.position.x;
    this.camera.y = this.entities.player.position.y;
    this.camera.targetX = this.entities.player.position.x;
    this.camera.targetY = this.entities.player.position.y;
    
    this.updateCamera();
    this.app.ticker.add(this.update.bind(this));
    this.gameStarted = true;
    
    console.log('[Game] Game initialized with server world data');
  }

  addRemotePlayer(info: PlayerInfo): void {
    const p = new Player({
      x: info.x,
      y: info.y,
      class: info.class,
      username: info.username,
      combatSystem: this.systems.combat,
      spriteManager: this.systems.sprites
    });
    p.id = info.id;
    p.hitPoints = info.hp;
    this.entityContainer.addChild(p.sprite);
    if (!this.remotePlayers) this.remotePlayers = new Map();
    this.remotePlayers.set(info.id, p);
  }

  updateRemotePlayer(info: PlayerInfo & { movementDirection?: string | null; spawnProtectionTimer?: number }): void {
    if (!this.remotePlayers || !this.remotePlayers.has(info.id)) return;
    const p = this.remotePlayers.get(info.id);
    if (!p) return;
    if (info.class && info.class !== p.characterClass) {
      p.characterClass = info.class;
      p.currentAnimation = null;
      if (p.animatedSprite && p.animatedSprite.parent) {
        p.sprite.removeChild(p.animatedSprite);
        p.animatedSprite = undefined;
      }
      p.animation.setupAnimations();
    }
    
    // Update username if changed
    if (info.username && info.username !== p.username) {
      p.setUsername(info.username);
    }

    const prevX = p.position.x;
    const prevY = p.position.y;

    p.lastFacing = p.facing;
    p.position.x = info.x;
    p.position.y = info.y;
    p.facing = info.facing || p.facing;
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
      // Sync invulnerable flag with spawn protection (same as local players)
      p.isInvulnerable = info.spawnProtectionTimer > 0;
      // Let the animation component handle tinting based on state
      p.animation.applyCurrentTints();
    }
  }

  updateRemotePlayers(delta: number): void {
    if (!this.remotePlayers) return;
    for (const p of this.remotePlayers.values()) {
      // Update health component to process damage stun timer
      if (p.health) {
        p.health.update(delta);
      }
      
      // Update spawn protection timer (same as local player logic)
      if (p.spawnProtectionTimer > 0) {
        p.spawnProtectionTimer -= delta;
        if (p.spawnProtectionTimer <= 0) {
          p.isInvulnerable = false;  // Clear invulnerable flag like local players
          p.spawnProtectionTimer = 0;
          // Update tint when spawn protection expires
          p.animation.applyCurrentTints();
        }
      }
      
      p.animation.update();
    }
  }

  updateRemoteMonsters(delta: number): void {
    if (!this.remoteMonsters) return;
    for (const monster of this.remoteMonsters.values()) {
      monster.update(delta);
    }
  }

  updateLocalPlayerState(info: PlayerInfo): void {
    if (!this.entities.player) return;
    this.entities.player.position.x = info.x;
    this.entities.player.position.y = info.y;
    this.entities.player.facing = info.facing || this.entities.player.facing;
    if (typeof info.hp === 'number') {
      this.entities.player.hitPoints = info.hp;
      if (info.hp <= 0 && !this.entities.player.isDead) {
        this.entities.player.health.die();
      } else if (info.hp > 0 && this.entities.player.isDead) {
        this.entities.player.health.respawn();
      }
    }
    // Update armor HP from server
    if (typeof info.armorHP === 'number') {
      (this.entities.player as any).armorHP = info.armorHP;
      console.log('[Game] Updated player armor HP:', info.armorHP);
    } else if ((this.entities.player as any).armorHP === undefined) {
      // Initialize armor HP if not present
      (this.entities.player as any).armorHP = 0;
      console.log('[Game] Initialized player armor HP to 0');
    }
    this.entities.player.sprite.position.set(info.x, info.y);
  }

  removeRemotePlayer(id: string): void {
    if (!this.remotePlayers || !this.remotePlayers.has(id)) return;
    const p = this.remotePlayers.get(id);
    if (!p) return;
    if (p.sprite.parent) p.sprite.parent.removeChild(p.sprite);
    this.remotePlayers.delete(id);
  }

  /**
   * CRITICAL NETWORK INTEGRATION: Process delta-merged monster state from NetworkClient
   * 
   * DELTA COMPRESSION CONTEXT:
   * This method receives monster states that have been processed through:
   * 1. Server NetworkOptimizer creates delta (changed fields only)
   * 2. Client StateCache.applyDelta() merges with cached complete state
   * 3. NetworkClient calls this method with reconstructed full state
   * 
   * ESSENTIAL FIELDS GUARANTEE:
   * NetworkOptimizer always includes critical fields (id, state, hp, facing, type)
   * This prevents 'undefined' errors that would break monster AI and rendering
   * 
   * @param info - Complete monster state (delta-merged on client)
   */
  addOrUpdateMonster(info: MonsterInfo): void {
    if (!this.remoteMonsters) this.remoteMonsters = new Map();
    let monster = this.remoteMonsters.get(info.id);
    
    if (!monster) {
      // Create new monster
      monster = new Monster({
        id: info.id,
        x: info.x,
        y: info.y,
        type: info.type as any, // Server sends valid monster types
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
        if (monster && monster.sprite && monster.sprite.parent) {
          monster.sprite.parent.removeChild(monster.sprite);
        }
        this.remoteMonsters?.delete(info.id);
        // Removed monster
      }, 1000); // Wait for death animation
    }
  }

  remotePlayerAttack(id: string, type: string, facing?: string): void {
    if (!this.remotePlayers || !this.remotePlayers.has(id)) return;
    const p = this.remotePlayers.get(id);
    if (!p) return;
    p.facing = facing || p.facing;
    p.isAttacking = true;
    p.attackHitFrameReached = false;
    p.currentAttackType = type;
    
    // Store current position for effect positioning (fixes effects appearing at wrong location)
    (p as any).startPositionForAttack = { x: p.position.x, y: p.position.y };
    
    if (p.animation) {
      p.animation.playAttackAnimation(type);
    }
    
    // Also trigger combat system effects for remote player attacks
    if (this.systems.combat) {
      this.systems.combat.executeAttack(p, type);
    }
  }
  
  /**
   * Initialize sound system and load all game sounds
   */
  async initializeSounds(): Promise<void> {
    console.log('[Game] Loading sounds...');
    
    try {
      // Load all combat sounds
      const combatSounds: any = {};
      
      // Load all player attack sounds
      ['bladedancer', 'guardian', 'hunter', 'rogue'].forEach(cls => {
        const attack1Key = `${cls}_attack1` as keyof typeof SOUND_CONFIG;
        const attack2Key = `${cls}_attack2` as keyof typeof SOUND_CONFIG;
        combatSounds[attack1Key] = SOUND_CONFIG[attack1Key];
        combatSounds[attack2Key] = SOUND_CONFIG[attack2Key];
      });
      
      // Add universal roll sound
      combatSounds['roll'] = SOUND_CONFIG['roll'];
      
      // Add impact sounds
      combatSounds['hit_physical'] = SOUND_CONFIG['hit_physical'];
      combatSounds['player_hurt'] = SOUND_CONFIG['player_hurt'];
      
      // Add UI sounds
      combatSounds['level_up'] = SOUND_CONFIG['level_up'];
      combatSounds['powerup_pickup'] = SOUND_CONFIG['powerup_pickup'];
      
      // Add monster sounds
      const monsterTypes = ['ghoul', 'ogre', 'darkmage', 'skeleton', 'wolf', 'wingeddemon', 'wildarcher', 'elemental'];
      monsterTypes.forEach(type => {
        const attackKey = `${type}_attack` as keyof typeof SOUND_CONFIG;
        if (SOUND_CONFIG[attackKey]) {
          combatSounds[attackKey] = SOUND_CONFIG[attackKey];
        }
      });
      
      // Add special attack sounds
      const specialSounds = ['ogre_spin', 'darkmage_special', 'wolf_special_jump', 'wolf_special_land', 'wingeddemon_spell'] as const;
      specialSounds.forEach(key => {
        if (SOUND_CONFIG[key as keyof typeof SOUND_CONFIG]) {
          combatSounds[key] = SOUND_CONFIG[key as keyof typeof SOUND_CONFIG];
        }
      });
      
      // Add monster hit sounds
      combatSounds['monster_hit_flesh'] = SOUND_CONFIG['monster_hit_flesh'];
      combatSounds['monster_hit_leather'] = SOUND_CONFIG['monster_hit_leather'];
      
      // Add footstep sounds for all class/biome combinations
      const classes = ['bladedancer', 'guardian', 'hunter', 'rogue'];
      const biomes = ['grass', 'snow', 'desert', 'darkgrass'];
      classes.forEach(cls => {
        biomes.forEach(biome => {
          const footstepKey = `footstep_${cls}_${biome}` as keyof typeof SOUND_CONFIG;
          if (SOUND_CONFIG[footstepKey]) {
            combatSounds[footstepKey] = SOUND_CONFIG[footstepKey];
          }
        });
      });
      
      // Only try to load sounds if files exist
      // This prevents errors when sound files aren't present yet
      await soundManager.loadAll(combatSounds).catch(() => {
        console.log('[Game] Sound files not found - running in silent mode');
      });
      
      // Load and start background music
      await soundManager.loadMusicTracks(MUSIC_TRACKS).catch((error) => {
        console.log('[Game] Music tracks not found or failed to load:', error);
      });
      
      // Start playing music
      soundManager.startMusic();
      
      console.log('[Game] Sound system initialized');
    } catch (error) {
      console.warn('[Game] Sound initialization failed:', error);
      // Game continues without sound
    }
  }
  
  /**
   * Update spatial audio listener position
   */
  updateSpatialAudio(): void {
    if (this.entities.player) {
      soundManager.updateListenerPosition(
        this.entities.player.position.x,
        this.entities.player.position.y
      );
      
      // Update screen dimensions and camera zoom for spatial calculations
      soundManager.updateScreenDimensions(this.app.screen.width, this.app.screen.height);
      soundManager.updateCameraZoom(this.camera.zoom);
    }
  }
  
  /**
   * Setup debug monster spawning system
   * F4 toggles the system on/off
   * Number keys 1-8 spawn different monster types
   */
  setupDebugMonsterSpawning(): void {
    const monsterTypes = [
      'ghoul',      // 1
      'ogre',       // 2
      'skeleton',   // 3
      'elemental',  // 4
      'wildarcher', // 5
      'darkmage',   // 6
      'wolf',       // 7
      'wingeddemon' // 8
    ];
    
    window.addEventListener('keydown', (e) => {
      // Toggle debug spawning with F4
      if (e.key === 'F4') {
        e.preventDefault();
        this.debugMonsterSpawningEnabled = !this.debugMonsterSpawningEnabled;
        
        // Show notification
        const message = this.debugMonsterSpawningEnabled 
          ? 'Debug Monster Spawning: ENABLED (Press 1-8 to spawn monsters)'
          : 'Debug Monster Spawning: DISABLED';
        
        console.log(`[DEBUG] ${message}`);
        
        // Create temporary on-screen notification
        const text = new PIXI.Text(message, {
          fontFamily: 'monospace',
          fontSize: 16,
          fill: this.debugMonsterSpawningEnabled ? 0x00ff00 : 0xff0000,
          stroke: 0x000000,
          strokeThickness: 2
        });
        text.x = 10;
        text.y = 100;
        this.uiContainer.addChild(text);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          if (text.parent) {
            this.uiContainer.removeChild(text);
          }
        }, 3000);
        
        return;
      }
      
      // Check if debug spawning is enabled and a number key was pressed
      if (!this.debugMonsterSpawningEnabled) return;
      
      const keyNum = parseInt(e.key);
      if (isNaN(keyNum) || keyNum < 1 || keyNum > 8) return;
      
      const monsterType = monsterTypes[keyNum - 1];
      if (!monsterType) return;
      
      // Prevent default behavior for number keys when debugging
      e.preventDefault();
      
      // Send debug spawn command to server
      if (this.network && this.network.socket) {
        const playerPos = this.entities.player.position;
        
        // Calculate spawn position (in front of player based on facing)
        const spawnDistance = 150;
        const facingAngle = typeof this.entities.player.facing === 'string' 
          ? 0 // Default angle if facing is a string (shouldn't happen)
          : this.entities.player.facing;
        const spawnX = playerPos.x + Math.cos(facingAngle) * spawnDistance;
        const spawnY = playerPos.y + Math.sin(facingAngle) * spawnDistance;
        
        console.log(`[DEBUG] Spawning ${monsterType} at (${Math.round(spawnX)}, ${Math.round(spawnY)})`);
        
        // Send debug spawn command to server
        this.network.socket.emit('debugSpawnMonster', {
          type: monsterType,
          x: spawnX,
          y: spawnY
        });
      }
    });
  }
}
