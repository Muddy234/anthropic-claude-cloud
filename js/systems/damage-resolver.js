// ============================================================================
// DAMAGE RESOLVER - The Shifting Chasm
// ============================================================================
// Pure damage calculation pipeline extracted from CombatMaster.
// Input: attacker stats, defender stats, damage type, context
// Output: { finalDamage, isCrit, damageType, resistanceApplied, rawDamage }
//
// This module provides the canonical damage math. CombatMaster delegates to
// DamageResolver.calculate() when available; otherwise it falls back to its
// own inline DamageCalculator. Loading order: damage-resolver.js loads BEFORE
// combat-master.js (see index.html).
// ============================================================================

const DamageResolver = {
    // ========================================================================
    // CONFIGURATION (mirrors DamageCalculator.config defaults)
    // ========================================================================
    config: {
        baseVariance: 0.10,          // 10% damage variance for combat feel
        minDamage: 1,                // Minimum damage floor
        critMultiplier: 2.5,         // Critical hit multiplier
        baseCritChance: 0.05,        // 5% base crit chance
        pierceCritBonus: 0.07,       // +7% crit for pierce weapons
        defenseScaling: 0.015,       // 1.5% per defense point
        maxDefenseReduction: 0.75,   // Cap at 75%
        missChance: 0.08,            // 8% enemy miss chance (base)
    },

    // ========================================================================
    // MAIN ENTRY POINT
    // ========================================================================

    /**
     * Calculate damage from attacker to defender.
     * @param {Object} attacker - Entity with stats (str, damage, critChance, etc.)
     * @param {Object} defender - Entity with stats (pDef, mDef, resistances, etc.)
     * @param {Object} options - { damageType, isSpell, weaponData, bonusDamage, forceCrit }
     * @returns {Object} { finalDamage, isCrit, damageType, resistanceApplied, rawDamage }
     */
    calculate(attacker, defender, options = {}) {
        const result = {
            finalDamage: 0,
            rawDamage: 0,
            isCrit: false,
            isHit: true,
            damageType: 'physical',
            resistanceApplied: 0,
            breakdown: {
                weaponArmorMod: 1.0,
                elementMod: 1.0,
                defenseMod: 1.0,
                critMod: 1.0,
                variance: 1.0,
                socialMod: 1.0,
                skillMod: 1.0,
                skillDefenseMod: 1.0,
            },
            messages: []
        };

        // Step 1: Hit check
        if (!this.rollHit(attacker, defender)) {
            result.isHit = false;
            result.messages.push('MISS');
            return result;
        }

        // Step 2: Raw / base damage
        result.rawDamage = this.getBaseDamage(attacker);

        // Step 3: Weapon vs Armor (Layer 1)
        const weaponType = this.getWeaponDamageType(attacker);
        const armorType = this.getArmorType(defender);
        result.damageType = weaponType;
        result.breakdown.weaponArmorMod = this.getWeaponArmorModifier(weaponType, armorType);

        // Step 4: Element vs Element (Layer 2)
        const attackElement = this.getAttackElement(attacker);
        const defendElement = this.getDefendElement(defender);
        result.breakdown.elementMod = this.getElementModifier(attackElement, defendElement);

        // Step 5: Defense reduction
        const defense = this.getDefense(defender, weaponType);
        result.breakdown.defenseMod = this.applyDefense(defense);
        result.resistanceApplied = 1.0 - result.breakdown.defenseMod;

        // Step 6: Critical hit
        if (options.forceCrit || this.rollCrit(attacker)) {
            result.isCrit = true;
            result.breakdown.critMod = this.config.critMultiplier;
            result.messages.push('CRITICAL');
        }

        // Step 7: Variance
        result.breakdown.variance = 1 - this.config.baseVariance +
            (Math.random() * this.config.baseVariance * 2);

        // Step 8: Social bonuses (packs/swarms)
        if (typeof MonsterSocialSystem !== 'undefined' && (attacker.packId || attacker.swarmId)) {
            const bonuses = MonsterSocialSystem.getAllBonuses(attacker);
            result.breakdown.socialMod = 1.0 + (bonuses.damage || 0);
            if (bonuses.damage > 0) {
                result.messages.push(`Pack bonus +${Math.round(bonuses.damage * 100)}%`);
            }
        }

        // Step 9: Soul & Body skill multiplier (player attacks only)
        if (typeof game !== 'undefined' && attacker === game.player &&
            typeof getSkillDamageMultiplier === 'function') {
            const weapon = attacker.equipped?.MAIN;
            const wpnType = weapon?.weaponType || weapon?.damageType || 'unarmed';
            const atkType = this.getAttackElement(attacker);

            let proficiencyType = 'melee';
            if (['bow', 'crossbow', 'throwing'].includes(wpnType)) {
                proficiencyType = 'ranged';
            } else if (['staff', 'wand', 'tome'].includes(wpnType) || atkType !== 'physical') {
                proficiencyType = 'magic';
            }

            result.breakdown.skillMod = getSkillDamageMultiplier(attacker, proficiencyType);
            result.breakdown.proficiencyType = proficiencyType;

            if (result.breakdown.skillMod > 1.01) {
                result.messages.push(`Skill x${result.breakdown.skillMod.toFixed(2)}`);
            }
        }

        // Step 10: Soul & Body defense reduction (player is defender)
        if (typeof game !== 'undefined' && defender === game.player &&
            typeof getDefenseDamageReduction === 'function') {
            const defenseReduction = getDefenseDamageReduction(defender);
            result.breakdown.skillDefenseMod = 1.0 - defenseReduction;
            if (defenseReduction > 0.01) {
                result.messages.push(`Defense skill -${Math.round(defenseReduction * 100)}%`);
            }
        }

        // Step 11: Final multiplication chain
        let damage = result.rawDamage;
        damage *= result.breakdown.weaponArmorMod;
        damage *= result.breakdown.elementMod;
        damage *= result.breakdown.defenseMod;
        damage *= result.breakdown.socialMod;
        damage *= result.breakdown.skillMod;
        damage *= result.breakdown.skillDefenseMod;
        damage *= result.breakdown.critMod;
        damage *= result.breakdown.variance;

        // Floor and minimum
        result.finalDamage = Math.max(this.config.minDamage, Math.floor(damage));

        // Informational messages
        if (result.breakdown.weaponArmorMod > 1.0) result.messages.push('Armor weakness!');
        if (result.breakdown.weaponArmorMod < 1.0) result.messages.push('Armor resists...');
        if (result.breakdown.elementMod > 1.0) result.messages.push('Super effective!');
        if (result.breakdown.elementMod < 1.0) result.messages.push('Not very effective...');

        return result;
    },

    // ========================================================================
    // DEFENSE
    // ========================================================================

    /**
     * Apply defense reduction.
     * Returns a multiplier in [0.25, 1.0] (lower = more reduction).
     * @param {number} defense - Total defense value
     * @returns {number} Damage multiplier after defense
     */
    applyDefense(defense) {
        const reduction = defense * this.config.defenseScaling;
        const capped = Math.min(reduction, this.config.maxDefenseReduction);
        return 1.0 - capped;
    },

    // ========================================================================
    // CRIT
    // ========================================================================

    /**
     * Check for critical hit.
     * @param {Object} attacker - Entity with stats and equipped weapon
     * @returns {boolean} true if crit
     */
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
    // RESISTANCE / ELEMENT
    // ========================================================================

    /**
     * Apply elemental resistance.
     * @param {number} damage - Incoming damage
     * @param {Object} defender - Defending entity
     * @param {string} element - Attack element
     * @returns {number} Damage after resistance
     */
    applyResistance(damage, defender, element) {
        const defendElement = this.getDefendElement(defender);
        const mod = this.getElementModifier(element, defendElement);
        return Math.floor(damage * mod);
    },

    // ========================================================================
    // HELPER: BASE DAMAGE
    // ========================================================================

    getBaseDamage(attacker) {
        const weapon = attacker.equipped?.MAIN;

        if (weapon && weapon.stats?.damage) {
            const baseDmg = weapon.stats.damage;
            const statBonus = this.getStatBonus(attacker, weapon);
            return baseDmg + statBonus;
        }

        // Monster / unarmed damage
        const attackType = attacker.attackType || 'physical';
        const attackRange = attacker.combat?.attackRange || attacker.attackRange || 1;

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

        const statValue = attacker.stats?.[scalingStat] ||
                          attacker.stats?.[scalingStat.toLowerCase()] || 10;
        return Math.floor(statValue * 0.5);
    },

    // ========================================================================
    // HELPER: WEAPON vs ARMOR
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

        // Fallback matrix
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
    // HELPER: ELEMENT vs ELEMENT
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
    // HELPER: DEFENSE VALUE
    // ========================================================================

    getDefense(defender, damageType) {
        let defense = 0;

        if (damageType === 'blade' || damageType === 'blunt' || damageType === 'pierce') {
            defense = defender.pDef || defender.stats?.pDef || 0;
        } else {
            defense = defender.mDef || defender.stats?.mDef || 0;
        }

        // Equipped armor defense
        const slots = ['HEAD', 'CHEST', 'LEGS', 'FEET'];
        for (const slot of slots) {
            const armor = defender.equipped?.[slot];
            if (armor?.stats?.defense) {
                defense += armor.stats.defense;
            }
        }

        // Boon armor reduction
        if (typeof BoonCombatIntegration !== 'undefined') {
            const armorMod = BoonCombatIntegration.getArmorModifier(defender);
            defense = Math.floor(defense * armorMod);
        }

        // Status effect armor modifier
        if (typeof StatusEffectSystem !== 'undefined') {
            const armorMod = StatusEffectSystem.getStatModifier(defender, 'armor');
            if (armorMod !== 0) {
                defense = Math.floor(defense * (1 + armorMod));
            }
        }

        return Math.max(0, defense);
    },

    // ========================================================================
    // HELPER: HIT CHECK
    // ========================================================================

    rollHit(attacker, defender) {
        // Player attacks always hit (deterministic, action-roguelike feel)
        if (typeof game !== 'undefined' && attacker === game.player) {
            return true;
        }

        // Enemy attacks can miss based on player evasion
        let hitChance = 0.90;

        const attackerAgi = attacker.stats?.AGI || attacker.stats?.agi || 10;
        hitChance += attackerAgi * 0.002;

        const defenderAgi = defender.stats?.AGI || defender.stats?.agi || 10;
        hitChance -= defenderAgi * 0.003;

        if (typeof MonsterSocialSystem !== 'undefined' && defender.swarmId) {
            const bonuses = MonsterSocialSystem.getAllBonuses(defender);
            hitChance -= bonuses.evasion || 0;
        }

        hitChance = Math.max(0.50, Math.min(0.95, hitChance));

        return Math.random() < hitChance;
    },
};

// ============================================================================
// EXPORTS
// ============================================================================
window.DamageResolver = DamageResolver;
console.log('[DamageResolver] Damage resolver loaded');
