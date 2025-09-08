/**
 * @fileoverview MusicUI - Displays current playing music track
 * 
 * Shows the name of the currently playing background music track
 * to help identify tracks for removal during playtesting
 */

import * as PIXI from 'pixi.js';
import { soundManager } from '../systems/SoundManager.js';

export class MusicUI {
    private container: PIXI.Container;
    private text: PIXI.Text;
    private background: PIXI.Graphics;
    private lastTrackName: string = '';
    
    constructor() {
        this.container = new PIXI.Container();
        
        // Create semi-transparent background
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000, 0.5);
        this.background.drawRoundedRect(0, 0, 250, 30, 5);
        this.background.endFill();
        
        // Create text for track name
        this.text = new PIXI.Text('', {
            fontFamily: 'monospace',
            fontSize: 14,
            fill: 0xFFFFFF,
            align: 'left'
        });
        
        this.text.x = 10;
        this.text.y = 8;
        
        this.container.addChild(this.background);
        this.container.addChild(this.text);
        
        // Initially hidden until music plays
        this.container.visible = false;
    }
    
    /**
     * Update the displayed track name
     */
    update(): void {
        const currentTrack = soundManager.currentTrackName;
        
        if (currentTrack !== this.lastTrackName) {
            this.lastTrackName = currentTrack;
            
            if (currentTrack) {
                this.text.text = `♪ ${currentTrack}`;
                this.container.visible = true;
                
                // Resize background to fit text
                const textWidth = this.text.width + 20;
                this.background.clear();
                this.background.beginFill(0x000000, 0.5);
                this.background.drawRoundedRect(0, 0, textWidth, 30, 5);
                this.background.endFill();
            } else {
                this.container.visible = false;
            }
        }
    }
    
    /**
     * Set the position of the UI element
     */
    setPosition(x: number, y: number): void {
        this.container.x = x;
        this.container.y = y;
    }
    
    /**
     * Get the container for adding to stage
     */
    getContainer(): PIXI.Container {
        return this.container;
    }
    
    /**
     * Clean up resources
     */
    destroy(): void {
        this.container.destroy({ children: true });
    }
}