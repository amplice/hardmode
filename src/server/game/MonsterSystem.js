import seedrandom from 'seedrandom';
import { MONSTER_CONFIG } from '../../js/config/GameConfig.js';
import { directionStringToAngleRadians } from '../../js/utils/DirectionUtils.js';
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
            const m = this.monsters[id];
            m.update(delta, players);
            if (!m.alive) {
                delete this.monsters[id];
            }
        }
    }

    getState() {
        const state = {};
        for (const id in this.monsters) {
            const m = this.monsters[id];
            state[id] = {
                x: m.x,
                y: m.y,
                type: m.type,
                state: m.state,
                facing: m.facing,
                hp: m.hp,
                maxHp: m.maxHp
            };
        }
        return state;
    }

    processPlayerAttack(player, type) {
        const cfg = {
            attack: { range: 85, angle: 90, damage: 1 },
            secondary: { range: 110, angle: 110, damage: 2 }
        }[type];
        if (!cfg) return;
        const playerAngle = directionStringToAngleRadians(player.facing || 'down');
        for (const id in this.monsters) {
            const m = this.monsters[id];
            if (!m.alive) continue;
            const dx = m.x - player.x;
            const dy = m.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > cfg.range) continue;
            let ang = Math.atan2(dy, dx);
            let diff = Math.abs(ang - playerAngle);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            if (diff <= (cfg.angle * Math.PI / 180) / 2) {
                m.takeDamage(cfg.damage);
            }
        }
    }
}
