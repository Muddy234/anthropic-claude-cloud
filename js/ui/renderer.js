// Create canvas element
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Optimize for pixel art
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Handle window resizing
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log('Canvas resized to:', canvas.width, 'x', canvas.height);
});

// Create health bar during combat
function drawHealthBar(x, y, width, hp, maxHp) {
    const pct = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = '#333'; ctx.fillRect(x, y, width, 20);
    ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.2 ? '#f1c40f' : '#e74c3c';
    ctx.fillRect(x, y, width * pct, 20);
    ctx.strokeStyle = '#333'; ctx.strokeRect(x, y, width, 20);
}

function drawTracker() {
    if (!game.player) return;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, TRACKER_WIDTH, canvas.height);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, TRACKER_WIDTH, canvas.height);
    let y = 50; const cx = TRACKER_WIDTH / 2;
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center'; ctx.fillText('ADVENTURER', cx, y); y += 40;
    ctx.fillStyle = '#fff'; ctx.font = '20px monospace'; ctx.fillText(`Level ${game.player.level}`, cx, y); y += 20;
    const xpNeeded = 100 + (game.player.level - 1) * 150;
    const xpPct = Math.min(1, game.player.xp / xpNeeded);
    ctx.fillStyle = '#333'; ctx.fillRect(50, y, TRACKER_WIDTH - 100, 10);
    ctx.fillStyle = '#3498db'; ctx.fillRect(50, y, (TRACKER_WIDTH - 100) * xpPct, 10);
    y += 30; ctx.fillStyle = '#888'; ctx.font = '14px monospace'; ctx.fillText(`${game.player.xp} / ${xpNeeded} XP`, cx, y); y += 50;
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 24px monospace'; ctx.fillText('STATS', cx, y); y += 30;
    ctx.fillStyle = '#fff'; ctx.font = '18px monospace'; ctx.textAlign = 'left'; const px = 80;
    ctx.fillText(`STR: ${game.player.stats.STR}`, px, y); y += 30;
    ctx.fillText(`AGI: ${game.player.stats.AGI}`, px, y); y += 30;
    ctx.fillText(`INT: ${game.player.stats.INT}`, px, y); y += 30;
    ctx.fillText(`STA: ${game.player.stats.STA}`, px, y); y += 30;
    y += 10;
    ctx.fillText(`P.DEF: ${Math.floor(game.player.pDef)}`, px, y); y += 30;
    ctx.fillText(`M.DEF: ${Math.floor(game.player.mDef)}`, px, y); y += 30;
    y += 10;
    // HP Bar
    ctx.fillText(`HP: ${Math.floor(game.player.hp)}/${game.player.maxHp}`, px, y); y += 5;
    const hpBarWidth = TRACKER_WIDTH - 160;
    const hpPct = game.player.hp / game.player.maxHp;
    ctx.fillStyle = '#333'; ctx.fillRect(px, y, hpBarWidth, 15);
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(px, y, hpBarWidth * hpPct, 15);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(px, y, hpBarWidth, 15);
    y += 25;

    // Mana Bar (new system: mp/maxMp)
    const mp = Math.floor(game.player.mp || 0);
    const maxMp = game.player.maxMp || 100;
    ctx.fillStyle = '#fff';
    ctx.fillText(`MP: ${mp}/${maxMp}`, px, y); y += 5;
    const mpPct = mp / maxMp;
    ctx.fillStyle = '#333'; ctx.fillRect(px, y, hpBarWidth, 15);
    ctx.fillStyle = '#3498db'; ctx.fillRect(px, y, hpBarWidth * mpPct, 15);
    ctx.strokeStyle = '#fff'; ctx.strokeRect(px, y, hpBarWidth, 15);
    y += 25;

    // Stamina (text only for now)
    ctx.fillText(`STM: ${Math.floor(game.player.stamina)}/${game.player.maxStamina}`, px, y); y += 50;
    ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center'; ctx.font = 'bold 24px monospace'; ctx.fillText(`GOLD: ${game.gold}`, cx, y); y += 50;
    ctx.fillStyle = '#FFD700'; ctx.fillText('INVENTORY', cx, y); y += 30;
    ctx.fillStyle = '#fff'; ctx.font = '16px monospace';
    if (game.player.inventory.length === 0) { ctx.fillText('Empty', cx, y); } else { for (const item of game.player.inventory) { ctx.fillText(`${item.name} x${item.count}`, cx, y); y += 25; } }
    ctx.fillStyle = '#888'; ctx.font = '14px monospace'; ctx.fillText('[E] Open Inventory', cx, canvas.height - 30);
}

