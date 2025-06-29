import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG } from '../config/GameConfig.js';

export class ClassSelectUI {
    constructor(onClassSelected) {
        this.container = new PIXI.Container();
        this.onClassSelected = onClassSelected;
        this.selectedClass = null;
        
        // Create background
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x000000, 0.8);
        this.background.drawRect(0, 0, window.innerWidth, window.innerHeight);
        this.background.endFill();
        this.container.addChild(this.background);
        
        // Create title
        this.title = new PIXI.Text('SELECT YOUR CLASS', {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 0xFFFFFF,
            align: 'center'
        });
        this.title.anchor.set(0.5, 0);
        this.title.position.set(window.innerWidth / 2, 50);
        this.container.addChild(this.title);
        
        // Create class options
        this.createClassOptions();
    }
    
    createClassOptions() {
        const classes = ['bladedancer', 'guardian', 'hunter', 'rogue'];
        const classDescriptions = {
            bladedancer: 'Medium HP, Fast movement\nSpecialist in medium-range combat',
            guardian: 'High HP, Slow movement\nTank class with defensive abilities',
            hunter: 'Low HP, Medium movement\nExcels at long-range combat',
            rogue: 'Very Low HP, Very Fast movement\nLightning-fast attacks with great mobility'
        };
        
        // Position variables
        const startX = window.innerWidth / 2 - ((classes.length - 1) * 200) / 2;
        const startY = window.innerHeight / 2 - 100;
        
        this.classButtons = [];
        
        classes.forEach((className, index) => {
            const classConfig = PLAYER_CONFIG.classes[className];
            const container = new PIXI.Container();
            
            // Create button background
            const button = new PIXI.Graphics();
            button.beginFill(0x333333);
            button.lineStyle(4, classConfig.baseColor, 1);
            button.drawRoundedRect(0, 0, 180, 250, 10);
            button.endFill();
            container.addChild(button);
            
            // Create class name text
            const nameText = new PIXI.Text(className.toUpperCase(), {
                fontFamily: 'Arial',
                fontSize: 20,
                fill: 0xFFFFFF,
                align: 'center'
            });
            nameText.anchor.set(0.5, 0);
            nameText.position.set(90, 10);
            container.addChild(nameText);
            
            // Create class icon/placeholder
            const icon = new PIXI.Graphics();
            icon.beginFill(classConfig.baseColor);
            icon.drawCircle(90, 80, 50);
            icon.endFill();
            container.addChild(icon);
            
            // Create stats text
            const statsText = new PIXI.Text(
                `HP: ${classConfig.hitPoints}\nSpeed: ${classConfig.moveSpeed}`, {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: 0xFFFFFF,
                align: 'center'
            });
            statsText.anchor.set(0.5, 0);
            statsText.position.set(90, 140);
            container.addChild(statsText);
            
            // Create description text
            const descText = new PIXI.Text(classDescriptions[className], {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xCCCCCC,
                align: 'center'
            });
            descText.anchor.set(0.5, 0);
            descText.position.set(90, 180);
            container.addChild(descText);
            
            // Position the container
            container.position.set(startX + index * 200, startY);
            container.interactive = true;
            container.cursor = 'pointer';
            
            // Add event listeners
            container.on('pointerover', () => {
                button.clear();
                button.beginFill(0x444444);
                button.lineStyle(4, classConfig.baseColor, 1);
                button.drawRoundedRect(0, 0, 180, 250, 10);
                button.endFill();
            });
            
            container.on('pointerout', () => {
                if (this.selectedClass !== className) {
                    button.clear();
                    button.beginFill(0x333333);
                    button.lineStyle(4, classConfig.baseColor, 1);
                    button.drawRoundedRect(0, 0, 180, 250, 10);
                    button.endFill();
                }
            });
            
            container.on('pointerdown', () => {
                this.selectClass(className, index);
            });
            
            this.classButtons.push({
                container,
                button,
                className
            });
            
            this.container.addChild(container);
        });
        
        // Add start button
        this.startButton = new PIXI.Graphics();
        this.startButton.beginFill(0x27ae60);
        this.startButton.drawRoundedRect(0, 0, 200, 50, 10);
        this.startButton.endFill();
        this.startButton.position.set(window.innerWidth / 2 - 100, startY + 300);
        this.startButton.alpha = 0.5; // Dim until class is selected
        this.startButton.interactive = false;
        
        const startText = new PIXI.Text('START GAME', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0xFFFFFF,
            align: 'center'
        });
        startText.anchor.set(0.5, 0.5);
        startText.position.set(100, 25);
        this.startButton.addChild(startText);
        
        this.startButton.on('pointerover', () => {
            if (this.selectedClass) {
                this.startButton.clear();
                this.startButton.beginFill(0x2ecc71);
                this.startButton.drawRoundedRect(0, 0, 200, 50, 10);
                this.startButton.endFill();
            }
        });
        
        this.startButton.on('pointerout', () => {
            if (this.selectedClass) {
                this.startButton.clear();
                this.startButton.beginFill(0x27ae60);
                this.startButton.drawRoundedRect(0, 0, 200, 50, 10);
                this.startButton.endFill();
            }
        });
        
        this.startButton.on('pointerdown', () => {
            if (this.selectedClass) {
                this.onClassSelected(this.selectedClass);
            }
        });
        
        this.container.addChild(this.startButton);
    }
    
    selectClass(className, index) {
        // Reset all buttons
        this.classButtons.forEach(button => {
            const config = PLAYER_CONFIG.classes[button.className];
            button.button.clear();
            button.button.beginFill(0x333333);
            button.button.lineStyle(4, config.baseColor, 1);
            button.button.drawRoundedRect(0, 0, 180, 250, 10);
            button.button.endFill();
        });
        
        // Highlight selected button
        const selectedButton = this.classButtons[index];
        const classConfig = PLAYER_CONFIG.classes[className];
        selectedButton.button.clear();
        selectedButton.button.beginFill(0x444444);
        selectedButton.button.lineStyle(6, classConfig.baseColor, 1);
        selectedButton.button.drawRoundedRect(0, 0, 180, 250, 10);
        selectedButton.button.endFill();
        
        // Set selected class
        this.selectedClass = className;
        
        // Enable start button
        this.startButton.alpha = 1;
        this.startButton.interactive = true;
        this.startButton.cursor = 'pointer';
    }
}