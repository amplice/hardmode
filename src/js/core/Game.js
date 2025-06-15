// src/js/core/Game.js
import * as PIXI from 'pixi.js';
import { Player }         from '../entities/Player.js';
import { InputSystem }    from '../systems/Input.js';
import { PhysicsSystem }  from '../systems/Physics.js';
import { WorldGenerator } from '../systems/world/WorldGenerator.js';
import { CombatSystem }   from '../systems/CombatSystem.js';
import { MonsterSystem }  from '../systems/MonsterSystem.js';
import { SpriteManager }  from '../systems/animation/SpriteManager.js';
import { TilesetManager } from '../systems/tiles/TilesetManager.js';
import { HealthUI } from '../ui/HealthUI.js';
import { StatsUI } from '../ui/StatsUI.js';
import { ClassSelectUI } from '../ui/ClassSelectUI.js'; // Import the new UI
import { networkManager } from '../../network/NetworkManager.ts';
import { ConnectionUI } from '../../ui/ConnectionUI.ts';
import { MultiplayerHUD } from '../../ui/MultiplayerHUD.ts';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { InputManager } from '../systems/InputManager.js';

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
    this.entityContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.uiContainer.sortableChildren = true;
    
    // Ensure containers are visible
    this.worldContainer.visible = true;
    this.entityContainer.visible = true;
    this.uiContainer.visible = true;
    
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.entityContainer);
    this.app.stage.addChild(this.uiContainer);

    this.camera = { x: 0, y: 0, zoom: 1 };

    this.systems = {
      input:   new InputSystem(),
      inputManager: new InputManager(), // New input manager for multiplayer
      physics: new PhysicsSystem(),
      world:   null,               // will init after tilesets
      combat:  new CombatSystem(this.app),
      sprites: new SpriteManager()
    };

    this.entities = { player: null };
    this.remotePlayers = new Map(); // Track other players
    window.game = this;

    this.tilesets = new TilesetManager();
    this.loadAndInit();
    
    // Flag to track game state
    this.gameStarted = false;
  }

  async loadAndInit() {
    try {
      await this.tilesets.load();               // load & slice all sheets
      await this.systems.sprites.loadSprites(); // then other art
      
      // Show connection UI first
      this.showConnectionUI();
    } catch (err) {
      console.error('Failed to load game assets:', err);
    }
  }
  
  // Add new method to show connection UI
  showConnectionUI() {
    // Store handler reference to avoid multiple listeners
    if (!this.connectedHandler) {
      this.connectedHandler = (data) => {
        this.worldConfig = data.worldConfig;
        this.spawnPosition = data.position;
        console.log('Received world config:', this.worldConfig);
        console.log('Received spawn position:', this.spawnPosition);
      };
      networkManager.on('connected', this.connectedHandler);
    }
    
    this.connectionUI = new ConnectionUI();
    this.connectionUI.on('connected', () => {
      this.uiContainer.removeChild(this.connectionUI);
      this.connectionUI.destroy();
      this.showClassSelection();
    });
    this.uiContainer.addChild(this.connectionUI);
  }
  
  // Add new method to show class selection
  showClassSelection() {
    this.classSelectUI = new ClassSelectUI(this.startGame.bind(this));
    this.uiContainer.addChild(this.classSelectUI.container);
  }
  
  // Modified to accept selectedClass parameter
  startGame(selectedClass) {
    // Remove class selection UI
    if (this.classSelectUI) {
      this.uiContainer.removeChild(this.classSelectUI.container);
      this.classSelectUI = null;
    }
    
    // Initialize the game world with server config
    const worldConfig = this.worldConfig || { width: 100, height: 100, tileSize: 64 };
    this.systems.world = new WorldGenerator({
      width:    worldConfig.width,
      height:   worldConfig.height,
      tileSize: worldConfig.tileSize,
      seed:     worldConfig.seed,
      tilesets: this.tilesets
    });

    const worldView = this.systems.world.generate();
    this.worldContainer.addChild(worldView);
    
    // Add debug marker at world center
    const debugMarker = new PIXI.Graphics();
    debugMarker.beginFill(0xff0000, 0.8);
    debugMarker.drawRect(-50, -50, 100, 100);
    debugMarker.endFill();
    debugMarker.position.set(
      (this.systems.world.width / 2) * this.systems.world.tileSize,
      (this.systems.world.height / 2) * this.systems.world.tileSize
    );
    this.entityContainer.addChild(debugMarker);
    console.log('Debug marker added at world center:', debugMarker.position);

    // Create player with selected class and server spawn position
    const spawnPos = this.spawnPosition || {
      x: (this.systems.world.width  / 2) * this.systems.world.tileSize,
      y: (this.systems.world.height / 2) * this.systems.world.tileSize
    };
    
    console.log('Creating local player at spawn position:', spawnPos);
    
    this.entities.player = new Player({
      x: spawnPos.x,
      y: spawnPos.y,
      class:         selectedClass || 'bladedancer', // Use selected or default
      combatSystem:  this.systems.combat,
      spriteManager: this.systems.sprites
    });
    this.entityContainer.addChild(this.entities.player.sprite);
    
    console.log('Local player created at:', this.entities.player.position);
    console.log('Entity container after adding player:', this.entityContainer.children.length, 'children');

    // Add health and stats UI
    this.healthUI = new HealthUI(this.entities.player);
    this.statsUI = new StatsUI(this.entities.player, { showDebug: SHOW_DEBUG_STATS });
    this.uiContainer.addChild(this.healthUI.container);
    this.uiContainer.addChild(this.statsUI.container);
    
    // Add multiplayer HUD (top-right corner)
    this.multiplayerHUD = new MultiplayerHUD();
    this.multiplayerHUD.position.set(window.innerWidth - 210, 10);
    this.uiContainer.addChild(this.multiplayerHUD);

    this.systems.monsters = new MonsterSystem(this.systems.world);

    // Setup network event handlers
    this.setupNetworkHandlers();
    
    // Enable input manager
    this.systems.inputManager.enable();
    
    // Send class selection to server first
    networkManager.socket.emit('selectClass', selectedClass);
    
    // Mark game as started after sending class selection
    this.gameStarted = true;
    
    // Request current game state after we're ready
    setTimeout(() => {
      console.log('Requesting current game state...');
      networkManager.socket.emit('requestGameState');
    }, 100);
    
    this.updateCamera();
    this.app.ticker.add(this.update.bind(this));
    console.log(`Game initialized with ${selectedClass} player`);
  }
  
  setupNetworkHandlers() {
    // Handle game state updates from server
    networkManager.on('gameState', (data) => {
      if (!this.gameStarted) {
        console.log('Ignoring game state - game not started yet');
        return;
      }
      
      console.log('=== GAME STATE UPDATE ===');
      console.log('Received game state with', data.players.length, 'players');
      console.log('My player ID:', networkManager.getPlayerId());
      console.log('All players in state:', data.players.map(p => ({
        id: p.id,
        username: p.username,
        position: p.position
      })));
      
      // Track which player IDs we've seen
      const seenPlayerIds = new Set();
      
      // Update remote players
      data.players.forEach(playerState => {
        seenPlayerIds.add(playerState.id);
        
        if (playerState.id === networkManager.getPlayerId()) {
          // This is our player - update authoritative position from server
          // For now, we'll trust client-side prediction
          console.log('Our player position:', playerState.position);
          return;
        }
        
        console.log('Remote player:', playerState.username, 'at', playerState.position);
        
        // Update or create remote player
        let remotePlayer = this.remotePlayers.get(playerState.id);
        if (!remotePlayer) {
          console.log('Creating new remote player:', playerState.username);
          remotePlayer = new RemotePlayer(
            playerState.id,
            playerState.username,
            playerState.position.x,
            playerState.position.y,
            this.systems.sprites
          );
          this.remotePlayers.set(playerState.id, remotePlayer);
          this.entityContainer.addChild(remotePlayer.sprite);
          
          // Debug logging
          console.log('Entity container children count:', this.entityContainer.children.length);
          console.log('Remote player sprite parent:', remotePlayer.sprite.parent);
          console.log('Entity container position:', this.entityContainer.position);
          console.log('Entity container visible:', this.entityContainer.visible);
          console.log('Entity container === window.game.entityContainer?', this.entityContainer === window.game.entityContainer);
          console.log('App stage contains entityContainer?', this.app.stage.children.includes(this.entityContainer));
          console.log('Remote player sprite world position:', remotePlayer.sprite.toGlobal(new PIXI.Point(0, 0)));
        }
        
        remotePlayer.updateFromState(playerState);
      });
      
      // Remove players who are no longer in the game state
      this.remotePlayers.forEach((remotePlayer, playerId) => {
        if (!seenPlayerIds.has(playerId)) {
          console.log('Removing player who left:', playerId);
          remotePlayer.destroy();
          this.remotePlayers.delete(playerId);
        }
      });
    });
    
    // Handle player disconnect
    networkManager.on('playerLeft', (data) => {
      const remotePlayer = this.remotePlayers.get(data.playerId);
      if (remotePlayer) {
        remotePlayer.destroy();
        this.remotePlayers.delete(data.playerId);
      }
    });
    
    // Handle initial player list
    networkManager.on('playerList', (players) => {
      console.log('Received player list with', players.length, 'players');
      players.forEach(player => {
        if (player.id !== networkManager.getPlayerId()) {
          console.log('Adding existing player:', player.username);
          // Note: We'll create them when we get their full state in gameState update
        }
      });
    });
    
    // Handle new player joining
    networkManager.on('playerJoined', (player) => {
      console.log('New player joined:', player.username);
    });
  }

  update(delta) {
    // Only update game if it has started
    if (!this.gameStarted) return;
    
    const deltaTimeSeconds = delta / 60;

    // 1. Update player input and intended movement
    const inputState = this.systems.input.update();
    this.entities.player.update(deltaTimeSeconds, inputState);
    
    // 2. Send input to server
    this.systems.inputManager.sendInputToServer(this.camera);
    
    // 3. Update remote players
    if (this.remotePlayers.size > 0) {
      console.log(`Updating ${this.remotePlayers.size} remote players`);
    }
    this.remotePlayers.forEach(remotePlayer => {
      remotePlayer.update(deltaTimeSeconds);
    });
    
    // 4. Update monster AI and intended movement
    // MonsterSystem.update calls Monster.update, which changes monster.position
    this.systems.monsters.update(deltaTimeSeconds, this.entities.player);

    // 5. Collect all entities that need physics processing
    const allEntitiesForPhysics = [this.entities.player, ...this.systems.monsters.monsters];
    
    // 6. Apply physics (world boundaries and tile collisions) to all collected entities
    this.systems.physics.update(deltaTimeSeconds, allEntitiesForPhysics, this.systems.world);
    
    // 7. Update combat, camera, and UI
    this.systems.combat.update(deltaTimeSeconds);
    this.updateCamera(); // Depends on player's final position after physics
    this.healthUI.update();
    if (this.statsUI) this.statsUI.update();
  }

  updateCamera() {
    if (!this.gameStarted) return;
    
    this.camera.x = this.entities.player.position.x;
    this.camera.y = this.entities.player.position.y;
    
    const containerX = Math.floor(this.app.screen.width / 2 - this.camera.x);
    const containerY = Math.floor(this.app.screen.height / 2 - this.camera.y);
    
    this.worldContainer.position.set(containerX, containerY);
    this.entityContainer.position.set(containerX, containerY);
    
    // Debug log occasionally
    if (Math.random() < 0.01) { // 1% chance each frame
      console.log('Camera position:', this.camera);
      console.log('Entity container position:', this.entityContainer.position);
      console.log('Remote players count:', this.remotePlayers.size);
      this.remotePlayers.forEach((player, id) => {
        console.log(`  ${player.username}: sprite pos =`, player.sprite.position, 'visible =', player.sprite.visible);
      });
    }
  }
}