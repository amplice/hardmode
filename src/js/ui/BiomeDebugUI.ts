/**
 * Debug UI to display current biome
 */

import * as PIXI from 'pixi.js';

export class BiomeDebugUI {
    private container: PIXI.Container;
    private text: PIXI.Text;
    private background: PIXI.Graphics;
    private currentBiome: string = 'Unknown';
    
    constructor() {
        this.container = new PIXI.Container();
        
        // Create semi-transparent background
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000, 0.7);
        this.background.drawRoundedRect(0, 0, 200, 30, 5);
        this.background.endFill();
        
        // Create text display
        this.text = new PIXI.Text('Biome: Unknown', {
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 0xFFFFFF,
            align: 'left'
        });
        this.text.x = 10;
        this.text.y = 7;
        
        this.container.addChild(this.background);
        this.container.addChild(this.text);
    }
    
    /**
     * Update the displayed biome
     */
    updateBiome(biomeNumber: number): void {
        const biomeNames: { [key: number]: string } = {
            0: 'Grass',
            1: 'Dark Grass',
            2: 'Snow',
            3: 'Desert'
        };
        
        this.currentBiome = biomeNames[biomeNumber] || `Unknown (${biomeNumber})`;
        this.text.text = `Biome: ${this.currentBiome}`;
    }
    
    /**
     * Set the position of the UI element
     */
    setPosition(x: number, y: number): void {
        this.container.position.set(x, y);
    }
    
    /**
     * Get the container for adding to stage
     */
    getContainer(): PIXI.Container {
        return this.container;
    }
    
    /**
     * Update visibility
     */
    setVisible(visible: boolean): void {
        this.container.visible = visible;
    }
}