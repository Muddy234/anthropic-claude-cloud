// ============================================================================
// MUSIC TRACKS DATA - The Shifting Chasm
// ============================================================================
// Music track definitions with metadata for the MusicSystem
// Includes BPM, loop points, fade settings, and zone mappings
// ============================================================================

const MUSIC_TRACKS = {

    // ========================================================================
    // VILLAGE THEMES
    // ========================================================================

    village_peaceful: {
        id: 'village_peaceful',
        name: 'Haven\'s Rest',
        path: 'assets/audio/music/village/village_peaceful.ogg',
        bpm: 90,
        duration: 120,  // seconds
        loopStart: 0,
        loopEnd: 120,
        fadeIn: 3.0,
        fadeOut: 2.0,
        tags: ['village', 'peaceful', 'hopeful']
    },

    village_ash: {
        id: 'village_ash',
        name: 'Embers on the Wind',
        path: 'assets/audio/music/village/village_ash.ogg',
        bpm: 75,
        duration: 90,
        loopStart: 0,
        loopEnd: 90,
        fadeIn: 2.5,
        fadeOut: 2.5,
        tags: ['village', 'ash', 'ominous']
    },

    village_burning: {
        id: 'village_burning',
        name: 'The Flames Rise',
        path: 'assets/audio/music/village/village_burning.ogg',
        bpm: 120,
        duration: 60,
        loopStart: 0,
        loopEnd: 60,
        fadeIn: 1.0,
        fadeOut: 1.5,
        tags: ['village', 'burning', 'urgent', 'danger']
    },

    village_endgame: {
        id: 'village_endgame',
        name: 'Twilight of Hope',
        path: 'assets/audio/music/village/village_endgame.ogg',
        bpm: 60,
        duration: 180,
        loopStart: 8,
        loopEnd: 180,
        fadeIn: 4.0,
        fadeOut: 3.0,
        tags: ['village', 'endgame', 'melancholy', 'determination']
    },

    // ========================================================================
    // DUNGEON EXPLORATION THEMES
    // ========================================================================

    dungeon_floor_1: {
        id: 'dungeon_floor_1',
        name: 'Into the Depths',
        path: 'assets/audio/music/dungeon/dungeon_floor_1.ogg',
        bpm: 85,
        duration: 180,
        loopStart: 0,
        loopEnd: 180,
        fadeIn: 2.0,
        fadeOut: 2.0,
        tags: ['dungeon', 'exploration', 'mystery', 'early_floors']
    },

    dungeon_floor_2: {
        id: 'dungeon_floor_2',
        name: 'Whispers in Stone',
        path: 'assets/audio/music/dungeon/dungeon_floor_2.ogg',
        bpm: 90,
        duration: 150,
        loopStart: 0,
        loopEnd: 150,
        fadeIn: 2.0,
        fadeOut: 2.0,
        tags: ['dungeon', 'exploration', 'tension', 'mid_floors']
    },

    dungeon_floor_3: {
        id: 'dungeon_floor_3',
        name: 'The Core Beckons',
        path: 'assets/audio/music/dungeon/dungeon_floor_3.ogg',
        bpm: 95,
        duration: 120,
        loopStart: 0,
        loopEnd: 120,
        fadeIn: 2.0,
        fadeOut: 2.0,
        tags: ['dungeon', 'exploration', 'dread', 'deep_floors']
    },

    // ========================================================================
    // COMBAT THEMES
    // ========================================================================

    combat_theme: {
        id: 'combat_theme',
        name: 'Steel and Shadow',
        path: 'assets/audio/music/combat/combat_theme.ogg',
        bpm: 130,
        duration: 90,
        loopStart: 0,
        loopEnd: 90,
        fadeIn: 0.5,
        fadeOut: 1.5,
        tags: ['combat', 'action', 'intense']
    },

    combat_intense: {
        id: 'combat_intense',
        name: 'Blood and Fire',
        path: 'assets/audio/music/combat/combat_intense.ogg',
        bpm: 145,
        duration: 60,
        loopStart: 0,
        loopEnd: 60,
        fadeIn: 0.3,
        fadeOut: 1.0,
        tags: ['combat', 'intense', 'boss']
    },

    // ========================================================================
    // BOSS THEMES
    // ========================================================================

    boss_theme: {
        id: 'boss_theme',
        name: 'Harbinger',
        path: 'assets/audio/music/boss/boss_theme.ogg',
        bpm: 140,
        duration: 180,
        loopStart: 16,  // Skip intro on loop
        loopEnd: 180,
        fadeIn: 0.5,
        fadeOut: 2.0,
        tags: ['boss', 'epic', 'dangerous']
    },

    boss_malphas: {
        id: 'boss_malphas',
        name: 'Malphas, the Fallen',
        path: 'assets/audio/music/boss/boss_malphas.ogg',
        bpm: 150,
        duration: 210,
        loopStart: 20,
        loopEnd: 210,
        fadeIn: 0.5,
        fadeOut: 2.0,
        tags: ['boss', 'malphas', 'demon', 'epic']
    },

    boss_core: {
        id: 'boss_core',
        name: 'Heart of the Chasm',
        path: 'assets/audio/music/boss/boss_core.ogg',
        bpm: 160,
        duration: 240,
        loopStart: 24,
        loopEnd: 240,
        fadeIn: 1.0,
        fadeOut: 3.0,
        tags: ['boss', 'core', 'final', 'apocalyptic']
    },

    // ========================================================================
    // SHIFT / MELTDOWN THEMES
    // ========================================================================

    shift_imminent: {
        id: 'shift_imminent',
        name: 'The Collapse',
        path: 'assets/audio/music/shift/shift_imminent.ogg',
        bpm: 140,
        duration: 90,
        loopStart: 0,
        loopEnd: 90,
        fadeIn: 0.5,
        fadeOut: 1.0,
        tags: ['shift', 'urgent', 'danger', 'timer']
    },

    meltdown: {
        id: 'meltdown',
        name: 'Protocol: MELTDOWN',
        path: 'assets/audio/music/shift/meltdown.ogg',
        bpm: 160,
        duration: 90,
        loopStart: 0,
        loopEnd: 90,
        fadeIn: 0,
        fadeOut: 0.5,
        tags: ['shift', 'meltdown', 'critical', 'escape']
    },

    // ========================================================================
    // STINGERS (Short clips, no loop)
    // ========================================================================

    gameover: {
        id: 'gameover',
        name: 'Fallen',
        path: 'assets/audio/music/stings/gameover.ogg',
        bpm: 60,
        duration: 8,
        loopStart: null,  // No loop
        loopEnd: null,
        fadeIn: 0,
        fadeOut: 2.0,
        tags: ['sting', 'death', 'gameover']
    },

    victory: {
        id: 'victory',
        name: 'Triumph',
        path: 'assets/audio/music/stings/victory.ogg',
        bpm: 100,
        duration: 10,
        loopStart: null,
        loopEnd: null,
        fadeIn: 0,
        fadeOut: 2.0,
        tags: ['sting', 'victory', 'extraction']
    },

    extraction_success: {
        id: 'extraction_success',
        name: 'Safe Return',
        path: 'assets/audio/music/stings/extraction_success.ogg',
        bpm: 90,
        duration: 6,
        loopStart: null,
        loopEnd: null,
        fadeIn: 0,
        fadeOut: 1.0,
        tags: ['sting', 'extraction', 'success']
    },

    level_up_fanfare: {
        id: 'level_up_fanfare',
        name: 'Growth',
        path: 'assets/audio/music/stings/level_up.ogg',
        bpm: 120,
        duration: 3,
        loopStart: null,
        loopEnd: null,
        fadeIn: 0,
        fadeOut: 0.5,
        tags: ['sting', 'level_up', 'celebration']
    },

    // ========================================================================
    // ZONE MAPPINGS
    // ========================================================================
    // Maps zone IDs to track IDs for automatic music switching

    zoneMappings: {
        // Village states
        'village': 'village_peaceful',
        'village_normal': 'village_peaceful',
        'village_ash': 'village_ash',
        'village_burning': 'village_burning',
        'village_endgame': 'village_endgame',

        // Dungeon floors (grouped by tier)
        'dungeon_1': 'dungeon_floor_1',
        'dungeon_2': 'dungeon_floor_1',
        'dungeon_3': 'dungeon_floor_2',
        'dungeon_4': 'dungeon_floor_2',
        'dungeon_5': 'dungeon_floor_3',
        'dungeon_6': 'dungeon_floor_3',

        // Combat states
        'combat': 'combat_theme',
        'combat_intense': 'combat_intense',

        // Boss encounters
        'boss': 'boss_theme',
        'boss_generic': 'boss_theme',
        'boss_malphas': 'boss_malphas',
        'boss_core': 'boss_core',

        // Shift states
        'shift_warning': 'shift_imminent',
        'meltdown': 'meltdown',

        // Game states
        'gameover': 'gameover',
        'victory': 'victory',
        'extraction': 'extraction_success'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a track by ID
 * @param {string} trackId
 * @returns {object|null}
 */
function getMusicTrack(trackId) {
    if (trackId === 'zoneMappings') return null;
    return MUSIC_TRACKS[trackId] || null;
}

/**
 * Get track for a zone
 * @param {string} zoneId
 * @returns {object|null}
 */
function getMusicTrackForZone(zoneId) {
    const trackId = MUSIC_TRACKS.zoneMappings[zoneId];
    if (!trackId) return null;
    return MUSIC_TRACKS[trackId] || null;
}

/**
 * Get all tracks with a specific tag
 * @param {string} tag
 * @returns {object[]}
 */
function getMusicTracksByTag(tag) {
    return Object.values(MUSIC_TRACKS)
        .filter(track => track.tags && track.tags.includes(tag));
}

/**
 * Get appropriate track for dungeon floor
 * @param {number} floor - Floor number (1-6+)
 * @returns {object|null}
 */
function getDungeonMusicTrack(floor) {
    const zoneId = `dungeon_${Math.min(floor, 6)}`;
    return getMusicTrackForZone(zoneId);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.MUSIC_TRACKS = MUSIC_TRACKS;
    window.getMusicTrack = getMusicTrack;
    window.getMusicTrackForZone = getMusicTrackForZone;
    window.getMusicTracksByTag = getMusicTracksByTag;
    window.getDungeonMusicTrack = getDungeonMusicTrack;
}

console.log('[MusicTracks] Music track definitions loaded');
