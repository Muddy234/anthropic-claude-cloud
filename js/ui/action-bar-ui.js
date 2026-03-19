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

// ============================================================================
// ABILITY ICONS - Visual icons for action bar abilities
// ============================================================================

/**
 * Ability icon definitions with canvas drawing functions
 * Each icon draws using simple canvas shapes (lines, arcs, paths)
 */
const ABILITY_ICONS = {
    /**
     * Dash ability icon - Speed lines / motion blur effect
     */
    dash: {
        draw: function(ctx, x, y, size, options = {}) {
            const { isReady = true, isDisabled = false } = options;

            // Get design system colors or fallbacks
            const readyColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.stamina : '#5da182';
            const disabledColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';
            const activeColor = '#00ffff'; // Cyan for dash

            ctx.save();

            const cx = x + size / 2;
            const cy = y + size / 2;
            const iconScale = size / 56; // Normalize to slot size

            // Set color based on state
            ctx.strokeStyle = isDisabled ? disabledColor : (isReady ? activeColor : readyColor);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = 2 * iconScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Main arrow pointing right (motion direction)
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.25, cy);
            ctx.lineTo(cx + size * 0.25, cy);
            ctx.lineTo(cx + size * 0.1, cy - size * 0.15);
            ctx.moveTo(cx + size * 0.25, cy);
            ctx.lineTo(cx + size * 0.1, cy + size * 0.15);
            ctx.stroke();

            // Motion lines (trailing effect)
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1.5 * iconScale;
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.35, cy - size * 0.12);
            ctx.lineTo(cx - size * 0.15, cy - size * 0.12);
            ctx.moveTo(cx - size * 0.38, cy);
            ctx.lineTo(cx - size * 0.18, cy);
            ctx.moveTo(cx - size * 0.35, cy + size * 0.12);
            ctx.lineTo(cx - size * 0.15, cy + size * 0.12);
            ctx.stroke();

            // Additional speed particles
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.42, cy - size * 0.06);
            ctx.lineTo(cx - size * 0.32, cy - size * 0.06);
            ctx.moveTo(cx - size * 0.42, cy + size * 0.06);
            ctx.lineTo(cx - size * 0.32, cy + size * 0.06);
            ctx.stroke();

            ctx.restore();
        }
    },

    /**
     * Heal ability icon - Heart with plus symbol
     */
    heal: {
        draw: function(ctx, x, y, size, options = {}) {
            const { isReady = true, isDisabled = false } = options;

            const readyColor = '#4caf50';      // Green
            const activeColor = '#00ff88';     // Bright green
            const disabledColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';

            ctx.save();

            const cx = x + size / 2;
            const cy = y + size / 2;
            const iconScale = size / 56;

            ctx.strokeStyle = isDisabled ? disabledColor : (isReady ? activeColor : readyColor);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = 2 * iconScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Heart shape
            const heartSize = size * 0.35;
            ctx.beginPath();
            ctx.moveTo(cx, cy + heartSize * 0.6);
            ctx.bezierCurveTo(cx - heartSize, cy, cx - heartSize, cy - heartSize * 0.6, cx, cy - heartSize * 0.3);
            ctx.bezierCurveTo(cx + heartSize, cy - heartSize * 0.6, cx + heartSize, cy, cx, cy + heartSize * 0.6);
            ctx.stroke();

            // Plus sign inside
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = 2.5 * iconScale;
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 0.08);
            ctx.lineTo(cx, cy + size * 0.12);
            ctx.moveTo(cx - size * 0.1, cy + size * 0.02);
            ctx.lineTo(cx + size * 0.1, cy + size * 0.02);
            ctx.stroke();

            ctx.restore();
        }
    },

    /**
     * Shield ability icon - Shield shape with barrier effect
     */
    shield: {
        draw: function(ctx, x, y, size, options = {}) {
            const { isReady = true, isDisabled = false, isActive = false } = options;

            const readyColor = '#2196f3';      // Blue
            const activeColor = '#00aaff';     // Bright cyan-blue
            const disabledColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';

            ctx.save();

            const cx = x + size / 2;
            const cy = y + size / 2;
            const iconScale = size / 56;

            const color = isDisabled ? disabledColor : (isActive ? activeColor : (isReady ? activeColor : readyColor));
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2 * iconScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Shield shape
            const shieldW = size * 0.35;
            const shieldH = size * 0.42;
            ctx.beginPath();
            ctx.moveTo(cx, cy - shieldH * 0.5);
            ctx.lineTo(cx + shieldW, cy - shieldH * 0.3);
            ctx.lineTo(cx + shieldW * 0.9, cy + shieldH * 0.2);
            ctx.quadraticCurveTo(cx, cy + shieldH * 0.6, cx, cy + shieldH * 0.6);
            ctx.quadraticCurveTo(cx, cy + shieldH * 0.6, cx - shieldW * 0.9, cy + shieldH * 0.2);
            ctx.lineTo(cx - shieldW, cy - shieldH * 0.3);
            ctx.closePath();
            ctx.stroke();

            // Inner glow when active
            if (isActive) {
                ctx.globalAlpha = 0.3;
                ctx.fill();
            }

            // Center line (barrier symbol)
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = 1.5 * iconScale;
            ctx.beginPath();
            ctx.moveTo(cx, cy - shieldH * 0.25);
            ctx.lineTo(cx, cy + shieldH * 0.3);
            ctx.stroke();

            ctx.restore();
        }
    },

    /**
     * Fireball spell icon - Flame with trailing sparks
     */
    fireball: {
        draw: function(ctx, x, y, size, options = {}) {
            const { isReady = true, isDisabled = false } = options;

            const readyColor = '#ff6600';
            const activeColor = '#ff4400';
            const disabledColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';

            ctx.save();

            const cx = x + size / 2;
            const cy = y + size / 2;
            const iconScale = size / 56;

            ctx.strokeStyle = isDisabled ? disabledColor : (isReady ? activeColor : readyColor);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = 2 * iconScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Outer flame shape
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 0.35);
            ctx.quadraticCurveTo(cx + size * 0.25, cy - size * 0.15, cx + size * 0.2, cy + size * 0.1);
            ctx.quadraticCurveTo(cx + size * 0.15, cy + size * 0.25, cx, cy + size * 0.3);
            ctx.quadraticCurveTo(cx - size * 0.15, cy + size * 0.25, cx - size * 0.2, cy + size * 0.1);
            ctx.quadraticCurveTo(cx - size * 0.25, cy - size * 0.15, cx, cy - size * 0.35);
            ctx.stroke();

            // Inner flame
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 0.15);
            ctx.quadraticCurveTo(cx + size * 0.1, cy, cx + size * 0.08, cy + size * 0.12);
            ctx.quadraticCurveTo(cx, cy + size * 0.2, cx - size * 0.08, cy + size * 0.12);
            ctx.quadraticCurveTo(cx - size * 0.1, cy, cx, cy - size * 0.15);
            ctx.fill();

            // Spark particles
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = isDisabled ? disabledColor : '#ff8800';
            ctx.beginPath();
            ctx.arc(cx - size * 0.15, cy - size * 0.25, 1.5 * iconScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + size * 0.18, cy - size * 0.2, 1 * iconScale, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    },

    /**
     * Frost Nova spell icon - Snowflake / ice burst
     */
    frost_nova: {
        draw: function(ctx, x, y, size, options = {}) {
            const { isReady = true, isDisabled = false } = options;

            const readyColor = '#44aaff';
            const activeColor = '#00ccff';
            const disabledColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';

            ctx.save();

            const cx = x + size / 2;
            const cy = y + size / 2;
            const iconScale = size / 56;

            ctx.strokeStyle = isDisabled ? disabledColor : (isReady ? activeColor : readyColor);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = 2 * iconScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const armLen = size * 0.28;

            // Draw 6 snowflake arms
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const endX = cx + Math.cos(angle) * armLen;
                const endY = cy + Math.sin(angle) * armLen;

                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Small branches
                const branchLen = armLen * 0.35;
                const midX = cx + Math.cos(angle) * armLen * 0.6;
                const midY = cy + Math.sin(angle) * armLen * 0.6;

                ctx.lineWidth = 1.5 * iconScale;
                ctx.beginPath();
                ctx.moveTo(midX, midY);
                ctx.lineTo(midX + Math.cos(angle + Math.PI / 4) * branchLen,
                           midY + Math.sin(angle + Math.PI / 4) * branchLen);
                ctx.moveTo(midX, midY);
                ctx.lineTo(midX + Math.cos(angle - Math.PI / 4) * branchLen,
                           midY + Math.sin(angle - Math.PI / 4) * branchLen);
                ctx.stroke();
                ctx.lineWidth = 2 * iconScale;
            }

            // Center dot
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(cx, cy, 2.5 * iconScale, 0, Math.PI * 2);
            ctx.fill();

            // Outer ring (nova burst)
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 1 * iconScale;
            ctx.beginPath();
            ctx.arc(cx, cy, armLen + 2 * iconScale, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
    },

    /**
     * Blink spell icon - Teleportation shimmer / displacement arrows
     */
    blink: {
        draw: function(ctx, x, y, size, options = {}) {
            const { isReady = true, isDisabled = false } = options;

            const readyColor = '#9966ff';
            const activeColor = '#cc66ff';
            const disabledColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';

            ctx.save();

            const cx = x + size / 2;
            const cy = y + size / 2;
            const iconScale = size / 56;

            ctx.strokeStyle = isDisabled ? disabledColor : (isReady ? activeColor : readyColor);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = 2 * iconScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Left silhouette (origin - fading)
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.22, cy - size * 0.2);
            ctx.lineTo(cx - size * 0.15, cy + size * 0.2);
            ctx.lineTo(cx - size * 0.29, cy + size * 0.2);
            ctx.closePath();
            ctx.stroke();

            // Right silhouette (destination - solid)
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(cx + size * 0.12, cy - size * 0.2);
            ctx.lineTo(cx + size * 0.19, cy + size * 0.2);
            ctx.lineTo(cx + size * 0.05, cy + size * 0.2);
            ctx.closePath();
            ctx.stroke();

            // Displacement arrow
            ctx.lineWidth = 1.5 * iconScale;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.1, cy);
            ctx.lineTo(cx + size * 0.05, cy);
            ctx.lineTo(cx, cy - size * 0.06);
            ctx.moveTo(cx + size * 0.05, cy);
            ctx.lineTo(cx, cy + size * 0.06);
            ctx.stroke();

            // Sparkle particles around destination
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = isDisabled ? disabledColor : '#ddaaff';
            const sparkles = [
                { dx: 0.22, dy: -0.25 },
                { dx: 0.28, dy: -0.05 },
                { dx: 0.25, dy: 0.18 },
                { dx: 0.08, dy: -0.28 }
            ];
            sparkles.forEach(s => {
                ctx.beginPath();
                ctx.arc(cx + s.dx * size, cy + s.dy * size, 1.2 * iconScale, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.restore();
        }
    },

    /**
     * Potion/consumable icon - Bottle shape with liquid fill
     */
    potion: {
        draw: function(ctx, x, y, size, options = {}) {
            const {
                isReady = true,
                isDisabled = false,
                potionColor = null,
                fillLevel = 0.7 // How full the potion is (0-1)
            } = options;

            ctx.save();

            const cx = x + size / 2;
            const cy = y + size / 2;
            const iconScale = size / 56;

            // Get design system colors or fallbacks
            const healthColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.health : '#a82828';
            const disabledColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';

            // Determine potion color
            let bottleColor = potionColor || healthColor;
            if (isDisabled) {
                bottleColor = disabledColor;
            }

            ctx.strokeStyle = bottleColor;
            ctx.fillStyle = bottleColor;
            ctx.lineWidth = 2 * iconScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Bottle dimensions
            const neckWidth = size * 0.12;
            const neckHeight = size * 0.12;
            const bodyWidth = size * 0.36;
            const bodyHeight = size * 0.38;
            const neckTop = cy - size * 0.32;
            const neckBottom = neckTop + neckHeight;
            const bodyTop = neckBottom + size * 0.06;
            const bodyBottom = cy + size * 0.28;

            // Draw bottle outline
            ctx.beginPath();
            // Neck
            ctx.moveTo(cx - neckWidth, neckTop);
            ctx.lineTo(cx - neckWidth, neckBottom);
            // Left shoulder
            ctx.lineTo(cx - bodyWidth / 2, bodyTop);
            // Left side
            ctx.lineTo(cx - bodyWidth / 2, bodyBottom);
            // Bottom
            ctx.lineTo(cx + bodyWidth / 2, bodyBottom);
            // Right side
            ctx.lineTo(cx + bodyWidth / 2, bodyTop);
            // Right shoulder
            ctx.lineTo(cx + neckWidth, neckBottom);
            // Right neck
            ctx.lineTo(cx + neckWidth, neckTop);
            // Top
            ctx.lineTo(cx - neckWidth, neckTop);
            ctx.stroke();

            // Cork/stopper
            ctx.fillStyle = '#8b6914'; // Dark gold/brown
            ctx.fillRect(cx - neckWidth - 1, neckTop - size * 0.04, neckWidth * 2 + 2, size * 0.05);

            // Liquid fill (inside bottle body)
            if (!isDisabled && fillLevel > 0) {
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = bottleColor;

                const liquidTop = bodyBottom - (bodyBottom - bodyTop) * fillLevel;
                const liquidWidth = bodyWidth / 2 - 2 * iconScale;

                ctx.beginPath();
                ctx.moveTo(cx - liquidWidth, liquidTop);
                ctx.lineTo(cx - liquidWidth, bodyBottom - 2 * iconScale);
                ctx.lineTo(cx + liquidWidth, bodyBottom - 2 * iconScale);
                ctx.lineTo(cx + liquidWidth, liquidTop);
                // Wavy top surface
                ctx.quadraticCurveTo(cx, liquidTop - size * 0.02, cx - liquidWidth, liquidTop);
                ctx.fill();

                // Liquid shine/highlight
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(cx - liquidWidth + 2 * iconScale, liquidTop + 2 * iconScale,
                            3 * iconScale, (bodyBottom - liquidTop) * 0.4);
            }

            // Bottle highlight (glass effect)
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 * iconScale;
            ctx.beginPath();
            ctx.moveTo(cx - bodyWidth / 2 + 3 * iconScale, bodyTop + 2 * iconScale);
            ctx.lineTo(cx - bodyWidth / 2 + 3 * iconScale, bodyBottom - 4 * iconScale);
            ctx.stroke();

            ctx.restore();
        }
    },

    /**
     * Weapon action icon - Sword slash / attack symbol
     */
    weaponAction: {
        draw: function(ctx, x, y, size, options = {}) {
            const { isReady = true, isDisabled = false, isLocked = false, actionIcon = null } = options;

            ctx.save();

            const cx = x + size / 2;
            const cy = y + size / 2;
            const iconScale = size / 56;

            // Get design system colors
            const readyColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.corruption : '#8e44ad';
            const disabledColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';
            const lockedColor = '#444444';

            let color = isDisabled ? disabledColor : (isLocked ? lockedColor : (isReady ? readyColor : '#666666'));

            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2 * iconScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw sword slash symbol
            ctx.beginPath();
            // Sword blade (diagonal)
            ctx.moveTo(cx - size * 0.25, cy + size * 0.25);
            ctx.lineTo(cx + size * 0.25, cy - size * 0.25);
            ctx.stroke();

            // Cross guard
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.08, cy - size * 0.02);
            ctx.lineTo(cx + size * 0.08, cy + size * 0.12);
            ctx.stroke();

            // Motion arc (slash effect)
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.28, -Math.PI * 0.75, -Math.PI * 0.25, false);
            ctx.stroke();

            ctx.restore();
        }
    },

    /**
     * Lock icon for locked weapon actions
     */
    lock: {
        draw: function(ctx, x, y, size, options = {}) {
            ctx.save();

            const cx = x + size / 2;
            const cy = y + size / 2;
            const iconScale = size / 56;

            const lockColor = '#666666';

            ctx.strokeStyle = lockColor;
            ctx.fillStyle = lockColor;
            ctx.lineWidth = 2 * iconScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Lock body (rectangle)
            const bodyW = size * 0.3;
            const bodyH = size * 0.22;
            const bodyX = cx - bodyW / 2;
            const bodyY = cy - bodyH / 2 + size * 0.05;

            ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

            // Lock shackle (arc at top)
            ctx.beginPath();
            ctx.arc(cx, bodyY, bodyW * 0.35, Math.PI, 0, false);
            ctx.stroke();

            // Keyhole
            ctx.fillStyle = '#222222';
            ctx.beginPath();
            ctx.arc(cx, bodyY + bodyH * 0.35, bodyW * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - bodyW * 0.05, bodyY + bodyH * 0.35, bodyW * 0.1, bodyH * 0.4);

            ctx.restore();
        }
    }
};

