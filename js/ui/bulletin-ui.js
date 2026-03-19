// === js/ui/bulletin-ui.js ===
// VILLAGE LIFE UPDATE: Bulletin board interface for bounties, rumors, and notices

// ============================================================================
// BULLETIN UI
// ============================================================================

const BulletinUI = {

    // State
    active: false,
    selectedTab: 0,      // 0 = Bounties, 1 = Rumors, 2 = Notices
    selectedIndex: 0,
    focusArea: 'list',   // 'tabs', 'list', 'buttons'
    message: '',
    messageType: '',
    messageTimeout: null,

    // Data
    bounties: [],        // Available bounties for this visit
    activeBounties: [],  // Player's accepted bounties
    rumors: [],          // Current rumors
    notices: [],         // Current notices

    // Layout
    PANEL_WIDTH: 850,
    PANEL_HEIGHT: 580,
    ITEMS_PER_PAGE: 6,

    // Tabs
    TABS: ['BOUNTIES', 'RUMORS', 'NOTICES'],

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open the bulletin board UI
     */
    open() {
        this.active = true;
        this.selectedTab = 0;
        this.selectedIndex = 0;
        this.focusArea = 'list';
        this.message = '';

        // Generate content if not already generated this visit
        this._refreshContent();

        game.state = GAME_STATES ? GAME_STATES.BULLETIN : 'bulletin';
        console.log('[BulletinUI] Opened');
    },

    /**
     * Close the bulletin board UI
     */
    close() {
        this.active = false;
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
        game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        console.log('[BulletinUI] Closed');
    },

    /**
     * Refresh bulletin content
     * @private
     */
    _refreshContent() {
        // Check if we need to regenerate bounties
        const lastVisit = persistentState?.bulletin?.lastVisit || 0;
        const currentRun = persistentState?.stats?.totalRuns || 0;

        if (lastVisit !== currentRun || this.bounties.length === 0) {
            // Generate new bounties for this visit
            const playerStats = {
                maxFloorReached: persistentState?.stats?.maxFloorReached || 1,
                totalRuns: currentRun
            };

            this.bounties = typeof generateBounties === 'function' ?
                generateBounties(3, playerStats) : [];

            // Get active bounties from persistent state
            this.activeBounties = persistentState?.bounties?.active || [];

            // Generate rumors
            const heardRumors = persistentState?.rumorsHeard || [];
            this.rumors = [];
            for (let i = 0; i < 3; i++) {
                const rumor = typeof getRandomRumor === 'function' ?
                    getRandomRumor(heardRumors) : null;
                if (rumor && !this.rumors.find(r => r.id === rumor.id)) {
                    this.rumors.push(rumor);
                }
            }

            // Generate notices
            this.notices = typeof getRandomNotices === 'function' ?
                getRandomNotices(3) : [];

            // Update last visit
            if (!persistentState.bulletin) {
                persistentState.bulletin = {};
            }
            persistentState.bulletin.lastVisit = currentRun;

            console.log('[BulletinUI] Generated fresh content');
        }
    },

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    /**
     * Handle keyboard input
     * @param {string} key
     * @param {boolean} shiftKey
     */
    handleInput(key, shiftKey = false) {
        if (!this.active) return;

        // Escape always closes
        if (key === 'Escape') {
            this.close();
            return;
        }

        // Tab cycling through focus areas
        if (key === 'Tab') {
            if (shiftKey) {
                if (this.focusArea === 'buttons') {
                    this.focusArea = 'list';
                } else if (this.focusArea === 'list') {
                    this.focusArea = 'tabs';
                } else {
                    this.focusArea = 'buttons';
                }
            } else {
                if (this.focusArea === 'tabs') {
                    this.focusArea = 'list';
                } else if (this.focusArea === 'list') {
                    this.focusArea = 'buttons';
                } else {
                    this.focusArea = 'tabs';
                }
            }
            return;
        }

        // Handle input based on focus area
        switch (this.focusArea) {
            case 'tabs':
                this._handleTabsInput(key);
                break;
            case 'list':
                this._handleListInput(key);
                break;
            case 'buttons':
                this._handleButtonsInput(key);
                break;
        }
    },

    /**
     * Handle input when tabs are focused
     * @private
     */
    _handleTabsInput(key) {
        switch (key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.selectedTab > 0) {
                    this.selectedTab--;
                    this.selectedIndex = 0;
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.selectedTab < this.TABS.length - 1) {
                    this.selectedTab++;
                    this.selectedIndex = 0;
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
            case 'Enter':
            case ' ':
                this.focusArea = 'list';
                break;
        }
    },

    /**
     * Handle input when list is focused
     * @private
     */
    _handleListInput(key) {
        const items = this._getCurrentItems();
        const maxIndex = Math.max(0, items.length - 1);

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (this.selectedIndex > 0) {
                    this.selectedIndex--;
                } else {
                    this.focusArea = 'tabs';
                }
                break;

            case 'ArrowDown':
            case 's':
            case 'S':
                if (this.selectedIndex < maxIndex) {
                    this.selectedIndex++;
                } else {
                    this.focusArea = 'buttons';
                }
                break;

            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.selectedTab > 0) {
                    this.selectedTab--;
                    this.selectedIndex = 0;
                }
                break;

            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.selectedTab < this.TABS.length - 1) {
                    this.selectedTab++;
                    this.selectedIndex = 0;
                }
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                this._interactWithSelected();
                break;
        }
    },

    /**
     * Handle input when buttons are focused
     * @private
     */
    _handleButtonsInput(key) {
        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.focusArea = 'list';
                break;
            case 'Enter':
            case ' ':
                this.close();
                break;
        }
    },

    /**
     * Get items for current tab
     * @returns {Array}
     * @private
     */
    _getCurrentItems() {
        switch (this.selectedTab) {
            case 0: return this.bounties;
            case 1: return this.rumors;
            case 2: return this.notices;
            default: return [];
        }
    },

    /**
     * Interact with selected item
     * @private
     */
    _interactWithSelected() {
        const items = this._getCurrentItems();
        if (this.selectedIndex >= items.length) return;

        const item = items[this.selectedIndex];

        switch (this.selectedTab) {
            case 0: // Bounties
                this._acceptBounty(item);
                break;
            case 1: // Rumors
                this._readRumor(item);
                break;
            case 2: // Notices
                // Notices are just flavor text, no interaction needed
                this._showMessage('Interesting notice...', 'info');
                break;
        }
    },

    /**
     * Accept a bounty
     * @param {Object} bounty
     * @private
     */
    _acceptBounty(bounty) {
        // Check if already accepted
        if (this.activeBounties.find(b => b.id === bounty.id)) {
            this._showMessage('Already accepted this bounty!', 'warning');
            return;
        }

        // Check max active bounties (3)
        if (this.activeBounties.length >= 3) {
            this._showMessage('Max 3 active bounties!', 'error');
            return;
        }

        // Accept the bounty
        const activeBounty = {
            ...bounty,
            progress: 0,
            acceptedAt: Date.now()
        };

        this.activeBounties.push(activeBounty);

        // Save to persistent state
        if (!persistentState.bounties) {
            persistentState.bounties = { active: [], completed: [] };
        }
        persistentState.bounties.active = this.activeBounties;

        // Remove from available bounties
        const index = this.bounties.findIndex(b => b.id === bounty.id);
        if (index >= 0) {
            this.bounties.splice(index, 1);
        }

        this._showMessage(`Accepted: ${bounty.name}`, 'success');
        console.log(`[BulletinUI] Accepted bounty: ${bounty.id}`);

        // Adjust selection
        if (this.selectedIndex >= this.bounties.length) {
            this.selectedIndex = Math.max(0, this.bounties.length - 1);
        }
    },

    /**
     * Read a rumor (marks as heard)
     * @param {Object} rumor
     * @private
     */
    _readRumor(rumor) {
        // Track that this rumor has been heard
        if (!persistentState.rumorsHeard) {
            persistentState.rumorsHeard = [];
        }
        if (!persistentState.rumorsHeard.includes(rumor.id)) {
            persistentState.rumorsHeard.push(rumor.id);
        }

        this._showMessage('Rumor noted...', 'info');
    },

    /**
     * Show a message
     * @param {string} text
     * @param {string} type
     * @private
     */
    _showMessage(text, type = 'info') {
        this.message = text;
        this.messageType = type;

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        this.messageTimeout = setTimeout(() => {
            this.message = '';
            this.messageType = '';
        }, 2000);
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the bulletin board UI
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate panel position
        const panelX = (canvas.width - this.PANEL_WIDTH) / 2;
        const panelY = (canvas.height - this.PANEL_HEIGHT) / 2;

        // Draw panel background
        this._renderPanel(ctx, panelX, panelY);

        // Draw tabs
        this._renderTabs(ctx, panelX, panelY);

        // Draw content
        this._renderContent(ctx, panelX, panelY);

        // Draw active bounties sidebar
        this._renderActiveBounties(ctx, panelX, panelY);

        // Draw message
        if (this.message) {
            this._renderMessage(ctx, panelX, panelY);
        }

        // Draw close button
        this._renderCloseButton(ctx, panelX, panelY);

        // Draw controls hint
        this._renderControls(ctx, panelX, panelY);
    },

    /**
     * Render panel background - Wooden Board Style
     * @private
     */
    _renderPanel(ctx, x, y) {
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
        const frameGold = colors.frameGold || '#b8860b';
        const frameGoldBright = colors.frameGoldBright || '#daa520';

        ctx.save();

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 6;

        // Wooden board background
        const bgGrad = ctx.createLinearGradient(x, y, x, y + this.PANEL_HEIGHT);
        bgGrad.addColorStop(0, '#4a3728');
        bgGrad.addColorStop(0.3, '#3a2a1f');
        bgGrad.addColorStop(0.7, '#3a2a1f');
        bgGrad.addColorStop(1, '#2a1a10');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Wood grain texture (simple lines)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let gy = y + 10; gy < y + this.PANEL_HEIGHT - 10; gy += 20) {
            ctx.beginPath();
            ctx.moveTo(x + 10, gy + Math.random() * 5);
            ctx.lineTo(x + this.PANEL_WIDTH - 10, gy + Math.random() * 5);
            ctx.stroke();
        }

        // Use temple frame if available
        if (typeof drawTempleFrame === 'function') {
            drawTempleFrame(ctx, x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT, {
                frameColor: '#5a4a3a',
                frameColorDark: '#3a2a1a',
                cornerSize: 20,
                frameWidth: 4,
                pattern: false
            });
        } else {
            // Simple border
            ctx.strokeStyle = '#5a4a3a';
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);
        }

        // Nails/tacks in corners
        const nailPositions = [
            [x + 15, y + 15],
            [x + this.PANEL_WIDTH - 15, y + 15],
            [x + 15, y + this.PANEL_HEIGHT - 15],
            [x + this.PANEL_WIDTH - 15, y + this.PANEL_HEIGHT - 15]
        ];
        nailPositions.forEach(([nx, ny]) => {
            ctx.fillStyle = '#8a8a8a';
            ctx.beginPath();
            ctx.arc(nx, ny, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#aaaaaa';
            ctx.beginPath();
            ctx.arc(nx - 1, ny - 1, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Title
        ctx.font = 'bold 24px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = colors.boneWhite || '#f5f5dc';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText('VILLAGE BULLETIN BOARD', x + this.PANEL_WIDTH / 2, y + 35);
        ctx.shadowBlur = 0;

        // Decorative line
        ctx.strokeStyle = frameGold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + this.PANEL_WIDTH / 2 - 120, y + 45);
        ctx.lineTo(x + this.PANEL_WIDTH / 2 + 120, y + 45);
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Render tabs
     * @private
     */
    _renderTabs(ctx, panelX, panelY) {
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
        const frameGold = colors.frameGold || '#b8860b';
        const tabWidth = 130;
        const tabHeight = 35;
        const startX = panelX + 20;
        const tabY = panelY + 55;
        const tabsFocused = this.focusArea === 'tabs';

        this.TABS.forEach((tab, index) => {
            const tabX = startX + index * (tabWidth + 10);
            const isSelected = index === this.selectedTab;
            const isFocused = tabsFocused && isSelected;

            // Parchment tab style
            const tabGrad = ctx.createLinearGradient(tabX, tabY, tabX, tabY + tabHeight);
            if (isSelected) {
                tabGrad.addColorStop(0, '#e8dcc8');
                tabGrad.addColorStop(1, '#d4c8b0');
            } else {
                tabGrad.addColorStop(0, '#c8bca8');
                tabGrad.addColorStop(1, '#b0a490');
            }
            ctx.fillStyle = tabGrad;
            ctx.fillRect(tabX, tabY, tabWidth, tabHeight);

            // Tab border
            ctx.strokeStyle = isFocused ? '#ffffff' : (isSelected ? frameGold : '#8a7a6a');
            ctx.lineWidth = isFocused ? 3 : 2;
            ctx.strokeRect(tabX, tabY, tabWidth, tabHeight);

            // Tab text
            ctx.font = isSelected ? 'bold 13px serif' : '13px serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = isSelected ? '#2a1a10' : '#5a4a3a';
            ctx.fillText(tab, tabX + tabWidth / 2, tabY + 23);

            // Item count
            const items = index === 0 ? this.bounties :
                         index === 1 ? this.rumors : this.notices;
            ctx.font = '10px monospace';
            ctx.fillStyle = isSelected ? '#5a4a3a' : '#8a7a6a';
            ctx.fillText(`(${items.length})`, tabX + tabWidth / 2, tabY + tabHeight + 12);
        });

        // Active bounties count
        ctx.font = '12px serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = colors.gold || '#c9a227';
        ctx.fillText(`Active Bounties: ${this.activeBounties.length}/3`,
            panelX + this.PANEL_WIDTH - 30, tabY + 20);
    },

    /**
     * Render main content area
     * @private
     */
    _renderContent(ctx, panelX, panelY) {
        const items = this._getCurrentItems();
        const listX = panelX + 20;
        const listY = panelY + 105;
        const listWidth = 550;
        const itemHeight = 70;
        const listFocused = this.focusArea === 'list';

        // Content area background (parchment)
        ctx.fillStyle = '#f5f0e0';
        ctx.fillRect(listX, listY, listWidth, this.ITEMS_PER_PAGE * itemHeight + 10);

        // Border
        ctx.strokeStyle = listFocused ? '#b8860b' : '#8a7a6a';
        ctx.lineWidth = listFocused ? 2 : 1;
        ctx.strokeRect(listX, listY, listWidth, this.ITEMS_PER_PAGE * itemHeight + 10);

        if (items.length === 0) {
            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#8a7a6a';
            const emptyText = this.selectedTab === 0 ? 'No bounties available' :
                             this.selectedTab === 1 ? 'No rumors today' : 'No notices posted';
            ctx.fillText(emptyText, listX + listWidth / 2, listY + 100);
            return;
        }

        // Render items
        items.forEach((item, idx) => {
            if (idx >= this.ITEMS_PER_PAGE) return;

            const itemY = listY + 5 + idx * itemHeight;
            const isSelected = idx === this.selectedIndex && listFocused;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = 'rgba(184, 134, 11, 0.2)';
                ctx.fillRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);
                ctx.strokeStyle = '#b8860b';
                ctx.lineWidth = 2;
                ctx.strokeRect(listX + 5, itemY, listWidth - 10, itemHeight - 5);
            }

            // Render based on tab
            switch (this.selectedTab) {
                case 0:
                    this._renderBountyItem(ctx, item, listX + 10, itemY, listWidth - 20, isSelected);
                    break;
                case 1:
                    this._renderRumorItem(ctx, item, listX + 10, itemY, listWidth - 20, isSelected);
                    break;
                case 2:
                    this._renderNoticeItem(ctx, item, listX + 10, itemY, listWidth - 20, isSelected);
                    break;
            }
        });
    },

    /**
     * Render a bounty item
     * @private
     */
    _renderBountyItem(ctx, bounty, x, y, width, isSelected) {
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};

        // Tier colors
        const tierColors = {
            common: '#5a5a5a',
            uncommon: '#2e8b57',
            rare: '#4169e1',
            epic: '#9932cc'
        };
        const tierColor = tierColors[bounty.tier] || tierColors.common;

        // Wanted poster style for elite bounties
        if (bounty.isWanted) {
            ctx.fillStyle = '#ffeecc';
            ctx.fillRect(x, y + 2, width, 60);
            ctx.strokeStyle = '#8b0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y + 2, width, 60);
        }

        // Bounty name
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = bounty.isWanted ? '#8b0000' : '#2a1a10';
        ctx.fillText(bounty.name, x + 5, y + 18);

        // Tier indicator
        ctx.fillStyle = tierColor;
        ctx.font = '10px serif';
        ctx.fillText(`[${bounty.tier.toUpperCase()}]`, x + 5, y + 32);

        // Description
        ctx.font = '12px serif';
        ctx.fillStyle = '#5a4a3a';
        const desc = bounty.description.length > 60 ?
            bounty.description.substring(0, 57) + '...' : bounty.description;
        ctx.fillText(desc, x + 5, y + 48);

        // Reward
        ctx.textAlign = 'right';
        ctx.fillStyle = colors.gold || '#c9a227';
        ctx.font = 'bold 14px serif';
        ctx.fillText(`${bounty.reward.gold}g`, x + width - 5, y + 18);

        // Objective summary
        ctx.font = '11px serif';
        ctx.fillStyle = '#6a5a4a';
        let objText = '';
        if (bounty.objective.type === 'kill') {
            objText = `Kill ${bounty.objective.count} ${bounty.objective.target}`;
        } else if (bounty.objective.type === 'collect') {
            objText = `Collect ${bounty.objective.count} ${bounty.objective.target}`;
        } else if (bounty.objective.type === 'reach') {
            objText = `Reach Floor ${bounty.objective.floor}`;
        } else if (bounty.objective.type === 'extract') {
            objText = `Extract from Floor ${bounty.objective.minFloor}+`;
        }
        ctx.fillText(objText, x + width - 5, y + 35);

        // Action hint
        if (isSelected) {
            ctx.fillStyle = '#2e8b57';
            ctx.font = '10px serif';
            ctx.fillText('[Enter] Accept', x + width - 5, y + 55);
        }
    },

    /**
     * Render a rumor item
     * @private
     */
    _renderRumorItem(ctx, rumor, x, y, width, isSelected) {
        // Heard indicator
        const heard = persistentState?.rumorsHeard?.includes(rumor.id);

        // Quote marks
        ctx.font = 'bold 24px serif';
        ctx.fillStyle = heard ? '#aaa' : '#8a7a6a';
        ctx.textAlign = 'left';
        ctx.fillText(String.fromCharCode(8220), x, y + 25);

        // Rumor text (wrap if needed)
        ctx.font = heard ? 'italic 13px serif' : '13px serif';
        ctx.fillStyle = heard ? '#888' : '#3a2a1a';

        const words = rumor.text.split(' ');
        let line = '';
        let lineY = y + 20;
        const maxWidth = width - 30;

        words.forEach(word => {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line, x + 15, lineY);
                line = word + ' ';
                lineY += 16;
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line, x + 15, lineY);

        // Hint type indicator
        if (rumor.hint && !heard) {
            ctx.font = '10px serif';
            ctx.fillStyle = '#4169e1';
            ctx.textAlign = 'right';
            ctx.fillText(`[${rumor.hint.replace('_', ' ')}]`, x + width - 5, y + 55);
        }

        // Read indicator
        if (heard) {
            ctx.font = '10px serif';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'right';
            ctx.fillText('(already heard)', x + width - 5, y + 55);
        }
    },

    /**
     * Render a notice item
     * @private
     */
    _renderNoticeItem(ctx, notice, x, y, width, isSelected) {
        // Notice type colors
        const typeColors = {
            lost: '#6a5acd',
            warning: '#cd853f',
            thanks: '#2e8b57',
            job: '#4169e1',
            event: '#daa520',
            memorial: '#4a4a4a',
            trade: '#8b4513',
            wanted: '#8b0000'
        };
        const typeColor = typeColors[notice.type] || '#5a5a5a';

        // Title with decorative border
        ctx.fillStyle = typeColor;
        ctx.font = 'bold 12px serif';
        ctx.textAlign = 'left';
        ctx.fillText(notice.title, x + 5, y + 18);

        // Underline
        ctx.strokeStyle = typeColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 22);
        ctx.lineTo(x + 80, y + 22);
        ctx.stroke();

        // Notice text
        ctx.font = '12px serif';
        ctx.fillStyle = '#3a2a1a';

        const words = notice.text.split(' ');
        let line = '';
        let lineY = y + 38;
        const maxWidth = width - 15;

        words.forEach(word => {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line, x + 5, lineY);
                line = word + ' ';
                lineY += 14;
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line, x + 5, lineY);
    },

    /**
     * Render active bounties sidebar
     * @private
     */
    _renderActiveBounties(ctx, panelX, panelY) {
        const sideX = panelX + 590;
        const sideY = panelY + 105;
        const sideWidth = 240;
        const sideHeight = 350;

        // Sidebar background
        ctx.fillStyle = '#2a1a10';
        ctx.fillRect(sideX, sideY, sideWidth, sideHeight);

        // Border
        ctx.strokeStyle = '#5a4a3a';
        ctx.lineWidth = 2;
        ctx.strokeRect(sideX, sideY, sideWidth, sideHeight);

        // Header
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#daa520';
        ctx.fillText('ACTIVE BOUNTIES', sideX + sideWidth / 2, sideY + 20);

        // Divider
        ctx.strokeStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.moveTo(sideX + 10, sideY + 30);
        ctx.lineTo(sideX + sideWidth - 10, sideY + 30);
        ctx.stroke();

        if (this.activeBounties.length === 0) {
            ctx.font = '12px serif';
            ctx.fillStyle = '#8a7a6a';
            ctx.fillText('No active bounties', sideX + sideWidth / 2, sideY + 80);
            ctx.font = '11px serif';
            ctx.fillText('Accept bounties from', sideX + sideWidth / 2, sideY + 100);
            ctx.fillText('the board to track', sideX + sideWidth / 2, sideY + 115);
            ctx.fillText('your progress here.', sideX + sideWidth / 2, sideY + 130);
            return;
        }

        // Render active bounties
        this.activeBounties.forEach((bounty, idx) => {
            const itemY = sideY + 40 + idx * 100;

            // Background
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(sideX + 5, itemY, sideWidth - 10, 90);

            // Name
            ctx.font = 'bold 12px serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#e8dcc8';
            ctx.fillText(bounty.name, sideX + 10, itemY + 18);

            // Progress bar
            const barX = sideX + 10;
            const barY = itemY + 28;
            const barWidth = sideWidth - 30;
            const barHeight = 12;
            const progress = bounty.objective.count ?
                Math.min(1, (bounty.progress || 0) / bounty.objective.count) : 0;

            // Bar background
            ctx.fillStyle = '#1a0a00';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Bar fill
            if (progress > 0) {
                const fillGrad = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
                fillGrad.addColorStop(0, '#4a9a4a');
                fillGrad.addColorStop(1, '#2a6a2a');
                ctx.fillStyle = fillGrad;
                ctx.fillRect(barX, barY, barWidth * progress, barHeight);
            }

            // Bar border
            ctx.strokeStyle = '#5a4a3a';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            // Progress text
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            const progText = bounty.objective.count ?
                `${bounty.progress || 0}/${bounty.objective.count}` : '0%';
            ctx.fillText(progText, barX + barWidth / 2, barY + 10);

            // Objective description
            ctx.font = '11px serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#aaa';
            let objText = '';
            if (bounty.objective.type === 'kill') {
                objText = `Kill ${bounty.objective.target}`;
            } else if (bounty.objective.type === 'collect') {
                objText = `Collect ${bounty.objective.target}`;
            } else if (bounty.objective.type === 'reach') {
                objText = `Reach Floor ${bounty.objective.floor}`;
            }
            ctx.fillText(objText, sideX + 10, itemY + 55);

            // Reward
            ctx.textAlign = 'right';
            ctx.fillStyle = '#daa520';
            ctx.font = 'bold 11px serif';
            ctx.fillText(`${bounty.reward.gold}g`, sideX + sideWidth - 15, itemY + 55);

            // Complete status
            if (progress >= 1) {
                ctx.font = 'bold 11px serif';
                ctx.fillStyle = '#4a9a4a';
                ctx.textAlign = 'center';
                ctx.fillText('COMPLETE - Return to claim!', sideX + sideWidth / 2, itemY + 75);
            }
        });
    },

    /**
     * Render message
     * @private
     */
    _renderMessage(ctx, panelX, panelY) {
        const msgY = panelY + this.PANEL_HEIGHT - 55;

        const colors = {
            success: '#2e8b57',
            error: '#cd5c5c',
            warning: '#daa520',
            info: '#4682b4'
        };

        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = colors[this.messageType] || colors.info;
        ctx.fillText(this.message, panelX + this.PANEL_WIDTH / 2, msgY);
    },

    /**
     * Render close button
     * @private
     */
    _renderCloseButton(ctx, panelX, panelY) {
        const btnX = panelX + this.PANEL_WIDTH - 120;
        const btnY = panelY + this.PANEL_HEIGHT - 50;
        const btnW = 100;
        const btnH = 35;
        const isFocused = this.focusArea === 'buttons';

        if (typeof drawStoneButton === 'function') {
            drawStoneButton(ctx, btnX, btnY, btnW, btnH, {
                text: 'CLOSE',
                isHovered: isFocused,
                isPressed: false
            });
        } else {
            // Simple button
            ctx.fillStyle = isFocused ? '#5a4a3a' : '#3a2a1a';
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.strokeStyle = isFocused ? '#daa520' : '#5a4a3a';
            ctx.lineWidth = 2;
            ctx.strokeRect(btnX, btnY, btnW, btnH);

            ctx.font = 'bold 14px serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = isFocused ? '#daa520' : '#aaa';
            ctx.fillText('CLOSE', btnX + btnW / 2, btnY + 23);
        }
    },

    /**
     * Render controls hint
     * @private
     */
    _renderControls(ctx, panelX, panelY) {
        const controlsY = panelY + this.PANEL_HEIGHT - 18;

        ctx.font = '11px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8a7a6a';

        ctx.fillText(
            String.fromCharCode(8593) + String.fromCharCode(8595) + ' Navigate | ' +
            String.fromCharCode(8592) + String.fromCharCode(8594) + ' Switch Tab | ' +
            '[Enter] Accept/Read | [Tab] Focus | [ESC] Close',
            panelX + this.PANEL_WIDTH / 2,
            controlsY
        );
    }
};

// ============================================================================
// KEYBOARD HOOK
// ============================================================================

window.addEventListener('keydown', (e) => {
    if (game.state === 'bulletin' || game.state === GAME_STATES?.BULLETIN) {
        if (e.key === 'Tab') {
            e.preventDefault();
        }
        BulletinUI.handleInput(e.key, e.shiftKey);
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.BulletinUI = BulletinUI;

console.log('[BulletinUI] Bulletin board UI loaded');
