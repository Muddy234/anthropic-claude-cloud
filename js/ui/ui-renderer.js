// === UI RENDERING FOR CONTEXT MENU AND INSPECT POPUP ===
// Add this to your renderer.js or create as a separate ui-renderer.js file

// Use window globals for shared state (defined in right-click-init.js and input-handler.js)
// These getters ensure we always reference the current window object
const getInspectPopup = () => window.inspectPopup || { visible: false, target: null, targetType: null, tab: 0 };
const getContextMenu = () => window.contextMenu || { visible: false, options: [] };

/**
 * Render the right-click context menu
 */
function renderContextMenu(ctx) {
    const contextMenu = getContextMenu();
    if (!contextMenu.visible) return;

    const menuWidth = 120;
    const optionHeight = 25;
    const menuX = contextMenu.x;
    const menuY = contextMenu.y;
    const menuHeight = contextMenu.options.length * optionHeight;

    // Menu background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(menuX, menuY, menuWidth, menuHeight);

    // Menu border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);

    // Draw options
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    
    for (let i = 0; i < contextMenu.options.length; i++) {
        const option = contextMenu.options[i];
        const optionY = menuY + (i * optionHeight);

        // Hover effect (check mouse position)
        const rect = canvas.getBoundingClientRect();
        const mouseX = window.mouseX || 0;
        const mouseY = window.mouseY || 0;
        
        if (mouseX >= menuX && mouseX <= menuX + menuWidth &&
            mouseY >= optionY && mouseY <= optionY + optionHeight) {
            // Hover background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(menuX, optionY, menuWidth, optionHeight);
        }

        // Option text
        ctx.fillStyle = option.action === 'cancel' ? '#999' : '#fff';
        ctx.fillText(option.text, menuX + 10, optionY + 17);

        // Separator line
        if (i < contextMenu.options.length - 1) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(menuX + 5, optionY + optionHeight);
            ctx.lineTo(menuX + menuWidth - 5, optionY + optionHeight);
            ctx.stroke();
        }
    }
}

/**
 * Tier colors for inspect popup border
 */
const TIER_COLORS = {
    'TIER_3': '#888888',  // Gray - common
    'TIER_2': '#22aa22',  // Green - uncommon
    'TIER_1': '#3498db',  // Blue - rare
    'ELITE': '#9b59b6',   // Purple - elite
    'BOSS': '#f1c40f'     // Gold - boss
};

/**
 * Element colors for display
 */
const ELEMENT_COLORS = {
    'fire': '#ff6b35',
    'water': '#3498db',
    'earth': '#8b4513',
    'shadow': '#9b59b6',
    'death': '#666666',
    'nature': '#27ae60',
    'physical': '#cccccc'
};

/**
 * Render the inspect popup - Enhanced with tabs
 * Position: Bottom-right, Size: 300x400, Game continues running
 */
