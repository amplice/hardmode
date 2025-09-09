/**
 * @fileoverview SoundManager - Centralized audio system using Howler.js
 * 
 * Manages all game audio including:
 * - Sound loading and caching
 * - Category-based volume control (master, sfx, music, ambient)
 * - Spatial audio for distance-based volume
 * - Sound pooling for performance
 * - Priority system to limit concurrent sounds
 */

// @ts-ignore - Howler doesn't have proper TypeScript definitions for ES modules
import 'howler';

// Access Howl and Howler from the global scope after import
declare global {
    interface Window {
        Howl: any;
        Howler: any;
    }
}

const Howl = (window as any).Howl;
const Howler = (window as any).Howler;

// Sound categories for volume control
export enum SoundCategory {
    MASTER = 'master',
    SFX = 'sfx',
    MUSIC = 'music',
    AMBIENT = 'ambient',
    UI = 'ui'
}

// Sound priority levels (higher = more important)
export enum SoundPriority {
    LOW = 0,      // Distant monster sounds, ambient
    MEDIUM = 1,   // Other player actions
    HIGH = 2,     // Local player actions
    CRITICAL = 3  // Level up, death, important UI
}

interface SoundConfig {
    src: string | string[];
    category?: SoundCategory;
    volume?: number;
    loop?: boolean;
    pool?: number;  // Max concurrent instances
    priority?: SoundPriority;
    sprite?: { [key: string]: [number, number] };  // For sound sprites
}

interface SpatialSoundOptions {
    x: number;
    y: number;
    maxDistance?: number;  // Distance at which sound is inaudible
    refDistance?: number;  // Distance at which sound is at full volume
    rolloff?: number;      // How quickly sound fades with distance
    priority?: SoundPriority;
}

interface ActiveSound {
    id: number;
    howl: Howl;
    category: SoundCategory;
    priority: SoundPriority;
    spatial?: boolean;
    position?: { x: number; y: number };
}

export class SoundManager {
    private sounds: Map<string, Howl> = new Map();
    private activeSounds: Map<number, ActiveSound> = new Map();
    private categoryVolumes: Map<SoundCategory, number> = new Map();
    private listenerPosition: { x: number; y: number } = { x: 0, y: 0 };
    private enabled: boolean = true;
    private maxConcurrentSounds: number = 32;  // Browser limit
    private soundCounts: Map<string, number> = new Map();  // Track instances per sound
    private screenWidth: number = 1920;  // Will be updated from Game
    private screenHeight: number = 1080;  // Will be updated from Game
    private screenBuffer: number = 300;  // Extra pixels around screen edge to hear sounds
    private cameraZoom: number = 0.85;  // Will be updated from Game
    
    // Background music system
    private musicTracks: Array<{ name: string; src: string; howl?: any }> = [];
    private currentMusicIndex: number = -1;
    private currentMusic: any = null;
    private playedIndices: number[] = [];
    private musicVolume: number = 0.15;  // 15% volume for background music
    private isMusicMuted: boolean = false;  // Track mute state
    public currentTrackName: string = '';  // Public so UI can read it
    
    constructor() {
        // Initialize category volumes
        this.categoryVolumes.set(SoundCategory.MASTER, 1.0);
        this.categoryVolumes.set(SoundCategory.SFX, 0.7);
        this.categoryVolumes.set(SoundCategory.MUSIC, 0.5);
        this.categoryVolumes.set(SoundCategory.AMBIENT, 0.3);
        this.categoryVolumes.set(SoundCategory.UI, 0.8);
        
        // Set up Howler global settings
        Howler.autoUnlock = true;  // Auto-unlock on mobile
        Howler.html5PoolSize = 10; // HTML5 audio pool size
        
        // Load saved preferences from localStorage
        this.loadPreferences();
        
        console.log('[SoundManager] Initialized with Howler.js');
    }
    
