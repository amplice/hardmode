/**
 * LLM_NOTE: Wrapper class for individual player socket connections.
 * Handles message sending/receiving, connection state, and input queuing.
 * 
 * ARCHITECTURE_DECISION: Each connection has its own input queue to handle
 * inputs received between ticks. This prevents input loss and allows batching.
 */

import { Socket } from 'socket.io';
import { 
  ClientMessage,
  ServerMessage,
  MessageType,
  PlayerInputMessage,
  ErrorCode,
  createErrorMessage,
  NETWORK_SETTINGS,
} from '@hardmode/shared';

export class Connection {
  // Connection state
  public readonly id: string;
  public playerId: string | null = null;
  private socket: Socket;
  private connected: boolean = true;
  private disconnectTime: number = 0;
  
  // Input handling
  private inputQueue: PlayerInputMessage[] = [];
  private lastInputSequence: number = -1;
  private lastInputTime: number = 0;
  
  // Rate limiting
  private messageCount: number = 0;
  private messageCountResetTime: number = Date.now();
  private attackMessageCount: number = 0;
  private attackCountResetTime: number = Date.now();
  
  // Latency tracking
  private latencySamples: number[] = [];
  private averageLatency: number = 0;
  
  // Event handlers
  private eventHandlers: Map<string, (data: any) => void> = new Map();
  
  constructor(socket: Socket) {
    this.id = socket.id;
    this.socket = socket;
    
    // Set up base socket handlers
    this.setupSocketHandlers();
    
    // Start latency tracking
    this.startLatencyTracking();
  }
  
