/**
 * Time Effects System
 * Manages time manipulation effects like time slow and time stop for combat impact.
 * Used to create dramatic moments during heavy hits, killing blows, and critical strikes.
 */

const TimeEffects = {
    // ==========================================================================
    // STATE
    // ==========================================================================
    state: {
        timeScale: 1.0,          // Current time scale (1.0 = normal, 0.5 = half speed)
        slowTimer: 0,            // Remaining duration of current slow effect
        targetScale: 1.0,        // Target time scale during slow
        easeOutTimer: 0,         // Timer for smooth ease-out back to normal
        easeOutDuration: 0.05,   // Duration of ease-out (50ms)
    },

    // Visual feedback state
    feedback: {
        vignette: false,         // Show dramatic vignette during time slow
        desaturate: false,       // Desaturate colors slightly
        intensity: 0,            // 0-1 intensity for visual effects
    },

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    init() {
        this.reset();
        console.log('[TimeEffects] Initialized');
    },

    reset() {
        this.state.timeScale = 1.0;
        this.state.slowTimer = 0;
        this.state.targetScale = 1.0;
        this.state.easeOutTimer = 0;
        this.feedback.vignette = false;
        this.feedback.desaturate = false;
        this.feedback.intensity = 0;
    },

    // ==========================================================================
    // CORE METHODS
    // ==========================================================================

    /**
     * Trigger a time slow effect
     * @param {number} durationMs - Duration in milliseconds
     * @param {number} factor - Time scale factor (0.5 = half speed)
     * @param {Object} options - Additional options { vignette, desaturate }
     */
    triggerSlow(durationMs, factor = 0.5, options = {}) {
        // Convert ms to seconds
        const duration = durationMs / 1000;

        // Only apply if this would be slower than current effect
        if (factor >= this.state.timeScale && this.state.slowTimer > 0) {
            return; // Don't override with a weaker slow
        }

        this.state.slowTimer = duration;
        this.state.targetScale = Math.max(0.1, Math.min(1.0, factor));
        this.state.timeScale = this.state.targetScale;

        // Visual options
        this.feedback.vignette = options.vignette !== undefined ? options.vignette : (factor <= 0.5);
        this.feedback.desaturate = options.desaturate !== undefined ? options.desaturate : (factor <= 0.3);
        this.feedback.intensity = 1.0 - factor; // Lower factor = higher intensity

        // console.log(`[TimeEffects] Time slow triggered: ${factor}x for ${durationMs}ms`);
    },

    /**
     * Trigger a brief time stop (frame freeze)
     * @param {number} durationMs - Duration in milliseconds
     */
    triggerStop(durationMs) {
        this.triggerSlow(durationMs, 0, { vignette: true, desaturate: true });
    },

    /**
     * Trigger a subtle impact slow (for normal hits)
     * @param {number} durationMs - Duration in milliseconds
     */
    triggerImpactSlow(durationMs) {
        this.triggerSlow(durationMs, 0.7, { vignette: false, desaturate: false });
    },

    /**
     * Trigger a dramatic slow (for killing blows, crits)
     * @param {number} durationMs - Duration in milliseconds
     */
    triggerDramaticSlow(durationMs) {
        this.triggerSlow(durationMs, 0.3, { vignette: true, desaturate: false });
    },

    // ==========================================================================
    // UPDATE
    // ==========================================================================

    /**
     * Update time effects each frame
     * @param {number} realDt - Real delta time in seconds (unscaled)
     * @returns {number} - Scaled delta time to use for game updates
     */
    update(realDt) {
        // Update slow timer using real time (not scaled)
        if (this.state.slowTimer > 0) {
            this.state.slowTimer -= realDt;

            if (this.state.slowTimer <= 0) {
                // Start ease-out back to normal speed
                this.state.slowTimer = 0;
                this.state.easeOutTimer = this.state.easeOutDuration;
            }
        }

        // Handle ease-out back to normal
        if (this.state.easeOutTimer > 0) {
            this.state.easeOutTimer -= realDt;
            const progress = 1 - (this.state.easeOutTimer / this.state.easeOutDuration);
            const eased = this.easeOutQuad(progress);

            this.state.timeScale = this.state.targetScale + (1.0 - this.state.targetScale) * eased;
            this.feedback.intensity = (1.0 - this.state.targetScale) * (1 - eased);

            if (this.state.easeOutTimer <= 0) {
                // Fully back to normal
                this.state.timeScale = 1.0;
                this.state.targetScale = 1.0;
                this.feedback.vignette = false;
                this.feedback.desaturate = false;
                this.feedback.intensity = 0;
            }
        }

        // Return scaled delta time
        return realDt * this.state.timeScale;
    },

    // ==========================================================================
    // GETTERS
    // ==========================================================================

    /**
     * Get current time scale
     * @returns {number} - Time scale (1.0 = normal)
     */
    getScale() {
        return this.state.timeScale;
    },

    /**
     * Check if time is currently slowed
     * @returns {boolean}
     */
    isSlowed() {
        return this.state.timeScale < 1.0;
    },

    /**
     * Get visual feedback state for rendering
     * @returns {Object} - { vignette, desaturate, intensity }
     */
    getVisualFeedback() {
        return {
            vignette: this.feedback.vignette,
            desaturate: this.feedback.desaturate,
            intensity: this.feedback.intensity
        };
    },

    // ==========================================================================
    // UTILITY
    // ==========================================================================

    /**
     * Easing function for smooth transitions
     * @param {number} t - Progress 0-1
     * @returns {number} - Eased value
     */
    easeOutQuad(t) {
        return t * (2 - t);
    },

    /**
     * Apply time scale to a delta time value
     * @param {number} dt - Delta time to scale
     * @returns {number} - Scaled delta time
     */
    applyScale(dt) {
        return dt * this.state.timeScale;
    },

    /**
     * Render debug overlay
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderDebug(ctx) {
        if (!ctx) return;
        if (this.state.timeScale >= 1.0) return;

        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';

        const x = ctx.canvas.width - 10;
        let y = 100;

        ctx.fillText(`[Time Effects]`, x, y); y += 15;
        ctx.fillText(`  scale: ${this.state.timeScale.toFixed(2)}x`, x, y); y += 12;
        ctx.fillText(`  timer: ${(this.state.slowTimer * 1000).toFixed(0)}ms`, x, y); y += 12;
        ctx.fillText(`  intensity: ${this.feedback.intensity.toFixed(2)}`, x, y);

        ctx.restore();
    }
};

// =============================================================================
// VISUAL EFFECT RENDERING
// =============================================================================

/**
 * Render time slow visual effects (vignette, desaturation)
 * Call this in the main render loop when time is slowed
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
function renderTimeSlowEffects(ctx) {
    if (!ctx) return;
    if (typeof TimeEffects === 'undefined') return;

    const feedback = TimeEffects.getVisualFeedback();
    if (feedback.intensity <= 0) return;

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.save();

    // Vignette effect
    if (feedback.vignette) {
        const vignetteGrad = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.3,
            width / 2, height / 2, Math.max(width, height) * 0.8
        );
        vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGrad.addColorStop(1, `rgba(0, 0, 0, ${0.3 * feedback.intensity})`);

        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, width, height);
    }

    // Subtle blue/white tint for "frozen time" feel
    if (feedback.desaturate) {
        ctx.fillStyle = `rgba(200, 220, 255, ${0.1 * feedback.intensity})`;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
}

// =============================================================================
// EXPORTS
// =============================================================================

if (typeof window !== 'undefined') {
    window.TimeEffects = TimeEffects;
    window.renderTimeSlowEffects = renderTimeSlowEffects;
}
