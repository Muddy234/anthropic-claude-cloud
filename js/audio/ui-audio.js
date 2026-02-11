// ============================================================================
// UI AUDIO INTEGRATION - The Shifting Chasm
// ============================================================================
// Provides audio feedback for UI interactions
// Can be called directly by UI components or hooks into existing UI events
// ============================================================================

const UIAudio = {
    name: 'UIAudio',

    // ========================================================================
    // STATE
    // ========================================================================

    /** Whether UI audio is enabled */
    enabled: true,

    /** Last click time for debouncing */
    lastClickTime: 0,

    /** Minimum time between click sounds (ms) */
    clickDebounce: 50,

    /** Track open panels for close sounds */
    openPanels: new Set(),

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize UI audio system
     */
    init() {
        this._hookGlobalUIEvents();
        console.log('[UIAudio] UI audio integration initialized');
    },

    /**
     * Hook global UI events for automatic sound playback
     * @private
     */
    _hookGlobalUIEvents() {
        const self = this;

        // Add global click listener for button sounds
        document.addEventListener('click', (e) => {
            // Check if click target is a button-like element
            if (self._isButtonLike(e.target)) {
                self.playClick();
            }
        }, true);

        // Add global hover listener for hover sounds (optional - can be intensive)
        // Disabled by default for performance
        // document.addEventListener('mouseover', (e) => {
        //     if (self._isButtonLike(e.target)) {
        //         self.playHover();
        //     }
        // }, true);

        // Hook keyboard for UI navigation sounds
        document.addEventListener('keydown', (e) => {
            // Play sound for specific UI keys
            if (e.key === 'Escape') {
                self.playClose();
            } else if (e.key === 'Tab' && !e.target.matches('input, textarea')) {
                self.playTabSwitch();
            }
        });
    },

    /**
     * Check if an element is button-like
     * @private
     */
    _isButtonLike(element) {
        if (!element) return false;

        // Check tag name
        const tag = element.tagName?.toLowerCase();
        if (['button', 'a'].includes(tag)) return true;

        // Check for button role
        if (element.getAttribute('role') === 'button') return true;

        // Check for common button classes
        const classes = element.className?.toLowerCase() || '';
        if (classes.includes('button') || classes.includes('btn')) return true;

        // Check for clickable cursor style
        const style = window.getComputedStyle?.(element);
        if (style?.cursor === 'pointer') return true;

        return false;
    },

    /**
     * Check if audio system is ready
     * @private
     */
    _canPlaySound() {
        return typeof AudioManager !== 'undefined' &&
               AudioManager.isReady() &&
               typeof SFXSystem !== 'undefined' &&
               SFXSystem.ready;
    },

    // ========================================================================
    // SOUND PLAYBACK METHODS
    // ========================================================================

    /**
     * Play button click sound
     */
    playClick() {
        if (!this.enabled || !this._canPlaySound()) return;

        // Debounce rapid clicks
        const now = performance.now();
        if (now - this.lastClickTime < this.clickDebounce) return;
        this.lastClickTime = now;

        SFXSystem.playUI('ui_click', 0.5);
    },

    /**
     * Play button hover sound
     */
    playHover() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.playUI('ui_hover', 0.3);
    },

    /**
     * Play panel open sound
     * @param {string} panelId - Optional panel identifier for tracking
     */
    playOpen(panelId = 'default') {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.playUI('ui_open', 0.5);

        // Track open panel
        if (panelId) {
            this.openPanels.add(panelId);
        }
    },

    /**
     * Play panel close sound
     * @param {string} panelId - Optional panel identifier for tracking
     */
    playClose(panelId = 'default') {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.playUI('ui_close', 0.5);

        // Remove from tracked panels
        if (panelId) {
            this.openPanels.delete(panelId);
        }
    },

    /**
     * Play error/invalid action sound
     */
    playError() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.playUI('ui_error', 0.6);
    },

    /**
     * Play notification sound
     */
    playNotification() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.playUI('ui_notification', 0.6);
    },

    /**
     * Play confirmation sound
     */
    playConfirm() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.playUI('ui_confirm', 0.6);
    },

    /**
     * Play cancel/back sound
     */
    playCancel() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.playUI('ui_cancel', 0.5);
    },

    /**
     * Play tab switch sound
     */
    playTabSwitch() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.playUI('ui_tab_switch', 0.4);
    },

    // ========================================================================
    // ITEM INTERACTION SOUNDS
    // ========================================================================

    /**
     * Play item pickup sound
     */
    playItemPickup() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('item_pickup', {
            volume: 0.6,
            category: 'ui',
            priority: 'MEDIUM'
        });
    },

    /**
     * Play gold pickup sound
     */
    playGoldPickup() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('gold_pickup', {
            volume: 0.6,
            category: 'ui',
            priority: 'MEDIUM'
        });
    },

    /**
     * Play equipment sound
     * @param {string} slotType - 'weapon' or 'armor'
     */
    playEquip(slotType = 'weapon') {
        if (!this.enabled || !this._canPlaySound()) return;

        const soundId = slotType === 'armor' ? 'equip_armor' : 'equip_weapon';
        SFXSystem.play(soundId, {
            volume: 0.5,
            category: 'ui',
            priority: 'MEDIUM'
        });
    },

    /**
     * Play chest open sound
     */
    playChestOpen() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('chest_open', {
            volume: 0.7,
            category: 'ambient',
            priority: 'MEDIUM'
        });
    },

    // ========================================================================
    // PROGRESSION SOUNDS
    // ========================================================================

    /**
     * Play level up sound
     */
    playLevelUp() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('level_up', {
            volume: 0.9,
            category: 'ui',
            priority: 'CRITICAL'
        });
    },

    /**
     * Play XP gain sound
     */
    playXPGain() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('xp_gain', {
            volume: 0.3,
            category: 'ui',
            priority: 'LOW'
        });
    },

    /**
     * Play quest complete sound
     */
    playQuestComplete() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('quest_complete', {
            volume: 0.8,
            category: 'ui',
            priority: 'HIGH'
        });
    },

    /**
     * Play quest update sound
     */
    playQuestUpdate() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('quest_update', {
            volume: 0.6,
            category: 'ui',
            priority: 'MEDIUM'
        });
    },

    // ========================================================================
    // SKILL SOUNDS
    // ========================================================================

    /**
     * Play skill ready sound (cooldown finished)
     */
    playSkillReady() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('skill_ready', {
            volume: 0.5,
            category: 'ui',
            priority: 'MEDIUM'
        });
    },

    // ========================================================================
    // EXTRACTION SOUNDS
    // ========================================================================

    /**
     * Play extraction shaft warning sound
     * @param {number} intensity - 1 (early), 2 (mid), 3 (critical)
     */
    playExtractionWarning(intensity = 1) {
        if (!this.enabled || !this._canPlaySound()) return;

        const soundId = `shaft_warning`;
        const volume = 0.5 + (intensity * 0.15);

        SFXSystem.play(soundId, {
            volume,
            category: 'ambient',
            priority: intensity >= 3 ? 'CRITICAL' : 'HIGH'
        });
    },

    /**
     * Play extraction shaft collapse sound
     */
    playExtractionCollapse() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('shaft_collapse', {
            volume: 1.0,
            category: 'ambient',
            priority: 'CRITICAL'
        });
    },

    /**
     * Play extraction success sound
     */
    playExtractionSuccess() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('extraction_success', {
            volume: 1.0,
            category: 'ambient',
            priority: 'CRITICAL'
        });
    },

    // ========================================================================
    // SHIFT SYSTEM SOUNDS
    // ========================================================================

    /**
     * Play shift warning sound
     * @param {number} stage - Warning stage (1, 2, 3)
     */
    playShiftWarning(stage = 1) {
        if (!this.enabled || !this._canPlaySound()) return;

        const soundId = `shift_warning_${Math.min(3, Math.max(1, stage))}`;

        SFXSystem.play(soundId, {
            volume: 0.6 + (stage * 0.13),
            category: 'ambient',
            priority: stage >= 3 ? 'CRITICAL' : 'HIGH'
        });
    },

    /**
     * Play meltdown sound
     */
    playMeltdown() {
        if (!this.enabled || !this._canPlaySound()) return;

        SFXSystem.play('meltdown', {
            volume: 1.0,
            category: 'ambient',
            priority: 'CRITICAL'
        });
    }
};

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

if (typeof document !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        UIAudio.init();
    } else {
        document.addEventListener('DOMContentLoaded', () => UIAudio.init());
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.UIAudio = UIAudio;
}

console.log('[UIAudio] UI audio integration loaded');