    /**
     * Preload a sound file
     */
    async load(name: string, config: SoundConfig): Promise<void> {
        return new Promise((resolve, reject) => {
            // Default configuration
            const category = config.category || SoundCategory.SFX;
            const volume = config.volume ?? 1.0;
            const pool = config.pool ?? 5;  // Default pool size
            const priority = config.priority ?? SoundPriority.MEDIUM;
            
            const howl = new Howl({
                src: Array.isArray(config.src) ? config.src : [config.src],
                volume: volume * this.getCategoryVolume(category),
                loop: config.loop || false,
                pool: pool,
                sprite: config.sprite,
                onload: () => {
                    this.sounds.set(name, howl);
                    this.soundCounts.set(name, 0);
                    console.log(`[SoundManager] Loaded sound: ${name}`);
                    resolve();
                },
                onloaderror: (id: any, error: any) => {
                    console.error(`[SoundManager] Failed to load ${name}:`, error);
                    reject(error);
                }
            });
            
            // Store metadata on the Howl instance
            (howl as any)._category = category;
            (howl as any)._priority = priority;
            (howl as any)._baseName = name;
        });
    }
    
    /**
     * Load multiple sounds at once
     */
    async loadAll(sounds: { [name: string]: SoundConfig }): Promise<void> {
        const promises = Object.entries(sounds).map(([name, config]) => 
            this.load(name, config)
        );
        await Promise.all(promises);
        console.log(`[SoundManager] Loaded ${Object.keys(sounds).length} sounds`);
    }
    
    /**
     * Play a sound
     */
    play(name: string, options?: { 
        volume?: number; 
        rate?: number;
        sprite?: string;
        onend?: () => void;
    }): number | null {
        if (!this.enabled) return null;
        
        const howl = this.sounds.get(name);
        if (!howl) {
            console.warn(`[SoundManager] Sound not found: ${name}`);
            return null;
        }
        
        // Check if we've hit the pool limit for this sound
        const currentCount = this.soundCounts.get(name) || 0;
        const maxPool = (howl as any)._pool || 5;
        if (currentCount >= maxPool) {
            console.log(`[SoundManager] Pool limit reached for ${name} (${currentCount}/${maxPool})`);
            return null;
        }
        
        // Check total concurrent sounds limit
        if (this.activeSounds.size >= this.maxConcurrentSounds) {
            this.cullLowPrioritySounds();
        }
        
        // Play the sound
        const id = howl.play(options?.sprite);
        
        if (typeof id === 'number') {
            // Set options
            if (options?.volume !== undefined) {
                howl.volume(options.volume * this.getCategoryVolume((howl as any)._category), id);
            }
            if (options?.rate !== undefined) {
                howl.rate(options.rate, id);
            }
            if (options?.onend) {
                howl.on('end', options.onend, id);
            }
            
            // Track active sound
            this.activeSounds.set(id, {
                id,
                howl,
                category: (howl as any)._category,
                priority: (howl as any)._priority,
                spatial: false
            });
            
            // Update count
            this.soundCounts.set(name, currentCount + 1);
            
            // Clean up when sound ends
            howl.on('end', () => {
                this.activeSounds.delete(id);
                const count = this.soundCounts.get(name) || 0;
                this.soundCounts.set(name, Math.max(0, count - 1));
            }, id);
            
            return id;
        }
        
        return null;
    }
    
