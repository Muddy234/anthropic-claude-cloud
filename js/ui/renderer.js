// Create canvas element
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Optimize for pixel art
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Export canvas and ctx for other UI components
window.canvas = canvas;
window.ctx = ctx;

// Handle window resizing
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Resize particle canvas overlay to match
    if (typeof ParticleCanvas !== 'undefined') {
        ParticleCanvas.resize();
    }
});

// Shared color constants
const RARITY_COLORS = {
    'common': '#ffffff',
    'uncommon': '#2ecc71',
    'rare': '#3498db',
    'epic': '#e67e22'
};

const ELEMENT_COLORS = {
    'FIRE': '#ff6b35', 'ICE': '#3498db', 'WATER': '#5dade2',
    'EARTH': '#8b4513', 'NATURE': '#27ae60', 'DARK': '#9b59b6',
    'HOLY': '#f1c40f', 'DEATH': '#666', 'ARCANE': '#e67e22',
    'PHYSICAL': '#ccc'
};

function drawInventoryOverlay() {
    // Initialize scroll offsets if not exists
    if (!game.inventoryScroll) {
        game.inventoryScroll = [0, 0, 0, 0, 0]; // One for each tab
    }
    if (typeof game.selectedItemIndex === 'undefined') {
        game.selectedItemIndex = 0;
    }

    // Get colors from design system
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        bgDarkest: '#0a0a0f',
        bgDark: '#12121a',
        bgMedium: '#1a1a24',
        border: '#3a3a4a',
        gold: '#d4af37',
        corruption: '#8e44ad',
        health: '#c0392b',
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
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);

    const cx = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH) / 2;
    const cy = canvas.height / 2;

    // Scale panel to fit screen if necessary
    const maxW = canvas.width - TRACKER_WIDTH - 40;
    const maxH = canvas.height - 40;
    const w = Math.min(1000, maxW), h = Math.min(700, maxH);
    const x = Math.max(TRACKER_WIDTH + 20, cx - w / 2);
    const y = Math.max(20, cy - h / 2);
    const radius = 8;

    // Use shared panel drawing if available
    if (typeof drawOverlayPanel === 'function') {
        drawOverlayPanel(ctx, x, y, w, h, colors);
    } else {
        // Fallback panel
        ctx.fillStyle = colors.bgDark;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }

    // Updated tabs - CotDG style
    const tabs = ['WEAPONS', 'ARMOR', 'CONSUME', 'ITEMS', 'EQUIPPED'];
    const tabW = w / tabs.length;
    const tabH = 36;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < tabs.length; i++) {
        const tx = x + i * tabW;
        const isActive = game.inventoryTab === i;

        // Tab background
        if (isActive) {
            const tabGrad = ctx.createLinearGradient(tx, y, tx, y + tabH);
            tabGrad.addColorStop(0, colors.gold || '#d4af37');
            tabGrad.addColorStop(1, '#8b6914');
            ctx.fillStyle = tabGrad;
        } else {
            ctx.fillStyle = colors.bgMedium || '#1a1a24';
        }
        ctx.fillRect(tx + 2, y + 2, tabW - 4, tabH - 4);

        // Tab border
        ctx.strokeStyle = isActive ? (colors.gold || '#d4af37') : (colors.border || '#3a3a4a');
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 2, y + 2, tabW - 4, tabH - 4);

        // Tab text
        ctx.fillStyle = isActive ? (colors.bgDarkest || '#0a0a0f') : (colors.textMuted || '#888');
        ctx.fillText(tabs[i], tx + tabW / 2, y + 23);
    }

    const contentY = y + 60;

    if (game.inventoryTab === 4) {
        // EQUIPPED TAB - unchanged
        const contentX = x + 20;
        let lineY = contentY;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.font = '18px monospace';

        const eq = game.player.equipped;
        const slots = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'MAIN', 'OFF'];
        slots.forEach((slot, idx) => {
            ctx.fillStyle = '#f1c40f';
            ctx.fillText(`[${idx + 1}] ${slot}:`, contentX, lineY);
            const itemName = eq[slot] ? eq[slot].name : 'Empty';
            ctx.fillStyle = eq[slot] ? '#fff' : '#666';
            ctx.fillText(itemName, contentX + 200, lineY);
            lineY += 30;
        });

        let totalBonus = { str: 0, agi: 0, int: 0, pDef: 0, mDef: 0 };
        Object.values(eq).forEach(item => {
            if (item) {
                totalBonus.str += item.str || 0;
                totalBonus.agi += item.agi || 0;
                totalBonus.int += item.int || 0;
                totalBonus.pDef += item.pDef || 0;
                totalBonus.mDef += item.mDef || 0;
            }
        });

        lineY += 20;
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('EQUIPMENT BONUSES', cx, lineY);
        lineY += 40;
        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        ctx.textAlign = 'left';
        const statX = x + 80;
        const formatBonus = (val) => val > 0 ? `+${val}` : `${val}`;
        ctx.fillStyle = totalBonus.str !== 0 ? (totalBonus.str > 0 ? '#2ecc71' : '#e74c3c') : '#888';
        ctx.fillText(`Strength:         ${formatBonus(totalBonus.str)}`, statX, lineY);
        lineY += 35;
        ctx.fillStyle = totalBonus.agi !== 0 ? (totalBonus.agi > 0 ? '#2ecc71' : '#e74c3c') : '#888';
        ctx.fillText(`Agility:          ${formatBonus(totalBonus.agi)}`, statX, lineY);
        lineY += 35;
        ctx.fillStyle = totalBonus.int !== 0 ? (totalBonus.int > 0 ? '#2ecc71' : '#e74c3c') : '#888';
        ctx.fillText(`Intelligence:     ${formatBonus(totalBonus.int)}`, statX, lineY);
        lineY += 35;
        ctx.fillStyle = totalBonus.pDef !== 0 ? (totalBonus.pDef > 0 ? '#2ecc71' : '#e74c3c') : '#888';
        ctx.fillText(`Physical Defense: ${formatBonus(totalBonus.pDef)}`, statX, lineY);
        lineY += 35;
        ctx.fillStyle = totalBonus.mDef !== 0 ? (totalBonus.mDef > 0 ? '#2ecc71' : '#e74c3c') : '#888';
        ctx.fillText(`Magic Defense:    ${formatBonus(totalBonus.mDef)}`, statX, lineY);
        ctx.fillStyle = '#888';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press [Number] to Unequip Item', cx, y + h - 20);
    } else {
        // WEAPONS, ARMOR, CONSUMABLES, ITEMS TABS - NEW SPLIT SCREEN LAYOUT
        const types = ['weapon', 'armor', 'consumable', 'material'];
        const targetType = types[game.inventoryTab];
        const filteredItems = game.player.inventory.filter(i => i.type === targetType);

        // Split screen: 40% list, 60% inspect
        const listW = w * 0.4;
        const inspectW = w * 0.6;
        const listX = x + 20;
        const inspectX = x + listW + 20;

        // Draw divider
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + listW, y + 40);
        ctx.lineTo(x + listW, y + h);
        ctx.stroke();

        if (filteredItems.length === 0) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#888';
            ctx.font = '18px monospace';
            ctx.fillText('No items in this category', x + listW / 2, cy);
        } else {
            // Ensure selected index is valid
            if (game.selectedItemIndex >= filteredItems.length) {
                game.selectedItemIndex = filteredItems.length - 1;
            }
            if (game.selectedItemIndex < 0) {
                game.selectedItemIndex = 0;
            }

            // Scrolling: keep selected item in view
            const itemsPerPage = 15;
            const scrollOffset = game.inventoryScroll[game.inventoryTab];
            const maxScroll = Math.max(0, filteredItems.length - itemsPerPage);

            // Auto-scroll to keep selection visible
            if (game.selectedItemIndex < scrollOffset) {
                game.inventoryScroll[game.inventoryTab] = game.selectedItemIndex;
            } else if (game.selectedItemIndex >= scrollOffset + itemsPerPage) {
                game.inventoryScroll[game.inventoryTab] = game.selectedItemIndex - itemsPerPage + 1;
            }

            const startIdx = Math.max(0, Math.min(game.inventoryScroll[game.inventoryTab], maxScroll));
            const visibleItems = filteredItems.slice(startIdx, startIdx + itemsPerPage);

            // Draw item list with scrollbar
            ctx.textAlign = 'left';
            ctx.font = '18px monospace';
            const itemHeight = 35;

            visibleItems.forEach((item, idx) => {
                const realIdx = startIdx + idx;
                const isSelected = realIdx === game.selectedItemIndex;
                const itemY = contentY + idx * itemHeight;

                // Highlight selected item
                if (isSelected) {
                    ctx.fillStyle = '#3498db';
                    ctx.fillRect(listX - 10, itemY - 22, listW - 20, itemHeight - 2);
                }

                // Get item data for rarity
                const itemData = EQUIPMENT_DATA[item.name] || ITEMS_DATA[item.name] || item;
                const rarity = itemData.rarity || 'common';

                ctx.fillStyle = RARITY_COLORS[rarity] || '#ffffff';
                ctx.font = isSelected ? 'bold 18px monospace' : '18px monospace';
                ctx.fillText(`${item.name}`, listX, itemY);

                // Show count if stackable
                if (item.count > 1) {
                    ctx.fillStyle = '#888';
                    ctx.font = '14px monospace';
                    ctx.textAlign = 'right';
                    ctx.fillText(`x${item.count}`, listX + listW - 40, itemY);
                    ctx.textAlign = 'left';
                }
            });

            // Draw scrollbar if needed
            if (filteredItems.length > itemsPerPage) {
                const scrollBarH = (itemsPerPage / filteredItems.length) * (itemsPerPage * itemHeight);
                const scrollBarY = contentY + (startIdx / filteredItems.length) * (itemsPerPage * itemHeight);
                ctx.fillStyle = '#555';
                ctx.fillRect(x + listW - 15, contentY, 10, itemsPerPage * itemHeight);
                ctx.fillStyle = '#3498db';
                ctx.fillRect(x + listW - 15, scrollBarY, 10, scrollBarH);
            }

            // Draw inspect panel for selected item
            const selectedItem = filteredItems[game.selectedItemIndex];
            if (selectedItem) {
                drawItemInspectPanel(selectedItem, inspectX, contentY, inspectW, h - 100, targetType);
            }
        }

        ctx.fillStyle = '#888';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Use [Up/Down] to Scroll | [Left/Right] to Switch Tabs | [E] Close', cx, y + h - 20);
    }
}

