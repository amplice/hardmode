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
                    // Sync bonuses from server if they're included
                    if (p.moveSpeedBonus !== undefined && this.game.entities.player) {
                        const player = this.game.entities.player;
                        player.moveSpeedBonus = p.moveSpeedBonus;
                        player.attackRecoveryBonus = p.attackRecoveryBonus;
                        player.attackCooldownBonus = p.attackCooldownBonus;
                        player.rollUnlocked = p.rollUnlocked;
                        // Update move speed if it changed
                        const baseSpeed = player.getClassMoveSpeed();
                        player.moveSpeed = baseSpeed + player.moveSpeedBonus;
                        // Also sync max HP if it changed
                        if (p.maxHp !== undefined && player.maxHitPoints !== p.maxHp) {
                            player.maxHitPoints = p.maxHp;
                            if (this.game.healthUI) {
                                this.game.healthUI.update();
                            }
                        }
                    }
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
                
                // If monster was stunned, show visual feedback
                if (data.stunned) {
                    console.log(`[CONFIRMED] ${monster.type} stunned by hit`);
                    // Trigger stun animation
                    monster.changeState('stunned');
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
                    // Update local player XP and level through the stats component
                    if (this.game.entities.player && this.game.entities.player.stats) {
                        this.game.entities.player.experience = data.killerXp;
                        this.game.entities.player.level = data.killerLevel;
                        // Force the stats component to update by calling addExperience with 0
                        this.game.entities.player.stats.owner.experience = data.killerXp;
                        this.game.entities.player.stats.owner.level = data.killerLevel;
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
                    const player = this.game.entities.player;
                    player.level = data.level;
                    player.hitPoints = data.hp;
                    
                    // Apply level bonuses from server
                    player.moveSpeedBonus = data.moveSpeedBonus || 0;
                    player.attackRecoveryBonus = data.attackRecoveryBonus || 0;
                    player.attackCooldownBonus = data.attackCooldownBonus || 0;
                    player.rollUnlocked = data.rollUnlocked || false;
                    
                    // Update actual move speed
                    const baseSpeed = player.getClassMoveSpeed();
                    player.moveSpeed = baseSpeed + player.moveSpeedBonus;
                    
                    // Update stats component
                    if (player.stats) {
                        player.stats.owner.level = data.level;
                    }
                    
                    // Update max HP from server (important for level 10 bonus)
                    if (data.maxHp !== undefined) {
                        player.maxHitPoints = data.maxHp;
                        player.hitPoints = data.hp; // Server sends full HP on level up
                        // Force health UI update
                        if (this.game.healthUI) {
                            this.game.healthUI.update();
                        }
                    }
                    
                    // Play level up effect
                    player.playLevelUpEffect?.();
                }
            }
        });

        this.socket.on('playerRespawned', (data) => {
            if (data.playerId === this.socket.id) {
                // We respawned - reset our XP and level
                console.log(`You respawned! Reset to level ${data.level} with ${data.xp} XP`);
                if (this.game.entities.player) {
                    const player = this.game.entities.player;
                    player.level = data.level;
                    player.experience = data.xp;
                    player.hitPoints = data.hp;
                    
                    // Reset bonuses
                    player.moveSpeedBonus = data.moveSpeedBonus || 0;
                    player.attackRecoveryBonus = data.attackRecoveryBonus || 0;
                    player.attackCooldownBonus = data.attackCooldownBonus || 0;
                    player.rollUnlocked = data.rollUnlocked || false;
                    
                    // Reset max HP to base class HP (no level 10 bonus after respawn)
                    if (data.maxHp !== undefined) {
                        player.maxHitPoints = data.maxHp;
                    }
                    
                    // Reset move speed to base
                    const baseSpeed = player.getClassMoveSpeed();
                    player.moveSpeed = baseSpeed + player.moveSpeedBonus;
                    
                    // Update stats component
                    if (player.stats) {
                        player.stats.owner.level = data.level;
                        player.stats.owner.experience = data.xp;
                    }
                    
                    // Trigger respawn in the player component
                    player.health.respawn();
                    // Force health UI update after respawn
                    if (this.game.healthUI) {
                        this.game.healthUI.update();
                    }
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
        
        // Handle ability events from server
        this.socket.on('playerAbilityStart', (data) => {
            // Handle movement abilities that need visual updates
            if (data.type === 'dash' || data.type === 'jump') {
                const isLocalPlayer = data.playerId === this.socket.id;
                const player = isLocalPlayer ? 
                    this.game.entities.player : 
                    this.game.remotePlayers?.get(data.playerId);
                    
                if (player) {
                    // The server controls the movement, we just need to handle visual effects
                    // and animation state
                    player.isAttacking = true;
                    player.currentAttackType = data.abilityKey;
                    
                    // Store the start position for effects
                    player.startPositionForAttack = { x: data.startX, y: data.startY };
                    
                    // For jump attacks, we need to show a jump arc visually
                    if (data.type === 'jump' && player.sprite) {
                        // Store the jump data for visual interpolation
                        player.jumpData = {
                            startX: data.startX,
                            startY: data.startY,
                            endX: data.endX,
                            endY: data.endY,
                            startTime: Date.now(),
                            duration: data.duration,
                            backwardJump: data.backwardJump
                        };
                        
                        // Start the visual jump animation
                        const jumpHeight = 80; // Default jump height
                        const animateJump = (timestamp) => {
                            if (!player.jumpData) return; // Jump was cancelled
                            
                            const elapsed = timestamp - player.jumpData.startTime;
                            const progress = Math.min(elapsed / player.jumpData.duration, 1);
                            
                            // Server controls X/Y, we just add visual height
                            const height = Math.sin(Math.PI * progress) * jumpHeight;
                            
                            // Update sprite visual position (not the actual position)
                            if (player.sprite) {
                                player.sprite.position.set(
                                    player.position.x,
                                    player.position.y - height
                                );
                            }
                            
                            if (progress < 1) {
                                requestAnimationFrame(animateJump);
                            } else {
                                // Ensure sprite is back at ground level
                                if (player.sprite) {
                                    player.sprite.position.set(player.position.x, player.position.y);
                                }
                            }
                        };
                        requestAnimationFrame(animateJump);
                    }
                }
            }
        });
        
        this.socket.on('playerAbilityComplete', (data) => {
            const isLocalPlayer = data.playerId === this.socket.id;
            const player = isLocalPlayer ? 
                this.game.entities.player : 
                this.game.remotePlayers?.get(data.playerId);
                
            if (player) {
                // Clear ability state
                if (player.jumpData) {
                    delete player.jumpData;
                }
                
                // End the attack state if needed
                if (player.combat && player.isAttacking) {
                    player.combat.endAttack();
                }
            }
        });
        
        // Handle ability damage events from server
        this.socket.on('playerAbilityDamage', (data) => {
            const isLocalPlayer = data.playerId === this.socket.id;
            const player = isLocalPlayer ? 
                this.game.entities.player : 
                this.game.remotePlayers?.get(data.playerId);
                
            if (player && this.game.systems?.combat) {
                // Create hitbox and apply damage
                const hitbox = this.game.systems.combat.createHitbox(
                    { x: data.x, y: data.y },
                    data.facing,
                    data.config.hitboxType,
                    data.config.hitboxParams,
                    { 
                        color: 0xFF0000, 
                        fillAlpha: 0.0, 
                        lineAlpha: 0.0, 
                        lineWidth: 3, 
                        duration: 0.2 
                    }
                );
                
                if (hitbox) {
                    // Only the attacking player applies damage
                    if (isLocalPlayer) {
                        this.game.systems.combat.applyHitEffects(player, hitbox, data.config.damage);
                    }
                }
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
    
    /**
     * Send input command to server for client-side prediction
     * @param {Object} inputCommand - Network input command from InputBuffer
     */
    sendPlayerInput(inputCommand) {
        if (!this.connected) {
            console.warn('Cannot send input - not connected to server');
            return;
        }
        
        this.socket.emit('playerInput', inputCommand);
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
    
    sendAbilityRequest(abilityType, extraData = {}) {
        if (!this.connected) {
            console.error('Cannot send ability request - not connected');
            return;
        }
        
        console.log('Sending ability request to server:', abilityType, extraData);
        this.socket.emit('executeAbility', {
            abilityType: abilityType,
            ...extraData
        });
    }
}
