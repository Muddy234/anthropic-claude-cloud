// === SKILLS-COMBAT INTEGRATION ===
// Bridges skills.js with combat-system.js
// Handles XP awards, damage multipliers, action execution, and status effects

// ============================================================================
// STATUS EFFECTS SYSTEM
// ============================================================================

// Active status effects on all entities
const statusEffects = {
    // entityId -> [{ type, damage, ticksRemaining, interval, timer, source }]
};

// Entity ID counter for tracking
let entityIdCounter = 0;

/**
 * Get or assign an entity ID for status effect tracking
 */
function getEntityId(entity) {
    if (entity._statusId === undefined) {
        entity._statusId = entityIdCounter++;
    }
    return entity._statusId;
}

/**
 * Apply a status effect to an entity
 */
function applyStatusEffect(target, effect) {
    const entityId = getEntityId(target);
    
    if (!statusEffects[entityId]) {
        statusEffects[entityId] = [];
    }
    
    // Check if we should stack or refresh
    const existing = statusEffects[entityId].find(e => e.type === effect.type && e.source === effect.source);
    
    if (existing) {
        // Refresh duration
        existing.ticksRemaining = effect.ticks || existing.ticksRemaining;
        existing.timer = 0;
        console.log(`Refreshed ${effect.type} on ${target.name || 'target'}`);
    } else {
        // Add new effect
        statusEffects[entityId].push({
            type: effect.type,
            damage: effect.damage || 0,
            ticksRemaining: effect.ticks || 1,
            interval: effect.interval || 2000,
            timer: 0,
            duration: effect.duration || 0,
            source: effect.source || 'unknown',
            data: effect.data || {}
        });
        console.log(`Applied ${effect.type} to ${target.name || 'target'}`);
    }
}

/**
 * Update all status effects (call every frame)
 */
function updateStatusEffects(deltaTime) {
    for (const entityId in statusEffects) {
        const effects = statusEffects[entityId];
        const entity = findEntityById(parseInt(entityId));
        
        if (!entity || entity.hp <= 0) {
            delete statusEffects[entityId];
            continue;
        }
        
        for (let i = effects.length - 1; i >= 0; i--) {
            const effect = effects[i];
            
            // Handle different effect types
            switch (effect.type) {
                case 'bleed':
                case 'burn':
                    // DoT effects - tick damage over time
                    effect.timer += deltaTime;
                    if (effect.timer >= effect.interval) {
                        effect.timer -= effect.interval;
                        effect.ticksRemaining--;
                        
                        // Deal damage
                        entity.hp -= effect.damage;
                        showDamageNumber(entity, effect.damage, effect.type === 'burn' ? '#ff6600' : '#cc0000');
                        addMessage(`${entity.name || 'Target'} takes ${effect.damage} ${effect.type} damage!`);
                        
                        // Check death
                        if (entity.hp <= 0) {
                            handleDeathWithSkills(entity, effect.source);
                        }
                    }
                    
                    // Remove if no ticks left
                    if (effect.ticksRemaining <= 0) {
                        effects.splice(i, 1);
                    }
                    break;
                    
                case 'stun':
                case 'freeze':
                    // CC effects - prevent actions for duration
                    effect.duration -= deltaTime;
                    entity._isCC = true;
                    entity._ccType = effect.type;
                    
                    if (effect.duration <= 0) {
                        entity._isCC = false;
                        entity._ccType = null;
                        effects.splice(i, 1);
                        addMessage(`${entity.name || 'Target'} is no longer ${effect.type === 'stun' ? 'stunned' : 'frozen'}!`);
                    }
                    break;
                    
                case 'slow':
                    // Slow effect - reduce move speed
                    effect.duration -= deltaTime;
                    entity._slowPercent = effect.data.percent || 0.5;
                    
                    if (effect.duration <= 0) {
                        entity._slowPercent = 0;
                        effects.splice(i, 1);
                    }
                    break;
                    
                case 'mark':
                    // Damage amplification mark
                    effect.duration -= deltaTime;
                    entity._damageAmp = effect.data.damageAmplification || 0;
                    
                    if (effect.duration <= 0) {
                        entity._damageAmp = 0;
                        effects.splice(i, 1);
                        addMessage(`${entity.name || 'Target'} is no longer marked!`);
                    }
                    break;
            }
        }
        
        // Clean up empty arrays
        if (effects.length === 0) {
            delete statusEffects[entityId];
        }
    }
}

