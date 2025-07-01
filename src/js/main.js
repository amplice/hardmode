import { Game } from './core/Game.js';

// Prevent zoom via keyboard and mouse
function preventZoom() {
    // Prevent Ctrl+/- and Ctrl+scroll wheel zoom
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
            e.preventDefault();
        }
    });

    // Prevent pinch zoom and scroll wheel zoom
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent touch zoom gestures
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Prevent double-tap zoom
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('gesturechange', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('gestureend', (e) => {
        e.preventDefault();
    });
}

window.addEventListener('DOMContentLoaded', () => {
    // Set up zoom prevention
    preventZoom();
    
    const game = new Game();
    window.game = game; // For debugging
});
