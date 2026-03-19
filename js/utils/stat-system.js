// === js/utils/stat-system.js ===
// Stat calculation and level-up utilities

/**
 * Recalculate all derived player stats from base stats and equipment
 * Should be called after equipment changes, level ups, or buff/debuff changes
 */
function recalculateDerivedStats() {
    // Guard: ensure player and required properties exist
    if (!game?.player) {
        console.warn('[StatSystem] Cannot recalculate stats: game.player not initialized');
        return;
    }

    const player = game.player;

    // Guard: ensure stats object exists
    if (!player.stats) {
        console.warn('[StatSystem] Cannot recalculate stats: player.stats not initialized');
        return;
    }

    const s = player.stats;

    // Calculate equipment bonuses with null safety
    let equipBonus = { str: 0, agi: 0, int: 0, pDef: 0, mDef: 0 };

    // Only process equipped items if equipped object exists
    if (player.equipped && typeof player.equipped === 'object') {
        Object.values(player.equipped).forEach(item => {
            if (item) {
                equipBonus.str += item.str || 0;
                equipBonus.agi += item.agi || 0;
                equipBonus.int += item.int || 0;
                equipBonus.pDef += item.pDef || 0;
                equipBonus.mDef += item.mDef || 0;
            }
        });
    }

    // Apply base stats + equipment bonuses with null coalescing
    const totalSTR = (s.STR || 0) + equipBonus.str;
    const totalAGI = (s.AGI || 0) + equipBonus.agi;
    const totalINT = (s.INT || 0) + equipBonus.int;
    const totalSTA = s.STA || 0;

    // Core derived stats
    player.meleeDmg = 5 + (totalSTR * 1.5);
    player.pDef = 5 + (totalSTR * 0.5) + equipBonus.pDef;
    player.critChance = 5 + (totalAGI * 0.5);
    player.dodgeChance = Math.min(60, totalAGI * 0.25);
    player.runChance = 50 + (totalAGI * 2);
    player.magicDmg = 5 + (totalINT * 1.5);
    player.maxMana = 50 + (totalINT * 5);
    player.mDef = 5 + (totalINT * 0.5) + equipBonus.mDef;
    player.maxHp = totalSTA * 10;
    player.maxStamina = totalSTA * 10;
    player.hpRegen = 0.5 + (totalSTA * 0.1);
    player.combatHpRegen = totalSTA * 0.2;

    // Store AGI on player for combat system access
    player.agi = totalAGI;

    // Update attack range based on weapon type (for future ranged weapons)
    // Guard: ensure equipped object exists before accessing MAIN slot
    const mainHand = player.equipped?.MAIN;
    if (mainHand && mainHand.range) {
        // Guard: ensure combat object exists before setting attackRange
        if (player.combat) {
            player.combat.attackRange = mainHand.range;
        }
    } else {
        // Melee range - only set if combat object exists
        if (player.combat) {
            player.combat.attackRange = 1;
        }
    }
}

/**
 * Check if player has earned enough XP to level up
 * Handles multiple level-ups in a single call
 * @param {Object} player - Player object (defaults to game.player)
 */
function checkLevelUp(player) {
    // Support both calling conventions with null safety
    if (!player) player = game?.player;
    if (!player) {
        console.warn('[StatSystem] Cannot check level up: no player provided');
        return;
    }

    // Ensure required properties exist
    if (typeof player.level !== 'number') {
        player.level = 1;
    }
    if (typeof player.xp !== 'number') {
        player.xp = 0;
    }

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

        // Auto-increment stats (+1 to each per level) with null safety
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
        // Try multiple function names for stat recalculation
        if (typeof recalculatePlayerStats === 'function') {
            recalculatePlayerStats(player);
        } else if (typeof recalculateDerivedStats === 'function') {
            recalculateDerivedStats();
        }

        // Restore resources on level up with null safety
        if (typeof player.maxHp === 'number') {
            player.hp = player.maxHp;
        }
        if (typeof player.maxMana === 'number') {
            player.mana = player.maxMana;
        }
        if (typeof player.maxMp === 'number') {
            player.mp = player.maxMp;
        }
        if (typeof player.maxStamina === 'number') {
            player.stamina = player.maxStamina;
        }
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make functions globally available
window.recalculateDerivedStats = recalculateDerivedStats;
window.checkLevelUp = checkLevelUp;

console.log('[StatSystem] Stat calculation utilities initialized');
