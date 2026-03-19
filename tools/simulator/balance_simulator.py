import random
import statistics
from collections import Counter, defaultdict

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SIMULATIONS = 5000

# Time Settings
NAV_TIME_PER_ROOM = 15.0  # Seconds walking/looting per room
TICK_DURATION = 0.1       # Seconds per combat tick

# Floor Scaling (matches game's tiered system - simplified to average rate)
FLOOR_SCALING = 0.12      # +12% per floor (average of tiered rates)
FLOOR_SCALING_CAP = 3.0   # Max 3x multiplier
KILLS_PER_FLOOR = 15      # Approximate kills before floor transition

# Player starts with normalized stats (matches player.js)
# Skills level up DURING a run, then reset on death
PLAYER_START = {
    'hp': 100, 'max_hp': 100,
    'str': 10, 'agi': 10, 'pDef': 0, 'mDef': 0,  # Base stats from player.js (no starting gear)
    'weaponDmg': 7, 'weaponType': 'blade',  # Assumes Rusty Sword found early
    'potions': 2, 'potion_heal': 50
}

# --- LIFESTEAL ON KILL ---
# Player heals for this percentage of the monster's max HP upon killing it
# Set to 0 to disable, 0.15 = 15% of monster's HP
LIFESTEAL_ON_KILL = 0.15

# --- SKILL SYSTEM (matches skill-system.js) ---
# Skills level up during a run, reset on death
SKILL_CONFIG = {
    'xp_curve_base': 100,           # Base XP for level 1
    'xp_curve_exponent': 1.5,       # XP = 100 * level^1.5
    'proficiency_cap': 100,         # Max skill level

    # Bonuses per level (from skill-system.js)
    'melee_damage_per_level': 0.02,     # +2% damage per melee level
    'defense_reduction_per_level': 0.002, # +0.2% damage reduction per defense level
    'vitality_hp_per_level': 2,         # +2 max HP per vitality level

    # XP rates (from skill-system.js)
    'melee_xp_per_damage': 0.5,         # 0.5 XP per damage dealt
    'defense_xp_per_damage': 0.3,       # 0.3 XP per damage taken
    'vitality_xp_per_heal': 0.5,        # 0.5 XP per HP healed (effective only)
}

def create_fresh_skills():
    """Create fresh skill state for a new run"""
    return {
        'melee': {'level': 0, 'xp': 0, 'xp_to_next': 100},
        'defense': {'level': 0, 'xp': 0, 'xp_to_next': 100},
        'vitality': {'level': 0, 'xp': 0, 'xp_to_next': 100},
    }

def get_xp_for_next_level(current_level):
    """Calculate XP required for next level: 100 * (level+1)^1.5"""
    return int(SKILL_CONFIG['xp_curve_base'] * ((current_level + 1) ** SKILL_CONFIG['xp_curve_exponent']))

def add_skill_xp(skills, skill_name, xp_amount):
    """Add XP to a skill and handle level-ups"""
    skill = skills[skill_name]
    if skill['level'] >= SKILL_CONFIG['proficiency_cap']:
        return False  # Already at cap

    skill['xp'] += xp_amount
    leveled = False

    while skill['xp'] >= skill['xp_to_next'] and skill['level'] < SKILL_CONFIG['proficiency_cap']:
        skill['xp'] -= skill['xp_to_next']
        skill['level'] += 1
        skill['xp_to_next'] = get_xp_for_next_level(skill['level'])
        leveled = True

    return leveled

def get_melee_damage_multiplier(skills):
    """Get damage multiplier from melee skill level"""
    level = skills['melee']['level']
    return 1.0 + (level * SKILL_CONFIG['melee_damage_per_level'])

def get_defense_reduction(skills):
    """Get damage reduction from defense skill level"""
    level = skills['defense']['level']
    return level * SKILL_CONFIG['defense_reduction_per_level']

def get_vitality_bonus_hp(skills):
    """Get bonus max HP from vitality skill level"""
    level = skills['vitality']['level']
    return level * SKILL_CONFIG['vitality_hp_per_level']

# --- LOOT (for tracking purposes - no altar sacrifice system in game) ---
DROP_CHANCE = 40  # 40% chance per kill
LOOT_TABLE = {
    'junk':   {'weight': 60},    # Ash (Common)
    'trophy': {'weight': 30},    # Fang (Uncommon)
    'gear':   {'weight': 10}     # Equipment (Rare)
}

# Spawn pool with XP values from monsters-data.js
# All 29 monsters with EQUAL spawn weights for balanced testing
SPAWN_POOL = {
    # === VOLCANIC MONSTERS ===
    'Magma Slime':      {'weight': 1, 'xp': 25},   # unarmored - slow tanky
    'Obsidian Golem':   {'weight': 1, 'xp': 45},   # stone - very slow, powerful
    'Cinder Wisp':      {'weight': 1, 'xp': 35},   # ethereal - fast ranged caster
    'Flame Bat':        {'weight': 1, 'xp': 30},   # hide - very fast melee
    'Ash Walker':       {'weight': 1, 'xp': 30},   # bone - tanky undead
    'Salamander':       {'weight': 1, 'xp': 35},   # scaled - balanced
    'Pyro Cultist':     {'weight': 1, 'xp': 40},   # unarmored - long range caster

    # === CAVE MONSTERS ===
    'Cave Bat':         {'weight': 1, 'xp': 15},   # hide - weak but fast
    'Stone Lurker':     {'weight': 1, 'xp': 35},   # stone - high defense
    'Mushroom Sprite':  {'weight': 1, 'xp': 28},   # unarmored - magic caster
    'Crystal Spider':   {'weight': 1, 'xp': 32},   # scaled - fast venomous

    # === UNDEAD MONSTERS ===
    'Skeletal Warrior': {'weight': 1, 'xp': 28},   # bone - standard melee
    'Phantom':          {'weight': 1, 'xp': 38},   # ethereal - life drainer
    'Bone Golem':       {'weight': 1, 'xp': 55},   # bone - massive, slow

    # === AQUATIC MONSTERS ===
    'Deep Crawler':     {'weight': 1, 'xp': 30},   # scaled - crustacean
    'Tide Serpent':     {'weight': 1, 'xp': 40},   # scaled - fast striker

    # === SHADOW MONSTERS ===
    'Shadow Stalker':   {'weight': 1, 'xp': 42},   # hide - fast assassin
    'Void Touched':     {'weight': 1, 'xp': 48},   # ethereal - void caster

    # === ICE MONSTERS ===
    'Frost Elemental':  {'weight': 1, 'xp': 45},   # ethereal - ice caster
    'Ice Golem':        {'weight': 1, 'xp': 55},   # stone - massive, slow
    'Frozen Husk':      {'weight': 1, 'xp': 32},   # bone - frozen undead
    'Blizzard Spirit':  {'weight': 1, 'xp': 38},   # ethereal - fast spirit

    # === COMBAT VARIETY ENEMIES ===
    'Shadow Imp':       {'weight': 1, 'xp': 28},   # hide - extremely fast
    'Temple Sentinel':  {'weight': 1, 'xp': 50},   # plate - has shield
    'Stone Guardian':   {'weight': 1, 'xp': 65},   # stone - massive, slow
    'Demon Knight':     {'weight': 1, 'xp': 70},   # plate - charging attacker
    'Giant Spider':     {'weight': 1, 'xp': 48},   # hide - sweeping attacks
    'Shield Bearer':    {'weight': 1, 'xp': 38},   # mail - has shield
    'Flame Sprite':     {'weight': 1, 'xp': 25},   # ethereal - extremely fast
}