function renderInspectPopup(ctx) {
    const inspectPopup = getInspectPopup();
    if (!inspectPopup.visible) return;

    // Auto-close if enemy is dead or no longer exists
    if (inspectPopup.targetType === 'enemy') {
        const enemy = inspectPopup.target;
        if (!enemy || enemy.hp <= 0 || !game.enemies.includes(enemy)) {
            window.inspectPopup.visible = false;
            window.inspectPopup.target = null;
            window.inspectPopup.tab = 0;
            return;
        }
    }

    const popupWidth = 300;
    const popupHeight = 400;
    const margin = 20;
    const popupX = canvas.width - popupWidth - margin;
    const popupY = canvas.height - popupHeight - margin;

    // Get tier color for border
    let borderColor = '#888888';
    if (inspectPopup.targetType === 'enemy' && inspectPopup.target) {
        const tier = inspectPopup.target.tier || 'TIER_3';
        borderColor = TIER_COLORS[tier] || '#888888';
    }

    // Popup background (semi-transparent so game is visible)
    ctx.fillStyle = 'rgba(15, 15, 20, 0.92)';
    ctx.fillRect(popupX, popupY, popupWidth, popupHeight);

    // Popup border (tier colored)
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);

    // === HEADER: Name + Tier indicator ===
    const headerY = popupY + 25;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';

    let title = 'Inspection';
    let tierIndicator = '';
    if (inspectPopup.targetType === 'enemy' && inspectPopup.target) {
        title = inspectPopup.target.name || 'Unknown';
        tierIndicator = inspectPopup.target.tierIndicator || '';
    } else if (inspectPopup.targetType === 'npc') {
        title = inspectPopup.target?.name || 'Merchant';
    }

    // Tier indicator
    if (tierIndicator) {
        ctx.fillStyle = borderColor;
        ctx.fillText(tierIndicator, popupX + 10, headerY);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(title, popupX + 30, headerY);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(title, popupX + 10, headerY);
    }

    // === TABS (3 tabs: General, Combat, Behavior) ===
    const tabs = ['General', 'Combat', 'Behavior'];
    const tabY = popupY + 40;
    const tabHeight = 22;
    const tabWidth = popupWidth / tabs.length;

    ctx.font = '12px monospace';
    for (let i = 0; i < tabs.length; i++) {
        const tabX = popupX + i * tabWidth;

        // Tab background
        if (inspectPopup.tab === i) {
            ctx.fillStyle = borderColor;
            ctx.fillRect(tabX, tabY, tabWidth, tabHeight);
            ctx.fillStyle = '#000';
        } else {
            ctx.fillStyle = '#222';
            ctx.fillRect(tabX, tabY, tabWidth, tabHeight);
            ctx.fillStyle = '#888';
        }

        // Tab text
        ctx.textAlign = 'center';
        ctx.fillText(tabs[i], tabX + tabWidth / 2, tabY + 15);
    }

    // Tab border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(popupX, tabY, popupWidth, tabHeight);

    // === CONTENT AREA ===
    const contentX = popupX + 10;
    const contentY = tabY + tabHeight + 15;
    const contentWidth = popupWidth - 20;
    const lineHeight = 18;

    ctx.textAlign = 'left';
    ctx.font = '13px monospace';

    if (inspectPopup.targetType === 'enemy' && inspectPopup.target) {
        const enemy = inspectPopup.target;

        switch (inspectPopup.tab) {
            case 0: // General
                renderInspectGeneralTab(ctx, enemy, contentX, contentY, contentWidth, lineHeight);
                break;
            case 1: // Combat
                renderInspectCombatTab(ctx, enemy, contentX, contentY, contentWidth, lineHeight);
                break;
            case 2: // Behavior
                renderInspectBehaviorTab(ctx, enemy, contentX, contentY, contentWidth, lineHeight);
                break;
        }
    } else if (inspectPopup.targetType === 'npc') {
        renderInspectNPCContent(ctx, contentX, contentY, contentWidth, lineHeight);
    }

    // === FOOTER: Instructions ===
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    const footerText = inspectPopup.targetType === 'enemy'
        ? 'ESC to close | TAB: next tab | SHIFT+TAB: next enemy'
        : 'ESC to close | ←/→ switch tabs';
    ctx.fillText(footerText, popupX + popupWidth / 2, popupY + popupHeight - 8);
}

/**
 * GENERAL tab content - Sprite, HP, Mana, Stats, Lore
 */
