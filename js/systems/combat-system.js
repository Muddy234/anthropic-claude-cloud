// ============================================================================
// COMBAT SYSTEM - The Shifting Chasm
// ============================================================================
// Updated: Integrates 2-layer damage system (Weapon/Armor, Element)
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
    debugLogging: true,
    // Enemy attack animation settings
    enemyAttackDuration: 400,     // Total enemy attack animation duration (ms)
    enemyWindupPercent: 0.35,     // 35% of attack is windup (140ms at 400ms total)
    enemyWhiteFlashStart: 0.85,   // White flash starts at 85% of windup (last 15%)
    playerWindupPercent: 0.15,    // Player windup is 15% for comparison
    // Combat disengage settings
    combatDisengageTime: 30000    // Time (ms) without combat before auto-disengage (30 seconds)
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
            // Skip dead enemies - they should not attack
            if (enemy.hp <= 0) continue;

            if (enemy.combat?.isInCombat) {
                updateEntityCombat(enemy, deltaTime);
            }
        }
    }

    // Check for player combat disengage (flee mechanic)
    updatePlayerCombatDisengage(deltaTime);
}

/**
 * Check if player should disengage from combat after fleeing (leaving room)
 * Combat ends after 30 seconds if no enemies are chasing or in same room
 */
function updatePlayerCombatDisengage(deltaTime) {
    const player = game.player;
    if (!player) return;

    // Only check if player is flagged as in combat
    if (!player.inCombat && !player.combat?.isInCombat) return;

    // Check if any enemies are actively targeting/chasing the player
    let hasActiveThreats = false;

    if (game.enemies) {
        for (const enemy of game.enemies) {
            if (enemy.hp <= 0) continue;

            // Enemy is chasing or in combat with player
            if (enemy.state === 'chasing' || enemy.combat?.isInCombat) {
                // Check if enemy's target is the player
                if (enemy.combat?.currentTarget === player) {
                    hasActiveThreats = true;
                    break;
                }
                // Check if enemy is in same room as player
                if (typeof isInSameRoom === 'function' && isInSameRoom(enemy, player)) {
                    hasActiveThreats = true;
                    break;
                }
            }
        }
    }

    // Initialize disengage timer if not exists
    if (player.combatDisengageTimer === undefined) {
        player.combatDisengageTimer = 0;
    }

    if (hasActiveThreats) {
        // Reset timer if there are active threats
        player.combatDisengageTimer = 0;
    } else {
        // No active threats - increment timer
        player.combatDisengageTimer += deltaTime * 1000; // Convert to ms

        // Check if timer exceeded disengage threshold
        if (player.combatDisengageTimer >= COMBAT_CONFIG.combatDisengageTime) {
            // Disengage player from combat
            disengageCombat(player);
            player.combatDisengageTimer = 0;

            if (typeof addMessage === 'function') {
                addMessage('You have escaped combat.');
            }

            if (COMBAT_CONFIG.debugLogging) {
                console.log('[Combat] Player disengaged after 30s with no threats');
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

    // Initialize attack animation state if needed
    if (!combat.attackAnimation) {
        combat.attackAnimation = {
            state: 'idle',      // idle, windup, executing, recovery
            timer: 0,
            maxTimer: 0,
            type: 'melee',      // melee, ranged, magic
            targetLocked: null  // Target position locked at windup start
        };
    }

    // Handle attack animation states
    if (combat.attackAnimation.state !== 'idle') {
        updateAttackAnimation(entity, deltaTime);
        return;  // Don't process normal combat during animation
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
        // Try to use a special ability first (for enemies with abilities)
        let usedAbility = false;
        if (entity !== game.player && typeof EnemyAbilitySystem !== 'undefined') {
            usedAbility = EnemyAbilitySystem.tryUseAbility(entity, combat.currentTarget);
        }

        // Fall back to basic attack with windup if no ability used
        if (!usedAbility) {
            startAttackWindup(entity, combat.currentTarget);
        } else {
            // Abilities have their own telegraph, reset cooldown
            const baseSpeed = combat.attackSpeed || 1.0;
            const attackTimeMs = COMBAT_CONFIG.baseAttackTime * baseSpeed;
            combat.attackCooldown = attackTimeMs / 1000;
        }
    }
}

/**
 * Start attack windup animation
 */
function startAttackWindup(attacker, target) {
    const combat = attacker.combat;
    const duration = COMBAT_CONFIG.enemyAttackDuration;

    // Determine attack type based on enemy's equipped weapon or abilities
    let attackType = 'melee';
    if (attacker.attackRange && attacker.attackRange > 2) {
        attackType = 'ranged';
    }
    if (attacker.element && ['fire', 'ice', 'arcane', 'void', 'death'].includes(attacker.element)) {
        attackType = 'magic';
    }

    // Override with combat-specific attack type if defined
    if (combat.attackType) {
        attackType = combat.attackType;
    }

    combat.attackAnimation = {
        state: 'windup',
        timer: duration * COMBAT_CONFIG.enemyWindupPercent,
        maxTimer: duration * COMBAT_CONFIG.enemyWindupPercent,
        totalDuration: duration,
        type: attackType,
        targetLocked: {
            x: target.gridX,
            y: target.gridY,
            entity: target
        }
    };

    // Face the target
    const dx = target.gridX - attacker.gridX;
    const dy = target.gridY - attacker.gridY;
    if (Math.abs(dx) > Math.abs(dy)) {
        attacker.facing = dx > 0 ? 'right' : 'left';
    } else {
        attacker.facing = dy > 0 ? 'down' : 'up';
    }
}

/**
 * Update attack animation state
 */
function updateAttackAnimation(entity, deltaTime) {
    const combat = entity.combat;
    const anim = combat.attackAnimation;

    // Dead entities cannot attack - cancel animation
    if (entity.hp <= 0) {
        anim.state = 'idle';
        anim.timer = 0;
        return;
    }

    anim.timer -= deltaTime;

    switch (anim.state) {
        case 'windup':
            // Check if windup is complete
            if (anim.timer <= 0) {
                // Execute the attack (only if attacker is still alive)
                const target = anim.targetLocked?.entity;
                if (entity.hp > 0 && target && target.hp > 0) {
                    performAttack(entity, target);
                }

                // Move to recovery phase (remaining 65% of attack duration)
                anim.state = 'recovery';
                anim.timer = anim.totalDuration * (1 - COMBAT_CONFIG.enemyWindupPercent);
            }
            break;

        case 'recovery':
            if (anim.timer <= 0) {
                // Reset to idle
                anim.state = 'idle';
                anim.timer = 0;

                // Set attack cooldown
                const baseSpeed = combat.attackSpeed || 1.0;
                const attackTimeMs = COMBAT_CONFIG.baseAttackTime * baseSpeed;
                combat.attackCooldown = attackTimeMs / 1000;
            }
            break;
    }
}

/**
 * Get attack animation progress for rendering
 * @returns {object|null} Animation info or null if not animating
 */
function getAttackAnimationState(entity) {
    const anim = entity.combat?.attackAnimation;
    if (!anim || anim.state === 'idle') return null;

    const windupDuration = anim.maxTimer;
    const windupProgress = anim.state === 'windup'
        ? 1 - (anim.timer / windupDuration)
        : 1;

    // Calculate if in white flash phase (last 15% of windup)
    const flashStart = COMBAT_CONFIG.enemyWhiteFlashStart;
    const inFlashPhase = anim.state === 'windup' && windupProgress >= flashStart;

    return {
        state: anim.state,
        type: anim.type,
        progress: windupProgress,
        inFlashPhase: inFlashPhase,
        targetLocked: anim.targetLocked,
        isWindup: anim.state === 'windup',
        isRecovery: anim.state === 'recovery'
    };
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
    // Get current room for context
    const room = getCurrentRoom(attacker);

    // Enemy combo system: track which attack in the combo (1, 2, or 3)
    const isEnemy = attacker !== game.player;
    const comboCount = isEnemy ? (attacker.combat?.comboCount || 1) : 1;
    const isComboFinisher = isEnemy && comboCount === 3;

    // Use DamageCalculator if available
    let result;
    if (typeof DamageCalculator !== 'undefined') {
        result = DamageCalculator.calculateDamage(attacker, defender, room);
    } else {
        // Fallback to simple calculation
        result = calculateDamageFallback(attacker, defender);
    }

    if (!result.isHit) {
        // Miss - still advance combo for enemies
        if (isEnemy && attacker.combat) {
            attacker.combat.comboCount = (comboCount % 3) + 1;
        }
        if (typeof addMessage === 'function') {
            addMessage(`${attacker.name || 'You'} missed!`);
        }
        showDamageNumber(defender, 0, '#888888');
        return;
    }

    // Apply combo finisher bonus for enemies (1.5x damage on 3rd hit)
    if (isComboFinisher) {
        result.finalDamage = Math.floor(result.finalDamage * 1.5);
        result.isComboFinisher = true;
    }

    // Advance enemy combo counter (1 -> 2 -> 3 -> 1)
    if (isEnemy && attacker.combat) {
        attacker.combat.comboCount = (comboCount % 3) + 1;
    }

    // Apply damage
    applyDamage(defender, result.finalDamage, attacker, result);

    // Combat enhancements hook (knockback, screen shake, stagger)
    if (typeof onCombatHit === 'function') {
        onCombatHit(attacker, defender, result);
    }

    // Note: Visual combat effects are handled by mouse-attack-system.js for player attacks
    // Enemy attacks don't spawn visual slash effects (to reduce visual clutter and lag)

    // Build message
    let message = `${attacker.name || 'You'} hit ${defender.name || 'target'} for ${result.finalDamage}!`;

    // Add modifiers to message
    if (result.isCrit) message += ' CRITICAL!';
    if (result.isComboFinisher) message += ' COMBO!';
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
    if (result.isComboFinisher) color = '#ff00ff';  // Purple for enemy combo finisher
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
function applyDamage(entity, damage, source, damageResult) {
    // Check for i-frames (dash invincibility)
    if (entity === game.player && typeof playerHasIframes === 'function' && playerHasIframes()) {
        console.log('[Combat] Player has i-frames - damage blocked');
        return;
    }

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

    // === VISUAL FEEDBACK FOR PLAYER DAMAGE ===
    if (entity === game.player) {
        // Trigger screen damage flash (CotDG-style red vignette)
        if (typeof triggerScreenEffect === 'function') {
            // Intensity scales with damage percentage
            const dmgPct = Math.min(1, damage / entity.maxHp);
            const intensity = 0.2 + dmgPct * 0.4; // 0.2 to 0.6
            triggerScreenEffect('damage', intensity, 200);
        }

        // Trigger entity hit flash
        if (!entity.hitFlash) entity.hitFlash = { active: false, time: 0 };
        entity.hitFlash.active = true;
        entity.hitFlash.time = Date.now();
        entity.hitFlash.duration = 150;
    }

    // === VISUAL FEEDBACK FOR ENEMY DAMAGE ===
    if (entity !== game.player) {
        // Trigger entity hit flash for enemies
        if (!entity.hitFlash) entity.hitFlash = { active: false, time: 0 };
        entity.hitFlash.active = true;
        entity.hitFlash.time = Date.now();
        entity.hitFlash.duration = 100;
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

    // Trigger damage-based mechanics for enemies
    if (entity !== game.player && typeof EnemyAbilitySystem !== 'undefined') {
        entity.lastDamageTime = Date.now();  // For regeneration passive
        EnemyAbilitySystem.checkMechanics(entity, 'on_damaged', { damage, source });
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
 * Includes damage type effects: Blade=Bleed, Blunt=Stun, Pierce=CritBonus (handled in DamageCalculator)
 */
function applyWeaponEffects(attacker, defender, damageResult) {
    const weapon = attacker.equipped?.MAIN;
    if (!weapon) return;

    // === DAMAGE TYPE EFFECTS (Base effects for weapon categories) ===
    const damageType = weapon.damageType;
    if (damageType && typeof applyStatusEffect === 'function') {
        // Blade weapons: 15% base chance to cause Bleeding
        if (damageType === 'blade') {
            const bleedChance = weapon.special?.bleedChance || 0.15;
            if (Math.random() < bleedChance) {
                applyStatusEffect(defender, 'bleeding', attacker);
                if (typeof addMessage === 'function') {
                    addMessage(`${defender.name || 'Enemy'} is bleeding!`, 'combat');
                }
            }
        }

        // Blunt weapons: 15% base chance to cause Stun (1 second)
        if (damageType === 'blunt') {
            const stunChance = weapon.special?.stunChance || 0.15;
            if (Math.random() < stunChance) {
                // Apply shorter stun (1 second instead of default 2 seconds)
                if (typeof StatusEffectSystem !== 'undefined') {
                    StatusEffectSystem.applyEffect(defender, 'stunned', attacker, { duration: 1000 });
                } else {
                    applyStatusEffect(defender, 'stunned', attacker);
                }
                if (typeof addMessage === 'function') {
                    addMessage(`${defender.name || 'Enemy'} is stunned!`, 'combat');
                }
            }
        }
    }

    // === ELEMENT STATUS EFFECTS ===
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

    // === WEAPON SPECIAL EFFECTS (Custom per-weapon effects) ===
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

    // Immediately disengage combat for the dead entity to prevent ghost attacks
    if (entity.combat) {
        entity.combat.isInCombat = false;
        entity.combat.currentTarget = null;
        if (entity.combat.attackAnimation) {
            entity.combat.attackAnimation.state = 'idle';
            entity.combat.attackAnimation.timer = 0;
        }
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
        let specialty = weapon?.specialty || weapon?.weaponType || 'unarmed';

        // For staffs and tomes, use the weapon's element as specialty (routes XP to magic skill)
        // This allows magic users to level up their element skill instead of blunt/staff
        if (weapon && (weapon.weaponType === 'staff' || weapon.weaponType === 'tome' || weapon.weaponType === 'wand')) {
            if (weapon.element) {
                specialty = weapon.element;
            } else {
                // Fallback to arcane for staffs/tomes without an element
                specialty = 'arcane';
            }
        }

        // Normalize specialty to lowercase (defensive)
        specialty = String(specialty).toLowerCase();

        console.log(`[SkillXP] Awarding ${xpReward} XP to specialty: ${specialty}`);
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
    // Fallback XP calculation (matches enemy-spawner.js values)
    const tierXP = {
        'TIER_3': 15,   // Increased for smoother early leveling
        'TIER_2': 30,
        'TIER_1': 55,
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

// ============================================================================
// FLOATING COMBAT TEXT - CotDG Inspired Damage Numbers
// ============================================================================
const damageNumbers = [];

// Combat text color palette
const COMBAT_TEXT_COLORS = {
    normal: '#ffffff',
    crit: '#ff4444',
    critGlow: '#ff8888',
    heal: '#44ff44',
    healGlow: '#88ff88',
    miss: '#888888',
    resist: '#8888ff',
    poison: '#88ff44',
    fire: '#ff8844',
    ice: '#44ddff',
    lightning: '#ffff44',
    xp: '#44aaff',
    gold: '#ffcc00',
    levelup: '#ffdd00'
};

/**
 * Show floating damage number - CotDG style
 * @param {object} entity - Target entity
 * @param {number|string} damage - Damage amount or text
 * @param {string} color - Color override
 * @param {object} options - Additional options (isCrit, isHeal, type, etc.)
 */
function showDamageNumber(entity, damage, color, options = {}) {
    const x = entity.displayX ?? entity.gridX ?? entity.x;
    const y = entity.displayY ?? entity.gridY ?? entity.y;

    // Determine display properties
    const isCrit = options.isCrit || false;
    const isHeal = options.isHeal || false;
    const isMiss = damage === 0 || damage === 'MISS';
    const type = options.type || 'normal';

    // Calculate font size based on damage magnitude
    let fontSize = 20;
    if (typeof damage === 'number' && damage > 0) {
        fontSize = Math.min(36, 18 + Math.floor(Math.log10(Math.max(1, damage)) * 4));
    }
    if (isCrit) fontSize += 6;
    if (isMiss) fontSize = 16;

    // Determine color
    let finalColor = color;
    if (!finalColor) {
        if (isMiss) finalColor = COMBAT_TEXT_COLORS.miss;
        else if (isHeal) finalColor = COMBAT_TEXT_COLORS.heal;
        else if (isCrit) finalColor = COMBAT_TEXT_COLORS.crit;
        else if (type && COMBAT_TEXT_COLORS[type]) finalColor = COMBAT_TEXT_COLORS[type];
        else finalColor = COMBAT_TEXT_COLORS.normal;
    }

    // Random horizontal offset for visual variety
    const xOffset = (Math.random() - 0.5) * 0.5;

    damageNumbers.push({
        x: x + xOffset,
        y: y,
        damage: damage,
        color: finalColor,
        lifetime: isCrit ? 1.5 : 1.2,
        maxLifetime: isCrit ? 1.5 : 1.2,
        yOffset: 0,
        xVelocity: (Math.random() - 0.5) * 0.3,
        yVelocity: -1.2 - Math.random() * 0.5,
        fontSize: fontSize,
        isCrit: isCrit,
        isHeal: isHeal,
        scale: isCrit ? 1.3 : 1.0,
        scaleDir: -1  // Shrinking for crits
    });
}

/**
 * Show XP gain text
 */
function showXPGain(entity, amount) {
    showDamageNumber(entity, `+${amount} XP`, COMBAT_TEXT_COLORS.xp, { type: 'xp' });
}

/**
 * Show gold gain text
 */
function showGoldGain(entity, amount) {
    showDamageNumber(entity, `+${amount}G`, COMBAT_TEXT_COLORS.gold, { type: 'gold' });
}

/**
 * Show level up text
 */
function showLevelUp(entity, level) {
    showDamageNumber(entity, `LEVEL ${level}!`, COMBAT_TEXT_COLORS.levelup, { isCrit: true, type: 'levelup' });
}

function updateDamageNumbers(deltaTime) {
    const dt = deltaTime / 1000;

    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dmg = damageNumbers[i];
        dmg.lifetime -= dt;

        // Apply velocity
        dmg.x += dmg.xVelocity * dt;
        dmg.yOffset += dmg.yVelocity * dt;

        // Slow down horizontal movement
        dmg.xVelocity *= 0.95;

        // Gravity effect (slow down upward, speed up downward)
        dmg.yVelocity += dt * 2;

        // Crit scale animation
        if (dmg.isCrit && dmg.scale > 1.0) {
            dmg.scale -= dt * 2;
            if (dmg.scale < 1.0) dmg.scale = 1.0;
        }

        if (dmg.lifetime <= 0) {
            damageNumbers.splice(i, 1);
        }
    }
}

function renderDamageNumbers(camX, camY, tileSize, offset) {
    if (typeof ctx === 'undefined') return;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const dmg of damageNumbers) {
        const screenX = (dmg.x - camX) * tileSize + offset + tileSize / 2;
        const screenY = (dmg.y - camY) * tileSize + dmg.yOffset * tileSize;

        // Calculate alpha (fade out in last 30%)
        const lifetimePct = dmg.lifetime / dmg.maxLifetime;
        const alpha = lifetimePct < 0.3 ? lifetimePct / 0.3 : 1.0;

        ctx.globalAlpha = alpha;

        // Calculate scaled font size
        const scaledSize = Math.floor(dmg.fontSize * dmg.scale);
        ctx.font = `bold ${scaledSize}px monospace`;

        // Format display text
        const displayText = dmg.damage === 0 ? 'MISS' : dmg.damage.toString();

        // Glow effect for crits/heals
        if (dmg.isCrit || dmg.isHeal) {
            ctx.shadowColor = dmg.color;
            ctx.shadowBlur = 8;
        }

        // Outline (thicker for larger text)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2, scaledSize / 8);
        ctx.strokeText(displayText, screenX, screenY);

        // Fill
        ctx.fillStyle = dmg.color;
        ctx.fillText(displayText, screenX, screenY);

        // Extra outline for crits
        if (dmg.isCrit) {
            ctx.strokeStyle = '#440000';
            ctx.lineWidth = 1;
            ctx.strokeText(displayText, screenX, screenY);
        }

        ctx.shadowBlur = 0;
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
 * Update active combat action cooldowns (renamed to avoid skill-system conflict)
 */
function updateActiveCombatCooldowns(deltaTime) {
    const player = game.player;
    if (!player?.actionCooldowns) return;

    const dt = deltaTime / 1000;

    // Update action cooldowns
    for (const key in player.actionCooldowns) {
        if (player.actionCooldowns[key] > 0) {
            player.actionCooldowns[key] = Math.max(0, player.actionCooldowns[key] - dt);
        }
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
        updateActiveCombatCooldowns(dt);

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
    window.showXPGain = showXPGain;
    window.showGoldGain = showGoldGain;
    window.showLevelUp = showLevelUp;
    window.COMBAT_TEXT_COLORS = COMBAT_TEXT_COLORS;
    window.updateDamageNumbers = updateDamageNumbers;
    window.renderDamageNumbers = renderDamageNumbers;
    window.damageNumbers = damageNumbers;
    // Attack animation exports
    window.getAttackAnimationState = getAttackAnimationState;
    window.startAttackWindup = startAttackWindup;

    // DEBUG: God mode toggle (controlled via debug.godMode())
    window.godMode = false;
}

console.log('✅ Combat system loaded (3-layer damage integration)');
