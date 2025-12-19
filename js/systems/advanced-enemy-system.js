// ============================================================
// ADVANCED ENEMY SYSTEM (Combined AI, Tiers, & Social)
// Includes: monster-tiers.js, enemy-ai.js, monster-social-system.js
// ============================================================

// ============================================================
// PART 1: MONSTER TIERS (Data)
// ============================================================

const MONSTER_TIERS = {
      // TIER 1: BASIC ENEMIES (Floors 1-2)
      TIER_1: {
                id: 'tier_1',
                name: 'Basic',
                floors: [1, 2],
                baseStats: {
                              hp: 30,
                              damage: 5,
                              defense: 0,
                              exp: 10
                },
                monsters: [
                              'goblin_grunt',
                              'slime_green',
                              'rat_giant',
                              'bat_cave'
                          ]
      },
      // TIER 2: INTERMEDIATE ENEMIES (Floors 3-4)
      TIER_2: {
                id: 'tier_2',
                name: 'Intermediate',
                floors: [3, 4],
                baseStats: {
                              hp: 60,
                              damage: 12,
                              defense: 2,
                              exp: 25
                },
                monsters: [
                              'goblin_warrior',
                              'slime_blue',
                              'skeleton_warrior',
                              'spider_giant'
                          ]
      },
      // TIER 3: ADVANCED ENEMIES (Floors 5-7)
      TIER_3: {
                id: 'tier_3',
                name: 'Advanced',
                floors: [5, 6, 7],
                baseStats: {
                              hp: 120,
                              damage: 25,
                              defense: 5,
                              exp: 60
                },
                monsters: [
                              'goblin_chieftain',
                              'slime_red',
                              'skeleton_knight',
                              'ghost_vengeful'
                          ]
      },
      // TIER 4: ELITE ENEMIES (Floors 8-9)
      TIER_4: {
                id: 'tier_4',
                name: 'Elite',
                floors: [8, 9],
                baseStats: {
                              hp: 250,
                              damage: 45,
                              defense: 10,
                              exp: 150
                },
                monsters: [
                              'goblin_king',
                              'slime_king',
                              'lich_lesser',
                              'demon_imp'
                          ]
      },
      // TIER 5: LEGENDARY ENEMIES (Floor 10+)
      TIER_5: {
                id: 'tier_5',
                name: 'Legendary',
                floors: [10],
                baseStats: {
                              hp: 500,
                              damage: 80,
                              defense: 20,
                              exp: 400
                },
                monsters: [
                              'dragon_young',
                              'demon_lord',
                              'lich_lord'
                          ]
      }
};

const TIER_MODIFIERS = {
      hp: 1.0,
      damage: 1.0,
      defense: 1.0,
      exp: 1.0
};

// ============================================================
// PART 2: MONSTER SOCIAL SYSTEM
// ============================================================

const SOCIAL_BEHAVIORS = {
      SOLITARY: 'solitary',       // Works alone
      PACK: 'pack',              // Works in small groups, coordinates attacks
      SWARM: 'swarm',            // Large groups, overwhelms target
      LEADER: 'leader',          // Buffs nearby allies
      MINION: 'minion',          // Follows leader, gets buffs
      SUPPORT: 'support'         // Heals or buffs allies from distance
};

const PACK_TACTICS = {
      FLANK: 'flank',            // Try to surround target
      PROTECT: 'protect',        // Block path to leader/support
      COORDINATED_STRIKE: 'strike', // Attack together
      SCATTER: 'scatter'         // Flee in different directions
};

class MonsterSocialSystem {
      constructor(gameState) {
                this.gameState = gameState;
                this.groups = new Map(); // Group ID -> { members: [], type: '', leader: null }
          this.nextGroupId = 1;
                this.socialRange = 8; // Tiles within which social behaviors apply
      }

