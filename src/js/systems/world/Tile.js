// src/systems/world/Tile.js
import * as PIXI from 'pixi.js';

export class Tile {
  constructor(x, y, type, tilesets, tileSize) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.tileSize = tileSize;
    this.isTransition = false;
    this.transitionType = null;
    this.waterOverlayType = null;
    
    // Container for sprites
    this.container = new PIXI.Container();
    this.container.position.set(x * tileSize, y * tileSize);
    
    // Base sprite
    this.baseSprite = new PIXI.Sprite();
    this.sprite = this.baseSprite; // Alias for compatibility
    this.transitionSprite = null;
    this.cornerMatchSprite = null;
    this.waterOverlaySprite = null;
    
    // Set initial texture
    if (type === 'grass') {
      this.baseSprite.texture = tilesets.getFullGrassTile();
    } else if (type === 'sand') {
      this.baseSprite.texture = tilesets.getFullSandTile();
    } else if (type === 'water') {
      this.baseSprite.texture = tilesets.getFullWaterTile();
    } else {
      console.warn(`Unknown tile type "${type}" at (${x}, ${y})`);
      this.baseSprite.texture = PIXI.Texture.WHITE;
    }
    
    // The new tileset is 32x32, so scale appropriately
    this.baseSprite.scale.set(tileSize / 32, tileSize / 32);
    this.container.addChild(this.baseSprite);
  }
  
  setType(newType, tilesets) {
    if (this.type === newType) return;
    
    // Clear all overlays
    this.clearAllOverlays();
    
    // Update type
    this.type = newType;
    this.isTransition = false;
    
    // Set new base texture
    if (newType === 'grass') {
      this.baseSprite.texture = tilesets.getFullGrassTile();
    } else if (newType === 'sand') {
      this.baseSprite.texture = tilesets.getFullSandTile();
    } else if (newType === 'water') {
      this.baseSprite.texture = tilesets.getFullWaterTile();
    } else {
      console.warn(`Unknown tile type "${newType}" at (${this.x}, ${this.y})`);
      this.baseSprite.texture = PIXI.Texture.WHITE;
    }
  }
  
  clearAllOverlays() {
    // Remove transition sprite
    if (this.transitionSprite && this.transitionSprite.parent) {
      this.container.removeChild(this.transitionSprite);
    }
    this.transitionSprite = null;
    this.transitionType = null;
    
    // Remove corner match sprite
    if (this.cornerMatchSprite && this.cornerMatchSprite.parent) {
      this.container.removeChild(this.cornerMatchSprite);
    }
    this.cornerMatchSprite = null;
    
    // Remove water overlay sprite
    if (this.waterOverlaySprite && this.waterOverlaySprite.parent) {
      this.container.removeChild(this.waterOverlaySprite);
    }
    this.waterOverlaySprite = null;
    this.waterOverlayType = null;
  }
  
  convertToTransition(position, tilesets) {
    // Change base to sand
    this.baseSprite.texture = tilesets.getFullSandTile();
    
    // Add grass transition overlay
    const transitionTexture = tilesets.getGrassTransition(position);
    
    if (transitionTexture) {
      // Remove existing transition if any
      if (this.transitionSprite && this.transitionSprite.parent) {
        this.container.removeChild(this.transitionSprite);
      }
      
      this.transitionSprite = new PIXI.Sprite(transitionTexture);
      this.transitionSprite.scale.set(this.tileSize / 16, this.tileSize / 16);
      this.container.addChild(this.transitionSprite);
    }
    
    // Store transition info
    this.transitionType = position;
    this.isTransition = true;
    this.type = 'transition';
  }
  
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
  
  addWaterOverlay(overlayType, tilesets) {
    // Only add water overlays to grass tiles
    if (this.type !== 'grass') return;
    
    let overlayTexture;
    
    // Determine which texture to use based on overlay type
    if (overlayType.includes('match')) {
      overlayTexture = tilesets.getWaterInnerCornerMatch(overlayType);
    } else {
      overlayTexture = tilesets.getWaterEdgeTile(overlayType);
    }
    
    if (!overlayTexture) {
      this.removeWaterOverlay();
      return;
    }
    
    // Only create a new sprite if needed
    if (!this.waterOverlaySprite || this.waterOverlayType !== overlayType) {
      // Remove existing water overlay
      if (this.waterOverlaySprite && this.waterOverlaySprite.parent) {
        this.container.removeChild(this.waterOverlaySprite);
      }
      
      this.waterOverlaySprite = new PIXI.Sprite(overlayTexture);
      this.waterOverlaySprite.scale.set(this.tileSize / 16, this.tileSize / 16);
      this.container.addChild(this.waterOverlaySprite);
      this.waterOverlayType = overlayType;
    }
  }
  
  removeWaterOverlay() {
    if (this.waterOverlaySprite && this.waterOverlaySprite.parent) {
      this.container.removeChild(this.waterOverlaySprite);
    }
    this.waterOverlaySprite = null;
    this.waterOverlayType = null;
  }
  
  isWalkable() {
    return this.type !== 'water';
  }
}