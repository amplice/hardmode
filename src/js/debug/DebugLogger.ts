// src/js/debug/DebugLogger.ts

/**
 * @fileoverview DebugLogger - Development debugging and state analysis
 * 
 * ARCHITECTURE ROLE:
 * - Captures game state snapshots for debugging gameplay issues
 * - Provides ASCII visualization of game world for quick analysis
 * - Logs critical events (deaths, attacks, errors) with context
 * - Maintains frame-by-frame history for issue reproduction
 */

interface Position {
    x: number;
    y: number;
}

interface PlayerState {
    id: string;
    class: string;
    pos: Position;
    hp: string;
    state: string;
    facing: string;
    velocity: Position;
}

interface MonsterState {
    type: string;
    id: string;
    pos: Position;
    hp: string;
    state: string;
    target: string;
}

interface ProjectileState {
    id: number;
    owner: string;
    pos: Position;
    velocity: Position;
}

interface GameState {
    timestamp: number;
    frame: number;
    players: PlayerState[];
    monsters: MonsterState[];
    projectiles: ProjectileState[];
    asciiMap: string;
}

interface DebugEvent {
    timestamp: number;
    frame: number;
    type: string;
    message: string;
    data?: any;
}

interface AutoDumpTriggers {
    playerDeath: boolean;
    attackLanded: boolean;
    error: boolean;
}

// Minimal game interface to avoid circular dependencies
interface GameInterface {
    entities?: {
        player?: any;
    };
    remotePlayers?: Map<string, any>;
    remoteMonsters?: Map<string, any>;
    systems?: {
        combat?: {
            projectiles?: any[];
        };
        world?: {
            worldRenderer?: any;
        };
    };
}

export class DebugLogger {
    private enabled: boolean;
    private stateHistory: GameState[];
    private eventLog: DebugEvent[];
    private maxHistorySize: number;
    private frameCount: number;
    private autoDumpTriggers: AutoDumpTriggers;

    constructor() {
        this.enabled = true;
        this.stateHistory = [];
        this.eventLog = [];
        this.maxHistorySize = 100;
        this.frameCount = 0;
        
        // Auto-dump on certain events
        this.autoDumpTriggers = {
            playerDeath: true,
            attackLanded: false,
            error: true
        };
    }
    
    captureGameState(game: GameInterface): GameState | undefined {
        if (!this.enabled) return;
        
        this.frameCount++;
        
        const state: GameState = {
            timestamp: Date.now(),
            frame: this.frameCount,
            players: this.capturePlayerStates(game),
            monsters: this.captureMonsterStates(game),
            projectiles: this.captureProjectiles(game),
            asciiMap: this.generateAsciiMap(game)
        };
        
        this.stateHistory.push(state);
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }
        
