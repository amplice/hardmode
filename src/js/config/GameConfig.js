export const MONSTER_CONFIG = {
    // Base stats for each monster type
    stats: {
      ogre: {
        hitPoints: 4,
        moveSpeed: 2,
        attackRange: 90,
        collisionRadius: 35,
        aggroRange: 250
      },
      skeleton: {
        hitPoints: 2,
        moveSpeed: 2.5,
        attackRange: 70,
        collisionRadius: 15,
        aggroRange: 250
      },
      elemental: {
        hitPoints: 3,
        moveSpeed: 2,
        attackRange: 100,
        collisionRadius: 15,
        aggroRange: 250
      },
      ghoul: {
        hitPoints: 2,
        moveSpeed: 3.5,
        attackRange: 70,
        collisionRadius: 10,
        aggroRange: 1000
      }
    },
  
    // Attack patterns for each monster type
    attacks: {
      ogre: {
        windup: 0.5,
        duration: 0.2,
        recovery: 0.8,
        cooldown: 1.5,
        pattern: 'cone',
        color: 0x885500,
        damage: 1
      },
      skeleton: {
        windup: 0.3,
        duration: 0.2,
        recovery: 0.6,
        cooldown: .7,
        pattern: 'cone',
        color: 0xEEEEEE,
        damage: 1
      },
      elemental: {
        windup: 0.4,
        duration: 0.3,
        recovery: 0.5,
        cooldown: 2.5,
        pattern: 'circle',
        color: 0x42C0FB,
        damage: 1
      },
      ghoul: {
        windup: 0.2,
        duration: 0.2,
        recovery: 0.3,
        cooldown: 0.4,
        pattern: 'cone',
        color: 0x7CFC00,
        damage: 1
      }
    },
  
    // Spawn system configuration
    spawn: {
      timer: 5, // New monster every 5 seconds
      maxMonsters: 10,
      minDistanceFromPlayer: 400,
      maxDistanceFromPlayer: 800,
      distribution: {
        skeleton: 0.25,
        elemental: 0.25,
        ghoul: 0.25,
        ogre: 0.25
      }
    },
  
    // Test spawn configuration
    testSpawns: [
      { type: 'skeleton', count: 0, offsetX: -200, offsetY: -200 },
      { type: 'elemental', count: 1, offsetX: 200, offsetY: -200 },
      { type: 'ogre', count: 0, offsetX: -200, offsetY: 200 },
      { type: 'ghoul', count: 0, offsetX: 200, offsetY: 200 }
    ]
  };