// Export ABILITY_ICONS
window.ABILITY_ICONS = ABILITY_ICONS;

// Slot state tracking for animations
window.actionBarState = {
    hoverSlot: null,
    activeSlot: null,
    pulsePhase: 0
};

// ============================================================================
// WEAPON ACTION SLOT MANAGEMENT
// ============================================================================

/**
 * Get the weapon action for a given specialty
 */
function getActionForSpecialty(specialty) {
    const actionMap = {
        sword: { id: 'blade_dancer', icon: 'BD', name: 'Blade Dancer', damageMultiplier: 1.2 },
        knife: { id: 'arterial_strike', icon: 'AS', name: 'Arterial Strike', damageMultiplier: 2.0 },
        axe: { id: 'cleaving_blow', icon: 'CB', name: 'Cleaving Blow', damageMultiplier: 1.5 },
        polearm: { id: 'impaling_thrust', icon: 'IT', name: 'Impaling Thrust', damageMultiplier: 1.3 },
        mace: { id: 'skull_crack', icon: 'SC', name: 'Skull Crack', damageMultiplier: 1.3 },
        staff: { id: 'sweeping_arc', icon: 'SA', name: 'Sweeping Arc', damageMultiplier: 1.0 },
        unarmed: { id: 'flurry_of_blows', icon: 'FB', name: 'Flurry of Blows', damageMultiplier: 1.5 },
        shield: { id: 'shield_charge', icon: 'SH', name: 'Shield Charge', damageMultiplier: 1.2 },
        fire: { id: 'immolate', icon: 'IM', name: 'Immolate', damageMultiplier: 2.1 },
        ice: { id: 'frozen_grasp', icon: 'FG', name: 'Frozen Grasp', damageMultiplier: 1.0 },
        lightning: { id: 'chain_lightning', icon: 'CL', name: 'Chain Lightning', damageMultiplier: 2.2 },
        necromancy: { id: 'life_siphon', icon: 'LS', name: 'Life Siphon', damageMultiplier: 1.2 },
        bow: { id: 'power_shot', icon: 'PS', name: 'Power Shot', damageMultiplier: 1.8 },
        dagger: { id: 'backstab', icon: 'BS', name: 'Backstab', damageMultiplier: 1.5 }
        // crossbow and throwing weapon types removed from equipment system
    };

    return actionMap[specialty] || null;
}

