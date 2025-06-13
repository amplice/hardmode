import * as PIXI from 'pixi.js';

export class ChatUI {
    constructor(socket) {
        this.socket = socket;
        this.messageHistory = [];
        this.maxMessages = 10; // Max messages to display

        // --- PIXI UI for displaying messages ---
        this.displayContainer = new PIXI.Container();
        this.displayContainer.x = 10;
        this.displayContainer.y = window.innerHeight - 220; // Position above input area

        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000, 0.4);
        this.background.drawRect(0, 0, 400, 200); // Chat display area
        this.background.endFill();
        this.displayContainer.addChild(this.background);

        this.messageTextStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 14,
            fill: '#ffffff',
            wordWrap: true,
            wordWrapWidth: 390
        });
        this.messageOffsetY = 5; // Initial Y offset for first message

        // --- HTML Input Field ---
        this.htmlInput = document.createElement('input');
        this.htmlInput.type = 'text';
        this.htmlInput.placeholder = 'Press Enter to chat...';
        this.htmlInput.style.position = 'absolute';
        this.htmlInput.style.bottom = '10px';
        this.htmlInput.style.left = '10px';
        this.htmlInput.style.width = '380px'; // A bit less than PIXI background
        this.htmlInput.style.padding = '5px';
        this.htmlInput.style.border = '1px solid #555';
        this.htmlInput.style.backgroundColor = '#333';
        this.htmlInput.style.color = '#fff';
        this.htmlInput.style.fontFamily = 'Arial';
        this.htmlInput.style.fontSize = '14px';
        this.htmlInput.style.opacity = '0.7'; // Semi-transparent

        document.body.appendChild(this.htmlInput);

        this.htmlInput.addEventListener('focus', () => this.onFocus());
        this.htmlInput.addEventListener('blur', () => this.onBlur());
        this.htmlInput.addEventListener('keydown', (e) => this.onInputKeyDown(e));

        this.isFocused = false;

        // Resize handler
        window.addEventListener('resize', () => this.onResize());
        this.onResize(); // Call once to set initial position
    }

    onResize() {
        this.displayContainer.y = window.innerHeight - this.background.height - 50; // 50px from bottom
        this.htmlInput.style.bottom = '10px'; // Keep input at bottom
    }

    onFocus() {
        this.isFocused = true;
        this.htmlInput.style.opacity = '1.0';
        if (window.game && window.game.systems && window.game.systems.input) {
            window.game.systems.input.setChatActive(true);
        }
    }

    onBlur() {
        this.isFocused = false;
        this.htmlInput.style.opacity = '0.7';
        if (window.game && window.game.systems && window.game.systems.input) {
            window.game.systems.input.setChatActive(false);
        }
    }

    focusInput() {
        this.htmlInput.focus();
    }

    blurInput() {
        this.htmlInput.blur();
    }

    onInputKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const message = this.htmlInput.value.trim();
            if (message) {
                this.socket.emit('chatMessageSent', { message });
                this.htmlInput.value = '';
            }
        } else if (event.key === 'Escape') { // Allow Esc to blur chat
            this.blurInput();
        }
    }

    addMessage(senderName, messageText) {
        const fullMessage = `${senderName}: ${messageText}`;
        const messageTextObject = new PIXI.Text(fullMessage, this.messageTextStyle);
        messageTextObject.x = 5;
        // messageTextObject.y will be set in _renderMessages

        this.messageHistory.push(messageTextObject);
        if (this.messageHistory.length > this.maxMessages) {
            const oldestMessage = this.messageHistory.shift();
            if (oldestMessage.parent) {
                this.displayContainer.removeChild(oldestMessage);
            }
        }
        this._renderMessages();
    }

    _renderMessages() {
        // Clear current messages from display (but not from history array)
        this.displayContainer.children.forEach(child => {
            if (child instanceof PIXI.Text) { // Only remove PIXI.Text messages
                this.displayContainer.removeChild(child);
            }
        });

        let currentY = this.background.height - this.messageOffsetY; // Start from bottom

        for (let i = this.messageHistory.length - 1; i >= 0; i--) {
            const message = this.messageHistory[i];
            message.y = currentY - message.height;
            if (message.y < this.messageOffsetY) { // Don't draw above the top
                break;
            }
            this.displayContainer.addChild(message);
            currentY -= (message.height + 2); // +2 for small padding
        }
    }

    // Call this to toggle chat input focus, e.g. when Enter is pressed in game
    toggleChatFocus() {
        if (this.isFocused) {
            this.blurInput();
        } else {
            this.focusInput();
        }
    }
}
