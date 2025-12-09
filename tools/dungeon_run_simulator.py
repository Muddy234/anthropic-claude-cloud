import random
import statistics
from collections import Counter, defaultdict

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SIMULATIONS = 5000

# --- DUNGEON STRUCTURE ---
FLOORS_TO_WIN = 3

# Rooms per floor (can be adjusted)
FLOOR_CONFIG = {
    1: {'rooms': 8,  'enemies_per_room': (2, 3), 'empty_room_chance': 0.20},
    2: {'rooms': 10, 'enemies_per_room': (2, 3), 'empty_room_chance': 0.15},
    3: {'rooms': 12, 'enemies_per_room': (2, 4), 'empty_room_chance': 0.10},
}

# Altar guaranteed every N rooms
ALTAR_INTERVAL = 3

# Combat skip settings (player can avoid fights but miss XP/loot)
SKIP_COMBAT_CHANCE = 0.0  # Set >0 to simulate players skipping fights
SKIP_PENALTY_XP = 1.0     # Multiplier for XP if skipping (1.0 = no penalty to gained XP, just miss it)

# Time Settings
NAV_TIME_PER_ROOM = 15.0  # Seconds walking/looting per room
TICK_DURATION = 0.1       # Seconds per combat tick

# Floor Scaling
FLOOR_SCALING = 0.12      # +12% per floor
FLOOR_SCALING_CAP = 3.0   # Max 3x multiplier

# XP Curve
XP_THRESHOLDS = {2: 100, 3: 300, 4: 600, 5: 1000, 6: 1500, 7: 2100}

PLAYER_BASE = {
    'level': 1, 'xp': 0,
    'hp': 100, 'max_hp': 100,
    'str': 12, 'pDef': 5,
    'int': 8,  # For magic weapons
    'potions': 2, 'potion_heal': 50
}

# --- STARTER WEAPONS (one per damage type) ---
STARTER_WEAPONS = {
    'Rusty Sword': {
        'damageType': 'blade',
        'damage': 7,
        'speed': 1.0,
        'stat_scaling': 'str'  # Uses STR for damage
    },
    'Iron Mace': {
        'damageType': 'blunt',
        'damage': 7,  # Equalized with other weapons (was 11)
        'speed': 1.0,  # Equalized speed
        'stat_scaling': 'str'
    },
    'Wooden Spear': {
        'damageType': 'pierce',
        'damage': 7,
        'speed': 1.0,  # Equalized speed
        'stat_scaling': 'str'
    },
    # DISABLED FOR TESTING:
    # 'Apprentice Staff': {
    #     'damageType': 'magic',
    #     'damage': 8,
    #     'speed': 0.9,
    #     'stat_scaling': 'int'  # Uses INT for damage
    # },
    # 'Shortbow': {
    #     'damageType': 'pierce',
    #     'damage': 6,
    #     'speed': 1.1,
    #     'stat_scaling': 'agi',  # Uses AGI (we'll add this)
    #     'ranged': True
    # }
}

# --- WEAPON VS ARMOR MATRIX ---
# Modifiers: +0.30 (strong), 0 (neutral), -0.30 (weak)
WEAPON_ARMOR_MATRIX = {
    'blade': {
        'unarmored': 0.30,   # Blades excel vs unprotected flesh
        'hide': 0.0,         # Neutral vs tough skin
        'scaled': 0.0,       # Neutral vs natural plates
        'armored': -0.30,    # Poor vs metal plate
        'stone': -0.30,      # Poor vs rock
        'bone': 0.0,         # Neutral vs skeletal
        'ethereal': 0.0      # Neutral vs incorporeal
    },
    'blunt': {
        'unarmored': 0.0,    # Neutral vs flesh
        'hide': 0.0,         # Neutral vs tough skin
        'scaled': 0.0,       # Neutral vs natural plates
        'armored': 0.30,     # Excellent vs metal (dents/crushes)
        'stone': 0.30,       # Excellent vs rock (shatters)
        'bone': 0.30,        # Excellent vs skeletal (breaks)
        'ethereal': -0.30    # Poor vs incorporeal
    },
    'pierce': {
        'unarmored': 0.0,    # Neutral vs flesh
        'hide': 0.30,        # Excellent vs tough skin (penetrates)
        'scaled': 0.30,      # Excellent vs plates (finds gaps)
        'armored': -0.30,    # Poor vs solid metal
        'stone': -0.30,      # Poor vs solid rock
        'bone': 0.0,         # Neutral vs skeletal
        'ethereal': 0.30     # Excellent vs spirits (anchors)
    },
    'magic': {
        'unarmored': 0.0,    # Magic ignores physical armor
        'hide': 0.0,
        'scaled': 0.0,
        'armored': 0.0,      # Bypasses physical armor
        'stone': 0.0,
        'bone': 0.0,
        'ethereal': 0.30     # Good vs spirits
    }
}

