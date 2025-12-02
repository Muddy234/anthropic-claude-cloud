// ============================================================================
// COMBAT SYSTEM - The Shifting Chasm
// ============================================================================
// Updated: Integrates 3-layer damage system (Weapon/Armor, Element, Attunement)
// Uses DamageCalculator for all damage calculations
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const COMBAT_CONFIG = {
    baseAttackTime: 700,          // Base attack speed in ms (1.0 speed = 700ms)
    engageDelay: 0.4,             // Initial delay when engaging (seconds)
    minDamage: 1,                 // Minimum damage floor
    missChance: 0.08,             // Base 8% miss chance
    debugLogging: true
};

// ============================================================================
// MAIN UPDATE LOOP
// ============================================================================

function updateCombat(deltaTime) {
    // Update player combat
    if (game.player?.combat?.isInCombat) {
        updateEntityCombat(game.player, deltaTime);
    }

    // Update enemy combat
    if (game.enemies) {
        for (const enemy of game.enemies) {
            if (enemy.combat?.isInCombat) {
                updateEntityCombat(enemy, deltaTime);
            }
        }
    }
}

function updateEntityCombat(entity, deltaTime) {
    const combat = entity.combat;
    if (!combat) return;

    // ACTIVE COMBAT: Player uses hotkeys, doesn't auto-attack
    if (entity === game.player) {
        // Player manual combat only - no auto-attack
        return;
    }

    // Check if entity can act (not stunned, frozen, etc.)
    if (typeof canEntityAct === 'function' && !canEntityAct(entity)) {
        return;
    }

    // Reduce cooldown
    combat.attackCooldown -= deltaTime / 1000;

    // Validate target
    if (!combat.currentTarget || combat.currentTarget.hp <= 0) {
        disengageCombat(entity);
        return;
    }

    // Check range
    if (!canAttackTarget(entity, combat.currentTarget)) {
        return;
    }

    // Ready to attack? (Enemies only - player uses hotkeys)
    if (combat.attackCooldown <= 0) {
        performAttack(entity, combat.currentTarget);

        // Calculate attack speed (lower = faster)
        const baseSpeed = combat.attackSpeed || 1.0;
        const attackTimeMs = COMBAT_CONFIG.baseAttackTime * baseSpeed;
        combat.attackCooldown = attackTimeMs / 1000;
    }
}

// ============================================================================
// COMBAT STATE MANAGEMENT
// ============================================================================

function engageCombat(attacker, target) {
    if (!attacker?.combat || !target?.combat) {
        console.warn('[Combat] engageCombat called with invalid entities');
        return;
    }

    // Don't re-engage same target
    if (attacker.combat.currentTarget === target && attacker.combat.isInCombat) {
        return;
    }

    attacker.combat.isInCombat = true;
    attacker.combat.currentTarget = target;
    attacker.combat.attackCooldown = COMBAT_CONFIG.engageDelay;

    // Set active combat flag (blocks inventory for player)
    if (attacker === game.player) {
        attacker.inCombat = true;
    }
    if (target === game.player) {
        target.inCombat = true;
    }

    if (typeof addMessage === 'function') {
        addMessage(`Engaging ${target.name || 'target'}!`);
    }

    if (COMBAT_CONFIG.debugLogging) {
        console.log(`[Combat] ${attacker.name || 'Player'} engaging ${target.name || 'target'}`);
    }

    // Generate combat noise
    if (typeof NoiseSystem !== 'undefined' && attacker === game.player) {
        NoiseSystem.playerNoise('ATTACK_MELEE');
    }

    // Target retaliates if able
    if (target.combat?.autoRetaliate && !target.combat.isInCombat) {
        engageCombat(target, attacker);
    }
}

function disengageCombat(entity) {
    if (!entity?.combat) return;

    entity.combat.isInCombat = false;
    entity.combat.currentTarget = null;
    entity.combat.attackCooldown = 0;

    // Clear active combat flag
    if (entity === game.player) {
        entity.inCombat = false;
    }
}

// ============================================================================
// ATTACK EXECUTION
// ============================================================================

