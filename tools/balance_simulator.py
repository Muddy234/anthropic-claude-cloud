import random
import statistics
from collections import Counter, defaultdict

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SIMULATIONS = 5000
ALTAR_INTERVAL = 8  # Altar appears every 8 kills (approx 5 rooms)

# Time Settings
NAV_TIME_PER_ROOM = 15.0  # Seconds walking/looting per room
TICK_DURATION = 0.1       # Seconds per combat tick

# Floor Scaling (matches game)
FLOOR_SCALING = 0.12      # +12% per floor
FLOOR_SCALING_CAP = 3.0   # Max 3x multiplier
KILLS_PER_FLOOR = 15      # Approximate kills before floor transition

# XP Curve
XP_THRESHOLDS = {2: 100, 3: 300, 4: 600, 5: 1000}

PLAYER_START = {
    'level': 1, 'xp': 0,
    'hp': 100, 'max_hp': 100,
    'str': 12, 'pDef': 5,
    'weaponDmg': 8, 'weaponType': 'blade',
    'potions': 2, 'potion_heal': 50
}

# --- ECONOMY ---
DROP_CHANCE = 40  # 40% chance per kill
LOOT_TABLE = {
    'junk':   {'weight': 60, 'heal': 8},    # Ash (Common)
    'trophy': {'weight': 30, 'heal': 25},   # Fang (Uncommon)
    'gear':   {'weight': 10, 'heal': 60}    # Sword (Rare)
}

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
    'Skeletal Warrior': {'hp': 50, 'str': 13, 'pDef': 10, 'atkSpeed': 1.8, 'armor': 'bone'},
    'Shadow Stalker':   {'hp': 45, 'str': 15, 'pDef': 6,  'atkSpeed': 1.0, 'armor': 'hide'}
}

