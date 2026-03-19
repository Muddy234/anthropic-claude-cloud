import random
import statistics
from collections import Counter, defaultdict

# ==============================================================================
# CONFIGURATION — Matches current game state (Feb 2026)
# ==============================================================================

SIMULATIONS = 5000

# --- DUNGEON STRUCTURE ---
FLOORS_TO_WIN = 10

# Rooms per floor (scaling difficulty)
FLOOR_CONFIG = {
    1:  {'rooms': 8,  'enemies_per_room': (2, 3), 'empty_room_chance': 0.20},
    2:  {'rooms': 9,  'enemies_per_room': (2, 3), 'empty_room_chance': 0.18},
    3:  {'rooms': 10, 'enemies_per_room': (2, 4), 'empty_room_chance': 0.16},
    4:  {'rooms': 10, 'enemies_per_room': (2, 4), 'empty_room_chance': 0.14},
    5:  {'rooms': 11, 'enemies_per_room': (2, 4), 'empty_room_chance': 0.12},
    6:  {'rooms': 11, 'enemies_per_room': (3, 4), 'empty_room_chance': 0.10},
    7:  {'rooms': 12, 'enemies_per_room': (3, 5), 'empty_room_chance': 0.10},
    8:  {'rooms': 12, 'enemies_per_room': (3, 5), 'empty_room_chance': 0.08},
    9:  {'rooms': 13, 'enemies_per_room': (3, 5), 'empty_room_chance': 0.08},
    10: {'rooms': 14, 'enemies_per_room': (3, 6), 'empty_room_chance': 0.05},
}

# --- FLOOR SCALING (matches applyTierMultipliers in enemy-spawner.js) ---
# Flat 15% per floor for HP/STR/damage/XP, 10% per floor for defense
# Floor 1 = 1.0x, Floor 5 = 1.6x, Floor 10 = 2.35x
FLOOR_SCALING_RATE = 0.15
FLOOR_DEFENSE_SCALING_RATE = 0.10

# +15 max HP per floor cleared (from game-init.js advanceToNextFloor)
HP_BONUS_PER_FLOOR = 15

# --- SKILL PROFICIENCY SYSTEM (replaces old level-up / stat strategy) ---
# From skill-system.js
SKILL_CONFIG = {
    'proficiency_cap': 30,
    'bonus_per_level': 0.05,          # +5% damage per proficiency level
    'xp_per_damage': 0.5,            # 0.5 XP per damage dealt
    'xp_early_base': 25,             # Levels 0-4: base * (level + 2)
    'xp_early_threshold': 5,         # Switch to late curve at level 5
    'xp_late_multiplier': 15,        # Levels 5+: 15 * (level+1)^1.8
    'xp_late_exponent': 1.8,
}

# Player base stats from player.js (all stats start at 10)
PLAYER_BASE = {
    'hp': 100, 'max_hp': 100,
    'str': 10, 'agi': 10, 'int': 10,
    'pDef': 0, 'mDef': 0,
    'stamina': 100, 'max_stamina': 100,
    'potions': 2, 'potion_heal': 25,     # 2x Weak Health Potions (25 HP each)
}

# --- STARTER WEAPONS (6 categories, matches game data) ---
STARTER_WEAPONS = {
    'Rusty Sword': {
        'damageType': 'blade', 'weaponType': 'sword',
        'damage': 7, 'speed': 1.0,
        'stat_scaling': 'str', 'proficiency': 'melee',
        'range': 1, 'attackTime_ms': 440,
    },
    'Wooden Club': {
        'damageType': 'blunt', 'weaponType': 'mace',
        'damage': 8, 'speed': 0.9,
        'stat_scaling': 'str', 'proficiency': 'melee',
        'range': 1, 'attackTime_ms': 625,
    },
    'Wooden Spear': {
        'damageType': 'pierce', 'weaponType': 'polearm',
        'damage': 7, 'speed': 0.95,
        'stat_scaling': 'str', 'proficiency': 'melee',
        'range': 2, 'attackTime_ms': 500,
    },
    'Shortbow': {
        'damageType': 'pierce', 'weaponType': 'bow',
        'damage': 6, 'speed': 1.1,
        'stat_scaling': 'agi', 'proficiency': 'ranged',
        'range': 5, 'attackTime_ms': 375,
    },
    'Rusty Knife': {
        'damageType': 'pierce', 'weaponType': 'knife',
        'damage': 4, 'speed': 1.4,
        'stat_scaling': 'agi', 'proficiency': 'melee',
        'range': 1, 'attackTime_ms': 250,
    },
    'Gnarled Staff': {
        'damageType': 'magic', 'weaponType': 'staff',
        'damage': 6, 'speed': 0.9,
        'stat_scaling': 'int', 'proficiency': 'magic',
        'range': 2, 'attackTime_ms': 440,
    },
}

# --- AGI SCALING CONFIG (matches combat-master.js / damage-calculator.js) ---
AGI_CONFIG = {
    'base_hit_chance': 0.90,       # 90% base hit chance
    'hit_per_agi': 0.002,          # +0.2% per AGI
    'evasion_per_agi': 0.003,      # -0.3% per defender AGI (matches combat-master.js:752)
    'min_hit_chance': 0.50,        # Floor at 50%
    'max_hit_chance': 0.95,        # Cap at 95% (matches combat-master.js:759)
    'base_crit_chance': 0.05,      # 5% base crit chance
    'crit_per_agi': 0.001,         # +0.1% per AGI
    'max_crit_chance': 0.50,       # Cap at 50%
    'crit_multiplier': 2.5,        # 250% damage on crit
    'pierce_crit_bonus': 0.07,     # +7% crit for pierce weapons
    'defense_scaling': 0.015,      # 1.5% reduction per defense point
    'max_defense_reduction': 0.75  # Cap at 75% reduction
}

# --- WEAPON VS ARMOR MATRIX ---
# NOTE: combat-master.js line 639 applies these as 1.0 + value, treating them
# as additive modifiers. The canonical weapon-armor-matrix.js defines direct
# multipliers (0.7 / 1.0 / 1.3), but combat-master reads them with 1.0 + val.
# This means the ACTUAL in-game multipliers are 1.7 / 2.0 / 2.3.
# This is a known game bug. For simulation accuracy we use the values as stored
# in weapon-armor-matrix.js and apply the SAME 1.0 + val formula as the game.
WEAPON_ARMOR_MATRIX_RAW = {
    'blade':  {'unarmored': 1.3, 'cloth': 1.3, 'hide': 1.0, 'scaled': 1.0, 'armored': 0.7, 'stone': 0.7, 'bone': 1.0, 'ethereal': 1.0},
    'blunt':  {'unarmored': 1.0, 'cloth': 1.0, 'hide': 1.0, 'scaled': 1.0, 'armored': 1.3, 'stone': 1.3, 'bone': 1.3, 'ethereal': 0.7},
    'pierce': {'unarmored': 1.0, 'cloth': 1.3, 'hide': 1.3, 'scaled': 1.3, 'armored': 0.7, 'stone': 0.7, 'bone': 1.0, 'ethereal': 1.3},
    'magic':  {'unarmored': 1.3, 'cloth': 1.0, 'hide': 1.0, 'scaled': 1.0, 'armored': 1.3, 'stone': 1.3, 'bone': 1.0, 'ethereal': 0.7},
}

