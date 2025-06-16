/**
 * LLM_NOTE: Game state and configuration type definitions.
 * These types define the overall game structure and state management.
 * 
 * ARCHITECTURE_DECISION: Game state is designed to be easily serializable
 * and reconstructible for save/load and network synchronization.
 */

import { IEntity } from './Entity.js';
import { CharacterClass, MonsterType } from '../constants/GameConfig.js';

// Complete game state interface
export interface IGameState {
  tick: number;                    // Current server tick
  timestamp: number;               // Server timestamp
  entities: Map<string, IEntity>;  // All entities in the game
  world: IWorldState;              // World state
  players: Map<string, IPlayerState>; // Player-specific state
  config: IGameConfig;             // Game configuration
}

// World state
export interface IWorldState {
  seed: number;                    // World generation seed
  width: number;                   // World width in tiles
  height: number;                  // World height in tiles
  tileSize: number;               // Pixels per tile
  tiles: ITile[][];               // 2D array of tiles
  chunks: Map<string, IChunk>;    // Loaded chunks for optimization
}

// Individual tile data
export interface ITile {
  x: number;                      // Tile X coordinate
  y: number;                      // Tile Y coordinate
  type: TileType;                 // Tile type
  variant: number;                // Visual variant
  walkable: boolean;              // Can entities walk on this
  decoration?: IDecoration;       // Optional decoration
}

export enum TileType {
  GRASS = 'grass',
  SAND = 'sand',
  WATER = 'water',
  STONE = 'stone',                // Future expansion
  DIRT = 'dirt',                  // Future expansion
}

// Decoration on tiles
export interface IDecoration {
  type: DecorationType;
  variant: number;
  blocking: boolean;              // Blocks movement
}

export enum DecorationType {
  TREE = 'tree',
  ROCK = 'rock',
  BUSH = 'bush',
  FLOWER = 'flower',
  GRASS_TUFT = 'grass_tuft',
}

// Chunk for world streaming
export interface IChunk {
  x: number;                      // Chunk X coordinate
  y: number;                      // Chunk Y coordinate
  tiles: ITile[][];              // Tiles in this chunk
  entities: Set<string>;         // Entity IDs in this chunk
  lastUpdate: number;            // Last update timestamp
}

// Player state beyond entity components
export interface IPlayerState {
  playerId: string;               // Entity ID
  connectionId: string;           // Socket connection ID
  username: string;
  characterClass: CharacterClass;
  joinTime: number;               // When player joined
  lastInputTime: number;          // Last input received
  lastInputSequence: number;      // For input reconciliation
  stats: IPlayerStats;            // Gameplay statistics
}

// Player statistics
export interface IPlayerStats {
  kills: number;
  deaths: number;
  damageDealt: number;
  damageTaken: number;
  monstersKilled: Record<MonsterType, number>;
  highestLevel: number;
  playTime: number;               // Total play time in ms
}

// Game configuration
export interface IGameConfig {
  maxPlayers: number;
  worldSeed: number;
  tickRate: number;
  networkUpdateRate: number;
  monsterSpawnRate: number;
  maxMonsters: number;
  pvpEnabled: boolean;
  friendlyFire: boolean;
  respawnTime: number;            // Time to respawn after death
}

// Input state from player
export interface IInputState {
  sequence: number;
  timestamp: number;
  keys: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  mouse: {
    x: number;                    // World coordinates
    y: number;
    leftButton: boolean;
    rightButton: boolean;
  };
  actions: {
    attack1: boolean;             // Primary attack
    attack2: boolean;             // Secondary attack
    roll: boolean;                // Roll/dash
  };
}

// Combat event data
export interface ICombatEvent {
  type: 'attack' | 'hit' | 'miss' | 'block' | 'death';
  attackerId: string;
  targetId?: string;
  damage?: number;
  position: { x: number; y: number };
  timestamp: number;
}

// Spawn configuration
export interface ISpawnConfig {
  position: { x: number; y: number };
  entityType: 'player' | 'monster';
  subType?: CharacterClass | MonsterType;
  level?: number;
  equipment?: string[];           // Future: equipment IDs
}

// Area of Interest for network optimization
export interface IAreaOfInterest {
  entityId: string;               // Center entity
  radius: number;                 // View radius
  entities: Set<string>;          // Entities within AOI
  lastUpdate: number;             // Last AOI calculation
}

// Server metrics for monitoring
export interface IServerMetrics {
  tickDuration: number[];         // Last N tick durations
  playerCount: number;
  monsterCount: number;
  projectileCount: number;
  networkBandwidth: {
    incoming: number;             // Bytes per second
    outgoing: number;
  };
  cpuUsage: number;               // Percentage
  memoryUsage: number;            // Bytes
  averageLatency: number;         // Average player latency
}

// Client performance metrics
export interface IClientMetrics {
  fps: number;                    // Current FPS
  ping: number;                   // Latency to server
  packetsLost: number;            // Lost packet count
  predictionErrors: number;       // Prediction error count
  renderTime: number;             // Time to render frame
  updateTime: number;             // Time to process updates
}

// Save game data structure
export interface ISaveGame {
  version: string;                // Save format version
  timestamp: number;              // When saved
  gameState: IGameState;          // Complete game state
  playerStates: IPlayerState[];   // All player states
}

// Match/session data
export interface IMatchData {
  matchId: string;                // Unique match identifier
  startTime: number;              // When match started
  endTime?: number;               // When match ended
  players: IPlayerState[];        // Players in match
  winner?: string;                // Winner player ID (if applicable)
  stats: IMatchStats;             // Match statistics
}

// Match statistics
export interface IMatchStats {
  totalKills: number;
  totalDeaths: number;
  mostKills: { playerId: string; kills: number };
  mostDamage: { playerId: string; damage: number };
  longestLife: { playerId: string; duration: number };
  matchDuration: number;
}

// Type guards
export function isValidTile(tile: any): tile is ITile {
  return tile && 
    typeof tile.x === 'number' &&
    typeof tile.y === 'number' &&
    Object.values(TileType).includes(tile.type);
}

export function isValidInputState(input: any): input is IInputState {
  return input &&
    typeof input.sequence === 'number' &&
    typeof input.timestamp === 'number' &&
    input.keys &&
    typeof input.keys.up === 'boolean' &&
    typeof input.keys.down === 'boolean' &&
    typeof input.keys.left === 'boolean' &&
    typeof input.keys.right === 'boolean';
}