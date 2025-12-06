// ============================================================================
// ENVIRONMENTAL METER SYSTEM - Player resource meters affected by environment
// ============================================================================
// Handles meters like warmth, infection, sanity that drain/regen based on
// environmental conditions and shift mechanics.
// ============================================================================

const EnvironmentalMeterSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false
    },

    // ========================================================================
    // STATE
    // ========================================================================
    meters: new Map(),  // meterId -> meter object
    activeModifiers: new Map(),  // meterId -> [modifiers]

    // ========================================================================
    // PREDEFINED METER TYPES
    // ========================================================================
    METER_TYPES: {
        WARMTH: 'warmth',
        INFECTION: 'infection',
        SANITY: 'sanity',
        OXYGEN: 'oxygen',
        CORRUPTION: 'corruption'
    },

    // Default meter configurations
    METER_CONFIGS: {
        'warmth': {
            name: 'Warmth',
            max: 100,
            min: 0,
            startValue: 100,
            baseDrainRate: 0,     // Per second (set by shift)
            baseRegenRate: 0,
            depletionDirection: 'down',  // 'down' = bad when low, 'up' = bad when high
            thresholds: [
                { value: 70, effect: null, message: null },
                { value: 50, effect: 'breath_visible', message: "Your breath mists in the cold air." },
                { value: 30, effect: 'move_slow_10', message: "The cold seeps into your bones." },
                { value: 15, effect: 'move_slow_25', message: "Hypothermia setting in. Find warmth!" },
                { value: 0, effect: 'freezing_dot', message: "You're freezing to death!" }
            ],
            barColor: '#f39c12',
            warningColor: '#3498db',
            criticalColor: '#9b59b6',
            icon: '🔥'
        },
        'infection': {
            name: 'Infection',
            max: 100,
            min: 0,
            startValue: 0,
            baseDrainRate: 0,     // Infection doesn't drain naturally
            baseRegenRate: 0,
            depletionDirection: 'up',  // Bad when high
            thresholds: [
                { value: 0, effect: null, message: null },
                { value: 30, effect: 'vision_tint_red', message: "You feel a strange hunger..." },
                { value: 60, effect: 'bonus_damage', message: "The infection spreads. Your veins burn." },
                { value: 90, effect: 'light_hurts', message: "You're losing yourself. Find a cure!" },
                { value: 100, effect: 'transform', message: "The hunger consumes you completely." }
            ],
            barColor: '#c0392b',
            warningColor: '#e74c3c',
            criticalColor: '#8e44ad',
            icon: '🩸'
        },
        'sanity': {
            name: 'Sanity',
            max: 100,
            min: 0,
            startValue: 100,
            baseDrainRate: 0,
            baseRegenRate: 0,
            depletionDirection: 'down',
            thresholds: [
                { value: 70, effect: null, message: null },
                { value: 50, effect: 'hallucinations_mild', message: "The shadows seem to move..." },
                { value: 30, effect: 'hallucinations_severe', message: "You can't trust your eyes anymore." },
                { value: 10, effect: 'panic', message: "Terror grips your mind!" }
            ],
            barColor: '#9b59b6',
            warningColor: '#8e44ad',
            criticalColor: '#2c3e50',
            icon: '🧠'
        },
        'corruption': {
            name: 'Corruption',
            max: 100,
            min: 0,
            startValue: 0,
            baseDrainRate: 0,
            baseRegenRate: -0.5,  // Slowly decays when not exposed
            depletionDirection: 'up',
            thresholds: [
                { value: 0, effect: null, message: null },
                { value: 25, effect: 'void_whispers', message: "The void whispers to you..." },
                { value: 50, effect: 'void_sight', message: "You begin to see beyond the veil." },
                { value: 75, effect: 'void_form', message: "Your form flickers between realities." },
                { value: 100, effect: 'void_consumed', message: "The void claims you completely." }
            ],
            barColor: '#8e44ad',
            warningColor: '#9b59b6',
            criticalColor: '#1a1a2e',
            icon: '🌀'
        }
    },

    // ========================================================================
    // CORE METHODS
    // ========================================================================

    /**
     * Create and register a new environmental meter
     * @param {string} meterId - Unique identifier for the meter
     * @param {object} config - Meter configuration (uses default if meterId matches preset)
     * @returns {object} - The created meter
     */
    createMeter(meterId, config = {}) {
        // Use predefined config if available, merge with overrides
        const defaultConfig = this.METER_CONFIGS[meterId] || {};
        const finalConfig = { ...defaultConfig, ...config };

        const meter = {
            id: meterId,
            name: finalConfig.name || meterId,
            current: finalConfig.startValue ?? finalConfig.max ?? 100,
            max: finalConfig.max ?? 100,
            min: finalConfig.min ?? 0,
            baseDrainRate: finalConfig.baseDrainRate ?? 0,
            baseRegenRate: finalConfig.baseRegenRate ?? 0,
            currentDrainRate: finalConfig.baseDrainRate ?? 0,
            currentRegenRate: finalConfig.baseRegenRate ?? 0,
            depletionDirection: finalConfig.depletionDirection ?? 'down',
            thresholds: finalConfig.thresholds ?? [],
            barColor: finalConfig.barColor ?? '#3498db',
            warningColor: finalConfig.warningColor ?? '#f39c12',
            criticalColor: finalConfig.criticalColor ?? '#e74c3c',
            icon: finalConfig.icon ?? '📊',
            visible: true,
            active: true,
            currentThreshold: null,
            lastThresholdMessage: null
        };

        this.meters.set(meterId, meter);
        this.activeModifiers.set(meterId, []);

        if (this.config.debugLogging) {
            console.log(`[EnvMeter] Created meter: ${meterId}`, meter);
        }

        return meter;
    },

    /**
     * Remove a meter
     * @param {string} meterId - The meter to remove
     */
    removeMeter(meterId) {
        this.meters.delete(meterId);
        this.activeModifiers.delete(meterId);

        if (this.config.debugLogging) {
            console.log(`[EnvMeter] Removed meter: ${meterId}`);
        }
    },

    /**
     * Get a meter by ID
     * @param {string} meterId - The meter ID
     * @returns {object|null}
     */
    getMeter(meterId) {
        return this.meters.get(meterId) || null;
    },

    /**
     * Get current value of a meter
     * @param {string} meterId - The meter ID
     * @returns {number}
     */
    getValue(meterId) {
        const meter = this.meters.get(meterId);
        return meter?.current ?? 0;
    },

    /**
     * Get value as percentage
     * @param {string} meterId - The meter ID
     * @returns {number} - 0 to 1
     */
    getPercentage(meterId) {
        const meter = this.meters.get(meterId);
        if (!meter) return 0;
        return (meter.current - meter.min) / (meter.max - meter.min);
    },

    /**
     * Set the current value of a meter
     * @param {string} meterId - The meter ID
     * @param {number} value - New value
     */
    setValue(meterId, value) {
        const meter = this.meters.get(meterId);
        if (!meter) return;

        meter.current = Math.max(meter.min, Math.min(meter.max, value));
        this.checkThresholds(meterId);
    },

    /**
     * Modify a meter's value by a delta
     * @param {string} meterId - The meter ID
     * @param {number} delta - Amount to add (negative to subtract)
     */
    modifyValue(meterId, delta) {
        const meter = this.meters.get(meterId);
        if (!meter || !meter.active) return;

        meter.current = Math.max(meter.min, Math.min(meter.max, meter.current + delta));
        this.checkThresholds(meterId);
    },

    /**
     * Set the drain rate for a meter
     * @param {string} meterId - The meter ID
     * @param {number} rate - New drain rate (per second)
     */
    setDrainRate(meterId, rate) {
        const meter = this.meters.get(meterId);
        if (meter) {
            meter.baseDrainRate = rate;
            this.recalculateRates(meterId);
        }
    },

    /**
     * Set the regen rate for a meter
     * @param {string} meterId - The meter ID
     * @param {number} rate - New regen rate (per second)
     */
    setRegenRate(meterId, rate) {
        const meter = this.meters.get(meterId);
        if (meter) {
            meter.baseRegenRate = rate;
            this.recalculateRates(meterId);
        }
    },

    // ========================================================================
    // MODIFIER SYSTEM
    // ========================================================================

    /**
     * Add a modifier to a meter
     * @param {string} meterId - The meter ID
     * @param {object} modifier - Modifier object
     * @returns {string} - Modifier ID
     */
    addModifier(meterId, modifier) {
        const modifiers = this.activeModifiers.get(meterId);
        if (!modifiers) return null;

        const mod = {
            id: modifier.id || `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: modifier.source || 'unknown',
            drainModifier: modifier.drainModifier || 0,    // Added to drain rate
            regenModifier: modifier.regenModifier || 0,    // Added to regen rate
            drainMultiplier: modifier.drainMultiplier ?? 1.0,  // Multiplies drain rate
            regenMultiplier: modifier.regenMultiplier ?? 1.0,  // Multiplies regen rate
            duration: modifier.duration ?? Infinity,
            timer: 0,
            active: true
        };

        modifiers.push(mod);
        this.recalculateRates(meterId);

        if (this.config.debugLogging) {
            console.log(`[EnvMeter] Added modifier to ${meterId}:`, mod);
        }

        return mod.id;
    },

    /**
     * Remove a modifier from a meter
     * @param {string} meterId - The meter ID
     * @param {string} modifierId - The modifier ID to remove
     */
    removeModifier(meterId, modifierId) {
        const modifiers = this.activeModifiers.get(meterId);
        if (!modifiers) return;

        const index = modifiers.findIndex(m => m.id === modifierId);
        if (index !== -1) {
            modifiers.splice(index, 1);
            this.recalculateRates(meterId);
        }
    },

    /**
     * Remove all modifiers from a source
     * @param {string} meterId - The meter ID
     * @param {string} source - Source identifier
     */
    removeModifiersFromSource(meterId, source) {
        const modifiers = this.activeModifiers.get(meterId);
        if (!modifiers) return;

        const filtered = modifiers.filter(m => m.source !== source);
        this.activeModifiers.set(meterId, filtered);
        this.recalculateRates(meterId);
    },

    /**
     * Recalculate effective drain/regen rates
     * @param {string} meterId - The meter ID
     */
    recalculateRates(meterId) {
        const meter = this.meters.get(meterId);
        const modifiers = this.activeModifiers.get(meterId);
        if (!meter || !modifiers) return;

        let drainRate = meter.baseDrainRate;
        let regenRate = meter.baseRegenRate;
        let drainMult = 1.0;
        let regenMult = 1.0;

        for (const mod of modifiers) {
            if (!mod.active) continue;
            drainRate += mod.drainModifier;
            regenRate += mod.regenModifier;
            drainMult *= mod.drainMultiplier;
            regenMult *= mod.regenMultiplier;
        }

        meter.currentDrainRate = drainRate * drainMult;
        meter.currentRegenRate = regenRate * regenMult;
    },

    // ========================================================================
    // THRESHOLD SYSTEM
    // ========================================================================

    /**
     * Check and apply threshold effects
     * @param {string} meterId - The meter ID
     */
    checkThresholds(meterId) {
        const meter = this.meters.get(meterId);
        if (!meter || !meter.thresholds.length) return;

        let currentThreshold = null;

        if (meter.depletionDirection === 'down') {
            // Bad when low - find lowest threshold we're at or below
            for (let i = meter.thresholds.length - 1; i >= 0; i--) {
                if (meter.current <= meter.thresholds[i].value) {
                    currentThreshold = meter.thresholds[i];
                    break;
                }
            }
        } else {
            // Bad when high - find highest threshold we're at or above
            for (let i = meter.thresholds.length - 1; i >= 0; i--) {
                if (meter.current >= meter.thresholds[i].value) {
                    currentThreshold = meter.thresholds[i];
                    break;
                }
            }
        }

        // Check if threshold changed
        if (currentThreshold !== meter.currentThreshold) {
            const previousThreshold = meter.currentThreshold;
            meter.currentThreshold = currentThreshold;

            // Show message if new threshold (and not returning to normal)
            if (currentThreshold?.message && currentThreshold.message !== meter.lastThresholdMessage) {
                addMessage(currentThreshold.message);
                meter.lastThresholdMessage = currentThreshold.message;
            }

            // Apply/remove effects
            this.applyThresholdEffect(meterId, currentThreshold?.effect, previousThreshold?.effect);
        }
    },

    /**
     * Apply threshold effects to the player
     * @param {string} meterId - The meter ID
     * @param {string} newEffect - New effect to apply
     * @param {string} oldEffect - Old effect to remove
     */
    applyThresholdEffect(meterId, newEffect, oldEffect) {
        if (!game.player) return;

        // Remove old effect
        if (oldEffect && oldEffect !== newEffect) {
            this.removeThresholdEffect(oldEffect);
        }

        // Apply new effect
        if (newEffect) {
            switch (newEffect) {
                case 'move_slow_10':
                    game.player.environmentalSpeedMod = 0.9;
                    break;
                case 'move_slow_25':
                    game.player.environmentalSpeedMod = 0.75;
                    break;
                case 'freezing_dot':
                    game.player.environmentalSpeedMod = 0.5;
                    game.player.environmentalDOT = { damage: 5, interval: 1000, timer: 0, type: 'cold' };
                    break;
                case 'transform':
                    // Full transformation - game over or special state
                    addMessage("You have been consumed!");
                    game.state = 'gameover';
                    break;
                case 'bonus_damage':
                    game.player.environmentalDamageMod = 1.2;
                    break;
                case 'light_hurts':
                    game.player.lightSensitivity = true;
                    break;
                // Visual effects are handled by renderer
                case 'breath_visible':
                case 'vision_tint_red':
                case 'hallucinations_mild':
                case 'hallucinations_severe':
                case 'void_whispers':
                case 'void_sight':
                case 'void_form':
                    game.player.visualEffect = newEffect;
                    break;
            }
        }
    },

    /**
     * Remove a threshold effect
     * @param {string} effect - The effect to remove
     */
    removeThresholdEffect(effect) {
        if (!game.player) return;

        switch (effect) {
            case 'move_slow_10':
            case 'move_slow_25':
            case 'freezing_dot':
                game.player.environmentalSpeedMod = 1.0;
                game.player.environmentalDOT = null;
                break;
            case 'bonus_damage':
                game.player.environmentalDamageMod = 1.0;
                break;
            case 'light_hurts':
                game.player.lightSensitivity = false;
                break;
            case 'breath_visible':
            case 'vision_tint_red':
            case 'hallucinations_mild':
            case 'hallucinations_severe':
            case 'void_whispers':
            case 'void_sight':
            case 'void_form':
                game.player.visualEffect = null;
                break;
        }
    },

    // ========================================================================
    // UPDATE & LIFECYCLE
    // ========================================================================

    /**
     * Update all meters
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        const dtSeconds = dt / 1000;

        this.meters.forEach((meter, meterId) => {
            if (!meter.active) return;

            // Update modifier timers
            const modifiers = this.activeModifiers.get(meterId);
            if (modifiers) {
                let needsRecalc = false;
                for (let i = modifiers.length - 1; i >= 0; i--) {
                    const mod = modifiers[i];
                    if (mod.duration !== Infinity) {
                        mod.timer += dt;
                        if (mod.timer >= mod.duration) {
                            modifiers.splice(i, 1);
                            needsRecalc = true;
                        }
                    }
                }
                if (needsRecalc) {
                    this.recalculateRates(meterId);
                }
            }

            // Apply drain/regen
            const netRate = meter.currentRegenRate - meter.currentDrainRate;
            if (netRate !== 0) {
                meter.current = Math.max(meter.min, Math.min(meter.max, meter.current + netRate * dtSeconds));
                this.checkThresholds(meterId);
            }
        });

        // Apply environmental DOT
        if (game.player?.environmentalDOT) {
            const dot = game.player.environmentalDOT;
            dot.timer += dt;
            if (dot.timer >= dot.interval) {
                dot.timer -= dot.interval;
                game.player.hp -= dot.damage;
                if (game.player.hp <= 0) {
                    game.state = 'gameover';
                }
            }
        }
    },

    /**
     * Cleanup all meters
     */
    cleanup() {
        // Remove all threshold effects
        this.meters.forEach((meter, meterId) => {
            if (meter.currentThreshold?.effect) {
                this.removeThresholdEffect(meter.currentThreshold.effect);
            }
        });

        this.meters.clear();
        this.activeModifiers.clear();

        // Reset player environmental states
        if (game.player) {
            game.player.environmentalSpeedMod = 1.0;
            game.player.environmentalDamageMod = 1.0;
            game.player.environmentalDOT = null;
            game.player.lightSensitivity = false;
            game.player.visualEffect = null;
        }

        if (this.config.debugLogging) {
            console.log('[EnvMeter] System cleaned up');
        }
    },

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    /**
     * Get all active meters for UI rendering
     * @returns {Array}
     */
    getVisibleMeters() {
        const result = [];
        this.meters.forEach((meter, id) => {
            if (meter.visible && meter.active) {
                result.push({ id, ...meter });
            }
        });
        return result;
    },

    /**
     * Check if a meter is in critical state
     * @param {string} meterId - The meter ID
     * @returns {boolean}
     */
    isCritical(meterId) {
        const meter = this.meters.get(meterId);
        if (!meter) return false;

        if (meter.depletionDirection === 'down') {
            return meter.current <= meter.max * 0.15;
        } else {
            return meter.current >= meter.max * 0.85;
        }
    },

    /**
     * Check if a meter is in warning state
     * @param {string} meterId - The meter ID
     * @returns {boolean}
     */
    isWarning(meterId) {
        const meter = this.meters.get(meterId);
        if (!meter) return false;

        if (meter.depletionDirection === 'down') {
            return meter.current <= meter.max * 0.3;
        } else {
            return meter.current >= meter.max * 0.7;
        }
    },

    // ========================================================================
    // DEBUG
    // ========================================================================

    getStatus() {
        const status = {};
        this.meters.forEach((meter, id) => {
            status[id] = {
                current: meter.current.toFixed(1),
                max: meter.max,
                drainRate: meter.currentDrainRate.toFixed(2),
                regenRate: meter.currentRegenRate.toFixed(2),
                threshold: meter.currentThreshold?.effect || 'none',
                modifiers: (this.activeModifiers.get(id) || []).length
            };
        });
        return status;
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const EnvironmentalMeterSystemDef = {
    name: 'environmental-meter-system',

    init() {
        if (EnvironmentalMeterSystem.config.debugLogging) {
            console.log('[EnvMeter] System initialized');
        }
    },

    update(dt) {
        EnvironmentalMeterSystem.update(dt);
    },

    cleanup() {
        EnvironmentalMeterSystem.cleanup();
    }
};

// Register with SystemManager (priority 37 - after dynamic tiles)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('environmental-meter-system', EnvironmentalMeterSystemDef, 37);
} else {
    console.warn('[EnvMeter] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================
window.EnvironmentalMeterSystem = EnvironmentalMeterSystem;

console.log('✅ Environmental Meter System loaded');
