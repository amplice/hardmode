// Debug logger for better feedback during development
export class DebugLogger {
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
    
    captureGameState(game) {
        if (!this.enabled) return;
        
        this.frameCount++;
        
        const state = {
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
    
    capturePlayerStates(game) {
        const players = [];
        
        // Local player
        if (game.entities.player) {
            const p = game.entities.player;
            players.push({
                id: 'local',
                class: p.characterClass,
                pos: { x: Math.round(p.position.x), y: Math.round(p.position.y) },
                hp: `${p.hitPoints || 0}/${p.maxHitPoints || 100}`,
                state: this.getPlayerState(p),
                facing: p.facing,
                velocity: { x: p.velocity?.x || 0, y: p.velocity?.y || 0 }
            });
        }
        
        // Remote players
        if (game.remotePlayers) {
            for (const [id, p] of game.remotePlayers) {
                players.push({
                    id: id,
                    class: p.characterClass,
                    pos: { x: Math.round(p.position.x), y: Math.round(p.position.y) },
                    hp: `${p.hitPoints || 0}/${p.maxHitPoints || 100}`,
                    state: this.getPlayerState(p),
                    facing: p.facing,
                    velocity: { x: p.velocity?.x || 0, y: p.velocity?.y || 0 }
                });
            }
        }
        
        return players;
    }
    
    captureMonsterStates(game) {
        const monsters = [];
        
        // Only server-controlled monsters now
        if (game.remoteMonsters) {
            for (const [id, m] of game.remoteMonsters) {
                monsters.push({
                    type: m.type,
                    id: id,
                    pos: { x: Math.round(m.position.x), y: Math.round(m.position.y) },
                    hp: `${m.hitPoints || 0}/${m.maxHitPoints || 1}`,
                    state: m.state || 'idle',
                    target: m.target || 'none'
                });
            }
        }
        
        return monsters;
    }
    
    captureProjectiles(game) {
        const projectiles = [];
        
        if (game.systems.combat?.projectiles) {
            game.systems.combat.projectiles.forEach((p, i) => {
                if (p.active) {
                    projectiles.push({
                        id: i,
                        pos: { x: Math.round(p.position.x), y: Math.round(p.position.y) },
                        velocity: { x: p.velocity.x, y: p.velocity.y }
                    });
                }
            });
        }
        
        return projectiles;
    }
    
    getPlayerState(player) {
        if (player.isDead) return 'dead';
        if (player.isDying) return 'dying';
        if (player.isTakingDamage) return 'damaged';
        if (player.isAttacking) return `attacking(${player.currentAttackType})`;
        if (player.isMoving) return 'moving';
        return 'idle';
    }
    
    generateAsciiMap(game, width = 60, height = 30) {
        if (!game.entities.player) return 'No player to center map on';
        
        const centerX = game.entities.player.position.x;
        const centerY = game.entities.player.position.y;
        const scale = 32; // pixels per character
        
        // Initialize map with dots
        const map = Array(height).fill().map(() => Array(width).fill('·'));
        
        // Helper to place entity on map
        const placeEntity = (x, y, char) => {
            const mapX = Math.floor((x - centerX) / scale) + Math.floor(width / 2);
            const mapY = Math.floor((y - centerY) / scale) + Math.floor(height / 2);
            if (mapX >= 0 && mapX < width && mapY >= 0 && mapY < height) {
                map[mapY][mapX] = char;
            }
        };
        
        // Place server-controlled monsters
        if (game.remoteMonsters) {
            for (const m of game.remoteMonsters.values()) {
                if (m.alive) {
                    const char = m.type[0].toUpperCase(); // O for Ogre, S for Skeleton, etc
                    placeEntity(m.position.x, m.position.y, char);
                }
            }
        }
        
        // Place projectiles
        if (game.systems.combat?.projectiles) {
            game.systems.combat.projectiles.forEach(p => {
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
    
    logEvent(eventType, data) {
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
        if (this.autoDumpTriggers[eventType]) {
            this.dumpDebugState(`debug-${eventType}-${Date.now()}.txt`);
        }
    }
    
    async dumpDebugState(filename = 'debug-dump.txt') {
        const lastStates = this.stateHistory.slice(-20);
        const recentEvents = this.eventLog.slice(-100);
        
        let output = '=== HARDMODE DEBUG DUMP ===\n';
        output += `Generated: ${new Date().toISOString()}\n`;
        output += `Total frames captured: ${this.frameCount}\n\n`;
        
        // Current state
        const current = lastStates[lastStates.length - 1];
        if (current) {
            output += `=== CURRENT STATE (Frame ${current.frame}) ===\n\n`;
            
            output += 'Players:\n';
            current.players.forEach(p => {
                output += `  [${p.id}] ${p.class} @ (${p.pos.x}, ${p.pos.y})\n`;
                output += `       HP: ${p.hp}, State: ${p.state}, Facing: ${p.facing}\n`;
                if (p.velocity.x !== 0 || p.velocity.y !== 0) {
                    output += `       Velocity: (${p.velocity.x.toFixed(1)}, ${p.velocity.y.toFixed(1)})\n`;
                }
            });
            
            output += '\nMonsters:\n';
            current.monsters.forEach(m => {
                output += `  [${m.id}] ${m.type} @ (${m.pos.x}, ${m.pos.y})\n`;
                output += `       HP: ${m.hp}, State: ${m.state}, Target: ${m.target}\n`;
            });
            
            if (current.projectiles.length > 0) {
                output += '\nProjectiles:\n';
                current.projectiles.forEach(p => {
                    output += `  [${p.id}] @ (${p.pos.x}, ${p.pos.y}) velocity: (${p.velocity.x.toFixed(1)}, ${p.velocity.y.toFixed(1)})\n`;
                });
            }
            
            output += '\n=== MAP VISUALIZATION ===\n';
            output += current.asciiMap + '\n';
        }
        
        // Recent events
        output += '\n=== RECENT EVENTS (last 100) ===\n';
        const eventCounts = {};
        recentEvents.forEach(e => {
            const time = new Date(e.timestamp).toLocaleTimeString();
            output += `[${time}] Frame ${e.frame}: ${e.type}`;
            if (e.data) {
                output += ` - ${JSON.stringify(e.data)}`;
            }
            output += '\n';
            
            // Count event types
            eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
        });
        
        output += '\nEvent Summary:\n';
        Object.entries(eventCounts).forEach(([type, count]) => {
            output += `  ${type}: ${count}\n`;
        });
        
        // State changes over time
        output += '\n=== STATE HISTORY (last 20 frames) ===\n';
        lastStates.forEach((state, i) => {
            if (i > 0) {
                const prevState = lastStates[i - 1];
                const changes = [];
                
                // Check for player changes
                state.players.forEach(p => {
                    const prev = prevState.players.find(pp => pp.id === p.id);
                    if (prev) {
                        if (prev.hp !== p.hp) changes.push(`${p.id} HP: ${prev.hp} → ${p.hp}`);
                        if (prev.state !== p.state) changes.push(`${p.id} state: ${prev.state} → ${p.state}`);
                    }
                });
                
                if (changes.length > 0) {
                    output += `Frame ${state.frame}: ${changes.join(', ')}\n`;
                }
            }
        });
        
        // Save to server
        try {
            const response = await fetch('/debug-log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: filename,
                    content: output
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`Debug state saved to server: debug-logs/${result.filename}`);
            } else {
                console.error('Failed to save debug log to server');
                // Fallback to download
                this.downloadDebugFile(filename, output);
            }
        } catch (error) {
            console.error('Error saving debug log:', error);
            // Fallback to download
            this.downloadDebugFile(filename, output);
        }
        
        return output;
    }
    
    downloadDebugFile(filename, content) {
        // Fallback method for downloading file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        console.log(`Debug state downloaded as ${filename}`);
    }
    
    // Console command for manual dumps
    setupConsoleCommands() {
        window.debugDump = () => this.dumpDebugState();
        window.debugToggle = () => {
            this.enabled = !this.enabled;
            console.log(`Debug logging ${this.enabled ? 'enabled' : 'disabled'}`);
        };
        window.debugClear = () => {
            this.stateHistory = [];
            this.eventLog = [];
            this.frameCount = 0;
            console.log('Debug history cleared');
        };
        
        console.log('Debug commands available: debugDump(), debugToggle(), debugClear()');
    }
}