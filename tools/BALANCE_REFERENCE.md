# Combat Balance Reference Sheet
## The Shifting Chasm

---

## DAMAGE FORMULA

```
Final Damage = Base Damage × Weapon/Armor Mod × Element Mod × Defense Mod × Crit Mod × Variance
```

### Base Damage Calculation

**Player (with weapon):**
```
Base Damage = Weapon Damage + (STR × 0.5)
```

**Monster (physical):**
```
Base Damage = (STR × 0.5) + (STR / 5)
```

**Monster (magic):**
```
Base Damage = (INT × 0.5) + (INT / 3)
```

### Defense Reduction
```
Defense Mod = 1 - (Defense × 0.01)
Cap: 75% max reduction (at 75+ defense)

Examples:
  10 def = 10% reduction → ×0.90 damage
  25 def = 25% reduction → ×0.75 damage
  50 def = 50% reduction → ×0.50 damage
  75 def = 75% reduction → ×0.25 damage (cap)
```

### Other Modifiers
| Modifier | Value |
|----------|-------|
| Variance | ±10% random |
| Crit Chance | 5% base + (AGI × 0.1%) |
| Crit Damage | ×1.5 |
| Hit Chance | 90% base ± (AGI × 0.2%) |
| Combo Finisher | ×1.5 (every 3rd monster hit) |

---

## WEAPON VS ARMOR MATRIX

Modifiers: **+30%**, **0%**, or **-30%**

| Weapon ↓ / Armor → | Unarmored | Hide | Scaled | Armored | Stone | Bone | Ethereal |
|--------------------|-----------|------|--------|---------|-------|------|----------|
| **Blade** (swords) | +30% | 0% | 0% | -30% | -30% | 0% | 0% |
| **Blunt** (maces)  | 0% | 0% | 0% | +30% | +30% | +30% | -30% |
| **Pierce** (spears)| 0% | +30% | +30% | -30% | -30% | 0% | +30% |

### Quick Reference
- **Blade** → Good vs flesh, bad vs metal/stone
- **Blunt** → Good vs hard materials (armor, stone, bone), bad vs ghosts
- **Pierce** → Good vs tough skin/scales, bad vs solid surfaces, anchors spirits

---

## ELEMENT MATRIX

Modifiers: **+30%** (strong), **0%** (neutral), or **-30%** (weak)

| Attacker ↓ / Defender → | Fire | Ice | Water | Earth | Nature | Death | Arcane | Dark | Holy | Physical |
|-------------------------|------|-----|-------|-------|--------|-------|--------|------|------|----------|
| **Fire** | 0 | +30 | -30 | 0 | +30 | 0 | 0 | 0 | 0 | 0 |
| **Ice** | -30 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Water** | +30 | 0 | 0 | +30 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Earth** | 0 | 0 | -30 | 0 | +30 | 0 | 0 | 0 | 0 | 0 |
| **Nature** | -30 | 0 | 0 | -30 | 0 | +30 | 0 | 0 | 0 | 0 |
| **Death** | 0 | 0 | 0 | 0 | -30 | 0 | 0 | 0 | -30 | 0 |
| **Arcane** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | +30 |
| **Dark** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | -30 | 0 |
| **Holy** | 0 | 0 | 0 | 0 | 0 | +30 | 0 | +30 | 0 | 0 |
| **Physical** | 0 | 0 | 0 | 0 | 0 | 0 | -30 | 0 | 0 | 0 |

### Element Relationships Summary
```
Fire    → Strong vs: Ice, Nature    | Weak vs: Water
Ice     → Strong vs: (none)         | Weak vs: Fire
Water   → Strong vs: Fire, Earth    | Weak vs: (none)
Earth   → Strong vs: Nature         | Weak vs: Water
Nature  → Strong vs: Death          | Weak vs: Fire, Earth
Death   → Strong vs: (none)         | Weak vs: Nature, Holy
Arcane  → Strong vs: Physical       | Weak vs: (none)
Dark    → Strong vs: (none)         | Weak vs: Holy
Holy    → Strong vs: Death, Dark    | Weak vs: (none)
Physical→ Strong vs: (none)         | Weak vs: Arcane
```

---

## FLOOR SCALING

Monsters scale **+12% per floor** for all stats (capped at 3×)

```
Stat at Floor N = Base Stat × (1 + (N-1) × 0.12)

Floor 1:  ×1.00 (base)
Floor 2:  ×1.12
Floor 3:  ×1.24
Floor 5:  ×1.48
Floor 10: ×2.08
Floor 17: ×3.00 (cap)
```

---

## ATTACK SPEED

```
Attack Time = 700ms × Attack Speed Multiplier

Speed 0.8 = 560ms (very fast)
Speed 1.0 = 700ms (normal)
Speed 1.5 = 1050ms (slow)
Speed 2.5 = 1750ms (very slow)
Speed 3.0 = 2100ms (extremely slow)
```

---

## MONSTER QUICK REFERENCE

