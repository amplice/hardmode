// src/js/utils/DirectionUtils.ts

/**
 * Direction utility functions for 8-way movement and animation
 * CRITICAL: These functions are used by SpriteManager for animation naming
 * The exact string values MUST be preserved for animation compatibility
 */

// Type definitions
export type DirectionString = 'right' | 'down-right' | 'down' | 'down-left' | 'left' | 'up-left' | 'up' | 'up-right';
export type AnimationSuffix = 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' | 'n' | 'ne';

export interface Vector2D {
    x: number;
    y: number;
}

export const EIGHT_WAY_DIRECTIONS: readonly DirectionString[] = [
    'right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'
] as const;

/**
 * Converts an angle in degrees to an 8-way direction string.
 * Angle 0 is to the right.
 * @param angleInDegrees - The angle in degrees (0-360).
 * @returns The direction string (e.g., 'right', 'up-left').
 */
export function angleToDirectionString(angleInDegrees: number): DirectionString {
    const normalizedAngle = ((angleInDegrees % 360) + 360) % 360; // Normalize to 0-360
    const segment = 360 / 8; // 45 degrees per segment
    const index = Math.floor((normalizedAngle + segment / 2) / segment) % 8;
    return EIGHT_WAY_DIRECTIONS[index];
}

/**
 * Converts an 8-way direction string to a radian angle.
 * Angle 0 is to the right.
 * @param directionString - The direction string.
 * @returns The angle in radians.
 */
export function directionStringToAngleRadians(directionString: string): number {
    switch (directionString) {
        case 'right': return 0;
        case 'down-right': return Math.PI / 4;
        case 'down': return Math.PI / 2;
        case 'down-left': return 3 * Math.PI / 4;
        case 'left': return Math.PI;
        case 'up-left': return 5 * Math.PI / 4;
        case 'up': return 3 * Math.PI / 2;
        case 'up-right': return 7 * Math.PI / 4;
        default:
            console.warn(`Unknown direction string: ${directionString}, defaulting to 0 radians (right).`);
            return 0; // Default to right
    }
}

/**
 * Converts an 8-way direction string to a degree angle.
 * Angle 0 is to the right.
 * @param directionString - The direction string.
 * @returns The angle in degrees.
 */
export function directionStringToAngleDegrees(directionString: string): number {
    switch (directionString) {
        case 'right': return 0;
        case 'down-right': return 45;
        case 'down': return 90;
        case 'down-left': return 135;
        case 'left': return 180;
        case 'up-left': return 225;
        case 'up': return 270;
        case 'up-right': return 315;
        default:
            console.warn(`Unknown direction string: ${directionString}, defaulting to 0 degrees (right).`);
            return 0; // Default to right
    }
}

/**
 * Converts an 8-way direction string to a normalized vector.
 * @param directionString - The direction string.
 * @returns The normalized vector.
 */
export function directionStringToVector(directionString: string): Vector2D {
    const angleRad = directionStringToAngleRadians(directionString);
    let x = Math.cos(angleRad);
    let y = Math.sin(angleRad);

    // Snap to common values to avoid floating point inaccuracies for cardinal and 45-degree diagonals
    if (Math.abs(x) < 1e-9) x = 0;
    if (Math.abs(y) < 1e-9) y = 0;

    return { x, y };
}

/**
 * Converts an 8-way direction string to a sprite sheet suffix (e, se, s, sw, w, nw, n, ne).
 * CRITICAL: This function is used by SpriteManager for animation naming patterns
 * The exact return values MUST match the sprite sheet naming convention
 * @param directionString - The direction string (e.g., 'right', 'down', 'up-left').
 * @returns The corresponding sprite sheet suffix (e.g., 'e', 's', 'nw').
 */
export function directionStringToAnimationSuffix(directionString: string): AnimationSuffix {
    switch (directionString) {
        case 'right': return 'e';
        case 'down-right': return 'se';
        case 'down': return 's';
        case 'down-left': return 'sw';
        case 'left': return 'w';
        case 'up-left': return 'nw';
        case 'up': return 'n';
        case 'up-right': return 'ne';
        default:
            console.warn(`Unknown direction string for suffix: ${directionString}, defaulting to 's'.`);
            return 's'; // Default to south
    }
}

/**
 * Converts a velocity vector to an 8-way direction string.
 * @param vx - The x component of the velocity.
 * @param vy - The y component of the velocity.
 * @returns The direction string, or null if vx and vy are both 0.
 */
export function velocityToDirectionString(vx: number, vy: number): DirectionString | null {
    if (vx === 0 && vy === 0) {
        return null; // Or a default like 'down' if preferred for idle
    }
    const angleDegrees = Math.atan2(vy, vx) * 180 / Math.PI;
    return angleToDirectionString(angleDegrees);
}