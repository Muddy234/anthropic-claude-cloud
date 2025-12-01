// === LEFT-CLICK SYSTEM - DEFAULT ACTION HANDLER ===
// Handles left-click movement and default interactions (OSRS-style)

let leftClickSystemInitialized = false;

// Modifier key state tracking
const clickModifiers = {
    shift: false,
    ctrl: false,
    alt: false
};

// Pending action system - for actions that require reaching the target first
window.pendingAction = {
    active: false,
    target: null,
    targetType: null,
    action: null,
    checkInterval: null
};

// ==================== INITIALIZATION ====================

function initLeftClickSystem() {
    if (leftClickSystemInitialized) return;
    console.log('Initializing left-click system...');
    
    const canvas = document.getElementById('gameCanvas') || 
                   document.getElementById('canvas') || 
                   document.querySelector('canvas');
    
    if (!canvas) {
        console.error('Canvas not found for left-click system!');
        return;
    }
    
    // Main left-click handler
    canvas.addEventListener('click', handleLeftClick);
    
    // Track modifier keys
    document.addEventListener('keydown', handleModifierKeyDown);
    document.addEventListener('keyup', handleModifierKeyUp);
    
    // Start pending action checker
    startPendingActionChecker();
    
    leftClickSystemInitialized = true;
    console.log('✓ Left-click system initialized');
}

// ==================== MODIFIER KEY TRACKING ====================

function handleModifierKeyDown(e) {
    if (e.key === 'Shift') clickModifiers.shift = true;
    if (e.key === 'Control') clickModifiers.ctrl = true;
    if (e.key === 'Alt') clickModifiers.alt = true;
}

function handleModifierKeyUp(e) {
    if (e.key === 'Shift') clickModifiers.shift = false;
    if (e.key === 'Control') clickModifiers.ctrl = false;
    if (e.key === 'Alt') clickModifiers.alt = false;
}

// ==================== UI BLOCKING CHECK ====================

function isUIBlocking() {
    // Context menu is open
    if (window.contextMenu?.visible) {
        console.log('UI Block: Context menu open');
        return true;
    }
    
    // Inspect popup is open
    if (window.inspectPopup?.visible) {
        console.log('UI Block: Inspect popup open');
        return true;
    }
    
    // Game not in playing state (inventory, merchant, level-up, etc.)
    if (typeof game !== 'undefined' && game.state !== 'playing') {
        console.log('UI Block: Game state is', game.state);
        return true;
    }
    
    // Add more UI checks here as needed
    // if (window.inventoryOpen) return true;
    // if (window.dialogOpen) return true;
    
    return false;
}

function isClickInTrackerPanel(clickX) {
    const trackerWidth = (typeof TRACKER_WIDTH !== 'undefined') ? TRACKER_WIDTH : 
                         (window.TRACKER_WIDTH || 400);
    return clickX < trackerWidth;
}

// ==================== MAIN LEFT-CLICK HANDLER ====================

