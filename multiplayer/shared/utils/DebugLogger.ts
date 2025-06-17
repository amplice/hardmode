/**
 * Debug logger that captures logs in a circular buffer for easy retrieval
 */

export class DebugLogger {
  private static instance: DebugLogger;
  private logs: Array<{ timestamp: number; level: string; message: string; context?: any }> = [];
  private maxLogs = 1000;
  private isEnabled = true;
  
  private constructor() {}
  
  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }
  
  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: any): void {
    if (!this.isEnabled) return;
    
    const entry = {
      timestamp: Date.now(),
      level,
      message,
      context
    };
    
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Also log to console
    const prefix = `[${new Date(entry.timestamp).toISOString()}] [${level.toUpperCase()}]`;
    if (context) {
      console.log(`${prefix} ${message}`, context);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
  
  info(message: string, context?: any): void {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }
  
  error(message: string, context?: any): void {
    this.log('error', message, context);
  }
  
  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }
  
  /**
   * Get recent logs as formatted string
   */
  getRecentLogs(count: number = 100): string {
    const recent = this.logs.slice(-count);
    return recent.map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      return `[${time}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`;
    }).join('\n');
  }
  
  /**
   * Save logs to clipboard (browser only)
   */
  async copyLogsToClipboard(count: number = 200): Promise<boolean> {
    try {
      // Use globalThis which works in both Node and browser
      const g = globalThis as any;
      
      if (!g.navigator || !g.navigator.clipboard) {
        console.error('Clipboard API not available');
        return false;
      }
      
      const logs = this.getRecentLogs(count);
      await g.navigator.clipboard.writeText(logs);
      console.log('Logs copied to clipboard!');
      return true;
    } catch (err) {
      console.error('Failed to copy logs:', err);
      return false;
    }
  }
  
  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }
  
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Export singleton instance
export const debugLog = DebugLogger.getInstance();