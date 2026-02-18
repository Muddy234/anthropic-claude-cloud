// === SKILLS SYSTEM ===
// Run-based skill progression - skills reset on death
// Power = (Gear_Base × Skill_Mult) × (1 + Boon_Bonus)
//
// On Death - Everything Resets:
// - Gear: Lost
// - Skills: Reset to level 0
// - Boons: Lost
//
// Skills level up DURING a run by performing actions (dealing damage, taking damage, healing)

// ============================================================================
// CONFIGURATION
// ============================================================================

const SKILL_CONFIG = {
    // Level caps
    proficiencyCap: 30,
    specialtyCap: 30,

    // Damage bonuses (ADDITIVE, not multiplicative)
    proficiencyBonusPerLevel: 0.05,   // +5% per proficiency level
    specialtyBonusPerLevel: 0.05,     // +5% per specialty level

    // XP curve
    xpEarlyBase: 25,                  // Levels 1-5: base multiplier
    xpLateMultiplier: 15,             // Levels 6-30: coefficient
    xpLateExponent: 1.8,              // Levels 6-30: exponent
    xpEarlyThreshold: 5,              // Level at which curve switches

    // Actions
    actionUnlockLevel: 5,             // Specialty level to unlock weapon action
    defaultCooldown: 10000,           // 10 seconds (milliseconds)
};

// ============================================================================
// PROFICIENCY DEFINITIONS
// ============================================================================
// XP Sources:
// - Melee: XP from landing melee hits (damage dealt)
// - Ranged: XP from landing ranged hits (damage dealt)
// - Magic: XP from casting spells (damage dealt)

const PROFICIENCIES = {
    melee: {
        id: 'melee',
        name: 'Melee Combat',
        description: 'Proficiency with close-range weapons. XP gained by dealing melee damage.',
        icon: 'M',
        color: '#c0392b',
        xpSource: 'melee_damage_dealt',
        specialties: ['sword', 'knife', 'axe', 'polearm', 'mace', 'staff', 'unarmed', 'shield'],
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.proficiencyBonusPerLevel),
            critChance: level * 0.3  // +0.3% crit per level
        })
    },

    ranged: {
        id: 'ranged',
        name: 'Ranged Combat',
        description: 'Proficiency with ranged weapons. XP gained by dealing ranged damage.',
        icon: 'R',
        color: '#27ae60',
        xpSource: 'ranged_damage_dealt',
        specialties: ['bow'],
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.proficiencyBonusPerLevel),
            accuracy: level * 0.5  // +0.5% accuracy per level
        })
    },

    magic: {
        id: 'magic',
        name: 'Arcane Arts',
        description: 'Proficiency with magic. XP gained by dealing spell damage.',
        icon: 'A',
        color: '#9b59b6',
        xpSource: 'magic_damage_dealt',
        specialties: ['fire', 'ice', 'lightning', 'necromancy', 'water', 'earth', 'nature', 'dark', 'holy', 'arcane', 'death'],
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.proficiencyBonusPerLevel),
            manaCostReduction: level * 0.5  // -0.5% mana cost per level
        })
    }
};

// Legacy mapping for backwards compatibility with old weapon types
const LEGACY_PROFICIENCY_MAP = {
    'blade': 'melee',
    'blunt': 'melee',
    'sword': 'melee',
    'knife': 'melee',
    'axe': 'melee',
    'polearm': 'melee',
    'mace': 'melee',
    'staff': 'melee',
    'unarmed': 'melee',
    'shield': 'melee',
    'bow': 'ranged',
    'fire': 'magic',
    'ice': 'magic',
    'lightning': 'magic',
    'necromancy': 'magic',
    'water': 'magic',
    'earth': 'magic',
    'nature': 'magic',
    'dark': 'magic',
    'holy': 'magic',
    'arcane': 'magic',
    'death': 'magic'
};

// ============================================================================
// SPECIALTY DEFINITIONS
// ============================================================================

