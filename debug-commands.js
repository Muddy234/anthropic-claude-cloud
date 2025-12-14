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
║ TEST ARENA (Combat Testing)                                  ║
║   debug.arena()             - Teleport to test arena         ║
║   debug.return()            - Return from arena              ║
║   debug.spawnMonster(name)  - Spawn monster (current floor)  ║
║   debug.spawnMonster(n, 5)  - Spawn monster at level 5       ║
║   debug.spawnAll()          - Spawn all monster types        ║
║   debug.clear()             - Remove all enemies             ║
║   debug.setFloor(n)         - Set floor (affects scaling)    ║
║                                                              ║
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
║                                                              ║
║ SHIFT MECHANICS                                              ║
║   debug.triggerShift(id)    - Trigger a shift immediately    ║
║   debug.setCountdown(s)     - Set countdown seconds          ║
║   debug.endShift()          - End current shift              ║
║   debug.shiftStatus()       - Show shift state               ║
║   debug.shiftSystems()      - Show ALL shift systems         ║
║                                                              ║
║ DYNAMIC TILES                                                ║
║   debug.convertTile(x,y,t)  - Convert tile to type           ║
║   debug.spreadTiles(t,r)    - Start tile spread              ║
║                                                              ║
║ ENVIRONMENT                                                  ║
║   debug.createMeter(id)     - Create env meter               ║
║   debug.setMeterValue(id,v) - Set meter value                ║
║   debug.setDarkness(level)  - Set global darkness (0-1)      ║
║   debug.addLight(type,x,y)  - Add light source               ║
║                                                              ║
║ SPAWN/QUEST/NPC/BOSS                                         ║
║   debug.createSpawnPoint()  - Create spawn point             ║
║   debug.startQuest(type,n)  - Start collection quest         ║
║   debug.spawnNPC(type,x,y)  - Spawn NPC                      ║
║   debug.spawnBoss(type,x,y) - Spawn boss                     ║
║                                                              ║
║ FLOOR NAVIGATION                                             ║
║   debug.showExit()          - Show floor descent location    ║
║   debug.goToExit()          - Teleport to floor descent      ║
║   debug.unlockAllFloors()   - Unlock shortcuts to all floors ║
║   debug.goFloor(n)          - Jump directly to floor n (1-10)║
║                                                              ║
║ JOURNAL/CODEX                                                ║
║   debug.giveAllJournal()    - Unlock all lore, monsters, NPCs║
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
            combat: { isInCombat: false, currentTarget: null, attackCooldown: 0, attackSpeed: 2.0, autoRetaliate: true, attackRange: 1, comboCount: 1 }
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

    godMode() {
        // Toggle the global godMode flag that combat-system.js checks
        window.godMode = !window.godMode;
        if (window.godMode) {
            this._originalHp = game.player.hp;
            this._originalMaxHp = game.player.maxHp;
            game.player.hp = 99999;
            game.player.maxHp = 99999;
        } else {
            game.player.maxHp = this._originalMaxHp || 100;
            game.player.hp = Math.min(this._originalHp || 100, game.player.maxHp);
        }
        console.log(`God mode: ${window.godMode ? 'ON ⚡' : 'OFF'}`);
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

        // Set ammo counters for ranged weapons
        if (game.player.ammo) {
            game.player.ammo.arrows = 99;
            game.player.ammo.bolts = 99;
            console.log('Set ammo: 99 arrows, 99 bolts');
        }

        console.log(`✅ Total items added to inventory: ${count}`);
        console.log('Use inventory tabs (1-4) to browse: 1=Weapons, 2=Armor, 3=Consumables, 4=Materials');

        // Also give all journal/codex items
        this.giveAllJournal();
    },

    giveAllJournal() {
        console.log('\n📖 Adding all journal/codex items...');

        // Give all lore fragments
        if (typeof LORE_FRAGMENTS !== 'undefined' && typeof persistentState !== 'undefined') {
            persistentState.loreCollected = persistentState.loreCollected || [];
            const loreCount = Object.keys(LORE_FRAGMENTS).length;
            Object.keys(LORE_FRAGMENTS).forEach(loreId => {
                if (!persistentState.loreCollected.includes(loreId)) {
                    persistentState.loreCollected.push(loreId);
                }
            });
            console.log(`   Lore fragments: ${loreCount} collected`);
        } else {
            console.warn('   LORE_FRAGMENTS or persistentState not available');
        }

        // Discover all monsters
        if (typeof MONSTER_DATA !== 'undefined' && typeof persistentState !== 'undefined') {
            persistentState.monstersDiscovered = persistentState.monstersDiscovered || [];
            persistentState.monsterKillCounts = persistentState.monsterKillCounts || {};
            const monsterCount = Object.keys(MONSTER_DATA).length;
            Object.keys(MONSTER_DATA).forEach(monsterName => {
                if (!persistentState.monstersDiscovered.includes(monsterName)) {
                    persistentState.monstersDiscovered.push(monsterName);
                }
                // Also give some kill count for each
                persistentState.monsterKillCounts[monsterName] =
                    (persistentState.monsterKillCounts[monsterName] || 0) + 10;
            });
            console.log(`   Monsters discovered: ${monsterCount}`);
        } else {
            console.warn('   MONSTER_DATA or persistentState not available');
        }

        // Encounter all NPCs
        if (typeof NPC_DATA !== 'undefined' && typeof persistentState !== 'undefined') {
            persistentState.npcsEncountered = persistentState.npcsEncountered || [];
            let npcCount = 0;
            Object.keys(NPC_DATA).forEach(npcId => {
                const npc = NPC_DATA[npcId];
                if (!npc.aliasOf) {  // Skip aliases
                    if (!persistentState.npcsEncountered.includes(npcId)) {
                        persistentState.npcsEncountered.push(npcId);
                    }
                    npcCount++;
                }
            });
            console.log(`   NPCs encountered: ${npcCount}`);
        } else {
            console.warn('   NPC_DATA or persistentState not available');
        }

        // Give quest items
        if (typeof persistentState !== 'undefined') {
            persistentState.questItems = persistentState.questItems || {};
            persistentState.questItems.dagger = true;
            persistentState.questItems.wardsCollected = 5;
            console.log('   Quest items: Betrayal Dagger + 5 Wards');
        }

        console.log('✅ All journal/codex items added');
        console.log('   Press J to open the Journal and view everything!');
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
    },

    // ========================================================================
    // SHIFT SYSTEMS
    // ========================================================================
    triggerShift(shiftId = 'magma_collapse') {
        if (typeof triggerShift === 'function') {
            game.shiftCountdown = 0;
            triggerShift(shiftId);
            console.log(`Triggered shift: ${shiftId}`);
        } else {
            console.error('triggerShift function not found');
        }
    },

    setCountdown(seconds) {
        game.shiftCountdown = seconds;
        console.log(`Shift countdown set to ${seconds}s`);
    },

    endShift() {
        game.shiftActive = false;
        game.activeShift = null;
        game.shiftState = null;
        console.log('Shift ended');
    },

    shiftStatus() {
        console.log('=== SHIFT STATUS ===');
        console.log(`Active: ${game.shiftActive}`);
        console.log(`Countdown: ${game.shiftCountdown?.toFixed(1)}s`);
        console.log(`Shift: ${game.activeShift?.name || 'none'}`);
        if (typeof ShiftBonusSystem !== 'undefined') {
            console.log('Bonuses:', ShiftBonusSystem.getStatus());
        }
    },

    // ========================================================================
    // DYNAMIC TILES
    // ========================================================================
    convertTile(x, y, type = 'lava') {
        if (typeof DynamicTileSystem === 'undefined') {
            console.error('DynamicTileSystem not loaded');
            return;
        }
        x = x ?? Math.floor(game.player.gridX);
        y = y ?? Math.floor(game.player.gridY);
        DynamicTileSystem.convertTile(x, y, type);
        console.log(`Converted (${x}, ${y}) to ${type}`);
    },

    spreadTiles(type = 'corrupted', radius = 5) {
        if (typeof DynamicTileSystem === 'undefined') {
            console.error('DynamicTileSystem not loaded');
            return;
        }
        const x = Math.floor(game.player.gridX);
        const y = Math.floor(game.player.gridY);
        DynamicTileSystem.startSpreadFrom(`debug_${Date.now()}`, x, y, type, {
            maxRadius: radius,
            spreadRate: 5
        });
        console.log(`Started ${type} spread from (${x}, ${y})`);
    },

    dynamicTileStatus() {
        if (typeof DynamicTileSystem === 'undefined') {
            console.error('DynamicTileSystem not loaded');
            return;
        }
        console.log('Dynamic Tiles:', DynamicTileSystem.getStatus());
    },

    // ========================================================================
    // ENVIRONMENTAL METERS
    // ========================================================================
    createMeter(id = 'warmth') {
        if (typeof EnvironmentalMeterSystem === 'undefined') {
            console.error('EnvironmentalMeterSystem not loaded');
            return;
        }
        EnvironmentalMeterSystem.createMeter(id);
        console.log(`Created meter: ${id}`);
    },

    setMeterValue(id, value) {
        if (typeof EnvironmentalMeterSystem === 'undefined') {
            console.error('EnvironmentalMeterSystem not loaded');
            return;
        }
        EnvironmentalMeterSystem.setValue(id, value);
        console.log(`Set ${id} to ${value}`);
    },

    setMeterDrain(id, rate) {
        if (typeof EnvironmentalMeterSystem === 'undefined') {
            console.error('EnvironmentalMeterSystem not loaded');
            return;
        }
        EnvironmentalMeterSystem.setDrainRate(id, rate);
        console.log(`Set ${id} drain rate to ${rate}/s`);
    },

    meterStatus() {
        if (typeof EnvironmentalMeterSystem === 'undefined') {
            console.error('EnvironmentalMeterSystem not loaded');
            return;
        }
        console.log('Meters:', EnvironmentalMeterSystem.getStatus());
    },

    // ========================================================================
    // LIGHT SOURCES
    // ========================================================================
    setDarkness(level = 0.8) {
        if (typeof LightSourceSystem === 'undefined') {
            console.error('LightSourceSystem not loaded');
            return;
        }
        LightSourceSystem.setGlobalDarkness(level, true);
        console.log(`Darkness set to ${level}`);
    },

    addLight(type = 'brazier', x, y) {
        if (typeof LightSourceSystem === 'undefined') {
            console.error('LightSourceSystem not loaded');
            return;
        }
        x = x ?? Math.floor(game.player.gridX);
        y = y ?? Math.floor(game.player.gridY);
        const id = LightSourceSystem.addSource({ type, gridX: x, gridY: y });
        console.log(`Added ${type} light at (${x}, ${y}): ${id}`);
    },

    lightStatus() {
        if (typeof LightSourceSystem === 'undefined') {
            console.error('LightSourceSystem not loaded');
            return;
        }
        console.log('Lights:', LightSourceSystem.getStatus());
    },

    // ========================================================================
    // SPAWN POINTS
    // ========================================================================
    createSpawnPoint(type = 'rift', x, y) {
        if (typeof SpawnPointSystem === 'undefined') {
            console.error('SpawnPointSystem not loaded');
            return;
        }
        x = x ?? Math.floor(game.player.gridX) + 5;
        y = y ?? Math.floor(game.player.gridY);
        const id = SpawnPointSystem.create({
            type,
            gridX: x,
            gridY: y,
            enemyPool: ['skeleton']  // Use existing enemy type
        });
        console.log(`Created ${type} spawn point at (${x}, ${y}): ${id}`);
    },

    spawnPointStatus() {
        if (typeof SpawnPointSystem === 'undefined') {
            console.error('SpawnPointSystem not loaded');
            return;
        }
        console.log('Spawn Points:', SpawnPointSystem.getStatus());
    },

    // ========================================================================
    // QUEST ITEMS
    // ========================================================================
    startQuest(type = 'seal_fragment', count = 3) {
        if (typeof QuestItemSystem === 'undefined') {
            console.error('QuestItemSystem not loaded');
            return;
        }
        QuestItemSystem.startQuest({
            itemType: type,
            totalRequired: count,
            deliveryRequired: false
        });
        QuestItemSystem.spawnItemsInRooms(type, count);
        console.log(`Started quest: collect ${count} ${type}s`);
    },

    collectAllQuestItems() {
        if (typeof QuestItemSystem === 'undefined') {
            console.error('QuestItemSystem not loaded');
            return;
        }
        const items = QuestItemSystem.getUncollectedItems();
        items.forEach(item => QuestItemSystem.collectItem(item.id));
        console.log(`Collected ${items.length} quest items`);
    },

    questStatus() {
        if (typeof QuestItemSystem === 'undefined') {
            console.error('QuestItemSystem not loaded');
            return;
        }
        console.log('Quest:', QuestItemSystem.getStatus());
    },

    // ========================================================================
    // NPCs
    // ========================================================================
    spawnNPC(type = 'spirit', x, y) {
        if (typeof NPCSystem === 'undefined') {
            console.error('NPCSystem not loaded');
            return;
        }
        x = x ?? Math.floor(game.player.gridX) + 2;
        y = y ?? Math.floor(game.player.gridY);
        const id = NPCSystem.spawn({
            type,
            gridX: x,
            gridY: y,
            dialogue: ["Hello, adventurer.", "Follow me to safety."]
        });
        console.log(`Spawned ${type} NPC at (${x}, ${y}): ${id}`);
    },

    interactNPC() {
        if (typeof NPCSystem === 'undefined') {
            console.error('NPCSystem not loaded');
            return;
        }
        const npc = NPCSystem.getNearPlayer();
        if (npc) {
            NPCSystem.interact(npc.id);
        } else {
            console.log('No NPC nearby');
        }
    },

    npcStatus() {
        if (typeof NPCSystem === 'undefined') {
            console.error('NPCSystem not loaded');
            return;
        }
        console.log('NPCs:', NPCSystem.getStatus());
    },

    // ========================================================================
    // BOSSES
    // ========================================================================
    spawnBoss(template = 'warden', x, y) {
        if (typeof BossSystem === 'undefined') {
            console.error('BossSystem not loaded');
            return;
        }
        x = x ?? Math.floor(game.player.gridX) + 5;
        y = y ?? Math.floor(game.player.gridY);
        const id = BossSystem.spawn(template, x, y);
        console.log(`Spawned ${template} boss at (${x}, ${y}): ${id}`);
    },

    damageBoss(amount = 100) {
        if (typeof BossSystem === 'undefined') {
            console.error('BossSystem not loaded');
            return;
        }
        const bosses = BossSystem.getAll();
        if (bosses.length > 0) {
            BossSystem.damage(bosses[0].id, amount);
            console.log(`Damaged ${bosses[0].name} for ${amount}`);
        } else {
            console.log('No active bosses');
        }
    },

    bossStatus() {
        if (typeof BossSystem === 'undefined') {
            console.error('BossSystem not loaded');
            return;
        }
        console.log('Bosses:', BossSystem.getStatus());
    },

    // ========================================================================
    // ALL SHIFT SYSTEMS STATUS
    // ========================================================================
    shiftSystems() {
        console.log('\n=== SHIFT SYSTEMS STATUS ===\n');

        if (typeof ShiftBonusSystem !== 'undefined') {
            console.log('BONUSES:', ShiftBonusSystem.getStatus());
        }
        if (typeof DynamicTileSystem !== 'undefined') {
            console.log('TILES:', DynamicTileSystem.getStatus());
        }
        if (typeof EnvironmentalMeterSystem !== 'undefined') {
            console.log('METERS:', EnvironmentalMeterSystem.getStatus());
        }
        if (typeof LightSourceSystem !== 'undefined') {
            console.log('LIGHTS:', LightSourceSystem.getStatus());
        }
        if (typeof SpawnPointSystem !== 'undefined') {
            console.log('SPAWNS:', SpawnPointSystem.getStatus());
        }
        if (typeof QuestItemSystem !== 'undefined') {
            console.log('QUEST:', QuestItemSystem.getStatus());
        }
        if (typeof NPCSystem !== 'undefined') {
            console.log('NPCS:', NPCSystem.getStatus());
        }
        if (typeof BossSystem !== 'undefined') {
            console.log('BOSSES:', BossSystem.getStatus());
        }

        console.log('\n============================\n');
    },

    // ========================================================================
    // TEST ARENA
    // ========================================================================
    _arenaRoom: null,
    _arenaCreated: false,
    _originalPosition: null,
    _savedTiles: null,

    arena() {
        // Create arena if not exists
        if (!this._arenaCreated) {
            const arenaWidth = 25;
            const arenaHeight = 25;
            // Place arena in top-left corner of map (within valid grid bounds)
            const arenaX = 5;
            const arenaY = 5;

            this._arenaRoom = {
                id: 'test_arena',
                type: 'arena',
                x: arenaX,
                y: arenaY,
                width: arenaWidth,
                height: arenaHeight,
                floorX: arenaX + 1,
                floorY: arenaY + 1,
                floorWidth: arenaWidth - 2,
                floorHeight: arenaHeight - 2,
                element: 'physical',
                blob: { difficulty: 5 },
                isTestArena: true
            };

            if (!game.map) game.map = [];

            // Save original tiles so we can restore them later
            this._savedTiles = [];
            for (let y = arenaY; y < arenaY + arenaHeight; y++) {
                this._savedTiles[y] = [];
                for (let x = arenaX; x < arenaX + arenaWidth; x++) {
                    if (game.map[y] && game.map[y][x]) {
                        this._savedTiles[y][x] = { ...game.map[y][x] };
                    }
                }
            }

            // Create arena tiles with visibility flags
            for (let y = arenaY; y < arenaY + arenaHeight; y++) {
                if (!game.map[y]) game.map[y] = [];
                for (let x = arenaX; x < arenaX + arenaWidth; x++) {
                    if (x === arenaX || x === arenaX + arenaWidth - 1 ||
                        y === arenaY || y === arenaY + arenaHeight - 1) {
                        game.map[y][x] = {
                            type: 'wall',
                            char: '#',
                            visible: true,
                            explored: true,
                            alwaysVisible: true,
                            blocked: true
                        };
                    } else {
                        game.map[y][x] = {
                            type: 'floor',
                            char: '.',
                            room: this._arenaRoom,
                            visible: true,
                            explored: true,
                            alwaysVisible: true
                        };
                    }
                }
            }

            // Also update visibility array if it exists
            if (game.visibility) {
                for (let y = arenaY; y < arenaY + arenaHeight; y++) {
                    if (!game.visibility[y]) game.visibility[y] = [];
                    for (let x = arenaX; x < arenaX + arenaWidth; x++) {
                        game.visibility[y][x] = 1; // Fully visible
                    }
                }
            }

            // Update explored array if it exists
            if (game.explored) {
                for (let y = arenaY; y < arenaY + arenaHeight; y++) {
                    if (!game.explored[y]) game.explored[y] = [];
                    for (let x = arenaX; x < arenaX + arenaWidth; x++) {
                        game.explored[y][x] = true;
                    }
                }
            }

            if (game.rooms && !game.rooms.includes(this._arenaRoom)) {
                game.rooms.push(this._arenaRoom);
            }

            this._arenaCreated = true;
            console.log('[Arena] Created at', arenaX, arenaY);
        }

        // Save original position
        this._originalPosition = {
            x: game.player.gridX,
            y: game.player.gridY
        };

        // Teleport to center
        const centerX = this._arenaRoom.x + Math.floor(this._arenaRoom.width / 2);
        const centerY = this._arenaRoom.y + Math.floor(this._arenaRoom.height / 2);

        game.player.gridX = centerX;
        game.player.gridY = centerY;
        game.player.x = centerX;
        game.player.y = centerY;
        game.player.displayX = centerX;
        game.player.displayY = centerY;

        this.clear();

        // Force visibility update for arena area
        for (let y = this._arenaRoom.y; y < this._arenaRoom.y + this._arenaRoom.height; y++) {
            if (game.visibility && !game.visibility[y]) game.visibility[y] = [];
            if (game.explored && !game.explored[y]) game.explored[y] = [];
            for (let x = this._arenaRoom.x; x < this._arenaRoom.x + this._arenaRoom.width; x++) {
                if (game.visibility) game.visibility[y][x] = 1;
                if (game.explored) game.explored[y][x] = true;
                if (game.map[y] && game.map[y][x]) {
                    game.map[y][x].visible = true;
                    game.map[y][x].explored = true;
                }
            }
        }

        // Disable fog of war/darkness while in arena
        this._previousDarkness = game.globalDarkness;
        game.globalDarkness = 0;

        // Force FOV recalculation if available
        if (typeof updateFOV === 'function') {
            updateFOV(game.player.gridX, game.player.gridY);
        }
        if (typeof computeFOV === 'function') {
            computeFOV(game.player.gridX, game.player.gridY);
        }

        console.log('[Arena] Teleported to test arena');
        console.log('[Arena] Use debug.spawnMonster("name") or debug.spawnMonster("name", level)');
        console.log('[Arena] Use debug.listMonsters() to see available monsters');
        if (typeof addMessage === 'function') {
            addMessage('Teleported to Test Arena!');
        }
    },

    return() {
        if (this._originalPosition) {
            game.player.gridX = this._originalPosition.x;
            game.player.gridY = this._originalPosition.y;
            game.player.x = this._originalPosition.x;
            game.player.y = this._originalPosition.y;
            game.player.displayX = this._originalPosition.x;
            game.player.displayY = this._originalPosition.y;

            // Restore darkness setting
            if (this._previousDarkness !== undefined) {
                game.globalDarkness = this._previousDarkness;
            }

            // Force FOV recalculation
            if (typeof updateFOV === 'function') {
                updateFOV(game.player.gridX, game.player.gridY);
            }
            if (typeof computeFOV === 'function') {
                computeFOV(game.player.gridX, game.player.gridY);
            }

            console.log('[Arena] Returned to original position');
            if (typeof addMessage === 'function') {
                addMessage('Returned from Test Arena');
            }
        } else {
            console.warn('[Arena] No original position saved');
        }
    },

    spawnMonster(monsterName, level = null, offsetX = 3, offsetY = 0) {
        if (!monsterName) {
            console.log('Usage: debug.spawnMonster("Monster Name") or debug.spawnMonster("Monster Name", level)');
            return null;
        }

        if (typeof MONSTER_DATA === 'undefined') {
            console.error('[Arena] MONSTER_DATA not loaded');
            return null;
        }

        // Find monster (case-insensitive partial match)
        let matchedName = null;
        const lowerInput = monsterName.toLowerCase();

        for (const name of Object.keys(MONSTER_DATA)) {
            if (name.toLowerCase() === lowerInput) {
                matchedName = name;
                break;
            }
            if (name.toLowerCase().includes(lowerInput)) {
                matchedName = name;
            }
        }

        if (!matchedName) {
            console.error(`[Arena] Monster "${monsterName}" not found`);
            console.log('[Arena] Available:', Object.keys(MONSTER_DATA).join(', '));
            return null;
        }

        const spawnX = game.player.gridX + offsetX;
        const spawnY = game.player.gridY + offsetY;

        // Override floor for level scaling
        const originalFloor = game.floor;
        if (level !== null) {
            game.floor = level;
        }

        let enemy = null;
        if (typeof createEnemy === 'function') {
            enemy = createEnemy(matchedName, spawnX, spawnY, this._arenaRoom || game.player.room);
        }

        // Restore floor
        if (level !== null) {
            game.floor = originalFloor;
            if (enemy) enemy.level = level;
        }

        if (enemy) {
            if (!game.enemies) game.enemies = [];
            game.enemies.push(enemy);

            if (typeof AIManager !== 'undefined' && typeof AIManager.registerEnemy === 'function') {
                AIManager.registerEnemy(enemy);
            }

            console.log(`[Arena] Spawned ${matchedName} (Lv.${enemy.level}) at (${spawnX}, ${spawnY})`);
            console.log(`[Arena] HP: ${enemy.hp}/${enemy.maxHp}, STR: ${enemy.str}, AGI: ${enemy.agi}, INT: ${enemy.int}`);

            if (typeof addMessage === 'function') {
                addMessage(`Spawned ${matchedName} (Lv.${enemy.level})!`);
            }

            return enemy;
        } else {
            console.error('[Arena] Failed to create enemy');
            return null;
        }
    },

    spawnAll(level = null) {
        if (typeof MONSTER_DATA === 'undefined') {
            console.error('[Arena] MONSTER_DATA not loaded');
            return;
        }

        const monsters = Object.keys(MONSTER_DATA);
        const gridSize = Math.ceil(Math.sqrt(monsters.length));
        let spawned = 0;

        monsters.forEach((name, i) => {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const offsetX = (col - Math.floor(gridSize / 2)) * 2 + 3;
            const offsetY = (row - Math.floor(gridSize / 2)) * 2;

            const enemy = this.spawnMonster(name, level, offsetX, offsetY);
            if (enemy) spawned++;
        });

        console.log(`[Arena] Spawned ${spawned}/${monsters.length} monsters`);
    },

    clear() {
        if (!game.enemies) return;

        if (typeof AIManager !== 'undefined') {
            game.enemies.forEach(enemy => {
                if (typeof AIManager.unregisterEnemy === 'function') {
                    AIManager.unregisterEnemy(enemy);
                }
            });
        }

        const count = game.enemies.length;
        game.enemies = [];

        console.log(`[Arena] Cleared ${count} enemies`);
        if (typeof addMessage === 'function') {
            addMessage(`Cleared ${count} enemies`);
        }
    },

    setFloor(floor) {
        if (typeof floor !== 'number' || floor < 1) {
            console.error('[Arena] Invalid floor number');
            return;
        }

        game.floor = floor;
        console.log(`[Arena] Floor set to ${floor}`);
        console.log(`[Arena] New monsters will spawn at Lv.${floor} with ${Math.round((1 + (floor - 1) * 0.12) * 100)}% stats`);

        if (typeof addMessage === 'function') {
            addMessage(`Floor set to ${floor}`);
        }
    },

    // ========================================================================
    // FLOOR NAVIGATION HELPERS
    // ========================================================================

    showExit() {
        console.log('\n🚪 FLOOR EXIT/DESCENT LOCATION:');

        let exitX = null, exitY = null;

        // Check game.exitPosition first (this is what dungeon gen sets)
        if (typeof game !== 'undefined' && game.exitPosition) {
            exitX = game.exitPosition.x;
            exitY = game.exitPosition.y;
            console.log(`   Exit Position: (${exitX}, ${exitY})`);
        }

        // Check sessionState.pathDown and sync if needed
        if (typeof sessionState !== 'undefined' && sessionState.pathDown) {
            const pd = sessionState.pathDown;
            if (pd.x !== null && pd.y !== null) {
                exitX = pd.x;
                exitY = pd.y;
                console.log(`   Discovered: ${pd.discovered ? 'Yes' : 'No'}`);
                console.log(`   Revealed: ${pd.revealed ? 'Yes' : 'No'}`);
            } else if (exitX !== null) {
                // Sync from game.exitPosition
                sessionState.pathDown.x = exitX;
                sessionState.pathDown.y = exitY;
                console.log(`   (Synced pathDown from exitPosition)`);
            }

            // Reveal it on the map
            if (exitX !== null && !pd.revealed) {
                sessionState.pathDown.revealed = true;
                sessionState.pathDown.discovered = true;
                console.log('   (Exit has been revealed on map!)');
            }
        }

        if (exitX !== null && exitY !== null) {
            console.log(`\n   To teleport: debug.goToExit()`);
        } else {
            console.log('   No exit position found on this floor');
        }

        // Check for extraction points
        if (typeof ExtractionSystem !== 'undefined' && ExtractionSystem.points && ExtractionSystem.points.length > 0) {
            console.log('\n📤 EXTRACTION POINTS:');
            ExtractionSystem.points.forEach((ep, i) => {
                const status = ep.isActive() ? 'Active' : 'Collapsed';
                console.log(`   ${i + 1}. (${ep.x}, ${ep.y}) - ${status}`);
            });
        }

        console.log('\n💡 Current floor:', game?.floor || 1);
    },

    goToExit() {
        let exitX = null, exitY = null;

        // Try game.exitPosition first (primary source)
        if (typeof game !== 'undefined' && game.exitPosition) {
            exitX = game.exitPosition.x;
            exitY = game.exitPosition.y;
        }

        // Also check sessionState.pathDown
        if (typeof sessionState !== 'undefined' && sessionState.pathDown &&
            sessionState.pathDown.x !== null && sessionState.pathDown.y !== null) {
            exitX = sessionState.pathDown.x;
            exitY = sessionState.pathDown.y;
        }

        if (exitX !== null && exitY !== null) {
            this.teleport(exitX, exitY);
            console.log(`Teleported to exit at (${exitX}, ${exitY})!`);
            return;
        }

        console.error('No exit/descent location found on this floor');
    },

    unlockAllFloors(maxFloor = 10) {
        console.log(`\n🔓 UNLOCKING ALL FLOORS (1-${maxFloor})...`);

        if (typeof persistentState === 'undefined') {
            console.error('persistentState not available');
            return;
        }

        // Ensure shortcuts structure exists
        if (!persistentState.shortcuts) {
            persistentState.shortcuts = { unlockedFloors: [1], extractedFrom: {} };
        }
        if (!persistentState.shortcuts.unlockedFloors) {
            persistentState.shortcuts.unlockedFloors = [1];
        }

        // Unlock all floors
        for (let floor = 1; floor <= maxFloor; floor++) {
            if (!persistentState.shortcuts.unlockedFloors.includes(floor)) {
                persistentState.shortcuts.unlockedFloors.push(floor);
            }
            // Also mark as extracted from (for shortcut purposes)
            if (!persistentState.shortcuts.extractedFrom) {
                persistentState.shortcuts.extractedFrom = {};
            }
            persistentState.shortcuts.extractedFrom[floor] = true;
        }

        // Sort floors
        persistentState.shortcuts.unlockedFloors.sort((a, b) => a - b);

        // Update deepest floor stat
        if (persistentState.stats) {
            persistentState.stats.deepestFloor = Math.max(persistentState.stats.deepestFloor || 1, maxFloor);
        }

        console.log(`✅ Unlocked floors: ${persistentState.shortcuts.unlockedFloors.join(', ')}`);
        console.log('   Use the Loadout UI in village to select starting floor');
        console.log('   Or use debug.goFloor(n) to jump directly');
    },

    goFloor(floor) {
        if (typeof floor !== 'number' || floor < 1 || floor > 10) {
            console.error('Usage: debug.goFloor(1-10)');
            return;
        }

        // Make sure floor is unlocked
        this.unlockAllFloors(floor);

        // Set the floor
        game.floor = floor;

        // If SessionManager exists, use it
        if (typeof SessionManager !== 'undefined' && typeof SessionManager.startFloor === 'function') {
            SessionManager.startFloor(floor);
            console.log(`Starting new run on floor ${floor}...`);
        } else {
            // Manual dungeon regen
            if (typeof generateBlobDungeon === 'function') {
                game.enemies = [];
                if (typeof HazardSystem !== 'undefined') HazardSystem.cleanup();
                generateBlobDungeon();
                console.log(`Regenerated dungeon for floor ${floor}`);
            }
        }

        console.log(`\n🏔️ Now on Floor ${floor}`);
        if (typeof addMessage === 'function') {
            addMessage(`Jumped to Floor ${floor}`);
        }
    }
};

// EXPORTS
window.debug = Debug;
window.Debug = Debug;

console.log('[Debug] Commands loaded. Type debug.help() for usage.');