# --- DODGE / STAMINA (simplified for simulation) ---
DODGE_CONFIG = {
    'dodge_chance': 0.15,          # 15% chance player dodges any given enemy attack
    'stamina_cost': 25,            # Stamina cost per dodge
    'stamina_refund_on_kill': 25,  # Stamina refunded on kill
    'stamina_regen_per_tick': 1.5, # Regen per tick (15/s at 10 ticks/s)
}

# --- PLAYER SKILL FACTOR ---
# Action game factor: models how a skilled player uses kiting, positioning,
# and attack timing to reduce incoming damage. At 0.0 = fights like a turret,
# at 1.0 = takes zero damage. 0.40 = typical moderate player who kites somewhat.
PLAYER_SKILL_FACTOR = 0.40

# --- HEALING / RECOVERY ---
RECOVERY_CONFIG = {
    'campfire_heal_pct': 0.15,     # Heal 15% max HP between rooms (campfire + kiting)
    'potion_drop_chance': 0.12,    # 12% chance per kill to drop a potion
    'potion_drop_heal': 25,        # Dropped potions heal 25 HP (weak health potion)
}

# --- BOON SYSTEM (simplified for simulation) ---
BOON_CONFIG = {
    'shrines_per_floor': (2, 4),
    'max_boons': 8,
}

BOON_EFFECTS = [
    {'name': 'Ancestral Fury',     'type': 'damage_mult',     'value': 0.15},
    {'name': 'Iron Ancestor',      'type': 'damage_reduction', 'value': 0.10},
    {'name': 'Swift Blood',        'type': 'speed_mult',      'value': 0.10},
    {'name': 'Vital Heritage',     'type': 'max_hp',          'value': 20},
    {'name': 'Ancestor Precision', 'type': 'crit_bonus',      'value': 0.05},
    {'name': 'Enduring Will',      'type': 'defense',         'value': 3},
    {'name': 'Life Tap',           'type': 'lifesteal',       'value': 0.05},
]

# --- LOOT (for tracking purposes) ---
DROP_CHANCE = 40  # 40% chance per kill
LOOT_RARITY_BY_FLOOR = {
    1:  {'common': 0.90, 'uncommon': 0.10, 'rare': 0.00, 'epic': 0.00},
    3:  {'common': 0.65, 'uncommon': 0.25, 'rare': 0.09, 'epic': 0.01},
    5:  {'common': 0.50, 'uncommon': 0.28, 'rare': 0.17, 'epic': 0.05},
    7:  {'common': 0.40, 'uncommon': 0.28, 'rare': 0.22, 'epic': 0.10},
    10: {'common': 0.25, 'uncommon': 0.28, 'rare': 0.28, 'epic': 0.19},
}

