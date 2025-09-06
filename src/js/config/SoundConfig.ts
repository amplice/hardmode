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
    
    // Class-specific combat sounds
    
    // Bladedancer
    'bladedancer_attack1': {
        src: 'assets/sounds/combat/bladedancer_attack_1.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    'bladedancer_attack2': {
        src: 'assets/sounds/combat/bladedancer_attack_2_effect.wav',  // Using effect sound for attack2
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    
    // Guardian
    'guardian_attack1': {
        src: 'assets/sounds/combat/guardian_attack_1.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    'guardian_attack2': {
        src: 'assets/sounds/combat/guardian_attack_2.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 3
    },
    
    // Hunter
    'hunter_attack1': {
        src: 'assets/sounds/combat/hunter_attack_1.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    'hunter_attack2': {
        src: 'assets/sounds/combat/hunter_attack_2.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    
    // Rogue
    'rogue_attack1': {
        src: 'assets/sounds/combat/rogue_attack_1.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    'rogue_attack2': {
        src: 'assets/sounds/combat/rogue_attack_2.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 5
    },
    
    // Universal roll sound
    'roll': {
        src: 'assets/sounds/combat/roll.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.HIGH,
        pool: 3
    },
    
    // ============================================
    // MONSTER SOUNDS
    // ============================================
    
    'ghoul_attack': {
        src: 'assets/sounds/monsters/ghoul_attack.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 5
    },
    'ogre_attack': {
        src: 'assets/sounds/monsters/ogre_melee_attack.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 5
    },
    'ogre_spin': {
        src: 'assets/sounds/monsters/ogre_spin_attack.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 3
    },
    'darkmage_attack': {
        src: 'assets/sounds/monsters/dark_mage_ranged_attack.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 5
    },
    'darkmage_special': {
        src: 'assets/sounds/monsters/dark_mage_special_attack.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 3
    },
    'skeleton_attack': {
        src: 'assets/sounds/monsters/skeleton_attack.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 5
    },
    'wolf_attack': {
        src: 'assets/sounds/monsters/wolf_melee_attack.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 5
    },
    'wolf_special_jump': {
        src: 'assets/sounds/monsters/wolf_special_attack_jump.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 3
    },
    'wolf_special_land': {
        src: 'assets/sounds/monsters/wolf_special_attack_land.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 3
    },
    'wingeddemon_attack': {
        src: 'assets/sounds/monsters/winged_demon_melee_attack.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 5
    },
    'wingeddemon_spell': {
        src: 'assets/sounds/monsters/winged_demon_special_attack.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 5
    },
    'wildarcher_attack': {
        src: 'assets/sounds/monsters/wild_archer_attack.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 5
    },
    'elemental_attack': {
        src: 'assets/sounds/monsters/elemental_attack.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 5
    },
    
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
 */
export function getMonsterSound(monsterType: string, soundType: 'attack' | 'hurt' | 'death' | 'special'): string | null {
    const soundMap: { [key: string]: { [key: string]: string } } = {
        'ghoul': {
            'attack': 'ghoul_attack'
        },
        'ogre': {
            'attack': 'ogre_attack',
            'special': 'ogre_spin'  // Ogre spin attack
        },
        'darkmage': {
            'attack': 'darkmage_attack',
            'special': 'darkmage_special'  // Dark mage special attack
        },
        'skeleton': {
            'attack': 'skeleton_attack'
        },
        'wolf': {
            'attack': 'wolf_attack',
            'special': 'wolf_special_land'  // Wolf jump attack - using land sound
        },
        'wingeddemon': {
            'attack': 'wingeddemon_attack',
            'special': 'wingeddemon_spell'
        },
        'wildarcher': {
            'attack': 'wildarcher_attack'
        },
        'elemental': {
            'attack': 'elemental_attack'
        }
    };
    
    return soundMap[monsterType]?.[soundType] || null;
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