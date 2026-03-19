# Task Guide — The Shifting Chasm

> **Quick Edit:** Update the GOAL section below to change what the orchestrator works on.
> The orchestrator (Warden) will read this file and dispatch tasks to specialist agents.

---

## GOAL

**Begin implementing fixes from the Implementation Plans in each agent's analysis document.**

Each of the 6 active agents has a completed Implementation Plan at the bottom of their analysis file containing prioritized issues to fix. Agents should now execute these fixes, working through issues in priority order (Critical → High → Medium → Low).

---

## PHASE: IMPLEMENTATION EXECUTION

### Current Status
- [x] Analysis documents created
- [x] Implementation plans appended to each analysis file
- [ ] **NOW: Execute fixes from implementation plans**
- [ ] Cross-agent coordination for dependent issues
- [ ] Final verification and testing

---

## AGENT ASSIGNMENTS

| Agent | Analysis File | Issues | Top Priority |
|-------|---------------|--------|--------------|
| **foundry** | `docs/analysis/FOUNDRY_ANALYSIS.md` | 14 | SaveManager Set restoration (Critical) |
| **lorekeeper** | `docs/analysis/LOREKEEPER_ANALYSIS.md` | 21 | Missing legendary weapons, ice monsters (High) |
| **glasswright** | `docs/analysis/GLASSWRIGHT_ANALYSIS.md` | 12 | Light source performance, particle pooling (Critical) |
| **cartographer** | `docs/analysis/CARTOGRAPHER_ANALYSIS.md` | 10 | Unify enemy creation, corridor width fix (Critical) |
| **warbringer** | `docs/analysis/WARBRINGER_ANALYSIS.md` | 12 | Damage variance, AI frustration timer (Critical) |
| **cantor** | `docs/analysis/CANTOR_ANALYSIS.md` | 14 | Audio directory structure, AudioManager (Critical) |

---

## WORKFLOW FOR EACH AGENT

### Step 1: Read Your Analysis File (REQUIRED FIRST)

**CRITICAL:** You MUST read your analysis file before doing ANY work.

```
READ: docs/analysis/[YOUR_AGENT]_ANALYSIS.md
```

Example for Foundry:
```
READ: docs/analysis/FOUNDRY_ANALYSIS.md
```

After reading, locate:
1. The **IMPLEMENTATION PLAN** section (near bottom of file)
2. The **RUNNING LOG** section with "Current Position"
3. The **Issue Fix Queue** with all numbered issues

### Step 2: Check Current Position

Look at the RUNNING LOG section:

```markdown
## Current Position
- **Last Completed:** Issue #[N] - [Title]
- **Currently Working On:** Issue #[N+1] - [Title]  <-- START HERE
- **Next Up:** Issue #[N+2] - [Title]
```

If this is a fresh session and "Last Completed" is N/A, start with Issue #1.

### Step 3: Read the Target File(s) for the Current Issue

Before making ANY changes, read the file(s) listed in the issue:

```
READ: js/path/to/target-file.js
```

Understand the existing code structure before editing.

### Step 4: Implement the Fix

Make the necessary code changes using Edit or Write tools.

**IMPORTANT GUIDELINES:**
- Make minimal, focused changes
- Don't refactor unrelated code
- Preserve existing code style
- Add comments only where logic is non-obvious
- Test mentally that the fix doesn't break other functionality

### Step 5: Update Your Analysis File

After completing each fix, update TWO sections in your analysis file:

**A. Update the Issue Status:**
```markdown
### Issue #[N]: [Title]
- **Status:** [x] Fixed  <-- Change from [ ] Pending
```

**B. Update the Running Log:**
```markdown
## Current Position
- **Last Completed:** Issue #[N] - [Title]  <-- Update this
- **Currently Working On:** Issue #[N+1] - [Title]  <-- Update this
- **Next Up:** Issue #[N+2] - [Title]  <-- Update this

## Session Log
| Session | Date | Issues Fixed | Notes |
|---------|------|--------------|-------|
| 1 | 2025-02-11 | #1, #2 | [Brief summary of what was done] |  <-- Add row
```

### Step 6: Repeat for Next Issue

Continue with the next issue in priority order until:
- All issues are fixed, OR
- You encounter a blocker requiring another agent, OR
- Context window is filling up (see Recovery section below)

---

## READ/WRITE OPERATIONS REFERENCE

### Files Each Agent May READ

