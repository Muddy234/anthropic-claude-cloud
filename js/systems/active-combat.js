// ============================================================================
// ACTIVE COMBAT SYSTEM - Hotkey-based combat
// ============================================================================
// Handles hotkeys 1-4 for base attack, skill attack, and consumables
// Handles Tab targeting
// ============================================================================

// ============================================================================
// MAGIC ELEMENT CONFIGURATION
// Used for: manaCost, cooldown, status effect chances (burnChance, freezeChance, etc.)
// NOTE: baseDamage values here are legacy - actual damage uses DamageCalculator
// ============================================================================

const MAGIC_CONFIG = {
    fire: {
        baseDamage: 15,
        manaCost: 15,
        cooldown: 12,
        burnChance: 0.30,
        burnDuration: 5,
        burnDamage: 1
    },
    lightning: {
        baseDamage: 10,
        manaCost: 12,
        cooldown: 6
    },
    ice: {
        baseDamage: 10,
        manaCost: 12,
        cooldown: 10,
        freezeChance: 0.30,
        freezeDuration: 2
    },
    necromancy: {
        baseDamage: 8,
        manaCost: 10,
        cooldown: 5,
        lifestealPercent: 0.20
    },
    arcane: {
        baseDamage: 12,
        manaCost: 12,
        cooldown: 8
    },
    holy: {
        baseDamage: 12,
        manaCost: 12,
        cooldown: 8
    },
    dark: {
        baseDamage: 10,
        manaCost: 10,
        cooldown: 7
    },
    death: {
        baseDamage: 10,
        manaCost: 10,
        cooldown: 7
    }
};

// ============================================================================
// HOTKEY HANDLERS
// ============================================================================

/**
 * Handle attack hotkeys (1-4)
 */
function handleActiveCombatHotkey(key, player) {
    if (!player || game.state !== 'playing') return;

    switch(key) {
        case 1:
            handleBaseAttack(player);
            break;
        case 2:
            handleSkillAttack(player);
            break;
        case 3:
            handleConsumable(player, 'slot3');
            break;
        case 4:
            handleConsumable(player, 'slot4');
            break;
    }
}

// ============================================================================
// BASE ATTACK (Hotkey 1)
// ============================================================================

function handleBaseAttack(player) {
    // Check GCD
    if (player.gcd?.active) {
        return;
    }

    // Check cooldown
    if (player.actionCooldowns?.baseAttack > 0) {
        return;
    }

    // Check target
    const target = player.combat?.currentTarget;
    if (!target || target.hp <= 0) {
        if (typeof addMessage === 'function') {
            addMessage('No target selected!');
        }
        return;
    }

    // Get weapon
    const weapon = player.equipped?.MAIN;

    // Determine weapon type
    const weaponType = getWeaponType(weapon);

    // Check range
    const range = weapon?.stats?.range || 1;
    const distance = getDistance(player, target);
    if (distance > range) {
        return;
    }

    // Execute attack based on weapon type
    switch(weaponType) {
        case 'melee':
            executeMeleeAttack(player, target, weapon, false);
            break;
        case 'ranged':
            executeRangedAttack(player, target, weapon, false);
            break;
        case 'magic':
            executeMagicAttack(player, target, weapon, false);
            break;
    }
}

// ============================================================================
// SKILL ATTACK (Hotkey 2)
// ============================================================================

function handleSkillAttack(player) {
    // Check GCD
    if (player.gcd?.active) {
        return;
    }

    // Check cooldown
    if (player.actionCooldowns?.skillAttack > 0) {
        return;
    }

    // Check target
    const target = player.combat?.currentTarget;
    if (!target || target.hp <= 0) {
        if (typeof addMessage === 'function') {
            addMessage('No target selected!');
        }
        return;
    }

    // Get weapon
    const weapon = player.equipped?.MAIN;
    const weaponType = getWeaponType(weapon);

    // Check range
    const range = weapon?.stats?.range || 1;
    const distance = getDistance(player, target);
    if (distance > range) {
        return;
    }

    // Execute skill attack based on weapon type (enhanced damage)
    switch(weaponType) {
        case 'melee':
            executeMeleeAttack(player, target, weapon, true);
            break;
        case 'ranged':
            executeRangedAttack(player, target, weapon, true);
            break;
        case 'magic':
            executeMagicAttack(player, target, weapon, true);
            break;
    }
}

// ============================================================================
// CONSUMABLE USE (Hotkeys 3 & 4)
// ============================================================================

