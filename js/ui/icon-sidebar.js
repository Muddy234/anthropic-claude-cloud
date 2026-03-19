// ============================================================================
// ICON SIDEBAR - CotDG Inspired Navigation Panel
// ============================================================================
// 70px wide vertical sidebar with stylized icons and resource bars
// ============================================================================

// Sidebar state
window.sidebarState = {
    activeOverlay: null, // 'character', 'inventory', 'skills', 'map', 'shift', null
    hoverIcon: null
};

// Sidebar icon definitions with visual glyphs
const SIDEBAR_ICONS = {
    character: {
        id: 'character',
        hotkey: 'C',
        label: 'Character',
        // Unicode glyph (or could be sprite coordinates)
        glyph: '\u{1F464}',
        // Alternative: draw function for custom icon
        draw: function(ctx, x, y, size, active) {
            // Simple person silhouette
            const s = size * 0.6;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.fillStyle = active ? (typeof UI_COLORS !== 'undefined' ? UI_COLORS.gold.base : '#c9a227') : (typeof UI_COLORS !== 'undefined' ? UI_COLORS.text.muted : '#b8a878');

            // Head
            ctx.beginPath();
            ctx.arc(cx, cy - s * 0.3, s * 0.25, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.3, cy + s * 0.4);
            ctx.lineTo(cx - s * 0.15, cy);
            ctx.lineTo(cx + s * 0.15, cy);
            ctx.lineTo(cx + s * 0.3, cy + s * 0.4);
            ctx.closePath();
            ctx.fill();
        }
    },
    inventory: {
        id: 'inventory',
        hotkey: 'E',
        label: 'Inventory',
        glyph: '\u{1F392}',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? (typeof UI_COLORS !== 'undefined' ? UI_COLORS.gold.base : '#c9a227') : (typeof UI_COLORS !== 'undefined' ? UI_COLORS.text.muted : '#b8a878');
            ctx.lineWidth = 2;

            // Backpack shape
            ctx.beginPath();
            ctx.roundRect(cx - s * 0.4, cy - s * 0.3, s * 0.8, s * 0.7, 4);
            ctx.stroke();

            // Flap
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.3, cy - s * 0.3);
            ctx.lineTo(cx - s * 0.3, cy - s * 0.5);
            ctx.lineTo(cx + s * 0.3, cy - s * 0.5);
            ctx.lineTo(cx + s * 0.3, cy - s * 0.3);
            ctx.stroke();
        }
    },
    skills: {
        id: 'skills',
        hotkey: 'K',
        label: 'Skills',
        glyph: '\u2694',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? (typeof UI_COLORS !== 'undefined' ? UI_COLORS.gold.base : '#c9a227') : (typeof UI_COLORS !== 'undefined' ? UI_COLORS.text.muted : '#b8a878');
            ctx.lineWidth = 2;

            // Crossed swords simplified as star
            const points = 5;
            const outerR = s * 0.5;
            const innerR = s * 0.2;

            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const r = i % 2 === 0 ? outerR : innerR;
                const angle = (i * Math.PI / points) - Math.PI / 2;
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }
    },
    map: {
        id: 'map',
        hotkey: 'M',
        label: 'Map',
        glyph: '\u{1F5FA}',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? (typeof UI_COLORS !== 'undefined' ? UI_COLORS.gold.base : '#c9a227') : (typeof UI_COLORS !== 'undefined' ? UI_COLORS.text.muted : '#b8a878');
            ctx.lineWidth = 2;

            // Folded map
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.4, cy - s * 0.3);
            ctx.lineTo(cx - s * 0.2, cy + s * 0.3);
            ctx.lineTo(cx + s * 0.2, cy - s * 0.3);
            ctx.lineTo(cx + s * 0.4, cy + s * 0.3);
            ctx.stroke();

            // X mark
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.1, cy - s * 0.1);
            ctx.lineTo(cx + s * 0.1, cy + s * 0.1);
            ctx.moveTo(cx + s * 0.1, cy - s * 0.1);
            ctx.lineTo(cx - s * 0.1, cy + s * 0.1);
            ctx.stroke();
        }
    },
    journal: {
        id: 'journal',
        hotkey: 'J',
        label: 'Journal',
        glyph: '\u{1F4D6}',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? (typeof UI_COLORS !== 'undefined' ? UI_COLORS.gold.base : '#c9a227') : (typeof UI_COLORS !== 'undefined' ? UI_COLORS.text.muted : '#b8a878');
            ctx.fillStyle = active ? (typeof UI_COLORS !== 'undefined' ? UI_COLORS.gold.base : '#c9a227') : (typeof UI_COLORS !== 'undefined' ? UI_COLORS.text.muted : '#b8a878');
            ctx.lineWidth = 2;

            // Book shape
            ctx.beginPath();
            ctx.roundRect(cx - s * 0.35, cy - s * 0.4, s * 0.7, s * 0.8, 2);
            ctx.stroke();

            // Spine
            ctx.beginPath();
            ctx.moveTo(cx, cy - s * 0.4);
            ctx.lineTo(cx, cy + s * 0.4);
            ctx.stroke();

            // Lines (text)
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const ly = cy - s * 0.2 + i * s * 0.2;
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.25, ly);
                ctx.lineTo(cx - s * 0.05, ly);
                ctx.stroke();
            }
        }
    },
    shift: {
        id: 'shift',
        hotkey: 'O',
        label: 'Shift',
        glyph: '\u23F1',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? (typeof UI_COLORS !== 'undefined' && UI_COLORS.corruption ? UI_COLORS.corruption.base : '#9b59b6') : (typeof UI_COLORS !== 'undefined' ? UI_COLORS.text.muted : '#b8a878');
            ctx.lineWidth = 2;

            // Clock/portal circle
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
            ctx.stroke();

            // Swirl inside
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 1.5);
            ctx.stroke();

            // Center dot
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

