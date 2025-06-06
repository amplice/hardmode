import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG } from '../config/GameConfig.js';

export class StatsUI {
    constructor(player, options = {}) {
        this.player = player;
        this.showDebug = options.showDebug || false;
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

        this.moveSpeedText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });
        this.attack1RecoveryText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });
        this.attack1CooldownText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });
        this.attack2RecoveryText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });
        this.attack2CooldownText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });
        this.rollAvailableText = new PIXI.Text('', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });

        this.moveSpeedText.position.set(0, 80);
        this.attack1RecoveryText.position.set(0, 100);
        this.attack1CooldownText.position.set(0, 120);
        this.attack2RecoveryText.position.set(0, 140);
        this.attack2CooldownText.position.set(0, 160);
        this.rollAvailableText.position.set(0, 180);

        this.container.addChild(this.killText, this.xpText, this.xpToNextText, this.levelText);
        if (this.showDebug) {
            this.container.addChild(
                this.moveSpeedText,
                this.attack1RecoveryText,
                this.attack1CooldownText,
                this.attack2RecoveryText,
                this.attack2CooldownText,
                this.rollAvailableText
            );
        }
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

        if (this.showDebug) {
            const classKeyPrimary = PLAYER_CONFIG.attacks[`${this.player.characterClass}_primary`] ?
                `${this.player.characterClass}_primary` : 'primary';
            const classKeySecondary = PLAYER_CONFIG.attacks[`${this.player.characterClass}_secondary`] ?
                `${this.player.characterClass}_secondary` : 'secondary';
            const attack1 = PLAYER_CONFIG.attacks[classKeyPrimary];
            const attack2 = PLAYER_CONFIG.attacks[classKeySecondary];

            this.moveSpeedText.text = `Move Speed: ${this.player.moveSpeed.toFixed(2)}`;
            this.attack1RecoveryText.text = `A1 Recovery: ${attack1.recoveryTime}`;
            this.attack1CooldownText.text = `A1 Cooldown: ${attack1.cooldown}`;
            this.attack2RecoveryText.text = `A2 Recovery: ${attack2.recoveryTime}`;
            this.attack2CooldownText.text = `A2 Cooldown: ${attack2.cooldown}`;
            this.rollAvailableText.text = `Roll Available: ${this.player.rollUnlocked ? 'Yes' : 'No'}`;
        }
    }
}
