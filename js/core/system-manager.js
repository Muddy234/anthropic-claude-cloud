// ============================================================================
// SYSTEM MANAGER - The Shifting Chasm
// ============================================================================
// Updated: Added new systems to expected list, improved diagnostics
// ============================================================================

// ============================================================================
// EXPECTED SYSTEMS LIST
// ============================================================================

const EXPECTED_SYSTEMS = [
    // Input & Movement (10-29)
    'input-handler',           // 10 - Capture input before anything moves
    'pokemon-movement',        // 20 - Player movement based on input
    'player-animation',        // 25 - Animation follows movement
    
    // Environmental (30-39)
    'noise-system',            // 30 - Process noise events before AI reacts
    'hazards',                 // 35 - Environmental hazard updates
    
    // AI & Behavior (40-49)
    'enemy-ai',                // 40 - AI decisions based on noise and player
    'monster-social',          // 42 - Pack/swarm coordination
    'monster-animation-system',// 43 - Monster sprite animations

    // Combat (50-59)
    'combat-system',           // 50 - Combat after all movement resolved
    'skills-combat',           // 55 - Skills-combat integration
    'status-effects',          // 56 - Status effect ticks
    
    // Post-Combat (60-79)
    'skill-system',            // 60 - Skill cooldowns/effects
    'inventory-system',        // 65 - Inventory updates
    'loot-system',             // 70 - Loot despawn timers
    
    // Environment & UI (80-99)
    'shift-system',            // 80 - Environmental hazards
    'merchant-shop'            // 90 - UI state updates last
];

// Optional systems (may not always be present)
const OPTIONAL_SYSTEMS = [
    'debug-overlay',
    'tutorial',
    'achievement-tracker',
    'analytics'
];

// ============================================================================
// SYSTEM MANAGER
// ============================================================================