        return state;
    }
    
    private capturePlayerStates(game: GameInterface): PlayerState[] {
        const players: PlayerState[] = [];
        
        // Local player
        if (game.entities?.player) {
            const p = game.entities.player;
            players.push({
                id: 'local',
                class: p.characterClass || 'unknown',
                pos: { x: Math.round(p.position?.x || 0), y: Math.round(p.position?.y || 0) },
                hp: `${p.hitPoints || 0}/${p.maxHitPoints || 100}`,
                state: this.getPlayerState(p),
                facing: p.facing || 'down',
                velocity: { x: p.velocity?.x || 0, y: p.velocity?.y || 0 }
            });
        }
        
        // Remote players
        if (game.remotePlayers) {
            for (const [id, p] of game.remotePlayers) {
                players.push({
                    id: id,
                    class: p.characterClass || 'unknown',
                    pos: { x: Math.round(p.position?.x || 0), y: Math.round(p.position?.y || 0) },
                    hp: `${p.hitPoints || 0}/${p.maxHitPoints || 100}`,
                    state: this.getPlayerState(p),
                    facing: p.facing || 'down',
                    velocity: { x: p.velocity?.x || 0, y: p.velocity?.y || 0 }
                });
            }
        }
        
        return players;
    }
    
    private captureMonsterStates(game: GameInterface): MonsterState[] {
        const monsters: MonsterState[] = [];
        
        // Only server-controlled monsters now
        if (game.remoteMonsters) {
            for (const [id, m] of game.remoteMonsters) {
                monsters.push({
                    type: m.type || 'unknown',
                    id: id,
                    pos: { x: Math.round(m.position?.x || 0), y: Math.round(m.position?.y || 0) },
                    hp: `${m.hitPoints || 0}/${m.maxHitPoints || 1}`,
                    state: m.state || 'idle',
                    target: m.target || 'none'
                });
            }
        }
        
        return monsters;
    }
    
    private captureProjectiles(game: GameInterface): ProjectileState[] {
        const projectiles: ProjectileState[] = [];
        
        if (game.systems?.combat?.projectiles) {
            game.systems.combat.projectiles.forEach((p: any, i: number) => {
                projectiles.push({
                    id: i,
                    owner: p.owner || 'unknown',
                    pos: { x: Math.round(p.position?.x || 0), y: Math.round(p.position?.y || 0) },
                    velocity: { x: p.velocity?.x || 0, y: p.velocity?.y || 0 }
                });
            });
        }
        
        return projectiles;
    }
    
    private getPlayerState(player: any): string {
        if (player.isAttacking) return 'attacking';
        if (player.isRolling) return 'rolling';
        if (player.velocity && (player.velocity.x !== 0 || player.velocity.y !== 0)) return 'moving';
        return 'idle';
    }
    
    private generateAsciiMap(game: GameInterface): string {
        // Simplified ASCII map generation
        const mapSize = 20;
        const tileSize = 64;
        const grid: string[][] = [];
        
        // Initialize grid
        for (let y = 0; y < mapSize; y++) {
            grid[y] = [];
            for (let x = 0; x < mapSize; x++) {
                grid[y][x] = '.';
            }
        }
        
        // Mark player position
        if (game.entities?.player) {
            const p = game.entities.player;
            const px = Math.floor((p.position?.x || 0) / tileSize);
            const py = Math.floor((p.position?.y || 0) / tileSize);
            if (px >= 0 && px < mapSize && py >= 0 && py < mapSize) {
                grid[py][px] = 'P';
            }
        }
        
        // Mark monsters
        if (game.remoteMonsters) {
            for (const [_, m] of game.remoteMonsters) {
                const mx = Math.floor((m.position?.x || 0) / tileSize);
                const my = Math.floor((m.position?.y || 0) / tileSize);
                if (mx >= 0 && mx < mapSize && my >= 0 && my < mapSize) {
                    grid[my][mx] = 'M';
                }
            }
        }
        
        // Convert to string
        return grid.map(row => row.join(' ')).join('\n');
    }
    
    logEvent(type: string, message: string, data?: any): void {
        if (!this.enabled) return;
        
        const event: DebugEvent = {
            timestamp: Date.now(),
            frame: this.frameCount,
            type,
            message,
            data
        };
        
        this.eventLog.push(event);
        
        // Check for auto-dump triggers
        if ((type === 'playerDeath' && this.autoDumpTriggers.playerDeath) ||
            (type === 'attackLanded' && this.autoDumpTriggers.attackLanded) ||
            (type === 'error' && this.autoDumpTriggers.error)) {
            this.dumpStateHistory();
        }
    }
    
    dumpStateHistory(): void {
        console.log('=== DEBUG STATE DUMP ===');
        console.log(`Total frames: ${this.frameCount}`);
        console.log(`History size: ${this.stateHistory.length}`);
        console.log(`Events logged: ${this.eventLog.length}`);
        
        // Dump recent events
        console.log('\n=== RECENT EVENTS ===');
        const recentEvents = this.eventLog.slice(-10);
        recentEvents.forEach(event => {
            console.log(`[${event.frame}] ${event.type}: ${event.message}`);
            if (event.data) {
                console.log('  Data:', event.data);
            }
        });
        
        // Dump last game state
        if (this.stateHistory.length > 0) {
            const lastState = this.stateHistory[this.stateHistory.length - 1];
            console.log('\n=== LAST GAME STATE ===');
            console.log(`Frame: ${lastState.frame}`);
            console.log(`Players: ${lastState.players.length}`);
            lastState.players.forEach(p => {
                console.log(`  ${p.id} (${p.class}): ${p.pos.x},${p.pos.y} HP:${p.hp} State:${p.state}`);
            });
            console.log(`Monsters: ${lastState.monsters.length}`);
            console.log(`Projectiles: ${lastState.projectiles.length}`);
            console.log('\nASCII Map:');
            console.log(lastState.asciiMap);
        }
    }
    
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
    
    getEnabled(): boolean {
        return this.enabled;
    }
    
    clearHistory(): void {
        this.stateHistory = [];
        this.eventLog = [];
        this.frameCount = 0;
    }
    
    getStateHistory(): GameState[] {
        return [...this.stateHistory];
    }
    
    getEventLog(): DebugEvent[] {
        return [...this.eventLog];
    }
}