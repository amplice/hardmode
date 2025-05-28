import { MONSTER_CONFIG } from '../../js/config/GameConfig.js';

export class Monster {
    constructor(options) {
        this.id = options.id;
        this.type = options.type || 'skeleton';
        this.x = options.x;
        this.y = options.y;

        const stats = MONSTER_CONFIG.stats[this.type] || {};
        this.moveSpeed = stats.moveSpeed || options.moveSpeed || 2;
        this.attackRange = stats.attackRange || options.attackRange || 60;
        this.aggroRange = stats.aggroRange || options.aggroRange || 200;
        this.maxHp = stats.hitPoints || 1;
        this.hp = this.maxHp;

        this.state = 'idle';
        this.attackCooldown = 0;
        this.facing = 'down';
        this.alive = true;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.alive = false;
            this.state = 'dead';
        }
    }

    update(delta, players) {
        if (!this.alive) return;

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Find nearest player
        let closest = null;
        let closestDist = Infinity;
        for (const id in players) {
            const p = players[id];
            if (p.hp <= 0) continue;
            const dx = p.x - this.x;
            const dy = p.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closest = p;
                closestDist = dist;
            }
        }

        if (closest) {
            const dx = closest.x - this.x;
            const dy = closest.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.attackRange) {
                // Move toward player
                const speed = this.moveSpeed * delta;
                if (dist > 0) {
                    this.x += (dx / dist) * speed;
                    this.y += (dy / dist) * speed;
                }
                this.state = 'walking';
            } else {
                if (this.attackCooldown <= 0) {
                    const attackCfg = MONSTER_CONFIG.attacks[this.type] || {};
                    const dmg = attackCfg.damage || 1;
                    const cd = attackCfg.cooldown || 1.0;
                    closest.hp = Math.max(0, (closest.hp || 0) - dmg);
                    this.attackCooldown = cd;
                    this.state = 'attacking';
                } else {
                    this.state = 'idle';
                }
            }

            // Update facing
            if (Math.abs(dx) > Math.abs(dy)) {
                this.facing = dx > 0 ? 'right' : 'left';
            } else {
                this.facing = dy > 0 ? 'down' : 'up';
            }
        }
    }
}
