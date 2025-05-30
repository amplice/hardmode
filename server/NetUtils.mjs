import { ReliableServerEvents } from '../src/js/net/EventReliability.js';

export function sendReliable(socket, event, data) {
    socket.emit(event, data);
}

export function sendUnreliable(socket, event, data) {
    socket.emit(event, data);
}

export function emitWithReliability(socket, event, data) {
    if (ReliableServerEvents.has(event)) {
        sendReliable(socket, event, data);
    } else {
        sendUnreliable(socket, event, data);
    }
}

