import seedrandom from 'seedrandom';
import { MONSTER_CONFIG } from '../../js/config/GameConfig.js';
import { Monster } from './Monster.js';

export class MonsterSystem {
    constructor(seed) {
        this.rng = seedrandom(seed);
        this.monsters = {};
        this.nextId = 1;
        this.spawnInitial();
    }

    spawnInitial() {
        for (const spawn of MONSTER_CONFIG.testSpawns) {
            for (let i = 0; i < spawn.count; i++) {
                const id = this.nextId++;
                const x = spawn.offsetX + (this.rng() - 0.5) * 200;
                const y = spawn.offsetY + (this.rng() - 0.5) * 200;
                this.monsters[id] = new Monster({ id, type: spawn.type, x, y });
            }
        }
    }

    update(delta, players) {
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