# Monster stats from monsters-data.js (all 29 monsters)
# Note: Magic attackers use 'int' for damage calculation instead of 'str'
MONSTER_STATS = {
    # === VOLCANIC MONSTERS ===
    'Magma Slime':      {'hp': 60,  'str': 12, 'agi': 5,  'int': 8,  'pDef': 15, 'atkSpeed': 2.5, 'armor': 'unarmored', 'attackType': 'physical'},
    'Obsidian Golem':   {'hp': 105, 'str': 18, 'agi': 3,  'int': 4,  'pDef': 20, 'atkSpeed': 3.0, 'armor': 'stone',     'attackType': 'physical'},
    'Cinder Wisp':      {'hp': 30,  'str': 3,  'agi': 16, 'int': 18, 'pDef': 2,  'atkSpeed': 1.5, 'armor': 'ethereal',  'attackType': 'magic'},
    'Flame Bat':        {'hp': 40,  'str': 10, 'agi': 20, 'int': 2,  'pDef': 4,  'atkSpeed': 1.2, 'armor': 'hide',      'attackType': 'physical'},
    'Ash Walker':       {'hp': 75,  'str': 14, 'agi': 6,  'int': 5,  'pDef': 8,  'atkSpeed': 2.2, 'armor': 'bone',      'attackType': 'physical'},
    'Salamander':       {'hp': 55,  'str': 12, 'agi': 12, 'int': 10, 'pDef': 10, 'atkSpeed': 1.8, 'armor': 'scaled',    'attackType': 'physical'},
    'Pyro Cultist':     {'hp': 50,  'str': 6,  'agi': 10, 'int': 16, 'pDef': 5,  'atkSpeed': 2.0, 'armor': 'unarmored', 'attackType': 'magic'},

    # === CAVE MONSTERS ===
    'Cave Bat':         {'hp': 25,  'str': 6,  'agi': 18, 'int': 2,  'pDef': 2,  'atkSpeed': 1.0, 'armor': 'hide',      'attackType': 'physical'},
    'Stone Lurker':     {'hp': 80,  'str': 14, 'agi': 4,  'int': 3,  'pDef': 18, 'atkSpeed': 2.8, 'armor': 'stone',     'attackType': 'physical'},
    'Mushroom Sprite':  {'hp': 35,  'str': 5,  'agi': 8,  'int': 14, 'pDef': 4,  'atkSpeed': 2.2, 'armor': 'unarmored', 'attackType': 'magic'},
    'Crystal Spider':   {'hp': 45,  'str': 11, 'agi': 14, 'int': 6,  'pDef': 8,  'atkSpeed': 1.3, 'armor': 'scaled',    'attackType': 'physical'},

    # === UNDEAD MONSTERS ===
    'Skeletal Warrior': {'hp': 50,  'str': 13, 'agi': 8,  'int': 3,  'pDef': 10, 'atkSpeed': 1.8, 'armor': 'bone',      'attackType': 'physical'},
    'Phantom':          {'hp': 40,  'str': 4,  'agi': 12, 'int': 16, 'pDef': 2,  'atkSpeed': 2.0, 'armor': 'ethereal',  'attackType': 'magic'},
    'Bone Golem':       {'hp': 120, 'str': 20, 'agi': 3,  'int': 2,  'pDef': 16, 'atkSpeed': 3.2, 'armor': 'bone',      'attackType': 'physical'},

    # === AQUATIC MONSTERS ===
    'Deep Crawler':     {'hp': 55,  'str': 12, 'agi': 10, 'int': 4,  'pDef': 12, 'atkSpeed': 1.6, 'armor': 'scaled',    'attackType': 'physical'},
    'Tide Serpent':     {'hp': 65,  'str': 14, 'agi': 14, 'int': 8,  'pDef': 8,  'atkSpeed': 1.4, 'armor': 'scaled',    'attackType': 'physical'},

    # === SHADOW MONSTERS ===
    'Shadow Stalker':   {'hp': 45,  'str': 15, 'agi': 16, 'int': 8,  'pDef': 6,  'atkSpeed': 1.0, 'armor': 'hide',      'attackType': 'physical'},
    'Void Touched':     {'hp': 70,  'str': 10, 'agi': 8,  'int': 18, 'pDef': 8,  'atkSpeed': 1.8, 'armor': 'ethereal',  'attackType': 'magic'},

    # === ICE MONSTERS ===
    'Frost Elemental':  {'hp': 55,  'str': 6,  'agi': 10, 'int': 18, 'pDef': 4,  'atkSpeed': 1.6, 'armor': 'ethereal',  'attackType': 'magic'},
    'Ice Golem':        {'hp': 130, 'str': 20, 'agi': 3,  'int': 4,  'pDef': 22, 'atkSpeed': 3.2, 'armor': 'stone',     'attackType': 'physical'},
    'Frozen Husk':      {'hp': 60,  'str': 14, 'agi': 6,  'int': 4,  'pDef': 10, 'atkSpeed': 2.0, 'armor': 'bone',      'attackType': 'physical'},
    'Blizzard Spirit':  {'hp': 35,  'str': 4,  'agi': 20, 'int': 14, 'pDef': 2,  'atkSpeed': 1.2, 'armor': 'ethereal',  'attackType': 'magic'},

    # === COMBAT VARIETY ENEMIES ===
    'Shadow Imp':       {'hp': 30,  'str': 10, 'agi': 20, 'int': 6,  'pDef': 3,  'atkSpeed': 0.8, 'armor': 'hide',      'attackType': 'physical'},
    'Temple Sentinel':  {'hp': 90,  'str': 16, 'agi': 6,  'int': 8,  'pDef': 16, 'atkSpeed': 2.2, 'armor': 'plate',     'attackType': 'physical'},
    'Stone Guardian':   {'hp': 150, 'str': 28, 'agi': 2,  'int': 4,  'pDef': 25, 'atkSpeed': 3.5, 'armor': 'stone',     'attackType': 'physical'},
    'Demon Knight':     {'hp': 120, 'str': 22, 'agi': 10, 'int': 10, 'pDef': 18, 'atkSpeed': 2.5, 'armor': 'plate',     'attackType': 'physical'},
    'Giant Spider':     {'hp': 85,  'str': 18, 'agi': 12, 'int': 6,  'pDef': 10, 'atkSpeed': 2.0, 'armor': 'hide',      'attackType': 'physical'},
    'Shield Bearer':    {'hp': 70,  'str': 12, 'agi': 8,  'int': 6,  'pDef': 14, 'atkSpeed': 2.0, 'armor': 'mail',      'attackType': 'physical'},
    'Flame Sprite':     {'hp': 25,  'str': 8,  'agi': 22, 'int': 10, 'pDef': 2,  'atkSpeed': 0.6, 'armor': 'ethereal',  'attackType': 'physical'},
}

