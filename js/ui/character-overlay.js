// ============================================================================
// CHARACTER OVERLAY - CotDG Inspired Stats Panel
// ============================================================================
// Opens from sidebar character icon with stylized dark temple aesthetic
// ============================================================================

// ============================================================================
// SAFE VALUE FORMATTING HELPERS (use design system functions when available)
// ============================================================================

/**
 * Safely format a value for display, handling undefined/null/NaN
 * Falls back to design system function if available
 * @param {any} value - The value to display
 * @param {Object} options - Formatting options
 * @returns {string}
 */
function safeFormatValue(value, options = {}) {
    // Use design system function if available
    if (typeof formatDisplayValue === 'function') {
        return formatDisplayValue(value, options);
    }

    // Fallback implementation
    const {
        fallback = '--',
        type = 'number',
        decimals = 0,
        max = null,
        prefix = '',
        suffix = ''
    } = options;

    // Handle missing/invalid values
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        return fallback;
    }

    // Format based on type
    switch (type) {
        case 'number':
            const num = Number(value);
            if (isNaN(num)) return fallback;
            return prefix + num.toFixed(decimals) + suffix;

        case 'percent':
            const pct = Number(value);
            if (isNaN(pct)) return fallback;
            return prefix + (pct * 100).toFixed(decimals) + '%' + suffix;

        case 'fraction':
            const current = Number(value);
            const maximum = Number(max);
            if (isNaN(current)) return fallback;
            if (isNaN(maximum) || maximum === 0) return prefix + current.toFixed(decimals) + suffix;
            return prefix + current.toFixed(decimals) + '/' + maximum.toFixed(decimals) + suffix;

        case 'text':
        default:
            return prefix + String(value) + suffix;
    }
}

/**
 * Get display name for a stat
 * Falls back to design system function if available
 * @param {string} statKey - Internal stat key
 * @param {string} format - 'full' | 'abbr' | 'icon'
 * @returns {string}
 */
function safeGetStatName(statKey, format = 'full') {
    // Use design system function if available
    if (typeof getStatDisplayName === 'function') {
        return getStatDisplayName(statKey, format);
    }

    // Fallback mapping
    const statNames = {
        str: { full: 'Strength', abbr: 'STR' },
        agi: { full: 'Agility', abbr: 'AGI' },
        int: { full: 'Intelligence', abbr: 'INT' },
        sta: { full: 'Stamina', abbr: 'STA' },
        armor: { full: 'Armor', abbr: 'ARM' },
        hp: { full: 'Health', abbr: 'HP' },
        mp: { full: 'Mana', abbr: 'MP' },
        health: { full: 'Health', abbr: 'HP' },
        mana: { full: 'Mana', abbr: 'MP' }
    };

    const key = statKey.toLowerCase().replace(/[_\s]/g, '');
    const mapping = statNames[key];

    if (!mapping) {
        // Fallback: convert camelCase to Title Case
        return statKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    }

    return mapping[format] || mapping.full;
}

/**
 * Draw styled text using design system typography
 * Falls back to basic text drawing if design system not available
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text - Text to draw
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} style - Typography style key
 * @param {string} align - Text alignment
 */
function safeDrawStyledText(ctx, text, x, y, style = 'statLabel', align = 'left') {
    // Use design system function if available
    if (typeof drawStyledText === 'function') {
        drawStyledText(ctx, text, x, y, style, align);
        return;
    }

    // Fallback implementation using UI_FONTS and UI_COLORS if available
    const fonts = typeof UI_FONTS !== 'undefined' ? UI_FONTS : {};
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};

    // Map style names to font/color
    const styleMap = {
        screenTitle: {
            font: fonts.title || 'bold 26px Georgia',
            color: colors.gold || '#c9a227'
        },
        sectionHeader: {
            font: fonts.heading || 'bold 16px Georgia',
            color: colors.health || '#c0392b'
        },
        entityName: {
            font: fonts.subheading || 'bold 14px Georgia',
            color: colors.textPrimary || '#efe4b0'
        },
        statLabel: {
            font: fonts.small || '12px Georgia',
            color: colors.textSecondary || '#b8a878'
        },
        statValue: {
            font: fonts.number || 'bold 14px Georgia',
            color: colors.textPrimary || '#efe4b0'
        },
        helper: {
            font: fonts.tiny || '10px Georgia',
            color: colors.textMuted || '#706850'
        },
        description: {
            font: fonts.small || '12px Georgia',
            color: colors.textSecondary || '#b8a878'
        }
    };

    const settings = styleMap[style] || styleMap.statLabel;

    ctx.save();
    ctx.font = settings.font;
    ctx.fillStyle = settings.color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
}

