import * as PIXI from 'pixi.js';

export class LobbyUI {
    // constructor(onCreate, onJoin) { // Old constructor signature
    constructor() { // New constructor, networkManager will be set via method
        this.container = new PIXI.Container();
        // this.onCreate = onCreate; // Old
        // this.onJoin = onJoin; // Old
        this.networkManager = null; // To be set by main game logic
        this.playerListText = new PIXI.Text('Players:\n', { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff });
        this.playerListText.position.set(50, 50);
        // this.container.addChild(this.playerListText); // Will be added after clearing

        // Remove old create/join buttons for now, or move them. Assume lobby is shown *after* joining/creating.
        this.container.removeChildren(); // Clear existing buttons if this UI is repurposed
        this.container.addChild(this.playerListText); // Add it back

        const readyBtn = this._makeButton('READY'); // Use existing _makeButton or similar
        readyBtn.position.set(window.innerWidth / 2 - 100, window.innerHeight - 100);
        readyBtn.on('pointerdown', () => {
            if (this.networkManager) {
                this.networkManager.setReady();
            }
        });
        this.container.addChild(readyBtn);

        const selectClassBtn = this._makeButton('SELECT CLASS');
        selectClassBtn.position.set(window.innerWidth / 2 - 100, window.innerHeight - 160);
        selectClassBtn.on('pointerdown', () => {
            // This would ideally trigger showing the ClassSelectUI.
            // For now, it can call networkManager.selectClass with a default class for testing.
            if (this.networkManager) {
                // Placeholder: In a real scenario, you'd open ClassSelectUI
                // and get the class from its callback.
                const testClasses = ['bladedancer', 'guardian', 'hunter', 'rogue'];
                const randomClass = testClasses[Math.floor(Math.random() * testClasses.length)];
                this.networkManager.selectClass(randomClass);
                console.log('Select Class button clicked, sending test class:', randomClass);
            }
        });
        this.container.addChild(selectClassBtn);
    }

    setNetworkManager(networkManager) {
        this.networkManager = networkManager;
        // Set up the callback for lobby updates
        this.networkManager.setLobbyUpdateCallback(this.updateLobbyDisplay.bind(this));
        // Initial fetch or display if lobby state is already available
        this.updateLobbyDisplay(this.networkManager.getLobbyState());
    }

    updateLobbyDisplay(lobbyState) {
        let displayText = 'Players in Lobby:\n';
        if (lobbyState && lobbyState.players) {
            for (const player of lobbyState.players) {
                displayText += `- ${player.id} (Class: ${player.class || 'N/A'}, Ready: ${player.ready ? 'Yes' : 'No'})\n`;
            }
        }
        this.playerListText.text = displayText;
        console.log('LobbyUI updated:', lobbyState);
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
