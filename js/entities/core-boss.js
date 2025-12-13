// === js/entities/core-boss.js ===
// SURVIVAL EXTRACTION UPDATE: The Primordial boss entity

// ============================================================================
// CORE BOSS ENTITY
// ============================================================================

/**
 * Create The Primordial boss entity
 * @param {number} x - Spawn x position
 * @param {number} y - Spawn y position
 * @returns {Object} Boss entity
 */
function createCoreBoss(x, y) {
    const data = CORE_BOSS_DATA;
    const stats = getCoreBossStats(1);  // Start at phase 1

    return {
        // Identity
        id: 'the_primordial',
        type: 'boss',
        name: data.name,
        title: data.title,
        isFinalBoss: true,

        // Position
        x: x,
        y: y,
        width: data.size,
        height: data.size,

        // Stats
        maxHealth: stats.health,
        health: stats.health,
        damage: stats.damage,
        defense: stats.defense,
        speed: stats.speed,
        attackSpeed: stats.attackSpeed,

        // Combat state
        phase: 1,
        phaseTransitioning: false,
        phaseTransitionTime: 0,
        invulnerable: false,
        enraged: false,

        // Ability state
        abilities: stats.abilities.map(id => ({
            id,
            cooldown: 0,
            casting: false,
            castProgress: 0
        })),
        currentAbility: null,
        globalCooldown: 0,

        // AI state
        targetX: null,
        targetY: null,
        attackPattern: data.phases[1].attackPattern,
        lastAttackTime: 0,
        idleTime: 0,

        // Summons tracking
        activeSummons: [],
        maxSummons: 6,

        // Visual
        sprite: data.sprite,
        color: data.color,
        glowColor: data.glowColor,
        glowIntensity: data.glowIntensity,
        animationFrame: 0,
        animationTime: 0,
        hitFlash: 0,
        deathAnimation: 0,

        // Dialogue
        dialogueQueue: [],
        currentDialogue: null,
        dialogueTimer: 0,

        // Methods
        update: updateCoreBoss,
        takeDamage: coreBossTakeDamage,
        useAbility: coreBossUseAbility,
        checkPhaseTransition: coreBossCheckPhase,
        spawnSummon: coreBossSpawnSummon,
        die: coreBossDie,
        getHitbox: coreBossGetHitbox,
        render: renderCoreBoss
    };
}

// ============================================================================
// BOSS UPDATE
// ============================================================================

/**
 * Update boss each frame
 * @param {number} dt - Delta time
 * @param {Object} player - Player entity
 * @param {Object} arena - Arena data
 */
function updateCoreBoss(dt, player, arena) {
    // Don't update if dead
    if (this.health <= 0) {
        this.deathAnimation += dt;
        return;
    }

    // Phase transition
    if (this.phaseTransitioning) {
        this.phaseTransitionTime += dt;
        if (this.phaseTransitionTime >= 2) {
            this.phaseTransitioning = false;
            this.invulnerable = false;
        }
        return;
    }

    // Update cooldowns
    this.globalCooldown = Math.max(0, this.globalCooldown - dt);
    this.abilities.forEach(ability => {
        ability.cooldown = Math.max(0, ability.cooldown - dt);
    });

    // Update current ability cast
    if (this.currentAbility) {
        this.currentAbility.castProgress += dt;
        const abilityData = getCoreBossAbility(this.currentAbility.id);
        if (this.currentAbility.castProgress >= abilityData.castTime) {
            this._executeAbility(this.currentAbility.id, player, arena);
            this.currentAbility = null;
        }
    } else {
        // Choose next ability
        this._chooseAbility(player, arena);
    }

    // Update animation
    this.animationTime += dt;
    this.animationFrame = Math.floor(this.animationTime * 4) % 4;

    // Update hit flash
    this.hitFlash = Math.max(0, this.hitFlash - dt * 5);

    // Update dialogue
    if (this.currentDialogue) {
        this.dialogueTimer -= dt;
        if (this.dialogueTimer <= 0) {
            this.currentDialogue = null;
            if (this.dialogueQueue.length > 0) {
                this._showNextDialogue();
            }
        }
    }

    // Update summons
    this.activeSummons = this.activeSummons.filter(s => s.health > 0);
}

/**
 * Choose next ability to use
 * @param {Object} player
 * @param {Object} arena
 * @private
 */
