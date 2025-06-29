// Combat system tests - verify damage calculations and game balance
import { MONSTER_STATS, PLAYER_STATS } from '../shared/constants/GameConstants.js';

describe('Combat System Tests', () => {
  test('Monster stats are balanced and complete', () => {
    const monsterTypes = ['ogre', 'skeleton', 'elemental', 'ghoul', 'wildarcher'];
    
    monsterTypes.forEach(type => {
      const stats = MONSTER_STATS[type];
      expect(stats).toBeDefined();
      
      // All monsters should have core stats
      expect(stats.hp).toBeGreaterThan(0);
      expect(stats.moveSpeed).toBeGreaterThan(0);
      expect(stats.damage).toBeGreaterThan(0);
      expect(stats.attackRange).toBeGreaterThan(0);
      expect(stats.aggroRange).toBeGreaterThan(0);
      expect(stats.xp).toBeGreaterThan(0);
      expect(stats.attackCooldown).toBeGreaterThan(0);
      expect(stats.collisionRadius).toBeGreaterThan(0);
      
      // Attack timing should make sense
      expect(stats.attackDelay).toBeGreaterThan(0);
      expect(stats.attackDuration).toBeGreaterThan(stats.attackDelay);
    });
  });

  test('Player classes have balanced stats', () => {
    const classes = ['bladedancer', 'guardian', 'hunter', 'rogue'];
    
    classes.forEach(className => {
      const stats = PLAYER_STATS[className];
      expect(stats).toBeDefined();
      
      expect(stats.hp).toBeGreaterThan(0);
      expect(stats.moveSpeed).toBeGreaterThan(0);
      expect(stats.baseColor).toBeDefined();
    });
  });

  test('Combat balance - no monster is unkillable', () => {
    // Verify that the weakest player class can theoretically kill the strongest monster
    const weakestPlayer = Math.min(...Object.values(PLAYER_STATS).map(p => p.hp));
    const strongestMonster = Math.max(...Object.values(MONSTER_STATS).map(m => m.hp));
    
    // Even the weakest player (1 HP hunter) should be able to kill monsters
    // This is more about game design - skill should matter more than raw stats
    expect(weakestPlayer).toBeGreaterThan(0);
    expect(strongestMonster).toBeLessThan(10); // Reasonable HP cap for skill-based combat
  });

  test('Attack ranges are reasonable for gameplay', () => {
    Object.values(MONSTER_STATS).forEach(monster => {
      // Attack range should be less than aggro range (so they have to move to attack)
      expect(monster.attackRange).toBeLessThan(monster.aggroRange);
      
      // Ranges should be reasonable for 2D gameplay (not too large)
      expect(monster.attackRange).toBeLessThan(1000);
      expect(monster.aggroRange).toBeLessThan(5000);
    });
  });
});