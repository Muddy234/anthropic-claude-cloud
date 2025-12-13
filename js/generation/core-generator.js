// === js/generation/core-generator.js ===
// SURVIVAL EXTRACTION UPDATE: The Core arena generation

// ============================================================================
// CORE ARENA GENERATOR
// ============================================================================

const CoreGenerator = {

    /**
     * Generate the Core arena
     * @returns {Object} { tiles, spawnPoint, bossSpawn, safeZones, hazardSpawns }
     */
    generate() {
        const config = CORE_CONFIG.arena;
        const width = config.width;
        const height = config.height;

        // Initialize tile array
        const tiles = [];
        for (let y = 0; y < height; y++) {
            tiles[y] = [];
            for (let x = 0; x < width; x++) {
                tiles[y][x] = this._createTile(x, y, width, height);
            }
        }

        // Add pillars for cover
        const pillars = this._generatePillars(tiles, width, height);

        // Define safe zones (corners for Primordial Wrath ability)
        const safeZones = this._defineSafeZones(width, height);

        // Player spawn point (south side)
        const spawnPoint = {
            x: Math.floor(width / 2),
            y: height - 5
        };

        // Boss spawn point (center)
        const bossSpawn = {
            x: Math.floor(width / 2) - 2,  // -2 because boss is 4x4
            y: Math.floor(height / 2) - 2
        };

        // Hazard spawn points (for dynamic hazards during fight)
        const hazardSpawns = this._defineHazardSpawns(width, height, pillars);

        console.log('[CoreGenerator] Generated Core arena');

        return {
            tiles,
            width,
            height,
            spawnPoint,
            bossSpawn,
            safeZones,
            hazardSpawns,
            pillars,
            ambientLight: config.ambientLight,
            fogColor: config.fogColor
        };
    },

    /**
     * Create a single tile
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @returns {Object}
     * @private
     */
    _createTile(x, y, width, height) {
        // Check if edge (void/wall)
        const isEdge = x === 0 || x === width - 1 || y === 0 || y === height - 1;

        // Check if inner void (decorative void tiles near edges)
        const distFromEdge = Math.min(x, y, width - 1 - x, height - 1 - y);
        const isInnerVoid = distFromEdge === 1 && Math.random() < 0.3;

        // Calculate distance from center for visual effects
        const centerX = width / 2;
        const centerY = height / 2;
        const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));

        // Tile type
        let type = 'floor';
        let walkable = true;
        let color = this._getTileColor(distFromCenter, maxDist);

        if (isEdge) {
            type = 'void';
            walkable = false;
            color = '#000000';
        } else if (isInnerVoid) {
            type = 'void_crack';
            walkable = true;
            color = '#1a0a2a';
        }

        return {
            type,
            walkable,
            color,
            x,
            y,
            distFromCenter,
            glow: distFromCenter < 5 ? 0.3 : 0,  // Glow near center
            animated: distFromCenter < 8
        };
    },

    /**
     * Get tile color based on distance from center
     * @param {number} dist
     * @param {number} maxDist
     * @returns {string}
     * @private
     */
    _getTileColor(dist, maxDist) {
        const normalizedDist = dist / maxDist;

        // Colors fade from purple (center) to dark (edges)
        if (normalizedDist < 0.15) {
            return '#3a1a5a';  // Deep purple core
        } else if (normalizedDist < 0.3) {
            return '#2a1a4a';
        } else if (normalizedDist < 0.5) {
            return '#1a1a3a';
        } else if (normalizedDist < 0.7) {
            return '#151530';
        } else {
            return '#101025';
        }
    },

    /**
     * Generate pillar positions for cover
     * @param {Array} tiles
     * @param {number} width
     * @param {number} height
     * @returns {Array}
     * @private
     */
    _generatePillars(tiles, width, height) {
        const pillars = [];
        const centerX = width / 2;
        const centerY = height / 2;

        // 8 pillars in a rough circle around center
        const pillarAngles = [0, 45, 90, 135, 180, 225, 270, 315];
        const pillarRadius = 12;

        pillarAngles.forEach(angle => {
            const radians = angle * Math.PI / 180;
            const x = Math.floor(centerX + Math.cos(radians) * pillarRadius);
            const y = Math.floor(centerY + Math.sin(radians) * pillarRadius);

            // Create 2x2 pillar
            for (let py = 0; py < 2; py++) {
                for (let px = 0; px < 2; px++) {
                    const tx = x + px;
                    const ty = y + py;
                    if (tx > 1 && tx < width - 2 && ty > 1 && ty < height - 2) {
                        tiles[ty][tx] = {
                            type: 'pillar',
                            walkable: false,
                            color: '#4a3a6a',
                            x: tx,
                            y: ty,
                            destructible: true,
                            health: 100
                        };
                    }
                }
            }

            pillars.push({ x, y, destroyed: false });
        });

        return pillars;
    },

    /**
     * Define safe zone positions (corners)
     * @param {number} width
     * @param {number} height
     * @returns {Array}
     * @private
     */
    _defineSafeZones(width, height) {
        const margin = 5;
        const size = 4;

        return [
            { x: margin, y: margin, width: size, height: size },  // Top-left
            { x: width - margin - size, y: margin, width: size, height: size },  // Top-right
            { x: margin, y: height - margin - size, width: size, height: size },  // Bottom-left
            { x: width - margin - size, y: height - margin - size, width: size, height: size }  // Bottom-right
        ];
    },

    /**
     * Define hazard spawn points
     * @param {number} width
     * @param {number} height
     * @param {Array} pillars
     * @returns {Array}
     * @private
     */
    _defineHazardSpawns(width, height, pillars) {
        const spawns = [];
        const centerX = width / 2;
        const centerY = height / 2;

        // Generate spawn points in rings
        const rings = [8, 14, 18];
        const pointsPerRing = [6, 8, 10];

        rings.forEach((radius, ringIndex) => {
            const points = pointsPerRing[ringIndex];
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const x = Math.floor(centerX + Math.cos(angle) * radius);
                const y = Math.floor(centerY + Math.sin(angle) * radius);

                // Skip if too close to pillar
                const nearPillar = pillars.some(p =>
                    Math.abs(p.x - x) < 4 && Math.abs(p.y - y) < 4
                );

                if (!nearPillar && x > 2 && x < width - 3 && y > 2 && y < height - 3) {
                    spawns.push({ x, y, ring: ringIndex });
                }
            }
        });

        return spawns;
    },

    /**
     * Apply arena shrink effect (for Void Collapse ability)
     * @param {Array} tiles
     * @param {number} shrinkAmount - Number of tiles to shrink from each edge
     * @returns {Array} Modified tiles
     */
    applyShrink(tiles, shrinkAmount) {
        const height = tiles.length;
        const width = tiles[0].length;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Check if in shrink zone
                if (x < shrinkAmount || x >= width - shrinkAmount ||
                    y < shrinkAmount || y >= height - shrinkAmount) {

                    // Convert to void
                    tiles[y][x] = {
                        ...tiles[y][x],
                        type: 'void',
                        walkable: false,
                        color: '#000000',
                        collapsing: true
                    };
                }
            }
        }

        return tiles;
    },

    /**
     * Create visual effects data for the arena
     * @param {number} width
     * @param {number} height
     * @returns {Object}
     */
    createVisualEffects(width, height) {
        const centerX = width / 2;
        const centerY = height / 2;

        return {
            // Pulsing energy at center
            centerPulse: {
                x: centerX,
                y: centerY,
                radius: 3,
                color: '#9a4aff',
                pulseSpeed: 2
            },

            // Floating particles
            particles: this._generateParticles(width, height),

            // Energy lines radiating from center
            energyLines: this._generateEnergyLines(centerX, centerY),

            // Ambient fog patches
            fogPatches: this._generateFogPatches(width, height)
        };
    },

    /**
     * Generate floating particles
     * @param {number} width
     * @param {number} height
     * @returns {Array}
     * @private
     */
    _generateParticles(width, height) {
        const particles = [];
        const count = 50;

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                color: Math.random() < 0.5 ? '#9a4aff' : '#ff4a9a',
                alpha: Math.random() * 0.5 + 0.3
            });
        }

        return particles;
    },

    /**
     * Generate energy lines
     * @param {number} centerX
     * @param {number} centerY
     * @returns {Array}
     * @private
     */
    _generateEnergyLines(centerX, centerY) {
        const lines = [];
        const count = 12;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            lines.push({
                angle,
                length: 15 + Math.random() * 5,
                width: 1 + Math.random(),
                color: '#6a2a9a',
                pulseOffset: Math.random() * Math.PI * 2
            });
        }

        return lines;
    },

    /**
     * Generate fog patches
     * @param {number} width
     * @param {number} height
     * @returns {Array}
     * @private
     */
    _generateFogPatches(width, height) {
        const patches = [];
        const count = 8;

        for (let i = 0; i < count; i++) {
            patches.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: 5 + Math.random() * 8,
                alpha: 0.1 + Math.random() * 0.2,
                driftX: (Math.random() - 0.5) * 0.2,
                driftY: (Math.random() - 0.5) * 0.2
            });
        }

        return patches;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.CoreGenerator = CoreGenerator;

console.log('[CoreGenerator] Core generator loaded');
