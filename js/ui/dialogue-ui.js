// === js/ui/dialogue-ui.js ===
// Dialogue system UI

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
     * Issue #9: Added validation for NPC data
     * @param {Object} npc - NPC instance
     */
    open(npc) {
        if (!npc) {
            console.error('[DialogueUI] Cannot open dialogue: NPC is null/undefined');
            return;
        }

        // Validate NPC has required properties
        if (!npc.name) {
            console.warn('[DialogueUI] NPC missing name property, using default');
            npc.name = 'Unknown';
        }

        this.active = true;
        this.currentNPC = npc;
        this.selectedOption = 0;
        this._failedNodeCount = 0; // Track consecutive failures to prevent infinite loops

        // Get initial dialogue
        const nodeId = npc.currentDialogue || npc.initialDialogue;

        // Validate we have a starting node
        if (!nodeId) {
            console.error(`[DialogueUI] NPC ${npc.name} has no initial dialogue node`);
            this._showFallbackDialogue('...');
            return;
        }

        this.showNode(nodeId);

        // Set game state
        if (typeof game !== 'undefined') {
            game.state = GAME_STATES ? GAME_STATES.DIALOGUE : 'dialogue';
        }

        console.log(`[DialogueUI] Opened dialogue with ${npc.name}`);
    },

    /**
     * Show fallback dialogue when tree is broken
     * Issue #9: Graceful handling for missing dialogue data
     * @param {string} fallbackText - Text to display
     * @private
     */
    _showFallbackDialogue(fallbackText) {
        this.currentNode = {
            text: fallbackText,
            responses: [
                { text: '[End conversation]', action: 'close' }
            ]
        };
        this.fullText = fallbackText;
        this.displayedText = '';
        this.animatingText = true;
        this.textAnimTimer = 0;
        console.warn('[DialogueUI] Using fallback dialogue');
    },

    /**
     * Show a dialogue node
     * Issue #9: Added robust error handling for missing/invalid nodes
     * @param {string} nodeId
     */
    showNode(nodeId) {
        // Validate nodeId
        if (!nodeId || typeof nodeId !== 'string') {
            console.error(`[DialogueUI] Invalid node ID: ${nodeId}`);
            this._handleMissingNode(nodeId);
            return;
        }

        // Check if getDialogueNode function exists
        if (typeof getDialogueNode !== 'function') {
            console.error('[DialogueUI] getDialogueNode function not found - dialogue system not initialized');
            this._showFallbackDialogue('The conversation cannot continue...');
            return;
        }

        const node = getDialogueNode(nodeId);

        if (!node) {
            console.warn(`[DialogueUI] Unknown dialogue node: ${nodeId}`);
            this._handleMissingNode(nodeId);
            return;
        }

        // Validate node structure
        if (!node.text && !node.dynamic) {
            console.warn(`[DialogueUI] Node ${nodeId} has no text or dynamic content`);
            node.text = '...';
        }

        // Reset failure counter on successful node load
        this._failedNodeCount = 0;

        this.currentNode = node;
        this.selectedOption = 0;

        // Handle dynamic text with error handling
        let text = node.text || '';
        if (node.dynamic) {
            try {
                text = this._getDynamicText(node.dynamic);
            } catch (e) {
                console.error(`[DialogueUI] Error getting dynamic text for '${node.dynamic}':`, e);
                text = node.text || '...';
            }
        }

        // Validate responses array
        if (node.responses && !Array.isArray(node.responses)) {
            console.warn(`[DialogueUI] Node ${nodeId} has invalid responses (not an array)`);
            node.responses = [];
        }

        // Start text animation
        this.fullText = text;
        this.displayedText = '';
        this.animatingText = true;
        this.textAnimTimer = 0;
    },

    /**
     * Handle missing dialogue node gracefully
     * Issue #9: Prevents crashes from bad dialogue data
     * @param {string} nodeId - The missing node ID
     * @private
     */
    _handleMissingNode(nodeId) {
        this._failedNodeCount = (this._failedNodeCount || 0) + 1;

        // Prevent infinite loop of failures
        if (this._failedNodeCount > 3) {
            console.error('[DialogueUI] Too many consecutive node failures, closing dialogue');
            this.close();
            return;
        }

        // Show fallback and allow closing
        this._showFallbackDialogue(`[Missing dialogue: ${nodeId || 'unknown'}]`);
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
     * Issue #9: Added validation for response data
     * @param {number} index
     * @private
     */
    _selectOption(index) {
        if (!this.currentNode) {
            console.error('[DialogueUI] No current node when selecting option');
            this.close();
            return;
        }

        const responses = this.currentNode.responses || [];
        if (index < 0 || index >= responses.length) {
            console.warn(`[DialogueUI] Invalid option index: ${index} (max: ${responses.length - 1})`);
            return;
        }

        const response = responses[index];

        // Validate response object
        if (!response || typeof response !== 'object') {
            console.error(`[DialogueUI] Invalid response at index ${index}`);
            this.close();
            return;
        }

        // Handle action
        if (response.action) {
            this._handleAction(response.action);
            return;
        }

        // Navigate to next node
        if (response.next) {
            // Validate next node ID
            if (typeof response.next !== 'string') {
                console.error(`[DialogueUI] Invalid next node ID: ${response.next}`);
                this.close();
                return;
            }
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

            case 'open_bulletin':
                this.close();
                if (typeof BulletinUI !== 'undefined') {
                    BulletinUI.open();
                } else {
                    console.warn('[DialogueUI] BulletinUI not available');
                }
                break;

            case 'open_dice_game':
                this.close();
                if (typeof TavernGamesUI !== 'undefined') {
                    TavernGamesUI.open();
                } else {
                    console.warn('[DialogueUI] TavernGamesUI not available');
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
                return 'The village endures, as it always has. Your contributions help keep us safe.';

            case 'bank_balance':
                const gold = persistentState?.bank?.gold || 0;
                const items = persistentState?.bank?.items?.length || 0;
                return `Your vault contains ${gold} gold and ${items} items.`;

            case 'player_stats':
                const stats = persistentState?.stats || {};
                return `Runs: ${stats.totalRuns || 0} | Deepest: Floor ${stats.deepestFloor || 1}`;

            case 'random_rumor':
            case 'random_tip':
            case 'random_story':
                return getDynamicContent(type);

            default:
                return getDynamicContent(type) || 'Something seems wrong...';
        }
    },

    // ========================================================================
    // RENDERING - CotDG Style
    // ========================================================================

    /**
     * Render dialogue UI with CotDG-style ornate frames
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active || !this.currentNode) return;

        const canvas = ctx.canvas;

        // Get design system colors (with fallbacks)
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
            bgDark: '#141414',
            bgMedium: '#1c1c1c',
            frameGold: '#b8860b',
            frameGoldBright: '#daa520',
            frameGoldDark: '#8b6914',
            textPrimary: '#efe4b0',
            textSecondary: '#b8a878',
            textMuted: '#706850',
            boneWhite: '#f5f5dc'
        };

        // Atmospheric vignette background
        this._renderVignette(ctx, canvas.width, canvas.height);

        // Calculate total height needed (box + responses)
        const responses = this.currentNode.responses || [];
        const responsesHeight = responses.length * (this.OPTION_HEIGHT + 8);
        const totalHeight = this.BOX_HEIGHT + responsesHeight + 25;

        // Calculate box position - center vertically with room for responses
        const boxX = (canvas.width - this.BOX_WIDTH) / 2;
        const boxY = (canvas.height - totalHeight) / 2;

        // Draw dialogue box with temple frame
        this._renderDialogueBox(ctx, boxX, boxY, colors);

        // Draw speaker name plate
        this._renderSpeakerName(ctx, boxX, boxY, colors);

        // Draw text with parchment styling
        this._renderText(ctx, boxX, boxY, colors);

        // Draw responses as stone buttons
        if (!this.animatingText) {
            this._renderResponses(ctx, boxX, boxY, colors);
        }

        // Draw continue prompt
        if (this.animatingText) {
            this._renderContinuePrompt(ctx, boxX, boxY, colors);
        }
    },

    /**
     * Render atmospheric vignette overlay
     * @private
     */
    _renderVignette(ctx, width, height) {
        // Dark gradient vignette
        const vignette = ctx.createRadialGradient(
            width / 2, height / 2, height * 0.2,
            width / 2, height / 2, height * 0.8
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
        vignette.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.85)');

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
    },

    /**
     * Render the dialogue box with CotDG temple frame
     * @private
     */
    _renderDialogueBox(ctx, x, y, colors) {
        ctx.save();

        // Use temple frame if available, otherwise fallback
        if (typeof drawTempleFrame === 'function') {
            drawTempleFrame(ctx, x, y, this.BOX_WIDTH, this.BOX_HEIGHT, {
                bgColor: colors.bgDark || '#141414',
                frameColor: colors.frameGold || '#b8860b',
                frameColorDark: colors.frameGoldDark || '#8b6914',
                frameWidth: 5,
                cornerSize: 18,
                pattern: true,
                innerGlow: true
            });
        } else {
            // Fallback to basic panel
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x + 5, y + 5, this.BOX_WIDTH, this.BOX_HEIGHT);

            ctx.fillStyle = colors.bgDark || '#141414';
            ctx.fillRect(x, y, this.BOX_WIDTH, this.BOX_HEIGHT);

            ctx.strokeStyle = colors.frameGold || '#b8860b';
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, this.BOX_WIDTH, this.BOX_HEIGHT);
        }

        // Inner decorative divider at top
        if (typeof drawOrnateDivider === 'function') {
            drawOrnateDivider(ctx, x + 30, y + this.BOX_HEIGHT - 25, this.BOX_WIDTH - 60, {
                color: colors.frameGoldDark || '#8b6914',
                colorDark: 'rgba(139, 105, 20, 0.3)',
                emblem: 'diamond',
                emblemSize: 8
            });
        }

        ctx.restore();
    },

    /**
     * Render speaker name plate with ornate styling
     * @private
     */
    _renderSpeakerName(ctx, boxX, boxY, colors) {
        if (!this.currentNPC) return;

        ctx.save();

        // Calculate name width dynamically
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.heading : 'bold 16px Georgia, serif';
        const nameWidth = Math.max(180, ctx.measureText(this.currentNPC.name).width + 50);
        const nameHeight = 32;
        const nameX = boxX + 25;
        const nameY = boxY - nameHeight + 8;

        // Name plate shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(nameX + 3, nameY + 3, nameWidth, nameHeight);

        // Name plate background gradient
        const nameGrad = ctx.createLinearGradient(nameX, nameY, nameX, nameY + nameHeight);
        nameGrad.addColorStop(0, colors.bgMedium || '#1c1c1c');
        nameGrad.addColorStop(0.5, colors.bgDark || '#141414');
        nameGrad.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = nameGrad;
        ctx.fillRect(nameX, nameY, nameWidth, nameHeight);

        // Gold border with bright top edge
        ctx.strokeStyle = colors.frameGold || '#b8860b';
        ctx.lineWidth = 2;
        ctx.strokeRect(nameX, nameY, nameWidth, nameHeight);

        // Bright top edge highlight
        ctx.strokeStyle = colors.frameGoldBright || '#daa520';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nameX + 1, nameY + 1);
        ctx.lineTo(nameX + nameWidth - 1, nameY + 1);
        ctx.stroke();

        // Corner accents
        const accentSize = 6;
        ctx.fillStyle = colors.frameGold || '#b8860b';

        // Top-left corner
        ctx.fillRect(nameX - 2, nameY - 2, accentSize, 2);
        ctx.fillRect(nameX - 2, nameY - 2, 2, accentSize);

        // Top-right corner
        ctx.fillRect(nameX + nameWidth - accentSize + 2, nameY - 2, accentSize, 2);
        ctx.fillRect(nameX + nameWidth, nameY - 2, 2, accentSize);

        // Name text with shadow
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.heading : 'bold 16px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Text shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(this.currentNPC.name, nameX + 13, nameY + nameHeight / 2 + 2);

        // Main text in bone white
        ctx.fillStyle = colors.boneWhite || '#f5f5dc';
        ctx.fillText(this.currentNPC.name, nameX + 12, nameY + nameHeight / 2);

        // Title (smaller, to the right or below)
        if (this.currentNPC.title) {
            ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.tiny : '10px Georgia, serif';
            ctx.fillStyle = colors.textMuted || '#706850';
            const titleX = nameX + ctx.measureText(this.currentNPC.name).width + 20;

            if (titleX + ctx.measureText(this.currentNPC.title).width < nameX + nameWidth - 10) {
                ctx.fillText('- ' + this.currentNPC.title, titleX, nameY + nameHeight / 2);
            }
        }

        ctx.restore();
    },

    /**
     * Render dialogue text with parchment styling
     * @private
     */
    _renderText(ctx, boxX, boxY, colors) {
        ctx.save();

        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.body : '14px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Word wrap
        const maxWidth = this.BOX_WIDTH - 50;
        const lineHeight = 22;
        const startX = boxX + 25;
        const startY = boxY + 30;

        const lines = this._wrapText(ctx, this.displayedText, maxWidth);

        lines.forEach((line, index) => {
            const lineY = startY + index * lineHeight;

            // Text shadow for depth
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillText(line, startX + 1, lineY + 1);

            // Main text in parchment color
            ctx.fillStyle = colors.textPrimary || '#efe4b0';
            ctx.fillText(line, startX, lineY);
        });

        ctx.restore();
    },

    /**
     * Render response options as stone buttons
     * @private
     */
    _renderResponses(ctx, boxX, boxY, colors) {
        const responses = this.currentNode.responses || [];
        if (responses.length === 0) return;

        const startY = boxY + this.BOX_HEIGHT + 12;
        const buttonHeight = this.OPTION_HEIGHT + 4;
        const buttonSpacing = 6;

        responses.forEach((response, index) => {
            const optionY = startY + index * (buttonHeight + buttonSpacing);
            const isSelected = index === this.selectedOption;

            ctx.save();

            // Use stone button if available
            if (typeof drawStoneButton === 'function') {
                drawStoneButton(ctx, boxX, optionY, this.BOX_WIDTH, buttonHeight, {
                    text: '',  // We'll draw text separately for more control
                    isHovered: isSelected,
                    isPressed: false,
                    isDisabled: false
                });
            } else {
                // Fallback button rendering
                ctx.fillStyle = isSelected ?
                    (colors.templeStoneLight || '#5a5a50') :
                    (colors.templeStone || '#4a4a40');
                ctx.fillRect(boxX, optionY, this.BOX_WIDTH, buttonHeight);

                ctx.strokeStyle = isSelected ?
                    (colors.frameGold || '#b8860b') :
                    (colors.border || '#3a3530');
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.strokeRect(boxX, optionY, this.BOX_WIDTH, buttonHeight);
            }

            // Number badge
            const badgeSize = 22;
            const badgeX = boxX + 10;
            const badgeY = optionY + (buttonHeight - badgeSize) / 2;

            // Badge background
            ctx.fillStyle = isSelected ? (colors.frameGold || '#b8860b') : (colors.bgDarkest || '#0d0d0d');
            ctx.beginPath();
            ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // Badge border
            ctx.strokeStyle = isSelected ? (colors.frameGoldBright || '#daa520') : (colors.frameGoldDark || '#8b6914');
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Number text
            ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.hotkey : 'bold 12px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isSelected ? '#000' : (colors.frameGold || '#b8860b');
            ctx.fillText(`${index + 1}`, badgeX + badgeSize / 2, badgeY + badgeSize / 2);

            // Response text
            ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.body : '14px Georgia, serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Text shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillText(response.text, boxX + 42, optionY + buttonHeight / 2 + 1);

            // Main text
            ctx.fillStyle = isSelected ? (colors.boneWhite || '#f5f5dc') : (colors.textSecondary || '#b8a878');
            ctx.fillText(response.text, boxX + 40, optionY + buttonHeight / 2);

            // Selection indicator (gold arrow)
            if (isSelected) {
                ctx.fillStyle = colors.frameGoldBright || '#daa520';

                // Animated glow
                const pulse = typeof getPulseValue === 'function' ? getPulseValue(0.004) : 0.5;
                ctx.shadowColor = colors.frameGold || '#b8860b';
                ctx.shadowBlur = 5 + pulse * 5;

                // Arrow
                ctx.beginPath();
                ctx.moveTo(boxX - 8, optionY + buttonHeight / 2 - 6);
                ctx.lineTo(boxX - 8, optionY + buttonHeight / 2 + 6);
                ctx.lineTo(boxX - 2, optionY + buttonHeight / 2);
                ctx.closePath();
                ctx.fill();

                ctx.shadowBlur = 0;
            }

            ctx.restore();
        });
    },

    /**
     * Render continue prompt with pulsing gold text
     * @private
     */
    _renderContinuePrompt(ctx, boxX, boxY, colors) {
        ctx.save();

        const pulse = typeof getPulseValue === 'function' ? getPulseValue(0.005) : (0.5 + Math.sin(Date.now() / 200) * 0.3);
        const alpha = 0.4 + pulse * 0.4;

        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.small : '12px Georgia, serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        // Text shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText('Press SPACE or ENTER to continue...', boxX + this.BOX_WIDTH - 22, boxY + this.BOX_HEIGHT - 12);

        // Pulsing gold text
        const goldColor = colors.frameGold || '#b8860b';
        ctx.fillStyle = `rgba(${parseInt(goldColor.slice(1, 3), 16)}, ${parseInt(goldColor.slice(3, 5), 16)}, ${parseInt(goldColor.slice(5, 7), 16)}, ${alpha})`;
        ctx.fillText('Press SPACE or ENTER to continue...', boxX + this.BOX_WIDTH - 20, boxY + this.BOX_HEIGHT - 10);

        // Small animated diamond
        const diamondX = boxX + this.BOX_WIDTH - 20 - ctx.measureText('Press SPACE or ENTER to continue...').width - 15;
        const diamondY = boxY + this.BOX_HEIGHT - 18;
        const diamondSize = 4 + pulse * 2;

        ctx.fillStyle = colors.frameGoldBright || '#daa520';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(diamondX, diamondY - diamondSize);
        ctx.lineTo(diamondX + diamondSize * 0.7, diamondY);
        ctx.lineTo(diamondX, diamondY + diamondSize);
        ctx.lineTo(diamondX - diamondSize * 0.7, diamondY);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
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