    /**
       * Assigns initial social groups to spawned monsters
       */
    initializeSocialGroups(monsters) {
              // Group monsters by room first
          const roomGroups = this.groupMonstersByRoom(monsters);

          for (const [roomId, roomMonsters] of Object.entries(roomGroups)) {
                        this.assignBehaviorsToRoom(roomMonsters);
          }
    }

    /**
       * Updates social behaviors for all active monsters
       */
    update() {
              if (!this.gameState.monsters) return;

          // Process each group
          for (const [groupId, group] of this.groups) {
                        this.updateGroupTactics(group);
          }

          // Individual updates for social interactions
          this.gameState.monsters.forEach(monster => {
                        if (!monster.isDead()) {
                                          this.updateIndividualSocialBehavior(monster);
                        }
          });
    }

    /**
       * Groups monsters by their room ID
       */
    groupMonstersByRoom(monsters) {
              const rooms = {};
              monsters.forEach(monster => {
                            if (monster.data && monster.data.roomId) {
                                              if (!rooms[monster.data.roomId]) {
                                                                    rooms[monster.data.roomId] = [];
                                              }
                                              rooms[monster.data.roomId].push(monster);
                            }
              });
              return rooms;
    }

    /**
       * Assigns social behaviors based on monster composition in a room
       */
    assignBehaviorsToRoom(monsters) {
              if (monsters.length < 2) return; // Need at least 2 for social behavior

          // Check for specific compositions
          const types = monsters.map(m => m.type);

          // 1. Leader + Minions (e.g., Orc Shaman + Orcs)
          const leaderIndex = monsters.findIndex(m => this.isLeaderType(m.type));
              if (leaderIndex !== -1) {
                            this.createGroup(monsters, SOCIAL_BEHAVIORS.LEADER, leaderIndex);
                            return;
              }

          // 2. Pack (e.g., Wolves, Goblins)
          if (this.isPackType(monsters[0].type)) {
                        this.createGroup(monsters, SOCIAL_BEHAVIORS.PACK);
                        return;
          }

          // 3. Swarm (e.g., Rats, Spiders)
          if (this.isSwarmType(monsters[0].type)) {
                        this.createGroup(monsters, SOCIAL_BEHAVIORS.SWARM);
                        return;
          }
    }

    createGroup(monsters, behaviorType, leaderIndex = -1) {
              const groupId = this.nextGroupId++;
              const group = {
                            id: groupId,
                            type: behaviorType,
                            members: monsters.map(m => m.id),
                            leaderId: leaderIndex !== -1 ? monsters[leaderIndex].id : null,
                            targetId: null,
                            tactic: null
              };

          this.groups.set(groupId, group);

          // Assign data to individual monsters
          monsters.forEach((m, index) => {
                        m.socialGroupId = groupId;
                        m.socialBehavior = index === leaderIndex ? SOCIAL_BEHAVIORS.LEADER : 
                                                        (behaviorType === SOCIAL_BEHAVIORS.LEADER ? SOCIAL_BEHAVIORS.MINION : behaviorType);
          });

          // console.log(`Created monster group ${groupId} of type ${behaviorType} with ${monsters.length} members`);
    }

    updateGroupTactics(group) {
              const members = group.members
                  .map(id => this.gameState.monsters.find(m => m.id === id))
                  .filter(m => m && !m.isDead());

          if (members.length === 0) {
                        this.groups.delete(group.id);
                        return;
          }

          // Determine if group is in combat
          const engagedMembers = members.filter(m => m.isEngaged());
              if (engagedMembers.length === 0) {
                            group.targetId = null;
                            group.tactic = null;
                            return;
              }

          // Set shared target (usually player)
          group.targetId = 'player'; // Simplified for now

          // Choose tactic based on group type and status
          switch (group.type) {
            case SOCIAL_BEHAVIORS.PACK:
                              this.updatePackTactics(group, members);
                              break;
            case SOCIAL_BEHAVIORS.SWARM:
                              this.updateSwarmTactics(group, members);
                              break;
            case SOCIAL_BEHAVIORS.LEADER:
                              this.updateLeaderTactics(group, members);
                              break;
          }
    }

