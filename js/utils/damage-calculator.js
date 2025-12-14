// ============================================================================
// DAMAGE CALCULATOR - 2-Layer Damage System
// ============================================================================
// Layer 1: Weapon Type vs Armor Type (±30%)
// Layer 2: Element vs Element (±30%)
// ============================================================================

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

        // Step 8: Calculate final damage
        let damage = result.baseDamage;

        // Apply weapon vs armor
        damage *= result.breakdown.weaponArmorMod;

        // Apply element vs element
        damage *= result.breakdown.elementMod;

        // Apply defense
        damage *= result.breakdown.defenseMod;

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
        // Uses same scaling ratios as player weapons:
        // - Physical melee: STR / 5
        // - Physical ranged: AGI / 5
        // - Magic: INT / 3
        const attackType = attacker.attackType || 'physical';
        const attackRange = attacker.attackRange || 1;

        let stat, scalingDivisor;

        if (attackType === 'magic') {
            // Magic attacks: INT scaling (same as player staff/wand/tome)
            stat = attacker.int || attacker.stats?.INT || attacker.stats?.int || 10;
            scalingDivisor = 3;  // INT / 3 (higher scaling for magic)
        } else if (attackRange > 1) {
            // Physical ranged: AGI scaling (same as player bow/crossbow)
            stat = attacker.agi || attacker.stats?.AGI || attacker.stats?.agi || 10;
            scalingDivisor = 5;  // AGI / 5
        } else {
            // Physical melee: STR scaling (same as player melee weapons)
            stat = attacker.str || attacker.stats?.STR || attacker.stats?.str || 10;
            scalingDivisor = 5;  // STR / 5
        }

        // Base damage from stat (50% of stat) + scaling bonus (matches player formula)
        const baseDamage = Math.floor(stat * 0.5);
        const scalingBonus = Math.floor(stat / scalingDivisor);

        return baseDamage + scalingBonus;
    },

    getStatBonus(attacker, weapon) {
        // Determine scaling stat based on weapon type
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
        
        // Check monster data
        if (attacker.damageType) return attacker.damageType;
        
        // Default to blunt (unarmed)
        return 'blunt';
    },

    getArmorType(defender) {
        // Check equipped armor (use chest as primary)
        const chest = defender.equipped?.CHEST;
        if (chest?.armorType) return chest.armorType;
        
        // Check monster armor type
        if (defender.armorType) return defender.armorType;
        
        // Default
        return 'unarmored';
    },

    getWeaponArmorModifier(weaponType, armorType) {
        // Use global matrix if available
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
    // LAYER 2: ELEMENT VS ELEMENT
    // ========================================================================

    getAttackElement(attacker) {
        // Check weapon element
        const weapon = attacker.equipped?.MAIN;
        if (weapon?.element) return weapon.element;
        
        // Check entity element
        if (attacker.element) return attacker.element;
        
        return 'physical';
    },

    getDefendElement(defender) {
        if (defender.element) return defender.element;
        return 'physical';
    },

    getElementModifier(attackElement, defendElement) {
        // Use global matrix if available
        if (typeof ELEMENT_MATRIX !== 'undefined') {
            const row = ELEMENT_MATRIX[attackElement];
            if (row && row[defendElement] !== undefined) {
                return 1.0 + row[defendElement];
            }
        }
        
        // Use global function if available
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
        
        // Physical vs magical defense
        if (damageType === 'blade' || damageType === 'blunt' || damageType === 'pierce') {
            defense = defender.pDef || defender.stats?.pDef || 0;
        } else {
            defense = defender.mDef || defender.stats?.mDef || 0;
        }
        
        // Add armor defense
        const slots = ['HEAD', 'CHEST', 'LEGS', 'FEET'];
        for (const slot of slots) {
            const armor = defender.equipped?.[slot];
            if (armor?.stats?.defense) {
                defense += armor.stats.defense;
            }
        }
        
        return defense;
    },

    calculateDefenseReduction(defense) {
        // Each point of defense reduces damage by config.defenseScaling
        const reduction = defense * this.config.defenseScaling;
        const capped = Math.min(reduction, this.config.maxDefenseReduction);
        return 1.0 - capped;
    },

    // ========================================================================
    // HIT & CRIT
    // ========================================================================

    rollHit(attacker, defender) {
        let hitChance = 0.90; // 90% base
        
        // Attacker accuracy from AGI
        const attackerAgi = attacker.stats?.AGI || attacker.stats?.agi || 10;
        hitChance += attackerAgi * 0.002; // +0.2% per AGI
        
        // Defender evasion from AGI
        const defenderAgi = defender.stats?.AGI || defender.stats?.agi || 10;
        hitChance -= defenderAgi * 0.002; // -0.2% per AGI
        
        // Clamp
        hitChance = Math.max(0.50, Math.min(0.98, hitChance));
        
        return Math.random() < hitChance;
    },

    rollCrit(attacker) {
        let critChance = this.config.baseCritChance;

        // Bonus from AGI
        const agi = attacker.stats?.AGI || attacker.stats?.agi || 10;
        critChance += agi * 0.001; // +0.1% per AGI

        // Weapon crit bonus (from special property)
        const weapon = attacker.equipped?.MAIN;
        if (weapon?.special?.critBonus) {
            critChance += weapon.special.critBonus;
        }

        // Pierce weapons get base crit bonus (+7%)
        if (weapon?.damageType === 'pierce') {
            critChance += this.config.pierceCritBonus;
        }

        // Cap at 50%
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
        console.log(`  Crit: x${result.breakdown.critMod.toFixed(2)}`);
        console.log(`  Variance: x${result.breakdown.variance.toFixed(2)}`);
        console.log(`  FINAL: ${result.finalDamage} ${result.messages.join(' ')}`);
    }
};

// ============================================================================
// HELPER FUNCTIONS (Global)
// ============================================================================

/**
 * Quick damage calculation for simple cases
 */
function calculateDamageSimple(attacker, defender) {
    const result = DamageCalculator.calculateDamage(attacker, defender, null);
    return result.finalDamage;
}

/**
 * Calculate damage with room context
 */
function calculateDamageWithRoom(attacker, defender, room) {
    return DamageCalculator.calculateDamage(attacker, defender, room);
}

/**
 * Get damage preview (for UI tooltips)
 */
function getDamagePreview(attacker, defender, room = null) {
    // Temporarily disable variance and crit for preview
    const oldVariance = DamageCalculator.config.baseVariance;
    DamageCalculator.config.baseVariance = 0;
    
    const result = DamageCalculator.calculateDamage(attacker, defender, room);
    result.breakdown.critMod = 1.0;
    
    // Restore
    DamageCalculator.config.baseVariance = oldVariance;
    
    // Recalculate without variance/crit
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

// ============================================================================
// EXPORTS
// ============================================================================

window.DamageCalculator = DamageCalculator;
window.calculateDamageSimple = calculateDamageSimple;
window.calculateDamageWithRoom = calculateDamageWithRoom;
window.getDamagePreview = getDamagePreview;

console.log('[DamageCalculator] 2-layer damage system loaded');