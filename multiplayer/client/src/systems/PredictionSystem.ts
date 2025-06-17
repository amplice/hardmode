import { EntityManager } from '../ecs/EntityManager';
import { InputManager } from '../input/InputManager';
import { ComponentType, Entity, PlayerInputMessage } from '@hardmode/shared';
import { PositionComponent } from '@hardmode/shared/components/PositionComponent';
import { VelocityComponent } from '@hardmode/shared/components/VelocityComponent';
import { PlayerComponent } from '@hardmode/shared/components/PlayerComponent';

interface PredictionState {
  sequence: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  timestamp: number;
}

export class PredictionSystem {
  private predictionHistory: PredictionState[] = [];
  private lastServerUpdate: { 
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    sequence: number;
    timestamp: number;
  } | null = null;
  
  constructor(
    private entityManager: EntityManager,
    private inputManager: InputManager
  ) {}
  
  /**
   * Apply client-side prediction for local player movement
   */
  update(deltaTime: number): void {
    const localPlayer = this.entityManager.getLocalPlayer();
    if (!localPlayer) return;
    
    const position = localPlayer.getComponent<PositionComponent>(ComponentType.POSITION);
    const velocity = localPlayer.getComponent<VelocityComponent>(ComponentType.VELOCITY);
    const player = localPlayer.getComponent<PlayerComponent>(ComponentType.PLAYER);
    
    if (!position || !velocity || !player) return;
    
    // Get current input state
    const inputState = this.inputManager.getInputState();
    
    // Calculate movement based on input (mirror server logic)
    let moveX = 0;
    let moveY = 0;
    
    if (inputState.keys.left) moveX -= 1;
    if (inputState.keys.right) moveX += 1;
    if (inputState.keys.up) moveY -= 1;
    if (inputState.keys.down) moveY += 1;
    
    // Apply diagonal movement factor
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707;
      moveY *= 0.707;
    }
    
    // Apply directional speed modifiers based on facing
    const dx = inputState.mousePosition.x - position.x;
    const dy = inputState.mousePosition.y - position.y;
    const angle = Math.atan2(dy, dx);
    
    if (moveX !== 0 || moveY !== 0) {
      const moveAngle = Math.atan2(moveY, moveX);
      let angleDiff = Math.abs(angle - moveAngle);
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
      
      let speedModifier = 1.0; // forward
      if (angleDiff > 3 * Math.PI / 4) {
        speedModifier = 0.5; // backward
      } else if (angleDiff > Math.PI / 4) {
        speedModifier = 0.7; // strafe
      }
      
      moveX *= speedModifier;
      moveY *= speedModifier;
    }
    
    // Set predicted velocity
    velocity.x = moveX;
    velocity.y = moveY;
    
    // Apply movement prediction (simplified version of server MovementSystem)
    const dt = deltaTime / 1000;
    const baseSpeed = 5; // Default speed, matches most character classes
    const moveSpeed = baseSpeed * dt * 60;
    
    position.x += velocity.x * moveSpeed;
    position.y += velocity.y * moveSpeed;
    
    // Clamp to world bounds
    position.x = Math.max(0, Math.min(6400, position.x));
    position.y = Math.max(0, Math.min(6400, position.y));
    
    // Store prediction state
    const currentSequence = this.inputManager.getCurrentSequence();
    this.predictionHistory.push({
      sequence: currentSequence,
      position: { x: position.x, y: position.y },
      velocity: { x: velocity.x, y: velocity.y },
      timestamp: Date.now()
    });
    
