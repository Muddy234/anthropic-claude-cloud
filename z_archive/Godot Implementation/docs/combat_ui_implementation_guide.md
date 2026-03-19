# Combat Arena UI Implementation Guide
## Inspired by Into The Breach's "Clarity First" Design Philosophy

This guide outlines how to implement Into The Breach-style UI improvements for the Shifting Chasm arena combat system. The core principle: **"Sacrifice cool ideas for the sake of clarity every time."**

---

## Current State Assessment

### What We Have
- 4x4 grid with tile-based combat
- Player (P) and Enemy (E) displayed as letters on colored tiles
- Pip economy displayed as colored squares
- HP shown as text labels
- Telegraph phase shows enemy intent with orange tiles
- Action queue displayed as text list

### What Needs Improvement
- Health is text-only, not visually scannable
- Damage preview is missing entirely
- No attack direction indicators
- No execution order visibility
- Telegraphs don't show damage amounts
- No hover tooltips for information
- Resolution phase lacks step-by-step feedback

---

## Phase 1: Health Display Overhaul

### 1.1 Segmented Health Bars (Like ITB's Green Squares)

Replace text HP with visual segments displayed ON the entity tile.

```
Current:  "HP: 45/100"
New:      [■][■][■][■][□] (5 segments, 3 filled = 60%)
```

**Implementation:**
- Add `HealthSegmentDisplay` node to each tile
- Display 5-10 segments based on max HP brackets
- Color: Green for player, Red for enemy
- Position: Bottom edge of entity tile
- Animate segment loss with brief flash

**Code Location:** `combat_arena_overlay.gd` → `_create_tile()` and new `_update_tile_health()`

### 1.2 Damage Preview on Hover

When hovering over an entity, show incoming damage.

```
┌─────────────┐
│     E       │  ← Enemy tile
│  [■■■□□]    │  ← Current HP segments
│   -12 HP    │  ← Damage preview (red text)
└─────────────┘
```

**Implementation:**
- Track queued attacks targeting each position
- On tile hover, calculate total incoming damage
- Display damage number in red below health bar
- Show "KILL" indicator if damage >= remaining HP

---

## Phase 2: Attack Direction & Telegraphing

### 2.1 Arrow Indicators for Attacks

Show direction of attacks with arrow overlays.

```
     ↓        ← Arrow pointing to target
┌─────────────┐
│   ENEMY     │
│    [E]      │
│  ═══════►   │  ← Attack direction line
└─────────────┘
         ↓
┌─────────────┐
│   TARGET    │
│    [P]      │  ← Player being attacked
│   -8 HP     │  ← Damage amount on target tile
└─────────────┘
```

**Implementation:**
- Create `AttackArrow` scene with TextureRect or Line2D
- Spawn arrows during TELEGRAPH phase
- Arrow points FROM attacker TO target
- Color: Orange/red for enemy attacks, blue for player attacks
- Include damage number at arrow tip or on target tile

### 2.2 Enhanced Telegraph Phase Display

During TELEGRAPH phase, show complete enemy intent:

| Element | Display |
|---------|---------|
| Attack Target | Red box around target tile |
| Attack Arrow | Line from enemy to target |
| Damage Amount | Number on target tile (e.g., "-8") |
| Attack Type | Icon: sword for light, hammer for heavy |

**New Telegraph Data Structure:**
```gdscript
var telegraph_info := {
    "source_pos": Vector2i,
    "target_pos": Vector2i,
    "damage": int,
    "action_type": Constants.CombatActionType,
    "is_kill": bool  # true if this would kill target
}
```

---

## Phase 3: Execution Order Display

### 3.1 Action Order Panel