# --- MONSTERS (29 monsters from monsters-data.js with tier assignments) ---
MONSTER_DATA = {
    # TIER_3 (Fodder) - 10 monsters
    'Magma Slime':      {'hp': 30,  'str': 6,  'agi': 5,  'int': 8,  'pDef': 15, 'mDef': 8,  'atkSpeed': 2.5, 'armor': 'unarmored', 'attackType': 'physical', 'attackRange': 1, 'xp': 15,  'tier': 'TIER_3'},
    'Flame Bat':        {'hp': 25,  'str': 12, 'agi': 20, 'int': 2,  'pDef': 4,  'mDef': 4,  'atkSpeed': 1.2, 'armor': 'hide',      'attackType': 'physical', 'attackRange': 1, 'xp': 35,  'tier': 'TIER_3'},
    'Cave Bat':         {'hp': 25,  'str': 6,  'agi': 18, 'int': 2,  'pDef': 2,  'mDef': 2,  'atkSpeed': 1.0, 'armor': 'hide',      'attackType': 'physical', 'attackRange': 1, 'xp': 15,  'tier': 'TIER_3'},
    'Frozen Husk':      {'hp': 85,  'str': 11, 'agi': 6,  'int': 4,  'pDef': 10, 'mDef': 8,  'atkSpeed': 2.0, 'armor': 'bone',      'attackType': 'physical', 'attackRange': 1, 'xp': 38,  'tier': 'TIER_3'},
    'Frost Elemental':  {'hp': 30,  'str': 6,  'agi': 10, 'int': 18, 'pDef': 4,  'mDef': 18, 'atkSpeed': 1.6, 'armor': 'ethereal',  'attackType': 'magic',    'attackRange': 4, 'xp': 45,  'tier': 'TIER_3'},
    'Ice Golem':        {'hp': 130, 'str': 20, 'agi': 3,  'int': 4,  'pDef': 22, 'mDef': 12, 'atkSpeed': 3.2, 'armor': 'stone',     'attackType': 'physical', 'attackRange': 1, 'xp': 55,  'tier': 'TIER_3'},
    'Shadow Imp':       {'hp': 30,  'str': 10, 'agi': 20, 'int': 6,  'pDef': 3,  'mDef': 6,  'atkSpeed': 0.8, 'armor': 'hide',      'attackType': 'physical', 'attackRange': 1, 'xp': 28,  'tier': 'TIER_3'},
    'Stone Guardian':   {'hp': 150, 'str': 35, 'agi': 2,  'int': 4,  'pDef': 25, 'mDef': 8,  'atkSpeed': 3.5, 'armor': 'stone',     'attackType': 'physical', 'attackRange': 1, 'xp': 75,  'tier': 'TIER_3'},
    'Demon Knight':     {'hp': 120, 'str': 27, 'agi': 10, 'int': 10, 'pDef': 18, 'mDef': 14, 'atkSpeed': 2.5, 'armor': 'armored',   'attackType': 'physical', 'attackRange': 1, 'xp': 80,  'tier': 'TIER_3'},
    'Giant Spider':     {'hp': 85,  'str': 18, 'agi': 12, 'int': 6,  'pDef': 10, 'mDef': 8,  'atkSpeed': 2.0, 'armor': 'hide',      'attackType': 'physical', 'attackRange': 1, 'xp': 48,  'tier': 'TIER_3'},

    # TIER_2 (Regular) - 9 monsters
    'Salamander':       {'hp': 30,  'str': 6,  'agi': 12, 'int': 10, 'pDef': 10, 'mDef': 10, 'atkSpeed': 1.8, 'armor': 'scaled',    'attackType': 'physical', 'attackRange': 1, 'xp': 18,  'tier': 'TIER_2'},
    'Ash Walker':       {'hp': 90,  'str': 12, 'agi': 6,  'int': 5,  'pDef': 8,  'mDef': 12, 'atkSpeed': 2.2, 'armor': 'bone',      'attackType': 'physical', 'attackRange': 1, 'xp': 35,  'tier': 'TIER_2'},
    'Cinder Wisp':      {'hp': 30,  'str': 3,  'agi': 16, 'int': 18, 'pDef': 2,  'mDef': 15, 'atkSpeed': 1.5, 'armor': 'ethereal',  'attackType': 'magic',    'attackRange': 4, 'xp': 35,  'tier': 'TIER_2'},
    'Stone Lurker':     {'hp': 80,  'str': 14, 'agi': 4,  'int': 3,  'pDef': 18, 'mDef': 5,  'atkSpeed': 2.8, 'armor': 'stone',     'attackType': 'physical', 'attackRange': 1, 'xp': 35,  'tier': 'TIER_2'},
    'Mushroom Sprite':  {'hp': 20,  'str': 5,  'agi': 8,  'int': 8,  'pDef': 4,  'mDef': 12, 'atkSpeed': 2.2, 'armor': 'unarmored', 'attackType': 'magic',    'attackRange': 3, 'xp': 12,  'tier': 'TIER_2'},
    'Skeletal Warrior': {'hp': 50,  'str': 13, 'agi': 8,  'int': 3,  'pDef': 10, 'mDef': 3,  'atkSpeed': 1.8, 'armor': 'bone',      'attackType': 'physical', 'attackRange': 1, 'xp': 28,  'tier': 'TIER_2'},
    'Deep Crawler':     {'hp': 85,  'str': 18, 'agi': 10, 'int': 4,  'pDef': 12, 'mDef': 6,  'atkSpeed': 1.6, 'armor': 'scaled',    'attackType': 'physical', 'attackRange': 1, 'xp': 48,  'tier': 'TIER_2'},
    'Shield Bearer':    {'hp': 90,  'str': 12, 'agi': 8,  'int': 6,  'pDef': 14, 'mDef': 10, 'atkSpeed': 2.0, 'armor': 'armored',   'attackType': 'physical', 'attackRange': 1, 'xp': 42,  'tier': 'TIER_2'},
    'Flame Sprite':     {'hp': 25,  'str': 8,  'agi': 22, 'int': 10, 'pDef': 2,  'mDef': 8,  'atkSpeed': 0.6, 'armor': 'ethereal',  'attackType': 'magic',    'attackRange': 1, 'xp': 25,  'tier': 'TIER_2'},

    # TIER_1 (Elite Soldier) - 6 monsters
    'Pyro Cultist':     {'hp': 50,  'str': 6,  'agi': 10, 'int': 16, 'pDef': 5,  'mDef': 8,  'atkSpeed': 2.0, 'armor': 'unarmored', 'attackType': 'magic',    'attackRange': 5, 'xp': 40,  'tier': 'TIER_1'},
    'Crystal Spider':   {'hp': 45,  'str': 11, 'agi': 14, 'int': 6,  'pDef': 8,  'mDef': 10, 'atkSpeed': 1.3, 'armor': 'scaled',    'attackType': 'physical', 'attackRange': 1, 'xp': 32,  'tier': 'TIER_1'},
    'Phantom':          {'hp': 25,  'str': 4,  'agi': 12, 'int': 20, 'pDef': 2,  'mDef': 18, 'atkSpeed': 2.0, 'armor': 'ethereal',  'attackType': 'magic',    'attackRange': 3, 'xp': 42,  'tier': 'TIER_1'},
    'Shadow Stalker':   {'hp': 45,  'str': 15, 'agi': 16, 'int': 8,  'pDef': 6,  'mDef': 10, 'atkSpeed': 1.0, 'armor': 'hide',      'attackType': 'physical', 'attackRange': 1, 'xp': 42,  'tier': 'TIER_1'},
    'Tide Serpent':     {'hp': 90,  'str': 16, 'agi': 14, 'int': 8,  'pDef': 8,  'mDef': 10, 'atkSpeed': 1.4, 'armor': 'scaled',    'attackType': 'physical', 'attackRange': 1, 'xp': 50,  'tier': 'TIER_1'},
    'Temple Sentinel':  {'hp': 90,  'str': 16, 'agi': 6,  'int': 8,  'pDef': 16, 'mDef': 12, 'atkSpeed': 2.2, 'armor': 'armored',   'attackType': 'physical', 'attackRange': 1, 'xp': 50,  'tier': 'TIER_1'},

    # ELITE (Boss Lieutenant) - 4 monsters
    'Obsidian Golem':   {'hp': 105, 'str': 18, 'agi': 3,  'int': 4,  'pDef': 20, 'mDef': 5,  'atkSpeed': 3.0, 'armor': 'stone',     'attackType': 'physical', 'attackRange': 1, 'xp': 45,  'tier': 'ELITE'},
    'Bone Golem':       {'hp': 120, 'str': 20, 'agi': 3,  'int': 2,  'pDef': 16, 'mDef': 8,  'atkSpeed': 3.2, 'armor': 'bone',      'attackType': 'physical', 'attackRange': 1, 'xp': 55,  'tier': 'ELITE'},
    'Void Touched':     {'hp': 95,  'str': 10, 'agi': 8,  'int': 18, 'pDef': 8,  'mDef': 16, 'atkSpeed': 1.8, 'armor': 'ethereal',  'attackType': 'magic',    'attackRange': 4, 'xp': 55,  'tier': 'ELITE'},
    'Blizzard Spirit':  {'hp': 35,  'str': 4,  'agi': 20, 'int': 14, 'pDef': 2,  'mDef': 14, 'atkSpeed': 1.2, 'armor': 'ethereal',  'attackType': 'magic',    'attackRange': 3, 'xp': 38,  'tier': 'ELITE'},
}

# --- TIER SPAWN WEIGHTS (from enemy-spawner.js) ---
TIER_SPAWN_WEIGHTS = {
    'near':  {'TIER_3': 0.80, 'TIER_2': 0.18, 'TIER_1': 0.02, 'ELITE': 0.00},
    'mid':   {'TIER_3': 0.50, 'TIER_2': 0.35, 'TIER_1': 0.12, 'ELITE': 0.03},
    'far':   {'TIER_3': 0.25, 'TIER_2': 0.35, 'TIER_1': 0.30, 'ELITE': 0.10},
}

# Floor bonus: +3% shift per floor after floor 1, cap 15%
FLOOR_TIER_SHIFT_RATE = 0.03
FLOOR_TIER_SHIFT_CAP = 0.15

# Pre-index monsters by tier for fast lookup
MONSTERS_BY_TIER = defaultdict(list)
for _name, _data in MONSTER_DATA.items():
    MONSTERS_BY_TIER[_data['tier']].append(_name)


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def apply_floor_scaling(base_stat, floor, is_defense=False):
    """Flat floor scaling matching applyTierMultipliers() in enemy-spawner.js"""
    if floor <= 1:
        return base_stat
    rate = FLOOR_DEFENSE_SCALING_RATE if is_defense else FLOOR_SCALING_RATE
    multiplier = 1.0 + (floor - 1) * rate
    return base_stat * multiplier


