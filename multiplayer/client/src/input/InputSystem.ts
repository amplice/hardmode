import { NetworkManager } from '../network/NetworkManager';
import { InputManager } from './InputManager';
import { MessageType, PlayerAttackMessage } from '@hardmode/shared';

export class InputSystem {
  private inputManager: InputManager;
  private enabled: boolean = true;

  constructor(
    private networkManager: NetworkManager,
    canvas: HTMLCanvasElement
  ) {
    this.inputManager = new InputManager(canvas);
  }

  /**
   * Update input system - called every frame
   */
  update(cameraX: number, cameraY: number, scale: number = 1): void {
    if (!this.enabled) return;

    // Update world mouse position based on camera
    this.inputManager.updateWorldMousePosition(cameraX, cameraY, scale);

    // Check for attack inputs
    if (this.inputManager.isPrimaryAttackPressed()) {
      this.sendAttack('primary');
    } else if (this.inputManager.isSecondaryAttackPressed()) {
      this.sendAttack('secondary');
    } else if (this.inputManager.isRollPressed()) {
      this.sendAttack('roll');
    }

    // Create and send movement input
    const inputMessage = this.inputManager.createInputMessage();
    if (inputMessage) {
      this.networkManager.sendMessage(inputMessage);
    }
  }

  /**
   * Send attack message
   */
  private sendAttack(attackType: 'primary' | 'secondary' | 'roll'): void {
    const { mousePosition } = this.inputManager.getInputState();
    
    const attackMessage: PlayerAttackMessage = {
      type: MessageType.PLAYER_ATTACK,
      timestamp: Date.now(),
      attackType: attackType,
      mousePosition: mousePosition
    };

    this.networkManager.sendMessage(attackMessage);
  }

  /**
   * Get current input state
   */
  getInputState() {
    return this.inputManager.getInputState();
  }

  /**
   * Get input history for reconciliation
   */
  getInputHistory() {
    return this.inputManager.getInputHistory();
  }

  /**
   * Clear old inputs after server acknowledgment
   */
  acknowledgeInput(lastProcessedSequence: number): void {
    this.inputManager.clearHistoryBefore(lastProcessedSequence);
  }

  /**
   * Enable or disable input processing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Reset input system
   */
  reset(): void {
    this.inputManager.reset();
  }
}