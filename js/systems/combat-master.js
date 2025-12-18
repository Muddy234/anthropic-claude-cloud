// ============================================================================
// COMBAT MASTER - The Shifting Chasm
// ============================================================================
// Consolidated combat system containing:
// - Damage calculation (2-layer system)
// - Status effects (buffs, debuffs, DoTs, CCs)
// - Projectiles (arrows, bolts, magic)
// - Core combat loop (engagement, attack timing)
// - Mouse attack system (arcs, combos)
// - Hotkey combat (1-4 keys, Tab targeting)
// - Combat enhancements (dash, knockback, screen shake)
// - Skills integration (XP awards, action execution)
// - Boon integration (on-hit, on-kill effects)
// ============================================================================

// ############################################################################
// SECTION 1: CONFIGURATION
// ############################################################################

// ============================================================================
// CORE COMBAT CONFIG
// ============================================================================

const COMBAT_CONFIG = {
    baseAttackTime: 700,          // Base attack speed in ms (1.0 speed = 700ms)
    engageDelay: 0.4,             // Initial delay when engaging (seconds)
    minDamage: 1,                 // Minimum damage floor
    missChance: 0.08,             // Base 8% miss chance
    debugLogging: true,
    // Enemy attack animation settings
    enemyAttackDuration: 400,     // Total enemy attack animation duration (ms)
    enemyWindupPercent: 0.35,     // 35% of attack is windup (140ms at 400ms total)
    enemyWhiteFlashStart: 0.85,   // White flash starts at 85% of windup (last 15%)
    playerWindupPercent: 0.15,    // Player windup is 15% for comparison
    // Combat disengage settings
    combatDisengageTime: 30000    // Time (ms) without combat before auto-disengage (30 seconds)
};

// ============================================================================
// AMBUSH/STEALTH CONFIG
// ============================================================================

const AMBUSH_CONFIG = {
    enabled: true,
    damageMultiplier: 1.5,        // 1.5x damage on ambush attacks
    guaranteedCrit: true,         // Ambush attacks always crit
    screenShakeIntensity: 0.4,    // Screen shake on ambush
    screenShakeDuration: 200,     // Screen shake duration (ms)
    // AI states that count as "unaware" (valid ambush targets)
    unawareStates: ['idle', 'wandering', 'returning', 'searching'],
    // Angle threshold: player must be outside enemy's frontal cone (degrees from facing)
    sideAngleThreshold: 60        // Must be >60° from enemy's facing to count as ambush
};

// ============================================================================
// COMBAT ENHANCEMENTS CONFIG (Dash, Knockback, Screen Shake, Stagger)
// ============================================================================

const COMBAT_ENHANCEMENTS_CONFIG = {
    // Dash settings
    dash: {
        enabled: true,
        distance: 1.5,           // Tiles to dash
        cooldown: 1.0,           // Seconds
        iframeDuration: 0.2,     // Seconds of invincibility
        ghostCount: 4,           // Number of ghost images in trail
        ghostFadeDuration: 0.3,  // Seconds for ghost to fade
        playerTransparency: 0.5  // Alpha during dash
    },

    // Knockback settings (tiles)
    knockback: {
        enabled: true,
        wallDamagePercent: 0.10, // 10% of enemy max HP
        // Knockback distance by weapon specialty
        distances: {
            // Blunt weapons (heavy knockback)
            mace: 1.5,
            staff: 0.8,
            shield: 1.2,
            unarmed: 0.3,

            // Blade weapons (medium knockback)
            sword: 0.7,
            axe: 1.0,
            knife: 0.3,

            // Pierce weapons (low knockback)
            polearm: 0.5,
            bow: 0.2,
            crossbow: 0.3,
            throwing: 0.2
        },
        defaultDistance: 0.5
    },

    // Screen shake settings
    screenShake: {
        enabled: true,
        normalIntensity: 3,      // Pixels for normal attacks
        critIntensity: 8,        // Pixels for critical hits
        duration: 0.1            // Seconds
    },

    // Stagger settings
    stagger: {
        enabled: false,          // Disabled - no ministun on hit
        duration: 0.1,           // 100ms freeze
        flashCount: 2,           // Number of flashes
        flashDuration: 0.05      // Duration of each flash
    }
};

// ============================================================================
// WEAPON ARC CONFIG (Mouse Attack System)
// ============================================================================

const WEAPON_ARC_CONFIG = {
    // Blade weapons (ranges increased by 30%)
    sword: {
        arcAngle: 90,       // degrees
        arcRange: 1.56,     // tiles (was 1.2)
        isRanged: false,
        slashStyle: 'sweep' // Horizontal sweeping arc
    },
    knife: {
        arcAngle: 60,
        arcRange: 1.04,     // was 0.8
        isRanged: false,
        slashStyle: 'alternate'  // Alternates left/right on each attack
    },
    axe: {
        arcAngle: 80,       // Wider arc for chopping swing
        arcRange: 1.69,     // was 1.3
        isRanged: false,
        slashStyle: 'chop'  // Angled swing ending in sharp cut mark
    },

    // Blunt weapons (ranges increased by 30%)
    mace: {
        arcAngle: 60,       // Narrow arc for overhead/angled slam
        arcRange: 1.56,     // was 1.5, slightly reduced for slam feel
        isRanged: false,
        slashStyle: 'slam'  // Angled swing ending in impact burst
    },
    unarmed: {
        arcAngle: 60,
        arcRange: 0.78,     // was 0.6
        isRanged: false,
        slashStyle: 'jab'   // Quick punch/jab
    },
    shield: {
        arcAngle: 90,
        arcRange: 1.04,     // was 0.8
        isRanged: false,
        slashStyle: 'sweep'
    },

    // Magic weapons - all shoot projectiles
    staff: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        isMagic: true,
        projectileSpeed: 7
    },
    wand: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        isMagic: true,
        projectileSpeed: 9  // Wands are faster
    },
    tome: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        isMagic: true,
        projectileSpeed: 6  // Tomes are slower but more powerful
    },

    // Pierce melee (ranges increased by 30%)
    polearm: {
        arcAngle: 45,       // Narrow thrust
        arcRange: 2.6,      // Long reach (was 2.0)
        isRanged: false,
        slashStyle: 'thrust'  // Pull back then thrust forward
    },

    // Ranged weapons
    bow: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        projectileSpeed: 8  // tiles per second
    },
    crossbow: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        projectileSpeed: 10
    },
    throwing: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        projectileSpeed: 7
    }
};

// Default config for unknown weapon types
const DEFAULT_ARC_CONFIG = {
    arcAngle: 90,
    arcRange: 1.3,
    isRanged: false
};

// ============================================================================
// MAGIC ELEMENT CONFIG (Hotkey Combat)
// ============================================================================

const MAGIC_CONFIG = {
    fire: {
        baseDamage: 15,
        manaCost: 15,
        cooldown: 12,
        burnChance: 0.30,
        burnDuration: 5,
        burnDamage: 1
    },
    lightning: {
        baseDamage: 10,
        manaCost: 12,
        cooldown: 6
    },
    ice: {
        baseDamage: 10,
        manaCost: 12,
        cooldown: 10,
        freezeChance: 0.30,
        freezeDuration: 2
    },
    necromancy: {
        baseDamage: 8,
        manaCost: 10,
        cooldown: 5,
        lifestealPercent: 0.20
    },
    arcane: {
        baseDamage: 12,
        manaCost: 12,
        cooldown: 8
    },
    holy: {
        baseDamage: 12,
        manaCost: 12,
        cooldown: 8
    },
    dark: {
        baseDamage: 10,
        manaCost: 10,
        cooldown: 7
    },
    death: {
        baseDamage: 10,
        manaCost: 10,
        cooldown: 7
    }
};

// ############################################################################
// SECTION 2: DAMAGE CALCULATOR
// ############################################################################

