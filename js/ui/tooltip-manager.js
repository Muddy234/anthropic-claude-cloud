// ============================================================================
// TOOLTIP MANAGER - The Shifting Chasm
// ============================================================================
// Centralized tooltip system for hover tooltips across the UI
// Issue #7: Provides unified tooltip display for action bar, inventory, etc.
// ============================================================================

const TooltipManager = {
    // State
    visible: false,
    content: null,
    x: 0,
    y: 0,
    hoverStartTime: 0,
    currentTarget: null,

    // Configuration
    config: {
        DELAY_MS: 400,           // Delay before showing tooltip
        PADDING: 8,              // Padding inside tooltip
        MAX_WIDTH: 280,          // Maximum tooltip width
        LINE_HEIGHT: 16,         // Line height for text
        MARGIN: 10,              // Margin from screen edges
        FADE_DURATION: 100       // Fade animation duration (ms)
    },

    // Animation state
    opacity: 0,
    fadeStartTime: 0,
    isFadingIn: false,
    isFadingOut: false,

    // Registered tooltip zones (for canvas-based UIs)
    zones: [],

    // ========================================================================
    // ZONE MANAGEMENT
    // ========================================================================

    /**
     * Clear all registered zones (call at start of each render frame)
     */
    clearZones() {
        this.zones = [];
    },

    /**
     * Register a tooltip zone for hover detection
     * @param {Object} zone - Zone definition
     * @param {number} zone.x - X position
     * @param {number} zone.y - Y position
     * @param {number} zone.width - Zone width
     * @param {number} zone.height - Zone height
     * @param {Object} zone.content - Tooltip content
     * @param {string} zone.id - Unique identifier for this zone
     */
    registerZone(zone) {
        this.zones.push(zone);
    },

    /**
     * Check if mouse is over a registered zone
     * @param {number} mouseX - Mouse X position
     * @param {number} mouseY - Mouse Y position
     * @returns {Object|null} Zone under mouse or null
     */
    getZoneAtPoint(mouseX, mouseY) {
        for (const zone of this.zones) {
            if (mouseX >= zone.x && mouseX <= zone.x + zone.width &&
                mouseY >= zone.y && mouseY <= zone.y + zone.height) {
                return zone;
            }
        }
        return null;
    },

    // ========================================================================
    // TOOLTIP LIFECYCLE
    // ========================================================================

    /**
     * Update tooltip state (call in game update loop)
     * @param {number} mouseX - Current mouse X
     * @param {number} mouseY - Current mouse Y
     * @param {number} dt - Delta time in ms
     */
    update(mouseX, mouseY, dt) {
        const now = performance.now();
        const zone = this.getZoneAtPoint(mouseX, mouseY);

        // Check if we're hovering over a new zone
        if (zone) {
            if (this.currentTarget !== zone.id) {
                // New target - start hover timer
                this.currentTarget = zone.id;
                this.hoverStartTime = now;
                this.content = zone.content;
                this.visible = false;
                this.isFadingIn = false;
                this.isFadingOut = false;
            } else if (!this.visible && !this.isFadingIn) {
                // Same target - check if delay has passed
                if (now - this.hoverStartTime >= this.config.DELAY_MS) {
                    this.show(mouseX, mouseY);
                }
            } else if (this.visible) {
                // Update position while visible
                this.updatePosition(mouseX, mouseY);
            }
        } else {
            // No zone - hide tooltip
            if (this.visible || this.isFadingIn) {
                this.hide();
            }
            this.currentTarget = null;
        }

        // Handle fade animations
        this.updateFade(now);
    },

    /**
     * Show tooltip at position
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    show(x, y) {
        this.visible = true;
        this.isFadingIn = true;
        this.isFadingOut = false;
        this.fadeStartTime = performance.now();
        this.updatePosition(x, y);
    },

    /**
     * Hide tooltip with fade
     */
    hide() {
        if (!this.visible && !this.isFadingIn) return;
        this.isFadingOut = true;
        this.isFadingIn = false;
        this.fadeStartTime = performance.now();
    },

    /**
     * Update fade animation
     * @param {number} now - Current timestamp
     */
    updateFade(now) {
        if (this.isFadingIn) {
            const progress = Math.min(1, (now - this.fadeStartTime) / this.config.FADE_DURATION);
            this.opacity = progress;
            if (progress >= 1) {
                this.isFadingIn = false;
            }
        } else if (this.isFadingOut) {
            const progress = Math.min(1, (now - this.fadeStartTime) / this.config.FADE_DURATION);
            this.opacity = 1 - progress;
            if (progress >= 1) {
                this.isFadingOut = false;
                this.visible = false;
                this.content = null;
            }
        }
    },

    /**
     * Update tooltip position (keeps tooltip on screen)
     * @param {number} x - Mouse X
     * @param {number} y - Mouse Y
     */
    updatePosition(x, y) {
        const canvas = typeof window !== 'undefined' ? window.canvas : null;
        if (!canvas) return;

        // Calculate tooltip dimensions
        const dims = this.calculateDimensions();

        // Position below and to the right of cursor by default
        let tooltipX = x + 15;
        let tooltipY = y + 20;

        // Keep on screen horizontally
        if (tooltipX + dims.width > canvas.width - this.config.MARGIN) {
            tooltipX = x - dims.width - 10;
        }
        if (tooltipX < this.config.MARGIN) {
            tooltipX = this.config.MARGIN;
        }

        // Keep on screen vertically
        if (tooltipY + dims.height > canvas.height - this.config.MARGIN) {
            tooltipY = y - dims.height - 10;
        }
        if (tooltipY < this.config.MARGIN) {
            tooltipY = this.config.MARGIN;
        }

        this.x = tooltipX;
        this.y = tooltipY;
    },

    /**
     * Calculate tooltip dimensions based on content
     * @returns {Object} {width, height}
     */
    calculateDimensions() {
        if (!this.content) return { width: 100, height: 50 };

        const padding = this.config.PADDING;
        const lineHeight = this.config.LINE_HEIGHT;
        const maxWidth = this.config.MAX_WIDTH;

        let height = padding * 2;
        let width = 100;

        // Title
        if (this.content.title) {
            height += lineHeight + 4;
            width = Math.max(width, this.content.title.length * 9);
        }

        // Subtitle
        if (this.content.subtitle) {
            height += lineHeight - 2;
            width = Math.max(width, this.content.subtitle.length * 7);
        }

        // Description (word-wrapped)
        if (this.content.description) {
            const words = this.content.description.split(' ');
            let lines = 1;
            let currentLineLength = 0;
            const charWidth = 7;

            for (const word of words) {
                const wordWidth = word.length * charWidth;
                if (currentLineLength + wordWidth > maxWidth - padding * 2) {
                    lines++;
                    currentLineLength = wordWidth;
                } else {
                    currentLineLength += wordWidth + charWidth;
                }
            }
            height += lines * (lineHeight - 2) + 8;
        }

        // Stats (key-value pairs)
        if (this.content.stats && this.content.stats.length > 0) {
            height += 4; // Separator space
            height += this.content.stats.length * lineHeight;
        }

        // Comparison (for item comparisons)
        if (this.content.comparison) {
            height += 8; // Separator space
            height += lineHeight; // "Currently Equipped:" label
            height += this.content.comparison.length * lineHeight;
        }

        // Hint at bottom
        if (this.content.hint) {
            height += lineHeight + 4;
        }

        width = Math.min(maxWidth, Math.max(width, 120)) + padding * 2;

        return { width, height };
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the tooltip (call in render loop)
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.visible && this.opacity <= 0) return;
        if (!this.content) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;

        const dims = this.calculateDimensions();
        const padding = this.config.PADDING;
        const lineHeight = this.config.LINE_HEIGHT;

        // Get colors from design system
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
            panelBg: 'rgba(20, 15, 25, 0.95)',
            panelBorder: '#4a3a5a',
            textPrimary: '#e8e0f0',
            textSecondary: '#a090b0',
            textMuted: '#706080',
            textHighlight: '#ffcc00',
            health: '#ff4444',
            mana: '#4488ff',
            uncommon: '#1eff00',
            rare: '#0070dd',
            epic: '#a335ee',
            legendary: '#ff8000'
        };

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Background
        ctx.fillStyle = colors.panelBg || 'rgba(20, 15, 25, 0.95)';
        ctx.fillRect(this.x, this.y, dims.width, dims.height);

        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = this.content.borderColor || colors.panelBorder || '#4a3a5a';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, dims.width, dims.height);

        // Content
        let textY = this.y + padding + lineHeight - 4;
        const textX = this.x + padding;
        const maxTextWidth = dims.width - padding * 2;

        // Title
        if (this.content.title) {
            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = this.content.titleColor || colors.textHighlight || '#ffcc00';
            ctx.textAlign = 'left';
            ctx.fillText(this.content.title, textX, textY);
            textY += lineHeight + 2;
        }

        // Subtitle (item type, rarity, etc.)
        if (this.content.subtitle) {
            ctx.font = '11px monospace';
            ctx.fillStyle = this.content.subtitleColor || colors.textMuted || '#706080';
            ctx.fillText(this.content.subtitle, textX, textY);
            textY += lineHeight - 2;
        }

        // Description (word-wrapped)
        if (this.content.description) {
            textY += 4;
            ctx.font = '11px monospace';
            ctx.fillStyle = colors.textSecondary || '#a090b0';

            const words = this.content.description.split(' ');
            let line = '';
            for (const word of words) {
                const testLine = line + word + ' ';
                if (ctx.measureText(testLine).width > maxTextWidth) {
                    ctx.fillText(line.trim(), textX, textY);
                    line = word + ' ';
                    textY += lineHeight - 2;
                } else {
                    line = testLine;
                }
            }
            if (line.trim()) {
                ctx.fillText(line.trim(), textX, textY);
                textY += lineHeight - 2;
            }
        }

        // Stats
        if (this.content.stats && this.content.stats.length > 0) {
            textY += 8;

            ctx.font = '12px monospace';
            for (const stat of this.content.stats) {
                // Label
                ctx.fillStyle = colors.textMuted || '#706080';
                ctx.fillText(stat.label + ':', textX, textY);

                // Value (right-aligned)
                ctx.fillStyle = stat.color || colors.textPrimary || '#e8e0f0';
                ctx.textAlign = 'right';
                ctx.fillText(stat.value, this.x + dims.width - padding, textY);
                ctx.textAlign = 'left';

                textY += lineHeight;
            }
        }

        // Comparison section (for items)
        if (this.content.comparison) {
            textY += 8;

            ctx.font = '10px monospace';
            ctx.fillStyle = colors.textMuted || '#706080';
            ctx.fillText('vs Equipped:', textX, textY);
            textY += lineHeight;

            for (const cmp of this.content.comparison) {
                ctx.fillStyle = cmp.better ? '#44ff44' : (cmp.worse ? '#ff4444' : '#888888');
                const prefix = cmp.better ? '+' : (cmp.worse ? '' : ' ');
                ctx.fillText(`  ${cmp.stat}: ${prefix}${cmp.diff}`, textX, textY);
                textY += lineHeight;
            }
        }

        // Hint
        if (this.content.hint) {
            textY += 4;
            ctx.font = '10px monospace';
            ctx.fillStyle = colors.textMuted || '#706080';
            ctx.fillText(this.content.hint, textX, textY);
        }

        ctx.restore();
    },

    // ========================================================================
    // CONTENT BUILDERS
    // ========================================================================

    /**
     * Create tooltip content for an item
     * @param {Object} item - Item data
     * @param {Object} equippedItem - Currently equipped item for comparison (optional)
     * @returns {Object} Tooltip content
     */
    createItemTooltip(item, equippedItem = null) {
        if (!item) return null;

        const rarityColors = {
            common: '#ffffff',
            uncommon: '#1eff00',
            rare: '#0070dd',
            epic: '#a335ee',
            legendary: '#ff8000'
        };

        const content = {
            title: item.name,
            titleColor: rarityColors[item.rarity] || '#ffffff',
            subtitle: `${item.type || 'Item'}${item.rarity ? ' - ' + item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) : ''}`,
            description: item.description,
            stats: [],
            borderColor: rarityColors[item.rarity] || '#4a3a5a'
        };

        // Build stats list
        if (item.damage) content.stats.push({ label: 'Damage', value: `${item.damage}`, color: '#ff6666' });
        if (item.pDef) content.stats.push({ label: 'Phys Def', value: `+${item.pDef}`, color: '#6666ff' });
        if (item.mDef) content.stats.push({ label: 'Magic Def', value: `+${item.mDef}`, color: '#aa66ff' });
        if (item.str) content.stats.push({ label: 'Strength', value: `+${item.str}`, color: '#ff8866' });
        if (item.agi) content.stats.push({ label: 'Agility', value: `+${item.agi}`, color: '#66ff88' });
        if (item.int) content.stats.push({ label: 'Intelligence', value: `+${item.int}`, color: '#66aaff' });
        if (item.price) content.stats.push({ label: 'Value', value: `${item.price}g`, color: '#ffd700' });

        // Item comparison
        if (equippedItem && item.type === equippedItem.type) {
            content.comparison = [];
            if (item.damage !== undefined && equippedItem.damage !== undefined) {
                const diff = item.damage - equippedItem.damage;
                content.comparison.push({
                    stat: 'Damage',
                    diff: diff,
                    better: diff > 0,
                    worse: diff < 0
                });
            }
            if (item.pDef !== undefined && equippedItem.pDef !== undefined) {
                const diff = item.pDef - equippedItem.pDef;
                content.comparison.push({
                    stat: 'Phys Def',
                    diff: diff,
                    better: diff > 0,
                    worse: diff < 0
                });
            }
        }

        // Hint for usable items
        if (item.type === 'consumable') {
            content.hint = '[Click to use]';
        } else if (item.slot) {
            content.hint = '[Right-click to equip]';
        }

        return content;
    },

    /**
     * Create tooltip content for a skill/ability
     * @param {Object} skill - Skill data
     * @returns {Object} Tooltip content
     */
    createSkillTooltip(skill) {
        if (!skill) return null;

        const content = {
            title: skill.name,
            titleColor: '#ffcc00',
            subtitle: skill.type || 'Skill',
            description: skill.description,
            stats: []
        };

        if (skill.damage) content.stats.push({ label: 'Damage', value: `${skill.damage}`, color: '#ff6666' });
        if (skill.manaCost) content.stats.push({ label: 'Mana Cost', value: `${skill.manaCost}`, color: '#6688ff' });
        if (skill.cooldown) content.stats.push({ label: 'Cooldown', value: `${skill.cooldown}s`, color: '#888888' });
        if (skill.range) content.stats.push({ label: 'Range', value: `${skill.range} tiles`, color: '#88ff88' });

        if (skill.keybind) {
            content.hint = `[${skill.keybind}] to activate`;
        }

        return content;
    },

    /**
     * Create a simple text tooltip
     * @param {string} title - Title text
     * @param {string} description - Description text
     * @returns {Object} Tooltip content
     */
    createSimpleTooltip(title, description) {
        return {
            title: title,
            description: description
        };
    }
};

// ============================================================================
// MOUSE TRACKING INTEGRATION
// ============================================================================

// Update tooltip on mouse move
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Track mouse position globally
    window._tooltipMouseX = 0;
    window._tooltipMouseY = 0;

    document.addEventListener('mousemove', (e) => {
        const canvas = window.canvas;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        window._tooltipMouseX = (e.clientX - rect.left) * scaleX;
        window._tooltipMouseY = (e.clientY - rect.top) * scaleY;
    });

    // Hide tooltip on click
    document.addEventListener('mousedown', () => {
        TooltipManager.hide();
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

window.TooltipManager = TooltipManager;

console.log('[TooltipManager] Centralized tooltip system loaded');
