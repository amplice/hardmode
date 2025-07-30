/**
 * @fileoverview PerformanceOverlay - Real-time performance metrics display
 * 
 * Displays:
 * - FPS (Frames Per Second)
 * - Monster count (active/total)
 * - Network latency
 * - Update loop timing
 */

import * as PIXI from 'pixi.js';

export class PerformanceOverlay {
    private container: PIXI.Container;
    private fpsText: PIXI.Text;
    private monsterText: PIXI.Text;
    private latencyText: PIXI.Text;
    private updateText: PIXI.Text;
    
    // FPS tracking
    private lastTime: number = 0;
    private frameCount: number = 0;
    private fps: number = 0;
    
    // Update timing
    private lastUpdateTime: number = 0;
    private updateDelta: number = 0;
    
    // Latency tracking from NetworkClient
    private latency: number = 0;
    
    constructor() {
        this.container = new PIXI.Container();
        
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'monospace',
            fontSize: 14,
            fill: 0x00FF00,
            stroke: 0x000000,
            strokeThickness: 2
        });
        
        // Create text elements
        this.fpsText = new PIXI.Text('FPS: 0', textStyle);
        this.fpsText.position.set(10, 10);
        
        this.monsterText = new PIXI.Text('Monsters: 0', textStyle);
        this.monsterText.position.set(10, 30);
        
        this.latencyText = new PIXI.Text('Latency: 0ms', textStyle);
        this.latencyText.position.set(10, 50);
        
        this.updateText = new PIXI.Text('Update: 0ms', textStyle);
        this.updateText.position.set(10, 70);
        
        // Add to container
        this.container.addChild(this.fpsText);
        this.container.addChild(this.monsterText);
        this.container.addChild(this.latencyText);
        this.container.addChild(this.updateText);
    }
    
    getContainer(): PIXI.Container {
        return this.container;
    }
    
    /**
     * Update FPS counter
     */
    updateFPS(): void {
        const now = performance.now();
        this.frameCount++;
        
        if (now >= this.lastTime + 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.frameCount = 0;
            this.lastTime = now;
            
            // Color code FPS
            let color = 0x00FF00; // Green
            if (this.fps < 30) color = 0xFFFF00; // Yellow
            if (this.fps < 20) color = 0xFF0000; // Red
            
            this.fpsText.style.fill = color;
            this.fpsText.text = `FPS: ${this.fps}`;
        }
    }
    
    /**
     * Update monster count
     */
    updateMonsterCount(activeCount: number, totalCount: number): void {
        this.monsterText.text = `Monsters: ${activeCount}/${totalCount}`;
        
        // Color code based on count
        let color = 0x00FF00; // Green
        if (totalCount > 50) color = 0xFFFF00; // Yellow
        if (totalCount > 75) color = 0xFF0000; // Red
        
        this.monsterText.style.fill = color;
    }
    
    /**
     * Update network latency
     */
    updateLatency(latency: number): void {
        this.latency = latency;
        this.latencyText.text = `Latency: ${Math.round(latency)}ms`;
        
        // Color code based on latency
        let color = 0x00FF00; // Green
        if (latency > 100) color = 0xFFFF00; // Yellow
        if (latency > 200) color = 0xFF0000; // Red
        
        this.latencyText.style.fill = color;
    }
    
    /**
     * Track update loop timing
     */
    startUpdateTimer(): void {
        this.lastUpdateTime = performance.now();
    }
    
    endUpdateTimer(): void {
        const now = performance.now();
        this.updateDelta = now - this.lastUpdateTime;
        this.updateText.text = `Update: ${this.updateDelta.toFixed(1)}ms`;
        
        // Color code based on update time (target is 33ms for 30fps)
        let color = 0x00FF00; // Green
        if (this.updateDelta > 40) color = 0xFFFF00; // Yellow
        if (this.updateDelta > 50) color = 0xFF0000; // Red
        
        this.updateText.style.fill = color;
    }
    
    /**
     * Toggle visibility
     */
    toggle(): void {
        this.container.visible = !this.container.visible;
    }
    
    show(): void {
        this.container.visible = true;
    }
    
    hide(): void {
        this.container.visible = false;
    }
}