const DamageCalculator = {
    // Configuration
    config: {
        baseVariance: 0,             // No random variance (was 0.10)
        minDamage: 1,                // Minimum damage floor
        critMultiplier: 2.5,         // Critical hit multiplier (was 1.5, buffed for balance)
        baseCritChance: 0.05,        // 5% base crit chance
        pierceCritBonus: 0.07,       // +7% crit chance for pierce weapons
        defenseScaling: 0.015,       // Defense reduces damage by 1.5% per point (was 0.01)
        maxDefenseReduction: 0.75,   // Cap defense at 75% reduction
        debugLogging: true           // Log damage calculations
    },

    // ========================================================================
    // MAIN DAMAGE CALCULATION
    // ========================================================================

    /**
     * Calculate damage with 2 layers
     * @param {Object} attacker - Attacking entity (player or enemy)
     * @param {Object} defender - Defending entity
     * @param {Object} room - Current room (unused, kept for API compatibility)
     * @returns {Object} Damage result with breakdown
     */
    calculateDamage(attacker, defender, room = null) {
        const result = {
            finalDamage: 0,
            baseDamage: 0,
            isCrit: false,
            isHit: true,
            breakdown: {
                weaponArmorMod: 1.0,
                elementMod: 1.0,
                defenseMod: 1.0,
                critMod: 1.0,
                variance: 1.0
            },
            messages: []
        };

        // Step 1: Check hit
        if (!this.rollHit(attacker, defender)) {
            result.isHit = false;
            result.messages.push('MISS');
            return result;
        }

        // Step 2: Get base damage
        result.baseDamage = this.getBaseDamage(attacker);

        // Step 3: Layer 1 - Weapon vs Armor
        const weaponType = this.getWeaponDamageType(attacker);
        const armorType = this.getArmorType(defender);
        result.breakdown.weaponArmorMod = this.getWeaponArmorModifier(weaponType, armorType);

        // Step 4: Layer 2 - Element vs Element
        const attackElement = this.getAttackElement(attacker);
        const defendElement = this.getDefendElement(defender);
        result.breakdown.elementMod = this.getElementModifier(attackElement, defendElement);

        // Step 5: Defense reduction
        const defense = this.getDefense(defender, weaponType);
        result.breakdown.defenseMod = this.calculateDefenseReduction(defense);

        // Step 6: Critical hit
        if (this.rollCrit(attacker)) {
            result.isCrit = true;
            result.breakdown.critMod = this.config.critMultiplier;
            result.messages.push('CRITICAL');
        }

        // Step 7: Variance
        result.breakdown.variance = 1 - this.config.baseVariance + (Math.random() * this.config.baseVariance * 2);

        // Step 8: Social bonuses (for enemies in packs/swarms)
        result.breakdown.socialMod = 1.0;
        if (typeof MonsterSocialSystem !== 'undefined' && (attacker.packId || attacker.swarmId)) {
            const bonuses = MonsterSocialSystem.getAllBonuses(attacker);
            result.breakdown.socialMod = 1.0 + (bonuses.damage || 0);
            if (bonuses.damage > 0) {
                result.messages.push(`Pack bonus +${Math.round(bonuses.damage * 100)}%`);
            }
        }

        // Step 9: Soul & Body skill multiplier (for player attacks only)
        result.breakdown.skillMod = 1.0;
        if (attacker === game.player && typeof getSkillDamageMultiplier === 'function') {
            const weapon = attacker.equipped?.MAIN;
            const wpnType = weapon?.weaponType || weapon?.damageType || 'unarmed';
            const attackType = this.getAttackElement(attacker);

            // Determine proficiency type based on weapon/attack type
            let proficiencyType = 'melee';
            if (['bow', 'crossbow', 'throwing'].includes(wpnType)) {
                proficiencyType = 'ranged';
            } else if (['staff', 'wand', 'tome'].includes(wpnType) || attackType !== 'physical') {
                proficiencyType = 'magic';
            }

            result.breakdown.skillMod = getSkillDamageMultiplier(attacker, proficiencyType);
            result.breakdown.proficiencyType = proficiencyType;

            if (result.breakdown.skillMod > 1.01) {
                result.messages.push(`Skill x${result.breakdown.skillMod.toFixed(2)}`);
            }
        }

        // Step 10: Soul & Body defense reduction (for player taking damage only)
        result.breakdown.skillDefenseMod = 1.0;
        if (defender === game.player && typeof getDefenseDamageReduction === 'function') {
            const defenseReduction = getDefenseDamageReduction(defender);
            result.breakdown.skillDefenseMod = 1.0 - defenseReduction;
            if (defenseReduction > 0.01) {
                result.messages.push(`Defense skill -${Math.round(defenseReduction * 100)}%`);
            }
        }

        // Step 11: Calculate final damage
        let damage = result.baseDamage;

        // Apply weapon vs armor
        damage *= result.breakdown.weaponArmorMod;

        // Apply element vs element
        damage *= result.breakdown.elementMod;

        // Apply defense (armor)
        damage *= result.breakdown.defenseMod;

        // Apply social bonus
        damage *= result.breakdown.socialMod;

        // Apply skill multiplier (Soul & Body)
        damage *= result.breakdown.skillMod;

        // Apply skill defense reduction (Soul & Body - defender is player)
        damage *= result.breakdown.skillDefenseMod;

        // Apply crit
        damage *= result.breakdown.critMod;

        // Apply variance
        damage *= result.breakdown.variance;

        // Floor and minimum
        result.finalDamage = Math.max(this.config.minDamage, Math.floor(damage));

        // Generate messages
        if (result.breakdown.weaponArmorMod > 1.0) result.messages.push('Armor weakness!');
        if (result.breakdown.weaponArmorMod < 1.0) result.messages.push('Armor resists...');
        if (result.breakdown.elementMod > 1.0) result.messages.push('Super effective!');
        if (result.breakdown.elementMod < 1.0) result.messages.push('Not very effective...');

        // Debug logging
        if (this.config.debugLogging) {
            this.logDamageCalculation(attacker, defender, room, result);
        }

        return result;
    },

    // ========================================================================
    // BASE DAMAGE
    // ========================================================================

    getBaseDamage(attacker) {
        // Check for weapon
        const weapon = attacker.equipped?.MAIN;

        if (weapon && weapon.stats?.damage) {
            // Weapon damage + stat scaling
            const baseDmg = weapon.stats.damage;
            const statBonus = this.getStatBonus(attacker, weapon);
            return baseDmg + statBonus;
        }

        // Monster/unarmed damage - scale based on attackType and appropriate stat
        const attackType = attacker.attackType || 'physical';
        const attackRange = attacker.attackRange || 1;

        let stat, scalingDivisor;

        if (attackType === 'magic') {
            stat = attacker.int || attacker.stats?.INT || attacker.stats?.int || 10;
            scalingDivisor = 3;
        } else if (attackRange > 1) {
            stat = attacker.agi || attacker.stats?.AGI || attacker.stats?.agi || 10;
            scalingDivisor = 5;
        } else {
            stat = attacker.str || attacker.stats?.STR || attacker.stats?.str || 10;
            scalingDivisor = 5;
        }

        const baseDamage = Math.floor(stat * 0.5);
        const scalingBonus = Math.floor(stat / scalingDivisor);

        return baseDamage + scalingBonus;
    },

    getStatBonus(attacker, weapon) {
        const weaponType = weapon.weaponType || weapon.damageType || 'blade';
        let scalingStat = 'STR';

        if (['bow', 'crossbow', 'throwing'].includes(weaponType)) {
            scalingStat = 'AGI';
        } else if (['staff', 'wand', 'tome'].includes(weaponType)) {
            scalingStat = 'INT';
        }

        const statValue = attacker.stats?.[scalingStat] || attacker.stats?.[scalingStat.toLowerCase()] || 10;
        return Math.floor(statValue * 0.5);
    },

    // ========================================================================
    // LAYER 1: WEAPON VS ARMOR
    // ========================================================================

    getWeaponDamageType(attacker) {
        const weapon = attacker.equipped?.MAIN;
        if (weapon?.damageType) return weapon.damageType;
        if (attacker.damageType) return attacker.damageType;
        return 'blunt';
    },

    getArmorType(defender) {
        const chest = defender.equipped?.CHEST;
        if (chest?.armorType) return chest.armorType;
        if (defender.armorType) return defender.armorType;
        return 'unarmored';
    },

    getWeaponArmorModifier(weaponType, armorType) {
        if (typeof WEAPON_ARMOR_MATRIX !== 'undefined') {
            const row = WEAPON_ARMOR_MATRIX[weaponType];
            if (row && row[armorType] !== undefined) {
                return 1.0 + row[armorType];
            }
        }

        const fallbackMatrix = {
            blade:  { unarmored: 0.30, hide: 0, scaled: 0, armored: -0.30, stone: -0.30, bone: 0, ethereal: 0 },
            blunt:  { unarmored: 0, hide: 0, scaled: 0, armored: 0.30, stone: 0.30, bone: 0.30, ethereal: -0.30 },
            pierce: { unarmored: 0, hide: 0.30, scaled: 0.30, armored: -0.30, stone: -0.30, bone: 0, ethereal: 0.30 }
        };

        const row = fallbackMatrix[weaponType];
        if (row && row[armorType] !== undefined) {
            return 1.0 + row[armorType];
        }

        return 1.0;
    },

    // ========================================================================
    // LAYER 2: ELEMENT VS ELEMENT
    // ========================================================================

    getAttackElement(attacker) {
        const weapon = attacker.equipped?.MAIN;
        if (weapon?.element) return weapon.element;
        if (attacker.element) return attacker.element;
        return 'physical';
    },

    getDefendElement(defender) {
        if (defender.element) return defender.element;
        return 'physical';
    },

    getElementModifier(attackElement, defendElement) {
        if (typeof ELEMENT_MATRIX !== 'undefined') {
            const row = ELEMENT_MATRIX[attackElement];
            if (row && row[defendElement] !== undefined) {
                return 1.0 + row[defendElement];
            }
        }

        if (typeof getElementModifier === 'function') {
            return getElementModifier(attackElement, defendElement);
        }

        return 1.0;
    },

    // ========================================================================
    // DEFENSE
    // ========================================================================

    getDefense(defender, damageType) {
        let defense = 0;

        if (damageType === 'blade' || damageType === 'blunt' || damageType === 'pierce') {
            defense = defender.pDef || defender.stats?.pDef || 0;
        } else {
            defense = defender.mDef || defender.stats?.mDef || 0;
        }

        const slots = ['HEAD', 'CHEST', 'LEGS', 'FEET'];
        for (const slot of slots) {
            const armor = defender.equipped?.[slot];
            if (armor?.stats?.defense) {
                defense += armor.stats.defense;
            }
        }

        // Apply Rot armor reduction (from boon status effects)
        if (typeof BoonCombatIntegration !== 'undefined') {
            const armorMod = BoonCombatIntegration.getArmorModifier(defender);
            defense = Math.floor(defense * armorMod);
        }

        // Apply armor stat modifier from status effects (generic)
        if (typeof StatusEffectSystem !== 'undefined') {
            const armorMod = StatusEffectSystem.getStatModifier(defender, 'armor');
            if (armorMod !== 0) {
                defense = Math.floor(defense * (1 + armorMod));
            }
        }

        return Math.max(0, defense);
    },

    calculateDefenseReduction(defense) {
        const reduction = defense * this.config.defenseScaling;
        const capped = Math.min(reduction, this.config.maxDefenseReduction);
        return 1.0 - capped;
    },

    // ========================================================================
    // HIT & CRIT
    // ========================================================================

    rollHit(attacker, defender) {
        let hitChance = 0.90;

        const attackerAgi = attacker.stats?.AGI || attacker.stats?.agi || 10;
        hitChance += attackerAgi * 0.002;

        const defenderAgi = defender.stats?.AGI || defender.stats?.agi || 10;
        hitChance -= defenderAgi * 0.002;

        if (typeof MonsterSocialSystem !== 'undefined' && defender.swarmId) {
            const bonuses = MonsterSocialSystem.getAllBonuses(defender);
            hitChance -= bonuses.evasion || 0;
        }

        hitChance = Math.max(0.50, Math.min(0.98, hitChance));

        return Math.random() < hitChance;
    },

    rollCrit(attacker) {
        let critChance = this.config.baseCritChance;

        const agi = attacker.stats?.AGI || attacker.stats?.agi || 10;
        critChance += agi * 0.001;

        const weapon = attacker.equipped?.MAIN;
        if (weapon?.special?.critBonus) {
            critChance += weapon.special.critBonus;
        }

        if (weapon?.damageType === 'pierce') {
            critChance += this.config.pierceCritBonus;
        }

        critChance = Math.min(0.50, critChance);

        return Math.random() < critChance;
    },

    // ========================================================================
    // DEBUG LOGGING
    // ========================================================================

    logDamageCalculation(attacker, defender, room, result) {
        const attackerName = attacker.name || 'Player';
        const defenderName = defender.name || 'Target';

        console.log(`[DamageCalc] ${attackerName} → ${defenderName}`);
        console.log(`  Base: ${result.baseDamage}`);
        console.log(`  Weapon/Armor: x${result.breakdown.weaponArmorMod.toFixed(2)}`);
        console.log(`  Element: x${result.breakdown.elementMod.toFixed(2)}`);
        console.log(`  Defense: x${result.breakdown.defenseMod.toFixed(2)}`);
        if (result.breakdown.socialMod !== 1.0) {
            console.log(`  Social: x${result.breakdown.socialMod.toFixed(2)}`);
        }
        if (result.breakdown.skillMod !== 1.0) {
            console.log(`  Skill (${result.breakdown.proficiencyType || 'N/A'}): x${result.breakdown.skillMod.toFixed(2)}`);
        }
        if (result.breakdown.skillDefenseMod !== 1.0) {
            console.log(`  Skill Defense: x${result.breakdown.skillDefenseMod.toFixed(2)}`);
        }
        console.log(`  Crit: x${result.breakdown.critMod.toFixed(2)}`);
        console.log(`  Variance: x${result.breakdown.variance.toFixed(2)}`);
        console.log(`  FINAL: ${result.finalDamage} ${result.messages.join(' ')}`);
    }
};

// Damage Calculator helper functions
function calculateDamageSimple(attacker, defender) {
    const result = DamageCalculator.calculateDamage(attacker, defender, null);
    return result.finalDamage;
}

function calculateDamageWithRoom(attacker, defender, room) {
    return DamageCalculator.calculateDamage(attacker, defender, room);
}

function getDamagePreview(attacker, defender, room = null) {
    const oldVariance = DamageCalculator.config.baseVariance;
    DamageCalculator.config.baseVariance = 0;

    const result = DamageCalculator.calculateDamage(attacker, defender, room);
    result.breakdown.critMod = 1.0;

    DamageCalculator.config.baseVariance = oldVariance;

    let preview = result.baseDamage;
    preview *= result.breakdown.weaponArmorMod;
    preview *= result.breakdown.elementMod;
    preview *= result.breakdown.defenseMod;

    return {
        min: Math.floor(preview * 0.9),
        max: Math.floor(preview * 1.1),
        crit: Math.floor(preview * DamageCalculator.config.critMultiplier),
        breakdown: result.breakdown
    };
}

// ############################################################################
// SECTION 3: STATUS EFFECTS
// ############################################################################

