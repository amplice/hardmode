import * as PIXI from 'pixi.js';

export class LobbyUI {
    constructor(onCreate, onJoin) {
        this.container = new PIXI.Container();
        this.onCreate = onCreate;
        this.onJoin = onJoin;

        const createBtn = this._makeButton('CREATE GAME');
        createBtn.position.set(window.innerWidth / 2 - 100, window.innerHeight / 2 - 80);
        createBtn.on('pointerdown', () => {
            if (this.onCreate) this.onCreate();
        });
        this.container.addChild(createBtn);

        const joinBtn = this._makeButton('JOIN GAME');
        joinBtn.position.set(window.innerWidth / 2 - 100, window.innerHeight / 2);
        joinBtn.on('pointerdown', () => {
            const gameId = window.prompt('Enter Game ID');
            if (gameId && this.onJoin) {
                this.onJoin(gameId);
            }
        });
        this.container.addChild(joinBtn);
    }

    _makeButton(label) {
        const btn = new PIXI.Graphics();
        btn.beginFill(0x34495e);
        btn.drawRoundedRect(0, 0, 200, 50, 10);
        btn.endFill();
        btn.interactive = true;
        btn.cursor = 'pointer';

        const text = new PIXI.Text(label, {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xffffff,
            align: 'center'
        });
        text.anchor.set(0.5);
        text.position.set(100, 25);
        btn.addChild(text);
        return btn;
    }
}
