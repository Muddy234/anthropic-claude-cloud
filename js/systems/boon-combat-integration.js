// ============================================================================
// BOON COMBAT INTEGRATION
// ============================================================================
// Hooks boon effects into the combat system
// - On-hit effects (Kindled Blade, Corrosive Touch, Glacial Pace, etc.)
// - On-kill effects (Executioner's Gait, Leech Spores, etc.)
// - On-damage-taken effects (Kinetic Discharge, Spiked Armor, etc.)
// - Armor modification from Rot stacks
// - Fear AI behavior integration
// ============================================================================

const BoonCombatIntegration = {

    // ========================================================================
    // ON-HIT EFFECTS
    // ========================================================================

    /**
     * Apply boon on-hit effects when player attacks an enemy
     * Called from applyWeaponEffects() in combat-system.js
     * @param {Object} attacker - The attacking entity (player)
     * @param {Object} defender - The defending entity (enemy)
     * @param {Object} damageResult - Result from damage calculation
     */
    applyOnHitEffects(attacker, defender, damageResult) {
        if (attacker !== game.player) return;
        if (typeof BoonSystem === 'undefined') return;

        // === KINDLED BLADE: Attacks apply Ignite ===
        if (BoonSystem.hasBoon('kindled_blade')) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'ignite', attacker);
            }
        }

        // === CORROSIVE TOUCH: Attacks apply Rot ===
        if (BoonSystem.hasBoon('corrosive_touch')) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'rot', attacker);
            }
        }

        // === GLACIAL PACE: Attacks apply Chill ===
        if (BoonSystem.hasBoon('glacial_pace')) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'chilled', attacker);
            }
        }

        // === RUSTED EDGE: Critical hits apply Slow ===
        if (BoonSystem.hasBoon('rusted_edge') && damageResult.isCrit) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'slow', attacker);
            }
        }

        // === UNSEEN TERROR: Backstab attacks cause Fear ===
        if (BoonSystem.hasBoon('unseen_terror') && damageResult.isBackstab) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(defender, 'fear', attacker);
            }
        }

        // === THROAT SLIT: Ambush attacks cause permanent Bleed ===
        if (BoonSystem.hasBoon('throat_slit') && damageResult.isAmbush) {
            if (typeof StatusEffectSystem !== 'undefined') {
                // Apply bleed with very long duration (essentially permanent for combat)
                StatusEffectSystem.applyEffect(defender, 'bleeding', attacker, { duration: 60000 });
            }
        }

        // === SEPTIC WOUND: Bleeding enemies gain Rot over time ===
        // (This is handled in the status effect tick, but we can boost it on hit)
        if (BoonSystem.hasBoon('septic_wound')) {
            if (typeof hasStatusEffect === 'function' && hasStatusEffect(defender, 'bleeding')) {
                if (typeof applyStatusEffect === 'function') {
                    applyStatusEffect(defender, 'rot', attacker);
                }
            }
        }

        // === DEEP CUT: Ambush attacks deal 300% damage ===
        // (Handled in damage calculation, but flag for UI)

        // === STATIC FEEDBACK: 5% chance to shock self on hit ===
        if (BoonSystem.hasBoon('static_feedback')) {
            if (Math.random() < 0.05) {
                if (typeof applyStatusEffect === 'function') {
                    applyStatusEffect(attacker, 'stunned', null);
                    if (typeof addMessage === 'function') {
                        addMessage('Static feedback shocks you!', 'warning');
                    }
                }
            }
        }
    },

    // ========================================================================
    // ON-CRIT EFFECTS
    // ========================================================================

    /**
     * Apply boon effects on critical hits
     * @param {Object} attacker - The attacking entity
     * @param {Object} defender - The defending entity
     * @param {Object} damageResult - Result from damage calculation
     */
    applyOnCritEffects(attacker, defender, damageResult) {
        if (attacker !== game.player) return;
        if (typeof BoonSystem === 'undefined') return;
        if (!damageResult.isCrit) return;

        // === CAUTERIZE: Crits on burning enemies consume burn for burst damage ===
        if (BoonSystem.hasBoon('cauterize')) {
            if (typeof hasStatusEffect === 'function' && hasStatusEffect(defender, 'burning')) {
                // Remove burning and deal bonus damage
                if (typeof removeStatusEffect === 'function') {
                    removeStatusEffect(defender, 'burning');
                }
                // Bonus burst damage (50% of base)
                const burstDamage = Math.floor(damageResult.baseDamage * 0.5);
                defender.hp -= burstDamage;
                if (typeof addMessage === 'function') {
                    addMessage(`Cauterize! ${burstDamage} burst damage!`, 'combat');
                }
            }
            // Also check ignite
            if (typeof hasStatusEffect === 'function' && hasStatusEffect(defender, 'ignite')) {
                if (typeof removeStatusEffect === 'function') {
                    removeStatusEffect(defender, 'ignite');
                }
                const burstDamage = Math.floor(damageResult.baseDamage * 0.5);
                defender.hp -= burstDamage;
                if (typeof addMessage === 'function') {
                    addMessage(`Cauterize! ${burstDamage} burst damage!`, 'combat');
                }
            }
        }

        // === SILENCE THE WEAK: Critical kills prevent nearby enemy aggro ===
        // (Handled in on-kill)
    },

    // ========================================================================
    // ON-KILL EFFECTS
    // ========================================================================

    /**
     * Apply boon effects when player kills an enemy
     * Called from handleDeath() in combat-system.js
     * @param {Object} killer - The killing entity (player)
     * @param {Object} killed - The killed entity (enemy)
     */
    applyOnKillEffects(killer, killed) {
        if (killer !== game.player) return;
        if (typeof BoonSystem === 'undefined') return;

        // === EXECUTIONER'S GAIT: Kills grant +20% move speed for 3s ===
        if (BoonSystem.hasBoon('executioners_gait')) {
            const stacks = BoonSystem.getBoonStacks('executioners_gait');
            const bonus = 0.20 * stacks;
            // Apply speed buff (would need a buff system, for now just flag)
            if (!game.player.boonBuffs) game.player.boonBuffs = {};
            game.player.boonBuffs.executionersGait = {
                speedBonus: bonus,
                expiresAt: Date.now() + 3000
            };
            if (typeof addMessage === 'function') {
                addMessage(`Executioner's Gait: +${Math.round(bonus * 100)}% speed!`, 'buff');
            }
        }

        // === LEECH SPORES: Killing a Rotted enemy heals HP ===
        if (BoonSystem.hasBoon('leech_spores')) {
            if (typeof hasStatusEffect === 'function' && hasStatusEffect(killed, 'rot')) {
                const stacks = BoonSystem.getBoonStacks('leech_spores');
                const healAmount = 5 * stacks;
                game.player.hp = Math.min(game.player.hp + healAmount, game.player.maxHp);
                if (typeof addMessage === 'function') {
                    addMessage(`Leech Spores: Healed ${healAmount} HP!`, 'heal');
                }
            }
        }

        // === BLOOD RITE: Kill heals 10 HP but causes self-bleed ===
        if (BoonSystem.hasBoon('blood_rite')) {
            game.player.hp = Math.min(game.player.hp + 10, game.player.maxHp);
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(game.player, 'bleeding', null);
            }
            if (typeof addMessage === 'function') {
                addMessage('Blood Rite: Healed 10 HP, but bleeding!', 'warning');
            }
        }

        // === CRIMSON RAIN (Legendary): Kills explode for AoE + max bleed ===
        if (BoonSystem.hasBoon('crimson_rain')) {
            // Find nearby enemies and apply bleed + damage
            if (game.enemies) {
                const explosionRadius = 3;
                const explosionDamage = 15;
                for (const enemy of game.enemies) {
                    if (enemy === killed || enemy.hp <= 0) continue;
                    const dist = Math.sqrt(
                        Math.pow(enemy.gridX - killed.gridX, 2) +
                        Math.pow(enemy.gridY - killed.gridY, 2)
                    );
                    if (dist <= explosionRadius) {
                        enemy.hp -= explosionDamage;
                        if (typeof StatusEffectSystem !== 'undefined') {
                            // Apply max bleed stacks
                            for (let i = 0; i < 3; i++) {
                                StatusEffectSystem.applyEffect(enemy, 'bleeding', game.player);
                            }
                        }
                    }
                }
                if (typeof addMessage === 'function') {
                    addMessage('CRIMSON RAIN!', 'legendary');
                }
            }
        }
    },

    // ========================================================================
    // ON-DAMAGE-TAKEN EFFECTS
    // ========================================================================

    /**
     * Apply boon effects when player takes damage
     * Called from applyDamage() in combat-system.js
     * @param {Object} entity - The damaged entity (player)
     * @param {number} damage - Damage amount
     * @param {Object} source - Damage source (attacker)
     */
    applyOnDamageTakenEffects(entity, damage, source) {
        if (entity !== game.player) return;
        if (typeof BoonSystem === 'undefined') return;

        // === KINETIC DISCHARGE: Taking damage knocks back nearby enemies ===
        if (BoonSystem.hasBoon('kinetic_discharge') && source) {
            if (game.enemies) {
                const knockbackRadius = 2;
                const knockbackForce = 2;
                for (const enemy of game.enemies) {
                    if (enemy.hp <= 0) continue;
                    const dist = Math.sqrt(
                        Math.pow(enemy.gridX - entity.gridX, 2) +
                        Math.pow(enemy.gridY - entity.gridY, 2)
                    );
                    if (dist <= knockbackRadius && dist > 0) {
                        // Calculate knockback direction
                        const dx = (enemy.gridX - entity.gridX) / dist;
                        const dy = (enemy.gridY - entity.gridY) / dist;
                        enemy.gridX += dx * knockbackForce;
                        enemy.gridY += dy * knockbackForce;
                    }
                }
            }
        }

        // === SPIKED ARMOR: Reflect damage and apply bleed to attacker ===
        if (BoonSystem.hasBoon('spiked_armor') && source && source !== entity) {
            const reflectDamage = Math.floor(damage * 0.2); // 20% reflect
            source.hp -= reflectDamage;
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(source, 'bleeding', entity);
            }
        }

        // === TOXIC BLOOD: Spray acid on attacker (armor break) ===
        if (BoonSystem.hasBoon('toxic_blood') && source && source !== entity) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(source, 'rot', entity); // Rot = armor break
            }
        }

        // === IRON MAIDEN: Reflect 200% damage (but rooted while attacking) ===
        if (BoonSystem.hasBoon('iron_maiden') && source && source !== entity) {
            const reflectDamage = Math.floor(damage * 2.0);
            source.hp -= reflectDamage;
            if (typeof addMessage === 'function') {
                addMessage(`Iron Maiden reflects ${reflectDamage} damage!`, 'combat');
            }
        }
    },

    // ========================================================================
    // DAMAGE MODIFIERS
    // ========================================================================

    /**
     * Get damage multiplier from boons
     * @param {Object} attacker - Attacking entity
     * @param {Object} defender - Defending entity
     * @param {Object} damageResult - Partial damage result
     * @returns {number} Damage multiplier
     */
    getDamageMultiplier(attacker, defender, damageResult) {
        if (attacker !== game.player) return 1.0;
        if (typeof BoonSystem === 'undefined') return 1.0;

        let multiplier = 1.0;

        // === GLASS CANNON: 2x damage ===
        if (BoonSystem.hasBoon('glass_cannon')) {
            multiplier *= 2.0;
        }

        // === DARK PACT: +100% damage when torch off ===
        if (BoonSystem.hasBoon('dark_pact')) {
            if (game.player.torchOn === false) {
                multiplier *= 2.0;
            }
        }

        // === THE CULL: 2x damage to enemies below 20% HP ===
        if (BoonSystem.hasBoon('the_cull')) {
            const defenderHpPct = defender.hp / defender.maxHp;
            if (defenderHpPct < 0.20) {
                multiplier *= 2.0;
            }
        }

        // === DEEP CUT: 3x damage on ambush ===
        if (BoonSystem.hasBoon('deep_cut') && damageResult.isAmbush) {
            multiplier *= 3.0;
        }

        // === SEARING RADIANCE: +15% damage to enemies in light ===
        if (BoonSystem.hasBoon('searing_radiance')) {
            // Check if defender is in player's light radius
            const dist = Math.sqrt(
                Math.pow(defender.gridX - attacker.gridX, 2) +
                Math.pow(defender.gridY - attacker.gridY, 2)
            );
            const lightRadius = attacker.lightRadius || 5;
            if (dist <= lightRadius) {
                const stacks = BoonSystem.getBoonStacks('searing_radiance');
                multiplier *= (1 + 0.15 * stacks);
            }
        }

        // === FESTERING WOUNDS: +10% damage to enemies with DoT ===
        if (BoonSystem.hasBoon('festering_wounds')) {
            const hasDot = (typeof hasStatusEffect === 'function') && (
                hasStatusEffect(defender, 'burning') ||
                hasStatusEffect(defender, 'ignite') ||
                hasStatusEffect(defender, 'bleeding') ||
                hasStatusEffect(defender, 'rot') ||
                hasStatusEffect(defender, 'poisoned')
            );
            if (hasDot) {
                const stacks = BoonSystem.getBoonStacks('festering_wounds');
                multiplier *= (1 + 0.10 * stacks);
            }
        }

        // === SHATTER STRIKE: +40% damage to chilled/frozen enemies ===
        if (BoonSystem.hasBoon('shatter_strike')) {
            const isChilled = (typeof hasStatusEffect === 'function') && (
                hasStatusEffect(defender, 'chilled') ||
                hasStatusEffect(defender, 'frozen')
            );
            if (isChilled) {
                const stacks = BoonSystem.getBoonStacks('shatter_strike');
                multiplier *= (1 + 0.40 * stacks);
            }
        }

        // === PARANOIA: +50% if no enemies visible, -20% if any visible ===
        if (BoonSystem.hasBoon('paranoia')) {
            const visibleEnemies = game.enemies?.filter(e => e.hp > 0 && e.isVisible).length || 0;
            if (visibleEnemies === 0) {
                multiplier *= 1.5;
            } else {
                multiplier *= 0.8;
            }
        }

        // === FINAL OFFER (Legendary): 5x damage ===
        if (BoonSystem.hasBoon('final_offer')) {
            multiplier *= 5.0;
        }

        return multiplier;
    },

    // ========================================================================
    // ARMOR MODIFICATION (ROT STACKS)
    // ========================================================================

    /**
     * Get armor reduction from rot stacks
     * @param {Object} defender - The defending entity
     * @returns {number} Armor multiplier (0.0 - 1.0, where 1.0 = no reduction)
     */
    getArmorModifier(defender) {
        if (typeof StatusEffectSystem === 'undefined') return 1.0;

        // Get rot stacks on defender
        const rotEffect = StatusEffectSystem.getEffect(defender, 'rot');
        if (!rotEffect) return 1.0;

        const stacks = rotEffect.stacks || 1;
        const reductionPerStack = 0.10; // -10% armor per stack
        const totalReduction = Math.min(stacks * reductionPerStack, 1.0); // Cap at 100%

        return 1.0 - totalReduction;
    },

    // ========================================================================
    // FEAR AI INTEGRATION
    // ========================================================================

    /**
     * Check if enemy should be in fear state
     * Called from enemy AI update
     * @param {Object} enemy - The enemy to check
     * @returns {boolean} True if enemy should flee
     */
    shouldFlee(enemy) {
        // Check fear status effect
        if (enemy.isFeared) return true;

        // Check fear from status effect system
        if (typeof hasStatusEffect === 'function' && hasStatusEffect(enemy, 'fear')) {
            return true;
        }

        return false;
    },

    /**
     * Get flee target position (away from fear source)
     * @param {Object} enemy - The fleeing enemy
     * @returns {Object|null} { x, y } position to flee to
     */
    getFleeTarget(enemy) {
        // Get fear source
        let fleeFromX = enemy.fleeFromX;
        let fleeFromY = enemy.fleeFromY;

        // Default to player if no specific source
        if (fleeFromX === undefined || fleeFromY === undefined) {
            if (game.player) {
                fleeFromX = game.player.gridX;
                fleeFromY = game.player.gridY;
            } else {
                return null;
            }
        }

        // Calculate flee direction (away from source)
        const dx = enemy.gridX - fleeFromX;
        const dy = enemy.gridY - fleeFromY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Flee 5 tiles away
        return {
            x: enemy.gridX + (dx / dist) * 5,
            y: enemy.gridY + (dy / dist) * 5
        };
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    /**
     * Update boon effects that tick over time
     * Called from main game loop
     * @param {number} deltaTime - Time since last update (seconds)
     */
    update(deltaTime) {
        if (!game.player) return;
        if (typeof BoonSystem === 'undefined') return;

        // === LIFE OF THE FLAME: Regen 1% HP/s when torch is on ===
        if (BoonSystem.hasBoon('life_of_the_flame') && game.player.torchOn) {
            const regenAmount = game.player.maxHp * 0.01 * deltaTime;
            game.player.hp = Math.min(game.player.hp + regenAmount, game.player.maxHp);
        }

        // === BLOOD FOR FUEL: Drain 1 HP/5s ===
        if (BoonSystem.hasBoon('blood_for_fuel')) {
            if (!game.player._bloodForFuelTimer) game.player._bloodForFuelTimer = 0;
            game.player._bloodForFuelTimer += deltaTime;
            if (game.player._bloodForFuelTimer >= 5) {
                game.player._bloodForFuelTimer = 0;
                game.player.hp = Math.max(1, game.player.hp - 1);
            }
        }

        // === DARK PACT: Drain 1 HP/s when torch off ===
        if (BoonSystem.hasBoon('dark_pact') && !game.player.torchOn) {
            const drainAmount = 1 * deltaTime;
            game.player.hp = Math.max(1, game.player.hp - drainAmount);
        }

        // === IMMOLATION AURA: Self-burn + enemy burn ===
        if (BoonSystem.hasBoon('immolation_aura')) {
            // Self damage
            const selfDamage = 1 * deltaTime;
            game.player.hp = Math.max(1, game.player.hp - selfDamage);

            // Damage nearby enemies
            if (game.enemies) {
                const auraRadius = 2;
                for (const enemy of game.enemies) {
                    if (enemy.hp <= 0) continue;
                    const dist = Math.sqrt(
                        Math.pow(enemy.gridX - game.player.gridX, 2) +
                        Math.pow(enemy.gridY - game.player.gridY, 2)
                    );
                    if (dist <= auraRadius) {
                        enemy.hp -= 2 * deltaTime;
                    }
                }
            }
        }

        // === PLAGUE BEARER: Constant Rot AoE ===
        if (BoonSystem.hasBoon('plague_bearer')) {
            if (game.enemies) {
                const auraRadius = 2;
                for (const enemy of game.enemies) {
                    if (enemy.hp <= 0) continue;
                    const dist = Math.sqrt(
                        Math.pow(enemy.gridX - game.player.gridX, 2) +
                        Math.pow(enemy.gridY - game.player.gridY, 2)
                    );
                    if (dist <= auraRadius) {
                        if (typeof applyStatusEffect === 'function') {
                            applyStatusEffect(enemy, 'rot', game.player);
                        }
                    }
                }
            }
        }

        // === EXECUTIONER'S GAIT: Clear expired speed buff ===
        if (game.player.boonBuffs?.executionersGait) {
            if (Date.now() > game.player.boonBuffs.executionersGait.expiresAt) {
                delete game.player.boonBuffs.executionersGait;
            }
        }
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.BoonCombatIntegration = BoonCombatIntegration;

console.log('[BoonCombatIntegration] Loaded');
