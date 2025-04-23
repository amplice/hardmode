import * as PIXI from 'pixi.js';
import { Player }         from '../entities/Player.js';
import { InputSystem }    from '../systems/Input.js';
import { PhysicsSystem }  from '../systems/Physics.js';
import { WorldGenerator } from '../systems/world/WorldGenerator.js';
import { CombatSystem }   from '../systems/CombatSystem.js';
import { MonsterSystem }  from '../systems/MonsterSystem.js';
import { SpriteManager }  from '../systems/animation/SpriteManager.js';
import { TilesetManager } from '../systems/tiles/TilesetManager.js';

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
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.entityContainer);

    this.camera = { x: 0, y: 0, zoom: 1 };

    this.systems = {
      input:   new InputSystem(),
      physics: new PhysicsSystem(),
      world:   null,               // will init after tilesets
      combat:  new CombatSystem(this.app),
      sprites: new SpriteManager()
    };

    this.entities = { player: null };
    window.game = this;

    this.tilesets = new TilesetManager();
    this.loadAndInit();
  }

  async loadAndInit() {
    try {
      await this.tilesets.load();               // load & slice all sheets
      await this.systems.sprites.loadSprites(); // then other art
      this.init();
    } catch (err) {
      console.error('Failed to load game assets:', err);
    }
  }

  init() {
    this.systems.world = new WorldGenerator({
      width:    100,
      height:   100,
      tileSize: 64,        // <-- smaller tiles; tweak as you like
      tilesets: this.tilesets
    });

    const worldView = this.systems.world.generate();
    this.worldContainer.addChild(worldView);

    this.entities.player = new Player({
      x: (this.systems.world.width  / 2) * this.systems.world.tileSize,
      y: (this.systems.world.height / 2) * this.systems.world.tileSize,
      class:         'bladedancer',
      combatSystem:  this.systems.combat,
      spriteManager: this.systems.sprites
    });
    this.entityContainer.addChild(this.entities.player.sprite);

    this.systems.monsters = new MonsterSystem(this.systems.world);

    this.updateCamera();
    this.app.ticker.add(this.update.bind(this));
    console.log('Game initialized');
  }

  update(delta) {
    const inputState = this.systems.input.update();
    this.entities.player.update(delta / 60, inputState);
    this.systems.physics.update(delta / 60, [this.entities.player], this.systems.world);
    this.systems.monsters.update(delta / 60, this.entities.player);
    this.systems.combat.update(delta / 60);
    this.updateCamera();
  }

  updateCamera() {
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
}