/**
 * Calculate total armor from equipment
 * Armor is now equipment-only (no proficiency-based defense)
 * @param {Object} player - The player object
 * @returns {number} Total armor value
 */
function calculateTotalArmor(player) {
    if (!player || !player.equipped) return 0;

    let totalArmor = 0;
    const armorSlots = ['HEAD', 'CHEST', 'LEGS', 'FEET'];

    for (const slot of armorSlots) {
        const item = player.equipped[slot];
        if (item) {
            // Check for defense/armor stat
            if (item.stats?.defense) {
                totalArmor += item.stats.defense;
            }
            if (item.stats?.armor) {
                totalArmor += item.stats.armor;
            }
        }
    }

    return totalArmor;
}

// Block chance calculation removed - block mechanics are no longer in use
// Shields now provide defense bonuses instead of block chance

/**
 * Draw the character overlay - CotDG style
 */
function drawCharacterOverlay() {
    if (!game.player) return;

    // Get colors from design system
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0a0a0f',
        bgDark: '#12121a',
        bgMedium: '#1a1a24',
        border: '#3a3a4a',
        health: '#c0392b',
        healthDark: '#8b1a1a',
        mana: '#2980b9',
        manaDark: '#1a3a5c',
        stamina: '#27ae60',
        staminaDark: '#1a4a2e',
        gold: '#d4af37',
        xp: '#5dade2',
        corruption: '#8e44ad',
        textPrimary: '#ffffff',
        textSecondary: '#b0b0b0',
        textMuted: '#666666'
    };

    // Background overlay (dark vignette)
    const vignetteGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.height
    );
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    // Panel dimensions
    const panelWidth = Math.min(500, canvas.width - TRACKER_WIDTH - 100);
    const panelHeight = Math.min(700, canvas.height - 80);
    const panelX = TRACKER_WIDTH + 30;
    const panelY = (canvas.height - panelHeight) / 2;

    // === PANEL BACKGROUND ===
    drawOverlayPanel(ctx, panelX, panelY, panelWidth, panelHeight, colors);

    let yOffset = panelY + 30;
    const contentX = panelX + 30;
    const contentWidth = panelWidth - 60;

    // === HEADER ===
    // Title with decorative line - using styled text
    safeDrawStyledText(ctx, 'CHARACTER', panelX + panelWidth / 2, yOffset, 'screenTitle', 'center');

    yOffset += 15;
    drawDecorativeLine(ctx, panelX + 60, yOffset, panelWidth - 120, colors);
    yOffset += 25;

    // Character name and level - with safe formatting
    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ADVENTURER', panelX + panelWidth / 2, yOffset);
    yOffset += 25;

    // Safe level display - prevents "Level undefined"
    const levelDisplay = safeFormatValue(game.player.level, { fallback: '1', type: 'number' });
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`Level ${levelDisplay}`, panelX + panelWidth / 2, yOffset);
    yOffset += 20;

    // === XP BAR ===
    // Safe XP values - prevents "undefined/NaN"
    const playerLevel = Number(game.player.level) || 1;
    const xpNeeded = 100 + (playerLevel - 1) * 150;
    const currentXP = safeFormatValue(game.player.xp, { fallback: 0, type: 'number' });
    const safeXP = Number(game.player.xp) || 0;
    drawStylizedResourceBar(ctx, contentX, yOffset, contentWidth, 14,
        safeXP, xpNeeded, colors.xp || '#5dade2', '#1a3a5c', colors, 'XP');
    yOffset += 40;

    // === VITALS SECTION ===
    safeDrawStyledText(ctx, 'Vitals', panelX + panelWidth / 2, yOffset, 'sectionHeader', 'center');
    yOffset += 30;

    // HP Bar - Safe values
    const safeHP = Number(game.player.hp) || 0;
    const safeMaxHP = Number(game.player.maxHp) || 100;
    drawStylizedResourceBar(ctx, contentX, yOffset, contentWidth, 18,
        Math.floor(safeHP), safeMaxHP,
        colors.health || '#c0392b', colors.healthDark || '#8b1a1a', colors, safeGetStatName('hp', 'abbr'));
    yOffset += 35;

    // MP Bar - Safe values
    const safeMP = Number(game.player.mp) || 0;
    const safeMaxMP = Number(game.player.maxMp) || 100;
    drawStylizedResourceBar(ctx, contentX, yOffset, contentWidth, 18,
        Math.floor(safeMP), safeMaxMP,
        colors.mana || '#2980b9', colors.manaDark || '#1a3a5c', colors, safeGetStatName('mp', 'abbr'));
    yOffset += 35;

    // Stamina Bar - Safe values
    const safeStamina = Number(game.player.stamina) || 0;
    const safeMaxStamina = Number(game.player.maxStamina) || 100;
    drawStylizedResourceBar(ctx, contentX, yOffset, contentWidth, 18,
        Math.floor(safeStamina), safeMaxStamina,
        colors.stamina || '#27ae60', colors.staminaDark || '#1a4a2e', colors, 'STM');
    yOffset += 50;

    // === ATTRIBUTES SECTION ===
    safeDrawStyledText(ctx, 'Attributes', panelX + panelWidth / 2, yOffset, 'sectionHeader', 'center');
    yOffset += 35;

    const col1X = contentX + 20;
    const col2X = contentX + contentWidth / 2 + 20;

    // Safe stats access - prevents crashes if stats object is undefined
    const playerStats = game.player.stats || {};

    // Primary stats with safe formatting and full names
    // Row 1: STR and AGI
    drawStatRowSafe(ctx, col1X, yOffset, 'str', playerStats.STR, colors);
    drawStatRowSafe(ctx, col2X, yOffset, 'agi', playerStats.AGI, colors);
    yOffset += 28;

    // Row 2: INT and STA
    drawStatRowSafe(ctx, col1X, yOffset, 'int', playerStats.INT, colors);
    drawStatRowSafe(ctx, col2X, yOffset, 'sta', playerStats.STA, colors);
    yOffset += 28;

    // Row 3: Armor (equipment only) - Block mechanics removed
    const totalArmor = calculateTotalArmor(game.player);
    drawStatRowSafe(ctx, col1X, yOffset, 'armor', totalArmor, colors);
    // Block display removed - shields now provide defense bonuses instead
    yOffset += 45;

    // === EQUIPMENT SECTION ===
    safeDrawStyledText(ctx, 'Equipment', panelX + panelWidth / 2, yOffset, 'sectionHeader', 'center');
    yOffset += 35;

    // Safe equipment access
    const eq = game.player.equipped || {};
    const slots = [
        { key: 'HEAD', label: 'Head' },
        { key: 'CHEST', label: 'Chest' },
        { key: 'LEGS', label: 'Legs' },
        { key: 'FEET', label: 'Feet' },
        { key: 'MAIN', label: 'Main Hand' },
        { key: 'OFF', label: 'Off Hand' }
    ];

    for (const slot of slots) {
        drawEquipmentSlotSafe(ctx, contentX, yOffset, contentWidth, slot, eq[slot.key], colors);
        yOffset += 26;
    }

    yOffset += 15;

    // === GOLD DISPLAY ===
    // Safe gold value
    const safeGold = safeFormatValue(game.gold, { fallback: '0', type: 'number' });

    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';

    // Gold icon (simple coin shape)
    const goldX = panelX + panelWidth / 2;
    ctx.beginPath();
    ctx.arc(goldX - 60, yOffset - 5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.bgDark || '#12121a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('G', goldX - 60, yOffset - 1);

    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = 'bold 22px monospace';
    // Use safe gold value with proper number formatting
    const goldNumber = Number(game.gold) || 0;
    ctx.fillText(goldNumber.toLocaleString(), goldX + 10, yOffset);

    // === FOOTER INSTRUCTIONS ===
    safeDrawStyledText(ctx, '[ESC/C] Close  |  [E] Inventory  |  [K] Skills',
        panelX + panelWidth / 2, panelY + panelHeight - 20, 'helper', 'center');
}

