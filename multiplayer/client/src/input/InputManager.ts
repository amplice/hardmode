import { PlayerInputMessage, MessageType } from '@hardmode/shared';

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private worldMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private inputSequence: number = 0;
  private lastInputTime: number = 0;
  private inputHistory: PlayerInputMessage[] = [];
  private maxInputHistory: number = 60; // 1 second at 60fps
  
  // Key mappings
  private keyMap: { [key: string]: string } = {
    'w': 'up',
    'W': 'up',
    'ArrowUp': 'up',
    's': 'down',
    'S': 'down',
    'ArrowDown': 'down',
    'a': 'left',
    'A': 'left',
    'ArrowLeft': 'left',
    'd': 'right',
    'D': 'right',
    'ArrowRight': 'right',
    ' ': 'secondaryAttack',
    'Shift': 'roll'
  };

  constructor(private canvas: HTMLCanvasElement) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse events
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = this.keyMap[event.key];
    if (key) {
      event.preventDefault();
      this.keys.set(key, true);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = this.keyMap[event.key];
    if (key) {
      event.preventDefault();
      this.keys.set(key, false);
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left click
      this.keys.set('primaryAttack', true);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.keys.set('primaryAttack', false);
    }
  }


  /**
   * Get current input state
   */
  getInputState(): { keys: any; mousePosition: { x: number; y: number } } {
    return {
      keys: {
        up: this.keys.get('up') || false,
        down: this.keys.get('down') || false,
        left: this.keys.get('left') || false,
        right: this.keys.get('right') || false,
      },
      mousePosition: { ...this.worldMousePosition }
    };
  }

  /**
   * Update world mouse position based on camera
   */
  updateWorldMousePosition(cameraX: number, cameraY: number, scale: number = 1): void {
    this.worldMousePosition = {
      x: (this.mousePosition.x / scale) + cameraX,
      y: (this.mousePosition.y / scale) + cameraY
    };
  }

  /**
   * Create input message for server
   */
  createInputMessage(): PlayerInputMessage | null {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastInputTime;
    
    // Don't send input too frequently
    if (deltaTime < 16) { // ~60fps
      return null;
    }

    const inputState = this.getInputState();
    
    // Only send if there's actual input
    const hasMovement = inputState.keys.up || inputState.keys.down || 
                       inputState.keys.left || inputState.keys.right;
    
    if (!hasMovement && !this.keys.get('primaryAttack') && !this.keys.get('secondaryAttack')) {
      return null;
    }

    this.inputSequence++;
    this.lastInputTime = currentTime;

    const message: PlayerInputMessage = {
      type: MessageType.PLAYER_INPUT,
      timestamp: currentTime,
      sequence: this.inputSequence,
      keys: inputState.keys,
      mousePosition: inputState.mousePosition,
      deltaTime: deltaTime
    };

    // Store in history for reconciliation
    this.inputHistory.push(message);
    if (this.inputHistory.length > this.maxInputHistory) {
      this.inputHistory.shift();
    }

    return message;
  }

  /**
   * Check if primary attack was pressed
   */
  isPrimaryAttackPressed(): boolean {
    const pressed = this.keys.get('primaryAttack') || false;
    if (pressed) {
      this.keys.set('primaryAttack', false); // Consume the input
      return true;
    }
    return false;
  }

  /**
   * Check if secondary attack was pressed
   */
  isSecondaryAttackPressed(): boolean {
    const pressed = this.keys.get('secondaryAttack') || false;
    if (pressed) {
      this.keys.set('secondaryAttack', false); // Consume the input
      return true;
    }
    return false;
  }

  /**
   * Check if roll key (spacebar) was pressed
   */
  isRollPressed(): boolean {
    const pressed = this.keys.get('roll') || false;
    if (pressed) {
      this.keys.set('roll', false); // Consume the input
      return true;
    }
    return false;
  }

  /**
   * Get input history for reconciliation
   */
  getInputHistory(): PlayerInputMessage[] {
    return [...this.inputHistory];
  }

  /**
   * Clear input history up to a certain sequence number
   */
  clearHistoryBefore(sequence: number): void {
    this.inputHistory = this.inputHistory.filter(input => input.sequence > sequence);
  }

  /**
   * Reset all inputs
   */
  reset(): void {
    this.keys.clear();
    this.inputSequence = 0;
    this.inputHistory = [];
    this.lastInputTime = 0;
  }
  
  /**
   * Get current input sequence number
   */
  getCurrentSequence(): number {
    return this.inputSequence;
  }
}