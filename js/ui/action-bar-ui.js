// ============================================================================
// ACTION BAR UI - CotDG Inspired Hotkey Display
// ============================================================================
// Shows consumable hotkeys with cooldown sweeps and dash ability
// Uses design system for consistent styling
// ============================================================================

// Action bar configuration
const ACTION_BAR_CONFIG = {
    slotSize: 56,
    slotSpacing: 10,
    barPadding: 20,
    cornerRadius: 8,
    iconSize: 22,
    hotkeySize: 12,
    glowIntensity: 15
};

// Slot state tracking for animations
window.actionBarState = {
    hoverSlot: null,
    activeSlot: null,
    pulsePhase: 0
};

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Draw the combat action bar (bottom-right of screen) - CotDG Style
 * Layout: [Dash] [Torch] [Consumable1] [Consumable2]
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 */
function drawCombatActionBar(ctx, canvasWidth, canvasHeight) {
    const player = game.player;
    if (!player) return;

    const cfg = ACTION_BAR_CONFIG;
    const numSlots = 4; // Dash + Torch + 2 consumables

    // Get colors from design system
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0a0a0f',
        bgDark: '#12121a',
        bgMedium: '#1a1a2e',
        border: '#3a3a4a',
        borderLight: '#4a4a5a',
        health: '#c0392b',
        mana: '#2980b9',
        gold: '#d4af37',
        textPrimary: '#ffffff',
        textMuted: '#888888',
        success: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c',
        corruption: '#8e44ad'
    };

    // Update animation phase
    window.actionBarState.pulsePhase = (window.actionBarState.pulsePhase + 0.05) % (Math.PI * 2);

    // Position at bottom-right corner - unified bar for all 4 slots
    const barWidth = (cfg.slotSize * numSlots) + (cfg.slotSpacing * (numSlots - 1)) + 20;
    const barHeight = cfg.slotSize + 20;
    const barX = canvasWidth - barWidth - cfg.barPadding;
    const barY = canvasHeight - barHeight - cfg.barPadding;

    // Store bar dimensions for shift bar positioning
    window.actionBarDimensions = { x: barX, y: barY, width: barWidth, height: barHeight };

    ctx.save();

    // === BAR BACKGROUND (single unified background for all 4 slots) ===
    drawActionBarBackground(ctx, barX, barY, barWidth, barHeight, cfg, colors);

    let slotIndex = 0;

    // === SLOT 1: DASH (spacebar) ===
    const dashSlotX = barX + 10 + (slotIndex * (cfg.slotSize + cfg.slotSpacing));
    drawStylizedDashSlot(ctx, dashSlotX, barY + 10, cfg, colors);
    slotIndex++;

    // === SLOT 2: TORCH (hotkey T) ===
    const torchSlotX = barX + 10 + (slotIndex * (cfg.slotSize + cfg.slotSpacing));
    drawTorchSlot(ctx, torchSlotX, barY + 10, cfg, player, colors);
    slotIndex++;

    // === SLOTS 3-4: CONSUMABLES (hotkeys 1 and 2) ===
    for (let i = 0; i < 2; i++) {
        const slotX = barX + 10 + (slotIndex * (cfg.slotSize + cfg.slotSpacing));
        const slotY = barY + 10;
        const hotkey = i + 1; // Hotkeys 1 and 2
        drawStylizedActionSlot(ctx, slotX, slotY, cfg, hotkey, player, colors);
        slotIndex++;
    }

    ctx.restore();
}

/**
 * Draw torch slot - for toggling player torch
 * Shows ON (warm orange) or OFF (cool blue/grey) state
 */
