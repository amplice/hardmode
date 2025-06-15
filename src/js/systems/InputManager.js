import { networkManager } from '../../network/NetworkManager.ts';

export class InputManager {
  constructor() {
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.mouseDown = false;
    this.rightMouseDown = false;
    this.enabled = false;
    
    // Input state for networking
    this.lastSentInput = null;
    this.inputSendRate = 50; // Send input 20 times per second (50ms interval)
    this.lastInputTime = 0;
    
    // Track attack states
    this.currentAttackType = null;
    this.playerFacing = 'south'; // Default facing
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      this.keys[e.code] = true;
    });
    
    window.addEventListener('keyup', (e) => {
      if (!this.enabled) return;
      this.keys[e.code] = false;
    });
    
    // Mouse events
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
    });
    
    window.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 0) { // Left click
        this.mouseDown = true;
        this.currentAttackType = 'primary';
      } else if (e.button === 2) { // Right click
        this.rightMouseDown = true;
        this.currentAttackType = 'secondary';
      }
    });
    
    window.addEventListener('mouseup', (e) => {
      if (!this.enabled) return;
      if (e.button === 0) {
        this.mouseDown = false;
        if (this.currentAttackType === 'primary') {
          this.currentAttackType = null;
        }
      } else if (e.button === 2) {
        this.rightMouseDown = false;
        if (this.currentAttackType === 'secondary') {
          this.currentAttackType = null;
        }
      }
    });
    
    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => {
      if (this.enabled) {
        e.preventDefault();
      }
    });
  }
  
  enable() {
    this.enabled = true;
    this.keys = {};
    this.mouseDown = false;
  }
  
  disable() {
    this.enabled = false;
    this.keys = {};
    this.mouseDown = false;
  }
  
  getMovementVector() {
    let x = 0;
    let y = 0;
    
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    
    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }
    
    return { x, y };
  }
  
  getMouseWorldPosition(camera) {
    // Convert screen position to world position
    const worldX = this.mousePosition.x - (window.innerWidth / 2) + camera.x;
    const worldY = this.mousePosition.y - (window.innerHeight / 2) + camera.y;
    return { x: worldX, y: worldY };
  }
  
  sendInputToServer(camera, player) {
    const now = Date.now();
    if (now - this.lastInputTime < this.inputSendRate) {
      return;
    }
    
    const movement = this.getMovementVector();
    const mouseWorld = this.getMouseWorldPosition(camera);
    
    // Update facing if we have a player reference
    if (player && player.facing) {
      this.playerFacing = player.facing;
    }
    
    const inputState = {
      movement,
      mousePosition: mouseWorld,
      attacking: this.mouseDown || this.rightMouseDown,
      attackType: this.currentAttackType,
      facing: this.playerFacing,
    };
    
    // Check for roll
    if (this.keys['Space']) {
      inputState.attacking = true;
      inputState.attackType = 'roll';
    }
    
    // Only send if input has changed
    if (!this.inputsEqual(inputState, this.lastSentInput)) {
      networkManager.sendInput(inputState);
      this.lastSentInput = inputState;
      this.lastInputTime = now;
    }
  }
  
  inputsEqual(a, b) {
    if (!a || !b) return false;
    return (
      a.movement.x === b.movement.x &&
      a.movement.y === b.movement.y &&
      a.attacking === b.attacking &&
      a.attackType === b.attackType &&
      a.facing === b.facing &&
      Math.abs(a.mousePosition.x - b.mousePosition.x) < 5 &&
      Math.abs(a.mousePosition.y - b.mousePosition.y) < 5
    );
  }
}