# Weapon vs Armor Matrix from damage-calculator.js
# Values are modifiers: +0.30 (strong), 0 (neutral), -0.30 (weak)
# Final multiplier = 1.0 + modifier
WEAPON_ARMOR_MATRIX = {
    'blade': {
        'unarmored': 0.30,   # Blades excel vs unprotected flesh
        'hide': 0.0,         # Neutral vs tough skin
        'scaled': 0.0,       # Neutral vs natural plates
        'armored': -0.30,    # Poor vs metal plate
        'plate': -0.30,      # Poor vs heavy plate armor
        'mail': 0.0,         # Neutral vs chainmail
        'stone': -0.30,      # Poor vs rock
        'bone': 0.0,         # Neutral vs skeletal
        'ethereal': 0.0      # Neutral vs incorporeal
    },
    'blunt': {
        'unarmored': 0.0,    # Neutral vs flesh
        'hide': 0.0,         # Neutral vs tough skin
        'scaled': 0.0,       # Neutral vs natural plates
        'armored': 0.30,     # Excellent vs metal (dents/crushes)
        'plate': 0.30,       # Excellent vs heavy plate
        'mail': 0.30,        # Excellent vs chainmail
        'stone': 0.30,       # Excellent vs rock (shatters)
        'bone': 0.30,        # Excellent vs skeletal (breaks)
        'ethereal': -0.30    # Poor vs incorporeal
    },
    'pierce': {
        'unarmored': 0.0,    # Neutral vs flesh
        'hide': 0.30,        # Excellent vs tough skin (penetrates)
        'scaled': 0.30,      # Excellent vs plates (finds gaps)
        'armored': -0.30,    # Poor vs solid metal
        'plate': -0.30,      # Poor vs heavy plate
        'mail': 0.30,        # Excellent vs chainmail (finds gaps)
        'stone': -0.30,      # Poor vs solid rock
        'bone': 0.0,         # Neutral vs skeletal
        'ethereal': 0.30     # Excellent vs spirits (anchors)
    }
}

