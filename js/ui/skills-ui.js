// === js/ui/skills-ui.js ===
// Skills Menu Screen (Press K) and Action Bar HUD - CotDG Style
// Features: Pentagon Radar Chart for proficiencies, specialty details below

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

    // Proficiency configuration for radar chart
    proficiencies: {
        blade:     { icon: 'B', name: 'BLADE',     angle: -90,  color: '#c0392b' },  // Top
        blunt:     { icon: 'H', name: 'BLUNT',     angle: -18,  color: '#e67e22' },  // Top-right
        magic:     { icon: 'M', name: 'MAGIC',     angle: 54,   color: '#9b59b6' },  // Bottom-right
        ranged:    { icon: 'R', name: 'RANGED',    angle: 126,  color: '#27ae60' },  // Bottom-left
        expertise: { icon: 'E', name: 'EXPERTISE', angle: 198,  color: '#3498db' }   // Top-left
    },

    // Radar chart settings
    radar: {
        radius: 120,           // Base radius of chart
        maxLevel: 100,         // Max proficiency level
        rings: 4,              // Number of guide rings
        iconOffset: 30,        // Distance of icons from edge
        glowIntensity: 0.8,
        pulseSpeed: 0.003
    }
};

// Animation state for skills UI
window.skillsUIState = {
    pulsePhase: 0,
    selectedProficiency: null,  // Currently selected vertex for details
    hoverVertex: null,          // Currently hovered vertex
    animationValues: {}         // For smooth transitions
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
// SKILLS MENU OVERLAY (Press K) - Pentagon Radar Chart
// ============================================================================

/**
 * Draw the full skills menu overlay - CotDG style with Pentagon Radar
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

    // Update animation
    window.skillsUIState.pulsePhase += SKILLS_UI_CONFIG.radar.pulseSpeed * 16;

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
    const panelHeight = Math.min(700, canvas.height - 60);
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

    let yOffset = panelY + 35;
    const contentX = panelX + 30;
    const contentWidth = panelWidth - 60;

    // Title - use serif font from design system
    const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY.display : 'Georgia, serif';
    ctx.fillStyle = colors.gold || '#c9a227';
    ctx.font = `bold 26px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText('SKILLS & ABILITIES', panelX + panelWidth / 2, yOffset);
    yOffset += 15;

    // Decorative line
    if (typeof drawDecorativeLine === 'function') {
        drawDecorativeLine(ctx, panelX + 80, yOffset, panelWidth - 160, colors);
    }
    yOffset += 30;

    // === PENTAGON RADAR CHART ===
    const radarCenterX = panelX + panelWidth / 2;
    const radarCenterY = yOffset + SKILLS_UI_CONFIG.radar.radius + 20;

    drawPentagonRadar(ctx, radarCenterX, radarCenterY, player.skills.proficiencies, colors);

    yOffset = radarCenterY + SKILLS_UI_CONFIG.radar.radius + 60;

    // === SELECTED PROFICIENCY DETAILS ===
    const selectedProf = window.skillsUIState.selectedProficiency || 'blade';

    // Draw proficiency tabs
    yOffset = drawProficiencyTabs(ctx, panelX + 30, yOffset, panelWidth - 60, selectedProf, player.skills.proficiencies, colors);
    yOffset += 15;

    // Draw specialty details for selected proficiency
    drawSpecialtyDetails(ctx, contentX, yOffset, contentWidth, selectedProf, player.skills, colors);

    // Footer instructions - use serif font
    ctx.fillStyle = colors.textMuted || '#706850';
    ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.small : `12px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText('[ESC/K] Close  |  Click vertex or tab to select  |  Use weapons to level up', panelX + panelWidth / 2, panelY + panelHeight - 15);
}

/**
 * Draw the pentagon radar chart - Occult style with rune background
 */
function drawPentagonRadar(ctx, centerX, centerY, proficiencies, colors) {
    const cfg = SKILLS_UI_CONFIG.radar;
    const profConfig = SKILLS_UI_CONFIG.proficiencies;
    const radius = cfg.radius;
    const profIds = ['blade', 'blunt', 'magic', 'ranged', 'expertise'];

    ctx.save();

    // Calculate vertex positions
    const vertices = [];
    for (let i = 0; i < 5; i++) {
        const angle = (profConfig[profIds[i]].angle * Math.PI / 180);
        vertices.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            profId: profIds[i]
        });
    }

    // === RUNE/MAGIC CIRCLE BACKGROUND ===
    drawRuneBackground(ctx, centerX, centerY, radius, colors);

    // === BACKGROUND GRID (Chalky lines) ===
    drawRadarGrid(ctx, centerX, centerY, radius, vertices, colors);

    // === PLAYER'S PROFICIENCY POLYGON ===
    drawPlayerPolygon(ctx, centerX, centerY, radius, proficiencies, profConfig, profIds, colors);

    // === VERTEX GEM SOCKETS ===
    drawVertexGemSockets(ctx, centerX, centerY, radius, profConfig, profIds, proficiencies, colors);

    ctx.restore();
}

