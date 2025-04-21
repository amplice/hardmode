import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player.js';
import { InputSystem } from '../systems/Input.js';
import { PhysicsSystem } from '../systems/Physics.js';
import { WorldGenerator } from '../systems/world/WorldGenerator.js';
import { CombatSystem } from '../systems/CombatSystem.js';

export class Game {
    constructor() {
        this.app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 0x000000,
            resizeTo: window
        });
        document.body.appendChild(this.app.view);
        
        // Create main game containers
        this.worldContainer = new PIXI.Container();
        this.entityContainer = new PIXI.Container();
        
        this.app.stage.addChild(this.worldContainer);
        this.app.stage.addChild(this.entityContainer);
        
        // Setup camera
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1
        };
        
        // Create game systems
        this.systems = {
            input: new InputSystem(),
            physics: new PhysicsSystem(),
            world: new WorldGenerator({
                width: 30,
                height: 30,
                tileSize: 64
            }),
            combat: new CombatSystem(this.app)
        };
        
        // Create entities
        this.entities = {
            player: null
        };
        
        // Make the game instance globally available
        window.game = this;
        
        this.init();
    }
    
    init() {
        // Generate world
        const worldDisplay = this.systems.world.generate();
        this.worldContainer.addChild(worldDisplay);
        
        // Create player character (Bladedancer as starting class)
        this.entities.player = new Player({
            x: this.systems.world.width / 2 * this.systems.world.tileSize,
            y: this.systems.world.height / 2 * this.systems.world.tileSize,
            class: 'bladedancer',
            combatSystem: this.systems.combat
        });
        
        this.entityContainer.addChild(this.entities.player.sprite);
        
        // Set initial camera position
        this.updateCamera();
        
        // Start game loop
        this.app.ticker.add(this.update.bind(this));
        
        console.log("Game initialized");
    }
    
    update(deltaTime) {
        // Process input
        const inputState = this.systems.input.update();
        
        // Update player based on input
        this.entities.player.update(deltaTime / 60, inputState);
        
        // Physics update (collision detection)
        this.systems.physics.update(deltaTime / 60, [this.entities.player], this.systems.world);
        
        // Combat system update
        this.systems.combat.update(deltaTime / 60);
        
        // Update camera to follow player
        this.updateCamera();
    }
    
    updateCamera() {
        // Center camera on player with some smoothing
        this.camera.x = this.entities.player.position.x;
        this.camera.y = this.entities.player.position.y;
        
        // Apply camera position to world and entity containers
        this.worldContainer.position.x = this.app.screen.width / 2 - this.camera.x;
        this.worldContainer.position.y = this.app.screen.height / 2 - this.camera.y;
        
        this.entityContainer.position.x = this.app.screen.width / 2 - this.camera.x;
        this.entityContainer.position.y = this.app.screen.height / 2 - this.camera.y;
    }
}