| Agent | Primary Read Files |
|-------|-------------------|
| **foundry** | `js/core/*.js`, `js/state/*.js`, `docs/analysis/FOUNDRY_ANALYSIS.md` |
| **lorekeeper** | `js/data/*.js`, `docs/analysis/LOREKEEPER_ANALYSIS.md` |
| **glasswright** | `js/ui/*.js`, `js/rendering/*.js`, `js/effects/*.js`, `docs/analysis/GLASSWRIGHT_ANALYSIS.md` |
| **cartographer** | `js/generation/*.js`, `js/systems/dynamic-tile-system.js`, `js/systems/spawn-point-system.js`, `docs/analysis/CARTOGRAPHER_ANALYSIS.md` |
| **warbringer** | `js/systems/combat-*.js`, `js/systems/enemy-ai.js`, `js/entities/*.js`, `js/utils/damage-calculator.js`, `docs/analysis/WARBRINGER_ANALYSIS.md` |
| **cantor** | `js/audio/*.js` (create if missing), `js/core/constants.js`, `docs/analysis/CANTOR_ANALYSIS.md` |

### Files Each Agent May WRITE/EDIT

| Agent | Primary Write Files |
|-------|-------------------|
| **foundry** | `js/core/*.js`, `js/state/*.js`, `docs/analysis/FOUNDRY_ANALYSIS.md` |
| **lorekeeper** | `js/data/*.js`, `docs/analysis/LOREKEEPER_ANALYSIS.md` |
| **glasswright** | `js/ui/*.js`, `js/rendering/*.js`, `js/effects/*.js`, `docs/analysis/GLASSWRIGHT_ANALYSIS.md` |
| **cartographer** | `js/generation/*.js`, `docs/analysis/CARTOGRAPHER_ANALYSIS.md` |
| **warbringer** | `js/systems/*.js`, `js/entities/*.js`, `js/utils/*.js`, `docs/analysis/WARBRINGER_ANALYSIS.md` |
| **cantor** | `js/audio/*.js`, `js/data/audio-definitions.js`, `assets/audio/` (directories), `docs/analysis/CANTOR_ANALYSIS.md` |

### ALWAYS Update After Each Fix
```
EDIT: docs/analysis/[YOUR_AGENT]_ANALYSIS.md
- Update issue status to [x] Fixed
- Update Running Log with current position
- Add session log entry
```

---

## CONTEXT WINDOW RECOVERY PROTOCOL

### When Context Window Fills Up

If you notice the context window is getting full, BEFORE it runs out:

1. **IMMEDIATELY update your analysis file** with current progress
2. Ensure "Current Position" reflects exactly where you are
3. Add detailed notes to session log about partial work

### For a NEW Session Resuming Work

When starting fresh after context reset:

```
STEP 1: READ docs/analysis/[YOUR_AGENT]_ANALYSIS.md

STEP 2: Go to "RUNNING LOG" section, find:
        - "Currently Working On" = your next task
        - "Last Completed" = context on recent work
        - "Session Log" = history of what's been done

STEP 3: READ the target file for "Currently Working On" issue

STEP 4: Continue implementation from where previous session stopped
```

### Session Handoff Template

When ending a session (context full or work complete), ensure your analysis file contains:

```markdown
## Current Position
- **Last Completed:** Issue #3 - [Exact title]
- **Currently Working On:** Issue #4 - [Exact title]
- **Next Up:** Issue #5 - [Exact title]

## Session Log
| Session | Date | Issues Fixed | Notes |
|---------|------|--------------|-------|
| 1 | 2025-02-11 | #1, #2, #3 | Completed seeded RNG, fixed corridor width, started enemy factory |

## Partial Work Notes (if applicable)
If Issue #4 is partially complete:
- Created enemy-factory.js file
- Moved createEnemy() from enemy-spawner.js
- STILL NEED: Update dungeon-integration.js to use factory
- STILL NEED: Update spawn-point-system.js to use factory
```

---

## CROSS-AGENT DEPENDENCIES

Some issues require coordination between agents. Check this table before starting dependent issues:

| Issue | Primary Agent | Depends On | Coordination Required |
|-------|--------------|------------|----------------------|
| Enemy Creation Unification | cartographer | warbringer | Warbringer must update AI init after factory created |
| Encirclement Warning | warbringer | glasswright, cantor | Glasswright: UI indicator; Cantor: audio cue |
| Dodge Roll System | warbringer | glasswright | Glasswright: dodge animation |
| Shift Countdown UI | warbringer | glasswright | Glasswright: overlay visual |
| Audio Integration Hooks | cantor | warbringer, glasswright | Events must be emitted for audio to respond |
| Monster Voice Sets | cantor | lorekeeper | Lorekeeper: add soundSetId to monster data |
| Tile Damage Warnings | cartographer | glasswright | Glasswright: visual warning effect |

### How to Handle Dependencies

**If you are the PRIMARY agent:**
1. Complete your part of the work
2. Document what the dependent agent needs to do
3. Update your issue status to `[~] Partial - Awaiting [agent]`

**If you are the DEPENDENT agent:**
1. Check if primary agent has completed their part
2. If yes, implement your portion
3. If no, skip and continue with non-dependent issues

---

## COMMON ISSUES AND SOLUTIONS

