import { ClientMessages, ServerMessages } from './MessageTypes.js';
import { generateId } from '../utils/IdGenerator.js';
import { PLAYER_CONFIG } from '../config/GameConfig.js';
import { angleToDirectionString } from '../utils/DirectionUtils.js';

export class LocalServer {
    constructor() {
        this.gameState = {
            players: new Map(),
            monsters: new Map(),
            projectiles: new Map(),
            timestamp: Date.now()
        };
        this.clients = new Map();
        this.playerClientMap = new Map();
        this.messageHandlers = {
            [ClientMessages.CLASS_SELECT]: this.handleClassSelect.bind(this),
            [ClientMessages.INPUT]: this.handleInput.bind(this)
        };
    }

    connectClient(clientId, client) {
        this.clients.set(clientId, client);
    }

    handleMessage(clientId, message) {
        const handler = this.messageHandlers[message.type];
        if (handler) {
            handler(clientId, message);
        }
    }

    handleClassSelect(clientId, message) {
        const playerId = generateId('player');
        const classStats = PLAYER_CONFIG.classes[message.class] || PLAYER_CONFIG.classes.bladedancer;
        const playerData = {
            id: playerId,
            class: message.class,
            position: { x: message.x || 0, y: message.y || 0 },
            moveSpeed: classStats.moveSpeed,
            facing: 'down',
            input: null
        };
        this.gameState.players.set(playerId, playerData);
        this.playerClientMap.set(clientId, playerId);

        this.broadcast({
            type: ServerMessages.PLAYER_JOINED,
            playerId,
            playerData
        });

        this.broadcast({
            type: ServerMessages.GAME_STATE,
            players: Array.from(this.gameState.players.values()),
            monsters: [],
            projectiles: [],
            timestamp: this.gameState.timestamp
        });
    }

    handleInput(clientId, message) {
        const player = this.gameState.players.get(message.playerId);
        if (!player) return;
        player.input = message.input;
        if (message.mouseWorld) {
            const dx = message.mouseWorld.x - player.position.x;
            const dy = message.mouseWorld.y - player.position.y;
            const angleDegrees = Math.atan2(dy, dx) * 180 / Math.PI;
            player.facing = angleToDirectionString(angleDegrees);
        }
        this.gameState.timestamp = Date.now();
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
        for (const player of this.gameState.players.values()) {
            const input = player.input || {};
            let vx = 0;
            let vy = 0;
            if (input.up) vy = -1;
            if (input.down) vy = 1;
            if (input.left) vx = -1;
            if (input.right) vx = 1;

            if (vx !== 0 && vy !== 0) {
                const diagonal = 0.85;
                vx *= diagonal;
                vy *= diagonal;
            }

            player.position.x = Math.round(player.position.x + vx * player.moveSpeed);
            player.position.y = Math.round(player.position.y + vy * player.moveSpeed);
        }

        this.gameState.timestamp = Date.now();

        const stateMessage = {
            type: ServerMessages.GAME_STATE,
            players: Array.from(this.gameState.players.values()).map(p => ({
                id: p.id,
                class: p.class,
                position: { ...p.position },
                facing: p.facing
            })),
            monsters: [],
            projectiles: [],
            timestamp: this.gameState.timestamp
        };

        this.broadcast(stateMessage);
    }
}
