// ============================================================================
// DEBUG COMMANDS - Console Testing Interface
// ============================================================================
// Usage: Open browser console and type debug.help() for commands
// ============================================================================

const Debug = {
    // ========================================================================
    // HELP
    // ========================================================================
    help() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    DEBUG COMMANDS                            ║
╠══════════════════════════════════════════════════════════════╣
║ MONSTERS                                                     ║
║   debug.spawn(id, x, y)     - Spawn monster at position      ║
║   debug.killAll()           - Kill all enemies               ║
║   debug.listMonsters()      - List all monster IDs           ║
║   debug.healAll()           - Heal all enemies to full       ║
║                                                              ║
║ PLAYER                                                       ║
║   debug.heal()              - Heal player to full            ║
║   debug.godMode()           - Toggle invincibility           ║
║   debug.teleport(x, y)      - Move player to position        ║
║   debug.addGold(n)          - Add gold                       ║
║   debug.setStats(s,a,i,st)  - Set STR/AGI/INT/STA           ║
║                                                              ║
║ EQUIPMENT                                                    ║
║   debug.give(id)            - Add item to inventory          ║
║   debug.equip(id)           - Equip item directly            ║
║   debug.listItems(filter)   - List equipment IDs             ║
║   debug.clearInventory()    - Remove all items               ║
║                                                              ║
║ ELEMENTS                                                     ║
║   debug.testElement(a, d)   - Test element modifier          ║
║   debug.testWeaponArmor(w,a)- Test weapon vs armor           ║
║   debug.testDamage(idx)     - Full damage calc vs enemy      ║
║                                                              ║
║ ROOMS                                                        ║
║   debug.listRooms()         - List all rooms with elements   ║
║   debug.setRoomElement(i,e) - Change room element            ║
║   debug.gotoRoom(idx)       - Teleport to room center        ║
║                                                              ║
║ STATUS EFFECTS                                               ║
║   debug.applyStatus(id, t)  - Apply status (t=player/0-n)    ║
║   debug.removeStatus(id, t) - Remove status                  ║
║   debug.listStatus(t)       - List active statuses           ║
║   debug.clearStatus(t)      - Clear all statuses             ║
║                                                              ║
║ ATTUNEMENT                                                   ║
║   debug.showAttunement()    - Show player attunement         ║
║   debug.setAttunement(e, v) - Set attunement value           ║
║                                                              ║
║ HAZARDS                                                      ║
║   debug.spawnHazard(id,x,y) - Spawn hazard at position       ║
║   debug.listHazards()       - List all hazard types          ║
║   debug.clearHazards()      - Remove all hazards             ║
║                                                              ║
║ SYSTEMS                                                      ║
║   debug.systems()           - Show registered systems        ║
║   debug.fps()               - Toggle FPS display             ║
║   debug.logging(bool)       - Toggle debug logging           ║
╚══════════════════════════════════════════════════════════════╝
        `);
    },

    // ========================================================================
    // MONSTERS
    // ========================================================================
    spawn(id, x, y) {
        if (!id) { console.log('Usage: debug.spawn("monster_id", x, y)'); return; }
        x = x ?? game.player.gridX + 2;
        y = y ?? game.player.gridY;
        
        const template = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[id] : null;
        if (!template) { console.error(`Unknown monster: ${id}`); return; }
        
        const enemy = {
            id: `debug_${Date.now()}`,
            name: id,
            typeId: id,
            gridX: x, gridY: y, x, y,
            displayX: x, displayY: y,
            hp: template.stats?.health || 50,
            maxHp: template.stats?.health || 50,
            ...template,
            combat: { isInCombat: false, currentTarget: null, attackCooldown: 0, attackSpeed: 2.0, autoRetaliate: true, attackRange: 1 }
        };
        
        game.enemies.push(enemy);
        if (typeof AIManager !== 'undefined') AIManager.registerEnemy(enemy);
        console.log(`Spawned ${id} at (${x}, ${y})`);
    },

    killAll() {
        const count = game.enemies.length;
        game.enemies.forEach(e => e.hp = 0);
        game.enemies = [];
        if (typeof AIManager !== 'undefined') AIManager.ais?.clear();
        console.log(`Killed ${count} enemies`);
    },

    listMonsters() {
        if (typeof MONSTER_DATA === 'undefined') { console.log('MONSTER_DATA not loaded'); return; }
        const monsters = Object.keys(MONSTER_DATA);
        console.log(`Available monsters (${monsters.length}):`);
        monsters.forEach(m => {
            const d = MONSTER_DATA[m];
            console.log(`  ${m} - ${d.tier || '?'} - ${d.element || 'physical'}`);
        });
    },

    healAll() {
        game.enemies.forEach(e => e.hp = e.maxHp);
        console.log(`Healed ${game.enemies.length} enemies`);
    },

    // ========================================================================
    // PLAYER
    // ========================================================================
    heal() {
        game.player.hp = game.player.maxHp;
        game.player.stamina = game.player.maxStamina;
        game.player.mana = game.player.maxMana;
        console.log('Player fully healed');
    },

    _godMode: false,
    godMode() {
        this._godMode = !this._godMode;
        if (this._godMode) {
            this._originalHp = game.player.hp;
            game.player.hp = 99999;
            game.player.maxHp = 99999;
        } else {
            game.player.maxHp = 100;
            game.player.hp = this._originalHp || 100;
        }
        console.log(`God mode: ${this._godMode ? 'ON' : 'OFF'}`);
    },

    teleport(x, y) {
        if (x === undefined || y === undefined) { console.log('Usage: debug.teleport(x, y)'); return; }
        game.player.gridX = x;
        game.player.gridY = y;
        game.player.x = x;
        game.player.y = y;
        game.player.displayX = x;
        game.player.displayY = y;
        game.player.targetGridX = x;
        game.player.targetGridY = y;
        console.log(`Teleported to (${x}, ${y})`);
    },

    addGold(amount = 1000) {
        game.gold = (game.gold || 0) + amount;
        console.log(`Added ${amount} gold. Total: ${game.gold}`);
    },

    setStats(str = 10, agi = 10, int = 10, sta = 10) {
        game.player.stats = { STR: str, AGI: agi, INT: int, STA: sta };
        console.log(`Stats set to STR:${str} AGI:${agi} INT:${int} STA:${sta}`);
    },

    // ========================================================================
    // EQUIPMENT
    // ========================================================================
    give(id) {
        if (!id) { console.log('Usage: debug.give("item_id")'); return; }
        const data = typeof EQUIPMENT_DATA !== 'undefined' ? EQUIPMENT_DATA[id] : null;
        if (!data) { console.error(`Unknown item: ${id}`); return; }
        
        game.player.inventory.push({ name: id, count: 1, type: data.slot ? 'equipment' : 'item', ...data });
        console.log(`Added ${id} to inventory`);
    },

    equip(id) {
        if (!id) { console.log('Usage: debug.equip("item_id")'); return; }
        const data = typeof EQUIPMENT_DATA !== 'undefined' ? EQUIPMENT_DATA[id] : null;
        if (!data) { console.error(`Unknown item: ${id}`); return; }
        
        const slot = data.slot || 'MAIN';
        game.player.equipped[slot] = { name: id, ...data };
        console.log(`Equipped ${id} in ${slot} slot`);
    },

    listItems(filter = '') {
        if (typeof EQUIPMENT_DATA === 'undefined') { console.log('EQUIPMENT_DATA not loaded'); return; }
        const items = Object.keys(EQUIPMENT_DATA).filter(k => k.includes(filter));
        console.log(`Equipment matching "${filter}" (${items.length}):`);
        items.slice(0, 50).forEach(i => {
            const d = EQUIPMENT_DATA[i];
            console.log(`  ${i} - ${d.slot || '?'} - ${d.element || 'none'}`);
        });
        if (items.length > 50) console.log(`  ... and ${items.length - 50} more`);
    },

    clearInventory() {
        game.player.inventory = [];
        console.log('Inventory cleared');
    },

    // ========================================================================
    // ELEMENTS
    // ========================================================================
    testElement(attacker, defender) {
        if (!attacker || !defender) { console.log('Usage: debug.testElement("fire", "ice")'); return; }
        
        let mod = 1.0;
        if (typeof ELEMENT_MATRIX !== 'undefined' && ELEMENT_MATRIX[attacker]) {
            mod = 1.0 + (ELEMENT_MATRIX[attacker][defender] || 0);
        }
        console.log(`${attacker} vs ${defender}: ${(mod * 100).toFixed(0)}% damage`);
    },

    testWeaponArmor(weapon, armor) {
        if (!weapon || !armor) { console.log('Usage: debug.testWeaponArmor("blade", "armored")'); return; }
        
        let mod = 1.0;
        if (typeof WEAPON_ARMOR_MATRIX !== 'undefined' && WEAPON_ARMOR_MATRIX[weapon]) {
            mod = 1.0 + (WEAPON_ARMOR_MATRIX[weapon][armor] || 0);
        }
        console.log(`${weapon} vs ${armor}: ${(mod * 100).toFixed(0)}% damage`);
    },

    testDamage(enemyIdx = 0) {
        const enemy = game.enemies[enemyIdx];
        if (!enemy) { console.log('No enemy at that index'); return; }
        
        if (typeof DamageCalculator !== 'undefined') {
            const room = game.rooms?.find(r => {
                const px = game.player.gridX, py = game.player.gridY;
                return px >= r.x && px < r.x + r.width && py >= r.y && py < r.y + r.height;
            });
            const result = DamageCalculator.calculateDamage(game.player, enemy, room);
            console.log('Damage calculation:', result);
        } else {
            console.log('DamageCalculator not loaded');
        }
    },

    // ========================================================================
    // ROOMS
    // ========================================================================
    listRooms() {
        if (!game.rooms) { console.log('No rooms'); return; }
        console.log(`Rooms (${game.rooms.length}):`);
        game.rooms.forEach((r, i) => {
            console.log(`  [${i}] ${r.type} at (${r.x}, ${r.y}) - ${r.element || 'no element'} - ${r.theme || 'no theme'}`);
        });
    },

    setRoomElement(idx, element) {
        if (!game.rooms?.[idx]) { console.log('Invalid room index'); return; }
        game.rooms[idx].element = element;
        console.log(`Room ${idx} element set to ${element}`);
    },

    gotoRoom(idx) {
        if (!game.rooms?.[idx]) { console.log('Invalid room index'); return; }
        const r = game.rooms[idx];
        const x = (r.floorX || r.x + 1) + Math.floor((r.floorWidth || r.width - 2) / 2);
        const y = (r.floorY || r.y + 1) + Math.floor((r.floorHeight || r.height - 2) / 2);
        this.teleport(x, y);
    },

    // ========================================================================
    // STATUS EFFECTS
    // ========================================================================
    applyStatus(effectId, target = 'player') {
        if (!effectId) { console.log('Usage: debug.applyStatus("burning", "player" or enemyIndex)'); return; }
        const entity = target === 'player' ? game.player : game.enemies[+target];
        if (!entity) { console.log('Invalid target'); return; }
        
        if (typeof applyStatusEffect === 'function') {
            applyStatusEffect(entity, effectId);
            console.log(`Applied ${effectId} to ${entity.name || 'player'}`);
        } else {
            console.log('StatusEffectSystem not loaded');
        }
    },

    removeStatus(effectId, target = 'player') {
        const entity = target === 'player' ? game.player : game.enemies[+target];
        if (!entity) { console.log('Invalid target'); return; }
        
        if (typeof removeStatusEffect === 'function') {
            removeStatusEffect(entity, effectId);
            console.log(`Removed ${effectId} from ${entity.name || 'player'}`);
        }
    },

    listStatus(target = 'player') {
        const entity = target === 'player' ? game.player : game.enemies[+target];
        if (!entity) { console.log('Invalid target'); return; }
        
        if (typeof getStatusEffects === 'function') {
            const effects = getStatusEffects(entity);
            console.log(`Status effects on ${entity.name || 'player'}:`);
            effects.forEach(e => console.log(`  ${e.id} - ${e.stacks} stacks - ${Math.ceil(e.remainingDuration / 1000)}s left`));
        }
    },

    clearStatus(target = 'player') {
        const entity = target === 'player' ? game.player : game.enemies[+target];
        if (!entity) { console.log('Invalid target'); return; }
        
        if (typeof clearStatusEffects === 'function') {
            clearStatusEffects(entity);
            console.log(`Cleared all status effects from ${entity.name || 'player'}`);
        }
    },

    // ========================================================================
    // ATTUNEMENT
    // ========================================================================
    showAttunement() {
        if (typeof AttunementSystem === 'undefined') { console.log('AttunementSystem not loaded'); return; }
        const summary = AttunementSystem.getAttunementSummary(game.player);
        console.log('Player Attunement:', summary);
        const all = AttunementSystem.getAllAttunements(game.player);
        console.table(all);
    },

    setAttunement(element, value) {
        if (typeof AttunementSystem === 'undefined') { console.log('AttunementSystem not loaded'); return; }
        AttunementSystem.playerAttunement.values[element] = value;
        console.log(`Set ${element} attunement to ${value}`);
    },

    // ========================================================================
    // HAZARDS
    // ========================================================================
    spawnHazard(id, x, y) {
        if (typeof HazardSystem === 'undefined') { console.log('HazardSystem not loaded'); return; }
        x = x ?? game.player.gridX + 1;
        y = y ?? game.player.gridY;
        
        const def = HazardSystem.definitions[id];
        if (!def) { console.error(`Unknown hazard: ${id}`); return; }
        
        const hazard = { ...def, x, y, cooldownLeft: 0, tickTimer: 0 };
        HazardSystem.hazards.push(hazard);
        console.log(`Spawned ${id} at (${x}, ${y})`);
    },

    listHazards() {
        if (typeof HazardSystem === 'undefined') { console.log('HazardSystem not loaded'); return; }
        console.log('Hazard types:');
        Object.keys(HazardSystem.definitions).forEach(h => {
            const d = HazardSystem.definitions[h];
            console.log(`  ${h} - ${d.element} - ${d.type} - ${d.damage || 0} dmg`);
        });
    },

    clearHazards() {
        if (typeof HazardSystem === 'undefined') { console.log('HazardSystem not loaded'); return; }
        HazardSystem.cleanup();
        console.log('All hazards cleared');
    },

    // ========================================================================
    // SYSTEMS
    // ========================================================================
    systems() {
        if (typeof SystemManager === 'undefined') { console.log('SystemManager not loaded'); return; }
        SystemManager.diagnose();
    },

    _showFps: false,
    fps() {
        this._showFps = !this._showFps;
        console.log(`FPS display: ${this._showFps ? 'ON' : 'OFF'}`);
    },

    logging(enabled = true) {
        if (typeof DamageCalculator !== 'undefined') DamageCalculator.config.debugLogging = enabled;
        if (typeof StatusEffectSystem !== 'undefined') StatusEffectSystem.config.debugLogging = enabled;
        if (typeof HazardSystem !== 'undefined') HazardSystem.config.debugLogging = enabled;
        if (typeof MonsterSocialSystem !== 'undefined') MonsterSocialSystem.config.debugLogging = enabled;
        console.log(`Debug logging: ${enabled ? 'ON' : 'OFF'}`);
    }
};

// EXPORTS
window.debug = Debug;
window.Debug = Debug;

console.log('[Debug] Commands loaded. Type debug.help() for usage.');