const SPECIALTIES = {
    // === MELEE SPECIALTIES ===
    sword: {
        id: 'sword',
        name: 'Sword Mastery',
        proficiency: 'melee',
        description: 'Balanced weapons favoring fluid technique.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            parryChance: level * 0.4  // +0.4% parry per level
        })
    },

    knife: {
        id: 'knife',
        name: 'Knife Mastery',
        proficiency: 'melee',
        description: 'Quick weapons favoring precision and critical strikes.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            critChance: level * 0.6,      // +0.6% crit per level
            attackSpeed: level * 0.3      // +0.3% attack speed per level
        })
    },

    axe: {
        id: 'axe',
        name: 'Axe Mastery',
        proficiency: 'melee',
        description: 'Heavy weapons favoring raw power and armor penetration.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            armorPenetration: level * 0.5  // +0.5% armor pen per level
        })
    },
    
    polearm: {
        id: 'polearm',
        name: 'Polearm Mastery',
        proficiency: 'melee',
        description: 'Long weapons favoring reach and area control.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            reach: level >= 20 ? 2 : (level >= 10 ? 1 : 0)  // +1 reach at levels 10, 20
        })
    },

    mace: {
        id: 'mace',
        name: 'Mace Mastery',
        proficiency: 'melee',
        description: 'Crushing weapons favoring stuns and armor penetration.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            stunChance: level * 0.6,       // +0.6% stun per level
            armorPenetration: level * 0.3  // +0.3% armor pen per level
        })
    },

    staff: {
        id: 'staff',
        name: 'Staff Mastery',
        proficiency: 'melee',
        description: 'Versatile weapons favoring sweeping attacks.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            aoeBonus: level * 0.5  // +0.5% AoE damage per level
        })
    },

    unarmed: {
        id: 'unarmed',
        name: 'Unarmed Combat',
        proficiency: 'melee',
        description: 'Fighting with fists favoring speed and combos.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),  // Normalized to +5%
            attackSpeed: level * 0.5,              // +0.5% attack speed per level
            comboChance: level * 0.4               // +0.4% combo chance per level
        })
    },

    shield: {
        id: 'shield',
        name: 'Shield Mastery',
        proficiency: 'melee',
        description: 'Defensive equipment used offensively for bashing and charging.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            knockbackChance: level * 0.4 // +0.4% knockback per level
        })
    },
    
    // === MAGIC SPECIALTIES ===
    fire: {
        id: 'fire',
        name: 'Fire Magic',
        proficiency: 'magic',
        description: 'Destructive magic favoring damage over time.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            burnDamage: level * 0.5,     // +0.5% burn damage per level
            burnDuration: level * 0.3    // +0.3% burn duration per level
        })
    },
    
    ice: {
        id: 'ice',
        name: 'Ice Magic',
        proficiency: 'magic',
        description: 'Control magic favoring slows and freezes.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            freezeChance: level * 0.4,   // +0.4% freeze chance per level
            slowPotency: level * 0.5     // +0.5% slow strength per level
        })
    },
    
    lightning: {
        id: 'lightning',
        name: 'Lightning Magic',
        proficiency: 'magic',
        description: 'Chain magic favoring multiple targets.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            chainTargets: level >= 24 ? 3 : (level >= 16 ? 2 : (level >= 8 ? 1 : 0)),  // +1 chain at 8, 16, 24
            chainDamageRetention: level * 0.3      // +0.3% damage retained per chain
        })
    },
    
    necromancy: {
        id: 'necromancy',
        name: 'Necromancy',
        proficiency: 'magic',
        description: 'Dark magic favoring life manipulation.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            lifesteal: level * 0.4,      // +0.4% lifesteal per level
            undeadDamage: level * 0.5    // +0.5% damage to undead per level
        })
    },

    water: {
        id: 'water',
        name: 'Water Magic',
        proficiency: 'magic',
        description: 'Fluid magic favoring area control and debuffs.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            aoeRadius: level * 0.3,      // +0.3% AoE radius per level
            debuffDuration: level * 0.4  // +0.4% debuff duration per level
        })
    },

    earth: {
        id: 'earth',
        name: 'Earth Magic',
        proficiency: 'magic',
        description: 'Sturdy magic favoring defense and stagger.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            staggerChance: level * 0.4,  // +0.4% stagger chance per level
            armorBonus: level * 0.3      // +0.3% armor bonus per level
        })
    },

    nature: {
        id: 'nature',
        name: 'Nature Magic',
        proficiency: 'magic',
        description: 'Living magic favoring healing and poison.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            poisonDamage: level * 0.5,   // +0.5% poison damage per level
            healingBonus: level * 0.4    // +0.4% healing effectiveness per level
        })
    },

    dark: {
        id: 'dark',
        name: 'Dark Magic',
        proficiency: 'magic',
        description: 'Shadow magic favoring stealth and debuffs.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            noiseReduction: level * 0.5, // +0.5% noise reduction per level
            debuffPotency: level * 0.4   // +0.4% debuff strength per level
        })
    },

    holy: {
        id: 'holy',
        name: 'Holy Magic',
        proficiency: 'magic',
        description: 'Divine magic favoring healing and smiting undead.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            healingBonus: level * 0.5,   // +0.5% healing effectiveness per level
            undeadDamage: level * 0.6    // +0.6% damage to undead per level
        })
    },

    arcane: {
        id: 'arcane',
        name: 'Arcane Magic',
        proficiency: 'magic',
        description: 'Pure magic favoring raw power and penetration.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            magicPenetration: level * 0.5, // +0.5% magic penetration per level
            spellPower: level * 0.3        // +0.3% spell power per level
        })
    },

    death: {
        id: 'death',
        name: 'Death Magic',
        proficiency: 'magic',
        description: 'Necrotic magic favoring life drain and execution.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            lifesteal: level * 0.3,       // +0.3% lifesteal per level
            executeBonus: level * 0.4     // +0.4% execute threshold per level
        })
    },

    // === RANGED SPECIALTIES ===
    bow: {
        id: 'bow',
        name: 'Bow Mastery',
        proficiency: 'ranged',
        description: 'Precision weapons favoring critical strikes.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            critChance: level * 0.5,      // +0.5% crit per level
            critDamage: level * 0.3       // +0.3% crit damage per level
        })
    }
};

