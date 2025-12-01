// ============================================================================
// HAZARD SYSTEM - Environmental Hazards
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
        // FIRE
        this.registerHazard({ id: 'lava_pool', name: 'Lava Pool', element: 'fire', type: 'static', damage: 8, tickInterval: 1000, statusEffect: 'burning', statusChance: 0.5, color: '#ff4500', symbol: '≋', avoidTiers: ['TIER_3', 'TIER_2'] });
        this.registerHazard({ id: 'fire_vent', name: 'Fire Vent', element: 'fire', type: 'triggered', damage: 12, radius: 1, cooldown: 5000, statusEffect: 'burning', color: '#ff6b35', symbol: '◉', avoidTiers: ['TIER_3'] });
        
        // ICE
        this.registerHazard({ id: 'ice_patch', name: 'Ice Patch', element: 'ice', type: 'static', damage: 0, effect: 'slip', slipChance: 0.4, statusEffect: 'chilled', color: '#74b9ff', symbol: '~' });
        this.registerHazard({ id: 'frost_trap', name: 'Frost Trap', element: 'ice', type: 'triggered', damage: 6, radius: 2, cooldown: 8000, statusEffect: 'frozen', color: '#a8d8ff', symbol: '❄', avoidTiers: ['TIER_3', 'TIER_2'] });
        
        // NATURE
        this.registerHazard({ id: 'poison_spores', name: 'Poison Spores', element: 'nature', type: 'area', damage: 2, tickInterval: 1500, radius: 2, statusEffect: 'poisoned', statusChance: 0.6, color: '#00b894', symbol: '◌', avoidTiers: ['TIER_3'] });
        this.registerHazard({ id: 'thorn_patch', name: 'Thorn Patch', element: 'nature', type: 'static', damage: 4, tickInterval: 500, slowAmount: 0.5, color: '#27ae60', symbol: '※' });
        
        // DEATH
        this.registerHazard({ id: 'grave_miasma', name: 'Grave Miasma', element: 'death', type: 'area', damage: 3, tickInterval: 2000, radius: 2, statusEffect: 'withered', statusChance: 0.3, color: '#636e72', symbol: '☠' });
        this.registerHazard({ id: 'bone_spikes', name: 'Bone Spikes', element: 'death', type: 'triggered', damage: 10, cooldown: 4000, color: '#dfe6e9', symbol: '▲', avoidTiers: ['TIER_3', 'TIER_2'] });
        
        // ARCANE
        this.registerHazard({ id: 'mana_void', name: 'Mana Void', element: 'arcane', type: 'static', damage: 0, effect: 'mana_drain', manaDrain: 5, tickInterval: 1000, statusEffect: 'disrupted', color: '#a855f7', symbol: '◎' });
        this.registerHazard({ id: 'arcane_mine', name: 'Arcane Mine', element: 'arcane', type: 'triggered', damage: 15, radius: 2, cooldown: 0, persistent: false, hidden: true, color: '#c084fc', symbol: '✦' });
        
        // WATER
        this.registerHazard({ id: 'deep_water', name: 'Deep Water', element: 'water', type: 'static', damage: 0, effect: 'drown', drownDamage: 5, slowAmount: 0.6, statusEffect: 'drenched', color: '#0984e3', symbol: '≈' });
        this.registerHazard({ id: 'whirlpool', name: 'Whirlpool', element: 'water', type: 'area', damage: 4, tickInterval: 1000, pullStrength: 0.5, radius: 2, color: '#00cec9', symbol: '◉', avoidTiers: ['TIER_3', 'TIER_2'] });
        
        // EARTH
        this.registerHazard({ id: 'unstable_ground', name: 'Unstable Ground', element: 'earth', type: 'triggered', damage: 8, radius: 1, cooldown: 6000, statusEffect: 'stunned', color: '#a0522d', symbol: '▓' });
        this.registerHazard({ id: 'crystal_shards', name: 'Crystal Shards', element: 'earth', type: 'static', damage: 5, reflectDamage: 3, color: '#00bcd4', symbol: '◆' });
        
        // DARK
        this.registerHazard({ id: 'shadow_pit', name: 'Shadow Pit', element: 'dark', type: 'static', damage: 0, effect: 'blind', visionReduction: 4, statusEffect: 'blinded', color: '#2d3436', symbol: '●' });
        this.registerHazard({ id: 'void_rift', name: 'Void Rift', element: 'dark', type: 'area', damage: 6, tickInterval: 1500, radius: 1, teleportChance: 0.1, color: '#6a1b9a', symbol: '◎', avoidTiers: ['TIER_3', 'TIER_2', 'TIER_1'] });
        
        // HOLY
        this.registerHazard({ id: 'sanctified_ground', name: 'Sanctified Ground', element: 'holy', type: 'static', damage: 0, healAmount: 2, tickInterval: 2000, undeadDamage: 8, color: '#fdcb6e', symbol: '✦' });
        
        // PHYSICAL
        this.registerHazard({ id: 'spike_trap', name: 'Spike Trap', element: 'physical', type: 'triggered', damage: 12, cooldown: 3000, statusEffect: 'bleeding', statusChance: 0.5, color: '#636e72', symbol: '▲', avoidTiers: ['TIER_3', 'TIER_2'] });
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