function drawItemInspectPanel(item, x, y, w, h, itemType) {
    const itemData = EQUIPMENT_DATA[item.name] || ITEMS_DATA[item.name] || item;
    let dy = y;

    // Item name with rarity color
    const rarity = itemData.rarity || 'common';
    ctx.fillStyle = RARITY_COLORS[rarity] || '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(item.name.toUpperCase(), x + w / 2, dy);
    dy += 30;

    // Rarity and type
    ctx.fillStyle = '#888';
    ctx.font = '16px monospace';
    ctx.fillText(`${rarity.toUpperCase()} ${itemType.toUpperCase()}`, x + w / 2, dy);
    dy += 40;

    // Description if available
    if (itemData.description) {
        ctx.fillStyle = '#ccc';
        ctx.font = 'italic 16px monospace';
        ctx.textAlign = 'left';
        const words = itemData.description.split(' ');
        let line = '';
        for (let word of words) {
            if (ctx.measureText(line + word).width > w - 40) {
                ctx.fillText(line, x + 20, dy);
                line = word + ' ';
                dy += 20;
            } else {
                line += word + ' ';
            }
        }
        ctx.fillText(line, x + 20, dy);
        dy += 40;
    }

    // Find currently equipped item in same slot (used by both sections)
    const slot = itemData.slot || 'MAIN';
    const equippedItem = game.player.equipped[slot];
    const equippedData = equippedItem ? (EQUIPMENT_DATA[equippedItem.name] || equippedItem) : null;

    // WEAPON-SPECIFIC STATS (for weapons only)
    if (itemType === 'weapon') {
        ctx.fillStyle = '#e67e22';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WEAPON STATS', x + w / 2, dy);
        dy += 25;

        ctx.font = '14px monospace';
        ctx.textAlign = 'left';

        // Damage
        const thisDmg = itemData.stats?.damage || 0;
        const equippedDmg = equippedData?.stats?.damage || 0;
        ctx.fillStyle = '#fff';
        ctx.fillText('Damage:', x + 20, dy);
        ctx.textAlign = 'right';
        ctx.fillStyle = thisDmg > equippedDmg ? '#2ecc71' : thisDmg < equippedDmg ? '#e74c3c' : '#fff';
        ctx.fillText(`${thisDmg}`, x + w / 2 - 20, dy);
        ctx.fillStyle = '#888';
        ctx.fillText(`(${equippedDmg})`, x + w - 20, dy);
        dy += 20;

        // Speed (lower is better)
        ctx.textAlign = 'left';
        const thisSpeed = itemData.stats?.speed || 1.0;
        const equippedSpeed = equippedData?.stats?.speed || 1.0;
        ctx.fillStyle = '#fff';
        ctx.fillText('Speed:', x + 20, dy);
        ctx.textAlign = 'right';
        ctx.fillStyle = thisSpeed < equippedSpeed ? '#2ecc71' : thisSpeed > equippedSpeed ? '#e74c3c' : '#fff';
        ctx.fillText(`${thisSpeed.toFixed(1)}x`, x + w / 2 - 20, dy);
        ctx.fillStyle = '#888';
        ctx.fillText(`(${equippedSpeed.toFixed(1)}x)`, x + w - 20, dy);
        dy += 20;

        // Range
        ctx.textAlign = 'left';
        const thisRange = itemData.stats?.range || 1;
        const equippedRange = equippedData?.stats?.range || 1;
        ctx.fillStyle = '#fff';
        ctx.fillText('Range:', x + 20, dy);
        ctx.textAlign = 'right';
        ctx.fillStyle = thisRange > equippedRange ? '#2ecc71' : thisRange < equippedRange ? '#e74c3c' : '#fff';
        ctx.fillText(`${thisRange}`, x + w / 2 - 20, dy);
        ctx.fillStyle = '#888';
        ctx.fillText(`(${equippedRange})`, x + w - 20, dy);
        dy += 20;

        // Element
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText('Element:', x + 20, dy);
        ctx.textAlign = 'right';
        const thisElement = (itemData.element || 'physical').toUpperCase();
        ctx.fillStyle = ELEMENT_COLORS[thisElement] || '#fff';
        ctx.fillText(thisElement, x + w - 20, dy);
        dy += 20;

        // Weapon Type & Damage Type
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText('Type:', x + 20, dy);
        ctx.textAlign = 'right';
        ctx.fillText(`${(itemData.weaponType || 'melee').toUpperCase()}`, x + w - 20, dy);
        dy += 20;

        ctx.textAlign = 'left';
        ctx.fillText('Dmg Type:', x + 20, dy);
        ctx.textAlign = 'right';
        ctx.fillText(`${(itemData.damageType || 'slash').toUpperCase()}`, x + w - 20, dy);
        dy += 30;
    }

    // CHARACTER STATS COMPARISON (for weapons and armor)
    if (itemType === 'weapon' || itemType === 'armor') {
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CHARACTER STATS', x + w / 2, dy);
        dy += 25;

        // Stats to compare
        const stats = ['STR', 'AGI', 'INT', 'P.DEF', 'M.DEF'];
        const statProps = ['str', 'agi', 'int', 'pDef', 'mDef'];

        ctx.font = '14px monospace';
        ctx.textAlign = 'left';

        // Draw each stat
        statProps.forEach((prop, idx) => {
            const thisStat = itemData.stats?.[prop] || itemData[prop] || 0;
            const equippedStat = equippedData?.stats?.[prop] || equippedData?.[prop] || 0;
            const diff = thisStat - equippedStat;

            ctx.textAlign = 'left';
            ctx.fillStyle = '#fff';
            ctx.fillText(`${stats[idx]}:`, x + 20, dy);

            ctx.textAlign = 'right';
            // This item's stat
            ctx.fillStyle = diff > 0 ? '#2ecc71' : diff < 0 ? '#e74c3c' : '#fff';
            ctx.fillText(thisStat.toString(), x + w / 2 - 20, dy);

            // Equipped item's stat
            ctx.fillStyle = '#888';
            ctx.fillText(`(${equippedStat})`, x + w - 20, dy);

            dy += 20;
        });

        dy += 20;
    }

    // Favor value (for altar sacrifice)
    ctx.fillStyle = '#9b59b6';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    const favorVal = itemData.favorValue || getFavorValue(itemData);
    ctx.fillText(`Favor: ${favorVal} HP`, x + w / 2, dy);
    dy += 40;

    // Action button
    ctx.textAlign = 'center';
    const buttonY = y + h - 50;
    const buttonW = 200;
    const buttonH = 40;
    const buttonX = x + w / 2 - buttonW / 2;

    // Determine button text and availability
    let buttonText = '';
    let buttonAvailable = true;

    if (itemType === 'consumable') {
        buttonText = 'USE';
    } else if (itemType === 'weapon' || itemType === 'armor') {
        buttonText = 'EQUIP';
    } else {
        buttonAvailable = false; // No button for materials
    }

    if (buttonAvailable) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(buttonX, buttonY, buttonW, buttonH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonW, buttonH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`[SPACE] ${buttonText}`, x + w / 2, buttonY + 27);
    }
}

function drawLevelUpScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2; const cy = canvas.height / 2; const y = cy - 200;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'; ctx.fillText(`Level ${game.player.level} Reached!`, cx, y);
    if (game.levelUpData) {
        let ly = y + 80; ctx.font = '24px monospace'; ctx.fillText(`Attribute Points: ${game.levelUpData.attributePoints}`, cx, ly); ly += 50;
        const stats = game.levelUpData.tempStats;
        const labels = [`[1] STR: ${stats.STR} (Phys Dmg, Def)`, `[2] AGI: ${stats.AGI} (Crit, Dodge, Spd)`, `[3] INT: ${stats.INT} (Mag Dmg, Mana, M.Def)`, `[4] STA: ${stats.STA} (HP, Stamina, Regen)`];
        ctx.textAlign = 'left'; const lx = cx - 200; for (const l of labels) { ctx.fillStyle = '#fff'; ctx.fillText(l, lx, ly); ly += 40; }
        ly += 40; ctx.textAlign = 'center';
        if (game.levelUpData.attributePoints === 0) { ctx.fillStyle = '#2ecc71'; ctx.fillText('[SPACE] CONFIRM', cx, ly); } else { ctx.fillStyle = '#888'; ctx.fillText('Spend all points to confirm', cx, ly); }
    }
}