function _chooseAbilityForBoss(player, arena) {
    if (this.globalCooldown > 0) return;

    // Get available abilities
    const available = this.abilities.filter(a =>
        a.cooldown <= 0 && !a.casting
    );

    if (available.length === 0) return;

    // Choose based on attack pattern
    let chosen = null;

    switch (this.attackPattern) {
        case 'standard':
            // Random selection with slight preference for damage abilities
            chosen = available[Math.floor(Math.random() * available.length)];
            break;

        case 'aggressive':
            // Prefer damage abilities
            const damageAbilities = available.filter(a => {
                const data = getCoreBossAbility(a.id);
                return data.type !== 'summon';
            });
            chosen = damageAbilities.length > 0 ?
                damageAbilities[Math.floor(Math.random() * damageAbilities.length)] :
                available[0];
            break;

        case 'berserk':
            // Use abilities as fast as possible
            chosen = available[0];
            break;
    }

    if (chosen) {
        this.useAbility(chosen.id, player);
    }
}

// Attach to prototype
updateCoreBoss.prototype = {};
updateCoreBoss.prototype._chooseAbility = _chooseAbilityForBoss;

// ============================================================================
// ABILITY SYSTEM
// ============================================================================

/**
 * Start using an ability
 * @param {string} abilityId
 * @param {Object} player
 */
function coreBossUseAbility(abilityId, player) {
    const abilityData = getCoreBossAbility(abilityId);
    if (!abilityData) return;

    // Start casting
    this.currentAbility = {
        id: abilityId,
        castProgress: 0,
        targetX: player.x,
        targetY: player.y
    };

    // Set cooldown
    const ability = this.abilities.find(a => a.id === abilityId);
    if (ability) {
        ability.cooldown = abilityData.cooldown;
    }

    // Global cooldown based on phase
    this.globalCooldown = this.phase === 3 ? 0.5 : 1.0;

    console.log(`[CoreBoss] Casting ${abilityData.name}`);
}

/**
 * Execute ability after cast
 * @param {string} abilityId
 * @param {Object} player
 * @param {Object} arena
 * @private
 */
function _executeAbility(abilityId, player, arena) {
    const abilityData = getCoreBossAbility(abilityId);
    if (!abilityData) return;

    console.log(`[CoreBoss] Executing ${abilityData.name}`);

    switch (abilityData.type) {
        case 'area':
            this._executeAreaAbility(abilityData, player, arena);
            break;

        case 'targeted':
            this._executeTargetedAbility(abilityData, player);
            break;

        case 'projectile':
            this._executeProjectileAbility(abilityData, player);
            break;

        case 'summon':
            this._executeSummonAbility(abilityData, arena);
            break;

        case 'zone':
            this._executeZoneAbility(abilityData, player, arena);
            break;

        case 'environmental':
            this._executeEnvironmentalAbility(abilityData, arena);
            break;
    }
}

/**
 * Execute area damage ability
 * @param {Object} abilityData
 * @param {Object} player
 * @param {Object} arena
 * @private
 */
function _executeAreaAbility(abilityData, player, arena) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Check if player is in range
    const dx = player.x - centerX;
    const dy = player.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // For primordial_wrath, check safe zones
    if (abilityData.id === 'primordial_wrath' && arena.safeZones) {
        const inSafeZone = arena.safeZones.some(zone =>
            player.x >= zone.x && player.x < zone.x + zone.width &&
            player.y >= zone.y && player.y < zone.y + zone.height
        );

        if (inSafeZone) {
            console.log('[CoreBoss] Player in safe zone!');
            return;
        }
    }

    if (dist <= abilityData.radius) {
        // Deal damage
        if (typeof CombatSystem !== 'undefined') {
            CombatSystem.dealDamage(this, player, abilityData.damage);
        }

        // Apply on-hit effects
        if (abilityData.onHit) {
            this._applyOnHitEffect(abilityData.onHit, player);
        }
    }

    // Create visual effect
    if (typeof CombatEffectSystem !== 'undefined') {
        CombatEffectSystem.createExplosion(
            centerX, centerY,
            abilityData.radius,
            abilityData.telegraph.color
        );
    }
}

/**
 * Execute targeted ability (tendrils)
 * @param {Object} abilityData
 * @param {Object} player
 * @private
 */
