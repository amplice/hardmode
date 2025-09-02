/**
 * @fileoverview Sound configuration and loading definitions
 * 
 * Defines all game sounds and their properties for the SoundManager
 */

import { SoundCategory, SoundPriority } from '../systems/SoundManager.js';

/**
 * Master list of all game sounds
 * Note: Actual sound files need to be added to src/assets/sounds/
 */
export const SOUND_CONFIG = {
    // ============================================
    // PLAYER COMBAT SOUNDS
    // ============================================
    
    // Using universal sounds for all classes temporarily
    
    // Bladedancer
    'bladedancer_attack1': {
        src: 'assets/sounds/combat/attack1_universal.wav',  // attack_knight.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    'bladedancer_attack2': {
        src: 'assets/sounds/combat/attack2_universal.wav',  // axe_boss.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    
    // Guardian
    'guardian_attack1': {
        src: 'assets/sounds/combat/attack1_universal.wav',  // attack_knight.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    'guardian_attack2': {
        src: 'assets/sounds/combat/attack2_universal.wav',  // axe_boss.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 3
    },
    
    // Hunter
    'hunter_attack1': {
        src: 'assets/sounds/combat/attack1_universal.wav',  // attack_knight.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    'hunter_attack2': {
        src: 'assets/sounds/combat/attack2_universal.wav',  // axe_boss.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    
    // Rogue
    'rogue_attack1': {
        src: 'assets/sounds/combat/attack1_universal.wav',  // attack_knight.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    'rogue_attack2': {
        src: 'assets/sounds/combat/attack2_universal.wav',  // axe_boss.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    
    // Universal roll sound
    'roll': {
        src: 'assets/sounds/combat/roll_universal.wav',  // jump_knight.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 3
    },
    
    // ============================================
    // MONSTER SOUNDS - TO BE CONFIGURED
    // ============================================
    
    // Monster sounds will be added here as specified
    
    // ============================================
    // HIT & IMPACT SOUNDS
    // ============================================
    
    'hit_physical': {
        src: 'assets/sounds/impacts/hit_physical.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 10  // Many simultaneous hits possible
    },
    'hit_magical': {
        src: 'assets/sounds/impacts/hit_magical.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 10
    },
    'hit_arrow': {
        src: 'assets/sounds/impacts/hit_arrow.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 8
    },
    'hit_blocked': {
        src: 'assets/sounds/impacts/hit_blocked.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    
    // ============================================
    // PLAYER FEEDBACK SOUNDS
    // ============================================
    
    'player_hurt': {
        src: 'assets/sounds/player/player_hurt.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 3
    },
    'player_death': {
        src: 'assets/sounds/player/death.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.CRITICAL,
        pool: 1
    },
    'player_respawn': {
        src: 'assets/sounds/player/respawn.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.CRITICAL,
        pool: 1
    },
    
    // ============================================
    // UI & PROGRESSION SOUNDS
    // ============================================
    
    'level_up': {
        src: 'assets/sounds/ui/level_up.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.CRITICAL,
        pool: 1
    },
    'xp_gain': {
        src: 'assets/sounds/ui/xp_tick.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 0.3
    },
    'ability_unlock': {
        src: 'assets/sounds/ui/ability_unlock.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.CRITICAL,
        pool: 1
    },
    
    // ============================================
    // POWERUP SOUNDS
    // ============================================
    
    'powerup_spawn': {
        src: 'assets/sounds/powerups/spawn.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 3
    },
    'powerup_health': {
        src: 'assets/sounds/powerups/health.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.HIGH,
        pool: 2
    },
    'powerup_armor': {
        src: 'assets/sounds/powerups/armor.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.HIGH,
        pool: 2
    },
    'powerup_speed': {
        src: 'assets/sounds/powerups/speed.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.HIGH,
        pool: 2
    },
    'powerup_damage': {
        src: 'assets/sounds/powerups/damage.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.HIGH,
        pool: 2
    },
    
    // ============================================
    // MOVEMENT SOUNDS
    // ============================================
    
    'footstep': {
        src: 'assets/sounds/movement/walk_universal.wav',  // walk_knight.wav
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 2,
        volume: 0.3
    },
    
    // ============================================
    // UI SOUNDS
    // ============================================
    
    'ui_click': {
        src: 'assets/sounds/ui/click.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.HIGH,
        pool: 3,
        volume: 0.5
    },
    'ui_hover': {
        src: 'assets/sounds/ui/hover.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.LOW,
        pool: 2,
        volume: 0.3
    },
    'chat_message': {
        src: 'assets/sounds/ui/chat.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.MEDIUM,
        pool: 2,
        volume: 0.4
    }
};

/**
 * Helper to get the appropriate player attack sound
 */
export function getPlayerAttackSound(characterClass: string, attackType: string): string | null {
    // Roll is universal for all classes
    if (attackType === 'roll') {
        return 'roll';
    }
    
    // Map attack types to sound names
    const soundMap: { [key: string]: { [key: string]: string } } = {
        'bladedancer': {
            'primary': 'bladedancer_attack1',
            'secondary': 'bladedancer_attack2'
        },
        'guardian': {
            'primary': 'guardian_attack1',
            'secondary': 'guardian_attack2'
        },
        'hunter': {
            'primary': 'hunter_attack1',
            'secondary': 'hunter_attack2'
        },
        'rogue': {
            'primary': 'rogue_attack1',
            'secondary': 'rogue_attack2'
        }
    };
    
    return soundMap[characterClass]?.[attackType] || null;
}

/**
 * Helper to get the appropriate monster sound
 * TO BE IMPLEMENTED - will map monster types to their sound effects
 */
export function getMonsterSound(monsterType: string, soundType: 'attack' | 'hurt' | 'death' | 'special'): string | null {
    // Monster sound mapping will be added as specified
    return null;
}

/**
 * Helper to get footstep sound based on terrain
 * Currently using universal footstep sound for all terrains
 */
export function getFootstepSound(biomeType: number): string {
    // Using universal footstep sound for now
    return 'footstep';
}

/**
 * Helper to get powerup sound
 */
export function getPowerupSound(powerupType: string): string {
    const soundMap: { [key: string]: string } = {
        'health': 'powerup_health',
        'armor': 'powerup_armor',
        'speed': 'powerup_speed',
        'damage': 'powerup_damage',
        'invulnerability': 'powerup_damage'  // Use same as damage for now
    };
    
    return soundMap[powerupType] || 'powerup_health';
}