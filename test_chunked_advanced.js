import puppeteer from 'puppeteer';

async function testChunkedRendering() {
    console.log('Starting advanced Puppeteer test for chunked rendering...');
    
    const browser = await puppeteer.launch({
        headless: false, // Show browser for visual debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 720 }
    });

    const page = await browser.newPage();
    
    // Collect console logs
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        if (text.includes('[Game]') || text.includes('[ClientWorldRenderer]') || 
            text.includes('[ChunkedWorldRenderer]') || text.includes('chunk')) {
            console.log('Game:', text);
        }
    });

    page.on('pageerror', error => {
        console.error('Page error:', error.message);
    });

    try {
        console.log('Navigating to Railway deployment...');
        await page.goto('https://hardmode-production.up.railway.app/', { waitUntil: 'networkidle0' });
        
        // Wait for game initialization
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Look for chunked rendering in console logs
        const chunkedLogs = consoleLogs.filter(log => 
            log.includes('chunked') || log.includes('Chunk')
        );
        console.log('\nChunked rendering logs found:', chunkedLogs.length);
        chunkedLogs.forEach(log => console.log(' -', log));
        
        // Take screenshot of initial state
        await page.screenshot({ path: 'test_1_loaded.png' });
        console.log('\nScreenshot saved: test_1_loaded.png');
        
        // Wait for canvas and game to be ready
        await page.waitForSelector('canvas', { timeout: 10000 });
        
        // Click to select character (center of screen for bladedancer)
        const viewport = page.viewport();
        await page.mouse.click(viewport.width / 2, viewport.height / 2);
        console.log('Clicked to select character...');
        
        // Wait for spawn
        await new Promise(resolve => setTimeout(resolve, 4000));
        await page.screenshot({ path: 'test_2_spawned.png' });
        console.log('Screenshot saved: test_2_spawned.png');
        
        // Check if game started and chunks loaded
        const gameStarted = consoleLogs.some(log => 
            log.includes('World rendering complete') || 
            log.includes('Loaded chunks')
        );
        
        if (gameStarted) {
            console.log('\nGame started successfully! Testing chunk loading...');
            
            // Move in a pattern to test chunk loading
            const movements = [
                { key: 'd', duration: 2000, desc: 'right' },
                { key: 's', duration: 2000, desc: 'down' },
                { key: 'a', duration: 2000, desc: 'left' },
                { key: 'w', duration: 2000, desc: 'up' }
            ];
            
            for (const move of movements) {
                console.log(`Moving ${move.desc}...`);
                await page.keyboard.down(move.key);
                await new Promise(resolve => setTimeout(resolve, move.duration));
                await page.keyboard.up(move.key);
            }
            
            await page.screenshot({ path: 'test_3_moved.png' });
            console.log('Screenshot saved: test_3_moved.png');
            
            // Look for chunk loading messages
            const chunkLoadMessages = consoleLogs.filter(log => 
                log.includes('Loaded chunk') || log.includes('Unloaded chunk')
            );
            console.log(`\nChunk loading messages: ${chunkLoadMessages.length}`);
            chunkLoadMessages.slice(-5).forEach(log => console.log(' -', log));
        } else {
            console.log('\nGame did not start - might still be at character selection');
        }
        
        // Final performance check
        const metrics = await page.metrics();
        console.log('\nPerformance Metrics:');
        console.log(`- JS Heap Size: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`- DOM Nodes: ${metrics.Nodes}`);
        
        // Check world size from logs
        const worldSizeLog = consoleLogs.find(log => log.includes('World size:'));
        if (worldSizeLog) {
            console.log(`- ${worldSizeLog}`);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'test_error.png' });
    }
    
    console.log('\nTest completed. Check screenshots to verify rendering.');
    await browser.close();
}

testChunkedRendering().catch(console.error);