### Issue: File Not Found
```
ERROR: Cannot read js/audio/audio-manager.js - file does not exist
```
**Solution (Cantor only):** This is expected. Cantor creates NEW files. Use Write tool instead of Edit.

### Issue: Edit Fails - String Not Found
```
ERROR: old_string not found in file
```
**Solution:**
1. Re-read the file to get current content
2. Copy exact string including whitespace
3. Try again with correct string

### Issue: Merge Conflict with Another Agent
```
ERROR: File was modified by another process
```
**Solution:**
1. Re-read the file to get latest version
2. Reapply your changes
3. Note in session log that re-merge was needed

### Issue: Unsure About Implementation Approach
**Solution:**
1. Check the "Fix" field in the issue for guidance
2. Check "Notes" field for additional context
3. If still unclear, implement simplest solution that addresses the Problem
4. Document any assumptions in your session log

### Issue: Fix Seems to Require More Files Than Listed
**Solution:**
1. Only modify files within your agent's domain
2. If cross-agent files needed, document and mark as partial
3. Add note for dependent agent

---

## ACCEPTANCE CRITERIA FOR THIS PHASE

### Per-Agent Completion
- [ ] All Critical issues fixed
- [ ] All High priority issues fixed
- [ ] Medium/Low issues fixed OR documented as deferred
- [ ] Analysis file updated with all status changes
- [ ] Running log current and accurate

### Overall Completion
- [ ] Cross-agent dependencies resolved
- [ ] No blocking issues remaining
- [ ] All agents have updated their analysis files
- [ ] Code compiles/runs without new errors

---

## PRIORITY ORDER REMINDER

Work on issues in this order:
1. **CRITICAL** - Must fix, blocks other work or causes crashes
2. **HIGH** - Important fixes, significant impact
3. **MEDIUM** - Should fix, moderate impact
4. **LOW** - Nice to fix, minor impact or polish

Within same priority, work in issue number order (#1 before #2, etc.)

---

## AGENT-SPECIFIC NOTES

### Foundry
- Focus on SaveManager Set restoration first (Critical)
- State management changes affect many systems - be careful
- Document any SystemManager registration changes

### Lorekeeper
- Data file changes are relatively safe
- Balance changes should be documented with rationale
- Element/type mismatches should use consistent naming

### Glasswright
- Performance fixes (light source, particles) are highest impact
- UI keyboard navigation can be done incrementally
- Test visual changes don't break existing layouts

### Cartographer
- Enemy factory creation affects multiple files - do all at once
- Seeded RNG is large scope - may take multiple sessions
- Coordinate with Warbringer on enemy stat calculations

### Warbringer
- Damage variance is simple - good first fix
- AI frustration timer requires careful state machine changes
- Combat changes should preserve existing damage formulas

### Cantor
- ALL work is creating new files - unique among agents
- Start with directory structure (Issue #1) before anything else
- Audio requires browser testing - document any browser-specific issues

---

## QUICK START CHECKLIST

```
[ ] 1. READ your analysis file: docs/analysis/[AGENT]_ANALYSIS.md
[ ] 2. Find IMPLEMENTATION PLAN section
[ ] 3. Check RUNNING LOG for current position
[ ] 4. READ target file for current issue
[ ] 5. Implement the fix
[ ] 6. UPDATE analysis file (status + running log)
[ ] 7. REPEAT for next issue
```

---

## NOTES

- **Inactive Agents:** Vaultkeeper (server), Forgemaster (devops), and Sentinel (testing) are NOT part of this task
- **Context Window Recovery:** The Running Log section ensures any agent can resume work if the context window fills up
- **Cross-Agent Issues:** Primary owner completes their part, documents what dependent agents need
- **Testing:** Mental/code review testing for now; full testing in later phase

---

<!--
================================================================================
TEMPLATES FOR FUTURE GOALS
================================================================================

### Template: Bug Fix Phase
---
## GOAL
Fix all bugs identified in the analysis phase.

## AGENT ASSIGNMENTS
[Same as above]

## WORKFLOW
1. Read analysis file
2. Work through Issue Fix Queue
3. Update status after each fix

### Template: Feature Addition
---
## GOAL
Add [feature name] to the game.

## REQUIREMENTS
- [Requirement 1]
- [Requirement 2]

## AGENT ASSIGNMENTS
- foundry: [specific task]
- lorekeeper: [specific task]
- etc.

================================================================================
AGENT QUICK REFERENCE
================================================================================
foundry      - Core engine, game loop, state, save/load, village/banking
lorekeeper   - Data files, balance, content, quests, crafting
glasswright  - UI, rendering, sprites, input, animations, effects
vaultkeeper  - Server infrastructure (dormant)
cantor       - Audio systems (creating from scratch)
cartographer - Dungeon generation, room layout, spawning
warbringer   - Combat, AI, movement, entities, session pressure
sentinel     - Testing, simulations, balance tools
forgemaster  - Build, deploy, CI/CD, index.html
================================================================================
-->
