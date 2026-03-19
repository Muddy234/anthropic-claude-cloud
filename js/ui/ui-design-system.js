// ============================================================================
// UI DESIGN SYSTEM - Occult Dungeon Aesthetic
// ============================================================================
// Central design constants for consistent, polished UI across all components
// Inspired by: Ancient grimoires, weathered stone, and occult symbolism
// ============================================================================

// ============================================================================
// FONT LOADING - Slab Serif Typography
// ============================================================================
// Load web fonts for occult aesthetic (falls back to serif if unavailable)
const UI_FONT_FAMILY = {
    display: '"Roboto Slab", "Bitter", "Rockwell", Georgia, serif',
    body: '"Roboto Slab", "Bitter", Georgia, serif',
    accent: '"Cinzel", "Trajan Pro", Georgia, serif',
    fallback: 'Georgia, serif'
};

// Inject font-face rules if not already present
(function loadFonts() {
    if (document.getElementById('ui-fonts-loaded')) return;

    const style = document.createElement('style');
    style.id = 'ui-fonts-loaded';
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;500;700&family=Cinzel:wght@400;700&display=swap');
    `;
    document.head.appendChild(style);
})();

// ============================================================================
// COLOR PALETTE - Warm Charcoal & Earthy Tones
// ============================================================================
const UI_COLORS = {
    // === BACKGROUNDS (Warm Charcoal/Soot - De-blued) ===
    bgDarkest: '#0d0d0d',       // Deep soot black
    bgDark: '#141414',          // Warm charcoal (panel backgrounds)
    bgMedium: '#1c1c1c',        // Container backgrounds
    bgLight: '#262626',         // Elevated elements
    bgHighlight: '#2e2e2e',     // Hover states

    // === HEALTH - Deep Crimson (High saturation reserved) ===
    health: '#a82828',          // Deep crimson
    healthBright: '#c43030',    // Crimson highlight
    healthDark: '#5a1515',      // Blood shadow
    healthCritical: '#ff3030',  // Low health pulse (one of few bright colors)

    // === MANA/MAGIC - Spectral/Faded Slate ===
    mana: '#7a89c2',            // Spectral slate blue
    manaBright: '#9aa8d4',      // Faded highlight
    manaDark: '#3d4461',        // Deep slate
    manaGlow: 'rgba(122, 137, 194, 0.4)',

    // === STAMINA - Jade/Oxidized Copper ===
    stamina: '#5da182',         // Oxidized copper/jade
    staminaBright: '#72b896',   // Jade highlight
    staminaDark: '#2e5141',     // Deep jade
    staminaGlow: 'rgba(93, 161, 130, 0.4)',

    // === CORRUPTION/SHIFT (Dark purple - kept for thematic importance) ===
    corruption: '#6b3a7d',      // Muted occult purple
    corruptionBright: '#8a4f9e', // Purple highlight
    corruptionDark: '#3a1f42',  // Deep shadow
    corruptionPulse: '#a060b8', // Corruption pulse effect

    // === GOLD/GREED (Antiqued gold) ===
    gold: '#c9a227',            // Antiqued gold
    goldBright: '#e0b830',      // Polished gold
    goldDark: '#7a6118',        // Tarnished gold
    xp: '#8fafc4',              // Muted sky blue for XP

    // === TEXT COLORS - Parchment/Bone ===
    textPrimary: '#efe4b0',     // Bone white/parchment
    textSecondary: '#b8a878',   // Aged parchment
    textMuted: '#706850',       // Faded ink
    textDisabled: '#4a4438',    // Nearly illegible

    // === WARNING ACCENTS (Reserved high saturation) ===
    danger: '#c94a3a',          // Ember orange-red
    warning: '#d4852a',         // Ember orange
    success: '#5da182',         // Same as stamina jade

    // === ELEMENTAL COLORS (Desaturated) ===
    elements: {
        fire: '#c47030',        // Ember
        water: '#5878a0',       // Deep water
        earth: '#7a5a3a',       // Soil
        nature: '#5a8858',      // Forest
        shadow: '#6a4878',      // Dusk
        death: '#484848',       // Ash
        physical: '#8a8070',    // Stone
        holy: '#c4a840'         // Tarnished gold
    },

    // === TIER/RARITY COLORS (Slightly desaturated) ===
    tiers: {
        common: '#787068',      // Worn stone
        uncommon: '#5a9868',    // Weathered jade
        rare: '#5878a8',        // Faded sapphire
        epic: '#7a5898',        // Dusk purple
        legendary: '#c49030',   // Antiqued gold
        mythic: '#a84848'       // Blood ruby
    },

    // === UI ACCENTS ===
    border: '#3a3530',          // Warm dark border
    borderBright: '#585048',    // Highlighted border
    borderActive: '#a82828',    // Active/selected border (deep crimson)
    borderDouble: '#4a4540',    // For double-line borders

    // === SELECTION STATES ===
    selectionGradientStart: '#5a2020',  // Dark red gradient start
    selectionGradientEnd: '#2a1010',    // Dark red gradient end
    selectionBrushStroke: '#6a2828',    // Brush stroke underline

    // === SPECIAL EFFECTS ===
    ready: '#5da182',           // Jade for ready states
    cooldown: '#c47030',        // Ember for cooldown
    disabled: '#3a3530',        // Charcoal for disabled

    // Light/Dark duality
    light: '#c4a840',           // Tarnished torch light
    dark: '#1a1818',            // Deep shadow
    torchGlow: 'rgba(196, 168, 64, 0.25)',

    // === COTDG-STYLE FRAME COLORS (Ornate gold/bronze) ===
    frameGold: '#b8860b',           // Dark goldenrod - main frame color
    frameGoldBright: '#daa520',     // Goldenrod - highlighted edges
    frameGoldDark: '#8b6914',       // Dark gold - shadows/depth
    frameBronze: '#cd7f32',         // Bronze accent
    frameBronzeDark: '#8b5a2b',     // Dark bronze

    // === DRAMATIC ACCENTS ===
    bloodRed: '#8b0000',            // Deep blood for damage/death
    bloodRedBright: '#b22222',      // Firebrick for highlights
    boneWhite: '#f5f5dc',           // Beige/bone for ancient text
    boneWhiteDark: '#d4c896',       // Aged bone
    obsidian: '#0b0b0b',            // Deep black for frames
    obsidianLight: '#1a1a1a',       // Lighter obsidian

    // === TEMPLE/AZTEC ACCENTS ===
    templeStone: '#4a4a40',         // Weathered stone
    templeStoneDark: '#2a2a25',     // Dark stone shadows
    templeStoneLight: '#5a5a50',    // Highlighted stone
    jadeAccent: '#00a86b',          // Jade green (for special items)
    turquoiseAccent: '#30d5c8',     // Turquoise (for magical)

    // === RARITY FRAME COLORS (Enhanced) ===
    rarityCommon: '#6b6b6b',        // Weathered iron
    rarityUncommon: '#2e8b57',      // Sea green jade
    rarityRare: '#4169e1',          // Royal blue sapphire
    rarityEpic: '#9932cc',          // Dark orchid amethyst
    rarityLegendary: '#ffd700',     // Pure gold
    rarityMythic: '#ff4500'         // Orange red (burning)
};

// ============================================================================
// GRADIENTS - For depth and weathered textures
// ============================================================================
const UI_GRADIENTS = {
    // Create a vertical gradient for panels
    panelBg: (ctx, x, y, height) => {
        const grad = ctx.createLinearGradient(x, y, x, y + height);
        grad.addColorStop(0, UI_COLORS.bgMedium);
        grad.addColorStop(0.5, UI_COLORS.bgDark);
        grad.addColorStop(1, UI_COLORS.bgDarkest);
        return grad;
    },

    // Health bar gradient (with depth)
    healthBar: (ctx, x, y, width, height) => {
        const grad = ctx.createLinearGradient(x, y, x, y + height);
        grad.addColorStop(0, UI_COLORS.healthBright);
        grad.addColorStop(0.3, UI_COLORS.health);
        grad.addColorStop(0.7, UI_COLORS.health);
        grad.addColorStop(1, UI_COLORS.healthDark);
        return grad;
    },

    // Mana bar gradient (spectral)
    manaBar: (ctx, x, y, width, height) => {
        const grad = ctx.createLinearGradient(x, y, x, y + height);
        grad.addColorStop(0, UI_COLORS.manaBright);
        grad.addColorStop(0.3, UI_COLORS.mana);
        grad.addColorStop(0.7, UI_COLORS.mana);
        grad.addColorStop(1, UI_COLORS.manaDark);
        return grad;
    },

    // Stamina bar gradient (jade)
    staminaBar: (ctx, x, y, width, height) => {
        const grad = ctx.createLinearGradient(x, y, x, y + height);
        grad.addColorStop(0, UI_COLORS.staminaBright);
        grad.addColorStop(0.3, UI_COLORS.stamina);
        grad.addColorStop(0.7, UI_COLORS.stamina);
        grad.addColorStop(1, UI_COLORS.staminaDark);
        return grad;
    },

    // Corruption bar gradient (occult purple)
    corruptionBar: (ctx, x, y, width, height) => {
        const grad = ctx.createLinearGradient(x, y, x, y + height);
        grad.addColorStop(0, UI_COLORS.corruptionBright);
        grad.addColorStop(0.5, UI_COLORS.corruption);
        grad.addColorStop(1, UI_COLORS.corruptionDark);
        return grad;
    },

    // Selection gradient (dark red)
    selection: (ctx, x, y, width, height) => {
        const grad = ctx.createLinearGradient(x, y, x, y + height);
        grad.addColorStop(0, UI_COLORS.selectionGradientStart);
        grad.addColorStop(1, UI_COLORS.selectionGradientEnd);
        return grad;
    }
};

// ============================================================================
// SHADOWS & GLOWS - For depth and emphasis
// ============================================================================
const UI_EFFECTS = {
    // Drop shadow for panels
    panelShadow: {
        color: 'rgba(0, 0, 0, 0.6)',
        blur: 12,
        offsetX: 3,
        offsetY: 3
    },

    // Glow for active/selected elements (ember)
    activeGlow: {
        color: 'rgba(168, 40, 40, 0.5)',
        blur: 12
    },

    // Corruption pulse glow
    corruptionGlow: {
        color: 'rgba(107, 58, 125, 0.4)',
        blur: 15
    },

    // Ready state glow (jade)
    readyGlow: {
        color: 'rgba(93, 161, 130, 0.4)',
        blur: 10
    },

    // Spectral mana glow
    manaGlow: {
        color: 'rgba(122, 137, 194, 0.4)',
        blur: 10
    }
};

// ============================================================================
// TYPOGRAPHY - Slab Serif for Occult Feel
// ============================================================================
const UI_FONTS = {
    title: `bold 26px ${UI_FONT_FAMILY.display}`,
    heading: `bold 18px ${UI_FONT_FAMILY.display}`,
    subheading: `500 15px ${UI_FONT_FAMILY.body}`,
    body: `14px ${UI_FONT_FAMILY.body}`,
    small: `12px ${UI_FONT_FAMILY.body}`,
    tiny: `10px ${UI_FONT_FAMILY.body}`,
    number: `bold 15px ${UI_FONT_FAMILY.display}`,
    hotkey: `bold 11px ${UI_FONT_FAMILY.display}`,
    accent: `bold 20px ${UI_FONT_FAMILY.accent}`,
    // Keep monospace for technical displays
    mono: '12px monospace'
};

// ============================================================================
// SPACING & SIZING
// ============================================================================
const UI_SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32
};

const UI_SIZES = {
    // Sidebar
    sidebarWidth: 70,
    sidebarIconSize: 40,

    // Unit frames
    unitFrameWidth: 260,
    unitFrameHeight: 85,
    portraitSize: 56,
    barHeight: 16,

    // Mini-map
    minimapSize: 180,

    // Action bar
    actionSlotSize: 56,
    actionSlotSpacing: 6,

    // Borders (increased weight)
    borderThin: 2,
    borderMedium: 3,
    borderThick: 4,
    borderDouble: 2  // For double-line effect
};

// ============================================================================
// ANIMATION TIMING
// ============================================================================
const UI_ANIMATION = {
    // Durations (ms)
    fast: 150,
    normal: 250,
    slow: 400,

    // HP bar damage lerp speed (per second)
    healthLerpSpeed: 2.0,

    // Pulse frequencies
    pulseSpeed: 0.003,
    fastPulse: 0.006,
    slowPulse: 0.001,

    // Stamina shatter duration
    shatterDuration: 400
};

// ============================================================================
// TEXTURE PATTERNS - Procedural grunge/noise
// ============================================================================

/**
 * Create a grunge/noise texture canvas for overlaying on bars
 */
function createGrungeTexture(width, height, density = 0.15, color = 'rgba(0,0,0,0.3)') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Random noise dots
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < density) {
            const alpha = Math.random() * 80;
            data[i] = 0;      // R
            data[i + 1] = 0;  // G
            data[i + 2] = 0;  // B
            data[i + 3] = alpha; // A
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add some larger scratches/smoke wisps
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = 0; i < width / 10; i++) {
        ctx.beginPath();
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(
            startX + (Math.random() - 0.5) * 20, startY + (Math.random() - 0.5) * 10,
            startX + (Math.random() - 0.5) * 20, startY + (Math.random() - 0.5) * 10,
            startX + (Math.random() - 0.5) * 30, startY + (Math.random() - 0.5) * 15
        );
        ctx.stroke();
    }

    return canvas;
}

// Cache textures for performance
const textureCache = new Map();

function getGrungeTexture(width, height) {
    const key = `${width}x${height}`;
    if (!textureCache.has(key)) {
        textureCache.set(key, createGrungeTexture(width, height));
    }
    return textureCache.get(key);
}

/**
 * Create a magic circle/rune pattern for radar background
 */
function createRunePattern(size, color = 'rgba(93, 161, 130, 0.08)') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // Outer magic circle
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circles
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
    ctx.stroke();

    // Rune symbols around the circle (simplified geometric)
    const runeCount = 8;
    const runeRadius = size * 0.4;
    ctx.font = `${size * 0.06}px serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const runeSymbols = ['*', '+', 'X', 'O', '*', '+', 'X', 'O'];
    for (let i = 0; i < runeCount; i++) {
        const angle = (i / runeCount) * Math.PI * 2 - Math.PI / 2;
        const rx = cx + Math.cos(angle) * runeRadius;
        const ry = cy + Math.sin(angle) * runeRadius;
        ctx.fillText(runeSymbols[i], rx, ry);
    }

    // Cross lines through center
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.4, cy);
    ctx.lineTo(cx + size * 0.4, cy);
    ctx.moveTo(cx, cy - size * 0.4);
    ctx.lineTo(cx, cy + size * 0.4);
    ctx.stroke();

    // Diagonal lines
    const diag = size * 0.28;
    ctx.beginPath();
    ctx.moveTo(cx - diag, cy - diag);
    ctx.lineTo(cx + diag, cy + diag);
    ctx.moveTo(cx + diag, cy - diag);
    ctx.lineTo(cx - diag, cy + diag);
    ctx.stroke();

    return canvas;
}