# --- ECONOMY ---
DROP_CHANCE = 40  # 40% chance per kill
LOOT_TABLE = {
    'junk':   {'weight': 60, 'heal': 8},
    'trophy': {'weight': 30, 'heal': 25},
    'gear':   {'weight': 10, 'heal': 60}
}

# --- MONSTERS ---
SPAWN_POOL = {
    'Flame Bat':        {'weight': 30, 'xp': 15},
    'Magma Slime':      {'weight': 30, 'xp': 25},
    'Skeletal Warrior': {'weight': 20, 'xp': 28},
    'Shadow Stalker':   {'weight': 10, 'xp': 42},
    'Cave Bat':         {'weight': 10, 'xp': 10}
}

MONSTER_STATS = {
    'Flame Bat':        {'hp': 40, 'str': 10, 'pDef': 4,  'atkSpeed': 1.2, 'armor': 'unarmored'},
    'Cave Bat':         {'hp': 25, 'str': 6,  'pDef': 2,  'atkSpeed': 1.0, 'armor': 'unarmored'},
    'Magma Slime':      {'hp': 60, 'str': 12, 'pDef': 15, 'atkSpeed': 2.5, 'armor': 'unarmored'},
    'Skeletal Warrior': {'hp': 40, 'str': 11, 'pDef': 10, 'atkSpeed': 1.8, 'armor': 'bone'},  # Nerfed: -20% HP (50→40), -2 STR (13→11)
    'Shadow Stalker':   {'hp': 45, 'str': 15, 'pDef': 6,  'atkSpeed': 1.0, 'armor': 'hide'}
}

WEAPON_MATRIX = {'blade': {'unarmored': 1.3, 'hide': 1.0, 'bone': 0.7}}

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def apply_floor_scaling(base_stat, floor):
    """Apply floor scaling to a stat"""
    return base_stat * min(FLOOR_SCALING_CAP, 1.0 + (floor - 1) * FLOOR_SCALING)

def create_player(weapon_name):
    """Create a new player with the specified weapon"""
    player = PLAYER_BASE.copy()
    weapon = STARTER_WEAPONS[weapon_name]
    player['weapon_name'] = weapon_name
    player['weapon'] = weapon
    player['agi'] = 8  # Add agility for ranged weapons
    return player

def get_weapon_armor_modifier(damage_type, armor_type):
    """Get damage modifier from weapon vs armor matchup"""
    if damage_type not in WEAPON_ARMOR_MATRIX:
        return 0.0
    return WEAPON_ARMOR_MATRIX[damage_type].get(armor_type, 0.0)