// ============================================================================
// ATMOSPHERIC FOG OF WAR SYSTEM
// ============================================================================
// ALL explored areas remain visible - just dimmed/desaturated outside torchlight
// Smooth 2-tile gradient from torch edge to dimmed zone
// ============================================================================

// Ambient fog color (blue-grey instead of pure black)
const FOG_COLOR = { r: 26, g: 26, b: 45 }; // #1a1a2d

// Torchlight warm glow color (orange/amber)
const TORCH_COLOR = { r: 255, g: 147, b: 41 }; // Warm orange #ff9329

// Visibility settings
const MIN_BRIGHTNESS = 0.55; // 55% brightness outside torch (45% dimmed)
const FADE_DISTANCE = 2; // 2 tile gradient from torch edge

/**
 * Calculate tile brightness based on distance from player AND light sources
 * Returns brightness value based on the strongest light affecting the tile
 * @param {number} tileX - Tile X position
 * @param {number} tileY - Tile Y position
 * @returns {number} - Brightness from MIN_BRIGHTNESS to 1.0
 */
function getTileBrightness(tileX, tileY) {
    let maxBrightness = MIN_BRIGHTNESS;

    // Player's personal torch light (dimmer than placed light sources)
    // This is separate from LightSourceSystem - it's the basic visibility the player always has
    const PLAYER_TORCH_INTENSITY = 0.75; // Dimmer than campfire (0.9) so placed fires are brighter

    if (game.player) {
        const playerX = game.player.gridX;
        const playerY = game.player.gridY;

        // Get torch/vision radius
        const torchRadius = typeof VisionSystem !== 'undefined'
            ? VisionSystem.getPlayerVisionRange()
            : 4;

        // Calculate distance from player
        const dx = tileX - playerX;
        const dy = tileY - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Inside torch radius
        if (distance <= torchRadius) {
            maxBrightness = Math.max(maxBrightness, PLAYER_TORCH_INTENSITY);
        } else {
            // In fade zone = smooth gradient
            const fadeStart = torchRadius;
            const fadeEnd = torchRadius + FADE_DISTANCE;

            if (distance < fadeEnd) {
                const fadeProgress = (distance - fadeStart) / FADE_DISTANCE;
                const smoothProgress = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
                const brightness = PLAYER_TORCH_INTENSITY - (smoothProgress * (PLAYER_TORCH_INTENSITY - MIN_BRIGHTNESS));
                maxBrightness = Math.max(maxBrightness, brightness);
            }
        }
    }

    // Check all active light sources from LightSourceSystem
    if (typeof LightSourceSystem !== 'undefined') {
        const sources = LightSourceSystem.getActiveSources();
        for (const source of sources) {
            // Skip player light (already handled above)
            if (source.type === 'player' || source.attachedTo === game.player) continue;

            // Get source position (handle attached sources)
            let sourceX = source.gridX;
            let sourceY = source.gridY;
            if (source.attachedTo) {
                sourceX = source.attachedTo.displayX ?? source.attachedTo.gridX ?? sourceX;
                sourceY = source.attachedTo.displayY ?? source.attachedTo.gridY ?? sourceY;
            }

            // Calculate distance from light source
            const dx = tileX - sourceX;
            const dy = tileY - sourceY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Apply flicker multiplier from LightSourceSystem for organic variation
            const flickerMultiplier = LightSourceSystem.getSourceFlicker(source);
            const effectiveRadius = (source.radius || 5) * flickerMultiplier;
            const effectiveIntensity = (source.intensity || 1.0) * flickerMultiplier;

            // Inside light radius
            if (distance <= effectiveRadius) {
                // Smooth falloff from center
                const t = distance / effectiveRadius;
                const smoothFalloff = 1 - (t * t * (3 - 2 * t)); // Smoothstep
                const brightness = MIN_BRIGHTNESS + (effectiveIntensity - MIN_BRIGHTNESS) * smoothFalloff;
                maxBrightness = Math.max(maxBrightness, brightness);
            } else {
                // Fade zone for light sources
                const fadeEnd = effectiveRadius + FADE_DISTANCE;
                if (distance < fadeEnd) {
                    const fadeProgress = (distance - effectiveRadius) / FADE_DISTANCE;
                    const smoothProgress = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
                    const brightness = effectiveIntensity - (smoothProgress * (effectiveIntensity - MIN_BRIGHTNESS));
                    maxBrightness = Math.max(maxBrightness, brightness);
                }
            }
        }
    }

    return Math.min(1.0, maxBrightness);
}