// Legacy array for backward compatibility with existing event handlers
const SIDEBAR_ICONS_ARRAY = [
    { id: 'character', label: 'Character', hotkey: 'C', y: 120 },
    { id: 'inventory', label: 'Inventory', hotkey: 'E', y: 180 },
    { id: 'skills', label: 'Skills', hotkey: 'K', y: 240 },
    { id: 'map', label: 'Map', hotkey: 'M', y: 300 },
    { id: 'journal', label: 'Journal', hotkey: 'J', y: 360 },
    { id: 'shift', label: 'Shift', hotkey: 'O', y: 420 }
];

// Sidebar configuration using design system
const SIDEBAR_CONFIG = {
    width: 70,
    iconSize: 40,
    iconPadding: 6
};

/**
 * Draw a decorative separator between icon groups
 */
function drawGroupSeparator(ctx, sidebarWidth, y) {
    const lineWidth = sidebarWidth - 20;
    const startX = 10;

    const goldDark = (typeof UI_COLORS !== 'undefined' && UI_COLORS.gold) ? UI_COLORS.gold.dark : '#8b6914';

    ctx.strokeStyle = goldDark;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + lineWidth, y);
    ctx.stroke();

    // Center diamond
    const diamondSize = 4;
    const cx = sidebarWidth / 2;
    ctx.fillStyle = goldDark;
    ctx.beginPath();
    ctx.moveTo(cx, y - diamondSize);
    ctx.lineTo(cx + diamondSize, y);
    ctx.lineTo(cx, y + diamondSize);
    ctx.lineTo(cx - diamondSize, y);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
}

/**
 * Render the icon sidebar - CotDG Temple Pillar style
 */
