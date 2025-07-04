// Shared mathematical utility functions

import type { Vector2D } from '../types/GameTypes.js';

export function createSeededRandom(seed: number): () => number {
    let s = seed >>> 0;
    return function(): number {
        // Linear congruential generator
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xFFFFFFFF;
    };
}

export function getDistance(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function getDistanceSquared(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

export function normalizeVector(x: number, y: number): Vector2D {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

export function angleDifference(angle1: number, angle2: number): number {
    let diff = angle2 - angle1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return diff;
}

export function randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

export function selectWeightedRandom<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) return items[i];
    }
    return items[items.length - 1];
}