// src/js/utils/DirectionUtils.js

export const EIGHT_WAY_DIRECTIONS = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];

/**
 * Converts an angle in degrees to an 8-way direction string.
 * Angle 0 is to the right.
 * @param {number} angleInDegrees - The angle in degrees (0-360).
 * @returns {string} The direction string (e.g., 'right', 'up-left').
 */
export function angleToDirectionString(angleInDegrees) {
    const normalizedAngle = ((angleInDegrees % 360) + 360) % 360; // Normalize to 0-360
    const segment = 360 / 8; // 45 degrees per segment
    const index = Math.floor((normalizedAngle + segment / 2) / segment) % 8;
    return EIGHT_WAY_DIRECTIONS[index];
}

/**
 * Converts an 8-way direction string to a radian angle.
 * Angle 0 is to the right.
 * @param {string} directionString - The direction string.
 * @returns {number} The angle in radians.
 */
export function directionStringToAngleRadians(directionString) {
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
 * @param {string} directionString - The direction string.
 * @returns {number} The angle in degrees.
 */
export function directionStringToAngleDegrees(directionString) {
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
 * @param {string} directionString - The direction string.
 * @returns {{x: number, y: number}} The normalized vector.
 */
export function directionStringToVector(directionString) {
    const angleRad = directionStringToAngleRadians(directionString);
    // Using Math.round for cleaner numbers on exact 45-degree angles, 
    // but direct cos/sin is more precise for general use.
    // For normalized vectors, direct use is better.
    let x = Math.cos(angleRad);
    let y = Math.sin(angleRad);

    // Snap to common values to avoid floating point inaccuracies for cardinal and 45-degree diagonals
    if (Math.abs(x) < 1e-9) x = 0;
    if (Math.abs(y) < 1e-9) y = 0;
    
    // For diagonals, ensure they are truly 0.707... or -0.707... if intended
    // This can be tricky without more complex logic, direct cos/sin is generally fine.
    // The values from cos/sin will be normalized already.

    return { x, y };
}

/**
 * Converts an 8-way direction string to a sprite sheet suffix (e, se, s, sw, w, nw, n, ne).
 * @param {string} directionString - The direction string (e.g., 'right', 'down', 'up-left').
 * @returns {string} The corresponding sprite sheet suffix (e.g., 'e', 's', 'nw').
 */
export function directionStringToAnimationSuffix(directionString) {
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
 * @param {number} vx - The x component of the velocity.
 * @param {number} vy - The y component of the velocity.
 * @returns {string|null} The direction string, or null if vx and vy are both 0.
 */
export function velocityToDirectionString(vx, vy) {
    if (vx === 0 && vy === 0) {
        return null; // Or a default like 'down' if preferred for idle
    }
    const angleDegrees = Math.atan2(vy, vx) * 180 / Math.PI;
    return angleToDirectionString(angleDegrees);
}