function renderIconSidebar(ctx, canvasHeight) {
    const cfg = SIDEBAR_CONFIG;
    const sidebarWidth = cfg.width;
    const iconSize = cfg.iconSize;
    const iconPadding = 12;

    // Get colors from design system (extended CotDG palette)
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0d0d0d',
        bgDark: '#141414',
        bgMedium: '#1c1c1c',
        border: '#3a3530',
        health: '#a82828',
        healthDark: '#6b1a1a',
        mana: '#2a5a8a',
        manaDark: '#1a3a5c',
        gold: '#c9a227',
        frameGold: '#b8860b',
        frameGoldBright: '#daa520',
        frameGoldDark: '#8b6914',
        templeStone: '#2a2622',
        templeStoneDark: '#1a1816',
        textPrimary: '#efe4b0',
        textMuted: '#706850'
    };

    ctx.save();

    // === STONE PILLAR BACKGROUND ===
    drawPillarBackground(ctx, cfg, canvasHeight, colors);

    // === GOLD TRIM EDGES ===
    drawPillarTrim(ctx, cfg, canvasHeight, colors);

    // === FLOOR INDICATOR (top) - Carved Stone ===
    drawFloorIndicator(ctx, cfg, colors);

    // === RESOURCE BARS (below floor) - Stone Alcove Style ===
    drawSidebarResourceBars(ctx, cfg, colors);

    // === NAVIGATION ICONS - Visual Glyph Style with Groups ===
    // Icon configuration with grouping
    const iconGroups = [
        // Character-related
        { icons: ['character', 'inventory', 'skills'], separator: true },
        // World-related
        { icons: ['map', 'journal'], separator: true },
        // Meta
        { icons: ['shift'], separator: false }
    ];

    // Calculate starting Y position (after floor indicator and resource bars)
    let currentY = 120;

    const activeOverlay = window.sidebarState?.activeOverlay;
    const hoverIcon = window.sidebarState?.hoverIcon;

    iconGroups.forEach((group, groupIndex) => {
        group.icons.forEach((iconId, iconIndex) => {
            const iconX = (sidebarWidth - iconSize) / 2;
            const iconY = currentY;

            const isActive = activeOverlay === iconId;
            const isHovered = hoverIcon === iconId;

            drawSidebarIcon(ctx, iconId, iconX, iconY, iconSize, isActive, isHovered);

            // Update Y position tracking for legacy event handlers
            if (SIDEBAR_ICONS[iconId]) {
                // Store calculated Y for event handling
                const legacyIcon = SIDEBAR_ICONS_ARRAY.find(i => i.id === iconId);
                if (legacyIcon) {
                    legacyIcon.y = currentY + iconSize / 2;
                }
            }

            currentY += iconSize + iconPadding;
        });

        // Draw separator between groups
        if (group.separator) {
            currentY += 4;
            drawGroupSeparator(ctx, sidebarWidth, currentY);
            currentY += 12;
        }
    });

    // === LIGHT/DARK INDICATOR (bottom) - Torch Icon ===
    drawLightDarkIndicator(ctx, cfg, canvasHeight, colors);

    ctx.restore();
}

/**
 * Draw stone pillar background with grunge texture
 */
function drawPillarBackground(ctx, cfg, canvasHeight, colors) {
    // Main stone gradient (vertical pillar effect)
    const bgGrad = ctx.createLinearGradient(0, 0, cfg.width, 0);
    bgGrad.addColorStop(0, colors.templeStoneDark || '#1a1816');
    bgGrad.addColorStop(0.3, colors.templeStone || '#2a2622');
    bgGrad.addColorStop(0.7, colors.templeStone || '#2a2622');
    bgGrad.addColorStop(1, colors.templeStoneDark || '#1a1816');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cfg.width, canvasHeight);

    // Add subtle vertical stone texture lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 8; x < cfg.width; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }

    // Add horizontal stone block divisions
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    for (let y = 0; y < canvasHeight; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cfg.width, y);
        ctx.stroke();
        // Highlight above the line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.beginPath();
        ctx.moveTo(0, y + 1);
        ctx.lineTo(cfg.width, y + 1);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    }

    // Grunge noise overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < 50; i++) {
        const gx = Math.random() * cfg.width;
        const gy = Math.random() * canvasHeight;
        const gs = Math.random() * 3 + 1;
        ctx.fillRect(gx, gy, gs, gs);
    }
}

/**
 * Draw gold trim along pillar edges
 */
