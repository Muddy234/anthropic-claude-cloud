// === js/ui/skills-ui.js ===
// Skills Menu Screen (Press K) and Action Bar HUD - CotDG Style
// Displays proficiencies, specialties, actions, and cooldowns

// ============================================================================
// CONFIGURATION
// ============================================================================

const SKILLS_UI_CONFIG = {
    // Action icons - Text-based for CotDG style (no emojis)
    actionIcons: {
        blade_dancer: 'BD',
        arterial_strike: 'AS',
        cleaving_blow: 'CB',
        impaling_thrust: 'IT',
        skull_crack: 'SC',
        sweeping_arc: 'SA',
        flurry_of_blows: 'FB',
        shield_charge: 'SH',
        immolate: 'IM',
        frozen_grasp: 'FG',
        chain_lightning: 'CL',
        life_siphon: 'LS',
        power_shot: 'PS',
        piercing_bolt: 'PB',
        fan_of_knives: 'FK',
        spike_trap: 'ST',
        volatile_flask: 'VF',
        expose_weakness: 'EW',
        deploy_turret: 'DT'
    },

    // Proficiency icons - Letter based
    proficiencyIcons: {
        blade: 'B',
        blunt: 'H',
        magic: 'M',
        ranged: 'R',
        expertise: 'E'
    }
};

// Animation state for action bar
window.skillsBarState = {
    pulsePhase: 0,
    hoveredSlot: null
};

// ============================================================================
// SKILLS ACTION BAR HUD (During Gameplay) - CotDG Style
// ============================================================================

/**
 * Draw the skills action bar - CotDG style
 * Positioned above the consumable action bar
 */
function drawActionBar() {
    const player = game.player;
    if (!player || !player.skills) return;
    if (game.state !== 'playing') return;

    // Get colors from design system
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0a0a0f',
        bgDark: '#12121a',
        bgMedium: '#1a1a24',
        border: '#3a3a4a',
        borderLight: '#4a4a5a',
        health: '#c0392b',
        mana: '#2980b9',
        gold: '#d4af37',
        success: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c',
        textPrimary: '#ffffff',
        textMuted: '#666666',
        corruption: '#8e44ad'
    };

    // Update animation
    window.skillsBarState.pulsePhase = (window.skillsBarState.pulsePhase + 0.05) % (Math.PI * 2);

    // Collect actions to display
    const actionsToShow = [];

    // Slot 5: Weapon action
    const weaponAction = getPlayerWeaponAction(player);
    if (weaponAction) {
        actionsToShow.push({
            slot: 5,
            action: weaponAction.action,
            specialty: weaponAction.specialty,
            available: weaponAction.available
        });
    }

    // Slots 6-9: Expertise actions (only if unlocked)
    const expertiseSlots = [
        { slot: 6, specId: 'traps', actionId: 'spike_trap' },
        { slot: 7, specId: 'potions', actionId: 'volatile_flask' },
        { slot: 8, specId: 'lockpicking', actionId: 'expose_weakness' },
        { slot: 9, specId: 'tinkering', actionId: 'deploy_turret' }
    ];

    for (const es of expertiseSlots) {
        const specData = player.skills.specialties[es.specId];
        if (specData && specData.unlocked && specData.level >= 5) {
            const action = typeof ACTIONS !== 'undefined' ? ACTIONS[es.actionId] : null;
            if (action) {
                actionsToShow.push({
                    slot: es.slot,
                    action: action,
                    specialty: es.specId,
                    available: true
                });
            }
        }
    }

    if (actionsToShow.length === 0) return; // Don't show empty bar

    // Calculate position - above the consumable action bar
    const slotSize = 52;
    const slotSpacing = 8;
    const padding = 20;
    const barWidth = (slotSize * actionsToShow.length) + (slotSpacing * (actionsToShow.length - 1)) + 20;
    const barHeight = slotSize + 20;

    // Position above consumable bar (consumable bar height ~76px + padding)
    const barX = canvas.width - barWidth - padding;
    const barY = canvas.height - barHeight - padding - 90; // Above consumable bar

    ctx.save();

    // === BAR BACKGROUND ===
    drawSkillsBarBackground(ctx, barX, barY, barWidth, barHeight, colors);

    // === ACTION SLOTS ===
    for (let i = 0; i < actionsToShow.length; i++) {
        const slotX = barX + 10 + (i * (slotSize + slotSpacing));
        const slotY = barY + 10;
        drawSkillActionSlot(ctx, actionsToShow[i], slotX, slotY, slotSize, player.skills.actionCooldowns, colors);
    }

    ctx.restore();
}

