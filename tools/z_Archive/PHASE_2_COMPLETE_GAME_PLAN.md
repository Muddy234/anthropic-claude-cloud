# The Shifting Chasm — Phase 2: Complete Single-Player Game

## Context

Phase 1 (MVP Playtest, Tiers 0-4) delivers a playable 10-floor gauntlet: menu → village → dungeon → death/victory → village. Phase 2 takes that functional skeleton and builds it into a **complete, shippable single-player experience**. Multiplayer is explicitly deferred to Phase 3.

### What Phase 1 Delivers
- Game boots and main menu works
- Village hub with shops, banking, NPC dialogue
- 10-floor dungeon descent with combat, loot, floor advancement
- Death (lose items/gold) and victory (keep everything) flow
- Skill persistence across death
- Basic HUD, damage numbers, controls reference

### What Phase 2 Must Deliver
- Every deferred system brought online and integrated
- Content volume sufficient for 40-60 runs before repetition feels stale
- Narrative arc from village crisis to Core boss victory
- Polished feel: audio, visual effects, time slow, barks, kill streaks
- All weapon types, armor types, and builds viable
- Crafting, quests, bounties, boons — the full between-run and within-run progression

---

## TIER A — SYSTEM INTEGRATION (Bring Deferred Systems Online)

*These systems are 70-90% coded but disconnected from gameplay. The work is integration, not creation.*

### A.1 Boon System Integration (85% complete → 100%)
**Why:** Boons are the primary within-run power curve. Without them, every run feels the same regardless of choices made inside the dungeon.

**Current State:** 7 Ancestors, 70 boons, 3 tiers all defined. Shrine interaction hooks exist. Nothing spawns.

**Work Required:**
- [ ] Wire shrine spawning into dungeon generator (2-4 shrines per floor, placed in treasure rooms)
- [ ] Connect shrine interaction to boon selection UI (offer 3 choices from relevant Ancestor)
- [ ] Verify all 70 boon effects actually apply to player stats correctly
- [ ] Add boon icons to HUD (show active boons, max 8)
- [ ] Confirm boons clear on death
- [ ] Add boon summary to victory/death screens
- [ ] Test Ancestor synergy bonuses (stacking boons from same Ancestor)

**Files:** `js/systems/boon-system.js`, `js/generation/dungeon-generator.js`, `js/ui/renderer.js`

**Verification:** Find shrine → interact → choose boon → stat change visible on character sheet → die → boons gone.

---

### A.2 Quest System Integration (75% → 100%)
**Why:** Quests give the player directed goals beyond "go deeper." They provide narrative context and reward structure.

**Current State:** 14 quests defined (4 main story, 10 side). Quest state machine works. Zero integration with gameplay events.

**Work Required:**
- [ ] Wire quest event hooks into combat system (kill tracking), loot system (collection tracking), and floor advancement (exploration tracking)
- [ ] Connect NPC quest givers — Elder for main story, other NPCs for side quests
- [ ] Implement quest reward delivery (gold → player, items → inventory, XP → skills)
- [ ] Add quest prerequisite chains (main story gates on floor reached + previous quest complete)
- [ ] Render quest tracker in dungeon HUD (active quest name + progress)
- [ ] Add quest journal UI accessible from village (press J or via character sheet)
- [ ] Quest completion dialogue with NPC on return to village
- [ ] Write 10-15 additional side quests to reach target of 25+ total

**Files:** `js/systems/quest-system.js`, `js/ui/quest-ui.js`, `js/data/quests.js`, `js/data/npcs.js`

**Verification:** Talk to Elder → accept quest → enter dungeon → kill required enemies → return to village → turn in quest → receive reward.

---

### A.3 Crafting System Integration (80% → 100%)
**Why:** Crafting gives materials value. Without it, material drops are inventory clutter.

**Current State:** 44 recipes defined across 5 categories. Crafting UI exists. System never initialized.

**Work Required:**
- [ ] QA pass: verify every recipe output key matches an entry in ITEMS_DATA/weapons/armor data
- [ ] Wire Blacksmith NPC dialogue to open crafting UI
- [ ] Connect crafting to player inventory (consume materials, produce item)
- [ ] Add crafting result to inventory with proper stats
- [ ] Implement tier gating (recipes unlock based on deepest floor reached or guardian defeats)
- [ ] Add "recipe discovered" notifications when player first picks up a key material
- [ ] Save learned recipes to persistentState
- [ ] Visual/audio feedback on craft success