  /**
   * Set up core socket event handlers.
   */
  private setupSocketHandlers(): void {
    // Handle disconnect
    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      this.disconnectTime = Date.now();
      console.log(`Connection ${this.id} disconnected: ${reason}`);
      
      // Trigger disconnect handler if registered
      const handler = this.eventHandlers.get('disconnect');
      if (handler) {
        handler(reason);
      }
    });
    
    // Handle errors
    this.socket.on('error', (error) => {
      console.error(`Socket error for ${this.id}:`, error);
    });
    
    // Handle reconnection
    this.socket.on('reconnect', () => {
      this.connected = true;
      console.log(`Connection ${this.id} reconnected`);
    });
  }
  
  /**
   * Register an event handler for a specific message type.
   */
  on(event: string, handler: (data: any) => void): void {
    // Remove any existing listener for this event
    if (this.eventHandlers.has(event)) {
      this.socket.off(event);
    }
    
    // Store handler
    this.eventHandlers.set(event, handler);
    
    // Register with socket
    this.socket.on(event, (data) => {
      // Rate limiting check
      if (!this.checkRateLimit(event)) {
        this.sendError(ErrorCode.RATE_LIMIT, 'Too many messages');
        return;
      }
      
      // Call handler
      try {
        handler(data);
      } catch (error) {
        console.error(`Error handling ${event} for ${this.id}:`, error);
        this.sendError(ErrorCode.UNKNOWN, 'Internal server error');
      }
    });
  }
  
  /**
   * Send a message to the client.
   */
  send(type: MessageType, data: ServerMessage): void {
    if (!this.connected) {
      console.warn(`Trying to send to disconnected client ${this.id}`);
      return;
    }
    
    try {
      this.socket.emit(type, data);
    } catch (error) {
      console.error(`Error sending ${type} to ${this.id}:`, error);
    }
  }
  
  /**
   * Send an error message to the client.
   */
  sendError(code: ErrorCode, message: string, fatal: boolean = false): void {
    this.send(MessageType.ERROR, createErrorMessage(code, message, fatal));
    
    if (fatal) {
      setTimeout(() => this.disconnect(message), 100);
    }
  }
  
  /**
   * Queue a player input for processing.
   */
  queueInput(input: PlayerInputMessage): void {
    // Validate sequence number
    if (input.sequence <= this.lastInputSequence) {
      // Old input, ignore
      return;
    }
    
    // Check for sequence gap (possible packet loss)
    const expectedSequence = this.lastInputSequence + 1;
    if (input.sequence > expectedSequence) {
      const gap = input.sequence - expectedSequence;
      if (gap > NETWORK_SETTINGS.INPUT_SEQUENCE_WINDOW) {
        // Too big of a gap, possible desync
        this.sendError(ErrorCode.DESYNC, 'Input sequence gap too large');
        return;
      }
    }
    
    // Update tracking
    this.lastInputSequence = input.sequence;
    this.lastInputTime = Date.now();
    
    // Queue input
    this.inputQueue.push(input);
    
    // Limit queue size
    if (this.inputQueue.length > NETWORK_SETTINGS.MAX_INPUT_RATE) {
      this.inputQueue.shift(); // Remove oldest
    }
  }
  
  /**
   * Get all queued inputs and clear the queue.
   */
  getQueuedInputs(): PlayerInputMessage[] {
    const inputs = [...this.inputQueue];
    this.inputQueue = [];
    return inputs;
  }
  
  /**
   * Check rate limiting for a message type.
   */
  private checkRateLimit(event: string): boolean {
    const now = Date.now();
    
    // Reset counters if needed
    if (now - this.messageCountResetTime > 1000) {
      this.messageCount = 0;
      this.messageCountResetTime = now;
    }
    
    if (now - this.attackCountResetTime > 1000) {
      this.attackMessageCount = 0;
      this.attackCountResetTime = now;
    }
    
    // Check overall rate limit
    this.messageCount++;
    if (this.messageCount > NETWORK_SETTINGS.MAX_MESSAGES_PER_SECOND) {
      return false;
    }
    
    // Check attack-specific rate limit
    if (event === MessageType.PLAYER_ATTACK) {
      this.attackMessageCount++;
      if (this.attackMessageCount > NETWORK_SETTINGS.MAX_ATTACKS_PER_SECOND) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Start tracking latency with periodic pings.
   */
  private startLatencyTracking(): void {
    const pingInterval = setInterval(() => {
      if (!this.connected) {
        clearInterval(pingInterval);
        return;
      }
      
      const startTime = Date.now();
      this.socket.emit('ping', startTime, (responseTime: number) => {
        const latency = Date.now() - responseTime;
        this.addLatencySample(latency);
      });
    }, 5000); // Ping every 5 seconds
  }
  
  /**
   * Add a latency sample and update average.
   */
  private addLatencySample(latency: number): void {
    this.latencySamples.push(latency);
    
    // Keep only last 10 samples
    if (this.latencySamples.length > 10) {
      this.latencySamples.shift();
    }
    
    // Calculate average
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    this.averageLatency = sum / this.latencySamples.length;
  }
  
  /**
   * Send a message to the client.
   */
  send(type: string, data: any): void {
    if (!this.connected) {
      return;
    }
    this.socket.emit(type, data);
  }
  
  /**
   * Send a typed message to the client.
   */
  sendMessage(message: any): void {
    if (!this.connected) {
      return;
    }
    this.socket.emit('message', message);
  }
  
  /**
   * Send an error message to the client.
   */
  sendError(code: ErrorCode, message: string): void {
    this.sendMessage(createErrorMessage(code, message));
  }
  
  /**
   * Disconnect this connection.
   */
  disconnect(reason: string = 'Server disconnect'): void {
    this.connected = false;
    this.socket.disconnect();
  }
  
  // Getters
  
  isConnected(): boolean {
    return this.connected;
  }
  
  getDisconnectTime(): number {
    return this.disconnectTime;
  }
  
  getLatency(): number {
    return this.averageLatency;
  }
  
  getLastInputTime(): number {
    return this.lastInputTime;
  }
  
  getLastInputSequence(): number {
    return this.lastInputSequence;
  }
}