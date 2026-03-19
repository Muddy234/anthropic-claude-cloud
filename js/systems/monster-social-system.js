// ============================================================================
// GROUP SYSTEM - Unified Monster Social Mechanics
// ============================================================================
// Simplified, reliable group management using ID-only references.
// Handles packs, swarms, and command hierarchies through a single Group concept.
//
// Key principles:
// 1. ID-only storage - Never store object references
// 2. Real-time cleanup via onEnemyDeath() hook
// 3. Defensive programming - Null checks everywhere
// 4. Single unified Group concept
// ============================================================================

const GroupSystem = {
    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    // Main group storage: groupId -> GroupData
    groups: new Map(),

    // Reverse lookup: enemyId -> groupId (for fast membership checks)
    memberToGroup: new Map(),

    // Configuration
    config: {
        packRadius: 5,
        swarmRadius: 3,
        commandRadius: 8,
        maxGroupSize: 8,
        minPackSize: 2,
        minSwarmSize: 3,

        // Bonuses by group size
        bonuses: {
            2: { damage: 0.05, defense: 0.05, attackSpeed: 0, evasion: 0 },
            3: { damage: 0.10, defense: 0.10, attackSpeed: 0.10, evasion: 0.05 },
            4: { damage: 0.15, defense: 0.10, attackSpeed: 0.15, evasion: 0.07 },
            5: { damage: 0.20, defense: 0.15, attackSpeed: 0.20, evasion: 0.10 },
            6: { damage: 0.25, defense: 0.15, attackSpeed: 0.25, evasion: 0.12 },
            7: { damage: 0.28, defense: 0.18, attackSpeed: 0.28, evasion: 0.13 },
            8: { damage: 0.30, defense: 0.20, attackSpeed: 0.30, evasion: 0.15 }
        },

        debugLogging: false
    },

    // Internal counter for unique group IDs
    _groupIdCounter: 0,

    // ========================================================================
    // GROUP DATA STRUCTURE
    // ========================================================================
    // GroupData = {
    //     id: string,              // Unique group identifier
    //     memberIds: Set<string>,  // Set of enemy IDs (never objects)
    //     leaderId: string|null,   // ID of group leader
    //     leaderTier: number,      // Cached tier of leader for succession
    //     element: string,         // Shared element affinity
    //     formationType: string,   // 'pack', 'swarm', or 'command'
    //     lastCommand: object|null // Last issued command
    // }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    init() {
        this.groups.clear();
        this.memberToGroup.clear();
        this._groupIdCounter = 0;
        this._log('GroupSystem initialized');
    },

    initialize() {
        this.init();
        this.scanAndFormGroups();
    },

    // ========================================================================
    // CORE METHODS
    // ========================================================================

    /**
     * Add an enemy to a group. Creates new group if groupId not provided.
     * @param {string} enemyId - The enemy's unique ID
     * @param {string|null} groupId - Optional existing group to join
     * @param {Object} options - Optional settings (element, formationType)
     * @returns {string} The group ID the enemy was added to
     */
    joinGroup(enemyId, groupId = null, options = {}) {
        if (!enemyId) return null;

        // Already in a group? Remove first
        if (this.memberToGroup.has(enemyId)) {
            this.leaveGroup(enemyId);
        }

        // Join existing group or create new
        if (groupId && this.groups.has(groupId)) {
            const group = this.groups.get(groupId);

            // Check max size
            if (group.memberIds.size >= this.config.maxGroupSize) {
                this._log(`Cannot join group ${groupId}: max size reached`);
                return null;
            }

            group.memberIds.add(enemyId);
            this.memberToGroup.set(enemyId, groupId);

            // Update leader if needed
            this._updateLeader(groupId);

            this._log(`${enemyId} joined group ${groupId}`);
            return groupId;
        } else {
            // Create new group
            const newGroupId = `group_${++this._groupIdCounter}`;
            const enemy = this._resolveEnemy(enemyId);

            const groupData = {
                id: newGroupId,
                memberIds: new Set([enemyId]),
                leaderId: enemyId,
                leaderTier: enemy ? this._getTierOrder(enemy.tier) : 0,
                element: options.element || (enemy ? enemy.element : null) || 'physical',
                formationType: options.formationType || 'pack',
                lastCommand: null
            };

            this.groups.set(newGroupId, groupData);
            this.memberToGroup.set(enemyId, newGroupId);

            this._log(`Created new group ${newGroupId} with ${enemyId}`);
            return newGroupId;
        }
    },

    /**
     * Remove an enemy from their group. Called on death or disbanding.
     * @param {string} enemyId - The enemy's unique ID
     */
    leaveGroup(enemyId) {
        if (!enemyId) return;

        const groupId = this.memberToGroup.get(enemyId);
        if (!groupId) return;

        const group = this.groups.get(groupId);
        if (!group) {
            this.memberToGroup.delete(enemyId);
            return;
        }

        // Remove from group
        group.memberIds.delete(enemyId);
        this.memberToGroup.delete(enemyId);

        this._log(`${enemyId} left group ${groupId}`);

        // Check if group should disband
        const minSize = group.formationType === 'swarm' ?
            this.config.minSwarmSize : this.config.minPackSize;

        if (group.memberIds.size < minSize) {
            this._disbandGroup(groupId);
        } else if (group.leaderId === enemyId) {
            // Leader left - need succession
            this._updateLeader(groupId);
        }
    },

    /**
     * CRITICAL: Hook for real-time death cleanup. Call from combat system.
     * @param {string} enemyId - The dying enemy's ID
     */
    onEnemyDeath(enemyId) {
        if (!enemyId) return;

        const groupId = this.memberToGroup.get(enemyId);
        if (!groupId) return;

        const group = this.groups.get(groupId);
        const wasLeader = group && group.leaderId === enemyId;

        // Remove from group
        this.leaveGroup(enemyId);

        // Handle leader death reactions
        if (wasLeader && group && group.memberIds.size > 0) {
            this._handleLeaderDeath(groupId);
        }

        this._log(`Enemy ${enemyId} died, removed from group ${groupId}`);
    },

    /**
     * Get all bonuses for an enemy based on their group membership.
     * @param {string} enemyId - The enemy's ID
     * @returns {Object} Bonuses { damage, defense, attackSpeed, evasion }
     */
    getBonuses(enemyId) {
        const defaultBonuses = { damage: 0, defense: 0, attackSpeed: 0, evasion: 0 };

        if (!enemyId) return defaultBonuses;

        const groupId = this.memberToGroup.get(enemyId);
        if (!groupId) return defaultBonuses;

        const group = this.groups.get(groupId);
        if (!group) return defaultBonuses;

        // Count only LIVING members
        const liveCount = this._getLiveMemberCount(groupId);
        if (liveCount === 0) return defaultBonuses;

        // Clamp to configured bonus tiers
        const bonusTier = Math.min(liveCount, 8);
        return this.config.bonuses[bonusTier] || defaultBonuses;
    },

    /**
     * Issue a command from a leader to their group.
     * @param {string} leaderId - The commanding leader's ID
     * @param {string} commandType - 'attack', 'defend', 'retreat', 'hold'
     * @param {string|null} targetId - Optional target for the command
     * @returns {Array<string>} IDs of enemies that received the command
     */
    issueCommand(leaderId, commandType, targetId = null) {
        if (!leaderId) return [];

        const groupId = this.memberToGroup.get(leaderId);
        if (!groupId) return [];

        const group = this.groups.get(groupId);
        if (!group || group.leaderId !== leaderId) {
            this._log(`${leaderId} tried to command but is not the leader`);
            return [];
        }

        const commanded = [];
        const target = targetId ? this._resolveEnemy(targetId) || this._resolvePlayer() : null;

        for (const memberId of group.memberIds) {
            if (memberId === leaderId) continue;

            const follower = this._resolveEnemy(memberId);
            if (!follower || follower.hp <= 0 || !follower.ai) continue;

            // Apply command based on type
            switch (commandType) {
                case 'attack':
                    follower.ai.target = target;
                    if (typeof follower.ai.setState === 'function') {
                        follower.ai.setState('combat');
                    }
                    break;

                case 'defend':
                    const leader = this._resolveEnemy(leaderId);
                    if (leader) {
                        follower.ai.defendPosition = { x: leader.gridX, y: leader.gridY };
                    }
                    if (typeof follower.ai.setState === 'function') {
                        follower.ai.setState('idle');
                    }
                    break;

                case 'retreat':
                    // Trigger flee behavior
                    follower.isFleeing = true;
                    if (typeof follower.ai.setState === 'function') {
                        follower.ai.setState('combat'); // Combat handles flee internally
                    }
                    break;

                case 'hold':
                    follower.ai.target = null;
                    if (typeof follower.ai.setState === 'function') {
                        follower.ai.setState('idle');
                    }
                    break;
            }

            commanded.push(memberId);
        }

        // Record command
        group.lastCommand = {
            type: commandType,
            targetId: targetId,
            time: performance.now()
        };

        this._log(`${leaderId} issued ${commandType} to ${commanded.length} followers`);
        return commanded;
    },

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    /**
     * Get the group an enemy belongs to.
     * @param {string} enemyId - The enemy's ID
     * @returns {Object|null} The group data or null
     */
    getGroup(enemyId) {
        if (!enemyId) return null;
        const groupId = this.memberToGroup.get(enemyId);
        return groupId ? this.groups.get(groupId) : null;
    },

    /**
     * Get all member IDs for a group (only living members).
     * @param {string} groupId - The group's ID
     * @returns {Array<string>} Array of enemy IDs
     */
    getLiveMembers(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return [];

        const liveMembers = [];
        for (const memberId of group.memberIds) {
            const enemy = this._resolveEnemy(memberId);
            if (enemy && enemy.hp > 0) {
                liveMembers.push(memberId);
            }
        }
        return liveMembers;
    },

    /**
     * Check if an enemy is a group leader.
     * @param {string} enemyId - The enemy's ID
     * @returns {boolean}
     */
    isLeader(enemyId) {
        const group = this.getGroup(enemyId);
        return group && group.leaderId === enemyId;
    },

    /**
     * Get the leader of an enemy's group.
     * @param {string} enemyId - The enemy's ID
     * @returns {Object|null} The leader enemy object or null
     */
    getLeader(enemyId) {
        const group = this.getGroup(enemyId);
        if (!group || !group.leaderId) return null;
        return this._resolveEnemy(group.leaderId);
    },

    /**
     * Check if two enemies are in the same group (allies).
     * @param {string} enemyId1 - First enemy ID
     * @param {string} enemyId2 - Second enemy ID
     * @returns {boolean}
     */
    areAllies(enemyId1, enemyId2) {
        if (!enemyId1 || !enemyId2) return false;
        const group1 = this.memberToGroup.get(enemyId1);
        const group2 = this.memberToGroup.get(enemyId2);
        return group1 && group1 === group2;
    },

    /**
     * Check if one enemy should avoid another.
     * @param {string} enemyId1 - First enemy ID
     * @param {string} enemyId2 - Second enemy ID
     * @returns {boolean} True if they should avoid each other
     */
    shouldAvoid(enemyId1, enemyId2) {
        if (!enemyId1 || !enemyId2) return false;
        if (enemyId1 === enemyId2) return false;

        // Same group members don't avoid each other
        if (this.areAllies(enemyId1, enemyId2)) return false;

        // Otherwise, avoid to prevent stacking
        return true;
    },

    // ========================================================================
    // ALERT SYSTEM
    // ========================================================================

    /**
     * Alert all allies in range about a threat.
     * @param {string} alerterId - The alerting enemy's ID
     * @param {Object|null} target - The target to alert about
     * @param {string} alertType - 'sight' or 'shout'
     * @returns {Array<string>} IDs of alerted enemies
     */
    alertAllies(alerterId, target, alertType = 'sight') {
        if (!alerterId) return [];

        const alerter = this._resolveEnemy(alerterId);
        if (!alerter || !game?.enemies) return [];

        const alertRange = alertType === 'shout' ? 15 : 8;
        const alerted = [];

        for (const enemy of game.enemies) {
            const enemyId = this._getEnemyId(enemy);
            if (enemyId === alerterId || enemy.hp <= 0) continue;

            // Check range
            const dist = this._getDistance(alerter, enemy);
            if (dist > alertRange) continue;

            // Check if can receive alert
            if (!this._canReceiveAlert(enemy, alerter, alertType)) continue;

            // Apply alert
            if (enemy.ai) {
                enemy.ai.alertedBy = alerterId;
                enemy.ai.lastKnownTargetPos = target ?
                    { x: target.gridX, y: target.gridY } : null;

                if (typeof enemy.ai.setState === 'function') {
                    enemy.ai.setState('alert');
                }
            }

            alerted.push(enemyId);
        }

        this._log(`${alerterId} alerted ${alerted.length} allies`);
        return alerted;
    },

    // ========================================================================
    // GROUP FORMATION
    // ========================================================================

    /**
     * Scan all enemies and form appropriate groups.
     */
    scanAndFormGroups() {
        if (!game?.enemies || game.enemies.length === 0) return;

        const unassigned = new Set();
        for (const enemy of game.enemies) {
            if (enemy.hp > 0) {
                unassigned.add(this._getEnemyId(enemy));
            }
        }

        // First pass: Form command chains with leaders
        for (const enemy of game.enemies) {
            if (enemy.hp <= 0) continue;
            if (this._canLead(enemy)) {
                this._formCommandGroup(enemy, unassigned);
            }
        }

        // Second pass: Form packs/swarms from remaining
        this._formGroups(unassigned);

        this._log(`Formed ${this.groups.size} groups`);
    },

    /**
     * Form a command group with a leader.
     */
    _formCommandGroup(leader, unassigned) {
        const leaderId = this._getEnemyId(leader);
        if (!unassigned.has(leaderId)) return;

        const followers = [];

        for (const enemy of game.enemies) {
            const enemyId = this._getEnemyId(enemy);
            if (enemyId === leaderId || !unassigned.has(enemyId)) continue;
            if (enemy.hp <= 0) continue;

            const dist = this._getDistance(leader, enemy);
            if (dist <= this.config.commandRadius && this._canBeCommanded(enemy, leader)) {
                followers.push(enemyId);
            }
        }

        if (followers.length > 0) {
            // Create group
            const groupId = this.joinGroup(leaderId, null, { formationType: 'command' });

            // Add followers
            for (const followerId of followers) {
                this.joinGroup(followerId, groupId);
                unassigned.delete(followerId);
            }

            unassigned.delete(leaderId);
            this._log(`${leaderId} formed command group with ${followers.length} followers`);
        }
    },

    /**
     * Form packs/swarms from unassigned enemies.
     */
    _formGroups(unassigned) {
        const processed = new Set();

        for (const enemyId of unassigned) {
            if (processed.has(enemyId)) continue;

            const enemy = this._resolveEnemy(enemyId);
            if (!enemy || enemy.hp <= 0) continue;

            // Determine group type
            const isSwarm = this._isSwarmType(enemy);
            const radius = isSwarm ? this.config.swarmRadius : this.config.packRadius;
            const minSize = isSwarm ? this.config.minSwarmSize : this.config.minPackSize;

            // Find nearby compatible enemies
            const candidates = [enemyId];
            processed.add(enemyId);

            for (const otherId of unassigned) {
                if (processed.has(otherId)) continue;
                if (candidates.length >= this.config.maxGroupSize) break;

                const other = this._resolveEnemy(otherId);
                if (!other || other.hp <= 0) continue;

                const dist = this._getDistance(enemy, other);
                if (dist <= radius && this._areCompatible(enemy, other)) {
                    candidates.push(otherId);
                    processed.add(otherId);
                }
            }

            // Form group if enough candidates
            if (candidates.length >= minSize) {
                const groupId = this.joinGroup(candidates[0], null, {
                    formationType: isSwarm ? 'swarm' : 'pack'
                });

                for (let i = 1; i < candidates.length; i++) {
                    this.joinGroup(candidates[i], groupId);
                }
            }
        }
    },

    // ========================================================================
    // SWARM COORDINATION
    // ========================================================================

    /**
     * Get coordinated attack position for a swarm member.
     * @param {string} enemyId - The enemy's ID
     * @param {Object} target - The target to surround
     * @returns {Object|null} Position { x, y }
     */
    getSwarmPosition(enemyId, target) {
        if (!enemyId || !target) return null;

        const group = this.getGroup(enemyId);
        if (!group || group.formationType !== 'swarm') return null;

        const liveMembers = this.getLiveMembers(group.id);
        const index = liveMembers.indexOf(enemyId);
        if (index === -1) return null;

        // Calculate surround position
        const angle = (index / liveMembers.length) * Math.PI * 2;
        const radius = 1.5;

        return {
            x: target.gridX + Math.cos(angle) * radius,
            y: target.gridY + Math.sin(angle) * radius
        };
    },

    /**
     * Calculate the center position of a group.
     * @param {string} groupId - The group's ID
     * @returns {Object|null} Position { x, y }
     */
    getGroupCenter(groupId) {
        const liveMembers = this.getLiveMembers(groupId);
        if (liveMembers.length === 0) return null;

        let sumX = 0, sumY = 0;
        let count = 0;

        for (const memberId of liveMembers) {
            const enemy = this._resolveEnemy(memberId);
            if (enemy) {
                sumX += enemy.gridX || enemy.x || 0;
                sumY += enemy.gridY || enemy.y || 0;
                count++;
            }
        }

        if (count === 0) return null;

        return { x: sumX / count, y: sumY / count };
    },

    // ========================================================================
    // INTERNAL HELPERS
    // ========================================================================

    /**
     * Resolve an enemy ID to the actual enemy object.
     * This is the ONLY place we go from ID -> object.
     */
    _resolveEnemy(enemyId) {
        if (!enemyId || !game?.enemies) return null;

        for (const enemy of game.enemies) {
            if (this._getEnemyId(enemy) === enemyId) {
                return enemy;
            }
        }
        return null;
    },

    /**
     * Get the player object.
     */
    _resolvePlayer() {
        return game?.player || null;
    },

    /**
     * Get a consistent ID for an enemy.
     */
    _getEnemyId(enemy) {
        if (!enemy) return null;
        // Prefer explicit id, fallback to generated
        return enemy.id || `${enemy.name}_${enemy.gridX}_${enemy.gridY}`;
    },

    /**
     * Get count of living members in a group.
     */
    _getLiveMemberCount(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return 0;

        let count = 0;
        for (const memberId of group.memberIds) {
            const enemy = this._resolveEnemy(memberId);
            if (enemy && enemy.hp > 0) count++;
        }
        return count;
    },

    /**
     * Update group leader after death or departure.
     */
    _updateLeader(groupId) {
        const group = this.groups.get(groupId);
        if (!group || group.memberIds.size === 0) return;

        // Find best candidate for leader
        let bestId = null;
        let bestTier = -1;
        let bestMaxHp = 0;

        for (const memberId of group.memberIds) {
            const enemy = this._resolveEnemy(memberId);
            if (!enemy || enemy.hp <= 0) continue;

            const tier = this._getTierOrder(enemy.tier);
            const maxHp = enemy.maxHp || enemy.hp || 0;

            if (tier > bestTier || (tier === bestTier && maxHp > bestMaxHp)) {
                bestId = memberId;
                bestTier = tier;
                bestMaxHp = maxHp;
            }
        }

        if (bestId) {
            group.leaderId = bestId;
            group.leaderTier = bestTier;
            this._log(`New leader for ${groupId}: ${bestId}`);
        } else {
            group.leaderId = null;
            group.leaderTier = 0;
        }
    },

    /**
     * Handle reactions when a leader dies.
     */
    _handleLeaderDeath(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return;

        for (const memberId of group.memberIds) {
            const follower = this._resolveEnemy(memberId);
            if (!follower || follower.hp <= 0) continue;

            // Determine reaction based on tier
            const tier = this._getTierOrder(follower.tier);

            if (tier <= 1) {
                // Weak minions (TIER_3, TIER_2) become panicked
                follower.isFeared = true;
                follower.fearDuration = 3000; // 3 seconds

                if (typeof showStatusText === 'function') {
                    showStatusText(follower, 'BROKEN!', '#FF6B6B');
                }
            } else {
                // Strong guards (TIER_1+) become enraged
                follower.isEnraged = true;
                follower.enrageDuration = 5000; // 5 seconds

                if (typeof showStatusText === 'function') {
                    showStatusText(follower, 'ENRAGED!', '#FF4444');
                }
            }
        }
    },

    /**
     * Disband a group completely.
     */
    _disbandGroup(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return;

        // Clear membership for all members
        for (const memberId of group.memberIds) {
            this.memberToGroup.delete(memberId);

            // Mark enemy as orphan for potential regrouping
            const enemy = this._resolveEnemy(memberId);
            if (enemy) {
                enemy.isOrphan = true;
                enemy.orphanedAt = performance.now();
            }
        }

        this.groups.delete(groupId);
        this._log(`Disbanded group ${groupId}`);
    },

    /**
     * Get tier order value.
     */
    _getTierOrder(tier) {
        const order = { 'TIER_3': 0, 'TIER_2': 1, 'TIER_1': 2, 'ELITE': 3, 'BOSS': 4 };
        return order[tier] || 0;
    },

    /**
     * Calculate distance between two entities.
     */
    _getDistance(e1, e2) {
        if (!e1 || !e2) return Infinity;
        const dx = (e1.gridX || e1.x || 0) - (e2.gridX || e2.x || 0);
        const dy = (e1.gridY || e1.y || 0) - (e2.gridY || e2.y || 0);
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Check if an enemy can lead a group.
     */
    _canLead(enemy) {
        if (!enemy) return false;
        const tier = enemy.tier || 'TIER_3';
        return tier === 'ELITE' || tier === 'TIER_1' || tier === 'BOSS';
    },

    /**
     * Check if an enemy can be commanded by a leader.
     */
    _canBeCommanded(follower, leader) {
        if (!follower || !leader) return false;

        const leaderTier = this._getTierOrder(leader.tier);
        const followerTier = this._getTierOrder(follower.tier);

        // Can only command lower tiers
        if (followerTier >= leaderTier) return false;

        // Check element compatibility (opposed elements can't work together)
        if (leader.element && follower.element) {
            if (typeof isOpposed === 'function' && isOpposed(leader.element, follower.element)) {
                return false;
            }
        }

        return true;
    },

    /**
     * Check if an enemy is swarm type.
     */
    _isSwarmType(enemy) {
        if (!enemy) return false;
        const behavior = enemy.behavior?.type || enemy.behaviorType;
        return behavior === 'swarm';
    },

    /**
     * Check if two enemies are compatible for grouping.
     */
    _areCompatible(enemy1, enemy2) {
        if (!enemy1 || !enemy2) return false;

        // Same element is always compatible
        if (enemy1.element === enemy2.element) return true;

        // Check for complementary elements
        if (typeof isComplementary === 'function') {
            return isComplementary(enemy1.element, enemy2.element);
        }

        // Default to compatible
        return true;
    },

    /**
     * Check if an enemy can receive an alert.
     */
    _canReceiveAlert(enemy, alerter, alertType) {
        if (!enemy || !alerter) return false;

        // Different factions can't alert each other
        if (enemy.faction && alerter.faction && enemy.faction !== alerter.faction) {
            return false;
        }

        // Deaf enemies can't hear shouts
        if (alertType === 'shout' && enemy.isDeaf) {
            return false;
        }

        return true;
    },

    /**
     * Debug logging helper.
     */
    _log(message) {
        if (this.config.debugLogging) {
            console.log(`[GroupSystem] ${message}`);
        }
    },

    // ========================================================================
    // UPDATE LOOP (Minimal - most work done via hooks)
    // ========================================================================

    /**
     * Periodic update for orphan regrouping.
     * Call sparingly - most logic uses real-time hooks.
     */
    update(deltaTime) {
        // Only regroup orphans periodically
        this._regroupOrphans();
    },

    /**
     * Try to regroup orphaned enemies into nearby groups.
     */
    _regroupOrphans() {
        if (!game?.enemies) return;

        const now = performance.now();
        const regroupDelay = 2000; // Wait 2s before regrouping

        for (const enemy of game.enemies) {
            if (!enemy.isOrphan || enemy.hp <= 0) continue;
            if (now - (enemy.orphanedAt || 0) < regroupDelay) continue;

            const enemyId = this._getEnemyId(enemy);

            // Look for nearby compatible group
            let bestGroupId = null;
            let bestDistance = Infinity;

            for (const [groupId, group] of this.groups) {
                if (group.memberIds.size >= this.config.maxGroupSize) continue;

                const leader = this._resolveEnemy(group.leaderId);
                if (!leader) continue;

                const dist = this._getDistance(enemy, leader);
                if (dist <= this.config.packRadius && dist < bestDistance) {
                    if (this._areCompatible(enemy, leader)) {
                        bestGroupId = groupId;
                        bestDistance = dist;
                    }
                }
            }

            if (bestGroupId) {
                this.joinGroup(enemyId, bestGroupId);
                delete enemy.isOrphan;
                delete enemy.orphanedAt;
            }
        }
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    cleanup() {
        this.groups.clear();
        this.memberToGroup.clear();
        this._log('Cleanup complete');
    }
};

// ============================================================================
// BACKWARDS COMPATIBILITY LAYER
// ============================================================================
// Provides old MonsterSocialSystem API for gradual migration

const MonsterSocialSystem = {
    // Delegate to GroupSystem
    init: () => GroupSystem.init(),
    initialize: () => GroupSystem.initialize(),
    update: (dt) => GroupSystem.update(dt),
    cleanup: () => GroupSystem.cleanup(),
    scanAndFormGroups: () => GroupSystem.scanAndFormGroups(),

    // Bonus methods
    getPackBonus: (enemy) => {
        const enemyId = GroupSystem._getEnemyId(enemy);
        const bonuses = GroupSystem.getBonuses(enemyId);
        return { damage: bonuses.damage, defense: bonuses.defense };
    },

    getSwarmBonus: (enemy) => {
        const enemyId = GroupSystem._getEnemyId(enemy);
        const bonuses = GroupSystem.getBonuses(enemyId);
        return { attackSpeed: bonuses.attackSpeed, evasion: bonuses.evasion };
    },

    getAllBonuses: (enemy) => {
        const enemyId = GroupSystem._getEnemyId(enemy);
        return GroupSystem.getBonuses(enemyId);
    },

    // Alert methods
    alertAllies: (alerter, target, alertType) => {
        const alerterId = GroupSystem._getEnemyId(alerter);
        return GroupSystem.alertAllies(alerterId, target, alertType);
    },

    // Command methods
    issueCommand: (leader, commandType, target) => {
        const leaderId = GroupSystem._getEnemyId(leader);
        const targetId = target ? GroupSystem._getEnemyId(target) : null;
        return GroupSystem.issueCommand(leaderId, commandType, targetId);
    },

    // Avoidance check
    shouldAvoid: (enemy1, enemy2) => {
        const id1 = GroupSystem._getEnemyId(enemy1);
        const id2 = GroupSystem._getEnemyId(enemy2);
        return GroupSystem.shouldAvoid(id1, id2);
    },

    // Expose config for compatibility
    config: GroupSystem.config
};

// ============================================================================
// EXPORTS
// ============================================================================

window.GroupSystem = GroupSystem;
window.MonsterSocialSystem = MonsterSocialSystem;

console.log('[GroupSystem] Loaded (replaces MonsterSocialSystem)');
