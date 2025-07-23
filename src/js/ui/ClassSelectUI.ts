/**
 * @fileoverview ClassSelectUI - Character class selection interface
 * 
 * MIGRATION NOTES:
 * - Converted from ClassSelectUI.js following CLIENT_TYPESCRIPT_MIGRATION_PLAN Phase 3, Round 6
 * - Maintains 100% API compatibility with existing JavaScript callers
 * - Added comprehensive type definitions for UI components
 * - Preserved all visual styling and interaction logic
 * 
 * ARCHITECTURE ROLE:
 * - Initial game interface for character class selection
 * - Displays four character classes with stats and descriptions
 * - Visual feedback for hover and selection states
 * - Calls callback function when player confirms class choice
 * 
 * VISUAL DESIGN:
 * - Dark themed UI with class-specific color accents
 * - Card-based layout with icons, stats bars, and descriptions
 * - Enhanced hover effects and selection highlighting
 * - Animated start button that activates after selection
 * 
 * CHARACTER CLASSES:
 * - Bladedancer: Balanced melee warrior
 * - Guardian: Tank with heavy armor
 * - Hunter: Ranged precision attacker
 * - Rogue: High-speed glass cannon
 */

import * as PIXI from 'pixi.js';
import { PLAYER_CONFIG } from '../config/GameConfig.js';

// Type definitions
type CharacterClass = 'bladedancer' | 'guardian' | 'hunter' | 'rogue';

interface ClassButton {
    container: PIXI.Container;
    button: PIXI.Graphics;
    className: CharacterClass;
    cardWidth: number;
    cardHeight: number;
}

interface ClassTheme {
    icon: string;
    specialty: string;
}

export class ClassSelectUI {
    public container: PIXI.Container;
    private onClassSelected: (className: CharacterClass) => void;
    private selectedClass: CharacterClass | null;
    
    // UI elements
    private background!: PIXI.Graphics;
    private title!: PIXI.Text;
    private subtitle!: PIXI.Text;
    private startButton!: PIXI.Container;
    private startButtonGraphics!: PIXI.Graphics;
    private startButtonText!: PIXI.Text;
    private classButtons: ClassButton[];

    constructor(onClassSelected: (className: CharacterClass) => void) {
        this.container = new PIXI.Container();
        this.onClassSelected = onClassSelected;
        this.selectedClass = null;
        this.classButtons = [];
        
        // Create animated background
        this.createBackground();
        
        // Create enhanced title
        this.createTitle();
        
        // Create class options
        this.createClassOptions();
    }
    
    private createBackground(): void {
        // Dark gradient background
        this.background = new PIXI.Graphics();
        this.background.beginFill(0x0a0a0a, 0.95);
        this.background.drawRect(0, 0, window.innerWidth, window.innerHeight);
        this.background.endFill();
        
        // Add subtle pattern overlay
        const patternGraphics = new PIXI.Graphics();
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            const size = Math.random() * 2 + 1;
            patternGraphics.beginFill(0x333333, 0.1);
            patternGraphics.drawCircle(x, y, size);
            patternGraphics.endFill();
        }
        