function _executeTargetedAbility(abilityData, player) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Create projectiles toward player
    for (let i = 0; i < abilityData.count; i++) {
        // Add spread
        const spread = (i - abilityData.count / 2) * 0.3;
        const angle = Math.atan2(player.y - centerY, player.x - centerX) + spread;

        if (typeof ProjectileSystem !== 'undefined') {
            ProjectileSystem.create({
                x: centerX,
                y: centerY,
                angle: angle,
                speed: abilityData.projectile.speed,
                damage: abilityData.damage,
                owner: this,
                duration: abilityData.projectile.duration,
                piercing: abilityData.projectile.piercing,
                color: abilityData.telegraph.color,
                onHit: abilityData.onHit
            });
        }
    }
}

/**
 * Execute projectile ability (chaos orbs)
 * @param {Object} abilityData
 * @param {Object} player
 * @private
 */
function _executeProjectileAbility(abilityData, player) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // Radial pattern
    for (let i = 0; i < abilityData.count; i++) {
        const angle = (i / abilityData.count) * Math.PI * 2;

        if (typeof ProjectileSystem !== 'undefined') {
            ProjectileSystem.create({
                x: centerX,
                y: centerY,
                angle: angle,
                speed: abilityData.projectile.speed,
                damage: abilityData.damage,
                owner: this,
                bounces: abilityData.projectile.bounces || 0,
                color: '#ff4a9a'
            });
        }
    }
}

/**
 * Execute summon ability
 * @param {Object} abilityData
 * @param {Object} arena
 * @private
 */
function _executeSummonAbility(abilityData, arena) {
    if (this.activeSummons.length >= this.maxSummons) {
        console.log('[CoreBoss] Max summons reached');
        return;
    }

    const toSummon = Math.min(
        abilityData.count,
        this.maxSummons - this.activeSummons.length
    );

    for (let i = 0; i < toSummon; i++) {
        // Pick random spawn point away from boss
        const spawn = this._pickSummonSpawn(arena);
        if (spawn) {
            const summon = this.spawnSummon(abilityData.summonType, spawn.x, spawn.y);
            this.activeSummons.push(summon);
        }
    }
}

/**
 * Pick spawn point for summon
 * @param {Object} arena
 * @returns {Object|null}
 * @private
 */
function _pickSummonSpawn(arena) {
    if (!arena.hazardSpawns || arena.hazardSpawns.length === 0) {
        return { x: this.x + 8, y: this.y + 8 };
    }

    // Pick random hazard spawn point
    const spawn = arena.hazardSpawns[Math.floor(Math.random() * arena.hazardSpawns.length)];
    return { x: spawn.x, y: spawn.y };
}

/**
 * Spawn a summon entity
 * @param {string} summonType
 * @param {number} x
 * @param {number} y
 * @returns {Object}
 */
function coreBossSpawnSummon(summonType, x, y) {
    const data = CORE_SUMMON_DATA[summonType];
    if (!data) {
        console.warn(`[CoreBoss] Unknown summon type: ${summonType}`);
        return null;
    }

    const summon = {
        id: `${summonType}_${Date.now()}`,
        type: 'summon',
        summonType: summonType,
        name: data.name,
        x: x,
        y: y,
        width: data.size,
        height: data.size,
        health: data.health,
        maxHealth: data.health,
        damage: data.damage,
        speed: data.speed,
        attackSpeed: data.attackSpeed,
        sprite: data.sprite,
        color: data.color,
        owner: this
    };

    console.log(`[CoreBoss] Spawned ${data.name} at (${x}, ${y})`);

    // Add to game state
    if (gameState?.enemies) {
        gameState.enemies.push(summon);
    }

    return summon;
}

/**
 * Execute zone ability (reality tear)
 * @param {Object} abilityData
 * @param {Object} player
 * @param {Object} arena
 * @private
 */
function _executeZoneAbility(abilityData, player, arena) {
    // Create persistent damage zone at player location
    const zone = {
        id: `zone_${Date.now()}`,
        type: 'damage_zone',
        x: player.x - abilityData.zone.width / 2,
        y: player.y - abilityData.zone.height / 2,
        width: abilityData.zone.width,
        height: abilityData.zone.height,
        damage: abilityData.damage,
        tickRate: abilityData.tickRate,
        duration: abilityData.duration,
        timeRemaining: abilityData.duration,
        lastTick: 0,
        color: abilityData.telegraph.color,
        owner: this
    };

    // Add to hazard system
    if (typeof HazardSystem !== 'undefined') {
        HazardSystem.addHazard(zone);
    }
}

