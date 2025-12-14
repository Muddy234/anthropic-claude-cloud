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

// Icon definitions with CotDG-style symbols
const SIDEBAR_ICONS = [
    { id: 'character', label: 'Stats', icon: 'C', y: 120, hotkey: 'C' },
    { id: 'inventory', label: 'Bag', icon: 'I', y: 180, hotkey: 'E' },
    { id: 'skills', label: 'Skills', icon: 'S', y: 240, hotkey: 'K' },
    { id: 'map', label: 'Map', icon: 'M', y: 300, hotkey: 'M' },
    { id: 'journal', label: 'Journal', icon: 'J', y: 360, hotkey: 'J' },
    { id: 'shift', label: 'Shift', icon: '!', y: 420, hotkey: 'O' }
];

// Sidebar configuration using design system
const SIDEBAR_CONFIG = {
    width: 70,
    iconSize: 40,
    iconPadding: 6
};

/**
 * Render the icon sidebar - CotDG style
 */
function renderIconSidebar(ctx, canvasHeight) {
    const cfg = SIDEBAR_CONFIG;

    // Get colors from design system
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0a0a0f',
        bgDark: '#12121a',
        border: '#3a3a4a',
        health: '#c0392b',
        healthDark: '#8b1a1a',
        mana: '#2980b9',
        manaDark: '#1a3a5c',
        gold: '#d4af37',
        textPrimary: '#ffffff',
        textMuted: '#666666'
    };

    ctx.save();

    // === BACKGROUND with gradient ===
    const bgGrad = ctx.createLinearGradient(0, 0, cfg.width, 0);
    bgGrad.addColorStop(0, colors.bgDarkest || '#0a0a0f');
    bgGrad.addColorStop(1, colors.bgDark || '#12121a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cfg.width, canvasHeight);

    // Right border with accent
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cfg.width, 0);
    ctx.lineTo(cfg.width, canvasHeight);
    ctx.stroke();

    // === FLOOR INDICATOR (top) ===
    drawFloorIndicator(ctx, cfg);

    // === RESOURCE BARS (below floor) ===
    drawSidebarResourceBars(ctx, cfg, colors);

    // === NAVIGATION ICONS ===
    for (const iconDef of SIDEBAR_ICONS) {
        drawSidebarIcon(ctx, iconDef, cfg, colors);
    }

    // === LIGHT/DARK INDICATOR (bottom) ===
    drawLightDarkIndicator(ctx, cfg, canvasHeight, colors);

    ctx.restore();
}

/**
 * Draw floor indicator at top of sidebar
 */
function drawFloorIndicator(ctx, cfg) {
    const y = 12;
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};

    // Floor number
    const floor = game.floor || 1;

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.textMuted || '#666666';
    ctx.fillText('FLOOR', cfg.width / 2, y);

    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.fillText(floor.toString(), cfg.width / 2, y + 22);
}

/**
 * Draw vertical resource bars in sidebar
 */
function drawSidebarResourceBars(ctx, cfg, colors) {
    if (!game.player) return;

    const barWidth = 8;
    const barHeight = 60;
    const barY = 50;
    const spacing = 14;

    // HP Bar (left)
    const hpX = cfg.width / 2 - spacing - barWidth / 2;
    drawVerticalBar(ctx, hpX, barY, barWidth, barHeight,
        game.player.hp, game.player.maxHp,
        colors.health || '#c0392b', colors.healthDark || '#8b1a1a');

    // MP Bar (right)
    const mpX = cfg.width / 2 + spacing - barWidth / 2;
    drawVerticalBar(ctx, mpX, barY, barWidth, barHeight,
        game.player.mp || 0, game.player.maxMp || 100,
        colors.mana || '#2980b9', colors.manaDark || '#1a3a5c');

    // Labels
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.textMuted || '#666';
    ctx.fillText('HP', hpX + barWidth / 2, barY + barHeight + 10);
    ctx.fillText('MP', mpX + barWidth / 2, barY + barHeight + 10);
}

/**
 * Draw a vertical resource bar
 */
