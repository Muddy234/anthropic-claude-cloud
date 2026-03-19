// ============================================================================
// SPELL SYSTEM - The Shifting Chasm
// ============================================================================
// Manages player spell selection and execution from loadout
// Provides Dash, Heal, and Shield options bound to spacebar
// ============================================================================

/**
 * SPELL SYSTEM DESIGN
 * ===================
 *
 * Purpose: Allow players to choose one of three spells before each run
 *
 * Spells:
 * - Dash: Existing dodge roll with i-frames (delegates to DodgeSystem)
 * - Heal: Restore 75 HP instantly, 3 minute cooldown
 * - Shield: Block damage equal to 50% max HP, 3 minute cooldown
 *
 * Integration:
 * - Loadout UI allows spell selection before run
 * - Input handler routes spacebar to SpellSystem.tryActivate()
 * - Combat system checks for active shield before applying damage
 */

const SPELL_CONFIG = {
    // Heal spell settings
    healPercent: 0.35,             // 35% of max HP restoration
    healCooldown: 35,              // 35 seconds cooldown

    // Shield spell settings
    shieldPercent: 0.5,            // 50% of max HP as shield
    shieldDuration: 10,            // Shield lasts 10 seconds if not broken
    shieldCooldown: 40,            // 40 seconds cooldown

    // Visual/Audio
    soundEnabled: true,
    soundVolume: 0.6
};

const SPELL_DEFINITIONS = {
    dash: {
        id: 'dash',
        name: 'Dash',
        description: 'Quick dodge roll with invincibility frames',
        icon: 'dash',
        cooldown: 1.0,             // Uses DodgeSystem's cooldown
        staminaCost: 15,
        usesStamina: true,
        usesDodgeSystem: true
    },
    heal: {
        id: 'heal',
        name: 'Heal',
        description: 'Restore 35% of max HP instantly',
        icon: 'heal',
        cooldown: SPELL_CONFIG.healCooldown,
        staminaCost: 0,
        usesStamina: false,
        usesDodgeSystem: false,
        healPercent: SPELL_CONFIG.healPercent
    },
    shield: {
        id: 'shield',
        name: 'Shield',
        description: 'Block damage equal to half your max HP',
        icon: 'shield',
        cooldown: SPELL_CONFIG.shieldCooldown,
        staminaCost: 0,
        usesStamina: false,
        usesDodgeSystem: false,
        shieldPercent: SPELL_CONFIG.shieldPercent,
        shieldDuration: SPELL_CONFIG.shieldDuration
    },

    // Wave 2 spells
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        description: 'Launch a blazing projectile that deals fire damage on impact.',
        icon: 'fireball',
        cooldown: 12,
        staminaCost: 20,
        usesStamina: true,
        usesDodgeSystem: false,
        damage: 35,
        element: 'fire',
        projectileSpeed: 8,   // tiles per second
        aoeRadius: 0,         // single target by default, boon can add splash
        maxRange: 10
    },
    frost_nova: {
        id: 'frost_nova',
        name: 'Frost Nova',
        description: 'Release a ring of ice that damages and slows nearby enemies.',
        icon: 'frost_nova',
        cooldown: 18,
        staminaCost: 25,
        usesStamina: true,
        usesDodgeSystem: false,
        damage: 20,
        element: 'ice',
        radius: 3,             // tiles
        slowDuration: 3,       // seconds
        slowAmount: 0.5        // 50% slow
    },
    blink: {
        id: 'blink',
        name: 'Blink',
        description: 'Teleport a short distance in the direction you are facing.',
        icon: 'blink',
        cooldown: 8,
        staminaCost: 15,
        usesStamina: true,
        usesDodgeSystem: false,
        distance: 5            // tiles
    }
};

/**
 * Spell System Singleton
 * Manages spell selection and execution
 */