/**
 * Find entity by status ID
 */
function findEntityById(statusId) {
    if (game.player._statusId === statusId) return game.player;
    
    for (const enemy of game.enemies) {
        if (enemy._statusId === statusId) return enemy;
    }
    
    return null;
}

/**
 * Check if entity is crowd controlled
 */
function isEntityCC(entity) {
    return entity._isCC === true;
}

/**
 * Clear all status effects from an entity
 */
function clearStatusEffects(entity) {
    const entityId = getEntityId(entity);
    delete statusEffects[entityId];
    entity._isCC = false;
    entity._ccType = null;
    entity._slowPercent = 0;
    entity._damageAmp = 0;
}

// ============================================================================
// PLACED OBJECTS (Traps, Turrets)
// ============================================================================

// Active placed objects
const placedObjects = {
    traps: [],
    turrets: []
};

/**
 * Place a trap at position
 */
function placeTrap(owner, position, trapData) {
    // Check trap limit
    const ownerTraps = placedObjects.traps.filter(t => t.owner === owner);
    if (ownerTraps.length >= trapData.maxTraps) {
        // Remove oldest trap
        const oldestIndex = placedObjects.traps.findIndex(t => t.owner === owner);
        if (oldestIndex > -1) {
            placedObjects.traps.splice(oldestIndex, 1);
        }
    }
    
    placedObjects.traps.push({
        owner: owner,
        x: position.x,
        y: position.y,
        damage: trapData.damage,
        slow: trapData.slow,
        triggered: false
    });
    
    addMessage(`Trap placed at (${position.x}, ${position.y})`);
}

/**
 * Place a turret at position
 */
function placeTurret(owner, position, turretData) {
    // Check turret limit
    const ownerTurrets = placedObjects.turrets.filter(t => t.owner === owner);
    if (ownerTurrets.length >= turretData.maxTurrets) {
        // Remove oldest turret
        const oldestIndex = placedObjects.turrets.findIndex(t => t.owner === owner);
        if (oldestIndex > -1) {
            placedObjects.turrets.splice(oldestIndex, 1);
        }
    }
    
    placedObjects.turrets.push({
        owner: owner,
        x: position.x,
        y: position.y,
        damage: turretData.turret.damage,
        attackInterval: turretData.turret.attackInterval,
        attackTimer: 0,
        duration: turretData.turret.duration,
        hp: turretData.turret.hp,
        maxHp: turretData.turret.hp
    });
    
    addMessage(`Turret deployed at (${position.x}, ${position.y})`);
}

/**
 * Update placed objects (call every frame)
 */