Add persistent panel showing execution order (like ITB's Attack Order button).

```
┌── EXECUTION ORDER ──┐
│ 1. [►] Player Move  │  ← Priority 0 (moves first)
│ 2. [⚔] Enemy Light  │  ← Priority 1
│ 3. [⚔] Player Light │  ← Priority 1 (simultaneous)
│ 4. [⚒] Player Heavy │  ← Priority 3
└─────────────────────┘
```

**Implementation:**
- New UI panel: `ExecutionOrderPanel`
- Collect all queued actions from both combatants
- Sort by priority
- Display with icons and source name
- Highlight current action during RESOLUTION phase

### 3.2 Resolution Phase Step-by-Step

During RESOLUTION, animate each action with pause between:

1. Highlight current action in order panel
2. Show arrow/effect on grid
3. Apply damage with number popup
4. Update health segments
5. Brief pause (0.3-0.5s)
6. Next action

**Timing Constants:**
```gdscript
const RESOLUTION_STEP_DELAY := 0.4  # Pause between actions
const DAMAGE_NUMBER_DURATION := 0.8  # How long damage popup shows
const HEALTH_FLASH_DURATION := 0.2   # Health bar flash on damage
```

---

## Phase 4: Damage Number Popups

### 4.1 Floating Damage Numbers

When damage is dealt, show floating number that rises and fades.

```
     -12        ← Starts here
      ↑
     -12        ← Floats up
      ↑
    (fades)     ← Fades out
```

**Implementation:**
- Create `DamagePopup` scene
- Spawn at target tile center
- Tween: move up 30px over 0.5s
- Tween: fade alpha 1.0 → 0.0 over 0.5s
- Color: Red for damage, Green for healing
- Font: Bold, size 24-32

### 4.2 Damage Types Visual Distinction

| Damage Type | Color | Additional |
|-------------|-------|------------|
| Normal | White/Red | - |
| Critical | Yellow | Larger size, "!" suffix |
| Blocked | Gray | Strikethrough |
| Healing | Green | "+" prefix |

---

## Phase 5: Hover Tooltips

### 5.1 Tile Hover Information

On hover, show contextual tooltip:

**Empty Tile:**
```
┌─────────────────┐
│ Empty           │
│ Can move here   │
└─────────────────┘
```

**Enemy Tile:**
```
┌─────────────────────┐
│ Goblin Warrior      │
│ HP: 24/30           │
│ ──────────────────  │
│ Intent: Light Atk   │
│ Target: Player      │
│ Damage: 8           │
└─────────────────────┘
```

**Player Tile:**
```
┌─────────────────────┐
│ Player              │
│ HP: 45/100          │
│ ──────────────────  │
│ Queued: 2 actions   │
│ Incoming: -8 damage │
└─────────────────────┘
```

**Implementation:**
- Create `TileTooltip` scene (PanelContainer with Labels)
- Position near mouse, avoid screen edges
- Show on hover after 0.3s delay
- Hide immediately on mouse exit

---

## Phase 6: Player Action Preview

### 6.1 Movement Path Visualization

When player queues moves, show predicted path:

```
┌───┐ ┌───┐ ┌───┐
│ P │→│ 1 │→│ 2 │  ← Numbers show move order
└───┘ └───┘ └───┘
  ↓
┌───┐
│ 3 │  ← Final position after all moves
└───┘
```

**Implementation:**
- Track all queued move actions
- Draw path line connecting positions
- Number each step
- Show "ghost" player at final position (semi-transparent)

### 6.2 Attack Range Overlay

When in attack range of enemy from predicted position:

```
┌───┐ ┌───┐ ┌───┐
│   │ │ X │ │   │  ← X marks attackable tiles
├───┼─┼───┼─┼───┤
│ X │ │ E │ │ X │  ← Enemy in center
├───┼─┼───┼─┼───┤
│   │ │ X │ │   │
└───┘ └───┘ └───┘
```

**Implementation:**
- Calculate attack range from predicted position
- Highlight tiles in range with attack color
- Show damage preview on enemy if in range

---

## Phase 7: Animation Polish

### 7.1 Tile Pulse Animation

During TELEGRAPH phase, attacked tiles should pulse:

```gdscript
func _pulse_tile(tile: PanelContainer) -> void:
    var tween := create_tween()
    tween.set_loops()  # Infinite loop
    tween.tween_property(tile, "modulate", Color(1.2, 0.8, 0.8), 0.3)
    tween.tween_property(tile, "modulate", Color.WHITE, 0.3)
```

### 7.2 Entity Shake on Damage

When entity takes damage, brief shake animation:

```gdscript
func _shake_tile(tile: PanelContainer) -> void:
    var original_pos := tile.position
    var tween := create_tween()
    for i in range(3):
        tween.tween_property(tile, "position", original_pos + Vector2(4, 0), 0.05)
        tween.tween_property(tile, "position", original_pos - Vector2(4, 0), 0.05)
    tween.tween_property(tile, "position", original_pos, 0.05)
```

### 7.3 Action Icon Flash

When action executes, flash the corresponding icon:

- Move: Footprint icon flashes
- Light Attack: Sword icon flashes
- Heavy Attack: Hammer icon flashes

---

## Implementation Priority Order

### High Priority (Core Clarity)
1. **Segmented Health Display** - Replace text HP with visual segments
2. **Damage Preview Numbers** - Show "-X" on tiles that will be hit
3. **Attack Direction Arrows** - Show where attacks are going
4. **Floating Damage Popups** - Feedback when damage occurs

### Medium Priority (Enhanced Feedback)
5. **Execution Order Panel** - Show action sequence
6. **Tile Hover Tooltips** - Detailed info on hover
7. **Movement Path Preview** - Show queued move path
8. **Telegraph Pulse Animation** - Attacked tiles pulse

### Lower Priority (Polish)
9. **Entity Shake Animation** - Shake on damage
10. **Ghost Player Preview** - Show final position
11. **Action Icon Integration** - Icons for action types
12. **Sound Feedback** - Audio cues for actions

---

## File Structure for New Components

```
scenes/ui/combat/
├── combat_arena_overlay.tscn  (existing)
├── combat_arena_overlay.gd    (existing - modify)
├── components/
│   ├── health_segment_display.tscn
│   ├── health_segment_display.gd
│   ├── damage_popup.tscn
│   ├── damage_popup.gd
│   ├── attack_arrow.tscn
│   ├── attack_arrow.gd
│   ├── tile_tooltip.tscn
│   ├── tile_tooltip.gd
│   ├── execution_order_panel.tscn
│   └── execution_order_panel.gd
```

---

## Color Palette Reference

| Element | Color | Hex |
|---------|-------|-----|
| Player HP Segment (filled) | Green | `#4CAF50` |
| Player HP Segment (empty) | Dark Gray | `#424242` |
| Enemy HP Segment (filled) | Red | `#F44336` |
| Enemy HP Segment (empty) | Dark Gray | `#424242` |
| Damage Number | Red | `#FF5252` |
| Healing Number | Green | `#69F0AE` |
| Critical Hit | Yellow | `#FFD740` |
| Telegraph Background | Orange | `#FF9800` |
| Attack Arrow (enemy) | Red/Orange | `#FF5722` |
| Attack Arrow (player) | Blue | `#2196F3` |
| Move Highlight | Green | `#81C784` |
| Attack Range Highlight | Red | `#E57373` |

---

## Key Design Principles

1. **Show, Don't Tell** - Animated previews over text descriptions
2. **No Hidden Information** - All combat data visible at glance
3. **Consistent Color Language** - Same colors mean same things
4. **Immediate Feedback** - Every action has visual response
5. **Scannable at a Glance** - Health bars, not HP numbers
6. **Predictable Outcomes** - Player knows result before confirming