function drawPillarTrim(ctx, cfg, canvasHeight, colors) {
    const trimWidth = 3;

    // Right edge gold trim
    const trimGrad = ctx.createLinearGradient(cfg.width - trimWidth, 0, cfg.width, 0);
    trimGrad.addColorStop(0, colors.frameGoldDark || '#8b6914');
    trimGrad.addColorStop(0.5, colors.frameGold || '#b8860b');
    trimGrad.addColorStop(1, colors.frameGoldDark || '#8b6914');

    ctx.fillStyle = trimGrad;
    ctx.fillRect(cfg.width - trimWidth, 0, trimWidth, canvasHeight);

    // Decorative notches along the trim
    ctx.fillStyle = colors.frameGoldBright || '#daa520';
    for (let y = 20; y < canvasHeight; y += 60) {
        // Small diamond notch
        ctx.beginPath();
        ctx.moveTo(cfg.width - trimWidth - 2, y);
        ctx.lineTo(cfg.width - trimWidth - 5, y + 4);
        ctx.lineTo(cfg.width - trimWidth - 2, y + 8);
        ctx.lineTo(cfg.width - trimWidth, y + 4);
        ctx.closePath();
        ctx.fill();
    }
}

/**
 * Draw floor indicator at top of sidebar - Carved Stone Numeral
 */
function drawFloorIndicator(ctx, cfg, colors) {
    const y = 8;
    const floor = game.floor || 1;

    // Carved alcove background for floor number
    const alcoveX = 8;
    const alcoveY = y;
    const alcoveW = cfg.width - 16;
    const alcoveH = 38;

    // Inset shadow (carved into stone)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(alcoveX, alcoveY, alcoveW, alcoveH);

    // Inner stone surface
    const innerGrad = ctx.createLinearGradient(alcoveX, alcoveY, alcoveX, alcoveY + alcoveH);
    innerGrad.addColorStop(0, '#151310');
    innerGrad.addColorStop(1, '#1f1c18');
    ctx.fillStyle = innerGrad;
    ctx.fillRect(alcoveX + 2, alcoveY + 2, alcoveW - 4, alcoveH - 4);

    // Chisel edge highlight (bottom and right)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(alcoveX + 2, alcoveY + alcoveH - 2);
    ctx.lineTo(alcoveX + alcoveW - 2, alcoveY + alcoveH - 2);
    ctx.lineTo(alcoveX + alcoveW - 2, alcoveY + 2);
    ctx.stroke();

    // "FLOOR" label - small, muted
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.textMuted || '#706850';
    ctx.fillText('FLOOR', cfg.width / 2, y + 12);

    // Floor number - large, gold, carved look with shadow
    ctx.font = 'bold 22px serif';
    ctx.fillStyle = colors.frameGoldDark || '#8b6914';
    ctx.fillText(floor.toString(), cfg.width / 2 + 1, y + 32); // Shadow
    ctx.fillStyle = colors.frameGold || '#b8860b';
    ctx.fillText(floor.toString(), cfg.width / 2, y + 31);
    // Highlight
    ctx.fillStyle = colors.frameGoldBright || '#daa520';
    ctx.globalAlpha = 0.5;
    ctx.fillText(floor.toString(), cfg.width / 2 - 0.5, y + 30.5);
    ctx.globalAlpha = 1;
}

/**
 * Draw vertical resource bars in sidebar - Stone Alcove Style
 */
function drawSidebarResourceBars(ctx, cfg, colors) {
    if (!game.player) return;

    const barWidth = 10;
    const barHeight = 55;
    const barY = 52;
    const spacing = 12;

    // Draw alcove frame for both bars
    const alcoveX = 6;
    const alcoveW = cfg.width - 12;
    const alcoveY = barY - 4;
    const alcoveH = barHeight + 18;

    // Inset alcove shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(alcoveX, alcoveY, alcoveW, alcoveH);

    // Inner surface
    ctx.fillStyle = '#151310';
    ctx.fillRect(alcoveX + 2, alcoveY + 2, alcoveW - 4, alcoveH - 4);

    // HP Bar (left)
    const hpX = cfg.width / 2 - spacing - barWidth / 2;
    drawVerticalBarStyled(ctx, hpX, barY, barWidth, barHeight,
        game.player.hp, game.player.maxHp,
        colors.health || '#a82828', colors.healthDark || '#6b1a1a', 'hp');

    // MP Bar (right)
    const mpX = cfg.width / 2 + spacing - barWidth / 2;
    drawVerticalBarStyled(ctx, mpX, barY, barWidth, barHeight,
        game.player.mp || 0, game.player.maxMp || 100,
        colors.mana || '#2a5a8a', colors.manaDark || '#1a3a5c', 'mp');

    // Labels with icon style
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';

    // HP label (heart-like symbol)
    ctx.fillStyle = colors.health || '#a82828';
    ctx.fillText('♥', hpX + barWidth / 2, barY + barHeight + 11);

    // MP label (star-like symbol)
    ctx.fillStyle = colors.mana || '#2a5a8a';
    ctx.fillText('✦', mpX + barWidth / 2, barY + barHeight + 11);
}

