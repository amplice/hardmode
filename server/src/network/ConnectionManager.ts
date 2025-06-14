import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface PlayerConnection {
  id: string;
  socket: Socket;
  username: string;
  connectedAt: number;
  lastActivity: number;
}

export interface PlayerInfo {
  id: string;
  username: string;
}

export class ConnectionManager {
  private connections: Map<string, PlayerConnection> = new Map();
  private usernameToId: Map<string, string> = new Map();

  addConnection(socket: Socket, username: string): string {
    const playerId = uuidv4();
    
    const connection: PlayerConnection = {
      id: playerId,
      socket,
      username,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.connections.set(playerId, connection);
    this.usernameToId.set(username.toLowerCase(), playerId);

    return playerId;
  }

  removeConnection(playerId: string): void {
    const connection = this.connections.get(playerId);
    if (connection) {
      this.usernameToId.delete(connection.username.toLowerCase());
      this.connections.delete(playerId);
    }
  }

  getConnection(playerId: string): PlayerConnection | undefined {
    return this.connections.get(playerId);
  }

  getConnectionByUsername(username: string): PlayerConnection | undefined {
    const playerId = this.usernameToId.get(username.toLowerCase());
    return playerId ? this.connections.get(playerId) : undefined;
  }

  isUsernameTaken(username: string): boolean {
    return this.usernameToId.has(username.toLowerCase());
  }

  updateActivity(playerId: string): void {
    const connection = this.connections.get(playerId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  getPlayerList(): PlayerInfo[] {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      username: conn.username,
    }));
  }

  getStats() {
    return {
      totalConnections: this.connections.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        username: conn.username,
        connectedFor: Date.now() - conn.connectedAt,
        lastActivityAgo: Date.now() - conn.lastActivity,
      })),
    };
  }

  broadcast(event: string, data: any, excludePlayerId?: string): void {
    this.connections.forEach((connection) => {
      if (connection.id !== excludePlayerId) {
        connection.socket.emit(event, data);
      }
    });
  }

  sendToPlayer(playerId: string, event: string, data: any): boolean {
    const connection = this.connections.get(playerId);
    if (connection) {
      connection.socket.emit(event, data);
      return true;
    }
    return false;
  }

  // Clean up inactive connections (called periodically)
  cleanupInactive(maxInactivityMs: number = 5 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    this.connections.forEach((connection, playerId) => {
      if (now - connection.lastActivity > maxInactivityMs) {
        logger.warn(`Removing inactive player: ${connection.username} (${playerId})`);
        connection.socket.disconnect(true);
        this.removeConnection(playerId);
        cleaned++;
      }
    });

    return cleaned;
  }
}