/**
 * Draw a stylized overlay panel - CotDG Temple Frame Style
 */
function drawOverlayPanel(ctx, x, y, width, height, colors) {
    ctx.save();

    // Get frame colors from design system
    const frameGold = colors.frameGold || (typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGold : '#b8860b');
    const frameGoldBright = colors.frameGoldBright || (typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldBright : '#daa520');
    const frameGoldDark = colors.frameGoldDark || (typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldDark : '#8b6914');

    // Use drawTempleFrame if available for full CotDG styling
    if (typeof drawTempleFrame === 'function') {
        drawTempleFrame(ctx, x, y, width, height, {
            bgColor: colors.bgDark || '#141414',
            frameColor: frameGold,
            frameColorDark: frameGoldDark,
            frameWidth: 5,
            cornerSize: 18,
            pattern: true,
            innerGlow: true
        });
    } else {
        // Fallback: Enhanced manual rendering

        // Panel shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x + 5, y + 5, width, height);

        // Main background gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
        bgGrad.addColorStop(0, colors.bgMedium || '#1a1a24');
        bgGrad.addColorStop(0.3, colors.bgDark || '#12121a');
        bgGrad.addColorStop(1, colors.bgDarkest || '#0a0a0f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(x, y, width, height);

        // === ORNATE GOLD FRAME BORDER ===
        // Outer dark edge
        ctx.strokeStyle = frameGoldDark;
        ctx.lineWidth = 6;
        ctx.strokeRect(x, y, width, height);

        // Main gold frame
        ctx.strokeStyle = frameGold;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);

        // Inner bright edge highlight
        ctx.strokeStyle = frameGoldBright;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 5, y + 5, width - 10, height - 10);

        // Inner shadow for depth
        const innerGrad = ctx.createLinearGradient(x, y, x, y + height);
        innerGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
        innerGrad.addColorStop(0.1, 'rgba(0,0,0,0)');
        innerGrad.addColorStop(0.9, 'rgba(0,0,0,0)');
        innerGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = innerGrad;
        ctx.fillRect(x + 6, y + 6, width - 12, height - 12);
    }

    // === ORNATE CORNER FLOURISHES ===
    if (typeof drawOrnateCorners === 'function') {
        drawOrnateCorners(ctx, x - 2, y - 2, width + 4, height + 4, {
            color: frameGold,
            colorBright: frameGoldBright,
            colorDark: frameGoldDark,
            size: 18,
            thickness: 2,
            curls: true
        });
    } else {
        // Fallback corner accents
        const accentSize = 18;
        ctx.strokeStyle = frameGold;
        ctx.lineWidth = 3;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x, y + accentSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + accentSize, y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + width - accentSize, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + accentSize);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x, y + height - accentSize);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + accentSize, y + height);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + width - accentSize, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width, y + height - accentSize);
        ctx.stroke();

        // Corner rivets
        ctx.fillStyle = frameGoldBright;
        [[x + 6, y + 6], [x + width - 6, y + 6], [x + 6, y + height - 6], [x + width - 6, y + height - 6]].forEach(([rx, ry]) => {
            ctx.beginPath();
            ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    ctx.restore();
}

/**
 * Draw a decorative horizontal line
 */
function drawDecorativeLine(ctx, x, y, width, colors) {
    const centerX = x + width / 2;

    // Main line
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    // Center diamond accent
    ctx.fillStyle = colors.health || '#c0392b';
    ctx.save();
    ctx.translate(centerX, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();

    // Side dots
    ctx.beginPath();
    ctx.arc(x + 10, y, 2, 0, Math.PI * 2);
    ctx.arc(x + width - 10, y, 2, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draw a section header
 */
function drawSectionHeader(ctx, centerX, y, text, colors) {
    ctx.fillStyle = colors.health || '#c0392b';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, centerX, y);

    // Underline
    const textWidth = ctx.measureText(text).width;
    ctx.strokeStyle = colors.health || '#c0392b';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX - textWidth / 2 - 10, y + 8);
    ctx.lineTo(centerX + textWidth / 2 + 10, y + 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

/**
 * Draw a stylized resource bar with safe value handling
 */
function drawStylizedResourceBar(ctx, x, y, width, height, current, max, fillColor, bgColor, colors, label) {
    // Safe number conversion - prevents NaN and undefined
    const safeCurrent = Number(current) || 0;
    const safeMax = Number(max) || 1; // Avoid division by zero
    const pct = Math.max(0, Math.min(1, safeCurrent / safeMax));

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    // Fill with gradient
    if (pct > 0) {
        const fillGrad = ctx.createLinearGradient(x, y, x + width * pct, y);
        fillGrad.addColorStop(0, fillColor);
        fillGrad.addColorStop(1, bgColor);
        ctx.fillStyle = fillGrad;
        ctx.fillRect(x, y, width * pct, height);

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, width * pct, height / 3);
    }

    // Border
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Label - with safe display
    const safeLabel = label || '';
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(safeLabel, x + 5, y + height - 3);

    // Value - with safe formatting to prevent "undefined/NaN"
    const currentDisplay = safeFormatValue(safeCurrent, { fallback: '0', type: 'number', decimals: 0 });
    const maxDisplay = safeFormatValue(safeMax, { fallback: '0', type: 'number', decimals: 0 });
    ctx.textAlign = 'right';
    ctx.fillText(`${currentDisplay}/${maxDisplay}`, x + width - 5, y + height - 3);
}

/**
 * Draw a stat row with safe value formatting
 * Uses full stat names from design system
 */
function drawStatRowSafe(ctx, x, y, statKey, value, colors) {
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';

    // Get full stat display name (e.g., "Strength" instead of "STR")
    const statLabel = safeGetStatName(statKey, 'full');

    ctx.fillStyle = colors.textSecondary || '#b0b0b0';
    ctx.fillText(statLabel + ':', x, y);

    // Safe value formatting - prevents "undefined" or "NaN"
    const displayValue = safeFormatValue(value, { fallback: '0', type: 'number', decimals: 0 });
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.fillText(displayValue, x + 100, y);
}

/**
 * Draw a stat row (legacy - kept for backward compatibility)
 */
function drawStatRow(ctx, x, y, label, value, colors) {
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';

    ctx.fillStyle = colors.textSecondary || '#b0b0b0';
    ctx.fillText(label + ':', x, y);

    // Safe value formatting
    const displayValue = safeFormatValue(value, { fallback: '0', type: 'number', decimals: 0 });
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.fillText(displayValue, x + 60, y);
}

/**
 * Draw an equipment slot with safe value handling
 */
function drawEquipmentSlotSafe(ctx, x, y, width, slot, item, colors) {
    // Slot background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x, y - 14, width, 22);

    // Safe slot label
    const slotLabel = slot && slot.label ? slot.label : 'Slot';
    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(slotLabel + ':', x + 5, y);

    // Item name (with tier color if available) - with safe handling
    if (item && item.name) {
        // Get rarity color if available, with fallback
        let tierColor = colors.textPrimary || '#ffffff';
        if (item.tierColor) {
            tierColor = item.tierColor;
        } else if (item.rarity && typeof UI_COLORS !== 'undefined' && UI_COLORS.tiers) {
            tierColor = UI_COLORS.tiers[item.rarity] || tierColor;
        }

        ctx.fillStyle = tierColor;
        ctx.font = '12px monospace';

        // Safe name display with truncation
        const itemName = safeFormatValue(item.name, { fallback: 'Unknown Item', type: 'text' });
        let displayName = itemName;
        if (displayName.length > 25) {
            displayName = displayName.substring(0, 22) + '...';
        }
        ctx.fillText(displayName, x + 85, y);
    } else {
        // Empty slot indicator
        ctx.fillStyle = colors.textMuted || '#666666';
        ctx.font = '12px monospace';
        ctx.fillText('-- Empty --', x + 85, y);
    }
}

/**
 * Draw an equipment slot (legacy - kept for backward compatibility)
 */
function drawEquipmentSlot(ctx, x, y, width, slot, item, colors) {
    // Slot background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x, y - 14, width, 22);

    // Slot label
    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(slot.label + ':', x + 5, y);

    // Item name (with tier color if available)
    if (item && item.name) {
        const tierColor = item.tierColor || colors.textPrimary || '#ffffff';
        ctx.fillStyle = tierColor;
        ctx.font = '12px monospace';

        // Truncate name if too long
        let name = safeFormatValue(item.name, { fallback: 'Unknown', type: 'text' });
        if (name.length > 25) {
            name = name.substring(0, 22) + '...';
        }
        ctx.fillText(name, x + 70, y);
    } else {
        ctx.fillStyle = colors.textMuted || '#666666';
        ctx.fillText('Empty', x + 70, y);
    }
}

// Export
window.drawCharacterOverlay = drawCharacterOverlay;
window.drawOverlayPanel = drawOverlayPanel;

// Safe formatting helpers (available for other UI components)
window.safeFormatValue = safeFormatValue;
window.safeGetStatName = safeGetStatName;
window.safeDrawStyledText = safeDrawStyledText;
window.drawStatRowSafe = drawStatRowSafe;
window.drawEquipmentSlotSafe = drawEquipmentSlotSafe;

console.log('Character overlay loaded (CotDG style with safe value formatting)');
