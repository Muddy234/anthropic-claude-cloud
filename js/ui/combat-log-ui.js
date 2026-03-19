// ============================================================================
// COMBAT LOG UI - Color-coded Message System
// ============================================================================
// Handles message display, history, and styling for combat feedback
// Reference: docs/UI_IMPROVEMENT_IMPLEMENTATION_GUIDE.md Section 6
// ============================================================================

/**
 * Combat Log Manager
 * Handles message display, history, and styling
 */
const CombatLogUI = {
    // Configuration
    config: {
        maxMessages: 50,           // History size
        displayCount: 5,           // Visible messages
        messageDuration: 4000,     // ms before fade starts
        fadeDuration: 1000,        // ms to fully fade
        x: 90,                     // Left position (after sidebar)
        bottomMargin: 60,          // From bottom of screen
        maxWidth: 400,
        lineHeight: 18
    },

    // Message type styling
    styles: {
        damage_dealt: {
            color: '#7dce82',  // Green
            prefix: '* ',
            bold: false
        },
        damage_taken: {
            color: '#e85d5d',  // Red
            prefix: '! ',
            bold: true
        },
        heal: {
            color: '#82d9ce',  // Cyan
            prefix: '+ ',
            bold: false
        },
        pickup: {
            color: '#daa520',  // Gold
            prefix: '> ',
            bold: false
        },
        level_up: {
            color: '#ffd700',  // Bright gold
            prefix: '^ ',
            bold: true
        },
        system: {
            color: '#b8a878',  // Muted
            prefix: '',
            bold: false
        },
        death: {
            color: '#ff4444',  // Bright red
            prefix: 'X ',
            bold: true
        },
        discovery: {
            color: '#9b7ed9',  // Purple
            prefix: '? ',
            bold: false
        }
    },

    /**
     * Add a message to the log
     * @param {string} text - Message text
     * @param {string} type - Message type (damage_dealt, damage_taken, heal, pickup, etc.)
     */
    addMessage: function(text, type = 'system') {
        if (!game.combatLog) {
            game.combatLog = [];
        }

        game.combatLog.push({
            text: text,
            type: type,
            timestamp: Date.now()
        });

        // Trim to max size
        if (game.combatLog.length > this.config.maxMessages) {
            game.combatLog.shift();
        }
    },

    /**
     * Render the combat log
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasHeight
     */
    render: function(ctx, canvasHeight) {
        if (!game.combatLog || game.combatLog.length === 0) return;

        const now = Date.now();
        const cfg = this.config;

        // Get font family from design system
        const fontFamily = typeof UI_FONT_FAMILY !== 'undefined' ? UI_FONT_FAMILY.body : 'Georgia, serif';

        // Get recent messages
        const recentMessages = game.combatLog
            .slice(-cfg.displayCount)
            .map(msg => {
                const age = now - msg.timestamp;
                let alpha = 1;

                if (age > cfg.messageDuration) {
                    const fadeProgress = (age - cfg.messageDuration) / cfg.fadeDuration;
                    alpha = Math.max(0, 1 - fadeProgress);
                }

                return { ...msg, alpha };
            })
            .filter(msg => msg.alpha > 0);

        if (recentMessages.length === 0) return;

        ctx.save();

        // Draw from bottom up
        let y = canvasHeight - cfg.bottomMargin;

        for (let i = recentMessages.length - 1; i >= 0; i--) {
            const msg = recentMessages[i];
            const style = this.styles[msg.type] || this.styles.system;

            ctx.globalAlpha = msg.alpha;

            // Background for better readability
            ctx.font = style.bold ? `bold 12px ${fontFamily}` : `12px ${fontFamily}`;
            const textWidth = ctx.measureText(style.prefix + msg.text).width;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(cfg.x - 4, y - 12, textWidth + 8, cfg.lineHeight);

            // Text
            ctx.fillStyle = style.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(style.prefix + msg.text, cfg.x, y);

            y -= cfg.lineHeight;
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    /**
     * Clear all messages
     */
    clear: function() {
        if (game.combatLog) {
            game.combatLog = [];
        }
    }
};

// Export for global access
window.CombatLogUI = CombatLogUI;

console.log('Combat Log UI loaded');