**Files:** `js/systems/crafting-system.js`, `js/ui/crafting-ui.js`, `js/data/crafting-data.js`

**Verification:** Collect materials in dungeon → return to village → talk to Blacksmith → craft weapon → weapon appears in inventory with correct stats.

---

### A.4 Bounty Board Integration (60% → 100%)
**Why:** Bounties add replayable objectives and give purpose to revisiting earlier floors.

**Current State:** 27 bounties + 10 rumors + 8 notices defined. UI template exists. No gameplay hooks.

**Work Required:**
- [ ] Place bulletin board in village (near tavern or town square)
- [ ] Wire interaction to open bounty UI
- [ ] Implement bounty acceptance (max 3 active bounties)
- [ ] Hook bounty tracking into combat/collection/exploration events
- [ ] Implement bounty completion detection and reward delivery
- [ ] Add bounty expiration mechanic (bounty fails if you die during the attempt)
- [ ] Daily/weekly rotation of available bounties
- [ ] Rumor display (lore hints, no mechanical reward)

**Files:** `js/ui/bulletin-ui.js`, `js/data/bounties.js`, `js/systems/village-system.js`

**Verification:** Check bulletin board → accept bounty → enter dungeon → complete objective → return → collect reward.

---

### A.5 Stamina System Polish (85% → 100%)
**Why:** Stamina adds tactical depth to combat — you can't just hold attack forever.

**Current State:** Core mechanics work. Kill refunds, exhaustion penalties, regen delays all functional. Config loading issues.

**Work Required:**
- [ ] Fix STAMINA_CONFIG loading (ensure constants.js defines it before system init)
- [ ] Verify stamina consumption on attacks, dashes, and abilities
- [ ] Verify kill refund (25 stamina per kill) fires consistently
- [ ] Polish exhaustion visual feedback (screen edge tint, movement speed penalty visible)
- [ ] Fix UI segment rendering gaps
- [ ] Integrate with HUD stamina bar

**Files:** `js/systems/stamina-system.js`, `js/core/constants.js`, `js/ui/unit-frames.js`

**Verification:** Attack repeatedly → stamina depletes → movement slows at exhaustion → kill enemy → stamina refunds → wait → regen kicks in.

---

### A.6 Spell System Polish (90% → 100%)
**Why:** Spells give the player active abilities beyond basic attacks.

**Current State:** Dash, Heal (35% HP), and Shield (50% HP barrier) all functional. Minimal visual effects.

**Work Required:**
- [ ] Add casting animations (brief particle burst on heal, shield shimmer effect)
- [ ] Add spell cooldown indicators to action bar UI
- [ ] Persist spell selection across runs (save to persistentState)
- [ ] Fix spacebar binding conflicts with other inputs
- [ ] Add 2-3 more spells for variety (candidates: Fireball projectile, Slow Aura, Blink teleport)

**Files:** `js/systems/spell-system.js`, `js/ui/action-bar-ui.js`, `js/effects/`

**Verification:** Cast heal → HP recovers with green particle effect → cooldown shows on action bar → cast shield → blue barrier absorbs damage.

---

### A.7 Kill Streak System Polish (80% → 100%)
**Why:** Kill streaks add juice and excitement to combat. Purely cosmetic but high-impact feel.

**Current State:** 5 tiers work (Double Kill → Godlike). Decay timer, announcements functional.

**Work Required:**
- [ ] Fix announcement positioning (sometimes off-screen)
- [ ] Add screen shake on tier-up
- [ ] Fix decay not resetting on floor change
- [ ] Ensure streak resets on damage taken (fix edge case)
- [ ] Add streak count to death/victory summary
- [ ] Optional: small mechanical reward per tier (gold bonus multiplier)

**Files:** `js/systems/kill-streak-system.js`, `js/ui/kill-streak-ui.js`

**Verification:** Kill 3 enemies rapidly → "Killing Spree" announcement → take damage → streak resets.

---

