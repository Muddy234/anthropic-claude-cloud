// === js/ui/quest-ui.js ===
// SURVIVAL EXTRACTION UPDATE: Quest interface

// ============================================================================
// QUEST UI
// ============================================================================

const QuestUI = {

    // State
    active: false,
    mode: 'list',  // 'list', 'detail', 'npc'
    selectedIndex: 0,
    currentNPC: null,
    scrollOffset: 0,

    // Layout
    PANEL_WIDTH: 700,
    PANEL_HEIGHT: 500,

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open quest log
     */
    openLog() {
        this.active = true;
        this.mode = 'list';
        this.selectedIndex = 0;
        this.scrollOffset = 0;
        this.currentNPC = null;

        console.log('[QuestUI] Opened quest log');
    },

    /**
     * Open NPC quest dialog
     * @param {Object} npc
     */
    openNPCQuests(npc) {
        this.active = true;
        this.mode = 'npc';
        this.selectedIndex = 0;
        this.scrollOffset = 0;
        this.currentNPC = npc;

        console.log(`[QuestUI] Opened quests for ${npc.name}`);
    },

    /**
     * Close quest UI
     */
    close() {
        this.active = false;
        this.currentNPC = null;

        // Return to appropriate state
        if (game.state === 'quest') {
            game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        }
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

        const items = this._getCurrentItems();

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                break;

            case 'ArrowDown':
            case 's':
            case 'S':
                this.selectedIndex = Math.min(items.length - 1, this.selectedIndex + 1);
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                this._selectItem();
                break;

            case 'Escape':
            case 'q':
            case 'Q':
                if (this.mode === 'detail') {
                    this.mode = 'list';
                } else {
                    this.close();
                }
                break;

            case 'Tab':
                // Toggle between available and active in NPC mode
                if (this.mode === 'npc') {
                    this.selectedIndex = 0;
                }
                break;
        }
    },

    /**
     * Get items for current mode
     * @returns {Array}
     * @private
     */
    _getCurrentItems() {
        if (this.mode === 'list') {
            return QuestSystem?.getActiveQuests() || [];
        } else if (this.mode === 'npc' && this.currentNPC) {
            const quests = QuestSystem?.getQuestsForNPC(this.currentNPC.id) || {};
            return [
                ...quests.completable.map(q => ({ ...q, status: 'completable' })),
                ...quests.available.map(q => ({ quest: q, status: 'available' })),
                ...quests.active.map(q => ({ ...q, status: 'active' }))
            ];
        }
        return [];
    },

    /**
     * Select current item
     * @private
     */
    _selectItem() {
        const items = this._getCurrentItems();
        if (this.selectedIndex >= items.length) return;

        const item = items[this.selectedIndex];

        if (this.mode === 'npc') {
            if (item.status === 'available') {
                // Accept quest
                QuestSystem.acceptQuest(item.quest.id);
                this.selectedIndex = 0;
            } else if (item.status === 'completable') {
                // Complete quest
                const rewards = QuestSystem.completeQuest(item.quest.id);
                if (rewards) {
                    this._showRewards(rewards);
                }
                this.selectedIndex = 0;
            } else if (item.status === 'active') {
                // Show progress
                this.mode = 'detail';
            }
        } else if (this.mode === 'list') {
            // Show quest detail
            this.mode = 'detail';
        }
    },

    /**
     * Show reward notification
     * @param {Object} rewards
     * @private
     */
    _showRewards(rewards) {
        let message = 'Rewards: ';
        if (rewards.gold > 0) {
            message += `${rewards.gold} gold`;
        }
        if (rewards.items.length > 0) {
            message += `, ${rewards.items.length} item(s)`;
        }

        if (typeof addMessage === 'function') {
            addMessage(message, 'reward');
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render quest UI
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const panelX = (canvas.width - this.PANEL_WIDTH) / 2;
        const panelY = (canvas.height - this.PANEL_HEIGHT) / 2;

        // Panel background
        this._renderPanel(ctx, panelX, panelY);

        // Render based on mode
        if (this.mode === 'list') {
            this._renderQuestList(ctx, panelX, panelY);
        } else if (this.mode === 'npc') {
            this._renderNPCQuests(ctx, panelX, panelY);
        } else if (this.mode === 'detail') {
            this._renderQuestDetail(ctx, panelX, panelY);
        }

        // Controls
        this._renderControls(ctx, panelX, panelY);
    },

    /**
     * Render panel background
     * @private
     */
    _renderPanel(ctx, x, y) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + 4, y + 4, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Border
        ctx.strokeStyle = '#9370DB';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);

        // Title
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9370DB';

        let title = 'Quest Log';
        if (this.mode === 'npc' && this.currentNPC) {
            title = `${this.currentNPC.name} - Quests`;
        }
        ctx.fillText(title, x + this.PANEL_WIDTH / 2, y + 30);
    },

    /**
     * Render quest list
     * @private
     */
    _renderQuestList(ctx, panelX, panelY) {
        const quests = QuestSystem?.getActiveQuests() || [];
        const listY = panelY + 50;
        const itemHeight = 60;

        if (quests.length === 0) {
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText('No active quests', panelX + this.PANEL_WIDTH / 2, listY + 100);
            ctx.fillText('Talk to village NPCs to find quests', panelX + this.PANEL_WIDTH / 2, listY + 130);
            return;
        }

        quests.slice(0, 7).forEach((activeQuest, idx) => {
            const questData = getQuest(activeQuest.id);
            if (!questData) return;

            const itemY = listY + idx * itemHeight;
            const isSelected = idx === this.selectedIndex;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a5e';
                ctx.fillRect(panelX + 10, itemY, this.PANEL_WIDTH - 20, itemHeight - 5);
            }

            // Quest type indicator
            const typeColors = { main: '#FFD700', side: '#9370DB' };
            ctx.fillStyle = typeColors[questData.type] || '#AAA';
            ctx.fillRect(panelX + 15, itemY + 5, 4, itemHeight - 15);

            // Quest name
            ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#FFF';
            ctx.fillText(questData.name, panelX + 30, itemY + 25);

            // Progress bar
            const progress = QuestSystem.getQuestProgress(activeQuest.id);
            if (progress) {
                const barWidth = 200;
                const barX = panelX + 30;
                const barY = itemY + 35;

                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barWidth, 10);

                ctx.fillStyle = progress.isComplete ? '#2ecc71' : '#3498db';
                ctx.fillRect(barX, barY, barWidth * progress.progress, 10);

                ctx.font = '12px Arial';
                ctx.fillStyle = '#888';
                ctx.fillText(
                    `${Math.floor(progress.progress * 100)}%`,
                    barX + barWidth + 10,
                    barY + 9
                );
            }

            // Giver
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'right';
            ctx.fillText(`From: ${questData.giver}`, panelX + this.PANEL_WIDTH - 20, itemY + 25);
        });
    },

    /**
     * Render NPC quest dialog
     * @private
     */
    _renderNPCQuests(ctx, panelX, panelY) {
        if (!this.currentNPC) return;

        const quests = QuestSystem?.getQuestsForNPC(this.currentNPC.id) || {};
        const items = this._getCurrentItems();
        const listY = panelY + 50;
        const itemHeight = 55;

        if (items.length === 0) {
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText('No quests available', panelX + this.PANEL_WIDTH / 2, listY + 100);
            return;
        }

        items.slice(0, 7).forEach((item, idx) => {
            const questData = item.quest;
            const itemY = listY + idx * itemHeight;
            const isSelected = idx === this.selectedIndex;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = '#3a3a5e';
                ctx.fillRect(panelX + 10, itemY, this.PANEL_WIDTH - 20, itemHeight - 5);
            }

            // Status indicator
            const statusColors = {
                available: '#2ecc71',
                active: '#3498db',
                completable: '#FFD700'
            };
            ctx.fillStyle = statusColors[item.status];
            ctx.beginPath();
            ctx.arc(panelX + 25, itemY + 25, 8, 0, Math.PI * 2);
            ctx.fill();

            // Status icon
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            if (item.status === 'available') {
                ctx.fillText('!', panelX + 25, itemY + 29);
            } else if (item.status === 'completable') {
                ctx.fillText('?', panelX + 25, itemY + 29);
            } else {
                ctx.fillText('~', panelX + 25, itemY + 29);
            }

            // Quest name
            ctx.font = isSelected ? 'bold 15px Arial' : '15px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#FFF';
            ctx.fillText(questData.name, panelX + 45, itemY + 25);

            // Status text
            ctx.font = '12px Arial';
            ctx.fillStyle = statusColors[item.status];
            const statusText = item.status === 'available' ? 'Available' :
                              item.status === 'completable' ? 'Complete!' : 'In Progress';
            ctx.fillText(statusText, panelX + 45, itemY + 42);

            // Brief description
            ctx.fillStyle = '#888';
            ctx.textAlign = 'right';
            const shortDesc = questData.description.substring(0, 40) + '...';
            ctx.fillText(shortDesc, panelX + this.PANEL_WIDTH - 20, itemY + 25);
        });
    },

    /**
     * Render quest detail view
     * @private
     */
    _renderQuestDetail(ctx, panelX, panelY) {
        const items = this._getCurrentItems();
        if (this.selectedIndex >= items.length) {
            this.mode = 'list';
            return;
        }

        const item = items[this.selectedIndex];
        const questData = item.quest || getQuest(item.id);
        const progress = item.progress || item;

        if (!questData) return;

        let y = panelY + 60;

        // Quest name
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(questData.name, panelX + 20, y);
        y += 30;

        // Type badge
        ctx.font = '12px Arial';
        ctx.fillStyle = questData.type === 'main' ? '#FFD700' : '#9370DB';
        ctx.fillText(`[${questData.type.toUpperCase()}]`, panelX + 20, y);
        y += 25;

        // Description
        ctx.font = '14px Arial';
        ctx.fillStyle = '#CCC';
        const words = questData.description.split(' ');
        let line = '';
        const maxWidth = this.PANEL_WIDTH - 40;

        words.forEach(word => {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
                ctx.fillText(line, panelX + 20, y);
                line = word + ' ';
                y += 20;
            } else {
                line = testLine;
            }
        });
        ctx.fillText(line, panelX + 20, y);
        y += 40;

        // Objectives
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#9370DB';
        ctx.fillText('Objectives:', panelX + 20, y);
        y += 25;

        const objectives = progress.objectives || questData.objectives;
        objectives.forEach(obj => {
            const complete = isObjectiveComplete(obj);

            // Checkbox
            ctx.strokeStyle = complete ? '#2ecc71' : '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(panelX + 25, y - 12, 14, 14);
            if (complete) {
                ctx.fillStyle = '#2ecc71';
                ctx.fillText('✓', panelX + 27, y);
            }

            // Description
            ctx.font = '14px Arial';
            ctx.fillStyle = complete ? '#2ecc71' : '#AAA';
            ctx.fillText(obj.description, panelX + 50, y);

            // Progress
            if (obj.count) {
                ctx.fillStyle = '#888';
                ctx.textAlign = 'right';
                ctx.fillText(`${obj.current || 0}/${obj.count}`, panelX + this.PANEL_WIDTH - 20, y);
                ctx.textAlign = 'left';
            }

            y += 25;
        });
        y += 20;

        // Rewards
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Rewards:', panelX + 20, y);
        y += 25;

        ctx.font = '14px Arial';
        if (questData.rewards.gold) {
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`• ${questData.rewards.gold} Gold`, panelX + 30, y);
            y += 20;
        }
        if (questData.rewards.items) {
            questData.rewards.items.forEach(item => {
                ctx.fillStyle = '#AAA';
                ctx.fillText(`• ${item.id} x${item.count}`, panelX + 30, y);
                y += 20;
            });
        }
    },

    /**
     * Render control hints
     * @private
     */
    _renderControls(ctx, panelX, panelY) {
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666';

        let hint = '[Up/Down] Navigate | [E/Enter] Select | [ESC] Close';
        if (this.mode === 'detail') {
            hint = '[ESC] Back to List';
        }

        ctx.fillText(hint, panelX + this.PANEL_WIDTH / 2, panelY + this.PANEL_HEIGHT - 15);
    },

    // ========================================================================
    // HUD TRACKER
    // ========================================================================

    /**
     * Render mini quest tracker (HUD element)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     */
    renderTracker(ctx, x, y) {
        const quests = QuestSystem?.getActiveQuests() || [];
        if (quests.length === 0) return;

        const width = 200;
        const height = 20 + quests.slice(0, 3).length * 25;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, width, height);

        // Title
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#9370DB';
        ctx.fillText('Active Quests', x + 5, y + 14);

        // Quest list (max 3)
        quests.slice(0, 3).forEach((activeQuest, idx) => {
            const questData = getQuest(activeQuest.id);
            if (!questData) return;

            const itemY = y + 22 + idx * 25;

            // Name (truncated)
            ctx.font = '11px Arial';
            ctx.fillStyle = '#FFF';
            const name = questData.name.length > 20 ?
                questData.name.substring(0, 18) + '...' : questData.name;
            ctx.fillText(name, x + 5, itemY + 10);

            // Progress
            const progress = QuestSystem.getQuestProgress(activeQuest.id);
            if (progress) {
                ctx.fillStyle = progress.isComplete ? '#2ecc71' : '#888';
                ctx.textAlign = 'right';
                ctx.fillText(`${Math.floor(progress.progress * 100)}%`, x + width - 5, itemY + 10);
                ctx.textAlign = 'left';
            }
        });
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.QuestUI = QuestUI;

console.log('[QuestUI] Quest UI loaded');