def create_player(weapon_name):
    """Create a new player with the specified weapon"""
    player = PLAYER_BASE.copy()
    weapon = STARTER_WEAPONS[weapon_name]
    player['weapon_name'] = weapon_name
    player['weapon'] = weapon
    player['boons'] = []
    player['skill_xp'] = 0.0
    player['skill_level'] = 0
    return player


def get_weapon_armor_modifier(damage_type, armor_type):
    """
    Get damage multiplier from weapon vs armor matchup.
    MATCHES combat-master.js line 639: return 1.0 + row[armorType]
    This means the raw matrix values (0.7/1.0/1.3) become (1.7/2.0/2.3).
    """
    row = WEAPON_ARMOR_MATRIX_RAW.get(damage_type)
    if not row:
        return 1.0
    raw_value = row.get(armor_type, 1.0)
    return 1.0 + raw_value  # Matches combat-master.js bug


def roll_hit(attacker_agi, defender_agi):
    """Roll to hit based on AGI difference (enemy attacking player)"""
    hit_chance = AGI_CONFIG['base_hit_chance']
    hit_chance += attacker_agi * AGI_CONFIG['hit_per_agi']
    hit_chance -= defender_agi * AGI_CONFIG['evasion_per_agi']
    hit_chance = max(AGI_CONFIG['min_hit_chance'], min(AGI_CONFIG['max_hit_chance'], hit_chance))
    return random.random() < hit_chance


def roll_crit(attacker_agi, damage_type='blade', crit_bonus=0):
    """Roll for critical hit"""
    crit_chance = AGI_CONFIG['base_crit_chance']
    crit_chance += attacker_agi * AGI_CONFIG['crit_per_agi']
    crit_chance += crit_bonus
    if damage_type == 'pierce':
        crit_chance += AGI_CONFIG['pierce_crit_bonus']
    crit_chance = min(AGI_CONFIG['max_crit_chance'], crit_chance)
    return random.random() < crit_chance


def get_player_damage(player, defender_stats, floor):
    """
    Calculate player damage (matches combat-master.js DamageCalculator).
    Formula: (weaponDmg + statBonus) * weaponArmorMod * defenseMod * skillMod * boonMod * variance
    """
    weapon = player['weapon']
    base = weapon['damage']

    # Stat scaling: Math.floor(statValue * 0.5)
    scaling_stat = weapon.get('stat_scaling', 'str')
    stat_value = player.get(scaling_stat, 10)
    base += int(stat_value * 0.5)

    # Weapon vs armor multiplier (with game bug: 1.0 + raw_value)
    armor_mod = get_weapon_armor_modifier(weapon['damageType'], defender_stats['armor'])
    base *= armor_mod

    # Defense: use mDef for magic weapons, pDef otherwise
    if weapon['damageType'] == 'magic':
        def_val = defender_stats.get('mDef', 0)
    else:
        def_val = defender_stats.get('pDef', 0)

    # Floor-scale monster defense
    def_val = apply_floor_scaling(def_val, floor, is_defense=True)

    reduction = def_val * AGI_CONFIG['defense_scaling']
    capped_reduction = min(reduction, AGI_CONFIG['max_defense_reduction'])
    def_mod = 1.0 - capped_reduction

    # Skill proficiency multiplier
    skill_mult = 1.0 + (player.get('skill_level', 0) * SKILL_CONFIG['bonus_per_level'])
    base *= skill_mult

    # Boon damage multiplier
    boon_dmg = sum(b['value'] for b in player.get('boons', []) if b['type'] == 'damage_mult')
    base *= (1.0 + boon_dmg)

    # Variance: +/- 10%
    variance = 0.90 + random.random() * 0.20

    return max(1, int(base * def_mod * variance))


def get_monster_damage(m_stats, player, floor):
    """Calculate monster damage (matches combat-master.js)"""
    attack_type = m_stats.get('attackType', 'physical')

    if attack_type == 'magic':
        stat = apply_floor_scaling(m_stats.get('int', 10), floor)
        base = int(stat * 0.5) + int(stat / 3.0)
    else:
        stat = apply_floor_scaling(m_stats['str'], floor)
        base = int(stat * 0.5) + int(stat / 5.0)

    # Player defense
    if attack_type == 'magic':
        def_val = player.get('mDef', 0)
    else:
        def_val = player.get('pDef', 0)

    reduction = def_val * AGI_CONFIG['defense_scaling']
    capped_reduction = min(reduction, AGI_CONFIG['max_defense_reduction'])
    def_mod = 1.0 - capped_reduction

    # Boon damage reduction
    boon_dr = sum(b['value'] for b in player.get('boons', []) if b['type'] == 'damage_reduction')
    boon_dr = min(boon_dr, 0.30)  # Cap at 30%
    dr_mod = 1.0 - boon_dr

    # Variance: +/- 10%
    variance = 0.90 + random.random() * 0.20

    return max(1, int(base * def_mod * dr_mod * variance))


def update_skill_level(player, damage_dealt):
    """Award skill XP and check for level up"""
    xp_gained = max(0.5, damage_dealt * SKILL_CONFIG['xp_per_damage'])
    player['skill_xp'] += xp_gained

    while player['skill_level'] < SKILL_CONFIG['proficiency_cap']:
        level = player['skill_level']
        if level < SKILL_CONFIG['xp_early_threshold']:
            xp_needed = SKILL_CONFIG['xp_early_base'] * (level + 2)
        else:
            xp_needed = int(SKILL_CONFIG['xp_late_multiplier'] * ((level + 1) ** SKILL_CONFIG['xp_late_exponent']))

        if player['skill_xp'] >= xp_needed:
            player['skill_xp'] -= xp_needed
            player['skill_level'] += 1
        else:
            break


def check_potion(p):
    """Use potion if HP is low"""
    if p['hp'] < p['max_hp'] * 0.40 and p['potions'] > 0:
        p['hp'] = min(p['max_hp'], p['hp'] + p['potion_heal'])
        p['potions'] -= 1
        return True
    return False


def spawn_enemy(floor, room_difficulty='mid'):
    """Spawn a random enemy based on tier weights and floor"""
    base_weights = TIER_SPAWN_WEIGHTS[room_difficulty].copy()

    # Apply floor bonus
    if floor > 1:
        floor_bonus = min(FLOOR_TIER_SHIFT_CAP, (floor - 1) * FLOOR_TIER_SHIFT_RATE)
        base_weights['TIER_3'] = max(0.10, base_weights['TIER_3'] - floor_bonus)
        base_weights['TIER_1'] += floor_bonus * 0.6
        base_weights['ELITE'] = min(0.25, base_weights['ELITE'] + floor_bonus * 0.4)
        # Normalize
        total = sum(base_weights.values())
        base_weights = {k: v / total for k, v in base_weights.items()}

    # Select tier
    roll = random.random()
    cumulative = 0
    selected_tier = 'TIER_3'
    for tier, weight in base_weights.items():
        cumulative += weight
        if roll <= cumulative:
            selected_tier = tier
            break

    # Pick random monster from tier
    candidates = MONSTERS_BY_TIER.get(selected_tier, MONSTERS_BY_TIER['TIER_3'])
    return random.choice(candidates)


