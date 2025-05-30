import { calculateDistance } from '../utils/MathUtils.js';

export function getRelevantEntities(player, entities, viewDistance) {
    if (!player) return entities;
    return entities.filter((e) => {
        return calculateDistance(player.position, e.position) <= viewDistance;
    });
}

function diffEntity(prev, curr) {
    const diff = { id: curr.id, type: curr.type };
    let changed = false;
    for (const key of Object.keys(curr)) {
        if (key === 'id' || key === 'type') continue;
        const prevVal = prev ? prev[key] : undefined;
        const currVal = curr[key];
        if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
            diff[key] = currVal;
            changed = true;
        }
    }
    return changed ? diff : null;
}

function indexById(list) {
    const map = new Map();
    for (const item of list) {
        map.set(item.id, item);
    }
    return map;
}

export function computeDelta(prevState, currState) {
    const delta = {
        tick: currState.timestamp,
        updates: [],
        spawns: [],
        despawns: []
    };

    const prevMap = indexById(prevState.entities || []);
    const currMap = indexById(currState.entities || []);

    for (const [id, entity] of currMap) {
        if (!prevMap.has(id)) {
            delta.spawns.push(entity);
        } else {
            const diff = diffEntity(prevMap.get(id), entity);
            if (diff) delta.updates.push(diff);
        }
    }

    for (const id of prevMap.keys()) {
        if (!currMap.has(id)) {
            delta.despawns.push({ id });
        }
    }

    return delta;
}

export function buildFullState(entities, timestamp) {
    return {
        fullState: true,
        timestamp,
        entities
    };
}
