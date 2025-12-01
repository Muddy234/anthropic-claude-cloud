// ============================================================
// NOISE SYSTEM - The Shifting Chasm
// ============================================================
// Handles sound generation, propagation, and monster detection
// Used by: enemy-ai.js, player actions, combat system
// ============================================================

/**
 * NOISE SYSTEM OVERVIEW:
 * 
 * 1. Player actions generate noise (walking, combat, abilities)
 * 2. Noise propagates outward from source, blocked by walls/decorations
 * 3. Monsters within hearing range may detect the noise
 * 4. Detection triggers alert/investigation behavior
 * 
 * Noise is measured in "volume" units (0-100):
 * - 0-20: Whisper (sneaking, careful movement)
 * - 21-40: Normal (walking, opening doors)
 * - 41-60: Loud (combat, running)
 * - 61-80: Very Loud (abilities, breaking objects)
 * - 81-100: Deafening (explosions, boss abilities)
 */

// ============================================================
// NOISE TYPE DEFINITIONS
// ============================================================

const NOISE_TYPES = {
    // Movement noises
    STEP_SNEAK: {
        id: 'step_sneak',
        name: 'Sneaking',
        baseVolume: 10,
        propagation: 'radial',
        category: 'movement'
    },
    STEP_WALK: {
        id: 'step_walk',
        name: 'Walking',
        baseVolume: 25,
        propagation: 'radial',
        category: 'movement'
    },
    STEP_RUN: {
        id: 'step_run',
        name: 'Running',
        baseVolume: 45,
        propagation: 'radial',
        category: 'movement'
    },
    
    // Interaction noises
    DOOR_OPEN: {
        id: 'door_open',
        name: 'Door Opening',
        baseVolume: 35,
        propagation: 'radial',
        category: 'interaction'
    },
    DOOR_BREAK: {
        id: 'door_break',
        name: 'Door Breaking',
        baseVolume: 70,
        propagation: 'radial',
        category: 'interaction'
    },
    CHEST_OPEN: {
        id: 'chest_open',
        name: 'Chest Opening',
        baseVolume: 30,
        propagation: 'radial',
        category: 'interaction'
    },
    ITEM_PICKUP: {
        id: 'item_pickup',
        name: 'Item Pickup',
        baseVolume: 15,
        propagation: 'radial',
        category: 'interaction'
    },
    
    // Combat noises
    ATTACK_MELEE: {
        id: 'attack_melee',
        name: 'Melee Attack',
        baseVolume: 50,
        propagation: 'radial',
        category: 'combat'
    },
    ATTACK_RANGED: {
        id: 'attack_ranged',
        name: 'Ranged Attack',
        baseVolume: 40,
        propagation: 'radial',
        category: 'combat'
    },
    ATTACK_MAGIC: {
        id: 'attack_magic',
        name: 'Magic Attack',
        baseVolume: 55,
        propagation: 'radial',
        category: 'combat'
    },
    HIT_IMPACT: {
        id: 'hit_impact',
        name: 'Hit Impact',
        baseVolume: 45,
        propagation: 'radial',
        category: 'combat'
    },
    DEATH_CRY: {
        id: 'death_cry',
        name: 'Death Cry',
        baseVolume: 60,
        propagation: 'radial',
        category: 'combat'
    },
    
    // Ability noises
    ABILITY_SMALL: {
        id: 'ability_small',
        name: 'Minor Ability',
        baseVolume: 35,
        propagation: 'radial',
        category: 'ability'
    },
    ABILITY_MEDIUM: {
        id: 'ability_medium',
        name: 'Major Ability',
        baseVolume: 55,
        propagation: 'radial',
        category: 'ability'
    },
    ABILITY_LARGE: {
        id: 'ability_large',
        name: 'Powerful Ability',
        baseVolume: 75,
        propagation: 'radial',
        category: 'ability'
    },
    EXPLOSION: {
        id: 'explosion',
        name: 'Explosion',
        baseVolume: 90,
        propagation: 'radial',
        category: 'ability'
    },
    
    // Monster communication
    MONSTER_SHOUT: {
        id: 'monster_shout',
        name: 'Monster Alert',
        baseVolume: 65,
        propagation: 'radial',
        category: 'communication',
        alertsOtherMonsters: true  // Special flag
    },
    MONSTER_GROWL: {
        id: 'monster_growl',
        name: 'Monster Growl',
        baseVolume: 40,
        propagation: 'radial',
        category: 'communication'
    },
    
    // Environmental
    TRAP_TRIGGER: {
        id: 'trap_trigger',
        name: 'Trap Triggered',
        baseVolume: 50,
        propagation: 'radial',
        category: 'environment'
    },
    LAVA_BUBBLE: {
        id: 'lava_bubble',
        name: 'Lava Bubbling',
        baseVolume: 20,
        propagation: 'radial',
        category: 'environment',
        isAmbient: true  // Monsters ignore ambient sounds
    }
};