const StatusEffectSystem = {
    activeEffects: new Map(),
    definitions: {},
    config: {
        maxStacksDefault: 5,
        tickRate: 100,
        debugLogging: true
    },
    _lastTick: 0,
    _initialized: false,

    init() {
        this.activeEffects.clear();
        this.registerDefaultEffects();
        this._initialized = true;
        console.log('[StatusEffects] System initialized');
    },

    registerDefaultEffects() {
        // === DAMAGE OVER TIME ===
        this.registerEffect({
            id: 'burning', name: 'Burning', type: 'dot', element: 'fire',
            damagePerTick: 3, tickInterval: 1000, duration: 5000,
            maxStacks: 3, stackBehavior: 'intensity', color: '#ff6b35', icon: '🔥',
            onApply: (entity) => addMessage(`${entity.name || 'You'} caught fire!`),
            onTick: (entity, effect) => {
                const damage = (effect.definition?.damagePerTick || 3) * (effect.stacks || 1);
                entity.hp -= damage;
            },
            onExpire: (entity) => addMessage(`${entity.name || 'You'} stopped burning.`)
        });

        this.registerEffect({
            id: 'poisoned', name: 'Poisoned', type: 'dot', element: 'nature',
            damagePerTick: 2, tickInterval: 1500, duration: 8000,
            maxStacks: 5, stackBehavior: 'intensity', color: '#00b894', icon: '☠️',
            statMods: { healingReceived: -0.50 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} were poisoned!`),
            onTick: (entity, effect) => {
                entity.hp -= (effect.definition?.damagePerTick || 2) * (effect.stacks || 1);
            },
            onExpire: (entity) => addMessage(`${entity.name || 'You'} recovered from poison.`)
        });

        this.registerEffect({
            id: 'bleeding', name: 'Bleeding', type: 'dot', element: 'physical',
            damagePercent: 0.05, tickInterval: 1000, duration: 5000,
            maxStacks: 3, stackBehavior: 'refresh', color: '#e74c3c', icon: '🩸',
            onApply: (entity) => addMessage(`${entity.name || 'You'} started bleeding!`),
            onTick: (entity, effect) => {
                const maxHp = entity.maxHp || entity.hp || 100;
                const damage = Math.max(1, Math.floor(maxHp * (effect.definition?.damagePercent || 0.05)));
                entity.hp -= damage;
            }
        });

        this.registerEffect({
            id: 'ignite', name: 'Ignited', type: 'dot', element: 'fire',
            damagePerTick: 3, tickInterval: 1000, duration: 5000,
            maxStacks: 3, stackBehavior: 'intensity', color: '#ff6b35', icon: '🔥',
            onApply: (entity) => addMessage(`${entity.name || 'You'} caught fire!`),
            onTick: (entity, effect) => {
                entity.hp -= (effect.definition?.damagePerTick || 3) * (effect.stacks || 1);
            },
            onExpire: (entity) => addMessage(`${entity.name || 'You'} stopped burning.`)
        });

        this.registerEffect({
            id: 'rot', name: 'Rotting', type: 'dot', element: 'poison',
            damagePerTick: 1, tickInterval: 1000, duration: 6000,
            maxStacks: 10, stackBehavior: 'intensity', color: '#27ae60', icon: '🦠',
            statMods: { armor: -0.10 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} began to rot!`),
            onTick: (entity, effect) => {
                entity.hp -= (effect.definition?.damagePerTick || 1) * (effect.stacks || 1);
            },
            onExpire: (entity) => addMessage(`${entity.name || 'You'} stopped rotting.`)
        });

        this.registerEffect({
            id: 'fear', name: 'Feared', type: 'cc', ccType: 'fear',
            duration: 3000, maxStacks: 1, stackBehavior: 'refresh',
            color: '#9b59b6', icon: '😱', preventsAction: true, causesFlee: true,
            onApply: (entity, effect) => {
                entity.isFeared = true;
                entity.fearSource = effect.source;
                addMessage(`${entity.name || 'You'} fled in terror!`);
            },
            onTick: (entity, effect) => {
                if (entity.isFeared && effect.source) {
                    entity.fleeFromX = effect.source.gridX || effect.source.x;
                    entity.fleeFromY = effect.source.gridY || effect.source.y;
                }
            },
            onExpire: (entity) => {
                entity.isFeared = false;
                entity.fearSource = null;
                entity.fleeFromX = null;
                entity.fleeFromY = null;
                addMessage(`${entity.name || 'You'} regained composure.`);
            }
        });

        this.registerEffect({
            id: 'slow', name: 'Slowed', type: 'debuff',
            duration: 3000, maxStacks: 3, stackBehavior: 'intensity',
            color: '#7f8c8d', icon: '🐌', statMods: { moveSpeed: -0.15 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} were slowed!`),
            onExpire: (entity) => addMessage(`${entity.name || 'You'} can move freely again.`)
        });

        // === CROWD CONTROL ===
        this.registerEffect({
            id: 'stunned', name: 'Stunned', type: 'cc', ccType: 'stun',
            duration: 2000, maxStacks: 1, stackBehavior: 'refresh',
            color: '#f1c40f', icon: '⭐', preventsAction: true, preventsMovement: true,
            onApply: (entity) => { entity.isStunned = true; addMessage(`${entity.name || 'You'} were stunned!`); },
            onExpire: (entity) => { entity.isStunned = false; addMessage(`${entity.name || 'You'} recovered from stun.`); }
        });

        this.registerEffect({
            id: 'frozen', name: 'Frozen', type: 'cc', ccType: 'stun', element: 'ice',
            duration: 3000, maxStacks: 1, color: '#74b9ff', icon: '❄️',
            preventsAction: true, preventsMovement: true,
            onApply: (entity) => { entity.isFrozen = true; addMessage(`${entity.name || 'You'} were frozen solid!`); },
            onExpire: (entity) => { entity.isFrozen = false; addMessage(`${entity.name || 'You'} thawed out.`); }
        });

        this.registerEffect({
            id: 'rooted', name: 'Rooted', type: 'cc', ccType: 'root', element: 'nature',
            duration: 4000, maxStacks: 1, color: '#27ae60', icon: '🌿', preventsMovement: true,
            onApply: (entity) => { entity.isRooted = true; addMessage(`${entity.name || 'You'} were rooted in place!`); },
            onExpire: (entity) => { entity.isRooted = false; }
        });

        // === DEBUFFS ===
        this.registerEffect({
            id: 'chilled', name: 'Chilled', type: 'debuff', element: 'ice',
            duration: 4000, maxStacks: 3, stackBehavior: 'intensity',
            color: '#74b9ff', icon: '🥶', statMods: { moveSpeed: -0.10, attackSpeed: -0.10 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} feel the cold...`)
        });

        this.registerEffect({
            id: 'weakened', name: 'Weakened', type: 'debuff',
            duration: 6000, maxStacks: 1, color: '#95a5a6', icon: '💔',
            statMods: { damage: -0.25 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} feel weakened...`)
        });

        this.registerEffect({
            id: 'vulnerable', name: 'Vulnerable', type: 'debuff',
            duration: 5000, maxStacks: 1, color: '#e74c3c', icon: '🎯',
            statMods: { damageTaken: 0.25 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} became vulnerable!`)
        });

        // === BUFFS ===
        this.registerEffect({
            id: 'regenerating', name: 'Regenerating', type: 'buff',
            healPerTick: 3, tickInterval: 1000, duration: 10000,
            maxStacks: 1, color: '#2ecc71', icon: '💚',
            onTick: (entity, effect) => {
                const heal = Math.min(effect.healPerTick, entity.maxHp - entity.hp);
                entity.hp += heal;
            }
        });

        this.registerEffect({
            id: 'strengthened', name: 'Strengthened', type: 'buff',
            duration: 8000, maxStacks: 1, color: '#e74c3c', icon: '💪',
            statMods: { damage: 0.25 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} feel stronger!`)
        });

        this.registerEffect({
            id: 'hastened', name: 'Hastened', type: 'buff',
            duration: 6000, maxStacks: 1, color: '#f39c12', icon: '⚡',
            statMods: { moveSpeed: 0.30, attackSpeed: 0.20 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} feel faster!`)
        });

        this.registerEffect({
            id: 'shielded', name: 'Shielded', type: 'buff',
            duration: 8000, maxStacks: 1, color: '#3498db', icon: '🛡️',
            statMods: { damageTaken: -0.30 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} gained a shield!`)
        });

        console.log(`[StatusEffects] Registered ${Object.keys(this.definitions).length} effects`);
    },

    registerEffect(definition) {
        this.definitions[definition.id] = {
            ...definition,
            tickInterval: definition.tickInterval || 1000,
            maxStacks: definition.maxStacks || 1,
            stackBehavior: definition.stackBehavior || 'refresh'
        };
    },

    applyEffect(entity, effectId, source = null, options = {}) {
        if (!entity || !effectId) return false;

        const definition = this.definitions[effectId];
        if (!definition) {
            console.warn(`[StatusEffects] Unknown effect: ${effectId}`);
            return false;
        }

        const entityId = this.getEntityId(entity);
        if (!this.activeEffects.has(entityId)) {
            this.activeEffects.set(entityId, []);
        }

        const effects = this.activeEffects.get(entityId);
        const existing = effects.find(e => e.id === effectId);

        if (existing) {
            switch (definition.stackBehavior) {
                case 'refresh':
                    existing.remainingDuration = options.duration || definition.duration;
                    break;
                case 'intensity':
                    if (existing.stacks < definition.maxStacks) existing.stacks++;
                    existing.remainingDuration = options.duration || definition.duration;
                    break;
                case 'duration':
                    existing.remainingDuration += options.duration || definition.duration;
                    break;
                case 'none':
                    return false;
            }
        } else {
            const effect = {
                id: effectId,
                definition: definition,
                source: source,
                stacks: 1,
                remainingDuration: options.duration || definition.duration,
                tickTimer: 0,
                data: {}
            };
            effects.push(effect);
            if (definition.onApply) definition.onApply(entity, effect);
        }
        return true;
    },

    removeEffect(entity, effectId) {
        if (!entity || !effectId) return false;
        const entityId = this.getEntityId(entity);
        const effects = this.activeEffects.get(entityId);
        if (!effects) return false;

        const index = effects.findIndex(e => e.id === effectId);
        if (index === -1) return false;

        const effect = effects[index];
        if (effect.definition.onExpire) effect.definition.onExpire(entity, effect);
        effects.splice(index, 1);
        return true;
    },

    removeAllEffects(entity) {
        const entityId = this.getEntityId(entity);
        const effects = this.activeEffects.get(entityId);
        if (!effects) return;
        for (const effect of effects) {
            if (effect.definition.onExpire) effect.definition.onExpire(entity, effect);
        }
        this.activeEffects.delete(entityId);
    },

    update(deltaTime) {
        if (!this._initialized) return;

        for (const [entityId, effects] of this.activeEffects) {
            const entity = this.getEntityById(entityId);
            if (!entity) {
                this.activeEffects.delete(entityId);
                continue;
            }

            for (let i = effects.length - 1; i >= 0; i--) {
                const effect = effects[i];
                const def = effect.definition;

                effect.remainingDuration -= deltaTime;

                if (def.onTick) {
                    effect.tickTimer += deltaTime;
                    if (effect.tickTimer >= def.tickInterval) {
                        effect.tickTimer -= def.tickInterval;
                        def.onTick(entity, effect);
                        if (entity.hp <= 0 && typeof handleDeath === 'function') {
                            handleDeath(entity, effect.source);
                        }
                    }
                }

                if (effect.remainingDuration <= 0) {
                    if (def.onExpire) def.onExpire(entity, effect);
                    effects.splice(i, 1);
                }
            }
        }
    },

    hasEffect(entity, effectId) {
        const entityId = this.getEntityId(entity);
        const effects = this.activeEffects.get(entityId);
        return effects ? effects.some(e => e.id === effectId) : false;
    },

    getEffect(entity, effectId) {
        const entityId = this.getEntityId(entity);
        const effects = this.activeEffects.get(entityId);
        return effects ? effects.find(e => e.id === effectId) : null;
    },

    getEffects(entity) {
        const entityId = this.getEntityId(entity);
        return this.activeEffects.get(entityId) || [];
    },

    isCC(entity) {
        return this.getEffects(entity).some(e => e.definition.preventsAction || e.definition.preventsMovement);
    },

    canAct(entity) {
        return !this.getEffects(entity).some(e => e.definition.preventsAction);
    },

    canMove(entity) {
        return !this.getEffects(entity).some(e => e.definition.preventsMovement);
    },

    getStatModifier(entity, stat) {
        let modifier = 0;
        for (const effect of this.getEffects(entity)) {
            const mods = effect.definition.statMods;
            if (mods && mods[stat] !== undefined) {
                const stackMult = effect.definition.stackBehavior === 'intensity' ? effect.stacks : 1;
                modifier += mods[stat] * stackMult;
            }
        }
        return modifier;
    },

    getEntityId(entity) {
        return entity.id || entity.name || `entity_${entity.gridX}_${entity.gridY}`;
    },

    getEntityById(entityId) {
        if (game.player && this.getEntityId(game.player) === entityId) return game.player;
        if (game.enemies) {
            for (const enemy of game.enemies) {
                if (this.getEntityId(enemy) === entityId) return enemy;
            }
        }
        return null;
    },

    cleanup() {
        this.activeEffects.clear();
    }
};

// Status effect helper functions
function applyStatusEffect(entity, effectId, source = null) {
    return StatusEffectSystem.applyEffect(entity, effectId, source);
}

function removeStatusEffect(entity, effectId) {
    return StatusEffectSystem.removeEffect(entity, effectId);
}

function hasStatusEffect(entity, effectId) {
    return StatusEffectSystem.hasEffect(entity, effectId);
}

function isEntityCC(entity) {
    return StatusEffectSystem.isCC(entity);
}

function canEntityAct(entity) {
    if (typeof isEnemyStaggered === 'function' && isEnemyStaggered(entity)) return false;
    return StatusEffectSystem.canAct(entity);
}

function canEntityMove(entity) {
    if (typeof isEnemyStaggered === 'function' && isEnemyStaggered(entity)) return false;
    return StatusEffectSystem.canMove(entity);
}

function getStatusEffects(entity) {
    return StatusEffectSystem.getEffects(entity);
}

function clearStatusEffects(entity) {
    StatusEffectSystem.removeAllEffects(entity);
}

// Stub for addMessage if not defined
if (typeof addMessage !== 'function') {
    window.addMessage = (msg) => console.log(`[Message] ${msg}`);
}

// ############################################################################
// SECTION 4: PROJECTILES
// ############################################################################

const projectiles = [];

function createProjectile(config) {
    let dx, dy, distance;

    if (config.dirX !== undefined && config.dirY !== undefined) {
        dx = config.dirX;
        dy = config.dirY;
        distance = config.maxDistance || 10;
    } else {
        dx = config.targetX - config.x;
        dy = config.targetY - config.y;
        distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            applyProjectileDamage(config);
            return null;
        }
        dx = dx / distance;
        dy = dy / distance;
    }

    const projectile = {
        x: config.x,
        y: config.y,
        displayX: config.x,
        displayY: config.y,
        targetX: config.targetX,
        targetY: config.targetY,
        target: config.target,
        dirX: dx,
        dirY: dy,
        velocityX: dx * config.speed,
        velocityY: dy * config.speed,
        speed: config.speed,
        distanceToTravel: config.maxDistance || distance,
        distanceTraveled: 0,
        fadeStart: config.fadeAfter || config.maxDistance || distance,
        alpha: 1.0,
        damage: config.damage,
        element: config.element || 'physical',
        attacker: config.attacker || config.owner,
        isMagic: config.isMagic || false,
        isSkill: config.isSkill || false,
        isSpecial: config.isSpecial || false,
        elementConfig: config.elementConfig || null,
        isDirectionBased: config.dirX !== undefined,
        active: true,
        hasHit: false
    };

    projectiles.push(projectile);
    return projectile;
}

function updateProjectiles(deltaTime) {
    const dt = deltaTime / 1000;

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];

        if (!proj.active) {
            projectiles.splice(i, 1);
            continue;
        }

        proj.displayX += proj.velocityX * dt;
        proj.displayY += proj.velocityY * dt;
        proj.distanceTraveled += proj.speed * dt;

        if (proj.isDirectionBased && proj.distanceTraveled > proj.fadeStart) {
            const fadeProgress = (proj.distanceTraveled - proj.fadeStart) / (proj.distanceToTravel - proj.fadeStart);
            proj.alpha = Math.max(0, 1 - fadeProgress);
        }

        if (proj.isDirectionBased && !proj.hasHit) {
            const hitEnemy = checkProjectileEnemyCollision(proj);
            if (hitEnemy) {
                applyProjectileDamage({
                    damage: proj.damage,
                    element: proj.element,
                    attacker: proj.attacker,
                    target: hitEnemy,
                    isMagic: proj.isMagic,
                    isSkill: proj.isSkill,
                    isSpecial: proj.isSpecial,
                    elementConfig: proj.elementConfig
                });
                if (typeof onCombatHit === 'function') {
                    onCombatHit(proj.attacker, hitEnemy, { finalDamage: proj.damage, isCrit: false });
                }
                proj.hasHit = true;
                proj.active = false;
                projectiles.splice(i, 1);
                continue;
            }
        }

        if (proj.distanceTraveled >= proj.distanceToTravel) {
            if (!proj.isDirectionBased && proj.target) {
                applyProjectileDamage({
                    damage: proj.damage,
                    element: proj.element,
                    attacker: proj.attacker,
                    target: proj.target,
                    isMagic: proj.isMagic,
                    isSkill: proj.isSkill,
                    elementConfig: proj.elementConfig
                });
            }
            proj.active = false;
            projectiles.splice(i, 1);
            continue;
        }

        const gridX = Math.floor(proj.displayX);
        const gridY = Math.floor(proj.displayY);

        if (checkProjectileCollision(gridX, gridY)) {
            proj.active = false;
            projectiles.splice(i, 1);
            continue;
        }
    }
}

function checkProjectileEnemyCollision(proj) {
    if (!game.enemies) return null;
    const hitRadius = 0.4;

    for (const enemy of game.enemies) {
        if (!enemy || enemy.hp <= 0 || isNaN(enemy.hp)) continue;
        const dx = proj.displayX - enemy.gridX;
        const dy = proj.displayY - enemy.gridY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < hitRadius) return enemy;
    }
    return null;
}

function checkProjectileCollision(x, y) {
    const gridWidth = typeof GRID_WIDTH !== 'undefined' ? GRID_WIDTH : 100;
    const gridHeight = typeof GRID_HEIGHT !== 'undefined' ? GRID_HEIGHT : 100;

    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) return true;
    if (!game.map) return true;

    const tile = game.map[Math.floor(y)]?.[Math.floor(x)];
    if (!tile) return true;

    if (tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') return true;
    if (tile.decoration?.name === 'pillar') return true;
    if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(Math.floor(x), Math.floor(y))) return true;
    if (tile.type === 'door' && !tile.open) return true;

    return false;
}

function applyProjectileDamage(config) {
    const target = config.target;
    if (!target || target.hp <= 0 || isNaN(target.hp)) return;

    let damage = config.damage;
    if (isNaN(damage) || damage === undefined) damage = 5;

    if (typeof applyDamage === 'function') {
        applyDamage(target, damage, config.attacker);
    } else {
        target.hp -= damage;
    }

    if (isNaN(target.hp)) target.hp = 0;

    if (config.attacker === game.player) {
        if (config.isMagic && typeof awardMagicXp === 'function') {
            awardMagicXp(game.player, damage);
        } else if (typeof awardRangedXp === 'function') {
            awardRangedXp(game.player, damage);
        }
    }

    if (config.attacker === game.player && target !== game.player) {
        target.state = 'chasing';
        if (!target.combat) {
            target.combat = {
                isInCombat: false,
                currentTarget: null,
                attackCooldown: 0,
                attackSpeed: target.attackSpeed || 1.0,
                autoRetaliate: true,
                attackRange: target.attackRange || 1
            };
        }
        if (typeof engageCombat === 'function') {
            engageCombat(target, config.attacker);
        }
    }

    const color = config.isMagic ? '#00ffff' : '#ff4444';
    if (typeof showDamageNumber === 'function') {
        showDamageNumber(target, damage, color);
    }

    const targetX = target.displayX ?? target.gridX ?? target.x;
    const targetY = target.displayY ?? target.gridY ?? target.y;
    if (config.isMagic && typeof spawnMagicEffect === 'function') {
        spawnMagicEffect(targetX, targetY, config.element || 'default');
    } else if (!config.isMagic && typeof spawnImpactEffect === 'function') {
        spawnImpactEffect(targetX, targetY, 'default');
    }

    if (typeof addMessage === 'function' && config.attacker === game.player) {
        const attackType = config.isSkill ? 'skill shot' : config.isMagic ? 'spell' : 'shot';
        addMessage(`Your ${attackType} hits ${target.name} for ${damage} damage!`);
    }

    if (config.isMagic && config.elementConfig) {
        applyMagicProjectileEffects(config);
    }

    if (target.hp <= 0) {
        if (typeof handleDeath === 'function') {
            handleDeath(target, config.attacker);
        } else {
            const index = game.enemies.indexOf(target);
            if (index > -1) game.enemies.splice(index, 1);
        }
    }
}

function applyMagicProjectileEffects(config) {
    const { element, elementConfig, attacker, target, damage } = config;

    if (element === 'fire' && elementConfig.burnChance && Math.random() < elementConfig.burnChance) {
        if (typeof applyStatusEffect === 'function') {
            applyStatusEffect(target, { type: 'burn', duration: elementConfig.burnDuration, damage: elementConfig.burnDamage, interval: 1000 });
        }
        if (typeof addMessage === 'function') addMessage(`${target.name} is burning!`);
    }

    if (element === 'ice' && elementConfig.freezeChance && Math.random() < elementConfig.freezeChance) {
        if (typeof applyStatusEffect === 'function') {
            applyStatusEffect(target, { type: 'freeze', duration: elementConfig.freezeDuration });
        }
        target.isFrozen = true;
        setTimeout(() => { target.isFrozen = false; }, elementConfig.freezeDuration * 1000);
        if (typeof addMessage === 'function') addMessage(`${target.name} is frozen!`);
    }

    if (element === 'necromancy' && elementConfig.lifestealPercent) {
        const heal = Math.floor(damage * elementConfig.lifestealPercent);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        if (typeof addMessage === 'function') addMessage(`Drained ${heal} HP!`);
    }
}

function checkLineOfSight(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let x = x1, y = y1;

    while (true) {
        if (checkProjectileCollision(x, y)) return false;
        if (x === x2 && y === y2) return true;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

function renderProjectiles(ctx, camX, camY, tileSize, offsetX) {
    const trackerWidth = offsetX || 0;

    for (const proj of projectiles) {
        if (!proj.active) continue;

        const screenX = (proj.displayX - camX) * tileSize + trackerWidth + tileSize / 2;
        const screenY = (proj.displayY - camY) * tileSize + tileSize / 2;
        const angle = Math.atan2(proj.dirY || 0, proj.dirX || 1);

        ctx.save();
        const alpha = proj.alpha !== undefined ? proj.alpha : 1.0;
        ctx.globalAlpha = alpha;

        if (proj.isMagic) {
            const color = getProjectileElementColor(proj.element);
            ctx.translate(screenX, screenY);
            ctx.rotate(angle);

            const gradient = ctx.createLinearGradient(-20, 0, 6, 0);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, color + '44');
            gradient.addColorStop(1, color);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(6, -4);
            ctx.lineTo(6, 4);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = color;
            ctx.globalAlpha = alpha * 0.7;
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(4, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.translate(screenX, screenY);
            ctx.rotate(angle);

            const trailGradient = ctx.createLinearGradient(-16, 0, 0, 0);
            trailGradient.addColorStop(0, 'transparent');
            trailGradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');

            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.moveTo(-16, 0);
            ctx.lineTo(0, -2);
            ctx.lineTo(0, 2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#dddddd';
            ctx.fillRect(-6, -1, 14, 2);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(6, -3);
            ctx.lineTo(6, 3);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#aaaaaa';
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(-4, -3);
            ctx.lineTo(-4, 3);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

function getProjectileElementColor(element) {
    const colors = {
        fire: '#ff4400', ice: '#00aaff', lightning: '#ffff00',
        necromancy: '#aa00ff', arcane: '#ff00ff', holy: '#ffffaa',
        dark: '#440088', death: '#884488', physical: '#888888'
    };
    return colors[element] || colors.physical;
}

function clearProjectiles() {
    projectiles.length = 0;
}

// ############################################################################
// SECTION 5: CORE COMBAT LOOP
// ############################################################################

function updateCombat(deltaTime) {
    if (game.player?.combat?.isInCombat) {
        updateEntityCombat(game.player, deltaTime);
    }

    if (game.enemies) {
        for (const enemy of game.enemies) {
            if (enemy.hp <= 0) continue;
            if (enemy.combat?.isInCombat) {
                updateEntityCombat(enemy, deltaTime);
            }
        }
    }

    updatePlayerCombatDisengage(deltaTime);
}

function updatePlayerCombatDisengage(deltaTime) {
    const player = game.player;
    if (!player) return;
    if (!player.inCombat && !player.combat?.isInCombat) return;

    let hasActiveThreats = false;
    if (game.enemies) {
        for (const enemy of game.enemies) {
            if (enemy.hp <= 0) continue;
            if (enemy.state === 'chasing' || enemy.combat?.isInCombat) {
                if (enemy.combat?.currentTarget === player) {
                    hasActiveThreats = true;
                    break;
                }
                if (typeof isInSameRoom === 'function' && isInSameRoom(enemy, player)) {
                    hasActiveThreats = true;
                    break;
                }
            }
        }
    }

    if (player.combatDisengageTimer === undefined) player.combatDisengageTimer = 0;

    if (hasActiveThreats) {
        player.combatDisengageTimer = 0;
    } else {
        player.combatDisengageTimer += deltaTime * 1000;
        if (player.combatDisengageTimer >= COMBAT_CONFIG.combatDisengageTime) {
            disengageCombat(player);
            player.combatDisengageTimer = 0;
            if (typeof addMessage === 'function') addMessage('You have escaped combat.');
        }
    }
}

function updateEntityCombat(entity, deltaTime) {
    const combat = entity.combat;
    if (!combat) return;

    if (entity === game.player) return; // Player uses manual combat

    if (typeof canEntityAct === 'function' && !canEntityAct(entity)) return;

    if (!combat.attackAnimation) {
        combat.attackAnimation = { state: 'idle', timer: 0, maxTimer: 0, type: 'melee', targetLocked: null };
    }

    if (combat.attackAnimation.state !== 'idle') {
        updateAttackAnimation(entity, deltaTime);
        return;
    }

    combat.attackCooldown -= deltaTime / 1000;

    if (!combat.currentTarget || combat.currentTarget.hp <= 0) {
        disengageCombat(entity);
        return;
    }

    if (!canAttackTarget(entity, combat.currentTarget)) return;

    if (combat.attackCooldown <= 0) {
        let usedAbility = false;
        if (entity !== game.player && typeof EnemyAbilitySystem !== 'undefined') {
            usedAbility = EnemyAbilitySystem.tryUseAbility(entity, combat.currentTarget);
        }
        if (!usedAbility) {
            startAttackWindup(entity, combat.currentTarget);
        } else {
            const baseSpeed = combat.attackSpeed || 1.0;
            combat.attackCooldown = (COMBAT_CONFIG.baseAttackTime * baseSpeed) / 1000;
        }
    }
}

function startAttackWindup(attacker, target) {
    const combat = attacker.combat;
    const duration = COMBAT_CONFIG.enemyAttackDuration;

    let attackType = 'melee';
    if (attacker.attackRange && attacker.attackRange > 2) attackType = 'ranged';
    if (attacker.element && ['fire', 'ice', 'arcane', 'void', 'death'].includes(attacker.element)) attackType = 'magic';
    if (combat.attackType) attackType = combat.attackType;

    combat.attackAnimation = {
        state: 'windup',
        timer: duration * COMBAT_CONFIG.enemyWindupPercent,
        maxTimer: duration * COMBAT_CONFIG.enemyWindupPercent,
        totalDuration: duration,
        type: attackType,
        targetLocked: { x: target.gridX, y: target.gridY, entity: target }
    };

    const dx = target.gridX - attacker.gridX;
    const dy = target.gridY - attacker.gridY;
    if (Math.abs(dx) > Math.abs(dy)) {
        attacker.facing = dx > 0 ? 'right' : 'left';
    } else {
        attacker.facing = dy > 0 ? 'down' : 'up';
    }
}

function updateAttackAnimation(entity, deltaTime) {
    const combat = entity.combat;
    const anim = combat.attackAnimation;

    if (entity.hp <= 0) {
        anim.state = 'idle';
        anim.timer = 0;
        return;
    }

    anim.timer -= deltaTime;

    switch (anim.state) {
        case 'windup':
            if (anim.timer <= 0) {
                const target = anim.targetLocked?.entity;
                if (entity.hp > 0 && target && target.hp > 0) {
                    performAttack(entity, target);
                }
                anim.state = 'recovery';
                anim.timer = anim.totalDuration * (1 - COMBAT_CONFIG.enemyWindupPercent);
            }
            break;
        case 'recovery':
            if (anim.timer <= 0) {
                anim.state = 'idle';
                anim.timer = 0;
                const baseSpeed = combat.attackSpeed || 1.0;
                combat.attackCooldown = (COMBAT_CONFIG.baseAttackTime * baseSpeed) / 1000;
            }
            break;
    }
}

function getAttackAnimationState(entity) {
    const anim = entity.combat?.attackAnimation;
    if (!anim || anim.state === 'idle') return null;

    const windupProgress = anim.state === 'windup' ? 1 - (anim.timer / anim.maxTimer) : 1;
    const inFlashPhase = anim.state === 'windup' && windupProgress >= COMBAT_CONFIG.enemyWhiteFlashStart;

    return {
        state: anim.state, type: anim.type, progress: windupProgress,
        inFlashPhase, targetLocked: anim.targetLocked,
        isWindup: anim.state === 'windup', isRecovery: anim.state === 'recovery'
    };
}

function engageCombat(attacker, target) {
    if (!attacker?.combat || !target?.combat) return;
    if (attacker.combat.currentTarget === target && attacker.combat.isInCombat) return;

    attacker.combat.isInCombat = true;
    attacker.combat.currentTarget = target;
    attacker.combat.attackCooldown = COMBAT_CONFIG.engageDelay;

    if (attacker === game.player) attacker.inCombat = true;
    if (target === game.player) target.inCombat = true;

    if (typeof addMessage === 'function') addMessage(`Engaging ${target.name || 'target'}!`);

    if (typeof NoiseSystem !== 'undefined' && attacker === game.player) {
        NoiseSystem.playerNoise('ATTACK_MELEE');
    }

    if (target.combat?.autoRetaliate && !target.combat.isInCombat) {
        engageCombat(target, attacker);
    }
}

function disengageCombat(entity) {
    if (!entity?.combat) return;
    entity.combat.isInCombat = false;
    entity.combat.currentTarget = null;
    entity.combat.attackCooldown = 0;
    if (entity === game.player) entity.inCombat = false;
}

function checkAmbush(attacker, defender) {
    if (!AMBUSH_CONFIG.enabled) return false;
    if (attacker !== game.player) return false;
    if (defender === game.player) return false;

    let currentState = defender.ai?.currentState || defender.state;
    if (!currentState) return false;
    if (!AMBUSH_CONFIG.unawareStates.includes(currentState)) return false;

    const enemyX = defender.gridX ?? defender.x;
    const enemyY = defender.gridY ?? defender.y;
    const playerX = attacker.gridX ?? attacker.x;
    const playerY = attacker.gridY ?? attacker.y;

    const dx = playerX - enemyX;
    const dy = playerY - enemyY;
    const angleToPlayer = Math.atan2(dy, dx) * (180 / Math.PI);

    const facingAngles = { right: 0, down: 90, left: 180, up: -90 };
    const facingAngle = facingAngles[defender.facing] ?? 0;

    let angleDiff = Math.abs(angleToPlayer - facingAngle);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    return angleDiff > AMBUSH_CONFIG.sideAngleThreshold;
}

function performAttack(attacker, defender) {
    const room = getCurrentRoom(attacker);
    const isAmbush = checkAmbush(attacker, defender);

    const isEnemy = attacker !== game.player;
    const comboCount = isEnemy ? (attacker.combat?.comboCount || 1) : 1;
    const isComboFinisher = isEnemy && comboCount === 3;

    let result;
    if (typeof DamageCalculator !== 'undefined') {
        result = DamageCalculator.calculateDamage(attacker, defender, room);
    } else {
        result = calculateDamageFallback(attacker, defender);
    }

    if (!result.isHit) {
        if (isEnemy && attacker.combat) attacker.combat.comboCount = (comboCount % 3) + 1;
        if (typeof addMessage === 'function') addMessage(`${attacker.name || 'You'} missed!`);
        showDamageNumber(defender, 0, '#888888');
        return;
    }

    if (isAmbush) {
        if (AMBUSH_CONFIG.guaranteedCrit && !result.isCrit) {
            result.isCrit = true;
            result.finalDamage = Math.floor(result.finalDamage * 1.5);
            if (!result.messages) result.messages = [];
            result.messages.push('CRITICAL');
        }
        result.finalDamage = Math.floor(result.finalDamage * AMBUSH_CONFIG.damageMultiplier);
        result.isAmbush = true;
    }

    if (isComboFinisher) {
        result.finalDamage = Math.floor(result.finalDamage * 1.5);
        result.isComboFinisher = true;
    }

    if (isEnemy && attacker.combat) attacker.combat.comboCount = (comboCount % 3) + 1;

    applyDamage(defender, result.finalDamage, attacker, result);

    if (typeof onCombatHit === 'function') onCombatHit(attacker, defender, result);

    let color = result.isCrit ? '#ffff00' : '#ff4444';
    if (result.isAmbush) color = '#ffd700';
    if (result.isComboFinisher) color = '#ff00ff';

    if (result.isAmbush) {
        showDamageNumber(defender, 'AMBUSH!', '#ffd700', { isCrit: true });
        if (typeof triggerScreenEffect === 'function') {
            triggerScreenEffect('shake', AMBUSH_CONFIG.screenShakeIntensity, AMBUSH_CONFIG.screenShakeDuration);
        }
    }

    showDamageNumber(defender, result.finalDamage, color, { isCrit: result.isCrit || result.isAmbush });

    if (typeof NoiseSystem !== 'undefined') {
        if (attacker === game.player) NoiseSystem.playerNoise('HIT_IMPACT');
        else NoiseSystem.monsterNoise(attacker, 'HIT_IMPACT');
    }

    applyWeaponEffects(attacker, defender, result);

    if (defender.hp <= 0) handleDeath(defender, attacker);
}

function applyDamage(entity, damage, source, damageResult) {
    if (entity === game.player && typeof playerHasIframes === 'function' && playerHasIframes()) return;
    if (entity === game.player && window.godMode) return;

    if (typeof damage !== 'number' || isNaN(damage)) damage = 1;

    if (typeof StatusEffectSystem !== 'undefined') {
        const mod = StatusEffectSystem.getStatModifier(entity, 'damageTaken');
        if (typeof mod === 'number' && !isNaN(mod)) damage = Math.floor(damage * (1 + mod));
    }

    if (entity === game.player && typeof applyBoonDamageReduction === 'function') {
        damage = applyBoonDamageReduction(damage);
    }

    if (isNaN(damage)) damage = 1;
    entity.hp -= damage;
    if (isNaN(entity.hp)) entity.hp = 0;

    if (entity === game.player && typeof awardDefenseXp === 'function') {
        awardDefenseXp(game.player, damage);
    }

    if (entity === game.player && typeof triggerScreenEffect === 'function') {
        const dmgPct = Math.min(1, damage / entity.maxHp);
        triggerScreenEffect('damage', 0.2 + dmgPct * 0.4, 200);
    }

    if (!entity.hitFlash) entity.hitFlash = { active: false, time: 0 };
    entity.hitFlash.active = true;
    entity.hitFlash.time = Date.now();
    entity.hitFlash.duration = entity === game.player ? 150 : 100;

    if (entity !== game.player && typeof EnemyAbilitySystem !== 'undefined') {
        entity.lastDamageTime = Date.now();
        EnemyAbilitySystem.checkMechanics(entity, 'on_damaged', { damage, source });
    }

    if (entity.isInvisible) {
        entity.isInvisible = false;
        if (typeof removeStatusEffect === 'function') removeStatusEffect(entity, 'invisible');
    }

    if (typeof BoonCombatIntegration !== 'undefined' && entity === game.player) {
        BoonCombatIntegration.applyOnDamageTakenEffects(entity, damage, source);
    }
}

function applyWeaponEffects(attacker, defender, damageResult) {
    const weapon = attacker.equipped?.MAIN;
    if (!weapon) return;

    const damageType = weapon.damageType;
    if (damageType && typeof applyStatusEffect === 'function') {
        if (damageType === 'blade' && Math.random() < (weapon.special?.bleedChance || 0.15)) {
            applyStatusEffect(defender, 'bleeding', attacker);
        }
        if (damageType === 'blunt' && Math.random() < (weapon.special?.stunChance || 0.15)) {
            if (typeof StatusEffectSystem !== 'undefined') {
                StatusEffectSystem.applyEffect(defender, 'stunned', attacker, { duration: 1000 });
            } else {
                applyStatusEffect(defender, 'stunned', attacker);
            }
        }
    }

    if (weapon.element && typeof applyStatusEffect === 'function') {
        const effectChance = (weapon.elementPower || 1) * 0.1;
        if (Math.random() < effectChance) {
            const elementEffects = {
                fire: 'burning', ice: 'chilled', nature: 'poisoned',
                death: 'withered', arcane: 'disrupted', dark: 'blinded'
            };
            const effect = elementEffects[weapon.element];
            if (effect) applyStatusEffect(defender, effect, attacker);
        }
    }

    if (typeof BoonCombatIntegration !== 'undefined') {
        BoonCombatIntegration.applyOnHitEffects(attacker, defender, damageResult);
        BoonCombatIntegration.applyOnCritEffects(attacker, defender, damageResult);
    }
}

function handleDeath(entity, killer) {
    if (entity === game.player) {
        if (typeof handlePlayerDeath === 'function') handlePlayerDeath();
        else game.state = 'gameover';
        return;
    }

    if (entity.combat) {
        entity.combat.isInCombat = false;
        entity.combat.currentTarget = null;
        if (entity.combat.attackAnimation) {
            entity.combat.attackAnimation.state = 'idle';
            entity.combat.attackAnimation.timer = 0;
        }
    }

    if (typeof addMessage === 'function') addMessage(`Defeated ${entity.name}!`);
    if (typeof NoiseSystem !== 'undefined') NoiseSystem.monsterNoise(entity, 'DEATH_CRY');
    if (typeof clearStatusEffects === 'function') clearStatusEffects(entity);

    if (typeof BoonCombatIntegration !== 'undefined' && killer === game.player) {
        BoonCombatIntegration.applyOnKillEffects(killer, entity);
    }

    if (typeof spawnLootPile === 'function') {
        spawnLootPile(Math.floor(entity.gridX), Math.floor(entity.gridY), entity);
    }

    const xpReward = entity.xp || calculateXPReward(entity);
    game.player.xp += xpReward;
    if (typeof addMessage === 'function') addMessage(`Gained ${xpReward} XP!`);

    if (typeof checkLevelUp === 'function') checkLevelUp(game.player);

    if (typeof awardSkillXp === 'function') {
        const weapon = game.player.equipped?.MAIN;
        let specialty = weapon?.specialty || weapon?.weaponType || 'unarmed';
        if (weapon && ['staff', 'tome', 'wand'].includes(weapon.weaponType)) {
            specialty = weapon.element || 'arcane';
        }
        awardSkillXp(game.player, String(specialty).toLowerCase(), xpReward);
    }

    const index = game.enemies.indexOf(entity);
    if (index > -1) game.enemies.splice(index, 1);

    if (game.player.combat?.currentTarget === entity) disengageCombat(game.player);
    for (const enemy of game.enemies) {
        if (enemy.combat?.currentTarget === entity) disengageCombat(enemy);
    }
}

function calculateXPReward(entity) {
    const tierXP = { 'TIER_3': 15, 'TIER_2': 30, 'TIER_1': 55, 'ELITE': 100, 'BOSS': 500 };
    return tierXP[entity.tier] || 15;
}

function canAttackTarget(attacker, target) {
    if (attacker === game.player && target !== game.player) {
        const targetX = Math.floor(target.gridX ?? target.x);
        const targetY = Math.floor(target.gridY ?? target.y);
        const tile = game.map?.[targetY]?.[targetX];
        if (!tile || !tile.visible) return false;
    }
    const distance = getDistance(attacker, target);
    const range = attacker.combat?.attackRange || 1;
    return distance <= range + 0.5;
}

function getDistance(entity1, entity2) {
    const dx = Math.abs((entity1.gridX ?? entity1.x) - (entity2.gridX ?? entity2.x));
    const dy = Math.abs((entity1.gridY ?? entity1.y) - (entity2.gridY ?? entity2.y));
    return Math.max(dx, dy);
}

function getCurrentRoom(entity) {
    if (!game.rooms) return null;
    const x = entity.gridX ?? entity.x;
    const y = entity.gridY ?? entity.y;
    for (const room of game.rooms) {
        const rx = room.floorX ?? room.x;
        const ry = room.floorY ?? room.y;
        if (x >= rx && x < rx + (room.floorWidth ?? room.width) &&
            y >= ry && y < ry + (room.floorHeight ?? room.height)) {
            return room;
        }
    }
    return null;
}

function calculateDamageFallback(attacker, defender) {
    const result = { finalDamage: 0, isHit: true, isCrit: false, messages: [] };
    if (Math.random() < COMBAT_CONFIG.missChance) {
        result.isHit = false;
        return result;
    }
    const weapon = attacker.equipped?.MAIN;
    let damage = weapon?.stats?.damage || weapon?.damage || 8;
    damage += Math.floor((attacker.stats?.STR || 10) * 0.5);
    if (Math.random() * 100 < (attacker.critChance || 5)) {
        damage = Math.floor(damage * 1.5);
        result.isCrit = true;
    }
    const defense = defender.pDef || 0;
    damage = Math.floor(damage * (1 - Math.min(0.5, defense / 100)));
    result.finalDamage = Math.max(COMBAT_CONFIG.minDamage, damage);
    return result;
}

// Damage numbers system
const damageNumbers = [];
const COMBAT_TEXT_COLORS = {
    normal: '#ffffff', crit: '#ff4444', heal: '#44ff44', miss: '#888888',
    poison: '#88ff44', fire: '#ff8844', ice: '#44ddff', ambush: '#ffd700'
};

function showDamageNumber(entity, damage, color, options = {}) {
    const x = entity.displayX ?? entity.gridX ?? entity.x;
    const y = entity.displayY ?? entity.gridY ?? entity.y;
    damageNumbers.push({
        x, y, value: damage, color: color || COMBAT_TEXT_COLORS.normal,
        offsetY: 0, alpha: 1, scale: options.isCrit ? 1.5 : 1.0,
        lifetime: 1500, timer: 0, isCrit: options.isCrit
    });
}

function updateDamageNumbers(deltaTime) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dn = damageNumbers[i];
        dn.timer += deltaTime;
        dn.offsetY -= deltaTime * 0.05;
        dn.alpha = Math.max(0, 1 - (dn.timer / dn.lifetime));
        if (dn.timer >= dn.lifetime) damageNumbers.splice(i, 1);
    }
}

function renderDamageNumbers(ctx, camX, camY, tileSize, offsetX) {
    for (const dn of damageNumbers) {
        const screenX = (dn.x - camX) * tileSize + offsetX + tileSize / 2;
        const screenY = (dn.y - camY) * tileSize + dn.offsetY + tileSize / 2;
        ctx.save();
        ctx.globalAlpha = dn.alpha;
        ctx.fillStyle = dn.color;
        ctx.font = `bold ${Math.floor(14 * dn.scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(String(dn.value), screenX, screenY);
        ctx.restore();
    }
}

// ############################################################################
// SECTION 6: COMBAT ENHANCEMENTS (Dash, Knockback, Screen Shake, Stagger)
// ############################################################################

const dashState = {
    cooldown: 0, isDashing: false, dashProgress: 0, dashDuration: 0.15,
    dashStartX: 0, dashStartY: 0, dashTargetX: 0, dashTargetY: 0,
    hasIframes: false, iframeTimer: 0, ghosts: []
};

const screenShakeState = {
    active: false, intensity: 0, timer: 0, offsetX: 0, offsetY: 0,
    directionalX: 0, directionalY: 0
};

function performDash(player, mouseX, mouseY) {
    if (!COMBAT_ENHANCEMENTS_CONFIG.dash.enabled || !player) return false;
    if (dashState.cooldown > 0 || dashState.isDashing) return false;

    const trackerWidth = typeof TRACKER_WIDTH !== 'undefined' ? TRACKER_WIDTH : 250;
    const tileSize = (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 32) * (window.currentZoom || 2);
    const camX = game.camera ? game.camera.x : 0;
    const camY = game.camera ? game.camera.y : 0;

    const worldMouseX = (mouseX - trackerWidth) / tileSize + camX;
    const worldMouseY = mouseY / tileSize + camY;

    const dx = worldMouseX - player.gridX;
    const dy = worldMouseY - player.gridY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) return false;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const dashDist = COMBAT_ENHANCEMENTS_CONFIG.dash.distance;

    const steps = Math.ceil(dashDist / 0.25);
    let validX = player.gridX, validY = player.gridY;

    for (let i = 1; i <= steps; i++) {
        const checkX = player.gridX + (dirX * dashDist * i / steps);
        const checkY = player.gridY + (dirY * dashDist * i / steps);
        if (typeof isTileWalkable === 'function' && isTileWalkable(Math.floor(checkX), Math.floor(checkY))) {
            validX = checkX; validY = checkY;
        } else break;
    }

    if (validX === player.gridX && validY === player.gridY) return false;

    dashState.isDashing = true;
    dashState.dashProgress = 0;
    dashState.dashStartX = player.gridX;
    dashState.dashStartY = player.gridY;
    dashState.dashTargetX = validX;
    dashState.dashTargetY = validY;
    dashState.hasIframes = true;
    dashState.iframeTimer = COMBAT_ENHANCEMENTS_CONFIG.dash.iframeDuration;
    dashState.cooldown = COMBAT_ENHANCEMENTS_CONFIG.dash.cooldown;

    createDashGhosts(player);

    if (Math.abs(dirX) > Math.abs(dirY)) player.facing = dirX > 0 ? 'right' : 'left';
    else player.facing = dirY > 0 ? 'down' : 'up';

    return true;
}

function createDashGhosts(player) {
    dashState.ghosts = [];
    const ghostCount = COMBAT_ENHANCEMENTS_CONFIG.dash.ghostCount;
    for (let i = 0; i < ghostCount; i++) {
        const t = i / ghostCount;
        dashState.ghosts.push({
            x: dashState.dashStartX + (dashState.dashTargetX - dashState.dashStartX) * t,
            y: dashState.dashStartY + (dashState.dashTargetY - dashState.dashStartY) * t,
            facing: player.facing,
            alpha: 0.6 - (t * 0.4),
            timer: COMBAT_ENHANCEMENTS_CONFIG.dash.ghostFadeDuration
        });
    }
}

function updateDash(deltaTime) {
    const dt = deltaTime / 1000;
    const player = game.player;

    if (dashState.cooldown > 0) dashState.cooldown = Math.max(0, dashState.cooldown - dt);

    if (dashState.hasIframes) {
        dashState.iframeTimer -= dt;
        if (dashState.iframeTimer <= 0) dashState.hasIframes = false;
    }

    if (dashState.isDashing && player) {
        dashState.dashProgress += dt / dashState.dashDuration;

        if (dashState.dashProgress >= 1) {
            dashState.dashProgress = 1;
            dashState.isDashing = false;
            player.gridX = dashState.dashTargetX;
            player.gridY = dashState.dashTargetY;
            player.displayX = dashState.dashTargetX;
            player.displayY = dashState.dashTargetY;
            if (typeof checkTileInteractions === 'function') checkTileInteractions(player);
        } else {
            const t = typeof easeOutQuad === 'function' ? easeOutQuad(dashState.dashProgress) : dashState.dashProgress;
            const newX = dashState.dashStartX + (dashState.dashTargetX - dashState.dashStartX) * t;
            const newY = dashState.dashStartY + (dashState.dashTargetY - dashState.dashStartY) * t;
            player.gridX = newX; player.gridY = newY;
            player.displayX = newX; player.displayY = newY;
        }
    }

    for (let i = dashState.ghosts.length - 1; i >= 0; i--) {
        const ghost = dashState.ghosts[i];
        ghost.timer -= dt;
        ghost.alpha = Math.max(0, ghost.alpha * (ghost.timer / COMBAT_ENHANCEMENTS_CONFIG.dash.ghostFadeDuration));
        if (ghost.timer <= 0) dashState.ghosts.splice(i, 1);
    }
}

function playerHasIframes() { return dashState.hasIframes; }
function playerIsDashing() { return dashState.isDashing; }
function getDashCooldown() { return dashState.cooldown; }
function getDashCooldownMax() { return COMBAT_ENHANCEMENTS_CONFIG.dash.cooldown; }

function applyKnockback(enemy, source, weapon) {
    if (!COMBAT_ENHANCEMENTS_CONFIG.knockback.enabled || !enemy || !source) return;
    if (enemy.tier === 'ELITE' || enemy.tier === 'BOSS') return;

    let knockbackDist = COMBAT_ENHANCEMENTS_CONFIG.knockback.defaultDistance;
    if (weapon) {
        const specialty = weapon.weaponType || weapon.specialty;
        if (specialty && COMBAT_ENHANCEMENTS_CONFIG.knockback.distances[specialty]) {
            knockbackDist = COMBAT_ENHANCEMENTS_CONFIG.knockback.distances[specialty];
        }
    }

    const dx = enemy.gridX - source.gridX;
    const dy = enemy.gridY - source.gridY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) return;

    const dirX = dx / dist, dirY = dy / dist;
    const steps = Math.ceil(knockbackDist / 0.25);
    let validX = enemy.gridX, validY = enemy.gridY, hitWall = false;

    for (let i = 1; i <= steps; i++) {
        const checkX = enemy.gridX + (dirX * knockbackDist * i / steps);
        const checkY = enemy.gridY + (dirY * knockbackDist * i / steps);
        if (typeof isTileWalkable === 'function' && isTileWalkable(Math.floor(checkX), Math.floor(checkY))) {
            validX = checkX; validY = checkY;
        } else { hitWall = true; break; }
    }

    if (hitWall) {
        const wallDamage = Math.floor(enemy.maxHp * COMBAT_ENHANCEMENTS_CONFIG.knockback.wallDamagePercent);
        if (wallDamage > 0) {
            enemy.hp -= wallDamage;
            if (typeof addMessage === 'function') addMessage(`${enemy.name} slammed into wall for ${wallDamage} damage!`);
            showDamageNumber(enemy, wallDamage, '#ff8800');
            if (enemy.hp <= 0 && typeof handleDeath === 'function') handleDeath(enemy, source);
        }
    }

    if (validX !== enemy.gridX || validY !== enemy.gridY) {
        enemy.gridX = validX; enemy.gridY = validY;
        enemy.displayX = validX; enemy.displayY = validY;
    }
}

