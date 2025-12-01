// === UI RENDERING FOR CONTEXT MENU AND INSPECT POPUP ===
// Add this to your renderer.js or create as a separate ui-renderer.js file

/**
 * Render the right-click context menu
 */
function renderContextMenu(ctx) {
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
 * Render the inspect popup
 */
function renderInspectPopup(ctx) {
    if (!inspectPopup.visible) return;

    const popupWidth = 400;
    const popupHeight = 500;
    const popupX = (canvas.width - popupWidth) / 2;
    const popupY = (canvas.height - popupHeight) / 2;

    // Semi-transparent background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Popup background
    ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.fillRect(popupX, popupY, popupWidth, popupHeight);

    // Popup border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);

    // Close button (X)
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#f00';
    ctx.textAlign = 'right';
    ctx.fillText('X', popupX + popupWidth - 10, popupY + 25);

    // Title
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    
    let title = 'Inspection';
    if (inspectPopup.targetType === 'enemy') {
        title = inspectPopup.target.name || 'Unknown Enemy';
    } else if (inspectPopup.targetType === 'npc') {
        title = inspectPopup.target.name || 'Merchant';
    } else if (inspectPopup.targetType === 'tile') {
        title = `Tile (${inspectPopup.target.x}, ${inspectPopup.target.y})`;
    }
    
    ctx.fillText(title, popupX + popupWidth/2, popupY + 30);

    // Image placeholder
    const imgX = popupX + (popupWidth - 150) / 2;
    const imgY = popupY + 50;
    ctx.fillStyle = '#333';
    ctx.fillRect(imgX, imgY, 150, 150);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(imgX, imgY, 150, 150);
    
    // Placeholder text
    ctx.font = '12px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('[Image]', imgX + 75, imgY + 75);

    // Content area
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ddd';
    ctx.textAlign = 'left';
    let contentY = imgY + 170;
    const lineHeight = 20;

    if (inspectPopup.targetType === 'enemy') {
        const enemy = inspectPopup.target;
        
        // Stats
        const stats = [
            `HP: ${enemy.hp}/${enemy.maxHp}`,
            `STR: ${enemy.str || 10}`,
            `AGI: ${enemy.agi || 10}`,
            `Defense: ${enemy.pDef || 0}`,
            `Element: ${enemy.element || 'physical'}`,
            `XP Value: ${enemy.xp || 10}`,
            `Gold Drop: ${enemy.goldMin || 0}-${enemy.goldMax || 10}`
        ];

        ctx.fillStyle = '#0f0';
        ctx.fillText('== STATS ==', popupX + 20, contentY);
        contentY += lineHeight;
        
        ctx.fillStyle = '#ddd';
        for (const stat of stats) {
            ctx.fillText(stat, popupX + 20, contentY);
            contentY += lineHeight;
        }

        // Description
        contentY += 10;
        ctx.fillStyle = '#0ff';
        ctx.fillText('== DESCRIPTION ==', popupX + 20, contentY);
        contentY += lineHeight;
        
        ctx.fillStyle = '#ddd';
        const description = enemy.description || getEnemyDescription(enemy);
        
        // Word wrap description
        const words = description.split(' ');
        let line = '';
        const maxWidth = popupWidth - 40;
        
        for (const word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth) {
                ctx.fillText(line, popupX + 20, contentY);
                line = word + ' ';
                contentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line) {
            ctx.fillText(line, popupX + 20, contentY);
        }
        
    } else if (inspectPopup.targetType === 'npc') {
        ctx.fillStyle = '#0f0';
        ctx.fillText('== NPC INFO ==', popupX + 20, contentY);
        contentY += lineHeight;
        
        ctx.fillStyle = '#ddd';
        ctx.fillText('Type: Merchant', popupX + 20, contentY);
        contentY += lineHeight;
        ctx.fillText('Status: Friendly', popupX + 20, contentY);
        contentY += lineHeight * 2;
        
        ctx.fillStyle = '#0ff';
        ctx.fillText('== DESCRIPTION ==', popupX + 20, contentY);
        contentY += lineHeight;
        
        ctx.fillStyle = '#ddd';
        const desc = 'A mysterious merchant who appears in the depths of the dungeon. ' +
                     'They offer potions and will buy your unwanted items for gold.';
        
        // Word wrap
        const words = desc.split(' ');
        let line = '';
        const maxWidth = popupWidth - 40;
        
        for (const word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth) {
                ctx.fillText(line, popupX + 20, contentY);
                line = word + ' ';
                contentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line) {
            ctx.fillText(line, popupX + 20, contentY);
        }
        
    } else if (inspectPopup.targetType === 'tile') {
        const tile = game.map[inspectPopup.target.y][inspectPopup.target.x];
        
        ctx.fillStyle = '#0f0';
        ctx.fillText('== TILE INFO ==', popupX + 20, contentY);
        contentY += lineHeight;
        
        ctx.fillStyle = '#ddd';
        ctx.fillText(`Type: ${tile ? tile.type : 'unknown'}`, popupX + 20, contentY);
        contentY += lineHeight;
        ctx.fillText(`Walkable: ${tile && tile.type === 'floor' ? 'Yes' : 'No'}`, popupX + 20, contentY);
        contentY += lineHeight;
        
        if (tile && tile.room) {
            ctx.fillText(`Room: ${tile.room.id || 'Main'}`, popupX + 20, contentY);
            contentY += lineHeight;
        }
    }

    // Instructions
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Press ESC or click X to close', popupX + popupWidth/2, popupY + popupHeight - 15);
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