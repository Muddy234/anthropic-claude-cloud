# UI/UX Improvement Implementation Guide

## Executive Summary

This guide provides detailed implementation instructions for improving the game's menu and UI systems. All recommendations are based on the existing canvas-based architecture and design system found in `js/ui/ui-design-system.js`.

**Key Files Referenced:**
- `js/ui/ui-design-system.js` - Central design system (colors, typography, helpers)
- `js/ui/icon-sidebar.js` - Left navigation sidebar
- `js/ui/renderer.js` - Main render loop and inventory overlay
- `js/ui/character-overlay.js` - Character sheet
- `js/ui/unit-frames.js` - Player/enemy health frames
- `js/ui/action-bar-ui.js` - Bottom-right action slots
- `js/ui/tooltip-manager.js` - Tooltip system
- `js/ui/map-overlay.js` - Dungeon map
- `js/ui/mini-map.js` - Radar minimap

---

## Section 1: Visual Hierarchy System

### Problem
All UI elements use the same gold border treatment, making nothing feel prioritized. The visual weight is uniform across menus, frames, and interactive elements.

### Implementation

#### 1.1 Add Tier Constants to Design System

**File:** `js/ui/ui-design-system.js`

Add a new visual tier system after the existing `UI_COLORS` object:

```javascript
// Visual hierarchy tiers for UI elements
const UI_TIERS = {
    primary: {
        // Reserved for critical interactive elements, active states
        borderColor: UI_COLORS.gold.base,
        borderWidth: 3,
        shadowColor: 'rgba(218, 165, 32, 0.4)',
        shadowBlur: 12,
        glowIntensity: 0.6
    },
    secondary: {
        // Standard panels, inactive menu items
        borderColor: UI_COLORS.gold.dark,
        borderWidth: 2,
        shadowColor: 'rgba(139, 105, 20, 0.25)',
        shadowBlur: 6,
        glowIntensity: 0.3
    },
    tertiary: {
        // Informational elements, tooltips, subtle containers
        borderColor: UI_COLORS.background.medium,
        borderWidth: 1,
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowBlur: 4,
        glowIntensity: 0
    },
    minimal: {
        // No border, used for inline elements
        borderColor: 'transparent',
        borderWidth: 0,
        shadowColor: 'transparent',
        shadowBlur: 0,
        glowIntensity: 0
    }
};

// Export for global access
window.UI_TIERS = UI_TIERS;
```

#### 1.2 Create Tiered Panel Drawing Function

**File:** `js/ui/ui-design-system.js`

Add this new function alongside existing `drawStylizedPanel`:

