/**
 * @fileoverview ObjectPool - Generic object pooling system with size limits and statistics
 * 
 * PURPOSE:
 * Provides memory-efficient object reuse with proper bounds checking
 * Prevents memory leaks from unbounded pool growth
 * Tracks usage statistics for performance monitoring
 * 
 * FEATURES:
 * - Configurable maximum pool size
 * - Automatic cleanup when pool exceeds limits
 * - Usage statistics (created, reused, destroyed)
 * - Generic typing for any poolable object
 * - Reset callbacks for proper object cleanup
 */

import * as PIXI from 'pixi.js';

export interface PoolStats {
    created: number;      // Total objects created
    reused: number;       // Times objects were reused from pool
    destroyed: number;    // Objects destroyed due to pool limits
    currentSize: number;  // Current pool size
    maxSize: number;     // Maximum allowed pool size
    peakSize: number;    // Highest size reached
}

export interface PoolConfig {
    maxSize: number;      // Maximum objects to keep in pool
    preAllocate?: number; // Pre-create this many objects
}

export class ObjectPool<T> {
    private pool: T[] = [];
    private maxSize: number;
    private createFn: () => T;
    private resetFn: (obj: T) => void;
    private destroyFn?: (obj: T) => void;
    
    // Statistics
    private stats: PoolStats;
    
    constructor(
        createFn: () => T,
        resetFn: (obj: T) => void,
        config: PoolConfig,
        destroyFn?: (obj: T) => void
    ) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.destroyFn = destroyFn;
        this.maxSize = config.maxSize;
        
        this.stats = {
            created: 0,
            reused: 0,
            destroyed: 0,
            currentSize: 0,
            maxSize: this.maxSize,
            peakSize: 0
        };
        
        // Pre-allocate objects if requested
        if (config.preAllocate && config.preAllocate > 0) {
            const count = Math.min(config.preAllocate, this.maxSize);
            for (let i = 0; i < count; i++) {
                const obj = this.createFn();
                this.resetFn(obj);
                this.pool.push(obj);
                this.stats.created++;
            }
            this.updateStats();
        }
    }
    
    /**
     * Acquire an object from the pool or create a new one
     */
    acquire(): T {
        if (this.pool.length > 0) {
            this.stats.reused++;
            this.updateStats();
            return this.pool.pop()!;
        }
        
        // Create new object
        this.stats.created++;
        this.updateStats();
        return this.createFn();
    }
    
    /**
     * Release an object back to the pool
     */
    release(obj: T): void {
        // Reset the object
        this.resetFn(obj);
        
        // Check pool size limit
        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
        } else {
            // Pool is full, destroy the object
            if (this.destroyFn) {
                this.destroyFn(obj);
            }
            this.stats.destroyed++;
        }
        
        this.updateStats();
    }
    
    /**
     * Clear all objects from the pool
     */
    clear(): void {
        if (this.destroyFn) {
            for (const obj of this.pool) {
                this.destroyFn(obj);
                this.stats.destroyed++;
            }
        }
        this.pool.length = 0;
        this.updateStats();
    }
    
    /**
     * Get current pool statistics
     */
    getStats(): PoolStats {
        return { ...this.stats };
    }
    
    /**
     * Update statistics
     */
    private updateStats(): void {
        this.stats.currentSize = this.pool.length;
        if (this.stats.currentSize > this.stats.peakSize) {
            this.stats.peakSize = this.stats.currentSize;
        }
    }
    
    /**
     * Get current pool size
     */
    get size(): number {
        return this.pool.length;
    }
    
    /**
     * Check if pool is at maximum capacity
     */
    isFull(): boolean {
        return this.pool.length >= this.maxSize;
    }
}

/**
 * Factory functions for common PIXI object pools
 */
export class PIXIPoolFactory {
    /**
     * Create a pool for PIXI.Graphics objects
     */
    static createGraphicsPool(maxSize: number = 50, preAllocate: number = 10): ObjectPool<PIXI.Graphics> {
        return new ObjectPool<PIXI.Graphics>(
            () => new PIXI.Graphics(),
            (graphics) => {
                graphics.clear();
                graphics.visible = false;
                graphics.alpha = 1;
                graphics.rotation = 0;
                graphics.scale.set(1, 1);
                graphics.position.set(0, 0);
                graphics.pivot.set(0, 0);
                graphics.tint = 0xFFFFFF;
                if (graphics.parent) {
                    graphics.parent.removeChild(graphics);
                }
            },
            { maxSize, preAllocate },
            (graphics) => {
                graphics.destroy();
            }
        );
    }
    
    /**
     * Create a pool for PIXI.Container objects
     */
    static createContainerPool(maxSize: number = 100, preAllocate: number = 20): ObjectPool<PIXI.Container> {
        return new ObjectPool<PIXI.Container>(
            () => new PIXI.Container(),
            (container) => {
                // Remove all children
                container.removeChildren();
                container.visible = false;
                container.alpha = 1;
                container.rotation = 0;
                container.scale.set(1, 1);
                container.position.set(0, 0);
                container.pivot.set(0, 0);
                if (container.parent) {
                    container.parent.removeChild(container);
                }
            },
            { maxSize, preAllocate },
            (container) => {
                container.destroy({ children: true });
            }
        );
    }
}