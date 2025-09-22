/**
 * @fileoverview SpriteManager - Client-side sprite loading and animation management
 * 
 * MIGRATION NOTES:
 * - Converted from SpriteManager.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 3
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for sprite configurations
 * - Preserved all animation naming patterns and loading behavior
 */

import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG, MONSTER_CONFIG } from '../../config/GameConfig.js';
import { directionStringToAnimationSuffix } from '../../utils/DirectionUtils.js';
import { AtlasManager } from './AtlasManager.js';

// Type definitions for sprite configurations
interface FrameSize {
    width: number;
    height: number;
}

interface AnimationConfig {
    keySuffix: string;
    path: string;
    columns: number;
    rows: number;
}

interface CharacterSpriteConfig {
    keyPrefix: string;
    type: 'character' | 'monster';
    defaultFrameSize?: FrameSize;
    animations: AnimationConfig[];
}

interface EffectSpriteConfig {
    keyPrefix: string;
    type: 'effect';
    path: string;
    columns: number;
    rows: number;
    rowIndex: number;
    frameSize: FrameSize;
}

type SpriteConfig = CharacterSpriteConfig | EffectSpriteConfig;

interface AnimationData {
    textures: PIXI.Texture[];
    speed: number;
}

// Sprite sheet configuration data
const SPRITE_SHEET_CONFIG: SpriteConfig[] = [
    // Characters
    {
        keyPrefix: 'knight', type: 'character',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Knight/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Knight/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Knight/RunBackwards.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Knight/StrafeLeft.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Knight/StrafeRight.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Knight/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Knight/Attack2.png', columns: 15, rows: 8 },
            { keySuffix: 'roll', path: 'assets/sprites/characters/Knight/Rolling.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Knight/Die.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Knight/TakeDamage.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'guardian', type: 'character',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Guardian/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Guardian/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Guardian/RunBackwards.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Guardian/StrafeLeft.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Guardian/StrafeRight.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Guardian/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Guardian/AttackRun.png', columns: 15, rows: 8 },
            { keySuffix: 'roll', path: 'assets/sprites/characters/Guardian/FrontFlip.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Guardian/Die.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Guardian/TakeDamage.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'rogue', type: 'character',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Rogue/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Rogue/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Rogue/RunBackwards.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Rogue/StrafeLeft.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Rogue/StrafeRight.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Rogue/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Rogue/Special2.png', columns: 15, rows: 8 },
            { keySuffix: 'roll', path: 'assets/sprites/characters/Rogue/QuickSlide.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Rogue/Die.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Rogue/TakeDamage.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'hunter', type: 'character',
        animations: [
            { keySuffix: 'idle', path: 'assets/sprites/characters/Hunter/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'run', path: 'assets/sprites/characters/Hunter/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'run_backward', path: 'assets/sprites/characters/Hunter/RunBackwards.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_left', path: 'assets/sprites/characters/Hunter/StrafeLeft.png', columns: 15, rows: 8 },
            { keySuffix: 'strafe_right', path: 'assets/sprites/characters/Hunter/StrafeRight.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/characters/Hunter/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/characters/Hunter/BackRoll.png', columns: 15, rows: 8 },
            { keySuffix: 'roll', path: 'assets/sprites/characters/Hunter/CrouchRun.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/characters/Hunter/Die.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/characters/Hunter/TakeDamage.png', columns: 15, rows: 8 },
        ]
    },
    // Monsters
    {
        keyPrefix: 'skeleton', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Skeleton/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Skeleton/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Skeleton/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Skeleton/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Skeleton/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'elemental', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Elemental/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Elemental/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Elemental/Attack4.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Elemental/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Elemental/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'ogre', type: 'monster',
        defaultFrameSize: { width: 192, height: 192 },
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Ogre/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Ogre/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Ogre/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack3', path: 'assets/sprites/monsters/Ogre/Attack3.png', columns: 15, rows: 8 },
            { keySuffix: 'attack3_windup', path: 'assets/sprites/monsters/Ogre/BlockStart.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Ogre/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Ogre/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'ghoul', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Ghoul/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Ghoul/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Ghoul/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Ghoul/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Ghoul/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'wildarcher', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/WildArcher/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/WildArcher/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/WildArcher/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/WildArcher/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/WildArcher/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'darkmage', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/DarkMage/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/DarkMage/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/DarkMage/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/monsters/DarkMage/Attack2.png', columns: 15, rows: 8 },
            { keySuffix: 'special1', path: 'assets/sprites/monsters/DarkMage/Special1.png', columns: 15, rows: 8 },
            { keySuffix: 'special1_windup', path: 'assets/sprites/monsters/DarkMage/Special1.png', columns: 15, rows: 8 },  // Will use first 10 frames in Monster.ts
            { keySuffix: 'special1_post', path: 'assets/sprites/monsters/DarkMage/Special1.png', columns: 15, rows: 8 },  // Will use last 5 frames in Monster.ts
            { keySuffix: 'quickshot', path: 'assets/sprites/monsters/DarkMage/QuickShot.png', columns: 14, rows: 8 },
            { keySuffix: 'pummel', path: 'assets/sprites/monsters/DarkMage/Pummel.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/DarkMage/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/DarkMage/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'wolf', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/Wolf/Run.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/Wolf/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/Wolf/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack2', path: 'assets/sprites/monsters/Wolf/Attack2.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/Wolf/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/Wolf/Die.png', columns: 15, rows: 8 },
        ]
    },
    {
        keyPrefix: 'wingeddemon', type: 'monster',
        animations: [
            { keySuffix: 'walk', path: 'assets/sprites/monsters/WingedDemon/Walk.png', columns: 15, rows: 8 },
            { keySuffix: 'idle', path: 'assets/sprites/monsters/WingedDemon/Idle.png', columns: 15, rows: 8 },
            { keySuffix: 'attack1', path: 'assets/sprites/monsters/WingedDemon/Attack1.png', columns: 15, rows: 8 },
            { keySuffix: 'attack5', path: 'assets/sprites/monsters/WingedDemon/Attack5.png', columns: 15, rows: 8 },
            { keySuffix: 'take_damage', path: 'assets/sprites/monsters/WingedDemon/TakeDamage.png', columns: 15, rows: 8 },
            { keySuffix: 'die', path: 'assets/sprites/monsters/WingedDemon/Die.png', columns: 15, rows: 8 },
        ]
    },
    // Effects
    {
        keyPrefix: 'slash_effect', type: 'effect', path: 'assets/sprites/effects/Slash.png',
        columns: 8, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'strike_windup', type: 'effect', path: 'assets/sprites/effects/KnightStrikeWindup.png',
        columns: 6, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'strike_cast', type: 'effect', path: 'assets/sprites/effects/KnightStrikeCast.png',
        columns: 7, rows: 9, rowIndex: 2, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'guardian_slash_effect', type: 'effect', path: 'assets/sprites/effects/GuardianAttack1.png',
        columns: 9, rows: 9, rowIndex: 0, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'guardian_jump_effect', type: 'effect', path: 'assets/sprites/effects/GuardianAttack2.png',
        columns: 12, rows: 9, rowIndex: 0, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'rogue_thrust_effect', type: 'effect', path: 'assets/sprites/effects/RogueAttack1.png',
        columns: 5, rows: 9, rowIndex: 3, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'rogue_dash_effect', type: 'effect', path: 'assets/sprites/effects/RogueAttack2.png',
        columns: 14, rows: 9, rowIndex: 3, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'bow_shot_effect', type: 'effect', path: 'assets/sprites/effects/579.png',
        columns: 9, rows: 9, rowIndex: 1, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'wildarcher_shot_effect', type: 'effect', path: 'assets/sprites/effects/579.png',
        columns: 9, rows: 9, rowIndex: 5, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'darkmage_shadowbolt_effect', type: 'effect', path: 'assets/sprites/effects/478.png',
        columns: 9, rows: 9, rowIndex: 1, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'wingeddemon_warning_effect', type: 'effect', path: 'assets/sprites/effects/20.png',
        columns: 14, rows: 9, rowIndex: 7, frameSize: { width: 64, height: 64 }  // 8th row (0-indexed)
    },
    {
        keyPrefix: 'wingeddemon_damage_effect', type: 'effect', path: 'assets/sprites/effects/529.png',
        columns: 13, rows: 9, rowIndex: 7, frameSize: { width: 64, height: 64 }  // 8th row (0-indexed)
    },
    {
        keyPrefix: 'hunter_cone_effect', type: 'effect', path: 'assets/sprites/effects/448.png',
        columns: 9, rows: 9, rowIndex: 1, frameSize: { width: 64, height: 64 }
    },
    {
        keyPrefix: 'level_up_effect', type: 'effect', path: 'assets/sprites/effects/LevelUp.png',
        columns: 23, rows: 9, rowIndex: 0, frameSize: { width: 64, height: 64 }
    },
    // Powerups (simple sprites, not animated)
    {
        keyPrefix: 'health_powerup', type: 'effect', path: 'assets/sprites/powerups/health_powerup.png',
        columns: 1, rows: 1, rowIndex: 0, frameSize: { width: 32, height: 32 }
    },
    {
        keyPrefix: 'armor_powerup', type: 'effect', path: 'assets/sprites/powerups/armor_powerup.png',
        columns: 1, rows: 1, rowIndex: 0, frameSize: { width: 32, height: 32 }
    },
    {
        keyPrefix: 'speed_powerup', type: 'effect', path: 'assets/sprites/powerups/speed_powerup.png',
        columns: 1, rows: 1, rowIndex: 0, frameSize: { width: 32, height: 32 }
    },
    {
        keyPrefix: 'damage_powerup', type: 'effect', path: 'assets/sprites/powerups/attack_powerup.png',
        columns: 1, rows: 1, rowIndex: 0, frameSize: { width: 32, height: 32 }
    },
    {
        keyPrefix: 'invulnerability_powerup', type: 'effect', path: 'assets/sprites/powerups/invulnerability_powerup.png',
        columns: 1, rows: 1, rowIndex: 0, frameSize: { width: 32, height: 32 }
    }
];

