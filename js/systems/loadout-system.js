// === js/systems/loadout-system.js ===
// SURVIVAL EXTRACTION UPDATE: Pre-run loadout selection

// ============================================================================
// LOADOUT SYSTEM
// ============================================================================

const LoadoutSystem = {

    // Current loadout being assembled
    currentLoadout: {
        weapon: null,
        armor: [],
        consumables: [],
        materials: [],
        gold: 0
    },

    // Track bank indices for removal
    selectedIndices: new Set(),

    // Using basic loadout (doesn't withdraw from bank)
    usingBasicLoadout: false,

    // ========================================================================
    // BASIC STARTER LOADOUT - Always available
    // ========================================================================

    BASIC_LOADOUT: {
        weapon: {
            name: 'Rusty Shortsword',
            type: 'weapon',
            damage: 5,
            description: 'A worn but serviceable blade.',
            proficiency: 'Blade',
            rarity: 'common'
        },
        consumables: [
            {
                name: 'Weak Health Potion',
                type: 'consumable',
                count: 2,
                description: 'Restores 25 HP.',
                healAmount: 25
            }
        ]
    },

    // ========================================================================
    // LOADOUT MANAGEMENT
    // ========================================================================

    /**
     * Reset loadout to empty
     */
    reset() {
        this.currentLoadout = {
            weapon: null,
            armor: [],
            consumables: [],
            materials: [],
            gold: 0
        };
        this.selectedIndices.clear();
        this.usingBasicLoadout = false;
        console.log('[LoadoutSystem] Loadout reset');
    },

    /**
     * Select the basic starter loadout (always available)
     * This doesn't withdraw from bank - provides free starter gear
     */
    selectBasicLoadout() {
        this.reset();
        this.usingBasicLoadout = true;

        // Copy basic loadout items
        this.currentLoadout.weapon = { ...this.BASIC_LOADOUT.weapon };
        this.currentLoadout.consumables = this.BASIC_LOADOUT.consumables.map(c => ({ ...c }));

        console.log('[LoadoutSystem] Basic loadout selected');
    },

    /**
     * Check if basic loadout is selected
     * @returns {boolean}
     */
    isBasicLoadout() {
        return this.usingBasicLoadout;
    },

    /**
     * Select a weapon for the loadout
     * @param {number} bankIndex - Index in bank items
     * @returns {boolean} Success
     */
    selectWeapon(bankIndex) {
        const item = persistentState.bank.items[bankIndex];
        if (!item || item.type !== 'weapon') {
            console.warn('[LoadoutSystem] Invalid weapon selection');
            return false;
        }

        // Deselect previous weapon if any
        if (this.currentLoadout.weapon) {
            this.selectedIndices.delete(this.currentLoadout.weapon._bankIndex);
        }

        this.currentLoadout.weapon = { ...item, _bankIndex: bankIndex };
        this.selectedIndices.add(bankIndex);

        console.log(`[LoadoutSystem] Selected weapon: ${item.name}`);
        return true;
    },

    /**
     * Deselect weapon
     */
    deselectWeapon() {
        if (this.currentLoadout.weapon) {
            this.selectedIndices.delete(this.currentLoadout.weapon._bankIndex);
            this.currentLoadout.weapon = null;
            console.log('[LoadoutSystem] Weapon deselected');
        }
    },

    /**
     * Select armor piece
     * @param {number} bankIndex - Index in bank items
     * @returns {boolean} Success
     */
    selectArmor(bankIndex) {
        const item = persistentState.bank.items[bankIndex];
        if (!item || item.type !== 'armor') {
            console.warn('[LoadoutSystem] Invalid armor selection');
            return false;
        }

        // Check if slot already filled
        const existingIndex = this.currentLoadout.armor.findIndex(
            a => a.slot === item.slot
        );

        if (existingIndex >= 0) {
            // Replace existing
            const old = this.currentLoadout.armor[existingIndex];
            this.selectedIndices.delete(old._bankIndex);
            this.currentLoadout.armor[existingIndex] = { ...item, _bankIndex: bankIndex };
        } else {
            this.currentLoadout.armor.push({ ...item, _bankIndex: bankIndex });
        }

        this.selectedIndices.add(bankIndex);
        console.log(`[LoadoutSystem] Selected armor: ${item.name} (${item.slot})`);
        return true;
    },

    /**
     * Deselect armor by slot
     * @param {string} slot - Armor slot
     */
    deselectArmor(slot) {
        const index = this.currentLoadout.armor.findIndex(a => a.slot === slot);
        if (index >= 0) {
            const item = this.currentLoadout.armor[index];
            this.selectedIndices.delete(item._bankIndex);
            this.currentLoadout.armor.splice(index, 1);
            console.log(`[LoadoutSystem] Armor deselected: ${slot}`);
        }
    },

    /**
     * Add consumable to loadout
     * @param {number} bankIndex - Index in bank items
     * @param {number} count - How many to take
     * @returns {boolean} Success
     */
    addConsumable(bankIndex, count = 1) {
        const item = persistentState.bank.items[bankIndex];
        if (!item || item.type !== 'consumable') {
            console.warn('[LoadoutSystem] Invalid consumable selection');
            return false;
        }

        // Check if already added
        const existing = this.currentLoadout.consumables.find(
            c => c._bankIndex === bankIndex
        );

        if (existing) {
            // Update count
            const maxCount = item.count || 1;
            existing.count = Math.min(existing.count + count, maxCount);
        } else {
            const takeCount = Math.min(count, item.count || 1);
            this.currentLoadout.consumables.push({
                ...item,
                count: takeCount,
                _bankIndex: bankIndex
            });
            this.selectedIndices.add(bankIndex);
        }

        console.log(`[LoadoutSystem] Added consumable: ${item.name}`);
        return true;
    },

    /**
     * Remove consumable from loadout
     * @param {number} bankIndex
     */
    removeConsumable(bankIndex) {
        const index = this.currentLoadout.consumables.findIndex(
            c => c._bankIndex === bankIndex
        );
        if (index >= 0) {
            this.currentLoadout.consumables.splice(index, 1);
            this.selectedIndices.delete(bankIndex);
            console.log('[LoadoutSystem] Consumable removed');
        }
    },

    /**
     * Set gold amount to carry
     * @param {number} amount
     */
    setGold(amount) {
        const maxGold = persistentState.bank.gold;
        this.currentLoadout.gold = Math.max(0, Math.min(amount, maxGold));
        console.log(`[LoadoutSystem] Gold set to ${this.currentLoadout.gold}`);
    },

    // ========================================================================
    // LOADOUT INFO
    // ========================================================================

    /**
     * Get current loadout summary
     * @returns {Object}
     */
    getSummary() {
        return {
            weapon: this.currentLoadout.weapon ? this.currentLoadout.weapon.name : 'None',
            armorCount: this.currentLoadout.armor.length,
            armorSlots: this.currentLoadout.armor.map(a => a.slot),
            consumableCount: this.currentLoadout.consumables.reduce(
                (sum, c) => sum + (c.count || 1), 0
            ),
            gold: this.currentLoadout.gold,
            totalItems: this.selectedIndices.size
        };
    },

    /**
     * Get detailed loadout
     * @returns {Object}
     */
    getLoadout() {
        return {
            weapon: this.currentLoadout.weapon,
            armor: [...this.currentLoadout.armor],
            consumables: [...this.currentLoadout.consumables],
            gold: this.currentLoadout.gold
        };
    },

    /**
     * Check if an item is selected
     * @param {number} bankIndex
     * @returns {boolean}
     */
    isSelected(bankIndex) {
        return this.selectedIndices.has(bankIndex);
    },

    /**
     * Calculate total value at risk
     * @returns {number}
     */
    getValueAtRisk() {
        let total = this.currentLoadout.gold;

        if (this.currentLoadout.weapon) {
            total += this.currentLoadout.weapon.sellValue ||
                BankingSystem._calculateSellValue(this.currentLoadout.weapon);
        }

        this.currentLoadout.armor.forEach(a => {
            total += a.sellValue || BankingSystem._calculateSellValue(a);
        });

        this.currentLoadout.consumables.forEach(c => {
            const value = c.sellValue || BankingSystem._calculateSellValue(c);
            total += value * (c.count || 1);
        });

        return total;
    },

    // ========================================================================
    // CONFIRM & START RUN
    // ========================================================================

    /**
     * Confirm loadout and prepare for run
     * Removes items from bank, returns inventory for session
     * @returns {Object} { inventory: Array, gold: number }
     */
    confirmLoadout() {
        const inventory = [];

        // BASIC LOADOUT: Items are free, don't withdraw from bank
        if (this.usingBasicLoadout) {
            // Add basic loadout items directly to inventory
            if (this.currentLoadout.weapon) {
                inventory.push({ ...this.currentLoadout.weapon });
            }
            this.currentLoadout.consumables.forEach(cons => {
                inventory.push({ ...cons });
            });

            console.log(`[LoadoutSystem] Basic loadout confirmed: ${inventory.length} items`);
            this.reset();
            return { inventory, gold: 0 };
        }

        // CUSTOM LOADOUT: Withdraw items from bank
        const withdrawals = [];

        // Weapon
        if (this.currentLoadout.weapon) {
            withdrawals.push({
                index: this.currentLoadout.weapon._bankIndex,
                count: 1,
                item: this.currentLoadout.weapon
            });
        }

        // Armor
        this.currentLoadout.armor.forEach(armor => {
            withdrawals.push({
                index: armor._bankIndex,
                count: 1,
                item: armor
            });
        });

        // Consumables (may be partial stacks)
        this.currentLoadout.consumables.forEach(cons => {
            withdrawals.push({
                index: cons._bankIndex,
                count: cons.count || 1,
                item: cons
            });
        });

        // Sort by index descending to avoid shifting issues
        withdrawals.sort((a, b) => b.index - a.index);

        // Perform withdrawals
        withdrawals.forEach(w => {
            const withdrawn = BankingSystem.withdraw(w.index, w.count);
            if (withdrawn) {
                // Clean up internal tracking
                delete withdrawn._bankIndex;
                inventory.push(withdrawn);
            }
        });

        // Withdraw gold
        const gold = this.currentLoadout.gold;
        if (gold > 0) {
            BankingSystem.withdrawGold(gold);
        }

        console.log(`[LoadoutSystem] Loadout confirmed: ${inventory.length} items, ${gold} gold`);

        // Reset for next time
        this.reset();

        return { inventory, gold };
    },

    /**
     * Quick loadout - select best gear automatically
     * @param {string} strategy - 'balanced', 'aggressive', 'defensive'
     */
    autoSelect(strategy = 'balanced') {
        this.reset();

        const bank = persistentState.bank.items;

        // Auto-select best weapon
        const weapons = bank
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.type === 'weapon')
            .sort((a, b) => (b.item.damage || 0) - (a.item.damage || 0));

        if (weapons.length > 0) {
            this.selectWeapon(weapons[0].index);
        }

        // Auto-select armor for each slot
        const armorSlots = ['HEAD', 'CHEST', 'LEGS', 'FEET'];
        armorSlots.forEach(slot => {
            const armors = bank
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.type === 'armor' && item.slot === slot)
                .sort((a, b) => ((b.item.pDef || 0) + (b.item.mDef || 0)) -
                                ((a.item.pDef || 0) + (a.item.mDef || 0)));

            if (armors.length > 0) {
                this.selectArmor(armors[0].index);
            }
        });

        // Auto-select some consumables
        const healthPotions = bank
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.type === 'consumable' &&
                                  item.name.toLowerCase().includes('health'));

        healthPotions.slice(0, 3).forEach(({ index }) => {
            this.addConsumable(index, 5);
        });

        // Take some gold based on strategy
        const goldPercent = strategy === 'aggressive' ? 0.5 :
                           strategy === 'defensive' ? 0.1 : 0.25;
        this.setGold(Math.floor(persistentState.bank.gold * goldPercent));

        console.log(`[LoadoutSystem] Auto-selected loadout (${strategy})`);
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.LoadoutSystem = LoadoutSystem;

console.log('[LoadoutSystem] Loadout system initialized');
