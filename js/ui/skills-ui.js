// === js/ui/skills-ui.js ===
// Skills Menu Screen (Press 3) and Action Bar HUD
// Displays proficiencies, specialties, actions, and cooldowns

// ============================================================================
// CONFIGURATION
// ============================================================================

const SKILLS_UI_CONFIG = {
    // Colors
    colors: {
        background: 'rgba(0, 0, 0, 0.92)',
        panelBg: '#1a1a1a',
        border: '#e74c3c',
        borderSecondary: '#666',
        title: '#e74c3c',
        text: '#ffffff',
        textDim: '#888888',
        textMuted: '#555555',
        xpBar: '#e74c3c',
        xpBarBg: '#333333',
        locked: '#444444',
        unlocked: '#2ecc71',
        ready: '#2ecc71',
        cooldown: '#e74c3c',
        highlight: 'rgba(231, 76, 60, 0.3)'
    },
    
    // Proficiency icons (emoji fallbacks)
    proficiencyIcons: {
        blade: '⚔️',
        blunt: '🔨',
        magic: '✨',
        ranged: '🏹',
        expertise: '🔧'
    },
    
    // Specialty icons
    specialtyIcons: {
        // Blade
        sword: '🗡️',
        knife: '🔪',
        axe: '🪓',
        polearm: '🔱',
        // Blunt
        mace: '🔨',
        staff: '🪄',
        unarmed: '👊',
        shield: '🛡️',
        // Magic
        fire: '🔥',
        ice: '❄️',
        lightning: '⚡',
        necromancy: '💀',
        // Ranged
        bow: '🏹',
        crossbow: '🎯',
        throwing: '🗡️',
        // Expertise
        traps: '🪤',
        potions: '🧪',
        lockpicking: '🔓',
        tinkering: '⚙️'
    },
    
    // Action icons (can be overridden)
    actionIcons: {
        blade_dancer: '🗡️',
        arterial_strike: '🩸',
        cleaving_blow: '🪓',
        impaling_thrust: '🔱',
        skull_crack: '💥',
        sweeping_arc: '🌀',
        flurry_of_blows: '👊',
        shield_charge: '🛡️',
        immolate: '🔥',
        frozen_grasp: '❄️',
        chain_lightning: '⚡',
        life_siphon: '💀',
        power_shot: '🏹',
        piercing_bolt: '🎯',
        fan_of_knives: '🗡️',
        spike_trap: '🪤',
        volatile_flask: '🧪',
        expose_weakness: '👁️',
        deploy_turret: '🤖'
    }
};

// ============================================================================
// SKILLS MENU SCREEN (Press 3)
// ============================================================================

/**
 * Draw the full skills menu overlay
 * Replaces the placeholder drawSkillsOverlay
 */
function drawSkillsOverlay() {
    const player = game.player;
    if (!player || !player.skills) {
        drawSkillsPlaceholder();
        return;
    }
    
    const cfg = SKILLS_UI_CONFIG.colors;
    
    // Background overlay
    ctx.fillStyle = cfg.background;
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);
    
    // Calculate panel dimensions
    const viewWidth = canvas.width - TRACKER_WIDTH;
    const panelWidth = Math.min(900, viewWidth - 80);
    const panelHeight = Math.min(750, canvas.height - 80);
    const panelX = TRACKER_WIDTH + (viewWidth - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    
    // Panel background
    ctx.fillStyle = cfg.panelBg;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // Panel border
    ctx.strokeStyle = cfg.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Title
    ctx.fillStyle = cfg.title;
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SKILLS', panelX + panelWidth / 2, panelY + 50);
    
    // Subtitle with equipped weapon info
    const weapon = player.equipped?.MAIN;
    const weaponName = weapon ? weapon.name : 'Unarmed';
    const specialty = weapon?.specialty || 'unarmed';
    ctx.fillStyle = cfg.textDim;
    ctx.font = '16px monospace';
    ctx.fillText(`Currently Using: ${weaponName} (${specialty})`, panelX + panelWidth / 2, panelY + 75);
    
    // Draw proficiencies
    let yOffset = panelY + 110;
    const contentX = panelX + 30;
    const contentWidth = panelWidth - 60;
    
    // Get proficiency names
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
            contentWidth
        );
        
        yOffset += 15; // Gap between proficiencies
    }
    
    // Instructions
    ctx.fillStyle = cfg.textDim;
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ESC] Back  |  [↑/↓] Scroll  |  Hover for Details', panelX + panelWidth / 2, panelY + panelHeight - 20);
}

/**
 * Draw a single proficiency section with its specialties
 */