function updatePlacedObjects(deltaTime) {
    // Update traps - check for enemy collisions
    for (let i = placedObjects.traps.length - 1; i >= 0; i--) {
        const trap = placedObjects.traps[i];
        
        if (trap.triggered) continue;
        
        // Check if any enemy is on the trap
        for (const enemy of game.enemies) {
            if (Math.floor(enemy.gridX) === trap.x && Math.floor(enemy.gridY) === trap.y) {
                // Trigger trap!
                trap.triggered = true;
                
                // Deal damage
                enemy.hp -= trap.damage;
                showDamageNumber(enemy, trap.damage, '#aa00aa');
                addMessage(`Trap triggered! ${enemy.name} takes ${trap.damage} damage!`);
                
                // Apply slow
                if (trap.slow) {
                    applyStatusEffect(enemy, {
                        type: 'slow',
                        duration: trap.slow.duration,
                        data: { percent: trap.slow.percent },
                        source: 'trap'
                    });
                }
                
                // Check death
                if (enemy.hp <= 0) {
                    handleDeathWithSkills(enemy, trap.owner);
                }
                
                // Remove trap
                placedObjects.traps.splice(i, 1);
                break;
            }
        }
    }
    
    // Update turrets
    for (let i = placedObjects.turrets.length - 1; i >= 0; i--) {
        const turret = placedObjects.turrets[i];
        
        // Reduce duration
        turret.duration -= deltaTime;
        if (turret.duration <= 0 || turret.hp <= 0) {
            addMessage('Turret destroyed!');
            placedObjects.turrets.splice(i, 1);
            continue;
        }
        
        // Attack timer
        turret.attackTimer += deltaTime;
        if (turret.attackTimer >= turret.attackInterval) {
            turret.attackTimer = 0;
            
            // Find nearest enemy
            let nearestEnemy = null;
            let nearestDist = Infinity;
            
            for (const enemy of game.enemies) {
                const dx = enemy.gridX - turret.x;
                const dy = enemy.gridY - turret.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < nearestDist && dist <= 5) { // 5 tile range
                    nearestDist = dist;
                    nearestEnemy = enemy;
                }
            }
            
            // Attack if target found
            if (nearestEnemy) {
                nearestEnemy.hp -= turret.damage;
                showDamageNumber(nearestEnemy, turret.damage, '#00aaaa');
                
                if (nearestEnemy.hp <= 0) {
                    handleDeathWithSkills(nearestEnemy, turret.owner);
                }
            }
        }
    }
}

// ============================================================================
// ENHANCED DAMAGE CALCULATION
// ============================================================================

/**
 * Enhanced damage calculation that includes skill bonuses
 * Replaces/wraps the original calculateDamage
 */
function calculateDamageWithSkills(attacker, defender) {
    // Get base damage from weapon or default
    let baseDamage = 5;
    let weaponSpecialty = null;
    
    // Check for equipped weapon
    if (attacker.equipped?.MAIN) {
        const weapon = attacker.equipped.MAIN;
        baseDamage = weapon.damage || weapon.baseDmg || 10;
        weaponSpecialty = weapon.specialty || null;
    }
    
    // Stat component
    const attackStat = attacker.stats?.STR || attacker.str || 10;
    const statMultiplier = 1 + (attackStat * 0.03); // +3% per STR
    
    // Skill multiplier (from proficiency + specialty)
    let skillMultiplier = 1.0;
    if (weaponSpecialty && attacker.skills && typeof getSkillDamageMultiplier === 'function') {
        skillMultiplier = getSkillDamageMultiplier(attacker, weaponSpecialty);
    }
    
    // Calculate raw damage
    let damage = baseDamage * statMultiplier * skillMultiplier;
    
    // Elemental modifier
    const attackElement = attacker.element || 'physical';
    const defenseElement = defender.element || 'physical';
    const elementalMod = getElementalModifier(attackElement, defenseElement);
    damage *= elementalMod;
    
    // Critical hit check
    let critChance = attacker.critChance || 5;
    
    // Add specialty crit bonuses
    if (weaponSpecialty && attacker.skills && typeof getSpecialtyBonuses === 'function') {
        const bonuses = getSpecialtyBonuses(attacker, weaponSpecialty);
        critChance += bonuses.critChance || 0;
    }
    
    const isCrit = Math.random() * 100 < critChance;
    const critMod = isCrit ? 1.5 : 1.0;
    damage *= critMod;
    
    // Damage amplification from marks
    if (defender._damageAmp) {
        damage *= (1 + defender._damageAmp);
    }
    
    // Subtract defense (with potential penetration)
    const defense = defender.pDef || 0;
    const penetration = attacker._armorPen || 0;
    const effectiveDefense = defense * (1 - penetration);
    damage -= effectiveDefense;
    
    // Minimum damage of 1
    damage = Math.max(1, damage);
    
    // Variance (0.95 to 1.05)
    const variance = 0.95 + (Math.random() * 0.10);
    damage *= variance;
    
    // Round to integer
    damage = Math.floor(damage);
    
    return { damage, isCrit, elementalMod, skillMultiplier };
}

