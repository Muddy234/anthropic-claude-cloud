// ============================================================================
// ICON SIDEBAR - Runescape-style icon-based navigation
// ============================================================================
// 70px wide vertical sidebar with clickable icons for different overlays
// ============================================================================

// Sidebar state
window.sidebarState = {
    activeOverlay: null, // 'character', 'inventory', 'skills', 'map', 'shift', null
    hoverIcon: null
};

// Icon definitions
const SIDEBAR_ICONS = [
    {
        id: 'character',
        label: 'Character',
        icon: '👤',
        y: 10,
        hotkey: 'C'
    },
    {
        id: 'inventory',
        label: 'Inventory',
        icon: '🎒',
        y: 80,
        hotkey: 'E'
    },
    {
        id: 'skills',
        label: 'Skills',
        icon: '⚔️',
        y: 150,
        hotkey: 'K'
    },
    {
        id: 'map',
        label: 'Map',
        icon: '🗺️',
        y: 220,
        hotkey: 'M'
    },
    {
        id: 'shift',
        label: 'Shift',
        icon: '⚠️',
        y: 290,
        hotkey: 'O'
    }
];

// Sidebar configuration
const SIDEBAR_CONFIG = {
    width: 70,
    iconSize: 48,
    iconPadding: 8,
    bgColor: '#1a1a1a',
    borderColor: '#333',
    hoverColor: 'rgba(255, 255, 255, 0.1)',
    activeColor: 'rgba(231, 76, 60, 0.3)',
    iconColor: '#ffffff',
    labelColor: '#888'
};

/**
 * Render the icon sidebar
 */
function renderIconSidebar(ctx, canvasHeight) {
    const cfg = SIDEBAR_CONFIG;

    // Background
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(0, 0, cfg.width, canvasHeight);

    // Right border
    ctx.strokeStyle = cfg.borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cfg.width, 0);
    ctx.lineTo(cfg.width, canvasHeight);
    ctx.stroke();

    // Draw each icon
    for (const iconDef of SIDEBAR_ICONS) {
        drawSidebarIcon(ctx, iconDef);
    }
}

/**
 * Draw a single sidebar icon
 */
function drawSidebarIcon(ctx, iconDef) {
    const cfg = SIDEBAR_CONFIG;
    const x = cfg.width / 2;
    const y = iconDef.y + cfg.iconSize / 2;
    const size = cfg.iconSize;

    const isHovered = window.sidebarState.hoverIcon === iconDef.id;
    const isActive = window.sidebarState.activeOverlay === iconDef.id;

    // Background highlight
    if (isActive) {
        ctx.fillStyle = cfg.activeColor;
        ctx.fillRect(
            cfg.width / 2 - size / 2 - cfg.iconPadding,
            iconDef.y - cfg.iconPadding,
            size + cfg.iconPadding * 2,
            size + cfg.iconPadding * 2
        );
    } else if (isHovered) {
        ctx.fillStyle = cfg.hoverColor;
        ctx.fillRect(
            cfg.width / 2 - size / 2 - cfg.iconPadding,
            iconDef.y - cfg.iconPadding,
            size + cfg.iconPadding * 2,
            size + cfg.iconPadding * 2
        );
    }

    // Icon
    ctx.font = `${size - 10}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cfg.iconColor;
    ctx.fillText(iconDef.icon, x, y);

    // Hotkey hint (small text below icon)
    ctx.font = '10px monospace';
    ctx.fillStyle = cfg.labelColor;
    ctx.fillText(`[${iconDef.hotkey}]`, x, iconDef.y + size + 5);
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
        const iconTop = iconDef.y;
        const iconBottom = iconDef.y + SIDEBAR_CONFIG.iconSize + 20;

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
        const iconTop = iconDef.y;
        const iconBottom = iconDef.y + SIDEBAR_CONFIG.iconSize + 20;

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
        'shift': 'shift'
    };

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

    console.log('✅ Icon sidebar initialized');
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', initIconSidebar);
}

// Export
window.renderIconSidebar = renderIconSidebar;
window.sidebarState = window.sidebarState;

console.log('✅ Icon sidebar loaded');