### A.8 Time Effects System (85% → 100%)
**Why:** Hit-stop and slow-motion on critical hits makes combat feel impactful.

**Current State:** Time scale management works. Visual effects (vignette, desaturation) defined but never rendered.

**Work Required:**
- [ ] Wire `renderTimeSlowEffects()` into main render pipeline
- [ ] Implement vignette overlay (darken canvas edges during slow-mo)
- [ ] Trigger time slow on critical hits (0.3x for 150ms)
- [ ] Trigger time slow on player death (0.1x for 500ms, dramatic)
- [ ] Trigger time slow on boss phase transitions
- [ ] Fix multiple simultaneous time slow conflicts (use highest intensity)

**Files:** `js/systems/time-effects.js`, `js/ui/renderer.js`, `js/systems/combat-master.js`

**Verification:** Land a critical hit → brief slow-motion with darkened edges → normal speed resumes smoothly.

---

### A.9 Bark System (75% → 100%)
**Why:** NPC barks make the village feel alive and reactive.

**Current State:** System works — distance detection, cooldowns, context-aware selection. Most NPCs lack bark data.

**Work Required:**
- [ ] Write bark lines for all 18 NPCs (3-5 barks per NPC per world state)
- [ ] Fix speech bubble positioning (clamp to screen bounds)
- [ ] Add text wrapping for long barks
- [ ] Wire world-state-aware barks (NPCs react differently as village degrades)
- [ ] Optional: barks during dungeon from enemy types ("You dare enter my domain!")

**Files:** `js/systems/bark-system.js`, `js/data/npcs.js`

**Verification:** Walk past Blacksmith → speech bubble appears with contextual line → fades after 4 seconds.

---

### A.10 Lingering Hazards Polish (90% → 100%)
**Why:** Environmental hazards from enemy abilities add positional tactics to combat.

**Current State:** Poison clouds work. Circular zones unused. Minor bugs.

**Work Required:**
- [ ] Enable circular hazard zones (fire patches, ice slicks)
- [ ] Fix double-damage-per-tick timing bug
- [ ] Clear hazards on floor transition
- [ ] Add hazard visual telegraph (brief warning flash before zone appears)
- [ ] Wire hazard creation to specific enemy abilities (dragon breath → fire patch, spider → poison cloud)

**Files:** `js/systems/lingering-hazards.js`, `js/data/ability-repository.js`

**Verification:** Dragon enemy uses breath attack → fire patch lingers on ground → player takes damage standing in it → patch fades after duration.

---

## TIER B — BOSS ENCOUNTERS & ENDGAME

*The climax of the game. Without bosses, reaching Floor 10 is anticlimactic.*

### B.1 Core Boss Arena (Floor 10)
**Why:** The Core boss is the final challenge and narrative resolution. Beating it is the win condition.

**Current State:** `core-boss.js` has 3-phase boss with 6 ability types (75% complete). `core-generator.js` creates the arena. Never spawned.

**Work Required:**
- [ ] Wire Floor 10 to use `core-generator.js` for arena layout instead of standard dungeon gen
- [ ] Spawn Core boss in arena center on Floor 10 entry
- [ ] Fix ability execution (ProjectileSystem dependency, targeting issues)
- [ ] Implement summon AI (summoned minions need basic chase/attack behavior)
- [ ] Add phase transition visual effects (screen flash, dialogue overlay)
- [ ] Connect boss defeat to victory state (`game.state = 'victory'`)
- [ ] Boss defeat drops legendary loot
- [ ] Test all 3 phases for balance (phase 1 teachable, phase 2 challenging, phase 3 intense)

**Files:** `js/entities/core-boss.js`, `js/generation/core-generator.js`, `js/core/game-init.js`

**Verification:** Reach Floor 10 → arena loads → boss fight with 3 phases → defeat boss → victory screen → return to village with loot.

---

### B.2 Malphas Boss (Mid-Game Guardian)
**Why:** A mid-game boss at Floor 5 breaks up the dungeon grind and tests the player's build.

**Current State:** `malphas-boss.js` is 70% complete — 4 phases, lava vents, minion spawning, environmental hazards.

