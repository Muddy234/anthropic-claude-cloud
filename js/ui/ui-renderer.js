// === UI RENDERING FOR CONTEXT MENU AND INSPECT POPUP ===
// Add this to your renderer.js or create as a separate ui-renderer.js file

// Use window globals for shared state (defined in right-click-init.js and input-handler.js)
// These getters ensure we always reference the current window object
const getInspectPopup = () => window.inspectPopup || { visible: false, target: null, targetType: null, tab: 0 };
const getContextMenu = () => window.contextMenu || { visible: false, options: [] };

// Info popup state - displays detailed info when clicking on hyperlinks
const getInfoPopup = () => window.infoPopup || { visible: false, type: null, data: null };

// Initialize info popup if not exists
if (!window.infoPopup) {
    window.infoPopup = { visible: false, type: null, data: null };
}

// Track clickable link regions during render (cleared each frame)
let clickableLinks = [];

/**
 * Register a clickable info link region
 */
function registerInfoLink(x, y, width, height, type, data) {
    clickableLinks.push({ x, y, width, height, type, data });
}

/**
 * Clear all link regions (call at start of each render)
 */
function clearInfoLinks() {
    clickableLinks = [];
}

/**
 * Check if a point is within any info link
 */
function getInfoLinkAtPoint(px, py) {
    for (const link of clickableLinks) {
        if (px >= link.x && px <= link.x + link.width &&
            py >= link.y && py <= link.y + link.height) {
            return link;
        }
    }
    return null;
}

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

// ============================================================================
// INFO POPUP CONTENT - Detailed information for hyperlinks
// ============================================================================

