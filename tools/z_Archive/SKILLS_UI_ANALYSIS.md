# Skills UI System - Comprehensive Analysis

> **Purpose:** This document provides a detailed analysis of the current Skills UI implementation and identifies all changes needed to align with the updated skill system (3 proficiencies, no expertise, level 30 cap).

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Current Pentagon Radar Chart](#2-current-pentagon-radar-chart)
3. [Proficiency Tabs System](#3-proficiency-tabs-system)
4. [Specialty Details Panel](#4-specialty-details-panel)
5. [Action Bar HUD](#5-action-bar-hud)
6. [State Management](#6-state-management)
7. [Click Handling & Interaction](#7-click-handling--interaction)
8. [Color System](#8-color-system)
9. [Required Changes Summary](#9-required-changes-summary)
10. [Code Reference Tables](#10-code-reference-tables)
11. [Design Considerations](#11-design-considerations)
12. [Critical Data Inconsistency](#12-critical-data-inconsistency)

---

## 1. File Overview

### Primary Files

| File | Lines | Purpose |
|------|-------|---------|
| `js/ui/skills-ui.js` | ~1,400 | Main skills overlay, pentagon radar, specialty details |
| `js/ui/action-bar-ui.js` | ~1,515 | Action bar with weapon action slots |
| `js/ui/icon-sidebar.js` | ~996 | Skills icon (K hotkey), toggle logic |
| `js/ui/character-overlay.js` | ~759 | Character panel (references skills) |
| `js/systems/input-handler.js` | - | K key and ESC handlers |
| `js/ui/renderer.js` | - | Calls drawSkillsOverlay() when game.state === 'skills' |

### Entry Points

- **K key** → Opens skills overlay (input-handler.js line 210-213)
- **ESC key** → Closes skills overlay (input-handler.js lines 43-48)
- **Sidebar click** → toggleSidebarOverlay('skills') (icon-sidebar.js line 894)
- **Renderer** → drawSkillsOverlay() called when game.state === 'skills' (renderer.js line 1305)

---

## 2. Current Pentagon Radar Chart

### Configuration (skills-ui.js lines 33-50)

```javascript
SKILLS_UI_CONFIG = {
    proficiencies: {
        melee:    { icon: 'M', name: 'MELEE',    angle: -90,  color: '#c0392b' },
        ranged:   { icon: 'R', name: 'RANGED',   angle: -18,  color: '#27ae60' },
        magic:    { icon: 'A', name: 'MAGIC',    angle: 54,   color: '#9b59b6' },
        defense:  { icon: 'D', name: 'DEFENSE',  angle: 126,  color: '#3498db' },  // REMOVE
        vitality: { icon: 'V', name: 'VITALITY', angle: 198,  color: '#e74c3c' }   // REMOVE
    },
    radar: {
        radius: 120,          // REDUCE TO 105 (triangle feels larger than pentagon)
        maxLevel: 100,        // CHANGE TO 30
        rings: 4,             // CHANGE TO 3 (each ring = level 10, clean intervals)
        iconOffset: 30,
        glowIntensity: 0.8,
        pulseSpeed: 0.003
    }
}
```

### Pentagon Drawing Functions

| Function | Lines | Purpose | Changes Needed |
|----------|-------|---------|----------------|
| `drawPentagonRadar()` | 516-548 | Main radar coordinator | Change to triangle |
| `drawRuneBackground()` | 586-667 | Rotating magic circle | Update symmetry for 3 points |
| `drawRadarGrid()` | 672-774 | Pentagon rings & radial lines | Change to triangle grid |
| `drawPlayerPolygon()` | 780-847 | Filled skill polygon | Change to 3 vertices |
| `drawVertexGemSockets()` | 852-919 | Corner icons with levels | Reduce to 3 vertices |

### Current Angle Layout (Pentagon)

```
                 MELEE (-90°)
                     ●
                   /   \
                 /       \
    VITALITY   ●           ● RANGED
    (198°)    /             \ (-18°)
             /               \
            ●─────────────────●
        DEFENSE (126°)    MAGIC (54°)
```

### New Angle Layout (Triangle)

```
                 MELEE (-90°)
                     ●
                   /   \
                 /       \
               /           \
             /               \
            ●─────────────────●
        MAGIC (150°)      RANGED (30°)
```

**New Angles (standardized):**
- Melee: -90° (top)
- Ranged: 30° (bottom-right)
- Magic: 150° (bottom-left)

---

## 3. Proficiency Tabs System

### Current Implementation (skills-ui.js lines 925-1025)

**Function:** `drawProficiencyTabs()`

**Current Layout:** 5 horizontal tabs
```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  MELEE  │ RANGED  │  MAGIC  │ DEFENSE │VITALITY │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

**Tab Styling:**
- **Selected Tab:** Dark red gradient, white border (2px), rounded top corners
- **Unselected Tab:** Black 30% opacity, thin border (#3a3a4a), full rounded

**Tab Click Areas:** Stored in `window.skillsUITabAreas`

### Changes Needed

**New Layout:** 3 horizontal tabs (wider)
```
┌──────────────┬──────────────┬──────────────┐
│    MELEE     │    RANGED    │    MAGIC     │
└──────────────┴──────────────┴──────────────┘
```

**Code Changes (lines 939-1020):**
1. Loop through only 3 proficiencies instead of 5
2. Adjust tab width calculation: `tabWidth = contentWidth / 3` (was `/5`)
3. Remove defense and vitality from iteration

---

## 4. Specialty Details Panel

### Current Implementation (skills-ui.js lines 1030-1138)

**Function:** `drawSpecialtyDetails()`

**Components:**
1. **Header** (lines 1038-1052): Proficiency name + XP bar
2. **Specialty Rows** (lines 1056-1135): List of specialties under selected proficiency

**Specialty Row Content:**
- Specialty name and lock status
- Level badge: `Lv {level}`
- XP progress bar (120px wide)
- If level ≥ 5: Action icon, name, status (READY/cooldown)
- If locked: Lock icon (🔒), unlock hint

### Changes Needed

1. **Remove Expertise Specialties:**
   - traps, potions, lockpicking, tinkering will no longer appear
   - `getSpecialtiesForProficiency()` (lines 1242-1251) needs update

2. **Update XP Display:**
   - Max level now 30 (was 100)
   - XP curve changed (piecewise formula)

3. **Helper Function Update:**
   - `getSpecialtyUnlockBonus()` (lines 1257-1285) - remove expertise entries

---

## 5. Action Bar HUD

### Expertise Action Bar (skills-ui.js lines 76-160)

**Function:** `drawActionBar()`

**Current Purpose:** Renders slots 6-9 for expertise skills (traps, potions, lockpicking, tinkering)

**Location:** Right side of screen, integrated with unified action bar

### Changes Needed

**REMOVE ENTIRELY** - Expertise skills no longer exist.

The action bar now only contains:
- Slot 0: Dash (Space)
- Slot 1: Weapon Action Main (Q)
- Slot 2: Weapon Action Off (E)
- Slot 3: Consumable (1)

These are handled by `action-bar-ui.js` (already updated).

### Functions to Remove/Disable

| Function | Lines | Action |
|----------|-------|--------|
| `drawActionBar()` | 76-160 | Remove or disable |
| `drawSkillActionSlot()` | 204-341 | Remove or disable |
| `drawSkillCooldownSweep()` | 346-396 | Remove (cooldown handled in action-bar-ui.js) |

---

## 6. State Management

### Global State Objects (skills-ui.js lines 54-65)

```javascript
window.skillsUIState = {
    pulsePhase: 0,                    // Animation counter
    selectedProficiency: null,        // 'melee', 'ranged', 'magic' (was also 'defense', 'vitality')
    hoverVertex: null,                // Currently hovered vertex
    animationValues: {}               // Smooth transitions
};

window.skillsBarState = {
    pulsePhase: 0,
    hoveredSlot: null                 // REMOVE (expertise bar removed)
};
```

### Click Area Storage

```javascript
window.skillsUIVertexAreas = {
    melee: { x, y, radius },
    ranged: { x, y, radius },
    magic: { x, y, radius },
    defense: { x, y, radius },        // REMOVE
    vitality: { x, y, radius }        // REMOVE
};

window.skillsUITabAreas = {
    melee: { x, y, width, height },
    ranged: { x, y, width, height },
    magic: { x, y, width, height },
    defense: { x, y, width, height }, // REMOVE
    vitality: { x, y, width, height } // REMOVE
};
```

---

## 7. Click Handling & Interaction

### Click Handler (skills-ui.js lines 1209-1236)

**Function:** `handleSkillsOverlayClick(mouseX, mouseY)`

**Logic Flow:**
1. Check vertex areas (pentagon corners → triangle corners)
2. Check tab areas (5 tabs → 3 tabs)
3. Set `window.skillsUIState.selectedProficiency`

### Changes Needed

1. Only check 3 vertices instead of 5
2. Only check 3 tabs instead of 5
3. Remove defense/vitality from valid selections

---

## 8. Color System

### Proficiency Colors

| Proficiency | Color | Hex | Status |
|-------------|-------|-----|--------|
| Melee | Deep Crimson | #c0392b | Keep |
| Ranged | Jade | #27ae60 | Keep |
| Magic | Occult Purple | #9b59b6 | Keep |
| Defense | Sky Blue | #3498db | **REMOVE** |
| Vitality | Orange-Red | #e74c3c | **REMOVE** |

### UI State Colors

| State | Color | Hex | Usage |
|-------|-------|-----|-------|
| Ready | Jade | #5da182 | Skill ready glow, "READY" text |
| Cooldown | Ember Orange | #d4852a | Cooldown border, timer text |
| Gold | Antiqued Gold | #c9a227 | Section headers, special text |
| Text Primary | Parchment | #efe4b0 | Main text, labels |
| Text Muted | Faded Ink | #706850 | Locked specialties, hints |
| Locked | Gray | #444444 | Disabled elements |

---

## 9. Required Changes Summary

### Critical Changes

| Area | Current | New | Priority |
|------|---------|-----|----------|
| Pentagon vertices | 5 | 3 (triangle) | HIGH |
| Proficiency tabs | 5 | 3 | HIGH |
| Radar maxLevel | 100 | 30 | HIGH |
| Radar rings | 4 | 3 (level 10 intervals) | HIGH |
| Radar radius | 120 | 105 (test) | MEDIUM |
| Specialty mappings | Outdated | Fix to match skill-system.js | HIGH |
| Expertise action bar | Present | Remove | HIGH |
| skillsBarState | Present | Remove | MEDIUM |
| Rune background | 5-fold symmetry | 6-fold hex or volcanic | MEDIUM |
| Hover radius | socketRadius + 5 | socketRadius + 8 | LOW |

### Configuration Updates

**SKILLS_UI_CONFIG.proficiencies (lines 33-40):**
```javascript
// NEW (triangle)
proficiencies: {
    melee:  { icon: 'M', name: 'MELEE',  angle: -90,  color: '#c0392b' },
    ranged: { icon: 'R', name: 'RANGED', angle: 30,   color: '#27ae60' },
    magic:  { icon: 'A', name: 'MAGIC',  angle: 150,  color: '#9b59b6' }
}
```

**SKILLS_UI_CONFIG.radar (lines 42-50):**
```javascript
radar: {
    radius: 105,         // Reduced from 120 (triangle feels larger)
    maxLevel: 30,        // Changed from 100
    rings: 3,            // Changed from 4 (each ring = level 10)
    iconOffset: 30,
    glowIntensity: 0.8,
    pulseSpeed: 0.003
}
```

### Functions to Modify

| Function | File | Lines | Changes |
|----------|------|-------|---------|
| `drawPentagonRadar()` | skills-ui.js | 516-548 | Rename to drawTriangleRadar, 3 vertices |
| `drawRuneBackground()` | skills-ui.js | 586-667 | Update symmetry (see Design Considerations) |
| `drawRadarGrid()` | skills-ui.js | 672-774 | Draw triangles instead of pentagons |
| `drawPlayerPolygon()` | skills-ui.js | 780-847 | 3 vertices, new angle math |
| `drawVertexGemSockets()` | skills-ui.js | 852-919 | 3 vertices only, adjust hover radius |
| `drawProficiencyTabs()` | skills-ui.js | 925-1025 | 3 tabs, wider width |
| `handleSkillsOverlayClick()` | skills-ui.js | 1209-1236 | 3 vertices/tabs only |
| `getSpecialtiesForProficiency()` | skills-ui.js | 1242-1251 | Fix mapping (see Critical Data Inconsistency) |
| `getSpecialtyUnlockBonus()` | skills-ui.js | 1259-1285 | Remove expertise entries |
| `getActionForSpecialtyById()` | skills-ui.js | 1287-1322 | Remove expertise entries from actionMap |

### Functions to Remove

| Function | File | Lines | Reason |
|----------|------|-------|--------|
| `drawActionBar()` | skills-ui.js | 76-160 | Expertise removed |
| `drawSkillActionSlot()` | skills-ui.js | 204-341 | Expertise removed |
| `drawSkillCooldownSweep()` | skills-ui.js | 346-396 | Handled by action-bar-ui.js |

### State Objects to Update

| Object | Change |
|--------|--------|
| `window.skillsUIVertexAreas` | Remove defense, vitality |
| `window.skillsUITabAreas` | Remove defense, vitality |
| `window.skillsBarState` | Remove entirely |
| `SKILLS_UI_CONFIG.actionIcons` | Remove ST, VF, EW, DT |

---

## 10. Code Reference Tables

### Key Functions & Line Numbers

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `drawSkillsOverlay()` | skills-ui.js | 405-512 | Main entry point |
| `drawPentagonRadar()` | skills-ui.js | 516-548 | Pentagon coordinator |
| `drawRuneBackground()` | skills-ui.js | 586-667 | Background decoration |
| `drawRadarGrid()` | skills-ui.js | 672-774 | Grid lines |
| `drawPlayerPolygon()` | skills-ui.js | 780-847 | Filled polygon |
| `drawVertexGemSockets()` | skills-ui.js | 852-919 | Vertex icons |
| `drawProficiencyTabs()` | skills-ui.js | 925-1025 | Tab rendering |
| `drawSpecialtyDetails()` | skills-ui.js | 1030-1138 | Specialty list |
| `drawSkillXPBar()` | skills-ui.js | 1143-1168 | XP progress bars |
| `handleSkillsOverlayClick()` | skills-ui.js | 1209-1236 | Click handling |
| `getSpecialtiesForProficiency()` | skills-ui.js | 1242-1251 | Specialty lookup |
| `getActionForSpecialtyById()` | skills-ui.js | 1287-1319 | Action lookup |
| `toggleSidebarOverlay()` | icon-sidebar.js | 904-939 | Open/close panel |

### Integration Points

| File | Line | Integration |
|------|------|-------------|
| renderer.js | 1305 | Calls `drawSkillsOverlay()` |
| input-handler.js | 210-213 | K key opens skills |
| input-handler.js | 43-48 | ESC closes skills |
| input-handler.js | 579-585 | Calls `handleSkillsOverlayClick()` |
| icon-sidebar.js | 72-102 | Skills icon definition |
| character-overlay.js | 417-419 | "[K] Skills" hint (confirmed clean, no orphaned defense/vitality refs) |

---

## 11. Design Considerations

### Radar Rings: 4 → 3 (Recommended)

With maxLevel dropping to 30, using 3 rings creates clean, intuitive intervals:
- Ring 1: Level 10
- Ring 2: Level 20
- Ring 3: Level 30

Four rings would give 7.5-level increments, which feels arbitrary. The triangle geometry also benefits from fewer concentric shapes since triangles already have sharper visual noise than pentagons.

### Radar Radius: 120 → 105 (Suggested)

With only 3 vertices, the triangle will feel visually larger and more dominant than the pentagon did, even at the same radius. Consider reducing to ~105 so it doesn't overwhelm the panel, especially since the specialty details below now have fewer rows to fill (for Ranged especially).

Alternative: Lean into it — a bigger, bolder triangle could feel more impactful with the simplified system. Test both approaches.

### Rune Background Symmetry

**Problem:** A pentagon has natural 5-fold rotational symmetry that reads as "arcane." Three-fold symmetry (triangle) can read more like a hazard symbol or a triforce — potentially losing the mystical feel.

**Recommended Solutions:**

1. **6-fold hex symmetry** — Use hexagonal/crystalline patterns behind the triangle. This maintains visual complexity while being geometrically distinct. Ties into the volcanic/geological theme (crystal formations).

2. **Keep circle-based elements** — Retain the rotating magic circle but align accent lines (radial spokes, runes) to the triangle's 3 vertices instead of 5. The circular frame softens the triangle's sharpness.

3. **Volcanic flair** — Incorporate volcanic imagery: magma cracks, ember particles, heat distortion. Less reliant on pure geometry.

### Specialty Row Layout: Density Variance

**Specialty counts per proficiency (from skill-system.js):**

| Proficiency | Specialties | Count |
|-------------|-------------|-------|
| Melee | sword, knife, axe, polearm, mace, staff, unarmed, shield | 8 |
| Magic | fire, ice, lightning, necromancy, water, earth, nature, dark, holy, arcane, death | 11 |
| Ranged | bow, crossbow, throwing | 3 |

**Problem:** Ranged with only 3 specialties will feel sparse compared to Magic with 11.

**Solutions:**

1. **More vertical space per row** when fewer specialties — dynamic row height
2. **Add detail per row** — mini description, unlock requirements, or current bonus values
3. **Show weapon actions more prominently** for Ranged since they're high-value
4. **Visual balance** — center the 3 Ranged rows vertically in the panel

### Animation & Hover Radius Tuning

With vertices further apart on a triangle (120° separation vs 72° on pentagon), the hover detection zones in `drawVertexGemSockets()` may need adjustment:

- **Current:** `socketRadius + 5` for click detection
- **Consider:** Increase to `socketRadius + 8` or `+ 10` for easier targeting
- **Pulse/glow logic:** May need different intensity since vertices are more isolated

---

## 12. Critical Data Inconsistency

### Problem: skills-ui.js vs skill-system.js Mismatch

The `getSpecialtiesForProficiency()` function in skills-ui.js (lines 1242-1253) has **outdated mappings** that don't match the updated skill-system.js:

**Current skills-ui.js mapping (WRONG):**
```javascript
const mapping = {
    melee: ['sword', 'dagger', 'polearm'],
    ranged: ['bow'],
    magic: ['fire', 'ice', 'lightning', 'necromancy', 'staff'],
    defense: ['mace', 'unarmed', 'shield'],        // DEFENSE REMOVED
    vitality: ['traps', 'potions', 'lockpicking', 'tinkering']  // VITALITY REMOVED
};
```

**Correct mapping (from skill-system.js):**
```javascript
const mapping = {
    melee: ['sword', 'knife', 'axe', 'polearm', 'mace', 'staff', 'unarmed', 'shield'],
    ranged: ['bow', 'crossbow', 'throwing'],
    magic: ['fire', 'ice', 'lightning', 'necromancy', 'water', 'earth', 'nature', 'dark', 'holy', 'arcane', 'death']
};
```

### Issues to Fix

1. **getSpecialtiesForProficiency()** (lines 1242-1253):
   - Remove defense and vitality entries
   - Add all 8 melee specialties
   - Add crossbow and throwing to ranged
   - Add water, earth, nature, dark, holy, arcane, death to magic
   - Remove 'dagger' → should be 'knife'

2. **getSpecialtyUnlockBonus()** (lines 1259-1285):
   - Add entries for: knife, axe, crossbow, throwing, water, earth, nature, dark, holy, arcane, death
   - Remove: traps, potions, lockpicking, tinkering
   - Fix 'dagger' → 'knife'

3. **getActionForSpecialtyById()** (lines 1287-1322):
   - Add entries for: knife (arterial_strike), axe (cleaving_blow), crossbow (piercing_bolt), throwing (fan_of_knives)
   - Remove: traps, potions, lockpicking, tinkering entries
   - Fix 'dagger' → 'knife', update action from 'backstab' to 'arterial_strike'
   - Note: water, earth, nature, dark, holy, arcane, death have NO actions (passive bonuses only)

---

## Appendix: Visual Reference

### Current Pentagon Layout
```
              M (Melee)
               ●
             / | \
           /   |   \
         /     |     \
       V       |       R
        ●      |      ●
         \     |     /
          \    |    /
           \   |   /
            D──●──A
```

### New Triangle Layout
```
              M (Melee)
               ●
              /|\
             / | \
            /  |  \
           /   |   \
          /    |    \
         /     |     \
        ●──────●──────●
       A              R
    (Magic)       (Ranged)
```

### Triangle Angle Math

```javascript
// For equilateral triangle centered at origin:
const vertices = [
    { id: 'melee',  angle: -90 },   // Top
    { id: 'ranged', angle: 30 },    // Bottom-right (120° from top)
    { id: 'magic',  angle: 150 }    // Bottom-left (240° from top)
];

// Convert to coordinates:
function getVertexPosition(angle, radius, centerX, centerY) {
    const radians = angle * Math.PI / 180;
    return {
        x: centerX + radius * Math.cos(radians),
        y: centerY + radius * Math.sin(radians)
    };
}
```

### Specialty Distribution Visualization

```
MELEE (8 specialties)          MAGIC (11 specialties)         RANGED (3 specialties)
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│ Sword      Lv 12 │           │ Fire       Lv  8 │           │ Bow        Lv 15 │
│ Knife      Lv  7 │           │ Ice        Lv  5 │           │ Crossbow   Lv  3 │
│ Axe        Lv  4 │           │ Lightning  Lv 10 │           │ Throwing   Lv  0 │
│ Polearm    Lv  0 │           │ Necromancy Lv  2 │           │                  │
│ Mace       Lv  3 │           │ Water      Lv  0 │           │   (sparse - add  │
│ Staff      Lv  0 │           │ Earth      Lv  0 │           │    more detail   │
│ Unarmed    Lv  1 │           │ Nature     Lv  0 │           │    per row)      │
│ Shield     Lv  6 │           │ Dark       Lv  0 │           │                  │
│                  │           │ Holy       Lv  0 │           │                  │
│                  │           │ Arcane     Lv  0 │           │                  │
│                  │           │ Death      Lv  0 │           │                  │
└──────────────────┘           └──────────────────┘           └──────────────────┘
```

---

*Analysis generated from codebase exploration. All line numbers reference the current state of the files.*
