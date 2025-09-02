# Sound Effects List

This document lists all sound effects needed for the game. Update this as needed when adding/removing sounds.

## Combat Sounds

### Player Attack Sounds
Each class has 2 unique attack sounds, plus one universal roll sound.

| Class | Attack 1 | Attack 2 | Roll |
|-------|----------|----------|------|
| **Bladedancer** | `bladedancer_attack1.ogg` | `bladedancer_attack2.ogg` | `roll.ogg` |
| **Guardian** | `guardian_attack1.ogg` | `guardian_attack2.ogg` | `roll.ogg` |
| **Hunter** | `hunter_attack1.ogg` | `hunter_attack2.ogg` | `roll.ogg` |
| **Rogue** | `rogue_attack1.ogg` | `rogue_attack2.ogg` | `roll.ogg` |

**Total: 9 files** (8 attack sounds + 1 roll sound)

File location: `src/assets/sounds/combat/`

### Impact/Hit Sounds

| Sound | File | Description |
|-------|------|-------------|
| Physical Hit | `hit_physical.ogg` | Melee weapon impacts |
| Magical Hit | `hit_magical.ogg` | Magic damage impacts |
| Arrow Hit | `hit_arrow.ogg` | Projectile impacts |
| Blocked Hit | `hit_blocked.ogg` | Armor absorption/block |

**Total: 4 files**

File location: `src/assets/sounds/impacts/`

## Monster Sounds

### Basic Monster Set (Phase 1)
Start with essential sounds for each monster type:

| Monster | Attack | Death | Notes |
|---------|--------|-------|-------|
| **Ogre** | `ogre_attack.ogg` | `ogre_death.ogg` | Add spin sound later |
| **Skeleton** | `skeleton_attack.ogg` | `skeleton_death.ogg` | Bone rattle |
| **Elemental** | `elemental_attack.ogg` | `elemental_death.ogg` | Magical burst |
| **Ghoul** | `ghoul_attack.ogg` | `ghoul_death.ogg` | Screech |
| **Wild Archer** | `archer_attack.ogg` | `archer_death.ogg` | Arrow shot |
| **Dark Mage** | `mage_attack.ogg` | `mage_death.ogg` | Shadow bolt |
| **Wolf** | `wolf_attack.ogg` | `wolf_death.ogg` | Bite/growl |
| **Winged Demon** | `demon_attack.ogg` | `demon_death.ogg` | Claw swipe |

**Total: 16 files** (8 attack + 8 death)

File location: `src/assets/sounds/monsters/`

### Monster Special Attacks (Phase 2 - Optional)
Add these after basic sounds work:
- `ogre_spin.ogg` - Ogre spin attack (looping)
- `mage_teleport.ogg` - Dark Mage teleport
- `wolf_pounce.ogg` - Wolf jump attack
- `demon_infernal.ogg` - Winged Demon AOE

## Player Feedback Sounds

| Sound | File | Description |
|-------|------|-------------|
| Player Hurt | `player_hurt.ogg` | Damage taken (3 variations optional) |
| Player Death | `player_death.ogg` | Death sound |
| Player Respawn | `player_respawn.ogg` | Respawn effect |

**Total: 3 files** (minimum)

File location: `src/assets/sounds/player/`

## UI Sounds

### Essential UI Sounds

| Sound | File | Description |
|-------|------|-------------|
| Level Up | `level_up.ogg` | Level increase fanfare |
| XP Gain | `xp_gain.ogg` | Small XP tick |
| Ability Unlock | `ability_unlock.ogg` | Roll unlocked at level 5 |

**Total: 3 files**

File location: `src/assets/sounds/ui/`

## Powerup Sounds

| Sound | File | Description |
|-------|------|-------------|
| Powerup Pickup | `powerup_pickup.ogg` | Universal pickup sound |

**Total: 1 file** (use same sound for all powerup types initially)

File location: `src/assets/sounds/powerups/`

## Movement Sounds (Optional - Phase 3)

Footstep sounds can be added later:
- `footstep_grass.ogg` - Grass terrain
- `footstep_snow.ogg` - Snow terrain  
- `footstep_stone.ogg` - Stone/cliff terrain

---

## Priority Order for Implementation

### Phase 1: Core Combat (13 files)
1. Player attack sounds (8 files)
2. Roll sound (1 file)
3. Physical hit impact (1 file)
4. Player hurt (1 file)
5. Player death (1 file)
6. Level up (1 file)

### Phase 2: Monsters (16 files)
1. Monster attacks (8 files)
2. Monster deaths (8 files)

### Phase 3: Polish (remaining)
1. Additional hit types
2. Powerup sounds
3. UI sounds
4. Movement sounds

---

## File Format Guidelines

- **Format**: `.ogg` preferred (smaller, better compatibility)
- **Fallback**: `.mp3` if needed
- **Size**: Keep under 100KB per file
- **Quality**: 44.1kHz, mono is fine
- **Length**: 
  - Attack sounds: 0.2-0.5 seconds
  - Death sounds: 0.5-1.5 seconds
  - UI sounds: 0.3-1.0 seconds
  - Roll: 0.3-0.5 seconds

## Testing Sounds

To test without actual sound files, you can:
1. Use any `.ogg` file renamed to match the list
2. Generate placeholder sounds with [Bfxr](https://www.bfxr.net/)
3. Download free sounds from [freesound.org](https://freesound.org)