// ============================================================================
// ACTION DEFINITIONS
// ============================================================================

const ACTIONS = {
    // === BLADE ACTIONS ===
    blade_dancer: {
        id: 'blade_dancer',
        name: 'Blade Dancer',
        specialty: 'sword',
        proficiency: 'melee',
        description: 'Strike twice in rapid succession.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'damage',
        mechanics: {
            hits: 2,
            damagePerHit: 0.6,  // 60% per hit = 120% total
        },
        execute: function(user, target, actionDamage) {
            const results = [];
            for (let i = 0; i < this.mechanics.hits; i++) {
                const damage = Math.floor(actionDamage * this.mechanics.damagePerHit);
                results.push({ target, damage, hit: i + 1 });
            }
            return { type: 'multi_hit', results, totalDamage: results.reduce((sum, r) => sum + r.damage, 0) };
        }
    },
    
    arterial_strike: {
        id: 'arterial_strike',
        name: 'Arterial Strike',
        specialty: 'knife',
        proficiency: 'melee',
        description: 'A precise cut that causes bleeding.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'dot',
        mechanics: {
            initialDamage: 0.8,    // 80% initial
            bleedTicks: 3,
            bleedDamagePerTick: 0.4,  // 40% per tick = 120% bleed total
            bleedDuration: 6000,      // 6 seconds total (2s per tick)
        },
        execute: function(user, target, actionDamage) {
            const initialDamage = Math.floor(actionDamage * this.mechanics.initialDamage);
            const bleedDamage = Math.floor(actionDamage * this.mechanics.bleedDamagePerTick);
            return {
                type: 'dot',
                initialDamage,
                bleed: {
                    damage: bleedDamage,
                    ticks: this.mechanics.bleedTicks,
                    interval: this.mechanics.bleedDuration / this.mechanics.bleedTicks,
                    totalDamage: bleedDamage * this.mechanics.bleedTicks
                },
                totalDamage: initialDamage + (bleedDamage * this.mechanics.bleedTicks)
            };
        }
    },
    
    cleaving_blow: {
        id: 'cleaving_blow',
        name: 'Cleaving Blow',
        specialty: 'axe',
        proficiency: 'melee',
        description: 'A devastating strike that sunders armor.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'damage',
        mechanics: {
            damageMultiplier: 1.5,     // 150% damage
            armorPenetration: 0.5,     // Ignores 50% armor
        },
        execute: function(user, target, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            return {
                type: 'penetrating',
                damage,
                armorPenetration: this.mechanics.armorPenetration,
                totalDamage: damage
            };
        }
    },
    
    impaling_thrust: {
        id: 'impaling_thrust',
        name: 'Impaling Thrust',
        specialty: 'polearm',
        proficiency: 'melee',
        description: 'A lunging thrust that pierces through enemies in a line.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'aoe',
        mechanics: {
            damageMultiplier: 1.3,  // 130% per enemy
            range: 2,               // 2 tiles in a line
            maxTargets: 3,
        },
        execute: function(user, targets, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            const results = targets.slice(0, this.mechanics.maxTargets).map(target => ({
                target,
                damage
            }));
            return {
                type: 'line_aoe',
                results,
                totalDamage: results.reduce((sum, r) => sum + r.damage, 0)
            };
        }
    },
    
    // === BLUNT ACTIONS ===
    skull_crack: {
        id: 'skull_crack',
        name: 'Skull Crack',
        specialty: 'mace',
        proficiency: 'melee',
        description: 'A crushing blow that stuns the target.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'cc',
        mechanics: {
            damageMultiplier: 1.3,  // 130% damage
            stunDuration: 2000,     // 2 second stun
        },
        execute: function(user, target, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            return {
                type: 'stun',
                damage,
                stun: {
                    duration: this.mechanics.stunDuration
                },
                totalDamage: damage
            };
        }
    },
    
    sweeping_arc: {
        id: 'sweeping_arc',
        name: 'Sweeping Arc',
        specialty: 'staff',
        proficiency: 'melee',
        description: 'A wide sweep that hits all adjacent enemies.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'aoe',
        mechanics: {
            damageMultiplier: 1.0,  // 100% per enemy
            range: 1,               // Adjacent tiles only
            maxTargets: 8,          // All 8 directions
        },
        execute: function(user, targets, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            const results = targets.slice(0, this.mechanics.maxTargets).map(target => ({
                target,
                damage
            }));
            return {
                type: 'radial_aoe',
                results,
                totalDamage: results.reduce((sum, r) => sum + r.damage, 0)
            };
        }
    },
    
    flurry_of_blows: {
        id: 'flurry_of_blows',
        name: 'Flurry of Blows',
        specialty: 'unarmed',
        proficiency: 'melee',
        description: 'A rapid combination of punches and kicks.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'damage',
        mechanics: {
            hits: 5,
            damagePerHit: 0.3,  // 30% per hit = 150% total
        },
        execute: function(user, target, actionDamage) {
            const results = [];
            for (let i = 0; i < this.mechanics.hits; i++) {
                const damage = Math.floor(actionDamage * this.mechanics.damagePerHit);
                results.push({ target, damage, hit: i + 1 });
            }
            return { type: 'multi_hit', results, totalDamage: results.reduce((sum, r) => sum + r.damage, 0) };
        }
    },
    
    shield_charge: {
        id: 'shield_charge',
        name: 'Shield Charge',
        specialty: 'shield',
        proficiency: 'melee',
        description: 'Rush forward and slam into the target.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'mobility',
        mechanics: {
            damageMultiplier: 1.2,  // 120% damage
            chargeDistance: 2,      // Move up to 2 tiles
            knockback: 2,           // Push target 2 tiles
        },
        execute: function(user, target, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            return {
                type: 'charge',
                damage,
                movement: {
                    chargeDistance: this.mechanics.chargeDistance,
                    knockback: this.mechanics.knockback
                },
                totalDamage: damage
            };
        }
    },
    
    // === MAGIC ACTIONS ===
    immolate: {
        id: 'immolate',
        name: 'Immolate',
        specialty: 'fire',
        proficiency: 'magic',
        description: 'Engulf the target in flames.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'dot',
        mechanics: {
            initialDamage: 0.6,       // 60% initial
            burnTicks: 5,
            burnDamagePerTick: 0.3,   // 30% per tick = 150% burn total
            burnDuration: 10000,      // 10 seconds
        },
        execute: function(user, target, actionDamage) {
            const initialDamage = Math.floor(actionDamage * this.mechanics.initialDamage);
            const burnDamage = Math.floor(actionDamage * this.mechanics.burnDamagePerTick);
            return {
                type: 'dot',
                initialDamage,
                burn: {
                    damage: burnDamage,
                    ticks: this.mechanics.burnTicks,
                    interval: this.mechanics.burnDuration / this.mechanics.burnTicks,
                    totalDamage: burnDamage * this.mechanics.burnTicks
                },
                totalDamage: initialDamage + (burnDamage * this.mechanics.burnTicks)
            };
        }
    },
    
    frozen_grasp: {
        id: 'frozen_grasp',
        name: 'Frozen Grasp',
        specialty: 'ice',
        proficiency: 'magic',
        description: 'Encase the target in ice.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'cc',
        mechanics: {
            damageMultiplier: 1.0,   // 100% damage
            freezeDuration: 3000,    // 3 second freeze
        },
        execute: function(user, target, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            return {
                type: 'freeze',
                damage,
                freeze: {
                    duration: this.mechanics.freezeDuration
                },
                totalDamage: damage
            };
        }
    },
    
    chain_lightning: {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        specialty: 'lightning',
        proficiency: 'magic',
        description: 'Lightning that arcs between enemies.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'aoe',
        mechanics: {
            primaryDamage: 1.0,     // 100% to primary
            chainDamage: [0.7, 0.5], // 70% second, 50% third
            maxChains: 2,
        },
        execute: function(user, targets, actionDamage) {
            const results = [];
            const damageValues = [this.mechanics.primaryDamage, ...this.mechanics.chainDamage];
            
            for (let i = 0; i < Math.min(targets.length, damageValues.length); i++) {
                const damage = Math.floor(actionDamage * damageValues[i]);
                results.push({ target: targets[i], damage, chain: i });
            }
            return {
                type: 'chain',
                results,
                totalDamage: results.reduce((sum, r) => sum + r.damage, 0)
            };
        }
    },
    
    life_siphon: {
        id: 'life_siphon',
        name: 'Life Siphon',
        specialty: 'necromancy',
        proficiency: 'magic',
        description: 'Drain life from your target.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'sustain',
        mechanics: {
            damageMultiplier: 1.2,  // 120% damage
            lifestealPercent: 0.5,  // Heal for 50% of damage dealt
        },
        execute: function(user, target, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            const healing = Math.floor(damage * this.mechanics.lifestealPercent);
            return {
                type: 'lifesteal',
                damage,
                healing,
                totalDamage: damage
            };
        }
    },
    
    // === RANGED ACTIONS ===
    power_shot: {
        id: 'power_shot',
        name: 'Power Shot',
        specialty: 'bow',
        proficiency: 'ranged',
        description: 'A fully drawn devastating arrow.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'damage',
        mechanics: {
            damageMultiplier: 1.8,   // 180% damage
            bonusCritChance: 20,     // +20% crit chance
        },
        execute: function(user, target, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            return {
                type: 'crit_strike',
                damage,
                bonusCritChance: this.mechanics.bonusCritChance,
                totalDamage: damage
            };
        }
    }
};

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

