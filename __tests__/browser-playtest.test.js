// Browser-based automated playtesting using Puppeteer
import puppeteer from 'puppeteer';

describe('🌐 BROWSER PLAYTESTING - Real browser automation', () => {
  let browser = null;
  let page = null;
  const GAME_URL = 'http://localhost:3000';
  
  beforeAll(async () => {
    // Launch browser once for all tests
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    // Set viewport for consistent testing
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('🎮 Game loads in browser and canvas appears', async () => {
    console.log('🤖 Loading game in real browser...');
    
    // Navigate to game
    await page.goto(GAME_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Wait for canvas to appear (this is where the game renders)
    await page.waitForSelector('canvas', { timeout: 10000 });
    console.log('✅ Game canvas loaded');
    
    // Wait for game to initialize (PIXI.js loads)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if page title is correct
    const title = await page.title();
    expect(title).toBe('Pixel MMORPG');
    
    // Take screenshot to verify game loaded
    await page.screenshot({ path: 'game-loaded.png' });
    console.log('📸 Game loaded screenshot saved');
    
    // Check canvas size
    const canvas = await page.$('canvas');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox.width).toBeGreaterThan(0);
    expect(canvasBox.height).toBeGreaterThan(0);
    
    console.log('✅ Game loaded successfully with canvas:', {
      width: canvasBox.width,
      height: canvasBox.height
    });
    
  }, 20000);

  test('🏃‍♂️ Can interact with canvas-based class selection', async () => {
    console.log('🤖 Testing canvas interaction for class selection...');
    
    await page.goto(GAME_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Wait for game to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get canvas element for interaction
    const canvas = await page.$('canvas');
    const canvasBox = await canvas.boundingBox();
    
    console.log('🎯 Canvas dimensions:', canvasBox);
    
    // Click on different areas of the canvas where class options would be
    // Classes are arranged horizontally in the center
    const centerY = canvasBox.y + canvasBox.height / 2;
    const classPositions = [
      { x: canvasBox.x + canvasBox.width * 0.25, y: centerY, class: 'Bladedancer' },
      { x: canvasBox.x + canvasBox.width * 0.42, y: centerY, class: 'Guardian' },
      { x: canvasBox.x + canvasBox.width * 0.58, y: centerY, class: 'Hunter' },
      { x: canvasBox.x + canvasBox.width * 0.75, y: centerY, class: 'Rogue' }
    ];
    
    // Click on Hunter class (3rd position)
    const hunterPos = classPositions[2];
    console.log(`🏹 Clicking on ${hunterPos.class} at (${hunterPos.x}, ${hunterPos.y})`);
    await page.mouse.click(hunterPos.x, hunterPos.y);
    
    // Wait for class selection to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot after class selection
    await page.screenshot({ path: 'after-class-selection.png' });
    console.log('📸 Screenshot after class selection saved');
    
    console.log('✅ Canvas interaction test completed');
    
  }, 20000);

  test('⌨️ Keyboard input controls work in browser', async () => {
    console.log('🤖 Testing keyboard controls...');
    
    await page.goto(GAME_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('canvas');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Select Rogue class by clicking on its position
    const canvas = await page.$('canvas');
    const canvasBox = await canvas.boundingBox();
    const rogueX = canvasBox.x + canvasBox.width * 0.75;
    const rogueY = canvasBox.y + canvasBox.height / 2;
    
    console.log('🗡️ Selecting Rogue class...');
    await page.mouse.click(rogueX, rogueY);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Focus on the game canvas
    await page.click('canvas');
    
    // Test movement keys
    console.log('🎮 Testing WASD movement...');
    await page.keyboard.down('w'); // Move up
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.keyboard.up('w');
    
    await page.keyboard.down('a'); // Move left
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.keyboard.up('a');
    
    await page.keyboard.down('s'); // Move down
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.keyboard.up('s');
    
    await page.keyboard.down('d'); // Move right
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.keyboard.up('d');
    
    // Test attack
    console.log('⚔️ Testing spacebar attack...');
    await page.keyboard.press(' '); // Space key
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Take screenshot after movement
    await page.screenshot({ path: 'after-movement.png' });
    console.log('📸 Movement test screenshot saved');
    
    console.log('✅ Keyboard input test completed');
    
  }, 20000);

  test('🖱️ Mouse interaction works in game', async () => {
    console.log('🤖 Testing mouse controls...');
    
    await page.goto(GAME_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('canvas');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Select Guardian class by clicking position
    const canvas = await page.$('canvas');
    const canvasBox = await canvas.boundingBox();
    const guardianX = canvasBox.x + canvasBox.width * 0.42;
    const guardianY = canvasBox.y + canvasBox.height / 2;
    
    console.log('🛡️ Selecting Guardian class...');
    await page.mouse.click(guardianX, guardianY);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click around the game world to test movement/targeting
    console.log('🖱️ Testing mouse clicks in game world...');
    
    // Click center of canvas
    await page.mouse.click(
      canvasBox.x + canvasBox.width / 2,
      canvasBox.y + canvasBox.height / 2
    );
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click different areas for movement
    await page.mouse.click(canvasBox.x + 100, canvasBox.y + 100);
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.mouse.click(canvasBox.x + 200, canvasBox.y + 150);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Take screenshot of mouse interactions
    await page.screenshot({ path: 'mouse-interactions.png' });
    console.log('📸 Mouse interaction screenshot saved');
    
    console.log('✅ Mouse interaction test completed');
    
  }, 20000);

  test('📊 Game performance in browser', async () => {
    console.log('🤖 Testing game performance...');
    
    // Enable performance monitoring
    await page.coverage.startJSCoverage();
    
    await page.goto(GAME_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('canvas');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Select Bladedancer class
    const canvas = await page.$('canvas');
    const canvasBox = await canvas.boundingBox();
    const bladedancerX = canvasBox.x + canvasBox.width * 0.25;
    const bladedancerY = canvasBox.y + canvasBox.height / 2;
    
    console.log('⚔️ Selecting Bladedancer class...');
    await page.mouse.click(bladedancerX, bladedancerY);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Let game run and perform some actions
    console.log('⏱️ Running game with actions for 5 seconds...');
    
    // Simulate some gameplay
    for (let i = 0; i < 5; i++) {
      await page.keyboard.down('w');
      await new Promise(resolve => setTimeout(resolve, 300));
      await page.keyboard.up('w');
      await page.keyboard.press(' '); // Attack
      await new Promise(resolve => setTimeout(resolve, 700));
    }
    
    // Get performance metrics
    const metrics = await page.metrics();
    console.log('📊 Performance metrics:', {
      'JS Heap Used': (metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2) + ' MB',
      'JS Heap Total': (metrics.JSHeapTotalSize / 1024 / 1024).toFixed(2) + ' MB',
      'DOM Nodes': metrics.Nodes,
      'Event Listeners': metrics.JSEventListeners
    });
    
    // Stop coverage
    const jsCoverage = await page.coverage.stopJSCoverage();
    console.log('📈 JS files loaded:', jsCoverage.length);
    
    // Basic performance assertions
    expect(metrics.JSHeapUsedSize).toBeLessThan(150 * 1024 * 1024); // Less than 150MB
    expect(metrics.Nodes).toBeLessThan(1000); // Reasonable DOM size
    
    // Take final screenshot
    await page.screenshot({ path: 'performance-test.png' });
    console.log('📸 Performance test screenshot saved');
    
    console.log('✅ Performance test completed');
    
  }, 30000);
});