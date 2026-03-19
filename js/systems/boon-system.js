// ============================================================================
// BOON SYSTEM - "THE ECHOES" (Soul & Body Model)
// ============================================================================
// Session-based power-ups acquired at shrines, themed around 7 Ancestors
// Boons are LOST on death - they provide temporary run bonuses
//
// TIERS:
//   - Core (21): 3 per Ancestor, always available
//   - Resonance (42): Requires 1 boon from each of 2 different Ancestors
//   - Legendary (7): Requires 3 boons from the same Ancestor
//
// Formula: Power = (Gear_Base × Skill_Mult) × (1 + Boon_Bonus)
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const BOON_CONFIG = {
    maxBoons: 8,                // Max boons player can hold (increased for new system)
    shrineBoonsOffered: 3,      // How many boons shrine offers
    clearOnDeath: true,         // Boons are lost on death

    // Tier unlock requirements
    resonanceRequirement: 1,    // Need 1 boon from each of 2 ancestors
    legendaryRequirement: 3,    // Need 3 boons from same ancestor
};

// ============================================================================
// THE ANCESTORS (7 Progenitors)
// ============================================================================

const ANCESTORS = {
    torchbearer: {
        id: 'torchbearer',
        name: 'The Torchbearer',
        title: 'Bearer of the First Light',
        element: 'fire',
        color: '#e67e22',
        icon: String.fromCodePoint(0x1F525), // 🔥
        theme: 'Light manipulation, fire damage, visibility',
        synergyThreshold: 3,
        synergyBonus: {
            id: 'torchbearer_synergy', name: 'Blazing Legacy',
            description: 'All fire damage +25%. Attacks have 15% chance to ignite.',
            effects: [
                { stat: 'fireDamagePercent', value: 25, type: 'additive' },
                { stat: 'igniteChance', value: 15, type: 'additive' }
            ]
        }
    },
    headsman: {
        id: 'headsman',
        name: 'The Headsman',
        title: 'The Executioner',
        element: 'physical',
        color: '#c0392b',
        icon: String.fromCodePoint(0x2694), // ⚔
        theme: 'Execution, bleeding, critical strikes',
        synergyThreshold: 3,
        synergyBonus: {
            id: 'headsman_synergy', name: 'Executioner\'s Edge',
            description: 'Critical damage +30%. Critical hits restore 10 stamina.',
            effects: [
                { stat: 'critDamage', value: 30, type: 'additive' },
                { stat: 'staminaKillRefund', value: 10, type: 'additive' }
            ]
        }
    },
    lurker: {
        id: 'lurker',
        name: 'The Lurker',
        title: 'Shadow Walker',
        element: 'shadow',
        color: '#2c3e50',
        icon: String.fromCodePoint(0x1F441), // 👁
        theme: 'Stealth, ambush, fear, darkness',
        synergyThreshold: 3,
        synergyBonus: {
            id: 'lurker_synergy', name: 'Shadow Mastery',
            description: 'Shadow damage +25%. +10% lifesteal.',
            effects: [
                { stat: 'shadowDamagePercent', value: 25, type: 'additive' },
                { stat: 'lifestealPercent', value: 10, type: 'additive' }
            ]
        }
    },
    storm_caller: {
        id: 'storm_caller',
        name: 'The Storm-Caller',
        title: 'Voice of Thunder',
        element: 'lightning',
        color: '#9b59b6',
        icon: String.fromCodePoint(0x26A1), // ⚡
        theme: 'Speed, movement, knockback, momentum',
        synergyThreshold: 3,
        synergyBonus: {
            id: 'storm_caller_synergy', name: 'Tempest Fury',
            description: 'Attack speed +15%. Cooldown reduction +15%.',
            effects: [
                { stat: 'attackSpeed', value: 15, type: 'multiplicative' },
                { stat: 'cooldownReduction', value: 15, type: 'additive' }
            ]
        }
    },
    rot_weaver: {
        id: 'rot_weaver',
        name: 'The Rot-Weaver',
        title: 'Lord of Decay',
        element: 'poison',
        color: '#27ae60',
        icon: String.fromCodePoint(0x2620), // ☠
        theme: 'Poison, DoT, armor reduction, life steal',
        synergyThreshold: 3,
        synergyBonus: {
            id: 'rot_weaver_synergy', name: 'Plague Bearer',
            description: 'Poison damage +25%. 15% chance to poison on hit.',
            effects: [
                { stat: 'poisonDamagePercent', value: 25, type: 'additive' },
                { stat: 'poisonChance', value: 15, type: 'additive' }
            ]
        }
    },
    iron_warden: {
        id: 'iron_warden',
        name: 'The Iron-Warden',
        title: 'The Immovable',
        element: 'ice',
        color: '#3498db',
        icon: String.fromCodePoint(0x1F9CA), // 🧊
        theme: 'Defense, frost, standing ground, armor',
        synergyThreshold: 3,
        synergyBonus: {
            id: 'iron_warden_synergy', name: 'Frozen Bastion',
            description: 'Ice resistance +30%. Thorns damage +8.',
            effects: [
                { stat: 'iceResist', value: 30, type: 'additive' },
                { stat: 'thornsDamage', value: 8, type: 'additive' }
            ]
        }
    },
    maniac: {
        id: 'maniac',
        name: 'The Maniac',
        title: 'The Unhinged',
        element: 'chaos',
        color: '#e74c3c',
        icon: String.fromCodePoint(0x1F608), // 😈
        theme: 'Risk/reward, self-damage, extreme power',
        synergyThreshold: 3,
        synergyBonus: {
            id: 'maniac_synergy', name: 'Chaos Incarnate',
            description: 'All damage +15%. Gold find +25%.',
            effects: [
                { stat: 'damage', value: 15, type: 'multiplicative' },
                { stat: 'goldFindPercent', value: 25, type: 'additive' }
            ]
        }
    }
};

// ============================================================================
// BOON DEFINITIONS (70 Total: 21 Core + 42 Resonance + 7 Legendary)
// ============================================================================

