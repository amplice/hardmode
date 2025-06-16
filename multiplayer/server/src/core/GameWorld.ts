/**
 * LLM_NOTE: Game world management class that handles all entities, systems, and world state.
 * This is the authoritative source of truth for the game state on the server.
 * 
 * ARCHITECTURE_DECISION: The GameWorld uses an ECS architecture and manages
 * all game entities and systems. It's responsible for world generation and physics.
 */

import { 
  Entity,
  EntityType,
  System,
  SystemGroup,
  SystemPriority,
  WORLD_CONFIG,
  WORLD_BOUNDS,
  ComponentType,
  CHARACTER_CLASSES,
} from '@hardmode/shared';
import { WorldGenerator } from '../world/WorldGenerator';
import { ChunkManager } from '../world/ChunkManager';
import { SpatialHash } from '../world/SpatialHash';

// Import server-side systems
import { MovementSystem } from '../ecs/systems/MovementSystem';
import { CombatSystem } from '../ecs/systems/CombatSystem';
import { AISystem } from '../ecs/systems/AISystem';
import { PhysicsSystem } from '../ecs/systems/PhysicsSystem';
import { NetworkSystem } from '../ecs/systems/NetworkSystem';
import { MonsterSpawnSystem } from '../ecs/systems/MonsterSpawnSystem';
import { ProgressionSystem } from '../ecs/systems/ProgressionSystem';

// Import server-side components
import { PositionComponent } from '../ecs/components/PositionComponent';
import { VelocityComponent } from '../ecs/components/VelocityComponent';
import { HealthComponent } from '../ecs/components/HealthComponent';
import { PlayerComponent } from '../ecs/components/PlayerComponent';
import { CombatComponent } from '../ecs/components/CombatComponent';
import { LevelComponent } from '../ecs/components/LevelComponent';
import { NetworkComponent } from '../ecs/components/NetworkComponent';

export class GameWorld {
  // World configuration
  private readonly seed: number;
  private worldGenerator: WorldGenerator;
  private chunkManager: ChunkManager;
  
  // Entity management
  private entities: Map<string, Entity> = new Map();
  private entityIdCounter: number = 0;
  private spatialHash: SpatialHash;
  
  // System management
  private systems: System[] = [];
  private systemGroups: Map<string, SystemGroup> = new Map();
  
  // World state
  private isInitialized: boolean = false;
  private worldTime: number = 0;
  
  constructor(seed: number) {
    this.seed = seed;
    this.worldGenerator = new WorldGenerator(seed);
    this.chunkManager = new ChunkManager(this.worldGenerator);
    this.spatialHash = new SpatialHash();
    
    // Initialize systems
    this.initializeSystems();
  }
  
  /**
   * Initialize the game world.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    console.log(`🌍 Generating world with seed: ${this.seed}`);
    
    // Generate initial world chunks
    await this.worldGenerator.initialize();
    
    // Load spawn area chunks
    const spawnChunkX = Math.floor(WORLD_BOUNDS.SPAWN_X / WORLD_CONFIG.tileSize / 16);
    const spawnChunkY = Math.floor(WORLD_BOUNDS.SPAWN_Y / WORLD_CONFIG.tileSize / 16);
    
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        this.chunkManager.loadChunk(spawnChunkX + dx, spawnChunkY + dy);
      }
    }
    
    // Initialize all systems
    for (const system of this.systems) {
      system.initialize();
    }
    
    this.isInitialized = true;
    console.log('✅ World initialized');
  }
  
  /**
   * Initialize all game systems.
   */
  private initializeSystems(): void {
    // Create system groups
    const coreGroup = new SystemGroup('core');
    const gameplayGroup = new SystemGroup('gameplay');
    const networkGroup = new SystemGroup('network');
    
    // Core systems (run first)
    const physicsSystem = new PhysicsSystem(this);
    const movementSystem = new MovementSystem(this);
    coreGroup.addSystem(physicsSystem);
    coreGroup.addSystem(movementSystem);
    
    // Gameplay systems
    const combatSystem = new CombatSystem(this);
    const aiSystem = new AISystem(this);
    const monsterSpawnSystem = new MonsterSpawnSystem(this);
    const progressionSystem = new ProgressionSystem(this);
    gameplayGroup.addSystem(combatSystem);
    gameplayGroup.addSystem(aiSystem);
    gameplayGroup.addSystem(monsterSpawnSystem);
    gameplayGroup.addSystem(progressionSystem);
    
    // Network systems (run last)
    const networkSystem = new NetworkSystem(this);
    networkGroup.addSystem(networkSystem);
    
    // Store system groups
    this.systemGroups.set('core', coreGroup);
    this.systemGroups.set('gameplay', gameplayGroup);
    this.systemGroups.set('network', networkGroup);
    
    // Flatten systems for update loop
    this.systems = [
      ...coreGroup.getSystems(),
      ...gameplayGroup.getSystems(),
      ...networkGroup.getSystems(),
    ];
  }
  