    /**
     * Play a spatial sound if it's on screen (or within buffer zone)
     * Binary system: full volume if on screen, no sound if off screen
     * No distance falloff or stereo panning
     */
    playSpatial(name: string, options: SpatialSoundOptions): number | null {
        if (!this.enabled) return null;
        
        const howl = this.sounds.get(name);
        if (!howl) {
            console.warn(`[SoundManager] Sound not found: ${name}`);
            return null;
        }
        
        // Calculate if sound source is visible on screen (with buffer)
        const dx = options.x - this.listenerPosition.x;
        const dy = options.y - this.listenerPosition.y;
        
        // Calculate screen boundaries with zoom and buffer
        const halfScreenWidth = (this.screenWidth / 2 / this.cameraZoom) + this.screenBuffer;
        const halfScreenHeight = (this.screenHeight / 2 / this.cameraZoom) + this.screenBuffer;
        
        // Check if sound source is within screen bounds (plus buffer)
        if (Math.abs(dx) > halfScreenWidth || Math.abs(dy) > halfScreenHeight) {
            return null;  // Off screen - don't play sound
        }
        
        // Sound is on screen - play at full volume with no panning
        const volume = 1.0;
        
        // Play at full volume, no stereo panning - just binary on/off
        const id = this.play(name, { volume });
        
        if (id !== null) {
            // No panning - play centered
            
            // Update active sound info
            const activeSound = this.activeSounds.get(id);
            if (activeSound) {
                activeSound.spatial = true;
                activeSound.position = { x: options.x, y: options.y };
                activeSound.priority = options.priority || SoundPriority.LOW;
            }
        }
        
        return id;
    }
    
    /**
     * Update listener position for spatial audio
     */
    updateListenerPosition(x: number, y: number): void {
        this.listenerPosition = { x, y };
        
        // Update all active spatial sounds
        this.activeSounds.forEach((sound, id) => {
            if (sound.spatial && sound.position) {
                // Recalculate if sound is still on screen
                const dx = sound.position.x - x;
                const dy = sound.position.y - y;
                
                // Calculate screen boundaries with zoom and buffer
                const halfScreenWidth = (this.screenWidth / 2 / this.cameraZoom) + this.screenBuffer;
                const halfScreenHeight = (this.screenHeight / 2 / this.cameraZoom) + this.screenBuffer;
                
                // Check if sound source is off screen
                if (Math.abs(dx) > halfScreenWidth || Math.abs(dy) > halfScreenHeight) {
                    // Stop sounds that are now off screen
                    sound.howl.stop(id);
                } else {
                    // Update pan based on position
                    const panRange = halfScreenWidth - this.screenBuffer;
                    const pan = Math.max(-1, Math.min(1, dx / panRange));
                    
                    // Keep volume at full (sounds are either audible or not)
                    sound.howl.volume(1.0 * this.getCategoryVolume(sound.category), id);
                    sound.howl.stereo(pan, id);
                }
            }
        });
    }
    
    /**
     * Update screen dimensions for spatial audio calculations
     */
    updateScreenDimensions(width: number, height: number): void {
        this.screenWidth = width;
        this.screenHeight = height;
    }
    
    /**
     * Update camera zoom for spatial audio calculations
     */
    updateCameraZoom(zoom: number): void {
        this.cameraZoom = zoom;
    }
    
    /**
     * Load background music tracks
     */
    async loadMusicTracks(tracks: Array<{ name: string; src: string }>): Promise<void> {
        console.log(`[SoundManager] Loading ${tracks.length} music tracks...`);
        
        this.musicTracks = tracks.map(track => ({ ...track }));
        
        // Preload all music tracks
        const loadPromises = this.musicTracks.map((track, index) => {
            return new Promise<void>((resolve, reject) => {
                const howl = new Howl({
                    src: [track.src],
                    volume: this.musicVolume * this.getCategoryVolume(SoundCategory.MUSIC),
                    loop: false,  // We'll handle looping manually for playlist
                    html5: true,  // Use HTML5 audio for music (better for long files)
                    onload: () => {
                        track.howl = howl;
                        console.log(`[SoundManager] Loaded music: ${track.name}`);
                        resolve();
                    },
                    onloaderror: (id: any, error: any) => {
                        console.error(`[SoundManager] Failed to load music ${track.name}:`, error);
                        resolve();  // Continue even if one track fails
                    },
                    onend: () => {
                        // When a track ends, play the next one
                        this.playNextTrack();
                    }
                });
            });
        });
        
        await Promise.all(loadPromises);
        console.log('[SoundManager] Music tracks loaded');
    }
    
