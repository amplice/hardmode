// src/js/core/Game.js
import * as PIXI from 'pixi.js';
import { Player }         from '../entities/Player.js';
import { Monster }        from '../entities/monsters/Monster.js';
import { InputSystem }    from '../systems/Input.js';
import { PlayerListUI }   from '../ui/PlayerListUI.js';
import { ChatUI }         from '../ui/ChatUI.js'; // Import ChatUI
import { PhysicsSystem }  from '../systems/Physics.js';
import { WorldGenerator } from '../systems/world/WorldGenerator.js';
import { CombatSystem }   from '../systems/CombatSystem.js';
import { MonsterSystem }  from '../systems/MonsterSystem.js';
import { SpriteManager }  from '../systems/animation/SpriteManager.js';
import { TilesetManager } from '../systems/tiles/TilesetManager.js';
import { HealthUI } from '../ui/HealthUI.js';
import { StatsUI } from '../ui/StatsUI.js';
import { ClassSelectUI } from '../ui/ClassSelectUI.js'; // Import the new UI

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
    this.otherPlayersContainer = new PIXI.Container(); // For other players' sprites
    this.monsterContainer = new PIXI.Container(); // For monster sprites
    this.uiContainer = new PIXI.Container();
    this.uiContainer.sortableChildren = true;
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.entityContainer);
    this.app.stage.addChild(this.otherPlayersContainer);
    this.app.stage.addChild(this.monsterContainer); // Add monsterContainer to stage
    this.app.stage.addChild(this.uiContainer);

    this.camera = { x: 0, y: 0, zoom: 1 };
    this.otherPlayers = {}; // To store other player objects
    this.clientMonsters = {}; // To store monster objects client-side

    this.systems = {
      input:   new InputSystem(),
      physics: new PhysicsSystem(),
      world:   null,               // will init after tilesets
      combat:  new CombatSystem(this.app),
      sprites: new SpriteManager()
    };

    this.entities = { player: null };
    window.game = this; // socket is available on game instance from main.js

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
    // Pass a new callback that expects (className, playerName)
    this.classSelectUI = new ClassSelectUI((className, playerName) => {
        this.startGame(className, playerName);
    });
    this.uiContainer.addChild(this.classSelectUI.container);
  }
  
  // Modified to accept selectedClass and playerName parameters
  startGame(selectedClass, playerName) {
    this.selectedPlayerClass = selectedClass;
    this.playerName = playerName || `Player_${Math.floor(Math.random() * 10000)}`; // Fallback name

    console.log(`Player selected class: ${this.selectedPlayerClass}, Name: ${this.playerName}`);

    // Emit playerJoinDetails to the server
    if (this.socket && this.socket.connected) {
      this.socket.emit('playerJoinDetails', { name: this.playerName, class: this.selectedPlayerClass });
    } else {
      // Handle case where socket might not be connected yet, though it should be.
      // Could queue this message or wait for 'connect' event.
      console.warn("Socket not connected when trying to send playerJoinDetails. Will attempt on connect.");
      this.socket.once('connect', () => { // Ensure it's sent once connected
        console.log("Socket connected, sending playerJoinDetails.");
        this.socket.emit('playerJoinDetails', { name: this.playerName, class: this.selectedPlayerClass });
      });
    }

    // Remove class selection UI
    if (this.classSelectUI) {
      this.uiContainer.removeChild(this.classSelectUI.container);
      if (this.classSelectUI.destroy) { // Call destroy to remove HTML elements
          this.classSelectUI.destroy();
      }
      this.classSelectUI = null;
    }
    
    // Socket event handlers should be set up to listen for worldData
    this.setupSocketEventHandlers();

    // Other non-world dependent setup can go here.
    // The game loop (ticker) and gameStarted flag will be set after world is loaded.
    console.log("startGame: Waiting for world data from server...");
  }

  onWorldDataReceived(worldData) {
    console.log("Client: worldData event received", worldData);
    this.serverWorldData = worldData;

    // Initialize the game world using server data
    this.systems.world = new WorldGenerator({
      // width, height, tileSize will be taken from worldData inside loadFromData
      tilesets: this.tilesets // Tilesets are loaded client-side
    });

    const worldView = this.systems.world.loadFromData(this.serverWorldData);
    this.worldContainer.addChild(worldView);

    // Create player with selected class, using world data for positioning
    const playerStartX = (this.serverWorldData.width / 2) * this.serverWorldData.tileSize;
    const playerStartY = (this.serverWorldData.height / 2) * this.serverWorldData.tileSize;

    // Player is created here, but its details (name, class) were already sent.
    // The server will use those details when creating the player object on its side.
    // The local player instance uses the selected class for its own rendering/logic.
    this.entities.player = new Player({
      x: playerStartX,
      y: playerStartY,
      class: this.selectedPlayerClass, // Use the class selected by the player
      combatSystem:  this.systems.combat,
      spriteManager: this.systems.sprites
    });
    // The local player's name property could be set here if needed for local display,
    // but server's version of name is king for multiplayer (chat, player list).
    // this.entities.player.name = this.playerName;
    this.entityContainer.addChild(this.entities.player.sprite);

    // Add health and stats UI
    this.healthUI = new HealthUI(this.entities.player);
    this.statsUI = new StatsUI(this.entities.player, { showDebug: SHOW_DEBUG_STATS });
    this.uiContainer.addChild(this.healthUI.container);
    this.uiContainer.addChild(this.statsUI.container);

    // Initialize monster system (it might use world data for pathfinding later)
    this.systems.monsters = new MonsterSystem(this.systems.world);

    this.updateCamera();
    this.app.ticker.add(this.update.bind(this)); // Start game loop
    this.gameStarted = true;
    this.inputSequenceNumber = 0;
    console.log(`Game initialized with ${this.selectedPlayerClass} player using server world data.`);
    // Note: Initial player position might be further adjusted by 'currentPlayers' event from server

    // Initialize UI elements that don't depend on world data yet
    this.playerListUI = new PlayerListUI();
    this.uiContainer.addChild(this.playerListUI.container);

    if (this.socket) { // Ensure socket is available (it should be by this point)
        this.chatUI = new ChatUI(this.socket);
        this.uiContainer.addChild(this.chatUI.displayContainer);
    } else {
        console.error("Game: Socket not available for ChatUI initialization!");
    }
    this.setupGlobalInputListeners(); // For chat toggle
  }

  setupGlobalInputListeners() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // If chat is not currently focused, pressing Enter should focus it.
            // If it IS focused, ChatUI's own listener handles sending the message.
            if (this.chatUI && !this.chatUI.isFocused) {
                e.preventDefault(); // Prevent any default browser action for Enter
                this.chatUI.toggleChatFocus();
            }
        }
        // Note: Escape key to unfocus chat is handled by ChatUI's input listener
        // and InputSystem allowing Escape through.
    });
  }

  setupSocketEventHandlers() {
    if (!this.socket) {
      console.error("Socket not initialized when setting up event handlers.");
      return;
    }

    // Listen for worldData first
    this.socket.once('worldData', (data) => { // Use .once if it's only sent once
        this.onWorldDataReceived(data);
    });

    this.socket.on('currentPlayers', (players) => {
      console.log('currentPlayers event received:', players);
      this.playerListUI.updatePlayers(players); // Update PlayerListUI
      Object.values(players).forEach(playerData => {
        if (playerData.id !== this.socket.id) {
          this.addOtherPlayer(playerData);
        } else {
          // This is data for our own player from the server
          if (this.entities.player) {
            this.entities.player.setPosition(playerData.x, playerData.y);
            // Could also update facing, etc., if server sends it:
            // this.entities.player.facing = playerData.facing || this.entities.player.facing;
          }
        }
      });
    });

    this.socket.on('newPlayer', (playerData) => {
      console.log('newPlayer event received:', playerData);
      this.playerListUI.addPlayer(playerData); // Update PlayerListUI
      if (playerData.id !== this.socket.id) {
        this.addOtherPlayer(playerData);
      }
    });

    this.socket.on('chatMessageReceived', (data) => {
      // console.log('chatMessageReceived event:', data);
      if (this.chatUI) {
        this.chatUI.addMessage(data.senderName, data.message);
      }
    });

    this.socket.on('playerDisconnected', (playerId) => {
      console.log('playerDisconnected event received:', playerId);
      this.playerListUI.removePlayer(playerId); // Update PlayerListUI
      if (this.otherPlayers[playerId]) {
        this.otherPlayersContainer.removeChild(this.otherPlayers[playerId].sprite);
        delete this.otherPlayers[playerId];
      }
    });

    // Listen for playerMoved event from server
    this.socket.on('playerMoved', (data) => {
      // console.log('playerMoved event received:', data); // For debugging
      if (data.id === this.socket.id) {
        // Update local player's position based on server state
        if (this.entities.player) {
          this.entities.player.setPosition(data.x, data.y);
          // If server sends facing or isMoving, update them for local player too,
          // which helps keep animations in sync if there's any discrepancy.
          // this.entities.player.facing = data.facing || this.entities.player.facing;
          // this.entities.player.movement.isMoving = data.isMoving !== undefined ? data.isMoving : this.entities.player.movement.isMoving;
        }
      } else if (this.otherPlayers[data.id]) {
        // Update other player's position
        this.otherPlayers[data.id].setPosition(data.x, data.y);
        // Update other state like 'facing' or 'isMoving' for animations if server sends it
        // For example:
        // this.otherPlayers[data.id].facing = data.facing || this.otherPlayers[data.id].facing;
        // this.otherPlayers[data.id].movement.isMoving = data.isMoving !== undefined ? data.isMoving : this.otherPlayers[data.id].movement.isMoving;
        // this.otherPlayers[data.id].movement.movementDirection = data.movementDirection || this.otherPlayers[data.id].movement.movementDirection;
      }
    });

    // Server-Authoritative Combat Events
    this.socket.on('monsterDamaged', (data) => {
      console.log('monsterDamaged event received:', data);
      const monster = this.clientMonsters[data.monsterId];
      if (monster) {
        monster.hitPoints = data.newHealth; // Directly set health from server
        monster.updateHealthBar(); // Update visual
        // Play a generic damage animation/effect if monster has one
        if (monster.state !== 'stunned' && monster.state !== 'dying') { // Avoid interrupting existing critical animations
             // monster.changeState('stunned'); // Or a more generic 'damaged' state if exists
             // For now, just a tint, actual damage animation might be complex to trigger here
             if(monster.animatedSprite) monster.animatedSprite.tint = 0xFF0000;
             setTimeout(() => {
                if(monster.animatedSprite && monster.alive) monster.animatedSprite.tint = 0xFFFFFF;
             }, 150);
        }
      }
    });

    this.socket.on('monsterDied', (data) => {
      console.log('monsterDied event received:', data);
      const monster = this.clientMonsters[data.monsterId];
      if (monster && monster.alive) { // Ensure not already dead
        monster.hitPoints = 0; // Ensure health is 0
        monster.die(); // Trigger death sequence (animation, hide health bar)
        // The monster will be fully removed from clientMonsters by the monsterUpdate logic eventually
      }
    });

    this.socket.on('playerAttackUsed', (data) => {
      // console.log('playerAttackUsed event received:', data);
      if (data.playerId !== this.socket.id) { // This is for other players
        const otherPlayer = this.otherPlayers[data.playerId];
        if (otherPlayer && otherPlayer.animation) {
          // Ensure otherPlayer has necessary properties for animation if not normally updated
          // otherPlayer.facing = data.facing; // Server should send facing with this event ideally
          // otherPlayer.characterClass = data.class; // Server should send class
          // otherPlayer.currentAttackType = data.attackType; // For animation component
          // otherPlayer.isAttacking = true; // For animation component

          // A simplified way if animation component can handle it:
          // This assumes the AnimationComponent can find/play the attack animation
          // based on type and class. This might need more state on otherPlayer object.
          // For now, this is a placeholder for triggering other player's attack visuals.
          // A robust solution would involve syncing more of the player's animation state.
          console.log(`TODO: Animate attack for player ${data.playerId}, type: ${data.attackType}, class: ${data.class}`);
          // Example: otherPlayer.animation.playAttackAnimation(data.attackType);
          // This would require otherPlayer.spriteManager to be valid or animation component to handle null.
        }
      } else {
        // Local player's attack was acknowledged by server.
        // Can be used for things like confirming a cooldown started server-side.
      }
    });

    this.socket.on('currentMonsters', (monstersData) => {
      console.log('currentMonsters event received:', monstersData);
      for (const id in monstersData) {
        this.updateOrSpawnMonster(monstersData[id]);
      }
    });

    this.socket.on('monsterUpdate', (monstersData) => {
      // console.log('monsterUpdate event received:', monstersData); // Can be very spammy
      // Keep track of monster IDs received in this update
      const receivedMonsterIds = new Set();
      for (const id in monstersData) {
        this.updateOrSpawnMonster(monstersData[id]);
        receivedMonsterIds.add(id);
      }

      // Optional: Remove monsters that are no longer sent by the server
      for (const id in this.clientMonsters) {
        if (!receivedMonsterIds.has(id)) {
          console.log(`Removing monster ${id} as it's no longer in server updates.`);
          if (this.clientMonsters[id].sprite && this.clientMonsters[id].sprite.parent) {
            this.monsterContainer.removeChild(this.clientMonsters[id].sprite);
          }
          delete this.clientMonsters[id];
        }
      }
    });
  }

  addOtherPlayer(playerData) {
    // For now, other players are just static sprites without full functionality
    const otherPlayer = new Player({
      x: playerData.x,
      y: playerData.y,
      class: playerData.class,
      combatSystem: null, // Other players don't use the local combat system
      spriteManager: null // Other players will use placeholder graphics for now
    });
    this.otherPlayers[playerData.id] = otherPlayer;
    this.otherPlayersContainer.addChild(otherPlayer.sprite);
    console.log(`Added other player ${playerData.id} at ${playerData.x}, ${playerData.y}`);
  }

  // Handler for creating/updating monsters based on server data
  updateOrSpawnMonster(monsterData) {
    if (this.clientMonsters[monsterData.id]) {
      // Monster exists, update its state
      this.clientMonsters[monsterData.id].setStateFromServer(monsterData);
    } else {
      // New monster, create it
      const newMonster = new Monster({ // Monster is now imported at top level
        x: monsterData.x,
        y: monsterData.y,
        type: monsterData.type,
        isServerControlled: true // Mark as server-controlled
      });
      newMonster.id = monsterData.id; // Assign the ID from server
      this.clientMonsters[monsterData.id] = newMonster;
      this.monsterContainer.addChild(newMonster.sprite);
      console.log(`Client spawned monster ${monsterData.id} of type ${monsterData.type}`);
    }
  }

  update(delta) {
    // Only update game if it has started
    if (!this.gameStarted) return;
    
    const deltaTimeSeconds = delta / 60;

    // 1. Update player input and intended movement
    const inputState = this.systems.input.update();
    // Pass true for isLocalPlayer. Player.update now handles local vs remote logic.
    this.entities.player.update(deltaTimeSeconds, inputState, true);

    // Emit player input to server if there is any movement or action.
    // We send relevant parts of inputState and current player facing.
    // This condition checks for active movement, attack keys, or change in facing direction.
    if (inputState.up || inputState.down || inputState.left || inputState.right ||
        inputState.primaryAttack || inputState.secondaryAttack || inputState.roll ||
        this.entities.player.facing !== this.entities.player.lastFacingInput) {

      const inputPayload = {
        keys: { // Send relevant key states
          up: inputState.up,
          down: inputState.down,
          left: inputState.left,
          right: inputState.right,
          primaryAttack: inputState.primaryAttack, // Will be used later
          secondaryAttack: inputState.secondaryAttack, // Will be used later
          roll: inputState.roll, // Will be used later
        },
        facing: this.entities.player.facing, // Send current facing direction
        sequenceNumber: this.inputSequenceNumber++,
      };
      this.socket.emit('playerInput', inputPayload);
      this.entities.player.lastFacingInput = this.entities.player.facing; // Update last sent facing
    }
    
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
    this.otherPlayersContainer.position.set(
      Math.floor(this.app.screen.width / 2 - this.camera.x),
      Math.floor(this.app.screen.height / 2 - this.camera.y)
    );
    this.monsterContainer.position.set( // Update monsterContainer position
      Math.floor(this.app.screen.width / 2 - this.camera.x),
      Math.floor(this.app.screen.height / 2 - this.camera.y)
    );
  }
}