// ============================================================================
// MONSTER SOCIAL SYSTEM - Pack, Swarm, and Command Mechanics
// ============================================================================
// Handles:
// - Pack formation and bonuses
// - Swarm behavior coordination
// - Command hierarchy (leaders/followers)
// - Ally communication and alerts
// ============================================================================

const MonsterSocialSystem = {
    // Configuration
    config: {
        packRadius: 5,              // Tiles for pack detection
        swarmRadius: 3,             // Tighter radius for swarms
        commandRadius: 8,           // Leader command range
        updateInterval: 500,        // ms between social updates
        maxPackSize: 6,
        maxSwarmSize: 8,
        
        // Bonuses
        packBonuses: {
            2: { damage: 0.05, defense: 0.05 },
            3: { damage: 0.10, defense: 0.10 },
            4: { damage: 0.15, defense: 0.10 },
            5: { damage: 0.20, defense: 0.15 },
            6: { damage: 0.25, defense: 0.15 }
        },
        swarmBonuses: {
            3: { attackSpeed: 0.10, evasion: 0.05 },
            5: { attackSpeed: 0.20, evasion: 0.10 },
            8: { attackSpeed: 0.30, evasion: 0.15 }
        },
        
        debugLogging: true
    },

    // Active groups
    packs: new Map(),           // packId -> { leader, members, element }
    swarms: new Map(),          // swarmId -> { members, center }
    commandChains: new Map(),   // leaderId -> [followerIds]
    
    // Internal
    _lastUpdate: 0,
    _groupIdCounter: 0,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    init() {
        this.packs.clear();
        this.swarms.clear();
        this.commandChains.clear();
        this._groupIdCounter = 0;
        console.log('[MonsterSocial] System initialized');
    },

    initialize() {
        this.init();
        this.scanAndFormGroups();
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    update(deltaTime) {
        const now = performance.now();
        if (now - this._lastUpdate < this.config.updateInterval) return;
        this._lastUpdate = now;

        // Update existing groups
        this.updatePacks();
        this.updateSwarms();
        this.updateCommandChains();

        // Coordinate swarm movements toward targets
        this.coordinateSwarms();

        // Merge orphaned pack members into nearby packs
        this.mergeLoneWolves();
    },

    /**
     * Merge orphaned pack members into nearby compatible packs
     */
    mergeLoneWolves() {
        if (!game?.enemies) return;

        const now = performance.now();
        const mergeDelay = 2000; // Wait 2 seconds before trying to merge

        for (const enemy of game.enemies) {
            // Skip non-orphans or recently orphaned
            if (!enemy.isOrphan || enemy.hp <= 0) continue;
            if (now - enemy.orphanedAt < mergeDelay) continue;

            // Look for nearby compatible packs
            let bestPack = null;
            let bestDistance = Infinity;

            for (const [packId, pack] of this.packs) {
                // Skip full packs
                if (pack.members.length >= this.config.maxPackSize) continue;

                // Check if compatible
                if (!this.arePackCompatible(enemy, pack.leader)) continue;

                // Check distance to pack leader
                const dist = this.getDistance(enemy, pack.leader);
                if (dist <= this.config.packRadius && dist < bestDistance) {
                    bestPack = pack;
                    bestDistance = dist;
                }
            }

            if (bestPack) {
                // Join the pack
                bestPack.members.push(enemy);
                enemy.packId = bestPack.id;
                delete enemy.isOrphan;
                delete enemy.orphanedAt;

                if (this.config.debugLogging) {
                    console.log(`[MonsterSocial] ${enemy.name} joined pack ${bestPack.id}`);
                }
            } else {
                // No pack found - try to form new pack with other orphans
                this.tryFormOrphanPack(enemy);
            }
        }
    },

    /**
     * Try to form a new pack from nearby orphans
     */
    tryFormOrphanPack(enemy) {
        if (!game?.enemies) return;

        const candidates = [enemy];

        for (const other of game.enemies) {
            if (other === enemy || other.hp <= 0) continue;
            if (!other.isOrphan || other.packId) continue;

            const dist = this.getDistance(enemy, other);
            if (dist <= this.config.packRadius && this.arePackCompatible(enemy, other)) {
                candidates.push(other);
                if (candidates.length >= 2) break; // Only need 2 for pack
            }
        }

        if (candidates.length >= 2) {
            // Form new pack
            const packId = `pack_${++this._groupIdCounter}`;
            const leader = this.selectPackLeader(candidates);

            this.packs.set(packId, {
                id: packId,
                leader: leader,
                members: candidates,
                element: leader.element || 'physical'
            });

            for (const member of candidates) {
                member.packId = packId;
                member.isPackLeader = (member === leader);
                delete member.isOrphan;
                delete member.orphanedAt;
            }

            if (this.config.debugLogging) {
                console.log(`[MonsterSocial] Orphans formed new pack ${packId} with ${candidates.length} members`);
            }
        }
    },

    /**
     * Coordinate all active swarms toward their targets
     */
    coordinateSwarms() {
        if (!game?.player) return;

        for (const [swarmId, swarm] of this.swarms) {
            // Find if any swarm member has a target
            let swarmTarget = null;
            for (const member of swarm.members) {
                if (member.ai?.target) {
                    swarmTarget = member.ai.target;
                    break;
                }
            }

            // If swarm has a target, coordinate all members
            if (swarmTarget) {
                this.coordinateSwarmMovement(swarmId, swarmTarget);
            }
        }
    },

    // ========================================================================
    // GROUP FORMATION
    // ========================================================================

    /**
     * Scan all enemies and form appropriate groups
     */
    scanAndFormGroups() {
        if (!game.enemies || game.enemies.length === 0) return;

        const unassigned = [...game.enemies];
        
        // First pass: Find leaders and form command chains
        for (const enemy of game.enemies) {
            if (this.canLead(enemy)) {
                this.formCommandChain(enemy, unassigned);
            }
        }

        // Second pass: Form packs from remaining pack-compatible enemies
        const packCandidates = unassigned.filter(e => this.isPackCompatible(e));
        this.formPacks(packCandidates);

        // Third pass: Form swarms from swarm-type enemies
        const swarmCandidates = unassigned.filter(e => this.isSwarmType(e));
        this.formSwarms(swarmCandidates);

        if (this.config.debugLogging) {
            console.log(`[MonsterSocial] Formed ${this.packs.size} packs, ${this.swarms.size} swarms, ${this.commandChains.size} command chains`);
        }
    },

    /**
     * Form a command chain with a leader
     */
    formCommandChain(leader, unassigned) {
        const followers = [];
        const leaderId = this.getEntityId(leader);
        
        // Find eligible followers within range
        for (let i = unassigned.length - 1; i >= 0; i--) {
            const candidate = unassigned[i];
            if (candidate === leader) continue;
            
            const dist = this.getDistance(leader, candidate);
            if (dist <= this.config.commandRadius && this.canBeCommanded(candidate, leader)) {
                followers.push(candidate);
                candidate.commandedBy = leaderId;
                unassigned.splice(i, 1);
            }
        }

        if (followers.length > 0) {
            this.commandChains.set(leaderId, {
                leader: leader,
                followers: followers,
                lastCommand: null
            });

            // Remove leader from unassigned
            const leaderIdx = unassigned.indexOf(leader);
            if (leaderIdx >= 0) unassigned.splice(leaderIdx, 1);

            if (this.config.debugLogging) {
                console.log(`[MonsterSocial] ${leader.name} commands ${followers.length} followers`);
            }
        }
    },

    /**
     * Form packs from compatible enemies
     */
    formPacks(candidates) {
        const assigned = new Set();

        for (const enemy of candidates) {
            if (assigned.has(enemy)) continue;

            // Find nearby pack-compatible allies
            const packMembers = [enemy];
            assigned.add(enemy);

            for (const other of candidates) {
                if (assigned.has(other)) continue;
                if (packMembers.length >= this.config.maxPackSize) break;

                const dist = this.getDistance(enemy, other);
                if (dist <= this.config.packRadius && this.arePackCompatible(enemy, other)) {
                    packMembers.push(other);
                    assigned.add(other);
                }
            }

            // Only form pack if 2+ members
            if (packMembers.length >= 2) {
                const packId = `pack_${++this._groupIdCounter}`;
                const leader = this.selectPackLeader(packMembers);
                
                this.packs.set(packId, {
                    id: packId,
                    leader: leader,
                    members: packMembers,
                    element: leader.element || 'physical'
                });

                // Assign pack to members
                for (const member of packMembers) {
                    member.packId = packId;
                    member.isPackLeader = (member === leader);
                }

                if (this.config.debugLogging) {
                    console.log(`[MonsterSocial] Formed pack ${packId} with ${packMembers.length} members (leader: ${leader.name})`);
                }
            }
        }
    },

    /**
     * Form swarms from swarm-type enemies
     */
    formSwarms(candidates) {
        const assigned = new Set();

        for (const enemy of candidates) {
            if (assigned.has(enemy)) continue;

            const swarmMembers = [enemy];
            assigned.add(enemy);

            for (const other of candidates) {
                if (assigned.has(other)) continue;
                if (swarmMembers.length >= this.config.maxSwarmSize) break;

                const dist = this.getDistance(enemy, other);
                if (dist <= this.config.swarmRadius && this.areSwarmCompatible(enemy, other)) {
                    swarmMembers.push(other);
                    assigned.add(other);
                }
            }

            // Swarms need 3+ members
            if (swarmMembers.length >= 3) {
                const swarmId = `swarm_${++this._groupIdCounter}`;
                const center = this.calculateCenter(swarmMembers);

                this.swarms.set(swarmId, {
                    id: swarmId,
                    members: swarmMembers,
                    center: center
                });

                for (const member of swarmMembers) {
                    member.swarmId = swarmId;
                }

                if (this.config.debugLogging) {
                    console.log(`[MonsterSocial] Formed swarm ${swarmId} with ${swarmMembers.length} members`);
                }
            }
        }
    },

    // ========================================================================
    // GROUP UPDATES
    // ========================================================================

    updatePacks() {
        for (const [packId, pack] of this.packs) {
            // Remove dead members
            const deadMembers = pack.members.filter(m => m.hp <= 0);
            pack.members = pack.members.filter(m => m.hp > 0);

            // Disband if too few members
            if (pack.members.length < 2) {
                this.disbandPack(packId);
                continue;
            }

            // LEADER LOCK-IN: Only update leader if dead (prevents flickering)
            if (!pack.leader || pack.leader.hp <= 0) {
                // Clear old leader flag
                if (pack.leader) {
                    pack.leader.isPackLeader = false;
                }
                // Select new leader
                pack.leader = this.selectPackLeader(pack.members);
                if (pack.leader) {
                    pack.leader.isPackLeader = true;
                    if (this.config.debugLogging) {
                        console.log(`[MonsterSocial] ${pack.leader.name} is now pack leader of ${packId}`);
                    }
                }
            }

            // Check if pack is still cohesive
            const scattered = this.isPackScattered(pack);
            if (scattered) {
                this.handleScatteredPack(pack);
            }
        }
    },

    updateSwarms() {
        for (const [swarmId, swarm] of this.swarms) {
            // Remove dead members
            swarm.members = swarm.members.filter(m => m.hp > 0);

            // Disband if too few
            if (swarm.members.length < 3) {
                this.disbandSwarm(swarmId);
                continue;
            }

            // Update center
            swarm.center = this.calculateCenter(swarm.members);
        }
    },

    updateCommandChains() {
        for (const [leaderId, chain] of this.commandChains) {
            // Check if leader is alive
            if (!chain.leader || chain.leader.hp <= 0) {
                this.disbandCommandChain(leaderId);
                continue;
            }

            // Remove dead followers
            chain.followers = chain.followers.filter(f => f.hp > 0);

            // Disband if no followers
            if (chain.followers.length === 0) {
                this.disbandCommandChain(leaderId);
            }
        }
    },

    // ========================================================================
    // BONUSES
    // ========================================================================

    /**
     * Get pack bonus for an enemy
     */
    getPackBonus(enemy) {
        if (!enemy.packId) return { damage: 0, defense: 0 };

        const pack = this.packs.get(enemy.packId);
        if (!pack) return { damage: 0, defense: 0 };

        const size = Math.min(pack.members.length, 6);
        return this.config.packBonuses[size] || { damage: 0, defense: 0 };
    },

    /**
     * Get swarm bonus for an enemy
     */
    getSwarmBonus(enemy) {
        if (!enemy.swarmId) return { attackSpeed: 0, evasion: 0 };

        const swarm = this.swarms.get(enemy.swarmId);
        if (!swarm) return { attackSpeed: 0, evasion: 0 };

        const size = swarm.members.length;
        
        if (size >= 8) return this.config.swarmBonuses[8];
        if (size >= 5) return this.config.swarmBonuses[5];
        if (size >= 3) return this.config.swarmBonuses[3];
        
        return { attackSpeed: 0, evasion: 0 };
    },

    /**
     * Get all social bonuses for an enemy
     */
    getAllBonuses(enemy) {
        const packBonus = this.getPackBonus(enemy);
        const swarmBonus = this.getSwarmBonus(enemy);

        return {
            damage: packBonus.damage || 0,
            defense: packBonus.defense || 0,
            attackSpeed: swarmBonus.attackSpeed || 0,
            evasion: swarmBonus.evasion || 0
        };
    },

    // ========================================================================
    // COMMUNICATION
    // ========================================================================

    /**
     * Alert all allies in range
     */
    alertAllies(alerter, target, alertType = 'sight') {
        if (!alerter || !game.enemies) return;

        const alertRange = alertType === 'shout' ? 15 : 8;
        const alerted = [];

        for (const enemy of game.enemies) {
            if (enemy === alerter || enemy.hp <= 0) continue;

            const dist = this.getDistance(alerter, enemy);
            if (dist > alertRange) continue;

            // Check if can receive alert
            if (this.canReceiveAlert(enemy, alerter, alertType)) {
                this.receiveAlert(enemy, alerter, target);
                alerted.push(enemy);
            }
        }

        if (this.config.debugLogging && alerted.length > 0) {
            console.log(`[MonsterSocial] ${alerter.name} alerted ${alerted.length} allies`);
        }

        return alerted;
    },

    /**
     * Issue command from leader to followers
     */
    issueCommand(leader, commandType, target = null) {
        const leaderId = this.getEntityId(leader);
        const chain = this.commandChains.get(leaderId);
        
        if (!chain) return [];

        const commanded = [];

        for (const follower of chain.followers) {
            if (follower.hp <= 0) continue;

            // Apply command based on type
            switch (commandType) {
                case 'attack':
                    if (follower.ai) {
                        follower.ai.target = target;
                        follower.ai.setState('chasing');
                    }
                    break;
                case 'defend':
                    if (follower.ai) {
                        follower.ai.defendPosition = { x: leader.gridX, y: leader.gridY };
                        follower.ai.setState('guarding');
                    }
                    break;
                case 'retreat':
                    if (follower.ai) {
                        follower.ai.setState('fleeing');
                    }
                    break;
                case 'hold':
                    if (follower.ai) {
                        follower.ai.setState('idle');
                    }
                    break;
            }

            commanded.push(follower);
        }

        chain.lastCommand = { type: commandType, target: target, time: performance.now() };

        if (this.config.debugLogging) {
            console.log(`[MonsterSocial] ${leader.name} issued ${commandType} command to ${commanded.length} followers`);
        }

        return commanded;
    },

    /**
     * Process alert reception
     */
    receiveAlert(enemy, alerter, target) {
        if (!enemy.ai) return;

        // Set alert state
        enemy.ai.alertedBy = alerter;
        enemy.ai.lastKnownTargetPos = target ? { x: target.gridX, y: target.gridY } : null;
        
        // Transition to alert state
        if (typeof enemy.ai.setState === 'function') {
            enemy.ai.setState('alert');
        } else {
            enemy.state = 'alert';
        }
    },

    // ========================================================================
    // SWARM COORDINATION
    // ========================================================================

    /**
     * Get coordinated attack position for swarm member
     */
    getSwarmAttackPosition(enemy, target) {
        if (!enemy.swarmId || !target) return null;

        const swarm = this.swarms.get(enemy.swarmId);
        if (!swarm) return null;

        // Calculate position to surround target
        const memberIndex = swarm.members.indexOf(enemy);
        const totalMembers = swarm.members.length;
        const angle = (memberIndex / totalMembers) * Math.PI * 2;
        const radius = 1.5; // Tiles from target

        return {
            x: target.gridX + Math.cos(angle) * radius,
            y: target.gridY + Math.sin(angle) * radius
        };
    },

    /**
     * Coordinate swarm movement toward a target
     */
    coordinateSwarmMovement(swarmId, target) {
        const swarm = this.swarms.get(swarmId);
        if (!swarm) return;

        for (let i = 0; i < swarm.members.length; i++) {
            const member = swarm.members[i];
            if (member.hp <= 0 || !member.ai) continue;

            const pos = this.getSwarmAttackPosition(member, target);
            if (pos) {
                member.ai.targetPosition = pos;
            }
        }
    },

    // ========================================================================
    // COMPATIBILITY CHECKS
    // ========================================================================

    canLead(enemy) {
        const tier = enemy.tier || 'TIER_3';
        return tier === 'ELITE' || tier === 'TIER_1';
    },

    canBeCommanded(follower, leader) {
        // Can't command same tier or higher
        const tierOrder = { 'TIER_3': 0, 'TIER_2': 1, 'TIER_1': 2, 'ELITE': 3 };
        const leaderTier = tierOrder[leader.tier] || 0;
        const followerTier = tierOrder[follower.tier] || 0;
        
        if (followerTier >= leaderTier) return false;

        // Check element compatibility
        if (leader.element && follower.element) {
            if (typeof isOpposed === 'function' && isOpposed(leader.element, follower.element)) {
                return false;
            }
        }

        return true;
    },

    isPackCompatible(enemy) {
        const behavior = enemy.behavior?.type || enemy.behaviorType;
        return behavior === 'pack' || behavior === 'tactical';
    },

    isSwarmType(enemy) {
        const behavior = enemy.behavior?.type || enemy.behaviorType;
        return behavior === 'swarm';
    },

    arePackCompatible(enemy1, enemy2) {
        // Same element or complementary
        if (enemy1.element === enemy2.element) return true;
        if (typeof isComplementary === 'function') {
            return isComplementary(enemy1.element, enemy2.element);
        }
        return true;
    },

    areSwarmCompatible(enemy1, enemy2) {
        // Swarms are usually same type
        return enemy1.name === enemy2.name || enemy1.typeId === enemy2.typeId;
    },

    canReceiveAlert(enemy, alerter, alertType) {
        // Check if same faction/not hostile
        if (enemy.faction && alerter.faction && enemy.faction !== alerter.faction) {
            return false;
        }

        // Deaf enemies can't hear shouts
        if (alertType === 'shout' && enemy.isDeaf) {
            return false;
        }

        return true;
    },

    // ========================================================================
    // HELPERS
    // ========================================================================

    getEntityId(entity) {
        return entity.id || `${entity.name}_${entity.gridX}_${entity.gridY}`;
    },

    getDistance(e1, e2) {
        const dx = (e1.gridX || e1.x) - (e2.gridX || e2.x);
        const dy = (e1.gridY || e1.y) - (e2.gridY || e2.y);
        return Math.sqrt(dx * dx + dy * dy);
    },

    calculateCenter(members) {
        let sumX = 0, sumY = 0;
        for (const m of members) {
            sumX += m.gridX || m.x;
            sumY += m.gridY || m.y;
        }
        return {
            x: sumX / members.length,
            y: sumY / members.length
        };
    },

    selectPackLeader(members) {
        // Prefer highest tier, then highest MaxHP (NOT current HP - prevents flickering)
        return members.reduce((best, current) => {
            const tierOrder = { 'TIER_3': 0, 'TIER_2': 1, 'TIER_1': 2, 'ELITE': 3 };
            const bestTier = tierOrder[best.tier] || 0;
            const currentTier = tierOrder[current.tier] || 0;

            if (currentTier > bestTier) return current;
            if (currentTier === bestTier) {
                // Use maxHP for stability, not current HP
                const bestMaxHP = best.maxHp || best.hp || 0;
                const currentMaxHP = current.maxHp || current.hp || 0;
                if (currentMaxHP > bestMaxHP) return current;
            }
            return best;
        }, members[0]);
    },

    isPackScattered(pack) {
        if (!pack.leader) return true;
        
        for (const member of pack.members) {
            if (member === pack.leader) continue;
            if (this.getDistance(pack.leader, member) > this.config.packRadius * 2) {
                return true;
            }
        }
        return false;
    },

    handleScatteredPack(pack) {
        // For now, just disband - could implement regrouping
        this.disbandPack(pack.id);
    },

    disbandPack(packId) {
        const pack = this.packs.get(packId);
        if (!pack) return;

        for (const member of pack.members) {
            delete member.packId;
            delete member.isPackLeader;
            // Mark as orphan for merging
            member.isOrphan = true;
            member.orphanedAt = performance.now();
        }

        this.packs.delete(packId);

        if (this.config.debugLogging) {
            console.log(`[MonsterSocial] Disbanded pack ${packId}, ${pack.members.length} orphans`);
        }
    },

    disbandSwarm(swarmId) {
        const swarm = this.swarms.get(swarmId);
        if (!swarm) return;

        for (const member of swarm.members) {
            delete member.swarmId;
        }

        this.swarms.delete(swarmId);
    },

    disbandCommandChain(leaderId, leaderDied = true) {
        const chain = this.commandChains.get(leaderId);
        if (!chain) return;

        // Process followers based on leader death trigger
        for (const follower of chain.followers) {
            delete follower.commandedBy;

            if (leaderDied && follower.ai) {
                // Determine reaction based on tier
                const tierOrder = { 'TIER_3': 0, 'TIER_2': 1, 'TIER_1': 2, 'ELITE': 3 };
                const followerTier = tierOrder[follower.tier] || 0;

                if (followerTier <= 1) {
                    // Weak minions (TIER_3, TIER_2) panic and flee
                    follower.ai._changeState(AI_STATES.PANICKED);
                    if (typeof showStatusText === 'function') {
                        showStatusText(follower, 'BROKEN!', '#FF6B6B');
                    }
                    if (this.config.debugLogging) {
                        console.log(`[MonsterSocial] ${follower.name} panicked (leader died)`);
                    }
                } else {
                    // Strong guards (TIER_1, ELITE) become enraged
                    follower.ai._changeState(AI_STATES.ENRAGED);
                    if (typeof showStatusText === 'function') {
                        showStatusText(follower, 'ENRAGED!', '#FF4444');
                    }
                    if (this.config.debugLogging) {
                        console.log(`[MonsterSocial] ${follower.name} enraged (leader died)`);
                    }
                }
            }
        }

        this.commandChains.delete(leaderId);

        if (this.config.debugLogging) {
            console.log(`[MonsterSocial] Disbanded command chain ${leaderId}`);
        }
    },

/**
     * Check if one enemy should avoid another
     * @param {Object} enemy1 - The enemy checking
     * @param {Object} enemy2 - The other enemy
     * @returns {boolean} True if enemy1 should avoid enemy2
     */
    shouldAvoid(enemy1, enemy2) {
        if (!enemy1 || !enemy2) return false;
        if (enemy1 === enemy2) return false;
        
        // Same pack members don't avoid each other
        if (enemy1.packId && enemy1.packId === enemy2.packId) {
            return false;
        }
        
        // Same swarm members don't avoid each other
        if (enemy1.swarmId && enemy1.swarmId === enemy2.swarmId) {
            return false;
        }
        
        // Commanded followers don't avoid their leader
        if (enemy1.commandedBy === enemy2) {
            return false;
        }
        
        // Otherwise, enemies avoid each other to prevent stacking
        return true;
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    cleanup() {
        this.packs.clear();
        this.swarms.clear();
        this.commandChains.clear();
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.MonsterSocialSystem = MonsterSocialSystem;
window.MonsterSocialSystem = MonsterSocialSystem;

console.log('[MonsterSocialSystem] Loaded');