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
    torchGlow: 'rgba(196, 168, 64, 0.25)'
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
    }

    ctx.restore();
}

// ============================================================================
// SCREEN EFFECTS STATE - Track active effects
// ============================================================================
const screenEffects = {
    damage: { active: false, intensity: 0, duration: 0 },
    corruption: { active: false, intensity: 0, duration: 0 },
    levelup: { active: false, intensity: 0, duration: 0 }
};

/**
 * Trigger a screen effect
 */
function triggerScreenEffect(type, intensity = 0.5, duration = 300) {
    screenEffects[type] = {
        active: true,
        intensity: intensity,
        duration: duration,
        startTime: Date.now()
    };
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
window.updateScreenEffects = updateScreenEffects;

window.updateAnimatedBar = updateAnimatedBar;
window.getAnimatedBarValue = getAnimatedBarValue;

window.triggerStaminaShatter = triggerStaminaShatter;
window.getStaminaPipState = getStaminaPipState;

console.log('UI Design System loaded (Occult Dungeon Aesthetic)');
