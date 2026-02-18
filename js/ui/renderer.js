// Create canvas element
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Optimize for pixel art
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Export canvas and ctx for other UI components
window.canvas = canvas;
window.ctx = ctx;

// Dynamic zoom - calculated to maintain fixed viewport tile count
let currentZoom = typeof calculateDynamicZoom === 'function'
    ? calculateDynamicZoom(canvas.width)
    : ZOOM_LEVEL;
window.currentZoom = currentZoom;

// Handle window resizing
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Recalculate zoom for new screen size
    currentZoom = typeof calculateDynamicZoom === 'function'
        ? calculateDynamicZoom(canvas.width)
        : ZOOM_LEVEL;
    window.currentZoom = currentZoom;

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

    // Updated tabs - CotDG Stone Tablet Style
    const tabs = ['WEAPONS', 'ARMOR', 'CONSUME', 'ITEMS', 'EQUIPPED'];
    const tabW = w / tabs.length;
    const tabH = 40;

    // Get frame colors
    const frameGold = colors.frameGold || (typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGold : '#b8860b');
    const frameGoldBright = colors.frameGoldBright || (typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldBright : '#daa520');
    const frameGoldDark = colors.frameGoldDark || (typeof UI_COLORS !== 'undefined' ? UI_COLORS.frameGoldDark : '#8b6914');
    const templeStone = colors.templeStone || (typeof UI_COLORS !== 'undefined' ? UI_COLORS.templeStone : '#4a4a40');
    const templeStoneDark = colors.templeStoneDark || (typeof UI_COLORS !== 'undefined' ? UI_COLORS.templeStoneDark : '#2a2a25');

    const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY.display : 'Georgia, serif';
    ctx.textAlign = 'center';

    for (let i = 0; i < tabs.length; i++) {
        const tx = x + i * tabW + 3;
        const tw = tabW - 6;
        const isActive = game.inventoryTab === i;

        ctx.save();

        // Tab shadow (pressed effect for inactive)
        if (!isActive) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(tx + 2, y + 4, tw, tabH - 2);
        }

        // Tab background - stone texture
        if (isActive) {
            // Active: gold-highlighted stone
            const tabGrad = ctx.createLinearGradient(tx, y, tx, y + tabH);
            tabGrad.addColorStop(0, frameGoldBright);
            tabGrad.addColorStop(0.3, frameGold);
            tabGrad.addColorStop(0.7, frameGold);
            tabGrad.addColorStop(1, frameGoldDark);
            ctx.fillStyle = tabGrad;
        } else {
            // Inactive: weathered stone
            const tabGrad = ctx.createLinearGradient(tx, y, tx, y + tabH);
            tabGrad.addColorStop(0, templeStone);
            tabGrad.addColorStop(0.5, templeStoneDark);
            tabGrad.addColorStop(1, '#1a1a18');
            ctx.fillStyle = tabGrad;
        }
        ctx.fillRect(tx, y + 2, tw, tabH - 4);

        // Top highlight
        ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(tx, y + 2, tw, 2);

        // Bottom shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(tx, y + tabH - 4, tw, 2);

        // Tab border
        ctx.strokeStyle = isActive ? frameGoldBright : frameGoldDark;
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.strokeRect(tx, y + 2, tw, tabH - 4);

        // Decorative notch at top of active tab
        if (isActive) {
            ctx.fillStyle = frameGoldBright;
            const notchW = 30;
            const notchX = tx + tw / 2 - notchW / 2;
            ctx.fillRect(notchX, y, notchW, 4);

            // Small diamond indicator
            ctx.beginPath();
            ctx.moveTo(tx + tw / 2, y + tabH + 2);
            ctx.lineTo(tx + tw / 2 + 6, y + tabH - 4);
            ctx.lineTo(tx + tw / 2, y + tabH - 10);
            ctx.lineTo(tx + tw / 2 - 6, y + tabH - 4);
            ctx.closePath();
            ctx.fillStyle = colors.bgDark || '#141414';
            ctx.fill();
        }

        // Tab text with shadow
        ctx.font = `bold 13px ${fontFamily}`;

        // Text shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillText(tabs[i], tx + tw / 2 + 1, y + 26);

        // Main text
        ctx.fillStyle = isActive ? '#000' : (colors.textSecondary || '#b8a878');
        ctx.fillText(tabs[i], tx + tw / 2, y + 25);

        ctx.restore();
    }

    // Divider line below tabs
    if (typeof drawOrnateDivider === 'function') {
        drawOrnateDivider(ctx, x + 20, y + tabH + 8, w - 40, {
            color: frameGoldDark,
            colorDark: 'rgba(139, 105, 20, 0.3)',
            emblem: 'diamond',
            emblemSize: 8
        });
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

        // Draw ornate divider line between list and inspect panel
        if (typeof drawOrnateDivider === 'function') {
            // Vertical divider as series of diamonds
            const dividerX = x + listW;
            ctx.strokeStyle = frameGoldDark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dividerX, y + 55);
            ctx.lineTo(dividerX, y + h - 10);
            ctx.stroke();

            // Diamond accents along divider
            ctx.fillStyle = frameGold;
            for (let dy = y + 80; dy < y + h - 30; dy += 60) {
                ctx.beginPath();
                ctx.moveTo(dividerX, dy - 6);
                ctx.lineTo(dividerX + 4, dy);
                ctx.lineTo(dividerX, dy + 6);
                ctx.lineTo(dividerX - 4, dy);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            ctx.strokeStyle = frameGoldDark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + listW, y + 55);
            ctx.lineTo(x + listW, y + h - 10);
            ctx.stroke();
        }

        if (filteredItems.length === 0) {
            ctx.textAlign = 'center';
            ctx.fillStyle = colors.textMuted || '#706850';
            ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.body : '16px Georgia, serif';
            ctx.fillText('No items in this category', x + listW / 2, cy);

            // Empty slot indicator
            ctx.font = '40px Georgia, serif';
            ctx.fillStyle = 'rgba(184, 134, 11, 0.2)';
            ctx.fillText('?', x + listW / 2, cy - 50);
        } else {
            // Ensure selected index is valid
            if (game.selectedItemIndex >= filteredItems.length) {
                game.selectedItemIndex = filteredItems.length - 1;
            }
            if (game.selectedItemIndex < 0) {
                game.selectedItemIndex = 0;
            }

            // Scrolling: keep selected item in view
            const itemsPerPage = 14;
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

            // Draw item list with rarity borders
            const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY.body : 'Georgia, serif';
            ctx.textAlign = 'left';
            const itemHeight = 38;

            visibleItems.forEach((item, idx) => {
                const realIdx = startIdx + idx;
                const isSelected = realIdx === game.selectedItemIndex;
                const itemY = contentY + idx * itemHeight;

                // Get item data for rarity
                const itemData = (typeof getItemData === 'function' ? getItemData(item.name) : null) ||
                                (typeof EQUIPMENT_DATA !== 'undefined' ? EQUIPMENT_DATA[item.name] : null) ||
                                (typeof ITEMS_DATA !== 'undefined' ? ITEMS_DATA[item.name] : null) || item;
                const rarity = itemData.rarity || 'common';

                // Item slot background
                const slotX = listX - 8;
                const slotW = listW - 35;
                const slotH = itemHeight - 4;

                // Draw rarity frame around item slot
                if (isSelected) {
                    // Selected item background
                    ctx.fillStyle = colors.bgMedium || '#1c1c1c';
                    ctx.fillRect(slotX, itemY - 24, slotW, slotH);

                    // Draw rarity border with glow
                    if (typeof drawRarityFrame === 'function') {
                        drawRarityFrame(ctx, slotX, itemY - 24, slotW, slotH, rarity, {
                            thickness: 2,
                            glow: true,
                            cornerRadius: 0
                        });
                    } else {
                        // Fallback: simple rarity border
                        const rarityColors = typeof UI_COLORS !== 'undefined' ? {
                            common: UI_COLORS.rarityCommon,
                            uncommon: UI_COLORS.rarityUncommon,
                            rare: UI_COLORS.rarityRare,
                            epic: UI_COLORS.rarityEpic,
                            legendary: UI_COLORS.rarityLegendary,
                            mythic: UI_COLORS.rarityMythic
                        } : {};
                        ctx.strokeStyle = rarityColors[rarity] || '#6b6b6b';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(slotX, itemY - 24, slotW, slotH);
                    }

                    // Selection arrow
                    ctx.fillStyle = frameGoldBright;
                    ctx.beginPath();
                    ctx.moveTo(slotX - 10, itemY - 18);
                    ctx.lineTo(slotX - 10, itemY - 8);
                    ctx.lineTo(slotX - 4, itemY - 13);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Unselected: subtle background
                    ctx.fillStyle = 'rgba(20, 20, 20, 0.5)';
                    ctx.fillRect(slotX, itemY - 24, slotW, slotH);

                    // Subtle rarity indicator (left border only)
                    const rarityColors = typeof UI_COLORS !== 'undefined' ? {
                        common: UI_COLORS.rarityCommon,
                        uncommon: UI_COLORS.rarityUncommon,
                        rare: UI_COLORS.rarityRare,
                        epic: UI_COLORS.rarityEpic,
                        legendary: UI_COLORS.rarityLegendary,
                        mythic: UI_COLORS.rarityMythic
                    } : { common: '#6b6b6b' };
                    ctx.fillStyle = rarityColors[rarity] || '#6b6b6b';
                    ctx.fillRect(slotX, itemY - 24, 3, slotH);
                }

                // Get rarity color for text
                const RARITY_TEXT_COLORS = typeof UI_COLORS !== 'undefined' ? {
                    common: UI_COLORS.textSecondary || '#b8a878',
                    uncommon: UI_COLORS.rarityUncommon || '#2e8b57',
                    rare: UI_COLORS.rarityRare || '#4169e1',
                    epic: UI_COLORS.rarityEpic || '#9932cc',
                    legendary: UI_COLORS.rarityLegendary || '#ffd700',
                    mythic: UI_COLORS.rarityMythic || '#ff4500'
                } : { common: '#ffffff' };

                ctx.fillStyle = RARITY_TEXT_COLORS[rarity] || '#ffffff';
                ctx.font = isSelected ? `bold 15px ${fontFamily}` : `14px ${fontFamily}`;

                // Text shadow for readability
                ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                ctx.shadowBlur = 2;
                ctx.fillText(`${item.name}`, slotX + 10, itemY - 8);
                ctx.shadowBlur = 0;

                // Show count if stackable (in gold badge)
                if (item.count > 1) {
                    const countX = slotX + slotW - 25;
                    const countY = itemY - 13;

                    ctx.fillStyle = frameGoldDark;
                    ctx.beginPath();
                    ctx.arc(countX, countY, 10, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.font = 'bold 10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = colors.textPrimary || '#efe4b0';
                    ctx.fillText(`${item.count}`, countX, countY + 3);
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
    const itemData = (typeof getItemData === 'function' ? getItemData(item.name) : null) ||
                     EQUIPMENT_DATA[item.name] || ITEMS_DATA[item.name] || item;
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
const MIN_BRIGHTNESS = 0.15; // 15% brightness outside torch (85% dimmed)
const FADE_DISTANCE = 2;     // 2 tile gradient from torch edge

/**
 * Calculate tile brightness based on distance from player AND light sources
 * Delegates to LightSourceSystem for unified flicker behavior
 * @param {number} tileX - Tile X position
 * @param {number} tileY - Tile Y position
 * @returns {number} - Brightness from MIN_BRIGHTNESS to 1.0
 */
function getTileBrightness(tileX, tileY) {
    // Use LightSourceSystem's unified brightness calculation
    if (typeof LightSourceSystem !== 'undefined') {
        return LightSourceSystem.getTileBrightnessAt(tileX, tileY, MIN_BRIGHTNESS);
    }

    // Fallback if LightSourceSystem not available
    if (!game.player) return MIN_BRIGHTNESS;

    const playerX = game.player.gridX;
    const playerY = game.player.gridY;
    const torchRadius = 4;

    const dx = tileX - playerX;
    const dy = tileY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= torchRadius) return 1.0;

    const fadeEnd = torchRadius + FADE_DISTANCE;
    if (distance < fadeEnd) {
        const fadeProgress = (distance - torchRadius) / FADE_DISTANCE;
        const smoothProgress = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
        return 1.0 - (smoothProgress * (1.0 - MIN_BRIGHTNESS));
    }

    return MIN_BRIGHTNESS;
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
 * Apply fog overlay and torchlight effects
 * Now delegates all glow rendering to LightSourceSystem for unified behavior
 */
function applyRadialFogOverlay(ctx, player, camX, camY, tileSize, offsetX, viewW, viewH) {
    // Render warm glow for ALL light sources (player + campfires + braziers, etc.)
    // Uses unified flicker from LightSourceSystem
    if (typeof LightSourceSystem !== 'undefined') {
        LightSourceSystem.renderAllLightGlows(ctx, camX, camY, tileSize, offsetX);
    }

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

        // Get unified flicker multiplier for consistent animation
        const flickerMultiplier = LightSourceSystem.getFlicker();
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

/**
 * Render decorations (shrines, chests, etc.) in the game world
 * Called from the main render loop between loot and extraction points
 */
function renderDecorations(ctx, camX, camY, tileSize, offsetX) {
    if (!game.decorations || game.decorations.length === 0) return;

    const time = Date.now();

    for (const decoration of game.decorations) {
        const screenX = (decoration.x - camX) * tileSize + offsetX;
        const screenY = (decoration.y - camY) * tileSize;

        // Skip if off-screen
        if (screenX < -tileSize * 2 || screenX > ctx.canvas.width + tileSize * 2) continue;
        if (screenY < -tileSize * 2 || screenY > ctx.canvas.height + tileSize * 2) continue;

        // Check tile visibility
        const tileX = Math.floor(decoration.x);
        const tileY = Math.floor(decoration.y);
        const tile = game?.map?.[tileY]?.[tileX];

        // Only render if tile is visible or explored
        if (!tile || (!tile.visible && !tile.explored)) continue;

        // Determine alpha based on visibility
        const alpha = tile.visible ? 1.0 : 0.5;

        // Render based on decoration type
        if (decoration.type === 'shrine') {
            renderShrine(ctx, decoration, screenX, screenY, tileSize, time, alpha);
        } else if (decoration.type === 'chest') {
            renderChest(ctx, decoration, screenX, screenY, tileSize, alpha);
        }
    }
}

/**
 * Render a shrine decoration with glow effect
 */
function renderShrine(ctx, shrine, screenX, screenY, tileSize, time, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;

    const centerX = screenX + tileSize / 2;
    const centerY = screenY + tileSize / 2;
    const size = tileSize * 0.7;

    // Color based on used state
    const baseColor = shrine.used ? '#666666' : (shrine.color || '#FFD700');
    const glowColor = shrine.used ? 'rgba(100, 100, 100, 0.3)' : 'rgba(255, 215, 0, 0.5)';

    // Pulsing glow effect (only for unused shrines)
    if (!shrine.used) {
        const pulse = Math.sin(time / 800 * Math.PI) * 0.3 + 0.7;

        // Outer glow
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, size * 1.5
        );
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.globalAlpha = alpha * pulse;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
    }

    // Shrine base (pedestal)
    ctx.fillStyle = '#555555';
    ctx.fillRect(centerX - size * 0.4, centerY + size * 0.2, size * 0.8, size * 0.3);

    // Shrine pillar
    ctx.fillStyle = '#777777';
    ctx.fillRect(centerX - size * 0.15, centerY - size * 0.3, size * 0.3, size * 0.5);

    // Shrine top (glowing orb or crystal)
    const orbY = centerY - size * 0.35;
    const orbRadius = size * 0.2;

    // Orb glow
    if (!shrine.used) {
        const orbGlow = ctx.createRadialGradient(
            centerX, orbY, 0,
            centerX, orbY, orbRadius * 2
        );
        orbGlow.addColorStop(0, baseColor);
        orbGlow.addColorStop(0.5, glowColor);
        orbGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = orbGlow;
        ctx.beginPath();
        ctx.arc(centerX, orbY, orbRadius * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Orb
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(centerX, orbY, orbRadius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight on orb
    if (!shrine.used) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(centerX - orbRadius * 0.3, orbY - orbRadius * 0.3, orbRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Render a chest decoration
 */
function renderChest(ctx, chest, screenX, screenY, tileSize, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;

    const centerX = screenX + tileSize / 2;
    const centerY = screenY + tileSize / 2;
    const size = tileSize * 0.6;

    // Color based on opened state
    const chestColor = chest.opened ? '#5c4033' : '#8B4513';
    const trimColor = chest.opened ? '#666666' : '#FFD700';

    // Chest body
    ctx.fillStyle = chestColor;
    ctx.fillRect(centerX - size / 2, centerY - size * 0.3, size, size * 0.6);

    // Chest lid
    ctx.fillStyle = chest.opened ? '#4a3328' : '#6B3300';
    ctx.fillRect(centerX - size / 2, centerY - size * 0.3, size, size * 0.2);

    // Chest trim/lock
    ctx.fillStyle = trimColor;
    ctx.fillRect(centerX - size * 0.1, centerY - size * 0.2, size * 0.2, size * 0.3);

    ctx.restore();
}

function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Menu and game over screens don't require player
    if (game.state === 'menu') {
        drawMainMenuScreen(ctx, canvas.width, canvas.height);
        return;
    }

    if (game.state === 'gameover') {
        drawGameOverScreen(ctx, canvas.width, canvas.height);
        return;
    }

    if (!game.player) {
        return; // Don't render if player doesn't exist yet
    }

    if (game.state === 'village' || game.state === 'dialogue' || game.state === 'bank' || game.state === 'loadout' || game.state === 'shop' || game.state === 'crafting') {
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
    } else if (game.state === 'playing' || game.state === 'inventory' || game.state === 'map' || game.state === 'skills' || game.state === 'levelup' || game.state === 'character' || game.state === 'shift' || game.state === 'chest' || game.state === 'shrine' || game.state === 'extraction') {

const effectiveTileSize = TILE_SIZE * currentZoom;
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
const camX = game.camera.x + (shakeOffset.x / (TILE_SIZE * currentZoom));
const camY = game.camera.y + (shakeOffset.y / (TILE_SIZE * currentZoom));

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
                    drawWallTile(ctx, screenX, screenY, effectiveTileSize, x, y);
                } else if (tile.type === 'interior_wall') {
                    drawWallTile(ctx, screenX, screenY, effectiveTileSize, x, y);
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
                } else {
                    // Unknown tile type or undefined - render as void (black)
                    drawVoidTile(ctx, screenX, screenY, effectiveTileSize);
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

        // LAYER 2.3: Draw decorations (shrines, etc.)
        renderDecorations(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);

        // LAYER 2.5: Draw extraction points
        if (typeof renderExtractionPoints === 'function') {
            renderExtractionPoints(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // Merchant rendering (only if visible within light sources)
        if (game.merchant) {
            let merchantVisibility = 0;
            if (typeof VisionSystem !== 'undefined' && VisionSystem.getEntityVisibility) {
                merchantVisibility = VisionSystem.getEntityVisibility(game.merchant.x, game.merchant.y);
            } else {
                const merchantTile = game.map[game.merchant.y]?.[game.merchant.x];
                merchantVisibility = (merchantTile && merchantTile.visible) ? 1.0 : 0;
            }

            if (merchantVisibility > 0) {
                const mx = (game.merchant.x - camX) * effectiveTileSize + TRACKER_WIDTH;
                const my = (game.merchant.y - camY) * effectiveTileSize;
                ctx.save();
                ctx.globalAlpha = merchantVisibility;
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(mx + 10, my + 10, effectiveTileSize - 20, effectiveTileSize - 20);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 24px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('$', mx + effectiveTileSize / 2, my + effectiveTileSize / 2 + 8);
                ctx.restore();
            }
        }



        // === GROUND PASS: Enemy ability telegraphs (render BELOW entities) ===
        if (typeof EnemyAbilitySystem !== 'undefined' && EnemyAbilitySystem.renderTelegraphs) {
            EnemyAbilitySystem.renderTelegraphs(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }
        if (typeof EffectRenderer !== 'undefined' && EffectRenderer.drawGround) {
            EffectRenderer.drawGround(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // Player rendering with spritesheet animation
        const px = (game.player.displayX - camX) * effectiveTileSize + TRACKER_WIDTH;
        const py = (game.player.displayY - camY) * effectiveTileSize;
        drawPlayerSprite(ctx, px, py, effectiveTileSize);


        // Render all enemies using enemy-renderer (handles facing direction + tier indicators)
        if (typeof renderAllEnemies === 'function') {
            renderAllEnemies(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // Render status effect visuals on entities (after sprites, before projectiles)
        if (typeof renderAllStatusEffectVisuals === 'function') {
            renderAllStatusEffectVisuals(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // Projectiles (arrows, bolts, magic)
        if (typeof renderProjectiles === 'function') { renderProjectiles(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH); }

        // Melee slash effects (mouse-driven combat) - legacy code-based
        if (typeof drawSlashEffects === 'function') { drawSlashEffects(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH); }

        // Range indicator crosshair (clamped to weapon range)
        if (typeof drawRangeIndicator === 'function') { drawRangeIndicator(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH); }

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

        // === OVERLAY PASS: Ability impacts, slash arcs, ring bursts (render ABOVE entities) ===
        if (typeof EffectRenderer !== 'undefined' && EffectRenderer.drawOverlay) {
            EffectRenderer.drawOverlay(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // Heal pulse effects (life drain caster feedback)
        if (typeof HealPulseEffects !== 'undefined') {
            HealPulseEffects.render(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        // Ability projectiles (homing orbs, tracking missiles, etc.)
        if (typeof AbilityProjectileSystem !== 'undefined') {
            AbilityProjectileSystem.render(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }

        if (typeof renderDamageNumbers === 'function') { renderDamageNumbers(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH); }
        ctx.restore();

        // DANGER VIGNETTE: Low health warning effect
        // Renders a pulsing red border when player health is below 30%
        if (typeof DangerVignette !== 'undefined' && game.player) {
            DangerVignette.render(ctx, canvas.width, canvas.height,
                game.player.health, game.player.maxHealth);
        }

        // NEW UI: Icon sidebar (replaces old tracker)
        if (typeof renderIconSidebar === 'function') {
            renderIconSidebar(ctx, canvas.height);
        }

        // NEW UI: Unit frames (player + enemy)
        if (typeof renderUnitFrames === 'function') {
            renderUnitFrames(ctx);
        }

        // Kill streak UI (counter, tier announcements, decay ring)
        if (typeof KillStreakUI !== 'undefined') {
            KillStreakUI.render(ctx);
        }

        // NEW UI: Mini-map (top-right)
        if (typeof renderMiniMap === 'function') {
            renderMiniMap(ctx, canvas.width);
        }

        // Combat Log UI - color-coded message system
        if (!game.merchant && game.state !== 'inventory' && game.state !== 'map' && game.state !== 'skills' && game.state !== 'moveset' && game.state !== 'levelup') {
            if (typeof CombatLogUI !== 'undefined') {
                CombatLogUI.render(ctx, canvas.height);
            }
        }
    } else if (game.state === 'gameover') {
        drawGameOverScreen(ctx, canvas.width, canvas.height);
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
    if (game.state === 'shrine' && typeof renderShrineUI === 'function') renderShrineUI(ctx);
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

    // Position above the unified action bar, spanning its full width
    // Use stored action bar dimensions if available
    const actionBar = window.actionBarDimensions || {
        x: canvas.width - 290,
        y: canvas.height - 96,
        width: 270,
        height: 76
    };

    const barWidth = actionBar.width;
    const barHeight = 20;
    const barX = actionBar.x;
    const barY = actionBar.y - barHeight - 8; // 8px gap above action bar

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

// ============================================================================
// MENU SCREENS - CotDG Style
// ============================================================================

/**
 * Draw the main menu screen - CotDG Atmospheric Style
 */
function drawMainMenuScreen(ctx, width, height) {
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
    const frameGold = colors.frameGold || '#b8860b';
    const frameGoldBright = colors.frameGoldBright || '#daa520';
    const frameGoldDark = colors.frameGoldDark || '#8b6914';
    const bloodRed = colors.bloodRed || '#8b0000';
    const parchment = colors.textPrimary || '#efe4b0';
    const textMuted = colors.textMuted || '#706850';

    // Get menu state
    const menuState = game.menuState || { selectedIndex: 0, currentScreen: 'main', hasSaveData: false, embers: [] };

    // Check for save data on first render
    if (menuState.hasSaveData === false && typeof localStorage !== 'undefined') {
        const savedData = localStorage.getItem('shiftingChasm_persistent');
        menuState.hasSaveData = savedData !== null;
    }

    ctx.save();

    // === DARK ATMOSPHERIC BACKGROUND ===
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, height);
    bgGrad.addColorStop(0, '#1a1510');
    bgGrad.addColorStop(0.5, '#0d0a08');
    bgGrad.addColorStop(1, '#050403');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // === VOLCANIC GLOW FROM BOTTOM ===
    const volcanicGrad = ctx.createLinearGradient(0, height, 0, height * 0.6);
    volcanicGrad.addColorStop(0, 'rgba(139, 0, 0, 0.25)');
    volcanicGrad.addColorStop(0.4, 'rgba(139, 69, 19, 0.1)');
    volcanicGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = volcanicGrad;
    ctx.fillRect(0, 0, width, height);

    // === EMBER PARTICLE SYSTEM ===
    updateAndDrawEmbers(ctx, width, height, menuState);

    // === DRAMATIC VIGNETTE (with breathing effect) ===
    const breathe = (Math.sin(Date.now() * 0.001) + 1) / 2;
    const vignetteSize = height * (0.85 + breathe * 0.05);
    const vignetteGrad = ctx.createRadialGradient(width / 2, height * 0.4, height * 0.2, width / 2, height * 0.4, vignetteSize);
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
    vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, width, height);

    // Route to appropriate screen
    if (menuState.currentScreen === 'settings') {
        drawSettingsScreen(ctx, width, height, menuState, colors);
    } else if (menuState.currentScreen === 'credits') {
        drawCreditsScreen(ctx, width, height, menuState, colors);
    } else {
        // Main menu screen
        drawMainMenuContent(ctx, width, height, menuState, colors);
    }

    // === CORNER FLOURISHES (all screens) ===
    if (typeof drawOrnateCorners === 'function') {
        drawOrnateCorners(ctx, 40, 40, width - 80, height - 80, { size: 30 });
    } else {
        ctx.strokeStyle = frameGoldDark;
        ctx.lineWidth = 2;
        const cs = 40;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(50, 50 + cs);
        ctx.lineTo(50, 50);
        ctx.lineTo(50 + cs, 50);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(width - 50 - cs, 50);
        ctx.lineTo(width - 50, 50);
        ctx.lineTo(width - 50, 50 + cs);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(50, height - 50 - cs);
        ctx.lineTo(50, height - 50);
        ctx.lineTo(50 + cs, height - 50);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(width - 50 - cs, height - 50);
        ctx.lineTo(width - 50, height - 50);
        ctx.lineTo(width - 50, height - 50 - cs);
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Update and draw ember particles for atmospheric effect
 */
function updateAndDrawEmbers(ctx, width, height, menuState) {
    const embers = menuState.embers;
    const now = Date.now();

    // Initialize embers if empty
    if (embers.length === 0) {
        for (let i = 0; i < 40; i++) {
            embers.push({
                x: Math.random() * width,
                y: height + Math.random() * 100,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 0.5 + 0.3,
                drift: (Math.random() - 0.5) * 0.3,
                brightness: Math.random() * 0.5 + 0.3,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    // Update and draw embers
    for (let i = 0; i < embers.length; i++) {
        const ember = embers[i];

        // Update position
        ember.y -= ember.speed;
        ember.x += ember.drift + Math.sin(now * 0.002 + ember.phase) * 0.2;

        // Reset when off screen
        if (ember.y < -10) {
            ember.y = height + 10;
            ember.x = Math.random() * width;
        }

        // Flicker effect
        const flicker = (Math.sin(now * 0.01 + ember.phase) + 1) / 2;
        const alpha = ember.brightness * (0.7 + flicker * 0.3);

        // Draw ember with glow
        ctx.beginPath();
        ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);

        // Core
        ctx.fillStyle = `rgba(255, ${150 + flicker * 80}, 50, ${alpha})`;
        ctx.fill();

        // Glow
        ctx.shadowColor = `rgba(255, 100, 0, ${alpha * 0.5})`;
        ctx.shadowBlur = ember.size * 3;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

/**
 * Draw the main menu content (title, menu options)
 */
function drawMainMenuContent(ctx, width, height, menuState, colors) {
    const frameGold = colors.frameGold || '#b8860b';
    const frameGoldBright = colors.frameGoldBright || '#daa520';
    const textMuted = colors.textMuted || '#706850';
    const parchment = colors.textPrimary || '#efe4b0';

    // === TITLE ===
    const titleY = height * 0.28;
    const pulse = (Math.sin(Date.now() * 0.002) + 1) / 2;

    // Title glow
    ctx.shadowColor = frameGold;
    ctx.shadowBlur = 20 + pulse * 15;

    // Title text
    ctx.font = 'bold 72px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title shadow
    ctx.fillStyle = '#000';
    ctx.fillText('THE SHIFTING CHASM', width / 2 + 3, titleY + 3);

    // Title main
    ctx.fillStyle = frameGoldBright;
    ctx.fillText('THE SHIFTING CHASM', width / 2, titleY);

    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = '20px serif';
    ctx.fillStyle = textMuted;
    ctx.fillText('A Descent Into Darkness', width / 2, titleY + 55);

    // === DECORATIVE DIVIDER ===
    const divY = titleY + 90;
    ctx.strokeStyle = frameGold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 150, divY);
    ctx.lineTo(width / 2 + 150, divY);
    ctx.stroke();

    // Center emblem
    ctx.fillStyle = frameGold;
    ctx.beginPath();
    ctx.arc(width / 2, divY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d0a08';
    ctx.beginPath();
    ctx.arc(width / 2, divY, 3, 0, Math.PI * 2);
    ctx.fill();

    // === MENU OPTIONS ===
    const menuOptions = [
        { label: 'NEW GAME', enabled: true },
        { label: 'CONTINUE', enabled: menuState.hasSaveData },
        { label: 'SETTINGS', enabled: true },
        { label: 'CREDITS', enabled: true }
    ];

    const menuStartY = height * 0.5;
    const menuSpacing = 50;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    menuOptions.forEach((option, index) => {
        const y = menuStartY + index * menuSpacing;
        const isSelected = menuState.selectedIndex === index;
        const isEnabled = option.enabled;

        // Selection highlight
        if (isSelected && isEnabled) {
            const selPulse = (Math.sin(Date.now() * 0.005) + 1) / 2;

            // Glowing background bar
            const barWidth = 200;
            const barHeight = 36;
            ctx.fillStyle = `rgba(184, 134, 11, ${0.15 + selPulse * 0.1})`;
            ctx.fillRect(width / 2 - barWidth / 2, y - barHeight / 2, barWidth, barHeight);

            // Border
            ctx.strokeStyle = `rgba(218, 165, 32, ${0.5 + selPulse * 0.3})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(width / 2 - barWidth / 2, y - barHeight / 2, barWidth, barHeight);

            // Arrow indicators
            ctx.font = 'bold 20px serif';
            ctx.fillStyle = frameGoldBright;
            ctx.fillText('>', width / 2 - barWidth / 2 - 20, y);
            ctx.fillText('<', width / 2 + barWidth / 2 + 20, y);
        }

        // Text
        ctx.font = isSelected ? 'bold 26px serif' : '24px serif';

        if (!isEnabled) {
            // Disabled state
            ctx.fillStyle = 'rgba(112, 104, 80, 0.4)';
        } else if (isSelected) {
            // Selected state - glowing
            ctx.shadowColor = frameGold;
            ctx.shadowBlur = 10;
            ctx.fillStyle = frameGoldBright;
        } else {
            // Normal state
            ctx.fillStyle = parchment;
        }

        ctx.fillText(option.label, width / 2, y);
        ctx.shadowBlur = 0;
    });

    // === NAVIGATION HINT ===
    ctx.font = '14px serif';
    ctx.fillStyle = textMuted;
    ctx.fillText('Use Arrow Keys or W/S to navigate, Enter to select', width / 2, height - 60);

    // === VERSION ===
    ctx.font = '12px serif';
    ctx.fillStyle = textMuted;
    ctx.fillText('v0.1 - The Shifting Chasm', width / 2, height - 30);
}

/**
 * Draw the settings screen
 */
function drawSettingsScreen(ctx, width, height, menuState, colors) {
    const frameGold = colors.frameGold || '#b8860b';
    const frameGoldBright = colors.frameGoldBright || '#daa520';
    const textMuted = colors.textMuted || '#706850';
    const parchment = colors.textPrimary || '#efe4b0';

    // Title
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = frameGold;
    ctx.shadowBlur = 15;
    ctx.fillStyle = frameGoldBright;
    ctx.fillText('SETTINGS', width / 2, height * 0.2);
    ctx.shadowBlur = 0;

    // Settings options
    const settingsOptions = [
        { label: 'Music Volume', type: 'slider', value: menuState.musicVolume || 70, key: 'musicVolume' },
        { label: 'SFX Volume', type: 'slider', value: menuState.sfxVolume || 80, key: 'sfxVolume' },
        { label: 'BACK', type: 'button' }
    ];

    const settingsStartY = height * 0.4;
    const settingsSpacing = 70;

    settingsOptions.forEach((option, index) => {
        const y = settingsStartY + index * settingsSpacing;
        const isSelected = menuState.selectedIndex === index;

        if (option.type === 'slider') {
            // Label
            ctx.font = '20px serif';
            ctx.textAlign = 'right';
            ctx.fillStyle = isSelected ? frameGoldBright : parchment;
            ctx.fillText(option.label, width / 2 - 20, y);

            // Slider track
            const sliderX = width / 2 + 20;
            const sliderWidth = 200;
            const sliderHeight = 8;

            ctx.fillStyle = '#2a2520';
            ctx.fillRect(sliderX, y - sliderHeight / 2, sliderWidth, sliderHeight);

            // Slider fill
            const fillWidth = (option.value / 100) * sliderWidth;
            ctx.fillStyle = isSelected ? frameGoldBright : frameGold;
            ctx.fillRect(sliderX, y - sliderHeight / 2, fillWidth, sliderHeight);

            // Slider border
            ctx.strokeStyle = isSelected ? frameGoldBright : frameGold;
            ctx.lineWidth = 1;
            ctx.strokeRect(sliderX, y - sliderHeight / 2, sliderWidth, sliderHeight);

            // Value text
            ctx.textAlign = 'left';
            ctx.font = '16px serif';
            ctx.fillStyle = textMuted;
            ctx.fillText(`${option.value}%`, sliderX + sliderWidth + 15, y);

            // Selection indicator
            if (isSelected) {
                ctx.font = '20px serif';
                ctx.fillStyle = frameGoldBright;
                ctx.textAlign = 'right';
                ctx.fillText('>', width / 2 - sliderWidth / 2 - 40, y);
            }
        } else {
            // Button style (Back)
            ctx.textAlign = 'center';
            const selPulse = (Math.sin(Date.now() * 0.005) + 1) / 2;

            if (isSelected) {
                ctx.shadowColor = frameGold;
                ctx.shadowBlur = 10;
                ctx.font = 'bold 26px serif';
                ctx.fillStyle = frameGoldBright;

                // Arrow indicators
                ctx.fillText('> ' + option.label + ' <', width / 2, y);
            } else {
                ctx.font = '24px serif';
                ctx.fillStyle = parchment;
                ctx.fillText(option.label, width / 2, y);
            }
            ctx.shadowBlur = 0;
        }
    });

    // Navigation hint
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = textMuted;
    ctx.fillText('Left/Right to adjust, Enter or ESC to go back', width / 2, height - 60);
}

/**
 * Draw the credits screen
 */
function drawCreditsScreen(ctx, width, height, menuState, colors) {
    const frameGold = colors.frameGold || '#b8860b';
    const frameGoldBright = colors.frameGoldBright || '#daa520';
    const textMuted = colors.textMuted || '#706850';
    const parchment = colors.textPrimary || '#efe4b0';

    // Title
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = frameGold;
    ctx.shadowBlur = 15;
    ctx.fillStyle = frameGoldBright;
    ctx.fillText('CREDITS', width / 2, height * 0.18);
    ctx.shadowBlur = 0;

    // Credits content
    const credits = [
        { text: 'THE SHIFTING CHASM', style: 'title' },
        { text: '', style: 'space' },
        { text: 'A Roguelike Dungeon Crawler', style: 'subtitle' },
        { text: '', style: 'space' },
        { text: 'Created with Claude Code', style: 'normal' },
        { text: '', style: 'space' },
        { text: 'Game Design & Programming', style: 'header' },
        { text: 'Built with AI Assistance', style: 'normal' },
        { text: '', style: 'space' },
        { text: 'Inspired by classic roguelikes', style: 'normal' },
        { text: 'and extraction survival games', style: 'normal' },
        { text: '', style: 'space' },
        { text: '"The map changes beneath your feet."', style: 'quote' }
    ];

    let y = height * 0.3;
    const lineSpacing = 28;

    credits.forEach(credit => {
        switch (credit.style) {
            case 'title':
                ctx.font = 'bold 28px serif';
                ctx.fillStyle = frameGoldBright;
                break;
            case 'subtitle':
                ctx.font = 'italic 18px serif';
                ctx.fillStyle = textMuted;
                break;
            case 'header':
                ctx.font = 'bold 18px serif';
                ctx.fillStyle = frameGold;
                break;
            case 'quote':
                ctx.font = 'italic 16px serif';
                ctx.fillStyle = `rgba(239, 228, 176, 0.7)`;
                break;
            case 'space':
                y += 10;
                return;
            default:
                ctx.font = '16px serif';
                ctx.fillStyle = parchment;
        }
        ctx.fillText(credit.text, width / 2, y);
        y += lineSpacing;
    });

    // Back button
    const backY = height * 0.85;
    const isSelected = menuState.selectedIndex === 0;

    if (isSelected) {
        ctx.shadowColor = frameGold;
        ctx.shadowBlur = 10;
        ctx.font = 'bold 24px serif';
        ctx.fillStyle = frameGoldBright;
        ctx.fillText('> BACK <', width / 2, backY);
    } else {
        ctx.font = '22px serif';
        ctx.fillStyle = parchment;
        ctx.fillText('BACK', width / 2, backY);
    }
    ctx.shadowBlur = 0;

    // Navigation hint
    ctx.font = '14px serif';
    ctx.fillStyle = textMuted;
    ctx.fillText('Press Enter or ESC to return', width / 2, height - 40);
}

/**
 * Draw the game over screen - CotDG Dramatic Death Style
 */
function drawGameOverScreen(ctx, width, height) {
    const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {};
    const frameGold = colors.frameGold || '#b8860b';
    const frameGoldBright = colors.frameGoldBright || '#daa520';
    const bloodRed = colors.bloodRed || '#8b0000';
    const healthCritical = colors.healthCritical || '#ff2222';

    ctx.save();

    // === DARK BLOOD-TINGED BACKGROUND ===
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, height);
    bgGrad.addColorStop(0, '#1a0808');
    bgGrad.addColorStop(0.5, '#0d0505');
    bgGrad.addColorStop(1, '#050202');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // === BLOOD VIGNETTE ===
    const vignetteGrad = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.8);
    vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGrad.addColorStop(0.5, 'rgba(139, 0, 0, 0.2)');
    vignetteGrad.addColorStop(1, 'rgba(139, 0, 0, 0.6)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, width, height);

    // Blood drip effect at top
    ctx.fillStyle = 'rgba(139, 0, 0, 0.4)';
    for (let i = 0; i < 20; i++) {
        const dx = Math.random() * width;
        const dripHeight = 50 + Math.random() * 150;
        const dripWidth = 3 + Math.random() * 8;
        ctx.beginPath();
        ctx.moveTo(dx - dripWidth / 2, 0);
        ctx.lineTo(dx + dripWidth / 2, 0);
        ctx.lineTo(dx + dripWidth / 4, dripHeight - 10);
        ctx.quadraticCurveTo(dx, dripHeight, dx - dripWidth / 4, dripHeight - 10);
        ctx.closePath();
        ctx.fill();
    }

    // === DEATH TITLE ===
    const titleY = height * 0.4;
    const pulse = (Math.sin(Date.now() * 0.003) + 1) / 2;

    // Title glow (red)
    ctx.shadowColor = healthCritical;
    ctx.shadowBlur = 25 + pulse * 20;

    ctx.font = 'bold 80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title shadow
    ctx.fillStyle = '#000';
    ctx.fillText('YOU HAVE FALLEN', width / 2 + 4, titleY + 4);

    // Title main (blood red)
    ctx.fillStyle = healthCritical;
    ctx.fillText('YOU HAVE FALLEN', width / 2, titleY);

    ctx.shadowBlur = 0;

    // === RUN STATISTICS PANEL ===
    const statsY = height * 0.55;
    const statsWidth = 400;
    const statsHeight = 120;
    const statsX = (width - statsWidth) / 2;

    // Stats panel background
    ctx.fillStyle = 'rgba(20, 10, 10, 0.8)';
    ctx.fillRect(statsX, statsY, statsWidth, statsHeight);
    ctx.strokeStyle = bloodRed;
    ctx.lineWidth = 2;
    ctx.strokeRect(statsX, statsY, statsWidth, statsHeight);

    // Stats content
    ctx.font = '16px serif';
    ctx.fillStyle = colors.textMuted || '#706850';
    ctx.textAlign = 'left';

    const floor = game.floor || 1;
    const gold = game.player?.gold || 0;
    const kills = game.statistics?.enemiesKilled || 0;

    ctx.fillText(`Floor Reached: ${floor}`, statsX + 30, statsY + 35);
    ctx.fillText(`Gold Collected: ${gold}`, statsX + 30, statsY + 60);
    ctx.fillText(`Enemies Slain: ${kills}`, statsX + 30, statsY + 85);

    // Right side decoration
    ctx.fillStyle = bloodRed;
    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.fillText('☠', statsX + statsWidth - 50, statsY + 60);

    // === RESTART PROMPT ===
    const promptY = height * 0.78;
    const promptPulse = (Math.sin(Date.now() * 0.004) + 1) / 2;

    ctx.font = 'bold 24px serif';
    ctx.fillStyle = `rgba(239, 228, 176, ${0.5 + promptPulse * 0.5})`;
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to Return to Village', width / 2, promptY);

    // === SOMBER QUOTE ===
    ctx.font = 'italic 14px serif';
    ctx.fillStyle = 'rgba(139, 0, 0, 0.6)';
    ctx.fillText('"The chasm claims another soul..."', width / 2, height - 40);

    ctx.restore();
}

// Export menu functions
window.drawMainMenuScreen = drawMainMenuScreen;
window.drawGameOverScreen = drawGameOverScreen;