function drawTorchSlot(ctx, x, y, cfg, player, colors) {
    const size = cfg.slotSize;
    const isHovered = window.actionBarState.hoverSlot === 'torch';

    // Get actual torch state from player
    const torchActive = player?.isTorchOn !== false; // Default to true if undefined

    ctx.save();

    // Determine state colors based on torch state
    let borderColor, bgColor, glowColor, iconColor;

    if (torchActive) {
        // Torch ON: warm orange glow
        borderColor = colors.warning || '#f39c12';
        bgColor = colors.bgMedium || '#1a1a2e';
        glowColor = 'rgba(255, 147, 41, 0.4)';
        iconColor = '#ff9329';
    } else {
        // Torch OFF: cool blue/grey (stealth mode)
        borderColor = '#5588aa';
        bgColor = '#151822';
        glowColor = 'rgba(60, 100, 140, 0.3)';
        iconColor = '#6699bb';
    }

    // Glow effect
    if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = cfg.glowIntensity;
    }

    // Background
    const bgGrad = ctx.createLinearGradient(x, y, x, y + size);
    bgGrad.addColorStop(0, bgColor);
    bgGrad.addColorStop(1, colors.bgDarkest || '#0a0a0f');

    ctx.fillStyle = bgGrad;
    drawRoundedRect(ctx, x, y, size, size, cfg.cornerRadius);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Icon - flame symbol for ON, moon for OFF
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = iconColor;
    ctx.font = `bold ${cfg.iconSize}px monospace`;
    ctx.fillText(torchActive ? '☀' : '☾', x + size / 2, y + size / 2);

    // Hotkey badge
    drawHotkeyBadge(ctx, x, y, size, cfg, 'T', colors);

    // Status text
    ctx.font = '9px monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = iconColor;
    ctx.fillText(torchActive ? 'ON' : 'OFF', x + size / 2, y + size - 3);

    ctx.restore();
}

/**
 * Get weapon action data for the action bar
 */
function getWeaponActionForBar(player) {
    if (!player.skills) return null;

    const weapon = player.equipped?.MAIN;
    const specialty = weapon?.specialty || 'unarmed';
    const specData = player.skills.specialties[specialty];

    // Get action info
    const actionMap = {
        sword: { id: 'blade_dancer', icon: 'BD', name: 'Blade Dancer' },
        knife: { id: 'arterial_strike', icon: 'AS', name: 'Arterial Strike' },
        axe: { id: 'cleaving_blow', icon: 'CB', name: 'Cleaving Blow' },
        polearm: { id: 'impaling_thrust', icon: 'IT', name: 'Impaling Thrust' },
        mace: { id: 'skull_crack', icon: 'SC', name: 'Skull Crack' },
        staff: { id: 'sweeping_arc', icon: 'SA', name: 'Sweeping Arc' },
        unarmed: { id: 'flurry_of_blows', icon: 'FB', name: 'Flurry of Blows' },
        shield: { id: 'shield_charge', icon: 'SH', name: 'Shield Charge' },
        fire: { id: 'immolate', icon: 'IM', name: 'Immolate' },
        ice: { id: 'frozen_grasp', icon: 'FG', name: 'Frozen Grasp' },
        lightning: { id: 'chain_lightning', icon: 'CL', name: 'Chain Lightning' },
        necromancy: { id: 'life_siphon', icon: 'LS', name: 'Life Siphon' },
        bow: { id: 'power_shot', icon: 'PS', name: 'Power Shot' },
        crossbow: { id: 'piercing_bolt', icon: 'PB', name: 'Piercing Bolt' },
        throwing: { id: 'fan_of_knives', icon: 'FK', name: 'Fan of Knives' }
    };

    const actionInfo = actionMap[specialty] || actionMap['unarmed'];
    const cooldown = player.skills.actionCooldowns?.[actionInfo.id] || 0;
    const isUnlocked = specData && specData.level >= 5;

    return {
        ...actionInfo,
        specialty: specialty,
        cooldown: cooldown,
        maxCooldown: 10,
        isUnlocked: isUnlocked,
        isReady: cooldown <= 0 && isUnlocked
    };
}

/**
 * Draw weapon skill slot - CotDG style
 */
