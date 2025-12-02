// ============================================================================
// ACTIVE COMBAT SYSTEM - Hotkey-based combat
// ============================================================================
// Handles hotkeys 1-4 for base attack, skill attack, and consumables
// Handles Tab targeting
// ============================================================================

// ============================================================================
// MAGIC ELEMENT CONFIGURATION
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
        return; // Silently fail during GCD
    }

    // Check cooldown
    if (player.actionCooldowns?.baseAttack > 0) {
        return; // Silently fail during cooldown
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
        // Out of range - silently fail (button will be greyed)
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
// ATTACK EXECUTION - MELEE
// ============================================================================

function executeMeleeAttack(player, target, weapon, isSkill) {
    // Calculate damage
    let damage = calculateMeleeDamage(player, target, weapon, isSkill);

    // Apply damage
    if (typeof applyDamage === 'function') {
        applyDamage(target, damage, player);
    } else {
        target.hp -= damage;
    }

    // Show damage
    if (typeof showDamageNumber === 'function') {
        showDamageNumber(target, damage, '#ff4444');
    }

    // Message
    if (typeof addMessage === 'function') {
        const attackName = isSkill ? 'skill attack' : 'attack';
        addMessage(`You ${attackName} ${target.name} for ${damage} damage!`);
    }

    // Trigger cooldowns
    triggerGCD(player);
    if (isSkill) {
        player.actionCooldowns.skillAttack = 10; // Fixed 10s skill cooldown
    } else {
        // Base attack uses weapon speed
        const attackSpeed = weapon?.stats?.speed || player.combat?.attackSpeed || 1.0;
        player.actionCooldowns.baseAttack = attackSpeed;
    }

    // Check death
    if (target.hp <= 0 && typeof handleDeath === 'function') {
        handleDeath(target, player);
    }
}

// ============================================================================
// ATTACK EXECUTION - RANGED
// ============================================================================

function executeRangedAttack(player, target, weapon, isSkill) {
    // Check ammo
    const weaponType = weapon?.weaponType || 'bow';
    const ammoType = weaponType === 'crossbow' ? 'bolts' : 'arrows';

    if (!player.ammo || player.ammo[ammoType] <= 0) {
        if (typeof addMessage === 'function') {
            addMessage(`Out of ${ammoType}!`);
        }
        return;
    }

    // Consume ammo
    player.ammo[ammoType]--;

    // Calculate damage
    let damage = calculateRangedDamage(player, target, weapon, isSkill);

    // Create projectile
    if (typeof createProjectile === 'function') {
        const speed = weaponType === 'crossbow' ? 10 : 6.7; // tiles/second
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
            isSkill: isSkill
        });
    } else {
        // Fallback: instant damage
        if (typeof applyDamage === 'function') {
            applyDamage(target, damage, player);
        } else {
            target.hp -= damage;
        }
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(target, damage, '#ff4444');
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
// ATTACK EXECUTION - MAGIC
// ============================================================================

function executeMagicAttack(player, target, weapon, isSkill) {
    // Determine element
    const element = weapon?.element || 'arcane';
    const elementConfig = MAGIC_CONFIG[element] || MAGIC_CONFIG.arcane;

    // Check mana
    if (player.mp < elementConfig.manaCost) {
        // Out of mana - revert to physical punch
        executeNoManaAttack(player, target);
        return;
    }

    // Consume mana
    player.mp -= elementConfig.manaCost;

    // Calculate damage
    let damage = calculateMagicDamage(player, target, weapon, element, isSkill);

    // Create magic projectile
    if (typeof createProjectile === 'function') {
        createProjectile({
            x: player.gridX,
            y: player.gridY,
            targetX: target.gridX,
            targetY: target.gridY,
            speed: 6.7, // Same as arrows
            damage: damage,
            element: element,
            attacker: player,
            target: target,
            isMagic: true,
            isSkill: isSkill,
            elementConfig: elementConfig
        });
    } else {
        // Fallback: instant damage
        if (typeof applyDamage === 'function') {
            applyDamage(target, damage, player);
        } else {
            target.hp -= damage;
        }
        if (typeof showDamageNumber === 'function') {
            showDamageNumber(target, damage, '#00ffff');
        }

        // Apply status effects (burn/freeze)
        applyMagicEffects(player, target, element, elementConfig);
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

// ============================================================================
// DAMAGE CALCULATIONS
// ============================================================================

function calculateMeleeDamage(player, target, weapon, isSkill) {
    let damage = 0;

    if (weapon?.stats?.damage) {
        damage = weapon.stats.damage;
    } else {
        // Unarmed
        const str = player.stats?.STR || 10;
        damage = 5 + Math.floor(str * 0.3);
    }

    // Add STR scaling
    const str = player.stats?.STR || 10;
    damage += Math.floor(str * 0.5);

    // Skill multiplier
    if (isSkill) {
        damage *= 2;
    }

    return Math.floor(damage);
}

function calculateRangedDamage(player, target, weapon, isSkill) {
    let damage = weapon?.stats?.damage || 5;

    // Add AGI scaling
    const agi = player.stats?.AGI || 10;
    damage += Math.floor(agi * 0.5);

    // Skill multiplier
    if (isSkill) {
        damage *= 2;
    }

    return Math.floor(damage);
}

function calculateMagicDamage(player, target, weapon, element, isSkill) {
    const elementConfig = MAGIC_CONFIG[element] || MAGIC_CONFIG.arcane;
    let baseDamage = elementConfig.baseDamage;

    // INT scaling: baseDamage × (1 + INT/100)
    const int = player.stats?.INT || 10;
    let damage = baseDamage * (1 + int / 100);

    // Skill multiplier
    if (isSkill) {
        damage *= 2;
    }

    return Math.floor(damage);
}

// ============================================================================
// MAGIC EFFECTS
// ============================================================================

function applyMagicEffects(player, target, element, elementConfig) {
    // Burn (Fire)
    if (element === 'fire' && elementConfig.burnChance) {
        if (Math.random() < elementConfig.burnChance) {
            applyBurn(target, elementConfig.burnDuration, elementConfig.burnDamage);
        }
    }

    // Freeze (Ice)
    if (element === 'ice' && elementConfig.freezeChance) {
        if (Math.random() < elementConfig.freezeChance) {
            applyFreeze(target, elementConfig.freezeDuration);
        }
    }

    // Lifesteal (Necromancy)
    if (element === 'necromancy' && elementConfig.lifestealPercent) {
        const heal = Math.floor(damage * elementConfig.lifestealPercent);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        if (typeof addMessage === 'function') {
            addMessage(`Drained ${heal} HP!`);
        }
    }
}

function applyBurn(target, duration, damagePerSec) {
    // Use existing status effect system if available
    if (typeof applyStatusEffect === 'function') {
        applyStatusEffect(target, {
            type: 'burn',
            duration: duration,
            damage: damagePerSec,
            interval: 1000 // 1 second
        });
    }

    if (typeof addMessage === 'function') {
        addMessage(`${target.name} is burning!`);
    }
}

function applyFreeze(target, duration) {
    // Use existing status effect system if available
    if (typeof applyStatusEffect === 'function') {
        applyStatusEffect(target, {
            type: 'freeze',
            duration: duration
        });
    }

    // Set frozen flag
    target.isFrozen = true;
    setTimeout(() => {
        target.isFrozen = false;
    }, duration * 1000);

    if (typeof addMessage === 'function') {
        addMessage(`${target.name} is frozen!`);
    }
}

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

function getDistance(entity1, entity2) {
    // Use Euclidean distance for ranged/magic attacks
    const x1 = entity1.gridX ?? entity1.x;
    const y1 = entity1.gridY ?? entity1.y;
    const x2 = entity2.gridX ?? entity2.x;
    const y2 = entity2.gridY ?? entity2.y;

    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

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