/**
 * Draw skills bar background panel
 */
function drawSkillsBarBackground(ctx, x, y, width, height, colors) {
    const radius = 6;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
    bgGrad.addColorStop(0, colors.bgDark || '#12121a');
    bgGrad.addColorStop(1, colors.bgDarkest || '#0a0a0f');

    ctx.fillStyle = bgGrad;
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
    ctx.fill();

    // Border
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + radius, y + 1);
    ctx.lineTo(x + width - radius, y + 1);
    ctx.stroke();
}

/**
 * Draw a single skill action slot - CotDG style
 */
function drawSkillActionSlot(ctx, actionData, x, y, size, cooldowns, colors) {
    const action = actionData.action;
    const cooldown = cooldowns[action.id] || 0;
    const maxCooldown = action.cooldown || 10;
    const isReady = cooldown <= 0;
    const isAvailable = actionData.available;
    const radius = 6;

    ctx.save();

    // === SLOT BACKGROUND ===
    let borderColor = colors.border || '#3a3a4a';
    let bgColor = colors.bgMedium || '#1a1a24';
    let glowColor = null;

    if (!isAvailable) {
        borderColor = colors.textMuted || '#444444';
        bgColor = 'rgba(30, 30, 30, 0.5)';
    } else if (isReady) {
        borderColor = colors.corruption || '#8e44ad';
        glowColor = 'rgba(142, 68, 173, 0.4)';
    } else {
        borderColor = colors.warning || '#f39c12';
    }

    // Glow for ready state
    if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
    }

    // Background
    const bgGrad = ctx.createLinearGradient(x, y, x, y + size);
    bgGrad.addColorStop(0, bgColor);
    bgGrad.addColorStop(1, colors.bgDarkest || '#0a0a0f');

    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + size - radius, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
    ctx.lineTo(x + size, y + size - radius);
    ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
    ctx.lineTo(x + radius, y + size);
    ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isReady && isAvailable ? 2 : 1;
    ctx.stroke();

    // === COOLDOWN SWEEP ===
    if (!isReady && isAvailable) {
        drawSkillCooldownSweep(ctx, x, y, size, radius, cooldown, maxCooldown, colors);
    }

    // === HOTKEY BADGE ===
    const badgeSize = 14;
    const badgeX = x + 3;
    const badgeY = y + 3;

    ctx.fillStyle = colors.bgDarkest || '#0a0a0f';
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2 + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colors.corruption || '#8e44ad';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = colors.corruption || '#8e44ad';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(actionData.slot.toString(), badgeX + badgeSize / 2, badgeY + badgeSize / 2);

    // === ACTION ICON ===
    const iconText = SKILLS_UI_CONFIG.actionIcons[action.id] || '??';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!isAvailable) {
        ctx.fillStyle = colors.textMuted || '#444444';
    } else if (isReady) {
        ctx.fillStyle = colors.textPrimary || '#ffffff';
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    }

    ctx.font = 'bold 18px monospace';
    ctx.fillText(iconText, x + size / 2, y + size / 2);

    // === STATUS TEXT ===
    ctx.font = '9px monospace';
    ctx.textBaseline = 'bottom';

    if (!isAvailable) {
        ctx.fillStyle = colors.textMuted || '#444444';
        ctx.fillText('LOCK', x + size / 2, y + size - 3);
    } else if (isReady) {
        // Pulsing READY text
        const pulse = Math.sin(window.skillsBarState.pulsePhase) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(142, 68, 173, ${pulse})`;
        ctx.fillText('READY', x + size / 2, y + size - 3);
    } else {
        ctx.fillStyle = colors.warning || '#f39c12';
        ctx.fillText(cooldown.toFixed(1) + 's', x + size / 2, y + size - 3);
    }

    // === READY PULSE ===
    if (isReady && isAvailable) {
        const pulseAlpha = 0.15 + Math.sin(window.skillsBarState.pulsePhase) * 0.1;
        ctx.strokeStyle = colors.corruption || '#8e44ad';
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulseAlpha;
        ctx.beginPath();
        ctx.moveTo(x + radius - 2, y - 2);
        ctx.lineTo(x + size - radius + 2, y - 2);
        ctx.quadraticCurveTo(x + size + 2, y - 2, x + size + 2, y + radius - 2);
        ctx.lineTo(x + size + 2, y + size - radius + 2);
        ctx.quadraticCurveTo(x + size + 2, y + size + 2, x + size - radius + 2, y + size + 2);
        ctx.lineTo(x + radius - 2, y + size + 2);
        ctx.quadraticCurveTo(x - 2, y + size + 2, x - 2, y + size - radius + 2);
        ctx.lineTo(x - 2, y + radius - 2);
        ctx.quadraticCurveTo(x - 2, y - 2, x + radius - 2, y - 2);
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

/**
 * Draw cooldown sweep for skill slot
 */
function drawSkillCooldownSweep(ctx, x, y, size, radius, remaining, max, colors) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const sweepRadius = size / 2 - 2;

    const progress = 1 - Math.max(0, Math.min(1, remaining / max));

    ctx.save();

    // Create clipping path for rounded rect
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + size - radius, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
    ctx.lineTo(x + size, y + size - radius);
    ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
    ctx.lineTo(x + radius, y + size);
    ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();

    // Dark overlay for cooldown
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#000000';

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (progress * Math.PI * 2);
    ctx.arc(centerX, centerY, sweepRadius + 10, endAngle, startAngle + Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // Sweep edge
    if (progress > 0 && progress < 1) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = colors.warning || '#f39c12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(endAngle) * sweepRadius,
            centerY + Math.sin(endAngle) * sweepRadius
        );
        ctx.stroke();
    }

    ctx.restore();
}

// ============================================================================
// SKILLS MENU OVERLAY (Press K) - CotDG Style
// ============================================================================

/**
 * Draw the full skills menu overlay - CotDG style
 */
function drawSkillsOverlay() {
    const player = game.player;
    if (!player || !player.skills) {
        drawSkillsPlaceholder();
        return;
    }

    // Get colors from design system
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0a0a0f',
        bgDark: '#12121a',
        bgMedium: '#1a1a24',
        border: '#3a3a4a',
        health: '#c0392b',
        mana: '#2980b9',
        gold: '#d4af37',
        xp: '#5dade2',
        corruption: '#8e44ad',
        success: '#27ae60',
        textPrimary: '#ffffff',
        textSecondary: '#b0b0b0',
        textMuted: '#666666'
    };

    // Background vignette
    const vignetteGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.height
    );
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    // Panel dimensions
    const viewWidth = canvas.width - TRACKER_WIDTH;
    const panelWidth = Math.min(700, viewWidth - 80);
    const panelHeight = Math.min(650, canvas.height - 80);
    const panelX = TRACKER_WIDTH + (viewWidth - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;

    // Use shared panel drawing
    if (typeof drawOverlayPanel === 'function') {
        drawOverlayPanel(ctx, panelX, panelY, panelWidth, panelHeight, colors);
    } else {
        // Fallback panel
        ctx.fillStyle = colors.bgDark;
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    }

    let yOffset = panelY + 30;
    const contentX = panelX + 30;
    const contentWidth = panelWidth - 60;

    // Title
    ctx.fillStyle = colors.corruption || '#8e44ad';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SKILLS & ABILITIES', panelX + panelWidth / 2, yOffset);
    yOffset += 15;

    // Decorative line
    if (typeof drawDecorativeLine === 'function') {
        drawDecorativeLine(ctx, panelX + 80, yOffset, panelWidth - 160, colors);
    }
    yOffset += 25;

    // Equipped weapon info
    const weapon = player.equipped?.MAIN;
    const weaponName = weapon ? weapon.name : 'Unarmed';
    const specialty = weapon?.specialty || 'unarmed';

    ctx.fillStyle = colors.textSecondary || '#b0b0b0';
    ctx.font = '14px monospace';
    ctx.fillText(`Equipped: ${weaponName} (${specialty})`, panelX + panelWidth / 2, yOffset);
    yOffset += 35;

    // Draw proficiencies
    const proficiencyOrder = ['blade', 'blunt', 'magic', 'ranged', 'expertise'];

    for (const profId of proficiencyOrder) {
        const profData = player.skills.proficiencies[profId];
        if (!profData) continue;

        yOffset = drawProficiencySection(
            ctx,
            profId,
            profData,
            player.skills.specialties,
            player.skills.actionCooldowns,
            contentX,
            yOffset,
            contentWidth,
            colors
        );

        yOffset += 12;
    }

    // Footer instructions
    ctx.fillStyle = colors.textMuted || '#666666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ESC/K] Close  |  Use weapons to level up skills', panelX + panelWidth / 2, panelY + panelHeight - 20);
}

/**
 * Draw a proficiency section - CotDG style
 */
function drawProficiencySection(ctx, profId, profData, specialties, cooldowns, x, y, width, colors) {
    const icon = SKILLS_UI_CONFIG.proficiencyIcons[profId] || '?';
    const profName = profId.charAt(0).toUpperCase() + profId.slice(1);

    // Proficiency header background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x - 5, y - 15, width + 10, 22);

    // Icon circle
    ctx.fillStyle = colors.corruption || '#8e44ad';
    ctx.beginPath();
    ctx.arc(x + 10, y - 4, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x + 10, y - 4);

    // Proficiency name and level
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(profName.toUpperCase(), x + 28, y);

    ctx.fillStyle = colors.corruption || '#8e44ad';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Lv ${profData.level}`, x + 130, y);

    // XP bar
    const barX = x + 180;
    const barWidth = width - 230;
    drawSkillXPBar(ctx, barX, y - 10, barWidth, 12, profData.xp, profData.xpToNext, colors);

    // XP text
    ctx.fillStyle = colors.textMuted || '#666666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${profData.xp}/${profData.xpToNext}`, x + width, y);

    let currentY = y + 22;
    ctx.textAlign = 'left';

    // Get specialties for this proficiency
    const profSpecialties = getSpecialtiesForProficiency(profId);
    let hasUnlockedSpecialty = false;

    for (const specId of profSpecialties) {
        const specData = specialties[specId];

        if (!specData || !specData.unlocked) continue;

        hasUnlockedSpecialty = true;
        currentY = drawSpecialtyRow(ctx, specId, specData, cooldowns, x + 15, currentY, width - 30, colors);
    }

    if (!hasUnlockedSpecialty) {
        ctx.fillStyle = colors.textMuted || '#666666';
        ctx.font = 'italic 12px monospace';
        ctx.fillText('  (Use weapons to unlock specialties)', x + 15, currentY);
        currentY += 18;
    }

    return currentY;
}