/**
 * Weapon action slot state storage
 */
window.weaponActionSlots = {
    slot1: { actionId: null, state: 'disabled', lockedInfo: null },
    slot2: { actionId: null, state: 'disabled', lockedInfo: null }
};

/**
 * Set action for a weapon action slot
 */
function setSlotAction(slotNum, actionId, state, lockedInfo = null) {
    const slotKey = `slot${slotNum}`;
    window.weaponActionSlots[slotKey] = {
        actionId: actionId,
        state: state,
        lockedInfo: lockedInfo
    };
}

/**
 * Update weapon action slots based on player equipment
 * Called on weapon equip, unequip, and specialty level-up
 */
function updateWeaponActionSlots(player) {
    if (!player) return;

    const SKILL_CONFIG = window.SKILL_CONFIG || { actionUnlockLevel: 5 };
    const actionUnlockLevel = SKILL_CONFIG.actionUnlockLevel || 5;

    // Slot 1: Main hand
    const mainWeapon = player.equipped?.MAIN;
    if (mainWeapon && mainWeapon.specialty) {
        const specLevel = player.skills?.specialties?.[mainWeapon.specialty]?.level || 0;
        const action = getActionForSpecialty(mainWeapon.specialty);
        if (action && specLevel >= actionUnlockLevel) {
            setSlotAction(1, action.id, 'ready');
        } else if (action) {
            setSlotAction(1, action.id, 'locked', {
                requiredLevel: actionUnlockLevel,
                currentLevel: specLevel
            });
        } else {
            setSlotAction(1, null, 'disabled');
        }
    } else {
        setSlotAction(1, null, 'disabled');
    }

    // Slot 2: Off hand
    const offWeapon = player.equipped?.OFF;
    if (offWeapon && offWeapon.specialty) {
        const specLevel = player.skills?.specialties?.[offWeapon.specialty]?.level || 0;
        const action = getActionForSpecialty(offWeapon.specialty);
        if (action && specLevel >= actionUnlockLevel) {
            setSlotAction(2, action.id, 'ready');
        } else if (action) {
            setSlotAction(2, action.id, 'locked', {
                requiredLevel: actionUnlockLevel,
                currentLevel: specLevel
            });
        } else {
            setSlotAction(2, null, 'disabled');
        }
    } else {
        setSlotAction(2, null, 'disabled');
    }
}

// Export function
window.updateWeaponActionSlots = updateWeaponActionSlots;
window.getActionForSpecialty = getActionForSpecialty;

// ============================================================================
// STAMINA AFFORDABILITY HELPERS
// ============================================================================

/**
 * Get the stamina cost for a given action slot type
 * @param {string} slotType - 'dash', 'lightAttack', 'weaponAction', 'consumable'
 * @returns {number} The stamina cost, or 0 if no cost
 */
function getSlotStaminaCost(slotType) {
    // Check SpellSystem first for dash/heal/shield costs
    if (slotType === 'dash' || slotType === 'spell') {
        if (typeof SpellSystem !== 'undefined' && SpellSystem.initialized) {
            const spellId = SpellSystem.getSelectedSpellId();
            const spellDef = SpellSystem.spells?.[spellId];
            return spellDef?.staminaCost || 0;
        }
        // Fallback to STAMINA_CONFIG for dodge cost
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { costs: {} };
        return config.costs?.dodge || 25;
    }

    if (slotType === 'weaponAction') {
        // Weapon actions use lightAttack stamina cost
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { costs: {} };
        return config.costs?.lightAttack || 10;
    }

    // Consumables typically have no stamina cost
    return 0;
}

/**
 * Check if the player can afford the stamina cost for a slot
 * @param {string} slotType - 'dash', 'weaponAction', 'consumable'
 * @returns {boolean}
 */
function canAffordSlotStamina(slotType) {
    if (typeof StaminaSystem === 'undefined') return true;
    const cost = getSlotStaminaCost(slotType);
    if (cost <= 0) return true;
    return StaminaSystem.state.current >= cost;
}

/**
 * Draw stamina-insufficient overlay on a slot: semi-transparent dark overlay + red "!" indicator
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Slot x position
 * @param {number} y - Slot y position
 * @param {number} size - Slot size
 * @param {number} cornerRadius - Corner radius for the slot
 */
