/**
 * @fileoverview ActionBoxUI - Client-side action feed display component
 * 
 * ARCHITECTURE ROLE:
 * - Displays recent game actions from local player's perspective
 * - Shows various events: kills, deaths, level ups, achievements, etc.
 * - Auto-fades messages after a few seconds
 * - Fixed screen position in bottom-right corner
 * 
 * VISUAL DESIGN:
 * - White text with shadow for readability
 * - Color-coded messages based on action type
 * - Messages stack vertically
 * - Newer messages appear at bottom
 * - Smooth fade out animation
 */

import * as PIXI from 'pixi.js';

export type ActionType = 'kill' | 'death' | 'levelup' | 'powerup' | 'achievement' | 'system' | 'damage' | 'disconnect';

interface ActionMessage {
    text: PIXI.Text;
    createdAt: number;
    fadeStartTime: number;
    type: ActionType;
}

interface ActionStyle {
    color: number;
    icon?: string;
}

export class ActionBoxUI {
    public container: PIXI.Container;
    private messages: ActionMessage[];
    private maxMessages: number = 6;
    private messageDuration: number = 5000; // 5 seconds
    private fadeOutDuration: number = 1000; // 1 second fade
    
    // Styling for different action types
    private actionStyles: Record<ActionType, ActionStyle> = {
        kill: { color: 0xFFFFFF, icon: '⚔️' },
        death: { color: 0xFF6666, icon: '💀' },
        levelup: { color: 0x66FF66, icon: '⬆️' },
        powerup: { color: 0x66CCFF, icon: '✨' },
        achievement: { color: 0xFFD700, icon: '🏆' },
        system: { color: 0xCCCCCC, icon: 'ℹ️' },
        damage: { color: 0xFFAA66, icon: '🗡️' },
        disconnect: { color: 0xFF0000, icon: '⚠️' }
    };
    
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
        // Position 10px from right edge, 10px from bottom
        // Account for message height (6 messages * 25px each)
        const totalHeight = this.maxMessages * 25;
        this.container.position.set(window.innerWidth - 290, window.innerHeight - totalHeight - 10);
    }
    
    /**
     * Add a kill action (PvP or PvE)
     */
    addKill(killerName: string, victimName: string, isPvP: boolean = false): void {
        const message = isPvP 
            ? `${killerName} eliminated ${victimName}`
            : `${killerName} killed ${victimName}`;
        this.addAction(message, 'kill');
    }
    
    /**
     * Add a death action (when local player dies)
     */
    addDeath(killerName: string): void {
        const message = `You were killed by ${killerName}`;
        this.addAction(message, 'death');
    }
    
    /**
     * Add a level up action
     */
    addLevelUp(playerName: string, newLevel: number): void {
        const message = playerName === 'You' 
            ? `You reached level ${newLevel}!`
            : `${playerName} reached level ${newLevel}`;
        this.addAction(message, 'levelup');
    }
    
    /**
     * Add a powerup action
     */
    addPowerup(powerupType: string): void {
        const message = `Picked up ${powerupType}`;
        this.addAction(message, 'powerup');
    }
    
    /**
     * Add damage dealt message
     */
    addDamageDealt(targetName: string, damage: number): void {
        const message = `You did ${damage} damage to ${targetName}`;
        this.addAction(message, 'damage');
    }
    
    /**
     * Add damage taken message
     */
    addDamageTaken(attackerName: string, damage: number): void {
        const message = `${attackerName} did ${damage} damage to you`;
        this.addAction(message, 'damage');
    }
    
    /**
     * Add disconnect message
     */
    addDisconnect(): void {
        const message = `You've been disconnected. Refresh the browser to rejoin`;
        this.addAction(message, 'disconnect');
    }
    
    /**
     * Add a generic action with custom message
     */
    addAction(message: string, type: ActionType = 'system'): void {
        const style = this.actionStyles[type];
        
        // Create message text with icon
        const fullMessage = style.icon ? `${style.icon} ${message}` : message;
        const text = new PIXI.Text(
            fullMessage,
            {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: style.color,
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
        const actionMessage: ActionMessage = {
            text,
            createdAt: Date.now(),
            fadeStartTime: Date.now() + this.messageDuration,
            type
        };
        
        // Add to container and array
        this.container.addChild(text);
        this.messages.push(actionMessage);
        
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