// ============================================================================
// HELPER FUNCTIONS - Common drawing operations
// ============================================================================

/**
 * Draw a stylized panel background with optional border
 */
function drawStylizedPanel(ctx, x, y, width, height, options = {}) {
    const {
        bgColor = UI_COLORS.bgMedium,
        borderColor = UI_COLORS.border,
        borderWidth = UI_SIZES.borderMedium,
        cornerRadius = 0,
        shadow = false,
        gradient = false,
        doubleBorder = false
    } = options;

    ctx.save();

    // Shadow
    if (shadow) {
        ctx.shadowColor = UI_EFFECTS.panelShadow.color;
        ctx.shadowBlur = UI_EFFECTS.panelShadow.blur;
        ctx.shadowOffsetX = UI_EFFECTS.panelShadow.offsetX;
        ctx.shadowOffsetY = UI_EFFECTS.panelShadow.offsetY;
    }

    // Background
    if (gradient) {
        ctx.fillStyle = UI_GRADIENTS.panelBg(ctx, x, y, height);
    } else {
        ctx.fillStyle = bgColor;
    }

    if (cornerRadius > 0) {
        drawRoundedRect(ctx, x, y, width, height, cornerRadius);
        ctx.fill();
    } else {
        ctx.fillRect(x, y, width, height);
    }

    // Reset shadow before border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border (double-line option)
    if (borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        if (cornerRadius > 0) {
            drawRoundedRect(ctx, x, y, width, height, cornerRadius);
            ctx.stroke();
        } else {
            ctx.strokeRect(x, y, width, height);
        }

        // Inner border for double-line effect
        if (doubleBorder) {
            ctx.strokeStyle = UI_COLORS.borderDouble;
            ctx.lineWidth = 1;
            const inset = borderWidth + 2;
            if (cornerRadius > 0) {
                drawRoundedRect(ctx, x + inset, y + inset, width - inset * 2, height - inset * 2, Math.max(0, cornerRadius - inset));
                ctx.stroke();
            } else {
                ctx.strokeRect(x + inset, y + inset, width - inset * 2, height - inset * 2);
            }
        }
    }

    ctx.restore();
}

/**
 * Draw a rounded rectangle path
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Draw corner anchor graphics to "bolt" HUD elements
 */
function drawCornerAnchors(ctx, x, y, width, height, options = {}) {
    const {
        color = UI_COLORS.border,
        size = 12,
        thickness = 3
    } = options;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'square';

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + width - size, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + size);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + height - size);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + size, y + height);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + width - size, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - size);
    ctx.stroke();

    // Optional: corner rivets/bolts
    const rivetRadius = 2;
    ctx.fillStyle = color;
    [[x + 4, y + 4], [x + width - 4, y + 4], [x + 4, y + height - 4], [x + width - 4, y + height - 4]].forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx, ry, rivetRadius, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

/**
 * Draw a stylized resource bar with grunge texture overlay
 */
function drawStylizedBar(ctx, x, y, width, height, current, max, options = {}) {
    const {
        fillColor = UI_COLORS.health,
        bgColor = UI_COLORS.healthDark,
        borderColor = UI_COLORS.border,
        showText = true,
        label = '',
        gradient = null,
        textured = true
    } = options;

    const pct = Math.max(0, Math.min(1, current / max));

    ctx.save();

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    // Fill bar
    if (pct > 0) {
        if (gradient) {
            ctx.fillStyle = gradient(ctx, x, y, width, height);
        } else {
            ctx.fillStyle = fillColor;
        }
        ctx.fillRect(x, y, width * pct, height);

        // Add shine effect at top (reduced for grunge look)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(x, y, width * pct, height / 4);

        // Grunge texture overlay
        if (textured && width > 20) {
            const texture = getGrungeTexture(Math.floor(width), Math.floor(height));
            ctx.globalAlpha = 0.4;
            ctx.drawImage(texture, x, y, width * pct, height);
            ctx.globalAlpha = 1;
        }
    }

    // Border (thicker)
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = UI_SIZES.borderThin;
    ctx.strokeRect(x, y, width, height);

    // Text
    if (showText) {
        ctx.font = UI_FONTS.small;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = UI_COLORS.textPrimary;

        // Shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 3;

        const text = label ? `${label}: ${Math.ceil(current)}/${max}` : `${Math.ceil(current)}/${max}`;
        ctx.fillText(text, x + width / 2, y + height / 2);
    }

    ctx.restore();
}