    /**
     * Start playing background music (shuffled playlist)
     */
    startMusic(): void {
        if (this.musicTracks.length === 0) {
            console.warn('[SoundManager] No music tracks loaded');
            return;
        }
        
        // Reset played indices if we've played all tracks
        if (this.playedIndices.length >= this.musicTracks.length) {
            this.playedIndices = [];
        }
        
        // Get a random unplayed track
        const availableIndices = this.musicTracks
            .map((_, index) => index)
            .filter(index => !this.playedIndices.includes(index));
        
        if (availableIndices.length === 0) {
            // Should not happen due to reset above, but just in case
            this.playedIndices = [];
            this.playNextTrack();
            return;
        }
        
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        this.playTrack(randomIndex);
    }
    
    /**
     * Play a specific track by index
     */
    private playTrack(index: number): void {
        // Stop current music if playing
        if (this.currentMusic) {
            this.currentMusic.stop();
        }
        
        const track = this.musicTracks[index];
        if (!track || !track.howl) {
            console.error(`[SoundManager] Track ${index} not available`);
            this.playNextTrack();
            return;
        }
        
        this.currentMusicIndex = index;
        this.currentMusic = track.howl;
        this.currentTrackName = track.name;
        this.playedIndices.push(index);
        
        // Special volume adjustment for Goblins Den (30% instead of 15%)
        let trackVolume = this.musicVolume;
        if (track.name === 'Goblins Den') {
            trackVolume = 0.3;  // 30% volume for this track
        }
        
        // Update volume
        this.currentMusic.volume(trackVolume * this.getCategoryVolume(SoundCategory.MUSIC));
        
        // Apply mute state to new track
        if (this.isMusicMuted) {
            this.currentMusic.mute(true);
        }
        
        console.log(`[SoundManager] Now playing: ${track.name} at volume ${trackVolume}`);
        this.currentMusic.play();
    }
    
    /**
     * Play the next track in the playlist
     */
    private playNextTrack(): void {
        // Reset if we've played everything
        if (this.playedIndices.length >= this.musicTracks.length) {
            this.playedIndices = [];
        }
        
        // Get available tracks
        const availableIndices = this.musicTracks
            .map((_, index) => index)
            .filter(index => !this.playedIndices.includes(index));
        
        if (availableIndices.length === 0) {
            // Start over with a fresh shuffle
            this.playedIndices = [];
            this.startMusic();
            return;
        }
        
        // Pick a random track from available ones
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        this.playTrack(randomIndex);
    }
    