    updatePackTactics(group, members) {
              // Pack logic: Try to surround or focus fire
          const healthyMembers = members.filter(m => m.hp > m.maxHp * 0.3);

          if (healthyMembers.length >= 2) {
                        group.tactic = PACK_TACTICS.FLANK;

                  // Assign flanking positions in AI update
                  // This just sets the high-level state
          } else {
                        group.tactic = PACK_TACTICS.SCATTER;
          }
    }

    updateSwarmTactics(group, members) {
              // Swarm logic: Pure aggression unless nearly wiped out
          group.tactic = PACK_TACTICS.COORDINATED_STRIKE;
    }

    updateLeaderTactics(group, members) {
              const leader = members.find(m => m.id === group.leaderId);

          if (leader && !leader.isDead()) {
                        group.tactic = PACK_TACTICS.PROTECT;
                        // Minions should stay between leader and player
          } else {
                        // Leader dead, minions enrage or flee
                  group.tactic = Math.random() > 0.5 ? PACK_TACTICS.COORDINATED_STRIKE : PACK_TACTICS.SCATTER;
          }
    }

    updateIndividualSocialBehavior(monster) {
              if (!monster.socialGroupId) return;

          const group = this.groups.get(monster.socialGroupId);
              if (!group) return;

          // Apply passive buffs based on nearby group members
          const nearbyAllies = this.getNearbyAllies(monster, group);

          if (nearbyAllies.length > 0) {
                        this.applySocialBuffs(monster, nearbyAllies, group.type);
          }
    }

    getNearbyAllies(monster, group) {
              return group.members
                  .map(id => this.gameState.monsters.find(m => m.id === id))
                  .filter(m => m && m.id !== monster.id && !m.isDead() && 
                                             Math.abs(m.x - monster.x) + Math.abs(m.y - monster.y) <= this.socialRange);
    }

    applySocialBuffs(monster, allies, type) {
              // Reset temporary social buffs first
          monster.stats.socialDefenseMod = 0;
              monster.stats.socialDamageMod = 0;

          switch (type) {
            case SOCIAL_BEHAVIORS.PACK:
                              // Pack bonus: +damage for each nearby ally
                      monster.stats.socialDamageMod = allies.length * 1;
                              break;

            case SOCIAL_BEHAVIORS.SWARM:
                              // Swarm bonus: +speed/evasion for density
                      // Implementation depends on core stat system
                      break;

            case SOCIAL_BEHAVIORS.LEADER:
                              if (monster.socialBehavior === SOCIAL_BEHAVIORS.MINION) {
                                                    // Minions get defense bonus near leader
                                  const leaderNearby = allies.some(m => m.id === this.groups.get(monster.socialGroupId).leaderId);
                                                    if (leaderNearby) {
                                                                              monster.stats.socialDefenseMod = 3;
                                                    }
                              } else if (monster.socialBehavior === SOCIAL_BEHAVIORS.LEADER) {
                                                    // Leader heals slightly if protected by minions
                                  // Logic here
                              }
                              break;
          }
    }

    // Helper helpers
    isLeaderType(type) {
              return ['shaman', 'necromancer', 'captain', 'king'].some(t => type.includes(t));
    }

    isPackType(type) {
              return ['wolf', 'goblin', 'bandit'].some(t => type.includes(t));
    }

    isSwarmType(type) {
              return ['rat', 'spider', 'bee', 'slime'].some(t => type.includes(t));
    }
}

// ============================================================
// PART 3: ENEMY AI SYSTEM
// ============================================================

const AI_STATES = {
      IDLE: 'idle',
      PATROL: 'patrol',
      CHASE: 'chase',
      ATTACK: 'attack',
      FLEE: 'flee',
      SEARCH: 'search'
};