function renderInspectGeneralTab(ctx, enemy, x, y, width, lh) {
    const monsterData = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[enemy.name] : null;

    // Image area
    const imgSize = 70;
    const imgX = x + (width - imgSize) / 2;

    // Try to draw animated sprite
    let spriteDrawn = false;
    if (typeof getEnemySpriteFrame === 'function') {
        const frameData = getEnemySpriteFrame(enemy);
        if (frameData) {
            ctx.imageSmoothingEnabled = false;

            // Draw background
            ctx.fillStyle = '#222';
            ctx.fillRect(imgX, y, imgSize, imgSize);

            // Scale sprite to fit the portrait box
            const scale = Math.min(imgSize / frameData.frameWidth, imgSize / frameData.frameHeight);
            const drawWidth = frameData.frameWidth * scale;
            const drawHeight = frameData.frameHeight * scale;
            const spriteX = imgX + (imgSize - drawWidth) / 2;
            const spriteY = y + (imgSize - drawHeight) / 2;

            ctx.drawImage(
                frameData.sprite,
                frameData.sourceX,
                frameData.sourceY,
                frameData.sourceWidth,
                frameData.sourceHeight,
                spriteX,
                spriteY,
                drawWidth,
                drawHeight
            );

            // Border
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.strokeRect(imgX, y, imgSize, imgSize);

            spriteDrawn = true;
        }
    }

    // Fallback: placeholder
    if (!spriteDrawn) {
        ctx.fillStyle = '#222';
        ctx.fillRect(imgX, y, imgSize, imgSize);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(imgX, y, imgSize, imgSize);
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.font = '10px monospace';
        ctx.fillText('[Portrait]', imgX + imgSize / 2, y + imgSize / 2 + 4);
    }

    let lineY = y + imgSize + 15;
    ctx.textAlign = 'left';
    ctx.font = '13px monospace';

    // HP Bar
    const barWidth = width - 40;
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 30, lineY - 10, barWidth, 12);
    ctx.fillStyle = hpPct > 0.5 ? '#27ae60' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(x + 30, lineY - 10, barWidth * hpPct, 12);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(x + 30, lineY - 10, barWidth, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText('HP', x, lineY);
    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    ctx.fillText(`${Math.ceil(enemy.hp)}/${enemy.maxHp}`, x + 30 + barWidth / 2, lineY - 1);
    lineY += lh;

    // Mana Bar
    ctx.textAlign = 'left';
    ctx.font = '13px monospace';
    const mpPct = Math.max(0, (enemy.mp || 0) / (enemy.maxMp || 100));
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 30, lineY - 10, barWidth, 12);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + 30, lineY - 10, barWidth * mpPct, 12);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(x + 30, lineY - 10, barWidth, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText('MP', x, lineY);
    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    ctx.fillText(`${Math.ceil(enemy.mp || 0)}/${enemy.maxMp || 100}`, x + 30 + barWidth / 2, lineY - 1);
    lineY += lh + 8;

    ctx.textAlign = 'left';
    ctx.font = '13px monospace';

    // Stats in two columns
    const col1X = x;
    const col2X = x + width / 2;

    ctx.fillStyle = '#aaa';
    ctx.fillText(`STR: ${monsterData?.str || 10}`, col1X, lineY);
    ctx.fillText(`pDEF: ${monsterData?.pDef || 0}`, col2X, lineY);
    lineY += lh;

    ctx.fillText(`AGI: ${monsterData?.agi || 10}`, col1X, lineY);
    ctx.fillText(`mDEF: ${monsterData?.mDef || 0}`, col2X, lineY);
    lineY += lh;

    ctx.fillText(`INT: ${monsterData?.int || 10}`, col1X, lineY);
    ctx.fillText(`Move: ${enemy.moveSpeed || 3}`, col2X, lineY);
    lineY += lh + 8;

    // Lore section
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Lore:', x, lineY);
    lineY += lh - 4;

    const description = monsterData?.description || getEnemyDescription(enemy);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';

    // Word wrap lore text
    const words = description.split(' ');
    let line = '';
    const maxWidth = width - 5;

    for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth) {
            ctx.fillText(line.trim(), x, lineY);
            line = word + ' ';
            lineY += lh - 4;
        } else {
            line = testLine;
        }
    }
    if (line.trim()) {
        ctx.fillText(line.trim(), x, lineY);
    }
}

/**
 * COMBAT tab content - Element, Base Attack, Crit/Dodge, Armor, Abilities
 */