/**
 * Get the dim overlay alpha for a tile (inverse of brightness)
 * @param {number} tileX - Tile X position
 * @param {number} tileY - Tile Y position
 * @returns {number} - Alpha for fog overlay (0 = no fog, higher = more dimmed)
 */
function getTileDimAmount(tileX, tileY) {
    const brightness = getTileBrightness(tileX, tileY);
    // Convert brightness to dim amount
    // brightness 1.0 = dim 0, brightness 0.55 = dim 0.45
    return 1.0 - brightness;
}

// Export for use by other renderers
window.getTileBrightness = getTileBrightness;
window.getTileDimAmount = getTileDimAmount;

/**
 * Render warm torchlight glow around the player
 * Glow blends into the dimmed areas using the same gradient
 */
function renderTorchlightGlow(ctx, player, camX, camY, tileSize, offsetX) {
    const torchRadius = typeof VisionSystem !== 'undefined'
        ? VisionSystem.getPlayerVisionRange()
        : 4;

    const playerScreenX = (player.displayX - camX) * tileSize + offsetX;
    const playerScreenY = (player.displayY - camY) * tileSize;

    // Get flicker for animated glow
    let flickerMultiplier = 1.0;
    if (typeof LightSourceSystem !== 'undefined') {
        flickerMultiplier = 1 + LightSourceSystem.flickerOffset * 0.2;
    }

    // Glow extends to the fade zone edge
    const glowRadius = (torchRadius + FADE_DISTANCE) * tileSize * flickerMultiplier;

    // Create radial gradient for warm glow
    const gradient = ctx.createRadialGradient(
        playerScreenX, playerScreenY, 0,
        playerScreenX, playerScreenY, glowRadius
    );

    // Warm orange glow that follows the same falloff as brightness
    const intensity = 0.2 * flickerMultiplier;
    const torchEdge = torchRadius / (torchRadius + FADE_DISTANCE); // Where torch radius ends in gradient

    gradient.addColorStop(0, `rgba(${TORCH_COLOR.r}, ${TORCH_COLOR.g}, ${TORCH_COLOR.b}, ${intensity})`);
    gradient.addColorStop(torchEdge * 0.5, `rgba(${TORCH_COLOR.r}, ${TORCH_COLOR.g}, ${TORCH_COLOR.b}, ${intensity * 0.8})`);
    gradient.addColorStop(torchEdge, `rgba(${TORCH_COLOR.r}, ${TORCH_COLOR.g}, ${TORCH_COLOR.b}, ${intensity * 0.5})`);
    gradient.addColorStop(1, `rgba(${TORCH_COLOR.r}, ${TORCH_COLOR.g}, ${TORCH_COLOR.b}, 0)`);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(playerScreenX - glowRadius, playerScreenY - glowRadius, glowRadius * 2, glowRadius * 2);
    ctx.restore();
}

/**
 * Apply fog overlay and torchlight effects
 */
function applyRadialFogOverlay(ctx, player, camX, camY, tileSize, offsetX, viewW, viewH) {
    // Render warm torchlight glow
    renderTorchlightGlow(ctx, player, camX, camY, tileSize, offsetX);

    // Render light source cookie textures for organic shapes
    if (typeof LightSourceSystem !== 'undefined' && LightSourceSystem.config.useCookieTextures) {
        renderLightCookies(ctx, camX, camY, tileSize, offsetX);
    }
}

/**
 * Render cookie textures for each active light source
 * Creates irregular, organic light shapes instead of perfect circles
 */
function renderLightCookies(ctx, camX, camY, tileSize, offsetX) {
    if (typeof LightSourceSystem === 'undefined') return;

    const sources = LightSourceSystem.getActiveSources();

    ctx.save();
    // Use 'destination-out' to carve out lighter areas in the fog
    ctx.globalCompositeOperation = 'destination-out';

    sources.forEach(source => {
        if (!source.active || !source.flicker) return;

        // Get source position
        let srcX = source.gridX;
        let srcY = source.gridY;
        if (source.attachedTo) {
            srcX = source.attachedTo.gridX ?? source.attachedTo.x ?? srcX;
            srcY = source.attachedTo.gridY ?? source.attachedTo.y ?? srcY;
        }

        // Calculate screen position
        const screenX = (srcX - camX) * tileSize + offsetX;
        const screenY = (srcY - camY) * tileSize;

        // Get flicker multiplier for animated radius
        const flickerMultiplier = LightSourceSystem.getSourceFlicker(source);
        const effectiveRadius = source.radius * flickerMultiplier * tileSize;

        // Get cookie texture
        const cookieSize = Math.ceil(effectiveRadius * 3);
        const cookie = LightSourceSystem.getCookieTexture(source, cookieSize);

        if (cookie) {
            // Draw cookie texture centered on light source
            // The cookie texture creates irregular light edges
            ctx.globalAlpha = 0.15 * source.intensity; // Subtle effect
            ctx.drawImage(
                cookie,
                screenX - cookieSize / 2,
                screenY - cookieSize / 2,
                cookieSize,
                cookieSize
            );
        }
    });

    ctx.restore();
}

