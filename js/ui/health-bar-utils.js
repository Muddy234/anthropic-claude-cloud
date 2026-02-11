// ============================================================================
// HEALTH BAR UTILITIES - The Shifting Chasm
// ============================================================================
// Issue #12: Consolidated health bar rendering utilities
// Provides shared functions for drawing health bars across different UI contexts
// ============================================================================

const HealthBarUtils = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    // Default color schemes
    colors: {
        // Health states
        healthHigh: '#2ecc71',      // Green (>50%)
        healthMed: '#f1c40f',       // Yellow (20-50%)
        healthLow: '#e74c3c',       // Red (<20%)
        healthCritical: '#ff2222', // Pulsing red (<25%)

        // Background and border
        bgDark: '#333333',
        bgDarker: '#111111',
        border: '#111111',
        borderHighlight: '#ffff00',

        // Damage trail
        damageTrail: 'rgba(231, 76, 60, 0.5)',

        // Text
        textPrimary: '#ffffff',
        textShadow: 'rgba(0, 0, 0, 0.9)'
    },

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    /**
     * Get health color based on percentage
     * @param {number} pct - Health percentage (0-1)
     * @returns {string} Color hex code
     */
    getHealthColor(pct) {
        if (pct > 0.5) return this.colors.healthHigh;
        if (pct > 0.2) return this.colors.healthMed;
        return this.colors.healthLow;
    },

    /**
     * Create a health gradient for styled bars
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} height - Bar height
     * @param {number} pct - Health percentage (0-1)
     * @returns {CanvasGradient} Linear gradient
     */
    createHealthGradient(ctx, x, y, height, pct) {
        const grad = ctx.createLinearGradient(x, y, x, y + height);

        if (pct > 0.5) {
            // Healthy - green gradient
            grad.addColorStop(0, '#e74c3c');
            grad.addColorStop(0.5, '#c0392b');
            grad.addColorStop(1, '#8b1a1a');
        } else if (pct > 0.25) {
            // Warning - orange gradient
            grad.addColorStop(0, '#e67e22');
            grad.addColorStop(1, '#d35400');
        } else {
            // Critical - pulsing red
            const pulse = this.getPulse(0.006);
            grad.addColorStop(0, `rgb(${231 + pulse * 24}, ${76 - pulse * 40}, ${60 - pulse * 30})`);
            grad.addColorStop(1, '#8b1a1a');
        }

        return grad;
    },

    /**
     * Get pulse value for animations
     * @param {number} speed - Pulse speed
     * @returns {number} Pulse value (0-1)
     */
    getPulse(speed) {
        if (typeof getPulseValue === 'function') {
            return getPulseValue(speed);
        }
        // Fallback pulse calculation
        return (Math.sin(Date.now() * speed) + 1) / 2;
    },

    // ========================================================================
    // DRAWING FUNCTIONS
    // ========================================================================

    /**
     * Draw a simple health bar (for in-world entity bars)
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} options - Drawing options
     * @param {number} options.x - X position
     * @param {number} options.y - Y position
     * @param {number} options.width - Bar width
     * @param {number} options.height - Bar height (default: 4)
     * @param {number} options.current - Current HP
     * @param {number} options.max - Maximum HP
     * @param {boolean} options.highlighted - Whether bar is highlighted (yellow border)
     */
    drawSimple(ctx, options) {
        const {
            x,
            y,
            width,
            height = 4,
            current,
            max,
            highlighted = false
        } = options;

        const pct = Math.max(0, Math.min(1, current / max));

        // Background
        ctx.fillStyle = this.colors.bgDark;
        ctx.fillRect(x, y, width, height);

        // Health fill
        ctx.fillStyle = this.getHealthColor(pct);
        ctx.fillRect(x, y, width * pct, height);

        // Border
        ctx.strokeStyle = highlighted ? this.colors.borderHighlight : this.colors.border;
        ctx.lineWidth = highlighted ? 2 : 1;
        ctx.strokeRect(x, y, width, height);
    },

    /**
     * Draw a styled health bar (for HUD/unit frames)
     * Includes gradient, damage trail, shine effect, and text
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} options - Drawing options
     * @param {number} options.x - X position
     * @param {number} options.y - Y position
     * @param {number} options.width - Bar width
     * @param {number} options.height - Bar height
     * @param {number} options.displayValue - Displayed HP (can be animated)
     * @param {number} options.actualValue - Actual current HP
     * @param {number} options.maxValue - Maximum HP
     * @param {boolean} options.showText - Whether to show HP text
     * @param {Object} options.customColors - Custom color overrides
     */
    drawStyled(ctx, options) {
        const {
            x,
            y,
            width,
            height,
            displayValue,
            actualValue,
            maxValue,
            showText = true,
            customColors = {}
        } = options;

        const colors = { ...this.colors, ...customColors };
        const displayPct = Math.max(0, Math.min(1, displayValue / maxValue));
        const actualPct = Math.max(0, Math.min(1, actualValue / maxValue));

        ctx.save();

        // Background
        ctx.fillStyle = colors.bgDarker || '#8b1a1a';
        ctx.fillRect(x, y, width, height);

        // Damage trail (shows where health was)
        if (displayPct > actualPct) {
            ctx.fillStyle = colors.damageTrail;
            ctx.fillRect(x, y, width * displayPct, height);
        }

        // Main health fill with gradient
        if (actualPct > 0) {
            ctx.fillStyle = this.createHealthGradient(ctx, x, y, height, actualPct);
            ctx.fillRect(x, y, width * actualPct, height);

            // Shine effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(x, y, width * actualPct, height / 3);
        }

        // Border
        ctx.strokeStyle = colors.border || '#3a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        // HP Text
        if (showText) {
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = colors.textPrimary;
            ctx.shadowColor = colors.textShadow;
            ctx.shadowBlur = 3;
            ctx.fillText(`${Math.ceil(actualValue)}/${maxValue}`, x + width / 2, y + height / 2 + 1);
        }

        ctx.restore();
    },

    /**
     * Draw a segmented health bar (for bosses with multiple phases)
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} options - Drawing options
     * @param {number} options.x - X position
     * @param {number} options.y - Y position
     * @param {number} options.width - Bar width
     * @param {number} options.height - Bar height
     * @param {number} options.current - Current HP
     * @param {number} options.max - Maximum HP
     * @param {number} options.segments - Number of segments
     */
    drawSegmented(ctx, options) {
        const {
            x,
            y,
            width,
            height,
            current,
            max,
            segments = 4
        } = options;

        const pct = Math.max(0, Math.min(1, current / max));
        const segmentWidth = width / segments;

        ctx.save();

        // Background
        ctx.fillStyle = this.colors.bgDark;
        ctx.fillRect(x, y, width, height);

        // Health fill
        ctx.fillStyle = this.getHealthColor(pct);
        ctx.fillRect(x, y, width * pct, height);

        // Segment dividers
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 1; i < segments; i++) {
            const divX = x + segmentWidth * i;
            ctx.beginPath();
            ctx.moveTo(divX, y);
            ctx.lineTo(divX, y + height);
            ctx.stroke();
        }

        // Outer border
        ctx.strokeStyle = this.colors.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        ctx.restore();
    },

    /**
     * Draw a circular health indicator (for minimal UI)
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} options - Drawing options
     * @param {number} options.x - Center X
     * @param {number} options.y - Center Y
     * @param {number} options.radius - Circle radius
     * @param {number} options.current - Current HP
     * @param {number} options.max - Maximum HP
     * @param {number} options.thickness - Arc thickness
     */
    drawCircular(ctx, options) {
        const {
            x,
            y,
            radius,
            current,
            max,
            thickness = 3
        } = options;

        const pct = Math.max(0, Math.min(1, current / max));
        const startAngle = -Math.PI / 2; // Start at top
        const endAngle = startAngle + (Math.PI * 2 * pct);

        ctx.save();

        // Background circle
        ctx.strokeStyle = this.colors.bgDark;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Health arc
        ctx.strokeStyle = this.getHealthColor(pct);
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.stroke();

        ctx.restore();
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.HealthBarUtils = HealthBarUtils;

console.log('[HealthBarUtils] Health bar utilities loaded');