function drawProficiencySection(ctx, profId, profData, specialties, cooldowns, x, y, width) {
    const cfg = SKILLS_UI_CONFIG.colors;
    const icon = SKILLS_UI_CONFIG.proficiencyIcons[profId] || '❓';
    
    // Proficiency header
    ctx.fillStyle = cfg.text;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    
    const profName = profId.charAt(0).toUpperCase() + profId.slice(1);
    ctx.fillText(`${icon} ${profName.toUpperCase()}`, x, y);
    
    // Level badge
    ctx.fillStyle = cfg.title;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`Lv ${profData.level}`, x + 200, y);
    
    // XP bar for proficiency
    const barX = x + 260;
    const barWidth = width - 280;
    const barHeight = 14;
    const barY = y - 12;
    
    drawXPBar(ctx, barX, barY, barWidth, barHeight, profData.xp, profData.xpToNext, cfg.xpBar);
    
    // XP text
    ctx.fillStyle = cfg.textDim;
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${profData.xp}/${profData.xpToNext} XP`, x + width, y);
    
    let currentY = y + 28;
    
    // Get specialties for this proficiency
    const profSpecialties = getSpecialtiesForProficiency(profId);
    let hasUnlockedSpecialty = false;
    
    for (const specId of profSpecialties) {
        const specData = specialties[specId];
        
        if (!specData || !specData.unlocked) {
            // Show locked specialty (dimmed)
            continue;
        }
        
        hasUnlockedSpecialty = true;
        currentY = drawSpecialtyRow(ctx, specId, specData, cooldowns, x + 20, currentY, width - 40);
    }
    
    // Show message if no specialties unlocked
    if (!hasUnlockedSpecialty) {
        ctx.fillStyle = cfg.textMuted;
        ctx.font = 'italic 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('└─ (Use weapons in this category to unlock specialties)', x + 20, currentY);
        currentY += 22;
    }
    
    return currentY;
}

/**
 * Draw a single specialty row with action info
 */
function drawSpecialtyRow(ctx, specId, specData, cooldowns, x, y, width) {
    const cfg = SKILLS_UI_CONFIG.colors;
    const icon = SKILLS_UI_CONFIG.specialtyIcons[specId] || '•';
    
    // Tree connector
    ctx.fillStyle = cfg.textMuted;
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('├─', x, y);
    
    // Specialty icon and name
    const specName = specId.charAt(0).toUpperCase() + specId.slice(1);
    ctx.fillStyle = cfg.text;
    ctx.font = '18px monospace';
    ctx.fillText(`${icon} ${specName}`, x + 30, y);
    
    // Level
    ctx.fillStyle = cfg.title;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`Lv ${specData.level}`, x + 150, y);
    
    // XP bar
    const barX = x + 210;
    const barWidth = 150;
    drawXPBar(ctx, barX, y - 10, barWidth, 12, specData.xp, specData.xpToNext, cfg.xpBar);
    
    // XP text
    ctx.fillStyle = cfg.textDim;
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${specData.xp}/${specData.xpToNext}`, barX + barWidth + 5, y);
    
    // Action info
    const actionX = x + 450;
    ctx.textAlign = 'left';
    
    if (specData.level >= 5) {
        // Action unlocked
        const action = getActionForSpecialtyById(specId);
        if (action) {
            const actionIcon = SKILLS_UI_CONFIG.actionIcons[action.id] || '⚡';
            
            // Check cooldown
            const cooldown = cooldowns[action.id] || 0;
            const isReady = cooldown <= 0;
            
            ctx.fillStyle = isReady ? cfg.unlocked : cfg.cooldown;
            ctx.font = '14px monospace';
            ctx.fillText(`${actionIcon} ${action.name}`, actionX, y);
            
            // Cooldown or READY indicator
            ctx.font = '12px monospace';
            if (isReady) {
                ctx.fillStyle = cfg.ready;
                ctx.fillText('READY', actionX + 150, y);
            } else {
                ctx.fillStyle = cfg.cooldown;
                ctx.fillText(`${cooldown.toFixed(1)}s`, actionX + 150, y);
            }
        }
    } else {
        // Action locked
        ctx.fillStyle = cfg.textMuted;
        ctx.font = 'italic 14px monospace';
        ctx.fillText(`(Action unlocks at Lv 5)`, actionX, y);
    }
    
    return y + 26;
}

/**
 * Draw an XP progress bar
 */
function drawXPBar(ctx, x, y, width, height, current, max, color) {
    const cfg = SKILLS_UI_CONFIG.colors;
    const pct = Math.min(1, Math.max(0, current / max));
    
    // Background
    ctx.fillStyle = cfg.xpBarBg;
    ctx.fillRect(x, y, width, height);
    
    // Fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * pct, height);
    
    // Border
    ctx.strokeStyle = cfg.borderSecondary;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
}

/**
 * Placeholder when skills not initialized
 */
