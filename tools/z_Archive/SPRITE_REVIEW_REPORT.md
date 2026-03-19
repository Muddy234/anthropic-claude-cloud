# Monster Sprite Review Report
## The Shifting Chasm - Visual Quality Assessment

**Review Date:** February 2026
**Sprites Reviewed:** 27 monsters
**Reference:** docs/MONSTER_VISUAL_DESIGN_GUIDE.md

---

## Executive Summary

### Overall Assessment: NEEDS SIGNIFICANT IMPROVEMENT

The current monster sprites were auto-converted from 1024x1024 source images using color quantization. While the conversion process produced valid sprite data, **most sprites fail to meet the visual standards** outlined in the Monster Visual Design Guide. Key issues include:

1. **Insufficient color counts** - Many sprites have 3-8 colors instead of the required 10-16
2. **Missing essential features** - Eyes are absent on nearly all sprites
3. **No glowing/magical effects** - Fire, ice, and soul effects are missing
4. **Border artifacts** - Some sprites have visible gray borders
5. **Poor canvas utilization** - Several sprites are too small or poorly positioned
6. **No black outlines** - Physical creatures lack proper black outlines
7. **Missing hue shifting** - Shadows are just darker, not hue-shifted

### Threat Level: NOT THREATENING

Most sprites look like placeholder art rather than deadly dungeon monsters. The lack of glowing eyes, menacing features, and dynamic poses makes them feel passive rather than dangerous.

---

## Color Count Analysis

### Guide Requirement: 10-16 colors per sprite