def get_damage(attacker, defender, is_player, floor=1):
    """Calculate damage with floor scaling for monsters"""
    if is_player:
        weapon = attacker['weapon']

        # Base damage from weapon
        base = weapon['damage']

        # Add stat scaling (STR, INT, or AGI based on weapon)
        scaling_stat = weapon['stat_scaling']
        if scaling_stat == 'str':
            base += attacker['str'] * 0.5
        elif scaling_stat == 'int':
            base += attacker['int'] * 0.5
        elif scaling_stat == 'agi':
            base += attacker.get('agi', 8) * 0.5

        # Apply weapon vs armor modifier
        armor_mod = get_weapon_armor_modifier(weapon['damageType'], defender['armor'])
        base *= (1.0 + armor_mod)
    else:
        scaled_str = apply_floor_scaling(attacker['str'], floor)
        base = (scaled_str * 0.5) + (scaled_str / 5.0)

    def_val = min(defender['pDef'], 50)
    def_mod = max(0.25, 1.0 - (def_val * 0.015))
    return max(1, int(base * def_mod * random.uniform(0.9, 1.1)))

def check_potion(p):
    """Use potion if HP is low"""
    if p['hp'] < 40 and p['potions'] > 0:
        p['hp'] = min(p['max_hp'], p['hp'] + p['potion_heal'])
        p['potions'] -= 1
        return True
    return False

def check_level_up(p):
    """Check and apply level up"""
    leveled = False
    while True:
        next_lvl = p['level'] + 1
        if next_lvl in XP_THRESHOLDS and p['xp'] >= XP_THRESHOLDS[next_lvl]:
            p['level'] = next_lvl
            p['max_hp'] += 10
            p['hp'] = p['max_hp']  # Full Heal
            p['str'] += 2
            p['pDef'] += 1
            leveled = True
        else:
            break
    return leveled

def spawn_enemy():
    """Spawn a random enemy based on weights"""
    roll = random.uniform(0, 100)
    cum = 0
    for name, data in SPAWN_POOL.items():
        cum += data['weight']
        if roll <= cum:
            return name
    return 'Flame Bat'

def fight(p, m_name, floor=1):
    """
    Simulate a fight between player and monster.
    Returns: (ticks, dmg_dealt, dmg_taken, won)
    """
    m_stats = MONSTER_STATS[m_name].copy()
    m_hp = int(apply_floor_scaling(m_stats['hp'], floor))
    m_stats['pDef'] = int(apply_floor_scaling(m_stats['pDef'], floor))

    p_ticks = 7
    m_ticks = int(7 * m_stats['atkSpeed'])
    tick = 0
    total_dmg_dealt = 0
    total_dmg_taken = 0

    while p['hp'] > 0 and m_hp > 0:
        tick += 1
        if tick % p_ticks == 0:
            dmg = get_damage(p, m_stats, True)
            m_hp -= dmg
            total_dmg_dealt += dmg
        if m_hp > 0 and tick % m_ticks == 0:
            dmg = get_damage(m_stats, p, False, floor)
            p['hp'] -= dmg
            total_dmg_taken += dmg
            check_potion(p)

    won = p['hp'] > 0
    return (tick, total_dmg_dealt, total_dmg_taken, won)

def drop_loot(inventory):
    """Roll for loot drop"""
    if random.uniform(0, 100) > DROP_CHANCE:
        return None
    roll = random.uniform(0, 100)
    if roll < 60:
        item = 'junk'
    elif roll < 90:
        item = 'trophy'
    else:
        item = 'gear'
    inventory.append(item)
    return item

def visit_altar(p, inventory):
    """Sacrifice items at altar for HP"""
    if p['hp'] >= p['max_hp'] or not inventory:
        return (0, 0)

    sacrifices = 0
    hp_restored = 0
    inventory.sort(key=lambda x: LOOT_TABLE[x]['heal'])
    items_to_remove = []

    for item in inventory:
        if p['hp'] >= p['max_hp']:
            break
        heal_val = LOOT_TABLE[item]['heal']
        actual_heal = min(heal_val, p['max_hp'] - p['hp'])
        p['hp'] = min(p['max_hp'], p['hp'] + heal_val)
        items_to_remove.append(item)
        sacrifices += 1
        hp_restored += actual_heal

    for item in items_to_remove:
        inventory.remove(item)
    return (sacrifices, hp_restored)

def percentile(data, p):
    """Get percentile value from sorted data"""
    if not data:
        return 0
    idx = int(len(data) * p)
    return data[min(idx, len(data) - 1)]

