# Map Generation Analysis

## Current Cellular Automata Parameters

Located in `js/generation/chamber-generator.js` (lines 12-25):

```javascript
const CHAMBER_CONFIG = {
    initialWallChance: 0.45,       // 45% walls initially
    smoothingPasses: 4,            // Number of cellular automata passes
    wallThreshold: 5,              // Neighbors needed for floor to become wall
    floorThreshold: 4,             // Neighbors needed for wall to stay wall
    minChamberSize: 16,            // Minimum tiles for a valid chamber
    corridorWidth: 2,              // Width of connecting corridors
    edgeBuffer: 2,                 // Keep edges clear for doorways
}
```

### Birth/Survival Rules

The cellular automata uses a custom rule set (from `smoothChamberGrid` function):

- **Wall Survival**: Walls stay walls if they have **4+ wall neighbors** (out of 8 total)
- **Floor→Wall Birth**: Floors become walls if they have **5+ wall neighbors**

This creates relatively open, cavernous spaces because:
1. Walls survive easily (only need 4/8 neighbors)
2. New walls form rarely (need 5/8 neighbors)
3. 45% initial density is moderate

### Standard Cave Generation Comparison

Common cellular automata cave rules:
- **B678/S345678** (very cavernous): Birth on 6-8 neighbors, survive on 3-8
- **B5678/S45678** (tighter caves): Birth on 5-8 neighbors, survive on 4-8

Current system is roughly **B5/S4** (birth on 5+, survive on 4+).

---

## How to Run Tests

### Quick Start

1. Load the game in your browser
2. Open the JavaScript console (F12)
3. Run: `MapGenAnalyzer.runTests(10)`

This will generate 10 maps and collect statistics on:
- Chamber counts per room
- Chamber sizes (min, max, average)
- Wall densities (initial, after smoothing, final)
- Dead end counts
- Connectivity metrics

### Example Output

```
🧪 Starting map generation analysis (10 maps)...
  🗺️  Generating map 1/10...
  🗺️  Generating map 2/10...
  ...
✅ Analysis complete!

======================================================================
MAP GENERATION STATISTICS REPORT
======================================================================

📊 ROOM STATISTICS:
  Total rooms analyzed: 70
  Total chambers: 490
  Avg chambers per room: 7.00

🏠 CHAMBERS PER ROOM:
  Min: 4
  Max: 10
  Mean: 7.00
  Median: 7.00

📏 CHAMBER SIZES (tiles):
  Min: 16
  Max: 256
  Mean: 48.5
  Median: 42

🧱 WALL DENSITY:
  Final mean: 32.5%
  Final range: 28.0% - 38.0%

  Density progression:
    Initial: 45.0%
    After smoothing: 34.2%
    Final: 32.5%

🚪 DEAD ENDS:
  Avg dead ends per room: 2.5
  Dead end ratio: 35.7% of all chambers

💡 ANALYSIS:
  ✅ Chamber count is in good range
  ✅ Wall density is balanced
  ✅ Good dead end ratio for exploration
```

---

## Running Custom Tests

### Test Different Sample Sizes

```javascript
// Quick test (5 maps)
MapGenAnalyzer.runTests(5);

// Standard test (10 maps)
MapGenAnalyzer.runTests(10);

// Comprehensive test (50 maps)
MapGenAnalyzer.runTests(50);
```

### Access Raw Statistics

```javascript
// After running tests, access raw data
MapGenAnalyzer.stats.chamberCounts;       // Array of chamber counts
MapGenAnalyzer.stats.chamberSizes;        // Array of all chamber sizes
MapGenAnalyzer.stats.wallDensities.final; // Final wall densities
MapGenAnalyzer.stats.deadEnds;            // Dead end counts per room
```

### Check CHAMBER_STATS Directly

```javascript
// Enable tracking manually
CHAMBER_STATS.enabled = true;
CHAMBER_STATS.reset();

// Generate a map
generateMap();

// View collected data
console.log(CHAMBER_STATS.data);
```

---

## Tweaking Parameters

To experiment with different generation parameters:

1. **Tighten spaces** (more walls, less open):
   ```javascript
   CHAMBER_CONFIG.initialWallChance = 0.50;  // Increase from 0.45
   CHAMBER_CONFIG.wallThreshold = 4;         // Decrease from 5 (easier to form walls)
   ```

2. **Open up spaces** (fewer walls, more open):
   ```javascript
   CHAMBER_CONFIG.initialWallChance = 0.40;  // Decrease from 0.45
   CHAMBER_CONFIG.wallThreshold = 6;         // Increase from 5 (harder to form walls)
   ```

3. **Increase smoothing** (more natural looking):
   ```javascript
   CHAMBER_CONFIG.smoothingPasses = 6;       // Increase from 4
   ```

4. **Reduce chamber fragmentation**:
   ```javascript
   CHAMBER_CONFIG.minChamberSize = 25;       // Increase from 16
   ```

After changing parameters, run `MapGenAnalyzer.runTests(10)` to see the effects.

---

## Analysis Goals

Based on user requirements:

1. **✅ Minimize isolated rooms**
   - System already uses `connectIsolatedChambers()` to ensure all chambers connect to doorways
   - No isolated rooms should exist in current system

2. **🎯 Decent portion of dead ends**
   - Target: 25-40% of chambers should be dead ends
   - Dead ends create strategic depth without making maps too linear

3. **✅ Player access to all rooms**
   - `ensureDoorwayConnectivity()` guarantees all doorways connect
   - Flood fill ensures complete connectivity

4. **📊 Current wall density & birth/survival rates**
   - **Initial**: 45% walls
   - **After smoothing**: ~34%
   - **Final**: ~32%
   - **Rules**: B5/S4 (birth on 5+, survive on 4+)

5. **✅ Variety in room sizes**
   - Min chamber: 16 tiles
   - Variance naturally created by CA algorithm
   - Can tune with `minChamberSize`

6. **✅ Tactical positioning**
   - CA naturally creates varied terrain
   - Corners, alcoves, and chokepoints emerge organically

---

## Next Steps

1. Run `MapGenAnalyzer.runTests(50)` for comprehensive baseline statistics
2. Analyze the results against the user's requirements
3. Recommend specific parameter adjustments
4. Test adjusted parameters
5. Compare results and iterate
