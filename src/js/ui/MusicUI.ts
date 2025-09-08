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
    private muteButton: PIXI.Container;
    private muteButtonBg: PIXI.Graphics;
    private muteButtonText: PIXI.Text;
    private lastTrackName: string = '';
    private isMuted: boolean = false;
    
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
        
        // Create mute button
        this.muteButton = new PIXI.Container();
        this.muteButton.interactive = true;
        this.muteButton.cursor = 'pointer';
        
        this.muteButtonBg = new PIXI.Graphics();
        this.muteButtonBg.beginFill(0x333333, 0.8);
        this.muteButtonBg.drawRoundedRect(0, 0, 35, 30, 5);
        this.muteButtonBg.endFill();
        
        this.muteButtonText = new PIXI.Text('🔊', {
            fontFamily: 'monospace',
            fontSize: 16,
            fill: 0xFFFFFF,
            align: 'center'
        });
        this.muteButtonText.anchor.set(0.5);
        this.muteButtonText.x = 17.5;
        this.muteButtonText.y = 15;
        
        this.muteButton.addChild(this.muteButtonBg);
        this.muteButton.addChild(this.muteButtonText);
        
        // Position mute button to the right of the track name
        this.muteButton.x = 255;
        
        // Add click handler
        this.muteButton.on('pointerdown', () => this.toggleMute());
        
        this.container.addChild(this.background);
        this.container.addChild(this.text);
        this.container.addChild(this.muteButton);
        
        // Initially hidden until music plays
        this.container.visible = false;
    }
    
    /**
     * Toggle music mute state
     */
    private toggleMute(): void {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            soundManager.muteMusic();
            this.muteButtonText.text = '🔇';
            this.muteButtonBg.clear();
            this.muteButtonBg.beginFill(0x662222, 0.8); // Red tint when muted
            this.muteButtonBg.drawRoundedRect(0, 0, 35, 30, 5);
            this.muteButtonBg.endFill();
        } else {
            soundManager.unmuteMusic();
            this.muteButtonText.text = '🔊';
            this.muteButtonBg.clear();
            this.muteButtonBg.beginFill(0x333333, 0.8);
            this.muteButtonBg.drawRoundedRect(0, 0, 35, 30, 5);
            this.muteButtonBg.endFill();
        }
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
                
                // Resize background to fit text and button
                const textWidth = this.text.width + 20;
                this.background.clear();
                this.background.beginFill(0x000000, 0.5);
                this.background.drawRoundedRect(0, 0, textWidth, 30, 5);
                this.background.endFill();
                
                // Reposition mute button
                this.muteButton.x = textWidth + 5;
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