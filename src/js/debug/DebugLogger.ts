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

// Debug logger for better feedback during development
export class DebugLogger {
    private enabled: boolean;
    private stateHistory: GameState[];
    private eventLog: Array<{
        timestamp: number;
        frame: number;
        type: string;
        data: any;
    }>;
    private maxHistorySize: number;
    private frameCount: number;

    constructor() {
        this.enabled = true;
        this.stateHistory = [];
        this.eventLog = [];
        this.maxHistorySize = 100;
        this.frameCount = 0;
    }

    setupConsoleCommands(): void {
        (window as any).debugDump = () => this.dumpDebugState();
        (window as any).debugToggle = () => {
            this.enabled = !this.enabled;
            console.log(`Debug logging ${this.enabled ? 'enabled' : 'disabled'}`);
        };
        (window as any).debugClear = () => {
            this.stateHistory = [];
            this.eventLog = [];
            this.frameCount = 0;
            console.log('Debug history cleared');
        };
        
        console.log('Debug commands available: debugDump(), debugToggle(), debugClear()');
    }

    captureGameState(game: any): GameState | null {
        if (!this.enabled) return null;
        
        this.frameCount++;
        
        const state: GameState = {
            timestamp: Date.now(),
            frame: this.frameCount,
            players: this.capturePlayerStates(game),
            monsters: this.captureMonsterStates(game),
            projectiles: this.captureProjectileStates(game),
            asciiMap: this.generateAsciiMap(game)
        };
        
        this.stateHistory.push(state);
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }
        