function drawVerticalBar(ctx, x, y, width, height, current, max, fillColor, bgColor) {
    const pct = Math.max(0, Math.min(1, current / max));

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    // Fill (from bottom)
    const fillHeight = height * pct;
    if (pct > 0) {
        const grad = ctx.createLinearGradient(x, y + height - fillHeight, x, y + height);
        grad.addColorStop(0, fillColor);
        grad.addColorStop(1, bgColor);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y + height - fillHeight, width, fillHeight);

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x, y + height - fillHeight, width / 3, fillHeight);
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
}

/**
 * Draw a single sidebar icon - CotDG style
 */
function drawSidebarIcon(ctx, iconDef, cfg, colors) {
    const x = cfg.width / 2;
    const y = iconDef.y;
    const size = cfg.iconSize;

    const isHovered = window.sidebarState.hoverIcon === iconDef.id;
    const isActive = window.sidebarState.activeOverlay === iconDef.id;

    ctx.save();

    // Icon background
    const bgX = x - size / 2;
    const bgY = y - size / 2;

    // Background shape
    if (isActive) {
        // Active glow
        ctx.shadowColor = colors.health || '#c0392b';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(192, 57, 43, 0.4)';
    } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    } else {
        ctx.fillStyle = colors.bgDark || '#12121a';
    }

    // Draw rounded square background
    const radius = 6;
    ctx.beginPath();
    ctx.moveTo(bgX + radius, bgY);
    ctx.lineTo(bgX + size - radius, bgY);
    ctx.quadraticCurveTo(bgX + size, bgY, bgX + size, bgY + radius);
    ctx.lineTo(bgX + size, bgY + size - radius);
    ctx.quadraticCurveTo(bgX + size, bgY + size, bgX + size - radius, bgY + size);
    ctx.lineTo(bgX + radius, bgY + size);
    ctx.quadraticCurveTo(bgX, bgY + size, bgX, bgY + size - radius);
    ctx.lineTo(bgX, bgY + radius);
    ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
    ctx.closePath();
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = isActive ? (colors.health || '#c0392b') : (colors.border || '#3a3a4a');
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.stroke();

    // Icon letter
    ctx.font = `bold ${size - 14}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isActive ? (colors.health || '#c0392b') : (colors.textPrimary || '#ffffff');
    ctx.fillText(iconDef.icon, x, y);

    // Hotkey hint
    ctx.font = '9px monospace';
    ctx.fillStyle = colors.textMuted || '#666';
    ctx.fillText(`[${iconDef.hotkey}]`, x, y + size / 2 + 10);

    ctx.restore();
}

/**
 * Draw light/dark indicator at bottom of sidebar
 */
function drawLightDarkIndicator(ctx, cfg, canvasHeight, colors) {
    if (!game.player) return;

    const y = canvasHeight - 50;
    const size = 24;

    // Determine if player is in light or dark
    const tile = game.map?.[Math.floor(game.player.gridY)]?.[Math.floor(game.player.gridX)];
    const isInLight = tile?.visible && tile?.lit;

    // Background circle
    ctx.fillStyle = colors.bgDark || '#12121a';
    ctx.beginPath();
    ctx.arc(cfg.width / 2, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Border with color indicator
    ctx.strokeStyle = isInLight ? (colors.gold || '#f4d03f') : (colors.mana || '#2c3e50');
    ctx.lineWidth = 3;
    ctx.stroke();

    // Icon
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isInLight ? (colors.gold || '#f4d03f') : '#4a6fa5';
    ctx.fillText(isInLight ? 'L' : 'D', cfg.width / 2, y);

    // Label
    ctx.font = '8px monospace';
    ctx.fillStyle = colors.textMuted || '#666';
    ctx.fillText(isInLight ? 'LIGHT' : 'DARK', cfg.width / 2, y + size / 2 + 8);
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

    // Check which icon is hovered
    let hoveredIcon = null;
    for (const iconDef of SIDEBAR_ICONS) {
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

    // Check which icon was clicked
    for (const iconDef of SIDEBAR_ICONS) {
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
    const icon = SIDEBAR_ICONS.find(i => i.hotkey.toLowerCase() === key.toLowerCase());
    if (icon) {
        toggleSidebarOverlay(icon.id);
        return true;
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
            handleSidebarHotkey(e.key);
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

console.log('Icon sidebar loaded (CotDG style)');