function drawInspectPanel() {
    if (!game.combat || !game.combat.inspecting) return;
    const enemy = game.combat.enemy;
    const px = 1200 + (TRACKER_WIDTH / 2), py = 100, pw = 600, ph = 600;
    const finalX = Math.min(canvas.width - pw - 20, px);
    ctx.fillStyle = 'rgba(20, 20, 30, 0.95)'; ctx.fillRect(finalX, py, pw, ph);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4; ctx.strokeRect(finalX, py, pw, ph);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center'; ctx.fillText('MONSTER DATA', finalX + pw / 2, py + 50);
    ctx.fillStyle = enemy.element === 'fire' ? '#e74c3c' : enemy.element === 'nature' ? '#27ae60' : '#8e44ad';
    ctx.fillRect(finalX + 175, py + 80, 250, 250); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(finalX + 175, py + 80, 250, 250);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'left'; ctx.fillText(enemy.name.toUpperCase(), finalX + 30, py + 380);
    ctx.font = '18px monospace'; ctx.fillText(`STR: ${enemy.str} AGI: ${enemy.agi} INT: ${enemy.int}`, finalX + 40, py + 450);
    ctx.fillText(`P.DEF: ${enemy.pDef} M.DEF: ${enemy.mDef}`, finalX + 40, py + 480);
    ctx.fillStyle = '#ccc'; ctx.font = '16px monospace';
    const description = enemy.description || (MONSTER_DATA[enemy.name] ? MONSTER_DATA[enemy.name].description : 'No description available.');
    const words = description.split(' '); let line = '', yo = py + 530;
    for (let w of words) { if (ctx.measureText(line + w).width > pw - 80) { ctx.fillText(line, finalX + 40, yo); line = w + ' '; yo += 24; } else line += w + ' '; }
    ctx.fillText(line, finalX + 40, yo);
    ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.fillText('[I] or [4] to close', finalX + pw / 2, py + ph - 20);
}