/**
 * Draw a vertical resource bar with CotDG styling
 */
function drawVerticalBarStyled(ctx, x, y, width, height, current, max, fillColor, bgColor, type) {
    const pct = Math.max(0, Math.min(1, current / max));

    // Outer border (gold trim)
    const frameGold = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGold : '#b8860b';
    ctx.strokeStyle = frameGold;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);

    // Background (dark stone inset)
    ctx.fillStyle = '#0a0908';
    ctx.fillRect(x, y, width, height);

    // Fill (from bottom) with gradient
    const fillHeight = height * pct;
    if (pct > 0) {
        const grad = ctx.createLinearGradient(x, y + height - fillHeight, x + width, y + height);
        grad.addColorStop(0, bgColor);
        grad.addColorStop(0.5, fillColor);
        grad.addColorStop(1, bgColor);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y + height - fillHeight, width, fillHeight);

        // Vertical shine stripe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x + 1, y + height - fillHeight, 2, fillHeight);

        // Top glow on fill
        const glowGrad = ctx.createLinearGradient(x, y + height - fillHeight, x, y + height - fillHeight + 6);
        glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(x, y + height - fillHeight, width, Math.min(6, fillHeight));
    }

    // Grunge texture overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < 5; i++) {
        const gx = x + Math.random() * width;
        const gy = y + Math.random() * height;
        ctx.fillRect(gx, gy, 1, 2);
    }

    // Segment lines (every 20% for health, every 25% for mana)
    const segmentPct = type === 'hp' ? 0.2 : 0.25;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    for (let s = segmentPct; s < 1; s += segmentPct) {
        const segY = y + height - (height * s);
        ctx.beginPath();
        ctx.moveTo(x, segY);
        ctx.lineTo(x + width, segY);
        ctx.stroke();
    }
}

/**
 * Draw a sidebar icon with proper visual states
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} iconId - Key from SIDEBAR_ICONS
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} size - Icon size (typically 40)
 * @param {boolean} isActive - Currently selected
 * @param {boolean} isHovered - Mouse hovering
 */
