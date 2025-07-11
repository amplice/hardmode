/**
 * @fileoverview Main entry point for the Hardmode game client
 * 
 * MIGRATION NOTES:
 * - Converted from main.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN
 * - Maintains all anti-cheat zoom prevention functionality
 * - Added type safety for event handlers and global window object
 * - Preserved all browser zoom detection logic
 * 
 * ARCHITECTURE ROLE:
 * - Game initialization entry point
 * - Sets up anti-cheat zoom prevention
 * - Instantiates main Game class on DOM ready
 * - Exposes game instance globally for debugging
 * 
 * ANTI-CHEAT FEATURES:
 * - Prevents browser zoom manipulation for fair play
 * - Blocks keyboard shortcuts (Ctrl+/-, Ctrl+0)
 * - Blocks mouse wheel zoom with Ctrl/Cmd
 * - Prevents touch/gesture zoom on mobile
 * - Detects and reloads on zoom changes
 * 
 * ZOOM DETECTION ALGORITHM:
 * - Monitors devicePixelRatio changes
 * - Tracks window width for suspicious changes
 * - Checks every second for zoom modifications
 * - Forces reload if zoom detected
 */

import { Game } from './core/Game.js';

// Global zoom prevention state
let zoomPreventionEnabled = true;

// Toggle zoom prevention (for debugging terrain)
function toggleZoomPrevention(): void {
    zoomPreventionEnabled = !zoomPreventionEnabled;
    console.log(`%c[Debug] Zoom prevention ${zoomPreventionEnabled ? 'ENABLED' : 'DISABLED'}`, 
        `color: ${zoomPreventionEnabled ? 'red' : 'green'}; font-weight: bold;`);
    
    if (zoomPreventionEnabled) {
        console.log('%cBrowser zoom will cause automatic page reload.', 'color: orange;');
    } else {
        console.log('%cZoom freely for terrain debugging. Press F3 to re-enable protection.', 'color: green;');
    }
}

// Prevent zoom via keyboard and mouse
function preventZoom(): void {
    // Prevent Ctrl+/- and Ctrl+scroll wheel zoom (when enabled)
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        // F3 key toggles zoom prevention
        if (e.key === 'F3') {
            e.preventDefault();
            toggleZoomPrevention();
            return;
        }
        
        // Block zoom keys only if prevention is enabled
        if (zoomPreventionEnabled && (e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
            e.preventDefault();
        }
    });

    // Prevent pinch zoom and scroll wheel zoom (when enabled)
    document.addEventListener('wheel', (e: WheelEvent) => {
        if (zoomPreventionEnabled && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent touch zoom gestures (when enabled)
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e: TouchEvent) => {
        if (!zoomPreventionEnabled) return;
        
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Prevent double-tap zoom (when enabled)
    document.addEventListener('gesturestart', (e: Event) => {
        if (zoomPreventionEnabled) e.preventDefault();
    });
    
    document.addEventListener('gesturechange', (e: Event) => {
        if (zoomPreventionEnabled) e.preventDefault();
    });
    
    document.addEventListener('gestureend', (e: Event) => {
        if (zoomPreventionEnabled) e.preventDefault();
    });
    
    // ANTI-CHEAT: Detect and prevent browser zoom changes
    let lastDevicePixelRatio = window.devicePixelRatio;
    let lastWidth = window.innerWidth;
    
    function detectZoomChange(): void {
        // Only detect zoom changes when prevention is enabled
        if (!zoomPreventionEnabled) {
            // Update tracking values even when disabled to avoid false positives when re-enabling
            lastDevicePixelRatio = window.devicePixelRatio;
            lastWidth = window.innerWidth;
            return;
        }
        
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
    console.log('%c[Debug] Press F3 to toggle zoom prevention for terrain debugging', 'color: cyan; font-size: 12px;');
}

window.addEventListener('DOMContentLoaded', () => {
    // Set up zoom prevention
    preventZoom();
    
    const game = new Game();
    (window as any).game = game; // For debugging
});