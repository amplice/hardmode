import * as PIXI from 'pixi.js';

export class StatsUI {
    constructor(player) {
        this.player = player;
        this.container = new PIXI.Container();
        this.container.position.set(20, 60); // below health UI
        this.container.zIndex = 100;

        this.killText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });
        this.xpText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });
        this.xpToNextText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });
        this.levelText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });

        this.xpText.position.set(0, 20);
        this.xpToNextText.position.set(0, 40);
        this.levelText.position.set(0, 60);

        this.container.addChild(this.killText, this.xpText, this.xpToNextText, this.levelText);
        this.update();
    }

    update() {
        this.killText.text = `Kills: ${this.player.killCount}`;
        this.xpText.text = `XP: ${Math.floor(this.player.experience)}`;
        if (this.player.stats && this.player.stats.getXpUntilNextLevel) {
            const remaining = Math.ceil(this.player.stats.getXpUntilNextLevel());
            this.xpToNextText.text = `XP to Next: ${remaining}`;
        }
        this.levelText.text = `Level: ${this.player.level}`;
    }
}