const BOONS = {
    // ========================================================================
    // TIER 2: CORE BOONS - TORCHBEARER (Fire/Light)
    // ========================================================================

    searing_radiance: {
        id: 'searing_radiance',
        name: 'Searing Radiance',
        description: '+15% DMG to enemies in your Light Radius',
        lore: 'The dark fears you.',
        icon: String.fromCodePoint(0x2600), // ☀
        color: '#e67e22',
        ancestor: 'torchbearer',
        tier: 'core',
        stackable: true,
        maxStacks: 2,
        effect: { type: 'conditional_damage', condition: 'in_light', value: 0.15 },
        getBonus: (stacks = 1) => ({ lightDamageBonus: 0.15 * stacks })
    },

    kindled_blade: {
        id: 'kindled_blade',
        name: 'Kindled Blade',
        description: 'Attacks apply Ignite (fire DoT)',
        lore: 'Carry the flame.',
        icon: String.fromCodePoint(0x1F525), // 🔥
        color: '#e67e22',
        ancestor: 'torchbearer',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_hit', applies: 'ignite' },
        getBonus: () => ({ appliesIgnite: true })
    },

    desperate_ember: {
        id: 'desperate_ember',
        name: 'Desperate Ember',
        description: 'Below 30% HP: 2x Light Radius',
        lore: 'Hope roars.',
        icon: String.fromCodePoint(0x1F31F), // 🌟
        color: '#e67e22',
        ancestor: 'torchbearer',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'threshold', condition: 'hp_below_30', stat: 'lightRadius', multiplier: 2 },
        getBonus: () => ({ lowHpLightBonus: true })
    },

    // ========================================================================
    // TIER 2: CORE BOONS - HEADSMAN (Physical/Execution)
    // ========================================================================

    rusted_edge: {
        id: 'rusted_edge',
        name: 'Rusted Edge',
        description: 'Critical hits apply Slow',
        lore: 'Iron cares not.',
        icon: String.fromCodePoint(0x1F5E1), // 🗡
        color: '#c0392b',
        ancestor: 'headsman',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_crit', applies: 'slow' },
        getBonus: () => ({ critAppliesSlow: true })
    },

    the_cull: {
        id: 'the_cull',
        name: 'The Cull',
        description: '2x DMG to enemies below 20% HP',
        lore: 'End it quickly.',
        icon: String.fromCodePoint(0x2620), // ☠
        color: '#c0392b',
        ancestor: 'headsman',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'execute', threshold: 0.20, multiplier: 2 },
        getBonus: () => ({ executeDamage: 2.0, executeThreshold: 0.20 })
    },

    executioners_gait: {
        id: 'executioners_gait',
        name: "Executioner's Gait",
        description: 'Kills grant +20% Move Speed for 3s',
        lore: 'Momentum is key.',
        icon: String.fromCodePoint(0x1F3C3), // 🏃
        color: '#c0392b',
        ancestor: 'headsman',
        tier: 'core',
        stackable: true,
        maxStacks: 2,
        effect: { type: 'on_kill', grants: 'speed_buff', duration: 3, value: 0.20 },
        getBonus: (stacks = 1) => ({ killSpeedBonus: 0.20 * stacks, killSpeedDuration: 3 })
    },

    // ========================================================================
    // TIER 2: CORE BOONS - LURKER (Shadow/Stealth)
    // ========================================================================

    cloak_of_shadows: {
        id: 'cloak_of_shadows',
        name: 'Cloak of Shadows',
        description: 'Torch OFF: +15% Dodge Chance',
        lore: 'Be nowhere.',
        icon: String.fromCodePoint(0x1F319), // 🌙
        color: '#2c3e50',
        ancestor: 'lurker',
        tier: 'core',
        stackable: true,
        maxStacks: 2,
        effect: { type: 'conditional', condition: 'torch_off', stat: 'dodge', value: 0.15 },
        getBonus: (stacks = 1) => ({ darkDodgeBonus: 0.15 * stacks })
    },

    deep_cut: {
        id: 'deep_cut',
        name: 'Deep Cut',
        description: 'Ambush attacks deal 300% DMG',
        lore: 'Never saw it coming.',
        icon: String.fromCodePoint(0x1F5E1), // 🗡
        color: '#2c3e50',
        ancestor: 'lurker',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'ambush_bonus', multiplier: 3.0 },
        getBonus: () => ({ ambushDamageMultiplier: 3.0 })
    },

    unseen_terror: {
        id: 'unseen_terror',
        name: 'Unseen Terror',
        description: 'Backstab attacks cause Fear',
        lore: 'Fear cuts deep.',
        icon: String.fromCodePoint(0x1F47B), // 👻
        color: '#2c3e50',
        ancestor: 'lurker',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_backstab', applies: 'fear' },
        getBonus: () => ({ backstabCausesFear: true })
    },

    // ========================================================================
    // TIER 2: CORE BOONS - STORM-CALLER (Lightning/Speed)
    // ========================================================================

    static_buildup: {
        id: 'static_buildup',
        name: 'Static Buildup',
        description: 'Moving 10 tiles grants +50% DMG on next attack',
        lore: 'Keep moving.',
        icon: String.fromCodePoint(0x26A1), // ⚡
        color: '#9b59b6',
        ancestor: 'storm_caller',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'movement_charge', tiles: 10, bonus: 0.50 },
        getBonus: () => ({ movementChargeBonus: 0.50, movementChargeTiles: 10 })
    },

    thunderclap_dash: {
        id: 'thunderclap_dash',
        name: 'Thunderclap Dash',
        description: '+50% Dash Distance, burst of speed after dash',
        lore: 'Gone in a flash.',
        icon: String.fromCodePoint(0x1F4A8), // 💨
        color: '#9b59b6',
        ancestor: 'storm_caller',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'dash_enhance', distanceBonus: 0.50, speedBurst: true },
        getBonus: () => ({ dashDistanceBonus: 0.50, dashSpeedBurst: true })
    },

    kinetic_discharge: {
        id: 'kinetic_discharge',
        name: 'Kinetic Discharge',
        description: 'Taking damage knocks back nearby enemies',
        lore: 'Too close.',
        icon: String.fromCodePoint(0x1F4A5), // 💥
        color: '#9b59b6',
        ancestor: 'storm_caller',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_hit_taken', triggers: 'knockback_aoe' },
        getBonus: () => ({ damageKnockback: true })
    },

    // ========================================================================
    // TIER 2: CORE BOONS - ROT-WEAVER (Poison/Decay)
    // ========================================================================

    corrosive_touch: {
        id: 'corrosive_touch',
        name: 'Corrosive Touch',
        description: 'Attacks apply Rot (-10% Armor per stack)',
        lore: 'All crumbles.',
        icon: String.fromCodePoint(0x1F9EA), // 🧪
        color: '#27ae60',
        ancestor: 'rot_weaver',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_hit', applies: 'rot', armorReduction: 0.10 },
        getBonus: () => ({ appliesRot: true, rotArmorReduction: 0.10 })
    },

    festering_wounds: {
        id: 'festering_wounds',
        name: 'Festering Wounds',
        description: 'Enemies with DoT take +10% DMG',
        lore: 'Open cuts.',
        icon: String.fromCodePoint(0x1F489), // 💉
        color: '#27ae60',
        ancestor: 'rot_weaver',
        tier: 'core',
        stackable: true,
        maxStacks: 3,
        effect: { type: 'conditional_damage', condition: 'has_dot', value: 0.10 },
        getBonus: (stacks = 1) => ({ dotTargetDamageBonus: 0.10 * stacks })
    },

    leech_spores: {
        id: 'leech_spores',
        name: 'Leech Spores',
        description: 'Killing a Rotted enemy heals 5 HP',
        lore: 'Life feeds on life.',
        icon: String.fromCodePoint(0x1F33F), // 🌿
        color: '#27ae60',
        ancestor: 'rot_weaver',
        tier: 'core',
        stackable: true,
        maxStacks: 2,
        effect: { type: 'on_kill', condition: 'target_rotted', heals: 5 },
        getBonus: (stacks = 1) => ({ rotKillHeal: 5 * stacks })
    },

    // ========================================================================
    // TIER 2: CORE BOONS - IRON-WARDEN (Ice/Defense)
    // ========================================================================

    stone_stance: {
        id: 'stone_stance',
        name: 'Stone Stance',
        description: 'Standing still for 1s grants +30% Damage Reduction',
        lore: 'The mountain does not bow.',
        icon: String.fromCodePoint(0x1FAA8), // 🪨
        color: '#3498db',
        ancestor: 'iron_warden',
        tier: 'core',
        stackable: true,
        maxStacks: 2,
        effect: { type: 'stationary_buff', delay: 1, stat: 'damageReduction', value: 0.30 },
        getBonus: (stacks = 1) => ({ stationaryDR: 0.30 * stacks })
    },

    glacial_pace: {
        id: 'glacial_pace',
        name: 'Glacial Pace',
        description: 'Attacks apply Chill (slows enemy)',
        lore: "Winter's grip.",
        icon: String.fromCodePoint(0x2744), // ❄
        color: '#3498db',
        ancestor: 'iron_warden',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_hit', applies: 'chill' },
        getBonus: () => ({ appliesChill: true })
    },

    shatter_strike: {
        id: 'shatter_strike',
        name: 'Shatter Strike',
        description: '+40% DMG vs Chilled/Frozen enemies',
        lore: 'Break the brittle.',
        icon: String.fromCodePoint(0x1F4A0), // 💠
        color: '#3498db',
        ancestor: 'iron_warden',
        tier: 'core',
        stackable: true,
        maxStacks: 2,
        effect: { type: 'conditional_damage', condition: 'target_chilled', value: 0.40 },
        getBonus: (stacks = 1) => ({ chilledDamageBonus: 0.40 * stacks })
    },

    // ========================================================================
    // TIER 2: CORE BOONS - MANIAC (Chaos/Risk)
    // ========================================================================

    frenzied_swing: {
        id: 'frenzied_swing',
        name: 'Frenzied Swing',
        description: '+25% Attack Speed, but +10% Damage Taken',
        lore: 'Bleed faster.',
        icon: String.fromCodePoint(0x1F4AB), // 💫
        color: '#e74c3c',
        ancestor: 'maniac',
        tier: 'core',
        stackable: true,
        maxStacks: 2,
        effect: { type: 'tradeoff', bonus: { attackSpeed: 0.25 }, penalty: { damageTaken: 0.10 } },
        getBonus: (stacks = 1) => ({ attackSpeedBonus: 0.25 * stacks, damageTakenPenalty: 0.10 * stacks })
    },

    blood_for_fuel: {
        id: 'blood_for_fuel',
        name: 'Blood for Fuel',
        description: '+50% Torch Duration, but drains 1 HP/5s',
        lore: 'Burn essence.',
        icon: String.fromCodePoint(0x1FA78), // 🩸
        color: '#e74c3c',
        ancestor: 'maniac',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'tradeoff', bonus: { torchDuration: 0.50 }, penalty: { hpDrain: 0.2 } },
        getBonus: () => ({ torchDurationBonus: 0.50, hpDrainPerSecond: 0.2 })
    },

    glass_cannon: {
        id: 'glass_cannon',
        name: 'Glass Cannon',
        description: '2x Damage, but 50% Max HP',
        lore: 'Fragile perfection.',
        icon: String.fromCodePoint(0x1F52E), // 🔮
        color: '#e74c3c',
        ancestor: 'maniac',
        tier: 'core',
        stackable: false,
        maxStacks: 1,
        effect: { type: 'tradeoff', bonus: { damageMultiplier: 2.0 }, penalty: { maxHpMultiplier: 0.5 } },
        getBonus: () => ({ damageMultiplier: 2.0, maxHpMultiplier: 0.5 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - TORCHBEARER + HEADSMAN (Fire + Physical)
    // ========================================================================

    cauterize: {
        id: 'cauterize',
        name: 'Cauterize',
        description: 'Crits on Burning enemies consume Burn for burst DMG',
        lore: 'Fire cleanses the wound.',
        icon: String.fromCodePoint(0x1F525), // 🔥
        color: '#d35400',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'headsman'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'crit_consume', condition: 'burning', bonus: 'burst_damage' },
        getBonus: () => ({ burnCritConsume: true })
    },

    spotlight: {
        id: 'spotlight',
        name: 'Spotlight',
        description: 'First hit on full HP enemy in light: Undodgeable + Bleed',
        lore: 'Nowhere to hide.',
        icon: String.fromCodePoint(0x1F526), // 🔦
        color: '#d35400',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'headsman'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'first_strike', condition: 'in_light_full_hp', undodgeable: true, applies: 'bleed' },
        getBonus: () => ({ spotlightStrike: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - TORCHBEARER + LURKER (Fire + Shadow)
    // ========================================================================

    eclipse_flame: {
        id: 'eclipse_flame',
        name: 'Eclipse Flame',
        description: 'Torch emits "Black Fire" - visible to you, dark to enemies',
        lore: 'Light casting shadow.',
        icon: String.fromCodePoint(0x1F311), // 🌑
        color: '#8e44ad',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'lurker'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'torch_modify', mode: 'black_fire' },
        getBonus: () => ({ blackFireTorch: true })
    },

    flashbang: {
        id: 'flashbang',
        name: 'Flashbang',
        description: 'Turning Torch ON stuns nearby enemies for 1s',
        lore: 'Blind them.',
        icon: String.fromCodePoint(0x1F4A1), // 💡
        color: '#8e44ad',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'lurker'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'torch_toggle', on_activate: 'stun_aoe', duration: 1 },
        getBonus: () => ({ torchOnStuns: true, torchStunDuration: 1 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - TORCHBEARER + STORM-CALLER (Fire + Speed)
    // ========================================================================

    after_image: {
        id: 'after_image',
        name: 'After-Image',
        description: 'Dash leaves a light echo that distracts enemies',
        lore: 'A burning memory.',
        icon: String.fromCodePoint(0x1F4AB), // 💫
        color: '#e67e22',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'storm_caller'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'dash_effect', creates: 'light_decoy' },
        getBonus: () => ({ dashCreatesDecoy: true })
    },

    photosynthesis: {
        id: 'photosynthesis',
        name: 'Photosynthesis',
        description: 'Standing in light stacks Move Speed (+5% per second, max +20%)',
        lore: 'Fed by the light.',
        icon: String.fromCodePoint(0x2600), // ☀
        color: '#e67e22',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'storm_caller'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'light_stacking', stat: 'moveSpeed', perSecond: 0.05, max: 0.20 },
        getBonus: () => ({ lightSpeedStacking: true, lightSpeedMax: 0.20 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - TORCHBEARER + ROT-WEAVER (Fire + Poison)
    // ========================================================================

    fever_dreams: {
        id: 'fever_dreams',
        name: 'Fever Dreams',
        description: 'Burning enemies take +40% DoT damage',
        lore: 'Sweat out the sickness.',
        icon: String.fromCodePoint(0x1F321), // 🌡
        color: '#d4ac0d',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'rot_weaver'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'synergy', condition: 'burning', bonus: { dotDamage: 0.40 } },
        getBonus: () => ({ burningDotBonus: 0.40 })
    },

    swamp_gas: {
        id: 'swamp_gas',
        name: 'Swamp Gas',
        description: 'Enemies with both Burn and Rot explode on death',
        lore: 'Volatile mixture.',
        icon: String.fromCodePoint(0x1F4A5), // 💥
        color: '#d4ac0d',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'rot_weaver'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'death_effect', condition: 'burn_and_rot', triggers: 'explosion' },
        getBonus: () => ({ burnRotExplosion: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - TORCHBEARER + IRON-WARDEN (Fire + Ice)
    // ========================================================================

    thaw: {
        id: 'thaw',
        name: 'Thaw',
        description: 'Fire damage strips 100% Armor from Frozen enemies',
        lore: 'Fire breaks ice.',
        icon: String.fromCodePoint(0x1F525), // 🔥
        color: '#1abc9c',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'armor_strip', condition: 'frozen', element: 'fire', value: 1.0 },
        getBonus: () => ({ fireStripsFrozenArmor: true })
    },

    the_lighthouse: {
        id: 'the_lighthouse',
        name: 'The Lighthouse',
        description: 'Stand still 2s: +50% Light Radius + HP Regen',
        lore: 'A beacon in the storm.',
        icon: String.fromCodePoint(0x1F3DB), // 🏛
        color: '#1abc9c',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'stationary_buff', delay: 2, bonus: { lightRadius: 0.50, hpRegen: true } },
        getBonus: () => ({ lighthouseMode: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - TORCHBEARER + MANIAC (Fire + Chaos)
    // ========================================================================

    immolation_aura: {
        id: 'immolation_aura',
        name: 'Immolation Aura',
        description: 'You burn (1 dmg/s); Nearby enemies burn for 2x',
        lore: 'Burn brighter.',
        icon: String.fromCodePoint(0x1F525), // 🔥
        color: '#c0392b',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'aura', selfDamage: 1, enemyDamage: 2, element: 'fire' },
        getBonus: () => ({ immolationAura: true, immolationSelfDamage: 1, immolationEnemyDamage: 2 })
    },

    life_of_the_flame: {
        id: 'life_of_the_flame',
        name: 'Life of the Flame',
        description: 'Torch ON: Regenerate 1% Max HP per second',
        lore: 'The flame sustains.',
        icon: String.fromCodePoint(0x1F56F), // 🕯
        color: '#c0392b',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'torch_on_regen', hpPercentPerSecond: 0.01 },
        getBonus: () => ({ torchOnRegen: true, torchRegenPercent: 0.01 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - HEADSMAN + LURKER (Physical + Shadow)
    // ========================================================================

    throat_slit: {
        id: 'throat_slit',
        name: 'Throat Slit',
        description: 'Ambush attacks cause permanent Bleed',
        lore: 'Silence them.',
        icon: String.fromCodePoint(0x1FA78), // 🩸
        color: '#6c3483',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'lurker'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'ambush_effect', applies: 'permanent_bleed' },
        getBonus: () => ({ ambushPermanentBleed: true })
    },

    silence_the_weak: {
        id: 'silence_the_weak',
        name: 'Silence the Weak',
        description: 'Critical kills prevent nearby enemy aggro',
        lore: 'Do not alert the herd.',
        icon: String.fromCodePoint(0x1F910), // 🤐
        color: '#6c3483',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'lurker'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_crit_kill', prevents: 'aggro_spread' },
        getBonus: () => ({ silentCritKills: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - HEADSMAN + STORM-CALLER (Physical + Speed)
    // ========================================================================

    running_start: {
        id: 'running_start',
        name: 'Running Start',
        description: 'Sprinting attack: +100% Knockback + Bleed',
        lore: 'Force equals mass times acceleration.',
        icon: String.fromCodePoint(0x1F3C3), // 🏃
        color: '#8e44ad',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'storm_caller'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'sprint_attack', knockbackBonus: 1.0, applies: 'bleed' },
        getBonus: () => ({ sprintAttackKnockback: 1.0, sprintAttackBleeds: true })
    },

    blood_trail: {
        id: 'blood_trail',
        name: 'Blood Trail',
        description: '+20% Speed when moving toward Bleeding targets',
        lore: 'Smell the fear.',
        icon: String.fromCodePoint(0x1F43A), // 🐺
        color: '#8e44ad',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'storm_caller'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'conditional_speed', condition: 'toward_bleeding', value: 0.20 },
        getBonus: () => ({ bloodTrailSpeed: 0.20 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - HEADSMAN + ROT-WEAVER (Physical + Poison)
    // ========================================================================

    septic_wound: {
        id: 'septic_wound',
        name: 'Septic Wound',
        description: 'Bleeding enemies gain 1 Rot stack per second',
        lore: 'Infection enters here.',
        icon: String.fromCodePoint(0x1F9A0), // 🦠
        color: '#196f3d',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'rot_weaver'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'status_synergy', condition: 'bleeding', applies: 'rot', rate: 1 },
        getBonus: () => ({ bleedAppliesRot: true })
    },

    open_sores: {
        id: 'open_sores',
        name: 'Open Sores',
        description: '+50% Crit Damage vs Rotted enemies',
        lore: 'Exposed.',
        icon: String.fromCodePoint(0x1F4A2), // 💢
        color: '#196f3d',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'rot_weaver'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'conditional_crit', condition: 'rotted', value: 0.50 },
        getBonus: () => ({ rotCritDamageBonus: 0.50 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - HEADSMAN + IRON-WARDEN (Physical + Ice)
    // ========================================================================

    shatter: {
        id: 'shatter',
        name: 'Shatter',
        description: 'Heavy hit on Frozen enemy deals 20% Max HP damage',
        lore: 'Fragments.',
        icon: String.fromCodePoint(0x1F4A5), // 💥
        color: '#2e86ab',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'execute', condition: 'frozen', percentMaxHp: 0.20 },
        getBonus: () => ({ frozenShatter: true, shatterDamage: 0.20 })
    },

    spiked_armor: {
        id: 'spiked_armor',
        name: 'Spiked Armor',
        description: 'Getting hit reflects damage and applies Bleed to attacker',
        lore: 'To touch is to bleed.',
        icon: String.fromCodePoint(0x1F6E1), // 🛡
        color: '#2e86ab',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'reflect', reflects: true, applies: 'bleed' },
        getBonus: () => ({ reflectDamage: true, reflectAppliesBleed: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - HEADSMAN + MANIAC (Physical + Chaos)
    // ========================================================================

    blood_rite: {
        id: 'blood_rite',
        name: 'Blood Rite',
        description: 'Kill = Heal 10 HP, but self-Bleed for 5s',
        lore: 'A fair trade.',
        icon: String.fromCodePoint(0x1FA78), // 🩸
        color: '#922b21',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_kill_tradeoff', heals: 10, selfDebuff: 'bleed', duration: 5 },
        getBonus: () => ({ killHeal: 10, killSelfBleed: 5 })
    },

    reckless_swing: {
        id: 'reckless_swing',
        name: 'Reckless Swing',
        description: 'Heavy attacks are Uninterruptible but cost 5 HP',
        lore: "Don't stop.",
        icon: String.fromCodePoint(0x1FA93), // 🪓
        color: '#922b21',
        ancestor: null,
        tier: 'resonance',
        requires: ['headsman', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'attack_modify', heavyAttack: { uninterruptible: true, hpCost: 5 } },
        getBonus: () => ({ uninterruptibleHeavy: true, heavyHpCost: 5 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - LURKER + STORM-CALLER (Shadow + Speed)
    // ========================================================================

    phantom_dash: {
        id: 'phantom_dash',
        name: 'Phantom Dash',
        description: 'Dash grants 0.5s Invisibility (drops aggro)',
        lore: 'Gone.',
        icon: String.fromCodePoint(0x1F47B), // 👻
        color: '#5b2c6f',
        ancestor: null,
        tier: 'resonance',
        requires: ['lurker', 'storm_caller'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'dash_effect', grants: 'invisibility', duration: 0.5 },
        getBonus: () => ({ dashInvisibility: true, dashInvisDuration: 0.5 })
    },

    hit_and_run: {
        id: 'hit_and_run',
        name: 'Hit and Run',
        description: 'Ambush damage grants +50% Speed burst',
        lore: 'Strike and vanish.',
        icon: String.fromCodePoint(0x1F4A8), // 💨
        color: '#5b2c6f',
        ancestor: null,
        tier: 'resonance',
        requires: ['lurker', 'storm_caller'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_ambush', grants: 'speed_burst', value: 0.50 },
        getBonus: () => ({ ambushSpeedBurst: 0.50 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - LURKER + ROT-WEAVER (Shadow + Poison)
    // ========================================================================

    silent_killer: {
        id: 'silent_killer',
        name: 'Silent Killer',
        description: 'DoT ticks do not wake sleeping/unaware enemies',
        lore: 'They die sleeping.',
        icon: String.fromCodePoint(0x1F634), // 😴
        color: '#1e8449',
        ancestor: null,
        tier: 'resonance',
        requires: ['lurker', 'rot_weaver'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'stealth_dot', dotSilent: true },
        getBonus: () => ({ silentDot: true })
    },

    toxic_shroud: {
        id: 'toxic_shroud',
        name: 'Toxic Shroud',
        description: 'Entering stealth leaves a Poison Cloud',
        lore: 'Leave something behind.',
        icon: String.fromCodePoint(0x2601), // ☁
        color: '#1e8449',
        ancestor: null,
        tier: 'resonance',
        requires: ['lurker', 'rot_weaver'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_stealth', creates: 'poison_cloud' },
        getBonus: () => ({ stealthPoisonCloud: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - LURKER + IRON-WARDEN (Shadow + Ice)
    // ========================================================================

    gargoyle: {
        id: 'gargoyle',
        name: 'Gargoyle',
        description: 'Stand still 2s = Invisible + 50 Armor',
        lore: 'Stone eyes watching.',
        icon: String.fromCodePoint(0x1F5FF), // 🗿
        color: '#2c3e50',
        ancestor: null,
        tier: 'resonance',
        requires: ['lurker', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'stationary_buff', delay: 2, grants: { invisibility: true, armor: 50 } },
        getBonus: () => ({ gargoyleMode: true, gargoyleArmor: 50 })
    },

    cold_shadow: {
        id: 'cold_shadow',
        name: 'Cold Shadow',
        description: 'Unaware enemies have -30% Action Speed',
        lore: 'The chill of the void.',
        icon: String.fromCodePoint(0x2744), // ❄
        color: '#2c3e50',
        ancestor: null,
        tier: 'resonance',
        requires: ['lurker', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'aura', condition: 'unaware', debuff: 'action_speed', value: -0.30 },
        getBonus: () => ({ coldShadowSlow: 0.30 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - LURKER + MANIAC (Shadow + Chaos)
    // ========================================================================

    paranoia: {
        id: 'paranoia',
        name: 'Paranoia',
        description: '+50% DMG if no enemies visible; -20% if any visible',
        lore: 'Alone is safe.',
        icon: String.fromCodePoint(0x1F440), // 👀
        color: '#641e16',
        ancestor: null,
        tier: 'resonance',
        requires: ['lurker', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'conditional', noEnemiesVisible: { damage: 0.50 }, enemiesVisible: { damage: -0.20 } },
        getBonus: () => ({ paranoiaBonus: 0.50, paranoiaPenalty: 0.20 })
    },

    dark_pact: {
        id: 'dark_pact',
        name: 'Dark Pact',
        description: 'Torch OFF: +100% DMG, but drain 1 HP/s',
        lore: 'Embrace the dim.',
        icon: String.fromCodePoint(0x1F311), // 🌑
        color: '#641e16',
        ancestor: null,
        tier: 'resonance',
        requires: ['lurker', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'torch_off_tradeoff', bonus: { damage: 1.0 }, penalty: { hpDrain: 1 } },
        getBonus: () => ({ darkPactDamage: 1.0, darkPactDrain: 1 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - STORM-CALLER + ROT-WEAVER (Speed + Poison)
    // ========================================================================

    aeration: {
        id: 'aeration',
        name: 'Aeration',
        description: 'Your movement increases nearby enemy DoT tick rate (2x)',
        lore: 'Feed the flames.',
        icon: String.fromCodePoint(0x1F32C), // 🌬
        color: '#7d3c98',
        ancestor: null,
        tier: 'resonance',
        requires: ['storm_caller', 'rot_weaver'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'aura', onMove: { enemyDotRate: 2.0 } },
        getBonus: () => ({ movementDotAcceleration: 2.0 })
    },

    contagion: {
        id: 'contagion',
        name: 'Contagion',
        description: 'Knockback spreads Rot stacks to nearby enemies',
        lore: 'Spread the sickness.',
        icon: String.fromCodePoint(0x1F9A0), // 🦠
        color: '#7d3c98',
        ancestor: null,
        tier: 'resonance',
        requires: ['storm_caller', 'rot_weaver'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_knockback', spreads: 'rot' },
        getBonus: () => ({ knockbackSpreadsRot: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - STORM-CALLER + IRON-WARDEN (Speed + Ice)
    // ========================================================================

    unstoppable_force: {
        id: 'unstoppable_force',
        name: 'Unstoppable Force',
        description: 'Sprinting = Frontal Immunity + Auto-Knockback',
        lore: 'Rolling stone.',
        icon: String.fromCodePoint(0x1F3C3), // 🏃
        color: '#2980b9',
        ancestor: null,
        tier: 'resonance',
        requires: ['storm_caller', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'sprint_buff', frontalImmunity: true, autoKnockback: true },
        getBonus: () => ({ sprintFrontalImmunity: true, sprintAutoKnockback: true })
    },

    avalanche: {
        id: 'avalanche',
        name: 'Avalanche',
        description: 'Knocking Frozen enemy into wall = Massive DMG',
        lore: 'Crushing weight.',
        icon: String.fromCodePoint(0x1F3D4), // 🏔
        color: '#2980b9',
        ancestor: null,
        tier: 'resonance',
        requires: ['storm_caller', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'wall_slam', condition: 'frozen', bonusDamage: 'massive' },
        getBonus: () => ({ frozenWallSlam: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - STORM-CALLER + MANIAC (Speed + Chaos)
    // ========================================================================

    momentum_burn: {
        id: 'momentum_burn',
        name: 'Momentum Burn',
        description: '+15% Speed while moving; Stopping applies -15% Speed for 3s',
        lore: 'Build momentum.',
        icon: String.fromCodePoint(0x26A1), // ⚡
        color: '#a93226',
        ancestor: null,
        tier: 'resonance',
        requires: ['storm_caller', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'momentum', movingBonus: 0.15, stoppedPenalty: 0.15, penaltyDuration: 3 },
        getBonus: () => ({ momentumSpeedBonus: 0.15, momentumSpeedPenalty: 0.15, momentumPenaltyDuration: 3 })
    },

    static_feedback: {
        id: 'static_feedback',
        name: 'Static Feedback',
        description: '+50% Attack Speed, 5% chance to Shock self on hit',
        lore: 'Overload.',
        icon: String.fromCodePoint(0x26A1), // ⚡
        color: '#a93226',
        ancestor: null,
        tier: 'resonance',
        requires: ['storm_caller', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'tradeoff', bonus: { attackSpeed: 0.50 }, penalty: { selfShockChance: 0.05 } },
        getBonus: () => ({ staticFeedbackSpeed: 0.50, selfShockChance: 0.05 })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - ROT-WEAVER + IRON-WARDEN (Poison + Ice)
    // ========================================================================

    preserved_decay: {
        id: 'preserved_decay',
        name: 'Preserved Decay',
        description: 'Rot stacks do not expire on Frozen enemies',
        lore: 'Frozen in time.',
        icon: String.fromCodePoint(0x1F9CA), // 🧊
        color: '#117a65',
        ancestor: null,
        tier: 'resonance',
        requires: ['rot_weaver', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'status_synergy', frozenPreservesRot: true },
        getBonus: () => ({ frozenPreservesRot: true })
    },

    mossy_stone: {
        id: 'mossy_stone',
        name: 'Mossy Stone',
        description: 'Standing still grants Immunity to Poison/Clouds',
        lore: 'Overgrown.',
        icon: String.fromCodePoint(0x1FAB4), // 🪴
        color: '#117a65',
        ancestor: null,
        tier: 'resonance',
        requires: ['rot_weaver', 'iron_warden'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'stationary_buff', grants: { poisonImmunity: true, cloudImmunity: true } },
        getBonus: () => ({ stationaryPoisonImmunity: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - ROT-WEAVER + MANIAC (Poison + Chaos)
    // ========================================================================

    plague_bearer: {
        id: 'plague_bearer',
        name: 'Plague Bearer',
        description: 'Constant Rot AoE around you, but Max HP capped at 50%',
        lore: 'I am the vector.',
        icon: String.fromCodePoint(0x2623), // ☣
        color: '#7b241c',
        ancestor: null,
        tier: 'resonance',
        requires: ['rot_weaver', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'aura_tradeoff', aura: 'rot', penalty: { maxHpCap: 0.50 } },
        getBonus: () => ({ plagueAura: true, maxHpCap: 0.50 })
    },

    toxic_blood: {
        id: 'toxic_blood',
        name: 'Toxic Blood',
        description: 'Taking damage sprays acid on attacker (Armor Break)',
        lore: 'Corrosive veins.',
        icon: String.fromCodePoint(0x1F9EA), // 🧪
        color: '#7b241c',
        ancestor: null,
        tier: 'resonance',
        requires: ['rot_weaver', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_hit_taken', counters: 'acid_spray', applies: 'armor_break' },
        getBonus: () => ({ toxicBloodReflect: true })
    },

    // ========================================================================
    // TIER 3: RESONANCE BOONS - IRON-WARDEN + MANIAC (Ice + Chaos)
    // ========================================================================

    iron_maiden: {
        id: 'iron_maiden',
        name: 'Iron Maiden',
        description: 'Reflect 200% DMG, but rooted while Attacking',
        lore: 'The trap closes.',
        icon: String.fromCodePoint(0x1F6E1), // 🛡
        color: '#4a235a',
        ancestor: null,
        tier: 'resonance',
        requires: ['iron_warden', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'tradeoff', bonus: { reflectDamage: 2.0 }, penalty: { rootedWhileAttacking: true } },
        getBonus: () => ({ ironMaidenReflect: 2.0, rootedWhileAttacking: true })
    },

    statues_bargain: {
        id: 'statues_bargain',
        name: "Statue's Bargain",
        description: '+100 Base Armor, -20% Move Speed',
        lore: 'Heavy is the head.',
        icon: String.fromCodePoint(0x1F5FF), // 🗿
        color: '#4a235a',
        ancestor: null,
        tier: 'resonance',
        requires: ['iron_warden', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'tradeoff', bonus: { armor: 100 }, penalty: { moveSpeed: -0.20 } },
        getBonus: () => ({ statueArmor: 100, statueSpeedPenalty: 0.20 })
    },

    // ========================================================================
    // TIER 4: LEGENDARY BOONS (Capstones - Require 3 from same Ancestor)
    // ========================================================================

    supernova: {
        id: 'supernova',
        name: 'SUPERNOVA',
        description: 'Every 30s: Screen-wide pulse deals Fire DMG + Stun',
        lore: 'Become the sun.',
        icon: String.fromCodePoint(0x1F31E), // 🌞
        color: '#f39c12',
        ancestor: 'torchbearer',
        tier: 'legendary',
        requires: { ancestor: 'torchbearer', count: 3 },
        stackable: false,
        maxStacks: 1,
        effect: { type: 'timed_ability', interval: 30, aoe: 'screen', damage: 'fire', applies: 'stun' },
        getBonus: () => ({ supernovaPulse: true })
    },

    crimson_rain: {
        id: 'crimson_rain',
        name: 'CRIMSON RAIN',
        description: 'Kills explode for AoE damage + Max Bleed stacks',
        lore: 'Drink deep.',
        icon: String.fromCodePoint(0x1FA78), // 🩸
        color: '#922b21',
        ancestor: 'headsman',
        tier: 'legendary',
        requires: { ancestor: 'headsman', count: 3 },
        stackable: false,
        maxStacks: 1,
        effect: { type: 'on_kill', triggers: 'explosion', applies: 'max_bleed' },
        getBonus: () => ({ crimsonRainExplosion: true })
    },

    ghost_in_machine: {
        id: 'ghost_in_machine',
        name: 'GHOST IN THE MACHINE',
        description: 'Torch OFF: Phase through enemies (no collision)',
        lore: 'Walls are suggestions.',
        icon: String.fromCodePoint(0x1F47B), // 👻
        color: '#1a5276',
        ancestor: 'lurker',
        tier: 'legendary',
        requires: { ancestor: 'lurker', count: 3 },
        stackable: false,
        maxStacks: 1,
        effect: { type: 'conditional', condition: 'torch_off', grants: 'phase_through_enemies' },
        getBonus: () => ({ ghostPhasing: true })
    },

    velocity_god: {
        id: 'velocity_god',
        name: 'VELOCITY GOD',
        description: 'Uncapped Speed; Higher speed = Enemies in slow motion',
        lore: 'Time waits for you.',
        icon: String.fromCodePoint(0x26A1), // ⚡
        color: '#8e44ad',
        ancestor: 'storm_caller',
        tier: 'legendary',
        requires: { ancestor: 'storm_caller', count: 3 },
        stackable: false,
        maxStacks: 1,
        effect: { type: 'passive', uncappedSpeed: true, speedSlowsEnemies: true },
        getBonus: () => ({ velocityGod: true })
    },

    pandemic: {
        id: 'pandemic',
        name: 'PANDEMIC',
        description: 'Rot never expires + Spreads on enemy contact',
        lore: 'One cough.',
        icon: String.fromCodePoint(0x2623), // ☣
        color: '#145a32',
        ancestor: 'rot_weaver',
        tier: 'legendary',
        requires: { ancestor: 'rot_weaver', count: 3 },
        stackable: false,
        maxStacks: 1,
        effect: { type: 'status_modify', status: 'rot', permanent: true, spreads: true },
        getBonus: () => ({ pandemicRot: true })
    },

    colossus: {
        id: 'colossus',
        name: 'COLOSSUS',
        description: 'Immune to Stagger and Knockback',
        lore: 'Stone is eternal.',
        icon: String.fromCodePoint(0x1F5FF), // 🗿
        color: '#1a5276',
        ancestor: 'iron_warden',
        tier: 'legendary',
        requires: { ancestor: 'iron_warden', count: 3 },
        stackable: false,
        maxStacks: 1,
        effect: { type: 'immunity', immune: ['stagger', 'knockback'] },
        getBonus: () => ({ colossusImmunity: true })
    },

    final_offer: {
        id: 'final_offer',
        name: 'FINAL OFFER',
        description: '1 Max HP. 5x Damage. One free revive per floor.',
        lore: 'Everything for power.',
        icon: String.fromCodePoint(0x1F480), // 💀
        color: '#7b241c',
        ancestor: 'maniac',
        tier: 'legendary',
        requires: { ancestor: 'maniac', count: 3 },
        stackable: false,
        maxStacks: 1,
        effect: { type: 'ultimate_tradeoff', maxHp: 1, damageMultiplier: 5, extraLife: true },
        getBonus: () => ({ finalOffer: true, finalOfferDamage: 5, finalOfferMaxHp: 1 })
    }
};

// ============================================================================
// BOON SYSTEM STATE
// ============================================================================

const BoonSystem = {
    // Currently active boons: { boonId: stackCount }
    activeBoons: {},

    // Active boons as an ordered array of boon data objects (for UI and death summary)
    activePlayerBoons: [],

    // Active synergy bonuses: Set of ancestor IDs whose synergies are active
    activeSynergies: new Set(),

    // Special effect handlers: Map of boonId -> { event, handler } for EventBus listeners
    specialEffectHandlers: new Map(),

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize boon system for a new session
     */
    init() {
        this.activeBoons = {};
        this.activePlayerBoons = [];
        this.activeSynergies = new Set();
        this.specialEffectHandlers = new Map();
        console.log('[BoonSystem] Initialized (no active boons)');
    },

    // ========================================================================
    // BOON APPLICATION (StatModifierStack integration)
    // ========================================================================

    /**
     * Apply a boon to the player, registering stat modifiers via StatModifierStack
     * @param {string} boonId - ID of the boon to apply
     * @returns {boolean} Success
     */
    applyBoon(boonId) {
        const boon = BOONS[boonId];
        if (!boon) {
            console.warn(`[BoonSystem] Unknown boon: ${boonId}`);
            return false;
        }

        // Check max boons (count unique boons)
        const uniqueBoons = Object.keys(this.activeBoons).length;
        if (!this.activeBoons[boonId] && uniqueBoons >= BOON_CONFIG.maxBoons) {
            console.warn(`[BoonSystem] Max boons reached (${BOON_CONFIG.maxBoons})`);
            if (typeof addMessage === 'function') {
                addMessage('Cannot accept more boons!', 'warning');
            }
            return false;
        }

        // Handle stacking
        if (this.activeBoons[boonId]) {
            if (!boon.stackable) {
                if (typeof addMessage === 'function') {
                    addMessage(`${boon.name} cannot stack!`, 'info');
                }
                return false;
            }
            if (this.activeBoons[boonId] >= boon.maxStacks) {
                if (typeof addMessage === 'function') {
                    addMessage(`${boon.name} at maximum stacks!`, 'info');
                }
                return false;
            }
            this.activeBoons[boonId]++;
        } else {
            this.activeBoons[boonId] = 1;
            // Add to ordered list
            this.activePlayerBoons.push({
                id: boon.id,
                name: boon.name,
                ancestor: boon.ancestor,
                tier: boon.tier,
                icon: boon.icon,
                color: boon.color
            });
        }

        // Apply stat modifiers via StatModifierStack
        const player = (typeof game !== 'undefined' && game.player) ? game.player : null;
        if (player && player.statStacks && boon.effect) {
            this._applyBoonStatModifiers(boonId, boon, player);
        }

        // Register special effect handlers via EventBus
        this._registerSpecialEffects(boonId, boon);

        // Update run stats
        if (typeof game !== 'undefined' && game.runStats) {
            game.runStats.boonsCollected = (game.runStats.boonsCollected || 0) + 1;
        }

        // Notify player
        if (typeof addMessage === 'function') {
            const stacks = this.activeBoons[boonId];
            const stackText = stacks > 1 ? ` (x${stacks})` : '';
            addMessage(`Boon acquired: ${boon.name}${stackText}`, 'reward');
        }

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('player:boon_selected', { boonId, boon, stacks: this.activeBoons[boonId] });
        }

        // Check synergy for this boon's ancestor
        if (boon.ancestor) {
            this.checkSynergy(boon.ancestor);
        }
        // For resonance boons (ancestor is null), check all required ancestors
        if (boon.tier === 'resonance' && Array.isArray(boon.requires)) {
            for (const reqAncestor of boon.requires) {
                this.checkSynergy(reqAncestor);
            }
        }

        // Recalculate player stats
        if (typeof recalculatePlayerStats === 'function' && player) {
            recalculatePlayerStats(player);
        }

        console.log(`[BoonSystem] Applied ${boon.name} (stacks: ${this.activeBoons[boonId]})`);
        return true;
    },

    /**
     * Apply stat modifiers from a boon's effect to the player's statStacks.
     * Maps boon effect types to appropriate stat modifiers.
     * @private
     */
    _applyBoonStatModifiers(boonId, boon, player) {
        const effect = boon.effect;
        if (!effect || !player.statStacks) return;

        const source = `boon:${boonId}`;

        // Direct stat effects from synergy-style boons with effects arrays
        // (These are handled by synergy system, not here)

        // Map common effect types to stat modifiers
        switch (effect.type) {
            case 'conditional_damage':
                // Conditional damage bonuses (e.g. searing_radiance: +15% in light)
                // These are tracked as special effects, not flat stat modifiers
                break;

            case 'tradeoff':
                // Tradeoff boons apply both bonus and penalty
                if (effect.bonus) {
                    if (effect.bonus.attackSpeed && player.statStacks.attackSpeed) {
                        player.statStacks.attackSpeed.addModifier(boonId, effect.bonus.attackSpeed * 100, 'multiplicative', source);
                    }
                    if (effect.bonus.damageMultiplier && player.statStacks.damage) {
                        player.statStacks.damage.addModifier(boonId, (effect.bonus.damageMultiplier - 1) * 100, 'multiplicative', source);
                    }
                    if (effect.bonus.armor && player.statStacks.defense) {
                        player.statStacks.defense.addModifier(boonId, effect.bonus.armor, 'additive', source);
                    }
                    if (effect.bonus.reflectDamage && player.statStacks.thornsDamage) {
                        player.statStacks.thornsDamage.addModifier(boonId, effect.bonus.reflectDamage * 10, 'additive', source);
                    }
                }
                if (effect.penalty) {
                    if (effect.penalty.damageTaken && player.statStacks.defense) {
                        // Negative defense = increased damage taken
                        player.statStacks.defense.addModifier(boonId + '_penalty', -(effect.penalty.damageTaken * 100), 'multiplicative', source);
                    }
                    if (effect.penalty.maxHpMultiplier && player.statStacks.maxHp) {
                        // maxHpMultiplier of 0.5 means -50% HP
                        player.statStacks.maxHp.addModifier(boonId + '_penalty', (effect.penalty.maxHpMultiplier - 1) * 100, 'multiplicative', source);
                    }
                    if (effect.penalty.moveSpeed && player.statStacks.speed) {
                        player.statStacks.speed.addModifier(boonId + '_penalty', effect.penalty.moveSpeed, 'additive', source);
                    }
                }
                break;

            case 'stationary_buff':
                // Stationary buffs are conditional - tracked as special effects
                if (effect.stat === 'damageReduction' && player.statStacks.defense) {
                    // Pre-register the modifier ID so it can be toggled at runtime
                }
                break;

            case 'ultimate_tradeoff':
                // Final Offer: 1 Max HP, 5x Damage
                if (player.statStacks.damage) {
                    player.statStacks.damage.addModifier(boonId, (effect.damageMultiplier - 1) * 100, 'multiplicative', source);
                }
                // maxHp override is handled specially in recalculation
                break;

            default:
                // Most boons are special/conditional effects tracked via getBonus()
                break;
        }
    },

    /**
     * Register special effect handlers via EventBus for on-hit, on-kill, etc.
     * @private
     */
    _registerSpecialEffects(boonId, boon) {
        if (typeof EventBus === 'undefined') return;
        const effect = boon.effect;
        if (!effect) return;

        const handlers = [];

        // On-hit effects (ignite, chill, rot, etc.)
        if (effect.type === 'on_hit' && effect.applies) {
            const handler = (data) => {
                if (data && data.target && typeof applyStatusEffect === 'function') {
                    applyStatusEffect(data.target, effect.applies, { source: boonId });
                }
            };
            EventBus.on('player:hit_enemy', handler);
            handlers.push({ event: 'player:hit_enemy', handler });
        }

        // On-crit effects
        if (effect.type === 'on_crit' && effect.applies) {
            const handler = (data) => {
                if (data && data.target && typeof applyStatusEffect === 'function') {
                    applyStatusEffect(data.target, effect.applies, { source: boonId });
                }
            };
            EventBus.on('player:crit_hit', handler);
            handlers.push({ event: 'player:crit_hit', handler });
        }

        // On-kill effects
        if (effect.type === 'on_kill' || effect.type === 'on_kill_tradeoff') {
            const handler = (data) => {
                const player = (typeof game !== 'undefined' && game.player) ? game.player : null;
                if (!player) return;

                // Healing on kill
                if (effect.heals) {
                    player.hp = Math.min(player.maxHp, player.hp + effect.heals);
                    if (typeof addMessage === 'function') {
                        addMessage(`${boon.name}: +${effect.heals} HP`, 'heal');
                    }
                }
                // Speed buff on kill
                if (effect.grants === 'speed_buff') {
                    // Temporary buff - handled by combat system
                }
            };
            EventBus.on('player:killed_enemy', handler);
            handlers.push({ event: 'player:killed_enemy', handler });
        }

        // On-hit-taken effects (knockback, reflect, etc.)
        if (effect.type === 'on_hit_taken') {
            const handler = (data) => {
                // Handled by combat system checking hasBoon()
            };
            EventBus.on('player:took_damage', handler);
            handlers.push({ event: 'player:took_damage', handler });
        }

        if (handlers.length > 0) {
            this.specialEffectHandlers.set(boonId, handlers);
        }
    },

    /**
     * Unregister special effect handlers for a boon
     * @private
     */
    _unregisterSpecialEffects(boonId) {
        if (typeof EventBus === 'undefined') return;
        const handlers = this.specialEffectHandlers.get(boonId);
        if (!handlers) return;

        for (const { event, handler } of handlers) {
            EventBus.off(event, handler);
        }
        this.specialEffectHandlers.delete(boonId);
    },

    /**
     * Remove a boon from the player, cleaning up stat modifiers and effects
     * @param {string} boonId - ID of the boon to remove
     * @param {boolean} removeAllStacks - Remove all stacks or just one
     */
    removeBoon(boonId, removeAllStacks = true) {
        if (!this.activeBoons[boonId]) return;

        const boon = BOONS[boonId];
        const player = (typeof game !== 'undefined' && game.player) ? game.player : null;
        const source = `boon:${boonId}`;
        let fullyRemoved = false;

        if (removeAllStacks) {
            delete this.activeBoons[boonId];
            fullyRemoved = true;
        } else {
            this.activeBoons[boonId]--;
            if (this.activeBoons[boonId] <= 0) {
                delete this.activeBoons[boonId];
                fullyRemoved = true;
            }
        }

        // Remove stat modifiers from StatModifierStacks
        if (fullyRemoved && player && player.statStacks) {
            for (const stackKey of Object.keys(player.statStacks)) {
                player.statStacks[stackKey].removeModifier(boonId);
                player.statStacks[stackKey].removeModifier(boonId + '_penalty');
                player.statStacks[stackKey].removeBySource(source);
            }
        }

        // Unregister special effect handlers
        if (fullyRemoved) {
            this._unregisterSpecialEffects(boonId);

            // Remove from ordered list
            this.activePlayerBoons = this.activePlayerBoons.filter(b => b.id !== boonId);
        }

        // Re-check synergy for the removed boon's ancestor
        if (boon && boon.ancestor) {
            this.checkSynergy(boon.ancestor);
        }
        if (boon && boon.tier === 'resonance' && Array.isArray(boon.requires)) {
            for (const reqAncestor of boon.requires) {
                this.checkSynergy(reqAncestor);
            }
        }

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('player:boon_removed', { boonId, boonName: boon?.name || boonId });
        }

        // Recalculate stats
        if (typeof recalculatePlayerStats === 'function' && player) {
            recalculatePlayerStats(player);
        }

        console.log(`[BoonSystem] Removed ${boon?.name || boonId}`);
    },

    /**
     * Grant a boon (legacy alias for applyBoon)
     */
    grantBoon(boonId) {
        return this.applyBoon(boonId);
    },

    // ========================================================================
    // SYNERGY MANAGEMENT
    // ========================================================================

    /**
     * Check if an ancestor's synergy should be activated or deactivated.
     * Counts boons (core tier) from the ancestor and compares to synergyThreshold.
     * @param {string} ancestorId - Ancestor ID to check
     */
    checkSynergy(ancestorId) {
        const ancestor = ANCESTORS[ancestorId];
        if (!ancestor || !ancestor.synergyBonus) return;

        const threshold = ancestor.synergyThreshold || 3;
        const ancestorCounts = this.getAncestorCounts();
        const count = ancestorCounts[ancestorId] || 0;

        if (count >= threshold && !this.activeSynergies.has(ancestorId)) {
            // Activate synergy
            this.applySynergyBonus(ancestorId, ancestor.synergyBonus);
        } else if (count < threshold && this.activeSynergies.has(ancestorId)) {
            // Deactivate synergy
            this.removeSynergyBonus(ancestorId);
        }
    },

    /**
     * Apply a synergy bonus, adding all its effects as stat modifiers.
     * @param {string} ancestorId - Ancestor ID
     * @param {Object} synergyData - The synergyBonus object from ANCESTORS
     */
    applySynergyBonus(ancestorId, synergyData) {
        const player = (typeof game !== 'undefined' && game.player) ? game.player : null;
        if (!player || !player.statStacks) return;

        const source = `synergy:${ancestorId}`;

        for (const effect of synergyData.effects) {
            const stack = player.statStacks[effect.stat];
            if (stack) {
                stack.addModifier(synergyData.id, effect.value, effect.type, source);
            } else {
                console.warn(`[BoonSystem] No statStack found for synergy effect stat: ${effect.stat}`);
            }
        }

        this.activeSynergies.add(ancestorId);

        // Emit synergy activated event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('synergy:activated', {
                ancestorId,
                synergyName: synergyData.name,
                synergyDescription: synergyData.description
            });
        }

        // Notify player
        if (typeof addMessage === 'function') {
            const ancestor = ANCESTORS[ancestorId];
            addMessage(`Synergy unlocked: ${synergyData.name} (${ancestor.name})!`, 'legendary');
        }

        console.log(`[BoonSystem] Synergy activated: ${synergyData.name} (${ancestorId})`);

        // Recalculate stats
        if (typeof recalculatePlayerStats === 'function') {
            recalculatePlayerStats(player);
        }
    },

    /**
     * Remove a synergy bonus, stripping all its stat modifiers.
     * @param {string} ancestorId - Ancestor ID
     */
    removeSynergyBonus(ancestorId) {
        const player = (typeof game !== 'undefined' && game.player) ? game.player : null;
        const ancestor = ANCESTORS[ancestorId];
        if (!ancestor || !ancestor.synergyBonus) return;

        const source = `synergy:${ancestorId}`;
        const synergyData = ancestor.synergyBonus;

        if (player && player.statStacks) {
            for (const effect of synergyData.effects) {
                const stack = player.statStacks[effect.stat];
                if (stack) {
                    stack.removeModifier(synergyData.id);
                    stack.removeBySource(source);
                }
            }
        }

        this.activeSynergies.delete(ancestorId);

        // Emit synergy deactivated event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('synergy:deactivated', {
                ancestorId,
                synergyName: synergyData.name
            });
        }

        if (typeof addMessage === 'function') {
            addMessage(`Synergy lost: ${synergyData.name}`, 'warning');
        }

        console.log(`[BoonSystem] Synergy deactivated: ${synergyData.name} (${ancestorId})`);

        // Recalculate stats
        if (typeof recalculatePlayerStats === 'function' && player) {
            recalculatePlayerStats(player);
        }
    },

    // ========================================================================
    // CLEAR ALL BOONS (Death wipe)
    // ========================================================================

    /**
     * Clear all boons on death - removes stat modifiers, synergies, and EventBus handlers.
     * Must be called with boon data still intact so modifiers can be properly removed.
     */
    clearBoons() {
        const player = (typeof game !== 'undefined' && game.player) ? game.player : null;

        // 1. Remove each boon's modifiers from statStacks in reverse order
        const boonIds = Object.keys(this.activeBoons);
        for (let i = boonIds.length - 1; i >= 0; i--) {
            const boonId = boonIds[i];
            const source = `boon:${boonId}`;

            if (player && player.statStacks) {
                for (const stackKey of Object.keys(player.statStacks)) {
                    player.statStacks[stackKey].removeModifier(boonId);
                    player.statStacks[stackKey].removeModifier(boonId + '_penalty');
                    player.statStacks[stackKey].removeBySource(source);
                }
            }
        }

        // 2. Clear all synergy bonuses
        const synergyCopy = [...this.activeSynergies];
        for (const ancestorId of synergyCopy) {
            const ancestor = ANCESTORS[ancestorId];
            if (ancestor && ancestor.synergyBonus && player && player.statStacks) {
                const source = `synergy:${ancestorId}`;
                for (const effect of ancestor.synergyBonus.effects) {
                    const stack = player.statStacks[effect.stat];
                    if (stack) {
                        stack.removeModifier(ancestor.synergyBonus.id);
                        stack.removeBySource(source);
                    }
                }
            }
        }
        this.activeSynergies.clear();

        // 3. Clear special effect handlers (unregister EventBus listeners)
        if (typeof EventBus !== 'undefined') {
            for (const [boonId, handlers] of this.specialEffectHandlers) {
                for (const { event, handler } of handlers) {
                    EventBus.off(event, handler);
                }
            }
        }
        this.specialEffectHandlers.clear();

        // 4. Clear boon tracking
        this.activeBoons = {};
        this.activePlayerBoons = [];

        // Recalculate stats
        if (typeof recalculatePlayerStats === 'function' && player) {
            recalculatePlayerStats(player);
        }

        console.log('[BoonSystem] All boons cleared (death wipe)');
    },

    // ========================================================================
    // BONUS CALCULATION (Legacy compatibility)
    // ========================================================================

    /**
     * Get total bonus from all active boons for a specific stat
     * Boons stack multiplicatively: (1 + boon1) x (1 + boon2) x ...
     * @param {string} statName - The stat to get bonus for
     * @returns {number} Total multiplier (1.0 = no bonus)
     */
    getTotalBonus(statName) {
        let multiplier = 1.0;

        for (const [boonId, stacks] of Object.entries(this.activeBoons)) {
            const boon = BOONS[boonId];
            if (!boon) continue;

            const bonuses = boon.getBonus(stacks);

            // Check various stat mappings
            switch (statName) {
                case 'maxHp':
                case 'maxHpPercent':
                    if (bonuses.maxHpPercent) {
                        multiplier *= (1 + bonuses.maxHpPercent);
                    }
                    break;

                case 'damageReduction':
                    if (bonuses.damageReduction) {
                        multiplier += bonuses.damageReduction;
                    }
                    break;

                case 'attackSpeed':
                    if (bonuses.attackSpeed) {
                        multiplier *= (1 + bonuses.attackSpeed);
                    }
                    break;

                case 'gold':
                case 'goldBonus':
                    if (bonuses.goldBonus) {
                        multiplier *= (1 + bonuses.goldBonus);
                    }
                    break;

                case 'xp':
                case 'skillXp':
                case 'xpBonus':
                    if (bonuses.xpBonus) {
                        multiplier *= (1 + bonuses.xpBonus);
                    }
                    break;

                case 'damage':
                    if (bonuses.damage) {
                        multiplier *= (1 + bonuses.damage);
                    }
                    break;
            }
        }

        return multiplier;
    },

    /**
     * Get all bonuses as an object
     * @returns {Object} All stat bonuses
     */
    getAllBonuses() {
        return {
            maxHp: this.getTotalBonus('maxHp'),
            damageReduction: this.getTotalBonus('damageReduction'),
            attackSpeed: this.getTotalBonus('attackSpeed'),
            gold: this.getTotalBonus('gold'),
            xp: this.getTotalBonus('xp'),
            damage: this.getTotalBonus('damage')
        };
    },

    // ========================================================================
    // SHRINE INTERACTION / OFFERING GENERATION
    // ========================================================================

    /**
     * Get count of boons from each ancestor
     * @returns {Object} { ancestorId: count }
     */
    getAncestorCounts() {
        const counts = {};
        for (const ancestorId of Object.keys(ANCESTORS)) {
            counts[ancestorId] = 0;
        }

        for (const boonId of Object.keys(this.activeBoons)) {
            const boon = BOONS[boonId];
            if (boon && boon.ancestor) {
                counts[boon.ancestor] = (counts[boon.ancestor] || 0) + 1;
            }
        }

        return counts;
    },

    /**
     * Check if a boon tier is available based on merged gating:
     * - Core (Tier 1): always available
     * - Resonance (Tier 2): Floor 3+ AND have boons from 2+ different ancestors
     * - Legendary (Tier 3): Floor 6+ AND have 3+ boons from the same ancestor
     * Also checks the boon's own 'requires' field.
     * @param {Object} boon - Boon definition
     * @param {number} floor - Current dungeon floor
     * @param {Array} activePlayerBoons - Currently active boons
     * @returns {boolean}
     */
    isTierAvailable(boon, floor, activePlayerBoons) {
        const ancestorCounts = this.getAncestorCounts();

        if (boon.tier === 'core') {
            // Core boons: always available on any floor
            return true;
        }

        if (boon.tier === 'resonance') {
            // Floor gate: requires floor 3+
            if (floor < 3) return false;

            // Diversity gate: need boons from at least 2 different ancestors
            const diverseAncestors = Object.values(ancestorCounts).filter(c => c >= 1).length;
            if (diverseAncestors < 2) return false;

            // Requirement gate: need 1 boon from each of 2 required ancestors
            if (Array.isArray(boon.requires)) {
                const [ancestor1, ancestor2] = boon.requires;
                return (ancestorCounts[ancestor1] >= 1) && (ancestorCounts[ancestor2] >= 1);
            }
            return true;
        }

        if (boon.tier === 'legendary') {
            // Floor gate: requires floor 6+
            if (floor < 6) return false;

            // Requirement gate: need 3 boons from the same ancestor
            if (boon.requires && boon.requires.ancestor) {
                return (ancestorCounts[boon.requires.ancestor] || 0) >= (boon.requires.count || 3);
            }
            return false;
        }

        return false;
    },

    /**
     * Check if player meets requirements for a boon (legacy - no floor gating)
     * @param {Object} boon - Boon definition
     * @returns {boolean}
     */
    meetsRequirements(boon) {
        // Use isTierAvailable with floor=99 to bypass floor gating for legacy callers
        return this.isTierAvailable(boon, 99, this.activePlayerBoons);
    },

    /**
     * Generate a boon offering for a shrine using merged tier gating.
     * @param {number} count - Number of boons to offer
     * @param {number} [floor=1] - Current dungeon floor (for tier gating)
     * @returns {Array} Array of boon IDs
     */
    generateOffering(count = BOON_CONFIG.shrineBoonsOffered, floor = 1) {
        const availableBoons = Object.keys(BOONS).filter(boonId => {
            const boon = BOONS[boonId];
            const currentStacks = this.activeBoons[boonId] || 0;

            // Exclude boons at max stacks
            if (boon.stackable && currentStacks >= boon.maxStacks) {
                return false;
            }
            if (!boon.stackable && currentStacks > 0) {
                return false;
            }

            // Merged tier gating: requirement + floor
            if (!this.isTierAvailable(boon, floor, this.activePlayerBoons)) {
                return false;
            }

            return true;
        });

        // Weight selection: prefer higher tiers slightly when available
        const weighted = availableBoons.map(boonId => {
            const boon = BOONS[boonId];
            let weight = 1;
            if (boon.tier === 'resonance') weight = 1.5;
            if (boon.tier === 'legendary') weight = 2;
            return { boonId, weight };
        });

        // Weighted random selection
        const selected = [];
        const pool = [...weighted];
        while (selected.length < count && pool.length > 0) {
            const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
            let random = Math.random() * totalWeight;

            for (let i = 0; i < pool.length; i++) {
                random -= pool[i].weight;
                if (random <= 0) {
                    selected.push(pool[i].boonId);
                    pool.splice(i, 1);
                    break;
                }
            }
        }

        return selected;
    },

    /**
     * Get random boons for a shrine offering (legacy alias for generateOffering)
     * @param {number} count - Number of boons to offer
     * @returns {Array} Array of boon IDs
     */
    getShrineBoons(count = BOON_CONFIG.shrineBoonsOffered) {
        // Determine current floor from game state
        const floor = (typeof game !== 'undefined' && game.floor) ? game.floor : 1;
        return this.generateOffering(count, floor);
    },

    // ========================================================================
    // STATE QUERY
    // ========================================================================

    /**
     * Check if player has a specific boon
     * @param {string} boonId - Boon ID to check
     * @returns {number} Stack count (0 if not owned)
     */
    hasBoon(boonId) {
        return this.activeBoons[boonId] || 0;
    },

    /**
     * Get stack count for a specific boon (alias for hasBoon)
     * @param {string} boonId - Boon ID to check
     * @returns {number} Stack count (0 if not owned)
     */
    getBoonStacks(boonId) {
        return this.activeBoons[boonId] || 0;
    },

    /**
     * Get list of active boons for UI
     * @returns {Array} Array of { boon, stacks }
     */
    getActiveBoonList() {
        return Object.entries(this.activeBoons).map(([boonId, stacks]) => ({
            boon: BOONS[boonId],
            stacks
        })).filter(entry => entry.boon);
    },

    // ========================================================================
    // TESTING
    // ========================================================================

    /**
     * Console-callable test: applies each boon, verifies stat changes,
     * removes it, and verifies stats restored to baseline.
     * @returns {Object} Test results summary
     */
    testAllBoons() {
        const results = { passed: 0, failed: 0, errors: [] };
        const player = (typeof game !== 'undefined' && game.player) ? game.player : null;

        if (!player || !player.statStacks) {
            console.error('[BoonSystem.testAllBoons] No player or statStacks available.');
            return { passed: 0, failed: 0, errors: ['No player or statStacks available'] };
        }

        console.log('[BoonSystem.testAllBoons] Starting test of all boons...');
        console.log('='.repeat(60));

        // Save clean state
        const savedBoons = { ...this.activeBoons };
        const savedPlayerBoons = [...this.activePlayerBoons];
        const savedSynergies = new Set(this.activeSynergies);

        // Capture baseline stat values
        const baselineStats = {};
        for (const [key, stack] of Object.entries(player.statStacks)) {
            baselineStats[key] = stack.compute();
        }

        // Test each boon individually
        for (const [boonId, boon] of Object.entries(BOONS)) {
            try {
                // Reset to clean state
                this.activeBoons = {};
                this.activePlayerBoons = [];
                this.activeSynergies = new Set();

                // Clean all modifiers with boon sources
                for (const stackKey of Object.keys(player.statStacks)) {
                    const stack = player.statStacks[stackKey];
                    stack.additiveModifiers = stack.additiveModifiers.filter(
                        m => !m.source.startsWith('boon:') && !m.source.startsWith('synergy:')
                    );
                    stack.multiplicativeModifiers = stack.multiplicativeModifiers.filter(
                        m => !m.source.startsWith('boon:') && !m.source.startsWith('synergy:')
                    );
                }

                // Capture pre-apply stats
                const preStats = {};
                for (const [key, stack] of Object.entries(player.statStacks)) {
                    preStats[key] = stack.compute();
                }

                // Apply the boon
                this.applyBoon(boonId);

                // Capture post-apply stats
                const postStats = {};
                for (const [key, stack] of Object.entries(player.statStacks)) {
                    postStats[key] = stack.compute();
                }

                // Remove the boon
                this.removeBoon(boonId, true);

                // Capture post-remove stats
                const postRemoveStats = {};
                for (const [key, stack] of Object.entries(player.statStacks)) {
                    postRemoveStats[key] = stack.compute();
                }

                // Verify stats restored to baseline
                let restored = true;
                const diffs = [];
                for (const key of Object.keys(preStats)) {
                    const tolerance = 0.001;
                    if (Math.abs(postRemoveStats[key] - preStats[key]) > tolerance) {
                        restored = false;
                        diffs.push(`${key}: pre=${preStats[key].toFixed(3)}, post=${postRemoveStats[key].toFixed(3)}`);
                    }
                }

                if (restored) {
                    results.passed++;
                } else {
                    results.failed++;
                    const errMsg = `FAIL: ${boonId} (${boon.name}) - stats not restored: ${diffs.join(', ')}`;
                    results.errors.push(errMsg);
                    console.warn(errMsg);
                }
            } catch (e) {
                results.failed++;
                const errMsg = `ERROR: ${boonId} - ${e.message}`;
                results.errors.push(errMsg);
                console.error(errMsg, e);
            }
        }

        // Restore saved state
        this.activeBoons = savedBoons;
        this.activePlayerBoons = savedPlayerBoons;
        this.activeSynergies = savedSynergies;

        // Clean any leftover test modifiers
        for (const stackKey of Object.keys(player.statStacks)) {
            const stack = player.statStacks[stackKey];
            stack.additiveModifiers = stack.additiveModifiers.filter(
                m => !m.source.startsWith('boon:') && !m.source.startsWith('synergy:')
            );
            stack.multiplicativeModifiers = stack.multiplicativeModifiers.filter(
                m => !m.source.startsWith('boon:') && !m.source.startsWith('synergy:')
            );
        }

        // Re-apply current boons' modifiers
        for (const boonId of Object.keys(this.activeBoons)) {
            const boon = BOONS[boonId];
            if (boon) {
                this._applyBoonStatModifiers(boonId, boon, player);
            }
        }

        // Re-apply current synergies
        for (const ancestorId of this.activeSynergies) {
            const ancestor = ANCESTORS[ancestorId];
            if (ancestor && ancestor.synergyBonus) {
                const source = `synergy:${ancestorId}`;
                for (const effect of ancestor.synergyBonus.effects) {
                    const stack = player.statStacks[effect.stat];
                    if (stack) {
                        stack.addModifier(ancestor.synergyBonus.id, effect.value, effect.type, source);
                    }
                }
            }
        }

        if (typeof recalculatePlayerStats === 'function') {
            recalculatePlayerStats(player);
        }

        console.log('='.repeat(60));
        console.log(`[BoonSystem.testAllBoons] Results: ${results.passed} passed, ${results.failed} failed out of ${Object.keys(BOONS).length} boons`);
        if (results.errors.length > 0) {
            console.log('Errors:', results.errors);
        }

        return results;
    }
};

// ============================================================================
// INTEGRATION WITH PLAYER STATS
// ============================================================================

/**
 * Apply boon bonuses to player HP calculation
 * Called by recalculatePlayerStats in player.js
 */
function applyBoonHpBonus(baseHp) {
    const hpMultiplier = BoonSystem.getTotalBonus('maxHp');
    return Math.floor(baseHp * hpMultiplier);
}

/**
 * Apply boon damage reduction to incoming damage
 * Called by applyDamage in combat-system.js
 */
function applyBoonDamageReduction(damage) {
    const reductionBonus = BoonSystem.getTotalBonus('damageReduction');
    // reductionBonus is additive, so 1.15 = 15% reduction
    const reduction = Math.max(0, reductionBonus - 1.0);
    return Math.floor(damage * (1 - reduction));
}

/**
 * Apply boon attack speed bonus
 * Called by getAttackCooldown functions
 */
function applyBoonAttackSpeed(baseCooldown) {
    const speedMultiplier = BoonSystem.getTotalBonus('attackSpeed');
    // Higher multiplier = faster attacks = lower cooldown
    return baseCooldown / speedMultiplier;
}

/**
 * Apply boon gold bonus
 * Called when picking up gold
 */
function applyBoonGoldBonus(baseGold) {
    const goldMultiplier = BoonSystem.getTotalBonus('gold');
    return Math.floor(baseGold * goldMultiplier);
}

/**
 * Apply boon XP bonus to skill XP
 * Called by awardMeleeXp, awardRangedXp, etc.
 */
function applyBoonXpBonus(baseXp) {
    const xpMultiplier = BoonSystem.getTotalBonus('xp');
    return Math.floor(baseXp * xpMultiplier);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.BOON_CONFIG = BOON_CONFIG;
window.ANCESTORS = ANCESTORS;
window.BOONS = BOONS;
window.BoonSystem = BoonSystem;

window.applyBoonHpBonus = applyBoonHpBonus;
window.applyBoonDamageReduction = applyBoonDamageReduction;
window.applyBoonAttackSpeed = applyBoonAttackSpeed;
window.applyBoonGoldBonus = applyBoonGoldBonus;
window.applyBoonXpBonus = applyBoonXpBonus;

console.log('Boon system loaded (Soul & Body Model - Wave 1 Enhanced)');
console.log(`  ${Object.keys(BOONS).length} boons, ${Object.keys(ANCESTORS).length} ancestors with synergies`);