```javascript
/**
 * Draws a panel with visual hierarchy tier styling
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} width - Panel width
 * @param {number} height - Panel height
 * @param {string} tier - 'primary' | 'secondary' | 'tertiary' | 'minimal'
 * @param {Object} options - Additional options
 */
function drawTieredPanel(ctx, x, y, width, height, tier = 'secondary', options = {}) {
    const tierStyle = UI_TIERS[tier] || UI_TIERS.secondary;
    const {
        cornerRadius = 4,
        fillGradient = true,
        ornateCorners = (tier === 'primary'),
        title = null
    } = options;

    ctx.save();

    // Shadow (only for primary/secondary)
    if (tierStyle.shadowBlur > 0) {
        ctx.shadowColor = tierStyle.shadowColor;
        ctx.shadowBlur = tierStyle.shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
    }

    // Background
    if (fillGradient) {
        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, UI_COLORS.background.dark);
        gradient.addColorStop(0.5, UI_COLORS.background.medium);
        gradient.addColorStop(1, UI_COLORS.background.dark);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = UI_COLORS.background.dark;
    }

    // Draw rounded rectangle
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, cornerRadius);
    ctx.fill();

    // Reset shadow before border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border
    if (tierStyle.borderWidth > 0) {
        ctx.strokeStyle = tierStyle.borderColor;
        ctx.lineWidth = tierStyle.borderWidth;
        ctx.stroke();
    }

    // Glow effect for primary tier
    if (tierStyle.glowIntensity > 0) {
        ctx.strokeStyle = `rgba(218, 165, 32, ${tierStyle.glowIntensity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Ornate corners for primary elements
    if (ornateCorners && typeof drawOrnateCorners === 'function') {
        drawOrnateCorners(ctx, x, y, width, height, 12);
    }

    // Title bar
    if (title) {
        const titleHeight = 28;
        const titleGradient = ctx.createLinearGradient(x, y, x, y + titleHeight);
        titleGradient.addColorStop(0, 'rgba(201, 162, 39, 0.3)');
        titleGradient.addColorStop(1, 'rgba(139, 105, 20, 0.1)');
        ctx.fillStyle = titleGradient;
        ctx.fillRect(x + tierStyle.borderWidth, y + tierStyle.borderWidth,
                     width - tierStyle.borderWidth * 2, titleHeight);

        ctx.fillStyle = UI_COLORS.text.light;
        ctx.font = UI_FONTS.subheading;
        ctx.textAlign = 'center';
        ctx.fillText(title, x + width / 2, y + 20);
    }

    ctx.restore();
}

window.drawTieredPanel = drawTieredPanel;
```

#### 1.3 Apply Tiers Across UI Elements

Update each UI component to use appropriate tiers:

| Element | Current | New Tier | Rationale |
|---------|---------|----------|-----------|
| Active menu overlay | Gold border | `primary` | Currently focused |
| Inactive sidebar icons | Gold border | `tertiary` | Available but not active |
| Hovered sidebar icon | Gold border | `secondary` | Potential action |
| Selected sidebar icon | Gold border | `primary` | Current selection |
| Tooltip panels | Gold border | `tertiary` | Supplementary info |
| Item detail panel | Gold border | `secondary` | Contextual info |
| Player unit frame | Gold border | `secondary` | Persistent HUD |
| Enemy unit frame | Gold border | `tertiary` | Secondary info |
| Action bar slots | Mixed | `secondary` (ready), `tertiary` (cooldown) | Action availability |

---

## Section 2: Typography Standardization

### Problem
- Inconsistent font usage across screens
- Cryptic abbreviations (P.DEF, M.DEF)
- Debug-style formatting ([1] HEAD:)
- "undefined" and "NaN" appearing in UI

### Implementation

#### 2.1 Create Typography Helper Functions

**File:** `js/ui/ui-design-system.js`

```javascript
// Typography hierarchy with semantic naming
const UI_TYPOGRAPHY = {
    // Screen titles (JOURNAL, CHARACTER, etc.)
    screenTitle: {
        font: `bold 28px ${UI_FONT_FAMILY.display}`,
        color: UI_COLORS.gold.base,
        letterSpacing: 4,
        transform: 'uppercase'
    },
    // Section headers (VITALS, ATTRIBUTES, etc.)
    sectionHeader: {
        font: `bold 16px ${UI_FONT_FAMILY.heading}`,
        color: UI_COLORS.gold.light,
        letterSpacing: 2,
        transform: 'uppercase'
    },
    // Item/entity names
    entityName: {
        font: `bold 14px ${UI_FONT_FAMILY.heading}`,
        color: UI_COLORS.text.light,
        letterSpacing: 0,
        transform: 'none'
    },
    // Stat labels (Strength, Physical Defense)
    statLabel: {
        font: `12px ${UI_FONT_FAMILY.body}`,
        color: UI_COLORS.text.muted,
        letterSpacing: 0,
        transform: 'none'
    },
    // Stat values (10, 100/100)
    statValue: {
        font: `bold 14px ${UI_FONT_FAMILY.body}`,
        color: UI_COLORS.text.light,
        letterSpacing: 0,
        transform: 'none'
    },
    // Small helper text, hotkeys
    helper: {
        font: `10px ${UI_FONT_FAMILY.body}`,
        color: UI_COLORS.text.dark,
        letterSpacing: 0,
        transform: 'uppercase'
    },
    // Description/flavor text
    description: {
        font: `12px ${UI_FONT_FAMILY.body}`,
        color: UI_COLORS.text.muted,
        letterSpacing: 0,
        transform: 'none'
    }
};

window.UI_TYPOGRAPHY = UI_TYPOGRAPHY;

/**
 * Apply typography style and draw text
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text - Text to draw
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} style - Key from UI_TYPOGRAPHY
 * @param {string} align - 'left' | 'center' | 'right'
 */
function drawStyledText(ctx, text, x, y, style = 'statLabel', align = 'left') {
    const typo = UI_TYPOGRAPHY[style] || UI_TYPOGRAPHY.statLabel;

    ctx.save();
    ctx.font = typo.font;
    ctx.fillStyle = typo.color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';

    // Apply letter spacing via character-by-character drawing if needed
    if (typo.letterSpacing > 0) {
        let currentX = x;
        const chars = (typo.transform === 'uppercase' ? text.toUpperCase() : text).split('');

        if (align === 'center') {
            const totalWidth = chars.reduce((w, c) => w + ctx.measureText(c).width + typo.letterSpacing, 0);
            currentX = x - totalWidth / 2;
        } else if (align === 'right') {
            const totalWidth = chars.reduce((w, c) => w + ctx.measureText(c).width + typo.letterSpacing, 0);
            currentX = x - totalWidth;
        }

        for (const char of chars) {
            ctx.fillText(char, currentX, y);
            currentX += ctx.measureText(char).width + typo.letterSpacing;
        }
    } else {
        const displayText = typo.transform === 'uppercase' ? text.toUpperCase() : text;
        ctx.fillText(displayText, x, y);
    }

    ctx.restore();
}

window.drawStyledText = drawStyledText;
```

#### 2.2 Create Stat Name Mapping

**File:** `js/ui/ui-design-system.js`

```javascript
// Human-readable stat names with abbreviations
const STAT_DISPLAY_NAMES = {
    // Primary attributes
    str: { full: 'Strength', abbr: 'STR', icon: '⚔' },
    agi: { full: 'Agility', abbr: 'AGI', icon: '💨' },
    int: { full: 'Intelligence', abbr: 'INT', icon: '✨' },
    sta: { full: 'Stamina', abbr: 'STA', icon: '💪' },

    // Defensive stats
    pdef: { full: 'Physical Defense', abbr: 'P.DEF', icon: '🛡' },
    mdef: { full: 'Magic Defense', abbr: 'M.DEF', icon: '🔮' },
    'p.def': { full: 'Physical Defense', abbr: 'P.DEF', icon: '🛡' },
    'm.def': { full: 'Magic Defense', abbr: 'M.DEF', icon: '🔮' },
    physicalDefense: { full: 'Physical Defense', abbr: 'P.DEF', icon: '🛡' },
    magicDefense: { full: 'Magic Defense', abbr: 'M.DEF', icon: '🔮' },

    // Resources
    hp: { full: 'Health', abbr: 'HP', icon: '❤' },
    mp: { full: 'Mana', abbr: 'MP', icon: '💧' },
    health: { full: 'Health', abbr: 'HP', icon: '❤' },
    mana: { full: 'Mana', abbr: 'MP', icon: '💧' },

    // Combat stats
    damage: { full: 'Damage', abbr: 'DMG', icon: '⚔' },
    defense: { full: 'Defense', abbr: 'DEF', icon: '🛡' },
    critChance: { full: 'Critical Chance', abbr: 'CRIT', icon: '💥' },
    critDamage: { full: 'Critical Damage', abbr: 'C.DMG', icon: '💥' },
    attackSpeed: { full: 'Attack Speed', abbr: 'A.SPD', icon: '⚡' },
    moveSpeed: { full: 'Movement Speed', abbr: 'M.SPD', icon: '👟' }
};

window.STAT_DISPLAY_NAMES = STAT_DISPLAY_NAMES;

/**
 * Get display name for a stat
 * @param {string} statKey - Internal stat key
 * @param {string} format - 'full' | 'abbr' | 'icon'
 * @returns {string}
 */
function getStatDisplayName(statKey, format = 'full') {
    const key = statKey.toLowerCase().replace(/[_\s]/g, '');
    const mapping = STAT_DISPLAY_NAMES[key];

    if (!mapping) {
        // Fallback: convert camelCase to Title Case
        return statKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    }

    return mapping[format] || mapping.full;
}

window.getStatDisplayName = getStatDisplayName;
```

#### 2.3 Create Safe Value Display Function

**File:** `js/ui/ui-design-system.js`

```javascript
/**
 * Safely format a value for display, handling undefined/null/NaN
 * @param {any} value - The value to display
 * @param {Object} options - Formatting options
 * @returns {string}
 */
function formatDisplayValue(value, options = {}) {
    const {
        fallback = '—',           // What to show for missing values
        type = 'number',          // 'number', 'percent', 'text', 'fraction'
        decimals = 0,             // Decimal places for numbers
        max = null,               // For fraction display (current/max)
        prefix = '',              // Prefix string
        suffix = ''               // Suffix string
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

window.formatDisplayValue = formatDisplayValue;
```

#### 2.4 Update Character Sheet to Use New Typography

**File:** `js/ui/character-overlay.js`

Replace hardcoded text drawing with the new system. Example refactor for the stats section:

```javascript
// BEFORE (current code pattern):
ctx.fillStyle = '#c9a227';
ctx.font = 'bold 16px Georgia';
ctx.fillText('ATTRIBUTES', x + 20, y + 280);

ctx.fillStyle = '#efe4b0';
ctx.font = '14px Georgia';
ctx.fillText(`STR: ${player.stats?.str || 10}`, x + 30, y + 310);
ctx.fillText(`P.DEF: ${player.stats?.pdef || 0}`, x + 150, y + 310);

// AFTER (using new system):
drawStyledText(ctx, 'Attributes', x + 20, y + 280, 'sectionHeader', 'left');

const stats = [
    { key: 'str', value: player.stats?.str },
    { key: 'agi', value: player.stats?.agi },
    { key: 'int', value: player.stats?.int },
    { key: 'sta', value: player.stats?.sta },
    { key: 'pdef', value: player.stats?.pdef },
    { key: 'mdef', value: player.stats?.mdef }
];

let statY = y + 310;
const leftCol = x + 30;
const rightCol = x + 150;

stats.forEach((stat, i) => {
    const col = i < 4 ? leftCol : rightCol;
    const row = i < 4 ? i : i - 4;
    const yPos = statY + (row * 28);

    // Label
    drawStyledText(ctx, getStatDisplayName(stat.key, 'full') + ':', col, yPos, 'statLabel', 'left');

    // Value (with safe formatting)
    const displayValue = formatDisplayValue(stat.value, { fallback: '0', type: 'number' });
    drawStyledText(ctx, displayValue, col + 110, yPos, 'statValue', 'right');
});
```

---

## Section 3: Sidebar Icon Improvements

### Problem
- Single-letter icons are not intuitive
- No visual distinction between icon states
- Users must memorize hotkeys

### Implementation

#### 3.1 Add Icon Glyphs to Design System

**File:** `js/ui/ui-design-system.js`

```javascript
// Sidebar icon definitions with visual glyphs
const SIDEBAR_ICONS = {
    character: {
        id: 'character',
        hotkey: 'C',
        label: 'Character',
        // Unicode glyph (or could be sprite coordinates)
        glyph: '👤',
        // Alternative: draw function for custom icon
        draw: function(ctx, x, y, size, active) {
            // Simple person silhouette
            const s = size * 0.6;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.fillStyle = active ? UI_COLORS.gold.base : UI_COLORS.text.muted;

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
        glyph: '🎒',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? UI_COLORS.gold.base : UI_COLORS.text.muted;
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
        glyph: '⚔',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? UI_COLORS.gold.base : UI_COLORS.text.muted;
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
        glyph: '🗺',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? UI_COLORS.gold.base : UI_COLORS.text.muted;
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
        glyph: '📖',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? UI_COLORS.gold.base : UI_COLORS.text.muted;
            ctx.fillStyle = active ? UI_COLORS.gold.base : UI_COLORS.text.muted;
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
        glyph: '⏱',
        draw: function(ctx, x, y, size, active) {
            const s = size * 0.5;
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = active ? UI_COLORS.corruption.base : UI_COLORS.text.muted;
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

window.SIDEBAR_ICONS = SIDEBAR_ICONS;
```

#### 3.2 Update Sidebar Rendering

**File:** `js/ui/icon-sidebar.js`

Modify the `drawSidebarIcon` function to use the new icon definitions:

```javascript
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

    const tierStyle = UI_TIERS[tier];

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

    ctx.fillStyle = isActive ? UI_COLORS.gold.dark : 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 2);
    ctx.fill();

    ctx.fillStyle = isActive ? UI_COLORS.background.dark : UI_COLORS.text.dark;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconDef.hotkey, badgeX + badgeSize / 2, badgeY + badgeSize / 2);

    // Tooltip on hover (show label)
    if (isHovered && !isActive) {
        const labelX = x + size + 12;
        const labelY = y + size / 2;
        const labelPadding = 6;
        const labelText = iconDef.label;

        ctx.font = '12px ' + UI_FONT_FAMILY.body;
        const labelWidth = ctx.measureText(labelText).width + labelPadding * 2;

        // Label background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.roundRect(labelX, labelY - 10, labelWidth, 20, 3);
        ctx.fill();

        // Label border
        ctx.strokeStyle = UI_COLORS.gold.dark;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label text
        ctx.fillStyle = UI_COLORS.text.light;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + labelPadding, labelY);
    }

    ctx.restore();
}
```

#### 3.3 Update Sidebar Layout

**File:** `js/ui/icon-sidebar.js`

Update `renderIconSidebar` to use the new icon system:

```javascript
function renderIconSidebar(ctx, canvasHeight) {
    const sidebarWidth = UI_SIZES.sidebarWidth;
    const iconSize = UI_SIZES.sidebarIconSize;
    const iconPadding = 12;

    // Draw pillar background (existing code)
    drawPillarBackground(ctx, sidebarWidth, canvasHeight);

    // Icon configuration with grouping
    const iconGroups = [
        // Character-related
        { icons: ['character', 'inventory', 'skills'], separator: true },
        // World-related
        { icons: ['map', 'journal'], separator: true },
        // Meta
        { icons: ['shift'], separator: false }
    ];

    // Calculate starting Y position
    let currentY = 100; // After floor indicator and resource bars

    const activeOverlay = window.sidebarState?.activeOverlay;
    const hoverIcon = window.sidebarState?.hoverIcon;

    iconGroups.forEach((group, groupIndex) => {
        group.icons.forEach((iconId, iconIndex) => {
            const iconX = (sidebarWidth - iconSize) / 2;
            const iconY = currentY;

            const isActive = activeOverlay === iconId;
            const isHovered = hoverIcon === iconId;

            drawSidebarIcon(ctx, iconId, iconX, iconY, iconSize, isActive, isHovered);

            currentY += iconSize + iconPadding;
        });

        // Draw separator between groups
        if (group.separator) {
            currentY += 4;
            drawGroupSeparator(ctx, sidebarWidth, currentY);
            currentY += 12;
        }
    });

    // Draw light/dark indicator at bottom
    drawLightDarkIndicator(ctx, sidebarWidth, canvasHeight);
}

/**
 * Draw a decorative separator between icon groups
 */
function drawGroupSeparator(ctx, sidebarWidth, y) {
    const lineWidth = sidebarWidth - 20;
    const startX = 10;

    ctx.strokeStyle = UI_COLORS.gold.dark;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + lineWidth, y);
    ctx.stroke();

    // Center diamond
    const diamondSize = 4;
    const cx = sidebarWidth / 2;
    ctx.fillStyle = UI_COLORS.gold.dark;
    ctx.beginPath();
    ctx.moveTo(cx, y - diamondSize);
    ctx.lineTo(cx + diamondSize, y);
    ctx.lineTo(cx, y + diamondSize);
    ctx.lineTo(cx - diamondSize, y);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
}
```

---

## Section 4: Inventory/Equipment Polish

### Problem
- Three-panel layout purpose is unclear
- "0g" abbreviation is confusing
- Empty states show raw "No items" text
- Equipment slots are basic placeholders

### Implementation

#### 4.1 Create Equipment Slot Component

**File:** `js/ui/ui-design-system.js`

```javascript
// Equipment slot positions for body silhouette layout
const EQUIPMENT_SLOT_LAYOUT = {
    head: { x: 0.5, y: 0.1, size: 'medium', label: 'Head' },
    chest: { x: 0.5, y: 0.35, size: 'large', label: 'Chest' },
    weapon: { x: 0.15, y: 0.35, size: 'medium', label: 'Main Hand' },
    offhand: { x: 0.85, y: 0.35, size: 'medium', label: 'Off Hand' },
    legs: { x: 0.5, y: 0.6, size: 'medium', label: 'Legs' },
    feet: { x: 0.5, y: 0.85, size: 'small', label: 'Feet' },
    ring1: { x: 0.2, y: 0.6, size: 'small', label: 'Ring' },
    ring2: { x: 0.8, y: 0.6, size: 'small', label: 'Ring' },
    amulet: { x: 0.5, y: 0.22, size: 'small', label: 'Amulet' }
};

const SLOT_SIZES = {
    small: 36,
    medium: 48,
    large: 60
};

window.EQUIPMENT_SLOT_LAYOUT = EQUIPMENT_SLOT_LAYOUT;
window.SLOT_SIZES = SLOT_SIZES;

/**
 * Draw an equipment slot with silhouette icon
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} slotType - Key from EQUIPMENT_SLOT_LAYOUT
 * @param {number} containerX - Container left position
 * @param {number} containerY - Container top position
 * @param {number} containerWidth - Container width
 * @param {number} containerHeight - Container height
 * @param {Object|null} equippedItem - Item in slot, or null
 * @param {boolean} isHovered - Mouse hovering
 */
function drawEquipmentSlot(ctx, slotType, containerX, containerY, containerWidth, containerHeight, equippedItem, isHovered) {
    const layout = EQUIPMENT_SLOT_LAYOUT[slotType];
    if (!layout) return;

    const slotSize = SLOT_SIZES[layout.size];
    const x = containerX + (containerWidth * layout.x) - slotSize / 2;
    const y = containerY + (containerHeight * layout.y) - slotSize / 2;

    ctx.save();

    // Slot background
    const isEmpty = !equippedItem;
    const tier = isHovered ? 'secondary' : (isEmpty ? 'minimal' : 'tertiary');

    // Background
    ctx.fillStyle = isEmpty ? 'rgba(13, 13, 13, 0.6)' : 'rgba(38, 38, 38, 0.8)';
    ctx.beginPath();
    ctx.roundRect(x, y, slotSize, slotSize, 4);
    ctx.fill();

    // Border
    if (isEmpty) {
        ctx.strokeStyle = 'rgba(112, 104, 80, 0.3)';
        ctx.setLineDash([4, 4]);
    } else {
        // Use rarity color for equipped items
        const rarityColor = UI_COLORS.rarity[equippedItem.rarity || 'common'];
        ctx.strokeStyle = rarityColor;
        ctx.setLineDash([]);
    }
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.stroke();
    ctx.setLineDash([]);

    if (isEmpty) {
        // Draw slot type silhouette
        drawSlotSilhouette(ctx, slotType, x, y, slotSize);
    } else {
        // Draw item icon (if you have sprite system) or placeholder
        drawItemIcon(ctx, equippedItem, x + 4, y + 4, slotSize - 8);
    }

    // Hover state - show label
    if (isHovered) {
        const labelY = y + slotSize + 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.font = '10px ' + UI_FONT_FAMILY.body;
        const labelWidth = ctx.measureText(layout.label).width + 8;

        ctx.beginPath();
        ctx.roundRect(x + slotSize / 2 - labelWidth / 2, labelY, labelWidth, 16, 2);
        ctx.fill();

        ctx.fillStyle = UI_COLORS.text.muted;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layout.label, x + slotSize / 2, labelY + 8);
    }

    ctx.restore();

    // Return hit area for mouse detection
    return { x, y, width: slotSize, height: slotSize, slot: slotType };
}

/**
 * Draw silhouette icon for empty slot
 */
function drawSlotSilhouette(ctx, slotType, x, y, size) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const s = size * 0.4;

    ctx.strokeStyle = 'rgba(112, 104, 80, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    switch (slotType) {
        case 'head':
            // Helmet shape
            ctx.beginPath();
            ctx.arc(cx, cy + s * 0.1, s * 0.6, Math.PI, 0);
            ctx.lineTo(cx + s * 0.6, cy + s * 0.4);
            ctx.lineTo(cx - s * 0.6, cy + s * 0.4);
            ctx.closePath();
            ctx.stroke();
            break;

        case 'chest':
            // Chestplate shape
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.5, cy - s * 0.5);
            ctx.lineTo(cx + s * 0.5, cy - s * 0.5);
            ctx.lineTo(cx + s * 0.6, cy + s * 0.5);
            ctx.lineTo(cx, cy + s * 0.3);
            ctx.lineTo(cx - s * 0.6, cy + s * 0.5);
            ctx.closePath();
            ctx.stroke();
            break;

        case 'weapon':
            // Sword shape
            ctx.beginPath();
            ctx.moveTo(cx, cy - s * 0.7);
            ctx.lineTo(cx, cy + s * 0.3);
            ctx.moveTo(cx - s * 0.3, cy - s * 0.3);
            ctx.lineTo(cx + s * 0.3, cy - s * 0.3);
            ctx.moveTo(cx - s * 0.15, cy + s * 0.3);
            ctx.lineTo(cx + s * 0.15, cy + s * 0.3);
            ctx.lineTo(cx, cy + s * 0.6);
            ctx.lineTo(cx - s * 0.15, cy + s * 0.3);
            ctx.stroke();
            break;

        case 'offhand':
            // Shield shape
            ctx.beginPath();
            ctx.moveTo(cx, cy - s * 0.5);
            ctx.lineTo(cx + s * 0.5, cy - s * 0.3);
            ctx.lineTo(cx + s * 0.4, cy + s * 0.4);
            ctx.lineTo(cx, cy + s * 0.6);
            ctx.lineTo(cx - s * 0.4, cy + s * 0.4);
            ctx.lineTo(cx - s * 0.5, cy - s * 0.3);
            ctx.closePath();
            ctx.stroke();
            break;

        case 'legs':
            // Pants shape
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.4, cy - s * 0.4);
            ctx.lineTo(cx + s * 0.4, cy - s * 0.4);
            ctx.lineTo(cx + s * 0.35, cy + s * 0.5);
            ctx.lineTo(cx + s * 0.1, cy + s * 0.5);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx - s * 0.1, cy + s * 0.5);
            ctx.lineTo(cx - s * 0.35, cy + s * 0.5);
            ctx.closePath();
            ctx.stroke();
            break;

        case 'feet':
            // Boot shape
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.2, cy - s * 0.4);
            ctx.lineTo(cx + s * 0.2, cy - s * 0.4);
            ctx.lineTo(cx + s * 0.2, cy + s * 0.2);
            ctx.lineTo(cx + s * 0.5, cy + s * 0.2);
            ctx.lineTo(cx + s * 0.5, cy + s * 0.4);
            ctx.lineTo(cx - s * 0.3, cy + s * 0.4);
            ctx.lineTo(cx - s * 0.3, cy + s * 0.2);
            ctx.lineTo(cx - s * 0.2, cy + s * 0.2);
            ctx.closePath();
            ctx.stroke();
            break;

        case 'ring1':
        case 'ring2':
            // Ring shape
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2);
            ctx.stroke();
            break;

        case 'amulet':
            // Amulet/pendant shape
            ctx.beginPath();
            ctx.arc(cx, cy + s * 0.1, s * 0.35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.2, cy - s * 0.2);
            ctx.quadraticCurveTo(cx, cy - s * 0.5, cx + s * 0.2, cy - s * 0.2);
            ctx.stroke();
            break;
    }
}

