/**
 * LLM_NOTE: Player-specific type definitions.
 * These types extend the base entity types with player-specific functionality.
 *
 * EXACT_BEHAVIOR: All player mechanics match the original single-player game.
 */
import { EntityType, ComponentType } from './Entity.js';
// Type guards and helpers
export function isPlayerEntity(entity) {
    return entity.type === EntityType.PLAYER &&
        entity.components.has(ComponentType.PLAYER) &&
        entity.components.has(ComponentType.POSITION) &&
        entity.components.has(ComponentType.HEALTH);
}
export function getPlayerLevel(experience) {
    // Calculate level from experience using the game formula
    let level = 1;
    let totalXpNeeded = 0;
    while (level < 10) {
        const xpForNextLevel = level * 20;
        if (experience < totalXpNeeded + xpForNextLevel) {
            break;
        }
        totalXpNeeded += xpForNextLevel;
        level++;
    }
    return level;
}
export function getExperienceForLevel(level) {
    // Total XP needed to reach a level
    return (level - 1) * level / 2 * 20;
}
export function getExperienceToNextLevel(currentLevel) {
    // XP needed for next level specifically
    return currentLevel * 20;
}
//# sourceMappingURL=Player.js.map