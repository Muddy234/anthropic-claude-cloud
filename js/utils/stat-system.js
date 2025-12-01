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

function checkLevelUp() {
    if (!game.player) return;
    const xpNeeded = 100 + (game.player.level - 1) * 150;
    if (game.player.xp >= xpNeeded) {
        const remainingXP = game.player.xp - xpNeeded;
        game.player.xp = remainingXP;
        game.player.level++;
        game.player.hp = game.player.maxHp;
        game.player.mana = game.player.maxMana;
        game.player.stamina = game.player.maxStamina;
        game.state = 'levelup';
        game.levelUpData = { attributePoints: 3, skillPoints: 1, tempStats: { ...game.player.stats } };
        addMessage(`LEVEL UP! Now Level ${game.player.level}!`);
    }
}