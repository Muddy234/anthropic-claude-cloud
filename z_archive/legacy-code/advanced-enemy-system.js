// ============================================================
// ADVANCED ENEMY SYSTEM - DEPRECATED
// ============================================================
//
// THIS FILE IS DEPRECATED AND NO LONGER USED.
//
// The functionality has been split into separate, more advanced files:
//
// 1. MONSTER TIERS: js/data/monster-tiers.js
//    - Comprehensive 7-category tier system
//    - Categories: perception, movement, combat, defense, social, positioning, intelligence
//    - Tiers: TIER_3 (fodder), TIER_2 (standard), TIER_1 (veteran), ELITE, BOSS
//
// 2. ENEMY AI: js/systems/enemy-ai.js
//    - Simplified 5-state machine: IDLE, ALERT, COMBAT, SEARCHING, FOLLOWING
//    - Windup as substep within COMBAT (not separate state)
//    - Status modifiers (panicked, enraged) replace old states
//    - Attack token system for coordinated attacks
//
// 3. GROUP SYSTEM: js/systems/monster-social-system.js
//    - Unified GroupSystem with ID-only references
//    - Real-time cleanup via onEnemyDeath() hook
//    - Pack, swarm, and command hierarchies
//    - Defensive programming with null checks
//
// MIGRATION NOTES:
// ----------------
// - Old tier naming (TIER_1 to TIER_5) changed to (TIER_3, TIER_2, TIER_1, ELITE, BOSS)
//   where TIER_3 is fodder and BOSS is the strongest
// - Old states (IDLE, PATROL, CHASE, ATTACK, FLEE, SEARCH) consolidated to:
//   IDLE, ALERT, COMBAT (includes chase/attack), SEARCHING, FOLLOWING
// - MonsterSocialSystem singleton replaced with GroupSystem
// - Use GroupSystem.onEnemyDeath(enemyId) for real-time cleanup
//
// To load the modern system, use the individual script files:
// <script src="js/data/monster-tiers.js"></script>
// <script src="js/systems/enemy-ai.js"></script>
// <script src="js/systems/monster-social-system.js"></script>
//
// ============================================================

console.warn('[advanced-enemy-system.js] DEPRECATED: Use monster-tiers.js, enemy-ai.js, and monster-social-system.js instead');

// Legacy exports for any code still referencing these (should be removed)
if (typeof window !== 'undefined') {
    // These should not be used - redirect to modern systems
    window.LEGACY_ADVANCED_ENEMY_SYSTEM_LOADED = true;
}