function getKnockbackDistance(weapon) {
    if (!weapon) return COMBAT_ENHANCEMENTS_CONFIG.knockback.defaultDistance;
    const specialty = weapon.weaponType || weapon.specialty;
    return COMBAT_ENHANCEMENTS_CONFIG.knockback.distances[specialty] || COMBAT_ENHANCEMENTS_CONFIG.knockback.defaultDistance;
}

function triggerScreenShake(isCrit = false) {
    if (!COMBAT_ENHANCEMENTS_CONFIG.screenShake.enabled) return;
    screenShakeState.active = true;
    screenShakeState.intensity = isCrit ? COMBAT_ENHANCEMENTS_CONFIG.screenShake.critIntensity : COMBAT_ENHANCEMENTS_CONFIG.screenShake.normalIntensity;
    screenShakeState.timer = COMBAT_ENHANCEMENTS_CONFIG.screenShake.duration;
}

function updateScreenShake(deltaTime) {
    const dt = deltaTime / 1000;
    if (screenShakeState.active) {
        screenShakeState.timer -= dt;
        if (screenShakeState.timer <= 0) {
            screenShakeState.active = false;
            screenShakeState.offsetX = 0; screenShakeState.offsetY = 0;
            screenShakeState.directionalX = 0; screenShakeState.directionalY = 0;
        } else {
            const duration = COMBAT_ENHANCEMENTS_CONFIG.screenShake.duration;
            const decay = screenShakeState.timer / duration;
            const intensity = screenShakeState.intensity * decay;

            if (screenShakeState.directionalX || screenShakeState.directionalY) {
                const phase = (1 - decay) * Math.PI * 4;
                const dirMag = Math.sin(phase) * decay;
                const perpJitter = (Math.random() - 0.5) * intensity * 0.3;
                screenShakeState.offsetX = screenShakeState.directionalX * dirMag + perpJitter;
                screenShakeState.offsetY = screenShakeState.directionalY * dirMag + perpJitter;
            } else {
                screenShakeState.offsetX = (Math.random() - 0.5) * 2 * intensity;
                screenShakeState.offsetY = (Math.random() - 0.5) * 2 * intensity;
            }
        }
    }
}