| Sprite | Colors | Status | Issue |
|--------|--------|--------|-------|
| Toxic Slime | 4 | FAIL | Far too few, looks flat |
| Shadow Wisp | 3 | FAIL | Extremely minimal |
| Phantom | 4 | FAIL | Lacks depth |
| Frost Elemental | 4 | FAIL | No variation |
| Pyro Cultist | 4 | FAIL | All very dark reds |
| Tide Serpent | 5 | FAIL | Needs more tones |
| Shadow Imp | 6 | FAIL | Missing accents |
| Shadow Stalker | 6 | FAIL | Needs eye/claw colors |
| Mushroom Sprite | 7 | FAIL | Close but flat |
| Shield Bearer | 7 | FAIL | Monochrome grays |
| Cave Bat | 3 | FAIL | Extremely minimal |
| Fire Bat | 7 | BORDERLINE | Needs fire colors |
| Magma Slime | 8 | BORDERLINE | Good fire gradient |
| Frost Slime | 8 | BORDERLINE | Good ice palette |
| Ice Golem | 8 | BORDERLINE | Decent ice tones |
| Obsidian Golem | 8 | BORDERLINE | Missing fire veins |
| Stone Golem | 8 | BORDERLINE | Missing glow accents |
| Crystal Golem | 8 | BORDERLINE | Needs more contrast |
| Giant Spider | 8 | BORDERLINE | Missing eye colors |
| Salamander | 8 | BORDERLINE | Decent fire tones |
| Deep Crawler | 8 | BORDERLINE | Needs eye stalks |
| Frozen Husk | 8 | BORDERLINE | Missing glow |
| Temple Sentinel | 8 | BORDERLINE | Has gold, needs glow |
| Void Touched | 8 | BORDERLINE | Good purple range |
| Ash Walker | 9 | PASS | Has eye color (#A7C44F) |
| Bone Golem | 9 | BORDERLINE | Missing soul glow |

**Summary:** Only 1 sprite (Ash Walker) meets color requirements with accent colors for eyes.

---

## Individual Sprite Reviews

### SLIME CLASS

#### Magma Slime
**Colors:** 8 | **Rating:** 5/10 | **Deadly Factor:** LOW

**Strengths:**
- Good orange-red fire palette with proper gradient
- Drip shapes present at base
- Fills canvas reasonably well

**Critical Issues:**
- **NO VISIBLE EYES** - Essential feature missing
- No distinct yellow eye dots
- Highlight band present but eyes should be priority
- No sel-out outline (should have dark red-brown outline)

**Guide Compliance:**
- Essential 1 (gradient body): PARTIAL
- Essential 2 (yellow dot eyes): FAIL
- Essential 3 (lava drips): PASS

**Fix Priority:** HIGH - Add bright yellow eye dots

---

#### Frost Slime
**Colors:** 8 | **Rating:** 5/10 | **Deadly Factor:** LOW

**Strengths:**
- Good ice blue palette
- Angular elements suggest crystalline quality
- Decent ice color gradient

**Critical Issues:**
- **NO VISIBLE EYES** - Essential feature missing
- No cyan/white dot eyes
- Crystalline spikes not clearly defined
- Irregular blob shape, unclear silhouette

**Guide Compliance:**
- Essential 1 (ice palette body): PASS
- Essential 2 (cyan/white eyes): FAIL
- Essential 3 (crystalline spikes): PARTIAL

**Fix Priority:** HIGH - Add bright cyan eye dots, define spikes

---

#### Toxic Slime
**Colors:** 4 | **Rating:** 3/10 | **Deadly Factor:** VERY LOW

**Strengths:**
- Correct yellow-green toxic palette
- Basic blob shape present

**Critical Issues:**
- **ONLY 4 COLORS** - Far below 10-16 requirement
- **NO VISIBLE EYES** - Essential feature missing
- No acid drip shapes visible
- Lacks toxic bubbles or internal detail
- Feels flat and non-threatening

**Guide Compliance:**
- Essential 1 (yellow-green gradient): PARTIAL (too few colors)
- Essential 2 (glowing toxic eyes): FAIL
- Essential 3 (acid drips): FAIL

**Fix Priority:** CRITICAL - Add 6+ colors, bright eyes, drip effects

---

### GOLEM CLASS

#### Obsidian Golem
**Colors:** 8 | **Rating:** 4/10 | **Deadly Factor:** LOW

**Strengths:**
- Humanoid silhouette present
- Fills canvas reasonably

**Critical Issues:**
- **NO GLOWING ORANGE CRACKS** - This is THE essential feature
- Palette is brown/tan instead of dark gray/black with fire
- No ember eyes visible
- No molten core glow
- Doesn't feel volcanic at all

**Guide Compliance:**
- Essential 1 (massive blocky silhouette): PARTIAL
- Essential 2 (glowing orange crack lines): FAIL
- Essential 3 (ember eyes): FAIL

**Fix Priority:** CRITICAL - Needs complete palette overhaul, add fire veins

---

#### Stone Golem (Stone Guardian)
**Colors:** 8 | **Rating:** 5/10 | **Deadly Factor:** LOW

**Strengths:**
- Good earth/stone palette
- Blocky humanoid shape
- Fills canvas well

**Critical Issues:**
- **NO GLOWING EYES** - Essential feature missing
- No ancient rune carvings visible
- Missing weathering/moss detail
- Lacks menacing presence

**Guide Compliance:**
- Essential 1 (weathered stone body): PASS
- Essential 2 (glowing eyes): FAIL
- Essential 3 (rune carvings): FAIL

**Fix Priority:** HIGH - Add glowing yellow/cyan eyes, rune marks

---

#### Ice Golem
**Colors:** 8 | **Rating:** 5/10 | **Deadly Factor:** LOW

**Strengths:**
- Good ice palette with cyan-white tones
- Some angular shapes present
- Decent size

**Critical Issues:**
- **NO VISIBLE EYES** - Essential feature missing
- Angular/faceted body not clearly defined
- No internal blue glow core
- Shape is somewhat unclear

**Guide Compliance:**
- Essential 1 (faceted ice body): PARTIAL
- Essential 2 (internal blue glow): FAIL
- Essential 3 (bright cyan eyes): FAIL

**Fix Priority:** HIGH - Add bright eye colors, define facets

---

#### Crystal Golem
**Colors:** 8 | **Rating:** 6/10 | **Deadly Factor:** LOW

**Strengths:**
- Good purple/pink crystal palette
- Some faceted appearance
- Light refraction implied

**Critical Issues:**
- **NO VISIBLE EYES** - Essential feature missing
- White core glow not bright enough
- Floating crystal shards not present
- Needs more contrast

**Guide Compliance:**
- Essential 1 (multifaceted body): PASS
- Essential 2 (bright white core): PARTIAL
- Essential 3 (light refraction): PARTIAL

**Fix Priority:** MEDIUM - Add contrasting eye/glow colors

---

#### Bone Golem
**Colors:** 9 | **Rating:** 5/10 | **Deadly Factor:** LOW

**Strengths:**
- Good bone/undead palette
- Large silhouette
- Some skull shapes implied

**Critical Issues:**
- **NO SOUL GLOW CORE** - Essential feature missing
- Multiple skulls not clearly visible
- Missing green/yellow glow in chest
- Feels like a muddy blob

**Guide Compliance:**
- Essential 1 (massive bone silhouette): PARTIAL
- Essential 2 (multiple skulls): PARTIAL (unclear)
- Essential 3 (glowing soul core): FAIL

**Fix Priority:** HIGH - Add bright green/yellow glow colors

---

### SPIRIT CLASS

#### Frost Elemental
**Colors:** 4 | **Rating:** 3/10 | **Deadly Factor:** VERY LOW

**Strengths:**
- Wispy, ethereal appearance
- No hard outline (correct for ethereal)
- Scattered edge pixels

**Critical Issues:**
- **ONLY 4 COLORS** - Far too few
- All colors are very similar light blues
- **NO VISIBLE EYES** - Should have bright white eyes
- No defined central form
- Looks like a blue smudge

**Guide Compliance:**
- Essential 1 (central bright form): FAIL
- Essential 2 (swirling shape): PARTIAL
- Essential 3 (bright white eyes): FAIL

**Fix Priority:** CRITICAL - Add contrast, bright eye colors

---

#### Shadow Wisp
**Colors:** 3 | **Rating:** 2/10 | **Deadly Factor:** VERY LOW

**Strengths:**
- Purple shadow palette
- Amorphous shape

**Critical Issues:**
- **ONLY 3 COLORS** - Severely insufficient
- **NO EYES** - Guide specifies 2-4 bright magenta eyes for alien feel
- Just a purple blob
- No wispy smoke edges
- Not threatening at all

**Guide Compliance:**
- Essential 1 (dark purple-black mass): PARTIAL
- Essential 2 (bright magenta eyes 2-4): FAIL
- Essential 3 (wispy edges): PARTIAL

**Fix Priority:** CRITICAL - Add bright magenta eye dots, more colors

---

#### Phantom
**Colors:** 4 | **Rating:** 4/10 | **Deadly Factor:** LOW

**Strengths:**
- Humanoid upper body shape
- Fades toward bottom (correct behavior)
- Ethereal pale blue palette

**Critical Issues:**
- **ONLY 4 COLORS** - Too few
- **NO HOLLOW EYES WITH PALE GLOW** - Essential feature
- Fading effect is good but needs contrast
- Needs ghostly presence

**Guide Compliance:**
- Essential 1 (humanoid torso): PASS
- Essential 2 (fades to transparent): PASS
- Essential 3 (hollow eyes with glow): FAIL

**Fix Priority:** HIGH - Add contrasting eye glow color

---

### HUMANOID CLASS

#### Pyro Cultist
**Colors:** 4 | **Rating:** 2/10 | **Deadly Factor:** VERY LOW

**Strengths:**
- Robed humanoid silhouette
- Dark hooded figure

**Critical Issues:**
- **ONLY 4 COLORS** - All very dark reds, nearly black
- **NO FIRE ON HANDS** - This is THE essential feature
- **NO GLOWING EYES** - Should glow from hood
- Just looks like a dark silhouette
- No casting pose, no dynamic feel

**Guide Compliance:**
- Essential 1 (hooded robe): PASS
- Essential 2 (glowing eyes): FAIL
- Essential 3 (fire on hands): FAIL

**Fix Priority:** CRITICAL - Add orange/yellow fire colors, eye glow

---

#### Shadow Stalker
**Colors:** 6 | **Rating:** 5/10 | **Deadly Factor:** MEDIUM

**Strengths:**
- Quadruped predator silhouette clearly visible
- Purple shadow palette
- Some wispy edge pixels

**Critical Issues:**
- **NO BRIGHT MAGENTA EYES** - Essential predatory feature
- Wispy edges could be more defined
- Missing sharp claw accents
- Not menacing without eyes

**Guide Compliance:**
- Essential 1 (quadruped predator): PASS
- Essential 2 (bright magenta eyes): FAIL
- Essential 3 (wispy body edges): PARTIAL

**Fix Priority:** HIGH - Add bright magenta eye dots

---

#### Ash Walker
**Colors:** 9 | **Rating:** 7/10 | **Deadly Factor:** MEDIUM

**Strengths:**
- **HAS VISIBLE EYES** (#A7C44F green) - One of few sprites with eyes!
- Good humanoid mummy-like silhouette
- Ash/gray palette is appropriate
- Fills canvas well

**Issues:**
- Eyes are green, should be yellow per guide
- Ash particle cloud at feet not clearly defined
- Could use more ember accent colors

**Guide Compliance:**
- Essential 1 (wrapped humanoid): PASS
- Essential 2 (glowing eyes): PASS (color could be adjusted)
- Essential 3 (ash particles): PARTIAL

**Fix Priority:** LOW - Adjust eye color to yellow, add ember spots

**Best sprite in collection for having visible eyes**

---

#### Shadow Imp
**Colors:** 6 | **Rating:** 4/10 | **Deadly Factor:** LOW

**Strengths:**
- Small demonic silhouette
- Purple shadow palette

**Critical Issues:**
- **NO VISIBLE EYES** - Should have glowing yellow/red eyes
- Horns not clearly defined
- Wings not clearly visible
- Shape is muddy

**Guide Compliance:**
- Essential 1 (small horned head): PARTIAL
- Essential 2 (bat-like wings): FAIL
- Essential 3 (glowing eyes): FAIL

**Fix Priority:** HIGH - Add bright eye color, define horns/wings

---

#### Void Touched
**Colors:** 8 | **Rating:** 5/10 | **Deadly Factor:** MEDIUM

**Strengths:**
- Good purple void palette
- Warped proportions present
- Vertical elongated form

**Critical Issues:**
- **NO VISIBLE EYES** - Should have eyes, with face consumed on one side
- Void energy effect not clearly glowing
- Floating effect not clear

**Guide Compliance:**
- Essential 1 (warped proportions): PASS
- Essential 2 (void energy effect): PARTIAL
- Essential 3 (face partially consumed): PARTIAL

**Fix Priority:** MEDIUM - Add eye accent, brighter void glow

---

#### Shield Bearer
**Colors:** 7 | **Rating:** 4/10 | **Deadly Factor:** LOW

**Strengths:**
- Shield silhouette clearly visible
- Armored humanoid shape
- Defensive stance implied

**Critical Issues:**
- **MONOCHROME GRAY** - Needs color variety
- **NO VISIBLE EYES** - Should glow through helmet slit
- No weapon visible
- Feels like a gray statue

**Guide Compliance:**
- Essential 1 (large shield): PASS
- Essential 2 (eye slit glow): FAIL
- Essential 3 (weapon visible): FAIL

**Fix Priority:** HIGH - Add contrasting metal colors, eye glow

---

#### Temple Sentinel
**Colors:** 8 | **Rating:** 6/10 | **Deadly Factor:** MEDIUM

**Strengths:**
- Has gold accent colors (#DCB148, #DBB57E)
- Ancient aesthetic implied
- Good mix of stone and gold

**Critical Issues:**
- **NO GLOWING GOLDEN/CYAN EYES** - Essential awake guardian feature
- Holy runes not clearly glowing
- Shield not prominent enough

**Guide Compliance:**
- Essential 1 (ornate shield): PARTIAL
- Essential 2 (glowing eyes): FAIL
- Essential 3 (ancient armor): PASS

**Fix Priority:** MEDIUM - Add bright eye colors

---

### UNDEAD CLASS

#### Frozen Husk
**Colors:** 8 | **Rating:** 5/10 | **Deadly Factor:** LOW

**Strengths:**
- Ice crystal elements present
- Frozen humanoid silhouette
- Good ice-undead color blend

**Critical Issues:**
- **NO BLUE GLOWING EYES** - Essential feature
- Ice crystals could be more prominent
- Stiff frozen pose not clearly readable

**Guide Compliance:**
- Essential 1 (frozen corpse silhouette): PASS
- Essential 2 (blue glowing eyes): FAIL
- Essential 3 (ice crystals): PASS

**Fix Priority:** HIGH - Add bright blue eye colors

---

### BEAST CLASS

#### Cave Bat
**Colors:** 3 | **Rating:** 2/10 | **Deadly Factor:** VERY LOW

**Strengths:**
- Basic bat wing silhouette

**Critical Issues:**
- **ONLY 3 COLORS** - Severely insufficient
- **GRAY BORDER ARTIFACT** - Breaks immersion
- **NO VISIBLE EYES** - Should have beady eyes
- No ear detail
- Doesn't fill canvas properly

**Guide Compliance:**
- Essential 1 (bat wing silhouette): PASS
- Essential 2 (beady eyes): FAIL
- Essential 3 (visible ears): FAIL

**Fix Priority:** CRITICAL - Remove border, add eyes, more colors

---

#### Fire Bat
**Colors:** 7 | **Rating:** 4/10 | **Deadly Factor:** LOW

**Strengths:**
- Bat silhouette present
- Some warm tones

**Critical Issues:**
- **GRAY BORDER ARTIFACT** - Breaks immersion
- **NO ORANGE/YELLOW EYES** - Should glow
- No fire at wing edges
- Fire effect is completely missing
- Just a brownish bat

**Guide Compliance:**
- Essential 1 (bat with fire at wings): FAIL
- Essential 2 (glowing eyes): FAIL
- Essential 3 (flame trail): FAIL

**Fix Priority:** CRITICAL - Remove border, add fire colors, eye glow

---

#### Giant Spider
**Colors:** 8 | **Rating:** 6/10 | **Deadly Factor:** MEDIUM

**Strengths:**
- Clear spider body shape
- Multiple legs visible
- Good brown/gray palette

**Critical Issues:**
- **NO CLUSTERED EYES** - Should have 6-8 bright eye dots
- Fangs/mandibles not clearly visible
- Could be fuzzier/textured

**Guide Compliance:**
- Essential 1 (round body with legs): PASS
- Essential 2 (multiple clustered eyes): FAIL
- Essential 3 (visible fangs): PARTIAL

**Fix Priority:** HIGH - Add bright eye cluster (6-8 dots)

---

#### Salamander
**Colors:** 8 | **Rating:** 4/10 | **Deadly Factor:** LOW

**Strengths:**
- Lizard body shape
- Fire-appropriate colors

**Critical Issues:**
- **VERY SMALL** - Only uses ~25% of canvas
- **NO VISIBLE EYES** - Should have alert eyes
- Tail not clearly long
- Doesn't feel threatening

**Guide Compliance:**
- Essential 1 (four-legged lizard): PARTIAL (too small)
- Essential 2 (long tail): PARTIAL
- Essential 3 (alert eyes): FAIL

**Fix Priority:** HIGH - Scale up to fill canvas, add eyes

---

#### Mushroom Sprite
**Colors:** 7 | **Rating:** 5/10 | **Deadly Factor:** LOW

**Strengths:**
- Distinctive mushroom cap shape
- Good nature green palette
- Cap/stem structure clear

**Critical Issues:**
- **NO VISIBLE EYES** - Should glow under cap rim
- No spore particles
- Legs/body not clearly defined
- Not threatening

**Guide Compliance:**
- Essential 1 (mushroom cap silhouette): PASS
- Essential 2 (glowing eyes under cap): FAIL
- Essential 3 (stubby legs): PARTIAL

**Fix Priority:** MEDIUM - Add glowing eyes under cap

---

#### Deep Crawler
**Colors:** 8 | **Rating:** 6/10 | **Deadly Factor:** MEDIUM

**Strengths:**
- Pincer claws visible
- Crustacean shape
- Multiple legs implied
- Good teal coloring

**Critical Issues:**
- **NO EYE STALKS** - Essential feature missing
- Armored shell could be more defined
- Wet sheen not present

**Guide Compliance:**
- Essential 1 (large pincer claws): PASS
- Essential 2 (armored shell): PASS
- Essential 3 (eye stalks): FAIL

**Fix Priority:** MEDIUM - Add bright eye stalks

---

#### Tide Serpent
**Colors:** 5 | **Rating:** 4/10 | **Deadly Factor:** LOW

**Strengths:**
- Serpentine coiled shape
- Water-appropriate teal colors

**Critical Issues:**
- **ONLY 5 COLORS** - Insufficient
- **NO PREDATORY EYES** - Should have vertical pupils
- Dorsal fin not clearly defined
- Missing fanged mouth

**Guide Compliance:**
- Essential 1 (serpentine coil): PASS
- Essential 2 (finned back): PARTIAL
- Essential 3 (predatory eyes): FAIL

**Fix Priority:** HIGH - Add more colors, bright predatory eyes

---

## Threat Assessment Summary

### "Cool" Factor Rating by Category

| Category | Average Rating | Deadly Feel |
|----------|---------------|-------------|
| Slimes | 4.3/10 | Low |
| Golems | 5.0/10 | Low |
| Spirits | 3.0/10 | Very Low |
| Humanoids | 4.7/10 | Low-Medium |
| Undead | 5.0/10 | Low |
| Beasts | 4.4/10 | Low |

### Why Sprites Don't Feel Threatening

1. **No Eyes = No Soul**
   - Eyes are the first thing players look at
   - Glowing eyes convey malice, intelligence, danger
   - Without eyes, monsters feel like scenery, not threats

2. **No Glowing Effects**
   - Magic, fire, ice effects should glow
   - Glowing elements draw attention and signal danger
   - Current sprites are flat and static

3. **Muted Colors**
   - Auto-conversion produced similar, muted tones
   - No high-contrast accent colors
   - Everything blends together

4. **Poor Canvas Utilization**
   - Some sprites are too small (Salamander)
   - Some have border artifacts (bats)
   - Sprites should fill 26-30px of 32px canvas

5. **Missing Outline Strategy**
   - Physical creatures need black outlines for solidity
   - Ethereal creatures correctly have soft edges
   - But no creatures feel "solid" or "present"

---

## Recommendations

### Immediate Priority Fixes

1. **Add Eyes to All Sprites**
   - Every sprite needs 1-2 bright accent colors for eyes
   - Use white, yellow, cyan, magenta depending on element
   - Eyes should be the brightest pixels in the sprite

2. **Fix Border Artifacts**
   - Remove gray borders from Cave Bat and Fire Bat
   - These break immersion immediately

3. **Add Glowing Effects**
   - Obsidian Golem needs orange crack lines
   - Pyro Cultist needs fire on hands
   - Bone Golem needs soul glow
   - Fire Bat needs flame at wing edges

4. **Increase Color Counts**
   - Priority sprites: Toxic Slime (4), Shadow Wisp (3), Phantom (4), Frost Elemental (4), Pyro Cultist (4)
   - Add accent colors for features, highlights, and effects

### Medium Priority

5. **Scale Up Small Sprites**
   - Salamander is too small
   - Should fill 26-30px of canvas

6. **Add Black Outlines to Physical Creatures**
   - Golems, beasts, humanoids need #000000 outer edge
   - Helps silhouette readability

### Long Term

7. **Apply Hue Shifting**
   - Shadows should shift toward purple/blue
   - Highlights should shift toward yellow/white
   - Current sprites just darken without hue shift

8. **Consider Re-Drawing Priority Sprites**
   - Some sprites may need hand-drawing rather than auto-conversion
   - Focus on boss/elite monsters first

---

## Conclusion

The current sprite set provides basic placeholder visuals but fails to deliver the "cool," deadly aesthetic needed for an engaging dungeon crawler. The single most impactful improvement would be **adding bright, glowing eyes to every monster**. This alone would transform the sprites from "things in the dungeon" to "creatures that want to kill you."

Secondary priorities include:
- Adding glowing magical effects (fire, ice, soul glow)
- Increasing color counts to 10-16 per sprite
- Fixing border artifacts on bat sprites
- Ensuring proper canvas utilization

The auto-conversion process created functional sprites but lost the artistic intention that makes monsters visually compelling. Hand-touch-ups following the Monster Visual Design Guide specifications would significantly improve the overall quality.

---

*Report generated by Claude Code sprite analysis*
*Reference: docs/MONSTER_VISUAL_DESIGN_GUIDE.md*

---

# PART 2: ART TEAM IMPROVEMENT GUIDE

---

## Section 1: Art Team Workflow & Process Guide

This section provides a structured, repeatable process for transforming the current placeholder sprites into visually compelling dungeon monsters. Follow these workflows to ensure consistent quality and efficient use of artist time.

---

### 1.1 Priority Tier System

Sprites are assigned to tiers based on visual impact, frequency of appearance, and severity of current issues.

#### TIER 1: CRITICAL (Fix Immediately)
*These sprites have fundamental issues that break immersion or are completely missing essential features*

| Sprite | Primary Issue | Est. Time |
|--------|---------------|-----------|
| Pyro Cultist | No fire on hands, no eyes, only 4 colors | 90 min |
| Obsidian Golem | No glowing cracks (THE essential feature) | 75 min |
| Cave Bat | Border artifact, only 3 colors | 45 min |
| Fire Bat | Border artifact, no fire effects | 60 min |
| Toxic Slime | Only 4 colors, no eyes, flat | 60 min |
| Shadow Wisp | Only 3 colors, no eyes | 45 min |
| Frost Elemental | Only 4 colors, formless | 60 min |

**TIER 1 TOTAL: ~7.25 hours**

#### TIER 2: HIGH PRIORITY (Fix This Sprint)
*Essential features missing but basic form is acceptable*

| Sprite | Primary Issue | Est. Time |
|--------|---------------|-----------|
| Magma Slime | No eyes (has good palette) | 30 min |
| Frost Slime | No eyes, spikes unclear | 45 min |
| Stone Golem | No glowing eyes | 30 min |
| Ice Golem | No eyes, facets unclear | 45 min |
| Bone Golem | No soul glow core | 45 min |
| Shadow Stalker | No predator eyes | 30 min |
| Shadow Imp | No eyes, muddy wings/horns | 45 min |
| Phantom | No hollow eye glow | 30 min |
| Giant Spider | No eye cluster | 30 min |
| Frozen Husk | No blue eye glow | 30 min |
| Shield Bearer | No eye slit glow | 30 min |
| Tide Serpent | No predator eyes, low colors | 45 min |

**TIER 2 TOTAL: ~7.25 hours**

#### TIER 3: MEDIUM PRIORITY (Polish Sprint)
*Sprites work but need enhancement to reach "cool" factor*

| Sprite | Primary Issue | Est. Time |
|--------|---------------|-----------|
| Crystal Golem | Core glow not bright enough | 30 min |
| Temple Sentinel | No golden eye glow | 30 min |
| Void Touched | Void energy unclear | 45 min |
| Mushroom Sprite | No under-cap eye glow | 30 min |
| Deep Crawler | No eye stalks | 30 min |
| Salamander | Too small, no eyes | 45 min |

**TIER 3 TOTAL: ~3.5 hours**

#### TIER 4: POLISH (Final Pass)
*These sprites are functional but could be elevated*

| Sprite | Primary Issue | Est. Time |
|--------|---------------|-----------|
| Ash Walker | Eye color adjustment (green→yellow) | 15 min |
| Add ember/ash particles | 30 min |

**TIER 4 TOTAL: ~0.75 hours**

---

### 1.2 The Seven-Step Improvement Process

For each sprite, follow this standardized workflow:

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: AUDIT           Load sprite, document current state       │
│    ↓                                                                │
│  STEP 2: SILHOUETTE      Fix canvas utilization, remove artifacts  │
│    ↓                                                                │
│  STEP 3: OUTLINE         Add black outline or sel-out as needed    │
│    ↓                                                                │
│  STEP 4: PALETTE         Expand to 10-16 colors with hue shifting  │
│    ↓                                                                │
│  STEP 5: ESSENTIAL       Add eyes, glows, critical features        │
│    ↓                                                                │
│  STEP 6: SECONDARY       Add texture, detail, ambient effects      │
│    ↓                                                                │
│  STEP 7: POLISH          Final QA, cluster check, readability      │
└─────────────────────────────────────────────────────────────────────┘
```

#### STEP 1: AUDIT (5 minutes)
**Goal:** Understand current state before making changes

**Checklist:**
- [ ] Load sprite in pixel editor at 800% zoom
- [ ] Count current colors in palette
- [ ] Identify: What works? What's broken?
- [ ] Check canvas utilization (should be 26-30px of 32px)
- [ ] Look for artifacts (border pixels, stray dots)
- [ ] Cross-reference with per-sprite spec (Section 3)

**Output:** Completed audit form with notes

---

#### STEP 2: SILHOUETTE REPAIR (5-10 minutes)
**Goal:** Ensure the sprite fills canvas properly and reads clearly

**Tasks:**
- Remove any border artifacts (gray edges from conversion)
- Scale up sprites that are too small (like Salamander)
- Ensure sprite occupies 26-30px of the 32px canvas
- Verify the silhouette is instantly recognizable at 1x scale
- Check that creature "type" is clear (slime=blob, golem=blocky, etc.)

**Validation:**
- Squint test: Can you identify the creature type?
- Zoom to 1x: Is the silhouette clear against dungeon background?

---

#### STEP 3: OUTLINE CORRECTION (5-10 minutes)
**Goal:** Apply correct outline strategy per creature type

**Strategy by Category:**

| Category | Outline Type | Method |
|----------|--------------|--------|
| Golems | Black (#000000) | 1px solid outline, thickens at stress points |
| Beasts | Black (#000000) | 1px outline except soft fur areas |
| Humanoids | Black (#000000) | Full outline, may break for cloth edges |
| Slimes | Sel-out | Dark version of body color, no black |
| Spirits | None/Sel-out | No hard outline, use darker body tones |
| Undead | Black (#000000) | Standard outline, may fade for ethereal parts |

**Sel-out (Selected Outline) Technique:**
Instead of #000000, use the darkest shade of the sprite's primary color:
- Fire creatures: Use dark red-brown (#3A1A0A)
- Ice creatures: Use dark blue (#1A2A3A)
- Shadow creatures: Use deep purple (#1A0A2A)

---

#### STEP 4: PALETTE EXPANSION (10-20 minutes)
**Goal:** Reach 10-16 colors with proper hue shifting

**The Palette Stack (6 tones minimum per material):**
```
HIGHLIGHT ──→ Shift toward YELLOW/WHITE, lower saturation
    ↑
LIGHT     ──→ Shift slightly warm
    ↑
MIDTONE   ──→ Base color (peak saturation)
    ↓
SHADOW 1  ──→ Shift toward PURPLE/BLUE
    ↓
SHADOW 2  ──→ More purple, lower saturation
    ↓
DEEP      ──→ Near black, desaturated
```

**Required Accent Colors:**
- **Eye Color:** 1-2 colors (brightest in sprite)
- **Glow Color:** 1 color for magical effects
- **Contrast Accent:** 1 color that pops against body

**Common Mistakes:**
- ❌ Just darkening colors without hue shift
- ❌ Using pure black (#000000) for shadows in body
- ❌ Forgetting the highlight color
- ❌ Making eyes same brightness as body

---

#### STEP 5: ESSENTIAL FEATURES (15-30 minutes)
**Goal:** Add the 1-3 features that make this monster recognizable and threatening

This is where sprites transform from "blobs" to "creatures that want to kill you."

**Universal Rule: EYES FIRST**
- Place eyes before any other feature
- Eyes should be the brightest pixels in the sprite
- Even 2 pixels of eye color transforms a sprite

**Check the Per-Sprite Specification (Section 3) for exact requirements.**

**Eye Placement Principles:**
- Upper third of sprite (head area)
- 2-4 pixel spacing for paired eyes
- Vertical slit pupils: 1x2 or 1x3 pixels
- Round eyes: 1-2 pixels, single color or highlight dot

---

#### STEP 6: SECONDARY FEATURES (10-15 minutes)
**Goal:** Add texture, detail, and ambient effects

**Secondary Features by Category:**
- **Slimes:** Internal bubbles, drip shapes, surface sheen
- **Golems:** Cracks, runes, weathering marks
- **Spirits:** Wispy particle pixels, energy trails
- **Humanoids:** Cloth texture, weapon details, pose dynamics
- **Beasts:** Fur texture, claw details, fang highlights
- **Undead:** Decay effects, exposed bone, ethereal wisps

**Sub-pixel Techniques:**
- Use alternating pixels to imply texture
- Checker patterns at 2-3 pixel scale for rough surfaces
- Gradient dithering for smooth transitions

---

#### STEP 7: POLISH PASS (5-10 minutes)
**Goal:** Final quality check and cleanup

**Final Checklist:**
- [ ] Cluster rule: No isolated single pixels (except intentional eye dots)
- [ ] Color count: 10-16 colors in palette
- [ ] Lighting: Top-left (45°) consistent across sprite
- [ ] Eyes visible at 1x zoom
- [ ] Silhouette clear at 1x zoom
- [ ] No stray pixels or artifacts
- [ ] Palette has proper hue shifting
- [ ] Sprite fills 26-30px of canvas

---

### 1.3 Quality Checkpoints

Use these gates to validate each sprite before marking complete:

#### CHECKPOINT 1: Silhouette Gate
```
Question: At 50% zoom with squinted eyes, can you identify the creature type?
PASS: Yes, creature category is obvious
FAIL: Creature could be anything, shape is unclear
```

#### CHECKPOINT 2: Eye Gate
```
Question: At 100% zoom, are eyes immediately visible?
PASS: Eyes are brightest element, draw attention
FAIL: Eyes are hidden, missing, or same value as body
```

#### CHECKPOINT 3: Threat Gate
```
Question: Does this monster look like it wants to kill the player?
PASS: Monster conveys malice, power, or danger
FAIL: Monster looks passive, friendly, or decorative
```

#### CHECKPOINT 4: Color Count Gate
```
Question: Does palette contain 10-16 unique colors?
PASS: Yes, with proper accent colors for eyes/effects
FAIL: Under 10 colors, or no accent colors
```

#### CHECKPOINT 5: Hue Shift Gate
```
Question: Do shadows shift toward purple/blue, highlights toward yellow?
PASS: Colors feel alive and dynamic
FAIL: Shadows are just darker versions of midtone
```

#### CHECKPOINT 6: Integration Gate
```
Question: Does this sprite look like it belongs in "The Shifting Chasm"?
PASS: Matches the dark fantasy dungeon aesthetic
FAIL: Looks out of place or from a different game
```

---

### 1.3.1 QA Sign-off Process

Checkpoints alone don't prevent issues — they need an enforcement mechanism. Use this process:

**STEP 1: Self-Review (Artist)**
```
┌─────────────────────────────────────────────────────────────┐
│ Before submitting, artist completes Template C              │
│ (Final QA Checklist) and attaches it to the sprite file.   │
│                                                             │
│ If ANY item is unchecked, artist must either:               │
│   • Fix the issue before submitting, OR                     │
│   • Note why it's intentionally incomplete                  │
└─────────────────────────────────────────────────────────────┘
```

**STEP 2: Submission**
```
Artist submits:
  1. Updated sprite file (*-sprite.js)
  2. Completed Template C checklist
  3. Brief note: "Fixed [X], added [Y], see checklist"
```

**STEP 3: Review (Art Lead/Tech Lead)**
```
Reviewer checks within 24 hours:
  • Does sprite pass Checkpoints 1-6?
  • Does checklist match actual sprite?
  • Any issues the artist missed?

Review outcomes:
  ✓ APPROVED — Sprite is complete, moves to final set
  ⟳ MINOR ISSUES — Accepted with notes for polish pass
  ✗ REJECTED — CRITICAL/HIGH fix missed, returns to artist
```

**STEP 4: Rejection Handling**
```
If rejected:
  1. Reviewer notes specific failed checkpoints
  2. Sprite returns to artist IMMEDIATELY (same day)
  3. Artist has context fresh — fixes are faster
  4. Re-submit when fixed (back to Step 2)

DO NOT batch rejections to end of sprint.
Fix issues while context is fresh.
```

**Why This Matters:**

Without sign-off, artists "finish" sprites, move on, and missing features aren't caught until the full review at sprint end. By then:
- Artist has lost context on that sprite
- Fix takes 2-3x longer than if caught immediately
- Creates sprint-end crunch

With sign-off:
- Issues caught within 24 hours
- Artist still remembers what they were doing
- Fixes are quick and focused
- No surprise rework at sprint end

**Sign-off Tracking Table:**
```
| Sprite         | Submitted | Reviewed | Status   | Notes                |
|----------------|-----------|----------|----------|----------------------|
| Pyro Cultist   | Mon 9am   | Mon 4pm  | APPROVED | Fire looks great     |
| Obsidian Golem | Mon 11am  | Mon 5pm  | REJECTED | Cracks not visible   |
| Obsidian Golem | Tue 10am  | Tue 2pm  | APPROVED | Fixed, good contrast |
| ...            | ...       | ...      | ...      | ...                  |
```

---

### 1.4 Sprint Schedule

Recommended pacing for a single artist:

```
SPRINT 1 (Week 1): TIER 1 Critical Sprites
├─ Monday:    Pyro Cultist, Obsidian Golem
├─ Tuesday:   Cave Bat, Fire Bat
├─ Wednesday: Toxic Slime, Shadow Wisp
├─ Thursday:  Frost Elemental
└─ Friday:    Review & polish all Tier 1

SPRINT 2 (Week 2): TIER 2 High Priority (Part 1)
├─ Monday:    Magma Slime, Frost Slime, Stone Golem
├─ Tuesday:   Ice Golem, Bone Golem
├─ Wednesday: Shadow Stalker, Shadow Imp
├─ Thursday:  Phantom, Giant Spider
└─ Friday:    Buffer/Review

SPRINT 3 (Week 3): TIER 2 High Priority (Part 2) + TIER 3
├─ Monday:    Frozen Husk, Shield Bearer, Tide Serpent
├─ Tuesday:   Crystal Golem, Temple Sentinel, Void Touched
├─ Wednesday: Mushroom Sprite, Deep Crawler, Salamander
├─ Thursday:  Buffer/Polish
└─ Friday:    Review all Tier 2-3

SPRINT 4 (Week 4): Polish + Integration
├─ Monday:    Ash Walker polish
├─ Tuesday:   Full review pass on all 27 sprites
├─ Wednesday: Consistency check (eye brightness, palette harmony)
├─ Thursday:  Final fixes
└─ Friday:    Sprite set complete ✓
```

---

### 1.5 Templates

#### TEMPLATE A: Sprite Audit Form
```
SPRITE: ________________________
DATE: _________________________

CURRENT STATE
├─ Color Count: _____ (target: 10-16)
├─ Has Eyes: YES / NO
├─ Has Outline: YES / NO / SEL-OUT
├─ Canvas Fill: _____px of 32px
└─ Artifacts: _________________________

WHAT WORKS
├─ _________________________________
├─ _________________________________
└─ _________________________________

WHAT'S BROKEN
├─ _________________________________
├─ _________________________________
└─ _________________________________

PRIORITY TIER: 1 / 2 / 3 / 4
ESTIMATED TIME: _____ minutes
```

#### TEMPLATE B: Palette Planning Sheet
```
SPRITE: ________________________

BASE COLOR (midtone): #______
├─ Highlight 1:  #______ (+hue toward yellow)
├─ Highlight 2:  #______ (+more yellow, -saturation)
├─ Shadow 1:     #______ (+hue toward purple)
├─ Shadow 2:     #______ (+more purple, -saturation)
└─ Deep Shadow:  #______ (near black)

ACCENT COLORS
├─ Eye Primary:   #______ (BRIGHTEST)
├─ Eye Secondary: #______ (highlight dot)
├─ Glow Effect:   #______
└─ Special:       #______

TOTAL COLORS: _____ (target: 10-16)
```

#### TEMPLATE C: Final QA Checklist
```
SPRITE: ________________________  DATE: __________

SILHOUETTE
[ ] Fills 26-30px of canvas
[ ] Recognizable at 1x zoom
[ ] No border artifacts
[ ] Creature type is clear

PALETTE
[ ] 10-16 colors total
[ ] Hue shifting in shadows (toward purple/blue)
[ ] Hue shifting in highlights (toward yellow)
[ ] Peak saturation at midtone

EYES & FEATURES
[ ] Eyes are brightest element
[ ] Eyes visible at 1x zoom
[ ] Essential Feature 1: _____________ ✓
[ ] Essential Feature 2: _____________ ✓
[ ] Essential Feature 3: _____________ ✓

OUTLINE
[ ] Correct strategy (black / sel-out / none)
[ ] Consistent 1px width
[ ] No broken sections (unless intentional)

TECHNICAL
[ ] No single isolated pixels (except eyes)
[ ] Top-left (45°) lighting consistent
[ ] No orphan colors (each color used 3+ times)

THREAT ASSESSMENT
[ ] Monster looks dangerous
[ ] Monster fits dungeon aesthetic
[ ] Monster would make player cautious

RESULT: PASS / NEEDS WORK
```

#### TEMPLATE D: Quick Reference Card
```
╔══════════════════════════════════════════════════════════════╗
║               SPRITE IMPROVEMENT QUICK REFERENCE              ║
╠══════════════════════════════════════════════════════════════╣
║ CANVAS: 32x32px, active area 26-30px                         ║
║ COLORS: 10-16 per sprite                                     ║
║ LIGHTING: Top-left 45°                                       ║
╠══════════════════════════════════════════════════════════════╣
║ HUE SHIFTING:                                                ║
║   Highlights → shift toward YELLOW, reduce saturation        ║
║   Shadows → shift toward PURPLE/BLUE, reduce saturation      ║
╠══════════════════════════════════════════════════════════════╣
║ OUTLINES:                                                    ║
║   Physical (golems, beasts, humanoids) → BLACK #000000       ║
║   Slimes → SEL-OUT (dark body color)                         ║
║   Spirits → NONE (soft edges only)                           ║
╠══════════════════════════════════════════════════════════════╣
║ EYES (brightest pixels):                                     ║
║   Fire: #FFFF44 (yellow)    Ice: #AAEEFF (cyan)             ║
║   Shadow: #FF44FF (magenta) Earth: #FFDD88 (amber)          ║
║   Toxic: #CCFF44 (lime)     Undead: #44FF88 (green)         ║
╠══════════════════════════════════════════════════════════════╣
║ RULE: Eyes should be visible at 1x zoom                      ║
║ RULE: No isolated single pixels (except eye dots)            ║
║ RULE: Every monster should look like it wants to kill you    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Section 2: Monster Category Artistic Feature Guide

This section provides detailed visual specifications for each monster category. Use these guidelines to ensure visual consistency within each creature type while maintaining distinct personality for individual monsters.

---

### 2.1 SLIME CATEGORY

**Visual Identity:** Amorphous, liquid creatures with internal glow and surface tension effects

**Silhouette Characteristics:**
- Round/blob base shape, irregular top edge
- Drip formations at bottom (2-4 drips)
- Small protrusions for pseudopods optional
- NO legs, NO distinct limbs
- Height ≈ Width (roughly square bounding box)

**Outline Strategy:** SEL-OUT (Selected Outline)
- Use darkest body color for outline, NOT black
- Outline should feel "wet" and organic
- Allow gaps in outline where light catches surface

**Eye Specifications:**
| Slime Type | Eye Color Primary | Eye Color Secondary | Placement |
|------------|-------------------|---------------------|-----------|
| Magma Slime | #FFFF44 (bright yellow) | #FFFFFF (white dot) | Upper center, 3-4px apart |
| Frost Slime | #AAEEFF (cyan) | #FFFFFF (white) | Upper center, slightly higher |
| Toxic Slime | #CCFF44 (lime green) | #FFFFFF (white) | Can be asymmetric, unsettling |

**Color Palette Prescription:**

**Magma Slime - Fire Palette (Target: 12 colors)**
```
Body Ramp (6 colors):
  #FFE4AA - Highlight (surface gleam)
  #FF9944 - Light (fire glow area)
  #FF6622 - Midtone (main body)
  #CC4411 - Shadow 1
  #882200 - Shadow 2 (purple shift)
  #441100 - Deep shadow

Accent Colors (6 colors):
  #FFFF44 - Eye primary (BRIGHTEST)
  #FFFFFF - Eye highlight
  #FFCC00 - Internal glow
  #FF3300 - Lava drip tips
  #220000 - Sel-out outline
  #FFAA66 - Surface reflection
```

> **PALETTE RATIONALE:** Magma slimes are living lava — they emit light rather than just reflecting it. The palette shifts from yellow-white at the hottest points to deep red-brown at the cooler edges. Shadows shift toward purple (not black) because molten material never goes fully dark while still hot. The yellow eyes must be brighter than the orange body to read as "looking at you" rather than just another hot spot.

**Frost Slime - Ice Palette (Target: 12 colors)**
```
Body Ramp (6 colors):
  #FFFFFF - Highlight (ice gleam)
  #DDEEFF - Light (pale blue)
  #88CCEE - Midtone (main ice blue)
  #5599CC - Shadow 1
  #336699 - Shadow 2 (purple shift)
  #224466 - Deep shadow

Accent Colors (6 colors):
  #AAEEFF - Eye primary (BRIGHTEST)
  #FFFFFF - Eye highlight
  #66DDFF - Internal frost glow
  #AADDFF - Crystal spike highlights
  #112244 - Sel-out outline
  #CCEEFF - Surface frost
```

> **PALETTE RATIONALE:** Ice is partially transparent and refracts light internally. The palette stays in cool cyan-blue range with white highlights representing ice gleam. Unlike magma, ice doesn't emit light — it reflects and refracts ambient light, so the brightest areas are surface highlights and the crystalline spike tips. The deep shadows shift toward purple-blue rather than gray.

**Toxic Slime - Poison Palette (Target: 12 colors)**
```
Body Ramp (6 colors):
  #EEFF88 - Highlight (acid gleam)
  #CCEE44 - Light (bright green)
  #99CC22 - Midtone (toxic green)
  #668811 - Shadow 1
  #445500 - Shadow 2 (toward brown)
  #223300 - Deep shadow

Accent Colors (6 colors):
  #CCFF44 - Eye primary (BRIGHTEST)
  #FFFFFF - Eye highlight
  #AAFF00 - Internal glow (poison core)
  #FF8800 - Warning spots (optional)
  #112200 - Sel-out outline
  #DDFF66 - Bubble highlights
```

> **PALETTE RATIONALE:** Toxic slimes use "warning coloration" — the bright yellow-green screams "danger" in nature. The palette intentionally stays in the yellow-green range without shifting to blue in shadows (unlike other slimes) because toxic materials maintain their warning color even in shadow. Optional orange warning spots can reinforce the "poisonous" message.

**Essential Effects Checklist:**
- [ ] Eyes are visible and BRIGHT (this is #1 priority)
- [ ] Surface highlights show light direction (top-left)
- [ ] At least 2 drip shapes at bottom edge
- [ ] Internal glow core visible (lighter center)
- [ ] No isolated pixels except eye highlights

**Common Mistakes to Avoid:**
- ❌ Making eyes same value as body (they vanish)
- ❌ Using black outline (makes slime look solid/dead)
- ❌ Perfectly round shape (too geometric, not organic)
- ❌ Forgetting drip shapes (loses the "liquid" feel)
- ❌ No internal glow (looks flat and lifeless)

---

### 2.2 GOLEM CATEGORY

**Visual Identity:** Massive, constructed beings with internal energy and weathered surfaces

**Silhouette Characteristics:**
- Blocky, geometric shapes
- Broader at shoulders than waist
- Heavy, grounded stance
- Visible arms and legs (thick, powerful)
- Head often smaller than body
- Height > Width (tall, imposing)

**Outline Strategy:** BLACK (#000000)
- 1px solid outline for maximum definition
- Thicken at stress points (joints, cracks)
- Outline defines the "constructed" feel

**Eye Specifications:**
| Golem Type | Eye Color Primary | Eye Color Secondary | Eye Shape |
|------------|-------------------|---------------------|-----------|
| Obsidian Golem | #FF6600 (ember orange) | #FFCC00 (fire yellow) | Horizontal slits, angry |
| Stone Golem | #FFDD88 (amber) | #FFFFFF (bright core) | Round dots, ancient |
| Ice Golem | #AAEEFF (bright cyan) | #FFFFFF (ice white) | Angular, cold |
| Crystal Golem | #FFFFFF (pure white) | #FFAAFF (pink refraction) | Faceted, multiple |
| Bone Golem | #44FF88 (soul green) | #88FFAA (pale green) | Hollow sockets |

**Color Palette Prescription:**

**Obsidian Golem - Volcanic Palette (Target: 14 colors)**
```
Body Ramp (6 colors):
  #4A4A55 - Highlight (obsidian gleam)
  #363640 - Light (dark gray)
  #2A2A30 - Midtone (obsidian black)
  #1A1A22 - Shadow 1
  #101015 - Shadow 2
  #000000 - Outline

Fire Crack Colors (5 colors):
  #FFCC00 - Brightest crack (core heat)
  #FF9900 - Hot crack
  #FF6600 - Warm crack (MOST COMMON)
  #CC3300 - Cooling crack
  #661100 - Cooled crack edge

Accent Colors (3 colors):
  #FF6600 - Eye primary
  #FFCC00 - Eye highlight
  #FF3300 - Ember particles
```

> **PALETTE RATIONALE:** Obsidian is volcanic glass — near-zero saturation, almost colorless. Map each current brown to a gray of equivalent lightness (match by value, not by ramp position). The fire cracks provide ALL the color; the body should be almost monochrome gray-black. This creates maximum contrast: dead gray stone with living fire inside.

**CRITICAL FOR OBSIDIAN GOLEM:**
The glowing orange cracks are THE essential feature. Without them, this is just a gray blob.
- Cracks should follow body contours (arms, torso, legs)
- Brighter at center, darker at edges
- At least 8-12 crack pixels visible
- Cracks MUST glow brighter than any body color

**Stone Golem - Earth Palette (Target: 12 colors)**
```
Body Ramp (6 colors):
  #C4B896 - Highlight (sandstone)
  #A89878 - Light (tan stone)
  #8A7A60 - Midtone (earth brown)
  #6A5A48 - Shadow 1
  #4A3A30 - Shadow 2 (purple shift)
  #2A2020 - Deep shadow

Accent Colors (6 colors):
  #FFDD88 - Eye primary (BRIGHTEST)
  #FFFFFF - Eye highlight
  #88CCFF - Optional rune glow (cyan)
  #666644 - Moss/weathering
  #444433 - Crack lines
  #000000 - Outline
```

> **PALETTE RATIONALE:** Stone golems are ancient constructs of weathered rock. The warm tan-brown palette suggests sandstone or aged granite. Shadows shift toward purple (not black) to keep the stone feeling alive. The optional cyan rune glow suggests the magic animating the golem — it should be used sparingly to avoid competing with the amber eyes.

**Ice Golem - Frost Palette (Target: 12 colors)**
```
Body Ramp (6 colors):
  #FFFFFF - Highlight (ice gleam)
  #DDEEFF - Light (pale ice)
  #99CCDD - Midtone (ice blue)
  #668899 - Shadow 1
  #445566 - Shadow 2
  #223344 - Deep shadow

Accent Colors (6 colors):
  #AAEEFF - Eye primary (BRIGHTEST)
  #FFFFFF - Eye highlight
  #66DDFF - Internal glow
  #BBDDEE - Frost surface
  #334455 - Facet edges
  #000000 - Outline
```

> **PALETTE RATIONALE:** Ice golems are carved from glacier ice — solid, faceted, and cold. Unlike Frost Slime (which is semi-liquid), ice golems are rigid and angular. The palette uses cooler, grayer blues than the slime. The internal glow represents the magic core; it should be subtle, not overwhelming the ice's natural translucency.

**Crystal Golem - Prismatic Palette (Target: 14 colors)**
```
Body Ramp (6 colors):
  #FFFFFF - Highlight (crystal gleam)
  #EECCFF - Light (pale pink/purple)
  #CC99EE - Midtone (amethyst)
  #9966AA - Shadow 1
  #664477 - Shadow 2
  #332244 - Deep shadow

Refraction Colors (5 colors):
  #FF99CC - Pink refraction
  #99CCFF - Blue refraction
  #CCFF99 - Green refraction
  #FFCC99 - Orange refraction
  #FFFF99 - Yellow refraction

Accent Colors (3 colors):
  #FFFFFF - Core glow (BRIGHTEST)
  #FFAAFF - Eye secondary
  #000000 - Outline
```

> **PALETTE RATIONALE:** Crystal golems are made of magically-grown amethyst or quartz. The purple base is punctuated by prismatic refraction colors that appear at facet edges where light bends. Use refraction colors sparingly (1-2 pixels each) — they're accent, not primary. The pure white core represents the magical heart; it should be the single brightest element.

> **OUTLINE EXCEPTION:** Crystal Golem uses sel-out (dark purple #332244) instead of black to allow the light-refracting feel. A black outline would make the crystal look solid and opaque rather than gem-like.

**Bone Golem - Undead Palette (Target: 12 colors)**
```
Body Ramp (6 colors):
  #E8E0D0 - Highlight (clean bone)
  #C8B8A0 - Light (aged bone)
  #A89870 - Midtone (bone)
  #786848 - Shadow 1
  #584830 - Shadow 2
  #382820 - Deep shadow

Accent Colors (6 colors):
  #44FF88 - Soul glow primary (BRIGHTEST)
  #88FFAA - Soul glow secondary
  #22CC66 - Soul core
  #443322 - Decay/dirt
  #221100 - Hollow shadows
  #000000 - Outline
```

> **PALETTE RATIONALE:** Bone golems are necromantic constructs of fused skeletal remains. The bone palette uses warm ivory tones (not gray) because real bone has yellow-brown undertones. The soul glow (green) represents the necromantic energy binding the bones together — it should emanate from the chest cavity and eye sockets, contrasting against the warm bone colors.

**Essential Effects Checklist:**
- [ ] Eyes glow and are immediately visible
- [ ] Correct outline (solid black, 1px)
- [ ] Internal glow effect present (cracks, runes, or core)
- [ ] Blocky, powerful silhouette
- [ ] Weathering/texture details
- [ ] Top-left lighting on edges

**Common Mistakes to Avoid:**
- ❌ Missing the glowing cracks (especially Obsidian)
- ❌ Too smooth (golems should look rough/constructed)
- ❌ Using sel-out outline (makes them look soft/organic)
- ❌ Eyes at same brightness as body
- ❌ Perfectly symmetrical (should have character)

---

### 2.3 SPIRIT CATEGORY

**Visual Identity:** Ethereal, translucent beings that fade at edges with glowing cores

**Silhouette Characteristics:**
- Soft, irregular edges (NO sharp boundaries)
- Fade to transparency at extremities
- Central core is brightest/most defined
- Wispy tendrils or particle effects at edges
- May have humanoid upper body (Phantom)
- Shape suggests motion/floating

**Outline Strategy:** NONE or VERY SUBTLE SEL-OUT
- No black outline (would make them look solid)
- Edges are just darker/lighter versions of body
- Pixels should scatter at edges (no clean line)

**Eye Specifications:**
| Spirit Type | Eye Color Primary | Eye Color Secondary | Eye Style |
|-------------|-------------------|---------------------|-----------|
| Frost Elemental | #FFFFFF (pure white) | #AAEEFF (ice cyan) | Bright dots, cold |
| Shadow Wisp | #FF44FF (hot magenta) | #FF88FF (pale magenta) | 2-4 eyes, alien |
| Phantom | #AACCFF (pale blue) | #FFFFFF (white) | Hollow sockets with glow |

**Color Palette Prescription:**

**Frost Elemental - Ice Spirit Palette (Target: 10 colors)**
```
Body Ramp (5 colors):
  #FFFFFF - Core (brightest, center)
  #DDEEFF - Inner glow
  #99CCEE - Midtone body
  #6699AA - Fade zone
  #446677 - Outer wisp (toward transparent)

Accent Colors (5 colors):
  #FFFFFF - Eye primary (BRIGHTEST)
  #AAEEFF - Eye secondary
  #88DDFF - Ice particle effects
  #66BBDD - Swirl details
  #335566 - Darkest wisp edge
```

> **PALETTE RATIONALE:** Frost elementals are condensed cold — they emit a cold light from their core that fades toward the edges. Unlike ice golems (solid, rigid), elementals are gaseous/energy beings. The brightest point is the center (the magical core), fading to near-transparency at the edges. Think "frozen breath made visible."

**Shadow Wisp - Void Palette (Target: 10 colors)**
```
Body Ramp (5 colors):
  #8844AA - Core (darkest center, inverted!)
  #6633AA - Inner body
  #553388 - Midtone
  #442266 - Fade zone
  #331144 - Outer wisp

Accent Colors (5 colors):
  #FF44FF - Eye primary (BRIGHTEST - contrast!)
  #FF88FF - Eye secondary
  #AA55CC - Internal energy
  #442255 - Dark spots
  #220033 - Deepest shadow
```

> **PALETTE RATIONALE:** Shadow wisps use INVERTED lighting — the center is darker, edges lighter — because shadow creatures absorb light rather than reflecting it. They're essentially holes in reality. The magenta eyes are the only warm color and create maximum contrast against the cold purple body. This inversion is critical: if you light it normally (dark edges, light center), it stops reading as "shadow creature."

**Phantom - Ghost Palette (Target: 10 colors)**
```
Body Ramp (5 colors):
  #DDEEFF - Upper body (most visible)
  #AACCEE - Torso
  #88AACC - Waist fade
  #6688AA - Lower fade
  #446688 - Disappearing edge

Accent Colors (5 colors):
  #AACCFF - Eye socket glow
  #FFFFFF - Eye highlight
  #CCEEFF - Glow around face
  #558899 - Wispy details
  #334455 - Deepest folds
```

> **PALETTE RATIONALE:** Phantoms are "incomplete" ghosts — human upper body that fades to nothing below. The palette uses standard (not inverted) lighting because phantoms are closer to "translucent memory" than "darkness entity." The upper body is most visible, fading toward the bottom. Hollow eye sockets with interior glow create the classic haunted look.

**Essential Effects Checklist:**
- [ ] NO hard black outline
- [ ] Center is most opaque, edges fade
- [ ] Wispy/particle pixels at edges
- [ ] Eyes are VERY visible (highest contrast)
- [ ] Shape suggests floating/ethereal motion
- [ ] At least 3 tones for fade effect

**Common Mistakes to Avoid:**
- ❌ Using black outline (destroys ethereal feel)
- ❌ Making edges too clean/defined
- ❌ Eyes blending into body (must pop!)
- ❌ Too few colors (needs gradient for fade effect)
- ❌ Making center and edges same brightness

---

### 2.4 HUMANOID CATEGORY

**Visual Identity:** Recognizable human-like forms with distinct armor, weapons, or magical abilities

**Silhouette Characteristics:**
- Clear head, torso, arms, legs
- Characteristic pose or stance
- Weapon or special ability visible
- Clothing/armor shapes readable
- Height > Width (taller than wide)
- Action pose preferred over static

**Outline Strategy:** BLACK (#000000)
- 1px solid outline for figure definition
- May break at cloth edges for softness
- Weapons get full outline
- Magical effects may use sel-out

**Eye Specifications:**
| Humanoid Type | Eye Color Primary | Eye Color Secondary | Eye Style |
|---------------|-------------------|---------------------|-----------|
| Pyro Cultist | #FF6600 (fire orange) | #FFCC00 (yellow) | Glowing from hood |
| Shadow Stalker | #FF44FF (hot magenta) | #FF88FF (pale) | Predator eyes |
| Ash Walker | #FFDD44 (yellow) | #FFFFFF (white) | Ancient, watchful |
| Shadow Imp | #FFAA00 (orange) | #FF6600 (red-orange) | Demonic, small |
| Void Touched | #CC88FF (pale purple) | #FFFFFF (void flash) | One eye consumed |
| Shield Bearer | #88CCFF (cyan) | #FFFFFF (white) | Through helmet slit |
| Temple Sentinel | #FFD700 (gold) | #FFFFFF (holy) | Ancient awakening |

**Color Palette Prescription:**

**Pyro Cultist - Fire Mage Palette (Target: 14 colors)**
```
Robe Ramp (5 colors):
  #442222 - Robe highlight (catches fire light)
  #331111 - Robe light
  #220808 - Robe midtone (deep red-black)
  #110404 - Robe shadow
  #000000 - Outline

Skin (if visible) (2 colors):
  #AA7755 - Skin base
  #775533 - Skin shadow

Fire Colors (7 colors):
  #FFFFFF - Fire core
  #FFFF88 - Fire bright
  #FFCC00 - Fire yellow
  #FF8800 - Fire orange
  #FF4400 - Fire red
  #FF6600 - Eye glow (from hood)
  #CC2200 - Fire edge
```

> **PALETTE RATIONALE:** The robe is intentionally near-black so the fire reads as the dominant element. Don't lighten the robe too much — the contrast between dark fabric and bright flame is the whole point. The cultist should feel like "darkness with fire," not "person holding fire." The deep red-black tones (not pure black) suggest the robe has absorbed heat over time.

**CRITICAL FOR PYRO CULTIST:**
The fire on hands is THE essential feature. Without it, this is just a dark silhouette.
- Fire should be 6-10 pixels at each hand position
- Fire must use bright yellows/oranges (NOT dark reds)
- Eyes should glow from within the hood
- Current sprite has NO fire - must add entirely

**Shield Bearer - Armored Warrior Palette (Target: 12 colors)**
```
Metal Ramp (5 colors):
  #CCCCDD - Metal highlight (polish)
  #9999AA - Metal light
  #666677 - Metal midtone
  #444455 - Metal shadow
  #222233 - Metal deep shadow

Shield/Accent (4 colors):
  #AA8866 - Wood/leather accent
  #776644 - Dark wood
  #88CCFF - Eye slit glow (BRIGHT)
  #FFFFFF - Eye highlight

Structure (3 colors):
  #554433 - Leather straps
  #000000 - Outline
  #111111 - Deepest crack
```

> **PALETTE RATIONALE:** Shield bearers are armored warriors — the metal palette uses cool blue-grays (not warm grays) to read as steel. The warm brown leather accents create material contrast. The cyan eye slit glow suggests magical vigilance; it's cold and unblinking, not human warmth.

**Ash Walker - Undead Warrior Palette (Target: 12 colors)**
```
Wrapping Ramp (5 colors):
  #AAAAAA - Wrapping highlight
  #888888 - Wrapping light
  #666666 - Wrapping midtone (ashen gray)
  #444444 - Wrapping shadow
  #222222 - Deep fold shadow

Accent Colors (7 colors):
  #FFDD44 - Eye primary (BRIGHT YELLOW)
  #FFFFFF - Eye highlight
  #FF8844 - Ember spots (scattered)
  #332211 - Decay/char marks
  #AA9988 - Exposed bone (if any)
  #888877 - Ash particles
  #000000 - Outline
```

> **PALETTE RATIONALE:** Ash walkers are mummified remains animated by lingering fire. The wrappings are deliberately neutral gray (no hue) because ash is what remains when all color burns away. The yellow eyes and orange ember spots provide the only warmth — these are the "still burning" elements within the dead husk.

**Essential Effects Checklist:**
- [ ] Eyes visible and glowing (key humanoid feature)
- [ ] Pose suggests intent (attacking, defending, casting)
- [ ] Weapon or special ability clearly visible
- [ ] Clothing/armor has depth (highlight + shadow)
- [ ] Face area has most visual interest
- [ ] Black outline for solid presence

**Common Mistakes to Avoid:**
- ❌ Static, neutral pose (should feel active)
- ❌ Missing the character's "signature" feature (Pyro's fire, Shield Bearer's shield)
- ❌ Eyes hidden or same brightness as face
- ❌ Monochrome palette (needs accent colors)
- ❌ Too small in canvas (humanoids should be ~28-30px tall)

---

### 2.5 BEAST CATEGORY

**Visual Identity:** Animal-like creatures with exaggerated features, predatory presence

**Silhouette Characteristics:**
- Clear animal archetype (bat, spider, lizard, etc.)
- Exaggerated dangerous features (fangs, claws, eyes)
- Dynamic pose suggesting motion or threat
- Varies by creature (flying, crawling, coiled)
- Multiple limbs clearly visible (legs, wings)

**Outline Strategy:** BLACK (#000000)
- 1px solid outline for definition
- May soften at fur/feather areas
- Claws and fangs get sharp definition

**Eye Specifications:**
| Beast Type | Eye Color Primary | Eye Color Secondary | Eye Style |
|------------|-------------------|---------------------|-----------|
| Cave Bat | #FF8888 (red) | #FFAAAA (pale red) | Beady, 2 dots |
| Fire Bat | #FFCC00 (yellow) | #FF8800 (orange) | Glowing, ember |
| Giant Spider | #FF4444 (red) | #FF8888 (pale red) | 6-8 clustered dots |
| Salamander | #FFDD44 (yellow) | #FF8800 (orange) | Alert, reptilian |
| Mushroom Sprite | #88FF88 (green) | #AAFFAA (pale green) | Hidden under cap |
| Deep Crawler | #FFFFFF (white) | #AADDFF (pale blue) | On stalks |
| Tide Serpent | #FFFF88 (yellow) | #88FF88 (green) | Predator slits |

**Color Palette Prescription:**

**Cave Bat - Dark Beast Palette (Target: 10 colors)**
```
Body Ramp (5 colors):
  #776655 - Fur highlight
  #554433 - Fur light
  #443322 - Fur midtone (brown)
  #332211 - Fur shadow
  #221100 - Deep shadow/ears

Accent Colors (5 colors):
  #FF8888 - Eye primary (red)
  #FFAAAA - Eye secondary
  #AA7766 - Ear interior
  #665544 - Wing membrane
  #000000 - Outline
```

> **PALETTE RATIONALE:** Cave bats are mundane dungeon creatures — no magical elements, just natural beast. The warm brown fur palette is simple and earthy. Red eyes provide the only "danger signal" contrast, suggesting night vision or aggression without being supernatural.

**Fire Bat - Flame Beast Palette (Target: 12 colors)**
```
Body Ramp (5 colors):
  #AA6633 - Fur highlight (warm)
  #884422 - Fur light
  #663311 - Fur midtone
  #441100 - Fur shadow
  #220000 - Deep shadow

Fire Wing Edge (4 colors):
  #FFFF88 - Fire bright
  #FFCC00 - Fire yellow
  #FF8800 - Fire orange
  #FF4400 - Fire edge

Accent Colors (3 colors):
  #FFCC00 - Eye primary (BRIGHT)
  #FFFFFF - Eye highlight
  #000000 - Outline
```

> **PALETTE RATIONALE:** Fire bats are cave bats infused with elemental fire. The body stays warm brown (suggesting fur that's slightly singed), but the wing edges trail actual flame. The fire at wing tips is what transforms this from "bat" to "dangerous elemental creature."

> **OUTLINE EXCEPTION:** Fire Bat uses a dual strategy — black outline on the solid body, but NO outline on the flame edges. The fire pixels extend beyond the body outline and fade naturally. Outlining the flames would make them look like painted-on decorations instead of actual fire.

**CRITICAL FOR FIRE BAT:**
Fire at wing edges is THE essential feature. Without it, this is just a brown bat.
- Fire pixels should line the outer wing edges
- Use yellows and oranges (brightest = #FFFF88)
- Currently has NO fire effects - must add entirely
- Also MUST remove the gray border artifact

**Giant Spider - Arachnid Palette (Target: 12 colors)**
```
Body Ramp (5 colors):
  #886655 - Carapace highlight
  #665544 - Carapace light
  #554433 - Body midtone
  #443322 - Body shadow
  #221100 - Deep shadow

Accent Colors (7 colors):
  #FF4444 - Eye primary (RED - multiple eyes!)
  #FF8888 - Eye secondary
  #FFFFFF - Eye highlight (tiny dots)
  #AA4433 - Fang color
  #FFDDCC - Fang tip
  #333322 - Leg joint shadow
  #000000 - Outline
```

> **PALETTE RATIONALE:** Giant spiders are natural predators with no magical elements. The brown-gray carapace palette is deliberately unsaturated — spiders don't advertise their presence. The ONLY bright elements should be the multiple red eyes and the fang tips. This creates "ambush predator" feel: mostly blending in, but those watching eyes...

**CRITICAL FOR GIANT SPIDER:**
Multiple clustered eyes (6-8) are THE essential feature.
- Eyes should be in tight cluster on head area
- Use varying sizes (1-2 pixels each)
- Red primary with white highlight dots
- Current sprite has NO visible eyes

**Mushroom Sprite - Fungi Palette (Target: 11 colors)**
```
Cap Ramp (4 colors):
  #DD5533 - Cap highlight (spotted)
  #BB3322 - Cap light
  #992211 - Cap midtone (red-brown)
  #661100 - Cap shadow

Stem/Body Ramp (4 colors):
  #DDCCAA - Stem highlight
  #BBAA88 - Stem light
  #998866 - Stem midtone
  #776644 - Stem shadow

Accent Colors (3 colors):
  #88FF88 - Eye glow (GREEN)
  #AAFFAA - Eye secondary
  #FFEECC - Cap spots (white/cream)
```

> **PALETTE RATIONALE:** Mushroom sprites are animated fungi — the cap is the distinctive feature (red-brown like a toadstool), while the stem/body is pale like a mushroom stalk. The green glowing eyes under the cap rim are bioluminescent, suggesting the magical animation that makes this mushroom move and attack.

**Essential Effects Checklist:**
- [ ] Eyes immediately visible (predator/prey awareness)
- [ ] Dangerous features emphasized (fangs, claws, fire)
- [ ] Animal type recognizable at 1x zoom
- [ ] Black outline for solid presence
- [ ] Dynamic pose suggesting movement
- [ ] Fills canvas appropriately (26-30px)

**Common Mistakes to Avoid:**
- ❌ Static pose (beasts should feel ready to move)
- ❌ Missing eye cluster on spider
- ❌ Fire bat without fire
- ❌ Salamander too small (must fill canvas)
- ❌ Eyes same color as body (must contrast)

---

### 2.6 UNDEAD CATEGORY

**Visual Identity:** Corpse-like beings with unnatural features, magical animation, and decay

**Silhouette Characteristics:**
- Recognizable "was once alive" form
- Decay or damage visible
- Magical element (ice crystals, void energy, soul glow)
- Stiff or unnatural pose
- May float or hover

**Outline Strategy:** BLACK (#000000)
- Standard outline for solid presence
- May fade for ethereal parts
- Magical effects can use sel-out

**Eye Specifications:**
| Undead Type | Eye Color Primary | Eye Color Secondary | Eye Style |
|-------------|-------------------|---------------------|-----------|
| Frozen Husk | #88DDFF (ice blue) | #FFFFFF (white) | Cold, hollow |
| (Bone Golem covered in Golems section) | | | |

**Color Palette Prescription:**

**Frozen Husk - Ice Undead Palette (Target: 12 colors)**
```
Flesh Ramp (4 colors):
  #99AAAA - Frozen flesh highlight
  #778899 - Frozen flesh light
  #556677 - Frozen flesh midtone (blue-gray)
  #334455 - Frozen flesh shadow

Ice Crystal Colors (4 colors):
  #FFFFFF - Ice highlight
  #DDEEFF - Ice light
  #AACCDD - Ice midtone
  #88AABB - Ice shadow

Accent Colors (4 colors):
  #88DDFF - Eye glow (BRIGHT BLUE)
  #FFFFFF - Eye highlight
  #445566 - Decay/dark areas
  #000000 - Outline
```

> **PALETTE RATIONALE:** Frozen husks are corpses preserved and animated by ice magic. The flesh uses desaturated blue-gray tones (frozen tissue loses color), while the ice crystals growing from the body use brighter, more saturated ice blues. The contrast between dead flesh and living ice crystals is the visual horror.

> **OUTLINE EXCEPTION:** Frozen Husk uses a dual strategy — black outline on the body/flesh, but sel-out (dark ice blue #334455) on the ice crystal protrusions. This allows the crystals to feel like they're growing FROM the body rather than outlined onto it.

**Essential Effects Checklist:**
- [ ] Eyes glow with unnatural light
- [ ] Magical element visible (ice, void, soul fire)
- [ ] Suggests "was once something else"
- [ ] Decay or damage evident
- [ ] Black outline for presence
- [ ] Contrast between dead flesh and magical glow

**Common Mistakes to Avoid:**
- ❌ Looking too "alive" (should feel wrong)
- ❌ Missing the magical animation element
- ❌ Eyes at same value as dead flesh
- ❌ No contrast between organic and magical parts
- ❌ Too symmetrical (decay should be irregular)

---

## Section 3: Per-Sprite Improvement Specifications

This section provides detailed fix cards for each of the 27 sprites. Each card includes the current state assessment, prioritized fix list, exact colors to add, and pixel-level instructions.

---

### TIER 1: CRITICAL SPRITES

---

#### 3.1 PYRO CULTIST
**File:** `assets/sprites/pyro_cultist-sprite.js`
**Priority:** TIER 1 - CRITICAL
**Estimated Time:** 90 minutes

**Current State:**
```
Colors: 4 (severely insufficient)
Current Palette: All very dark reds (#2A1A1A to #1A0A0A range)
What Works: Basic hooded figure silhouette
What's Broken: No fire on hands, no glowing eyes, too dark overall
Threat Level: VERY LOW (looks like a shadow, not a fire mage)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add fire on hands | 6-10 pixels per hand using #FFCC00, #FF8800, #FF4400 |
| CRITICAL | Add glowing eyes | 2 pixels #FF6600 with #FFCC00 highlight, visible from hood |
| HIGH | Expand palette | Add fire colors: #FFFFFF, #FFFF88, #FFCC00, #FF8800, #FF4400 |
| HIGH | Lighten robe slightly | Keep dark but add #442222 for folds catching firelight |
| MEDIUM | Add casting pose | Hands should be raised/extended, not at sides |

**Colors to Add:**
```
FIRE (must add - currently MISSING):
  #FFFFFF - Fire core (brightest, tiny)
  #FFFF88 - Fire bright
  #FFCC00 - Fire yellow (primary fire color)
  #FF8800 - Fire orange
  #FF4400 - Fire red edge

EYES:
  #FF6600 - Eye glow (from within hood)
  #FFCC00 - Eye highlight

ROBE ENHANCEMENT:
  #442222 - Robe catching firelight (highlight)
  #331111 - Robe fold (lighter than current)
```

**Pixel-Level Instructions:**
1. Locate the hand positions (should be around rows 18-22, columns 8-12 and 20-24)
2. Place fire pixels in a flame shape (narrower at base, wider at top)
3. Use brightest colors (#FFFF88, #FFCC00) at center, darker (#FF4400) at edges
4. For eyes: find the hood opening (around rows 6-8), place 2 pixels of #FF6600 with single #FFCC00 highlight
5. Add #442222 to robe areas that would catch firelight (near hands, hood edge)

**Emotional Conveyance:**
- Should feel: Dangerous, fanatical, heat radiating from hands
- Currently feels: Empty shadow, harmless silhouette
- After fix: Player should immediately see FIRE and GLOWING EYES

---

#### 3.2 OBSIDIAN GOLEM
**File:** `assets/sprites/obsidian_golem-sprite.js`
**Priority:** TIER 1 - CRITICAL
**Estimated Time:** 75 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Browns/tans (#A5A098 to #5A4735 range)
What Works: Large humanoid silhouette, fills canvas
What's Broken: NO GLOWING CRACKS (essential!), wrong color (should be gray/black, not brown)
Threat Level: LOW (looks like mud golem, not volcanic)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add glowing orange crack lines | 10-15 pixels of #FF6600, #FF9900 following body contours |
| CRITICAL | Change body color to dark gray | Replace browns with #2A2A30, #1A1A22 |
| HIGH | Add ember eyes | 2-4 pixels #FF6600 with #FFCC00 highlight |
| MEDIUM | Add obsidian gleam | Highlight pixels of #4A4A55 on edges |

**Colors to Add:**
```
BODY (replace current browns):
  #4A4A55 - Obsidian highlight (gleam)
  #363640 - Light gray
  #2A2A30 - Midtone (main body)
  #1A1A22 - Shadow
  #101015 - Deep shadow

FIRE CRACKS (must add - currently MISSING):
  #FFCC00 - Crack core (brightest)
  #FF9900 - Hot crack
  #FF6600 - Warm crack (MOST COMMON)
  #CC3300 - Cooling crack
  #661100 - Crack edge (coolest)

EYES:
  #FF6600 - Eye primary (ember)
  #FFCC00 - Eye highlight
```

> **COLOR MAPPING RATIONALE:** Obsidian is volcanic glass — near-zero saturation. To convert the current browns to grays, match by LIGHTNESS (L in HSL), not by position in the ramp. For each brown pixel, find the gray with equivalent lightness value. If current browns have 8 values but target grays have 5, merge the two darkest browns into the darkest gray, and the two lightest browns into the lightest gray. The fire cracks provide ALL the color; the body should be almost colorless.

**Pixel-Level Instructions:**
1. First, replace ALL brown tones with corresponding gray tones using the lightness-matching method above
2. Add crack lines following these paths:
   - Vertical crack down torso center (3-4 pixels)
   - Diagonal crack across each arm (2-3 pixels each)
   - Cracks at joint areas (shoulders, elbows if visible)
3. Crack should be brightest (#FFCC00) at center, fade to #661100 at edges
4. Place eyes in head area (rows 5-8), ember orange with yellow highlight
5. Add highlight pixels (#4A4A55) at top-left edges where light catches

**Emotional Conveyance:**
- Should feel: Volcanic, powerful, heat radiating from cracks, ancient
- Currently feels: Muddy, lifeless, could be any golem
- After fix: Player should immediately see GLOWING FIRE VEINS and feel HEAT

---

#### 3.3 CAVE BAT
**File:** `assets/sprites/cave_bat-sprite.js`
**Priority:** TIER 1 - CRITICAL
**Estimated Time:** 45 minutes

**Current State:**
```
Colors: 3 (severely insufficient)
Current Palette: Grays only
What Works: Basic bat wing shape
What's Broken: GRAY BORDER ARTIFACT, only 3 colors, no eyes, no ears
Threat Level: VERY LOW (looks like a placeholder)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Remove gray border | Delete all pixels on outer edge that create rectangle |
| CRITICAL | Add beady eyes | 2 pixels #FF8888 with tiny #FFAAAA highlights |
| HIGH | Expand palette | Add browns for fur, multiple tones |
| HIGH | Add ear points | 2-3 pixels at top of head forming ear shapes |
| MEDIUM | Add black outline | Clean #000000 outline on outer edges |

**Colors to Add:**
```
BODY:
  #776655 - Fur highlight
  #554433 - Fur light
  #443322 - Fur midtone
  #332211 - Fur shadow
  #221100 - Deep shadow/ears

ACCENTS:
  #FF8888 - Eye primary (beady red)
  #FFAAAA - Eye highlight
  #AA7766 - Ear interior
  #665544 - Wing membrane
  #000000 - Outline
```

**Pixel-Level Instructions:**
1. FIRST: Identify and delete all border artifact pixels (look for rectangle shape at edges)
2. Add ear points at top of head (2-3 pixels triangular shapes)
3. Place eyes near front of head (2 pixels each, close together)
4. Add body fur texture using multiple brown tones
5. Add wing membrane detail (lighter inner area)
6. Apply clean black outline to final shape

**Emotional Conveyance:**
- Should feel: Quick, dangerous in swarms, chittering threat
- Currently feels: Broken placeholder asset
- After fix: Player should see glinting red eyes in the dark

---

#### 3.4 FIRE BAT
**File:** `assets/sprites/fire_bat-sprite.js`
**Priority:** TIER 1 - CRITICAL
**Estimated Time:** 60 minutes

**Current State:**
```
Colors: 7 (borderline)
Current Palette: Warm browns
What Works: Basic bat silhouette, warm tones
What's Broken: GRAY BORDER ARTIFACT, NO FIRE at wings, no eyes
Threat Level: LOW (just a brown bat)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Remove gray border | Delete all border artifact pixels |
| CRITICAL | Add fire at wing edges | 8-12 pixels of #FFFF88, #FFCC00, #FF8800 along wing tips |
| CRITICAL | Add glowing eyes | 2 pixels #FFCC00 with #FFFFFF highlight |
| HIGH | Add flame trail | 2-3 pixels behind/below for motion |
| MEDIUM | Black outline | Clean edge definition |

**Colors to Add:**
```
FIRE (must add - currently MISSING):
  #FFFF88 - Fire bright (wing tips)
  #FFCC00 - Fire yellow
  #FF8800 - Fire orange
  #FF4400 - Fire edge

EYES:
  #FFCC00 - Eye primary (BRIGHT)
  #FFFFFF - Eye highlight

STRUCTURE:
  #000000 - Outline
```

> **OUTLINE EXCEPTION:** This sprite uses a dual outline strategy — black (#000000) on the solid bat body, but NO outline on the flame pixels. The fire extends beyond the body silhouette and fades naturally at the edges. Outlining the flames would make them look painted-on rather than actual fire.

**Pixel-Level Instructions:**
1. FIRST: Remove all gray border artifact pixels
2. Add fire pixels along outer wing edges in flame shapes
   - Brightest (#FFFF88) at tips
   - Gradient inward (#FFCC00 → #FF8800 → #FF4400)
3. Place eyes in head area - glowing yellow/white
4. Add 2-3 trailing fire pixels below body for motion
5. Apply black outline to body ONLY (fire stays outside outline, unoutlined)

**Emotional Conveyance:**
- Should feel: Elemental, dangerous, fire spreading with each flap
- Currently feels: Brown bat with nothing special
- After fix: Player should see FLAMES trailing from wings

---

#### 3.5 TOXIC SLIME
**File:** `assets/sprites/toxic_slime-sprite.js`
**Priority:** TIER 1 - CRITICAL
**Estimated Time:** 60 minutes

**Current State:**
```
Colors: 4 (severely insufficient)
Current Palette: #D7F942, #B6D128, #8CA323, #5F8A22
What Works: Basic yellow-green colors (correct for toxic)
What's Broken: Only 4 colors (too flat), no eyes, no drips, no internal glow
Threat Level: VERY LOW (looks like slime placeholder)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add glowing eyes | 2-3 pixels #CCFF44 with #FFFFFF highlight |
| CRITICAL | Expand palette to 12 | Add highlights, shadows, effect colors |
| HIGH | Add acid drip shapes | 2-4 drip formations at bottom |
| HIGH | Add internal glow | Brighter center (#EEFF88) fading outward |
| MEDIUM | Add sel-out outline | Dark green outline, not black |

**Colors to Add:**
```
BODY EXPANSION:
  #EEFF88 - Highlight (surface gleam)
  #DDEE66 - Light (brighter than current)
  [Keep existing midtones]
  #446600 - Shadow (darker)
  #224400 - Deep shadow

ACCENTS:
  #CCFF44 - Eye primary (BRIGHTEST lime)
  #FFFFFF - Eye highlight
  #AAFF00 - Internal glow
  #112200 - Sel-out outline
  #DDFF66 - Bubble highlights
```

**Pixel-Level Instructions:**
1. Add new colors to create fuller gradient
2. Place eyes in upper area (2-3 pixels lime green with white highlight)
3. Create 2-4 drip shapes at bottom (pointed, hanging down)
4. Make center area brighter (internal glow)
5. Add small bubble detail pixels (1-2 pixels scattered)
6. Apply sel-out outline using #112200 (not black)

**Emotional Conveyance:**
- Should feel: Corrosive, bubbling, don't-touch-me dangerous
- Currently feels: Flat green blob
- After fix: Player should see glowing toxic eyes and feel the acid

---

#### 3.6 SHADOW WISP
**File:** `assets/sprites/shadow_wisp-sprite.js`
**Priority:** TIER 1 - CRITICAL
**Estimated Time:** 45 minutes

**Current State:**
```
Colors: 3 (severely insufficient)
Current Palette: Purple tones only
What Works: Amorphous shape, purple coloring
What's Broken: Only 3 colors, NO EYES (need 2-4 magenta), no wispy edges
Threat Level: VERY LOW (purple smudge)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add magenta eyes | 2-4 pixels #FF44FF creating alien feel |
| CRITICAL | Expand palette | Need 10 colors minimum |
| HIGH | Add wispy edge pixels | Scattered single pixels at edges |
| MEDIUM | Inverted lighting | Center darker, edges lighter |

**Colors to Add:**
```
BODY:
  #8844AA - Core (darkest - inverted!)
  #6633AA - Inner body
  #553388 - Midtone
  #442266 - Fade zone
  #331144 - Outer wisp

ACCENTS:
  #FF44FF - Eye primary (HOT MAGENTA - must pop!)
  #FF88FF - Eye secondary
  #AA55CC - Internal energy
  #442255 - Dark spots
  #220033 - Deepest void
```

**Pixel-Level Instructions:**
1. Restructure body with inverted lighting (center is DARKER)
2. Add 2-4 eye pixels using #FF44FF - these MUST be brightest in sprite
3. Eyes can be asymmetric (2 on one side, 1 on other) for alien feel
4. Scatter individual pixels at edges for wispy effect (using lighter purples)
5. NO hard outline - edges should fade naturally

**Emotional Conveyance:**
- Should feel: Otherworldly, watching, alien intelligence
- Currently feels: Purple blob
- After fix: Player should see GLOWING MAGENTA EYES staring

---

#### 3.7 FROST ELEMENTAL
**File:** `assets/sprites/frost_elemental-sprite.js`
**Priority:** TIER 1 - CRITICAL
**Estimated Time:** 60 minutes

**Current State:**
```
Colors: 4 (severely insufficient)
Current Palette: Light blues only (all similar values)
What Works: Wispy/ethereal appearance
What's Broken: Only 4 colors, no eyes, no central bright form, colors too similar
Threat Level: VERY LOW (blue smudge)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add bright white eyes | 2 pixels #FFFFFF with #AAEEFF glow |
| CRITICAL | Add contrast | Needs white core vs darker edges |
| HIGH | Expand palette | 10 colors with proper value range |
| MEDIUM | Add ice particle effects | Scattered bright pixels |

**Colors to Add:**
```
BODY (need better value range):
  #FFFFFF - Core (brightest, center)
  #DDEEFF - Inner glow
  #99CCEE - Midtone body
  #6699AA - Fade zone
  #446677 - Outer wisp

ACCENTS:
  #FFFFFF - Eye primary (BRIGHTEST)
  #AAEEFF - Eye secondary/glow
  #88DDFF - Ice particle effects
  #66BBDD - Swirl details
  #335566 - Darkest edge
```

**Pixel-Level Instructions:**
1. Rebuild body with proper value gradient (bright center, fade outward)
2. Place eyes prominently - 2 pixels pure white with cyan glow around
3. Scatter ice particle pixels (#88DDFF) at edges
4. Central core should be brightest area (white/pale blue)
5. NO hard outline - ethereal creature
6. Edge pixels should be scattered (wispy, not solid line)

**Emotional Conveyance:**
- Should feel: Cold, elemental power, biting frost
- Currently feels: Blue smear
- After fix: Player should see ICY WHITE EYES and feel the COLD

---

### TIER 2: HIGH PRIORITY SPRITES

---

#### 3.8 MAGMA SLIME
**File:** `assets/sprites/magma_slime-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Good orange-red gradient
What Works: Fire palette is correct, drip shapes present, fills canvas
What's Broken: NO EYES, highlight band needs eye dots
Threat Level: LOW (no personality without eyes)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add bright yellow eyes | 2 pixels #FFFF44 with #FFFFFF highlight |
| MEDIUM | Enhance highlight band | Brighten surface gleam areas |
| LOW | Add internal glow | Brighter center core |

**Colors to Add:**
```
EYES:
  #FFFF44 - Eye primary (BRIGHT YELLOW)
  #FFFFFF - Eye highlight (tiny dot)

ENHANCEMENT:
  #FFE4AA - Surface highlight (if not present)
```

**Pixel-Level Instructions:**
1. Locate upper center of slime (rows 6-10)
2. Place 2 eye pixels using #FFFF44, 3-4 pixels apart
3. Add #FFFFFF highlight dot on upper-right of each eye
4. Ensure eyes are brighter than any body pixel

---

#### 3.9 FROST SLIME
**File:** `assets/sprites/frost_slime-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 45 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Good ice blue gradient
What Works: Ice colors, some angular elements
What's Broken: NO EYES, crystalline spikes not clearly defined
Threat Level: LOW (no menace without eyes)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add cyan/white eyes | 2 pixels #AAEEFF with #FFFFFF highlight |
| HIGH | Define crystalline spikes | Sharper angular protrusions at top |
| MEDIUM | Add frost gleam | Brightest highlight pixels on spikes |

**Colors to Add:**
```
EYES:
  #AAEEFF - Eye primary (BRIGHT CYAN)
  #FFFFFF - Eye highlight

SPIKES:
  #FFFFFF - Spike highlight tip
```

**Pixel-Level Instructions:**
1. Add eyes in upper area using cyan with white highlight
2. Enhance top edge to form 2-3 clear spike shapes
3. Add white highlight pixels at spike tips

---

#### 3.10 STONE GOLEM
**File:** `assets/sprites/stone_golem-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Good earth tones
What Works: Blocky shape, stone colors, fills canvas
What's Broken: NO GLOWING EYES, no rune carvings
Threat Level: LOW (statue, not guardian)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add glowing amber eyes | 2-4 pixels #FFDD88 with #FFFFFF highlight |
| MEDIUM | Add rune marks | 3-5 pixels of #88CCFF for ancient markings |
| LOW | Add weathering | Moss/crack detail pixels |

**Colors to Add:**
```
EYES:
  #FFDD88 - Eye primary (AMBER)
  #FFFFFF - Eye highlight

RUNES:
  #88CCFF - Rune glow (cyan-blue)
```

---

#### 3.11 ICE GOLEM
**File:** `assets/sprites/ice_golem-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 45 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Good ice tones
What Works: Some angular shapes, ice coloring
What's Broken: NO EYES, faceted body not clearly defined, no internal glow
Threat Level: LOW (ice shape, not creature)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add bright cyan eyes | 2-4 pixels #AAEEFF with #FFFFFF highlight |
| HIGH | Define faceted edges | Sharper edge highlights |
| MEDIUM | Add internal blue glow | Brighter core area |

**Colors to Add:**
```
EYES:
  #AAEEFF - Eye primary (BRIGHT CYAN)
  #FFFFFF - Eye highlight

CORE:
  #66DDFF - Internal glow
```

---

#### 3.12 BONE GOLEM
**File:** `assets/sprites/bone_golem-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 45 minutes

**Current State:**
```
Colors: 9 (acceptable)
Current Palette: Bone tones with some variation
What Works: Large silhouette, bone coloring
What's Broken: NO SOUL GLOW CORE, multiple skulls not clearly visible
Threat Level: LOW (bone pile, not necromantic construct)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add soul glow in chest | 3-5 pixels #44FF88 with #88FFAA outer glow |
| HIGH | Define skull shapes | Add eye socket details on visible skulls |
| MEDIUM | Add hollow eye sockets | Dark spots with green glow |

**Colors to Add:**
```
SOUL:
  #44FF88 - Soul glow primary (GREEN)
  #88FFAA - Soul glow secondary
  #22CC66 - Soul core
```

---

#### 3.13 SHADOW STALKER
**File:** `assets/sprites/shadow_stalker-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 6 (insufficient)
Current Palette: Purple shadow tones
What Works: Quadruped predator shape visible, wispy edges
What's Broken: NO PREDATOR EYES (need bright magenta)
Threat Level: MEDIUM (has form but no intent without eyes)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add bright magenta eyes | 2 pixels #FF44FF at head |
| HIGH | Enhance wispy edges | More scattered edge pixels |
| MEDIUM | Add sharp claw accents | Brighter claw tips |

> **OUTLINE EXCEPTION:** Shadow Stalker is an ethereal predator, not a solid humanoid. Use sel-out (dark purple #331144) instead of black outline. The wispy edges should scatter into individual pixels at the extremities — no clean line. This makes it feel like shadow solidifying into predator form, not a purple-painted wolf.

**Colors to Add:**
```
EYES:
  #FF44FF - Eye primary (HOT MAGENTA)
  #FF88FF - Eye secondary

OUTLINE:
  #331144 - Sel-out (NOT black)
```

---

#### 3.14 SHADOW IMP
**File:** `assets/sprites/shadow_imp-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 45 minutes

**Current State:**
```
Colors: 6 (insufficient)
Current Palette: Purple/shadow
What Works: Basic small demonic shape
What's Broken: NO EYES, horns not clearly defined, wings muddy
Threat Level: LOW (shadow blob)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add glowing orange eyes | 2 pixels #FFAA00 |
| HIGH | Define horn points | Sharper horn shapes at head |
| HIGH | Define wing shape | Clearer wing silhouette |

**Colors to Add:**
```
EYES:
  #FFAA00 - Eye primary (ORANGE)
  #FF6600 - Eye secondary

HORNS:
  Brightest purple for horn tips
```

---

#### 3.15 PHANTOM
**File:** `assets/sprites/phantom-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 4 (insufficient)
Current Palette: Pale blues
What Works: Humanoid upper body, fades toward bottom (correct!)
What's Broken: NO HOLLOW EYES WITH GLOW
Threat Level: LOW (ghost shape but no menace)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add hollow eye glow | Dark sockets (#334455) with #AACCFF glow |
| HIGH | Enhance fade effect | More gradual bottom fade |
| MEDIUM | Add reaching arms | Ghostly arm shapes |

**Colors to Add:**
```
EYES:
  #AACCFF - Eye socket glow
  #FFFFFF - Eye highlight
  #334455 - Hollow socket darkness
```

---

#### 3.16 GIANT SPIDER
**File:** `assets/sprites/giant_spider-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Good browns/grays
What Works: Clear spider shape, multiple legs visible
What's Broken: NO CLUSTERED EYES (6-8), fangs not clear
Threat Level: MEDIUM (shape is right but no menace)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add 6-8 clustered eyes | Multiple #FF4444 pixels with #FFFFFF highlights |
| HIGH | Define fangs | Fang pixels with bright tips |
| LOW | Add furry texture | Dithering on body |

**Colors to Add:**
```
EYES (MULTIPLE):
  #FF4444 - Eye primary (RED)
  #FF8888 - Eye secondary
  #FFFFFF - Eye highlight dots

FANGS:
  #AA4433 - Fang color
  #FFDDCC - Fang tip highlight
```

**Pixel-Level Instructions:**
1. Locate head area (front of spider)
2. Place 6-8 eye pixels in a clustered formation
3. Vary sizes (some 1 pixel, some 2)
4. Add tiny white highlight dots on 2-3 largest eyes
5. This eye cluster is THE essential spider feature

---

#### 3.17 FROZEN HUSK
**File:** `assets/sprites/frozen_husk-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Ice and flesh blend
What Works: Ice crystals present, frozen humanoid shape
What's Broken: NO BLUE GLOWING EYES
Threat Level: LOW (frozen body, no undead menace)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add blue glowing eyes | 2 pixels #88DDFF with #FFFFFF highlight |
| MEDIUM | Enhance ice crystals | Brighter crystal highlights |
| LOW | Add stiff pose quality | More angular limb positions |

> **OUTLINE EXCEPTION:** Frozen Husk uses a dual strategy — black outline (#000000) on the body/flesh portions, but sel-out (dark ice blue #334455) on the ice crystal protrusions. This allows the crystals to feel like they're growing FROM the body rather than outlined onto it. Where flesh meets crystal, the outline should transition from black to sel-out.

**Colors to Add:**
```
EYES:
  #88DDFF - Eye primary (ICE BLUE)
  #FFFFFF - Eye highlight

OUTLINE:
  #000000 - Body outline (black)
  #334455 - Crystal outline (sel-out, dark ice)
```

---

#### 3.18 SHIELD BEARER
**File:** `assets/sprites/shield_bearer-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 7 (insufficient)
Current Palette: Monochrome grays
What Works: Shield silhouette visible, armored shape
What's Broken: MONOCHROME (needs accent colors), no eye slit glow, no weapon
Threat Level: LOW (gray statue)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add eye slit glow | 2-3 pixels #88CCFF at helmet slit |
| HIGH | Add weapon | Sword/axe silhouette |
| HIGH | Add accent colors | Brown leather, metal sheen |

**Colors to Add:**
```
EYES:
  #88CCFF - Eye slit glow (CYAN)
  #FFFFFF - Eye highlight

ACCENTS:
  #AA8866 - Leather/wood
  #CCCCDD - Metal polish highlight
```

---

#### 3.19 TIDE SERPENT
**File:** `assets/sprites/tide_serpent-sprite.js`
**Priority:** TIER 2 - HIGH
**Estimated Time:** 45 minutes

**Current State:**
```
Colors: 5 (insufficient)
Current Palette: Teal/blue tones
What Works: Serpentine coil shape, water colors
What's Broken: Only 5 colors, NO PREDATORY EYES, dorsal fin unclear
Threat Level: LOW (sea worm, not sea serpent)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add predatory eyes | 2 pixels #FFFF88 with vertical slit pupil |
| HIGH | Expand palette | Need 10+ colors |
| HIGH | Define dorsal fin | Clear fin ridge along back |
| MEDIUM | Add fanged mouth | Open maw with fang detail |

**Colors to Add:**
```
EYES:
  #FFFF88 - Eye primary (YELLOW)
  #88FF88 - Eye secondary (green tint)
  #222222 - Vertical pupil slit

BODY:
  Additional scale colors for gradient
```

---

### TIER 3: MEDIUM PRIORITY SPRITES

---

#### 3.20 CRYSTAL GOLEM
**File:** `assets/sprites/crystal_golem-sprite.js`
**Priority:** TIER 3 - MEDIUM
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Purple/pink crystal tones
What Works: Faceted appearance, light refraction implied
What's Broken: White core glow not bright enough, needs more eye definition
Threat Level: LOW (pretty crystal, not threat)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add bright white eyes/core | Pure #FFFFFF at core |
| MEDIUM | Add refraction colors | Scattered prismatic pixels |
| LOW | Enhance facet edges | Sharper edge definition |

> **OUTLINE EXCEPTION:** Despite being a golem (normally black outline), Crystal Golem uses sel-out (dark purple #332244) to preserve the gem-like, light-refracting quality. A black outline would make the crystal look solid and opaque. The sel-out should match the darkest body shadow color.

**Colors to Add:**
```
CORE:
  #FFFFFF - Pure white core (BRIGHTEST)
  #FFAAFF - Eye accent (pink)

OUTLINE:
  #332244 - Sel-out (dark purple, NOT black)
```

---

#### 3.21 TEMPLE SENTINEL
**File:** `assets/sprites/temple_sentinel-sprite.js`
**Priority:** TIER 3 - MEDIUM
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Gold/bronze accents present
What Works: Ancient aesthetic, gold/stone mix
What's Broken: No glowing golden eyes
Threat Level: MEDIUM (has presence, needs awakening indicator)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add golden eye glow | 2-4 pixels #FFD700 with #FFFFFF |
| MEDIUM | Enhance rune glow | Brighter rune accents |

**Colors to Add:**
```
EYES:
  #FFD700 - Eye primary (GOLD)
  #FFFFFF - Eye highlight
```

---

#### 3.22 VOID TOUCHED
**File:** `assets/sprites/void_touched-sprite.js`
**Priority:** TIER 3 - MEDIUM
**Estimated Time:** 45 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Good purple void range
What Works: Warped proportions, vertical elongated form
What's Broken: Void energy not clearly glowing, eyes unclear
Threat Level: MEDIUM (disturbing shape, needs more void effect)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add asymmetric eyes | One eye #CC88FF, one side consumed |
| HIGH | Add void energy glow | Brighter #AA66FF energy areas |
| MEDIUM | Enhance consumed effect | One side dissolving |

**Colors to Add:**
```
EYES/VOID:
  #CC88FF - Eye glow (pale purple)
  #FFFFFF - Void flash
  #AA66FF - Void energy
```

---

#### 3.23 MUSHROOM SPRITE
**File:** `assets/sprites/mushroom_sprite-sprite.js`
**Priority:** TIER 3 - MEDIUM
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 7 (borderline)
Current Palette: Good nature green/brown
What Works: Distinctive mushroom cap shape
What's Broken: NO EYES UNDER CAP, legs not clearly defined
Threat Level: LOW (cute mushroom, not threat)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add glowing eyes under cap | 2 pixels #88FF88 in shadow under cap rim |
| MEDIUM | Define stubby legs | Clearer leg shapes |
| LOW | Add spore particles | Scattered pixels around |

**Colors to Add:**
```
EYES:
  #88FF88 - Eye glow (GREEN)
  #AAFFAA - Eye secondary
```

---

#### 3.24 DEEP CRAWLER
**File:** `assets/sprites/deep_crawler-sprite.js`
**Priority:** TIER 3 - MEDIUM
**Estimated Time:** 30 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Good teal/crustacean colors
What Works: Pincer claws visible, crustacean shape
What's Broken: NO EYE STALKS (essential feature)
Threat Level: MEDIUM (has form, needs eyes)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Add eye stalks | 2-4 pixels #FFFFFF on stalks |
| MEDIUM | Add wet sheen | Highlight pixels for moisture |

**Colors to Add:**
```
EYES:
  #FFFFFF - Eye primary (on stalks)
  #AADDFF - Stalk color
```

---

#### 3.25 SALAMANDER
**File:** `assets/sprites/salamander-sprite.js`
**Priority:** TIER 3 - MEDIUM
**Estimated Time:** 45 minutes

**Current State:**
```
Colors: 8 (borderline)
Current Palette: Fire-appropriate colors
What Works: Lizard body shape, fire colors
What's Broken: TOO SMALL (~25% of canvas), no eyes
Threat Level: LOW (tiny fire lizard)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| CRITICAL | Scale up to fill canvas | Should be 26-28px |
| CRITICAL | Add alert eyes | 2 pixels #FFDD44 at head |
| HIGH | Define long tail | Clear tail extension |

**Colors to Add:**
```
EYES:
  #FFDD44 - Eye primary (YELLOW)
  #FF8800 - Eye secondary
```

---

### TIER 4: POLISH SPRITES

---

#### 3.26 ASH WALKER
**File:** `assets/sprites/ash_walker-sprite.js`
**Priority:** TIER 4 - POLISH
**Estimated Time:** 15 minutes

**Current State:**
```
Colors: 9 (PASSES!)
Current Palette: Good ashen grays with green eye (#A7C44F)
What Works: HAS EYES (best sprite!), good mummy-like silhouette
What's Minor: Eye color is green, guide suggests yellow
Threat Level: MEDIUM (actually looks like a threat!)
```

**Required Fixes:**

| Priority | Fix | Details |
|----------|-----|---------|
| LOW | Adjust eye color | Change #A7C44F to #FFDD44 (yellow) |
| LOW | Add ember spots | 2-3 scattered #FF8844 pixels |
| LOW | Enhance ash particles | Light gray pixels at feet |

**Colors to Adjust:**
```
Current: #A7C44F (green eyes)
Target:  #FFDD44 (yellow eyes per guide)

Add:
  #FF8844 - Ember spots (2-3 pixels)
```

---

#### 3.27 (Additional sprites in later passes)

*The remaining sprites (if any beyond the 26 reviewed) should be assessed and added to the appropriate tier.*

---

## Section 3 Summary: Priority Matrix

```
╔═══════════════════════════════════════════════════════════════════════╗
║                    SPRITE FIX PRIORITY MATRIX                          ║
╠═══════════════════════════════════════════════════════════════════════╣
║ TIER 1 CRITICAL (Fix Immediately) - 7 sprites, ~7.25 hours            ║
║   • Pyro Cultist (90 min) - Add fire + eyes                           ║
║   • Obsidian Golem (75 min) - Add cracks + recolor                    ║
║   • Cave Bat (45 min) - Remove border + eyes                          ║
║   • Fire Bat (60 min) - Remove border + fire + eyes                   ║
║   • Toxic Slime (60 min) - Expand palette + eyes                      ║
║   • Shadow Wisp (45 min) - Add magenta eyes                           ║
║   • Frost Elemental (60 min) - Add contrast + eyes                    ║
╠═══════════════════════════════════════════════════════════════════════╣
║ TIER 2 HIGH (Fix This Sprint) - 12 sprites, ~7.25 hours               ║
║   • Magma Slime (30 min)      • Shadow Stalker (30 min)               ║
║   • Frost Slime (45 min)      • Shadow Imp (45 min)                   ║
║   • Stone Golem (30 min)      • Phantom (30 min)                      ║
║   • Ice Golem (45 min)        • Giant Spider (30 min)                 ║
║   • Bone Golem (45 min)       • Frozen Husk (30 min)                  ║
║   • Shield Bearer (30 min)    • Tide Serpent (45 min)                 ║
╠═══════════════════════════════════════════════════════════════════════╣
║ TIER 3 MEDIUM (Polish Sprint) - 6 sprites, ~3.5 hours                 ║
║   • Crystal Golem (30 min)    • Mushroom Sprite (30 min)              ║
║   • Temple Sentinel (30 min)  • Deep Crawler (30 min)                 ║
║   • Void Touched (45 min)     • Salamander (45 min)                   ║
╠═══════════════════════════════════════════════════════════════════════╣
║ TIER 4 POLISH (Final Pass) - 1 sprite, ~0.75 hours                    ║
║   • Ash Walker (45 min total) - Eye color + ember particles           ║
╠═══════════════════════════════════════════════════════════════════════╣
║                         TOTAL: ~18.75 hours                            ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## Appendix: Eye Color Quick Reference

Use this table when adding eyes to any sprite:

| Element/Type | Primary Eye Color | Hex Code | Secondary | Style |
|--------------|-------------------|----------|-----------|-------|
| **Fire** | Bright Yellow | #FFFF44 | #FFFFFF | Round dots |
| **Ice** | Bright Cyan | #AAEEFF | #FFFFFF | Angular |
| **Shadow** | Hot Magenta | #FF44FF | #FF88FF | Multiple (alien) |
| **Earth/Stone** | Amber | #FFDD88 | #FFFFFF | Round, ancient |
| **Toxic** | Lime Green | #CCFF44 | #FFFFFF | Asymmetric |
| **Undead** | Soul Green | #44FF88 | #88FFAA | Hollow sockets |
| **Water** | Yellow with pupil | #FFFF88 | #222222 (pupil) | Vertical slit |
| **Obsidian** | Ember Orange | #FF6600 | #FFCC00 | Horizontal slit |
| **Crystal** | Pure White | #FFFFFF | #FFAAFF | Faceted |
| **Gold/Holy** | Golden | #FFD700 | #FFFFFF | Divine glow |

---

## Final Notes for Art Team

### The Golden Rule
**Every monster sprite MUST have visible eyes that are the brightest element in the sprite.**

This single change transforms sprites from "things in a dungeon" to "creatures that want to kill you."

### The Hierarchy of Visual Impact
1. **Eyes** - First thing player notices
2. **Silhouette** - What type of creature?
3. **Signature Effect** - Fire, ice, glow, etc.
4. **Color** - Element/affiliation
5. **Detail** - Texture, secondary features

### Before/After Mindset
When reviewing your work, ask:
- BEFORE: "Does this look like a placeholder?"
- AFTER: "Does this look like it wants to kill me?"

If the answer to the second question is "no," the sprite needs more work.

---

*Art Team Improvement Guide - Version 1.0*
*Generated for The Shifting Chasm project*
*Reference: docs/MONSTER_VISUAL_DESIGN_GUIDE.md*