  /**
   * Update the game world for one tick.
   */
  update(deltaTime: number): void {
    if (!this.isInitialized) {
      return;
    }
    
    // Update world time
    this.worldTime += deltaTime;
    
    // Update spatial hash
    this.updateSpatialHash();
    
    // Convert entities map to array for systems
    const entityArray = Array.from(this.entities.values());
    
    // Update all systems
    for (const system of this.systems) {
      if (system.isEnabled()) {
        system.execute(entityArray, deltaTime);
      }
    }
    
    // Clean up destroyed entities
    this.cleanupDestroyedEntities();
  }
  
  /**
   * Update spatial hash with current entity positions.
   */
  private updateSpatialHash(): void {
    this.spatialHash.clear();
    
    for (const entity of this.entities.values()) {
      const position = entity.getComponent<PositionComponent>(ComponentType.POSITION);
      if (position) {
        this.spatialHash.insert(entity, position.x, position.y);
      }
    }
  }
  
  /**
   * Clean up entities marked for destruction.
   */
  private cleanupDestroyedEntities(): void {
    const toRemove: string[] = [];
    
    for (const [id, entity] of this.entities) {
      if (entity.hasTag('destroyed')) {
        toRemove.push(id);
      }
    }
    
    for (const id of toRemove) {
      this.removeEntity(id);
    }
  }
  
  /**
   * Create a new player entity.
   */
  createPlayer(username: string, characterClass: string, connectionId: string): Entity | null {
    try {
      const entity = new Entity(EntityType.PLAYER);
      
      // Add required components
      entity.addComponent(new PositionComponent(WORLD_BOUNDS.SPAWN_X, WORLD_BOUNDS.SPAWN_Y));
      entity.addComponent(new VelocityComponent());
      entity.addComponent(new HealthComponent(CHARACTER_CLASSES[characterClass]));
      entity.addComponent(new PlayerComponent(username, characterClass, connectionId));
      entity.addComponent(new CombatComponent());
      entity.addComponent(new LevelComponent());
      entity.addComponent(new NetworkComponent(connectionId));
      
      // Add to world
      this.addEntity(entity);
      
      console.log(`Created player entity: ${entity.id} for ${username}`);
      return entity;
    } catch (error) {
      console.error('Failed to create player entity:', error);
      return null;
    }
  }
  
  /**
   * Add an entity to the world.
   */
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    
    // Add to spatial hash if it has position
    const position = entity.getComponent<PositionComponent>(ComponentType.POSITION);
    if (position) {
      this.spatialHash.insert(entity, position.x, position.y);
    }
  }
  
  /**
   * Remove an entity from the world.
   */
  removeEntity(entityId: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return false;
    }
    
    // Remove from spatial hash
    const position = entity.getComponent<PositionComponent>(ComponentType.POSITION);
    if (position) {
      this.spatialHash.remove(entity, position.x, position.y);
    }
    
    // Remove from entities map
    this.entities.delete(entityId);
    
    return true;
  }
  
  /**
   * Get an entity by ID.
   */
  getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }
  
  /**
   * Get all entities.
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }
  
  /**
   * Get entities within a radius of a position.
   */
  getEntitiesInRadius(x: number, y: number, radius: number): Entity[] {
    return this.spatialHash.getEntitiesInRadius(x, y, radius);
  }
  
  /**
   * Get entities with specific components.
   */
  getEntitiesWithComponents(...componentTypes: ComponentType[]): Entity[] {
    const result: Entity[] = [];
    
    for (const entity of this.entities.values()) {
      if (entity.hasComponents(...componentTypes)) {
        result.push(entity);
      }
    }
    
    return result;
  }
  
  /**
   * Check if a position is valid (walkable).
   */
  isValidPosition(x: number, y: number): boolean {
    // Check world bounds
    if (x < WORLD_BOUNDS.MIN_X || x > WORLD_BOUNDS.MAX_X ||
        y < WORLD_BOUNDS.MIN_Y || y > WORLD_BOUNDS.MAX_Y) {
      return false;
    }
    
    // Check tile walkability
    const tileX = Math.floor(x / WORLD_CONFIG.tileSize);
    const tileY = Math.floor(y / WORLD_CONFIG.tileSize);
    
    return this.worldGenerator.isWalkable(tileX, tileY);
  }
  
  /**
   * Get tile at world position.
   */
  getTileAt(worldX: number, worldY: number) {
    const tileX = Math.floor(worldX / WORLD_CONFIG.tileSize);
    const tileY = Math.floor(worldY / WORLD_CONFIG.tileSize);
    
    return this.worldGenerator.getTile(tileX, tileY);
  }
  
  // Getters for systems to access world state
  
  getSeed(): number {
    return this.seed;
  }
  
  getWorldTime(): number {
    return this.worldTime;
  }
  
  getEntityCount(): number {
    return this.entities.size;
  }
  
  getPlayerCount(): number {
    return this.getEntitiesWithComponents(ComponentType.PLAYER).length;
  }
  
  getMonsterCount(): number {
    return this.getEntitiesWithComponents(ComponentType.MONSTER).length;
  }
}