window.drawEquipmentSlot = drawEquipmentSlot;
window.drawSlotSilhouette = drawSlotSilhouette;
```

#### 4.2 Create Empty State Component

**File:** `js/ui/ui-design-system.js`

```javascript
/**
 * Draw an empty state message with helpful hint
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {string} category - 'weapons', 'armor', 'consumables', 'items', 'all'
 */
function drawEmptyStateMessage(ctx, x, y, category = 'all') {
    const messages = {
        weapons: {
            icon: '⚔',
            title: 'No Weapons',
            hint: 'Defeat enemies or visit the blacksmith to find weapons.'
        },
        armor: {
            icon: '🛡',
            title: 'No Armor',
            hint: 'Explore dungeons or trade with merchants for armor.'
        },
        consumables: {
            icon: '🧪',
            title: 'No Consumables',
            hint: 'Pick up potions from defeated enemies or buy from shops.'
        },
        items: {
            icon: '📦',
            title: 'No Items',
            hint: 'Collect loot from chests and fallen foes.'
        },
        all: {
            icon: '🎒',
            title: 'Inventory Empty',
            hint: 'Your adventure awaits! Find items in the dungeon.'
        }
    };

    const msg = messages[category] || messages.all;

    ctx.save();

    // Icon
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = UI_COLORS.text.muted;
    ctx.fillText(msg.icon, x, y - 20);

    // Title
    ctx.globalAlpha = 0.6;
    ctx.font = `bold 14px ${UI_FONT_FAMILY.heading}`;
    ctx.fillStyle = UI_COLORS.text.muted;
    ctx.fillText(msg.title, x, y + 20);

    // Hint
    ctx.globalAlpha = 0.4;
    ctx.font = `11px ${UI_FONT_FAMILY.body}`;

    // Word wrap hint text
    const maxWidth = 200;
    const words = msg.hint.split(' ');
    let line = '';
    let lineY = y + 45;

    for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth) {
            ctx.fillText(line.trim(), x, lineY);
            line = word + ' ';
            lineY += 16;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), x, lineY);

    ctx.globalAlpha = 1;
    ctx.restore();
}