function performAttack(attacker, defender) {
    // Get current room for attunement
    const room = getCurrentRoom(attacker);

    // Use DamageCalculator if available
    let result;
    if (typeof DamageCalculator !== 'undefined') {
        result = DamageCalculator.calculateDamage(attacker, defender, room);
    } else {
        // Fallback to simple calculation
        result = calculateDamageFallback(attacker, defender);
    }

    if (!result.isHit) {
        // Miss
        if (typeof addMessage === 'function') {
            addMessage(`${attacker.name || 'You'} missed!`);
        }
        showDamageNumber(defender, 0, '#888888');
        return;
    }

    // Apply damage
    applyDamage(defender, result.finalDamage, attacker);

    // Build message
    let message = `${attacker.name || 'You'} hit ${defender.name || 'target'} for ${result.finalDamage}!`;
    
    // Add modifiers to message
    if (result.isCrit) message += ' CRITICAL!';
    if (result.messages) {
        for (const msg of result.messages) {
            if (msg !== 'CRITICAL' && msg !== 'MISS') {
                message += ` ${msg}`;
            }
        }
    }

    if (typeof addMessage === 'function') {
        addMessage(message);
    }

    // Determine damage number color
    let color = '#ff4444';
    if (result.isCrit) color = '#ffff00';
    if (result.breakdown?.elementMod > 1.0) color = '#00ff00';
    if (result.breakdown?.elementMod < 1.0) color = '#ff8800';

    showDamageNumber(defender, result.finalDamage, color);

    // Generate hit noise
    if (typeof NoiseSystem !== 'undefined') {
        if (attacker === game.player) {
            NoiseSystem.playerNoise('HIT_IMPACT');
        } else {
            NoiseSystem.monsterNoise(attacker, 'HIT_IMPACT');
        }
    }

    // Check for weapon status effect application
    applyWeaponEffects(attacker, defender, result);

    // Check death
    if (defender.hp <= 0) {
        handleDeath(defender, attacker);
    }
}

/**
 * Apply damage to an entity
 */
function applyDamage(entity, damage, source) {
    // DEBUG: Skip damage for player if godMode is enabled
    if (entity === game.player && window.godMode) {
        console.log('[DEBUG] God mode: Player took no damage');
        return;
    }

    // Validate damage is a valid number
    if (typeof damage !== 'number' || isNaN(damage)) {
        console.warn('[Combat] Invalid damage value:', damage, '- defaulting to 1');
        damage = 1;
    }

    // Apply damage reduction from status effects
    if (typeof StatusEffectSystem !== 'undefined') {
        const damageTakenMod = StatusEffectSystem.getStatModifier(entity, 'damageTaken');
        if (typeof damageTakenMod === 'number' && !isNaN(damageTakenMod)) {
            damage = Math.floor(damage * (1 + damageTakenMod));
        }
    }

    // Ensure damage is still valid after modifications
    if (isNaN(damage)) damage = 1;

    entity.hp -= damage;

    // Fix NaN HP (defensive)
    if (isNaN(entity.hp)) {
        console.warn('[Combat] HP became NaN for', entity.name, '- resetting to 0');
        entity.hp = 0;
    }

    // Interrupt shout if enemy is shouting
    if (entity !== game.player && entity.ai?.currentState === 'shouting') {
        if (typeof entity.ai.interruptShout === 'function') {
            entity.ai.interruptShout();
        }
        if (typeof addMessage === 'function') {
            addMessage(`Interrupted ${entity.name}'s alert!`);
        }
    }

    // Break invisibility on damage
    if (entity.isInvisible) {
        entity.isInvisible = false;
        if (typeof removeStatusEffect === 'function') {
            removeStatusEffect(entity, 'invisible');
        }
    }
}

/**
 * Apply weapon special effects on hit
 */
function applyWeaponEffects(attacker, defender, damageResult) {
    const weapon = attacker.equipped?.MAIN;
    if (!weapon) return;

    // Element status effect
    if (weapon.element && typeof applyStatusEffect === 'function') {
        const effectChance = (weapon.elementPower || 1) * 0.1; // 10% per power level
        if (Math.random() < effectChance) {
            const elementEffects = {
                fire: 'burning',
                ice: 'chilled',
                water: 'drenched',
                nature: 'poisoned',
                death: 'withered',
                arcane: 'disrupted',
                dark: 'blinded',
                holy: 'sanctified'
            };
            const effect = elementEffects[weapon.element];
            if (effect) {
                applyStatusEffect(defender, effect, attacker);
            }
        }
    }

    // Weapon special effect
    if (weapon.special?.onHit && typeof weapon.special.onHit === 'function') {
        weapon.special.onHit(attacker, defender, damageResult);
    }
}

// ============================================================================
// DEATH HANDLING
// ============================================================================