function renderInspectCombatTab(ctx, enemy, x, y, width, lh) {
    const monsterData = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[enemy.name] : null;
    let lineY = y;

    // Element with color
    const element = enemy.element || 'physical';
    const elemColor = ELEMENT_COLORS[element] || '#ccc';
    ctx.fillStyle = '#888';
    ctx.fillText('Element:', x, lineY);
    ctx.fillStyle = elemColor;
    ctx.fillText(element.charAt(0).toUpperCase() + element.slice(1), x + 70, lineY);
    lineY += lh + 5;

    // Base Attack section
    ctx.fillStyle = '#0f0';
    ctx.fillText('Base Attack', x, lineY);
    lineY += lh;

    // Determine attack type label based on monster's attack type
    const attackType = monsterData?.attackType || 'physical';
    const attackRange = monsterData?.attackRange || enemy.combat?.attackRange || 1;
    let attackLabel = 'Melee';
    if (attackType === 'magic') {
        attackLabel = 'Magic';
    } else if (attackRange > 1) {
        attackLabel = 'Ranged';
    }

    ctx.fillStyle = '#aaa';
    ctx.fillText(`  Type: ${attackLabel}`, x, lineY);
    lineY += lh;
    ctx.fillText(`  Range: ${attackRange} tile${attackRange > 1 ? 's' : ''}`, x, lineY);
    lineY += lh + 5;

    // Combat stats in two columns
    const col1X = x;
    const col2X = x + width / 2;

    ctx.fillStyle = '#aaa';
    ctx.fillText(`Crit: 5%`, col1X, lineY);
    ctx.fillText(`Dodge: 0%`, col2X, lineY);
    lineY += lh;

    // Armor type
    const armorType = enemy.armorType || monsterData?.armorType || 'unarmored';
    ctx.fillText(`Armor: ${armorType.charAt(0).toUpperCase() + armorType.slice(1)}`, col1X, lineY);
    lineY += lh + 8;

    // Abilities section (from enemy-ability-system)
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    ctx.fillText('Abilities', x, lineY);
    lineY += lh;

    ctx.font = '11px monospace';

    // Get abilities from EnemyAbilitySystem preset
    const abilityPreset = typeof EnemyAbilitySystem !== 'undefined'
        ? EnemyAbilitySystem.MONSTER_ABILITY_PRESETS?.[enemy.name]
        : null;

    // Active ability (first attack from preset)
    ctx.fillStyle = '#888';
    ctx.fillText('Active:', x, lineY);
    ctx.fillStyle = '#aaa';
    if (abilityPreset?.attacks?.length > 0) {
        const attackId = abilityPreset.attacks[0];
        const attackDef = typeof AbilityRepository !== 'undefined'
            ? AbilityRepository.ATTACKS?.[attackId]
            : null;
        ctx.fillText(attackDef?.name || attackId.replace(/_/g, ' '), x + 60, lineY);
    } else {
        ctx.fillText('Basic Attack', x + 60, lineY);
    }
    lineY += lh;

    // Passive ability
    ctx.fillStyle = '#888';
    ctx.fillText('Passive:', x, lineY);
    ctx.fillStyle = '#aaa';
    if (abilityPreset?.passives?.length > 0) {
        const passiveId = abilityPreset.passives[0];
        const passiveDef = typeof AbilityRepository !== 'undefined'
            ? AbilityRepository.PASSIVES?.[passiveId]
            : null;
        ctx.fillText(passiveDef?.name || passiveId.replace(/_/g, ' '), x + 65, lineY);
    } else {
        ctx.fillStyle = '#666';
        ctx.fillText('None', x + 65, lineY);
    }
    lineY += lh;

    // Mechanics
    ctx.fillStyle = '#888';
    ctx.fillText('Mechanics:', x, lineY);
    ctx.fillStyle = '#aaa';
    if (abilityPreset?.mechanics?.length > 0) {
        const mechanicId = abilityPreset.mechanics[0];
        const mechanicDef = typeof AbilityRepository !== 'undefined'
            ? AbilityRepository.MECHANICS?.[mechanicId]
            : null;
        ctx.fillText(mechanicDef?.name || mechanicId.replace(/_/g, ' '), x + 80, lineY);
    } else {
        ctx.fillStyle = '#666';
        ctx.fillText('None', x + 80, lineY);
    }
}

