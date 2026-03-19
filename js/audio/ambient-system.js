// ============================================================================
// AMBIENT SYSTEM - The Shifting Chasm
// ============================================================================
// Handles environmental ambient audio with layered loops, zone-based switching,
// and one-shot ambient events
// ============================================================================

const AmbientSystem = {
    name: 'AmbientSystem',

    // ========================================================================
    // STATE
    // ========================================================================

    /** Reference to AudioManager */
    audioManager: null,

    /** Whether the system is ready */
    ready: false,

    /** Loaded audio buffers keyed by sound ID */
    loadedSounds: {},

    /** Currently active ambient layers */
    activeLayers: [],

    /** Maximum concurrent ambient layers */
    maxLayers: 4,

    /** Current zone identifier */
    currentZone: null,

    /** One-shot ambient event timer */
    oneShotTimer: 0,

    /** One-shot cooldown in seconds */
    oneShotCooldown: 15,

    /** Whether ambient is paused */
    paused: false,

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /** Default fade duration for layer transitions */
    defaultFadeDuration: 2.0,

    // ========================================================================
    // ZONE DEFINITIONS
    // ========================================================================

    /**
     * Zone ambient configurations
     * Each zone defines base layers and optional one-shot events
     */
    zoneDefinitions: {
        // Village - Normal state
        village_normal: {
            layers: [
                { id: 'village_ambience', volume: 0.5, loop: true },
                { id: 'birds_distant', volume: 0.3, loop: true }
            ],
            oneShots: [
                { id: 'dog_bark', chance: 0.1, volume: 0.4 },
                { id: 'door_creak', chance: 0.08, volume: 0.3 },
                { id: 'chatter_distant', chance: 0.12, volume: 0.25 }
            ]
        },

        // Village - Ash falling state
        village_ash: {
            layers: [
                { id: 'wind_eerie', volume: 0.5, loop: true },
                { id: 'embers_crackle', volume: 0.35, loop: true }
            ],
            oneShots: [
                { id: 'rumble_distant', chance: 0.15, volume: 0.4 },
                { id: 'wood_creak', chance: 0.1, volume: 0.3 }
            ]
        },

        // Village - Burning state
        village_burning: {
            layers: [
                { id: 'fire_roar', volume: 0.6, loop: true },
                { id: 'wind_harsh', volume: 0.4, loop: true }
            ],
            oneShots: [
                { id: 'collapse_distant', chance: 0.2, volume: 0.5 },
                { id: 'scream_distant', chance: 0.1, volume: 0.35 }
            ]
        },

        // Village - Endgame state
        village_endgame: {
            layers: [
                { id: 'void_hum', volume: 0.4, loop: true },
                { id: 'wind_mournful', volume: 0.35, loop: true }
            ],
            oneShots: [
                { id: 'whisper', chance: 0.12, volume: 0.3 },
                { id: 'heartbeat', chance: 0.08, volume: 0.25 }
            ]
        },

        // Dungeon - Early floors (1-2)
        dungeon_early: {
            layers: [
                { id: 'cave_drip', volume: 0.4, loop: true },
                { id: 'dungeon_ambience', volume: 0.5, loop: true }
            ],
            oneShots: [
                { id: 'rock_fall_small', chance: 0.1, volume: 0.35 },
                { id: 'skitter', chance: 0.12, volume: 0.25 },
                { id: 'chains_rattle', chance: 0.06, volume: 0.3 }
            ]
        },

        // Dungeon - Mid floors (3-4)
        dungeon_mid: {
            layers: [
                { id: 'deep_rumble', volume: 0.45, loop: true },
                { id: 'lava_bubble_loop', volume: 0.35, loop: true }
            ],
            oneShots: [
                { id: 'steam_burst', chance: 0.12, volume: 0.4 },
                { id: 'rock_fall_large', chance: 0.08, volume: 0.5 },
                { id: 'monster_distant', chance: 0.1, volume: 0.35 }
            ]
        },

        // Dungeon - Deep floors (5-6)
        dungeon_deep: {
            layers: [
                { id: 'void_pulse', volume: 0.5, loop: true },
                { id: 'machinery_hum', volume: 0.35, loop: true }
            ],
            oneShots: [
                { id: 'whisper_eldritch', chance: 0.15, volume: 0.35 },
                { id: 'energy_crackle', chance: 0.1, volume: 0.4 },
                { id: 'scream_distant', chance: 0.05, volume: 0.3 }
            ]
        },

        // The Core (final area)
        dungeon_core: {
            layers: [
                { id: 'core_pulse', volume: 0.6, loop: true },
                { id: 'energy_surge', volume: 0.4, loop: true },
                { id: 'heartbeat_slow', volume: 0.35, loop: true }
            ],
            oneShots: [
                { id: 'voice_fragment', chance: 0.18, volume: 0.4 },
                { id: 'reality_tear', chance: 0.08, volume: 0.5 }
            ]
        },

        // Combat state overlay
        combat: {
            layers: [
                { id: 'combat_tension', volume: 0.3, loop: true }
            ],
            oneShots: []
        },

        // Boss fight
        boss: {
            layers: [
                { id: 'boss_presence', volume: 0.4, loop: true }
            ],
            oneShots: [
                { id: 'power_surge', chance: 0.1, volume: 0.45 }
            ]
        },

        // Shift/Meltdown
        shift: {
            layers: [
                { id: 'earthquake_rumble', volume: 0.5, loop: true },
                { id: 'collapse_ambient', volume: 0.45, loop: true }
            ],
            oneShots: [
                { id: 'collapse_distant', chance: 0.25, volume: 0.6 },
                { id: 'lava_surge', chance: 0.15, volume: 0.5 }
            ]
        }
    },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize the ambient system
     * @param {object} audioManager - Reference to AudioManager
     */
    init(audioManager) {
        this.audioManager = audioManager;

        // Load configuration
        if (typeof AUDIO_CONFIG !== 'undefined') {
            this.oneShotCooldown = AUDIO_CONFIG.ambientOneShotCooldown || 15;
        }

        this.ready = true;
        console.log('[AmbientSystem] Ambient system initialized');
    },

    // ========================================================================
    // SOUND LOADING
    // ========================================================================

    /**
     * Load an ambient sound
     * @param {string} soundId - Sound identifier
     * @returns {Promise<AudioBuffer>}
     */
    async loadSound(soundId) {
        if (this.loadedSounds[soundId]) {
            return this.loadedSounds[soundId];
        }

        const path = this._getSoundPath(soundId);
        if (!path) {
            console.warn(`[AmbientSystem] No path for sound: ${soundId}`);
            return null;
        }

        try {
            const buffer = await this.audioManager.loadAudioBuffer(path);
            this.loadedSounds[soundId] = buffer;
            return buffer;
        } catch (error) {
            console.warn(`[AmbientSystem] Failed to load: ${soundId}`, error);
            return null;
        }
    },

    /**
     * Get sound file path
     * @param {string} soundId
     * @returns {string|null}
     * @private
     */
    _getSoundPath(soundId) {
        // Define ambient sound paths
        const paths = {
            // Village ambience
            village_ambience: 'assets/audio/ambient/village/village_ambience.ogg',
            birds_distant: 'assets/audio/ambient/village/birds_distant.ogg',
            dog_bark: 'assets/audio/ambient/village/dog_bark.ogg',
            door_creak: 'assets/audio/ambient/village/door_creak.ogg',
            chatter_distant: 'assets/audio/ambient/village/chatter_distant.ogg',

            // Village ash/burning
            wind_eerie: 'assets/audio/ambient/village/wind_eerie.ogg',
            embers_crackle: 'assets/audio/ambient/village/embers_crackle.ogg',
            rumble_distant: 'assets/audio/ambient/village/rumble_distant.ogg',
            wood_creak: 'assets/audio/ambient/village/wood_creak.ogg',
            fire_roar: 'assets/audio/ambient/village/fire_roar.ogg',
            wind_harsh: 'assets/audio/ambient/village/wind_harsh.ogg',
            collapse_distant: 'assets/audio/ambient/village/collapse_distant.ogg',
            scream_distant: 'assets/audio/ambient/village/scream_distant.ogg',
            wind_mournful: 'assets/audio/ambient/village/wind_mournful.ogg',

            // Dungeon ambience
            cave_drip: 'assets/audio/ambient/dungeon/cave_drip.ogg',
            dungeon_ambience: 'assets/audio/ambient/dungeon/dungeon_ambience.ogg',
            rock_fall_small: 'assets/audio/ambient/dungeon/rock_fall_small.ogg',
            rock_fall_large: 'assets/audio/ambient/dungeon/rock_fall_large.ogg',
            skitter: 'assets/audio/ambient/dungeon/skitter.ogg',
            chains_rattle: 'assets/audio/ambient/dungeon/chains_rattle.ogg',
            deep_rumble: 'assets/audio/ambient/dungeon/deep_rumble.ogg',
            lava_bubble_loop: 'assets/audio/ambient/dungeon/lava_bubble_loop.ogg',
            steam_burst: 'assets/audio/ambient/dungeon/steam_burst.ogg',
            monster_distant: 'assets/audio/ambient/dungeon/monster_distant.ogg',

            // Deep dungeon / void
            void_pulse: 'assets/audio/ambient/dungeon/void_pulse.ogg',
            void_hum: 'assets/audio/ambient/dungeon/void_hum.ogg',
            machinery_hum: 'assets/audio/ambient/dungeon/machinery_hum.ogg',
            whisper: 'assets/audio/ambient/dungeon/whisper.ogg',
            whisper_eldritch: 'assets/audio/ambient/dungeon/whisper_eldritch.ogg',
            energy_crackle: 'assets/audio/ambient/dungeon/energy_crackle.ogg',
            heartbeat: 'assets/audio/ambient/dungeon/heartbeat.ogg',
            heartbeat_slow: 'assets/audio/ambient/dungeon/heartbeat_slow.ogg',

            // Core
            core_pulse: 'assets/audio/ambient/dungeon/core_pulse.ogg',
            energy_surge: 'assets/audio/ambient/dungeon/energy_surge.ogg',
            voice_fragment: 'assets/audio/ambient/dungeon/voice_fragment.ogg',
            reality_tear: 'assets/audio/ambient/dungeon/reality_tear.ogg',

            // Combat/Boss
            combat_tension: 'assets/audio/ambient/combat/combat_tension.ogg',
            boss_presence: 'assets/audio/ambient/combat/boss_presence.ogg',
            power_surge: 'assets/audio/ambient/combat/power_surge.ogg',

            // Shift/Meltdown
            earthquake_rumble: 'assets/audio/ambient/shift/earthquake_rumble.ogg',
            collapse_ambient: 'assets/audio/ambient/shift/collapse_ambient.ogg',
            lava_surge: 'assets/audio/ambient/shift/lava_surge.ogg'
        };

        return paths[soundId] || null;
    },

    /**
     * Preload sounds for a zone
     * @param {string} zoneId
     * @returns {Promise<void>}
     */
    async preloadZone(zoneId) {
        const zoneDef = this.zoneDefinitions[zoneId];
        if (!zoneDef) return;

        const soundIds = [];

        // Collect all sound IDs for this zone
        zoneDef.layers.forEach(layer => soundIds.push(layer.id));
        zoneDef.oneShots?.forEach(oneShot => soundIds.push(oneShot.id));

        // Load all sounds
        await Promise.allSettled(soundIds.map(id => this.loadSound(id)));
        console.log(`[AmbientSystem] Preloaded zone: ${zoneId}`);
    },

    // ========================================================================
    // ZONE SWITCHING
    // ========================================================================

    /**
     * Set the current ambient zone
     * @param {string} zoneId - Zone identifier
     * @param {object} options - Transition options
     * @param {number} options.fadeTime - Fade duration in seconds
     * @returns {Promise<void>}
     */
    async setZone(zoneId, options = {}) {
        if (!this.ready || !this.audioManager?.isReady()) return;

        if (zoneId === this.currentZone) return;

        const zoneDef = this.zoneDefinitions[zoneId];
        if (!zoneDef) {
            console.warn(`[AmbientSystem] Unknown zone: ${zoneId}`);
            return;
        }

        const fadeTime = options.fadeTime ?? this.defaultFadeDuration;

        // Fade out current layers
        await this._fadeOutAllLayers(fadeTime);

        // Update zone
        this.currentZone = zoneId;

        // Start new layers
        for (const layerDef of zoneDef.layers) {
            await this._startLayer(layerDef, fadeTime);
        }

        console.log(`[AmbientSystem] Zone changed to: ${zoneId}`);
    },

    /**
     * Map game state to ambient zone
     * @param {string} gameState - Game state identifier
     * @param {number} floor - Current dungeon floor
     * @param {number} villageState - Village atmosphere state (1-4)
     * @returns {string} Zone ID
     */
    getZoneForState(gameState, floor = 1, villageState = 1) {
        switch (gameState) {
            case 'village':
                switch (villageState) {
                    case 1: return 'village_normal';
                    case 2: return 'village_ash';
                    case 3: return 'village_burning';
                    case 4: return 'village_endgame';
                    default: return 'village_normal';
                }

            case 'playing':
            case 'dungeon':
                if (floor <= 2) return 'dungeon_early';
                if (floor <= 4) return 'dungeon_mid';
                if (floor <= 6) return 'dungeon_deep';
                return 'dungeon_core';

            case 'combat':
                return 'combat';

            case 'boss':
                return 'boss';

            case 'shift':
            case 'meltdown':
                return 'shift';

            default:
                return 'dungeon_early';
        }
    },

    // ========================================================================
    // LAYER MANAGEMENT
    // ========================================================================

    /**
     * Start an ambient layer
     * @param {object} layerDef - Layer definition
     * @param {number} fadeTime - Fade in time
     * @returns {Promise<void>}
     * @private
     */
    async _startLayer(layerDef, fadeTime = 2.0) {
        // Check max layers
        if (this.activeLayers.length >= this.maxLayers) {
            console.warn('[AmbientSystem] Max layers reached');
            return;
        }

        // Load sound if needed
        let buffer = this.loadedSounds[layerDef.id];
        if (!buffer) {
            buffer = await this.loadSound(layerDef.id);
            if (!buffer) return;
        }

        const ctx = this.audioManager.audioContext;

        // Create source
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = layerDef.loop !== false;

        // Create gain for fading
        const gain = ctx.createGain();
        gain.gain.value = fadeTime > 0 ? 0 : layerDef.volume;

        // Connect
        source.connect(gain);
        gain.connect(this.audioManager.ambientGain);

        // Start
        source.start(0);

        // Fade in
        if (fadeTime > 0) {
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(layerDef.volume, ctx.currentTime + fadeTime);
        }

        // Store reference
        const layer = {
            id: layerDef.id,
            source: source,
            gain: gain,
            volume: layerDef.volume,
            loop: source.loop
        };

        source.onended = () => {
            this._removeLayer(layer);
        };

        this.activeLayers.push(layer);
    },

    /**
     * Remove a layer from active layers
     * @param {object} layer
     * @private
     */
    _removeLayer(layer) {
        const index = this.activeLayers.indexOf(layer);
        if (index !== -1) {
            this.activeLayers.splice(index, 1);
        }
    },

    /**
     * Fade out all active layers
     * @param {number} fadeTime
     * @returns {Promise<void>}
     * @private
     */
    async _fadeOutAllLayers(fadeTime) {
        if (this.activeLayers.length === 0) return;

        const ctx = this.audioManager.audioContext;
        const layersToStop = [...this.activeLayers];

        // Apply fade out to all
        layersToStop.forEach(layer => {
            const currentVolume = layer.gain.gain.value;
            layer.gain.gain.setValueAtTime(currentVolume, ctx.currentTime);
            layer.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeTime);
        });

        // Wait for fade
        await this._wait(fadeTime * 1000);

        // Stop and cleanup
        layersToStop.forEach(layer => {
            try {
                layer.source.stop();
                layer.gain.disconnect();
            } catch (e) {
                // Already stopped
            }
        });

        this.activeLayers = [];
    },

    /**
     * Add an overlay layer (e.g., combat tension)
     * @param {string} layerId - Layer sound ID
     * @param {number} volume - Volume level
     * @param {number} fadeTime - Fade in time
     */
    async addOverlayLayer(layerId, volume = 0.3, fadeTime = 1.0) {
        // Check if already playing
        if (this.activeLayers.some(l => l.id === layerId)) return;

        await this._startLayer({
            id: layerId,
            volume: volume,
            loop: true
        }, fadeTime);
    },

    /**
     * Remove an overlay layer
     * @param {string} layerId
     * @param {number} fadeTime
     */
    async removeOverlayLayer(layerId, fadeTime = 1.0) {
        const layer = this.activeLayers.find(l => l.id === layerId);
        if (!layer) return;

        const ctx = this.audioManager.audioContext;

        // Fade out
        const currentVolume = layer.gain.gain.value;
        layer.gain.gain.setValueAtTime(currentVolume, ctx.currentTime);
        layer.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeTime);

        // Wait and stop
        await this._wait(fadeTime * 1000);

        try {
            layer.source.stop();
            layer.gain.disconnect();
        } catch (e) {}

        this._removeLayer(layer);
    },

    // ========================================================================
    // ONE-SHOT EVENTS
    // ========================================================================

    /**
     * Play a one-shot ambient sound
     * @param {string} soundId
     * @param {number} volume
     */
    async playOneShot(soundId, volume = 0.4) {
        if (!this.ready || !this.audioManager?.isReady()) return;

        let buffer = this.loadedSounds[soundId];
        if (!buffer) {
            buffer = await this.loadSound(soundId);
            if (!buffer) return;
        }

        const ctx = this.audioManager.audioContext;

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.audioManager.ambientGain);

        source.start(0);
    },

    /**
     * Trigger random one-shot based on current zone
     * @private
     */
    _triggerRandomOneShot() {
        if (!this.currentZone) return;

        const zoneDef = this.zoneDefinitions[this.currentZone];
        if (!zoneDef?.oneShots || zoneDef.oneShots.length === 0) return;

        // Check each one-shot's chance
        for (const oneShot of zoneDef.oneShots) {
            if (Math.random() < oneShot.chance) {
                this.playOneShot(oneShot.id, oneShot.volume);
                break; // Only play one per trigger
            }
        }
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update ambient system (called by AudioManager)
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.ready || this.paused) return;

        // One-shot timer
        this.oneShotTimer -= dt;
        if (this.oneShotTimer <= 0) {
            this._triggerRandomOneShot();
            this.oneShotTimer = this.oneShotCooldown + (Math.random() * 10 - 5); // Add variance
        }
    },

    // ========================================================================
    // CONTROL
    // ========================================================================

    /**
     * Pause all ambient audio
     */
    pause() {
        this.paused = true;
        // Web Audio can't truly pause, but we stop processing one-shots
    },

    /**
     * Resume ambient audio
     */
    resume() {
        this.paused = false;
    },

    /**
     * Set global ambient volume
     * @param {number} volume
     * @param {number} fadeTime
     */
    setVolume(volume, fadeTime = 0.5) {
        if (!this.audioManager?.ambientGain) return;

        const ctx = this.audioManager.audioContext;
        volume = Math.max(0, Math.min(1, volume));

        if (fadeTime > 0) {
            const current = this.audioManager.ambientGain.gain.value;
            this.audioManager.ambientGain.gain.setValueAtTime(current, ctx.currentTime);
            this.audioManager.ambientGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeTime);
        } else {
            this.audioManager.ambientGain.gain.setValueAtTime(volume, ctx.currentTime);
        }
    },

    // ========================================================================
    // UTILITY
    // ========================================================================

    /**
     * Wait helper
     * @param {number} ms
     * @returns {Promise<void>}
     * @private
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Get currently active layer IDs
     * @returns {string[]}
     */
    getActiveLayers() {
        return this.activeLayers.map(l => l.id);
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Cleanup ambient resources
     */
    cleanup() {
        // Stop all layers immediately
        this.activeLayers.forEach(layer => {
            try {
                layer.source.stop();
                layer.gain.disconnect();
            } catch (e) {}
        });

        this.activeLayers = [];
        this.currentZone = null;
        this.paused = false;

        console.log('[AmbientSystem] Cleanup complete');
    },

    /**
     * Unload all cached sounds
     */
    unloadAllSounds() {
        this.loadedSounds = {};
        console.log('[AmbientSystem] All sounds unloaded');
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.AmbientSystem = AmbientSystem;
}

console.log('[AmbientSystem] Ambient system loaded');