function drawInventoryOverlay() {
    // Initialize scroll offsets if not exists
    if (!game.inventoryScroll) {
        game.inventoryScroll = [0, 0, 0, 0, 0]; // One for each tab
    }
    if (typeof game.selectedItemIndex === 'undefined') {
        game.selectedItemIndex = 0;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);
    const cx = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH) / 2;
    const cy = canvas.height / 2;

    // Scale panel to fit screen if necessary
    const maxW = canvas.width - TRACKER_WIDTH - 40;
    const maxH = canvas.height - 40;
    const w = Math.min(1200, maxW), h = Math.min(800, maxH);
    const x = Math.max(TRACKER_WIDTH + 20, cx - w / 2);
    const y = Math.max(20, cy - h / 2);

    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 4;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    // Updated tabs - removed INSPECT
    const tabs = ['WEAPONS', 'ARMOR', 'CONSUMABLES', 'ITEMS', 'EQUIPPED'];
    const tabW = w / tabs.length;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < tabs.length; i++) {
        const tx = x + i * tabW;
        ctx.fillStyle = game.inventoryTab === i ? '#3498db' : '#333';
        ctx.fillRect(tx, y, tabW, 40);
        ctx.strokeStyle = '#111';
        ctx.strokeRect(tx, y, tabW, 40);
        ctx.fillStyle = game.inventoryTab === i ? '#fff' : '#888';
        ctx.fillText(tabs[i], tx + tabW / 2, y + 26);
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

                // Color by rarity
                const rarityColors = {
                    'common': '#ffffff',
                    'uncommon': '#2ecc71',
                    'rare': '#3498db',
                    'epic': '#e67e22'
                };

                ctx.fillStyle = rarityColors[rarity] || '#ffffff';
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
    const rarityColors = {
        'common': '#ffffff',
        'uncommon': '#2ecc71',
        'rare': '#3498db',
        'epic': '#e67e22'
    };
    const rarity = itemData.rarity || 'common';
    ctx.fillStyle = rarityColors[rarity];
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
        const elementColors = {
            'FIRE': '#ff6b35', 'ICE': '#3498db', 'WATER': '#5dade2',
            'EARTH': '#8b4513', 'NATURE': '#27ae60', 'DARK': '#9b59b6',
            'HOLY': '#f1c40f', 'DEATH': '#666', 'ARCANE': '#e67e22',
            'PHYSICAL': '#ccc'
        };
        ctx.fillStyle = elementColors[thisElement] || '#fff';
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

    // Gold value
    ctx.fillStyle = '#f1c40f';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Value: ${itemData.goldValue || 0} Gold`, x + w / 2, dy);
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

function drawMerchant() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'; ctx.fillRect(TRACKER_WIDTH, 0, canvas.width - TRACKER_WIDTH, canvas.height);
    const cx = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH) / 2; const cy = canvas.height / 2;
    const w = 800, h = 600; const x = cx - w / 2, y = cy - h / 2;
    ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 4; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#f1c40f'; ctx.textAlign = 'center'; ctx.font = 'bold 40px monospace'; ctx.fillText('MERCHANT', cx, y + 60);
    ctx.fillStyle = '#fff'; ctx.font = '24px monospace'; ctx.fillText(`Your Gold: ${game.gold}`, cx, y + 100);
    if (!game.merchantMode) game.merchantMode = 'menu';
    if (game.merchantMode === 'menu') {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 36px monospace'; ctx.fillText('[1] BUY', cx, cy - 20); ctx.fillText('[2] SELL', cx, cy + 40);
        ctx.fillStyle = '#888'; ctx.font = '20px monospace'; ctx.fillText('Press [SPACE] to Leave', cx, y + h - 40);
    } else if (game.merchantMode === 'buy') {
        ctx.fillStyle = '#3498db'; ctx.font = 'bold 32px monospace'; ctx.fillText('BUY ITEMS', cx, y + 150);
        ctx.fillStyle = '#fff'; ctx.font = '28px monospace'; ctx.fillText('[1] Health Potion - 30 Gold', cx, cy + 20);
        if (game.merchantMsg) { ctx.fillStyle = game.merchantMsg.includes('Bought') ? '#2ecc71' : '#e74c3c'; ctx.fillText(game.merchantMsg, cx, cy + 80); }
        ctx.fillStyle = '#888'; ctx.font = '20px monospace'; ctx.fillText('[ESC] Back | [SPACE] Leave', cx, y + h - 40);
    } else if (game.merchantMode === 'sell') {
        drawInventoryOverlay(); const cx = TRACKER_WIDTH + (canvas.width - TRACKER_WIDTH) / 2;
        ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.fillText('SELL MODE - [Number] to Sell', cx, 60);
        if (game.inventoryTab !== 4 && game.inventoryTab !== 5) {
            const x = cx - 450; const y = (canvas.height / 2) - 400; const contentY = y + 60; let lineY = contentY;
            const types = ['weapon', 'armor', 'consumable', 'material']; const targetType = types[game.inventoryTab]; const filteredItems = game.player.inventory.filter(i => i.type === targetType);
            filteredItems.forEach((item, idx) => {
                const itemData = EQUIPMENT_DATA[item.name]; const sellPrice = itemData ? Math.floor(itemData.goldValue / 2) : Math.floor((item.goldValue || 1) / 2);
                ctx.fillStyle = '#f1c40f'; ctx.textAlign = 'right'; ctx.fillText(`${sellPrice} G`, x + 880, lineY); lineY += 40;
            });
        }
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

function drawBattleScene() {
    const enemy = game.combat.enemy; const offset = TRACKER_WIDTH;
    ctx.fillStyle = '#f8f9fa'; ctx.fillRect(offset, 0, canvas.width - offset, canvas.height);
    ctx.fillStyle = '#e0e0e0'; ctx.strokeStyle = '#bdc3c7'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(1400 + (offset / 2), 450, 300, 100, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(500 + offset, 750, 350, 120, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = enemy.element === 'fire' ? '#e74c3c' : enemy.element === 'nature' ? '#27ae60' : '#8e44ad';
    ctx.fillRect(1250 + (offset / 2), 150, 300, 300);
    ctx.fillStyle = '#3498db'; ctx.fillRect(350 + offset, 450, 350, 350);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.fillRect(80 + offset, 80, 540, 120); ctx.strokeRect(80 + offset, 80, 540, 120);
    ctx.fillStyle = '#000'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'left'; ctx.fillText(enemy.name.toUpperCase(), 100 + offset, 120);
    drawHealthBar(120 + offset, 150, 460, enemy.hp, enemy.maxHp);
    ctx.fillStyle = '#fff'; ctx.fillRect(1180 + (offset / 3), 580, 540, 140); ctx.strokeRect(1180 + (offset / 3), 580, 540, 140);
    ctx.fillStyle = '#000'; ctx.fillText('ADVENTURER', 1200 + (offset / 3), 620);
    drawHealthBar(1220 + (offset / 3), 650, 460, game.player.hp, game.player.maxHp);
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(offset, 830, canvas.width - offset, 250);
    ctx.fillStyle = '#fff'; ctx.fillRect(offset + 10, 840, canvas.width - offset - 20, 230);
    ctx.fillStyle = '#000'; ctx.font = '28px monospace';
    for (let i = 0; i < game.combat.log.length && i < 4; i++) { ctx.fillText(game.combat.log[game.combat.log.length - 1 - i], offset + 40, 1030 - i * 40); }
    const menuX = 1240 + (offset / 3);
    if (game.combat.menuState === 'main') {
        ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#000'; ctx.textAlign = 'left';
        ctx.fillText('[1] FIGHT', menuX, 900); ctx.fillText('[2] INSPECT', menuX, 960); ctx.fillText('[3] BAG', menuX, 1020); ctx.fillText('[4] RUN', menuX + 300, 900);
    }
    if (game.combat.menuState === 'fight_popup') {
        const px = 1200 + (TRACKER_WIDTH / 2), py = 100, pw = 600, ph = 600; const finalX = Math.min(canvas.width - pw - 20, px);
        ctx.fillStyle = 'rgba(20, 20, 30, 0.95)'; ctx.fillRect(finalX, py, pw, ph); ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4; ctx.strokeRect(finalX, py, pw, ph);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center'; ctx.fillText('SELECT ATTACK', finalX + pw / 2, py + 50);
        ctx.fillStyle = '#fff'; ctx.font = '22px monospace'; ctx.textAlign = 'left'; let ay = py + 120;
        for (let i = 0; i < 4; i++) {
            const ability = game.player.abilities[i];
            if (ability) {
                ctx.fillStyle = '#2ecc71'; ctx.fillText(`[${i + 1}] ${ability.name}`, finalX + 40, ay);
                ctx.fillStyle = '#aaa'; ctx.font = '16px monospace'; ctx.fillText(`Cost: ${ability.cost} ${ability.type === 'stamina' ? 'STM' : 'MANA'} | Dmg: ${ability.baseDmg} | Acc: ${ability.accuracy}%`, finalX + 60, ay + 28); ctx.font = '22px monospace';
            } else { ctx.fillStyle = '#666'; ctx.fillText(`[${i + 1}] Unselected`, finalX + 40, ay); }
            ay += 100;
        }
        ctx.fillStyle = '#888'; ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.fillText('[C] or [ESC] to Cancel', finalX + pw / 2, py + ph - 30);
    }
    if (game.combat.menuState === 'bag_popup') {
        const px = 1200 + (TRACKER_WIDTH / 2), py = 100, pw = 600, ph = 600; const finalX = Math.min(canvas.width - pw - 20, px);
        ctx.fillStyle = 'rgba(20, 20, 30, 0.95)'; ctx.fillRect(finalX, py, pw, ph); ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4; ctx.strokeRect(finalX, py, pw, ph);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center'; ctx.fillText('CONSUMABLES', finalX + pw / 2, py + 50);
        const consumables = game.player.inventory.filter(i => i.type === 'consumable');
        if (consumables.length === 0) { ctx.fillStyle = '#888'; ctx.font = '22px monospace'; ctx.fillText('No consumables available', finalX + pw / 2, py + 300); } else {
            ctx.fillStyle = '#fff'; ctx.font = '22px monospace'; ctx.textAlign = 'left'; let iy = py + 120;
            consumables.forEach((item, idx) => { if (idx < 9) { ctx.fillText(`[${idx + 1}] ${item.name} x${item.count}`, finalX + 40, iy); iy += 50; } });
        }
        ctx.fillStyle = '#888'; ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.fillText('[C] or [ESC] to Cancel', finalX + pw / 2, py + ph - 30);
    }
    drawInspectPanel();
}

function drawNotification() {
    // Placeholder for notification drawing logic
}

function getFloorColorByTheme(room) {
    return ['#222', '#2a2a2a', '#333'];
}

function drawThemedFloor(tile, x, y, size) {
    const room = game.rooms.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    if (!room) { ctx.fillStyle = '#222'; ctx.fillRect(x, y, size, size); return; }
    const colors = getFloorColorByTheme(room);
    const pattern = (room.x + room.y + Math.floor(tile.x) + Math.floor(tile.y)) % colors.length;
    ctx.fillStyle = colors[pattern];
    ctx.fillRect(x, y, size, size);
}

/**
 * Apply radial gradient fog of war overlay for smooth visibility fade
 * Creates a gradient that spans across tiles for seamless transition
 */
function applyRadialFogOverlay(ctx, player, camX, camY, tileSize, offsetX, viewW, viewH) {
    // Get vision ranges from VisionSystem
    const fullVisionRange = typeof VisionSystem !== 'undefined'
        ? VisionSystem.getPlayerVisionRange()
        : 4;
    const fadeDistance = typeof VisionSystem !== 'undefined'
        ? VisionSystem.config.fadeDistance
        : 2;
    const totalRange = fullVisionRange + fadeDistance;

    // Calculate player's screen position
    const playerScreenX = (player.displayX - camX) * tileSize + offsetX;
    const playerScreenY = (player.displayY - camY) * tileSize;

    // Calculate radii in pixels
    const innerRadius = fullVisionRange * tileSize;
    const outerRadius = totalRange * tileSize;

    // Create radial gradient centered on player
    const gradient = ctx.createRadialGradient(
        playerScreenX, playerScreenY, innerRadius,  // Inner circle (full visibility)
        playerScreenX, playerScreenY, outerRadius   // Outer circle (full darkness)
    );

    // Add color stops to approximate smoothstep curve
    // We use multiple stops to create a smooth ease-in-ease-out effect
    const steps = 20; // Number of gradient steps for smooth interpolation
    for (let i = 0; i <= steps; i++) {
        const t = i / steps; // 0 to 1

        // Apply smoothstep function: t * t * (3 - 2 * t)
        const smoothT = t * t * (3 - 2 * t);

        // Calculate darkness (0 = transparent, 0.8 = nearly opaque)
        const darkness = smoothT * 0.8;

        gradient.addColorStop(t, `rgba(0, 0, 0, ${darkness})`);
    }

    // Draw gradient overlay across entire viewport
    ctx.fillStyle = gradient;
    ctx.fillRect(offsetX, 0, viewW, viewH);
}

function render() {
    ctx.fillStyle = '#000'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
 if (!game.player) {
        return; // Don't render if player doesn't exist yet
    }

if (game.state === 'menu') {
        ctx.fillStyle = '#fff'; ctx.font = '64px monospace'; ctx.textAlign = 'center'; ctx.fillText('THE SHIFTING CHASM', canvas.width / 2, 400); ctx.font = '32px monospace'; ctx.fillText('Press SPACE to Start', canvas.width / 2, 500);
    } else if (game.state === 'playing' || game.state === 'merchant' || game.state === 'inventory' || game.state === 'map' || game.state === 'skills' || game.state === 'moveset' || game.state === 'levelup') {

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

const camX = game.camera.x;
const camY = game.camera.y;

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

                // FOG OF WAR: Render unexplored tiles as dark gray
                if (!tile.explored) {
                    ctx.fillStyle = '#2a2a2a';
                    ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
                    continue;
                }

                // Render the tile normally
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

                // FOG OF WAR: Apply darkness overlay for remembered (not currently visible) tiles
                if (tile.explored && !tile.visible) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                    ctx.fillRect(screenX, screenY, effectiveTileSize, effectiveTileSize);
                }
                // Note: Per-tile visibility overlay removed in favor of radial gradient (see Layer 1.4)
            }
        }

        // LAYER 1.4: Apply radial gradient fog of war overlay (smooth fade across tiles)
        if (typeof applyRadialFogOverlay === 'function') {
            applyRadialFogOverlay(ctx, game.player, camX, camY, effectiveTileSize, TRACKER_WIDTH, viewW, viewH);
        }

        // LAYER 1.5: Draw room perimeter walls with proper corners/edges (NEW!)
        // DISABLED for blob-based dungeons - walls are rendered in Layer 1 based on game.map[y][x].type
        // The renderAllWalls() function draws rectangular perimeters which don't work for organic blob shapes
        // if (typeof renderAllWalls === 'function') {
        //     renderAllWalls(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        // }
        
        // LAYER 2: Draw loot piles
        if (typeof renderLootPiles === 'function') {
            renderLootPiles(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
        }
        
        // LAYER 3: Draw decorations
        if (typeof renderRoomDecorations === 'function') {
            renderRoomDecorations(camX, camY, effectiveTileSize, TRACKER_WIDTH);
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
        if (typeof renderProjectiles === 'function') { renderProjectiles(ctx, camX, camY, effectiveTileSize); }

        if (typeof renderDamageNumbers === 'function') { renderDamageNumbers(camX, camY, effectiveTileSize, TRACKER_WIDTH); }
        ctx.restore();
        drawTracker();

        // DISABLED: Old skills action bar (replaced by combat action bar)
        // if (typeof drawActionBar === 'function') {
        //     drawActionBar();
        // }
        if (!game.merchant && game.state !== 'inventory' && game.state !== 'map' && game.state !== 'skills' && game.state !== 'moveset' && game.state !== 'levelup') {
            ctx.fillStyle = '#fff'; ctx.font = '20px monospace'; ctx.textAlign = 'left'; const msgX = TRACKER_WIDTH + 20; const msgY = canvas.height - 40;
            if (game.messageLog.length > 0 && Date.now() - game.lastMessageTime < 3000) { ctx.fillText(game.messageLog[game.messageLog.length - 1].text, msgX, msgY); }
        }
        drawNotification();
    } else if (game.state === 'gameover') {
        ctx.fillStyle = '#e74c3c'; ctx.font = '64px monospace'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', canvas.width / 2, 500); ctx.fillStyle = '#fff'; ctx.font = '32px monospace'; ctx.fillText('Press SPACE to Restart', canvas.width / 2, 600);
    }
    if (typeof renderUIOverlays === 'function') { renderUIOverlays(ctx); }

    // Combat action bar (hotkeys 1-4) - Draw AFTER overlays so icons appear on top
    if (typeof drawCombatActionBar === 'function') {
        drawCombatActionBar(ctx, canvas.width, canvas.height);
    }

    // Draw popup menus LAST so they appear on top of action icons
    if (game.state === 'merchant') drawMerchant();
    if (game.state === 'inventory') drawInventoryOverlay();
    if (game.state === 'map') drawMapOverlay();
    if (game.state === 'skills') drawSkillsOverlay();
    if (game.state === 'moveset') drawMoveSetOverlay();
    if (game.state === 'levelup') drawLevelUpScreen();
}