        this.container.addChild(this.background);
        this.container.addChild(patternGraphics);
    }
    
    private createTitle(): void {
        // Main title with enhanced styling
        this.title = new PIXI.Text('SELECT YOUR CLASS', {
            fontFamily: 'Arial, sans-serif',
            fontSize: 36,
            fontWeight: 'bold',
            fill: ['#ffffff', '#cccccc'], // Gradient text
            align: 'center',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowDistance: 2
        });
        this.title.anchor.set(0.5, 0);
        this.title.position.set(window.innerWidth / 2, 40);
        
        // Subtitle
        this.subtitle = new PIXI.Text('Choose your path and master the combat', {
            fontFamily: 'Arial, sans-serif',
            fontSize: 18,
            fontStyle: 'italic',
            fill: 0xaaaaaa,
            align: 'center'
        });
        this.subtitle.anchor.set(0.5, 0);
        this.subtitle.position.set(window.innerWidth / 2, 95);
        
        this.container.addChild(this.title);
        this.container.addChild(this.subtitle);
    }
    
    private createClassOptions(): void {
        const classes: CharacterClass[] = ['bladedancer', 'guardian', 'hunter', 'rogue'];
        const classDescriptions: Record<CharacterClass, string> = {
            bladedancer: 'Balanced warrior with swift strikes\nMedium armor, high mobility',
            guardian: 'Mighty defender of the realm\nHeavy armor, protective abilities',
            hunter: 'Master of ranged precision\nLight armor, deadly accuracy',
            rogue: 'Shadow dancer of death\nNo armor, lightning speed'
        };
        
        const classThemes: Record<CharacterClass, ClassTheme> = {
            bladedancer: { icon: '⚔️', specialty: 'Melee Combat' },
            guardian: { icon: '🛡️', specialty: 'Tank & Defense' },
            hunter: { icon: '🏹', specialty: 'Ranged Attacks' },
            rogue: { icon: '🗡️', specialty: 'Speed & Stealth' }
        };
        
        // Enhanced positioning for better spacing
        const cardWidth = 200;
        const cardHeight = 260;
        const spacing = 25;
        const totalWidth = (classes.length * cardWidth) + ((classes.length - 1) * spacing);
        const startX = (window.innerWidth - totalWidth) / 2;
        const startY = window.innerHeight / 2 - 250; // Moved up by 150px
        
        classes.forEach((className, index) => {
            const classConfig = PLAYER_CONFIG.classes[className];
            const theme = classThemes[className];
            const container = new PIXI.Container();
            
            // Enhanced card background with gradient effect
            const button = new PIXI.Graphics();
            this.drawEnhancedCard(button, classConfig.baseColor, cardWidth, cardHeight, false);
            container.addChild(button);
            
            // Subtle inner glow
            const innerGlow = new PIXI.Graphics();
            innerGlow.beginFill(classConfig.baseColor, 0.1);
            innerGlow.drawRoundedRect(8, 8, cardWidth - 16, cardHeight - 16, 12);
            innerGlow.endFill();
            container.addChild(innerGlow);
            
            // Class name with enhanced styling
            const nameText = new PIXI.Text(className.toUpperCase(), {
                fontFamily: 'Arial, sans-serif',
                fontSize: 22,
                fontWeight: 'bold',
                fill: 0xFFFFFF,
                align: 'center',
                dropShadow: true,
                dropShadowColor: classConfig.baseColor,
                dropShadowBlur: 2,
                dropShadowDistance: 1
            });
            nameText.anchor.set(0.5, 0);
            nameText.position.set(cardWidth / 2, 20);
            container.addChild(nameText);
            
            // Specialty badge
            const specialtyBg = new PIXI.Graphics();
            specialtyBg.beginFill(classConfig.baseColor, 0.8);
            specialtyBg.drawRoundedRect(20, 50, cardWidth - 40, 25, 12);
            specialtyBg.endFill();
            container.addChild(specialtyBg);
            
            const specialtyText = new PIXI.Text(theme.specialty, {
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                fontWeight: 'bold',
                fill: 0xFFFFFF,
                align: 'center'
            });
            specialtyText.anchor.set(0.5, 0.5);
            specialtyText.position.set(cardWidth / 2, 62);
            container.addChild(specialtyText);
            
            // Enhanced class icon
            const iconBg = new PIXI.Graphics();
            iconBg.beginFill(0x1a1a1a, 0.8);
            iconBg.lineStyle(3, classConfig.baseColor, 0.6);
            iconBg.drawCircle(cardWidth / 2, 130, 45);
            iconBg.endFill();
            container.addChild(iconBg);
            
            const iconText = new PIXI.Text(theme.icon, {
                fontFamily: 'Arial',
                fontSize: 36,
                align: 'center'
            });
            iconText.anchor.set(0.5, 0.5);
            iconText.position.set(cardWidth / 2, 130);
            container.addChild(iconText);
            
            // Stats section with bars
            const statsY = 190;
            const statLabels = ['HP', 'SPEED'];
            const statValues = [classConfig.hitPoints, classConfig.moveSpeed];
            const statMaxValues = [4, 6]; // Max values for visual scaling
            
            statLabels.forEach((label, statIndex) => {
                const y = statsY + (statIndex * 35);
                
                // Stat label
                const labelText = new PIXI.Text(label, {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fill: 0xcccccc
                });
                labelText.position.set(25, y);
                container.addChild(labelText);
                
                // Stat bar background
                const barBg = new PIXI.Graphics();
                barBg.beginFill(0x333333);
                barBg.drawRoundedRect(70, y + 2, 120, 12, 6);
                barBg.endFill();
                container.addChild(barBg);
                
                // Stat bar fill
                const fillWidth = (statValues[statIndex] / statMaxValues[statIndex]) * 120;
                const barFill = new PIXI.Graphics();
                barFill.beginFill(classConfig.baseColor);
                barFill.drawRoundedRect(70, y + 2, fillWidth, 12, 6);
                barFill.endFill();
                container.addChild(barFill);
                
                // Stat value
                const valueText = new PIXI.Text(statValues[statIndex].toString(), {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 11,
                    fontWeight: 'bold',
                    fill: 0xFFFFFF
                });
                valueText.anchor.set(1, 0);
                valueText.position.set(195, y);
                container.addChild(valueText);
            });
            
            // Enhanced description
            const descText = new PIXI.Text(classDescriptions[className], {
                fontFamily: 'Arial, sans-serif',
                fontSize: 13,
                fill: 0xbbbbbb,
                align: 'center',
                lineHeight: 18
            });
            descText.anchor.set(0.5, 0);
            descText.position.set(cardWidth / 2, 265);
            container.addChild(descText);
            
            // Position and setup interaction
            container.position.set(startX + index * (cardWidth + spacing), startY);
            container.eventMode = 'static';
            container.cursor = 'pointer';
            
            // Enhanced hover animations
            container.on('pointerover', () => {
                if (this.selectedClass !== className) {
                    button.clear();
                    this.drawEnhancedCard(button, classConfig.baseColor, cardWidth, cardHeight, true);
                    // Subtle scale animation
                    container.scale.set(1.05);
                }
            });
            
            container.on('pointerout', () => {
                if (this.selectedClass !== className) {
                    button.clear();
                    this.drawEnhancedCard(button, classConfig.baseColor, cardWidth, cardHeight, false);
                    container.scale.set(1.0);
                }
            });
            
            container.on('pointerdown', () => {
                this.selectClass(className, index);
            });
            
            this.classButtons.push({
                container,
                button,
                className,
                cardWidth,
                cardHeight
            });
            
            this.container.addChild(container);
        });
        
        // Enhanced start button
        this.createStartButton(startY + cardHeight + 50);
    }
    
    private drawEnhancedCard(graphics: PIXI.Graphics, color: number, width: number, height: number, isHovered: boolean): void {
        graphics.clear();
        
        // Main card background with subtle gradient effect
        const bgColor = isHovered ? 0x2a2a2a : 0x1a1a1a;
        graphics.beginFill(bgColor, 0.95);
        graphics.lineStyle(2, color, isHovered ? 0.8 : 0.4);
        graphics.drawRoundedRect(0, 0, width, height, 15);
        graphics.endFill();
        
        // Top accent line
        graphics.beginFill(color, isHovered ? 0.6 : 0.3);
        graphics.drawRoundedRect(0, 0, width, 4, 2);
        graphics.endFill();
    }
    
    private createStartButton(yPosition: number): void {
        const buttonWidth = 280;
        const buttonHeight = 60;
        
        // Create container for button
        this.startButton = new PIXI.Container();
        this.startButton.position.set(window.innerWidth / 2 - buttonWidth / 2, yPosition);
        this.startButton.alpha = 0.5; // Dim until class is selected
        this.startButton.eventMode = 'none';
        
        // Create graphics for the button background
        this.startButtonGraphics = new PIXI.Graphics();
        this.startButton.addChild(this.startButtonGraphics);
        
        // Draw initial button state
        this.drawStartButton(false, false);
        
        // Create text for the button
        this.startButtonText = new PIXI.Text('BEGIN YOUR JOURNEY', {
            fontFamily: 'Arial, sans-serif',
            fontSize: 20,
            fontWeight: 'bold',
            fill: 0xFFFFFF,
            align: 'center',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2
        });
        this.startButtonText.anchor.set(0.5, 0.5);
        this.startButtonText.position.set(buttonWidth / 2, buttonHeight / 2);
        this.startButton.addChild(this.startButtonText);
        
        this.startButton.on('pointerover', () => {
            if (this.selectedClass) {
                this.drawStartButton(true, false);
            }
        });
        
        this.startButton.on('pointerout', () => {
            if (this.selectedClass) {
                this.drawStartButton(false, false);
            }
        });
        
        this.startButton.on('pointerdown', () => {
            if (this.selectedClass) {
                this.onClassSelected(this.selectedClass);
            }
        });
        
        this.container.addChild(this.startButton);
    }
    
    private drawStartButton(isHovered: boolean, isSelected: boolean): void {
        const buttonWidth = 280;
        const buttonHeight = 60;
        
        this.startButtonGraphics.clear();
        
        if (this.selectedClass) {
            const baseColor = isHovered ? 0x2ecc71 : 0x27ae60;
            this.startButtonGraphics.beginFill(baseColor, 0.9);
            this.startButtonGraphics.lineStyle(3, 0x2ecc71, 1);
        } else {
            this.startButtonGraphics.beginFill(0x555555, 0.6);
            this.startButtonGraphics.lineStyle(2, 0x777777, 0.5);
        }
        
        this.startButtonGraphics.drawRoundedRect(0, 0, buttonWidth, buttonHeight, 15);
        this.startButtonGraphics.endFill();
        
        // Add accent highlight
        if (this.selectedClass) {
            this.startButtonGraphics.beginFill(0x2ecc71, 0.3);
            this.startButtonGraphics.drawRoundedRect(0, 0, buttonWidth, 6, 3);
            this.startButtonGraphics.endFill();
        }
    }
    
    private selectClass(className: CharacterClass, index: number): void {
        // Reset all buttons to normal state
        this.classButtons.forEach((button, idx) => {
            const config = PLAYER_CONFIG.classes[button.className];
            button.button.clear();
            this.drawEnhancedCard(button.button, config.baseColor, button.cardWidth, button.cardHeight, false);
            button.container.scale.set(1.0);
        });
        
        // Highlight selected button with enhanced styling
        const selectedButton = this.classButtons[index];
        const classConfig = PLAYER_CONFIG.classes[className];
        selectedButton.button.clear();
        
        // Selected state - brighter background and stronger border
        selectedButton.button.beginFill(0x333333, 0.95);
        selectedButton.button.lineStyle(4, classConfig.baseColor, 1);
        selectedButton.button.drawRoundedRect(0, 0, selectedButton.cardWidth, selectedButton.cardHeight, 15);
        selectedButton.button.endFill();
        
        // Add selection glow effect
        selectedButton.button.beginFill(classConfig.baseColor, 0.15);
        selectedButton.button.drawRoundedRect(-4, -4, selectedButton.cardWidth + 8, selectedButton.cardHeight + 8, 18);
        selectedButton.button.endFill();
        
        // Redraw the main card on top
        selectedButton.button.beginFill(0x333333, 0.95);
        selectedButton.button.lineStyle(4, classConfig.baseColor, 1);
        selectedButton.button.drawRoundedRect(0, 0, selectedButton.cardWidth, selectedButton.cardHeight, 15);
        selectedButton.button.endFill();
        
        // Top accent line - brighter for selected
        selectedButton.button.beginFill(classConfig.baseColor, 0.8);
        selectedButton.button.drawRoundedRect(0, 0, selectedButton.cardWidth, 4, 2);
        selectedButton.button.endFill();
        
        // Slight scale increase for selected card
        selectedButton.container.scale.set(1.08);
        
        // Set selected class
        this.selectedClass = className;
        
        // Enable and update start button
        this.startButton.alpha = 1;
        this.startButton.eventMode = 'static';
        this.startButton.cursor = 'pointer';
        this.drawStartButton(false, false);
    }

    /**
     * Resize the UI to fit the current window dimensions
     */
    public resize(): void {
        // Update background to fill screen
        this.background.clear();
        this.background.beginFill(0x0a0a0a, 0.95);
        this.background.drawRect(0, 0, window.innerWidth, window.innerHeight);
        this.background.endFill();

        // Reposition title and subtitle
        this.title.position.set(window.innerWidth / 2, 40);
        this.subtitle.position.set(window.innerWidth / 2, 95);

        // Recalculate class button positions
        const cardWidth = 200;
        const cardSpacing = 25;
        const totalWidth = (cardWidth * 4) + (cardSpacing * 3);
        const startX = (window.innerWidth - totalWidth) / 2;
        const startY = window.innerHeight / 2 - 100;

        // Reposition each class button
        this.classButtons.forEach((classButton, index) => {
            const x = startX + (index * (cardWidth + cardSpacing));
            classButton.container.position.set(x, startY);
        });

        // Reposition start button (moved up with the cards)
        const buttonWidth = 280;
        const cardHeight = 260;
        const cardsStartY = window.innerHeight / 2 - 250; // Same as cards
        const yPosition = cardsStartY + cardHeight + 50; // Same relative position
        this.startButton.position.set(window.innerWidth / 2 - buttonWidth / 2, yPosition);
    }
}