def grant_boon(player):
    """Grant a random boon to the player (simplified)"""
    if len(player['boons']) >= BOON_CONFIG['max_boons']:
        return None
    boon = random.choice(BOON_EFFECTS).copy()

    # Apply immediate effects
    if boon['type'] == 'max_hp':
        player['max_hp'] += int(boon['value'])
        player['hp'] += int(boon['value'])
    elif boon['type'] == 'defense':
        player['pDef'] += int(boon['value'])

    player['boons'].append(boon)
    return boon


def get_room_difficulty(room_num, total_rooms):
    """Determine room difficulty bracket based on position"""
    pct = room_num / total_rooms
    if pct <= 0.33:
        return 'near'
    elif pct <= 0.66:
        return 'mid'
    else:
        return 'far'


def percentile(data, p):
    """Get percentile value from sorted data"""
    if not data:
        return 0
    idx = int(len(data) * p)
    return data[min(idx, len(data) - 1)]


# ==============================================================================
# FIGHT SIMULATION (single enemy)
# ==============================================================================

def fight(player, m_name, floor=1):
    """
    Simulate a fight between player and one monster.
    Returns: (dmg_dealt, dmg_taken, won)

    Uses a simplified exchange model based on attack speed ratios.
    The player attacks, the monster attacks, damage accumulates.
    Player skill factor reduces incoming damage (models kiting/positioning).
    """
    m_stats = MONSTER_DATA[m_name]

    # Apply floor scaling to monster HP
    m_hp = int(apply_floor_scaling(m_stats['hp'], floor))
    m_agi = m_stats.get('agi', 10)

    # Attack speed: how many ms per attack
    weapon = player['weapon']
    p_attack_ms = weapon.get('attackTime_ms', 440) * weapon.get('speed', 1.0)
    m_attack_ms = 440 * m_stats['atkSpeed']  # baseAttackTime * atkSpeed

    # Calculate attacks per "round" (normalize to player attack)
    # How many monster attacks per player attack
    if m_attack_ms > 0:
        m_attacks_per_p_attack = p_attack_ms / m_attack_ms
    else:
        m_attacks_per_p_attack = 1.0

    # Crit setup
    crit_bonus = weapon.get('crit_bonus', 0)
    boon_crit = sum(b['value'] for b in player.get('boons', []) if b['type'] == 'crit_bonus')
    boon_speed = sum(b['value'] for b in player.get('boons', []) if b['type'] == 'speed_mult')
    lifesteal = sum(b['value'] for b in player.get('boons', []) if b['type'] == 'lifesteal')

    total_dmg_dealt = 0
    total_dmg_taken = 0
    rounds = 0
    max_rounds = 100  # Safety cap

    while player['hp'] > 0 and m_hp > 0 and rounds < max_rounds:
        rounds += 1

        # --- Player attacks (always hits) ---
        dmg = get_player_damage(player, m_stats, floor)

        # Crit roll
        if roll_crit(player['agi'], weapon['damageType'], crit_bonus + boon_crit):
            dmg = int(dmg * AGI_CONFIG['crit_multiplier'])

        # Boon speed multiplier (chance for extra hit)
        if boon_speed > 0 and random.random() < boon_speed:
            extra_dmg = get_player_damage(player, m_stats, floor)
            dmg += extra_dmg

        m_hp -= dmg
        total_dmg_dealt += dmg
        update_skill_level(player, dmg)

        # Lifesteal
        if lifesteal > 0:
            heal = max(1, int(dmg * lifesteal))
            player['hp'] = min(player['max_hp'], player['hp'] + heal)

        if m_hp <= 0:
            break

        # --- Monster attacks ---
        # Number of monster attacks this round (based on speed ratio)
        n_attacks = int(m_attacks_per_p_attack)
        if random.random() < (m_attacks_per_p_attack - n_attacks):
            n_attacks += 1

        for _ in range(max(1, n_attacks)):
            if player['hp'] <= 0:
                break

            # Dodge check (player skill: dodging/kiting)
            if random.random() < DODGE_CONFIG['dodge_chance']:
                continue

            # Skill factor: player avoids damage through positioning/kiting
            if random.random() < PLAYER_SKILL_FACTOR:
                continue

            # Roll hit (monster AGI vs player AGI)
            if roll_hit(m_agi, player['agi']):
                dmg = get_monster_damage(m_stats, player, floor)
                player['hp'] -= dmg
                total_dmg_taken += dmg

                # Use potion if low
                if player['hp'] > 0 and player['hp'] < player['max_hp'] * 0.40:
                    check_potion(player)

    won = player['hp'] > 0
    return (total_dmg_dealt, total_dmg_taken, won)


# ==============================================================================
# FLOOR SIMULATION
# ==============================================================================

def run_floor(player, floor_num, analytics):
    """
    Simulate traversing a single floor.

    Returns: {
        'result': 'exit_reached' | 'death',
        'room': room number,
        'killer': enemy name if death,
        'kills': total kills this floor,
        'rooms_cleared': rooms passed,
        'hp_at_exit': HP when floor completed,
        'hp_before_death': HP before fatal fight,
        'tier_counts': dict of tier encounter counts
    }
    """
    config = FLOOR_CONFIG.get(floor_num, FLOOR_CONFIG[10])
    total_rooms = config['rooms']

    kills = 0
    tier_counts = Counter()

    # Boon shrines this floor
    shrine_count = random.randint(*BOON_CONFIG['shrines_per_floor'])
    shrine_rooms = set(random.sample(range(1, total_rooms + 1), min(shrine_count, total_rooms)))

    for room in range(1, total_rooms + 1):
        # Room difficulty bracket
        difficulty = get_room_difficulty(room, total_rooms)

        # Empty room check
        is_empty = random.random() < config['empty_room_chance']

        if not is_empty:
            enemy_count = random.randint(*config['enemies_per_room'])

            for _ in range(enemy_count):
                enemy = spawn_enemy(floor_num, difficulty)
                tier_counts[MONSTER_DATA[enemy]['tier']] += 1

                hp_before = player['hp']

                dmg_dealt, dmg_taken, won = fight(player, enemy, floor_num)

                analytics['monster_fights'][enemy] += 1
                analytics['monster_dmg_taken'][enemy] += dmg_taken
                analytics['total_fights'] += 1

                if not won:
                    analytics['monster_kills_player'][enemy] += 1
                    return {
                        'result': 'death',
                        'room': room,
                        'killer': enemy,
                        'kills': kills,
                        'rooms_cleared': room - 1,
                        'hp_before_death': hp_before,
                        'tier_counts': tier_counts,
                    }

                kills += 1
                analytics['monster_killed'][enemy] += 1

                # Drop loot (tracking only)
                if random.uniform(0, 100) <= DROP_CHANCE:
                    analytics['loot_drops'] += 1

                # Potion drop chance on kill
                if random.random() < RECOVERY_CONFIG['potion_drop_chance']:
                    player['potions'] += 1

        # Boon shrine
        if room in shrine_rooms:
            boon = grant_boon(player)
            if boon:
                analytics['boons_collected'] += 1

        # Between-room recovery (campfire rest, natural regen, kiting)
        if player['hp'] < player['max_hp']:
            heal_amount = int(player['max_hp'] * RECOVERY_CONFIG['campfire_heal_pct'])
            player['hp'] = min(player['max_hp'], player['hp'] + heal_amount)

        # Track HP after room
        analytics['hp_after_rooms'].append(player['hp'])

        if player['hp'] < player['max_hp'] * 0.2:
            analytics['close_calls'] += 1

    return {
        'result': 'exit_reached',
        'room': total_rooms,
        'killer': None,
        'kills': kills,
        'rooms_cleared': total_rooms,
        'hp_at_exit': player['hp'],
        'tier_counts': tier_counts,
    }


