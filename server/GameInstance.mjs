import {
    computeDelta,
    buildFullState,
    getRelevantEntities
} from '../src/js/net/StateSync.js';

export class GameInstance {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.state = {
            players: new Map(),
            monsters: new Map(),
            projectiles: new Map(),
            nextEntityId: 1,
            timestamp: Date.now()
        };
        this.pendingInputs = new Map();
        this.lastStates = new Map();
        this.viewDistance = 800;
        this.updateRate = 20;
        this.lastUpdate = Date.now();

        // Spawn a few simple monsters so clients have entities to see
        this.spawnInitialMonsters();
    }

    spawnInitialMonsters() {
        for (let i = 0; i < 5; i++) {
            const id = `monster_${this.state.nextEntityId++}`;
            this.state.monsters.set(id, {
                id,
                type: 'monster',
                monsterType: 'skeleton',
                position: { x: 200 + i * 50, y: 200 + i * 50 },
                facing: 'down',
                alive: true
            });
        }
    }

    findNearestPlayer(monster) {
        let closest = null;
        let minDist = Infinity;
        for (const p of this.state.players.values()) {
            const dx = p.position.x - monster.position.x;
            const dy = p.position.y - monster.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                closest = p;
            }
        }
        return closest;
    }

    updateMonsters(deltaTime) {
        // Simple chase AI that moves monsters toward the nearest player
        for (const monster of this.state.monsters.values()) {
            const target = this.findNearestPlayer(monster);
            if (!target) continue;
            const dx = target.position.x - monster.position.x;
            const dy = target.position.y - monster.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = 60 * deltaTime;
            monster.position.x += (dx / dist) * speed;
            monster.position.y += (dy / dist) * speed;
        }
    }

    addPlayer(player) {
        this.players.set(player.id, player);
        const entity = {
            id: player.id,
            type: 'player',
            position: { x: 100, y: 100 },
            facing: 'down',
            hp: 3,
            class: player.class || 'bladedancer'
        };
        this.state.players.set(player.id, entity);
        this.pendingInputs.set(player.id, null);
        this.lastStates.set(player.id, null);
        const allEntities = [
            ...Array.from(this.state.players.values()),
            ...Array.from(this.state.monsters.values()),
            ...Array.from(this.state.projectiles.values())
        ];
        const relevant = getRelevantEntities(entity, allEntities, this.viewDistance);
        const snapshot = buildFullState(relevant, this.state.timestamp);
        player.socket.emit('game_state', snapshot);
        this.lastStates.set(player.id, { entities: relevant, timestamp: this.state.timestamp });
        this.broadcast('player_joined', { playerId: player.id }, player.id);
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.state.players.delete(playerId);
        this.pendingInputs.delete(playerId);
        this.lastStates.delete(playerId);
        this.broadcast('player_left', { playerId });
    }

    handlePlayerInput(playerId, input) {
        if (this.players.has(playerId)) {
            this.pendingInputs.set(playerId, input.data || input);
        }
    }

    update(deltaTime) {
        for (const [id, entity] of this.state.players) {
            const input = this.pendingInputs.get(id) || {};
            const speed = 100 * deltaTime;
            if (input.up) entity.position.y -= speed;
            if (input.down) entity.position.y += speed;
            if (input.left) entity.position.x -= speed;
            if (input.right) entity.position.x += speed;
            this.pendingInputs.set(id, null);
        }

        this.updateMonsters(deltaTime);

        this.state.timestamp = Date.now();

        const entityList = [
            ...Array.from(this.state.players.values()),
            ...Array.from(this.state.monsters.values()),
            ...Array.from(this.state.projectiles.values())
        ];

        for (const player of this.players.values()) {
            const playerEntity = this.state.players.get(player.id);
            const relevant = getRelevantEntities(
                playerEntity,
                entityList,
                this.viewDistance
            );
            const snapshot = { entities: relevant, timestamp: this.state.timestamp };
            const last = this.lastStates.get(player.id);
            let payload;
            if (!last) {
                payload = buildFullState(snapshot.entities, snapshot.timestamp);
            } else {
                payload = computeDelta(last, snapshot);
            }
            this.lastStates.set(player.id, snapshot);
            player.socket.emit('game_state', payload);
        }

        this.lastUpdate = Date.now();
    }

    broadcast(event, data, excludeId = null) {
        for (const p of this.players.values()) {
            if (p.id === excludeId) continue;
            p.socket.emit(event, data);
        }
    }
}
