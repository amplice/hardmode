/**
 * LLM_NOTE: Core entity type definitions shared between client and server.
 * These interfaces define the structure of all game entities and their components.
 *
 * ARCHITECTURE_DECISION: Using an Entity Component System (ECS) architecture
 * for flexibility and network efficiency. Components can be serialized individually.
 */
// Entity types in the game
export var EntityType;
(function (EntityType) {
    EntityType["PLAYER"] = "player";
    EntityType["MONSTER"] = "monster";
    EntityType["PROJECTILE"] = "projectile";
    EntityType["EFFECT"] = "effect";
    EntityType["ITEM"] = "item";
})(EntityType || (EntityType = {}));
// Component types for the ECS
export var ComponentType;
(function (ComponentType) {
    ComponentType["POSITION"] = "position";
    ComponentType["VELOCITY"] = "velocity";
    ComponentType["HEALTH"] = "health";
    ComponentType["COMBAT"] = "combat";
    ComponentType["PLAYER"] = "player";
    ComponentType["MONSTER"] = "monster";
    ComponentType["AI"] = "ai";
    ComponentType["SPRITE"] = "sprite";
    ComponentType["ANIMATION"] = "animation";
    ComponentType["COLLISION"] = "collision";
    ComponentType["NETWORK"] = "network";
    ComponentType["PROJECTILE"] = "projectile";
    ComponentType["EFFECT"] = "effect";
    ComponentType["LEVEL"] = "level";
})(ComponentType || (ComponentType = {}));
// AI states for monsters
export var AIState;
(function (AIState) {
    AIState["IDLE"] = "idle";
    AIState["PURSUING"] = "pursuing";
    AIState["ATTACKING"] = "attacking";
    AIState["STUNNED"] = "stunned";
    AIState["DYING"] = "dying";
    AIState["RETURNING"] = "returning";
})(AIState || (AIState = {}));
// Collision layers for different entity types
export var CollisionLayer;
(function (CollisionLayer) {
    CollisionLayer[CollisionLayer["PLAYER"] = 1] = "PLAYER";
    CollisionLayer[CollisionLayer["MONSTER"] = 2] = "MONSTER";
    CollisionLayer[CollisionLayer["PROJECTILE"] = 4] = "PROJECTILE";
    CollisionLayer[CollisionLayer["WALL"] = 8] = "WALL";
    CollisionLayer[CollisionLayer["TRIGGER"] = 16] = "TRIGGER";
})(CollisionLayer || (CollisionLayer = {}));
// Type guard functions for runtime type checking
export function isPlayer(entity) {
    return entity.type === EntityType.PLAYER;
}
export function isMonster(entity) {
    return entity.type === EntityType.MONSTER;
}
export function isProjectile(entity) {
    return entity.type === EntityType.PROJECTILE;
}
export function hasComponent(entity, componentType) {
    return entity.components.has(componentType);
}
//# sourceMappingURL=Entity.js.map