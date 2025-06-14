import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { networkManager } from '../network/NetworkManager';

export class ConnectionUI extends Container {
  private background: Graphics;
  private usernameInput: HTMLInputElement;
  private connectButton: HTMLButtonElement;
  private statusText: Text;
  private overlay: HTMLDivElement;

  constructor() {
    super();

    // Create background
    this.background = new Graphics();
    this.background.beginFill(0x000000, 0.8);
    this.background.drawRect(0, 0, 800, 600);
    this.background.endFill();
    this.addChild(this.background);

    // Create HTML overlay for input
    this.overlay = document.createElement('div');
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '50%';
    this.overlay.style.left = '50%';
    this.overlay.style.transform = 'translate(-50%, -50%)';
    this.overlay.style.background = 'rgba(0, 0, 0, 0.9)';
    this.overlay.style.padding = '20px';
    this.overlay.style.borderRadius = '10px';
    this.overlay.style.border = '2px solid #00ff00';
    this.overlay.style.color = 'white';
    this.overlay.style.fontFamily = 'Arial';
    this.overlay.style.textAlign = 'center';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Enter Username';
    title.style.margin = '0 0 20px 0';
    title.style.color = '#00ff00';
    this.overlay.appendChild(title);

    // Username input
    this.usernameInput = document.createElement('input');
    this.usernameInput.type = 'text';
    this.usernameInput.placeholder = 'Username';
    this.usernameInput.maxLength = 20;
    this.usernameInput.style.padding = '10px';
    this.usernameInput.style.fontSize = '16px';
    this.usernameInput.style.width = '200px';
    this.usernameInput.style.marginBottom = '10px';
    this.usernameInput.style.background = '#333';
    this.usernameInput.style.border = '1px solid #00ff00';
    this.usernameInput.style.color = 'white';
    this.usernameInput.style.borderRadius = '5px';
    this.overlay.appendChild(this.usernameInput);

    this.overlay.appendChild(document.createElement('br'));

    // Connect button
    this.connectButton = document.createElement('button');
    this.connectButton.textContent = 'Connect';
    this.connectButton.style.padding = '10px 20px';
    this.connectButton.style.fontSize = '16px';
    this.connectButton.style.background = '#00ff00';
    this.connectButton.style.color = 'black';
    this.connectButton.style.border = 'none';
    this.connectButton.style.borderRadius = '5px';
    this.connectButton.style.cursor = 'pointer';
    this.connectButton.style.marginTop = '10px';
    this.overlay.appendChild(this.connectButton);

    // Status text (PIXI)
    const textStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xffff00,
      align: 'center',
    });
    this.statusText = new Text('', textStyle);
    this.statusText.anchor.set(0.5);
    this.statusText.position.set(400, 400);
    this.addChild(this.statusText);

    // Event handlers
    this.connectButton.onclick = () => this.handleConnect();
    this.usernameInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        this.handleConnect();
      }
    };

    document.body.appendChild(this.overlay);
    this.usernameInput.focus();
  }

  private handleConnect(): void {
    const username = this.usernameInput.value.trim();
    
    if (username.length < 3) {
      this.showStatus('Username must be at least 3 characters', true);
      return;
    }

    this.connectButton.disabled = true;
    this.usernameInput.disabled = true;
    this.showStatus('Connecting...');

    networkManager.once('connected', () => {
      this.showStatus('Connected!');
      setTimeout(() => {
        this.hide();
        this.emit('connected');
      }, 500);
    });

    networkManager.once('error', (error: Error) => {
      this.showStatus(error.message, true);
      this.connectButton.disabled = false;
      this.usernameInput.disabled = false;
    });

    networkManager.connect({ username });
  }

  private showStatus(message: string, isError: boolean = false): void {
    this.statusText.text = message;
    this.statusText.style.fill = isError ? 0xff0000 : 0xffff00;
  }

  show(): void {
    this.visible = true;
    this.overlay.style.display = 'block';
    this.usernameInput.value = '';
    this.usernameInput.focus();
    this.connectButton.disabled = false;
    this.usernameInput.disabled = false;
    this.showStatus('');
  }

  hide(): void {
    this.visible = false;
    this.overlay.style.display = 'none';
  }

  destroy(): void {
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    super.destroy();
  }
}