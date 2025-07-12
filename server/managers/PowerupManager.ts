/**
 * @fileoverview PowerupManager - Server-side powerup system management
 * 
 * ARCHITECTURE ROLE:
 * - Manages powerup drops in the world (spawning, despawning, pickup detection)
 * - Handles powerup effect application and timing for players
 * - Integrates with existing game systems (damage, movement, anti-cheat)
 * - Provides server-authoritative powerup state for network synchronization
 * 
 * POWERUP LIFECYCLE:
 * 1. Monster dies → createPowerupDrop() → PowerupState in world
 * 2. Player moves near → attemptPickup() → collision detection
 * 3. Pickup detected → applyPowerupEffect() → apply to player state
 * 4. Effect duration tracking → update() → clean up expired effects
 * 5. Network events → broadcast state changes to all clients
 * 
 * MEMORY SAFETY:
 * - All timeouts tracked in cleanupTimeouts Map for proper cleanup
 * - Player disconnect cleanup prevents memory leaks
 * - Automatic powerup expiration with backup cleanup system
 * 
 * INTEGRATION POINTS:
 * - Called from DamageProcessor on monster death
 * - Called from InputProcessor during player movement
 * - Modifies player state fields that network system already handles
 * - Works with existing moveSpeedBonus system for speed powerups
 */

import { POWERUP_CONFIG } from '../../shared/constants/GameConstants.js';
import type { 
    PowerupState, 
    PowerupEffect, 
    PowerupType,
    PlayerState 
} from '../../shared/types/GameTypes.js';

interface GameStateManager {
    getPlayer(id: string): any;
    players: Map<string, any>;
}

export class PowerupManager {
    private worldPowerups: Map<string, PowerupState>;
    private activeEffects: Map<string, PowerupEffect>;
    private cleanupTimeouts: Map<string, NodeJS.Timeout>;
    private io: any;
    private gameState: GameStateManager;
    
    constructor(io: any, gameState: GameStateManager) {
        this.worldPowerups = new Map();
        this.activeEffects = new Map();
        this.cleanupTimeouts = new Map();
        this.io = io;
        this.gameState = gameState;
        
        console.log('[PowerupManager] Initialized powerup system');
    }
    