# ==============================================================================
# FLOOR SIMULATION
# ==============================================================================

def run_floor(player, floor_num, inventory, analytics):
    """
    Simulate traversing a single floor to reach exit.

    Returns: {
        'result': 'exit_reached' | 'death',
        'room': room number where outcome occurred,
        'killer': enemy name if death, None otherwise,
        'kills': total kills this floor,
        'rooms_cleared': rooms successfully passed,
        'fights_skipped': number of fights player chose to skip
    }
    """
    config = FLOOR_CONFIG.get(floor_num, FLOOR_CONFIG[max(FLOOR_CONFIG.keys())])

    kills = 0
    fights_skipped = 0
    rooms_since_altar = 0

    for room in range(1, config['rooms'] + 1):
        rooms_since_altar += 1

        # Check if this room has an altar (every ALTAR_INTERVAL rooms)
        has_altar = (rooms_since_altar >= ALTAR_INTERVAL)

        # Determine if room is empty
        is_empty = random.random() < config['empty_room_chance']

        if not is_empty:
            # Determine enemy count for this room
            enemy_count = random.randint(*config['enemies_per_room'])

            for enemy_idx in range(enemy_count):
                enemy = spawn_enemy()

                # Player might skip combat (configurable behavior)
                if SKIP_COMBAT_CHANCE > 0 and random.random() < SKIP_COMBAT_CHANCE:
                    fights_skipped += 1
                    continue

                # Track pre-fight HP
                hp_before = player['hp']

                # Fight!
                ticks, dmg_dealt, dmg_taken, won = fight(player, enemy, floor_num)

                # Update analytics
                analytics['monster_fights'][enemy] += 1
                analytics['monster_dmg_taken'][enemy] += dmg_taken
                analytics['total_fights'] += 1

                if not won:
                    # DEATH
                    analytics['monster_kills_player'][enemy] += 1
                    return {
                        'result': 'death',
                        'room': room,
                        'killer': enemy,
                        'kills': kills,
                        'rooms_cleared': room - 1,
                        'fights_skipped': fights_skipped,
                        'hp_before_death': hp_before
                    }

                # Survived the fight
                kills += 1
                analytics['monster_killed'][enemy] += 1

                # Award XP and check level up
                player['xp'] += SPAWN_POOL[enemy]['xp']
                check_level_up(player)

                # Drop loot
                drop_loot(inventory)

        # Visit altar if available
        if has_altar:
            sacrificed, restored = visit_altar(player, inventory)
            if sacrificed > 0:
                analytics['altar_visits'] += 1
                analytics['total_sacrificed'] += sacrificed
                analytics['total_hp_restored'] += restored
            rooms_since_altar = 0

        # Track HP after room
        analytics['hp_after_rooms'].append(player['hp'])

        # Check for close call (low HP after room)
        if player['hp'] < player['max_hp'] * 0.2:
            analytics['close_calls'] += 1

    # Successfully reached the exit!
    return {
        'result': 'exit_reached',
        'room': config['rooms'],
        'killer': None,
        'kills': kills,
        'rooms_cleared': config['rooms'],
        'fights_skipped': fights_skipped,
        'hp_at_exit': player['hp']
    }

# ==============================================================================
# MAIN SIMULATION
# ==============================================================================