function drawSidebarIcon(ctx, iconId, x, y, size, isActive, isHovered) {
    const iconDef = SIDEBAR_ICONS[iconId];
    if (!iconDef) return;

    ctx.save();

    // Determine visual tier based on state
    let tier = 'tertiary';
    if (isActive) tier = 'primary';
    else if (isHovered) tier = 'secondary';

    // Get tier style from UI_TIERS if available, otherwise use fallback
    const tierStyle = (typeof UI_TIERS !== 'undefined' && UI_TIERS[tier]) ? UI_TIERS[tier] : {
        primary: { borderColor: '#c9a227', borderWidth: 3, shadowColor: 'rgba(218, 165, 32, 0.4)', shadowBlur: 12, glowIntensity: 0.6 },
        secondary: { borderColor: '#8b6914', borderWidth: 2, shadowColor: 'rgba(139, 105, 20, 0.25)', shadowBlur: 6, glowIntensity: 0.3 },
        tertiary: { borderColor: '#262626', borderWidth: 1, shadowColor: 'rgba(0, 0, 0, 0.3)', shadowBlur: 4, glowIntensity: 0 }
    }[tier];

    // Background socket
    const socketPadding = 4;
    const socketSize = size + socketPadding * 2;
    const socketX = x - socketPadding;
    const socketY = y - socketPadding;

    // Socket background
    ctx.fillStyle = isActive ? 'rgba(201, 162, 39, 0.15)' : 'rgba(13, 13, 13, 0.8)';
    ctx.beginPath();
    ctx.roundRect(socketX, socketY, socketSize, socketSize, 6);
    ctx.fill();

    // Socket border
    ctx.strokeStyle = tierStyle.borderColor;
    ctx.lineWidth = tierStyle.borderWidth;
    ctx.stroke();

    // Glow for active/hovered
    if (tierStyle.glowIntensity > 0) {
        ctx.shadowColor = tierStyle.shadowColor;
        ctx.shadowBlur = tierStyle.shadowBlur;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Draw the icon glyph
    if (iconDef.draw) {
        iconDef.draw(ctx, x, y, size, isActive || isHovered);
    }

    // Hotkey badge (bottom-right corner)
    const badgeSize = 14;
    const badgeX = x + size - badgeSize + 4;
    const badgeY = y + size - badgeSize + 4;

    const goldDark = (typeof UI_COLORS !== 'undefined' && UI_COLORS.gold) ? UI_COLORS.gold.dark : '#8b6914';
    const bgDark = (typeof UI_COLORS !== 'undefined' && UI_COLORS.background) ? UI_COLORS.background.dark : '#0d0d0d';
    const textDark = (typeof UI_COLORS !== 'undefined' && UI_COLORS.text) ? UI_COLORS.text.dark : '#706850';

    ctx.fillStyle = isActive ? goldDark : 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 2);
    ctx.fill();

    ctx.fillStyle = isActive ? bgDark : textDark;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconDef.hotkey, badgeX + badgeSize / 2, badgeY + badgeSize / 2);

    // Tooltip on hover (show label)
    if (isHovered && !isActive) {
        const fontFamily = (typeof UI_FONT_FAMILY !== 'undefined') ? UI_FONT_FAMILY.body : 'Georgia, serif';
        const labelX = x + size + 12;
        const labelY = y + size / 2;
        const labelPadding = 6;
        const labelText = iconDef.label;

        ctx.font = '12px ' + fontFamily;
        const labelWidth = ctx.measureText(labelText).width + labelPadding * 2;

        // Label background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.roundRect(labelX, labelY - 10, labelWidth, 20, 3);
        ctx.fill();

        // Label border
        ctx.strokeStyle = goldDark;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label text
        const textLight = (typeof UI_COLORS !== 'undefined' && UI_COLORS.text) ? UI_COLORS.text.light : '#efe4b0';
        ctx.fillStyle = textLight;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + labelPadding, labelY);
    }

    ctx.restore();
}

/**
 * Legacy function for backward compatibility - wraps new drawSidebarIcon
 */
function drawSidebarIconLegacy(ctx, iconDef, cfg, colors) {
    const x = cfg.width / 2 - cfg.iconSize / 2;
    const y = iconDef.y - cfg.iconSize / 2;
    const size = cfg.iconSize;

    const isHovered = window.sidebarState.hoverIcon === iconDef.id;
    const isActive = window.sidebarState.activeOverlay === iconDef.id;

    drawSidebarIcon(ctx, iconDef.id, x, y, size, isActive, isHovered);
}

/**
 * Draw light/dark indicator at bottom of sidebar - Flickering Torch Icon
 */