function render() {
    ctx.fillStyle = '#000'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
 if (!game.player) {
        return; // Don't render if player doesn't exist yet
    }

if (game.state === 'menu') {
        ctx.fillStyle = '#fff'; ctx.font = '64px monospace'; ctx.textAlign = 'center'; ctx.fillText('THE SHIFTING CHASM', canvas.width / 2, 400); ctx.font = '32px monospace'; ctx.fillText('Press SPACE to Start', canvas.width / 2, 500);
    } else if (game.state === 'village' || game.state === 'dialogue' || game.state === 'bank' || game.state === 'loadout' || game.state === 'shop' || game.state === 'crafting') {
        // VILLAGE STATE RENDERING
        if (typeof VillageSystem !== 'undefined' && VillageSystem.initialized) {
            VillageSystem.render(ctx);
        } else {
            // Fallback: show loading message
            ctx.fillStyle = '#fff';
            ctx.font = '24px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Loading Village...', canvas.width / 2, canvas.height / 2);
        }

        // Render overlays for bank, loadout, shop, and crafting states
        if (game.state === 'bank' && typeof BankUI !== 'undefined') {
            BankUI.render(ctx);
        }
        if (game.state === 'loadout' && typeof LoadoutUI !== 'undefined') {
            LoadoutUI.render(ctx);
        }
        if (game.state === 'shop' && typeof ShopUI !== 'undefined') {
            ShopUI.render(ctx);
        }
        if (game.state === 'crafting' && typeof CraftingUI !== 'undefined') {
            CraftingUI.render(ctx);
        }
    } else if (game.state === 'playing' || game.state === 'inventory' || game.state === 'map' || game.state === 'skills' || game.state === 'levelup' || game.state === 'character' || game.state === 'shift' || game.state === 'chest' || game.state === 'extraction') {

const effectiveTileSize = TILE_SIZE * ZOOM_LEVEL;
const viewW = canvas.width - TRACKER_WIDTH;
const viewH = canvas.height;

// Calculate player's position on screen (in pixels)
const playerScreenX = (game.player.displayX - game.camera.x) * effectiveTileSize + TRACKER_WIDTH;
const playerScreenY = (game.player.displayY - game.camera.y) * effectiveTileSize;

// Calculate screen center and deadzone bounds
const screenCenterX = TRACKER_WIDTH + viewW / 2;
const screenCenterY = viewH / 2;

const deadzoneLeft = screenCenterX - CAMERA_DEADZONE_WIDTH / 2;
const deadzoneRight = screenCenterX + CAMERA_DEADZONE_WIDTH / 2;
const deadzoneTop = screenCenterY - CAMERA_DEADZONE_HEIGHT / 2;
const deadzoneBottom = screenCenterY + CAMERA_DEADZONE_HEIGHT / 2;

// Calculate target camera position (only if player outside deadzone)
let targetCamX = game.camera.x;
let targetCamY = game.camera.y;

// Horizontal deadzone check
if (playerScreenX < deadzoneLeft) {
    // Player too far left - move camera left
    targetCamX = game.player.displayX - (deadzoneLeft - TRACKER_WIDTH) / effectiveTileSize;
} else if (playerScreenX > deadzoneRight) {
    // Player too far right - move camera right
    targetCamX = game.player.displayX - (deadzoneRight - TRACKER_WIDTH) / effectiveTileSize;
}

// Vertical deadzone check
if (playerScreenY < deadzoneTop) {
    // Player too far up - move camera up
    targetCamY = game.player.displayY - deadzoneTop / effectiveTileSize;
} else if (playerScreenY > deadzoneBottom) {
    // Player too far down - move camera down
    targetCamY = game.player.displayY - deadzoneBottom / effectiveTileSize;
}

// Smooth camera movement (lerp to target position)
game.camera.targetX = targetCamX;
game.camera.targetY = targetCamY;
game.camera.x += (game.camera.targetX - game.camera.x) * CAMERA_SMOOTHING;
game.camera.y += (game.camera.targetY - game.camera.y) * CAMERA_SMOOTHING;

// Apply screen shake offset
const shakeOffset = typeof getScreenShakeOffset === 'function' ? getScreenShakeOffset() : { x: 0, y: 0 };
const camX = game.camera.x + (shakeOffset.x / (TILE_SIZE * ZOOM_LEVEL));
const camY = game.camera.y + (shakeOffset.y / (TILE_SIZE * ZOOM_LEVEL));

        ctx.save(); ctx.beginPath(); ctx.rect(TRACKER_WIDTH, 0, viewW, canvas.height); ctx.clip();
        
        // LAYER 1: Draw floor, wall, and doorway tiles (with fog of war)
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const tile = game.map[y][x];
                const screenX = (x - camX) * effectiveTileSize + TRACKER_WIDTH;
                const screenY = (y - camY) * effectiveTileSize;

                // Skip tiles that are off-screen for performance
                if (screenX + effectiveTileSize < TRACKER_WIDTH || screenX > canvas.width ||
                    screenY + effectiveTileSize < 0 || screenY > canvas.height) {
                    continue;
                }

                // Render ALL tiles (explored or not) - fog of war just dims, doesn't hide
                if (tile.type === 'floor') {
                    drawFloorTile(ctx, tile, x, y, screenX, screenY, effectiveTileSize);
                } else if (tile.type === 'doorway') {
                    drawDoorwayTile(ctx, screenX, screenY, effectiveTileSize);
                } else if (tile.type === 'wall') {
                    drawWallTile(ctx, screenX, screenY, effectiveTileSize);
                } else if (tile.type === 'interior_wall') {
                    drawWallTile(ctx, screenX, screenY, effectiveTileSize);
                } else if (tile.type === 'void') {
                    drawVoidTile(ctx, screenX, screenY, effectiveTileSize);
                } else if (tile.type === 'lava') {
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
                    ctx.strokeStyle = '#111';
                    ctx.strokeRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
                } else if (tile.type === 'exit') {
                    ctx.fillStyle = '#0ff';
                    ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
                    ctx.strokeStyle = '#111';
                    ctx.strokeRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
                }

                // FOG OF WAR: Apply dimming overlay to ALL tiles
                // - Explored tiles: distance-based dimming (full brightness near torch, dimmed far away)
                // - Unexplored tiles: maximum dimming (same as explored tiles outside torch)
                let dimAmount;
                if (tile.explored) {
                    // Distance-based dimming for explored tiles
                    dimAmount = getTileDimAmount(x, y);
                } else {
                    // Maximum dimming for unexplored tiles (45% dimmed)
                    dimAmount = 1.0 - MIN_BRIGHTNESS;
                }

                if (dimAmount > 0.01) {
                    ctx.fillStyle = `rgba(${FOG_COLOR.r}, ${FOG_COLOR.g}, ${FOG_COLOR.b}, ${dimAmount})`;
                    ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
                }
            }
        }

        // LAYER 1.4: Apply torchlight glow effect (warm orange, doesn't block visibility)
        if (typeof applyRadialFogOverlay === 'function') {
            applyRadialFogOverlay(ctx, game.player, camX, camY, effectiveTileSize, TRACKER_WIDTH, viewW, viewH);
        }

        // NOTE: Layer 1.45 removed - single overlay above handles all dimming
        // No need for double-overlay which was making things too dark

        // NOTE: Walls rendered in Layer 1 based on game.map[y][x].type (blob-based dungeons)
        
        // LAYER 2: Draw loot piles
        if (typeof renderLootPiles === 'function') {
            renderLootPiles(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // LAYER 2.5: Draw extraction points
        if (typeof renderExtractionPoints === 'function') {
            renderExtractionPoints(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // Merchant rendering (only if visible)
        if (game.merchant) {
            const merchantTile = game.map[game.merchant.y]?.[game.merchant.x];
            if (merchantTile && merchantTile.visible) {
                const mx = (game.merchant.x - camX) * effectiveTileSize + TRACKER_WIDTH;
                const my = (game.merchant.y - camY) * effectiveTileSize;
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(mx + 10, my + 10, effectiveTileSize - 20, effectiveTileSize - 20);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 24px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('$', mx + effectiveTileSize / 2, my + effectiveTileSize / 2 + 8);
            }
        }



        // Player rendering with spritesheet animation
        const px = (game.player.displayX - camX) * effectiveTileSize + TRACKER_WIDTH;
        const py = (game.player.displayY - camY) * effectiveTileSize;
        drawPlayerSprite(ctx, px, py, effectiveTileSize);


        // Render all enemies using enemy-renderer (handles facing direction + tier indicators)
        if (typeof renderAllEnemies === 'function') {
            renderAllEnemies(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }
        // Projectiles (arrows, bolts, magic)
        if (typeof renderProjectiles === 'function') { renderProjectiles(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH); }

        // Melee slash effects (mouse-driven combat) - legacy code-based
        if (typeof drawSlashEffects === 'function') { drawSlashEffects(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH); }

        // New code-based melee slash effects (arc + particles)
        if (typeof MeleeSlashEffect !== 'undefined') {
            MeleeSlashEffect.render(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // Monster magic/ranged attack effects
        if (typeof MonsterMagicEffect !== 'undefined') {
            MonsterMagicEffect.render(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }
        if (typeof MonsterRangedEffect !== 'undefined') {
            MonsterRangedEffect.render(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // Combat effects (sprite-based slash, magic, explosions)
        if (typeof renderCombatEffects === 'function') { renderCombatEffects(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH); }

        // Particle effects (fire sparks, magic particles, etc.) - renders to separate canvas layer
        if (typeof ParticleSystemManager !== 'undefined') {
            ParticleSystemManager.render(camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        if (typeof renderDamageNumbers === 'function') { renderDamageNumbers(camX, camY, effectiveTileSize, TRACKER_WIDTH); }
        ctx.restore();

        // NEW UI: Icon sidebar (replaces old tracker)
        if (typeof renderIconSidebar === 'function') {
            renderIconSidebar(ctx, canvas.height);
        }

        // NEW UI: Unit frames (player + enemy)
        if (typeof renderUnitFrames === 'function') {
            renderUnitFrames(ctx);
        }

        // NEW UI: Mini-map (top-right)
        if (typeof renderMiniMap === 'function') {
            renderMiniMap(ctx, canvas.width);
        }

        if (!game.merchant && game.state !== 'inventory' && game.state !== 'map' && game.state !== 'skills' && game.state !== 'moveset' && game.state !== 'levelup') {
            ctx.fillStyle = '#fff'; ctx.font = '20px monospace'; ctx.textAlign = 'left'; const msgX = TRACKER_WIDTH + 20; const msgY = canvas.height - 40;
            if (game.messageLog.length > 0 && Date.now() - game.lastMessageTime < 3000) { ctx.fillText(game.messageLog[game.messageLog.length - 1].text, msgX, msgY); }
        }
    } else if (game.state === 'gameover') {
        ctx.fillStyle = '#e74c3c'; ctx.font = '64px monospace'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', canvas.width / 2, 500); ctx.fillStyle = '#fff'; ctx.font = '32px monospace'; ctx.fillText('Press SPACE to Restart', canvas.width / 2, 600);
    }
    if (typeof renderUIOverlays === 'function') { renderUIOverlays(ctx); }

    // Combat action bar (hotkeys 1-4) - Draw AFTER overlays so icons appear on top
    if (typeof drawCombatActionBar === 'function') {
        drawCombatActionBar(ctx, canvas.width, canvas.height);
    }

    // Draw popup menus LAST so they appear on top of action icons
    if (game.state === 'character' && typeof drawCharacterOverlay === 'function') drawCharacterOverlay();
    if (game.state === 'inventory') drawInventoryOverlay();
    if (game.state === 'map' && typeof drawMapOverlay === 'function') drawMapOverlay();
    if (game.state === 'shift' && typeof drawShiftOverlay === 'function') drawShiftOverlay();
    if (game.state === 'skills') drawSkillsOverlay();
    if (game.state === 'levelup') drawLevelUpScreen();
    if (game.state === 'chest' && typeof renderChestUI === 'function') renderChestUI(ctx);
    if (game.state === 'extraction' && typeof ExtractionUI !== 'undefined') ExtractionUI.render(ctx);

    // Draw shift countdown timer at top of screen
    drawShiftCountdown();
}

/**
 * Draw the shift countdown timer - CotDG Corruption Meter Style
 * Positioned at bottom-right, above action bar
 */
function drawShiftCountdown() {
    if (game.state !== 'playing') return;
    if (typeof game.shiftCountdown === 'undefined') return;

    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
        corruption: '#8e44ad',
        corruptionBright: '#9b59b6',
        corruptionDark: '#4a235a',
        bgDark: '#12121a',
        textPrimary: '#ffffff',
        healthCritical: '#ff2222'
    };

    const countdown = Math.max(0, game.shiftCountdown);
    const maxTime = game.shiftMaxTime || 300; // Default 5 minutes
    const minutes = Math.floor(countdown / 60);
    const seconds = Math.floor(countdown % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Calculate corruption percentage (inverted - more time passed = more corruption)
    const corruptionPct = 1 - (countdown / maxTime);

    // Position at bottom-right, above action bar
    const barWidth = 180;
    const barHeight = 20;
    const barX = canvas.width - barWidth - 25;
    const barY = canvas.height - 110;

    const pulse = typeof getPulseValue === 'function' ? getPulseValue(0.003) : (Math.sin(Date.now() * 0.003) + 1) / 2;

    ctx.save();

    // === CORRUPTION METER BACKGROUND ===
    ctx.fillStyle = colors.corruptionDark || '#4a235a';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // === CORRUPTION FILL (grows as time passes) ===
    if (corruptionPct > 0) {
        // Gradient fill
        const corrGrad = ctx.createLinearGradient(barX, barY, barX + barWidth * corruptionPct, barY);
        corrGrad.addColorStop(0, colors.corruptionDark || '#4a235a');
        corrGrad.addColorStop(0.5, colors.corruption || '#8e44ad');
        corrGrad.addColorStop(1, colors.corruptionBright || '#9b59b6');
        ctx.fillStyle = corrGrad;
        ctx.fillRect(barX, barY, barWidth * corruptionPct, barHeight);

        // Pulsing edge glow when filling
        if (corruptionPct > 0.1 && corruptionPct < 1) {
            const edgeX = barX + barWidth * corruptionPct;
            const glowGrad = ctx.createRadialGradient(edgeX, barY + barHeight/2, 0, edgeX, barY + barHeight/2, 15);
            glowGrad.addColorStop(0, `rgba(191, 85, 236, ${0.3 + pulse * 0.4})`);
            glowGrad.addColorStop(1, 'rgba(191, 85, 236, 0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(edgeX - 15, barY - 5, 30, barHeight + 10);
        }

        // Shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(barX, barY, barWidth * corruptionPct, barHeight / 3);
    }

    // === DANGER STATE (under 60 seconds or shift active) ===
    if (game.shiftActive || countdown <= 60) {
        // Pulsing red overlay
        const dangerPulse = (Math.sin(Date.now() * 0.008) + 1) / 2;
        ctx.fillStyle = `rgba(255, 34, 34, ${0.2 + dangerPulse * 0.3})`;
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Glowing border
        ctx.shadowColor = colors.healthCritical || '#ff2222';
        ctx.shadowBlur = 10 + dangerPulse * 10;
    }

    // === BORDER ===
    ctx.strokeStyle = game.shiftActive ? (colors.healthCritical || '#ff2222') : (colors.corruption || '#8e44ad');
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // === TIME TEXT ===
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.textPrimary || '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 3;

    if (game.shiftActive) {
        ctx.fillStyle = colors.healthCritical || '#ff2222';
        ctx.fillText('ESCAPE!', barX + barWidth / 2, barY + barHeight / 2);
    } else {
        ctx.fillText(timeStr, barX + barWidth / 2, barY + barHeight / 2);
    }

    // === LABEL ===
    ctx.shadowBlur = 0;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'left';
    ctx.fillText('SHIFT', barX, barY - 6);

    // === CORRUPTION PERCENTAGE ===
    ctx.textAlign = 'right';
    ctx.fillStyle = colors.corruptionBright || '#9b59b6';
    ctx.fillText(`${Math.floor(corruptionPct * 100)}%`, barX + barWidth, barY - 6);

    ctx.restore();

    // === SCREEN EFFECTS (corruption vignette when high) ===
    if (typeof updateScreenEffects === 'function') {
        updateScreenEffects(ctx, canvas.width, canvas.height);
    }

    // Auto-trigger corruption screen effect when danger
    if (corruptionPct > 0.8 && typeof triggerScreenEffect === 'function') {
        // Only trigger occasionally to avoid constant effect
        if (Math.random() < 0.02) {
            triggerScreenEffect('corruption', 0.15, 500);
        }
    }
}