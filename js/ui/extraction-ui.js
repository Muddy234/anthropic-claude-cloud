// === js/ui/extraction-ui.js ===
// SURVIVAL EXTRACTION UPDATE: Extraction confirmation interface

// ============================================================================
// EXTRACTION UI
// ============================================================================

const ExtractionUI = {

    // State
    active: false,
    selectedOption: 0,  // 0 = Extract, 1 = Cancel

    // Layout
    PANEL_WIDTH: 500,
    PANEL_HEIGHT: 350,

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open the extraction UI
     */
    open() {
        this.active = true;
        this.selectedOption = 0;
        console.log('[ExtractionUI] Opened');
    },

    /**
     * Close the extraction UI
     */
    close() {
        this.active = false;
        if (typeof ExtractionSystem !== 'undefined') {
            ExtractionSystem.cancelExtraction();
        }
        console.log('[ExtractionUI] Closed');
    },

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    /**
     * Handle keyboard input
     * @param {string} key
     * @returns {boolean} Whether the input was handled
     */
    handleInput(key) {
        if (!this.active) return false;

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.selectedOption = 0;
                return true;

            case 'ArrowDown':
            case 's':
            case 'S':
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.selectedOption = 1;
                return true;

            case 'Enter':
            case ' ':
            case 'e':
            case 'E':
                this._confirm();
                return true;

            case 'Escape':
                this.close();
                return true;
        }

        return false;
    },

    /**
     * Confirm selection
     * @private
     */
    _confirm() {
        if (this.selectedOption === 0) {
            // Extract
            if (typeof ExtractionSystem !== 'undefined') {
                ExtractionSystem.confirmExtraction();
            }
            this.active = false;
        } else {
            // Cancel
            this.close();
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the extraction UI
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active && game.state !== 'extraction') return;

        this.active = true;  // Ensure active if state is extraction

        const canvas = ctx.canvas;

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate panel position
        const panelX = (canvas.width - this.PANEL_WIDTH) / 2;
        const panelY = (canvas.height - this.PANEL_HEIGHT) / 2;

        // Draw panel
        this._renderPanel(ctx, panelX, panelY);

        // Draw content
        this._renderContent(ctx, panelX, panelY);

        // Draw buttons
        this._renderButtons(ctx, panelX, panelY);
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

        // Border with cyan glow
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.PANEL_WIDTH, this.PANEL_HEIGHT);
        ctx.shadowBlur = 0;

        // Title
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ffff';
        ctx.fillText('EXTRACTION SHAFT', x + this.PANEL_WIDTH / 2, y + 40);
    },

    /**
     * Render content (items, gold summary)
     * @private
     */
    _renderContent(ctx, panelX, panelY) {
        const centerX = panelX + this.PANEL_WIDTH / 2;
        let yOffset = panelY + 80;

        // Description
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Extract to the surface with your loot?', centerX, yOffset);
        yOffset += 40;

        // Show what will be extracted
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Items to Extract:', centerX, yOffset);
        yOffset += 25;

        // Count items
        const inventory = game.player?.inventory || [];
        const itemCount = inventory.reduce((sum, item) => sum + (item.count || 1), 0);
        const gold = game.gold || 0;

        ctx.font = '14px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${itemCount} item${itemCount !== 1 ? 's' : ''} in inventory`, centerX, yOffset);
        yOffset += 22;

        ctx.fillStyle = '#FFD700';
        ctx.fillText(`${gold} gold`, centerX, yOffset);
        yOffset += 35;

        // Warning about extraction
        ctx.font = '12px Arial';
        ctx.fillStyle = '#888';
        ctx.fillText('Items and gold will be stored in your bank.', centerX, yOffset);
        yOffset += 18;
        ctx.fillText('You will return to the village.', centerX, yOffset);

        // Floor/shaft info
        if (game.activeExtractionPoint) {
            yOffset += 30;
            ctx.font = '14px Arial';
            ctx.fillStyle = '#00ffff';
            const floor = sessionState?.currentFloor || 1;
            ctx.fillText(`Extracting from Floor ${floor}`, centerX, yOffset);
        }
    },

    /**
     * Render confirm/cancel buttons
     * @private
     */
    _renderButtons(ctx, panelX, panelY) {
        const buttonY = panelY + this.PANEL_HEIGHT - 80;
        const buttonWidth = 150;
        const buttonHeight = 45;
        const buttonGap = 40;

        const extractX = panelX + this.PANEL_WIDTH / 2 - buttonWidth - buttonGap / 2;
        const cancelX = panelX + this.PANEL_WIDTH / 2 + buttonGap / 2;

        // Extract button
        const extractSelected = this.selectedOption === 0;
        if (extractSelected) {
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 15;
        }
        ctx.fillStyle = extractSelected ? '#2ecc71' : '#1a5a3a';
        ctx.fillRect(extractX, buttonY, buttonWidth, buttonHeight);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = extractSelected ? '#fff' : '#4a8a6a';
        ctx.lineWidth = 2;
        ctx.strokeRect(extractX, buttonY, buttonWidth, buttonHeight);

        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('EXTRACT', extractX + buttonWidth / 2, buttonY + 30);

        // Cancel button
        const cancelSelected = this.selectedOption === 1;
        if (cancelSelected) {
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 15;
        }
        ctx.fillStyle = cancelSelected ? '#e74c3c' : '#5a2a2a';
        ctx.fillRect(cancelX, buttonY, buttonWidth, buttonHeight);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = cancelSelected ? '#fff' : '#8a4a4a';
        ctx.lineWidth = 2;
        ctx.strokeRect(cancelX, buttonY, buttonWidth, buttonHeight);

        ctx.fillStyle = '#fff';
        ctx.fillText('CANCEL', cancelX + buttonWidth / 2, buttonY + 30);

        // Controls hint
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('[Arrow Keys] Select | [Enter/E] Confirm | [ESC] Cancel',
            panelX + this.PANEL_WIDTH / 2, panelY + this.PANEL_HEIGHT - 15);
    }
};

// ============================================================================
// KEYBOARD HOOK
// ============================================================================

window.addEventListener('keydown', (e) => {
    if (game.state === 'extraction' || game.state === GAME_STATES?.EXTRACTION) {
        if (ExtractionUI.handleInput(e.key)) {
            e.preventDefault();
        }
    }
});

// ============================================================================
// EXPORTS
// ============================================================================

window.ExtractionUI = ExtractionUI;

console.log('[ExtractionUI] Extraction UI loaded');