### By Attack Speed (fastest to slowest)
| Monster | Speed | Attack Time |
|---------|-------|-------------|
| Shadow Stalker | 1.0 | 700ms |
| Cave Bat | 1.0 | 700ms |
| Flame Bat | 1.2 | 840ms |
| Crystal Spider | 1.3 | 910ms |
| Tide Serpent | 1.4 | 980ms |
| Cinder Wisp | 1.5 | 1050ms |
| Deep Crawler | 1.6 | 1120ms |
| Skeletal Warrior | 1.8 | 1260ms |
| Salamander | 1.8 | 1260ms |
| Void Touched | 1.8 | 1260ms |
| Pyro Cultist | 2.0 | 1400ms |
| Phantom | 2.0 | 1400ms |
| Ash Walker | 2.2 | 1540ms |
| Mushroom Sprite | 2.2 | 1540ms |
| Magma Slime | 2.5 | 1750ms |
| Stone Lurker | 2.8 | 1960ms |
| Obsidian Golem | 3.0 | 2100ms |
| Bone Golem | 3.2 | 2240ms |

### By Element
| Element | Monsters |
|---------|----------|
| Fire | Magma Slime, Cinder Wisp, Flame Bat, Pyro Cultist |
| Physical | Obsidian Golem, Cave Bat, Crystal Spider |
| Nature | Salamander, Mushroom Sprite |
| Shadow | Ash Walker, Shadow Stalker, Void Touched |
| Earth | Stone Lurker |
| Water | Deep Crawler, Tide Serpent |
| Death | Skeletal Warrior, Phantom, Bone Golem |

### By Armor Type
| Armor | Monsters | Best Weapon |
|-------|----------|-------------|
| Unarmored | Magma Slime, Cave Bat, Cinder Wisp, Mushroom Sprite, Pyro Cultist | Blade |
| Hide | Ash Walker, Shadow Stalker | Pierce |
| Scaled | Salamander, Crystal Spider, Deep Crawler, Tide Serpent | Pierce |
| Stone | Obsidian Golem, Stone Lurker | Blunt |
| Bone | Skeletal Warrior, Bone Golem | Blunt |
| Ethereal | Cinder Wisp, Phantom, Void Touched | Pierce |

---

## DAMAGE CALCULATION EXAMPLES

### Example 1: Player vs Magma Slime (Floor 1)
```
Player: 12 STR, 8 weapon damage, blade
Slime: 15 pDef, unarmored

Base Damage = 8 + (12 × 0.5) = 14
Weapon/Armor = ×1.30 (blade vs unarmored)
Defense = 1 - (15 × 0.01) = ×0.85
Element = ×1.0 (neutral)

Final = 14 × 1.30 × 0.85 × 1.0 = 15.5 → 15 damage
```

### Example 2: Player vs Obsidian Golem (Floor 5)
```
Player: 12 STR, 8 weapon damage, blade
Golem (F5): 29 pDef (20 × 1.48), stone armor

Base Damage = 8 + (12 × 0.5) = 14
Weapon/Armor = ×0.70 (blade vs stone: -30%)
Defense = 1 - (29 × 0.01) = ×0.71
Element = ×1.0 (neutral)

Final = 14 × 0.70 × 0.71 × 1.0 = 6.9 → 6 damage
```

### Example 3: Bone Golem vs Player (Floor 5)
```
Golem (F5): 29 STR (20 × 1.48), blunt attack
Player: 5 pDef

Base Damage = (29 × 0.5) + (29 / 5) = 14 + 5 = 19
Weapon/Armor = ×1.0 (blunt vs player armor)
Defense = 1 - (5 × 0.01) = ×0.95

Final = 19 × 1.0 × 0.95 = 18 damage
```

---

## BALANCE TARGETS

### Ideal Balance (suggested)
| Floor | Win Rate | Sustain | Avg Damage |
|-------|----------|---------|------------|
| 1-2 | 95-100% | 5-10 fights | 10-20% HP |
| 3-4 | 85-95% | 3-5 fights | 20-30% HP |
| 5-6 | 70-85% | 2-3 fights | 30-40% HP |
| 7-8 | 60-75% | 1-2 fights | 40-50% HP |
| 9+ | 50-65% | 1 fight | 50%+ HP |

### Problem Indicators
- **Sustain < 2**: Need healing every fight (too punishing)
- **Sustain > 10**: No threat, too easy
- **Win Rate < 50%**: Player will die often without gear upgrades
- **Win Rate = 100% + Sustain > 5**: Trivial, no tension

---

## CLI QUICK REFERENCE

```bash
# Single monster simulation
node tools/balance-analyzer.js sim "Monster Name" [floor]

# Consecutive fights until death
node tools/balance-analyzer.js gauntlet "Monster Name" [floor]

# All monsters report
node tools/balance-analyzer.js report [floor]

# Theoretical (no RNG)
node tools/balance-analyzer.js theory "Monster Name" [floor]

# Set player stats
node tools/balance-analyzer.js set str 15
node tools/balance-analyzer.js set hp 120
node tools/balance-analyzer.js set weaponDamage 12
```
