/**
 * LLM_NOTE: Game state and configuration type definitions.
 * These types define the overall game structure and state management.
 *
 * ARCHITECTURE_DECISION: Game state is designed to be easily serializable
 * and reconstructible for save/load and network synchronization.
 */
export var TileType;
(function (TileType) {
    TileType["GRASS"] = "grass";
    TileType["SAND"] = "sand";
    TileType["WATER"] = "water";
    TileType["STONE"] = "stone";
    TileType["DIRT"] = "dirt";
})(TileType || (TileType = {}));
export var DecorationType;
(function (DecorationType) {
    DecorationType["TREE"] = "tree";
    DecorationType["ROCK"] = "rock";
    DecorationType["BUSH"] = "bush";
    DecorationType["FLOWER"] = "flower";
    DecorationType["GRASS_TUFT"] = "grass_tuft";
})(DecorationType || (DecorationType = {}));
// Type guards
export function isValidTile(tile) {
    return tile &&
        typeof tile.x === 'number' &&
        typeof tile.y === 'number' &&
        Object.values(TileType).includes(tile.type);
}
export function isValidInputState(input) {
    return input &&
        typeof input.sequence === 'number' &&
        typeof input.timestamp === 'number' &&
        input.keys &&
        typeof input.keys.up === 'boolean' &&
        typeof input.keys.down === 'boolean' &&
        typeof input.keys.left === 'boolean' &&
        typeof input.keys.right === 'boolean';
}
//# sourceMappingURL=Game.js.map