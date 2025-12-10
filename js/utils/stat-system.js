function recalculateDerivedStats() {
    if (!game.player) return;
    const s = game.player.stats;

    // Calculate equipment bonuses
    let equipBonus = { str: 0, agi: 0, int: 0, pDef: 0, mDef: 0 };
    Object.values(game.player.equipped).forEach(item => {
        if (item) {
            equipBonus.str += item.str || 0;
            equipBonus.agi += item.agi || 0;
            equipBonus.int += item.int || 0;
            equipBonus.pDef += item.pDef || 0;
            equipBonus.mDef += item.mDef || 0;
        }
    });

    // Apply base stats + equipment bonuses
    const totalSTR = s.STR + equipBonus.str;
    const totalAGI = s.AGI + equipBonus.agi;
    const totalINT = s.INT + equipBonus.int;
    const totalSTA = s.STA;

    // Core derived stats
    game.player.meleeDmg = 5 + (totalSTR * 1.5);
    game.player.pDef = 5 + (totalSTR * 0.5) + equipBonus.pDef;
    game.player.critChance = 5 + (totalAGI * 0.5);
    game.player.dodgeChance = Math.min(60, totalAGI * 0.25);
    game.player.runChance = 50 + (totalAGI * 2);
    game.player.magicDmg = 5 + (totalINT * 1.5);
    game.player.maxMana = 50 + (totalINT * 5);
    game.player.mDef = 5 + (totalINT * 0.5) + equipBonus.mDef;
    game.player.maxHp = totalSTA * 10;
    game.player.maxStamina = totalSTA * 10;
    game.player.hpRegen = 0.5 + (totalSTA * 0.1);
    game.player.combatHpRegen = totalSTA * 0.2;

    // Store AGI on player for combat system access
    game.player.agi = totalAGI;
    
    // Update attack range based on weapon type (for future ranged weapons)
    const mainHand = game.player.equipped.MAIN;
    if (mainHand && mainHand.range) {
        game.player.combat.attackRange = mainHand.range;
    } else {
        game.player.combat.attackRange = 1; // Melee range
    }
}

function checkLevelUp(player) {
    // Support both calling conventions
    if (!player) player = game.player;
    if (!player) return;

    // Track total levels gained for this check
    let levelsGained = 0;

    // Use player.xpToNextLevel if available, otherwise calculate
    // Loop to handle multiple level-ups at once
    while (true) {
        const xpNeeded = player.xpToNextLevel || (100 + (player.level - 1) * 150);

        if (player.xp < xpNeeded) break;

        // Level up!
        player.xp -= xpNeeded;
        player.level++;
        levelsGained++;

        // Update xpToNextLevel for next iteration (1.5x scaling like player.js)
        player.xpToNextLevel = Math.floor(xpNeeded * 1.5);

        // Auto-increment stats (+1 to each per level)
        if (player.stats) {
            player.stats.STR = (player.stats.STR || 10) + 1;
            player.stats.AGI = (player.stats.AGI || 10) + 1;
            player.stats.INT = (player.stats.INT || 10) + 1;
            player.stats.STA = (player.stats.STA || 10) + 1;
        }

        if (typeof addMessage === 'function') {
            addMessage(`LEVEL UP! Now Level ${player.level}!`);
        }
        console.log(`[LevelUp] Player reached level ${player.level}`);
    }

    // If any levels gained, recalculate stats and restore resources
    if (levelsGained > 0) {
        if (typeof recalculatePlayerStats === 'function') {
            recalculatePlayerStats(player);
        }

        // Restore resources on level up
        player.hp = player.maxHp;
        if (player.maxMana !== undefined) player.mana = player.maxMana;
        if (player.maxMp !== undefined) player.mp = player.maxMp;
        if (player.maxStamina !== undefined) player.stamina = player.maxStamina;
    }
}