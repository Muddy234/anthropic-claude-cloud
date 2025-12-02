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

    // === TABS ===
    const tabs = ['STATS', 'COMBAT', 'BEHAVIOR', 'LORE'];
    const tabY = popupY + 40;
    const tabHeight = 22;
    const tabWidth = popupWidth / tabs.length;

    ctx.font = '11px monospace';
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
            case 0: // STATS
                renderInspectStatsTab(ctx, enemy, contentX, contentY, contentWidth, lineHeight);
                break;
            case 1: // COMBAT
                renderInspectCombatTab(ctx, enemy, contentX, contentY, contentWidth, lineHeight);
                break;
            case 2: // BEHAVIOR
                renderInspectBehaviorTab(ctx, enemy, contentX, contentY, contentWidth, lineHeight);
                break;
            case 3: // LORE
                renderInspectLoreTab(ctx, enemy, contentX, contentY, contentWidth, lineHeight);
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
 * STATS tab content
 */
function renderInspectStatsTab(ctx, enemy, x, y, width, lh) {
    // Image area
    const imgSize = 80;
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

    let lineY = y + imgSize + 20;
    ctx.textAlign = 'left';
    ctx.font = '13px monospace';

    // HP Bar
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    const barWidth = width - 50;
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
    lineY += lh + 8;

    ctx.textAlign = 'left';
    ctx.font = '13px monospace';

    // Stats in two columns
    const col1X = x;
    const col2X = x + width / 2;

    // Get stats from monster data or enemy object
    const monsterData = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[enemy.name] : null;

    ctx.fillStyle = '#aaa';
    ctx.fillText(`STR: ${monsterData?.str || enemy.damage || 10}`, col1X, lineY);
    ctx.fillText(`pDEF: ${enemy.pDef || monsterData?.pDef || 0}`, col2X, lineY);
    lineY += lh;

    ctx.fillText(`AGI: ${monsterData?.agi || 10}`, col1X, lineY);
    ctx.fillText(`mDEF: ${monsterData?.mDef || 0}`, col2X, lineY);
    lineY += lh;

    ctx.fillText(`INT: ${monsterData?.int || 10}`, col1X, lineY);
    lineY += lh + 5;

    // Element with color
    const element = enemy.element || 'physical';
    const elemColor = ELEMENT_COLORS[element] || '#ccc';
    ctx.fillStyle = '#888';
    ctx.fillText('Element:', col1X, lineY);
    ctx.fillStyle = elemColor;
    ctx.fillText(element.charAt(0).toUpperCase() + element.slice(1), col1X + 70, lineY);
    lineY += lh;

    // XP/Gold
    ctx.fillStyle = '#888';
    ctx.fillText(`XP: ${enemy.xp || 10}`, col1X, lineY);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Gold: ${enemy.goldMin || 5}-${enemy.goldMax || 15}`, col2X, lineY);
}

/**
 * COMBAT tab content
 */
function renderInspectCombatTab(ctx, enemy, x, y, width, lh) {
    const monsterData = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[enemy.name] : null;
    let lineY = y;

    ctx.fillStyle = '#0f0';
    ctx.fillText('Attack', x, lineY);
    lineY += lh;

    ctx.fillStyle = '#ddd';
    const attackName = monsterData?.attack || 'Basic Attack';
    ctx.fillText(`  ${attackName}`, x, lineY);
    lineY += lh;

    const attackType = monsterData?.attackType || enemy.damageType || 'physical';
    ctx.fillStyle = '#888';
    ctx.fillText(`  Type: ${attackType}`, x, lineY);
    lineY += lh + 10;

    ctx.fillStyle = '#0f0';
    ctx.fillText('Combat Stats', x, lineY);
    lineY += lh;

    ctx.fillStyle = '#aaa';
    const damage = enemy.damage || monsterData?.str || 10;
    ctx.fillText(`  Damage: ${damage}`, x, lineY);
    lineY += lh;

    const range = enemy.combat?.attackRange || 1;
    ctx.fillText(`  Range: ${range} tile${range > 1 ? 's' : ''}`, x, lineY);
    lineY += lh;

    const speed = enemy.combat?.attackSpeed || 1.0;
    ctx.fillText(`  Attack Speed: ${speed.toFixed(1)}x`, x, lineY);
    lineY += lh;

    const moveSpeed = enemy.moveSpeed || 3;
    ctx.fillText(`  Move Speed: ${moveSpeed}`, x, lineY);
    lineY += lh + 10;

    // Status effects
    ctx.fillStyle = '#0f0';
    ctx.fillText('Status Effects', x, lineY);
    lineY += lh;

    if (enemy.statusEffects && enemy.statusEffects.length > 0) {
        ctx.fillStyle = '#f39c12';
        for (const effect of enemy.statusEffects) {
            ctx.fillText(`  ${effect.name || effect}`, x, lineY);
            lineY += lh;
        }
    } else {
        ctx.fillStyle = '#666';
        ctx.fillText('  None', x, lineY);
    }
}

/**
 * BEHAVIOR tab content
 */
function renderInspectBehaviorTab(ctx, enemy, x, y, width, lh) {
    let lineY = y;

    ctx.fillStyle = '#0f0';
    ctx.fillText('AI Behavior', x, lineY);
    lineY += lh;

    ctx.fillStyle = '#ddd';
    const behaviorType = enemy.behaviorType || enemy.behavior?.type || 'territorial';
    ctx.fillText(`  Type: ${behaviorType}`, x, lineY);
    lineY += lh;

    // Behavior description
    const behaviorDescs = {
        'aggressive': 'Will chase relentlessly',
        'territorial': 'Guards its area',
        'passive': 'Non-hostile unless attacked',
        'defensive': 'Protects nearby allies',
        'patrol': 'Wanders and investigates',
        'swarm': 'Attacks in groups',
        'pack': 'Follows pack leader',
        'pack_leader': 'Commands nearby allies',
        'solitary': 'Avoids other creatures'
    };
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText(`  ${behaviorDescs[behaviorType] || 'Unknown behavior'}`, x, lineY);
    lineY += lh + 10;

    ctx.font = '13px monospace';
    ctx.fillStyle = '#0f0';
    ctx.fillText('Perception', x, lineY);
    lineY += lh;

    ctx.fillStyle = '#aaa';
    const sightRange = enemy.perception?.sightRange || enemy.aggression || 6;
    ctx.fillText(`  Sight Range: ${sightRange} tiles`, x, lineY);
    lineY += lh;

    const hearingRange = enemy.perception?.hearingRange || 4;
    ctx.fillText(`  Hearing Range: ${hearingRange} tiles`, x, lineY);
    lineY += lh + 10;

    ctx.fillStyle = '#0f0';
    ctx.fillText('Current State', x, lineY);
    lineY += lh;

    // Real-time AI state
    const aiState = enemy.ai?.currentState || enemy.state || 'idle';
    const stateColors = {
        'idle': '#888',
        'wandering': '#888',
        'alert': '#f39c12',
        'chasing': '#e74c3c',
        'combat': '#e74c3c',
        'fleeing': '#9b59b6',
        'searching': '#f39c12',
        'returning': '#3498db'
    };
    ctx.fillStyle = stateColors[aiState] || '#888';
    ctx.fillText(`  ${aiState.toUpperCase()}`, x, lineY);
    lineY += lh;

    // Combat status
    if (enemy.combat?.isInCombat) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('  IN COMBAT', x, lineY);
    }
}

/**
 * LORE tab content
 */
function renderInspectLoreTab(ctx, enemy, x, y, width, lh) {
    let lineY = y;

    ctx.fillStyle = '#0f0';
    ctx.fillText('Description', x, lineY);
    lineY += lh + 5;

    // Get description from monster data
    const monsterData = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[enemy.name] : null;
    const description = monsterData?.description || enemy.description || getEnemyDescription(enemy);

    // Word wrap
    ctx.fillStyle = '#ccc';
    ctx.font = '12px monospace';
    const words = description.split(' ');
    let line = '';
    const maxWidth = width - 10;

    for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
            ctx.fillText(line.trim(), x, lineY);
            line = word + ' ';
            lineY += lh;
        } else {
            line = testLine;
        }
    }
    if (line.trim()) {
        ctx.fillText(line.trim(), x, lineY);
        lineY += lh;
    }

    lineY += 15;

    // Additional lore info
    ctx.font = '13px monospace';
    ctx.fillStyle = '#0f0';
    ctx.fillText('Classification', x, lineY);
    lineY += lh;

    ctx.fillStyle = '#aaa';
    const element = enemy.element || 'physical';
    ctx.fillText(`  Element: ${element}`, x, lineY);
    lineY += lh;

    if (enemy.isUndead) {
        ctx.fillStyle = '#9b59b6';
        ctx.fillText('  Undead creature', x, lineY);
        lineY += lh;
    }

    const tier = enemy.tier || 'TIER_3';
    const tierNames = {
        'TIER_3': 'Common',
        'TIER_2': 'Uncommon',
        'TIER_1': 'Rare',
        'ELITE': 'Elite',
        'BOSS': 'Boss'
    };
    ctx.fillStyle = TIER_COLORS[tier] || '#888';
    ctx.fillText(`  Rarity: ${tierNames[tier] || 'Unknown'}`, x, lineY);
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

    // Tab area
    const tabY = popupY + 40;
    const tabHeight = 22;
    const tabWidth = popupWidth / 4;

    // Check if click is on tabs
    if (clickY >= tabY && clickY <= tabY + tabHeight) {
        const tabIndex = Math.floor((clickX - popupX) / tabWidth);
        if (tabIndex >= 0 && tabIndex <= 3) {
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