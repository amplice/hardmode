import { Game } from './core/Game.js';
import { io } from 'socket.io-client';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    window.game = game; // For debugging

    // Establish Socket.io connection
    const socket = io('http://localhost:3000');
    game.socket = socket; // Store the socket instance in the game object

    // Optional: Log connection status
    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        // game.init() or other game initialization logic might go here
        // if it depends on the socket connection.
        // For now, we assume Game constructor handles necessary setup that can run before socket is fully connected,
        // or init is called elsewhere.
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    socket.on('connect_error', (err) => {
        console.error('Connection error:', err);
    });

    // If game.init() was intended to be here and relies on the game object,
    // it should be called after game is instantiated.
    // game.init(); // Or this might be handled within Game's constructor or another method.
});