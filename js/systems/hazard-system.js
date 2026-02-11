// ============================================================================
// HAZARD SYSTEM - Environmental Hazards
// ============================================================================
//
// BALANCE DOCUMENTATION (Warbringer Audit - 2026-02-11)
// =====================================================
//
// Damage Philosophy:
// - Player HP ranges from 100 (floor 1) to ~300 (floor 10 with gear)
// - Hazards should be threatening but not instantly lethal
// - Static hazards (ongoing): 2-8 damage per tick (2-8% of base HP per second)
// - Triggered hazards (one-shot): 8-20 damage (8-20% of base HP)
// - Area hazards (DoT zones): 2-6 damage per tick (lower due to persistence)
//
// Floor Scaling:
// - Hazards currently use flat damage (no floor scaling)
// - This is INTENTIONAL: hazards teach environmental awareness early
// - Late-game, hazards become less threatening (reduced % of HP)
// - Elite/Boss rooms may have enhanced hazards (future feature)
//
// AI Avoidance Tiers:
// - TIER_3 (Fodder): Avoids most hazards (self-preservation instinct)
// - TIER_2 (Standard): Avoids dangerous hazards (lava, spikes)
// - TIER_1 (Veteran): Avoids only the deadliest (void rift)
// - ELITE/BOSS: Ignores all hazards (confident/powerful)
//
// Current Hazard Balance (19 types):
// ==================================
//
// LOW THREAT (0-4 damage/tick):
// - ice_patch (0 + slip): Utility/control, no avoidance
// - mana_void (0 + mana drain): Resource denial, no avoidance
// - shadow_pit (0 + blind): Vision denial, no avoidance
// - sanctified_ground (0 + heal): Player-positive, damages undead
// - poison_spores (2/tick): DoT zone, low damage, high status chance
// - grave_miasma (3/tick): DoT zone, withered debuff
//
// MEDIUM THREAT (4-10 damage/tick):
// - thorn_patch (4/tick): Static, adds slow, no avoidance (trap value)
// - whirlpool (4/tick): Area, pull effect, avoidance: T3/T2
// - crystal_shards (5/tick): Static, reflect damage mechanic
// - frost_trap (6/trigger): AoE trigger, freeze status
// - void_rift (6/tick): Area, teleport chance, avoidance: T3/T2/T1
// - lava_pool (8/tick): Static, burning status, avoidance: T3/T2
// - unstable_ground (8/trigger): AoE trigger, stun status
// - bone_spikes (10/trigger): Trigger, avoidance: T3/T2
//
// HIGH THREAT (12-20 damage):
// - fire_vent (12/trigger): Burst damage, burning, avoidance: T3
// - spike_trap (12/trigger): Classic trap, bleeding, avoidance: T3/T2
// - pit_trap (15/trigger): Hidden, stun, one-shot trap
// - arcane_mine (15/trigger): Hidden, AoE, one-shot mine
//
// ============================================================================