/**
 * Draw occult rune/magic circle background behind radar
 */
function drawRuneBackground(ctx, centerX, centerY, radius, colors) {
    // Use the design system's rune pattern if available
    if (typeof createRunePattern === 'function') {
        const size = radius * 2.5;
        const runeCanvas = createRunePattern(size, 'rgba(93, 161, 130, 0.06)');
        ctx.drawImage(runeCanvas, centerX - size / 2, centerY - size / 2, size, size);
    } else {
        // Fallback: draw simple magic circle
        ctx.save();
        ctx.strokeStyle = 'rgba(93, 161, 130, 0.08)';
        ctx.lineWidth = 1;

        // Outer magic circles
        [1.15, 1.0, 0.5].forEach(scale => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Cross lines
        ctx.beginPath();
        ctx.moveTo(centerX - radius * 1.1, centerY);
        ctx.lineTo(centerX + radius * 1.1, centerY);
        ctx.moveTo(centerX, centerY - radius * 1.1);
        ctx.lineTo(centerX, centerY + radius * 1.1);
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * Draw the radar grid (pentagon outline + rings) - Chalky/rough style
 */
function drawRadarGrid(ctx, centerX, centerY, radius, vertices, colors) {
    const rings = SKILLS_UI_CONFIG.radar.rings;
    const profIds = ['blade', 'blunt', 'magic', 'ranged', 'expertise'];
    const profConfig = SKILLS_UI_CONFIG.proficiencies;

    // Use chalky line drawing if available
    const useChalkLines = typeof drawChalkyLine === 'function';

    // Concentric pentagon rings with chalky style
    for (let ring = 1; ring <= rings; ring++) {
        const ringRadius = radius * (ring / rings);
        const alpha = 0.08 + (ring / rings) * 0.12;
        const lineColor = `rgba(239, 228, 176, ${alpha})`; // Parchment color

        // Draw pentagon ring
        const ringPoints = [];
        for (let i = 0; i < 5; i++) {
            const angle = (profConfig[profIds[i]].angle * Math.PI / 180);
            ringPoints.push({
                x: centerX + Math.cos(angle) * ringRadius,
                y: centerY + Math.sin(angle) * ringRadius
            });
        }

        // Connect the points with chalky lines
        for (let i = 0; i < 5; i++) {
            const next = (i + 1) % 5;
            if (useChalkLines && ring === rings) {
                // Outer ring gets chalky treatment
                drawChalkyLine(ctx, ringPoints[i].x, ringPoints[i].y,
                              ringPoints[next].x, ringPoints[next].y, {
                    color: lineColor,
                    width: 2,
                    roughness: 1.5
                });
            } else {
                // Inner rings are simpler
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = ring === rings ? 2 : 1;
                ctx.beginPath();
                ctx.moveTo(ringPoints[i].x, ringPoints[i].y);
                ctx.lineTo(ringPoints[next].x, ringPoints[next].y);
                ctx.stroke();
            }
        }
    }

    // Radial lines from center to each vertex (chalky)
    for (const vertex of vertices) {
        if (useChalkLines) {
            drawChalkyLine(ctx, centerX, centerY, vertex.x, vertex.y, {
                color: 'rgba(239, 228, 176, 0.08)',
                width: 1,
                roughness: 1
            });
        } else {
            ctx.strokeStyle = 'rgba(239, 228, 176, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(vertex.x, vertex.y);
            ctx.stroke();
        }
    }

    // Center rune mark (instead of simple dot)
    ctx.save();
    ctx.fillStyle = colors.border || '#3a3530';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Inner star/rune
    ctx.strokeStyle = 'rgba(239, 228, 176, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = centerX + Math.cos(angle) * 3;
        const py = centerY + Math.sin(angle) * 3;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

/**
 * Draw the player's proficiency polygon (filled shape)
 */
function drawPlayerPolygon(ctx, centerX, centerY, radius, proficiencies, profConfig, profIds, colors) {
    const maxLevel = SKILLS_UI_CONFIG.radar.maxLevel;
    const pulse = Math.sin(window.skillsUIState.pulsePhase) * 0.15 + 0.85;

    // Calculate polygon points based on proficiency levels
    const points = [];
    for (let i = 0; i < 5; i++) {
        const profId = profIds[i];
        const profData = proficiencies[profId];
        const level = profData ? profData.level : 0;
        const normalizedLevel = Math.max(0.05, level / maxLevel); // Minimum 5% so shape is visible

        const angle = (profConfig[profId].angle * Math.PI / 180);
        const dist = radius * normalizedLevel;

        points.push({
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist
        });
    }

    // Fill gradient (gold/amber like Old Greg's Tavern)
    const fillGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    fillGrad.addColorStop(0, 'rgba(212, 175, 55, 0.4)');  // Gold center
    fillGrad.addColorStop(0.7, 'rgba(212, 175, 55, 0.25)');
    fillGrad.addColorStop(1, 'rgba(212, 175, 55, 0.1)');

    // Draw filled polygon
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Glowing border
    ctx.shadowColor = colors.gold || '#d4af37';
    ctx.shadowBlur = 15 * pulse;
    ctx.strokeStyle = colors.gold || '#d4af37';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner bright border
    ctx.globalAlpha = 0.6 * pulse;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw vertex points on player's polygon
    for (const point of points) {
        ctx.fillStyle = colors.gold || '#d4af37';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Glow on points
        ctx.shadowColor = colors.gold || '#d4af37';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

/**
 * Draw vertex gem sockets with icons
 */
function drawVertexGemSockets(ctx, centerX, centerY, radius, profConfig, profIds, proficiencies, colors) {
    const iconOffset = SKILLS_UI_CONFIG.radar.iconOffset;
    const selected = window.skillsUIState.selectedProficiency;

    for (let i = 0; i < 5; i++) {
        const profId = profIds[i];
        const config = profConfig[profId];
        const profData = proficiencies[profId];
        const level = profData ? profData.level : 0;

        const angle = (config.angle * Math.PI / 180);
        const iconX = centerX + Math.cos(angle) * (radius + iconOffset);
        const iconY = centerY + Math.sin(angle) * (radius + iconOffset);

        const isSelected = selected === profId;
        const isHovered = window.skillsUIState.hoverVertex === profId;

        // Gem socket radius
        const socketRadius = isSelected ? 16 : 14;

        // Use design system's gem socket if available
        if (typeof drawGemSocket === 'function') {
            drawGemSocket(ctx, iconX, iconY, socketRadius, {
                gemColor: level > 0 ? config.color : null,
                borderColor: colors.border || '#3a3530',
                glowing: level > 10,
                selected: isSelected
            });
        } else {
            // Fallback: simple circle with glow
            if (isSelected || isHovered) {
                ctx.shadowColor = config.color;
                ctx.shadowBlur = 12;
            }

            ctx.fillStyle = isSelected ? config.color : colors.bgDark || '#141414';
            ctx.beginPath();
            ctx.arc(iconX, iconY, socketRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = isSelected ? colors.textPrimary || '#efe4b0' : config.color;
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Icon letter (on top of gem) - use serif font
        ctx.fillStyle = isSelected ? colors.textPrimary || '#efe4b0' : config.color;
        const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY.display : 'Georgia, serif';
        ctx.font = `bold ${isSelected ? 14 : 12}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.icon, iconX, iconY);

        // Level label below icon
        ctx.fillStyle = colors.textSecondary || '#b8a878';
        ctx.font = `10px ${fontFamily}`;
        ctx.fillText(`Lv ${level}`, iconX, iconY + socketRadius + 10);

        // Store clickable area for interaction
        if (!window.skillsUIVertexAreas) window.skillsUIVertexAreas = {};
        window.skillsUIVertexAreas[profId] = {
            x: iconX,
            y: iconY,
            radius: socketRadius + 5
        };
    }
}

/**
 * Draw proficiency selection tabs below radar - with dark red selection
 */
function drawProficiencyTabs(ctx, x, y, width, selectedProf, proficiencies, colors) {
    const profIds = ['blade', 'blunt', 'magic', 'ranged', 'expertise'];
    const tabWidth = width / 5;
    const tabHeight = 32;
    const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY.display : 'Georgia, serif';

    ctx.save();

    // Store clickable areas
    if (!window.skillsUITabAreas) window.skillsUITabAreas = {};

    for (let i = 0; i < 5; i++) {
        const profId = profIds[i];
        const config = SKILLS_UI_CONFIG.proficiencies[profId];
        const profData = proficiencies[profId];
        const isSelected = selectedProf === profId;

        const tabX = x + (i * tabWidth);

        // Tab background - use dark red gradient for selection
        if (isSelected) {
            // Use selection gradient from design system if available
            if (typeof drawSelectionHighlight === 'function') {
                drawSelectionHighlight(ctx, tabX, y, tabWidth, tabHeight, { style: 'gradient' });
            } else {
                const grad = ctx.createLinearGradient(tabX, y, tabX, y + tabHeight);
                grad.addColorStop(0, colors.selectionGradientStart || '#5a2020');
                grad.addColorStop(1, colors.selectionGradientEnd || '#2a1010');
                ctx.fillStyle = grad;
            }
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        }

        // Rounded top corners for tabs
        const radius = 4;
        ctx.beginPath();
        ctx.moveTo(tabX + radius, y);
        ctx.lineTo(tabX + tabWidth - radius, y);
        ctx.quadraticCurveTo(tabX + tabWidth, y, tabX + tabWidth, y + radius);
        ctx.lineTo(tabX + tabWidth, y + tabHeight);
        ctx.lineTo(tabX, y + tabHeight);
        ctx.lineTo(tabX, y + radius);
        ctx.quadraticCurveTo(tabX, y, tabX + radius, y);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = isSelected ? '#fff' : colors.border;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Tab text - use serif font
        ctx.fillStyle = isSelected ? colors.textPrimary || '#efe4b0' : colors.textSecondary || '#b8a878';
        ctx.font = `${isSelected ? 'bold ' : ''}11px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.name, tabX + tabWidth / 2, y + tabHeight / 2);

        // Store clickable area
        window.skillsUITabAreas[profId] = {
            x: tabX,
            y: y,
            width: tabWidth,
            height: tabHeight
        };
    }

    ctx.restore();

    return y + tabHeight;
}

/**
 * Draw specialty details for selected proficiency - occult style
 */
function drawSpecialtyDetails(ctx, x, y, width, selectedProf, skills, colors) {
    const profConfig = SKILLS_UI_CONFIG.proficiencies[selectedProf];
    const specialtyIds = getSpecialtiesForProficiency(selectedProf);
    const profData = skills.proficiencies[selectedProf];
    const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY.display : 'Georgia, serif';

    ctx.save();

    // Section header - serif font
    ctx.fillStyle = profConfig.color;
    ctx.font = `bold 15px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${profConfig.name} SPECIALTIES`, x, y);

    // Proficiency XP bar
    const barWidth = 200;
    const barX = x + width - barWidth - 50;
    drawSkillXPBar(ctx, barX, y - 10, barWidth, 12, profData.xp, profData.xpToNext, colors, profConfig.color);

    ctx.fillStyle = colors.textMuted || '#706850';
    ctx.font = `10px ${fontFamily}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${profData.xp}/${profData.xpToNext} XP`, x + width, y);

    y += 25;

    // Draw each specialty
    for (const specId of specialtyIds) {
        const specData = skills.specialties[specId];
        if (!specData) continue;

        const specName = specId.charAt(0).toUpperCase() + specId.slice(1);
        const isUnlocked = specData.unlocked;

        // Specialty row background
        ctx.fillStyle = isUnlocked ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(x - 5, y - 12, width + 10, 36);

        // Specialty name - serif font
        ctx.fillStyle = isUnlocked ? colors.textPrimary || '#efe4b0' : colors.textMuted || '#706850';
        ctx.font = `14px ${fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText(specName, x + 5, y);

        if (isUnlocked) {
            // Level
            ctx.fillStyle = profConfig.color;
            ctx.font = `bold 12px ${fontFamily}`;
            ctx.fillText(`Lv ${specData.level}`, x + 100, y);

            // XP progress bar
            const specBarWidth = 120;
            const specBarX = x + 160;
            drawSkillXPBar(ctx, specBarX, y - 8, specBarWidth, 10, specData.xp, specData.xpToNext, colors, profConfig.color);

            // Action info
            if (specData.level >= 5) {
                const action = getActionForSpecialtyById(specId);
                if (action) {
                    const iconText = SKILLS_UI_CONFIG.actionIcons[action.id] || '??';
                    const cooldown = skills.actionCooldowns[action.id] || 0;
                    const isReady = cooldown <= 0;

                    ctx.fillStyle = isReady ? colors.success || '#5da182' : colors.warning || '#d4852a';
                    ctx.font = `bold 11px ${fontFamily}`;
                    ctx.textAlign = 'left';
                    ctx.fillText(`[${iconText}] ${action.name}`, x + 300, y);

                    // Status
                    ctx.textAlign = 'right';
                    if (isReady) {
                        ctx.fillText('READY', x + width - 5, y);
                    } else {
                        ctx.fillText(`${cooldown.toFixed(1)}s`, x + width - 5, y);
                    }
                }
            } else {
                ctx.fillStyle = colors.textMuted || '#706850';
                ctx.font = `italic 11px ${fontFamily}`;
                ctx.textAlign = 'right';
                ctx.fillText(`Lv 5 to unlock action`, x + width - 5, y);
            }
        } else {
            ctx.fillStyle = colors.textMuted || '#706850';
            ctx.font = `italic 12px ${fontFamily}`;
            ctx.fillText('(Use weapon to unlock)', x + 100, y);
        }

        y += 38;
    }

    ctx.restore();
}

/**
 * Draw XP bar - CotDG style with custom color
 */
function drawSkillXPBar(ctx, x, y, width, height, current, max, colors, fillColor) {
    const pct = Math.min(1, Math.max(0, current / max));

    // Background
    ctx.fillStyle = colors.bgDarkest || '#0a0a0f';
    ctx.fillRect(x, y, width, height);

    // Fill gradient
    if (pct > 0) {
        const fc = fillColor || colors.corruption || '#8e44ad';
        const fillGrad = ctx.createLinearGradient(x, y, x + width * pct, y);
        fillGrad.addColorStop(0, fc);
        fillGrad.addColorStop(1, colors.bgMedium || '#1a1a24');
        ctx.fillStyle = fillGrad;
        ctx.fillRect(x, y, width * pct, height);

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, width * pct, height / 3);
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
        gold: '#d4af37',
        textPrimary: '#ffffff',
        textMuted: '#666666'
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    const cx = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH) / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = colors.gold;
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
// CLICK HANDLING FOR SKILLS UI
// ============================================================================

/**
 * Handle click on skills overlay
 */
function handleSkillsOverlayClick(mouseX, mouseY) {
    // Check vertex clicks
    if (window.skillsUIVertexAreas) {
        for (const profId in window.skillsUIVertexAreas) {
            const area = window.skillsUIVertexAreas[profId];
            const dx = mouseX - area.x;
            const dy = mouseY - area.y;
            if (Math.sqrt(dx * dx + dy * dy) <= area.radius) {
                window.skillsUIState.selectedProficiency = profId;
                return true;
            }
        }
    }

    // Check tab clicks
    if (window.skillsUITabAreas) {
        for (const profId in window.skillsUITabAreas) {
            const area = window.skillsUITabAreas[profId];
            if (mouseX >= area.x && mouseX <= area.x + area.width &&
                mouseY >= area.y && mouseY <= area.y + area.height) {
                window.skillsUIState.selectedProficiency = profId;
                return true;
            }
        }
    }

    return false;
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
window.handleSkillsOverlayClick = handleSkillsOverlayClick;
window.actionTooltip = actionTooltip;
window.SKILLS_UI_CONFIG = SKILLS_UI_CONFIG;
window.skillsUIState = window.skillsUIState;

// Skills UI loaded
