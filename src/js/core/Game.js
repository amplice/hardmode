// src/js/core/Game.js
import * as PIXI from 'pixi.js';
import { Player }         from '../entities/Player.js';
import { InputSystem }    from '../systems/Input.js';
import { PhysicsSystem }  from '../systems/Physics.js';
import { WorldGenerator } from '../systems/world/WorldGenerator.js';
import { CombatSystem }   from '../systems/CombatSystem.js';
import { MonsterSystem }  from '../systems/MonsterSystem.js';
import { Monster } from '../entities/monsters/Monster.js';
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

    this.selectedClass = selectedClass;

    // Initialize networking and wait for worldInit before creating the world
    this.network = new NetworkClient();
    this.network.join(selectedClass);
    this.network.on('worldInit', (d) => this.handleWorldInit(d));
    this.network.on('playerJoined', (d) => this.handlePlayerJoined(d));
    this.network.on('playerLeft', (id) => this.handlePlayerLeft(id));
    this.network.on('worldState', (s) => this.handleWorldState(s));
    this.network.on('playerAction', a => this.handlePlayerAction(a));
    this.network.on('spawnProjectile', p => this.handleSpawnProjectile(p));
  }

  handleWorldInit(data) {
    if (this.gameStarted) return; // avoid double init

    // Build world from the provided seed
    this.systems.world = new WorldGenerator({
      width:    100,
      height:   100,
      tileSize: 64,
      tilesets: this.tilesets,
      seed: data.seed
    });

    const worldView = this.systems.world.generate();
    this.worldContainer.addChild(worldView);

    // Create player with selected class
    this.entities.player = new Player({
      x: (this.systems.world.width  / 2) * this.systems.world.tileSize,
      y: (this.systems.world.height / 2) * this.systems.world.tileSize,
      class:         this.selectedClass || 'bladedancer',
      combatSystem:  this.systems.combat,
      spriteManager: this.systems.sprites
    });
    this.entityContainer.addChild(this.entities.player.sprite);

    // Add existing players from the server
    for (const id in data.players) {
      if (id !== this.network.socket.id) {
        this.handlePlayerJoined(data.players[id]);
      }
    }

    // Create monsters from server state
    const monsterSystem = new MonsterSystem(this.systems.world);
    this.systems.monsters = monsterSystem;
    for (const mid in data.monsters || {}) {
      const m = data.monsters[mid];
      const monster = new Monster({ x: m.x, y: m.y, type: m.type });
      monster.id = Number(mid);
      monster.state = m.state;
      monster.facing = m.facing;
      monsterSystem.monsters.push(monster);
      this.entityContainer.addChild(monster.sprite);
    }

    // Add health and stats UI
    this.healthUI = new HealthUI(this.entities.player);
    this.statsUI = new StatsUI(this.entities.player, { showDebug: SHOW_DEBUG_STATS });
    this.uiContainer.addChild(this.healthUI.container);
    this.uiContainer.addChild(this.statsUI.container);

    this.updateCamera();
    this.app.ticker.add(this.update.bind(this));
    this.gameStarted = true;
    console.log(`Game initialized with ${this.selectedClass} player`);
  }

  update(delta) {
    // Only update game if it has started
    if (!this.gameStarted) return;
    
    const deltaTimeSeconds = delta / 60;

    // 1. Update player input and intended movement
    const inputState = this.systems.input.update();
    this.entities.player.update(deltaTimeSeconds, inputState);
    
    // 2. Monsters are updated on the server; only process player locally

    // 3. Collect entities for physics processing (only player)
    const allEntitiesForPhysics = [this.entities.player];
    
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
    const players = state.players || {};
    for (const id in players) {
      const info = players[id];
      if (id === this.network.socket.id) {
        if (info.hp !== undefined) {
          this.entities.player.hitPoints = info.hp;
        }
        continue;
      }
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
        if (info.hp !== undefined) p.hitPoints = info.hp;
      }
    }

    if (this.systems.monsters) {
      const monstersInfo = state.monsters || {};
      const localMonsters = this.systems.monsters.monsters;
      for (const id in monstersInfo) {
        const mInfo = monstersInfo[id];
        let m = localMonsters.find(mon => mon.id === Number(id));
        if (!m) {
          m = new Monster({ x: mInfo.x, y: mInfo.y, type: mInfo.type });
          m.id = Number(id);
          m.state = mInfo.state;
          m.facing = mInfo.facing;
          m.hitPoints = mInfo.hp;
          m.maxHitPoints = mInfo.maxHp;
          localMonsters.push(m);
          this.entityContainer.addChild(m.sprite);
        } else {
          m.position.x = mInfo.x;
          m.position.y = mInfo.y;
          m.facing = mInfo.facing;
          m.state = mInfo.state;
          if (mInfo.hp !== undefined) m.hitPoints = mInfo.hp;
          if (mInfo.maxHp !== undefined) m.maxHitPoints = mInfo.maxHp;
          m.sprite.position.set(mInfo.x, mInfo.y);
          m.updateAnimation();
        }
      }
      // Remove monsters not in state
      for (let i = localMonsters.length - 1; i >= 0; i--) {
        const m = localMonsters[i];
        if (!monstersInfo[m.id]) {
          this.entityContainer.removeChild(m.sprite);
          localMonsters.splice(i, 1);
        }
      }
    }
  }

  handlePlayerAction(action) {
    const p = this.otherPlayers[action.id];
    if (!p) return;
    if (action.type === 'attack') {
      p.combat.performPrimaryAttack(true);
    }
    if (action.type === 'secondary') {
      p.combat.performSecondaryAttack(true);
    }
    if (action.type === 'roll') {
      p.combat.performRoll(true);
    }
  }

  handleSpawnProjectile(data) {
    if (!this.systems.combat) return;
    if (data.ownerId === this.network.socket.id) return;
    this.systems.combat.createProjectile(
      data.x,
      data.y,
      data.angle,
      null,
      { damage: data.damage, speed: data.speed, range: data.range,
        effectType: data.effectType }
    );
  }
}