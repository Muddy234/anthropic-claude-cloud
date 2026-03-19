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
    hoveredIndex: -1,

    // Replacement mode (when player has max boons)
    replacementMode: false,
    selectedNewBoon: -1,      // Index of new boon chosen in step 1
    replaceHoveredIndex: -1,  // Hovered existing boon for replacement

    // Card entrance animation
    shrineOpenTime: 0         // performance.now() when shrine opened
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
    ShrineUI.shrineOpenTime = performance.now();

    // Check if replacement mode is needed (player at max boons)
    const uniqueBoons = Object.keys(BoonSystem.activeBoons).length;
    const maxBoons = typeof BOON_CONFIG !== 'undefined' ? BOON_CONFIG.maxBoons : 8;
    ShrineUI.replacementMode = uniqueBoons >= maxBoons;
    ShrineUI.selectedNewBoon = -1;
    ShrineUI.replaceHoveredIndex = -1;

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
    ShrineUI.replacementMode = false;
    ShrineUI.selectedNewBoon = -1;
    ShrineUI.replaceHoveredIndex = -1;

    // Resume game
    game.state = 'playing';
}

/**
 * Select a boon from the shrine
 * @param {number} index - Index of boon to select
 */
function selectShrineBoon(index) {
    if (index < 0 || index >= ShrineUI.boonChoices.length) return;

    // In replacement mode, step 1: select the new boon, then wait for replacement target
    if (ShrineUI.replacementMode && ShrineUI.selectedNewBoon === -1) {
        ShrineUI.selectedNewBoon = index;
        if (typeof addMessage === 'function') {
            const boonId = ShrineUI.boonChoices[index];
            const boon = typeof BOONS !== 'undefined' ? BOONS[boonId] : null;
            addMessage(`Selected ${boon?.name || boonId}. Now choose a boon to replace.`, '#FFD700');
        }
        return;
    }

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
            markShrineUsed();
        } else {
            if (typeof addMessage === 'function') {
                addMessage('Could not receive blessing.');
            }
        }
    }

    closeShrineUI();
}

/**
 * Replace an existing boon with the selected new boon (replacement mode step 2)
 * @param {number} existingIndex - Index into the active boon list
 */
function replaceBoonAtIndex(existingIndex) {
    if (ShrineUI.selectedNewBoon < 0 || ShrineUI.selectedNewBoon >= ShrineUI.boonChoices.length) return;
    if (typeof BoonSystem === 'undefined') return;

    const activeBoonList = BoonSystem.getActiveBoonList();
    if (existingIndex < 0 || existingIndex >= activeBoonList.length) return;

    const oldBoon = activeBoonList[existingIndex].boon;
    const newBoonId = ShrineUI.boonChoices[ShrineUI.selectedNewBoon];

    // Remove the old boon
    BoonSystem.removeBoon(oldBoon.id, true);

    // Grant the new boon
    const success = BoonSystem.grantBoon(newBoonId);

    if (success) {
        const newBoon = typeof BOONS !== 'undefined' ? BOONS[newBoonId] : null;
        if (typeof addMessage === 'function') {
            addMessage(`Replaced ${oldBoon.name} with ${newBoon?.name || newBoonId}!`, '#FFD700');
        }
        markShrineUsed();
    } else {
        // Re-grant old boon if replacement failed
        BoonSystem.grantBoon(oldBoon.id);
        if (typeof addMessage === 'function') {
            addMessage('Could not replace blessing.');
        }
    }

    closeShrineUI();
}

/**
 * Mark the current shrine as used and update its visual
 */
