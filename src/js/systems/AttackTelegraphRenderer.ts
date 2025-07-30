/**
 * @fileoverview AttackTelegraphRenderer - Visual indicators for incoming attacks
 * 
 * ARCHITECTURE ROLE:
 * - Renders visual warnings for monster attacks before they hit
 * - Supports different shapes: rectangle, cone, circle
 * - Uses PIXI.Graphics for performance
 * - Manages telegraph lifecycle (create, update, destroy)
 * 
 * TELEGRAPH DESIGN:
 * - Semi-transparent fills with colored borders
 * - Different colors for different danger levels
 * - Fade in/out animations for smooth transitions
 */

import * as PIXI from 'pixi.js';

export interface TelegraphConfig {
    shape: 'rectangle' | 'cone' | 'circle';
    color: number;           // Hex color for the telegraph
    fillAlpha: number;       // Fill transparency (0-1)
    borderAlpha: number;     // Border transparency (0-1)
    borderWidth: number;     // Border line width
    duration: number;        // How long to show (ms)
    fadeIn?: number;         // Fade in duration (ms)
    fadeOut?: number;        // Fade out duration (ms)
}

export interface RectangleTelegraph {
    shape: 'rectangle';
    width: number;
    length: number;
}

export interface ConeTelegraph {
    shape: 'cone';
    range: number;
    angle: number;   // Angle in degrees
}

export interface CircleTelegraph {
    shape: 'circle';
    radius: number;
}

export type TelegraphShape = RectangleTelegraph | ConeTelegraph | CircleTelegraph;

export class AttackTelegraphRenderer {
    private container: PIXI.Container;
    private activeTelegraphs: Map<string, {
        graphics: PIXI.Graphics;
        config: TelegraphConfig;
        startTime: number;
        endTime: number;
    }>;

    constructor() {
        this.container = new PIXI.Container();
        this.activeTelegraphs = new Map();
    }

    getContainer(): PIXI.Container {
        return this.container;
    }

    /**
     * Create a new telegraph indicator
     */
    createTelegraph(
        id: string,
        x: number,
        y: number,
        facing: number,  // Angle in radians
        shape: TelegraphShape,
        config: TelegraphConfig
    ): void {
        // Remove existing telegraph with same ID if any
        this.removeTelegraph(id);

        const graphics = new PIXI.Graphics();
        graphics.position.set(x, y);
        graphics.rotation = facing;

        // Draw the shape
        this.drawTelegraphShape(graphics, shape, config);

        // Add to container
        this.container.addChild(graphics);

        // Store for management
        const now = Date.now();
        this.activeTelegraphs.set(id, {
            graphics,
            config,
            startTime: now,
            endTime: now + config.duration
        });

        // Set initial alpha for fade in
        if (config.fadeIn && config.fadeIn > 0) {
            graphics.alpha = 0;
        }
    }

    /**
     * Draw the telegraph shape based on type
     */
    private drawTelegraphShape(
        graphics: PIXI.Graphics,
        shape: TelegraphShape,
        config: TelegraphConfig
    ): void {
        // No border - set line style to 0
        graphics.lineStyle(0);
        
        // Set fill
        graphics.beginFill(config.color, config.fillAlpha);

        switch (shape.shape) {
            case 'rectangle':
                // Rectangle extends forward from position
                // In PIXI, rotation 0 = right, so rectangle extends along positive X
                const halfWidth = shape.width / 2;
                graphics.drawRect(0, -halfWidth, shape.length, shape.width);
                break;

            case 'cone':
                // Cone extends forward from position
                const angleRad = (shape.angle * Math.PI) / 180;
                const halfAngle = angleRad / 2;
                
                // Draw cone as a pie slice
                graphics.moveTo(0, 0);
                graphics.arc(0, 0, shape.range, -halfAngle, halfAngle, false);
                graphics.closePath();
                break;

            case 'circle':
                // Circle centered on position
                graphics.drawCircle(0, 0, shape.radius);
                break;
        }

        graphics.endFill();
    }

    /**
     * Update all active telegraphs (handle fading)
     */
    update(deltaTime: number): void {
        const now = Date.now();
        const toRemove: string[] = [];

        this.activeTelegraphs.forEach((telegraph, id) => {
            const { graphics, config, startTime, endTime } = telegraph;
            const elapsed = now - startTime;
            const remaining = endTime - now;

            // Handle fade in
            if (config.fadeIn && elapsed < config.fadeIn) {
                graphics.alpha = elapsed / config.fadeIn;
            }
            // Handle fade out
            else if (config.fadeOut && remaining < config.fadeOut && remaining > 0) {
                graphics.alpha = remaining / config.fadeOut;
            }
            // Full visibility
            else if (remaining > 0) {
                graphics.alpha = 1;
            }
            // Expired
            else {
                toRemove.push(id);
            }
        });

        // Remove expired telegraphs
        toRemove.forEach(id => this.removeTelegraph(id));
    }

