// ============================================================================
// EQUIPMENT LOADER - Combines all equipment data files
// ============================================================================

(function() {
    'use strict';

    // Merge all equipment data
    const EQUIPMENT_DATA = {
        ...window.MELEE_WEAPONS,
        ...window.RANGED_WEAPONS,
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
    window.generateLoot = generateLoot;
    window.generateLootByTier = generateLootByTier;

    console.log('[EquipmentLoader] Combined', Object.keys(EQUIPMENT_DATA).length, 'total items');
})();