/**
 * BEHAVIOR tab content - Behavior, Social, Perception, Current State
 */
function renderInspectBehaviorTab(ctx, enemy, x, y, width, lh) {
    let lineY = y;

    // Behavior type
    ctx.fillStyle = '#888';
    ctx.fillText('Behavior:', x, lineY);
    const behaviorType = enemy.behaviorType || enemy.behavior?.type || 'territorial';
    ctx.fillStyle = '#aaa';
    ctx.fillText(behaviorType.charAt(0).toUpperCase() + behaviorType.slice(1), x + 80, lineY);
    lineY += lh;

    // Social behavior
    ctx.fillStyle = '#888';
    ctx.fillText('Social:', x, lineY);

    // Determine social type based on behavior and pack membership
    let socialType = 'Solitary';
    if (enemy.packId) {
        socialType = 'Pack Member';
    } else if (enemy.swarmId) {
        socialType = 'Swarm';
    } else if (behaviorType === 'pack_leader') {
        socialType = 'Pack Leader';
    } else if (behaviorType === 'swarm') {
        socialType = 'Swarm';
    } else if (enemy.social?.type) {
        socialType = enemy.social.type.charAt(0).toUpperCase() + enemy.social.type.slice(1);
    }
    ctx.fillStyle = '#aaa';
    ctx.fillText(socialType, x + 60, lineY);
    lineY += lh + 5;

    // Perception section
    ctx.fillStyle = '#888';
    ctx.fillText('Sight Range:', x, lineY);
    const sightRange = enemy.perception?.sightRange || enemy.aggression || 6;
    ctx.fillStyle = '#aaa';
    ctx.fillText(`${sightRange} tiles`, x + 100, lineY);
    lineY += lh;

    ctx.fillStyle = '#888';
    ctx.fillText('Hearing Range:', x, lineY);
    const hearingRange = enemy.perception?.hearingRange || 4;
    ctx.fillStyle = '#aaa';
    ctx.fillText(`${hearingRange} tiles`, x + 115, lineY);
    lineY += lh + 8;

    // Current State section (real-time)
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    ctx.fillText('Current State', x, lineY);
    lineY += lh;

    ctx.font = '13px monospace';

    // Real-time AI state with color coding
    const aiState = enemy.ai?.currentState || enemy.state || 'idle';
    const stateColors = {
        'idle': '#888888',
        'wandering': '#888888',
        'alert': '#f39c12',
        'chasing': '#e74c3c',
        'combat': '#e74c3c',
        'fleeing': '#9b59b6',
        'searching': '#f39c12',
        'returning': '#3498db',
        'following': '#27ae60',
        'commanded': '#9b59b6',
        'shouting': '#f1c40f'
    };

    const stateDescriptions = {
        'idle': 'Standing still, unaware',
        'wandering': 'Patrolling the area',
        'alert': 'Heard something suspicious',
        'chasing': 'Pursuing a target',
        'combat': 'Actively fighting',
        'fleeing': 'Running away',
        'searching': 'Looking for target',
        'returning': 'Going back to post',
        'following': 'Following pack leader',
        'commanded': 'Received orders',
        'shouting': 'Alerting allies'
    };

    ctx.fillStyle = stateColors[aiState] || '#888';
    ctx.fillText(`  ${aiState.toUpperCase()}`, x, lineY);
    lineY += lh;

    // State description
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText(`  ${stateDescriptions[aiState] || 'Unknown state'}`, x, lineY);
    lineY += lh;

    // Combat status indicator
    ctx.font = '13px monospace';
    if (enemy.combat?.isInCombat) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('  [IN COMBAT]', x, lineY);
    } else {
        ctx.fillStyle = '#27ae60';
        ctx.fillText('  [PASSIVE]', x, lineY);
    }
}

