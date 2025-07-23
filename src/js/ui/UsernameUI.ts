/**
 * @fileoverview UsernameUI - Username input interface for players
 * 
 * ARCHITECTURE ROLE:
 * - Displays username input prompt when player first joins
 * - Validates username with server to ensure uniqueness
 * - Shows error messages for duplicate usernames
 * - Blocks game start until valid username is chosen
 */

import * as PIXI from 'pixi.js';

interface UsernameCallback {
    (username: string): void;
}

export class UsernameUI {
    public container: PIXI.Container;
    private background: PIXI.Graphics;
    private titleText: PIXI.Text;
    private instructionText: PIXI.Text;
    private usernameText: PIXI.Text;
    private errorText: PIXI.Text;
    private inputElement: HTMLInputElement;
    private submitButton: HTMLButtonElement;
    private onSubmit: UsernameCallback;
    
    constructor(onSubmit: UsernameCallback) {
        this.onSubmit = onSubmit;
        this.container = new PIXI.Container();
        
        // Create semi-transparent background
        this.background = new PIXI.Graphics();
        this.updateBackground();
        this.container.addChild(this.background);
        
        // Title text
        this.titleText = new PIXI.Text('Enter Username', {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 0xFFFFFF,
            align: 'center'
        });
        this.titleText.anchor.set(0.5, 0.5);
        this.container.addChild(this.titleText);
        
        // Instruction text
        this.instructionText = new PIXI.Text('Choose a unique username to identify yourself', {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 0xCCCCCC,
            align: 'center'
        });
        this.instructionText.anchor.set(0.5, 0.5);
        this.container.addChild(this.instructionText);
        
        // Username display text
        this.usernameText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF,
            align: 'center'
        });
        this.usernameText.anchor.set(0.5, 0.5);
        this.container.addChild(this.usernameText);
        
        // Error text (hidden by default)
        this.errorText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0xFF4444,
            align: 'center'
        });
        this.errorText.anchor.set(0.5, 0.5);
        this.errorText.visible = false;
        this.container.addChild(this.errorText);
        
        // Create HTML input element
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.placeholder = 'Enter username...';
        this.inputElement.maxLength = 20;
        this.inputElement.style.position = 'absolute';
        this.inputElement.style.fontSize = '20px';
        this.inputElement.style.padding = '10px';
        this.inputElement.style.border = '2px solid #666';
        this.inputElement.style.borderRadius = '5px';
        this.inputElement.style.backgroundColor = '#333';
        this.inputElement.style.color = '#FFF';
        this.inputElement.style.textAlign = 'center';
        this.inputElement.style.width = '300px';
        
        // Create submit button
        this.submitButton = document.createElement('button');
        this.submitButton.textContent = 'Join Game';
        this.submitButton.style.position = 'absolute';
        this.submitButton.style.fontSize = '20px';
        this.submitButton.style.padding = '10px 30px';
        this.submitButton.style.border = 'none';
        this.submitButton.style.borderRadius = '5px';
        this.submitButton.style.backgroundColor = '#4CAF50';
        this.submitButton.style.color = '#FFF';
        this.submitButton.style.cursor = 'pointer';
        this.submitButton.style.marginTop = '10px';
        
        // Add hover effect
        this.submitButton.onmouseover = () => {
            this.submitButton.style.backgroundColor = '#5CBF60';
        };
        this.submitButton.onmouseout = () => {
            this.submitButton.style.backgroundColor = '#4CAF50';
        };
        
        // Handle input events
        this.inputElement.addEventListener('input', () => {
            this.usernameText.text = this.inputElement.value;
            this.hideError();
        });
        
        this.inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSubmit();
            }
        });
        
        this.submitButton.addEventListener('click', () => {
            this.handleSubmit();
        });
        
        // Position elements
        this.updatePositions();
        
        // Listen for window resize
        window.addEventListener('resize', () => this.updatePositions());
    }
    
    private updateBackground(): void {
        this.background.clear();
        this.background.beginFill(0x000000, 0.8);
        this.background.drawRect(0, 0, window.innerWidth, window.innerHeight);
        this.background.endFill();
    }
    
    private updatePositions(): void {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Update background
        this.updateBackground();
        
        // Position PIXI elements
        this.titleText.position.set(centerX, centerY - 100);
        this.instructionText.position.set(centerX, centerY - 60);
        this.usernameText.position.set(centerX, centerY);
        this.errorText.position.set(centerX, centerY + 40);
        
        // Position HTML elements
        this.inputElement.style.left = `${centerX - 150}px`;
        this.inputElement.style.top = `${centerY - 20}px`;
        
        this.submitButton.style.left = `${centerX - 75}px`;
        this.submitButton.style.top = `${centerY + 40}px`;
    }
    
    private handleSubmit(): void {
        const username = this.inputElement.value.trim();
        
        if (username.length === 0) {
            this.showError('Username cannot be empty');
            return;
        }
        
        if (username.length < 3) {
            this.showError('Username must be at least 3 characters');
            return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showError('Username can only contain letters, numbers, and underscores');
            return;
        }
        
        // Disable input while validating
        this.inputElement.disabled = true;
        this.submitButton.disabled = true;
        this.submitButton.textContent = 'Checking...';
        
        // Call the submit callback
        this.onSubmit(username);
    }
    
    showError(message: string): void {
        this.errorText.text = message;
        this.errorText.visible = true;
        
        // Re-enable input
        this.inputElement.disabled = false;
        this.submitButton.disabled = false;
        this.submitButton.textContent = 'Join Game';
    }
    
    hideError(): void {
        this.errorText.visible = false;
    }
    
    show(): void {
        this.container.visible = true;
        document.body.appendChild(this.inputElement);
        document.body.appendChild(this.submitButton);
        this.inputElement.focus();
    }
    
    hide(): void {
        this.container.visible = false;
        if (this.inputElement.parentNode) {
            document.body.removeChild(this.inputElement);
        }
        if (this.submitButton.parentNode) {
            document.body.removeChild(this.submitButton);
        }
    }
    
    destroy(): void {
        this.hide();
        window.removeEventListener('resize', () => this.updatePositions());
    }
}