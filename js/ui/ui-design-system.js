// ============================================================================
// UI DESIGN SYSTEM - Curse of the Dead Gods Inspired Visual Language
// ============================================================================
// Central design constants for consistent, polished UI across all components
// Inspired by: CotDG's dark atmosphere, corruption mechanics, and cel-shaded style
// ============================================================================

// ============================================================================
// COLOR PALETTE - Dark temple aesthetic with light/dark duality
// ============================================================================
const UI_COLORS = {
    // === BACKGROUNDS ===
    bgDarkest: '#0a0a0f',       // Void black
    bgDark: '#12121a',          // Panel backgrounds
    bgMedium: '#1a1a24',        // Container backgrounds
    bgLight: '#252530',         // Elevated elements
    bgHighlight: '#2a2a3a',     // Hover states

    // === PRIMARY COLORS ===
    // Health - Warm red with depth
    health: '#c0392b',          // Main health color
    healthBright: '#e74c3c',    // Health highlight
    healthDark: '#8b1a1a',      // Health background
    healthCritical: '#ff2222',  // Low health pulse

    // Mana/Magic - Cool blue
    mana: '#2980b9',            // Main mana color
    manaBright: '#3498db',      // Mana highlight
    manaDark: '#1a3a5c',        // Mana background

    // Stamina - Earthy green
    stamina: '#27ae60',         // Main stamina
    staminaBright: '#2ecc71',   // Stamina highlight
    staminaDark: '#1a4a2e',     // Stamina background

    // === CORRUPTION/SHIFT (Key feature - purple theme) ===
    corruption: '#8e44ad',      // Main corruption
    corruptionBright: '#9b59b6', // Corruption highlight
    corruptionDark: '#4a235a',  // Corruption background
    corruptionPulse: '#bf55ec', // Corruption pulse effect

    // === GOLD/GREED (Reward feedback) ===
    gold: '#d4af37',            // Main gold
    goldBright: '#f1c40f',      // Gold highlight
    goldDark: '#8b7500',        // Gold background
    xp: '#5dade2',              // XP bar color

    // === ELEMENTAL COLORS ===
    elements: {
        fire: '#e67e22',
        water: '#3498db',
        earth: '#8b4513',
        nature: '#27ae60',
        shadow: '#9b59b6',
        death: '#555555',
        physical: '#95a5a6',
        holy: '#f1c40f'
    },

    // === TIER/RARITY COLORS ===
    tiers: {
        common: '#888888',
        uncommon: '#2ecc71',
        rare: '#3498db',
        epic: '#9b59b6',
        legendary: '#f39c12',
        mythic: '#e74c3c'
    },

    // === UI ACCENTS ===
    border: '#3a3a4a',          // Default border
    borderBright: '#5a5a6a',    // Highlighted border
    borderActive: '#c0392b',    // Active/selected border

    // Text colors
    textPrimary: '#ffffff',
    textSecondary: '#b0b0b0',
    textMuted: '#666666',
    textDisabled: '#444444',

    // Status indicators
    ready: '#2ecc71',           // Action ready
    cooldown: '#e67e22',        // On cooldown
    disabled: '#555555',        // Cannot use
    danger: '#e74c3c',          // Warning/danger

    // Light/Dark duality (for visibility system)
    light: '#f4d03f',           // In light indicator
    dark: '#2c3e50',            // In darkness indicator
    torchGlow: 'rgba(244, 208, 63, 0.3)'
};

