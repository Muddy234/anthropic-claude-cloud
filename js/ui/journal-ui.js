// === js/ui/journal-ui.js ===
// THE BLEEDING EARTH: Journal/Codex UI for lore collection

// ============================================================================
// JOURNAL UI
// ============================================================================

const JournalUI = {

    // State
    active: false,
    currentTab: 'lore',  // 'lore', 'bestiary', 'quests', 'world'
    selectedIndex: 0,
    scrollOffset: 0,
    viewingEntry: null,

    // Layout
    width: 700,
    height: 500,
    padding: 20,

    // Tabs - now includes Bestiary
    tabs: [
        { id: 'lore', name: 'Lore', icon: 'scroll' },
        { id: 'bestiary', name: 'Bestiary', icon: 'skull' },
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

        // Tab switching (left/right arrows only - avoids Q/E conflicts)
        if (key === 'ArrowLeft') {
            this._previousTab();
        } else if (key === 'ArrowRight') {
            this._nextTab();
        }

        // List navigation (up/down arrows)
        else if (key === 'ArrowUp') {
            this._selectPrevious();
        } else if (key === 'ArrowDown') {
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
            case 'bestiary':
                return this._getBestiaryItems();
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

    _getBestiaryItems() {
        if (typeof MONSTER_DATA === 'undefined') return [];

        const discovered = persistentState?.monstersDiscovered || [];
        const killCounts = persistentState?.monsterKillCounts || {};

        const items = [];

        // Add discovered monsters first
        discovered.forEach(monsterName => {
            const monster = MONSTER_DATA[monsterName];
            if (monster) {
                items.push({
                    id: monsterName,
                    name: monsterName,
                    title: monsterName,
                    type: 'monster',
                    discovered: true,
                    kills: killCounts[monsterName] || 0,
                    ...monster
                });
            }
        });

        // Add undiscovered monsters as locked entries
        Object.keys(MONSTER_DATA).forEach(monsterName => {
            if (!discovered.includes(monsterName)) {
                const monster = MONSTER_DATA[monsterName];
                items.push({
                    id: monsterName,
                    name: '???',
                    title: '???',
                    type: 'monster',
                    discovered: false,
                    locked: true,
                    element: monster.element
                });
            }
        });

        return items;
    },

    _getQuestItems() {
        const items = [];

        // Story progress header
        const storyProgress = typeof QuestSystem !== 'undefined' ?
            QuestSystem.getStoryProgress() : { completed: 0, total: 4, percentage: 0 };

        items.push({
            id: 'story_header',
            type: 'header',
            title: 'THE DELVER\'S JOURNEY',
            subtitle: `Chapter ${storyProgress.completed + 1} of ${storyProgress.total}`,
            progress: storyProgress.percentage
        });

        // Current active quest (if any)
        if (typeof QuestSystem !== 'undefined' && QuestSystem.hasActiveQuest()) {
            const questFull = QuestSystem.getCurrentQuestFull();
            if (questFull) {
                items.push({
                    id: questFull.id,
                    type: 'active',
                    title: questFull.name,
                    name: questFull.name,
                    description: questFull.description,
                    objectives: questFull.progress?.objectives || questFull.objectives,
                    rewards: questFull.rewards,
                    dialogue: questFull.dialogue,
                    isReadyToTurnIn: questFull.isReadyToTurnIn,
                    questNumber: storyProgress.completed + 1
                });
            }
        } else if (typeof QuestSystem !== 'undefined') {
            // No active quest - show next available
            const nextQuest = QuestSystem.getNextAvailableQuest();
            if (nextQuest) {
                items.push({
                    id: nextQuest.id,
                    type: 'available',
                    title: nextQuest.name,
                    name: nextQuest.name,
                    description: 'Speak to Elder Mira to begin this quest.',
                    teaser: nextQuest.dialogue?.start?.substring(0, 100) + '...',
                    questNumber: storyProgress.completed + 1
                });
            } else if (storyProgress.completed >= storyProgress.total) {
                items.push({
                    id: 'story_complete',
                    type: 'finale',
                    title: 'THE CORE AWAITS',
                    description: 'You have completed all of Elder Mira\'s tasks. The path to the Core is now open. What ancient secrets lie below?'
                });
            }
        }

        // Completed quests (story recap) - in reverse order (most recent first)
        const completedIds = persistentState?.quests?.completed || [];
        if (completedIds.length > 0) {
            items.push({
                id: 'completed_header',
                type: 'section',
                title: 'COMPLETED CHAPTERS'
            });

            // Add completed quests in order
            completedIds.forEach((questId, index) => {
                const questData = typeof getQuest === 'function' ? getQuest(questId) : null;
                if (questData) {
                    items.push({
                        id: questId,
                        type: 'completed',
                        title: questData.name,
                        name: questData.name,
                        description: questData.description,
                        rewards: questData.rewards,
                        dialogue: questData.dialogue,
                        questNumber: index + 1
                    });
                }
            });
        }

        return items;
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
            '[←/→] Tab  [↑/↓] Navigate  [Enter] Read  [J/Esc] Close';
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

        // Special rendering for quests tab
        if (this.currentTab === 'quests') {
            this._renderQuestList(ctx, x, y, items);
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

        // Progress indicator for bestiary
        if (this.currentTab === 'bestiary') {
            const discovered = persistentState?.monstersDiscovered?.length || 0;
            const total = typeof MONSTER_DATA !== 'undefined' ? Object.keys(MONSTER_DATA).length : 0;
            ctx.fillStyle = '#888';
            ctx.font = '12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${discovered}/${total} discovered`, x + this.width - 25, y);
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

            // Category/subtitle - different for monsters
            let subtitle = 'Not yet discovered';
            if (!item.locked) {
                if (item.type === 'monster') {
                    const elementColors = {
                        fire: '#ff6b35', physical: '#aaa', shadow: '#8b5cf6',
                        nature: '#22c55e', earth: '#a3a380', water: '#3b82f6'
                    };
                    ctx.fillStyle = elementColors[item.element] || '#666';
                    subtitle = `${item.element?.toUpperCase() || 'UNKNOWN'} - ${item.kills || 0} kills`;
                } else {
                    subtitle = item.category ? (LORE_CATEGORIES?.[item.category]?.name || item.category) : '';
                    ctx.fillStyle = '#666';
                }
            } else {
                ctx.fillStyle = '#555';
            }
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

    /**
     * Render the quest list with story-focused layout
     * @private
     */
    _renderQuestList(ctx, x, y, items) {
        const listX = x + this.padding;
        let currentY = y + 5;
        const contentWidth = this.width - this.padding * 2;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const isSelected = i === this.selectedIndex;

            switch (item.type) {
                case 'header':
                    // Story header with progress bar
                    ctx.fillStyle = '#FFD700';
                    ctx.font = 'bold 16px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(item.title, x + this.width / 2, currentY + 15);

                    ctx.fillStyle = '#888';
                    ctx.font = '12px monospace';
                    ctx.fillText(item.subtitle, x + this.width / 2, currentY + 32);

                    // Progress bar
                    const barWidth = 200;
                    const barX = x + (this.width - barWidth) / 2;
                    ctx.fillStyle = '#333';
                    ctx.fillRect(barX, currentY + 40, barWidth, 8);
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(barX, currentY + 40, barWidth * (item.progress / 100), 8);
                    ctx.strokeStyle = '#555';
                    ctx.strokeRect(barX, currentY + 40, barWidth, 8);

                    currentY += 60;
                    break;

                case 'active':
                    // Active quest - prominent display
                    if (isSelected) {
                        ctx.fillStyle = '#2a3a4a';
                        ctx.fillRect(listX - 5, currentY, contentWidth + 10, 80);
                    }

                    // Status badge
                    ctx.fillStyle = item.isReadyToTurnIn ? '#22c55e' : '#3b82f6';
                    ctx.fillRect(listX, currentY + 5, 4, 70);

                    // Quest number and title
                    ctx.fillStyle = '#888';
                    ctx.font = '11px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(`CHAPTER ${item.questNumber}`, listX + 15, currentY + 18);

                    ctx.fillStyle = isSelected ? '#FFD700' : '#FFF';
                    ctx.font = 'bold 14px monospace';
                    ctx.fillText(item.title, listX + 15, currentY + 35);

                    // Status
                    ctx.fillStyle = item.isReadyToTurnIn ? '#22c55e' : '#3b82f6';
                    ctx.font = '11px monospace';
                    const statusText = item.isReadyToTurnIn ? '✓ READY TO TURN IN' : '● IN PROGRESS';
                    ctx.fillText(statusText, listX + 15, currentY + 52);

                    // Objective preview
                    if (item.objectives && item.objectives.length > 0) {
                        const obj = item.objectives[0];
                        const objComplete = obj.current >= (obj.count || obj.amount || obj.percentage || 1);
                        ctx.fillStyle = objComplete ? '#666' : '#999';
                        ctx.font = '10px monospace';
                        const objText = `${obj.description}: ${obj.current}/${obj.count || obj.amount || obj.percentage}`;
                        ctx.fillText(objText.substring(0, 50), listX + 15, currentY + 68);
                    }

                    // Selection indicator
                    if (isSelected) {
                        ctx.fillStyle = '#FFD700';
                        ctx.font = '12px monospace';
                        ctx.textAlign = 'right';
                        ctx.fillText('[Enter] Details', listX + contentWidth, currentY + 68);
                    }

                    currentY += 90;
                    break;

                case 'available':
                    // Available quest - muted but inviting
                    if (isSelected) {
                        ctx.fillStyle = '#2a2a3a';
                        ctx.fillRect(listX - 5, currentY, contentWidth + 10, 60);
                    }

                    ctx.fillStyle = '#9932CC';
                    ctx.fillRect(listX, currentY + 5, 4, 50);

                    ctx.fillStyle = '#888';
                    ctx.font = '11px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(`CHAPTER ${item.questNumber} - AVAILABLE`, listX + 15, currentY + 18);

                    ctx.fillStyle = isSelected ? '#FFD700' : '#AAA';
                    ctx.font = 'bold 14px monospace';
                    ctx.fillText(item.title, listX + 15, currentY + 35);

                    ctx.fillStyle = '#666';
                    ctx.font = 'italic 11px monospace';
                    ctx.fillText(item.description, listX + 15, currentY + 50);

                    currentY += 70;
                    break;

                case 'finale':
                    // Story complete - epic display
                    ctx.fillStyle = '#1a1a2e';
                    ctx.fillRect(listX - 5, currentY, contentWidth + 10, 60);
                    ctx.strokeStyle = '#FFD700';
                    ctx.strokeRect(listX - 5, currentY, contentWidth + 10, 60);

                    ctx.fillStyle = '#FFD700';
                    ctx.font = 'bold 14px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(item.title, x + this.width / 2, currentY + 25);

                    ctx.fillStyle = '#888';
                    ctx.font = '11px monospace';
                    ctx.fillText('All chapters complete', x + this.width / 2, currentY + 45);

                    currentY += 70;
                    break;

                case 'section':
                    // Section divider
                    currentY += 10;
                    ctx.strokeStyle = '#4a4a6a';
                    ctx.beginPath();
                    ctx.moveTo(listX, currentY);
                    ctx.lineTo(listX + contentWidth, currentY);
                    ctx.stroke();

                    ctx.fillStyle = '#888';
                    ctx.font = 'bold 11px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(item.title, listX, currentY + 18);

                    currentY += 30;
                    break;

                case 'completed':
                    // Completed quest - compact display
                    if (isSelected) {
                        ctx.fillStyle = '#252530';
                        ctx.fillRect(listX - 5, currentY, contentWidth + 10, 40);
                    }

                    ctx.fillStyle = '#555';
                    ctx.fillRect(listX, currentY + 5, 4, 30);

                    ctx.fillStyle = '#666';
                    ctx.font = '10px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(`CHAPTER ${item.questNumber}`, listX + 15, currentY + 15);

                    ctx.fillStyle = isSelected ? '#AAA' : '#777';
                    ctx.font = '12px monospace';
                    ctx.fillText(item.title, listX + 15, currentY + 30);

                    ctx.fillStyle = '#4a4';
                    ctx.font = '10px monospace';
                    ctx.textAlign = 'right';
                    ctx.fillText('✓', listX + contentWidth - 5, currentY + 23);

                    currentY += 45;
                    break;
            }

            ctx.textAlign = 'left';
        }
    },

    _renderEntry(ctx, x, y) {
        const entry = this.viewingEntry;
        if (!entry) return;

        const contentX = x + this.padding;
        const contentY = y + 10;
        const contentWidth = this.width - this.padding * 2;

        // Quest entries get special story display
        if (entry.type === 'active' || entry.type === 'completed' || entry.type === 'available') {
            this._renderQuestEntry(ctx, entry, contentX, contentY, contentWidth);
            return;
        }

        // Title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(entry.title || entry.name, contentX, contentY + 20);

        // Monster entries get special stat display
        if (entry.type === 'monster' && entry.discovered) {
            this._renderMonsterStats(ctx, entry, contentX, contentY + 40, contentWidth);
            return;
        }

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

    /**
     * Render quest detail view
     * @private
     */
    _renderQuestEntry(ctx, quest, x, y, width) {
        let currentY = y;

        // Chapter header
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`CHAPTER ${quest.questNumber}`, x, currentY + 15);

        // Quest title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(quest.title, x, currentY + 40);

        // Status badge
        if (quest.type === 'active') {
            ctx.fillStyle = quest.isReadyToTurnIn ? '#22c55e' : '#3b82f6';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'right';
            const badge = quest.isReadyToTurnIn ? '✓ COMPLETE' : '● ACTIVE';
            ctx.fillText(badge, x + width, currentY + 40);
        } else if (quest.type === 'completed') {
            ctx.fillStyle = '#4a4';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('✓ COMPLETED', x + width, currentY + 40);
        } else if (quest.type === 'available') {
            ctx.fillStyle = '#9932CC';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('○ AVAILABLE', x + width, currentY + 40);
        }
        ctx.textAlign = 'left';

        currentY += 50;

        // Separator
        ctx.strokeStyle = '#4a4a6a';
        ctx.beginPath();
        ctx.moveTo(x, currentY);
        ctx.lineTo(x + width, currentY);
        ctx.stroke();

        currentY += 15;

        // Elder's words (dialogue)
        if (quest.dialogue) {
            ctx.fillStyle = '#AAA';
            ctx.font = 'bold 11px monospace';
            ctx.fillText('ELDER MIRA SAYS:', x, currentY);
            currentY += 15;

            ctx.fillStyle = '#CCC';
            ctx.font = 'italic 12px monospace';
            let dialogueText = '';
            if (quest.type === 'active' && quest.isReadyToTurnIn) {
                dialogueText = quest.dialogue.complete || '';
            } else if (quest.type === 'active') {
                dialogueText = quest.dialogue.progress || '';
            } else if (quest.type === 'completed') {
                dialogueText = quest.dialogue.complete || '';
            } else {
                dialogueText = quest.dialogue.start || '';
            }

            if (dialogueText) {
                ctx.fillStyle = '#9090a0';
                this._renderWrappedText(ctx, `"${dialogueText}"`, x, currentY, width, 16);
                currentY += Math.ceil(dialogueText.length / 50) * 16 + 20;
            }
        }

        // Description
        if (quest.description && quest.type !== 'available') {
            ctx.fillStyle = '#AAA';
            ctx.font = 'bold 11px monospace';
            ctx.fillText('DESCRIPTION:', x, currentY);
            currentY += 15;

            ctx.fillStyle = '#CCC';
            ctx.font = '12px monospace';
            this._renderWrappedText(ctx, quest.description, x, currentY, width, 16);
            currentY += Math.ceil(quest.description.length / 50) * 16 + 15;
        }

        // Objectives (for active quests)
        if (quest.objectives && quest.objectives.length > 0 && quest.type === 'active') {
            ctx.fillStyle = '#AAA';
            ctx.font = 'bold 11px monospace';
            ctx.fillText('OBJECTIVES:', x, currentY);
            currentY += 18;

            quest.objectives.forEach(obj => {
                const target = obj.count || obj.amount || obj.percentage || 1;
                const current = obj.current || 0;
                const complete = current >= target;

                // Checkbox
                ctx.fillStyle = complete ? '#22c55e' : '#555';
                ctx.font = '14px monospace';
                ctx.fillText(complete ? '☑' : '☐', x + 5, currentY);

                // Objective text
                ctx.fillStyle = complete ? '#666' : '#CCC';
                ctx.font = '12px monospace';
                ctx.fillText(obj.description, x + 25, currentY);

                // Progress
                ctx.fillStyle = complete ? '#22c55e' : '#888';
                ctx.font = '11px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(`${current}/${target}`, x + width, currentY);
                ctx.textAlign = 'left';

                currentY += 22;
            });

            currentY += 10;
        }

        // Rewards
        if (quest.rewards && (quest.type === 'active' || quest.type === 'available')) {
            ctx.fillStyle = '#AAA';
            ctx.font = 'bold 11px monospace';
            ctx.fillText('REWARDS:', x, currentY);
            currentY += 18;

            // Gold
            if (quest.rewards.gold) {
                ctx.fillStyle = '#FFD700';
                ctx.font = '12px monospace';
                ctx.fillText(`● ${quest.rewards.gold} Gold`, x + 10, currentY);
                currentY += 18;
            }

            // Items
            if (quest.rewards.items && quest.rewards.items.length > 0) {
                quest.rewards.items.forEach(item => {
                    ctx.fillStyle = '#3b82f6';
                    ctx.font = '12px monospace';
                    ctx.fillText(`● ${item.count}x ${item.id}`, x + 10, currentY);
                    currentY += 18;
                });
            }

            // Unlocks
            if (quest.rewards.unlocks && quest.rewards.unlocks.length > 0) {
                quest.rewards.unlocks.forEach(unlock => {
                    ctx.fillStyle = '#9932CC';
                    ctx.font = '12px monospace';
                    ctx.fillText(`● Unlocks: ${unlock}`, x + 10, currentY);
                    currentY += 18;
                });
            }
        }

        // Turn-in reminder for ready quests
        if (quest.type === 'active' && quest.isReadyToTurnIn) {
            currentY += 10;
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Return to Elder Mira in Town Square to claim your reward!', x + width / 2, currentY);
            ctx.textAlign = 'left';
        }

        // Available quest hint
        if (quest.type === 'available') {
            currentY += 10;
            ctx.fillStyle = '#9932CC';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Speak to Elder Mira in Town Square to begin this quest.', x + width / 2, currentY);
            ctx.textAlign = 'left';
        }
    },

    _renderMonsterStats(ctx, monster, x, y, width) {
        const elementColors = {
            fire: '#ff6b35', physical: '#aaa', shadow: '#8b5cf6',
            nature: '#22c55e', earth: '#a3a380', water: '#3b82f6'
        };

        // Element badge
        ctx.fillStyle = elementColors[monster.element] || '#888';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`[${monster.element?.toUpperCase() || 'UNKNOWN'}]`, x, y);

        // Kill count
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Slain: ${monster.kills || 0}`, x + width, y);
        ctx.textAlign = 'left';

        // Separator
        ctx.strokeStyle = '#4a4a6a';
        ctx.beginPath();
        ctx.moveTo(x, y + 15);
        ctx.lineTo(x + width, y + 15);
        ctx.stroke();

        // Description
        ctx.fillStyle = '#bbb';
        ctx.font = 'italic 12px monospace';
        this._renderWrappedText(ctx, monster.description || 'No description.', x, y + 35, width, 16);

        // Stats section header
        const statsY = y + 80;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('STATS', x, statsY);

        // Stats grid
        const stats = [
            { label: 'HP', value: monster.hp, color: '#c0392b' },
            { label: 'STR', value: monster.str, color: '#e67e22' },
            { label: 'AGI', value: monster.agi, color: '#2ecc71' },
            { label: 'INT', value: monster.int, color: '#3498db' },
            { label: 'P.DEF', value: monster.pDef, color: '#95a5a6' },
            { label: 'M.DEF', value: monster.mDef, color: '#9b59b6' }
        ];

        const colWidth = width / 3;
        stats.forEach((stat, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const sx = x + col * colWidth;
            const sy = statsY + 20 + row * 25;

            ctx.fillStyle = stat.color;
            ctx.font = 'bold 12px monospace';
            ctx.fillText(stat.label + ':', sx, sy);

            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText(String(stat.value), sx + 50, sy);
        });

        // Combat info section
        const combatY = statsY + 80;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('COMBAT', x, combatY);

        ctx.fillStyle = '#ccc';
        ctx.font = '12px monospace';
        ctx.fillText(`Attack: ${monster.attack || 'Unknown'}`, x, combatY + 20);
        ctx.fillText(`Type: ${monster.attackType || '?'} / ${monster.damageType || '?'}`, x, combatY + 38);
        ctx.fillText(`Range: ${monster.attackRange || 1}  Speed: ${monster.attackSpeed || 2.0}s`, x, combatY + 56);

        // XP reward
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`XP: ${monster.xp || 0}`, x + width, combatY + 20);
        ctx.textAlign = 'left';

        // Loot section
        const lootY = combatY + 85;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('DROPS', x, lootY);

        if (monster.loot && monster.loot.length > 0) {
            const rarityColors = {
                common: '#aaa', uncommon: '#2ecc71', rare: '#3498db',
                epic: '#9b59b6', legendary: '#f39c12'
            };

            monster.loot.forEach((drop, i) => {
                const ly = lootY + 20 + i * 18;
                ctx.fillStyle = rarityColors[drop.rarity] || '#aaa';
                ctx.font = '11px monospace';
                const chance = Math.round(drop.dropChance * 100);
                ctx.fillText(`• ${drop.name} (${chance}%)`, x + 10, ly);
            });
        } else {
            ctx.fillStyle = '#666';
            ctx.font = '11px monospace';
            ctx.fillText('No known drops', x + 10, lootY + 20);
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

// Open journal with 'J' key (only in village - sidebar handles dungeon)
window.addEventListener('keydown', (e) => {
    if (e.key === 'j' || e.key === 'J') {
        // In village state, handle J key here (sidebar doesn't run in village)
        if (game.state === 'village') {
            JournalUI.toggle();
            e.preventDefault();
            return;
        }
        // When journal is already open, handle closing
        if (game.state === 'journal') {
            // Only close if not viewing an entry (let handleInput manage that)
            if (!JournalUI.viewingEntry) {
                JournalUI.close();
                e.preventDefault();
            }
        }
        // Note: In 'playing' state, sidebar's handleSidebarHotkey handles J
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.JournalUI = JournalUI;

// Journal system loaded
