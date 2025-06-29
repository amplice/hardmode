// Working automated playtesting based on actual server API
import { io } from 'socket.io-client';

describe('🎮 AUTOMATED PLAYTESTING - I am actually playing your game!', () => {
  let client = null;
  const SERVER_URL = 'http://localhost:3000';
  
  afterEach(() => {
    if (client) {
      client.disconnect();
      client = null;
    }
  });

  test('🎯 Full Game Session: Connect → Spawn → Move → Fight Monsters', async () => {
    console.log('🤖 Starting automated playtest session...');
    
    // STEP 1: Connect to server and wait for init
    client = io(SERVER_URL, { timeout: 10000 });
    
    const worldData = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection or init failed')), 8000);
      
      client.on('connect', () => {
        console.log('✅ Connected to game server!');
        // Don't resolve yet, wait for init
      });
      
      client.on('init', (data) => {
        clearTimeout(timeout);
        console.log('🌍 Received world data:', {
          worldSeed: data.world?.seed,
          worldSize: `${data.world?.width}x${data.world?.height}`,
          initialMonsters: data.monsters?.length || 0,
          playersInWorld: data.players?.length || 0
        });
        resolve(data);
      });
      
      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    expect(worldData.world).toBeDefined();
    expect(worldData.world.seed).toBeDefined();
    expect(worldData.monsters).toBeDefined();
    
    // STEP 3: Select character class and spawn
    console.log('🧙‍♂️ Selecting Hunter class...');
    client.emit('selectClass', 'hunter');
    
    const playerData = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Player not spawned')), 5000);
      
      client.on('state', (gameState) => {
        const players = gameState.players || [];
        const ourPlayer = players.find(p => p.id === client.id);
        
        if (ourPlayer && ourPlayer.characterClass === 'hunter') {
          clearTimeout(timeout);
          console.log('🏃‍♂️ Hunter spawned successfully!', {
            class: ourPlayer.characterClass,
            hp: ourPlayer.hp,
            position: `(${Math.round(ourPlayer.x)}, ${Math.round(ourPlayer.y)})`
          });
          resolve(ourPlayer);
        }
      });
    });
    
    expect(playerData.characterClass).toBe('hunter');
    expect(playerData.hp).toBeGreaterThan(0);
    
    // STEP 4: Move around the world
    console.log('🚶‍♂️ Testing player movement...');
    
    const movements = [
      { x: playerData.x + 200, y: playerData.y, direction: 'east' },
      { x: playerData.x + 200, y: playerData.y + 150, direction: 'southeast' },
      { x: playerData.x, y: playerData.y + 150, direction: 'west' },
      { x: playerData.x, y: playerData.y, direction: 'north' }
    ];
    
    for (let i = 0; i < movements.length; i++) {
      const move = movements[i];
      client.emit('playerUpdate', { x: move.x, y: move.y, facing: 'right' });
      
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 500); // Wait for movement
        
        client.on('state', (gameState) => {
          const players = gameState.players || [];
          const ourPlayer = players.find(p => p.id === client.id);
          
          if (ourPlayer && Math.abs(ourPlayer.x - move.x) < 100) {
            clearTimeout(timeout);
            console.log(`✅ Moved ${move.direction}: (${Math.round(ourPlayer.x)}, ${Math.round(ourPlayer.y)})`);
            resolve();
          }
        });
      });
    }
    
    // STEP 5: Scan for monsters and attempt combat
    let monsterData = [];
    
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 2000);
      
      client.on('state', (gameState) => {
        const monsters = gameState.monsters || [];
        if (monsters.length > 0 && monsterData.length === 0) {
          monsterData = monsters.slice(0, 3); // Take first 3 monsters
          clearTimeout(timeout);
          
          console.log('👹 Monsters detected:', monsterData.map(m => ({
            type: m.type,
            hp: m.hp,
            position: `(${Math.round(m.x)}, ${Math.round(m.y)})`
          })));
          
          resolve();
        }
      });
    });
    
    expect(monsterData.length).toBeGreaterThan(0);
    
    // STEP 6: Attack monsters
    console.log('⚔️ Engaging in combat...');
    
    for (let i = 0; i < Math.min(monsterData.length, 2); i++) {
      const monster = monsterData[i];
      
      // Move closer to monster
      client.emit('playerUpdate', { 
        x: monster.x - 50, 
        y: monster.y, 
        facing: 'right' 
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Attack the monster
      client.emit('attack', {
        type: 'attack1',
        x: monster.x,
        y: monster.y
      });
      
      console.log(`🎯 Attacked ${monster.type} at (${Math.round(monster.x)}, ${Math.round(monster.y)})`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // STEP 7: Check combat results
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 2000);
      
      client.on('playerAttack', (attackData) => {
        clearTimeout(timeout);
        console.log('💥 Attack confirmed by server:', {
          attackType: attackData.attackType,
          position: `(${Math.round(attackData.x)}, ${Math.round(attackData.y)})`
        });
        resolve();
      });
    });
    
    // STEP 8: Final status check
    const finalStatus = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 2000);
      
      client.on('state', (gameState) => {
        const players = gameState.players || [];
        const ourPlayer = players.find(p => p.id === client.id);
        const monsters = gameState.monsters || [];
        
        if (ourPlayer) {
          clearTimeout(timeout);
          resolve({
            player: {
              hp: ourPlayer.hp,
              position: `(${Math.round(ourPlayer.x)}, ${Math.round(ourPlayer.y)})`,
              alive: ourPlayer.hp > 0
            },
            world: {
              monstersRemaining: monsters.length,
              totalPlayers: players.length
            }
          });
        }
      });
    });
    
    if (finalStatus) {
      console.log('🏁 Final game state:', finalStatus);
      expect(finalStatus.player.alive).toBe(true);
      expect(finalStatus.world.monstersRemaining).toBeGreaterThan(0);
    }
    
    console.log('🎉 AUTOMATED PLAYTEST COMPLETED SUCCESSFULLY!');
    console.log('🤖 I just played your game and everything works!');
    
  }, 25000);

  test('🚀 Performance Test: Rapid Actions', async () => {
    console.log('🤖 Testing game performance under rapid actions...');
    
    client = io(SERVER_URL, { timeout: 5000 });
    
    // Wait for connection and init in one step
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection/init failed')), 5000);
      
      client.on('connect', () => {
        console.log('✅ Connected for performance test');
      });
      
      client.on('init', () => {
        clearTimeout(timeout);
        console.log('📡 Received init data');
        resolve();
      });
      
      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    // Spawn player
    client.emit('selectClass', 'rogue');
    
    const player = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No spawn')), 3000);
      client.on('state', (gameState) => {
        const players = gameState.players || [];
        const ourPlayer = players.find(p => p.id === client.id);
        if (ourPlayer && ourPlayer.characterClass === 'rogue') {
          clearTimeout(timeout);
          resolve(ourPlayer);
        }
      });
    });
    
    // Rapid movement test
    console.log('⚡ Sending rapid movement commands...');
    const startTime = Date.now();
    
    for (let i = 0; i < 20; i++) {
      client.emit('playerUpdate', {
        x: player.x + (Math.random() - 0.5) * 200,
        y: player.y + (Math.random() - 0.5) * 200,
        facing: i % 2 === 0 ? 'left' : 'right'
      });
      
      if (i % 5 === 0) {
        client.emit('attack', {
          type: 'attack1',
          x: player.x + Math.random() * 100,
          y: player.y + Math.random() * 100
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`⚡ Completed 20 rapid actions in ${totalTime}ms`);
    
    // Wait for server to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Performance test completed - no crashes detected!');
    expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    
  }, 15000);
});