// ============================================================================
// ENHANCED DEATH HANDLING
// ============================================================================

/**
 * Enhanced death handler that awards skill XP
 */
function handleDeathWithSkills(entity, killer) {
    if (entity === game.player) {
        // Player death
        game.state = 'gameover';
        
        // Reset skills on death
        if (typeof resetPlayerSkills === 'function') {
            resetPlayerSkills(game.player);
        }
        return;
    }
    
    // Enemy death
    addMessage(`Defeated ${entity.name}!`);
    
    // Clear status effects
    clearStatusEffects(entity);
    
    // Spawn loot pile instead of direct gold
	if (typeof spawnLootPile === 'function') {
    	spawnLootPile(Math.floor(entity.gridX), Math.floor(entity.gridY), entity);
	}
    
    // Award player XP
    const xpReward = entity.xp || 10;
    game.player.xp += xpReward;
    addMessage(`Gained ${xpReward} XP!`);
    
    // Award SKILL XP based on weapon held
    if (game.player.equipped?.MAIN?.weaponType && typeof awardSkillXp === 'function') {
        const weaponSpecialty = game.player.equipped.MAIN.weaponType;
        awardSkillXp(game.player, weaponSpecialty, xpReward);
    } else if (typeof awardSkillXp === 'function') {
        // Default to unarmed if no weapon
        awardSkillXp(game.player, 'unarmed', xpReward);
    }
    
    // Remove enemy
    const index = game.enemies.indexOf(entity);
    if (index > -1) {
        game.enemies.splice(index, 1);
    }
    
    // Disengage player if this was their target
    if (game.player.combat.currentTarget === entity) {
        disengageCombat(game.player);
    }
}

// ============================================================================
// ACTION EXECUTION IN COMBAT
// ============================================================================

/**
 * Execute a skill action in combat
 */
function executeSkillAction(player, actionId, target) {
    // Check if action can be used
    const check = canUseAction(player, actionId);
    if (!check.canUse) {
        addMessage(check.reason);
        return null;
    }
    
    const action = ACTIONS[actionId];
    const specialtyLevel = player.skills.specialties[action.specialty].level;
    const proficiencyLevel = player.skills.proficiencies[action.proficiency].level;
    
    // Calculate base action damage
    const actionDamage = calculateActionDamage(player, action, specialtyLevel, proficiencyLevel);
    
    // Execute based on action type
    let result;
    
    switch (action.type) {
        case 'damage':
        case 'sustain':
            result = executeDamageAction(player, action, target, actionDamage);
            break;
            
        case 'dot':
            result = executeDotAction(player, action, target, actionDamage);
            break;
            
        case 'cc':
            result = executeCCAction(player, action, target, actionDamage);
            break;
            
        case 'aoe':
            result = executeAoeAction(player, action, target, actionDamage);
            break;
            
        case 'mobility':
            result = executeMobilityAction(player, action, target, actionDamage);
            break;
            
        case 'utility':
        case 'summon':
        case 'debuff':
            result = executeUtilityAction(player, action, target, specialtyLevel);
            break;
            
        default:
            console.warn('Unknown action type:', action.type);
            return null;
    }
    
    // Start cooldown
    player.skills.actionCooldowns[actionId] = action.cooldown;
    
    addMessage(`Used ${action.name}!`);
    
    return result;
}

/**
 * Execute a direct damage action
 */