window.drawEmptyStateMessage = drawEmptyStateMessage;
```

#### 4.3 Update Gold Display Format

**File:** `js/ui/renderer.js` (in `drawInventoryOverlay` and similar)

Replace all instances of `"0g"` format:

```javascript
// BEFORE:
ctx.fillText(`${player.gold || 0}g | ${itemCount} items`, x + 20, y + 30);

// AFTER:
const goldDisplay = formatDisplayValue(player.gold, { fallback: '0', type: 'number' });
const itemDisplay = formatDisplayValue(itemCount, { fallback: '0', type: 'number' });

// Draw gold with icon
ctx.fillStyle = UI_COLORS.gold.base;
ctx.font = '12px ' + UI_FONT_FAMILY.body;
ctx.fillText('💰', x + 20, y + 30);
ctx.fillStyle = UI_COLORS.text.light;
ctx.fillText(goldDisplay, x + 38, y + 30);

// Draw item count
ctx.fillStyle = UI_COLORS.text.muted;
ctx.fillText('|', x + 80, y + 30);
ctx.fillText(`${itemDisplay} items`, x + 95, y + 30);
```

---

## Section 5: Tab Navigation Enhancement

### Problem
- No clear visual indicator for active tab
- Harsh yellow color
- Equal-width tabs look unbalanced

### Implementation

#### 5.1 Create Improved Tab Component

**File:** `js/ui/ui-design-system.js`

```javascript
/**
 * Draw a tab bar with proper active/inactive states
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} width - Total tab bar width
 * @param {Array} tabs - Array of { id, label, icon? }
 * @param {string} activeTabId - Currently active tab ID
 * @param {string|null} hoveredTabId - Currently hovered tab ID
 * @returns {Array} - Hit areas for each tab
 */