/**
 * Draw a specialty row - CotDG style
 */
function drawSpecialtyRow(ctx, specId, specData, cooldowns, x, y, width, colors) {
    const specName = specId.charAt(0).toUpperCase() + specId.slice(1);

    // Tree connector
    ctx.fillStyle = colors.border || '#3a3a4a';
    ctx.font = '12px monospace';
    ctx.fillText('|-', x, y);

    // Specialty name
    ctx.fillStyle = colors.textSecondary || '#b0b0b0';
    ctx.font = '14px monospace';
    ctx.fillText(specName, x + 20, y);

    // Level
    ctx.fillStyle = colors.corruption || '#8e44ad';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Lv ${specData.level}`, x + 100, y);

    // Mini XP bar
    const barX = x + 150;
    const barWidth = 100;
    drawSkillXPBar(ctx, barX, y - 8, barWidth, 8, specData.xp, specData.xpToNext, colors);

    // Action info
    const actionX = x + 280;

    if (specData.level >= 5) {
        const action = getActionForSpecialtyById(specId);
        if (action) {
            const iconText = SKILLS_UI_CONFIG.actionIcons[action.id] || '??';
            const cooldown = cooldowns[action.id] || 0;
            const isReady = cooldown <= 0;

            ctx.fillStyle = isReady ? (colors.success || '#27ae60') : (colors.warning || '#f39c12');
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`[${iconText}] ${action.name}`, actionX, y);

            // Status
            ctx.font = '10px monospace';
            if (isReady) {
                ctx.fillText('RDY', actionX + 150, y);
            } else {
                ctx.fillText(`${cooldown.toFixed(1)}s`, actionX + 150, y);
            }
        }
    } else {
        ctx.fillStyle = colors.textMuted || '#666666';
        ctx.font = 'italic 11px monospace';
        ctx.fillText('(Lv 5 to unlock)', actionX, y);
    }

    return y + 20;
}

/**
 * Draw XP bar - CotDG style
 */
function drawSkillXPBar(ctx, x, y, width, height, current, max, colors) {
    const pct = Math.min(1, Math.max(0, current / max));

    // Background
    ctx.fillStyle = colors.bgDarkest || '#0a0a0f';
    ctx.fillRect(x, y, width, height);

    // Fill gradient
    if (pct > 0) {
        const fillGrad = ctx.createLinearGradient(x, y, x + width * pct, y);
        fillGrad.addColorStop(0, colors.corruption || '#8e44ad');
        fillGrad.addColorStop(1, colors.bgMedium || '#1a1a24');
        ctx.fillStyle = fillGrad;
        ctx.fillRect(x, y, width * pct, height);
    }

    // Border
    ctx.strokeStyle = colors.border || '#3a3a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
}

/**
 * Placeholder when skills not initialized
 */
function drawSkillsPlaceholder() {
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDark: '#12121a',
        corruption: '#8e44ad',
        textPrimary: '#ffffff',
        textMuted: '#666666'
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    const cx = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH) / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = colors.corruption;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SKILLS', cx, cy - 30);

    ctx.fillStyle = colors.textPrimary;
    ctx.font = '18px monospace';
    ctx.fillText('Skills system loading...', cx, cy + 20);

    ctx.fillStyle = colors.textMuted;
    ctx.font = '14px monospace';
    ctx.fillText('[ESC] Back', cx, cy + 60);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSpecialtiesForProficiency(profId) {
    const mapping = {
        blade: ['sword', 'knife', 'axe', 'polearm'],
        blunt: ['mace', 'staff', 'unarmed', 'shield'],
        magic: ['fire', 'ice', 'lightning', 'necromancy'],
        ranged: ['bow', 'crossbow', 'throwing'],
        expertise: ['traps', 'potions', 'lockpicking', 'tinkering']
    };
    return mapping[profId] || [];
}

function getActionForSpecialtyById(specialtyId) {
    if (typeof ACTIONS !== 'undefined') {
        for (const actionId in ACTIONS) {
            if (ACTIONS[actionId].specialty === specialtyId) {
                return ACTIONS[actionId];
            }
        }
    }

    const actionMap = {
        sword: { id: 'blade_dancer', name: 'Blade Dancer', cooldown: 10 },
        knife: { id: 'arterial_strike', name: 'Arterial Strike', cooldown: 10 },
        axe: { id: 'cleaving_blow', name: 'Cleaving Blow', cooldown: 10 },
        polearm: { id: 'impaling_thrust', name: 'Impaling Thrust', cooldown: 10 },
        mace: { id: 'skull_crack', name: 'Skull Crack', cooldown: 10 },
        staff: { id: 'sweeping_arc', name: 'Sweeping Arc', cooldown: 10 },
        unarmed: { id: 'flurry_of_blows', name: 'Flurry of Blows', cooldown: 10 },
        shield: { id: 'shield_charge', name: 'Shield Charge', cooldown: 10 },
        fire: { id: 'immolate', name: 'Immolate', cooldown: 10 },
        ice: { id: 'frozen_grasp', name: 'Frozen Grasp', cooldown: 10 },
        lightning: { id: 'chain_lightning', name: 'Chain Lightning', cooldown: 10 },
        necromancy: { id: 'life_siphon', name: 'Life Siphon', cooldown: 10 },
        bow: { id: 'power_shot', name: 'Power Shot', cooldown: 10 },
        crossbow: { id: 'piercing_bolt', name: 'Piercing Bolt', cooldown: 10 },
        throwing: { id: 'fan_of_knives', name: 'Fan of Knives', cooldown: 10 },
        traps: { id: 'spike_trap', name: 'Spike Trap', cooldown: 10 },
        potions: { id: 'volatile_flask', name: 'Volatile Flask', cooldown: 10 },
        lockpicking: { id: 'expose_weakness', name: 'Expose Weakness', cooldown: 10 },
        tinkering: { id: 'deploy_turret', name: 'Deploy Turret', cooldown: 10 }
    };

    return actionMap[specialtyId] || null;
}

function getPlayerWeaponAction(player) {
    const weapon = player.equipped?.MAIN;
    const specialty = weapon?.specialty || 'unarmed';

    const specData = player.skills.specialties[specialty];
    if (!specData) {
        const unarmedSpec = player.skills.specialties['unarmed'];
        if (unarmedSpec && unarmedSpec.level >= 5) {
            return {
                action: typeof ACTIONS !== 'undefined' ? ACTIONS['flurry_of_blows'] : { id: 'flurry_of_blows', name: 'Flurry of Blows', cooldown: 10 },
                specialty: 'unarmed',
                available: true
            };
        }
        return {
            action: { id: 'flurry_of_blows', name: 'Flurry of Blows', cooldown: 10 },
            specialty: 'unarmed',
            available: false
        };
    }

    const action = getActionForSpecialtyById(specialty);
    if (!action) return null;

    return {
        action: action,
        specialty: specialty,
        available: specData.level >= 5
    };
}

// ============================================================================
// TOOLTIP SYSTEM (simplified)
// ============================================================================

const actionTooltip = { visible: false, action: null, x: 0, y: 0 };

function showActionTooltip(action, x, y) {
    actionTooltip.visible = true;
    actionTooltip.action = action;
    actionTooltip.x = x;
    actionTooltip.y = y;
}

function hideActionTooltip() {
    actionTooltip.visible = false;
}

function renderActionTooltip(ctx) {
    if (!actionTooltip.visible || !actionTooltip.action) return;
    // Tooltip rendering would go here - simplified for now
}

// ============================================================================
// INTEGRATION
// ============================================================================

function renderSkillsUI() {
    if (game.state === 'playing') {
        drawActionBar();
    }
    renderActionTooltip(ctx);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.drawSkillsOverlay = drawSkillsOverlay;
window.drawActionBar = drawActionBar;
window.renderSkillsUI = renderSkillsUI;
window.showActionTooltip = showActionTooltip;
window.hideActionTooltip = hideActionTooltip;
window.actionTooltip = actionTooltip;
window.SKILLS_UI_CONFIG = SKILLS_UI_CONFIG;

console.log('Skills UI loaded (CotDG style)');