function executeDamageAction(player, action, target, actionDamage) {
    const result = action.execute(player, target, actionDamage);
    
    if (result.type === 'multi_hit') {
        // Multiple hits
        for (const hit of result.results) {
            hit.target.hp -= hit.damage;
            showDamageNumber(hit.target, hit.damage, '#ffaa00');
            
            if (hit.target.hp <= 0) {
                handleDeathWithSkills(hit.target, player);
            }
        }
    } else if (result.type === 'lifesteal') {
        // Damage + heal
        target.hp -= result.damage;
        showDamageNumber(target, result.damage, '#9900ff');
        
        player.hp = Math.min(player.maxHp, player.hp + result.healing);
        addMessage(`Healed for ${result.healing} HP!`);
        
        if (target.hp <= 0) {
            handleDeathWithSkills(target, player);
        }
    } else if (result.type === 'crit_strike') {
        // High damage + crit bonus (already factored into damage by execute)
        target.hp -= result.damage;
        showDamageNumber(target, result.damage, '#ff0000');
        
        if (target.hp <= 0) {
            handleDeathWithSkills(target, player);
        }
    } else {
        // Single hit
        target.hp -= result.damage;
        showDamageNumber(target, result.damage, '#ffaa00');
        
        if (target.hp <= 0) {
            handleDeathWithSkills(target, player);
        }
    }
    
    return result;
}

/**
 * Execute a DoT action
 */
function executeDotAction(player, action, target, actionDamage) {
    const result = action.execute(player, target, actionDamage);
    
    // Deal initial damage
    target.hp -= result.initialDamage;
    showDamageNumber(target, result.initialDamage, '#ffaa00');
    
    if (target.hp <= 0) {
        handleDeathWithSkills(target, player);
        return result;
    }
    
    // Apply DoT effect
    const dotType = result.bleed ? 'bleed' : 'burn';
    const dotData = result.bleed || result.burn;
    
    applyStatusEffect(target, {
        type: dotType,
        damage: dotData.damage,
        ticks: dotData.ticks,
        interval: dotData.interval,
        source: player
    });
    
    return result;
}

/**
 * Execute a CC action
 */
function executeCCAction(player, action, target, actionDamage) {
    const result = action.execute(player, target, actionDamage);
    
    // Deal damage
    target.hp -= result.damage;
    showDamageNumber(target, result.damage, '#00ffff');
    
    if (target.hp <= 0) {
        handleDeathWithSkills(target, player);
        return result;
    }
    
    // Apply CC effect
    const ccType = result.stun ? 'stun' : 'freeze';
    const ccData = result.stun || result.freeze;
    
    applyStatusEffect(target, {
        type: ccType,
        duration: ccData.duration,
        source: player
    });
    
    addMessage(`${target.name} is ${ccType === 'stun' ? 'stunned' : 'frozen'}!`);
    
    return result;
}

/**
 * Execute an AoE action
 */
function executeAoeAction(player, action, targets, actionDamage) {
    // If targets is a single target, find nearby enemies
    let targetList = Array.isArray(targets) ? targets : findAoeTargets(player, action, targets);
    
    const result = action.execute(player, targetList, actionDamage);
    
    // Apply damage to all targets
    for (const hit of result.results) {
        hit.target.hp -= hit.damage;
        showDamageNumber(hit.target, hit.damage, '#ff6600');
        
        if (hit.target.hp <= 0) {
            handleDeathWithSkills(hit.target, player);
        }
    }
    
    return result;
}

/**
 * Find targets for AoE action
 */
