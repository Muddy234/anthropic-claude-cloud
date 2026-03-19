// ============================================================================
// MESSAGE LOG SYSTEM - The Shifting Chasm
// ============================================================================
// Provides typed message logging with capacity management, deduplication,
// and filtering capabilities.
// ============================================================================

// ============================================================================
// MESSAGE TYPE CONSTANTS
// ============================================================================

/**
 * Message type constants for categorizing log entries
 * Used for filtering, styling, and prioritization
 */
const MESSAGE_TYPES = {
    INFO: 'info',           // General information (movement, exploration)
    WARNING: 'warning',     // Warnings (low health, danger nearby)
    ERROR: 'error',         // System errors (should rarely be seen by player)
    COMBAT: 'combat',       // Combat events (attacks, damage, kills)
    LOOT: 'loot',           // Loot pickups (items, gold, materials)
    QUEST: 'quest',         // Quest updates (progress, completion)
    SYSTEM: 'system',       // System messages (save, load, settings)
    DIALOGUE: 'dialogue'    // NPC dialogue snippets
};

// ============================================================================
// MESSAGE LOG CONFIGURATION
// ============================================================================

/**
 * Configuration for message log behavior
 */
const MESSAGE_LOG_CONFIG = {
    // Maximum number of messages to retain
    capacity: 100,

    // Time window for deduplication (ms) - same message within window gets count++
    deduplicationWindow: 2000,

    // Maximum count to show for repeated messages (e.g., "x5")
    maxRepeatCount: 99,

    // Message display duration in UI (ms) - 0 for persistent
    displayDuration: 5000,

    // Whether to log to console in debug mode
    consoleLog: false
};

// ============================================================================
// MESSAGE LOG CLASS
// ============================================================================

/**
 * MessageLog - Manages game message history with types, capacity, and deduplication
 */
const MessageLog = {
    /**
     * Add a message to the log
     * @param {string} text - The message text
     * @param {string} type - Message type from MESSAGE_TYPES (default: INFO)
     * @param {object} options - Additional options { deduplicate, important }
     */
    add(text, type = MESSAGE_TYPES.INFO, options = {}) {
        // Validate inputs
        if (!text || typeof text !== 'string') {
            console.warn('[MessageLog] Invalid message text:', text);
            return;
        }

        // Ensure game.messageLog exists
        if (!game || !Array.isArray(game.messageLog)) {
            console.warn('[MessageLog] game.messageLog not available');
            return;
        }

        const now = Date.now();
        const deduplicate = options.deduplicate !== false; // Default to true

        // Check for duplicate message (deduplication)
        if (deduplicate) {
            const lastMessage = game.messageLog[game.messageLog.length - 1];
            if (lastMessage &&
                lastMessage.text === text &&
                lastMessage.type === type &&
                (now - lastMessage.time) < MESSAGE_LOG_CONFIG.deduplicationWindow) {
                // Increment count instead of adding duplicate
                lastMessage.count = Math.min(
                    (lastMessage.count || 1) + 1,
                    MESSAGE_LOG_CONFIG.maxRepeatCount
                );
                lastMessage.time = now; // Update time for display freshness
                game.lastMessageTime = now;
                return;
            }
        }

        // Create new message entry
        const message = {
            text: text,
            type: type,
            time: now,
            count: 1,
            important: options.important || false
        };

        // Add to log
        game.messageLog.push(message);
        game.lastMessageTime = now;

        // Trim old messages if over capacity
        this._enforceCapacity();

        // Console logging for debug
        if (MESSAGE_LOG_CONFIG.consoleLog || (typeof DEBUG_CONFIG !== 'undefined' && DEBUG_CONFIG.logMessages)) {
            const prefix = `[${type.toUpperCase()}]`;
            console.log(`${prefix} ${text}`);
        }
    },

    /**
     * Enforce capacity limit by removing oldest non-important messages
     * @private
     */
    _enforceCapacity() {
        if (!game || !Array.isArray(game.messageLog)) return;

        while (game.messageLog.length > MESSAGE_LOG_CONFIG.capacity) {
            // Find first non-important message to remove
            let removeIndex = 0;
            for (let i = 0; i < game.messageLog.length; i++) {
                if (!game.messageLog[i].important) {
                    removeIndex = i;
                    break;
                }
            }
            game.messageLog.splice(removeIndex, 1);
        }
    },

    /**
     * Get messages filtered by type
     * @param {string|string[]} types - Type(s) to filter by
     * @param {number} limit - Maximum messages to return
     * @returns {Array} Filtered messages
     */
    getByType(types, limit = 50) {
        if (!game || !Array.isArray(game.messageLog)) return [];

        const typeArray = Array.isArray(types) ? types : [types];
        return game.messageLog
            .filter(msg => typeArray.includes(msg.type))
            .slice(-limit);
    },

    /**
     * Get recent messages
     * @param {number} count - Number of messages to return
     * @returns {Array} Recent messages
     */
    getRecent(count = 10) {
        if (!game || !Array.isArray(game.messageLog)) return [];
        return game.messageLog.slice(-count);
    },

    /**
     * Get messages since a timestamp
     * @param {number} timestamp - Unix timestamp
     * @returns {Array} Messages since timestamp
     */
    getSince(timestamp) {
        if (!game || !Array.isArray(game.messageLog)) return [];
        return game.messageLog.filter(msg => msg.time >= timestamp);
    },

    /**
     * Clear all messages
     */
    clear() {
        if (!game) return;
        game.messageLog = [];
        game.lastMessageTime = 0;
    },

    /**
     * Clear messages of a specific type
     * @param {string} type - Message type to clear
     */
    clearType(type) {
        if (!game || !Array.isArray(game.messageLog)) return;
        game.messageLog = game.messageLog.filter(msg => msg.type !== type);
    },

    /**
     * Get message count
     * @returns {number} Total message count
     */
    get count() {
        if (!game || !Array.isArray(game.messageLog)) return 0;
        return game.messageLog.length;
    },

    /**
     * Get count by type
     * @param {string} type - Message type
     * @returns {number} Count of messages of that type
     */
    countByType(type) {
        if (!game || !Array.isArray(game.messageLog)) return 0;
        return game.messageLog.filter(msg => msg.type === type).length;
    }
};