const AI_PERSONALITIES = {
      AGGRESSIVE: 'aggressive', // Always chases, fights to death
      CAUTIOUS: 'cautious',     // Flees at low health, uses cover
      HIT_AND_RUN: 'hit_run',   // Attacks then retreats
      GUARDIAN: 'guardian',     // Stays near spawn/objective
      AMBUSH: 'ambush'          // Waits for player to get close
};

class EnemyAI {
      constructor(monster, gameState) {
                this.monster = monster;
                this.gameState = gameState;
                this.state = AI_STATES.IDLE;
                this.target = null;
                this.path = [];
                this.lastSeenPlayerPos = null;
                this.alertLevel = 0; // 0-100

          // AI Settings based on monster type/tier
          this.visionRange = monster.stats.visionRange || 8;
                this.personality = this.getPersonalityForType(monster.type);
                this.homePos = { x: monster.x, y: monster.y };

          // Timers
          this.decisionTimer = 0;
                this.decisionInterval = 10 + Math.random() * 10; // Randomize to prevent synchronous updates
          this.searchTimer = 0;
      }

    getPersonalityForType(type) {
              if (type.includes('goblin')) return AI_PERSONALITIES.HIT_AND_RUN;
              if (type.includes('boss') || type.includes('king')) return AI_PERSONALITIES.AGGRESSIVE;
              if (type.includes('guard') || type.includes('golem')) return AI_PERSONALITIES.GUARDIAN;
              if (type.includes('spider') || type.includes('snake')) return AI_PERSONALITIES.AMBUSH;
              return AI_PERSONALITIES.AGGRESSIVE; // Default
    }

    update() {
              if (this.monster.isDead()) return;

          // Decrement timers
          if (this.decisionTimer > 0) this.decisionTimer--;

          // Perception Check
          const canSeePlayer = this.checkVision();
              const distToPlayer = this.getDistanceToPlayer();

          // State Transitions
          this.updateState(canSeePlayer, distToPlayer);

          // Execute State Behavior
          if (this.decisionTimer <= 0) {
                        this.executeBehavior();
                        this.decisionTimer = this.decisionInterval;
          }
    }

    checkVision() {
              // Simple distance check first
          const player = this.gameState.player;
              if (!player) return false;

          const dist = Math.abs(player.x - this.monster.x) + Math.abs(player.y - this.monster.y);
              if (dist > this.visionRange) return false;

          // TODO: Line of sight check using raycasting or Bresenham's
          // For now assume if close enough, can see
          return true;
    }

    getDistanceToPlayer() {
              const player = this.gameState.player;
              if (!player) return 999;
              return Math.abs(player.x - this.monster.x) + Math.abs(player.y - this.monster.y);
    }

    updateState(canSeePlayer, distToPlayer) {
              const player = this.gameState.player;

          // Update alert level
          if (canSeePlayer) {
                        this.alertLevel = Math.min(100, this.alertLevel + 20);
                        this.lastSeenPlayerPos = { x: player.x, y: player.y };
          } else {
                        this.alertLevel = Math.max(0, this.alertLevel - 1);
          }

          // Flee Check (HP Low + Cautious/Hit&Run)
          if (this.monster.hp < this.monster.maxHp * 0.25 && 
                          (this.personality === AI_PERSONALITIES.CAUTIOUS || this.personality === AI_PERSONALITIES.HIT_AND_RUN)) {
                        this.state = AI_STATES.FLEE;
                        return;
          }

          // Combat State Logic
          if (canSeePlayer) {
                        if (distToPlayer <= 1) { // Melee range
                            this.state = AI_STATES.ATTACK;
                        } else {
                                          this.state = AI_STATES.CHASE;
                        }
          } else if (this.lastSeenPlayerPos && this.state === AI_STATES.CHASE) {
                        // Lost sight, switch to search
                  this.state = AI_STATES.SEARCH;
                        this.searchTimer = 50; // Search for a few turns
          } else if (this.state === AI_STATES.SEARCH) {
                        this.searchTimer--;
                        if (this.searchTimer <= 0) {
                                          this.state = AI_STATES.PATROL; // Or return home
                        }
          } else {
                        // Default idle/patrol
                  if (this.state !== AI_STATES.PATROL && Math.random() < 0.05) {
                                    this.state = AI_STATES.PATROL;
                  } else if (this.state === AI_STATES.PATROL && Math.random() < 0.05) {
                                    this.state = AI_STATES.IDLE;
                  }
          }
    }