function drawTabBar(ctx, x, y, width, tabs, activeTabId, hoveredTabId = null) {
    const tabHeight = 32;
    const tabPadding = 12;
    const tabGap = 2;

    ctx.save();

    // Calculate tab widths based on content
    ctx.font = `bold 11px ${UI_FONT_FAMILY.body}`;
    const tabWidths = tabs.map(tab => {
        const textWidth = ctx.measureText(tab.label.toUpperCase()).width;
        return textWidth + tabPadding * 2 + (tab.icon ? 18 : 0);
    });

    // If total exceeds width, use equal distribution
    const totalWidth = tabWidths.reduce((a, b) => a + b, 0) + (tabs.length - 1) * tabGap;
    const useEqualWidth = totalWidth > width;
    const equalWidth = useEqualWidth ? (width - (tabs.length - 1) * tabGap) / tabs.length : 0;

    // Draw background bar
    ctx.fillStyle = UI_COLORS.background.dark;
    ctx.fillRect(x, y, width, tabHeight);

    // Bottom border
    ctx.strokeStyle = UI_COLORS.gold.dark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + tabHeight);
    ctx.lineTo(x + width, y + tabHeight);
    ctx.stroke();

    const hitAreas = [];
    let currentX = x;

    tabs.forEach((tab, index) => {
        const tabWidth = useEqualWidth ? equalWidth : tabWidths[index];
        const isActive = tab.id === activeTabId;
        const isHovered = tab.id === hoveredTabId;

        // Tab background
        if (isActive) {
            // Active tab - raised appearance
            const gradient = ctx.createLinearGradient(currentX, y, currentX, y + tabHeight);
            gradient.addColorStop(0, 'rgba(201, 162, 39, 0.25)');
            gradient.addColorStop(1, 'rgba(139, 105, 20, 0.1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(currentX, y, tabWidth, tabHeight);

            // Active indicator (gold underline)
            ctx.fillStyle = UI_COLORS.gold.base;
            ctx.fillRect(currentX + 4, y + tabHeight - 3, tabWidth - 8, 3);

        } else if (isHovered) {
            // Hover state
            ctx.fillStyle = 'rgba(201, 162, 39, 0.1)';
            ctx.fillRect(currentX, y, tabWidth, tabHeight);
        }

        // Tab text
        ctx.fillStyle = isActive ? UI_COLORS.gold.light : (isHovered ? UI_COLORS.text.light : UI_COLORS.text.muted);
        ctx.font = isActive ? `bold 11px ${UI_FONT_FAMILY.body}` : `11px ${UI_FONT_FAMILY.body}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textX = currentX + tabWidth / 2;
        const textY = y + tabHeight / 2;

        // Icon + text
        if (tab.icon) {
            ctx.fillText(tab.icon, textX - ctx.measureText(tab.label.toUpperCase()).width / 2 - 10, textY);
            ctx.fillText(tab.label.toUpperCase(), textX + 8, textY);
        } else {
            ctx.fillText(tab.label.toUpperCase(), textX, textY);
        }

        // Store hit area
        hitAreas.push({
            id: tab.id,
            x: currentX,
            y: y,
            width: tabWidth,
            height: tabHeight
        });

        currentX += tabWidth + tabGap;
    });

    ctx.restore();

    return hitAreas;
}

window.drawTabBar = drawTabBar;
```

#### 5.2 Update Inventory Tabs

**File:** `js/ui/renderer.js` (in `drawInventoryOverlay`)

Replace the current tab drawing with the new component:

```javascript
// Define tabs
const inventoryTabs = [
    { id: 'weapons', label: 'Weapons', icon: '⚔' },
    { id: 'armor', label: 'Armor', icon: '🛡' },
    { id: 'consumables', label: 'Consume', icon: '🧪' },
    { id: 'items', label: 'Items', icon: '📦' },
    { id: 'equipped', label: 'Equipped', icon: '👤' }
];

// Draw tab bar
const tabHitAreas = drawTabBar(
    ctx,
    panelX,
    panelY,
    panelWidth,
    inventoryTabs,
    currentTab,  // e.g., 'weapons'
    hoveredTab   // from mouse tracking
);

// Store hit areas for click detection
window.inventoryTabHitAreas = tabHitAreas;
```

---

## Section 6: Combat Log Enhancement

### Problem
- Single line of text at bottom easily missed
- No color coding for different message types
- No history/scrollback

### Implementation

#### 6.1 Create Combat Log Manager

**File:** `js/ui/combat-log-ui.js` (new file)

```javascript
/**
 * Combat Log Manager
 * Handles message display, history, and styling
 */
const CombatLogUI = {
    // Configuration
    config: {
        maxMessages: 50,           // History size
        displayCount: 5,           // Visible messages
        messageDuration: 4000,     // ms before fade starts
        fadeDuration: 1000,        // ms to fully fade
        x: 90,                     // Left position (after sidebar)
        bottomMargin: 60,          // From bottom of screen
        maxWidth: 400,
        lineHeight: 18
    },

    // Message type styling
    styles: {
        damage_dealt: {
            color: '#7dce82',  // Green
            prefix: '⚔ ',
            bold: false
        },
        damage_taken: {
            color: '#e85d5d',  // Red
            prefix: '💔 ',
            bold: true
        },
        heal: {
            color: '#82d9ce',  // Cyan
            prefix: '✨ ',
            bold: false
        },
        pickup: {
            color: '#daa520',  // Gold
            prefix: '✦ ',
            bold: false
        },
        level_up: {
            color: '#ffd700',  // Bright gold
            prefix: '⬆ ',
            bold: true
        },
        system: {
            color: '#b8a878',  // Muted
            prefix: '',
            bold: false
        },
        death: {
            color: '#ff4444',  // Bright red
            prefix: '💀 ',
            bold: true
        },
        discovery: {
            color: '#9b7ed9',  // Purple
            prefix: '🔮 ',
            bold: false
        }
    },

    /**
     * Add a message to the log
     * @param {string} text - Message text
     * @param {string} type - Message type (damage_dealt, damage_taken, heal, pickup, etc.)
     */
    addMessage: function(text, type = 'system') {
        if (!game.combatLog) {
            game.combatLog = [];
        }

        game.combatLog.push({
            text: text,
            type: type,
            timestamp: Date.now()
        });

        // Trim to max size
        if (game.combatLog.length > this.config.maxMessages) {
            game.combatLog.shift();
        }
    },

    /**
     * Render the combat log
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasHeight
     */
    render: function(ctx, canvasHeight) {
        if (!game.combatLog || game.combatLog.length === 0) return;

        const now = Date.now();
        const cfg = this.config;

        // Get recent messages
        const recentMessages = game.combatLog
            .slice(-cfg.displayCount)
            .map(msg => {
                const age = now - msg.timestamp;
                let alpha = 1;

                if (age > cfg.messageDuration) {
                    const fadeProgress = (age - cfg.messageDuration) / cfg.fadeDuration;
                    alpha = Math.max(0, 1 - fadeProgress);
                }

                return { ...msg, alpha };
            })
            .filter(msg => msg.alpha > 0);

        if (recentMessages.length === 0) return;

        ctx.save();

        // Draw from bottom up
        let y = canvasHeight - cfg.bottomMargin;

        for (let i = recentMessages.length - 1; i >= 0; i--) {
            const msg = recentMessages[i];
            const style = this.styles[msg.type] || this.styles.system;

            ctx.globalAlpha = msg.alpha;

            // Background for better readability
            ctx.font = style.bold ? `bold 12px ${UI_FONT_FAMILY.body}` : `12px ${UI_FONT_FAMILY.body}`;
            const textWidth = ctx.measureText(style.prefix + msg.text).width;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(cfg.x - 4, y - 12, textWidth + 8, cfg.lineHeight);

            // Text
            ctx.fillStyle = style.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(style.prefix + msg.text, cfg.x, y);

            y -= cfg.lineHeight;
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    /**
     * Clear all messages
     */
    clear: function() {
        if (game.combatLog) {
            game.combatLog = [];
        }
    }
};

window.CombatLogUI = CombatLogUI;
```

#### 6.2 Integrate Combat Log

**File:** `js/ui/renderer.js`

Replace the existing message rendering with the new system:

```javascript
// In the main render function, replace:
// if (game.messageLog && game.messageLog.length > 0 && Date.now() - game.lastMessageTime < 3000) {
//     ctx.fillStyle = '#efe4b0';
//     ctx.font = '14px Georgia';
//     ctx.textAlign = 'left';
//     ctx.fillText(game.messageLog[game.messageLog.length - 1].text, TRACKER_WIDTH + 20, canvas.height - 40);
// }

// With:
if (typeof CombatLogUI !== 'undefined') {
    CombatLogUI.render(ctx, canvas.height);
}
```

#### 6.3 Update Combat System to Use New Log

**File:** `js/systems/combat-system.js` (and related files)

Replace `game.messageLog.push()` calls with:

```javascript
// BEFORE:
game.messageLog.push({ text: `You hit ${enemy.name} for ${damage} damage!` });
game.lastMessageTime = Date.now();

// AFTER:
CombatLogUI.addMessage(`You hit ${enemy.name} for ${damage} damage!`, 'damage_dealt');

// For damage taken:
CombatLogUI.addMessage(`${enemy.name} hits you for ${damage} damage!`, 'damage_taken');

// For pickups:
CombatLogUI.addMessage(`Picked up: ${item.name}`, 'pickup');

// For healing:
CombatLogUI.addMessage(`Restored ${amount} HP`, 'heal');
```

---

## Section 7: Map Overlay Improvements

### Problem
- Map is mostly empty with minimal context
- No clear indication of current floor
- Zoom controls not prominent

### Implementation

#### 7.1 Add Map Header with Floor Info

**File:** `js/ui/map-overlay.js`

Update `drawMapOverlay` to include a header section:

```javascript
function drawMapHeader(ctx, x, y, width) {
    const headerHeight = 50;

    // Header background
    const gradient = ctx.createLinearGradient(x, y, x, y + headerHeight);
    gradient.addColorStop(0, 'rgba(201, 162, 39, 0.2)');
    gradient.addColorStop(1, 'rgba(13, 13, 13, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, headerHeight);

    // Title
    ctx.fillStyle = UI_COLORS.gold.base;
    ctx.font = `bold 20px ${UI_FONT_FAMILY.display}`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText('CARTOGRAPHIA', x + width / 2, y + 22);

    // Floor indicator
    const floorNum = game.currentFloor || 1;
    ctx.fillStyle = UI_COLORS.text.light;
    ctx.font = `14px ${UI_FONT_FAMILY.body}`;
    ctx.fillText(`Floor ${floorNum} — The Shifting Chasm`, x + width / 2, y + 42);

    // Decorative line
    ctx.strokeStyle = UI_COLORS.gold.dark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 40, y + headerHeight - 1);
    ctx.lineTo(x + width - 40, y + headerHeight - 1);
    ctx.stroke();

    return headerHeight;
}
```

#### 7.2 Add Room Outlines and Fog of War Visualization

**File:** `js/ui/map-overlay.js`

```javascript
/**
 * Draw room outlines on the map
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} mapX - Map area left
 * @param {number} mapY - Map area top
 * @param {number} tileSize - Pixel size of each tile
 */
function drawRoomOutlines(ctx, mapX, mapY, tileSize) {
    if (!game.dungeon || !game.dungeon.rooms) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    game.dungeon.rooms.forEach((room, index) => {
        // Only draw if room has been discovered
        const roomExplored = isRoomExplored(room);
        if (!roomExplored) return;

        const rx = mapX + room.x * tileSize;
        const ry = mapY + room.y * tileSize;
        const rw = room.width * tileSize;
        const rh = room.height * tileSize;

        ctx.strokeRect(rx, ry, rw, rh);

        // Room number/name if special
        if (room.type && room.type !== 'normal') {
            ctx.fillStyle = 'rgba(201, 162, 39, 0.5)';
            ctx.font = '10px ' + UI_FONT_FAMILY.body;
            ctx.textAlign = 'center';
            ctx.fillText(room.type.toUpperCase(), rx + rw / 2, ry + rh / 2);
        }
    });

    ctx.setLineDash([]);
    ctx.restore();
}

/**
 * Check if a room has been explored by the player
 */
function isRoomExplored(room) {
    if (!game.exploredTiles) return false;

    // Check if at least one tile in the room has been explored
    for (let x = room.x; x < room.x + room.width; x++) {
        for (let y = room.y; y < room.y + room.height; y++) {
            const key = `${x},${y}`;
            if (game.exploredTiles.has(key)) return true;
        }
    }
    return false;
}
```

#### 7.3 Improve Legend Visibility

**File:** `js/ui/map-overlay.js`

```javascript
function drawMapLegend(ctx, x, y, width) {
    const legendItems = [
        { color: '#5588ff', label: 'You', shape: 'circle' },
        { color: '#ff4444', label: 'Enemies', shape: 'circle' },
        { color: '#ffcc00', label: 'Loot', shape: 'diamond' },
        { color: '#00ffcc', label: 'Exit', shape: 'square' },
        { color: '#daa520', label: 'Shrine', shape: 'star' },
        { color: '#666666', label: 'Unexplored', shape: 'square' }
    ];

    const legendHeight = 24;
    const itemSpacing = width / legendItems.length;

    // Background
    ctx.fillStyle = 'rgba(13, 13, 13, 0.85)';
    ctx.fillRect(x, y, width, legendHeight);

    // Border
    ctx.strokeStyle = UI_COLORS.gold.dark;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, legendHeight);

    // Items
    ctx.font = '10px ' + UI_FONT_FAMILY.body;
    ctx.textBaseline = 'middle';

    legendItems.forEach((item, i) => {
        const itemX = x + 15 + i * itemSpacing;
        const itemY = y + legendHeight / 2;

        // Shape
        ctx.fillStyle = item.color;
        const shapeSize = 6;

        switch (item.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(itemX, itemY, shapeSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'diamond':
                ctx.beginPath();
                ctx.moveTo(itemX, itemY - shapeSize / 2);
                ctx.lineTo(itemX + shapeSize / 2, itemY);
                ctx.lineTo(itemX, itemY + shapeSize / 2);
                ctx.lineTo(itemX - shapeSize / 2, itemY);
                ctx.closePath();
                ctx.fill();
                break;
            case 'square':
                ctx.fillRect(itemX - shapeSize / 2, itemY - shapeSize / 2, shapeSize, shapeSize);
                break;
            case 'star':
                drawMiniStar(ctx, itemX, itemY, shapeSize / 2);
                break;
        }

        // Label
        ctx.fillStyle = UI_COLORS.text.muted;
        ctx.textAlign = 'left';
        ctx.fillText(item.label, itemX + 10, itemY);
    });
}

function drawMiniStar(ctx, cx, cy, r) {
    const points = 5;
    const inner = r * 0.4;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? r : inner;
        const angle = (i * Math.PI / points) - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}
```

---

## Section 8: Action Bar Enhancement

### Problem
- Shows key bindings without ability context
- Small and easy to miss
- Cooldown display is basic

### Implementation

#### 8.1 Add Ability Icons to Action Bar

**File:** `js/ui/action-bar-ui.js`

Create an icon system for abilities:

```javascript
// Ability icon definitions
const ABILITY_ICONS = {
    dash: {
        draw: function(ctx, x, y, size) {
            // Speed lines / motion blur effect
            ctx.strokeStyle = '#82d9ce';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            const cx = x + size / 2;
            const cy = y + size / 2;

            // Arrow pointing right
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.25, cy);
            ctx.lineTo(cx + size * 0.25, cy);
            ctx.lineTo(cx + size * 0.1, cy - size * 0.15);
            ctx.moveTo(cx + size * 0.25, cy);
            ctx.lineTo(cx + size * 0.1, cy + size * 0.15);
            ctx.stroke();

            // Motion lines
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.35, cy - size * 0.1);
            ctx.lineTo(cx - size * 0.15, cy - size * 0.1);
            ctx.moveTo(cx - size * 0.35, cy + size * 0.1);
            ctx.lineTo(cx - size * 0.15, cy + size * 0.1);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    },
    torch: {
        draw: function(ctx, x, y, size, isOn) {
            const cx = x + size / 2;
            const cy = y + size / 2;

            if (isOn) {
                // Sun icon
                ctx.fillStyle = '#ffcc44';
                ctx.beginPath();
                ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
                ctx.fill();

                // Rays
                ctx.strokeStyle = '#ffcc44';
                ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI / 4);
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle) * size * 0.28, cy + Math.sin(angle) * size * 0.28);
                    ctx.lineTo(cx + Math.cos(angle) * size * 0.38, cy + Math.sin(angle) * size * 0.38);
                    ctx.stroke();
                }
            } else {
                // Moon icon
                ctx.fillStyle = '#7a89c2';
                ctx.beginPath();
                ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
                ctx.fill();

                // Moon cutout
                ctx.fillStyle = UI_COLORS.background.dark;
                ctx.beginPath();
                ctx.arc(cx + size * 0.12, cy - size * 0.08, size * 0.18, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },
    potion: {
        draw: function(ctx, x, y, size, color = '#e85d5d') {
            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2;

            // Bottle shape
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.1, cy - size * 0.25);
            ctx.lineTo(cx - size * 0.1, cy - size * 0.15);
            ctx.lineTo(cx - size * 0.2, cy);
            ctx.lineTo(cx - size * 0.2, cy + size * 0.25);
            ctx.lineTo(cx + size * 0.2, cy + size * 0.25);
            ctx.lineTo(cx + size * 0.2, cy);
            ctx.lineTo(cx + size * 0.1, cy - size * 0.15);
            ctx.lineTo(cx + size * 0.1, cy - size * 0.25);
            ctx.closePath();
            ctx.stroke();

            // Liquid fill
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.18, cy + size * 0.05);
            ctx.lineTo(cx - size * 0.18, cy + size * 0.23);
            ctx.lineTo(cx + size * 0.18, cy + size * 0.23);
            ctx.lineTo(cx + size * 0.18, cy + size * 0.05);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
};

window.ABILITY_ICONS = ABILITY_ICONS;
```

#### 8.2 Update Action Slot Rendering

**File:** `js/ui/action-bar-ui.js`

Update `drawStylizedActionSlot` to include icons:

```javascript
function drawStylizedActionSlot(ctx, x, y, size, slotData) {
    const {
        hotkey,
        ability,
        cooldown,
        cooldownMax,
        charges,
        maxCharges,
        isReady,
        isDisabled
    } = slotData;

    ctx.save();

    // Background
    const bgColor = isDisabled ? 'rgba(30, 30, 30, 0.9)' : 'rgba(45, 45, 45, 0.9)';
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 6);
    ctx.fill();

    // Border - based on state
    if (isReady && !isDisabled) {
        // Ready glow
        ctx.shadowColor = 'rgba(125, 206, 130, 0.6)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#7dce82';
        ctx.lineWidth = 2;
    } else if (cooldown > 0) {
        ctx.strokeStyle = UI_COLORS.gold.dark;
        ctx.lineWidth = 1;
    } else {
        ctx.strokeStyle = 'rgba(112, 104, 80, 0.5)';
        ctx.lineWidth = 1;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw ability icon
    if (ability && ABILITY_ICONS[ability]) {
        ctx.globalAlpha = isDisabled ? 0.3 : 1;
        ABILITY_ICONS[ability].draw(ctx, x, y, size);
        ctx.globalAlpha = 1;
    }

    // Cooldown overlay
    if (cooldown > 0 && cooldownMax > 0) {
        drawCooldownSweep(ctx, x, y, size, cooldown / cooldownMax);

        // Cooldown text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 14px ${UI_FONT_FAMILY.body}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cooldown.toFixed(1), x + size / 2, y + size / 2);
    }

    // Hotkey badge
    const badgeSize = 16;
    const badgeX = x + size - badgeSize - 2;
    const badgeY = y + 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 3);
    ctx.fill();

    ctx.fillStyle = UI_COLORS.text.muted;
    ctx.font = `bold 10px ${UI_FONT_FAMILY.body}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hotkey, badgeX + badgeSize / 2, badgeY + badgeSize / 2);

    // Charges indicator (if applicable)
    if (maxCharges && maxCharges > 1) {
        const chargeY = y + size - 6;
        ctx.fillStyle = UI_COLORS.text.dark;
        ctx.font = '9px ' + UI_FONT_FAMILY.body;
        ctx.textAlign = 'center';
        ctx.fillText(`${charges}/${maxCharges}`, x + size / 2, chargeY);
    }

    ctx.restore();
}
```

---

## Section 9: Tooltip System Enhancement

### Problem
- Tooltip delay may feel slow
- No stat comparison shown
- Missing on many elements

### Implementation

#### 9.1 Ensure Tooltip Zones Are Registered

The tooltip system exists in `js/ui/tooltip-manager.js`. The key is ensuring zones are registered for all interactive elements.

**File:** `js/ui/icon-sidebar.js`

Add tooltip registration after drawing each icon:

```javascript
// After drawing each sidebar icon, register its tooltip zone
TooltipManager.registerZone({
    x: iconX - 4,
    y: iconY - 4,
    width: iconSize + 8,
    height: iconSize + 8,
    tooltip: TooltipManager.createSimpleTooltip(
        iconDef.label,
        `Press [${iconDef.hotkey}] to open`
    )
});
```

**File:** `js/ui/renderer.js` (in inventory drawing)

Register tooltips for inventory items:

```javascript
// When drawing each item in the inventory list
items.forEach((item, index) => {
    const itemY = listStartY + index * itemHeight;

    // Draw item row...

    // Register tooltip zone
    TooltipManager.registerZone({
        x: listX,
        y: itemY,
        width: listWidth,
        height: itemHeight,
        tooltip: TooltipManager.createItemTooltip(
            item,
            getEquippedItemForSlot(item.slot) // For comparison
        )
    });
});
```

#### 9.2 Add Stat Comparison to Item Tooltips

**File:** `js/ui/tooltip-manager.js`

Enhance the `createItemTooltip` function:

```javascript
createItemTooltip: function(item, equippedItem = null) {
    const lines = [];

    // Item name with rarity color
    lines.push({
        text: item.name,
        color: UI_COLORS.rarity[item.rarity || 'common'],
        font: 'bold'
    });

    // Item type
    lines.push({
        text: `${(item.rarity || 'Common').toUpperCase()} ${(item.type || 'Item').toUpperCase()}`,
        color: UI_COLORS.text.dark,
        font: 'small'
    });

    // Spacer
    lines.push({ text: '', height: 8 });

    // Stats with comparison
    if (item.stats) {
        Object.entries(item.stats).forEach(([stat, value]) => {
            const displayName = getStatDisplayName(stat, 'full');
            let comparisonText = '';
            let comparisonColor = UI_COLORS.text.light;

            if (equippedItem && equippedItem.stats && equippedItem.stats[stat] !== undefined) {
                const diff = value - equippedItem.stats[stat];
                if (diff > 0) {
                    comparisonText = ` (+${diff})`;
                    comparisonColor = '#7dce82'; // Green
                } else if (diff < 0) {
                    comparisonText = ` (${diff})`;
                    comparisonColor = '#e85d5d'; // Red
                }
            }

            lines.push({
                text: `${displayName}: ${value}${comparisonText}`,
                color: comparisonColor
            });
        });
    }

    // Description
    if (item.description) {
        lines.push({ text: '', height: 8 });
        lines.push({
            text: item.description,
            color: UI_COLORS.text.muted,
            font: 'italic',
            wrap: true
        });
    }

    // Sell value
    if (item.sellValue) {
        lines.push({ text: '', height: 8 });
        lines.push({
            text: `Sell: ${item.sellValue} gold`,
            color: UI_COLORS.gold.dark,
            font: 'small'
        });
    }

    return { lines };
}
```

---

## Section 10: Animation and Feedback Polish

### Problem
- No menu open/close animations
- No sound feedback for navigation
- Transitions feel abrupt

### Implementation

#### 10.1 Add Menu Transition State

**File:** `js/ui/ui-design-system.js`

```javascript
// Menu transition manager
const MenuTransition = {
    activeTransition: null,

    /**
     * Start a menu open transition
     * @param {string} menuId - Menu identifier
     * @param {Function} onComplete - Callback when done
     */
    open: function(menuId, onComplete) {
        this.activeTransition = {
            menuId: menuId,
            type: 'open',
            progress: 0,
            startTime: performance.now(),
            duration: UI_ANIMATION.normal,
            onComplete: onComplete
        };
    },

    /**
     * Start a menu close transition
     * @param {string} menuId - Menu identifier
     * @param {Function} onComplete - Callback when done
     */
    close: function(menuId, onComplete) {
        this.activeTransition = {
            menuId: menuId,
            type: 'close',
            progress: 1,
            startTime: performance.now(),
            duration: UI_ANIMATION.fast,
            onComplete: onComplete
        };
    },

    /**
     * Update transition progress
     * @returns {number} - Current progress (0-1)
     */
    update: function() {
        if (!this.activeTransition) return 1;

        const elapsed = performance.now() - this.activeTransition.startTime;
        const rawProgress = Math.min(1, elapsed / this.activeTransition.duration);

        // Apply easing
        const easedProgress = UI_EASING.easeOut(rawProgress);

        if (this.activeTransition.type === 'open') {
            this.activeTransition.progress = easedProgress;
        } else {
            this.activeTransition.progress = 1 - easedProgress;
        }

        // Check completion
        if (rawProgress >= 1) {
            if (this.activeTransition.onComplete) {
                this.activeTransition.onComplete();
            }
            const finalProgress = this.activeTransition.progress;
            this.activeTransition = null;
            return finalProgress;
        }

        return this.activeTransition.progress;
    },

    /**
     * Get current menu transform values
     * @returns {Object} - { scale, alpha, offsetY }
     */
    getTransform: function() {
        const progress = this.activeTransition ? this.activeTransition.progress : 1;

        return {
            scale: 0.95 + (progress * 0.05),     // 0.95 -> 1.0
            alpha: progress,                      // 0 -> 1
            offsetY: (1 - progress) * 20          // 20 -> 0
        };
    }
};

window.MenuTransition = MenuTransition;
```

#### 10.2 Apply Transitions to Menu Rendering

**File:** `js/ui/renderer.js`

Update overlay drawing to use transitions:

```javascript
function drawInventoryOverlay(ctx) {
    // Update transition
    const transform = MenuTransition.getTransform();

    ctx.save();
    ctx.globalAlpha = transform.alpha;

    // Apply scale from center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.translate(centerX, centerY + transform.offsetY);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-centerX, -centerY);

    // ... rest of inventory drawing code ...

    ctx.restore();
}
```

#### 10.3 Add UI Sound Hooks

**File:** `js/ui/ui-design-system.js`

```javascript
// UI Sound effect triggers (integrate with your audio system)
const UI_SOUNDS = {
    menuOpen: 'ui_menu_open',
    menuClose: 'ui_menu_close',
    tabSwitch: 'ui_tab_switch',
    buttonHover: 'ui_button_hover',
    buttonClick: 'ui_button_click',
    itemPickup: 'ui_item_pickup',
    itemEquip: 'ui_item_equip',
    error: 'ui_error',
    success: 'ui_success'
};

/**
 * Play a UI sound effect
 * @param {string} soundId - Key from UI_SOUNDS
 */
function playUISound(soundId) {
    const soundKey = UI_SOUNDS[soundId];
    if (soundKey && typeof AudioManager !== 'undefined') {
        AudioManager.playSound(soundKey, { volume: 0.5 });
    }
}

window.UI_SOUNDS = UI_SOUNDS;
window.playUISound = playUISound;
```

#### 10.4 Integrate Sounds with Interactions

**File:** `js/ui/icon-sidebar.js`

```javascript
// In click handler
function handleSidebarClick(e) {
    const clickedIcon = getIconAtPosition(e.clientX, e.clientY);

    if (clickedIcon) {
        if (window.sidebarState.activeOverlay === clickedIcon) {
            // Closing menu
            playUISound('menuClose');
            MenuTransition.close(clickedIcon, () => {
                window.sidebarState.activeOverlay = null;
            });
        } else {
            // Opening menu
            playUISound('menuOpen');
            window.sidebarState.activeOverlay = clickedIcon;
            MenuTransition.open(clickedIcon);
        }
    }
}

// In hover handler
function handleSidebarMouseMove(e) {
    const newHover = getIconAtPosition(e.clientX, e.clientY);

    if (newHover !== window.sidebarState.hoverIcon) {
        if (newHover) {
            playUISound('buttonHover');
        }
        window.sidebarState.hoverIcon = newHover;
    }
}
```

---

## Appendix A: File Change Summary

| File | Changes |
|------|---------|
| `js/ui/ui-design-system.js` | Add UI_TIERS, UI_TYPOGRAPHY, STAT_DISPLAY_NAMES, EQUIPMENT_SLOT_LAYOUT, SIDEBAR_ICONS, MenuTransition, UI_SOUNDS, and helper functions |
| `js/ui/icon-sidebar.js` | Replace letter icons with visual glyphs, add grouping, update state management |
| `js/ui/renderer.js` | Update inventory overlay, add transitions, integrate CombatLogUI |
| `js/ui/character-overlay.js` | Use new typography system, fix undefined values |
| `js/ui/action-bar-ui.js` | Add ability icons, enhance cooldown display |
| `js/ui/map-overlay.js` | Add header, room outlines, improved legend |
| `js/ui/tooltip-manager.js` | Enhance item tooltips with comparison |
| `js/ui/combat-log-ui.js` | New file for message display system |

---

## Appendix B: Testing Checklist

- [ ] All menus open/close with transitions
- [ ] Sidebar icons display correctly at all states (normal, hover, active)
- [ ] Tooltips appear on hover for all interactive elements
- [ ] No "undefined" or "NaN" values appear in any UI
- [ ] Tab switching has visual feedback
- [ ] Combat log shows colored messages
- [ ] Equipment slots show silhouette when empty
- [ ] Map displays floor number and room outlines
- [ ] Action bar shows ability icons
- [ ] Sound effects play for UI interactions (if audio enabled)

---

## Appendix C: Design Token Quick Reference

```javascript
// Colors
UI_COLORS.gold.base        // #c9a227 - Primary accent
UI_COLORS.text.light       // #efe4b0 - Primary text
UI_COLORS.text.muted       // #b8a878 - Secondary text
UI_COLORS.background.dark  // #0d0d0d - Panel backgrounds

// Typography
UI_TYPOGRAPHY.screenTitle   // Large gold headers
UI_TYPOGRAPHY.sectionHeader // Section labels
UI_TYPOGRAPHY.statLabel     // Stat names
UI_TYPOGRAPHY.statValue     // Stat numbers

// Tiers
UI_TIERS.primary   // Active/focused elements
UI_TIERS.secondary // Standard panels
UI_TIERS.tertiary  // Subtle/informational
UI_TIERS.minimal   // No border/background
```