function drawSkillsPlaceholder() {
    const cfg = SKILLS_UI_CONFIG.colors;
    
    ctx.fillStyle = cfg.background;
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);
    
    const cx = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH) / 2;
    const cy = canvas.height / 2;
    
    ctx.fillStyle = cfg.title;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SKILLS', cx, cy - 50);
    
    ctx.fillStyle = cfg.text;
    ctx.font = '24px monospace';
    ctx.fillText('Skills system initializing...', cx, cy + 20);
    
    ctx.fillStyle = cfg.textDim;
    ctx.font = '18px monospace';
    ctx.fillText('[ESC] Back', cx, cy + 80);
}

// ============================================================================
// ACTION BAR HUD (During Gameplay)
// ============================================================================

/**
 * Draw the action bar HUD in bottom right
 * Call this from the main render loop during 'playing' state
 */
function drawActionBar() {
    const player = game.player;
    if (!player || !player.skills) return;
    if (game.state !== 'playing') return;
    
    const cfg = SKILLS_UI_CONFIG.colors;
    
    // Calculate position (bottom right of game area)
    const barWidth = 280;
    const barHeight = 70;
    const padding = 15;
    const barX = canvas.width - barWidth - padding;
    const barY = canvas.height - barHeight - padding;
    
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Border
    ctx.strokeStyle = cfg.borderSecondary;
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
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
            const action = ACTIONS ? ACTIONS[es.actionId] : null;
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
    
    // Draw action slots
    const slotWidth = 55;
    const slotHeight = 50;
    const slotY = barY + 10;
    let slotX = barX + 10;
    
    for (const actionData of actionsToShow) {
        drawActionSlot(ctx, actionData, slotX, slotY, slotWidth, slotHeight, player.skills.actionCooldowns);
        slotX += slotWidth + 5;
    }
    
    // If no actions available, show hint
    if (actionsToShow.length === 0) {
        ctx.fillStyle = cfg.textDim;
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('No actions available', barX + barWidth / 2, barY + barHeight / 2 + 5);
    }
}

/**
 * Draw a single action slot
 */
function drawActionSlot(ctx, actionData, x, y, width, height, cooldowns) {
    const cfg = SKILLS_UI_CONFIG.colors;
    const action = actionData.action;
    const cooldown = cooldowns[action.id] || 0;
    const isReady = cooldown <= 0;
    const isAvailable = actionData.available;
    
    // Slot background
    ctx.fillStyle = isAvailable ? (isReady ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)') : 'rgba(50, 50, 50, 0.5)';
    ctx.fillRect(x, y, width, height);
    
    // Cooldown overlay
    if (!isReady && isAvailable) {
        const cooldownPct = Math.min(1, cooldown / (action.cooldown || 10));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, width, height * cooldownPct);
    }
    
    // Border
    ctx.strokeStyle = isReady && isAvailable ? cfg.ready : cfg.borderSecondary;
    ctx.lineWidth = isReady && isAvailable ? 2 : 1;
    ctx.strokeRect(x, y, width, height);
    
    // Hotkey number
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`[${actionData.slot}]`, x + 3, y + 12);
    
    // Action icon
    const icon = SKILLS_UI_CONFIG.actionIcons[action.id] || '⚡';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(icon, x + width / 2, y + 32);
    
    // Cooldown or ready text
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    
    if (!isAvailable) {
        ctx.fillStyle = cfg.textMuted;
        ctx.fillText('LOCKED', x + width / 2, y + height - 4);
    } else if (isReady) {
        ctx.fillStyle = cfg.ready;
        ctx.fillText('READY', x + width / 2, y + height - 4);
    } else {
        ctx.fillStyle = cfg.cooldown;
        ctx.fillText(`${cooldown.toFixed(1)}s`, x + width / 2, y + height - 4);
    }
}

/**
 * Get the current weapon's action for the player
 */