/**
 * Draw a diamond-shaped stamina pip
 */
function drawStaminaDiamond(ctx, x, y, size, options = {}) {
    const {
        filled = true,
        fillColor = UI_COLORS.stamina,
        borderColor = UI_COLORS.staminaBright,
        shattered = false,
        shatterProgress = 0  // 0 to 1
    } = options;

    ctx.save();

    if (shattered) {
        // Shattered state - grey stone fragments
        ctx.globalAlpha = 1 - shatterProgress * 0.7;

        // Draw fragments
        const fragmentCount = 4;
        for (let i = 0; i < fragmentCount; i++) {
            const angle = (i / fragmentCount) * Math.PI * 2 + shatterProgress * 2;
            const dist = shatterProgress * size * 0.8;
            const fx = x + Math.cos(angle) * dist;
            const fy = y + Math.sin(angle) * dist;
            const fsize = size * (0.4 - shatterProgress * 0.2);

            ctx.fillStyle = '#4a4540';
            ctx.beginPath();
            ctx.moveTo(fx, fy - fsize);
            ctx.lineTo(fx + fsize * 0.7, fy);
            ctx.lineTo(fx, fy + fsize);
            ctx.lineTo(fx - fsize * 0.7, fy);
            ctx.closePath();
            ctx.fill();
        }
    } else if (filled) {
        // Filled diamond
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.7, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 0.7, y);
        ctx.closePath();
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.6);
        ctx.lineTo(x + size * 0.3, y - size * 0.1);
        ctx.lineTo(x, y);
        ctx.lineTo(x - size * 0.3, y - size * 0.1);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.7, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 0.7, y);
        ctx.closePath();
        ctx.stroke();
    } else {
        // Empty diamond (socket)
        ctx.fillStyle = UI_COLORS.bgDarkest;
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.7, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size * 0.7, y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = UI_COLORS.border;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Draw a gem socket for radar chart vertices
 */
function drawGemSocket(ctx, x, y, radius, options = {}) {
    const {
        fillColor = UI_COLORS.bgDark,
        gemColor = null,
        borderColor = UI_COLORS.border,
        glowing = false,
        selected = false
    } = options;

    ctx.save();

    // Glow effect
    if (glowing || selected) {
        ctx.shadowColor = gemColor || UI_COLORS.gold;
        ctx.shadowBlur = selected ? 15 : 10;
    }

    // Outer socket (hexagonal/faceted)
    const sides = 6;
    ctx.fillStyle = UI_COLORS.bgDarkest;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(angle) * (radius + 4);
        const py = y + Math.sin(angle) * (radius + 4);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Inner gem
    if (gemColor) {
        // Gem fill with facets
        const gemGrad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        gemGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
        gemGrad.addColorStop(0.3, gemColor);
        gemGrad.addColorStop(1, UI_COLORS.bgDarkest);

        ctx.fillStyle = gemGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
        ctx.fill();

        // Facet lines
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.5, y - radius * 0.3);
        ctx.lineTo(x + radius * 0.3, y + radius * 0.5);
        ctx.moveTo(x + radius * 0.5, y - radius * 0.5);
        ctx.lineTo(x - radius * 0.2, y + radius * 0.4);
        ctx.stroke();
    } else {
        // Empty socket
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Draw chalky/rough line (for radar chart)
 */
function drawChalkyLine(ctx, x1, y1, x2, y2, options = {}) {
    const {
        color = UI_COLORS.border,
        width = 2,
        roughness = 2
    } = options;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';

    // Draw main line with slight wobble
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const segments = Math.max(3, Math.floor(dist / 15));

    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const px = x1 + (x2 - x1) * t + (Math.random() - 0.5) * roughness;
        const py = y1 + (y2 - y1) * t + (Math.random() - 0.5) * roughness;
        ctx.lineTo(px, py);
    }

    ctx.stroke();

    // Add some chalk dust particles
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < dist / 20; i++) {
        const t = Math.random();
        const px = x1 + (x2 - x1) * t + (Math.random() - 0.5) * roughness * 3;
        const py = y1 + (y2 - y1) * t + (Math.random() - 0.5) * roughness * 3;
        ctx.fillStyle = color;
        ctx.fillRect(px, py, 1, 1);
    }

    ctx.restore();
}

/**
 * Draw selection highlight (dark red gradient or brush stroke)
 */