const INFO_CONTENT = {
    // Damage types and their effectiveness vs armor
    damageType: {
        blade: {
            title: 'Blade Damage',
            color: '#c0c0c0',
            description: 'Slashing attacks from swords, claws, and sharp edges.',
            effectiveness: [
                { armor: 'Unarmored', modifier: '+30%', color: '#27ae60' },
                { armor: 'Hide', modifier: '0%', color: '#888' },
                { armor: 'Scaled', modifier: '0%', color: '#888' },
                { armor: 'Armored', modifier: '-30%', color: '#e74c3c' },
                { armor: 'Stone', modifier: '-30%', color: '#e74c3c' },
                { armor: 'Bone', modifier: '0%', color: '#888' },
                { armor: 'Ethereal', modifier: '0%', color: '#888' }
            ]
        },
        blunt: {
            title: 'Blunt Damage',
            color: '#cd7f32',
            description: 'Crushing attacks from hammers, fists, and heavy impacts.',
            effectiveness: [
                { armor: 'Unarmored', modifier: '0%', color: '#888' },
                { armor: 'Hide', modifier: '0%', color: '#888' },
                { armor: 'Scaled', modifier: '0%', color: '#888' },
                { armor: 'Armored', modifier: '+30%', color: '#27ae60' },
                { armor: 'Stone', modifier: '+30%', color: '#27ae60' },
                { armor: 'Bone', modifier: '+30%', color: '#27ae60' },
                { armor: 'Ethereal', modifier: '-30%', color: '#e74c3c' }
            ]
        },
        pierce: {
            title: 'Pierce Damage',
            color: '#87ceeb',
            description: 'Piercing attacks from fangs, spears, and arrows.',
            effectiveness: [
                { armor: 'Unarmored', modifier: '0%', color: '#888' },
                { armor: 'Hide', modifier: '+30%', color: '#27ae60' },
                { armor: 'Scaled', modifier: '+30%', color: '#27ae60' },
                { armor: 'Armored', modifier: '-30%', color: '#e74c3c' },
                { armor: 'Stone', modifier: '-30%', color: '#e74c3c' },
                { armor: 'Bone', modifier: '0%', color: '#888' },
                { armor: 'Ethereal', modifier: '+30%', color: '#27ae60' }
            ]
        },
        magic: {
            title: 'Magic Damage',
            color: '#9b59b6',
            description: 'Arcane attacks that bypass physical armor. Resisted by mDEF.',
            effectiveness: [
                { armor: 'All Types', modifier: 'Ignores physical armor', color: '#9b59b6' }
            ],
            note: 'Magic damage is reduced by mDEF (Magic Defense) instead of armor type.'
        }
    },

    // Armor types and what they resist
    armorType: {
        unarmored: {
            title: 'Unarmored',
            color: '#ffcccc',
            description: 'No natural protection. Soft flesh or exposed skin.',
            resistances: [
                { type: 'Blade', modifier: '-30%', color: '#e74c3c' },
                { type: 'Blunt', modifier: '0%', color: '#888' },
                { type: 'Pierce', modifier: '0%', color: '#888' }
            ],
            examples: 'Slimes, Wisps, Cultists'
        },
        hide: {
            title: 'Hide Armor',
            color: '#8b4513',
            description: 'Tough skin or leather. Resists slashing but vulnerable to piercing.',
            resistances: [
                { type: 'Blade', modifier: '0%', color: '#888' },
                { type: 'Blunt', modifier: '0%', color: '#888' },
                { type: 'Pierce', modifier: '-30%', color: '#e74c3c' }
            ],
            examples: 'Salamanders, Crawlers'
        },
        scaled: {
            title: 'Scaled Armor',
            color: '#2ecc71',
            description: 'Natural scales or plates. Piercing finds gaps between scales.',
            resistances: [
                { type: 'Blade', modifier: '0%', color: '#888' },
                { type: 'Blunt', modifier: '0%', color: '#888' },
                { type: 'Pierce', modifier: '-30%', color: '#e74c3c' }
            ],
            examples: 'Serpents, Spiders'
        },
        armored: {
            title: 'Metal Armor',
            color: '#95a5a6',
            description: 'Heavy metal plating. Weak to blunt force that dents and crushes.',
            resistances: [
                { type: 'Blade', modifier: '+30%', color: '#27ae60' },
                { type: 'Blunt', modifier: '-30%', color: '#e74c3c' },
                { type: 'Pierce', modifier: '+30%', color: '#27ae60' }
            ],
            examples: 'Golems, Warriors'
        },
        stone: {
            title: 'Stone Armor',
            color: '#7f8c8d',
            description: 'Rock-like body. Shatters under blunt impact.',
            resistances: [
                { type: 'Blade', modifier: '+30%', color: '#27ae60' },
                { type: 'Blunt', modifier: '-30%', color: '#e74c3c' },
                { type: 'Pierce', modifier: '+30%', color: '#27ae60' }
            ],
            examples: 'Stone Lurkers, Obsidian Golems'
        },
        bone: {
            title: 'Bone Armor',
            color: '#ecf0f1',
            description: 'Skeletal structure. Breaks easily under crushing blows.',
            resistances: [
                { type: 'Blade', modifier: '0%', color: '#888' },
                { type: 'Blunt', modifier: '-30%', color: '#e74c3c' },
                { type: 'Pierce', modifier: '0%', color: '#888' }
            ],
            examples: 'Skeletons, Bone Golems'
        },
        ethereal: {
            title: 'Ethereal',
            color: '#9b59b6',
            description: 'Incorporeal form. Piercing weapons anchor the spirit.',
            resistances: [
                { type: 'Blade', modifier: '0%', color: '#888' },
                { type: 'Blunt', modifier: '+30%', color: '#27ae60' },
                { type: 'Pierce', modifier: '-30%', color: '#e74c3c' }
            ],
            examples: 'Phantoms, Void Touched'
        }
    },

    // Element information
    element: {
        fire: {
            title: 'Fire Element',
            color: '#ff6b35',
            description: 'Burns with intense heat. Strong against Nature, weak against Water.',
            strengths: ['Nature', 'Ice'],
            weaknesses: ['Water', 'Earth'],
            effects: 'May apply Burning status (damage over time)'
        },
        water: {
            title: 'Water Element',
            color: '#3498db',
            description: 'Flows and adapts. Strong against Fire, weak against Nature.',
            strengths: ['Fire'],
            weaknesses: ['Nature', 'Ice'],
            effects: 'May apply Wet status (increases ice/lightning damage)'
        },
        earth: {
            title: 'Earth Element',
            color: '#8b4513',
            description: 'Solid and unyielding. Strong against Fire, weak against Nature.',
            strengths: ['Fire', 'Physical'],
            weaknesses: ['Nature', 'Water'],
            effects: 'High physical defense, may cause knockback'
        },
        nature: {
            title: 'Nature Element',
            color: '#27ae60',
            description: 'Life energy and growth. Strong against Water/Earth, weak against Fire.',
            strengths: ['Water', 'Earth'],
            weaknesses: ['Fire', 'Death'],
            effects: 'May apply Poison or heal allies'
        },
        shadow: {
            title: 'Shadow Element',
            color: '#9b59b6',
            description: 'Darkness and stealth. Strong against Physical, weak against Holy.',
            strengths: ['Physical'],
            weaknesses: ['Holy', 'Fire'],
            effects: 'May reduce vision or cause fear'
        },
        death: {
            title: 'Death Element',
            color: '#666666',
            description: 'Necrotic energy. Strong against Nature, weak against Holy.',
            strengths: ['Nature', 'Physical'],
            weaknesses: ['Holy', 'Fire'],
            effects: 'May drain life or raise undead'
        },
        physical: {
            title: 'Physical Element',
            color: '#cccccc',
            description: 'Pure physical force with no elemental affinity.',
            strengths: ['None'],
            weaknesses: ['None'],
            effects: 'No special elemental effects'
        }
    },

    // Behavior types
    behavior: {
        aggressive: {
            title: 'Aggressive',
            color: '#e74c3c',
            description: 'Will chase targets relentlessly once spotted. Never gives up pursuit.',
            traits: ['Long chase range', 'Quick to attack', 'Ignores flee thresholds']
        },
        territorial: {
            title: 'Territorial',
            color: '#f39c12',
            description: 'Guards a specific area. Will chase intruders but returns to post.',
            traits: ['Limited chase range', 'Returns to spawn point', 'Defends area aggressively']
        },
        defensive: {
            title: 'Defensive',
            color: '#3498db',
            description: 'Protects nearby allies. Prioritizes helping wounded friends.',
            traits: ['Supports allies', 'May heal or buff friends', 'Responds to ally distress calls']
        },
        passive: {
            title: 'Passive',
            color: '#27ae60',
            description: 'Non-hostile unless attacked first. Will fight back if provoked.',
            traits: ['Ignores players initially', 'Retaliates when damaged', 'May flee when hurt']
        },
        ambusher: {
            title: 'Ambusher',
            color: '#9b59b6',
            description: 'Waits in hiding for prey to come close. First strike bonus.',
            traits: ['Stealth until attack', 'Bonus damage on first hit', 'Teleport attacks']
        },
        swarm: {
            title: 'Swarm',
            color: '#e67e22',
            description: 'Attacks in coordinated groups. Stronger with more allies.',
            traits: ['Pack bonuses', 'Coordinated attacks', 'Surround tactics']
        }
    }
};