function findAoeTargets(player, action, primaryTarget) {
    const targets = [];
    const mechanics = action.mechanics;
    
    // Different targeting based on action type
    if (action.id === 'sweeping_arc') {
        // All adjacent enemies
        for (const enemy of game.enemies) {
            const dx = Math.abs(enemy.gridX - player.gridX);
            const dy = Math.abs(enemy.gridY - player.gridY);
            if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
                targets.push(enemy);
            }
        }
    } else if (action.id === 'impaling_thrust') {
        // Line in facing direction
        const dir = player.facing;
        const dirVec = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} }[dir];
        
        for (let i = 1; i <= mechanics.range; i++) {
            const checkX = player.gridX + (dirVec.x * i);
            const checkY = player.gridY + (dirVec.y * i);
            
            const enemy = game.enemies.find(e => 
                Math.floor(e.gridX) === checkX && Math.floor(e.gridY) === checkY
            );
            if (enemy) targets.push(enemy);
        }
    } else if (action.id === 'chain_lightning') {
        // Primary target + nearest enemies
        if (primaryTarget) targets.push(primaryTarget);
        
        const remaining = game.enemies
            .filter(e => e !== primaryTarget && e.hp > 0)
            .sort((a, b) => {
                const distA = Math.abs(a.gridX - player.gridX) + Math.abs(a.gridY - player.gridY);
                const distB = Math.abs(b.gridX - player.gridX) + Math.abs(b.gridY - player.gridY);
                return distA - distB;
            });
        
        targets.push(...remaining.slice(0, mechanics.maxChains));
    } else if (action.id === 'fan_of_knives') {
        // Cone in facing direction
        const dir = player.facing;
        
        for (const enemy of game.enemies) {
            const dx = enemy.gridX - player.gridX;
            const dy = enemy.gridY - player.gridY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist <= mechanics.range) {
                // Check if in cone (simplified)
                let inCone = false;
                switch (dir) {
                    case 'up': inCone = dy < 0 && Math.abs(dx) <= Math.abs(dy); break;
                    case 'down': inCone = dy > 0 && Math.abs(dx) <= Math.abs(dy); break;
                    case 'left': inCone = dx < 0 && Math.abs(dy) <= Math.abs(dx); break;
                    case 'right': inCone = dx > 0 && Math.abs(dy) <= Math.abs(dx); break;
                }
                if (inCone) targets.push(enemy);
            }
        }
    } else if (action.id === 'piercing_bolt') {
        // Line through target
        if (primaryTarget) {
            targets.push(primaryTarget);
            
            // Find enemy behind primary target
            const dx = primaryTarget.gridX - player.gridX;
            const dy = primaryTarget.gridY - player.gridY;
            const behindX = primaryTarget.gridX + Math.sign(dx);
            const behindY = primaryTarget.gridY + Math.sign(dy);
            
            const behind = game.enemies.find(e => 
                Math.floor(e.gridX) === behindX && Math.floor(e.gridY) === behindY
            );
            if (behind) targets.push(behind);
        }
    }
    
    return targets.slice(0, mechanics.maxTargets || 10);
}

/**
 * Execute a mobility action
 */
function executeMobilityAction(player, action, target, actionDamage) {
    const result = action.execute(player, target, actionDamage);
    
    // Calculate charge destination
    const dx = target.gridX - player.gridX;
    const dy = target.gridY - player.gridY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
        // Move player toward target
        const moveX = Math.round(dx / dist * result.movement.chargeDistance);
        const moveY = Math.round(dy / dist * result.movement.chargeDistance);
        
        const newX = player.gridX + moveX;
        const newY = player.gridY + moveY;
        
        // Check if destination is valid
        if (typeof canMoveToTile === 'function' && canMoveToTile(newX, newY)) {
            player.gridX = newX;
            player.gridY = newY;
            player.displayX = newX;
            player.displayY = newY;
        }
    }
    
    // Deal damage
    target.hp -= result.damage;
    showDamageNumber(target, result.damage, '#00ff00');
    
    // Apply knockback
    if (result.movement.knockback) {
        const knockX = Math.round(dx / dist * result.movement.knockback);
        const knockY = Math.round(dy / dist * result.movement.knockback);
        
        const knockDestX = target.gridX + knockX;
        const knockDestY = target.gridY + knockY;
        
        if (typeof canMoveToTile === 'function' && canMoveToTile(knockDestX, knockDestY)) {
            target.gridX = knockDestX;
            target.gridY = knockDestY;
            target.x = knockDestX;
            target.y = knockDestY;
        }
    }
    
    if (target.hp <= 0) {
        handleDeathWithSkills(target, player);
    }
    
    return result;
}

/**
 * Execute a utility action (traps, turrets, debuffs)
 */