        return state;
    }

    private capturePlayerStates(game: any): PlayerState[] {
        const players: PlayerState[] = [];
        
        // Local player
        if (game.entities?.player) {
            const p = game.entities.player;
            players.push({
                id: 'local',
                class: p.characterClass,
                pos: { x: Math.round(p.position.x), y: Math.round(p.position.y) },
                hp: `${p.hitPoints || 0}/${p.maxHitPoints || 100}`,
                state: p.isDead ? 'dead' : (p.isAttacking ? 'attacking' : 'alive'),
                facing: p.facing || 'down',
                velocity: { x: Math.round((p.velocity?.x || 0) * 10) / 10, y: Math.round((p.velocity?.y || 0) * 10) / 10 }
            });
        }
        
        // Remote players
        if (game.remotePlayers) {
            for (const [id, p] of game.remotePlayers) {
                players.push({
                    id: id,
                    class: p.characterClass,
                    pos: { x: Math.round(p.position.x), y: Math.round(p.position.y) },
                    hp: `${p.hp || 0}/${p.maxHp || 100}`,
                    state: p.isDead ? 'dead' : (p.isAttacking ? 'attacking' : 'alive'),
                    facing: p.facing || 'down',
                    velocity: { x: 0, y: 0 } // Remote players don't have local velocity
                });
            }
        }
        
        return players;
    }

    private captureMonsterStates(game: any): MonsterState[] {
        const monsters: MonsterState[] = [];
        
        if (game.monsters) {
            for (const [id, m] of game.monsters) {
                monsters.push({
                    type: m.type,
                    id: id,
                    pos: { x: Math.round(m.x), y: Math.round(m.y) },
                    hp: `${m.hp || 0}/${m.maxHp || 100}`,
                    state: m.state || 'unknown',
                    target: m.targetPlayerId || 'none'
                });
            }
        }
        
        return monsters;
    }

    private captureProjectileStates(game: any): ProjectileState[] {
        const projectiles: ProjectileState[] = [];
        
        if (game.systems?.combat?.projectiles) {
            game.systems.combat.projectiles.forEach((p: any, i: number) => {
                if (p.active) {
                    projectiles.push({
                        id: i,
                        owner: p.ownerId || 'unknown',
                        pos: { x: Math.round(p.position.x), y: Math.round(p.position.y) },
                        velocity: { x: Math.round(p.velocity.x * 10) / 10, y: Math.round(p.velocity.y * 10) / 10 }
                    });
                }
            });
        }
        
        return projectiles;
    }

    private generateAsciiMap(game: any): string {
        if (!game.entities?.player) return 'No player data';
        
        const centerX = game.entities.player.position.x;
        const centerY = game.entities.player.position.y;
        const radius = 15;
        const width = radius * 2;
        const height = radius * 2;
        
        // Initialize map
        const map: string[][] = [];
        for (let y = 0; y < height; y++) {
            map[y] = new Array(width).fill('·');
        }
        
        // Helper to place entities
        const placeEntity = (worldX: number, worldY: number, char: string) => {
            const mapX = Math.round(worldX - centerX + radius);
            const mapY = Math.round(worldY - centerY + radius);
            if (mapX >= 0 && mapX < width && mapY >= 0 && mapY < height) {
                map[mapY][mapX] = char;
            }
        };
        
        // Place walls/terrain (if available)
        if (game.systems?.collision) {
            // This would need access to collision system data
        }
        
        // Place monsters
        if (game.monsters) {
            for (const m of game.monsters.values()) {
                const char = m.type.charAt(0).toUpperCase();
                placeEntity(m.x, m.y, char);
            }
        }
        
        // Place projectiles
        if (game.systems?.combat?.projectiles) {
            game.systems.combat.projectiles.forEach((p: any) => {
                if (p.active) {
                    placeEntity(p.position.x, p.position.y, '*');
                }
            });
        }
        
        // Place remote players
        if (game.remotePlayers) {
            let remoteNum = 2;
            for (const p of game.remotePlayers.values()) {
                placeEntity(p.position.x, p.position.y, String(remoteNum));
                remoteNum++;
            }
        }
        
        // Place local player (overwrites others)
        placeEntity(centerX, centerY, '@');
        
        // Add border and legend
        const border = '+' + '-'.repeat(width) + '+';
        const legend = 'Legend: @ = You, 2-9 = Remote players, OGSE = Monsters, * = Projectiles, · = Empty';
        
        return [
            border,
            ...map.map(row => '|' + row.join('') + '|'),
            border,
            legend
        ].join('\n');
    }
    
    logEvent(eventType: string, data: any): void {
        if (!this.enabled) return;
        
        this.eventLog.push({
            timestamp: Date.now(),
            frame: this.frameCount,
            type: eventType,
            data: data
        });
        
        // Keep event log size reasonable
        if (this.eventLog.length > 500) {
            this.eventLog.splice(0, 100);
        }
        
        // Check for auto-dump triggers
        if (eventType === 'player_death' || eventType === 'error') {
            console.log(`[DebugLogger] Auto-dumping state due to ${eventType}`);
            this.dumpDebugState();
        }
    }
    
    dumpDebugState(): void {
        console.log('=== DEBUG STATE DUMP ===');
        console.log(`Captured ${this.stateHistory.length} frames, ${this.eventLog.length} events`);
        
        if (this.stateHistory.length > 0) {
            const latest = this.stateHistory[this.stateHistory.length - 1];
            console.log('\n=== LATEST GAME STATE ===');
            console.log(`Frame ${latest.frame} at ${new Date(latest.timestamp).toISOString()}`);
            console.log(`Players: ${latest.players.length}, Monsters: ${latest.monsters.length}, Projectiles: ${latest.projectiles.length}`);
            
            console.log('\n=== PLAYERS ===');
            latest.players.forEach(p => {
                console.log(`${p.id} (${p.class}): pos(${p.pos.x},${p.pos.y}) hp:${p.hp} ${p.state} facing:${p.facing} vel(${p.velocity.x},${p.velocity.y})`);
            });
            
            console.log('\n=== MONSTERS ===');
            latest.monsters.forEach(m => {
                console.log(`${m.id} (${m.type}): pos(${m.pos.x},${m.pos.y}) hp:${m.hp} ${m.state} target:${m.target}`);
            });
            
            if (latest.projectiles.length > 0) {
                console.log('\n=== PROJECTILES ===');
                latest.projectiles.forEach(p => {
                    console.log(`${p.id} (${p.owner}): pos(${p.pos.x},${p.pos.y}) vel(${p.velocity.x},${p.velocity.y})`);
                });
            }
            
            console.log('\n=== ASCII MAP ===');
            console.log(latest.asciiMap);
        }
        
        if (this.eventLog.length > 0) {
            console.log('\n=== RECENT EVENTS ===');
            this.eventLog.slice(-10).forEach(e => {
                console.log(`[${e.frame}] ${e.type}:`, e.data);
            });
        }
        
        console.log('\n=== END DEBUG DUMP ===');
    }
}