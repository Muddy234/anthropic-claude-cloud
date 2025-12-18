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
        theme: 'Light manipulation, fire damage, visibility'
    },
    headsman: {
        id: 'headsman',
        name: 'The Headsman',
        title: 'The Executioner',
        element: 'physical',
        color: '#c0392b',
        icon: String.fromCodePoint(0x2694), // ⚔
        theme: 'Execution, bleeding, critical strikes'
    },
    lurker: {
        id: 'lurker',
        name: 'The Lurker',
        title: 'Shadow Walker',
        element: 'shadow',
        color: '#2c3e50',
        icon: String.fromCodePoint(0x1F441), // 👁
        theme: 'Stealth, ambush, fear, darkness'
    },
    storm_caller: {
        id: 'storm_caller',
        name: 'The Storm-Caller',
        title: 'Voice of Thunder',
        element: 'lightning',
        color: '#9b59b6',
        icon: String.fromCodePoint(0x26A1), // ⚡
        theme: 'Speed, movement, knockback, momentum'
    },
    rot_weaver: {
        id: 'rot_weaver',
        name: 'The Rot-Weaver',
        title: 'Lord of Decay',
        element: 'poison',
        color: '#27ae60',
        icon: String.fromCodePoint(0x2620), // ☠
        theme: 'Poison, DoT, armor reduction, life steal'
    },
    iron_warden: {
        id: 'iron_warden',
        name: 'The Iron-Warden',
        title: 'The Immovable',
        element: 'ice',
        color: '#3498db',
        icon: String.fromCodePoint(0x1F9CA), // 🧊
        theme: 'Defense, frost, standing ground, armor'
    },
    maniac: {
        id: 'maniac',
        name: 'The Maniac',
        title: 'The Unhinged',
        element: 'chaos',
        color: '#e74c3c',
        icon: String.fromCodePoint(0x1F608), // 😈
        theme: 'Risk/reward, self-damage, extreme power'
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
        description: 'Light Radius scales with HP (Low HP = Darkness)',
        lore: 'Tethered to the spark.',
        icon: String.fromCodePoint(0x1F56F), // 🕯
        color: '#c0392b',
        ancestor: null,
        tier: 'resonance',
        requires: ['torchbearer', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'hp_scaling', stat: 'lightRadius' },
        getBonus: () => ({ lightScalesWithHp: true })
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
        description: '+30% Speed, but stopping stuns YOU for 0.5s',
        lore: "Can't stop.",
        icon: String.fromCodePoint(0x26A1), // ⚡
        color: '#a93226',
        ancestor: null,
        tier: 'resonance',
        requires: ['storm_caller', 'maniac'],
        stackable: false,
        maxStacks: 1,
        effect: { type: 'tradeoff', bonus: { speed: 0.30 }, penalty: { stopStunsSelf: 0.5 } },
        getBonus: () => ({ momentumSpeed: 0.30, stopSelfStun: 0.5 })
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

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize boon system for a new session
     */
    init() {
        this.activeBoons = {};
        console.log('[BoonSystem] Initialized (no active boons)');
    },

    /**
     * Clear all boons (on death or new game)
     */
    clearBoons() {
        this.activeBoons = {};
        console.log('[BoonSystem] All boons cleared');
    },

    // ========================================================================
    // BOON MANAGEMENT
    // ========================================================================

    /**
     * Grant a boon to the player
     * @param {string} boonId - ID of the boon to grant
     * @returns {boolean} Success
     */
    grantBoon(boonId) {
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

        // Add or stack the boon
        if (this.activeBoons[boonId]) {
            // Already have this boon - try to stack
            if (!boon.stackable) {
                console.log(`[BoonSystem] ${boon.name} is not stackable`);
                if (typeof addMessage === 'function') {
                    addMessage(`${boon.name} cannot stack!`, 'info');
                }
                return false;
            }

            if (this.activeBoons[boonId] >= boon.maxStacks) {
                console.log(`[BoonSystem] ${boon.name} at max stacks (${boon.maxStacks})`);
                if (typeof addMessage === 'function') {
                    addMessage(`${boon.name} at maximum stacks!`, 'info');
                }
                return false;
            }

            this.activeBoons[boonId]++;
            console.log(`[BoonSystem] ${boon.name} stacked to ${this.activeBoons[boonId]}`);
        } else {
            // New boon
            this.activeBoons[boonId] = 1;
            console.log(`[BoonSystem] Granted ${boon.name}`);
        }

        // Notify player
        if (typeof addMessage === 'function') {
            const stacks = this.activeBoons[boonId];
            const stackText = stacks > 1 ? ` (x${stacks})` : '';
            addMessage(`Boon acquired: ${boon.name}${stackText}`, 'reward');
        }

        // Recalculate player stats with new boon
        if (typeof recalculatePlayerStats === 'function' && game.player) {
            recalculatePlayerStats(game.player);
        }

        return true;
    },

    /**
     * Remove a boon from the player
     * @param {string} boonId - ID of the boon to remove
     * @param {boolean} removeAllStacks - Remove all stacks or just one
     */
    removeBoon(boonId, removeAllStacks = true) {
        if (!this.activeBoons[boonId]) return;

        const boon = BOONS[boonId];
        if (removeAllStacks) {
            delete this.activeBoons[boonId];
        } else {
            this.activeBoons[boonId]--;
            if (this.activeBoons[boonId] <= 0) {
                delete this.activeBoons[boonId];
            }
        }

        console.log(`[BoonSystem] Removed ${boon?.name || boonId}`);

        // Recalculate stats
        if (typeof recalculatePlayerStats === 'function' && game.player) {
            recalculatePlayerStats(game.player);
        }
    },

    // ========================================================================
    // BONUS CALCULATION
    // ========================================================================

    /**
     * Get total bonus from all active boons for a specific stat
     * Boons stack multiplicatively: (1 + boon1) × (1 + boon2) × ...
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
                        // Damage reduction is additive then applied
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
                    // Future boons could add damage bonuses
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
    // SHRINE INTERACTION
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
     * Check if player meets requirements for a boon
     * @param {Object} boon - Boon definition
     * @returns {boolean}
     */
    meetsRequirements(boon) {
        // Core boons - always available
        if (boon.tier === 'core') {
            return true;
        }

        // Resonance boons - need 1 boon from each of 2 required ancestors
        if (boon.tier === 'resonance' && Array.isArray(boon.requires)) {
            const ancestorCounts = this.getAncestorCounts();
            const [ancestor1, ancestor2] = boon.requires;
            return (ancestorCounts[ancestor1] >= 1) && (ancestorCounts[ancestor2] >= 1);
        }

        // Legendary boons - need 3 boons from the same ancestor
        if (boon.tier === 'legendary' && boon.requires && boon.requires.ancestor) {
            const ancestorCounts = this.getAncestorCounts();
            return ancestorCounts[boon.requires.ancestor] >= boon.requires.count;
        }

        return false;
    },

    /**
     * Get random boons for a shrine offering
     * Respects tier requirements: Core always available, Resonance needs 2 ancestors, Legendary needs 3 from same
     * @param {number} count - Number of boons to offer
     * @returns {Array} Array of boon IDs
     */
    getShrineBoons(count = BOON_CONFIG.shrineBoonsOffered) {
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

            // Check tier requirements
            if (!this.meetsRequirements(boon)) {
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

        // Weighted shuffle
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
     * Get list of active boons for UI
     * @returns {Array} Array of { boon, stacks }
     */
    getActiveBoonList() {
        return Object.entries(this.activeBoons).map(([boonId, stacks]) => ({
            boon: BOONS[boonId],
            stacks
        })).filter(entry => entry.boon);
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

console.log('✓ Boon system loaded (Soul & Body Model)');
console.log(`  ${Object.keys(BOONS).length} boons available`);
