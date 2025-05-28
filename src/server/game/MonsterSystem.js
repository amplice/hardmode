import seedrandom from 'seedrandom';
import { MONSTER_CONFIG } from '../../js/config/GameConfig.js';
import { Monster } from './Monster.js';

export class MonsterSystem {
    constructor(seed) {
        this.rng = seedrandom(seed);
        this.monsters = {};
        this.nextId = 1;
        this.spawnTimer = 0;
        this.spawnRate = MONSTER_CONFIG.spawn.timer;
        this.maxMonsters = MONSTER_CONFIG.spawn.maxMonsters;
        this.worldWidth = 100 * 64; // match client world size
        this.worldHeight = 100 * 64;

        this.spawnInitial();
    }

    spawnInitial() {
        const centerX = this.worldWidth / 2;
        const centerY = this.worldHeight / 2;
        for (const spawn of MONSTER_CONFIG.testSpawns) {
            for (let i = 0; i < spawn.count; i++) {
                const x = centerX + spawn.offsetX + (this.rng() - 0.5) * 100;
                const y = centerY + spawn.offsetY + (this.rng() - 0.5) * 100;
                this.addMonster(spawn.type, x, y);
            }
        }
    }

    addMonster(type, x, y) {
        const id = this.nextId++;
        this.monsters[id] = new Monster({ id, type, x, y });
    }

    spawnRandom(players) {
        const playerIds = Object.keys(players);
        if (playerIds.length === 0) return;
        // Pick a random player as spawn reference
        const base = players[playerIds[Math.floor(this.rng() * playerIds.length)]];
        const minDist = MONSTER_CONFIG.spawn.minDistanceFromPlayer;
        const maxDist = MONSTER_CONFIG.spawn.maxDistanceFromPlayer;
        for (let attempt = 0; attempt < 20; attempt++) {
            const angle = this.rng() * Math.PI * 2;
            const dist = minDist + this.rng() * (maxDist - minDist);
            const x = base.x + Math.cos(angle) * dist;
            const y = base.y + Math.sin(angle) * dist;
            if (x < 0 || y < 0 || x > this.worldWidth || y > this.worldHeight) {
                continue;
            }

            let roll = this.rng();
            let chosenType = 'skeleton';
            let total = 0;
            for (const [type, prob] of Object.entries(MONSTER_CONFIG.spawn.distribution)) {
                total += prob;
                if (roll < total) {
                    chosenType = type;
                    break;
                }
            }
            this.addMonster(chosenType, x, y);
            break;
        }
    }

    update(delta, players) {
        this.spawnTimer += delta;
        if (Object.keys(this.monsters).length < this.maxMonsters && this.spawnTimer >= this.spawnRate) {
            this.spawnTimer = 0;
            this.spawnRandom(players);
        }

        for (const id in this.monsters) {
            this.monsters[id].update(delta, players);
        }
    }

    getState() {
        const state = {};
        for (const id in this.monsters) {
            const m = this.monsters[id];
            state[id] = { x: m.x, y: m.y, type: m.type, state: m.state, facing: m.facing };
        }
        return state;
    }
}
