/**
 * LLM_NOTE: Main client entry point.
 * Initializes PIXI.js and establishes Socket.io connection.
 */

import { Application } from 'pixi.js';
import { NetworkManager } from './network/NetworkManager';
import { GameClient } from './core/GameClient';
import { registerComponents } from './ecs/components';
import { debugLog } from '@hardmode/shared';

async function main() {
  console.log('🎮 Starting Hardmode Client...');
  
  // Make debugLog available in console
  (window as any).debugLog = debugLog;
  console.log('Debug logger available as window.debugLog');
  
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
  
  // Add copy logs button handler
  const copyLogsBtn = document.getElementById('copy-logs-btn');
  if (copyLogsBtn) {
    copyLogsBtn.addEventListener('click', async () => {
      console.log('Copy logs button clicked');
      const success = await debugLog.copyLogsToClipboard(500);
      if (success) {
        copyLogsBtn.textContent = 'Copied!';
        copyLogsBtn.style.background = '#2196F3';
        setTimeout(() => {
          copyLogsBtn.textContent = 'Copy Logs';
          copyLogsBtn.style.background = '#4CAF50';
        }, 2000);
      }
    });
  }
  
  // Add debug keyboard shortcuts
  window.addEventListener('keydown', async (e) => {
    // Ctrl+Shift+L to copy logs
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault(); // Prevent default browser behavior
      console.log('Attempting to copy logs...');
      
      const success = await debugLog.copyLogsToClipboard(500);
      if (success) {
        console.log('📋 Debug logs copied to clipboard!');
        
        // Show visual feedback
        const notification = document.createElement('div');
        notification.textContent = '📋 Logs copied to clipboard!';
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #4CAF50;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          font-family: monospace;
          z-index: 10000;
          animation: fadeIn 0.3s ease-in;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 3000);
      } else {
        console.error('Failed to copy logs to clipboard');
      }
    }
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