// === js/ui/loadout-ui.js ===
// SURVIVAL EXTRACTION UPDATE: Pre-run loadout selection interface

// ============================================================================
// LOADOUT UI
// ============================================================================

const LoadoutUI = {

    // State
    active: false,
    currentSection: 0,  // 0=basic, 1=weapons, 2=armor, 3=consumables, 4=confirm
    selectedIndex: 0,
    startingFloor: 1,

    // Layout
    PANEL_WIDTH: 1000,
    PANEL_HEIGHT: 650,

    // Sections (BASIC first for easy access to starter gear)
    SECTIONS: ['BASIC', 'WEAPON', 'ARMOR', 'CONSUMABLES', 'START'],

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open the loadout UI
     */
    open() {
        this.active = true;
        this.currentSection = 0;
        this.selectedIndex = 0;
        this.startingFloor = 1;

        // Reset loadout system
        if (typeof LoadoutSystem !== 'undefined') {
            LoadoutSystem.reset();
        }

        game.state = GAME_STATES ? GAME_STATES.LOADOUT : 'loadout';
        console.log('[LoadoutUI] Opened');
    },

    /**
     * Close the loadout UI
     */
    close() {
        this.active = false;
        game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        console.log('[LoadoutUI] Closed');
    },

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    /**
     * Handle keyboard input
     * @param {string} key
     */
    handleInput(key) {
        if (!this.active) return;

        const items = this._getCurrentSectionItems();
        const isStartSection = this.currentSection === 4;  // START is now index 4
        const isBasicSection = this.currentSection === 0;  // BASIC is index 0

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (isStartSection) {
                    this._adjustStartingFloor(1);
                } else if (!isBasicSection) {
                    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                }
                break;

            case 'ArrowDown':
            case 's':
            case 'S':
                if (isStartSection) {
                    this._adjustStartingFloor(-1);
                } else if (!isBasicSection) {
                    this.selectedIndex = Math.min(items.length - 1, this.selectedIndex + 1);
                }
                break;

            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.currentSection = Math.max(0, this.currentSection - 1);
                this.selectedIndex = 0;
                break;

            case 'ArrowRight':
            case 'd':
            case 'D':
                this.currentSection = Math.min(4, this.currentSection + 1);
                this.selectedIndex = 0;
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                if (isBasicSection) {
                    this._selectBasicLoadout();
                } else if (isStartSection) {
                    this._startRun();
                } else {
                    this._selectItem();
                }
                break;

            case 'Escape':
                this.close();
                break;

            case 'Tab':
                this.currentSection = (this.currentSection + 1) % 5;
                this.selectedIndex = 0;
                break;
        }
    },

    /**
     * Select basic starter loadout
     * @private
     */
    _selectBasicLoadout() {
        if (typeof LoadoutSystem !== 'undefined') {
            LoadoutSystem.selectBasicLoadout();
            console.log('[LoadoutUI] Basic loadout selected');
        }
    },

    /**
     * Get items for current section
     * @returns {Array}
     * @private
     */
    _getCurrentSectionItems() {
        const bankItems = persistentState?.bank?.items || [];

        switch (this.currentSection) {
            case 0:  // Basic - no items list, just a button
                return [];
            case 1:  // Weapons
                return bankItems
                    .map((item, index) => ({ item, index }))
                    .filter(({ item }) => item.type === 'weapon');
            case 2:  // Armor
                return bankItems
                    .map((item, index) => ({ item, index }))
                    .filter(({ item }) => item.type === 'armor');
            case 3:  // Consumables
                return bankItems
                    .map((item, index) => ({ item, index }))
                    .filter(({ item }) => item.type === 'consumable');
            default:
                return [];
        }
    },

    /**
     * Select current item for loadout
     * @private
     */
    _selectItem() {
        const items = this._getCurrentSectionItems();
        if (this.selectedIndex >= items.length) return;

        const { item, index } = items[this.selectedIndex];

        if (!LoadoutSystem) return;

        // Clear basic loadout when selecting custom items
        if (LoadoutSystem.isBasicLoadout()) {
            LoadoutSystem.reset();
        }

        // Check if already selected (toggle off)
        if (LoadoutSystem.isSelected(index)) {
            if (this.currentSection === 1) {
                LoadoutSystem.deselectWeapon();
            } else if (this.currentSection === 2) {
                LoadoutSystem.deselectArmor(item.slot);
            } else if (this.currentSection === 3) {
                LoadoutSystem.removeConsumable(index);
            }
        } else {
            // Select item
            if (this.currentSection === 1) {
                LoadoutSystem.selectWeapon(index);
            } else if (this.currentSection === 2) {
                LoadoutSystem.selectArmor(index);
            } else if (this.currentSection === 3) {
                LoadoutSystem.addConsumable(index, item.count || 1);
            }
        }
    },

    /**
     * Adjust starting floor (shortcuts)
     * @param {number} delta
     * @private
     */
    _adjustStartingFloor(delta) {
        // Get unlocked floors from shortcuts (unlockedFloors is an array of floor numbers)
        const unlockedFloors = persistentState?.shortcuts?.unlockedFloors || [1];

        const currentIdx = unlockedFloors.indexOf(this.startingFloor);
        const newIdx = Math.max(0, Math.min(unlockedFloors.length - 1, currentIdx + delta));
        this.startingFloor = unlockedFloors[newIdx] || 1;
    },

    /**
     * Start the run with selected loadout
     * @private
     */
    _startRun() {
        console.log(`[LoadoutUI] Starting run from floor ${this.startingFloor}`);

        // Get loadout from LoadoutSystem
        const loadout = LoadoutSystem ? LoadoutSystem.getLoadout() : null;

        // Confirm loadout (removes items from bank)
        if (LoadoutSystem) {
            LoadoutSystem.confirmLoadout();
        }

        // Close UI before starting dungeon
        this.active = false;

        // Start dungeon run with loadout
        if (typeof startDungeonRun === 'function') {
            startDungeonRun({
                startingFloor: this.startingFloor,
                loadout: loadout
            });
        } else {
            console.error('[LoadoutUI] startDungeonRun not found!');
            game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        }

        console.log('[LoadoutUI] Run started!');
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the loadout UI
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate panel position
        const panelX = (canvas.width - this.PANEL_WIDTH) / 2;
        const panelY = (canvas.height - this.PANEL_HEIGHT) / 2;

        // Draw panel
        this._renderPanel(ctx, panelX, panelY);

        // Draw section tabs
        this._renderSectionTabs(ctx, panelX, panelY);

        // Draw current section content
        if (this.currentSection === 0) {
            this._renderBasicSection(ctx, panelX, panelY);
        } else if (this.currentSection >= 1 && this.currentSection <= 3) {
            this._renderItemSection(ctx, panelX, panelY);
        } else {
            this._renderConfirmSection(ctx, panelX, panelY);
        }

        // Draw loadout summary
        this._renderLoadoutSummary(ctx, panelX, panelY);

        // Draw controls
        this._renderControls(ctx, panelX, panelY);
    },

    /**
     * Render panel background
     * @private
     */
    _renderPanel(ctx, x, y) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + 5, y + 5, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Border
        ctx.strokeStyle = '#4682B4';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Title
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4682B4';
        ctx.fillText('EXPEDITION LOADOUT', x + this.PANEL_WIDTH / 2, y + 35);
    },

    /**
     * Render section tabs
     * @private
     */
    _renderSectionTabs(ctx, panelX, panelY) {
        const tabWidth = 100;  // Reduced to fit 5 tabs
        const tabHeight = 35;
        const startX = panelX + 20;
        const tabY = panelY + 50;

        this.SECTIONS.forEach((section, index) => {
            const tabX = startX + index * (tabWidth + 8);
            const isSelected = index === this.currentSection;

            // Highlight BASIC tab with green if selected
            const isBasicTab = index === 0;

            // Tab background
            if (isSelected) {
                const grad = ctx.createLinearGradient(tabX, tabY, tabX, tabY + tabHeight);
                if (isBasicTab) {
                    grad.addColorStop(0, '#2ecc71');
                    grad.addColorStop(1, '#1a8f4e');
                } else {
                    grad.addColorStop(0, '#4682B4');
                    grad.addColorStop(1, '#2F4F4F');
                }
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = '#2a2a4e';
            }
            ctx.fillRect(tabX, tabY, tabWidth, tabHeight);

            // Tab border
            ctx.strokeStyle = isSelected ? (isBasicTab ? '#2ecc71' : '#4682B4') : '#4a4a6a';
            ctx.lineWidth = 2;
            ctx.strokeRect(tabX, tabY, tabWidth, tabHeight);

            // Tab text
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = isSelected ? '#FFF' : '#888';
            ctx.fillText(section, tabX + tabWidth / 2, tabY + 22);
        });
    },

    /**
     * Render basic loadout section
     * @private
     */
    _renderBasicSection(ctx, panelX, panelY) {
        const sectionX = panelX + 30;
        const sectionY = panelY + 100;
        const sectionWidth = 500;

        // Background
        ctx.fillStyle = '#12121a';
        ctx.fillRect(sectionX, sectionY, sectionWidth, 400);
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(sectionX, sectionY, sectionWidth, 400);

        // Title
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4682B4';
        ctx.fillText('STARTER KIT', sectionX + sectionWidth / 2, sectionY + 40);

        // Description
        ctx.font = '14px Arial';
        ctx.fillStyle = '#888';
        ctx.fillText('Free basic equipment for new delvers', sectionX + sectionWidth / 2, sectionY + 70);

        // Show what's included
        const basicLoadout = LoadoutSystem?.BASIC_LOADOUT || {};
        let yOffset = sectionY + 110;

        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Includes:', sectionX + 20, yOffset);
        yOffset += 30;

        // Weapon
        if (basicLoadout.weapon) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`⚔ ${basicLoadout.weapon.name}`, sectionX + 30, yOffset);
            ctx.fillStyle = '#888';
            ctx.fillText(`  - ${basicLoadout.weapon.description}`, sectionX + 30, yOffset + 18);
            yOffset += 50;
        }

        // Consumables
        if (basicLoadout.consumables && basicLoadout.consumables.length > 0) {
            basicLoadout.consumables.forEach(cons => {
                ctx.font = '14px Arial';
                ctx.fillStyle = '#2ecc71';
                ctx.fillText(`✚ ${cons.name} x${cons.count || 1}`, sectionX + 30, yOffset);
                ctx.fillStyle = '#888';
                ctx.fillText(`  - ${cons.description}`, sectionX + 30, yOffset + 18);
                yOffset += 50;
            });
        }

        // Select button
        const buttonX = sectionX + sectionWidth / 2 - 100;
        const buttonY = sectionY + 300;
        const buttonW = 200;
        const buttonH = 50;
        const isSelected = LoadoutSystem?.isBasicLoadout?.();

        // Button glow if selected
        if (isSelected) {
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 15;
        }

        ctx.fillStyle = isSelected ? '#2ecc71' : '#4682B4';
        ctx.fillRect(buttonX, buttonY, buttonW, buttonH);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonW, buttonH);

        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.fillText(isSelected ? '✓ SELECTED' : 'SELECT BASIC KIT', buttonX + buttonW / 2, buttonY + 32);

        // Hint
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Press [E] or [Enter] to select', sectionX + sectionWidth / 2, sectionY + 380);
    },

    /**
     * Render item selection section
     * @private
     */
    _renderItemSection(ctx, panelX, panelY) {
        const items = this._getCurrentSectionItems();
        const listX = panelX + 30;
        const listY = panelY + 100;
        const listWidth = 500;
        const listHeight = 400;
        const itemHeight = 45;

        // List background
        ctx.fillStyle = '#12121a';
        ctx.fillRect(listX, listY, listWidth, listHeight);
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(listX, listY, listWidth, listHeight);

        // Section title (adjusted for new indices: 1=weapon, 2=armor, 3=consumables)
        const titles = ['', 'Select Weapon', 'Select Armor', 'Select Consumables'];
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#888';
        ctx.fillText(titles[this.currentSection] || '', listX + 10, listY - 5);

        if (items.length === 0) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText('No items available', listX + listWidth / 2, listY + 100);
            return;
        }

        // Render items
        const maxVisible = Math.floor(listHeight / itemHeight);
        const startIdx = Math.max(0, this.selectedIndex - Math.floor(maxVisible / 2));
        const visibleItems = items.slice(startIdx, startIdx + maxVisible);

        visibleItems.forEach(({ item, index }, idx) => {
            const realIndex = startIdx + idx;
            const itemY = listY + 5 + idx * itemHeight;
            const isSelected = realIndex === this.selectedIndex;
            const isInLoadout = LoadoutSystem?.isSelected(index);

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a5e';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);
            }

            // Loadout indicator
            if (isInLoadout) {
                ctx.fillStyle = 'rgba(70, 130, 180, 0.3)';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);

                // Checkmark
                ctx.fillStyle = '#4682B4';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('✓', listX + 10, itemY + 28);
            }

            // Item name
            const rarityColors = {
                common: '#FFFFFF',
                uncommon: '#2ecc71',
                rare: '#3498db',
                epic: '#9b59b6',
                legendary: '#FFD700'
            };
            ctx.font = isSelected ? 'bold 15px Arial' : '15px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = rarityColors[item.rarity] || '#FFFFFF';
            ctx.fillText(item.name, listX + 35, itemY + 20);

            // Item details
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            if (item.type === 'weapon') {
                ctx.fillText(`DMG: ${item.damage || item.stats?.damage || '?'}`, listX + 35, itemY + 35);
            } else if (item.type === 'armor') {
                ctx.fillText(`${item.slot || '?'} | DEF: ${item.pDef || 0}`, listX + 35, itemY + 35);
            } else if (item.type === 'consumable') {
                ctx.fillText(`x${item.count || 1}`, listX + 35, itemY + 35);
            }
        });
    },

    /**
     * Render confirmation section
     * @private
     */
    _renderConfirmSection(ctx, panelX, panelY) {
        const sectionX = panelX + 30;
        const sectionY = panelY + 100;

        // Starting floor selection
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFF';
        ctx.fillText('Starting Floor:', sectionX, sectionY + 30);

        // Floor selector
        const floorX = sectionX + 200;
        ctx.fillStyle = '#2a2a4e';
        ctx.fillRect(floorX - 40, sectionY + 10, 120, 30);
        ctx.strokeStyle = '#4682B4';
        ctx.lineWidth = 2;
        ctx.strokeRect(floorX - 40, sectionY + 10, 120, 30);

        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4682B4';
        ctx.fillText(`Floor ${this.startingFloor}`, floorX + 20, sectionY + 32);

        // Arrows
        ctx.fillStyle = '#888';
        ctx.fillText('▲', floorX + 80, sectionY + 32);
        ctx.fillText('▼', floorX - 30, sectionY + 32);

        // Shortcuts info
        const unlockedFloors = persistentState?.shortcuts?.unlockedFloors || [1];
        const unlockedCount = unlockedFloors.length - 1;  // Subtract 1 since floor 1 is always available
        const maxFloors = 10;  // Approximate max floors for display

        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#888';
        ctx.fillText(`Shortcuts unlocked: ${unlockedCount}/${maxFloors}`, sectionX, sectionY + 70);

        // Value at risk
        const valueAtRisk = LoadoutSystem?.getValueAtRisk() || 0;
        ctx.fillStyle = valueAtRisk > 0 ? '#e74c3c' : '#888';
        ctx.fillText(`Value at risk: ${valueAtRisk}g`, sectionX, sectionY + 100);

        // Start button
        const buttonX = sectionX + 100;
        const buttonY = sectionY + 150;
        const buttonW = 200;
        const buttonH = 50;

        // Button glow
        ctx.shadowColor = '#4682B4';
        ctx.shadowBlur = 15;

        ctx.fillStyle = '#4682B4';
        ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonW, buttonH);

        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.fillText('BEGIN DESCENT', buttonX + buttonW / 2, buttonY + 33);
    },

    /**
     * Render loadout summary
     * @private
     */
    _renderLoadoutSummary(ctx, panelX, panelY) {
        const summaryX = panelX + 560;
        const summaryY = panelY + 100;
        const summaryWidth = 400;
        const summaryHeight = 400;

        // Background
        ctx.fillStyle = '#12121a';
        ctx.fillRect(summaryX, summaryY, summaryWidth, summaryHeight);
        ctx.strokeStyle = '#4682B4';
        ctx.lineWidth = 2;
        ctx.strokeRect(summaryX, summaryY, summaryWidth, summaryHeight);

        // Title
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4682B4';
        ctx.fillText('CURRENT LOADOUT', summaryX + summaryWidth / 2, summaryY + 25);

        const loadout = LoadoutSystem?.getLoadout() || { weapon: null, armor: [], consumables: [], gold: 0 };
        let yOffset = summaryY + 50;

        // Weapon
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Weapon:', summaryX + 15, yOffset);
        ctx.fillStyle = loadout.weapon ? '#FFF' : '#666';
        ctx.font = '14px Arial';
        ctx.fillText(loadout.weapon?.name || 'None', summaryX + 100, yOffset);
        yOffset += 30;

        // Armor
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Armor:', summaryX + 15, yOffset);
        yOffset += 5;

        const armorSlots = ['HEAD', 'CHEST', 'LEGS', 'FEET'];
        armorSlots.forEach(slot => {
            const piece = loadout.armor.find(a => a.slot === slot);
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText(`${slot}:`, summaryX + 25, yOffset + 15);
            ctx.fillStyle = piece ? '#FFF' : '#444';
            ctx.fillText(piece?.name || '-', summaryX + 80, yOffset + 15);
            yOffset += 20;
        });
        yOffset += 10;

        // Consumables
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Consumables:', summaryX + 15, yOffset);
        yOffset += 5;

        if (loadout.consumables.length === 0) {
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('None', summaryX + 25, yOffset + 15);
            yOffset += 20;
        } else {
            loadout.consumables.slice(0, 5).forEach(c => {
                ctx.font = '12px Arial';
                ctx.fillStyle = '#FFF';
                ctx.fillText(`${c.name} x${c.count || 1}`, summaryX + 25, yOffset + 15);
                yOffset += 20;
            });
        }
        yOffset += 10;

        // Gold
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Gold:', summaryX + 15, yOffset);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`${loadout.gold}g`, summaryX + 100, yOffset);
    },

    /**
     * Render control hints
     * @private
     */
    _renderControls(ctx, panelX, panelY) {
        const controlsY = panelY + this.PANEL_HEIGHT - 30;

        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';

        ctx.fillText(
            '[Arrows] Navigate | [E/Enter] Select/Confirm | [Tab] Next Section | [ESC] Cancel',
            panelX + this.PANEL_WIDTH / 2,
            controlsY
        );
    }
};

// ============================================================================
// KEYBOARD HOOK
// ============================================================================

window.addEventListener('keydown', (e) => {
    if (game.state === 'loadout' || game.state === GAME_STATES?.LOADOUT) {
        LoadoutUI.handleInput(e.key);
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.LoadoutUI = LoadoutUI;

console.log('[LoadoutUI] Loadout UI loaded');