/**
 * Get the action associated with a specialty
 */
function getActionForSpecialty(specialtyId) {
    for (const actionId in ACTIONS) {
        if (ACTIONS[actionId].specialty === specialtyId) {
            return ACTIONS[actionId];
        }
    }
    return null;
}

/**
 * Get the proficiency ID for a specialty
 */
function getProficiencyForSpecialty(specialtyId) {
    const specialty = SPECIALTIES[specialtyId];
    return specialty ? specialty.proficiency : null;
}

/**
 * Get all specialties for a proficiency
 */
function getSpecialtiesForProficiency(proficiencyId) {
    const prof = PROFICIENCIES[proficiencyId];
    return prof ? (prof.specialties || []) : [];
}

// ============================================================================
// XP AND LEVELING FUNCTIONS
// ============================================================================

/**
 * Piecewise XP curve:
 * - Levels 1-5: Fast linear ramp to quickly unlock weapon action
 * - Levels 6-30: Power curve for meaningful progression
 */
function getXpForNextLevel(currentLevel) {
    if (currentLevel < SKILL_CONFIG.xpEarlyThreshold) {
        // Levels 0->1 through 4->5: 50, 75, 100, 125, 150
        return SKILL_CONFIG.xpEarlyBase * (currentLevel + 2);
    }
    // Levels 5->6 through 29->30: steep power curve
    return Math.floor(
        SKILL_CONFIG.xpLateMultiplier * Math.pow(currentLevel + 1, SKILL_CONFIG.xpLateExponent)
    );
}