function getScreenShakeOffset() { return { x: screenShakeState.offsetX, y: screenShakeState.offsetY }; }

function applyStagger(enemy) {
    if (!COMBAT_ENHANCEMENTS_CONFIG.stagger.enabled || !enemy) return;
    if (enemy.tier === 'ELITE' || enemy.tier === 'BOSS') return;

    if (!enemy.stagger) enemy.stagger = { active: false, timer: 0, flashTimer: 0, flashVisible: true };

    enemy.stagger.active = true;
    enemy.stagger.timer = COMBAT_ENHANCEMENTS_CONFIG.stagger.duration;
    enemy.stagger.flashTimer = COMBAT_ENHANCEMENTS_CONFIG.stagger.flashDuration;
    enemy.stagger.flashVisible = false;

    if (enemy.combat) enemy.combat.attackCooldown = Math.max(enemy.combat.attackCooldown, 0.3);
}

function updateStagger(deltaTime) {
    const dt = deltaTime / 1000;
    if (!game.enemies) return;

    for (const enemy of game.enemies) {
        if (!enemy.stagger || !enemy.stagger.active) continue;
        enemy.stagger.timer -= dt;

        if (enemy.stagger.timer <= 0) {
            enemy.stagger.active = false;
            enemy.stagger.flashVisible = true;
        } else {
            enemy.stagger.flashTimer -= dt;
            if (enemy.stagger.flashTimer <= 0) {
                enemy.stagger.flashVisible = !enemy.stagger.flashVisible;
                enemy.stagger.flashTimer = COMBAT_ENHANCEMENTS_CONFIG.stagger.flashDuration;
            }
        }
    }
}

