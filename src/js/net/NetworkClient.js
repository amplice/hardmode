export class NetworkClient {
    constructor(game) {
        this.game = game;
        this.socket = io();
        this.players = new Map();
        this.monsters = new Map();

        this.setupHandlers();
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
        });

        this.socket.on('playerAttack', data => {
            if (data.id !== this.id) {
                this.game.remotePlayerAttack(data.id, data.type, data.facing);
            }
        });
    }

    sendPlayerUpdate(player) {
        this.socket.emit('playerUpdate', {
            x: player.position.x,
            y: player.position.y,
            facing: player.facing
        });
    }
}
