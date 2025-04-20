import * as PIXI from 'pixi.js';

export class Tile {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 64;
        this.height = 64;
        
        this.sprite = new PIXI.Graphics();
        this.draw();
    }
    
    draw() {
        this.sprite.clear();
        
        // Different colors based on tile type
        let color;
        let borderColor = 0x333333;
        
        switch(this.type) {
            case 'grass': color = 0x4CAF50; break;
            case 'water': color = 0x03A9F4; break;
            case 'sand': color = 0xFFC107; break;
            case 'rock': color = 0x795548; break;
            case 'tree': color = 0x33691E; break;
            default: color = 0x9E9E9E; // default gray
        }
        
        // Fill the tile
        this.sprite.beginFill(color);
        this.sprite.lineStyle(1, borderColor, 0.3);
        this.sprite.drawRect(0, 0, this.width, this.height);
        this.sprite.endFill();
        
        // Add details based on tile type
        if (this.type === 'tree') {
            // Draw tree trunk
            this.sprite.beginFill(0x6D4C41);
            this.sprite.drawRect(this.width / 2 - 5, this.height / 2, 10, this.height / 2);
            this.sprite.endFill();
            
            // Draw tree foliage as a circle
            this.sprite.beginFill(0x33691E);
            this.sprite.drawCircle(this.width / 2, this.height / 3, 25);
            this.sprite.endFill();
        } 
        else if (this.type === 'rock') {
            // Draw rock details
            this.sprite.beginFill(0x616161);
            this.sprite.drawCircle(this.width / 2, this.height / 2, 20);
            this.sprite.endFill();
        }
        
        this.sprite.position.set(this.x * this.width, this.y * this.height);
    }
    
    isWalkable() {
        return this.type !== 'water' && this.type !== 'tree' && this.type !== 'rock';
    }
}