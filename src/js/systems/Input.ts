/**
 * @fileoverview InputSystem - Client-side input handling with TypeScript conversion
 * 
 * MIGRATION NOTES:
 * - Converted from Input.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 3
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added strict type definitions for all input state structures
 * - Preserved all existing event handling behavior
 */

import { InputState } from '../types/index.js';

interface KeyState {
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    space: boolean;
    shift: boolean;
}

interface MouseState {
    position: { x: number; y: number };
    leftButton: boolean;
}

export class InputSystem {
    private keys: KeyState;
    private mouse: MouseState;

    constructor() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false,
            shift: false
        };
        
        this.mouse = {
            position: { x: 0, y: 0 },
            leftButton: false
        };
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mouse events
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Prevent context menu on right-click
        window.addEventListener('contextmenu', (e: Event) => e.preventDefault());
    }
    
    private handleKeyDown(event: KeyboardEvent): void {
        switch (event.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
            case ' ': this.keys.space = true; break; // Space bar
            case 'shift': this.keys.shift = true; break;
        }
    }
    
    private handleKeyUp(event: KeyboardEvent): void {
        switch (event.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
            case ' ': this.keys.space = false; break; // Space bar
            case 'shift': this.keys.shift = false; break;
        }
    }
    
    private handleMouseMove(event: MouseEvent): void {
        this.mouse.position.x = event.clientX;
        this.mouse.position.y = event.clientY;
    }
    
    private handleMouseDown(event: MouseEvent): void {
        if (event.button === 0) { // Left mouse button
            this.mouse.leftButton = true;
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        if (event.button === 0) { // Left mouse button
            this.mouse.leftButton = false;
        }
    }
    
    update(): InputState {
        // Return the current input state
        return {
            up: this.keys.w,
            left: this.keys.a,
            down: this.keys.s,
            right: this.keys.d,
            primaryAttack: this.mouse.leftButton,
            secondaryAttack: this.keys.space, // Space bar
            roll: this.keys.shift,
            mousePosition: { ...this.mouse.position }
        };
    }
}