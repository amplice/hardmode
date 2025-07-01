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
    
    // ANTI-CHEAT: Detect and prevent browser zoom changes
    let lastDevicePixelRatio = window.devicePixelRatio;
    let lastWidth = window.innerWidth;
    
    function detectZoomChange() {
        const currentRatio = window.devicePixelRatio;
        const currentWidth = window.innerWidth;
        
        // Detect zoom via devicePixelRatio change or suspicious width changes
        if (currentRatio !== lastDevicePixelRatio || 
            (Math.abs(currentWidth - lastWidth) > 50 && !document.hidden)) {
            
            console.warn('[AntiCheat] Browser zoom detected! Reloading to enforce fair play.');
            // Force reload to reset any zoom
            window.location.reload();
        }
        
        lastDevicePixelRatio = currentRatio;
        lastWidth = currentWidth;
    }
    
    // Check for zoom changes every second
    setInterval(detectZoomChange, 1000);
    
    // Also check on visibility change (when tab becomes active)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            detectZoomChange();
        }
    });
    
    // Log warning to console
    console.log('%c⚠️ FOV ANTI-CHEAT ACTIVE ⚠️', 'color: red; font-weight: bold; font-size: 16px;');
    console.log('%cBrowser zoom will cause automatic page reload to ensure fair play.', 'color: orange; font-size: 12px;');
}

window.addEventListener('DOMContentLoaded', () => {
    // Set up zoom prevention
    preventZoom();
    
    const game = new Game();
    window.game = game; // For debugging
});