function isEnemyStaggered(enemy) { return enemy?.stagger?.active || false; }
function getEnemyStaggerFlash(enemy) { return enemy?.stagger?.active && !enemy.stagger.flashVisible; }

function onCombatHit(attacker, defender, damageResult) {
    if (!damageResult?.skipScreenShake) {
        if (attacker === game.player || defender === game.player) {
            triggerScreenShake(damageResult?.isCrit || false);
        }
    }

    if (attacker === game.player && defender !== game.player) {
        const weapon = attacker.equipped?.MAIN;
        applyKnockback(defender, attacker, weapon);
        applyStagger(defender);
    }
}

// Spacebar dash input handler
let lastMouseX = 0, lastMouseY = 0;
window.addEventListener('mousemove', (e) => { lastMouseX = e.clientX; lastMouseY = e.clientY; });
window.addEventListener('keydown', (e) => {
    if (e.key === ' ' && game.state === 'playing') {
        e.preventDefault();
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            performDash(game.player, lastMouseX - rect.left, lastMouseY - rect.top);
        }
    }
});

// ############################################################################
// SECTION 7: BOON COMBAT INTEGRATION
// ############################################################################
// Hooks boon effects into the combat system:
// - On-hit effects (Kindled Blade, Corrosive Touch, etc.)
// - On-kill effects (Executioner's Gait, Leech Spores, etc.)
// - On-damage-taken effects (Kinetic Discharge, Spiked Armor, etc.)
// - Damage modifiers from boons
// - Fear AI behavior integration