// ============================================================
// NOISE EVENT CLASS
// ============================================================

class NoiseEvent {
    constructor(options) {
        this.id = `noise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = options.type;                    // NOISE_TYPES key
        this.sourceX = options.x;
        this.sourceY = options.y;
        this.volume = options.volume || NOISE_TYPES[options.type]?.baseVolume || 50;
        this.timestamp = Date.now();
        this.source = options.source || 'unknown';   // 'player', 'monster', 'environment'
        this.sourceEntity = options.sourceEntity;    // Reference to entity that made noise
        
        // Calculated properties
        this.maxRange = this.calculateMaxRange();
        this.processed = false;
        this.heardBy = [];  // Track which monsters heard this
    }
    
    /**
     * Calculate how far this noise can travel
     * Higher volume = further range
     */
    calculateMaxRange() {
        // Base range formula: volume / 5, minimum 2 tiles
        // Volume 50 = 10 tile range, Volume 100 = 20 tile range
        return Math.max(2, Math.floor(this.volume / 5));
    }
    
    /**
     * Get the effective volume at a given distance
     * @param {number} distance - Distance from noise source
     * @returns {number} Volume at that distance (0-100)
     */
    getVolumeAtDistance(distance) {
        if (distance <= 0) return this.volume;
        if (distance >= this.maxRange) return 0;
        
        // Linear falloff
        const falloff = 1 - (distance / this.maxRange);
        return Math.floor(this.volume * falloff);
    }
}


// ============================================================
// NOISE SYSTEM MANAGER
// ============================================================

const NoiseSystem = {
    // Active noise events (cleaned up after processing)
    activeNoises: [],
    
    // History for debugging
    noiseHistory: [],
    maxHistorySize: 50,
    
    // Configuration
    config: {
        enabled: true,
        debugMode: false,
        visualizeNoise: false,     // Show noise rings in renderer
        propagationBlockedBy: ['wall', 'door_closed'],  // Tile types that block sound
        decorationBlocking: true   // Whether decorations can block sound
    },
    
    // Reference to game state (set during initialization)
    game: null,
    
    /**
     * Initialize the noise system
     * @param {Object} gameRef - Reference to main game object
     */
    init(gameRef) {
        this.game = gameRef;
        this.activeNoises = [];
        this.noiseHistory = [];
        console.log('[NoiseSystem] Initialized');
    },
    
    /**
     * Create a new noise event
     * @param {Object} options - Noise configuration
     * @returns {NoiseEvent} The created noise event
     */
    createNoise(options) {
        if (!this.config.enabled) return null;
        
        const noise = new NoiseEvent(options);
        this.activeNoises.push(noise);
        
        // Add to history
        this.noiseHistory.push({
            ...noise,
            timestamp: Date.now()
        });
        
        // Trim history
        if (this.noiseHistory.length > this.maxHistorySize) {
            this.noiseHistory.shift();
        }
        
        if (this.config.debugMode) {
            console.log(`[NoiseSystem] Noise created: ${noise.type} at (${noise.sourceX}, ${noise.sourceY}) vol:${noise.volume}`);
        }
        
        return noise;
    },
    
    /**
     * Convenience method: Player makes noise
     */
    playerNoise(type, volumeModifier = 1.0) {
        if (!this.game?.player) return null;
        
        const baseVolume = NOISE_TYPES[type]?.baseVolume || 50;
        
        return this.createNoise({
            type: type,
            x: this.game.player.gridX,
            y: this.game.player.gridY,
            volume: Math.floor(baseVolume * volumeModifier),
            source: 'player',
            sourceEntity: this.game.player
        });
    },
    
    /**
     * Convenience method: Monster makes noise
     */
    monsterNoise(monster, type, volumeModifier = 1.0) {
        const baseVolume = NOISE_TYPES[type]?.baseVolume || 50;
        
        return this.createNoise({
            type: type,
            x: monster.gridX,
            y: monster.gridY,
            volume: Math.floor(baseVolume * volumeModifier),
            source: 'monster',
            sourceEntity: monster
        });
    },

/**
     * Generic noise creation method (for backward compatibility)
     * @param {Object} entity - Entity making the noise
     * @param {number} volume - Raw volume value
     * @param {number} x - Optional X position (uses entity.gridX if not provided)
     * @param {number} y - Optional Y position (uses entity.gridY if not provided)
     */
    makeNoise(entity, volume, x = null, y = null) {
        if (!entity) return null;
        
        return this.createNoise({
            type: 'GENERIC',
            x: x !== null ? x : entity.gridX,
            y: y !== null ? y : entity.gridY,
            volume: volume,
            source: entity === this.game?.player ? 'player' : 'monster',
            sourceEntity: entity
        });
    },
    
    /**
     * Check if a position can hear a noise
     * Accounts for walls and blocking decorations
     * @param {NoiseEvent} noise - The noise event
     * @param {number} listenerX - Listener X position
     * @param {number} listenerY - Listener Y position
     * @returns {Object} { canHear: boolean, volume: number, blocked: boolean }
     */
    canHearNoise(noise, listenerX, listenerY) {
        // Calculate distance
        const dx = listenerX - noise.sourceX;
        const dy = listenerY - noise.sourceY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Out of range
        if (distance > noise.maxRange) {
            return { canHear: false, volume: 0, blocked: false };
        }
        
        // Check line of sight for sound (can be blocked)
        const isBlocked = this.isSoundBlocked(
            noise.sourceX, noise.sourceY,
            listenerX, listenerY
        );
        
        if (isBlocked) {
            // Sound is blocked but may still be heard at reduced volume
            const reducedVolume = noise.getVolumeAtDistance(distance) * 0.3;
            return { 
                canHear: reducedVolume > 10,  // Minimum threshold
                volume: Math.floor(reducedVolume), 
                blocked: true 
            };
        }
        
        const volume = noise.getVolumeAtDistance(distance);
        return { canHear: volume > 0, volume: volume, blocked: false };
    },
    
    /**
     * Check if sound is blocked between two points
     * Uses raycast-style checking
     */
    isSoundBlocked(x1, y1, x2, y2) {
        if (!this.game) return false;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        
        if (steps === 0) return false;
        
        const xStep = dx / steps;
        const yStep = dy / steps;
        
        for (let i = 1; i < steps; i++) {
            const checkX = Math.floor(x1 + xStep * i);
            const checkY = Math.floor(y1 + yStep * i);
            
            // Check tile type
            if (this.isTileBlocking(checkX, checkY)) {
                return true;
            }
            
            // Check decorations
            if (this.config.decorationBlocking && this.isDecorationBlocking(checkX, checkY)) {
                return true;
            }
        }
        
        return false;
    },
    
    /**
     * Check if a tile blocks sound
     */
    isTileBlocking(x, y) {
        if (!this.game?.map) return true;
        
        const tile = this.game.map[y]?.[x];
        if (!tile) return true;  // Out of bounds blocks sound
        
        // Check against blocking tile types
        return this.config.propagationBlockedBy.includes(tile.type);
    },
    
    /**
     * Check if a decoration at position blocks sound
     */
    isDecorationBlocking(x, y) {
        if (!this.game?.decorations) return false;
        
        // Use the hasBlockingDecorationAt helper if available
        if (typeof hasBlockingDecorationAt === 'function') {
            return hasBlockingDecorationAt(x, y);
        }
        
        // Fallback: check game.decorations array
        return this.game.decorations.some(dec => 
            dec.x === x && 
            dec.y === y && 
            dec.data?.blocksMovement === true
        );
    },
    
    /**
     * Process all active noises and alert monsters
     * Called each game tick
     */
    update() {
        if (!this.config.enabled || !this.game?.enemies) return;
        
        const processedNoises = [];
        
        this.activeNoises.forEach(noise => {
            if (noise.processed) return;
            
            // Check each monster
            this.game.enemies.forEach(enemy => {
                // Skip dead enemies
                if (enemy.hp <= 0) return;
                
                // Skip if this monster made the noise
                if (noise.sourceEntity === enemy) return;
                
                // Get monster's hearing capability
                const hearingRange = enemy.senses?.hearingRange || 6;
                const hearingMultiplier = enemy.senses?.hearingMultiplier || 1.0;
                
                // Check if monster can hear
                const hearResult = this.canHearNoise(noise, enemy.gridX, enemy.gridY);
                
                if (hearResult.canHear) {
                    // Apply monster's hearing multiplier
                    const effectiveVolume = hearResult.volume * hearingMultiplier;
                    
                    // Minimum volume threshold for detection
                    const detectionThreshold = 15;
                    
                    if (effectiveVolume >= detectionThreshold) {
                        // Monster heard the noise!
                        this.onMonsterHeardNoise(enemy, noise, effectiveVolume, hearResult.blocked);
                        noise.heardBy.push(enemy.id || enemy);
                    }
                }
            });
            
            noise.processed = true;
            processedNoises.push(noise);
        });
        
        // Clean up processed noises
        this.activeNoises = this.activeNoises.filter(n => !n.processed);
        
        // Debug visualization
        if (this.config.visualizeNoise && processedNoises.length > 0) {
            this.visualizeNoises(processedNoises);
        }
    },
    
    /**
     * Called when a monster detects a noise
     * Override this or use events to handle monster reactions
     */
    onMonsterHeardNoise(monster, noise, volume, wasBlocked) {
        if (this.config.debugMode) {
            console.log(`[NoiseSystem] ${monster.name || 'Monster'} heard ${noise.type} (vol: ${volume}${wasBlocked ? ', blocked' : ''})`);
        }
        
        // Default behavior: alert the monster's AI
        if (monster.ai && typeof monster.ai.onNoiseHeard === 'function') {
            monster.ai.onNoiseHeard({
                noiseType: noise.type,
                sourceX: noise.sourceX,
                sourceY: noise.sourceY,
                volume: volume,
                source: noise.source,
                wasBlocked: wasBlocked
            });
        }
        
        // Emit event for external handling
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('monsterHeardNoise', {
                detail: { monster, noise, volume, wasBlocked }
            }));
        }
    },
    
    /**
     * Visualize noise events (for debugging)
     */
    visualizeNoises(noises) {
        // Store for renderer to pick up
        if (!this.game.debugOverlay) {
            this.game.debugOverlay = {};
        }
        
        this.game.debugOverlay.noises = noises.map(n => ({
            x: n.sourceX,
            y: n.sourceY,
            radius: n.maxRange,
            volume: n.volume,
            type: n.type
        }));
        
        // Clear after a short time
        setTimeout(() => {
            if (this.game.debugOverlay?.noises) {
                this.game.debugOverlay.noises = [];
            }
        }, 500);
    },
    
    /**
     * Get recent noise history for debugging
     */
    getHistory() {
        return [...this.noiseHistory];
    },
    
    /**
     * Clear all active noises
     */
    clear() {
        this.activeNoises = [];
    }
};


// ============================================================
// INTEGRATION HELPERS
// ============================================================

/**
 * Helper to generate noise from player movement
 * Call this from your movement handler
 */
function onPlayerMove(isSneaking = false, isRunning = false) {
    if (isRunning) {
        NoiseSystem.playerNoise('STEP_RUN');
    } else if (isSneaking) {
        NoiseSystem.playerNoise('STEP_SNEAK');
    } else {
        NoiseSystem.playerNoise('STEP_WALK');
    }
}

/**
 * Helper to generate noise from combat
 * Call this from your combat system
 */
function onCombatAction(attacker, actionType, x, y) {
    const noiseMap = {
        'melee': 'ATTACK_MELEE',
        'ranged': 'ATTACK_RANGED',
        'magic': 'ATTACK_MAGIC',
        'hit': 'HIT_IMPACT',
        'death': 'DEATH_CRY'
    };
    
    const noiseType = noiseMap[actionType] || 'ATTACK_MELEE';
    
    if (attacker === 'player') {
        NoiseSystem.playerNoise(noiseType);
    } else {
        NoiseSystem.createNoise({
            type: noiseType,
            x: x,
            y: y,
            source: 'monster',
            sourceEntity: attacker
        });
    }
}


// ============================================================
// DEBUG UTILITIES
// ============================================================

/**
 * Debug: Create a test noise at player position
 */
function debugTriggerNoise(type = 'ATTACK_MELEE', volume = null) {
    const noise = NoiseSystem.playerNoise(type, volume ? volume / (NOISE_TYPES[type]?.baseVolume || 50) : 1.0);
    console.log('[Debug] Triggered noise:', noise);
    return noise;
}

/**
 * Debug: Show which monsters can hear from a position
 */
function debugCheckHearing(x, y, volume = 50) {
    const testNoise = new NoiseEvent({
        type: 'STEP_WALK',
        x: x,
        y: y,
        volume: volume,
        source: 'debug'
    });
    
    console.log(`[Debug] Checking hearing from (${x}, ${y}) with volume ${volume}:`);
    
    if (!NoiseSystem.game?.enemies) {
        console.log('  No enemies to check');
        return;
    }
    
    NoiseSystem.game.enemies.forEach(enemy => {
        const result = NoiseSystem.canHearNoise(testNoise, enemy.gridX, enemy.gridY);
        if (result.canHear) {
            console.log(`  ${enemy.name}: CAN HEAR (vol: ${result.volume}${result.blocked ? ', blocked' : ''})`);
        } else {
            console.log(`  ${enemy.name}: cannot hear`);
        }
    });
}

/**
 * Debug: Toggle noise visualization
 */
function debugToggleNoiseVis() {
    NoiseSystem.config.visualizeNoise = !NoiseSystem.config.visualizeNoise;
    console.log(`[Debug] Noise visualization: ${NoiseSystem.config.visualizeNoise ? 'ON' : 'OFF'}`);
}

// Expose debug functions globally
if (typeof window !== 'undefined') {
    window.triggerNoise = debugTriggerNoise;
    window.checkHearing = debugCheckHearing;
    window.toggleNoiseVis = debugToggleNoiseVis;
    window.NoiseSystem = NoiseSystem;
    window.NOISE_TYPES = NOISE_TYPES;
}


// ============================================================
// EXPORTS
// ============================================================

// For ES6 modules
// export { NoiseSystem, NOISE_TYPES, NoiseEvent, onPlayerMove, onCombatAction };

// For Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NoiseSystem,
        NOISE_TYPES,
        NoiseEvent,
        onPlayerMove,
        onCombatAction
    };
}// ============================================================================
// SYSTEM MANAGER REGISTRATION - Add to end of noise-system.js
// ============================================================================

const NoiseSystemDef = {
    name: 'noise-system',
    
    init(game) {
        NoiseSystem.init(game);
    },
    
    update(dt) {
        // NoiseSystem.update() doesn't need dt - it processes queued events
        if (NoiseSystem.update) {
            NoiseSystem.update();
        }
    },
    
    cleanup() {
        NoiseSystem.clear();
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('noise-system', NoiseSystemDef, 30);
} else {
    console.warn('⚠️ SystemManager not found - noise-system running standalone');
}

console.log('✅ Noise system loaded');
