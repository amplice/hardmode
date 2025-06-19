export class NetworkClient {
    constructor(game) {
        this.game = game;
        this.socket = io();
        this.players = new Map();
        this.monsters = new Map();
        this.connected = false; // Initialize connected state

        this.setupHandlers();
        console.log('NetworkClient initialized');
    }

    setClass(cls) {
        this.socket.emit('setClass', cls);
    }

    sendAttack(player, type) {
        this.socket.emit('attack', {
            type,
            x: player.position.x,
            y: player.position.y,
            facing: player.facing
        });
    }

    setupHandlers() {
        this.socket.on('init', data => {
            this.id = data.id;
            this.connected = true; // Mark as connected
            console.log('Connected to server with id:', this.id);
            this.game.initMultiplayerWorld(data.world);
            data.players.forEach(p => {
                if (p.id !== this.id) this.game.addRemotePlayer(p);
            });
            data.monsters.forEach(m => this.game.addOrUpdateMonster(m));
        });

        this.socket.on('playerJoined', p => {
            if (p.id !== this.id) this.game.addRemotePlayer(p);
        });

        this.socket.on('playerLeft', id => {
            this.game.removeRemotePlayer(id);
        });

        this.socket.on('state', state => {
            state.players.forEach(p => {
                if (p.id === this.id) {
                    this.game.updateLocalPlayerState(p);
                } else {
                    this.game.updateRemotePlayer(p);
                }
            });
            state.monsters.forEach(m => this.game.addOrUpdateMonster(m));
            
            // Update projectiles
            if (state.projectiles && this.game.projectileRenderer) {
                state.projectiles.forEach(p => {
                    this.game.projectileRenderer.updateProjectile(p.id, p.x, p.y);
                });
            }
        });

        this.socket.on('playerAttack', data => {
            if (data.id !== this.id) {
                this.game.remotePlayerAttack(data.id, data.type, data.facing);
            }
        });

        // Monster events
        this.socket.on('monsterDamaged', (data) => {
            const monster = this.game.remoteMonsters?.get(data.monsterId);
            if (monster) {
                monster.hp = data.hp;
                monster.showDamageEffect?.();
                
                // Show damage number if we attacked it
                if (data.attacker === this.socket.id) {
                    this.game.showDamageNumber?.(monster.position, data.damage);
                }
            }
        });

        this.socket.on('monsterKilled', (data) => {
            const monster = this.game.remoteMonsters?.get(data.monsterId);
            if (monster) {
                monster.playDeathAnimation?.();
                
                // Show XP gain if we killed it
                if (data.killedBy === this.socket.id) {
                    this.game.showXpGain?.(monster.position, data.xpReward);
                    // Update local player XP display
                    if (this.game.entities.player) {
                        this.game.entities.player.experience = data.killerXp;
                        this.game.entities.player.level = data.killerLevel;
                    }
                }
            }
        });

        this.socket.on('playerDamaged', (data) => {
            if (data.playerId === this.socket.id) {
                // We took damage - sync HP and show damage effects
                if (this.game.entities.player) {
                    this.game.entities.player.hitPoints = data.hp;
                    // Show damage effects without applying damage again
                    this.game.entities.player.isTakingDamage = true;
                    this.game.entities.player.damageStunTimer = this.game.entities.player.damageStunDuration;
                    this.game.entities.player.animation.playDamageAnimation();
                }
            } else {
                // Another player took damage
                const remotePlayer = this.game.remotePlayers?.get(data.playerId);
                if (remotePlayer) {
                    remotePlayer.hitPoints = data.hp;
                    remotePlayer.showDamageEffect?.();
                }
            }
        });

        this.socket.on('playerKilled', (data) => {
            if (data.playerId === this.socket.id) {
                // We died
                console.log(`You were killed by ${data.killedBy}!`);
                if (this.game.entities.player) {
                    this.game.entities.player.health.die();
                }
            } else {
                // Another player died
                const remotePlayer = this.game.remotePlayers?.get(data.playerId);
                if (remotePlayer) {
                    remotePlayer.health?.die();
                }
            }
        });

        this.socket.on('playerLevelUp', (data) => {
            if (data.playerId === this.socket.id) {
                // We leveled up
                console.log(`Level up! You are now level ${data.level}`);
                if (this.game.entities.player) {
                    this.game.entities.player.level = data.level;
                    this.game.entities.player.hitPoints = data.hp;
                }
            }
        });
        
        // Handle disconnection
        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('Disconnected from server');
        });
        
        // Handle connection errors
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error.message);
        });
        
        // Handle projectile events
        this.socket.on('projectileCreated', (data) => {
            if (this.game.projectileRenderer) {
                this.game.projectileRenderer.createProjectile(data);
            }
        });
        
        this.socket.on('projectileDestroyed', (data) => {
            if (this.game.projectileRenderer) {
                this.game.projectileRenderer.destroyProjectile(data.id, data.reason);
            }
        });
    }

    sendMonsterDamage(monsterId, damage, attackType) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('attackMonster', {
                monsterId,
                damage,
                attackType,
                timestamp: Date.now(),
                position: {
                    x: Math.round(this.game.entities.player.position.x),
                    y: Math.round(this.game.entities.player.position.y)
                }
            });
        }
    }

    sendPlayerUpdate(player) {
        this.socket.emit('playerUpdate', {
            x: player.position.x,
            y: player.position.y,
            facing: player.facing
        });
    }
    
    createProjectile(data) {
        if (!this.connected) {
            console.error('Cannot create projectile - not connected');
            return;
        }
        
        console.log('Sending createProjectile to server:', data);
        this.socket.emit('createProjectile', {
            x: data.x,
            y: data.y,
            angle: data.angle,
            speed: data.speed,
            damage: data.damage,
            range: data.range,
            effectType: data.effectType
        });
    }
}
