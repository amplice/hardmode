/**
 * @fileoverview KillFeedUI - Client-side kill feed display component
 * 
 * ARCHITECTURE ROLE:
 * - Displays recent PvP kills using class names
 * - Shows messages like "Rogue killed Guardian"
 * - Auto-fades messages after a few seconds
 * - Fixed screen position in top-right corner
 * 
 * VISUAL DESIGN:
 * - White text with shadow for readability
 * - Messages stack vertically
 * - Newer messages appear at bottom
 * - Smooth fade out animation
 */

import * as PIXI from 'pixi.js';

interface KillMessage {
    text: PIXI.Text;
    createdAt: number;
    fadeStartTime: number;
}

export class KillFeedUI {
    public container: PIXI.Container;
    private messages: KillMessage[];
    private maxMessages: number = 5;
    private messageDuration: number = 5000; // 5 seconds
    private fadeOutDuration: number = 1000; // 1 second fade
    
    constructor() {
        this.container = new PIXI.Container();
        this.messages = [];
        
        // Position in top-right corner
        this.updatePosition();
        
        // Fixed position on screen (not affected by camera)
        this.container.zIndex = 100;
        
        // Listen for window resize
        window.addEventListener('resize', () => this.updatePosition());
    }
    
    private updatePosition(): void {
        // Position 20px from right edge, 20px from top
        this.container.position.set(window.innerWidth - 220, 20);
    }
    
    addKill(killerClass: string, victimClass: string): void {
        // Create message text
        const text = new PIXI.Text(
            `${killerClass} killed ${victimClass}`,
            {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: 0xFFFFFF,
                dropShadow: true,
                dropShadowColor: 0x000000,
                dropShadowBlur: 4,
                dropShadowDistance: 2
            }
        );
        
        // Position text (right-aligned)
        text.anchor.set(1, 0); // Anchor to top-right
        text.position.y = this.messages.length * 25;
        
        // Create message object
        const message: KillMessage = {
            text,
            createdAt: Date.now(),
            fadeStartTime: Date.now() + this.messageDuration
        };
        
        // Add to container and array
        this.container.addChild(text);
        this.messages.push(message);
        
        // Remove old messages if exceeding max
        while (this.messages.length > this.maxMessages) {
            const oldMessage = this.messages.shift()!;
            this.container.removeChild(oldMessage.text);
        }
        
        // Reposition all messages
        this.repositionMessages();
    }
    
    private repositionMessages(): void {
        this.messages.forEach((message, index) => {
            message.text.position.y = index * 25;
        });
    }
    
    update(): void {
        const now = Date.now();
        
        // Update message opacity and remove expired ones
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const message = this.messages[i];
            
            if (now >= message.fadeStartTime) {
                // Calculate fade progress
                const fadeProgress = (now - message.fadeStartTime) / this.fadeOutDuration;
                
                if (fadeProgress >= 1) {
                    // Remove completely faded message
                    this.container.removeChild(message.text);
                    this.messages.splice(i, 1);
                } else {
                    // Update opacity
                    message.text.alpha = 1 - fadeProgress;
                }
            }
        }
        
        // Reposition remaining messages if any were removed
        if (this.messages.length > 0) {
            this.repositionMessages();
        }
    }
}