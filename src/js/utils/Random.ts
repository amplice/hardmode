// src/js/utils/Random.ts

/**
 * Creates a seeded random number generator
 * Used for deterministic world generation across client and server
 * @param seed - The seed value for the random number generator
 * @returns A function that generates random numbers between 0 and 1
 */
export function createSeededRandom(seed: number): () => number {
    let s = seed >>> 0;
    return function(): number {
        // Linear congruential generator
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xFFFFFFFF;
    };
}