// ============================================================================
// DAMAGE CALCULATOR - Multi-Layer Damage System
// ============================================================================
// Damage Pipeline:
//   Base Weapon Damage
//   × Stat Multiplier (1 + STR × 0.03 for melee, etc.)
//   × Skill Multiplier (1 + profLevel × 0.05 + specLevel × 0.05) [ADDITIVE, max 4.0x]
//   × Weapon/Armor Modifier (±30%)
//   × Element Modifier (±30%)
//   × Critical Multiplier (2.5x if crit)
//   × Social Modifier (pack/swarm bonuses)
//   - Defense (equipment armor only, no proficiency-based defense)
//   × Variance (0.90 to 1.10)
//
// NOTE: Defense proficiency has been REMOVED. Defense is now equipment-only.
// ============================================================================

const DamageCalculator = {
    // Configuration
    config: {
        baseVariance: 0.10,          // 10% damage variance (0.90x to 1.10x)
        minDamage: 1,                // Minimum damage floor
        critMultiplier: 2.5,         // Critical hit multiplier (was 1.5, buffed for balance)
        baseCritChance: 0.05,        // 5% base crit chance
        pierceCritBonus: 0.07,       // +7% crit chance for pierce weapons
        defenseScaling: 0.005,       // Defense reduces damage by 0.5% per point (new formula)
        // NOTE: No cap on defense reduction (design constraint: equipment shouldn't exceed 134 total defense = 67% reduction)
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

        // Step 9: Skill multiplier (for player attacks only)
        // NEW ADDITIVE FORMULA: 1 + (profLevel × 0.05) + (specLevel × 0.05)
        // Max: 1 + (30 × 0.05) + (30 × 0.05) = 4.0x
        result.breakdown.skillMod = 1.0;
        if (attacker === game.player) {
            const weapon = attacker.equipped?.MAIN;
            const weaponType = weapon?.weaponType || weapon?.damageType || 'unarmed';
            const attackType = this.getAttackElement(attacker);

            // Determine proficiency type based on weapon/attack type
            let proficiencyType = 'melee';
            if (['bow', 'crossbow', 'throwing'].includes(weaponType)) {
                proficiencyType = 'ranged';
            } else if (['staff', 'wand', 'tome'].includes(weaponType) || attackType !== 'physical') {
                proficiencyType = 'magic';
            }

            // Get specialty from weapon
            const specialty = weapon?.specialty || weaponType;

            // Use external function if available, otherwise calculate inline
            if (typeof getSkillDamageMultiplier === 'function') {
                // Pass specialty level if the function supports it
                const specLevel = attacker.skills?.specialties?.[specialty]?.level || 0;
                result.breakdown.skillMod = getSkillDamageMultiplier(attacker, proficiencyType, specLevel);
            } else {
                // Inline additive calculation
                const profLevel = attacker.skills?.proficiencies?.[proficiencyType]?.level || 0;
                const specLevel = attacker.skills?.specialties?.[specialty]?.level || 0;
                const profBonus = profLevel * 0.05;  // +5% per proficiency level
                const specBonus = specLevel * 0.05;  // +5% per specialty level
                result.breakdown.skillMod = 1 + profBonus + specBonus;
            }

            result.breakdown.proficiencyType = proficiencyType;
            result.breakdown.specialty = specialty;

            if (result.breakdown.skillMod > 1.01) {
                result.messages.push(`Skill x${result.breakdown.skillMod.toFixed(2)}`);
            }
        }

        // NOTE: Defense proficiency has been REMOVED from the skill system.
        // Defense is now equipment-only (armor stat on gear).
        // The skillDefenseMod multiplier is no longer applied.

        // Step 10: Calculate final damage
        // NEW DAMAGE PIPELINE:
        //   Final Damage =
        //     Base Weapon Damage
        //     × Stat Multiplier (already included in baseDamage via getStatBonus)
        //     × Skill Multiplier (1 + profLevel × 0.05 + specLevel × 0.05)
        //     × Weapon/Armor Modifier (±30%)
        //     × Elemental Modifier (±30%)
        //     × Critical Multiplier (1.5x if crit) -- Note: currently 2.5x in config
        //     × Social Modifier (pack/swarm bonuses)
        //     - Defense (equipment armor with penetration)
        //     × Variance (0.95 to 1.05)

        let damage = result.baseDamage;

        // Apply skill multiplier (additive formula: 1 + prof*0.05 + spec*0.05)
        damage *= result.breakdown.skillMod;

        // Apply weapon vs armor type modifier
        damage *= result.breakdown.weaponArmorMod;

        // Apply element vs element modifier
        damage *= result.breakdown.elementMod;

        // Apply social bonus (pack/swarm)
        damage *= result.breakdown.socialMod;

        // Apply critical hit multiplier
        damage *= result.breakdown.critMod;

        // Apply defense reduction (equipment-only armor, no proficiency-based defense)
        damage *= result.breakdown.defenseMod;

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
        const attackRange = attacker.combat?.attackRange || attacker.attackRange || 1;

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
        // Use global matrix if available (now returns multiplier directly: 0.7, 1.0, or 1.3)
        if (typeof WEAPON_ARMOR_MATRIX !== 'undefined') {
            const row = WEAPON_ARMOR_MATRIX[weaponType];
            if (row && row[armorType] !== undefined) {
                return row[armorType];
            }
        }

        // Fallback matrix (multiplier-based: 0.7 = weak, 1.0 = neutral, 1.3 = strong)
        const fallbackMatrix = {
            blade:  { unarmored: 1.3, cloth: 1.3, hide: 1.0, scaled: 1.0, armored: 0.7, stone: 0.7, bone: 1.0, ethereal: 1.0 },
            blunt:  { unarmored: 1.0, cloth: 1.0, hide: 1.0, scaled: 1.0, armored: 1.3, stone: 1.3, bone: 1.3, ethereal: 0.7 },
            pierce: { unarmored: 1.0, cloth: 1.3, hide: 1.3, scaled: 1.3, armored: 0.7, stone: 0.7, bone: 1.0, ethereal: 1.3 },
            magic:  { unarmored: 1.3, cloth: 1.0, hide: 1.0, scaled: 1.0, armored: 1.3, stone: 1.3, bone: 1.0, ethereal: 0.7 },
        };

        const row = fallbackMatrix[weaponType];
        if (row && row[armorType] !== undefined) {
            return row[armorType];
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
        // Defense is now EQUIPMENT-ONLY (no proficiency-based pDef/mDef)
        // All damage mitigation comes from gear:
        // - Armor stat on equipment -> flat damage reduction
        // - Shield items -> block chance (handled separately)
        let defense = 0;

        // Sum armor defense from all equipped armor pieces
        const slots = ['HEAD', 'CHEST', 'LEGS', 'FEET'];
        for (const slot of slots) {
            const armor = defender.equipped?.[slot];
            if (armor?.stats?.defense) {
                defense += armor.stats.defense;
            }
            if (armor?.stats?.armor) {
                defense += armor.stats.armor;
            }
        }

        // For monsters, use their base armor stat if defined
        if (defender.armor) {
            defense += defender.armor;
        }
        if (defender.stats?.armor) {
            defense += defender.stats.armor;
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
        // Each point of defense reduces damage by 0.5% (config.defenseScaling)
        // NEW FORMULA: damage * (1 - defense * 0.005) with NO CAP
        // Design constraint: equipment shouldn't exceed 134 total defense = 67% reduction
        const reduction = defense * this.config.defenseScaling;
        return 1.0 - reduction;
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

        // Swarm evasion bonus (for enemies in swarms)
        if (typeof MonsterSocialSystem !== 'undefined' && defender.swarmId) {
            const bonuses = MonsterSocialSystem.getAllBonuses(defender);
            hitChance -= bonuses.evasion || 0;
        }

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
        if (result.breakdown.skillMod !== 1.0) {
            const specialty = result.breakdown.specialty ? ` [${result.breakdown.specialty}]` : '';
            console.log(`  Skill (${result.breakdown.proficiencyType || 'N/A'}${specialty}): x${result.breakdown.skillMod.toFixed(2)}`);
        }
        console.log(`  Weapon/Armor: x${result.breakdown.weaponArmorMod.toFixed(2)}`);
        console.log(`  Element: x${result.breakdown.elementMod.toFixed(2)}`);
        if (result.breakdown.socialMod !== 1.0) {
            console.log(`  Social: x${result.breakdown.socialMod.toFixed(2)}`);
        }
        console.log(`  Crit: x${result.breakdown.critMod.toFixed(2)}`);
        console.log(`  Defense (equipment): x${result.breakdown.defenseMod.toFixed(2)}`);
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

console.log('[DamageCalculator] Multi-layer damage system loaded (additive skill formula, equipment-only defense)');