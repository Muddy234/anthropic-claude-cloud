// ============================================================================
// AUDIO MANAGER - The Shifting Chasm
// ============================================================================
// Core audio engine using Web Audio API
// Handles AudioContext lifecycle, gain staging, and subsystem coordination
// ============================================================================

const AudioManager = {
    name: 'AudioManager',
    priority: 5,  // Initialize early, before most systems

    // ========================================================================
    // WEB AUDIO API CORE
    // ========================================================================

    /** @type {AudioContext|null} */
    audioContext: null,

    /** @type {GainNode|null} Master gain for global volume control */
    masterGain: null,

    /** @type {GainNode|null} Music channel gain */
    musicGain: null,

    /** @type {GainNode|null} SFX channel gain */
    sfxGain: null,

    /** @type {GainNode|null} Ambient channel gain */
    ambientGain: null,

    /** @type {GainNode|null} UI sounds channel gain */
    uiGain: null,

    /** @type {DynamicsCompressorNode|null} Prevents clipping */
    compressor: null,

    // ========================================================================
    // STATE
    // ========================================================================

    /** Whether audio is enabled */
    enabled: true,

    /** Whether AudioContext has been created (requires user gesture) */
    initialized: false,

    /** Whether audio is currently suspended (tab hidden, game paused) */
    suspended: false,

    /** Volume levels (0.0 - 1.0) */
    volumes: {
        master: 1.0,
        music: 0.7,
        sfx: 1.0,
        ambient: 0.5,
        ui: 0.8
    },

    /** Reference to game object */
    game: null,

    // ========================================================================
    // SUBSYSTEM REFERENCES
    // ========================================================================

    /** @type {object|null} SFX System reference */
    sfx: null,

    /** @type {object|null} Music System reference */
    music: null,

    /** @type {object|null} Ambient System reference */
    ambient: null,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize the audio manager (called by SystemManager)
     * Note: AudioContext creation is deferred until user gesture
     * @param {object} game - Game reference
     */
    init(game) {
        this.game = game;

        // Load volume settings from config or saved preferences
        if (typeof AUDIO_CONFIG !== 'undefined') {
            this.volumes.master = AUDIO_CONFIG.masterVolume ?? 1.0;
            this.volumes.music = AUDIO_CONFIG.musicVolume ?? 0.7;
            this.volumes.sfx = AUDIO_CONFIG.sfxVolume ?? 1.0;
            this.volumes.ambient = AUDIO_CONFIG.ambientVolume ?? 0.5;
        }

        // Load saved volume preferences
        this._loadVolumePreferences();

        // Setup page visibility handling
        this._setupVisibilityHandling();

        // Setup user gesture detection for AudioContext creation
        this._setupUserGestureDetection();

        console.log('[AudioManager] Initialized (awaiting user gesture for AudioContext)');
    },

    /**
     * Create AudioContext on user gesture (required by browser autoplay policy)
     * @returns {boolean} Whether creation was successful
     */
    createAudioContext() {
        if (this.audioContext) {
            // Already created, just resume if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            return true;
        }

        try {
            // Create AudioContext (with webkit prefix for Safari)
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('[AudioManager] Web Audio API not supported');
                this.enabled = false;
                return false;
            }

            this.audioContext = new AudioContextClass();

            // Create gain staging
            this._createGainStaging();

            // Create compressor to prevent clipping
            this._createCompressor();

            // Connect the signal chain
            this._connectSignalChain();

            this.initialized = true;
            console.log('[AudioManager] AudioContext created successfully');
            console.log(`[AudioManager] Sample rate: ${this.audioContext.sampleRate}Hz`);

            // Initialize subsystems if they exist
            this._initializeSubsystems();

            return true;

        } catch (error) {
            console.error('[AudioManager] Failed to create AudioContext:', error);
            this.enabled = false;
            return false;
        }
    },

    /**
     * Create gain nodes for volume control
     * @private
     */
    _createGainStaging() {
        const ctx = this.audioContext;

        // Master gain (final output volume)
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = this.volumes.master;

        // Channel gains
        this.musicGain = ctx.createGain();
        this.musicGain.gain.value = this.volumes.music;

        this.sfxGain = ctx.createGain();
        this.sfxGain.gain.value = this.volumes.sfx;

        this.ambientGain = ctx.createGain();
        this.ambientGain.gain.value = this.volumes.ambient;

        this.uiGain = ctx.createGain();
        this.uiGain.gain.value = this.volumes.ui;
    },

    /**
     * Create dynamics compressor to prevent clipping
     * @private
     */
    _createCompressor() {
        const ctx = this.audioContext;

        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -6;   // Start compressing at -6dB
        this.compressor.knee.value = 6;         // Soft knee
        this.compressor.ratio.value = 4;        // 4:1 compression
        this.compressor.attack.value = 0.003;   // 3ms attack
        this.compressor.release.value = 0.1;    // 100ms release
    },

    /**
     * Connect the audio signal chain
     * @private
     */
    _connectSignalChain() {
        const ctx = this.audioContext;

        // All channels -> Master -> Compressor -> Destination
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.ambientGain.connect(this.masterGain);
        this.uiGain.connect(this.masterGain);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(ctx.destination);
    },

    /**
     * Initialize subsystems after AudioContext is ready
     * @private
     */
    _initializeSubsystems() {
        // SFX System
        if (typeof SFXSystem !== 'undefined') {
            this.sfx = SFXSystem;
            if (typeof SFXSystem.init === 'function') {
                SFXSystem.init(this);
            }
            console.log('[AudioManager] SFX System linked');
        }

        // Music System
        if (typeof MusicSystem !== 'undefined') {
            this.music = MusicSystem;
            if (typeof MusicSystem.init === 'function') {
                MusicSystem.init(this);
            }
            console.log('[AudioManager] Music System linked');
        }

        // Ambient System
        if (typeof AmbientSystem !== 'undefined') {
            this.ambient = AmbientSystem;
            if (typeof AmbientSystem.init === 'function') {
                AmbientSystem.init(this);
            }
            console.log('[AudioManager] Ambient System linked');
        }
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    /**
     * Update audio systems (called by SystemManager each frame)
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.enabled || !this.initialized || this.suspended) return;

        // Update subsystems
        if (this.sfx && typeof this.sfx.update === 'function') {
            this.sfx.update(dt);
        }

        if (this.music && typeof this.music.update === 'function') {
            this.music.update(dt);
        }

        if (this.ambient && typeof this.ambient.update === 'function') {
            this.ambient.update(dt);
        }
    },

    // ========================================================================
    // VOLUME CONTROL
    // ========================================================================

    /**
     * Set master volume
     * @param {number} volume - Volume level (0.0 - 1.0)
     */
    setMasterVolume(volume) {
        this.volumes.master = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(
                this.volumes.master,
                this.audioContext.currentTime
            );
        }
        this._saveVolumePreferences();
    },

    /**
     * Set music volume
     * @param {number} volume - Volume level (0.0 - 1.0)
     */
    setMusicVolume(volume) {
        this.volumes.music = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(
                this.volumes.music,
                this.audioContext.currentTime
            );
        }
        this._saveVolumePreferences();
    },

    /**
     * Set SFX volume
     * @param {number} volume - Volume level (0.0 - 1.0)
     */
    setSFXVolume(volume) {
        this.volumes.sfx = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.setValueAtTime(
                this.volumes.sfx,
                this.audioContext.currentTime
            );
        }
        this._saveVolumePreferences();
    },

    /**
     * Set ambient volume
     * @param {number} volume - Volume level (0.0 - 1.0)
     */
    setAmbientVolume(volume) {
        this.volumes.ambient = Math.max(0, Math.min(1, volume));
        if (this.ambientGain) {
            this.ambientGain.gain.setValueAtTime(
                this.volumes.ambient,
                this.audioContext.currentTime
            );
        }
        this._saveVolumePreferences();
    },

    /**
     * Set UI volume
     * @param {number} volume - Volume level (0.0 - 1.0)
     */
    setUIVolume(volume) {
        this.volumes.ui = Math.max(0, Math.min(1, volume));
        if (this.uiGain) {
            this.uiGain.gain.setValueAtTime(
                this.volumes.ui,
                this.audioContext.currentTime
            );
        }
        this._saveVolumePreferences();
    },

    /**
     * Mute all audio
     */
    mute() {
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
    },

    /**
     * Unmute audio (restore to saved master volume)
     */
    unmute() {
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(
                this.volumes.master,
                this.audioContext.currentTime
            );
        }
    },

    // ========================================================================
    // SUSPEND / RESUME
    // ========================================================================

    /**
     * Suspend audio (pause when tab hidden or game paused)
     */
    suspend() {
        if (!this.audioContext || this.suspended) return;

        this.audioContext.suspend();
        this.suspended = true;
        console.log('[AudioManager] Audio suspended');
    },

    /**
     * Resume audio (unpause when tab visible or game resumed)
     */
    resume() {
        if (!this.audioContext || !this.suspended) return;

        this.audioContext.resume();
        this.suspended = false;
        console.log('[AudioManager] Audio resumed');
    },

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /** @type {Set<string>} URLs that have already failed to load (don't retry) */
    failedUrls: new Set(),

    /** @type {boolean} Whether we've logged the file:// protocol warning */
    _loggedFileProtocolWarning: false,

    /**
     * Load an audio file and decode it
     * @param {string} url - URL to audio file
     * @returns {Promise<AudioBuffer|null>} Decoded audio buffer or null on failure
     */
    async loadAudioBuffer(url) {
        // If AudioContext not initialized, return null gracefully
        if (!this.audioContext) {
            return null;
        }

        // Don't retry URLs that have already failed
        if (this.failedUrls.has(url)) {
            return null;
        }

        try {
            // Check for file:// protocol which blocks fetch due to CORS
            if (window.location.protocol === 'file:') {
                if (!this._loggedFileProtocolWarning) {
                    console.warn('[AudioManager] Running from file:// protocol - audio loading disabled due to CORS restrictions. Serve from a local server for audio support.');
                    this._loggedFileProtocolWarning = true;
                }
                this.failedUrls.add(url);
                return null;
            }

            const response = await fetch(url);
            if (!response.ok) {
                // Log once, then add to failed set
                console.warn(`[AudioManager] Failed to load audio (HTTP ${response.status}): ${url}`);
                this.failedUrls.add(url);
                return null;
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            return audioBuffer;

        } catch (error) {
            // Only log each failure once to avoid console spam
            if (!this.failedUrls.has(url)) {
                // Check for common CORS/network errors
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    console.warn(`[AudioManager] Network error loading audio (CORS or missing file): ${url}`);
                } else {
                    console.warn(`[AudioManager] Failed to load audio: ${url}`, error.message || error);
                }
                this.failedUrls.add(url);
            }
            return null;
        }
    },

    /**
     * Get current audio context time
     * @returns {number} Current time in seconds
     */
    getCurrentTime() {
        return this.audioContext ? this.audioContext.currentTime : 0;
    },

    /**
     * Check if audio is ready to play
     * @returns {boolean}
     */
    isReady() {
        return this.enabled &&
               this.initialized &&
               this.audioContext &&
               this.audioContext.state === 'running';
    },

    // ========================================================================
    // PRIVATE HELPER METHODS
    // ========================================================================

    /**
     * Setup page visibility change handling
     * @private
     */
    _setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.suspend();
            } else {
                this.resume();
            }
        });
    },

    /**
     * Setup user gesture detection for AudioContext creation
     * @private
     */
    _setupUserGestureDetection() {
        const createOnGesture = () => {
            this.createAudioContext();
            // Remove listeners after first successful creation
            if (this.initialized) {
                document.removeEventListener('click', createOnGesture);
                document.removeEventListener('keydown', createOnGesture);
                document.removeEventListener('touchstart', createOnGesture);
            }
        };

        document.addEventListener('click', createOnGesture);
        document.addEventListener('keydown', createOnGesture);
        document.addEventListener('touchstart', createOnGesture);
    },

    /**
     * Load volume preferences from localStorage
     * @private
     */
    _loadVolumePreferences() {
        try {
            const saved = localStorage.getItem('shifting_chasm_audio');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.volumes.master = prefs.master ?? this.volumes.master;
                this.volumes.music = prefs.music ?? this.volumes.music;
                this.volumes.sfx = prefs.sfx ?? this.volumes.sfx;
                this.volumes.ambient = prefs.ambient ?? this.volumes.ambient;
                this.volumes.ui = prefs.ui ?? this.volumes.ui;
            }
        } catch (e) {
            console.warn('[AudioManager] Could not load volume preferences:', e);
        }
    },

    /**
     * Save volume preferences to localStorage
     * @private
     */
    _saveVolumePreferences() {
        try {
            localStorage.setItem('shifting_chasm_audio', JSON.stringify(this.volumes));
        } catch (e) {
            console.warn('[AudioManager] Could not save volume preferences:', e);
        }
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Cleanup audio resources (called on game end or floor transition)
     */
    cleanup() {
        // Cleanup subsystems
        if (this.sfx && typeof this.sfx.cleanup === 'function') {
            this.sfx.cleanup();
        }

        if (this.music && typeof this.music.cleanup === 'function') {
            this.music.cleanup();
        }

        if (this.ambient && typeof this.ambient.cleanup === 'function') {
            this.ambient.cleanup();
        }

        console.log('[AudioManager] Cleanup complete');
    },

    /**
     * Play a sound effect (convenience wrapper for SFXSystem)
     * @param {string} soundId - The sound ID to play
     * @param {number} volume - Optional volume (0-1)
     * @returns {object|null} Voice instance or null
     */
    playSfx(soundId, volume = 1.0) {
        if (this.sfx && typeof this.sfx.play === 'function') {
            return this.sfx.play(soundId, { volume });
        }
        return null;
    },

    /**
     * Fully destroy the audio system (rarely needed)
     */
    destroy() {
        this.cleanup();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.ambientGain = null;
        this.uiGain = null;
        this.compressor = null;

        this.initialized = false;
        console.log('[AudioManager] Destroyed');
    }
};

// ============================================================================
// REGISTER WITH SYSTEM MANAGER
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('audio-manager', AudioManager, 5);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.AudioManager = AudioManager;
}

console.log('[AudioManager] Audio Manager loaded');