# Legacy simplified matrix for backwards compatibility (includes all armor types)
WEAPON_MATRIX = {
    'blade':  {'unarmored': 1.3, 'hide': 1.0, 'scaled': 1.0, 'bone': 1.0, 'stone': 0.7, 'armored': 0.7, 'plate': 0.7, 'mail': 1.0, 'ethereal': 1.0},
    'blunt':  {'unarmored': 1.0, 'hide': 1.0, 'scaled': 1.0, 'bone': 1.3, 'stone': 1.3, 'armored': 1.3, 'plate': 1.3, 'mail': 1.3, 'ethereal': 0.7},
    'pierce': {'unarmored': 1.0, 'hide': 1.3, 'scaled': 1.3, 'bone': 1.0, 'stone': 0.7, 'armored': 0.7, 'plate': 0.7, 'mail': 1.3, 'ethereal': 1.3}
}

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def get_floor(kills):
    """Calculate current floor based on kill count"""
    return 1 + (kills // KILLS_PER_FLOOR)

def apply_floor_scaling(base_stat, floor):
    """Apply floor scaling to a stat"""
    return base_stat * min(FLOOR_SCALING_CAP, 1.0 + (floor - 1) * FLOOR_SCALING)

# Combat config matching damage-calculator.js
COMBAT_CONFIG = {
    'base_hit_chance': 0.90,       # 90% base hit chance
    'hit_per_agi': 0.002,          # +0.2% per AGI (matches game)
    'evasion_per_agi': 0.002,      # -0.2% per defender AGI
    'min_hit_chance': 0.50,        # Floor at 50%
    'max_hit_chance': 0.98,        # Cap at 98%
    'base_crit_chance': 0.05,      # 5% base crit chance
    'crit_per_agi': 0.001,         # +0.1% per AGI (matches game)
    'max_crit_chance': 0.50,       # Cap at 50%
    'crit_multiplier': 2.5,        # 250% damage on crit (matches game - was 3.0)
    'pierce_crit_bonus': 0.07,     # +7% crit for pierce weapons
    'defense_scaling': 0.015,      # 1.5% reduction per defense point
    'max_defense_reduction': 0.75  # Cap at 75% reduction
}

def roll_hit(attacker_agi, defender_agi):
    """Roll to hit based on AGI difference (matches damage-calculator.js)"""
    hit_chance = COMBAT_CONFIG['base_hit_chance']
    hit_chance += attacker_agi * COMBAT_CONFIG['hit_per_agi']
    hit_chance -= defender_agi * COMBAT_CONFIG['evasion_per_agi']
    hit_chance = max(COMBAT_CONFIG['min_hit_chance'], min(COMBAT_CONFIG['max_hit_chance'], hit_chance))
    return random.random() < hit_chance

def roll_crit(attacker_agi, weapon_type='blade'):
    """Roll for critical hit based on AGI (matches damage-calculator.js)"""
    crit_chance = COMBAT_CONFIG['base_crit_chance']
    crit_chance += attacker_agi * COMBAT_CONFIG['crit_per_agi']
    # Pierce weapons get bonus crit
    if weapon_type == 'pierce':
        crit_chance += COMBAT_CONFIG['pierce_crit_bonus']
    crit_chance = min(COMBAT_CONFIG['max_crit_chance'], crit_chance)
    return random.random() < crit_chance

def get_damage(attacker, defender, is_player, floor=1, skills=None):
    """Calculate damage with floor scaling for monsters (matches damage-calculator.js)"""
    if is_player:
        # Player damage: weapon damage + (STR * 0.5)
        base = attacker['weaponDmg'] + (attacker['str'] * 0.5)

        # Weapon vs Armor modifier
        weapon_type = attacker['weaponType']
        armor_type = defender['armor']
        mod = WEAPON_MATRIX.get(weapon_type, {}).get(armor_type, 1.0)
        base *= mod

        # Apply melee skill damage multiplier
        if skills:
            base *= get_melee_damage_multiplier(skills)
    else:
        # Monster damage calculation - depends on attack type
        attack_type = attacker.get('attackType', 'physical')

        if attack_type == 'magic':
            # Magic attacks: (INT * 0.5) + (INT / 3) - matches game formula for magic
            scaled_int = apply_floor_scaling(attacker.get('int', 10), floor)
            base = (scaled_int * 0.5) + (scaled_int / 3.0)
        else:
            # Physical attacks: (STR * 0.5) + (STR / 5) - matches game formula
            scaled_str = apply_floor_scaling(attacker['str'], floor)
            base = (scaled_str * 0.5) + (scaled_str / 5.0)

    # Defense reduction: 1.5% per point, capped at 75%
    # Magic attacks target mDef, physical attacks target pDef
    attack_type = attacker.get('attackType', 'physical') if not is_player else 'physical'
    if attack_type == 'magic':
        def_val = defender.get('mDef', 0)
    else:
        def_val = defender.get('pDef', 0)

    reduction = def_val * COMBAT_CONFIG['defense_scaling']
    capped_reduction = min(reduction, COMBAT_CONFIG['max_defense_reduction'])
    def_mod = 1.0 - capped_reduction

    # Apply defense skill reduction (for player taking damage)
    if not is_player and skills:
        skill_reduction = get_defense_reduction(skills)
        def_mod *= (1.0 - skill_reduction)

    # Apply variance (±10%)
    final = base * def_mod * random.uniform(0.9, 1.1)

    return max(1, int(final))

def check_potion(p, skills=None):
    """Use potion if HP is low, award vitality XP for effective healing"""
    if p['hp'] < 40 and p['potions'] > 0:
        # Calculate effective max HP (including vitality bonus)
        effective_max_hp = p['max_hp']
        if skills:
            effective_max_hp += get_vitality_bonus_hp(skills)

        hp_before = p['hp']
        p['hp'] = min(effective_max_hp, p['hp'] + p['potion_heal'])
        p['potions'] -= 1

        # Award vitality XP for effective healing only
        if skills:
            effective_heal = p['hp'] - hp_before
            if effective_heal > 0:
                xp = max(1, int(effective_heal * SKILL_CONFIG['vitality_xp_per_heal']))
                add_skill_xp(skills, 'vitality', xp)

        return True
    return False

def fight(p, m_name, floor=1, skills=None):
    """
    Simulate a fight between player and monster.
    Includes hit/crit mechanics and skill progression.
    Returns: (ticks, dmg_dealt, dmg_taken, won, monster_max_hp)
    """
    m_stats = MONSTER_STATS[m_name].copy()
    # Apply floor scaling to monster HP and defense
    m_hp = int(apply_floor_scaling(m_stats['hp'], floor))
    monster_max_hp = m_hp  # Store for lifesteal calculation
    m_stats['pDef'] = int(apply_floor_scaling(m_stats['pDef'], floor))
    m_stats['str'] = int(apply_floor_scaling(m_stats['str'], floor))

    # Get AGI values (default to 10 if not specified)
    p_agi = p.get('agi', 10)
    m_agi = m_stats.get('agi', 10)

    # Apply vitality bonus HP
    effective_max_hp = p['max_hp']
    if skills:
        effective_max_hp += get_vitality_bonus_hp(skills)
        # Heal player to new max if vitality increased
        if p['hp'] > effective_max_hp:
            p['hp'] = effective_max_hp

    p_ticks = 7  # Player attack speed (base 700ms)
    m_ticks = int(7 * m_stats['atkSpeed'])
    tick = 0
    total_dmg_dealt = 0
    total_dmg_taken = 0

    while p['hp'] > 0 and m_hp > 0:
        tick += 1

        # Player attack
        if tick % p_ticks == 0:
            # Roll hit
            if roll_hit(p_agi, m_agi):
                dmg = get_damage(p, m_stats, True, floor, skills)
                # Roll crit
                if roll_crit(p_agi, p.get('weaponType', 'blade')):
                    dmg = int(dmg * COMBAT_CONFIG['crit_multiplier'])
                m_hp -= dmg
                total_dmg_dealt += dmg

                # Award melee XP (0.5 per damage dealt)
                if skills:
                    xp = max(1, int(dmg * SKILL_CONFIG['melee_xp_per_damage']))
                    add_skill_xp(skills, 'melee', xp)
            # Miss: no damage dealt

        # Monster attack
        if m_hp > 0 and tick % m_ticks == 0:
            # Roll hit (monster vs player)
            if roll_hit(m_agi, p_agi):
                dmg = get_damage(m_stats, p, False, floor, skills)
                # Monsters don't crit (player-only mechanic)
                p['hp'] -= dmg
                total_dmg_taken += dmg

                # Award defense XP (0.3 per damage taken)
                if skills:
                    xp = max(1, int(dmg * SKILL_CONFIG['defense_xp_per_damage']))
                    add_skill_xp(skills, 'defense', xp)

                check_potion(p, skills)
            # Miss: no damage taken

    won = p['hp'] > 0
    return (tick, total_dmg_dealt, total_dmg_taken, won, monster_max_hp)

def drop_loot():
    """Roll for loot drop (tracking only - no altar system in game)"""
    if random.uniform(0, 100) > DROP_CHANCE:
        return None
    roll = random.uniform(0, 100)
    if roll < 60:
        return 'junk'
    elif roll < 90:
        return 'trophy'
    else:
        return 'gear'

def percentile(data, p):
    """Get percentile value from sorted data"""
    if not data:
        return 0
    idx = int(len(data) * p)
    return data[min(idx, len(data) - 1)]

# ==============================================================================
# MAIN SIMULATION
# ==============================================================================

def run_simulation():
    # ==========================================================================
    # METRICS INITIALIZATION
    # ==========================================================================

    # Run-level metrics
    history_kills = []
    history_time = []
    history_hp_before_death = []
    history_wasted_potions = []
    history_items_dropped = []

    # Death tracking
    killers = []
    death_context = []
    floor_at_death = Counter()

    # Per-fight tracking
    survival_at_fight = Counter()
    close_calls = 0
    total_fights = 0

    # Monster analytics
    monster_analytics = {name: {
        'fights': 0,
        'kills': 0,
        'deaths_caused': 0,
        'total_dmg_dealt': 0,
        'total_dmg_taken': 0,
        'total_ticks': 0
    } for name in MONSTER_STATS}

    # HP tracking
    hp_after_fights = []
    hp_deltas = []  # HP change per fight

    # Death spiral detection (3+ consecutive fights losing >15 HP each)
    death_spirals = 0

    print(f"Running {SIMULATIONS} Simulations...")
    lifesteal_str = f"{LIFESTEAL_ON_KILL*100:.0f}% of monster HP" if LIFESTEAL_ON_KILL > 0 else "Disabled"
    print(f"Config: Skills level during run (reset on death) | Potions only | Floor scaling: {FLOOR_SCALING*100:.0f}%/floor")
    print(f"        Lifesteal on Kill: {lifesteal_str}")
    print("-" * 60)

    # ==========================================================================
    # SIMULATION LOOP
    # ==========================================================================

    # Skill level tracking across all runs
    final_skill_levels = {'melee': [], 'defense': [], 'vitality': []}

    # Skill progression tracking at kill milestones
    SKILL_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50]
    skill_at_milestone = {m: {'melee': [], 'defense': [], 'vitality': []} for m in SKILL_MILESTONES}
    skill_at_milestone['death'] = {'melee': [], 'defense': [], 'vitality': []}

    # Pre-calculate spawn weights for efficiency
    spawn_total_weight = sum(d['weight'] for d in SPAWN_POOL.values())
    spawn_monsters = list(SPAWN_POOL.keys())

    for sim in range(SIMULATIONS):
        player = PLAYER_START.copy()
        skills = create_fresh_skills()  # Fresh skills each run
        kills = 0
        combat_ticks = 0
        recent_enemies = []
        recent_hp_deltas = []
        items_dropped_this_run = 0

        while player['hp'] > 0:
            # 1. Determine floor and spawn enemy
            floor = get_floor(kills)

            # Roll for random monster spawn (equal weights)
            roll = random.uniform(0, spawn_total_weight)
            cum = 0
            enemy = spawn_monsters[0]  # Default to first monster
            for n, d in SPAWN_POOL.items():
                cum += d['weight']
                if roll <= cum:
                    enemy = n
                    break

            recent_enemies.append(enemy)
            if len(recent_enemies) > 3:
                recent_enemies.pop(0)

            # 2. Record pre-fight state
            hp_before = player['hp']

            # 3. Fight (with skill progression)
            ticks, dmg_dealt, dmg_taken, won, monster_max_hp = fight(player, enemy, floor, skills)
            combat_ticks += ticks
            total_fights += 1

            # 4. Record fight analytics
            monster_analytics[enemy]['fights'] += 1
            monster_analytics[enemy]['total_dmg_dealt'] += dmg_dealt
            monster_analytics[enemy]['total_dmg_taken'] += dmg_taken
            monster_analytics[enemy]['total_ticks'] += ticks

            hp_delta = player['hp'] - hp_before
            hp_deltas.append(hp_delta)
            recent_hp_deltas.append(hp_delta)
            if len(recent_hp_deltas) > 3:
                recent_hp_deltas.pop(0)

            # 5. Check for death
            if not won:
                # Record death metrics
                killers.append(enemy)
                history_hp_before_death.append(hp_before)
                history_wasted_potions.append(player['potions'])
                floor_at_death[floor] += 1
                monster_analytics[enemy]['deaths_caused'] += 1

                if len(recent_enemies) >= 2:
                    death_context.append(tuple(recent_enemies[-2:]))

                # Check for death spiral
                if len(recent_hp_deltas) >= 3 and all(d <= -15 for d in recent_hp_deltas[-3:]):
                    death_spirals += 1

                # Record skill levels at death
                skill_at_milestone['death']['melee'].append(skills['melee']['level'])
                skill_at_milestone['death']['defense'].append(skills['defense']['level'])
                skill_at_milestone['death']['vitality'].append(skills['vitality']['level'])

                break

            # 6. Post-fight processing (survived)
            kills += 1
            monster_analytics[enemy]['kills'] += 1
            survival_at_fight[kills] += 1

            # 6a. Apply lifesteal on kill (heal for % of monster's max HP)
            if LIFESTEAL_ON_KILL > 0:
                heal_amount = int(monster_max_hp * LIFESTEAL_ON_KILL)
                effective_max_hp = player['max_hp']
                if skills:
                    effective_max_hp += get_vitality_bonus_hp(skills)
                player['hp'] = min(effective_max_hp, player['hp'] + heal_amount)

            # Track skill levels at milestones
            if kills in SKILL_MILESTONES:
                skill_at_milestone[kills]['melee'].append(skills['melee']['level'])
                skill_at_milestone[kills]['defense'].append(skills['defense']['level'])
                skill_at_milestone[kills]['vitality'].append(skills['vitality']['level'])

            # Track close calls
            if player['hp'] < player['max_hp'] * 0.2:
                close_calls += 1

            hp_after_fights.append(player['hp'])

            # Loot (tracking only - no altar sacrifice system)
            item = drop_loot()
            if item:
                items_dropped_this_run += 1

        # End of run calculations
        rooms = kills / 1.5
        total_time = (combat_ticks * TICK_DURATION) + (rooms * NAV_TIME_PER_ROOM)

        history_kills.append(kills)
        history_time.append(total_time)
        history_items_dropped.append(items_dropped_this_run)

        # Track final skill levels
        final_skill_levels['melee'].append(skills['melee']['level'])
        final_skill_levels['defense'].append(skills['defense']['level'])
        final_skill_levels['vitality'].append(skills['vitality']['level'])

    # ==========================================================================
    # REPORTING
    # ==========================================================================

    avg_kills = statistics.mean(history_kills)
    avg_rooms = avg_kills / 1.5
    avg_time = statistics.mean(history_time) / 60

    # Sort for percentiles
    history_kills_sorted = sorted(history_kills)
    history_hp_before_death_sorted = sorted(history_hp_before_death) if history_hp_before_death else [0]

    print("\n" + "=" * 60)
    print("                    SURVIVAL REPORT (Soul & Body)")
    print("=" * 60)

    print("\n--- CORE METRICS ---")
    print(f"  Average Kills:        {avg_kills:.1f}")
    print(f"  Average Rooms:        {avg_rooms:.1f}")
    print(f"  Average Time Alive:   {avg_time:.1f} minutes")
    print(f"  Healing Available:    {PLAYER_START['potions']} potions ({PLAYER_START['potion_heal']} HP each)")
    if LIFESTEAL_ON_KILL > 0:
        print(f"  Lifesteal on Kill:    {LIFESTEAL_ON_KILL*100:.0f}% of monster's max HP")

    print("\n--- KILL DISTRIBUTION ---")
    print(f"  Min:    {min(history_kills)}")
    print(f"  25th%:  {percentile(history_kills_sorted, 0.25)}")
    print(f"  50th%:  {percentile(history_kills_sorted, 0.50)}")
    print(f"  75th%:  {percentile(history_kills_sorted, 0.75)}")
    print(f"  90th%:  {percentile(history_kills_sorted, 0.90)}")
    print(f"  Max:    {max(history_kills)}")

    print("\n--- SURVIVAL CURVE ---")
    for n in [5, 10, 15, 20, 25, 30, 40, 50]:
        pct = (survival_at_fight[n] / SIMULATIONS) * 100
        bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
        print(f"  {n:2d} fights: {bar} {pct:5.1f}%")

    print("\n--- MILESTONE RATES ---")
    k15 = len([k for k in history_kills if k >= 15])
    k30 = len([k for k in history_kills if k >= 30])
    k50 = len([k for k in history_kills if k >= 50])
    print(f"  Floor 1 Clear (15 kills):  {(k15/SIMULATIONS)*100:.1f}%")
    print(f"  Floor 2 Clear (30 kills):  {(k30/SIMULATIONS)*100:.1f}%")
    print(f"  Immortal (50+ kills):      {(k50/SIMULATIONS)*100:.1f}%")

    print("\n--- CLOSE CALLS & SPIRALS ---")
    print(f"  Close Calls (<20% HP):     {close_calls} ({(close_calls/total_fights)*100:.2f}% of fights)")
    print(f"  Death Spirals:             {death_spirals} ({(death_spirals/SIMULATIONS)*100:.1f}% of runs)")

    # Economy
    print("\n" + "=" * 60)
    print("                       RESOURCE USAGE")
    print("=" * 60)

    avg_dropped = statistics.mean(history_items_dropped) if history_items_dropped else 0
    avg_wasted_potions = statistics.mean(history_wasted_potions) if history_wasted_potions else 0
    potions_used = PLAYER_START['potions'] - avg_wasted_potions

    print(f"\n  Avg Items Dropped:         {avg_dropped:.1f}")
    print(f"  Avg Potions Used:          {potions_used:.2f} / {PLAYER_START['potions']}")
    print(f"  Avg Potions Wasted:        {avg_wasted_potions:.2f} (unused at death)")

    # Death Analysis
    print("\n" + "=" * 60)
    print("                       DEATH ANALYSIS")
    print("=" * 60)

    print("\n--- HP BEFORE FATAL FIGHT ---")
    if history_hp_before_death:
        print(f"  Min:    {min(history_hp_before_death)}")
        print(f"  25th%:  {percentile(history_hp_before_death_sorted, 0.25)}")
        print(f"  50th%:  {percentile(history_hp_before_death_sorted, 0.50)}")
        print(f"  75th%:  {percentile(history_hp_before_death_sorted, 0.75)}")
        print(f"  Max:    {max(history_hp_before_death)}")

        # Categorize deaths
        burst_deaths = len([hp for hp in history_hp_before_death if hp >= 60])
        attrition_deaths = len([hp for hp in history_hp_before_death if hp < 40])
        print(f"\n  Burst Deaths (HP>=60):     {(burst_deaths/len(history_hp_before_death))*100:.1f}%")
        print(f"  Attrition Deaths (HP<40):  {(attrition_deaths/len(history_hp_before_death))*100:.1f}%")

    print("\n--- FLOOR AT DEATH ---")
    for flr in sorted(floor_at_death.keys()):
        count = floor_at_death[flr]
        pct = (count / SIMULATIONS) * 100
        bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
        print(f"  Floor {flr}: {bar} {pct:5.1f}%")

    print("\n--- CAUSE OF DEATH (Top 5) ---")
    killer_counts = Counter(killers)
    if not killers:
        print("  No deaths recorded.")
    else:
        for name, count in killer_counts.most_common(5):
            pct = (count / len(killers)) * 100
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            print(f"  {name:<20} {bar} {pct:5.1f}%")

    print("\n--- DEATH CONTEXT (Last 2 Enemies) ---")
    context_counts = Counter(death_context)
    if not death_context:
        print("  N/A")
    else:
        for pair, count in context_counts.most_common(5):
            label = f"{pair[0]} -> {pair[1]}"
            pct = (count / len(death_context)) * 100
            print(f"  {label:<40} {pct:.1f}%")

    # Complete Monster Roster
    print("\n" + "=" * 80)
    print("                              MONSTER ROSTER (All 29)")
    print("=" * 80)

    print(f"\n  {'Monster':<20} {'HP':>5} {'STR':>5} {'AGI':>5} {'INT':>5} {'pDef':>5} {'AtkSpd':>7} {'Armor':<10} {'Type':<8}")
    print("  " + "-" * 78)

    # Group by category
    categories = {
        'VOLCANIC': ['Magma Slime', 'Obsidian Golem', 'Cinder Wisp', 'Flame Bat', 'Ash Walker', 'Salamander', 'Pyro Cultist'],
        'CAVE': ['Cave Bat', 'Stone Lurker', 'Mushroom Sprite', 'Crystal Spider'],
        'UNDEAD': ['Skeletal Warrior', 'Phantom', 'Bone Golem'],
        'AQUATIC': ['Deep Crawler', 'Tide Serpent'],
        'SHADOW': ['Shadow Stalker', 'Void Touched'],
        'ICE': ['Frost Elemental', 'Ice Golem', 'Frozen Husk', 'Blizzard Spirit'],
        'COMBAT VARIETY': ['Shadow Imp', 'Temple Sentinel', 'Stone Guardian', 'Demon Knight', 'Giant Spider', 'Shield Bearer', 'Flame Sprite']
    }

    for category, monsters in categories.items():
        print(f"\n  --- {category} ---")
        for name in monsters:
            if name not in MONSTER_STATS:
                continue
            m = MONSTER_STATS[name]
            print(f"  {name:<20} {m['hp']:>5} {m['str']:>5} {m['agi']:>5} {m.get('int', 0):>5} {m['pDef']:>5} {m['atkSpeed']:>7.1f} {m['armor']:<10} {m.get('attackType', 'physical'):<8}")

    print(f"\n  Total monsters: {len(MONSTER_STATS)}")

    # Monster Threat Analysis (simulation results)
    print("\n" + "=" * 80)
    print("                         MONSTER THREAT ANALYSIS (Simulation)")
    print("=" * 80)

    print(f"\n  {'Monster':<20} {'Fights':>7} {'Win%':>7} {'Death%':>8} {'TTK':>6} {'DPF':>6} {'Spawn%':>7}")
    print("  " + "-" * 66)

    # Calculate total spawn weight
    total_weight = sum(d['weight'] for d in SPAWN_POOL.values())

    for name in sorted(MONSTER_STATS.keys()):
        ma = monster_analytics[name]
        fights = ma['fights']
        spawn_pct = (SPAWN_POOL.get(name, {}).get('weight', 0) / total_weight) * 100

        if fights == 0:
            # Show monster even with 0 fights
            print(f"  {name:<20} {fights:>7} {'N/A':>7} {'N/A':>8} {'N/A':>6} {'N/A':>6} {spawn_pct:>6.1f}%")
            continue

        win_pct = (ma['kills'] / fights) * 100
        death_pct = (ma['deaths_caused'] / len(killers)) * 100 if killers else 0
        avg_ttk = (ma['total_ticks'] / fights) * TICK_DURATION
        avg_dpf = ma['total_dmg_taken'] / fights  # Damage per fight (to player)

        # Threat indicator
        threat = ""
        if death_pct > 25:
            threat = "!!!"
        elif death_pct > 15:
            threat = "!!"
        elif death_pct > 8:
            threat = "!"

        print(f"  {name:<20} {fights:>7} {win_pct:>6.1f}% {death_pct:>6.1f}% {avg_ttk:>6.1f} {avg_dpf:>6.1f} {spawn_pct:>6.1f}% {threat}")

    # Player Stats & Skills
    print("\n" + "=" * 60)
    print("                     PLAYER STATS & SKILLS")
    print("=" * 60)

    p = PLAYER_START
    base_dmg = p['weaponDmg'] + (p['str'] * 0.5)
    dps = base_dmg / (7 * TICK_DURATION)
    effective_hp = p['max_hp'] + (p['potions'] * p['potion_heal'])

    print(f"\n  --- Starting Stats ---")
    print(f"  Max HP:           {p['max_hp']}")
    print(f"  STR:              {p['str']}")
    print(f"  AGI:              {p['agi']}")
    print(f"  pDef:             {p['pDef']}")
    print(f"  Weapon Damage:    {p['weaponDmg']} ({p['weaponType']})")
    print(f"  Base DPS:         {dps:.1f}")
    print(f"  Effective HP:     {effective_hp} (with {p['potions']} potions)")

    # Skill Progression During Run
    print("\n" + "=" * 60)
    print("                   SKILL PROGRESSION DURING RUN")
    print("=" * 60)

    print(f"\n  Skills level up as you fight. XP rates:")
    print(f"    Melee:    {SKILL_CONFIG['melee_xp_per_damage']} XP per damage dealt    -> +{SKILL_CONFIG['melee_damage_per_level']*100:.0f}% damage/level")
    print(f"    Defense:  {SKILL_CONFIG['defense_xp_per_damage']} XP per damage taken   -> +{SKILL_CONFIG['defense_reduction_per_level']*100:.1f}% reduction/level")
    print(f"    Vitality: {SKILL_CONFIG['vitality_xp_per_heal']} XP per HP healed       -> +{SKILL_CONFIG['vitality_hp_per_level']} max HP/level")

    print(f"\n  --- Skill Levels at Kill Milestones (average) ---")
    print(f"  {'Kills':<8} {'Melee':>8} {'Defense':>10} {'Vitality':>10} {'Dmg Bonus':>12} {'Def Bonus':>12} {'HP Bonus':>10}")
    print("  " + "-" * 72)

    for milestone in SKILL_MILESTONES:
        data = skill_at_milestone[milestone]
        if not data['melee']:  # No data for this milestone (runs didn't reach it)
            continue

        avg_m = statistics.mean(data['melee'])
        avg_d = statistics.mean(data['defense'])
        avg_v = statistics.mean(data['vitality'])

        dmg_bonus = avg_m * SKILL_CONFIG['melee_damage_per_level'] * 100
        def_bonus = avg_d * SKILL_CONFIG['defense_reduction_per_level'] * 100
        hp_bonus = avg_v * SKILL_CONFIG['vitality_hp_per_level']

        # Calculate what % of runs reached this milestone
        reach_pct = (len(data['melee']) / SIMULATIONS) * 100

        print(f"  {milestone:<8} {avg_m:>8.1f} {avg_d:>10.1f} {avg_v:>10.1f} {dmg_bonus:>11.1f}% {def_bonus:>11.2f}% {hp_bonus:>9.0f}")

    # Death stats
    death_data = skill_at_milestone['death']
    if death_data['melee']:
        avg_m = statistics.mean(death_data['melee'])
        avg_d = statistics.mean(death_data['defense'])
        avg_v = statistics.mean(death_data['vitality'])

        dmg_bonus = avg_m * SKILL_CONFIG['melee_damage_per_level'] * 100
        def_bonus = avg_d * SKILL_CONFIG['defense_reduction_per_level'] * 100
        hp_bonus = avg_v * SKILL_CONFIG['vitality_hp_per_level']

        print("  " + "-" * 72)
        print(f"  {'Death':<8} {avg_m:>8.1f} {avg_d:>10.1f} {avg_v:>10.1f} {dmg_bonus:>11.1f}% {def_bonus:>11.2f}% {hp_bonus:>9.0f}")

    # Detailed death stats
    print(f"\n  --- Skill Levels at Death (detailed) ---")
    avg_melee = statistics.mean(final_skill_levels['melee']) if final_skill_levels['melee'] else 0
    avg_defense = statistics.mean(final_skill_levels['defense']) if final_skill_levels['defense'] else 0
    avg_vitality = statistics.mean(final_skill_levels['vitality']) if final_skill_levels['vitality'] else 0

    max_melee = max(final_skill_levels['melee']) if final_skill_levels['melee'] else 0
    max_defense = max(final_skill_levels['defense']) if final_skill_levels['defense'] else 0
    max_vitality = max(final_skill_levels['vitality']) if final_skill_levels['vitality'] else 0

    med_melee = statistics.median(final_skill_levels['melee']) if final_skill_levels['melee'] else 0
    med_defense = statistics.median(final_skill_levels['defense']) if final_skill_levels['defense'] else 0
    med_vitality = statistics.median(final_skill_levels['vitality']) if final_skill_levels['vitality'] else 0

    print(f"  {'Skill':<12} {'Avg':>8} {'Median':>8} {'Max':>8} {'Avg Bonus':>15}")
    print("  " + "-" * 52)

    melee_bonus = avg_melee * SKILL_CONFIG['melee_damage_per_level'] * 100
    defense_bonus = avg_defense * SKILL_CONFIG['defense_reduction_per_level'] * 100
    vitality_bonus = avg_vitality * SKILL_CONFIG['vitality_hp_per_level']

    print(f"  {'Melee':<12} {avg_melee:>8.1f} {med_melee:>8.1f} {max_melee:>8}    +{melee_bonus:.1f}% dmg")
    print(f"  {'Defense':<12} {avg_defense:>8.1f} {med_defense:>8.1f} {max_defense:>8}    +{defense_bonus:.2f}% red")
    print(f"  {'Vitality':<12} {avg_vitality:>8.1f} {med_vitality:>8.1f} {max_vitality:>8}    +{vitality_bonus:.0f} HP")

    print(f"\n  NOTE: Skills reset on death. All progression is run-specific.")

    # Recommendations
    print("\n" + "=" * 60)
    print("                      BALANCE RECOMMENDATIONS")
    print("=" * 60)

    recommendations = []

    # Check floor 1 clear rate
    if (k15/SIMULATIONS)*100 < 50:
        recommendations.append("- Floor 1 clear rate is low (<50%). Consider reducing early monster damage or HP.")

    if (k15/SIMULATIONS)*100 < 30:
        recommendations.append("- CRITICAL: <30% floor 1 clear. Early game is too punishing with potions-only healing.")

    # Check attrition vs burst
    if history_hp_before_death:
        burst_pct = (burst_deaths/len(history_hp_before_death))*100
        if burst_pct > 40:
            recommendations.append(f"- {burst_pct:.0f}% of deaths are burst (HP>=60). Some monsters may hit too hard.")

        attrition_pct = (attrition_deaths/len(history_hp_before_death))*100
        if attrition_pct > 60:
            recommendations.append(f"- {attrition_pct:.0f}% attrition deaths. Players may need more healing options.")

    # Check death spirals
    spiral_pct = (death_spirals/SIMULATIONS)*100
    if spiral_pct > 20:
        recommendations.append(f"- {spiral_pct:.0f}% death spiral rate. Players lack recovery between fights.")

    # Check potion efficiency
    if avg_wasted_potions > 1.0:
        recommendations.append(f"- {avg_wasted_potions:.1f} avg wasted potions. Deaths happening before potion use.")

    # Check specific monster threats
    for name, ma in monster_analytics.items():
        if killers:
            death_pct = (ma['deaths_caused'] / len(killers)) * 100
            if death_pct > 30:
                recommendations.append(f"- {name} causes {death_pct:.0f}% of deaths. Consider nerfing.")

    if not recommendations:
        recommendations.append("- Balance looks reasonable! Fine-tune based on desired difficulty.")

    for rec in recommendations:
        print(f"  {rec}")

    print("\n" + "=" * 60)


