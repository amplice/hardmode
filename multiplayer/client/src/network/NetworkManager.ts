/**
 * LLM_NOTE: Client-side network manager that handles Socket.io connection.
 * Manages all communication with the server.
 */

import { io, Socket } from 'socket.io-client';
import { 
  ClientMessage,
  ServerMessage,
  MessageType,
  ConnectionState
} from '@hardmode/shared';

export class NetworkManager {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private connectionId: string | null = null;
  private serverTime: number = 0;
  private serverTimeDelta: number = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private currentPing: number = 0;
  
  // Event handlers
  private onConnected: (() => void) | null = null;
  private onDisconnected: (() => void) | null = null;
  private onServerMessage: ((message: ServerMessage) => void) | null = null;
  
  constructor() {
    // Initialize
  }
  
  /**
   * Connect to the game server.
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Create socket connection
        this.socket = io({
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Wait for connection
        this.socket.on('connect', () => {
          this.connectionState = ConnectionState.CONNECTED;
          this.connectionId = this.socket?.id || null;
          this.updateConnectionStatus(true);
          
          // Start ping interval
          this.startPingInterval();
          
          if (this.onConnected) {
            this.onConnected();
          }
          
          resolve(true);
        });
        
        // Handle connection timeout
        setTimeout(() => {
          if (this.connectionState !== ConnectionState.CONNECTED) {
            resolve(false);
          }
        }, 5000);
        
      } catch (error) {
        console.error('Failed to connect:', error);
        resolve(false);
      }
    });
  }
  
  /**
   * Setup socket event handlers.
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('disconnect', () => {
      this.connectionState = ConnectionState.DISCONNECTED;
      this.updateConnectionStatus(false);
      this.stopPingInterval();
      
      if (this.onDisconnected) {
        this.onDisconnected();
      }
    });
    
    // Server messages
    this.socket.on('message', (data: ServerMessage) => {
      this.handleServerMessage(data);
    });
    
    // Ping/pong for latency measurement
    this.socket.on('pong', (serverTime: number) => {
      const now = Date.now();
      this.currentPing = now - this.lastPingTime;
      this.serverTime = serverTime;
      this.serverTimeDelta = serverTime - now;
    });
  }
  
  private lastPingTime: number = 0;
  
  /**
   * Start ping interval.
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket && this.connectionState === ConnectionState.CONNECTED) {
        this.lastPingTime = Date.now();
        this.socket.emit('ping');
      }
    }, 1000); // Ping every second
  }
  
  /**
   * Stop ping interval.
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Handle server message.
   */
  private handleServerMessage(message: ServerMessage): void {
    // Process system messages
    switch (message.type) {
      case MessageType.CONNECTION_ACCEPTED:
        console.log('Connection accepted by server');
        break;
        
      case MessageType.CONNECTION_REJECTED:
        console.error('Connection rejected:', message);
        break;
        
      case MessageType.ERROR:
        console.error('Server error:', message);
        break;
    }
    
    // Forward to handler
    if (this.onServerMessage) {
      this.onServerMessage(message);
    }
  }
  
  /**
   * Send a message to the server.
   */
  sendMessage(message: ClientMessage): void {
    if (!this.socket || this.connectionState !== ConnectionState.CONNECTED) {
      console.warn('Cannot send message: not connected');
      return;
    }
    
    this.socket.emit('message', message);
  }
  
  /**
   * Update connection status UI.
   */
  private updateConnectionStatus(connected: boolean): void {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.textContent = connected ? 'Connected' : 'Disconnected';
      statusElement.className = connected ? 'connected' : 'disconnected';
    }
  }
  
  /**
   * Disconnect from server.
   */
  disconnect(): void {
    this.stopPingInterval();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionState = ConnectionState.DISCONNECTED;
    this.connectionId = null;
  }
  
  // Getters
  
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }
  
  getConnectionId(): string | null {
    return this.connectionId;
  }
  
  getPing(): number {
    return this.currentPing;
  }
  
  getServerTime(): number {
    return Date.now() + this.serverTimeDelta;
  }
  
  // Event registration
  
  setOnConnected(handler: () => void): void {
    this.onConnected = handler;
  }
  
  setOnDisconnected(handler: () => void): void {
    this.onDisconnected = handler;
  }
  
  setOnServerMessage(handler: (message: ServerMessage) => void): void {
    this.onServerMessage = handler;
  }
}