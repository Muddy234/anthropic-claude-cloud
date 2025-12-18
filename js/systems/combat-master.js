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
// SECTION 6-10: ADDITIONAL SYSTEMS (Loaded from separate files)
// ############################################################################
// The following systems remain in their original files for this phase:
// - mouse-attack-system.js (2099 lines) - Mouse click attacks, weapon arcs, combo system
// - active-combat.js (650 lines) - Hotkey combat (1-4), Tab targeting
// - combat-enhancements.js (744 lines) - Dash, knockback, screen shake, stagger
// - skills-combat-integration.js (1086 lines) - Skills-combat bridge, XP awards
// - boon-combat-integration.js (557 lines) - Boon on-hit/on-kill effects
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
}

// Initialize Status Effect System
if (typeof StatusEffectSystem !== 'undefined') {
    StatusEffectSystem.init();
}

console.log('Combat Master loaded (Sections 1-5, 11: Core systems consolidated)');