function handleConsumable(player, slot) {
    // Check GCD
    if (player.gcd?.active) {
        return;
    }

    // Check cooldown
    const cooldownKey = slot === 'slot3' ? 'consumable3' : 'consumable4';
    if (player.actionCooldowns?.[cooldownKey] > 0) {
        return;
    }

    // Get assigned consumable
    const itemId = player.assignedConsumables?.[slot];
    if (!itemId) {
        if (typeof addMessage === 'function') {
            addMessage(`No item assigned to hotkey ${slot === 'slot3' ? '3' : '4'}!`);
        }
        return;
    }

    // Check item cooldown
    if (player.itemCooldowns?.[itemId] > 0) {
        return;
    }

    // Find item in inventory
    const item = findItemInInventory(player, itemId);
    if (!item || item.count <= 0) {
        if (typeof addMessage === 'function') {
            addMessage(`Out of ${item?.name || 'item'}!`);
        }
        player.assignedConsumables[slot] = null; // Unassign
        return;
    }

    // Use item
    if (typeof useItem === 'function') {
        const result = useItem(player, itemId);
        if (result.success) {
            // Consume 1 from stack
            item.count--;
            if (item.count <= 0) {
                removeItemFromInventory(player, itemId);
                player.assignedConsumables[slot] = null; // Unassign
            }

            // Trigger cooldowns
            triggerGCD(player);
            player.actionCooldowns[cooldownKey] = 10; // 10s consumable cooldown
            player.itemCooldowns[itemId] = 10;

            if (typeof addMessage === 'function') {
                addMessage(result.message);
            }
        }
    }
}

// ============================================================================
// ATTACK EXECUTION - MELEE (Uses DamageCalculator)
// ============================================================================

function executeMeleeAttack(player, target, weapon, isSkill) {
    // Use centralized DamageCalculator
    const result = typeof DamageCalculator !== 'undefined'
        ? DamageCalculator.calculateDamage(player, target, null)
        : { finalDamage: 10, isCrit: false, isHit: true };

    if (!result.isHit) {
        if (typeof addMessage === 'function') addMessage('You missed!');
        if (typeof showDamageNumber === 'function') showDamageNumber(target, 0, '#888888');
        triggerGCD(player);
        return;
    }

    // Apply skill multiplier
    let damage = isSkill ? Math.floor(result.finalDamage * 2) : result.finalDamage;

    // Apply damage
    if (typeof applyDamage === 'function') {
        applyDamage(target, damage, player, result);
    } else {
        target.hp -= damage;
    }

    // Show damage with appropriate color
    const color = result.isCrit ? '#ffff00' : '#ff4444';
    if (typeof showDamageNumber === 'function') {
        showDamageNumber(target, damage, color);
    }

    // Message
    if (typeof addMessage === 'function') {
        const attackName = isSkill ? 'skill attack' : 'attack';
        const critText = result.isCrit ? ' CRITICAL!' : '';
        addMessage(`You ${attackName} ${target.name} for ${damage} damage!${critText}`);
    }

    // Trigger cooldowns
    triggerGCD(player);
    if (isSkill) {
        player.actionCooldowns.skillAttack = 10;
    } else {
        const attackSpeed = weapon?.stats?.speed || player.combat?.attackSpeed || 1.0;
        player.actionCooldowns.baseAttack = attackSpeed;
    }

    // Check death
    if (target.hp <= 0 && typeof handleDeath === 'function') {
        handleDeath(target, player);
    }
}

// ============================================================================
// ATTACK EXECUTION - RANGED (Uses DamageCalculator)
// ============================================================================

