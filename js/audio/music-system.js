// ============================================================================
// MUSIC SYSTEM - The Shifting Chasm
// ============================================================================
// Handles background music playback with track management, crossfades,
// looping, and zone-based switching
// ============================================================================

const MusicSystem = {
    name: 'MusicSystem',

    // ========================================================================
    // STATE
    // ========================================================================

    /** Reference to AudioManager */
    audioManager: null,

    /** Whether the system is ready */
    ready: false,

    /** Loaded audio buffers keyed by track ID */
    loadedTracks: {},

    /** Currently playing track info */
    currentTrack: null,

    /** AudioBufferSourceNode for current track */
    currentSource: null,

    /** GainNode for current track (for fading) */
    currentGain: null,

    /** Track being faded to during crossfade */
    nextTrack: null,

    /** AudioBufferSourceNode for next track during crossfade */
    nextSource: null,

    /** GainNode for next track during crossfade */
    nextGain: null,

    /** Active fade operation */
    activeFade: null,

    /** Current zone identifier */
    currentZone: null,

    /** Whether music is paused */
    paused: false,

    /** Loop start position tracking */
    loopStartTime: 0,

    /** Track playback position */
    playbackPosition: 0,

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /** Default fade durations in seconds */
    defaultFadeIn: 2.0,
    defaultFadeOut: 2.0,
    defaultCrossfade: 3.0,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize the music system
     * @param {object} audioManager - Reference to AudioManager
     */
    init(audioManager) {
        this.audioManager = audioManager;

        // Load configuration
        if (typeof AUDIO_CONFIG !== 'undefined') {
            this.defaultCrossfade = AUDIO_CONFIG.musicCrossfade || 3.0;
        }

        this.ready = true;
        console.log('[MusicSystem] Music system initialized');
    },

    // ========================================================================
    // TRACK LOADING
    // ========================================================================

    /**
     * Load a music track
     * @param {string} trackId - Track identifier
     * @returns {Promise<AudioBuffer>} The loaded audio buffer
     */
    async loadTrack(trackId) {
        // Check if already loaded
        if (this.loadedTracks[trackId]) {
            return this.loadedTracks[trackId];
        }

        // Get track definition
        const trackDef = this._getTrackDefinition(trackId);
        if (!trackDef) {
            console.warn(`[MusicSystem] Track not found: ${trackId}`);
            return null;
        }

        // Load the audio buffer
        try {
            const buffer = await this.audioManager.loadAudioBuffer(trackDef.path);
            this.loadedTracks[trackId] = buffer;
            console.log(`[MusicSystem] Loaded track: ${trackId}`);
            return buffer;
        } catch (error) {
            console.error(`[MusicSystem] Failed to load track: ${trackId}`, error);
            return null;
        }
    },

    /**
     * Preload multiple tracks
     * @param {string[]} trackIds - Array of track IDs to preload
     * @returns {Promise<void>}
     */
    async preloadTracks(trackIds) {
        const loadPromises = trackIds.map(id => this.loadTrack(id));
        await Promise.allSettled(loadPromises);
        console.log(`[MusicSystem] Preloaded ${trackIds.length} tracks`);
    },

    /**
     * Get track definition from MUSIC_TRACKS
     * @param {string} trackId
     * @returns {object|null}
     * @private
     */
    _getTrackDefinition(trackId) {
        if (typeof MUSIC_TRACKS === 'undefined') {
            console.warn('[MusicSystem] MUSIC_TRACKS not defined');
            return null;
        }
        return MUSIC_TRACKS[trackId] || null;
    },

    // ========================================================================
    // PLAYBACK CONTROL
    // ========================================================================

    /**
     * Play a music track
     * @param {string} trackId - Track identifier
     * @param {object} options - Playback options
     * @param {boolean} options.loop - Whether to loop (default: true)
     * @param {number} options.fadeIn - Fade in duration in seconds
     * @param {number} options.volume - Volume multiplier (0.0-1.0)
     * @param {number} options.startOffset - Start position in seconds
     * @returns {Promise<boolean>} Success
     */
    async play(trackId, options = {}) {
        if (!this.ready || !this.audioManager?.isReady()) {
            console.warn('[MusicSystem] System not ready');
            return false;
        }

        // Get or load the track
        let buffer = this.loadedTracks[trackId];
        if (!buffer) {
            buffer = await this.loadTrack(trackId);
            if (!buffer) return false;
        }

        const trackDef = this._getTrackDefinition(trackId);
        const ctx = this.audioManager.audioContext;

        // Parse options
        const loop = options.loop !== false;
        const fadeIn = options.fadeIn ?? trackDef?.fadeIn ?? this.defaultFadeIn;
        const volume = options.volume ?? 1.0;
        const startOffset = options.startOffset ?? 0;

        // Stop current track with fade if playing
        if (this.currentSource) {
            await this.stop(this.defaultFadeOut);
        }

        // Create source and gain nodes
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;

        // Set loop points if defined
        if (trackDef?.loopStart !== undefined) {
            source.loopStart = trackDef.loopStart;
        }
        if (trackDef?.loopEnd !== undefined) {
            source.loopEnd = trackDef.loopEnd;
        } else if (loop) {
            source.loopEnd = buffer.duration;
        }

        // Create gain node for this track
        const gain = ctx.createGain();
        gain.gain.value = fadeIn > 0 ? 0 : volume;

        // Connect: Source -> Track Gain -> Music Channel Gain
        source.connect(gain);
        gain.connect(this.audioManager.musicGain);

        // Handle track end
        source.onended = () => {
            if (this.currentSource === source) {
                this.currentSource = null;
                this.currentGain = null;
                this.currentTrack = null;
            }
        };

        // Start playback
        source.start(0, startOffset);
        this.loopStartTime = ctx.currentTime - startOffset;

        // Store references
        this.currentSource = source;
        this.currentGain = gain;
        this.currentTrack = {
            id: trackId,
            definition: trackDef,
            volume: volume,
            loop: loop
        };

        // Apply fade in
        if (fadeIn > 0) {
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeIn);
        }

        this.paused = false;
        console.log(`[MusicSystem] Playing: ${trackId}`);
        return true;
    },

    /**
     * Stop the current track
     * @param {number} fadeOut - Fade out duration in seconds (0 for immediate)
     * @returns {Promise<void>}
     */
    async stop(fadeOut) {
        if (!this.currentSource || !this.currentGain) return;

        const ctx = this.audioManager.audioContext;
        fadeOut = fadeOut ?? this.defaultFadeOut;

        if (fadeOut > 0) {
            // Fade out
            const currentVolume = this.currentGain.gain.value;
            this.currentGain.gain.setValueAtTime(currentVolume, ctx.currentTime);
            this.currentGain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOut);

            // Store references to stop after fade
            const sourceToStop = this.currentSource;
            const gainToDisconnect = this.currentGain;

            // Clear references immediately
            this.currentSource = null;
            this.currentGain = null;
            this.currentTrack = null;

            // Wait for fade then stop
            await this._wait(fadeOut * 1000);

            try {
                sourceToStop.stop();
                gainToDisconnect.disconnect();
            } catch (e) {
                // Already stopped
            }
        } else {
            // Immediate stop
            try {
                this.currentSource.stop();
                this.currentGain.disconnect();
            } catch (e) {
                // Already stopped
            }
            this.currentSource = null;
            this.currentGain = null;
            this.currentTrack = null;
        }

        console.log('[MusicSystem] Music stopped');
    },

    /**
     * Pause the current track
     */
    pause() {
        if (!this.currentSource || this.paused) return;

        const ctx = this.audioManager.audioContext;
        this.playbackPosition = ctx.currentTime - this.loopStartTime;
        this.paused = true;

        // We can't truly pause a Web Audio source, so we stop it
        // and will resume from the saved position
        try {
            this.currentSource.stop();
        } catch (e) {
            // Already stopped
        }

        console.log('[MusicSystem] Music paused');
    },

    /**
     * Resume a paused track
     */
    async resume() {
        if (!this.paused || !this.currentTrack) return;

        const trackId = this.currentTrack.id;
        const volume = this.currentTrack.volume;
        const loop = this.currentTrack.loop;

        this.paused = false;

        // Replay from saved position with no fade
        await this.play(trackId, {
            loop: loop,
            fadeIn: 0.3,  // Quick fade on resume
            volume: volume,
            startOffset: this.playbackPosition
        });

        console.log('[MusicSystem] Music resumed');
    },

    // ========================================================================
    // CROSSFADE
    // ========================================================================

    /**
     * Crossfade from current track to a new track
     * @param {string} trackId - Track to crossfade to
     * @param {object} options - Options
     * @param {number} options.duration - Crossfade duration in seconds
     * @param {number} options.volume - Target volume
     * @returns {Promise<boolean>} Success
     */
    async crossfadeTo(trackId, options = {}) {
        if (!this.ready || !this.audioManager?.isReady()) {
            return false;
        }

        // If no current track, just play normally
        if (!this.currentSource) {
            return this.play(trackId, options);
        }

        // Same track? Do nothing
        if (this.currentTrack?.id === trackId) {
            return true;
        }

        const ctx = this.audioManager.audioContext;
        const duration = options.duration ?? this.defaultCrossfade;
        const volume = options.volume ?? 1.0;

        // Get or load the new track
        let buffer = this.loadedTracks[trackId];
        if (!buffer) {
            buffer = await this.loadTrack(trackId);
            if (!buffer) return false;
        }

        const trackDef = this._getTrackDefinition(trackId);

        // Create new source and gain for incoming track
        const newSource = ctx.createBufferSource();
        newSource.buffer = buffer;
        newSource.loop = true;

        if (trackDef?.loopStart !== undefined) {
            newSource.loopStart = trackDef.loopStart;
        }
        if (trackDef?.loopEnd !== undefined) {
            newSource.loopEnd = trackDef.loopEnd;
        } else {
            newSource.loopEnd = buffer.duration;
        }

        const newGain = ctx.createGain();
        newGain.gain.value = 0;

        newSource.connect(newGain);
        newGain.connect(this.audioManager.musicGain);

        // Store references
        this.nextSource = newSource;
        this.nextGain = newGain;
        this.nextTrack = {
            id: trackId,
            definition: trackDef,
            volume: volume,
            loop: true
        };

        // Start new track
        newSource.start(0);

        // Crossfade: old out, new in
        const oldGain = this.currentGain;
        const oldVolume = oldGain.gain.value;

        oldGain.gain.setValueAtTime(oldVolume, ctx.currentTime);
        oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        newGain.gain.setValueAtTime(0, ctx.currentTime);
        newGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + duration);

        // Store old source reference for cleanup
        const oldSource = this.currentSource;

        // Wait for crossfade to complete
        await this._wait(duration * 1000);

        // Stop and cleanup old track
        try {
            oldSource.stop();
        } catch (e) {
            // Already stopped
        }

        // Swap references
        this.currentSource = this.nextSource;
        this.currentGain = this.nextGain;
        this.currentTrack = this.nextTrack;
        this.loopStartTime = ctx.currentTime - duration;

        this.nextSource = null;
        this.nextGain = null;
        this.nextTrack = null;

        newSource.onended = () => {
            if (this.currentSource === newSource) {
                this.currentSource = null;
                this.currentGain = null;
                this.currentTrack = null;
            }
        };

        console.log(`[MusicSystem] Crossfaded to: ${trackId}`);
        return true;
    },

    // ========================================================================
    // ZONE-BASED MUSIC
    // ========================================================================

    /**
     * Set the current zone and play appropriate music
     * @param {string} zoneId - Zone identifier (e.g., 'village', 'dungeon_1', 'boss')
     * @param {object} options - Options
     * @returns {Promise<boolean>} Success
     */
    async setZone(zoneId, options = {}) {
        if (!zoneId || zoneId === this.currentZone) return true;

        const zoneMappings = this._getZoneMappings();
        const trackId = zoneMappings[zoneId];

        if (!trackId) {
            console.warn(`[MusicSystem] No track mapped for zone: ${zoneId}`);
            return false;
        }

        this.currentZone = zoneId;

        // If a track is playing, crossfade; otherwise play
        if (this.currentSource && this.currentTrack?.id !== trackId) {
            return this.crossfadeTo(trackId, options);
        } else if (!this.currentSource) {
            return this.play(trackId, options);
        }

        return true;
    },

    /**
     * Get zone to track mappings
     * @returns {object} Zone ID to track ID mapping
     * @private
     */
    _getZoneMappings() {
        if (typeof MUSIC_TRACKS !== 'undefined' && MUSIC_TRACKS.zoneMappings) {
            return MUSIC_TRACKS.zoneMappings;
        }

        // Default mappings
        return {
            'village': 'village_peaceful',
            'village_ash': 'village_ash',
            'village_burning': 'village_burning',
            'village_endgame': 'village_endgame',
            'dungeon_1': 'dungeon_floor_1',
            'dungeon_2': 'dungeon_floor_1',
            'dungeon_3': 'dungeon_floor_2',
            'dungeon_4': 'dungeon_floor_2',
            'dungeon_5': 'dungeon_floor_3',
            'dungeon_6': 'dungeon_floor_3',
            'boss': 'boss_theme',
            'boss_malphas': 'boss_malphas',
            'boss_core': 'boss_core',
            'combat': 'combat_theme',
            'gameover': 'gameover',
            'victory': 'victory'
        };
    },

    // ========================================================================
    // VOLUME CONTROL
    // ========================================================================

    /**
     * Set the volume of the currently playing track
     * @param {number} volume - Volume level (0.0-1.0)
     * @param {number} fadeTime - Time to fade to new volume
     */
    setVolume(volume, fadeTime = 0.5) {
        if (!this.currentGain || !this.audioManager?.audioContext) return;

        const ctx = this.audioManager.audioContext;
        volume = Math.max(0, Math.min(1, volume));

        if (fadeTime > 0) {
            const currentVolume = this.currentGain.gain.value;
            this.currentGain.gain.setValueAtTime(currentVolume, ctx.currentTime);
            this.currentGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeTime);
        } else {
            this.currentGain.gain.setValueAtTime(volume, ctx.currentTime);
        }

        if (this.currentTrack) {
            this.currentTrack.volume = volume;
        }
    },

    /**
     * Duck the music volume temporarily (e.g., for dialogue)
     * @param {number} duckLevel - Duck volume (0.0-1.0)
     * @param {number} duration - Duck duration in ms
     * @param {number} fadeTime - Fade time
     */
    async duck(duckLevel = 0.3, duration = 2000, fadeTime = 0.3) {
        if (!this.currentGain || !this.currentTrack) return;

        const originalVolume = this.currentTrack.volume;

        // Duck down
        this.setVolume(duckLevel, fadeTime);

        // Wait
        await this._wait(duration);

        // Restore
        this.setVolume(originalVolume, fadeTime);
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update music system (called by AudioManager)
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Currently no per-frame updates needed
        // Future: tension-based stem mixing would go here
    },

    // ========================================================================
    // UTILITY
    // ========================================================================

    /**
     * Helper to wait for a duration
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     * @private
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Get currently playing track info
     * @returns {object|null} Current track info
     */
    getCurrentTrack() {
        return this.currentTrack ? { ...this.currentTrack } : null;
    },

    /**
     * Check if music is currently playing
     * @returns {boolean}
     */
    isPlaying() {
        return this.currentSource !== null && !this.paused;
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Cleanup music resources
     */
    cleanup() {
        // Stop any playing tracks immediately
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {}
            this.currentSource = null;
        }

        if (this.currentGain) {
            this.currentGain.disconnect();
            this.currentGain = null;
        }

        if (this.nextSource) {
            try {
                this.nextSource.stop();
            } catch (e) {}
            this.nextSource = null;
        }

        if (this.nextGain) {
            this.nextGain.disconnect();
            this.nextGain = null;
        }

        this.currentTrack = null;
        this.nextTrack = null;
        this.currentZone = null;
        this.paused = false;

        console.log('[MusicSystem] Cleanup complete');
    },

    /**
     * Unload a specific track from memory
     * @param {string} trackId
     */
    unloadTrack(trackId) {
        if (this.loadedTracks[trackId]) {
            // Can't truly unload an AudioBuffer, but we can remove reference
            delete this.loadedTracks[trackId];
            console.log(`[MusicSystem] Unloaded track: ${trackId}`);
        }
    },

    /**
     * Unload all tracks from memory
     */
    unloadAllTracks() {
        this.loadedTracks = {};
        console.log('[MusicSystem] All tracks unloaded');
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.MusicSystem = MusicSystem;
}

console.log('[MusicSystem] Music system loaded');