**Work Required:**
- [ ] Designate Floor 5 as Malphas encounter floor
- [ ] Create Malphas arena (use modified room generation — large open room with vent positions)
- [ ] Fix lava vent grid positioning
- [ ] Implement minion AI (magma elemental, obsidian golem, ember sprite need chase/attack)
- [ ] Add attack telegraphs (visual warning before ground slam, fire rain)
- [ ] Fix invulnerability during phase transitions
- [ ] Malphas defeat advances world state narrative
- [ ] Boss drops unique materials for crafting

**Files:** `js/entities/malphas-boss.js`, `js/generation/dungeon-generator.js`

**Verification:** Reach Floor 5 → Malphas arena → fight through 4 phases → destroy vents → defeat Malphas → unique loot + narrative progression.

---

### B.3 Mini-Boss System (Floor Guardians)
**Why:** Each floor needs a climactic moment. Mini-bosses guard the stairs down.

**Work Required:**
- [ ] Designate 1 elite enemy per floor as that floor's "guardian"
- [ ] Place guardian in the room containing the stairs down
- [ ] Guardian has enhanced stats (2x HP, 1.5x damage, unique ability)
- [ ] Guardian drops guaranteed rare+ loot
- [ ] Guardian defeat is tracked in persistentState (for quest/crafting gating)
- [ ] Visual indicator: guardian has a glow or size increase

**Files:** `js/generation/enemy-spawner.js`, `js/generation/dungeon-generator.js`, `js/data/monsters-data.js`

**Verification:** Floor 1 → find stairs room → guardian enemy blocks path → defeat it → guaranteed loot drop → stairs accessible.

---

## TIER C — WORLD STATE & NARRATIVE

*The Bleeding Earth narrative makes the game more than just a dungeon grind. It gives meaning to progression.*

### C.1 World State System (70% → 100%)
**Why:** The village visually degrading as the player delays creates urgency and narrative weight.

**Current State:** 4 states defined (SAFE → RISING → CRITICAL → ENDGAME). Village tile transformations, NPC dialogue variants, atmospheric effects all designed. Partially connected.

**Work Required:**
- [ ] Wire world state transitions to floor progression milestones:
  - SAFE: Floors 1-3
  - RISING: Floors 4-5 (or after 5 total runs)
  - CRITICAL: Floors 6-8 (or after 15 total runs)
  - ENDGAME: Floors 9-10 (pre-Core)
- [ ] Apply village tile state transformations on village entry (from `village-tile-states.js`)
- [ ] Switch NPC dialogue to world-state-aware variants
- [ ] Apply atmospheric effects (sky gradients, particles, screen shake) per state
- [ ] Restore village to SAFE state after Core boss defeat (victory reward)
- [ ] Save world state to persistentState

**Files:** `js/systems/world-state-system.js`, `js/data/village-tile-states.js`, `js/data/npcs.js`, `js/generation/village-generator.js`

**Verification:** Play through multiple runs → village gradually worsens → NPCs react with fear → defeat Core boss → village restored.

---

### C.2 Narrative Events & Lore
**Why:** Environmental storytelling and lore fragments give context to the dungeon crawl.

**Work Required:**
- [ ] Create 15-20 lore fragments (discoverable notes in dungeon rooms)
- [ ] Implement lore pickup interaction (walk over → text popup → added to journal)
- [ ] Lore fragments tell the story of the chasm: miners' logs, guard reports, cultist writings
- [ ] Each floor's lore matches its theme (volcanic → mining accident logs, undead → ancient burial warnings)
- [ ] Lore collection tracked in persistentState
- [ ] Optional: lore completion reward (cosmetic or small stat bonus)

**Files:** New data file for lore entries, `js/systems/loot-system.js` (lore as pickup type), `js/ui/dialogue-ui.js` (display)

**Verification:** Find glowing note on floor → interact → lore text displays → recorded in journal.

---

## TIER D — CONTENT EXPANSION

*The systems work; now fill them with enough content that 40-60 runs don't feel repetitive.*

### D.1 Monster Roster Expansion
**Why:** 34 monsters across 10 floors means repetition. Target: 45-50 unique enemies.

**Current Coverage Gaps:**
- Floors 6-10 reuse lower-floor enemies heavily
- No ice-themed enemies (planned but not created)
- Limited shadow/void enemies

