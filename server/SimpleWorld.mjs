export class SimpleWorld {
    constructor(options = {}) {
        this.width = options.width || 100;
        this.height = options.height || 100;
        this.tileSize = options.tileSize || 64;
        this.tiles = [];
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = { walkable: true };
            }
        }

        this.generateObstacles();
    }

    generateObstacles() {
        const startX = Math.floor(this.width / 2) - 3;
        const endX = Math.floor(this.width / 2) + 3;
        const startY = Math.floor(this.height / 2) - 3;
        const endY = Math.floor(this.height / 2) + 3;

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (this.tiles[y] && this.tiles[y][x]) {
                    this.tiles[y][x].walkable = false;
                }
            }
        }
    }

    isTileWalkable(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        const row = this.tiles[tileY];
        const tile = row ? row[tileX] : null;
        return tile ? tile.walkable : false;
    }
}
