// ============================================================================
// SFX SYSTEM - The Shifting Chasm
// ============================================================================
// Sound effects playback with voice pooling, priority, and cooldown management
// ============================================================================

const SFXSystem = {
    name: 'SFXSystem',

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /** Maximum simultaneous sounds */
    maxVoices: 16,

    /** Priority levels */
    PRIORITY: {
        CRITICAL: 4,  // Player damage, death - never culled
        HIGH: 3,      // Combat hits, abilities
        MEDIUM: 2,    // Footsteps, interactions
        LOW: 1        // Ambient one-shots
    },

    /** Category limits (max simultaneous per category) */
    categoryLimits: {
        combat: 6,
        footstep: 2,
        ui: 3,
        ambient: 4,
        monster: 4
    },

    // ========================================================================
    // STATE
    // ========================================================================

    /** @type {AudioManager|null} Reference to AudioManager */
    audioManager: null,

    /** @type {Map<string, AudioBuffer>} Preloaded sound buffers */
    soundBank: new Map(),

    /** @type {Array} Active voice instances */
    activeVoices: [],

    /** @type {Map<string, number>} Last play time per sound (for cooldown) */
    lastPlayTime: new Map(),

    /** @type {Map<string, number>} Category counts */
    categoryCounts: new Map(),

    /** Whether system is ready */
    ready: false,

    /** Sounds currently being loaded */
    loading: new Set(),

    /** @type {Set<string>} Sounds that failed to load - don't retry */
    failedSounds: new Set(),

    /** @type {Set<string>} Sounds we've already logged warnings for */
    warnedSounds: new Set(),

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize SFX system
     * @param {AudioManager} audioManager - Reference to AudioManager
     */
    init(audioManager) {
        this.audioManager = audioManager;
        this.activeVoices = [];
        this.soundBank.clear();
        this.lastPlayTime.clear();
        this.categoryCounts.clear();
        this.loading.clear();
        this.failedSounds.clear();
        this.warnedSounds.clear();

        // Preload critical sounds
        this._preloadCriticalSounds();

        this.ready = true;
        console.log('[SFXSystem] Initialized');
    },

    /**
     * Preload sounds that should always be ready
     * @private
     */
    async _preloadCriticalSounds() {
        if (typeof AUDIO_DEFINITIONS === 'undefined') {
            // Silently skip if no audio definitions - audio is optional
            return;
        }

        const critical = AUDIO_DEFINITIONS.preload || [];
        if (critical.length === 0) {
            return;
        }

        // Use Promise.allSettled to handle partial failures gracefully
        const results = await Promise.allSettled(
            critical.map(soundId => this.preload(soundId))
        );

        // Count successful loads
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;

        if (successCount > 0) {
            console.log(`[SFXSystem] Preloaded ${successCount}/${critical.length} sounds`);
        }
        // Don't log if nothing loaded - avoids spam when audio is unavailable
    },

    // ========================================================================
    // SOUND LOADING
    // ========================================================================

    /**
     * Preload a sound into the sound bank
     * @param {string} soundId - Sound identifier
     * @returns {Promise<AudioBuffer|null>}
     */
    async preload(soundId) {
        // Already loaded?
        if (this.soundBank.has(soundId)) {
            return this.soundBank.get(soundId);
        }

        // Already failed - don't retry
        if (this.failedSounds.has(soundId)) {
            return null;
        }

        // AudioManager not available?
        if (!this.audioManager) {
            return null;
        }

        // Currently loading?
        if (this.loading.has(soundId)) {
            // Wait for existing load with timeout
            return new Promise(resolve => {
                let attempts = 0;
                const maxAttempts = 100; // 5 seconds max wait
                const checkLoaded = setInterval(() => {
                    attempts++;
                    if (this.soundBank.has(soundId)) {
                        clearInterval(checkLoaded);
                        resolve(this.soundBank.get(soundId));
                    } else if (this.failedSounds.has(soundId) || attempts >= maxAttempts) {
                        clearInterval(checkLoaded);
                        resolve(null);
                    }
                }, 50);
            });
        }

        // Get definition
        const def = this._getDefinition(soundId);
        if (!def || !def.path) {
            // Only warn once per sound
            if (!this.warnedSounds.has(soundId)) {
                console.warn(`[SFXSystem] No definition found for sound: ${soundId}`);
                this.warnedSounds.add(soundId);
            }
            this.failedSounds.add(soundId);
            return null;
        }

        this.loading.add(soundId);

        try {
            const buffer = await this.audioManager.loadAudioBuffer(def.path);
            this.loading.delete(soundId);

            // loadAudioBuffer now returns null on failure instead of throwing
            if (!buffer) {
                this.failedSounds.add(soundId);
                return null;
            }

            this.soundBank.set(soundId, buffer);
            return buffer;

        } catch (error) {
            // Only log each failure once
            if (!this.warnedSounds.has(soundId)) {
                console.warn(`[SFXSystem] Failed to load sound: ${soundId}`);
                this.warnedSounds.add(soundId);
            }
            this.loading.delete(soundId);
            this.failedSounds.add(soundId);
            return null;
        }
    },

    /**
     * Get sound definition from AUDIO_DEFINITIONS
     * @param {string} soundId
     * @returns {object|null}
     * @private
     */
    _getDefinition(soundId) {
        if (typeof AUDIO_DEFINITIONS === 'undefined') return null;

        // Check sfx definitions
        if (AUDIO_DEFINITIONS.sfx && AUDIO_DEFINITIONS.sfx[soundId]) {
            return AUDIO_DEFINITIONS.sfx[soundId];
        }

        // Check ui definitions
        if (AUDIO_DEFINITIONS.ui && AUDIO_DEFINITIONS.ui[soundId]) {
            return AUDIO_DEFINITIONS.ui[soundId];
        }

        // Check monster sounds (format: monster_type_action, e.g., goblin_attack)
        if (AUDIO_DEFINITIONS.monsters) {
            for (const [monsterType, sounds] of Object.entries(AUDIO_DEFINITIONS.monsters)) {
                for (const [action, soundData] of Object.entries(sounds)) {
                    if (Array.isArray(soundData)) {
                        // Array of variations
                        const match = soundData.find(s => s.id === soundId);
                        if (match) return match;
                    } else if (soundData.id === soundId) {
                        return soundData;
                    }
                }
            }
        }

        return null;
    },

    // ========================================================================
    // PLAYBACK
    // ========================================================================

    /**
     * Play a sound effect
     * @param {string} soundId - Sound identifier
     * @param {object} options - Playback options
     * @param {number} options.volume - Volume multiplier (0.0-1.0), default 1.0
     * @param {number} options.pitch - Pitch multiplier (0.5-2.0), default 1.0
     * @param {number} options.pan - Stereo pan (-1.0 to 1.0), default 0
     * @param {string} options.priority - Priority level (CRITICAL, HIGH, MEDIUM, LOW)
     * @param {string} options.category - Sound category for limiting
     * @param {boolean} options.ignoreCooldown - Skip cooldown check
     * @returns {object|null} Voice instance or null if culled
     */
    play(soundId, options = {}) {
        // Early bail-outs for system not ready
        if (!this.ready || !this.audioManager) {
            return null;
        }

        // Check if AudioManager is ready (gracefully handle if isReady doesn't exist)
        if (typeof this.audioManager.isReady === 'function' && !this.audioManager.isReady()) {
            return null;
        }

        // Don't try to play sounds that already failed to load
        if (this.failedSounds.has(soundId)) {
            return null;
        }

        const def = this._getDefinition(soundId);
        const opts = {
            volume: options.volume ?? def?.volume ?? 1.0,
            pitch: options.pitch ?? 1.0,
            pan: options.pan ?? 0,
            priority: options.priority ?? def?.priority ?? 'MEDIUM',
            category: options.category ?? def?.category ?? 'sfx',
            cooldown: def?.cooldown ?? 50
        };

        // Apply pitch variation from definition
        if (def?.pitchVariation) {
            const variation = (Math.random() - 0.5) * 2 * def.pitchVariation;
            opts.pitch += variation;
        }

        // Check cooldown
        if (!options.ignoreCooldown && !this._checkCooldown(soundId, opts.cooldown)) {
            return null;
        }

        // Check category limit
        if (!this._checkCategoryLimit(opts.category)) {
            return null;
        }

        // Check voice limit and potentially cull lower priority
        if (!this._checkVoiceLimit(opts.priority)) {
            return null;
        }

        // Get or load the buffer
        let buffer = this.soundBank.get(soundId);
        if (!buffer) {
            // Try to load on-demand (won't retry if already failed)
            this.preload(soundId).then(loadedBuffer => {
                if (loadedBuffer) {
                    // Play after loaded (delayed)
                    this._playBuffer(soundId, loadedBuffer, opts);
                }
            }).catch(() => {
                // Silently ignore - preload already handles error tracking
            });
            return null;
        }

        return this._playBuffer(soundId, buffer, opts);
    },

    /**
     * Play an AudioBuffer with options
     * @private
     */
    _playBuffer(soundId, buffer, opts) {
        // Defensive null checks
        if (!buffer || !this.audioManager || !this.audioManager.audioContext) {
            return null;
        }

        const ctx = this.audioManager.audioContext;

        // Check if sfxGain exists
        if (!this.audioManager.sfxGain) {
            return null;
        }

        try {
            const currentTime = ctx.currentTime;

            // Create source
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = opts.pitch;

            // Create gain node for volume
            const gainNode = ctx.createGain();
            gainNode.gain.value = opts.volume;

            // Create stereo panner if panning is specified
            let panNode = null;
            if (opts.pan !== 0 && ctx.createStereoPanner) {
                panNode = ctx.createStereoPanner();
                panNode.pan.value = Math.max(-1, Math.min(1, opts.pan));
            }

            // Connect nodes
            source.connect(gainNode);
            if (panNode) {
                gainNode.connect(panNode);
                panNode.connect(this.audioManager.sfxGain);
            } else {
                gainNode.connect(this.audioManager.sfxGain);
            }

            // Create voice instance
            const voice = {
                id: soundId,
                source,
                gainNode,
                panNode,
                priority: opts.priority,
                category: opts.category,
                startTime: currentTime,
                duration: buffer.duration / opts.pitch
            };

            // Track voice
            this.activeVoices.push(voice);
            this._incrementCategoryCount(opts.category);

            // Setup cleanup on end
            source.onended = () => {
                this._removeVoice(voice);
            };

            // Start playback
            source.start(0);

            // Update last play time for cooldown
            this.lastPlayTime.set(soundId, currentTime);

            return voice;

        } catch (error) {
            // Silently fail - audio playback is optional
            return null;
        }
    },

    /**
     * Play a random sound from an array of sound IDs
     * @param {string[]} soundIds - Array of sound IDs
     * @param {object} options - Playback options
     * @returns {object|null}
     */
    playRandom(soundIds, options = {}) {
        if (!soundIds || soundIds.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * soundIds.length);
        return this.play(soundIds[randomIndex], options);
    },

    /**
     * Stop a specific voice
     * @param {object} voice - Voice instance from play()
     */
    stopVoice(voice) {
        if (!voice || !voice.source) return;

        try {
            voice.source.stop();
        } catch (e) {
            // Already stopped
        }

        this._removeVoice(voice);
    },

    /**
     * Stop all sounds with a specific ID
     * @param {string} soundId
     */
    stop(soundId) {
        const toStop = this.activeVoices.filter(v => v.id === soundId);
        toStop.forEach(voice => this.stopVoice(voice));
    },

    /**
     * Stop all sounds in a category
     * @param {string} category
     */
    stopCategory(category) {
        const toStop = this.activeVoices.filter(v => v.category === category);
        toStop.forEach(voice => this.stopVoice(voice));
    },

    /**
     * Stop all sounds
     */
    stopAll() {
        const toStop = [...this.activeVoices];
        toStop.forEach(voice => this.stopVoice(voice));
    },

    // ========================================================================
    // VOICE MANAGEMENT
    // ========================================================================

    /**
     * Check if cooldown has passed for a sound
     * @private
     */
    _checkCooldown(soundId, cooldown) {
        const lastTime = this.lastPlayTime.get(soundId);
        if (!lastTime) return true;

        const currentTime = this.audioManager.audioContext.currentTime;
        const elapsed = (currentTime - lastTime) * 1000; // Convert to ms

        return elapsed >= cooldown;
    },

    /**
     * Check if category limit allows new sound
     * @private
     */
    _checkCategoryLimit(category) {
        const limit = this.categoryLimits[category] ?? 8;
        const current = this.categoryCounts.get(category) ?? 0;
        return current < limit;
    },

    /**
     * Check voice limit, potentially cull lower priority voice
     * @private
     */
    _checkVoiceLimit(priority) {
        if (this.activeVoices.length < this.maxVoices) {
            return true;
        }

        // Convert priority string to number
        const priorityValue = typeof priority === 'string'
            ? this.PRIORITY[priority] ?? 2
            : priority;

        // Find lowest priority voice to cull
        let lowestPriority = Infinity;
        let cullTarget = null;

        for (const voice of this.activeVoices) {
            const voicePriority = typeof voice.priority === 'string'
                ? this.PRIORITY[voice.priority] ?? 2
                : voice.priority;

            if (voicePriority < lowestPriority) {
                lowestPriority = voicePriority;
                cullTarget = voice;
            }
        }

        // Can only cull if new sound has higher priority
        if (cullTarget && priorityValue > lowestPriority) {
            this.stopVoice(cullTarget);
            return true;
        }

        // Voice limit reached and can't cull
        return false;
    },

    /**
     * Remove a voice from tracking
     * @private
     */
    _removeVoice(voice) {
        const index = this.activeVoices.indexOf(voice);
        if (index !== -1) {
            this.activeVoices.splice(index, 1);
            this._decrementCategoryCount(voice.category);
        }
    },

    /**
     * Increment category count
     * @private
     */
    _incrementCategoryCount(category) {
        const current = this.categoryCounts.get(category) ?? 0;
        this.categoryCounts.set(category, current + 1);
    },

    /**
     * Decrement category count
     * @private
     */
    _decrementCategoryCount(category) {
        const current = this.categoryCounts.get(category) ?? 0;
        this.categoryCounts.set(category, Math.max(0, current - 1));
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update SFX system (cleanup finished voices)
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Cleanup is handled by onended callback, but we can do additional cleanup here
        const currentTime = this.audioManager?.audioContext?.currentTime ?? 0;

        // Remove any voices that have exceeded their duration (safety cleanup)
        this.activeVoices = this.activeVoices.filter(voice => {
            const elapsed = currentTime - voice.startTime;
            if (elapsed > voice.duration + 0.1) {
                this._decrementCategoryCount(voice.category);
                return false;
            }
            return true;
        });
    },

    // ========================================================================
    // CONVENIENCE METHODS
    // ========================================================================

    /**
     * Play a UI sound
     * @param {string} soundId
     * @param {number} volume
     */
    playUI(soundId, volume = 1.0) {
        return this.play(soundId, {
            volume,
            category: 'ui',
            priority: 'MEDIUM'
        });
    },

    /**
     * Play a combat sound
     * @param {string} soundId
     * @param {object} options
     */
    playCombat(soundId, options = {}) {
        return this.play(soundId, {
            ...options,
            category: 'combat',
            priority: options.priority ?? 'HIGH'
        });
    },

    /**
     * Play a monster sound with position-based panning
     * @param {string} monsterType
     * @param {string} action - 'idle', 'alert', 'attack', 'hit', 'death'
     * @param {object} options
     */
    playMonsterSound(monsterType, action, options = {}) {
        if (typeof AUDIO_DEFINITIONS === 'undefined' ||
            !AUDIO_DEFINITIONS.monsters ||
            !AUDIO_DEFINITIONS.monsters[monsterType]) {
            return null;
        }

        const monsterSounds = AUDIO_DEFINITIONS.monsters[monsterType];
        const soundData = monsterSounds[action];

        if (!soundData) return null;

        // Get sound ID (may be array of variations)
        let soundId;
        if (Array.isArray(soundData)) {
            const randomIndex = Math.floor(Math.random() * soundData.length);
            soundId = soundData[randomIndex].id || soundData[randomIndex];
        } else {
            soundId = soundData.id || soundData;
        }

        return this.play(soundId, {
            ...options,
            category: 'monster',
            priority: action === 'death' ? 'HIGH' : 'MEDIUM'
        });
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Cleanup SFX system
     */
    cleanup() {
        this.stopAll();
        this.activeVoices = [];
        this.categoryCounts.clear();
        console.log('[SFXSystem] Cleanup complete');
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.SFXSystem = SFXSystem;
}

console.log('[SFXSystem] SFX System loaded');
