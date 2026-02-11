// ============================================================================
// AUDIO DEFINITIONS - The Shifting Chasm
// ============================================================================
// Sound effect and music metadata definitions
// All paths are relative to the project root
// ============================================================================

const AUDIO_DEFINITIONS = {

    // ========================================================================
    // PRELOAD LIST
    // ========================================================================
    // Sounds to preload on game start (critical feedback sounds)
    preload: [
        'hit_melee_1',
        'hit_melee_2',
        'player_hurt',
        'player_death',
        'ui_click',
        'ui_open',
        'ui_close',
        'item_pickup',
        'gold_pickup',
        'level_up'
    ],

    // ========================================================================
    // SFX DEFINITIONS
    // ========================================================================
    sfx: {
        // --------------------------------------------------------------------
        // COMBAT - Melee Attacks
        // --------------------------------------------------------------------
        sword_swing_1: {
            id: 'sword_swing_1',
            path: 'assets/audio/sfx/combat/sword_swing_1.ogg',
            volume: 0.7,
            pitchVariation: 0.1,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 100
        },
        sword_swing_2: {
            id: 'sword_swing_2',
            path: 'assets/audio/sfx/combat/sword_swing_2.ogg',
            volume: 0.7,
            pitchVariation: 0.1,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 100
        },
        sword_swing_3: {
            id: 'sword_swing_3',
            path: 'assets/audio/sfx/combat/sword_swing_3.ogg',
            volume: 0.7,
            pitchVariation: 0.1,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 100
        },

        // --------------------------------------------------------------------
        // COMBAT - Impacts
        // --------------------------------------------------------------------
        hit_melee_1: {
            id: 'hit_melee_1',
            path: 'assets/audio/sfx/combat/hit_melee_1.ogg',
            volume: 0.8,
            pitchVariation: 0.15,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 50
        },
        hit_melee_2: {
            id: 'hit_melee_2',
            path: 'assets/audio/sfx/combat/hit_melee_2.ogg',
            volume: 0.8,
            pitchVariation: 0.15,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 50
        },
        hit_melee_3: {
            id: 'hit_melee_3',
            path: 'assets/audio/sfx/combat/hit_melee_3.ogg',
            volume: 0.8,
            pitchVariation: 0.15,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 50
        },
        hit_critical: {
            id: 'hit_critical',
            path: 'assets/audio/sfx/combat/hit_critical.ogg',
            volume: 0.9,
            pitchVariation: 0.05,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 100
        },
        hit_blocked: {
            id: 'hit_blocked',
            path: 'assets/audio/sfx/combat/hit_blocked.ogg',
            volume: 0.7,
            pitchVariation: 0.1,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 100
        },

        // --------------------------------------------------------------------
        // COMBAT - Ranged
        // --------------------------------------------------------------------
        bow_release: {
            id: 'bow_release',
            path: 'assets/audio/sfx/combat/bow_release.ogg',
            volume: 0.6,
            pitchVariation: 0.1,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 150
        },
        arrow_hit: {
            id: 'arrow_hit',
            path: 'assets/audio/sfx/combat/arrow_hit.ogg',
            volume: 0.7,
            pitchVariation: 0.15,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 50
        },

        // --------------------------------------------------------------------
        // COMBAT - Magic
        // --------------------------------------------------------------------
        spell_fire: {
            id: 'spell_fire',
            path: 'assets/audio/sfx/combat/spell_fire.ogg',
            volume: 0.8,
            pitchVariation: 0.1,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 100
        },
        spell_ice: {
            id: 'spell_ice',
            path: 'assets/audio/sfx/combat/spell_ice.ogg',
            volume: 0.8,
            pitchVariation: 0.1,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 100
        },
        spell_lightning: {
            id: 'spell_lightning',
            path: 'assets/audio/sfx/combat/spell_lightning.ogg',
            volume: 0.9,
            pitchVariation: 0.05,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 100
        },
        spell_heal: {
            id: 'spell_heal',
            path: 'assets/audio/sfx/combat/spell_heal.ogg',
            volume: 0.7,
            pitchVariation: 0.1,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 200
        },

        // --------------------------------------------------------------------
        // PLAYER
        // --------------------------------------------------------------------
        player_hurt: {
            id: 'player_hurt',
            path: 'assets/audio/sfx/combat/player_hurt.ogg',
            volume: 0.9,
            pitchVariation: 0.1,
            priority: 'CRITICAL',
            category: 'combat',
            cooldown: 200
        },
        player_death: {
            id: 'player_death',
            path: 'assets/audio/sfx/combat/player_death.ogg',
            volume: 1.0,
            pitchVariation: 0,
            priority: 'CRITICAL',
            category: 'combat',
            cooldown: 1000
        },
        player_dodge: {
            id: 'player_dodge',
            path: 'assets/audio/sfx/combat/player_dodge.ogg',
            volume: 0.6,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'combat',
            cooldown: 300
        },

        // --------------------------------------------------------------------
        // MOVEMENT
        // --------------------------------------------------------------------
        footstep_stone_1: {
            id: 'footstep_stone_1',
            path: 'assets/audio/sfx/movement/footstep_stone_1.ogg',
            volume: 0.3,
            pitchVariation: 0.2,
            priority: 'LOW',
            category: 'footstep',
            cooldown: 200
        },
        footstep_stone_2: {
            id: 'footstep_stone_2',
            path: 'assets/audio/sfx/movement/footstep_stone_2.ogg',
            volume: 0.3,
            pitchVariation: 0.2,
            priority: 'LOW',
            category: 'footstep',
            cooldown: 200
        },
        footstep_dirt_1: {
            id: 'footstep_dirt_1',
            path: 'assets/audio/sfx/movement/footstep_dirt_1.ogg',
            volume: 0.25,
            pitchVariation: 0.2,
            priority: 'LOW',
            category: 'footstep',
            cooldown: 200
        },
        footstep_dirt_2: {
            id: 'footstep_dirt_2',
            path: 'assets/audio/sfx/movement/footstep_dirt_2.ogg',
            volume: 0.25,
            pitchVariation: 0.2,
            priority: 'LOW',
            category: 'footstep',
            cooldown: 200
        },
        door_open: {
            id: 'door_open',
            path: 'assets/audio/sfx/movement/door_open.ogg',
            volume: 0.5,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'ambient',
            cooldown: 300
        },
        door_close: {
            id: 'door_close',
            path: 'assets/audio/sfx/movement/door_close.ogg',
            volume: 0.5,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'ambient',
            cooldown: 300
        },
        stairs_descend: {
            id: 'stairs_descend',
            path: 'assets/audio/sfx/movement/stairs_descend.ogg',
            volume: 0.6,
            pitchVariation: 0.05,
            priority: 'MEDIUM',
            category: 'ambient',
            cooldown: 500
        },

        // --------------------------------------------------------------------
        // ITEMS
        // --------------------------------------------------------------------
        item_pickup: {
            id: 'item_pickup',
            path: 'assets/audio/sfx/items/item_pickup.ogg',
            volume: 0.6,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 50
        },
        gold_pickup: {
            id: 'gold_pickup',
            path: 'assets/audio/sfx/items/gold_pickup.ogg',
            volume: 0.6,
            pitchVariation: 0.15,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 50
        },
        equip_weapon: {
            id: 'equip_weapon',
            path: 'assets/audio/sfx/items/equip_weapon.ogg',
            volume: 0.5,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 200
        },
        equip_armor: {
            id: 'equip_armor',
            path: 'assets/audio/sfx/items/equip_armor.ogg',
            volume: 0.5,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 200
        },
        use_potion: {
            id: 'use_potion',
            path: 'assets/audio/sfx/items/use_potion.ogg',
            volume: 0.6,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'combat',
            cooldown: 300
        },
        chest_open: {
            id: 'chest_open',
            path: 'assets/audio/sfx/items/chest_open.ogg',
            volume: 0.7,
            pitchVariation: 0.05,
            priority: 'MEDIUM',
            category: 'ambient',
            cooldown: 500
        },

        // --------------------------------------------------------------------
        // ENVIRONMENT
        // --------------------------------------------------------------------
        extraction_hum: {
            id: 'extraction_hum',
            path: 'assets/audio/sfx/environment/extraction_hum.ogg',
            volume: 0.4,
            pitchVariation: 0,
            priority: 'LOW',
            category: 'ambient',
            cooldown: 0
        },
        extraction_activate: {
            id: 'extraction_activate',
            path: 'assets/audio/sfx/environment/extraction_activate.ogg',
            volume: 0.8,
            pitchVariation: 0,
            priority: 'HIGH',
            category: 'ambient',
            cooldown: 500
        },
        extraction_success: {
            id: 'extraction_success',
            path: 'assets/audio/sfx/environment/extraction_success.ogg',
            volume: 1.0,
            pitchVariation: 0,
            priority: 'CRITICAL',
            category: 'ambient',
            cooldown: 1000
        },
        shaft_warning: {
            id: 'shaft_warning',
            path: 'assets/audio/sfx/environment/shaft_warning.ogg',
            volume: 0.7,
            pitchVariation: 0,
            priority: 'HIGH',
            category: 'ambient',
            cooldown: 1000
        },
        shaft_collapse: {
            id: 'shaft_collapse',
            path: 'assets/audio/sfx/environment/shaft_collapse.ogg',
            volume: 1.0,
            pitchVariation: 0,
            priority: 'CRITICAL',
            category: 'ambient',
            cooldown: 1000
        },
        shift_warning_1: {
            id: 'shift_warning_1',
            path: 'assets/audio/sfx/environment/shift_warning_1.ogg',
            volume: 0.6,
            pitchVariation: 0,
            priority: 'HIGH',
            category: 'ambient',
            cooldown: 2000
        },
        shift_warning_2: {
            id: 'shift_warning_2',
            path: 'assets/audio/sfx/environment/shift_warning_2.ogg',
            volume: 0.8,
            pitchVariation: 0,
            priority: 'HIGH',
            category: 'ambient',
            cooldown: 2000
        },
        shift_warning_3: {
            id: 'shift_warning_3',
            path: 'assets/audio/sfx/environment/shift_warning_3.ogg',
            volume: 1.0,
            pitchVariation: 0,
            priority: 'CRITICAL',
            category: 'ambient',
            cooldown: 2000
        },
        meltdown: {
            id: 'meltdown',
            path: 'assets/audio/sfx/environment/meltdown.ogg',
            volume: 1.0,
            pitchVariation: 0,
            priority: 'CRITICAL',
            category: 'ambient',
            cooldown: 5000
        },
        rumble: {
            id: 'rumble',
            path: 'assets/audio/sfx/environment/rumble.ogg',
            volume: 0.5,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'ambient',
            cooldown: 500
        },
        lava_bubble: {
            id: 'lava_bubble',
            path: 'assets/audio/sfx/environment/lava_bubble.ogg',
            volume: 0.4,
            pitchVariation: 0.2,
            priority: 'LOW',
            category: 'ambient',
            cooldown: 300
        },

        // --------------------------------------------------------------------
        // SKILLS / ABILITIES
        // --------------------------------------------------------------------
        skill_activate: {
            id: 'skill_activate',
            path: 'assets/audio/sfx/combat/skill_activate.ogg',
            volume: 0.7,
            pitchVariation: 0.05,
            priority: 'HIGH',
            category: 'combat',
            cooldown: 100
        },
        skill_ready: {
            id: 'skill_ready',
            path: 'assets/audio/sfx/combat/skill_ready.ogg',
            volume: 0.5,
            pitchVariation: 0,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 500
        },
        buff_apply: {
            id: 'buff_apply',
            path: 'assets/audio/sfx/combat/buff_apply.ogg',
            volume: 0.6,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'combat',
            cooldown: 200
        },
        debuff_apply: {
            id: 'debuff_apply',
            path: 'assets/audio/sfx/combat/debuff_apply.ogg',
            volume: 0.6,
            pitchVariation: 0.1,
            priority: 'MEDIUM',
            category: 'combat',
            cooldown: 200
        },

        // --------------------------------------------------------------------
        // PROGRESSION
        // --------------------------------------------------------------------
        level_up: {
            id: 'level_up',
            path: 'assets/audio/sfx/ui/level_up.ogg',
            volume: 0.9,
            pitchVariation: 0,
            priority: 'CRITICAL',
            category: 'ui',
            cooldown: 1000
        },
        xp_gain: {
            id: 'xp_gain',
            path: 'assets/audio/sfx/ui/xp_gain.ogg',
            volume: 0.3,
            pitchVariation: 0.2,
            priority: 'LOW',
            category: 'ui',
            cooldown: 100
        },
        quest_complete: {
            id: 'quest_complete',
            path: 'assets/audio/sfx/ui/quest_complete.ogg',
            volume: 0.8,
            pitchVariation: 0,
            priority: 'HIGH',
            category: 'ui',
            cooldown: 1000
        },
        quest_update: {
            id: 'quest_update',
            path: 'assets/audio/sfx/ui/quest_update.ogg',
            volume: 0.6,
            pitchVariation: 0,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 500
        }
    },

    // ========================================================================
    // UI SOUND DEFINITIONS
    // ========================================================================
    ui: {
        ui_click: {
            id: 'ui_click',
            path: 'assets/audio/sfx/ui/click.ogg',
            volume: 0.5,
            pitchVariation: 0.05,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 50
        },
        ui_hover: {
            id: 'ui_hover',
            path: 'assets/audio/sfx/ui/hover.ogg',
            volume: 0.3,
            pitchVariation: 0.1,
            priority: 'LOW',
            category: 'ui',
            cooldown: 30
        },
        ui_open: {
            id: 'ui_open',
            path: 'assets/audio/sfx/ui/panel_open.ogg',
            volume: 0.5,
            pitchVariation: 0,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 100
        },
        ui_close: {
            id: 'ui_close',
            path: 'assets/audio/sfx/ui/panel_close.ogg',
            volume: 0.5,
            pitchVariation: 0,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 100
        },
        ui_error: {
            id: 'ui_error',
            path: 'assets/audio/sfx/ui/error.ogg',
            volume: 0.6,
            pitchVariation: 0,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 200
        },
        ui_notification: {
            id: 'ui_notification',
            path: 'assets/audio/sfx/ui/notification.ogg',
            volume: 0.6,
            pitchVariation: 0,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 300
        },
        ui_confirm: {
            id: 'ui_confirm',
            path: 'assets/audio/sfx/ui/confirm.ogg',
            volume: 0.6,
            pitchVariation: 0,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 200
        },
        ui_cancel: {
            id: 'ui_cancel',
            path: 'assets/audio/sfx/ui/cancel.ogg',
            volume: 0.5,
            pitchVariation: 0,
            priority: 'MEDIUM',
            category: 'ui',
            cooldown: 200
        },
        ui_tab_switch: {
            id: 'ui_tab_switch',
            path: 'assets/audio/sfx/ui/tab_switch.ogg',
            volume: 0.4,
            pitchVariation: 0.05,
            priority: 'LOW',
            category: 'ui',
            cooldown: 100
        }
    },

    // ========================================================================
    // MONSTER SOUND SETS
    // ========================================================================
    // Each monster type has a set of sounds for different actions
    // Coordinate with Lorekeeper for monster type IDs from monsters-data.js
    monsters: {
        // Generic fallback sounds
        generic: {
            idle: [
                { id: 'monster_idle_1', path: 'assets/audio/sfx/monsters/generic/idle_1.ogg', volume: 0.4 },
                { id: 'monster_idle_2', path: 'assets/audio/sfx/monsters/generic/idle_2.ogg', volume: 0.4 }
            ],
            alert: { id: 'monster_alert', path: 'assets/audio/sfx/monsters/generic/alert.ogg', volume: 0.6 },
            attack: [
                { id: 'monster_attack_1', path: 'assets/audio/sfx/monsters/generic/attack_1.ogg', volume: 0.7 },
                { id: 'monster_attack_2', path: 'assets/audio/sfx/monsters/generic/attack_2.ogg', volume: 0.7 }
            ],
            hit: { id: 'monster_hit', path: 'assets/audio/sfx/monsters/generic/hit.ogg', volume: 0.6 },
            death: { id: 'monster_death', path: 'assets/audio/sfx/monsters/generic/death.ogg', volume: 0.8 }
        },

        // Rat sounds
        rat: {
            idle: [
                { id: 'rat_idle_1', path: 'assets/audio/sfx/monsters/rat/idle_1.ogg', volume: 0.3 },
                { id: 'rat_idle_2', path: 'assets/audio/sfx/monsters/rat/idle_2.ogg', volume: 0.3 }
            ],
            alert: { id: 'rat_alert', path: 'assets/audio/sfx/monsters/rat/alert.ogg', volume: 0.5 },
            attack: [
                { id: 'rat_attack', path: 'assets/audio/sfx/monsters/rat/attack.ogg', volume: 0.5 }
            ],
            hit: { id: 'rat_hit', path: 'assets/audio/sfx/monsters/rat/hit.ogg', volume: 0.5 },
            death: { id: 'rat_death', path: 'assets/audio/sfx/monsters/rat/death.ogg', volume: 0.6 }
        },

        // Skeleton sounds
        skeleton: {
            idle: [
                { id: 'skeleton_rattle_1', path: 'assets/audio/sfx/monsters/skeleton/rattle_1.ogg', volume: 0.4 },
                { id: 'skeleton_rattle_2', path: 'assets/audio/sfx/monsters/skeleton/rattle_2.ogg', volume: 0.4 }
            ],
            alert: { id: 'skeleton_alert', path: 'assets/audio/sfx/monsters/skeleton/alert.ogg', volume: 0.6 },
            attack: [
                { id: 'skeleton_attack', path: 'assets/audio/sfx/monsters/skeleton/attack.ogg', volume: 0.6 }
            ],
            hit: { id: 'skeleton_hit', path: 'assets/audio/sfx/monsters/skeleton/hit.ogg', volume: 0.5 },
            death: { id: 'skeleton_death', path: 'assets/audio/sfx/monsters/skeleton/death.ogg', volume: 0.7 }
        },

        // Goblin sounds
        goblin: {
            idle: [
                { id: 'goblin_idle_1', path: 'assets/audio/sfx/monsters/goblin/idle_1.ogg', volume: 0.4 },
                { id: 'goblin_idle_2', path: 'assets/audio/sfx/monsters/goblin/idle_2.ogg', volume: 0.4 }
            ],
            alert: { id: 'goblin_alert', path: 'assets/audio/sfx/monsters/goblin/alert.ogg', volume: 0.6 },
            attack: [
                { id: 'goblin_attack_1', path: 'assets/audio/sfx/monsters/goblin/attack_1.ogg', volume: 0.6 },
                { id: 'goblin_attack_2', path: 'assets/audio/sfx/monsters/goblin/attack_2.ogg', volume: 0.6 }
            ],
            hit: { id: 'goblin_hit', path: 'assets/audio/sfx/monsters/goblin/hit.ogg', volume: 0.6 },
            death: { id: 'goblin_death', path: 'assets/audio/sfx/monsters/goblin/death.ogg', volume: 0.7 }
        },

        // Slime sounds
        slime: {
            idle: [
                { id: 'slime_squish_1', path: 'assets/audio/sfx/monsters/slime/squish_1.ogg', volume: 0.3 },
                { id: 'slime_squish_2', path: 'assets/audio/sfx/monsters/slime/squish_2.ogg', volume: 0.3 }
            ],
            alert: { id: 'slime_alert', path: 'assets/audio/sfx/monsters/slime/alert.ogg', volume: 0.4 },
            attack: [
                { id: 'slime_attack', path: 'assets/audio/sfx/monsters/slime/attack.ogg', volume: 0.5 }
            ],
            hit: { id: 'slime_hit', path: 'assets/audio/sfx/monsters/slime/hit.ogg', volume: 0.5 },
            death: { id: 'slime_death', path: 'assets/audio/sfx/monsters/slime/death.ogg', volume: 0.6 }
        },

        // Orc sounds
        orc: {
            idle: [
                { id: 'orc_grunt_1', path: 'assets/audio/sfx/monsters/orc/grunt_1.ogg', volume: 0.5 },
                { id: 'orc_grunt_2', path: 'assets/audio/sfx/monsters/orc/grunt_2.ogg', volume: 0.5 }
            ],
            alert: { id: 'orc_alert', path: 'assets/audio/sfx/monsters/orc/alert.ogg', volume: 0.7 },
            attack: [
                { id: 'orc_attack_1', path: 'assets/audio/sfx/monsters/orc/attack_1.ogg', volume: 0.7 },
                { id: 'orc_attack_2', path: 'assets/audio/sfx/monsters/orc/attack_2.ogg', volume: 0.7 }
            ],
            hit: { id: 'orc_hit', path: 'assets/audio/sfx/monsters/orc/hit.ogg', volume: 0.6 },
            death: { id: 'orc_death', path: 'assets/audio/sfx/monsters/orc/death.ogg', volume: 0.8 }
        },

        // Boss - Malphas
        malphas: {
            idle: [
                { id: 'malphas_idle', path: 'assets/audio/sfx/monsters/boss/malphas_idle.ogg', volume: 0.6 }
            ],
            alert: { id: 'malphas_alert', path: 'assets/audio/sfx/monsters/boss/malphas_alert.ogg', volume: 0.8 },
            attack: [
                { id: 'malphas_attack_1', path: 'assets/audio/sfx/monsters/boss/malphas_attack_1.ogg', volume: 0.8 },
                { id: 'malphas_attack_2', path: 'assets/audio/sfx/monsters/boss/malphas_attack_2.ogg', volume: 0.8 }
            ],
            hit: { id: 'malphas_hit', path: 'assets/audio/sfx/monsters/boss/malphas_hit.ogg', volume: 0.7 },
            death: { id: 'malphas_death', path: 'assets/audio/sfx/monsters/boss/malphas_death.ogg', volume: 1.0 },
            special: [
                { id: 'malphas_special_1', path: 'assets/audio/sfx/monsters/boss/malphas_special_1.ogg', volume: 0.9 },
                { id: 'malphas_special_2', path: 'assets/audio/sfx/monsters/boss/malphas_special_2.ogg', volume: 0.9 }
            ]
        },

        // Core Boss
        core_boss: {
            idle: [
                { id: 'core_idle', path: 'assets/audio/sfx/monsters/boss/core_idle.ogg', volume: 0.7 }
            ],
            alert: { id: 'core_alert', path: 'assets/audio/sfx/monsters/boss/core_alert.ogg', volume: 0.9 },
            attack: [
                { id: 'core_attack', path: 'assets/audio/sfx/monsters/boss/core_attack.ogg', volume: 0.9 }
            ],
            hit: { id: 'core_hit', path: 'assets/audio/sfx/monsters/boss/core_hit.ogg', volume: 0.8 },
            death: { id: 'core_death', path: 'assets/audio/sfx/monsters/boss/core_death.ogg', volume: 1.0 },
            phase_change: { id: 'core_phase_change', path: 'assets/audio/sfx/monsters/boss/core_phase_change.ogg', volume: 1.0 }
        }
    },

    // ========================================================================
    // COMBAT SOUND VARIATIONS
    // ========================================================================
    // Arrays of sound IDs for random selection
    combatVariations: {
        sword_swing: ['sword_swing_1', 'sword_swing_2', 'sword_swing_3'],
        hit_melee: ['hit_melee_1', 'hit_melee_2', 'hit_melee_3'],
        footstep_stone: ['footstep_stone_1', 'footstep_stone_2'],
        footstep_dirt: ['footstep_dirt_1', 'footstep_dirt_2']
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a random sound ID from a variation group
 * @param {string} group - Variation group name
 * @returns {string|null} Random sound ID or null
 */
function getRandomSoundVariation(group) {
    const variations = AUDIO_DEFINITIONS.combatVariations[group];
    if (!variations || variations.length === 0) return null;
    return variations[Math.floor(Math.random() * variations.length)];
}

/**
 * Get monster sounds for a given monster type
 * Falls back to generic if specific type not found
 * @param {string} monsterType
 * @returns {object} Monster sound set
 */
function getMonsterSounds(monsterType) {
    return AUDIO_DEFINITIONS.monsters[monsterType] ||
           AUDIO_DEFINITIONS.monsters.generic;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.AUDIO_DEFINITIONS = AUDIO_DEFINITIONS;
    window.getRandomSoundVariation = getRandomSoundVariation;
    window.getMonsterSounds = getMonsterSounds;
}

console.log('[AudioDefinitions] Audio definitions loaded');