function drawLightDarkIndicator(ctx, cfg, canvasHeight, colors) {
    if (!game.player) return;

    const y = canvasHeight - 50;
    const size = 32;

    // Determine if player is in light or dark
    const tile = game.map?.[Math.floor(game.player.gridY)]?.[Math.floor(game.player.gridX)];
    const isInLight = tile?.visible && tile?.lit;

    // Get torch flicker effect
    const flicker = typeof getTorchFlicker === 'function' ? getTorchFlicker() : (0.9 + Math.random() * 0.1);

    ctx.save();

    // Torch holder alcove
    const alcoveX = 8;
    const alcoveY = y - size/2 - 8;
    const alcoveW = cfg.width - 16;
    const alcoveH = size + 26;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(alcoveX, alcoveY, alcoveW, alcoveH);
    ctx.fillStyle = '#151310';
    ctx.fillRect(alcoveX + 2, alcoveY + 2, alcoveW - 4, alcoveH - 4);

    const cx = cfg.width / 2;

    if (isInLight) {
        // === LIT TORCH ===
        // Glow behind torch
        const glowGrad = ctx.createRadialGradient(cx, y - 4, 0, cx, y - 4, size);
        glowGrad.addColorStop(0, `rgba(255, 147, 41, ${0.4 * flicker})`);
        glowGrad.addColorStop(0.5, `rgba(255, 100, 20, ${0.2 * flicker})`);
        glowGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(alcoveX + 2, alcoveY + 2, alcoveW - 4, alcoveH - 4);

        // Torch handle
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(cx - 3, y, 6, 16);
        ctx.fillStyle = '#3a2510';
        ctx.fillRect(cx - 2, y, 2, 16);

        // Torch head
        ctx.fillStyle = '#5a4530';
        ctx.fillRect(cx - 5, y - 6, 10, 8);

        // Flame (animated)
        const flameHeight = 12 + Math.sin(Date.now() / 100) * 3;
        const flameWidth = 8 + Math.sin(Date.now() / 80) * 2;

        // Outer flame (orange)
        ctx.fillStyle = `rgba(255, 100, 20, ${flicker})`;
        ctx.beginPath();
        ctx.moveTo(cx - flameWidth/2, y - 4);
        ctx.quadraticCurveTo(cx - flameWidth/2 - 2, y - flameHeight/2, cx, y - flameHeight);
        ctx.quadraticCurveTo(cx + flameWidth/2 + 2, y - flameHeight/2, cx + flameWidth/2, y - 4);
        ctx.closePath();
        ctx.fill();

        // Inner flame (yellow)
        ctx.fillStyle = `rgba(255, 200, 50, ${flicker})`;
        ctx.beginPath();
        ctx.moveTo(cx - flameWidth/3, y - 5);
        ctx.quadraticCurveTo(cx - flameWidth/3, y - flameHeight/2, cx, y - flameHeight * 0.7);
        ctx.quadraticCurveTo(cx + flameWidth/3, y - flameHeight/2, cx + flameWidth/3, y - 5);
        ctx.closePath();
        ctx.fill();

        // Core (white-yellow)
        ctx.fillStyle = `rgba(255, 255, 200, ${flicker * 0.8})`;
        ctx.beginPath();
        ctx.ellipse(cx, y - 8, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = colors.frameGold || '#b8860b';
        ctx.fillText('LIGHT', cx, y + size/2 + 6);

    } else {
        // === UNLIT TORCH (dark/stealth) ===
        // Cool dark glow
        const darkGrad = ctx.createRadialGradient(cx, y - 4, 0, cx, y - 4, size/2);
        darkGrad.addColorStop(0, 'rgba(60, 100, 140, 0.15)');
        darkGrad.addColorStop(1, 'rgba(40, 60, 80, 0)');
        ctx.fillStyle = darkGrad;
        ctx.fillRect(alcoveX + 2, alcoveY + 2, alcoveW - 4, alcoveH - 4);

        // Torch handle (dimmed)
        ctx.fillStyle = '#2a2015';
        ctx.fillRect(cx - 3, y, 6, 16);
        ctx.fillStyle = '#201510';
        ctx.fillRect(cx - 2, y, 2, 16);

        // Torch head (unlit, smoke wisps)
        ctx.fillStyle = '#3a3025';
        ctx.fillRect(cx - 5, y - 6, 10, 8);

        // Smoke wisps
        ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
        ctx.lineWidth = 1;
        const smokeOffset = Math.sin(Date.now() / 200) * 3;
        ctx.beginPath();
        ctx.moveTo(cx, y - 6);
        ctx.quadraticCurveTo(cx + smokeOffset, y - 12, cx - 2, y - 18);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 2, y - 6);
        ctx.quadraticCurveTo(cx + 2 - smokeOffset, y - 10, cx + 4, y - 15);
        ctx.stroke();

        // Moon icon above (stealth indicator)
        ctx.fillStyle = '#5588aa';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☾', cx, y - 10);

        // Label
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#5588aa';
        ctx.fillText('DARK', cx, y + size/2 + 6);
    }

    ctx.restore();
}

/**
 * Handle mouse move for hover detection
 */
