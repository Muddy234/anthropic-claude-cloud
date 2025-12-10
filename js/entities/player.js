// ============================================================================
// PLAYER - The Shifting Chasm
// ============================================================================
// Updated: Removed starting gear, added attunement tracking, normalized stats
// ============================================================================

function createPlayer() {
    const startX = 40;
    const startY = 40;

    const p = {
        // ====================================================================
        // POSITION
        // ====================================================================
        
        // GRID position (true position - always integer)
        gridX: startX,
        gridY: startY,

        // DISPLAY position (smooth visual interpolation)
        displayX: startX,
        displayY: startY,

        // Legacy position (for compatibility)
        x: startX,
        y: startY,

        // ====================================================================
        // MOVEMENT STATE (Free movement with grid snapping)
        // ====================================================================

        isMoving: false,
        moveProgress: 0,
        moveSpeed: 4,                 // Tiles per second
        targetGridX: startX,
        targetGridY: startY,
        facing: 'down',

        // ====================================================================
        // ANIMATION
        // ====================================================================
        
        animTimer: 0,
        currentFrame: 0,
        animationSpeed: 2,

        // ====================================================================
        // CORE STATS (Normalized - start at 10)
        // ====================================================================
        
        stats: { 
            STR: 10,    // Physical damage, carry capacity
            AGI: 10,    // Attack speed, dodge, crit chance
            INT: 10,    // Magic damage, mana pool
            STA: 10     // Health pool, stamina regen
        },
        
        level: 1,
        xp: 0,
        xpToNextLevel: 100,

        // ====================================================================
        // RESOURCES
        // ====================================================================

        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,

        // Mana system (for magic weapons)
        mp: 100,                      // Current mana
        maxMp: 100,                   // Max mana (fixed at 100)
        manaRegen: 5,                 // Base mana regen per second
        mana: 50,                     // Legacy (deprecated)
        maxMana: 50,                  // Legacy (deprecated)

        // ====================================================================
        // ELEMENT & ATTUNEMENT
        // ====================================================================
        
        element: 'physical',          // Current attack element (from weapon)
        attunement: {
            primary: null,            // Dominant element affinity
            values: {                 // 0-100 for each element
                fire: 0, ice: 0, water: 0, earth: 0, nature: 0,
                death: 0, arcane: 0, dark: 0, holy: 0, physical: 0
            }
        },

        // ====================================================================
        // DERIVED COMBAT STATS
        // ====================================================================
        
        pDef: 0,                      // Physical defense (from armor)
        mDef: 0,                      // Magic defense (from armor)
        critChance: 5,                // Base 5% crit
        dodgeChance: 0,               // Base 0% dodge
        
        // ====================================================================
        // EQUIPMENT (Start with NOTHING equipped)
        // ====================================================================
        
        equipped: {
            HEAD: null,
            CHEST: null,
            LEGS: null,
            FEET: null,
            MAIN: null,               // Main hand weapon
            OFF: null                 // Off hand (shield/secondary)
        },

        // ====================================================================
        // INVENTORY (Start with minimal supplies)
        // ====================================================================
        
        inventory: [
            // Start with empty inventory - player must find items in starter chest
        ],

        // ====================================================================
        // SKILLS SYSTEM
        // ====================================================================
        
        skills: null,                 // Populated by initializePlayerSkills()
        
        abilities: [
            // Slot 0: Always unarmed as fallback
            { 
                name: 'Unarmed Strike', 
                cost: 0, 
                type: 'stamina', 
                baseDmg: 5, 
                scaling: 'STR', 
                accuracy: 85, 
                element: 'physical',
                damageType: 'blunt'
            },
            null,
            null,
            null
        ],

        // ====================================================================
        // COMBAT STATE
        // ====================================================================

        combat: {
            isInCombat: false,
            currentTarget: null,
            attackCooldown: 0,
            attackSpeed: 1.0,         // Base 1.0 = 700ms between attacks
            autoRetaliate: true,
            attackRange: 1            // Melee range (updated by weapon)
        },

        // Active combat system
        inCombat: false,              // Combat state flag (blocks inventory)

        // Global cooldown system
        gcd: {
            active: false,
            remaining: 0,
            duration: 0.5             // 500ms GCD
        },

        // Action cooldowns (individual)
        actionCooldowns: {
            baseAttack: 0,            // Hotkey 1
            skillAttack: 0,           // Hotkey 2
            consumable3: 0,           // Hotkey 3
            consumable4: 0            // Hotkey 4
        },

        // Ammo system (for ranged weapons)
        ammo: {
            arrows: 0,
            bolts: 0
        },

        // Consumable hotkey assignments
        assignedConsumables: {
            slot3: null,              // Item ID assigned to hotkey 3
            slot4: null               // Item ID assigned to hotkey 4
        },

        // Item cooldowns (10s default for all consumables)
        itemCooldowns: {},            // { itemId: remainingSeconds }

        // ====================================================================
        // STATUS
        // ====================================================================
        
        statusEffects: [],            // Active status effects
        isInvisible: false,
        isStunned: false,
        isFrozen: false,
        isRooted: false,
        isSilenced: false,

        // ====================================================================
        // FLAGS
        // ====================================================================
        
        isDead: false,
        isUndead: false               // For holy damage bonus
    };

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    // Calculate derived stats from base stats
    recalculatePlayerStats(p);

    // Initialize skills system if available
    if (typeof initializePlayerSkills === 'function') {
        initializePlayerSkills(p);
    }

    // Update action hotkeys for unarmed
    if (typeof updateActionHotkeys === 'function') {
        updateActionHotkeys(p);
    }

    // Initialize tileset
    if (typeof initTileset === 'function') {
        initTileset();
    }

    console.log('[Player] Created with normalized stats, no starting equipment');
    return p;
}

