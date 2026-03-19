// ============================================================================
// LINGERING HAZARDS - Ground-based damage zones that persist over time
// ============================================================================
// Handles lingering effects like poison clouds that remain after an ability
// channel phase ends. Players who enter these zones take damage over time.
//
// USAGE:
// - Call LingeringHazards.update(deltaTime, player) each frame
// - Call LingeringHazards.render(ctx, camX, camY, tileSize, offsetX) to draw
// - Poison clouds created automatically by EffectAnimator when channel ends
// ============================================================================

// ============================================================================
// HAZARD TYPE DEFINITIONS
// ============================================================================
const HAZARD_TYPES = {
    poison_cloud: {
        color: '#00ff00',
        particleColor: '#33ff33',
        damage: 3,
        tickInterval: 1.0,
        duration: 8,
        statusEffect: 'poisoned',
        statusDuration: 5,
        element: 'poison',
        opacity: 0.4
    },
    fire_patch: {
        color: '#ff4400',
        particleColor: '#ff8844',
        damage: 5,
        tickInterval: 0.5,
        duration: 6,
        statusEffect: 'burning',
        statusDuration: 3,
        element: 'fire',
        opacity: 0.5
    },
    ice_slick: {
        color: '#44aaff',
        particleColor: '#88ccff',
        damage: 0,
        tickInterval: 0.5,
        duration: 5,
        statusEffect: 'chilled',
        statusDuration: 2,
        element: 'ice',
        opacity: 0.35,
        slowAmount: 0.5
    },
    void_zone: {
        color: '#8800cc',
        particleColor: '#aa44ff',
        damage: 8,
        tickInterval: 0.8,
        duration: 4,
        statusEffect: null,
        element: 'shadow',
        opacity: 0.6
    }
};