const BoonCombatIntegration = {

    // Apply boon on-hit effects when player attacks an enemy
    applyOnHitEffects(attacker, defender, damageResult) {
        if (attacker !== game.player) return;
        if (typeof BoonSystem === 'undefined') return;

        // KINDLED BLADE: Attacks apply Ignite
        if (BoonSystem.hasBoon('kindled_blade')) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'ignite', attacker);
            }
        }

        // CORROSIVE TOUCH: Attacks apply Rot
        if (BoonSystem.hasBoon('corrosive_touch')) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'rot', attacker);
            }
        }

        // GLACIAL PACE: Attacks apply Chill
        if (BoonSystem.hasBoon('glacial_pace')) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'chilled', attacker);
            }
        }

        // RUSTED EDGE: Critical hits apply Slow
        if (BoonSystem.hasBoon('rusted_edge') && damageResult.isCrit) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'slow', attacker);
            }
        }

        // UNSEEN TERROR: Backstab attacks cause Fear
        if (BoonSystem.hasBoon('unseen_terror') && damageResult.isBackstab) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'fear', attacker);
            }
        }

        // THROAT SLIT: Ambush attacks cause permanent Bleed
        if (BoonSystem.hasBoon('throat_slit') && damageResult.isAmbush) {
            if (typeof StatusEffectSystem !== 'undefined') {
                StatusEffectSystem.applyEffect(defender, 'bleeding', attacker, { duration: 60000 });
            }
        }

        // SEPTIC WOUND: Bleeding enemies gain Rot on hit
        if (BoonSystem.hasBoon('septic_wound')) {
            if (typeof hasStatusEffect === 'function' && hasStatusEffect(defender, 'bleeding')) {
                if (typeof applyStatusEffect === 'function') {
                    applyStatusEffect(defender, 'rot', attacker);
                }
            }
        }

        // STATIC FEEDBACK: 5% chance to shock self on hit
        if (BoonSystem.hasBoon('static_feedback')) {
            if (Math.random() < 0.05) {
                if (typeof applyStatusEffect === 'function') {
                    applyStatusEffect(attacker, 'stunned', null);
                    if (typeof addMessage === 'function') {
                        addMessage('Static feedback shocks you!', 'warning');
                    }
                }
            }
        }
    },

    // Apply boon effects on critical hits
    applyOnCritEffects(attacker, defender, damageResult) {
        if (attacker !== game.player) return;
        if (typeof BoonSystem === 'undefined') return;
        if (!damageResult.isCrit) return;

        // CAUTERIZE: Crits on burning enemies consume burn for burst damage
        if (BoonSystem.hasBoon('cauterize')) {
            const checkAndCauterize = (effectName) => {
                if (typeof hasStatusEffect === 'function' && hasStatusEffect(defender, effectName)) {
                    if (typeof removeStatusEffect === 'function') {
                        removeStatusEffect(defender, effectName);
                    }
                    const burstDamage = Math.floor(damageResult.baseDamage * 0.5);
                    defender.hp -= burstDamage;
                    if (typeof addMessage === 'function') {
                        addMessage(`Cauterize! ${burstDamage} burst damage!`, 'combat');
                    }
                }
            };
            checkAndCauterize('burning');
            checkAndCauterize('ignite');
        }
    },

    // Apply boon effects when player kills an enemy
    applyOnKillEffects(killer, killed) {
        if (killer !== game.player) return;
        if (typeof BoonSystem === 'undefined') return;

        // EXECUTIONER'S GAIT: Kills grant +20% move speed for 3s
        if (BoonSystem.hasBoon('executioners_gait')) {
            const stacks = BoonSystem.getBoonStacks('executioners_gait');
            const bonus = 0.20 * stacks;
            if (!game.player.boonBuffs) game.player.boonBuffs = {};
            game.player.boonBuffs.executionersGait = {
                speedBonus: bonus,
                expiresAt: Date.now() + 3000
            };
            if (typeof addMessage === 'function') {
                addMessage(`Executioner's Gait: +${Math.round(bonus * 100)}% speed!`, 'buff');
            }
        }

        // LEECH SPORES: Killing a Rotted enemy heals HP
        if (BoonSystem.hasBoon('leech_spores')) {
            if (typeof hasStatusEffect === 'function' && hasStatusEffect(killed, 'rot')) {
                const stacks = BoonSystem.getBoonStacks('leech_spores');
                const healAmount = 5 * stacks;
                game.player.hp = Math.min(game.player.hp + healAmount, game.player.maxHp);
                if (typeof addMessage === 'function') {
                    addMessage(`Leech Spores: Healed ${healAmount} HP!`, 'heal');
                }
            }
        }

        // BLOOD RITE: Kill heals 10 HP but causes self-bleed
        if (BoonSystem.hasBoon('blood_rite')) {
            game.player.hp = Math.min(game.player.hp + 10, game.player.maxHp);
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(game.player, 'bleeding', null);
            }
            if (typeof addMessage === 'function') {
                addMessage('Blood Rite: Healed 10 HP, but bleeding!', 'warning');
            }
        }

        // CRIMSON RAIN (Legendary): Kills explode for AoE + max bleed
        if (BoonSystem.hasBoon('crimson_rain')) {
            if (game.enemies) {
                const explosionRadius = 3;
                const explosionDamage = 15;
                for (const enemy of game.enemies) {
                    if (enemy === killed || enemy.hp <= 0) continue;
                    const dist = Math.sqrt(
                        Math.pow(enemy.gridX - killed.gridX, 2) +
                        Math.pow(enemy.gridY - killed.gridY, 2)
                    );
                    if (dist <= explosionRadius) {
                        enemy.hp -= explosionDamage;
                        if (typeof StatusEffectSystem !== 'undefined') {
                            for (let i = 0; i < 3; i++) {
                                StatusEffectSystem.applyEffect(enemy, 'bleeding', game.player);
                            }
                        }
                    }
                }
                if (typeof addMessage === 'function') {
                    addMessage('CRIMSON RAIN!', 'legendary');
                }
            }
        }
    },

    // Apply boon effects when player takes damage
    applyOnDamageTakenEffects(entity, damage, source) {
        if (entity !== game.player) return;
        if (typeof BoonSystem === 'undefined') return;

        // KINETIC DISCHARGE: Taking damage knocks back nearby enemies
        if (BoonSystem.hasBoon('kinetic_discharge') && source) {
            if (game.enemies) {
                const knockbackRadius = 2;
                const knockbackForce = 2;
                for (const enemy of game.enemies) {
                    if (enemy.hp <= 0) continue;
                    const dist = Math.sqrt(
                        Math.pow(enemy.gridX - entity.gridX, 2) +
                        Math.pow(enemy.gridY - entity.gridY, 2)
                    );
                    if (dist <= knockbackRadius && dist > 0) {
                        const dx = (enemy.gridX - entity.gridX) / dist;
                        const dy = (enemy.gridY - entity.gridY) / dist;
                        enemy.gridX += dx * knockbackForce;
                        enemy.gridY += dy * knockbackForce;
                    }
                }
            }
        }

        // SPIKED ARMOR: Reflect damage and apply bleed to attacker
        if (BoonSystem.hasBoon('spiked_armor') && source && source !== entity) {
            const reflectDamage = Math.floor(damage * 0.2);
            source.hp -= reflectDamage;
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(source, 'bleeding', entity);
            }
        }

        // TOXIC BLOOD: Spray acid on attacker (armor break)
        if (BoonSystem.hasBoon('toxic_blood') && source && source !== entity) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(source, 'rot', entity);
            }
        }

        // IRON MAIDEN: Reflect 200% damage
        if (BoonSystem.hasBoon('iron_maiden') && source && source !== entity) {
            const reflectDamage = Math.floor(damage * 2.0);
            source.hp -= reflectDamage;
            if (typeof addMessage === 'function') {
                addMessage(`Iron Maiden reflects ${reflectDamage} damage!`, 'combat');
            }
        }
    },

    // Get damage multiplier from boons
    getDamageMultiplier(attacker, defender, damageResult) {
        if (attacker !== game.player) return 1.0;
        if (typeof BoonSystem === 'undefined') return 1.0;

        let multiplier = 1.0;

        // GLASS CANNON: 2x damage
        if (BoonSystem.hasBoon('glass_cannon')) multiplier *= 2.0;

        // DARK PACT: +100% damage when torch off
        if (BoonSystem.hasBoon('dark_pact') && game.player.torchOn === false) multiplier *= 2.0;

        // THE CULL: 2x damage to enemies below 20% HP
        if (BoonSystem.hasBoon('the_cull')) {
            const defenderHpPct = defender.hp / defender.maxHp;
            if (defenderHpPct < 0.20) multiplier *= 2.0;
        }

        // DEEP CUT: 3x damage on ambush
        if (BoonSystem.hasBoon('deep_cut') && damageResult.isAmbush) multiplier *= 3.0;

        // SEARING RADIANCE: +15% damage to enemies in light
        if (BoonSystem.hasBoon('searing_radiance')) {
            const dist = Math.sqrt(
                Math.pow(defender.gridX - attacker.gridX, 2) +
                Math.pow(defender.gridY - attacker.gridY, 2)
            );
            const lightRadius = attacker.lightRadius || 5;
            if (dist <= lightRadius) {
                const stacks = BoonSystem.getBoonStacks('searing_radiance');
                multiplier *= (1 + 0.15 * stacks);
            }
        }

        // FESTERING WOUNDS: +10% damage to enemies with DoT
        if (BoonSystem.hasBoon('festering_wounds')) {
            const hasDot = (typeof hasStatusEffect === 'function') && (
                hasStatusEffect(defender, 'burning') ||
                hasStatusEffect(defender, 'ignite') ||
                hasStatusEffect(defender, 'bleeding') ||
                hasStatusEffect(defender, 'rot') ||
                hasStatusEffect(defender, 'poisoned')
            );
            if (hasDot) {
                const stacks = BoonSystem.getBoonStacks('festering_wounds');
                multiplier *= (1 + 0.10 * stacks);
            }
        }

        // SHATTER STRIKE: +40% damage to chilled/frozen enemies
        if (BoonSystem.hasBoon('shatter_strike')) {
            const isChilled = (typeof hasStatusEffect === 'function') && (
                hasStatusEffect(defender, 'chilled') ||
                hasStatusEffect(defender, 'frozen')
            );
            if (isChilled) {
                const stacks = BoonSystem.getBoonStacks('shatter_strike');
                multiplier *= (1 + 0.40 * stacks);
            }
        }

        // PARANOIA: +50% if no enemies visible, -20% if any visible
        if (BoonSystem.hasBoon('paranoia')) {
            const visibleEnemies = game.enemies?.filter(e => e.hp > 0 && e.isVisible).length || 0;
            multiplier *= visibleEnemies === 0 ? 1.5 : 0.8;
        }

        // FINAL OFFER (Legendary): 5x damage
        if (BoonSystem.hasBoon('final_offer')) multiplier *= 5.0;

        return multiplier;
    },

    // Get armor reduction from rot stacks
    getArmorModifier(defender) {
        if (typeof StatusEffectSystem === 'undefined') return 1.0;
        const rotEffect = StatusEffectSystem.getEffect(defender, 'rot');
        if (!rotEffect) return 1.0;

        const stacks = rotEffect.stacks || 1;
        const reductionPerStack = 0.10;
        const totalReduction = Math.min(stacks * reductionPerStack, 1.0);
        return 1.0 - totalReduction;
    },

    // Check if enemy should flee due to fear
    shouldFlee(enemy) {
        if (enemy.isFeared) return true;
        if (typeof hasStatusEffect === 'function' && hasStatusEffect(enemy, 'fear')) return true;
        return false;
    },

    // Get flee target position (away from fear source)
    getFleeTarget(enemy) {
        let fleeFromX = enemy.fleeFromX;
        let fleeFromY = enemy.fleeFromY;

        if (fleeFromX === undefined || fleeFromY === undefined) {
            if (game.player) {
                fleeFromX = game.player.gridX;
                fleeFromY = game.player.gridY;
            } else return null;
        }

        const dx = enemy.gridX - fleeFromX;
        const dy = enemy.gridY - fleeFromY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        return { x: enemy.gridX + (dx / dist) * 5, y: enemy.gridY + (dy / dist) * 5 };
    },

    // Update boon effects that tick over time
    update(deltaTime) {
        if (!game.player) return;
        if (typeof BoonSystem === 'undefined') return;

        // LIFE OF THE FLAME: Regen 1% HP/s when torch is on
        if (BoonSystem.hasBoon('life_of_the_flame') && game.player.torchOn) {
            const regenAmount = game.player.maxHp * 0.01 * deltaTime;
            game.player.hp = Math.min(game.player.hp + regenAmount, game.player.maxHp);
        }

        // BLOOD FOR FUEL: Drain 1 HP/5s
        if (BoonSystem.hasBoon('blood_for_fuel')) {
            if (!game.player._bloodForFuelTimer) game.player._bloodForFuelTimer = 0;
            game.player._bloodForFuelTimer += deltaTime;
            if (game.player._bloodForFuelTimer >= 5) {
                game.player._bloodForFuelTimer = 0;
                game.player.hp = Math.max(1, game.player.hp - 1);
            }
        }

        // DARK PACT: Drain 1 HP/s when torch off
        if (BoonSystem.hasBoon('dark_pact') && !game.player.torchOn) {
            game.player.hp = Math.max(1, game.player.hp - deltaTime);
        }

        // IMMOLATION AURA: Self-burn + enemy burn
        if (BoonSystem.hasBoon('immolation_aura')) {
            game.player.hp = Math.max(1, game.player.hp - deltaTime);
            if (game.enemies) {
                const auraRadius = 2;
                for (const enemy of game.enemies) {
                    if (enemy.hp <= 0) continue;
                    const dist = Math.sqrt(
                        Math.pow(enemy.gridX - game.player.gridX, 2) +
                        Math.pow(enemy.gridY - game.player.gridY, 2)
                    );
                    if (dist <= auraRadius) enemy.hp -= 2 * deltaTime;
                }
            }
        }

        // PLAGUE BEARER: Constant Rot AoE
        if (BoonSystem.hasBoon('plague_bearer')) {
            if (game.enemies) {
                const auraRadius = 2;
                for (const enemy of game.enemies) {
                    if (enemy.hp <= 0) continue;
                    const dist = Math.sqrt(
                        Math.pow(enemy.gridX - game.player.gridX, 2) +
                        Math.pow(enemy.gridY - game.player.gridY, 2)
                    );
                    if (dist <= auraRadius && typeof applyStatusEffect === 'function') {
                        applyStatusEffect(enemy, 'rot', game.player);
                    }
                }
            }
        }

        // Clear expired speed buff
        if (game.player.boonBuffs?.executionersGait) {
            if (Date.now() > game.player.boonBuffs.executionersGait.expiresAt) {
                delete game.player.boonBuffs.executionersGait;
            }
        }
    }
};

// ############################################################################
// SECTION 8: ACTIVE COMBAT (Hotkeys 1-4, Tab Targeting)
// ############################################################################

// Handle attack hotkeys (1-4)
function handleActiveCombatHotkey(key, player) {
    if (!player || game.state !== 'playing') return;

    switch(key) {
        case 1: handleBaseAttack(player); break;
        case 2: handleSkillAttack(player); break;
        case 3: handleConsumable(player, 'slot3'); break;
        case 4: handleConsumable(player, 'slot4'); break;
    }
}

// Base Attack (Hotkey 1)
function handleBaseAttack(player) {
    if (player.gcd?.active) return;
    if (player.actionCooldowns?.baseAttack > 0) return;

    const target = player.combat?.currentTarget;
    if (!target || target.hp <= 0) {
        if (typeof addMessage === 'function') addMessage('No target selected!');
        return;
    }

    const weapon = player.equipped?.MAIN;
    const weaponType = getWeaponTypeForCombat(weapon);
    const range = weapon?.stats?.range || 1;
    const distance = getDistance(player, target);
    if (distance > range) return;

    switch(weaponType) {
        case 'melee': executeMeleeAttack(player, target, weapon, false); break;
        case 'ranged': executeRangedAttack(player, target, weapon, false); break;
        case 'magic': executeMagicAttack(player, target, weapon, false); break;
    }
}

// Skill Attack (Hotkey 2)
function handleSkillAttack(player) {
    if (player.gcd?.active) return;
    if (player.actionCooldowns?.skillAttack > 0) return;

    const target = player.combat?.currentTarget;
    if (!target || target.hp <= 0) {
        if (typeof addMessage === 'function') addMessage('No target selected!');
        return;
    }

    const weapon = player.equipped?.MAIN;
    const weaponType = getWeaponTypeForCombat(weapon);
    const range = weapon?.stats?.range || 1;
    const distance = getDistance(player, target);
    if (distance > range) return;

    switch(weaponType) {
        case 'melee': executeMeleeAttack(player, target, weapon, true); break;
        case 'ranged': executeRangedAttack(player, target, weapon, true); break;
        case 'magic': executeMagicAttack(player, target, weapon, true); break;
    }
}

// Consumable Use (Hotkeys 3 & 4)
function handleConsumable(player, slot) {
    if (player.gcd?.active) return;

    const cooldownKey = slot === 'slot3' ? 'consumable3' : 'consumable4';
    if (player.actionCooldowns?.[cooldownKey] > 0) return;

    const itemId = player.assignedConsumables?.[slot];
    if (!itemId) {
        if (typeof addMessage === 'function') {
            addMessage(`No item assigned to hotkey ${slot === 'slot3' ? '3' : '4'}!`);
        }
        return;
    }

    if (player.itemCooldowns?.[itemId] > 0) return;

    const item = findItemInInventoryForCombat(player, itemId);
    if (!item || item.count <= 0) {
        if (typeof addMessage === 'function') addMessage(`Out of ${item?.name || 'item'}!`);
        player.assignedConsumables[slot] = null;
        return;
    }

    if (typeof useItem === 'function') {
        const result = useItem(player, itemId, item);
        if (result.success) {
            item.count--;
            if (item.count <= 0) {
                removeItemFromInventoryForCombat(player, itemId);
                player.assignedConsumables[slot] = null;
            }
            triggerGCDForCombat(player);
            player.actionCooldowns[cooldownKey] = 10;
            player.itemCooldowns[itemId] = 10;
            if (typeof addMessage === 'function') addMessage(result.message);
        }
    }
}

