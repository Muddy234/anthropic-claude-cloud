// === js/ui/journal-ui.js ===
// THE BLEEDING EARTH: Journal/Codex UI for lore collection

// ============================================================================
// JOURNAL UI
// ============================================================================

const JournalUI = {

    // State
    active: false,
    currentTab: 'lore',  // 'lore', 'quests', 'bestiary'
    selectedIndex: 0,
    scrollOffset: 0,
    viewingEntry: null,

    // Layout
    width: 700,
    height: 500,
    padding: 20,

    // Tabs
    tabs: [
        { id: 'lore', name: 'Lore', icon: 'scroll' },
        { id: 'quests', name: 'Quests', icon: 'quest' },
        { id: 'world', name: 'World State', icon: 'globe' }
    ],

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    open() {
        this.active = true;
        this.selectedIndex = 0;
        this.scrollOffset = 0;
        this.viewingEntry = null;

        // Store the state we're coming from
        if (game.state !== 'journal') {
            game.previousState = game.state;
        }
        game.state = 'journal';

        // Clear sidebar overlay state when journal opens
        if (typeof sidebarState !== 'undefined') {
            sidebarState.activeOverlay = 'journal';
        }

        console.log('[JournalUI] Opened');
    },

    close() {
        this.active = false;
        this.viewingEntry = null;

        // Return to previous state (village or playing)
        if (game.previousState === 'village') {
            game.state = 'village';
        } else {
            game.state = 'playing';
        }

        // Clear sidebar overlay state
        if (typeof sidebarState !== 'undefined') {
            sidebarState.activeOverlay = null;
        }

        console.log('[JournalUI] Closed');
    },

    toggle() {
        if (this.active) {
            this.close();
        } else {
            this.open();
        }
    },

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    handleInput(key) {
        if (!this.active) return;

        // Close on Escape or J
        if (key === 'Escape' || key === 'j' || key === 'J') {
            if (this.viewingEntry) {
                this.viewingEntry = null;  // Back to list
            } else {
                this.close();
            }
            return;
        }

        // If viewing an entry, only allow close
        if (this.viewingEntry) {
            if (key === 'Enter' || key === ' ') {
                this.viewingEntry = null;
            }
            return;
        }

        // Tab switching (left/right or Q/E)
        if (key === 'ArrowLeft' || key === 'q' || key === 'Q') {
            this._previousTab();
        } else if (key === 'ArrowRight' || key === 'e' || key === 'E') {
            this._nextTab();
        }

        // List navigation (up/down or W/S)
        else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
            this._selectPrevious();
        } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
            this._selectNext();
        }

        // Open entry
        else if (key === 'Enter' || key === ' ') {
            this._openSelected();
        }
    },

    _previousTab() {
        const currentIndex = this.tabs.findIndex(t => t.id === this.currentTab);
        const newIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
        this.currentTab = this.tabs[newIndex].id;
        this.selectedIndex = 0;
        this.scrollOffset = 0;
    },

    _nextTab() {
        const currentIndex = this.tabs.findIndex(t => t.id === this.currentTab);
        const newIndex = (currentIndex + 1) % this.tabs.length;
        this.currentTab = this.tabs[newIndex].id;
        this.selectedIndex = 0;
        this.scrollOffset = 0;
    },

    _selectPrevious() {
        const items = this._getCurrentItems();
        if (items.length === 0) return;

        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this._adjustScroll();
    },

    _selectNext() {
        const items = this._getCurrentItems();
        if (items.length === 0) return;

        this.selectedIndex = Math.min(items.length - 1, this.selectedIndex + 1);
        this._adjustScroll();
    },

    _adjustScroll() {
        const visibleItems = 8;
        if (this.selectedIndex < this.scrollOffset) {
            this.scrollOffset = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollOffset + visibleItems) {
            this.scrollOffset = this.selectedIndex - visibleItems + 1;
        }
    },

    _openSelected() {
        const items = this._getCurrentItems();
        if (items.length === 0 || this.selectedIndex >= items.length) return;

        this.viewingEntry = items[this.selectedIndex];
    },

    _getCurrentItems() {
        switch (this.currentTab) {
            case 'lore':
                return this._getLoreItems();
            case 'quests':
                return this._getQuestItems();
            case 'world':
                return this._getWorldStateItems();
            default:
                return [];
        }
    },

    _getLoreItems() {
        if (typeof getCollectedLore !== 'function') return [];

        const collected = getCollectedLore();
        const uncollected = Object.values(LORE_FRAGMENTS || {})
            .filter(lore => !hasCollectedLore(lore.id))
            .map(lore => ({
                ...lore,
                locked: true,
                title: `??? (Floor ${lore.floor})`
            }));

        return [...collected, ...uncollected];
    },

    _getQuestItems() {
        // Get active and completed quests
        const active = persistentState?.quests?.active || [];
        const completed = persistentState?.quests?.completed || [];

        return [
            ...active.map(q => ({ ...q, status: 'active' })),
            ...completed.map(q => ({ ...q, status: 'completed' }))
        ];
    },

    _getWorldStateItems() {
        const worldState = typeof WorldStateSystem !== 'undefined' ?
            WorldStateSystem.getState() : 1;
        const stateName = WORLD_STATE_NAMES?.[worldState] || 'Unknown';

        const items = [
            {
                id: 'current_state',
                title: `Current: ${stateName}`,
                content: this._getWorldStateDescription(worldState),
                category: 'state'
            }
        ];

        // Add history
        const history = persistentState?.worldStateHistory || [];
        history.forEach((entry, i) => {
            if (i > 0) {  // Skip initial state
                items.push({
                    id: `history_${i}`,
                    title: `${WORLD_STATE_NAMES?.[entry.state] || 'Unknown'}`,
                    content: `Triggered by: ${entry.trigger}\nTime: ${new Date(entry.timestamp).toLocaleString()}`,
                    category: 'history'
                });
            }
        });

        return items;
    },

    _getWorldStateDescription(state) {
        const descriptions = {
            1: 'The village of Oakhaven prospers under the shadow of the Slumbering Peak. The crops grow tall, the air is clear, and the people are content. But the ground grows warmer each year...',
            2: 'Ash falls from the grey sky. The volcano stirs in its sleep. Some villagers have fled, taking their children to safety. The remaining folk speak in hushed tones of old legends.',
            3: 'The earth bleeds fire. Cracks split the streets. The bank has collapsed, burying Grimwald beneath the rubble. The Elders can no longer hide their guilt. The truth must be confronted.',
            4: 'You have descended to the Heart of the World. There is no return until the deed is done. Malphas awaits—not as a god, but as a prisoner. One final mercy to grant.'
        };
        return descriptions[state] || 'Unknown state.';
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    render(ctx) {
        if (!this.active) return;

        const centerX = (canvas.width - this.width) / 2;
        const centerY = (canvas.height - this.height) / 2;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Main panel
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 2;
        ctx.fillRect(centerX, centerY, this.width, this.height);
        ctx.strokeRect(centerX, centerY, this.width, this.height);

        // Title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('JOURNAL', centerX + this.width / 2, centerY + 35);

        // Render tabs
        this._renderTabs(ctx, centerX, centerY + 50);

        // Render content
        if (this.viewingEntry) {
            this._renderEntry(ctx, centerX, centerY + 90);
        } else {
            this._renderList(ctx, centerX, centerY + 90);
        }

        // Controls hint
        ctx.fillStyle = '#666';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        const hint = this.viewingEntry ?
            '[Enter/Space] Back  [J/Esc] Close' :
            '[Q/E] Tab  [W/S] Navigate  [Enter] Read  [J/Esc] Close';
        ctx.fillText(hint, centerX + this.width / 2, centerY + this.height - 15);
    },

    _renderTabs(ctx, x, y) {
        const tabWidth = (this.width - 40) / this.tabs.length;

        this.tabs.forEach((tab, i) => {
            const tabX = x + 20 + i * tabWidth;
            const isActive = tab.id === this.currentTab;

            // Tab background
            ctx.fillStyle = isActive ? '#3a3a5a' : '#2a2a4a';
            ctx.fillRect(tabX, y, tabWidth - 5, 30);

            // Tab text
            ctx.fillStyle = isActive ? '#FFD700' : '#888';
            ctx.font = isActive ? 'bold 14px monospace' : '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(tab.name, tabX + tabWidth / 2 - 2, y + 20);
        });
    },

    _renderList(ctx, x, y) {
        const items = this._getCurrentItems();
        const listX = x + this.padding;
        const listY = y + 10;
        const itemHeight = 45;
        const visibleItems = 8;

        if (items.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('No entries yet.', x + this.width / 2, listY + 100);
            return;
        }

        // Progress indicator for lore
        if (this.currentTab === 'lore' && typeof getLoreProgress === 'function') {
            const progress = getLoreProgress();
            ctx.fillStyle = '#888';
            ctx.font = '12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${progress.collected}/${progress.total} collected`, x + this.width - 25, y);
        }

        // Render visible items
        for (let i = 0; i < visibleItems && i + this.scrollOffset < items.length; i++) {
            const item = items[i + this.scrollOffset];
            const itemY = listY + i * itemHeight;
            const isSelected = i + this.scrollOffset === this.selectedIndex;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a5a';
                ctx.fillRect(listX - 5, itemY, this.width - 35, itemHeight - 5);
            }

            // Item title
            ctx.fillStyle = item.locked ? '#555' : (isSelected ? '#FFD700' : '#CCC');
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(item.title || item.name || 'Unknown', listX + 20, itemY + 18);

            // Category/subtitle
            const subtitle = item.locked ? 'Not yet discovered' :
                (item.category ? LORE_CATEGORIES?.[item.category]?.name || item.category : '');
            ctx.fillStyle = '#666';
            ctx.font = '11px monospace';
            ctx.fillText(subtitle, listX + 20, itemY + 34);

            // Selection arrow
            if (isSelected) {
                ctx.fillStyle = '#FFD700';
                ctx.fillText('>', listX + 5, itemY + 18);
            }
        }

        // Scroll indicators
        if (this.scrollOffset > 0) {
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('▲ More above', x + this.width / 2, listY - 5);
        }
        if (this.scrollOffset + visibleItems < items.length) {
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('▼ More below', x + this.width / 2, listY + visibleItems * itemHeight + 5);
        }
    },

    _renderEntry(ctx, x, y) {
        const entry = this.viewingEntry;
        if (!entry) return;

        const contentX = x + this.padding;
        const contentY = y + 10;
        const contentWidth = this.width - this.padding * 2;

        // Title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(entry.title || entry.name, contentX, contentY + 20);

        // Category
        if (entry.category) {
            const cat = LORE_CATEGORIES?.[entry.category];
            ctx.fillStyle = cat?.color || '#888';
            ctx.font = '12px monospace';
            ctx.fillText(cat?.name || entry.category, contentX, contentY + 40);
        }

        // Separator
        ctx.strokeStyle = '#4a4a6a';
        ctx.beginPath();
        ctx.moveTo(contentX, contentY + 50);
        ctx.lineTo(contentX + contentWidth, contentY + 50);
        ctx.stroke();

        // Content
        ctx.fillStyle = '#CCC';
        ctx.font = '13px monospace';
        const content = entry.content || entry.description || 'No content.';
        this._renderWrappedText(ctx, content, contentX, contentY + 70, contentWidth, 18);

        // Hint (if available)
        if (entry.hint) {
            ctx.fillStyle = '#888';
            ctx.font = 'italic 12px monospace';
            ctx.fillText(`"${entry.hint}"`, contentX, contentY + 320);
        }
    },

    _renderWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        const lines = text.split('\n');
        let currentY = y;

        lines.forEach(line => {
            const words = line.trim().split(' ');
            let currentLine = '';

            words.forEach(word => {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && currentLine) {
                    ctx.fillText(currentLine, x, currentY);
                    currentLine = word;
                    currentY += lineHeight;
                } else {
                    currentLine = testLine;
                }
            });

            if (currentLine) {
                ctx.fillText(currentLine, x, currentY);
                currentY += lineHeight;
            }

            // Extra spacing for blank lines
            if (line.trim() === '') {
                currentY += lineHeight / 2;
            }
        });
    }
};

// ============================================================================
// KEYBOARD LISTENER
// ============================================================================

// Open journal with 'J' key
window.addEventListener('keydown', (e) => {
    if (e.key === 'j' || e.key === 'J') {
        // Allow journal in village, dungeon (playing), or when already in journal
        if (game.state === 'village' || game.state === 'playing' || game.state === 'journal') {
            JournalUI.toggle();
            e.preventDefault();
        }
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.JournalUI = JournalUI;

console.log('[JournalUI] Journal system loaded (Press J in village)');
