import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player.js';
import { InputSystem } from '../systems/Input.js';
import { PhysicsSystem } from '../systems/Physics.js';
import { WorldGenerator } from '../systems/world/WorldGenerator.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { MonsterSystem } from '../systems/MonsterSystem.js';
import { SpriteManager } from '../systems/animation/SpriteManager.js';

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
            combat: new CombatSystem(this.app),
            sprites: new SpriteManager()
        };
        
        // Create entities
        this.entities = {
            player: null
        };
        
        // Make the game instance globally available
        window.game = this;
        
        // Load sprites then initialize game
        this.loadAndInit();
    }
    
    async loadAndInit() {
        try {
            // Show loading message
            const loadingText = new PIXI.Text('Loading sprites...', {
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xffffff
            });
            loadingText.anchor.set(0.5);
            loadingText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
            this.app.stage.addChild(loadingText);
            
            // Load sprites
            await this.systems.sprites.loadSprites();
            
            // Remove loading text
            this.app.stage.removeChild(loadingText);
            
            // Initialize game
            this.init();
        } catch (error) {
            console.error("Failed to load game assets:", error);
        }
    }
    
    init() {
        // Generate world
        const worldDisplay = this.systems.world.generate();
        this.worldContainer.addChild(worldDisplay);
        
        // Create player character (Knight)
        this.entities.player = new Player({
            x: this.systems.world.width / 2 * this.systems.world.tileSize,
            y: this.systems.world.height / 2 * this.systems.world.tileSize,
            class: 'bladedancer',
            combatSystem: this.systems.combat,
            spriteManager: this.systems.sprites
        });
        
        this.entityContainer.addChild(this.entities.player.sprite);
        
        // Initialize monster system after world is generated
        this.systems.monsters = new MonsterSystem(this.systems.world);
        
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
        
        // Update monsters
        this.systems.monsters.update(deltaTime / 60, this.entities.player);
        
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