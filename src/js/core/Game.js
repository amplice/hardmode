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
import { LobbyUI } from '../ui/LobbyUI.js';
import { LocalServer } from '../net/LocalServer.js';
import { NetworkManager } from '../net/NetworkManager.js';
import { ClientMessages, ServerMessages } from '../net/MessageTypes.js';

// Toggle display of extra stat information in the Stats UI
const SHOW_DEBUG_STATS = true;
const USE_NETWORK = true;

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
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.entityContainer);
    this.app.stage.addChild(this.uiContainer);

    this.camera = { x: 0, y: 0, zoom: 1 };

    this.systems = {
      input:   new InputSystem(),
      physics: new PhysicsSystem(),
      world:   null,               // will init after tilesets
      combat:  new CombatSystem(this.app),
      sprites: new SpriteManager()
    };

    this.entities = { player: null };
    this.server = null;
    this.clientId = null;
    this.network = null;
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

      if (USE_NETWORK) {
        this.network = new NetworkManager(this);
        this.network.connect('http://localhost:3000');
        this.showLobby();
      } else {
        this.showClassSelection();
      }
    } catch (err) {
      console.error('Failed to load game assets:', err);
    }
  }
  
  // Add new method to show class selection
  showClassSelection() {
    this.classSelectUI = new ClassSelectUI(this.startGame.bind(this));
    this.uiContainer.addChild(this.classSelectUI.container);
  }

  showLobby() {
    this.lobbyUI = new LobbyUI(
      () => {
        if (this.network) {
          this.network.createGame();
        }
        this.uiContainer.removeChild(this.lobbyUI.container);
        this.showClassSelection();
      },
      (gameId) => {
        if (this.network) {
          this.network.joinGame(gameId);
        }
        this.uiContainer.removeChild(this.lobbyUI.container);
        this.showClassSelection();
      }
    );
    this.uiContainer.addChild(this.lobbyUI.container);
  }
  
  // Modified to accept selectedClass parameter
  startGame(selectedClass) {
    // Remove class selection UI
    if (this.classSelectUI) {
      this.uiContainer.removeChild(this.classSelectUI.container);
      this.classSelectUI = null;
    }
    
    // Initialize the game world
    this.systems.world = new WorldGenerator({
      width:    100,
      height:   100,
      tileSize: 64,
      tilesets: this.tilesets
    });

    const worldView = this.systems.world.generate();
    this.worldContainer.addChild(worldView);

    // Create player with selected class
    this.entities.player = new Player({
      x: (this.systems.world.width  / 2) * this.systems.world.tileSize,
      y: (this.systems.world.height / 2) * this.systems.world.tileSize,
      class:         selectedClass || 'bladedancer', // Use selected or default
      combatSystem:  this.systems.combat,
      spriteManager: this.systems.sprites
    });
    this.entityContainer.addChild(this.entities.player.sprite);

    if (USE_NETWORK && this.network) {
      this.network.selectClass(selectedClass || 'bladedancer');
      this.network.setReady();
    }

    // Add health and stats UI
    this.healthUI = new HealthUI(this.entities.player);
    this.statsUI = new StatsUI(this.entities.player, { showDebug: SHOW_DEBUG_STATS });
    this.uiContainer.addChild(this.healthUI.container);
    this.uiContainer.addChild(this.statsUI.container);

    this.systems.monsters = new MonsterSystem(this.systems.world);

    if (!USE_NETWORK) {
      this.server = new LocalServer(this);
      this.clientId = 'client_1';
      this.server.connectClient(this.clientId, this);
      this.server.addPlayer(this.clientId, this.entities.player);
    }

    this.updateCamera();
    this.app.ticker.add(this.update.bind(this));
    this.gameStarted = true;
    console.log(`Game initialized with ${selectedClass} player`);
  }

  update(delta) {
    // Only update game if it has started
    if (!this.gameStarted) return;

    const deltaTimeSeconds = delta / 60;

    const inputState = this.systems.input.update();

    if (USE_NETWORK) {
      if (this.network && this.network.isConnected()) {
        this.network.sendInput(inputState);
      }
    } else {
      this.server.handleMessage(this.clientId, {
        type: ClientMessages.INPUT,
        data: inputState
      });
      this.server.update(deltaTimeSeconds);
    }

    // Camera and UI depend on updated positions
    this.updateCamera();
    this.healthUI.update();
    if (this.statsUI) this.statsUI.update();
  }

  updateCamera() {
    if (!this.gameStarted) return;
    
    this.camera.x = this.entities.player.position.x;
    this.camera.y = this.entities.player.position.y;
    this.worldContainer.position.set(
      Math.floor(this.app.screen.width / 2 - this.camera.x),
      Math.floor(this.app.screen.height / 2 - this.camera.y)
    );
    this.entityContainer.position.set(
      Math.floor(this.app.screen.width / 2 - this.camera.x),
      Math.floor(this.app.screen.height / 2 - this.camera.y)
    );
  }

  onServerMessage(message) {
    // Stage 1 uses a local server so state is already updated.
    // This method now handles basic state updates from the network server.
    if (message.type === ServerMessages.GAME_STATE) {
      const myState = message.data.players.find(p => p.id === this.clientId);
      if (myState && this.entities.player) {
        this.entities.player.position.x = myState.position.x;
        this.entities.player.position.y = myState.position.y;
        this.entities.player.sprite.position.set(myState.position.x, myState.position.y);
      }
    }
  }
}