function executeUtilityAction(player, action, target, specialtyLevel) {
    const result = action.execute(player, target, specialtyLevel);
    
    switch (result.type) {
        case 'placed_trap':
            placeTrap(player, target, result);
            break;
            
        case 'summon':
            placeTurret(player, target, result);
            break;
            
        case 'thrown_aoe':
            // Find enemies in AoE
            const aoeTargets = game.enemies.filter(e => {
                const dx = Math.abs(e.gridX - target.x);
                const dy = Math.abs(e.gridY - target.y);
                return dx <= action.mechanics.aoeRadius && dy <= action.mechanics.aoeRadius;
            });
            
            for (const enemy of aoeTargets) {
                enemy.hp -= result.results[0]?.damage || result.damage;
                showDamageNumber(enemy, result.results[0]?.damage || result.damage, '#aa00aa');
                
                if (enemy.hp <= 0) {
                    handleDeathWithSkills(enemy, player);
                }
            }
            break;
            
        case 'debuff':
            applyStatusEffect(target, {
                type: 'mark',
                duration: result.mark.duration,
                data: { damageAmplification: result.mark.damageAmplification },
                source: player
            });
            addMessage(`${target.name} is marked! (+${Math.round(result.mark.damageAmplification * 100)}% damage taken)`);
            break;
    }
    
    return result;
}

// ============================================================================
// COMBAT SYSTEM OVERRIDES
// ============================================================================

/**
 * Override the original handleDeath to use skill-aware version
 */
function installCombatOverrides() {
    // Store original functions
    if (typeof handleDeath === 'function' && !window._originalHandleDeath) {
        window._originalHandleDeath = handleDeath;
        window.handleDeath = handleDeathWithSkills;
        console.log('âœ“ handleDeath overridden with skill XP support');
    }
    
    // Store original calculateDamage
    if (typeof calculateDamage === 'function' && !window._originalCalculateDamage) {
        window._originalCalculateDamage = calculateDamage;
        window.calculateDamage = calculateDamageWithSkills;
        console.log('âœ“ calculateDamage overridden with skill multipliers');
    }
    
    // Override updateEntityCombat to check for CC
    if (typeof updateEntityCombat === 'function' && !window._originalUpdateEntityCombat) {
        window._originalUpdateEntityCombat = updateEntityCombat;
        window.updateEntityCombat = function(entity, deltaTime) {
            // Check if entity is CC'd
            if (isEntityCC(entity)) {
                return; // Can't act while stunned/frozen
            }
            window._originalUpdateEntityCombat(entity, deltaTime);
        };
        console.log('âœ“ updateEntityCombat overridden with CC support');
    }
}

// ============================================================================
// MAIN LOOP INTEGRATION
// ============================================================================

/**
 * Update all skill-related systems (call from main loop)
 */
function updateSkillSystems(deltaTime) {
    // Update action cooldowns
    if (game.player && typeof updateActionCooldowns === 'function') {
        updateActionCooldowns(game.player, deltaTime);
    }
    
    // Update status effects (DoTs, CCs, etc.)
    updateStatusEffects(deltaTime);
    
    // Update placed objects (traps, turrets)
    updatePlacedObjects(deltaTime);
}

// ============================================================================
// PLAYER INITIALIZATION HOOK
// ============================================================================

/**
 * Enhanced createPlayer that initializes skills
 */
function initializePlayerWithSkills(player) {
    // Initialize skills system
    if (typeof initializePlayerSkills === 'function') {
        initializePlayerSkills(player);
    }
    
    console.log('âœ“ Player initialized with skills system');
}

// ============================================================================
// INPUT BINDING FOR ACTIONS
// ============================================================================

// Action hotkeys (1-4 for weapon actions, 5-8 for expertise)
const actionHotkeys = {
    '1': null, // Assigned based on equipped weapon
    '2': null,
    '3': null,
    '4': null,
    '5': 'spike_trap',
    '6': 'volatile_flask',
    '7': 'expose_weakness',
    '8': 'deploy_turret'
};