    executeBehavior() {
              switch (this.state) {
                case AI_STATES.IDLE:
                                  // Maybe randomly turn or emote
                      break;

                case AI_STATES.PATROL:
                                  this.behaviorPatrol();
                                  break;

                case AI_STATES.CHASE:
                                  this.behaviorChase();
                                  break;

                case AI_STATES.ATTACK:
                                  this.behaviorAttack();
                                  break;

                case AI_STATES.FLEE:
                                  this.behaviorFlee();
                                  break;

                case AI_STATES.SEARCH:
                                  this.behaviorSearch();
                                  break;
              }
    }

    // --- BEHAVIOR IMPLEMENTATIONS ---

    behaviorChase() {
              const player = this.gameState.player;
              if (!player) return;

          // Basic pathfinding towards player
          // Check for social tactics first
          let targetX = player.x;
              let targetY = player.y;

          if (this.monster.socialGroupId) {
                        const group = this.gameState.socialSystem.groups.get(this.monster.socialGroupId);
                        if (group && group.tactic === PACK_TACTICS.FLANK) {
                                          // Try to move to side of player instead of direct
                            // Simplified flanking logic
                            if (this.monster.id % 2 === 0) {
                                                  targetX = player.x + 2; // Try right flank
                            } else {
                                                  targetX = player.x - 2; // Try left flank
                            }
                        }
          }

          this.moveTowards(targetX, targetY);
    }

    behaviorAttack() {
              // Attack logic is usually handled by combat system, 
          // but AI can decide WHICH attack to use here

          // Example: Cooldown check, special ability check
          this.monster.tryAttack(this.gameState.player);
    }

    behaviorFlee() {
              const player = this.gameState.player;
              // Move away from player
          const dx = this.monster.x - player.x;
              const dy = this.monster.y - player.y;

          const targetX = this.monster.x + Math.sign(dx);
              const targetY = this.monster.y + Math.sign(dy);

          this.moveTowards(targetX, targetY);
    }

    behaviorPatrol() {
              // Random wander near home pos
          if (Math.random() < 0.5) {
                        const dx = Math.floor(Math.random() * 3) - 1;
                        const dy = Math.floor(Math.random() * 3) - 1;
                        this.moveTowards(this.monster.x + dx, this.monster.y + dy);
          }
    }

    behaviorSearch() {
              if (this.lastSeenPlayerPos) {
                            this.moveTowards(this.lastSeenPlayerPos.x, this.lastSeenPlayerPos.y);

                  // If arrived at last seen pos, clear it
                  if (this.monster.x === this.lastSeenPlayerPos.x && this.monster.y === this.lastSeenPlayerPos.y) {
                                    this.lastSeenPlayerPos = null;
                  }
              } else {
                            this.behaviorPatrol(); // Wander if lost trace
              }
    }

    moveTowards(targetX, targetY) {
              // Delegate to movement system or simple A* here
          // Assuming simple step for now:
          const dx = Math.sign(targetX - this.monster.x);
              const dy = Math.sign(targetY - this.monster.y);

          if (dx !== 0 || dy !== 0) {
                        // Try diagonal first? Or one axis?
                  // This needs integration with collision system
                  this.gameState.moveEntity(this.monster, dx, dy);
          }
    }
}