function handleSidebarMouseMove(e) {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if mouse is over sidebar
    if (mouseX > SIDEBAR_CONFIG.width) {
        window.sidebarState.hoverIcon = null;
        return;
    }

    // Check which icon is hovered (using legacy array for Y positions)
    let hoveredIcon = null;
    for (const iconDef of SIDEBAR_ICONS_ARRAY) {
        const iconTop = iconDef.y - SIDEBAR_CONFIG.iconSize / 2 - 5;
        const iconBottom = iconDef.y + SIDEBAR_CONFIG.iconSize / 2 + 15;

        if (mouseY >= iconTop && mouseY <= iconBottom) {
            hoveredIcon = iconDef.id;
            break;
        }
    }

    window.sidebarState.hoverIcon = hoveredIcon;
}

/**
 * Handle click on sidebar icons
 */
function handleSidebarClick(e) {
    if (!canvas || game.state !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if click is in sidebar
    if (clickX > SIDEBAR_CONFIG.width) return;

    // Check which icon was clicked (using legacy array for Y positions)
    for (const iconDef of SIDEBAR_ICONS_ARRAY) {
        const iconTop = iconDef.y - SIDEBAR_CONFIG.iconSize / 2 - 5;
        const iconBottom = iconDef.y + SIDEBAR_CONFIG.iconSize / 2 + 15;

        if (clickY >= iconTop && clickY <= iconBottom) {
            toggleSidebarOverlay(iconDef.id);
            e.stopPropagation();
            return;
        }
    }
}

/**
 * Toggle sidebar overlay
 */
function toggleSidebarOverlay(overlayId) {
    // If clicking the same overlay, close it
    if (window.sidebarState.activeOverlay === overlayId) {
        window.sidebarState.activeOverlay = null;
        game.state = 'playing';
        return;
    }

    // Open the overlay
    window.sidebarState.activeOverlay = overlayId;

    // Reset map overlay state when opening the map
    if (overlayId === 'map' && typeof resetMapOverlayState === 'function') {
        resetMapOverlayState();
    }

    // Map to game state
    const stateMap = {
        'character': 'character',
        'inventory': 'inventory',
        'skills': 'skills',
        'map': 'map',
        'journal': 'journal',
        'shift': 'shift'
    };

    // Special handling for journal - use JournalUI
    if (overlayId === 'journal') {
        if (typeof JournalUI !== 'undefined') {
            JournalUI.open();
        }
        return;
    }

    game.state = stateMap[overlayId] || 'playing';
}

/**
 * Handle hotkeys for sidebar
 */
function handleSidebarHotkey(key) {
    // Check in the SIDEBAR_ICONS object for matching hotkey
    for (const iconId in SIDEBAR_ICONS) {
        const icon = SIDEBAR_ICONS[iconId];
        if (icon.hotkey && icon.hotkey.toLowerCase() === key.toLowerCase()) {
            toggleSidebarOverlay(icon.id);
            return true;
        }
    }
    return false;
}

/**
 * Initialize sidebar event handlers
 */
function initIconSidebar() {
    if (typeof canvas === 'undefined') {
        console.warn('Canvas not found for icon sidebar');
        return;
    }

    canvas.addEventListener('mousemove', handleSidebarMouseMove);
    canvas.addEventListener('click', handleSidebarClick);

    // Hotkey handler
    document.addEventListener('keydown', (e) => {
        if (game.state === 'playing' || window.sidebarState.activeOverlay) {
            const handled = handleSidebarHotkey(e.key);
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    });

    console.log('Icon sidebar initialized (CotDG style)');
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', initIconSidebar);
}

// Export
window.renderIconSidebar = renderIconSidebar;
window.sidebarState = window.sidebarState;
window.SIDEBAR_CONFIG = SIDEBAR_CONFIG;
window.SIDEBAR_ICONS = SIDEBAR_ICONS;
window.SIDEBAR_ICONS_ARRAY = SIDEBAR_ICONS_ARRAY;
window.drawGroupSeparator = drawGroupSeparator;
window.drawSidebarIcon = drawSidebarIcon;

console.log('Icon sidebar loaded (CotDG style with visual glyphs)');
