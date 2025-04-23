// src/systems/world/Tile.js
import * as PIXI from 'pixi.js';

export class Tile {
  constructor(x, y, type, tilesets, tileSize) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.tileSize = tileSize;
    this.isTransition = false;
    
    // Container for sprites
    this.container = new PIXI.Container();
    this.container.position.set(x * tileSize, y * tileSize);
    
    // Set base sprite based on terrain type
    this.baseSprite = new PIXI.Sprite();
    this.baseSprite.texture = type === 'grass' 
      ? tilesets.getFullGrassTile() 
      : tilesets.getFullSandTile();
    this.baseSprite.scale.set(tileSize / 16, tileSize / 16);
    this.container.addChild(this.baseSprite);
    
    // Transition overlay (if needed)
    this.transitionSprite = null;
    
    // Inner corner match (if needed)
    this.cornerMatchSprite = null;
  }
  
  // Convert grass to sand transition
convertToTransition(position, tilesets) {
  // Change base to sand
  this.baseSprite.texture = tilesets.getFullSandTile();
  
  // Add grass transition overlay
  const transitionTexture = tilesets.getGrassTransition(position);
  
  this.transitionSprite = new PIXI.Sprite(transitionTexture);
  this.transitionSprite.scale.set(this.tileSize / 16, this.tileSize / 16);
  this.container.addChild(this.transitionSprite);
  
  // Store the transition type for later reference
  this.transitionType = position;
  
  // Mark as transition and change internal type
  this.isTransition = true;
  this.type = 'transition';
}
  
  // Add inner corner match piece
  addInnerCornerMatch(matchType, tilesets) {
    const matchTexture = tilesets.getInnerCornerMatch(matchType);
    
    if (matchTexture) {
      // Remove existing corner match if any
      if (this.cornerMatchSprite && this.cornerMatchSprite.parent) {
        this.container.removeChild(this.cornerMatchSprite);
      }
      
      this.cornerMatchSprite = new PIXI.Sprite(matchTexture);
      this.cornerMatchSprite.scale.set(this.tileSize / 16, this.tileSize / 16);
      this.container.addChild(this.cornerMatchSprite);
    }
  }
  
  isWalkable() {
    return true;
  }
}