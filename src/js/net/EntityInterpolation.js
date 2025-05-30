export class EntityInterpolation {
    constructor(interpolationDelay = 100) {
        this.stateBuffer = [];
        this.interpolationDelay = interpolationDelay;
    }

    addState(state, timestamp) {
        this.stateBuffer.push({ state, timestamp });
        const cutoff = timestamp - 1000;
        this.stateBuffer = this.stateBuffer.filter((s) => s.timestamp > cutoff);
    }

    lerp(a, b, t) {
        return {
            position: {
                x: a.position.x + (b.position.x - a.position.x) * t,
                y: a.position.y + (b.position.y - a.position.y) * t
            },
            facing: t < 0.5 ? a.facing : b.facing
        };
    }

    getInterpolatedState(renderTime) {
        const targetTime = renderTime - this.interpolationDelay;
        let before = null;
        let after = null;
        for (let i = 0; i < this.stateBuffer.length - 1; i++) {
            const s1 = this.stateBuffer[i];
            const s2 = this.stateBuffer[i + 1];
            if (s1.timestamp <= targetTime && s2.timestamp >= targetTime) {
                before = s1;
                after = s2;
                break;
            }
        }
        if (before && after) {
            const t = (targetTime - before.timestamp) / (after.timestamp - before.timestamp);
            return this.lerp(before.state, after.state, t);
        }
        return this.stateBuffer[this.stateBuffer.length - 1]?.state;
    }
}
