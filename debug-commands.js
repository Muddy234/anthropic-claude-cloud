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
║   debug.giveAll()           - Add ALL equipment & items      ║
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
║ MAP GENERATION                                               ║
║   debug.regenMap()          - Regenerate entire dungeon      ║
║   debug.mapStats()          - Show dungeon statistics        ║
║   debug.testConnectivity()  - Validate floor connectivity    ║
║   debug.testMaps(n)         - Test N maps with stats (10/50) ║
║   debug.inspectTile(x, y)   - Show tile data at position     ║
║   debug.toggleMapDebug()    - Toggle map generation logging  ║
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

    giveAll() {
        let count = 0;

        // Add all equipment (weapons and armor)
        if (typeof EQUIPMENT_DATA !== 'undefined') {
            Object.keys(EQUIPMENT_DATA).forEach(id => {
                const data = EQUIPMENT_DATA[id];
                game.player.inventory.push({
                    name: id,
                    count: 1,
                    type: 'weapon',
                    ...data
                });
                count++;
            });
            console.log(`Added ${count} pieces of equipment`);
        } else {
            console.warn('EQUIPMENT_DATA not loaded');
        }

        // Add all consumables, materials, and quest items
        if (typeof ITEMS_DATA !== 'undefined') {
            const itemCount = count;
            Object.keys(ITEMS_DATA).forEach(id => {
                const data = ITEMS_DATA[id];
                game.player.inventory.push({
                    name: id,
                    count: data.stackable ? (data.maxStack || 10) : 1,
                    type: data.type || 'item',
                    ...data
                });
                count++;
            });
            console.log(`Added ${count - itemCount} consumables/materials/quest items`);
        } else {
            console.warn('ITEMS_DATA not loaded');
        }

        console.log(`✅ Total items added to inventory: ${count}`);
        console.log('Use inventory tabs (1-4) to browse: 1=Weapons, 2=Armor, 3=Consumables, 4=Materials');
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
    // MAP GENERATION
    // ========================================================================
    regenMap() {
        console.log('🗺️  Regenerating dungeon...');

        // Clear existing enemies and hazards
        game.enemies = [];
        if (typeof HazardSystem !== 'undefined') HazardSystem.cleanup();

        // Regenerate dungeon
        if (typeof generateBlobDungeon === 'function') {
            generateBlobDungeon();

            // Respawn player at entrance
            const entrance = game.rooms.find(r => r.type === 'entrance');
            if (entrance && entrance.blob) {
                game.player.gridX = entrance.blob.connectionPoint.x;
                game.player.gridY = entrance.blob.connectionPoint.y;
                game.player.x = entrance.blob.connectionPoint.x;
                game.player.y = entrance.blob.connectionPoint.y;
                game.player.displayX = entrance.blob.connectionPoint.x;
                game.player.displayY = entrance.blob.connectionPoint.y;
            }

            console.log('✅ Dungeon regenerated');
            console.log(`   Blobs: ${game.rooms.length}`);
            console.log(`   Enemies: ${game.enemies.length}`);
        } else {
            console.error('❌ generateBlobDungeon not available');
        }
    },

    mapStats() {
        if (typeof DUNGEON_STATE === 'undefined') {
            console.error('❌ DUNGEON_STATE not available');
            return;
        }

        console.log('\n📊 DUNGEON STATISTICS');
        console.log('═══════════════════════════════════');

        if (DUNGEON_STATE.blobs && DUNGEON_STATE.blobs.length > 0) {
            const blobSizes = DUNGEON_STATE.blobs.map(b => b.tiles.size);
            const totalFloors = blobSizes.reduce((a, b) => a + b, 0);

            console.log(`\n🫧 BLOBS:`);
            console.log(`   Total: ${DUNGEON_STATE.blobs.length}`);
            console.log(`   Avg size: ${(totalFloors / DUNGEON_STATE.blobs.length).toFixed(0)} tiles`);
            console.log(`   Min size: ${Math.min(...blobSizes)} tiles`);
            console.log(`   Max size: ${Math.max(...blobSizes)} tiles`);

            const entranceCount = DUNGEON_STATE.blobs.filter(b => b.blobType === 'entrance').length;
            const combatCount = DUNGEON_STATE.blobs.filter(b => b.blobType === 'combat').length;
            const treasureCount = DUNGEON_STATE.blobs.filter(b => b.blobType === 'treasure').length;

            console.log(`\n🎯 BLOB TYPES:`);
            console.log(`   Entrance: ${entranceCount}`);
            console.log(`   Combat: ${combatCount}`);
            console.log(`   Treasure: ${treasureCount}`);
        }

        if (DUNGEON_STATE.corridors && DUNGEON_STATE.corridors.length > 0) {
            const corridorLengths = DUNGEON_STATE.corridors.map(c => c.tiles.size);

            console.log(`\n🚪 CORRIDORS:`);
            console.log(`   Total: ${DUNGEON_STATE.corridors.length}`);
            console.log(`   Avg length: ${(corridorLengths.reduce((a, b) => a + b, 0) / corridorLengths.length).toFixed(0)} tiles`);
            console.log(`   Min length: ${Math.min(...corridorLengths)} tiles`);
            console.log(`   Max length: ${Math.max(...corridorLengths)} tiles`);
        }

        console.log(`\n👹 ENEMIES: ${game.enemies.length}`);
        console.log('═══════════════════════════════════\n');
    },

    testConnectivity() {
        if (typeof DUNGEON_STATE === 'undefined' || !DUNGEON_STATE.entranceBlob) {
            console.error('❌ DUNGEON_STATE not available');
            return;
        }

        console.log('\n🔍 TESTING CONNECTIVITY...');
        console.log('═══════════════════════════════════');

        const entrance = DUNGEON_STATE.entranceBlob.connectionPoint;
        const reachable = new Set();
        const stack = [{ x: entrance.x, y: entrance.y }];

        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;

            if (reachable.has(key)) continue;
            if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;
            if (!game.map[y] || !game.map[y][x]) continue;
            if (game.map[y][x].type === 'wall' || game.map[y][x].type === 'void') continue;

            reachable.add(key);

            stack.push({ x: x + 1, y: y });
            stack.push({ x: x - 1, y: y });
            stack.push({ x: x, y: y + 1 });
            stack.push({ x: x, y: y - 1 });
        }

        // Count total floor tiles
        let totalFloors = 0;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (game.map[y] && game.map[y][x] &&
                    (game.map[y][x].type === 'floor' || game.map[y][x].corridor)) {
                    totalFloors++;
                }
            }
        }

        const reachableCount = reachable.size;
        const unreachableCount = totalFloors - reachableCount;
        const connectivityPercent = ((reachableCount / totalFloors) * 100).toFixed(2);

        console.log(`   Total floor tiles: ${totalFloors}`);
        console.log(`   Reachable from entrance: ${reachableCount} (${connectivityPercent}%)`);
        console.log(`   Unreachable pockets: ${unreachableCount}`);

        if (unreachableCount > 0) {
            console.warn(`   ⚠️  Warning: ${unreachableCount} unreachable tiles detected!`);
        } else {
            console.log(`   ✅ All floor tiles are reachable!`);
        }

        console.log('═══════════════════════════════════\n');
    },

    testMaps(count = 10) {
        console.log(`\n🧪 TESTING ${count} DUNGEON GENERATIONS`);
        console.log('═══════════════════════════════════');

        // Store original debug setting
        const originalDebug = typeof DUNGEON_CONFIG !== 'undefined' ? DUNGEON_CONFIG.debugLogging : false;
        if (typeof DUNGEON_CONFIG !== 'undefined') {
            DUNGEON_CONFIG.debugLogging = false; // Disable for batch testing
        }

        const stats = {
            blobCounts: [],
            corridorCounts: [],
            blobSizes: [],
            corridorLengths: [],
            entranceCounts: [],
            combatCounts: [],
            treasureCounts: [],
            connectivity: [],
            failures: 0
        };

        for (let i = 0; i < count; i++) {
            try {
                // Generate dungeon
                if (typeof generateBlobDungeonMap === 'function') {
                    generateBlobDungeonMap();
                } else {
                    console.error('❌ generateBlobDungeonMap not available');
                    break;
                }

                // Collect blob stats
                if (DUNGEON_STATE.blobs && DUNGEON_STATE.blobs.length > 0) {
                    stats.blobCounts.push(DUNGEON_STATE.blobs.length);

                    const sizes = DUNGEON_STATE.blobs.map(b => b.tiles.size);
                    stats.blobSizes.push(...sizes);

                    stats.entranceCounts.push(DUNGEON_STATE.blobs.filter(b => b.blobType === 'entrance').length);
                    stats.combatCounts.push(DUNGEON_STATE.blobs.filter(b => b.blobType === 'combat').length);
                    stats.treasureCounts.push(DUNGEON_STATE.blobs.filter(b => b.blobType === 'treasure').length);
                }

                // Collect corridor stats
                if (DUNGEON_STATE.corridors && DUNGEON_STATE.corridors.length > 0) {
                    stats.corridorCounts.push(DUNGEON_STATE.corridors.length);

                    const lengths = DUNGEON_STATE.corridors.map(c => c.tiles.size);
                    stats.corridorLengths.push(...lengths);
                }

                // Test connectivity
                if (DUNGEON_STATE.grid && DUNGEON_STATE.entranceBlob) {
                    const entrance = DUNGEON_STATE.entranceBlob.connectionPoint;
                    const reachable = new Set();
                    const stack = [{ x: entrance.x, y: entrance.y }];

                    while (stack.length > 0) {
                        const { x, y } = stack.pop();
                        const key = `${x},${y}`;

                        if (reachable.has(key)) continue;
                        if (x < 0 || x >= DUNGEON_CONFIG.mapWidth || y < 0 || y >= DUNGEON_CONFIG.mapHeight) continue;
                        if (DUNGEON_STATE.grid[y][x] === 1) continue; // Wall

                        reachable.add(key);

                        stack.push({ x: x + 1, y: y });
                        stack.push({ x: x - 1, y: y });
                        stack.push({ x: x, y: y + 1 });
                        stack.push({ x: x, y: y - 1 });
                    }

                    // Count total floor tiles
                    let totalFloors = 0;
                    for (let y = 0; y < DUNGEON_CONFIG.mapHeight; y++) {
                        for (let x = 0; x < DUNGEON_CONFIG.mapWidth; x++) {
                            if (DUNGEON_STATE.grid[y][x] === 0) totalFloors++;
                        }
                    }

                    const connectivityPercent = totalFloors > 0 ? (reachable.size / totalFloors) * 100 : 0;
                    stats.connectivity.push(connectivityPercent);
                }

            } catch (error) {
                stats.failures++;
                console.error(`Test ${i + 1} failed:`, error.message);
            }
        }

        // Restore debug setting
        if (typeof DUNGEON_CONFIG !== 'undefined') {
            DUNGEON_CONFIG.debugLogging = originalDebug;
        }

        // Calculate and display statistics
        const avg = arr => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;
        const min = arr => arr.length > 0 ? Math.min(...arr) : 0;
        const max = arr => arr.length > 0 ? Math.max(...arr) : 0;

        console.log(`\n📊 RESULTS (${count - stats.failures} successful):`);
        console.log('───────────────────────────────────');

        console.log(`\n🫧 BLOBS:`);
        console.log(`   Avg per map: ${avg(stats.blobCounts)}`);
        console.log(`   Avg size: ${avg(stats.blobSizes)} tiles`);
        console.log(`   Size range: ${min(stats.blobSizes)} - ${max(stats.blobSizes)}`);

        console.log(`\n🎯 BLOB TYPES (avg per map):`);
        console.log(`   Entrance: ${avg(stats.entranceCounts)}`);
        console.log(`   Combat: ${avg(stats.combatCounts)}`);
        console.log(`   Treasure: ${avg(stats.treasureCounts)}`);

        console.log(`\n🚪 CORRIDORS:`);
        console.log(`   Avg per map: ${avg(stats.corridorCounts)}`);
        console.log(`   Avg length: ${avg(stats.corridorLengths)} tiles`);
        console.log(`   Length range: ${min(stats.corridorLengths)} - ${max(stats.corridorLengths)}`);

        console.log(`\n🔍 CONNECTIVITY:`);
        console.log(`   Avg: ${avg(stats.connectivity)}%`);
        console.log(`   Min: ${min(stats.connectivity).toFixed(2)}%`);
        console.log(`   Max: ${max(stats.connectivity).toFixed(2)}%`);

        const allConnected = stats.connectivity.every(c => c >= 99.9);
        if (allConnected) {
            console.log(`   ✅ All ${count} maps fully connected!`);
        } else {
            const disconnected = stats.connectivity.filter(c => c < 99.9).length;
            console.warn(`   ⚠️  ${disconnected}/${count} maps had connectivity issues!`);
        }

        if (stats.failures > 0) {
            console.error(`\n❌ ${stats.failures} generation failures`);
        }

        console.log('\n═══════════════════════════════════\n');
    },

    inspectTile(x, y) {
        // Convert to integer grid coordinates
        x = x !== undefined ? Math.floor(x) : Math.floor(game.player.gridX ?? game.player.x);
        y = y !== undefined ? Math.floor(y) : Math.floor(game.player.gridY ?? game.player.y);

        console.log(`\n🔍 INSPECTING TILE (${x}, ${y})`);
        console.log('═══════════════════════════════════');

        // Check game.map
        if (game.map && game.map[y] && game.map[y][x]) {
            const tile = game.map[y][x];
            console.log('\n📍 game.map data:');
            console.log(`   type: ${tile.type}`);
            console.log(`   corridor: ${tile.corridor || false}`);
            console.log(`   blocked: ${tile.blocked || false}`);
            console.log(`   room: ${tile.room ? tile.room.id : 'none'}`);
            console.log(`   element: ${tile.element || 'none'}`);
        } else {
            console.log('\n❌ Tile not in game.map');
        }

        // Check DUNGEON_STATE.grid
        if (typeof DUNGEON_STATE !== 'undefined' && DUNGEON_STATE.grid) {
            const gridValue = DUNGEON_STATE.grid[y] ? DUNGEON_STATE.grid[y][x] : undefined;
            console.log('\n🗺️  DUNGEON_STATE.grid:');
            console.log(`   value: ${gridValue} (${gridValue === 0 ? 'floor' : gridValue === 1 ? 'wall' : 'unknown'})`);
        }

        // Check if in a blob
        if (typeof DUNGEON_STATE !== 'undefined' && DUNGEON_STATE.blobs) {
            const inBlob = DUNGEON_STATE.blobs.find(b => b.tiles.has(`${x},${y}`));
            if (inBlob) {
                console.log('\n🫧 In blob:');
                console.log(`   type: ${inBlob.blobType}`);
                console.log(`   element: ${inBlob.element}`);
                console.log(`   theme: ${inBlob.theme}`);
                console.log(`   size: ${inBlob.tiles.size} tiles`);
            }
        }

        // Check if in a corridor
        if (typeof DUNGEON_STATE !== 'undefined' && DUNGEON_STATE.corridors) {
            const inCorridor = DUNGEON_STATE.corridors.find(c => c.tiles.has(`${x},${y}`));
            if (inCorridor) {
                console.log('\n🚪 In corridor:');
                console.log(`   length: ${inCorridor.tiles.size} tiles`);
                console.log(`   connects: ${inCorridor.startBlob.blobType} ↔ ${inCorridor.endBlob.blobType}`);
            }
        }

        // Check if it's a connection point
        if (typeof DUNGEON_STATE !== 'undefined' && DUNGEON_STATE.blobs) {
            const isConnectionPoint = DUNGEON_STATE.blobs.find(b =>
                b.connectionPoint && b.connectionPoint.x === x && b.connectionPoint.y === y
            );
            if (isConnectionPoint) {
                console.log('\n⭐ This is a blob connection point!');
                console.log(`   blob type: ${isConnectionPoint.blobType}`);
            }
        }

        console.log('\n═══════════════════════════════════\n');
    },

    toggleMapDebug() {
        if (typeof DUNGEON_CONFIG !== 'undefined') {
            DUNGEON_CONFIG.debugLogging = !DUNGEON_CONFIG.debugLogging;
            console.log(`Map generation debug logging: ${DUNGEON_CONFIG.debugLogging ? 'ON' : 'OFF'}`);
        } else {
            console.error('❌ DUNGEON_CONFIG not available');
        }
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