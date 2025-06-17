/**
 * LLM_NOTE: Main server entry point.
 * Creates and starts the game server.
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { GameServer } from './core/GameServer';
import { config } from 'dotenv';

// Load environment variables
config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const TICK_RATE = parseInt(process.env.TICK_RATE || '60', 10);

async function main() {
  console.log('🎮 Starting Hardmode Multiplayer Server...');
  
  // Create HTTP server
  const httpServer = createServer();
  
  // Create Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });
  
  // Create game server
  const gameServer = new GameServer({
    io,
    maxPlayers: 100,
    worldSeed: Date.now(),
    tickRate: TICK_RATE,
  });
  
  try {
    await gameServer.start();
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} at ${TICK_RATE} Hz`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      await gameServer.stop();
      httpServer.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down server...');
      await gameServer.stop();
      httpServer.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});