/**
 * Execute environmental ability (void collapse)
 * @param {Object} abilityData
 * @param {Object} arena
 * @private
 */
function _executeEnvironmentalAbility(abilityData, arena) {
    if (abilityData.id === 'void_collapse') {
        // Shrink arena
        const shrinkAmount = Math.floor(arena.width * abilityData.telegraph.shrinkPercent);
        CoreGenerator.applyShrink(arena.tiles, shrinkAmount);

        // Show warning
        if (typeof addMessage === 'function') {
            addMessage('THE ARENA IS COLLAPSING!', 'danger');
        }
    }
}

/**
 * Apply on-hit effect to player
 * @param {Object} effect
 * @param {Object} player
 * @private
 */
function _applyOnHitEffect(effect, player) {
    if (typeof StatusEffectSystem === 'undefined') return;

    switch (effect.effect) {
        case 'knockback':
            // Calculate knockback direction
            const dx = player.x - (this.x + this.width / 2);
            const dy = player.y - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                player.x += (dx / dist) * effect.force;
                player.y += (dy / dist) * effect.force;
            }
            break;

        case 'slow':
            StatusEffectSystem.apply(player, {
                type: 'slow',
                duration: effect.duration,
                value: effect.amount
            });
            break;

        case 'burn':
            StatusEffectSystem.apply(player, {
                type: 'burn',
                duration: effect.duration,
                dps: effect.dps
            });
            break;
    }
}

// ============================================================================
// DAMAGE & PHASE
// ============================================================================

/**
 * Handle boss taking damage
 * @param {number} amount
 * @param {Object} source
 * @returns {Object} { damage, killed }
 */
function coreBossTakeDamage(amount, source) {
    if (this.invulnerable || this.health <= 0) {
        return { damage: 0, killed: false };
    }

    // Apply defense
    const defense = this.defense;
    const actualDamage = Math.max(1, amount - defense * 0.5);

    this.health -= actualDamage;
    this.hitFlash = 1;

    // Check for phase transition
    this.checkPhaseTransition();

    // Check for death
    if (this.health <= 0) {
        this.die();
        return { damage: actualDamage, killed: true };
    }

    return { damage: actualDamage, killed: false };
}

/**
 * Check and handle phase transition
 */
function coreBossCheckPhase() {
    const healthPercent = this.health / this.maxHealth;
    const newPhase = getCoreBossPhase(healthPercent);

    if (newPhase > this.phase) {
        this._transitionToPhase(newPhase);
    }
}

/**
 * Transition to new phase
 * @param {number} newPhase
 * @private
 */
function _transitionToPhase(newPhase) {
    console.log(`[CoreBoss] Transitioning to Phase ${newPhase}`);

    this.phase = newPhase;
    this.phaseTransitioning = true;
    this.phaseTransitionTime = 0;
    this.invulnerable = true;

    // Update stats
    const stats = getCoreBossStats(newPhase);
    this.damage = stats.damage;
    this.defense = stats.defense;
    this.speed = stats.speed;
    this.attackSpeed = stats.attackSpeed;

    // Update abilities
    this.abilities = stats.abilities.map(id => ({
        id,
        cooldown: 0,
        casting: false,
        castProgress: 0
    }));

    // Update attack pattern
    const phaseData = CORE_BOSS_DATA.phases[newPhase];
    this.attackPattern = phaseData.attackPattern;

    // Queue dialogue
    phaseData.dialogue.forEach(line => {
        this.dialogueQueue.push(line);
    });
    this._showNextDialogue();

    // Visual/audio cue
    if (typeof addMessage === 'function') {
        addMessage(`${this.name} enters Phase ${newPhase}: ${phaseData.name}!`, 'danger');
    }
}

/**
 * Show next dialogue line
 * @private
 */
function _showNextDialogue() {
    if (this.dialogueQueue.length === 0) return;

    this.currentDialogue = this.dialogueQueue.shift();
    this.dialogueTimer = 3;  // 3 seconds per line

    if (typeof addMessage === 'function') {
        addMessage(`"${this.currentDialogue}"`, 'boss');
    }
}

// ============================================================================
// DEATH
// ============================================================================