function handleLeftClick(e) {
    // Only handle left mouse button (button 0)
    if (e.button !== 0) return;
    
    // Don't process if game isn't ready
    if (typeof game === 'undefined') return;
    
    // ===== MODIFIER KEY PLACEHOLDERS =====
    if (clickModifiers.shift) {
        console.log('[PLACEHOLDER] Shift-click detected');
        // Future: Shift-click to attack without moving?
        // Future: Shift-click to queue movement?
        return;
    }
    
    if (clickModifiers.ctrl) {
        console.log('[PLACEHOLDER] Ctrl-click detected');
        // Future: Ctrl-click to inspect?
        // Future: Ctrl-click for ability targeting?
        return;
    }
    
    if (clickModifiers.alt) {
        console.log('[PLACEHOLDER] Alt-click detected');
        // Future: Alt-click for secondary action?
        return;
    }
    
    // ===== UI BLOCKING CHECK =====
    if (isUIBlocking()) {
        // Let other handlers deal with it (closing menus, etc.)
        return;
    }
    
    // ===== COORDINATE CALCULATION =====
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Check if click is in tracker panel (left UI area)
    if (isClickInTrackerPanel(clickX)) {
        console.log('Click in tracker panel, ignoring for movement');
        return;
    }
    
    // Calculate grid position
    const trackerWidth = (typeof TRACKER_WIDTH !== 'undefined') ? TRACKER_WIDTH : 
                         (window.TRACKER_WIDTH || 400);
    const tileSize = (typeof TILE_SIZE !== 'undefined') ? TILE_SIZE : 
                     (window.TILE_SIZE || 32);
    const zoomLevel = (typeof ZOOM_LEVEL !== 'undefined') ? ZOOM_LEVEL : 
                      (window.ZOOM_LEVEL || 2);
    
    const effectiveTileSize = tileSize * zoomLevel;
    
    const viewX = clickX - trackerWidth;
    const viewY = clickY;
    
    const camX = game.camera ? game.camera.x : 0;
    const camY = game.camera ? game.camera.y : 0;
    
    const gridX = Math.floor(viewX / effectiveTileSize + camX);
    const gridY = Math.floor(viewY / effectiveTileSize + camY);
    
    console.log('=== LEFT-CLICK ===');
    console.log('Grid target:', gridX, gridY);
    console.log('Player at:', game.player.gridX, game.player.gridY);
    
    // ===== TARGET DETECTION =====
    const { target, targetType } = detectTarget(gridX, gridY);
    
    console.log('Target type:', targetType);
    if (target && target.name) console.log('Target name:', target.name);
    
    // ===== EXECUTE DEFAULT ACTION =====
    executeDefaultAction(target, targetType, gridX, gridY);
}

// ==================== TARGET DETECTION ====================

function detectTarget(gridX, gridY) {
    let target = null;
    let targetType = 'tile';
    
    // Priority 1: Check for enemy at exact position (must be visible)
    if (game.enemies) {
        const enemy = game.enemies.find(e =>
            Math.floor(e.gridX) === gridX && Math.floor(e.gridY) === gridY
        );

        // FOG OF WAR: Only target visible enemies
        if (enemy) {
            const tile = game.map?.[gridY]?.[gridX];
            if (tile && tile.visible) {
                return { target: enemy, targetType: 'enemy' };
            }
        }
    }
    
    // Priority 2: Check for merchant (using proximity like right-click)
    if (game.merchant) {
        const mx = game.merchant.x !== undefined ? game.merchant.x : game.merchant.gridX;
        const my = game.merchant.y !== undefined ? game.merchant.y : game.merchant.gridY;
        
        if (gridX === mx && gridY === my) {
            return { target: game.merchant, targetType: 'npc' };
        }
    }
    
    // Priority 3: Check for other interactables (doors, chests, etc.)
    // Add more detection here as game expands
    // if (game.doors) { ... }
    // if (game.chests) { ... }
    // if (game.items) { ... }
    
    // Default: Empty tile
    return { 
        target: { x: gridX, y: gridY }, 
        targetType: 'tile' 
    };
}

// ==================== DEFAULT ACTION EXECUTION ====================

function executeDefaultAction(target, targetType, gridX, gridY) {
    // Clear any existing pending action
    clearPendingAction();
    
    switch (targetType) {
        case 'enemy':
            handleEnemyClick(target);
            break;
            
        case 'npc':
            handleNPCClick(target);
            break;
            
        case 'tile':
            handleTileClick(target);
            break;
            
        default:
            console.log('Unknown target type:', targetType);
    }
}

// ----- TILE CLICK: Just walk there -----
function handleTileClick(target) {
    console.log('→ Walking to tile:', target.x, target.y);
    
    if (typeof startAutoWalk === 'function') {
        startAutoWalk(target.x, target.y);
    } else if (typeof startPlayerMove === 'function') {
        // Fallback: single step toward target
        const dx = target.x - game.player.gridX;
        const dy = target.y - game.player.gridY;
        
        if (Math.abs(dx) >= Math.abs(dy)) {
            startPlayerMove(dx > 0 ? 'right' : 'left');
        } else {
            startPlayerMove(dy > 0 ? 'down' : 'up');
        }
    } else {
        console.error('No movement function available!');
    }
}

