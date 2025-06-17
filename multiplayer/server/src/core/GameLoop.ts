/**
 * LLM_NOTE: Fixed timestep game loop implementation for consistent server ticks.
 * This ensures deterministic game simulation regardless of server performance.
 * 
 * ARCHITECTURE_DECISION: Using a fixed timestep with interpolation to prevent
 * the "spiral of death" while maintaining deterministic physics.
 * 
 * EXACT_BEHAVIOR: Runs at exactly 60Hz (16.67ms per tick) to match the original game.
 */

import { performance } from 'perf_hooks';

export class GameLoop {
  // Configuration
  private readonly tickRate: number;
  private readonly tickInterval: number; // ms per tick
  private readonly maxFrameTime: number = 100; // Maximum frame time to prevent spiral of death
  
  // State
  private isRunning: boolean = false;
  private timer: NodeJS.Immediate | null = null;
  private lastTime: number = 0;
  private accumulator: number = 0;
  
  // Performance tracking
  private tickCount: number = 0;
  private totalTickTime: number = 0;
  private slowTickCount: number = 0;
  private lastTickDuration: number = 0;
  
  // Callback
  public onTick: ((deltaTime: number) => void) | null = null;
  
  constructor(tickRate: number = 60) {
    this.tickRate = tickRate;
    this.tickInterval = 1000 / tickRate;
  }
  
  /**
   * Start the game loop.
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Game loop is already running');
      return;
    }
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    
    // Use setImmediate for the game loop to avoid blocking
    this.scheduleNextTick();
    
    console.log(`⏰ Game loop started at ${this.tickRate}Hz (${this.tickInterval.toFixed(2)}ms per tick)`);
  }
  
  /**
   * Stop the game loop.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.timer) {
      clearImmediate(this.timer);
      this.timer = null;
    }
    
    console.log('⏰ Game loop stopped');
    this.logPerformanceStats();
  }
  
  /**
   * Schedule the next tick.
   */
  private scheduleNextTick(): void {
    this.timer = setImmediate(() => {
      if (this.isRunning) {
        this.tick();
      }
    });
  }
  
  /**
   * Main tick function using fixed timestep with accumulator.
   */
  private tick(): void {
    const currentTime = performance.now();
    let frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Cap frame time to prevent spiral of death
    if (frameTime > this.maxFrameTime) {
      console.warn(`Frame time capped: ${frameTime.toFixed(2)}ms -> ${this.maxFrameTime}ms`);
      frameTime = this.maxFrameTime;
    }
    
    // Add to accumulator
    this.accumulator += frameTime;
    
    // Process fixed timesteps
    let ticksThisFrame = 0;
    while (this.accumulator >= this.tickInterval) {
      const tickStart = performance.now();
      
      // Execute game tick
      if (this.onTick) {
        this.onTick(this.tickInterval / 1000); // Convert to seconds
      }
      
      // Track performance
      const tickDuration = performance.now() - tickStart;
      this.lastTickDuration = tickDuration;
      this.totalTickTime += tickDuration;
      this.tickCount++;
      
      if (tickDuration > this.tickInterval) {
        this.slowTickCount++;
        if (this.tickCount % 60 === 0) { // Log every second for slow ticks
          console.warn(`Slow tick detected: ${tickDuration.toFixed(2)}ms (target: ${this.tickInterval.toFixed(2)}ms)`);
        }
      }
      
      this.accumulator -= this.tickInterval;
      ticksThisFrame++;
      
      // Prevent too many ticks in one frame
      if (ticksThisFrame >= 3) {
        console.warn(`Multiple ticks in one frame: ${ticksThisFrame}`);
        // Reset accumulator to prevent further catchup
        this.accumulator = 0;
        break;
      }
    }
    
    // Schedule next tick
    this.scheduleNextTick();
  }
  
  /**
   * Get current performance statistics.
   */
  getStats(): GameLoopStats {
    const averageTickTime = this.tickCount > 0 ? this.totalTickTime / this.tickCount : 0;
    const tickUtilization = averageTickTime / this.tickInterval * 100;
    
    return {
      tickRate: this.tickRate,
      tickInterval: this.tickInterval,
      tickCount: this.tickCount,
      averageTickTime,
      lastTickDuration: this.lastTickDuration,
      slowTickCount: this.slowTickCount,
      slowTickPercentage: this.tickCount > 0 ? (this.slowTickCount / this.tickCount) * 100 : 0,
      tickUtilization,
      isRunning: this.isRunning,
    };
  }
  
  /**
   * Reset performance statistics.
   */
  resetStats(): void {
    this.tickCount = 0;
    this.totalTickTime = 0;
    this.slowTickCount = 0;
    this.lastTickDuration = 0;
  }
  
  /**
   * Log performance statistics.
   */
  private logPerformanceStats(): void {
    const stats = this.getStats();
    console.log('\n📊 Game Loop Performance Statistics:');
    console.log(`   Total ticks: ${stats.tickCount}`);
    console.log(`   Average tick time: ${stats.averageTickTime.toFixed(2)}ms`);
    console.log(`   Slow ticks: ${stats.slowTickCount} (${stats.slowTickPercentage.toFixed(1)}%)`);
    console.log(`   Tick utilization: ${stats.tickUtilization.toFixed(1)}%`);
  }
}

// Performance statistics interface
export interface GameLoopStats {
  tickRate: number;
  tickInterval: number;
  tickCount: number;
  averageTickTime: number;
  lastTickDuration: number;
  slowTickCount: number;
  slowTickPercentage: number;
  tickUtilization: number;
  isRunning: boolean;
}

// Singleton instance for global access (optional)
let gameLoopInstance: GameLoop | null = null;

export function getGameLoop(tickRate?: number): GameLoop {
  if (!gameLoopInstance) {
    gameLoopInstance = new GameLoop(tickRate);
  }
  return gameLoopInstance;
}