// ============================================================================
// GRADIENTS - For depth and polish
// ============================================================================
const UI_GRADIENTS = {
    // Create a vertical gradient for panels
    panelBg: (ctx, x, y, height) => {
        const grad = ctx.createLinearGradient(x, y, x, y + height);
        grad.addColorStop(0, UI_COLORS.bgMedium);
        grad.addColorStop(1, UI_COLORS.bgDark);
        return grad;
    },

    // Health bar gradient (left to right with shine)
    healthBar: (ctx, x, y, width) => {
        const grad = ctx.createLinearGradient(x, y, x + width, y);
        grad.addColorStop(0, UI_COLORS.health);
        grad.addColorStop(0.5, UI_COLORS.healthBright);
        grad.addColorStop(1, UI_COLORS.health);
        return grad;
    },

    // Mana bar gradient
    manaBar: (ctx, x, y, width) => {
        const grad = ctx.createLinearGradient(x, y, x + width, y);
        grad.addColorStop(0, UI_COLORS.mana);
        grad.addColorStop(0.5, UI_COLORS.manaBright);
        grad.addColorStop(1, UI_COLORS.mana);
        return grad;
    },

    // Corruption bar gradient (pulsing purple)
    corruptionBar: (ctx, x, y, width) => {
        const grad = ctx.createLinearGradient(x, y, x + width, y);
        grad.addColorStop(0, UI_COLORS.corruptionDark);
        grad.addColorStop(0.5, UI_COLORS.corruption);
        grad.addColorStop(1, UI_COLORS.corruptionBright);
        return grad;
    },

    // Stamina bar gradient
    staminaBar: (ctx, x, y, width) => {
        const grad = ctx.createLinearGradient(x, y, x + width, y);
        grad.addColorStop(0, UI_COLORS.staminaDark);
        grad.addColorStop(0.5, UI_COLORS.stamina);
        grad.addColorStop(1, UI_COLORS.staminaBright);
        return grad;
    }
};

