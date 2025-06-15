import * as PIXI from 'pixi.js';

export class RemoteProjectile {
  constructor(projectileData) {
    this.id = projectileData.id;
    this.ownerId = projectileData.ownerId;
    this.type = projectileData.type;
    this.position = { ...projectileData.position };
    this.velocity = { ...projectileData.velocity };
    this.damage = projectileData.damage;
    this.createdAt = projectileData.createdAt;
    this.maxLifetime = projectileData.maxLifetime;
    
    // Create sprite
    this.sprite = new PIXI.Container();
    
    // Create projectile graphics
    const graphics = new PIXI.Graphics();
    
    // Arrow projectile (only type for now)
    const color = 0x00ff00; // Green for arrows
    const size = 6;
    
    // Draw projectile
    graphics.beginFill(color, 0.9);
    graphics.drawCircle(0, 0, size);
    graphics.endFill();
    
    // Add glow effect
    graphics.lineStyle(2, color, 0.5);
    graphics.drawCircle(0, 0, size + 2);
    
    this.sprite.addChild(graphics);
    this.sprite.position.set(this.position.x, this.position.y);
    
    // Calculate rotation based on velocity
    if (this.velocity.x !== 0 || this.velocity.y !== 0) {
      this.sprite.rotation = Math.atan2(this.velocity.y, this.velocity.x);
    }
  }
  
  update(deltaTime) {
    // Update position based on velocity
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    this.sprite.position.set(
      Math.round(this.position.x),
      Math.round(this.position.y)
    );
    
    // Check if projectile should expire
    const age = Date.now() - this.createdAt;
    if (age > this.maxLifetime) {
      return false; // Should be removed
    }
    
    // Fade out near end of lifetime
    const remainingLife = 1 - (age / this.maxLifetime);
    if (remainingLife < 0.3) {
      this.sprite.alpha = remainingLife / 0.3;
    }
    
    return true; // Still alive
  }
  
  destroy() {
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
    this.sprite.destroy();
  }
}