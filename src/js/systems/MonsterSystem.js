// src/js/systems/MonsterSystem.js
import { Monster } from '../entities/monsters/Monster.js';

export class MonsterSystem {
    constructor(world) {
        this.world = world;
        this.monsters = [];
        this.spawnTimer = 0;
        this.spawnRate = 5; // New monster every 5 seconds
        this.maxMonsters = 10; // Maximum number of monsters at once
        
        // Test spawning flag - set to true to enable test spawns on startup
        this.enableTestSpawns = true; // <-- Set this to false to disable
        
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
        const minDistanceFromPlayer = 400;
        const maxDistanceFromPlayer = 800;
        
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
            
            if (distanceToPlayer >= minDistanceFromPlayer && 
                distanceToPlayer <= maxDistanceFromPlayer &&
                isWalkable) {
                validSpawn = true;
            }
            
            attempts++;
        }
        
        if (validSpawn) {
            // Choose monster type with weighted probabilities
            const roll = Math.random();
            let monsterType;
            
            if (roll < 0.25) {
                monsterType = 'skeleton'; // 25% chance of skeleton
            } else if (roll < 0.25) {
                monsterType = 'elemental'; // 25% chance of elemental
            } else if (roll < 0.25) {
                monsterType = 'ghoul'; // 25% chance of ghoul
            } else {
                monsterType = 'ogre'; // 25% chance of ogre
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

     // Add this method for test spawning
     spawnTestMonsters() {
        console.log("Spawning test monsters...");
        
        // Get the center of the map for reference
        const centerX = this.world.width / 2 * this.world.tileSize;
        const centerY = this.world.height / 2 * this.world.tileSize;
        
        // Spawn each monster type
        const testSpawns = [
            { type: 'skeleton', count: 3, x: centerX - 200, y: centerY - 200 },
            { type: 'elemental', count: 3, x: centerX + 200, y: centerY - 200 },
            { type: 'ogre', count: 3, x: centerX - 200, y: centerY + 200 },
            { type: 'ghoul', count: 3, x: centerX + 200, y: centerY + 200 }
        ];
        
        for (const spawn of testSpawns) {
            for (let i = 0; i < spawn.count; i++) {
                // Create a small random offset for each monster
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetY = (Math.random() - 0.5) * 100;
                
                // Create monster
                const monster = new Monster({
                    x: spawn.x + offsetX,
                    y: spawn.y + offsetY,
                    type: spawn.type
                });
                
                this.monsters.push(monster);
                window.game.entityContainer.addChild(monster.sprite);
            }
        }
        
        console.log(`Spawned ${this.monsters.length} test monsters`);
    }
}