/**
 * Award skill XP when damage is dealt.
 * XP goes to both proficiency and specialty independently (no splitting).
 *
 * @param {Object} player - Player object with skills
 * @param {string} specialtyId - The specialty of the weapon used (e.g., 'knife')
 * @param {number} xpAmount - Total XP to award (goes to both prof and spec)
 */
function awardSkillXp(player, specialtyId, xpAmount) {
    if (!player) {
        console.warn('[SkillXP] No player provided');
        return;
    }
    if (!player.skills) {
        console.log('[SkillXP] Initializing player skills...');
        initializePlayerSkills(player);
    }

    // Normalize specialty ID to lowercase
    const normalizedSpecialtyId = String(specialtyId).toLowerCase();

    const specialty = SPECIALTIES[normalizedSpecialtyId];
    if (!specialty) {
        console.warn(`[SkillXP] Unknown specialty: ${normalizedSpecialtyId}`);
        return;
    }

    const proficiencyId = specialty.proficiency;

    // XP goes to BOTH proficiency AND specialty (no split)
    console.log(`[SkillXP] ${xpAmount} XP -> ${proficiencyId}: +${xpAmount}, ${normalizedSpecialtyId}: +${xpAmount}`);

    // Award proficiency XP
    addProficiencyXp(player, proficiencyId, xpAmount);

    // Award specialty XP
    addSpecialtyXp(player, normalizedSpecialtyId, xpAmount);
}

/**
 * Add XP to a proficiency and handle level-ups
 */
function addProficiencyXp(player, proficiencyId, amount) {
    const prof = player.skills.proficiencies[proficiencyId];
    if (!prof) return;
    
    // Check cap
    if (prof.level >= SKILL_CONFIG.proficiencyCap) return;
    
    prof.xp += amount;
    
    // Check for level up(s)
    while (prof.xp >= prof.xpToNext && prof.level < SKILL_CONFIG.proficiencyCap) {
        prof.xp -= prof.xpToNext;
        prof.level++;
        prof.xpToNext = getXpForNextLevel(prof.level);
        
        // Notification
        const profData = PROFICIENCIES[proficiencyId];
        console.log(`LEVEL UP! ${profData.name} is now Level ${prof.level}!`);
        
        if (typeof addMessage === 'function') {
            addMessage(`LEVEL UP! ${profData.name} is now Level ${prof.level}!`);
        }
    }
    
    // Cap overflow XP at max level
    if (prof.level >= SKILL_CONFIG.proficiencyCap) {
        prof.xp = 0;
    }
}

/**
 * Add XP to a specialty and handle level-ups
 */
