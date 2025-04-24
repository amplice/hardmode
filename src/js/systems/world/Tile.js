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
    let baseTexture = null; // Temporary variable

    // vvv MODIFIED vvv
    if (type === 'grass') {
      baseTexture = tilesets.getFullGrassTile();
    } else if (type === 'sand') {
      baseTexture = tilesets.getFullSandTile();
    } else if (type === 'water') {
      baseTexture = tilesets.getFullWaterTile(); // <-- ADDED Water type handling
    }
    // ^^^ MODIFIED ^^^
     else {
        console.warn(`Tile (${x}, ${y}) created with unknown initial type "${type}".`);
        baseTexture = PIXI.Texture.WHITE; // Fallback for unknown type
    }


    if (!baseTexture) {
        console.error(`Failed to get base texture for type "${type}" at (${x}, ${y}). Using white fallback.`);
        this.baseSprite.texture = PIXI.Texture.WHITE;
        this.baseSprite.scale.set(1, 1); // Use default scale for fallback
    } else {
        this.baseSprite.texture = baseTexture;
        this.baseSprite.scale.set(tileSize / 16, tileSize / 16); // Scale based on 16px source tile size
    }
    this.container.addChild(this.baseSprite);

    // Keep existing properties for sand/grass transitions
    this.transitionSprite = null;
    this.transitionType = null;
    // Inner corner match (if needed)
    this.cornerMatchSprite = null;
    this.waterOverlaySprite = null;
    this.waterOverlayType = null;
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
  // vvv ADDED vvv
  // Method to add water edge overlay (called ONLY on GRASS tiles)
  addWaterOverlay(position, tilesets) {
    if (this.type !== 'grass') {
        // This should only be called on grass tiles adjacent to water
        console.warn(`Attempted to add water overlay to non-grass tile (${this.x}, ${this.y}) of type ${this.type}`);
        return;
    }

    const overlayTexture = tilesets.getWaterEdgeTile(position);
    if (!overlayTexture) {
        console.warn(`Failed to get water edge texture "${position}" for overlay at (${this.x}, ${this.y}).`);
        return; // Don't add if texture is missing
    }

    // Remove existing water overlay if one exists (e.g., if neighbors changed)
    if (this.waterOverlaySprite && this.waterOverlaySprite.parent) {
        this.container.removeChild(this.waterOverlaySprite);
    }

    this.waterOverlaySprite = new PIXI.Sprite(overlayTexture);
    this.waterOverlaySprite.scale.set(this.tileSize / 16, this.tileSize / 16);
    this.container.addChild(this.waterOverlaySprite); // Add water edge on top of base grass
    this.waterOverlayType = position;
}
// Helper to remove water overlay if water neighbor disappears (optional, depends on dynamic updates)
removeWaterOverlay() {
     if (this.waterOverlaySprite && this.waterOverlaySprite.parent) {
        this.container.removeChild(this.waterOverlaySprite);
        this.waterOverlaySprite = null;
        this.waterOverlayType = null;
    }
}

// Helper method to just change type and base sprite - USED BY WorldGenerator for water placement
// This avoids conflicts with convertToTransition logic
setBaseType(newType, tilesets) {
   if (this.type === newType) return;

   // Clear existing overlays ONLY if changing fundamental type
   if (this.transitionSprite) this.container.removeChild(this.transitionSprite);
   if (this.cornerMatchSprite) this.container.removeChild(this.cornerMatchSprite);
   if (this.waterOverlaySprite) this.container.removeChild(this.waterOverlaySprite); // Clear water overlay too
   this.transitionSprite = null;
   this.cornerMatchSprite = null;
   this.waterOverlaySprite = null;
   this.transitionType = null;
   this.waterOverlayType = null;
   this.isTransition = false;

   this.type = newType;
   let newTexture = null;
   if (newType === 'grass') newTexture = tilesets.getFullGrassTile();
   else if (newType === 'sand') newTexture = tilesets.getFullSandTile();
   else if (newType === 'water') newTexture = tilesets.getFullWaterTile();

   if (newTexture) {
      this.baseSprite.texture = newTexture;
      this.baseSprite.scale.set(this.tileSize / 16, this.tileSize / 16); // Reset scale
   } else {
      console.error(`Failed to set base type "${newType}" at (${this.x}, ${this.y}), texture missing.`);
      this.baseSprite.texture = PIXI.Texture.WHITE; // Fallback
      this.baseSprite.scale.set(1,1);
   }
}
// ^^^ ADDED ^^^
// vvv MODIFIED vvv
isWalkable() {
  // Original logic + water check
  // Water is not walkable. Original types (grass, sand) are. Transitions (sand base) are.
  return this.type !== 'water'; // <-- ADDED water check
}
// ^^^ MODIFIED ^^^
}