// ============================================================================
// STAT CALCULATION
// ============================================================================

/**
 * Recalculate derived stats from base stats and equipment
 */
function recalculatePlayerStats(player) {
    if (!player) player = game.player;
    if (!player) return;

    const stats = player.stats;
    const equipped = player.equipped;

    // Reset derived stats
    let bonusSTR = 0, bonusAGI = 0, bonusINT = 0, bonusSTA = 0;
    let bonusPDef = 0, bonusMDef = 0;

    // Sum equipment bonuses
    const slots = ['HEAD', 'CHEST', 'LEGS', 'FEET', 'MAIN', 'OFF'];
    for (const slot of slots) {
        const item = equipped[slot];
        if (!item) continue;

        // Stat bonuses
        if (item.stats) {
            bonusSTR += item.stats.str || item.stats.STR || 0;
            bonusAGI += item.stats.agi || item.stats.AGI || 0;
            bonusINT += item.stats.int || item.stats.INT || 0;
            bonusSTA += item.stats.sta || item.stats.STA || 0;
            bonusPDef += item.stats.pDef || item.stats.defense || 0;
            bonusMDef += item.stats.mDef || 0;
        }
        
        // Direct stat properties (legacy format)
        bonusSTR += item.str || 0;
        bonusAGI += item.agi || 0;
        bonusINT += item.int || 0;
        bonusSTA += item.sta || 0;
        bonusPDef += item.pDef || 0;
        bonusMDef += item.mDef || 0;
    }

    // Apply status effect modifiers
    if (typeof StatusEffectSystem !== 'undefined') {
        // These return percentage modifiers (-0.25 to +0.25 etc)
        // For now we skip this - status effects modify damage directly
    }

    // Calculate max HP from STA
    const totalSTA = stats.STA + bonusSTA;
    player.maxHp = 80 + (totalSTA * 2);  // 80 base + 2 per STA

    // Calculate max Stamina from STA
    player.maxStamina = 80 + (totalSTA * 2);

    // Calculate max Mana from INT (legacy system)
    const totalINT = stats.INT + bonusINT;
    player.maxMana = 30 + (totalINT * 2);  // 30 base + 2 per INT (deprecated)

    // New mana system: maxMp is fixed at 100, INT affects regen
    player.maxMp = 100;
    player.manaRegen = 5 * (1 + totalINT / 100);  // 5 base × (1 + INT/100)

    // Set defense values
    player.pDef = bonusPDef;
    player.mDef = bonusMDef;

    // Crit chance from AGI (base 5% + 0.3% per AGI over 10)
    const totalAGI = stats.AGI + bonusAGI;
    player.critChance = 5 + Math.max(0, (totalAGI - 10) * 0.3);

    // Dodge chance from AGI (0.2% per AGI over 10)
    player.dodgeChance = Math.max(0, (totalAGI - 10) * 0.2);

    // Update attack speed from weapon
    const weapon = equipped.MAIN;
    if (weapon?.stats?.speed) {
        player.combat.attackSpeed = weapon.stats.speed;
    } else if (weapon?.attackSpeed) {
        player.combat.attackSpeed = weapon.attackSpeed;
    } else {
        player.combat.attackSpeed = 1.0; // Unarmed base
    }

    // Update attack range from weapon
    if (weapon?.stats?.range) {
        player.combat.attackRange = weapon.stats.range;
    } else if (weapon?.attackRange) {
        player.combat.attackRange = weapon.attackRange;
    } else {
        player.combat.attackRange = 1; // Melee default
    }

    // Update element from weapon
    if (weapon?.element) {
        player.element = weapon.element;
    } else {
        player.element = 'physical';
    }

    // Log if debugging
    if (typeof Debug !== 'undefined' && Debug._showStats) {
        console.log('[Player] Stats recalculated:', {
            maxHp: player.maxHp,
            maxMana: player.maxMana,
            pDef: player.pDef,
            critChance: player.critChance.toFixed(1) + '%',
            element: player.element
        });
    }
}

