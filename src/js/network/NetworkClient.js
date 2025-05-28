import { io } from 'socket.io-client';

export class NetworkClient {
    constructor() {
        this.socket = io('ws://localhost:3000');
        this.handlers = {};
        this.socket.on('connect', () => console.log('Connected:', this.socket.id));
        this.socket.on('playerJoined', data => this.emit('playerJoined', data));
        this.socket.on('playerLeft', id => this.emit('playerLeft', id));
        this.socket.on('worldState', state => this.emit('worldState', state));
        this.socket.on('worldInit', data => this.emit('worldInit', data));
        this.socket.on('playerAction', data => this.emit('playerAction', data));
    }

    join(characterClass) {
        this.socket.emit('join', { class: characterClass });
    }

    sendState(state) {
        this.socket.emit('state', state);
    }

    sendAction(action) {
        this.socket.emit('playerAction', action);
    }

    on(event, fn) {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event].push(fn);
    }

    emit(event, data) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(fn => fn(data));
        }
    }
}