**Work Required:**
- [ ] Add 4-5 ice-themed enemies (Frost Elemental, Ice Golem, Frozen Husk, Blizzard Spirit, Rime Crawler)
- [ ] Add 3-4 shadow/void enemies (Void Stalker, Phase Shifter, Shadow Weaver, Null Beast)
- [ ] Add 2-3 deep-floor elite variants of early enemies (Inferno Slime, Ancient Skeleton, etc.)
- [ ] Create sprite data for each new enemy
- [ ] Define abilities, loot tables, and element affinities for each
- [ ] Assign to floor spawn tables

**Files:** `js/data/monsters-data.js`, `js/generation/enemy-spawner.js`, `assets/sprites/`

---

### D.2 Quest Content Expansion
**Why:** 14 quests is too few. Target: 25-30 quests for a complete experience.

**Work Required:**
- [ ] Write 5+ more side quests per quest type:
  - Kill quests: "Slay 10 Undead," "Defeat Malphas," "Kill 3 Elites on Floor 7"
  - Collection quests: "Gather 5 Obsidian Shards," "Find the Ancient Tome"
  - Exploration quests: "Reach Floor 8," "Discover all shrines on Floor 3"
  - Special quests: "Survive Floor 5 without using potions," "Complete a run in under 20 minutes"
- [ ] Add quest chains (3-4 quests that tell a mini-story)
- [ ] Add NPC personal quests (Blacksmith's lost apprentice, Innkeeper's missing supplies)
- [ ] Balance quest rewards against shop prices and crafting costs

**Files:** `js/data/quests.js`, `js/data/npcs.js`

---

### D.3 Weapon & Equipment Variety
**Why:** 30 weapons across 3 categories limits build diversity.

**Work Required:**
- [ ] Add axes (5 tiers: common → legendary) — slow, high damage, cleave
- [ ] Add throwing weapons (3-4 types) — ranged consumable option
- [ ] Add unique/legendary weapons with special effects (lifesteal, chain lightning, frost nova on crit)
- [ ] Add accessory slot (ring) with stat bonuses
- [ ] Ensure all weapon types have distinct attack animations and feel

**Files:** `js/data/weapons-melee.js`, `js/data/weapons-ranged.js`, new weapon data files, `js/rendering/`

---

### D.4 Consumable & Item Variety
**Why:** Beyond health potions, players need tactical options.

**Work Required:**
- [ ] Add scroll items (one-use spell effects: Scroll of Fireball, Scroll of Teleport)
- [ ] Add traps (deployable: caltrops, bear trap, fire mine)
- [ ] Add food items with temporary buffs (stat boost for 60 seconds)
- [ ] Add rare/unique consumables (Phoenix Feather — auto-revive once per run)
- [ ] Verify all items have proper shop prices and loot table weights

**Files:** `js/data/items.js`, `js/systems/loot-system.js`

---

### D.5 Floor Theme Variety
**Why:** 10 floors with only a few themes gets visually repetitive.

**Work Required:**
- [ ] Ensure each floor pair has a distinct theme:
  - Floors 1-2: Volcanic/Magma
  - Floors 3-4: Crypt/Undead
  - Floors 5-6: Cave/Crystal
  - Floors 7-8: Shadow/Void
  - Floors 9: Ice/Frozen Depths
  - Floor 10: Core Arena
- [ ] Create tile themes for any missing floor types
- [ ] Assign floor-appropriate enemy spawn tables
- [ ] Add floor-specific environmental hazards (lava pools, ice patches, shadow zones)

**Files:** `js/config/tile-theme-config.js`, `js/generation/dungeon-generator.js`, `js/rendering/tile-renderer.js`

---

## TIER E — AUDIO & VISUAL POLISH

*The infrastructure is built. Now make it feel good.*

### E.1 Audio Asset Creation
**Why:** The audio system is 65% complete with excellent infrastructure but zero actual sound files.

**Current State:** 17 music tracks and 150+ SFX defined with paths, priorities, and mixing rules. No audio files exist.

**Work Required:**
- [ ] Source or create core audio assets:
  - **Music** (priority): Village theme, dungeon ambient (3 floor themes), combat music, boss theme
  - **Combat SFX**: Sword swing, mace impact, bow release, arrow hit, magic cast, enemy death
  - **UI SFX**: Button click, inventory open/close, item pickup, gold clink, level up
  - **Ambient**: Village atmosphere, dungeon drips/echoes, wind, fire crackle