WEAPON_MATRIX = {'blade': {'unarmored': 1.3, 'hide': 1.0, 'bone': 0.7}}

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def get_floor(kills):
    """Calculate current floor based on kill count"""
    return 1 + (kills // KILLS_PER_FLOOR)

def apply_floor_scaling(base_stat, floor):
    """Apply floor scaling to a stat"""
    return base_stat * min(FLOOR_SCALING_CAP, 1.0 + (floor - 1) * FLOOR_SCALING)

def get_damage(attacker, defender, is_player, floor=1):
    """Calculate damage with floor scaling for monsters"""
    if is_player:
        base = attacker['weaponDmg'] + (attacker['str'] * 0.5)
        mod = WEAPON_MATRIX[attacker['weaponType']].get(defender['armor'], 1.0)
        base *= mod
    else:
        # Apply floor scaling to monster damage
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
    next_lvl = p['level'] + 1
    if next_lvl in XP_THRESHOLDS and p['xp'] >= XP_THRESHOLDS[next_lvl]:
        p['level'] = next_lvl
        p['max_hp'] += 10
        p['hp'] = p['max_hp']  # Full Heal
        p['str'] += 2
        p['pDef'] += 1
        return True
    return False

def fight(p, m_name, floor=1):
    """
    Simulate a fight between player and monster.
    Returns: (ticks, dmg_dealt, dmg_taken, won)
    """
    m_stats = MONSTER_STATS[m_name].copy()
    # Apply floor scaling to monster HP and defense
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
    if p['hp'] >= p['max_hp']:
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
# MAIN SIMULATION
# ==============================================================================

def run_simulation():
    # ==========================================================================
    # METRICS INITIALIZATION
    # ==========================================================================

    # Run-level metrics
    history_kills = []
    history_level = []
    history_time = []
    history_bag_size = []
    history_hp_before_death = []
    history_wasted_potions = []
    history_items_dropped = []
    history_items_sacrificed = []

    # Death tracking
    killers = []
    death_context = []
    level_at_death = Counter()
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

    # Altar analytics
    altar_visits = 0
    total_sacrificed = 0
    total_hp_restored = 0

    # Death spiral detection (3+ consecutive fights losing >15 HP each)
    death_spirals = 0

    print(f"Running {SIMULATIONS} Simulations...")
    print(f"Config: Altars every {ALTAR_INTERVAL} kills | Floor scaling: {FLOOR_SCALING*100:.0f}%/floor")
    print("-" * 60)

    # ==========================================================================
    # SIMULATION LOOP
    # ==========================================================================

    for sim in range(SIMULATIONS):
        player = PLAYER_START.copy()
        inventory = []
        kills = 0
        combat_ticks = 0
        recent_enemies = []
        recent_hp_deltas = []
        items_dropped_this_run = 0
        items_sacrificed_this_run = 0

        while player['hp'] > 0:
            # 1. Determine floor and spawn enemy
            floor = get_floor(kills)

            roll = random.uniform(0, 100)
            cum = 0
            enemy = 'Flame Bat'
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

            # 3. Fight
            ticks, dmg_dealt, dmg_taken, won = fight(player, enemy, floor)
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
                history_bag_size.append(len(inventory))
                history_hp_before_death.append(hp_before)
                history_wasted_potions.append(player['potions'])
                level_at_death[player['level']] += 1
                floor_at_death[floor] += 1
                monster_analytics[enemy]['deaths_caused'] += 1

                if len(recent_enemies) >= 2:
                    death_context.append(tuple(recent_enemies[-2:]))

                # Check for death spiral
                if len(recent_hp_deltas) >= 3 and all(d <= -15 for d in recent_hp_deltas[-3:]):
                    death_spirals += 1

                break

            # 6. Post-fight processing (survived)
            kills += 1
            monster_analytics[enemy]['kills'] += 1
            survival_at_fight[kills] += 1

            # Track close calls
            if player['hp'] < player['max_hp'] * 0.2:
                close_calls += 1

            hp_after_fights.append(player['hp'])

            # XP and level up
            player['xp'] += SPAWN_POOL[enemy]['xp']
            leveled = check_level_up(player)

            # Loot
            item = drop_loot(inventory)
            if item:
                items_dropped_this_run += 1

            # Altar visit
            if kills % ALTAR_INTERVAL == 0:
                sacrificed, restored = visit_altar(player, inventory)
                if sacrificed > 0:
                    altar_visits += 1
                    total_sacrificed += sacrificed
                    total_hp_restored += restored
                    items_sacrificed_this_run += sacrificed

        # End of run calculations
        rooms = kills / 1.5
        total_time = (combat_ticks * TICK_DURATION) + (rooms * NAV_TIME_PER_ROOM)

        history_kills.append(kills)
        history_level.append(player['level'])
        history_time.append(total_time)
        history_items_dropped.append(items_dropped_this_run)
        history_items_sacrificed.append(items_sacrificed_this_run)

    # ==========================================================================
    # REPORTING
    # ==========================================================================

    avg_kills = statistics.mean(history_kills)
    avg_rooms = avg_kills / 1.5
    avg_time = statistics.mean(history_time) / 60
    avg_lvl = statistics.mean(history_level)

    # Sort for percentiles
    history_kills_sorted = sorted(history_kills)
    history_hp_before_death_sorted = sorted(history_hp_before_death) if history_hp_before_death else [0]

    print("\n" + "=" * 60)
    print("                    MASTER PROGRESSION REPORT")
    print("=" * 60)

    print("\n--- CORE METRICS ---")
    print(f"  Average Level:        {avg_lvl:.2f}")
    print(f"  Average Kills:        {avg_kills:.1f}")
    print(f"  Average Rooms:        {avg_rooms:.1f}")
    print(f"  Average Time Alive:   {avg_time:.1f} minutes")

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
    print("                       ECONOMY REPORT")
    print("=" * 60)

    tragic_deaths = len([x for x in history_bag_size if x >= 3])
    tragedy_pct = (tragic_deaths / len(history_bag_size)) * 100 if history_bag_size else 0

    avg_dropped = statistics.mean(history_items_dropped) if history_items_dropped else 0
    avg_sacrificed = statistics.mean(history_items_sacrificed) if history_items_sacrificed else 0
    avg_wasted_potions = statistics.mean(history_wasted_potions) if history_wasted_potions else 0

    print(f"\n  Avg Items Dropped:         {avg_dropped:.1f}")
    print(f"  Avg Items Sacrificed:      {avg_sacrificed:.1f}")
    print(f"  Sacrifice Efficiency:      {(avg_sacrificed/max(1,avg_dropped))*100:.1f}%")
    print(f"  Avg Wasted Potions:        {avg_wasted_potions:.2f}")
    print(f"  Tragedy Rate (3+ items):   {tragedy_pct:.1f}%")

    if altar_visits > 0:
        print(f"\n  Total Altar Visits:        {altar_visits}")
        print(f"  Avg HP Restored/Visit:     {total_hp_restored/altar_visits:.1f}")
        print(f"  Avg Items/Visit:           {total_sacrificed/altar_visits:.1f}")

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

    print("\n--- LEVEL AT DEATH ---")
    for lvl in sorted(level_at_death.keys()):
        count = level_at_death[lvl]
        pct = (count / SIMULATIONS) * 100
        bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
        print(f"  Level {lvl}: {bar} {pct:5.1f}%")

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

    # Monster Threat Analysis
    print("\n" + "=" * 60)
    print("                    MONSTER THREAT ANALYSIS")
    print("=" * 60)

    print(f"\n  {'Monster':<20} {'Fights':>7} {'Win%':>7} {'Death%':>8} {'TTK':>6} {'DPF':>6}")
    print("  " + "-" * 56)

    for name in sorted(MONSTER_STATS.keys()):
        ma = monster_analytics[name]
        fights = ma['fights']
        if fights == 0:
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

        print(f"  {name:<20} {fights:>7} {win_pct:>6.1f}% {death_pct:>6.1f}% {avg_ttk:>6.1f} {avg_dpf:>6.1f} {threat}")

    # Player Power Curve
    print("\n" + "=" * 60)
    print("                     PLAYER POWER CURVE")
    print("=" * 60)

    print("\n  Level | Max HP | STR | pDef | Base DPS")
    print("  " + "-" * 40)
    for lvl in range(1, 6):
        hp = 100 + (lvl - 1) * 10
        str_val = 12 + (lvl - 1) * 2
        pdef = 5 + (lvl - 1) * 1
        base_dmg = 8 + (str_val * 0.5)
        dps = base_dmg / (7 * TICK_DURATION)
        print(f"    {lvl}   |  {hp:3d}   |  {str_val:2d} |  {pdef:2d}  |  {dps:.1f}")

    # Recommendations
    print("\n" + "=" * 60)
    print("                      BALANCE RECOMMENDATIONS")
    print("=" * 60)

    recommendations = []

    # Check floor 1 clear rate
    if (k15/SIMULATIONS)*100 < 50:
        recommendations.append("- Floor 1 clear rate is low (<50%). Consider reducing early monster damage or HP.")

    # Check attrition vs burst
    if history_hp_before_death:
        burst_pct = (burst_deaths/len(history_hp_before_death))*100
        if burst_pct > 40:
            recommendations.append(f"- {burst_pct:.0f}% of deaths are burst (HP>=60). Some monsters may hit too hard.")

    # Check tragedy rate
    if tragedy_pct > 30:
        recommendations.append(f"- Tragedy rate is {tragedy_pct:.0f}%. Consider reducing altar interval from {ALTAR_INTERVAL}.")

    # Check death spirals
    if (death_spirals/SIMULATIONS)*100 > 20:
        recommendations.append("- High death spiral rate. Players may need more recovery options between fights.")

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

# ==============================================================================
# ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    run_simulation()
