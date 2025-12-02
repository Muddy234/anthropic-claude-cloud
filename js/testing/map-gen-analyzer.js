// ============================================================================
// MAP GENERATION ANALYZER - Statistics & Testing
// ============================================================================
// Run test generations and gather statistics on chamber generation
// ============================================================================

const MapGenAnalyzer = {
    // Statistics accumulator
    stats: {
        totalRooms: 0,
        totalChambers: 0,
        chamberCounts: [],        // Chambers per room
        chamberSizes: [],         // Size of each chamber
        wallDensities: {
            initial: [],          // After initialization
            afterSmoothing: [],   // After CA smoothing
            final: []             // After connectivity
        },
        isolatedChambers: [],     // Count of isolated chambers (before connection)
        deadEnds: [],             // Chambers with only 1 connection
        largestChambers: [],      // Largest chamber per room
        smallestChambers: []      // Smallest chamber per room
    },

    /**
     * Reset statistics
     */
    reset() {
        this.stats = {
            totalRooms: 0,
            totalChambers: 0,
            chamberCounts: [],
            chamberSizes: [],
            wallDensities: {
                initial: [],
                afterSmoothing: [],
                final: []
            },
            isolatedChambers: [],
            deadEnds: [],
            largestChambers: [],
            smallestChambers: []
        };
    },

    /**
     * Analyze a single chamber grid
     */
    analyzeRoom(room) {
        if (!room.chambers || !room.chamberGrid) {
            console.warn('[Analyzer] Room missing chamber data');
            return;
        }

        const width = room.floorWidth;
        const height = room.floorHeight;
        const grid = room.chamberGrid;
        const chambers = room.chambers;

        // Count chambers
        const chamberCount = chambers.length;
        this.stats.chamberCounts.push(chamberCount);
        this.stats.totalChambers += chamberCount;

        // Analyze chamber sizes
        const sizes = chambers.map(c => c.size);
        this.stats.chamberSizes.push(...sizes);

        if (sizes.length > 0) {
            this.stats.largestChambers.push(Math.max(...sizes));
            this.stats.smallestChambers.push(Math.min(...sizes));
        }

        // Calculate final wall density
        let wallCount = 0;
        let totalTiles = width * height;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (grid[y][x] === 1) wallCount++;
            }
        }
        this.stats.wallDensities.final.push(wallCount / totalTiles);

        // Count dead ends (chambers with only 1 neighbor)
        const deadEndCount = this.countDeadEnds(chambers, grid, width, height);
        this.stats.deadEnds.push(deadEndCount);

        this.stats.totalRooms++;
    },

    /**
     * Count dead end chambers (chambers with only one connection)
     */
    countDeadEnds(chambers, grid, width, height) {
        let deadEnds = 0;

        for (const chamber of chambers) {
            // Find neighboring chambers
            const neighbors = new Set();

            for (const tile of chamber.tiles) {
                // Check 4 cardinal directions
                const directions = [
                    { dx: 1, dy: 0 },
                    { dx: -1, dy: 0 },
                    { dx: 0, dy: 1 },
                    { dx: 0, dy: -1 }
                ];

                for (const dir of directions) {
                    const nx = tile.x + dir.dx;
                    const ny = tile.y + dir.dy;

                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (grid[ny][nx] === 1) continue; // Wall

                    // Find which chamber this neighbor belongs to
                    for (const otherChamber of chambers) {
                        if (otherChamber === chamber) continue;
                        if (otherChamber.tiles.some(t => t.x === nx && t.y === ny)) {
                            neighbors.add(otherChamber.id);
                        }
                    }
                }
            }

            // Dead end = only 1 connection
            if (neighbors.size === 1) {
                deadEnds++;
            }
        }

        return deadEnds;
    },

    /**
     * Generate and analyze N maps
     */
    runTests(numMaps = 10) {
        console.log(`🧪 Starting map generation analysis (${numMaps} maps)...`);
        this.reset();

        // Enable statistics tracking
        if (typeof CHAMBER_STATS !== 'undefined') {
            CHAMBER_STATS.enabled = true;
            CHAMBER_STATS.reset();
        }

        // Temporarily disable debug logging for cleaner output
        const originalDebugLogging = typeof CHAMBER_CONFIG !== 'undefined' ? CHAMBER_CONFIG.debugLogging : false;
        if (typeof CHAMBER_CONFIG !== 'undefined') {
            CHAMBER_CONFIG.debugLogging = false;
        }

        for (let i = 0; i < numMaps; i++) {
            console.log(`  🗺️  Generating map ${i + 1}/${numMaps}...`);

            // Generate a new map
            if (typeof generateMap === 'function') {
                generateMap();
            } else {
                console.error('[Analyzer] generateMap function not found!');
                return;
            }

            // Analyze each room
            for (const room of game.rooms) {
                this.analyzeRoom(room);
            }
        }

        // Restore debug logging
        if (typeof CHAMBER_CONFIG !== 'undefined') {
            CHAMBER_CONFIG.debugLogging = originalDebugLogging;
        }

        // Disable statistics tracking
        if (typeof CHAMBER_STATS !== 'undefined') {
            CHAMBER_STATS.enabled = false;
        }

        console.log(`✅ Analysis complete!`);
        this.printReport();
    },

    /**
     * Print comprehensive statistics report
     */
    printReport() {
        const s = this.stats;

        console.log('\n' + '='.repeat(70));
        console.log('MAP GENERATION STATISTICS REPORT');
        console.log('='.repeat(70));

        // Room counts
        console.log('\n📊 ROOM STATISTICS:');
        console.log(`  Total rooms analyzed: ${s.totalRooms}`);
        console.log(`  Total chambers: ${s.totalChambers}`);
        console.log(`  Avg chambers per room: ${(s.totalChambers / s.totalRooms).toFixed(2)}`);

        // Chamber counts
        console.log('\n🏠 CHAMBERS PER ROOM:');
        console.log(`  Min: ${Math.min(...s.chamberCounts)}`);
        console.log(`  Max: ${Math.max(...s.chamberCounts)}`);
        console.log(`  Mean: ${this.mean(s.chamberCounts).toFixed(2)}`);
        console.log(`  Median: ${this.median(s.chamberCounts).toFixed(2)}`);
        console.log(`  Distribution:`, this.histogram(s.chamberCounts, 10));

        // Chamber sizes
        console.log('\n📏 CHAMBER SIZES (tiles):');
        console.log(`  Min: ${Math.min(...s.chamberSizes)}`);
        console.log(`  Max: ${Math.max(...s.chamberSizes)}`);
        console.log(`  Mean: ${this.mean(s.chamberSizes).toFixed(2)}`);
        console.log(`  Median: ${this.median(s.chamberSizes).toFixed(2)}`);
        console.log(`  Largest per room - Mean: ${this.mean(s.largestChambers).toFixed(2)}`);
        console.log(`  Smallest per room - Mean: ${this.mean(s.smallestChambers).toFixed(2)}`);

        // Wall density
        console.log('\n🧱 WALL DENSITY:');
        console.log(`  Final mean: ${(this.mean(s.wallDensities.final) * 100).toFixed(2)}%`);
        console.log(`  Final range: ${(Math.min(...s.wallDensities.final) * 100).toFixed(2)}% - ${(Math.max(...s.wallDensities.final) * 100).toFixed(2)}%`);

        // Include CHAMBER_STATS data if available (BSP system)
        if (typeof CHAMBER_STATS !== 'undefined' && CHAMBER_STATS.data.bspSections && CHAMBER_STATS.data.bspSections.length > 0) {
            console.log(`\n📐 BSP STATISTICS:`);
            console.log(`  Avg BSP sections per room: ${this.mean(CHAMBER_STATS.data.bspSections).toFixed(2)}`);
            console.log(`  Avg corridors per room: ${this.mean(CHAMBER_STATS.data.corridorCounts).toFixed(2)}`);
            console.log(`  Avg dead end sections: ${this.mean(CHAMBER_STATS.data.deadEndCounts).toFixed(2)}`);
            console.log(`  Avg regeneration attempts: ${this.mean(CHAMBER_STATS.data.regenAttempts).toFixed(2)}`);
            console.log(`  Max BSP depth: ${Math.max(...CHAMBER_STATS.data.splitDepths)}`);
        }

        // Dead ends
        console.log('\n🚪 DEAD ENDS:');
        console.log(`  Avg dead ends per room: ${this.mean(s.deadEnds).toFixed(2)}`);
        console.log(`  Min: ${Math.min(...s.deadEnds)}`);
        console.log(`  Max: ${Math.max(...s.deadEnds)}`);
        console.log(`  Total: ${s.deadEnds.reduce((a, b) => a + b, 0)}`);
        const deadEndRatio = s.deadEnds.reduce((a, b) => a + b, 0) / s.totalChambers;
        console.log(`  Dead end ratio: ${(deadEndRatio * 100).toFixed(2)}% of all chambers`);

        // Recommendations
        console.log('\n💡 ANALYSIS:');
        const avgChambers = s.totalChambers / s.totalRooms;
        const avgSize = this.mean(s.chamberSizes);
        const wallDensity = this.mean(s.wallDensities.final);

        if (avgChambers < 5) {
            console.log('  ⚠️  Low chamber count - consider increasing smoothing passes or adjusting thresholds');
        } else if (avgChambers > 12) {
            console.log('  ⚠️  High chamber count - map may feel fragmented');
        } else {
            console.log('  ✅ Chamber count is in good range');
        }

        if (wallDensity < 0.25) {
            console.log('  ⚠️  Very open spaces - consider increasing initial wall chance or wall threshold');
        } else if (wallDensity > 0.45) {
            console.log('  ⚠️  Very tight spaces - consider decreasing wall chance or thresholds');
        } else {
            console.log('  ✅ Wall density is balanced');
        }

        if (deadEndRatio < 0.15) {
            console.log('  ⚠️  Few dead ends - may feel too interconnected');
        } else if (deadEndRatio > 0.4) {
            console.log('  ⚠️  Many dead ends - may feel too linear');
        } else {
            console.log('  ✅ Good dead end ratio for exploration');
        }

        console.log('\n' + '='.repeat(70));
    },

    // Utility functions
    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    },

    median(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    },

    histogram(data, bins = 10) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binSize = (max - min) / bins;
        const counts = new Array(bins).fill(0);

        for (const val of data) {
            const binIndex = Math.min(Math.floor((val - min) / binSize), bins - 1);
            counts[binIndex]++;
        }

        return counts.map((count, i) => {
            const start = (min + i * binSize).toFixed(1);
            const end = (min + (i + 1) * binSize).toFixed(1);
            return `${start}-${end}: ${'█'.repeat(Math.ceil(count / data.length * 50))} (${count})`;
        }).join('\n    ');
    }
};

// Export
if (typeof window !== 'undefined') {
    window.MapGenAnalyzer = MapGenAnalyzer;
}

console.log('✅ Map generation analyzer loaded');