    /**
     * Create a powerup drop at monster death location
     * Called from DamageProcessor when monster dies
     */
    createPowerupDrop(x: number, y: number): PowerupState | null {
        // Check drop rate
        if (Math.random() > POWERUP_CONFIG.DROP_RATE) {
            return null;
        }
        
        // Random powerup type
        const types: PowerupType[] = ['health', 'armor', 'speed', 'damage', 'invulnerability'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const powerup: PowerupState = {
            id: `powerup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            x,
            y,
            spawnTime: Date.now(),
            expiresAt: Date.now() + POWERUP_CONFIG.DESPAWN_TIME
        };
        
        this.worldPowerups.set(powerup.id, powerup);
        
        // Schedule automatic cleanup
        const timeout = setTimeout(() => {
            this.removePowerup(powerup.id);
        }, POWERUP_CONFIG.DESPAWN_TIME);
        this.cleanupTimeouts.set(powerup.id, timeout);
        
        // Broadcast to all clients
        this.io.emit('powerupSpawned', powerup);
        
        console.log(`[PowerupManager] ${type} powerup spawned at (${x}, ${y})`);
        return powerup;
    }
    
    /**
     * Handle player pickup attempt during movement
     * Called from InputProcessor when player moves
     */
    attemptPickup(playerId: string, playerX: number, playerY: number): PowerupState | null {
        for (const [id, powerup] of this.worldPowerups) {
            const distance = Math.sqrt(
                Math.pow(powerup.x - playerX, 2) + 
                Math.pow(powerup.y - playerY, 2)
            );
            
            if (distance <= POWERUP_CONFIG.PICKUP_RADIUS) {
                // Remove from world
                this.removePowerup(id);
                
                // Broadcast pickup event
                this.io.emit('powerupPickedUp', { 
                    powerupId: id, 
                    playerId,
                    type: powerup.type
                });
                
                console.log(`[PowerupManager] Player ${playerId} picked up ${powerup.type} powerup`);
                return powerup;
            }
        }
        return null;
    }
    
    /**
     * Remove powerup from world (pickup or expiration)
     */
    private removePowerup(id: string): void {
        this.worldPowerups.delete(id);
        
        const timeout = this.cleanupTimeouts.get(id);
        if (timeout) {
            clearTimeout(timeout);
            this.cleanupTimeouts.delete(id);
        }
        
        this.io.emit('powerupRemoved', { powerupId: id });
    }
    
    /**
     * Apply powerup effect to player
     * Phase 1/2: Health and Armor only, other effects in later phases
     */
    applyPowerupEffect(player: any, powerup: PowerupState): void {
        switch (powerup.type) {
            case 'health':
                this.applyHealthPowerup(player);
                break;
            case 'armor':
                this.applyArmorPowerup(player);
                break;
            case 'speed':
                // TODO: Implement in Phase 3
                console.log(`[PowerupManager] Speed powerup not yet implemented`);
                break;
            case 'damage':
                // TODO: Implement in Phase 4
                console.log(`[PowerupManager] Damage powerup not yet implemented`);
                break;
            case 'invulnerability':
                // TODO: Implement in Phase 5
                console.log(`[PowerupManager] Invulnerability powerup not yet implemented`);
                break;
            default:
                console.warn(`[PowerupManager] Unknown powerup type: ${powerup.type}`);
        }
    }
    
    /**
     * Apply health powerup - instant heal
     */
    private applyHealthPowerup(player: any): void {
        const config = POWERUP_CONFIG.EFFECTS.health;
        const maxHp = player.maxHp; // Use player's actual maxHP
        
        if (player.hp < maxHp) {
            const healAmount = Math.min(config.healAmount, maxHp - player.hp);
            player.hp += healAmount;
            
            console.log(`[PowerupManager] Player ${player.id} healed for ${healAmount} HP (${player.hp}/${maxHp})`);
            
            // Broadcast healing effect to clients
            this.io.emit('playerHealed', {
                playerId: player.id,
                healAmount,
                newHP: player.hp,
                maxHP: maxHp
            });
        } else {
            console.log(`[PowerupManager] Player ${player.id} already at full health, no effect`);
        }
    }
    
    /**
     * Apply armor powerup - add green HP
     */
    private applyArmorPowerup(player: any): void {
        const config = POWERUP_CONFIG.EFFECTS.armor;
        
        // Initialize armorHP if needed
        if (!player.armorHP) {
            player.armorHP = 0;
        }
        
        player.armorHP += config.armorAmount;
        
        console.log(`[PowerupManager] Player ${player.id} gained ${config.armorAmount} armor HP (total: ${player.armorHP})`);
        
        // Broadcast armor gain to clients
        this.io.emit('playerArmorGained', {
            playerId: player.id,
            armorAmount: config.armorAmount,
            totalArmor: player.armorHP
        });
    }
    
    /**
     * Calculate max HP based on level and class
     * Uses same logic as existing systems
     */
    private calculateMaxHP(level: number, characterClass: string): number {
        // Base HP varies by class (Guardian has more)
        let baseHP = 3;
        if (characterClass === 'guardian') {
            baseHP = 4;
        }
        
        // +1 HP at levels 3, 5, 7, 9
        const bonusLevels = [3, 5, 7, 9];
        const bonusHP = bonusLevels.filter(lvl => level >= lvl).length;
        
        return baseHP + bonusHP;
    }
    
    /**
     * Main update loop - clean up expired effects and powerups
     * Called from main server game loop
     */
    update(deltaTime: number): void {
        const now = Date.now();
        
        // Clean up expired world powerups (backup cleanup)
        for (const [id, powerup] of this.worldPowerups) {
            if (now > powerup.expiresAt) {
                console.log(`[PowerupManager] Powerup ${id} expired, removing`);
                this.removePowerup(id);
            }
        }
        
        // TODO: Phase 3+ - Clean up expired player effects
        // Will implement when we add temporary effects like speed/damage
    }
    
    /**
     * Get all powerups in world (for debugging/admin)
     */
    getWorldPowerups(): PowerupState[] {
        return Array.from(this.worldPowerups.values());
    }
    
    /**
     * Get active effects for a player (for debugging/admin) 
     */
    getPlayerEffects(playerId: string): PowerupEffect[] {
        return Array.from(this.activeEffects.values())
            .filter(effect => effect.playerId === playerId);
    }
    
    /**
     * Clean up all powerup state for a player (called on disconnect)
     */
    cleanupPlayer(playerId: string): void {
        // Remove player-specific timeouts
        const timeoutKeysToDelete: string[] = [];
        this.cleanupTimeouts.forEach((timeout, key) => {
            if (key.includes(playerId)) {
                clearTimeout(timeout);
                timeoutKeysToDelete.push(key);
            }
        });
        
        timeoutKeysToDelete.forEach(key => {
            this.cleanupTimeouts.delete(key);
        });
        
        // Remove player effects
        const effectKeysToDelete: string[] = [];
        this.activeEffects.forEach((effect, key) => {
            if (effect.playerId === playerId) {
                effectKeysToDelete.push(key);
            }
        });
        
        effectKeysToDelete.forEach(key => {
            this.activeEffects.delete(key);
        });
        
        console.log(`[PowerupManager] Cleaned up powerup state for player ${playerId}`);
    }
    
    /**
     * Clean up all resources (called on server shutdown)
     */
    cleanup(): void {
        // Clear all timeouts to prevent memory leaks
        for (const timeout of this.cleanupTimeouts.values()) {
            clearTimeout(timeout);
        }
        
        this.cleanupTimeouts.clear();
        this.worldPowerups.clear();
        this.activeEffects.clear();
        
        console.log('[PowerupManager] All powerup resources cleaned up');
    }
    
    /**
     * Get statistics for monitoring/debugging
     */
    getStats(): any {
        return {
            worldPowerups: this.worldPowerups.size,
            activeEffects: this.activeEffects.size,
            pendingTimeouts: this.cleanupTimeouts.size
        };
    }
}