def run_per_monster_test():
    """
    Test the player against EACH monster individually.
    This ignores spawn weights and gives pure balance data for every monster.
    """
    FIGHTS_PER_MONSTER = 1000  # Number of fights per monster for statistical accuracy

    print("\n")
    print("=" * 90)
    print("                           PER-MONSTER BALANCE TEST")
    print("                    (Fresh player vs each monster, Floor 1, no skills)")
    print("=" * 90)

    print(f"\n  Running {FIGHTS_PER_MONSTER} fights per monster...\n")

    results = []

    for m_name in sorted(MONSTER_STATS.keys()):
        wins = 0
        total_dmg_dealt = 0
        total_dmg_taken = 0
        total_ticks = 0
        player_deaths = 0
        hp_remaining = []

        for _ in range(FIGHTS_PER_MONSTER):
            # Fresh player each fight (no skills, full HP)
            player = PLAYER_START.copy()

            ticks, dmg_dealt, dmg_taken, won, _ = fight(player, m_name, floor=1, skills=None)

            total_ticks += ticks
            total_dmg_dealt += dmg_dealt
            total_dmg_taken += dmg_taken

            if won:
                wins += 1
                hp_remaining.append(player['hp'])
            else:
                player_deaths += 1

        win_rate = (wins / FIGHTS_PER_MONSTER) * 100
        avg_ticks = total_ticks / FIGHTS_PER_MONSTER
        avg_ttk = avg_ticks * TICK_DURATION
        avg_dmg_dealt = total_dmg_dealt / FIGHTS_PER_MONSTER
        avg_dmg_taken = total_dmg_taken / FIGHTS_PER_MONSTER
        avg_hp_left = statistics.mean(hp_remaining) if hp_remaining else 0

        m = MONSTER_STATS[m_name]

        results.append({
            'name': m_name,
            'win_rate': win_rate,
            'avg_ttk': avg_ttk,
            'avg_dmg_dealt': avg_dmg_dealt,
            'avg_dmg_taken': avg_dmg_taken,
            'avg_hp_left': avg_hp_left,
            'hp': m['hp'],
            'str': m['str'],
            'agi': m['agi'],
            'pDef': m['pDef'],
            'armor': m['armor'],
            'attackType': m.get('attackType', 'physical'),
            'atkSpeed': m['atkSpeed']
        })

    # Sort by win rate (most dangerous first)
    results.sort(key=lambda x: x['win_rate'])

    print(f"  {'Monster':<20} {'WinRate':>8} {'AvgTTK':>8} {'DmgDealt':>9} {'DmgTaken':>9} {'HPLeft':>8} {'Armor':<10} {'Type':<8}")
    print("  " + "-" * 90)

    for r in results:
        # Danger indicator
        danger = ""
        if r['win_rate'] < 50:
            danger = " [DEADLY]"
        elif r['win_rate'] < 70:
            danger = " [HARD]"
        elif r['win_rate'] < 85:
            danger = " [MEDIUM]"
        elif r['win_rate'] >= 98:
            danger = " [EASY]"

        print(f"  {r['name']:<20} {r['win_rate']:>7.1f}% {r['avg_ttk']:>7.1f}s {r['avg_dmg_dealt']:>9.1f} {r['avg_dmg_taken']:>9.1f} {r['avg_hp_left']:>8.1f} {r['armor']:<10} {r['attackType']:<8}{danger}")

    # Summary statistics
    print("\n  --- DIFFICULTY BREAKDOWN ---")
    deadly = len([r for r in results if r['win_rate'] < 50])
    hard = len([r for r in results if 50 <= r['win_rate'] < 70])
    medium = len([r for r in results if 70 <= r['win_rate'] < 85])
    normal = len([r for r in results if 85 <= r['win_rate'] < 98])
    easy = len([r for r in results if r['win_rate'] >= 98])

    print(f"    DEADLY  (<50% win):   {deadly:>3} monsters")
    print(f"    HARD    (50-70% win): {hard:>3} monsters")
    print(f"    MEDIUM  (70-85% win): {medium:>3} monsters")
    print(f"    NORMAL  (85-98% win): {normal:>3} monsters")
    print(f"    EASY    (>98% win):   {easy:>3} monsters")

    # Weapon effectiveness summary
    print("\n  --- WEAPON VS ARMOR EFFECTIVENESS ---")
    armor_results = {}
    for r in results:
        armor = r['armor']
        if armor not in armor_results:
            armor_results[armor] = {'wins': 0, 'total': 0, 'monsters': []}
        armor_results[armor]['total'] += 1
        if r['win_rate'] >= 50:
            armor_results[armor]['wins'] += 1
        armor_results[armor]['monsters'].append(r['name'])

    print(f"    Player weapon: {PLAYER_START['weaponType']}")
    print(f"    {'Armor Type':<12} {'Monsters':>10} {'Avg WinRate':>12}")
    print("    " + "-" * 36)

    for armor in sorted(armor_results.keys()):
        monsters_with_armor = [r for r in results if r['armor'] == armor]
        avg_win = statistics.mean([r['win_rate'] for r in monsters_with_armor])
        count = len(monsters_with_armor)
        effectiveness = ""
        if avg_win >= 90:
            effectiveness = " (Strong)"
        elif avg_win < 70:
            effectiveness = " (Weak)"
        print(f"    {armor:<12} {count:>10} {avg_win:>11.1f}%{effectiveness}")

    print("\n" + "=" * 90)


# ==============================================================================
# ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    run_simulation()
    run_per_monster_test()
