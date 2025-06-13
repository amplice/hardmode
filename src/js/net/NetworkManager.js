import { io } from 'socket.io-client';
import { ClientMessages } from './MessageTypes.js';
import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG, MONSTER_CONFIG } from '../config/GameConfig.js';



export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.gameId = null;
        this.playerId = null;
        this.worldSeed = null;
        this.serverPlayers = new Map();
        this.serverMonsters = new Map();
        this.inputSequence = 0;
    }

    connect(serverUrl) {
        this.socket = io(serverUrl);
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.playerId = this.socket.id;
        });

        this.socket.on('game_state', (state) => {
            this.handleGameState(state);
        });

        this.socket.on('game_created', ({ gameId }) => {
            this.gameId = gameId;
            console.log('Game created', gameId);
        });

        this.socket.on('join_result', ({ success, gameId }) => {
            if (success) {
                this.gameId = gameId;
                console.log('Joined game', gameId);
            } else {
                console.warn('Failed to join game', gameId);
            }
        });

        this.socket.on('player_joined', ({ playerId, playerState }) => {
            console.log('Player joined', playerId);
            if (playerId !== this.playerId) {
                this.handleRemotePlayerJoined(playerId, playerState);
            }
        });

        this.socket.on('player_left', ({ playerId }) => {
            console.log('Player left', playerId);
            this.handleRemotePlayerLeft(playerId);
        });

        this.socket.on('entity_spawn', ({ type, entity }) => {
            if (type === 'monster') {
                this.handleMonsterSpawn(entity);
            }
        });

        this.socket.on('entity_despawn', ({ id }) => {
            this.handleEntityDespawn(id);
        });

        this.socket.on('damage_event', ({ targetId, damage, attackerId }) => {
            this.handleDamageEvent(targetId, damage, attackerId);
        });

        this.socket.on('player_died', ({ playerId }) => {
            this.handlePlayerDied(playerId);
        });

        this.socket.on('player_respawned', ({ playerId, position, hitPoints }) => {
            this.handlePlayerRespawned(playerId, position, hitPoints);
        });
    }

    handleGameState(state) {
        // Store world seed if this is the first state update
        if (state.worldSeed && !this.worldSeed) {
            this.worldSeed = state.worldSeed;
            // Regenerate world with the server's seed if needed
            if (this.game.gameStarted && this.game.systems.world) {
                // Would need to implement seeded world generation
                console.log('Received world seed:', state.worldSeed);
            }
        }

        // Update player states
        if (state.players) {
            for (const playerData of state.players) {
                if (playerData.id === this.playerId) {
                    // Update local player from server state
                    if (this.game.entities.player) {
                        this.updateLocalPlayer(playerData);
                    }
                } else {
                    // Update or create remote players
                    this.updateRemotePlayer(playerData);
                }
            }
        }

        // Update monster states
        if (state.monsters) {
            this.updateMonsters(state.monsters);
        }
    }

    updateLocalPlayer(serverData) {
        const player = this.game.entities.player;
        
        // Only update certain properties from server
        // Position is handled by client prediction
        player.hitPoints = serverData.hitPoints;
        player.maxHitPoints = serverData.maxHitPoints;
        player.killCount = serverData.killCount;
        player.experience = serverData.experience;
        player.level = serverData.level;
        
        // Force stats UI update
        if (this.game.statsUI) {
            this.game.statsUI.update();
        }
        if (this.game.healthUI) {
            this.game.healthUI.update();
        }
    }

    updateRemotePlayer(playerData) {
        let remotePlayer = this.serverPlayers.get(playerData.id);
        
        if (!remotePlayer) {
            // Create new remote player representation
            this.createRemotePlayer(playerData);
        } else {
            // Update existing remote player
            remotePlayer.position.x = playerData.position.x;
            remotePlayer.position.y = playerData.position.y;
            remotePlayer.sprite.position.set(playerData.position.x, playerData.position.y);
            remotePlayer.facing = playerData.facing;
            remotePlayer.isAttacking = playerData.isAttacking;
            remotePlayer.hitPoints = playerData.hitPoints;
            
            // Update visual representation
            this.updateRemotePlayerVisual(remotePlayer, playerData);
        }
    }

    createRemotePlayer(playerData) {
        // Create a visual representation for remote player
        const container = new PIXI.Container();
        container.position.set(playerData.position.x, playerData.position.y);
        
        // Create placeholder circle
        const graphics = new PIXI.Graphics();
        const classConfig = PLAYER_CONFIG.classes[playerData.characterClass];
        const color = classConfig?.baseColor || 0xFFFFFF;
        
        graphics.beginFill(color);
        graphics.drawCircle(0, 0, 20);
        graphics.endFill();
        
        // Add direction indicator
        graphics.beginFill(0xFFFFFF);
        const facingOffsets = {
            'down': { x: 0, y: 15 },
            'up': { x: 0, y: -15 },
            'left': { x: -15, y: 0 },
            'right': { x: 15, y: 0 }
        };
        const offset = facingOffsets[playerData.facing] || { x: 0, y: 15 };
        graphics.drawCircle(offset.x, offset.y, 5);
        graphics.endFill();
        
        container.addChild(graphics);
        
        // Add name label
        const nameText = new PIXI.Text(`Player ${playerData.id.substring(0, 6)}`, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xFFFFFF,
            align: 'center'
        });
        nameText.anchor.set(0.5, 0);
        nameText.position.set(0, -35);
        container.addChild(nameText);
        
        // Add to game
        this.game.entityContainer.addChild(container);
        
        // Store remote player data
        const remotePlayer = {
            id: playerData.id,
            position: { x: playerData.position.x, y: playerData.position.y },
            sprite: container,
            graphics: graphics,
            facing: playerData.facing,
            characterClass: playerData.characterClass,
            isAttacking: playerData.isAttacking,
            hitPoints: playerData.hitPoints
        };
        
        this.serverPlayers.set(playerData.id, remotePlayer);
    }

    updateRemotePlayerVisual(remotePlayer, playerData) {
        // Redraw the graphics based on current state
        remotePlayer.graphics.clear();
        
        const classConfig = PLAYER_CONFIG.classes[playerData.characterClass];
        const color = classConfig?.baseColor || 0xFFFFFF;
        
        // Draw body
        remotePlayer.graphics.beginFill(color);
        remotePlayer.graphics.drawCircle(0, 0, 20);
        remotePlayer.graphics.endFill();
        
        // Draw facing indicator
        remotePlayer.graphics.beginFill(0xFFFFFF);
        const facingOffsets = {
            'down': { x: 0, y: 15 },
            'up': { x: 0, y: -15 },
            'left': { x: -15, y: 0 },
            'right': { x: 15, y: 0 }
        };
        const offset = facingOffsets[playerData.facing] || { x: 0, y: 15 };
        remotePlayer.graphics.drawCircle(offset.x, offset.y, 5);
        remotePlayer.graphics.endFill();
        
        // Show attack state
        if (playerData.isAttacking) {
            remotePlayer.graphics.lineStyle(3, 0xFF0000);
            remotePlayer.graphics.drawCircle(0, 0, 25);
        }
    }

    handleRemotePlayerJoined(playerId, playerState) {
        if (playerId !== this.playerId) {
            this.updateRemotePlayer(playerState);
        }
    }

    handleRemotePlayerLeft(playerId) {
        const remotePlayer = this.serverPlayers.get(playerId);
        if (remotePlayer && remotePlayer.sprite.parent) {
            remotePlayer.sprite.parent.removeChild(remotePlayer.sprite);
        }
        this.serverPlayers.delete(playerId);
    }

    updateMonsters(monsterData) {
        // Update existing monsters and create new ones
        const activeMonsterIds = new Set();
        
        for (const monster of monsterData) {
            activeMonsterIds.add(monster.id);
            
            let existingMonster = this.game.systems.monsters?.monsters.find(m => m.id === monster.id);
            
            if (!existingMonster) {
                // Create new monster
                this.createMonsterFromServer(monster);
            } else {
                // Update existing monster
                existingMonster.position.x = monster.position.x;
                existingMonster.position.y = monster.position.y;
                existingMonster.facing = monster.facing;
                existingMonster.alive = monster.alive;
                existingMonster.hitPoints = monster.hitPoints;
                
                // Update sprite position
                if (existingMonster.sprite) {
                    existingMonster.sprite.position.set(monster.position.x, monster.position.y);
                }
            }
        }
        
        // Remove monsters that are no longer in server state
        if (this.game.systems.monsters) {
            this.game.systems.monsters.monsters = this.game.systems.monsters.monsters.filter(m => {
                if (!activeMonsterIds.has(m.id)) {
                    if (m.sprite && m.sprite.parent) {
                        m.sprite.parent.removeChild(m.sprite);
                    }
                    return false;
                }
                return true;
            });
        }
    }

    createMonsterFromServer(monsterData) {
        if (!this.game.systems.monsters) return;
        
        // Import Monster class
        import('../entities/monsters/Monster.js').then(({ Monster }) => {
            const monster = new Monster({
                id: monsterData.id,
                x: monsterData.position.x,
                y: monsterData.position.y,
                type: monsterData.type
            });
            
            // Override with server data
            monster.hitPoints = monsterData.hitPoints;
            monster.alive = monsterData.alive;
            monster.facing = monsterData.facing;
            
            this.game.systems.monsters.monsters.push(monster);
            this.game.entityContainer.addChild(monster.sprite);
        });
    }

    handleMonsterSpawn(entity) {
        this.createMonsterFromServer(entity);
    }

    handleEntityDespawn(id) {
        // Find and remove the entity
        if (this.game.systems.monsters) {
            const monsterIndex = this.game.systems.monsters.monsters.findIndex(m => m.id === id);
            if (monsterIndex !== -1) {
                const monster = this.game.systems.monsters.monsters[monsterIndex];
                if (monster.sprite && monster.sprite.parent) {
                    monster.sprite.parent.removeChild(monster.sprite);
                }
                this.game.systems.monsters.monsters.splice(monsterIndex, 1);
            }
        }
    }

    handleDamageEvent(targetId, damage, attackerId) {
        // Handle damage visuals/sounds
        console.log(`${attackerId} dealt ${damage} damage to ${targetId}`);
        
        // Find the target and apply visual feedback
        if (targetId === this.playerId) {
            // Local player took damage - this is handled by server state update
        } else {
            // Check if it's a monster
            const monster = this.game.systems.monsters?.monsters.find(m => m.id === targetId);
            if (monster) {
                // Trigger damage animation if available
                if (monster.takeDamage) {
                    monster.takeDamage(damage);
                }
            }
        }
    }

    handlePlayerDied(playerId) {
        if (playerId === this.playerId) {
            // Local player died
            console.log("You died!");
        } else {
            // Remote player died
            const remotePlayer = this.serverPlayers.get(playerId);
            if (remotePlayer) {
                // Could play death animation
                remotePlayer.graphics.alpha = 0.3;
            }
        }
    }

    handlePlayerRespawned(playerId, position, hitPoints) {
        if (playerId === this.playerId) {
            // Local player respawned
            if (this.game.entities.player) {
                this.game.entities.player.position.x = position.x;
                this.game.entities.player.position.y = position.y;
                this.game.entities.player.hitPoints = hitPoints;
                this.game.entities.player.isDead = false;
                this.game.entities.player.isDying = false;
            }
        } else {
            // Remote player respawned
            const remotePlayer = this.serverPlayers.get(playerId);
            if (remotePlayer) {
                remotePlayer.position = position;
                remotePlayer.sprite.position.set(position.x, position.y);
                remotePlayer.graphics.alpha = 1;
            }
        }
    }

    isConnected() {
        return this.socket && this.socket.connected;
    }

    sendInput(input) {
        if (this.isConnected()) {
            this.inputSequence++;
            this.socket.emit('input', {
                ...input,
                sequenceNumber: this.inputSequence,
                timestamp: Date.now()
            });
        }
    }

    createGame() {
        if (this.isConnected()) {
            this.socket.emit('create_game');
        }
    }

    joinGame(gameId) {
        if (this.isConnected()) {
            this.socket.emit('join_game', { gameId });
        }
    }

    selectClass(className) {
        if (this.isConnected()) {
            this.socket.emit('class_select', { className });
        }
    }

    setReady() {
        if (this.isConnected()) {
            this.socket.emit('player_ready');
        }
    }
}