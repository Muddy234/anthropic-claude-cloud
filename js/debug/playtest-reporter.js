// === js/debug/playtest-reporter.js ===
// Playtest feedback tool - Press F9 to dump game state to clipboard

const PlaytestReporter = {
    eventLog: [],
    maxEvents: 50,
    sessionStartTime: Date.now(),

    init() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F9') {
                this.dumpToClipboard();
            }
        });
        console.log('[PlaytestReporter] Press F9 to copy game state to clipboard');
    },

    logEvent(type, data) {
        this.eventLog.push({
            time: Date.now() - this.sessionStartTime,
            type,
            data
        });
        if (this.eventLog.length > this.maxEvents) {
            this.eventLog.shift();
        }
    },

    dumpToClipboard() {
        const dump = {
            timestamp: new Date().toISOString(),
            sessionDuration: Math.floor((Date.now() - this.sessionStartTime) / 1000) + 's',
            gameState: game.state,
            floor: game.floor,
            player: game.player ? {
                hp: game.player.hp,
                maxHp: game.player.maxHp,
                gold: game.player.gold,
                inventoryCount: game.player.inventory?.length || 0,
                weapon: game.player.equipped?.MAIN?.name || 'none',
                armor: game.player.equipped?.CHEST?.name || 'none',
                position: { x: game.player.gridX, y: game.player.gridY }
            } : null,
            enemies: game.enemies?.length || 0,
            skills: persistentState?.skills || null,
            bankGold: persistentState?.bank?.gold || 0,
            bankItems: persistentState?.bank?.items?.length || 0,
            stats: persistentState?.stats || null,
            recentEvents: this.eventLog.slice(-50)
        };

        const json = JSON.stringify(dump, null, 2);

        navigator.clipboard.writeText(json).then(() => {
            this._showToast('Game state copied to clipboard');
        }).catch(() => {
            console.log('=== PLAYTEST DUMP ===');
            console.log(json);
            this._showToast('State logged to console (clipboard blocked)');
        });
    },

    _showToast(message) {
        this._toastMessage = message;
        this._toastTime = Date.now();
    },

    renderToast(ctx) {
        if (!this._toastMessage || Date.now() - this._toastTime > 3000) {
            this._toastMessage = null;
            return;
        }
        const alpha = Math.max(0, 1 - (Date.now() - this._toastTime) / 3000);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#4a4a6a';
        const tw = ctx.measureText(this._toastMessage).width + 40;
        const tx = (canvas.width - tw) / 2;
        ctx.fillRect(tx, canvas.height - 60, tw, 36);
        ctx.strokeRect(tx, canvas.height - 60, tw, 36);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this._toastMessage, canvas.width / 2, canvas.height - 38);
        ctx.restore();
    }
};

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Initialize when document is ready (same pattern as ai-visualizer.js)
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PlaytestReporter.init());
    } else {
        PlaytestReporter.init();
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.PlaytestReporter = PlaytestReporter;