const LingeringHazards = {
    // Active hazard zones
    zones: [],

    // Configuration
    config: {
        debugLogging: false
    },

    // ========================================================================
    // ZONE CREATION
    // ========================================================================

    /**
     * Create a poison cloud hazard zone (cone-shaped)
     * @param {number} x - Center X position (tiles)
     * @param {number} y - Center Y position (tiles)
     * @param {number} direction - Direction angle (radians)
     * @param {number} coneAngle - Cone width angle (radians)
     * @param {number} radius - Cone radius (tiles)
     * @param {number} duration - How long the cloud lasts (ms)
     * @param {number} damagePerTick - Damage dealt per tick
     * @param {number} tickInterval - Time between damage ticks (ms)
     */
    createPoisonCloud(x, y, direction, coneAngle, radius, duration, damagePerTick, tickInterval) {
        const zone = {
            type: 'poison_cloud',
            x: x,
            y: y,
            direction: direction,
            coneAngle: coneAngle,
            radius: radius,
            duration: duration,
            remainingTime: duration,
            damagePerTick: damagePerTick,
            tickInterval: tickInterval,
            tickTimer: tickInterval, // Start with a tick ready
            particles: [], // Floating particle effects
            spawnTimer: 0,
            id: Date.now() + Math.random()
        };

        this.zones.push(zone);

        if (this.config.debugLogging) {
            console.log(`[LingeringHazards] Created poison cloud at (${x.toFixed(1)}, ${y.toFixed(1)}), duration: ${duration}ms`);
        }

        return zone;
    },

    /**
     * Create a circular hazard zone (for future use with other abilities)
     */
    createCircularZone(x, y, radius, duration, damagePerTick, tickInterval, type = 'generic') {
        const zone = {
            type: type,
            shape: 'circle',
            x: x,
            y: y,
            radius: radius,
            duration: duration,
            remainingTime: duration,
            damagePerTick: damagePerTick,
            tickInterval: tickInterval,
            tickTimer: tickInterval,
            particles: [],
            spawnTimer: 0,
            id: Date.now() + Math.random()
        };

        this.zones.push(zone);
        return zone;
    },

    // ========================================================================
    // GENERIC HAZARD ZONE CREATION
    // ========================================================================

    /**
     * Create a hazard zone from a config object (unified for all types)
     * @param {Object} config - Hazard configuration
     * @returns {Object} The created zone
     */
    createHazardZone(config) {
        const typeDef = HAZARD_TYPES[config.type] || {};
        const durationMs = (config.duration || typeDef.duration || 6) * 1000;
        const tickMs = (config.tickInterval || typeDef.tickInterval || 1.0) * 1000;

        const zone = {
            type: config.type || 'generic',
            shape: 'circle',
            x: config.x,
            y: config.y,
            radius: config.radius || 2,
            duration: durationMs,
            remainingTime: durationMs,
            damagePerTick: config.damage !== undefined ? config.damage : (typeDef.damage || 0),
            tickInterval: tickMs,
            tickTimer: tickMs,
            particles: [],
            spawnTimer: 0,
            id: Date.now() + Math.random(),
            // Type-specific properties
            color: config.color || typeDef.color || '#ffffff',
            particleColor: config.particleColor || typeDef.particleColor || '#ffffff',
            element: config.element || typeDef.element || 'physical',
            opacity: config.opacity || typeDef.opacity || 0.4,
            statusEffect: config.statusEffect !== undefined ? config.statusEffect : (typeDef.statusEffect || null),
            statusDuration: (config.statusDuration || typeDef.statusDuration || 3) * 1000,
            slowAmount: config.slowAmount || typeDef.slowAmount || 0,
            // Telegraph state
            isTelegraphing: config.isTelegraphing || false,
            telegraphTimer: config.telegraphTimer || 0,
            telegraphDuration: config.telegraphDuration || 0,
            active: config.active !== undefined ? config.active : true,
            // Track whether player was in telegraph zone (for hazardsAvoided stat)
            playerWasInTelegraph: false
        };

        this.zones.push(zone);

        if (this.config.debugLogging) {
            console.log(`[LingeringHazards] Created ${zone.type} at (${zone.x.toFixed(1)}, ${zone.y.toFixed(1)}), radius: ${zone.radius}, duration: ${durationMs}ms`);
        }

        return zone;
    },

    // ========================================================================
    // TYPE-SPECIFIC CREATION FUNCTIONS
    // ========================================================================

    /**
     * Create a fire patch hazard
     */
    createFirePatch(x, y, radius, options = {}) {
        return this.createHazardZone({
            ...HAZARD_TYPES.fire_patch,
            type: 'fire_patch',
            x, y, radius: radius || 2,
            ...options
        });
    },

    /**
     * Create an ice slick hazard
     */
    createIceSlick(x, y, radius, options = {}) {
        return this.createHazardZone({
            ...HAZARD_TYPES.ice_slick,
            type: 'ice_slick',
            x, y, radius: radius || 2,
            ...options
        });
    },

    /**
     * Create a void zone hazard
     */
    createVoidZone(x, y, radius, options = {}) {
        return this.createHazardZone({
            ...HAZARD_TYPES.void_zone,
            type: 'void_zone',
            x, y, radius: radius || 1.5,
            ...options
        });
    },

    // ========================================================================
    // TELEGRAPH SYSTEM
    // ========================================================================

    /**
     * Create a hazard with a telegraph warning phase before activation
     * @param {Object} config - Hazard config plus telegraphDuration
     * @returns {Object} The created zone (starts in telegraph phase)
     */
    createTelegraphedHazard(config) {
        const telegraphDuration = (config.telegraphDuration || 0.8) * 1000; // convert to ms

        const hazard = this.createHazardZone({
            ...config,
            isTelegraphing: true,
            telegraphTimer: telegraphDuration,
            telegraphDuration: telegraphDuration,
            active: false // Doesn't deal damage during telegraph
        });

        if (this.config.debugLogging) {
            console.log(`[LingeringHazards] Telegraph started for ${hazard.type}, activates in ${telegraphDuration}ms`);
        }

        return hazard;
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    /**
     * Update all active hazard zones
     * @param {number} deltaTime - Time since last frame (ms)
     * @param {object} player - Player object with gridX, gridY, hp properties
     */
    update(deltaTime, player) {
        if (!player || this.zones.length === 0) return;

        for (let i = this.zones.length - 1; i >= 0; i--) {
            const zone = this.zones[i];

            // ---- TELEGRAPH PHASE HANDLING ----
            if (zone.isTelegraphing) {
                zone.telegraphTimer -= deltaTime;

                // Track if player is in the telegraph zone (for hazardsAvoided stat)
                const playerInTelegraph = this.isPointInZone(player.gridX, player.gridY, zone);
                if (playerInTelegraph) {
                    zone.playerWasInTelegraph = true;
                }

                // Telegraph expired - activate the hazard
                if (zone.telegraphTimer <= 0) {
                    zone.isTelegraphing = false;
                    zone.active = true;

                    // Emit hazard:created event
                    if (typeof EventBus !== 'undefined') {
                        EventBus.emit('hazard:created', {
                            type: zone.type,
                            x: zone.x,
                            y: zone.y,
                            radius: zone.radius,
                            element: zone.element
                        });
                    }

                    // Track hazardsAvoided: player was in telegraph zone but moved out
                    if (zone.playerWasInTelegraph && !playerInTelegraph) {
                        if (typeof game !== 'undefined' && game.runStats) {
                            game.runStats.hazardsAvoided = (game.runStats.hazardsAvoided || 0) + 1;
                        }
                    }

                    if (this.config.debugLogging) {
                        console.log(`[LingeringHazards] Telegraph ended, ${zone.type} now active`);
                    }
                }

                // Still update particles during telegraph (for visual feedback)
                this.updateZoneParticles(zone, deltaTime);
                continue; // Skip damage logic during telegraph
            }

            // ---- ACTIVE HAZARD PHASE ----

            // Update remaining time
            zone.remainingTime -= deltaTime;

            // Update tick timer
            zone.tickTimer -= deltaTime;

            // Check for damage tick (only when active)
            if (zone.active && zone.tickTimer <= 0) {
                zone.tickTimer += zone.tickInterval;

                // Check if player is inside the zone
                const inZone = this.isPointInZone(player.gridX, player.gridY, zone);

                if (inZone) {
                    // Apply damage
                    this.applyZoneDamage(player, zone);
                }

                // Also check enemies in zone (for player-created hazards)
                if (typeof game !== 'undefined' && game.enemies) {
                    for (const enemy of game.enemies) {
                        if (enemy.hp > 0 && this.isPointInZone(enemy.gridX, enemy.gridY, zone)) {
                            this.applyZoneDamage(enemy, zone);
                        }
                    }
                }
            }

            // Update particles
            this.updateZoneParticles(zone, deltaTime);

            // Remove expired zones
            if (zone.remainingTime <= 0) {
                this.zones.splice(i, 1);

                if (this.config.debugLogging) {
                    console.log(`[LingeringHazards] Zone expired, ${this.zones.length} remaining`);
                }
            }
        }
    },

    /**
     * Check if a point is inside a hazard zone
     */
    isPointInZone(px, py, zone) {
        if (zone.type === 'poison_cloud') {
            // Cone-shaped zone check
            const dx = px - zone.x;
            const dy = py - zone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Outside radius
            if (distance > zone.radius) return false;

            // Check angle
            const pointAngle = Math.atan2(dy, dx);
            let angleDiff = pointAngle - zone.direction;

            // Normalize angle difference to -PI to PI
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Check if within cone angle
            return Math.abs(angleDiff) <= zone.coneAngle / 2;

        } else if (zone.shape === 'circle') {
            // Circular zone check
            const dx = px - zone.x;
            const dy = py - zone.y;
            return Math.sqrt(dx * dx + dy * dy) <= zone.radius;
        }

        return false;
    },

    /**
     * Apply damage from a hazard zone to a target
     */
    applyZoneDamage(target, zone) {
        const damage = zone.damagePerTick;

        // Even zero-damage hazards can apply status effects (e.g., ice_slick)
        // Apply status effect if defined
        if (zone.statusEffect && typeof StatusEffectSystem !== 'undefined' && StatusEffectSystem.applyEffect) {
            StatusEffectSystem.applyEffect(target, zone.statusEffect, null, {
                duration: zone.statusDuration || 2000
            });
        }

        // Ice slick slow effect
        if (zone.slowAmount && zone.slowAmount > 0 && target.moveSpeedMultiplier !== undefined) {
            target.moveSpeedMultiplier = Math.min(target.moveSpeedMultiplier || 1, zone.slowAmount);
        }

        if (damage <= 0) return;

        // Route damage through CombatMaster's applyDamage for proper shield/iframe/reduction handling
        if (typeof applyDamage === 'function') {
            applyDamage(target, damage, { name: 'Hazard', isHazard: true }, { type: zone.type, element: zone.element });
        } else {
            target.hp -= damage;
        }

        // Determine damage number color based on hazard type
        const damageColors = {
            poison_cloud: '#44AA44',
            fire_patch: '#ff6644',
            ice_slick: '#44aaff',
            void_zone: '#aa44ff'
        };
        const dmgColor = damageColors[zone.type] || zone.color || '#44AA44';

        // Show damage number
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(target, damage, dmgColor);
        }

        // Hazard-specific messages
        const hazardMessages = {
            poison_cloud: `takes ${damage} poison damage from the toxic cloud!`,
            fire_patch: `takes ${damage} fire damage from the flames!`,
            ice_slick: `takes ${damage} frost damage from the ice!`,
            void_zone: `takes ${damage} shadow damage from the void zone!`
        };
        const msgTemplate = hazardMessages[zone.type] || `takes ${damage} damage from a hazard!`;

        // Show message occasionally
        if (Math.random() < 0.3 && typeof addMessage === 'function') {
            const targetName = target === (typeof game !== 'undefined' ? game.player : null) ? 'You' : (target.name || 'Enemy');
            if (targetName === 'You') {
                addMessage(`You ${msgTemplate.replace('takes', 'take')}`);
            } else {
                addMessage(`${targetName} ${msgTemplate}`);
            }
        }

        // Track hazard stats in runStats when player is damaged
        if (typeof game !== 'undefined' && game.runStats && target === game.player) {
            game.runStats.hazardsTriggered = (game.runStats.hazardsTriggered || 0) + 1;
        }

        // Emit hazard damage event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('hazard:damage', {
                target: target,
                damage: damage,
                type: zone.type,
                element: zone.element
            });
        }

        if (this.config.debugLogging) {
            console.log(`[LingeringHazards] Applied ${damage} ${zone.element || ''} damage from ${zone.type} to ${target.name || 'target'}`);
        }
    },

    // ========================================================================
    // PARTICLE EFFECTS
    // ========================================================================

    /**
     * Update particles within a zone
     */
    updateZoneParticles(zone, deltaTime) {
        // Spawn new particles
        zone.spawnTimer += deltaTime;
        if (zone.spawnTimer >= 80) { // Spawn every 80ms
            zone.spawnTimer = 0;

            // Spawn 1-2 particles per spawn cycle
            const spawnCount = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < spawnCount; i++) {
                this.spawnZoneParticle(zone);
            }
        }

        // Update existing particles
        for (let i = zone.particles.length - 1; i >= 0; i--) {
            const p = zone.particles[i];

            p.age += deltaTime;
            p.y -= p.riseSpeed * deltaTime / 1000; // Rise upward
            p.x += p.driftX * deltaTime / 1000;
            p.alpha = Math.max(0, 1 - p.age / p.lifetime);
            p.size = p.baseSize * (0.8 + 0.4 * Math.sin(p.age / 200)); // Pulsing size

            // Remove dead particles
            if (p.age >= p.lifetime) {
                zone.particles.splice(i, 1);
            }
        }
    },

    /**
     * Spawn a particle within a zone
     */
    spawnZoneParticle(zone) {
        // Random position within the cone
        let x, y;

        if (zone.type === 'poison_cloud') {
            // Random point in cone
            const randomDist = Math.random() * zone.radius;
            const randomAngle = zone.direction + (Math.random() - 0.5) * zone.coneAngle;
            x = zone.x + Math.cos(randomAngle) * randomDist;
            y = zone.y + Math.sin(randomAngle) * randomDist;
        } else {
            // Random point in circle
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * zone.radius;
            x = zone.x + Math.cos(angle) * dist;
            y = zone.y + Math.sin(angle) * dist;
        }

        zone.particles.push({
            x: x,
            y: y,
            baseSize: 3 + Math.random() * 4,
            size: 3 + Math.random() * 4,
            alpha: 0.6 + Math.random() * 0.4,
            age: 0,
            lifetime: 600 + Math.random() * 400, // 600-1000ms
            riseSpeed: 0.3 + Math.random() * 0.4, // tiles per second
            driftX: (Math.random() - 0.5) * 0.3 // slight horizontal drift
        });
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render all active hazard zones
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} camX - Camera X position
     * @param {number} camY - Camera Y position
     * @param {number} tileSize - Size of a tile in pixels
     * @param {number} offsetX - X offset for rendering
     */
    render(ctx, camX, camY, tileSize, offsetX) {
        for (const zone of this.zones) {
            // Render telegraph phase
            if (zone.isTelegraphing) {
                this.renderTelegraph(ctx, zone, camX, camY, tileSize, offsetX);
                continue;
            }

            if (zone.type === 'poison_cloud') {
                this.renderPoisonCloud(ctx, zone, camX, camY, tileSize, offsetX);
            } else {
                this.renderCircularZone(ctx, zone, camX, camY, tileSize, offsetX);
            }
        }
    },

    // ========================================================================
    // TELEGRAPH RENDERING
    // ========================================================================

    /**
     * Parse a hex color to RGB components
     */
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    },

    /**
     * Render telegraph warning before hazard activates
     * Pulsing circle at 4Hz, opacity oscillates 0.2-0.5
     */
    renderTelegraph(ctx, zone, camX, camY, tileSize, offsetX) {
        const cx = (zone.x - camX) * tileSize + offsetX + tileSize / 2;
        const cy = (zone.y - camY) * tileSize + tileSize / 2;
        const radius = zone.radius * tileSize;

        // Pulsing at 4Hz (period = 250ms)
        const pulsePhase = (Date.now() % 250) / 250;
        const pulseValue = Math.sin(pulsePhase * Math.PI * 2);

        // Opacity oscillates between 0.2 and 0.5
        const alpha = 0.2 + 0.15 * (1 + pulseValue);

        // Size pulse (slight expansion/contraction)
        const sizePulse = 1.0 + 0.05 * pulseValue;

        const rgb = this._hexToRgb(zone.color);

        ctx.save();

        // Translucent fill that oscillates
        ctx.beginPath();
        ctx.arc(cx, cy, radius * sizePulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.4})`;
        ctx.fill();

        // Pulsing outline circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius * sizePulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 1.5})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner warning indicator - small pulsing dot at center
        ctx.beginPath();
        ctx.arc(cx, cy, 3 + 2 * (1 + pulseValue) / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.6 + 0.3 * (1 + pulseValue) / 2})`;
        ctx.fill();

        // Draw particles (reduced during telegraph)
        for (const p of zone.particles) {
            const px = (p.x - camX) * tileSize + offsetX + tileSize / 2;
            const py = (p.y - camY) * tileSize + tileSize / 2;

            ctx.beginPath();
            ctx.arc(px, py, p.size * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha * 0.4})`;
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * Render a poison cloud zone (cone-shaped, legacy format)
     */
    renderPoisonCloud(ctx, zone, camX, camY, tileSize, offsetX) {
        // Calculate screen position
        const cx = (zone.x - camX) * tileSize + offsetX + tileSize / 2;
        const cy = (zone.y - camY) * tileSize + tileSize / 2;
        const radius = zone.radius * tileSize;

        // Calculate fade based on remaining time
        const fadeProgress = zone.remainingTime / zone.duration;
        const baseAlpha = 0.25 * fadeProgress;

        ctx.save();

        // Draw the cone-shaped cloud
        const startAngle = zone.direction - zone.coneAngle / 2;
        const endAngle = zone.direction + zone.coneAngle / 2;

        // Main cloud fill with gradient
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(68, 170, 68, ${baseAlpha * 1.2})`);
        gradient.addColorStop(0.5, `rgba(68, 170, 68, ${baseAlpha})`);
        gradient.addColorStop(1, `rgba(68, 170, 68, 0)`);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Pulsing edge effect
        const pulse = Math.sin(Date.now() / 300) * 0.1 + 0.9;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius * pulse, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = `rgba(102, 204, 102, ${baseAlpha * 1.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw particles
        for (const p of zone.particles) {
            const px = (p.x - camX) * tileSize + offsetX + tileSize / 2;
            const py = (p.y - camY) * tileSize + tileSize / 2;

            ctx.beginPath();
            ctx.arc(px, py, p.size * fadeProgress, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(102, 204, 102, ${p.alpha * fadeProgress})`;
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * Render a circular hazard zone with type-specific colors
     */
    renderCircularZone(ctx, zone, camX, camY, tileSize, offsetX) {
        const cx = (zone.x - camX) * tileSize + offsetX + tileSize / 2;
        const cy = (zone.y - camY) * tileSize + tileSize / 2;
        const radius = zone.radius * tileSize;

        const fadeProgress = zone.remainingTime / zone.duration;
        const typeOpacity = zone.opacity || 0.4;
        const baseAlpha = typeOpacity * fadeProgress;

        // Parse the zone color to RGB for use in rgba()
        const rgb = this._hexToRgb(zone.color || '#44aa44');
        const pRgb = this._hexToRgb(zone.particleColor || zone.color || '#66cc66');

        ctx.save();

        // Draw circular zone with type-specific color gradient
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha * 1.2})`);
        gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Pulsing edge effect (type-colored)
        const pulse = Math.sin(Date.now() / 300) * 0.1 + 0.9;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${baseAlpha * 1.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw particles with type-specific colors
        for (const p of zone.particles) {
            const px = (p.x - camX) * tileSize + offsetX + tileSize / 2;
            const py = (p.y - camY) * tileSize + tileSize / 2;

            ctx.beginPath();
            ctx.arc(px, py, p.size * fadeProgress, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, ${p.alpha * fadeProgress})`;
            ctx.fill();
        }

        ctx.restore();
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * Clear all hazard zones (call on floor transition, etc.)
     */
    clear() {
        this.zones = [];
    },

    /**
     * Get count of active zones
     */
    getActiveCount() {
        return this.zones.length;
    },

    /**
     * Check if any zones are active
     */
    hasActiveZones() {
        return this.zones.length > 0;
    }
};

// ============================================================================
// STANDALONE CREATION FUNCTIONS (convenience wrappers)
// ============================================================================

function createFirePatch(x, y, radius, options = {}) {
    return LingeringHazards.createFirePatch(x, y, radius, options);
}

function createIceSlick(x, y, radius, options = {}) {
    return LingeringHazards.createIceSlick(x, y, radius, options);
}

function createVoidZone(x, y, radius, options = {}) {
    return LingeringHazards.createVoidZone(x, y, radius, options);
}

function createTelegraphedHazard(config) {
    return LingeringHazards.createTelegraphedHazard(config);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.LingeringHazards = LingeringHazards;
    window.HAZARD_TYPES = HAZARD_TYPES;
    window.createFirePatch = createFirePatch;
    window.createIceSlick = createIceSlick;
    window.createVoidZone = createVoidZone;
    window.createTelegraphedHazard = createTelegraphedHazard;
}
