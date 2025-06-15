import * as PIXI from 'pixi.js';

export class RemotePlayer {
  constructor(id, username, x, y, spriteManager) {
    this.id = id;
    this.username = username;
    // Set both position and target to same value initially to prevent interpolation jump
    this.position = { x, y };
    this.targetPosition = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.health = 100;
    this.maxHealth = 100;
    this.class = 'warrior';
    this.isDead = false;
    this.isInvulnerable = false;
    
    console.log(`Creating RemotePlayer sprite for ${username} at position:`, x, y);
    
    // Create sprite
    this.sprite = new PIXI.Container();
    this.sprite.visible = true; // Ensure visibility
    
    // Placeholder graphics for now - make it bigger and more visible
    const body = new PIXI.Graphics();
    body.beginFill(0x00ffff, 1); // Bright cyan for remote players
    body.drawCircle(0, 0, 32); // Larger circle
    body.endFill();
    
    // Add a border for better visibility
    body.lineStyle(3, 0xffffff, 1);
    body.drawCircle(0, 0, 32);
    
    this.sprite.addChild(body);
    
    // Username label
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2,
    });
    this.nameLabel = new PIXI.Text(username, style);
    this.nameLabel.anchor.set(0.5);
    this.nameLabel.position.y = -30;
    this.sprite.addChild(this.nameLabel);
    
    // Health bar
    this.healthBar = new PIXI.Container();
    this.healthBar.position.y = -20;
    
    const healthBg = new PIXI.Graphics();
    healthBg.beginFill(0x000000);
    healthBg.drawRect(-20, 0, 40, 4);
    healthBg.endFill();
    this.healthBar.addChild(healthBg);
    
    this.healthFill = new PIXI.Graphics();
    this.updateHealthBar();
    this.healthBar.addChild(this.healthFill);
    
    this.sprite.addChild(this.healthBar);
    
    this.sprite.position.set(x, y);
    console.log(`RemotePlayer sprite created at:`, { x, y });
    console.log(`RemotePlayer sprite bounds:`, this.sprite.getBounds());
    
    // Add a debug marker at spawn position
    const debugMarker = new PIXI.Graphics();
    debugMarker.beginFill(0xff00ff, 0.5); // Purple marker
    debugMarker.drawRect(-50, -50, 100, 100); // Large square
    debugMarker.position.set(0, 0);
    this.sprite.addChild(debugMarker);
  }
  
  updateFromState(state) {
    // Update target position for interpolation
    const prevTarget = { ...this.targetPosition };
    this.targetPosition = { ...state.position };
    this.velocity = state.velocity ? { ...state.velocity } : { x: 0, y: 0 };
    this.health = state.health || 100;
    this.maxHealth = state.maxHealth || 100;
    this.class = state.class || 'warrior';
    this.isDead = state.isDead || false;
    this.isInvulnerable = state.isInvulnerable || false;
    
    // If position changed significantly, log it
    const distance = Math.sqrt(
      Math.pow(this.targetPosition.x - prevTarget.x, 2) + 
      Math.pow(this.targetPosition.y - prevTarget.y, 2)
    );
    if (distance > 5) {
      console.log(`${this.username} moved from`, prevTarget, 'to', this.targetPosition);
    }
    
    this.updateHealthBar();
    this.updateVisualState();
  }
  
  update(deltaTime) {
    // Interpolate position
    const lerpFactor = 0.2;
    this.position.x += (this.targetPosition.x - this.position.x) * lerpFactor;
    this.position.y += (this.targetPosition.y - this.position.y) * lerpFactor;
    
    this.sprite.position.set(
      Math.round(this.position.x),
      Math.round(this.position.y)
    );
    
    // Update visual effects for invulnerability
    if (this.isInvulnerable && !this.isDead) {
      this.updateVisualState();
    }
    
    // Debug visibility
    if (!this.sprite.visible) {
      console.warn(`RemotePlayer ${this.username} sprite is not visible!`);
    }
  }
  
  updateHealthBar() {
    this.healthFill.clear();
    const healthPercent = this.health / this.maxHealth;
    const barWidth = 40 * healthPercent;
    
    let color = 0x00ff00; // Green
    if (healthPercent < 0.3) color = 0xff0000; // Red
    else if (healthPercent < 0.6) color = 0xffff00; // Yellow
    
    this.healthFill.beginFill(color);
    this.healthFill.drawRect(-20, 0, barWidth, 4);
    this.healthFill.endFill();
  }
  
  updateVisualState() {
    // Update opacity based on death state
    if (this.isDead) {
      this.sprite.alpha = 0.3; // Ghost-like appearance when dead
    } else {
      this.sprite.alpha = 1.0;
    }
    
    // Update tint based on invulnerability
    if (this.isInvulnerable && !this.isDead) {
      // Flash effect for invulnerability
      const flashPhase = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
      this.sprite.tint = PIXI.utils.rgb2hex([1, flashPhase, flashPhase]);
    } else {
      this.sprite.tint = 0xffffff; // Normal tint
    }
  }

  destroy() {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
    this.sprite.destroy();
  }
}