/**
 * Draw an info link with icon
 * Returns the width of the drawn text for click region registration
 */
function drawInfoLink(ctx, text, x, y, type, data, color = '#aaa') {
    const iconSize = 10;
    const padding = 3;

    // Draw text
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    const textWidth = ctx.measureText(text).width;

    // Draw info icon (ⓘ)
    const iconX = x + textWidth + padding;
    const iconY = y - iconSize + 2;

    ctx.fillStyle = '#5dade2';
    ctx.font = '10px monospace';
    ctx.fillText('ⓘ', iconX, y);

    // Register clickable region
    const totalWidth = textWidth + padding + iconSize;
    registerInfoLink(x, y - 12, totalWidth, 14, type, data);

    return totalWidth;
}

/**
 * Render the info popup (replaces inspect panel when shown)
 */
function renderInfoPopup(ctx) {
    const infoPopup = getInfoPopup();
    if (!infoPopup.visible) return;

    const popupWidth = 300;
    const popupHeight = 400;
    const margin = 20;
    const popupX = canvas.width - popupWidth - margin;
    const popupY = canvas.height - popupHeight - margin;

    // Get content based on type
    const content = INFO_CONTENT[infoPopup.type]?.[infoPopup.data];
    if (!content) {
        window.infoPopup.visible = false;
        return;
    }

    // Background
    ctx.fillStyle = 'rgba(15, 15, 20, 0.95)';
    ctx.fillRect(popupX, popupY, popupWidth, popupHeight);

    // Border (colored by content type)
    ctx.strokeStyle = content.color || '#888';
    ctx.lineWidth = 3;
    ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);

    // Header
    const headerY = popupY + 25;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = content.color || '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(content.title, popupX + 10, headerY);

    // Back button hint
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText('[ESC] Back', popupX + popupWidth - 10, headerY);

    // Content area
    let lineY = popupY + 55;
    const contentX = popupX + 10;
    const contentWidth = popupWidth - 20;
    const lh = 16;

    ctx.textAlign = 'left';

    // Description (word-wrapped)
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    const descWords = content.description.split(' ');
    let line = '';
    for (const word of descWords) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > contentWidth - 10) {
            ctx.fillText(line.trim(), contentX, lineY);
            line = word + ' ';
            lineY += lh;
        } else {
            line = testLine;
        }
    }
    if (line.trim()) {
        ctx.fillText(line.trim(), contentX, lineY);
        lineY += lh;
    }
    lineY += 10;

    // Type-specific content
    if (infoPopup.type === 'damageType' && content.effectiveness) {
        ctx.fillStyle = '#0f0';
        ctx.font = '12px monospace';
        ctx.fillText('vs Armor Types:', contentX, lineY);
        lineY += lh + 5;

        ctx.font = '11px monospace';
        for (const eff of content.effectiveness) {
            ctx.fillStyle = '#888';
            ctx.fillText(`  ${eff.armor}:`, contentX, lineY);
            ctx.fillStyle = eff.color;
            ctx.fillText(eff.modifier, contentX + 100, lineY);
            lineY += lh;
        }

        if (content.note) {
            lineY += 10;
            ctx.fillStyle = '#f39c12';
            ctx.font = '10px monospace';
            const noteWords = content.note.split(' ');
            line = '';
            for (const word of noteWords) {
                const testLine = line + word + ' ';
                if (ctx.measureText(testLine).width > contentWidth - 10) {
                    ctx.fillText(line.trim(), contentX, lineY);
                    line = word + ' ';
                    lineY += lh - 2;
                } else {
                    line = testLine;
                }
            }
            if (line.trim()) ctx.fillText(line.trim(), contentX, lineY);
        }
    }

    if (infoPopup.type === 'armorType' && content.resistances) {
        ctx.fillStyle = '#0f0';
        ctx.font = '12px monospace';
        ctx.fillText('Damage Resistance:', contentX, lineY);
        lineY += lh + 5;

        ctx.font = '11px monospace';
        for (const res of content.resistances) {
            ctx.fillStyle = '#888';
            ctx.fillText(`  ${res.type}:`, contentX, lineY);
            ctx.fillStyle = res.color;
            ctx.fillText(res.modifier, contentX + 80, lineY);
            lineY += lh;
        }

        if (content.examples) {
            lineY += 10;
            ctx.fillStyle = '#888';
            ctx.fillText('Examples:', contentX, lineY);
            lineY += lh;
            ctx.fillStyle = '#aaa';
            ctx.fillText(`  ${content.examples}`, contentX, lineY);
        }
    }

    if (infoPopup.type === 'element') {
        if (content.strengths) {
            ctx.fillStyle = '#27ae60';
            ctx.font = '12px monospace';
            ctx.fillText('Strong vs:', contentX, lineY);
            lineY += lh;
            ctx.fillStyle = '#aaa';
            ctx.font = '11px monospace';
            ctx.fillText(`  ${content.strengths.join(', ')}`, contentX, lineY);
            lineY += lh + 5;
        }

        if (content.weaknesses) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '12px monospace';
            ctx.fillText('Weak vs:', contentX, lineY);
            lineY += lh;
            ctx.fillStyle = '#aaa';
            ctx.font = '11px monospace';
            ctx.fillText(`  ${content.weaknesses.join(', ')}`, contentX, lineY);
            lineY += lh + 5;
        }

        if (content.effects) {
            lineY += 5;
            ctx.fillStyle = '#f39c12';
            ctx.font = '11px monospace';
            ctx.fillText('Effects:', contentX, lineY);
            lineY += lh;
            ctx.fillStyle = '#aaa';
            const effectWords = content.effects.split(' ');
            line = '  ';
            for (const word of effectWords) {
                const testLine = line + word + ' ';
                if (ctx.measureText(testLine).width > contentWidth - 10) {
                    ctx.fillText(line.trim(), contentX, lineY);
                    line = '  ' + word + ' ';
                    lineY += lh;
                } else {
                    line = testLine;
                }
            }
            if (line.trim()) ctx.fillText(line.trim(), contentX, lineY);
        }
    }

    if (infoPopup.type === 'behavior' && content.traits) {
        ctx.fillStyle = '#0f0';
        ctx.font = '12px monospace';
        ctx.fillText('Traits:', contentX, lineY);
        lineY += lh + 5;

        ctx.font = '11px monospace';
        ctx.fillStyle = '#aaa';
        for (const trait of content.traits) {
            ctx.fillText(`  • ${trait}`, contentX, lineY);
            lineY += lh;
        }
    }

    // Footer
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('Click outside or ESC to close', popupX + popupWidth / 2, popupY + popupHeight - 10);
}

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

    // Element with color and info link
    const element = enemy.element || 'physical';
    const elemColor = ELEMENT_COLORS[element] || '#ccc';
    ctx.fillStyle = '#888';
    ctx.font = '13px monospace';
    ctx.fillText('Element:', x, lineY);
    drawInfoLink(ctx, element.charAt(0).toUpperCase() + element.slice(1), x + 70, lineY, 'element', element, elemColor);
    ctx.font = '13px monospace'; // Reset font after drawInfoLink
    lineY += lh + 5;

    // Base Attack section
    ctx.fillStyle = '#0f0';
    ctx.fillText('Base Attack', x, lineY);
    lineY += lh;

    // Get damage type (blade, blunt, pierce, magic)
    const damageType = monsterData?.damageType || enemy.damageType || 'blunt';
    const attackRange = monsterData?.attackRange || enemy.combat?.attackRange || 1;

    // Damage type colors
    const damageTypeColors = {
        'blade': '#c0c0c0',   // Silver
        'blunt': '#cd7f32',   // Bronze
        'pierce': '#87ceeb',  // Sky blue
        'magic': '#9b59b6'    // Purple
    };

    ctx.fillStyle = '#888';
    ctx.fillText('  Type:', x, lineY);
    drawInfoLink(ctx, damageType.charAt(0).toUpperCase() + damageType.slice(1), x + 55, lineY, 'damageType', damageType, damageTypeColors[damageType] || '#aaa');
    ctx.font = '13px monospace'; // Reset font after drawInfoLink
    lineY += lh;

    ctx.fillStyle = '#aaa';
    ctx.fillText(`  Range: ${attackRange} tile${attackRange > 1 ? 's' : ''}`, x, lineY);
    lineY += lh + 5;

    // Combat stats in two columns
    const col1X = x;
    const col2X = x + width / 2;

    ctx.fillStyle = '#aaa';
    ctx.fillText(`Crit: 5%`, col1X, lineY);
    ctx.fillText(`Dodge: 0%`, col2X, lineY);
    lineY += lh;

    // Armor type with info link
    const armorType = enemy.armorType || monsterData?.armorType || 'unarmored';
    ctx.fillStyle = '#888';
    ctx.fillText('Armor:', col1X, lineY);
    drawInfoLink(ctx, armorType.charAt(0).toUpperCase() + armorType.slice(1), col1X + 55, lineY, 'armorType', armorType, '#aaa');
    ctx.font = '13px monospace'; // Reset font after drawInfoLink
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

    // Behavior type with info link
    ctx.fillStyle = '#888';
    ctx.font = '13px monospace';
    ctx.fillText('Behavior:', x, lineY);
    const behaviorType = enemy.behaviorType || enemy.behavior?.type || 'territorial';
    const behaviorColors = {
        'aggressive': '#e74c3c',
        'territorial': '#f39c12',
        'defensive': '#3498db',
        'passive': '#27ae60',
        'ambusher': '#9b59b6',
        'swarm': '#e67e22'
    };
    drawInfoLink(ctx, behaviorType.charAt(0).toUpperCase() + behaviorType.slice(1), x + 80, lineY, 'behavior', behaviorType, behaviorColors[behaviorType] || '#aaa');
    ctx.font = '13px monospace'; // Reset font after drawInfoLink
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
 * Handle clicks on inspect popup tabs and info links
 */
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();

    // Scale click coordinates to match canvas internal dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const infoPopup = getInfoPopup();
    const inspectPopup = getInspectPopup();

    // Popup dimensions (must match renderInspectPopup/renderInfoPopup)
    const popupWidth = 300;
    const popupHeight = 400;
    const margin = 20;
    const popupX = canvas.width - popupWidth - margin;
    const popupY = canvas.height - popupHeight - margin;

    // If info popup is visible, check for close (click outside)
    if (infoPopup.visible) {
        if (clickX < popupX || clickX > popupX + popupWidth ||
            clickY < popupY || clickY > popupY + popupHeight) {
            // Click outside popup - close info popup
            window.infoPopup.visible = false;
        }
        return; // Don't process other clicks while info popup is open
    }

    // Handle inspect popup interactions
    if (!inspectPopup.visible) return;

    // Check if click is within popup
    if (clickX < popupX || clickX > popupX + popupWidth ||
        clickY < popupY || clickY > popupY + popupHeight) {
        return; // Click outside popup, ignore
    }

    // Check if click is on an info link
    const clickedLink = getInfoLinkAtPoint(clickX, clickY);
    if (clickedLink) {
        // Open info popup with this link's data
        window.infoPopup = {
            visible: true,
            type: clickedLink.type,
            data: clickedLink.data
        };
        return;
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
 * Handle ESC key to close info popup
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const infoPopup = getInfoPopup();
        if (infoPopup.visible) {
            window.infoPopup.visible = false;
            e.preventDefault();
            e.stopPropagation();
        }
    }
});

/**
 * Add this to your main render loop
 * Call after rendering the game world but before UI overlays
 */
function renderUIOverlays(ctx) {
    // Clear info link regions for this frame
    clearInfoLinks();

    // Skills UI: Action bar and tooltips
    if (typeof renderSkillsUI === 'function') {
        renderSkillsUI(ctx);
    }

    // Context menu and inspect popup
    renderContextMenu(ctx);

    // Check if info popup should be shown (replaces inspect panel temporarily)
    const infoPopup = getInfoPopup();
    if (infoPopup.visible) {
        renderInfoPopup(ctx);
    } else {
        renderInspectPopup(ctx);
    }
}

// Export for use in renderer
window.renderUIOverlays = renderUIOverlays;