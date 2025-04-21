import { Monster } from '../entities/monsters/Monster.js';

export class MonsterSystem {
    constructor(world) {
        this.world = world;
        this.monsters = [];
        this.spawnTimer = 0;
        this.spawnRate = 5; // New monster every 5 seconds
        this.maxMonsters = 10; // Maximum number of monsters at once
    }
    
    update(deltaTime, player) {
        // Update existing monsters
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            monster.update(deltaTime, player, this.world);
            
            // Remove dead monsters that have faded out
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
            // Choose a monster type based on distance from world center
            const worldCenterX = this.world.width * this.world.tileSize / 2;
            const worldCenterY = this.world.height * this.world.tileSize / 2;
            const dx = spawnX - worldCenterX;
            const dy = spawnY - worldCenterY;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            const normalizedDistance = distanceFromCenter / (this.world.width * this.world.tileSize / 2);
            
            let monsterType;
            if (normalizedDistance < 0.3) {
                monsterType = 'slime'; // Easy monsters near center
            } else if (normalizedDistance < 0.7) {
                monsterType = Math.random() < 0.7 ? 'slime' : 'goblin';
            } else {
                monsterType = Math.random() < 0.5 ? 'goblin' : 'skeleton';
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
}