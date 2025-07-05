"use strict";
/**
 * @fileoverview CalculationEngine - Centralized server-side combat calculation system
 *
 * PHASE 3.1 IMPLEMENTATION
 * Centralizes all combat-related calculations to ensure consistency and prevent
 * client-side manipulation. This is the single source of truth for:
 * - Damage calculations
 * - Stat calculations
 * - Level progression
 * - Combat timing (cooldowns, recovery)
 *
 * SECURITY: All calculations must happen server-side to prevent exploits
 * CONSISTENCY: Single location for all combat math ensures uniform behavior
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculationEngine = void 0;
// Phase 4.1: Updated imports to include ATTACK_DEFINITIONS
const GameConstants_js_1 = require("../../shared/constants/GameConstants.js");
class CalculationEngine {
    /**
     * Calculate attack damage based on attacker stats and attack type
     * This replaces client-sent damage values for security
     *
     * @param attacker - The attacking entity (player)
     * @param attackType - 'primary' or 'secondary'
     * @param target - The target entity (monster or player)
     * @param attackerClass - Character class for attack lookup
     * @returns Calculated damage value
     */
    static calculateAttackDamage(attacker, attackType, target, attackerClass) {
        // Validate inputs
        if (!attacker || !attackerClass) {
            console.warn('[CalculationEngine] Invalid attacker or class');
            return 0;
        }
        if (attackType !== 'primary' && attackType !== 'secondary') {
            console.warn('[CalculationEngine] Invalid attack type:', attackType);
            return 0;
        }
        // Get base damage from attack definitions
        const baseDamage = this.getBaseAttackDamage(attackerClass, attackType);
        // Future: Apply damage modifiers, criticals, resistances here
        // For now, return base damage to maintain current game balance
        return baseDamage;
    }
    /**
     * Get base attack damage for a class and attack type
     * Phase 4.1: Now uses shared ATTACK_DEFINITIONS from GameConstants
     *
     * @param characterClass - Character class
     * @param attackType - 'primary' or 'secondary'
     * @returns Base damage value
     */
    static getBaseAttackDamage(characterClass, attackType) {
        // First try class-specific attack definition
        const classAttackKey = `${characterClass}_${attackType}`;
        let attackDef = GameConstants_js_1.ATTACK_DEFINITIONS[classAttackKey];
        // Fall back to default attack if no class-specific one exists
        if (!attackDef) {
            attackDef = GameConstants_js_1.ATTACK_DEFINITIONS[attackType];
        }
        // Final fallback if still no definition found
        if (!attackDef) {
            console.warn('[CalculationEngine] No attack definition found for:', characterClass, attackType);
            return 1; // Default damage
        }
        return attackDef.damage || 1;
    }
    /**
     * Get full attack configuration for server-side processing
     * Phase 4.1: Provides attack timing, hitbox, and archetype info
     *
     * @param characterClass - Character class
     * @param attackType - 'primary' or 'secondary'
     * @returns Complete attack definition
     */
    static getAttackDefinition(characterClass, attackType) {
        // First try class-specific attack definition
        const classAttackKey = `${characterClass}_${attackType}`;
        let attackDef = GameConstants_js_1.ATTACK_DEFINITIONS[classAttackKey];
        // Fall back to default attack if no class-specific one exists
        if (!attackDef) {
            attackDef = GameConstants_js_1.ATTACK_DEFINITIONS[attackType];
        }
        // Return clone to prevent accidental modifications
        return attackDef ? { ...attackDef } : null;
    }
    /**
     * Calculate projectile damage (for Hunter and Wild Archer)
     *
     * @param owner - The entity that created the projectile
     * @param projectileType - Type of projectile for damage lookup
     * @returns Projectile damage
     */
    static calculateProjectileDamage(owner, projectileType) {
        // Player projectiles
        if ('characterClass' in owner) {
            // Hunter primary attack creates projectiles
            return this.getBaseAttackDamage(owner.characterClass, 'primary');
        }
        // Monster projectiles (Wild Archer)
        if ('type' in owner && owner.type === 'wildarcher') {
            return GameConstants_js_1.MONSTER_STATS.wildarcher.damage;
        }
        return 1; // Default projectile damage
    }
    /**
     * Calculate attack cooldown with bonuses applied
     *
     * @param baseCooldown - Base cooldown in milliseconds
     * @param cooldownBonus - Bonus (negative values reduce cooldown)
     * @returns Final cooldown value
     */
    static calculateCooldown(baseCooldown, cooldownBonus = 0) {
        return Math.max(100, baseCooldown + cooldownBonus); // Minimum 100ms cooldown
    }
    /**
     * Calculate attack recovery with bonuses applied
     *
     * @param baseRecovery - Base recovery in milliseconds
     * @param recoveryBonus - Bonus (negative values reduce recovery)
     * @returns Final recovery value
     */
    static calculateRecovery(baseRecovery, recoveryBonus = 0) {
        return Math.max(50, baseRecovery + recoveryBonus); // Minimum 50ms recovery
    }
    /**
     * Calculate maximum HP for a player
     *
     * @param playerClass - Character class
     * @param level - Current level
     * @returns Maximum HP
     */
    static calculateMaxHP(playerClass, level) {
        const stats = GameConstants_js_1.PLAYER_STATS[playerClass];
        if (!stats) {
            console.warn('[CalculationEngine] Unknown player class for HP:', playerClass);
            return 3; // Default HP
        }
        const baseHP = stats.hp;
        // Level 10 bonus: +1 max HP
        const levelBonus = level >= 10 ? 1 : 0;
        return baseHP + levelBonus;
    }
    /**
     * Calculate player level from XP
     * Supports both playtest mode (linear) and normal mode (triangular)
     *
     * @param xp - Current XP value
     * @param usePlaytestMode - Whether to use simplified progression
     * @returns Calculated level (1-10)
     */
    static calculateLevelFromXP(xp, usePlaytestMode = false) {
        const maxLevel = GameConstants_js_1.GAME_CONSTANTS.LEVELS.MAX_LEVEL;
        const xpGrowth = GameConstants_js_1.GAME_CONSTANTS.LEVELS.XP_GROWTH;
        const playtestXpPerLevel = GameConstants_js_1.GAME_CONSTANTS.LEVELS.PLAYTEST_XP_PER_LEVEL;
        if (usePlaytestMode) {
            // Playtest mode: 20 XP per level
            return Math.min(maxLevel, Math.floor(xp / playtestXpPerLevel) + 1);
        }
        // Normal mode: Triangular number progression
        // XP requirements: 0, 20, 60, 120, 200, 300, 420, 560, 720, 900
        let level = 1;
        let totalXPRequired = 0;
        for (let i = 1; i <= maxLevel; i++) {
            if (xp >= totalXPRequired) {
                level = i;
            }
            else {
                break;
            }
            // Next level requires (i * xpGrowth) more XP
            totalXPRequired += i * xpGrowth;
        }
        return Math.min(maxLevel, level);
    }
    /**
     * Calculate XP required for next level
     *
     * @param currentLevel - Current level
     * @param usePlaytestMode - Whether to use simplified progression
     * @returns XP required for next level
     */
    static calculateXPForNextLevel(currentLevel, usePlaytestMode = false) {
        const maxLevel = GameConstants_js_1.GAME_CONSTANTS.LEVELS.MAX_LEVEL;
        const xpGrowth = GameConstants_js_1.GAME_CONSTANTS.LEVELS.XP_GROWTH;
        const playtestXpPerLevel = GameConstants_js_1.GAME_CONSTANTS.LEVELS.PLAYTEST_XP_PER_LEVEL;
        if (currentLevel >= maxLevel)
            return 0; // Max level
        if (usePlaytestMode) {
            return playtestXpPerLevel; // Always 20 XP to next level in playtest mode
        }
        // Normal mode: Next level requires (nextLevel * xpGrowth) more XP
        return (currentLevel + 1) * xpGrowth;
    }
    /**
     * Calculate stun duration for different damage sources
     *
     * @param damageSource - 'player_attack', 'projectile', etc.
     * @returns Stun duration in seconds
     */
    static calculateStunDuration(damageSource) {
        // Currently all damage sources use the same stun duration
        // This could be expanded for different stun durations per attack
        return GameConstants_js_1.GAME_CONSTANTS.MONSTER?.DAMAGE_STUN_DURATION || 0.5;
    }
    /**
     * Calculate spawn protection duration
     *
     * @returns Spawn protection duration in seconds
     */
    static calculateSpawnProtection() {
        return GameConstants_js_1.GAME_CONSTANTS.PLAYER.SPAWN_PROTECTION_DURATION || 3;
    }
    /**
     * Apply level-based stat bonuses to a player
     * This centralizes the bonus application logic
     *
     * @param player - Player object to apply bonuses to
     * @param oldLevel - Previous level
     * @param newLevel - New level
     */
    static applyLevelBonuses(player, oldLevel, newLevel) {
        // Validate inputs
        if (!player || typeof oldLevel !== 'number' || typeof newLevel !== 'number') {
            console.warn('[CalculationEngine] Invalid inputs to applyLevelBonuses');
            return;
        }
        // Only apply bonuses if level increased
        if (newLevel <= oldLevel)
            return;
        // Initialize bonus fields if missing (defensive programming)
        if (typeof player.moveSpeedBonus !== 'number')
            player.moveSpeedBonus = 0;
        if (typeof player.attackRecoveryBonus !== 'number')
            player.attackRecoveryBonus = 0;
        if (typeof player.attackCooldownBonus !== 'number')
            player.attackCooldownBonus = 0;
        if (typeof player.rollUnlocked !== 'boolean')
            player.rollUnlocked = false;
        // Check each level between old and new for bonuses
        for (let level = oldLevel + 1; level <= newLevel; level++) {
            switch (level) {
                case 2:
                case 6:
                    player.moveSpeedBonus += 0.25;
                    break;
                case 3:
                case 7:
                    player.attackRecoveryBonus -= 25; // Negative = reduction (faster recovery)
                    break;
                case 4:
                case 8:
                    player.attackCooldownBonus -= 100; // Negative = reduction (faster cooldown)
                    break;
                case 5:
                    player.rollUnlocked = true;
                    break;
                case 10:
                    // Max HP bonus handled separately in calculateMaxHP
                    player.maxHp = this.calculateMaxHP(player.characterClass, level);
                    player.hp = player.maxHp; // Full heal at level 10
                    break;
            }
        }
    }
}
exports.CalculationEngine = CalculationEngine;
