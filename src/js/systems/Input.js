export class InputSystem {
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
        this.chatActive = false; // Flag to indicate if chat input is active
        
        this.setupEventListeners();
    }

    setChatActive(isActive) {
        this.chatActive = isActive;
    }
    
    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mouse events
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Prevent context menu on right-click
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    handleKeyDown(event) {
        // If chat is active, only allow specific keys or no game keys
        if (this.chatActive) {
            // Allow Escape to be captured by game or other systems for unfocusing chat
            if (event.key === 'Escape') {
                // Potentially handle blur chat here or let Game.js handle it
            }
            // Prevent game actions if typing in chat, but allow text input keys
            // This check can be more sophisticated if needed
            if (event.key.length === 1 || ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Tab'].includes(event.key) ) {
                 // Allow typing keys for the input field
            } else if (event.key !== 'Escape') {
                 // event.preventDefault(); // Could be too aggressive
            }
            return; // Don't process game keys if chat is active
        }

        switch (event.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
            case ' ': this.keys.space = true; break; // Space bar
            case 'shift': this.keys.shift = true; break;
        }
    }
    
    handleKeyUp(event) {
        // No need to check chatActive for keyUp for game keys,
        // as they wouldn't have been set true if chat was active.
        // However, if a key like 'Enter' was used by chat, we might not want its 'up' state for game.
        if (this.chatActive && event.key === 'Enter') {
            return;
        }

        switch (event.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
            case ' ': this.keys.space = false; break; // Space bar
            case 'shift': this.keys.shift = false; break;
        }
    }
    
    handleMouseMove(event) {
        this.mouse.position.x = event.clientX;
        this.mouse.position.y = event.clientY;
    }
    
    handleMouseDown(event) {
        if (this.chatActive) return; // Don't process game clicks if chat is active

        if (event.button === 0) { // Left mouse button
            this.mouse.leftButton = true;
        }
    }

    handleMouseUp(event) {
        if (this.chatActive && event.button === 0) { // If chat active, ensure leftButton doesn't stick for game
             this.mouse.leftButton = false;
             return;
        }
        if (event.button === 0) { // Left mouse button
            this.mouse.leftButton = false;
        }
    }
    
    update() {
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