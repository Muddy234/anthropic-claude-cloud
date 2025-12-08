#!/usr/bin/env node
// ============================================================================
// BALANCE ANALYZER - The Shifting Chasm
// ============================================================================
// Standalone combat simulation tool for balance testing
// Run: node tools/balance-analyzer.js
// ============================================================================

// ============================================================================
// MONSTER DATA (copied from game for standalone operation)
// ============================================================================

const MONSTER_DATA = {
    // === VOLCANIC MONSTERS ===
    'Magma Slime': {
        hp: 60, str: 12, agi: 5, int: 8, pDef: 15, mDef: 8,
        xp: 25, goldMin: 10, goldMax: 15,
        element: 'fire', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.5, armorType: 'unarmored'
    },
    'Obsidian Golem': {
        hp: 105, str: 18, agi: 3, int: 4, pDef: 20, mDef: 5,
        xp: 45, goldMin: 15, goldMax: 25,
        element: 'physical', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 3.0, armorType: 'stone'
    },
    'Cinder Wisp': {
        hp: 30, str: 3, agi: 16, int: 18, pDef: 2, mDef: 15,
        xp: 35, goldMin: 12, goldMax: 18,
        element: 'fire', attackType: 'magic', damageType: 'magic',
        attackRange: 4, attackSpeed: 1.5, armorType: 'ethereal'
    },
    'Flame Bat': {
        hp: 40, str: 10, agi: 20, int: 2, pDef: 4, mDef: 4,
        xp: 30, goldMin: 5, goldMax: 10,
        element: 'fire', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.2, armorType: 'unarmored'
    },
    'Ash Walker': {
        hp: 75, str: 14, agi: 6, int: 5, pDef: 8, mDef: 12,
        xp: 30, goldMin: 8, goldMax: 12,
        element: 'shadow', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.2, armorType: 'hide'
    },
    'Salamander': {
        hp: 55, str: 12, agi: 12, int: 10, pDef: 10, mDef: 10,
        xp: 35, goldMin: 15, goldMax: 20,
        element: 'nature', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 1.8, armorType: 'scaled'
    },
    'Pyro Cultist': {
        hp: 50, str: 6, agi: 10, int: 16, pDef: 5, mDef: 8,
        xp: 40, goldMin: 20, goldMax: 30,
        element: 'fire', attackType: 'magic', damageType: 'magic',
        attackRange: 5, attackSpeed: 2.0, armorType: 'unarmored'
    },

    // === CAVE MONSTERS ===
    'Cave Bat': {
        hp: 25, str: 6, agi: 18, int: 2, pDef: 2, mDef: 2,
        xp: 15, goldMin: 3, goldMax: 8,
        element: 'physical', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.0, armorType: 'unarmored'
    },
    'Stone Lurker': {
        hp: 80, str: 14, agi: 4, int: 3, pDef: 18, mDef: 5,
        xp: 35, goldMin: 12, goldMax: 20,
        element: 'earth', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.8, armorType: 'stone'
    },
    'Mushroom Sprite': {
        hp: 35, str: 5, agi: 8, int: 14, pDef: 4, mDef: 12,
        xp: 28, goldMin: 8, goldMax: 15,
        element: 'nature', attackType: 'magic', damageType: 'magic',
        attackRange: 3, attackSpeed: 2.2, armorType: 'unarmored'
    },
    'Crystal Spider': {
        hp: 45, str: 11, agi: 14, int: 6, pDef: 8, mDef: 10,
        xp: 32, goldMin: 10, goldMax: 18,
        element: 'physical', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.3, armorType: 'scaled'
    },

    // === UNDEAD MONSTERS ===
    'Skeletal Warrior': {
        hp: 50, str: 13, agi: 8, int: 3, pDef: 10, mDef: 3,
        xp: 28, goldMin: 8, goldMax: 15,
        element: 'death', attackType: 'physical', damageType: 'blade',
        attackRange: 1, attackSpeed: 1.8, armorType: 'bone'
    },
    'Phantom': {
        hp: 40, str: 4, agi: 12, int: 16, pDef: 2, mDef: 18,
        xp: 38, goldMin: 15, goldMax: 25,
        element: 'death', attackType: 'magic', damageType: 'magic',
        attackRange: 3, attackSpeed: 2.0, armorType: 'ethereal'
    },
    'Bone Golem': {
        hp: 120, str: 20, agi: 3, int: 2, pDef: 16, mDef: 8,
        xp: 55, goldMin: 20, goldMax: 35,
        element: 'death', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 3.2, armorType: 'bone'
    },

    // === AQUATIC MONSTERS ===
    'Deep Crawler': {
        hp: 55, str: 12, agi: 10, int: 4, pDef: 12, mDef: 6,
        xp: 30, goldMin: 10, goldMax: 18,
        element: 'water', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.6, armorType: 'scaled'
    },
    'Tide Serpent': {
        hp: 65, str: 14, agi: 14, int: 8, pDef: 8, mDef: 10,
        xp: 40, goldMin: 15, goldMax: 25,
        element: 'water', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.4, armorType: 'scaled'
    },

    // === SHADOW MONSTERS ===
    'Shadow Stalker': {
        hp: 45, str: 15, agi: 16, int: 8, pDef: 6, mDef: 10,
        xp: 42, goldMin: 18, goldMax: 28,
        element: 'shadow', attackType: 'physical', damageType: 'blade',
        attackRange: 1, attackSpeed: 1.0, armorType: 'hide'
    },
    'Void Touched': {
        hp: 70, str: 10, agi: 8, int: 18, pDef: 8, mDef: 16,
        xp: 48, goldMin: 22, goldMax: 35,
        element: 'shadow', attackType: 'magic', damageType: 'magic',
        attackRange: 4, attackSpeed: 1.8, armorType: 'ethereal'
    }
};

