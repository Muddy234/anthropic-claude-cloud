// ============================================================================
// PROJECTILE MANAGER - The Shifting Chasm
// ============================================================================
// Tracks active projectiles, handles movement, collision, and lifecycle.
// Extracted from CombatMaster for modularity.
//
// Loading order: projectile-manager.js loads AFTER combat-master.js
// (see index.html). It wraps the existing projectile functions already
// defined in CombatMaster and provides a clean facade for other systems.
// ============================================================================

const ProjectileManager = {

    // ========================================================================
    // ACTIVE PROJECTILES (reference to the canonical array in CombatMaster)
    // ========================================================================

    /**
     * Get the active projectiles array.
     * Uses the CombatMaster's `projectiles` array if available, otherwise
     * falls back to an internal list.
     */
    get activeProjectiles() {
        // `projectiles` is the canonical array defined in combat-master.js
        if (typeof projectiles !== 'undefined') {
            return projectiles;
        }
        // Fallback (should not happen in production)
        if (!this._internalProjectiles) {
            this._internalProjectiles = [];
        }
        return this._internalProjectiles;
    },

    // ========================================================================
    // SPAWN
    // ========================================================================

    /**
     * Create a new projectile.
     * @param {Object} config - Projectile configuration:
     *   { x, y, targetX, targetY, target, dirX, dirY, speed, maxDistance,
     *     damage, element, attacker/owner, isMagic, isSkill, isSpecial,
     *     elementConfig, fadeAfter }
     * @returns {Object|null} The created projectile, or null if instant-hit
     */
    spawn(config) {
        // Delegate to CombatMaster's createProjectile if available
        if (typeof createProjectile === 'function') {
            return createProjectile(config);
        }

        // Inline fallback (minimal implementation)
        console.warn('[ProjectileManager] createProjectile not available, using fallback');
        return this._spawnFallback(config);
    },

    /**
     * Minimal fallback spawn when CombatMaster is not loaded.
     */
    _spawnFallback(config) {
        let dx, dy, distance;

        if (config.dirX !== undefined && config.dirY !== undefined) {
            dx = config.dirX;
            dy = config.dirY;
            distance = config.maxDistance || 10;
        } else {
            dx = config.targetX - config.x;
            dy = config.targetY - config.y;
            distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0) return null;
            dx = dx / distance;
            dy = dy / distance;
        }

        const projectile = {
            active: true,
            x: config.x,
            y: config.y,
            displayX: config.x,
            displayY: config.y,
            targetX: config.targetX,
            targetY: config.targetY,
            target: config.target,
            dirX: dx,
            dirY: dy,
            velocityX: dx * config.speed,
            velocityY: dy * config.speed,
            speed: config.speed,
            distanceToTravel: config.maxDistance || distance,
            distanceTraveled: 0,
            fadeStart: config.fadeAfter || config.maxDistance || distance,
            alpha: 1.0,
            damage: config.damage,
            element: config.element || 'physical',
            attacker: config.attacker || config.owner,
            isMagic: config.isMagic || false,
            isSkill: config.isSkill || false,
            isSpecial: config.isSpecial || false,
            elementConfig: config.elementConfig || null,
            isDirectionBased: config.dirX !== undefined,
            hasHit: false
        };

        this.activeProjectiles.push(projectile);
        return projectile;
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update all active projectiles (movement, collision, lifecycle).
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        // Delegate to CombatMaster's updateProjectiles if available
        if (typeof updateProjectiles === 'function') {
            updateProjectiles(dt);
            return;
        }

        // Minimal fallback: just move projectiles and remove expired ones
        const dtSec = dt / 1000;
        const list = this.activeProjectiles;

        for (let i = list.length - 1; i >= 0; i--) {
            const proj = list[i];
            if (!proj.active) {
                list.splice(i, 1);
                continue;
            }

            proj.displayX += proj.velocityX * dtSec;
            proj.displayY += proj.velocityY * dtSec;
            proj.distanceTraveled += proj.speed * dtSec;

            if (proj.distanceTraveled >= proj.distanceToTravel) {
                proj.active = false;
                list.splice(i, 1);
            }
        }
    },

    // ========================================================================
    // RENDER
    // ========================================================================

    /**
     * Render all active projectiles.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} camX
     * @param {number} camY
     * @param {number} tileSize
     * @param {number} offsetX
     */
    render(ctx, camX, camY, tileSize, offsetX) {
        if (typeof renderProjectiles === 'function') {
            renderProjectiles(ctx, camX, camY, tileSize, offsetX);
            return;
        }
        // No fallback rendering -- projectiles won't draw without CombatMaster
    },

    // ========================================================================
    // COLLISION HELPERS
    // ========================================================================

    /**
     * Check if a grid position blocks projectiles.
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {boolean}
     */
    checkCollision(x, y) {
        if (typeof checkProjectileCollision === 'function') {
            return checkProjectileCollision(x, y);
        }
        // Fallback: treat out-of-bounds and walls as blocking
        if (typeof game !== 'undefined' && game.map) {
            const tile = game.map[Math.floor(y)]?.[Math.floor(x)];
            if (!tile) return true;
            if (tile.type === 'wall' || tile.type === 'void') return true;
        }
        return false;
    },

    /**
     * Check line of sight between two points.
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @returns {boolean}
     */
    hasLineOfSight(x1, y1, x2, y2) {
        if (typeof checkLineOfSight === 'function') {
            return checkLineOfSight(x1, y1, x2, y2);
        }
        return true; // Optimistic fallback
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Remove all active projectiles.
     */
    cleanup() {
        if (typeof clearProjectiles === 'function') {
            clearProjectiles();
            return;
        }
        const list = this.activeProjectiles;
        list.length = 0;
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get count of active projectiles.
     * @returns {number}
     */
    getCount() {
        return this.activeProjectiles.filter(p => p.active).length;
    },

    /**
     * Get all projectiles belonging to a specific attacker.
     * @param {Object} attacker
     * @returns {Array}
     */
    getByAttacker(attacker) {
        return this.activeProjectiles.filter(p => p.active && p.attacker === attacker);
    },
};

// ============================================================================
// EXPORTS
// ============================================================================
window.ProjectileManager = ProjectileManager;
console.log('[ProjectileManager] Projectile manager loaded');