/**
 * NPC content (non-tabbed for simplicity)
 */
function renderInspectNPCContent(ctx, x, y, width, lh) {
    let lineY = y;

    ctx.fillStyle = '#0f0';
    ctx.fillText('NPC Information', x, lineY);
    lineY += lh + 5;

    ctx.fillStyle = '#aaa';
    ctx.fillText('Type: Merchant', x, lineY);
    lineY += lh;
    ctx.fillText('Status: Friendly', x, lineY);
    lineY += lh + 15;

    ctx.fillStyle = '#0f0';
    ctx.fillText('Description', x, lineY);
    lineY += lh + 5;

    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    const desc = 'A mysterious merchant who appears in the depths. Offers potions and buys unwanted items.';

    const words = desc.split(' ');
    let line = '';
    for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > width - 10) {
            ctx.fillText(line.trim(), x, lineY);
            line = word + ' ';
            lineY += lh;
        } else {
            line = testLine;
        }
    }
    if (line.trim()) ctx.fillText(line.trim(), x, lineY);
}

/**
 * Get description for enemies without custom descriptions
 */
function getEnemyDescription(enemy) {
    const descriptions = {
        'Magma Slime': 'A molten creature formed from the volcanic heat. It burns everything it touches.',
        'Flame Bat': 'A bat wreathed in fire, swooping through the hot caverns.',
        'Lava Golem': 'A massive construct of molten rock, slow but incredibly strong.',
        'Fire Spirit': 'An ethereal being of pure flame energy, dancing through the air.',
        'Shadow Fiend': 'A dark creature that lurks in the shadows, striking from darkness.',
        'Stone Guardian': 'An ancient protector of the dungeon, animated by mysterious magic.'
    };

    return descriptions[enemy.name] || 'A dangerous creature lurking in the dungeon depths.';
}

/**
 * Track mouse position for hover effects
 */
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    window.mouseX = e.clientX - rect.left;
    window.mouseY = e.clientY - rect.top;
});

/**
 * Handle clicks on inspect popup tabs
 */
canvas.addEventListener('click', (e) => {
    const inspectPopup = getInspectPopup();
    if (!inspectPopup.visible) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Popup dimensions (must match renderInspectPopup)
    const popupWidth = 300;
    const popupHeight = 400;
    const margin = 20;
    const popupX = canvas.width - popupWidth - margin;
    const popupY = canvas.height - popupHeight - margin;

    // Check if click is within popup
    if (clickX < popupX || clickX > popupX + popupWidth ||
        clickY < popupY || clickY > popupY + popupHeight) {
        return; // Click outside popup, ignore
    }

    // Tab area (3 tabs: General, Combat, Behavior)
    const tabY = popupY + 40;
    const tabHeight = 22;
    const tabWidth = popupWidth / 3;

    // Check if click is on tabs
    if (clickY >= tabY && clickY <= tabY + tabHeight) {
        const tabIndex = Math.floor((clickX - popupX) / tabWidth);
        if (tabIndex >= 0 && tabIndex <= 2) {
            window.inspectPopup.tab = tabIndex;
        }
    }
});

/**
 * Add this to your main render loop
 * Call after rendering the game world but before UI overlays
 */
function renderUIOverlays(ctx) {
    // Skills UI: Action bar and tooltips
    if (typeof renderSkillsUI === 'function') {
        renderSkillsUI(ctx);
    }
    
    // Context menu and inspect popup
    renderContextMenu(ctx);
    renderInspectPopup(ctx);
}

// Export for use in renderer
window.renderUIOverlays = renderUIOverlays;