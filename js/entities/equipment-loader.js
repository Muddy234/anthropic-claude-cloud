// ============================================================================
// EQUIPMENT LOADER - Combines all equipment data files
// ============================================================================

(function() {
    'use strict';

    // Merge all equipment data
    const EQUIPMENT_DATA = {
        ...window.MELEE_WEAPONS,
        ...window.RANGED_WEAPONS,
        ...window.MAGIC_WEAPONS,
        ...window.DEFENSE_ARMOR,
        ...window.MOBILITY_ARMOR
    };

    // Helper functions
    function getEquipment(id) {
        return EQUIPMENT_DATA[id] || null;
    }

    function getEquipmentBySlot(slot) {
        return Object.values(EQUIPMENT_DATA).filter(e => e.slot === slot);
    }

    function getEquipmentByRarity(rarity) {
        return Object.values(EQUIPMENT_DATA).filter(e => e.rarity === rarity);
    }

    function getEquipmentByElement(element) {
        return Object.values(EQUIPMENT_DATA).filter(e => e.element === element);
    }

    function getEquipmentByDamageType(type) {
        return Object.values(EQUIPMENT_DATA).filter(e => e.damageType === type);
    }

    function getWeapons() {
        return Object.values(EQUIPMENT_DATA).filter(e => e.damageType);
    }

    function getArmor() {
        return Object.values(EQUIPMENT_DATA).filter(e => 
            e.armorType && e.stats && e.stats.block === undefined
        );
    }

    function getShields() {
        return Object.values(EQUIPMENT_DATA).filter(e => 
            e.stats && e.stats.block !== undefined
        );
    }

    function getUtility() {
        return Object.values(EQUIPMENT_DATA).filter(e => 
            e.slot === 'OFF' && !e.damageType && !e.stats?.block
        );
    }

    // Stat Generation
    function generateStats(item) {
        const { damageType, armorType, rarity } = item;

        // Rarity-based stat point pools
        const statPools = {
            common: { min: 2, max: 4 },
            uncommon: { min: 4, max: 8 },
            rare: { min: 8, max: 14 },
            epic: { min: 14, max: 22 }
        };

        const pool = statPools[rarity] || statPools.common;
        const totalPoints = Math.floor(Math.random() * (pool.max - pool.min + 1)) + pool.min;

        const stats = { str: 0, agi: 0, int: 0, pDef: 0, mDef: 0 };

        // Weapon stat allocation
        if (damageType) {
            const allocations = {
                blade: { primary: 'str', secondary: 'agi', ratio: 0.6 },
                blunt: { primary: 'str', secondary: 'pDef', ratio: 0.6 },
                pierce: { primary: 'str', secondary: 'agi', ratio: 0.5 },
                bow: { primary: 'agi', secondary: 'int', ratio: 0.6 },
                dagger: { primary: 'agi', secondary: 'str', ratio: 0.6 }
            };

            const alloc = allocations[damageType] || { primary: 'str', secondary: 'agi', ratio: 0.6 };
            const primaryPoints = Math.round(totalPoints * alloc.ratio);
            const secondaryPoints = totalPoints - primaryPoints;

            stats[alloc.primary] = primaryPoints;
            stats[alloc.secondary] = secondaryPoints;
        }
        // Armor stat allocation
        else if (armorType) {
            const allocations = {
                heavy: { primary: 'pDef', secondary: 'str', ratio: 0.6 },
                light: { primary: 'agi', secondary: 'pDef', ratio: 0.6 },
                cloth: { primary: 'int', secondary: 'mDef', ratio: 0.6 }
            };

            const alloc = allocations[armorType] || { primary: 'pDef', secondary: 'str', ratio: 0.6 };
            const primaryPoints = Math.round(totalPoints * alloc.ratio);
            const secondaryPoints = totalPoints - primaryPoints;

            stats[alloc.primary] = primaryPoints;
            stats[alloc.secondary] = secondaryPoints;
        }

        return stats;
    }

    // Loot generation
    function generateLoot(options = {}) {
        const { rarity, slot, element, damageType } = options;
        let pool = Object.values(EQUIPMENT_DATA);

        if (rarity) pool = pool.filter(e => e.rarity === rarity);
        if (slot) pool = pool.filter(e => e.slot === slot);
        if (element) pool = pool.filter(e => e.element === element);
        if (damageType) pool = pool.filter(e => e.damageType === damageType);

        return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    }

    function generateLootByTier(tier) {
        const weights = {
            3: { common: 70, uncommon: 25, rare: 5, epic: 0 },
            2: { common: 40, uncommon: 40, rare: 18, epic: 2 },
            1: { common: 20, uncommon: 35, rare: 35, epic: 10 },
            elite: { common: 5, uncommon: 25, rare: 50, epic: 20 },
            boss: { common: 0, uncommon: 10, rare: 40, epic: 50 }
        };

        const tierWeights = weights[tier] || weights[3];
        const roll = Math.random() * 100;
        let cumulative = 0;
        let selectedRarity = 'common';

        for (const [rarity, weight] of Object.entries(tierWeights)) {
            cumulative += weight;
            if (roll < cumulative) {
                selectedRarity = rarity;
                break;
            }
        }

        return generateLoot({ rarity: selectedRarity });
    }

    // Export to window
    window.EQUIPMENT_DATA = EQUIPMENT_DATA;
    window.getEquipment = getEquipment;
    window.getEquipmentBySlot = getEquipmentBySlot;
    window.getEquipmentByRarity = getEquipmentByRarity;
    window.getEquipmentByElement = getEquipmentByElement;
    window.getEquipmentByDamageType = getEquipmentByDamageType;
    window.getWeapons = getWeapons;
    window.getArmor = getArmor;
    window.getShields = getShields;
    window.getUtility = getUtility;
    window.generateStats = generateStats;
    window.generateLoot = generateLoot;
    window.generateLootByTier = generateLootByTier;

    console.log('[EquipmentLoader] Combined', Object.keys(EQUIPMENT_DATA).length, 'total items');
})();