    /**
     * Update telegraph position (for moving attacks like ogre spin)
     */
    updateTelegraphPosition(id: string, x: number, y: number): void {
        const telegraph = this.activeTelegraphs.get(id);
        if (telegraph) {
            telegraph.graphics.position.set(x, y);
        }
    }

    /**
     * Remove a telegraph
     */
    removeTelegraph(id: string): void {
        const telegraph = this.activeTelegraphs.get(id);
        if (telegraph) {
            this.container.removeChild(telegraph.graphics);
            telegraph.graphics.destroy();
            this.activeTelegraphs.delete(id);
        }
    }

    /**
     * Remove all telegraphs
     */
    clear(): void {
        this.activeTelegraphs.forEach((telegraph, id) => {
            this.container.removeChild(telegraph.graphics);
            telegraph.graphics.destroy();
        });
        this.activeTelegraphs.clear();
    }

    /**
     * Get default configs for different attack types
     */
    static getDefaultConfig(attackType: string): TelegraphConfig {
        // Default configs for different monster attacks
        const configs: Record<string, TelegraphConfig> = {
            // Basic melee attacks - orange/yellow warning
            melee_basic: {
                shape: 'rectangle',
                color: 0xFFA500,     // Orange
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 600,       // Show for 600ms
                fadeIn: 100,
                fadeOut: 100
            },
            
            // Heavy melee attacks - red warning
            melee_heavy: {
                shape: 'rectangle',
                color: 0xFF0000,     // Red
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 800,
                fadeIn: 150,
                fadeOut: 100
            },
            
            // Cone attacks - yellow warning
            cone_sweep: {
                shape: 'cone',
                color: 0xFFFF00,     // Yellow
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 700,
                fadeIn: 100,
                fadeOut: 100
            },
            
            // Basic cone attacks - orange warning
            cone_basic: {
                shape: 'cone',
                color: 0xFFA500,     // Orange
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 600,
                fadeIn: 100,
                fadeOut: 100
            },
            
            // Heavy cone attacks - red warning
            cone_heavy: {
                shape: 'cone',
                color: 0xFF0000,     // Red
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 800,
                fadeIn: 150,
                fadeOut: 100
            },
            
            // AOE attacks - red warning
            aoe_circle: {
                shape: 'circle',
                color: 0xFF0000,     // Red
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 1000,
                fadeIn: 200,
                fadeOut: 150
            },
            
            // Elemental burst attack - purple/blue warning
            aoe_burst: {
                shape: 'circle',
                color: 0x9B59B6,     // Purple (magical)
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 625,       // Match elemental windup time
                fadeIn: 150,
                fadeOut: 100
            },
            
            // Ogre spin attack - orange spinning warning
            aoe_spin: {
                shape: 'circle',
                color: 0xFFA500,     // Orange
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 500,       // Match ogre spin windup
                fadeIn: 100,
                fadeOut: 50
            },
            
            // Wolf jump attack - yellow impact zone
            aoe_jump: {
                shape: 'circle',
                color: 0xFFFF00,     // Yellow
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 200,       // Match wolf jump windup
                fadeIn: 50,
                fadeOut: 50
            },
            
            // Dark Mage teleport warning (phase 1)
            teleport_warning: {
                shape: 'circle',
                color: 0x8B008B,     // Dark magenta
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 333,       // Match teleport windup
                fadeIn: 100,
                fadeOut: 100
            },
            
            // Dark Mage teleport attack (phase 2)
            teleport_attack: {
                shape: 'cone',
                color: 0x8B008B,     // Dark magenta
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 400,       // Time before damage after teleport
                fadeIn: 50,
                fadeOut: 50
            },
            
            // WingedDemon Infernal Strike
            aoe_infernal: {
                shape: 'circle',
                color: 0xFF0000,     // Red (demonic fire)
                fillAlpha: 0.15,     // 15% opacity
                borderAlpha: 0,      // No border
                borderWidth: 0,      // No border
                duration: 800,       // Match winged demon windup
                fadeIn: 200,
                fadeOut: 100
            }
        };

        return configs[attackType] || configs.melee_basic;
    }
}