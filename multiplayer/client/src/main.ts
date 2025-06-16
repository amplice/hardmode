/**
 * LLM_NOTE: Main client entry point.
 * Initializes PIXI.js and establishes Socket.io connection.
 */

import { Application } from 'pixi.js';
import { NetworkManager } from './network/NetworkManager';
import { GameClient } from './core/GameClient';
import { registerComponents } from './ecs/components';

async function main() {
  console.log('🎮 Starting Hardmode Client...');
  
  // Register all components
  registerComponents();
  
  // Create PIXI application
  const app = new Application();
  
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a1a,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  
  // Add canvas to DOM
  const container = document.getElementById('game-container');
  if (container) {
    container.appendChild(app.canvas);
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
  });
  
  // Create network manager
  const networkManager = new NetworkManager();
  
  // Create game client
  const gameClient = new GameClient(app, networkManager);
  
  // Connect to server
  const connected = await networkManager.connect();
  
  if (connected) {
    console.log('✅ Connected to server');
    
    // Remove loading screen
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
    
    // Start game client
    await gameClient.start();
  } else {
    console.error('❌ Failed to connect to server');
  }
}

// Start the application
main().catch((error) => {
  console.error('❌ Failed to start client:', error);
});