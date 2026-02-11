// ============================================================================
// DODGE SYSTEM - The Shifting Chasm
// ============================================================================
// Provides active defense through dodge rolling with invincibility frames
// Warbringer Agent - Issue #7: Active Defense System
// ============================================================================

/**
 * DODGE SYSTEM DESIGN
 * ===================
 *
 * Purpose: Give players an active defensive option to avoid attacks
 *
 * Mechanics:
 * - Press Space to dodge roll in facing direction
 * - 0.3s invincibility frames (i-frames) during roll
 * - 1.0s cooldown between dodges
 * - 15 stamina cost per dodge
 * - Cannot dodge while stunned, frozen, or rooted
 * - Movement disabled during dodge animation
 *
 * Integration:
 * - Combat system checks DodgeSystem.isInvincible() before applying damage
 * - Input handler triggers DodgeSystem.tryDodge() on Space press
 * - Player state tracks dodge cooldown and i-frame status
 *
 * Balance Notes:
 * - Stamina cost prevents dodge spam
 * - Cooldown window creates risk/reward timing
 * - Direction locked at roll start (commit to direction)
 */

const DODGE_CONFIG = {
    // Timing (in seconds)
    iframeDuration: 0.3,          // Invincibility frames duration
    rollDuration: 0.35,           // Total roll animation duration
    cooldown: 1.0,                // Cooldown between dodges

    // Cost
    staminaCost: 15,              // Stamina cost per dodge

    // Movement
    rollDistance: 2.0,            // Tiles traveled during roll
    rollSpeed: 6.0,               // Tiles per second during roll

    // Visual
    trailEnabled: true,           // Show afterimage trail
    trailCount: 3,                // Number of afterimages
    screenShakeOnDodge: false,    // Optional screen shake

    // Audio
    soundEnabled: true,
    soundVolume: 0.5
};

/**
 * Dodge System Singleton
 * Manages player dodge rolling with i-frames
 */
