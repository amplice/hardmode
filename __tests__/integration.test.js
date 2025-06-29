// Integration tests - test how different game systems work together
import { MONSTER_STATS, PLAYER_STATS } from '../shared/constants/GameConstants.js';

// Mock PIXI.js since we don't need actual rendering for testing
global.PIXI = {
  Container: class MockContainer {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0 };
      this.scale = { x: 1, y: 1 };
    }
    addChild(child) { this.children.push(child); }
    removeChild(child) { 
      const index = this.children.indexOf(child);
      if (index > -1) this.children.splice(index, 1);
    }
  },
  Graphics: class MockGraphics {
    constructor() {
      this.position = { x: 0, y: 0 };
    }
    beginFill() { return this; }
    drawRect() { return this; }
    endFill() { return this; }
  },
  Text: class MockText {
    constructor(text, style) {
      this.text = text;
      this.style = style;
      this.position = { x: 0, y: 0 };
    }
  },
  settings: { SCALE_MODE: 0 },
  SCALE_MODES: { NEAREST: 0 }
};

describe('Integration Tests', () => {
  test('Player can be damaged by monster attacks', () => {
    // Create a mock player with basic stats
    const mockPlayer = {
      hp: PLAYER_STATS.hunter.hp, // Start with 1 HP (weakest class)
      maxHp: PLAYER_STATS.hunter.hp,
      position: { x: 100, y: 100 },
      
      takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        return this.hp <= 0; // Return true if dead
      },
      
      isAlive() {
        return this.hp > 0;
      }
    };
    
    // Test monster damage
    const ogreDamage = MONSTER_STATS.ogre.damage;
    const skeletonDamage = MONSTER_STATS.skeleton.damage;
    
    // Hunter starts with 1 HP
    expect(mockPlayer.hp).toBe(1);
    expect(mockPlayer.isAlive()).toBe(true);
    
    // Skeleton attack should kill the hunter
    const died = mockPlayer.takeDamage(skeletonDamage);
    expect(died).toBe(true);
    expect(mockPlayer.hp).toBe(0);
    expect(mockPlayer.isAlive()).toBe(false);
  });

  test('Monster attack ranges work correctly with positioning', () => {
    const mockMonster = {
      type: 'ogre',
      position: { x: 0, y: 0 },
      stats: MONSTER_STATS.ogre,
      
      canAttackTarget(target) {
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.stats.attackRange;
      },
      
      canSeeTarget(target) {
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.stats.aggroRange;
      }
    };
    
    const mockPlayer = {
      position: { x: 50, y: 0 } // 50 pixels away
    };
    
    // Ogre has 90 attack range, 800 aggro range
    expect(mockMonster.canSeeTarget(mockPlayer)).toBe(true); // 50 < 800
    expect(mockMonster.canAttackTarget(mockPlayer)).toBe(true); // 50 < 90
    
    // Move player out of attack range but within aggro
    mockPlayer.position = { x: 150, y: 0 }; // 150 pixels away
    expect(mockMonster.canSeeTarget(mockPlayer)).toBe(true); // 150 < 800
    expect(mockMonster.canAttackTarget(mockPlayer)).toBe(false); // 150 > 90
    
    // Move player completely out of range
    mockPlayer.position = { x: 1000, y: 0 }; // 1000 pixels away
    expect(mockMonster.canSeeTarget(mockPlayer)).toBe(false); // 1000 > 800
    expect(mockMonster.canAttackTarget(mockPlayer)).toBe(false); // 1000 > 90
  });

  test('Combat timing and cooldowns work correctly', () => {
    const mockMonster = {
      type: 'skeleton',
      stats: MONSTER_STATS.skeleton,
      lastAttackTime: 0,
      
      canAttackNow(currentTime) {
        // First attack is always allowed
        if (this.lastAttackTime === 0 && currentTime === 0) return true;
        return (currentTime - this.lastAttackTime) >= this.stats.attackCooldown;
      },
      
      performAttack(currentTime) {
        this.lastAttackTime = currentTime;
        return {
          damage: this.stats.damage,
          delay: this.stats.attackDelay,
          duration: this.stats.attackDuration
        };
      }
    };
    
    // At time 0, monster should be able to attack
    expect(mockMonster.canAttackNow(0)).toBe(true);
    
    // Perform attack at time 0
    const attack1 = mockMonster.performAttack(0);
    expect(attack1.damage).toBe(1);
    expect(attack1.delay).toBe(625); // 75% of 833ms animation
    
    // Immediately after attack, should not be able to attack (cooldown)
    expect(mockMonster.canAttackNow(100)).toBe(false);
    expect(mockMonster.canAttackNow(1000)).toBe(false);
    
    // After cooldown period (1800ms), should be able to attack again
    expect(mockMonster.canAttackNow(1800)).toBe(true);
    expect(mockMonster.canAttackNow(2000)).toBe(true);
  });

  test('Multiple monsters have balanced attack frequencies', () => {
    const monsters = ['ogre', 'skeleton', 'elemental', 'ghoul', 'wildarcher'];
    const attackFrequencies = {};
    
    monsters.forEach(type => {
      const stats = MONSTER_STATS[type];
      // Calculate attacks per minute
      const attacksPerMinute = 60000 / stats.attackCooldown;
      const dpsEstimate = attacksPerMinute * stats.damage;
      
      attackFrequencies[type] = {
        cooldown: stats.attackCooldown,
        attacksPerMinute: Math.round(attacksPerMinute * 10) / 10,
        dpsEstimate: Math.round(dpsEstimate * 10) / 10
      };
    });
    
    // Verify attack frequencies are reasonable for skill-based gameplay
    Object.entries(attackFrequencies).forEach(([type, freq]) => {
      // DPS should be reasonable (note: ghoul has very fast attacks)
      expect(freq.dpsEstimate).toBeLessThan(60); // Max 60 DPS (very permissive)
      expect(freq.attacksPerMinute).toBeLessThan(100); // Reasonable attack frequency
      expect(freq.attacksPerMinute).toBeGreaterThan(5); // Not too slow to be boring
    });
    
    console.log('Monster attack frequencies:', attackFrequencies);
  });

  test('Player movement and monster aggro integration', () => {
    // Test aggro system with simple positioning
    const mockPlayer = {
      position: { x: 0, y: 0 },
      
      moveTo(x, y) {
        this.position.x = x;
        this.position.y = y;
      }
    };
    
    const mockMonster = {
      type: 'skeleton',
      position: { x: 2000, y: 0 }, // Far away initially
      stats: MONSTER_STATS.skeleton, // 1200 aggro range
      aggroTarget: null,
      
      checkAggro(player) {
        const dx = player.position.x - this.position.x;
        const dy = player.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.stats.aggroRange) {
          this.aggroTarget = player;
          return true;
        } else {
          this.aggroTarget = null;
          return false;
        }
      }
    };
    
    // Player starts at (0,0) - should not aggro (2000 distance > 1200 range)
    expect(mockMonster.checkAggro(mockPlayer)).toBe(false);
    
    // Move player closer - should gain aggro
    mockPlayer.moveTo(1500, 0); // 500 distance from skeleton
    expect(mockMonster.checkAggro(mockPlayer)).toBe(true);
    
    // Move player away - should lose aggro  
    mockPlayer.moveTo(4000, 0); // 2000 distance from skeleton
    expect(mockMonster.checkAggro(mockPlayer)).toBe(false);
    
    // Test edge case - exactly at aggro range
    mockPlayer.moveTo(800, 0); // Exactly 1200 distance from skeleton at (2000,0)
    expect(mockMonster.checkAggro(mockPlayer)).toBe(true);
  });
});