function markShrineUsed() {
    if (ShrineUI.currentShrine) {
        ShrineUI.currentShrine.used = true;
        ShrineUI.currentShrine.interactable = false;

        // Update visual
        if (ShrineUI.currentShrine.data) {
            ShrineUI.currentShrine.data.glow = false;
            ShrineUI.currentShrine.data.color = '#666666';
        }
    }
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

    // Replacement mode step 2: selecting which existing boon to replace
    if (ShrineUI.replacementMode && ShrineUI.selectedNewBoon >= 0) {
        const activeBoonList = typeof BoonSystem !== 'undefined' ? BoonSystem.getActiveBoonList() : [];

        switch (e.key) {
            case 'Escape':
                // Go back to step 1 (cancel replacement target selection)
                ShrineUI.selectedNewBoon = -1;
                return true;

            case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': {
                const idx = parseInt(e.key) - 1;
                if (idx < activeBoonList.length) {
                    replaceBoonAtIndex(idx);
                }
                return true;
            }

            case 'Enter':
            case ' ':
                if (ShrineUI.replaceHoveredIndex >= 0 && ShrineUI.replaceHoveredIndex < activeBoonList.length) {
                    replaceBoonAtIndex(ShrineUI.replaceHoveredIndex);
                }
                return true;
        }
        return true;
    }

    // Normal mode (or replacement mode step 1)
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

    // Panel dimensions depend on replacement mode
    const panelWidth = ShrineUI.replacementMode ? 520 : 400;
    const cardHeight = 110; // Taller cards with stat previews
    const panelHeight = ShrineUI.replacementMode ? 520 : 80 + ShrineUI.boonChoices.length * cardHeight + 40;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    // Replacement mode step 2: clicking on existing boons
    if (ShrineUI.replacementMode && ShrineUI.selectedNewBoon >= 0) {
        const activeBoonList = typeof BoonSystem !== 'undefined' ? BoonSystem.getActiveBoonList() : [];
        const existingStartY = panelY + 80 + ShrineUI.boonChoices.length * cardHeight + 30;
        const existingCardW = 55;
        const existingCardH = 50;
        const existingSpacing = 4;
        const existingStartX = panelX + 15;

        for (let i = 0; i < activeBoonList.length; i++) {
            const ex = existingStartX + i * (existingCardW + existingSpacing);
            const ey = existingStartY;
            if (mouseX >= ex && mouseX <= ex + existingCardW &&
                mouseY >= ey && mouseY <= ey + existingCardH) {
                replaceBoonAtIndex(i);
                return true;
            }
        }

        // If clicking outside the existing boon area but inside panel, go back to step 1
        if (mouseX >= panelX && mouseX <= panelX + panelWidth &&
            mouseY >= panelY && mouseY <= panelY + panelHeight) {
            // Check if clicking new boon cards to re-select
            const optionStartY = panelY + 80;
            for (let i = 0; i < ShrineUI.boonChoices.length; i++) {
                const optY = optionStartY + i * cardHeight;
                if (mouseY >= optY && mouseY < optY + cardHeight - 5) {
                    ShrineUI.selectedNewBoon = i;
                    return true;
                }
            }
            return true;
        }

        closeShrineUI();
        return true;
    }

    // Check if click is outside panel (close)
    if (mouseX < panelX || mouseX > panelX + panelWidth ||
        mouseY < panelY || mouseY > panelY + panelHeight) {
        closeShrineUI();
        return true;
    }

    // Check boon option clicks (new boons offered)
    const optionStartY = panelY + 80;
    for (let i = 0; i < ShrineUI.boonChoices.length; i++) {
        const optY = optionStartY + i * cardHeight;
        if (mouseY >= optY && mouseY < optY + cardHeight - 5) {
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

    const panelWidth = ShrineUI.replacementMode ? 520 : 400;
    const cardHeight = 110;
    const panelHeight = ShrineUI.replacementMode ? 520 : 80 + ShrineUI.boonChoices.length * cardHeight + 40;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    const optionStartY = panelY + 80;

    ShrineUI.hoveredIndex = -1;
    ShrineUI.replaceHoveredIndex = -1;

    // Hover on new boon offerings
    for (let i = 0; i < ShrineUI.boonChoices.length; i++) {
        const optY = optionStartY + i * cardHeight;
        if (mouseY >= optY && mouseY < optY + cardHeight - 5 &&
            mouseX >= panelX + 10 && mouseX <= panelX + panelWidth - 10) {
            ShrineUI.hoveredIndex = i;
            break;
        }
    }

    // Hover on existing boons in replacement mode step 2
    if (ShrineUI.replacementMode && ShrineUI.selectedNewBoon >= 0) {
        const activeBoonList = typeof BoonSystem !== 'undefined' ? BoonSystem.getActiveBoonList() : [];
        const existingStartY = panelY + 80 + ShrineUI.boonChoices.length * cardHeight + 30;
        const existingCardW = 55;
        const existingCardH = 50;
        const existingSpacing = 4;
        const existingStartX = panelX + 15;

        for (let i = 0; i < activeBoonList.length; i++) {
            const ex = existingStartX + i * (existingCardW + existingSpacing);
            const ey = existingStartY;
            if (mouseX >= ex && mouseX <= ex + existingCardW &&
                mouseY >= ey && mouseY <= ey + existingCardH) {
                ShrineUI.replaceHoveredIndex = i;
                break;
            }
        }
    }
}

// ============================================================================
// STAT PREVIEW
// ============================================================================

/**
 * Compute a stat preview showing current vs projected values when a boon is applied
 * @param {Object} boon - The boon definition from BOONS
 * @param {Object} player - The player object with statStacks
 * @returns {Array} Array of { statName, current, projected, isIncrease }
 */
function computeStatPreview(boon, player) {
    const previews = [];
    if (!player || !player.statStacks) return previews;

    const STAT_DISPLAY_NAMES = {
        maxHp: 'Max HP', damage: 'Damage', magicDamage: 'Magic Dmg',
        defense: 'Defense', speed: 'Speed', attackSpeed: 'Atk Speed',
        critChance: 'Crit %', critDamage: 'Crit Dmg',
        fireDamagePercent: 'Fire Dmg', iceDamagePercent: 'Ice Dmg',
        poisonDamagePercent: 'Poison Dmg', shadowDamagePercent: 'Shadow Dmg',
        fireResist: 'Fire Res', iceResist: 'Ice Res',
        poisonResist: 'Poison Res', shadowResist: 'Shadow Res',
        maxStamina: 'Max Stamina', staminaRegenRate: 'Stam Regen',
        staminaKillRefund: 'Kill Refund', healingReceived: 'Healing',
        igniteChance: 'Ignite %', freezeChance: 'Freeze %',
        poisonChance: 'Poison %', lifestealPercent: 'Lifesteal',
        thornsDamage: 'Thorns', goldFindPercent: 'Gold Find',
        lootRarityBonus: 'Loot Bonus', cooldownReduction: 'CDR',
        aoeRadiusBonus: 'AoE Bonus'
    };

    // Gather effects from boon.effects (array) or boon.effect (singular)
    let effects = [];
    if (boon.effects && Array.isArray(boon.effects)) {
        effects = boon.effects;
    } else if (boon.effect && boon.effect.stat && boon.effect.type !== 'special' && boon.effect.type !== 'conditional') {
        effects = [boon.effect];
    }

    // For boons without direct stat effects, try to extract from effect structure
    if (effects.length === 0 && boon.effect) {
        const eff = boon.effect;
        // Handle tradeoff boons that have bonus/penalty with stat keys
        if (eff.type === 'tradeoff' && eff.bonus) {
            for (const [stat, val] of Object.entries(eff.bonus)) {
                if (STAT_DISPLAY_NAMES[stat] || player.statStacks[stat]) {
                    effects.push({ stat, value: val * 100, type: 'multiplicative' });
                }
            }
            if (eff.penalty) {
                for (const [stat, val] of Object.entries(eff.penalty)) {
                    if (stat === 'damageTaken' || stat === 'hpDrain') continue;
                    if (STAT_DISPLAY_NAMES[stat] || player.statStacks[stat]) {
                        effects.push({ stat, value: -val * 100, type: 'multiplicative' });
                    }
                }
            }
        }
    }

    for (const effect of effects) {
        if (effect.type === 'special' || effect.type === 'conditional') continue;
        const statStack = player.statStacks[effect.stat];
        if (!statStack) continue;

        const currentValue = statStack.compute();
        const projected = statStack.clone();
        projected.addModifier(boon.id || 'preview', effect.value, effect.type);
        const newValue = projected.compute();

        previews.push({
            statName: STAT_DISPLAY_NAMES[effect.stat] || effect.stat,
            current: Math.round(currentValue * 10) / 10,
            projected: Math.round(newValue * 10) / 10,
            isIncrease: newValue > currentValue
        });
    }

    return previews;
}

// ============================================================================
// CARD ANIMATION HELPERS
// ============================================================================

/**
 * Calculate card entrance animation values
 * @param {number} cardIndex - Index of the card (0-based)
 * @returns {{ offsetY: number, opacity: number }}
 */
function getCardAnimation(cardIndex) {
    const elapsed = performance.now() - ShrineUI.shrineOpenTime;
    const staggerDelay = cardIndex * 50; // 50ms stagger between cards
    const animDuration = 300;
    const cardElapsed = elapsed - staggerDelay;

    if (cardElapsed <= 0) {
        return { offsetY: 80, opacity: 0 };
    }

    const t = Math.min(1, cardElapsed / animDuration);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - t, 3);

    return {
        offsetY: 80 * (1 - eased),
        opacity: eased
    };
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

    // Panel dimensions - larger to fit stat previews and replacement section
    const cardHeight = 110;
    const panelWidth = ShrineUI.replacementMode ? 520 : 400;
    const baseContentHeight = 80 + ShrineUI.boonChoices.length * cardHeight + 40;
    const replacementExtra = ShrineUI.replacementMode ? 100 : 0;
    const panelHeight = Math.min(canvas.height - 40, baseContentHeight + replacementExtra);
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

    // Subtitle - changes based on mode
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '14px monospace';
    if (ShrineUI.replacementMode && ShrineUI.selectedNewBoon >= 0) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('Select a boon to REPLACE (1-8 or click)', centerX, panelY + 65);
    } else if (ShrineUI.replacementMode) {
        ctx.fillText('Boons full! Choose new, then replace (1-3)', centerX, panelY + 65);
    } else {
        ctx.fillText('Choose a boon (press 1-3 or click)', centerX, panelY + 65);
    }

    // Boon options
    const optionStartY = panelY + 80;
    const optionPadding = 10;

    for (let i = 0; i < ShrineUI.boonChoices.length; i++) {
        const boonId = ShrineUI.boonChoices[i];
        const boon = typeof BOONS !== 'undefined' ? BOONS[boonId] : null;

        if (!boon) continue;

        // Card entrance animation
        const anim = getCardAnimation(i);
        if (anim.opacity <= 0) continue;

        ctx.save();
        ctx.globalAlpha = anim.opacity;

        const optY = optionStartY + i * cardHeight + anim.offsetY;
        const isSelected = i === ShrineUI.selectedIndex;
        const isHovered = i === ShrineUI.hoveredIndex;
        const isChosenForReplace = ShrineUI.replacementMode && i === ShrineUI.selectedNewBoon;

        // Option background
        if (isChosenForReplace) {
            ctx.fillStyle = 'rgba(100, 255, 100, 0.2)';
        } else if (isSelected || isHovered) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        } else {
            ctx.fillStyle = 'rgba(40, 35, 50, 0.8)';
        }
        ctx.fillRect(panelX + optionPadding, optY, panelWidth - optionPadding * 2, cardHeight - 5);

        // Option border
        if (isChosenForReplace) {
            ctx.strokeStyle = '#69f0ae';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = isSelected ? '#FFD700' : (isHovered ? '#FFEA70' : '#555555');
            ctx.lineWidth = isSelected ? 2 : 1;
        }
        ctx.strokeRect(panelX + optionPadding, optY, panelWidth - optionPadding * 2, cardHeight - 5);

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

        // --- Stat Preview Section ---
        if (game.player) {
            const previews = computeStatPreview(boon, game.player);
            if (previews.length > 0) {
                // Divider line
                const dividerY = optY + 66;
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(panelX + optionPadding + 10, dividerY);
                ctx.lineTo(panelX + panelWidth - optionPadding - 10, dividerY);
                ctx.stroke();

                // Stat preview entries
                ctx.font = '10px monospace';
                const previewStartY = dividerY + 13;
                const previewColWidth = Math.floor((panelWidth - optionPadding * 2 - 20) / Math.min(previews.length, 3));

                previews.forEach((preview, pi) => {
                    const col = pi % 3;
                    const row = Math.floor(pi / 3);
                    const px = panelX + optionPadding + 15 + col * previewColWidth;
                    const py = previewStartY + row * 13;

                    // Stat name
                    ctx.fillStyle = '#999';
                    ctx.textAlign = 'left';
                    ctx.fillText(preview.statName + ':', px, py);

                    // Current -> Projected
                    const valueText = `${preview.current} > ${preview.projected}`;
                    ctx.fillStyle = preview.isIncrease ? '#69f0ae' : '#ef5350';
                    ctx.fillText(valueText, px + ctx.measureText(preview.statName + ': ').width, py);
                });
            }
        }

        ctx.restore();
    }

    // --- Replacement Mode: Show existing boons below ---
    if (ShrineUI.replacementMode && typeof BoonSystem !== 'undefined') {
        const activeBoonList = BoonSystem.getActiveBoonList();
        const existingStartY = optionStartY + ShrineUI.boonChoices.length * cardHeight + 10;

        // Section divider
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 15, existingStartY);
        ctx.lineTo(panelX + panelWidth - 15, existingStartY);
        ctx.stroke();

        // Section label
        ctx.fillStyle = ShrineUI.selectedNewBoon >= 0 ? '#FFD700' : '#AAAAAA';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        const replaceLabel = ShrineUI.selectedNewBoon >= 0
            ? 'Click or press 1-8 to replace an existing boon:'
            : 'Your current boons:';
        ctx.fillText(replaceLabel, centerX, existingStartY + 16);

        // Render existing boon cards as compact tiles
        const existingCardW = 55;
        const existingCardH = 50;
        const existingSpacing = 4;
        const totalExistingWidth = activeBoonList.length * (existingCardW + existingSpacing) - existingSpacing;
        const existingStartX = centerX - totalExistingWidth / 2;
        const existingCardsY = existingStartY + 25;

        activeBoonList.forEach((entry, i) => {
            const boon = entry.boon;
            const ex = existingStartX + i * (existingCardW + existingSpacing);
            const ey = existingCardsY;
            const isReplaceHovered = i === ShrineUI.replaceHoveredIndex;

            // Card entrance animation for existing cards
            const existAnim = getCardAnimation(ShrineUI.boonChoices.length + i);
            ctx.save();
            ctx.globalAlpha = existAnim.opacity;

            // Card background
            const ancestor = typeof ANCESTORS !== 'undefined' && boon.ancestor ? ANCESTORS[boon.ancestor] : null;
            ctx.fillStyle = isReplaceHovered ? 'rgba(239, 83, 80, 0.35)' : 'rgba(40, 35, 50, 0.9)';
            ctx.fillRect(ex, ey + existAnim.offsetY * 0.5, existingCardW, existingCardH);

            // Card border
            ctx.strokeStyle = isReplaceHovered ? '#ef5350' : (ancestor ? ancestor.color : '#555');
            ctx.lineWidth = isReplaceHovered ? 2 : 1;
            ctx.strokeRect(ex, ey + existAnim.offsetY * 0.5, existingCardW, existingCardH);

            // Number key hint
            ctx.fillStyle = '#FFD700';
            ctx.font = '8px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`[${i + 1}]`, ex + 2, ey + existAnim.offsetY * 0.5 + 10);

            // Boon icon
            ctx.font = '18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(boon.icon || '?', ex + existingCardW / 2, ey + existAnim.offsetY * 0.5 + 28);

            // Boon name (truncated)
            ctx.fillStyle = boon.color || '#fff';
            ctx.font = '7px monospace';
            const shortName = boon.name.length > 8 ? boon.name.substring(0, 7) + '.' : boon.name;
            ctx.fillText(shortName, ex + existingCardW / 2, ey + existAnim.offsetY * 0.5 + 44);

            ctx.restore();
        });
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
    window.replaceBoonAtIndex = replaceBoonAtIndex;
    window.computeStatPreview = computeStatPreview;
    window.handleShrineInput = handleShrineInput;
    window.handleShrineClick = handleShrineClick;
    window.handleShrineMouseMove = handleShrineMouseMove;
    window.renderShrineUI = renderShrineUI;
}

// Shrine UI loaded
console.log('[ShrineUI] Shrine interaction system loaded');