- [ ] Place audio files in assets directory matching defined paths
- [ ] Test crossfading between music tracks (village → dungeon → combat)
- [ ] Test SFX pooling (multiple sounds playing simultaneously without clipping)
- [ ] Add volume controls to settings menu

**Files:** `js/audio/`, `js/data/audio-definitions.js`, `js/data/music-tracks.js`, asset files

**Note:** Procedural/synthesized audio (Web Audio API oscillators) is a viable MVP approach if sourcing audio files is slow. The infrastructure supports both.

---

### E.2 Visual Effects Polish
**Why:** Combat needs to feel impactful. Visual feedback is the primary way to communicate game state.

**Work Required:**
- [ ] Verify damage numbers render and float upward consistently
- [ ] Add hit flash on enemies when struck (white flash for 100ms)
- [ ] Add screen shake on heavy hits and critical strikes
- [ ] Add death particles (enemy explodes into element-colored particles)
- [ ] Add heal effect (green rising particles)
- [ ] Add shield effect (blue shimmer around player)
- [ ] Add status effect icons above affected entities
- [ ] Add loot drop glow based on rarity (white/green/blue/purple/gold)

**Files:** `js/effects/`, `js/ui/enemy-renderer.js`, `js/ui/renderer.js`, `js/effects/particle-system.js`

---

### E.3 UI Polish Pass
**Why:** Functional UI needs to become intuitive UI.

**Work Required:**
- [ ] Tooltip system: hover over items/abilities for stat details
- [ ] Consistent panel styling across all UI (inventory, shop, crafting, bank, quest journal)
- [ ] Item comparison popup (show currently equipped vs. hovered item)
- [ ] Keybind remapping in settings
- [ ] Screen resolution/zoom options
- [ ] Loading screen between floor transitions
- [ ] Transition effects (fade to black between village/dungeon)

**Files:** `js/ui/` (all UI files)

---

## TIER F — TRAINING, TAVERN & NICE-TO-HAVES

*Lower priority systems that add depth but aren't required for a "complete" experience.*

### F.1 Training System (50% → 100%)
**Why:** Gives the player something to do in the village besides shop. Provides an alternative progression path.

**Work Required:**
- [ ] Place training dummies in village
- [ ] Wire interaction to open training UI
- [ ] Implement training minigame (simple timing-based challenge)
- [ ] Training grants small permanent stat bonuses (1-2 points per session)
- [ ] Training has daily cooldown (prevents grinding)
- [ ] Save training progress to persistentState

**Files:** `js/systems/training-system.js`, `js/systems/village-system.js`

---

### F.2 Tavern Mini-Games (40% → 80%)
**Why:** Fun distraction and gold sink/source in the village. Adds personality.

**Work Required:**
- [ ] Implement one dice game (simple high-roll gambling with NPC)
- [ ] Betting mechanic (wager gold, win/lose based on rolls)
- [ ] NPC opponent with personality (taunts, reactions)
- [ ] Wire tavern NPC interaction to game UI

**Files:** `js/ui/tavern-games-ui.js`, `js/data/npcs.js`

**Note:** One polished mini-game is better than three half-baked ones. Start with dice.

---

### F.3 Monster Social System Polish (80% → 100%)
**Why:** Pack tactics make combat more interesting. Enemies that coordinate are scarier than enemies that don't.

**Work Required:**
- [ ] Wire group tactical AI (pack leader issues commands, followers execute)
- [ ] Visual indicator for pack membership (subtle line or aura connecting pack members)
- [ ] Leader death triggers morale break (followers flee or enrage)
- [ ] Verify group bonuses apply correctly (damage, defense, attack speed)

**Files:** `js/systems/monster-social-system.js`, `js/systems/enemy-ai.js`

---

### F.4 Bestiary / Encyclopedia
**Why:** Rewards exploration and gives the player information about enemies they've fought.

**Work Required:**
- [ ] Track which enemies the player has killed at least once
- [ ] Bestiary UI shows discovered enemies with sprite, stats, weaknesses
- [ ] Unlock entries on first kill
- [ ] Accessible from village (press B or via character sheet)