function executeRangedAttack(player, target, weapon, isSkill) {
    const weaponType = weapon?.weaponType || 'bow';

    // Use centralized DamageCalculator
    const result = typeof DamageCalculator !== 'undefined'
        ? DamageCalculator.calculateDamage(player, target, null)
        : { finalDamage: 10, isCrit: false, isHit: true };

    if (!result.isHit) {
        if (typeof addMessage === 'function') addMessage('You missed!');
        triggerGCD(player);
        return;
    }

    // Apply skill multiplier
    let damage = isSkill ? Math.floor(result.finalDamage * 2) : result.finalDamage;

    // Create projectile
    if (typeof createProjectile === 'function') {
        const speed = weaponType === 'crossbow' ? 10 : 6.7;
        createProjectile({
            x: player.gridX,
            y: player.gridY,
            targetX: target.gridX,
            targetY: target.gridY,
            speed: speed,
            damage: damage,
            element: weapon?.element || 'physical',
            attacker: player,
            target: target,
            isSkill: isSkill,
            isCrit: result.isCrit
        });
    } else {
        // Fallback: instant damage
        if (typeof applyDamage === 'function') {
            applyDamage(target, damage, player, result);
        } else {
            target.hp -= damage;
        }
        const color = result.isCrit ? '#ffff00' : '#ff4444';
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(target, damage, color);
        }
    }

    // Trigger cooldowns
    triggerGCD(player);
    if (isSkill) {
        player.actionCooldowns.skillAttack = 10;
    } else {
        const attackSpeed = weapon?.stats?.speed || 1.0;
        player.actionCooldowns.baseAttack = attackSpeed;
    }

    // Message
    if (typeof addMessage === 'function') {
        const attackName = isSkill ? 'skill shot' : 'shot';
        addMessage(`You ${attackName} ${target.name}!`);
    }
}

// ============================================================================
// ATTACK EXECUTION - MAGIC (Uses DamageCalculator)
// ============================================================================

function executeMagicAttack(player, target, weapon, isSkill) {
    // Determine element
    const element = weapon?.element || 'arcane';
    const elementConfig = MAGIC_CONFIG[element] || MAGIC_CONFIG.arcane;

    // Check mana
    if (player.mp < elementConfig.manaCost) {
        executeNoManaAttack(player, target);
        return;
    }

    // Consume mana
    player.mp -= elementConfig.manaCost;

    // Use centralized DamageCalculator (it handles INT scaling and element modifiers)
    const result = typeof DamageCalculator !== 'undefined'
        ? DamageCalculator.calculateDamage(player, target, null)
        : { finalDamage: 10, isCrit: false, isHit: true };

    if (!result.isHit) {
        if (typeof addMessage === 'function') addMessage('Your spell missed!');
        triggerGCD(player);
        return;
    }

    // Apply skill multiplier
    let damage = isSkill ? Math.floor(result.finalDamage * 2) : result.finalDamage;

    // Create magic projectile
    if (typeof createProjectile === 'function') {
        createProjectile({
            x: player.gridX,
            y: player.gridY,
            targetX: target.gridX,
            targetY: target.gridY,
            speed: 6.7,
            damage: damage,
            element: element,
            attacker: player,
            target: target,
            isMagic: true,
            isSkill: isSkill,
            isCrit: result.isCrit,
            elementConfig: elementConfig
        });
    } else {
        // Fallback: instant damage
        if (typeof applyDamage === 'function') {
            applyDamage(target, damage, player, result);
        } else {
            target.hp -= damage;
        }
        const color = result.isCrit ? '#ffff00' : '#00ffff';
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(target, damage, color);
        }

        // Apply status effects (burn/freeze/lifesteal)
        applyMagicEffects(player, target, element, elementConfig, damage);
    }

    // Trigger cooldowns
    triggerGCD(player);
    if (isSkill) {
        player.actionCooldowns.skillAttack = 10;
    } else {
        player.actionCooldowns.baseAttack = elementConfig.cooldown;
    }

    // Message
    if (typeof addMessage === 'function') {
        const attackName = isSkill ? `${element} blast` : `${element} bolt`;
        addMessage(`You cast ${attackName} at ${target.name}!`);
    }
}

/**
 * No-mana physical attack (weak punch)
 */
function executeNoManaAttack(player, target) {
    // Unarmed damage: 5 + (STR × 0.3)
    const str = player.stats?.STR || 10;
    const damage = Math.floor(5 + (str * 0.3));

    // Apply damage
    if (typeof applyDamage === 'function') {
        applyDamage(target, damage, player);
    } else {
        target.hp -= damage;
    }

    // Show damage
    if (typeof showDamageNumber === 'function') {
        showDamageNumber(target, damage, '#888888');
    }

    // Message
    if (typeof addMessage === 'function') {
        addMessage(`Out of mana! You punch ${target.name} for ${damage} damage!`);
    }

    // Trigger cooldowns
    triggerGCD(player);
    player.actionCooldowns.baseAttack = 1.0; // 1s unarmed cooldown
}

// Damage calculations removed - now using centralized DamageCalculator from damage-calculator.js

// ============================================================================
// MAGIC EFFECTS - Uses centralized status effect system from skills-combat-integration.js
// ============================================================================