function drawSelectionHighlight(ctx, x, y, width, height, options = {}) {
    const {
        style = 'gradient',  // 'gradient' or 'brushstroke'
        cornerRadius = 0
    } = options;

    ctx.save();

    if (style === 'gradient') {
        ctx.fillStyle = UI_GRADIENTS.selection(ctx, x, y, width, height);
        if (cornerRadius > 0) {
            drawRoundedRect(ctx, x, y, width, height, cornerRadius);
            ctx.fill();
        } else {
            ctx.fillRect(x, y, width, height);
        }
    } else if (style === 'brushstroke') {
        // Brush stroke underline
        ctx.strokeStyle = UI_COLORS.selectionBrushStroke;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x + 2, y + height - 2);

        // Wavy brush stroke
        const segments = 8;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const px = x + width * t;
            const py = y + height - 2 + Math.sin(t * Math.PI * 3) * 1.5;
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Draw a circular portrait frame
 */
function drawPortraitFrame(ctx, x, y, size, options = {}) {
    const {
        bgColor = UI_COLORS.bgLight,
        borderColor = UI_COLORS.border,
        borderWidth = UI_SIZES.borderMedium,
        glowColor = null
    } = options;

    ctx.save();

    // Glow effect
    if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
    }

    // Background circle
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border (thicker)
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw text with shadow for readability
 */
function drawTextWithShadow(ctx, text, x, y, options = {}) {
    const {
        color = UI_COLORS.textPrimary,
        font = UI_FONTS.body,
        align = 'left',
        shadowColor = 'rgba(0, 0, 0, 0.9)',
        shadowBlur = 3
    } = options;

    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.fillText(text, x, y);
    ctx.restore();
}

/**
 * Get a pulsing value for animations (0 to 1)
 */
function getPulseValue(speed = UI_ANIMATION.pulseSpeed) {
    return (Math.sin(Date.now() * speed) + 1) / 2;
}

// lerp is provided by movement-utils.js

/**
 * Draw a corruption/shift meter (occult-style)
 */
function drawCorruptionMeter(ctx, x, y, width, height, current, max, curseCount = 0) {
    const pct = Math.max(0, Math.min(1, current / max));
    const pulse = getPulseValue(UI_ANIMATION.pulseSpeed);

    ctx.save();

    // Background
    ctx.fillStyle = UI_COLORS.corruptionDark;
    ctx.fillRect(x, y, width, height);

    // Fill with gradient
    if (pct > 0) {
        ctx.fillStyle = UI_GRADIENTS.corruptionBar(ctx, x, y, width, height);
        ctx.fillRect(x, y, width * pct, height);

        // Grunge overlay
        const texture = getGrungeTexture(Math.floor(width), Math.floor(height));
        ctx.globalAlpha = 0.3;
        ctx.drawImage(texture, x, y, width * pct, height);
        ctx.globalAlpha = 1;

        // Pulsing glow at the edge
        if (pct > 0.1 && pct < 1) {
            const edgeX = x + width * pct;
            const glowGrad = ctx.createRadialGradient(edgeX, y + height/2, 0, edgeX, y + height/2, 15);
            glowGrad.addColorStop(0, `rgba(160, 96, 184, ${0.2 + pulse * 0.2})`);
            glowGrad.addColorStop(1, 'rgba(160, 96, 184, 0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(edgeX - 15, y - 5, 30, height + 10);
        }
    }

    // Border (thicker)
    ctx.strokeStyle = UI_COLORS.corruption;
    ctx.lineWidth = UI_SIZES.borderThin;
    ctx.strokeRect(x, y, width, height);

    // Curse icons above the bar (diamond shaped)
    if (curseCount > 0) {
        const iconSize = 8;
        const iconY = y - iconSize - 6;
        for (let i = 0; i < curseCount; i++) {
            const iconX = x + i * (iconSize * 2 + 4) + iconSize;
            drawStaminaDiamond(ctx, iconX, iconY, iconSize, {
                fillColor: UI_COLORS.corruptionBright,
                borderColor: UI_COLORS.corruption
            });
        }
    }

    // Percentage text
    ctx.font = UI_FONTS.small;
    ctx.textAlign = 'center';
    ctx.fillStyle = UI_COLORS.textPrimary;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 3;
    ctx.fillText(`${Math.floor(pct * 100)}%`, x + width / 2, y + height / 2 + 4);

    ctx.restore();
}

/**
 * Apply screen effect (vignette, flash, etc.)
 */
function applyScreenEffect(ctx, canvasWidth, canvasHeight, effect) {
    ctx.save();

    switch (effect.type) {
        case 'damage':
            // Deep crimson vignette flash
            const intensity = effect.intensity || 0.3;
            const grad = ctx.createRadialGradient(
                canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.3,
                canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.8
            );
            grad.addColorStop(0, 'rgba(168, 40, 40, 0)');
            grad.addColorStop(1, `rgba(168, 40, 40, ${intensity})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            break;

        case 'corruption':
            // Occult purple vignette
            const corrGrad = ctx.createRadialGradient(
                canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.4,
                canvasWidth / 2, canvasHeight / 2, canvasHeight
            );
            corrGrad.addColorStop(0, 'rgba(107, 58, 125, 0)');
            corrGrad.addColorStop(1, `rgba(107, 58, 125, ${effect.intensity || 0.2})`);
            ctx.fillStyle = corrGrad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            break;

        case 'levelup':
            // Antiqued gold flash
            ctx.fillStyle = `rgba(201, 162, 39, ${effect.intensity || 0.2})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            break;

        case 'flash':
            // Screen flash for impactful hits (white/colored)
            const flashColor = effect.color || '#FFFFFF';
            const flashIntensity = effect.intensity || 0.3;
            // Convert hex color to RGB for alpha support (hexToRgb returns "r, g, b" string)
            const rgbStr = hexToRgb(flashColor);
            ctx.fillStyle = `rgba(${rgbStr}, ${flashIntensity})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            break;

        case 'critFlash':
            // Red flash for critical hits on player
            const critIntensity = effect.intensity || 0.4;
            // More intense vignette that covers more of the screen
            const critGrad = ctx.createRadialGradient(
                canvasWidth / 2, canvasHeight / 2, 0,
                canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.6
            );
            critGrad.addColorStop(0, `rgba(255, 0, 0, ${critIntensity * 0.3})`);
            critGrad.addColorStop(0.5, `rgba(255, 0, 0, ${critIntensity * 0.5})`);
            critGrad.addColorStop(1, `rgba(200, 0, 0, ${critIntensity})`);
            ctx.fillStyle = critGrad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            break;
    }

    ctx.restore();
}

// ============================================================================
// SCREEN EFFECTS STATE - Track active effects
// ============================================================================
const screenEffects = {
    damage: { active: false, intensity: 0, duration: 0 },
    corruption: { active: false, intensity: 0, duration: 0 },
    levelup: { active: false, intensity: 0, duration: 0 },
    flash: { active: false, intensity: 0, duration: 0, color: '#FFFFFF' },
    critFlash: { active: false, intensity: 0, duration: 0 }
};

/**
 * Trigger a screen effect
 * @param {string} type - Effect type: 'damage', 'corruption', 'levelup', 'flash'
 * @param {number} intensity - Effect intensity (0-1)
 * @param {number} duration - Effect duration in ms
 * @param {Object} options - Additional options (e.g., { color: '#FF0000' } for flash)
 */
function triggerScreenEffect(type, intensity = 0.5, duration = 300, options = {}) {
    screenEffects[type] = {
        active: true,
        intensity: intensity,
        duration: duration,
        startTime: Date.now(),
        ...options
    };
}

/**
 * Trigger a screen flash effect for impactful hits
 * @param {string} color - Flash color (hex)
 * @param {number} intensity - Flash intensity (0-1, default 0.3)
 * @param {number} duration - Flash duration in ms (default 80)
 */
function triggerScreenFlash(color = '#FFFFFF', intensity = 0.3, duration = 80) {
    triggerScreenEffect('flash', intensity, duration, { color: color });
}

/**
 * Update and render screen effects
 */
function updateScreenEffects(ctx, canvasWidth, canvasHeight) {
    const now = Date.now();

    for (const [type, effect] of Object.entries(screenEffects)) {
        if (!effect.active) continue;

        const elapsed = now - effect.startTime;
        if (elapsed >= effect.duration) {
            effect.active = false;
            continue;
        }

        // Fade out effect
        const progress = elapsed / effect.duration;
        const currentIntensity = effect.intensity * (1 - progress);

        applyScreenEffect(ctx, canvasWidth, canvasHeight, {
            type: type,
            intensity: currentIntensity
        });
    }
}

// ============================================================================
// ANIMATED HP SYSTEM - Smooth damage feedback
// ============================================================================
const animatedBars = new Map();

/**
 * Update an animated bar value (call each frame)
 */
function updateAnimatedBar(id, targetValue, maxValue, deltaTime) {
    if (!animatedBars.has(id)) {
        animatedBars.set(id, { display: targetValue, target: targetValue, max: maxValue });
    }

    const bar = animatedBars.get(id);
    bar.target = targetValue;
    bar.max = maxValue;

    // Lerp display value toward target
    const diff = bar.target - bar.display;
    const speed = UI_ANIMATION.healthLerpSpeed * deltaTime;

    if (Math.abs(diff) < 0.5) {
        bar.display = bar.target;
    } else {
        bar.display += diff * Math.min(speed, 1);
    }

    return bar.display;
}

/**
 * Get the animated display value for a bar
 */
function getAnimatedBarValue(id) {
    return animatedBars.get(id)?.display ?? 0;
}

// ============================================================================
// STAMINA PIP ANIMATION STATE
// ============================================================================
const staminaPipState = new Map();

/**
 * Trigger stamina pip shatter animation
 */
function triggerStaminaShatter(pipId) {
    staminaPipState.set(pipId, {
        shattering: true,
        startTime: Date.now()
    });
}

/**
 * Get stamina pip animation state
 */
function getStaminaPipState(pipId) {
    const state = staminaPipState.get(pipId);
    if (!state || !state.shattering) return { shattered: false, progress: 0 };

    const elapsed = Date.now() - state.startTime;
    const progress = Math.min(1, elapsed / UI_ANIMATION.shatterDuration);

    if (progress >= 1) {
        staminaPipState.delete(pipId);
        return { shattered: false, progress: 0 };
    }

    return { shattered: true, progress };
}

// ============================================================================
// COTDG-STYLE DECORATIVE FUNCTIONS
// ============================================================================

/**
 * Draw ornate corner flourishes (gold filigree style)
 * Creates decorative L-shaped corners with curling details
 */
function drawOrnateCorners(ctx, x, y, width, height, options = {}) {
    const {
        color = UI_COLORS.frameGold,
        colorBright = UI_COLORS.frameGoldBright,
        colorDark = UI_COLORS.frameGoldDark,
        size = 20,
        thickness = 2,
        curls = true
    } = options;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const corners = [
        { x: x, y: y, flipX: 1, flipY: 1 },                          // Top-left
        { x: x + width, y: y, flipX: -1, flipY: 1 },                 // Top-right
        { x: x, y: y + height, flipX: 1, flipY: -1 },                // Bottom-left
        { x: x + width, y: y + height, flipX: -1, flipY: -1 }        // Bottom-right
    ];

    corners.forEach(corner => {
        ctx.save();
        ctx.translate(corner.x, corner.y);
        ctx.scale(corner.flipX, corner.flipY);

        // Main L-shape
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(0, size);
        ctx.lineTo(0, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();

        // Bright inner edge
        ctx.strokeStyle = colorBright;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(thickness, size - 2);
        ctx.lineTo(thickness, thickness);
        ctx.lineTo(size - 2, thickness);
        ctx.stroke();

        // Dark outer shadow
        ctx.strokeStyle = colorDark;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-1, size);
        ctx.lineTo(-1, -1);
        ctx.lineTo(size, -1);
        ctx.stroke();

        // Curl details
        if (curls) {
            ctx.strokeStyle = color;
            ctx.lineWidth = thickness * 0.7;

            // Horizontal curl
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.quadraticCurveTo(size + 4, 0, size + 4, 4);
            ctx.stroke();

            // Vertical curl
            ctx.beginPath();
            ctx.moveTo(0, size);
            ctx.quadraticCurveTo(0, size + 4, 4, size + 4);
            ctx.stroke();

            // Corner dot/rivet
            ctx.fillStyle = colorBright;
            ctx.beginPath();
            ctx.arc(3, 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });

    ctx.restore();
}

/**
 * Draw decorative divider line with center emblem
 */
function drawOrnateDivider(ctx, x, y, width, options = {}) {
    const {
        color = UI_COLORS.frameGold,
        colorDark = UI_COLORS.frameGoldDark,
        thickness = 2,
        emblem = 'diamond',  // 'diamond', 'skull', 'circle', 'none'
        emblemSize = 12
    } = options;

    ctx.save();

    const centerX = x + width / 2;

    // Left line
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(centerX - emblemSize - 5, y);
    ctx.stroke();

    // Right line
    ctx.beginPath();
    ctx.moveTo(centerX + emblemSize + 5, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    // Shadow line below
    ctx.strokeStyle = colorDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + thickness);
    ctx.lineTo(centerX - emblemSize - 5, y + thickness);
    ctx.moveTo(centerX + emblemSize + 5, y + thickness);
    ctx.lineTo(x + width, y + thickness);
    ctx.stroke();

    // Center emblem
    ctx.fillStyle = color;
    switch (emblem) {
        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(centerX, y - emblemSize);
            ctx.lineTo(centerX + emblemSize * 0.7, y);
            ctx.lineTo(centerX, y + emblemSize);
            ctx.lineTo(centerX - emblemSize * 0.7, y);
            ctx.closePath();
            ctx.fill();
            // Inner highlight
            ctx.fillStyle = UI_COLORS.frameGoldBright;
            ctx.beginPath();
            ctx.moveTo(centerX, y - emblemSize * 0.5);
            ctx.lineTo(centerX + emblemSize * 0.3, y);
            ctx.lineTo(centerX, y + emblemSize * 0.3);
            ctx.lineTo(centerX - emblemSize * 0.3, y);
            ctx.closePath();
            ctx.fill();
            break;

        case 'skull':
            // Simple skull icon
            ctx.beginPath();
            ctx.arc(centerX, y - 2, emblemSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
            // Eye sockets
            ctx.fillStyle = UI_COLORS.obsidian;
            ctx.beginPath();
            ctx.arc(centerX - 3, y - 3, 2, 0, Math.PI * 2);
            ctx.arc(centerX + 3, y - 3, 2, 0, Math.PI * 2);
            ctx.fill();
            // Jaw
            ctx.fillStyle = color;
            ctx.fillRect(centerX - 4, y + 2, 8, 4);
            break;

        case 'circle':
            ctx.beginPath();
            ctx.arc(centerX, y, emblemSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = UI_COLORS.frameGoldBright;
            ctx.lineWidth = 1;
            ctx.stroke();
            break;
    }

    ctx.restore();
}

/**
 * Draw temple-style frame with Aztec-inspired patterns
 */
function drawTempleFrame(ctx, x, y, width, height, options = {}) {
    const {
        bgColor = UI_COLORS.bgDark,
        frameColor = UI_COLORS.frameGold,
        frameColorDark = UI_COLORS.frameGoldDark,
        frameWidth = 6,
        cornerSize = 16,
        pattern = true,
        innerGlow = false
    } = options;

    ctx.save();

    // Background fill
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    // Inner shadow/depth
    const grad = ctx.createLinearGradient(x, y, x, y + height);
    grad.addColorStop(0, 'rgba(0,0,0,0.3)');
    grad.addColorStop(0.1, 'rgba(0,0,0,0)');
    grad.addColorStop(0.9, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(x + frameWidth, y + frameWidth, width - frameWidth * 2, height - frameWidth * 2);

    // Outer frame
    ctx.strokeStyle = frameColorDark;
    ctx.lineWidth = frameWidth + 2;
    ctx.strokeRect(x, y, width, height);

    ctx.strokeStyle = frameColor;
    ctx.lineWidth = frameWidth;
    ctx.strokeRect(x, y, width, height);

    // Inner bright edge
    ctx.strokeStyle = UI_COLORS.frameGoldBright;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + frameWidth - 1, y + frameWidth - 1, width - frameWidth * 2 + 2, height - frameWidth * 2 + 2);

    // Temple pattern on frame (step pattern)
    if (pattern) {
        ctx.fillStyle = frameColorDark;
        const stepSize = 8;
        const stepHeight = 4;

        // Top edge pattern
        for (let px = x + cornerSize; px < x + width - cornerSize - stepSize; px += stepSize * 2) {
            ctx.fillRect(px, y + 1, stepSize, stepHeight);
        }
        // Bottom edge pattern
        for (let px = x + cornerSize; px < x + width - cornerSize - stepSize; px += stepSize * 2) {
            ctx.fillRect(px, y + height - stepHeight - 1, stepSize, stepHeight);
        }
        // Left edge pattern
        for (let py = y + cornerSize; py < y + height - cornerSize - stepSize; py += stepSize * 2) {
            ctx.fillRect(x + 1, py, stepHeight, stepSize);
        }
        // Right edge pattern
        for (let py = y + cornerSize; py < y + height - cornerSize - stepSize; py += stepSize * 2) {
            ctx.fillRect(x + width - stepHeight - 1, py, stepHeight, stepSize);
        }
    }

    // Corner accents
    drawOrnateCorners(ctx, x - 2, y - 2, width + 4, height + 4, {
        color: frameColor,
        colorBright: UI_COLORS.frameGoldBright,
        colorDark: frameColorDark,
        size: cornerSize,
        thickness: 3,
        curls: true
    });

    // Inner glow effect
    if (innerGlow) {
        const glowGrad = ctx.createRadialGradient(
            x + width / 2, y + height / 2, 0,
            x + width / 2, y + height / 2, Math.max(width, height) * 0.6
        );
        glowGrad.addColorStop(0, 'rgba(184, 134, 11, 0.1)');
        glowGrad.addColorStop(1, 'rgba(184, 134, 11, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(x + frameWidth, y + frameWidth, width - frameWidth * 2, height - frameWidth * 2);
    }

    ctx.restore();
}

/**
 * Draw segmented health display (like CotDG hearts/segments)
 */
function drawSegmentedHealth(ctx, x, y, options = {}) {
    const {
        current = 100,
        max = 100,
        segments = 5,
        segmentWidth = 24,
        segmentHeight = 20,
        spacing = 3,
        style = 'heart',  // 'heart', 'skull', 'diamond', 'bar'
        showText = true
    } = options;

    ctx.save();

    const healthPerSegment = max / segments;
    const totalWidth = segments * segmentWidth + (segments - 1) * spacing;

    for (let i = 0; i < segments; i++) {
        const segX = x + i * (segmentWidth + spacing);
        const segmentStart = i * healthPerSegment;
        const segmentEnd = (i + 1) * healthPerSegment;

        let fillAmount = 0;
        if (current >= segmentEnd) {
            fillAmount = 1;
        } else if (current > segmentStart) {
            fillAmount = (current - segmentStart) / healthPerSegment;
        }

        drawHealthSegment(ctx, segX, y, segmentWidth, segmentHeight, fillAmount, style);
    }

    // Health text
    if (showText) {
        ctx.font = UI_FONTS.small;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = UI_COLORS.textPrimary;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 2;
        ctx.fillText(`${Math.ceil(current)}/${max}`, x + totalWidth / 2, y + segmentHeight + 4);
    }

    ctx.restore();
}

/**
 * Draw a single health segment
 */
function drawHealthSegment(ctx, x, y, width, height, fillAmount, style) {
    ctx.save();

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Empty segment background
    ctx.fillStyle = UI_COLORS.healthDark;
    ctx.strokeStyle = UI_COLORS.border;
    ctx.lineWidth = 1;

    switch (style) {
        case 'heart':
            drawHeartShape(ctx, centerX, centerY, width * 0.8);
            ctx.fill();
            ctx.stroke();

            // Fill overlay
            if (fillAmount > 0) {
                ctx.save();
                ctx.clip();
                ctx.fillStyle = fillAmount < 0.3 ? UI_COLORS.healthCritical : UI_COLORS.health;
                ctx.fillRect(x, y + height * (1 - fillAmount), width, height * fillAmount);
                ctx.restore();

                // Re-stroke
                drawHeartShape(ctx, centerX, centerY, width * 0.8);
                ctx.strokeStyle = UI_COLORS.healthBright;
                ctx.stroke();
            }
            break;

        case 'skull':
            // Simple skull shape
            ctx.beginPath();
            ctx.arc(centerX, centerY - 2, width * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillRect(centerX - width * 0.25, centerY + 2, width * 0.5, height * 0.25);

            if (fillAmount > 0) {
                ctx.fillStyle = fillAmount < 0.3 ? UI_COLORS.healthCritical : UI_COLORS.health;
                ctx.globalAlpha = fillAmount;
                ctx.beginPath();
                ctx.arc(centerX, centerY - 2, width * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            break;

        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(centerX, y + 2);
            ctx.lineTo(x + width - 2, centerY);
            ctx.lineTo(centerX, y + height - 2);
            ctx.lineTo(x + 2, centerY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            if (fillAmount > 0) {
                ctx.save();
                ctx.clip();
                ctx.fillStyle = fillAmount < 0.3 ? UI_COLORS.healthCritical : UI_COLORS.health;
                ctx.fillRect(x, y + height * (1 - fillAmount), width, height * fillAmount);
                ctx.restore();
            }
            break;

        case 'bar':
        default:
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);

            if (fillAmount > 0) {
                ctx.fillStyle = fillAmount < 0.3 ? UI_COLORS.healthCritical : UI_COLORS.health;
                ctx.fillRect(x + 1, y + 1, (width - 2) * fillAmount, height - 2);
            }
            break;
    }

    ctx.restore();
}

/**
 * Draw a heart shape path
 */
function drawHeartShape(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.3);
    ctx.bezierCurveTo(cx, cy, cx - size * 0.5, cy, cx - size * 0.5, cy - size * 0.3);
    ctx.bezierCurveTo(cx - size * 0.5, cy - size * 0.6, cx, cy - size * 0.6, cx, cy - size * 0.3);
    ctx.bezierCurveTo(cx, cy - size * 0.6, cx + size * 0.5, cy - size * 0.6, cx + size * 0.5, cy - size * 0.3);
    ctx.bezierCurveTo(cx + size * 0.5, cy, cx, cy, cx, cy + size * 0.3);
    ctx.closePath();
}

/**
 * Draw weapon slot frame for HUD
 */
function drawWeaponSlotFrame(ctx, x, y, size, options = {}) {
    const {
        weaponType = null,  // 'sword', 'axe', 'bow', 'staff', etc.
        isActive = false,
        cooldownPct = 0,
        borderColor = UI_COLORS.frameGold
    } = options;

    ctx.save();

    const halfSize = size / 2;

    // Hexagonal frame background
    ctx.fillStyle = UI_COLORS.bgDarkest;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = x + halfSize + Math.cos(angle) * halfSize * 0.9;
        const py = y + halfSize + Math.sin(angle) * halfSize * 0.9;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = isActive ? UI_COLORS.frameGoldBright : borderColor;
    ctx.lineWidth = isActive ? 3 : 2;
    ctx.stroke();

    // Active glow
    if (isActive) {
        ctx.shadowColor = UI_COLORS.frameGoldBright;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Cooldown overlay
    if (cooldownPct > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(x + halfSize, y + halfSize);
        ctx.arc(x + halfSize, y + halfSize, halfSize * 0.85,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * cooldownPct,
            false);
        ctx.closePath();
        ctx.fill();
    }

    // Weapon type icon (placeholder text)
    if (weaponType) {
        ctx.fillStyle = isActive ? UI_COLORS.textPrimary : UI_COLORS.textSecondary;
        ctx.font = UI_FONTS.hotkey;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const iconMap = {
            sword: '\u2694',   // Crossed swords
            axe: '\u{1FA93}',  // Axe (may not render)
            bow: '\u{1F3F9}',  // Bow
            staff: '\u{1F9D9}', // Mage
            shield: '\u{1F6E1}', // Shield
            knife: '\u{1F5E1}',  // Dagger
            default: '?'
        };
        ctx.fillText(iconMap[weaponType] || iconMap.default, x + halfSize, y + halfSize);
    }

    ctx.restore();
}

/**
 * Draw boss/enemy nameplate with dramatic styling
 */
function drawEnemyNameplate(ctx, x, y, name, options = {}) {
    const {
        title = null,
        tier = 'normal',  // 'normal', 'elite', 'champion', 'boss'
        healthPct = 1,
        width = 200,
        showHealth = true
    } = options;

    ctx.save();

    const height = showHealth ? 50 : 30;
    const tierColors = {
        normal: UI_COLORS.border,
        elite: UI_COLORS.frameBronze,
        champion: UI_COLORS.frameGold,
        boss: UI_COLORS.bloodRed
    };
    const frameColor = tierColors[tier] || tierColors.normal;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x, y, width, height);

    // Frame
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = tier === 'boss' ? 3 : 2;
    ctx.strokeRect(x, y, width, height);

    // Inner highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

    // Tier indicator (skulls/diamonds)
    if (tier !== 'normal') {
        const indicatorY = y + 3;
        ctx.fillStyle = frameColor;

        if (tier === 'boss') {
            // Crown-like indicator
            ctx.beginPath();
            ctx.moveTo(x + 5, indicatorY + 8);
            ctx.lineTo(x + 8, indicatorY + 2);
            ctx.lineTo(x + 11, indicatorY + 6);
            ctx.lineTo(x + 14, indicatorY + 2);
            ctx.lineTo(x + 17, indicatorY + 8);
            ctx.closePath();
            ctx.fill();
        } else {
            // Diamond indicators
            const count = tier === 'champion' ? 2 : 1;
            for (let i = 0; i < count; i++) {
                const dx = x + 8 + i * 10;
                ctx.beginPath();
                ctx.moveTo(dx, indicatorY);
                ctx.lineTo(dx + 4, indicatorY + 5);
                ctx.lineTo(dx, indicatorY + 10);
                ctx.lineTo(dx - 4, indicatorY + 5);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    // Name
    ctx.fillStyle = tier === 'boss' ? UI_COLORS.boneWhite : UI_COLORS.textPrimary;
    ctx.font = tier === 'boss' ? UI_FONTS.heading : UI_FONTS.subheading;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(name, x + width / 2, y + 5);

    // Title
    if (title) {
        ctx.fillStyle = UI_COLORS.textMuted;
        ctx.font = UI_FONTS.tiny;
        ctx.fillText(title, x + width / 2, y + 22);
    }

    // Health bar
    if (showHealth) {
        const barY = y + height - 14;
        const barHeight = 10;
        const barPadding = 6;

        // Bar background
        ctx.fillStyle = UI_COLORS.healthDark;
        ctx.fillRect(x + barPadding, barY, width - barPadding * 2, barHeight);

        // Health fill
        if (healthPct > 0) {
            const healthColor = healthPct < 0.25 ? UI_COLORS.healthCritical :
                               healthPct < 0.5 ? UI_COLORS.warning : UI_COLORS.health;
            ctx.fillStyle = healthColor;
            ctx.fillRect(x + barPadding, barY, (width - barPadding * 2) * healthPct, barHeight);
        }

        // Bar border
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + barPadding, barY, width - barPadding * 2, barHeight);
    }

    ctx.restore();
}

/**
 * Create Aztec/temple-inspired border pattern texture
 */
function createAztecPattern(size = 64, color = UI_COLORS.frameGoldDark) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // Step pattern
    const step = size / 8;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
        ctx.moveTo(i * step * 2, 0);
        ctx.lineTo(i * step * 2, step);
        ctx.lineTo(i * step * 2 + step, step);
        ctx.lineTo(i * step * 2 + step, 0);
    }
    ctx.stroke();

    // Diagonal lines
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.moveTo(size / 2, size);
    ctx.lineTo(size, size / 2);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size / 2, 0);
    ctx.stroke();

    return canvas;
}

/**
 * Create subtle skull watermark pattern
 */
function createSkullPattern(size = 48, alpha = 0.05) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

    const cx = size / 2;
    const cy = size / 2;
    const scale = size / 48;

    // Skull cranium
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4 * scale, 12 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye sockets (cut out)
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.beginPath();
    ctx.ellipse(cx - 5 * scale, cy - 4 * scale, 3 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 5 * scale, cy - 4 * scale, 3 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.beginPath();
    ctx.moveTo(cx, cy + 2 * scale);
    ctx.lineTo(cx - 2 * scale, cy + 6 * scale);
    ctx.lineTo(cx + 2 * scale, cy + 6 * scale);
    ctx.closePath();
    ctx.fill();

    // Jaw
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(cx - 8 * scale, cy + 8 * scale, 16 * scale, 8 * scale);

    return canvas;
}

/**
 * Create torch flicker effect value (call each frame)
 */
function getTorchFlicker(baseIntensity = 1, flickerAmount = 0.15) {
    const time = Date.now() * 0.001;
    const flicker = Math.sin(time * 8) * 0.3 +
                   Math.sin(time * 13) * 0.2 +
                   Math.sin(time * 21) * 0.1;
    return baseIntensity + flicker * flickerAmount;
}

/**
 * Draw item rarity border/frame
 */
function drawRarityFrame(ctx, x, y, width, height, rarity = 'common', options = {}) {
    const {
        thickness = 2,
        glow = true,
        cornerRadius = 0
    } = options;

    const rarityColors = {
        common: UI_COLORS.rarityCommon,
        uncommon: UI_COLORS.rarityUncommon,
        rare: UI_COLORS.rarityRare,
        epic: UI_COLORS.rarityEpic,
        legendary: UI_COLORS.rarityLegendary,
        mythic: UI_COLORS.rarityMythic
    };

    const color = rarityColors[rarity] || rarityColors.common;

    ctx.save();

    // Glow effect for rare+
    if (glow && rarity !== 'common' && rarity !== 'uncommon') {
        ctx.shadowColor = color;
        ctx.shadowBlur = rarity === 'mythic' ? 15 : rarity === 'legendary' ? 12 : 8;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;

    if (cornerRadius > 0) {
        drawRoundedRect(ctx, x, y, width, height, cornerRadius);
        ctx.stroke();
    } else {
        ctx.strokeRect(x, y, width, height);
    }

    // Animated shimmer for legendary/mythic
    if (rarity === 'legendary' || rarity === 'mythic') {
        const shimmerPos = (Date.now() % 2000) / 2000;
        const shimmerX = x + shimmerPos * (width + 40) - 20;

        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(shimmerX, y);
        ctx.lineTo(shimmerX + 10, y);
        ctx.lineTo(shimmerX - 10, y + height);
        ctx.lineTo(shimmerX - 20, y + height);
        ctx.closePath();

        // Clip to frame bounds
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        ctx.fill();
        ctx.restore();

        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

/**
 * Draw stone button (for menus/dialogue options)
 */
function drawStoneButton(ctx, x, y, width, height, options = {}) {
    const {
        text = '',
        isHovered = false,
        isPressed = false,
        isDisabled = false,
        fontSize = 14
    } = options;

    ctx.save();

    const pressOffset = isPressed ? 2 : 0;
    const drawY = y + pressOffset;

    // Shadow (not when pressed)
    if (!isPressed) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + 3, y + 3, width, height);
    }

    // Main button
    const bgColor = isDisabled ? UI_COLORS.bgMedium :
                   isHovered ? UI_COLORS.templeStoneLight : UI_COLORS.templeStone;
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, drawY, width, height);

    // Top highlight
    ctx.fillStyle = isDisabled ? UI_COLORS.bgLight : 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x, drawY, width, 2);

    // Bottom shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x, drawY + height - 2, width, 2);

    // Border
    ctx.strokeStyle = isHovered && !isDisabled ? UI_COLORS.frameGold : UI_COLORS.border;
    ctx.lineWidth = isHovered && !isDisabled ? 2 : 1;
    ctx.strokeRect(x, drawY, width, height);

    // Text
    ctx.fillStyle = isDisabled ? UI_COLORS.textDisabled :
                   isHovered ? UI_COLORS.boneWhite : UI_COLORS.textPrimary;
    ctx.font = `${fontSize}px ${UI_FONT_FAMILY.body}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, drawY + height / 2);

    ctx.restore();
}

// ============================================================================
// EXPORTS
// ============================================================================
window.UI_COLORS = UI_COLORS;
window.UI_GRADIENTS = UI_GRADIENTS;
window.UI_EFFECTS = UI_EFFECTS;
window.UI_FONTS = UI_FONTS;
window.UI_FONT_FAMILY = UI_FONT_FAMILY;
window.UI_SPACING = UI_SPACING;
window.UI_SIZES = UI_SIZES;
window.UI_ANIMATION = UI_ANIMATION;

window.drawStylizedPanel = drawStylizedPanel;
window.drawRoundedRect = drawRoundedRect;
window.drawCornerAnchors = drawCornerAnchors;
window.drawStylizedBar = drawStylizedBar;
window.drawStaminaDiamond = drawStaminaDiamond;
window.drawGemSocket = drawGemSocket;
window.drawChalkyLine = drawChalkyLine;
window.drawSelectionHighlight = drawSelectionHighlight;
window.drawPortraitFrame = drawPortraitFrame;
window.drawTextWithShadow = drawTextWithShadow;
window.drawCorruptionMeter = drawCorruptionMeter;
window.getPulseValue = getPulseValue;
// lerp is exported by movement-utils.js

window.createGrungeTexture = createGrungeTexture;
window.getGrungeTexture = getGrungeTexture;
window.createRunePattern = createRunePattern;

window.applyScreenEffect = applyScreenEffect;
window.triggerScreenEffect = triggerScreenEffect;
window.triggerScreenFlash = triggerScreenFlash;
window.updateScreenEffects = updateScreenEffects;

window.updateAnimatedBar = updateAnimatedBar;
window.getAnimatedBarValue = getAnimatedBarValue;

window.triggerStaminaShatter = triggerStaminaShatter;
window.getStaminaPipState = getStaminaPipState;

// CotDG-Style Decorative Functions
window.drawOrnateCorners = drawOrnateCorners;
window.drawOrnateDivider = drawOrnateDivider;
window.drawTempleFrame = drawTempleFrame;
window.drawSegmentedHealth = drawSegmentedHealth;
window.drawHealthSegment = drawHealthSegment;
window.drawHeartShape = drawHeartShape;
window.drawWeaponSlotFrame = drawWeaponSlotFrame;
window.drawEnemyNameplate = drawEnemyNameplate;
window.createAztecPattern = createAztecPattern;
window.createSkullPattern = createSkullPattern;
window.getTorchFlicker = getTorchFlicker;
window.drawRarityFrame = drawRarityFrame;
window.drawStoneButton = drawStoneButton;

// ============================================================================
// ANIMATION & POLISH HELPERS
// ============================================================================

/**
 * Get a smooth pulse value for animations (0 to 1)
 * @param {number} speed - Pulse speed multiplier (default 0.003)
 * @param {number} minValue - Minimum value (default 0)
 * @param {number} maxValue - Maximum value (default 1)
 */
function getPulseValue(speed = 0.003, minValue = 0, maxValue = 1) {
    const raw = (Math.sin(Date.now() * speed) + 1) / 2;
    return minValue + (raw * (maxValue - minValue));
}

/**
 * Draw a hover glow effect around an element
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Element X position
 * @param {number} y - Element Y position
 * @param {number} width - Element width
 * @param {number} height - Element height
 * @param {Object} options - Configuration options
 */
function drawHoverGlow(ctx, x, y, width, height, options = {}) {
    const {
        color = UI_COLORS.frameGold || '#b8860b',
        intensity = 0.3,
        spread = 8,
        pulse = false,
        cornerRadius = 0
    } = options;

    const alpha = pulse ? (intensity * (0.7 + getPulseValue(0.004) * 0.3)) : intensity;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = spread;
    ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${alpha})`;
    ctx.lineWidth = 2;

    if (cornerRadius > 0) {
        ctx.beginPath();
        ctx.moveTo(x + cornerRadius, y);
        ctx.lineTo(x + width - cornerRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
        ctx.lineTo(x + width, y + height - cornerRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
        ctx.lineTo(x + cornerRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
        ctx.lineTo(x, y + cornerRadius);
        ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
        ctx.closePath();
        ctx.stroke();
    } else {
        ctx.strokeRect(x, y, width, height);
    }

    ctx.restore();
}

/**
 * Draw button press visual feedback
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Button X
 * @param {number} y - Button Y
 * @param {number} width - Button width
 * @param {number} height - Button height
 */
function drawButtonPressEffect(ctx, x, y, width, height) {
    ctx.save();

    // Darken overlay to simulate depression
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x, y, width, height);

    // Inner shadow at top
    const shadowGrad = ctx.createLinearGradient(x, y, x, y + height * 0.3);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(x, y, width, height * 0.3);

    ctx.restore();
}

/**
 * Draw error state flash effect
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Area X
 * @param {number} y - Area Y
 * @param {number} width - Area width
 * @param {number} height - Area height
 * @param {number} intensity - Flash intensity (0-1)
 */
function drawErrorFlash(ctx, x, y, width, height, intensity = 0.5) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 50, 50, ${intensity * 0.4})`;
    ctx.fillRect(x, y, width, height);

    // Red border
    ctx.strokeStyle = `rgba(255, 50, 50, ${intensity})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
}

/**
 * Draw success state sparkle/burst effect
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} radius - Effect radius
 * @param {number} intensity - Effect intensity (0-1)
 */
function drawSuccessSparkle(ctx, cx, cy, radius, intensity = 1) {
    const color = UI_COLORS.frameGoldBright || '#daa520';

    ctx.save();

    // Central glow
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glowGrad.addColorStop(0, `rgba(218, 165, 32, ${0.5 * intensity})`);
    glowGrad.addColorStop(0.5, `rgba(218, 165, 32, ${0.2 * intensity})`);
    glowGrad.addColorStop(1, 'rgba(218, 165, 32, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle rays
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = intensity;

    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const innerR = radius * 0.3;
        const outerR = radius * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Convert hex color to RGB components
 * @param {string} hex - Hex color string
 * @returns {string} RGB values as comma-separated string
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return '184, 134, 11'; // Default gold
}

/**
 * Easing functions for smooth animations
 */
const UI_EASING = {
    // Smooth ease in/out
    easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    // Quick start, slow end
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    // Slow start, quick end
    easeIn: (t) => t * t * t,
    // Bounce effect
    bounce: (t) => {
        const n1 = 7.5625, d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
};

// Export animation helpers
window.getPulseValue = getPulseValue;
window.drawHoverGlow = drawHoverGlow;
window.drawButtonPressEffect = drawButtonPressEffect;
window.drawErrorFlash = drawErrorFlash;
window.drawSuccessSparkle = drawSuccessSparkle;
window.hexToRgb = hexToRgb;
window.UI_EASING = UI_EASING;

console.log('UI Design System loaded (CotDG-Enhanced Occult Dungeon Aesthetic with Animation Helpers)');

// ============================================================================
// UI IMPROVEMENT FOUNDATION - Visual Hierarchy, Typography, Equipment, Tabs
// ============================================================================

// ============================================================================
// SECTION 1: VISUAL HIERARCHY SYSTEM
// ============================================================================

// Visual hierarchy tiers for UI elements
const UI_TIERS = {
    primary: {
        // Reserved for critical interactive elements, active states
        borderColor: UI_COLORS.gold,
        borderWidth: 3,
        shadowColor: 'rgba(218, 165, 32, 0.4)',
        shadowBlur: 12,
        glowIntensity: 0.6
    },
    secondary: {
        // Standard panels, inactive menu items
        borderColor: UI_COLORS.goldDark,
        borderWidth: 2,
        shadowColor: 'rgba(139, 105, 20, 0.25)',
        shadowBlur: 6,
        glowIntensity: 0.3
    },
    tertiary: {
        // Informational elements, tooltips, subtle containers
        borderColor: UI_COLORS.bgMedium,
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

window.UI_TIERS = UI_TIERS;

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
        gradient.addColorStop(0, UI_COLORS.bgDark);
        gradient.addColorStop(0.5, UI_COLORS.bgMedium);
        gradient.addColorStop(1, UI_COLORS.bgDark);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = UI_COLORS.bgDark;
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

        ctx.fillStyle = UI_COLORS.textPrimary;
        ctx.font = UI_FONTS.subheading;
        ctx.textAlign = 'center';
        ctx.fillText(title, x + width / 2, y + 20);
    }

    ctx.restore();
}

window.drawTieredPanel = drawTieredPanel;

// ============================================================================
// SECTION 2: TYPOGRAPHY STANDARDIZATION
// ============================================================================

// Typography hierarchy with semantic naming
const UI_TYPOGRAPHY = {
    // Screen titles (JOURNAL, CHARACTER, etc.)
    screenTitle: {
        font: `bold 28px ${UI_FONT_FAMILY.display}`,
        color: UI_COLORS.gold,
        letterSpacing: 4,
        transform: 'uppercase'
    },
    // Section headers (VITALS, ATTRIBUTES, etc.)
    sectionHeader: {
        font: `bold 16px ${UI_FONT_FAMILY.heading}`,
        color: UI_COLORS.goldBright,
        letterSpacing: 2,
        transform: 'uppercase'
    },
    // Item/entity names
    entityName: {
        font: `bold 14px ${UI_FONT_FAMILY.heading}`,
        color: UI_COLORS.textPrimary,
        letterSpacing: 0,
        transform: 'none'
    },
    // Stat labels (Strength, Physical Defense)
    statLabel: {
        font: `12px ${UI_FONT_FAMILY.body}`,
        color: UI_COLORS.textMuted,
        letterSpacing: 0,
        transform: 'none'
    },
    // Stat values (10, 100/100)
    statValue: {
        font: `bold 14px ${UI_FONT_FAMILY.body}`,
        color: UI_COLORS.textPrimary,
        letterSpacing: 0,
        transform: 'none'
    },
    // Small helper text, hotkeys
    helper: {
        font: `10px ${UI_FONT_FAMILY.body}`,
        color: UI_COLORS.textDisabled,
        letterSpacing: 0,
        transform: 'uppercase'
    },
    // Description/flavor text
    description: {
        font: `12px ${UI_FONT_FAMILY.body}`,
        color: UI_COLORS.textMuted,
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

// ============================================================================
// SECTION 4: EQUIPMENT SLOT SYSTEM
// ============================================================================

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
        const rarityColors = {
            common: UI_COLORS.tiers.common,
            uncommon: UI_COLORS.tiers.uncommon,
            rare: UI_COLORS.tiers.rare,
            epic: UI_COLORS.tiers.epic,
            legendary: UI_COLORS.tiers.legendary,
            mythic: UI_COLORS.tiers.mythic
        };
        const rarityColor = rarityColors[equippedItem.rarity || 'common'] || rarityColors.common;
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
        // Draw item icon (placeholder - uses first letter of item name)
        ctx.fillStyle = UI_COLORS.textPrimary;
        ctx.font = `bold ${slotSize * 0.5}px ${UI_FONT_FAMILY.body}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(equippedItem.name ? equippedItem.name[0].toUpperCase() : '?', x + slotSize / 2, y + slotSize / 2);
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

        ctx.fillStyle = UI_COLORS.textMuted;
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
    ctx.fillStyle = UI_COLORS.textMuted;
    ctx.fillText(msg.icon, x, y - 20);

    // Title
    ctx.globalAlpha = 0.6;
    ctx.font = `bold 14px ${UI_FONT_FAMILY.heading}`;
    ctx.fillStyle = UI_COLORS.textMuted;
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

// ============================================================================
// SECTION 5: TAB NAVIGATION SYSTEM
// ============================================================================

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
    ctx.fillStyle = UI_COLORS.bgDark;
    ctx.fillRect(x, y, width, tabHeight);

    // Bottom border
    ctx.strokeStyle = UI_COLORS.goldDark;
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
            ctx.fillStyle = UI_COLORS.gold;
            ctx.fillRect(currentX + 4, y + tabHeight - 3, tabWidth - 8, 3);

        } else if (isHovered) {
            // Hover state
            ctx.fillStyle = 'rgba(201, 162, 39, 0.1)';
            ctx.fillRect(currentX, y, tabWidth, tabHeight);
        }

        // Tab text
        ctx.fillStyle = isActive ? UI_COLORS.goldBright : (isHovered ? UI_COLORS.textPrimary : UI_COLORS.textMuted);
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

// ============================================================================
// SECTION 10: ANIMATION AND FEEDBACK POLISH
// ============================================================================

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

// ============================================================================
// ADDITIONAL COLOR MAPPINGS FOR COMPATIBILITY
// ============================================================================

// Add compatibility properties to UI_COLORS for the implementation guide references
// These map the guide's expected structure to our existing color system
UI_COLORS.gold = UI_COLORS.gold || {};
if (typeof UI_COLORS.gold === 'string') {
    const goldBase = UI_COLORS.gold;
    UI_COLORS.gold = {
        base: goldBase,
        light: UI_COLORS.goldBright,
        dark: UI_COLORS.goldDark
    };
}

UI_COLORS.text = UI_COLORS.text || {
    light: UI_COLORS.textPrimary,
    muted: UI_COLORS.textSecondary,
    dark: UI_COLORS.textMuted
};

UI_COLORS.background = UI_COLORS.background || {
    dark: UI_COLORS.bgDark,
    medium: UI_COLORS.bgMedium,
    light: UI_COLORS.bgLight
};

UI_COLORS.corruption = UI_COLORS.corruption || {
    base: '#6b3a7d'
};

UI_COLORS.rarity = UI_COLORS.rarity || UI_COLORS.tiers;

// ============================================================================
// DANGER VIGNETTE - Low Health Warning Effect
// ============================================================================
// A pulsing red screen border that appears when the player's health is low
// to warn them they're in danger and need to heal or escape.
// ============================================================================

const DangerVignette = {
    // === CONFIGURATION ===
    healthThreshold: 0.3,      // Show when below 30% health
    maxIntensity: 0.6,         // Maximum vignette opacity at 0% health
    basePulseSpeed: 2,         // Base pulse speed in Hz
    criticalPulseSpeed: 4,     // Faster pulse when health is very low (<15%)
    criticalThreshold: 0.15,   // Threshold for faster pulsing

    // === STATE ===
    wasInDanger: false,        // Track for "just entered danger" flash
    flashIntensity: 0,         // Flash intensity when first entering danger
    flashDecay: 0.95,          // How fast the flash fades
    lastRenderTime: 0,         // For delta time calculation

    /**
     * Render the danger vignette effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {number} playerHealth - Current player health
     * @param {number} playerMaxHealth - Maximum player health
     */
    render: function(ctx, canvasWidth, canvasHeight, playerHealth, playerMaxHealth) {
        // Safety check
        if (!playerMaxHealth || playerMaxHealth <= 0) return;

        const healthPercent = Math.max(0, playerHealth) / playerMaxHealth;

        // Check if we just entered danger state (for flash effect)
        const isInDanger = healthPercent < this.healthThreshold;
        if (isInDanger && !this.wasInDanger) {
            // Just entered danger - trigger flash
            this.flashIntensity = 0.5;
        }
        this.wasInDanger = isInDanger;

        // Decay flash effect
        this.flashIntensity *= this.flashDecay;
        if (this.flashIntensity < 0.01) this.flashIntensity = 0;

        // Only show vignette when below threshold
        if (healthPercent >= this.healthThreshold && this.flashIntensity <= 0) return;

        // Calculate danger level (0 = at threshold, 1 = at 0 health)
        const dangerLevel = healthPercent < this.healthThreshold
            ? 1 - (healthPercent / this.healthThreshold)
            : 0;

        // Calculate pulse speed - faster when critically low
        const pulseSpeed = healthPercent < this.criticalThreshold
            ? this.criticalPulseSpeed
            : this.basePulseSpeed;

        // Pulsing effect (0.7 to 1.0 range for subtlety)
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.001 * pulseSpeed * Math.PI * 2);

        // Calculate final intensity
        let intensity = dangerLevel * this.maxIntensity * pulse;

        // Add flash effect on top
        intensity = Math.min(1, intensity + this.flashIntensity);

        // Skip if intensity is negligible
        if (intensity < 0.01) return;

        ctx.save();

        // Create radial gradient vignette (red at edges, transparent in center)
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const radius = Math.max(canvasWidth, canvasHeight) * 0.8;

        const gradient = ctx.createRadialGradient(
            centerX, centerY, radius * 0.4,   // Inner circle (transparent)
            centerX, centerY, radius           // Outer circle (red)
        );

        // Use UI_COLORS if available for consistent theming
        const dangerColor = typeof UI_COLORS !== 'undefined' && UI_COLORS.healthCritical
            ? UI_COLORS.healthCritical
            : '#ff3030';
        const bloodColor = typeof UI_COLORS !== 'undefined' && UI_COLORS.bloodRed
            ? UI_COLORS.bloodRed
            : '#8b0000';

        // Parse colors to RGB for alpha manipulation
        const dangerRGB = this._hexToRGB(dangerColor);
        const bloodRGB = this._hexToRGB(bloodColor);

        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(0.4, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(0.6, `rgba(${dangerRGB.r}, ${dangerRGB.g}, ${dangerRGB.b}, ${intensity * 0.2})`);
        gradient.addColorStop(0.8, `rgba(${dangerRGB.r}, ${dangerRGB.g}, ${dangerRGB.b}, ${intensity * 0.5})`);
        gradient.addColorStop(1, `rgba(${bloodRGB.r}, ${bloodRGB.g}, ${bloodRGB.b}, ${intensity})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Add subtle inner glow on the edges for extra emphasis when critical
        if (healthPercent < this.criticalThreshold) {
            const criticalPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005 * Math.PI * 2);
            const edgeGlow = intensity * criticalPulse * 0.3;

            // Top edge
            const topGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight * 0.15);
            topGrad.addColorStop(0, `rgba(${dangerRGB.r}, ${dangerRGB.g}, ${dangerRGB.b}, ${edgeGlow})`);
            topGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = topGrad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight * 0.15);

            // Bottom edge
            const bottomGrad = ctx.createLinearGradient(0, canvasHeight * 0.85, 0, canvasHeight);
            bottomGrad.addColorStop(0, 'rgba(255, 0, 0, 0)');
            bottomGrad.addColorStop(1, `rgba(${dangerRGB.r}, ${dangerRGB.g}, ${dangerRGB.b}, ${edgeGlow})`);
            ctx.fillStyle = bottomGrad;
            ctx.fillRect(0, canvasHeight * 0.85, canvasWidth, canvasHeight * 0.15);

            // Left edge
            const leftGrad = ctx.createLinearGradient(0, 0, canvasWidth * 0.1, 0);
            leftGrad.addColorStop(0, `rgba(${dangerRGB.r}, ${dangerRGB.g}, ${dangerRGB.b}, ${edgeGlow})`);
            leftGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = leftGrad;
            ctx.fillRect(0, 0, canvasWidth * 0.1, canvasHeight);

            // Right edge
            const rightGrad = ctx.createLinearGradient(canvasWidth * 0.9, 0, canvasWidth, 0);
            rightGrad.addColorStop(0, 'rgba(255, 0, 0, 0)');
            rightGrad.addColorStop(1, `rgba(${dangerRGB.r}, ${dangerRGB.g}, ${dangerRGB.b}, ${edgeGlow})`);
            ctx.fillStyle = rightGrad;
            ctx.fillRect(canvasWidth * 0.9, 0, canvasWidth * 0.1, canvasHeight);
        }

        ctx.restore();
    },

    /**
     * Helper to convert hex color to RGB object
     * @param {string} hex - Hex color string
     * @returns {Object} - { r, g, b }
     */
    _hexToRGB: function(hex) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Handle shorthand hex (e.g., #f00)
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16)
        };
    },

    /**
     * Check if player is currently in danger state
     * @param {Object} player - Player object with health and maxHealth
     * @returns {boolean} - True if below health threshold
     */
    isInDanger: function(player) {
        if (!player || !player.maxHealth) return false;
        return (player.health / player.maxHealth) < this.healthThreshold;
    },

    /**
     * Reset the vignette state (call when player heals above threshold or dies)
     */
    reset: function() {
        this.wasInDanger = false;
        this.flashIntensity = 0;
    }
};

// Export globally
window.DangerVignette = DangerVignette;

console.log('UI Improvement Foundation loaded (Visual Hierarchy, Typography, Equipment, Tabs, Transitions)');