**Files:** New UI file, `js/core/game-state.js` (persistentState tracking)

---

## Implementation Order

### Wave 1: Integrate Core Systems
Priority: A.1 (Boons), A.2 (Quests), A.3 (Crafting), A.5 (Stamina), A.6 (Spells)
- These are the highest-impact systems that are closest to done
- Each one adds a new layer of gameplay depth
- All are 75-90% complete — mostly wiring work

### Wave 2: Boss Encounters
Priority: B.1 (Core Boss), B.2 (Malphas), B.3 (Mini-Bosses)
- These give the game its climactic moments
- Core Boss is the win condition — can't ship without it
- Mini-bosses break up floor-to-floor monotony

### Wave 3: World State & Narrative
Priority: C.1 (World State), C.2 (Lore)
- Connects the village to the dungeon emotionally
- Makes the game feel like it has stakes beyond loot

### Wave 4: Content Fill
Priority: D.1 (Monsters), D.2 (Quests), D.3 (Weapons), D.4 (Items), D.5 (Themes)
- The systems work; now fill them with content
- This is the longest wave but the most parallelizable

### Wave 5: Polish
Priority: E.1 (Audio), E.2 (VFX), E.3 (UI), A.7 (Kill Streaks), A.8 (Time Effects), A.9 (Barks), A.10 (Hazards)
- Makes everything feel good
- Can be done incrementally alongside other waves

### Wave 6: Nice-to-Haves
Priority: F.1 (Training), F.2 (Tavern), F.3 (Social AI), F.4 (Bestiary), A.4 (Bounties)
- Only if time permits
- Each one is self-contained and can be cut without affecting the core game

---

## Verification: Complete Game Checklist

When Phase 2 is done, this full playthrough should work:

1. **Open game** → main menu with music
2. **New Game** → village loads, NPCs have bark dialogue, world state SAFE
3. **Explore village** → talk to Elder (main quest), Blacksmith (shop + crafting), Banker (storage), bulletin board (bounties)
4. **Accept quest** from Elder → "Investigate the First Floor"
5. **Buy basic gear** from Blacksmith
6. **Enter dungeon** → Floor 1 loads with ambient audio
7. **Fight enemies** → combat feels impactful (damage numbers, hit flash, screen shake, stamina management)
8. **Find shrine** → choose boon from Ancestor → stat boost applied
9. **Kill streak** → "Killing Spree!" announcement
10. **Find loot** → items glow by rarity, materials for crafting
11. **Critical hit** → brief slow-motion effect
12. **Defeat Floor 1 guardian** → guaranteed rare loot → stairs accessible
13. **Advance through floors** → themes change, enemies get harder, new enemy types appear
14. **Floor 5: Malphas boss** → multi-phase fight with lava vents and minions
15. **Return to village between runs** → village shows degradation (world state RISING)
16. **Craft gear** at Blacksmith using collected materials
17. **Deposit valuables** in bank before next run
18. **Complete quests** → receive rewards, new quests unlock
19. **Check bounty board** → accept and complete bounties for bonus gold
20. **Use spell** → heal with green particles, shield with blue shimmer
21. **Find lore fragment** → backstory revealed in journal
22. **Floor 10: Core boss** → 3-phase epic fight
23. **Victory** → run summary, village restored to SAFE, legendary loot earned
24. **Post-victory** → all persistent progress saved, new run possible with accumulated skills and bank contents

---

## Key Metrics for "Complete"

| Metric | Target |
|--------|--------|
| Unique enemies | 45-50 |
| Total quests | 25-30 |
| Weapons | 40-45 (adding axes, throwing, legendaries) |
| Crafting recipes | 44 (already defined, needs QA) |
| Boons | 70 (already defined, needs integration) |
| Bounties | 27 (already defined, needs integration) |
| Boss encounters | 3 (mini-boss per floor + Malphas + Core) |
| Floor themes | 6 distinct visual themes |
| Music tracks | 6-8 minimum (village, dungeon ×3, combat, boss) |
| SFX | 30+ core sounds |
| NPC barks | 3-5 per NPC per world state |
| Lore fragments | 15-20 |
| Runs to completion | 40-60 |
| Total playtime | 10-15 hours |
