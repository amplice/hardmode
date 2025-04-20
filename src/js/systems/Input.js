export class InputSystem {
    constructor() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        
        this.mouse = {
            position: { x: 0, y: 0 },
            leftButton: false,
            rightButton: false
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mouse events
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    handleKeyDown(event) {
        switch (event.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
        }
    }
    
    handleKeyUp(event) {
        switch (event.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
        }
    }
    
    handleMouseMove(event) {
        this.mouse.position.x = event.clientX;
        this.mouse.position.y = event.clientY;
    }
    
    handleMouseDown(event) {
        if (event.button === 0) { // Left mouse button
            this.mouse.leftButton = true;
        } else if (event.button === 2) { // Right mouse button
            this.mouse.rightButton = true;
        }
    }
    
    handleMouseUp(event) {
        if (event.button === 0) { // Left mouse button
            this.mouse.leftButton = false;
        } else if (event.button === 2) { // Right mouse button
            this.mouse.rightButton = false;
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
            secondaryAttack: this.mouse.rightButton,
            mousePosition: { ...this.mouse.position }
        };
    }
}