/**
 * Update action hotkeys based on equipped weapon
 */
function updateActionHotkeys(player) {
    const weapon = player.equipped?.MAIN;
    
    if (weapon?.specialty) {
        const action = getActionForSpecialty(weapon.specialty);
        if (action) {
            actionHotkeys['1'] = action.id;
        }
    } else {
        // Unarmed
        actionHotkeys['1'] = 'flurry_of_blows';
    }
}

/**
 * Handle action hotkey press
 */
function handleActionHotkey(key, player) {
    const actionId = actionHotkeys[key];
    if (!actionId) return;
    
    // Get target (current combat target or nearest enemy)
    let target = player.combat?.currentTarget;
    
    if (!target && game.enemies.length > 0) {
        // Find nearest enemy
        let nearestDist = Infinity;
        for (const enemy of game.enemies) {
            const dx = enemy.gridX - player.gridX;
            const dy = enemy.gridY - player.gridY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                target = enemy;
            }
        }
    }
    
    // For utility actions, target might be a position instead
    const action = ACTIONS[actionId];
    if (action && (action.type === 'utility' || action.type === 'summon')) {
        // Use player position or facing direction
        target = { x: player.gridX, y: player.gridY };
    }
    
    if (target) {
        executeSkillAction(player, actionId, target);
    } else {
        addMessage('No target!');
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the skills-combat integration
 */
function initSkillsCombatIntegration() {
    // Install combat overrides
    installCombatOverrides();
    
    console.log('âœ“ Skills-Combat integration initialized');
}

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkillsCombatIntegration);
} else {
    // Small delay to ensure combat-system.js is loaded first
    setTimeout(initSkillsCombatIntegration, 100);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Status effects
window.applyStatusEffect = applyStatusEffect;
window.updateStatusEffects = updateStatusEffects;
window.isEntityCC = isEntityCC;
window.clearStatusEffects = clearStatusEffects;

// Placed objects
window.placedObjects = placedObjects;
window.placeTrap = placeTrap;
window.placeTurret = placeTurret;
window.updatePlacedObjects = updatePlacedObjects;

// Combat integration
window.calculateDamageWithSkills = calculateDamageWithSkills;
window.handleDeathWithSkills = handleDeathWithSkills;
window.executeSkillAction = executeSkillAction;
window.updateSkillSystems = updateSkillSystems;

// Player integration
window.initializePlayerWithSkills = initializePlayerWithSkills;

// Input
window.actionHotkeys = actionHotkeys;
window.updateActionHotkeys = updateActionHotkeys;
window.handleActionHotkey = handleActionHotkey;

// Initialize
window.initSkillsCombatIntegration = initSkillsCombatIntegration;

console.log('âœ“ Skills-Combat integration loaded');// ============================================================================
// SYSTEM MANAGER REGISTRATION - Add to end of skills-combat-integration.js
// ============================================================================

const SkillsCombatSystem = {
    name: 'skills-combat',
    
    init(game) {
        // Install combat overrides (damage multipliers, etc.)
        installCombatOverrides();
        
        // Initialize player skills if player exists
        if (game.player && typeof initializePlayerWithSkills === 'function') {
            initializePlayerWithSkills(game.player);
        }
    },
    
    update(dt) {
        // Update action cooldowns
        if (game.player && typeof updateActionCooldowns === 'function') {
            updateActionCooldowns(game.player, dt);
        }
        
        // Update status effects (DoTs, CCs, etc.)
        updateStatusEffects(dt);
        
        // Update placed objects (traps, turrets)
        updatePlacedObjects(dt);
    },
    
    cleanup() {
        // Clear all status effects
        for (const entityId in statusEffects) {
            delete statusEffects[entityId];
        }
        
        // Clear placed objects
        placedObjects.length = 0;
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('skills-combat', SkillsCombatSystem, 55);
} else {
    console.warn('⚠️ SystemManager not found - skills-combat running standalone');
}

console.log('✅ Skills-Combat integration loaded (with SystemManager)');