function drawStaminaInsufficientOverlay(ctx, x, y, size, cornerRadius) {
    ctx.save();

    // Semi-transparent dark overlay
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#000000';
    drawRoundedRect(ctx, x + 2, y + 2, size - 4, size - 4, cornerRadius - 1);
    ctx.fill();

    ctx.globalAlpha = 1.0;

    // Red "!" warning indicator in the bottom-left corner
    const indicatorSize = 14;
    const indicatorX = x + 4;
    const indicatorY = y + size - indicatorSize - 4;

    // Red circle background
    ctx.fillStyle = 'rgba(200, 40, 40, 0.9)';
    ctx.beginPath();
    ctx.arc(indicatorX + indicatorSize / 2, indicatorY + indicatorSize / 2, indicatorSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // "!" text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', indicatorX + indicatorSize / 2, indicatorY + indicatorSize / 2);

    ctx.restore();
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Draw the combat action bar (bottom-right of screen) - CotDG Style
 * Layout: [Dash/SPC] [Spell1/1] [Spell2/2] [Spell3/3] [Spell4/4] [Consumable/5]
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 */
function drawCombatActionBar(ctx, canvasWidth, canvasHeight) {
    const player = game.player;
    if (!player) return;

    const cfg = ACTION_BAR_CONFIG;
    const numSlots = 6; // Dash + 4 Spell slots + Consumable

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

    // Update weapon action slots (still used for Q/E weapon actions, rendered elsewhere)
    updateWeaponActionSlots(player);

    // Position at bottom-right corner - unified bar for all 6 slots
    const barWidth = (cfg.slotSize * numSlots) + (cfg.slotSpacing * (numSlots - 1)) + 20;
    const barHeight = cfg.slotSize + 20;
    const barX = canvasWidth - barWidth - cfg.barPadding;
    const barY = canvasHeight - barHeight - cfg.barPadding;

    // Store bar dimensions for shift bar positioning
    window.actionBarDimensions = { x: barX, y: barY, width: barWidth, height: barHeight };

    ctx.save();

    // === BAR BACKGROUND (single unified background for all 6 slots) ===
    drawActionBarBackground(ctx, barX, barY, barWidth, barHeight, cfg, colors);

    let slotIdx = 0;

    // === SLOT 0: DASH (spacebar) ===
    const dashSlotX = barX + 10 + (slotIdx * (cfg.slotSize + cfg.slotSpacing));
    drawStylizedDashSlot(ctx, dashSlotX, barY + 10, cfg, colors);
    slotIdx++;

    // === SLOTS 1-4: SPELL SLOTS (keys 1-4) ===
    // Ensure spell slots exist
    if (typeof SpellSystem !== 'undefined' && SpellSystem.initialized) {
        SpellSystem._ensureSpellSlots();
    }
    const spellSlots = player.spellSlots || ['heal', 'shield', 'fireball', 'frost_nova'];

    for (let i = 0; i < 4; i++) {
        const spellSlotX = barX + 10 + (slotIdx * (cfg.slotSize + cfg.slotSpacing));
        drawSpellSlot(ctx, spellSlotX, barY + 10, cfg, i, spellSlots[i], player, colors);
        slotIdx++;
    }

    // === SLOT 5: CONSUMABLE (key 5) ===
    const consumableSlotX = barX + 10 + (slotIdx * (cfg.slotSize + cfg.slotSpacing));
    drawStylizedActionSlot(ctx, consumableSlotX, barY + 10, cfg, 1, player, colors, '5');
    slotIdx++;

    ctx.restore();
}

/**
 * Draw a spell slot in the action bar
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Slot X position
 * @param {number} y - Slot Y position
 * @param {Object} cfg - Action bar config
 * @param {number} slotIndex - 0-3 spell slot index
 * @param {string} spellId - Spell ID in this slot
 * @param {Object} player - Player entity
 * @param {Object} colors - UI color palette
 */
function drawSpellSlot(ctx, x, y, cfg, slotIndex, spellId, player, colors) {
    const size = cfg.slotSize;
    const hotkeyLabel = (slotIndex + 1).toString(); // "1", "2", "3", "4"
    const isHovered = window.actionBarState.hoverSlot === `spell${slotIndex}`;

    // Spell-specific colors
    const spellColors = {
        dash: '#00ffff',
        heal: '#4caf50',
        shield: '#2196f3',
        fireball: '#ff6600',
        frost_nova: '#00ccff',
        blink: '#cc66ff'
    };
    const spellColor = spellColors[spellId] || '#888888';

    // Get cooldown from SpellSystem
    let cooldown = 0;
    let maxCooldown = 1;
    let canAfford = true;

    if (typeof SpellSystem !== 'undefined' && SpellSystem.initialized) {
        cooldown = SpellSystem.getSlotCooldownRemaining(slotIndex);
        const spell = SPELL_DEFINITIONS?.[spellId];
        maxCooldown = spell ? SpellSystem.getEffectiveCooldown(spellId) : 1;
        canAfford = SpellSystem.canAffordSlot(slotIndex);
    }

    const isReady = cooldown <= 0;
    const spell = SPELL_DEFINITIONS?.[spellId];
    const isEmpty = !spellId || !spell;

    ctx.save();

    // === SLOT BACKGROUND ===
    const slotInfo = {
        state: isEmpty ? 'disabled' : (isReady ? 'ready' : 'cooldown'),
        cooldown: cooldown,
        maxCooldown: maxCooldown
    };
    drawSlotBackground(ctx, x, y, size, cfg, slotInfo, isHovered, colors, false);

    // === COOLDOWN SWEEP ===
    if (cooldown > 0 && !isEmpty) {
        drawCooldownSweep(ctx, x, y, size, cfg, cooldown, maxCooldown, colors);
    }

    // === SPELL ICON ===
    if (!isEmpty) {
        const iconDef = ABILITY_ICONS && ABILITY_ICONS[spellId];

        // Add glow when ready
        if (isReady && canAfford) {
            ctx.shadowColor = spellColor;
            ctx.shadowBlur = 6;
        }

        // Dim during cooldown
        if (!isReady) {
            ctx.globalAlpha = 0.5;
        }

        if (iconDef) {
            iconDef.draw(ctx, x, y, size, {
                isReady: isReady && canAfford,
                isDisabled: isEmpty || !canAfford
            });
        } else {
            // Fallback text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isReady ? (colors.textPrimary || '#ffffff') : (colors.textMuted || '#888888');
            ctx.font = `bold ${cfg.iconSize - 4}px monospace`;
            const shortName = (spell.name || spellId).substring(0, 3).toUpperCase();
            ctx.fillText(shortName, x + size / 2, y + size / 2);
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    } else {
        // Empty slot
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colors.textMuted || '#444444';
        ctx.font = `bold ${cfg.iconSize}px monospace`;
        ctx.fillText('--', x + size / 2, y + size / 2);
    }

    // === STAMINA INSUFFICIENT OVERLAY ===
    if (!isEmpty && isReady && !canAfford) {
        if (typeof drawStaminaInsufficientOverlay === 'function') {
            drawStaminaInsufficientOverlay(ctx, x, y, size, cfg.cornerRadius);
        }
    }

    // === HOTKEY BADGE ===
    drawHotkeyBadge(ctx, x, y, size, cfg, hotkeyLabel, colors);

    // === COOLDOWN TEXT ===
    if (cooldown > 0 && !isEmpty) {
        const cooldownText = formatSpellCooldown(cooldown);
        drawCooldownText(ctx, x, y, size, cooldown, colors, cooldownText);
    }

    // === READY GLOW ===
    if (isReady && canAfford && !isEmpty && !isHovered) {
        drawReadyPulse(ctx, x, y, size, cfg, colors, spellColor);
    }

    ctx.restore();
}

/**
 * Draw weapon action slot (main hand or off hand)
 */
function drawWeaponActionSlot(ctx, x, y, cfg, slotNum, player, colors, hotkey) {
    const size = cfg.slotSize;
    const slotKey = `slot${slotNum}`;
    const slotData = window.weaponActionSlots[slotKey] || { actionId: null, state: 'disabled', lockedInfo: null };
    const isHovered = window.actionBarState.hoverSlot === `weapon${slotNum}`;

    // Get weapon info for this slot
    const weapon = slotNum === 1 ? player.equipped?.MAIN : player.equipped?.OFF;
    const specialty = weapon?.specialty;
    const action = specialty ? getActionForSpecialty(specialty) : null;

    // Get cooldown info
    let cooldown = 0;
    let maxCooldown = 10;
    if (action && player.skills?.actionCooldowns?.[action.id] > 0) {
        cooldown = player.skills.actionCooldowns[action.id];
    }

    ctx.save();

    // === SLOT BACKGROUND ===
    const slotInfo = {
        state: slotData.state,
        cooldown: cooldown,
        maxCooldown: maxCooldown
    };
    drawSlotBackground(ctx, x, y, size, cfg, slotInfo, isHovered, colors, false);

    // === COOLDOWN SWEEP ===
    if (cooldown > 0 && slotData.state !== 'locked' && slotData.state !== 'disabled') {
        drawCooldownSweep(ctx, x, y, size, cfg, cooldown, maxCooldown, colors);
    }

    // === SLOT CONTENT ===
    if (slotData.state === 'locked') {
        // Draw locked state with dimmed action icon behind lock
        drawLockedWeaponActionSlot(ctx, x, y, size, cfg, action, slotData.lockedInfo, colors);
    } else if (slotData.state === 'disabled' || !action) {
        // Draw empty/disabled state
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colors.textMuted || '#444444';
        ctx.font = `bold ${cfg.iconSize}px monospace`;
        ctx.fillText('--', x + size / 2, y + size / 2);
    } else {
        // Draw action icon (ready or cooldown)
        const isReady = cooldown <= 0;

        // Add glow when ready
        if (isReady) {
            ctx.shadowColor = colors.corruption || '#8e44ad';
            ctx.shadowBlur = 6;
        }

        // Dim during cooldown
        if (!isReady) {
            ctx.globalAlpha = 0.5;
        }

        // Draw action icon text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isReady ? (colors.textPrimary || '#ffffff') : (colors.textMuted || '#888888');
        ctx.font = `bold ${cfg.iconSize}px monospace`;
        ctx.fillText(action.icon || '??', x + size / 2, y + size / 2);

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    // === HOTKEY BADGE ===
    drawHotkeyBadge(ctx, x, y, size, cfg, hotkey, colors);

    // === COOLDOWN TEXT ===
    if (cooldown > 0 && slotData.state !== 'locked' && slotData.state !== 'disabled') {
        drawCooldownText(ctx, x, y, size, cooldown, colors);
    }

    // === STAMINA AFFORDABILITY OVERLAY ===
    if (slotData.state === 'ready' && cooldown <= 0 && !canAffordSlotStamina('weaponAction')) {
        drawStaminaInsufficientOverlay(ctx, x, y, size, cfg.cornerRadius);
    }

    // === READY GLOW ===
    if (slotData.state === 'ready' && cooldown <= 0 && !isHovered && canAffordSlotStamina('weaponAction')) {
        drawReadyPulse(ctx, x, y, size, cfg, colors, colors.corruption || '#8e44ad');
    }

    ctx.restore();
}

/**
 * Draw locked weapon action slot with lock icon and level requirement
 */
function drawLockedWeaponActionSlot(ctx, x, y, size, cfg, action, lockedInfo, colors) {
    const cx = x + size / 2;
    const cy = y + size / 2;

    // Draw dimmed action icon behind
    if (action) {
        ctx.globalAlpha = 0.2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colors.textMuted || '#444444';
        ctx.font = `bold ${cfg.iconSize}px monospace`;
        ctx.fillText(action.icon || '??', cx, cy - 4);
        ctx.globalAlpha = 1;
    }

    // Draw lock icon
    if (ABILITY_ICONS && ABILITY_ICONS.lock) {
        ABILITY_ICONS.lock.draw(ctx, x, y, size, {});
    } else {
        // Fallback lock symbol
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#666666';
        ctx.font = `bold ${cfg.iconSize - 4}px monospace`;
        ctx.fillText('\u{1F512}', cx, cy - 2); // Lock emoji fallback
    }

    // Draw level requirement text
    const reqLevel = lockedInfo?.requiredLevel || 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = colors.textMuted || '#666666';
    ctx.font = `bold 9px monospace`;
    ctx.fillText(`Lv.${reqLevel}`, cx, y + size - 3);
}

/**
 * Get weapon action data for the action bar
 */
function getWeaponActionForBar(player) {
    if (!player.skills) return null;

    const weapon = player.equipped?.MAIN;
    const specialty = weapon?.specialty || 'unarmed';
    const specData = player.skills.specialties[specialty];

    const action = getActionForSpecialty(specialty);
    if (!action) return null;

    const cooldown = player.skills.actionCooldowns?.[action.id] || 0;
    const isUnlocked = specData && specData.level >= 5;

    return {
        ...action,
        specialty: specialty,
        cooldown: cooldown,
        maxCooldown: 10,
        isUnlocked: isUnlocked,
        isReady: cooldown <= 0 && isUnlocked
    };
}

/**
 * Draw action bar background panel - Ornate Temple Frame
 */
function drawActionBarBackground(ctx, x, y, width, height, cfg, colors) {
    // Get design system colors
    const frameGold = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGold : '#b8860b';
    const frameGoldBright = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldBright : '#daa520';
    const frameGoldDark = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldDark : '#8b6914';
    const templeStone = typeof UI_COLORS !== 'undefined' ? UI_COLORS.templeStone : '#2a2622';
    const templeStoneDark = typeof UI_COLORS !== 'undefined' ? UI_COLORS.templeStoneDark : '#1a1816';

    ctx.save();

    // === OUTER SHADOW ===
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // === MAIN STONE BACKGROUND ===
    const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
    bgGrad.addColorStop(0, templeStone);
    bgGrad.addColorStop(0.5, templeStoneDark);
    bgGrad.addColorStop(1, '#0d0b0a');

    ctx.fillStyle = bgGrad;
    drawRoundedRect(ctx, x, y, width, height, cfg.cornerRadius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // === GOLD FRAME BORDER ===
    const frameGrad = ctx.createLinearGradient(x, y, x + width, y + height);
    frameGrad.addColorStop(0, frameGoldBright);
    frameGrad.addColorStop(0.3, frameGold);
    frameGrad.addColorStop(0.7, frameGoldDark);
    frameGrad.addColorStop(1, frameGold);

    ctx.strokeStyle = frameGrad;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, x, y, width, height, cfg.cornerRadius);
    ctx.stroke();

    // === INNER DARK BORDER ===
    ctx.strokeStyle = '#0a0908';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x + 3, y + 3, width - 6, height - 6, cfg.cornerRadius - 2);
    ctx.stroke();

    // === CORNER FLOURISHES ===
    const cornerSize = 8;

    // Top-left corner flourish
    ctx.fillStyle = frameGold;
    ctx.beginPath();
    ctx.moveTo(x, y + cfg.cornerRadius);
    ctx.lineTo(x + cornerSize, y + cfg.cornerRadius);
    ctx.lineTo(x + cornerSize, y + cfg.cornerRadius + cornerSize);
    ctx.lineTo(x + cornerSize - 3, y + cfg.cornerRadius + cornerSize);
    ctx.lineTo(x + cornerSize - 3, y + cfg.cornerRadius + 3);
    ctx.lineTo(x, y + cfg.cornerRadius + 3);
    ctx.closePath();
    ctx.fill();

    // Top-right corner flourish
    ctx.beginPath();
    ctx.moveTo(x + width, y + cfg.cornerRadius);
    ctx.lineTo(x + width - cornerSize, y + cfg.cornerRadius);
    ctx.lineTo(x + width - cornerSize, y + cfg.cornerRadius + cornerSize);
    ctx.lineTo(x + width - cornerSize + 3, y + cfg.cornerRadius + cornerSize);
    ctx.lineTo(x + width - cornerSize + 3, y + cfg.cornerRadius + 3);
    ctx.lineTo(x + width, y + cfg.cornerRadius + 3);
    ctx.closePath();
    ctx.fill();

    // Bottom-left corner flourish
    ctx.beginPath();
    ctx.moveTo(x, y + height - cfg.cornerRadius);
    ctx.lineTo(x + cornerSize, y + height - cfg.cornerRadius);
    ctx.lineTo(x + cornerSize, y + height - cfg.cornerRadius - cornerSize);
    ctx.lineTo(x + cornerSize - 3, y + height - cfg.cornerRadius - cornerSize);
    ctx.lineTo(x + cornerSize - 3, y + height - cfg.cornerRadius - 3);
    ctx.lineTo(x, y + height - cfg.cornerRadius - 3);
    ctx.closePath();
    ctx.fill();

    // Bottom-right corner flourish
    ctx.beginPath();
    ctx.moveTo(x + width, y + height - cfg.cornerRadius);
    ctx.lineTo(x + width - cornerSize, y + height - cfg.cornerRadius);
    ctx.lineTo(x + width - cornerSize, y + height - cfg.cornerRadius - cornerSize);
    ctx.lineTo(x + width - cornerSize + 3, y + height - cfg.cornerRadius - cornerSize);
    ctx.lineTo(x + width - cornerSize + 3, y + height - cfg.cornerRadius - 3);
    ctx.lineTo(x + width, y + height - cfg.cornerRadius - 3);
    ctx.closePath();
    ctx.fill();

    // === TOP DECORATIVE DIVIDER LINE ===
    ctx.strokeStyle = frameGoldDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 5);
    ctx.lineTo(x + width - 15, y + 5);
    ctx.stroke();

    // Center emblem on top line
    ctx.fillStyle = frameGold;
    ctx.beginPath();
    ctx.arc(x + width / 2, y + 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = templeStoneDark;
    ctx.beginPath();
    ctx.arc(x + width / 2, y + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // === SUBTLE TEXTURE ===
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < 8; i++) {
        const gx = x + 10 + Math.random() * (width - 20);
        const gy = y + 10 + Math.random() * (height - 20);
        ctx.fillRect(gx, gy, 2, 1);
    }

    ctx.restore();
}

/**
 * Draw a stylized action slot - CotDG style with ability icons
 * Used for consumable slot
 */
function drawStylizedActionSlot(ctx, x, y, cfg, hotkey, player, colors, hotkeyLabel) {
    const size = cfg.slotSize;
    const slotInfo = getSlotInfo(hotkey, player);
    const isHovered = window.actionBarState.hoverSlot === `slot${hotkey}`;
    const displayLabel = hotkeyLabel || hotkey.toString();

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
    drawHotkeyBadge(ctx, x, y, size, cfg, displayLabel, colors);

    // === COOLDOWN TEXT ===
    if (slotInfo.cooldown > 0) {
        drawCooldownText(ctx, x, y, size, slotInfo.cooldown, colors);
    }

    // === CHARGES INDICATOR (for consumables with stacks) ===
    if (slotInfo.charges !== undefined && slotInfo.charges > 0) {
        drawChargesIndicator(ctx, x, y, size, slotInfo.charges, slotInfo.maxCharges, colors);
    }

    // === READY GLOW ===
    if (slotInfo.state === 'ready' && !isHovered) {
        drawReadyPulse(ctx, x, y, size, cfg, colors);
    }

    ctx.restore();
}

/**
 * Draw charges/stack indicator for consumables
 */
function drawChargesIndicator(ctx, x, y, size, charges, maxCharges, colors) {
    const cfg = ACTION_BAR_CONFIG;

    // Position in bottom-right corner (opposite of hotkey badge)
    const badgeH = cfg.hotkeySize + 2;
    const badgeW = badgeH + (charges > 9 ? 6 : 0);
    const badgeX = x + size - badgeW - 2;
    const badgeY = y + size - badgeH - 2;

    ctx.save();

    // Badge background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 2);
    ctx.fill();

    // Border - color based on charge level
    let borderColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.textMuted : '#706850';

    if (charges === 0) {
        borderColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.danger : '#c94a3a';
    } else if (maxCharges && charges <= maxCharges * 0.25) {
        borderColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.warning : '#d4852a';
    } else if (maxCharges && charges >= maxCharges) {
        borderColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.success : '#5da182';
    }

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Charge count text
    ctx.fillStyle = charges === 0 ?
        (typeof UI_COLORS !== 'undefined' ? UI_COLORS.danger : '#c94a3a') :
        (typeof UI_COLORS !== 'undefined' ? UI_COLORS.textPrimary : '#efe4b0');
    ctx.font = `bold ${cfg.hotkeySize - 2}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charges.toString(), badgeX + badgeW / 2, badgeY + badgeH / 2);

    ctx.restore();
}

/**
 * Draw stylized spell slot - Supports Dash/Heal/Shield from SpellSystem
 */
function drawStylizedDashSlot(ctx, x, y, cfg, colors) {
    const size = cfg.slotSize;

    // Get selected spell from SpellSystem (fallback to dash)
    const selectedSpellId = typeof SpellSystem !== 'undefined' && SpellSystem.initialized
        ? SpellSystem.getSelectedSpellId()
        : 'dash';

    // Spell-specific colors
    const spellColors = {
        dash: '#00ffff',   // Cyan
        heal: '#4caf50',   // Green
        shield: '#2196f3'  // Blue
    };
    const spellColor = spellColors[selectedSpellId] || '#00ffff';

    // Get cooldown from SpellSystem or fallback to DodgeSystem
    let cooldown = 0;
    let maxCooldown = 1;
    if (typeof SpellSystem !== 'undefined' && SpellSystem.initialized) {
        cooldown = SpellSystem.getCooldownRemaining();
        maxCooldown = SpellSystem.state.maxCooldown || 1;
    } else if (typeof getDashCooldown === 'function') {
        cooldown = getDashCooldown();
        maxCooldown = typeof getDashCooldownMax === 'function' ? getDashCooldownMax() : 1;
    }

    // Active states
    const isDashing = typeof playerIsDashing === 'function' && playerIsDashing();
    const hasIframes = typeof playerHasIframes === 'function' && playerHasIframes();
    const hasActiveShield = typeof SpellSystem !== 'undefined' && SpellSystem.hasActiveShield();

    const isHovered = window.actionBarState.hoverSlot === 'dash';
    const isReady = cooldown <= 0 && !isDashing;
    const isActive = isDashing || hasIframes || hasActiveShield;

    ctx.save();

    // === SLOT BACKGROUND ===
    const slotInfo = {
        state: isReady ? 'ready' : (isActive ? 'active' : 'cooldown'),
        cooldown: cooldown,
        maxCooldown: maxCooldown
    };
    drawSlotBackground(ctx, x, y, size, cfg, slotInfo, isHovered, colors, true);

    // === COOLDOWN SWEEP ===
    if (cooldown > 0) {
        drawCooldownSweep(ctx, x, y, size, cfg, cooldown, maxCooldown, colors);
    }

    // === SPELL ICON ===
    const iconDef = ABILITY_ICONS && ABILITY_ICONS[selectedSpellId];
    if (iconDef) {
        // Apply glow effect when active
        if (isActive) {
            ctx.shadowColor = spellColor;
            ctx.shadowBlur = 10;
        }

        // Dim icon during cooldown
        if (cooldown > 0) {
            ctx.globalAlpha = 0.5;
        }

        iconDef.draw(ctx, x, y, size, {
            isReady: isReady,
            isDisabled: false,
            isActive: isActive
        });

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    } else {
        // Fallback to text symbols
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const symbols = { dash: '>>', heal: '+', shield: '[]' };
        const symbol = symbols[selectedSpellId] || '>>';

        if (isActive) {
            ctx.shadowColor = spellColor;
            ctx.shadowBlur = 10;
            ctx.fillStyle = spellColor;
        } else if (isReady) {
            ctx.fillStyle = colors.textPrimary || '#ffffff';
        } else {
            ctx.fillStyle = colors.textMuted || '#666666';
        }

        ctx.font = `bold ${cfg.iconSize - 2}px monospace`;
        ctx.fillText(symbol, x + size / 2, y + size / 2);
        ctx.shadowBlur = 0;
    }

    // === HOTKEY BADGE ===
    drawHotkeyBadge(ctx, x, y, size, cfg, 'SPC', colors);

    // === COOLDOWN TEXT (with MM:SS for long cooldowns) ===
    if (cooldown > 0) {
        const cooldownText = formatSpellCooldown(cooldown);
        drawCooldownText(ctx, x, y, size, cooldown, colors, cooldownText);
    }

    // === SHIELD HP BAR (when shield is active) ===
    if (hasActiveShield && typeof SpellSystem !== 'undefined') {
        const shieldInfo = SpellSystem.getShieldInfo();
        if (shieldInfo) {
            const barY = y + size - 8;
            const barW = size - 8;
            const barH = 4;
            const barX = x + 4;
            const fillRatio = shieldInfo.amount / shieldInfo.maxAmount;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(barX, barY, barW, barH);

            // Shield remaining
            ctx.fillStyle = '#00aaff';
            ctx.fillRect(barX, barY, barW * fillRatio, barH);

            // Border
            ctx.strokeStyle = '#2196f3';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, barH);
        }
    }

    // === STAMINA AFFORDABILITY OVERLAY (for dash/spell slot) ===
    if (isReady && !canAffordSlotStamina('dash')) {
        drawStaminaInsufficientOverlay(ctx, x, y, size, cfg.cornerRadius);
    }

    // === READY GLOW ===
    if (isReady && !isHovered && canAffordSlotStamina('dash')) {
        drawReadyPulse(ctx, x, y, size, cfg, colors, spellColor);
    }

    ctx.restore();
}

/**
 * Format spell cooldown for display (MM:SS for long cooldowns)
 */
function formatSpellCooldown(seconds) {
    if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    return seconds.toFixed(1);
}

/**
 * Draw slot background with state-based styling - Gem Socket Style
 */
function drawSlotBackground(ctx, x, y, size, cfg, slotInfo, isHovered, colors, isDash = false) {
    const radius = cfg.cornerRadius;

    // Get design system colors
    const frameGold = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGold : '#b8860b';
    const frameGoldDark = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldDark : '#8b6914';

    // Determine border and glow colors based on state
    let borderColor = frameGoldDark;
    let bgColor = '#151310';
    let glowColor = null;
    let innerGlowColor = null;

    switch (slotInfo.state) {
        case 'ready':
            borderColor = isDash ? '#00ffff' : (colors.success || '#27ae60');
            glowColor = isDash ? 'rgba(0, 255, 255, 0.4)' : 'rgba(39, 174, 96, 0.4)';
            innerGlowColor = isDash ? 'rgba(0, 255, 255, 0.1)' : 'rgba(39, 174, 96, 0.1)';
            break;
        case 'active':
            borderColor = '#00ff00';
            glowColor = 'rgba(0, 255, 0, 0.5)';
            innerGlowColor = 'rgba(0, 255, 0, 0.2)';
            break;
        case 'cooldown':
        case 'gcd':
            borderColor = colors.warning || '#f39c12';
            break;
        case 'outOfAmmo':
        case 'outOfMana':
            borderColor = colors.danger || '#e74c3c';
            innerGlowColor = 'rgba(231, 76, 60, 0.1)';
            break;
        case 'outOfRange':
        case 'disabled':
            borderColor = '#3a3530';
            bgColor = '#0d0b0a';
            break;
        case 'locked':
            borderColor = '#3a3530';
            bgColor = '#0d0b0a';
            break;
    }

    // Hover effect
    if (isHovered && slotInfo.state !== 'disabled' && slotInfo.state !== 'locked') {
        bgColor = '#1f1c18';
        if (!glowColor) glowColor = 'rgba(184, 134, 11, 0.2)';
    }

    ctx.save();

    // === OUTER GLOW (ready/active states) ===
    if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = cfg.glowIntensity;
    }

    // === SOCKET BACKGROUND (inset stone look) ===
    // Outer beveled edge (dark)
    ctx.fillStyle = '#0a0908';
    drawRoundedRect(ctx, x, y, size, size, radius);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Inner stone surface with gradient
    const bgGrad = ctx.createLinearGradient(x, y, x, y + size);
    bgGrad.addColorStop(0, bgColor);
    bgGrad.addColorStop(0.4, '#1a1816');
    bgGrad.addColorStop(1, '#0d0b0a');
    ctx.fillStyle = bgGrad;
    drawRoundedRect(ctx, x + 2, y + 2, size - 4, size - 4, radius - 1);
    ctx.fill();

    // Inner glow for state feedback
    if (innerGlowColor) {
        const innerGlow = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size/2);
        innerGlow.addColorStop(0, innerGlowColor);
        innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = innerGlow;
        drawRoundedRect(ctx, x + 2, y + 2, size - 4, size - 4, radius - 1);
        ctx.fill();
    }

    // === GOLD FRAME BORDER ===
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = slotInfo.state === 'ready' || slotInfo.state === 'active' ? 2 : 1.5;
    drawRoundedRect(ctx, x, y, size, size, radius);
    ctx.stroke();

    // === CORNER ACCENTS (small gold triangles) ===
    if (slotInfo.state !== 'disabled' && slotInfo.state !== 'locked') {
        ctx.fillStyle = frameGoldDark;
        const cornerInset = 4;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x + cornerInset, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + cornerInset);
        ctx.closePath();
        ctx.fill();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + size - cornerInset, y);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x + size, y + cornerInset);
        ctx.closePath();
        ctx.fill();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x + cornerInset, y + size);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x, y + size - cornerInset);
        ctx.closePath();
        ctx.fill();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + size - cornerInset, y + size);
        ctx.lineTo(x + size, y + size);
        ctx.lineTo(x + size, y + size - cornerInset);
        ctx.closePath();
        ctx.fill();
    }

    // === TOP HIGHLIGHT (chisel edge) ===
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + radius + 2, y + 3);
    ctx.lineTo(x + size - radius - 2, y + 3);
    ctx.stroke();

    ctx.restore();
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
 * Draw slot icon with styling - uses ABILITY_ICONS for visual representation
 */
function drawSlotIconStyled(ctx, x, y, size, slotInfo, colors) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    // Determine if this is a potion slot and should use the icon
    const isPotion = slotInfo.icon === 'potion';
    const isEmpty = !slotInfo.name || slotInfo.name === 'Empty';
    const isDisabled = slotInfo.state === 'disabled';
    const isReady = slotInfo.state === 'ready';
    const isOnCooldown = slotInfo.state === 'cooldown' || slotInfo.state === 'gcd';

    // === USE ABILITY ICON FOR POTIONS ===
    if (isPotion && ABILITY_ICONS && ABILITY_ICONS.potion && !isEmpty) {
        // Determine potion color based on name/type
        let potionColor = null;
        const nameLower = (slotInfo.name || '').toLowerCase();

        if (nameLower.includes('health') || nameLower.includes('heal') || nameLower.includes('life')) {
            potionColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.health : '#a82828';
        } else if (nameLower.includes('mana') || nameLower.includes('magic')) {
            potionColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.mana : '#7a89c2';
        } else if (nameLower.includes('stamina') || nameLower.includes('energy')) {
            potionColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.stamina : '#5da182';
        } else if (nameLower.includes('poison') || nameLower.includes('antidote')) {
            potionColor = '#4a8b4a'; // Green
        } else if (nameLower.includes('fire') || nameLower.includes('flame')) {
            potionColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.elements?.fire : '#c47030';
        } else {
            // Default potion color (health)
            potionColor = typeof UI_COLORS !== 'undefined' ? UI_COLORS.health : '#a82828';
        }

        // Dim during cooldown
        if (isOnCooldown) {
            ctx.globalAlpha = 0.5;
        }

        // Add glow when ready
        if (isReady) {
            ctx.shadowColor = potionColor;
            ctx.shadowBlur = 6;
        }

        ABILITY_ICONS.potion.draw(ctx, x, y, size, {
            isReady: isReady,
            isDisabled: isDisabled,
            potionColor: potionColor,
            fillLevel: 0.75
        });

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        return;
    }

    // === FALLBACK TO TEXT ICONS ===
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Icon color based on state
    let iconColor = colors.textPrimary || '#ffffff';
    if (isDisabled) {
        iconColor = colors.textMuted || '#666666';
    } else if (slotInfo.state === 'outOfAmmo' || slotInfo.state === 'outOfMana') {
        iconColor = colors.danger || '#e74c3c';
    } else if (isOnCooldown) {
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
            // Empty slot fallback
            icon = isEmpty ? '---' : 'USE';
            break;
    }

    ctx.fillText(icon, centerX, centerY);
}

/**
 * Draw hotkey badge in corner - Gold Embossed Style
 */
function drawHotkeyBadge(ctx, x, y, size, cfg, keyText, colors) {
    // Get design system colors
    const frameGold = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGold : '#b8860b';
    const frameGoldBright = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldBright : '#daa520';
    const frameGoldDark = typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldDark : '#8b6914';

    const badgeH = cfg.hotkeySize + 4;
    const badgeW = badgeH + (keyText.length > 1 ? (keyText.length - 1) * 5 : 0);
    const badgeX = x + 2;
    const badgeY = y + 2;

    ctx.save();

    // Badge background (dark inset)
    ctx.fillStyle = '#0a0908';
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 2);
    ctx.fill();

    // Gold frame gradient
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
    badgeGrad.addColorStop(0, frameGoldBright);
    badgeGrad.addColorStop(0.5, frameGold);
    badgeGrad.addColorStop(1, frameGoldDark);
    ctx.strokeStyle = badgeGrad;
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 2);
    ctx.stroke();

    // Key text with shadow
    ctx.font = `bold ${cfg.hotkeySize - 1}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow
    ctx.fillStyle = frameGoldDark;
    ctx.fillText(keyText, badgeX + badgeW / 2 + 0.5, badgeY + badgeH / 2 + 0.5);

    // Main text
    ctx.fillStyle = frameGoldBright;
    ctx.fillText(keyText, badgeX + badgeW / 2, badgeY + badgeH / 2);

    ctx.restore();
}

/**
 * Draw cooldown remaining text
 */
function drawCooldownText(ctx, x, y, size, cooldown, colors, customText = null) {
    // Use custom text if provided, otherwise format the cooldown
    let cdText;
    if (customText) {
        cdText = customText;
    } else {
        cdText = cooldown >= 10
            ? Math.ceil(cooldown).toString()
            : cooldown.toFixed(1);
    }

    // For long cooldowns (>= 60s), don't add 's' suffix if already formatted as MM:SS
    const isLongCooldown = customText && customText.includes(':');
    const suffix = isLongCooldown ? '' : 's';

    ctx.save();

    // Larger, more visible text for long cooldowns
    if (isLongCooldown) {
        // Dark background for readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const textWidth = ctx.measureText(cdText).width + 8;
        ctx.fillRect(x + (size - textWidth) / 2 - 2, y + size / 2 - 10, textWidth + 4, 20);

        ctx.fillStyle = '#ff9800';  // Orange for long cooldowns
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cdText, x + size / 2, y + size / 2);
    } else {
        ctx.fillStyle = colors.warning || '#f39c12';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(cdText + suffix, x + size / 2, y + size - 4);
    }

    ctx.restore();
}

/**
 * Draw ready state pulse effect - Torch Flicker Glow Style
 */
function drawReadyPulse(ctx, x, y, size, cfg, colors, customColor = null) {
    // Get torch flicker for organic feel
    const flicker = typeof getTorchFlicker === 'function' ? getTorchFlicker() : (0.85 + Math.random() * 0.15);
    const pulsePhase = window.actionBarState.pulsePhase;
    const pulseAlpha = (0.15 + Math.sin(pulsePhase) * 0.1) * flicker;
    const pulseColor = customColor || (colors.success || '#27ae60');

    ctx.save();

    // Outer glow (soft)
    ctx.shadowColor = pulseColor;
    ctx.shadowBlur = 8 * flicker;
    ctx.strokeStyle = pulseColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulseAlpha;
    drawRoundedRect(ctx, x - 2, y - 2, size + 4, size + 4, cfg.cornerRadius + 2);
    ctx.stroke();

    // Inner subtle glow ring
    ctx.shadowBlur = 0;
    ctx.globalAlpha = pulseAlpha * 0.5;
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x - 4, y - 4, size + 8, size + 8, cfg.cornerRadius + 4);
    ctx.stroke();

    // Corner ember particles (occasional)
    if (Math.random() > 0.7) {
        ctx.globalAlpha = flicker * 0.6;
        ctx.fillStyle = pulseColor;
        const emberX = x + Math.random() * size;
        const emberY = y - 2 - Math.random() * 4;
        ctx.beginPath();
        ctx.arc(emberX, emberY, 1 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

// NOTE: Uses drawRoundedRect from ui-design-system.js

// ============================================================================
// SLOT INFO HELPERS
// ============================================================================

/**
 * Get slot information (state, cooldown, etc.)
 * Updated for new layout: hotkey 1 = Consumable (slot 3)
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

    // Hotkey 1 now maps to the single consumable slot (was slot3 in old layout)
    switch (hotkey) {
        case 1:
            return getConsumableInfo(player, 'slot1');
    }

    return info;
}

/**
 * Get consumable slot info with charges support
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
        canUse: false,
        charges: undefined,
        maxCharges: undefined
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
        info.charges = 0;
        return info;
    }

    info.name = item.name || 'Consumable';

    // Set charges from item count (stacks)
    if (item.count !== undefined) {
        info.charges = item.count;
        // Max charges could come from item definition or default
        info.maxCharges = item.maxStack || item.maxCount || 99;
    }

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
 * Layout: [Dash/SPC] [Spell1/1] [Spell2/2] [Spell3/3] [Spell4/4] [Consumable/5]
 */
function handleActionBarMouseMove(e) {
    if (!canvas || game.state !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cfg = ACTION_BAR_CONFIG;
    const numSlots = 6;
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
    // Layout: [Dash] [Spell0] [Spell1] [Spell2] [Spell3] [Consumable]
    let hoveredSlot = null;
    for (let i = 0; i < numSlots; i++) {
        const slotX = barX + 10 + (i * (cfg.slotSize + cfg.slotSpacing));
        const slotY = barY + 10;

        if (mouseX >= slotX && mouseX <= slotX + cfg.slotSize &&
            mouseY >= slotY && mouseY <= slotY + cfg.slotSize) {
            if (i === 0) {
                hoveredSlot = 'dash';
            } else if (i >= 1 && i <= 4) {
                hoveredSlot = `spell${i - 1}`;
            } else {
                hoveredSlot = 'slot1'; // Consumable
            }
            break;
        }
    }

    window.actionBarState.hoverSlot = hoveredSlot;
}

/**
 * Initialize action bar click detection
 * Layout: [Dash/SPC] [Spell1/1] [Spell2/2] [Spell3/3] [Spell4/4] [Consumable/5]
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
        const numSlots = 6;
        const barWidth = (cfg.slotSize * numSlots) + (cfg.slotSpacing * (numSlots - 1)) + 20;
        const barHeight = cfg.slotSize + 20;
        const barX = canvas.width - barWidth - cfg.barPadding;
        const barY = canvas.height - barHeight - cfg.barPadding;

        // Check each slot: [Dash] [Spell0..3] [Consumable]
        for (let i = 0; i < numSlots; i++) {
            const slotX = barX + 10 + (i * (cfg.slotSize + cfg.slotSpacing));
            const slotY = barY + 10;

            if (clickX >= slotX && clickX <= slotX + cfg.slotSize &&
                clickY >= slotY && clickY <= slotY + cfg.slotSize) {

                if (i === 0) {
                    // Dash slot (spacebar)
                    if (typeof SpellSystem !== 'undefined' && SpellSystem.initialized) {
                        SpellSystem.tryActivate(game.player);
                    } else if (typeof performDash === 'function') {
                        performDash();
                    }
                } else if (i >= 1 && i <= 4) {
                    // Spell slots (1-4)
                    const spellSlotIndex = i - 1;
                    if (typeof SpellSystem !== 'undefined' && SpellSystem.initialized) {
                        SpellSystem.castSlot(spellSlotIndex);
                    }
                } else {
                    // Consumable (5)
                    if (typeof handleActiveCombatHotkey === 'function') {
                        handleActiveCombatHotkey(1, game.player);
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
    window.drawSpellSlot = drawSpellSlot;
    window.ACTION_BAR_CONFIG = ACTION_BAR_CONFIG;
    window.setSlotAction = setSlotAction;
    window.getSlotStaminaCost = getSlotStaminaCost;
    window.canAffordSlotStamina = canAffordSlotStamina;
}

// Action bar UI loaded