// ============================================================================
// FLOOR SCALING CONFIG
// ============================================================================

const FLOOR_SCALING = {
    hp: 0.12,
    str: 0.12,
    agi: 0.12,
    int: 0.12,
    pDef: 0.12,
    mDef: 0.12,
    xp: 0.10,
    gold: 0.10,
    maxMultiplier: 3.0,
    minScalingFloor: 1
};

// ============================================================================
// COMBAT CONFIG
// ============================================================================

const COMBAT_CONFIG = {
    baseAttackTime: 700,      // ms base attack time
    baseVariance: 0.10,       // ±10% damage variance
    minDamage: 1,
    baseCritChance: 0.05,     // 5% base crit
    critMultiplier: 1.5,
    defenseScaling: 0.01,     // 1% reduction per defense point
    maxDefenseReduction: 0.75, // Cap at 75%
    baseHitChance: 0.90,      // 90% base hit chance
    agiHitBonus: 0.002,       // +0.2% hit per AGI
    agiCritBonus: 0.001       // +0.1% crit per AGI
};

// ============================================================================
// DEFAULT PLAYER STATS (baseline for floor 1)
// ============================================================================

let PLAYER_STATS = {
    hp: 100,
    str: 12,
    agi: 10,
    int: 10,
    pDef: 5,
    mDef: 5,
    weaponDamage: 8,
    weaponSpeed: 1.0,
    weaponType: 'blade',      // blade, blunt, pierce
    armorType: 'unarmored'    // for enemy attacks against player
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function scaleStats(baseStats, floor) {
    const cfg = FLOOR_SCALING;
    if (floor < cfg.minScalingFloor) floor = cfg.minScalingFloor;

    const scale = (base, rate) => {
        if (typeof base !== 'number' || isNaN(base)) return base;
        const mult = Math.min(cfg.maxMultiplier, 1 + (floor - 1) * rate);
        return Math.floor(base * mult);
    };

    return {
        ...baseStats,
        hp: scale(baseStats.hp, cfg.hp),
        str: scale(baseStats.str, cfg.str),
        agi: scale(baseStats.agi, cfg.agi),
        int: scale(baseStats.int, cfg.int),
        pDef: scale(baseStats.pDef, cfg.pDef),
        mDef: scale(baseStats.mDef, cfg.mDef),
        level: floor
    };
}

function calculateDamage(attacker, defender, isPlayer) {
    const cfg = COMBAT_CONFIG;

    // Base damage calculation
    let baseDamage;
    if (isPlayer) {
        // Player: weapon damage + stat scaling
        const statBonus = Math.floor(attacker.str * 0.5);
        baseDamage = attacker.weaponDamage + statBonus;
    } else {
        // Monster: stat-based damage
        const stat = attacker.attackType === 'magic' ? attacker.int : attacker.str;
        baseDamage = Math.floor(stat * 0.5) + Math.floor(stat / 5);
    }

    // Defense reduction
    const defense = attacker.attackType === 'magic' ? defender.mDef : defender.pDef;
    const reduction = Math.min(defense * cfg.defenseScaling, cfg.maxDefenseReduction);
    const defenseMod = 1 - reduction;

    // Apply defense
    let damage = baseDamage * defenseMod;

    // Variance (±10%)
    const variance = 1 - cfg.baseVariance + (Math.random() * cfg.baseVariance * 2);
    damage *= variance;

    return Math.max(cfg.minDamage, Math.floor(damage));
}

function rollHit(attacker, defender) {
    const cfg = COMBAT_CONFIG;
    let hitChance = cfg.baseHitChance;

    const attackerAgi = attacker.agi || 10;
    const defenderAgi = defender.agi || 10;

    hitChance += attackerAgi * cfg.agiHitBonus;
    hitChance -= defenderAgi * cfg.agiHitBonus;

    hitChance = Math.max(0.50, Math.min(0.98, hitChance));
    return Math.random() < hitChance;
}

function rollCrit(attacker) {
    const cfg = COMBAT_CONFIG;
    let critChance = cfg.baseCritChance;
    critChance += (attacker.agi || 10) * cfg.agiCritBonus;
    critChance = Math.min(0.50, critChance);
    return Math.random() < critChance;
}

function getAttackTime(entity, isPlayer) {
    const cfg = COMBAT_CONFIG;
    if (isPlayer) {
        return cfg.baseAttackTime * (entity.weaponSpeed || 1.0);
    } else {
        return cfg.baseAttackTime * (entity.attackSpeed || 1.0);
    }
}

// ============================================================================
// COMBAT SIMULATION
// ============================================================================

function simulateFight(player, monster) {
    let playerHp = player.hp;
    let monsterHp = monster.hp;

    let playerTimer = 0;
    let monsterTimer = 0;

    const playerAttackTime = getAttackTime(player, true);
    const monsterAttackTime = getAttackTime(monster, false);

    let totalDamageToMonster = 0;
    let totalDamageToPlayer = 0;
    let playerHits = 0;
    let monsterHits = 0;
    let playerCrits = 0;
    let monsterCrits = 0;
    let playerMisses = 0;
    let monsterMisses = 0;
    let turns = 0;
    let comboCount = 1;

    const timeStep = 50; // 50ms simulation step
    const maxTime = 60000; // 60 second max fight
    let elapsedTime = 0;

    while (playerHp > 0 && monsterHp > 0 && elapsedTime < maxTime) {
        elapsedTime += timeStep;
        playerTimer += timeStep;
        monsterTimer += timeStep;

        // Player attacks
        if (playerTimer >= playerAttackTime) {
            playerTimer = 0;
            turns++;

            if (rollHit(player, monster)) {
                let damage = calculateDamage(player, monster, true);
                if (rollCrit(player)) {
                    damage = Math.floor(damage * COMBAT_CONFIG.critMultiplier);
                    playerCrits++;
                }
                monsterHp -= damage;
                totalDamageToMonster += damage;
                playerHits++;
            } else {
                playerMisses++;
            }
        }

        // Monster attacks
        if (monsterTimer >= monsterAttackTime && monsterHp > 0) {
            monsterTimer = 0;

            if (rollHit(monster, player)) {
                let damage = calculateDamage(monster, player, false);
                if (rollCrit(monster)) {
                    damage = Math.floor(damage * COMBAT_CONFIG.critMultiplier);
                    monsterCrits++;
                }
                // Combo finisher (every 3rd hit)
                if (comboCount === 3) {
                    damage = Math.floor(damage * 1.5);
                }
                playerHp -= damage;
                totalDamageToPlayer += damage;
                monsterHits++;
                comboCount = (comboCount % 3) + 1;
            } else {
                monsterMisses++;
            }
        }
    }

    return {
        playerWins: playerHp > 0,
        playerHpRemaining: Math.max(0, playerHp),
        monsterHpRemaining: Math.max(0, monsterHp),
        totalDamageToMonster,
        totalDamageToPlayer,
        playerHits,
        monsterHits,
        playerCrits,
        monsterCrits,
        playerMisses,
        monsterMisses,
        turns,
        fightDuration: elapsedTime
    };
}

function runSimulations(monsterName, floor, numSimulations = 1000) {
    const baseMonster = MONSTER_DATA[monsterName];
    if (!baseMonster) {
        console.error(`Unknown monster: ${monsterName}`);
        return null;
    }

    const monster = scaleStats(baseMonster, floor);
    const player = { ...PLAYER_STATS };

    const results = {
        playerWins: 0,
        monsterWins: 0,
        playerHpRemaining: [],
        monsterHpRemaining: [],
        damageToMonster: [],
        damageToPlayer: [],
        fightDurations: [],
        playerCritRate: 0,
        monsterCritRate: 0,
        playerHitRate: 0,
        monsterHitRate: 0
    };

    let totalPlayerHits = 0;
    let totalPlayerMisses = 0;
    let totalPlayerCrits = 0;
    let totalMonsterHits = 0;
    let totalMonsterMisses = 0;
    let totalMonsterCrits = 0;

    for (let i = 0; i < numSimulations; i++) {
        const result = simulateFight(player, monster);

        if (result.playerWins) {
            results.playerWins++;
            results.playerHpRemaining.push(result.playerHpRemaining);
        } else {
            results.monsterWins++;
            results.monsterHpRemaining.push(result.monsterHpRemaining);
        }

        results.damageToMonster.push(result.totalDamageToMonster);
        results.damageToPlayer.push(result.totalDamageToPlayer);
        results.fightDurations.push(result.fightDuration);

        totalPlayerHits += result.playerHits;
        totalPlayerMisses += result.playerMisses;
        totalPlayerCrits += result.playerCrits;
        totalMonsterHits += result.monsterHits;
        totalMonsterMisses += result.monsterMisses;
        totalMonsterCrits += result.monsterCrits;
    }

    // Calculate averages
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    results.avgPlayerHpRemaining = avg(results.playerHpRemaining);
    results.avgMonsterHpRemaining = avg(results.monsterHpRemaining);
    results.avgDamageToMonster = avg(results.damageToMonster);
    results.avgDamageToPlayer = avg(results.damageToPlayer);
    results.avgFightDuration = avg(results.fightDurations);

    results.playerHitRate = totalPlayerHits / (totalPlayerHits + totalPlayerMisses);
    results.monsterHitRate = totalMonsterHits / (totalMonsterHits + totalMonsterMisses);
    results.playerCritRate = totalPlayerCrits / totalPlayerHits;
    results.monsterCritRate = totalMonsterCrits / totalMonsterHits;

    return { monster, player, results, numSimulations };
}

// ============================================================================
// THEORETICAL CALCULATIONS (no RNG)
// ============================================================================

function calculateTheoretical(monsterName, floor) {
    const baseMonster = MONSTER_DATA[monsterName];
    if (!baseMonster) return null;

    const monster = scaleStats(baseMonster, floor);
    const player = { ...PLAYER_STATS };

    // Player damage per hit
    const playerStatBonus = Math.floor(player.str * 0.5);
    const playerBaseDamage = player.weaponDamage + playerStatBonus;
    const monsterDefReduction = Math.min(monster.pDef * COMBAT_CONFIG.defenseScaling, COMBAT_CONFIG.maxDefenseReduction);
    const playerDamagePerHit = Math.floor(playerBaseDamage * (1 - monsterDefReduction));

    // Monster damage per hit
    const monsterStat = monster.attackType === 'magic' ? monster.int : monster.str;
    const monsterBaseDamage = Math.floor(monsterStat * 0.5) + Math.floor(monsterStat / 5);
    const playerDefense = monster.attackType === 'magic' ? player.mDef : player.pDef;
    const playerDefReduction = Math.min(playerDefense * COMBAT_CONFIG.defenseScaling, COMBAT_CONFIG.maxDefenseReduction);
    const monsterDamagePerHit = Math.floor(monsterBaseDamage * (1 - playerDefReduction));

    // Attack times
    const playerAttackTime = getAttackTime(player, true);
    const monsterAttackTime = getAttackTime(monster, false);

    // DPS calculations
    const playerDPS = (playerDamagePerHit / playerAttackTime) * 1000;
    const monsterDPS = (monsterDamagePerHit / monsterAttackTime) * 1000;

    // TTK calculations
    const playerTTK = monster.hp / playerDPS;
    const monsterTTK = player.hp / monsterDPS;

    // Danger ratio (>1 = player favored)
    const dangerRatio = monsterTTK / playerTTK;

    // Hits to kill
    const playerHitsToKill = Math.ceil(monster.hp / playerDamagePerHit);
    const monsterHitsToKill = Math.ceil(player.hp / monsterDamagePerHit);

    return {
        monster,
        player,
        playerDamagePerHit,
        monsterDamagePerHit,
        playerAttackTime,
        monsterAttackTime,
        playerDPS: playerDPS.toFixed(2),
        monsterDPS: monsterDPS.toFixed(2),
        playerTTK: playerTTK.toFixed(2),
        monsterTTK: monsterTTK.toFixed(2),
        dangerRatio: dangerRatio.toFixed(2),
        playerHitsToKill,
        monsterHitsToKill
    };
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function printHeader(title) {
    const line = '═'.repeat(70);
    console.log('\n' + line);
    console.log(' ' + title);
    console.log(line);
}

function printSimulationResults(monsterName, floor, data) {
    const { monster, player, results, numSimulations } = data;

    printHeader(`COMBAT SIMULATION: Player vs ${monsterName} (Floor ${floor})`);

    console.log(`\nSimulations: ${numSimulations}`);
    console.log(`\n--- COMBATANTS ---`);
    console.log(`Player:  HP=${player.hp}  STR=${player.str}  AGI=${player.agi}  pDef=${player.pDef}  mDef=${player.mDef}`);
    console.log(`         Weapon: ${player.weaponDamage} dmg, ${player.weaponSpeed}x speed (${player.weaponType})`);
    console.log(`Monster: HP=${monster.hp}  STR=${monster.str}  AGI=${monster.agi}  pDef=${monster.pDef}  mDef=${monster.mDef}`);
    console.log(`         Attack: ${monster.attackType}, ${monster.attackSpeed}x speed`);

    console.log(`\n--- RESULTS ---`);
    const winRate = ((results.playerWins / numSimulations) * 100).toFixed(1);
    const lossRate = ((results.monsterWins / numSimulations) * 100).toFixed(1);
    console.log(`Player Wins:  ${results.playerWins} (${winRate}%)`);
    console.log(`Monster Wins: ${results.monsterWins} (${lossRate}%)`);

    if (results.playerWins > 0) {
        console.log(`\n--- WHEN PLAYER WINS ---`);
        const hpPct = ((results.avgPlayerHpRemaining / player.hp) * 100).toFixed(1);
        console.log(`Avg HP Remaining: ${results.avgPlayerHpRemaining.toFixed(1)} / ${player.hp} (${hpPct}%)`);
    }

    if (results.monsterWins > 0) {
        console.log(`\n--- WHEN MONSTER WINS ---`);
        const hpPct = ((results.avgMonsterHpRemaining / monster.hp) * 100).toFixed(1);
        console.log(`Avg HP Remaining: ${results.avgMonsterHpRemaining.toFixed(1)} / ${monster.hp} (${hpPct}%)`);
    }

    console.log(`\n--- COMBAT STATS ---`);
    console.log(`Avg Fight Duration: ${(results.avgFightDuration / 1000).toFixed(2)}s`);
    console.log(`Player Hit Rate:  ${(results.playerHitRate * 100).toFixed(1)}%`);
    console.log(`Monster Hit Rate: ${(results.monsterHitRate * 100).toFixed(1)}%`);
    console.log(`Player Crit Rate:  ${(results.playerCritRate * 100).toFixed(1)}%`);
    console.log(`Monster Crit Rate: ${(results.monsterCritRate * 100).toFixed(1)}%`);

    // Balance rating
    console.log(`\n--- BALANCE RATING ---`);
    let rating, stars;
    if (winRate >= 95) { rating = 'Too Easy'; stars = '★☆☆☆☆'; }
    else if (winRate >= 80) { rating = 'Easy'; stars = '★★☆☆☆'; }
    else if (winRate >= 60) { rating = 'Balanced'; stars = '★★★☆☆'; }
    else if (winRate >= 40) { rating = 'Challenging'; stars = '★★★★☆'; }
    else if (winRate >= 20) { rating = 'Hard'; stars = '★★★★★'; }
    else { rating = 'Too Hard'; stars = '☠☠☠☠☠'; }

    console.log(`${stars} ${rating} (${winRate}% win rate)`);
}

function printTheoreticalResults(monsterName, floor, data) {
    printHeader(`THEORETICAL ANALYSIS: Player vs ${monsterName} (Floor ${floor})`);

    console.log(`\n--- COMBATANTS ---`);
    console.log(`Player:  HP=${data.player.hp}  STR=${data.player.str}  pDef=${data.player.pDef}  mDef=${data.player.mDef}`);
    console.log(`Monster: HP=${data.monster.hp}  STR=${data.monster.str}  INT=${data.monster.int}  pDef=${data.monster.pDef}`);

    console.log(`\n--- DAMAGE ---`);
    console.log(`Player damage/hit:  ${data.playerDamagePerHit}`);
    console.log(`Monster damage/hit: ${data.monsterDamagePerHit}`);

    console.log(`\n--- ATTACK SPEED ---`);
    console.log(`Player attack time:  ${data.playerAttackTime}ms`);
    console.log(`Monster attack time: ${data.monsterAttackTime}ms`);

    console.log(`\n--- DPS ---`);
    console.log(`Player DPS:  ${data.playerDPS}`);
    console.log(`Monster DPS: ${data.monsterDPS}`);

    console.log(`\n--- TIME TO KILL ---`);
    console.log(`Player kills monster in:  ${data.playerTTK}s (${data.playerHitsToKill} hits)`);
    console.log(`Monster kills player in: ${data.monsterTTK}s (${data.monsterHitsToKill} hits)`);

    console.log(`\n--- DANGER RATIO ---`);
    const ratio = parseFloat(data.dangerRatio);
    let assessment;
    if (ratio >= 2.0) assessment = 'Very Safe (player heavily favored)';
    else if (ratio >= 1.5) assessment = 'Safe (player favored)';
    else if (ratio >= 1.0) assessment = 'Balanced';
    else if (ratio >= 0.7) assessment = 'Risky (monster favored)';
    else assessment = 'Dangerous (monster heavily favored)';

    console.log(`Ratio: ${data.dangerRatio} - ${assessment}`);
}

function printAllMonstersReport(floor) {
    printHeader(`BALANCE REPORT - FLOOR ${floor}`);

    console.log('\n%-20s %6s %6s %8s %8s %8s %10s'.replace(/%(\d+)s/g, (m, n) => ' '.repeat(n)));
    console.log('Monster              WinRate  Danger  P.DPS  M.DPS  P.TTK  Rating');
    console.log('-'.repeat(70));

    const monsterNames = Object.keys(MONSTER_DATA);
    const results = [];

    for (const name of monsterNames) {
        const sim = runSimulations(name, floor, 500);
        const theory = calculateTheoretical(name, floor);

        if (sim && theory) {
            const winRate = ((sim.results.playerWins / sim.numSimulations) * 100).toFixed(0);
            results.push({
                name: name.substring(0, 18),
                winRate,
                danger: theory.dangerRatio,
                pDPS: theory.playerDPS,
                mDPS: theory.monsterDPS,
                pTTK: theory.playerTTK
            });
        }
    }

    // Sort by win rate
    results.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

    for (const r of results) {
        let rating;
        const wr = parseFloat(r.winRate);
        if (wr >= 95) rating = 'Too Easy';
        else if (wr >= 80) rating = 'Easy';
        else if (wr >= 60) rating = 'Balanced';
        else if (wr >= 40) rating = 'Challenge';
        else if (wr >= 20) rating = 'Hard';
        else rating = 'Too Hard';

        console.log(`${r.name.padEnd(20)} ${r.winRate.padStart(5)}%  ${r.danger.padStart(6)}  ${r.pDPS.padStart(6)}  ${r.mDPS.padStart(6)}  ${r.pTTK.padStart(6)}  ${rating}`);
    }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function printUsage() {
    console.log(`
BALANCE ANALYZER - The Shifting Chasm

Usage:
  node balance-analyzer.js [command] [options]

Commands:
  sim <monster> [floor]     Run combat simulation (default: 1000 fights)
  theory <monster> [floor]  Show theoretical calculations (no RNG)
  report [floor]            Generate report for all monsters
  list                      List all monsters
  stats                     Show current player stats
  set <stat> <value>        Set player stat

Examples:
  node balance-analyzer.js sim "Magma Slime" 3
  node balance-analyzer.js theory "Obsidian Golem" 5
  node balance-analyzer.js report 5
  node balance-analyzer.js set str 15
  node balance-analyzer.js set weaponDamage 12

Player Stats (settable):
  hp, str, agi, int, pDef, mDef, weaponDamage, weaponSpeed
`);
}

function printMonsterList() {
    printHeader('MONSTER LIST');
    const monsters = Object.keys(MONSTER_DATA);
    monsters.forEach((name, i) => {
        const m = MONSTER_DATA[name];
        console.log(`${(i + 1).toString().padStart(2)}. ${name.padEnd(18)} HP:${m.hp.toString().padStart(3)} STR:${m.str.toString().padStart(2)} AGI:${m.agi.toString().padStart(2)} (${m.attackType})`);
    });
}

function printPlayerStats() {
    printHeader('CURRENT PLAYER STATS');
    console.log(`HP:           ${PLAYER_STATS.hp}`);
    console.log(`STR:          ${PLAYER_STATS.str}`);
    console.log(`AGI:          ${PLAYER_STATS.agi}`);
    console.log(`INT:          ${PLAYER_STATS.int}`);
    console.log(`pDef:         ${PLAYER_STATS.pDef}`);
    console.log(`mDef:         ${PLAYER_STATS.mDef}`);
    console.log(`Weapon Dmg:   ${PLAYER_STATS.weaponDamage}`);
    console.log(`Weapon Speed: ${PLAYER_STATS.weaponSpeed}`);
    console.log(`Weapon Type:  ${PLAYER_STATS.weaponType}`);
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
    printUsage();
    process.exit(0);
}

const command = args[0].toLowerCase();

switch (command) {
    case 'sim':
    case 'simulate': {
        const monster = args[1];
        const floor = parseInt(args[2]) || 1;
        if (!monster) {
            console.error('Error: Monster name required');
            process.exit(1);
        }
        const result = runSimulations(monster, floor);
        if (result) printSimulationResults(monster, floor, result);
        break;
    }

    case 'theory':
    case 'theoretical': {
        const monster = args[1];
        const floor = parseInt(args[2]) || 1;
        if (!monster) {
            console.error('Error: Monster name required');
            process.exit(1);
        }
        const result = calculateTheoretical(monster, floor);
        if (result) printTheoreticalResults(monster, floor, result);
        break;
    }

    case 'report':
    case 'all': {
        const floor = parseInt(args[1]) || 1;
        printAllMonstersReport(floor);
        break;
    }

    case 'list':
    case 'monsters': {
        printMonsterList();
        break;
    }

    case 'stats':
    case 'player': {
        printPlayerStats();
        break;
    }

    case 'set': {
        const stat = args[1];
        const value = parseFloat(args[2]);
        if (!stat || isNaN(value)) {
            console.error('Error: Usage: set <stat> <value>');
            process.exit(1);
        }
        if (PLAYER_STATS.hasOwnProperty(stat)) {
            PLAYER_STATS[stat] = value;
            console.log(`Set ${stat} = ${value}`);
            printPlayerStats();
        } else {
            console.error(`Error: Unknown stat "${stat}"`);
        }
        break;
    }

    case 'help':
    default:
        printUsage();
}