function handleDeath(entity, killer) {
    if (entity === game.player) {
        if (typeof handlePlayerDeath === 'function') {
            handlePlayerDeath();
        } else {
            game.state = 'gameover';
        }
        return;
    }

    // Enemy death
    if (typeof addMessage === 'function') {
        addMessage(`Defeated ${entity.name}!`);
    }

    // Death noise
    if (typeof NoiseSystem !== 'undefined') {
        NoiseSystem.monsterNoise(entity, 'DEATH_CRY');
    }

    // Clear status effects
    if (typeof clearStatusEffects === 'function') {
        clearStatusEffects(entity);
    }

    // Spawn loot
    if (typeof spawnLootPile === 'function') {
        spawnLootPile(Math.floor(entity.gridX), Math.floor(entity.gridY), entity);
    }

    // Award XP
    const xpReward = entity.xp || calculateXPReward(entity);
    game.player.xp += xpReward;
    
    if (typeof addMessage === 'function') {
        addMessage(`Gained ${xpReward} XP!`);
    }

    // Check level up
    if (typeof checkLevelUp === 'function') {
        checkLevelUp(game.player);
    }

    // Award skill XP
    if (typeof awardSkillXp === 'function') {
        const weapon = game.player.equipped?.MAIN;
        const specialty = weapon?.specialty || weapon?.weaponType || 'unarmed';
        awardSkillXp(game.player, specialty, xpReward);
    }

    // Unregister from AI
    if (entity.ai && typeof AIManager !== 'undefined') {
        AIManager.unregisterEnemy(entity);
    }

    // Remove from social groups
    if (typeof MonsterSocialSystem !== 'undefined') {
        if (entity.packId) {
            const pack = MonsterSocialSystem.packs.get(entity.packId);
            if (pack) {
                pack.members = pack.members.filter(m => m !== entity);
            }
        }
    }

    // Remove from enemies array
    const index = game.enemies.indexOf(entity);
    if (index > -1) {
        game.enemies.splice(index, 1);
    }

    // Disengage anyone targeting this entity
    if (game.player.combat?.currentTarget === entity) {
        disengageCombat(game.player);
    }
    for (const enemy of game.enemies) {
        if (enemy.combat?.currentTarget === entity) {
            disengageCombat(enemy);
        }
    }
}

function calculateXPReward(entity) {
    const tierXP = {
        'TIER_3': 10,
        'TIER_2': 25,
        'TIER_1': 50,
        'ELITE': 100,
        'BOSS': 500
    };
    return tierXP[entity.tier] || 15;
}

// ============================================================================
// RANGE & DISTANCE
// ============================================================================

function canAttackTarget(attacker, target) {
    // FOG OF WAR: Player must be able to see target to attack
    if (attacker === game.player && target !== game.player) {
        const targetX = Math.floor(target.gridX ?? target.x);
        const targetY = Math.floor(target.gridY ?? target.y);
        const tile = game.map?.[targetY]?.[targetX];
        if (!tile || !tile.visible) {
            return false; // Can't attack what you can't see
        }
    }

    const distance = getDistance(attacker, target);
    const range = attacker.combat?.attackRange || 1;
    return distance <= range + 0.5; // Small buffer for diagonal
}

function getDistance(entity1, entity2) {
    const x1 = entity1.gridX ?? entity1.x;
    const y1 = entity1.gridY ?? entity1.y;
    const x2 = entity2.gridX ?? entity2.x;
    const y2 = entity2.gridY ?? entity2.y;
    
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return Math.max(dx, dy); // Chebyshev distance
}

function getCurrentRoom(entity) {
    if (!game.rooms) return null;
    
    const x = entity.gridX ?? entity.x;
    const y = entity.gridY ?? entity.y;
    
    for (const room of game.rooms) {
        const rx = room.floorX ?? room.x;
        const ry = room.floorY ?? room.y;
        const rw = room.floorWidth ?? room.width;
        const rh = room.floorHeight ?? room.height;
        
        if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
            return room;
        }
    }
    return null;
}

// ============================================================================
// FALLBACK DAMAGE CALCULATION
// ============================================================================

function calculateDamageFallback(attacker, defender) {
    const result = {
        finalDamage: 0,
        isHit: true,
        isCrit: false,
        messages: []
    };

    // Hit check
    if (Math.random() < COMBAT_CONFIG.missChance) {
        result.isHit = false;
        result.messages.push('MISS');
        return result;
    }

    // Base damage
    const weapon = attacker.equipped?.MAIN;
    let damage = weapon?.stats?.damage || weapon?.damage || 8;
    
    // Stat bonus
    const str = attacker.stats?.STR || attacker.stats?.str || 10;
    damage += Math.floor(str * 0.5);

    // Crit
    const critChance = attacker.critChance || 5;
    if (Math.random() * 100 < critChance) {
        damage = Math.floor(damage * 1.5);
        result.isCrit = true;
        result.messages.push('CRITICAL');
    }

    // Defense
    const defense = defender.pDef || 0;
    const reduction = Math.min(0.5, defense / 100);
    damage = Math.floor(damage * (1 - reduction));

    // Minimum damage
    result.finalDamage = Math.max(COMBAT_CONFIG.minDamage, damage);
    
    return result;
}

// ============================================================================
// VISUAL FEEDBACK
// ============================================================================

const damageNumbers = [];

function showDamageNumber(entity, damage, color) {
    const x = entity.displayX ?? entity.gridX ?? entity.x;
    const y = entity.displayY ?? entity.gridY ?? entity.y;
    
    damageNumbers.push({
        x: x,
        y: y,
        damage: damage,
        color: color,
        lifetime: 1.0,
        yOffset: 0
    });
}