export class SpriteManager {
    private textures: Record<string, PIXI.Texture[]>;
    private animations: Record<string, AnimationData>;
    private loaded: boolean;
    private spriteScale: number;
    private frameWidth: number;
    private frameHeight: number;
    private atlasManager: AtlasManager | null;
    private useAtlases: boolean;

    constructor(useAtlases: boolean = true) {
        this.textures = {};
        this.animations = {};
        this.loaded = false;
        this.spriteScale = 1;
        this.frameWidth = 128;
        this.frameHeight = 128;
        this.atlasManager = null;
        this.useAtlases = useAtlases;
    }

    async loadSprites(): Promise<void> {
        // Try to load atlases first if enabled
        if (this.useAtlases) {
            try {
                console.log('[SpriteManager] Attempting to load texture atlases...');
                this.atlasManager = new AtlasManager();
                await this.atlasManager.loadAtlases();
                console.log('[SpriteManager] Successfully loaded texture atlases');
                
                // If atlases load successfully, we still need to fall back for now
                // since we don't have actual atlas files yet
                await this.loadIndividualSprites();
            } catch (error) {
                console.warn('[SpriteManager] Failed to load atlases, falling back to individual sprites:', error);
                this.useAtlases = false;
                await this.loadIndividualSprites();
            }
        } else {
            await this.loadIndividualSprites();
        }
            
        this.createAnimations();
        this.loaded = true;
        console.log("[SpriteManager] All sprites loaded successfully");
    }

