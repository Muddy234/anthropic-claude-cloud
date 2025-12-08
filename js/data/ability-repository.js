// ============================================================================
// ABILITY REPOSITORY - Shared ability definitions for all entities
// ============================================================================
// Central repository of attacks, behaviors, and mechanics that can be used
// by both bosses and regular enemies. Includes scaling functions for
// different entity tiers.
// ============================================================================

const AbilityRepository = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false
    },

    // ========================================================================
    // TIER SCALING - Adjusts ability parameters based on entity tier
    // ========================================================================
    TIER_SCALING: {
        'TIER_3': {  // Weakest enemies
            damageMultiplier: 0.4,
            cooldownMultiplier: 1.5,
            telegraphMultiplier: 0.5,  // Shorter telegraphs (faster attacks but weaker)
            rangeMultiplier: 0.7
        },
        'TIER_2': {
            damageMultiplier: 0.6,
            cooldownMultiplier: 1.2,
            telegraphMultiplier: 0.6,
            rangeMultiplier: 0.85
        },
        'TIER_1': {
            damageMultiplier: 0.8,
            cooldownMultiplier: 1.0,
            telegraphMultiplier: 0.8,
            rangeMultiplier: 1.0
        },
        'ELITE': {
            damageMultiplier: 1.0,
            cooldownMultiplier: 0.9,
            telegraphMultiplier: 1.0,
            rangeMultiplier: 1.0
        },
        'BOSS': {
            damageMultiplier: 1.2,
            cooldownMultiplier: 0.8,
            telegraphMultiplier: 1.2,  // Longer telegraphs for bosses (more time to react)
            rangeMultiplier: 1.2
        }
    },

    // ========================================================================
    // ATTACK ABILITIES - Offensive actions entities can perform
    // ========================================================================
    ATTACKS: {
        // === MELEE ATTACKS ===
        'melee_swing': {
            id: 'melee_swing',
            name: 'Melee Swing',
            category: 'melee',
            damage: 20,
            range: 2,
            aoe: { shape: 'arc', angle: 120, radius: 2 },
            telegraphTime: 600,
            cooldown: 2000,
            forBoss: true,
            forEnemy: true,
            description: 'Standard melee arc attack'
        },

        'heavy_slam': {
            id: 'heavy_slam',
            name: 'Heavy Slam',
            category: 'melee',
            damage: 40,
            range: 3,
            aoe: { shape: 'circle', radius: 2.5 },
            telegraphTime: 1200,
            cooldown: 5000,
            effect: 'knockback',
            knockbackForce: 3,
            forBoss: true,
            forEnemy: true,
            description: 'Powerful slam that knocks back'
        },

        'double_strike': {
            id: 'double_strike',
            name: 'Double Strike',
            category: 'melee',
            damage: 15,
            range: 2,
            hitCount: 2,
            hitDelay: 300,
            aoe: { shape: 'arc', angle: 90, radius: 2 },
            telegraphTime: 500,
            cooldown: 3000,
            forBoss: true,
            forEnemy: true,
            description: 'Two quick strikes in succession'
        },

        'sweep': {
            id: 'sweep',
            name: 'Sweeping Attack',
            category: 'melee',
            damage: 25,
            range: 3,
            aoe: { shape: 'arc', angle: 270, radius: 3 },
            telegraphTime: 1000,
            cooldown: 6000,
            forBoss: true,
            forEnemy: false,  // Too powerful for regular enemies
            description: 'Wide sweeping attack'
        },

        'lunge': {
            id: 'lunge',
            name: 'Lunge',
            category: 'melee',
            damage: 18,
            range: 3,
            aoe: { shape: 'line', width: 1, length: 3 },
            telegraphTime: 400,
            cooldown: 2500,
            effect: 'dash_to_target',
            dashDistance: 2,
            forBoss: true,
            forEnemy: true,
            description: 'Quick forward lunge attack'
        },

        'bite': {
            id: 'bite',
            name: 'Vicious Bite',
            category: 'melee',
            damage: 22,
            range: 1,
            aoe: { shape: 'arc', angle: 60, radius: 1 },
            telegraphTime: 300,
            cooldown: 1800,
            effect: 'bleed',
            bleedDamage: 3,
            bleedDuration: 3000,
            forBoss: true,
            forEnemy: true,
            description: 'Quick bite that causes bleeding'
        },

        'claw_swipe': {
            id: 'claw_swipe',
            name: 'Claw Swipe',
            category: 'melee',
            damage: 16,
            range: 2,
            aoe: { shape: 'arc', angle: 90, radius: 2 },
            telegraphTime: 350,
            cooldown: 1500,
            forBoss: true,
            forEnemy: true,
            description: 'Fast claw attack'
        },

        'tail_whip': {
            id: 'tail_whip',
            name: 'Tail Whip',
            category: 'melee',
            damage: 14,
            range: 2.5,
            aoe: { shape: 'arc', angle: 180, radius: 2.5 },
            telegraphTime: 500,
            cooldown: 2200,
            effect: 'knockback',
            knockbackForce: 2,
            forBoss: true,
            forEnemy: true,
            description: 'Sweeping tail attack with knockback'
        },

        // === CHARGE ATTACKS ===
        'charge': {
            id: 'charge',
            name: 'Charge',
            category: 'charge',
            damage: 35,
            range: 10,
            aoe: { shape: 'line', width: 2 },
            telegraphTime: 800,
            cooldown: 6000,
            stunOnHit: true,
            stunDuration: 1000,
            moveDuringAttack: true,
            forBoss: true,
            forEnemy: true,
            description: 'Rush forward, stunning on hit'
        },

        'leaping_strike': {
            id: 'leaping_strike',
            name: 'Leaping Strike',
            category: 'charge',
            damage: 45,
            range: 8,
            aoe: { shape: 'circle', radius: 2 },
            telegraphTime: 1000,
            cooldown: 8000,
            effect: 'leap_to_target',
            forBoss: true,
            forEnemy: true,
            description: 'Leap to target location and slam'
        },

        'bull_rush': {
            id: 'bull_rush',
            name: 'Bull Rush',
            category: 'charge',
            damage: 30,
            range: 12,
            aoe: { shape: 'line', width: 3 },
            telegraphTime: 1200,
            cooldown: 10000,
            wallCollisionDamage: 20,
            stunOnWall: true,
            forBoss: true,
            forEnemy: false,
            description: 'Powerful rush that stuns if hitting wall'
        },

        'pounce': {
            id: 'pounce',
            name: 'Pounce',
            category: 'charge',
            damage: 20,
            range: 5,
            aoe: { shape: 'circle', radius: 1 },
            telegraphTime: 500,
            cooldown: 4000,
            effect: 'leap_to_target',
            forBoss: true,
            forEnemy: true,
            description: 'Quick pounce attack'
        },

        // === RANGED ATTACKS ===
        'projectile_single': {
            id: 'projectile_single',
            name: 'Projectile',
            category: 'ranged',
            damage: 15,
            range: 12,
            projectile: true,
            projectileSpeed: 8,
            telegraphTime: 400,
            cooldown: 2000,
            forBoss: true,
            forEnemy: true,
            description: 'Single ranged projectile'
        },

        'projectile_burst': {
            id: 'projectile_burst',
            name: 'Projectile Burst',
            category: 'ranged',
            damage: 12,
            range: 10,
            projectile: true,
            projectileCount: 3,
            projectileSpread: 30,
            projectileSpeed: 6,
            telegraphTime: 600,
            cooldown: 4000,
            forBoss: true,
            forEnemy: true,
            description: 'Burst of three projectiles'
        },

        'projectile_volley': {
            id: 'projectile_volley',
            name: 'Projectile Volley',
            category: 'ranged',
            damage: 10,
            range: 15,
            projectile: true,
            projectileCount: 8,
            projectileSpread: 360,
            projectileSpeed: 5,
            telegraphTime: 1000,
            cooldown: 8000,
            forBoss: true,
            forEnemy: false,
            description: 'Ring of projectiles in all directions'
        },

        'homing_orb': {
            id: 'homing_orb',
            name: 'Homing Orb',
            category: 'ranged',
            damage: 25,
            range: 20,
            projectile: true,
            homing: true,
            projectileSpeed: 4,
            homingStrength: 0.5,
            telegraphTime: 800,
            cooldown: 6000,
            forBoss: true,
            forEnemy: true,
            description: 'Slow homing projectile'
        },

        'spit': {
            id: 'spit',
            name: 'Acid Spit',
            category: 'ranged',
            damage: 12,
            range: 6,
            projectile: true,
            projectileSpeed: 7,
            telegraphTime: 350,
            cooldown: 2500,
            element: 'poison',
            effect: 'poison',
            poisonDamage: 2,
            poisonDuration: 3000,
            forBoss: true,
            forEnemy: true,
            description: 'Poisonous spit attack'
        },

        // === AOE ATTACKS ===
        'ground_slam': {
            id: 'ground_slam',
            name: 'Ground Slam',
            category: 'aoe',
            damage: 30,
            range: 4,
            aoe: { shape: 'circle', radius: 3 },
            telegraphTime: 1000,
            cooldown: 5000,
            effect: 'screen_shake',
            forBoss: true,
            forEnemy: true,
            description: 'Slam the ground, damaging all nearby'
        },

        'shockwave': {
            id: 'shockwave',
            name: 'Shockwave',
            category: 'aoe',
            damage: 20,
            aoe: { shape: 'ring', innerRadius: 1, outerRadius: 6 },
            telegraphTime: 800,
            cooldown: 7000,
            knockback: true,
            forBoss: true,
            forEnemy: false,
            description: 'Expanding ring of damage'
        },

        'meteor': {
            id: 'meteor',
            name: 'Meteor Strike',
            category: 'aoe',
            damage: 50,
            aoe: { shape: 'circle', radius: 3 },
            telegraphTime: 2000,
            cooldown: 12000,
            targetLocation: 'player',
            effect: 'spawn_fire_pool',
            forBoss: true,
            forEnemy: false,
            description: 'Delayed meteor at player location'
        },

        'quake': {
            id: 'quake',
            name: 'Quake',
            category: 'aoe',
            damage: 15,
            aoe: { shape: 'full_room' },
            telegraphTime: 1500,
            cooldown: 15000,
            avoidableBy: 'jumping',
            forBoss: true,
            forEnemy: false,
            description: 'Room-wide ground shake'
        },

        'stomp': {
            id: 'stomp',
            name: 'Stomp',
            category: 'aoe',
            damage: 18,
            aoe: { shape: 'circle', radius: 2 },
            telegraphTime: 600,
            cooldown: 3500,
            effect: 'stun',
            stunDuration: 500,
            forBoss: true,
            forEnemy: true,
            description: 'Ground stomp with brief stun'
        },

        // === BREATH/CONE ATTACKS ===
        'fire_breath': {
            id: 'fire_breath',
            name: 'Fire Breath',
            category: 'breath',
            damage: 25,
            aoe: { shape: 'cone', angle: 60, range: 6 },
            telegraphTime: 1000,
            cooldown: 6000,
            element: 'fire',
            lingering: true,
            lingerDuration: 3000,
            forBoss: true,
            forEnemy: true,
            description: 'Cone of fire with lingering flames'
        },

        'frost_breath': {
            id: 'frost_breath',
            name: 'Frost Breath',
            category: 'breath',
            damage: 20,
            aoe: { shape: 'cone', angle: 75, range: 5 },
            telegraphTime: 1000,
            cooldown: 6000,
            element: 'ice',
            effect: 'slow',
            slowDuration: 3000,
            slowPercent: 0.5,
            forBoss: true,
            forEnemy: true,
            description: 'Cone of frost that slows'
        },

        'void_beam': {
            id: 'void_beam',
            name: 'Void Beam',
            category: 'breath',
            damage: 35,
            aoe: { shape: 'line', width: 1, range: 15 },
            telegraphTime: 1500,
            duration: 2000,
            cooldown: 10000,
            element: 'void',
            continuous: true,
            forBoss: true,
            forEnemy: false,
            description: 'Sustained beam of void energy'
        },

        'poison_cloud': {
            id: 'poison_cloud',
            name: 'Poison Cloud',
            category: 'breath',
            damage: 8,
            aoe: { shape: 'cone', angle: 90, range: 4 },
            telegraphTime: 700,
            cooldown: 5000,
            element: 'poison',
            effect: 'poison',
            poisonDamage: 3,
            poisonDuration: 4000,
            forBoss: true,
            forEnemy: true,
            description: 'Cone of poisonous gas'
        },

        // === SPECIAL ATTACKS ===
        'summon_minions': {
            id: 'summon_minions',
            name: 'Summon Minions',
            category: 'summon',
            damage: 0,
            cooldown: 12000,
            effect: 'spawn_enemies',
            spawnCount: 3,
            spawnType: 'basic',
            forBoss: true,
            forEnemy: false,
            description: 'Summon allied creatures'
        },

        'heal_pulse': {
            id: 'heal_pulse',
            name: 'Healing Pulse',
            category: 'support',
            damage: 0,
            cooldown: 15000,
            effect: 'heal_self',
            healPercent: 0.1,
            forBoss: true,
            forEnemy: true,
            description: 'Heal self for 10% max HP'
        },

        'shield_barrier': {
            id: 'shield_barrier',
            name: 'Shield Barrier',
            category: 'defensive',
            damage: 0,
            cooldown: 20000,
            effect: 'create_shield',
            shieldAmount: 100,
            shieldDuration: 5000,
            forBoss: true,
            forEnemy: false,
            description: 'Create temporary damage shield'
        },

        'berserk_roar': {
            id: 'berserk_roar',
            name: 'Berserk Roar',
            category: 'buff',
            damage: 0,
            aoe: { shape: 'circle', radius: 8 },
            cooldown: 25000,
            effect: 'buff_self',
            buffDamageMod: 1.5,
            buffSpeedMod: 1.3,
            buffDuration: 10000,
            forBoss: true,
            forEnemy: true,
            description: 'Roar that increases damage and speed'
        },

        'trap_spawn': {
            id: 'trap_spawn',
            name: 'Deploy Traps',
            category: 'tactical',
            damage: 0,
            cooldown: 10000,
            effect: 'spawn_traps',
            trapCount: 4,
            trapType: 'spike',
            forBoss: true,
            forEnemy: false,
            description: 'Place traps around the area'
        },

        'teleport_strike': {
            id: 'teleport_strike',
            name: 'Teleport Strike',
            category: 'special',
            damage: 40,
            aoe: { shape: 'circle', radius: 2 },
            telegraphTime: 500,
            cooldown: 8000,
            effect: 'teleport_behind_player',
            forBoss: true,
            forEnemy: true,
            description: 'Teleport behind target and strike'
        },

        'grab_throw': {
            id: 'grab_throw',
            name: 'Grab & Throw',
            category: 'special',
            damage: 30,
            range: 2,
            telegraphTime: 800,
            cooldown: 10000,
            effect: 'grab_and_throw',
            throwDistance: 5,
            forBoss: true,
            forEnemy: false,
            description: 'Grab and throw the target'
        },

        'web_shot': {
            id: 'web_shot',
            name: 'Web Shot',
            category: 'special',
            damage: 5,
            range: 6,
            projectile: true,
            projectileSpeed: 10,
            telegraphTime: 300,
            cooldown: 4000,
            effect: 'root',
            rootDuration: 2000,
            forBoss: true,
            forEnemy: true,
            description: 'Shoot web that roots target'
        },

        'shadow_step': {
            id: 'shadow_step',
            name: 'Shadow Step',
            category: 'special',
            damage: 25,
            range: 6,
            telegraphTime: 200,
            cooldown: 5000,
            effect: 'teleport_to_shadows',
            forBoss: true,
            forEnemy: true,
            description: 'Vanish and reappear with attack'
        },

        'bone_throw': {
            id: 'bone_throw',
            name: 'Bone Throw',
            category: 'ranged',
            damage: 14,
            range: 7,
            projectile: true,
            projectileSpeed: 9,
            telegraphTime: 400,
            cooldown: 2200,
            forBoss: true,
            forEnemy: true,
            description: 'Throw bone projectile'
        },

        'life_drain': {
            id: 'life_drain',
            name: 'Life Drain',
            category: 'special',
            damage: 18,
            range: 4,
            telegraphTime: 600,
            cooldown: 6000,
            effect: 'heal_on_hit',
            healPercent: 0.5,  // Heal 50% of damage dealt
            forBoss: true,
            forEnemy: true,
            description: 'Drain life from target'
        }
    },

    // ========================================================================
    // PASSIVE ABILITIES - Constant effects on entities
    // ========================================================================
    PASSIVES: {
        'regeneration': {
            id: 'regeneration',
            name: 'Regeneration',
            description: 'Slowly heal when not taking damage',
            healRate: 0.02,  // 2% max HP per second
            damageWindow: 3000,  // Must not take damage for 3s
            forBoss: true,
            forEnemy: true
        },

        'thorns': {
            id: 'thorns',
            name: 'Thorns',
            description: 'Reflect damage when hit',
            reflectPercent: 0.15,
            forBoss: true,
            forEnemy: true
        },

        'evasion': {
            id: 'evasion',
            name: 'Evasion',
            description: 'Chance to dodge attacks',
            dodgeChance: 0.2,
            forBoss: true,
            forEnemy: true
        },

        'armored': {
            id: 'armored',
            name: 'Armored',
            description: 'Increased physical defense',
            armorBonus: 10,
            forBoss: true,
            forEnemy: true
        },

        'magic_resist': {
            id: 'magic_resist',
            name: 'Magic Resistance',
            description: 'Reduced magic damage taken',
            magicResist: 0.25,
            forBoss: true,
            forEnemy: true
        },

        'fire_aura': {
            id: 'fire_aura',
            name: 'Fire Aura',
            description: 'Deal fire damage to nearby enemies',
            damage: 5,
            range: 2,
            interval: 1000,
            element: 'fire',
            forBoss: true,
            forEnemy: true
        },

        'frost_aura': {
            id: 'frost_aura',
            name: 'Frost Aura',
            description: 'Slow nearby enemies',
            slowPercent: 0.3,
            range: 3,
            forBoss: true,
            forEnemy: true
        },

        'vampiric': {
            id: 'vampiric',
            name: 'Vampiric',
            description: 'Heal on dealing damage',
            healPercent: 0.15,
            forBoss: true,
            forEnemy: true
        },

        'berserk': {
            id: 'berserk',
            name: 'Berserk',
            description: 'Deal more damage at low health',
            healthThreshold: 0.3,
            damageBonus: 0.5,
            forBoss: true,
            forEnemy: true
        },

        'pack_hunter': {
            id: 'pack_hunter',
            name: 'Pack Hunter',
            description: 'Stronger with allies nearby',
            bonusPerAlly: 0.1,  // 10% per ally
            maxBonus: 0.5,
            range: 5,
            forBoss: false,
            forEnemy: true
        },

        'ambusher': {
            id: 'ambusher',
            name: 'Ambusher',
            description: 'Bonus damage on first attack',
            firstStrikeBonus: 0.5,
            forBoss: true,
            forEnemy: true
        },

        'undying': {
            id: 'undying',
            name: 'Undying',
            description: 'Chance to survive lethal damage',
            surviveChance: 0.2,
            surviveHealth: 1,
            cooldown: 30000,
            forBoss: true,
            forEnemy: true
        },

        'poison_touch': {
            id: 'poison_touch',
            name: 'Poison Touch',
            description: 'Basic attacks apply poison',
            poisonDamage: 2,
            poisonDuration: 3000,
            forBoss: true,
            forEnemy: true
        },

        'flying': {
            id: 'flying',
            name: 'Flying',
            description: 'Can move over hazards',
            ignoreHazards: true,
            forBoss: true,
            forEnemy: true
        },

        'ethereal': {
            id: 'ethereal',
            name: 'Ethereal',
            description: 'Immune to physical damage periodically',
            immuneDuration: 2000,
            vulnerableDuration: 5000,
            forBoss: true,
            forEnemy: true
        }
    },

    // ========================================================================
    // MECHANIC EFFECTS - Triggered behaviors
    // ========================================================================
    MECHANICS: {
        'enrage': {
            id: 'enrage',
            name: 'Enrage',
            description: 'Becomes stronger at low health',
            trigger: 'health_threshold',
            threshold: 0.3,
            damageMod: 1.5,
            speedMod: 1.3,
            visual: 'red_glow',
            forBoss: true,
            forEnemy: true
        },

        'split': {
            id: 'split',
            name: 'Split',
            description: 'Splits into smaller versions on death',
            trigger: 'death',
            splitCount: 2,
            healthMod: 0.3,
            sizeMod: 0.6,
            forBoss: true,
            forEnemy: true
        },

        'death_explosion': {
            id: 'death_explosion',
            name: 'Death Explosion',
            description: 'Explodes on death',
            trigger: 'death',
            damage: 25,
            radius: 3,
            forBoss: true,
            forEnemy: true
        },

        'summon_on_hit': {
            id: 'summon_on_hit',
            name: 'Summon on Hit',
            description: 'Chance to summon ally when hit',
            trigger: 'on_damaged',
            chance: 0.15,
            spawnType: 'same_tier_lower',
            cooldown: 10000,
            forBoss: true,
            forEnemy: true
        },

        'teleport_when_hurt': {
            id: 'teleport_when_hurt',
            name: 'Teleport When Hurt',
            description: 'Teleport away when damaged',
            trigger: 'on_damaged',
            chance: 0.25,
            minDistance: 4,
            maxDistance: 8,
            cooldown: 5000,
            forBoss: true,
            forEnemy: true
        },

        'adaptive_resistance': {
            id: 'adaptive_resistance',
            name: 'Adaptive',
            description: 'Gains resistance to repeated damage types',
            trigger: 'on_damaged',
            resistanceGain: 0.1,
            maxResistance: 0.5,
            forBoss: true,
            forEnemy: false
        },

        'damage_reflection': {
            id: 'damage_reflection',
            name: 'Damage Reflection',
            description: 'Reflects portion of damage taken',
            trigger: 'on_damaged',
            reflectPercent: 0.2,
            forBoss: true,
            forEnemy: true
        },

        'call_for_help': {
            id: 'call_for_help',
            name: 'Call for Help',
            description: 'Alert nearby allies when entering combat',
            trigger: 'on_combat_start',
            alertRadius: 8,
            forBoss: true,
            forEnemy: true
        },

        'immunity_phase': {
            id: 'immunity_phase',
            name: 'Immunity Phase',
            description: 'Becomes immune and spawns guardians',
            trigger: 'health_threshold',
            threshold: 0.5,
            spawnCount: 4,
            forBoss: true,
            forEnemy: false
        },

        'minion_shield': {
            id: 'minion_shield',
            name: 'Minion Shield',
            description: 'Takes reduced damage while minions alive',
            damageReduction: 0.5,
            forBoss: true,
            forEnemy: false
        }
    },

    // ========================================================================
    // BEHAVIOR PATTERNS - AI combat styles
    // ========================================================================
    BEHAVIORS: {
        'aggressive': {
            id: 'aggressive',
            name: 'Aggressive',
            description: 'Constantly pursues and attacks',
            preferredRange: 2,
            chaseSpeed: 1.3,
            attackPriority: ['melee', 'charge', 'aoe'],
            retreatThreshold: 0,
            forBoss: true,
            forEnemy: true
        },

        'defensive': {
            id: 'defensive',
            name: 'Defensive',
            description: 'Maintains distance, uses ranged attacks',
            preferredRange: 8,
            chaseSpeed: 0.8,
            attackPriority: ['ranged', 'aoe', 'defensive'],
            retreatThreshold: 4,
            forBoss: true,
            forEnemy: true
        },

        'hit_and_run': {
            id: 'hit_and_run',
            name: 'Hit and Run',
            description: 'Attacks then retreats',
            preferredRange: 6,
            chaseSpeed: 1.5,
            attackPriority: ['charge', 'melee', 'ranged'],
            retreatAfterAttack: true,
            retreatDuration: 2000,
            forBoss: true,
            forEnemy: true
        },

        'berserker': {
            id: 'berserker',
            name: 'Berserker',
            description: 'More aggressive at low health',
            preferredRange: 2,
            attackPriority: ['melee', 'charge'],
            lowHealthSpeedBonus: 0.5,
            lowHealthDamageBonus: 0.3,
            forBoss: true,
            forEnemy: true
        },

        'ambusher': {
            id: 'ambusher',
            name: 'Ambusher',
            description: 'Waits in hiding, strikes suddenly',
            preferredRange: 0,
            attackPriority: ['special', 'melee'],
            stealthMode: true,
            ambushRange: 4,
            ambushBonus: 1.5,
            forBoss: true,
            forEnemy: true
        },

        'kiter': {
            id: 'kiter',
            name: 'Kiter',
            description: 'Keeps distance, uses ranged attacks',
            preferredRange: 6,
            chaseSpeed: 0.6,
            attackPriority: ['ranged', 'breath'],
            fleeWhenClose: true,
            fleeDistance: 3,
            forBoss: true,
            forEnemy: true
        },

        'guardian': {
            id: 'guardian',
            name: 'Guardian',
            description: 'Protects a location',
            preferredRange: 0,
            attackPriority: ['aoe', 'melee', 'defensive'],
            guardRadius: 5,
            forBoss: true,
            forEnemy: true
        },

        'swarm': {
            id: 'swarm',
            name: 'Swarm',
            description: 'Weak alone, strong in groups',
            preferredRange: 1,
            chaseSpeed: 1.2,
            attackPriority: ['melee'],
            packBonus: true,
            forBoss: false,
            forEnemy: true
        },

        'tactical': {
            id: 'tactical',
            name: 'Tactical',
            description: 'Uses positioning and traps',
            preferredRange: 5,
            attackPriority: ['tactical', 'ranged', 'aoe'],
            usesEnvironment: true,
            forBoss: true,
            forEnemy: false
        }
    },

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Get an attack ability scaled for a specific tier
     * @param {string} attackId - Attack ID
     * @param {string} tier - Entity tier (TIER_3, TIER_2, TIER_1, ELITE, BOSS)
     * @returns {object|null} Scaled attack or null if not found/not allowed
     */
    getScaledAttack(attackId, tier = 'TIER_2') {
        const attack = this.ATTACKS[attackId];
        if (!attack) return null;

        // Check if attack is allowed for this tier level
        if (tier === 'BOSS' && !attack.forBoss) return null;
        if (tier !== 'BOSS' && !attack.forEnemy) return null;

        const scaling = this.TIER_SCALING[tier] || this.TIER_SCALING['TIER_2'];

        return {
            ...attack,
            damage: Math.floor(attack.damage * scaling.damageMultiplier),
            cooldown: Math.floor(attack.cooldown * scaling.cooldownMultiplier),
            telegraphTime: attack.telegraphTime ? Math.floor(attack.telegraphTime * scaling.telegraphMultiplier) : 0,
            range: attack.range ? attack.range * scaling.rangeMultiplier : undefined,
            tier: tier,
            scaled: true
        };
    },

    /**
     * Get all attacks suitable for a specific tier
     * @param {string} tier - Entity tier
     * @param {string} category - Optional category filter
     * @returns {Array} Array of scaled attacks
     */
    getAttacksForTier(tier, category = null) {
        const attacks = [];
        const isBoss = tier === 'BOSS';

        for (const [id, attack] of Object.entries(this.ATTACKS)) {
            if (isBoss && !attack.forBoss) continue;
            if (!isBoss && !attack.forEnemy) continue;
            if (category && attack.category !== category) continue;

            attacks.push(this.getScaledAttack(id, tier));
        }

        return attacks;
    },

    /**
     * Get a passive ability
     * @param {string} passiveId - Passive ID
     * @param {string} tier - Entity tier (for validation)
     * @returns {object|null}
     */
    getPassive(passiveId, tier = 'TIER_2') {
        const passive = this.PASSIVES[passiveId];
        if (!passive) return null;

        const isBoss = tier === 'BOSS';
        if (isBoss && !passive.forBoss) return null;
        if (!isBoss && !passive.forEnemy) return null;

        return { ...passive };
    },

    /**
     * Get a mechanic effect
     * @param {string} mechanicId - Mechanic ID
     * @param {string} tier - Entity tier (for validation)
     * @returns {object|null}
     */
    getMechanic(mechanicId, tier = 'TIER_2') {
        const mechanic = this.MECHANICS[mechanicId];
        if (!mechanic) return null;

        const isBoss = tier === 'BOSS';
        if (isBoss && !mechanic.forBoss) return null;
        if (!isBoss && !mechanic.forEnemy) return null;

        return { ...mechanic };
    },

    /**
     * Get a behavior pattern
     * @param {string} behaviorId - Behavior ID
     * @param {string} tier - Entity tier (for validation)
     * @returns {object|null}
     */
    getBehavior(behaviorId, tier = 'TIER_2') {
        const behavior = this.BEHAVIORS[behaviorId];
        if (!behavior) return null;

        const isBoss = tier === 'BOSS';
        if (isBoss && !behavior.forBoss) return null;
        if (!isBoss && !behavior.forEnemy) return null;

        return { ...behavior };
    },

    /**
     * Get a random attack for an entity type
     * @param {string} tier - Entity tier
     * @param {Array} categories - Allowed categories
     * @returns {object|null}
     */
    getRandomAttack(tier, categories = null) {
        const attacks = this.getAttacksForTier(tier);
        const filtered = categories
            ? attacks.filter(a => categories.includes(a.category))
            : attacks;

        if (filtered.length === 0) return null;
        return filtered[Math.floor(Math.random() * filtered.length)];
    },

    /**
     * List all available components
     */
    listAll() {
        return {
            attacks: Object.keys(this.ATTACKS),
            passives: Object.keys(this.PASSIVES),
            mechanics: Object.keys(this.MECHANICS),
            behaviors: Object.keys(this.BEHAVIORS)
        };
    },

    /**
     * Get component counts
     */
    getCounts() {
        return {
            attacks: Object.keys(this.ATTACKS).length,
            passives: Object.keys(this.PASSIVES).length,
            mechanics: Object.keys(this.MECHANICS).length,
            behaviors: Object.keys(this.BEHAVIORS).length
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================
if (typeof window !== 'undefined') {
    window.AbilityRepository = AbilityRepository;
}

const counts = AbilityRepository.getCounts();
console.log('✅ Ability Repository loaded');
console.log(`   - ${counts.attacks} attack abilities`);
console.log(`   - ${counts.passives} passive abilities`);
console.log(`   - ${counts.mechanics} mechanic effects`);
console.log(`   - ${counts.behaviors} behavior patterns`);
