// === SKILLS SYSTEM (Soul & Body Model) ===
// Permanent skill progression - skills NEVER reset on death
// Power = (Gear_Base × Skill_Mult) × (1 + Boon_Bonus)
//
// Three Pillars:
// - BODY (Gear): Volatile, dropped on death - provides base stats
// - SOUL (Skills): Permanent, never lost - multiplies effectiveness
// - RUN (Boons): Session-only buffs from shrines

// ============================================================================
// CONFIGURATION
// ============================================================================

const SKILL_CONFIG = {
    // Level caps (uncapped for proficiency, capped for specialization)
    proficiencyCap: 100,             // Soft cap - can go higher but XP scales
    specializationCap: 100,           // Per specialization slot

    // Bonus per level (multiplicative formula)
    // Multiplier = (1 + ProfLevel × 0.02) × (1 + SpecLevel × 0.02)
    proficiencyBonusPerLevel: 0.02,   // +2% per proficiency level
    specializationBonusPerLevel: 0.02, // +2% per specialization level

    // Specialization unlock thresholds
    // New specialization slot unlocks at proficiency 25, 50, 75, 100
    specializationUnlockThresholds: [25, 50, 75, 100],

    // XP curve: 100 * level^1.5
    xpCurveBase: 100,
    xpCurveExponent: 1.5,

    // Vitality HP bonus per level
    vitalityHpPerLevel: 2,            // +2 HP per vitality level

    // Base player HP (no gear, no vitality)
    basePlayerHp: 100,

    // Action settings (legacy - for specialty actions)
    actionUnlockLevel: 5,             // Specialty level to unlock action
    actionScalingPerLevel: 0.02,      // +2% action damage per level above 5
    defaultCooldown: 10000,           // 10 seconds in milliseconds
};

// ============================================================================
// PROFICIENCY DEFINITIONS (Soul & Body Model)
// ============================================================================
// XP Sources:
// - Melee: XP from landing melee hits (damage dealt)
// - Ranged: XP from landing ranged hits (damage dealt)
// - Magic: XP from casting spells (damage dealt)
// - Defense: XP from taking damage (damage received)
// - Vitality: XP from effective healing only (actual HP restored)