    private async loadIndividualSprites(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const config of SPRITE_SHEET_CONFIG) {
            if (config.type === 'character' || config.type === 'monster') {
                for (const animConfig of config.animations) {
                    const key = `${config.keyPrefix}_${animConfig.keySuffix}`;
                    promises.push(this.loadSpritesheet(
                        key,
                        animConfig.path,
                        animConfig.columns,
                        animConfig.rows,
                        config.defaultFrameSize || null
                    ));
                }
                // Debug log for Wolf texture loading
                if (config.keyPrefix === 'wolf') {
                    console.log('[Wolf] Loading Wolf animations:', config.animations);
                }
            } else if (config.type === 'effect') {
                // Special handling for powerups - they're single images, not sprite sheets
                if (config.keyPrefix.endsWith('_powerup')) {
                    promises.push(this.loadSingleTexture(config.keyPrefix, config.path));
                } else {
                    promises.push(this.loadEffectSpritesheet(
                        config.keyPrefix,
                        config.path,
                        config.columns,
                        config.rows,
                        config.rowIndex,
                        config.frameSize
                    ));
                }
            }
        }

        await Promise.all(promises);
    }

    private async loadSpritesheet(
        name: string, 
        path: string, 
        columns: number, 
        rows: number, 
        customFrameSize: FrameSize | null = null
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            PIXI.Assets.load(path).then((texture: any) => {
                const frameWidth = customFrameSize ? customFrameSize.width : this.frameWidth;
                const frameHeight = customFrameSize ? customFrameSize.height : this.frameHeight;
                
                const directions = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
                
                for (let row = 0; row < rows; row++) {
                    if (row >= directions.length) break;
                    const direction = directions[row];
                    const frames: PIXI.Texture[] = [];
                    
                    for (let col = 0; col < columns; col++) {
                        const frameTexture = new PIXI.Texture(
                            texture.baseTexture,
                            new PIXI.Rectangle(
                                col * frameWidth,
                                row * frameHeight,
                                frameWidth,
                                frameHeight
                            )
                        );
                        frameTexture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                        frames.push(frameTexture);
                    }
                    this.textures[`${name}_${direction}`] = frames;
                }
                resolve();
            }).catch((error: any) => {
                console.error(`Failed to load spritesheet ${path} for key ${name}:`, error);
                reject(error);
            });
        });
    }

    private async loadEffectSpritesheet(
        name: string, 
        path: string, 
        columns: number, 
        totalRows: number, 
        rowIndex: number, 
        frameSize: FrameSize
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            PIXI.Assets.load(path).then((texture: any) => {
                const { width: frameWidth, height: frameHeight } = frameSize;
                const frames: PIXI.Texture[] = [];
                
                for (let col = 0; col < columns; col++) {
                    const frameTexture = new PIXI.Texture(
                        texture.baseTexture,
                        new PIXI.Rectangle(
                            col * frameWidth,
                            rowIndex * frameHeight,
                            frameWidth,
                            frameHeight
                        )
                    );
                    frameTexture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                    frames.push(frameTexture);
                }
                this.textures[name] = frames;
                resolve();
            }).catch((error: any) => {
                console.error(`Failed to load effect spritesheet ${path} for key ${name}:`, error);
                reject(error);
            });
        });
    }

    private async loadSingleTexture(name: string, path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            PIXI.Assets.load(path).then((texture: any) => {
                texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                // Store as single-item array to maintain consistency with the texture storage format
                this.textures[name] = [texture];
                console.log(`Loaded single texture ${name} from ${path}`);
                resolve();
            }).catch((error: any) => {
                console.error(`Failed to load texture ${path} for key ${name}:`, error);
                reject(error);
            });
        });
    }

    private _createDirectionalAnimations(
        entityType: string, 
        actionName: string, 
        properties: any, 
        directions: string[] = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne']
    ): void {
        if (entityType === 'darkmage' && actionName === 'pummel') {
            console.log('[DarkMage] Creating pummel animations with properties:', properties);
        }
        for (const direction of directions) {
            const textureKey = `${entityType}_${actionName}_${direction}`;
            if (!this.textures[textureKey]) {
                console.warn(`Textures not found for ${textureKey}`);
                continue;
            }
            this.animations[textureKey] = {
                textures: this.textures[textureKey],
                speed: properties.speed || 0.2
            };
            // Debug for Wolf animations
            if (entityType === 'wolf' && direction === 's') {
                console.log(`[Wolf] Created animation ${textureKey} with ${this.textures[textureKey].length} frames`);
            }
        }
    }

    private createAnimations(): void {
        // Player Animations
        for (const className in PLAYER_CONFIG.classes) {
            const classConfig = (PLAYER_CONFIG.classes as any)[className];
            const entityType = classConfig.spritePrefix;
            if (classConfig.animations) {
                for (const animName in classConfig.animations) {
                    this._createDirectionalAnimations(entityType, animName, classConfig.animations[animName]);
                }
            }
        }

        // Monster Animations
        for (const monsterType in MONSTER_CONFIG.stats) {
            const monsterStats = (MONSTER_CONFIG.stats as any)[monsterType];
            if (monsterStats.animations) {
                for (const animName in monsterStats.animations) {
                    this._createDirectionalAnimations(monsterType, animName, monsterStats.animations[animName]);
                }
                // Debug log for Wolf animations
                if (monsterType === 'wolf') {
                    console.log('[Wolf] Created animations for wolf with animations:', Object.keys(monsterStats.animations));
                }
            }
        }

        // Effect Animations (non-directional)
        for (const effectName in PLAYER_CONFIG.effects) {
            const effectConfig = (PLAYER_CONFIG.effects as any)[effectName];
            if (typeof effectConfig === 'object' && 
                effectConfig !== null && 
                this.textures[effectName] &&
                effectName !== 'effectAnimations') {
                 this.animations[effectName] = {
                     textures: this.textures[effectName],
                     speed: effectConfig.animationSpeed || 0.2 
                 };
            }
        }
    }

    createAnimatedSprite(animationName: string): PIXI.AnimatedSprite | null {
        if (!this.animations[animationName]) {
            console.error(`Animation ${animationName} not found`);
            if (animationName.includes('pummel')) {
                console.log('[DarkMage] Available animations:', Object.keys(this.animations).filter(key => key.includes('darkmage')));
            }
            return null;
        }
        
        const sprite = new PIXI.AnimatedSprite(this.animations[animationName].textures);
        sprite.animationSpeed = this.animations[animationName].speed;
        sprite.anchor.set(0.5, 0.5);
        
        // Apply scale (default 1x for HD sprites)
        let scale = this.spriteScale;
        
        // If this is an ogre sprite, adjust the scale to compensate for the larger frames
        if (animationName.startsWith('ogre_')) {
            // Ogre sprites are 192x192 but we want them to appear about 1.5x larger than regular sprites
            scale = (this.frameWidth / 192) * 1.5;
        }
        
        // Wolf sprites should be 1.5x larger
        if (animationName.startsWith('wolf_')) {
            scale = this.spriteScale * 1.5;
        }
        
        // WingedDemon sprites should be 1.5x larger
        if (animationName.startsWith('wingeddemon_')) {
            scale = this.spriteScale * 1.5;
        }
        
        // Ghoul sprites should be 1.2x larger
        if (animationName.startsWith('ghoul_')) {
            scale = this.spriteScale * 1.2;
        }
        
        sprite.scale.set(scale, scale);
        
        return sprite;
    }

    getAnimationForMovement(facingDirection: string, movementDirection: string | null, characterClass?: string): string {
        // Determine the character class for the animation
        const cls = characterClass || (window as any).game?.entities?.player?.characterClass || 'bladedancer';
        
        // Fetch spritePrefix from PLAYER_CONFIG
        const classConfig = (PLAYER_CONFIG.classes as any)[cls];
        const classPrefix = classConfig?.spritePrefix || 'knight';

        // Convert 8-way direction to the animation suffix (e, se, s, etc.)
        const facingSuffix = directionStringToAnimationSuffix(facingDirection || 'down');
        
        // If not moving, return idle animation
        if (!movementDirection) {
            return `${classPrefix}_idle_${facingSuffix}`;
        }
        
        const movementSuffix = directionStringToAnimationSuffix(movementDirection || 'down');
        
        if (!facingSuffix || !movementSuffix) {
            // Default to south-facing idle if direction string is invalid
            return `${classPrefix}_idle_${facingSuffix || 's'}`; 
        }
        
        // Determine which animation to use based on the relationship between facing and movement directions
        if (facingSuffix === movementSuffix) {
            // Running forward
            return `${classPrefix}_run_${facingSuffix}`;
        } else {
            // Check if running backward (opposite direction)
            const opposites: Record<string, string> = {
                'e': 'w', 'w': 'e', 'n': 's', 's': 'n',
                'ne': 'sw', 'sw': 'ne', 'nw': 'se', 'se': 'nw'
            };
            
            if (movementSuffix === opposites[facingSuffix]) {
                return `${classPrefix}_run_backward_${facingSuffix}`;
            }
            
            // Check if strafing left or right relative to facing direction
            const clockwise = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
            const facingIndex = clockwise.indexOf(facingSuffix);
            const movementIndex = clockwise.indexOf(movementSuffix);
            
            // Determine if movement is to the left or right of facing
            if (facingIndex !== -1 && movementIndex !== -1) {
                // Calculate the shortest path around the circle
                let diff = movementIndex - facingIndex;
                if (diff < -4) diff += 8;
                if (diff > 4) diff -= 8;
                
                if (diff > 0 && diff <= 4) {
                    // Movement is to the right of facing
                    return `${classPrefix}_strafe_right_${facingSuffix}`;
                } else if (diff < 0 && diff >= -4) {
                    // Movement is to the left of facing
                    return `${classPrefix}_strafe_left_${facingSuffix}`;
                }
            }
            
            // Default to run forward if we can't determine
            return `${classPrefix}_run_${facingSuffix}`;
        }
    }
        
    getAttackAnimation(facingDirection: string, attackType: string, characterClass?: string): string {
        // Determine the character class
        const cls = characterClass || (window as any).game?.entities?.player?.characterClass || 'bladedancer';
        
        // Fetch spritePrefix from PLAYER_CONFIG
        const classConfig = (PLAYER_CONFIG.classes as any)[cls];
        const classPrefix = classConfig?.spritePrefix || 'knight';

        // Convert 8-way direction string to animation suffix
        const facingSuffix = directionStringToAnimationSuffix(facingDirection || 'down');
        
        if (!facingSuffix) {
            return attackType === 'roll'
                ? `${classPrefix}_roll_s`
                : (attackType === 'primary'
                    ? `${classPrefix}_attack1_s`
                    : `${classPrefix}_attack2_s`);
        }

        if (attackType === 'roll') {
            return `${classPrefix}_roll_${facingSuffix}`;
        }

        return attackType === 'primary'
            ? `${classPrefix}_attack1_${facingSuffix}`
            : `${classPrefix}_attack2_${facingSuffix}`;
    }
        
    getAttackHitArea(facingDirection: string, attackType: string): any {
        // Define the hit areas for each attack type
        if (attackType === 'primary') {
            // Attack 1: Cone directly in front, medium range
            return {
                type: 'cone',
                range: 70,
                angle: 75 // 75 degree cone
            };
        } else {
            // Attack 2: Rectangle in front, shorter range but wider
            return {
                type: 'rectangle',
                width: 80,
                length: 110
            };
        }
    }
    
    getMonsterAnimationForDirection(monsterType: string, directionString: string, state: string = 'walk'): string {
        // Convert 8-way direction string to animation suffix
        const facingSuffix = directionStringToAnimationSuffix(directionString || 'down');
        
        if (monsterType === 'skeleton' || monsterType === 'elemental' ||
            monsterType === 'ogre' || monsterType === 'ghoul' || monsterType === 'wildarcher' ||
            monsterType === 'darkmage' || monsterType === 'wolf' || monsterType === 'wingeddemon') {
            // Handle special animation states
            if (state === 'hit') {
                return `${monsterType}_take_damage_${facingSuffix}`;
            } else if (state === 'die') {
                return `${monsterType}_die_${facingSuffix}`;
            }
            
            return `${monsterType}_${state}_${facingSuffix}`;
        }
        
        // Default fallback
        console.warn(`Unknown monster type or invalid state for animation: ${monsterType}, ${state}`);
        return `skeleton_walk_s`;
    }

    createSlashEffectAnimation(): void {
        // Just use a single animation for the slash effect
        this.animations['slash_effect'] = {
            textures: this.textures['slash_effect'],
            speed: 0.5
        };
    }
    
    /**
     * Get a single texture for powerups (non-animated sprites)
     */
    getPowerupTexture(powerupType: string): PIXI.Texture | null {
        const textureKey = `${powerupType}_powerup`;
        if (this.textures[textureKey] && this.textures[textureKey].length > 0) {
            return this.textures[textureKey][0]; // Get the first (and only) frame
        }
        console.warn(`Powerup texture not found for type: ${powerupType}`);
        return null;
    }

    createStrikeEffectAnimations(): void {
        // Create animations for the strike effects
        this.animations['strike_windup'] = {
            textures: this.textures['strike_windup'],
            speed: 0.8
        };
        
        this.animations['strike_cast'] = {
            textures: this.textures['strike_cast'],
            speed: 0.2
        };
    }
}