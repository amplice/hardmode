/**
 * @fileoverview DamageNumberSystem - Displays floating damage numbers with object pooling
 * 
 * PURPOSE:
 * Efficient visual feedback for combat damage using pooled text objects
 * Prevents GC spikes during intense combat by reusing PIXI.Text instances
 * 
 * FEATURES:
 * - Object pooling for zero garbage collection
 * - Smooth floating animation
 * - Color coding for damage types
 * - Automatic cleanup after animation
 */

import * as PIXI from 'pixi.js';
import { ObjectPool } from '../utils/ObjectPool.js';
import { GAME_CONSTANTS } from '../../../shared/constants/GameConstants.js';

interface DamageNumber {
    text: PIXI.Text;
    startTime: number;
    duration: number;
    startY: number;
    targetY: number;
    x: number;
    active: boolean;
}

export class DamageNumberSystem {
    private container: PIXI.Container;
    private damagePool: ObjectPool<DamageNumber>;
    private activeNumbers: Set<DamageNumber>;
    
    // Animation settings
    private static readonly FLOAT_DISTANCE = 50; // pixels to float upward
    private static readonly DURATION = 1000; // milliseconds
    private static readonly FADE_START = 0.6; // Start fading at 60% of duration
    
    constructor(container: PIXI.Container) {
        this.container = container;
        this.activeNumbers = new Set();
        
        // Create pool with configuration from GameConstants
        const poolConfig = {
            maxSize: GAME_CONSTANTS.POOLS.DAMAGE_NUMBERS.MAX_SIZE || 50,
            preAllocate: GAME_CONSTANTS.POOLS.DAMAGE_NUMBERS.PRE_ALLOCATE || 10
        };
        
        this.damagePool = new ObjectPool<DamageNumber>(
            // Create function
            () => this.createDamageNumber(),
            // Reset function
            (damageNum) => this.resetDamageNumber(damageNum),
            poolConfig,
            // Destroy function
            (damageNum) => this.destroyDamageNumber(damageNum)
        );
    }
    
    private createDamageNumber(): DamageNumber {
        const text = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 20,
            fontWeight: 'bold',
            fill: 0xFFFFFF,
            stroke: 0x000000,
            strokeThickness: 3,
            align: 'center'
        });
        
        text.anchor.set(0.5, 0.5);
        text.visible = false;
        
        return {
            text,
            startTime: 0,
            duration: DamageNumberSystem.DURATION,
            startY: 0,
            targetY: 0,
            x: 0,
            active: false
        };
    }
    
    private resetDamageNumber(damageNum: DamageNumber): void {
        damageNum.text.visible = false;
        damageNum.text.alpha = 1;
        damageNum.text.scale.set(1);
        damageNum.active = false;
        
        if (damageNum.text.parent) {
            damageNum.text.parent.removeChild(damageNum.text);
        }
    }
    
    private destroyDamageNumber(damageNum: DamageNumber): void {
        if (damageNum.text.parent) {
            damageNum.text.parent.removeChild(damageNum.text);
        }
        damageNum.text.destroy();
    }
    
    /**
     * Show a damage number at the specified position
     */
    showDamage(x: number, y: number, amount: number, color: number = 0xFF4444): void {
        const damageNum = this.damagePool.acquire();
        
        // Configure text
        damageNum.text.text = amount.toString();
        damageNum.text.style.fill = color;
        damageNum.text.position.set(x, y);
        damageNum.text.visible = true;
        damageNum.text.alpha = 1;
        damageNum.text.scale.set(1);
        
        // Setup animation
        damageNum.startTime = performance.now();
        damageNum.startY = y;
        damageNum.targetY = y - DamageNumberSystem.FLOAT_DISTANCE;
        damageNum.x = x;
        damageNum.active = true;
        
        // Add slight random horizontal offset for overlapping numbers
        damageNum.x += (Math.random() - 0.5) * 20;
        
        // Add to container and tracking
        this.container.addChild(damageNum.text);
        this.activeNumbers.add(damageNum);
    }
    
    /**
     * Show healing numbers (green)
     */
    showHealing(x: number, y: number, amount: number): void {
        this.showDamage(x, y, amount, 0x44FF44);
    }
    
    /**
     * Show critical damage (larger, yellow)
     */
    showCritical(x: number, y: number, amount: number): void {
        const damageNum = this.damagePool.acquire();
        
        // Configure text for critical
        damageNum.text.text = `${amount}!`;
        damageNum.text.style.fill = 0xFFFF44;
        damageNum.text.style.fontSize = 24; // Larger for crits
        damageNum.text.position.set(x, y);
        damageNum.text.visible = true;
        damageNum.text.alpha = 1;
        damageNum.text.scale.set(1.2); // Start slightly larger
        
        // Setup animation
        damageNum.startTime = performance.now();
        damageNum.startY = y;
        damageNum.targetY = y - DamageNumberSystem.FLOAT_DISTANCE * 1.2; // Float higher
        damageNum.x = x;
        damageNum.active = true;
        damageNum.duration = DamageNumberSystem.DURATION * 1.2; // Last longer
        
        // Add to container and tracking
        this.container.addChild(damageNum.text);
        this.activeNumbers.add(damageNum);
    }
    
    /**
     * Update all active damage numbers
     */
    update(deltaTime: number): void {
        const now = performance.now();
        const toRemove: DamageNumber[] = [];
        
        for (const damageNum of this.activeNumbers) {
            const elapsed = now - damageNum.startTime;
            const progress = Math.min(elapsed / damageNum.duration, 1);
            
            if (progress >= 1) {
                toRemove.push(damageNum);
                continue;
            }
            
            // Smooth easing for float animation
            const easeOut = 1 - Math.pow(1 - progress, 2);
            const y = damageNum.startY + (damageNum.targetY - damageNum.startY) * easeOut;
            
            damageNum.text.position.set(damageNum.x, y);
            
            // Fade out in the last portion
            if (progress > DamageNumberSystem.FADE_START) {
                const fadeProgress = (progress - DamageNumberSystem.FADE_START) / (1 - DamageNumberSystem.FADE_START);
                damageNum.text.alpha = 1 - fadeProgress;
            }
            
            // Slight scale down as it fades
            if (progress > 0.8) {
                const scaleProgress = (progress - 0.8) / 0.2;
                damageNum.text.scale.set(1 - scaleProgress * 0.2);
            }
        }
        
        // Clean up completed animations
        for (const damageNum of toRemove) {
            this.activeNumbers.delete(damageNum);
            this.damagePool.release(damageNum);
        }
    }
    
    /**
     * Clear all active damage numbers
     */
    clear(): void {
        for (const damageNum of this.activeNumbers) {
            this.damagePool.release(damageNum);
        }
        this.activeNumbers.clear();
    }
    
    /**
     * Get pool statistics for debugging
     */
    getPoolStats() {
        return this.damagePool.getStats();
    }
}