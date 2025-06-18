export function createSeededRandom(seed) {
    let s = seed >>> 0;
    return function() {
        // Linear congruential generator
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xFFFFFFFF;
    };
}
