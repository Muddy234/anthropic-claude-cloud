// ============================================================================
// ACTION BAR UI - Hotkey display (slots 1-4)
// ============================================================================
// Shows attack/consumable hotkeys with cooldowns, range indicators, and states
// ============================================================================

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Draw the combat action bar (bottom-right of screen)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 */
function drawCombatActionBar(ctx, canvasWidth, canvasHeight) {
    const player = game.player;
    if (!player) return;

    // Action bar configuration
    const slotSize = 60;
    const slotSpacing = 8;
    const barPadding = 20;
    const numSlots = 4;

    // Position at bottom-right (simple positioning)
    const barWidth = (slotSize * numSlots) + (slotSpacing * (numSlots - 1));
    const barHeight = slotSize;
    const barX = canvasWidth - barWidth - barPadding;
    const barY = canvasHeight - barHeight - barPadding - 90; // 90px from bottom to avoid skills bar

    // Draw each slot
    for (let i = 0; i < numSlots; i++) {
        const slotX = barX + (i * (slotSize + slotSpacing));
        const slotY = barY;
        const hotkey = i + 1;

        drawActionSlot(ctx, slotX, slotY, slotSize, hotkey, player);
    }
}

/**
 * Draw a single action slot
 */
function drawActionSlot(ctx, x, y, size, hotkey, player) {
    // Save canvas state
    ctx.save();

    // Determine slot state and content
    const slotInfo = getSlotInfo(hotkey, player);

    // LAYER 1: Black background for entire slot
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, size, size);

    // LAYER 2: Border based on state
    let borderColor = '#555555'; // Default
    let borderWidth = 2;

    if (slotInfo.state === 'ready') {
        borderColor = '#00ff00'; // Green for ready
        borderWidth = 3;
    } else if (slotInfo.state === 'outOfRange') {
        borderColor = '#888888'; // Grey for out of range
    } else if (slotInfo.state === 'outOfAmmo' || slotInfo.state === 'outOfMana') {
        borderColor = '#ff0000'; // Red for out of resources
    } else if (slotInfo.state === 'cooldown' || slotInfo.state === 'gcd') {
        borderColor = '#ffaa00'; // Orange for cooldown
    }

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

    // LAYER 3: Icon text (centered in slot)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let icon = '?';
    if (slotInfo.icon === 'sword') icon = 'ATK';
    else if (slotInfo.icon === 'star') icon = 'SKL';
    else if (slotInfo.icon === 'potion') icon = 'USE';
    else icon = '---';

    ctx.fillText(icon, x + size/2, y + size/2);

    // LAYER 4: Hotkey number (top-left corner)
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(hotkey.toString(), x + 4, y + 4);

    // LAYER 5: Cooldown text (if on cooldown)
    if (slotInfo.cooldown > 0) {
        const cdText = slotInfo.cooldown >= 10
            ? Math.ceil(slotInfo.cooldown).toString()
            : slotInfo.cooldown.toFixed(1);

        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(cdText + 's', x + size/2, y + size - 4);
    }

    // Restore canvas state
    ctx.restore();
}

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

    // Check GCD first (affects all slots)
    if (player.gcd?.active && player.gcd?.remaining > 0) {
        info.state = 'gcd';
        info.cooldown = player.gcd.remaining;
        info.maxCooldown = player.gcd.duration;
        return info;
    }

    // Hotkey-specific logic
    switch(hotkey) {
        case 1: // Base Attack
            return getBaseAttackInfo(player);
        case 2: // Skill Attack
            return getSkillAttackInfo(player);
        case 3: // Consumable 1
            return getConsumableInfo(player, 'slot3');
        case 4: // Consumable 2
            return getConsumableInfo(player, 'slot4');
    }

    return info;
}

/**
 * Get base attack slot info
 */
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

    // Check cooldown
    if (player.actionCooldowns?.baseAttack > 0) {
        info.state = 'cooldown';
        info.cooldown = player.actionCooldowns.baseAttack;
        info.maxCooldown = player.combat?.attackSpeed || 1.0;
        return info;
    }

    // Check target
    const target = player.combat?.currentTarget;
    if (!target || target.hp <= 0) {
        info.state = 'disabled';
        return info;
    }

    // Check range
    const weapon = player.equipped?.MAIN;
    const range = weapon?.stats?.range || 1;
    const distance = getDistanceToTarget(player, target);

    if (distance > range) {
        info.state = 'outOfRange';
        return info;
    }

    // Check ammo/mana
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

    // Ready to use!
    info.state = 'ready';
    info.canUse = true;
    return info;
}