function applyMagicEffects(player, target, element, elementConfig, damage) {
    if (typeof applyStatusEffect !== 'function') return;

    // Burn (Fire)
    if (element === 'fire' && elementConfig.burnChance) {
        if (Math.random() < elementConfig.burnChance) {
            applyStatusEffect(target, {
                type: 'burn',
                damage: elementConfig.burnDamage,
                ticks: elementConfig.burnDuration,
                interval: 1000,
                source: player
            });
            if (typeof addMessage === 'function') {
                addMessage(`${target.name} is burning!`);
            }
        }
    }

    // Freeze (Ice)
    if (element === 'ice' && elementConfig.freezeChance) {
        if (Math.random() < elementConfig.freezeChance) {
            applyStatusEffect(target, {
                type: 'freeze',
                duration: elementConfig.freezeDuration * 1000,
                source: player
            });
            if (typeof addMessage === 'function') {
                addMessage(`${target.name} is frozen!`);
            }
        }
    }

    // Lifesteal (Necromancy)
    if (element === 'necromancy' && elementConfig.lifestealPercent && damage) {
        const heal = Math.floor(damage * elementConfig.lifestealPercent);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        if (typeof addMessage === 'function') {
            addMessage(`Drained ${heal} HP!`);
        }
    }
}

// applyBurn and applyFreeze removed - use applyStatusEffect from skills-combat-integration.js

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWeaponType(weapon) {
    if (!weapon) return 'melee'; // Unarmed = melee

    const weaponType = weapon.weaponType || weapon.damageType;

    // Magic weapons
    if (['staff', 'wand', 'tome'].includes(weaponType)) {
        return 'magic';
    }

    // Ranged weapons
    if (['bow', 'crossbow', 'throwing'].includes(weaponType)) {
        return 'ranged';
    }

    // Everything else is melee
    return 'melee';
}

function triggerGCD(player) {
    if (!player.gcd) return;
    player.gcd.active = true;
    player.gcd.remaining = player.gcd.duration;
}

function findItemInInventory(player, itemId) {
    if (!player.inventory) return null;
    return player.inventory.find(item => item.id === itemId);
}

function removeItemFromInventory(player, itemId) {
    if (!player.inventory) return;
    const index = player.inventory.findIndex(item => item.id === itemId);
    if (index !== -1) {
        player.inventory.splice(index, 1);
    }
}

// getDistance is defined in combat-system.js (uses Chebyshev distance)

// ============================================================================
// TAB TARGETING
// ============================================================================

function handleTabTargeting(player) {
    if (!player || !game.enemies || game.enemies.length === 0) return;

    // Get current target
    const currentTarget = player.combat?.currentTarget;

    // Get all enemies within LOS (if LOS check available)
    let validEnemies = game.enemies.filter(enemy => enemy.hp > 0);

    // TODO: Add LOS check when implemented
    // if (typeof checkLineOfSight === 'function') {
    //     validEnemies = validEnemies.filter(enemy =>
    //         checkLineOfSight(player.gridX, player.gridY, enemy.gridX, enemy.gridY)
    //     );
    // }

    if (validEnemies.length === 0) return;

    // Calculate angles for clockwise sorting
    const enemiesWithAngles = validEnemies.map(enemy => {
        const dx = enemy.gridX - player.gridX;
        const dy = enemy.gridY - player.gridY;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        return { enemy, angle };
    });

    // Sort clockwise (by angle)
    enemiesWithAngles.sort((a, b) => a.angle - b.angle);

    // Find current target index
    let currentIndex = -1;
    if (currentTarget) {
        currentIndex = enemiesWithAngles.findIndex(e => e.enemy === currentTarget);
    }

    // Select next target (wrap around)
    const nextIndex = (currentIndex + 1) % enemiesWithAngles.length;
    const nextTarget = enemiesWithAngles[nextIndex].enemy;

    // Set as target and engage combat
    if (typeof engageCombat === 'function') {
        engageCombat(player, nextTarget);
    } else {
        player.combat.currentTarget = nextTarget;
        player.combat.isInCombat = true;
    }

    if (typeof addMessage === 'function') {
        addMessage(`Targeting ${nextTarget.name}`);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.handleActiveCombatHotkey = handleActiveCombatHotkey;
    window.handleBaseAttack = handleBaseAttack;
    window.handleSkillAttack = handleSkillAttack;
    window.handleConsumable = handleConsumable;
    window.handleTabTargeting = handleTabTargeting;
    window.MAGIC_CONFIG = MAGIC_CONFIG;
}

console.log('✅ Active combat system loaded (hotkeys 1-4, Tab targeting)');
