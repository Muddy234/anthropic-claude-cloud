/**
 * Kill Streak UI
 * Visual display for kill streak system including:
 * - Streak counter
 * - Tier announcements
 * - Decay timer ring
 * - "Streak Lost" flash
 */

const KillStreakUI = {
    // ==========================================================================
    // STATE
    // ==========================================================================
    state: {
        // Tier announcement
        announcementActive: false,
        announcementTier: null,
        announcementTimer: 0,
        announcementMaxTimer: 2.0,

        // Streak lost flash
        lostFlashActive: false,
        lostFlashTimer: 0,
        lostFlashMaxTimer: 0.5,
        lostStreakCount: 0,

        // Counter visibility
        counterVisible: true,
        counterFadeTimer: 0,
    },

    // ==========================================================================
    // CONFIGURATION
    // ==========================================================================
    config: {
        // Counter position (top-center)
        counterX: 0,  // Will be calculated based on canvas width
        counterY: 120,
        counterRadius: 28,

        // Announcement position
        announcementY: 180,

        // Colors (will use UI_COLORS if available)
        defaultTierColor: '#c0c0c0',
        lostFlashColor: '#ff3030',
        bgColor: 'rgba(20, 20, 20, 0.8)',
        textColor: '#ffffff'
    },

    // ==========================================================================
    // VISUAL CALLBACKS (Called by KillStreakSystem)
    // ==========================================================================

    /**
     * Show tier announcement
     * @param {Object} tier - Tier object with name and color
     */
    showTierAnnouncement(tier) {
        this.state.announcementActive = true;
        this.state.announcementTier = tier;
        this.state.announcementTimer = this.state.announcementMaxTimer;

        // Reset counter fade
        this.state.counterFadeTimer = 0;
        this.state.counterVisible = true;
    },

    /**
     * Show "Streak Lost" flash
     * @param {number} streak - How many kills were lost
     * @param {string} reason - Why it was lost
     */
    showStreakLost(streak, reason) {
        this.state.lostFlashActive = true;
        this.state.lostFlashTimer = this.state.lostFlashMaxTimer;
        this.state.lostStreakCount = streak;
    },

    // ==========================================================================
    // UPDATE
    // ==========================================================================

    /**
     * Update UI state
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Update announcement timer
        if (this.state.announcementTimer > 0) {
            this.state.announcementTimer -= dt;
            if (this.state.announcementTimer <= 0) {
                this.state.announcementActive = false;
            }
        }

        // Update lost flash timer
        if (this.state.lostFlashTimer > 0) {
            this.state.lostFlashTimer -= dt;
            if (this.state.lostFlashTimer <= 0) {
                this.state.lostFlashActive = false;
            }
        }
    },

    // ==========================================================================
    // RENDER
    // ==========================================================================

    /**
     * Render all kill streak UI elements
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        if (!ctx) return;
        if (typeof KillStreakSystem === 'undefined') return;

        const streak = KillStreakSystem.getStreak();
        const tier = KillStreakSystem.getCurrentTier();
        const decayProgress = KillStreakSystem.getDecayProgress();

        // Update center X based on canvas width
        this.config.counterX = ctx.canvas.width / 2;

        ctx.save();

        // 1. Render streak counter (only if streak > 0)
        if (streak > 0) {
            this.renderCounter(ctx, streak, tier, decayProgress);
        }

        // 2. Render tier announcement
        if (this.state.announcementActive && this.state.announcementTier) {
            this.renderAnnouncement(ctx);
        }

        // 3. Render "Streak Lost" flash
        if (this.state.lostFlashActive) {
            this.renderStreakLostFlash(ctx);
        }

        ctx.restore();
    },

    /**
     * Render the streak counter with decay ring
     */
    renderCounter(ctx, streak, tier, decayProgress) {
        const x = this.config.counterX;
        const y = this.config.counterY;
        const radius = this.config.counterRadius;

        const tierColor = tier?.color || this.config.defaultTierColor;

        ctx.save();

        // Background circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.config.bgColor;
        ctx.fill();

        // Outer glow for higher tiers
        if (tier && tier.kills >= 6) {
            const pulse = typeof getPulseValue === 'function' ? getPulseValue(0.004) : 0.5;
            ctx.shadowColor = tierColor;
            ctx.shadowBlur = 10 + pulse * 10;
        }

        // Decay ring (shrinks as decay approaches)
        const decayAngle = (1 - decayProgress) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, -Math.PI / 2, -Math.PI / 2 + decayAngle);
        ctx.strokeStyle = tierColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Border
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = tierColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Streak number
        ctx.font = 'bold 24px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = tierColor;
        ctx.fillText(streak.toString(), x, y);

        // "KILLS" label below
        ctx.font = '9px Georgia, serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('KILLS', x, y + radius + 12);

        ctx.restore();
    },

    /**
     * Render tier announcement (e.g., "KILLING SPREE!")
     */
    renderAnnouncement(ctx) {
        const tier = this.state.announcementTier;
        if (!tier) return;

        const x = this.config.counterX;
        const y = this.config.announcementY;

        // Calculate animation progress (0-1)
        const progress = 1 - (this.state.announcementTimer / this.state.announcementMaxTimer);

        // Fade in quickly, fade out slowly
        let alpha = 1;
        if (progress < 0.1) {
            alpha = progress / 0.1;  // Fade in
        } else if (progress > 0.7) {
            alpha = (1 - progress) / 0.3;  // Fade out
        }

        // Scale animation (pop in, then settle)
        let scale = 1;
        if (progress < 0.15) {
            scale = 0.5 + progress / 0.15 * 0.5;  // Scale up from 50%
        } else if (progress < 0.25) {
            scale = 1 + (0.25 - progress) / 0.1 * 0.1;  // Overshoot then settle
        }

        ctx.save();

        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Glow effect
        ctx.shadowColor = tier.color;
        ctx.shadowBlur = 20;

        // Tier name
        ctx.font = 'bold 28px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = tier.color;
        ctx.fillText(tier.name.toUpperCase(), 0, 0);

        // Reset shadow and draw again for crisp text
        ctx.shadowBlur = 0;
        ctx.fillText(tier.name.toUpperCase(), 0, 0);

        ctx.restore();
    },

    /**
     * Render red flash when streak is lost
     */
    renderStreakLostFlash(ctx) {
        const progress = 1 - (this.state.lostFlashTimer / this.state.lostFlashMaxTimer);
        const alpha = (1 - progress) * 0.3;  // Fade out from 30% opacity

        ctx.save();

        // Red vignette flash
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        const vignetteGrad = ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.2,
            width / 2, height / 2, Math.max(width, height) * 0.9
        );
        vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGrad.addColorStop(1, `rgba(180, 0, 0, ${alpha})`);

        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, width, height);

        // "STREAK LOST" text (if streak was significant)
        if (this.state.lostStreakCount >= 4 && progress < 0.6) {
            const textAlpha = (0.6 - progress) / 0.6;
            ctx.globalAlpha = textAlpha;

            ctx.font = 'bold 20px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.config.lostFlashColor;
            ctx.fillText('STREAK LOST', width / 2, this.config.counterY);

            ctx.font = '14px Georgia, serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(`${this.state.lostStreakCount} kills`, width / 2, this.config.counterY + 22);
        }

        ctx.restore();
    }
};

// =============================================================================
// EXPORTS
// =============================================================================

if (typeof window !== 'undefined') {
    window.KillStreakUI = KillStreakUI;
}
