// ============================================================================
// AI DEBUG VISUALIZER - The Shifting Chasm
// ============================================================================
// Development tool for debugging enemy AI state machines
// Toggle with F3 key (only in debug mode)
// Warbringer Agent - Issue #9: AI Debug Visualizer
// ============================================================================

/**
 * AI VISUALIZER DESIGN
 * ====================
 *
 * Purpose: Help developers debug AI behavior by visualizing state information
 *
 * Features:
 * - Shows current AI state above each enemy
 * - Displays vision cones
 * - Shows patrol/chase paths
 * - Attack token status indicator
 * - Frustration counter display
 * - Target lines (who is targeting whom)
 *
 * Controls:
 * - F3: Toggle visualizer on/off
 * - F4: Cycle detail level (minimal/normal/verbose)
 *
 * Gated behind DEBUG flag - not included in production builds
 */

const AI_VISUALIZER_CONFIG = {
    enabled: false,               // Master toggle
    detailLevel: 'normal',        // 'minimal', 'normal', 'verbose'

    // Visual settings
    colors: {
        // State colors (5-state system)
        idle: '#88ff88',          // Green - patrolling/wandering
        alert: '#ffaa00',         // Orange - investigating
        combat: '#ff0000',        // Red - engaged in combat
        searching: '#ff8800',     // Dark orange - looking for lost target
        following: '#88ffff',     // Cyan - following leader/command

        // Status modifiers (applied within states)
        panicked: '#ffff00',      // Yellow - fleeing in fear
        enraged: '#ff4400',       // Bright red - increased aggression

        // Special indicators
        hasToken: '#00ff00',      // Green - can attack
        noToken: '#888888',       // Gray - waiting for token
        frustrated: '#ff8800',    // Orange - building frustration
        windup: '#ff00ff',        // Magenta - winding up attack
        fleeing: '#0088ff'        // Blue - retreating
    },

    // Vision cone settings
    visionCone: {
        show: true,
        fillAlpha: 0.15,
        strokeAlpha: 0.4,
        coneAngle: 120             // Degrees
    },

    // Path visualization
    paths: {
        show: true,
        patrolColor: '#4488ff',
        chaseColor: '#ff4444',
        pathDotSize: 3
    },

    // Target line settings
    targetLines: {
        show: true,
        color: '#ff4444',
        alpha: 0.5
    },

    // Text settings
    text: {
        font: '10px monospace',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 2
    }
};

/**
 * AI Visualizer Singleton
 */