# ==============================================================================
# MAIN SIMULATION
# ==============================================================================

def run_simulation():
    # ==========================================================================
    # METRICS
    # ==========================================================================
    victories = 0
    victory_hp = []
    victory_skill_levels = []

    weapon_names = list(STARTER_WEAPONS.keys())
    weapon_victories = {w: 0 for w in weapon_names}
    weapon_kills = {w: 0 for w in weapon_names}
    weapon_runs = {w: 0 for w in weapon_names}

    deaths = 0
    death_floor = []
    death_room = []
    death_room_pct = []
    death_hp_before = []
    death_skill_level = []
    death_weapon = []
    killers = []

    floor_completions = {f: 0 for f in range(1, FLOORS_TO_WIN + 1)}
    floor_completion_hp = {f: [] for f in range(1, FLOORS_TO_WIN + 1)}
    floor_kills = {f: [] for f in range(1, FLOORS_TO_WIN + 1)}
    floor_tier_counts = {f: Counter() for f in range(1, FLOORS_TO_WIN + 1)}

    total_kills_per_run = []
    total_boons_per_run = []
    boon_type_counts = Counter()

    global_analytics = {
        'monster_fights': Counter(),
        'monster_killed': Counter(),
        'monster_kills_player': Counter(),
        'monster_dmg_taken': Counter(),
        'total_fights': 0,
        'hp_after_rooms': [],
        'close_calls': 0,
        'loot_drops': 0,
        'boons_collected': 0,
    }

    print(f"Running {SIMULATIONS} Dungeon Run Simulations...")
    print(f"Goal: Complete {FLOORS_TO_WIN} floors to escape (Permadeath)")
    print(f"Floor scaling: {FLOOR_SCALING_RATE*100:.0f}%/floor (HP/STR/DMG), {FLOOR_DEFENSE_SCALING_RATE*100:.0f}%/floor (DEF)")
    print(f"Player HP bonus: +{HP_BONUS_PER_FLOOR}/floor | Full heal on floor exit")
    print(f"Weapons: {', '.join(weapon_names)}")
    print(f"Monsters: {len(MONSTER_DATA)} types across 4 tiers")
    print(f"Skills: +{SKILL_CONFIG['bonus_per_level']*100:.0f}% damage per proficiency level (cap {SKILL_CONFIG['proficiency_cap']})")
    print(f"Boons: {BOON_CONFIG['shrines_per_floor'][0]}-{BOON_CONFIG['shrines_per_floor'][1]} shrines/floor, max {BOON_CONFIG['max_boons']}")
    print(f"Player skill factor: {PLAYER_SKILL_FACTOR*100:.0f}% damage avoidance (kiting/positioning)")
    print(f"Weapon-armor matrix: Using game formula (1.0 + raw_value)")
    print("-" * 60)

    # ==========================================================================
    # SIMULATION LOOP
    # ==========================================================================

    for sim in range(SIMULATIONS):
        weapon_choice = random.choice(weapon_names)
        player = create_player(weapon_choice)
        weapon_runs[weapon_choice] += 1

        run_kills = 0
        run_success = True

        analytics = {
            'monster_fights': Counter(),
            'monster_killed': Counter(),
            'monster_kills_player': Counter(),
            'monster_dmg_taken': Counter(),
            'total_fights': 0,
            'hp_after_rooms': [],
            'close_calls': 0,
            'loot_drops': 0,
            'boons_collected': 0,
        }

        for floor_num in range(1, FLOORS_TO_WIN + 1):
            result = run_floor(player, floor_num, analytics)

            run_kills += result['kills']

            # Accumulate tier counts
            for tier, count in result.get('tier_counts', {}).items():
                floor_tier_counts[floor_num][tier] += count

            if result['result'] == 'death':
                deaths += 1
                death_floor.append(floor_num)
                death_room.append(result['room'])

                floor_total_rooms = FLOOR_CONFIG.get(floor_num, FLOOR_CONFIG[10])['rooms']
                death_room_pct.append((result['room'] / floor_total_rooms) * 100)

                death_hp_before.append(result.get('hp_before_death', 0))
                death_skill_level.append(player['skill_level'])
                death_weapon.append(weapon_choice)
                killers.append(result['killer'])

                run_success = False
                break
            else:
                floor_completions[floor_num] += 1
                floor_completion_hp[floor_num].append(result['hp_at_exit'])
                floor_kills[floor_num].append(result['kills'])

                # Award +15 max HP and full heal between floors
                if floor_num < FLOORS_TO_WIN:
                    player['max_hp'] += HP_BONUS_PER_FLOOR
                    player['hp'] = player['max_hp']

        # Aggregate analytics
        for key in ['monster_fights', 'monster_killed', 'monster_kills_player', 'monster_dmg_taken']:
            global_analytics[key] += analytics[key]
        global_analytics['total_fights'] += analytics['total_fights']
        global_analytics['hp_after_rooms'].extend(analytics['hp_after_rooms'])
        global_analytics['close_calls'] += analytics['close_calls']
        global_analytics['loot_drops'] += analytics['loot_drops']
        global_analytics['boons_collected'] += analytics['boons_collected']

        total_kills_per_run.append(run_kills)
        total_boons_per_run.append(len(player['boons']))
        for b in player['boons']:
            boon_type_counts[b['name']] += 1

        weapon_kills[weapon_choice] += run_kills

        if run_success:
            victories += 1
            weapon_victories[weapon_choice] += 1
            victory_hp.append(player['hp'])
            victory_skill_levels.append(player['skill_level'])

    # ==========================================================================
    # REPORTING
    # ==========================================================================

    win_rate = (victories / SIMULATIONS) * 100

    print("\n" + "=" * 60)
    print("                    DUNGEON RUN REPORT")
    print("=" * 60)

    # --- VICTORY STATS ---
    print("\n" + "-" * 60)
    print("                      VICTORY ANALYSIS")
    print("-" * 60)

    print(f"\n  VICTORY RATE: {win_rate:.1f}% ({victories}/{SIMULATIONS})")

    if victories > 0:
        print(f"\n  Avg HP at Victory:          {statistics.mean(victory_hp):.1f}")
        print(f"  Avg Skill Level at Victory: {statistics.mean(victory_skill_levels):.1f}")

        victory_hp_sorted = sorted(victory_hp)
        print(f"\n  Victory HP Distribution:")
        print(f"    Min:   {min(victory_hp)}")
        print(f"    25th%: {percentile(victory_hp_sorted, 0.25)}")
        print(f"    50th%: {percentile(victory_hp_sorted, 0.50)}")
        print(f"    Max:   {max(victory_hp)}")

        close_victories = len([hp for hp in victory_hp if hp < 30])
        print(f"\n  Close Victories (HP<30): {(close_victories/victories)*100:.1f}%")

    # --- WEAPON PERFORMANCE ---
    print("\n" + "-" * 60)
    print("                   WEAPON PERFORMANCE")
    print("-" * 60)

    print(f"\n  {'Weapon':<20} {'Runs':>6} {'Win%':>7} {'Kills':>7} {'Avg Kills':>10}")
    print("  " + "-" * 52)

    weapon_stats = []
    for w in weapon_names:
        runs = weapon_runs[w]
        if runs == 0:
            continue
        wins = weapon_victories[w]
        w_win_rate = (wins / runs) * 100
        kills = weapon_kills[w]
        avg_kills = kills / runs
        weapon_stats.append((w, runs, w_win_rate, kills, avg_kills))

    weapon_stats.sort(key=lambda x: x[2], reverse=True)

    for w, runs, w_win_rate, kills, avg_kills in weapon_stats:
        weapon_data = STARTER_WEAPONS[w]
        dmg_type = weapon_data['damageType']
        bar = "#" * int(w_win_rate / 5) + "." * (20 - int(w_win_rate / 5))
        print(f"  {w:<20} {runs:>6} {w_win_rate:>6.1f}% {kills:>7} {avg_kills:>9.1f}")
        print(f"    -> {dmg_type} damage | {bar}")

    # Damage type summary
    print(f"\n  Win Rate by Damage Type:")
    dmg_type_stats = {}
    for w in weapon_names:
        dmg_type = STARTER_WEAPONS[w]['damageType']
        if dmg_type not in dmg_type_stats:
            dmg_type_stats[dmg_type] = {'runs': 0, 'wins': 0}
        dmg_type_stats[dmg_type]['runs'] += weapon_runs[w]
        dmg_type_stats[dmg_type]['wins'] += weapon_victories[w]

    for dmg_type in sorted(dmg_type_stats.keys()):
        stats = dmg_type_stats[dmg_type]
        if stats['runs'] > 0:
            rate = (stats['wins'] / stats['runs']) * 100
            bar = "#" * int(rate / 5) + "." * (20 - int(rate / 5))
            print(f"    {dmg_type:<10} {bar} {rate:5.1f}%")

    # --- FLOOR PROGRESSION ---
    print("\n" + "-" * 60)
    print("                    FLOOR PROGRESSION")
    print("-" * 60)

    print(f"\n  {'Floor':<8} {'Clear%':>8} {'Avg HP':>8} {'Max HP':>8} {'Avg Kills':>10}")
    print("  " + "-" * 46)

    for f in range(1, FLOORS_TO_WIN + 1):
        clear_pct = (floor_completions[f] / SIMULATIONS) * 100
        avg_hp = statistics.mean(floor_completion_hp[f]) if floor_completion_hp[f] else 0
        # Player max HP at this floor = 100 + (f-1)*15
        expected_max_hp = 100 + (f - 1) * HP_BONUS_PER_FLOOR
        avg_kills = statistics.mean(floor_kills[f]) if floor_kills[f] else 0
        print(f"  Floor {f:>2}  {clear_pct:>6.1f}%  {avg_hp:>7.1f}  {expected_max_hp:>6}  {avg_kills:>9.1f}")

    # --- TIER DISTRIBUTION BY FLOOR ---
    print("\n" + "-" * 60)
    print("                 TIER DISTRIBUTION BY FLOOR")
    print("-" * 60)

    print(f"\n  {'Floor':<8} {'TIER_3':>8} {'TIER_2':>8} {'TIER_1':>8} {'ELITE':>8}")
    print("  " + "-" * 42)

    for f in range(1, FLOORS_TO_WIN + 1):
        tc = floor_tier_counts[f]
        total_encounters = sum(tc.values()) or 1
        t3 = (tc.get('TIER_3', 0) / total_encounters) * 100
        t2 = (tc.get('TIER_2', 0) / total_encounters) * 100
        t1 = (tc.get('TIER_1', 0) / total_encounters) * 100
        te = (tc.get('ELITE', 0) / total_encounters) * 100
        print(f"  Floor {f:>2}  {t3:>6.1f}%  {t2:>6.1f}%  {t1:>6.1f}%  {te:>6.1f}%")

    # --- FLOOR SCALING VALIDATION ---
    print("\n" + "-" * 60)
    print("               FLOOR SCALING VALIDATION")
    print("-" * 60)

    sample_monster = 'Skeletal Warrior'
    m = MONSTER_DATA[sample_monster]
    print(f"\n  Sample: {sample_monster} (Base: {m['hp']} HP / {m['str']} STR / {m['pDef']} DEF)")
    print(f"  {'Floor':<8} {'HP':>8} {'STR':>8} {'DEF':>8} {'Mult':>8}")
    print("  " + "-" * 34)
    for f in [1, 3, 5, 7, 10]:
        hp = int(apply_floor_scaling(m['hp'], f))
        s = int(apply_floor_scaling(m['str'], f))
        d = int(apply_floor_scaling(m['pDef'], f, is_defense=True))
        mult = 1.0 + (f - 1) * FLOOR_SCALING_RATE
        print(f"  Floor {f:>2}  {hp:>7}  {s:>7}  {d:>7}  {mult:>6.2f}x")

    # --- DAMAGE FORMULA VALIDATION ---
    print("\n" + "-" * 60)
    print("               DAMAGE FORMULA VALIDATION")
    print("-" * 60)

    print(f"\n  Weapon-Armor Matrix (game formula: 1.0 + raw_value):")
    print(f"    blade vs unarmored: {get_weapon_armor_modifier('blade', 'unarmored'):.1f}x (strong)")
    print(f"    blade vs armored:   {get_weapon_armor_modifier('blade', 'armored'):.1f}x (weak)")
    print(f"    blunt vs stone:     {get_weapon_armor_modifier('blunt', 'stone'):.1f}x (strong)")
    print(f"    pierce vs hide:     {get_weapon_armor_modifier('pierce', 'hide'):.1f}x (strong)")
    print(f"    magic vs ethereal:  {get_weapon_armor_modifier('magic', 'ethereal'):.1f}x (weak)")

    test_player = create_player('Rusty Sword')
    test_m = MONSTER_DATA['Cave Bat']
    test_dmg = get_player_damage(test_player, test_m, 1)
    print(f"\n  Sample: Rusty Sword (7 dmg + 5 stat) vs Cave Bat (hide, 2 pDef):")
    print(f"    Base: 12, ArmorMod: {get_weapon_armor_modifier('blade', 'hide'):.1f}x, Def: {2*0.015:.1%} red")
    print(f"    Expected ~{int(12 * 2.0 * (1 - 0.03))}  |  Actual sample: {test_dmg}")

    # --- SKILL PROFICIENCY ---
    print("\n" + "-" * 60)
    print("                  SKILL PROFICIENCY")
    print("-" * 60)

    if victory_skill_levels:
        print(f"\n  At Victory:")
        print(f"    Avg Level:  {statistics.mean(victory_skill_levels):.1f}")
        print(f"    Min Level:  {min(victory_skill_levels)}")
        print(f"    Max Level:  {max(victory_skill_levels)}")
    if death_skill_level:
        print(f"\n  At Death:")
        print(f"    Avg Level:  {statistics.mean(death_skill_level):.1f}")
        print(f"    Min Level:  {min(death_skill_level)}")
        print(f"    Max Level:  {max(death_skill_level)}")

    # --- BOON ANALYSIS ---
    print("\n" + "-" * 60)
    print("                    BOON ANALYSIS")
    print("-" * 60)

    if total_boons_per_run:
        print(f"\n  Avg Boons per Run:  {statistics.mean(total_boons_per_run):.1f}")
        print(f"  Max Boons per Run:  {max(total_boons_per_run)}")
        print(f"\n  Most Common Boons:")
        for boon_name, count in boon_type_counts.most_common(7):
            print(f"    {boon_name:<25} {count:>5}x")

    # --- DEATH ANALYSIS ---
    print("\n" + "-" * 60)
    print("                      DEATH ANALYSIS")
    print("-" * 60)

    if deaths > 0:
        print(f"\n  Total Deaths: {deaths} ({(deaths/SIMULATIONS)*100:.1f}%)")

        print(f"\n  Deaths by Floor:")
        floor_death_counts = Counter(death_floor)
        for f in range(1, FLOORS_TO_WIN + 1):
            count = floor_death_counts.get(f, 0)
            pct = (count / deaths) * 100 if deaths > 0 else 0
            bar = "#" * int(pct / 5) + "." * (20 - int(pct / 5))
            print(f"    Floor {f:>2}: {bar} {pct:5.1f}% ({count})")

        print(f"\n  Deaths by Weapon:")
        weapon_death_counts = Counter(death_weapon)
        for w in weapon_names:
            count = weapon_death_counts.get(w, 0)
            pct = (count / deaths) * 100 if deaths > 0 else 0
            print(f"    {w:<20} {pct:5.1f}% ({count})")

        # Top killers
        print(f"\n  Top 10 Deadliest Monsters:")
        killer_counts = Counter(killers)
        for monster, count in killer_counts.most_common(10):
            pct = (count / deaths) * 100
            tier = MONSTER_DATA[monster]['tier']
            print(f"    {monster:<20} {tier:<8} {pct:5.1f}% ({count})")

    # --- MONSTER THREAT ANALYSIS ---
    print("\n" + "-" * 60)
    print("                  MONSTER THREAT ANALYSIS")
    print("-" * 60)

    ga = global_analytics
    print(f"\n  {'Monster':<20} {'Fights':>7} {'Killed':>7} {'Deaths':>7} {'Threat%':>8}")
    print("  " + "-" * 52)

    monster_threat = []
    for m_name in sorted(MONSTER_DATA.keys()):
        fights = ga['monster_fights'].get(m_name, 0)
        killed = ga['monster_killed'].get(m_name, 0)
        player_deaths = ga['monster_kills_player'].get(m_name, 0)
        threat = (player_deaths / fights * 100) if fights > 0 else 0
        if fights > 0:
            monster_threat.append((m_name, fights, killed, player_deaths, threat))

    # Sort by threat descending
    monster_threat.sort(key=lambda x: x[4], reverse=True)

    for m_name, fights, killed, player_deaths, threat in monster_threat[:15]:
        tier = MONSTER_DATA[m_name]['tier']
        print(f"  {m_name:<20} {fights:>7} {killed:>7} {player_deaths:>7} {threat:>7.1f}%  [{tier}]")

    # --- BALANCE FLAGS ---
    print("\n" + "-" * 60)
    print("                    BALANCE FLAGS")
    print("-" * 60)

    flags = []
    if win_rate < 10:
        flags.append(f"  [!] Very low win rate ({win_rate:.1f}%) - game may be too hard")
    elif win_rate > 50:
        flags.append(f"  [!] Very high win rate ({win_rate:.1f}%) - game may be too easy")
    elif win_rate < 15:
        flags.append(f"  [~] Low win rate ({win_rate:.1f}%) - slightly too hard for average player")
    elif win_rate > 35:
        flags.append(f"  [~] High win rate ({win_rate:.1f}%) - slightly too easy")
    else:
        flags.append(f"  [OK] Win rate ({win_rate:.1f}%) is in target range (15-35%)")

    # Check weapon balance
    if weapon_stats:
        best_wr = max(ws[2] for ws in weapon_stats)
        worst_wr = min(ws[2] for ws in weapon_stats)
        spread = best_wr - worst_wr
        if spread > 30:
            flags.append(f"  [!] Large weapon spread ({spread:.0f}pp) - balance concern")
        elif spread > 15:
            flags.append(f"  [~] Moderate weapon spread ({spread:.0f}pp)")
        else:
            flags.append(f"  [OK] Weapon balance is tight ({spread:.0f}pp spread)")

    # Check floor death distribution
    if deaths > 0:
        floor_death_counts = Counter(death_floor)
        f1_pct = floor_death_counts.get(1, 0) / deaths * 100
        if f1_pct > 60:
            flags.append(f"  [!] {f1_pct:.0f}% of deaths on Floor 1 - early game too punishing")
        elif f1_pct > 40:
            flags.append(f"  [~] {f1_pct:.0f}% of deaths on Floor 1 - consider easing early difficulty")

    # Check weapon-armor matrix bug
    flags.append(f"  [BUG] combat-master.js:639 applies 1.0+val to already-direct multipliers")
    flags.append(f"        blade vs unarmored = 1.0+1.3 = 2.3x (intended: 1.3x)")
    flags.append(f"        This makes ALL weapon matchups ~77% stronger than designed")

    for flag in flags:
        print(flag)

    # --- SUMMARY ---
    print("\n" + "=" * 60)
    print("                       SUMMARY")
    print("=" * 60)
    print(f"\n  Victory Rate:       {win_rate:.1f}%")
    print(f"  Total Fights:       {ga['total_fights']:,}")
    print(f"  Close Calls:        {ga['close_calls']:,}")
    print(f"  Loot Drops:         {ga['loot_drops']:,}")
    print(f"  Boons Collected:    {ga['boons_collected']:,}")
    if total_kills_per_run:
        print(f"  Avg Kills per Run:  {statistics.mean(total_kills_per_run):.1f}")
        print(f"  Max Kills per Run:  {max(total_kills_per_run)}")
    print()


# ==============================================================================
# ENTRY POINT
# ==============================================================================

if __name__ == '__main__':
    run_simulation()