const HazardSystem = {
    config: {
        maxHazardsPerRoom: 5,
        hazardDensity: 0.02,
        debugLogging: true
    },
    hazards: [],
    definitions: {},

    init() {
        this.hazards = [];
        this.registerDefaultHazards();
        console.log('[HazardSystem] Initialized');
    },

    registerDefaultHazards() {
        // ========================================
        // FIRE ELEMENT (Floors 3-4 themed)
        // ========================================
        // Lava Pool: High-threat static zone. Avoidance: T3/T2 (smart enemies avoid)
        // Damage: 8/sec = 8% base HP/sec. Threatening but escapable.
        this.registerHazard({ id: 'lava_pool', name: 'Lava Pool', element: 'fire', type: 'static', damage: 8, tickInterval: 1000, statusEffect: 'burning', statusChance: 0.5, color: '#ff4500', symbol: '≋', avoidTiers: ['TIER_3', 'TIER_2'] });
        // Fire Vent: Burst trap with AoE. Avoidance: T3 only (veteran/elite walk through)
        // Damage: 12 = 12% base HP one-shot. Respects with 5s cooldown.
        this.registerHazard({ id: 'fire_vent', name: 'Fire Vent', element: 'fire', type: 'triggered', damage: 12, radius: 1, cooldown: 5000, statusEffect: 'burning', color: '#ff6b35', symbol: '◉', avoidTiers: ['TIER_3'] });

        // ========================================
        // ICE ELEMENT (Floors 5-6 themed)
        // ========================================
        // Ice Patch: Control hazard, no damage. Creates positioning challenges.
        // No avoidance - enemies slip too, creates chaos.
        this.registerHazard({ id: 'ice_patch', name: 'Ice Patch', element: 'ice', type: 'static', damage: 0, effect: 'slip', slipChance: 0.4, statusEffect: 'chilled', color: '#74b9ff', symbol: '~' });
        // Frost Trap: Large AoE freeze. Avoidance: T3/T2 (control-denial for player)
        // Damage: 6 = 6% HP, but freeze is the real threat.
        this.registerHazard({ id: 'frost_trap', name: 'Frost Trap', element: 'ice', type: 'triggered', damage: 6, radius: 2, cooldown: 8000, statusEffect: 'frozen', color: '#a8d8ff', symbol: '❄', avoidTiers: ['TIER_3', 'TIER_2'] });

        // ========================================
        // NATURE ELEMENT (Floors 1-2 themed)
        // ========================================
        // Poison Spores: Low-threat DoT zone. Avoidance: T3 only (fodder fears poison)
        // Damage: 2/1.5s = ~1.3/sec. Primary threat is poison status.
        this.registerHazard({ id: 'poison_spores', name: 'Poison Spores', element: 'nature', type: 'area', damage: 2, tickInterval: 1500, radius: 2, statusEffect: 'poisoned', statusChance: 0.6, color: '#00b894', symbol: '◌', avoidTiers: ['TIER_3'] });
        // Thorn Patch: Static slow zone. No avoidance (tactical value too high)
        // Damage: 4/0.5s = 8/sec if standing still. Punishes immobility.
        this.registerHazard({ id: 'thorn_patch', name: 'Thorn Patch', element: 'nature', type: 'static', damage: 4, tickInterval: 500, slowAmount: 0.5, color: '#27ae60', symbol: '※' });

        // ========================================
        // DEATH ELEMENT (Floors 7-8 themed)
        // ========================================
        // Grave Miasma: Low-threat aura. Withered debuff reduces healing.
        // Damage: 3/2s = 1.5/sec. Debuff is primary threat.
        this.registerHazard({ id: 'grave_miasma', name: 'Grave Miasma', element: 'death', type: 'area', damage: 3, tickInterval: 2000, radius: 2, statusEffect: 'withered', statusChance: 0.3, color: '#636e72', symbol: '☠' });
        // Bone Spikes: Burst trap. Avoidance: T3/T2 (undead floors are dangerous)
        // Damage: 10 = 10% base HP. Solid mid-tier threat.
        this.registerHazard({ id: 'bone_spikes', name: 'Bone Spikes', element: 'death', type: 'triggered', damage: 10, cooldown: 4000, color: '#dfe6e9', symbol: '▲', avoidTiers: ['TIER_3', 'TIER_2'] });

        // ========================================
        // ARCANE ELEMENT (Floors 9-10 themed)
        // ========================================
        // Mana Void: Resource denial. Disrupted status blocks abilities.
        // No damage - strategic positioning hazard.
        this.registerHazard({ id: 'mana_void', name: 'Mana Void', element: 'arcane', type: 'static', damage: 0, effect: 'mana_drain', manaDrain: 5, tickInterval: 1000, statusEffect: 'disrupted', color: '#a855f7', symbol: '◎' });
        // Arcane Mine: One-shot hidden trap. High damage, large AoE.
        // Damage: 15 = 15% base HP. Hidden + AoE = high threat.
        this.registerHazard({ id: 'arcane_mine', name: 'Arcane Mine', element: 'arcane', type: 'triggered', damage: 15, radius: 2, cooldown: 0, persistent: false, hidden: true, color: '#c084fc', symbol: '✦' });

        // ========================================
        // WATER ELEMENT (Mixed floors)
        // ========================================
        // Deep Water: Movement hazard. Slow + drenched (fire weakness).
        // No direct damage, but drown mechanic deals 5/tick if submerged.
        this.registerHazard({ id: 'deep_water', name: 'Deep Water', element: 'water', type: 'static', damage: 0, effect: 'drown', drownDamage: 5, slowAmount: 0.6, statusEffect: 'drenched', color: '#0984e3', symbol: '≈' });
        // Whirlpool: Pull + damage zone. Avoidance: T3/T2 (escape danger)
        // Damage: 4/sec. Pull effect makes escape harder.
        this.registerHazard({ id: 'whirlpool', name: 'Whirlpool', element: 'water', type: 'area', damage: 4, tickInterval: 1000, pullStrength: 0.5, radius: 2, color: '#00cec9', symbol: '◉', avoidTiers: ['TIER_3', 'TIER_2'] });

        // ========================================
        // EARTH ELEMENT (Mixed floors)
        // ========================================
        // Unstable Ground: Stun trap. No avoidance (rewards tactical play).
        // Damage: 8 = 8% HP. Stun is the real threat.
        this.registerHazard({ id: 'unstable_ground', name: 'Unstable Ground', element: 'earth', type: 'triggered', damage: 8, radius: 1, cooldown: 6000, statusEffect: 'stunned', color: '#a0522d', symbol: '▓' });
        // Crystal Shards: Reflect zone. Damages melee attackers.
        // Damage: 5 + 3 reflect. Strategic positioning zone.
        this.registerHazard({ id: 'crystal_shards', name: 'Crystal Shards', element: 'earth', type: 'static', damage: 5, reflectDamage: 3, color: '#00bcd4', symbol: '◆' });

        // ========================================
        // DARK ELEMENT (Floors 7-10 themed)
        // ========================================
        // Shadow Pit: Vision denial. Blinded status reduces sight.
        // No damage - positional awareness hazard.
        this.registerHazard({ id: 'shadow_pit', name: 'Shadow Pit', element: 'dark', type: 'static', damage: 0, effect: 'blind', visionReduction: 4, statusEffect: 'blinded', color: '#2d3436', symbol: '●' });
        // Void Rift: THE DEADLIEST HAZARD. Avoidance: T3/T2/T1 (even veterans fear it)
        // Damage: 6/tick + 10% teleport chance. Unpredictable and dangerous.
        this.registerHazard({ id: 'void_rift', name: 'Void Rift', element: 'dark', type: 'area', damage: 6, tickInterval: 1500, radius: 1, teleportChance: 0.1, color: '#6a1b9a', symbol: '◎', avoidTiers: ['TIER_3', 'TIER_2', 'TIER_1'] });

        // ========================================
        // HOLY ELEMENT (Special - player-positive)
        // ========================================
        // Sanctified Ground: HEALS living, HURTS undead.
        // Heal: 2/2s = 1/sec. Undead damage: 8/tick = 8% HP.
        this.registerHazard({ id: 'sanctified_ground', name: 'Sanctified Ground', element: 'holy', type: 'static', damage: 0, healAmount: 2, tickInterval: 2000, undeadDamage: 8, color: '#fdcb6e', symbol: '✦' });

        // ========================================
        // PHYSICAL ELEMENT (All floors)
        // ========================================
        // Spike Trap: Classic dungeon trap. Avoidance: T3/T2 (common knowledge)
        // Damage: 12 = 12% HP + bleeding. Iconic and dangerous.
        this.registerHazard({ id: 'spike_trap', name: 'Spike Trap', element: 'physical', type: 'triggered', damage: 12, cooldown: 3000, statusEffect: 'bleeding', statusChance: 0.5, color: '#636e72', symbol: '▲', avoidTiers: ['TIER_3', 'TIER_2'] });
        // Pit Trap: Hidden one-shot trap. Stuns on landing.
        // Damage: 15 = 15% HP. Hidden = high threat. No avoidance (hidden).
        this.registerHazard({ id: 'pit_trap', name: 'Pit Trap', element: 'physical', type: 'triggered', damage: 15, cooldown: 0, persistent: false, hidden: true, statusEffect: 'stunned', color: '#2d3436', symbol: '□' });

        console.log(`[HazardSystem] Registered ${Object.keys(this.definitions).length} hazard types`);
    },

    registerHazard(def) {
        this.definitions[def.id] = { ...def, tickInterval: def.tickInterval || 1000, cooldown: def.cooldown || 0, persistent: def.persistent !== false };
    },

    spawnForAllRooms() {
        if (!game.rooms) return;
        for (const room of game.rooms) {
            if (room.type !== 'entrance') this.spawnForRoom(room);
        }
    },

    spawnForRoom(room) {
        if (!room?.element) return;
        const eligible = Object.values(this.definitions).filter(h => h.element === room.element || h.element === 'physical');
        if (eligible.length === 0) return;

        const area = (room.floorWidth || 20) * (room.floorHeight || 20);
        const count = Math.min(this.config.maxHazardsPerRoom, Math.floor(area * this.config.hazardDensity));

        for (let i = 0; i < count; i++) {
            const def = eligible[Math.floor(Math.random() * eligible.length)];
            const pos = this.findPosition(room);
            if (pos) {
                const hazard = { ...def, x: pos.x, y: pos.y, cooldownLeft: 0, tickTimer: 0, triggered: false };
                this.hazards.push(hazard);
                const tile = this.safeGetTile(pos.x, pos.y);
                if (tile) tile.hazard = hazard;
            }
        }
    },

    findPosition(room) {
        for (let i = 0; i < 50; i++) {
            const x = (room.floorX || room.x + 1) + Math.floor(Math.random() * ((room.floorWidth || room.width - 2) - 2)) + 1;
            const y = (room.floorY || room.y + 1) + Math.floor(Math.random() * ((room.floorHeight || room.height - 2) - 2)) + 1;
            const tile = this.safeGetTile(x, y);
            if (tile?.type === 'floor' && !tile.hazard) return { x, y };
        }
        return null;
    },

    safeGetTile(x, y) {
        if (typeof safeGetTile === 'function') return safeGetTile(x, y);
        return game.map?.[y]?.[x] || null;
    },

    update(dt) {
        for (const h of this.hazards) {
            if (h.cooldownLeft > 0) h.cooldownLeft -= dt;
            if (h.tickInterval) {
                h.tickTimer = (h.tickTimer || 0) + dt;
                if (h.tickTimer >= h.tickInterval) {
                    h.tickTimer -= h.tickInterval;
                    this.tickHazard(h);
                }
            }
        }
    },

    tickHazard(hazard) {
        if (hazard.type !== 'area' && hazard.type !== 'static') return;
        const entities = this.getEntitiesAt(hazard.x, hazard.y, hazard.radius || 0);
        for (const e of entities) {
            if (hazard.damage > 0) {
                e.hp -= hazard.damage;
                if (this.config.debugLogging) console.log(`[Hazard] ${hazard.name} deals ${hazard.damage} to ${e.name || 'player'}`);
            }
            if (hazard.healAmount > 0 && !e.isUndead) {
                e.hp = Math.min(e.maxHp, e.hp + hazard.healAmount);
            }
            if (hazard.undeadDamage && e.isUndead) {
                e.hp -= hazard.undeadDamage;
            }
            if (hazard.statusEffect && Math.random() < (hazard.statusChance || 1)) {
                if (typeof applyStatusEffect === 'function') applyStatusEffect(e, hazard.statusEffect);
            }
            if (e.hp <= 0 && typeof handleDeath === 'function') handleDeath(e, null);
        }
    },

    checkCollision(entity) {
        const x = Math.floor(entity.gridX ?? entity.x);
        const y = Math.floor(entity.gridY ?? entity.y);
        const tile = this.safeGetTile(x, y);
        if (!tile?.hazard) return;

        const h = tile.hazard;
        if (h.type === 'triggered' && h.cooldownLeft <= 0) {
            this.trigger(h, entity);
        }
        if (h.type === 'static' && h.damage > 0) {
            entity.hp -= h.damage;
            if (h.statusEffect && Math.random() < (h.statusChance || 1)) {
                if (typeof applyStatusEffect === 'function') applyStatusEffect(entity, h.statusEffect);
            }
        }
        if (h.effect === 'slip' && Math.random() < (h.slipChance || 0.3)) {
            if (typeof addMessage === 'function') addMessage(`${entity.name || 'You'} slipped on ice!`);
        }
        if (h.slowAmount && entity.moveSpeed) {
            entity.moveSpeed *= (1 - h.slowAmount);
        }
    },

    trigger(hazard, entity) {
        if (hazard.damage > 0) {
            const entities = this.getEntitiesAt(hazard.x, hazard.y, hazard.radius || 0);
            for (const e of entities) {
                e.hp -= hazard.damage;
                if (typeof addMessage === 'function') addMessage(`${e.name || 'You'} took ${hazard.damage} from ${hazard.name}!`);
                if (hazard.statusEffect) {
                    if (typeof applyStatusEffect === 'function') applyStatusEffect(e, hazard.statusEffect);
                }
                if (e.hp <= 0 && typeof handleDeath === 'function') handleDeath(e, null);
            }
        }
        hazard.cooldownLeft = hazard.cooldown;
        hazard.triggered = true;
        if (!hazard.persistent) this.remove(hazard);
    },

    getEntitiesAt(x, y, radius) {
        const all = [game.player, ...(game.enemies || [])].filter(Boolean);
        return all.filter(e => {
            const ex = e.gridX ?? e.x;
            const ey = e.gridY ?? e.y;
            return Math.sqrt((ex - x) ** 2 + (ey - y) ** 2) <= radius + 0.5;
        });
    },

    shouldAvoid(monster, hazard) {
        return hazard.avoidTiers?.includes(monster.tier);
    },

    getHazardAt(x, y) {
        return this.hazards.find(h => h.x === x && h.y === y);
    },

    remove(hazard) {
        const idx = this.hazards.indexOf(hazard);
        if (idx >= 0) this.hazards.splice(idx, 1);
        const tile = this.safeGetTile(hazard.x, hazard.y);
        if (tile) tile.hazard = null;
    },

    cleanup() {
        for (const h of this.hazards) {
            const tile = this.safeGetTile(h.x, h.y);
            if (tile) tile.hazard = null;
        }
        this.hazards = [];
    }
};

// EXPORTS
window.HazardSystem = HazardSystem;
console.log('[HazardSystem] Loaded');