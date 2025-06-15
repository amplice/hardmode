import * as PIXI from 'pixi.js';

export class RemotePlayer {
  constructor(id, username, x, y, spriteManager) {
    this.id = id;
    this.username = username;
    this.position = { x, y };
    this.targetPosition = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.health = 100;
    this.maxHealth = 100;
    this.class = 'warrior';
    
    // Create sprite
    this.sprite = new PIXI.Container();
    
    // Placeholder graphics for now
    const body = new PIXI.Graphics();
    body.beginFill(0x4444ff); // Blue for remote players
    body.drawCircle(0, 0, 16);
    body.endFill();
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
  }
  
  updateFromState(state) {
    // Update target position for interpolation
    this.targetPosition = { ...state.position };
    this.velocity = state.velocity ? { ...state.velocity } : { x: 0, y: 0 };
    this.health = state.health || 100;
    this.maxHealth = state.maxHealth || 100;
    this.class = state.class || 'warrior';
    
    this.updateHealthBar();
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
  
  destroy() {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
    this.sprite.destroy();
  }
}