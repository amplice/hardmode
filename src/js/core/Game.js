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
import { NetworkClient } from '../network/NetworkClient.js';

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
    this.otherPlayers = {};
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

    // Initialize networking
    this.network = new NetworkClient();
    this.network.join(selectedClass);
    this.network.on('playerJoined', (d) => this.handlePlayerJoined(d));
    this.network.on('playerLeft', (id) => this.handlePlayerLeft(id));
    this.network.on('worldState', (s) => this.handleWorldState(s));

    // Add health and stats UI
    this.healthUI = new HealthUI(this.entities.player);
    this.statsUI = new StatsUI(this.entities.player, { showDebug: SHOW_DEBUG_STATS });
    this.uiContainer.addChild(this.healthUI.container);
    this.uiContainer.addChild(this.statsUI.container);

    this.systems.monsters = new MonsterSystem(this.systems.world);

    this.updateCamera();
    this.app.ticker.add(this.update.bind(this));
    this.gameStarted = true;
    console.log(`Game initialized with ${selectedClass} player`);
  }

  update(delta) {
    // Only update game if it has started
    if (!this.gameStarted) return;
    
    const deltaTimeSeconds = delta / 60;

    // 1. Update player input and intended movement
    const inputState = this.systems.input.update();
    this.entities.player.update(deltaTimeSeconds, inputState);
    
    // 2. Update monster AI and intended movement
    // MonsterSystem.update calls Monster.update, which changes monster.position
    this.systems.monsters.update(deltaTimeSeconds, this.entities.player);

    // 3. Collect all entities that need physics processing
    const allEntitiesForPhysics = [this.entities.player, ...this.systems.monsters.monsters];
    
    // 4. Apply physics (world boundaries and tile collisions) to all collected entities
    this.systems.physics.update(deltaTimeSeconds, allEntitiesForPhysics, this.systems.world);
    
    // 5. Update combat, camera, and UI
    this.systems.combat.update(deltaTimeSeconds);
    this.updateCamera(); // Depends on player's final position after physics
    this.healthUI.update();
    if (this.statsUI) this.statsUI.update();

    if (this.network) {
      this.network.sendState({
        x: this.entities.player.position.x,
        y: this.entities.player.position.y,
        facing: this.entities.player.facing
      });
    }
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

  handlePlayerJoined(data) {
    if (data.id === this.network.socket.id) return;
    if (this.otherPlayers[data.id]) return;
    const p = new Player({
      x: data.x,
      y: data.y,
      class: data.class,
      combatSystem: this.systems.combat,
      spriteManager: this.systems.sprites
    });
    this.entityContainer.addChild(p.sprite);
    this.otherPlayers[data.id] = p;
  }

  handlePlayerLeft(id) {
    const p = this.otherPlayers[id];
    if (p) {
      this.entityContainer.removeChild(p.sprite);
      delete this.otherPlayers[id];
    }
  }

  handleWorldState(state) {
    for (const id in state) {
      if (id === this.network.socket.id) continue;
      const info = state[id];
      let p = this.otherPlayers[id];
      if (!p) {
        p = new Player({
          x: info.x,
          y: info.y,
          class: info.class,
          combatSystem: this.systems.combat,
          spriteManager: this.systems.sprites
        });
        this.entityContainer.addChild(p.sprite);
        this.otherPlayers[id] = p;
      } else {
        p.position.x = info.x;
        p.position.y = info.y;
        p.facing = info.facing;
        p.sprite.position.set(info.x, info.y);
        p.animation.update();
      }
    }
  }
}