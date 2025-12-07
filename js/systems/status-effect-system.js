// ============================================================================
// STATUS EFFECT SYSTEM - Buffs, Debuffs, DoTs, CCs
// ============================================================================

const StatusEffectSystem = {
    // All active status effects by entity ID
    activeEffects: new Map(),
    
    // Effect definitions
    definitions: {},
    
    // Configuration
    config: {
        maxStacksDefault: 5,
        tickRate: 100,              // ms between ticks
        debugLogging: true
    },
    
    // Internal
    _lastTick: 0,
    _initialized: false,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    init() {
        this.activeEffects.clear();
        this.registerDefaultEffects();
        this._initialized = true;
        console.log('[StatusEffects] System initialized');
    },

    registerDefaultEffects() {
        // === DAMAGE OVER TIME ===
        this.registerEffect({
            id: 'burning',
            name: 'Burning',
            type: 'dot',
            element: 'fire',
            damagePerTick: 3,
            tickInterval: 1000,
            duration: 5000,
            maxStacks: 3,
            stackBehavior: 'intensity', // damage increases with stacks
            color: '#ff6b35',
            icon: '🔥',
            onApply: (entity, effect) => {
                addMessage(`${entity.name || 'You'} caught fire!`);
            },
            onTick: (entity, effect) => {
                const damagePerTick = effect.definition?.damagePerTick || 3;
                const damage = damagePerTick * (effect.stacks || 1);
                entity.hp -= damage;
                if (this.config.debugLogging) {
                    console.log(`[Burning] ${entity.name || 'Entity'} takes ${damage} fire damage`);
                }
            },
            onExpire: (entity, effect) => {
                addMessage(`${entity.name || 'You'} stopped burning.`);
            }
        });

        this.registerEffect({
            id: 'poisoned',
            name: 'Poisoned',
            type: 'dot',
            element: 'nature',
            damagePerTick: 2,
            tickInterval: 1500,
            duration: 8000,
            maxStacks: 5,
            stackBehavior: 'intensity',
            color: '#00b894',
            icon: '☠️',
            statMods: { healingReceived: -0.50 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} were poisoned!`),
            onTick: (entity, effect) => {
                const damagePerTick = effect.definition?.damagePerTick || 2;
                entity.hp -= damagePerTick * (effect.stacks || 1);
            },
            onExpire: (entity) => addMessage(`${entity.name || 'You'} recovered from poison.`)
        });

        this.registerEffect({
            id: 'bleeding',
            name: 'Bleeding',
            type: 'dot',
            element: 'physical',
            damagePerTick: 4,
            tickInterval: 1000,
            duration: 6000,
            maxStacks: 3,
            stackBehavior: 'intensity',
            color: '#e74c3c',
            icon: '🩸',
            onApply: (entity) => addMessage(`${entity.name || 'You'} started bleeding!`),
            onTick: (entity, effect) => {
                const damagePerTick = effect.definition?.damagePerTick || 4;
                entity.hp -= damagePerTick * (effect.stacks || 1);
            }
        });

        this.registerEffect({
            id: 'withered',
            name: 'Withered',
            type: 'dot',
            element: 'death',
            damagePerTick: 2,
            tickInterval: 2000,
            duration: 10000,
            maxStacks: 1,
            color: '#636e72',
            icon: '💀',
            statMods: { maxHp: -0.20 },
            onApply: (entity, effect) => {
                effect.originalMaxHp = entity.maxHp;
                entity.maxHp = Math.floor(entity.maxHp * 0.80);
                if (entity.hp > entity.maxHp) entity.hp = entity.maxHp;
                addMessage(`${entity.name || 'You'} feel withered...`);
            },
            onExpire: (entity, effect) => {
                entity.maxHp = effect.originalMaxHp || entity.maxHp;
                addMessage(`${entity.name || 'Your'} vitality returns.`);
            }
        });

        // === CROWD CONTROL ===
        this.registerEffect({
            id: 'stunned',
            name: 'Stunned',
            type: 'cc',
            ccType: 'stun',
            duration: 2000,
            maxStacks: 1,
            stackBehavior: 'refresh',
            color: '#f1c40f',
            icon: '⭐',
            preventsAction: true,
            preventsMovement: true,
            onApply: (entity) => {
                entity.isStunned = true;
                addMessage(`${entity.name || 'You'} were stunned!`);
            },
            onExpire: (entity) => {
                entity.isStunned = false;
                addMessage(`${entity.name || 'You'} recovered from stun.`);
            }
        });

        this.registerEffect({
            id: 'frozen',
            name: 'Frozen',
            type: 'cc',
            ccType: 'stun',
            element: 'ice',
            duration: 3000,
            maxStacks: 1,
            color: '#74b9ff',
            icon: '❄️',
            preventsAction: true,
            preventsMovement: true,
            onApply: (entity) => {
                entity.isFrozen = true;
                addMessage(`${entity.name || 'You'} were frozen solid!`);
            },
            onExpire: (entity) => {
                entity.isFrozen = false;
                addMessage(`${entity.name || 'You'} thawed out.`);
            }
        });

        this.registerEffect({
            id: 'rooted',
            name: 'Rooted',
            type: 'cc',
            ccType: 'root',
            element: 'nature',
            duration: 4000,
            maxStacks: 1,
            color: '#27ae60',
            icon: '🌿',
            preventsMovement: true,
            onApply: (entity) => {
                entity.isRooted = true;
                addMessage(`${entity.name || 'You'} were rooted in place!`);
            },
            onExpire: (entity) => {
                entity.isRooted = false;
            }
        });

        this.registerEffect({
            id: 'silenced',
            name: 'Silenced',
            type: 'cc',
            ccType: 'silence',
            element: 'arcane',
            duration: 5000,
            maxStacks: 1,
            color: '#9b59b6',
            icon: '🔇',
            preventsAbilities: true,
            onApply: (entity) => {
                entity.isSilenced = true;
                addMessage(`${entity.name || 'You'} were silenced!`);
            },
            onExpire: (entity) => {
                entity.isSilenced = false;
            }
        });

        // === DEBUFFS ===
        this.registerEffect({
            id: 'chilled',
            name: 'Chilled',
            type: 'debuff',
            element: 'ice',
            duration: 4000,
            maxStacks: 3,
            stackBehavior: 'intensity',
            color: '#74b9ff',
            icon: '🥶',
            statMods: { moveSpeed: -0.10, attackSpeed: -0.10 }, // per stack
            onApply: (entity, effect) => {
                addMessage(`${entity.name || 'You'} feel the cold...`);
            }
        });

        this.registerEffect({
            id: 'weakened',
            name: 'Weakened',
            type: 'debuff',
            duration: 6000,
            maxStacks: 1,
            color: '#95a5a6',
            icon: '💔',
            statMods: { damage: -0.25 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} feel weakened...`)
        });

        this.registerEffect({
            id: 'vulnerable',
            name: 'Vulnerable',
            type: 'debuff',
            duration: 5000,
            maxStacks: 1,
            color: '#e74c3c',
            icon: '🎯',
            statMods: { damageTaken: 0.25 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} became vulnerable!`)
        });

        this.registerEffect({
            id: 'blinded',
            name: 'Blinded',
            type: 'debuff',
            element: 'dark',
            duration: 4000,
            maxStacks: 1,
            color: '#2d3436',
            icon: '👁️',
            statMods: { accuracy: -0.30, visionRange: -3 },
            onApply: (entity, effect) => {
                effect.originalVision = entity.visionRange || 8;
                entity.visionRange = Math.max(1, (entity.visionRange || 8) - 3);
                addMessage(`${entity.name || 'You'} were blinded!`);
            },
            onExpire: (entity, effect) => {
                entity.visionRange = effect.originalVision || 8;
            }
        });

        this.registerEffect({
            id: 'disrupted',
            name: 'Disrupted',
            type: 'debuff',
            element: 'arcane',
            duration: 5000,
            maxStacks: 1,
            color: '#a855f7',
            icon: '⚡',
            statMods: { cooldownRate: -0.50 },
            onApply: (entity) => addMessage(`${entity.name || 'Your'} magic is disrupted!`)
        });

        // === BUFFS ===
        this.registerEffect({
            id: 'regenerating',
            name: 'Regenerating',
            type: 'buff',
            healPerTick: 3,
            tickInterval: 1000,
            duration: 10000,
            maxStacks: 1,
            color: '#2ecc71',
            icon: '💚',
            onTick: (entity, effect) => {
                const heal = Math.min(effect.healPerTick, entity.maxHp - entity.hp);
                entity.hp += heal;
            }
        });

        this.registerEffect({
            id: 'strengthened',
            name: 'Strengthened',
            type: 'buff',
            duration: 8000,
            maxStacks: 1,
            color: '#e74c3c',
            icon: '💪',
            statMods: { damage: 0.25 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} feel stronger!`)
        });

        this.registerEffect({
            id: 'hastened',
            name: 'Hastened',
            type: 'buff',
            duration: 6000,
            maxStacks: 1,
            color: '#f39c12',
            icon: '⚡',
            statMods: { moveSpeed: 0.30, attackSpeed: 0.20 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} feel faster!`)
        });

        this.registerEffect({
            id: 'shielded',
            name: 'Shielded',
            type: 'buff',
            duration: 8000,
            maxStacks: 1,
            color: '#3498db',
            icon: '🛡️',
            statMods: { damageTaken: -0.30 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} gained a shield!`)
        });

        this.registerEffect({
            id: 'invisible',
            name: 'Invisible',
            type: 'buff',
            duration: 10000,
            maxStacks: 1,
            color: '#bdc3c7',
            icon: '👻',
            breaksOnAction: true,
            onApply: (entity) => {
                entity.isInvisible = true;
                addMessage(`${entity.name || 'You'} vanished from sight!`);
            },
            onExpire: (entity) => {
                entity.isInvisible = false;
                addMessage(`${entity.name || 'You'} became visible again.`);
            }
        });

        this.registerEffect({
            id: 'sanctified',
            name: 'Sanctified',
            type: 'buff',
            element: 'holy',
            duration: 8000,
            maxStacks: 1,
            color: '#fdcb6e',
            icon: '✨',
            statMods: { damageVsUndead: 0.50 },
            onApply: (entity) => addMessage(`${entity.name || 'You'} were blessed!`)
        });

        console.log(`[StatusEffects] Registered ${Object.keys(this.definitions).length} effects`);
    },

    // ========================================================================
    // EFFECT REGISTRATION
    // ========================================================================

    registerEffect(definition) {
        this.definitions[definition.id] = {
            ...definition,
            tickInterval: definition.tickInterval || 1000,
            maxStacks: definition.maxStacks || 1,
            stackBehavior: definition.stackBehavior || 'refresh'
        };
    },

    // ========================================================================
    // APPLY / REMOVE EFFECTS
    // ========================================================================

    applyEffect(entity, effectId, source = null, options = {}) {
        if (!entity || !effectId) return false;
        
        const definition = this.definitions[effectId];
        if (!definition) {
            console.warn(`[StatusEffects] Unknown effect: ${effectId}`);
            return false;
        }

        const entityId = this.getEntityId(entity);
        if (!this.activeEffects.has(entityId)) {
            this.activeEffects.set(entityId, []);
        }

        const effects = this.activeEffects.get(entityId);
        const existing = effects.find(e => e.id === effectId);

        if (existing) {
            // Handle stacking
            switch (definition.stackBehavior) {
                case 'refresh':
                    existing.remainingDuration = options.duration || definition.duration;
                    break;
                case 'intensity':
                    if (existing.stacks < definition.maxStacks) {
                        existing.stacks++;
                    }
                    existing.remainingDuration = options.duration || definition.duration;
                    break;
                case 'duration':
                    existing.remainingDuration += options.duration || definition.duration;
                    break;
                case 'none':
                    return false; // Can't reapply
            }
            
            if (this.config.debugLogging) {
                console.log(`[StatusEffects] Refreshed ${effectId} on ${entity.name || 'entity'} (${existing.stacks} stacks)`);
            }
        } else {
            // New effect
            const effect = {
                id: effectId,
                definition: definition,
                source: source,
                stacks: 1,
                remainingDuration: options.duration || definition.duration,
                tickTimer: 0,
                data: {} // For effect-specific data
            };

            effects.push(effect);

            // Call onApply
            if (definition.onApply) {
                definition.onApply(entity, effect);
            }

            if (this.config.debugLogging) {
                console.log(`[StatusEffects] Applied ${effectId} to ${entity.name || 'entity'}`);
            }
        }

        return true;
    },

    removeEffect(entity, effectId) {
        if (!entity || !effectId) return false;

        const entityId = this.getEntityId(entity);
        const effects = this.activeEffects.get(entityId);
        if (!effects) return false;

        const index = effects.findIndex(e => e.id === effectId);
        if (index === -1) return false;

        const effect = effects[index];
        
        // Call onExpire
        if (effect.definition.onExpire) {
            effect.definition.onExpire(entity, effect);
        }

        effects.splice(index, 1);

        if (this.config.debugLogging) {
            console.log(`[StatusEffects] Removed ${effectId} from ${entity.name || 'entity'}`);
        }

        return true;
    },

    removeAllEffects(entity) {
        const entityId = this.getEntityId(entity);
        const effects = this.activeEffects.get(entityId);
        if (!effects) return;

        // Call onExpire for all
        for (const effect of effects) {
            if (effect.definition.onExpire) {
                effect.definition.onExpire(entity, effect);
            }
        }

        this.activeEffects.delete(entityId);
    },

    clearEffectsByType(entity, type) {
        const entityId = this.getEntityId(entity);
        const effects = this.activeEffects.get(entityId);
        if (!effects) return;

        const toRemove = effects.filter(e => e.definition.type === type);
        for (const effect of toRemove) {
            this.removeEffect(entity, effect.id);
        }
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    update(deltaTime) {
        if (!this._initialized) return;

        const now = performance.now();
        const dt = deltaTime; // ms

        // Update all entities
        for (const [entityId, effects] of this.activeEffects) {
            const entity = this.getEntityById(entityId);
            if (!entity) {
                this.activeEffects.delete(entityId);
                continue;
            }

            // Process effects in reverse (safe removal)
            for (let i = effects.length - 1; i >= 0; i--) {
                const effect = effects[i];
                const def = effect.definition;

                // Update duration
                effect.remainingDuration -= dt;

                // Tick effects (DoTs, HoTs)
                if (def.onTick) {
                    effect.tickTimer += dt;
                    if (effect.tickTimer >= def.tickInterval) {
                        effect.tickTimer -= def.tickInterval;
                        def.onTick(entity, effect);

                        // Check for death
                        if (entity.hp <= 0 && typeof handleDeath === 'function') {
                            handleDeath(entity, effect.source);
                        }
                    }
                }

                // Check expiration
                if (effect.remainingDuration <= 0) {
                    if (def.onExpire) {
                        def.onExpire(entity, effect);
                    }
                    effects.splice(i, 1);
                    
                    if (this.config.debugLogging) {
                        console.log(`[StatusEffects] ${effect.id} expired on ${entity.name || 'entity'}`);
                    }
                }
            }
        }
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    hasEffect(entity, effectId) {
        const entityId = this.getEntityId(entity);
        const effects = this.activeEffects.get(entityId);
        return effects ? effects.some(e => e.id === effectId) : false;
    },

    getEffect(entity, effectId) {
        const entityId = this.getEntityId(entity);
        const effects = this.activeEffects.get(entityId);
        return effects ? effects.find(e => e.id === effectId) : null;
    },

    getEffects(entity) {
        const entityId = this.getEntityId(entity);
        return this.activeEffects.get(entityId) || [];
    },

    getEffectsByType(entity, type) {
        return this.getEffects(entity).filter(e => e.definition.type === type);
    },

    isCC(entity) {
        const effects = this.getEffects(entity);
        return effects.some(e => e.definition.preventsAction || e.definition.preventsMovement);
    },

    canAct(entity) {
        const effects = this.getEffects(entity);
        return !effects.some(e => e.definition.preventsAction);
    },

    canMove(entity) {
        const effects = this.getEffects(entity);
        return !effects.some(e => e.definition.preventsMovement);
    },

    canUseAbilities(entity) {
        const effects = this.getEffects(entity);
        return !effects.some(e => e.definition.preventsAbilities);
    },

    // ========================================================================
    // STAT MODIFIERS
    // ========================================================================

    getStatModifier(entity, stat) {
        let modifier = 0;
        const effects = this.getEffects(entity);

        for (const effect of effects) {
            const mods = effect.definition.statMods;
            if (mods && mods[stat] !== undefined) {
                const stackMult = effect.definition.stackBehavior === 'intensity' ? effect.stacks : 1;
                modifier += mods[stat] * stackMult;
            }
        }

        return modifier;
    },

    // ========================================================================
    // HELPERS
    // ========================================================================

    getEntityId(entity) {
        return entity.id || entity.name || `entity_${entity.gridX}_${entity.gridY}`;
    },

    getEntityById(entityId) {
        // Check player
        if (game.player && this.getEntityId(game.player) === entityId) {
            return game.player;
        }
        
        // Check enemies
        if (game.enemies) {
            for (const enemy of game.enemies) {
                if (this.getEntityId(enemy) === entityId) {
                    return enemy;
                }
            }
        }
        
        return null;
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    cleanup() {
        this.activeEffects.clear();
    }
};

// ============================================================================
// HELPER FUNCTIONS (Global)
// ============================================================================

function applyStatusEffect(entity, effectId, source = null) {
    return StatusEffectSystem.applyEffect(entity, effectId, source);
}

function removeStatusEffect(entity, effectId) {
    return StatusEffectSystem.removeEffect(entity, effectId);
}

function hasStatusEffect(entity, effectId) {
    return StatusEffectSystem.hasEffect(entity, effectId);
}

function isEntityCC(entity) {
    return StatusEffectSystem.isCC(entity);
}

function canEntityAct(entity) {
    // Check for stagger (from combat enhancements)
    if (typeof isEnemyStaggered === 'function' && isEnemyStaggered(entity)) {
        return false;
    }
    return StatusEffectSystem.canAct(entity);
}

function canEntityMove(entity) {
    // Check for stagger (from combat enhancements)
    if (typeof isEnemyStaggered === 'function' && isEnemyStaggered(entity)) {
        return false;
    }
    return StatusEffectSystem.canMove(entity);
}

function getStatusEffects(entity) {
    return StatusEffectSystem.getEffects(entity);
}

function clearStatusEffects(entity) {
    StatusEffectSystem.removeAllEffects(entity);
}

// Stub for addMessage if not defined
if (typeof addMessage !== 'function') {
    window.addMessage = (msg) => console.log(`[Message] ${msg}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.StatusEffectSystem = StatusEffectSystem;
window.applyStatusEffect = applyStatusEffect;
window.removeStatusEffect = removeStatusEffect;
window.hasStatusEffect = hasStatusEffect;
window.isEntityCC = isEntityCC;
window.canEntityAct = canEntityAct;
window.canEntityMove = canEntityMove;
window.getStatusEffects = getStatusEffects;
window.clearStatusEffects = clearStatusEffects;

console.log('[StatusEffectSystem] Loaded');