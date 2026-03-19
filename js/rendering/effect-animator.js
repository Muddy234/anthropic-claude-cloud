// ============================================================================
// EFFECT ANIMATOR - Animation State Management for Attack Effects
// ============================================================================
// Manages animation state for all active effects in the game.
// Tracks frame progress, phase transitions, and provides current frame data.
// ============================================================================

const EffectAnimator = {
    // Active effect animations (effectId -> state)
    activeEffects: new Map(),

    // Counter for generating unique effect IDs
    nextEffectId: 1,

    // ========================================================================
    // EFFECT LIFECYCLE
    // ========================================================================

    /**
     * Start a new effect animation
     * @param {string} effectType - Name of the effect (e.g., 'claw_swipe')
     * @param {Object} options - Effect options
     * @returns {number} Effect ID for tracking
     */
    startEffect(effectType, options = {}) {
        const animation = EffectAnimations ? EffectAnimations.get(effectType) : null;
        const sprite = EffectSprites ? EffectSprites.get(effectType) : null;

        if (!animation || !sprite) {
            return null;
        }

        const effectId = this.nextEffectId++;

        // Get sprite frame count for frame-based animation
        const spriteFrameCount = EffectSprites.getFrameCount(effectType) || 1;

        // Calculate how long each sprite frame should display
        // Distribute sprite frames across the total animation duration
        const totalAnimDuration = animation.totalDuration || 500;
        const spriteFrameDuration = totalAnimDuration / spriteFrameCount;

        const state = {
            id: effectId,
            type: effectType,
            animation: animation,
            sprite: sprite,

            // Position & target
            x: options.x || 0,
            y: options.y || 0,
            targetX: options.targetX,
            targetY: options.targetY,
            sourceX: options.sourceX,
            sourceY: options.sourceY,

            // Animation state (transform animation)
            phase: this._getFirstPhase(animation),
            phaseIndex: 0,
            frameIndex: 0,
            frameTimer: 0,
            totalTime: 0,
            finished: false,
            looping: animation.looping || false,

            // Sprite frame state (pixel art frame cycling)
            spriteFrameIndex: 0,
            spriteFrameTimer: 0,
            spriteFrameCount: spriteFrameCount,
            spriteFrameDuration: spriteFrameDuration,

            // Optional overrides
            rotation: options.rotation || 0,
            scale: options.scale || 1.0,
            flipX: options.flipX || false,
            flipY: options.flipY || false,
            element: options.element || null,
            speed: options.speed || 1.0,

            // Callbacks
            onPhaseChange: options.onPhaseChange || null,
            onComplete: options.onComplete || null,
            onFrame: options.onFrame || null,

            // For projectiles: movement
            moving: options.moving || false,
            velocity: options.velocity || { x: 0, y: 0 },

            // Event-driven telegraph resolution tracking
            enemyId: options.enemyId || null,
            config: options.config || null,

            // Phase timing for sustained abilities (telegraph → channel → fading → done)
            phaseTimer: 0,
            maxTimer: 0,

            // Tracking beam support (e.g., void_beam)
            // If tracking is enabled, beam will continuously update direction toward player during channel
            tracking: options.tracking || false,
            trackingSpeed: options.config?.channel?.trackingSpeed || 0  // degrees per second
        };

        this.activeEffects.set(effectId, state);
        return effectId;
    },

    /**
     * Stop and remove an effect
     */
    stopEffect(effectId) {
        const state = this.activeEffects.get(effectId);
        if (state && state.onComplete) {
            state.onComplete(state);
        }
        this.activeEffects.delete(effectId);
    },

    /**
     * Force transition to a specific phase
     */
    setPhase(effectId, phaseName) {
        const state = this.activeEffects.get(effectId);
        if (!state) return;

        const phases = state.animation.phases;
        if (!phases[phaseName]) return;

        state.phase = phaseName;
        state.frameIndex = 0;
        state.frameTimer = 0;

        if (state.onPhaseChange) {
            state.onPhaseChange(state, phaseName);
        }
    },

    /**
     * Check if an effect exists and is active
     */
    isActive(effectId) {
        return this.activeEffects.has(effectId) && !this.activeEffects.get(effectId).finished;
    },

    /**
     * Called by ability system at exact moment damage is dealt
     * Transitions telegraph → impact/channel
     * @param {number} effectId - The effect ID to resolve
     */
    resolve(effectId) {
        const state = this.activeEffects.get(effectId);
        if (!state) return;

        // Get ability config to determine if it has channel phase
        const config = state.config || {};

        if (config.channel) {
            state.phase = 'channel';
            state.phaseTimer = config.channel.duration || 1500;
            state.maxTimer = state.phaseTimer;
        } else {
            state.phase = 'impact';
            state.phaseTimer = config.impact?.duration || 200;
            state.maxTimer = state.phaseTimer;
        }

        // Reset frame state for new phase
        state.frameIndex = 0;
        state.frameTimer = 0;

        if (state.onPhaseChange) {
            state.onPhaseChange(state, state.phase);
        }
    },

    /**
     * Cancel all effects for an enemy (when they die)
     * Exception: Projectiles with persistsAfterCasterDeath survive
     * @param {string|number} enemyId - The enemy ID
     */
    cancelByEnemy(enemyId) {
        for (const [effectId, state] of this.activeEffects) {
            if (state.enemyId === enemyId) {
                // Check if this is a projectile that should persist
                const config = state.config || {};
                if (config.projectile?.persistsAfterCasterDeath) {
                    // Clear enemyId so future calls don't affect it
                    state.enemyId = null;
                    continue;
                }
                // Remove the effect
                this.activeEffects.delete(effectId);
            }
        }
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    /**
     * Update all active effect animations
     * @param {number} deltaTime - Time since last update (ms)
     */
    update(deltaTime) {
        const toRemove = [];

        for (const [effectId, state] of this.activeEffects) {
            this._updateEffect(state, deltaTime);

            if (state.finished) {
                toRemove.push(effectId);
            }
        }

        // Clean up finished effects
        for (const id of toRemove) {
            const state = this.activeEffects.get(id);
            if (state && state.onComplete) {
                state.onComplete(state);
            }
            this.activeEffects.delete(id);
        }
    },

    /**
     * Update a single effect's animation state
     */
    _updateEffect(state, deltaTime) {
        const adjustedDelta = deltaTime * state.speed;
        state.totalTime += adjustedDelta;
        state.frameTimer += adjustedDelta;

        // Update sprite frame cycling (independent of transform animation)
        state.spriteFrameTimer += adjustedDelta;
        while (state.spriteFrameTimer >= state.spriteFrameDuration) {
            state.spriteFrameTimer -= state.spriteFrameDuration;
            state.spriteFrameIndex++;

            // Wrap around or stay at last frame based on looping
            if (state.spriteFrameIndex >= state.spriteFrameCount) {
                if (state.looping) {
                    state.spriteFrameIndex = 0;
                } else {
                    // Stay on last frame when not looping
                    state.spriteFrameIndex = state.spriteFrameCount - 1;
                }
            }
        }

        // Handle timer-based phases (channel, fading) set by resolve()
        if (state.phaseTimer > 0) {
            state.phaseTimer -= adjustedDelta;

            if (state.phaseTimer <= 0) {
                // Timer expired, advance to next phase
                if (state.phase === 'channel') {
                    // Channel → fading (for lingering effects like poison_cloud)
                    const config = state.config || {};
                    const lingerDuration = config.channel?.linger;

                    if (lingerDuration && lingerDuration > 0) {
                        // Transition to fading phase with linger duration
                        state.phase = 'fading';
                        state.phaseTimer = lingerDuration;
                        state.maxTimer = lingerDuration;
                        state.frameIndex = 0;
                        state.frameTimer = 0;

                        // Create lingering hazard zone for poison clouds
                        if (typeof LingeringHazards !== 'undefined' && config.particles?.type === 'poison') {
                            const telegraph = config.telegraph || {};
                            LingeringHazards.createPoisonCloud(
                                state.x,
                                state.y,
                                state.rotation * Math.PI / 180, // direction in radians
                                telegraph.angle || Math.PI / 2,
                                telegraph.radius || 3.0,
                                lingerDuration,
                                config.statusEffect?.damage || 5, // damage per tick
                                400 // tick interval ms
                            );
                        }

                        if (state.onPhaseChange) {
                            state.onPhaseChange(state, 'fading');
                        }
                    } else if (config.fading) {
                        state.phase = 'fading';
                        state.phaseTimer = config.fading.duration || 300;
                        state.maxTimer = state.phaseTimer;
                        state.frameIndex = 0;
                        state.frameTimer = 0;
                        if (state.onPhaseChange) {
                            state.onPhaseChange(state, 'fading');
                        }
                    } else {
                        state.finished = true;
                        return;
                    }
                } else if (state.phase === 'fading' || state.phase === 'impact') {
                    // Fading/impact → done
                    state.finished = true;
                    return;
                }
            }
            // Continue with frame-based animation within the timed phase
        }

        // Spawn cone particles during channel phase for breath attacks
        if (state.phase === 'channel' && state.config?.particles?.spawnMode === 'cone_fill') {
            // Initialize particle timer if not set
            state.particleTimer = (state.particleTimer || 0) + deltaTime;

            // Spawn every ~50ms
            if (state.particleTimer >= 50) {
                state.particleTimer = 0;

                if (typeof spawnConeParticles === 'function') {
                    // Get cone parameters from config
                    const telegraph = state.config.telegraph || {};
                    const particles = state.config.particles || {};

                    // Use locked direction from effect state, or calculate from source/target
                    let direction = state.rotation * Math.PI / 180;  // rotation is in degrees
                    if (state.sourceX !== undefined && state.targetX !== undefined) {
                        direction = Math.atan2(state.targetY - state.sourceY, state.targetX - state.sourceX);
                    }

                    spawnConeParticles(
                        state.x,
                        state.y,
                        direction,
                        telegraph.angle || Math.PI / 3,  // Default 60 degrees
                        telegraph.radius || 4.0,
                        {
                            type: particles.type || 'flame',
                            color: particles.color,
                            count: particles.count || 3
                        }
                    );
                }
            }
        }

        // Update tracking beams during channel phase (e.g., void_beam)
        // Beam continuously rotates toward player position at trackingSpeed degrees/sec
        if (state.phase === 'channel' && state.tracking && state.trackingSpeed > 0) {
            // Get current player position from game state
            if (typeof game !== 'undefined' && game.player) {
                const player = game.player;
                const playerX = player.gridX;
                const playerY = player.gridY;

                // Calculate desired direction from beam source to current player position
                const desiredDirection = Math.atan2(playerY - state.y, playerX - state.x);

                // Current direction in radians
                const currentDirection = state.rotation * Math.PI / 180;

                // Calculate angle difference
                let angleDiff = desiredDirection - currentDirection;

                // Normalize to -PI to PI
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Calculate max rotation this frame (trackingSpeed is degrees/sec)
                const maxRotation = (state.trackingSpeed * Math.PI / 180) * (adjustedDelta / 1000);

                // Apply rotation, clamped to max rotation speed
                let rotationChange;
                if (Math.abs(angleDiff) <= maxRotation) {
                    rotationChange = angleDiff;
                } else {
                    rotationChange = Math.sign(angleDiff) * maxRotation;
                }

                // Update rotation (stored in degrees)
                state.rotation += rotationChange * 180 / Math.PI;

                // Update target position for rendering (beam end point)
                // Use the beam's maxRange from config
                const beamRange = state.config?.telegraph?.maxRange || 15;
                const newDirection = state.rotation * Math.PI / 180;
                state.targetX = state.x + Math.cos(newDirection) * beamRange;
                state.targetY = state.y + Math.sin(newDirection) * beamRange;
            }
        }

        // Telegraph phase waits for resolve() - do NOT auto-advance
        if (state.phase === 'telegraph') {
            // Telegraph holds indefinitely until resolve() is called
            // Still update frame animation within telegraph for visual effects
            const phases = state.animation.phases;
            const currentPhase = phases[state.phase];

            if (currentPhase && currentPhase.length > 0) {
                const currentFrame = currentPhase[state.frameIndex];
                // Loop telegraph animation frames while waiting
                while (state.frameTimer >= currentFrame.duration) {
                    state.frameTimer -= currentFrame.duration;
                    state.frameIndex++;
                    if (state.frameIndex >= currentPhase.length) {
                        // Loop back to beginning of telegraph animation
                        state.frameIndex = 0;
                    }
                }
            }
            // Update position if moving (for projectile telegraphs)
            if (state.moving && state.velocity) {
                state.x += state.velocity.x * deltaTime / 1000;
                state.y += state.velocity.y * deltaTime / 1000;
            }
            return; // Don't proceed to standard phase advancement
        }

        const phases = state.animation.phases;
        const currentPhase = phases[state.phase];

        if (!currentPhase || currentPhase.length === 0) {
            state.finished = true;
            return;
        }

        const currentFrame = currentPhase[state.frameIndex];

        // Check if frame is complete
        while (state.frameTimer >= currentFrame.duration) {
            state.frameTimer -= currentFrame.duration;
            state.frameIndex++;

            // Fire frame callback
            if (state.onFrame) {
                state.onFrame(state, state.frameIndex);
            }

            // Check if phase is complete
            if (state.frameIndex >= currentPhase.length) {
                const nextPhase = this._getNextPhase(state.animation, state.phase);

                if (nextPhase) {
                    state.phase = nextPhase;
                    state.frameIndex = 0;

                    if (state.onPhaseChange) {
                        state.onPhaseChange(state, nextPhase);
                    }
                } else if (state.looping && state.phase === 'travel') {
                    // Loop travel phase for projectiles
                    state.frameIndex = 0;
                } else {
                    state.finished = true;
                    return;
                }
            }
        }

        // Update position if moving
        if (state.moving && state.velocity) {
            state.x += state.velocity.x * deltaTime / 1000;
            state.y += state.velocity.y * deltaTime / 1000;
        }
    },

    // ========================================================================
    // FRAME DATA
    // ========================================================================

    /**
     * Get current frame data for rendering
     * @returns {Object} { sprite, transforms, state }
     */
    getCurrentFrame(effectId) {
        const state = this.activeEffects.get(effectId);
        if (!state || state.finished) {
            return null;
        }

        const phases = state.animation.phases;
        const currentPhase = phases[state.phase];

        if (!currentPhase || state.frameIndex >= currentPhase.length) {
            return null;
        }

        const frame = currentPhase[state.frameIndex];

        // Get the current sprite frame (not the whole sprite definition)
        // This returns a complete renderable object with pixels, palette, width, height
        let sprite = EffectSprites.getFrame(state.type, state.spriteFrameIndex);

        // Fallback to first frame if getFrame fails
        if (!sprite) {
            sprite = EffectSprites.getFrame(state.type, 0);
        }

        // If still no sprite, try the old format (single sprite without frames array)
        if (!sprite && state.sprite) {
            sprite = state.sprite;
        }

        if (!sprite) {
            return null;
        }

        // Apply element coloring if specified
        if (state.element && EffectRenderer) {
            sprite = EffectRenderer.createElementVariant(sprite, state.element);
        }

        return {
            sprite: sprite,
            transforms: {
                scaleX: (frame.scaleX || 1.0) * state.scale,
                scaleY: (frame.scaleY || 1.0) * state.scale,
                rotation: (frame.rotation || 0) + state.rotation,
                alpha: frame.alpha || 1.0,
                horizontalOffset: frame.horizontalOffset || 0,
                verticalOffset: frame.verticalOffset || 0,
                paletteMod: frame.paletteMod || null,
                flipX: state.flipX,
                flipY: state.flipY
            },
            position: {
                x: state.x,
                y: state.y
            },
            spriteFrameIndex: state.spriteFrameIndex,
            state: state
        };
    },

    /**
     * Get all active effects for rendering
     */
    getAllActiveEffects() {
        const effects = [];
        for (const [effectId, state] of this.activeEffects) {
            const frameData = this.getCurrentFrame(effectId);
            if (frameData) {
                effects.push({
                    id: effectId,
                    ...frameData
                });
            }
        }
        return effects;
    },

    // ========================================================================
    // CONVENIENCE METHODS
    // ========================================================================

    // ========================================================================
    // SEQUENCE EFFECTS (Multi-hit abilities like double_strike)
    // ========================================================================

    /**
     * Start a sequence effect (multiple impacts with delays)
     * Used for abilities like double_strike that perform multiple attacks
     * @param {string} abilityId - Name of the ability (e.g., 'double_strike')
     * @param {Object} options - Effect options (x, y, rotation, config, etc.)
     * @returns {Array<number>} Array of effect IDs for tracking
     */
    startSequenceEffect(abilityId, options = {}) {
        const config = options.config || (typeof ABILITY_EFFECTS !== 'undefined' ? ABILITY_EFFECTS[abilityId] : null);

        // If not a sequence ability, use normal effect
        if (!config?.sequence) {
            const effectId = this.startEffect(abilityId, options);
            return effectId ? [effectId] : [];
        }

        const sequenceEffects = [];
        const baseDirection = (options.rotation || 0) * Math.PI / 180; // Convert to radians

        for (let i = 0; i < config.sequence.length; i++) {
            const step = config.sequence[i];

            // Schedule each step with its delay
            setTimeout(() => {
                // Calculate direction adjustment for ccw vs cw
                // For ccw (counter-clockwise), we offset the start angle
                let adjustedRotation = options.rotation || 0;

                // Create step-specific config with proper sweep direction
                const stepConfig = {
                    ...config,
                    telegraph: {
                        ...config.telegraph,
                        arcAngle: step.arcAngle || config.telegraph?.arcAngle || Math.PI / 2
                    },
                    impact: {
                        ...config.impact,
                        sweepDirection: step.direction || 'cw'
                    }
                };

                const effectId = this.startEffect(abilityId, {
                    ...options,
                    rotation: adjustedRotation,
                    config: stepConfig,
                    sequenceIndex: i,
                    // Skip telegraph for subsequent hits (telegraph shows once, impacts show multiple times)
                    skipTelegraph: i > 0
                });

                if (effectId) {
                    sequenceEffects.push(effectId);
                }
            }, step.delay);
        }

        return sequenceEffects;
    },

    /**
     * Check if an ability has a sequence configuration
     * @param {string} abilityId - The ability ID to check
     * @returns {boolean} True if the ability has a sequence
     */
    isSequenceAbility(abilityId) {
        if (typeof ABILITY_EFFECTS === 'undefined') return false;
        const config = ABILITY_EFFECTS[abilityId];
        return config?.sequence && Array.isArray(config.sequence) && config.sequence.length > 1;
    },

    /**
     * Start a melee attack effect
     */
    startMeleeAttack(type, x, y, rotation = 0, options = {}) {
        return this.startEffect(type, {
            x,
            y,
            rotation,
            ...options
        });
    },

    /**
     * Start a projectile effect that travels to target
     */
    startProjectile(type, startX, startY, targetX, targetY, speed = 300, options = {}) {
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const rotation = Math.atan2(dy, dx) * 180 / Math.PI;

        // Calculate velocity
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;

        return this.startEffect(type, {
            x: startX,
            y: startY,
            targetX,
            targetY,
            rotation,
            moving: true,
            velocity: { x: vx, y: vy },
            onFrame: (state) => {
                // Check if reached target
                const distToTarget = Math.sqrt(
                    Math.pow(state.x - targetX, 2) +
                    Math.pow(state.y - targetY, 2)
                );
                if (distToTarget < 10) {
                    this.setPhase(state.id, 'impact');
                    state.moving = false;
                }
            },
            ...options
        });
    },

    /**
     * Start a breath/cone effect
     */
    startBreath(type, sourceX, sourceY, targetX, targetY, options = {}) {
        const rotation = Math.atan2(targetY - sourceY, targetX - sourceX) * 180 / Math.PI;

        return this.startEffect(type, {
            x: sourceX,
            y: sourceY,
            sourceX,
            sourceY,
            targetX,
            targetY,
            rotation,
            ...options
        });
    },

    /**
     * Start a beam effect between two points
     */
    startBeam(type, startX, startY, endX, endY, options = {}) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const rotation = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

        return this.startEffect(type, {
            x: midX,
            y: midY,
            sourceX: startX,
            sourceY: startY,
            targetX: endX,
            targetY: endY,
            rotation,
            ...options
        });
    },

    /**
     * Start an impact effect at a position
     */
    startImpact(type, x, y, options = {}) {
        return this.startEffect(type || 'impact_spark', {
            x,
            y,
            ...options
        });
    },

    // ========================================================================
    // PHASE HELPERS
    // ========================================================================

    /**
     * Get the first phase of an animation
     */
    _getFirstPhase(animation) {
        const phases = animation.phases;
        // Priority order: telegraph -> windup -> travel -> active -> impact -> recovery
        // Telegraph is the new first phase for event-driven abilities
        if (phases.telegraph) return 'telegraph';
        if (phases.windup) return 'windup';
        if (phases.travel) return 'travel';
        if (phases.active) return 'active';
        return Object.keys(phases)[0];
    },

    /**
     * Get the next phase after current
     * Note: 'telegraph' does NOT auto-advance - it waits for resolve()
     * Note: 'channel' and 'fading' are timer-based, handled in _updateEffect
     */
    _getNextPhase(animation, currentPhase) {
        const phases = animation.phases;
        // Extended order including sustained ability phases
        // telegraph is NOT included because it doesn't auto-advance (waits for resolve())
        const order = ['windup', 'active', 'recovery', 'travel', 'impact', 'channel', 'fading', 'linger'];

        const currentIdx = order.indexOf(currentPhase);
        for (let i = currentIdx + 1; i < order.length; i++) {
            if (phases[order[i]]) {
                return order[i];
            }
        }
        return null;
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Clear all active effects
     */
    clearAll() {
        this.activeEffects.clear();
    },

    /**
     * Get count of active effects
     */
    getActiveCount() {
        return this.activeEffects.size;
    },

    /**
     * Get effects by type
     */
    getEffectsByType(type) {
        const effects = [];
        for (const state of this.activeEffects.values()) {
            if (state.type === type) {
                effects.push(state);
            }
        }
        return effects;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.EffectAnimator = EffectAnimator;
}
