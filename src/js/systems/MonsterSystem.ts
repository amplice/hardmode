/**
 * @fileoverview MonsterSystem - Client-side monster management system
 * 
 * MIGRATION NOTES:
 * - Converted from MonsterSystem.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for monster management
 * - Preserved all spawning and update logic
 * 
 * ARCHITECTURE ROLE:
 * - Manages client-side monster entity lifecycle (spawn, update, cleanup)
 * - Handles test monster spawning for development/debugging
 * - Integrates with world collision system for valid spawn positions
 * - Manages monster container hierarchy for rendering
 * 
 * NOTE: This appears to be a legacy single-player system
 * In multiplayer, monsters are spawned/managed by server MonsterManager
 * This system may be used for single-player mode or local testing
 * 
 * SPAWNING SYSTEM:
 * - Respects minimum/maximum distance from player
 * - Validates spawn positions against world collision
 * - Uses weighted distribution for monster type selection
 * - Supports test spawns for development
 */

import * as PIXI from 'pixi.js';
import { Monster } from '../entities/monsters/Monster.js';
// Import from JS version since TS version is incomplete
import { MONSTER_CONFIG } from '../config/GameConfig.js';

// Type assertions for MONSTER_CONFIG from JS
interface MonsterConfigType {
    spawn: {
        timer: number;
        maxMonsters: number;
        minDistanceFromPlayer: number;
        maxDistanceFromPlayer: number;
        distribution: Record<string, number>;
    };
    testSpawns: Array<{
        type: string;
        count: number;
        offsetX: number;
        offsetY: number;
    }>;
    [key: string]: any;
}

const monsterConfig = MONSTER_CONFIG as unknown as MonsterConfigType;

// Type definitions
interface WorldInterface {
    width: number;
    height: number;
    tileSize: number;
    isTileWalkable(x: number, y: number): boolean;
}

interface PlayerInterface {
    position: {
        x: number;
        y: number;
    };
}

interface SpawnData {
    type: string;
    count: number;
    offsetX: number;
    offsetY: number;
}

// Use existing global declaration from other files

export class MonsterSystem {
    private world: WorldInterface;
    private monsters: Monster[];
    private spawnTimer: number;
    private spawnRate: number;
    private maxMonsters: number;
    private enableTestSpawns: boolean;

    constructor(world: WorldInterface) {
        this.world = world;
        this.monsters = [];
        this.spawnTimer = 0;
        this.spawnRate = monsterConfig.spawn.timer;
        this.maxMonsters = monsterConfig.spawn.maxMonsters;
        
        // Test spawning flag - set to true to enable test spawns on startup
        this.enableTestSpawns = true;
        
        // Perform test spawns if enabled
        if (this.enableTestSpawns) {
            this.spawnTestMonsters();
        }
    }
    
    update(deltaTime: number, player: PlayerInterface): void {
        // Update existing monsters
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            
            // Only update live monsters
            if (monster.alive) {
                monster.update(deltaTime);
            }
            
            // Remove completely faded out dead monsters
            if (!monster.alive && monster.sprite.alpha <= 0) {
                this.monsters.splice(i, 1);
            }
        }
        
        // Spawn new monsters
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnRate && this.monsters.length < this.maxMonsters) {
            this.spawnRandomMonster(player);
            this.spawnTimer = 0;
        }
    }
    
    private spawnRandomMonster(player: PlayerInterface): void {
        // Don't spawn too close to the player
        const minDistance = monsterConfig.spawn.minDistanceFromPlayer;
        const maxDistance = monsterConfig.spawn.maxDistanceFromPlayer;
        
        // Find a valid spawn position
        let spawnX: number, spawnY: number, distanceToPlayer: number;
        let validSpawn = false;
        let attempts = 0;
        
        while (!validSpawn && attempts < 20) {
            // Random position within world bounds
            spawnX = Math.random() * this.world.width * this.world.tileSize;
            spawnY = Math.random() * this.world.height * this.world.tileSize;
            
            // Check distance to player
            const dx = spawnX - player.position.x;
            const dy = spawnY - player.position.y;
            distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // Check if position is walkable
            const isWalkable = this.world.isTileWalkable(spawnX, spawnY);
            
            if (distanceToPlayer >= minDistance && 
                distanceToPlayer <= maxDistance &&
                isWalkable) {
                validSpawn = true;
            }
            
            attempts++;
        }
        
        if (validSpawn) {
            // Choose monster type with weighted probabilities
            const roll = Math.random();
            let monsterType: string = 'skeleton';
            let totalProbability = 0;
            
            const distribution = monsterConfig.spawn.distribution;
            for (const [type, probability] of Object.entries(distribution)) {
                totalProbability += probability;
                if (roll < totalProbability) {
                    monsterType = type;
                    break;
                }
            }
            
            // Create and add monster
            const monster = new Monster({
                id: `monster_${Date.now()}_${Math.random()}`,
                x: spawnX!,
                y: spawnY!,
                type: monsterType as any
            });
            
            this.monsters.push(monster);
            window.game.entityContainer.addChild(monster.sprite);
        }
    }

    private spawnTestMonsters(): void {
        console.log("Spawning test monsters...");
        
        // Get the center of the map for reference
        const centerX = this.world.width / 2 * this.world.tileSize;
        const centerY = this.world.height / 2 * this.world.tileSize;
        
        // Spawn each monster type based on config
        for (const spawnData of monsterConfig.testSpawns) {
            for (let i = 0; i < spawnData.count; i++) {
                // Create a small random offset for each monster
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetY = (Math.random() - 0.5) * 100;
                
                // Create monster
                const monster = new Monster({
                    id: `test_${spawnData.type}_${i}`,
                    x: centerX + spawnData.offsetX + offsetX,
                    y: centerY + spawnData.offsetY + offsetY,
                    type: spawnData.type as any
                });
                
                this.monsters.push(monster);
                window.game.entityContainer.addChild(monster.sprite);
            }
        }
        
        console.log(`Spawned ${this.monsters.length} test monsters`);
    }
}