    /**
     * Stop background music
     */
    stopMusic(): void {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
            this.currentTrackName = '';
            this.currentMusicIndex = -1;
        }
    }
    
    /**
     * Update music volume
     */
    setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume(this.musicVolume * this.getCategoryVolume(SoundCategory.MUSIC));
        }
    }
    
    /**
     * Mute background music
     */
    muteMusic(): void {
        this.isMusicMuted = true;
        if (this.currentMusic) {
            this.currentMusic.mute(true);
        }
    }
    
    /**
     * Unmute background music
     */
    unmuteMusic(): void {
        this.isMusicMuted = false;
        if (this.currentMusic) {
            this.currentMusic.mute(false);
        }
    }
    
    /**
     * Stop a specific sound instance
     */
    stop(id: number): void {
        const sound = this.activeSounds.get(id);
        if (sound) {
            sound.howl.stop(id);
            this.activeSounds.delete(id);
            
            const name = (sound.howl as any)._baseName;
            const count = this.soundCounts.get(name) || 0;
            this.soundCounts.set(name, Math.max(0, count - 1));
        }
    }
    
    /**
     * Stop all sounds of a specific name
     */
    stopAll(name?: string): void {
        if (name) {
            const howl = this.sounds.get(name);
            if (howl) {
                howl.stop();
                this.soundCounts.set(name, 0);
                
                // Remove from active sounds
                this.activeSounds.forEach((sound, id) => {
                    if (sound.howl === howl) {
                        this.activeSounds.delete(id);
                    }
                });
            }
        } else {
            // Stop all sounds
            Howler.stop();
            this.activeSounds.clear();
            this.soundCounts.clear();
            this.sounds.forEach((howl, name) => {
                this.soundCounts.set(name, 0);
            });
        }
    }
    
    /**
     * Set volume for a category
     */
    setCategoryVolume(category: SoundCategory, volume: number): void {
        volume = Math.max(0, Math.min(1, volume));  // Clamp 0-1
        this.categoryVolumes.set(category, volume);
        
        // Update all active sounds in this category
        this.activeSounds.forEach((sound) => {
            if (sound.category === category) {
                const baseVolume = 1.0;  // Could store per-sound base volume
                sound.howl.volume(baseVolume * volume * this.getMasterVolume(), sound.id);
            }
        });
        
        // Save preference
        this.savePreferences();
    }
    
    /**
     * Get volume for a category
     */
    getCategoryVolume(category: SoundCategory): number {
        const categoryVol = this.categoryVolumes.get(category) || 1.0;
        const masterVol = this.categoryVolumes.get(SoundCategory.MASTER) || 1.0;
        return categoryVol * masterVol;
    }
    
    /**
     * Get master volume
     */
    getMasterVolume(): number {
        return this.categoryVolumes.get(SoundCategory.MASTER) || 1.0;
    }
    
    /**
     * Set master volume
     */
    setMasterVolume(volume: number): void {
        this.setCategoryVolume(SoundCategory.MASTER, volume);
        Howler.volume(volume);  // Also set global Howler volume
    }
    
    /**
     * Enable/disable all sounds
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.stopAll();
        }
        this.savePreferences();
    }
    
    /**
     * Remove low priority sounds when limit is reached
     */
    private cullLowPrioritySounds(): void {
        // Sort active sounds by priority (lowest first)
        const sorted = Array.from(this.activeSounds.entries())
            .sort((a, b) => a[1].priority - b[1].priority);
        
        // Remove lowest priority sounds until we're under 75% capacity
        const targetSize = Math.floor(this.maxConcurrentSounds * 0.75);
        while (this.activeSounds.size > targetSize && sorted.length > 0) {
            const [id, sound] = sorted.shift()!;
            if (sound.priority < SoundPriority.HIGH) {
                this.stop(id);
            }
        }
    }
    
    /**
     * Save volume preferences to localStorage
     */
    private savePreferences(): void {
        const prefs = {
            enabled: this.enabled,
            volumes: Object.fromEntries(this.categoryVolumes)
        };
        localStorage.setItem('soundPreferences', JSON.stringify(prefs));
    }
    
    /**
     * Load volume preferences from localStorage
     */
    private loadPreferences(): void {
        const stored = localStorage.getItem('soundPreferences');
        if (stored) {
            try {
                const prefs = JSON.parse(stored);
                this.enabled = prefs.enabled ?? true;
                
                if (prefs.volumes) {
                    Object.entries(prefs.volumes).forEach(([category, volume]) => {
                        this.categoryVolumes.set(category as SoundCategory, volume as number);
                    });
                }
                
                // Apply master volume to Howler
                Howler.volume(this.getMasterVolume());
            } catch (e) {
                console.error('[SoundManager] Failed to load preferences:', e);
            }
        }
    }
    
    /**
     * Get debug info about current audio state
     */
    getDebugInfo(): string {
        return `
        SoundManager Debug:
        - Enabled: ${this.enabled}
        - Loaded sounds: ${this.sounds.size}
        - Active sounds: ${this.activeSounds.size}/${this.maxConcurrentSounds}
        - Master volume: ${this.getMasterVolume()}
        - Category volumes: ${JSON.stringify(Object.fromEntries(this.categoryVolumes))}
        - Listener position: (${this.listenerPosition.x}, ${this.listenerPosition.y})
        `;
    }
}

// Export singleton instance
export const soundManager = new SoundManager();