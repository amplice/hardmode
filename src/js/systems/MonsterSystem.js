// src/js/systems/MonsterSystem.js
import { Monster } from '../entities/monsters/Monster.js';
import { MONSTER_CONFIG } from '../config/GameConfig.js';

export class MonsterSystem {
    constructor(world) {
        this.world = world;
        this.monsters = [];
        this.spawnTimer = 0;
        this.spawnRate = MONSTER_CONFIG.spawn.timer;
        this.maxMonsters = MONSTER_CONFIG.spawn.maxMonsters;
        
        // Test spawning flag - set to true to enable test spawns on startup
        this.enableTestSpawns = false; // Disabled for multiplayer testing
        
        // Perform test spawns if enabled
        if (this.enableTestSpawns) {
            this.spawnTestMonsters();
        }
    }
    
    update(deltaTime, player) {
        // Update existing monsters
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            
            // Only update live monsters
            if (monster.alive) {
                monster.update(deltaTime, player, this.world);
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
    
    spawnRandomMonster(player) {
        // Don't spawn too close to the player
        const minDistance = MONSTER_CONFIG.spawn.minDistanceFromPlayer;
        const maxDistance = MONSTER_CONFIG.spawn.maxDistanceFromPlayer;
        
        // Find a valid spawn position
        let spawnX, spawnY, distanceToPlayer;
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
            let monsterType;
            let totalProbability = 0;
            
            const distribution = MONSTER_CONFIG.spawn.distribution;
            for (const [type, probability] of Object.entries(distribution)) {
                totalProbability += probability;
                if (roll < totalProbability) {
                    monsterType = type;
                    break;
                }
            }
            
            // Create and add monster
            const monster = new Monster({
                x: spawnX,
                y: spawnY,
                type: monsterType
            });
            
            this.monsters.push(monster);
            window.game.entityContainer.addChild(monster.sprite);
        }
    }

    spawnTestMonsters() {
        console.log("Spawning test monsters...");
        
        // Get the center of the map for reference
        const centerX = this.world.width / 2 * this.world.tileSize;
        const centerY = this.world.height / 2 * this.world.tileSize;
        
        // Spawn each monster type based on config
        for (const spawnData of MONSTER_CONFIG.testSpawns) {
            for (let i = 0; i < spawnData.count; i++) {
                // Create a small random offset for each monster
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetY = (Math.random() - 0.5) * 100;
                
                // Create monster
                const monster = new Monster({
                    x: centerX + spawnData.offsetX + offsetX,
                    y: centerY + spawnData.offsetY + offsetY,
                    type: spawnData.type
                });
                
                this.monsters.push(monster);
                window.game.entityContainer.addChild(monster.sprite);
            }
        }
        
        console.log(`Spawned ${this.monsters.length} test monsters`);
    }
}