/**
 * Handle boss death
 */
function coreBossDie() {
    console.log('[CoreBoss] The Primordial has been defeated!');

    // Set death state
    this.health = 0;
    this.deathAnimation = 0;

    // Clear summons
    this.activeSummons.forEach(summon => {
        if (summon.health > 0) {
            summon.health = 0;
        }
    });

    // Grant rewards
    if (typeof CraftingSystem !== 'undefined') {
        CORE_CONFIG.rewards.materials.forEach(mat => {
            const item = createMaterialItem(mat.id, mat.count);
            if (item && typeof BankingSystem !== 'undefined') {
                BankingSystem.deposit(item);
            }
        });
    }

    if (typeof BankingSystem !== 'undefined') {
        BankingSystem.depositGold(CORE_CONFIG.rewards.gold);
    }

    // Mark as defeated
    if (persistentState) {
        persistentState.coreDefeated = true;
        persistentState.coreDefeatTime = Date.now();
    }

    // Trigger victory
    if (typeof CoreSystem !== 'undefined') {
        CoreSystem.onBossDefeated();
    }
}

// ============================================================================
// HITBOX & RENDERING
// ============================================================================

/**
 * Get boss hitbox
 * @returns {Object}
 */
function coreBossGetHitbox() {
    return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height
    };
}

/**
 * Render boss
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} offsetX - Camera offset
 * @param {number} offsetY - Camera offset
 * @param {number} tileSize
 */
function renderCoreBoss(ctx, offsetX, offsetY, tileSize) {
    const screenX = this.x * tileSize - offsetX;
    const screenY = this.y * tileSize - offsetY;
    const size = this.width * tileSize;

    // Death animation
    if (this.health <= 0) {
        const deathProgress = Math.min(1, this.deathAnimation / 3);
        ctx.globalAlpha = 1 - deathProgress;

        // Expanding death effect
        ctx.fillStyle = this.glowColor;
        ctx.beginPath();
        ctx.arc(
            screenX + size / 2,
            screenY + size / 2,
            size * (0.5 + deathProgress * 2),
            0, Math.PI * 2
        );
        ctx.fill();

        ctx.globalAlpha = 1;
        return;
    }

    // Glow effect
    const glowSize = size * 1.2 + Math.sin(this.animationTime * 3) * tileSize * 0.3;
    const gradient = ctx.createRadialGradient(
        screenX + size / 2, screenY + size / 2, 0,
        screenX + size / 2, screenY + size / 2, glowSize
    );
    gradient.addColorStop(0, this.glowColor + '44');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(screenX - glowSize, screenY - glowSize, glowSize * 2 + size, glowSize * 2 + size);

    // Hit flash
    if (this.hitFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.hitFlash * 0.5})`;
        ctx.fillRect(screenX, screenY, size, size);
    }

    // Main body
    ctx.fillStyle = this.phaseTransitioning ?
        `rgba(255, 255, 255, ${0.5 + Math.sin(this.phaseTransitionTime * 10) * 0.5})` :
        this.color;
    ctx.fillRect(screenX + 4, screenY + 4, size - 8, size - 8);

    // Phase indicator (eyes/cores)
    ctx.fillStyle = this.glowColor;
    const eyeSize = tileSize * 0.4;
    const eyeY = screenY + size * 0.35;

    // More eyes/cores based on phase
    for (let i = 0; i < this.phase + 1; i++) {
        const eyeX = screenX + size * (0.3 + i * 0.2);
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // Health bar
    const barWidth = size;
    const barHeight = 8;
    const barY = screenY - 15;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(screenX, barY, barWidth, barHeight);

    // Health
    const healthPercent = this.health / this.maxHealth;
    const healthColor = this.phase === 3 ? '#f44' : this.phase === 2 ? '#fa4' : '#4f4';
    ctx.fillStyle = healthColor;
    ctx.fillRect(screenX, barY, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, barY, barWidth, barHeight);

    // Name and phase
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.name} - Phase ${this.phase}`, screenX + size / 2, barY - 5);

    // Current dialogue
    if (this.currentDialogue) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'italic 11px monospace';
        ctx.fillText(`"${this.currentDialogue}"`, screenX + size / 2, screenY + size + 20);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.createCoreBoss = createCoreBoss;

console.log('[CoreBoss] Core boss entity loaded');