const SystemManager = {
    // Registry: Map<name, {system, priority, enabled}>
    systems: new Map(),
    
    // Sorted array for update order
    _sortedSystems: [],
    
    // Needs resort flag
    _needsSort: false,
    
    // Initialization state
    _initialized: false,
    
    // ========================================================================
    // REGISTRATION
    // ========================================================================
    
    /**
     * Register a system with the manager
     * @param {string} name - Unique system identifier
     * @param {object} system - System object with update(dt) method
     * @param {number} priority - Execution order (lower = earlier)
     */
    register(name, system, priority = 50) {
        if (this.systems.has(name)) {
            console.warn(`[SystemManager] Overwriting existing system: ${name}`);
        }
        
        this.systems.set(name, {
            name: name,
            system: system,
            priority: priority,
            enabled: true
        });
        
        this._needsSort = true;
        
        console.log(`[SystemManager] Registered: ${name} (priority: ${priority})`);
    },
    
    /**
     * Unregister a system
     */
    unregister(name) {
        if (this.systems.has(name)) {
            this.systems.delete(name);
            this._needsSort = true;
            console.log(`[SystemManager] Unregistered: ${name}`);
        }
    },
    
    // ========================================================================
    // LIFECYCLE
    // ========================================================================
    
    /**
     * Initialize all registered systems
     */
    initAll(gameRef) {
        this._rebuildSortedSystems();
        
        console.log('[SystemManager] Initializing all systems...');
        let initCount = 0;
        
        for (const entry of this._sortedSystems) {
            if (!entry.enabled) continue;
            
            try {
                if (typeof entry.system.init === 'function') {
                    entry.system.init(gameRef);
                    initCount++;
                }
            } catch (e) {
                console.error(`[SystemManager] Error initializing ${entry.name}:`, e);
            }
        }
        
        this._initialized = true;
        console.log(`[SystemManager] Initialized ${initCount} systems`);
    },
    
    /**
     * Update all enabled systems in priority order
     */
    updateAll(deltaTime) {
        if (!this._initialized) return;
        
        if (this._needsSort) {
            this._rebuildSortedSystems();
        }
        
        for (const entry of this._sortedSystems) {
            if (!entry.enabled) continue;
            
            try {
                if (typeof entry.system.update === 'function') {
                    entry.system.update(deltaTime);
                }
            } catch (e) {
                console.error(`[SystemManager] Error updating ${entry.name}:`, e);
            }
        }
    },
    
    /**
     * Cleanup all systems (floor transition, game end)
     */
    cleanupAll() {
        console.log('[SystemManager] Cleaning up all systems...');
        let cleanupCount = 0;
        
        for (const entry of this._sortedSystems) {
            try {
                if (typeof entry.system.cleanup === 'function') {
                    entry.system.cleanup();
                    cleanupCount++;
                }
            } catch (e) {
                console.error(`[SystemManager] Error cleaning up ${entry.name}:`, e);
            }
        }
        
        console.log(`[SystemManager] Cleaned up ${cleanupCount} systems`);
    },
    
    // ========================================================================
    // SYSTEM CONTROL
    // ========================================================================
    
    /**
     * Enable a system
     */
    enable(name) {
        const entry = this.systems.get(name);
        if (entry) {
            entry.enabled = true;
            console.log(`[SystemManager] Enabled: ${name}`);
        }
    },
    
    /**
     * Disable a system
     */
    disable(name) {
        const entry = this.systems.get(name);
        if (entry) {
            entry.enabled = false;
            console.log(`[SystemManager] Disabled: ${name}`);
        }
    },
    
    /**
     * Toggle a system
     */
    toggle(name) {
        const entry = this.systems.get(name);
        if (entry) {
            entry.enabled = !entry.enabled;
            console.log(`[SystemManager] ${name}: ${entry.enabled ? 'enabled' : 'disabled'}`);
        }
    },
    
    /**
     * Check if system is enabled
     */
    isEnabled(name) {
        const entry = this.systems.get(name);
        return entry ? entry.enabled : false;
    },
    
    // ========================================================================
    // INTERNAL
    // ========================================================================
    
    /**
     * Rebuild sorted systems array
     */
    _rebuildSortedSystems() {
        this._sortedSystems = Array.from(this.systems.values())
            .sort((a, b) => a.priority - b.priority);
        this._needsSort = false;
    },
    
    // ========================================================================
    // VERIFICATION & DIAGNOSTICS
    // ========================================================================
    
    /**
     * Verify all expected systems are registered
     */
    verify() {
        const registered = new Set(this.systems.keys());
        const missing = EXPECTED_SYSTEMS.filter(name => !registered.has(name));
        const unexpected = Array.from(this.systems.keys())
            .filter(name => !EXPECTED_SYSTEMS.includes(name) && !OPTIONAL_SYSTEMS.includes(name));
        
        if (missing.length === 0) {
            console.log(`✅ All expected systems registered (${this.systems.size}/${EXPECTED_SYSTEMS.length})`);
        } else {
            console.warn(`⚠️ Missing systems: ${missing.join(', ')}`);
            console.log(`   Registered: ${this.systems.size}/${EXPECTED_SYSTEMS.length}`);
        }
        
        if (unexpected.length > 0) {
            console.log(`ℹ️ Additional systems: ${unexpected.join(', ')}`);
        }
        
        return missing.length === 0;
    },
    
    /**
     * Output detailed diagnostic table
     */
    diagnose() {
        this._rebuildSortedSystems();
        
        console.log('\n╔══════════════════════════════════════════════════════════════════╗');
        console.log('║                    SYSTEM MANAGER DIAGNOSTIC                     ║');
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        
        // Build table data
        const tableData = this._sortedSystems.map((entry, index) => ({
            '#': index,
            name: entry.name,
            priority: entry.priority,
            enabled: entry.enabled ? '✓' : '✗',
            hasInit: typeof entry.system.init === 'function' ? '✓' : '-',
            hasUpdate: typeof entry.system.update === 'function' ? '✓' : '✗',
            hasCleanup: typeof entry.system.cleanup === 'function' ? '✓' : '-'
        }));
        
        // Console.table if available
        if (typeof console.table === 'function') {
            console.table(tableData);
        } else {
            console.log('# | Name                | Pri | On  | Init | Update | Clean');
            console.log('─'.repeat(65));
            for (const row of tableData) {
                console.log(
                    `${row['#'].toString().padStart(2)} | ` +
                    `${row.name.padEnd(19)} | ` +
                    `${row.priority.toString().padStart(3)} | ` +
                    `${row.enabled.padStart(3)} | ` +
                    `${row.hasInit.padStart(4)} | ` +
                    `${row.hasUpdate.padStart(6)} | ` +
                    `${row.hasCleanup}`
                );
            }
        }
        
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        
        // Show missing
        const registered = new Set(this.systems.keys());
        const missing = EXPECTED_SYSTEMS.filter(name => !registered.has(name));
        if (missing.length > 0) {
            console.log(`║ ⚠️  Missing: ${missing.join(', ').substring(0, 50).padEnd(50)} ║`);
        }
        
        // Show unexpected
        const unexpected = Array.from(this.systems.keys())
            .filter(name => !EXPECTED_SYSTEMS.includes(name) && !OPTIONAL_SYSTEMS.includes(name));
        if (unexpected.length > 0) {
            console.log(`║ ℹ️  Extra: ${unexpected.join(', ').substring(0, 52).padEnd(52)} ║`);
        }
        
        console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    },
    
    // ========================================================================
    // QUERIES
    // ========================================================================
    
    /**
     * Get a registered system by name
     */
    get(name) {
        const entry = this.systems.get(name);
        return entry ? entry.system : null;
    },
    
    /**
     * Check if system is registered
     */
    has(name) {
        return this.systems.has(name);
    },
    
    /**
     * Get count of registered systems
     */
    get count() {
        return this.systems.size;
    },
    
    /**
     * Get all system names
     */
    getNames() {
        return Array.from(this.systems.keys());
    },
    
    /**
     * Get systems by priority range
     */
    getByPriorityRange(min, max) {
        return this._sortedSystems
            .filter(entry => entry.priority >= min && entry.priority <= max)
            .map(entry => entry.system);
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.SystemManager = SystemManager;
    window.EXPECTED_SYSTEMS = EXPECTED_SYSTEMS;
    window.OPTIONAL_SYSTEMS = OPTIONAL_SYSTEMS;
}

console.log('✅ SystemManager loaded');
console.log(`   Expected systems: ${EXPECTED_SYSTEMS.length}`);
