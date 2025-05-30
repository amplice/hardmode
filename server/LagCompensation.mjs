export class LagCompensation {
    constructor(historyDuration = 1000) {
        this.positionHistory = new Map();
        this.historyDuration = historyDuration;
    }

    record(entityId, position, timestamp = Date.now()) {
        if (!this.positionHistory.has(entityId)) {
            this.positionHistory.set(entityId, []);
        }
        const history = this.positionHistory.get(entityId);
        history.push({ position: { ...position }, timestamp });
        const cutoff = timestamp - this.historyDuration;
        while (history.length && history[0].timestamp < cutoff) {
            history.shift();
        }
    }

    getPositionAtTime(history, time) {
        let before = null;
        let after = null;
        for (let i = 0; i < history.length - 1; i++) {
            const h1 = history[i];
            const h2 = history[i + 1];
            if (h1.timestamp <= time && h2.timestamp >= time) {
                before = h1;
                after = h2;
                break;
            }
        }
        if (before && after) {
            const t = (time - before.timestamp) / (after.timestamp - before.timestamp);
            return {
                x: before.position.x + (after.position.x - before.position.x) * t,
                y: before.position.y + (after.position.y - before.position.y) * t
            };
        }
        return history[history.length - 1]?.position;
    }

    processAttack(attackerId, targetId, clientTimestamp, players) {
        const attacker = players.get(attackerId);
        const targetHistory = this.positionHistory.get(targetId) || [];
        const latency = attacker?.latency || 0;
        const attackTime = clientTimestamp + latency;
        return this.getPositionAtTime(targetHistory, attackTime);
    }
}