/**
 * Get skill attack slot info
 */
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

    // Check cooldown
    if (player.actionCooldowns?.skillAttack > 0) {
        info.state = 'cooldown';
        info.cooldown = player.actionCooldowns.skillAttack;
        info.maxCooldown = 10;
        return info;
    }

    // Check target
    const target = player.combat?.currentTarget;
    if (!target || target.hp <= 0) {
        info.state = 'disabled';
        return info;
    }

    // Check range
    const weapon = player.equipped?.MAIN;
    const range = weapon?.stats?.range || 1;
    const distance = getDistanceToTarget(player, target);

    if (distance > range) {
        info.state = 'outOfRange';
        return info;
    }

    // Check ammo/mana (same as base attack)
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

    // Ready to use!
    info.state = 'ready';
    info.canUse = true;
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

    // Check if item assigned
    const itemId = player.assignedConsumables?.[slot];
    if (!itemId) {
        info.state = 'disabled';
        info.name = 'Empty';
        return info;
    }

    // Get item
    const item = findItemInPlayerInventory(player, itemId);
    if (!item || item.count <= 0) {
        info.state = 'disabled';
        info.name = 'Out of Items';
        return info;
    }

    info.name = item.name || 'Consumable';

    // Check cooldown
    if (player.actionCooldowns?.[cooldownKey] > 0) {
        info.state = 'cooldown';
        info.cooldown = player.actionCooldowns[cooldownKey];
        info.maxCooldown = 10;
        return info;
    }

    // Check item cooldown
    if (player.itemCooldowns?.[itemId] > 0) {
        info.state = 'cooldown';
        info.cooldown = player.itemCooldowns[itemId];
        info.maxCooldown = 10;
        return info;
    }

    // Ready to use!
    info.state = 'ready';
    info.canUse = true;
    return info;
}

/**
 * Draw cooldown overlay (pie chart style)
 */
function drawCooldownOverlay(ctx, x, y, size, remaining, max) {
    const progress = 1 - (remaining / max);

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#000000';

    // Draw pie sector
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2;
    const startAngle = -Math.PI / 2; // Start at top
    const endAngle = startAngle + (progress * Math.PI * 2);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

/**
 * Draw slot icon (placeholder)
 */
function drawSlotIcon(ctx, x, y, size, slotInfo) {
    const iconSize = 28;
    const iconX = x + size / 2;
    const iconY = y + size / 2;

    // Use simple text icons instead of emojis for compatibility
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `bold ${iconSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Icon based on slot type
    let icon = '?';

    switch(slotInfo.icon) {
        case 'sword':
            icon = 'ATK';
            break;
        case 'star':
            icon = 'SKL';
            break;
        case 'potion':
            icon = 'USE';
            break;
        default:
            icon = '---';
            break;
    }

    ctx.fillText(icon, iconX, iconY);
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
    return 12; // Default
}

function findItemInPlayerInventory(player, itemId) {
    if (!player.inventory) return null;
    return player.inventory.find(item => item.id === itemId);
}

// ============================================================================
// CLICK HANDLER
// ============================================================================

/**
 * Initialize action bar click detection
 */
function initActionBarClickHandler() {
    if (typeof canvas === 'undefined') {
        console.warn('Canvas not found for action bar click handler');
        return;
    }

    canvas.addEventListener('click', (e) => {
        if (game.state !== 'playing') return;
        if (!game.player) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Action bar configuration (must match drawCombatActionBar)
        const slotSize = 60;
        const slotSpacing = 8;
        const barPadding = 20;
        const numSlots = 4;
        const barWidth = (slotSize * numSlots) + (slotSpacing * (numSlots - 1));
        const barHeight = slotSize;
        const barX = canvas.width - barWidth - barPadding;
        const barY = canvas.height - barHeight - barPadding - 90;

        // Check if click is within action bar area
        for (let i = 0; i < numSlots; i++) {
            const slotX = barX + (i * (slotSize + slotSpacing));
            const slotY = barY;

            if (clickX >= slotX && clickX <= slotX + slotSize &&
                clickY >= slotY && clickY <= slotY + slotSize) {
                // Clicked on slot i+1
                const hotkey = i + 1;
                if (typeof handleActiveCombatHotkey === 'function') {
                    handleActiveCombatHotkey(hotkey, game.player);
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
}

console.log('✅ Action bar UI loaded');