// ============================================================================
// SHADOWS & GLOWS - For depth and emphasis
// ============================================================================
const UI_EFFECTS = {
    // Drop shadow for panels
    panelShadow: {
        color: 'rgba(0, 0, 0, 0.5)',
        blur: 10,
        offsetX: 4,
        offsetY: 4
    },

    // Glow for active/selected elements
    activeGlow: {
        color: 'rgba(192, 57, 43, 0.6)',
        blur: 15
    },

    // Corruption pulse glow
    corruptionGlow: {
        color: 'rgba(142, 68, 173, 0.5)',
        blur: 20
    },

    // Ready state glow
    readyGlow: {
        color: 'rgba(46, 204, 113, 0.5)',
        blur: 10
    }
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================
const UI_FONTS = {
    title: 'bold 28px monospace',
    heading: 'bold 20px monospace',
    body: '14px monospace',
    small: '12px monospace',
    tiny: '10px monospace',
    number: 'bold 16px monospace',
    hotkey: 'bold 12px monospace'
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

    // Borders
    borderThin: 1,
    borderMedium: 2,
    borderThick: 3
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
    pulseSpeed: 0.003,       // For Math.sin(Date.now() * pulseSpeed)
    fastPulse: 0.006,
    slowPulse: 0.001
};

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
        gradient = false
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

    // Border
    if (borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        if (cornerRadius > 0) {
            drawRoundedRect(ctx, x, y, width, height, cornerRadius);
            ctx.stroke();
        } else {
            ctx.strokeRect(x, y, width, height);
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
 * Draw a stylized resource bar (HP, MP, Stamina, etc.)
 */
function drawStylizedBar(ctx, x, y, width, height, current, max, options = {}) {
    const {
        fillColor = UI_COLORS.health,
        bgColor = UI_COLORS.healthDark,
        borderColor = UI_COLORS.border,
        showText = true,
        label = '',
        animate = false,
        gradient = true
    } = options;

    const pct = Math.max(0, Math.min(1, current / max));

    ctx.save();

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);

    // Fill bar
    if (pct > 0) {
        if (gradient && typeof UI_GRADIENTS.healthBar === 'function') {
            // Use gradient based on bar type
            ctx.fillStyle = fillColor;
        } else {
            ctx.fillStyle = fillColor;
        }
        ctx.fillRect(x, y, width * pct, height);

        // Add shine effect at top
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, width * pct, height / 3);
    }

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Text
    if (showText) {
        ctx.font = UI_FONTS.small;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = UI_COLORS.textPrimary;

        // Shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 2;

        const text = label ? `${label}: ${Math.ceil(current)}/${max}` : `${Math.ceil(current)}/${max}`;
        ctx.fillText(text, x + width / 2, y + height / 2);
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
        borderWidth = 2,
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

    // Border
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
        shadowColor = 'rgba(0, 0, 0, 0.8)',
        shadowBlur = 2
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

/**
 * Lerp between two values
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Draw a corruption/shift meter (CotDG-style)
 */
function drawCorruptionMeter(ctx, x, y, width, height, current, max, curseCount = 0) {
    const pct = Math.max(0, Math.min(1, current / max));
    const pulse = getPulseValue(UI_ANIMATION.pulseSpeed);

    ctx.save();

    // Background with subtle pulse
    ctx.fillStyle = UI_COLORS.corruptionDark;
    ctx.fillRect(x, y, width, height);

    // Fill with gradient
    if (pct > 0) {
        const grad = ctx.createLinearGradient(x, y, x + width * pct, y);
        grad.addColorStop(0, UI_COLORS.corruption);
        grad.addColorStop(1, UI_COLORS.corruptionBright);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, width * pct, height);

        // Pulsing glow at the edge when filling
        if (pct > 0.1 && pct < 1) {
            const edgeX = x + width * pct;
            const glowGrad = ctx.createRadialGradient(edgeX, y + height/2, 0, edgeX, y + height/2, 20);
            glowGrad.addColorStop(0, `rgba(191, 85, 236, ${0.3 + pulse * 0.3})`);
            glowGrad.addColorStop(1, 'rgba(191, 85, 236, 0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(edgeX - 20, y - 10, 40, height + 20);
        }
    }

    // Border
    ctx.strokeStyle = UI_COLORS.corruption;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Curse icons above the bar
    if (curseCount > 0) {
        const iconSize = 16;
        const iconY = y - iconSize - 4;
        for (let i = 0; i < curseCount; i++) {
            const iconX = x + i * (iconSize + 4);
            ctx.fillStyle = UI_COLORS.corruptionBright;
            ctx.beginPath();
            // Draw skull-like icon
            ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2 - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = UI_COLORS.bgDarkest;
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('X', iconX + iconSize/2, iconY + iconSize/2 + 3);
        }
    }

    // Percentage text
    ctx.font = UI_FONTS.small;
    ctx.textAlign = 'center';
    ctx.fillStyle = UI_COLORS.textPrimary;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
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
            // Red vignette flash
            const intensity = effect.intensity || 0.3;
            const grad = ctx.createRadialGradient(
                canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.3,
                canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.8
            );
            grad.addColorStop(0, 'rgba(192, 57, 43, 0)');
            grad.addColorStop(1, `rgba(192, 57, 43, ${intensity})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            break;

        case 'corruption':
            // Purple corruption vignette
            const corrGrad = ctx.createRadialGradient(
                canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.4,
                canvasWidth / 2, canvasHeight / 2, canvasHeight
            );
            corrGrad.addColorStop(0, 'rgba(142, 68, 173, 0)');
            corrGrad.addColorStop(1, `rgba(142, 68, 173, ${effect.intensity || 0.2})`);
            ctx.fillStyle = corrGrad;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            break;

        case 'levelup':
            // Golden flash
            ctx.fillStyle = `rgba(241, 196, 15, ${effect.intensity || 0.2})`;
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
// EXPORTS
// ============================================================================
window.UI_COLORS = UI_COLORS;
window.UI_GRADIENTS = UI_GRADIENTS;
window.UI_EFFECTS = UI_EFFECTS;
window.UI_FONTS = UI_FONTS;
window.UI_SPACING = UI_SPACING;
window.UI_SIZES = UI_SIZES;
window.UI_ANIMATION = UI_ANIMATION;

window.drawStylizedPanel = drawStylizedPanel;
window.drawRoundedRect = drawRoundedRect;
window.drawStylizedBar = drawStylizedBar;
window.drawPortraitFrame = drawPortraitFrame;
window.drawTextWithShadow = drawTextWithShadow;
window.drawCorruptionMeter = drawCorruptionMeter;
window.getPulseValue = getPulseValue;
window.lerp = lerp;

window.applyScreenEffect = applyScreenEffect;
window.triggerScreenEffect = triggerScreenEffect;
window.updateScreenEffects = updateScreenEffects;

window.updateAnimatedBar = updateAnimatedBar;
window.getAnimatedBarValue = getAnimatedBarValue;

console.log('UI Design System loaded');