function updateDamageNumbers(deltaTime) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dmg = damageNumbers[i];
        dmg.lifetime -= deltaTime / 1000;
        dmg.yOffset += (deltaTime / 1000) * 0.5;

        if (dmg.lifetime <= 0) {
            damageNumbers.splice(i, 1);
        }
    }
}

function renderDamageNumbers(camX, camY, tileSize, offset) {
    if (typeof ctx === 'undefined') return;
    
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';

    for (const dmg of damageNumbers) {
        const screenX = (dmg.x - camX) * tileSize + offset;
        const screenY = (dmg.y - camY) * tileSize - (dmg.yOffset * tileSize);

        const alpha = Math.max(0, dmg.lifetime);
        ctx.globalAlpha = alpha;

        // Outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(dmg.damage === 0 ? 'MISS' : dmg.damage, screenX, screenY);

        // Fill
        ctx.fillStyle = dmg.color;
        ctx.fillText(dmg.damage === 0 ? 'MISS' : dmg.damage, screenX, screenY);

        ctx.globalAlpha = 1.0;
    }
}

// ============================================================================
// ACTIVE COMBAT SYSTEMS (Mana, GCD, Cooldowns)
// ============================================================================

/**
 * Update mana regeneration for player
 */
function updateManaRegen(deltaTime) {
    const player = game.player;
    if (!player || player.mp === undefined) return;

    // Regenerate mana (updates every frame, 100ms visual smoothness)
    const regenAmount = (player.manaRegen / 1000) * deltaTime;  // Convert to per-frame
    player.mp = Math.min(player.maxMp, player.mp + regenAmount);
}

/**
 * Update global cooldown (GCD)
 */
function updateGCD(deltaTime) {
    const player = game.player;
    if (!player?.gcd) return;

    if (player.gcd.active && player.gcd.remaining > 0) {
        player.gcd.remaining -= deltaTime / 1000;
        if (player.gcd.remaining <= 0) {
            player.gcd.active = false;
            player.gcd.remaining = 0;
        }
    }
}

/**
 * Update action cooldowns
 */
function updateActionCooldowns(deltaTime) {
    const player = game.player;
    if (!player?.actionCooldowns) {
        console.log('[UpdateCooldowns] No actionCooldowns object on player!');
        return;
    }

    const dt = deltaTime / 1000;
    let anyChanged = false;

    for (const key in player.actionCooldowns) {
        const oldValue = player.actionCooldowns[key];
        if (oldValue > 0) {
            player.actionCooldowns[key] = Math.max(0, oldValue - dt);
            if (player.actionCooldowns[key] !== oldValue) {
                anyChanged = true;
            }
        }
    }

    if (anyChanged) {
        console.log('[UpdateCooldowns]', player.actionCooldowns);
    }

    // Update item cooldowns
    if (player.itemCooldowns) {
        for (const itemId in player.itemCooldowns) {
            if (player.itemCooldowns[itemId] > 0) {
                player.itemCooldowns[itemId] = Math.max(0, player.itemCooldowns[itemId] - dt);
            }
        }
    }
}

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const CombatSystemManager = {
    name: 'combat-system',

    init(game) {
        damageNumbers.length = 0;
        console.log('[CombatSystem] Initialized');
    },

    update(dt) {
        updateCombat(dt);
        updateDamageNumbers(dt);
        updateManaRegen(dt);
        updateGCD(dt);
        updateActionCooldowns(dt);

        // Update projectiles if system is loaded
        if (typeof updateProjectiles === 'function') {
            updateProjectiles(dt);
        }
    },

    cleanup() {
        damageNumbers.length = 0;
        if (game.player?.combat) {
            disengageCombat(game.player);
        }
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('combat-system', CombatSystemManager, 50);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.COMBAT_CONFIG = COMBAT_CONFIG;
    window.updateCombat = updateCombat;
    window.engageCombat = engageCombat;
    window.disengageCombat = disengageCombat;
    window.performAttack = performAttack;
    window.applyDamage = applyDamage;
    window.handleDeath = handleDeath;
    window.canAttackTarget = canAttackTarget;
    window.getDistance = getDistance;
    window.getCurrentRoom = getCurrentRoom;
    window.showDamageNumber = showDamageNumber;
    window.updateDamageNumbers = updateDamageNumbers;
    window.renderDamageNumbers = renderDamageNumbers;
    window.damageNumbers = damageNumbers;

    // DEBUG: Enable god mode for testing (set to false for production)
    window.godMode = true;
}

console.log('✅ Combat system loaded (3-layer damage integration)');
console.log('⚠️ GOD MODE ENABLED - Player takes no damage');
