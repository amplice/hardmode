import { io, Socket } from 'socket.io-client';
import { EventEmitter } from '../utils/EventEmitter';

export interface PlayerData {
  id: string;
  username: string;
  x?: number;
  y?: number;
}

export interface ConnectionConfig {
  username: string;
  serverUrl?: string;
}

export class NetworkManager extends EventEmitter {
  public socket: Socket | null = null;
  private connected: boolean = false;
  private playerId: string | null = null;
  private username: string | null = null;
  private players: Map<string, PlayerData> = new Map();
  private latency: number = 0;
  private lastPingTime: number = 0;

  connect(config: ConnectionConfig): void {
    if (this.socket) {
      this.disconnect();
    }

    const serverUrl = config.serverUrl || 'http://localhost:3000';
    
    this.socket = io(serverUrl, {
      auth: {
        username: config.username,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      withCredentials: false, // Firefox compatibility
      autoConnect: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.connected = true;
      this.startPingInterval();
      this.emit('connect');
    });

    this.socket.on('connected', (data: {
      playerId: string;
      username: string;
      serverConfig: any;
      worldConfig: any;
      position: { x: number; y: number };
    }) => {
      this.playerId = data.playerId;
      this.username = data.username;
      console.log(`Connected as ${data.username} (${data.playerId})`);
      this.emit('connected', data);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from server:', reason);
      this.connected = false;
      this.stopPingInterval();
      this.emit('disconnect', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error.message);
      this.emit('error', error);
    });
    
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      this.emit('reconnect');
    });
    
    this.socket.on('reconnect_error', (error: Error) => {
      console.error('Reconnection error:', error.message);
    });

    // Player events
    this.socket.on('playerJoined', (player: PlayerData) => {
      console.log(`Player joined: ${player.username}`);
      this.players.set(player.id, player);
      this.emit('playerJoined', player);
    });

    this.socket.on('playerLeft', (data: { playerId: string; username: string }) => {
      console.log(`Player left: ${data.username}`);
      this.players.delete(data.playerId);
      this.emit('playerLeft', data);
    });

    this.socket.on('playerList', (players: PlayerData[]) => {
      this.players.clear();
      players.forEach(player => {
        if (player.id !== this.playerId) {
          this.players.set(player.id, player);
        }
      });
      this.emit('playerList', players);
    });

    // Game events (to be implemented)
    this.socket.on('playerUpdate', (data: any) => {
      // Update player position/state
      this.emit('playerUpdate', data);
    });

    // Chat events
    this.socket.on('chat', (data: {
      playerId: string;
      username: string;
      message: string;
      timestamp: number;
    }) => {
      this.emit('chat', data);
    });

    // Ping/pong for latency
    this.socket.on('pong', (timestamp: number) => {
      this.latency = Date.now() - timestamp;
      this.emit('latencyUpdate', this.latency);
    });
  }

  disconnect(): void {
    this.stopPingInterval();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.playerId = null;
    this.username = null;
    this.players.clear();
  }

  // Send methods
  sendInput(input: any): void {
    if (this.connected && this.socket) {
      this.socket.emit('input', input);
    }
  }

  sendChat(message: string): void {
    if (this.connected && this.socket) {
      this.socket.emit('chat', message);
    }
  }

  // Getters
  isConnected(): boolean {
    return this.connected;
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  getUsername(): string | null {
    return this.username;
  }

  getPlayers(): Map<string, PlayerData> {
    return new Map(this.players);
  }

  getLatency(): number {
    return this.latency;
  }

  // Ping interval
  private pingInterval: NodeJS.Timeout | null = null;

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket && this.connected) {
        this.lastPingTime = Date.now();
        this.socket.emit('ping', this.lastPingTime);
      }
    }, 1000); // Ping every second
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Singleton instance
export const networkManager = new NetworkManager();