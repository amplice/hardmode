import * as PIXI from 'pixi.js';
import { ComponentType, Entity } from '@hardmode/shared';
import { EntityManager } from '../ecs/EntityManager';

export class RenderingSystem {
  private container: PIXI.Container;
  private camera: { x: number; y: number } = { x: 0, y: 0 };
  private worldScale = 1;
  private sprites: Map<string, PIXI.Container> = new Map();

  constructor(
    private entityManager: EntityManager,
    private app: PIXI.Application
  ) {
    this.container = new PIXI.Container();
    this.app.stage.addChild(this.container);
    
    // Add a background color
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a1a);
    bg.drawRect(0, 0, app.screen.width, app.screen.height);
    bg.endFill();
    app.stage.addChildAt(bg, 0);
  }

  update(_deltaTime: number): void {
    // Update camera to follow local player
    const localPlayer = this.entityManager.getLocalPlayer();
    if (localPlayer) {
      const position = localPlayer.getComponent(ComponentType.POSITION);
      if (position) {
        const posData = position.serialize();
        this.camera.x = posData.x - this.app.screen.width / 2;
        this.camera.y = posData.y - this.app.screen.height / 2;
      }
    }

    // Update container position based on camera
    this.container.x = -this.camera.x * this.worldScale;
    this.container.y = -this.camera.y * this.worldScale;

    // Get all entities with position component
    const entities = this.entityManager.getEntitiesWithComponents(ComponentType.POSITION);
    
    if (entities.length > 0 && !this.lastLogTime || Date.now() - this.lastLogTime > 1000) {
      console.log(`Rendering ${entities.length} entities`);
      this.lastLogTime = Date.now();
    }
    
    // Update or create sprites for each entity
    for (const entity of entities) {
      this.updateEntitySprite(entity);
    }

    // Clean up sprites for removed entities
    const entityIds = new Set(entities.map(e => e.id));
    for (const [entityId, sprite] of this.sprites.entries()) {
      if (!entityIds.has(entityId)) {
        this.container.removeChild(sprite);
        sprite.destroy();
        this.sprites.delete(entityId);
      }
    }
  }

  private updateEntitySprite(entity: Entity): void {
    let sprite = this.sprites.get(entity.id);
    
    if (!sprite) {
      // Create sprite based on entity type
      const newSprite = this.createSpriteForEntity(entity);
      if (newSprite) {
        this.sprites.set(entity.id, newSprite);
        this.container.addChild(newSprite);
        sprite = newSprite;
      }
    }
    
    if (sprite) {
      // Update sprite position
      const position = entity.getComponent(ComponentType.POSITION);
      if (position) {
        const posData = position.serialize();
        sprite.x = posData.x * this.worldScale;
        sprite.y = posData.y * this.worldScale;
      }
    }
  }

  private createSpriteForEntity(entity: Entity): PIXI.Container | null {
    // For now, create placeholder sprites
    const graphics = new PIXI.Graphics();
    
    // Different colors for different entity types
    if (entity.hasComponent(ComponentType.PLAYER)) {
      const playerComp = entity.getComponent(ComponentType.PLAYER);
      const isLocalPlayer = entity.id === this.entityManager.getLocalPlayer()?.id;
      
      // Player sprite - square with class color
      graphics.beginFill(isLocalPlayer ? 0x00FF00 : 0x0088FF);
      graphics.drawRect(-16, -32, 32, 64);
      graphics.endFill();
      
      // Add username text
      if (playerComp) {
        const playerData = playerComp.serialize();
        const text = new PIXI.Text({
          text: playerData.username,
          style: {
            fontSize: 12,
            fill: 0xFFFFFF,
            stroke: { color: 0x000000, width: 2 }
          }
        });
        text.anchor.set(0.5, 1);
        text.y = -40;
        graphics.addChild(text);
      }
    } else if (entity.hasComponent(ComponentType.MONSTER)) {
      // Monster sprite - red circle
      graphics.beginFill(0xFF0000);
      graphics.drawCircle(0, 0, 20);
      graphics.endFill();
    } else if (entity.hasComponent(ComponentType.PROJECTILE)) {
      // Projectile sprite - small yellow circle
      graphics.beginFill(0xFFFF00);
      graphics.drawCircle(0, 0, 5);
      graphics.endFill();
    } else {
      // Default sprite
      graphics.beginFill(0x888888);
      graphics.drawRect(-10, -10, 20, 20);
      graphics.endFill();
    }
    
    return graphics;
  }

  getCamera() {
    return this.camera;
  }

  setWorldScale(scale: number) {
    this.worldScale = scale;
    this.container.scale.set(scale);
  }
}