const DodgeSystem = {
    name: 'dodge-system',
    initialized: false,

    // State tracking
    state: {
        isDodging: false,         // Currently in dodge animation
        isInvincible: false,      // Currently in i-frames
        cooldownRemaining: 0,     // Time until next dodge available
        rollTimer: 0,             // Time remaining in roll animation
        iframeTimer: 0,           // Time remaining in i-frames
        rollDirection: null,      // Direction locked at roll start
        rollStartX: 0,            // Starting position
        rollStartY: 0,
        rollTargetX: 0,           // Target position
        rollTargetY: 0,
        rollProgress: 0           // 0-1 animation progress
    },

    // Afterimage trail for visual effect
    trail: [],

    /**
     * Initialize the dodge system
     */
    init() {
        if (this.initialized) return;

        // Reset state
        this.resetState();

        this.initialized = true;
        console.log('[DodgeSystem] Initialized');
    },

    /**
     * Reset dodge state (e.g., on death or floor change)
     */
    resetState() {
        this.state = {
            isDodging: false,
            isInvincible: false,
            cooldownRemaining: 0,
            rollTimer: 0,
            iframeTimer: 0,
            rollDirection: null,
            rollStartX: 0,
            rollStartY: 0,
            rollTargetX: 0,
            rollTargetY: 0,
            rollProgress: 0
        };
        this.trail = [];
    },

    /**
     * Update dodge system each frame
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!game?.player) return;

        const player = game.player;

        // Update cooldown
        if (this.state.cooldownRemaining > 0) {
            this.state.cooldownRemaining -= dt;
            if (this.state.cooldownRemaining < 0) {
                this.state.cooldownRemaining = 0;
            }
        }

        // Update i-frame timer
        if (this.state.iframeTimer > 0) {
            this.state.iframeTimer -= dt;
            if (this.state.iframeTimer <= 0) {
                this.state.iframeTimer = 0;
                this.state.isInvincible = false;
            }
        }

        // Update roll animation
        if (this.state.isDodging) {
            this.updateRoll(dt, player);
        }

        // Update trail fade
        this.updateTrail(dt);
    },

    /**
     * Update the roll movement animation
     * @param {number} dt - Delta time in seconds
     * @param {Object} player - Player entity
     */
    updateRoll(dt, player) {
        this.state.rollTimer -= dt;

        // Calculate progress (0 to 1)
        const totalDuration = DODGE_CONFIG.rollDuration;
        this.state.rollProgress = 1 - (this.state.rollTimer / totalDuration);
        this.state.rollProgress = Math.min(1, Math.max(0, this.state.rollProgress));

        // Easing function for smooth acceleration/deceleration
        const eased = this.easeOutQuad(this.state.rollProgress);

        // Interpolate position
        const newX = this.state.rollStartX + (this.state.rollTargetX - this.state.rollStartX) * eased;
        const newY = this.state.rollStartY + (this.state.rollTargetY - this.state.rollStartY) * eased;

        // Check collision at new position
        if (this.canMoveTo(Math.floor(newX), Math.floor(newY))) {
            player.gridX = newX;
            player.gridY = newY;
            player.displayX = newX;
            player.displayY = newY;
            player.x = newX;
            player.y = newY;
        }

        // Add trail afterimage
        if (DODGE_CONFIG.trailEnabled && this.state.rollProgress < 0.8) {
            if (Math.random() < 0.3) { // 30% chance each frame to add trail
                this.addTrailImage(player.gridX, player.gridY, player.facing);
            }
        }

        // Roll complete
        if (this.state.rollTimer <= 0) {
            this.endRoll(player);
        }
    },

    /**
     * Attempt to perform a dodge roll
     * @param {Object} player - Player entity
     * @param {string} [direction] - Optional override direction (defaults to facing)
     * @returns {boolean} - Whether dodge was successful
     */
    tryDodge(player, direction = null) {
        if (!player) return false;

        // Cannot dodge if already dodging
        if (this.state.isDodging) {
            return false;
        }

        // Cannot dodge if on cooldown
        if (this.state.cooldownRemaining > 0) {
            if (typeof addMessage === 'function') {
                addMessage('Dodge on cooldown!', 'warning');
            }
            return false;
        }

        // Cannot dodge if stunned, frozen, or rooted
        if (player.isStunned || player.isFrozen || player.isRooted) {
            if (typeof addMessage === 'function') {
                addMessage('Cannot dodge while immobilized!', 'warning');
            }
            return false;
        }

        // Check stamina cost
        if ((player.stamina || 0) < DODGE_CONFIG.staminaCost) {
            if (typeof addMessage === 'function') {
                addMessage('Not enough stamina to dodge!', 'warning');
            }
            return false;
        }

        // Consume stamina
        player.stamina -= DODGE_CONFIG.staminaCost;

        // Start the dodge roll
        this.startRoll(player, direction || player.facing);

        return true;
    },

    /**
     * Start the dodge roll animation
     * @param {Object} player - Player entity
     * @param {string} direction - Direction to roll
     */
    startRoll(player, direction) {
        // Calculate roll direction vector
        const dirVector = this.getDirectionVector(direction);

        // Store starting position
        this.state.rollStartX = player.gridX;
        this.state.rollStartY = player.gridY;

        // Calculate target position
        let targetX = player.gridX + dirVector.x * DODGE_CONFIG.rollDistance;
        let targetY = player.gridY + dirVector.y * DODGE_CONFIG.rollDistance;

        // Clamp target to valid walkable position
        const clamped = this.clampToWalkable(
            player.gridX, player.gridY,
            targetX, targetY,
            dirVector.x, dirVector.y
        );
        targetX = clamped.x;
        targetY = clamped.y;

        // Set state
        this.state.isDodging = true;
        this.state.isInvincible = true;
        this.state.rollTimer = DODGE_CONFIG.rollDuration;
        this.state.iframeTimer = DODGE_CONFIG.iframeDuration;
        this.state.cooldownRemaining = DODGE_CONFIG.cooldown;
        this.state.rollDirection = direction;
        this.state.rollTargetX = targetX;
        this.state.rollTargetY = targetY;
        this.state.rollProgress = 0;

        // Update player facing
        player.facing = direction;

        // Mark player as moving (blocks other movement input)
        player.isMoving = true;

        // Play dodge sound
        if (DODGE_CONFIG.soundEnabled && typeof AudioManager !== 'undefined') {
            AudioManager.playSfx('dodge', DODGE_CONFIG.soundVolume);
        }

        // Emit event for UI/effects
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('player:dodge_start', {
                player: player,
                direction: direction,
                targetX: targetX,
                targetY: targetY
            });
        }

        console.log(`[DodgeSystem] Dodge started - direction: ${direction}, target: (${targetX.toFixed(2)}, ${targetY.toFixed(2)})`);
    },

    /**
     * End the dodge roll animation
     * @param {Object} player - Player entity
     */
    endRoll(player) {
        this.state.isDodging = false;
        this.state.rollProgress = 1;

        // Snap to final position
        player.gridX = this.state.rollTargetX;
        player.gridY = this.state.rollTargetY;
        player.displayX = this.state.rollTargetX;
        player.displayY = this.state.rollTargetY;
        player.x = this.state.rollTargetX;
        player.y = this.state.rollTargetY;

        // Release movement lock
        player.isMoving = false;

        // Emit event for UI/effects
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('player:dodge_end', {
                player: player,
                finalX: player.gridX,
                finalY: player.gridY
            });
        }

        console.log(`[DodgeSystem] Dodge ended at (${player.gridX.toFixed(2)}, ${player.gridY.toFixed(2)})`);
    },

    /**
     * Check if player is currently invincible (in i-frames)
     * @returns {boolean}
     */
    isInvincible() {
        return this.state.isInvincible;
    },

    /**
     * Check if player is currently dodging
     * @returns {boolean}
     */
    isDodging() {
        return this.state.isDodging;
    },

    /**
     * Get remaining cooldown time
     * @returns {number} - Seconds until dodge available
     */
    getCooldownRemaining() {
        return this.state.cooldownRemaining;
    },

    /**
     * Get cooldown as percentage (for UI)
     * @returns {number} - 0-1 where 1 = ready
     */
    getCooldownPercent() {
        if (DODGE_CONFIG.cooldown <= 0) return 1;
        return 1 - (this.state.cooldownRemaining / DODGE_CONFIG.cooldown);
    },

    /**
     * Convert direction string to vector
     * @param {string} direction - Direction name
     * @returns {Object} - {x, y} vector
     */
    getDirectionVector(direction) {
        const vectors = {
            'up': { x: 0, y: -1 },
            'down': { x: 0, y: 1 },
            'left': { x: -1, y: 0 },
            'right': { x: 1, y: 0 },
            'up-left': { x: -0.707, y: -0.707 },
            'up-right': { x: 0.707, y: -0.707 },
            'down-left': { x: -0.707, y: 0.707 },
            'down-right': { x: 0.707, y: 0.707 }
        };
        return vectors[direction] || vectors['down'];
    },

    /**
     * Check if a tile is walkable
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {boolean}
     */
    canMoveTo(x, y) {
        if (!game?.map) return false;

        const tile = game.map[Math.floor(y)]?.[Math.floor(x)];
        if (!tile) return false;

        // Check tile walkability
        if (tile.solid || tile.type === 'wall' || tile.type === 'void') {
            return false;
        }

        // Check Collision utility if available
        if (typeof Collision !== 'undefined' && typeof Collision.checkTileCollision === 'function') {
            return !Collision.checkTileCollision(x, y);
        }

        return true;
    },

    /**
     * Clamp target position to nearest walkable tile along the roll path
     * @param {number} startX - Starting X
     * @param {number} startY - Starting Y
     * @param {number} targetX - Target X
     * @param {number} targetY - Target Y
     * @param {number} dirX - Direction X component
     * @param {number} dirY - Direction Y component
     * @returns {Object} - {x, y} clamped position
     */
    clampToWalkable(startX, startY, targetX, targetY, dirX, dirY) {
        // Step along the path and find the furthest walkable point
        const steps = Math.ceil(DODGE_CONFIG.rollDistance * 4); // 4 checks per tile
        let lastValidX = startX;
        let lastValidY = startY;

        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const checkX = startX + (targetX - startX) * progress;
            const checkY = startY + (targetY - startY) * progress;

            if (this.canMoveTo(checkX, checkY)) {
                lastValidX = checkX;
                lastValidY = checkY;
            } else {
                // Hit a wall, stop here
                break;
            }
        }

        return { x: lastValidX, y: lastValidY };
    },

    /**
     * Easing function for smooth roll animation
     * @param {number} t - Progress 0-1
     * @returns {number} - Eased value
     */
    easeOutQuad(t) {
        return t * (2 - t);
    },

    /**
     * Add an afterimage to the trail
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} facing - Direction facing
     */
    addTrailImage(x, y, facing) {
        if (this.trail.length >= DODGE_CONFIG.trailCount * 2) {
            this.trail.shift(); // Remove oldest if at limit
        }

        this.trail.push({
            x: x,
            y: y,
            facing: facing,
            alpha: 0.5,
            timer: 0.2 // Fade time in seconds
        });
    },

    /**
     * Update trail afterimages
     * @param {number} dt - Delta time in seconds
     */
    updateTrail(dt) {
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].timer -= dt;
            this.trail[i].alpha = Math.max(0, this.trail[i].timer / 0.2 * 0.5);

            if (this.trail[i].timer <= 0) {
                this.trail.splice(i, 1);
            }
        }
    },

    /**
     * Get trail images for rendering
     * @returns {Array} - Trail afterimages
     */
    getTrail() {
        return this.trail;
    },

    /**
     * Render debug info (for development)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderDebug(ctx) {
        if (!ctx || !game?.player) return;

        const player = game.player;
        const x = 10;
        let y = 200;

        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';

        ctx.fillText(`[Dodge System]`, x, y); y += 15;
        ctx.fillText(`  isDodging: ${this.state.isDodging}`, x, y); y += 12;
        ctx.fillText(`  isInvincible: ${this.state.isInvincible}`, x, y); y += 12;
        ctx.fillText(`  cooldown: ${this.state.cooldownRemaining.toFixed(2)}s`, x, y); y += 12;
        ctx.fillText(`  stamina: ${player.stamina}/${player.maxStamina}`, x, y); y += 12;
        ctx.fillText(`  direction: ${this.state.rollDirection || 'none'}`, x, y); y += 12;

        ctx.restore();
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('dodge-system', DodgeSystem, 25); // Priority 25 (before combat at 30)
} else {
    // Fallback: initialize on load
    if (typeof game !== 'undefined') {
        DodgeSystem.init();
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.DodgeSystem = DodgeSystem;
    window.DODGE_CONFIG = DODGE_CONFIG;
}

console.log('[DodgeSystem] Dodge system loaded');