function getPlayerWeaponAction(player) {
    const weapon = player.equipped?.MAIN;
    const specialty = weapon?.specialty || 'unarmed';
    
    // Check if specialty is unlocked
    const specData = player.skills.specialties[specialty];
    if (!specData) {
        // Fallback to unarmed
        const unarmedSpec = player.skills.specialties['unarmed'];
        if (unarmedSpec && unarmedSpec.level >= 5) {
            return {
                action: ACTIONS ? ACTIONS['flurry_of_blows'] : { id: 'flurry_of_blows', name: 'Flurry of Blows' },
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
    
    // Get action for this specialty
    const action = getActionForSpecialtyById(specialty);
    if (!action) return null;
    
    return {
        action: action,
        specialty: specialty,
        available: specData.level >= 5
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get specialties that belong to a proficiency
 */
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

/**
 * Get action definition for a specialty by ID
 */
function getActionForSpecialtyById(specialtyId) {
    // If ACTIONS is defined from skills.js, use it
    if (typeof ACTIONS !== 'undefined') {
        for (const actionId in ACTIONS) {
            if (ACTIONS[actionId].specialty === specialtyId) {
                return ACTIONS[actionId];
            }
        }
    }
    
    // Fallback mapping
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

// ============================================================================
// ACTION TOOLTIP (Hover Details)
// ============================================================================

// Tooltip state
const actionTooltip = {
    visible: false,
    action: null,
    x: 0,
    y: 0
};

/**
 * Show tooltip for an action
 */
function showActionTooltip(action, x, y) {
    actionTooltip.visible = true;
    actionTooltip.action = action;
    actionTooltip.x = x;
    actionTooltip.y = y;
}

/**
 * Hide the action tooltip
 */
function hideActionTooltip() {
    actionTooltip.visible = false;
    actionTooltip.action = null;
}

/**
 * Render the action tooltip if visible
 */
function renderActionTooltip(ctx) {
    if (!actionTooltip.visible || !actionTooltip.action) return;
    
    const cfg = SKILLS_UI_CONFIG.colors;
    const action = actionTooltip.action;
    
    const tooltipWidth = 280;
    const tooltipHeight = 140;
    let x = actionTooltip.x;
    let y = actionTooltip.y - tooltipHeight - 10;
    
    // Keep on screen
    if (x + tooltipWidth > canvas.width) x = canvas.width - tooltipWidth - 10;
    if (y < 10) y = actionTooltip.y + 20;
    
    // Background
    ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.fillRect(x, y, tooltipWidth, tooltipHeight);
    
    // Border
    ctx.strokeStyle = cfg.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, tooltipWidth, tooltipHeight);
    
    // Action name
    ctx.fillStyle = cfg.title;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(action.name, x + 10, y + 25);
    
    // Action type
    ctx.fillStyle = cfg.textDim;
    ctx.font = '12px monospace';
    ctx.fillText(`Type: ${action.type || 'damage'}`, x + 10, y + 45);
    
    // Cooldown
    ctx.fillText(`Cooldown: ${action.cooldown || 10}s`, x + 150, y + 45);
    
    // Description
    ctx.fillStyle = cfg.text;
    ctx.font = '14px monospace';
    const desc = action.description || getActionDescription(action.id);
    
    // Word wrap
    const words = desc.split(' ');
    let line = '';
    let lineY = y + 70;
    const maxWidth = tooltipWidth - 20;
    
    for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth) {
            ctx.fillText(line, x + 10, lineY);
            line = word + ' ';
            lineY += 18;
        } else {
            line = testLine;
        }
    }
    if (line) {
        ctx.fillText(line, x + 10, lineY);
    }
}

/**
 * Get a description for an action
 */
function getActionDescription(actionId) {
    const descriptions = {
        blade_dancer: 'Strike twice in rapid succession for 60% damage each.',
        arterial_strike: 'A precise cut that causes bleeding over time.',
        cleaving_blow: 'A devastating strike that ignores 50% armor.',
        impaling_thrust: 'Pierce through enemies in a line.',
        skull_crack: 'Crush your foe, stunning them for 2 seconds.',
        sweeping_arc: 'Spin attack hitting all adjacent enemies.',
        flurry_of_blows: 'Unleash 5 rapid punches.',
        shield_charge: 'Rush forward, damaging and knocking back.',
        immolate: 'Engulf target in flames that burn over time.',
        frozen_grasp: 'Freeze target in place for 3 seconds.',
        chain_lightning: 'Lightning arcs between multiple enemies.',
        life_siphon: 'Drain life force, healing yourself.',
        power_shot: 'A charged shot with bonus critical chance.',
        piercing_bolt: 'Bolt pierces through multiple targets.',
        fan_of_knives: 'Throw knives in a cone pattern.',
        spike_trap: 'Place a trap that damages and slows.',
        volatile_flask: 'Throw an explosive potion.',
        expose_weakness: 'Mark target to take increased damage.',
        deploy_turret: 'Deploy an auto-attacking turret.'
    };
    return descriptions[actionId] || 'A powerful combat ability.';
}

// ============================================================================
// INTEGRATION WITH MAIN RENDER
// ============================================================================

/**
 * Call this from the main render() function after drawing the game world
 * but before other UI overlays
 */
function renderSkillsUI() {
    // Action bar is drawn during gameplay
    if (game.state === 'playing') {
        drawActionBar();
    }
    
    // Tooltip (if using mouse hover system)
    renderActionTooltip(ctx);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Override the placeholder
window.drawSkillsOverlay = drawSkillsOverlay;

// Export for render loop
window.drawActionBar = drawActionBar;
window.renderSkillsUI = renderSkillsUI;

// Tooltip system
window.showActionTooltip = showActionTooltip;
window.hideActionTooltip = hideActionTooltip;
window.actionTooltip = actionTooltip;

// Config for customization
window.SKILLS_UI_CONFIG = SKILLS_UI_CONFIG;

console.log('✓ Skills UI loaded');