// ----- ENEMY CLICK: Walk toward + engage combat -----
function handleEnemyClick(enemy) {
    console.log('→ Engaging enemy:', enemy.name);
    
    // Start walking toward the enemy
    const targetX = Math.floor(enemy.gridX);
    const targetY = Math.floor(enemy.gridY);
    
    if (typeof startAutoWalk === 'function') {
        // Walk toward enemy - ignore enemies in pathfinding so we path TO them
        // Also ignore other enemies so we don't get stuck behind friendlies
        startAutoWalk(targetX, targetY, { ignoreEnemies: true });
    }
    
    // Engage combat immediately - combat system handles range
    if (typeof engageCombat === 'function') {
        engageCombat(game.player, enemy);
        console.log('✓ Combat engaged (will attack when in range)');
    } else {
        console.warn('engageCombat function not found');
    }
}

// ----- NPC CLICK: Walk toward + set pending interaction -----
function handleNPCClick(npc) {
    console.log('→ Interacting with NPC');
    
    // Get NPC position
    const targetX = npc.x !== undefined ? npc.x : npc.gridX;
    const targetY = npc.y !== undefined ? npc.y : npc.gridY;
    
    // Start walking toward NPC - ignore the NPC tile so we path TO them
    if (typeof startAutoWalk === 'function') {
        startAutoWalk(targetX, targetY, { ignoreNPCs: true });
    }
    
    // Set pending action - will trigger when player is adjacent
    setPendingAction(npc, 'npc', 'interact');
    console.log('✓ Pending interaction set (will trigger when adjacent)');
}

// ==================== PENDING ACTION SYSTEM ====================

function setPendingAction(target, targetType, action) {
    window.pendingAction.active = true;
    window.pendingAction.target = target;
    window.pendingAction.targetType = targetType;
    window.pendingAction.action = action;
}

function clearPendingAction() {
    window.pendingAction.active = false;
    window.pendingAction.target = null;
    window.pendingAction.targetType = null;
    window.pendingAction.action = null;
}

function startPendingActionChecker() {
    // Check every 100ms if we should execute pending action
    window.pendingAction.checkInterval = setInterval(checkPendingAction, 100);
}

function checkPendingAction() {
    if (!window.pendingAction.active) return;
    if (typeof game === 'undefined' || !game.player) return;
    
    const target = window.pendingAction.target;
    const player = game.player;
    
    // Don't check while player is still moving
    if (player.isMoving) return;
    
    // Get target position
    const targetX = target.x !== undefined ? target.x : target.gridX;
    const targetY = target.y !== undefined ? target.y : target.gridY;
    
    // Check if player is adjacent (within 1 tile)
    const dx = Math.abs(player.gridX - targetX);
    const dy = Math.abs(player.gridY - targetY);
    const isAdjacent = (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
    
    // Also check if player is ON the target (for tiles)
    const isOnTarget = (player.gridX === targetX && player.gridY === targetY);
    
    if (isAdjacent || isOnTarget) {
        executePendingAction();
    }
}

function executePendingAction() {
    const { target, targetType, action } = window.pendingAction;
    
    console.log('=== EXECUTING PENDING ACTION ===');
    console.log('Action:', action, '| Type:', targetType);
    
    if (action === 'interact') {
        if (targetType === 'npc') {
            // Check if it's the merchant
            if (target === game.merchant) {
                console.log('✓ Opening merchant interface');
                game.state = 'merchant';
                game.merchantMsg = "";
            }
            // Add more NPC types here
            // else if (target.type === 'quest_giver') { ... }
        }
    }
    
    // Add more action types here as needed
    // if (action === 'loot') { ... }
    // if (action === 'open') { ... }
    // if (action === 'use') { ... }
    
    // Clear the pending action
    clearPendingAction();
}

// ==================== CLEANUP ====================

function destroyLeftClickSystem() {
    if (window.pendingAction.checkInterval) {
        clearInterval(window.pendingAction.checkInterval);
    }
    clearPendingAction();
    leftClickSystemInitialized = false;
    console.log('Left-click system destroyed');
}

// ==================== INITIALIZATION ON LOAD ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLeftClickSystem);
} else {
    initLeftClickSystem();
}

// Make functions globally available for debugging/extension
window.initLeftClickSystem = initLeftClickSystem;
window.destroyLeftClickSystem = destroyLeftClickSystem;
window.clickModifiers = clickModifiers;

console.log('✓ Left-click system loaded');