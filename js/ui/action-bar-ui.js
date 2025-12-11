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
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 */
function drawCombatActionBar(ctx, canvasWidth, canvasHeight) {
    const player = game.player;
    if (!player) return;

    const cfg = ACTION_BAR_CONFIG;
    const numSlots = 3; // 2 consumable slots (3-4) + 1 dash slot

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
        danger: '#e74c3c'
    };

    // Update animation phase
    window.actionBarState.pulsePhase = (window.actionBarState.pulsePhase + 0.05) % (Math.PI * 2);

    // Position at bottom-right corner
    const barWidth = (cfg.slotSize * numSlots) + (cfg.slotSpacing * (numSlots - 1)) + 20;
    const barHeight = cfg.slotSize + 20;
    const barX = canvasWidth - barWidth - cfg.barPadding;
    const barY = canvasHeight - barHeight - cfg.barPadding;

    ctx.save();

    // === BAR BACKGROUND ===
    drawActionBarBackground(ctx, barX, barY, barWidth, barHeight, cfg, colors);

    // === CONSUMABLE SLOTS (hotkeys 3 and 4) ===
    for (let i = 0; i < 2; i++) {
        const slotX = barX + 10 + (i * (cfg.slotSize + cfg.slotSpacing));
        const slotY = barY + 10;
        const hotkey = i + 3;
        drawStylizedActionSlot(ctx, slotX, slotY, cfg, hotkey, player, colors);
    }

    // === DASH SLOT ===
    const dashSlotX = barX + 10 + (2 * (cfg.slotSize + cfg.slotSpacing));
    drawStylizedDashSlot(ctx, dashSlotX, barY + 10, cfg, colors);

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
    ctx.beginPath();
    roundRect(ctx, x, y, width, height, cfg.cornerRadius);
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
    ctx.beginPath();
    roundRect(ctx, x, y, size, size, radius);
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
    ctx.beginPath();
    roundRect(ctx, x + 2, y + 2, size - 4, size - 4, radius - 2);
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
    ctx.beginPath();
    roundRect(ctx, badgeX, badgeY, badgeSize + (keyText.length > 1 ? 10 : 0), badgeSize, 3);
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
    ctx.beginPath();
    roundRect(ctx, x - 2, y - 2, size + 4, size + 4, cfg.cornerRadius + 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

/**
 * Helper: Draw rounded rectangle path
 */
function roundRect(ctx, x, y, width, height, radius) {
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
    const slotNum = slot === 'slot3' ? 3 : 4;
    const cooldownKey = slot === 'slot3' ? 'consumable3' : 'consumable4';

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

// Unused but kept for reference if slots 1-2 are re-enabled
function getBaseAttackInfo(player) {
    const info = {
        hotkey: 1,
        name: 'Base Attack',
        icon: 'sword',
        state: 'disabled',
        cooldown: 0,
        maxCooldown: 1,
        canUse: false
    };

    if (player.actionCooldowns?.baseAttack > 0) {
        info.state = 'cooldown';
        info.cooldown = player.actionCooldowns.baseAttack;
        info.maxCooldown = player.combat?.attackSpeed || 1.0;
        return info;
    }

    const target = player.combat?.currentTarget;
    if (!target || target.hp <= 0) {
        info.state = 'disabled';
        return info;
    }

    const weapon = player.equipped?.MAIN;
    const range = weapon?.stats?.range || 1;
    const distance = getDistanceToTarget(player, target);

    if (distance > range) {
        info.state = 'outOfRange';
        return info;
    }

    const weaponType = getWeaponTypeFromPlayer(player);

    if (weaponType === 'ranged') {
        const ammoType = weapon?.weaponType === 'crossbow' ? 'bolts' : 'arrows';
        if (!player.ammo || player.ammo[ammoType] <= 0) {
            info.state = 'outOfAmmo';
            return info;
        }
    }

    if (weaponType === 'magic') {
        const element = weapon?.element || 'arcane';
        const manaCost = getMagicManaCost(element);
        if (player.mp < manaCost) {
            info.state = 'outOfMana';
            return info;
        }
    }

    info.state = 'ready';
    info.canUse = true;
    return info;
}

function getSkillAttackInfo(player) {
    const info = {
        hotkey: 2,
        name: 'Skill Attack',
        icon: 'star',
        state: 'disabled',
        cooldown: 0,
        maxCooldown: 10,
        canUse: false
    };

    if (player.actionCooldowns?.skillAttack > 0) {
        info.state = 'cooldown';
        info.cooldown = player.actionCooldowns.skillAttack;
        info.maxCooldown = 10;
        return info;
    }

    const target = player.combat?.currentTarget;
    if (!target || target.hp <= 0) {
        info.state = 'disabled';
        return info;
    }

    const weapon = player.equipped?.MAIN;
    const range = weapon?.stats?.range || 1;
    const distance = getDistanceToTarget(player, target);

    if (distance > range) {
        info.state = 'outOfRange';
        return info;
    }

    const weaponType = getWeaponTypeFromPlayer(player);

    if (weaponType === 'ranged') {
        const ammoType = weapon?.weaponType === 'crossbow' ? 'bolts' : 'arrows';
        if (!player.ammo || player.ammo[ammoType] <= 0) {
            info.state = 'outOfAmmo';
            return info;
        }
    }

    if (weaponType === 'magic') {
        const element = weapon?.element || 'arcane';
        const manaCost = getMagicManaCost(element);
        if (player.mp < manaCost) {
            info.state = 'outOfMana';
            return info;
        }
    }

    info.state = 'ready';
    info.canUse = true;
    return info;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDistanceToTarget(player, target) {
    if (typeof getDistance === 'function') {
        return getDistance(player, target);
    }
    const dx = player.gridX - target.gridX;
    const dy = player.gridY - target.gridY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getWeaponTypeFromPlayer(player) {
    const weapon = player.equipped?.MAIN;
    if (!weapon) return 'melee';

    const weaponType = weapon.weaponType || weapon.damageType;

    if (['staff', 'wand', 'tome'].includes(weaponType)) {
        return 'magic';
    }

    if (['bow', 'crossbow', 'throwing'].includes(weaponType)) {
        return 'ranged';
    }

    return 'melee';
}

function getMagicManaCost(element) {
    if (typeof MAGIC_CONFIG !== 'undefined' && MAGIC_CONFIG[element]) {
        return MAGIC_CONFIG[element].manaCost;
    }
    return 12;
}

function findItemInPlayerInventory(player, itemId) {
    if (!player.inventory) return null;
    return player.inventory.find(item => item.id === itemId);
}

// ============================================================================
// MOUSE INTERACTION
// ============================================================================

/**
 * Handle mouse move for hover detection
 */
function handleActionBarMouseMove(e) {
    if (!canvas || game.state !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cfg = ACTION_BAR_CONFIG;
    const numSlots = 3;
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
    let hoveredSlot = null;
    for (let i = 0; i < 3; i++) {
        const slotX = barX + 10 + (i * (cfg.slotSize + cfg.slotSpacing));
        const slotY = barY + 10;

        if (mouseX >= slotX && mouseX <= slotX + cfg.slotSize &&
            mouseY >= slotY && mouseY <= slotY + cfg.slotSize) {
            if (i < 2) {
                hoveredSlot = `slot${i + 3}`;
            } else {
                hoveredSlot = 'dash';
            }
            break;
        }
    }

    window.actionBarState.hoverSlot = hoveredSlot;
}

/**
 * Initialize action bar click detection
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
        const numSlots = 3;
        const barWidth = (cfg.slotSize * numSlots) + (cfg.slotSpacing * (numSlots - 1)) + 20;
        const barHeight = cfg.slotSize + 20;
        const barX = canvas.width - barWidth - cfg.barPadding;
        const barY = canvas.height - barHeight - cfg.barPadding;

        // Check consumable slots (3 and 4)
        for (let i = 0; i < 2; i++) {
            const slotX = barX + 10 + (i * (cfg.slotSize + cfg.slotSpacing));
            const slotY = barY + 10;

            if (clickX >= slotX && clickX <= slotX + cfg.slotSize &&
                clickY >= slotY && clickY <= slotY + cfg.slotSize) {
                const hotkey = i + 3;
                if (typeof handleActiveCombatHotkey === 'function') {
                    handleActiveCombatHotkey(hotkey, game.player);
                }
                return;
            }
        }

        // Check dash slot
        const dashSlotX = barX + 10 + (2 * (cfg.slotSize + cfg.slotSpacing));
        const dashSlotY = barY + 10;
        if (clickX >= dashSlotX && clickX <= dashSlotX + cfg.slotSize &&
            clickY >= dashSlotY && clickY <= dashSlotY + cfg.slotSize) {
            if (typeof performDash === 'function') {
                performDash();
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

console.log('Action bar UI loaded (CotDG style)');