function addSpecialtyXp(player, specialtyId, amount) {
    const specData = player.skills.specialties[specialtyId];
    if (!specData) return;
    
    // Unlock specialty when first XP is gained
    if (!specData.unlocked) {
        specData.unlocked = true;
        console.log(`Unlocked specialty: ${specialtyId}`);
    }
    const spec = player.skills.specialties[specialtyId];
    if (!spec) return;
    
    // Check cap
    if (spec.level >= SKILL_CONFIG.specialtyCap) return;
    
    spec.xp += amount;
    
    // Check for level up(s)
    while (spec.xp >= spec.xpToNext && spec.level < SKILL_CONFIG.specialtyCap) {
        spec.xp -= spec.xpToNext;
        spec.level++;
        spec.xpToNext = getXpForNextLevel(spec.level);
        
        // Notification
        const specData = SPECIALTIES[specialtyId];
        console.log(`LEVEL UP! ${specData.name} is now Level ${spec.level}!`);
        
        if (typeof addMessage === 'function') {
            addMessage(`LEVEL UP! ${specData.name} is now Level ${spec.level}!`);
        }
        
        // Check for action unlock
        if (spec.level === SKILL_CONFIG.actionUnlockLevel) {
            unlockAction(player, specialtyId);
        }
    }
    
    // Cap overflow XP at max level
    if (spec.level >= SKILL_CONFIG.specialtyCap) {
        spec.xp = 0;
    }
}

/**
 * Unlock an action when specialty reaches required level
 */
function unlockAction(player, specialtyId) {
    const action = getActionForSpecialty(specialtyId);
    if (!action) return;
    
    // Add to player's unlocked actions
    if (!player.skills.unlockedActions.includes(action.id)) {
        player.skills.unlockedActions.push(action.id);
        
        console.log(`ACTION UNLOCKED: ${action.name}!`);
        
        if (typeof addMessage === 'function') {
            addMessage(`ACTION UNLOCKED: ${action.name} - ${action.description}`);
        }
    }
}

// ============================================================================
// ACTION USAGE FUNCTIONS
// ============================================================================

/**
 * Check if player can use an action
 */
function canUseAction(player, actionId) {
    const action = ACTIONS[actionId];
    if (!action) return { canUse: false, reason: 'Unknown action' };
    
    // Check if unlocked
    if (!player.skills.unlockedActions.includes(actionId)) {
        return { canUse: false, reason: 'Action not unlocked' };
    }
    
    // Check cooldown
    const cooldownRemaining = player.skills.actionCooldowns[actionId] || 0;
    if (cooldownRemaining > 0) {
        return { canUse: false, reason: `On cooldown (${(cooldownRemaining / 1000).toFixed(1)}s)` };
    }
    
    // Check weapon requirement (expertise actions don't require specific weapon)
    if (action.requiresWeapon !== false) {
        const equippedWeapon = player.equipped?.MAIN;
        if (!equippedWeapon || equippedWeapon.specialty !== action.specialty) {
            return { canUse: false, reason: `Requires ${SPECIALTIES[action.specialty].name} weapon equipped` };
        }
    }
    
    return { canUse: true };
}

/**
 * Use an action
 */
function useAction(player, actionId, target) {
    const check = canUseAction(player, actionId);
    if (!check.canUse) {
        console.log(`Cannot use action: ${check.reason}`);
        return null;
    }

    const action = ACTIONS[actionId];
    const specialtyLevel = player.skills.specialties[action.specialty]?.level || 0;
    const proficiencyLevel = player.skills.proficiencies[action.proficiency]?.level || 0;

    // Calculate action damage
    const actionDamage = calculateActionDamage(player, action, specialtyLevel, proficiencyLevel);

    // Execute the action
    const result = action.execute(player, target, actionDamage);

    // Start cooldown
    player.skills.actionCooldowns[actionId] = action.cooldown;

    console.log(`Used ${action.name}!`, result);

    return result;
}

/**
 * Calculate damage for a weapon-based action.
 * Uses the new additive skill multiplier.
 */
function calculateActionDamage(player, action, specialtyLevel, proficiencyLevel) {
    const baseWeaponDamage = player.equipped?.MAIN?.damage || 10;
    const skillMultiplier = getSkillDamageMultiplier(player, action.proficiency, specialtyLevel);
    return Math.floor(baseWeaponDamage * skillMultiplier * (action.mechanics?.damageMultiplier || 1));
}

/**
 * Update action cooldowns (call every frame/tick)
 */
function updateActionCooldowns(player, deltaTime) {
    if (!player.skills?.actionCooldowns) return;
    
    for (const actionId in player.skills.actionCooldowns) {
        if (player.skills.actionCooldowns[actionId] > 0) {
            player.skills.actionCooldowns[actionId] -= deltaTime;
            if (player.skills.actionCooldowns[actionId] < 0) {
                player.skills.actionCooldowns[actionId] = 0;
            }
        }
    }
}

// ============================================================================
// BONUS CALCULATION FUNCTIONS (Soul & Body Model)
// ============================================================================

/**
 * ADDITIVE damage multiplier from skills.
 * Max: 1 + (30 x 0.05) + (30 x 0.05) = 4.0x
 *
 * @param {Object} player
 * @param {string} proficiencyId - 'melee', 'ranged', or 'magic'
 * @param {number} specLevel - current specialty level
 * @returns {number} multiplier (1.0 to 4.0)
 */