// Melee attack execution
function executeMeleeAttack(player, target, weapon, isSkill) {
    const result = typeof DamageCalculator !== 'undefined'
        ? DamageCalculator.calculateDamage(player, target, null)
        : { finalDamage: 10, isCrit: false, isHit: true };

    if (!result.isHit) {
        if (typeof addMessage === 'function') addMessage('You missed!');
        if (typeof showDamageNumber === 'function') showDamageNumber(target, 0, '#888888');
        triggerGCDForCombat(player);
        return;
    }

    let damage = isSkill ? Math.floor(result.finalDamage * 2) : result.finalDamage;
    if (typeof applyDamage === 'function') applyDamage(target, damage, player, result);
    else target.hp -= damage;

    const color = result.isCrit ? '#ffff00' : '#ff4444';
    if (typeof showDamageNumber === 'function') showDamageNumber(target, damage, color);

    if (typeof addMessage === 'function') {
        const attackName = isSkill ? 'skill attack' : 'attack';
        const critText = result.isCrit ? ' CRITICAL!' : '';
        addMessage(`You ${attackName} ${target.name} for ${damage} damage!${critText}`);
    }

    triggerGCDForCombat(player);
    if (isSkill) player.actionCooldowns.skillAttack = 10;
    else {
        const attackSpeed = weapon?.stats?.speed || player.combat?.attackSpeed || 1.0;
        player.actionCooldowns.baseAttack = attackSpeed;
    }

    if (target.hp <= 0 && typeof handleDeath === 'function') handleDeath(target, player);
}

// Ranged attack execution
function executeRangedAttack(player, target, weapon, isSkill) {
    const weaponType = weapon?.weaponType || 'bow';
    const result = typeof DamageCalculator !== 'undefined'
        ? DamageCalculator.calculateDamage(player, target, null)
        : { finalDamage: 10, isCrit: false, isHit: true };

    if (!result.isHit) {
        if (typeof addMessage === 'function') addMessage('You missed!');
        triggerGCDForCombat(player);
        return;
    }

    let damage = isSkill ? Math.floor(result.finalDamage * 2) : result.finalDamage;

    if (typeof createProjectile === 'function') {
        const speed = weaponType === 'crossbow' ? 10 : 6.7;
        createProjectile({
            x: player.gridX, y: player.gridY,
            targetX: target.gridX, targetY: target.gridY,
            speed: speed, damage: damage,
            element: weapon?.element || 'physical',
            attacker: player, target: target,
            isSkill: isSkill, isCrit: result.isCrit
        });
    } else {
        if (typeof applyDamage === 'function') applyDamage(target, damage, player, result);
        else target.hp -= damage;
        const color = result.isCrit ? '#ffff00' : '#ff4444';
        if (typeof showDamageNumber === 'function') showDamageNumber(target, damage, color);
    }

    triggerGCDForCombat(player);
    if (isSkill) player.actionCooldowns.skillAttack = 10;
    else {
        const attackSpeed = weapon?.stats?.speed || 1.0;
        player.actionCooldowns.baseAttack = attackSpeed;
    }

    if (typeof addMessage === 'function') {
        const attackName = isSkill ? 'skill shot' : 'shot';
        addMessage(`You ${attackName} ${target.name}!`);
    }
}

// Magic attack execution
function executeMagicAttack(player, target, weapon, isSkill) {
    const element = weapon?.element || 'arcane';
    const elementConfig = MAGIC_CONFIG[element] || MAGIC_CONFIG.arcane;

    if (player.mp < elementConfig.manaCost) {
        executeNoManaAttack(player, target);
        return;
    }

    player.mp -= elementConfig.manaCost;

    const result = typeof DamageCalculator !== 'undefined'
        ? DamageCalculator.calculateDamage(player, target, null)
        : { finalDamage: 10, isCrit: false, isHit: true };

    if (!result.isHit) {
        if (typeof addMessage === 'function') addMessage('Your spell missed!');
        triggerGCDForCombat(player);
        return;
    }

    let damage = isSkill ? Math.floor(result.finalDamage * 2) : result.finalDamage;

    if (typeof createProjectile === 'function') {
        createProjectile({
            x: player.gridX, y: player.gridY,
            targetX: target.gridX, targetY: target.gridY,
            speed: 6.7, damage: damage, element: element,
            attacker: player, target: target,
            isMagic: true, isSkill: isSkill, isCrit: result.isCrit,
            elementConfig: elementConfig
        });
    } else {
        if (typeof applyDamage === 'function') applyDamage(target, damage, player, result);
        else target.hp -= damage;
        const color = result.isCrit ? '#ffff00' : '#00ffff';
        if (typeof showDamageNumber === 'function') showDamageNumber(target, damage, color);
        applyMagicEffectsInternal(player, target, element, elementConfig, damage);
    }

    triggerGCDForCombat(player);
    if (isSkill) player.actionCooldowns.skillAttack = 10;
    else player.actionCooldowns.baseAttack = elementConfig.cooldown;

    if (typeof addMessage === 'function') {
        const attackName = isSkill ? `${element} blast` : `${element} bolt`;
        addMessage(`You cast ${attackName} at ${target.name}!`);
    }
}

// No-mana physical attack (weak punch)
function executeNoManaAttack(player, target) {
    const str = player.stats?.STR || 10;
    const damage = Math.floor(5 + (str * 0.3));

    if (typeof applyDamage === 'function') applyDamage(target, damage, player);
    else target.hp -= damage;

    if (typeof showDamageNumber === 'function') showDamageNumber(target, damage, '#888888');
    if (typeof addMessage === 'function') {
        addMessage(`Out of mana! You punch ${target.name} for ${damage} damage!`);
    }

    triggerGCDForCombat(player);
    player.actionCooldowns.baseAttack = 1.0;
}

// Apply magic status effects (burn/freeze/lifesteal)
function applyMagicEffectsInternal(player, target, element, elementConfig, damage) {
    if (typeof applyStatusEffect !== 'function') return;

    if (element === 'fire' && elementConfig.burnChance) {
        if (Math.random() < elementConfig.burnChance) {
            applyStatusEffect(target, {
                type: 'burn', damage: elementConfig.burnDamage,
                ticks: elementConfig.burnDuration, interval: 1000, source: player
            });
            if (typeof addMessage === 'function') addMessage(`${target.name} is burning!`);
        }
    }

    if (element === 'ice' && elementConfig.freezeChance) {
        if (Math.random() < elementConfig.freezeChance) {
            applyStatusEffect(target, {
                type: 'freeze', duration: elementConfig.freezeDuration * 1000, source: player
            });
            if (typeof addMessage === 'function') addMessage(`${target.name} is frozen!`);
        }
    }

    if (element === 'necromancy' && elementConfig.lifestealPercent && damage) {
        const heal = Math.floor(damage * elementConfig.lifestealPercent);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        if (typeof addMessage === 'function') addMessage(`Drained ${heal} HP!`);
    }
}

// Helper: Get weapon type for combat
function getWeaponTypeForCombat(weapon) {
    if (!weapon) return 'melee';
    const weaponType = weapon.weaponType || weapon.damageType;
    if (['staff', 'wand', 'tome'].includes(weaponType)) return 'magic';
    if (['bow', 'crossbow', 'throwing'].includes(weaponType)) return 'ranged';
    return 'melee';
}

// Helper: Trigger GCD
function triggerGCDForCombat(player) {
    if (!player.gcd) return;
    player.gcd.active = true;
    player.gcd.remaining = player.gcd.duration;
}

// Helper: Find item in inventory
function findItemInInventoryForCombat(player, itemId) {
    if (!player.inventory) return null;
    return player.inventory.find(item => item.id === itemId || item.name === itemId);
}

// Helper: Remove item from inventory
function removeItemFromInventoryForCombat(player, itemId) {
    if (!player.inventory) return;
    const index = player.inventory.findIndex(item => item.id === itemId || item.name === itemId);
    if (index !== -1) player.inventory.splice(index, 1);
}

// Tab Targeting
function handleTabTargeting(player) {
    if (!player || !game.enemies || game.enemies.length === 0) return;

    const currentTarget = player.combat?.currentTarget;
    let validEnemies = game.enemies.filter(enemy => enemy.hp > 0);
    if (validEnemies.length === 0) return;

    const enemiesWithAngles = validEnemies.map(enemy => {
        const dx = enemy.gridX - player.gridX;
        const dy = enemy.gridY - player.gridY;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        return { enemy, angle };
    });

    enemiesWithAngles.sort((a, b) => a.angle - b.angle);

    let currentIndex = -1;
    if (currentTarget) {
        currentIndex = enemiesWithAngles.findIndex(e => e.enemy === currentTarget);
    }

    const nextIndex = (currentIndex + 1) % enemiesWithAngles.length;
    const nextTarget = enemiesWithAngles[nextIndex].enemy;

    if (typeof engageCombat === 'function') engageCombat(player, nextTarget);
    else {
        player.combat.currentTarget = nextTarget;
        player.combat.isInCombat = true;
    }

    if (typeof addMessage === 'function') addMessage(`Targeting ${nextTarget.name}`);
}

// ############################################################################
// SECTION 9-10: REMAINING SYSTEMS (Loaded from separate files)
// ############################################################################
// The following systems remain in their original files for this phase:
// - mouse-attack-system.js (2099 lines) - Mouse click attacks, weapon arcs, combo system
// - skills-combat-integration.js (1086 lines) - Skills-combat bridge, XP awards
//
// These can be consolidated in a future update.

// ############################################################################
// SECTION 11: EXPORTS & REGISTRATION
// ############################################################################

// Export all functions and objects to window for global access
if (typeof window !== 'undefined') {
    // Configuration exports
    window.COMBAT_CONFIG = COMBAT_CONFIG;
    window.AMBUSH_CONFIG = AMBUSH_CONFIG;
    window.COMBAT_ENHANCEMENTS_CONFIG = COMBAT_ENHANCEMENTS_CONFIG;
    window.WEAPON_ARC_CONFIG = WEAPON_ARC_CONFIG;
    window.DEFAULT_ARC_CONFIG = DEFAULT_ARC_CONFIG;
    window.MAGIC_CONFIG = MAGIC_CONFIG;

    // Damage Calculator exports
    window.DamageCalculator = DamageCalculator;
    window.calculateDamageSimple = calculateDamageSimple;
    window.calculateDamageWithRoom = calculateDamageWithRoom;
    window.getDamagePreview = getDamagePreview;

    // Status Effect exports
    window.StatusEffectSystem = StatusEffectSystem;
    window.applyStatusEffect = applyStatusEffect;
    window.removeStatusEffect = removeStatusEffect;
    window.hasStatusEffect = hasStatusEffect;
    window.isEntityCC = isEntityCC;
    window.canEntityAct = canEntityAct;
    window.canEntityMove = canEntityMove;
    window.getStatusEffects = getStatusEffects;
    window.clearStatusEffects = clearStatusEffects;

    // Projectile exports
    window.projectiles = projectiles;
    window.createProjectile = createProjectile;
    window.updateProjectiles = updateProjectiles;
    window.renderProjectiles = renderProjectiles;
    window.checkLineOfSight = checkLineOfSight;
    window.clearProjectiles = clearProjectiles;
    window.checkProjectileCollision = checkProjectileCollision;

    // Core Combat Loop exports
    window.updateCombat = updateCombat;
    window.updateEntityCombat = updateEntityCombat;
    window.engageCombat = engageCombat;
    window.disengageCombat = disengageCombat;
    window.performAttack = performAttack;
    window.applyDamage = applyDamage;
    window.handleDeath = handleDeath;
    window.canAttackTarget = canAttackTarget;
    window.getDistance = getDistance;
    window.getCurrentRoom = getCurrentRoom;
    window.getAttackAnimationState = getAttackAnimationState;
    window.checkAmbush = checkAmbush;

    // Damage Numbers exports
    window.damageNumbers = damageNumbers;
    window.showDamageNumber = showDamageNumber;
    window.updateDamageNumbers = updateDamageNumbers;
    window.renderDamageNumbers = renderDamageNumbers;
    window.COMBAT_TEXT_COLORS = COMBAT_TEXT_COLORS;

    // Combat Enhancements exports (Section 6)
    window.dashState = dashState;
    window.screenShakeState = screenShakeState;
    window.performDash = performDash;
    window.createDashGhosts = createDashGhosts;
    window.updateDash = updateDash;
    window.playerHasIframes = playerHasIframes;
    window.playerIsDashing = playerIsDashing;
    window.getDashCooldown = getDashCooldown;
    window.applyKnockback = applyKnockback;
    window.getKnockbackDistance = getKnockbackDistance;
    window.triggerScreenShake = triggerScreenShake;
    window.updateScreenShake = updateScreenShake;
    window.getScreenShakeOffset = getScreenShakeOffset;
    window.applyStagger = applyStagger;
    window.updateStagger = updateStagger;
    window.isEnemyStaggered = isEnemyStaggered;
    window.getEnemyStaggerFlash = getEnemyStaggerFlash;
    window.onCombatHit = onCombatHit;

    // Boon Combat Integration exports (Section 7)
    window.BoonCombatIntegration = BoonCombatIntegration;

    // Active Combat exports (Section 8)
    window.handleActiveCombatHotkey = handleActiveCombatHotkey;
    window.handleBaseAttack = handleBaseAttack;
    window.handleSkillAttack = handleSkillAttack;
    window.handleConsumable = handleConsumable;
    window.handleTabTargeting = handleTabTargeting;
    window.executeMeleeAttack = executeMeleeAttack;
    window.executeRangedAttack = executeRangedAttack;
    window.executeMagicAttack = executeMagicAttack;
    window.executeNoManaAttack = executeNoManaAttack;
}

// Initialize Status Effect System
if (typeof StatusEffectSystem !== 'undefined') {
    StatusEffectSystem.init();
}

console.log('Combat Master loaded (Sections 1-8: Core, enhancements, boons, hotkeys)');
