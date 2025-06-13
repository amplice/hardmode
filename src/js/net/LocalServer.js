import { ClientMessages, ServerMessages } from './MessageTypes.js';
import { computeDelta, buildFullState, getRelevantEntities } from './StateSync.js';
import { LagCompensation } from '../../../server/LagCompensation.mjs';

// Simple local server used in Stage 1 of the multiplayer transition. It keeps
// authoritative game state and processes input from connected clients.

export class LocalServer {
    constructor(game) {
        // Reference to the running Game instance so the server can access
        // systems and entities that already exist.
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
        this.pendingInputs = new Map();
        this.lastStates = new Map();
        this.lastProcessedInput = new Map();
        this.viewDistance = 800; // pixels
        this.lagComp = new LagCompensation();

        this.registerHandlers();
    }

    registerHandlers() {
        this.messageHandlers.set(
            ClientMessages.INPUT,
            this.handleInput.bind(this)
        );
    }

    connectClient(clientId, client) {
        this.clients.set(clientId, client);
        this.pendingInputs.set(clientId, null);
        this.lastStates.set(clientId, null);
        this.lastProcessedInput.set(clientId, -1);
    }

    addPlayer(clientId, player) {
        this.gameState.players.set(clientId, player);
        const entities = [
            {
                id: player.id,
                type: 'player',
                position: { x: player.position.x, y: player.position.y },
                facing: player.facing,
                hp: player.health ? player.health.hitPoints : 0,
                class: player.characterClass
            }
        ];
        const snapshot = { entities, timestamp: Date.now() };
        this.lastStates.set(clientId, snapshot);
        const client = this.clients.get(clientId);
        if (client && client.onServerMessage) {
            client.onServerMessage({
                type: ServerMessages.PLAYER_INFO,
                data: { playerId: player.id, position: { x: player.position.x, y: player.position.y } }
            });
            client.onServerMessage({ type: ServerMessages.GAME_STATE, data: buildFullState(entities, snapshot.timestamp) });
        }
    }

    handleInput(clientId, message) {
        this.pendingInputs.set(clientId, message.data);
    }

    handleMessage(clientId, message) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(clientId, message);
        }
    }

    broadcast(message, excludeClient) {
        for (const [id, client] of this.clients) {
            if (id === excludeClient) {
                continue;
            }
            if (client.onServerMessage) {
                client.onServerMessage(message);
            }
        }
    }

    update(deltaTime) {
        const players = Array.from(this.gameState.players.values());
        const timestamp = Date.now();
        for (const p of players) {
            this.lagComp.record(p.id, p.position, timestamp);
        }
        for (const m of this.game.systems.monsters.monsters) {
            this.lagComp.record(m.id, m.position, timestamp);
        }

        for (const [clientId, player] of this.gameState.players) {
            const inputObj = this.pendingInputs.get(clientId) || {};
            const inputState = inputObj.input || inputObj;
            player.update(deltaTime, inputState);
            if (typeof inputObj.sequenceNumber === 'number') {
                this.lastProcessedInput.set(clientId, inputObj.sequenceNumber);
            }
        }

        const mainPlayer = players[0];
        if (mainPlayer) {
            this.game.systems.monsters.update(deltaTime, mainPlayer);
        }

        const allEntities = [
            ...players,
            ...this.game.systems.monsters.monsters
        ];
        this.game.systems.physics.update(
            deltaTime,
            allEntities,
            this.game.systems.world
        );

        this.game.systems.combat.update(deltaTime);

        this.gameState.timestamp = Date.now();

        const entityList = [
            ...players.map((p) => ({
                id: p.id,
                type: 'player',
                position: { x: p.position.x, y: p.position.y },
                facing: p.facing,
                hp: p.health ? p.health.hitPoints : 0,
                class: p.characterClass
            })),
            ...this.game.systems.monsters.monsters.map((m) => ({
                id: m.id,
                type: 'monster',
                monsterType: m.type,
                position: { x: m.position.x, y: m.position.y },
                facing: m.facing,
                alive: m.alive
            })),
            ...this.game.systems.combat.projectiles.map((proj) => ({
                id: proj.id,
                type: 'projectile',
                position: { x: proj.position.x, y: proj.position.y }
            }))
        ];

        for (const [clientId, client] of this.clients) {
            const playerObj = this.gameState.players.get(clientId);
            const relevant = getRelevantEntities(
                playerObj,
                entityList,
                this.viewDistance
            );
            const snapshot = { entities: relevant, timestamp: this.gameState.timestamp };
            const last = this.lastStates.get(clientId);
            let payload;
            if (!last) {
                payload = buildFullState(snapshot.entities, snapshot.timestamp);
            } else {
                payload = computeDelta(last, snapshot);
            }
            payload.lastProcessedInput = this.lastProcessedInput.get(clientId) ?? -1;
            this.lastStates.set(clientId, snapshot);
            if (client.onServerMessage) {
                client.onServerMessage({ type: ServerMessages.GAME_STATE, data: payload });
            }
        }
    }
}

