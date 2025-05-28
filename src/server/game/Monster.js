export class Monster {
    constructor(options) {
        this.id = options.id;
        this.type = options.type || 'skeleton';
        this.x = options.x;
        this.y = options.y;
        this.moveSpeed = options.moveSpeed || 2;
        this.attackRange = options.attackRange || 60;
        this.aggroRange = options.aggroRange || 200;
        this.state = 'idle';
        this.attackCooldown = 0;
        this.facing = 'down';
    }

    update(delta, players) {
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }
        // Find nearest player
        let closest = null;
        let closestDist = Infinity;
        for (const id in players) {
            const p = players[id];
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
            } else if (this.attackCooldown <= 0) {
                this.state = 'attacking';
                this.attackCooldown = 1.0; // 1 second
            } else {
                this.state = 'idle';
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