const SpellSystem = {
    name: 'spell-system',
    initialized: false,

    // Spell definitions reference
    spells: SPELL_DEFINITIONS,

    // Per-spell cooldown tracking: { spellId: remainingSeconds }
    cooldowns: {},

    // State tracking (legacy compatibility + shield)
    state: {
        selectedSpell: 'dash',        // Current spell ID (legacy - spacebar spell)
        cooldownRemaining: 0,         // Legacy cooldown for spacebar spell
        maxCooldown: 1.0,             // Max cooldown for current spell
        activeShield: null            // { amount, maxAmount, timer } or null
    },

    /**
     * Initialize the spell system
     */
    init() {
        if (this.initialized) return;

        this.resetState();
        this.initialized = true;
        console.log('[SpellSystem] Initialized');
    },

    /**
     * Reset spell state (e.g., on new run)
     */
    resetState() {
        this.state = {
            selectedSpell: 'dash',
            cooldownRemaining: 0,
            maxCooldown: 1.0,
            activeShield: null
        };
        // Reset all per-spell cooldowns
        this.cooldowns = {};
        // Initialize default spell loadout on the player if available
        if (typeof game !== 'undefined' && game.player) {
            if (!game.player.spellSlots) {
                game.player.spellSlots = ['heal', 'shield', 'fireball', 'frost_nova'];
            }
        }
    },

    /**
     * Ensure player has spell slots initialized
     */
    _ensureSpellSlots() {
        if (typeof game !== 'undefined' && game.player && !game.player.spellSlots) {
            game.player.spellSlots = ['heal', 'shield', 'fireball', 'frost_nova'];
        }
    },

    /**
     * Select a spell for the spacebar slot (legacy)
     * @param {string} spellId - Spell ID to select
     */
    selectSpell(spellId) {
        if (!SPELL_DEFINITIONS[spellId]) {
            console.warn(`[SpellSystem] Unknown spell: ${spellId}, defaulting to dash`);
            spellId = 'dash';
        }

        this.state.selectedSpell = spellId;
        this.state.cooldownRemaining = 0;
        this.state.maxCooldown = SPELL_DEFINITIONS[spellId].cooldown;
        this.state.activeShield = null;

        console.log(`[SpellSystem] Spell selected: ${spellId}`);
    },

    /**
     * Get the currently selected spell definition (spacebar)
     * @returns {Object} Spell definition
     */
    getSelectedSpell() {
        return SPELL_DEFINITIONS[this.state.selectedSpell] || SPELL_DEFINITIONS.dash;
    },

    /**
     * Get the selected spell ID (spacebar)
     * @returns {string} Spell ID
     */
    getSelectedSpellId() {
        return this.state.selectedSpell;
    },

    /**
     * Update spell system each frame
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!game?.player) return;

        // Ensure spell slots exist
        this._ensureSpellSlots();

        // Update legacy spacebar cooldown (only for non-dash spells, dash uses DodgeSystem)
        if (this.state.selectedSpell !== 'dash') {
            if (this.state.cooldownRemaining > 0) {
                this.state.cooldownRemaining -= dt;
                if (this.state.cooldownRemaining < 0) {
                    this.state.cooldownRemaining = 0;
                }
            }
        }

        // Update per-spell cooldowns
        for (const spellId in this.cooldowns) {
            if (this.cooldowns[spellId] > 0) {
                this.cooldowns[spellId] -= dt;
                if (this.cooldowns[spellId] < 0) {
                    this.cooldowns[spellId] = 0;
                }
            }
        }

        // Update active shield duration
        if (this.state.activeShield) {
            this.state.activeShield.timer -= dt;
            if (this.state.activeShield.timer <= 0) {
                this._expireShield();
            }
        }
    },

    /**
     * Attempt to activate the selected spell
     * @param {Object} player - Player entity
     * @returns {boolean} Whether activation was successful
     */
    tryActivate(player) {
        if (!player) return false;

        const spell = this.getSelectedSpell();

        // Debug logging
        console.log(`[SpellSystem] tryActivate called - spell: ${spell.id}, cooldown: ${this.state.cooldownRemaining.toFixed(1)}s`);

        // Dash delegates to DodgeSystem
        if (spell.usesDodgeSystem) {
            return this._executeDash(player);
        }

        // Check cooldown for non-dash spells
        if (this.state.cooldownRemaining > 0) {
            const remaining = this.formatCooldownTime(this.state.cooldownRemaining);
            console.log(`[SpellSystem] BLOCKED - on cooldown: ${remaining}`);
            if (typeof addMessage === 'function') {
                addMessage(`${spell.name} on cooldown: ${remaining}`, 'warning');
            }
            return false;
        }

        // Check if stunned/frozen/rooted
        if (player.isStunned || player.isFrozen || player.isRooted) {
            if (typeof addMessage === 'function') {
                addMessage('Cannot cast while immobilized!', 'warning');
            }
            return false;
        }

        // Execute the spell
        switch (this.state.selectedSpell) {
            case 'heal':
                return this._executeHeal(player);
            case 'shield':
                return this._executeShield(player);
            default:
                return this._executeDash(player);
        }
    },

    /**
     * Execute dash spell (delegates to DodgeSystem)
     * @param {Object} player - Player entity
     * @returns {boolean} Success
     */
    _executeDash(player) {
        if (typeof DodgeSystem !== 'undefined' && DodgeSystem.initialized) {
            return DodgeSystem.tryDodge(player);
        }
        console.warn('[SpellSystem] DodgeSystem not available');
        return false;
    },

    /**
     * Execute heal spell
     * @param {Object} player - Player entity
     * @returns {boolean} Success
     */
    _executeHeal(player) {
        const maxHp = player.maxHp || 100;
        const currentHp = player.hp || 0;

        // Calculate heal amount as 35% of max HP
        const healAmount = Math.floor(maxHp * SPELL_CONFIG.healPercent);

        // Calculate effective healing (cap at max HP, no overheal)
        const effectiveHeal = Math.min(healAmount, maxHp - currentHp);

        // Apply healing (always triggers, even at full health for cooldown/effects)
        player.hp = Math.min(currentHp + healAmount, maxHp);

        // Start cooldown
        this.state.cooldownRemaining = SPELL_CONFIG.healCooldown;
        this.state.maxCooldown = SPELL_CONFIG.healCooldown;
        console.log(`[SpellSystem] Heal executed - cooldown set to ${SPELL_CONFIG.healCooldown}s`);

        // Visual feedback
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(player, `+${effectiveHeal}`, '#00ff88');
        }

        // Play sound
        if (SPELL_CONFIG.soundEnabled && typeof AudioManager !== 'undefined') {
            AudioManager.playSfx('heal', SPELL_CONFIG.soundVolume);
        }

        // Message
        if (typeof addMessage === 'function') {
            addMessage(`Healed for ${effectiveHeal} HP!`, 'heal');
        }

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('player:spell_heal', {
                player: player,
                healAmount: effectiveHeal
            });
        }

        console.log(`[SpellSystem] Heal cast: +${effectiveHeal} HP`);
        return true;
    },

    /**
     * Execute shield spell
     * @param {Object} player - Player entity
     * @returns {boolean} Success
     */
    _executeShield(player) {
        // Cannot stack shields
        if (this.state.activeShield) {
            if (typeof addMessage === 'function') {
                addMessage('Shield already active!', 'warning');
            }
            return false;
        }

        const maxHp = player.maxHp || 100;
        const shieldAmount = Math.floor(maxHp * SPELL_CONFIG.shieldPercent);

        // Activate shield
        this.state.activeShield = {
            amount: shieldAmount,
            maxAmount: shieldAmount,
            timer: SPELL_CONFIG.shieldDuration
        };

        // Start cooldown
        this.state.cooldownRemaining = SPELL_CONFIG.shieldCooldown;
        this.state.maxCooldown = SPELL_CONFIG.shieldCooldown;

        // Visual feedback
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(player, `SHIELD: ${shieldAmount}`, '#00aaff');
        }

        // Play sound
        if (SPELL_CONFIG.soundEnabled && typeof AudioManager !== 'undefined') {
            AudioManager.playSfx('shield_activate', SPELL_CONFIG.soundVolume);
        }

        // Message
        if (typeof addMessage === 'function') {
            addMessage(`Shield activated: ${shieldAmount} HP!`, 'buff');
        }

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('player:spell_shield', {
                player: player,
                shieldAmount: shieldAmount
            });
        }

        console.log(`[SpellSystem] Shield cast: ${shieldAmount} HP barrier`);
        return true;
    },

    // ========================================================================
    // WAVE 2: PER-SPELL SLOT CASTING
    // ========================================================================

    /**
     * Cast a spell from a specific slot index (0-3)
     * Maps slot index to player's spellSlots array
     * @param {number} slotIndex - 0-3 spell slot
     * @returns {boolean} Whether the spell was cast
     */
    castSlot(slotIndex) {
        const player = game?.player;
        if (!player) return false;

        this._ensureSpellSlots();

        const spellSlots = player.spellSlots;
        if (!spellSlots || slotIndex < 0 || slotIndex >= spellSlots.length) {
            console.warn(`[SpellSystem] Invalid slot index: ${slotIndex}`);
            return false;
        }

        const spellId = spellSlots[slotIndex];
        if (!spellId) {
            if (typeof addMessage === 'function') {
                addMessage('No spell in that slot!', 'warning');
            }
            return false;
        }

        const spell = SPELL_DEFINITIONS[spellId];
        if (!spell) {
            console.warn(`[SpellSystem] Unknown spell in slot ${slotIndex}: ${spellId}`);
            return false;
        }

        // Check if stunned/frozen/rooted
        if (player.isStunned || player.isFrozen || player.isRooted) {
            if (typeof addMessage === 'function') {
                addMessage('Cannot cast while immobilized!', 'warning');
            }
            return false;
        }

        // Check per-spell cooldown
        const cdRemaining = this.getSlotCooldownRemaining(slotIndex);
        if (cdRemaining > 0) {
            const remaining = this.formatCooldownTime(cdRemaining);
            if (typeof addMessage === 'function') {
                addMessage(`${spell.name} on cooldown: ${remaining}`, 'warning');
            }
            return false;
        }

        // Check stamina cost
        if (spell.usesStamina && spell.staminaCost > 0) {
            if (typeof StaminaSystem !== 'undefined') {
                if (StaminaSystem.state.current < spell.staminaCost) {
                    if (typeof addMessage === 'function') {
                        addMessage(`Not enough stamina for ${spell.name}! (${spell.staminaCost} needed)`, 'warning');
                    }
                    StaminaSystem.triggerExhaustedFeedback();
                    return false;
                }
                // Consume stamina
                const consumed = StaminaSystem.consume(spell.staminaCost, spellId);
                if (!consumed) return false;
            }
        }

        // Execute the spell
        let success = false;
        switch (spellId) {
            case 'heal':
                success = this._executeHeal(player);
                break;
            case 'shield':
                success = this._executeShield(player);
                break;
            case 'fireball':
                success = this._castFireball(player, spell);
                break;
            case 'frost_nova':
                success = this._castFrostNova(player, spell);
                break;
            case 'blink':
                success = this._castBlink(player, spell);
                break;
            case 'dash':
                success = this._executeDash(player);
                break;
            default:
                console.warn(`[SpellSystem] No execution handler for spell: ${spellId}`);
                return false;
        }

        if (success) {
            // Start per-spell cooldown (use effective cooldown for CDR)
            const effectiveCd = this.getEffectiveCooldown(spellId);
            this.cooldowns[spellId] = effectiveCd;

            // Also update legacy cooldown if this spell matches spacebar selection
            if (spellId === this.state.selectedSpell) {
                this.state.cooldownRemaining = effectiveCd;
                this.state.maxCooldown = effectiveCd;
            }

            // Emit generic spell cast event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('player:spell_cast', {
                    player: player,
                    spellId: spellId,
                    slot: slotIndex
                });
            }

            // Update run stats
            if (game.runStats) {
                game.runStats.spellsCast = (game.runStats.spellsCast || 0) + 1;
            }

            console.log(`[SpellSystem] castSlot(${slotIndex}) -> ${spellId} SUCCESS`);
        }

        return success;
    },

    /**
     * Get the cooldown remaining for a spell in a specific slot
     * @param {number} slotIndex - 0-3 spell slot
     * @returns {number} Seconds remaining
     */
    getSlotCooldownRemaining(slotIndex) {
        const player = game?.player;
        if (!player?.spellSlots) return 0;

        const spellId = player.spellSlots[slotIndex];
        if (!spellId) return 0;

        // Dash delegates to DodgeSystem
        if (spellId === 'dash') {
            if (typeof DodgeSystem !== 'undefined') {
                return DodgeSystem.getCooldownRemaining();
            }
            return 0;
        }

        return this.cooldowns[spellId] || 0;
    },

    /**
     * Get cooldown percent for a spell slot (for UI sweep animation)
     * @param {number} slotIndex - 0-3 spell slot
     * @returns {number} 0-1 where 1 = ready
     */
    getSlotCooldownPercent(slotIndex) {
        const player = game?.player;
        if (!player?.spellSlots) return 1;

        const spellId = player.spellSlots[slotIndex];
        if (!spellId) return 1;

        if (spellId === 'dash') {
            if (typeof DodgeSystem !== 'undefined') {
                return DodgeSystem.getCooldownPercent();
            }
            return 1;
        }

        const spell = SPELL_DEFINITIONS[spellId];
        if (!spell) return 1;

        const remaining = this.cooldowns[spellId] || 0;
        const maxCd = this.getEffectiveCooldown(spellId);
        if (maxCd <= 0) return 1;
        return 1 - (remaining / maxCd);
    },

    /**
     * Check if a specific spell slot can be afforded (stamina check)
     * @param {number} slotIndex - 0-3 spell slot
     * @returns {boolean}
     */
    canAffordSlot(slotIndex) {
        const player = game?.player;
        if (!player?.spellSlots) return false;

        const spellId = player.spellSlots[slotIndex];
        if (!spellId) return false;

        const spell = SPELL_DEFINITIONS[spellId];
        if (!spell) return false;

        if (!spell.usesStamina || spell.staminaCost <= 0) return true;

        if (typeof StaminaSystem !== 'undefined') {
            return StaminaSystem.state.current >= spell.staminaCost;
        }
        return true;
    },

    // ========================================================================
    // WAVE 2: COOLDOWN REDUCTION
    // ========================================================================

    /**
     * Get the effective cooldown for a spell, accounting for CDR boons
     * @param {string} spellId - Spell ID
     * @returns {number} Effective cooldown in seconds
     */
    getEffectiveCooldown(spellId) {
        const spell = SPELL_DEFINITIONS[spellId];
        if (!spell) return 0;

        const baseCd = spell.cooldown;

        // Check for cooldown reduction stat from boon system
        const cdr = game?.player?.statStacks?.cooldownReduction?.compute?.() || 0;
        return Math.max(0.5, baseCd * (1 - cdr / 100)); // Min 0.5s
    },

    // ========================================================================
    // WAVE 2: NEW SPELL EXECUTION
    // ========================================================================

    /**
     * Cast Fireball - projectile spell
     * @param {Object} player - Player entity
     * @param {Object} spell - Spell definition
     * @returns {boolean} Success
     */
    _castFireball(player, spell) {
        const facing = player.facing || 'right';
        const dx = { up: 0, down: 0, left: -1, right: 1 }[facing] || 0;
        const dy = { up: -1, down: 1, left: 0, right: 0 }[facing] || 0;

        // Use the game's projectile system if available
        if (typeof createProjectile === 'function') {
            createProjectile({
                x: player.gridX,
                y: player.gridY,
                dirX: dx,
                dirY: dy,
                speed: spell.projectileSpeed || 8,
                maxDistance: spell.maxRange || 10,
                damage: spell.damage,
                element: spell.element || 'fire',
                attacker: player,
                owner: player,
                isMagic: true,
                isSkill: true,
                isSpecial: false
            });
        } else {
            // Fallback: create a simple projectile in game.projectiles
            if (!game.projectiles) game.projectiles = [];
            game.projectiles.push({
                x: player.gridX,
                y: player.gridY,
                displayX: player.gridX,
                displayY: player.gridY,
                dx: dx,
                dy: dy,
                dirX: dx,
                dirY: dy,
                velocityX: dx * (spell.projectileSpeed || 8),
                velocityY: dy * (spell.projectileSpeed || 8),
                speed: spell.projectileSpeed || 8,
                damage: spell.damage,
                element: 'fire',
                attacker: player,
                owner: player,
                maxRange: spell.maxRange || 10,
                distanceTraveled: 0,
                distanceToTravel: spell.maxRange || 10,
                type: 'fireball',
                active: true,
                hasHit: false,
                isMagic: true,
                isSkill: true,
                alpha: 1.0
            });
        }

        // Visual feedback
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(player, 'FIREBALL', '#ff6600');
        }

        // Play sound
        if (SPELL_CONFIG.soundEnabled && typeof AudioManager !== 'undefined') {
            AudioManager.playSfx('fireball', SPELL_CONFIG.soundVolume);
        }

        // Message
        if (typeof addMessage === 'function') {
            addMessage('You hurl a fireball!', 'combat');
        }

        console.log(`[SpellSystem] Fireball cast facing ${facing}`);
        return true;
    },

    /**
     * Cast Frost Nova - AoE damage + slow
     * @param {Object} player - Player entity
     * @param {Object} spell - Spell definition
     * @returns {boolean} Success
     */
    _castFrostNova(player, spell) {
        const radius = spell.radius || 3;
        const enemies = (game.enemies || []).filter(e => {
            if (!e || e.hp <= 0) return false;
            const dist = Math.sqrt(
                Math.pow((e.gridX || e.x || 0) - player.gridX, 2) +
                Math.pow((e.gridY || e.y || 0) - player.gridY, 2)
            );
            return dist <= radius;
        });

        let totalDamage = 0;

        enemies.forEach(enemy => {
            // Deal ice damage
            if (typeof applyDamage === 'function') {
                applyDamage(enemy, spell.damage, player);
            } else {
                enemy.hp -= spell.damage;
            }
            totalDamage += spell.damage;

            // Apply slow / chilled status effect
            if (!enemy.statusEffects) enemy.statusEffects = [];
            enemy.statusEffects.push({
                type: 'chilled',
                duration: spell.slowDuration,
                speedMultiplier: spell.slowAmount,
                remaining: spell.slowDuration
            });

            // Visual feedback per enemy
            if (typeof showDamageNumber === 'function') {
                showDamageNumber(enemy, `-${spell.damage}`, '#88ccff');
            }
        });

        // Create ice_slick hazard at player position if LingeringHazards is available
        if (typeof LingeringHazards !== 'undefined' && typeof LingeringHazards.createCircularZone === 'function') {
            LingeringHazards.createCircularZone(
                player.gridX,
                player.gridY,
                radius,
                (spell.slowDuration + 1) * 1000, // convert to ms
                0,                                 // no ongoing damage
                1000,                              // tick interval ms
                'ice_slick'
            );
        }

        // Visual feedback
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(player, 'FROST NOVA', '#00ccff');
        }

        // Play sound
        if (SPELL_CONFIG.soundEnabled && typeof AudioManager !== 'undefined') {
            AudioManager.playSfx('frost_nova', SPELL_CONFIG.soundVolume);
        }

        // Message
        if (typeof addMessage === 'function') {
            const hitCount = enemies.length;
            addMessage(`Frost Nova hits ${hitCount} enem${hitCount === 1 ? 'y' : 'ies'} for ${spell.damage} ice damage!`, 'combat');
        }

        console.log(`[SpellSystem] Frost Nova cast - hit ${enemies.length} enemies`);
        return true;
    },

    /**
     * Cast Blink - teleport in facing direction
     * @param {Object} player - Player entity
     * @param {Object} spell - Spell definition
     * @returns {boolean} Success
     */
    _castBlink(player, spell) {
        const facing = player.facing || 'right';
        const dx = { up: 0, down: 0, left: -1, right: 1 }[facing] || 0;
        const dy = { up: -1, down: 1, left: 0, right: 0 }[facing] || 0;
        const distance = spell.distance || 5;

        // Find the furthest valid position along the line
        let finalX = player.gridX;
        let finalY = player.gridY;

        const gridW = typeof GRID_WIDTH !== 'undefined' ? GRID_WIDTH : 200;
        const gridH = typeof GRID_HEIGHT !== 'undefined' ? GRID_HEIGHT : 200;

        for (let i = 1; i <= distance; i++) {
            const testX = Math.floor(player.gridX) + dx * i;
            const testY = Math.floor(player.gridY) + dy * i;

            // Bounds check
            if (testX < 0 || testX >= gridW || testY < 0 || testY >= gridH) break;

            // Wall check
            if (game.map && game.map[testY] && game.map[testY][testX]) {
                const tile = game.map[testY][testX];
                // Check if it's a wall (value 1 or type 'wall')
                if (tile === 1 || tile.type === 'wall' || tile.solid) break;
            }

            finalX = testX;
            finalY = testY;
        }

        // Only blink if we actually moved
        if (finalX === player.gridX && finalY === player.gridY) {
            if (typeof addMessage === 'function') {
                addMessage('Nowhere to blink!', 'warning');
            }
            return false;
        }

        // Teleport player
        player.gridX = finalX;
        player.gridY = finalY;
        if (player.displayX !== undefined) player.displayX = finalX;
        if (player.displayY !== undefined) player.displayY = finalY;
        if (player.x !== undefined) player.x = finalX;
        if (player.y !== undefined) player.y = finalY;

        // Visual feedback
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(player, 'BLINK', '#cc66ff');
        }

        // Play sound
        if (SPELL_CONFIG.soundEnabled && typeof AudioManager !== 'undefined') {
            AudioManager.playSfx('blink', SPELL_CONFIG.soundVolume);
        }

        // Message
        if (typeof addMessage === 'function') {
            addMessage('You blink through space!', 'info');
        }

        console.log(`[SpellSystem] Blink cast - teleported to (${finalX}, ${finalY})`);
        return true;
    },

    /**
     * Check if shield is currently active
     * @returns {boolean}
     */
    hasActiveShield() {
        return this.state.activeShield !== null && this.state.activeShield.amount > 0;
    },

    /**
     * Get current shield amount
     * @returns {number}
     */
    getShieldAmount() {
        return this.state.activeShield?.amount || 0;
    },

    /**
     * Get shield info for UI
     * @returns {Object|null} { amount, maxAmount, timer } or null
     */
    getShieldInfo() {
        return this.state.activeShield;
    },

    /**
     * Absorb damage with shield
     * @param {number} damage - Incoming damage
     * @returns {number} Remaining damage after shield absorption
     */
    absorbDamage(damage) {
        if (!this.state.activeShield || damage <= 0) {
            return damage;
        }

        const shield = this.state.activeShield;
        const absorbed = Math.min(damage, shield.amount);
        shield.amount -= absorbed;

        console.log(`[SpellSystem] Shield absorbed ${absorbed} damage, ${shield.amount} remaining`);

        // Visual feedback for absorption
        if (typeof showDamageNumber === 'function' && absorbed > 0) {
            showDamageNumber(game.player, `BLOCKED ${absorbed}`, '#00aaff');
        }

        // Check if shield broke
        if (shield.amount <= 0) {
            this._breakShield();
            return damage - absorbed;
        }

        return damage - absorbed;
    },

    /**
     * Break the shield (depleted by damage)
     */
    _breakShield() {
        if (!this.state.activeShield) return;

        this.state.activeShield = null;

        // Play sound
        if (SPELL_CONFIG.soundEnabled && typeof AudioManager !== 'undefined') {
            AudioManager.playSfx('shield_break', SPELL_CONFIG.soundVolume);
        }

        // Message
        if (typeof addMessage === 'function') {
            addMessage('Shield broken!', 'warning');
        }

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('player:shield_break', {});
        }

        console.log('[SpellSystem] Shield broken');
    },

    /**
     * Expire the shield (duration ended)
     */
    _expireShield() {
        if (!this.state.activeShield) return;

        this.state.activeShield = null;

        // Message
        if (typeof addMessage === 'function') {
            addMessage('Shield expired.', 'info');
        }

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('player:shield_expire', {});
        }

        console.log('[SpellSystem] Shield expired');
    },

    /**
     * Get remaining cooldown time
     * @returns {number} Seconds until spell available
     */
    getCooldownRemaining() {
        // For dash, use DodgeSystem cooldown
        if (this.state.selectedSpell === 'dash') {
            if (typeof DodgeSystem !== 'undefined') {
                return DodgeSystem.getCooldownRemaining();
            }
            return 0;
        }
        return this.state.cooldownRemaining;
    },

    /**
     * Get cooldown as percentage (for UI)
     * @returns {number} 0-1 where 1 = ready
     */
    getCooldownPercent() {
        // For dash, use DodgeSystem
        if (this.state.selectedSpell === 'dash') {
            if (typeof DodgeSystem !== 'undefined') {
                return DodgeSystem.getCooldownPercent();
            }
            return 1;
        }

        if (this.state.maxCooldown <= 0) return 1;
        return 1 - (this.state.cooldownRemaining / this.state.maxCooldown);
    },

    /**
     * Check if spell is ready to use
     * @returns {boolean}
     */
    isReady() {
        return this.getCooldownRemaining() <= 0;
    },

    /**
     * Format cooldown time for display
     * @param {number} seconds - Cooldown in seconds
     * @returns {string} Formatted time (e.g., "2:30" or "0.5s")
     */
    formatCooldownTime(seconds) {
        if (seconds >= 60) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
        return `${seconds.toFixed(1)}s`;
    },

    /**
     * Get all spell definitions (for UI)
     * @returns {Object} Spell definitions
     */
    getAllSpells() {
        return SPELL_DEFINITIONS;
    },

    /**
     * Render debug info
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderDebug(ctx) {
        if (!ctx || !game?.player) return;

        const x = 10;
        let y = 280;

        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';

        ctx.fillText(`[Spell System]`, x, y); y += 15;
        ctx.fillText(`  selected: ${this.state.selectedSpell}`, x, y); y += 12;
        ctx.fillText(`  cooldown: ${this.formatCooldownTime(this.getCooldownRemaining())}`, x, y); y += 12;
        ctx.fillText(`  ready: ${this.isReady()}`, x, y); y += 12;

        if (this.state.activeShield) {
            ctx.fillText(`  shield: ${this.state.activeShield.amount}/${this.state.activeShield.maxAmount}`, x, y); y += 12;
            ctx.fillText(`  shield timer: ${this.state.activeShield.timer.toFixed(1)}s`, x, y); y += 12;
        }

        ctx.restore();
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('spell-system', SpellSystem, 24); // Priority 24 (before dodge at 25)
} else {
    // Fallback: initialize on load
    if (typeof game !== 'undefined') {
        SpellSystem.init();
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.SpellSystem = SpellSystem;
    window.SPELL_CONFIG = SPELL_CONFIG;
    window.SPELL_DEFINITIONS = SPELL_DEFINITIONS;
}

console.log('[SpellSystem] Spell system loaded');
