import { ClientMessages, ServerMessages } from './MessageTypes.js';
import { Player } from '../entities/Player.js';
import { WorldGenerator } from '../systems/world/WorldGenerator.js';
import { PhysicsSystem } from '../systems/Physics.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { MonsterSystem } from '../systems/MonsterSystem.js';
import { SpriteManager } from '../systems/animation/SpriteManager.js';

export class LocalServer {
    constructor(game) {
        this.game = game;
        this.gameState = {
            players: new Map(),
            monsters: new Map(),
            projectiles: new Map(),
            nextEntityId: 1,
            timestamp: Date.now()
        };
        this.messageHandlers = new Map();
        this.clients = new Map();
        this.systems = {
            physics: new PhysicsSystem(),
            combat: new CombatSystem(game.app),
            sprites: new SpriteManager(),
            world: null,
            monsters: null
        };

        this.messageHandlers.set(
            ClientMessages.INPUT,
            this.handleInput.bind(this)
        );
        this.messageHandlers.set(
            ClientMessages.CLASS_SELECT,
            this.handleClassSelect.bind(this)
        );
    }

    connectClient(clientId, client) {
        this.clients.set(clientId, client);
    }

    startGame(clientId, selectedClass, tilesets) {
        this.systems.world = new WorldGenerator({
            width: 100,
            height: 100,
            tileSize: 64,
            tilesets
        });

        const worldView = this.systems.world.generate();
        this.game.worldContainer.addChild(worldView);

        const player = new Player({
            x: (this.systems.world.width / 2) * this.systems.world.tileSize,
            y: (this.systems.world.height / 2) * this.systems.world.tileSize,
            class: selectedClass || 'bladedancer',
            combatSystem: this.systems.combat,
            spriteManager: this.systems.sprites
        });
        this.game.entityContainer.addChild(player.sprite);
        this.gameState.players.set(clientId, player);

        this.systems.monsters = new MonsterSystem(this.systems.world);

        const joinMsg = { type: ServerMessages.PLAYER_JOINED, playerId: clientId };
        const client = this.clients.get(clientId);
        if (client && client.onServerMessage) {
            client.onServerMessage(joinMsg);
        }
    }

    handleMessage(clientId, message) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(clientId, message);
        }
    }

    handleClassSelect(clientId, message) {
        this.startGame(clientId, message.class, this.game.tilesets);
    }

    handleInput(clientId, message) {
        const player = this.gameState.players.get(clientId);
        if (player) {
            player.pendingInput = message.data;
        }
    }

    broadcast(message, excludeClient) {
        for (const [id, client] of this.clients) {
            if (id === excludeClient) continue;
            if (client.onServerMessage) {
                client.onServerMessage(message);
            }
        }
    }

    update(deltaTime) {
        const player = this.gameState.players.get('player1');
        if (player) {
            const input = player.pendingInput || {};
            player.update(deltaTime, input);
            player.pendingInput = null;

            if (this.systems.monsters) {
                this.systems.monsters.update(deltaTime, player);
                const all = [player, ...this.systems.monsters.monsters];
                this.systems.physics.update(
                    deltaTime,
                    all,
                    this.systems.world
                );
            }

            this.systems.combat.update(deltaTime);
        }

        this.gameState.timestamp = Date.now();
    }
}
