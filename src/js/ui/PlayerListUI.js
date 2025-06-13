import * as PIXI from 'pixi.js';

export class PlayerListUI {
    constructor() {
        this.container = new PIXI.Container();
        this.container.x = window.innerWidth - 210; // Position top-right
        this.container.y = 10;

        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000, 0.5);
        this.background.drawRect(0, 0, 200, 300); // Adjust size as needed
        this.background.endFill();
        this.container.addChild(this.background);

        this.playerTexts = {}; // Store PIXI.Text objects by playerId
        this.textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 16,
            fill: '#ffffff',
            wordWrap: true,
            wordWrapWidth: 190
        });

        // Resize and reposition on window resize
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        this.container.x = window.innerWidth - this.background.width - 10;
        this.container.y = 10;
    }

    updatePlayers(allPlayersData) {
        // Clear existing player names
        for (const playerId in this.playerTexts) {
            if (this.playerTexts[playerId].parent) {
                this.container.removeChild(this.playerTexts[playerId]);
            }
            delete this.playerTexts[playerId];
        }

        let yOffset = 10;
        for (const playerId in allPlayersData) {
            const playerData = allPlayersData[playerId];
            this._addPlayerText(playerData, yOffset);
            yOffset += 20; // Increment for next player name
        }
        this._updateBackgroundHeight(yOffset);
    }

    addPlayer(playerData) {
        if (this.playerTexts[playerData.id]) return; // Already exists

        let yOffset = 10 + Object.keys(this.playerTexts).length * 20;
        this._addPlayerText(playerData, yOffset);
        this._updateBackgroundHeight(yOffset + 20);
    }

    removePlayer(playerId) {
        if (this.playerTexts[playerId]) {
            if (this.playerTexts[playerId].parent) {
                this.container.removeChild(this.playerTexts[playerId]);
            }
            delete this.playerTexts[playerId];

            // Re-layout existing texts
            let yOffset = 10;
            for (const id in this.playerTexts) {
                this.playerTexts[id].y = yOffset;
                yOffset += 20;
            }
            this._updateBackgroundHeight(yOffset);
        }
    }

    _addPlayerText(playerData, yPos) {
        const playerName = playerData.name || playerData.id; // Fallback to ID if name is missing
        const playerText = new PIXI.Text(playerName, this.textStyle);
        playerText.x = 10;
        playerText.y = yPos;
        this.playerTexts[playerData.id] = playerText;
        this.container.addChild(playerText);
    }

    _updateBackgroundHeight(minHeight) {
        // Adjust background height based on content, but not less than a minimum
        const currentHeight = Object.keys(this.playerTexts).length * 20 + 20;
        this.background.height = Math.max(100, currentHeight); // Min height of 100
    }
}