function drawWeaponSkillSlot(ctx, x, y, cfg, actionData, player, colors) {
    const size = cfg.slotSize;
    const isHovered = window.actionBarState.hoverSlot === 'skill5';

    ctx.save();

    // Determine state
    let borderColor = colors.border || '#3a3a4a';
    let bgColor = colors.bgMedium || '#1a1a2e';
    let glowColor = null;

    if (!actionData || !actionData.isUnlocked) {
        borderColor = colors.textMuted || '#444444';
        bgColor = 'rgba(30, 30, 30, 0.5)';
    } else if (actionData.isReady) {
        borderColor = colors.corruption || '#8e44ad';
        glowColor = 'rgba(142, 68, 173, 0.4)';
    } else {
        borderColor = colors.warning || '#f39c12';
    }

    // Glow for ready state
    if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = cfg.glowIntensity;
    }

    // Background
    const bgGrad = ctx.createLinearGradient(x, y, x, y + size);
    bgGrad.addColorStop(0, bgColor);
    bgGrad.addColorStop(1, colors.bgDarkest || '#0a0a0f');

    ctx.fillStyle = bgGrad;
    drawRoundedRect(ctx, x, y, size, size, cfg.cornerRadius);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = (actionData && actionData.isReady) ? 2 : 1;
    ctx.stroke();

    // Cooldown sweep
    if (actionData && actionData.cooldown > 0 && actionData.isUnlocked) {
        drawCooldownSweep(ctx, x, y, size, cfg, actionData.cooldown, actionData.maxCooldown, colors);
    }

    // Icon
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!actionData || !actionData.isUnlocked) {
        ctx.fillStyle = colors.textMuted || '#444444';
    } else if (actionData.isReady) {
        ctx.fillStyle = colors.textPrimary || '#ffffff';
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    }

    ctx.font = `bold ${cfg.iconSize}px monospace`;
    ctx.fillText(actionData ? actionData.icon : '??', x + size / 2, y + size / 2);

    // Hotkey badge
    drawHotkeyBadge(ctx, x, y, size, cfg, '5', colors);

    // Status text
    ctx.font = '9px monospace';
    ctx.textBaseline = 'bottom';

    if (!actionData || !actionData.isUnlocked) {
        ctx.fillStyle = colors.textMuted || '#444444';
        ctx.fillText('LOCK', x + size / 2, y + size - 3);
    } else if (actionData.isReady) {
        const pulse = Math.sin(window.actionBarState.pulsePhase) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(142, 68, 173, ${pulse})`;
        ctx.fillText('READY', x + size / 2, y + size - 3);
    } else {
        ctx.fillStyle = colors.warning || '#f39c12';
        ctx.fillText(actionData.cooldown.toFixed(1) + 's', x + size / 2, y + size - 3);
    }

    // Ready pulse
    if (actionData && actionData.isReady && !isHovered) {
        const pulseAlpha = 0.15 + Math.sin(window.actionBarState.pulsePhase) * 0.1;
        ctx.strokeStyle = colors.corruption || '#8e44ad';
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulseAlpha;
        drawRoundedRect(ctx, x - 2, y - 2, size + 4, size + 4, cfg.cornerRadius + 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

/**
 * Draw action bar background panel
 */
function drawActionBarBackground(ctx, x, y, width, height, cfg, colors) {
    // Main background with gradient
    const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
    bgGrad.addColorStop(0, colors.bgDark || '#12121a');
    bgGrad.addColorStop(1, colors.bgDarkest || '#0a0a0f');

    ctx.fillStyle = bgGrad;
    drawRoundedRect(ctx, x, y, width, height, cfg.cornerRadius);
    ctx.fill();

    // Border
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + cfg.cornerRadius, y + 1);
    ctx.lineTo(x + width - cfg.cornerRadius, y + 1);
    ctx.stroke();
}

/**
 * Draw a stylized action slot - CotDG style
 */
function drawStylizedActionSlot(ctx, x, y, cfg, hotkey, player, colors) {
    const size = cfg.slotSize;
    const slotInfo = getSlotInfo(hotkey, player);
    const isHovered = window.actionBarState.hoverSlot === `slot${hotkey}`;

    ctx.save();

    // === SLOT BACKGROUND ===
    drawSlotBackground(ctx, x, y, size, cfg, slotInfo, isHovered, colors);

    // === COOLDOWN SWEEP ===
    if (slotInfo.cooldown > 0 && slotInfo.maxCooldown > 0) {
        drawCooldownSweep(ctx, x, y, size, cfg, slotInfo.cooldown, slotInfo.maxCooldown, colors);
    }

    // === SLOT ICON ===
    drawSlotIconStyled(ctx, x, y, size, slotInfo, colors);

    // === HOTKEY BADGE ===
    drawHotkeyBadge(ctx, x, y, size, cfg, hotkey.toString(), colors);

    // === COOLDOWN TEXT ===
    if (slotInfo.cooldown > 0) {
        drawCooldownText(ctx, x, y, size, slotInfo.cooldown, colors);
    }

    // === READY GLOW ===
    if (slotInfo.state === 'ready' && !isHovered) {
        drawReadyPulse(ctx, x, y, size, cfg, colors);
    }

    ctx.restore();
}

/**
 * Draw stylized dash slot - CotDG style
 */
function drawStylizedDashSlot(ctx, x, y, cfg, colors) {
    const size = cfg.slotSize;

    // Get dash state
    const cooldown = typeof getDashCooldown === 'function' ? getDashCooldown() : 0;
    const maxCooldown = typeof getDashCooldownMax === 'function' ? getDashCooldownMax() : 1;
    const isDashing = typeof playerIsDashing === 'function' && playerIsDashing();
    const hasIframes = typeof playerHasIframes === 'function' && playerHasIframes();

    const isHovered = window.actionBarState.hoverSlot === 'dash';
    const isReady = cooldown <= 0 && !isDashing;

    ctx.save();

    // === SLOT BACKGROUND ===
    const slotInfo = {
        state: isReady ? 'ready' : (isDashing ? 'active' : 'cooldown'),
        cooldown: cooldown,
        maxCooldown: maxCooldown
    };
    drawSlotBackground(ctx, x, y, size, cfg, slotInfo, isHovered, colors, true);

    // === COOLDOWN SWEEP ===
    if (cooldown > 0) {
        drawCooldownSweep(ctx, x, y, size, cfg, cooldown, maxCooldown, colors);
    }

    // === DASH ICON ===
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Arrow icon or "DASH" text
    if (isDashing || hasIframes) {
        // Active dash - bright cyan with glow
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#00ffff';
    } else if (isReady) {
        ctx.fillStyle = colors.textPrimary || '#ffffff';
    } else {
        ctx.fillStyle = colors.textMuted || '#666666';
    }

    ctx.font = `bold ${cfg.iconSize - 2}px monospace`;
    ctx.fillText('>>', x + size / 2, y + size / 2);

    ctx.shadowBlur = 0;

    // === HOTKEY BADGE ===
    drawHotkeyBadge(ctx, x, y, size, cfg, 'SPC', colors);

    // === COOLDOWN TEXT ===
    if (cooldown > 0) {
        drawCooldownText(ctx, x, y, size, cooldown, colors);
    }

    // === READY GLOW ===
    if (isReady && !isHovered) {
        drawReadyPulse(ctx, x, y, size, cfg, colors, '#00ffff');
    }

    ctx.restore();
}

/**
 * Draw slot background with state-based styling
 */
function drawSlotBackground(ctx, x, y, size, cfg, slotInfo, isHovered, colors, isDash = false) {
    const radius = cfg.cornerRadius;

    // Determine border color based on state
    let borderColor = colors.border || '#3a3a4a';
    let bgColor = colors.bgMedium || '#1a1a2e';
    let glowColor = null;

    switch (slotInfo.state) {
        case 'ready':
            borderColor = isDash ? '#00ffff' : (colors.success || '#27ae60');
            glowColor = isDash ? 'rgba(0, 255, 255, 0.3)' : 'rgba(39, 174, 96, 0.3)';
            break;
        case 'active':
            borderColor = '#00ff00';
            glowColor = 'rgba(0, 255, 0, 0.4)';
            break;
        case 'cooldown':
        case 'gcd':
            borderColor = colors.warning || '#f39c12';
            break;
        case 'outOfAmmo':
        case 'outOfMana':
            borderColor = colors.danger || '#e74c3c';
            break;
        case 'outOfRange':
            borderColor = colors.textMuted || '#666666';
            break;
    }

    // Hover effect
    if (isHovered) {
        bgColor = 'rgba(255, 255, 255, 0.1)';
    }

    // Glow effect for ready state
    if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = cfg.glowIntensity;
    }

    // Background
    const bgGrad = ctx.createLinearGradient(x, y, x, y + size);
    bgGrad.addColorStop(0, bgColor);
    bgGrad.addColorStop(1, colors.bgDarkest || '#0a0a0f');

    ctx.fillStyle = bgGrad;
    drawRoundedRect(ctx, x, y, size, size, radius);
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = slotInfo.state === 'ready' || slotInfo.state === 'active' ? 2 : 1;
    ctx.stroke();

    // Inner shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x + 2, y + 2, size - 4, size - 4, radius - 2);
    ctx.stroke();
}

/**
 * Draw cooldown sweep animation (clockwise from top)
 */
function drawCooldownSweep(ctx, x, y, size, cfg, remaining, max, colors) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2 - 2;

    // Calculate progress (0 = full cooldown, 1 = ready)
    const progress = 1 - Math.max(0, Math.min(1, remaining / max));

    ctx.save();

    // Dark overlay for cooldown area
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#000000';

    // Draw pie slice for remaining cooldown
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const startAngle = -Math.PI / 2; // Start at top
    const endAngle = startAngle + (progress * Math.PI * 2);
    ctx.arc(centerX, centerY, radius, endAngle, startAngle + Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // Sweep edge highlight
    if (progress > 0 && progress < 1) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = colors.warning || '#f39c12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(endAngle) * radius,
            centerY + Math.sin(endAngle) * radius
        );
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Draw slot icon with styling
 */
function drawSlotIconStyled(ctx, x, y, size, slotInfo, colors) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Icon color based on state
    let iconColor = colors.textPrimary || '#ffffff';
    if (slotInfo.state === 'disabled') {
        iconColor = colors.textMuted || '#666666';
    } else if (slotInfo.state === 'outOfAmmo' || slotInfo.state === 'outOfMana') {
        iconColor = colors.danger || '#e74c3c';
    } else if (slotInfo.state === 'cooldown' || slotInfo.state === 'gcd') {
        iconColor = colors.textMuted || '#888888';
    }

    ctx.fillStyle = iconColor;
    ctx.font = `bold ${ACTION_BAR_CONFIG.iconSize}px monospace`;

    // Icon based on slot type
    let icon = '---';
    switch (slotInfo.icon) {
        case 'sword':
            icon = 'ATK';
            break;
        case 'star':
            icon = 'SKL';
            break;
        case 'potion':
            // Use a flask-like symbol
            icon = slotInfo.name && slotInfo.name !== 'Empty' ? 'USE' : '---';
            break;
    }

    ctx.fillText(icon, centerX, centerY);
}

/**
 * Draw hotkey badge in corner
 */
function drawHotkeyBadge(ctx, x, y, size, cfg, keyText, colors) {
    const badgeSize = cfg.hotkeySize + 6;
    const badgeX = x + 3;
    const badgeY = y + 3;

    // Badge background
    ctx.fillStyle = colors.bgDarkest || '#0a0a0f';
    drawRoundedRect(ctx, badgeX, badgeY, badgeSize + (keyText.length > 1 ? 10 : 0), badgeSize, 3);
    ctx.fill();

    // Badge border
    ctx.strokeStyle = colors.gold || '#d4af37';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Key text
    ctx.fillStyle = colors.gold || '#d4af37';
    ctx.font = `bold ${cfg.hotkeySize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(keyText, badgeX + (badgeSize + (keyText.length > 1 ? 10 : 0)) / 2, badgeY + badgeSize / 2);
}

/**
 * Draw cooldown remaining text
 */
function drawCooldownText(ctx, x, y, size, cooldown, colors) {
    const cdText = cooldown >= 10
        ? Math.ceil(cooldown).toString()
        : cooldown.toFixed(1);

    ctx.fillStyle = colors.warning || '#f39c12';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(cdText + 's', x + size / 2, y + size - 4);
}

/**
 * Draw ready state pulse effect
 */
function drawReadyPulse(ctx, x, y, size, cfg, colors, customColor = null) {
    const pulseAlpha = 0.2 + Math.sin(window.actionBarState.pulsePhase) * 0.15;
    const pulseColor = customColor || (colors.success || '#27ae60');

    ctx.strokeStyle = pulseColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulseAlpha;
    drawRoundedRect(ctx, x - 2, y - 2, size + 4, size + 4, cfg.cornerRadius + 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// NOTE: Uses drawRoundedRect from ui-design-system.js

// ============================================================================
// SLOT INFO HELPERS (unchanged logic, cleaned up)
// ============================================================================

/**
 * Get slot information (state, cooldown, etc.)
 */
function getSlotInfo(hotkey, player) {
    const info = {
        hotkey: hotkey,
        name: '',
        icon: null,
        state: 'disabled',
        cooldown: 0,
        maxCooldown: 1,
        canUse: false
    };

    // Check GCD first
    if (player.gcd?.active && player.gcd?.remaining > 0) {
        info.state = 'gcd';
        info.cooldown = player.gcd.remaining;
        info.maxCooldown = player.gcd.duration;
        return info;
    }

    switch (hotkey) {
        case 1:
            return getConsumableInfo(player, 'slot1');
        case 2:
            return getConsumableInfo(player, 'slot2');
        case 3:
            return getConsumableInfo(player, 'slot3');
        case 4:
            return getConsumableInfo(player, 'slot4');
    }

    return info;
}

/**
 * Get consumable slot info
 */
function getConsumableInfo(player, slot) {
    const slotNumMap = { 'slot1': 1, 'slot2': 2, 'slot3': 3, 'slot4': 4 };
    const slotNum = slotNumMap[slot] || 1;
    const cooldownKey = `consumable${slotNum}`;

    const info = {
        hotkey: slotNum,
        name: 'Consumable',
        icon: 'potion',
        state: 'disabled',
        cooldown: 0,
        maxCooldown: 10,
        canUse: false
    };

    const itemId = player.assignedConsumables?.[slot];
    if (!itemId) {
        info.state = 'disabled';
        info.name = 'Empty';
        return info;
    }

    const item = findItemInPlayerInventory(player, itemId);
    if (!item || item.count <= 0) {
        info.state = 'disabled';
        info.name = 'Out of Items';
        return info;
    }

    info.name = item.name || 'Consumable';

    if (player.actionCooldowns?.[cooldownKey] > 0) {
        info.state = 'cooldown';
        info.cooldown = player.actionCooldowns[cooldownKey];
        info.maxCooldown = 10;
        return info;
    }

    if (player.itemCooldowns?.[itemId] > 0) {
        info.state = 'cooldown';
        info.cooldown = player.itemCooldowns[itemId];
        info.maxCooldown = 10;
        return info;
    }

    info.state = 'ready';
    info.canUse = true;
    return info;
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findItemInPlayerInventory(player, itemId) {
    if (!player.inventory) return null;
    return player.inventory.find(item => item.id === itemId);
}

// ============================================================================
// MOUSE INTERACTION
// ============================================================================

/**
 * Handle mouse move for hover detection
 * Layout: [Dash] [Torch] [Consumable1] [Consumable2]
 */
function handleActionBarMouseMove(e) {
    if (!canvas || game.state !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cfg = ACTION_BAR_CONFIG;
    const numSlots = 4;
    const barWidth = (cfg.slotSize * numSlots) + (cfg.slotSpacing * (numSlots - 1)) + 20;
    const barHeight = cfg.slotSize + 20;
    const barX = canvas.width - barWidth - cfg.barPadding;
    const barY = canvas.height - barHeight - cfg.barPadding;

    // Check if mouse is in action bar area
    if (mouseX < barX || mouseX > barX + barWidth ||
        mouseY < barY || mouseY > barY + barHeight) {
        window.actionBarState.hoverSlot = null;
        return;
    }

    // Check which slot is hovered
    // Layout: [Dash] [Torch] [Consumable1] [Consumable2]
    let hoveredSlot = null;
    for (let i = 0; i < numSlots; i++) {
        const slotX = barX + 10 + (i * (cfg.slotSize + cfg.slotSpacing));
        const slotY = barY + 10;

        if (mouseX >= slotX && mouseX <= slotX + cfg.slotSize &&
            mouseY >= slotY && mouseY <= slotY + cfg.slotSize) {
            if (i === 0) {
                hoveredSlot = 'dash';
            } else if (i === 1) {
                hoveredSlot = 'torch';
            } else if (i === 2) {
                hoveredSlot = 'slot1';
            } else {
                hoveredSlot = 'slot2';
            }
            break;
        }
    }

    window.actionBarState.hoverSlot = hoveredSlot;
}

/**
 * Initialize action bar click detection
 * Layout: [Dash] [Torch] [Consumable1] [Consumable2]
 */
function initActionBarClickHandler() {
    if (typeof canvas === 'undefined') {
        console.warn('Canvas not found for action bar click handler');
        return;
    }

    canvas.addEventListener('mousemove', handleActionBarMouseMove);

    canvas.addEventListener('click', (e) => {
        if (game.state !== 'playing') return;
        if (!game.player) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const cfg = ACTION_BAR_CONFIG;
        const numSlots = 4;
        const barWidth = (cfg.slotSize * numSlots) + (cfg.slotSpacing * (numSlots - 1)) + 20;
        const barHeight = cfg.slotSize + 20;
        const barX = canvas.width - barWidth - cfg.barPadding;
        const barY = canvas.height - barHeight - cfg.barPadding;

        // Check each slot: [Dash] [Torch] [Consumable1] [Consumable2]
        for (let i = 0; i < numSlots; i++) {
            const slotX = barX + 10 + (i * (cfg.slotSize + cfg.slotSpacing));
            const slotY = barY + 10;

            if (clickX >= slotX && clickX <= slotX + cfg.slotSize &&
                clickY >= slotY && clickY <= slotY + cfg.slotSize) {

                if (i === 0) {
                    // Dash (spacebar)
                    if (typeof performDash === 'function') {
                        performDash();
                    }
                } else if (i === 1) {
                    // Torch toggle (T)
                    if (typeof toggleTorch === 'function') {
                        toggleTorch();
                    }
                } else if (i === 2) {
                    // Consumable 1
                    if (typeof handleActiveCombatHotkey === 'function') {
                        handleActiveCombatHotkey(1, game.player);
                    }
                } else {
                    // Consumable 2
                    if (typeof handleActiveCombatHotkey === 'function') {
                        handleActiveCombatHotkey(2, game.player);
                    }
                }
                return;
            }
        }
    });
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', initActionBarClickHandler);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.drawCombatActionBar = drawCombatActionBar;
    window.ACTION_BAR_CONFIG = ACTION_BAR_CONFIG;
}

// Action bar UI loaded