const AIVisualizer = {
    name: 'ai-visualizer',
    initialized: false,
    enabled: false,
    detailLevel: 'normal', // minimal, normal, verbose

    /**
     * Initialize the visualizer
     */
    init() {
        if (this.initialized) return;

        // Only enable in debug mode
        if (typeof DEBUG === 'undefined' || !DEBUG) {
            console.log('[AIVisualizer] Debug mode not enabled - visualizer disabled');
            return;
        }

        // Register keyboard listener for toggle
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'F4') {
                e.preventDefault();
                this.cycleDetailLevel();
            }
        });

        this.initialized = true;
        console.log('[AIVisualizer] Initialized (F3 to toggle, F4 to cycle detail level)');
    },

    /**
     * Toggle visualizer on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        AI_VISUALIZER_CONFIG.enabled = this.enabled;

        if (typeof addMessage === 'function') {
            addMessage(`AI Visualizer: ${this.enabled ? 'ON' : 'OFF'}`, 'debug');
        }
        console.log(`[AIVisualizer] ${this.enabled ? 'Enabled' : 'Disabled'}`);
    },

    /**
     * Cycle through detail levels
     */
    cycleDetailLevel() {
        const levels = ['minimal', 'normal', 'verbose'];
        const currentIndex = levels.indexOf(this.detailLevel);
        this.detailLevel = levels[(currentIndex + 1) % levels.length];
        AI_VISUALIZER_CONFIG.detailLevel = this.detailLevel;

        if (typeof addMessage === 'function') {
            addMessage(`AI Visualizer Detail: ${this.detailLevel}`, 'debug');
        }
        console.log(`[AIVisualizer] Detail level: ${this.detailLevel}`);
    },

    /**
     * Render AI debug visualization
     * Called from renderer after enemies are drawn
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} offsetX - Camera offset X
     * @param {number} offsetY - Camera offset Y
     * @param {number} tileSize - Tile size in pixels
     */
    render(ctx, offsetX, offsetY, tileSize) {
        if (!this.enabled || !game?.enemies) return;

        ctx.save();

        for (const enemy of game.enemies) {
            if (enemy.hp <= 0) continue;

            // Get screen position
            const screenX = (enemy.gridX - offsetX) * tileSize + tileSize / 2;
            const screenY = (enemy.gridY - offsetY) * tileSize;

            // Skip if off-screen
            if (screenX < -100 || screenX > ctx.canvas.width + 100 ||
                screenY < -100 || screenY > ctx.canvas.height + 100) {
                continue;
            }

            // Draw based on detail level
            if (this.detailLevel !== 'minimal') {
                this.drawVisionCone(ctx, enemy, offsetX, offsetY, tileSize);
            }

            if (this.detailLevel === 'verbose') {
                this.drawPath(ctx, enemy, offsetX, offsetY, tileSize);
                this.drawTargetLine(ctx, enemy, offsetX, offsetY, tileSize);
            }

            this.drawStateLabel(ctx, enemy, screenX, screenY, tileSize);
        }

        // Draw global debug info
        this.drawGlobalInfo(ctx);

        ctx.restore();
    },

    /**
     * Draw enemy AI state label above enemy
     */
    drawStateLabel(ctx, enemy, screenX, screenY, tileSize) {
        const state = enemy.ai?.currentState || enemy.state || 'unknown';
        let color = AI_VISUALIZER_CONFIG.colors[state] || '#ffffff';

        // Build label text based on detail level
        let label = state.toUpperCase();

        // Check for status modifiers
        const isPanicked = enemy.isFeared || enemy.ai?.isPanicked;
        const isEnraged = enemy.isEnraged || enemy.ai?.isEnraged;
        const isWindingUp = enemy.isWindingUp || enemy.ai?.windupActive;
        const isFleeing = enemy.isFleeing;

        // Override color based on status
        if (isWindingUp) {
            color = AI_VISUALIZER_CONFIG.colors.windup;
            label = 'WINDUP';
        } else if (isPanicked) {
            color = AI_VISUALIZER_CONFIG.colors.panicked;
            label += ' [PANIC]';
        } else if (isEnraged) {
            color = AI_VISUALIZER_CONFIG.colors.enraged;
            label += ' [RAGE]';
        } else if (isFleeing) {
            color = AI_VISUALIZER_CONFIG.colors.fleeing;
            label += ' [FLEE]';
        }

        if (this.detailLevel !== 'minimal') {
            // Add attack token indicator
            const hasToken = enemy.ai?.hasAttackToken || enemy.hasAttackToken;
            label += hasToken ? ' [ATK]' : '';

            // Add frustration counter if applicable
            const frustration = enemy.ai?.frustrationCounter || enemy.frustrationCounter || 0;
            if (frustration > 0) {
                label += ` F:${frustration}`;
            }
        }

        if (this.detailLevel === 'verbose') {
            // Add HP percentage
            const hpPct = Math.floor((enemy.hp / enemy.maxHp) * 100);
            label += ` HP:${hpPct}%`;

            // Add tier
            const tier = enemy.tier || 'T?';
            label += ` [${tier}]`;
        }

        // Calculate label dimensions
        ctx.font = AI_VISUALIZER_CONFIG.text.font;
        const metrics = ctx.measureText(label);
        const labelWidth = metrics.width + AI_VISUALIZER_CONFIG.text.padding * 2;
        const labelHeight = 12 + AI_VISUALIZER_CONFIG.text.padding * 2;

        // Draw background
        const labelX = screenX - labelWidth / 2;
        const labelY = screenY - tileSize - labelHeight - 2;

        ctx.fillStyle = AI_VISUALIZER_CONFIG.text.backgroundColor;
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

        // Draw text
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, screenX, labelY + labelHeight / 2);
    },

    /**
     * Draw enemy vision cone
     */
    drawVisionCone(ctx, enemy, offsetX, offsetY, tileSize) {
        if (!AI_VISUALIZER_CONFIG.visionCone.show) return;

        const sightRange = enemy.ai?.sightRange || enemy.sightRange || 7;
        const facing = enemy.facing || 'down';

        // Get screen position (center of enemy)
        const screenX = (enemy.gridX - offsetX) * tileSize + tileSize / 2;
        const screenY = (enemy.gridY - offsetY) * tileSize + tileSize / 2;

        // Calculate facing angle
        const facingAngles = {
            'right': 0,
            'down-right': Math.PI / 4,
            'down': Math.PI / 2,
            'down-left': 3 * Math.PI / 4,
            'left': Math.PI,
            'up-left': -3 * Math.PI / 4,
            'up': -Math.PI / 2,
            'up-right': -Math.PI / 4
        };
        const facingAngle = facingAngles[facing] || Math.PI / 2; // Default to down

        // Cone parameters
        const coneAngle = (AI_VISUALIZER_CONFIG.visionCone.coneAngle * Math.PI) / 180;
        const coneRadius = sightRange * tileSize;

        // Draw cone
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.arc(
            screenX, screenY,
            coneRadius,
            facingAngle - coneAngle / 2,
            facingAngle + coneAngle / 2
        );
        ctx.closePath();

        // Fill cone
        const state = enemy.ai?.currentState || enemy.state || 'idle';
        const stateColor = AI_VISUALIZER_CONFIG.colors[state] || '#888888';
        ctx.fillStyle = this.hexToRgba(stateColor, AI_VISUALIZER_CONFIG.visionCone.fillAlpha);
        ctx.fill();

        // Stroke cone
        ctx.strokeStyle = this.hexToRgba(stateColor, AI_VISUALIZER_CONFIG.visionCone.strokeAlpha);
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    /**
     * Draw enemy patrol/chase path
     */
    drawPath(ctx, enemy, offsetX, offsetY, tileSize) {
        if (!AI_VISUALIZER_CONFIG.paths.show) return;

        const path = enemy.ai?.currentPath || enemy.path;
        if (!path || path.length === 0) return;

        const state = enemy.ai?.currentState || enemy.state;
        const color = (state === 'combat' || state === 'searching') ?
            AI_VISUALIZER_CONFIG.paths.chaseColor :
            AI_VISUALIZER_CONFIG.paths.patrolColor;

        // Draw path as dotted line
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        // Start from enemy position
        const startX = (enemy.gridX - offsetX) * tileSize + tileSize / 2;
        const startY = (enemy.gridY - offsetY) * tileSize + tileSize / 2;
        ctx.moveTo(startX, startY);

        // Draw to each path point
        for (const point of path) {
            const px = (point.x - offsetX) * tileSize + tileSize / 2;
            const py = (point.y - offsetY) * tileSize + tileSize / 2;
            ctx.lineTo(px, py);
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // Draw dots at path points
        ctx.fillStyle = color;
        for (const point of path) {
            const px = (point.x - offsetX) * tileSize + tileSize / 2;
            const py = (point.y - offsetY) * tileSize + tileSize / 2;
            ctx.beginPath();
            ctx.arc(px, py, AI_VISUALIZER_CONFIG.paths.pathDotSize, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    /**
     * Draw line from enemy to their target
     */
    drawTargetLine(ctx, enemy, offsetX, offsetY, tileSize) {
        if (!AI_VISUALIZER_CONFIG.targetLines.show) return;

        const target = enemy.ai?.target || enemy.combat?.currentTarget;
        if (!target) return;

        const enemyX = (enemy.gridX - offsetX) * tileSize + tileSize / 2;
        const enemyY = (enemy.gridY - offsetY) * tileSize + tileSize / 2;
        const targetX = ((target.gridX || target.x) - offsetX) * tileSize + tileSize / 2;
        const targetY = ((target.gridY || target.y) - offsetY) * tileSize + tileSize / 2;

        ctx.beginPath();
        ctx.moveTo(enemyX, enemyY);
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = this.hexToRgba(
            AI_VISUALIZER_CONFIG.targetLines.color,
            AI_VISUALIZER_CONFIG.targetLines.alpha
        );
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw arrow head at target
        const angle = Math.atan2(targetY - enemyY, targetX - enemyX);
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(
            targetX - arrowSize * Math.cos(angle - Math.PI / 6),
            targetY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(
            targetX - arrowSize * Math.cos(angle + Math.PI / 6),
            targetY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    },

    /**
     * Draw global debug info panel
     */
    drawGlobalInfo(ctx) {
        const enemies = game.enemies || [];
        const aliveCount = enemies.filter(e => e.hp > 0).length;

        // Count states
        const stateCounts = {};
        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;
            const state = enemy.ai?.currentState || enemy.state || 'unknown';
            stateCounts[state] = (stateCounts[state] || 0) + 1;
        }

        // Count attack tokens
        let tokenCount = 0;
        for (const enemy of enemies) {
            if (enemy.hp > 0 && (enemy.ai?.hasAttackToken || enemy.hasAttackToken)) {
                tokenCount++;
            }
        }

        // Build info text
        const lines = [
            `AI VISUALIZER [${this.detailLevel.toUpperCase()}]`,
            `Enemies: ${aliveCount}`,
            `Attack Tokens: ${tokenCount}/3`,
            '---'
        ];

        // Add state breakdown
        for (const [state, count] of Object.entries(stateCounts)) {
            lines.push(`${state}: ${count}`);
        }

        // Draw panel
        const x = 10;
        const y = 300;
        const lineHeight = 14;
        const padding = 5;
        const maxWidth = 150;

        ctx.font = AI_VISUALIZER_CONFIG.text.font;
        ctx.fillStyle = AI_VISUALIZER_CONFIG.text.backgroundColor;
        ctx.fillRect(x, y, maxWidth, lines.length * lineHeight + padding * 2);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        for (let i = 0; i < lines.length; i++) {
            const lineY = y + padding + i * lineHeight;
            ctx.fillText(lines[i], x + padding, lineY);
        }
    },

    /**
     * Convert hex color to rgba
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Initialize when document is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AIVisualizer.init());
    } else {
        AIVisualizer.init();
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.AIVisualizer = AIVisualizer;
    window.AI_VISUALIZER_CONFIG = AI_VISUALIZER_CONFIG;
}

console.log('[AIVisualizer] AI debug visualizer loaded (F3 to toggle when DEBUG=true)');