function getSkillDamageMultiplier(player, proficiencyId, specLevel = 0) {
    if (!player.skills) return 1;

    // Map legacy specialty IDs to new proficiency IDs
    const mappedProfId = LEGACY_PROFICIENCY_MAP[proficiencyId] || proficiencyId;

    const profLevel = player.skills.proficiencies[mappedProfId]?.level || 0;
    const profBonus = profLevel * SKILL_CONFIG.proficiencyBonusPerLevel;
    const specBonus = specLevel * SKILL_CONFIG.specialtyBonusPerLevel;

    return 1 + profBonus + specBonus;
}

/**
 * Get damage multiplier for melee attacks
 */
function getMeleeDamageMultiplier(player) {
    return getSkillDamageMultiplier(player, 'melee');
}

/**
 * Get damage multiplier for ranged attacks
 */
function getRangedDamageMultiplier(player) {
    return getSkillDamageMultiplier(player, 'ranged');
}

/**
 * Get damage multiplier for magic attacks
 */
function getMagicDamageMultiplier(player) {
    return getSkillDamageMultiplier(player, 'magic');
}

/**
 * Get all bonuses for a specialty (combining proficiency and specialty)
 */
function getSpecialtyBonuses(player, specialtyId) {
    if (!player.skills) return {};
    
    const specialty = SPECIALTIES[specialtyId];
    if (!specialty) return {};
    
    const proficiencyId = specialty.proficiency;
    
    const profLevel = player.skills.proficiencies[proficiencyId]?.level || 0;
    const specLevel = player.skills.specialties[specialtyId]?.level || 0;
    
    // Get bonuses from both
    const profBonuses = PROFICIENCIES[proficiencyId].getBonuses(profLevel);
    const specBonuses = SPECIALTIES[specialtyId].getBonuses(specLevel);
    
    // Merge bonuses (specialty bonuses override proficiency if same key)
    return { ...profBonuses, ...specBonuses };
}

// ============================================================================
// PLAYER INITIALIZATION (Soul & Body Model)
// ============================================================================

/**
 * Initialize player skills - always starts fresh (skills reset each run)
 */
function initializePlayerSkills(player) {
    if (!player) {
        console.warn('initializePlayerSkills called without player');
        return;
    }

    // Always create fresh skills - skills don't persist across deaths
    player.skills = createFreshSkills();
    console.log('✓ Player skills initialized (fresh run)');

    // Ensure actionCooldowns exists
    if (!player.skills.actionCooldowns) {
        player.skills.actionCooldowns = {};
    }

    // Reset action cooldowns
    for (const actionId in ACTIONS) {
        player.skills.actionCooldowns[actionId] = 0;
    }
}

/**
 * Create fresh skills structure for new saves
 */