// ============================================================================
// CONVENIENCE FUNCTIONS (Backwards Compatible)
// ============================================================================

/**
 * Add a message to the game log (backwards compatible)
 * @param {string} text - The message text
 * @param {string} type - Optional message type (default: INFO)
 */
function addMessage(text, type = MESSAGE_TYPES.INFO) {
    MessageLog.add(text, type);
}

/**
 * Add an info message
 * @param {string} text - The message text
 */
function addInfoMessage(text) {
    MessageLog.add(text, MESSAGE_TYPES.INFO);
}

/**
 * Add a warning message
 * @param {string} text - The message text
 */
function addWarningMessage(text) {
    MessageLog.add(text, MESSAGE_TYPES.WARNING);
}

/**
 * Add an error message
 * @param {string} text - The message text
 */
function addErrorMessage(text) {
    MessageLog.add(text, MESSAGE_TYPES.ERROR);
}

/**
 * Add a combat message
 * @param {string} text - The message text
 */
function addCombatMessage(text) {
    MessageLog.add(text, MESSAGE_TYPES.COMBAT);
}

/**
 * Add a loot message
 * @param {string} text - The message text
 */
function addLootMessage(text) {
    MessageLog.add(text, MESSAGE_TYPES.LOOT);
}

/**
 * Add a quest message
 * @param {string} text - The message text
 */
function addQuestMessage(text) {
    MessageLog.add(text, MESSAGE_TYPES.QUEST, { important: true });
}

/**
 * Add a system message
 * @param {string} text - The message text
 */
function addSystemMessage(text) {
    MessageLog.add(text, MESSAGE_TYPES.SYSTEM);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    // Core class and config
    window.MessageLog = MessageLog;
    window.MESSAGE_TYPES = MESSAGE_TYPES;
    window.MESSAGE_LOG_CONFIG = MESSAGE_LOG_CONFIG;

    // Backwards compatible function
    window.addMessage = addMessage;

    // Typed convenience functions
    window.addInfoMessage = addInfoMessage;
    window.addWarningMessage = addWarningMessage;
    window.addErrorMessage = addErrorMessage;
    window.addCombatMessage = addCombatMessage;
    window.addLootMessage = addLootMessage;
    window.addQuestMessage = addQuestMessage;
    window.addSystemMessage = addSystemMessage;
}

console.log('[MessageLog] Message log system loaded');
console.log(`   Capacity: ${MESSAGE_LOG_CONFIG.capacity} messages`);
console.log(`   Types: ${Object.keys(MESSAGE_TYPES).join(', ')}`);