const PROFICIENCIES = {
    melee: {
        id: 'melee',
        name: 'Melee Combat',
        description: 'Proficiency with close-range weapons. XP gained by dealing melee damage.',
        icon: 'M',
        color: '#c0392b',
        xpSource: 'melee_damage_dealt',
        // Specializations unlock at proficiency 25, 50, 75, 100
        specializations: ['blade', 'blunt', 'polearm', 'unarmed'],
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.proficiencyBonusPerLevel),
            critChance: level * 0.2  // +0.2% crit per level
        })
    },

    ranged: {
        id: 'ranged',
        name: 'Ranged Combat',
        description: 'Proficiency with ranged weapons. XP gained by dealing ranged damage.',
        icon: 'R',
        color: '#27ae60',
        xpSource: 'ranged_damage_dealt',
        specializations: ['bow', 'crossbow', 'throwing', 'firearms'],
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.proficiencyBonusPerLevel),
            accuracy: level * 0.3  // +0.3% accuracy per level
        })
    },

    magic: {
        id: 'magic',
        name: 'Arcane Arts',
        description: 'Proficiency with magic. XP gained by dealing spell damage.',
        icon: 'A',
        color: '#9b59b6',
        xpSource: 'magic_damage_dealt',
        specializations: ['fire', 'ice', 'lightning', 'necromancy'],
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.proficiencyBonusPerLevel),
            manaCostReduction: level * 0.3  // -0.3% mana cost per level
        })
    },

    defense: {
        id: 'defense',
        name: 'Defense',
        description: 'Proficiency with defensive techniques. XP gained by taking damage.',
        icon: 'D',
        color: '#3498db',
        xpSource: 'damage_taken',
        specializations: ['armor', 'blocking', 'dodging', 'resilience'],
        getBonuses: (level) => ({
            damageReduction: level * 0.002,  // +0.2% damage reduction per level (20% at 100)
            blockChance: level * 0.15        // +0.15% block per level
        })
    },

    vitality: {
        id: 'vitality',
        name: 'Vitality',
        description: 'Proficiency with life force. XP gained ONLY from effective healing (actual HP restored).',
        icon: 'V',
        color: '#e74c3c',
        xpSource: 'effective_healing',
        specializations: ['regeneration', 'constitution', 'recovery', 'fortitude'],
        getBonuses: (level) => ({
            // Each vitality level adds HP
            bonusHp: level * SKILL_CONFIG.vitalityHpPerLevel,
            healingEffectiveness: 1 + (level * 0.005)  // +0.5% healing effectiveness per level
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
    'mace': 'melee',
    'staff': 'melee',
    'unarmed': 'melee',
    'shield': 'defense',
    'bow': 'ranged',
    'crossbow': 'ranged',
    'throwing': 'ranged',
    'fire': 'magic',
    'ice': 'magic',
    'lightning': 'magic',
    'necromancy': 'magic',
    'traps': 'defense',
    'potions': 'vitality',
    'lockpicking': 'defense',
    'tinkering': 'defense'
};

// ============================================================================
// SPECIALTY DEFINITIONS
// ============================================================================

const SPECIALTIES = {
    // === BLADE SPECIALTIES ===
    sword: {
        id: 'sword',
        name: 'Sword Mastery',
        proficiency: 'blade',
        description: 'Balanced weapons favoring fluid technique.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            parryChance: level * 0.4  // +0.4% parry per level
        })
    },
    
    knife: {
        id: 'knife',
        name: 'Knife Mastery',
        proficiency: 'blade',
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
        proficiency: 'blade',
        description: 'Heavy weapons favoring raw power and armor penetration.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            armorPenetration: level * 0.5  // +0.5% armor pen per level
        })
    },
    
    polearm: {
        id: 'polearm',
        name: 'Polearm Mastery',
        proficiency: 'blade',
        description: 'Long weapons favoring reach and area control.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            reach: Math.floor(level / 25) + 1  // +1 reach at level 25, 50
        })
    },
    
    // === BLUNT SPECIALTIES ===
    mace: {
        id: 'mace',
        name: 'Mace Mastery',
        proficiency: 'blunt',
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
        proficiency: 'blunt',
        description: 'Versatile weapons favoring sweeping attacks.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            aoeBonus: level * 0.5  // +0.5% AoE damage per level
        })
    },
    
    unarmed: {
        id: 'unarmed',
        name: 'Unarmed Combat',
        proficiency: 'blunt',
        description: 'Fighting with fists favoring speed and combos.',
        getBonuses: (level) => ({
            // Higher scaling since base damage is lower
            damageMultiplier: 1 + (level * 0.03),  // +3% per level
            attackSpeed: level * 0.5,              // +0.5% attack speed per level
            comboChance: level * 0.4               // +0.4% combo chance per level
        })
    },
    
    shield: {
        id: 'shield',
        name: 'Shield Mastery',
        proficiency: 'blunt',
        description: 'Defensive equipment used offensively for bashing and charging.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            blockChance: level * 0.6,    // +0.6% block per level
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
            chainTargets: Math.floor(level / 20),  // +1 chain target at 20, 40, 60
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
    },
    
    crossbow: {
        id: 'crossbow',
        name: 'Crossbow Mastery',
        proficiency: 'ranged',
        description: 'Mechanical weapons favoring penetration.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            armorPenetration: level * 0.7, // +0.7% armor pen per level
            pierceChance: level * 0.4      // +0.4% pierce chance per level
        })
    },
    
    throwing: {
        id: 'throwing',
        name: 'Throwing Mastery',
        proficiency: 'ranged',
        description: 'Thrown weapons favoring area coverage.',
        getBonuses: (level) => ({
            damageMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            projectileCount: Math.floor(level / 25),  // +1 projectile at 25, 50
            spreadAngle: level * 0.3                  // +0.3% cone width per level
        })
    },
    
    // === EXPERTISE SPECIALTIES ===
    traps: {
        id: 'traps',
        name: 'Trap Mastery',
        proficiency: 'expertise',
        description: 'Placed devices that trigger on enemy contact.',
        getBonuses: (level) => ({
            effectivenessMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            trapDamage: level * 0.5,      // +0.5% trap damage per level
            maxTraps: 3 + Math.floor(level / 20)  // +1 max trap at 20, 40, 60
        })
    },
    
    potions: {
        id: 'potions',
        name: 'Alchemy',
        proficiency: 'expertise',
        description: 'Throwable concoctions with various effects.',
        getBonuses: (level) => ({
            effectivenessMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            potionDamage: level * 0.5,    // +0.5% potion damage per level
            aoeRadius: level * 0.3        // +0.3% AoE radius per level
        })
    },
    
    lockpicking: {
        id: 'lockpicking',
        name: 'Lockpicking',
        proficiency: 'expertise',
        description: 'Finding and exploiting weaknesses.',
        getBonuses: (level) => ({
            effectivenessMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            vulnerabilityBonus: 25 + (level * 0.5),  // Base 25% + 0.5% per level
            markDuration: 8 + (level * 0.1)          // Base 8s + 0.1s per level
        })
    },
    
    tinkering: {
        id: 'tinkering',
        name: 'Tinkering',
        proficiency: 'expertise',
        description: 'Constructing mechanical devices.',
        getBonuses: (level) => ({
            effectivenessMultiplier: 1 + (level * SKILL_CONFIG.specialtyBonusPerLevel),
            turretDamage: level * 0.5,    // +0.5% turret damage per level
            turretDuration: 15 + (level * 0.2)  // Base 15s + 0.2s per level
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
        proficiency: 'blade',
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
        proficiency: 'blade',
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
        proficiency: 'blade',
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
        proficiency: 'blade',
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
        proficiency: 'blunt',
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
        proficiency: 'blunt',
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
        proficiency: 'blunt',
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
        proficiency: 'blunt',
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
    },
    
    piercing_bolt: {
        id: 'piercing_bolt',
        name: 'Piercing Bolt',
        specialty: 'crossbow',
        proficiency: 'ranged',
        description: 'A bolt that punches through armor and enemies.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'aoe',
        mechanics: {
            damageMultiplier: 1.3,   // 130% per enemy
            armorPenetration: 0.75,  // Ignores 75% armor
            maxTargets: 2,           // Pierces to hit enemy behind
        },
        execute: function(user, targets, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            const results = targets.slice(0, this.mechanics.maxTargets).map(target => ({
                target,
                damage,
                armorPenetration: this.mechanics.armorPenetration
            }));
            return {
                type: 'pierce',
                results,
                totalDamage: results.reduce((sum, r) => sum + r.damage, 0)
            };
        }
    },
    
    fan_of_knives: {
        id: 'fan_of_knives',
        name: 'Fan of Knives',
        specialty: 'throwing',
        proficiency: 'ranged',
        description: 'Hurl projectiles in a wide cone.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'aoe',
        mechanics: {
            damageMultiplier: 0.8,   // 80% per enemy
            coneAngle: 90,           // 90 degree cone
            range: 3,
            maxTargets: 5,
        },
        execute: function(user, targets, actionDamage) {
            const damage = Math.floor(actionDamage * this.mechanics.damageMultiplier);
            const results = targets.slice(0, this.mechanics.maxTargets).map(target => ({
                target,
                damage
            }));
            return {
                type: 'cone_aoe',
                results,
                totalDamage: results.reduce((sum, r) => sum + r.damage, 0)
            };
        }
    },
    
    // === EXPERTISE ACTIONS ===
    spike_trap: {
        id: 'spike_trap',
        name: 'Spike Trap',
        specialty: 'traps',
        proficiency: 'expertise',
        requiresWeapon: false,  // Can use while holding any weapon
        description: 'Deploy a trap that damages and slows enemies.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'utility',
        mechanics: {
            baseDamage: 50,
            slowPercent: 0.5,     // 50% slow
            slowDuration: 3000,   // 3 seconds
            maxTraps: 3,
        },
        execute: function(user, position, specialtyLevel) {
            const damage = Math.floor(this.mechanics.baseDamage * (1 + (specialtyLevel - 5) * SKILL_CONFIG.actionScalingPerLevel));
            return {
                type: 'placed_trap',
                position,
                damage,
                slow: {
                    percent: this.mechanics.slowPercent,
                    duration: this.mechanics.slowDuration
                },
                maxTraps: this.mechanics.maxTraps
            };
        }
    },
    
    volatile_flask: {
        id: 'volatile_flask',
        name: 'Volatile Flask',
        specialty: 'potions',
        proficiency: 'expertise',
        requiresWeapon: false,
        description: 'Throw an explosive concoction.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'utility',
        mechanics: {
            baseDamage: 40,
            range: 4,
            aoeRadius: 1,  // 3x3 area
        },
        execute: function(user, position, specialtyLevel, targets) {
            const damage = Math.floor(this.mechanics.baseDamage * (1 + (specialtyLevel - 5) * SKILL_CONFIG.actionScalingPerLevel));
            const results = targets.map(target => ({
                target,
                damage
            }));
            return {
                type: 'thrown_aoe',
                position,
                results,
                totalDamage: results.reduce((sum, r) => sum + r.damage, 0)
            };
        }
    },
    
    expose_weakness: {
        id: 'expose_weakness',
        name: 'Expose Weakness',
        specialty: 'lockpicking',
        proficiency: 'expertise',
        requiresWeapon: false,
        description: 'Mark a target to take increased damage.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'debuff',
        mechanics: {
            baseDamageAmp: 0.25,   // +25% damage taken
            scalingPerLevel: 0.005, // +0.5% per level above 5
            duration: 8000,        // 8 seconds
        },
        execute: function(user, target, specialtyLevel) {
            const damageAmp = this.mechanics.baseDamageAmp + ((specialtyLevel - 5) * this.mechanics.scalingPerLevel);
            return {
                type: 'debuff',
                target,
                mark: {
                    damageAmplification: damageAmp,
                    duration: this.mechanics.duration
                }
            };
        }
    },
    
    deploy_turret: {
        id: 'deploy_turret',
        name: 'Deploy Turret',
        specialty: 'tinkering',
        proficiency: 'expertise',
        requiresWeapon: false,
        description: 'Construct a turret that attacks enemies.',
        cooldown: SKILL_CONFIG.defaultCooldown,
        type: 'summon',
        mechanics: {
            baseDamage: 15,
            attackInterval: 2000,  // Attack every 2 seconds
            duration: 15000,       // 15 seconds
            turretHp: 30,
            maxTurrets: 1,
        },
        execute: function(user, position, specialtyLevel) {
            const damage = Math.floor(this.mechanics.baseDamage * (1 + (specialtyLevel - 5) * SKILL_CONFIG.actionScalingPerLevel));
            const duration = this.mechanics.duration + ((specialtyLevel - 5) * 200); // +0.2s per level
            return {
                type: 'summon',
                position,
                turret: {
                    damage,
                    attackInterval: this.mechanics.attackInterval,
                    duration,
                    hp: this.mechanics.turretHp
                },
                maxTurrets: this.mechanics.maxTurrets
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
    return prof ? (prof.specializations || []) : [];
}

// ============================================================================
// XP AND LEVELING FUNCTIONS
// ============================================================================

/**
 * Calculate XP required for next level
 * Uses: 100 * level^1.5 curve
 */
function getXpForNextLevel(currentLevel) {
    return Math.floor(100 * Math.pow(currentLevel + 1, 1.5));
}

/**
 * Award skill XP when enemy is killed
 * Splits XP between proficiency (40%) and specialty (60%)
 * 
 * @param {Object} player - Player object with skills
 * @param {string} specialtyId - The specialty of the weapon used (e.g., 'knife')
 * @param {number} xpAmount - Total XP to award
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

    // Calculate XP split
    const profXp = Math.floor(xpAmount * SKILL_CONFIG.xpSplitProficiency);
    const specXp = Math.floor(xpAmount * SKILL_CONFIG.xpSplitSpecialty);

    console.log(`[SkillXP] ${xpAmount} XP -> ${proficiencyId}: +${profXp}, ${normalizedSpecialtyId}: +${specXp}`);

    // Award proficiency XP
    addProficiencyXp(player, proficiencyId, profXp);

    // Award specialty XP
    addSpecialtyXp(player, normalizedSpecialtyId, specXp);
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
    const specialtyLevel = player.skills.specialties[action.specialty].level;
    const proficiencyLevel = player.skills.proficiencies[action.proficiency].level;
    
    // Calculate action damage
    const actionDamage = calculateActionDamage(player, action, specialtyLevel, proficiencyLevel);
    
    // Execute the action
    let result;
    if (action.proficiency === 'expertise') {
        // Expertise actions have different execute signatures
        result = action.execute(player, target, specialtyLevel);
    } else {
        result = action.execute(player, target, actionDamage);
    }
    
    // Start cooldown
    player.skills.actionCooldowns[actionId] = action.cooldown;
    
    console.log(`Used ${action.name}!`, result);
    
    return result;
}

/**
 * Calculate damage for a weapon-based action
 */
function calculateActionDamage(player, action, specialtyLevel, proficiencyLevel) {
    // Get base weapon damage
    const weapon = player.equipped?.MAIN;
    const baseWeaponDamage = weapon?.damage || 10;  // Default if no weapon
    
    // Apply proficiency bonus
    const profBonus = 1 + (proficiencyLevel * SKILL_CONFIG.proficiencyBonusPerLevel);
    
    // Apply specialty bonus
    const specBonus = 1 + (specialtyLevel * SKILL_CONFIG.specialtyBonusPerLevel);
    
    // Apply action scaling (levels above 5)
    const actionScaling = 1 + ((specialtyLevel - SKILL_CONFIG.actionUnlockLevel) * SKILL_CONFIG.actionScalingPerLevel);
    
    return Math.floor(baseWeaponDamage * profBonus * specBonus * actionScaling);
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
 * Get total damage multiplier from proficiency and specialization
 * Uses MULTIPLICATIVE formula: (1 + ProfLevel × 0.02) × (1 + SpecLevel × 0.02)
 * Max at 100/100: (1 + 2.0) × (1 + 2.0) = 9.0x damage
 *
 * @param {Object} player - Player object with skills
 * @param {string} proficiencyId - The proficiency type (melee, ranged, magic)
 * @param {number} specLevel - Optional specialization level (default 0)
 */
function getSkillDamageMultiplier(player, proficiencyId, specLevel = 0) {
    if (!player.skills) return 1;

    // Map legacy specialty IDs to new proficiency IDs
    const mappedProfId = LEGACY_PROFICIENCY_MAP[proficiencyId] || proficiencyId;

    const profLevel = player.skills.proficiencies[mappedProfId]?.level || 0;

    // Multiplicative formula
    const profMult = 1 + (profLevel * SKILL_CONFIG.proficiencyBonusPerLevel);
    const specMult = 1 + (specLevel * SKILL_CONFIG.specializationBonusPerLevel);

    return profMult * specMult;
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
 * Get damage reduction from defense proficiency
 * @returns {number} Damage reduction as decimal (0-0.20 at level 100)
 */
function getDefenseDamageReduction(player) {
    if (!player.skills) return 0;
    const defLevel = player.skills.proficiencies.defense?.level || 0;
    return defLevel * 0.002; // 0.2% per level, max 20% at level 100
}

/**
 * Get bonus HP from vitality proficiency
 */
function getVitalityBonusHp(player) {
    if (!player.skills) return 0;
    const vitLevel = player.skills.proficiencies.vitality?.level || 0;
    return vitLevel * SKILL_CONFIG.vitalityHpPerLevel;
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
 * Initialize player skills from persistentState (or create fresh if none exists)
 * Skills are PERMANENT and stored in persistentState, never lost on death
 */
function initializePlayerSkills(player) {
    if (!player) {
        console.warn('initializePlayerSkills called without player');
        return;
    }

    // Check for saved skills in persistentState
    if (typeof persistentState !== 'undefined' && persistentState.skills) {
        // Load saved skills
        player.skills = JSON.parse(JSON.stringify(persistentState.skills));
        console.log('✓ Player skills loaded from persistentState');
    } else {
        // Create fresh skills (new save)
        player.skills = createFreshSkills();
        console.log('✓ Player skills initialized (fresh)');
    }

    // Ensure actionCooldowns exists (might be missing from old saves)
    if (!player.skills.actionCooldowns) {
        player.skills.actionCooldowns = {};
    }

    // Always reset action cooldowns (session-specific)
    for (const actionId in ACTIONS) {
        player.skills.actionCooldowns[actionId] = 0;
    }

    // Sync back to persistentState
    saveSkillsToPersistentState(player);
}

/**
 * Create fresh skills structure for new saves
 */
function createFreshSkills() {
    const skills = {
        // New Soul & Body proficiencies
        proficiencies: {
            melee: { level: 0, xp: 0, xpToNext: 100 },
            ranged: { level: 0, xp: 0, xpToNext: 100 },
            magic: { level: 0, xp: 0, xpToNext: 100 },
            defense: { level: 0, xp: 0, xpToNext: 100 },
            vitality: { level: 0, xp: 0, xpToNext: 100 }
        },
        // Specializations (unlock slots at prof level 25, 50, 75, 100)
        specializations: {
            melee: [],    // Each entry: { type: 'blade', level: 0, xp: 0, xpToNext: 100 }
            ranged: [],
            magic: [],
            defense: [],
            vitality: []
        },
        // Legacy specialties for backwards compatibility
        specialties: {},
        unlockedActions: [],
        actionCooldowns: {}
    };

    // Initialize legacy specialties for backwards compatibility
    for (const specId in SPECIALTIES) {
        skills.specialties[specId] = {
            level: 0,
            xp: 0,
            xpToNext: getXpForNextLevel(0),
            unlocked: false
        };
    }

    // Unarmed starts unlocked
    if (skills.specialties.unarmed) {
        skills.specialties.unarmed.level = 1;
        skills.specialties.unarmed.unlocked = true;
    }

    return skills;
}

/**
 * Save skills to persistentState (call after any skill change)
 */
function saveSkillsToPersistentState(player) {
    if (!player || !player.skills) return;
    if (typeof persistentState === 'undefined') return;

    // Deep copy skills to persistentState (excluding cooldowns)
    const skillsToSave = {
        proficiencies: JSON.parse(JSON.stringify(player.skills.proficiencies)),
        specializations: JSON.parse(JSON.stringify(player.skills.specializations || {})),
        specialties: JSON.parse(JSON.stringify(player.skills.specialties)),
        unlockedActions: [...player.skills.unlockedActions]
    };

    persistentState.skills = skillsToSave;
}

/**
 * Reset skills on death - DOES NOTHING in Soul & Body model
 * Skills are permanent and never lost. This function exists for backwards compatibility.
 */
function resetPlayerSkills(player) {
    // In Soul & Body model, skills NEVER reset on death
    // Only action cooldowns reset
    if (player?.skills?.actionCooldowns) {
        for (const actionId in player.skills.actionCooldowns) {
            player.skills.actionCooldowns[actionId] = 0;
        }
    }
    console.log('[Soul & Body] Skills preserved on death (action cooldowns reset)');
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
    saveSkillsToPersistentState(player);
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
    saveSkillsToPersistentState(player);
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
    saveSkillsToPersistentState(player);
}

/**
 * Award Defense proficiency XP (called when taking damage)
 * @param {Object} player - Player object
 * @param {number} damageTaken - Amount of damage taken
 */
function awardDefenseXp(player, damageTaken) {
    if (!player?.skills) return;
    const xp = Math.max(1, Math.floor(damageTaken * 0.3)); // 0.3 XP per damage taken
    addProficiencyXp(player, 'defense', xp);
    saveSkillsToPersistentState(player);
}

/**
 * Award Vitality proficiency XP (called ONLY on effective healing)
 * Only HP actually restored counts - overheal does NOT give XP
 * @param {Object} player - Player object
 * @param {number} effectiveHealing - Actual HP restored (not raw heal amount)
 */
function awardVitalityXp(player, effectiveHealing) {
    if (!player?.skills) return;
    if (effectiveHealing <= 0) return; // No XP for 0 or negative healing
    const xp = Math.max(1, Math.floor(effectiveHealing * 0.5)); // 0.5 XP per HP restored
    addProficiencyXp(player, 'vitality', xp);
    saveSkillsToPersistentState(player);
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
// EXPORTS (Soul & Body Model)
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

// Soul & Body XP functions
window.awardMeleeXp = awardMeleeXp;
window.awardRangedXp = awardRangedXp;
window.awardMagicXp = awardMagicXp;
window.awardDefenseXp = awardDefenseXp;
window.awardVitalityXp = awardVitalityXp;

window.canUseAction = canUseAction;
window.useAction = useAction;
window.updateActionCooldowns = updateActionCooldowns;

// Soul & Body bonus calculation
window.getSkillDamageMultiplier = getSkillDamageMultiplier;
window.getMeleeDamageMultiplier = getMeleeDamageMultiplier;
window.getRangedDamageMultiplier = getRangedDamageMultiplier;
window.getMagicDamageMultiplier = getMagicDamageMultiplier;
window.getDefenseDamageReduction = getDefenseDamageReduction;
window.getVitalityBonusHp = getVitalityBonusHp;
window.getSpecialtyBonuses = getSpecialtyBonuses;

// Initialization & persistence
window.initializePlayerSkills = initializePlayerSkills;
window.resetPlayerSkills = resetPlayerSkills;
window.createFreshSkills = createFreshSkills;
window.saveSkillsToPersistentState = saveSkillsToPersistentState;

window.debugPrintSkills = debugPrintSkills;
window.debugGrantXp = debugGrantXp;

console.log('âœ“ Skills system loaded');
console.log(`  ${Object.keys(PROFICIENCIES).length} proficiencies`);
console.log(`  ${Object.keys(SPECIALTIES).length} specialties`);
console.log(`  ${Object.keys(ACTIONS).length} actions`);

// ============================================================================
console.log('✓ Skills system loaded (Soul & Body Model)');
console.log(`  ${Object.keys(PROFICIENCIES).length} proficiencies: melee, ranged, magic, defense, vitality`);
console.log(`  ${Object.keys(SPECIALTIES).length} legacy specialties (backwards compatible)`);// ============================================================================
// SYSTEM MANAGER REGISTRATION - Add to end of skill-system.js
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
    console.warn('⚠️ SystemManager not found - skill-system running standalone');
}

console.log('✅ Skill system loaded (with SystemManager)');