function createFreshSkills() {
    return {
        proficiencies: {
            melee:  { level: 0, xp: 0, xpToNext: getXpForNextLevel(0) },
            ranged: { level: 0, xp: 0, xpToNext: getXpForNextLevel(0) },
            magic:  { level: 0, xp: 0, xpToNext: getXpForNextLevel(0) },
            // defense and vitality REMOVED
        },
        specialties: {
            // Melee (8)
            sword:    { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            knife:    { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            axe:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            polearm:  { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            mace:     { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            staff:    { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            unarmed:  { level: 1, xp: 0, xpToNext: getXpForNextLevel(1), unlocked: true },
            shield:   { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            // Magic (11)
            fire:       { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            ice:        { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            lightning:  { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            necromancy: { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            water:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            earth:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            nature:     { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            dark:       { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            holy:       { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            arcane:     { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            death:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            // Ranged (1)
            bow:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            // Expertise REMOVED (traps, potions, lockpicking, tinkering)
        },
        unlockedActions: [],
        actionCooldowns: {}
    };
}

/**
 * Save skills to persistentState - NO-OP
 * Skills no longer persist across deaths. This function exists for backwards compatibility.
 */
function saveSkillsToPersistentState(player) {
    // Skills don't persist - intentional no-op
    // Keeping function signature so existing calls don't break
}

/**
 * Reset skills on death - ALL skills reset to level 0
 * Skills only persist during a single run.
 */
function resetPlayerSkills(player) {
    if (!player) return;

    // Reset all proficiencies to level 0
    player.skills = createFreshSkills();

    // Reset action cooldowns
    if (player.skills?.actionCooldowns) {
        for (const actionId in player.skills.actionCooldowns) {
            player.skills.actionCooldowns[actionId] = 0;
        }
    }

    console.log('[Skills] All skills reset on death');
}

// ============================================================================
// SOUL & BODY XP AWARD FUNCTIONS
// ============================================================================

/**
 * Award Melee proficiency XP (called when dealing melee damage)
 * @param {Object} player - Player object
 * @param {number} damageDealt - Amount of melee damage dealt
 */
function awardMeleeXp(player, damageDealt) {
    if (!player?.skills) return;
    const xp = Math.max(1, Math.floor(damageDealt * 0.5)); // 0.5 XP per damage
    addProficiencyXp(player, 'melee', xp);
}

/**
 * Award Ranged proficiency XP (called when dealing ranged damage)
 * @param {Object} player - Player object
 * @param {number} damageDealt - Amount of ranged damage dealt
 */
function awardRangedXp(player, damageDealt) {
    if (!player?.skills) return;
    const xp = Math.max(1, Math.floor(damageDealt * 0.5));
    addProficiencyXp(player, 'ranged', xp);
}

/**
 * Award Magic proficiency XP (called when dealing spell damage)
 * @param {Object} player - Player object
 * @param {number} damageDealt - Amount of magic damage dealt
 */
function awardMagicXp(player, damageDealt) {
    if (!player?.skills) return;
    const xp = Math.max(1, Math.floor(damageDealt * 0.5));
    addProficiencyXp(player, 'magic', xp);
}

// ============================================================================
// DEBUG / UTILITY FUNCTIONS
// ============================================================================

/**
 * Debug: Print skill summary
 */
function debugPrintSkills(player) {
    if (!player.skills) {
        console.log('No skills initialized');
        return;
    }
    
    console.log('=== PROFICIENCIES ===');
    for (const profId in player.skills.proficiencies) {
        const prof = player.skills.proficiencies[profId];
        console.log(`  ${PROFICIENCIES[profId].name}: Level ${prof.level} (${prof.xp}/${prof.xpToNext} XP)`);
    }
    
    console.log('=== SPECIALTIES ===');
    for (const specId in player.skills.specialties) {
        const spec = player.skills.specialties[specId];
        if (spec.level > 0 || spec.xp > 0) {
            console.log(`  ${SPECIALTIES[specId].name}: Level ${spec.level} (${spec.xp}/${spec.xpToNext} XP)`);
        }
    }
    
    console.log('=== UNLOCKED ACTIONS ===');
    for (const actionId of player.skills.unlockedActions) {
        console.log(`  ${ACTIONS[actionId].name}`);
    }
}

/**
 * Debug: Grant XP to test
 */
function debugGrantXp(player, specialtyId, amount) {
    awardSkillXp(player, specialtyId, amount);
    debugPrintSkills(player);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make everything globally available
window.SKILL_CONFIG = SKILL_CONFIG;
window.PROFICIENCIES = PROFICIENCIES;
window.SPECIALTIES = SPECIALTIES;
window.ACTIONS = ACTIONS;
window.LEGACY_PROFICIENCY_MAP = LEGACY_PROFICIENCY_MAP;

window.getActionForSpecialty = getActionForSpecialty;
window.getProficiencyForSpecialty = getProficiencyForSpecialty;
window.getSpecialtiesForProficiency = getSpecialtiesForProficiency;

window.getXpForNextLevel = getXpForNextLevel;
window.awardSkillXp = awardSkillXp;
window.addProficiencyXp = addProficiencyXp;
window.addSpecialtyXp = addSpecialtyXp;

// XP award functions (damage-based)
window.awardMeleeXp = awardMeleeXp;
window.awardRangedXp = awardRangedXp;
window.awardMagicXp = awardMagicXp;

window.canUseAction = canUseAction;
window.useAction = useAction;
window.updateActionCooldowns = updateActionCooldowns;

// Bonus calculation
window.getSkillDamageMultiplier = getSkillDamageMultiplier;
window.getMeleeDamageMultiplier = getMeleeDamageMultiplier;
window.getRangedDamageMultiplier = getRangedDamageMultiplier;
window.getMagicDamageMultiplier = getMagicDamageMultiplier;
window.getSpecialtyBonuses = getSpecialtyBonuses;

// Initialization & persistence
window.initializePlayerSkills = initializePlayerSkills;
window.resetPlayerSkills = resetPlayerSkills;
window.createFreshSkills = createFreshSkills;
window.saveSkillsToPersistentState = saveSkillsToPersistentState;

window.debugPrintSkills = debugPrintSkills;
window.debugGrantXp = debugGrantXp;

console.log('Skills system loaded');
console.log(`  ${Object.keys(PROFICIENCIES).length} proficiencies: melee, ranged, magic`);
console.log(`  ${Object.keys(SPECIALTIES).length} specialties`);
console.log(`  ${Object.keys(ACTIONS).length} actions`);

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const SkillSystemDef = {
    name: 'skill-system',

    init(game) {
        // Initialize player skills if player exists
        if (game.player && typeof initializePlayerSkills === 'function') {
            initializePlayerSkills(game.player);
        }
    },

    update(dt) {
        // Skill system mostly runs through skills-combat-integration
        // This handles any standalone skill updates if needed

        // Update action cooldowns (if not handled by skills-combat)
        // Currently handled by skills-combat system at priority 55
    },

    cleanup() {
        // Reset player skills on death/restart
        if (game.player && typeof resetPlayerSkills === 'function') {
            resetPlayerSkills(game.player);
        }
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('skill-system', SkillSystemDef, 60);
} else {
    console.warn('SystemManager not found - skill-system running standalone');
}
