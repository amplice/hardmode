import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { networkManager } from '../network/NetworkManager';

export class MultiplayerHUD extends Container {
  private playerListText: Text;
  private latencyText: Text;
  private statusText: Text;
  private background: Graphics;

  constructor() {
    super();

    // Background for HUD
    this.background = new Graphics();
    this.background.beginFill(0x000000, 0.7);
    this.background.drawRoundedRect(0, 0, 200, 150, 5);
    this.background.endFill();
    this.addChild(this.background);

    const textStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      lineHeight: 16,
    });

    // Status text
    this.statusText = new Text('Disconnected', textStyle);
    this.statusText.position.set(10, 10);
    this.addChild(this.statusText);

    // Latency text
    this.latencyText = new Text('Ping: --', textStyle);
    this.latencyText.position.set(10, 30);
    this.addChild(this.latencyText);

    // Player list header
    const playerListHeader = new Text('Players Online:', textStyle);
    playerListHeader.position.set(10, 50);
    this.addChild(playerListHeader);

    // Player list
    this.playerListText = new Text('', new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0xcccccc,
      lineHeight: 14,
    }));
    this.playerListText.position.set(10, 70);
    this.addChild(this.playerListText);

    // Set up event listeners
    this.setupEventListeners();
    
    // Initial update
    this.updatePlayerList();
  }

  private setupEventListeners(): void {
    // Check if already connected
    if (networkManager.isConnected()) {
      const username = networkManager.getUsername();
      if (username) {
        this.statusText.text = `Connected as ${username}`;
        this.statusText.style.fill = 0x00ff00;
      }
    }
    
    networkManager.on('connected', (data) => {
      console.log('MultiplayerHUD: Received connected event', data);
      this.statusText.text = `Connected as ${data.username}`;
      this.statusText.style.fill = 0x00ff00;
    });

    networkManager.on('disconnect', () => {
      this.statusText.text = 'Disconnected';
      this.statusText.style.fill = 0xff0000;
      this.latencyText.text = 'Ping: --';
      this.playerListText.text = '';
    });

    networkManager.on('latencyUpdate', (latency: number) => {
      this.latencyText.text = `Ping: ${latency}ms`;
      
      // Color code based on latency
      if (latency < 50) {
        this.latencyText.style.fill = 0x00ff00; // Green
      } else if (latency < 150) {
        this.latencyText.style.fill = 0xffff00; // Yellow
      } else {
        this.latencyText.style.fill = 0xff0000; // Red
      }
    });

    networkManager.on('playerList', (players: any[]) => {
      this.updatePlayerList();
    });

    networkManager.on('playerJoined', () => {
      this.updatePlayerList();
    });

    networkManager.on('playerLeft', () => {
      this.updatePlayerList();
    });
  }

  private updatePlayerList(): void {
    const players = networkManager.getPlayers();
    const playerNames: string[] = [];
    
    // Add current player
    const username = networkManager.getUsername();
    if (username) {
      playerNames.push(`${username} (You)`);
    }

    // Add other players
    players.forEach(player => {
      playerNames.push(player.username);
    });

    // Update text (show max 5 players)
    const displayNames = playerNames.slice(0, 5);
    if (playerNames.length > 5) {
      displayNames.push(`... and ${playerNames.length - 5} more`);
    }
    
    this.playerListText.text = displayNames.join('\n');

    // Adjust background height based on content
    const totalHeight = 70 + (displayNames.length * 14) + 10;
    this.background.clear();
    this.background.beginFill(0x000000, 0.7);
    this.background.drawRoundedRect(0, 0, 200, totalHeight, 5);
    this.background.endFill();
  }

  destroy(): void {
    // Remove all event listeners
    networkManager.removeAllListeners('connected');
    networkManager.removeAllListeners('disconnect');
    networkManager.removeAllListeners('latencyUpdate');
    networkManager.removeAllListeners('playerList');
    networkManager.removeAllListeners('playerJoined');
    networkManager.removeAllListeners('playerLeft');
    
    super.destroy();
  }
}