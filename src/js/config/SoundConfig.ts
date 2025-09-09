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
        src: 'assets/sounds/combat/bladedancer_attack_2.ogg',  // Combined charge + effect sound
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
        src: 'assets/sounds/combat/guardian_attack_2.ogg',
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
    
    // Monster hit sounds
    'monster_hit_flesh': {
        src: 'assets/sounds/monsters/monster_hit_flesh.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 8
    },
    'monster_hit_leather': {
        src: 'assets/sounds/monsters/monster_hit_leather.wav',
        category: SoundCategory.SFX,
        priority: SoundPriority.MEDIUM,
        pool: 8
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
        src: 'assets/sounds/ui/level_up_new.wav',  // Using Generic_Rune_Interact sound
        category: SoundCategory.UI,
        priority: SoundPriority.CRITICAL,
        pool: 1
    },
    'xp_gain': {
        src: 'assets/sounds/ui/xp_tick.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
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
    'powerup_pickup': {
        src: 'assets/sounds/powerups/powerup_pickup.wav',  // Using 01_Holy_Cast sound
        category: SoundCategory.UI,
        priority: SoundPriority.HIGH,
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
        volume: 1.0
    },
    'ui_hover': {
        src: 'assets/sounds/ui/hover.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.LOW,
        pool: 2,
        volume: 1.0
    },
    'chat_message': {
        src: 'assets/sounds/ui/chat.wav',
        category: SoundCategory.UI,
        priority: SoundPriority.MEDIUM,
        pool: 2,
        volume: 1.0
    },
    
    // ============================================
    // FOOTSTEP SOUNDS - Class + Biome combinations
    // All use the same file for now, but separated for future customization
    // ============================================
    
    // Bladedancer footsteps
    'footstep_bladedancer_grass': {
        src: 'assets/sounds/footsteps/footstep_default.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_bladedancer_snow': {
        src: 'assets/sounds/footsteps/footstep_snow.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_bladedancer_desert': {
        src: 'assets/sounds/footsteps/footstep_default.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_bladedancer_darkgrass': {
        src: 'assets/sounds/footsteps/footstep_default.ogg',  // Same as grass
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    
    // Guardian footsteps
    'footstep_guardian_grass': {
        src: 'assets/sounds/footsteps/footstep_default.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_guardian_snow': {
        src: 'assets/sounds/footsteps/footstep_snow.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_guardian_desert': {
        src: 'assets/sounds/footsteps/footstep_default.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_guardian_darkgrass': {
        src: 'assets/sounds/footsteps/footstep_default.ogg',  // Same as grass
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    
    // Hunter footsteps
    'footstep_hunter_grass': {
        src: 'assets/sounds/footsteps/footstep_grass_light.ogg',  // Lighter grass sound
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_hunter_snow': {
        src: 'assets/sounds/footsteps/footstep_snow_light.ogg',  // Lighter snow sound
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_hunter_desert': {
        src: 'assets/sounds/footsteps/footstep_default.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_hunter_darkgrass': {
        src: 'assets/sounds/footsteps/footstep_grass_light.ogg',  // Same as light grass
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    
    // Rogue footsteps
    'footstep_rogue_grass': {
        src: 'assets/sounds/footsteps/footstep_grass_light.ogg',  // Lighter grass sound
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_rogue_snow': {
        src: 'assets/sounds/footsteps/footstep_snow_light.ogg',  // Lighter snow sound
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_rogue_desert': {
        src: 'assets/sounds/footsteps/footstep_default.ogg',
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    },
    'footstep_rogue_darkgrass': {
        src: 'assets/sounds/footsteps/footstep_default.ogg',  // Same as grass
        category: SoundCategory.SFX,
        priority: SoundPriority.LOW,
        pool: 3,
        volume: 1.0
    }
};

/**
 * Background music tracks configuration
 */
export const MUSIC_TRACKS = [
    { name: 'Goblins Den', src: 'assets/sounds/music/Goblins_Den_(Regular).wav' },
    { name: 'Pixel 1', src: 'assets/sounds/music/Pixel 1.ogg' },
    { name: 'Pixel 2', src: 'assets/sounds/music/Pixel 2.ogg' },
    { name: 'Pixel 3', src: 'assets/sounds/music/Pixel 3.ogg' },
    { name: 'Pixel 4', src: 'assets/sounds/music/Pixel 4.ogg' },
    { name: 'Pixel 5', src: 'assets/sounds/music/Pixel 5.ogg' },
    { name: 'Pixel 6', src: 'assets/sounds/music/Pixel 6.ogg' },
    { name: 'Pixel 7', src: 'assets/sounds/music/Pixel 7.ogg' },
    { name: 'Pixel 8', src: 'assets/sounds/music/Pixel 8.ogg' },
    { name: 'Pixel 9', src: 'assets/sounds/music/Pixel 9.ogg' },
    { name: 'Pixel 10', src: 'assets/sounds/music/Pixel 10.ogg' },
    { name: 'Pixel 11', src: 'assets/sounds/music/Pixel 11.ogg' },
    { name: 'Pixel 12', src: 'assets/sounds/music/Pixel 12.ogg' }
];

/**
 * Helper to get the appropriate footstep sound
 */
export function getFootstepSound(characterClass: string, biome: string): string | null {
    // Map biome numbers to biome names
    const biomeNames: { [key: number]: string } = {
        0: 'grass',      // Light grass
        1: 'darkgrass',  // Dark grass
        2: 'snow',       // Snow  
        3: 'desert'      // Desert (unused for now)
    };
    
    // Get biome name from number or use directly if already a string
    const biomeName = typeof biome === 'number' ? biomeNames[biome] : biome;
    
    // Fallback to grass if unknown biome
    const finalBiome = biomeName || 'grass';
    
    // Construct the sound key
    const soundKey = `footstep_${characterClass}_${finalBiome}`;
    
    // Check if the sound exists in our config
    return SOUND_CONFIG[soundKey as keyof typeof SOUND_CONFIG] ? soundKey : null;
}

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
            'attack': 'ghoul_attack',
            'hurt': 'monster_hit_flesh'
        },
        'ogre': {
            'attack': 'ogre_attack',
            'special': 'ogre_spin',  // Ogre spin attack
            'hurt': 'monster_hit_flesh'
        },
        'darkmage': {
            'attack': 'darkmage_attack',
            'special': 'darkmage_special',  // Dark mage special attack
            'hurt': 'monster_hit_leather'  // Dark Mage uses leather sound
        },
        'skeleton': {
            'attack': 'skeleton_attack',
            'hurt': 'monster_hit_leather'  // Skeleton uses leather sound
        },
        'wolf': {
            'attack': 'wolf_attack',
            'special': 'wolf_special_land',  // Wolf jump attack - using land sound
            'hurt': 'monster_hit_flesh'
        },
        'wingeddemon': {
            'attack': 'wingeddemon_attack',
            'special': 'wingeddemon_spell',
            'hurt': 'monster_hit_flesh'
        },
        'wildarcher': {
            'attack': 'wildarcher_attack',
            'hurt': 'monster_hit_flesh'
        },
        'elemental': {
            'attack': 'elemental_attack',
            'hurt': 'monster_hit_flesh'
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