// ============================================================================
// SHRINE UI SYSTEM
// ============================================================================
// Handles shrine interaction - displays boon choices and grants selection
// ============================================================================

// ============================================================================
// STATE
// ============================================================================

const ShrineUI = {
    isOpen: false,
    currentShrine: null,
    boonChoices: [],      // Array of boon IDs being offered
    selectedIndex: 0,
    hoveredIndex: -1
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Open the shrine UI with boon choices
 * @param {object} shrine - The shrine decoration being interacted with
 * @returns {boolean} - True if UI opened successfully
 */
function openShrineUI(shrine) {
    if (!shrine) return false;

    // Check if shrine already used
    if (shrine.used) {
        if (typeof addMessage === 'function') {
            addMessage('This shrine has already granted its blessing.');
        }
        return false;
    }

    // Get boon choices from BoonSystem
    if (typeof BoonSystem === 'undefined') {
        console.error('[ShrineUI] BoonSystem not found');
        return false;
    }

    // Check if shrine already has stored boons (from previous open)
    // This prevents re-randomizing when player closes and reopens
    let boonIds;
    if (shrine.storedBoons && shrine.storedBoons.length > 0) {
        boonIds = shrine.storedBoons;
        console.log('[ShrineUI] Using stored boons from shrine:', boonIds);
    } else {
        // First time opening - generate and store boons on the shrine
        boonIds = BoonSystem.getShrineBoons(3);
        if (!boonIds || boonIds.length === 0) {
            if (typeof addMessage === 'function') {
                addMessage('The shrine has no more blessings to offer.');
            }
            return false;
        }
        // Store boons on the shrine object so they persist
        shrine.storedBoons = [...boonIds];
        console.log('[ShrineUI] Generated and stored new boons:', boonIds);
    }

    ShrineUI.isOpen = true;
    ShrineUI.currentShrine = shrine;
    ShrineUI.boonChoices = boonIds;
    ShrineUI.selectedIndex = 0;
    ShrineUI.hoveredIndex = -1;

    // Pause game while UI is open
    game.state = 'shrine';

    if (typeof addMessage === 'function') {
        addMessage('The shrine glows with divine energy...');
    }

    return true;
}

/**
 * Close the shrine UI without selecting
 */
function closeShrineUI() {
    ShrineUI.isOpen = false;
    ShrineUI.currentShrine = null;
    ShrineUI.boonChoices = [];
    ShrineUI.selectedIndex = 0;
    ShrineUI.hoveredIndex = -1;

    // Resume game
    game.state = 'playing';
}

/**
 * Select a boon from the shrine
 * @param {number} index - Index of boon to select
 */
function selectShrineBoon(index) {
    if (index < 0 || index >= ShrineUI.boonChoices.length) return;

    const boonId = ShrineUI.boonChoices[index];

    // Grant the boon
    if (typeof BoonSystem !== 'undefined') {
        const success = BoonSystem.grantBoon(boonId);

        if (success) {
            const boon = typeof BOONS !== 'undefined' ? BOONS[boonId] : null;
            if (typeof addMessage === 'function') {
                addMessage(`Received blessing: ${boon?.name || boonId}!`, '#FFD700');
            }

            // Mark shrine as used
            if (ShrineUI.currentShrine) {
                ShrineUI.currentShrine.used = true;
                ShrineUI.currentShrine.interactable = false;

                // Update visual
                if (ShrineUI.currentShrine.data) {
                    ShrineUI.currentShrine.data.glow = false;
                    ShrineUI.currentShrine.data.color = '#666666';
                }
            }
        } else {
            if (typeof addMessage === 'function') {
                addMessage('Could not receive blessing.');
            }
        }
    }

    closeShrineUI();
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

/**
 * Handle keyboard input for shrine UI
 * @param {KeyboardEvent} e
 * @returns {boolean} - True if input was handled
 */
function handleShrineInput(e) {
    if (!ShrineUI.isOpen) return false;

    switch (e.key) {
        case 'Escape':
            closeShrineUI();
            return true;

        case 'ArrowUp':
        case 'w':
        case 'W':
            ShrineUI.selectedIndex = Math.max(0, ShrineUI.selectedIndex - 1);
            return true;

        case 'ArrowDown':
        case 's':
        case 'S':
            ShrineUI.selectedIndex = Math.min(ShrineUI.boonChoices.length - 1, ShrineUI.selectedIndex + 1);
            return true;

        case 'Enter':
        case ' ':
            selectShrineBoon(ShrineUI.selectedIndex);
            return true;

        case '1':
            if (ShrineUI.boonChoices.length >= 1) selectShrineBoon(0);
            return true;

        case '2':
            if (ShrineUI.boonChoices.length >= 2) selectShrineBoon(1);
            return true;

        case '3':
            if (ShrineUI.boonChoices.length >= 3) selectShrineBoon(2);
            return true;
    }

    return false;
}

/**
 * Handle mouse click for shrine UI
 * @param {number} mouseX - Canvas X coordinate
 * @param {number} mouseY - Canvas Y coordinate
 * @returns {boolean} - True if click was handled
 */
function handleShrineClick(mouseX, mouseY) {
    if (!ShrineUI.isOpen) return false;

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return false;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const panelWidth = 400;
    const panelHeight = 350;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    // Check if click is outside panel (close)
    if (mouseX < panelX || mouseX > panelX + panelWidth ||
        mouseY < panelY || mouseY > panelY + panelHeight) {
        closeShrineUI();
        return true;
    }

    // Check boon option clicks
    const optionStartY = panelY + 80;
    const optionHeight = 80;

    for (let i = 0; i < ShrineUI.boonChoices.length; i++) {
        const optY = optionStartY + i * optionHeight;
        if (mouseY >= optY && mouseY < optY + optionHeight - 5) {
            selectShrineBoon(i);
            return true;
        }
    }

    return true;
}

/**
 * Handle mouse move for shrine UI hover effects
 * @param {number} mouseX
 * @param {number} mouseY
 */
function handleShrineMouseMove(mouseX, mouseY) {
    if (!ShrineUI.isOpen) return;

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const panelWidth = 400;
    const panelHeight = 350;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    const optionStartY = panelY + 80;
    const optionHeight = 80;

    ShrineUI.hoveredIndex = -1;

    for (let i = 0; i < ShrineUI.boonChoices.length; i++) {
        const optY = optionStartY + i * optionHeight;
        if (mouseY >= optY && mouseY < optY + optionHeight - 5 &&
            mouseX >= panelX + 10 && mouseX <= panelX + panelWidth - 10) {
            ShrineUI.hoveredIndex = i;
            break;
        }
    }
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render the shrine UI
 * @param {CanvasRenderingContext2D} ctx
 */
function renderShrineUI(ctx) {
    if (!ShrineUI.isOpen) return;

    const canvas = ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Panel dimensions
    const panelWidth = 400;
    const panelHeight = 350;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Panel background
    ctx.fillStyle = 'rgba(20, 15, 30, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border (golden glow)
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Inner glow
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 5, panelY + 5, panelWidth - 10, panelHeight - 10);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Divine Blessing', centerX, panelY + 40);

    // Subtitle
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '14px monospace';
    ctx.fillText('Choose a boon (press 1-3 or click)', centerX, panelY + 65);

    // Boon options
    const optionStartY = panelY + 80;
    const optionHeight = 80;
    const optionPadding = 10;

    for (let i = 0; i < ShrineUI.boonChoices.length; i++) {
        const boonId = ShrineUI.boonChoices[i];
        const boon = typeof BOONS !== 'undefined' ? BOONS[boonId] : null;

        if (!boon) continue;

        const optY = optionStartY + i * optionHeight;
        const isSelected = i === ShrineUI.selectedIndex;
        const isHovered = i === ShrineUI.hoveredIndex;

        // Option background
        if (isSelected || isHovered) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        } else {
            ctx.fillStyle = 'rgba(40, 35, 50, 0.8)';
        }
        ctx.fillRect(panelX + optionPadding, optY, panelWidth - optionPadding * 2, optionHeight - 5);

        // Option border
        ctx.strokeStyle = isSelected ? '#FFD700' : (isHovered ? '#FFEA70' : '#555555');
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(panelX + optionPadding, optY, panelWidth - optionPadding * 2, optionHeight - 5);

        // Number indicator
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`[${i + 1}]`, panelX + optionPadding + 10, optY + 25);

        // Icon
        ctx.font = '28px monospace';
        ctx.fillText(boon.icon || '?', panelX + optionPadding + 55, optY + 30);

        // Boon name
        ctx.fillStyle = boon.color || '#FFFFFF';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(boon.name, panelX + optionPadding + 95, optY + 25);

        // Boon description
        ctx.fillStyle = '#BBBBBB';
        ctx.font = '12px monospace';
        const desc = boon.description || '';
        ctx.fillText(desc.substring(0, 45), panelX + optionPadding + 95, optY + 45);
        if (desc.length > 45) {
            ctx.fillText(desc.substring(45, 90), panelX + optionPadding + 95, optY + 60);
        }

        // Current stacks indicator
        const currentStacks = typeof BoonSystem !== 'undefined' ? BoonSystem.hasBoon(boonId) : 0;
        if (currentStacks > 0 && boon.stackable) {
            ctx.fillStyle = '#888888';
            ctx.font = '11px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`(${currentStacks}/${boon.maxStacks})`, panelX + panelWidth - optionPadding - 10, optY + 25);
            ctx.textAlign = 'left';
        }
    }

    // Close hint
    ctx.fillStyle = '#666666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC or click outside to cancel', centerX, panelY + panelHeight - 15);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ShrineUI = ShrineUI;
    window.openShrineUI = openShrineUI;
    window.closeShrineUI = closeShrineUI;
    window.selectShrineBoon = selectShrineBoon;
    window.handleShrineInput = handleShrineInput;
    window.handleShrineClick = handleShrineClick;
    window.handleShrineMouseMove = handleShrineMouseMove;
    window.renderShrineUI = renderShrineUI;
}

// Shrine UI loaded
console.log('[ShrineUI] Shrine interaction system loaded');