// ============================================================================
// EQUIPMENT MANAGEMENT
// ============================================================================

/**
 * Equip an item from inventory
 */
function equipItem(player, itemIndex) {
    if (!player || !player.inventory[itemIndex]) return false;

    const item = player.inventory[itemIndex];
    const slot = item.slot || item.category;
    
    if (!slot || !player.equipped.hasOwnProperty(slot)) {
        console.warn(`[Player] Cannot equip ${item.name} - invalid slot: ${slot}`);
        return false;
    }

    // Unequip current item in slot (if any)
    const currentItem = player.equipped[slot];
    if (currentItem) {
        player.inventory.push({ ...currentItem, count: 1 });
    }

    // Equip new item
    player.equipped[slot] = { ...item };
    
    // Remove from inventory (or decrement count)
    if (item.count > 1) {
        item.count--;
    } else {
        player.inventory.splice(itemIndex, 1);
    }

    // Recalculate stats
    recalculatePlayerStats(player);

    // Update abilities if weapon changed
    if (slot === 'MAIN' && typeof updateActionHotkeys === 'function') {
        updateActionHotkeys(player);
    }

    console.log(`[Player] Equipped ${item.name} in ${slot}`);
    return true;
}

/**
 * Unequip an item from a slot
 */
function unequipItem(player, slot) {
    if (!player || !player.equipped[slot]) return false;

    const item = player.equipped[slot];
    player.inventory.push({ ...item, count: 1 });
    player.equipped[slot] = null;

    recalculatePlayerStats(player);

    if (slot === 'MAIN' && typeof updateActionHotkeys === 'function') {
        updateActionHotkeys(player);
    }

    console.log(`[Player] Unequipped ${item.name} from ${slot}`);
    return true;
}

// ============================================================================
// ATTUNEMENT
// ============================================================================

/**
 * Get player's current attunement to an element
 */
function getPlayerAttunement(element) {
    if (!game.player?.attunement?.values) return 0;
    return game.player.attunement.values[element] || 0;
}

/**
 * Update player's attunement (called by AttunementSystem)
 */
function setPlayerAttunement(element, value) {
    if (!game.player?.attunement?.values) return;
    game.player.attunement.values[element] = Math.max(0, Math.min(100, value));
    
    // Update primary if this is now highest
    let highest = 0;
    let primary = null;
    for (const el in game.player.attunement.values) {
        if (game.player.attunement.values[el] > highest) {
            highest = game.player.attunement.values[el];
            primary = el;
        }
    }
    game.player.attunement.primary = highest >= 25 ? primary : null;
}

// ============================================================================
// LEVEL UP
// ============================================================================

/**
 * Check for level up and apply
 */
function checkLevelUp(player) {
    if (!player) player = game.player;
    if (!player) return;

    while (player.xp >= player.xpToNextLevel) {
        player.xp -= player.xpToNextLevel;
        player.level++;
        player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5);

        // Stat gains per level
        player.stats.STR += 1;
        player.stats.AGI += 1;
        player.stats.INT += 1;
        player.stats.STA += 1;

        // Recalculate and heal
        recalculatePlayerStats(player);
        player.hp = player.maxHp;
        player.stamina = player.maxStamina;
        player.mana = player.maxMana;

        if (typeof addMessage === 'function') {
            addMessage(`Level up! You are now level ${player.level}!`);
        }
        console.log(`[Player] Leveled up to ${player.level}`);
    }
}

// ============================================================================
// DEATH & RESET
// ============================================================================

/**
 * Reset player for new game (roguelike death)
 */
function resetPlayer() {
    const newPlayer = createPlayer();
    return newPlayer;
}

/**
 * Handle player death
 */
function handlePlayerDeath() {
    if (game.player.skills && typeof resetPlayerSkills === 'function') {
        resetPlayerSkills(game.player);
    }
    
    // Clear status effects
    if (typeof clearStatusEffects === 'function') {
        clearStatusEffects(game.player);
    }
    
    game.player.isDead = true;
    game.state = 'gameover';
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.createPlayer = createPlayer;
    window.recalculatePlayerStats = recalculatePlayerStats;
    window.equipItem = equipItem;
    window.unequipItem = unequipItem;
    window.getPlayerAttunement = getPlayerAttunement;
    window.setPlayerAttunement = setPlayerAttunement;
    window.checkLevelUp = checkLevelUp;
    window.resetPlayer = resetPlayer;
    window.handlePlayerDeath = handlePlayerDeath;
}

console.log('✅ Player system loaded (normalized stats, no starting gear)');