    // Clean old predictions (keep last 60 frames worth)
    while (this.predictionHistory.length > 60) {
      this.predictionHistory.shift();
    }
  }
  
  /**
   * Reconcile with server state
   */
  reconcile(serverState: {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    lastProcessedSequence: number;
  }): void {
    const localPlayer = this.entityManager.getLocalPlayer();
    if (!localPlayer) return;
    
    const position = localPlayer.getComponent<PositionComponent>(ComponentType.POSITION);
    const velocity = localPlayer.getComponent<VelocityComponent>(ComponentType.VELOCITY);
    
    if (!position || !velocity) return;
    
    // Store server update
    this.lastServerUpdate = {
      position: { ...serverState.position },
      velocity: { ...serverState.velocity },
      sequence: serverState.lastProcessedSequence,
      timestamp: Date.now()
    };
    
    // Find the prediction state that matches the server's last processed sequence
    const matchingPrediction = this.predictionHistory.find(
      pred => pred.sequence === serverState.lastProcessedSequence
    );
    
    if (!matchingPrediction) {
      // No matching prediction, just use server state
      position.x = serverState.position.x;
      position.y = serverState.position.y;
      velocity.x = serverState.velocity.x;
      velocity.y = serverState.velocity.y;
      return;
    }
    
    // Calculate prediction error
    const errorX = serverState.position.x - matchingPrediction.position.x;
    const errorY = serverState.position.y - matchingPrediction.position.y;
    const errorMagnitude = Math.sqrt(errorX * errorX + errorY * errorY);
    
    // If error is small, smooth correction over time
    if (errorMagnitude < 10) {
      // Apply 50% correction this frame
      position.x += errorX * 0.5;
      position.y += errorY * 0.5;
    } else {
      // Large error, snap to server position
      position.x = serverState.position.x;
      position.y = serverState.position.y;
      
      // Re-apply unprocessed inputs
      const unprocessedInputs = this.inputManager.getInputHistory().filter(
        input => input.sequence > serverState.lastProcessedSequence
      );
      
      for (const input of unprocessedInputs) {
        this.applyInput(localPlayer, input);
      }
    }
    
    // Always use server velocity
    velocity.x = serverState.velocity.x;
    velocity.y = serverState.velocity.y;
    
    // Clean up old predictions
    this.predictionHistory = this.predictionHistory.filter(
      pred => pred.sequence >= serverState.lastProcessedSequence
    );
  }
  
  /**
   * Apply a single input to the entity (for reconciliation)
   */
  private applyInput(entity: Entity, input: PlayerInputMessage): void {
    const position = entity.getComponent<PositionComponent>(ComponentType.POSITION);
    const velocity = entity.getComponent<VelocityComponent>(ComponentType.VELOCITY);
    const player = entity.getComponent<PlayerComponent>(ComponentType.PLAYER);
    
    if (!position || !velocity || !player) return;
    
    // Calculate movement from input
    let moveX = 0;
    let moveY = 0;
    
    if (input.keys.left) moveX -= 1;
    if (input.keys.right) moveX += 1;
    if (input.keys.up) moveY -= 1;
    if (input.keys.down) moveY += 1;
    
    // Apply diagonal movement factor
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707;
      moveY *= 0.707;
    }
    
    // Apply movement based on input deltaTime
    const dt = input.deltaTime / 1000;
    const baseSpeed = 5; // Default speed, matches most character classes
    const moveSpeed = baseSpeed * dt * 60;
    
    position.x += moveX * moveSpeed;
    position.y += moveY * moveSpeed;
    
    // Clamp to world bounds
    position.x = Math.max(0, Math.min(6400, position.x));
    position.y = Math.max(0, Math.min(6400, position.y));
  }
  
  /**
   * Get interpolation factor for smooth rendering
   */
  getInterpolationOffset(): { x: number; y: number } {
    // If we have a recent server update and prediction error, return the remaining correction
    const localPlayer = this.entityManager.getLocalPlayer();
    if (!localPlayer || !this.lastServerUpdate) return { x: 0, y: 0 };
    
    const position = localPlayer.getComponent<PositionComponent>(ComponentType.POSITION);
    if (!position) return { x: 0, y: 0 };
    
    const timeSinceUpdate = Date.now() - this.lastServerUpdate.timestamp;
    if (timeSinceUpdate > 1000) return { x: 0, y: 0 }; // Too old
    
    // Calculate remaining error (for smooth correction)
    const matchingPrediction = this.predictionHistory.find(
      pred => pred.sequence === this.lastServerUpdate!.sequence
    );
    
    if (!matchingPrediction) return { x: 0, y: 0 };
    
    const errorX = this.lastServerUpdate.position.x - position.x;
    const errorY = this.lastServerUpdate.position.y - position.y;
    
    // Return a portion of the error for smooth correction
    const correctionFactor = Math.min(1, timeSinceUpdate / 200); // Correct over 200ms
    return {
      x: errorX * (1 - correctionFactor),
      y: errorY * (1 - correctionFactor)
    };
  }
  
  /**
   * Reset prediction system
   */
  reset(): void {
    this.predictionHistory = [];
    this.lastServerUpdate = null;
  }
}