def run_simulation():
    # ==========================================================================
    # METRICS INITIALIZATION
    # ==========================================================================

    # Victory tracking
    victories = 0
    victory_hp = []  # HP at final victory
    victory_levels = []  # Level at victory
    victory_times = []  # Time to complete all floors

    # Weapon-specific tracking
    weapon_names = list(STARTER_WEAPONS.keys())
    weapon_victories = {w: 0 for w in weapon_names}
    weapon_deaths = {w: 0 for w in weapon_names}
    weapon_kills = {w: 0 for w in weapon_names}
    weapon_runs = {w: 0 for w in weapon_names}

    # Death tracking
    deaths = 0
    death_floor = []
    death_room = []
    death_room_pct = []  # How far through the floor (0-100%)
    death_hp_before = []
    death_level = []
    death_str = []       # Player STR at death
    death_pdef = []      # Player pDef at death
    death_max_hp = []    # Player max HP at death
    death_weapon = []    # Weapon used at death
    killers = []

    # Floor completion tracking
    floor_completions = {f: 0 for f in range(1, FLOORS_TO_WIN + 1)}
    floor_completion_hp = {f: [] for f in range(1, FLOORS_TO_WIN + 1)}
    floor_completion_level = {f: [] for f in range(1, FLOORS_TO_WIN + 1)}
    floor_kills = {f: [] for f in range(1, FLOORS_TO_WIN + 1)}

    # Per-run tracking
    total_kills_per_run = []
    total_rooms_per_run = []
    fights_skipped_per_run = []

    # Shared analytics (reset per run but aggregated)
    global_analytics = {
        'monster_fights': Counter(),
        'monster_killed': Counter(),
        'monster_kills_player': Counter(),
        'monster_dmg_taken': Counter(),
        'total_fights': 0,
        'altar_visits': 0,
        'total_sacrificed': 0,
        'total_hp_restored': 0,
        'hp_after_rooms': [],
        'close_calls': 0
    }

    print(f"Running {SIMULATIONS} Dungeon Run Simulations...")
    print(f"Goal: Complete {FLOORS_TO_WIN} floors to escape")
    print(f"Config: {FLOOR_CONFIG[1]['rooms']}/{FLOOR_CONFIG[2]['rooms']}/{FLOOR_CONFIG[3]['rooms']} rooms per floor")
    print(f"        Altar every {ALTAR_INTERVAL} rooms | Floor scaling: {FLOOR_SCALING*100:.0f}%")
    print(f"        Full heal on floor exit: YES")
    print(f"Weapons: {', '.join(weapon_names)} (randomized)")
    print("-" * 60)

    # ==========================================================================
    # SIMULATION LOOP
    # ==========================================================================

    for sim in range(SIMULATIONS):
        # Randomly select weapon for this run
        weapon_choice = random.choice(weapon_names)
        player = create_player(weapon_choice)
        weapon_runs[weapon_choice] += 1

        inventory = []
        run_kills = 0
        run_rooms = 0
        run_skipped = 0
        run_start_time = 0

        # Per-run analytics
        analytics = {
            'monster_fights': Counter(),
            'monster_killed': Counter(),
            'monster_kills_player': Counter(),
            'monster_dmg_taken': Counter(),
            'total_fights': 0,
            'altar_visits': 0,
            'total_sacrificed': 0,
            'total_hp_restored': 0,
            'hp_after_rooms': [],
            'close_calls': 0
        }

        run_success = True

        for floor_num in range(1, FLOORS_TO_WIN + 1):
            result = run_floor(player, floor_num, inventory, analytics)

            run_kills += result['kills']
            run_rooms += result['rooms_cleared']
            run_skipped += result['fights_skipped']

            if result['result'] == 'death':
                # Player died
                deaths += 1
                weapon_deaths[weapon_choice] += 1
                death_floor.append(floor_num)
                death_room.append(result['room'])

                # Calculate how far through the floor
                floor_total_rooms = FLOOR_CONFIG.get(floor_num, FLOOR_CONFIG[3])['rooms']
                pct = (result['room'] / floor_total_rooms) * 100
                death_room_pct.append(pct)

                death_hp_before.append(result.get('hp_before_death', 0))
                death_level.append(player['level'])
                death_str.append(player['str'])
                death_pdef.append(player['pDef'])
                death_max_hp.append(player['max_hp'])
                death_weapon.append(weapon_choice)
                killers.append(result['killer'])

                run_success = False
                break

            else:
                # Floor completed
                floor_completions[floor_num] += 1
                floor_completion_hp[floor_num].append(result['hp_at_exit'])
                floor_completion_level[floor_num].append(player['level'])
                floor_kills[floor_num].append(result['kills'])

                # Full heal when reaching floor exit
                player['hp'] = player['max_hp']

        # Aggregate analytics
        for key in ['monster_fights', 'monster_killed', 'monster_kills_player', 'monster_dmg_taken']:
            global_analytics[key] += analytics[key]
        global_analytics['total_fights'] += analytics['total_fights']
        global_analytics['altar_visits'] += analytics['altar_visits']
        global_analytics['total_sacrificed'] += analytics['total_sacrificed']
        global_analytics['total_hp_restored'] += analytics['total_hp_restored']
        global_analytics['hp_after_rooms'].extend(analytics['hp_after_rooms'])
        global_analytics['close_calls'] += analytics['close_calls']

        # Record run results
        total_kills_per_run.append(run_kills)
        total_rooms_per_run.append(run_rooms)
        fights_skipped_per_run.append(run_skipped)

        # Track weapon kills for this run
        weapon_kills[weapon_choice] += run_kills

        if run_success:
            victories += 1
            weapon_victories[weapon_choice] += 1
            victory_hp.append(player['hp'])
            victory_levels.append(player['level'])

            # Calculate run time (simplified)
            total_rooms = sum(FLOOR_CONFIG[f]['rooms'] for f in range(1, FLOORS_TO_WIN + 1))
            combat_time = analytics['total_fights'] * 3.0  # Rough avg fight time
            nav_time = total_rooms * NAV_TIME_PER_ROOM
            victory_times.append((combat_time + nav_time) / 60)  # Minutes

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

    print(f"\n  🏆 VICTORY RATE: {win_rate:.1f}% ({victories}/{SIMULATIONS})")

    if victories > 0:
        print(f"\n  Avg HP at Victory:     {statistics.mean(victory_hp):.1f}")
        print(f"  Avg Level at Victory:  {statistics.mean(victory_levels):.1f}")
        print(f"  Avg Time to Complete:  {statistics.mean(victory_times):.1f} minutes")

        # Victory HP distribution
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

    # Sort weapons by win rate for display
    weapon_stats = []
    for w in weapon_names:
        runs = weapon_runs[w]
        if runs == 0:
            continue
        wins = weapon_victories[w]
        win_rate = (wins / runs) * 100
        kills = weapon_kills[w]
        avg_kills = kills / runs
        weapon_stats.append((w, runs, win_rate, kills, avg_kills))

    # Sort by win rate descending
    weapon_stats.sort(key=lambda x: x[2], reverse=True)

    for w, runs, win_rate, kills, avg_kills in weapon_stats:
        weapon_data = STARTER_WEAPONS[w]
        dmg_type = weapon_data['damageType']
        bar = "█" * int(win_rate / 5) + "░" * (20 - int(win_rate / 5))
        print(f"  {w:<20} {runs:>6} {win_rate:>6.1f}% {kills:>7} {avg_kills:>9.1f}")
        print(f"    └─ {dmg_type} damage | {bar}")

    # Show damage type summary
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
            bar = "█" * int(rate / 5) + "░" * (20 - int(rate / 5))
            print(f"    {dmg_type:<10} {bar} {rate:5.1f}%")

    # --- FLOOR PROGRESSION ---
    print("\n" + "-" * 60)
    print("                    FLOOR PROGRESSION")
    print("-" * 60)

    print(f"\n  {'Floor':<8} {'Clear%':>8} {'Avg HP':>8} {'Avg Lvl':>8} {'Avg Kills':>10}")
    print("  " + "-" * 44)

    for f in range(1, FLOORS_TO_WIN + 1):
        clear_pct = (floor_completions[f] / SIMULATIONS) * 100
        avg_hp = statistics.mean(floor_completion_hp[f]) if floor_completion_hp[f] else 0
        avg_lvl = statistics.mean(floor_completion_level[f]) if floor_completion_level[f] else 0
        avg_kills = statistics.mean(floor_kills[f]) if floor_kills[f] else 0

        bar = "█" * int(clear_pct / 5) + "░" * (20 - int(clear_pct / 5))
        print(f"  Floor {f}  {clear_pct:>6.1f}%  {avg_hp:>7.1f}  {avg_lvl:>7.1f}  {avg_kills:>9.1f}")

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
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            print(f"    Floor {f}: {bar} {pct:5.1f}%")

        print(f"\n  Death Location (% through floor):")
        death_room_pct_sorted = sorted(death_room_pct)
        print(f"    Early (0-33%):  {len([x for x in death_room_pct if x <= 33])/deaths*100:.1f}%")
        print(f"    Mid (34-66%):   {len([x for x in death_room_pct if 33 < x <= 66])/deaths*100:.1f}%")
        print(f"    Late (67-100%): {len([x for x in death_room_pct if x > 66])/deaths*100:.1f}%")

        print(f"\n  HP Before Fatal Fight:")
        death_hp_sorted = sorted(death_hp_before)
        print(f"    Min:   {min(death_hp_before)}")
        print(f"    25th%: {percentile(death_hp_sorted, 0.25)}")
        print(f"    50th%: {percentile(death_hp_sorted, 0.50)}")
        print(f"    Max:   {max(death_hp_before)}")

        burst = len([hp for hp in death_hp_before if hp >= 60])
        attrition = len([hp for hp in death_hp_before if hp < 40])
        print(f"\n    Burst Deaths (HP>=60):    {(burst/deaths)*100:.1f}%")
        print(f"    Attrition Deaths (HP<40): {(attrition/deaths)*100:.1f}%")

        print(f"\n  Level at Death:")
        level_death_counts = Counter(death_level)
        for lvl in sorted(level_death_counts.keys()):
            count = level_death_counts[lvl]
            pct = (count / deaths) * 100
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            print(f"    Level {lvl}: {bar} {pct:5.1f}%")

        print(f"\n  Player Stats at Death:")
        print(f"    STR:    Min={min(death_str):>3}  Avg={statistics.mean(death_str):>5.1f}  Max={max(death_str):>3}")
        print(f"    pDef:   Min={min(death_pdef):>3}  Avg={statistics.mean(death_pdef):>5.1f}  Max={max(death_pdef):>3}")
        print(f"    Max HP: Min={min(death_max_hp):>3}  Avg={statistics.mean(death_max_hp):>5.1f}  Max={max(death_max_hp):>3}")

        # Deaths by weapon type
        print(f"\n  Deaths by Weapon:")
        weapon_death_counts = Counter(death_weapon)
        for weapon, count in weapon_death_counts.most_common():
            weapon_total_runs = weapon_runs[weapon]
            death_rate = (count / weapon_total_runs) * 100 if weapon_total_runs > 0 else 0
            print(f"    {weapon:<20} {count:>4} deaths ({death_rate:>5.1f}% of runs)")

        print(f"\n  Top Killers:")
        killer_counts = Counter(killers)
        for name, count in killer_counts.most_common(5):
            pct = (count / deaths) * 100
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            print(f"    {name:<20} {bar} {pct:5.1f}%")

    # --- MONSTER ANALYSIS ---
    print("\n" + "-" * 60)
    print("                   MONSTER THREAT ANALYSIS")
    print("-" * 60)

    print(f"\n  {'Monster':<20} {'Fights':>7} {'Win%':>7} {'Death%':>8} {'Avg DMG':>8}")
    print("  " + "-" * 52)

    for name in sorted(MONSTER_STATS.keys()):
        fights = global_analytics['monster_fights'][name]
        if fights == 0:
            continue

        killed = global_analytics['monster_killed'][name]
        caused_deaths = global_analytics['monster_kills_player'][name]
        dmg = global_analytics['monster_dmg_taken'][name]

        win_pct = (killed / fights) * 100
        death_pct = (caused_deaths / deaths) * 100 if deaths > 0 else 0
        avg_dmg = dmg / fights

        threat = ""
        if death_pct > 25: threat = "⚠️⚠️⚠️"
        elif death_pct > 15: threat = "⚠️⚠️"
        elif death_pct > 8: threat = "⚠️"

        print(f"  {name:<20} {fights:>7} {win_pct:>6.1f}% {death_pct:>6.1f}%  {avg_dmg:>7.1f} {threat}")

    # --- ECONOMY ---
    print("\n" + "-" * 60)
    print("                      ECONOMY REPORT")
    print("-" * 60)

    avg_kills = statistics.mean(total_kills_per_run)
    avg_rooms = statistics.mean(total_rooms_per_run)

    print(f"\n  Avg Kills per Run:   {avg_kills:.1f}")
    print(f"  Avg Rooms Cleared:   {avg_rooms:.1f}")

    if global_analytics['altar_visits'] > 0:
        print(f"\n  Altar Visits:        {global_analytics['altar_visits']}")
        print(f"  Avg HP/Visit:        {global_analytics['total_hp_restored']/global_analytics['altar_visits']:.1f}")
        print(f"  Avg Items/Visit:     {global_analytics['total_sacrificed']/global_analytics['altar_visits']:.1f}")

    close_call_rate = (global_analytics['close_calls'] / len(global_analytics['hp_after_rooms'])) * 100 if global_analytics['hp_after_rooms'] else 0
    print(f"\n  Close Calls (<20% HP after room): {close_call_rate:.1f}%")

    # --- RECOMMENDATIONS ---
    print("\n" + "=" * 60)
    print("                   BALANCE RECOMMENDATIONS")
    print("=" * 60)

    recommendations = []

    # Win rate targets
    if win_rate < 20:
        recommendations.append(f"- Win rate very low ({win_rate:.0f}%). Consider significant nerfs or more altars.")
    elif win_rate < 40:
        recommendations.append(f"- Win rate low ({win_rate:.0f}%). Game may be too punishing for average players.")
    elif win_rate > 70:
        recommendations.append(f"- Win rate high ({win_rate:.0f}%). Consider increasing difficulty for challenge.")

    # Floor-specific issues
    for f in range(1, FLOORS_TO_WIN + 1):
        clear_pct = (floor_completions[f] / SIMULATIONS) * 100
        prev_clear = (floor_completions[f-1] / SIMULATIONS) * 100 if f > 1 else 100
        drop = prev_clear - clear_pct

        if drop > 40:
            recommendations.append(f"- Floor {f} has {drop:.0f}% drop-off. This floor may be too hard.")

    # Death analysis
    if deaths > 0:
        attrition_pct = (attrition / deaths) * 100
        if attrition_pct > 80:
            recommendations.append("- Most deaths are attrition. Players need more healing opportunities.")

        # Check killer concentration
        if killers:
            top_killer, top_count = killer_counts.most_common(1)[0]
            if (top_count / deaths) * 100 > 35:
                recommendations.append(f"- {top_killer} causes {(top_count/deaths)*100:.0f}% of deaths. Consider nerfs.")

    # Weapon balance recommendations
    if weapon_stats:
        best_weapon = weapon_stats[0]  # Already sorted by win rate
        worst_weapon = weapon_stats[-1]

        win_diff = best_weapon[2] - worst_weapon[2]  # Difference in win rates
        if win_diff > 15:
            recommendations.append(f"- Weapon imbalance: {best_weapon[0]} ({best_weapon[2]:.0f}%) vs {worst_weapon[0]} ({worst_weapon[2]:.0f}%)")
            # Check if it's a damage type issue
            best_type = STARTER_WEAPONS[best_weapon[0]]['damageType']
            worst_type = STARTER_WEAPONS[worst_weapon[0]]['damageType']
            if best_type != worst_type:
                recommendations.append(f"  Consider buffing {worst_type} weapons or nerfing {best_type} weapons.")

    if not recommendations:
        recommendations.append("- Balance looks reasonable for target difficulty!")

    for rec in recommendations:
        print(f"  {rec}")

    print("\n" + "=" * 60)

# ==============================================================================
# ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    run_simulation()
