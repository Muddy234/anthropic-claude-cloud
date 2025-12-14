// === js/ui/dialogue-ui.js ===
// SURVIVAL EXTRACTION UPDATE: Dialogue system UI

// ============================================================================
// DIALOGUE UI
// ============================================================================

const DialogueUI = {

    // State
    active: false,
    currentNPC: null,
    currentNode: null,
    selectedOption: 0,
    animatingText: false,
    displayedText: '',
    fullText: '',
    textAnimTimer: 0,

    // Settings
    TEXT_SPEED: 30,  // ms per character
    BOX_WIDTH: 600,
    BOX_HEIGHT: 200,
    OPTION_HEIGHT: 30,

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open dialogue with an NPC
     * @param {Object} npc - NPC instance
     */
    open(npc) {
        if (!npc) return;

        this.active = true;
        this.currentNPC = npc;
        this.selectedOption = 0;

        // Get initial dialogue
        const nodeId = npc.currentDialogue || npc.initialDialogue;
        this.showNode(nodeId);

        // Set game state
        if (typeof game !== 'undefined') {
            game.state = GAME_STATES ? GAME_STATES.DIALOGUE : 'dialogue';
        }

        console.log(`[DialogueUI] Opened dialogue with ${npc.name}`);
    },

    /**
     * Show a dialogue node
     * @param {string} nodeId
     */
    showNode(nodeId) {
        const node = getDialogueNode(nodeId);
        if (!node) {
            console.warn(`[DialogueUI] Unknown dialogue node: ${nodeId}`);
            this.close();
            return;
        }

        this.currentNode = node;
        this.selectedOption = 0;

        // Handle dynamic text
        let text = node.text || '';
        if (node.dynamic) {
            text = this._getDynamicText(node.dynamic);
        }

        // Start text animation
        this.fullText = text;
        this.displayedText = '';
        this.animatingText = true;
        this.textAnimTimer = 0;
    },

    /**
     * Close dialogue
     */
    close() {
        this.active = false;
        this.currentNPC = null;
        this.currentNode = null;
        this.animatingText = false;

        // Return to village state
        if (typeof game !== 'undefined') {
            game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        }

        console.log('[DialogueUI] Dialogue closed');
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update dialogue state
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        if (!this.active) return;

        // Animate text
        if (this.animatingText) {
            this.textAnimTimer += dt;
            const charsToShow = Math.floor(this.textAnimTimer / this.TEXT_SPEED);

            if (charsToShow >= this.fullText.length) {
                this.displayedText = this.fullText;
                this.animatingText = false;
            } else {
                this.displayedText = this.fullText.substring(0, charsToShow);
            }
        }
    },

    /**
     * Handle input
     * @param {string} key - Key pressed
     */
    handleInput(key) {
        if (!this.active || !this.currentNode) return;

        const responses = this.currentNode.responses || [];

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (!this.animatingText && responses.length > 0) {
                    this.selectedOption = (this.selectedOption - 1 + responses.length) % responses.length;
                }
                break;

            case 'ArrowDown':
            case 's':
            case 'S':
                if (!this.animatingText && responses.length > 0) {
                    this.selectedOption = (this.selectedOption + 1) % responses.length;
                }
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                if (this.animatingText) {
                    // Skip animation
                    this.displayedText = this.fullText;
                    this.animatingText = false;
                } else {
                    // Select option
                    this._selectOption(this.selectedOption);
                }
                break;

            case 'Escape':
                this.close();
                break;

            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
                if (!this.animatingText) {
                    const index = parseInt(key) - 1;
                    if (index < responses.length) {
                        this._selectOption(index);
                    }
                }
                break;
        }
    },

    /**
     * Select a dialogue option
     * @param {number} index
     * @private
     */
    _selectOption(index) {
        const responses = this.currentNode.responses || [];
        if (index < 0 || index >= responses.length) return;

        const response = responses[index];

        // Handle action
        if (response.action) {
            this._handleAction(response.action);
            return;
        }

        // Navigate to next node
        if (response.next) {
            this.showNode(response.next);
        } else {
            this.close();
        }
    },

    /**
     * Handle special actions
     * @param {string} action
     * @private
     */
    _handleAction(action) {
        console.log(`[DialogueUI] Action: ${action}`);

        // Store NPC reference before closing
        const npc = this.currentNPC;

        switch (action) {
            case 'close':
                this.close();
                break;

            case 'open_bank':
                this.close();
                if (typeof BankUI !== 'undefined') {
                    BankUI.open();
                } else if (typeof game !== 'undefined') {
                    game.state = GAME_STATES ? GAME_STATES.BANK : 'bank';
                }
                break;

            case 'open_shop':
                this.close();
                if (typeof ShopUI !== 'undefined') {
                    ShopUI.open(npc);
                } else if (typeof game !== 'undefined') {
                    game.state = GAME_STATES ? GAME_STATES.SHOP : 'shop';
                    game.activeShopNPC = npc;
                }
                break;

            case 'open_loadout':
                this.close();
                if (typeof LoadoutUI !== 'undefined') {
                    LoadoutUI.open();
                } else if (typeof game !== 'undefined') {
                    game.state = GAME_STATES ? GAME_STATES.LOADOUT : 'loadout';
                }
                break;

            case 'open_crafting':
                this.close();
                if (typeof CraftingUI !== 'undefined') {
                    CraftingUI.open();
                } else if (typeof game !== 'undefined') {
                    game.state = GAME_STATES ? GAME_STATES.CRAFTING : 'crafting';
                }
                break;

            case 'show_quests':
                // TODO: Quest UI
                console.log('[DialogueUI] Quest UI not yet implemented');
                break;

            case 'grant_blessing':
                // TODO: Blessing system
                console.log('[DialogueUI] Blessing granted (placeholder)');
                this.close();
                break;

            default:
                console.warn(`[DialogueUI] Unknown action: ${action}`);
                this.close();
        }
    },

    /**
     * Get dynamic text content
     * @param {string} type
     * @returns {string}
     * @private
     */
    _getDynamicText(type) {
        switch (type) {
            case 'village_status':
                const degradation = persistentState?.village?.degradationLevel || 0;
                if (degradation === 0) {
                    return 'The village is thriving. Your efforts have made a difference.';
                } else if (degradation === 1) {
                    return 'The village has seen better days. Some buildings show damage, but we persevere.';
                } else {
                    return 'The village suffers greatly. We need more resources from the Chasm to rebuild.';
                }

            case 'bank_balance':
                const gold = persistentState?.bank?.gold || 0;
                const items = persistentState?.bank?.items?.length || 0;
                return `Your vault contains ${gold} gold and ${items} items.`;

            case 'shortcut_status':
                const shortcuts = persistentState?.shortcuts || [];
                const unlocked = shortcuts.filter(s => s.unlocked).length;
                if (unlocked === 0) {
                    return 'No shortcuts unlocked yet. Defeat floor guardians to create new paths.';
                } else {
                    return `You have ${unlocked} shortcut(s) unlocked. Choose your starting floor wisely.`;
                }

            case 'player_stats':
                const stats = persistentState?.stats || {};
                return `Runs: ${stats.totalRuns || 0} | Extractions: ${stats.successfulExtractions || 0} | Deepest: Floor ${stats.deepestFloor || 1}`;

            case 'random_rumor':
            case 'random_tip':
            case 'random_story':
                return getDynamicContent(type);

            default:
                return getDynamicContent(type) || 'Something seems wrong...';
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render dialogue UI
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active || !this.currentNode) return;

        const canvas = ctx.canvas;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate total height needed (box + responses)
        const responses = this.currentNode.responses || [];
        const responsesHeight = responses.length * (this.OPTION_HEIGHT + 5);
        const totalHeight = this.BOX_HEIGHT + responsesHeight + 20;

        // Calculate box position - center vertically with room for responses
        const boxX = (canvas.width - this.BOX_WIDTH) / 2;
        const boxY = (canvas.height - totalHeight) / 2;

        // Draw dialogue box
        this._renderDialogueBox(ctx, boxX, boxY);

        // Draw speaker name
        this._renderSpeakerName(ctx, boxX, boxY);

        // Draw text
        this._renderText(ctx, boxX, boxY);

        // Draw responses
        if (!this.animatingText) {
            this._renderResponses(ctx, boxX, boxY);
        }

        // Draw continue prompt
        if (this.animatingText) {
            this._renderContinuePrompt(ctx, boxX, boxY);
        }
    },

    /**
     * Render the dialogue box background
     * @private
     */
    _renderDialogueBox(ctx, x, y) {
        // Box shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + 4, y + 4, this.BOX_WIDTH, this.BOX_HEIGHT);

        // Main box
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, this.BOX_WIDTH, this.BOX_HEIGHT);

        // Border
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.BOX_WIDTH, this.BOX_HEIGHT);

        // Inner border
        ctx.strokeStyle = '#2a2a4e';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 5, y + 5, this.BOX_WIDTH - 10, this.BOX_HEIGHT - 10);
    },

    /**
     * Render speaker name plate
     * @private
     */
    _renderSpeakerName(ctx, boxX, boxY) {
        if (!this.currentNPC) return;

        const nameWidth = 200;
        const nameHeight = 30;
        const nameX = boxX + 20;
        const nameY = boxY - nameHeight + 5;

        // Name plate background
        ctx.fillStyle = this.currentNPC.color || '#4a4a6a';
        ctx.fillRect(nameX, nameY, nameWidth, nameHeight);

        // Border
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(nameX, nameY, nameWidth, nameHeight);

        // Name text
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFF';
        ctx.fillText(this.currentNPC.name, nameX + 10, nameY + 20);

        // Title (smaller)
        if (this.currentNPC.title) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#AAA';
            ctx.fillText(this.currentNPC.title, nameX + 10 + ctx.measureText(this.currentNPC.name).width + 10, nameY + 20);
        }
    },

    /**
     * Render dialogue text
     * @private
     */
    _renderText(ctx, boxX, boxY) {
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFF';

        // Word wrap
        const maxWidth = this.BOX_WIDTH - 40;
        const lineHeight = 24;
        const startX = boxX + 20;
        const startY = boxY + 40;

        const lines = this._wrapText(ctx, this.displayedText, maxWidth);
        lines.forEach((line, index) => {
            ctx.fillText(line, startX, startY + index * lineHeight);
        });
    },

    /**
     * Render response options
     * @private
     */
    _renderResponses(ctx, boxX, boxY) {
        const responses = this.currentNode.responses || [];
        if (responses.length === 0) return;

        const startY = boxY + this.BOX_HEIGHT + 10;

        responses.forEach((response, index) => {
            const optionY = startY + index * (this.OPTION_HEIGHT + 5);
            const isSelected = index === this.selectedOption;

            // Option background
            ctx.fillStyle = isSelected ? '#3a3a5e' : '#1a1a2e';
            ctx.fillRect(boxX, optionY, this.BOX_WIDTH, this.OPTION_HEIGHT);

            // Border
            ctx.strokeStyle = isSelected ? '#8888FF' : '#4a4a6a';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(boxX, optionY, this.BOX_WIDTH, this.OPTION_HEIGHT);

            // Number
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = isSelected ? '#FFD700' : '#888';
            ctx.fillText(`${index + 1}.`, boxX + 15, optionY + 20);

            // Text
            ctx.fillStyle = isSelected ? '#FFF' : '#AAA';
            ctx.fillText(response.text, boxX + 40, optionY + 20);

            // Selection arrow
            if (isSelected) {
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.moveTo(boxX + 5, optionY + 10);
                ctx.lineTo(boxX + 5, optionY + 20);
                ctx.lineTo(boxX + 12, optionY + 15);
                ctx.closePath();
                ctx.fill();
            }
        });
    },

    /**
     * Render continue prompt
     * @private
     */
    _renderContinuePrompt(ctx, boxX, boxY) {
        const pulseAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3;

        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
        ctx.fillText('Press ENTER to continue...', boxX + this.BOX_WIDTH - 20, boxY + this.BOX_HEIGHT - 15);
    },

    /**
     * Word wrap text
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} maxWidth
     * @returns {Array} Array of lines
     * @private
     */
    _wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.DialogueUI = DialogueUI;

console.log('[DialogueUI] Dialogue UI loaded');
