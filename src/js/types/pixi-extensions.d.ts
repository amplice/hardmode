/**
 * PIXI.js extensions and augmentations for the game
 */

import * as PIXI from 'pixi.js';

declare module 'pixi.js' {
    interface DisplayObject {
        // Custom properties we add to sprites
        customId?: string;
        entityType?: 'player' | 'monster' | 'projectile';
        entityId?: string;
    }
}

// Re-export commonly used PIXI types
export type PIXIContainer = PIXI.Container;
export type PIXISprite = PIXI.Sprite;
export type PIXIAnimatedSprite = PIXI.AnimatedSprite;
export type PIXIGraphics = PIXI.Graphics;
export type PIXITexture = PIXI.Texture;
export type PIXIApplication = PIXI.Application;

// Global game instance
declare global {
    interface Window {
        game?: any; // Will be typed when Game.ts is migrated
        setCameraSmoothing?: (value: number) => void;
        getLatencyStats?: () => any;
        getAntiCheatStats?: () => any;
    }
}