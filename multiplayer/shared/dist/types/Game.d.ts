/**
 * LLM_NOTE: Game state and configuration type definitions.
 * These types define the overall game structure and state management.
 *
 * ARCHITECTURE_DECISION: Game state is designed to be easily serializable
 * and reconstructible for save/load and network synchronization.
 */
import { IEntity } from './Entity.js';
import { CharacterClass, MonsterType } from '../constants/GameConfig.js';
export interface IGameState {
    tick: number;
    timestamp: number;
    entities: Map<string, IEntity>;
    world: IWorldState;
    players: Map<string, IPlayerState>;
    config: IGameConfig;
}
export interface IWorldState {
    seed: number;
    width: number;
    height: number;
    tileSize: number;
    tiles: ITile[][];
    chunks: Map<string, IChunk>;
}
export interface ITile {
    x: number;
    y: number;
    type: TileType;
    variant: number;
    walkable: boolean;
    decoration?: IDecoration;
}
export declare enum TileType {
    GRASS = "grass",
    SAND = "sand",
    WATER = "water",
    STONE = "stone",// Future expansion
    DIRT = "dirt"
}
export interface IDecoration {
    type: DecorationType;
    variant: number;
    blocking: boolean;
}
export declare enum DecorationType {
    TREE = "tree",
    ROCK = "rock",
    BUSH = "bush",
    FLOWER = "flower",
    GRASS_TUFT = "grass_tuft"
}
export interface IChunk {
    x: number;
    y: number;
    tiles: ITile[][];
    entities: Set<string>;
    lastUpdate: number;
}
export interface IPlayerState {
    playerId: string;
    connectionId: string;
    username: string;
    characterClass: CharacterClass;
    joinTime: number;
    lastInputTime: number;
    lastInputSequence: number;
    stats: IPlayerStats;
}
export interface IPlayerStats {
    kills: number;
    deaths: number;
    damageDealt: number;
    damageTaken: number;
    monstersKilled: Record<MonsterType, number>;
    highestLevel: number;
    playTime: number;
}
export interface IGameConfig {
    maxPlayers: number;
    worldSeed: number;
    tickRate: number;
    networkUpdateRate: number;
    monsterSpawnRate: number;
    maxMonsters: number;
    pvpEnabled: boolean;
    friendlyFire: boolean;
    respawnTime: number;
}
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
        x: number;
        y: number;
        leftButton: boolean;
        rightButton: boolean;
    };
    actions: {
        attack1: boolean;
        attack2: boolean;
        roll: boolean;
    };
}
export interface ICombatEvent {
    type: 'attack' | 'hit' | 'miss' | 'block' | 'death';
    attackerId: string;
    targetId?: string;
    damage?: number;
    position: {
        x: number;
        y: number;
    };
    timestamp: number;
}
export interface ISpawnConfig {
    position: {
        x: number;
        y: number;
    };
    entityType: 'player' | 'monster';
    subType?: CharacterClass | MonsterType;
    level?: number;
    equipment?: string[];
}
export interface IAreaOfInterest {
    entityId: string;
    radius: number;
    entities: Set<string>;
    lastUpdate: number;
}
export interface IServerMetrics {
    tickDuration: number[];
    playerCount: number;
    monsterCount: number;
    projectileCount: number;
    networkBandwidth: {
        incoming: number;
        outgoing: number;
    };
    cpuUsage: number;
    memoryUsage: number;
    averageLatency: number;
}
export interface IClientMetrics {
    fps: number;
    ping: number;
    packetsLost: number;
    predictionErrors: number;
    renderTime: number;
    updateTime: number;
}
export interface ISaveGame {
    version: string;
    timestamp: number;
    gameState: IGameState;
    playerStates: IPlayerState[];
}
export interface IMatchData {
    matchId: string;
    startTime: number;
    endTime?: number;
    players: IPlayerState[];
    winner?: string;
    stats: IMatchStats;
}
export interface IMatchStats {
    totalKills: number;
    totalDeaths: number;
    mostKills: {
        playerId: string;
        kills: number;
    };
    mostDamage: {
        playerId: string;
        damage: number;
    };
    longestLife: {
        playerId: string;
        duration: number;
    };
    matchDuration: number;
}
export declare function isValidTile(tile: any): tile is ITile;
export declare function isValidInputState(input: any): input is IInputState;
//# sourceMappingURL=Game.d.ts.map